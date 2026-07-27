import { PrismaClient } from "@prisma/client";
import { del } from "@vercel/blob";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export interface CreateMediaAssetInput {
  userId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  blobUrl: string;
  batchId?: string;
  batchName?: string;
  relativePath?: string;
}

export async function createMediaAsset(input: CreateMediaAssetInput) {
  return prisma.mediaAsset.create({
    data: {
      userId: input.userId,
      filename: input.filename,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      blobUrl: input.blobUrl,
      batchId: input.batchId ?? null,
      batchName: input.batchName ?? null,
      relativePath: input.relativePath ?? null,
      status: "PENDING",
    },
  });
}

export async function listMediaAssets(userId: string, opts?: { batchId?: string }) {
  return prisma.mediaAsset.findMany({
    where: {
      userId,
      ...(opts?.batchId ? { batchId: opts.batchId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * User-initiated manual delete (e.g. they uploaded the wrong file, or
 * changed their mind before scheduling it). Removes the blob AND the row —
 * unlike the post-publish cleanup, there's no reason to keep history for
 * content that was never actually posted.
 */
export async function deleteMediaAsset(userId: string, assetId: string) {
  const asset = await prisma.mediaAsset.findFirst({ where: { id: assetId, userId } });
  if (!asset) return null;

  if (asset.blobUrl) {
    await del(asset.blobUrl).catch((err) => {
      console.error(`[media] Failed to delete blob for asset ${asset.id}:`, err);
    });
  }

  await prisma.mediaAsset.delete({ where: { id: asset.id } });
  return asset.id;
}

export async function markMediaScheduled(assetId: string, postId: string) {
  await prisma.mediaAsset.update({
    where: { id: assetId },
    data: { status: "SCHEDULED", linkedPostId: postId },
  });
}

/**
 * Call this the moment your publish flow receives a CONFIRMED success
 * response from the platform API (a real post ID back from Instagram/TikTok,
 * not just "request accepted"). Deletes the actual media file from Blob
 * storage to stop paying for it, but keeps the DB row as a lightweight,
 * file-less history record per your retention policy.
 */
export async function markPublishedAndCleanup(
  assetId: string,
  details: { platform: "instagram" | "tiktok"; providerPostId: string }
) {
  const asset = await prisma.mediaAsset.findUnique({ where: { id: assetId } });
  if (!asset) {
    throw new Error(`[media] markPublishedAndCleanup: asset ${assetId} not found`);
  }

  if (asset.blobUrl) {
    try {
      await del(asset.blobUrl);
    } catch (err) {
      console.error(`[media] Blob delete failed for asset ${assetId}, continuing:`, err);
    }
  }

  return prisma.mediaAsset.update({
    where: { id: assetId },
    data: {
      status: "PUBLISHED",
      blobUrl: null, // the file itself is gone; row remains as history
      platform: details.platform,
      providerPostId: details.providerPostId,
      publishedAt: new Date(),
    },
  });
}

export async function markMediaFailed(assetId: string, message: string) {
  await prisma.mediaAsset.update({
    where: { id: assetId },
    data: { status: "FAILED", lastErrorMessage: message },
  });
}

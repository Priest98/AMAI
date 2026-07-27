import { del } from "@vercel/blob";

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

// In-memory fallback cache for media assets when Prisma is hosted in API workspace
const inMemoryAssets: any[] = [];

export async function createMediaAsset(input: CreateMediaAssetInput) {
  const asset = {
    id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId: input.userId,
    filename: input.filename,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    blobUrl: input.blobUrl,
    batchId: input.batchId ?? null,
    batchName: input.batchName ?? null,
    relativePath: input.relativePath ?? null,
    status: "PENDING",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  inMemoryAssets.unshift(asset);
  return asset;
}

export async function listMediaAssets(userId: string, opts?: { batchId?: string }) {
  return inMemoryAssets.filter((a) => {
    if (a.userId !== userId) return false;
    if (opts?.batchId && a.batchId !== opts.batchId) return false;
    return true;
  });
}

/**
 * User-initiated manual delete (e.g. they uploaded the wrong file, or
 * changed their mind before scheduling it). Removes the blob AND the row —
 * unlike the post-publish cleanup, there's no reason to keep history for
 * content that was never actually posted.
 */
export async function deleteMediaAsset(userId: string, assetId: string) {
  const idx = inMemoryAssets.findIndex((a) => a.id === assetId);
  if (idx === -1) return assetId;

  const asset = inMemoryAssets[idx];
  if (asset?.blobUrl) {
    await del(asset.blobUrl).catch((err) => {
      console.error(`[media] Failed to delete blob for asset ${assetId}:`, err);
    });
  }

  inMemoryAssets.splice(idx, 1);
  return assetId;
}

export async function markMediaScheduled(assetId: string, postId: string) {
  const asset = inMemoryAssets.find((a) => a.id === assetId);
  if (asset) {
    asset.status = "SCHEDULED";
    asset.linkedPostId = postId;
  }
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
  const asset = inMemoryAssets.find((a) => a.id === assetId);
  if (asset && asset.blobUrl) {
    try {
      await del(asset.blobUrl);
    } catch (err) {
      console.error(`[media] Blob delete failed for asset ${assetId}, continuing:`, err);
    }
    asset.status = "PUBLISHED";
    asset.blobUrl = null;
    asset.platform = details.platform;
    asset.providerPostId = details.providerPostId;
    asset.publishedAt = new Date();
  }
  return asset;
}

export async function markMediaFailed(assetId: string, message: string) {
  const asset = inMemoryAssets.find((a) => a.id === assetId);
  if (asset) {
    asset.status = "FAILED";
    asset.lastErrorMessage = message;
  }
}

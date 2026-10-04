import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { EntitlementsService } from '../billing/entitlements.service';
import { MediaStatus, ContentSource, ConnectionStatus, PostStatus } from '@prisma/client';
import { claimedMimeTypeMatchesBytes } from './magic-bytes.util';
import { dispatchMediaProcessing } from '../engine/media-dispatch';
import { assertSupportedVideoSize, MAX_VIDEO_ANALYSIS_BYTES } from './analysis-limits';

// Kept in sync with apps/web/src/app/api/media-upload-token/route.ts's
// ALLOWED_CONTENT_TYPES (that route gates what the browser is even allowed
// to upload to Blob storage) and MediaController's legacy multer filter.
// This is the last checkpoint before a DB record is created, so it's
// enforced here too rather than trusting the client — nothing stopped a
// caller with a valid JWT from POSTing an arbitrary blobUrl/mimeType to
// /register before this existed.
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime', // .mov
  'video/webm',
  'video/x-matroska', // .mkv
]);

function assertAllowedMimeType(mimeType: string | undefined | null): void {
  if (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())) {
    throw new BadRequestException(
      `Unsupported file type${mimeType ? ` (${mimeType})` : ''}. Allowed: JPG, PNG, GIF, WEBP images and MP4, MOV, WebM, MKV videos.`,
    );
  }
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private entitlementsService: EntitlementsService,
  ) {}

  /**
   * checkStorageUsage() already computes used-vs-limit for the billing
   * summary UI, but nothing called it on the write path -- a Free-plan org
   * could upload arbitrarily far past its advertised 1GB cap (25GB Pro /
   * 100GB Agency) with zero enforcement. Found during V2 QA. Mirrors the
   * existing canPerformAction() pattern (reject with a clear upgrade
   * reason) even though storage isn't one of its BillableAction cases --
   * that switch is keyed by discrete counts, not a running byte total
   * compared against an incoming file size, so a dedicated check is
   * cleaner here than forcing it through canPerformAction's shape.
   */
  private async assertWithinStorageLimit(brandId: string, incomingBytes: number): Promise<void> {
    const organizationId = await this.entitlementsService.getOrganizationIdForBrand(brandId);
    const { used, limit } = await this.entitlementsService.checkStorageUsage(organizationId);
    if (limit === -1) return; // unlimited plan
    if (used + incomingBytes > limit) {
      const usedMb = Math.round(used / (1024 * 1024));
      const limitMb = Math.round(limit / (1024 * 1024));
      throw new BadRequestException(
        `This upload would put you over your plan's storage limit (${usedMb}MB used of ${limitMb}MB). Delete some media or upgrade your plan to free up space.`,
      );
    }
  }

  async uploadAsset(brandId: string, file: Express.Multer.File, folderId?: string, userId?: string) {
    if (!file) throw new BadRequestException('No file provided');
    assertAllowedMimeType(file.mimetype);
    // Security audit fix (8.2): the buffer is already in hand on this path
    // (memory-storage multer), so this check is free -- no extra fetch
    // needed, unlike the register() path below.
    if (!claimedMimeTypeMatchesBytes(file.buffer, file.mimetype)) {
      this.logger.warn(`Upload rejected: claimed type "${file.mimetype}" does not match file content. brand=${brandId} file="${file.originalname}"`);
      throw new BadRequestException('This file\'s content does not match its claimed type. Please check the file and try again.');
    }
    assertSupportedVideoSize(file.mimetype, file.size || 0);
    await this.assertWithinStorageLimit(brandId, file.size || 0);
    this.logger.log(`Upload started: brand=${brandId} file="${file.originalname}" size=${file.size} type=${file.mimetype}`);

    const uploadedData = await this.storage.uploadFile(file, brandId);
    this.logger.log(`Storage upload completed: brand=${brandId} url=${uploadedData.url}`);

    return this.createAssetRecord(brandId, {
      filename: file.originalname || 'uploaded_media',
      url: uploadedData.url,
      size: uploadedData.size || file.size || 0,
      mimeType: uploadedData.mimeType || file.mimetype,
      folderId,
    }, userId);
  }

  /**
   * Registers a file that the browser already uploaded directly to Vercel
   * Blob storage (via the client-direct-upload flow), bypassing the
   * serverless function's ~4.5MB request-body cap that blocked large video
   * uploads through the legacy multipart `uploadAsset` path above.
   *
   * This is the very last checkpoint before a DB record exists, so file
   * type is validated here even though the upload-token route already
   * restricted what Blob would accept — never trust the client alone.
   */
  async registerUploadedAsset(
    brandId: string,
    dto: { url: string; size: number; mimeType: string; filename: string; folderId?: string; mode?: 'single' | 'carousel' },
    userId?: string,
  ) {
    if (!dto?.url) throw new BadRequestException('No file URL provided.');
    if (!/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//.test(dto.url)) {
      throw new BadRequestException('Invalid upload URL.');
    }
    assertAllowedMimeType(dto.mimeType);

    const pathname = decodeURIComponent(new URL(dto.url).pathname);
    if (!pathname.startsWith(`/${brandId}/`) || pathname.split('/').some((part) => part === '..' || part === '.')) {
      throw new BadRequestException('This upload does not belong to this brand.');
    }
    const blob = await this.storage.inspectUpload(dto.url);
    if (blob.url !== dto.url || !blob.pathname.startsWith(`${brandId}/`) || !Number.isSafeInteger(blob.size) || blob.size <= 0) {
      throw new BadRequestException('Invalid upload metadata.');
    }
    if (blob.contentType.toLowerCase() !== dto.mimeType.toLowerCase()) {
      throw new BadRequestException('Upload content type does not match storage metadata.');
    }
    // Re-registering an existing file must never reach rejection cleanup.
    const existing = await this.prisma.mediaAsset.findFirst({ where: { blobUrl: dto.url } });
    if (existing) {
      if (existing.brandId !== brandId) throw new BadRequestException('Upload already belongs to another brand.');
      return existing;
    }
    dto = { ...dto, size: blob.size };
    try { assertSupportedVideoSize(dto.mimeType, dto.size); }
    catch (error) {
      await this.storage.deleteFile(dto.url).catch(() => {});
      throw error;
    }

    // Verify a bounded byte prefix. Unavailable content must be retried.
    try {
      const leadingBytes = await this.fetchLeadingBytes(dto.url, 32);
      if (!leadingBytes) throw new BadRequestException('Unable to verify file content. Please retry.');
      if (leadingBytes && !claimedMimeTypeMatchesBytes(leadingBytes, dto.mimeType)) {
        await this.storage.deleteFile(dto.url).catch(() => {});
        this.logger.warn(`Registration rejected: claimed type "${dto.mimeType}" does not match file content. brand=${brandId} url=${dto.url}`);
        throw new BadRequestException('This file\'s content does not match its claimed type. Please check the file and try again.');
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('Unable to verify file content. Please retry.');
    }

    // The bytes are already sitting in Blob storage by this point (the
    // browser uploaded them directly before calling register) -- the quota
    // check here can only refuse to create the DB record, not prevent the
    // upload itself. Deleting the orphaned blob on rejection keeps a
    // capped-out org from silently accumulating unbilled, unlisted storage
    // by uploading and retrying past its limit.
    try {
      await this.assertWithinStorageLimit(brandId, dto.size || 0);
    } catch (err) {
      await this.storage.deleteFile(dto.url).catch(() => {});
      throw err;
    }

    this.logger.log(`Upload registered: brand=${brandId} file="${dto.filename}" size=${dto.size} type=${dto.mimeType}`);
    return this.createAssetRecord(brandId, dto, userId);
  }

  /**
   * Fetches just the first `maxBytes` of a URL via an HTTP Range request,
   * for magic-byte sniffing without downloading a potentially large file in
   * full. Returns null on failure; registration rejects unverifiable content.
   */
  private async fetchLeadingBytes(url: string, maxBytes: number): Promise<Buffer | null> {
    try {
      const res = await fetch(url, { headers: { Range: `bytes=0-${maxBytes - 1}` }, signal: AbortSignal.timeout(10_000) });
      if (!res.ok && res.status !== 206) return null;
      const reader = res.body?.getReader();
      if (!reader) return null;
      const chunks: Buffer[] = [];
      let size = 0;
      try {
        while (size < maxBytes) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = Buffer.from(value.subarray(0, maxBytes - size));
          chunks.push(chunk);
          size += chunk.length;
        }
      } finally {
        await reader.cancel();
      }
      return size ? Buffer.concat(chunks) : null;
    } catch {
      return null;
    }
  }

  private async createAssetRecord(
    brandId: string,
    dto: { url: string; size?: number; mimeType: string; filename?: string; folderId?: string; mode?: 'single' | 'carousel' },
    userId?: string,
  ) {
    if (dto.folderId && !await this.prisma.mediaFolder.findFirst({ where: { id: dto.folderId, brandId } })) {
      throw new BadRequestException('Media folder does not belong to this brand.');
    }
    const asset = await this.prisma.mediaAsset.create({
      data: {
        brandId,
        userId: userId || null,
        folderId: dto.folderId || null,
        filename: dto.filename || 'uploaded_media',
        blobUrl: dto.url,
        sizeBytes: dto.size || 0,
        mimeType: dto.mimeType,
        source: ContentSource.DIRECT_UPLOAD,
        status: MediaStatus.PENDING,
        processingIntent: dto.mode === 'carousel' ? 'STAGED' : 'SINGLE',
        processingStage: dto.mode === 'carousel' ? 'UPLOADED' : 'QUEUED',
      }
    });
    this.logger.log(`DB record created: asset=${asset.id} brand=${brandId}`);

    // Registration owns durable dispatch. The browser only observes status;
    // closing a tab can no longer strand an otherwise valid upload. QStash
    // invokes the existing authenticated bounded worker, while PENDING plus
    // the scheduled recovery sweep remains the database-backed backstop.
    if (dto.mode !== 'carousel') await dispatchMediaProcessing(asset.id).catch((error) => {
      this.logger.warn(`QStash dispatch failed for asset ${asset.id}; recovery sweep will retry: ${error instanceof Error ? error.message : error}`);
    });
    await dispatchMediaProcessing(asset.id, 'optimize-media').catch(() => {
      this.logger.warn(`Optimization dispatch deferred for asset ${asset.id}.`);
    });
    return asset;
  }

  async getUploadPolicy(brandId: string) {
    const organizationId = await this.entitlementsService.getOrganizationIdForBrand(brandId);
    const { used, limit } = await this.entitlementsService.checkStorageUsage(organizationId);
    const maximumSizeInBytes = Math.min(500 * 1024 * 1024, limit === -1 ? Infinity : Math.max(0, limit - used));
    if (maximumSizeInBytes <= 0) throw new BadRequestException('Your storage is full. Delete media or upgrade your plan.');
    return { maximumSizeInBytes, maximumVideoSizeInBytes: Math.min(maximumSizeInBytes, MAX_VIDEO_ANALYSIS_BYTES) };
  }

  /**
   * Runs Oyinca pipeline for an already-registered asset. Called
   * by the frontend as its own request immediately after register/upload
   * resolves (not awaited by the upload call itself) — see createAssetRecord
   * above for why that split exists.
   */
  async triggerProcessing(brandId: string, assetId: string) {
    const asset = await this.prisma.mediaAsset.findFirst({ where: { id: assetId, brandId } });
    if (!asset) throw new NotFoundException('Media asset not found.');

    if (asset.linkedPostId || asset.status === MediaStatus.PROCESSING) return asset;
    assertSupportedVideoSize(asset.mimeType, asset.sizeBytes);
    if (asset.aiReservationOrgId) await this.entitlementsService.releaseMediaAiGeneration(assetId, asset.processingAttempts);
    const claim = await this.prisma.mediaAsset.updateMany({
      where: { id: assetId, brandId, linkedPostId: null, status: { in: [MediaStatus.PENDING, MediaStatus.FAILED] } },
      data: { status: MediaStatus.PENDING, processingIntent: 'SINGLE', processingStage: 'QUEUED', processingAttempts: 0, processingNextAttemptAt: null, lastErrorMessage: null },
    });
    if (claim.count) await dispatchMediaProcessing(assetId);
    const queued = await this.prisma.mediaAsset.findFirst({ where: { id: assetId, brandId } });
    return queued;
  }

  /**
   * Found via production data: MediaAsset.delete cascades onto its
   * PostMedia join row (schema: onDelete: Cascade), but the Post and its
   * PostTarget rows are untouched -- so deleting media that's still
   * attached to a pending post silently orphans that post. It sails
   * through as SCHEDULED/NEEDS_APPROVAL with no visible problem until the
   * publish attempt runs, at which point publishOne finds
   * `post.media[0]` undefined and fails with a generic "No media file is
   * attached to this post." This was confirmed as the single largest
   * cause of publish failures in production (~30 of the last ~110 failed
   * attempts, all posts with zero PostMedia rows). Blocking the delete
   * up front, with a clear reason, replaces a confusing failure minutes
   * or hours later with an immediate, actionable one.
   */
  private static readonly POST_STATUSES_BLOCKING_MEDIA_DELETE: PostStatus[] = [
    PostStatus.NEEDS_APPROVAL,
    PostStatus.SCHEDULED,
    PostStatus.PUBLISHING,
  ];

  async deleteAsset(brandId: string, assetId: string) {
    const asset = await this.prisma.mediaAsset.findFirst({ where: { id: assetId, brandId } });
    if (!asset) throw new NotFoundException('Media asset not found.');

    if (asset.linkedPostId) {
      const linkedPost = await this.prisma.post.findUnique({
        where: { id: asset.linkedPostId },
        select: { status: true },
      });
      if (linkedPost && MediaService.POST_STATUSES_BLOCKING_MEDIA_DELETE.includes(linkedPost.status)) {
        const stateLabel =
          linkedPost.status === PostStatus.NEEDS_APPROVAL
            ? 'awaiting approval'
            : linkedPost.status === PostStatus.SCHEDULED
              ? 'scheduled to publish'
              : 'publishing right now';
        throw new BadRequestException(
          `This media is attached to a post that's still ${stateLabel}. Reject or cancel that post first -- deleting the media now would leave it unable to publish.`,
        );
      }
    }

    if (asset.blobUrl) {
      await this.storage.deleteFile(asset.blobUrl);
    }
    await this.prisma.mediaAsset.delete({ where: { id: assetId } });
    return { success: true, id: assetId };
  }

  async getAssets(brandId: string, folderId?: string) {
    // Reads only: QStash and the recovery schedule own background work.

    // Projected + capped: the Media Library grid only ever renders these
    // fields (not batchId/batchName/relativePath/userId/platform/
    // providerPostId/publishedAt/updatedAt), and an unbounded findMany()
    // would eventually pull the brand's entire upload history on every
    // page load as the library grows. 300 is a generous ceiling for the
    // grid view today; if libraries grow past that this should become
    // real cursor pagination with a "load more" affordance in the UI.
    const assets = await this.prisma.mediaAsset.findMany({
      where: {
        brandId,
        folderId: folderId || null,
      },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        blobUrl: true,
        status: true,
        lastErrorMessage: true,
        createdAt: true,
        linkedPostId: true,
        visionTopic: true,
        processingStage: true,
        processingAttempts: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });

    // P1 media intelligence: surface the AI-derived category/pillar once
    // Oyinca pipeline has actually run on this asset (i.e. once
    // it has a linked Post -- classifyContentCategory and
    // pickBestPillar already compute these from the real vision-derived
    // topic + generated caption at that point, see engine.service.ts). No
    // new schema column needed: MediaAsset.linkedPostId isn't a Prisma
    // relation (plain string, no @relation in schema.prisma), so this is a
    // second batched query + in-memory merge rather than a nested
    // include. Assets with no linked post yet (still PENDING/PROCESSING,
    // or never scheduled) simply get category: null -- never guessed.
    const linkedPostIds = assets.map((a) => a.linkedPostId).filter((id): id is string => !!id);
    const categoryByPostId = new Map<string, { contentCategory: string | null; contentPillar: string | null }>();
    if (linkedPostIds.length > 0) {
      const posts = await this.prisma.post.findMany({
        where: { id: { in: linkedPostIds } },
        select: { id: true, contentCategory: true, contentPillar: true },
      });
      for (const p of posts) categoryByPostId.set(p.id, { contentCategory: p.contentCategory, contentPillar: p.contentPillar });
    }

    return assets.map((a) => {
      const tags = a.linkedPostId ? categoryByPostId.get(a.linkedPostId) : undefined;
      return {
        ...a,
        contentCategory: tags?.contentCategory ?? null,
        contentPillar: tags?.contentPillar ?? null,
      };
    });
  }

  async createFolder(brandId: string, name: string, parentId?: string) {
    // Lower-severity sibling of the createPost media-asset IDOR (see that
    // fix's comment for the full pattern): parentId previously went straight
    // into the create() with no check it's actually a folder belonging to
    // this brand. Low real exploitability (getFolders always re-scopes by
    // the caller's own brandId, so a mismatched parentId can't surface
    // another org's folder contents), but a folder silently pointing at an
    // id outside the brand is still a dangling, unverified reference worth
    // closing the same way the higher-severity version was.
    if (parentId) {
      const parent = await this.prisma.mediaFolder.findFirst({ where: { id: parentId, brandId }, select: { id: true } });
      if (!parent) {
        throw new BadRequestException('Parent folder could not be found in this brand\'s media library.');
      }
    }
    return this.prisma.mediaFolder.create({
      data: {
        brandId,
        name,
        parentId: parentId || null
      }
    });
  }

  async getFolders(brandId: string, parentId?: string) {
    return this.prisma.mediaFolder.findMany({
      where: {
        brandId,
        parentId: parentId || null
      },
      include: {
        _count: {
          select: { assets: true, children: true }
        }
      }
    });
  }
}

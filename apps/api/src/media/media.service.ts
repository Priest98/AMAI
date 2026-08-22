import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { EngineService, STALE_PROCESSING_MINUTES } from '../engine/engine.service';
import { MediaOptimizationService } from '../media-optimization/media-optimization.service';
import { EntitlementsService } from '../billing/entitlements.service';
import { MediaStatus, ContentSource, ConnectionStatus, PostStatus } from '@prisma/client';
import { claimedMimeTypeMatchesBytes } from './magic-bytes.util';

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

// STALE_PROCESSING_MINUTES now lives in engine.service.ts (imported above)
// -- EngineService.processMediaAsset's own atomic claim needs to agree with
// this sweep on exactly the same staleness threshold, or the two could
// disagree about whether a given PROCESSING asset is actually abandoned.
// See that file's comment for the full reasoning.
// Re-processing a stale asset happens inline inside a GET /assets
// request, on top of whatever a cold Lambda start already costs (Nest
// boot + first DB connection can itself take several seconds) — observed
// in production hitting the 60s platform cap when a cold start landed on
// top of even a single bounded pipeline run. Sweeping only one stale item
// per call keeps the worst case predictable and leaves real headroom.
// Any remaining backlog clears over the next few polls — the Media
// Library re-fetches on every SSE engine event and on mount.
const SWEEP_MAX_ITEMS = 1;

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private engineService: EngineService,
    private mediaOptimizationService: MediaOptimizationService,
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
    dto: { url: string; size: number; mimeType: string; filename: string; folderId?: string },
    userId?: string,
  ) {
    if (!dto?.url) throw new BadRequestException('No file URL provided.');
    if (!/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//.test(dto.url)) {
      throw new BadRequestException('Invalid upload URL.');
    }
    assertAllowedMimeType(dto.mimeType);

    // Security audit fix (8.2): unlike uploadAsset() above, the bytes for
    // this path already live in Blob storage -- fetch just the leading
    // bytes via a Range request rather than downloading the whole file
    // (which could be a large video) just to sniff a signature. Fails open
    // (logs and continues) on any fetch/range problem rather than blocking
    // a legitimate upload over an infra hiccup -- this is a defense-in-depth
    // check layered on top of the allowlist checks above and at
    // token-issuance time, not the sole gate.
    try {
      const leadingBytes = await this.fetchLeadingBytes(dto.url, 32);
      if (leadingBytes && !claimedMimeTypeMatchesBytes(leadingBytes, dto.mimeType)) {
        await this.storage.deleteFile(dto.url).catch(() => {});
        this.logger.warn(`Registration rejected: claimed type "${dto.mimeType}" does not match file content. brand=${brandId} url=${dto.url}`);
        throw new BadRequestException('This file\'s content does not match its claimed type. Please check the file and try again.');
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.warn(`Content-sniffing check skipped (fetch failed): ${(err as any)?.message || err}`);
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
   * full. Returns null (rather than throwing) if the server doesn't honor
   * Range or the request otherwise fails -- callers treat that as "can't
   * verify" and fail open, not as a rejection.
   */
  private async fetchLeadingBytes(url: string, maxBytes: number): Promise<Buffer | null> {
    try {
      const res = await fetch(url, { headers: { Range: `bytes=0-${maxBytes - 1}` } });
      if (!res.ok && res.status !== 206) return null;
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch {
      return null;
    }
  }

  private async createAssetRecord(
    brandId: string,
    dto: { url: string; size?: number; mimeType: string; filename?: string; folderId?: string },
    userId?: string,
  ) {
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
      }
    });
    this.logger.log(`DB record created: asset=${asset.id} brand=${brandId}`);

    // Deliberately NOT awaited here. Blocking the upload response on the
    // full AI pipeline (vision + captions + hashtags + scheduling) capped
    // upload throughput at one file's worth of AI latency at a time and
    // defeated real concurrency. The caller (UploadDropzone) fires
    // POST .../assets/:assetId/process as its own separate request right
    // after this returns -- see MediaController.processAsset / triggerProcessing
    // below, which is what actually runs handleMediaUploaded. That request
    // has its own execution budget and EngineService's internal pipeline
    // timeout guarantees it resolves cleanly either way. The record starts
    // life as PENDING; sweepStaleProcessing (see below) is the backstop if
    // the browser never gets to fire that follow-up call at all (e.g. the
    // tab closes mid-upload).
    return asset;
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

    this.logger.log(`Oyinca triggered: asset=${assetId} brand=${brandId}`);

    // Oyinca's AI pipeline (vision/caption/hashtags/scheduling)
    // and the Media Optimization Engine are independent -- optimized
    // versions don't need a caption to exist yet, and captioning doesn't
    // need optimized media. Running them concurrently rather than one
    // after the other is what keeps the combined wall time inside
    // Vercel's platform cap even though video optimization can itself
    // take real, non-trivial time (see MediaOptimizationService). Both
    // are awaited here (not fire-and-forget) because a Vercel function can
    // be frozen the instant its HTTP response flushes -- exactly the bug
    // already fixed once for "Publish Now" -- so anything that must
    // actually finish has to finish before this request returns.
    const [pipelineResult, optimizationResult] = await Promise.allSettled([
      this.engineService.handleMediaUploaded({ mediaAssetId: assetId }),
      this.triggerOptimization(brandId, assetId),
    ]);

    if (pipelineResult.status === 'rejected') {
      this.logger.error(`Oyinca pipeline threw for asset ${assetId}: ${pipelineResult.reason?.message || pipelineResult.reason}`);
    }
    if (optimizationResult.status === 'rejected') {
      this.logger.warn(`Media Optimization Engine threw for asset ${assetId}: ${optimizationResult.reason?.message || optimizationResult.reason}`);
    }

    const updated = await this.prisma.mediaAsset.findUnique({ where: { id: assetId } });
    this.logger.log(`Workflow complete: asset=${assetId} status=${updated?.status}`);
    return updated;
  }

  /**
   * Generates a platform-optimized version of this asset for every
   * platform the brand currently has connected. Never throws -- a media
   * optimization failure must never break or block the AI pipeline
   * running alongside it; PublishingService falls back to the raw
   * original if no optimized version exists for a platform at publish
   * time (see OptimizedMediaAsset / getOptimizedUrl).
   */
  private async triggerOptimization(brandId: string, assetId: string): Promise<void> {
    try {
      const connectedAccounts = await this.prisma.socialAccount.findMany({
        where: { brandId, status: ConnectionStatus.CONNECTED },
        select: { platform: true },
      });
      const platforms = Array.from(new Set(connectedAccounts.map((a) => a.platform)));
      if (platforms.length === 0) return;
      await this.mediaOptimizationService.optimizeForPlatforms(assetId, brandId, platforms);
    } catch (error: any) {
      this.logger.warn(`Media Optimization Engine failed for asset ${assetId}: ${error?.message || error}`);
    }
  }

  /**
   * Self-heals two kinds of stuck asset, both covered by the same sweep
   * since both just need handleMediaUploaded to (re-)run:
   *  - PROCESSING: a hard function kill mid-pipeline (Vercel gives no
   *    completion guarantee for a request that's still running).
   *  - PENDING past the same staleness window: register()/uploadAsset()
   *    now return before the AI pipeline runs at all, relying on the
   *    browser to fire a separate POST .../process request right after —
   *    if that never happens (tab closed mid-upload, network drop between
   *    the two calls), the asset would otherwise sit at PENDING forever
   *    with nothing to notice.
   * Runs opportunistically whenever the Media Library is loaded, since
   * that's naturally how soon a user notices something looks stuck.
   */
  private async sweepStaleProcessing(brandId: string): Promise<void> {
    const staleCutoff = new Date(Date.now() - STALE_PROCESSING_MINUTES * 60 * 1000);
    const stuck = await this.prisma.mediaAsset.findMany({
      where: {
        brandId,
        status: { in: [MediaStatus.PROCESSING, MediaStatus.PENDING] },
        updatedAt: { lte: staleCutoff },
      },
      select: { id: true },
      take: SWEEP_MAX_ITEMS,
    });
    for (const asset of stuck) {
      await this.engineService.handleMediaUploaded({ mediaAssetId: asset.id });
    }
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
    // Deliberately NOT awaited. sweepStaleProcessing (unlike
    // PostsService.opportunisticPublish) has no timeout cap at all -- it
    // runs the full AI vision/caption/hashtags/scheduling pipeline
    // (EngineService.handleMediaUploaded) for a stuck asset, which was
    // blocking every single Media Library page load behind however long
    // that pipeline call took. SWEEP_MAX_ITEMS=1 already bounds it to at
    // most one asset, but "at most one AI pipeline call" is still not
    // something a page load should wait on. Still fires and still
    // self-heals stuck assets the same way, just without gating the
    // response the caller is waiting on.
    this.sweepStaleProcessing(brandId).catch(() => {});

    // Projected + capped: the Media Library grid only ever renders these
    // seven fields (not batchId/batchName/relativePath/userId/platform/
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

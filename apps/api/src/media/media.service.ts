import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { EngineService } from '../engine/engine.service';
import { MediaOptimizationService } from '../media-optimization/media-optimization.service';
import { MediaStatus, ContentSource, ConnectionStatus } from '@prisma/client';

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

// Every external AI call in the pipeline (AiService.analyzeImage /
// generateCaption / generateHashtags) is now individually time-bounded,
// so a single asset's full pipeline run has a real worst case instead of
// being open-ended. 2 minutes is comfortably past that, so this sweep
// won't collide with an asset that's still legitimately mid-flight.
const STALE_PROCESSING_MINUTES = 2;
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
  ) {}

  async uploadAsset(brandId: string, file: Express.Multer.File, folderId?: string, userId?: string) {
    if (!file) throw new BadRequestException('No file provided');
    assertAllowedMimeType(file.mimetype);
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

    this.logger.log(`Upload registered: brand=${brandId} file="${dto.filename}" size=${dto.size} type=${dto.mimeType}`);
    return this.createAssetRecord(brandId, dto, userId);
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
   * Runs the AMAI Engine pipeline for an already-registered asset. Called
   * by the frontend as its own request immediately after register/upload
   * resolves (not awaited by the upload call itself) — see createAssetRecord
   * above for why that split exists.
   */
  async triggerProcessing(brandId: string, assetId: string) {
    const asset = await this.prisma.mediaAsset.findFirst({ where: { id: assetId, brandId } });
    if (!asset) throw new NotFoundException('Media asset not found.');

    this.logger.log(`AMAI Engine triggered: asset=${assetId} brand=${brandId}`);

    // The AMAI Engine's AI pipeline (vision/caption/hashtags/scheduling)
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
      this.logger.error(`AMAI Engine pipeline threw for asset ${assetId}: ${pipelineResult.reason?.message || pipelineResult.reason}`);
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

  async deleteAsset(brandId: string, assetId: string) {
    const asset = await this.prisma.mediaAsset.findFirst({ where: { id: assetId, brandId } });
    if (!asset) throw new NotFoundException('Media asset not found.');

    if (asset.blobUrl) {
      await this.storage.deleteFile(asset.blobUrl);
    }
    await this.prisma.mediaAsset.delete({ where: { id: assetId } });
    return { success: true, id: assetId };
  }

  async getAssets(brandId: string, folderId?: string) {
    await this.sweepStaleProcessing(brandId).catch(() => {});

    // Projected + capped: the Media Library grid only ever renders these
    // seven fields (not batchId/batchName/relativePath/userId/platform/
    // providerPostId/publishedAt/updatedAt), and an unbounded findMany()
    // would eventually pull the brand's entire upload history on every
    // page load as the library grows. 300 is a generous ceiling for the
    // grid view today; if libraries grow past that this should become
    // real cursor pagination with a "load more" affordance in the UI.
    return this.prisma.mediaAsset.findMany({
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
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }

  async createFolder(brandId: string, name: string, parentId?: string) {
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

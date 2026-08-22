import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { OptimizerRegistryService } from './optimizers/optimizer-registry.service';
import { ImageOptimizationEngine } from './engines/image-optimization.engine';
import { VideoOptimizationEngine } from './engines/video-optimization.engine';

// Bounds the whole optimize-for-every-connected-platform pass. Runs
// concurrently with (not blocking, and not blocked by) Oyinca's
// AI pipeline -- see MediaService.triggerProcessing, which awaits both via
// Promise.allSettled so neither can leave the other's work stranded by a
// frozen Lambda after an early HTTP response. Kept below the AI
// pipeline's own 50s ceiling so the combined worst case still lands
// comfortably inside Vercel's 60s platform cap.
const OPTIMIZATION_PIPELINE_TIMEOUT_MS = 40_000;

export interface OptimizationSummary {
  platform: string;
  status: 'optimized' | 'skipped' | 'failed';
  canvasApplied?: boolean;
  passthrough?: boolean;
  reason?: string;
}

/**
 * Orchestrator for the Media Optimization Engine: detects media type,
 * dispatches to the shared image/video engines using each connected
 * platform's rules (via OptimizerRegistryService), uploads the results
 * alongside -- never over -- the original, and records one
 * OptimizedMediaAsset row per (asset, platform). Idempotent: a platform
 * that already has an optimized version for this asset is skipped, so
 * this is safe to call again (e.g. from a retry/stale sweep) without
 * redoing finished work.
 */
@Injectable()
export class MediaOptimizationService {
  private readonly logger = new Logger(MediaOptimizationService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private registry: OptimizerRegistryService,
    private imageEngine: ImageOptimizationEngine,
    private videoEngine: VideoOptimizationEngine,
  ) {}

  async optimizeForPlatforms(mediaAssetId: string, brandId: string, platformKeys: string[]): Promise<OptimizationSummary[]> {
    return this.withTimeout(this.run(mediaAssetId, brandId, platformKeys), mediaAssetId);
  }

  private withTimeout<T>(promise: Promise<T>, mediaAssetId: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.logger.error(`Media Optimization Engine exceeded ${OPTIMIZATION_PIPELINE_TIMEOUT_MS}ms for asset ${mediaAssetId}.`);
        reject(new Error('Media optimization took too long.'));
      }, OPTIMIZATION_PIPELINE_TIMEOUT_MS);
      promise.then(
        (val) => { clearTimeout(timer); resolve(val); },
        (err) => { clearTimeout(timer); reject(err); },
      );
    });
  }

  private async run(mediaAssetId: string, brandId: string, platformKeysRaw: string[]): Promise<OptimizationSummary[]> {
    const start = Date.now();
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id: mediaAssetId } });
    if (!asset || !asset.blobUrl) {
      this.logger.warn(`Media Optimization Engine: asset ${mediaAssetId} not found or has no source file -- skipping.`);
      return [];
    }

    const platformKeys = Array.from(new Set(platformKeysRaw.map((p) => p.toUpperCase())))
      .filter((p) => this.registry.get(p) !== null);
    if (platformKeys.length === 0) return [];

    const existing = await this.prisma.optimizedMediaAsset.findMany({
      where: { mediaAssetId, platform: { in: platformKeys } },
      select: { platform: true },
    });
    const alreadyDone = new Set(existing.map((e) => e.platform));
    const pending = platformKeys.filter((p) => !alreadyDone.has(p));
    if (pending.length === 0) {
      this.logger.log(`[${mediaAssetId}] Media Optimization Engine: all ${platformKeys.length} platform version(s) already exist -- nothing to do.`);
      return platformKeys.map((platform) => ({ platform, status: 'skipped' as const, reason: 'already optimized' }));
    }

    this.logger.log(`[${mediaAssetId}] Optimization started: platforms=${pending.join(',')}`);

    const isVideo = asset.mimeType?.startsWith('video/');
    let sourceBuffer: Buffer;
    try {
      const res = await fetch(asset.blobUrl);
      if (!res.ok) throw new Error(`Could not download source media (${res.status}).`);
      sourceBuffer = Buffer.from(await res.arrayBuffer());
    } catch (error: any) {
      this.logger.error(`[${mediaAssetId}] Could not download source media for optimization: ${error?.message || error}`);
      return pending.map((platform) => ({ platform, status: 'failed' as const, reason: 'could not download source' }));
    }
    this.logger.log(`[${mediaAssetId}] Validation completed: kind=${isVideo ? 'video' : 'image'} size=${sourceBuffer.byteLength}B`);

    const results = await Promise.allSettled(
      pending.map((platform) => (isVideo ? this.optimizeVideoFor(asset, brandId, platform, sourceBuffer) : this.optimizeImageFor(asset, brandId, platform, sourceBuffer))),
    );

    const summaries: OptimizationSummary[] = results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      return { platform: pending[i], status: 'failed' as const, reason: r.reason?.message || 'unknown error' };
    });

    this.logger.log(`[${mediaAssetId}] Optimization completed in ${Date.now() - start}ms: ${summaries.map((s) => `${s.platform}=${s.status}`).join(', ')}`);
    return [...summaries, ...Array.from(alreadyDone).map((platform) => ({ platform, status: 'skipped' as const, reason: 'already optimized' }))];
  }

  private async optimizeImageFor(asset: { id: string; mimeType: string }, brandId: string, platform: string, sourceBuffer: Buffer): Promise<OptimizationSummary> {
    const stageStart = Date.now();
    const optimizer = this.registry.get(platform)!;
    const result = await this.imageEngine.optimize(sourceBuffer, optimizer.rules.image);

    const pathname = `optimized-${platform.toLowerCase()}.${result.mimeType === 'image/png' ? 'png' : 'jpg'}`;
    const uploaded = await this.storage.uploadBuffer(result.buffer, pathname, result.mimeType, brandId);

    await this.prisma.optimizedMediaAsset.upsert({
      where: { mediaAssetId_platform: { mediaAssetId: asset.id, platform } },
      create: {
        mediaAssetId: asset.id,
        platform,
        kind: 'image',
        blobUrl: uploaded.url,
        width: result.width,
        height: result.height,
        sizeBytes: uploaded.size,
        format: result.mimeType,
        canvasApplied: result.canvasApplied,
        croppedApplied: result.croppedApplied,
      },
      update: {
        blobUrl: uploaded.url,
        width: result.width,
        height: result.height,
        sizeBytes: uploaded.size,
        format: result.mimeType,
        canvasApplied: result.canvasApplied,
        croppedApplied: result.croppedApplied,
      },
    });

    this.logger.log(`[${asset.id}] Optimized asset created: platform=${platform} kind=image canvas=${result.canvasApplied} cropped=${result.croppedApplied} in ${Date.now() - stageStart}ms`);
    return { platform, status: 'optimized', canvasApplied: result.canvasApplied };
  }

  private async optimizeVideoFor(asset: { id: string; mimeType: string }, brandId: string, platform: string, sourceBuffer: Buffer): Promise<OptimizationSummary> {
    const stageStart = Date.now();
    const optimizer = this.registry.get(platform)!;
    const result = await this.videoEngine.optimize(sourceBuffer, optimizer.rules.video);

    let uploadedUrl: string;
    let sizeBytes: number;
    if (result.passthrough || !result.buffer) {
      // Reuse the already-stored original rather than re-uploading an
      // identical copy -- the OptimizedMediaAsset row still exists so
      // publishing has one consistent place to look regardless of whether
      // a real re-encode happened.
      uploadedUrl = (await this.prisma.mediaAsset.findUnique({ where: { id: asset.id }, select: { blobUrl: true } }))?.blobUrl || '';
      sizeBytes = sourceBuffer.byteLength;
    } else {
      const uploaded = await this.storage.uploadBuffer(result.buffer, `optimized-${platform.toLowerCase()}.mp4`, 'video/mp4', brandId);
      uploadedUrl = uploaded.url;
      sizeBytes = uploaded.size;
    }

    let thumbnailUrl: string | undefined;
    if (result.thumbnailBuffer) {
      const thumbUpload = await this.storage.uploadBuffer(result.thumbnailBuffer, `optimized-${platform.toLowerCase()}-thumb.jpg`, 'image/jpeg', brandId).catch(() => null);
      thumbnailUrl = thumbUpload?.url;
    }

    await this.prisma.optimizedMediaAsset.upsert({
      where: { mediaAssetId_platform: { mediaAssetId: asset.id, platform } },
      create: {
        mediaAssetId: asset.id,
        platform,
        kind: 'video',
        blobUrl: uploadedUrl,
        width: result.width,
        height: result.height,
        durationSeconds: result.durationSeconds,
        sizeBytes,
        format: 'video/mp4',
        canvasApplied: result.canvasApplied,
        passthrough: result.passthrough,
        thumbnailUrl,
      },
      update: {
        blobUrl: uploadedUrl,
        width: result.width,
        height: result.height,
        durationSeconds: result.durationSeconds,
        sizeBytes,
        canvasApplied: result.canvasApplied,
        passthrough: result.passthrough,
        thumbnailUrl,
      },
    });

    this.logger.log(`[${asset.id}] Optimized asset created: platform=${platform} kind=video canvas=${result.canvasApplied} passthrough=${result.passthrough} in ${Date.now() - stageStart}ms`);
    return { platform, status: 'optimized', canvasApplied: result.canvasApplied, passthrough: result.passthrough };
  }

  /** Used by publishing to prefer an optimized, platform-specific version over the raw original. */
  async getOptimizedUrl(mediaAssetId: string, platform: string): Promise<string | null> {
    const row = await this.prisma.optimizedMediaAsset.findUnique({
      where: { mediaAssetId_platform: { mediaAssetId, platform: platform.toUpperCase() } },
    });
    return row?.blobUrl || null;
  }
}

import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { StorageService } from '../storage/storage.service';
import { GoogleDriveService } from './google-drive.service';
import { EngineService } from './engine.service';
import { dispatchMediaProcessing } from './media-dispatch';
import { MediaOptimizationService } from '../media-optimization/media-optimization.service';
import { ConnectionStatus, ContentSource, MediaStatus, TargetStatus } from '@prisma/client';
import { assertSupportedVideoSize } from '../media/analysis-limits';

/**
 * Google Drive sync — pulls new files from each brand's connected folder
 * and feeds them into Oyinca exactly like a Direct Upload would.
 *
 * This used to run on an in-process @Cron(EVERY_10_MINUTES) timer, but
 * Vercel serverless functions don't stay alive long enough for NestJS's
 * @nestjs/schedule to ever fire it in production — there's no guarantee a
 * function instance is running when the timer would tick. `syncAll()` is
 * now called directly by the /api/cron/sync-drive endpoint, which Vercel
 * Cron hits on a schedule instead (see vercel.json).
 */
@Injectable()
export class EngineJobsService {
  private readonly logger = new Logger(EngineJobsService.name);

  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
    private storage: StorageService,
    private driveService: GoogleDriveService,
    private engineService: EngineService,
    private mediaOptimizationService: MediaOptimizationService,
  ) {}

  /**
   * Database-backed recovery worker for uploads whose browser-triggered
   * processing request never arrived or whose serverless invocation died.
   * MediaAsset is the durable job record; EngineService owns the atomic
   * PENDING/stale-PROCESSING claim, so overlapping cron calls remain safe.
   */
  async processPendingMedia(): Promise<{ found: number; processed: number; failed: number }> {
    const staleBefore = new Date(Date.now() - 2 * 60 * 1000);
    // Reconcile even exhausted and linked jobs, which must never generate again.
    const interrupted = await this.prisma.mediaAsset.findMany({
      where: { OR: [
        { status: MediaStatus.PROCESSING, updatedAt: { lt: staleBefore } },
        { status: MediaStatus.FAILED, aiReservationOrgId: { not: null } },
      ] }, take: 20, orderBy: { updatedAt: 'asc' }, select: { id: true },
    });
    for (const asset of interrupted) {
      await this.engineService.reconcileMediaAsset(asset.id).catch(() => {
        this.logger.warn(`Reconciliation deferred for asset ${asset.id}.`);
      });
    }
    await this.recoverOptimizations().catch(() => this.logger.warn('Optimization recovery deferred.'));
    const jobs = await this.prisma.mediaAsset.findMany({
      where: {
        blobUrl: { not: null },
        linkedPostId: null,
        processingIntent: 'SINGLE',
        processingAttempts: { lt: 3 },
        OR: [
          { status: MediaStatus.PENDING },
          { status: MediaStatus.PROCESSING, updatedAt: { lt: staleBefore } },
          { status: MediaStatus.FAILED, processingNextAttemptAt: { lte: new Date() } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      // One AI pipeline can consume most of a serverless invocation. A
      // frequent cron drains the backlog safely without starting work that
      // the platform will kill before it can finish.
      take: 20,
      select: { id: true },
    });

    let processed = 0;
    let failed = 0;
    await Promise.all(jobs.map(async (job) => {
      try {
        await dispatchMediaProcessing(job.id);
        processed++;
      } catch (error: any) {
        failed++;
        this.logger.warn(`Pending-media recovery failed for ${job.id}: ${error?.message || error}`);
      }
    }));
    return { found: jobs.length, processed, failed };
  }

  async processOneMedia(id: string) {
    if (await this.engineService.reconcileMediaAsset(id)) return { skipped: true };
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset || asset.processingIntent !== 'SINGLE' || asset.linkedPostId || asset.processingAttempts >= 3) return { skipped: true };
    if (asset.processingNextAttemptAt && asset.processingNextAttemptAt > new Date()) {
      throw new ServiceUnavailableException('Media retry is waiting for its backoff window.');
    }
    await this.engineService.handleMediaUploaded({ mediaAssetId: id });
    const result = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (result?.status === MediaStatus.FAILED) throw new ServiceUnavailableException('Media processing failed; bounded retry required.');
    return { status: result?.status };
  }

  async optimizeOneMedia(id: string) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset?.brandId || asset.optimizationStage === 'DONE' || asset.optimizationAttempts >= 3) return { skipped: true };
    const claim = await this.prisma.mediaAsset.updateMany({
      where: { id, optimizationAttempts: asset.optimizationAttempts, OR: [{ optimizationStage: 'QUEUED' }, { optimizationStage: 'FAILED' }, { optimizationStage: 'PROCESSING', updatedAt: { lt: new Date(Date.now() - 120_000) } }] },
      data: { optimizationStage: 'PROCESSING', optimizationAttempts: { increment: 1 } },
    });
    if (!claim.count) return { skipped: true };
    try {
      const accounts = await this.prisma.socialAccount.findMany({ where: { brandId: asset.brandId, status: ConnectionStatus.CONNECTED }, select: { platform: true } });
      const result = await this.mediaOptimizationService.optimizeForPlatforms(id, asset.brandId, [...new Set(accounts.map((a) => a.platform))]);
      if (result.some((item) => item.status === 'failed')) throw new Error('A derivative could not be prepared.');
      await this.prisma.mediaAsset.updateMany({ where: { id, optimizationAttempts: asset.optimizationAttempts + 1 }, data: { optimizationStage: 'DONE' } });
      return { status: 'DONE' };
    } catch (error) {
      await this.prisma.mediaAsset.updateMany({ where: { id, optimizationAttempts: asset.optimizationAttempts + 1 }, data: { optimizationStage: 'FAILED' } });
      throw error;
    }
  }

  async recoverOptimizations() {
    const staleBefore = new Date(Date.now() - 5 * 60_000);
    await this.prisma.mediaAsset.updateMany({
      where: { optimizationStage: 'PROCESSING', optimizationAttempts: { gte: 3 }, updatedAt: { lt: staleBefore } },
      data: { optimizationStage: 'FAILED' },
    });
    const assets = await this.prisma.mediaAsset.findMany({
      where: { blobUrl: { not: null }, optimizationAttempts: { lt: 3 }, OR: [
        { optimizationStage: 'QUEUED' },
        { optimizationStage: { in: ['FAILED', 'PROCESSING'] }, updatedAt: { lt: staleBefore } },
      ] }, take: 20, orderBy: { updatedAt: 'asc' }, select: { id: true },
    });
    await Promise.all(assets.map(async (asset) => {
      await dispatchMediaProcessing(asset.id, 'optimize-media').catch(() => {
        this.logger.warn(`Optimization dispatch deferred for asset ${asset.id}.`);
      });
    }));
    return { found: assets.length };
  }

  async syncAllGoogleDrive() {
    const configs = await this.prisma.amaiEngineConfig.findMany({
      where: { googleRefreshToken: { not: null } },
    });

    let ingested = 0;
    for (const config of configs) {
      ingested += await this.syncOneConfig(config);
    }

    if (configs.length > 0) {
      this.logger.log(`syncAllGoogleDrive: checked ${configs.length} brand(s), ingested ${ingested} new file(s).`);
    }
    return { checked: configs.length, ingested };
  }

  /**
   * Same sync logic as syncAllGoogleDrive, scoped to a single brand — this
   * is what the Media Library page's "Sync Now" button calls for an
   * on-demand check, instead of waiting for the next scheduled cron pass.
   */
  async syncBrandDrive(brandId: string) {
    const config = await this.prisma.amaiEngineConfig.findUnique({ where: { brandId } });
    if (!config || !config.googleRefreshToken || !config.driveFolderId) {
      return { checked: 0, ingested: 0, connected: false };
    }
    const ingested = await this.syncOneConfig(config);
    return { checked: 1, ingested, connected: true };
  }

  private async syncOneConfig(config: {
    id: string;
    brandId: string;
    googleRefreshToken: string | null;
    driveFolderId: string | null;
  }): Promise<number> {
    if (!config.googleRefreshToken || !config.driveFolderId) return 0;

    let ingested = 0;
    try {
      const refreshToken = this.encryption.decrypt(config.googleRefreshToken);
      const files = await this.driveService.listNewFilesInFolder(refreshToken, config.driveFolderId);

      for (const file of files) {
        if (!file.id) continue;

        const alreadySynced = await this.prisma.driveSyncLog.findUnique({
          where: { configId_googleFileId: { configId: config.id, googleFileId: file.id } },
        }).catch(() => null);
        if (alreadySynced) continue;

        try {
          // Reject unsupported video before downloading it into serverless memory.
          if (file.mimeType?.startsWith('video/') && (!file.size || !Number.isSafeInteger(Number(file.size)))) {
            throw new Error('Video size is unavailable; import skipped.');
          }
          assertSupportedVideoSize(file.mimeType || '', Number(file.size || 0));
          const buffer = await this.driveService.downloadFile(refreshToken, file.id);
          const mimeType = file.mimeType || 'application/octet-stream';
          const uploaded = await this.storage.uploadBuffer(Buffer.from(buffer), file.name || file.id, mimeType, config.brandId);

          const asset = await this.prisma.mediaAsset.create({
            data: {
              brandId: config.brandId,
              filename: file.name || file.id,
              mimeType,
              sizeBytes: uploaded.size,
              blobUrl: uploaded.url,
              source: ContentSource.GOOGLE_DRIVE,
              status: MediaStatus.PENDING,
            },
          });

          await this.prisma.driveSyncLog.create({
            data: { configId: config.id, googleFileId: file.id, status: TargetStatus.PUBLISHED, postId: null },
          });

          await dispatchMediaProcessing(asset.id, 'optimize-media').catch(() => {
            this.logger.warn(`Optimization dispatch deferred for asset ${asset.id}.`);
          });
          await dispatchMediaProcessing(asset.id);

          ingested++;
        } catch (fileErr: any) {
          this.logger.warn(`Drive sync: failed to ingest file ${file.id} for brand ${config.brandId}: ${fileErr?.message || fileErr}`);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Drive sync failed for brand ${config.brandId}: ${err?.message || err}`);
    }
    return ingested;
  }
}

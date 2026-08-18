import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { StorageService } from '../storage/storage.service';
import { GoogleDriveService } from './google-drive.service';
import { EngineService } from './engine.service';
import { MediaOptimizationService } from '../media-optimization/media-optimization.service';
import { ConnectionStatus, ContentSource, MediaStatus, TargetStatus } from '@prisma/client';

/**
 * Google Drive sync — pulls new files from each brand's connected folder
 * and feeds them into the AMAI Engine exactly like a Direct Upload would.
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

          // Awaited directly (not events.emit fire-and-forget) so the AI
          // pipeline actually completes before this cron request ends —
          // same fix as the Direct Upload path in media.service.ts. This
          // loop already awaits several async steps per file sequentially,
          // so this is consistent with the existing shape, not a new cost.
          await this.engineService.handleMediaUploaded({ mediaAssetId: asset.id });

          // Platform-aware media processing must cover Google Drive-synced
          // media too, not just Direct Upload -- this was previously
          // missing entirely (Drive sync only ever ran the AI
          // caption/hashtag pipeline), meaning every Drive-sourced image
          // silently published as the raw original with no platform-correct
          // derivative. Mirrors MediaService.triggerOptimization's own
          // logic exactly: optimize for every currently-connected platform,
          // never let a failure here break the sync loop.
          try {
            const connectedAccounts = await this.prisma.socialAccount.findMany({
              where: { brandId: config.brandId, status: ConnectionStatus.CONNECTED },
              select: { platform: true },
            });
            const platforms = Array.from(new Set(connectedAccounts.map((a) => a.platform)));
            if (platforms.length > 0) {
              await this.mediaOptimizationService.optimizeForPlatforms(asset.id, config.brandId, platforms);
            }
          } catch (optError: any) {
            this.logger.warn(`Drive sync: Media Optimization Engine failed for asset ${asset.id}: ${optError?.message || optError}`);
          }

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

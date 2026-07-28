import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { StorageService } from '../storage/storage.service';
import { GoogleDriveService } from './google-drive.service';
import { EngineService } from './engine.service';
import { PostStatus, ContentSource, MediaStatus, TargetStatus } from '@prisma/client';

@Injectable()
export class EngineCron {
  private readonly logger = new Logger(EngineCron.name);

  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
    private storage: StorageService,
    private driveService: GoogleDriveService,
    private engineService: EngineService,
    private events: EventEmitter2,
  ) {}

  /**
   * Safety net: re-enqueues any post that's due to publish but doesn't have
   * an active job (e.g. the API restarted). BullMQ dedupes by jobId
   * (= PostTarget id) so this never double-publishes.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async publishDuePosts() {
    const due = await this.prisma.post.findMany({
      where: { status: PostStatus.SCHEDULED, scheduledAt: { lte: new Date() } },
      include: { targets: { where: { status: TargetStatus.PENDING } } },
      take: 50,
    });

    if (due.length === 0) return;
    this.logger.log(`Found ${due.length} due post(s) — ensuring they're queued to publish.`);

    for (const post of due) {
      if (post.targets.length === 0) continue;
      await this.engineService.enqueuePublish(post.id, post.scheduledAt || new Date());
    }
  }

  /**
   * Pulls new files from each brand's connected Google Drive folder and
   * feeds them into the AMAI Engine exactly like a Direct Upload would —
   * uploading is always the trigger, regardless of source.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async syncGoogleDrive() {
    const configs = await this.prisma.amaiEngineConfig.findMany({
      where: { googleRefreshToken: { not: null } },
    });

    for (const config of configs) {
      if (!config.googleRefreshToken || !config.driveFolderId) continue;

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

            this.events.emit('media.uploaded', { mediaAssetId: asset.id });
          } catch (fileErr: any) {
            this.logger.warn(`Drive sync: failed to ingest file ${file.id} for brand ${config.brandId}: ${fileErr?.message || fileErr}`);
          }
        }
      } catch (err: any) {
        this.logger.warn(`Drive sync failed for brand ${config.brandId}: ${err?.message || err}`);
      }
    }
  }
}

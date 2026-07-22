import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleDriveService } from './google-drive.service';
import { EncryptionService } from '../encryption/encryption.service';
import { AutoPilotService } from './autopilot.service';
import { TargetStatus } from '@marketing-os/database';

@Injectable()
export class AutoPilotCron {
  private readonly logger = new Logger(AutoPilotCron.name);

  constructor(
    private prisma: PrismaService,
    private driveService: GoogleDriveService,
    private encryption: EncryptionService,
    private autopilotService: AutoPilotService
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleAutoPilotSync() {
    this.logger.log('Running Auto-Pilot Sync Pipeline...');

    const configs = await this.prisma.autoPilotConfig.findMany({
      where: { isActive: true },
    });

    for (const config of configs) {
      try {
        const decryptedToken = this.encryption.decrypt(config.googleRefreshToken);
        
        const files = await this.driveService.listNewFilesInFolder(decryptedToken, config.driveFolderId);
        
        for (const file of files) {
          if (!file.id) continue;

          const existingLog = await this.prisma.driveSyncLog.findUnique({
            where: { configId_googleFileId: { configId: config.id, googleFileId: file.id } }
          });

          if (existingLog) continue;

          this.logger.log(`Found new file to autopilot: ${file.name} for config ${config.id}`);

          // Delegate to shared service
          const post = await this.autopilotService.processMediaFile(config, file.name || 'Untitled Media');

          await this.prisma.driveSyncLog.create({
            data: {
              configId: config.id,
              googleFileId: file.id,
              status: TargetStatus.PENDING,
              postId: post.id
            }
          });
        }
      } catch (error) {
        this.logger.error(`Error processing Auto-Pilot config ${config.id}`, error);
      }
    }
  }
}


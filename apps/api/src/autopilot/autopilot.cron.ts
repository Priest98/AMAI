import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleDriveService } from './google-drive.service';
import { EncryptionService } from '../encryption/encryption.service';
import { AutoPilotService } from './autopilot.service';
import { ReplyStatus as TargetStatus } from '@prisma/client';

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
  }
}

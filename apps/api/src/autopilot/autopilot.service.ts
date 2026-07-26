import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { TargetStatus, AutoPilotConfig } from '@prisma/client';

import { GrowthService } from '../growth/growth.service';

@Injectable()
export class AutoPilotService {
  private readonly logger = new Logger(AutoPilotService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private growthService: GrowthService,
    @InjectQueue('publish-queue') private publishQueue: Queue
  ) {}

  async processMediaFile(config: AutoPilotConfig, fileName: string, fileData?: Buffer, mimeType?: string) {
    this.logger.log(`Processing media file for config ${config.id}: ${fileName}`);

    const topic = `A beautiful media file named ${fileName}`;
    let aiCopy = await this.aiService.generateCaption(config.brandId, 'system_autopilot', topic, 'multiple platforms', config.defaultTone || 'friendly');
    
    const optimizedCaption = await this.growthService.optimizeCaption(config.brandId, aiCopy.caption);

    const post = await this.prisma.post.create({
      data: {
        brandId: config.brandId,
        caption: optimizedCaption,
        status: 'SCHEDULED', 
      }
    });

    return post;
  }

  async processWebhookUpload(webhookToken: string, file: Express.Multer.File) {
    const config = await this.prisma.autoPilotConfig.findUnique({
      where: { webhookToken, isActive: true }
    });

    if (!config) {
      throw new Error('Invalid or inactive webhook token');
    }

    const post = await this.processMediaFile(config, file.originalname, file.buffer, file.mimetype);
    return { success: true, postId: post.id };
  }
}

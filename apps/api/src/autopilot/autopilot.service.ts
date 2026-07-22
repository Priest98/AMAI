import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { TargetStatus, AutoPilotConfig } from '@marketing-os/database';

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

    // Generate AI Caption
    const topic = `A beautiful media file named ${fileName}`;
    let aiCopy = await this.aiService.generateCaption(config.brandId, 'system_autopilot', topic, 'multiple platforms', config.defaultTone);
    
    // Optimize Caption for Growth
    const optimizedCaption = await this.growthService.optimizeCaption(config.brandId, aiCopy.caption);

    const targetPlatforms: string[] = JSON.parse(config.targetPlatforms);
    
    // Calculate interval based on postsPerDay (default 5 if undefined)
    const postsPerDay = config.postsPerDay || 5;
    const intervalMs = Math.floor((24 * 60 * 60 * 1000) / postsPerDay);
    
    // Find latest scheduled post
    const latestPost = await this.prisma.post.findFirst({
      where: { brandId: config.brandId, status: 'SCHEDULED' },
      orderBy: { scheduledAt: 'desc' },
    });

    let nextScheduledAt = new Date(Date.now() + intervalMs);
    if (latestPost && latestPost.scheduledAt && latestPost.scheduledAt.getTime() > Date.now()) {
      nextScheduledAt = new Date(latestPost.scheduledAt.getTime() + intervalMs);
    }

    // Create Draft Post
    const post = await this.prisma.post.create({
      data: {
        brandId: config.brandId,
        caption: optimizedCaption,
        status: 'SCHEDULED', 
        scheduledAt: nextScheduledAt,
      }
    });

    for (const platform of targetPlatforms) {
      const socialAccount = await this.prisma.socialAccount.findFirst({
        where: { brandId: config.brandId, platform: platform as any }
      });

      if (socialAccount) {
        const target = await this.prisma.postTarget.create({
          data: {
            postId: post.id,
            socialAccountId: socialAccount.id,
            platform: socialAccount.platform,
            status: TargetStatus.PENDING,
          }
        });

        // Push to Publish Queue
        await this.publishQueue.add('publish-job', { postTargetId: target.id }, {
          delay: new Date(post.scheduledAt!).getTime() - Date.now()
        });
      }
    }

    return post;
  }

  async processWebhookUpload(webhookToken: string, file: Express.Multer.File) {
    const config = await this.prisma.autoPilotConfig.findUnique({
      where: { webhookToken, isActive: true }
    });

    if (!config) {
      throw new Error('Invalid or inactive webhook token');
    }

    // In a real app, upload file buffer to S3/Cloud Storage here and save URL.
    // We pass the raw name for now to generate the caption.
    const post = await this.processMediaFile(config, file.originalname, file.buffer, file.mimetype);
    
    return { success: true, postId: post.id };
  }
}

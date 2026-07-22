import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { TargetStatus, Platform } from '@marketing-os/database';

@Processor('publish-queue')
export class PublisherWorker extends WorkerHost {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService
  ) {
    super();
  }

  async process(job: Job<{ postTargetId: string }>) {
    console.log(`Processing job ${job.id} for target ${job.data.postTargetId}`);
    
    // 1. Fetch Target Data & Tokens securely
    const target = await this.prisma.postTarget.findUnique({
      where: { id: job.data.postTargetId },
      include: {
        post: { include: { media: { include: { asset: true } } } },
        socialAccount: true,
      }
    });

    if (!target) {
      throw new Error(`Target ${job.data.postTargetId} not found`);
    }

    try {
      const decryptedToken = this.encryption.decrypt(target.socialAccount.accessToken);
      
      // 2. Mock external API execution based on Platform
      // e.g. switch(target.platform) { case Platform.INSTAGRAM: publishToIG(decryptedToken, post.caption); }
      console.log(`Successfully published ${target.post.id} to ${target.platform} using decrypted token`);

      // 3. Update status & Log
      await this.prisma.$transaction([
        this.prisma.postTarget.update({
          where: { id: target.id },
          data: { status: TargetStatus.PUBLISHED }
        }),
        this.prisma.publishingLog.create({
          data: {
            postTargetId: target.id,
            status: TargetStatus.PUBLISHED,
            apiResponse: JSON.stringify({ success: true, platformId: `mock_${Date.now()}` })
          }
        })
      ]);
    } catch (error) {
      console.error(`Failed to publish target ${target.id}`, error);
      
      // Log failure
      await this.prisma.$transaction([
        this.prisma.postTarget.update({
          where: { id: target.id },
          data: { status: TargetStatus.FAILED }
        }),
        this.prisma.publishingLog.create({
          data: {
            postTargetId: target.id,
            status: TargetStatus.FAILED,
            errorMessage: error instanceof Error ? error.message : 'Unknown Error'
          }
        })
      ]);

      throw error; // Let BullMQ handle retries
    }
  }
}

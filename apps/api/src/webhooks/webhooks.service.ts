import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GrowthService } from '../growth/growth.service';
import { Platform } from '@prisma/client';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly growthService: GrowthService
  ) {}

  async processIncomingComment(
    platform: Platform,
    platformAccountId: string,
    originalPostId: string,
    originalCommentId: string,
    originalCommentText: string,
    postCaption: string
  ) {
    this.logger.log(`Received incoming comment on ${platform} for account ${platformAccountId}`);

    const socialAccount = await this.prisma.socialAccount.findFirst({
      where: {
        platform,
        platformAccountId,
      },
      include: { brand: true }
    });

    if (!socialAccount) {
      this.logger.warn(`No social account found for ${platform} ${platformAccountId}`);
      return;
    }

    const brandId = socialAccount.brandId;

    const aiReplyText = await this.growthService.generateCommentReply(
      brandId,
      originalCommentText,
      postCaption
    );

    if (!aiReplyText) {
      this.logger.log(`Growth Service did not return a reply (disabled or failed). Skipping.`);
      return;
    }

    await this.prisma.pendingCommentReply.create({
      data: {
        brandId,
        platform,
        platformAccountId,
        originalPostId,
        originalCommentId,
        originalCommentText,
        aiGeneratedReply: aiReplyText,
        status: 'PENDING'
      }
    });

    this.logger.log(`Successfully queued AI reply for manual approval. Brand: ${brandId}`);
  }
}

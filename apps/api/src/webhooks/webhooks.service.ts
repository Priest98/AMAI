import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GrowthService } from '../growth/growth.service';
import { Platform } from '@marketing-os/database';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly growthService: GrowthService
  ) {}

  /**
   * Processes an incoming comment webhook from a platform (Instagram or TikTok).
   */
  async processIncomingComment(
    platform: Platform,
    platformAccountId: string,
    originalPostId: string,
    originalCommentId: string,
    originalCommentText: string,
    postCaption: string
  ) {
    this.logger.log(`Received incoming comment on ${platform} for account ${platformAccountId}`);

    // 1. Look up our internal social account and brand
    const socialAccount = await this.prisma.socialAccount.findUnique({
      where: {
        platform_platformAccountId: {
          platform,
          platformAccountId,
        }
      },
      include: { brand: true }
    });

    if (!socialAccount) {
      this.logger.warn(`No social account found for ${platform} ${platformAccountId}`);
      return;
    }

    const brandId = socialAccount.brandId;

    // 2. Generate the AI Reply via the GrowthService
    const aiReplyText = await this.growthService.generateCommentReply(
      brandId,
      originalCommentText,
      postCaption
    );

    if (!aiReplyText) {
      this.logger.log(`Growth Service did not return a reply (disabled or failed). Skipping.`);
      return;
    }

    // 3. Save to Approval Queue (PendingCommentReply table)
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

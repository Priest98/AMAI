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

    try {
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
    } catch (error: any) {
      // Redelivery of a webhook we've already processed (see the schema
      // comment on PendingCommentReply's @@unique) -- both Meta and TikTok
      // document at-least-once delivery, so this is an expected, not
      // exceptional, outcome, not a bug being swallowed. The AI reply was
      // already generated above by this point (can't be avoided without a
      // pre-check race of its own), but at least the duplicate row -- and
      // therefore the duplicate human-approved reply -- never happens.
      if (error?.code === 'P2002') {
        this.logger.log(`Duplicate webhook delivery for comment ${originalCommentId} on ${platform} -- already queued, skipping.`);
        return;
      }
      throw error;
    }

    this.logger.log(`Successfully queued AI reply for manual approval. Brand: ${brandId}`);
  }
}

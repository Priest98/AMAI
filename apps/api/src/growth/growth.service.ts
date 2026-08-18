import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GrowthService {
  private readonly logger = new Logger(GrowthService.name);
  private readonly ai: GoogleGenAI;

  constructor(private readonly prisma: PrismaService) {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  /**
   * Generates an algorithm-compliant reply to a comment.
   */
  async generateCommentReply(brandId: string, originalComment: string, postCaption: string): Promise<string> {
    const settings = await this.prisma.growthSettings.findUnique({ where: { brandId } });
    if (!settings || !settings.autoReplyComments) {
      this.logger.log(`Auto-reply disabled for brand ${brandId}. Skipping.`);
      return '';
    }

    const tone = settings.commentTone || 'friendly';
    const prompt = `You are the social media manager for a brand. A user just commented on your post.
Post Caption: "${postCaption}"
User Comment: "${originalComment}"
Your Tone: ${tone}

Generate a short, engaging, and ${tone} reply to this comment (under 150 characters).
Do not use hashtags. Try to sound human.`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: prompt,
      });
      return response.text ? response.text.trim() : '';
    } catch (err) {
      this.logger.error(`Failed to generate comment reply: ${err}`);
      return '';
    }
  }

  /**
   * Optimizes a caption by injecting trending hashtags and a CTA.
   */
  async optimizeCaption(brandId: string, rawCaption: string): Promise<string> {
    const settings = await this.prisma.growthSettings.findUnique({ where: { brandId } });
    if (!settings || !settings.optimizeHashtags) {
      return rawCaption;
    }

    const prompt = `You are an expert Social Media Growth Hacker. 
You are given a raw caption. You need to rewrite it to be engaging, add a Call to Action (CTA), and include 3-5 trending, highly relevant hashtags.

Raw Caption: "${rawCaption}"

Provide only the rewritten caption.`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: prompt,
      });
      return response.text ? response.text.trim() : rawCaption;
    } catch (err) {
      this.logger.error(`Failed to optimize caption: ${err}`);
      return rawCaption;
    }
  }

  /**
   * Fetches all pending replies for a brand.
   */
  async getPendingReplies(brandId: string) {
    return this.prisma.pendingCommentReply.findMany({
      where: { brandId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Approves a pending reply. Scoped by (id AND brandId) -- not just id --
   * so a valid, guard-checked brandId can never be paired with another
   * brand's reply id to approve/reject someone else's queue (see
   * GrowthController's audit comment). updateMany + a zero-count check is
   * how Prisma expresses "update only if this row also belongs to this
   * brand" since `update` only accepts a unique-field where clause.
   *
   * NOTE (functionality gap, not a security issue -- flagged separately in
   * the V2 audit): this still only flips status to APPROVED locally. It
   * does not yet call the Instagram/TikTok API to actually post the reply
   * -- that dispatch step was never implemented.
   */
  async approveReply(brandId: string, id: string) {
    const result = await this.prisma.pendingCommentReply.updateMany({
      where: { id, brandId },
      data: { status: 'APPROVED' },
    });
    if (result.count === 0) {
      throw new NotFoundException('Reply not found for this brand.');
    }
    return this.prisma.pendingCommentReply.findUnique({ where: { id } });
  }

  /**
   * Rejects a pending reply. See approveReply's comment for why this is
   * scoped by (id AND brandId) rather than id alone.
   */
  async rejectReply(brandId: string, id: string) {
    const result = await this.prisma.pendingCommentReply.updateMany({
      where: { id, brandId },
      data: { status: 'REJECTED' },
    });
    if (result.count === 0) {
      throw new NotFoundException('Reply not found for this brand.');
    }
    return this.prisma.pendingCommentReply.findUnique({ where: { id } });
  }
}

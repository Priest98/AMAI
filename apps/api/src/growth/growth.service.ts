import { Injectable, Logger } from '@nestjs/common';
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
        model: 'gemini-2.5-flash',
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
        model: 'gemini-2.5-flash',
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
   * Approves a pending reply.
   */
  async approveReply(id: string) {
    // In a real app, this is where you'd call Instagram/TikTok APIs to post the comment.
    // For now, we simulate dispatching by marking it APPROVED.
    return this.prisma.pendingCommentReply.update({
      where: { id },
      data: { status: 'APPROVED' }
    });
  }

  /**
   * Rejects a pending reply.
   */
  async rejectReply(id: string) {
    return this.prisma.pendingCommentReply.update({
      where: { id },
      data: { status: 'REJECTED' }
    });
  }
}

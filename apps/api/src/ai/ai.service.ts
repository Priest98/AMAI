import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiService {
  private ai: GoogleGenAI;

  constructor(private prisma: PrismaService) {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'placeholder' });
  }

  async generateCaption(brandId: string, userId: string, topic: string, platform: string, tone: string) {
    const prompt = `Write an engaging social media post for ${platform} about ${topic}. The tone should be ${tone}. Include relevant hashtags. Keep it strictly under the character limit for ${platform}.`;
    
    let text: string;

    try {
      if (process.env.GEMINI_API_KEY) {
        const response = await this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
        text = response.text || `🚀 Check out our latest post about ${topic}! #SocialMedia #MarketingOS`;
      } else {
        // Fallback mock caption when no API key is set (local dev without key)
        text = `🚀 Here is a brilliant AI generated caption about ${topic}! Designed perfectly for ${platform} in a ${tone} tone. #SocialMedia #MarketingOS`;
      }

      // Log Usage
      await this.prisma.aiUsageLog.create({
        data: {
          brandId,
          userId,
          prompt,
          completion: text,
          tokensUsed: 100, // mock token count; use real token count from response in prod
        }
      });

      return { caption: text };
    } catch (error) {
      // Log error without exposing stack trace to callers
      const message = error instanceof Error ? error.message : 'Unknown Gemini error';
      console.error('Gemini API Error:', message);
      throw new InternalServerErrorException('Failed to generate AI content');
    }
  }
}

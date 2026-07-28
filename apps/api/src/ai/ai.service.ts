import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { PrismaService } from '../prisma/prisma.service';

export interface BestTimeResult {
  recommendedTime: string;
  formattedTime: string;
  confidence: number;
  reason: string;
  peakWindow: string;
}

export interface HashtagsResult {
  highVolume: string[];
  mediumCompetition: string[];
  nicheHashtags: string[];
  brandedHashtags: string[];
  allHashtags: string[];
}

const NICHE_HASHTAG_MAP: Record<string, { highVolume: string[]; medium: string[]; niche: string[] }> = {
  'Fashion Designer': {
    highVolume: ['#fashion', '#style', '#ootd', '#fashionstyle', '#apparel'],
    medium: ['#fashiondesigner', '#garmentdesign', '#couture', '#fashioncollection', '#runway'],
    niche: ['#tailoring', '#fashioninspo', '#streetwear', '#textiles', '#designerlabel'],
  },
  'Restaurant': {
    highVolume: ['#foodie', '#foodporn', '#instafood', '#yummy', '#dining'],
    medium: ['#restaurant', '#chef', '#foodlover', '#eatlocal', '#gourmet'],
    niche: ['#specials', '#bistro', '#culinary', '#foodgasm', '#menu'],
  },
  'Real Estate': {
    highVolume: ['#realestate', '#realtor', '#home', '#property', '#househunting'],
    medium: ['#architecture', '#luxuryrealestate', '#dreamhome', '#realty', '#openhouse'],
    niche: ['#interiordesign', '#homesforsale', '#propertylisting', '#realestateinvesting', '#broker'],
  },
  'Beauty': {
    highVolume: ['#beauty', '#makeup', '#skincare', '#glam', '#aesthetic'],
    medium: ['#beautybloggers', '#instabeauty', '#makeuptutorial', '#glowingskin', '#beautytips'],
    niche: ['#cleanbeauty', '#skincareroutine', '#cosmetics', '#mua', '#selfcare'],
  },
  'Fitness': {
    highVolume: ['#fitness', '#workout', '#gym', '#motivation', '#healthylifestyle'],
    medium: ['#fitfam', '#training', '#personaltrainer', '#fitnessmotivation', '#activewear'],
    niche: ['#bodybuilding', '#sweat', '#gymlife', '#workoutmotivation', '#fitlife'],
  },
  'Content Creator': {
    highVolume: ['#contentcreator', '#creator', '#reels', '#trending', '#vlog'],
    medium: ['#creators', '#digitalcreator', '#creative', '#videoeditor', '#storytelling'],
    niche: ['#contentstrategy', '#creatorsuccess', '#behindthescenes', '#creativelife', '#influencer'],
  },
  'Small Business': {
    highVolume: ['#smallbusiness', '#entrepreneur', '#shoplocal', '#supportsmallbusiness', '#businessowner'],
    medium: ['#handcrafted', '#startup', '#boutique', '#locallymade', '#businessgrowth'],
    niche: ['#artisan', '#brandstory', '#maker', '#smallbiz', '#entrepreneurship'],
  },
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private ai: GoogleGenAI;

  constructor(private prisma: PrismaService) {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'placeholder' });
  }

  /**
   * Context-Aware & Niche-Specific AI Caption Generation
   */
  async generateCaption(brandId: string, userId: string, topic: string, platform: string, tone: string) {
    const niche = tone || 'Content Creator';
    const isAiTopic = /ai|artificial intelligence|machine learning|automation|gpt/i.test(topic + ' ' + niche);

    const nicheData = NICHE_HASHTAG_MAP[niche] || NICHE_HASHTAG_MAP['Content Creator'];
    const defaultTags = [...nicheData.highVolume.slice(0, 2), ...nicheData.medium.slice(0, 2), ...nicheData.niche.slice(0, 2)].join(' ');

    const prompt = `You are a professional social media manager specializing in the ${niche} industry.
Write a compelling, authentic post for ${platform} about: "${topic}".
Requirements:
1. Hook the audience in the first sentence.
2. Include engaging body content with clear value.
3. End with a strong Call-To-Action (CTA).
4. Include 4-6 highly relevant hashtags specifically for ${niche}.
5. ${isAiTopic ? '' : 'CRITICAL REQUIREMENT: Do NOT include generic AI hashtags like #AI, #ArtificialIntelligence, or #MachineLearning unless the content is explicitly about AI technology.'}
Keep the caption under character limits for ${platform}.`;

    let text: string;

    try {
      if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'placeholder') {
        const response = await this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
        text = response.text || `✨ Elevate your style and presence! Check out our latest ${topic || 'collection'} designed for your everyday lifestyle. What do you think of this look? Let us know below! ${defaultTags}`;
      } else {
        text = `✨ Elevate your style and presence! Check out our latest ${topic || 'feature'} crafted specially for our ${niche} community. What do you think? Drop your thoughts below! ${defaultTags}`;
      }

      try {
        await this.prisma.aiUsageLog.create({
          data: {
            brandId: brandId || 'primary_brand',
            userId: userId || 'usr_primary',
            prompt,
            completion: text,
            tokensUsed: 120,
          },
        });
      } catch {}

      return { caption: text };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Gemini error';
      this.logger.error(`Gemini API Error: ${message}`);
      return {
        caption: `✨ Elevate your style and presence! Check out our latest ${topic || 'feature'} crafted specially for our ${niche} community. What do you think? Drop your thoughts below! ${defaultTags}`,
      };
    }
  }

  /**
   * Algorithm & Niche-Compliant Hashtag Generator (Strictly no generic AI tags unless requested)
   */
  async generateHashtags(topic: string = 'General', platform: string = 'Instagram', niche: string = 'Content Creator'): Promise<HashtagsResult> {
    const nicheKey = Object.keys(NICHE_HASHTAG_MAP).find(k => k.toLowerCase() === niche.toLowerCase()) || 'Content Creator';
    const nicheData = NICHE_HASHTAG_MAP[nicheKey] || NICHE_HASHTAG_MAP['Content Creator'];

    const highVolume = [...nicheData.highVolume];
    const mediumCompetition = [...nicheData.medium];
    const nicheHashtags = [...nicheData.niche];
    const brandedHashtags = [`#${nicheKey.replace(/\s+/g, '')}Life`, `#${nicheKey.replace(/\s+/g, '')}Community`];

    const allHashtags = [...highVolume, ...mediumCompetition, ...nicheHashtags, ...brandedHashtags];

    return {
      highVolume,
      mediumCompetition,
      nicheHashtags,
      brandedHashtags,
      allHashtags,
    };
  }

  /**
   * Determines the next upcoming "best time to post" window.
   *
   * This is a heuristic based on well-documented platform engagement
   * patterns (evenings tend to outperform mornings for both Instagram and
   * TikTok) — it picks the *next* occurrence of that window rather than a
   * fixed offset, so it varies with when the content was actually
   * uploaded. This is intentionally simple for the MVP; once there's
   * enough PublishingLog history per brand, this is the place to swap in
   * real engagement-based scoring without changing any calling code.
   */
  async predictBestPostingTime(platform: string = 'Instagram', brandId: string = 'primary_brand'): Promise<BestTimeResult> {
    const PEAK_WINDOWS: Record<string, { hour: number; minute: number; label: string }[]> = {
      Instagram: [{ hour: 12, minute: 0, label: 'lunchtime' }, { hour: 19, minute: 30, label: 'evening' }],
      TikTok: [{ hour: 9, minute: 0, label: 'morning commute' }, { hour: 20, minute: 0, label: 'evening wind-down' }],
      Facebook: [{ hour: 13, minute: 0, label: 'early afternoon' }],
      X: [{ hour: 9, minute: 0, label: 'morning' }, { hour: 17, minute: 0, label: 'end of workday' }],
      LinkedIn: [{ hour: 8, minute: 30, label: 'start of workday' }],
    };
    const normalizedPlatform = Object.keys(PEAK_WINDOWS).find(
      (k) => k.toLowerCase() === platform.toLowerCase(),
    ) || 'Instagram';
    const windows = PEAK_WINDOWS[normalizedPlatform];

    const now = new Date();
    let best: Date | null = null;
    for (let dayOffset = 0; dayOffset <= 2 && !best; dayOffset++) {
      for (const w of windows) {
        const candidate = new Date(now);
        candidate.setDate(now.getDate() + dayOffset);
        candidate.setHours(w.hour, w.minute, 0, 0);
        if (candidate.getTime() > now.getTime() + 30 * 60 * 1000) {
          best = candidate;
          break;
        }
      }
    }
    const targetDate = best || new Date(now.getTime() + 4 * 60 * 60 * 1000);
    const hoursAway = (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    const formattedTime = targetDate.toLocaleDateString('en-US', {
      weekday: 'long',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    // Sooner, well-known peak windows get slightly higher confidence than
    // ones several days out.
    const confidence = Math.max(70, Math.round(92 - hoursAway * 0.5));

    return {
      recommendedTime: targetDate.toISOString(),
      formattedTime,
      confidence,
      reason: `${normalizedPlatform} engagement tends to peak during this window based on typical audience activity patterns.`,
      peakWindow: formattedTime,
    };
  }
}

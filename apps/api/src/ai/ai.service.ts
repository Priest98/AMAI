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

  private isGeminiConfigured(): boolean {
    return !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'placeholder');
  }

  /**
   * Bounds any promise to a maximum wait time. Vercel hard-kills a
   * serverless function the instant it hits its platform timeout (60s on
   * this plan) — no catch block runs, no fallback executes, the request
   * just vanishes mid-flight. That's what left media stuck in PROCESSING:
   * an unbounded Gemini call (occasionally slow under rate limiting or
   * bulk-upload load) could run right up against that wall with nothing
   * to intervene first. Every external AI call in this service is wrapped
   * in this so a slow/hung provider always loses to the app's own
   * heuristic fallback well before Vercel's platform timeout can fire.
   */
  private withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      promise.then(
        (val) => { clearTimeout(timer); resolve(val); },
        (err) => { clearTimeout(timer); reject(err); },
      );
    });
  }

  /**
   * Real media analysis: downloads the image and sends it to Gemini's
   * multimodal endpoint to get a short, concrete description of what's
   * actually in the frame — not a guess based on the filename. Returns
   * null (rather than throwing) if Gemini isn't configured or the call
   * fails for any reason, so callers can fall back to the filename
   * heuristic without the whole pipeline breaking. Video analysis isn't
   * implemented here yet (would need the Files API for anything beyond a
   * few MB) — video assets always use the filename fallback for now.
   */
  async analyzeImage(imageUrl: string): Promise<string | null> {
    if (!this.isGeminiConfigured()) return null;

    try {
      const imageRes = await this.withTimeout(fetch(imageUrl), 10_000, 'Image download');
      if (!imageRes.ok) return null;
      const mimeType = imageRes.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await imageRes.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');

      const response = await this.withTimeout(
        this.ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents: [
            {
              role: 'user',
              parts: [
                { text: 'Describe the main subject of this image in 3-8 words, suitable as a social media post topic. Just the phrase, no punctuation, no preamble.' },
                { inlineData: { mimeType, data: base64 } },
              ],
            },
          ],
        }),
        15_000,
        'Gemini vision analysis',
      );

      const text = response.text?.trim();
      return text && text.length > 0 ? text : null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Gemini vision error';
      this.logger.warn(`Image analysis failed, falling back to filename heuristic: ${message}`);
      return null;
    }
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
        const response = await this.withTimeout(
          this.ai.models.generateContent({ model: 'gemini-flash-latest', contents: prompt }),
          15_000,
          'Gemini caption generation',
        );
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
   * AI-generated hashtags specific to the actual topic and niche. Falls
   * back to the static niche map only when Gemini isn't configured or the
   * call fails — previously this always returned the same fixed list per
   * niche regardless of what was actually posted, which wasn't real
   * hashtag generation at all.
   */
  async generateHashtags(topic: string = 'General', platform: string = 'Instagram', niche: string = 'Content Creator'): Promise<HashtagsResult> {
    if (this.isGeminiConfigured()) {
      try {
        const prompt = `Generate hashtags for a ${platform} post about "${topic}" in the ${niche} niche.
Return strictly valid JSON, no markdown, no commentary, in this exact shape:
{"highVolume": ["#tag", ...5], "mediumCompetition": ["#tag", ...5], "nicheHashtags": ["#tag", ...5], "brandedHashtags": ["#tag", ...2]}
highVolume = broad, high-traffic tags. mediumCompetition = moderately specific tags. nicheHashtags = very specific to "${topic}". brandedHashtags = two short, on-brand tags for the ${niche} niche. All hashtags must start with # and contain no spaces.`;

        const response = await this.withTimeout(
          this.ai.models.generateContent({ model: 'gemini-flash-latest', contents: prompt }),
          15_000,
          'Gemini hashtag generation',
        );

        const raw = (response.text || '').trim().replace(/^```json\s*|```$/g, '').trim();
        const parsed = JSON.parse(raw);
        const highVolume: string[] = parsed.highVolume || [];
        const mediumCompetition: string[] = parsed.mediumCompetition || [];
        const nicheHashtags: string[] = parsed.nicheHashtags || [];
        const brandedHashtags: string[] = parsed.brandedHashtags || [];

        if (highVolume.length || mediumCompetition.length || nicheHashtags.length) {
          return {
            highVolume,
            mediumCompetition,
            nicheHashtags,
            brandedHashtags,
            allHashtags: [...highVolume, ...mediumCompetition, ...nicheHashtags, ...brandedHashtags],
          };
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown Gemini error';
        this.logger.warn(`Gemini hashtag generation failed, falling back to niche defaults: ${message}`);
      }
    }

    // Fallback: static niche defaults (used when Gemini isn't configured or fails).
    const nicheKey = Object.keys(NICHE_HASHTAG_MAP).find(k => k.toLowerCase() === niche.toLowerCase()) || 'Content Creator';
    const nicheData = NICHE_HASHTAG_MAP[nicheKey] || NICHE_HASHTAG_MAP['Content Creator'];

    const highVolume = [...nicheData.highVolume];
    const mediumCompetition = [...nicheData.medium];
    const nicheHashtags = [...nicheData.niche];
    const brandedHashtags = [`#${nicheKey.replace(/\s+/g, '')}Life`, `#${nicheKey.replace(/\s+/g, '')}Community`];

    return {
      highVolume,
      mediumCompetition,
      nicheHashtags,
      brandedHashtags,
      allHashtags: [...highVolume, ...mediumCompetition, ...nicheHashtags, ...brandedHashtags],
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

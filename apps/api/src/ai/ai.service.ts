import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiGatewayService } from '../ai-layer/ai-gateway.service';

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

/**
 * AMAI-Engine-facing façade over the AI Layer. This class owns *what* to
 * ask for (prompts, niche defaults, output cleanup, static fallback
 * templates) and always resolves to a usable string even if every
 * provider fails -- it deliberately knows nothing about Groq, Gemini, API
 * keys, retries, or timeouts anymore. All of that now lives in
 * AiGatewayService / ApiKeyManagerService / the provider adapters (see
 * ../ai-layer). This split is what makes "swap providers without touching
 * the rest of the app" real: EngineService and AiController only ever call
 * the methods below, and have never depended on how the answer was
 * produced.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private prisma: PrismaService,
    private aiGateway: AiGatewayService,
  ) {}

  /**
   * Real media analysis: sends the image to the AI Layer for a short,
   * concrete description of what's actually in the frame — not a guess
   * based on the filename. Returns null if no provider is configured or
   * every provider fails, so callers fall back to the filename heuristic
   * without the whole pipeline breaking. Video analysis isn't implemented
   * here yet — video assets always use the filename fallback for now.
   */
  async analyzeImage(imageUrl: string): Promise<string | null> {
    const visionPrompt = 'Describe the main subject of this image in 3-8 words, suitable as a social media post topic. Just the phrase, no punctuation, no preamble.';
    const result = await this.aiGateway.generate({
      label: 'vision analysis',
      maxTokens: 30,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: visionPrompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
    });
    return result?.text ?? null;
  }

  /**
   * Context-Aware & Niche-Specific AI Caption Generation
   */
  async generateCaption(brandId: string, userId: string, topic: string, platform: string, tone: string, brandContext?: string) {
    const niche = tone || 'Content Creator';
    const isAiTopic = /ai|artificial intelligence|machine learning|automation|gpt/i.test(topic + ' ' + niche);

    const nicheData = NICHE_HASHTAG_MAP[niche] || NICHE_HASHTAG_MAP['Content Creator'];
    const defaultTags = [...nicheData.highVolume.slice(0, 2), ...nicheData.medium.slice(0, 2), ...nicheData.niche.slice(0, 2)].join(' ');

    const prompt = `You are a professional social media manager specializing in the ${niche} industry.
Write a compelling, authentic post for ${platform} about: "${topic}".
${brandContext ? `\n${brandContext}\n` : ''}
Requirements:
1. Hook the audience in the first sentence.
2. Include engaging body content with clear value.
3. End with a strong Call-To-Action (CTA).
4. Include 4-6 highly relevant hashtags specifically for ${niche}.
5. ${isAiTopic ? '' : 'CRITICAL REQUIREMENT: Do NOT include generic AI hashtags like #AI, #ArtificialIntelligence, or #MachineLearning unless the content is explicitly about AI technology.'}
${brandContext ? '6. Stay consistent with the business context above — voice, audience, pillars, and things to avoid all matter more than generic best practices.' : ''}
Keep the caption under character limits for ${platform}.
CRITICAL OUTPUT FORMAT: Reply with ONLY the finished caption text, exactly as it should be posted. Do not include a title or label like "Caption:" or "Caption for Instagram:". Do not use markdown formatting (no **, no #, no bullet points, no headers). Do not add any commentary, explanation, or visual/production suggestions before or after the caption. The very first character of your reply must be the first character of the caption itself.`;

    const result = await this.aiGateway.generate({ label: 'caption generation', maxTokens: 300, messages: [{ role: 'user', content: prompt }] });
    let text = result?.text ?? null;

    // Defensive cleanup regardless of which provider answered: models
    // routinely ignore the "no markdown / no header" instruction above and
    // prepend a literal "**Caption:**"/"Caption for Instagram & TikTok:"
    // label, or wrap the text in markdown bold/italic markers that would
    // otherwise show up as literal asterisks once posted. Confirmed in
    // production AiUsageLog rows from multiple providers (Groq and
    // Gemini), not just one model.
    if (text) {
      text = text
        .replace(/^\s*\*{0,2}caption[^:]*:\*{0,2}\s*/i, '') // leading "Caption:" / "**Caption for X:**" label
        .replace(/\*\*(.+?)\*\*/g, '$1') // markdown bold
        .replace(/(?<!\w)\*(?!\s)(.+?)(?<!\s)\*(?!\w)/g, '$1') // markdown italic
        .replace(/^#{1,6}\s+/gm, '') // markdown headers
        .trim();
      if (text.length === 0) text = null;
    }

    if (!text) {
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
  }

  /**
   * AI-generated hashtags specific to the actual topic and niche. Falls
   * back to the static niche map only when no provider is configured or
   * every provider fails.
   */
  async generateHashtags(topic: string = 'General', platform: string = 'Instagram', niche: string = 'Content Creator'): Promise<HashtagsResult> {
    const hashtagPrompt = `Generate hashtags for a ${platform} post about "${topic}" in the ${niche} niche.
Return strictly valid JSON, no markdown, no commentary, in this exact shape:
{"highVolume": ["#tag", ...5], "mediumCompetition": ["#tag", ...5], "nicheHashtags": ["#tag", ...5], "brandedHashtags": ["#tag", ...2]}
highVolume = broad, high-traffic tags. mediumCompetition = moderately specific tags. nicheHashtags = very specific to "${topic}". brandedHashtags = two short, on-brand tags for the ${niche} niche. All hashtags must start with # and contain no spaces.`;

    const parseHashtagJson = (raw: string | null): HashtagsResult | null => {
      if (!raw) return null;
      try {
        const cleaned = raw.trim().replace(/^```json\s*|```$/g, '').trim();
        const parsed = JSON.parse(cleaned);
        const highVolume: string[] = parsed.highVolume || [];
        const mediumCompetition: string[] = parsed.mediumCompetition || [];
        const nicheHashtags: string[] = parsed.nicheHashtags || [];
        const brandedHashtags: string[] = parsed.brandedHashtags || [];
        if (!highVolume.length && !mediumCompetition.length && !nicheHashtags.length) return null;
        return {
          highVolume,
          mediumCompetition,
          nicheHashtags,
          brandedHashtags,
          allHashtags: [...highVolume, ...mediumCompetition, ...nicheHashtags, ...brandedHashtags],
        };
      } catch {
        return null;
      }
    };

    const result = await this.aiGateway.generate({ label: 'hashtag generation', maxTokens: 300, messages: [{ role: 'user', content: hashtagPrompt }] });
    const parsed = parseHashtagJson(result?.text ?? null);
    if (parsed) return parsed;

    // Fallback: static niche defaults (used when no provider is configured or all fail).
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

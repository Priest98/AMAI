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

  private isGroqConfigured(): boolean {
    return !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'placeholder');
  }

  /**
   * Primary AI provider. Groq's free tier (14,400 requests/day, no card
   * required) dwarfs Gemini's free tier (20 requests/day/model) at this
   * app's actual upload volumes, so it's tried first for every AI call —
   * Gemini only gets reached if Groq is unconfigured, out of quota, or
   * errors. qwen/qwen3.6-27b is used for every call (not just a text
   * model) because it's multimodal, so the same model/endpoint handles
   * both the vision call (analyzeImage) and the pure-text calls
   * (caption/hashtags) without needing two different model IDs. Talks to
   * Groq's Chat Completions API (OpenAI-compatible shape) directly over
   * fetch, no SDK dependency. Returns null on any failure so callers can
   * fall through to the next provider rather than throwing.
   */
  private async callGroq(messages: unknown[], maxTokens: number, label: string): Promise<string | null> {
    if (!this.isGroqConfigured()) return null;

    try {
      // qwen3.6-27b is a "thinking" model — it spends tokens on a visible
      // <think>...</think> chain-of-thought block before its actual answer.
      // A tight budget (e.g. 30 tokens for a short vision caption) can get
      // entirely consumed by that reasoning, leaving nothing for the real
      // answer, so Groq calls always get a higher floor than the caller
      // asked for. The <think> block itself is still stripped below
      // regardless of budget, since it must never leak into a real caption.
      const groqMaxTokens = Math.max(maxTokens, 600);

      const response = await this.withTimeout(
        fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ model: 'qwen/qwen3.6-27b', messages, max_tokens: groqMaxTokens }),
        }),
        10_000,
        label,
      );

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        this.logger.warn(`${label} failed: ${response.status} ${errText}`);
        return null;
      }

      const data: any = await response.json();
      const rawText = data?.choices?.[0]?.message?.content?.trim();
      if (!rawText) return null;

      const cleaned = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      // An unclosed <think> tag means the response got cut off mid-reasoning
      // (budget exhausted before the real answer) -- unusable, so treat it
      // as a failure and let the caller fall through to the next provider
      // rather than shipping raw chain-of-thought text as a caption.
      if (cleaned.includes('<think>')) {
        this.logger.warn(`${label} returned truncated reasoning with no final answer, treating as failure`);
        return null;
      }
      return cleaned.length > 0 ? cleaned : null;
    } catch (error) {
      const message = error instanceof Error ? error.message : `Unknown ${label} error`;
      this.logger.warn(`${label} failed: ${message}`);
      return null;
    }
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
    const visionPrompt = 'Describe the main subject of this image in 3-8 words, suitable as a social media post topic. Just the phrase, no punctuation, no preamble.';
    const visionMessages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: visionPrompt },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ];

    // 1) Groq first — 14,400 free requests/day makes it the only provider
    // here that comfortably survives a large bulk-upload burst.
    const groqResult = await this.callGroq(visionMessages, 30, 'Groq vision analysis');
    if (groqResult) return groqResult;

    // 2) Gemini as the last resort before dropping to the filename
    // heuristic.
    if (this.isGeminiConfigured()) {
      try {
        const imageRes = await this.withTimeout(fetch(imageUrl), 8_000, 'Image download');
        if (imageRes.ok) {
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
                    { text: visionPrompt },
                    { inlineData: { mimeType, data: base64 } },
                  ],
                },
              ],
            }),
            10_000,
            'Gemini vision analysis',
          );

          const text = response.text?.trim();
          if (text && text.length > 0) return text;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown Gemini vision error';
        this.logger.warn(`Gemini image analysis failed, falling back to filename heuristic: ${message}`);
      }
    }

    return null;
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
Keep the caption under character limits for ${platform}.
CRITICAL OUTPUT FORMAT: Reply with ONLY the finished caption text, exactly as it should be posted. Do not include a title or label like "Caption:" or "Caption for Instagram:". Do not use markdown formatting (no **, no #, no bullet points, no headers). Do not add any commentary, explanation, or visual/production suggestions before or after the caption. The very first character of your reply must be the first character of the caption itself.`;

    // 1) Groq first — same free-tier headroom argument as analyzeImage.
    let text: string | null = await this.callGroq([{ role: 'user', content: prompt }], 300, 'Groq caption generation');

    // 2) Gemini as the last resort before the static template.
    if (!text && this.isGeminiConfigured()) {
      try {
        const response = await this.withTimeout(
          this.ai.models.generateContent({ model: 'gemini-flash-latest', contents: prompt }),
          10_000,
          'Gemini caption generation',
        );
        text = response.text?.trim() || null;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown Gemini error';
        this.logger.warn(`Gemini caption generation failed, falling back to static template: ${message}`);
      }
    }

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
   * back to the static niche map only when Gemini isn't configured or the
   * call fails — previously this always returned the same fixed list per
   * niche regardless of what was actually posted, which wasn't real
   * hashtag generation at all.
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

    // 1) Groq first.
    const groqRaw = await this.callGroq([{ role: 'user', content: hashtagPrompt }], 300, 'Groq hashtag generation');
    const groqResult = parseHashtagJson(groqRaw);
    if (groqResult) return groqResult;

    // 2) Gemini as the last resort before the static niche defaults.
    if (this.isGeminiConfigured()) {
      try {
        const response = await this.withTimeout(
          this.ai.models.generateContent({ model: 'gemini-flash-latest', contents: hashtagPrompt }),
          10_000,
          'Gemini hashtag generation',
        );
        const result = parseHashtagJson(response.text || null);
        if (result) return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown Gemini error';
        this.logger.warn(`Gemini hashtag generation failed, falling back to static niche defaults: ${message}`);
      }
    }

    // Fallback: static niche defaults (used when neither provider is configured or both fail).
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

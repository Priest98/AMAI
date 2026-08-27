import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MemoryEntryType } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import { EntitlementsService } from '../billing/entitlements.service';

export interface UpdateBusinessBrainDto {
  businessDescription?: string | null;
  targetAudience?: string | null;
  audienceAgeRange?: string | null;
  audienceLocation?: string | null;
  brandVoice?: string | null;
  brandPersonality?: string[];
  writingSamples?: string[];
  contentPillars?: string[];
  goals?: string[];
  competitiveContext?: string | null;
  competitorHandles?: string[];
  avoidTopics?: string[];
  bannedPhrases?: string[];
  websiteUrl?: string | null;
  hashtagCount?: number;
  useEmojis?: boolean;
  ctaStyle?: string | null;
}

/**
 * The Business Brain is the persistent business-context store every AI
 * feature reads before generating anything (captions, hashtags, strategy,
 * recommendations) instead of working from a bare "tone" string. See the
 * BusinessBrain/MemoryEntry models in schema.prisma for the full field
 * rationale.
 */
@Injectable()
export class BusinessBrainService {
  private readonly logger = new Logger(BusinessBrainService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly entitlementsService: EntitlementsService,
  ) {}

  /**
   * The four fields behind PlanEntitlements.businessBrainLevel: 'advanced'.
   * These are the deeper strategic/personalization inputs (competitive
   * positioning, business goals, and AI voice-learning from real past
   * posts) rather than the baseline "tell Oyinca about your business"
   * fields every plan needs for on-brand content generation to work at
   * all -- gating those away from Free would make Free's core value prop
   * (AI content creation) actively worse, which is exactly what spec #19
   * warns against. This split is the real thing behind an otherwise inert
   * config flag.
   */
  private static readonly ADVANCED_ONLY_FIELDS: (keyof UpdateBusinessBrainDto)[] = [
    'writingSamples',
    'goals',
    'competitiveContext',
    'competitorHandles',
  ];

  /** Lazily creates an empty brain on first access — no backfill migration needed. */
  async getOrCreate(brandId: string) {
    const existing = await this.prisma.businessBrain.findUnique({ where: { brandId } });
    if (existing) return existing;

    this.logger.log(`Creating Business Brain for brand ${brandId}`);
    return this.prisma.businessBrain.create({ data: { brandId } });
  }

  /**
   * Free (businessBrainLevel: 'basic') can read and keep whatever advanced
   * fields it already has (e.g. set while on a since-lapsed Pro
   * subscription -- downgrading never deletes existing data, same
   * principle as Agency's maxBrands), but can't submit new edits to them.
   * Silently dropped rather than rejecting the whole request: a single
   * Settings "Save changes" click can legitimately mix basic and advanced
   * fields in one PATCH, and a stale/locked field shouldn't block the
   * plan's core (basic) fields from saving.
   */
  async update(brandId: string, dto: UpdateBusinessBrainDto) {
    const before = await this.getOrCreate(brandId);
    const entitlements = await this.entitlementsService.getEntitlementsForBrand(brandId);
    const effectiveDto = { ...dto };
    if (entitlements.businessBrainLevel !== 'advanced') {
      for (const field of BusinessBrainService.ADVANCED_ONLY_FIELDS) {
        delete effectiveDto[field];
      }
    }
    const updated = await this.prisma.businessBrain.update({
      where: { brandId },
      data: effectiveDto,
    });

    // Only re-summarize when writingSamples actually changed content --
    // comparing arrays by JSON string is a cheap, order-sensitive-but-fine
    // check here (a reorder is a real edit too, worth a fresh summary).
    // Fire-and-forget: this is a real LLM call, and the caller (Settings
    // "Save changes") shouldn't have to wait on it -- buildPromptContext
    // just keeps using whatever voiceSummary already exists until this
    // finishes, same "eventually consistent" pattern as everything else
    // AI-derived in this brain.
    if (effectiveDto.writingSamples && JSON.stringify(effectiveDto.writingSamples) !== JSON.stringify(before.writingSamples)) {
      this.resummarizeVoice(brandId, effectiveDto.writingSamples).catch((e) =>
        this.logger.error(`Voice summary generation failed for brand ${brandId}: ${e?.message || e}`),
      );
    }

    return updated;
  }

  private async resummarizeVoice(brandId: string, samples: string[]): Promise<void> {
    const summary = await this.aiService.summarizeWritingVoice(samples, brandId, 'amai_engine');
    if (!summary) return;
    await this.prisma.businessBrain.update({
      where: { brandId },
      data: { voiceSummary: summary, voiceSummaryUpdatedAt: new Date() },
    });
  }

  /**
   * Builds a compact prompt-ready context block from the brain's explicit
   * knowledge (and, once populated, its learned insights). Returns an empty
   * string if nothing has been set yet, so callers can safely always append
   * this to a prompt without special-casing "no brain configured".
   */
  async buildPromptContext(brandId: string): Promise<string> {
    const brain = await this.prisma.businessBrain.findUnique({ where: { brandId } });
    if (!brain) return '';

    const lines: string[] = [];
    if (brain.businessDescription) lines.push(`Business: ${brain.businessDescription}`);
    if (brain.websiteUrl) lines.push(`Business website: ${brain.websiteUrl} (context only -- do not invent specific claims, prices, or details you weren't given elsewhere in this context)`);

    if (brain.targetAudience || brain.audienceAgeRange || brain.audienceLocation) {
      const audienceParts = [brain.targetAudience, brain.audienceAgeRange && `ages ${brain.audienceAgeRange}`, brain.audienceLocation].filter(Boolean);
      lines.push(`Target audience: ${audienceParts.join(', ')}`);
    }

    if (brain.brandVoice) lines.push(`Brand voice: ${brain.brandVoice}`);
    if (brain.brandPersonality.length) lines.push(`Brand personality: ${brain.brandPersonality.join(', ')}`);
    // Deliberately NOT injecting brain.writingSamples raw here -- see
    // voiceSummary's schema comment. This is the summarized, compact
    // version of those same samples (see resummarizeVoice), regenerated
    // once per edit instead of resent in full on every single generation.
    if (brain.voiceSummary) lines.push(`Writing voice profile (derived from this business's own real past posts):\n${brain.voiceSummary}`);

    if (brain.contentPillars.length) lines.push(`Core content pillars to draw from: ${brain.contentPillars.join(', ')}`);
    if (brain.goals.length) lines.push(`Current goals: ${brain.goals.join(', ')}`);
    if (brain.competitiveContext) lines.push(`Competitive context: ${brain.competitiveContext}`);
    if (brain.competitorHandles.length) lines.push(`Known competitors (do not mention them by name unless the topic is explicitly a comparison): ${brain.competitorHandles.join(', ')}`);
    if (brain.avoidTopics.length) lines.push(`Never mention or reference these topics: ${brain.avoidTopics.join(', ')}`);
    if (brain.bannedPhrases.length) lines.push(`Never use these specific words or phrases, under any circumstances: ${brain.bannedPhrases.join(', ')}`);

    const insights = brain.learnedInsights as unknown as { summary?: string } | null;
    if (insights?.summary) lines.push(`Learned from past performance: ${insights.summary}`);

    // The "one structural gap" the $1M ARR blueprint's audit flagged: without
    // this, every generation either stayed generic or risked inventing
    // specific products/prices/offers that don't exist. Kept compact (one
    // line per product) rather than dumping full feature/benefit/FAQ lists --
    // this is a pointer to real facts, not a product catalog dump.
    const products = await this.prisma.product.findMany({ where: { brandId, active: true }, orderBy: { createdAt: 'desc' } });
    if (products.length) {
      const productLines = products.map((p) => {
        const priceStr = p.price != null ? ` (${p.currency ? `${p.currency} ` : ''}${p.price})` : '';
        const detail = p.usp || p.description || '';
        return `${p.name}${priceStr}${detail ? ` -- ${detail}` : ''}`;
      });
      lines.push(
        `Real products/services this business actually offers (reference these specifically when relevant instead of inventing generic ones, and never invent a price, feature, or offer beyond what's listed here): ${productLines.join('; ')}`,
      );
    }

    // Generation preferences -- explicit overrides for things the caption
    // prompt otherwise hardcodes (see ai.service.ts generateCaption). Only
    // surfaced once the brain has *some* real content -- otherwise these
    // (hashtagCount/useEmojis always have a value, even unset) would make
    // this function never return '', breaking the "fill in your Business
    // Brain first" empty-state gate callers rely on (e.g. content-ideas).
    if (lines.length) {
      lines.push(`Use exactly ${brain.hashtagCount} hashtags in total (this overrides any other hashtag-count guidance).`);
      lines.push(brain.useEmojis ? 'Emojis are welcome where they fit naturally.' : 'Do not use any emojis.');
      if (brain.ctaStyle) lines.push(`Preferred call-to-action style: ${brain.ctaStyle}.`);
    }

    if (!lines.length) return '';
    return `Business context (use this to make the content specific and on-brand, not generic):\n${lines.map((l) => `- ${l}`).join('\n')}`;
  }

  /** Which content pillar (if any) a piece of content best matches, for tagging Posts. */
  pickBestPillar(pillars: string[], topic: string, caption: string): string | null {
    if (!pillars.length) return null;
    const haystack = `${topic} ${caption}`.toLowerCase();
    const scored = pillars
      .map((pillar) => {
        const words = pillar.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
        const hits = words.filter((w) => haystack.includes(w)).length;
        return { pillar, hits };
      })
      .sort((a, b) => b.hits - a.hits);
    return scored[0]?.hits > 0 ? scored[0].pillar : null;
  }

  // --- Oyinca Memory -------------------------------------------------------

  async listMemoryEntries(brandId: string, activeOnly = true) {
    return this.prisma.memoryEntry.findMany({
      where: { brandId, ...(activeOnly ? { active: true } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async recordMemory(
    brandId: string,
    entry: { type: MemoryEntryType; key: string; value: string; confidence?: number; sourcePostId?: string },
  ) {
    const brain = await this.getOrCreate(brandId);
    return this.prisma.memoryEntry.create({
      data: {
        brandId,
        brainId: brain.id,
        type: entry.type,
        key: entry.key,
        value: entry.value,
        confidence: entry.confidence ?? 0.5,
        sourcePostId: entry.sourcePostId,
      },
    });
  }

  /**
   * Scoped by (id AND brandId) -- V2 audit fix. The controller's
   * BrandAccessGuard only confirms the caller owns the :brandId in the
   * route; without this extra filter here, that valid brandId could still
   * be paired with another brand's memory entry id to silently dismiss
   * someone else's learned Business Brain data.
   */
  async dismissMemoryEntry(brandId: string, id: string) {
    const result = await this.prisma.memoryEntry.updateMany({ where: { id, brandId }, data: { active: false } });
    if (result.count === 0) {
      throw new NotFoundException('Memory entry not found for this brand.');
    }
    return this.prisma.memoryEntry.findUnique({ where: { id } });
  }
}

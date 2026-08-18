import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MemoryEntryType } from '@prisma/client';

export interface UpdateBusinessBrainDto {
  businessDescription?: string | null;
  targetAudience?: string | null;
  brandVoice?: string | null;
  brandPersonality?: string[];
  contentPillars?: string[];
  goals?: string[];
  competitiveContext?: string | null;
  avoidTopics?: string[];
  preferredLanguage?: string;
  websiteUrl?: string | null;
  brainSetupStep?: number;
  brainSetupCompleted?: boolean;
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

  constructor(private readonly prisma: PrismaService) {}

  /** Lazily creates an empty brain on first access — no backfill migration needed. */
  async getOrCreate(brandId: string) {
    const existing = await this.prisma.businessBrain.findUnique({ where: { brandId } });
    if (existing) return existing;

    this.logger.log(`Creating Business Brain for brand ${brandId}`);
    return this.prisma.businessBrain.create({ data: { brandId } });
  }

  async update(brandId: string, dto: UpdateBusinessBrainDto) {
    await this.getOrCreate(brandId);
    return this.prisma.businessBrain.update({
      where: { brandId },
      data: dto,
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
    if (brain.targetAudience) lines.push(`Target audience: ${brain.targetAudience}`);
    if (brain.brandVoice) lines.push(`Brand voice: ${brain.brandVoice}`);
    if (brain.brandPersonality.length) lines.push(`Brand personality: ${brain.brandPersonality.join(', ')}`);
    if (brain.contentPillars.length) lines.push(`Core content pillars to draw from: ${brain.contentPillars.join(', ')}`);
    if (brain.goals.length) lines.push(`Current goals: ${brain.goals.join(', ')}`);
    if (brain.competitiveContext) lines.push(`Competitive context: ${brain.competitiveContext}`);
    if (brain.avoidTopics.length) lines.push(`Never mention or reference: ${brain.avoidTopics.join(', ')}`);

    const insights = brain.learnedInsights as unknown as { summary?: string } | null;
    if (insights?.summary) lines.push(`Learned from past performance: ${insights.summary}`);

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

  // --- AMAI Memory -------------------------------------------------------

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

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MemoryEntryType } from '@prisma/client';

// How often a brand's insights get recomputed. Runs inside the same daily
// cron as metrics sync, but only actually does work for a brand once every
// this-many days -- a fresh performance snapshot every day doesn't mean the
// underlying pillar ranking should reshuffle every day too.
const LEARNING_INTERVAL_DAYS = 7;

// Sample-size gates -- see brief: "do not overreact to one viral or one
// poor post." A pillar needs a real number of published posts with
// performance data before it's allowed to move the needle, and there must
// be at least two pillars to compare, or "best" is meaningless.
const MIN_POSTS_PER_PILLAR = 3;
const MIN_PILLARS_TO_COMPARE = 2;
const PERFORMANCE_WINDOW_DAYS = 90;

/**
 * The other half of the flywheel MetricsService started: PostPerformance
 * now has real data, but nothing was reading it back into strategy.
 * BusinessBrain.learnedInsights/MemoryEntry have existed in the schema
 * since the Business Brain was first built, and buildPromptContext already
 * reads learnedInsights.summary on every single generation call -- this
 * service is the first thing that ever writes to either of them.
 *
 * Deliberately pure aggregation, no LLM call: every insight here is a
 * directly computed fact from this brand's own PostPerformance rows, not
 * something a model inferred or could hallucinate. Matches the brief's own
 * "every strategic insight should have an underlying data source" rule.
 */
@Injectable()
export class LearningService {
  private readonly logger = new Logger(LearningService.name);

  constructor(private readonly prisma: PrismaService) {}

  async runForAllBrands(): Promise<{ brandsProcessed: number; insightsWritten: number }> {
    const cutoff = new Date(Date.now() - LEARNING_INTERVAL_DAYS * 24 * 60 * 60 * 1000);
    const dueBrains = await this.prisma.businessBrain.findMany({
      where: { OR: [{ lastLearnedAt: null }, { lastLearnedAt: { lt: cutoff } }] },
      select: { id: true, brandId: true },
    });

    let brandsProcessed = 0;
    let insightsWritten = 0;

    for (const brain of dueBrains) {
      try {
        insightsWritten += await this.runForBrand(brain.brandId, brain.id);
        brandsProcessed++;
      } catch (e: any) {
        this.logger.error(`Learning pass failed for brand ${brain.brandId}: ${e?.message || e}`);
      }
    }

    return { brandsProcessed, insightsWritten };
  }

  private async runForBrand(brandId: string, brainId: string): Promise<number> {
    const windowStart = new Date(Date.now() - PERFORMANCE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const targets = await this.prisma.postTarget.findMany({
      where: { status: 'PUBLISHED', post: { brandId, publishedAt: { gte: windowStart } } },
      select: {
        post: { select: { contentPillar: true, contentCategory: true } },
        performanceSnapshots: { orderBy: { capturedAt: 'desc' }, take: 1 },
      },
    });

    type Group = { pillar: string; posts: number; totalViews: number; totalEngagement: number };
    const groups = new Map<string, Group>();

    for (const t of targets) {
      const snapshot = t.performanceSnapshots[0];
      if (!snapshot) continue; // published but no metrics synced yet -- not counted either way
      const pillar = t.post.contentPillar || t.post.contentCategory || 'Uncategorized';
      const g = groups.get(pillar) || { pillar, posts: 0, totalViews: 0, totalEngagement: 0 };
      g.posts++;
      g.totalViews += snapshot.views;
      g.totalEngagement += snapshot.likes + snapshot.comments + snapshot.shares;
      groups.set(pillar, g);
    }

    const eligible = Array.from(groups.values()).filter((g) => g.posts >= MIN_POSTS_PER_PILLAR);
    let insightsWritten = 0;

    if (eligible.length >= MIN_PILLARS_TO_COMPARE) {
      const withRate = eligible.map((g) => ({ ...g, engagementRate: g.totalViews > 0 ? g.totalEngagement / g.totalViews : 0 }));
      withRate.sort((a, b) => b.engagementRate - a.engagementRate);
      const best = withRate[0];
      const worst = withRate[withRate.length - 1];
      const overallRate = withRate.reduce((s, g) => s + g.engagementRate, 0) / withRate.length;

      // 20%/30% thresholds are a deliberately blunt confidence heuristic for
      // v1 -- enough to filter out noise from a near-even spread, not a
      // claim of statistical significance.
      if (overallRate > 0 && best.engagementRate >= overallRate * 1.2) {
        const multiplier = (best.engagementRate / overallRate).toFixed(1);
        await this.writeInsight(
          brandId,
          brainId,
          'top_performing_pillar',
          `"${best.pillar}" content averages ${multiplier}x this account's engagement rate (from ${best.posts} published posts in the last ${PERFORMANCE_WINDOW_DAYS} days).`,
        );
        insightsWritten++;
      }

      if (worst.pillar !== best.pillar && overallRate > 0 && worst.engagementRate <= overallRate * 0.7) {
        await this.writeInsight(
          brandId,
          brainId,
          'underperforming_pillar',
          `"${worst.pillar}" content is underperforming this account's average (from ${worst.posts} published posts in the last ${PERFORMANCE_WINDOW_DAYS} days) -- consider reducing its frequency in favor of what's working.`,
        );
        insightsWritten++;
      }
    }

    // Refresh the compact summary buildPromptContext reads from whatever
    // insights are currently active, not just what changed this run -- a
    // strong finding from a prior week shouldn't vanish just because this
    // week didn't produce a new one.
    await this.refreshSummary(brainId);
    await this.prisma.businessBrain.update({ where: { id: brainId }, data: { lastLearnedAt: new Date() } });

    return insightsWritten;
  }

  /** Supersedes any prior insight under the same key rather than piling up duplicates every week. */
  private async writeInsight(brandId: string, brainId: string, key: string, value: string): Promise<void> {
    await this.prisma.memoryEntry.updateMany({ where: { brainId, key, active: true }, data: { active: false } });
    await this.prisma.memoryEntry.create({
      data: { brandId, brainId, type: MemoryEntryType.PERFORMANCE_INSIGHT, key, value, confidence: 0.7 },
    });
  }

  private async refreshSummary(brainId: string): Promise<void> {
    const active = await this.prisma.memoryEntry.findMany({
      where: { brainId, active: true, type: MemoryEntryType.PERFORMANCE_INSIGHT },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });
    if (!active.length) return;

    await this.prisma.businessBrain.update({
      where: { id: brainId },
      data: { learnedInsights: { summary: active.map((m) => m.value).join(' ') } },
    });
  }
}

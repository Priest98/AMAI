import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EntitlementsService } from '../billing/entitlements.service';
import { toPublicConnection, needsAttention } from '../oauth/connection-health';
import { TargetStatus, UsageMetric } from '@prisma/client';

/**
 * Minimal multi-brand support for Agency. The Organization->Brand
 * relationship already existed for every plan (every signup creates one
 * Organization + one Brand) -- this just exposes a way to add more Brands
 * to an Organization, gated by the 'create_brand' entitlement so Free/Pro
 * orgs stay capped at one. A full client-workspace switcher UI is a
 * follow-up; see the Step 2 report for what's scaffolded vs. what remains.
 */
@Injectable()
export class BrandsService {
  private readonly logger = new Logger(BrandsService.name);

  constructor(
    private prisma: PrismaService,
    private entitlementsService: EntitlementsService,
  ) {}

  async listForOrganization(organizationId: string) {
    return this.prisma.brand.findMany({ where: { organizationId }, orderBy: { createdAt: 'asc' } });
  }

  async createForOrganization(organizationId: string, name: string) {
    const result = await this.entitlementsService.canCreateBrand(organizationId);
    if (!result.allowed) throw new BadRequestException(result.reason);

    return this.prisma.brand.create({ data: { organizationId, name } });
  }

  /**
   * Portfolio view for the Agency dashboard and Clients page.
   *
   * Every figure below is a real count from the database. Nothing is
   * synthesised: if an organization has no posts, the counts are genuinely
   * zero rather than seeded with plausible-looking numbers. Reach and
   * engagement are deliberately absent because Oyinca does not currently
   * ingest platform insights -- surfacing invented values there would be
   * worse than surfacing nothing.
   *
   * Social connections are mapped through toPublicConnection, so access and
   * refresh tokens are structurally incapable of reaching this response.
   */
  async getPortfolio(organizationId: string) {
    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const brands = await this.prisma.brand.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        industry: true,
        logo: true,
        updatedAt: true,
        amaiEngineConfig: { select: { approvalMode: true, state: true } },
        socialAccounts: {
          select: {
            id: true,
            platform: true,
            metadata: true,
            status: true,
            tokenExpiresAt: true,
            refreshToken: true,
          },
        },
      },
    });

    const brandIds = brands.map((b) => b.id);

    // One query for all three counts, tallied in memory.
    //
    // Prisma's groupBy would be the obvious choice, but its `having` mapped
    // type hits a known circular-reference error (TS2615) against this
    // schema. Rather than suppress the type or fan out into N queries per
    // client, this selects three scalar columns for the statuses we care
    // about and counts them here. The row set is bounded by the
    // organization's own scheduled/pending posts, and the projection is
    // narrow enough that this stays cheap.
    const relevantPosts = await this.prisma.post.findMany({
      where: {
        brandId: { in: brandIds },
        status: { in: ['SCHEDULED', 'NEEDS_APPROVAL'] },
      },
      select: { brandId: true, status: true, scheduledAt: true },
    });

    const tally = new Map<string, { scheduled: number; pending: number; today: number }>();
    for (const id of brandIds) tally.set(id, { scheduled: 0, pending: 0, today: 0 });

    for (const p of relevantPosts) {
      const t = tally.get(p.brandId);
      if (!t) continue;
      if (p.status === 'NEEDS_APPROVAL') {
        t.pending += 1;
      } else if (p.status === 'SCHEDULED') {
        t.scheduled += 1;
        if (p.scheduledAt && p.scheduledAt >= now && p.scheduledAt <= endOfToday) t.today += 1;
      }
    }

    const clients = brands.map((b) => {
      const connections = b.socialAccounts.map((a) => toPublicConnection(a, now));
      const issues = connections.filter((c) => needsAttention(c.health));
      const t = tally.get(b.id) ?? { scheduled: 0, pending: 0, today: 0 };

      return {
        id: b.id,
        name: b.name,
        industry: b.industry,
        logo: b.logo,
        lastActivityAt: b.updatedAt,
        autopilotState: b.amaiEngineConfig?.state ?? null,
        approvalMode: b.amaiEngineConfig?.approvalMode ?? null,
        connections,
        connectionIssueCount: issues.length,
        scheduledCount: t.scheduled,
        awaitingApprovalCount: t.pending,
        publishingTodayCount: t.today,
      };
    });

    return {
      clientCount: clients.length,
      totals: {
        scheduled: clients.reduce((n, c) => n + c.scheduledCount, 0),
        awaitingApproval: clients.reduce((n, c) => n + c.awaitingApprovalCount, 0),
        publishingToday: clients.reduce((n, c) => n + c.publishingTodayCount, 0),
        connectionIssues: clients.reduce((n, c) => n + c.connectionIssueCount, 0),
      },
      clients,
    };
  }

  /**
   * P1 agency team/roles foundation. The Role enum and OrganizationMember
   * model already existed (used today only inside guards and the
   * maxTeamMembers entitlement check) -- this is the first place that
   * actually surfaces them. Deliberately read-only: invite/edit/remove
   * would need real architecture of their own (invite tokens, email
   * delivery, permission-to-change-roles rules) that the master spec says
   * to prepare for, not necessarily fully implement yet.
   */
  async listMembers(organizationId: string) {
    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: { select: { id: true, email: true, fullName: true, avatar: true, lastLogin: true } },
      },
    });
    return members.map((m) => ({
      membershipId: m.id,
      role: m.role,
      memberSince: m.createdAt,
      userId: m.user.id,
      email: m.user.email,
      name: m.user.fullName || m.user.email.split('@')[0],
      avatar: m.user.avatar,
      lastLogin: m.user.lastLogin,
    }));
  }

  /** Brand ids belonging to this organization. The single place cross-client queries derive their scope, so no aggregation can read outside the org. */
  private async brandIdsFor(organizationId: string): Promise<string[]> {
    const rows = await this.prisma.brand.findMany({ where: { organizationId }, select: { id: true } });
    return rows.map((r) => r.id);
  }

  /**
   * Posts awaiting approval across every client, each tagged with the
   * client it belongs to so the reviewer always knows whose content they
   * are looking at. Ordering is oldest-first: the thing that has been
   * waiting longest is the thing most at risk of missing its slot.
   */
  async getAgencyApprovalQueue(organizationId: string) {
    const brandIds = await this.brandIdsFor(organizationId);

    const posts = await this.prisma.post.findMany({
      where: { brandId: { in: brandIds }, status: 'NEEDS_APPROVAL' },
      orderBy: { createdAt: 'asc' },
      take: 200,
      select: {
        id: true,
        caption: true,
        hashtags: true,
        scheduledAt: true,
        createdAt: true,
        brand: { select: { id: true, name: true } },
        targets: { select: { platform: true } },
        media: { select: { asset: { select: { blobUrl: true } } }, take: 1 },
      },
    });

    return {
      total: posts.length,
      posts: posts.map((p) => ({
        id: p.id,
        caption: p.caption,
        hashtags: p.hashtags,
        scheduledAt: p.scheduledAt,
        createdAt: p.createdAt,
        clientId: p.brand.id,
        clientName: p.brand.name,
        platforms: Array.from(new Set(p.targets.map((t) => t.platform))),
        thumbnailUrl: p.media[0]?.asset?.blobUrl || null,
      })),
    };
  }

  /**
   * Scheduled posts across the portfolio for a date window, tagged by
   * client so the calendar can colour/filter by client without a second
   * round trip per client.
   *
   * `days` is clamped so a crafted query can't ask for an unbounded range.
   */
  async getAgencyCalendar(organizationId: string, days = 30) {
    const window = Math.min(Math.max(days, 1), 90);
    const brandIds = await this.brandIdsFor(organizationId);

    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + window);

    const posts = await this.prisma.post.findMany({
      where: {
        brandId: { in: brandIds },
        status: { in: ['SCHEDULED', 'PUBLISHING', 'PUBLISHED'] },
        scheduledAt: { gte: from, lte: to },
      },
      orderBy: { scheduledAt: 'asc' },
      select: {
        id: true,
        status: true,
        scheduledAt: true,
        caption: true,
        brand: { select: { id: true, name: true } },
        targets: { select: { platform: true } },
      },
    });

    return {
      from,
      to,
      posts: posts.map((p) => ({
        id: p.id,
        status: p.status,
        scheduledAt: p.scheduledAt,
        caption: p.caption,
        clientId: p.brand.id,
        clientName: p.brand.name,
        platforms: Array.from(new Set(p.targets.map((t) => t.platform))),
      })),
    };
  }

  /**
   * Portfolio analytics.
   *
   * Mostly *publishing* metrics (counts of what Oyinca did), plus one real
   * *performance* metric: totalEngagement, sourced from the same
   * PostPerformance snapshots MetricsService.syncTikTokMetrics writes (see
   * PostsService.getContentIntelligence for the single-brand version of
   * this same computation). Oyinca still does not ingest reach,
   * impressions, or follower-growth data from Instagram/TikTok -- those
   * stay in unavailableMetrics rather than being invented. Agency-only:
   * this is the one place a rollup across a whole client portfolio exists
   * at all, since a single-brand Pro plan has no "portfolio" to roll up.
   */
  async getAgencyAnalytics(organizationId: string, days = 30) {
    const window = Math.min(Math.max(days, 1), 365);
    const brandIds = await this.brandIdsFor(organizationId);

    const since = new Date();
    since.setDate(since.getDate() - window);

    const brands = await this.prisma.brand.findMany({
      where: { organizationId },
      select: { id: true, name: true },
      orderBy: { createdAt: 'asc' },
    });

    const rows = await this.prisma.post.findMany({
      where: {
        brandId: { in: brandIds },
        status: { in: ['PUBLISHED', 'FAILED', 'SCHEDULED', 'NEEDS_APPROVAL'] },
        createdAt: { gte: since },
      },
      select: {
        brandId: true,
        status: true,
        // Only populated for PUBLISHED posts with a real synced snapshot --
        // an unpublished post has no targets matching this filter, so this
        // is a cheap no-op for the other three statuses, not a wasted join.
        targets: {
          where: { status: TargetStatus.PUBLISHED, providerPostId: { not: null } },
          select: { performanceSnapshots: { orderBy: { capturedAt: 'desc' }, take: 1 } },
        },
      },
    });

    const engagementOf = (row: (typeof rows)[number]): number =>
      row.targets.reduce((sum, t) => {
        const snap = t.performanceSnapshots[0];
        if (!snap) return sum;
        return sum + snap.views + snap.likes + snap.comments + snap.shares;
      }, 0);

    const perClient = brands.map((b) => {
      const mine = rows.filter((r) => r.brandId === b.id);
      return {
        clientId: b.id,
        clientName: b.name,
        published: mine.filter((r) => r.status === 'PUBLISHED').length,
        failed: mine.filter((r) => r.status === 'FAILED').length,
        scheduled: mine.filter((r) => r.status === 'SCHEDULED').length,
        awaitingApproval: mine.filter((r) => r.status === 'NEEDS_APPROVAL').length,
        totalEngagement: mine.reduce((sum, r) => sum + engagementOf(r), 0),
      };
    });

    return {
      windowDays: window,
      since,
      totals: {
        published: perClient.reduce((n, c) => n + c.published, 0),
        failed: perClient.reduce((n, c) => n + c.failed, 0),
        scheduled: perClient.reduce((n, c) => n + c.scheduled, 0),
        awaitingApproval: perClient.reduce((n, c) => n + c.awaitingApproval, 0),
        totalEngagement: perClient.reduce((n, c) => n + c.totalEngagement, 0),
        clients: brands.length,
      },
      // Explicitly declared so the UI can say "not available yet" instead of
      // rendering a zero that looks like real measured performance.
      unavailableMetrics: ['reach', 'impressions', 'followerGrowth'],
      perClient,
    };
  }

  /**
   * Creator Command Center: the two-account overview for PlanTier.CREATOR
   * (see CreatorEntitlementGuard). Deliberately smaller than
   * getAgencyAnalytics -- no per-status breakdown, no approval-queue/calendar
   * rollups, because Creator isn't Agency-with-a-lower-price; it's meant to
   * feel like "one person watching two accounts", not a scaled-down client
   * management console. Reuses the same real-data-only engagement math as
   * getAgencyAnalytics (same PostPerformance snapshots, same
   * views+likes+comments+shares sum) so the two surfaces can never disagree
   * about what "engagement" means.
   *
   * crossAccountRecommendation only ever names a real, computed winner: it
   * requires both accounts to have at least MIN_SAMPLE_SIZE published,
   * measured posts before comparing them at all, and says so explicitly
   * when that bar isn't met yet rather than guessing from a handful of
   * posts (same minimum-sample-size discipline as
   * PostsService.getContentIntelligence).
   */
  async getCreatorOverview(organizationId: string, days = 30) {
    const MIN_SAMPLE_SIZE = 3;
    const window = Math.min(Math.max(days, 1), 365);
    const since = new Date();
    since.setDate(since.getDate() - window);
    const now = new Date();

    const [brands, postUsage] = await Promise.all([
      this.prisma.brand.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          name: true,
          industry: true,
          logo: true,
          socialAccounts: {
            select: { id: true, platform: true, metadata: true, status: true, tokenExpiresAt: true, refreshToken: true },
          },
        },
      }),
      this.entitlementsService.checkUsage(organizationId, UsageMetric.POST_PUBLISHED),
    ]);

    const brandIds = brands.map((b) => b.id);

    const rows = await this.prisma.post.findMany({
      where: { brandId: { in: brandIds }, status: 'PUBLISHED', publishedAt: { gte: since } },
      select: {
        brandId: true,
        targets: {
          where: { status: TargetStatus.PUBLISHED, providerPostId: { not: null } },
          select: { performanceSnapshots: { orderBy: { capturedAt: 'desc' }, take: 1 } },
        },
      },
    });

    const engagementOf = (row: (typeof rows)[number]): number =>
      row.targets.reduce((sum, t) => {
        const snap = t.performanceSnapshots[0];
        if (!snap) return sum;
        return sum + snap.views + snap.likes + snap.comments + snap.shares;
      }, 0);

    const accounts = brands.map((b) => {
      const connections = b.socialAccounts.map((a) => toPublicConnection(a, now));
      const mine = rows.filter((r) => r.brandId === b.id);
      const measured = mine.filter((r) => r.targets.some((t) => t.performanceSnapshots[0]));
      return {
        brandId: b.id,
        name: b.name,
        industry: b.industry,
        logo: b.logo,
        connections,
        connectionIssueCount: connections.filter((c) => needsAttention(c.health)).length,
        publishedCount: mine.length,
        measuredCount: measured.length,
        totalEngagement: mine.reduce((sum, r) => sum + engagementOf(r), 0),
      };
    });

    let crossAccountRecommendation: string | null = null;
    if (accounts.length === 2) {
      const [a, b] = accounts;
      if (a.measuredCount >= MIN_SAMPLE_SIZE && b.measuredCount >= MIN_SAMPLE_SIZE) {
        const aAvg = a.totalEngagement / a.measuredCount;
        const bAvg = b.totalEngagement / b.measuredCount;
        if (aAvg !== bAvg) {
          const [leader, laggard] = aAvg > bAvg ? [a, b] : [b, a];
          const leaderAvg = aAvg > bAvg ? aAvg : bAvg;
          const laggardAvg = aAvg > bAvg ? bAvg : aAvg;
          const delta = laggardAvg > 0 ? Math.round(((leaderAvg - laggardAvg) / laggardAvg) * 100) : null;
          crossAccountRecommendation = delta && delta > 0
            ? `${leader.name} is averaging ${delta}% more engagement per post than ${laggard.name} over the last ${window} days. Worth carrying over whatever's working there.`
            : `${leader.name} is currently out-performing ${laggard.name} on engagement per post over the last ${window} days.`;
        } else {
          crossAccountRecommendation = `${a.name} and ${b.name} are performing about the same over the last ${window} days.`;
        }
      } else {
        crossAccountRecommendation = null;
      }
    }

    return {
      windowDays: window,
      since,
      accounts,
      usage: {
        posts: { used: postUsage.used, limit: postUsage.limit, remaining: postUsage.limit === -1 ? -1 : Math.max(0, postUsage.limit - postUsage.used) },
      },
      crossAccountRecommendation,
      hasEnoughDataForComparison: accounts.length === 2 && accounts.every((a) => a.measuredCount >= MIN_SAMPLE_SIZE),
      unavailableMetrics: ['reach', 'impressions', 'followerGrowth'],
    };
  }

  /**
   * Internal cost-visibility foundation: "what does this customer actually
   * cost Oyinca" -- AI calls/tokens, vision calls, storage, uploads, and
   * publishing calls, all real counts for a real window. Not shown to
   * customers; this is for Oyinca's own operating visibility.
   *
   * AiUsageLog.tokensUsed is genuine provider-reported usage (Groq's
   * usage.total_tokens / Gemini's usageMetadata.totalTokenCount) as of this
   * change -- it used to be a hardcoded 120 on every row, which would have
   * made this entire endpoint fabricated by construction. Storage is the
   * sum of MediaAsset.sizeBytes for assets still holding a blobUrl (once a
   * post publishes, the blob is deleted and sizeBytes on that row no longer
   * reflects real storage cost, so it's excluded). Publishing calls are
   * counted from PublishingLog, which has exactly one row per real attempt
   * against a platform API (see PublishingService.publishOne).
   */
  async getCostSummary(organizationId: string, days = 30) {
    const window = Math.min(Math.max(days, 1), 365);
    const brandIds = await this.brandIdsFor(organizationId);
    const since = new Date();
    since.setDate(since.getDate() - window);

    const [aiCalls, aiTokens, visionCalls, storageBytes, uploadsInWindow, publishAttempts, publishFailures] = await Promise.all([
      this.prisma.aiUsageLog.count({ where: { brandId: { in: brandIds }, createdAt: { gte: since } } }),
      this.prisma.aiUsageLog.aggregate({
        where: { brandId: { in: brandIds }, createdAt: { gte: since } },
        _sum: { tokensUsed: true },
      }),
      this.prisma.aiUsageLog.count({
        where: { brandId: { in: brandIds }, createdAt: { gte: since }, prompt: { startsWith: '[vision]' } },
      }),
      this.prisma.mediaAsset.aggregate({
        where: { brandId: { in: brandIds }, blobUrl: { not: null } },
        _sum: { sizeBytes: true },
      }),
      this.prisma.mediaAsset.count({ where: { brandId: { in: brandIds }, createdAt: { gte: since } } }),
      this.prisma.publishingLog.count({
        where: { postTarget: { post: { brandId: { in: brandIds } } }, createdAt: { gte: since } },
      }),
      this.prisma.publishingLog.count({
        where: { postTarget: { post: { brandId: { in: brandIds } } }, createdAt: { gte: since }, status: 'FAILED' },
      }),
    ]);

    return {
      windowDays: window,
      since,
      ai: {
        calls: aiCalls,
        visionCalls,
        totalTokens: aiTokens._sum.tokensUsed ?? 0,
      },
      storage: {
        currentBytes: storageBytes._sum.sizeBytes ?? 0,
        uploadsInWindow,
      },
      publishing: {
        attemptsInWindow: publishAttempts,
        failuresInWindow: publishFailures,
      },
    };
  }
}

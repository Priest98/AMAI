import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EntitlementsService } from '../billing/entitlements.service';
import { toPublicConnection, needsAttention } from '../oauth/connection-health';

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
   * engagement are deliberately absent because AMAI does not currently
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
   * IMPORTANT: these are *publishing* metrics (counts of what AMAI did),
   * not *performance* metrics. AMAI does not currently ingest reach,
   * impressions, engagement or follower data from Instagram/TikTok, so
   * those are reported as unavailable rather than invented. Anything
   * returned here is a real row count.
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
      select: { brandId: true, status: true },
    });

    const perClient = brands.map((b) => {
      const mine = rows.filter((r) => r.brandId === b.id);
      return {
        clientId: b.id,
        clientName: b.name,
        published: mine.filter((r) => r.status === 'PUBLISHED').length,
        failed: mine.filter((r) => r.status === 'FAILED').length,
        scheduled: mine.filter((r) => r.status === 'SCHEDULED').length,
        awaitingApproval: mine.filter((r) => r.status === 'NEEDS_APPROVAL').length,
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
        clients: brands.length,
      },
      // Explicitly declared so the UI can say "not available yet" instead of
      // rendering a zero that looks like real measured performance.
      unavailableMetrics: ['reach', 'impressions', 'engagement', 'followerGrowth'],
      perClient,
    };
  }
}

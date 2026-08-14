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
}

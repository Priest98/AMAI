import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PostStatus, PlanTier, SubscriptionStatus, ConnectionStatus } from '@prisma/client';
import { PLAN_PRICING, SupportedCurrency, SUPPORTED_CURRENCIES } from '../billing/plans.config';

/**
 * Cross-organization operating view for Oyinca's own team -- explicitly not
 * customer-facing (see PlatformAdminGuard). Every figure here is a real
 * query; anything Oyinca genuinely doesn't track yet (a unified application
 * error log, for one) is reported as unavailable rather than invented.
 */
@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getOverview() {
    const [
      usersByPlanRows,
      failedPostsTotal,
      failedPostsLast7d,
      publishedLast7d,
      aiKeyHealthRows,
      connectionsNeedingReauthCount,
      totalOrganizations,
      totalBrands,
    ] = await Promise.all([
      this.prisma.subscription.findMany({
        where: { status: SubscriptionStatus.ACTIVE },
        select: { plan: true, currency: true },
      }),
      this.prisma.post.count({ where: { status: PostStatus.FAILED } }),
      this.prisma.post.count({
        where: { status: PostStatus.FAILED, updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
      this.prisma.post.count({
        where: { status: PostStatus.PUBLISHED, publishedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
      this.prisma.aiProviderKeyHealth.findMany({
        select: { provider: true, keyLabel: true, totalRequests: true, totalErrors: true, disabledUntil: true },
      }),
      this.prisma.socialAccount.count({ where: { status: ConnectionStatus.EXPIRED } }),
      this.prisma.organization.count(),
      this.prisma.brand.count(),
    ]);

    // Users by plan: tallied in memory rather than Prisma groupBy (known
    // TS2615 circular-reference issue against this schema elsewhere in the
    // app -- same workaround used in brands.service.ts).
    const usersByPlan: Record<PlanTier, number> = { FREE: 0, PRO: 0, CREATOR: 0, AGENCY: 0 };
    for (const row of usersByPlanRows) usersByPlan[row.plan] += 1;

    // MRR estimate: Subscription doesn't store the exact amount actually
    // billed (new-user discount vs. regular price, provider-side
    // proration, etc.) -- only the plan tier and currency. So this is
    // explicitly an ESTIMATE off PLAN_PRICING's list price, not a verified
    // billed total from the payment provider. Kept per-currency rather
    // than summed, since adding USD+GBP+NGN together would be meaningless.
    const mrrEstimateByCurrency: Record<SupportedCurrency, number> = { USD: 0, GBP: 0, NGN: 0 };
    for (const row of usersByPlanRows) {
      if (row.plan === PlanTier.FREE) continue;
      const currency = SUPPORTED_CURRENCIES.includes(row.currency as SupportedCurrency)
        ? (row.currency as SupportedCurrency)
        : 'USD';
      const price = PLAN_PRICING[row.plan][currency].regularMonthly;
      if (price) mrrEstimateByCurrency[currency] += price;
    }

    const aiKeysDisabledNow = aiKeyHealthRows.filter((k) => k.disabledUntil && k.disabledUntil > new Date()).length;
    const aiTotalRequests = aiKeyHealthRows.reduce((n, k) => n + k.totalRequests, 0);
    const aiTotalErrors = aiKeyHealthRows.reduce((n, k) => n + k.totalErrors, 0);

    return {
      generatedAt: new Date(),
      accounts: {
        totalOrganizations,
        totalBrands,
        usersByPlan,
      },
      revenue: {
        mrrEstimateByCurrency,
        note: 'Estimate from plan list price x active subscriptions per currency -- not a verified total from the payment provider.',
      },
      posts: {
        failedTotal: failedPostsTotal,
        failedLast7d: failedPostsLast7d,
        publishedLast7d,
      },
      apiHealth: {
        aiProviderRequestsAllTime: aiTotalRequests,
        aiProviderErrorsAllTime: aiTotalErrors,
        aiKeysCurrentlyDisabled: aiKeysDisabledNow,
        connectionsExpired: connectionsNeedingReauthCount,
        // Honest gap: there's no unified application-error log table today,
        // so a generic "API errors" count would have to be invented.
        unavailable: ['unified application error log (4xx/5xx by endpoint)'],
      },
      systemHealth: {
        status: aiKeysDisabledNow > 0 || failedPostsLast7d > publishedLast7d
          ? 'degraded' as const
          : 'ok' as const,
      },
    };
  }
}

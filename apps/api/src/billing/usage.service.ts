import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsageMetric } from '@prisma/client';

export interface UsagePeriod {
  start: Date;
  end: Date;
}

/**
 * Metered usage (AI generations, posts published) for an Organization.
 *
 * Period choice: calendar month (1st 00:00 UTC to the next 1st), for every
 * plan including paid ones. Simpler alternative would be aligning to each
 * paid subscription's actual currentPeriodStart/End, but that drifts once
 * upgrades/downgrades/proration are involved and doesn't exist at all for
 * Free orgs -- calendar month is a single rule that works identically for
 * every plan and is easy for a user to reason about ("resets on the 1st").
 * Documented here since #16 in the spec calls this out as a decision that
 * needs to be explicit.
 */
@Injectable()
export class UsageService {
  constructor(private prisma: PrismaService) {}

  getCurrentPeriod(): UsagePeriod {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
    return { start, end };
  }

  async getUsage(organizationId: string, metric: UsageMetric): Promise<number> {
    const { start } = this.getCurrentPeriod();
    const record = await this.prisma.usageRecord.findUnique({
      where: { organizationId_metric_periodStart: { organizationId, metric, periodStart: start } },
    });
    return record?.count ?? 0;
  }

  async getAllUsage(organizationId: string): Promise<Record<UsageMetric, number>> {
    const { start } = this.getCurrentPeriod();
    const records = await this.prisma.usageRecord.findMany({
      where: { organizationId, periodStart: start },
    });
    const result = { AI_GENERATION: 0, POST_PUBLISHED: 0 } as Record<UsageMetric, number>;
    for (const r of records) result[r.metric] = r.count;
    return result;
  }

  /** Atomically increments this period's counter, creating the row on first use. */
  async increment(organizationId: string, metric: UsageMetric, subscriptionId?: string | null): Promise<void> {
    const { start, end } = this.getCurrentPeriod();
    await this.prisma.usageRecord.upsert({
      where: { organizationId_metric_periodStart: { organizationId, metric, periodStart: start } },
      create: { organizationId, metric, periodStart: start, periodEnd: end, count: 1, subscriptionId: subscriptionId || undefined },
      update: { count: { increment: 1 } },
    });
  }
}

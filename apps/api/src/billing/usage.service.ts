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

  /**
   * Race-condition fix: EntitlementsService.reservePostSlot used to check
   * usage (read) and then increment (write) as two separate round trips --
   * two concurrent publish requests could both read "149 of 150 used" and
   * both proceed, letting a Pro org land on 151. This does the check and
   * the increment as ONE atomic statement, so Postgres itself serializes
   * concurrent callers instead of relying on the application to.
   *
   * `INSERT ... ON CONFLICT DO UPDATE ... WHERE count < limit RETURNING`
   * is the standard Postgres idiom for "increment only if still under a
   * ceiling": on first use this period there's no conflict, so the INSERT
   * always succeeds (a fresh org is never already over a limit >= 1). On
   * every later call, the UPDATE only applies -- and only then does
   * RETURNING produce a row -- if the WHERE condition still holds at the
   * instant Postgres evaluates it under the row's lock; a concurrent
   * caller that already pushed count to the limit makes this one return
   * zero rows, with no partial/lost update possible either way.
   *
   * limit === -1 (unlimited) skips the WHERE entirely -- still increments
   * atomically for accurate usage display, but can never be blocked.
   */
  async incrementIfUnderLimit(
    organizationId: string,
    metric: UsageMetric,
    limit: number,
    subscriptionId?: string | null,
  ): Promise<{ allowed: boolean; used: number }> {
    const { start, end } = this.getCurrentPeriod();

    const rows = limit === -1
      ? await this.prisma.$queryRaw<{ count: number }[]>`
          INSERT INTO "UsageRecord" ("id", "organizationId", "subscriptionId", "metric", "periodStart", "periodEnd", "count", "updatedAt")
          VALUES (gen_random_uuid()::text, ${organizationId}, ${subscriptionId ?? null}, ${metric}::"UsageMetric", ${start}, ${end}, 1, now())
          ON CONFLICT ("organizationId", "metric", "periodStart")
          DO UPDATE SET "count" = "UsageRecord"."count" + 1, "updatedAt" = now()
          RETURNING "count"
        `
      : await this.prisma.$queryRaw<{ count: number }[]>`
          INSERT INTO "UsageRecord" ("id", "organizationId", "subscriptionId", "metric", "periodStart", "periodEnd", "count", "updatedAt")
          VALUES (gen_random_uuid()::text, ${organizationId}, ${subscriptionId ?? null}, ${metric}::"UsageMetric", ${start}, ${end}, 1, now())
          ON CONFLICT ("organizationId", "metric", "periodStart")
          DO UPDATE SET "count" = "UsageRecord"."count" + 1, "updatedAt" = now()
          WHERE "UsageRecord"."count" < ${limit}
          RETURNING "count"
        `;

    if (rows.length > 0) {
      return { allowed: true, used: rows[0].count };
    }
    // Blocked -- this read is purely for the error message's "X / Y used"
    // display, not part of the race-critical decision (that already
    // happened, correctly, inside the atomic statement above).
    const current = await this.getUsage(organizationId, metric);
    return { allowed: false, used: current };
  }

  /**
   * Refunds one unit reserved by incrementIfUnderLimit() when the work it
   * was guarding then fails (e.g. a reserved AI-generation slot where the
   * actual AI call errors out afterward) -- a rejected/failed attempt
   * shouldn't permanently burn quota. Floors at 0 via the `count > 0` guard
   * so a decrement that races a period rollover (rare: this period's row
   * genuinely reaches 0, or doesn't exist yet) is a safe no-op instead of
   * going negative.
   */
  async decrement(organizationId: string, metric: UsageMetric): Promise<void> {
    const { start } = this.getCurrentPeriod();
    await this.prisma.usageRecord.updateMany({
      where: { organizationId, metric, periodStart: start, count: { gt: 0 } },
      data: { count: { decrement: 1 } },
    });
  }
}

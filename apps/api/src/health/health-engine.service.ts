import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../common/telegram.service';
import { getAppUrl } from '../common/app-url.util';
import { redactSecrets } from '../common/redact';
import { deriveConnectionHealth, needsAttention } from '../oauth/connection-health';
import {
  ErrorSeverity,
  HealthStatus,
  IncidentSource,
  IncidentStatus,
  Platform,
  PostStatus,
  EngineState,
} from '@prisma/client';

export interface CheckResult {
  subsystem: string;
  status: HealthStatus;
  responseTimeMs: number;
  message: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Oyinca's proactive Health Engine: the piece the 24/7 monitoring spec calls
 * for that finds problems BEFORE a customer request throws, rather than
 * waiting for ErrorCaptureService to see an exception. Deliberately built
 * as a set of plain async methods invoked from an HTTP cron endpoint
 * (see cron/cron.controller.ts's health-check route) rather than a
 * long-running process -- Vercel serverless functions don't stay alive
 * between requests, so there is no "always-on" option here; "continuous"
 * in this codebase means "checked on a schedule via CRON_SECRET-guarded
 * HTTP hits", the same pattern publish-due/sync-drive already use.
 *
 * Every check is read-only against real application state (no synthetic
 * writes against customer data, no calls that could publish/charge/send
 * anything) and reuses existing infra instead of re-implementing it:
 *   - AI provider health reads AiProviderKeyHealth (already maintained by
 *     the AI Layer's key manager) rather than making live test calls that
 *     would burn quota just to prove a provider is up.
 *   - Instagram/TikTok connection health reuses deriveConnectionHealth(),
 *     the same function apps/api/src/queue/publishing.service.ts already
 *     uses to decide if an account needs reauth.
 *   - Failures are raised as incidents through the exact same ErrorGroup
 *     table + dedup-by-signature approach ErrorCaptureService uses for
 *     reactive exceptions -- there is one incident store, not two.
 */
@Injectable()
export class HealthEngineService {
  private readonly logger = new Logger(HealthEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
  ) {}

  async runAll(): Promise<CheckResult[]> {
    const checks = [
      this.checkDatabase(),
      this.checkAiProviders(),
      this.checkSocialConnections(Platform.INSTAGRAM),
      this.checkSocialConnections(Platform.TIKTOK),
      this.checkScheduler(),
      this.checkAutoPilot(),
    ];

    const results = await Promise.all(checks);

    for (const result of results) {
      await this.persistAndRaise(result);
    }

    // Heartbeat: proof-of-life for the engine itself, read by the daily
    // report / a future watchdog cron to detect "the health engine stopped
    // being triggered at all" (Phase 17). Kept as an ordinary
    // HealthCheckResult row (subsystem: 'health_engine') rather than a new
    // table -- one history table for every proactive check, heartbeat
    // included.
    await this.prisma.healthCheckResult.create({
      data: { subsystem: 'health_engine', status: HealthStatus.OK, responseTimeMs: 0, message: 'heartbeat' },
    });

    return results;
  }

  // ------------------------------------------------------------------
  // Individual checks
  // ------------------------------------------------------------------

  async checkDatabase(): Promise<CheckResult> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const ms = Date.now() - start;
      const degradedAt = Number(process.env.HEALTH_DB_DEGRADED_MS || 1000);
      return {
        subsystem: 'database',
        status: ms >= degradedAt ? HealthStatus.DEGRADED : HealthStatus.OK,
        responseTimeMs: ms,
        message: `SELECT 1 in ${ms}ms`,
      };
    } catch (err) {
      return {
        subsystem: 'database',
        status: HealthStatus.DOWN,
        responseTimeMs: Date.now() - start,
        message: 'Database connectivity check failed',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async checkAiProviders(): Promise<CheckResult> {
    const start = Date.now();
    try {
      const keys = await this.prisma.aiProviderKeyHealth.findMany();
      const ms = Date.now() - start;

      if (keys.length === 0) {
        return { subsystem: 'ai', status: HealthStatus.OK, responseTimeMs: ms, message: 'No AI provider usage recorded yet.' };
      }

      const now = new Date();
      const byProvider = new Map<string, typeof keys>();
      for (const k of keys) {
        byProvider.set(k.provider, [...(byProvider.get(k.provider) || []), k]);
      }

      let downProviders = 0;
      let degradedProviders = 0;
      for (const [, providerKeys] of byProvider) {
        const allDisabled = providerKeys.every((k) => k.disabledUntil && k.disabledUntil > now);
        const anyDisabled = providerKeys.some((k) => k.disabledUntil && k.disabledUntil > now);
        if (allDisabled) downProviders++;
        else if (anyDisabled) degradedProviders++;
      }

      const totalProviders = byProvider.size;
      const status =
        downProviders === totalProviders ? HealthStatus.DOWN : downProviders > 0 || degradedProviders > 0 ? HealthStatus.DEGRADED : HealthStatus.OK;

      return {
        subsystem: 'ai',
        status,
        responseTimeMs: ms,
        message: `${totalProviders} provider(s) tracked, ${downProviders} fully disabled, ${degradedProviders} partially degraded.`,
        metadata: { totalProviders, downProviders, degradedProviders },
      };
    } catch (err) {
      return {
        subsystem: 'ai',
        status: HealthStatus.DOWN,
        responseTimeMs: Date.now() - start,
        message: 'Failed to read AI provider key health.',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async checkSocialConnections(platform: Platform): Promise<CheckResult> {
    const start = Date.now();
    const subsystem = platform === Platform.TIKTOK ? 'tiktok' : 'instagram';
    try {
      const accounts = await this.prisma.socialAccount.findMany({ where: { platform } });
      const ms = Date.now() - start;

      if (accounts.length === 0) {
        return { subsystem, status: HealthStatus.OK, responseTimeMs: ms, message: `No connected ${subsystem} accounts.` };
      }

      let needingAttention = 0;
      let reauthRequired = 0;
      for (const acc of accounts) {
        const h = deriveConnectionHealth(acc);
        if (needsAttention(h.health)) needingAttention++;
        if (h.health === 'REAUTH_REQUIRED') reauthRequired++;
      }

      const status =
        reauthRequired === accounts.length
          ? HealthStatus.DOWN
          : needingAttention > 0
            ? HealthStatus.DEGRADED
            : HealthStatus.OK;

      return {
        subsystem,
        status,
        responseTimeMs: ms,
        message: `${accounts.length} account(s), ${needingAttention} need attention, ${reauthRequired} need reauth.`,
        metadata: { total: accounts.length, needingAttention, reauthRequired },
      };
    } catch (err) {
      return {
        subsystem,
        status: HealthStatus.DOWN,
        responseTimeMs: Date.now() - start,
        message: `Failed to evaluate ${subsystem} connection health.`,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async checkScheduler(): Promise<CheckResult> {
    const start = Date.now();
    try {
      const graceMinutes = Number(process.env.HEALTH_SCHEDULER_GRACE_MINUTES || 15);
      const overdueCutoff = new Date(Date.now() - graceMinutes * 60 * 1000);

      const [overdueCount, oldestOverdue] = await Promise.all([
        this.prisma.post.count({ where: { status: PostStatus.SCHEDULED, scheduledAt: { lte: overdueCutoff } } }),
        this.prisma.post.findFirst({
          where: { status: PostStatus.SCHEDULED, scheduledAt: { lte: overdueCutoff } },
          orderBy: { scheduledAt: 'asc' },
          select: { scheduledAt: true },
        }),
      ]);

      const ms = Date.now() - start;
      const oldestAgeMinutes = oldestOverdue?.scheduledAt
        ? Math.round((Date.now() - oldestOverdue.scheduledAt.getTime()) / 60000)
        : 0;

      const downAfterMinutes = Number(process.env.HEALTH_SCHEDULER_DOWN_MINUTES || 120);
      const status =
        overdueCount > 0 && oldestAgeMinutes >= downAfterMinutes
          ? HealthStatus.DOWN
          : overdueCount > 0
            ? HealthStatus.DEGRADED
            : HealthStatus.OK;

      return {
        subsystem: 'scheduler',
        status,
        responseTimeMs: ms,
        message:
          overdueCount === 0
            ? 'No overdue scheduled posts.'
            : `${overdueCount} post(s) overdue, oldest ${oldestAgeMinutes}m past due -- publish-due cron may be failing or not running.`,
        metadata: { overdueCount, oldestAgeMinutes },
      };
    } catch (err) {
      return {
        subsystem: 'scheduler',
        status: HealthStatus.DOWN,
        responseTimeMs: Date.now() - start,
        message: 'Failed to evaluate scheduler backlog.',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async checkAutoPilot(): Promise<CheckResult> {
    const start = Date.now();
    try {
      const activeConfigs = await this.prisma.amaiEngineConfig.findMany({
        where: { state: EngineState.ACTIVE, driveFolderId: { not: null } },
        include: { syncLogs: { orderBy: { createdAt: 'desc' }, take: 1 } },
      });
      const ms = Date.now() - start;

      if (activeConfigs.length === 0) {
        return { subsystem: 'autopilot', status: HealthStatus.OK, responseTimeMs: ms, message: 'No active Drive-connected AutoPilot brands.' };
      }

      const staleAfterHours = Number(process.env.HEALTH_AUTOPILOT_STALE_HOURS || 48);
      const staleCutoff = Date.now() - staleAfterHours * 60 * 60 * 1000;

      let stale = 0;
      let neverSynced = 0;
      for (const cfg of activeConfigs) {
        const lastSync = cfg.syncLogs[0]?.createdAt;
        if (!lastSync) neverSynced++;
        else if (lastSync.getTime() < staleCutoff) stale++;
      }

      const unhealthy = stale + neverSynced;
      const status =
        unhealthy === activeConfigs.length ? HealthStatus.DOWN : unhealthy > 0 ? HealthStatus.DEGRADED : HealthStatus.OK;

      return {
        subsystem: 'autopilot',
        status,
        responseTimeMs: ms,
        message: `${activeConfigs.length} active AutoPilot brand(s), ${stale} stale (>${staleAfterHours}h since last sync), ${neverSynced} never synced.`,
        metadata: { active: activeConfigs.length, stale, neverSynced },
      };
    } catch (err) {
      return {
        subsystem: 'autopilot',
        status: HealthStatus.DOWN,
        responseTimeMs: Date.now() - start,
        message: 'Failed to evaluate AutoPilot Drive sync health.',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // ------------------------------------------------------------------
  // Read paths for the admin dashboard + daily Telegram report. Both are
  // built on the same HealthCheckResult history table -- no separate
  // "current state" table to keep in sync.
  // ------------------------------------------------------------------

  /** One row per subsystem: its most recent check outcome. Includes the 'health_engine' heartbeat row. */
  async getLatestSnapshot() {
    return this.prisma.healthCheckResult.findMany({
      distinct: ['subsystem'],
      orderBy: { checkedAt: 'desc' },
    });
  }

  /**
   * Builds and sends the Phase 12 daily Telegram report. Deliberately reads
   * real data only -- synthetic-test counts are reported as "not yet
   * configured" rather than a fabricated 0/0, since Playwright synthetic
   * testing (Phase 4) is an explicitly deferred follow-up, not part of
   * this increment.
   */
  async sendDailyReport(): Promise<{ sent: boolean; reason?: string }> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [snapshot, incidentGroups, recentChecks] = await Promise.all([
      this.getLatestSnapshot(),
      this.prisma.errorGroup.groupBy({
        by: ['severity'],
        where: { firstSeenAt: { gte: since } },
        _count: { _all: true },
      }),
      this.prisma.healthCheckResult.findMany({
        where: { checkedAt: { gte: since }, subsystem: { not: 'health_engine' } },
        select: { responseTimeMs: true },
      }),
    ]);

    const subsystems = snapshot
      .filter((s) => s.subsystem !== 'health_engine')
      .map((s) => ({ name: s.subsystem, ok: s.status === HealthStatus.OK }));

    const overallHealthPct = subsystems.length
      ? (subsystems.filter((s) => s.ok).length / subsystems.length) * 100
      : 100;

    const incidentCounts: Record<string, number> = {};
    for (const row of incidentGroups) incidentCounts[row.severity] = row._count._all;

    const timedChecks = recentChecks.filter((c) => c.responseTimeMs !== null) as { responseTimeMs: number }[];
    const avgApiResponseMs = timedChecks.length
      ? timedChecks.reduce((sum, c) => sum + c.responseTimeMs, 0) / timedChecks.length
      : null;

    if (!this.telegram.isConfigured()) {
      const reason = 'Telegram not configured -- TELEGRAM_BOT_TOKEN and/or TELEGRAM_ADMIN_CHAT_ID missing in this deployment\'s env vars.';
      this.logger.warn(`Skipping daily report -- ${reason}`);
      return { sent: false, reason };
    }

    const sent = await this.telegram.send(
      this.telegram.formatDailyReport({
        overallHealthPct,
        subsystems,
        incidentCounts,
        testsPassed: null,
        testsFailed: null,
        avgApiResponseMs,
      }),
    );

    return sent
      ? { sent: true }
      : { sent: false, reason: 'Telegram API call failed -- check the bot token and chat ID are correct (see server logs for the exact error).' };
  }

  /**
   * Phase 17's watchdog check: is the engine itself still being triggered?
   * Called from the health-check cron route itself (the closest thing to
   * "monitoring the monitor" available without an always-on process --
   * see this file's top doc comment on why there is no long-running
   * watchdog process on Vercel serverless). If the last heartbeat before
   * *this* run is older than expected, something stopped calling this
   * endpoint -- report it before writing this run's own fresh heartbeat.
   */
  async checkEngineHeartbeat(): Promise<void> {
    const expectedIntervalMinutes = Number(process.env.HEALTH_CHECK_INTERVAL_MINUTES || 5);
    const staleAfterMs = expectedIntervalMinutes * 2 * 60 * 1000;

    const lastHeartbeat = await this.prisma.healthCheckResult.findFirst({
      where: { subsystem: 'health_engine' },
      orderBy: { checkedAt: 'desc' },
    });

    const isStale = !lastHeartbeat || Date.now() - lastHeartbeat.checkedAt.getTime() > staleAfterMs;
    if (!isStale) return;
    if (!this.telegram.isConfigured()) return;

    await this.telegram.send(
      this.telegram.formatWatchdogOffline(lastHeartbeat?.checkedAt ?? null, expectedIntervalMinutes),
    );
  }

  // ------------------------------------------------------------------
  // Incident raising / auto-resolution -- shared by every check above.
  // ------------------------------------------------------------------

  private async persistAndRaise(result: CheckResult): Promise<void> {
    // Redacted here, once, at write time -- same discipline as
    // ErrorEvent.context (see error-capture.service.ts): a thrown DB/AI
    // client error can occasionally embed a connection string or bearer
    // token in its message, and this must never reach the dashboard or a
    // Telegram message unredacted.
    const safeError = result.error ? (redactSecrets(result.error) as string) : undefined;
    const safeMessage = redactSecrets(result.message) as string;

    await this.prisma.healthCheckResult.create({
      data: {
        subsystem: result.subsystem,
        status: result.status,
        responseTimeMs: result.responseTimeMs,
        message: safeMessage,
        error: safeError,
        metadata: result.metadata as any,
      },
    });

    if (result.status === HealthStatus.OK) {
      await this.autoResolveIfOpen(result.subsystem);
      return;
    }

    await this.raiseIncident({ ...result, message: safeMessage, error: safeError });
  }

  private signatureFor(subsystem: string): string {
    // Deliberately NOT including the message/metadata in the signature --
    // those vary run to run (counts, ages) and would defeat dedup the same
    // way an un-normalized error message would. One health-check incident
    // per subsystem, full stop; occurrenceCount tracks how many failing
    // runs it has survived.
    return crypto.createHash('sha256').update(`healthcheck|${subsystem}`).digest('hex');
  }

  private async raiseIncident(result: CheckResult): Promise<void> {
    const signature = this.signatureFor(result.subsystem);
    const severity = result.status === HealthStatus.DOWN ? ErrorSeverity.FATAL : ErrorSeverity.WARN;
    const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';

    const group = await this.prisma.errorGroup.upsert({
      where: { signature },
      create: {
        signature,
        title: `${result.subsystem}: ${result.status === HealthStatus.DOWN ? 'down' : 'degraded'}`,
        service: 'health-engine',
        environment,
        severity,
        subsystem: result.subsystem,
        source: IncidentSource.HEALTH_CHECK,
        status: IncidentStatus.OPEN,
        occurrenceCount: 1,
      },
      update: {
        occurrenceCount: { increment: 1 },
        lastSeenAt: new Date(),
        severity,
        // A health check that had recovered and gone RESOLVED, then fails
        // again, must re-open -- exactly the same re-open-on-recurrence
        // rule ErrorCaptureService applies to reactive exceptions.
        resolved: false,
        status: IncidentStatus.OPEN,
      },
    });

    if (result.error || result.message) {
      await this.prisma.errorEvent.create({
        data: {
          groupId: group.id,
          message: result.message,
          stackTrace: result.error,
          service: 'health-engine',
          environment,
          context: result.metadata as any,
        },
      });
    }

    if (!this.telegram.isConfigured()) return;
    if (!this.telegram.shouldNotify(group)) return;

    const sent = await this.telegram.send(
      this.telegram.formatIncidentAlert(group, { dashboardUrl: `${getAppUrl()}/dashboard/admin/errors` }),
    );
    if (sent) {
      await this.prisma.errorGroup.update({
        where: { id: group.id },
        data: { lastNotifiedAt: new Date(), lastNotifiedSeverity: group.severity },
      });
    }
  }

  /**
   * Confirmed-recovery auto-resolve (Phase 13): a subsystem that just
   * reported OK, and has an open HEALTH_CHECK-sourced incident, is marked
   * RESOLVED and a resolution message is sent. Only ever touches incidents
   * this same engine raised (source: HEALTH_CHECK) -- it must never
   * silently resolve a reactive exception-based incident a human hasn't
   * actually fixed just because one proactive check happened to pass.
   */
  private async autoResolveIfOpen(subsystem: string): Promise<void> {
    const signature = this.signatureFor(subsystem);
    const existing = await this.prisma.errorGroup.findUnique({ where: { signature } });
    if (!existing || existing.resolved || existing.status === IncidentStatus.RESOLVED) return;
    if (existing.source !== IncidentSource.HEALTH_CHECK) return;

    const updated = await this.prisma.errorGroup.update({
      where: { id: existing.id },
      data: { resolved: true, status: IncidentStatus.RESOLVED, resolvedAt: new Date() },
    });

    this.logger.log(`Auto-resolved incident for subsystem "${subsystem}" (${updated.id}) after confirmed recovery.`);

    if (!this.telegram.isConfigured()) return;
    await this.telegram.send(this.telegram.formatResolution(updated));
  }
}

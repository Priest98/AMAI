import { Injectable, Logger } from '@nestjs/common';
import { ErrorGroup, ErrorSeverity, IncidentSource } from '@prisma/client';
import { redactSecrets } from './redact';

/**
 * Single outbound path for every Telegram message the Health Engine (and,
 * going forward, anything else that wants to page an admin) sends. Nothing
 * about incidents, health checks, or the daily report talks to the
 * Telegram Bot API directly -- it all goes through here so there is one
 * place that redacts, one place that respects "don't spam", and one place
 * that fails silently instead of taking down a health check because a chat
 * ID was misconfigured.
 *
 * Requires two env vars, set in Vercel like any other secret (never
 * committed, never entered by anything other than the person who owns the
 * bot token):
 *   TELEGRAM_BOT_TOKEN    -- from @BotFather
 *   TELEGRAM_ADMIN_CHAT_ID -- the chat/group id the bot should post into
 *
 * If either is missing, every send() is a no-op that logs once and returns
 * -- this must never be the reason a health check or cron job throws.
 */
@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  isConfigured(): boolean {
    return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ADMIN_CHAT_ID);
  }

  /**
   * Low-level send. Fire-and-forget by design (callers are health checks
   * and cron jobs -- a Telegram outage must never fail the thing being
   * monitored). Redacts before every send regardless of who called it, so
   * a future caller forgetting to redact can't leak a token into a chat.
   */
  async send(text: string): Promise<boolean> {
    if (!this.isConfigured()) {
      this.logger.warn('Telegram not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_ADMIN_CHAT_ID missing) -- message dropped.');
      return false;
    }

    const safeText = String(redactSecrets(text));
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: safeText,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        this.logger.error(`Telegram send failed (${res.status}): ${body.slice(0, 300)}`);
        return false;
      }

      return true;
    } catch (err) {
      this.logger.error(`Telegram send threw: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  // ---------------------------------------------------------------------
  // Alerting policy: CRITICAL/HIGH page immediately (with a minimum
  // re-notify gap so an incident that stays OPEN for hours doesn't spam
  // every time a cron tick re-evaluates it); MEDIUM only once it's shown to
  // be persistent (occurrenceCount past a small threshold); LOW/INFO never
  // fire immediately -- they're left for the daily report to summarize.
  // This lives here rather than in the health engine because "should this
  // actually reach a human right now" is Telegram-specific policy, not
  // health-check logic.
  // ---------------------------------------------------------------------

  private static readonly RENOTIFY_GAP_MS = 30 * 60 * 1000; // 30 minutes
  private static readonly MEDIUM_PERSISTENCE_THRESHOLD = 3;

  /**
   * Decides whether an ErrorGroup's current state warrants a Telegram
   * alert right now, given what it last notified. Pure decision function
   * (no I/O) so it can be unit-tested and reused by both the reactive
   * capture path and the proactive health-check path without duplicating
   * the policy.
   */
  shouldNotify(group: Pick<ErrorGroup, 'severity' | 'occurrenceCount' | 'lastNotifiedAt' | 'lastNotifiedSeverity' | 'status'>, now: Date = new Date()): boolean {
    if (group.status === 'RESOLVED' || group.status === 'IGNORED') return false;

    const severityWorsened = group.lastNotifiedSeverity
      ? severityRank(group.severity) > severityRank(group.lastNotifiedSeverity)
      : true;

    if (group.severity === ErrorSeverity.FATAL || group.severity === ErrorSeverity.ERROR) {
      // CRITICAL/HIGH-equivalent in this schema's severity scale.
      if (!group.lastNotifiedAt) return true;
      if (severityWorsened) return true;
      return now.getTime() - group.lastNotifiedAt.getTime() >= TelegramService.RENOTIFY_GAP_MS;
    }

    if (group.severity === ErrorSeverity.WARN) {
      if (group.occurrenceCount < TelegramService.MEDIUM_PERSISTENCE_THRESHOLD) return false;
      if (!group.lastNotifiedAt) return true;
      return now.getTime() - group.lastNotifiedAt.getTime() >= TelegramService.RENOTIFY_GAP_MS;
    }

    // DEBUG/INFO: never paged immediately -- daily report only.
    return false;
  }

  formatIncidentAlert(group: ErrorGroup, opts: { dashboardUrl?: string } = {}): string {
    const emoji = group.severity === ErrorSeverity.FATAL ? '🔴' : group.severity === ErrorSeverity.ERROR ? '🟠' : '🟡';
    const label = group.severity === ErrorSeverity.FATAL ? 'CRITICAL' : group.severity === ErrorSeverity.ERROR ? 'HIGH' : 'MEDIUM';
    const originLine = group.source === IncidentSource.HEALTH_CHECK ? 'Detected by: proactive health check' : 'Detected by: exception capture';

    const lines = [
      `${emoji} <b>${label} INCIDENT</b>`,
      `<b>${escapeHtml(group.title)}</b>`,
      `Subsystem: ${group.subsystem || 'unknown'}`,
      `Status: ${group.status}`,
      `Occurrences: ${group.occurrenceCount}`,
      `First detected: ${group.firstSeenAt.toISOString()}`,
      originLine,
    ];

    if (opts.dashboardUrl) lines.push(`Dashboard: ${opts.dashboardUrl}/${group.id}`);

    return lines.join('\n');
  }

  formatResolution(group: ErrorGroup): string {
    const openedMs = group.resolvedAt ? group.resolvedAt.getTime() - group.firstSeenAt.getTime() : null;
    const openedFor = openedMs !== null ? humanizeDuration(openedMs) : 'unknown duration';

    return [
      `✅ <b>RESOLVED</b>`,
      `<b>${escapeHtml(group.title)}</b>`,
      `Subsystem: ${group.subsystem || 'unknown'}`,
      `Was open for: ${openedFor}`,
      `Total occurrences: ${group.occurrenceCount}`,
    ].join('\n');
  }

  formatWatchdogOffline(lastHeartbeatAt: Date | null, expectedIntervalMinutes: number): string {
    const last = lastHeartbeatAt ? lastHeartbeatAt.toISOString() : 'never';
    return [
      `🚨 <b>Oyinca MONITORING ENGINE OFFLINE</b>`,
      `The Health Engine has not reported a heartbeat within the expected interval. This is critical.`,
      `Last heartbeat: ${last}`,
      `Expected interval: every ${expectedIntervalMinutes} min`,
    ].join('\n');
  }

  formatDailyReport(data: {
    overallHealthPct: number;
    subsystems: { name: string; ok: boolean }[];
    incidentCounts: Record<string, number>;
    // null = synthetic test suite not wired up yet (Phase 4 -- a deferred
    // follow-up, not part of this increment). Printed honestly rather than
    // faked as "0 passed / 0 failed", which would misleadingly imply tests
    // ran and found nothing wrong.
    testsPassed: number | null;
    testsFailed: number | null;
    avgApiResponseMs: number | null;
  }): string {
    const subsystemLines = data.subsystems.map((s) => `${s.ok ? '🟢' : '🔴'} ${s.name}`);
    const incidentLine = Object.entries(data.incidentCounts)
      .map(([sev, count]) => `${sev}: ${count}`)
      .join(', ');

    return [
      `📊 <b>Oyinca Daily Health Report</b>`,
      `Overall health: ${data.overallHealthPct.toFixed(1)}%`,
      '',
      ...subsystemLines,
      '',
      `Incidents (24h) — ${incidentLine || 'none'}`,
      data.testsPassed === null || data.testsFailed === null
        ? 'Synthetic tests: not yet configured'
        : `Synthetic tests: ${data.testsPassed} passed / ${data.testsFailed} failed`,
      data.avgApiResponseMs !== null ? `Avg health-check response: ${Math.round(data.avgApiResponseMs)}ms` : undefined,
    ]
      .filter((l): l is string => l !== undefined)
      .join('\n');
  }
}

function severityRank(severity: ErrorSeverity): number {
  switch (severity) {
    case ErrorSeverity.DEBUG: return 0;
    case ErrorSeverity.INFO: return 1;
    case ErrorSeverity.WARN: return 2;
    case ErrorSeverity.ERROR: return 3;
    case ErrorSeverity.FATAL: return 4;
    default: return 0;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function humanizeDuration(ms: number): string {
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (hours < 24) return `${hours}h ${rem}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

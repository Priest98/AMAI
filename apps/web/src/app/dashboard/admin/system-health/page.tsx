"use client";

import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, RefreshCw } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import Badge from '@/components/ui/Badge';

/**
 * Two data sources, both real:
 *   - GET /admin/overview -- the pre-existing AI/publishing rows this page
 *     always showed.
 *   - GET /admin/health -- the Health Engine's per-subsystem cards
 *     (Phase 11), read from HealthCheckResult, the same table the
 *     proactive /api/cron/health-check route writes to. Nothing here
 *     computes health itself; it only displays what the engine already
 *     observed on its last scheduled run (or "Run now").
 */

interface AdminOverview {
  generatedAt: string;
  apiHealth: {
    aiProviderRequestsAllTime: number;
    aiProviderErrorsAllTime: number;
    aiKeysCurrentlyDisabled: number;
    connectionsExpired: number;
    unavailable: string[];
  };
  posts: {
    failedTotal: number;
    failedLast7d: number;
    publishedLast7d: number;
  };
  systemHealth: { status: 'ok' | 'degraded' };
}

interface SubsystemCard {
  subsystem: string;
  status: 'OK' | 'DEGRADED' | 'DOWN';
  message: string | null;
  error: string | null;
  responseTimeMs: number | null;
  checkedAt: string;
}

interface HealthSnapshot {
  overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  subsystems: SubsystemCard[];
  engineHeartbeatAt: string | null;
}

const STATUS_VARIANT: Record<SubsystemCard['status'], 'success' | 'warning' | 'neutral'> = {
  OK: 'success',
  DEGRADED: 'warning',
  DOWN: 'warning',
};

function SubsystemCardView({ card }: { card: SubsystemCard }) {
  return (
    <div className="exec-card card-pad space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-body-sm font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>{card.subsystem.replace(/_/g, ' ')}</p>
        <Badge variant={STATUS_VARIANT[card.status]}>{card.status === 'DOWN' ? '🔴 DOWN' : card.status === 'DEGRADED' ? '🟡 DEGRADED' : '🟢 OK'}</Badge>
      </div>
      {card.message && <p className="text-caption" style={{ color: 'var(--text-secondary)' }}>{card.message}</p>}
      <p className="text-caption" style={{ color: 'var(--text-muted)' }}>
        {card.responseTimeMs !== null ? `${card.responseTimeMs}ms · ` : ''}checked {new Date(card.checkedAt).toLocaleString()}
      </p>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'error' | 'warn' | 'ok' }) {
  const color =
    tone === 'error' ? 'var(--accent-error)' : tone === 'warn' ? 'var(--accent-warning)' : tone === 'ok' ? 'var(--accent-success)' : 'var(--text-primary)';
  return (
    <div className="exec-card card-pad flex items-center justify-between">
      <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      <p className="text-body font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

export default function SystemHealthPage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [health, setHealth] = useState<HealthSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);
  const [reportStatus, setReportStatus] = useState<string | null>(null);

  const loadHealth = () => apiFetch<HealthSnapshot>('/admin/health').then(setHealth).catch(() => setHealth(null));

  useEffect(() => {
    Promise.all([
      apiFetch<AdminOverview>('/admin/overview').then(setData),
      loadHealth(),
    ])
      .catch((e: any) => setError(e?.message || "Couldn't load system health."))
      .finally(() => setLoading(false));
  }, []);

  const runNow = async () => {
    setRunning(true);
    try {
      await apiFetch('/admin/health/run-now', { method: 'POST' });
      await loadHealth();
    } catch (e: any) {
      setError(e?.message || 'Failed to run health check.');
    } finally {
      setRunning(false);
    }
  };

  const sendDailyReport = async () => {
    setSendingReport(true);
    setReportStatus(null);
    try {
      const res = await apiFetch<{ success: boolean; sent: boolean; reason?: string }>('/admin/health/send-daily-report', { method: 'POST' });
      setReportStatus(res.sent ? 'Sent -- check Telegram.' : res.reason || 'Not sent -- unknown reason.');
    } catch (e: any) {
      setReportStatus(e?.message || 'Failed to send.');
    } finally {
      setSendingReport(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-body-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</div>;
  }

  if (error || !data) {
    return (
      <div className="p-10 max-w-md mx-auto text-center">
        <ShieldAlert className="h-6 w-6 mx-auto mb-3" style={{ color: 'var(--accent-error)' }} />
        <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>{error || 'Not available.'}</p>
      </div>
    );
  }

  const degraded = data.systemHealth.status === 'degraded';
  const overallStatus = health?.overallStatus;

  return (
    <div className="page-shell space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-h1" style={{ color: 'var(--text-primary)' }}>System health</h1>
          <p className="text-body-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Generated {new Date(data.generatedAt).toLocaleString()}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runNow}
            disabled={running}
            className="flex items-center gap-1.5 text-caption font-semibold px-3 py-1.5 rounded-[var(--radius-md)] border disabled:opacity-50"
            style={{ borderColor: 'var(--glass-card-border)', color: 'var(--text-primary)' }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${running ? 'animate-spin' : ''}`} />
            Run now
          </button>
          <button
            onClick={sendDailyReport}
            disabled={sendingReport}
            className="text-caption font-semibold px-3 py-1.5 rounded-[var(--radius-md)] border disabled:opacity-50"
            style={{ borderColor: 'var(--glass-card-border)', color: 'var(--text-primary)' }}
            title="Sends the daily Telegram report immediately -- useful for confirming Telegram is wired up correctly"
          >
            {sendingReport ? 'Sending…' : 'Send Telegram test'}
          </button>
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-md)]"
            style={{ backgroundColor: degraded ? 'color-mix(in srgb, var(--accent-warning) 14%, transparent)' : 'color-mix(in srgb, var(--accent-success) 14%, transparent)' }}
          >
            {degraded ? (
              <AlertTriangle className="h-4 w-4" style={{ color: 'var(--accent-warning)' }} />
            ) : (
              <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--accent-success)' }} />
            )}
            <span className="text-caption font-bold" style={{ color: 'var(--text-primary)' }}>
              {degraded ? 'Degraded' : 'Nominal'}
            </span>
          </div>
        </div>
      </div>

      {reportStatus && (
        <p className="text-caption" style={{ color: 'var(--text-secondary)' }}>{reportStatus}</p>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-overline" style={{ color: 'var(--text-muted)' }}>Subsystems (Health Engine)</h2>
          {overallStatus && (
            <Badge variant={overallStatus === 'HEALTHY' ? 'success' : 'warning'}>
              {overallStatus === 'CRITICAL' ? '🔴 CRITICAL' : overallStatus === 'DEGRADED' ? '🟡 DEGRADED' : '🟢 HEALTHY'}
            </Badge>
          )}
        </div>
        {!health || health.subsystems.length === 0 ? (
          <div className="exec-card card-pad text-body-sm" style={{ color: 'var(--text-muted)' }}>
            No health-check data yet -- runs on schedule via /api/cron/health-check, or click "Run now".
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {health.subsystems.map((s) => (
              <SubsystemCardView key={s.subsystem} card={s} />
            ))}
          </div>
        )}
        {health?.engineHeartbeatAt && (
          <p className="text-caption" style={{ color: 'var(--text-muted)' }}>
            Engine last ran: {new Date(health.engineHeartbeatAt).toLocaleString()}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-overline" style={{ color: 'var(--text-muted)' }}>AI provider health</h2>
        <Row label="AI keys currently disabled" value={data.apiHealth.aiKeysCurrentlyDisabled} tone={data.apiHealth.aiKeysCurrentlyDisabled > 0 ? 'error' : 'ok'} />
        <Row label="AI provider errors (all-time)" value={data.apiHealth.aiProviderErrorsAllTime} tone={data.apiHealth.aiProviderErrorsAllTime > 0 ? 'warn' : 'ok'} />
        <Row label="AI provider requests (all-time)" value={data.apiHealth.aiProviderRequestsAllTime} />
        <Row label="Social connections expired" value={data.apiHealth.connectionsExpired} tone={data.apiHealth.connectionsExpired > 0 ? 'warn' : 'ok'} />
      </div>

      <div className="space-y-3">
        <h2 className="text-overline" style={{ color: 'var(--text-muted)' }}>Publishing</h2>
        <Row label="Failed posts (last 7d)" value={data.posts.failedLast7d} tone={data.posts.failedLast7d > 0 ? 'warn' : 'ok'} />
        <Row label="Failed posts (all-time)" value={data.posts.failedTotal} tone={data.posts.failedTotal > 0 ? 'warn' : 'ok'} />
        <Row label="Published (last 7d)" value={data.posts.publishedLast7d} />
      </div>

      {data.apiHealth.unavailable.length > 0 && (
        <p className="text-caption" style={{ color: 'var(--text-muted)' }}>
          Data unavailable: {data.apiHealth.unavailable.join(', ')}.
        </p>
      )}
    </div>
  );
}

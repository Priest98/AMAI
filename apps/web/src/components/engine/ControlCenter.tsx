"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, AlertTriangle, HelpCircle, Activity } from 'lucide-react';
import { brandFetch } from '@/lib/api';
import { HEALTH_META, healthColor, expiryLabel, PublicConnection } from '@/lib/agency';

/**
 * AutoPilot control centre.
 *
 * Shows what AMAI has in flight and whether anything is blocking it. Every
 * number is a real count from the API; subsystems AMAI cannot actually
 * probe report "not checked" rather than a green tick, because a
 * reassurance that isn't backed by a check defeats the purpose of a trust
 * panel.
 */

type HealthStatus = 'ok' | 'degraded' | 'action_required' | 'unknown';

interface ControlCenterData {
  state: string;
  approvalMode: string;
  pipeline: {
    prepared: number;
    scheduled: number;
    awaitingApproval: number;
    failed: number;
    publishedLast24h: number;
  };
  nextScheduledAt: string | null;
  connections: PublicConnection[];
  health: Record<'ai' | 'connections' | 'publishing' | 'scheduler', { status: HealthStatus; detail: string | null }>;
}

const STATUS_META: Record<HealthStatus, { icon: React.ElementType; color: string; label: string }> = {
  ok: { icon: CheckCircle2, color: 'var(--accent-success)', label: 'OK' },
  degraded: { icon: AlertTriangle, color: 'var(--accent-warning)', label: 'Degraded' },
  action_required: { icon: AlertTriangle, color: 'var(--accent-error)', label: 'Action required' },
  unknown: { icon: HelpCircle, color: 'var(--text-muted)', label: 'Not checked' },
};

const SUBSYSTEMS: { key: keyof ControlCenterData['health']; label: string }[] = [
  { key: 'ai', label: 'AI' },
  { key: 'connections', label: 'Connections' },
  { key: 'publishing', label: 'Publishing' },
  { key: 'scheduler', label: 'Scheduler' },
];

function Metric({ label, value, tone }: { label: string; value: number; tone?: 'warn' | 'error' }) {
  const color =
    tone === 'error' && value > 0 ? 'var(--accent-error)'
    : tone === 'warn' && value > 0 ? 'var(--accent-warning)'
    : 'var(--text-primary)';
  return (
    <div className="surface-tile p-4">
      <p className="text-caption" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-h2 mt-1.5" style={{ color }}>{value}</p>
    </div>
  );
}

export default function ControlCenter() {
  const [data, setData] = useState<ControlCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    brandFetch<ControlCenterData>('/engine/control-center')
      .then(setData)
      .catch(() => setError("Couldn't load AutoPilot status. Try again."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="exec-card card-pad">
        <div className="skeleton h-5 w-40" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-20" />)}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="exec-card card-pad text-center">
        <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>{error}</p>
      </div>
    );
  }

  const running = data.state === 'ACTIVE';

  return (
    <div className="exec-card card-pad space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: running ? 'var(--accent-success)' : 'var(--text-muted)' }}
            />
            <h2 className="text-h3" style={{ color: 'var(--text-primary)' }}>
              AutoPilot {running ? 'running' : 'paused'}
            </h2>
          </div>
          <p className="text-body-sm mt-1.5" style={{ color: 'var(--text-secondary)' }}>
            {data.approvalMode === 'AUTO'
              ? 'Posts publish automatically at AI-selected times.'
              : 'Posts wait in your Approval Queue before publishing.'}
          </p>
        </div>
        {data.nextScheduledAt && (
          <div className="text-right">
            <p className="text-caption" style={{ color: 'var(--text-muted)' }}>Next post</p>
            <p className="text-body-sm font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>
              {new Date(data.nextScheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Metric label="Prepared" value={data.pipeline.prepared} />
        <Metric label="Scheduled" value={data.pipeline.scheduled} />
        <Metric label="Awaiting approval" value={data.pipeline.awaitingApproval} tone="warn" />
        <Metric label="Published (24h)" value={data.pipeline.publishedLast24h} />
        <Metric label="Failed" value={data.pipeline.failed} tone="error" />
      </div>

      <div>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
          <h3 className="text-overline" style={{ color: 'var(--text-muted)' }}>System health</h3>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {SUBSYSTEMS.map(({ key, label }) => {
            const h = data.health[key];
            const meta = STATUS_META[h.status];
            const Icon = meta.icon;
            return (
              <div key={key} className="surface-tile p-3 flex items-start gap-2.5">
                <Icon className="h-4 w-4 shrink-0 mt-0.5" style={{ color: meta.color }} />
                <div className="min-w-0">
                  <p className="text-body-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {label}
                  </p>
                  <p className="text-caption mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {h.detail || meta.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {data.connections.some((c) => c.needsReauth || c.health === 'EXPIRING_SOON') && (
        <div>
          <h3 className="text-overline" style={{ color: 'var(--text-muted)' }}>Connections needing attention</h3>
          <div className="mt-3 space-y-2">
            {data.connections
              .filter((c) => c.needsReauth || c.health === 'EXPIRING_SOON')
              .map((c) => {
                const meta = HEALTH_META[c.health];
                return (
                  <div key={c.id} className="surface-tile p-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-body-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {c.platform}{c.accountName ? ` · ${c.accountName}` : ''}
                      </p>
                      <p className="text-caption mt-0.5" style={{ color: healthColor(meta.tone) }}>
                        {expiryLabel(c) || meta.label}
                      </p>
                    </div>
                    <Link
                      href="/dashboard/integrations"
                      className="btn-secondary px-3.5 py-2 rounded-[var(--radius-md)] text-caption font-bold touch-target"
                    >
                      Reconnect
                    </Link>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

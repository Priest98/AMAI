"use client";

import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { apiFetch } from '@/lib/api';

/**
 * Reuses GET /admin/overview -- there is no separate system-health-only
 * backend endpoint (the same real queries back both this page and the
 * Overview page's health badge), just a focused view of the health-
 * relevant slice of that response.
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<AdminOverview>('/admin/overview')
      .then(setData)
      .catch((e: any) => setError(e?.message || "Couldn't load system health."))
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <div className="page-shell space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-h1" style={{ color: 'var(--text-primary)' }}>System health</h1>
          <p className="text-body-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Generated {new Date(data.generatedAt).toLocaleString()}.
          </p>
        </div>
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

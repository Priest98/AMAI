"use client";

import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { apiFetch } from '@/lib/api';

/**
 * Oyinca's own internal operating view -- not a customer-facing page.
 * Deliberately not linked from the sidebar nav: only reachable by typing
 * the URL, and the backend (PlatformAdminGuard, ADMIN_EMAILS allowlist)
 * rejects anyone not explicitly configured as an Oyinca admin regardless of
 * whether they find this URL. Every number below is a real query -- see
 * admin.service.ts's doc comment for what's estimated (MRR) vs. exact, and
 * what's honestly reported as unavailable rather than invented.
 */

interface AdminOverview {
  generatedAt: string;
  accounts: {
    totalOrganizations: number;
    totalBrands: number;
    usersByPlan: Record<'FREE' | 'PRO' | 'CREATOR' | 'AGENCY', number>;
  };
  revenue: {
    mrrEstimateByCurrency: Record<'USD' | 'GBP' | 'NGN', number>;
    note: string;
  };
  posts: {
    failedTotal: number;
    failedLast7d: number;
    publishedLast7d: number;
  };
  apiHealth: {
    aiProviderRequestsAllTime: number;
    aiProviderErrorsAllTime: number;
    aiKeysCurrentlyDisabled: number;
    connectionsExpired: number;
    unavailable: string[];
  };
  systemHealth: { status: 'ok' | 'degraded' };
}

const CURRENCY_SYMBOL: Record<string, string> = { USD: '$', GBP: '£', NGN: '₦' };

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'error' | 'warn' }) {
  const color = tone === 'error' ? 'var(--accent-error)' : tone === 'warn' ? 'var(--accent-warning)' : 'var(--text-primary)';
  return (
    <div className="exec-card card-pad">
      <p className="text-caption" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-h1 mt-2" style={{ color }}>{value}</p>
    </div>
  );
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<AdminOverview>('/admin/overview')
      .then(setData)
      .catch((e: any) => setError(e?.message || "Couldn't load the admin overview."))
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

  const mrrEntries = Object.entries(data.revenue.mrrEstimateByCurrency).filter(([, v]) => v > 0);

  return (
    <div className="page-shell space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-h1" style={{ color: 'var(--text-primary)' }}>Oyinca Admin Overview</h1>
          <p className="text-body-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Internal only. Generated {new Date(data.generatedAt).toLocaleString()}.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-md)]" style={{ backgroundColor: data.systemHealth.status === 'ok' ? 'color-mix(in srgb, var(--accent-success) 14%, transparent)' : 'color-mix(in srgb, var(--accent-warning) 14%, transparent)' }}>
          {data.systemHealth.status === 'ok' ? (
            <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--accent-success)' }} />
          ) : (
            <AlertTriangle className="h-4 w-4" style={{ color: 'var(--accent-warning)' }} />
          )}
          <span className="text-caption font-bold" style={{ color: 'var(--text-primary)' }}>
            System {data.systemHealth.status === 'ok' ? 'nominal' : 'degraded'}
          </span>
        </div>
      </div>

      <div>
        <h2 className="text-overline mb-3" style={{ color: 'var(--text-muted)' }}>Accounts</h2>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <Stat label="Organizations" value={data.accounts.totalOrganizations} />
          <Stat label="Brands / clients" value={data.accounts.totalBrands} />
          <Stat label="Free" value={data.accounts.usersByPlan.FREE} />
          <Stat label="Pro" value={data.accounts.usersByPlan.PRO} />
          <Stat label="Creator" value={data.accounts.usersByPlan.CREATOR} />
          <Stat label="Agency" value={data.accounts.usersByPlan.AGENCY} />
        </div>
      </div>

      <div>
        <h2 className="text-overline mb-3" style={{ color: 'var(--text-muted)' }}>Revenue (estimate)</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {mrrEntries.length === 0 ? (
            <div className="exec-card card-pad col-span-full text-center text-body-sm" style={{ color: 'var(--text-secondary)' }}>
              No active paid subscriptions yet.
            </div>
          ) : (
            mrrEntries.map(([currency, value]) => (
              <Stat key={currency} label={`Est. MRR (${currency})`} value={`${CURRENCY_SYMBOL[currency] || ''}${value.toLocaleString()}`} />
            ))
          )}
        </div>
        <p className="text-caption mt-2" style={{ color: 'var(--text-muted)' }}>{data.revenue.note}</p>
      </div>

      <div>
        <h2 className="text-overline mb-3" style={{ color: 'var(--text-muted)' }}>Publishing</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Stat label="Published (7d)" value={data.posts.publishedLast7d} />
          <Stat label="Failed (7d)" value={data.posts.failedLast7d} tone={data.posts.failedLast7d > 0 ? 'warn' : undefined} />
          <Stat label="Failed (all-time)" value={data.posts.failedTotal} tone={data.posts.failedTotal > 0 ? 'warn' : undefined} />
        </div>
      </div>

      <div>
        <h2 className="text-overline mb-3" style={{ color: 'var(--text-muted)' }}>API / provider health</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="AI requests (all-time)" value={data.apiHealth.aiProviderRequestsAllTime} />
          <Stat label="AI errors (all-time)" value={data.apiHealth.aiProviderErrorsAllTime} tone={data.apiHealth.aiProviderErrorsAllTime > 0 ? 'warn' : undefined} />
          <Stat label="AI keys disabled now" value={data.apiHealth.aiKeysCurrentlyDisabled} tone={data.apiHealth.aiKeysCurrentlyDisabled > 0 ? 'error' : undefined} />
          <Stat label="Connections expired" value={data.apiHealth.connectionsExpired} tone={data.apiHealth.connectionsExpired > 0 ? 'warn' : undefined} />
        </div>
        {data.apiHealth.unavailable.length > 0 && (
          <p className="text-caption mt-2" style={{ color: 'var(--text-muted)' }}>
            Not tracked yet: {data.apiHealth.unavailable.join(', ')}.
          </p>
        )}
      </div>
    </div>
  );
}

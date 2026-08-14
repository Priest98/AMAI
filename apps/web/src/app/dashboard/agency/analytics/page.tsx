"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Info, ArrowRight } from 'lucide-react';
import { getAgencyAnalytics, AgencyAnalytics } from '@/lib/agency';
import { setActiveClientId } from '@/lib/api';

/**
 * Portfolio analytics.
 *
 * These are PUBLISHING metrics -- what AMAI did -- not PERFORMANCE metrics.
 * AMAI does not ingest reach, impressions, engagement or follower data from
 * Instagram or TikTok, so those are named explicitly as unavailable rather
 * than rendered as zeros that would read as measured results. Every number
 * shown is a real row count from the database.
 */

const WINDOWS = [7, 30, 90];

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'error' }) {
  return (
    <div className="exec-card card-pad">
      <p className="text-caption" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p
        className="text-h1 mt-2"
        style={{ color: tone === 'error' && value > 0 ? 'var(--accent-error)' : 'var(--text-primary)' }}
      >
        {value}
      </p>
    </div>
  );
}

export default function AgencyAnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AgencyAnalytics | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getAgencyAnalytics(days)
      .then(setData)
      .catch(() => setError("Couldn't load analytics. Try again."))
      .finally(() => setLoading(false));
  }, [days]);

  const openClient = (id: string) => {
    setActiveClientId(id);
    router.push('/dashboard/analytics');
  };

  if (loading && !data) return <div className="p-10 text-center text-body-sm" style={{ color: 'var(--text-secondary)' }}>Loading analytics…</div>;
  if (error) return <div className="exec-card card-pad text-center text-body-sm" style={{ color: 'var(--text-secondary)' }}>{error}</div>;

  const d = data!;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h1" style={{ color: 'var(--text-primary)' }}>Portfolio analytics</h1>
          <p className="text-body-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
            Publishing activity across {d.totals.clients} client{d.totals.clients === 1 ? '' : 's'}.
          </p>
        </div>
        <div className="surface-tile p-1.5 flex gap-1.5">
          {WINDOWS.map((w) => (
            <button
              key={w}
              onClick={() => setDays(w)}
              aria-pressed={days === w}
              className="px-3.5 py-2 rounded-[var(--radius-md)] text-body-sm font-bold touch-target"
              style={{
                backgroundColor: days === w ? 'var(--bg-surface-raised)' : 'transparent',
                color: days === w ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              {w}d
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Published" value={d.totals.published} />
        <Stat label="Scheduled" value={d.totals.scheduled} />
        <Stat label="Awaiting approval" value={d.totals.awaitingApproval} />
        <Stat label="Failed" value={d.totals.failed} tone="error" />
      </div>

      {/* Stating the gap plainly is the honest option: an agency owner
          seeing "Reach 0" would reasonably assume it was measured. */}
      <div
        className="flex items-start gap-2.5 p-4 rounded-[var(--radius-md)] border"
        style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-surface-sunken)' }}
      >
        <Info className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
        <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
          Reach, impressions, engagement and follower growth are not shown because AMAI does not yet pull insights
          data from Instagram or TikTok. The figures above are publishing activity recorded by AMAI.
        </p>
      </div>

      <div className="exec-card card-pad">
        <h2 className="text-h3" style={{ color: 'var(--text-primary)' }}>By client</h2>

        {d.perClient.length === 0 ? (
          <p className="text-body-sm mt-3" style={{ color: 'var(--text-secondary)' }}>No clients yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {d.perClient.map((c) => (
              <div key={c.clientId} className="surface-tile p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <p className="text-body font-bold sm:flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
                  {c.clientName}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-caption sm:flex-1" style={{ color: 'var(--text-secondary)' }}>
                  <span>{c.published} published</span>
                  <span>{c.scheduled} scheduled</span>
                  <span>{c.awaitingApproval} awaiting</span>
                  {c.failed > 0 && <span style={{ color: 'var(--accent-error)' }}>{c.failed} failed</span>}
                </div>
                <button
                  onClick={() => openClient(c.clientId)}
                  className="btn-secondary shrink-0 px-4 py-2.5 rounded-[var(--radius-md)] text-body-sm font-bold flex items-center gap-2 touch-target"
                >
                  <span>Open</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

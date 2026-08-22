"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Info, ArrowRight, Download } from 'lucide-react';
import { getAgencyAnalytics, AgencyAnalytics } from '@/lib/agency';
import { setActiveClientId } from '@/lib/api';
import AgencyUpgradePrompt from '@/components/dashboard/AgencyUpgradePrompt';

/**
 * P1 agency reporting foundation. Client-side CSV of exactly what's
 * already rendered on this page -- no new backend aggregation, no
 * fabricated figures, and the unavailable-metrics note (reach/impressions/
 * etc.) travels into the file too so a report handed to a client doesn't
 * imply more was measured than actually was.
 */
function exportAnalyticsCsv(data: AgencyAnalytics, days: number) {
  const rows: string[][] = [
    ['Client', 'Published', 'Scheduled', 'Awaiting approval', 'Failed'],
    ...data.perClient.map((c) => [c.clientName, String(c.published), String(c.scheduled), String(c.awaitingApproval), String(c.failed)]),
    [],
    ['Totals', String(data.totals.published), String(data.totals.scheduled), String(data.totals.awaitingApproval), String(data.totals.failed)],
    [],
    [`Window: last ${days} days`],
    [`Not measured: ${data.unavailableMetrics.join(', ')}`],
  ];
  const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `amai-portfolio-analytics-${days}d-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Portfolio analytics.
 *
 * These are PUBLISHING metrics -- what Oyinca did -- not PERFORMANCE metrics.
 * Oyinca does not ingest reach, impressions, engagement or follower data from
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
  const [needsUpgrade, setNeedsUpgrade] = useState(false);

  useEffect(() => {
    setLoading(true);
    getAgencyAnalytics(days)
      .then(setData)
      .catch((err: any) => {
        if (err?.status === 403) {
          setNeedsUpgrade(true);
        } else {
          setError("Couldn't load analytics. Try again.");
        }
      })
      .finally(() => setLoading(false));
  }, [days]);

  const openClient = (id: string) => {
    setActiveClientId(id);
    router.push('/dashboard/analytics');
  };

  if (loading && !data) return <div className="p-10 text-center text-body-sm" style={{ color: 'var(--text-secondary)' }}>Loading analytics…</div>;
  if (needsUpgrade) {
    return (
      <AgencyUpgradePrompt
        title="Portfolio Analytics"
        description="Aggregated analytics across every client is part of the Agency plan. Upgrade to see your whole portfolio's performance in one place."
      />
    );
  }
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
        <div className="flex items-center gap-2">
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
          <button
            onClick={() => exportAnalyticsCsv(d, days)}
            className="btn-secondary px-3.5 py-2.5 rounded-[var(--radius-md)] text-body-sm font-bold flex items-center gap-2 touch-target"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
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
          Reach, impressions, engagement and follower growth are not shown because Oyinca does not yet pull insights
          data from Instagram or TikTok. The figures above are publishing activity recorded by Oyinca.
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

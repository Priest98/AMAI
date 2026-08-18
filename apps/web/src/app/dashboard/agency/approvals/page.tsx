"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckSquare, ArrowRight } from 'lucide-react';
import { getAgencyApprovalQueue, AgencyQueuePost } from '@/lib/agency';
import { setActiveClientId } from '@/lib/api';
import AgencyUpgradePrompt from '@/components/dashboard/AgencyUpgradePrompt';

/**
 * Portfolio approval queue: everything awaiting review across every client,
 * grouped by client so it is never ambiguous whose post is being approved.
 *
 * Approve/reject deliberately are NOT performed from here. Those actions
 * are brand-scoped (POST /brands/:brandId/posts/:id/approve) and the
 * existing per-client Approval Queue already implements the full review
 * flow including edit and re-schedule. Duplicating a thinner version here
 * would create a second code path that could drift, and a bulk approve
 * spanning clients is exactly where a post gets approved for the wrong one.
 * This view triages and routes; the client queue decides.
 */
export default function AgencyApprovalsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<AgencyQueuePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsUpgrade, setNeedsUpgrade] = useState(false);
  const [clientFilter, setClientFilter] = useState<string>('all');

  useEffect(() => {
    getAgencyApprovalQueue()
      .then((r) => setPosts(r.posts))
      .catch((err: any) => {
        if (err?.status === 403) {
          setNeedsUpgrade(true);
        } else {
          setError("Couldn't load the approval queue. Try again.");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const clients = useMemo(() => {
    const seen = new Map<string, string>();
    posts.forEach((p) => seen.set(p.clientId, p.clientName));
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [posts]);

  const visible = clientFilter === 'all' ? posts : posts.filter((p) => p.clientId === clientFilter);

  const grouped = useMemo(() => {
    const m = new Map<string, AgencyQueuePost[]>();
    visible.forEach((p) => {
      const arr = m.get(p.clientId) || [];
      arr.push(p);
      m.set(p.clientId, arr);
    });
    return Array.from(m, ([clientId, items]) => ({ clientId, clientName: items[0].clientName, items }));
  }, [visible]);

  const openClientQueue = (clientId: string) => {
    setActiveClientId(clientId);
    router.push('/dashboard/approval-queue');
  };

  if (loading) return <div className="p-10 text-center text-body-sm" style={{ color: 'var(--text-secondary)' }}>Loading approvals…</div>;
  if (needsUpgrade) {
    return (
      <AgencyUpgradePrompt
        title="All Approvals"
        description="Reviewing every client's approval queue in one place is part of the Agency plan. Upgrade to triage posts across your whole portfolio."
      />
    );
  }
  if (error) return <div className="exec-card card-pad text-center text-body-sm" style={{ color: 'var(--text-secondary)' }}>{error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1" style={{ color: 'var(--text-primary)' }}>Approvals</h1>
        <p className="text-body-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
          {posts.length} post{posts.length === 1 ? '' : 's'} awaiting approval across your clients.
        </p>
      </div>

      {clients.length > 1 && (
        <div className="surface-tile p-1.5 flex gap-1.5 overflow-x-auto scrollbar-none" role="tablist" aria-label="Filter by client">
          {[{ id: 'all', name: 'All clients' }, ...clients].map((c) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={clientFilter === c.id}
              onClick={() => setClientFilter(c.id)}
              className="shrink-0 px-3.5 py-2 rounded-[var(--radius-md)] text-body-sm font-bold whitespace-nowrap touch-target"
              style={{
                backgroundColor: clientFilter === c.id ? 'var(--bg-surface-raised)' : 'transparent',
                color: clientFilter === c.id ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {grouped.length === 0 ? (
        <div className="exec-card card-pad text-center">
          <CheckSquare className="h-6 w-6 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>Nothing awaiting approval.</p>
        </div>
      ) : (
        grouped.map((g) => (
          <div key={g.clientId} className="exec-card card-pad">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-h3" style={{ color: 'var(--text-primary)' }}>{g.clientName}</h2>
                <p className="text-caption mt-1" style={{ color: 'var(--text-muted)' }}>
                  {g.items.length} post{g.items.length === 1 ? '' : 's'} waiting
                </p>
              </div>
              <button
                onClick={() => openClientQueue(g.clientId)}
                className="btn-secondary px-4 py-2.5 rounded-[var(--radius-md)] text-body-sm font-bold flex items-center gap-2 touch-target"
              >
                <span>Review</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {g.items.slice(0, 5).map((p) => (
                <div key={p.id} className="surface-tile p-3.5 flex items-start gap-3">
                  {p.thumbnailUrl && (
                    // Plain img: these are Vercel Blob URLs of arbitrary
                    // dimensions and next/image would need each host
                    // allow-listed for what is a small preview thumbnail.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.thumbnailUrl} alt="" className="h-12 w-12 rounded-[var(--radius-sm)] object-cover shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-body-sm line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                      {p.caption || 'No caption yet'}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-caption" style={{ color: 'var(--text-muted)' }}>
                      {p.platforms.map((pl) => <span key={pl}>{pl}</span>)}
                      {p.scheduledAt && <span>{new Date(p.scheduledAt).toLocaleString()}</span>}
                    </div>
                  </div>
                </div>
              ))}
              {g.items.length > 5 && (
                <p className="text-caption" style={{ color: 'var(--text-muted)' }}>
                  and {g.items.length - 5} more
                </p>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

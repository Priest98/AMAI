"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Gem, ArrowRight, TrendingUp, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { getCreatorOverview, CreatorOverview, HEALTH_META, healthColor, createClient } from '@/lib/agency';
import { getBillingSummary, BillingSummary } from '@/lib/billing';
import { setActiveClientId } from '@/lib/api';

/**
 * Inline "add second account" dialog -- deliberately NOT a link to
 * /dashboard/clients. That page (and its AddClientDialog) fetches
 * getPortfolio(), which is Agency-only (AgencyEntitlementGuard checks
 * `clientManagement`, which is false for Creator on purpose -- see
 * plans.config.ts). A Creator user landing on /dashboard/clients gets
 * bounced to an "upgrade to Agency" prompt despite already being on a paid
 * plan that includes a second account, which is exactly backwards. This
 * calls the same underlying createClient() (POST
 * organizations/:id/brands), which only requires OrganizationAccessGuard
 * and is enforced server-side by canCreateBrand's real maxBrands check, so
 * a Creator org still can't create a 3rd account even if this dialog is
 * reused elsewhere later.
 */
function AddAccountDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createClient(name.trim());
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Couldn't add this account. Try again.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ backgroundColor: 'rgba(10,11,20,0.6)' }}>
      <div className="exec-card card-pad w-full max-w-md space-y-5" role="dialog" aria-modal="true" aria-labelledby="add-account-title">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="add-account-title" className="text-h3" style={{ color: 'var(--text-primary)' }}>Add your second account</h2>
            <p className="text-body-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              You'll connect its TikTok account and start posting separately from your first one right after.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="btn-icon-glass h-9 w-9 flex items-center justify-center touch-target">
            <X className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="account-name" className="text-body-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Account name
            </label>
            <input
              id="account-name"
              autoFocus
              className="input-field w-full h-11 px-3.5 mt-2"
              placeholder="e.g. My Second Brand"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {error && <p className="text-body-sm" style={{ color: 'var(--accent-error)' }}>{error}</p>}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="btn-primary-gradient px-5 py-2.5 rounded-[var(--radius-md)] text-body-sm font-bold touch-target disabled:opacity-60"
            >
              {saving ? 'Adding…' : 'Add account'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary px-5 py-2.5 rounded-[var(--radius-md)] text-body-sm font-bold touch-target">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Creator Command Center: the two-managed-account overview for
 * PlanTier.CREATOR (see CreatorEntitlementGuard on the backend, which is
 * the real enforcement -- this page only decides what to render).
 *
 * Deliberately not a smaller Agency page: no client-workspace switcher, no
 * approval-queue/calendar rollups. Just the two accounts, the shared post
 * budget, and one honest cross-account read -- Oyinca watching two accounts
 * side by side for one person, not a scaled-down client management console.
 */
export default function CreatorCommandCenterPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<CreatorOverview | null>(null);
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingAccount, setAddingAccount] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([getCreatorOverview(), getBillingSummary()])
      .then(([o, b]) => { setOverview(o); setBilling(b); })
      .catch(() => setError("Couldn't load your Command Center. Try again."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const isCreator = billing?.entitlements?.tier === 'CREATOR';

  const openAccount = (brandId: string) => {
    setActiveClientId(brandId);
    router.push('/dashboard');
  };

  if (loading) {
    return <div className="p-10 text-center text-body-sm" style={{ color: 'var(--text-secondary)' }}>Loading your Command Center…</div>;
  }

  if (error) {
    return (
      <div className="exec-card card-pad text-center">
        <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>{error}</p>
      </div>
    );
  }

  if (billing && !isCreator) {
    return (
      <div className="page-shell space-y-6">
        <div>
          <h1 className="text-h1" style={{ color: 'var(--text-primary)' }}>Creator Command Center</h1>
          <p className="text-body-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
            Run two TikTok accounts side by side with real cross-account intelligence.
          </p>
        </div>
        <div className="exec-card card-pad space-y-4">
          <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
            The Command Center is part of the Creator plan. Upgrade to manage a second account and see which one is
            actually performing better, with real numbers.
          </p>
          <Link
            href="/dashboard/settings?tab=billing"
            className="btn-primary-gradient inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-md)] text-body-sm font-bold touch-target"
          >
            <Zap className="h-4 w-4" />
            <span>View plans</span>
          </Link>
        </div>
      </div>
    );
  }

  const o = overview!;
  const posts = o.usage.posts;
  const percentUsed = posts.limit === -1 ? 0 : Math.min(100, Math.round((posts.used / Math.max(posts.limit, 1)) * 100));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1" style={{ color: 'var(--text-primary)' }}>Creator Command Center</h1>
        <p className="text-body-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
          Both your accounts, at a glance.
        </p>
      </div>

      {/* Shared post budget: Creator's post limit is org-wide, not
          per-account, so this is the one number that only makes sense shown
          once, above both account cards rather than duplicated on each. */}
      <div className="exec-card card-pad">
        <div className="flex items-center justify-between gap-3">
          <span className="text-caption font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Post usage</span>
          <span className="text-body-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            {posts.used} / {posts.limit === -1 ? 'Unlimited' : posts.limit} posts
            {posts.limit !== -1 && <span style={{ color: 'var(--text-muted)' }}> · {posts.remaining} remaining</span>}
          </span>
        </div>
        {posts.limit !== -1 && (
          <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface-sunken)' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${percentUsed}%`, backgroundColor: percentUsed >= 90 ? 'var(--accent-warning)' : 'var(--accent-secondary)' }}
            />
          </div>
        )}
      </div>

      {/* Cross-account intelligence: only ever names a real, computed
          winner (see BrandsService.getCreatorOverview) -- if there isn't
          enough measured data yet, it says exactly that instead of a
          plausible-sounding guess. */}
      <div className="exec-card card-pad">
        <div className="flex items-center gap-2">
          <Gem className="h-4 w-4 shrink-0" style={{ color: 'var(--accent-secondary)' }} />
          <h2 className="text-h3" style={{ color: 'var(--text-primary)' }}>Cross-account intelligence</h2>
        </div>
        {o.hasEnoughDataForComparison && o.crossAccountRecommendation ? (
          <p className="text-body-sm mt-2 leading-relaxed" style={{ color: 'var(--text-primary)' }}>
            {o.crossAccountRecommendation}
          </p>
        ) : (
          <p className="text-body-sm mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Oyinca will compare your two accounts once both have published and had a few posts measured. Check back
            soon.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {o.accounts.map((acc) => {
          const avgEngagement = acc.measuredCount > 0 ? Math.round(acc.totalEngagement / acc.measuredCount) : null;
          return (
            <button
              key={acc.brandId}
              type="button"
              onClick={() => openAccount(acc.brandId)}
              className="surface-tile p-5 text-left transition-all duration-200 hover:opacity-95"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-body font-bold truncate" style={{ color: 'var(--text-primary)' }}>{acc.name}</p>
                  {acc.industry && (
                    <p className="text-caption mt-0.5" style={{ color: 'var(--text-muted)' }}>{acc.industry}</p>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 mt-1" style={{ color: 'var(--text-muted)' }} />
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {acc.connections.length === 0 && (
                  <span className="text-caption" style={{ color: 'var(--text-muted)' }}>No accounts connected</span>
                )}
                {acc.connections.map((conn) => {
                  const meta = HEALTH_META[conn.health];
                  return (
                    <span
                      key={conn.id}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-caption font-semibold"
                      style={{ backgroundColor: 'var(--bg-surface-sunken)', color: 'var(--text-secondary)' }}
                      title={meta.label}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: healthColor(meta.tone) }} />
                      {conn.platform}
                    </span>
                  );
                })}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-caption" style={{ color: 'var(--text-muted)' }}>Published ({o.windowDays}d)</p>
                  <p className="text-body font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{acc.publishedCount}</p>
                </div>
                <div>
                  <p className="text-caption" style={{ color: 'var(--text-muted)' }}>Avg. engagement/post</p>
                  <p className="text-body font-bold mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-primary)' }}>
                    {avgEngagement != null ? (
                      <>
                        <TrendingUp className="h-3.5 w-3.5" style={{ color: 'var(--accent-secondary)' }} />
                        {avgEngagement}
                      </>
                    ) : 'Not enough data'}
                  </p>
                </div>
              </div>

              {acc.connectionIssueCount > 0 && (
                <p className="mt-3 text-caption font-semibold" style={{ color: 'var(--accent-warning)' }}>
                  {acc.connectionIssueCount} connection issue{acc.connectionIssueCount === 1 ? '' : 's'}
                </p>
              )}
            </button>
          );
        })}

        {/* Fewer than 2 accounts exist yet -- an honest empty slot rather
            than hiding the fact that the second account hasn't been added.
            Opens the inline dialog above, NOT a link to /dashboard/clients
            (see AddAccountDialog's doc comment for why that page is wrong
            for Creator). */}
        {o.accounts.length < 2 && (
          <button
            type="button"
            onClick={() => setAddingAccount(true)}
            className="surface-tile p-5 flex flex-col items-center justify-center text-center gap-2"
            style={{ borderStyle: 'dashed', borderWidth: 1, borderColor: 'var(--card-border)' }}
          >
            <Plus className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
            <p className="text-body-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Add your second account</p>
            <p className="text-caption" style={{ color: 'var(--text-muted)' }}>Your Creator plan includes up to 2 managed accounts.</p>
          </button>
        )}
      </div>

      {addingAccount && <AddAccountDialog onClose={() => setAddingAccount(false)} onCreated={load} />}
    </div>
  );
}

"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, ArrowRight, X } from 'lucide-react';
import { getPortfolio, createClient, Portfolio, PortfolioClient, HEALTH_META, healthColor, expiryLabel } from '@/lib/agency';
import { setActiveClientId } from '@/lib/api';
import AgencyUpgradePrompt from '@/components/dashboard/AgencyUpgradePrompt';

/**
 * Client management. Search, triage and open a client, or add a new one.
 *
 * Creation goes through the existing entitlement-gated endpoint, so a
 * Free/Pro organization hitting its maxBrands cap gets the real server-side
 * reason rather than a client-side guess at the limit.
 */

type Filter = 'all' | 'attention';

function AddClientDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
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
      // Entitlement failures carry a useful, user-safe reason from the
      // server (e.g. plan brand cap); anything else gets a generic message.
      setError(err?.message || "Couldn't create this client. Try again.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ backgroundColor: 'rgba(10,11,20,0.6)' }}>
      <div className="exec-card card-pad w-full max-w-md space-y-5" role="dialog" aria-modal="true" aria-labelledby="add-client-title">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="add-client-title" className="text-h3" style={{ color: 'var(--text-primary)' }}>Add client</h2>
            <p className="text-body-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              You can connect their social accounts after creating them.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="btn-icon-glass h-9 w-9 flex items-center justify-center touch-target">
            <X className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="client-name" className="text-body-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Business name
            </label>
            <input
              id="client-name"
              autoFocus
              className="input-field w-full h-11 px-3.5 mt-2"
              placeholder="e.g. Luxe Fashion"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-body-sm" style={{ color: 'var(--accent-error)' }}>{error}</p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="btn-primary-gradient px-5 py-2.5 rounded-[var(--radius-md)] text-body-sm font-bold touch-target disabled:opacity-60"
            >
              {saving ? 'Creating…' : 'Create client'}
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

function ClientRow({ client, onOpen }: { client: PortfolioClient; onOpen: (id: string) => void }) {
  return (
    <div className="surface-tile p-4 flex flex-col lg:flex-row lg:items-center gap-4">
      <div className="min-w-0 lg:flex-1">
        <p className="text-body font-bold truncate" style={{ color: 'var(--text-primary)' }}>{client.name}</p>
        {client.industry && (
          <p className="text-caption mt-0.5" style={{ color: 'var(--text-muted)' }}>{client.industry}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 lg:flex-1">
        {client.connections.length === 0 && (
          <span className="text-caption" style={{ color: 'var(--text-muted)' }}>No accounts connected</span>
        )}
        {client.connections.map((c) => {
          const meta = HEALTH_META[c.health];
          return (
            <span
              key={c.id}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-caption font-semibold"
              style={{ backgroundColor: 'var(--bg-surface-sunken)', color: 'var(--text-secondary)' }}
              title={expiryLabel(c) || meta.label}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: healthColor(meta.tone) }} />
              {c.platform}
            </span>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption lg:flex-1" style={{ color: 'var(--text-secondary)' }}>
        <span>{client.scheduledCount} scheduled</span>
        <span>{client.awaitingApprovalCount} awaiting</span>
        {client.connectionIssueCount > 0 && (
          <span style={{ color: 'var(--accent-warning)' }}>
            {client.connectionIssueCount} issue{client.connectionIssueCount === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => onOpen(client.id)}
        className="btn-secondary shrink-0 px-4 py-2.5 rounded-[var(--radius-md)] text-body-sm font-bold flex items-center gap-2 touch-target"
      >
        <span>Open</span>
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function ClientsPage() {
  const router = useRouter();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [adding, setAdding] = useState(false);
  const [needsUpgrade, setNeedsUpgrade] = useState(false);

  const load = () => {
    setLoading(true);
    setNeedsUpgrade(false);
    getPortfolio()
      .then(setPortfolio)
      .catch((err: any) => {
        if (err?.status === 403) {
          setNeedsUpgrade(true);
        } else {
          setError("Couldn't load your clients. Try again.");
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const visible = useMemo(() => {
    if (!portfolio) return [];
    const q = query.trim().toLowerCase();
    return portfolio.clients.filter((c) => {
      if (filter === 'attention' && c.connectionIssueCount === 0) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || (c.industry || '').toLowerCase().includes(q);
    });
  }, [portfolio, query, filter]);

  const openClient = (id: string) => {
    setActiveClientId(id);
    router.push('/dashboard');
  };

  if (loading) {
    return <div className="p-10 text-center text-body-sm" style={{ color: 'var(--text-secondary)' }}>Loading clients…</div>;
  }
  if (needsUpgrade) {
    return (
      <AgencyUpgradePrompt
        title="Clients"
        description="Client management is part of the Agency plan. Upgrade to add client workspaces, switch between them and see your whole portfolio in one place."
      />
    );
  }
  if (error) {
    return <div className="exec-card card-pad text-center text-body-sm" style={{ color: 'var(--text-secondary)' }}>{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h1" style={{ color: 'var(--text-primary)' }}>Clients</h1>
          <p className="text-body-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
            {portfolio?.clientCount ?? 0} client{portfolio?.clientCount === 1 ? '' : 's'} in this workspace.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="btn-primary-gradient px-5 py-2.5 rounded-[var(--radius-md)] text-body-sm font-bold flex items-center gap-2 touch-target"
        >
          <Plus className="h-4 w-4" />
          <span>Add client</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          <input
            className="input-field w-full h-11 pl-10 pr-3.5"
            placeholder="Search clients"
            aria-label="Search clients"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="surface-tile p-1.5 flex gap-1.5" role="tablist" aria-label="Filter clients">
          {([['all', 'All'], ['attention', 'Needs attention']] as [Filter, string][]).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={filter === id}
              onClick={() => setFilter(id)}
              className="px-3.5 py-2 rounded-[var(--radius-md)] text-body-sm font-bold whitespace-nowrap touch-target"
              style={{
                backgroundColor: filter === id ? 'var(--bg-surface-raised)' : 'transparent',
                color: filter === id ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="exec-card card-pad text-center">
          <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
            {portfolio?.clients.length === 0
              ? 'No clients yet. Add your first client to get started.'
              : 'No clients match this search.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((c) => <ClientRow key={c.id} client={c} onOpen={openClient} />)}
        </div>
      )}

      {adding && <AddClientDialog onClose={() => setAdding(false)} onCreated={load} />}
    </div>
  );
}

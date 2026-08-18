"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Search, Plus, Check } from 'lucide-react';
import { getPortfolio, PortfolioClient, HEALTH_META, healthColor } from '@/lib/agency';
import { getBrandId, setActiveClientId } from '@/lib/api';

/**
 * Header client switcher for Agency workspaces.
 *
 * Renders nothing at all unless the organization actually has more than one
 * client, so Free/Pro users never see an affordance that has no meaning for
 * them. Switching writes the active client id (see lib/api.ts) and reloads
 * the current route so every brand-scoped fetch picks up the new context.
 *
 * The selected id is a UI convenience only -- the server re-verifies
 * membership on every brand-scoped request, so this cannot be used to reach
 * another organization's data.
 */
export default function ClientSwitcher() {
  const router = useRouter();
  const [clients, setClients] = useState<PortfolioClient[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const activeId = getBrandId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getPortfolio()
      .then((p) => setClients(p.clients))
      .catch(() => setClients([]));
  }, []);

  // Close on outside click and on Escape -- a dropdown pinned in a sticky
  // header is easy to strand open otherwise.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (clients.length < 2) return null;

  const active = clients.find((c) => c.id === activeId) || clients[0];
  const q = query.trim().toLowerCase();
  const visible = q ? clients.filter((c) => c.name.toLowerCase().includes(q)) : clients;

  const choose = (id: string) => {
    setActiveClientId(id);
    setOpen(false);
    router.refresh();
    // Full reload so in-memory state on the current page re-reads the new
    // client rather than showing the previous one until navigation.
    if (typeof window !== 'undefined') window.location.reload();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-md)] text-body-sm font-semibold touch-target max-w-[9rem] sm:max-w-[14rem]"
        style={{ backgroundColor: 'var(--glass-card-bg)', border: '1px solid var(--glass-card-border)', color: 'var(--text-primary)' }}
      >
        <span className="truncate">{active?.name || 'Select client'}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Switch client"
          className="absolute right-0 mt-2 w-[17rem] max-w-[85vw] rounded-[var(--radius-lg)] p-2 z-50 glass-panel"
        >
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            <input
              autoFocus
              className="input-field w-full h-10 pl-9 pr-3"
              placeholder="Search clients"
              aria-label="Search clients"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="mt-2 max-h-64 overflow-y-auto">
            {visible.length === 0 && (
              <p className="text-caption px-2 py-3" style={{ color: 'var(--text-muted)' }}>No clients match.</p>
            )}
            {visible.map((c) => {
              const isActive = c.id === active?.id;
              const worst = c.connections.find((x) => x.health !== 'CONNECTED' && x.health !== 'UNKNOWN');
              const tone = worst ? HEALTH_META[worst.health].tone : 'ok';
              return (
                <button
                  key={c.id}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => choose(c.id)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-[var(--radius-md)] text-left touch-target"
                  style={{ backgroundColor: isActive ? 'var(--accent-secondary-subtle)' : 'transparent' }}
                >
                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: healthColor(tone) }} />
                  <span className="text-body-sm font-semibold truncate flex-1" style={{ color: 'var(--text-primary)' }}>
                    {c.name}
                  </span>
                  {isActive && <Check className="h-4 w-4 shrink-0" style={{ color: 'var(--accent-secondary)' }} />}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => { setOpen(false); router.push('/dashboard/clients'); }}
            className="w-full flex items-center gap-2 px-2.5 py-2.5 mt-1 rounded-[var(--radius-md)] text-body-sm font-semibold touch-target"
            style={{ borderTop: '1px solid var(--card-border)', color: 'var(--accent-secondary)' }}
          >
            <Plus className="h-4 w-4" />
            <span>Add client</span>
          </button>
        </div>
      )}
    </div>
  );
}

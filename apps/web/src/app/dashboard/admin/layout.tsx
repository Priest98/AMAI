"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { apiFetch } from '@/lib/api';

/**
 * Shell for AMAI's internal Admin dashboard (/dashboard/admin/*) --
 * cross-organization data no customer, including an Agency owner, should
 * ever see. Deliberately not linked from the main sidebar nav: only
 * reachable by URL, and every /admin/* backend route independently
 * enforces PlatformAdminGuard (platformRole OWNER/ADMIN) regardless of
 * whether someone finds this URL -- THAT is the real security boundary,
 * not this layout.
 *
 * This layout's own gate is a UX convenience, not a security control: the
 * JWT issued at login doesn't carry a platformRole claim (JwtStrategy
 * re-reads the live User row from the database on every request instead),
 * so there is no client-side signal to trust anyway. Rather than decode
 * the token and guess, this makes one real request (GET /admin/overview)
 * and reads the server's actual 403/200 verdict -- if that ever
 * disagrees with what a specific /admin/* sub-page independently returns,
 * the sub-page's own guard wins; this only decides what chrome to show.
 */

const NAV_ITEMS = [
  { href: '/dashboard/admin', label: 'Overview' },
  { href: '/dashboard/admin/system-health', label: 'System health' },
  { href: '/dashboard/admin/customers', label: 'Customers' },
  { href: '/dashboard/admin/errors', label: 'Incidents' },
  { href: '/dashboard/admin/logs', label: 'Logs' },
  { href: '/dashboard/admin/audit-log', label: 'Audit log' },
];

type GateState = 'checking' | 'allowed' | 'denied';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [gate, setGate] = useState<GateState>('checking');

  useEffect(() => {
    let cancelled = false;
    apiFetch('/admin/overview')
      .then(() => {
        if (!cancelled) setGate('allowed');
      })
      .catch((err: any) => {
        if (cancelled) return;
        // Any failure defaults to denied -- fails closed on network errors
        // too, not just a real 403, since there's no safe reason to show
        // admin chrome when we can't confirm access.
        setGate('denied');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (gate === 'checking') {
    return (
      <div className="p-10 text-center text-body-sm" style={{ color: 'var(--text-secondary)' }}>
        Checking admin access…
      </div>
    );
  }

  if (gate === 'denied') {
    return (
      <div className="p-10 max-w-md mx-auto text-center">
        <ShieldAlert className="h-6 w-6 mx-auto mb-3" style={{ color: 'var(--accent-error)' }} />
        <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
          This area is restricted to AMAI administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 px-1 mb-5 flex-wrap">
        <ShieldCheck className="h-4 w-4" style={{ color: 'var(--accent-success)' }} />
        <span className="text-caption" style={{ color: 'var(--text-muted)' }}>Internal only -- not visible to customers</span>
      </div>
      <nav className="flex items-center gap-1 mb-6 border-b overflow-x-auto" style={{ borderColor: 'var(--glass-card-border)' }}>
        {NAV_ITEMS.map((item) => {
          const active = item.href === '/dashboard/admin' ? pathname === item.href : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="text-caption font-semibold px-3 py-2.5 whitespace-nowrap border-b-2 transition-colors"
              style={{
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderColor: active ? 'var(--accent-primary)' : 'transparent',
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}

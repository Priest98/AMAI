"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import Badge from '@/components/ui/Badge';

interface CustomerRow {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  owner: { id: string; email: string; fullName: string | null } | null;
  brandCount: number;
  memberCount: number;
  plan: 'FREE' | 'PRO' | 'CREATOR' | 'AGENCY';
  subscriptionStatus: string | null;
  currency: string | null;
}

interface CustomersResponse {
  total: number;
  page: number;
  limit: number;
  customers: CustomerRow[];
}

const PLAN_VARIANT: Record<string, 'neutral' | 'purple' | 'success'> = {
  FREE: 'neutral',
  PRO: 'purple',
  CREATOR: 'purple',
  AGENCY: 'success',
};

export default function CustomersPage() {
  const [data, setData] = useState<CustomersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), limit: '25', ...(search ? { search } : {}) });
    apiFetch<CustomersResponse>(`/admin/customers?${qs.toString()}`)
      .then(setData)
      .catch((e: any) => setError(e?.message || "Couldn't load customers."))
      .finally(() => setLoading(false));
  }, [page, search]);

  return (
    <div className="page-shell space-y-6">
      <div>
        <h1 className="text-h1" style={{ color: 'var(--text-primary)' }}>Customers</h1>
        <p className="text-body-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Every organization on the platform.</p>
      </div>

      <input
        type="text"
        placeholder="Search by name or slug…"
        value={search}
        onChange={(e) => {
          setPage(1);
          setSearch(e.target.value);
        }}
        className="w-full max-w-sm rounded-[var(--radius-md)] border px-3 py-2 text-body-sm"
        style={{ borderColor: 'var(--glass-card-border)', backgroundColor: 'var(--glass-card-bg)', color: 'var(--text-primary)' }}
      />

      {loading ? (
        <div className="p-10 text-center text-body-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</div>
      ) : error || !data ? (
        <div className="p-10 max-w-md mx-auto text-center">
          <ShieldAlert className="h-6 w-6 mx-auto mb-3" style={{ color: 'var(--accent-error)' }} />
          <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>{error || 'Not available.'}</p>
        </div>
      ) : data.customers.length === 0 ? (
        <div className="exec-card card-pad text-center text-body-sm" style={{ color: 'var(--text-secondary)' }}>
          No customers match.
        </div>
      ) : (
        <div className="space-y-2">
          {data.customers.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/admin/customers/${c.id}`}
              className="exec-card exec-card-interactive card-pad flex items-center justify-between gap-3 flex-wrap"
            >
              <div>
                <p className="text-body font-semibold" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                <p className="text-caption" style={{ color: 'var(--text-muted)' }}>
                  {c.owner?.email || 'No owner on record'} · {c.brandCount} brand{c.brandCount === 1 ? '' : 's'} · {c.memberCount} member{c.memberCount === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={PLAN_VARIANT[c.plan] || 'neutral'}>{c.plan}</Badge>
                {c.subscriptionStatus && c.subscriptionStatus !== 'ACTIVE' && (
                  <Badge variant="warning">{c.subscriptionStatus}</Badge>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {data && data.total > data.limit && (
        <div className="flex items-center justify-between">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="text-caption font-semibold disabled:opacity-40"
            style={{ color: 'var(--text-secondary)' }}
          >
            Previous
          </button>
          <span className="text-caption" style={{ color: 'var(--text-muted)' }}>
            Page {data.page} of {Math.ceil(data.total / data.limit)}
          </span>
          <button
            disabled={page >= Math.ceil(data.total / data.limit)}
            onClick={() => setPage((p) => p + 1)}
            className="text-caption font-semibold disabled:opacity-40"
            style={{ color: 'var(--text-secondary)' }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

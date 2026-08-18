"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import Badge from '@/components/ui/Badge';

interface ErrorGroupRow {
  id: string;
  title: string;
  service: string | null;
  severity: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  occurrenceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  resolved: boolean;
}

interface ErrorsResponse {
  total: number;
  page: number;
  limit: number;
  groups: ErrorGroupRow[];
}

const SEVERITY_VARIANT: Record<string, 'neutral' | 'warning' | 'success'> = {
  DEBUG: 'neutral',
  INFO: 'neutral',
  WARN: 'warning',
  ERROR: 'warning',
  FATAL: 'warning',
};

export default function ErrorsPage() {
  const [data, setData] = useState<ErrorsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), limit: '25', resolved: String(showResolved) });
    apiFetch<ErrorsResponse>(`/admin/errors?${qs.toString()}`)
      .then(setData)
      .catch((e: any) => setError(e?.message || "Couldn't load errors."))
      .finally(() => setLoading(false));
  }, [page, showResolved]);

  return (
    <div className="page-shell space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-h1" style={{ color: 'var(--text-primary)' }}>Errors</h1>
          <p className="text-body-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Deduplicated, grouped exceptions captured across the app.
          </p>
        </div>
        <label className="flex items-center gap-2 text-caption" style={{ color: 'var(--text-secondary)' }}>
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => {
              setPage(1);
              setShowResolved(e.target.checked);
            }}
          />
          Show resolved
        </label>
      </div>

      {loading ? (
        <div className="p-10 text-center text-body-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</div>
      ) : error || !data ? (
        <div className="p-10 max-w-md mx-auto text-center">
          <ShieldAlert className="h-6 w-6 mx-auto mb-3" style={{ color: 'var(--accent-error)' }} />
          <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>{error || 'Not available.'}</p>
        </div>
      ) : data.groups.length === 0 ? (
        <div className="exec-card card-pad text-center text-body-sm" style={{ color: 'var(--text-secondary)' }}>
          {showResolved ? 'No resolved errors.' : 'No unresolved errors -- clean.'}
        </div>
      ) : (
        <div className="space-y-2">
          {data.groups.map((g) => (
            <Link
              key={g.id}
              href={`/dashboard/admin/errors/${g.id}`}
              className="exec-card exec-card-interactive card-pad flex items-center justify-between gap-3 flex-wrap"
            >
              <div className="min-w-0">
                <p className="text-body-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{g.title}</p>
                <p className="text-caption" style={{ color: 'var(--text-muted)' }}>
                  {g.service || 'unknown service'} · last seen {new Date(g.lastSeenAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={SEVERITY_VARIANT[g.severity] || 'neutral'}>{g.severity}</Badge>
                <span className="text-caption font-bold" style={{ color: 'var(--text-primary)' }}>×{g.occurrenceCount}</span>
                {g.resolved && <Badge variant="success">Resolved</Badge>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {data && data.total > data.limit && (
        <div className="flex items-center justify-between">
          <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="text-caption font-semibold disabled:opacity-40" style={{ color: 'var(--text-secondary)' }}>
            Previous
          </button>
          <span className="text-caption" style={{ color: 'var(--text-muted)' }}>Page {data.page} of {Math.ceil(data.total / data.limit)}</span>
          <button disabled={page >= Math.ceil(data.total / data.limit)} onClick={() => setPage((p) => p + 1)} className="text-caption font-semibold disabled:opacity-40" style={{ color: 'var(--text-secondary)' }}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import Badge from '@/components/ui/Badge';

interface AuditEntry {
  id: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  result: 'SUCCESS' | 'FAILURE';
  source: 'DASHBOARD' | 'TELEGRAM' | 'API';
  createdAt: string;
  adminUser: { id: string; email: string; fullName: string | null };
}

interface AuditLogResponse {
  total: number;
  page: number;
  limit: number;
  entries: AuditEntry[];
}

export default function AuditLogPage() {
  const [data, setData] = useState<AuditLogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), limit: '50' });
    apiFetch<AuditLogResponse>(`/admin/audit-log?${qs.toString()}`)
      .then(setData)
      .catch((e: any) => setError(e?.message || "Couldn't load the audit log."))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="page-shell space-y-6">
      <div>
        <h1 className="text-h1" style={{ color: 'var(--text-primary)' }}>Audit log</h1>
        <p className="text-body-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Every privileged action taken through the Admin dashboard -- who, what, when, from where.
        </p>
      </div>

      {loading ? (
        <div className="p-10 text-center text-body-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</div>
      ) : error || !data ? (
        <div className="p-10 max-w-md mx-auto text-center">
          <ShieldAlert className="h-6 w-6 mx-auto mb-3" style={{ color: 'var(--accent-error)' }} />
          <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>{error || 'Not available.'}</p>
        </div>
      ) : data.entries.length === 0 ? (
        <div className="exec-card card-pad text-center text-body-sm" style={{ color: 'var(--text-secondary)' }}>
          No admin actions recorded yet.
        </div>
      ) : (
        <div className="space-y-2">
          {data.entries.map((entry) => (
            <div key={entry.id} className="exec-card card-pad flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-body-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{entry.action}</p>
                <p className="text-caption" style={{ color: 'var(--text-muted)' }}>
                  {entry.adminUser?.email || 'unknown admin'}
                  {entry.resourceType && ` · ${entry.resourceType}${entry.resourceId ? ` #${entry.resourceId.slice(0, 8)}` : ''}`}
                  {' · '}{new Date(entry.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={entry.result === 'SUCCESS' ? 'success' : 'warning'}>{entry.result}</Badge>
                <Badge variant="neutral">{entry.source}</Badge>
              </div>
            </div>
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

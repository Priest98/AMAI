"use client";

import React, { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import Badge from '@/components/ui/Badge';

interface LogEvent {
  id: string;
  message: string;
  service: string | null;
  endpoint: string | null;
  httpStatus: number | null;
  userId: string | null;
  requestId: string | null;
  createdAt: string;
}

interface LogsResponse {
  total: number;
  page: number;
  limit: number;
  events: LogEvent[];
}

export default function LogsPage() {
  const [data, setData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), limit: '50' });
    apiFetch<LogsResponse>(`/admin/logs?${qs.toString()}`)
      .then(setData)
      .catch((e: any) => setError(e?.message || "Couldn't load logs."))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="page-shell space-y-6">
      <div>
        <h1 className="text-h1" style={{ color: 'var(--text-primary)' }}>Logs</h1>
        <p className="text-body-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Real captured-exception events, flat and ungrouped. Not a general request log -- Oyinca doesn't
          have a unified application logger beyond this yet, so this is scoped to real errors only.
        </p>
      </div>

      {loading ? (
        <div className="p-10 text-center text-body-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</div>
      ) : error || !data ? (
        <div className="p-10 max-w-md mx-auto text-center">
          <ShieldAlert className="h-6 w-6 mx-auto mb-3" style={{ color: 'var(--accent-error)' }} />
          <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>{error || 'Not available.'}</p>
        </div>
      ) : data.events.length === 0 ? (
        <div className="exec-card card-pad text-center text-body-sm" style={{ color: 'var(--text-secondary)' }}>
          No events captured yet.
        </div>
      ) : (
        <div className="space-y-2">
          {data.events.map((e) => (
            <div key={e.id} className="exec-card card-pad flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-body-sm truncate" style={{ color: 'var(--text-primary)' }}>{e.message}</p>
                <p className="text-caption" style={{ color: 'var(--text-muted)' }}>
                  {e.endpoint || 'no endpoint'} · {new Date(e.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {e.httpStatus && <Badge variant="neutral">{e.httpStatus}</Badge>}
                {e.service && <span className="text-caption" style={{ color: 'var(--text-muted)' }}>{e.service}</span>}
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

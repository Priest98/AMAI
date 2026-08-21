"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import Badge from '@/components/ui/Badge';

interface ErrorEventRow {
  id: string;
  message: string;
  stackTrace: string | null;
  service: string | null;
  endpoint: string | null;
  httpStatus: number | null;
  userId: string | null;
  requestId: string | null;
  environment: string | null;
  deploymentSha: string | null;
  context: unknown;
  createdAt: string;
}

interface ErrorGroupDetail {
  group: {
    id: string;
    title: string;
    signature: string;
    service: string | null;
    environment: string | null;
    severity: string;
    occurrenceCount: number;
    firstSeenAt: string;
    lastSeenAt: string;
    resolved: boolean;
    status: 'OPEN' | 'INVESTIGATING' | 'IDENTIFIED' | 'FIX_IN_PROGRESS' | 'RESOLVED' | 'IGNORED';
    subsystem: string | null;
    source: 'EXCEPTION' | 'HEALTH_CHECK';
    acknowledgedBy: string | null;
    acknowledgedAt: string | null;
  };
  recentEvents: ErrorEventRow[];
}

export default function ErrorDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [data, setData] = useState<ErrorGroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const load = () => {
    if (!id) return;
    setLoading(true);
    apiFetch<ErrorGroupDetail>(`/admin/errors/${id}`)
      .then(setData)
      .catch((e: any) => setError(e?.message || "Couldn't load this error."))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const toggleResolved = async () => {
    if (!data) return;
    setActing(true);
    try {
      const action = data.group.resolved ? 'unresolve' : 'resolve';
      await apiFetch(`/admin/errors/${id}/${action}`, { method: 'POST' });
      load();
    } catch (e: any) {
      setError(e?.message || 'Failed to update.');
    } finally {
      setActing(false);
    }
  };

  const ignore = async () => {
    setActing(true);
    try {
      await apiFetch(`/admin/errors/${id}/ignore`, { method: 'POST' });
      load();
    } catch (e: any) {
      setError(e?.message || 'Failed to update.');
    } finally {
      setActing(false);
    }
  };

  const acknowledge = async () => {
    setActing(true);
    try {
      await apiFetch(`/admin/errors/${id}/acknowledge`, { method: 'POST' });
      load();
    } catch (e: any) {
      setError(e?.message || 'Failed to update.');
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-body-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</div>;
  }

  if (error || !data) {
    return (
      <div className="p-10 max-w-md mx-auto text-center">
        <ShieldAlert className="h-6 w-6 mx-auto mb-3" style={{ color: 'var(--accent-error)' }} />
        <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>{error || 'Not available.'}</p>
      </div>
    );
  }

  const { group, recentEvents } = data;

  return (
    <div className="page-shell space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-h1" style={{ color: 'var(--text-primary)' }}>{group.title}</h1>
          <p className="text-caption mt-1" style={{ color: 'var(--text-muted)' }}>
            {group.subsystem || group.service || 'unknown'} · {group.source === 'HEALTH_CHECK' ? 'health check' : 'exception'} · {group.environment || 'unknown env'} · {group.occurrenceCount} occurrence{group.occurrenceCount === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {group.status !== 'IGNORED' && !group.acknowledgedAt && (
            <button
              onClick={acknowledge}
              disabled={acting}
              className="text-caption font-semibold px-3 py-1.5 rounded-[var(--radius-md)] border disabled:opacity-50"
              style={{ borderColor: 'var(--glass-card-border)', color: 'var(--text-secondary)' }}
            >
              Acknowledge
            </button>
          )}
          {group.status !== 'IGNORED' && (
            <button
              onClick={ignore}
              disabled={acting}
              className="text-caption font-semibold px-3 py-1.5 rounded-[var(--radius-md)] border disabled:opacity-50"
              style={{ borderColor: 'var(--glass-card-border)', color: 'var(--text-secondary)' }}
            >
              Ignore
            </button>
          )}
          <button
            onClick={toggleResolved}
            disabled={acting}
            className="text-caption font-semibold px-3 py-1.5 rounded-[var(--radius-md)] border disabled:opacity-50"
            style={{ borderColor: 'var(--glass-card-border)', color: 'var(--text-primary)' }}
          >
            {group.resolved ? 'Reopen' : 'Mark resolved'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={group.severity === 'WARN' || group.severity === 'ERROR' || group.severity === 'FATAL' ? 'warning' : 'neutral'}>
          {group.severity}
        </Badge>
        {group.status === 'IGNORED' ? <Badge variant="neutral">Ignored</Badge> : group.resolved && <Badge variant="success">Resolved</Badge>}
        {group.acknowledgedAt && <Badge variant="neutral">Acknowledged</Badge>}
        <span className="text-caption" style={{ color: 'var(--text-muted)' }}>
          first seen {new Date(group.firstSeenAt).toLocaleString()} · last seen {new Date(group.lastSeenAt).toLocaleString()}
        </span>
      </div>

      <div className="space-y-3">
        <h2 className="text-overline" style={{ color: 'var(--text-muted)' }}>Recent occurrences (up to 20)</h2>
        {recentEvents.length === 0 ? (
          <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>Data unavailable.</p>
        ) : (
          recentEvents.map((e) => (
            <div key={e.id} className="exec-card card-pad space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-caption font-semibold" style={{ color: 'var(--text-primary)' }}>{new Date(e.createdAt).toLocaleString()}</p>
                <div className="flex items-center gap-2">
                  {e.httpStatus && <Badge variant="neutral">{e.httpStatus}</Badge>}
                  {e.endpoint && <span className="text-caption" style={{ color: 'var(--text-muted)' }}>{e.endpoint}</span>}
                </div>
              </div>
              <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>{e.message}</p>
              {e.stackTrace && (
                <pre className="text-caption overflow-x-auto p-2 rounded-[var(--radius-md)]" style={{ backgroundColor: 'var(--glass-card-bg)', color: 'var(--text-muted)' }}>
                  {e.stackTrace}
                </pre>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

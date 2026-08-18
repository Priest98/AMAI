"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import Badge from '@/components/ui/Badge';

interface CustomerDetail {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  owner: { id: string; email: string; fullName: string | null; lastLogin: string | null; createdAt: string } | null;
  subscription: {
    plan: 'FREE' | 'PRO' | 'AGENCY';
    status: string;
    currency: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  brands: { id: string; name: string; industry: string | null; timezone: string; createdAt: string }[];
  members: {
    id: string;
    userId: string;
    role: string;
    createdAt: string;
    user: { id: string; email: string; fullName: string | null; lastLogin: string | null };
  }[];
  activity: {
    failedPostsAllTime: number;
    publishedLast7d: number;
    expiredConnections: number;
    lastActivityAt: string | null;
  };
}

export default function CustomerDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [data, setData] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch<CustomerDetail>(`/admin/customers/${id}`)
      .then(setData)
      .catch((e: any) => setError(e?.message || "Couldn't load this customer."))
      .finally(() => setLoading(false));
  }, [id]);

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

  return (
    <div className="page-shell space-y-6">
      <div>
        <h1 className="text-h1" style={{ color: 'var(--text-primary)' }}>{data.name}</h1>
        <p className="text-body-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {data.slug} · created {new Date(data.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="exec-card card-pad space-y-2">
        <h2 className="text-overline" style={{ color: 'var(--text-muted)' }}>Subscription</h2>
        {data.subscription ? (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={data.subscription.plan === 'FREE' ? 'neutral' : data.subscription.plan === 'AGENCY' ? 'success' : 'purple'}>
              {data.subscription.plan}
            </Badge>
            <Badge variant={data.subscription.status === 'ACTIVE' ? 'success' : 'warning'}>{data.subscription.status}</Badge>
            <span className="text-caption" style={{ color: 'var(--text-muted)' }}>{data.subscription.currency}</span>
            {data.subscription.currentPeriodEnd && (
              <span className="text-caption" style={{ color: 'var(--text-muted)' }}>
                renews {new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}
              </span>
            )}
            {data.subscription.cancelAtPeriodEnd && <Badge variant="warning">Cancels at period end</Badge>}
          </div>
        ) : (
          <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>Data unavailable.</p>
        )}
      </div>

      <div className="exec-card card-pad space-y-2">
        <h2 className="text-overline" style={{ color: 'var(--text-muted)' }}>Owner</h2>
        {data.owner ? (
          <div>
            <p className="text-body-sm" style={{ color: 'var(--text-primary)' }}>{data.owner.fullName || data.owner.email}</p>
            <p className="text-caption" style={{ color: 'var(--text-muted)' }}>
              {data.owner.email} · last login {data.owner.lastLogin ? new Date(data.owner.lastLogin).toLocaleString() : 'never'}
            </p>
          </div>
        ) : (
          <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>Data unavailable.</p>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="exec-card card-pad">
          <p className="text-caption" style={{ color: 'var(--text-muted)' }}>Failed posts (all-time)</p>
          <p className="text-h1 mt-2" style={{ color: data.activity.failedPostsAllTime > 0 ? 'var(--accent-warning)' : 'var(--text-primary)' }}>
            {data.activity.failedPostsAllTime}
          </p>
        </div>
        <div className="exec-card card-pad">
          <p className="text-caption" style={{ color: 'var(--text-muted)' }}>Published (7d)</p>
          <p className="text-h1 mt-2" style={{ color: 'var(--text-primary)' }}>{data.activity.publishedLast7d}</p>
        </div>
        <div className="exec-card card-pad">
          <p className="text-caption" style={{ color: 'var(--text-muted)' }}>Expired connections</p>
          <p className="text-h1 mt-2" style={{ color: data.activity.expiredConnections > 0 ? 'var(--accent-warning)' : 'var(--text-primary)' }}>
            {data.activity.expiredConnections}
          </p>
        </div>
        <div className="exec-card card-pad">
          <p className="text-caption" style={{ color: 'var(--text-muted)' }}>Last activity</p>
          <p className="text-body-sm mt-2 font-semibold" style={{ color: 'var(--text-primary)' }}>
            {data.activity.lastActivityAt ? new Date(data.activity.lastActivityAt).toLocaleString() : 'No activity yet'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-overline" style={{ color: 'var(--text-muted)' }}>Brands ({data.brands.length})</h2>
        {data.brands.length === 0 ? (
          <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>No brands yet.</p>
        ) : (
          <div className="space-y-2">
            {data.brands.map((b) => (
              <div key={b.id} className="exec-card card-pad flex items-center justify-between">
                <p className="text-body-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{b.name}</p>
                <p className="text-caption" style={{ color: 'var(--text-muted)' }}>{b.industry || 'No industry set'} · {b.timezone}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-overline" style={{ color: 'var(--text-muted)' }}>Members ({data.members.length})</h2>
        {data.members.length === 0 ? (
          <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>No members yet.</p>
        ) : (
          <div className="space-y-2">
            {data.members.map((m) => (
              <div key={m.id} className="exec-card card-pad flex items-center justify-between flex-wrap gap-1">
                <p className="text-body-sm" style={{ color: 'var(--text-primary)' }}>{m.user.fullName || m.user.email}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="neutral">{m.role}</Badge>
                  <span className="text-caption" style={{ color: 'var(--text-muted)' }}>
                    {m.user.lastLogin ? `last seen ${new Date(m.user.lastLogin).toLocaleDateString()}` : 'never logged in'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

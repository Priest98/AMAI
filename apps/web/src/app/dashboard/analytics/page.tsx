"use client";
import Link from 'next/link';
import React, { useState, useEffect, useCallback } from 'react';
import { brandFetch } from '@/lib/api';
import { useEngineEvents, EngineEvent } from '@/lib/useEngineEvents';
import StatCard from '@/components/ui/StatCard';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonListRows } from '@/components/ui/Skeleton';
import { Reveal } from '@/components/ui/Reveal';
import { CheckCircle2, XCircle, CalendarClock, Clock, Loader2, Activity } from 'lucide-react';

interface CountedPost { id: string; status: string; }

const EVENT_LABEL: Record<string, string> = {
  MEDIA_UPLOADED: 'Media uploaded',
  ANALYSIS_STARTED: 'Analysing content',
  CAPTION_GENERATED: 'Caption generated',
  HASHTAGS_GENERATED: 'Hashtags generated',
  BEST_TIME_DETERMINED: 'Best time determined',
  APPROVAL_QUEUED: 'Sent to Approval Queue',
  AUTO_SCHEDULED: 'Auto-scheduled',
  POST_APPROVED: 'Post approved',
  POST_REJECTED: 'Post rejected',
  POST_EDITED: 'Post edited',
  PUBLISH_SUCCEEDED: 'Published',
  PUBLISH_FAILED: 'Publish failed',
  ACCOUNT_CONNECTED: 'Account connected',
  ACCOUNT_DISCONNECTED: 'Account disconnected',
  ENGINE_STATE_CHANGED: 'Engine state changed',
  APPROVAL_MODE_CHANGED: 'Approval mode changed',
};

export default function AnalyticsPage() {
  const [counts, setCounts] = useState({ pending: 0, scheduled: 0, published: 0, failed: 0 });
  const [logs, setLogs] = useState<EngineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const [stats, failed, events] = await Promise.all([
        brandFetch<{needsApprovalCount:number; scheduledCount:number; publishedCount:number}>('/posts/stats'),
        brandFetch<CountedPost[]>('/posts?status=FAILED'),
        brandFetch<EngineEvent[]>('/engine/activity'),
      ]);
      setCounts({ pending: stats.needsApprovalCount, scheduled: stats.scheduledCount, published: stats.publishedCount, failed: failed.length });
      setLogs(events);
    } catch (e) {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEngineEvents((event) => {
    setLogs((prev) => [event, ...prev.filter((entry) => entry.id !== event.id)].slice(0, 50));
    if (['POST_APPROVED', 'POST_REJECTED', 'APPROVAL_QUEUED', 'AUTO_SCHEDULED', 'PUBLISH_SUCCEEDED', 'PUBLISH_FAILED'].includes(event.type)) void load();
  });

  if (loading || loadError) return <section className="max-w-5xl mx-auto p-6 space-y-4" aria-busy={loading}><h1 className="text-h1">Analytics</h1><p role={loadError ? 'alert' : 'status'}>{loadError ? 'Analytics could not be loaded. Try again to see current figures.' : 'Loading publishing activity…'}</p>{loadError && <button className="btn-secondary touch-target px-4" onClick={() => { setLoading(true); void load(); }}>Retry analytics</button>}</section>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24 sm:pb-12">
      <div>
        <h1 className="text-h1" style={{ color: 'var(--text-primary)' }}>Analytics</h1>
        <p className="text-body-sm mt-1" style={{ color: 'var(--text-secondary)' }}>How your content is moving through Oyinca.</p>
      </div>

      <section className="border-y py-5 space-y-3" style={{ borderColor: 'var(--card-border)' }}>
        <h2 className="text-h3">{counts.failed > 0 ? 'Some posts need attention' : counts.pending > 0 ? 'Your next step is review' : counts.scheduled > 0 ? 'Your publishing plan is moving' : 'Build your publishing history'}</h2>
        <p className="text-body-sm">{counts.failed > 0 ? `${counts.failed} posts failed. Review their status before retrying.` : counts.pending > 0 ? `${counts.pending} posts are waiting for approval.` : counts.scheduled > 0 ? `${counts.scheduled} posts are scheduled. Check the calendar for timing.` : 'Upload content to start preparing your next posts.'}</p>
        <Link className="touch-target underline font-semibold" href={counts.failed > 0 ? '/dashboard/calendar' : counts.pending > 0 ? '/dashboard/approval-queue' : counts.scheduled > 0 ? '/dashboard/calendar' : '/dashboard/media'}>{counts.failed > 0 ? 'Review calendar' : counts.pending > 0 ? 'Review posts' : counts.scheduled > 0 ? 'View calendar' : 'Upload content'}</Link>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>These totals describe publishing activity, not audience reach or engagement.</p>
      </section>

      <Reveal className="glass-shell p-4 sm:p-5 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Clock className="h-4 w-4" style={{ color: 'var(--accent-warning)' }} />} label="Awaiting Approval" value={String(counts.pending)} helperText="In the queue" />
        <StatCard icon={<CalendarClock className="h-4 w-4" style={{ color: 'var(--accent-secondary)' }} />} label="Scheduled" value={String(counts.scheduled)} helperText="Queued to publish" />
        <StatCard icon={<CheckCircle2 className="h-4 w-4" style={{ color: 'var(--accent-success)' }} />} label="Published" value={String(counts.published)} helperText="Live posts" />
        <StatCard icon={<XCircle className="h-4 w-4" style={{ color: 'var(--accent-error)' }} />} label="Failed" value={String(counts.failed)} helperText="Needs attention" />
      </Reveal>

      <Reveal delay={0.1} className="exec-card overflow-hidden">
        <div className="p-5 border-b flex items-center space-x-2" style={{ borderColor: 'var(--card-border)' }}>
          <Activity className="h-4 w-4" style={{ color: 'var(--accent-success)' }} />
          <h2 className="text-h3" style={{ color: 'var(--text-primary)' }}>Oyinca Activity Log</h2>
        </div>

        {loading ? (
          <div className="p-5"><SkeletonListRows count={4} /></div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<Activity className="h-6 w-6" />}
            title="No activity yet"
            description="Upload media in the Media Library and every step Oyinca takes will show up here."
          />
        ) : (
          <div className="overflow-x-auto max-h-[32rem]">
            <table className="w-full text-sm text-left">
              <thead className="text-overline sticky top-0" style={{ backgroundColor: 'var(--bg-surface-sunken)', color: 'var(--text-muted)' }}>
                <tr>
                  <th scope="col" className="px-6 py-3 font-medium">Time</th>
                  <th scope="col" className="px-6 py-3 font-medium">Event</th>
                  <th scope="col" className="px-6 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t" style={{ borderColor: 'var(--card-border)' }}>
                    <td className="px-6 py-3 text-caption font-mono whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-3 text-body-sm font-semibold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>{EVENT_LABEL[log.type] || log.type}</td>
                    <td className="px-6 py-3 text-body-sm" style={{ color: 'var(--text-secondary)' }}>{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Reveal>
    </div>
  );
}

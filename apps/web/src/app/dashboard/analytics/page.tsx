"use client";
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

  const load = useCallback(async () => {
    try {
      const [pending, scheduled, published, failed, events] = await Promise.all([
        brandFetch<CountedPost[]>('/posts?status=NEEDS_APPROVAL'),
        brandFetch<CountedPost[]>('/posts?status=SCHEDULED'),
        brandFetch<CountedPost[]>('/posts?status=PUBLISHED'),
        brandFetch<CountedPost[]>('/posts?status=FAILED'),
        brandFetch<EngineEvent[]>('/engine/activity'),
      ]);
      setCounts({ pending: pending.length, scheduled: scheduled.length, published: published.length, failed: failed.length });
      setLogs(events);
    } catch (e) {
      console.error('Failed to load analytics', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEngineEvents((event) => setLogs((prev) => [event, ...prev].slice(0, 50)));

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24 sm:pb-12">
      <div>
        <h1 className="text-h1" style={{ color: 'var(--text-primary)' }}>Analytics</h1>
        <p className="text-body-sm mt-1" style={{ color: 'var(--text-secondary)' }}>How your content is moving through the AMAI Engine.</p>
      </div>

      <Reveal className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Clock className="h-4 w-4" style={{ color: 'var(--accent-warning)' }} />} label="Awaiting Approval" value={String(counts.pending)} helperText="In the queue" />
        <StatCard icon={<CalendarClock className="h-4 w-4" style={{ color: 'var(--accent-secondary)' }} />} label="Scheduled" value={String(counts.scheduled)} helperText="Queued to publish" />
        <StatCard icon={<CheckCircle2 className="h-4 w-4" style={{ color: 'var(--accent-success)' }} />} label="Published" value={String(counts.published)} helperText="Live posts" />
        <StatCard icon={<XCircle className="h-4 w-4" style={{ color: 'var(--accent-error)' }} />} label="Failed" value={String(counts.failed)} helperText="Needs attention" />
      </Reveal>

      <Reveal delay={0.1} className="exec-card overflow-hidden">
        <div className="p-5 border-b flex items-center space-x-2" style={{ borderColor: 'var(--card-border)' }}>
          <Activity className="h-4 w-4" style={{ color: 'var(--accent-success)' }} />
          <h2 className="text-h3" style={{ color: 'var(--text-primary)' }}>AMAI Engine Activity Log</h2>
        </div>

        {loading ? (
          <div className="p-5"><SkeletonListRows count={4} /></div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<Activity className="h-6 w-6" />}
            title="No activity yet"
            description="Upload media in the Media Library and every step the AMAI Engine takes will show up here."
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

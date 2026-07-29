"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { brandFetch } from '@/lib/api';
import { useEngineEvents, EngineEvent } from '@/lib/useEngineEvents';
import StatCard from '@/components/ui/StatCard';
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
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Analytics</h1>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">How your content is moving through the AMAI Engine.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Clock className="h-4 w-4 text-amber-400" />} label="Awaiting Approval" value={String(counts.pending)} helperText="In the queue" />
        <StatCard icon={<CalendarClock className="h-4 w-4 text-violet-400" />} label="Scheduled" value={String(counts.scheduled)} helperText="Queued to publish" />
        <StatCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />} label="Published" value={String(counts.published)} helperText="Live posts" />
        <StatCard icon={<XCircle className="h-4 w-4 text-red-400" />} label="Failed" value={String(counts.failed)} helperText="Needs attention" />
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-700 flex items-center space-x-2">
          <Activity className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">AMAI Engine Activity Log</h2>
        </div>

        {loading ? (
          <div className="py-12 flex items-center justify-center text-xs text-zinc-500"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">No activity yet</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Upload media in the Media Library and every step the AMAI Engine takes will show up here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[32rem]">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-700 uppercase sticky top-0">
                <tr>
                  <th scope="col" className="px-6 py-3 font-medium">Time</th>
                  <th scope="col" className="px-6 py-3 font-medium">Event</th>
                  <th scope="col" className="px-6 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-3 text-xs text-zinc-500 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-3 text-xs font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{EVENT_LABEL[log.type] || log.type}</td>
                    <td className="px-6 py-3 text-xs text-zinc-500">{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

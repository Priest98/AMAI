"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import StatCard from "@/components/ui/StatCard";
import Badge from "@/components/ui/Badge";
import { apiFetch, brandFetch, getBrandId } from '@/lib/api';
import { useEngineEvents } from '@/lib/useEngineEvents';
import {
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Pause,
  Radio,
  Folder,
  Upload,
  CalendarClock,
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const } },
};

interface DashPost {
  id: string;
  caption: string;
  status: string;
  scheduledAt: string | null;
  targets?: { platform: string }[];
}

export default function DashboardPage() {
  const [engineState, setEngineState] = useState<'ACTIVE' | 'PAUSED'>('ACTIVE');
  const [approvalMode, setApprovalMode] = useState<'MANUAL' | 'AUTO'>('MANUAL');
  const [pendingPosts, setPendingPosts] = useState<DashPost[]>([]);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [publishedCount, setPublishedCount] = useState(0);
  const [connectedAccountList, setConnectedAccountList] = useState<string[]>([]);
  const [mediaCount, setMediaCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchLiveData = useCallback(async () => {
    try {
      const [config, needsApproval, scheduled, published, accounts, media] = await Promise.all([
        brandFetch<{ state: 'ACTIVE' | 'PAUSED'; approvalMode: 'MANUAL' | 'AUTO' }>('/engine/state'),
        brandFetch<DashPost[]>('/posts?status=NEEDS_APPROVAL'),
        brandFetch<DashPost[]>('/posts?status=SCHEDULED'),
        brandFetch<DashPost[]>('/posts?status=PUBLISHED'),
        apiFetch<any>(`/oauth/accounts?brandId=${encodeURIComponent(getBrandId())}`).catch(() => null),
        brandFetch<any[]>('/media/assets').catch(() => []),
      ]);

      setEngineState(config.state);
      setApprovalMode(config.approvalMode);
      setPendingPosts(needsApproval);
      setScheduledCount(scheduled.length);
      setPublishedCount(published.length);
      setMediaCount(Array.isArray(media) ? media.length : 0);

      const labels: string[] = [];
      if (accounts?.socialAccounts) {
        accounts.socialAccounts.forEach((acc: any) => labels.push(`${acc.platform}: ${acc.handle}`));
      }
      if (accounts?.googleDrive?.status === 'CONNECTED') labels.push('Google Drive: Connected');
      setConnectedAccountList(labels);
    } catch (e) {
      console.error('Failed to fetch dashboard data', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLiveData(); }, [fetchLiveData]);

  useEngineEvents(() => { fetchLiveData(); });

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-7xl mx-auto pb-24 sm:pb-12"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            AMAI Workspace Dashboard
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Your AI social media manager, working in the background.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant={engineState === 'ACTIVE' ? 'success' : 'neutral'}>
            <span className="flex items-center space-x-1">
              {engineState === 'ACTIVE' ? <Zap className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              <span>{engineState === 'ACTIVE' ? 'AMAI Active' : 'AMAI Paused'}</span>
            </span>
          </Badge>
          <Badge variant={approvalMode === 'AUTO' ? 'warning' : 'purple'}>
            <span className="flex items-center space-x-1">
              <ShieldCheck className="h-3 w-3" />
              <span>{approvalMode === 'AUTO' ? 'Auto Approval' : 'Manual Approval'}</span>
            </span>
          </Badge>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Clock className="h-4 w-4 text-amber-400" />}
          label="Approval Queue"
          value={String(pendingPosts.length)}
          helperText={pendingPosts.length === 0 ? 'All caught up' : 'Posts awaiting review'}
        />
        <StatCard
          icon={<CalendarClock className="h-4 w-4 text-purple-400" />}
          label="Scheduled"
          value={String(scheduledCount)}
          helperText="Queued to publish"
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
          label="Published"
          value={String(publishedCount)}
          helperText="Live on your accounts"
        />
        <StatCard
          icon={<Folder className="h-4 w-4 text-sky-400" />}
          label="Media Assets"
          value={String(mediaCount)}
          helperText="In your library"
        />
      </div>

      {/* ── 3-Column Middle Dashboard Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          <motion.div variants={itemVariants} className="rounded-xl border p-4 sm:p-5 space-y-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Approval Queue ({pendingPosts.length})
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  AI-prepared posts waiting for your review.
                </p>
              </div>
              <Link href="/dashboard/approval-queue" className="link-neutral text-xs font-semibold flex items-center space-x-1 hover:underline">
                <span>View Queue</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {pendingPosts.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed text-xs space-y-2" style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)' }}>
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
                <p className="font-bold" style={{ color: 'var(--text-primary)' }}>All caught up!</p>
                <p style={{ color: 'var(--text-secondary)' }}>Upload new media and the AMAI Engine will generate posts here.</p>
                <Link href="/dashboard/media" className="inline-flex items-center space-x-1 text-xs font-bold text-amber-400 hover:underline pt-1">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload Media Now</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingPosts.slice(0, 3).map((post) => (
                  <div key={post.id} className="p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs" style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)' }}>
                    <div className="space-y-1 max-w-xl">
                      <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border border-rose-500/20 bg-rose-500/10 text-rose-400">
                        {post.targets?.[0]?.platform || 'INSTAGRAM'}
                      </span>
                      <p className="line-clamp-2 font-medium" style={{ color: 'var(--text-primary)' }}>{post.caption}</p>
                    </div>
                    <Link href="/dashboard/approval-queue" className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-xs touch-target btn-emerald-cta shrink-0">
                      Review Post
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        <motion.aside variants={itemVariants} className="lg:col-span-4 space-y-4">
          <div className="rounded-xl border p-4 sm:p-5 space-y-5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Connected Accounts</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Where AMAI publishes for you</p>
              </div>
              <Badge variant={connectedAccountList.length > 0 ? 'success' : 'neutral'}>
                {connectedAccountList.length > 0 ? 'Connected' : 'None yet'}
              </Badge>
            </div>

            {connectedAccountList.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Connect Instagram or TikTok to let AMAI publish automatically.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {connectedAccountList.map((label) => (
                  <li key={label} className="text-xs flex items-center space-x-2" style={{ color: 'var(--text-primary)' }}>
                    <Radio className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor: 'var(--card-border)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{mediaCount} media assets</span>
              <Link href="/dashboard/integrations" className="link-neutral text-xs font-semibold hover:underline">
                Manage →
              </Link>
            </div>
          </div>
        </motion.aside>
      </div>
    </motion.div>
  );
}

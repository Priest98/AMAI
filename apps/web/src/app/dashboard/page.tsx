"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import StatCard from "@/components/ui/StatCard";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import EngineWorkflowVisualization from "@/components/engine/EngineWorkflowVisualization";
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

interface DashStats {
  needsApprovalCount: number;
  scheduledCount: number;
  publishedCount: number;
  mediaCount: number;
  pendingPreview: DashPost[];
}

export default function DashboardPage() {
  const [engineState, setEngineState] = useState<'ACTIVE' | 'PAUSED'>('ACTIVE');
  const [approvalMode, setApprovalMode] = useState<'MANUAL' | 'AUTO'>('MANUAL');
  const [pendingPosts, setPendingPosts] = useState<DashPost[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [publishedCount, setPublishedCount] = useState(0);
  const [connectedAccountList, setConnectedAccountList] = useState<string[]>([]);
  const [mediaCount, setMediaCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Previously this fired 6 separate requests on every mount and every SSE
  // engine event (3 of them full `/posts?status=X` payloads just to read
  // `.length`). Now it's 3 requests total, and the post list is a
  // counts-only `/posts/stats` call instead of transferring full
  // caption/hashtag/target/media rows the dashboard never renders.
  const fetchLiveData = useCallback(async () => {
    try {
      const [config, stats, accounts] = await Promise.all([
        brandFetch<{ state: 'ACTIVE' | 'PAUSED'; approvalMode: 'MANUAL' | 'AUTO' }>('/engine/state'),
        brandFetch<DashStats>('/posts/stats'),
        apiFetch<any>(`/oauth/accounts?brandId=${encodeURIComponent(getBrandId())}`).catch(() => null),
      ]);

      setEngineState(config.state);
      setApprovalMode(config.approvalMode);
      setPendingPosts(stats.pendingPreview);
      setPendingCount(stats.needsApprovalCount);
      setScheduledCount(stats.scheduledCount);
      setPublishedCount(stats.publishedCount);
      setMediaCount(stats.mediaCount);

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
      className="space-y-8 max-w-7xl mx-auto pb-24 sm:pb-12"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-h1" style={{ color: 'var(--text-primary)' }}>
            Workspace overview
          </h1>
          <p className="text-body-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Your AI social media manager, working in the background.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={engineState === 'ACTIVE' ? 'success' : 'neutral'}>
            <span className="flex items-center space-x-1.5">
              {engineState === 'ACTIVE' ? <Zap className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              <span>{engineState === 'ACTIVE' ? 'AMAI Active' : 'AMAI Paused'}</span>
            </span>
          </Badge>
          <Badge variant={approvalMode === 'AUTO' ? 'warning' : 'purple'}>
            <span className="flex items-center space-x-1.5">
              <ShieldCheck className="h-3 w-3" />
              <span>{approvalMode === 'AUTO' ? 'Auto Approval' : 'Manual Approval'}</span>
            </span>
          </Badge>
        </div>
      </div>

      {/* ── AMAI Engine — live and center-stage on the flagship page ── */}
      <motion.div variants={itemVariants}>
        <EngineWorkflowVisualization />
      </motion.div>

      {/* KPI Grid — grouped on a glassy shell panel, echoing the
          card-cluster-on-a-panel composition from the reference dashboard */}
      <div className="glass-shell p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Clock className="h-4 w-4 text-amber-400" />}
          label="Approval Queue"
          value={String(pendingCount)}
          helperText={pendingCount === 0 ? 'All caught up' : 'Posts awaiting review'}
        />
        <StatCard
          icon={<CalendarClock className="h-4 w-4 text-blue-400" />}
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
          <motion.div variants={itemVariants} className="exec-card p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-h3" style={{ color: 'var(--text-primary)' }}>
                  Approval Queue ({pendingCount})
                </h2>
                <p className="text-body-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  AI-prepared posts waiting for your review.
                </p>
              </div>
              <Link href="/dashboard/approval-queue" className="link-neutral text-body-sm font-semibold flex items-center gap-1 hover:underline shrink-0">
                <span>View Queue</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {pendingCount === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="h-6 w-6" />}
                title="All caught up"
                description="Upload new media and the AMAI Engine will generate posts here automatically."
                actionLabel="Upload media"
                onAction={() => { window.location.href = '/dashboard/media'; }}
              />
            ) : (
              <div className="space-y-2.5">
                {pendingPosts.slice(0, 3).map((post) => (
                  <div key={post.id} className="surface-tile p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5 max-w-xl">
                      <Badge variant="purple">{post.targets?.[0]?.platform || 'INSTAGRAM'}</Badge>
                      <p className="text-body-sm line-clamp-2 font-medium" style={{ color: 'var(--text-primary)' }}>{post.caption}</p>
                    </div>
                    <Link href="/dashboard/approval-queue" className="btn-emerald-cta px-4 py-2 rounded-[var(--radius-md)] text-xs font-bold touch-target shrink-0 text-center">
                      Review Post
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        <motion.aside variants={itemVariants} className="lg:col-span-4 space-y-4">
          <div className="exec-card p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-h3" style={{ color: 'var(--text-primary)' }}>Connected Accounts</h3>
                <p className="text-body-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Where AMAI publishes for you</p>
              </div>
              <Badge variant={connectedAccountList.length > 0 ? 'success' : 'neutral'}>
                {connectedAccountList.length > 0 ? 'Connected' : 'None yet'}
              </Badge>
            </div>

            {connectedAccountList.length === 0 ? (
              <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
                Connect Instagram or TikTok to let AMAI publish automatically.
              </p>
            ) : (
              <ul className="space-y-2">
                {connectedAccountList.map((label) => (
                  <li key={label} className="text-body-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Radio className="h-3.5 w-3.5" style={{ color: 'var(--accent-success)' }} />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="pt-4 border-t flex items-center justify-between text-body-sm" style={{ borderColor: 'var(--card-border)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{mediaCount} media assets</span>
              <Link href="/dashboard/integrations" className="link-neutral text-body-sm font-semibold hover:underline">
                Manage →
              </Link>
            </div>
          </div>
        </motion.aside>
      </div>
    </motion.div>
  );
}

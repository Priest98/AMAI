"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import StatCard from "@/components/ui/StatCard";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import EngineWorkflowVisualization from "@/components/engine/EngineWorkflowVisualization";
import { apiFetch, brandFetch } from '@/lib/api';
import { useEngineEvents } from '@/lib/useEngineEvents';
import { getBillingSummary, BillingSummary } from '@/lib/billing';
import UsageBar from '@/components/billing/UsageBar';
import { TikTokLogo } from '@/components/icons/platform-logos';
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
  Crown,
  AlertTriangle,
  Sparkles,
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

interface ConnectedAccountSummary {
  platform: string;
  handle: string;
  status: 'CONNECTED' | 'EXPIRED' | 'DISCONNECTED' | string;
}

interface DashStats {
  needsApprovalCount: number;
  scheduledCount: number;
  publishedCount: number;
  mediaCount: number;
  pendingPreview: DashPost[];
}

interface CalendarInsightsData {
  totalScheduled: number;
  uncoveredPillars: string[];
  backToBackRepeats: { firstPostId: string; secondPostId: string; category: string; scheduledAt: string | null }[];
}

const CATEGORY_LABEL: Record<string, string> = {
  promotional: 'Promotional',
  educational: 'Educational',
  behind_the_scenes: 'Behind the scenes',
  product: 'Product',
  general: 'General',
};

export default function DashboardPage() {
  const [engineState, setEngineState] = useState<'ACTIVE' | 'PAUSED'>('ACTIVE');
  const [approvalMode, setApprovalMode] = useState<'MANUAL' | 'AUTO'>('MANUAL');
  const [pendingPosts, setPendingPosts] = useState<DashPost[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [publishedCount, setPublishedCount] = useState(0);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccountSummary[]>([]);
  const [googleDriveConnected, setGoogleDriveConnected] = useState(false);
  const [mediaCount, setMediaCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [insights, setInsights] = useState<CalendarInsightsData | null>(null);

  useEffect(() => {
    getBillingSummary().then(setBilling).catch(() => {});
    // Same real, already-built endpoint the calendar page uses
    // (GET /engine/calendar-insights) -- every figure here comes from an
    // actual query against scheduled posts, nothing is invented for the
    // briefing.
    brandFetch<CalendarInsightsData>('/engine/calendar-insights?days=30').then(setInsights).catch(() => {});
  }, []);

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
        apiFetch<any>('/oauth/accounts').catch(() => null),
      ]);

      setEngineState(config.state);
      setApprovalMode(config.approvalMode);
      setPendingPosts(stats.pendingPreview);
      setPendingCount(stats.needsApprovalCount);
      setScheduledCount(stats.scheduledCount);
      setPublishedCount(stats.publishedCount);
      setMediaCount(stats.mediaCount);

      const accountSummaries: ConnectedAccountSummary[] = (accounts?.socialAccounts || []).map((acc: any) => ({
        platform: acc.platform,
        handle: acc.handle,
        status: acc.status,
      }));
      setConnectedAccounts(accountSummaries);
      setGoogleDriveConnected(accounts?.googleDrive?.status === 'CONNECTED');
    } catch (e) {
      console.error('Failed to fetch dashboard data', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLiveData(); }, [fetchLiveData]);

  useEngineEvents(() => { fetchLiveData(); });

  const tiktokAccounts = connectedAccounts.filter((a) => a.platform === 'TIKTOK');
  const otherAccounts = connectedAccounts.filter((a) => a.platform !== 'TIKTOK');

  // Time-of-day greeting for the "AI manager briefing" framing (Oyinca
  // spec: "Good morning. I've been working on your TikTok."). Computed
  // client-side from the visitor's own clock -- no server round trip and
  // no assumption about time zone.
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 max-w-7xl mx-auto pb-24 sm:pb-12"
    >
      <div className="relative overflow-hidden rounded-[28px]">
        {/* Subtle Higgsfield-generated ambient accent -- deliberately faint
            (low opacity + gradient fade into the page background) since this
            is a working tool, not a marketing surface: it should read as
            premium atmosphere, never compete with the KPI numbers or engine
            visualization below it. */}
        <div className="absolute inset-0 -z-10" aria-hidden="true">
          <Image
            src="https://d8j0ntlcm91z4.cloudfront.net/user_3HXsou9653KJM9YD320GPTi1aul/hf_20260806_150052_8d115273-ebd0-4397-8a29-2bc3f9a0ac2c.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-25"
          />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, transparent 0%, var(--bg-base) 92%)' }}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1 py-6 sm:py-8">
          <div>
            <h1
              className="text-3xl sm:text-4xl font-bold tracking-tight"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}
            >
              {greeting}. I&rsquo;ve been working on your TikTok.
            </h1>
            <p className="text-body-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
              Here&rsquo;s today&rsquo;s briefing.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={engineState === 'ACTIVE' ? 'success' : 'neutral'}>
              <span className="flex items-center space-x-1.5">
                {engineState === 'ACTIVE' ? <Zap className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                <span>{engineState === 'ACTIVE' ? 'Oyinca Active' : 'Oyinca Paused'}</span>
              </span>
            </Badge>
            <Badge variant={approvalMode === 'AUTO' ? 'warning' : 'purple'}>
              <span className="flex items-center space-x-1.5">
                <ShieldCheck className="h-3 w-3" />
                <span>{approvalMode === 'AUTO' ? 'Auto Approval' : 'Manual Approval'}</span>
              </span>
            </Badge>
            <Link
              href="/dashboard/media"
              className="btn-emerald-cta px-4 py-2 rounded-[var(--radius-md)] text-xs font-bold touch-target shrink-0 flex items-center gap-1.5"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Upload Content</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Oyinca — live and center-stage on the flagship page ── */}
      <motion.div variants={itemVariants}>
        <EngineWorkflowVisualization />
      </motion.div>

      {/* "Today's Briefing" -- the Oyinca-spec framing for what used to be a
          bare KPI grid: same real numbers (approval queue, scheduled,
          published, media), presented as the manager's status report rather
          than an analytics widget. */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-h3" style={{ color: 'var(--text-primary)' }}>Today&rsquo;s Briefing</h2>
      </div>
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

      {/* "Oyinca recommends" -- built entirely on top of the real,
          already-existing GET /engine/calendar-insights data (content
          pillar coverage + back-to-back category repeats over what's
          actually scheduled). No score, ranking or suggestion is invented:
          when there isn't enough scheduled content to say anything
          meaningful, Oyinca says so instead of guessing. */}
      <motion.div variants={itemVariants} className="exec-card p-5 sm:p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" style={{ color: 'var(--accent-warning)' }} />
          <h2 className="text-h3" style={{ color: 'var(--text-primary)' }}>Oyinca recommends</h2>
        </div>

        {!insights || insights.totalScheduled === 0 ? (
          <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
            I need a little more data before I can make a reliable recommendation. Schedule a few posts
            and I&rsquo;ll start flagging gaps and repeats in your content calendar.
          </p>
        ) : insights.uncoveredPillars.length === 0 && insights.backToBackRepeats.length === 0 ? (
          <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
            Your content calendar looks balanced for the next 30 days &mdash; nothing to flag right now.
          </p>
        ) : (
          <div className="space-y-2.5">
            {insights.uncoveredPillars.length > 0 && (
              <div className="surface-tile p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-body-sm" style={{ color: 'var(--text-primary)' }}>
                  No posts scheduled about: {insights.uncoveredPillars.join(', ')}.
                </p>
                <Link href="/dashboard/calendar" className="link-neutral text-body-sm font-semibold flex items-center gap-1 hover:underline shrink-0">
                  <span>Review calendar</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
            {insights.backToBackRepeats.length > 0 && (
              <div className="surface-tile p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-body-sm" style={{ color: 'var(--text-primary)' }}>
                  {insights.backToBackRepeats.length} pair{insights.backToBackRepeats.length === 1 ? '' : 's'} of consecutive posts share the same category
                  ({Array.from(new Set(insights.backToBackRepeats.map((r) => CATEGORY_LABEL[r.category] || r.category))).join(', ')}).
                </p>
                <Link href="/dashboard/calendar" className="link-neutral text-body-sm font-semibold flex items-center gap-1 hover:underline shrink-0">
                  <span>Review calendar</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>
        )}
      </motion.div>

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
                description="Upload new media and Oyinca will generate posts here automatically."
                actionLabel="Upload media"
                onAction={() => { window.location.href = '/dashboard/media'; }}
              />
            ) : (
              <div className="space-y-2.5">
                {pendingPosts.slice(0, 3).map((post) => (
                  <div key={post.id} className="surface-tile p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5 max-w-xl">
                      <Badge variant="purple">{post.targets?.[0]?.platform || 'TIKTOK'}</Badge>
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
                <h3 className="text-h3" style={{ color: 'var(--text-primary)' }}>TikTok Connection</h3>
                <p className="text-body-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Where Oyinca publishes for you</p>
              </div>
            </div>

            {(() => {
              if (tiktokAccounts.length === 0) {
                return (
                  <div className="surface-tile p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <TikTokLogo style={{ color: 'var(--text-secondary)' }} className="h-4 w-4" />
                      <span className="text-body-sm font-medium" style={{ color: 'var(--text-primary)' }}>Not connected</span>
                    </div>
                    <Link href="/dashboard/integrations" className="btn-emerald-cta inline-flex px-4 py-2 rounded-[var(--radius-md)] text-xs font-bold touch-target">
                      Connect TikTok
                    </Link>
                  </div>
                );
              }

              return (
                <ul className="space-y-2">
                  {tiktokAccounts.map((acc) => {
                    const healthy = acc.status === 'CONNECTED';
                    return (
                      <li key={`${acc.platform}-${acc.handle}`} className="surface-tile p-3 flex items-center justify-between gap-3">
                        <span className="text-body-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                          {healthy ? (
                            <Radio className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--accent-success)' }} />
                          ) : (
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--accent-warning)' }} />
                          )}
                          <span>{acc.handle}</span>
                        </span>
                        {!healthy && (
                          <Link href="/dashboard/integrations" className="link-neutral text-xs font-semibold hover:underline shrink-0">
                            Reconnect
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              );
            })()}

            {(otherAccounts.length > 0 || googleDriveConnected) && (
              <div className="pt-3 border-t space-y-1.5" style={{ borderColor: 'var(--card-border)' }}>
                {otherAccounts.map((acc) => (
                  <p key={`${acc.platform}-${acc.handle}`} className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {acc.platform}: {acc.handle}
                  </p>
                ))}
                {googleDriveConnected && (
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Google Drive: Connected</p>
                )}
              </div>
            )}

            <div className="pt-4 border-t flex items-center justify-between text-body-sm" style={{ borderColor: 'var(--card-border)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{mediaCount} media assets</span>
              <Link href="/dashboard/integrations" className="link-neutral text-body-sm font-semibold hover:underline">
                Manage →
              </Link>
            </div>
          </div>

          {/* Plan-aware widget: Free gets usage bars + an upgrade nudge,
              Pro/Agency just gets a quiet plan badge -- no upgrade nagging
              for users who already pay (spec #21: "Do not show irrelevant
              Free upgrade prompts to active Pro users"). */}
          {billing && (
            <div className="exec-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Crown className="h-3.5 w-3.5" style={{ color: 'var(--accent-warning)' }} />
                  <h3 className="text-h3" style={{ color: 'var(--text-primary)' }}>{billing.entitlements.displayName} Plan</h3>
                </div>
                <Link href="/dashboard/settings?tab=billing" className="link-neutral text-body-sm font-semibold hover:underline">
                  {billing.plan === 'FREE' ? 'Upgrade' : 'Manage'}
                </Link>
              </div>

              {billing.plan === 'FREE' ? (
                <div className="space-y-3">
                  <UsageBar label="AI Generations" used={billing.usage.aiGenerations.used} limit={billing.usage.aiGenerations.limit} planName="Free" />
                  <UsageBar label="Posts" used={billing.usage.posts.used} limit={billing.usage.posts.limit} planName="Free" />
                </div>
              ) : (
                <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
                  {billing.usage.aiGenerations.used} AI generations · {billing.usage.posts.used} posts this month.
                </p>
              )}
            </div>
          )}
        </motion.aside>
      </div>
    </motion.div>
  );
}

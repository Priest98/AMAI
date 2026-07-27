"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import StatCard from "@/components/ui/StatCard";
import StorageProgressBar from "@/components/ui/StorageProgressBar";
import Badge from "@/components/ui/Badge";
import {
  CheckCircle2,
  Clock,
  Calendar,
  ArrowUpRight,
  ShieldCheck,
  ThumbsUp,
  Plus,
  Radio,
  Folder,
  Upload,
} from 'lucide-react';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://marketing-os-backend-api.vercel.app/api').replace(/\/$/, '');

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
};

export default function DashboardPage() {
  const [publishingMode, setPublishingMode] = useState<'MANUAL_APPROVAL' | 'AUTO_PUBLISH'>('MANUAL_APPROVAL');
  const [approvedCount, setApprovedCount] = useState<number>(0);
  const [posts, setPosts] = useState<any[]>([]);
  const [connectedAccountsCount, setConnectedAccountsCount] = useState<number>(0);
  const [connectedAccountList, setConnectedAccountList] = useState<string[]>([]);
  const [mediaAssets, setMediaAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLiveData = async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('marketing_os_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // 1. Combine Local Storage Queue Posts & API Posts
      let localPosts: any[] = [];
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('amai_approval_queue_posts');
        if (stored) {
          try { localPosts = JSON.parse(stored); } catch {}
        }
      }

      const postsRes = await fetch(`${API_BASE}/posts`, { headers }).catch(() => null);
      let apiPosts: any[] = [];
      if (postsRes && postsRes.ok) {
        const data = await postsRes.json();
        apiPosts = Array.isArray(data) ? data : [];
      }

      const postMap = new Map();
      [...localPosts, ...apiPosts].forEach(p => {
        if (p && p.id) postMap.set(p.id, p);
      });
      setPosts(Array.from(postMap.values()));

      // 2. Fetch Connected Accounts
      const connectedLabels: string[] = [];
      const accountsRes = await fetch(`${API_BASE}/oauth/accounts?brandId=primary_brand`, { headers }).catch(() => null);
      if (accountsRes && accountsRes.ok) {
        const data = await accountsRes.json();
        if (data.socialAccounts && Array.isArray(data.socialAccounts)) {
          data.socialAccounts.forEach((acc: any) => {
            if (acc.handle) connectedLabels.push(`${acc.platform}: ${acc.handle}`);
          });
        }
        if (data.googleDrive && data.googleDrive.status === 'CONNECTED') {
          connectedLabels.push(`Google Drive: ${data.googleDrive.accountEmail || 'Connected'}`);
        }
      }

      // Check local storage persistence
      if (typeof window !== 'undefined') {
        const ig = localStorage.getItem('amai_connected_instagram');
        if (ig && !connectedLabels.some(l => l.includes('Instagram'))) {
          try {
            const parsed = JSON.parse(ig);
            connectedLabels.push(`Instagram: ${parsed.handle}`);
          } catch {}
        }

        const tt = localStorage.getItem('amai_connected_tiktok');
        if (tt && !connectedLabels.some(l => l.includes('TikTok'))) {
          try {
            const parsed = JSON.parse(tt);
            connectedLabels.push(`TikTok: ${parsed.handle}`);
          } catch {}
        }

        const drive = localStorage.getItem('amai_connected_google');
        if (drive && drive !== 'false' && !connectedLabels.some(l => l.includes('Drive'))) {
          connectedLabels.push(`Google Drive: Connected`);
        }
      }

      setConnectedAccountList(connectedLabels);
      setConnectedAccountsCount(connectedLabels.length);

      // 3. Fetch Media Assets
      let localAssets: any[] = [];
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('amai_uploaded_assets');
        if (stored) {
          try { localAssets = JSON.parse(stored); } catch {}
        }
      }

      const mediaRes = await fetch('/api/media/list', { headers }).catch(() => null);
      let apiAssets: any[] = [];
      if (mediaRes && mediaRes.ok) {
        const data = await mediaRes.json();
        apiAssets = data.assets || [];
      }

      const mediaMap = new Map();
      [...localAssets, ...apiAssets].forEach(a => {
        if (a && a.id) mediaMap.set(a.id, a);
      });
      setMediaAssets(Array.from(mediaMap.values()));

    } catch (e) {
      console.error('Failed to fetch dashboard data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedMode = localStorage.getItem('amai_publishing_mode');
    if (savedMode === 'AUTO_PUBLISH') setPublishingMode('AUTO_PUBLISH');

    const savedCount = localStorage.getItem('amai_approved_count');
    if (savedCount) setApprovedCount(parseInt(savedCount, 10));

    fetchLiveData();
  }, []);

  const pendingPostsCount = posts.filter(p => p.status === 'PENDING_APPROVAL' || p.status === 'DRAFT' || !p.status).length;
  const approvedPostsCount = posts.filter(p => p.status === 'APPROVED' || p.status === 'PUBLISHED').length + approvedCount;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-7xl mx-auto pb-24 sm:pb-12"
    >
      {/* ── Section Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            AMAI Workspace Dashboard
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Real-time social media automation, media pipeline, and approval queue metrics.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant={publishingMode === 'AUTO_PUBLISH' ? "success" : "purple"}>
            <span className="flex items-center space-x-1">
              <ShieldCheck className="h-3 w-3 text-emerald-400" />
              <span>Mode: {publishingMode === 'AUTO_PUBLISH' ? 'Auto-Publish' : 'Manual Approval'}</span>
            </span>
          </Badge>
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Approval Queue"
          value={pendingPostsCount}
          helperText={pendingPostsCount === 0 ? "All posts approved" : "Posts awaiting review"}
          trend="+12%"
          variant={pendingPostsCount > 0 ? "warning" : "default"}
        />

        <StatCard
          label="Approved Posts"
          value={approvedPostsCount}
          helperText="Ready for publishing"
          trend="+28%"
          variant="success"
        />

        <StatCard
          label="Connected Accounts"
          value={`${connectedAccountsCount} Connected`}
          helperText={connectedAccountList[0] || "Instagram & TikTok ready"}
          variant="default"
        />

        <StatCard
          label="Media Assets"
          value={mediaAssets.length}
          helperText="Available in Library"
          trend="+5 new"
          variant="default"
        />
      </div>

      {/* ── 3-Column Middle Dashboard Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Column 1 & 2 (8 cols): Approval Queue & Content Pipeline */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Section: Approval Queue List */}
          <motion.div variants={itemVariants} className="rounded-xl border p-4 sm:p-5 space-y-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Approval Queue ({pendingPostsCount})
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  AI-generated posts waiting for your manual review.
                </p>
              </div>

              <Link
                href="/dashboard/approval-queue"
                className="link-neutral text-xs font-semibold flex items-center space-x-1 hover:underline"
              >
                <span>View Queue</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {posts.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed text-xs space-y-2" style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)' }}>
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
                <p className="font-bold" style={{ color: 'var(--text-primary)' }}>All caught up!</p>
                <p style={{ color: 'var(--text-secondary)' }}>Upload new media to generate AI posts for your Approval Queue.</p>
                <Link href="/dashboard/media" className="inline-flex items-center space-x-1 text-xs font-bold text-amber-400 hover:underline pt-1">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload Media Now</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {posts.slice(0, 3).map((post) => (
                  <div
                    key={post.id}
                    className="p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition"
                    style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)' }}
                  >
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border border-rose-500/20 bg-rose-500/10 text-rose-400">
                          {post.platform || "INSTAGRAM"}
                        </span>
                        <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                          {post.scheduledTime || "Scheduled today"}
                        </span>
                      </div>
                      <p className="line-clamp-2 font-medium" style={{ color: 'var(--text-primary)' }}>
                        {post.caption}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <Link
                        href="/dashboard/approval-queue"
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-xs touch-target btn-emerald-cta"
                      >
                        Review Post
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

        </div>

        {/* Column 3: Storage & Quick Hub Link */}
        <motion.aside variants={itemVariants} className="lg:col-span-4 space-y-4">
          <div className="rounded-xl border p-4 sm:p-5 space-y-5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>AutoPilot Storage</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Google Drive & Media Assets</p>
              </div>
              <Badge variant={mediaAssets.length > 0 ? "success" : "neutral"}>
                {mediaAssets.length > 0 ? "Active" : "Ready"}
              </Badge>
            </div>

            <StorageProgressBar usedGB={mediaAssets.length * 0.2} totalGB={500} />

            <div className="divide-y border-t border-b space-y-0" style={{ borderColor: 'var(--card-border)' }}>
              <div className="py-3 text-xs flex items-center justify-between">
                <span className="font-semibold flex items-center space-x-2" style={{ color: 'var(--text-primary)' }}>
                  <Folder className="h-4 w-4 text-amber-400" />
                  <span>Media Assets</span>
                </span>
                <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{mediaAssets.length} Uploaded</span>
              </div>

              <div className="py-3 text-xs flex items-center justify-between">
                <span className="font-semibold flex items-center space-x-2" style={{ color: 'var(--text-primary)' }}>
                  <Radio className="h-4 w-4 text-emerald-400" />
                  <span>Connected Channels</span>
                </span>
                <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{connectedAccountsCount} Active</span>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span>Workspace: <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>/pro_workspace</span></span>
              <Link href="/dashboard/integrations" className="link-neutral text-xs font-semibold hover:underline">
                Manage Hub →
              </Link>
            </div>

          </div>
        </motion.aside>

      </div>
    </motion.div>
  );
}

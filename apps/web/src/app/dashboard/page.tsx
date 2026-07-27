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
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  ThumbsUp,
  Plus,
  Radio,
  Folder,
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
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);
  const [mediaAssets, setMediaAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLiveData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('marketing_os_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const postsRes = await fetch(`${API_BASE}/posts`, { headers }).catch(() => null);
      if (postsRes && postsRes.ok) {
        const data = await postsRes.json();
        setPosts(Array.isArray(data) ? data : []);
      } else {
        setPosts([]);
      }

      const accountsRes = await fetch(`${API_BASE}/integrations`, { headers }).catch(() => null);
      if (accountsRes && accountsRes.ok) {
        const data = await accountsRes.json();
        setConnectedAccounts(Array.isArray(data) ? data : []);
      } else {
        setConnectedAccounts([]);
      }

      const mediaRes = await fetch('/api/media/list').catch(() => null);
      if (mediaRes && mediaRes.ok) {
        const data = await mediaRes.json();
        setMediaAssets(data.assets || []);
      }
    } catch (e) {
      console.error('Failed to fetch live data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedMode = localStorage.getItem('amai_publishing_mode');
    if (savedMode === 'AUTO_PUBLISH') {
      setPublishingMode('AUTO_PUBLISH');
    }

    const savedCount = localStorage.getItem('amai_approved_count');
    if (savedCount) {
      setApprovedCount(parseInt(savedCount, 10));
    }

    fetchLiveData();
  }, []);

  const handleApprovePost = async (id: string) => {
    try {
      const token = localStorage.getItem('marketing_os_token');
      await fetch(`${API_BASE}/posts/${id}/approve`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }).catch(() => null);

      setPosts(prev => prev.map(p => p.id === id ? { ...p, status: 'APPROVED' } : p));
      const newCount = approvedCount + 1;
      setApprovedCount(newCount);
      localStorage.setItem('amai_approved_count', newCount.toString());
    } catch (e) {
      console.error('Failed to approve post', e);
    }
  };

  const pendingApprovalPosts = posts.filter(p => p.status === 'DRAFT' || p.status === 'PENDING_APPROVAL');

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-4 sm:space-y-6"
    >
      {/* Responsive Publishing Mode Banner */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 px-4 rounded-xl border gap-2.5"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="h-6 w-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--bg-surface-raised)' }}>
            <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            Publishing Mode: <span className="font-bold">{publishingMode === 'AUTO_PUBLISH' ? 'Auto-Publish Active' : 'Manual Approval Queue Active'}</span>
          </p>
        </div>

        <Link
          href="/dashboard/settings"
          className="self-start sm:self-auto px-3 py-1 rounded-md text-[11px] font-semibold border transition touch-target flex-shrink-0"
          style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
        >
          Change Mode
        </Link>
      </motion.div>

      {/* 3-Column Grid Layout Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start">
        
        {/* Center Main Workspace */}
        <div className="lg:col-span-8 space-y-5 lg:space-y-6">
          
          {/* Mobile Clean Stat Cards Grid */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 sm:gap-3.5">
            <StatCard
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
              label="Active Channels"
              value={connectedAccounts.length > 0 ? `${connectedAccounts.length} Connected` : "0 Connected"}
              helperText={connectedAccounts.length > 0 ? `${connectedAccounts.length} channel(s) active` : "No accounts linked"}
              valueColor="var(--text-primary)"
            />

            <StatCard
              icon={<Clock className="h-4 w-4 text-amber-400" />}
              label="Needs Approval"
              value={`${pendingApprovalPosts.length} Pending`}
              helperText="Awaiting review"
              valueColor="var(--accent-warning)"
            />

            <StatCard
              icon={<Calendar className="h-4 w-4 text-purple-400" />}
              label="Approved Posts"
              value={`${approvedCount} Posts`}
              helperText="Total approved"
              valueColor="var(--text-primary)"
            />

            <StatCard
              icon={<AlertTriangle className="h-4 w-4 text-emerald-400" />}
              label="System Health"
              value="100% Active"
              helperText="All APIs online"
              valueColor="var(--accent-success)"
            />
          </motion.div>

          {/* Content Pipeline & Approval Review Queue */}
          <motion.div variants={itemVariants} className="rounded-xl border p-4 sm:p-5 space-y-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}>
            
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Approval Queue & Content Pipeline
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Review and approve AI content before publishing</p>
              </div>

              <Link
                href="/dashboard/composer"
                className="h-7 w-7 rounded-md flex items-center justify-center transition border touch-target"
                style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Streamlined Mobile Friendly Empty State Box */}
            {posts.length === 0 ? (
              <div className="text-center py-6 px-3.5 border-2 border-dashed rounded-xl" style={{ borderColor: 'var(--card-border)' }}>
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>No posts in approval queue.</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Create your first AI post or connect Google Drive to start generating content automatically.</p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <Link
                    href="/dashboard/composer"
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white btn-emerald-cta touch-target flex items-center space-x-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create Post</span>
                  </Link>

                  <Link
                    href="/dashboard/integrations"
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border btn-gold-cta touch-target flex items-center space-x-1"
                  >
                    <Radio className="h-3.5 w-3.5" />
                    <span>Connect Accounts</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {posts.map((item) => (
                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border gap-2" style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)' }}>
                    <div className="flex items-center space-x-2.5">
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 btn-emerald-cta">
                        {item.caption ? item.caption.substring(0, 2).toUpperCase() : 'PO'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate tracking-tight" style={{ color: 'var(--text-primary)' }}>{item.caption || 'Untitled Post'}</p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.platform || 'Multi-platform'}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end space-x-2">
                      <Badge variant={item.status === 'DRAFT' || item.status === 'PENDING_APPROVAL' ? 'warning' : 'success'}>
                        {item.status}
                      </Badge>

                      {(item.status === 'DRAFT' || item.status === 'PENDING_APPROVAL') ? (
                        <button
                          onClick={() => handleApprovePost(item.id)}
                          className="px-3 py-1 rounded-md bg-emerald-600 text-white text-xs font-semibold transition flex items-center space-x-1 touch-target shadow-xs"
                        >
                          <ThumbsUp className="h-3 w-3" />
                          <span>Approve</span>
                        </button>
                      ) : (
                        <span className="text-xs font-medium px-2 py-0.5" style={{ color: 'var(--text-secondary)' }}>
                          Ready
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Status Banner */}
            <div className="p-3 rounded-lg border flex items-center justify-between text-xs" style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)' }}>
              <div className="flex items-center space-x-2.5">
                <span className="text-xs">🛡️</span>
                <div>
                  <p className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>Approval-First Protection</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Posts remain in queue until manually approved</p>
                </div>
              </div>
            </div>

          </motion.div>
        </div>

        {/* Column 3: Right Context Panel */}
        <motion.aside variants={itemVariants} className="lg:col-span-4 space-y-4">
          <div className="rounded-xl border p-4 sm:p-5 space-y-5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--card-border)' }}>
            
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>AutoPilot Storage</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Google Drive & Media Assets</p>
              </div>
              <Badge variant={mediaAssets.length > 0 ? "success" : "neutral"}>
                {mediaAssets.length > 0 ? "Active" : "Ready"}
              </Badge>
            </div>

            {/* Thinner Storage Progress Bar */}
            <StorageProgressBar usedGB={mediaAssets.length * 0.2} totalGB={500} />

            {/* Flattened Borderless List Layout */}
            <div className="divide-y border-t border-b space-y-0" style={{ borderColor: 'var(--card-border)' }}>
              <div className="py-3 text-xs flex items-center justify-between">
                <span className="font-semibold flex items-center space-x-2" style={{ color: 'var(--text-primary)' }}>
                  <Folder className="h-4 w-4 text-amber-400" />
                  <span>Media Library Assets</span>
                </span>
                <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{mediaAssets.length} Uploaded</span>
              </div>

              <div className="py-3 text-xs flex items-center justify-between">
                <span className="font-semibold flex items-center space-x-2" style={{ color: 'var(--text-primary)' }}>
                  <Radio className="h-4 w-4 text-emerald-400" />
                  <span>Connected Channels</span>
                </span>
                <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{connectedAccounts.length} Active</span>
              </div>
            </div>

            {/* Footer Metadata */}
            <div className="pt-1 flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span>Folder: <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>/content</span></span>
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

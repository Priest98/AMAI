"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Zap,
  CheckCircle2,
  Clock,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  MoreVertical,
  ChevronDown,
  X,
  ShieldCheck,
  Check,
  ThumbsUp,
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

export default function DashboardPage() {
  const [publishingMode, setPublishingMode] = useState<'MANUAL_APPROVAL' | 'AUTO_PUBLISH'>('MANUAL_APPROVAL');
  const [approvedCount, setApprovedCount] = useState<number>(0);

  const [posts, setPosts] = useState([
    { id: 1, name: 'Fashion Reel Spring Promo', platform: 'Instagram Reels', status: 'Need Approval' },
    { id: 2, name: 'Behind the Scenes Vlog', platform: 'TikTok Video', status: 'Need Approval' },
    { id: 3, name: 'Product Review Highlight', platform: 'Instagram Reels', status: 'Approved' },
    { id: 4, name: 'Small Business Growth Tips', platform: 'TikTok Video', status: 'Scheduled' },
  ]);

  useEffect(() => {
    const savedMode = localStorage.getItem('amai_publishing_mode');
    if (savedMode === 'AUTO_PUBLISH') {
      setPublishingMode('AUTO_PUBLISH');
    }

    const savedCount = localStorage.getItem('amai_approved_count');
    if (savedCount) {
      setApprovedCount(parseInt(savedCount, 10));
    }
  }, []);

  const handleApprovePost = (id: number) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, status: 'Approved' } : p));
    const newCount = approvedCount + 1;
    setApprovedCount(newCount);
    localStorage.setItem('amai_approved_count', newCount.toString());
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 sm:space-y-8 max-w-7xl mx-auto ambient-bg"
    >
      {/* Active Publishing Mode Banner */}
      <motion.div variants={itemVariants} className="flex items-center justify-between p-4 rounded-2xl exec-card">
        <div className="flex items-center space-x-3">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
            publishingMode === 'AUTO_PUBLISH' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
          }`}>
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-white">
              Publishing Mode: <span className="font-extrabold">{publishingMode === 'AUTO_PUBLISH' ? 'Auto-Publish Active' : 'Manual Approval Queue Active (Default)'}</span>
            </p>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              {publishingMode === 'AUTO_PUBLISH' 
                ? 'Posts dispatch automatically at AI-predicted peak engagement windows.' 
                : 'All AI-generated content requires your manual approval before publishing.'}
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/settings"
          className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-zinc-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-white/20 transition touch-target"
        >
          Change Mode
        </Link>
      </motion.div>

      {/* Top Metric Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* Metric 1 */}
        <div className="exec-card exec-card-hover p-5 sm:p-6 rounded-[20px] sm:rounded-[24px] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <Link
              href="/dashboard/integrations"
              className="h-9 w-9 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-zinc-400 flex items-center justify-center transition touch-target"
              title="Manage Connections"
            >
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Active Channels</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">3 / 3</span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">Google Drive, IG & TikTok active</p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="exec-card exec-card-hover p-5 sm:p-6 rounded-[20px] sm:rounded-[24px] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Clock className="h-5 w-5" />
            </div>
            <Link
              href="/dashboard/composer"
              className="h-9 w-9 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-zinc-400 flex items-center justify-center transition touch-target"
              title="Open Composer"
            >
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Needs Approval</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
                {posts.filter(p => p.status === 'Need Approval').length}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">Awaiting manual review</p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="exec-card exec-card-hover p-5 sm:p-6 rounded-[20px] sm:rounded-[24px] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Calendar className="h-5 w-5" />
            </div>
            <Link
              href="/dashboard/autopilot"
              className="h-9 w-9 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-zinc-400 flex items-center justify-center transition touch-target"
              title="Configure Automation"
            >
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Approved Posts</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{approvedCount}</span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">Total manually approved</p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="exec-card exec-card-hover p-5 sm:p-6 rounded-[20px] sm:rounded-[24px] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <Link
              href="/dashboard/settings"
              className="h-9 w-9 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-zinc-400 flex items-center justify-center transition touch-target"
              title="View Settings"
            >
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">System Health</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">100%</span>
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">All APIs connected</p>
          </div>
        </div>

      </motion.div>

      {/* Main Grid: Approval Queue (Primary) & AutoPilot Storage (Secondary) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* PRIMARY: Content Pipeline & Approval Review Queue (lg:col-span-8) */}
        <motion.div variants={itemVariants} className="lg:col-span-8 flex flex-col">
          <div className="exec-card p-6 sm:p-7 rounded-[20px] sm:rounded-[24px] flex flex-col justify-between space-y-6 flex-1">
            
            {/* Solid High-Contrast Heading */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Approval Queue & Content Pipeline
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Review and approve AI content before publishing</p>
              </div>

              <Link
                href="/dashboard/composer"
                className="h-9 w-9 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-zinc-300 flex items-center justify-center transition touch-target"
              >
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Approval Queue Items */}
            <div className="space-y-3">
              {posts.map((item) => (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-purple-600 text-white flex items-center justify-center font-extrabold text-xs flex-shrink-0 shadow-sm">
                      {item.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-white tracking-tight truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500">{item.platform}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                      item.status === 'Need Approval'
                        ? 'badge-warning'
                        : item.status === 'Approved'
                        ? 'badge-success'
                        : 'badge-primary'
                    }`}>
                      {item.status}
                    </span>

                    {item.status === 'Need Approval' ? (
                      <button
                        onClick={() => handleApprovePost(item.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition flex items-center space-x-1 touch-target shadow-sm"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                        <span>Approve</span>
                      </button>
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 px-2 py-1">
                        Ready
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Status Banner */}
            <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-extrabold text-xs flex-shrink-0">
                  🛡️
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-xs">Approval-First Protection</p>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400">Posts remain in queue until manually approved</p>
                </div>
              </div>
            </div>

          </div>
        </motion.div>

        {/* SECONDARY: AutoPilot Storage Card (lg:col-span-4) */}
        <motion.div variants={itemVariants} className="lg:col-span-4 flex flex-col">
          <div className="exec-card p-6 sm:p-7 rounded-[20px] sm:rounded-[24px] flex flex-col justify-between space-y-6 flex-1">
            
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">AutoPilot Storage</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Google Drive sync pipeline</p>
              </div>
              <span className="px-2.5 py-1 rounded-full badge-success text-[10px] font-bold">Synced</span>
            </div>

            {/* Progress Bar & Breakdown */}
            <div className="space-y-4 my-2">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-700 dark:text-zinc-300">Storage Used</span>
                  <span className="text-rose-500">124 GB / 500 GB</span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-rose-500 to-purple-600 rounded-full w-[25%]" />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs flex justify-between items-center">
                  <span className="font-semibold text-slate-700 dark:text-zinc-300">Instagram Reels</span>
                  <span className="font-mono text-[11px] text-slate-500">60 GB • 24 Videos</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs flex justify-between items-center">
                  <span className="font-semibold text-slate-700 dark:text-zinc-300">TikTok Videos</span>
                  <span className="font-mono text-[11px] text-slate-500">35 GB • 18 Videos</span>
                </div>
              </div>
            </div>

            {/* Folder Footer */}
            <div className="pt-3 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
              <span>Folder: <span className="font-mono font-bold text-slate-900 dark:text-white">/content</span></span>
              <Link href="/dashboard/autopilot" className="font-bold text-rose-500 hover:underline">
                Configure →
              </Link>
            </div>

          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}

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

      {/* Explicit StatCards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          label="Active Channels"
          value="3 / 3"
          helperText="Google Drive, IG & TikTok active"
          valueColor="var(--text-primary)"
        />

        <StatCard
          icon={<Clock className="h-5 w-5 text-amber-500" />}
          label="Needs Approval"
          value={posts.filter(p => p.status === 'Need Approval').length.toString()}
          helperText="Awaiting manual review"
          valueColor="var(--accent-warning)"
        />

        <StatCard
          icon={<Calendar className="h-5 w-5 text-purple-500" />}
          label="Approved Posts"
          value={approvedCount.toString()}
          helperText="Total manually approved"
          valueColor="var(--text-primary)"
        />

        <StatCard
          icon={<AlertTriangle className="h-5 w-5 text-emerald-500" />}
          label="System Health"
          value="100%"
          helperText="All APIs connected"
          valueColor="var(--accent-success)"
        />
      </motion.div>

      {/* Main Grid: Approval Queue (Primary) & AutoPilot Storage (Secondary) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* PRIMARY: Content Pipeline & Approval Review Queue (lg:col-span-8) */}
        <motion.div variants={itemVariants} className="lg:col-span-8 flex flex-col">
          <div className="exec-card p-6 sm:p-7 rounded-[20px] sm:rounded-[24px] flex flex-col justify-between space-y-6 flex-1">
            
            <div className="flex items-center justify-between">
              <div>
                <h2 className="section-header-title text-base sm:text-lg font-bold">
                  Approval Queue & Content Pipeline
                </h2>
                <p className="section-header-subtitle text-xs mt-0.5">Review and approve AI content before publishing</p>
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
                    <Badge variant={item.status === 'Need Approval' ? 'warning' : item.status === 'Approved' ? 'success' : 'purple'}>
                      {item.status}
                    </Badge>

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
            <div className="flex items-center justify-between">
              <div>
                <h3 className="section-header-title text-base font-bold">AutoPilot Storage</h3>
                <p className="section-header-subtitle text-xs mt-0.5">Google Drive sync pipeline</p>
              </div>
              <Badge variant="success">Synced</Badge>
            </div>

            <StorageProgressBar usedGB={124} totalGB={500} />

            <div className="space-y-2 pt-1">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs flex justify-between items-center">
                <span className="font-semibold text-slate-700 dark:text-zinc-300">Instagram Reels</span>
                <span className="font-mono text-[11px] text-slate-500">60 GB • 24 Videos</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs flex justify-between items-center">
                <span className="font-semibold text-slate-700 dark:text-zinc-300">TikTok Videos</span>
                <span className="font-mono text-[11px] text-slate-500">35 GB • 18 Videos</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
              <span>Folder: <span className="font-mono font-bold text-slate-900 dark:text-white">/content</span></span>
              <Link href="/dashboard/autopilot" className="link-neutral text-xs font-bold hover:underline">
                Configure →
              </Link>
            </div>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}

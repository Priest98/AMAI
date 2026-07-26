"use client";
import React from 'react';
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
  ShieldCheck,
  Radio,
  PenTool,
  Sparkles,
  FolderSync,
  X,
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export default function DashboardPage() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 max-w-7xl mx-auto ambient-bg"
    >
      {/* ── Top Executive Metric Cards with Top-Right Arrow Buttons (↗) ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Metric 1 */}
        <div className="exec-card exec-card-hover p-6 rounded-[24px] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <Link
              href="/dashboard/integrations"
              className="h-8 w-8 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-zinc-400 flex items-center justify-center transition"
              title="Manage Connections"
            >
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Active Channels</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">3 / 3</span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">Google Drive, IG & TikTok active</p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="exec-card exec-card-hover p-6 rounded-[24px] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Clock className="h-5 w-5" />
            </div>
            <Link
              href="/dashboard/composer"
              className="h-8 w-8 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-zinc-400 flex items-center justify-center transition"
              title="Open Composer"
            >
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Today's Queue</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">2</span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">Scheduled for peak hours today</p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="exec-card exec-card-hover p-6 rounded-[24px] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Calendar className="h-5 w-5" />
            </div>
            <Link
              href="/dashboard/autopilot"
              className="h-8 w-8 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-zinc-400 flex items-center justify-center transition"
              title="Configure Automation"
            >
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Upcoming Batch</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">14</span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">Next post tomorrow at 6:00 PM</p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="exec-card exec-card-hover p-6 rounded-[24px] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <Link
              href="/dashboard/settings"
              className="h-8 w-8 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-zinc-400 flex items-center justify-center transition"
              title="View Security Settings"
            >
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Expiring Soon</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">0</span>
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">All OAuth tokens healthy</p>
          </div>
        </div>

      </motion.div>

      {/* ── Main Executive Workspace Grid Inspired by Reference Screenshot ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Featured Blue Storage & AutoPilot Sync Card (Left Col - 5 cols) */}
        <motion.div variants={itemVariants} className="lg:col-span-5 flex flex-col">
          <div className="blue-featured-card p-7 rounded-[24px] flex flex-col justify-between space-y-6 flex-1 relative overflow-hidden">
            
            {/* Top Bar */}
            <div className="flex items-center justify-between relative z-10">
              <span className="font-bold text-sm text-white/90">AutoPilot Drive Storage</span>
              <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-white cursor-pointer hover:bg-white/20 transition">
                <MoreVertical className="h-4 w-4" />
              </div>
            </div>

            {/* Circular Progress Gauge & Stats */}
            <div className="flex items-center justify-between my-2 relative z-10">
              <div className="relative h-32 w-32 flex items-center justify-center">
                {/* Circular Gauge SVG */}
                <svg className="h-full w-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-white/20"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-white"
                    strokeDasharray="75, 100"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center text-center">
                  <span className="text-2xl font-black text-white">75%</span>
                  <span className="text-[10px] text-white/80 font-medium">124 GB / 500 GB</span>
                </div>
              </div>

              {/* Inner Pill Breakdown Cards matching reference image */}
              <div className="space-y-2 flex-1 ml-6">
                <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md text-xs space-y-0.5 border border-white/10">
                  <div className="flex items-center space-x-1.5 font-bold text-white text-[11px]">
                    <span className="h-2 w-2 rounded-full bg-pink-300" />
                    <span>Instagram Reels</span>
                  </div>
                  <p className="text-[10px] text-white/80 pl-3.5">60 GB • 24 Videos</p>
                </div>

                <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md text-xs space-y-0.5 border border-white/10">
                  <div className="flex items-center space-x-1.5 font-bold text-white text-[11px]">
                    <span className="h-2 w-2 rounded-full bg-blue-300" />
                    <span>TikTok Videos</span>
                  </div>
                  <p className="text-[10px] text-white/80 pl-3.5">35 GB • 18 Videos</p>
                </div>

                <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md text-xs space-y-0.5 border border-white/10">
                  <div className="flex items-center space-x-1.5 font-bold text-white text-[11px]">
                    <span className="h-2 w-2 rounded-full bg-purple-300" />
                    <span>AutoPilot Queue</span>
                  </div>
                  <p className="text-[10px] text-white/80 pl-3.5">29 GB • Ready to Sync</p>
                </div>
              </div>
            </div>

            {/* Bottom Sync Banner */}
            <div className="pt-3 border-t border-white/15 flex items-center justify-between text-xs text-white/90 relative z-10">
              <span className="font-semibold">Google Drive Folder: <span className="font-mono font-bold">/content</span></span>
              <span className="px-2.5 py-1 rounded-full bg-white/20 text-[10px] font-bold">Live Synced</span>
            </div>
          </div>
        </motion.div>

        {/* Executive Performance Review & Activity Table (Right Col - 7 cols) */}
        <motion.div variants={itemVariants} className="lg:col-span-7 flex flex-col">
          <div className="exec-card p-7 rounded-[24px] flex flex-col justify-between space-y-6 flex-1">
            
            {/* Card Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Content Pipeline & Approval Review</h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Manage post approvals, AI captions, and platform queues</p>
              </div>

              <Link
                href="/dashboard/composer"
                className="h-9 w-9 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-zinc-300 flex items-center justify-center transition"
              >
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Content Review Items inspired by reference table layout */}
            <div className="space-y-3">
              {[
                { name: 'Fashion Reel Spring Promo', platform: 'Instagram Reels', status: 'Approved', badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
                { name: 'Behind the Scenes Vlog', platform: 'TikTok Video', status: 'Need Approval', badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
                { name: 'Product Review Highlight', platform: 'Instagram Reels', status: 'Scheduled', badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
                { name: 'Small Business Growth Tips', platform: 'TikTok Video', status: 'Auto-Published', badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                  <div className="flex items-center space-x-3">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-rose-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs">
                      {item.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">{item.name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500">{item.platform}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${item.badgeColor}`}>
                      {item.status}
                    </span>
                    <button className="px-3 py-1.5 rounded-xl bg-slate-200/60 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-zinc-200 text-xs font-bold transition flex items-center space-x-1">
                      <span>Action</span>
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Recommendation Pill matching reference */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-xs">
                  ⚡
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-xs">AutoPilot Ready</p>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400">All connected accounts ready for automated publishing</p>
                </div>
              </div>
              <button className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
                <X className="h-4 w-4" />
              </button>
            </div>

          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}

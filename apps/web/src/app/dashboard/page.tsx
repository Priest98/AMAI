"use client";
import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Zap,
  CheckCircle2,
  Clock,
  Calendar,
  Rocket,
  ArrowRight,
  TrendingUp,
  Radio,
  PenTool,
  Sparkles,
  RefreshCw,
  MoreHorizontal,
  ChevronDown,
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
      className="space-y-8 max-w-7xl mx-auto"
    >
      {/* ── Top Metrics Bar Inspired by Reference Image ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Metric 1 */}
        <div className="soft-card soft-card-hover p-5 rounded-[22px] flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="h-11 w-11 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Connected Accounts</p>
              <div className="flex items-baseline space-x-2 mt-0.5">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white">3</span>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  +3 Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="soft-card soft-card-hover p-5 rounded-[22px] flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="h-11 w-11 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Today's Queue</p>
              <div className="flex items-baseline space-x-2 mt-0.5">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white">2</span>
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                  Waiting
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="soft-card soft-card-hover p-5 rounded-[22px] flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="h-11 w-11 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Scheduled Posts</p>
              <div className="flex items-baseline space-x-2 mt-0.5">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white">14</span>
                <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                  Upcoming
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="soft-card soft-card-hover p-5 rounded-[22px] flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="h-11 w-11 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <Rocket className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Published Total</p>
              <div className="flex items-baseline space-x-2 mt-0.5">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white">320</span>
                <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
                  Published
                </span>
              </div>
            </div>
          </div>
        </div>

      </motion.div>

      {/* ── Main Performance & Activity Grid (Reference Layout) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Performance Chart & Automation Card (Left 2 Cols) */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          
          {/* Performance Card */}
          <div className="soft-card p-6 rounded-[22px] space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Performance & Engagement</h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Automated publishing distribution across Instagram Reels & TikTok</p>
              </div>

              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-zinc-300">
                <span>This Week</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            {/* Visual Simulated Chart Grid Inspired by Reference */}
            <div className="h-48 w-full bg-gradient-to-b from-slate-100/60 to-transparent dark:from-white/5 dark:to-transparent rounded-2xl p-4 relative flex items-end justify-between border border-slate-200/40 dark:border-white/5">
              
              {/* Tooltip Card matching reference */}
              <div className="absolute top-6 left-1/3 p-3 rounded-2xl bg-slate-900 dark:bg-zinc-900 text-white text-xs shadow-xl border border-white/10 z-10 space-y-1">
                <p className="font-bold text-[10px] text-slate-400">26 Jul 2026</p>
                <div className="flex justify-between space-x-4">
                  <span className="text-slate-300">Instagram:</span>
                  <span className="font-extrabold text-pink-400">14 posts</span>
                </div>
                <div className="flex justify-between space-x-4">
                  <span className="text-slate-300">TikTok:</span>
                  <span className="font-extrabold text-blue-400">18 videos</span>
                </div>
              </div>

              {/* Chart Bars */}
              {[45, 65, 80, 60, 95, 75, 90].map((height, i) => (
                <div key={i} className="flex flex-col items-center space-y-2 flex-1">
                  <div className="w-8 rounded-t-xl bg-gradient-to-t from-rose-500 to-purple-600 opacity-85 hover:opacity-100 transition-all" style={{ height: `${height}%` }} />
                  <span className="text-[10px] font-bold text-slate-400">Day {i + 1}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Workflow Setup Steps */}
          <div className="soft-card p-6 rounded-[22px] space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Quick Start Workflow</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link href="/dashboard/integrations" className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 hover:border-rose-500/40 transition space-y-2">
                <div className="h-8 w-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs">1</div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Connect Accounts</p>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">Link Drive, IG & TikTok</p>
              </Link>

              <Link href="/dashboard/composer" className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 hover:border-purple-500/40 transition space-y-2">
                <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs">2</div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">AI Copywriter</p>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">Generate Niche Captions</p>
              </Link>

              <Link href="/dashboard/autopilot" className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 hover:border-emerald-500/40 transition space-y-2">
                <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">3</div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">AutoPilot Engine</p>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">Publish Automatically</p>
              </Link>
            </div>
          </div>

        </motion.div>

        {/* Right Col: Activity Stream (Inspired by Reference Right Sidebar) */}
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="soft-card p-6 rounded-[22px] space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Recent Activity</h2>
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Live Feed</span>
            </div>

            <div className="space-y-4">
              {[
                { name: 'Instagram Reel', action: 'Auto-published via AutoPilot', time: '10:15 AM', status: 'Published', color: 'bg-emerald-500' },
                { name: 'TikTok Video', action: 'Synced from Google Drive /content', time: '09:42 AM', status: 'In Queue', color: 'bg-blue-500' },
                { name: 'Fashion Caption', action: 'Generated via AI Copilot', time: '08:30 AM', status: 'Draft', color: 'bg-purple-500' },
              ].map((item, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50/60 dark:bg-white/5 border border-slate-200/40 dark:border-white/5">
                  <div className={`h-2.5 w-2.5 rounded-full ${item.color} mt-1.5 ring-4 ring-slate-100 dark:ring-zinc-900`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.name}</p>
                      <span className="text-[10px] text-slate-400">{item.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 truncate">{item.action}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/dashboard/autopilot"
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 text-xs font-bold transition flex items-center justify-center space-x-2"
            >
              <span>View Full Automation Logs</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}

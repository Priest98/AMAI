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
      {/* ── Linear-Style Hero Mesh Banner ── */}
      <motion.div
        variants={itemVariants}
        className="relative p-8 rounded-3xl overflow-hidden glass-panel border border-white/10 shadow-2xl bg-gradient-to-r from-rose-950/40 via-purple-950/30 to-zinc-950"
      >
        {/* Ambient Glow Orbs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold tracking-tight">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Automated Social Media Engine</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Welcome back to <span className="bg-gradient-to-r from-rose-400 via-purple-300 to-indigo-400 bg-clip-text text-transparent">Marketing OS</span>
          </h1>

          <p className="text-zinc-400 text-sm leading-relaxed max-w-2xl">
            Your automated social publishing hub is live. Media syncs from Google Drive, AI generates niche captions, and AutoPilot handles posting to Instagram & TikTok.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard/composer"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 text-white font-bold text-xs shadow-lg shadow-rose-500/25 hover:opacity-95 transition active:scale-95 border border-white/20"
            >
              <span>Compose New Post</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/dashboard/integrations"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-semibold text-xs transition border border-white/10"
            >
              <Radio className="h-4 w-4 text-zinc-400" />
              <span>View Connected Hub</span>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ── Elevated Metric Cards ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Metric 1 */}
        <div className="glass-panel glass-panel-hover p-6 rounded-2xl border border-white/10 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Connected Accounts</span>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-white tracking-tight">3</span>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">3 / 3 Active</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-2">Google Drive, Instagram, & TikTok connected</p>
        </div>

        {/* Metric 2 */}
        <div className="glass-panel glass-panel-hover p-6 rounded-2xl border border-white/10 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Today's Queue</span>
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-white tracking-tight">2</span>
            <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">Waiting</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-2">Scheduled for optimal publishing hours</p>
        </div>

        {/* Metric 3 */}
        <div className="glass-panel glass-panel-hover p-6 rounded-2xl border border-white/10 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Scheduled Posts</span>
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-white tracking-tight">14</span>
            <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">Upcoming</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-2">Next batch publishing tomorrow at 6:00 PM</p>
        </div>

        {/* Metric 4 */}
        <div className="glass-panel glass-panel-hover p-6 rounded-2xl border border-white/10 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Published Total</span>
            <div className="h-9 w-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <Rocket className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-white tracking-tight">320</span>
            <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">Published</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-2">Lifetime posts published via AutoPilot</p>
        </div>

      </motion.div>

      {/* ── Workflow Automation Builder Card ── */}
      <motion.div variants={itemVariants} className="glass-panel p-8 rounded-3xl border border-white/10 space-y-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Automation Workflow Setup</h2>
            <p className="text-xs text-zinc-400 mt-1">How content flows from your Google Drive folder straight to Instagram & TikTok with zero effort.</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            AutoPilot Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Step 1 */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/40 transition space-y-3">
            <div className="flex items-center space-x-3 text-blue-400 font-bold text-sm">
              <div className="h-7 w-7 rounded-xl bg-blue-500/20 flex items-center justify-center text-xs text-blue-400 border border-blue-500/30 font-black">
                1
              </div>
              <span>Connect Platforms</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Link your Instagram, TikTok, and Google Drive accounts in the Integrations hub.
            </p>
            <Link
              href="/dashboard/integrations"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300"
            >
              <span>Manage Connections</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Step 2 */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/40 transition space-y-3">
            <div className="flex items-center space-x-3 text-purple-400 font-bold text-sm">
              <div className="h-7 w-7 rounded-xl bg-purple-500/20 flex items-center justify-center text-xs text-purple-400 border border-purple-500/30 font-black">
                2
              </div>
              <span>Draft & AI Copilot</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Generate niche captions and hashtags with AI, then send posts to the queue.
            </p>
            <Link
              href="/dashboard/composer"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300"
            >
              <span>Open Composer</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Step 3 */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-rose-500/40 transition space-y-3">
            <div className="flex items-center space-x-3 text-rose-400 font-bold text-sm">
              <div className="h-7 w-7 rounded-xl bg-rose-500/20 flex items-center justify-center text-xs text-rose-400 border border-rose-500/30 font-black">
                3
              </div>
              <span>AutoPilot Publishing</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Set optimal publishing hours. Marketing OS publishes automatically across channels.
            </p>
            <Link
              href="/dashboard/autopilot"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300"
            >
              <span>Configure Automation</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

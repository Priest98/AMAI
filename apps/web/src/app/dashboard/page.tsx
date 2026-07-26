"use client";
import React from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Welcome & Value Proposition Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur-md">
            <span>🚀 Automated AI Social Media Publishing</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome to Marketing OS
          </h1>
          <p className="text-blue-100 text-sm max-w-2xl">
            Automatically sync media from Google Drive, generate engaging captions with AI, and publish short-form videos to Instagram and TikTok.
          </p>
        </div>
      </div>

      {/* Actionable SaaS Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-zinc-800 p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Connected Accounts</h3>
            <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">3 <span className="text-xs text-emerald-500 font-semibold">/ 3 Active</span></p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg">
            ✓
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Today's Queue</h3>
            <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">2 <span className="text-xs text-blue-500 font-semibold">posts waiting</span></p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg">
            ⏳
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Scheduled</h3>
            <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">14 <span className="text-xs text-purple-500 font-semibold">posts</span></p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-lg">
            📅
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Published Total</h3>
            <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">320 <span className="text-xs text-emerald-500 font-semibold">posts</span></p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg">
            🚀
          </div>
        </div>
      </div>

      {/* Quick Start Workflow Builder: "How to automate Google Drive to Instagram & TikTok" */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Automation Workflow Setup</h2>
          <p className="text-xs text-zinc-500 mt-0.5">How to get content from Google Drive to Instagram and TikTok automatically with zero effort.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 space-y-3">
            <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 font-bold text-sm">
              <span className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-xs">1</span>
              <span>Connect Platforms</span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Link your Instagram, TikTok, and Google Drive account in the Integrations hub.
            </p>
            <Link
              href="/dashboard/integrations"
              className="inline-block text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Configure Integrations →
            </Link>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 space-y-3">
            <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
              <span className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xs">2</span>
              <span>Draft & AI Copilot</span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Generate niche captions and hashtags with AI, then send posts to the queue.
            </p>
            <Link
              href="/dashboard/composer"
              className="inline-block text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Open Post Composer →
            </Link>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 space-y-3">
            <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 font-bold text-sm">
              <span className="h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-xs">3</span>
              <span>AutoPilot Publishing</span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Set optimal publishing hours. Marketing OS publishes automatically across your channels.
            </p>
            <Link
              href="/dashboard/autopilot"
              className="inline-block text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
            >
              Manage Automation →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

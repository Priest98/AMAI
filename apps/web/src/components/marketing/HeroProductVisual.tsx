'use client';

import React from 'react';
import { Calendar, BarChart3, TrendingUp, Sparkles, CheckCircle2, Clock } from 'lucide-react';
import { TikTokLogo } from '@/components/icons/platform-logos';

export function HeroProductVisual() {
  return (
    <div className="relative w-full max-w-2xl mx-auto lg:max-w-none">
      {/* Subtle Background Glow */}
      <div
        className="absolute -inset-4 rounded-3xl opacity-20 blur-2xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 60% 40%, var(--lp-cyan), transparent 70%)',
        }}
      />

      {/* Main Desktop Window Frame */}
      <div className="relative rounded-2xl overflow-hidden shadow-2xl lp-card border border-[var(--lp-border)]">
        {/* Browser Top Bar */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{
            background: 'var(--lp-bg-soft)',
            borderColor: 'var(--lp-border)',
          }}
        >
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-700/60" />
            <div className="w-3 h-3 rounded-full bg-slate-700/60" />
            <div className="w-3 h-3 rounded-full bg-slate-700/60" />
          </div>

          <div
            className="flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--lp-text-muted)',
              border: '1px solid var(--lp-border)',
            }}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            oyinca.com/dashboard
          </div>

          <div className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded" style={{ background: 'var(--lp-cyan-soft)', color: 'var(--lp-cyan)' }}>
            Autopilot Active
          </div>
        </div>

        {/* Video / Visual Container */}
        <div className="relative aspect-[16/10] bg-[#0B0F19] overflow-hidden">
          <video
            autoPlay
            loop
            muted
            playsInline
            poster="/hero/oyinca-poster.jpg"
            className="w-full h-full object-cover"
          >
            <source src="/hero/oyinca-loop.mp4" type="video/mp4" />
            <img src="/hero/oyinca-poster.jpg" alt="Oyinca Dashboard UI" className="w-full h-full object-cover" />
          </video>

          {/* Overlay UI Badge */}
          <div
            className="absolute bottom-4 left-4 right-4 p-3 sm:p-4 rounded-xl lp-glass backdrop-blur-md flex items-center justify-between border"
            style={{ borderColor: 'var(--lp-border)' }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ background: 'var(--lp-cyan-soft)', color: 'var(--lp-cyan)' }}>
                <TikTokLogo className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  TikTok Content Pipeline
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-[11px]" style={{ color: 'var(--lp-text-secondary)' }}>
                  Caption generated • Hashtags optimized • Scheduled 3:00 PM
                </div>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs font-mono font-bold" style={{ color: 'var(--lp-cyan)' }}>
              <Clock className="w-3.5 h-3.5" />
              Auto-publishing
            </div>
          </div>
        </div>
      </div>

      {/* Floating Mobile Mockup Overlay (Matching Reference Image Composition) */}
      <div
        className="absolute -bottom-8 -left-4 sm:-left-8 w-44 sm:w-56 rounded-3xl p-2.5 shadow-2xl border hidden md:block"
        style={{
          background: '#090D14',
          borderColor: 'var(--lp-border)',
        }}
      >
        <div className="rounded-2xl p-4 bg-[#0F131E] border border-[var(--lp-border)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--lp-text-muted)' }}>
              TikTok Feed
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>

          <div className="space-y-2">
            <div className="p-2 rounded-lg lp-glass flex items-center justify-between text-left">
              <div>
                <div className="text-[11px] font-bold text-white">5 Mistakes New Creators Make</div>
                <div className="text-[9px]" style={{ color: 'var(--lp-text-muted)' }}>Today, 3:00 PM</div>
              </div>
              <TikTokLogo className="w-3 h-3 text-slate-400 shrink-0" />
            </div>

            <div className="p-2 rounded-lg lp-glass flex items-center justify-between text-left">
              <div>
                <div className="text-[11px] font-bold text-white">Behind the Scenes Workflow</div>
                <div className="text-[9px]" style={{ color: 'var(--lp-text-muted)' }}>Tomorrow, 6:00 PM</div>
              </div>
              <TikTokLogo className="w-3 h-3 text-slate-400 shrink-0" />
            </div>
          </div>

          <div className="pt-2 border-t flex items-center justify-between text-[10px]" style={{ borderColor: 'var(--lp-border)', color: 'var(--lp-text-secondary)' }}>
            <span>Views: 128.4K</span>
            <span className="text-emerald-400 font-bold">+12.8%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

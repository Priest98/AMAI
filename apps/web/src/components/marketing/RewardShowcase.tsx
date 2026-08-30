'use client';

import React from 'react';
import { Crown, Zap, Gift, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';

interface RewardShowcaseProps {
  variant?: 'early-access' | 'founding-creator';
}

export function RewardShowcase({ variant = 'early-access' }: RewardShowcaseProps) {
  const isFoundingCreator = variant === 'founding-creator';

  const eyebrowText = isFoundingCreator ? 'FOUNDING MEMBER PRIVILEGE' : 'EARLY ACCESS PRIVILEGE';
  const mainHeading = isFoundingCreator
    ? 'Unlock exclusive privileges reserved for our first 25 Founding Creators.'
    : 'Join Oyinca early and unlock exclusive rewards reserved for our first members.';

  const targetFormId = isFoundingCreator ? '#application-form' : '#signup-form';
  const ctaText = isFoundingCreator ? 'CLAIM YOUR FOUNDING SPOT' : 'GET EARLY ACCESS NOW';

  return (
    <section className="w-full max-w-5xl mx-auto py-12 sm:py-20 text-left">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4 mb-12 sm:mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--lp-gold-strong)] bg-[var(--lp-gold-soft)]">
          <Crown className="w-3.5 h-3.5 text-[#D8B571]" />
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#D8B571]">
            {eyebrowText}
          </span>
        </div>

        <h2 className="lp-heading-display text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
          {mainHeading}
        </h2>

        <p className="text-sm sm:text-base max-w-xl mx-auto text-slate-300 font-normal">
          Available exclusively during the pre-launch founding period. These privileges will not be open to general public signups later.
        </p>
      </div>

      {/* Dominant Hero Reward Centerpiece Card */}
      <div className="relative rounded-3xl p-6 sm:p-12 overflow-hidden border border-[#D8B571]/30 bg-gradient-to-b from-[#0F1524] via-[#090D14] to-[#0B0F19] shadow-2xl space-y-8 sm:space-y-12">
        {/* Ambient Top Glow */}
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ background: 'radial-gradient(circle, #D8B571 0%, #7FB0DB 100%)' }}
        />

        {/* Hero Card Top Bar Badge */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-6 border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D8B571] animate-pulse" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#D8B571]">
              RESERVED FOR EARLY MEMBERS • COHORT 001
            </span>
          </div>

          <div className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            GUARANTEED EARLY BENEFIT
          </div>
        </div>

        {/* Hero Main Reward Banner */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#7FB0DB]">
              YOUR PRIMARY REWARD
            </span>
            <h3 className="lp-heading-display text-3xl sm:text-5xl font-bold text-white tracking-tight">
              PRO CREATOR EXPERIENCE
            </h3>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl font-normal">
              Full complimentary access to Oyinca's complete AI social media manager suite during the founding launch window. Auto-publishing, AI captions, content calendar, and 7-Day Autopilot mode included.
            </p>
          </div>

          <div className="lg:col-span-4 flex flex-col items-start lg:items-end justify-center">
            <div className="p-6 rounded-2xl border border-[#D8B571]/20 bg-[#141926] text-left w-full space-y-2">
              <div className="text-xs font-mono uppercase text-[#D8B571] font-bold">
                FOUNDING VALUE
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                100% UNLOCKED
              </div>
              <div className="text-[11px] text-slate-400">
                Granted automatically to early signup accounts.
              </div>
            </div>
          </div>
        </div>

        {/* 3 Core Reward Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 border-t border-slate-800/80">
          {/* Reward Pillar 1 */}
          <div className="p-5 sm:p-6 rounded-2xl border border-slate-800 bg-[#0F131E]/80 space-y-3 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#7FB0DB]/10 text-[#7FB0DB]">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">PRIORITY ACCESS</h4>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                Get ahead of the public launch queue. First to test new features and automate TikTok publishing.
              </p>
            </div>
          </div>

          {/* Reward Pillar 2 */}
          <div className="p-5 sm:p-6 rounded-2xl border border-slate-800 bg-[#0F131E]/80 space-y-3 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#D8B571]/10 text-[#D8B571]">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">FOUNDING STATUS</h4>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                Permanent Founding Member badge, direct WhatsApp line to our engineering team, and feature vote influence.
              </p>
            </div>
          </div>

          {/* Reward Pillar 3 */}
          <div className="p-5 sm:p-6 rounded-2xl border border-slate-800 bg-[#0F131E]/80 space-y-3 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-400">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">REFERRAL PROCOHORTS</h4>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                Unlock 3 extra months of Pro features and priority queue position for every 3 creator friends you invite.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Action Prompt */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800/80">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>No credit card required. Exclusive pre-launch invitation.</span>
          </div>

          <a
            href={targetFormId}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider lp-btn-primary transition-transform active:scale-95 shadow-lg"
          >
            {ctaText}
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

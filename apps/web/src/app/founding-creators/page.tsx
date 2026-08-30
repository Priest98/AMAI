import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Trophy, Sparkles, Check, ArrowRight, ShieldCheck, Zap, Rocket, Star, Users } from 'lucide-react';
import { FoundingCreatorForm } from '@/components/marketing/FoundingCreatorForm';
import { AttributionTracker } from '@/components/marketing/AttributionTracker';

export const metadata: Metadata = {
  title: 'Oyinca Founding TikTok Creators Program | First 25 Creators Cohort',
  description:
    "We're selecting our first 25 TikTok creators to test Oyinca, shape the product experience and participate in the 7-Day Autopilot Challenge. Apply now.",
};

export default function FoundingCreatorsPage() {
  return (
    <div className="min-h-screen bg-[#090a0f] text-white selection:bg-purple-600 selection:text-white relative overflow-hidden font-sans">
      <Suspense fallback={null}>
        <AttributionTracker pageName="founding-creators" />
      </Suspense>

      {/* Futuristic Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-gradient-to-b from-purple-600/20 via-pink-600/10 to-transparent blur-[150px] pointer-events-none" />

      {/* Navigation */}
      <header className="relative z-10 w-full border-b border-white/10 bg-slate-950/60 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-black text-xl tracking-tight">
            <span className="bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">
              OYINCA
            </span>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold uppercase tracking-wider">
              Founding Creators
            </span>
          </Link>

          <Link
            href="/early-access"
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-lg shadow-purple-600/30"
          >
            General Early Access Queue →
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 py-12 md:py-20 flex flex-col items-center">
        {/* Hero Section */}
        <div className="text-center max-w-3xl space-y-6 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-widest shadow-lg shadow-amber-900/20">
            <Trophy className="w-4 h-4 text-amber-400" />
            Limited Cohort: First 25 Creators
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.1] bg-gradient-to-b from-white via-amber-100 to-purple-300 bg-clip-text text-transparent">
            Help us build the future of TikTok management.
          </h1>

          <p className="text-base md:text-xl text-slate-300 font-normal leading-relaxed max-w-2xl mx-auto">
            We're selecting our first <strong className="text-amber-300 font-bold">25 creators</strong> to test Oyinca, shape the product experience and help us explore what an AI social media manager should actually do.
          </p>

          <div className="pt-2">
            <a
              href="#application-form"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-base shadow-xl shadow-purple-600/30 transition-all active:scale-98"
            >
              Apply to Become a Founding Creator
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>

          <div className="text-xs text-amber-400/80 font-medium pt-1">
            ⚠️ Applications are reviewed selectively based on content quality, engagement & testing commitment.
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="w-full max-w-4xl mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold tracking-tight">Founding Creator Benefits</h2>
            <p className="text-slate-400 text-xs mt-1">What our first 25 selected creators receive:</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-purple-500/20 backdrop-blur-md flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 shrink-0">
                <Star className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Free Oyinca Creator Plan</h3>
                <p className="text-xs text-slate-400 mt-1">Full free access to the Oyinca Creator tier throughout the founding period.</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/70 border border-purple-500/20 backdrop-blur-md flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Direct Access to Oyinca Team</h3>
                <p className="text-xs text-slate-400 mt-1">Direct communication channel with product builders to guide feature roadmaps.</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/70 border border-purple-500/20 backdrop-blur-md flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-pink-500/20 text-pink-300 shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Founding Creator #001 Recognition</h3>
                <p className="text-xs text-slate-400 mt-1">Permanent Founding Creator badge & potential featured launch case study.</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/70 border border-purple-500/20 backdrop-blur-md flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 shrink-0">
                <Rocket className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Priority Campaign & Affiliate Access</h3>
                <p className="text-xs text-slate-400 mt-1">First invitation to future launch campaigns, referral rewards & partner perks.</p>
              </div>
            </div>
          </div>
        </div>

        {/* 7-Day Autopilot Challenge Callout */}
        <div className="w-full max-w-4xl p-8 rounded-3xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-500/30 backdrop-blur-xl mb-16 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold uppercase">
            #OyincaAutopilot
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold">The 7-Day Oyinca Autopilot Challenge</h2>
          <p className="text-slate-300 text-sm max-w-xl mx-auto">
            "Give Oyinca your TikTok content for 7 days and see what happens." Document your honest experience from Day 1 to Day 7 as AI manages your workflow.
          </p>
        </div>

        {/* Application Form */}
        <div id="application-form" className="w-full">
          <FoundingCreatorForm />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-white/10 py-8 text-center text-xs text-slate-500">
        <p>© 2026 Oyinca. Founding TikTok Creator Recruitment Cohort.</p>
      </footer>
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Zap, Bot, Trophy } from 'lucide-react';
import { EarlyAccessForm } from '@/components/marketing/EarlyAccessForm';
import { AttributionTracker } from '@/components/marketing/AttributionTracker';

export const metadata: Metadata = {
  title: 'Oyinca Early Access | Your AI Social Media Manager',
  description:
    'Stop spending hours planning, writing, scheduling and managing your TikTok content. Oyinca handles the repetitive work for you. Reserve early access now.',
};

export default async function EarlyAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const params = await searchParams;
  const referralCode = params?.ref;

  return (
    <div className="min-h-screen bg-[#090a0f] text-white selection:bg-purple-600 selection:text-white relative overflow-hidden font-sans">
      <Suspense fallback={null}>
        <AttributionTracker pageName="early-access" />
      </Suspense>

      {/* Futuristic Background Glow Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-purple-600/20 via-pink-600/10 to-transparent blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[160px] pointer-events-none" />

      {/* Navigation Bar */}
      <header className="relative z-10 w-full border-b border-white/10 bg-slate-950/60 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-black text-xl tracking-tight">
            <span className="bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">
              OYINCA
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 font-semibold uppercase tracking-wider">
              Early Access
            </span>
          </Link>

          <Link
            href="/founding-creators"
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-purple-200 transition-all flex items-center gap-1.5"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            Founding Creator Program
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 py-12 md:py-20 flex flex-col items-center">
        {/* Hero Copy */}
        <div className="text-center max-w-3xl space-y-6 mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase tracking-widest shadow-lg shadow-purple-900/20">
            <Sparkles className="w-4 h-4 text-purple-400" />
            TikTok-First Beachhead Launch
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.1] bg-gradient-to-b from-white via-slate-100 to-purple-300 bg-clip-text text-transparent">
            Your AI Social Media Manager Is Coming.
          </h1>

          <p className="text-base md:text-xl text-slate-300 font-normal leading-relaxed max-w-2xl mx-auto">
            Stop spending hours planning, writing, scheduling and managing your TikTok content.{' '}
            <strong className="text-white font-semibold">Oyinca is being built to handle the repetitive work for you.</strong>
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <a
              href="#signup-form"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-sm md:text-base shadow-xl shadow-purple-600/30 hover:shadow-purple-600/50 transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              Get Early Access
              <ArrowRight className="w-5 h-5" />
            </a>

            <Link
              href="/founding-creators"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-900/90 border border-purple-500/30 hover:bg-slate-800 text-purple-200 font-bold text-sm md:text-base transition-all flex items-center justify-center gap-2"
            >
              Become a Founding TikTok Creator
            </Link>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl mb-16">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-md">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 w-fit mb-3">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">AI Autopilot Captions</h3>
            <p className="text-xs text-slate-400">Generate high-converting TikTok captions tuned to your unique writing samples & tone.</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-md">
            <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-400 w-fit mb-3">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Optimal Peak Publishing</h3>
            <p className="text-xs text-slate-400">Post automatically when your target audience is most active on TikTok.</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-md">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 w-fit mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Priority Waitlist Perks</h3>
            <p className="text-xs text-slate-400">Earn queue jumps, Founding Creator badges, and free Pro upgrades via referrals.</p>
          </div>
        </div>

        {/* Signup Form Container */}
        <div id="signup-form" className="w-full">
          <EarlyAccessForm initialReferralCode={referralCode} />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-white/10 py-8 text-center text-xs text-slate-500">
        <p>© 2026 Oyinca. All rights reserved. TikTok-first Pre-Launch Acquisition Phase.</p>
      </footer>
    </div>
  );
}

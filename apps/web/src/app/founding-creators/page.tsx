import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import '@/styles/landing.css';
import { Logo } from '@/components/logo';
import { FoundingCreatorForm } from '@/components/marketing/FoundingCreatorForm';
import { HeroProductVisual } from '@/components/marketing/HeroProductVisual';
import { AttributionTracker } from '@/components/marketing/AttributionTracker';
import ProductVisual from '@/components/landing/ProductVisual';
import { Sparkles, MessageSquare, ShieldCheck, Award } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Oyinca Founding TikTok Creators | First 25 Creators Cohort',
  description:
    "We're selecting our first 25 TikTok creators to test Oyinca, shape the product experience and help explore what a social media manager should do.",
};

export default function FoundingCreatorsPage() {
  return (
    <div className="amai-landing min-h-screen relative font-sans selection:bg-[#7FB0DB] selection:text-black" style={{ background: 'var(--lp-bg)', color: 'var(--lp-text-primary)' }}>
      <Suspense fallback={null}>
        <AttributionTracker pageName="founding-creators" />
      </Suspense>

      {/* Header — Isolated Logo Only */}
      <header className="fixed top-0 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
        <div className="pointer-events-auto w-full mt-4 max-w-5xl">
          <nav
            className="flex items-center justify-between rounded-full px-6 py-3"
            style={{
              background: 'color-mix(in srgb, var(--lp-bg-soft) 80%, transparent)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid var(--lp-border)',
            }}
          >
            <Link href="/" className="flex items-center gap-2" aria-label="Oyinca home">
              <Logo variant="full" size="md" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-28 pb-20 px-4 sm:px-8 max-w-6xl mx-auto space-y-12 sm:space-y-16">
        {/* Asymmetric Hero Section */}
        <section className="pt-4 pb-12 md:py-16 border-b" style={{ borderColor: 'var(--lp-border)' }}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Hero Text */}
            <div className="lg:col-span-6 space-y-5 text-left">
              <div>
                <span className="text-xs font-mono font-semibold uppercase tracking-widest px-3 py-1 rounded-full" style={{ background: 'var(--lp-cyan-soft)', color: 'var(--lp-cyan)' }}>
                  COHORT 001 • 25 SPOTS ONLY
                </span>
                <h1 className="lp-heading-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mt-4 uppercase" style={{ color: 'var(--lp-text-primary)' }}>
                  Shape the future of TikTok management.
                </h1>
              </div>

              <p className="text-sm sm:text-base font-normal leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
                We're selecting the first 25 creators to test Oyinca early, shape our features, and help explore how social media should manage itself.
              </p>

              <div className="pt-2">
                <a
                  href="#application-form"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider lp-btn-primary transition-transform active:scale-95 shadow-xl"
                >
                  APPLY TO BECOME A FOUNDING CREATOR →
                </a>
              </div>

              <p className="text-xs font-mono" style={{ color: 'var(--lp-text-muted)' }}>
                Applications evaluated on engagement, consistency, and workflow alignment.
              </p>
            </div>

            {/* Right Column: Hero Visual Mockup */}
            <div className="lg:col-span-6">
              <HeroProductVisual />
            </div>
          </div>
        </section>

        {/* Compact Founding Creator Benefits Grid */}
        <section className="py-6 border-b" style={{ borderColor: 'var(--lp-border)' }}>
          <div className="mb-4">
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#7FB0DB]">
              FOUNDING CREATOR PERKS
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 sm:p-4 rounded-2xl border flex items-center gap-3" style={{ background: 'var(--lp-bg-soft)', borderColor: 'var(--lp-border)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--lp-cyan-soft)', color: 'var(--lp-cyan)' }}>
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold" style={{ color: 'var(--lp-text-primary)' }}>Free Creator Access</h3>
                <p className="text-[11px] sm:text-xs mt-0.5" style={{ color: 'var(--lp-text-secondary)' }}>Complimentary Oyinca Creator tier during launch window.</p>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl border flex items-center gap-3" style={{ background: 'var(--lp-bg-soft)', borderColor: 'var(--lp-border)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--lp-gold-soft)', color: 'var(--lp-gold)' }}>
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold" style={{ color: 'var(--lp-text-primary)' }}>Direct Product Access</h3>
                <p className="text-[11px] sm:text-xs mt-0.5" style={{ color: 'var(--lp-text-secondary)' }}>Direct Slack/WhatsApp line with the Oyinca core team.</p>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl border flex items-center gap-3" style={{ background: 'var(--lp-bg-soft)', borderColor: 'var(--lp-border)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10B981' }}>
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold" style={{ color: 'var(--lp-text-primary)' }}>Founding Creator Badge</h3>
                <p className="text-[11px] sm:text-xs mt-0.5" style={{ color: 'var(--lp-text-secondary)' }}>Exclusive Founding Creator badge & priority drops.</p>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl border flex items-center gap-3" style={{ background: 'var(--lp-bg-soft)', borderColor: 'var(--lp-border)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(168, 85, 247, 0.12)', color: '#A855F7' }}>
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold" style={{ color: 'var(--lp-text-primary)' }}>Campaign Placement</h3>
                <p className="text-[11px] sm:text-xs mt-0.5" style={{ color: 'var(--lp-text-secondary)' }}>Priority placement for brand deals & affiliate share.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 7-Day Autopilot Challenge */}
        <section className="py-2">
          <div className="p-6 sm:p-8 rounded-3xl text-center space-y-2 max-w-3xl mx-auto border" style={{ background: 'var(--lp-bg-soft)', borderColor: 'var(--lp-border)' }}>
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#7FB0DB]">
              COHORT EXPERIMENT
            </span>
            <h2 className="lp-heading-display text-xl sm:text-3xl font-bold" style={{ color: 'var(--lp-text-primary)' }}>
              The 7-Day Oyinca Autopilot Challenge
            </h2>
            <p className="text-xs sm:text-sm max-w-xl mx-auto leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
              "Give Oyinca your TikTok content for 7 days and see what happens." Selected creators document their honest experience from Day 1 to Day 7.
            </p>
          </div>
        </section>

        {/* Multi-Step Creator Application Form */}
        <section id="application-form" className="py-4 scroll-mt-28">
          <FoundingCreatorForm />
        </section>

        {/* Live Product Status Strip Below Form */}
        <section className="py-4">
          <ProductVisual />
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t py-8 text-center text-xs" style={{ borderColor: 'var(--lp-border)', color: 'var(--lp-text-muted)' }}>
        <p>© 2026 Oyinca. All rights reserved.</p>
      </footer>
    </div>
  );
}

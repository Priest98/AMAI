import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import '@/styles/landing.css';
import { Logo } from '@/components/logo';
import { FoundingCreatorForm } from '@/components/marketing/FoundingCreatorForm';
import { HeroProductVisual } from '@/components/marketing/HeroProductVisual';
import { AttributionTracker } from '@/components/marketing/AttributionTracker';
import ProductVisual from '@/components/landing/ProductVisual';

export const metadata: Metadata = {
  title: 'Oyinca Founding TikTok Creators | First 25 Creators Cohort',
  description:
    "We're selecting our first 25 TikTok creators to test Oyinca, shape the product experience and help explore what a social media manager should do.",
};

export default function FoundingCreatorsPage() {
  return (
    <div className="amai-landing min-h-screen relative font-sans text-slate-100 selection:bg-[#7FB0DB] selection:text-black">
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
      <main className="pt-28 pb-20 px-5 sm:px-8 max-w-6xl mx-auto">
        {/* Asymmetric Hero Section */}
        <section className="pt-8 pb-16 md:py-20 border-b" style={{ borderColor: 'var(--lp-border)' }}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left Column: Hero Text */}
            <div className="lg:col-span-6 space-y-6 text-left">
              <div>
                <span className="text-xs font-mono font-semibold uppercase tracking-widest px-3 py-1 rounded-full" style={{ background: 'var(--lp-cyan-soft)', color: 'var(--lp-cyan)' }}>
                  COHORT 001 • 25 SPOTS ONLY
                </span>
                <h1 className="lp-heading-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mt-4">
                  Shape the future of TikTok management.
                </h1>
              </div>

              <p className="text-base sm:text-lg font-normal leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
                We're selecting the first 25 creators to test Oyinca early, shape our features, and help explore how social media should manage itself.
              </p>

              <div className="pt-2">
                <a
                  href="#application-form"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider lp-btn-primary transition-transform active:scale-95 shadow-xl"
                >
                  APPLY TO BECOME A FOUNDING CREATOR →
                </a>
              </div>

              <p className="text-xs font-mono" style={{ color: 'var(--lp-text-muted)' }}>
                Applications are evaluated on engagement, consistency, and workflow alignment.
              </p>
            </div>

            {/* Right Column: Hero Visual Mockup */}
            <div className="lg:col-span-6">
              <HeroProductVisual />
            </div>
          </div>
        </section>

        {/* Benefits Grid */}
        <section className="py-16 text-left border-b" style={{ borderColor: 'var(--lp-border)' }}>
          <div className="max-w-3xl mb-10">
            <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--lp-text-muted)' }}>
              PROGRAM PERKS
            </span>
            <h2 className="lp-heading text-2xl sm:text-4xl font-bold mt-2" style={{ color: 'var(--lp-text-primary)' }}>
              Founding Creator Benefits
            </h2>
            <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--lp-text-secondary)' }}>
              What selected members of Cohort 001 receive:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="lp-card p-6">
              <h3 className="text-base font-bold text-white mb-2">Free Oyinca Creator Access</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
                Complimentary access to the full Oyinca Creator tier during the founding period and launch phase.
              </p>
            </div>

            <div className="lp-card p-6">
              <h3 className="text-base font-bold text-white mb-2">Direct Product Access</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
                Direct slack/whatsapp channel access to the Oyinca core team to request features and shape development.
              </p>
            </div>

            <div className="lp-card p-6">
              <h3 className="text-base font-bold text-white mb-2">Founding Creator Recognition</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
                Exclusive Founding Creator badge, verified referral tier status, and early access to every new platform drop.
              </p>
            </div>

            <div className="lp-card p-6">
              <h3 className="text-base font-bold text-white mb-2">Campaign Opportunities</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
                Priority placement for paid brand deals, co-marketing spotlight campaigns, and affiliate revenue share.
              </p>
            </div>
          </div>
        </section>

        {/* 7-Day Autopilot Challenge */}
        <section className="py-16">
          <div className="lp-card p-8 sm:p-12 text-center space-y-4 max-w-4xl mx-auto">
            <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--lp-cyan)' }}>
              COHORT EXPERIMENT
            </span>
            <h2 className="lp-heading text-2xl sm:text-4xl font-bold" style={{ color: 'var(--lp-text-primary)' }}>
              The 7-Day Oyinca Autopilot Challenge
            </h2>
            <p className="text-sm sm:text-base max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
              "Give Oyinca your TikTok content for 7 days and see what happens." Selected creators document their honest experience from Day 1 to Day 7.
            </p>
          </div>
        </section>

        {/* Multi-Step Creator Application Form */}
        <section id="application-form" className="py-12 scroll-mt-28">
          <FoundingCreatorForm />
        </section>

        {/* Live Product Status Strip Below Form */}
        <section className="py-12">
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

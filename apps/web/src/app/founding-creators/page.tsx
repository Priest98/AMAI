import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import '@/styles/landing.css';
import { Logo } from '@/components/logo';
import { FoundingCreatorForm } from '@/components/marketing/FoundingCreatorForm';
import { AttributionTracker } from '@/components/marketing/AttributionTracker';

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
      <main className="pt-32 pb-20 px-5 sm:px-8 max-w-4xl mx-auto flex flex-col items-center text-center">
        {/* Hero */}
        <div className="max-w-3xl space-y-6 mb-16">
          <h1 className="lp-heading-display text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight uppercase">
            OYINCA FOUNDING <br />
            <span style={{ color: 'var(--lp-hero-accent)' }}>TIKTOK CREATORS</span>
          </h1>

          <p className="text-base sm:text-xl max-w-2xl mx-auto font-normal leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
            We're selecting the first 25 creators to help shape the future of TikTok management.
          </p>

          <div className="pt-2">
            <a
              href="#application-form"
              className="inline-block px-10 py-4 rounded-full text-sm sm:text-base font-bold uppercase tracking-wider lp-btn-primary transition-transform active:scale-95 shadow-lg"
            >
              APPLY TO BECOME A FOUNDING CREATOR
            </a>
          </div>

          <p className="text-xs" style={{ color: 'var(--lp-text-muted)' }}>
            Applications are reviewed individually.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="w-full max-w-4xl mb-16 text-left">
          <div className="text-center mb-8">
            <h2 className="lp-heading text-2xl font-bold tracking-tight">Founding Creator Benefits</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--lp-text-muted)' }}>What selected creators receive:</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="lp-card p-6">
              <h3 className="text-sm font-bold text-white mb-1">Free Oyinca Creator Access</h3>
              <p className="text-xs" style={{ color: 'var(--lp-text-secondary)' }}>Free access to the Oyinca Creator tier during the founding period.</p>
            </div>

            <div className="lp-card p-6">
              <h3 className="text-sm font-bold text-white mb-1">Direct Product Access</h3>
              <p className="text-xs" style={{ color: 'var(--lp-text-secondary)' }}>Direct access to the Oyinca team to shape feature developments.</p>
            </div>

            <div className="lp-card p-6">
              <h3 className="text-sm font-bold text-white mb-1">Founding Creator Recognition</h3>
              <p className="text-xs" style={{ color: 'var(--lp-text-secondary)' }}>Founding Creator badge and early access to all new feature drops.</p>
            </div>

            <div className="lp-card p-6">
              <h3 className="text-sm font-bold text-white mb-1">Campaign Opportunities</h3>
              <p className="text-xs" style={{ color: 'var(--lp-text-secondary)' }}>Invitations to participating Oyinca campaigns and future partner perks.</p>
            </div>
          </div>
        </div>

        {/* 7-Day Autopilot Challenge */}
        <div className="w-full max-w-4xl lp-card p-8 sm:p-10 mb-16 text-center space-y-4">
          <h2 className="lp-heading text-2xl sm:text-3xl font-bold" style={{ color: 'var(--lp-text-primary)' }}>
            The 7-Day Oyinca Autopilot Challenge
          </h2>
          <p className="text-sm max-w-xl mx-auto" style={{ color: 'var(--lp-text-secondary)' }}>
            "Give Oyinca your TikTok content for 7 days and see what happens." Selected creators document their honest experience from Day 1 to Day 7.
          </p>
        </div>

        {/* Multi-Step Creator Application Form */}
        <div id="application-form" className="w-full scroll-mt-28">
          <FoundingCreatorForm />
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t py-8 text-center text-xs" style={{ borderColor: 'var(--lp-border)', color: 'var(--lp-text-muted)' }}>
        <p>© 2026 Oyinca. All rights reserved.</p>
      </footer>
    </div>
  );
}

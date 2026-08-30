import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import '@/styles/landing.css';
import { Logo } from '@/components/logo';
import { EarlyAccessForm } from '@/components/marketing/EarlyAccessForm';
import { AttributionTracker } from '@/components/marketing/AttributionTracker';
import { HeroProductVisual } from '@/components/marketing/HeroProductVisual';
import ProductVisual from '@/components/landing/ProductVisual';
import BrandAttribution from '@/components/BrandAttribution';
import { ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Oyinca Early Access | You Create. Oyinca Handles The Rest.',
  description:
    'Meet Oyinca — your social media manager, built to work in the background while you focus on creating. Get early access before the public launch.',
};

export default async function EarlyAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const params = await searchParams;
  const referralCode = params?.ref;

  return (
    <div className="amai-landing min-h-screen relative font-sans text-slate-100 selection:bg-[#7FB0DB] selection:text-black">
      <Suspense fallback={null}>
        <AttributionTracker pageName="early-access" />
      </Suspense>

      {/* Header — Isolated Oyinca Logo Only */}
      <header className="fixed top-0 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
        <div className="pointer-events-auto w-full mt-3 sm:mt-4 max-w-6xl">
          <nav
            className="flex items-center justify-between rounded-full px-5 py-3 sm:px-6 sm:py-3.5"
            style={{
              background: 'color-mix(in srgb, var(--lp-bg-soft) 85%, transparent)',
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

      {/* Main Container — Mobile First Design Layout */}
      <main className="pt-24 sm:pt-40 pb-20 px-4 sm:px-8 max-w-6xl mx-auto space-y-16 sm:space-y-24">
        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Hero Copy (Mobile & Desktop First Column) */}
          <div className="lg:col-span-5 text-left space-y-5 sm:space-y-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: 'var(--lp-cyan)' }} />
              <span className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color: 'var(--lp-text-muted)' }}>
                OYINCA IS COMING
              </span>
            </div>

            <h1 className="lp-heading-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.08] uppercase">
              You create. <br />
              <span style={{ color: 'var(--lp-hero-accent)' }}>Oyinca handles the rest.</span>
            </h1>

            <p className="text-sm sm:text-lg font-normal leading-relaxed max-w-xl" style={{ color: 'var(--lp-text-secondary)' }}>
              Meet Oyinca — your social media manager, built to work in the background while you focus on creating.
            </p>

            <div className="pt-2">
              <a
                href="#signup-form"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider lp-btn-primary transition-transform active:scale-95 shadow-xl"
              >
                GET EARLY ACCESS
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Product Visual Anchor (Placed Immediately After CTA) */}
          <div className="lg:col-span-7 pt-2 lg:pt-0">
            <HeroProductVisual />
          </div>
        </div>

        {/* Premium Multi-Step Form */}
        <div id="signup-form" className="w-full pt-4 sm:pt-8 scroll-mt-24">
          <EarlyAccessForm initialReferralCode={referralCode} />
        </div>

        {/* Status Strip Section */}
        <div className="pt-4 sm:pt-8">
          <ProductVisual />
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t py-10 text-center space-y-2" style={{ borderColor: 'var(--lp-border)' }}>
        <BrandAttribution />
        <p className="text-xs" style={{ color: 'var(--lp-text-muted)' }}>
          © 2026 Oyinca. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

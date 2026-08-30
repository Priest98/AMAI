import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import '@/styles/landing.css';
import { Logo } from '@/components/logo';
import { EarlyAccessForm } from '@/components/marketing/EarlyAccessForm';
import { AttributionTracker } from '@/components/marketing/AttributionTracker';
import HeroVisual from '@/components/landing/HeroVisual';
import ProductVisual from '@/components/landing/ProductVisual';

export const metadata: Metadata = {
  title: 'Oyinca Early Access | Your Social Media Just Got A Manager',
  description:
    'Oyinca is building a smarter way to manage TikTok — from planning and content to publishing and consistency. Get early access before the public launch.',
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

      {/* Header */}
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

            <Link
              href="/founding-creators"
              className="text-xs font-semibold px-4 py-2 rounded-full transition-colors hover:text-white"
              style={{ color: 'var(--lp-text-secondary)' }}
            >
              Founding Creator Program
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-5 sm:px-8 max-w-5xl mx-auto flex flex-col items-center text-center">
        <div className="max-w-3xl space-y-6">
          <h1 className="lp-heading-display text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight uppercase">
            YOUR SOCIAL MEDIA <br />
            <span style={{ color: 'var(--lp-hero-accent)' }}>JUST GOT A MANAGER.</span>
          </h1>

          <p className="text-base sm:text-xl max-w-2xl mx-auto font-normal leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
            Oyinca is building a smarter way to manage TikTok — from planning and content to publishing and consistency. Get early access before the public launch.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a
              href="#signup-form"
              className="w-full sm:w-auto px-8 py-3.5 rounded-full text-sm sm:text-base font-bold uppercase tracking-wider lp-btn-primary transition-transform active:scale-95"
            >
              GET EARLY ACCESS
            </a>

            <Link
              href="/founding-creators"
              className="w-full sm:w-auto px-8 py-3.5 rounded-full text-sm sm:text-base font-bold uppercase tracking-wider lp-btn-ghost transition-colors"
            >
              BECOME A FOUNDING CREATOR
            </Link>
          </div>
        </div>

        {/* Real Product Visual Evidence */}
        <div className="w-full mt-16 max-w-4xl">
          <ProductVisual />
        </div>

        {/* Form Section */}
        <div id="signup-form" className="w-full pt-16 scroll-mt-28">
          <EarlyAccessForm initialReferralCode={referralCode} />
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t py-8 text-center text-xs" style={{ borderColor: 'var(--lp-border)', color: 'var(--lp-text-muted)' }}>
        <p>© 2026 Oyinca. All rights reserved.</p>
      </footer>
    </div>
  );
}

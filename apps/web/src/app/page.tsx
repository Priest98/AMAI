import type { Metadata } from 'next';
import { Suspense } from 'react';
import '@/styles/landing-editorial.css';

import Nav from '@/components/landing/Nav';
import HeroSection from '@/components/landing/HeroSection';
import IdeaSection from '@/components/landing/IdeaSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import ProductDemoSection from '@/components/landing/ProductDemoSection';
import BrainSection from '@/components/landing/BrainSection';
import BrandAlignmentSection from '@/components/landing/BrandAlignmentSection';
import BackgroundOperationsSection from '@/components/landing/BackgroundOperationsSection';
import Pricing from '@/components/landing/Pricing';
import FAQ from '@/components/landing/FAQ';
import FinalCTA from '@/components/landing/FinalCTA';
import Footer from '@/components/landing/Footer';
import { headers } from 'next/headers';
import { currencyForCountry } from '@/lib/currency';

/**
 * Fetches the plan catalogue server-side so it's already baked into the
 * initial HTML instead of the Pricing section paying its own client-side
 * round trip after hydration.
 */
async function getPlansServerSide() {
  try {
    const h = await headers();
    const host = h.get('host') || 'localhost:3000';
    const protocol = host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https';
    const res = await fetch(`${protocol}://${host}/api/billing/plans`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Stream the catalogue separately so a cold backend does not block the hero. */
async function PricingSection() {
  const h = await headers();
  const country =
    h.get('x-vercel-ip-country') ||
    h.get('cf-ipcountry') ||
    h.get('x-country-code');
  const currency = currencyForCountry(country);
  const initialPlansData = await getPlansServerSide();
  return <Pricing initialData={initialPlansData} currency={currency} />;
}

export const metadata: Metadata = {
  title: 'Oyinca',
  description:
    'Oyinca is your AI Social Media Manager. Give it your content and Oyinca creates, plans, schedules and publishes your TikTok content: captions, hashtags and scheduling with approval controls. Start free, no credit card required.',
  keywords: [
    'AI social media manager',
    'TikTok automation',
    'TikTok scheduling',
    'AI caption generator',
    'TikTok hashtag generator',
    'content approval workflow',
    'Oyinca Autopilot',
    'automated TikTok publishing',
  ],
  openGraph: {
    title: 'Oyinca: Your AI Social Media Manager',
    description: 'Give Oyinca your content. It creates, plans, schedules and publishes your TikTok content while you focus on your business.',
    url: 'https://oyinca.com',
    siteName: 'Oyinca',
    images: [
      {
        url: 'https://oyinca.com/app-icon.jpg',
        width: 1024,
        height: 1024,
        alt: 'Oyinca: Your AI Social Media Manager',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Oyinca: Your AI Social Media Manager',
    description: 'Give Oyinca your content. It creates, plans, schedules and publishes your TikTok content while you focus on your business.',
    images: ['https://oyinca.com/app-icon.jpg'],
  },
  alternates: {
    canonical: 'https://oyinca.com',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Oyinca',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'Oyinca is an AI Social Media Manager, powered by Turaab Technology. It creates, plans, schedules and publishes TikTok content on your behalf: captions, hashtags, optimization and publishing with approval controls. Free to start, with Pro, Creator and Agency plans for more automation and capacity.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="oy-landing-wrap min-h-screen">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg oy-btn-primary"
        >
          Skip to main content
        </a>

        {/* Floating Compact Navigation */}
        <Nav />

        <main id="main-content">
          {/* Section 01: Hero */}
          <HeroSection />

          {/* Section 02: The Idea */}
          <IdeaSection />

          {/* Section 03: How Oyinca Works */}
          <HowItWorksSection />

          {/* Section 04: Product Demo */}
          <ProductDemoSection />

          {/* Section 05: Oyinca Brain */}
          <BrainSection />

          {/* Section 06: Built Around Your Brand */}
          <BrandAlignmentSection />

          {/* Section 07: Working in the Background */}
          <BackgroundOperationsSection />

          {/* Section 08: Pricing */}
          <Suspense fallback={<section id="pricing" className="oy-pricing-section-new text-center py-20" aria-busy="true"><h2 className="text-xl">Loading plans...</h2></section>}>
            <PricingSection />
          </Suspense>

          {/* Section 09: FAQ */}
          <FAQ />

          {/* Section 10: Final CTA */}
          <FinalCTA />
        </main>

        {/* Minimal Footer */}
        <Footer />
      </div>
    </>
  );
}

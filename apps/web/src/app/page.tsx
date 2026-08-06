import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import '@/styles/landing.css';

import Nav from '@/components/landing/Nav';
import Hero from '@/components/landing/Hero';
import HowItWorks from '@/components/landing/HowItWorks';
import EnginePipeline from '@/components/landing/EnginePipeline';
import Features from '@/components/landing/Features';
import Integrations from '@/components/landing/Integrations';
import SocialProof from '@/components/landing/SocialProof';
import InteractiveDemo from '@/components/landing/InteractiveDemo';
import Pricing from '@/components/landing/Pricing';
import FAQ from '@/components/landing/FAQ';
import FinalCTA from '@/components/landing/FinalCTA';
import Footer from '@/components/landing/Footer';

export const metadata: Metadata = {
  // Title kept as the exact app name ("AMAI") so the browser-tab title
  // matches the TikTok Developer Portal app name exactly, per TikTok's
  // app-review requirement (they flagged a mismatch between the two).
  title: 'AMAI',
  description:
    'AMAI watches your media, writes captions and hashtags, scores every post, and publishes to Instagram and TikTok on schedule. Upload once, approve once, then let AMAI run your social media.',
  keywords: [
    'AI social media automation',
    'Instagram automation',
    'TikTok automation',
    'social media scheduling',
    'AI caption generator',
    'content approval workflow',
    'social media operating system',
    'automated publishing',
  ],
  openGraph: {
    title: 'AMAI — AI Social Media Operating System',
    description: 'Upload once. Approve once. Then let AMAI run your social media.',
    url: 'https://marketing-os-eight-virid.vercel.app',
    siteName: 'AMAI',
    images: [
      {
        url: 'https://marketing-os-eight-virid.vercel.app/app-icon.jpg',
        width: 1024,
        height: 1024,
        alt: 'AMAI — AI Social Media Operating System',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AMAI — AI Social Media Operating System',
    description: 'Upload once. Approve once. Then let AMAI run your social media.',
    images: ['https://marketing-os-eight-virid.vercel.app/app-icon.jpg'],
  },
  alternates: {
    canonical: 'https://marketing-os-eight-virid.vercel.app',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'AMAI',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'AI social media operating system that generates captions and hashtags, scores content, and publishes to Instagram and TikTok on schedule after a single approval step.',
  offers: {
    '@type': 'Offer',
    price: '19',
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
      <div
        className="amai-landing relative min-h-screen"
        style={
          {
            // Design System v2: Space Grotesk + Inter are now loaded once at
            // the root layout (apps/web/src/app/layout.tsx) and shared by
            // the whole app, rather than this page loading its own second
            // copy. These aliases keep every landing component's existing
            // var(--lp-font-heading) / var(--lp-font-body) references
            // working unchanged, now pointed at the shared fonts.
            '--lp-font-heading': 'var(--font-heading-var)',
            '--lp-font-body': 'var(--font-body-var)',
          } as CSSProperties
        }
      >
        {/* Single continuous background asset (glow blooms + grain +
            vignette) spanning the full page height behind every section,
            so the backdrop flows seamlessly from hero to footer instead of
            resetting section to section. See landing.css for the layers. */}
        <div className="lp-ambient-bg" aria-hidden="true">
          <div className="lp-ambient-blooms" />
          <div className="lp-ambient-grain" />
          <div className="lp-ambient-vignette" />
        </div>

        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg lp-btn-primary"
        >
          Skip to main content
        </a>
        <Nav />
        <main id="main-content">
          <Hero />
          <HowItWorks />
          <EnginePipeline />
          <Features />
          <InteractiveDemo />
          <Integrations />
          <SocialProof />
          <Pricing />
          <FAQ />
          <FinalCTA />
        </main>
        <Footer />
      </div>
    </>
  );
}

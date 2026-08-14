import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import '@/styles/landing.css';

import Nav from '@/components/landing/Nav';
import Hero from '@/components/landing/Hero';
import ProblemSection from '@/components/landing/ProblemSection';
import HowItWorks from '@/components/landing/HowItWorks';
import Features from '@/components/landing/Features';
import AutopilotSection from '@/components/landing/AutopilotSection';
import ProductVisual from '@/components/landing/ProductVisual';
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
    'AMAI is your AI social media employee. It plans, creates, publishes and learns across Instagram and TikTok, so you don\'t have to. Start free, no credit card required.',
  keywords: [
    'AI social media employee',
    'AI social media automation',
    'Instagram automation',
    'TikTok automation',
    'social media scheduling',
    'AI caption generator',
    'content approval workflow',
    'AutoPilot social media',
    'automated publishing',
  ],
  openGraph: {
    title: 'AMAI: Your AI Social Media Employee',
    description: 'Your social media. On autopilot. AMAI plans, creates, publishes and learns so you don\'t have to.',
    url: 'https://marketing-os-eight-virid.vercel.app',
    siteName: 'AMAI',
    images: [
      {
        url: 'https://marketing-os-eight-virid.vercel.app/app-icon.jpg',
        width: 1024,
        height: 1024,
        alt: 'AMAI: Your AI Social Media Employee',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AMAI: Your AI Social Media Employee',
    description: 'Your social media. On autopilot. AMAI plans, creates, publishes and learns so you don\'t have to.',
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
    'AMAI is an AI social media employee that plans, creates, publishes and learns across Instagram and TikTok. Free to start, with Pro and Agency plans for more automation and capacity.',
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
      <div
        className="amai-landing relative min-h-screen"
        style={
          {
            // Morrison is loaded once at the root layout
            // (apps/web/src/app/layout.tsx) and shared by the whole app.
            // These aliases keep every landing component's existing
            // var(--lp-font-heading) / var(--lp-font-body) references
            // working unchanged. Both now point at Morrison: only its
            // Regular file was supplied, so there is no separate heading
            // face to alias. (Previously --lp-font-heading pointed at
            // --font-heading-var, which stopped existing when Space Grotesk
            // was removed -- that would have silently dropped every landing
            // heading to a system-font fallback.)
            '--lp-font-heading': 'var(--font-body-var)',
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
        {/*
          Eight sections, answering five questions in order: what is AMAI
          (hero), why should I care (problem), how does it work (how it
          works + features), what's the wow (autopilot + product visual),
          what does it cost and can I try it (pricing, FAQ, CTA).

          Sections removed in the structure pass, and where their content
          went -- none of it was shrunk or hidden in an accordion, it was
          either genuinely redundant or folded into a line elsewhere:
            - SocialProof           -> vague filler line, cut outright
            - TransitionSection     -> restated the hero's promise verbatim
            - EnginePipeline        -> merged into AutopilotSection's flow
            - BusinessBrainSection  -> Features card "Business Brain"
            - ContentPipelineSection-> Features supporting line (Google Drive)
            - AnalyticsSection      -> Features card "Performance"
            - MultiPlatformSection  -> Features supporting line (channels)
            - ApprovalControlSection-> AutopilotSection's control-modes line
            - WhoForSection         -> Pricing's "businesses, creators and agencies"
            - AgencySection         -> Pricing's Agency one-liner + Agency tier
            - InteractiveDemo       -> superseded by ProductVisual
          The component files are all still in components/landing/ and can
          be re-added to this list if any of them is wanted back.
        */}
        <main id="main-content">
          <Hero />
          <ProblemSection />
          <HowItWorks />
          <Features />
          <AutopilotSection />
          <ProductVisual />
          <Pricing />
          <FAQ />
          <FinalCTA />
        </main>
        <Footer />
      </div>
    </>
  );
}

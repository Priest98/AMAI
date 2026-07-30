import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { Space_Grotesk, Inter } from 'next/font/google';
import '@/styles/landing.css';

import Nav from '@/components/landing/Nav';
import Hero from '@/components/landing/Hero';
import HowItWorks from '@/components/landing/HowItWorks';
import EnginePipeline from '@/components/landing/EnginePipeline';
import Features from '@/components/landing/Features';
import SocialProof from '@/components/landing/SocialProof';
import InteractiveDemo from '@/components/landing/InteractiveDemo';
import Pricing from '@/components/landing/Pricing';
import FAQ from '@/components/landing/FAQ';
import FinalCTA from '@/components/landing/FinalCTA';
import Footer from '@/components/landing/Footer';

// Loaded only for the marketing site — the authenticated dashboard keeps
// its own Geist typography untouched.
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--lp-font-heading-var',
  display: 'swap',
});
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--lp-font-body-var',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AMAI — AI Social Media Operating System | Upload once. Approve once.',
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
        className={`amai-landing dark min-h-screen ${spaceGrotesk.variable} ${inter.variable}`}
        style={
          {
            '--lp-font-heading': 'var(--lp-font-heading-var)',
            '--lp-font-body': 'var(--lp-font-body-var)',
          } as CSSProperties
        }
      >
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

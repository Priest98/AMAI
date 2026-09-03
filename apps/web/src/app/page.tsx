import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { Suspense } from 'react';
import '@/styles/landing.css';

import Nav from '@/components/landing/Nav';
import Hero from '@/components/landing/Hero';
import HowItWorks from '@/components/landing/HowItWorks';
import Pricing from '@/components/landing/Pricing';
import FAQ from '@/components/landing/FAQ';
import FinalCTA from '@/components/landing/FinalCTA';
import Footer from '@/components/landing/Footer';
import { headers } from 'next/headers';

/**
 * Fetches the plan catalogue server-side so it's already baked into the
 * initial HTML instead of the Pricing section paying its own client-side
 * round trip after hydration (see the comment on Pricing's initialData
 * prop for the measured impact -- that round trip wasn't even starting
 * until 7+ seconds after navigation on this page).
 *
 * Deliberately calls the app's OWN public /api/billing/plans route by
 * absolute same-origin URL rather than importing getBackendPort() and
 * talking to the NestJS app's loopback port directly. Those look
 * equivalent but aren't: Turbopack compiles Server Components (this file)
 * and Route Handlers (src/app/api/[...path]/route.ts) into separate server
 * chunks, each with its OWN copy of backendPort.ts's module-level
 * `backendPortPromise` cache -- importing it here booted a SECOND,
 * independent NestJS application (its own Prisma client, its own DB pool)
 * on every request instead of reusing the one the route handler already
 * has warm. Confirmed via a temporary debug log: that second instance's
 * Prisma client failed to reach Supabase entirely
 * (PrismaClientInitializationError, pooler connection limit), silently
 * falling back to null every time and wasting a full failed boot+connect
 * attempt per request in the process. Going through the public route
 * instead reuses the already-initialized, already-connected instance.
 *
 * Next's fetch cache holds the result for an hour: /billing/plans has no
 * auth, no per-visitor data and no DB query at all (see
 * BillingController.getPlans -- it returns the static PLAN_CONFIG /
 * PLAN_PRICING objects directly), so there is nothing request-specific to
 * invalidate on. One visitor pays the cost of populating the cache; every
 * other visitor within the hour gets it for free. Falls back to null (and
 * Pricing's own client-side fetch takes over) if this ever fails, so a
 * backend hiccup at request time degrades gracefully instead of breaking
 * the page.
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
  const initialPlansData = await getPlansServerSide();
  return <Pricing initialData={initialPlansData} />;
}

export const metadata: Metadata = {
  // Title kept as the exact app name ("Oyinca") so the browser-tab title
  // matches the TikTok Developer Portal app name exactly, per TikTok's
  // app-review requirement (they flagged a mismatch between the two in the
  // past, back when this was "AMAI"). IMPORTANT: the TikTok Developer
  // Portal app name must be updated to "Oyinca" to match -- see the final
  // rebrand report's "Required OAuth/TikTok Developer Portal changes"
  // section. The full "Your AI Social Media Manager" positioning lives in
  // the visible hero/description copy instead of the tab title itself.
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
    // Production domain migrated from amai.codes to oyinca.com (the
    // brand-matching domain). amai.codes stays configured as a redirect in
    // Vercel's project domain settings, but every URL this app generates
    // points at oyinca.com.
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
      <div
        className="amai-landing relative min-h-screen"
        style={
          {
            // The body/UI face (Inter) is loaded once at the root layout
            // (apps/web/src/app/layout.tsx) and shared by the whole app.
            // These aliases keep every landing component's existing
            // var(--lp-font-heading) / var(--lp-font-body) references
            // working unchanged -- both point at the same body face here,
            // since most headings use size/weight/spacing for hierarchy
            // rather than the display face. The luxury rebrand's Playfair
            // Display serif is reserved for major headlines via
            // .lp-hero-display and .lp-heading-display (--font-display-var
            // directly), not the whole page's default heading voice.
            '--lp-font-heading': 'var(--font-body-var)',
            '--lp-font-body': 'var(--font-body-var)',
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


        <div className="lp-ambient-bg" aria-hidden="true">
          <div className="lp-ambient-blooms" />
          <div className="lp-ambient-grain" />
          <div className="lp-ambient-vignette" />
        </div>

        <main id="main-content">
          <Hero />

          <HowItWorks />

          <Suspense fallback={<section id="pricing" className="oy-section" aria-busy="true"><h2>Loading plans...</h2></section>}>
            <PricingSection />
          </Suspense>
          <FAQ />
          <FinalCTA />
        </main>
        <Footer />

      </div>
    </>
  );
}

import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { Suspense } from 'react';
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
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Isolated in its own async component (rather than awaited at the top of
 * Home()) specifically so a slow/cold backend can't block the rest of the
 * page's HTML from streaming. Wrapped in <Suspense> below with the
 * ordinary client-fetching <Pricing /> as its fallback -- worst case
 * (server fetch is slow or fails) is exactly today's behavior; best case
 * (the common one, since the result is cached for an hour) the numbers are
 * already in the initial HTML and Pricing never has to fetch client-side
 * at all.
 */
async function PricingSection() {
  const initialPlansData = await getPlansServerSide();
  return <Pricing initialData={initialPlansData} />;
}

export const metadata: Metadata = {
  // Title kept as the exact app name ("AMAI") so the browser-tab title
  // matches the TikTok Developer Portal app name exactly, per TikTok's
  // app-review requirement (they flagged a mismatch between the two).
  title: 'AMAI',
  description:
    'AMAI is your TikTok content on autopilot. Upload your content and AMAI handles captions, hashtags, optimization, scheduling and publishing to TikTok. Start free, no credit card required.',
  keywords: [
    'TikTok automation',
    'TikTok scheduling',
    'TikTok content on autopilot',
    'AI caption generator',
    'TikTok hashtag generator',
    'content approval workflow',
    'AutoPilot TikTok',
    'automated TikTok publishing',
  ],
  openGraph: {
    title: 'AMAI: Your TikTok Content on Autopilot',
    description: 'Upload your content. AMAI handles captions, hashtags, optimization, scheduling and publishing to TikTok, so you don\'t have to.',
    url: 'https://marketing-os-eight-virid.vercel.app',
    siteName: 'AMAI',
    images: [
      {
        url: 'https://marketing-os-eight-virid.vercel.app/app-icon.jpg',
        width: 1024,
        height: 1024,
        alt: 'AMAI: Your TikTok Content on Autopilot',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AMAI: Your TikTok Content on Autopilot',
    description: 'Upload your content. AMAI handles captions, hashtags, optimization, scheduling and publishing to TikTok, so you don\'t have to.',
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
    'AMAI turns your existing content into scheduled, published TikTok posts -- AI captions, hashtags, optimization and publishing on autopilot. Free to start, with Pro and Agency plans for more automation and capacity.',
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
            // The body/UI face (Plus Jakarta Sans) is loaded once at the
            // root layout (apps/web/src/app/layout.tsx) and shared by the
            // whole app. These aliases keep every landing component's
            // existing var(--lp-font-heading) / var(--lp-font-body)
            // references working unchanged -- both point at the same body
            // face, since headings use size/weight/spacing for hierarchy
            // rather than a separate heading face. The one exception is
            // .lp-hero-display (Hero + FinalCTA headlines), which reads
            // --font-display directly for the Instrument Serif treatment.
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
          <Suspense fallback={<Pricing initialData={null} />}>
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

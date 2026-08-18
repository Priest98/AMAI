"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { Reveal, Eyebrow } from './shared';
// PlanEntitlements/PlanPricing/PlanTier are types only -- imported with an
// explicit `import type` because Turbopack's per-file transform can't always
// prove type-only-ness on its own and will emit a runtime import for an
// export that doesn't exist at runtime (the same class of bug that broke
// billing.service.ts earlier). getPlans is a real value, so it stays a
// normal import.
import { getPlans } from '@/lib/billing';
import type { PlanEntitlements, PlanPricing, PlanTier } from '@/lib/billing';
import { detectCurrency, formatPrice, type Currency } from '@/lib/currency';

type PlansResponse = { plans: PlanEntitlements[]; pricing: Record<PlanTier, Record<Currency, PlanPricing>> };

interface CardCopy {
  tier: PlanTier;
  badge?: string;
  heading: string;
  includes: string[];
  cta: string;
  highlighted?: boolean;
}

/**
 * Qualitative bullets only. Anything numeric (accounts, posts, AI
 * generations, storage) is rendered separately from the live plan config
 * via dynamicBullets() below, so it can never drift from what's actually
 * enforced server-side.
 *
 * These lists used to restate those same limits in words -- Free listed
 * both "20 posts/month" (dynamic) and "Limited monthly posts" (static),
 * plus "10 AI generations/month" and "Limited AI usage", so every card
 * said the same thing twice and ran 12-13 bullets long. The vague
 * duplicates are gone; only capabilities the numbers don't already
 * communicate remain.
 */
const CARD_COPY: Record<PlanTier, Omit<CardCopy, 'tier'>> = {
  FREE: {
    heading: 'For businesses getting started with AI-powered social media.',
    includes: [
      'Core AI content generation',
      'Basic scheduling',
      'Basic AutoPilot',
      'Basic analytics',
      'Basic Business Brain',
      'Google Drive integration',
    ],
    cta: 'Start Free',
  },
  PRO: {
    badge: 'MOST POPULAR',
    heading: 'For businesses ready to automate more.',
    includes: [
      'Everything in Free, plus:',
      'Advanced AutoPilot',
      'Advanced analytics',
      'AI recommendations',
      'Advanced Business Brain',
      'Content repurposing',
      'Priority processing',
    ],
    cta: 'Start Pro',
    highlighted: true,
  },
  AGENCY: {
    heading: 'For teams managing multiple businesses.',
    includes: [
      'Everything in Pro, plus:',
      'Multiple client workspaces',
      'Client management',
      'Team members',
      'Client-specific Business Brain',
      'Agency overview',
      'Client-level analytics',
      'White-label where supported',
    ],
    cta: 'Start Agency',
  },
};

function formatStorage(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return gb >= 1 ? `${gb} GB` : `${Math.round(bytes / (1024 * 1024))} MB`;
}

/** Reshapes the API's `plans: PlanEntitlements[]` array into a by-tier map, shared by the SSR-prop path and the client-fetch fallback below. */
function toByTier(data: PlansResponse): Record<PlanTier, PlanEntitlements> {
  const byTier: any = {};
  data.plans.forEach((p) => { byTier[p.tier] = p; });
  return byTier;
}

export default function Pricing({ initialData }: { initialData?: PlansResponse | null }) {
  // initialData comes from the server (page.tsx fetches it during SSR, see
  // the comment there) so plan numbers are already present in the very
  // first HTML the browser paints -- this section used to wait for full
  // client hydration to even START its own fetch (measured: the fetch to
  // /billing/plans wasn't firing until 7+ seconds after navigation start on
  // this page, well after window.load, because it was gated behind the
  // whole landing bundle downloading, parsing and hydrating first). Static,
  // rarely-changing catalogue data like this has no reason to pay that
  // cost -- it's fetched once server-side with a 1h revalidate window
  // (see getPlansServerSide in page.tsx) and reused by every visitor hitting
  // Next's cache, not re-queried per page load.
  const [plans, setPlans] = useState<Record<PlanTier, PlanEntitlements> | null>(
    initialData ? toByTier(initialData) : null,
  );
  const [pricing, setPricing] = useState<Record<PlanTier, Record<Currency, PlanPricing>> | null>(
    initialData?.pricing ?? null,
  );
  // Detected once on mount (client-only -- Intl/navigator aren't available
  // during SSR) rather than on every render, so the price a visitor sees
  // doesn't flicker between currencies mid-scroll.
  const [currency, setCurrency] = useState<Currency>('USD');

  useEffect(() => {
    setCurrency(detectCurrency());
    // Server already supplied the catalogue -- no need to also pay a
    // client round trip for the same data on first paint. Only fetch here
    // if the server fetch failed/was skipped (e.g. backend briefly
    // unavailable at build/request time), so the section still works.
    if (initialData) return;
    getPlans()
      .then((data) => {
        setPlans(toByTier(data));
        setPricing(data.pricing);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live-numbers overlay: appends the plan's actual account/post/AI/storage
  // limits to the static marketing bullets, so a limit change in
  // plans.config.ts (the backend's single source of truth) is reflected
  // here automatically instead of needing a matching copy edit.
  const dynamicBullets = (tier: PlanTier): string[] => {
    if (!plans) return [];
    const p = plans[tier];
    const acct = p.maxSocialAccountsPerBrand === -1 ? 'Unlimited social accounts' : `${p.maxSocialAccountsPerBrand} social account${p.maxSocialAccountsPerBrand === 1 ? '' : 's'}`;
    const posts = p.maxMonthlyPosts === -1 ? 'Unlimited posts/month' : `${p.maxMonthlyPosts} posts/month`;
    const ai = p.maxMonthlyAiGenerations === -1 ? 'Unlimited AI generations/month' : `${p.maxMonthlyAiGenerations} AI generations/month`;
    const storage = `${formatStorage(p.maxStorageBytes)} storage`;
    return [acct, posts, ai, storage];
  };

  return (
    <section id="pricing" className="relative py-16 sm:py-20" aria-label="Pricing">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <Reveal className="text-center max-w-2xl mx-auto">
          <Eyebrow>Simple Pricing</Eyebrow>
          <h2 className="lp-heading mt-5 text-3xl sm:text-4xl font-bold tracking-tight">
            Start free. Upgrade when you need more.
          </h2>
          <p className="mt-4 text-sm" style={{ color: 'var(--lp-text-secondary)' }}>
            No complicated contracts. No hidden setup fees.
          </p>
        </Reveal>

        <div className="mt-16 grid md:grid-cols-3 gap-6 items-start">
          {(['FREE', 'PRO', 'AGENCY'] as PlanTier[]).map((tier, i) => {
            const copy = CARD_COPY[tier];
            const price = pricing?.[tier]?.[currency];
            return (
              <Reveal key={tier} delay={i * 0.08}>
                <div
                  className="lp-card h-full p-8 flex flex-col relative"
                  style={
                    copy.highlighted
                      ? { borderColor: 'var(--lp-cyan)', boxShadow: '0 0 0 1px var(--lp-cyan), 0 20px 60px -20px rgba(57,231,255,0.35)' }
                      : undefined
                  }
                >
                  {copy.badge && (
                    <span
                      className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                      style={{ background: 'var(--lp-gradient-brand)', color: '#04070D' }}
                    >
                      {copy.badge}
                    </span>
                  )}
                  <h3 className="lp-heading font-bold text-lg">{plans?.[tier]?.displayName || tier}</h3>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--lp-text-secondary)' }}>
                    {copy.heading}
                  </p>

                  <div className="mt-6">
                    {tier === 'FREE' ? (
                      <div className="flex items-baseline gap-1">
                        <span className="lp-heading text-4xl font-bold">{formatPrice(0, currency)}</span>
                        <span className="text-sm" style={{ color: 'var(--lp-text-muted)' }}>forever</span>
                      </div>
                    ) : price?.newUserMonthly != null ? (
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm line-through" style={{ color: 'var(--lp-text-muted)' }}>{formatPrice(price.regularMonthly || 0, currency)}/month</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="lp-heading text-4xl font-bold">{formatPrice(price.newUserMonthly, currency)}</span>
                          <span className="text-sm" style={{ color: 'var(--lp-text-muted)' }}>/month</span>
                        </div>
                        <p className="mt-1 text-xs font-semibold" style={{ color: 'var(--lp-cyan)' }}>
                          New users save {formatPrice((price.regularMonthly || 0) - price.newUserMonthly, currency)}/month.
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="lp-heading text-4xl font-bold">{price?.regularMonthly != null ? formatPrice(price.regularMonthly, currency) : '—'}</span>
                        <span className="text-sm" style={{ color: 'var(--lp-text-muted)' }}>/month</span>
                      </div>
                    )}
                  </div>

                  <ul className="mt-6 space-y-2.5">
                    {dynamicBullets(tier).map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--lp-cyan)' }} />
                        <span className="font-semibold" style={{ color: 'var(--lp-text-primary)' }}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <ul className="mt-3 space-y-2.5 flex-1">
                    {copy.includes.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        {f.startsWith('Everything in') ? (
                          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--lp-text-muted)' }}>{f}</span>
                        ) : (
                          <>
                            <Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--lp-cyan)' }} />
                            <span style={{ color: 'var(--lp-text-secondary)' }}>{f}</span>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/register"
                    className={`mt-8 text-center px-5 py-3 rounded-xl text-sm lp-focus-ring ${copy.highlighted ? 'lp-btn-primary' : 'lp-btn-ghost font-semibold'}`}
                  >
                    {copy.cta}
                  </Link>
                  <p className="mt-3 text-[11px] text-center" style={{ color: 'var(--lp-text-muted)' }}>
                    {tier === 'FREE' ? 'No credit card required.' : 'New-user pricing applies to eligible new customers.'}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* Where the old standalone "Who AMAI is for" (three large cards)
            and "For Agencies" sections ended up. The plans themselves
            already communicate who each tier is for -- restating it as two
            full sections earlier in the page made a small-business visitor
            scroll through an agency pitch before reaching a price. */}
        <Reveal delay={0.2} className="mt-10 text-center">
          <p className="text-sm font-medium" style={{ color: 'var(--lp-text-secondary)' }}>
            Built for businesses, creators and agencies.
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--lp-text-muted)' }}>
            Agency — manage multiple brands and client workspaces from one place.
          </p>
        </Reveal>

        <Reveal delay={0.25} className="mt-8 text-center">
          <p className="text-xs max-w-2xl mx-auto" style={{ color: 'var(--lp-text-muted)' }}>
            All plans can be changed or cancelled according to the applicable billing terms. Usage limits
            and feature availability may vary by plan. Introductory pricing is available to eligible new
            customers for the stated promotional period.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

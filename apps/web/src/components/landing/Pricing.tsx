"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

import { Check } from "lucide-react";
import { Eyebrow } from "./shared";
import GsapReveal from "./GsapReveal";
import { getPlans } from "@/lib/billing";
import type { PlanEntitlements, PlanPricing, PlanTier } from "@/lib/billing";
import { detectCurrency, formatPrice, type Currency } from "@/lib/currency";

type PlansResponse = {
  plans: PlanEntitlements[];
  pricing: Record<PlanTier, Record<Currency, PlanPricing>>;
};

interface CardCopy {
  tier: PlanTier;
  badge?: string;
  heading: string;
  includes: string[];
  cta: string;
  highlighted?: boolean;
}

const CARD_COPY: Record<PlanTier, Omit<CardCopy, "tier">> = {
  FREE: {
    heading:
      "For creators and businesses getting started with AI-powered TikTok content.",
    includes: [
      "AI captions, hashtags & scheduling for TikTok",

      "Assisted mode: you approve each post",
      "Basic analytics",
      "Basic Business Brain",
      "Google Drive integration",
    ],
    cta: "Start Free",
  },
  PRO: {
    badge: "MORE AUTOMATION",
    heading: "For businesses ready to put TikTok content on autopilot.",
    includes: [
      "Everything in Free, plus:",
      "Advanced Autopilot with optional auto-approval",
      "Advanced analytics",
      "AI recommendations",
      "Advanced Business Brain",
      "Content repurposing",
      "Priority processing",
    ],
    cta: "Start Pro",
    highlighted: true,
  },
  CREATOR: {
    badge: "BUILD YOUR ECOSYSTEM",
    heading:
      "For creators and small teams running more than one TikTok presence.",
    includes: [
      "Everything in Pro, plus:",

      "Creator Command Center",
      "Cross-account intelligence",
      "Priority processing",
    ],
    cta: "Start Creator",
    highlighted: true,
  },
  AGENCY: {
    heading: "For teams managing TikTok for multiple clients.",
    includes: [
      "Everything in Creator, plus:",
      "Multiple client workspaces",
      "Client management",
      "Team members",
      "Client-specific Business Brain",
      "Agency overview",
      "Client-level analytics",
      "White-label where supported",
    ],
    cta: "Start Agency",
  },
};

function formatStorage(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return gb >= 1 ? `${gb} GB` : `${Math.round(bytes / (1024 * 1024))} MB`;
}

function toByTier(data: PlansResponse): Record<PlanTier, PlanEntitlements> {
  const byTier = {} as Record<PlanTier, PlanEntitlements>;
  data.plans.forEach((p) => {
    byTier[p.tier] = p;
  });
  return byTier;
}

export default function Pricing({
  initialData,
}: {
  initialData?: PlansResponse | null;
}) {
  const [plans, setPlans] = useState<Record<PlanTier, PlanEntitlements> | null>(
    initialData ? toByTier(initialData) : null,
  );
  const [pricing, setPricing] = useState<Record<
    PlanTier,
    Record<Currency, PlanPricing>
  > | null>(initialData?.pricing ?? null);
  const [currency, setCurrency] = useState<Currency>("USD");
  const [loadError, setLoadError] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const retryPlans = async () => {
    setRetrying(true);
    setLoadError(false);
    try {
      const data = await getPlans();
      setPlans(toByTier(data));
      setPricing(data.pricing);
    } catch {
      setLoadError(true);
    } finally {
      setRetrying(false);
    }
  };

  useEffect(() => {
    setCurrency(detectCurrency());
    if (initialData) return;
    getPlans()
      .then((data) => {
        setPlans(toByTier(data));
        setPricing(data.pricing);
      })
      .catch(() => setLoadError(true));
  }, []);

  const dynamicBullets = (tier: PlanTier): string[] => {
    if (!plans) return [];
    const p = plans[tier];
    const acct = `${p.maxBrands === -1 ? "Unlimited" : p.maxBrands} workspace${p.maxBrands === 1 ? "" : "s"}; ${p.maxSocialAccountsPerBrand === -1 ? "unlimited" : p.maxSocialAccountsPerBrand} social account${p.maxSocialAccountsPerBrand === 1 ? "" : "s"} per workspace`;
    const posts =
      p.maxMonthlyPosts === -1
        ? "Unlimited posts/month"
        : `${p.maxMonthlyPosts} posts/month`;
    const ai =
      p.maxMonthlyAiGenerations === -1
        ? "Unlimited AI generations/month"
        : `${p.maxMonthlyAiGenerations} AI generations/month`;
    const storage = `${formatStorage(p.maxStorageBytes)} storage`;
    return [acct, posts, ai, storage];
  };

  return (
    <section
      id="pricing"
      className="relative py-24 sm:py-32 lg:py-40"
      aria-label="Pricing"
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <GsapReveal className="text-center max-w-2xl mx-auto">
          <Eyebrow>Simple Pricing</Eyebrow>
          <h2 className="lp-heading-display mt-6 text-3xl sm:text-4xl lg:text-5xl">
            Start free. Upgrade when you need more TikTok.
          </h2>
          <p
            className="mt-5 text-sm leading-relaxed"
            style={{ color: "var(--lp-text-secondary)" }}
          >
            Choose your monthly capacity. Review and approve posts on Free;
            unlock more automation on paid plans.
          </p>
        </GsapReveal>

        <div className="mt-8 text-center">
          <label htmlFor="pricing-currency">Show prices in </label>
          <select
            id="pricing-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            className="oy-currency"
          >
            {(["USD", "GBP", "NGN"] as Currency[]).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        {loadError && (
          <p role="status" className="mt-6 text-center text-sm">
            Current prices could not be loaded.{" "}
            <button
              type="button"
              className="underline p-2"
              disabled={retrying}
              onClick={retryPlans}
            >
              Retry prices
            </button>
          </p>
        )}
        <div className="oy-pricing-grid">
          {(["FREE", "PRO", "CREATOR", "AGENCY"] as PlanTier[]).map((tier) => {
            const copy = CARD_COPY[tier];
            const price = pricing?.[tier]?.[currency];
            return (
              <div
                key={tier}
                className={`lp-card lp-card-sheen h-full p-6 sm:p-8 flex flex-col relative ${copy.highlighted ? "lp-glow-border-gold" : ""}`}
                style={
                  copy.highlighted
                    ? { borderColor: "var(--lp-gold)" }
                    : undefined
                }
              >
                {copy.badge && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      background: "var(--lp-gradient-gold)",
                      color: "#241A08",
                    }}
                  >
                    {copy.badge}
                  </span>
                )}
                <h3 className="lp-heading-display text-xl">
                  {plans?.[tier]?.displayName || tier}
                </h3>
                <p
                  className="mt-3 text-sm leading-relaxed"
                  style={{ color: "var(--lp-text-secondary)" }}
                >
                  {copy.heading}
                </p>

                <div className="mt-8">
                  {tier === "FREE" ? (
                    <div className="flex flex-wrap items-baseline gap-1">
                      <span className="lp-heading oy-price font-bold">
                        {formatPrice(0, currency)}
                      </span>
                      <span
                        className="text-sm"
                        style={{ color: "var(--lp-text-muted)" }}
                      >
                        forever
                      </span>
                    </div>
                  ) : price?.newUserMonthly != null ? (
                    <div>
                      <div className="flex flex-wrap items-baseline gap-1">
                        <span className="lp-heading oy-price font-bold">
                          {formatPrice(price.newUserMonthly, currency)}
                        </span>
                        <span
                          className="text-sm"
                          style={{ color: "var(--lp-text-muted)" }}
                        >
                          /month
                        </span>
                      </div>
                      <p
                        className="mt-2 text-xs font-semibold"
                        style={{ color: "var(--lp-gold)" }}
                      >
                        New-subscription monthly price.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-baseline gap-1">
                      <span className="lp-heading oy-price font-bold">
                        {price?.regularMonthly != null
                          ? formatPrice(price.regularMonthly, currency)
                          : "Price unavailable"}
                      </span>
                      <span
                        className="text-sm"
                        style={{ color: "var(--lp-text-muted)" }}
                      >
                        /month
                      </span>
                    </div>
                  )}
                </div>

                <ul className="mt-8 space-y-3">
                  {dynamicBullets(tier).map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <Check
                        className="h-4 w-4 shrink-0 mt-0.5"
                        style={{
                          color: copy.highlighted
                            ? "var(--lp-gold)"
                            : "var(--lp-cyan)",
                        }}
                      />
                      <span
                        className="font-semibold leading-relaxed"
                        style={{ color: "var(--lp-text-primary)" }}
                      >
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>

                <ul className="mt-6 space-y-3 flex-1">
                  {copy.includes.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      {f.startsWith("Everything in") ? (
                        <span
                          className="text-xs font-bold uppercase tracking-wide"
                          style={{ color: "var(--lp-text-muted)" }}
                        >
                          {f}
                        </span>
                      ) : (
                        <>
                          <Check
                            className="h-4 w-4 shrink-0 mt-0.5"
                            style={{
                              color: copy.highlighted
                                ? "var(--lp-gold)"
                                : "var(--lp-cyan)",
                            }}
                          />
                          <span
                            className="leading-relaxed"
                            style={{ color: "var(--lp-text-secondary)" }}
                          >
                            {f}
                          </span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/register?plan=${tier}`}
                  className={`mt-8 text-center px-5 py-4 rounded-xl text-sm lp-focus-ring ${copy.highlighted ? "lp-btn-primary" : "lp-btn-ghost font-semibold"}`}
                >
                  {copy.cta}
                </Link>
                <p
                  className="mt-4 text-[11px] text-center"
                  style={{ color: "var(--lp-text-muted)" }}
                >
                  {tier === "FREE"
                    ? "No credit card required."
                    : "Review the recurring price before payment."}
                </p>
              </div>
            );
          })}
        </div>

        <GsapReveal delay={0.1} className="mt-14 text-center">
          <p
            className="text-sm font-medium leading-relaxed"
            style={{ color: "var(--lp-text-secondary)" }}
          >
            Built for businesses, creators and agencies.
          </p>
          <p
            className="mt-2 text-sm leading-relaxed"
            style={{ color: "var(--lp-text-muted)" }}
          >
            Creator: run separate TikTok workspaces with cross-account
            intelligence. Agency: manage brands and client workspaces from one
            place.
          </p>
        </GsapReveal>

        <GsapReveal delay={0.15} className="mt-10 text-center">
          <p
            className="text-xs leading-relaxed max-w-2xl mx-auto"
            style={{ color: "var(--lp-text-muted)" }}
          >
            All plans can be changed or cancelled according to the applicable
            billing terms. Your account starts on Free. Review eligibility,
            currency, billing interval and the final recurring price at checkout
            before subscribing.
          </p>
        </GsapReveal>
      </div>
    </section>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { getPlans } from "@/lib/billing";
import type { PlanEntitlements, PlanPricing, PlanTier } from "@/lib/billing";
import { formatPrice, type Currency } from "@/lib/currency";

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
    heading: "For creators and businesses getting started with AI-powered TikTok content.",
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
    badge: "Most Popular",
    heading: "For businesses ready to put their TikTok workflow on intelligent autopilot.",
    includes: [
      "Everything in Free, plus:",
      "Advanced Autopilot with optional auto-approval",
      "Advanced analytics & activity logs",
      "Adaptive Business Brain context",
      "Priority processing queue",
    ],
    cta: "Start Pro",
    highlighted: true,
  },
  CREATOR: {
    badge: "Multi-Presence",
    heading: "For creators and teams running multiple brands and high-volume drops.",
    includes: [
      "Everything in Pro, plus:",
      "Creator Command Center",
      "Cross-account intelligence",
      "Higher monthly post capacity",
      "Multi-brand memory silos",
    ],
    cta: "Start Creator",
  },
  AGENCY: {
    heading: "For agencies orchestrating separate client workspaces and approvals.",
    includes: [
      "Everything in Creator, plus:",
      "Multiple client workspaces",
      "Client management & team seats",
      "Client-specific Business Brain",
      "Agency overview & cross-client analytics",
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
  currency,
}: {
  initialData?: PlansResponse | null;
  currency: Currency;
}) {
  const [plans, setPlans] = useState<Record<PlanTier, PlanEntitlements> | null>(
    initialData ? toByTier(initialData) : null
  );
  const [pricing, setPricing] = useState<Record<
    PlanTier,
    Record<Currency, PlanPricing>
  > | null>(initialData?.pricing ?? null);
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
    if (initialData) return;
    getPlans()
      .then((data) => {
        setPlans(toByTier(data));
        setPricing(data.pricing);
      })
      .catch(() => setLoadError(true));
  }, [initialData]);

  const dynamicLimits = (tier: PlanTier): string[] => {
    if (!plans) return [];
    const p = plans[tier];
    const acct = `${p.maxBrands === -1 ? "Unlimited" : p.maxBrands} workspace${p.maxBrands === 1 ? "" : "s"}`;
    const posts =
      p.maxMonthlyPosts === -1
        ? "Unlimited posts/mo"
        : `${p.maxMonthlyPosts} posts/mo`;
    const ai =
      p.maxMonthlyAiGenerations === -1
        ? "Unlimited AI generations"
        : `${p.maxMonthlyAiGenerations} AI generations/mo`;
    const storage = `${formatStorage(p.maxStorageBytes)} storage`;
    return [acct, posts, ai, storage];
  };

  return (
    <section
      id="pricing"
      className="oy-pricing-section-new"
      aria-label={`Pricing in ${currency}`}
      data-pricing-currency={currency}
    >
      <div className="oy-pricing-container">
        <div className="oy-pricing-header">
          <p className="oy-eyebrow">Clear Capacity Plans</p>
          <h2>Start free. Scale your rhythm.</h2>
          <p className="text-[15px] text-[var(--oy-ink-muted)]">
            Review every post on Free. Unlock higher post capacity and continuous
            Autopilot on paid tiers.
          </p>

          {loadError && (
            <div className="mt-4 text-xs text-red-600">
              Pricing details could not load right now.{" "}
              <button
                type="button"
                className="underline font-semibold ml-1 cursor-pointer"
                disabled={retrying}
                onClick={retryPlans}
              >
                {retrying ? "Retrying..." : "Retry"}
              </button>
            </div>
          )}
        </div>

        <div className="oy-pricing-grid-new">
          {(["FREE", "PRO", "CREATOR", "AGENCY"] as PlanTier[]).map((tier) => {
            const copy = CARD_COPY[tier];
            const price = pricing?.[tier]?.[currency];
            const isFeatured = copy.highlighted;

            return (
              <div
                key={tier}
                data-tier={tier}
                className={`oy-plan-card ${isFeatured ? "is-featured" : ""}`}
              >
                {copy.badge && <div className="oy-plan-badge">{copy.badge}</div>}

                <h3 className="oy-plan-name">{plans?.[tier]?.displayName || tier}</h3>
                <p className="oy-plan-desc">{copy.heading}</p>

                <div className="oy-plan-price-row">
                  {tier === "FREE" ? (
                    <>
                      <span className="oy-plan-amount">{formatPrice(0, currency)}</span>
                      <span className="oy-plan-period">forever</span>
                    </>
                  ) : price?.newUserMonthly != null ? (
                    <>
                      <span className="oy-plan-amount">
                        {formatPrice(price.newUserMonthly, currency)}
                      </span>
                      <span className="oy-plan-period">/month</span>
                    </>
                  ) : (
                    <>
                      <span className="oy-plan-amount">
                        {price?.regularMonthly != null
                          ? formatPrice(price.regularMonthly, currency)
                          : "Custom"}
                      </span>
                      <span className="oy-plan-period">/month</span>
                    </>
                  )}
                </div>

                {/* Limits summary pills */}
                {plans && (
                  <div className="mb-4 pb-4 border-b border-[var(--oy-line)] flex flex-wrap gap-1.5">
                    {dynamicLimits(tier).map((lim) => (
                      <span
                        key={lim}
                        className="text-[10px] font-medium bg-white text-[var(--oy-ink-muted)] border border-[var(--oy-line)] px-2 py-0.5 rounded-md"
                      >
                        {lim}
                      </span>
                    ))}
                  </div>
                )}

                <ul className="oy-plan-features">
                  {copy.includes.map((feat) => (
                    <li key={feat}>
                      <Check className="w-4 h-4 text-[#10B981] flex-shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/register?plan=${tier}`}
                  className={`oy-plan-cta ${
                    isFeatured ? "oy-plan-cta-primary" : "oy-plan-cta-secondary"
                  }`}
                >
                  <span>{copy.cta}</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

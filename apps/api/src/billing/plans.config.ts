import { PlanTier } from '@prisma/client';

/**
 * The single source of truth for what each plan includes. Nothing outside
 * this file should hardcode a limit or a feature flag -- EntitlementsService
 * reads exclusively from here, and every other layer (guards, controllers,
 * frontend via the /billing/plans endpoint) goes through EntitlementsService
 * instead of re-deriving numbers. Change a limit by editing this file only.
 *
 * -1 means "no limit" for any numeric field.
 */
export interface PlanEntitlements {
  tier: PlanTier;
  displayName: string;
  tagline: string;

  // --- Scale ---
  /** How many Brands (client workspaces) an Organization on this plan may have. Agency's core differentiator. */
  maxBrands: number;
  /** Per Brand, not per organization -- an Agency brand and a Pro brand have the same per-client ceiling. */
  maxSocialAccountsPerBrand: number;
  /** Organization-wide, including the owner. */
  maxTeamMembers: number;

  // --- Metered usage (see UsageMetric; resets every usage period) ---
  maxMonthlyPosts: number;
  maxMonthlyAiGenerations: number;

  // --- Storage (checked live against MediaAsset.sizeBytes, not metered) ---
  maxStorageBytes: number;

  // --- Feature levels / flags ---
  autopilotLevel: 'basic' | 'advanced';
  analyticsLevel: 'basic' | 'advanced';
  businessBrainLevel: 'basic' | 'advanced';
  aiRecommendations: boolean;
  contentRepurposing: boolean;
  clientManagement: boolean; // agency client/workspace switcher + overview
  whiteLabel: boolean;
  prioritySupport: boolean;
}

const GB = 1024 * 1024 * 1024;

export const PLAN_CONFIG: Record<PlanTier, PlanEntitlements> = {
  [PlanTier.FREE]: {
    tier: PlanTier.FREE,
    displayName: 'Free',
    tagline: 'Experience Oyinca: create content, explore the platform, and see how AI-powered social media management works.',
    maxBrands: 1,
    maxSocialAccountsPerBrand: 1,
    maxTeamMembers: 1,
    maxMonthlyPosts: 20,
    maxMonthlyAiGenerations: 30,
    maxStorageBytes: 1 * GB,
    autopilotLevel: 'basic',
    analyticsLevel: 'basic',
    businessBrainLevel: 'basic',
    aiRecommendations: false,
    contentRepurposing: false,
    clientManagement: false,
    whiteLabel: false,
    prioritySupport: false,
  },
  [PlanTier.PRO]: {
    tier: PlanTier.PRO,
    displayName: 'Pro',
    tagline: 'Let Oyinca run your social media: one managed account, up to 150 posts a month, advanced intelligence and automation.',
    maxBrands: 1,
    maxSocialAccountsPerBrand: 1,
    maxTeamMembers: 1,
    maxMonthlyPosts: 150,
    maxMonthlyAiGenerations: 250,
    maxStorageBytes: 25 * GB,
    autopilotLevel: 'advanced',
    analyticsLevel: 'advanced',
    businessBrainLevel: 'advanced',
    aiRecommendations: true,
    contentRepurposing: true,
    clientManagement: false,
    whiteLabel: false,
    prioritySupport: true,
  },
  [PlanTier.AGENCY]: {
    tier: PlanTier.AGENCY,
    displayName: 'Agency',
    tagline: "Run your clients' social media: up to 5 managed accounts, up to 500 posts a month, multi-brand management and agency workflows.",
    // 5, not 25: Agency is "run up to 5 client businesses," a fundamentally
    // different environment from Pro, not just a bigger number of the same
    // thing. canCreateBrand() already blocks new-brand creation once an
    // org is at/over this ceiling -- any org that already has more than 5
    // brands keeps every one of them (nothing is deleted or disconnected),
    // it just can't add a 6th until back under the limit.
    maxBrands: 5,
    maxSocialAccountsPerBrand: 5,
    maxTeamMembers: 10,
    maxMonthlyPosts: 500,
    maxMonthlyAiGenerations: 1000,
    maxStorageBytes: 100 * GB,
    autopilotLevel: 'advanced',
    analyticsLevel: 'advanced',
    businessBrainLevel: 'advanced',
    aiRecommendations: true,
    contentRepurposing: true,
    clientManagement: true,
    whiteLabel: true,
    prioritySupport: true,
  },
};

/**
 * Currencies Oyinca actually prices and charges in. Add a new one here, add
 * its row to every tier in PLAN_PRICING below, and create the matching
 * Stripe Price objects (see StripeProviderService.priceIdForPlan for the
 * env var naming convention) -- all three places have to move together.
 */
export type SupportedCurrency = 'USD' | 'GBP' | 'NGN';
export const SUPPORTED_CURRENCIES: SupportedCurrency[] = ['USD', 'GBP', 'NGN'];
export const DEFAULT_CURRENCY: SupportedCurrency = 'USD';

export interface PlanPricing {
  regularMonthly: number | null;
  newUserMonthly: number | null;
  /**
   * Total charged once a year, not a monthly rate -- always exactly 10x the
   * matching monthly figure (a flat "2 months free" discount, applied
   * uniformly across every plan/currency rather than varying by market).
   * Null wherever the matching monthly figure is null (Free has no charge
   * at all; a currency/tier with no newUserMonthly has no newUserAnnual
   * either).
   */
  regularAnnual: number | null;
  newUserAnnual: number | null;
}

/**
 * Display + checkout pricing, per plan per currency. Kept separate from
 * PLAN_CONFIG (entitlements) so pricing copy changes never risk touching
 * enforcement logic -- entitlements are identical across currencies, only
 * the price tag differs.
 *
 * The actual amount charged at checkout comes from the matching Stripe
 * Price object (env var per plan+currency, see StripeProviderService), not
 * directly from these numbers -- these are what's rendered on the pricing
 * page and must be kept in sync with whatever the Stripe Prices actually
 * charge. Update all three (here, the Stripe dashboard, and the env vars)
 * together if a price changes.
 *
 * GBP is a straight conversion of the USD price (~0.74 USD/GBP, snapshotted
 * August 2026 -- not a live-updating rate; revisit if GBP moves a lot).
 * NGN is a deliberately different (non-converted) local price point, not a
 * currency conversion of USD -- set directly per product/business decision.
 */
/** Annual = 10x monthly, applied mechanically so it can never drift out of sync with a monthly price edit. Null propagates (Free, and any currency with no newUserMonthly). */
function annualOf(monthly: number | null): number | null {
  return monthly == null ? null : monthly * 10;
}

function pricing(regularMonthly: number, newUserMonthly: number | null): PlanPricing {
  return {
    regularMonthly,
    newUserMonthly,
    regularAnnual: annualOf(regularMonthly),
    newUserAnnual: annualOf(newUserMonthly),
  };
}

export const PLAN_PRICING: Record<PlanTier, Record<SupportedCurrency, PlanPricing>> = {
  [PlanTier.FREE]: {
    USD: pricing(0, null),
    GBP: pricing(0, null),
    NGN: pricing(0, null),
  },
  [PlanTier.PRO]: {
    USD: pricing(29, 19),
    GBP: pricing(21, 14),
    NGN: pricing(20000, 9900),
  },
  [PlanTier.AGENCY]: {
    USD: pricing(99, 79),
    GBP: pricing(73, 58),
    NGN: pricing(100000, 50000),
  },
};

export function getPlanEntitlements(tier: PlanTier): PlanEntitlements {
  return PLAN_CONFIG[tier];
}

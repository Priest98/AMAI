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
    tagline: 'For creators and businesses getting started with AI-powered TikTok content.',
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
    tagline: 'For businesses ready to put TikTok content on autopilot.',
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
    tagline: 'For teams managing TikTok for multiple clients.',
    maxBrands: 25,
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
export const PLAN_PRICING: Record<PlanTier, Record<SupportedCurrency, PlanPricing>> = {
  [PlanTier.FREE]: {
    USD: { regularMonthly: 0, newUserMonthly: null },
    GBP: { regularMonthly: 0, newUserMonthly: null },
    NGN: { regularMonthly: 0, newUserMonthly: null },
  },
  [PlanTier.PRO]: {
    USD: { regularMonthly: 29, newUserMonthly: 19 },
    GBP: { regularMonthly: 21, newUserMonthly: 14 },
    NGN: { regularMonthly: 20000, newUserMonthly: 9900 },
  },
  [PlanTier.AGENCY]: {
    USD: { regularMonthly: 99, newUserMonthly: 79 },
    GBP: { regularMonthly: 73, newUserMonthly: 58 },
    NGN: { regularMonthly: 100000, newUserMonthly: 50000 },
  },
};

export function getPlanEntitlements(tier: PlanTier): PlanEntitlements {
  return PLAN_CONFIG[tier];
}

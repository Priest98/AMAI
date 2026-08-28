"use client";

import { apiFetch, brandFetch } from './api';
import { detectCurrency, type Currency } from './currency';

export type PlanTier = 'FREE' | 'PRO' | 'CREATOR' | 'AGENCY';
export type SubscriptionStatus = 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';

export interface PlanEntitlements {
  tier: PlanTier;
  displayName: string;
  tagline: string;
  maxBrands: number;
  maxSocialAccountsPerBrand: number;
  maxTeamMembers: number;
  maxMonthlyPosts: number;
  maxMonthlyAiGenerations: number;
  maxStorageBytes: number;
  autopilotLevel: 'basic' | 'advanced';
  analyticsLevel: 'basic' | 'advanced';
  businessBrainLevel: 'basic' | 'advanced';
  aiRecommendations: boolean;
  contentRepurposing: boolean;
  clientManagement: boolean;
  whiteLabel: boolean;
  prioritySupport: boolean;
}

export type BillingInterval = 'MONTHLY' | 'ANNUAL';

export interface PlanPricing {
  regularMonthly: number | null;
  newUserMonthly: number | null;
  /** Total charged once a year (not a monthly rate) -- always 10x the matching monthly figure. Null wherever the monthly figure is null. */
  regularAnnual: number | null;
  newUserAnnual: number | null;
}

export interface BillingSummary {
  plan: PlanTier;
  subscribedPlan: PlanTier;
  status: SubscriptionStatus;
  /** What currency the active subscription is actually being charged in -- 'USD' (the schema default) for orgs that have never completed a paid checkout. */
  currency: Currency;
  /** Which billing cycle the active subscription is on -- 'MONTHLY' (the schema default) for orgs that have never completed a paid checkout. */
  billingInterval: BillingInterval;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  /** True exactly once, right after a genuine upgrade to Pro/Agency, until the user dismisses the welcome moment (see ProActivationModal). */
  showProActivation: boolean;
  entitlements: PlanEntitlements;
  usage: {
    aiGenerations: { used: number; limit: number };
    posts: { used: number; limit: number };
    storage: { used: number; limit: number };
    /** Live counts, not period counters -- disconnecting an account frees the slot immediately. */
    socialAccounts: { used: number; limit: number };
    clients: { used: number; limit: number };
    periodStart: string;
    periodEnd: string;
  };
}

/** Public plan catalogue -- no auth, safe for the marketing site. Pricing is nested per currency (USD/GBP/NGN); pick the visitor's currency with detectCurrency(). */
export function getPlans() {
  return apiFetch<{ plans: PlanEntitlements[]; pricing: Record<PlanTier, Record<Currency, PlanPricing>> }>('/billing/plans');
}

export function getBillingSummary() {
  return brandFetch<BillingSummary>('/billing');
}

/** Currency defaults to the visitor's browser-detected currency (see lib/currency.ts) if not passed explicitly; billingInterval defaults to MONTHLY. */
export async function startCheckout(plan: 'PRO' | 'CREATOR' | 'AGENCY', currency?: Currency, billingInterval?: BillingInterval): Promise<void> {
  const { url } = await brandFetch<{ url: string }>('/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({ plan, currency: currency || detectCurrency(), billingInterval: billingInterval || 'MONTHLY' }),
  });
  window.location.href = url;
}

export async function openBillingPortal(): Promise<void> {
  const { url } = await brandFetch<{ url: string }>('/billing/portal', { method: 'POST' });
  window.location.href = url;
}

/** Dismisses the one-time Pro/Agency activation welcome moment -- see BillingSummary.showProActivation. */
export async function markProActivationSeen(): Promise<void> {
  await brandFetch('/billing/activation-seen', { method: 'POST' });
}

/**
 * LOCAL DEV / QA ONLY -- calls the NODE_ENV-gated backend endpoint (see
 * BillingController.devSetPlan) that instantly switches the caller's own
 * org plan for testing Pro/Agency-gated features without a payment
 * provider, which isn't configured in local dev at all. The backend
 * enforces the NODE_ENV check independently; this is just the client for it.
 */
export async function devSetPlan(plan: PlanTier): Promise<{ organizationId: string; plan: PlanTier; status: SubscriptionStatus }> {
  return brandFetch('/billing/dev-set-plan', { method: 'POST', body: JSON.stringify({ plan }) });
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

/** Which of the three contextual-upgrade stages a usage percentage falls into (see #19 in the spec) -- null means "don't show anything". */
export function usageStage(percentUsed: number): 'approaching' | 'near' | 'reached' | null {
  if (percentUsed >= 100) return 'reached';
  if (percentUsed >= 90) return 'near';
  if (percentUsed >= 70) return 'approaching';
  return null;
}

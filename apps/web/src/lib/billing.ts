"use client";

import { apiFetch, brandFetch } from './api';
import { detectCurrency, type Currency } from './currency';

export type PlanTier = 'FREE' | 'PRO' | 'AGENCY';
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

export interface PlanPricing {
  regularMonthly: number | null;
  newUserMonthly: number | null;
}

export interface BillingSummary {
  plan: PlanTier;
  subscribedPlan: PlanTier;
  status: SubscriptionStatus;
  /** What currency the active subscription is actually being charged in -- 'USD' (the schema default) for orgs that have never completed a paid checkout. */
  currency: Currency;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
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

/** Currency defaults to the visitor's browser-detected currency (see lib/currency.ts) if not passed explicitly. */
export async function startCheckout(plan: 'PRO' | 'AGENCY', currency?: Currency): Promise<void> {
  const { url } = await brandFetch<{ url: string }>('/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({ plan, currency: currency || detectCurrency() }),
  });
  window.location.href = url;
}

export async function openBillingPortal(): Promise<void> {
  const { url } = await brandFetch<{ url: string }>('/billing/portal', { method: 'POST' });
  window.location.href = url;
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

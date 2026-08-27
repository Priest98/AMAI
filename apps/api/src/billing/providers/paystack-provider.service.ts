import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PlanTier, BillingInterval } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { NormalizedSubscriptionEvent, PaymentProvider } from './payment-provider.interface';
import type { SupportedCurrency } from '../plans.config';

const API_BASE = 'https://api.paystack.co';

const BILLING_INTERVALS: BillingInterval[] = [BillingInterval.MONTHLY, BillingInterval.ANNUAL];

// Paystack has no GBP support at all (confirmed against their currency
// list: NGN/GHS/ZAR/KES/USD only), which is exactly why it's no longer the
// provider used for GBP or USD checkouts -- BillingService.providerForCurrency
// routes those to Stripe instead, and only ever calls this class for NGN.
// This type stays narrowed to NGN (rather than including USD) so a routing
// mistake that sends the wrong currency here fails at compile time, not by
// silently charging the wrong amount in production.
type PaystackCurrency = 'NGN';

const STATUS_MAP: Record<string, NormalizedSubscriptionEvent['status']> = {
  active: 'ACTIVE',
  // Still active and still has access until the period ends -- mirrors how
  // Stripe's cancel_at_period_end works (status stays ACTIVE, a separate
  // flag says it won't renew). See EntitlementsService.effectivePlan.
  'non-renewing': 'ACTIVE',
  // Payment issue, will retry on the next cycle -- grace period, matches
  // Stripe's past_due handling (EntitlementsService keeps the paid plan's
  // entitlements during this state rather than yanking access instantly).
  attention: 'PAST_DUE',
  completed: 'EXPIRED',
  cancelled: 'CANCELLED',
};

/**
 * Paystack implementation of PaymentProvider. Test (sandbox) secret keys
 * (sk_test_...) work identically to live keys for everything here. Get free
 * test keys at https://dashboard.paystack.com/#/settings/developer (no real
 * business/card details needed to start in test mode).
 *
 * Unlike Stripe, Paystack's checkout ("Initialize Transaction") doesn't
 * need an existing customer id up front -- it matches/creates the customer
 * by email automatically -- and its subscription model has no server-side
 * "session" concept, just a plan_code passed straight into the transaction.
 */
@Injectable()
export class PaystackProviderService implements PaymentProvider {
  readonly name = 'paystack';
  private readonly logger = new Logger(PaystackProviderService.name);

  constructor(private readonly prisma: PrismaService) {}

  private secretKey(): string {
    const key = process.env.PAYSTACK_SECRET_KEY;
    if (!key) {
      throw new Error(
        'PAYSTACK_SECRET_KEY is not set. Billing/checkout is unavailable until it is configured in apps/web/.env.local (local dev) or Vercel env vars (production, not this branch).',
      );
    }
    return key;
  }

  private async paystackFetch<T = any>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.secretKey()}`,
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.status) {
      const message = body?.message || `Paystack API error (${res.status}) calling ${path}`;
      throw new Error(message);
    }
    return body.data as T;
  }

  /**
   * Fails loudly instead of silently charging the wrong currency. Before
   * today, this class was the only active PaymentProvider and would quietly
   * substitute USD for any non-NGN request (GBP included) -- a customer
   * shown a £ price at checkout but actually charged in USD. Now that
   * BillingService.providerForCurrency only ever routes NGN here, reaching
   * this with anything else means the routing logic itself has a bug, and
   * that must surface as an error, not a mischarge.
   */
  private chargeCurrency(currency: SupportedCurrency): PaystackCurrency {
    if (currency !== 'NGN') {
      throw new Error(`PaystackProviderService was asked to charge ${currency} -- Paystack has no non-NGN support here; this currency should have been routed to Stripe.`);
    }
    return 'NGN';
  }

  /**
   * One Paystack Plan per (plan tier, billing interval), NGN only (see
   * PaystackCurrency) -- Paystack Plans take their own `interval` field
   * ('monthly'/'annually') at creation time, which is why this code never
   * needs to pass an interval to Initialize Transaction; it's baked into
   * which plan_code gets used.
   *
   * DB-first, env-var-fallback: PricingAdminService.setPrice creates a real
   * new Plan via createPlan() below and stores its plan_code on an active
   * PlanPrice row whenever an Oyinca admin changes a price through the
   * admin pricing dashboard -- that row wins here. Until a price has ever
   * been changed through the dashboard, this falls back to the original
   * bootstrap mechanism: an env var pointing at a Plan created manually in
   * the Paystack dashboard. Env var naming: PAYSTACK_PLAN_{PRO|AGENCY}_{MONTHLY|ANNUAL}_NGN.
   */
  private async planCodeForPlan(plan: Exclude<PlanTier, 'FREE'>, currency: SupportedCurrency, interval: BillingInterval): Promise<string> {
    const chargeCurrency = this.chargeCurrency(currency);

    const dbRow = await this.prisma.planPrice.findFirst({
      where: { tier: plan, currency: chargeCurrency, billingInterval: interval, active: true },
    });
    if (dbRow?.paystackPlanCode) return dbRow.paystackPlanCode;

    const envVar = `PAYSTACK_PLAN_${plan}_${interval}_${chargeCurrency}`;
    const planCode = process.env[envVar];
    if (!planCode) {
      throw new Error(`${envVar} is not set (and no active DB-backed plan exists). Create a ${interval.toLowerCase()} recurring ${chargeCurrency} Plan for ${plan} in the Paystack test dashboard and set its plan_code here, or set one via the admin pricing dashboard.`);
    }
    return planCode;
  }

  /**
   * Reverse lookup across every Plan code this service has ever charged
   * through -- env vars (the original bootstrap mechanism) AND every DB
   * PlanPrice row, active or not, for the same "old subscribers' renewal
   * webhooks must still resolve" reason documented on
   * StripeProviderService.priceIdMap.
   */
  private async planCodeMap(): Promise<Record<string, { plan: Exclude<PlanTier, 'FREE'>; currency: PaystackCurrency; billingInterval: BillingInterval }>> {
    const map: Record<string, { plan: Exclude<PlanTier, 'FREE'>; currency: PaystackCurrency; billingInterval: BillingInterval }> = {};
    (['PRO', 'AGENCY'] as const).forEach((plan) => {
      BILLING_INTERVALS.forEach((billingInterval) => {
        const code = process.env[`PAYSTACK_PLAN_${plan}_${billingInterval}_NGN`];
        if (code) map[code] = { plan: PlanTier[plan] as Exclude<PlanTier, 'FREE'>, currency: 'NGN', billingInterval };
      });
    });

    const dbRows = await this.prisma.planPrice.findMany({
      where: { paystackPlanCode: { not: null } },
      select: { tier: true, billingInterval: true, paystackPlanCode: true },
    });
    for (const row of dbRows) {
      if (row.paystackPlanCode && row.tier !== PlanTier.FREE) {
        map[row.paystackPlanCode] = { plan: row.tier as Exclude<PlanTier, 'FREE'>, currency: 'NGN', billingInterval: row.billingInterval };
      }
    }
    return map;
  }

  /**
   * Creates a brand-new, real Paystack Plan -- called by
   * PricingAdminService.setPrice when an Oyinca admin changes a price
   * through the admin pricing dashboard. Paystack Plans are immutable once
   * created (no update-amount endpoint), so "changing a price" is always
   * "create a new Plan and start pointing new checkouts at its plan_code",
   * never an update to the old one -- mirrors StripeProviderService.createPrice.
   *
   * amount must be in kobo (NGN's smallest unit) per Paystack's Create Plan
   * API -- chargeAmount arrives in whole Naira (matching plans.config.ts's
   * convention), multiplied by 100 here.
   */
  async createPlan(params: { plan: Exclude<PlanTier, 'FREE'>; interval: BillingInterval; chargeAmount: number }): Promise<string> {
    const data = await this.paystackFetch<{ plan_code: string }>('/plan', {
      method: 'POST',
      body: JSON.stringify({
        name: `Oyinca ${params.plan} (${params.interval === BillingInterval.ANNUAL ? 'Annual' : 'Monthly'})`,
        amount: Math.round(params.chargeAmount * 100),
        interval: params.interval === BillingInterval.ANNUAL ? 'annually' : 'monthly',
        currency: 'NGN',
      }),
    });
    if (!data?.plan_code) throw new Error('Paystack did not return a plan_code when creating the Plan.');
    return data.plan_code;
  }

  async createCheckoutSession(params: {
    organizationId: string;
    userEmail: string;
    plan: Exclude<PlanTier, 'FREE'>;
    currency: SupportedCurrency;
    billingInterval: BillingInterval;
    existingProviderCustomerId: string | null;
    successUrl: string;
    cancelUrl: string;
  }) {
    // existingProviderCustomerId and cancelUrl are part of the shared
    // PaymentProvider shape (Stripe needs both) but Paystack doesn't use
    // either: it matches/creates the customer by email automatically on
    // every Initialize Transaction call, and it has no separate
    // cancel-redirect concept -- a visitor who backs out just never
    // completes the hosted checkout page, no callback fires either way.
    const chargeCurrency = this.chargeCurrency(params.currency);
    const planCode = await this.planCodeForPlan(params.plan, params.currency, params.billingInterval);
    const data = await this.paystackFetch<{ authorization_url: string; access_code: string; reference: string }>('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        email: params.userEmail,
        plan: planCode,
        currency: chargeCurrency,
        callback_url: params.successUrl,
        metadata: { organizationId: params.organizationId, plan: params.plan, currency: chargeCurrency, billingInterval: params.billingInterval },
      }),
    });

    if (!data?.authorization_url) throw new Error('Paystack did not return a checkout URL.');
    return { url: data.authorization_url };
  }

  async createPortalSession(params: { providerCustomerId: string | null; providerSubscriptionId: string | null; returnUrl: string }) {
    // Paystack's "manage subscription" link is keyed by subscription_code,
    // not customer id -- returnUrl isn't supported by the hosted page
    // (unlike Stripe's Billing Portal), the customer just navigates back
    // manually when done.
    if (!params.providerSubscriptionId) {
      throw new Error('Paystack billing management link requires a providerSubscriptionId -- this org has no active Paystack subscription yet.');
    }
    const data = await this.paystackFetch<{ link: string }>(`/subscription/${params.providerSubscriptionId}/manage/link`, { method: 'GET' });
    if (!data?.link) throw new Error('Paystack did not return a management link.');
    return { url: data.link };
  }

  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string) {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      throw new Error('PAYSTACK_SECRET_KEY is not set -- cannot verify webhook authenticity, refusing to process.');
    }
    const expected = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
    const expectedBuf = Buffer.from(expected, 'utf8');
    const actualBuf = Buffer.from(signatureHeader || '', 'utf8');
    const valid = expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf);
    if (!valid) {
      throw new Error('Invalid Paystack webhook signature.');
    }

    const parsed = JSON.parse(rawBody.toString('utf8'));
    // Paystack doesn't give webhook events a unique id the way Stripe does
    // (event.id) -- a hash of the exact raw bytes is a reliable stand-in
    // for idempotency purposes, since a genuine retry of the same event
    // resends byte-identical payloads, while any two distinct real events
    // (even of the same type) differ in at least a timestamp field.
    const id = crypto.createHash('sha256').update(rawBody).digest('hex');
    return { id, type: parsed.event, data: parsed.data };
  }

  async extractSubscriptionEvent(eventType: string, data: unknown): Promise<NormalizedSubscriptionEvent | null> {
    const RELEVANT_EVENTS = new Set(['subscription.create', 'invoice.update', 'invoice.payment_failed', 'subscription.not_renew', 'subscription.disable']);
    if (!RELEVANT_EVENTS.has(eventType)) {
      // charge.success is deliberately not handled directly here --
      // subscription.create (first charge) and invoice.update (renewals)
      // already cover every subscription state change charge.success would
      // otherwise duplicate, mirroring how Stripe's checkout.session.completed
      // is treated as informational-only alongside customer.subscription.*.
      return null;
    }

    const payload = data as any;
    const subscriptionCode: string | undefined = payload?.subscription_code || payload?.subscription?.subscription_code;
    if (!subscriptionCode) {
      this.logger.warn(`Paystack ${eventType} webhook had no subscription_code in its payload -- ignoring.`);
      return null;
    }

    // Rather than trust each event type's (inconsistent) payload shape for
    // plan/currency/status, re-fetch the subscription's canonical current
    // state from Paystack directly -- the Fetch Subscription endpoint
    // always returns a fully expanded plan object (plan_code + currency),
    // customer object, status, and next_payment_date regardless of which
    // webhook triggered this call.
    let sub: any;
    try {
      sub = await this.paystackFetch<any>(`/subscription/${subscriptionCode}`, { method: 'GET' });
    } catch (err: any) {
      this.logger.error(`Failed to fetch canonical Paystack subscription ${subscriptionCode} for ${eventType}: ${err.message}`);
      return null;
    }

    const planCode: string | undefined = sub?.plan?.plan_code;
    const planInfo = planCode ? (await this.planCodeMap())[planCode] : undefined;
    if (!planInfo) {
      this.logger.warn(`Paystack subscription ${subscriptionCode} has unrecognized plan_code "${planCode}" -- ignoring.`);
      return null;
    }

    const status = STATUS_MAP[sub.status as string] || 'ACTIVE';

    return {
      providerCustomerId: sub.customer?.customer_code || '',
      providerSubscriptionId: subscriptionCode,
      plan: planInfo.plan,
      currency: planInfo.currency,
      billingInterval: planInfo.billingInterval,
      status,
      // Paystack doesn't expose an explicit "current period start" the way
      // Stripe does (its billing model only tracks next_payment_date going
      // forward) -- approximated as "now" at event-processing time. Not a
      // functional risk: usage-limit periods are computed independently by
      // UsageService, this is display-only ("your plan renews on...").
      currentPeriodStart: new Date(),
      currentPeriodEnd: sub.next_payment_date ? new Date(sub.next_payment_date) : new Date(),
      cancelAtPeriodEnd: sub.status === 'non-renewing',
    };
  }
}

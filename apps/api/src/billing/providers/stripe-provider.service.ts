import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { PlanTier, BillingInterval } from '@prisma/client';
import type { NormalizedSubscriptionEvent, PaymentProvider } from './payment-provider.interface';
import { SUPPORTED_CURRENCIES } from '../plans.config';
import type { SupportedCurrency } from '../plans.config';

const BILLING_INTERVALS: BillingInterval[] = [BillingInterval.MONTHLY, BillingInterval.ANNUAL];

const STATUS_MAP: Record<string, NormalizedSubscriptionEvent['status']> = {
  active: 'ACTIVE',
  trialing: 'TRIALING',
  past_due: 'PAST_DUE',
  unpaid: 'PAST_DUE',
  incomplete: 'PAST_DUE',
  incomplete_expired: 'EXPIRED',
  canceled: 'CANCELLED',
  paused: 'CANCELLED',
};

/**
 * Stripe implementation of PaymentProvider. Test-mode keys (sk_test_...,
 * whsec_...) work identically to live keys for everything here -- Stripe's
 * own recommendation for building and testing a billing integration before
 * going live, and required by the "never run experimental payment events
 * against production" constraint on this branch. Get free test keys at
 * https://dashboard.stripe.com/test/apikeys (no real card/business details
 * needed for test mode), and create two test Products with recurring
 * monthly Prices for Pro and Agency, then set the env vars below.
 */
@Injectable()
export class StripeProviderService implements PaymentProvider {
  readonly name = 'stripe';
  private readonly logger = new Logger(StripeProviderService.name);
  private stripe: Stripe | null = null;

  private client(): Stripe {
    if (this.stripe) return this.stripe;
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error(
        'STRIPE_SECRET_KEY is not set. Billing/checkout is unavailable until it is configured in apps/web/.env.local (local dev) or Vercel env vars (production, not this branch).',
      );
    }
    this.stripe = new Stripe(key, { apiVersion: '2024-11-20.acacia' as Stripe.LatestApiVersion });
    return this.stripe;
  }

  /**
   * One Stripe Price per (plan, currency, billing interval) -- Stripe
   * Prices are single-currency AND single-interval, so "Pro/USD/Monthly"
   * and "Pro/USD/Annual" are two separate Price objects even though they're
   * the same Product. Env var naming:
   * STRIPE_PRICE_{PRO|AGENCY}_{MONTHLY|ANNUAL}_{USD|GBP|NGN}.
   */
  private priceIdForPlan(plan: Exclude<PlanTier, 'FREE'>, currency: SupportedCurrency, interval: BillingInterval): string {
    const envVar = `STRIPE_PRICE_${plan}_${interval}_${currency}`;
    const priceId = process.env[envVar];
    if (!priceId) {
      throw new Error(`${envVar} is not set. Create a ${interval.toLowerCase()} recurring ${currency} Price for ${plan} in the Stripe test dashboard and set it here.`);
    }
    return priceId;
  }

  /** Reverse lookup across every configured plan+currency+interval Price id -- built fresh each call so env var changes (e.g. in tests) are picked up without a restart-dependent cache. */
  private priceIdMap(): Record<string, { plan: Exclude<PlanTier, 'FREE'>; currency: SupportedCurrency; billingInterval: BillingInterval }> {
    const map: Record<string, { plan: Exclude<PlanTier, 'FREE'>; currency: SupportedCurrency; billingInterval: BillingInterval }> = {};
    (['PRO', 'AGENCY'] as const).forEach((plan) => {
      SUPPORTED_CURRENCIES.forEach((currency) => {
        BILLING_INTERVALS.forEach((billingInterval) => {
          const id = process.env[`STRIPE_PRICE_${plan}_${billingInterval}_${currency}`];
          if (id) map[id] = { plan: PlanTier[plan] as Exclude<PlanTier, 'FREE'>, currency, billingInterval };
        });
      });
    });
    return map;
  }

  private planForPriceId(priceId: string | undefined): PlanTier | null {
    if (!priceId) return null;
    return this.priceIdMap()[priceId]?.plan ?? null;
  }

  private currencyForPriceId(priceId: string | undefined): SupportedCurrency | null {
    if (!priceId) return null;
    return this.priceIdMap()[priceId]?.currency ?? null;
  }

  private intervalForPriceId(priceId: string | undefined): BillingInterval | null {
    if (!priceId) return null;
    return this.priceIdMap()[priceId]?.billingInterval ?? null;
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
    // Known Stripe gotcha, not fixed here: some Stripe accounts lock a
    // Customer to the currency of their first paid invoice, so reusing
    // existingProviderCustomerId for a currency switch (e.g. an org that
    // paid in USD before now checking out in NGN) can be rejected by
    // Stripe. Not a concern for any org that has never completed a paid
    // checkout yet (existingProviderCustomerId is null), which covers this
    // feature's rollout -- flagging so a currency-switch bug report isn't a
    // surprise later.
    const session = await this.client().checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: this.priceIdForPlan(params.plan, params.currency, params.billingInterval), quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      customer: params.existingProviderCustomerId || undefined,
      customer_email: params.existingProviderCustomerId ? undefined : params.userEmail,
      // Ties the eventual webhook back to the right Organization without
      // relying on customer metadata alone -- belt and suspenders.
      client_reference_id: params.organizationId,
      // Lets the visitor enter a Stripe promotion code on the hosted
      // Checkout page itself -- Stripe validates and applies the discount
      // entirely on its side (percent-off, amount-off, first-N-months, expiry,
      // redemption limits all handled by Stripe), no code here needs to know
      // which codes exist. This is the coupon story for USD/GBP; Paystack has
      // no equivalent primitive for recurring Plans, so NGN checkouts have no
      // promo-code field -- newUserMonthly/newUserAnnual is NGN's discount
      // mechanism instead (see plans.config.ts).
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { organizationId: params.organizationId, currency: params.currency, billingInterval: params.billingInterval },
      },
      metadata: { organizationId: params.organizationId, plan: params.plan, currency: params.currency, billingInterval: params.billingInterval },
    });

    if (!session.url) throw new Error('Stripe did not return a checkout URL.');
    return { url: session.url };
  }

  async createPortalSession(params: { providerCustomerId: string | null; providerSubscriptionId: string | null; returnUrl: string }) {
    if (!params.providerCustomerId) {
      throw new Error('Stripe billing portal requires a providerCustomerId -- this org has no Stripe customer yet.');
    }
    const session = await this.client().billingPortal.sessions.create({
      customer: params.providerCustomerId,
      return_url: params.returnUrl,
    });
    return { url: session.url };
  }

  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not set -- cannot verify webhook authenticity, refusing to process.');
    }
    // Throws Stripe.errors.StripeSignatureVerificationError on any mismatch
    // -- the controller lets that propagate as a 400, never treating an
    // unverified payload as real.
    const event = this.client().webhooks.constructEvent(rawBody, signatureHeader, webhookSecret);
    return { id: event.id, type: event.type, data: event.data.object };
  }

  // Kept synchronous internally (no actual await needed -- Stripe's webhook
  // payload always carries everything we need directly) but declared async
  // to satisfy PaymentProvider's shared interface.
  async extractSubscriptionEvent(eventType: string, data: unknown): Promise<NormalizedSubscriptionEvent | null> {
    if (!eventType.startsWith('customer.subscription.') && eventType !== 'checkout.session.completed') {
      return null;
    }

    // checkout.session.completed doesn't carry the full subscription object
    // itself -- the immediately-following customer.subscription.created/
    // updated event does, so we only act on the subscription.* events here
    // and treat checkout.session.completed as a signal to log/track only.
    if (eventType === 'checkout.session.completed') return null;

    const sub = data as Stripe.Subscription;
    const priceId = sub.items?.data?.[0]?.price?.id;
    const plan = this.planForPriceId(priceId);
    if (!plan) {
      this.logger.warn(`Stripe subscription event with unrecognized price id "${priceId}" -- ignoring.`);
      return null;
    }

    // Prefer our own price-id -> currency map (authoritative, matches what
    // we configured) but fall back to the currency Stripe actually put on
    // the line item's Price object -- covers the case where the Price
    // exists in Stripe but its env var was renamed/removed after the fact.
    const currency = this.currencyForPriceId(priceId) ?? ((sub.items?.data?.[0]?.price?.currency?.toUpperCase() as SupportedCurrency) || 'USD');

    // Same fallback shape as currency above: prefer our own map, but Stripe's
    // Price object itself also carries recurring.interval ('month'/'year'),
    // so a renamed/removed env var still resolves to the right cycle rather
    // than silently defaulting to MONTHLY.
    const priceInterval = sub.items?.data?.[0]?.price?.recurring?.interval;
    const billingInterval =
      this.intervalForPriceId(priceId) ?? (priceInterval === 'year' ? BillingInterval.ANNUAL : BillingInterval.MONTHLY);

    const status = STATUS_MAP[sub.status] || 'ACTIVE';
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;

    return {
      providerCustomerId: customerId,
      providerSubscriptionId: sub.id,
      // Set at checkout (see createCheckoutSession's subscription_data.metadata)
      // and read straight back here -- this is what lets BillingService link
      // a brand-new subscription to the right org on the very first webhook,
      // before any providerCustomerId/providerSubscriptionId has ever been
      // stored locally to match against.
      organizationId: sub.metadata?.organizationId || undefined,
      plan,
      currency,
      billingInterval,
      status,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { PlanTier, BillingInterval } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
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

  constructor(private readonly prisma: PrismaService) {}

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
   * the same Product.
   *
   * DB-first, env-var-fallback: PricingAdminService.setPrice creates a real
   * new Price via createPrice() below and stores its id on an active
   * PlanPrice row whenever an Oyinca admin changes a price through the
   * admin pricing dashboard -- that row wins here. Until a price has ever
   * been changed through the dashboard, no such row exists and this falls
   * back to the original bootstrap mechanism: an env var pointing at a
   * Price created manually in the Stripe dashboard. Env var naming:
   * STRIPE_PRICE_{PRO|AGENCY}_{MONTHLY|ANNUAL}_{USD|GBP|NGN}.
   */
  private async priceIdForPlan(plan: Exclude<PlanTier, 'FREE'>, currency: SupportedCurrency, interval: BillingInterval): Promise<string> {
    const dbRow = await this.prisma.planPrice.findFirst({
      where: { tier: plan, currency, billingInterval: interval, active: true },
    });
    if (dbRow?.stripePriceId) return dbRow.stripePriceId;

    const envVar = `STRIPE_PRICE_${plan}_${interval}_${currency}`;
    const priceId = process.env[envVar];
    if (!priceId) {
      throw new Error(`${envVar} is not set (and no active DB-backed price exists). Create a ${interval.toLowerCase()} recurring ${currency} Price for ${plan} in the Stripe test dashboard and set it here, or set one via the admin pricing dashboard.`);
    }
    return priceId;
  }

  /**
   * Reverse lookup across every Price id this service has ever charged
   * through -- env vars (the original bootstrap mechanism) AND every DB
   * PlanPrice row, active or not. Inactive rows matter here: a customer
   * subscribed against an old, since-superseded Price keeps sending webhook
   * events that reference that old Price id for as long as they stay
   * subscribed at that rate, and this map is what resolves those events
   * back to a plan/currency/interval -- dropping inactive rows would make
   * every existing subscriber's renewal webhook fail to resolve the moment
   * an admin changes that price for new customers.
   */
  private async priceIdMap(): Promise<Record<string, { plan: Exclude<PlanTier, 'FREE'>; currency: SupportedCurrency; billingInterval: BillingInterval }>> {
    const map: Record<string, { plan: Exclude<PlanTier, 'FREE'>; currency: SupportedCurrency; billingInterval: BillingInterval }> = {};
    (['PRO', 'AGENCY'] as const).forEach((plan) => {
      SUPPORTED_CURRENCIES.forEach((currency) => {
        BILLING_INTERVALS.forEach((billingInterval) => {
          const id = process.env[`STRIPE_PRICE_${plan}_${billingInterval}_${currency}`];
          if (id) map[id] = { plan: PlanTier[plan] as Exclude<PlanTier, 'FREE'>, currency, billingInterval };
        });
      });
    });

    const dbRows = await this.prisma.planPrice.findMany({
      where: { stripePriceId: { not: null } },
      select: { tier: true, currency: true, billingInterval: true, stripePriceId: true },
    });
    for (const row of dbRows) {
      if (row.stripePriceId && row.tier !== PlanTier.FREE) {
        map[row.stripePriceId] = {
          plan: row.tier as Exclude<PlanTier, 'FREE'>,
          currency: row.currency as SupportedCurrency,
          billingInterval: row.billingInterval,
        };
      }
    }
    return map;
  }

  private async planForPriceId(priceId: string | undefined): Promise<PlanTier | null> {
    if (!priceId) return null;
    return (await this.priceIdMap())[priceId]?.plan ?? null;
  }

  private async currencyForPriceId(priceId: string | undefined): Promise<SupportedCurrency | null> {
    if (!priceId) return null;
    return (await this.priceIdMap())[priceId]?.currency ?? null;
  }

  private async intervalForPriceId(priceId: string | undefined): Promise<BillingInterval | null> {
    if (!priceId) return null;
    return (await this.priceIdMap())[priceId]?.billingInterval ?? null;
  }

  /**
   * The Stripe Product every Price for this plan tier attaches to. Unlike
   * Prices, a Product is effectively permanent (its name/description can be
   * edited in place) -- created once, manually, in the Stripe dashboard,
   * never recreated by this code. Env var naming: STRIPE_PRODUCT_ID_{PRO|AGENCY}.
   */
  private productIdForPlan(plan: Exclude<PlanTier, 'FREE'>): string {
    const envVar = `STRIPE_PRODUCT_ID_${plan}`;
    const productId = process.env[envVar];
    if (!productId) {
      throw new Error(`${envVar} is not set. Create an "Oyinca ${plan}" Product once in the Stripe dashboard (https://dashboard.stripe.com/test/products) and set its id (starts with prod_) here -- new Prices attach to this same Product going forward.`);
    }
    return productId;
  }

  /**
   * Creates a brand-new, real Stripe Price -- called by
   * PricingAdminService.setPrice when an Oyinca admin changes a price
   * through the admin pricing dashboard. Stripe Prices are immutable once
   * created, so "changing a price" is always "create a new Price object and
   * start pointing new checkouts at its id", never an update to the old
   * one -- existing subscribers keep billing at whatever Price their
   * Subscription already references, untouched by this.
   *
   * chargeAmount is whichever amount is actually meant to be charged
   * (PricingAdminService resolves newUserAmount-if-set-else-regularAmount
   * before calling this) -- mirrors how the env-var-configured Prices this
   * supersedes were always set up: only one real charge amount exists per
   * (plan, currency, interval); "regular" is a display-only marketing
   * number for the struck-through "was" price, never a second real Price
   * object.
   */
  async createPrice(params: {
    plan: Exclude<PlanTier, 'FREE'>;
    currency: SupportedCurrency;
    interval: BillingInterval;
    chargeAmount: number;
  }): Promise<string> {
    const price = await this.client().prices.create({
      product: this.productIdForPlan(params.plan),
      currency: params.currency.toLowerCase(),
      unit_amount: Math.round(params.chargeAmount * 100),
      recurring: { interval: params.interval === BillingInterval.ANNUAL ? 'year' : 'month' },
    });
    return price.id;
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
    const priceId = await this.priceIdForPlan(params.plan, params.currency, params.billingInterval);
    const session = await this.client().checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
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
    const plan = await this.planForPriceId(priceId);
    if (!plan) {
      this.logger.warn(`Stripe subscription event with unrecognized price id "${priceId}" -- ignoring.`);
      return null;
    }

    // Prefer our own price-id -> currency map (authoritative, matches what
    // we configured) but fall back to the currency Stripe actually put on
    // the line item's Price object -- covers the case where the Price
    // exists in Stripe but its env var was renamed/removed after the fact.
    const currency = (await this.currencyForPriceId(priceId)) ?? ((sub.items?.data?.[0]?.price?.currency?.toUpperCase() as SupportedCurrency) || 'USD');

    // Same fallback shape as currency above: prefer our own map, but Stripe's
    // Price object itself also carries recurring.interval ('month'/'year'),
    // so a renamed/removed env var still resolves to the right cycle rather
    // than silently defaulting to MONTHLY.
    const priceInterval = sub.items?.data?.[0]?.price?.recurring?.interval;
    const billingInterval =
      (await this.intervalForPriceId(priceId)) ?? (priceInterval === 'year' ? BillingInterval.ANNUAL : BillingInterval.MONTHLY);

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

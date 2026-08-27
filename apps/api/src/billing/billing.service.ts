import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanTier, SubscriptionStatus, BillingInterval } from '@prisma/client';
import type { NormalizedSubscriptionEvent, PaymentProvider } from './providers/payment-provider.interface';
import { StripeProviderService } from './providers/stripe-provider.service';
import { PaystackProviderService } from './providers/paystack-provider.service';
import { EntitlementsService } from './entitlements.service';
import { UsageService } from './usage.service';
import { getAppUrl } from '../common/app-url.util';
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from './plans.config';
import type { SupportedCurrency } from './plans.config';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private prisma: PrismaService,
    private stripeProvider: StripeProviderService,
    private paystackProvider: PaystackProviderService,
    private entitlementsService: EntitlementsService,
    private usageService: UsageService,
  ) {}

  /**
   * Which provider actually handles a checkout in this currency. Paystack
   * has no real GBP support (see PaystackProviderService's header comment),
   * so NGN is the only currency it's ever asked to charge -- USD and GBP
   * both go to Stripe, which supports both natively (plus Apple/Google Pay
   * and, for GBP, Bacs Direct Debit). This is the one place that decision
   * lives; nothing else should be picking a provider by currency.
   */
  private providerForCurrency(currency: SupportedCurrency): PaymentProvider {
    return currency === 'NGN' ? this.paystackProvider : this.stripeProvider;
  }

  /** Looks up the provider an *existing* subscription was created through, by the name persisted on Subscription.provider at webhook time. */
  private providerByName(name: string | null): PaymentProvider {
    if (name === 'paystack') return this.paystackProvider;
    if (name === 'stripe') return this.stripeProvider;
    throw new BadRequestException(`No billing provider on this subscription (provider="${name}") -- upgrade first to create one.`);
  }

  async getBillingSummary(brandId: string) {
    const organizationId = await this.entitlementsService.getOrganizationIdForBrand(brandId);
    const subscription = await this.entitlementsService.getSubscription(organizationId);
    const entitlements = await this.entitlementsService.getEntitlementsForOrganization(organizationId);
    const usage = await this.usageService.getAllUsage(organizationId);
    const storage = await this.entitlementsService.checkStorageUsage(organizationId);
    const period = this.usageService.getCurrentPeriod();

    // Countable (non-metered) entitlements. These are live counts rather
    // than period counters -- disconnecting an account frees the slot
    // immediately, so a stored tally would drift. Clients only matter on a
    // plan that allows more than one, but the number is cheap and lets the
    // UI decide whether to show it.
    const [socialAccountCount, clientCount] = await Promise.all([
      this.prisma.socialAccount.count({ where: { brand: { organizationId } } }),
      this.prisma.brand.count({ where: { organizationId } }),
    ]);

    return {
      plan: this.entitlementsService.effectivePlan(subscription),
      subscribedPlan: subscription.plan,
      status: subscription.status,
      currency: subscription.currency as SupportedCurrency,
      billingInterval: subscription.billingInterval,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      currentPeriodEnd: subscription.currentPeriodEnd,
      entitlements,
      usage: {
        aiGenerations: { used: usage.AI_GENERATION, limit: entitlements.maxMonthlyAiGenerations },
        posts: { used: usage.POST_PUBLISHED, limit: entitlements.maxMonthlyPosts },
        storage: { used: storage.used, limit: storage.limit },
        // maxSocialAccountsPerBrand is a per-brand ceiling; for a single-brand
        // Free/Pro org that equals the org total, and for Agency the useful
        // comparison is still per-brand, so the limit is reported as-is
        // rather than multiplied by brand count (which would imply a pooled
        // allowance that isn't how the entitlement is enforced).
        socialAccounts: { used: socialAccountCount, limit: entitlements.maxSocialAccountsPerBrand },
        clients: { used: clientCount, limit: entitlements.maxBrands },
        periodStart: period.start,
        periodEnd: period.end,
      },
    };
  }

  async startCheckout(
    brandId: string,
    userEmail: string,
    plan: 'PRO' | 'AGENCY',
    requestedCurrency?: string,
    requestedInterval?: string,
  ) {
    const organizationId = await this.entitlementsService.getOrganizationIdForBrand(brandId);
    const subscription = await this.entitlementsService.getSubscription(organizationId);
    const appUrl = getAppUrl();

    // Never trust an arbitrary client-supplied string as-is -- fall back to
    // the default rather than letting a typo'd/forged currency reach Stripe
    // (Stripe would just reject an unconfigured Price lookup anyway, but
    // failing closed here gives a clearer error path).
    const currency: SupportedCurrency = SUPPORTED_CURRENCIES.includes(requestedCurrency as SupportedCurrency)
      ? (requestedCurrency as SupportedCurrency)
      : DEFAULT_CURRENCY;

    const billingInterval: BillingInterval =
      requestedInterval === BillingInterval.ANNUAL ? BillingInterval.ANNUAL : BillingInterval.MONTHLY;

    const provider = this.providerForCurrency(currency);

    // A providerCustomerId only means something to the provider that issued
    // it -- an org that previously paid via Paystack (NGN) has a Paystack
    // customer code, not a Stripe customer id. Now that currency picks the
    // provider, a currency switch (e.g. NGN -> USD) can mean switching
    // providers too, so a mismatched id must never be forwarded: Stripe
    // would try to look up a customer that doesn't exist in its own
    // account and fail the whole checkout.
    const existingProviderCustomerId =
      subscription.provider === provider.name ? subscription.providerCustomerId : null;

    return provider.createCheckoutSession({
      organizationId,
      userEmail,
      plan: PlanTier[plan] as Exclude<PlanTier, 'FREE'>,
      currency,
      billingInterval,
      existingProviderCustomerId,
      successUrl: `${appUrl}/dashboard/settings?tab=billing&checkout=success`,
      cancelUrl: `${appUrl}/dashboard/settings?tab=billing&checkout=cancelled`,
    });
  }

  /** LOCAL DEV / QA ONLY -- see the NODE_ENV guard in BillingController.devSetPlan, the actual enforcement point. */
  async devSetPlan(brandId: string, plan: PlanTier) {
    const organizationId = await this.entitlementsService.getOrganizationIdForBrand(brandId);
    const subscription = await this.prisma.subscription.upsert({
      where: { organizationId },
      update: { plan, status: SubscriptionStatus.ACTIVE },
      create: { organizationId, plan, status: SubscriptionStatus.ACTIVE },
    });
    return { organizationId, plan: subscription.plan, status: subscription.status };
  }

  async openBillingPortal(brandId: string) {
    const organizationId = await this.entitlementsService.getOrganizationIdForBrand(brandId);
    const subscription = await this.entitlementsService.getSubscription(organizationId);
    // Which of these is required depends on the active provider (Stripe
    // needs providerCustomerId, Paystack needs providerSubscriptionId) --
    // both are passed through and PaymentProvider.createPortalSession picks
    // whichever it needs, so the check here is just "has this org ever
    // completed a paid checkout at all".
    if (!subscription.providerCustomerId && !subscription.providerSubscriptionId) {
      throw new BadRequestException('No billing account yet -- upgrade first to create one.');
    }
    const appUrl = getAppUrl();
    return this.providerByName(subscription.provider).createPortalSession({
      providerCustomerId: subscription.providerCustomerId,
      providerSubscriptionId: subscription.providerSubscriptionId,
      returnUrl: `${appUrl}/dashboard/settings?tab=billing`,
    });
  }

  /**
   * The only place a Subscription row gets written from a payment event.
   * Requires the raw request body (see billing.controller.ts + the express
   * middleware wired in backendPort.ts) so the provider's signature can be
   * verified against the exact bytes it signed -- a re-serialized/parsed
   * JSON body would fail verification even for a genuine event.
   *
   * Both providers post to the same /billing/webhook URL now (configure
   * both the Stripe and Paystack dashboards to point here) -- which one
   * sent this request is determined by which signature header is present,
   * exactly like the header check this replaces used to assume only one
   * provider could ever be configured at a time.
   */
  async handleWebhook(rawBody: Buffer, stripeSignature?: string, paystackSignature?: string): Promise<{ received: boolean }> {
    const provider = stripeSignature ? this.stripeProvider : paystackSignature ? this.paystackProvider : null;
    if (!provider) {
      throw new BadRequestException('No recognized webhook signature header (stripe-signature / x-paystack-signature).');
    }
    const event = provider.verifyWebhookSignature(rawBody, (stripeSignature ?? paystackSignature)!);

    // Idempotency: providers retry webhook delivery on any non-2xx response
    // or timeout, so the same event id can arrive more than once.
    const alreadyProcessed = await this.prisma.billingWebhookEvent.findUnique({
      where: { provider_eventId: { provider: provider.name, eventId: event.id } },
    });
    if (alreadyProcessed) {
      this.logger.log(`[billing_event] Duplicate webhook ${event.id} (${event.type}) -- already processed, skipping.`);
      return { received: true };
    }

    const normalized = await provider.extractSubscriptionEvent(event.type, event.data);
    if (normalized) {
      await this.applySubscriptionEvent(normalized, provider.name);
    } else {
      this.logger.log(`[billing_event] Webhook ${event.type} received, no subscription state change needed.`);
    }

    await this.prisma.billingWebhookEvent.create({
      data: { provider: provider.name, eventId: event.id, type: event.type },
    });

    return { received: true };
  }

  private async applySubscriptionEvent(normalized: NormalizedSubscriptionEvent, providerName: string) {
    // Prefer matching by organizationId when the provider surfaced one
    // (Stripe does, via subscription_data.metadata set at checkout -- see
    // StripeProviderService.extractSubscriptionEvent). This is what makes
    // the very first webhook for a brand-new checkout linkable at all: the
    // Subscription row for this org already exists (created FREE at signup/
    // first-touch, see EntitlementsService.getSubscription) but has no
    // providerCustomerId/providerSubscriptionId yet, so the old id-only
    // match below can never find it on a first purchase.
    //
    // Paystack's Subscription object has no metadata field (only its
    // Transaction/Customer objects do, and neither is wired to carry
    // organizationId today), so normalized.organizationId is always
    // undefined for Paystack events -- known gap, falls through to the
    // id-only match, which still works for every event *after* the first
    // one since providerCustomerId/providerSubscriptionId get persisted
    // below once linked.
    let existing = normalized.organizationId
      ? await this.prisma.subscription.findUnique({ where: { organizationId: normalized.organizationId } })
      : null;

    if (!existing) {
      existing = await this.prisma.subscription.findFirst({
        where: {
          OR: [
            { providerSubscriptionId: normalized.providerSubscriptionId },
            { providerCustomerId: normalized.providerCustomerId },
          ],
        },
      });
    }

    if (!existing) {
      this.logger.warn(
        `[billing_event] Webhook for provider subscription ${normalized.providerSubscriptionId} / customer ${normalized.providerCustomerId} matched no local Subscription row -- was the checkout session's metadata.organizationId set correctly?`,
      );
      return;
    }

    const status = SubscriptionStatus[normalized.status];
    await this.prisma.subscription.update({
      where: { id: existing.id },
      data: {
        plan: normalized.plan,
        status,
        currency: normalized.currency,
        billingInterval: normalized.billingInterval,
        provider: providerName,
        providerCustomerId: normalized.providerCustomerId,
        providerSubscriptionId: normalized.providerSubscriptionId,
        currentPeriodStart: normalized.currentPeriodStart,
        currentPeriodEnd: normalized.currentPeriodEnd,
        cancelAtPeriodEnd: normalized.cancelAtPeriodEnd,
      },
    });

    this.logger.log(
      `[billing_event] upgrade_succeeded org=${existing.organizationId} plan=${normalized.plan} status=${status} provider=${providerName}`,
    );
  }
}

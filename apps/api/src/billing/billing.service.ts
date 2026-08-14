import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanTier, SubscriptionStatus } from '@prisma/client';
import { PAYMENT_PROVIDER } from './billing.constants';
import type { NormalizedSubscriptionEvent, PaymentProvider } from './providers/payment-provider.interface';
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
    @Inject(PAYMENT_PROVIDER) private provider: PaymentProvider,
    private entitlementsService: EntitlementsService,
    private usageService: UsageService,
  ) {}

  async getBillingSummary(brandId: string) {
    const organizationId = await this.entitlementsService.getOrganizationIdForBrand(brandId);
    const subscription = await this.entitlementsService.getSubscription(organizationId);
    const entitlements = await this.entitlementsService.getEntitlementsForOrganization(organizationId);
    const usage = await this.usageService.getAllUsage(organizationId);
    const storage = await this.entitlementsService.checkStorageUsage(organizationId);
    const period = this.usageService.getCurrentPeriod();

    return {
      plan: this.entitlementsService.effectivePlan(subscription),
      subscribedPlan: subscription.plan,
      status: subscription.status,
      currency: subscription.currency as SupportedCurrency,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      currentPeriodEnd: subscription.currentPeriodEnd,
      entitlements,
      usage: {
        aiGenerations: { used: usage.AI_GENERATION, limit: entitlements.maxMonthlyAiGenerations },
        posts: { used: usage.POST_PUBLISHED, limit: entitlements.maxMonthlyPosts },
        storage: { used: storage.used, limit: storage.limit },
        periodStart: period.start,
        periodEnd: period.end,
      },
    };
  }

  async startCheckout(brandId: string, userEmail: string, plan: 'PRO' | 'AGENCY', requestedCurrency?: string) {
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

    return this.provider.createCheckoutSession({
      organizationId,
      userEmail,
      plan: PlanTier[plan] as Exclude<PlanTier, 'FREE'>,
      currency,
      existingProviderCustomerId: subscription.providerCustomerId,
      successUrl: `${appUrl}/dashboard/settings?tab=billing&checkout=success`,
      cancelUrl: `${appUrl}/dashboard/settings?tab=billing&checkout=cancelled`,
    });
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
    return this.provider.createPortalSession({
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
   */
  async handleWebhook(rawBody: Buffer, signatureHeader: string): Promise<{ received: boolean }> {
    const event = this.provider.verifyWebhookSignature(rawBody, signatureHeader);

    // Idempotency: providers retry webhook delivery on any non-2xx response
    // or timeout, so the same event id can arrive more than once.
    const alreadyProcessed = await this.prisma.billingWebhookEvent.findUnique({
      where: { provider_eventId: { provider: this.provider.name, eventId: event.id } },
    });
    if (alreadyProcessed) {
      this.logger.log(`[billing_event] Duplicate webhook ${event.id} (${event.type}) -- already processed, skipping.`);
      return { received: true };
    }

    const normalized = await this.provider.extractSubscriptionEvent(event.type, event.data);
    if (normalized) {
      await this.applySubscriptionEvent(normalized);
    } else {
      this.logger.log(`[billing_event] Webhook ${event.type} received, no subscription state change needed.`);
    }

    await this.prisma.billingWebhookEvent.create({
      data: { provider: this.provider.name, eventId: event.id, type: event.type },
    });

    return { received: true };
  }

  private async applySubscriptionEvent(normalized: NormalizedSubscriptionEvent) {
    // The subscription's own metadata carries organizationId (see
    // StripeProviderService.createCheckoutSession's subscription_data.metadata)
    // rather than trusting the customer id alone to already be linked --
    // covers the very first webhook for a brand-new checkout, before this
    // Subscription row has a providerCustomerId yet.
    const existing = await this.prisma.subscription.findFirst({
      where: {
        OR: [
          { providerSubscriptionId: normalized.providerSubscriptionId },
          { providerCustomerId: normalized.providerCustomerId },
        ],
      },
    });

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
        provider: 'stripe',
        providerCustomerId: normalized.providerCustomerId,
        providerSubscriptionId: normalized.providerSubscriptionId,
        currentPeriodStart: normalized.currentPeriodStart,
        currentPeriodEnd: normalized.currentPeriodEnd,
        cancelAtPeriodEnd: normalized.cancelAtPeriodEnd,
      },
    });

    this.logger.log(
      `[billing_event] upgrade_succeeded org=${existing.organizationId} plan=${normalized.plan} status=${status}`,
    );
  }
}

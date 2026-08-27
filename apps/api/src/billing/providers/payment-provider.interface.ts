import { PlanTier } from '@prisma/client';
import type { SupportedCurrency } from '../plans.config';

/**
 * Everything the rest of the billing system needs from a payment provider,
 * so provider-specific code (Stripe today; Paddle/LemonSqueezy/whatever
 * tomorrow) never leaks outside providers/*.ts. BillingService and the
 * controller only ever talk to this interface.
 */
export interface CheckoutSessionResult {
  url: string;
}

export interface PortalSessionResult {
  url: string;
}

/** A provider-agnostic shape for the fields BillingService needs from a webhook-carried subscription object. */
export interface NormalizedSubscriptionEvent {
  providerCustomerId: string;
  providerSubscriptionId: string;
  /**
   * Set when the provider's own subscription object carries it directly
   * (Stripe: subscription_data.metadata.organizationId, set at checkout and
   * read straight back off the webhook payload -- no extra API call).
   * Paystack's Subscription object has no metadata field at all (only its
   * Transaction and Customer objects do, and neither is wired to carry
   * organizationId today), so this is undefined for Paystack events; the
   * first-link lookup falls back to matching by provider customer/
   * subscription id in that case. See BillingService.applySubscriptionEvent.
   */
  organizationId?: string;
  plan: PlanTier;
  /** Derived from the provider's own Price/line-item currency, not guessed -- what the customer is actually being charged in. */
  currency: SupportedCurrency;
  status: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

export interface PaymentProvider {
  readonly name: string;

  /** Starts a hosted checkout flow for the given plan+currency; success/cancel redirect back into the app. */
  createCheckoutSession(params: {
    organizationId: string;
    userEmail: string;
    plan: Exclude<PlanTier, 'FREE'>;
    currency: SupportedCurrency;
    existingProviderCustomerId: string | null;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSessionResult>;

  /**
   * Hosted "manage my billing" page (update card, view invoices, cancel) --
   * avoids Oyinca ever storing card details. Different providers key this off
   * different things (Stripe: customer id; Paystack: subscription code), so
   * both are passed through and each implementation uses whichever it
   * needs.
   */
  createPortalSession(params: {
    providerCustomerId: string | null;
    providerSubscriptionId: string | null;
    returnUrl: string;
  }): Promise<PortalSessionResult>;

  /**
   * Verifies the raw request body against the provider's signature header.
   * Throws if the signature is invalid -- callers must never process an
   * unverified payload as if it were real.
   */
  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string): { id: string; type: string; data: unknown };

  /**
   * Normalizes a provider-specific subscription payload into the shape
   * BillingService understands, or null if the event type isn't
   * subscription-related. Async because a provider may need to call back
   * out to its own API for the canonical current state rather than trusting
   * a webhook payload's shape for every event type (Paystack: most event
   * types only carry a subscription_code, not the full plan/currency, so
   * this fetches the authoritative record instead of guessing from partial
   * payload shapes).
   */
  extractSubscriptionEvent(eventType: string, data: unknown): Promise<NormalizedSubscriptionEvent | null>;
}

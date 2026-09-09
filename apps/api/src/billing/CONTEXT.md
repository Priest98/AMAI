# Billing and entitlements context

## Purpose

Billing owns plan definitions, regional prices, checkout/provider webhooks, subscriptions, usage reservations, and server-authoritative feature entitlements. Stripe and Paystack are adapters behind the payment-provider contract.

## Important files and data

- `plans.config.ts`, `billing.constants.ts`: plan capabilities and stable identifiers.
- `billing.service.ts`: checkout, webhook normalization, subscription state.
- `entitlements.service.ts`, `usage.service.ts`: authorization and atomic usage accounting.
- `providers`: Stripe/Paystack-specific calls and signature verification.
- Prisma: `Subscription`, `PlanPrice`, `UsageRecord`, `BillingWebhookEvent`.

## Invariants

- Every organization has a subscription row, including Free.
- Client UI is never authoritative for access or quotas.
- Verify webhook signatures and process provider events idempotently.
- Reserve usage before costly work; release reservations after failed work where the existing flow requires it.
- Do not silently change plan identifiers, limits, subscription enforcement, or provider association rules.

## Validation

Inspect billing controllers, provider tests in `tests/production-regressions.test.cjs`, landing plan-intent tests, and affected checkout UI. Major pricing changes require checking regional display and both payment providers.

import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { EntitlementsService } from './entitlements.service';
import { UsageService } from './usage.service';
import { EntitlementGuard } from './entitlement.guard';
import { StripeProviderService } from './providers/stripe-provider.service';
import { PaystackProviderService } from './providers/paystack-provider.service';
import { PAYMENT_PROVIDER } from './billing.constants';

@Module({
  controllers: [BillingController],
  providers: [
    BillingService,
    EntitlementsService,
    UsageService,
    EntitlementGuard,
    StripeProviderService,
    PaystackProviderService,
    // Active provider is Paystack (no Stripe account available -- see
    // billing decision history). StripeProviderService is left registered
    // and fully working so this is a one-line revert/swap if that changes;
    // it's simply not bound to PAYMENT_PROVIDER right now. Swap payment
    // providers by changing this useClass, nothing else.
    { provide: PAYMENT_PROVIDER, useClass: PaystackProviderService },
  ],
  exports: [EntitlementsService, UsageService, EntitlementGuard],
})
export class BillingModule {}

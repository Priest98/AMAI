import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { EntitlementsService } from './entitlements.service';
import { UsageService } from './usage.service';
import { EntitlementGuard } from './entitlement.guard';
import { StripeProviderService } from './providers/stripe-provider.service';
import { PaystackProviderService } from './providers/paystack-provider.service';
import { PricingAdminService } from './pricing-admin.service';
import { PricingAdminController } from './pricing-admin.controller';
import { AdminModule } from '../admin/admin.module';

@Module({
  // AdminModule exports AuditLogService, which PricingAdminService uses to
  // record every live price change (who changed what, when, which Stripe
  // Price/Paystack Plan was actually created) -- see admin.module.ts's
  // export comment. Confirmed no circular dependency: AdminModule's own
  // imports (TelegramModule, HealthModule) don't reach back into billing.
  imports: [AdminModule],
  controllers: [BillingController, PricingAdminController],
  providers: [
    BillingService,
    EntitlementsService,
    UsageService,
    EntitlementGuard,
    StripeProviderService,
    PaystackProviderService,
    PricingAdminService,
    // No single PAYMENT_PROVIDER binding anymore -- Paystack has no real
    // GBP support (see PaystackProviderService's header comment), so a
    // single global provider can't correctly serve every market. Both
    // providers are registered directly and BillingService picks between
    // them per checkout/webhook: Stripe for USD/GBP, Paystack for NGN. See
    // BillingService.providerForCurrency / providerByName.
  ],
  exports: [EntitlementsService, UsageService, EntitlementGuard],
})
export class BillingModule {}

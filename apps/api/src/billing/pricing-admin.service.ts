import { BadRequestException, Injectable } from '@nestjs/common';
import { PlanTier, BillingInterval } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StripeProviderService } from './providers/stripe-provider.service';
import { PaystackProviderService } from './providers/paystack-provider.service';
import { AuditLogService } from '../admin/audit-log.service';
import { PLAN_PRICING, SUPPORTED_CURRENCIES } from './plans.config';
import type { SupportedCurrency, PlanPricing } from './plans.config';

const PAID_TIERS: Exclude<PlanTier, 'FREE'>[] = [PlanTier.PRO, PlanTier.AGENCY];
const BILLING_INTERVALS: BillingInterval[] = [BillingInterval.MONTHLY, BillingInterval.ANNUAL];

export interface EffectivePriceRow {
  tier: Exclude<PlanTier, 'FREE'>;
  currency: SupportedCurrency;
  billingInterval: BillingInterval;
  regularAmount: number | null;
  newUserAmount: number | null;
  /** 'database' once an admin has ever changed this cell through the dashboard, 'static_config' while it's still whatever plans.config.ts hardcodes. */
  source: 'database' | 'static_config';
  providerObjectId: string | null;
  updatedByEmail: string | null;
  updatedAt: Date | null;
}

/**
 * Backs the admin pricing dashboard. This is the "fully dynamic pricing"
 * path: an admin edit here doesn't just change a display number, it creates
 * a REAL, new, live Stripe Price or Paystack Plan (both are immutable once
 * created -- see StripeProviderService.createPrice / PaystackProviderService.createPlan)
 * and only then records it, so the DB never claims a provider object exists
 * that this service didn't actually verify was created.
 *
 * Every change is written to AuditLog (who, when, old value, new value,
 * which provider object was created) via AuditLogService -- this creates
 * real billing consequences for real customers, so "who did this" is not
 * optional the way it might be for a cosmetic settings change.
 */
@Injectable()
export class PricingAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeProvider: StripeProviderService,
    private readonly paystackProvider: PaystackProviderService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * The full PRO/AGENCY x USD/GBP/NGN x MONTHLY/ANNUAL catalogue (12 rows),
   * merging DB overrides on top of plans.config.ts's static defaults --
   * exactly the same precedence the checkout providers themselves use (see
   * StripeProviderService.priceIdForPlan / PaystackProviderService.planCodeForPlan).
   */
  async getEffectivePricing(): Promise<EffectivePriceRow[]> {
    const dbRows = await this.prisma.planPrice.findMany({ where: { active: true } });
    const byKey = new Map(dbRows.map((r) => [`${r.tier}:${r.currency}:${r.billingInterval}`, r]));

    const rows: EffectivePriceRow[] = [];
    for (const tier of PAID_TIERS) {
      for (const currency of SUPPORTED_CURRENCIES) {
        for (const billingInterval of BILLING_INTERVALS) {
          const dbRow = byKey.get(`${tier}:${currency}:${billingInterval}`);
          const staticPricing = PLAN_PRICING[tier][currency];
          const staticRegular = billingInterval === BillingInterval.ANNUAL ? staticPricing.regularAnnual : staticPricing.regularMonthly;
          const staticNewUser = billingInterval === BillingInterval.ANNUAL ? staticPricing.newUserAnnual : staticPricing.newUserMonthly;

          rows.push({
            tier,
            currency,
            billingInterval,
            regularAmount: dbRow?.regularAmount ?? staticRegular,
            newUserAmount: dbRow?.newUserAmount ?? staticNewUser,
            source: dbRow ? 'database' : 'static_config',
            providerObjectId: dbRow ? dbRow.stripePriceId || dbRow.paystackPlanCode || null : null,
            updatedByEmail: dbRow?.createdByEmail ?? null,
            updatedAt: dbRow?.createdAt ?? null,
          });
        }
      }
    }
    return rows;
  }

  /**
   * Reshapes getEffectivePricing()'s rows back into PLAN_PRICING's original
   * Record<PlanTier, Record<SupportedCurrency, PlanPricing>> shape (one
   * object per tier+currency holding both monthly and annual fields
   * together) -- what BillingController's public /billing/plans endpoint
   * returns to the pricing page and Settings > Billing. FREE is always the
   * static zero-price entry; it's never DB-backed (there's nothing to
   * charge, so nothing to ever change here).
   */
  async getPublicPricingCatalogue(): Promise<Record<PlanTier, Record<SupportedCurrency, PlanPricing>>> {
    const effective = await this.getEffectivePricing();
    const byKey = new Map(effective.map((r) => [`${r.tier}:${r.currency}:${r.billingInterval}`, r]));

    const catalogue = {} as Record<PlanTier, Record<SupportedCurrency, PlanPricing>>;
    catalogue[PlanTier.FREE] = { ...PLAN_PRICING[PlanTier.FREE] };

    for (const tier of PAID_TIERS) {
      catalogue[tier] = {} as Record<SupportedCurrency, PlanPricing>;
      for (const currency of SUPPORTED_CURRENCIES) {
        const monthly = byKey.get(`${tier}:${currency}:${BillingInterval.MONTHLY}`);
        const annual = byKey.get(`${tier}:${currency}:${BillingInterval.ANNUAL}`);
        catalogue[tier][currency] = {
          regularMonthly: monthly?.regularAmount ?? null,
          newUserMonthly: monthly?.newUserAmount ?? null,
          regularAnnual: annual?.regularAmount ?? null,
          newUserAnnual: annual?.newUserAmount ?? null,
        };
      }
    }
    return catalogue;
  }

  /**
   * Creates a new live provider Price/Plan for (tier, currency, billingInterval)
   * charging newUserAmount if set, else regularAmount -- mirrors the
   * long-standing convention (see the historical .env.example notes this
   * supersedes) that only one real charge amount ever existed per cell;
   * "regular" has always been a display-only "was" price, never a second
   * real object. Deactivates whatever DB row was previously active for this
   * exact cell (if any) in the same transaction the new row is created in,
   * so at most one row is ever active per cell -- existing subscribers on
   * the old Price/Plan are completely unaffected, this only changes what
   * NEW checkouts are offered.
   */
  async setPrice(params: {
    tier: Exclude<PlanTier, 'FREE'>;
    currency: SupportedCurrency;
    billingInterval: BillingInterval;
    regularAmount: number;
    newUserAmount: number | null;
    adminUserId: string;
    adminEmail: string;
  }): Promise<EffectivePriceRow> {
    if (!SUPPORTED_CURRENCIES.includes(params.currency)) {
      throw new BadRequestException(`Unsupported currency: ${params.currency}`);
    }
    if (!Number.isFinite(params.regularAmount) || params.regularAmount < 0) {
      throw new BadRequestException('regularAmount must be a non-negative number.');
    }
    if (params.newUserAmount != null && (!Number.isFinite(params.newUserAmount) || params.newUserAmount < 0)) {
      throw new BadRequestException('newUserAmount must be a non-negative number.');
    }
    if (params.newUserAmount != null && params.newUserAmount > params.regularAmount) {
      throw new BadRequestException('newUserAmount cannot be higher than regularAmount.');
    }

    const chargeAmount = params.newUserAmount ?? params.regularAmount;

    const previous = await this.prisma.planPrice.findFirst({
      where: { tier: params.tier, currency: params.currency, billingInterval: params.billingInterval, active: true },
    });

    // Create the real provider object FIRST, outside any DB transaction --
    // if Stripe/Paystack rejects this (bad API key, misconfigured Product,
    // network failure), nothing here should be recorded as if it succeeded.
    let stripePriceId: string | null = null;
    let paystackPlanCode: string | null = null;
    if (params.currency === 'NGN') {
      paystackPlanCode = await this.paystackProvider.createPlan({
        plan: params.tier,
        interval: params.billingInterval,
        chargeAmount,
      });
    } else {
      stripePriceId = await this.stripeProvider.createPrice({
        plan: params.tier,
        currency: params.currency,
        interval: params.billingInterval,
        chargeAmount,
      });
    }

    const created = await this.prisma.$transaction(async (tx) => {
      if (previous) {
        await tx.planPrice.update({ where: { id: previous.id }, data: { active: false } });
      }
      return tx.planPrice.create({
        data: {
          tier: params.tier,
          currency: params.currency,
          billingInterval: params.billingInterval,
          regularAmount: params.regularAmount,
          newUserAmount: params.newUserAmount,
          stripePriceId,
          paystackPlanCode,
          active: true,
          createdByEmail: params.adminEmail,
        },
      });
    });

    // AuditLogService.record() never throws (see its own doc comment), so a
    // logging failure can't roll back or hide a price change that already
    // took effect for real.
    await this.auditLogService.record({
      adminUserId: params.adminUserId,
      action: 'pricing.price_changed',
      resourceType: 'PlanPrice',
      resourceId: created.id,
      previousState: previous
        ? {
            regularAmount: previous.regularAmount,
            newUserAmount: previous.newUserAmount,
            providerObjectId: previous.stripePriceId || previous.paystackPlanCode,
          }
        : null,
      newState: {
        tier: params.tier,
        currency: params.currency,
        billingInterval: params.billingInterval,
        regularAmount: created.regularAmount,
        newUserAmount: created.newUserAmount,
        providerObjectId: stripePriceId || paystackPlanCode,
      },
    });

    return {
      tier: params.tier,
      currency: params.currency,
      billingInterval: params.billingInterval,
      regularAmount: created.regularAmount,
      newUserAmount: created.newUserAmount,
      source: 'database',
      providerObjectId: stripePriceId || paystackPlanCode,
      updatedByEmail: params.adminEmail,
      updatedAt: created.createdAt,
    };
  }
}

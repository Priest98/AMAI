import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { PlanTier, BillingInterval } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { PricingAdminService } from './pricing-admin.service';
import type { SupportedCurrency } from './plans.config';

/**
 * Oyinca's own internal pricing console -- not a customer-facing page, same
 * PlatformAdminGuard (platformRole OWNER/ADMIN only) as the rest of
 * /admin/*. Every POST here creates a REAL new Stripe Price or Paystack
 * Plan (see PricingAdminService.setPrice) -- there is no "undo", only
 * "set a new one and stop offering the old one to new checkouts".
 */
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Controller('admin/pricing')
export class PricingAdminController {
  constructor(private readonly pricingAdminService: PricingAdminService) {}

  @Get()
  async list() {
    return { prices: await this.pricingAdminService.getEffectivePricing() };
  }

  @Post()
  async setPrice(
    @Body('tier') tier: Exclude<PlanTier, 'FREE'>,
    @Body('currency') currency: SupportedCurrency,
    @Body('billingInterval') billingInterval: BillingInterval,
    @Body('regularAmount') regularAmount: number,
    @Body('newUserAmount') newUserAmount: number | null,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.pricingAdminService.setPrice({
      tier,
      currency,
      billingInterval,
      regularAmount,
      newUserAmount: newUserAmount ?? null,
      adminUserId: user.id,
      adminEmail: user.email,
    });
  }
}

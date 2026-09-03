import { Body, Controller, ForbiddenException, Get, Headers, HttpCode, HttpStatus, Logger, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BrandAccessGuard } from '../auth/brand-access.guard';
import { BillingService } from './billing.service';
import { PricingAdminService } from './pricing-admin.service';
import { PLAN_CONFIG } from './plans.config';
import type { PlanTier } from '@prisma/client';

@Controller()
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(
    private readonly billingService: BillingService,
    private readonly pricingAdminService: PricingAdminService,
  ) {}

  /**
   * Public plan catalogue for the pricing page -- no auth required, no
   * per-org data. Pricing merges any live admin-set prices (PlanPrice DB
   * rows) on top of plans.config.ts's static defaults -- see
   * PricingAdminService.getPublicPricingCatalogue -- so a price an admin
   * changes through the admin pricing dashboard is reflected here
   * immediately, without a code deploy.
   */
  @Get('billing/plans')
  async getPlans() {
    return {
      plans: Object.values(PLAN_CONFIG),
      pricing: await this.pricingAdminService.getPublicPricingCatalogue(),
    };
  }

  @UseGuards(JwtAuthGuard, BrandAccessGuard)
  @Get('brands/:brandId/billing')
  async getSummary(@Param('brandId') brandId: string) {
    return this.billingService.getBillingSummary(brandId);
  }

  @UseGuards(JwtAuthGuard, BrandAccessGuard)
  @Post('brands/:brandId/billing/checkout')
  async startCheckout(
    @Param('brandId') brandId: string,
    @Body('plan') plan: 'PRO' | 'CREATOR' | 'AGENCY',
    @Body('currency') currency: string | undefined,
    @Body('billingInterval') billingInterval: string | undefined,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.billingService.startCheckout(brandId, user.email, plan, currency, billingInterval);
  }

  @UseGuards(JwtAuthGuard, BrandAccessGuard)
  @Post('brands/:brandId/billing/portal')
  async openPortal(@Param('brandId') brandId: string) {
    return this.billingService.openBillingPortal(brandId);
  }

  /** Dismisses the one-time Pro/Agency activation welcome moment (see Subscription.proActivationSeenAt / GET .../billing's showProActivation). */
  @UseGuards(JwtAuthGuard, BrandAccessGuard)
  @Post('brands/:brandId/billing/activation-seen')
  async markActivationSeen(@Param('brandId') brandId: string) {
    return this.billingService.markActivationSeen(brandId);
  }

  /**
   * LOCAL DEV / QA ONLY. Lets an authenticated OWNER instantly switch their
   * own organization's plan for testing Pro/Agency-gated features without a
   * real payment provider -- none is configured in local dev (see
   * apps/api/.env, no Paystack or Stripe keys), so the real checkout flow
   * can't be exercised locally at all. Mirrors the existing dev-only
   * auto-verify-email pattern in AuthService.register: gated on NODE_ENV so
   * this can never exist in production, and still requires a real
   * authenticated session + BrandAccessGuard, so it can only ever change
   * the caller's own organization, never anyone else's.
   */
  @UseGuards(JwtAuthGuard, BrandAccessGuard)
  @Post('brands/:brandId/billing/dev-set-plan')
  async devSetPlan(@Param('brandId') brandId: string, @Body('plan') plan: PlanTier) {
    if (process.env.NODE_ENV !== 'development') {
      throw new ForbiddenException('Not available outside local development.');
    }
    return this.billingService.devSetPlan(brandId, plan);
  }

  /**
   * No JwtAuthGuard here on purpose -- the payment provider calls this
   * directly, it can't present a user's session token. Authenticity comes
   * from the signature check inside BillingService.handleWebhook, not from
   * any auth guard. Requires the raw request body (see the express.raw()
   * middleware wired into backendPort.ts for exactly this path) --
   * @Req().body must be a Buffer here, not parsed JSON, or signature
   * verification always fails.
   *
   * Both Stripe and Paystack are configured to POST to this same URL --
   * point both dashboards' webhook settings here. Which provider sent a
   * given request is determined by which signature header is present
   * (Stripe: stripe-signature, Paystack: x-paystack-signature); at most one
   * will ever be set on a real request from either provider.
   */
  @Post('billing/webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Req() req: Request,
    @Headers('stripe-signature') stripeSignature?: string,
    @Headers('x-paystack-signature') paystackSignature?: string,
  ) {
    const rawBody = req.body;
    if (!Buffer.isBuffer(rawBody)) {
      this.logger.error('Billing webhook received a non-Buffer body -- raw-body middleware is not wired correctly for this path.');
      return { received: false };
    }
    return this.billingService.handleWebhook(rawBody, stripeSignature, paystackSignature);
  }
}

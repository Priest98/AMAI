import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Logger, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BrandAccessGuard } from '../auth/brand-access.guard';
import { BillingService } from './billing.service';
import { PLAN_CONFIG, PLAN_PRICING } from './plans.config';

@Controller()
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(private readonly billingService: BillingService) {}

  /** Public plan catalogue for the pricing page -- no auth required, no per-org data. */
  @Get('billing/plans')
  getPlans() {
    return {
      plans: Object.values(PLAN_CONFIG),
      pricing: PLAN_PRICING,
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
    @Body('plan') plan: 'PRO' | 'AGENCY',
    @Body('currency') currency: string | undefined,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.billingService.startCheckout(brandId, user.email, plan, currency);
  }

  @UseGuards(JwtAuthGuard, BrandAccessGuard)
  @Post('brands/:brandId/billing/portal')
  async openPortal(@Param('brandId') brandId: string) {
    return this.billingService.openBillingPortal(brandId);
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
   * Header name is provider-specific -- x-paystack-signature for the
   * currently-active provider (see billing.module.ts). If this ever needs
   * to receive webhooks from two providers at once, split into two routes
   * (one per provider) rather than trying to guess the header here.
   */
  @Post('billing/webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(@Req() req: Request, @Headers('x-paystack-signature') signature: string) {
    const rawBody = req.body;
    if (!Buffer.isBuffer(rawBody)) {
      this.logger.error('Billing webhook received a non-Buffer body -- raw-body middleware is not wired correctly for this path.');
      return { received: false };
    }
    return this.billingService.handleWebhook(rawBody, signature);
  }
}

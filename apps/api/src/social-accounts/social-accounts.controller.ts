import { Controller, Get, Param, UseGuards, Req, Res, Query, Post, Body } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SocialAccountsService } from './social-accounts.service';
import { Platform } from '@marketing-os/database';

@Controller('auth')
export class SocialAccountsController {
  constructor(private readonly socialAccountsService: SocialAccountsService) {}

  // INSTAGRAM
  @Get('instagram')
  @UseGuards(AuthGuard('instagram'))
  async instagramLogin(@Query('brandId') brandId: string) {
    // Initiates the OAuth flow.
    // The passport-oauth2 strategy will append state automatically if configured, or we pass it in strategy logic.
    // In NestJS, passing dynamic state requires custom guard logic. For simplicity, we assume frontend passes ?state=brandId
  }

  @Get('instagram/callback')
  @UseGuards(AuthGuard('instagram'))
  async instagramCallback(@Req() req, @Res() res) {
    // Passport will have upserted the account and attached it to req.user.
    // Redirect back to frontend dashboard
    res.redirect('http://localhost:3000/dashboard/integrations?success=true&platform=instagram');
  }

  // TIKTOK
  @Get('tiktok')
  @UseGuards(AuthGuard('tiktok'))
  async tiktokLogin(@Query('brandId') brandId: string) {
    // Initiates TikTok OAuth
  }

  @Get('tiktok/callback')
  @UseGuards(AuthGuard('tiktok'))
  async tiktokCallback(@Req() req, @Res() res) {
    res.redirect('http://localhost:3000/dashboard/integrations?success=true&platform=tiktok');
  }

  // For getting existing accounts (moved from previous route)
  @Get(':brandId/social-accounts')
  async getConnectedAccounts(@Param('brandId') brandId: string) {
    return this.socialAccountsService.getConnectedAccounts(brandId);
  }

  // Fallback for manual/mock connection if needed
  @Post(':brandId/social-accounts/connect')
  async connectAccount(
    @Param('brandId') brandId: string,
    @Body() dto: { platform: Platform; platformAccountId: string; accessToken: string; refreshToken?: string; metadata?: any }
  ) {
    return this.socialAccountsService.connectAccount(brandId, dto);
  }
}


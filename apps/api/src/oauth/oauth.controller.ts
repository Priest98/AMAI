import { Controller, Get, Post, Delete, Patch, Query, Body, Param, Res, HttpStatus, UseGuards } from '@nestjs/common';
import { OAuthService } from './oauth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('oauth')
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  private get appUrl(): string {
    return (process.env.APP_URL || 'https://marketing-os-eight-virid.vercel.app').replace(/\/$/, '');
  }

  // ─────────────────────────────────────────────────────────────
  // GOOGLE DRIVE ENDPOINTS
  // ─────────────────────────────────────────────────────────────

  @Get('google/connect')
  getGoogleConnect(@Query('brandId') brandId: string, @Res() res: any) {
    try {
      const targetBrand = brandId || 'primary_brand';
      const authUrl = this.oauthService.getGoogleAuthUrl(targetBrand);
      return res.redirect(authUrl);
    } catch (err: any) {
      // Surface setup error directly to the integrations page
      return res.redirect(
        `${this.appUrl}/dashboard/integrations?error=${encodeURIComponent(err.message)}`,
      );
    }
  }

  @Get('google/callback')
  async handleGoogleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: any,
  ) {
    if (error) {
      return res.redirect(
        `${this.appUrl}/dashboard/integrations?error=${encodeURIComponent(`Google OAuth denied: ${error}`)}`,
      );
    }

    if (!code) {
      return res.redirect(
        `${this.appUrl}/dashboard/integrations?error=${encodeURIComponent('No authorization code received from Google.')}`,
      );
    }

    try {
      const result = await this.oauthService.handleGoogleCallback(code, state);
      return res.redirect(
        `${this.appUrl}/dashboard/integrations?success=true&platform=Google%20Drive&account=${encodeURIComponent(result.accountEmail)}`,
      );
    } catch (err: any) {
      return res.redirect(
        `${this.appUrl}/dashboard/integrations?error=${encodeURIComponent(err.message || 'Google OAuth failed')}`,
      );
    }
  }

  @Get('google/folders')
  async getGoogleFolders(@Query('brandId') brandId: string) {
    return this.oauthService.getGoogleFolders(brandId || 'primary_brand');
  }

  @Post('google/select-folder')
  async updateGoogleFolder(@Body() body: { brandId?: string; folderId: string; folderName?: string }) {
    return this.oauthService.updateGoogleFolder(body.brandId || 'primary_brand', body.folderId, body.folderName);
  }

  @Delete('google/disconnect')
  async disconnectGoogleDrive(@Query('brandId') brandId: string) {
    return this.oauthService.disconnectGoogleDrive(brandId || 'primary_brand');
  }

  // ─────────────────────────────────────────────────────────────
  // INSTAGRAM / META ENDPOINTS
  // ─────────────────────────────────────────────────────────────

  @Get('instagram/connect')
  getInstagramConnect(@Query('brandId') brandId: string, @Res() res: any) {
    try {
      const targetBrand = brandId || 'primary_brand';
      const authUrl = this.oauthService.getInstagramAuthUrl(targetBrand);
      return res.redirect(authUrl);
    } catch (err: any) {
      return res.redirect(
        `${this.appUrl}/dashboard/integrations?error=${encodeURIComponent(err.message)}`,
      );
    }
  }

  @Get('instagram/callback')
  async handleInstagramCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: any,
  ) {
    if (error) {
      return res.redirect(
        `${this.appUrl}/dashboard/integrations?error=${encodeURIComponent(errorDescription || error)}`,
      );
    }

    if (!code) {
      return res.redirect(
        `${this.appUrl}/dashboard/integrations?error=${encodeURIComponent('No authorization code received from Instagram.')}`,
      );
    }

    try {
      const result = await this.oauthService.handleInstagramCallback(code, state);
      return res.redirect(
        `${this.appUrl}/dashboard/integrations?success=true&platform=Instagram&account=${encodeURIComponent(result.handle)}`,
      );
    } catch (err: any) {
      return res.redirect(
        `${this.appUrl}/dashboard/integrations?error=${encodeURIComponent(err.message || 'Instagram OAuth failed')}`,
      );
    }
  }

  @Post('instagram/refresh')
  async refreshInstagram(@Body() body: { accountId: string }) {
    return this.oauthService.refreshInstagramToken(body.accountId);
  }

  // ─────────────────────────────────────────────────────────────
  // TIKTOK ENDPOINTS
  // ─────────────────────────────────────────────────────────────

  @Get('tiktok/connect')
  getTikTokConnect(@Query('brandId') brandId: string, @Res() res: any) {
    try {
      const targetBrand = brandId || 'primary_brand';
      const authUrl = this.oauthService.getTikTokAuthUrl(targetBrand);
      return res.redirect(authUrl);
    } catch (err: any) {
      return res.redirect(
        `${this.appUrl}/dashboard/integrations?error=${encodeURIComponent(err.message)}`,
      );
    }
  }

  @Get('tiktok/callback')
  async handleTikTokCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: any,
  ) {
    if (error) {
      return res.redirect(
        `${this.appUrl}/dashboard/integrations?error=${encodeURIComponent(`TikTok OAuth denied: ${error}`)}`,
      );
    }

    if (!code) {
      return res.redirect(
        `${this.appUrl}/dashboard/integrations?error=${encodeURIComponent('No authorization code received from TikTok.')}`,
      );
    }

    try {
      const result = await this.oauthService.handleTikTokCallback(code, state);
      return res.redirect(
        `${this.appUrl}/dashboard/integrations?success=true&platform=TikTok&account=${encodeURIComponent(result.handle)}`,
      );
    } catch (err: any) {
      return res.redirect(
        `${this.appUrl}/dashboard/integrations?error=${encodeURIComponent(err.message || 'TikTok OAuth failed')}`,
      );
    }
  }

  @Post('tiktok/refresh')
  async refreshTikTok(@Body() body: { accountId: string }) {
    return this.oauthService.refreshTikTokToken(body.accountId);
  }

  // ─────────────────────────────────────────────────────────────
  // MULTI-ACCOUNT MANAGEMENT ENDPOINTS
  // ─────────────────────────────────────────────────────────────

  // Public account & config status check
  @Get('accounts')
  async getConnectedAccounts(@Query('brandId') brandId: string) {
    return this.oauthService.getConnectedAccounts(brandId || 'primary_brand');
  }

  @UseGuards(JwtAuthGuard)
  @Delete('accounts/:accountId')
  async disconnectAccount(@Param('accountId') accountId: string) {
    return this.oauthService.disconnectAccount(accountId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('accounts/:accountId')
  async renameAccount(
    @Param('accountId') accountId: string,
    @Body() body: { handle: string },
  ) {
    return this.oauthService.renameAccount(accountId, body.handle);
  }
}

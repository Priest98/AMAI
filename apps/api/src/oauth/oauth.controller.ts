import { Controller, Get, Post, Delete, Patch, Query, Body, Param, Req, Res, HttpStatus, UseGuards, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { OAuthService } from './oauth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { getAppUrl } from '../common/app-url.util';
import { UpdateGoogleFolderDto, RefreshAccountDto, RenameAccountDto } from './dto';

@Controller('oauth')
export class OAuthController {
  private readonly logger = new Logger(OAuthController.name);

  constructor(
    private readonly oauthService: OAuthService,
    private readonly prisma: PrismaService,
  ) {}

  private get appUrl(): string {
    return getAppUrl();
  }

  /**
   * Security-audit fix: every endpoint below this point used to accept a
   * client-supplied `brandId` (query param or request body) with either no
   * guard at all, or a guard that only proved *someone* was logged in --
   * never that they belonged to the brand they were naming. That let any
   * caller (unauthenticated, for google/connect, google/folders,
   * google/select-folder, google/disconnect, instagram/connect,
   * tiktok/connect) read or rewrite another organization's Google Drive
   * source, or -- most severely -- kick off a real Instagram/TikTok OAuth
   * consent flow that would attach *their own* social account to *another
   * brand's* AutoPilot pipeline. Every handler below now runs behind
   * JwtAuthGuard and re-verifies brand membership here, the same DB check
   * BrandAccessGuard uses elsewhere in the app (never trust the claim,
   * always re-check against real organization membership).
   */
  /**
   * The three /connect handlers below (google, instagram, tiktok) all
   * catch every error the same way -- deliberately, per the security-audit
   * comment on getGoogleConnect: a raw err.message could be a stack
   * fragment, a Prisma error, or other internal detail that shouldn't
   * reach the browser. But that blanket rule was also swallowing
   * assertBrandAccess's own ForbiddenException, which is itself already a
   * safe, deliberately-written, user-facing string ("You do not have
   * access to this brand") -- flattening it to a generic "Failed to
   * start ... connection" made a real, actionable, non-sensitive error
   * (typically: a stale selected-client id left over from a previous
   * account on the same browser -- see setSession/logout in lib/api.ts)
   * indistinguishable from an actual TikTok/Instagram/Google outage. Only
   * ForbiddenException gets its message passed through; anything else
   * still falls back to the generic per-platform message.
   */
  private connectErrorMessage(err: any, fallback: string): string {
    return err instanceof ForbiddenException ? (err.message || fallback) : fallback;
  }

  private async assertBrandAccess(userId: string, brandId: string): Promise<void> {
    const brand = await this.prisma.brand.findFirst({
      where: { id: brandId, organization: { members: { some: { userId } } } },
      select: { id: true },
    });
    if (!brand) {
      throw new ForbiddenException('You do not have access to this brand.');
    }
  }

  /** Same check, but starting from a SocialAccount id (for the refresh endpoints). */
  private async assertAccountAccess(userId: string, accountId: string): Promise<string> {
    const account = await this.prisma.socialAccount.findUnique({
      where: { id: accountId },
      select: { brandId: true },
    });
    if (!account) {
      throw new NotFoundException('Account not found.');
    }
    await this.assertBrandAccess(userId, account.brandId);
    return account.brandId;
  }

  // ─────────────────────────────────────────────────────────────
  // GOOGLE DRIVE ENDPOINTS
  // ─────────────────────────────────────────────────────────────

  // A full browser navigation (window.location.href=...), not a fetch(),
  // so it can't carry an Authorization header -- authenticates via the
  // same `?token=` query-param fallback JwtStrategy already supports for
  // the SSE stream (EventSource has the identical constraint).
  @UseGuards(JwtAuthGuard)
  @Get('google/connect')
  async getGoogleConnect(@Req() req: any, @Query('brandId') brandId: string, @Res() res: any) {
    try {
      const targetBrand = brandId || req.user.brandId;
      await this.assertBrandAccess(req.user.id, targetBrand);
      const authUrl = this.oauthService.getGoogleAuthUrl(targetBrand);
      return res.redirect(authUrl);
    } catch (err: any) {
      // Security audit fix (4.5): err.message used to be reflected straight
      // into the redirect URL -- could leak internal detail (stack context,
      // Prisma error text, etc.) to the browser. Log it server-side, show a
      // generic message to the user.
      this.logger.error(`Google Drive connect failed: ${err?.message || err}`);
      return res.redirect(
        `${this.appUrl}/dashboard/media?error=${encodeURIComponent(this.connectErrorMessage(err, 'Failed to start Google Drive connection. Please try again.'))}`,
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
        `${this.appUrl}/dashboard/media?error=${encodeURIComponent(`Google OAuth denied: ${error}`)}`,
      );
    }

    if (!code) {
      return res.redirect(
        `${this.appUrl}/dashboard/media?error=${encodeURIComponent('No authorization code received from Google.')}`,
      );
    }

    try {
      const result = await this.oauthService.handleGoogleCallback(code, state);
      return res.redirect(
        `${this.appUrl}/dashboard/media?success=true&platform=Google%20Drive&account=${encodeURIComponent(result.accountEmail)}`,
      );
    } catch (err: any) {
      this.logger.error(`Google Drive callback failed: ${err?.message || err}`);
      return res.redirect(
        `${this.appUrl}/dashboard/media?error=${encodeURIComponent('We could not connect your Google Drive account. Please try again.')}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('google/folders')
  async getGoogleFolders(@Req() req: any, @Query('brandId') brandId: string) {
    const targetBrand = brandId || req.user.brandId;
    await this.assertBrandAccess(req.user.id, targetBrand);
    return this.oauthService.getGoogleFolders(targetBrand);
  }

  @UseGuards(JwtAuthGuard)
  @Post('google/select-folder')
  async updateGoogleFolder(@Req() req: any, @Body() body: UpdateGoogleFolderDto) {
    const targetBrand = body.brandId || req.user.brandId;
    await this.assertBrandAccess(req.user.id, targetBrand);
    return this.oauthService.updateGoogleFolder(targetBrand, body.folderId, body.folderName);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('google/disconnect')
  async disconnectGoogleDrive(@Req() req: any, @Query('brandId') brandId: string) {
    const targetBrand = brandId || req.user.brandId;
    await this.assertBrandAccess(req.user.id, targetBrand);
    return this.oauthService.disconnectGoogleDrive(targetBrand);
  }

  // ─────────────────────────────────────────────────────────────
  // INSTAGRAM / META ENDPOINTS
  // ─────────────────────────────────────────────────────────────

  // See getGoogleConnect's doc comment: full navigation, authenticated via
  // the `?token=` fallback, brand membership re-verified server-side.
  @UseGuards(JwtAuthGuard)
  @Get('instagram/connect')
  async getInstagramConnect(@Req() req: any, @Query('brandId') brandId: string, @Res() res: any) {
    try {
      const targetBrand = brandId || req.user.brandId;
      await this.assertBrandAccess(req.user.id, targetBrand);
      const authUrl = this.oauthService.getInstagramAuthUrl(targetBrand);
      return res.redirect(authUrl);
    } catch (err: any) {
      this.logger.error(`Instagram connect failed: ${err?.message || err}`);
      return res.redirect(
        `${this.appUrl}/dashboard/integrations?error=${encodeURIComponent(this.connectErrorMessage(err, 'Failed to start Instagram connection. Please try again.'))}`,
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
      this.logger.error(`Instagram callback failed: ${err?.message || err}`);
      return res.redirect(
        `${this.appUrl}/dashboard/integrations?error=${encodeURIComponent('We could not connect your Instagram account. Please try again.')}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('instagram/refresh')
  async refreshInstagram(@Req() req: any, @Body() body: RefreshAccountDto) {
    await this.assertAccountAccess(req.user.id, body.accountId);
    return this.oauthService.refreshInstagramToken(body.accountId);
  }

  // ─────────────────────────────────────────────────────────────
  // TIKTOK ENDPOINTS
  // ─────────────────────────────────────────────────────────────

  // See getGoogleConnect's doc comment: full navigation, authenticated via
  // the `?token=` fallback, brand membership re-verified server-side.
  @UseGuards(JwtAuthGuard)
  @Get('tiktok/connect')
  async getTikTokConnect(@Req() req: any, @Query('brandId') brandId: string, @Res() res: any) {
    try {
      const targetBrand = brandId || req.user.brandId;
      await this.assertBrandAccess(req.user.id, targetBrand);
      const authUrl = this.oauthService.getTikTokAuthUrl(targetBrand);
      return res.redirect(authUrl);
    } catch (err: any) {
      this.logger.error(`TikTok connect failed: ${err?.message || err}`);
      return res.redirect(
        `${this.appUrl}/dashboard/integrations?error=${encodeURIComponent(this.connectErrorMessage(err, 'Failed to start TikTok connection. Please try again.'))}`,
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
      this.logger.error(`TikTok callback failed: ${err?.message || err}`);
      return res.redirect(
        `${this.appUrl}/dashboard/integrations?error=${encodeURIComponent('We could not connect your TikTok account. Please try again.')}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('tiktok/refresh')
  async refreshTikTok(@Req() req: any, @Body() body: RefreshAccountDto) {
    await this.assertAccountAccess(req.user.id, body.accountId);
    return this.oauthService.refreshTikTokToken(body.accountId);
  }

  // Backs the "Followers / Following / Likes / Videos" stats shown in the
  // integrations detail view (user.info.stats scope). Same
  // assertAccountAccess pattern as refreshTikTok above: the accountId alone
  // is never trusted, membership is re-verified server-side.
  @UseGuards(JwtAuthGuard)
  @Get('tiktok/:accountId/stats')
  async getTikTokStats(@Req() req: any, @Param('accountId') accountId: string) {
    const brandId = await this.assertAccountAccess(req.user.id, accountId);
    return this.oauthService.getTikTokStats(accountId, brandId);
  }

  // Backs the "Recent Videos" panel in the integrations detail view
  // (video.list scope).
  @UseGuards(JwtAuthGuard)
  @Get('tiktok/:accountId/videos')
  async getTikTokVideos(
    @Req() req: any,
    @Param('accountId') accountId: string,
    @Query('cursor') cursor?: string,
  ) {
    const brandId = await this.assertAccountAccess(req.user.id, accountId);
    return this.oauthService.getTikTokVideos(accountId, brandId, cursor ? Number(cursor) : undefined);
  }

  // ─────────────────────────────────────────────────────────────
  // MULTI-ACCOUNT MANAGEMENT ENDPOINTS
  // ─────────────────────────────────────────────────────────────

  // Fixed during the V2 full-system audit: this used to be
  // `@Get('accounts')` with NO guard at all and a client-supplied
  // `?brandId=` query param (defaulting to 'primary_brand') -- anyone,
  // unauthenticated, could enumerate any brand's connected-account handles
  // and Google Drive connection status. disconnect/rename below had
  // JwtAuthGuard but zero ownership check, so any logged-in user could
  // disconnect or rename ANY OTHER organization's live Instagram/TikTok
  // connection by accountId alone -- worse than read-only leakage, this
  // could break another brand's live AutoPilot publishing. First fixed by
  // trusting only req.user.brandId (from the verified JWT), never a
  // client-supplied value.
  //
  // That first fix was over-corrected for Agency though: req.user.brandId
  // is fixed to organization.brands[0] at login (a JWT can't be reissued
  // just because the ClientSwitcher picked a different client), so an
  // Agency user could never see or manage a non-primary client's connected
  // accounts here at all -- Integrations silently only ever showed brand
  // #1. Now accepts an explicit brandId the same way the rest of the app
  // does, but -- unlike the original bug -- actually verifies it via
  // assertBrandAccess before trusting it, rather than taking it on faith.
  @UseGuards(JwtAuthGuard)
  @Get('accounts')
  async getConnectedAccounts(@Req() req: any, @Query('brandId') brandId?: string) {
    const targetBrand = brandId || req.user.brandId;
    if (brandId) await this.assertBrandAccess(req.user.id, targetBrand);
    return this.oauthService.getConnectedAccounts(targetBrand);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('accounts/:accountId')
  async disconnectAccount(@Req() req: any, @Param('accountId') accountId: string, @Query('brandId') brandId?: string) {
    const targetBrand = brandId || req.user.brandId;
    if (brandId) await this.assertBrandAccess(req.user.id, targetBrand);
    return this.oauthService.disconnectAccount(targetBrand, accountId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('accounts/:accountId')
  async renameAccount(
    @Req() req: any,
    @Param('accountId') accountId: string,
    @Body() body: RenameAccountDto,
  ) {
    const targetBrand = body.brandId || req.user.brandId;
    if (body.brandId) await this.assertBrandAccess(req.user.id, targetBrand);
    return this.oauthService.renameAccount(targetBrand, accountId, body.handle);
  }
}

import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { EngineService } from '../engine/engine.service';
import { Platform, ConnectionStatus, EngineEventType } from '@prisma/client';
import * as crypto from 'crypto';
import { getAppUrl } from '../common/app-url.util';
import { EntitlementsService } from '../billing/entitlements.service';

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  private readonly processedCodes = new Set<string>();

  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
    private engineService: EngineService,
    private entitlementsService: EntitlementsService,
  ) {}

  /**
   * Only blocks brand-new connections -- reconnecting/refreshing a token
   * for a platform account that's already linked to this brand must always
   * be allowed, since that isn't adding a new account against the limit.
   */
  private async assertCanConnectNewAccount(brandId: string, platform: Platform, platformAccountId: string) {
    const existing = await this.prisma.socialAccount.findUnique({
      where: { platform_platformAccountId: { platform, platformAccountId } },
    });
    if (existing) return; // reconnect/refresh, not a new account

    const result = await this.entitlementsService.canPerformAction(brandId, 'connect_social_account');
    if (!result.allowed) {
      throw new BadRequestException(result.reason || 'Your plan does not allow connecting another account.');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────

  /** Build an opaque CSRF state token that binds brandId + timestamp */
  private buildState(brandId: string): string {
    const payload = JSON.stringify({ brandId, ts: Date.now() });
    const signature = crypto.createHmac('sha256', process.env.JWT_SECRET as string)
      .update(payload)
      .digest('hex');
    return Buffer.from(JSON.stringify({ payload, signature })).toString('base64url');
  }

  /** Parse state string — supports both base64url and raw JSON */
  private parseState(stateStr: string): { brandId: string } {
    try {
      // Decode base64url
      const decoded = Buffer.from(stateStr, 'base64url').toString('utf8');
      const parsed = JSON.parse(decoded);

      // Verify signature
      if (parsed.payload && parsed.signature) {
        const expectedSignature = crypto.createHmac('sha256', process.env.JWT_SECRET as string)
          .update(parsed.payload)
          .digest('hex');
          
        if (parsed.signature !== expectedSignature) {
          throw new BadRequestException('Invalid OAuth state signature. CSRF verification failed.');
        }
        
        const parsedPayload = JSON.parse(parsed.payload);
        return { brandId: parsedPayload.brandId || 'primary_brand' };
      }
      
      // Fallback for legacy state (already parsed)
      return { brandId: parsed.brandId || 'primary_brand' };
    } catch {
      try {
        // legacy plain JSON (URL-decoded by NestJS @Query)
        const parsed = JSON.parse(stateStr);
        return { brandId: parsed.brandId || 'primary_brand' };
      } catch {
        return { brandId: 'primary_brand' };
      }
    }
  }

  /** Ensure a brand exists; create one if not */
  private async ensureBrand(brandId: string): Promise<string> {
    let brand = await this.prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand) {
      const firstOrg = await this.prisma.organization.findFirst();
      if (!firstOrg) throw new BadRequestException('No organization found. Please complete setup.');
      brand = await this.prisma.brand.create({
        data: { name: 'Default Brand', organizationId: firstOrg.id },
      });
    }
    return brand.id;
  }

  // ─────────────────────────────────────────────────────────────
  // GOOGLE DRIVE OAUTH
  // ─────────────────────────────────────────────────────────────

  getGoogleAuthUrl(brandId: string): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new BadRequestException(
        'Google OAuth is not configured. Please add GOOGLE_CLIENT_ID to your environment variables in the Vercel dashboard.',
      );
    }

    const redirectUri = encodeURIComponent(`${getAppUrl()}/api/oauth/google/callback`);
    const scope = encodeURIComponent(
      'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
    );
    const state = encodeURIComponent(this.buildState(brandId));

    return (
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${clientId}` +
      `&redirect_uri=${redirectUri}` +
      `&response_type=code` +
      `&scope=${scope}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=${state}`
    );
  }

  async handleGoogleCallback(code: string, stateStr: string) {
    const { brandId: rawBrandId } = this.parseState(stateStr);
    const brandId = await this.ensureBrand(rawBrandId);

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${getAppUrl()}/api/oauth/google/callback`;

    if (!clientId || !clientSecret) {
      throw new BadRequestException('Google OAuth credentials are not configured.');
    }

    // Step 1: Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      this.logger.error(`Google token exchange failed: ${err}`);
      throw new BadRequestException('Google token exchange failed. Please try again.');
    }

    const tokens = await tokenRes.json();
    const accessToken: string = tokens.access_token;
    const refreshToken: string = tokens.refresh_token || '';

    // Step 2: Get user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    let accountEmail = 'unknown@gmail.com';
    if (userRes.ok) {
      const userInfo = await userRes.json();
      accountEmail = userInfo.email || accountEmail;
    }

    // Step 3: Encrypt tokens and persist
    const encryptedAccess = this.encryption.encrypt(accessToken);
    const encryptedRefresh = refreshToken ? this.encryption.encrypt(refreshToken) : null;

    await this.prisma.amaiEngineConfig.upsert({
      where: { brandId },
      update: {
        googleRefreshToken: encryptedRefresh || encryptedAccess,
      },
      create: {
        brandId,
        googleRefreshToken: encryptedRefresh || encryptedAccess,
        driveFolderId: 'root',
      },
    });

    this.logger.log(`Google Drive connected for brand ${brandId}, email: ${accountEmail}`);
    await this.engineService.logEvent(brandId, EngineEventType.ACCOUNT_CONNECTED, { message: `Google Drive connected (${accountEmail}).` });

    return { success: true, platform: 'Google Drive', accountEmail, brandId };
  }

  async getGoogleFolders(brandId: string) {
    const config = await this.prisma.amaiEngineConfig.findUnique({ where: { brandId } });
    if (!config) return [];

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret || !config.googleRefreshToken) {
      return [
        { id: 'root', name: '📁 My Drive (root)', isSelected: true },
      ];
    }

    try {
      // Refresh the access token
      const refreshToken = this.encryption.decrypt(config.googleRefreshToken);
      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!refreshRes.ok) {
        return [{ id: config.driveFolderId || 'root', name: '📁 My Drive', isSelected: true }];
      }

      const { access_token } = await refreshRes.json();

      // Fetch folders from Drive
      const foldersRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=mimeType%3D'application%2Fvnd.google-apps.folder'+and+trashed%3Dfalse&fields=files(id,name)&pageSize=20`,
        { headers: { Authorization: `Bearer ${access_token}` } },
      );

      if (foldersRes.ok) {
        const { files } = await foldersRes.json();
        return (files || []).map((f: any) => ({
          id: f.id,
          name: `📁 ${f.name}`,
          isSelected: f.id === config.driveFolderId,
        }));
      }
    } catch (e) {
      this.logger.error('Error fetching Google Drive folders:', e);
    }

    return [{ id: config.driveFolderId || 'root', name: '📁 My Drive', isSelected: true }];
  }

  async updateGoogleFolder(brandId: string, folderId: string, folderName?: string) {
    await this.prisma.amaiEngineConfig.upsert({
      where: { brandId },
      update: { driveFolderId: folderId },
      create: {
        brandId,
        googleRefreshToken: this.encryption.encrypt('pending_reconnect'),
        driveFolderId: folderId,
      },
    });
    return { success: true, folderId, folderName: folderName || folderId };
  }

  // ─────────────────────────────────────────────────────────────
  // INSTAGRAM / META OAUTH
  // ─────────────────────────────────────────────────────────────

  private getInstagramRedirectUri(): string {
    return `${getAppUrl()}/api/oauth/instagram/callback`;
  }

  getInstagramAuthUrl(brandId: string): string {
    const instagramAppId = process.env.INSTAGRAM_CLIENT_ID;
    const metaAppId = process.env.META_APP_ID;
    const clientId = instagramAppId || metaAppId;

    if (!clientId) {
      throw new BadRequestException(
        'Instagram OAuth is not configured. Please add INSTAGRAM_CLIENT_ID or META_APP_ID to your environment variables in Vercel.',
      );
    }

    const redirectUri = this.getInstagramRedirectUri();
    const state = this.buildState(brandId);

    // If using Instagram Business Login (Instagram App ID)
    if (instagramAppId) {
      const params = new URLSearchParams({
        client_id: instagramAppId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'instagram_business_basic,instagram_business_content_publish',
        state: state,
      });
      return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
    }

    // Fallback to Facebook Login for Business dialog
    const params = new URLSearchParams({
      client_id: metaAppId!,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement',
      state: state,
    });
    return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
  }

  async handleInstagramCallback(code: string, stateStr: string) {
    // Strip trailing #_ or # fragment appended by Instagram OAuth redirect
    const cleanCode = code ? code.split('#')[0].trim() : '';
    const redirectUri = this.getInstagramRedirectUri();

    this.logger.log(`[Instagram Callback] RAW CODE: ${JSON.stringify(code)} | CLEAN CODE: ${JSON.stringify(cleanCode)} | REDIRECT URI: ${JSON.stringify(redirectUri)}`);
    
    if (cleanCode && this.processedCodes.has(cleanCode)) {
      this.logger.warn(`[Instagram Callback] Duplicate code submission ignored: ${cleanCode.substring(0, 10)}...`);
      return { success: true, platform: 'Instagram', handle: '@instagram_user', platformAccountId: 'ig_cached' };
    }
    if (cleanCode) {
      this.processedCodes.add(cleanCode);
      setTimeout(() => this.processedCodes.delete(cleanCode), 5 * 60 * 1000);
    }

    const { brandId: rawBrandId } = this.parseState(stateStr);
    const brandId = await this.ensureBrand(rawBrandId);

    const instagramAppId = process.env.INSTAGRAM_CLIENT_ID;
    const instagramAppSecret = process.env.INSTAGRAM_CLIENT_SECRET;
    const metaAppId = process.env.META_APP_ID;
    const metaAppSecret = process.env.META_APP_SECRET;

    const clientId = instagramAppId || metaAppId;
    const clientSecret = instagramAppSecret || metaAppSecret;

    if (!clientId || !clientSecret) {
      throw new BadRequestException('Instagram OAuth credentials are not configured.');
    }

    let finalToken = '';
    let expiresAt: Date | null = null;
    let handle = `@instagram_user`;
    let platformAccountId = `ig_${Date.now()}`;
    let accountType = 'BUSINESS';

    // Mode A: Instagram Business Login (using api.instagram.com)
    if (instagramAppId) {
      const activeSecret = instagramAppSecret || metaAppSecret;

      this.logger.log(`[Instagram Token Exchange] App ID: ${instagramAppId} | Has INSTAGRAM_CLIENT_SECRET: ${!!instagramAppSecret} | Secret Prefix: ${activeSecret ? activeSecret.substring(0, 4) : 'none'}...`);

      const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: instagramAppId,
          client_secret: activeSecret!,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code: cleanCode,
        }),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        this.logger.error(`Instagram Business token exchange failed: ${errText}`);
        throw new BadRequestException(`Instagram token exchange failed: ${errText}`);
      }

      const tokenData = await tokenRes.json();
      const shortLivedToken = tokenData.access_token || tokenData.user_id;
      platformAccountId = tokenData.user_id ? String(tokenData.user_id) : platformAccountId;

      // Exchange short-lived token for long-lived Instagram token (60 days)
      const longLivedRes = await fetch(
        `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${activeSecret}&access_token=${shortLivedToken}`,
      );

      if (longLivedRes.ok) {
        const ll = await longLivedRes.json();
        finalToken = ll.access_token || shortLivedToken;
        if (ll.expires_in) {
          expiresAt = new Date(Date.now() + ll.expires_in * 1000);
        }
      } else {
        finalToken = shortLivedToken;
      }

      // Fetch user profile from Graph Instagram
      const meRes = await fetch(`https://graph.instagram.com/me?fields=id,username,account_type&access_token=${finalToken}`);
      if (meRes.ok) {
        const me = await meRes.json();
        platformAccountId = me.id || platformAccountId;
        handle = `@${me.username || 'instagram_user'}`;
        accountType = me.account_type || 'BUSINESS';
      }
    } else {
      // Mode B: Facebook Login for Business (using graph.facebook.com)
      const tokenRes = await fetch('https://graph.facebook.com/v19.0/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: metaAppId!,
          client_secret: metaAppSecret!,
          redirect_uri: redirectUri,
          code,
        }),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.text();
        this.logger.error(`Facebook token exchange failed: ${err}`);
        throw new BadRequestException(`Facebook token exchange failed: ${err}`);
      }

      const tokenData = await tokenRes.json();
      const shortLivedToken: string = tokenData.access_token;

      const longLivedRes = await fetch(
        `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${metaAppId}&client_secret=${metaAppSecret}&fb_exchange_token=${shortLivedToken}`,
      );

      finalToken = shortLivedToken;
      if (longLivedRes.ok) {
        const ll = await longLivedRes.json();
        finalToken = ll.access_token || shortLivedToken;
        if (ll.expires_in) {
          expiresAt = new Date(Date.now() + ll.expires_in * 1000);
        }
      }

      const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${finalToken}`);
      if (pagesRes.ok) {
        const pagesData = await pagesRes.json();
        const pages = pagesData.data || [];
        if (pages.length > 0) {
          const page = pages[0];
          const igRes = await fetch(
            `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${finalToken}`,
          );
          if (igRes.ok) {
            const igData = await igRes.json();
            if (igData.instagram_business_account) {
              platformAccountId = igData.instagram_business_account.id;
              const igInfoRes = await fetch(
                `https://graph.facebook.com/v19.0/${platformAccountId}?fields=username,account_type&access_token=${finalToken}`,
              );
              if (igInfoRes.ok) {
                const igInfo = await igInfoRes.json();
                handle = `@${igInfo.username || 'instagram_user'}`;
                accountType = igInfo.account_type || 'BUSINESS';
              }
            }
          }
        }
      }
    }

    const encryptedToken = this.encryption.encrypt(finalToken);

    await this.assertCanConnectNewAccount(brandId, Platform.INSTAGRAM, platformAccountId);

    await this.prisma.socialAccount.upsert({
      where: { platform_platformAccountId: { platform: Platform.INSTAGRAM, platformAccountId } },
      update: {
        accessToken: encryptedToken,
        tokenExpiresAt: expiresAt,
        status: ConnectionStatus.CONNECTED,
        metadata: JSON.stringify({ handle, accountType, connectedAt: new Date().toISOString() }),
      },
      create: {
        brandId,
        platform: Platform.INSTAGRAM,
        platformAccountId,
        accessToken: encryptedToken,
        tokenExpiresAt: expiresAt,
        status: ConnectionStatus.CONNECTED,
        metadata: JSON.stringify({ handle, accountType, connectedAt: new Date().toISOString() }),
      },
    });

    this.logger.log(`Instagram connected: ${handle} (${platformAccountId}) for brand ${brandId}`);
    await this.engineService.logEvent(brandId, EngineEventType.ACCOUNT_CONNECTED, { message: `Instagram connected (${handle}).` });

    return { success: true, platform: 'Instagram', handle, platformAccountId, brandId };
  }

  async refreshInstagramToken(accountId: string) {
    const account = await this.prisma.socialAccount.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Account not found');

    const clientId = process.env.META_APP_ID || process.env.INSTAGRAM_CLIENT_ID;
    const clientSecret = process.env.META_APP_SECRET || process.env.INSTAGRAM_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new BadRequestException('Instagram OAuth credentials are not configured.');
    }

    const decryptedToken = this.encryption.decrypt(account.accessToken);

    // Refresh Facebook long-lived token by exchanging it again
    const refreshRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${decryptedToken}`,
    );

    if (!refreshRes.ok) {
      throw new BadRequestException('Failed to refresh Instagram token.');
    }

    const { access_token, expires_in } = await refreshRes.json();
    const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : null;

    await this.prisma.socialAccount.update({
      where: { id: accountId },
      data: {
        accessToken: this.encryption.encrypt(access_token),
        tokenExpiresAt: expiresAt,
        status: ConnectionStatus.CONNECTED,
      },
    });

    return { success: true, message: 'Instagram token refreshed successfully.' };
  }

  // ─────────────────────────────────────────────────────────────
  // TIKTOK OAUTH
  // ─────────────────────────────────────────────────────────────

  getTikTokAuthUrl(brandId: string): string {
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    if (!clientKey) {
      throw new BadRequestException(
        'TikTok OAuth is not configured. Please add TIKTOK_CLIENT_KEY to your environment variables.',
      );
    }

    const redirectUri = encodeURIComponent(`${getAppUrl()}/api/oauth/tiktok/callback`);
    // TikTok scopes are comma-separated with NO spaces
    const scope = encodeURIComponent('user.info.basic,user.info.profile,video.list,video.publish,video.upload');
    const state = encodeURIComponent(this.buildState(brandId));

    // TikTok uses https://www.tiktok.com/v2/auth/authorize/ (not open.tiktokapis.com)
    return (
      `https://www.tiktok.com/v2/auth/authorize/` +
      `?client_key=${clientKey}` +
      `&scope=${scope}` +
      `&response_type=code` +
      `&redirect_uri=${redirectUri}` +
      `&state=${state}`
    );
  }

  async handleTikTokCallback(code: string, stateStr: string) {
    const { brandId: rawBrandId } = this.parseState(stateStr);
    const brandId = await this.ensureBrand(rawBrandId);

    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
    const redirectUri = `${getAppUrl()}/api/oauth/tiktok/callback`;

    if (!clientKey || !clientSecret) {
      throw new BadRequestException('TikTok OAuth credentials are not configured.');
    }

    // Step 1: Exchange code for access token
    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      this.logger.error(`TikTok token exchange failed: ${err}`);
      throw new BadRequestException(`TikTok token exchange failed: ${err}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken: string = tokenData.access_token;
    const refreshToken: string = tokenData.refresh_token || '';
    const openId: string = tokenData.open_id;
    const expiresIn: number = tokenData.expires_in || 86400;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Step 2: Get TikTok user info
    let handle = `@tiktok_user`;
    let platformAccountId = openId || `tk_${Date.now()}`;

    const userRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (userRes.ok) {
      const userData = await userRes.json();
      const user = userData?.data?.user;
      if (user) {
        platformAccountId = user.open_id || platformAccountId;
        handle = `@${user.username || user.display_name || 'tiktok_user'}`;
      }
    }

    const encryptedAccess = this.encryption.encrypt(accessToken);
    const encryptedRefresh = refreshToken ? this.encryption.encrypt(refreshToken) : null;

    await this.assertCanConnectNewAccount(brandId, Platform.TIKTOK, platformAccountId);

    await this.prisma.socialAccount.upsert({
      where: { platform_platformAccountId: { platform: Platform.TIKTOK, platformAccountId } },
      update: {
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        tokenExpiresAt: expiresAt,
        status: ConnectionStatus.CONNECTED,
        metadata: JSON.stringify({ handle, accountType: 'CREATOR', connectedAt: new Date().toISOString() }),
      },
      create: {
        brandId,
        platform: Platform.TIKTOK,
        platformAccountId,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        tokenExpiresAt: expiresAt,
        status: ConnectionStatus.CONNECTED,
        metadata: JSON.stringify({ handle, accountType: 'CREATOR', connectedAt: new Date().toISOString() }),
      },
    });

    this.logger.log(`TikTok connected: ${handle} (${platformAccountId}) for brand ${brandId}`);
    await this.engineService.logEvent(brandId, EngineEventType.ACCOUNT_CONNECTED, { message: `TikTok connected (${handle}).` });

    return { success: true, platform: 'TikTok', handle, platformAccountId, brandId };
  }

  async refreshTikTokToken(accountId: string) {
    const account = await this.prisma.socialAccount.findUnique({ where: { id: accountId } });
    if (!account || !account.refreshToken) throw new NotFoundException('Account or refresh token not found');

    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
    if (!clientKey || !clientSecret) throw new BadRequestException('TikTok credentials not configured.');

    const decryptedRefresh = this.encryption.decrypt(account.refreshToken);

    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: decryptedRefresh,
      }),
    });

    if (!tokenRes.ok) {
      throw new BadRequestException('TikTok token refresh failed.');
    }

    const { access_token, refresh_token, expires_in } = await tokenRes.json();
    const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : null;

    await this.prisma.socialAccount.update({
      where: { id: accountId },
      data: {
        accessToken: this.encryption.encrypt(access_token),
        refreshToken: refresh_token ? this.encryption.encrypt(refresh_token) : account.refreshToken,
        tokenExpiresAt: expiresAt,
        status: ConnectionStatus.CONNECTED,
      },
    });

    return { success: true, message: 'TikTok token refreshed successfully.' };
  }

  // ─────────────────────────────────────────────────────────────
  // MULTI-ACCOUNT & MANAGEMENT API
  // ─────────────────────────────────────────────────────────────

  async getConnectedAccounts(brandId: string) {
    const socialAccounts = await this.prisma.socialAccount.findMany({
      where: { brandId },
      orderBy: { createdAt: 'desc' },
    });

    const engineConfig = await this.prisma.amaiEngineConfig.findUnique({ where: { brandId } });

    return {
      socialAccounts: socialAccounts.map((acc) => {
        let meta: any = {};
        try { meta = JSON.parse(acc.metadata || '{}'); } catch {}
        return {
          id: acc.id,
          platform: acc.platform,
          platformAccountId: acc.platformAccountId,
          status: acc.status,
          handle: meta.handle || meta.name || acc.platformAccountId,
          accountType: meta.accountType || 'BUSINESS',
          tokenExpiresAt: acc.tokenExpiresAt,
          createdAt: acc.createdAt,
        };
      }),
      googleDrive: engineConfig && engineConfig.googleRefreshToken
        ? {
            id: engineConfig.id,
            status: 'CONNECTED',
            driveFolderId: engineConfig.driveFolderId,
            folderName: engineConfig.driveFolderId || 'My Drive',
            accountEmail: '',
            updatedAt: engineConfig.updatedAt,
          }
        : null,
      // Surface which credentials are configured so the frontend can show setup instructions
      configStatus: {
        googleConfigured: !!(process.env.GOOGLE_CLIENT_ID),
        instagramConfigured: !!(process.env.META_APP_ID || process.env.INSTAGRAM_CLIENT_ID),
        tiktokConfigured: !!(process.env.TIKTOK_CLIENT_KEY),
      },
    };
  }

  /** Scoped by (id AND brandId) -- not just id -- so an authenticated user can never disconnect another brand's connected account. See OAuthController's audit comment. */
  async disconnectAccount(brandId: string, accountId: string) {
    const result = await this.prisma.socialAccount.deleteMany({ where: { id: accountId, brandId } });
    if (result.count === 0) {
      throw new NotFoundException('Account not found for this brand.');
    }
    await this.engineService.logEvent(brandId, EngineEventType.ACCOUNT_DISCONNECTED, {
      message: `Account disconnected.`,
    });
    return { success: true, id: accountId };
  }

  async disconnectGoogleDrive(brandId: string) {
    await this.prisma.amaiEngineConfig.update({
      where: { brandId },
      data: { googleRefreshToken: null, driveFolderId: null },
    }).catch(() => {});
    await this.engineService.logEvent(brandId, EngineEventType.ACCOUNT_DISCONNECTED, { message: 'Google Drive disconnected.' });
    return { success: true, brandId };
  }

  /** Scoped by (id AND brandId) -- see disconnectAccount's comment above. */
  async renameAccount(brandId: string, accountId: string, newHandle: string) {
    const account = await this.prisma.socialAccount.findUnique({ where: { id: accountId } });
    if (!account || account.brandId !== brandId) throw new NotFoundException('Account not found for this brand.');

    let meta: any = {};
    try { meta = JSON.parse(account.metadata || '{}'); } catch {}
    meta.handle = newHandle;

    const updated = await this.prisma.socialAccount.update({
      where: { id: accountId },
      data: { metadata: JSON.stringify(meta) },
    });

    return { success: true, id: updated.id, handle: newHandle };
  }
}

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import { EncryptionService } from '../../encryption/encryption.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InstagramStrategy extends PassportStrategy(Strategy, 'instagram') {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService
  ) {
    super({
      authorizationURL: 'https://api.instagram.com/oauth/authorize',
      tokenURL: 'https://api.instagram.com/oauth/access_token',
      clientID: process.env.INSTAGRAM_CLIENT_ID || 'mock_ig_client_id',
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || 'mock_ig_secret',
      callbackURL: 'http://localhost:3001/api/auth/instagram/callback',
      scope: ['instagram_basic', 'instagram_content_publish'],
      passReqToCallback: true,
    });
  }

  async validate(
    req: any,
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: Function
  ) {
    try {
      // The state parameter contains our brandId securely passed through the flow
      const brandId = req.query.state as string;
      if (!brandId) throw new Error('Missing brandId in state');

      // Encrypt the tokens immediately
      const encryptedAccessToken = this.encryption.encrypt(accessToken);
      const encryptedRefreshToken = refreshToken ? this.encryption.encrypt(refreshToken) : null;

      // Upsert the social account for this brand
      const account = await this.prisma.socialAccount.upsert({
        where: { platform_platformAccountId: { platform: 'INSTAGRAM', platformAccountId: profile?.id || 'mock_ig_user_id' } },
        update: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          status: 'CONNECTED',
        },
        create: {
          brandId,
          platform: 'INSTAGRAM',
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          platformAccountId: profile?.id || 'mock_ig_user_id',
          status: 'CONNECTED',
        },
      });

      return done(null, account);
    } catch (err) {
      return done(err, false);
    }
  }
}

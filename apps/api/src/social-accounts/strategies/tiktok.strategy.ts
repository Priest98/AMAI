import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import { EncryptionService } from '../../encryption/encryption.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TikTokStrategy extends PassportStrategy(Strategy, 'tiktok') {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService
  ) {
    super({
      authorizationURL: 'https://www.tiktok.com/v2/auth/authorize/',
      tokenURL: 'https://open.tiktokapis.com/v2/oauth/token/',
      clientID: process.env.TIKTOK_CLIENT_KEY || 'mock_tiktok_key',
      clientSecret: process.env.TIKTOK_CLIENT_SECRET || 'mock_tiktok_secret',
      callbackURL: 'http://localhost:3001/api/auth/tiktok/callback',
      scope: ['user.info.basic', 'video.publish', 'video.upload'],
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
      const brandId = req.query.state as string;
      if (!brandId) throw new Error('Missing brandId in state');

      const encryptedAccessToken = this.encryption.encrypt(accessToken);
      const encryptedRefreshToken = refreshToken ? this.encryption.encrypt(refreshToken) : null;

      const account = await this.prisma.socialAccount.upsert({
        where: { platform_platformAccountId: { platform: 'TIKTOK', platformAccountId: profile?.id || 'mock_tiktok_user_id' } },
        update: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          status: 'CONNECTED',
        },
        create: {
          brandId,
          platform: 'TIKTOK',
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          platformAccountId: profile?.id || 'mock_tiktok_user_id',
          status: 'CONNECTED',
        },
      });

      return done(null, account);
    } catch (err) {
      return done(err, false);
    }
  }
}

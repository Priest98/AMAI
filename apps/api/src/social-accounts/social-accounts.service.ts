import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { Platform } from '@marketing-os/database';

@Injectable()
export class SocialAccountsService {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService
  ) {}

  async connectAccount(brandId: string, data: { platform: Platform; platformAccountId: string; accessToken: string; refreshToken?: string; metadata?: any }) {
    const encryptedAccess = this.encryption.encrypt(data.accessToken);
    const encryptedRefresh = data.refreshToken ? this.encryption.encrypt(data.refreshToken) : null;

    return this.prisma.socialAccount.upsert({
      where: {
        platform_platformAccountId: {
          platform: data.platform,
          platformAccountId: data.platformAccountId,
        }
      },
      update: {
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        metadata: JSON.stringify(data.metadata),
        status: 'CONNECTED',
      },
      create: {
        brandId,
        platform: data.platform,
        platformAccountId: data.platformAccountId,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        metadata: JSON.stringify(data.metadata),
      }
    });
  }

  async getConnectedAccounts(brandId: string) {
    const accounts = await this.prisma.socialAccount.findMany({
      where: { brandId },
      select: {
        id: true,
        platform: true,
        platformAccountId: true,
        metadata: true,
        status: true,
        createdAt: true,
      }
    });
    
    // Parse metadata back to object for the frontend
    return accounts.map(acc => ({
      ...acc,
      metadata: acc.metadata ? JSON.parse(acc.metadata) : null
    }));
  }
}

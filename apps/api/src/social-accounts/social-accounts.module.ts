import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SocialAccountsService } from './social-accounts.service';
import { SocialAccountsController } from './social-accounts.controller';
import { InstagramStrategy } from './strategies/instagram.strategy';
import { TikTokStrategy } from './strategies/tiktok.strategy';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'instagram' })],
  controllers: [SocialAccountsController],
  providers: [SocialAccountsService, InstagramStrategy, TikTokStrategy],
  exports: [SocialAccountsService],
})
export class SocialAccountsModule {}

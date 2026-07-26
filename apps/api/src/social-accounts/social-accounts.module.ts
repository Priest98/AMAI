import { Module } from '@nestjs/common';
import { SocialAccountsService } from './social-accounts.service';

@Module({
  imports: [],
  controllers: [],
  providers: [SocialAccountsService],
  exports: [SocialAccountsService],
})
export class SocialAccountsModule {}

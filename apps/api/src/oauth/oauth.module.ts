import { Module } from '@nestjs/common';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';
import { EngineModule } from '../engine/engine.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [EngineModule, BillingModule],
  controllers: [OAuthController],
  providers: [OAuthService],
  exports: [OAuthService],
})
export class OAuthModule {}

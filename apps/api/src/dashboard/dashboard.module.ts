import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { EngineModule } from '../engine/engine.module';
import { OAuthModule } from '../oauth/oauth.module';
import { PostsModule } from '../posts/posts.module';
import { OrganizationContextService } from '../common/organization-context.service';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [EngineModule, PostsModule, OAuthModule, BillingModule],
  controllers: [DashboardController],
  providers: [DashboardService, OrganizationContextService],
})
export class DashboardModule {}

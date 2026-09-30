import { Injectable, Logger } from '@nestjs/common';
import { EngineService } from '../engine/engine.service';
import { PostsService } from '../posts/posts.service';
import { OAuthService } from '../oauth/oauth.service';
import { BillingService } from '../billing/billing.service';
import { OrganizationContextService } from '../common/organization-context.service';
import { PerformanceTimer } from '../common/performance-timer';
import type { DashboardBootstrap } from './dashboard.types';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly engineService: EngineService,
    private readonly postsService: PostsService,
    private readonly oauthService: OAuthService,
    private readonly billingService: BillingService,
    private readonly organizationContext: OrganizationContextService,
  ) {}

  async getBootstrap(brandId: string, organizationId?: string): Promise<DashboardBootstrap> {
    const timer = new PerformanceTimer('dashboard-bootstrap', this.logger);
    const context = await timer.measure('organizationContext', () =>
      this.organizationContext.resolve(brandId, organizationId),
    );
    const [engine, stats, accounts] = await Promise.all([
      timer.measure('engine', () => this.engineService.getOrCreateConfig(brandId)),
      timer.measure('stats', () => this.postsService.getStats(brandId)),
      timer.measure('accounts', () => this.oauthService.getConnectedAccounts(brandId)),
    ]);
    const billing = this.billingService.getPlanSummaryFromContext(context);
    timer.finish({ coldStart: false });
    return {
      engine: { state: engine.state, approvalMode: engine.approvalMode },
      stats,
      accounts: { socialAccounts: accounts.socialAccounts, googleDrive: accounts.googleDrive },
      billing,
    };
  }
}

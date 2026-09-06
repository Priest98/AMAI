import { Module } from '@nestjs/common';
import { CapabilityFlagsService } from './capability-flags.service';
import { CapabilityRegistryService } from './capability-registry.service';
import { CAPABILITY_PROVIDERS } from './interfaces/capability-provider.interface';
import { MarketIntelligenceService } from './research/market-intelligence.service';
import { ResearchCacheService } from './research/research-cache.service';
import { Last30DaysAdapter } from './research/providers/last30days.adapter';
import { EmailModule } from '../email/email.module';
import { TelegramModule } from '../common/telegram.module';
import { NOTIFICATION_PROVIDERS } from './notifications/notification-provider.interface';
import { NotificationPolicyService } from './notifications/notification-policy.service';
import { NotificationService } from './notifications/notification.service';
import { EmailNotificationAdapter } from './notifications/providers/email.adapter';
import { TelegramNotificationAdapter } from './notifications/providers/telegram.adapter';
import { EngineEventNotificationAdapter } from './notifications/providers/engine-event.adapter';
import { BrainDecisionTraceService } from './observability/brain-decision-trace.service';

/**
 * Provider-neutral capability boundary. The empty provider list is
 * Providers remain inert unless their server-side capability flag and
 * provider configuration are both present.
 */
@Module({
  imports: [EmailModule, TelegramModule],
  providers: [
    CapabilityFlagsService,
    Last30DaysAdapter,
    {
      provide: CAPABILITY_PROVIDERS,
      useFactory: (last30Days: Last30DaysAdapter) => [last30Days],
      inject: [Last30DaysAdapter],
    },
    CapabilityRegistryService,
    ResearchCacheService,
    MarketIntelligenceService,
    NotificationPolicyService,
    EmailNotificationAdapter,
    TelegramNotificationAdapter,
    EngineEventNotificationAdapter,
    {
      provide: NOTIFICATION_PROVIDERS,
      useFactory: (email: EmailNotificationAdapter, telegram: TelegramNotificationAdapter, inApp: EngineEventNotificationAdapter) => [email, telegram, inApp],
      inject: [EmailNotificationAdapter, TelegramNotificationAdapter, EngineEventNotificationAdapter],
    },
    NotificationService,
    BrainDecisionTraceService,
  ],
  exports: [
    CapabilityFlagsService,
    CapabilityRegistryService,
    MarketIntelligenceService,
    NotificationService,
    BrainDecisionTraceService,
  ],
})
export class CapabilitiesModule {}

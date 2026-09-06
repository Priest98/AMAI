import { Inject, Injectable, Logger } from '@nestjs/common';
import { NOTIFICATION_PROVIDERS, NotificationProvider } from './notification-provider.interface';
import { NotificationPolicyService } from './notification-policy.service';
import { NotificationRequest, NotificationResult } from './notification.types';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  constructor(
    private readonly policy: NotificationPolicyService,
    @Inject(NOTIFICATION_PROVIDERS) private readonly providers: NotificationProvider[],
  ) {}

  async notify(request: NotificationRequest): Promise<NotificationResult> {
    this.validate(request);
    const deliveries = [];
    for (const channel of this.policy.channelsFor(request)) {
      const providers = this.providers.filter((provider) => provider.channel === channel);
      if (!providers.length) {
        deliveries.push({ channel, providerId: 'none', state: 'skipped' as const });
        continue;
      }
      for (const provider of providers) {
        try {
          if (!(await provider.isAvailable(request))) {
            deliveries.push({ channel, providerId: provider.id, state: 'skipped' as const });
            continue;
          }
          const sent = await provider.send(request);
          deliveries.push({ channel, providerId: provider.id, state: sent ? 'sent' as const : 'failed' as const });
          if (sent) break;
        } catch {
          this.logger.warn(`${request.event} notification failed via ${provider.id}`);
          deliveries.push({ channel, providerId: provider.id, state: 'failed' as const });
        }
      }
    }
    return { event: request.event, deliveries };
  }

  private validate(request: NotificationRequest): void {
    if (!request.title?.trim() || !request.body?.trim()) throw new Error('Notification title and body are required');
    if (request.title.length > 160 || request.body.length > 10_000) throw new Error('Notification content exceeds limits');
    if (request.audience === 'user' && !request.recipient.organizationId) throw new Error('User notifications require an organization');
  }
}


import { Injectable } from '@nestjs/common';
import { EngineEventType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationProvider } from '../notification-provider.interface';
import { NotificationEventType, NotificationRequest } from '../notification.types';

const ENGINE_EVENT_TYPES: Partial<Record<NotificationEventType, EngineEventType>> = {
  'post.published': EngineEventType.PUBLISH_SUCCEEDED,
  'post.failed': EngineEventType.PUBLISH_FAILED,
  'post.needs_approval': EngineEventType.APPROVAL_QUEUED,
  'account.connected': EngineEventType.ACCOUNT_CONNECTED,
  'account.disconnected': EngineEventType.ACCOUNT_DISCONNECTED,
  'autopilot.paused': EngineEventType.ENGINE_STATE_CHANGED,
  'autopilot.action_required': EngineEventType.ENGINE_STATE_CHANGED,
};

@Injectable()
export class EngineEventNotificationAdapter implements NotificationProvider {
  readonly id = 'engine-event';
  readonly channel = 'in_app' as const;
  constructor(private readonly prisma: PrismaService) {}
  isAvailable(request: NotificationRequest): boolean { return Boolean(request.recipient.brandId && ENGINE_EVENT_TYPES[request.event]); }
  async send(request: NotificationRequest): Promise<boolean> {
    const type = ENGINE_EVENT_TYPES[request.event];
    if (!type || !request.recipient.brandId) return false;
    await this.prisma.engineEvent.create({ data: { brandId: request.recipient.brandId, type, postId: request.postId, mediaAssetId: request.mediaAssetId, message: request.body } });
    return true;
  }
}


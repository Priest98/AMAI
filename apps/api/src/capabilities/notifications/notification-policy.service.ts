import { Injectable } from '@nestjs/common';
import { NotificationChannel, NotificationRequest } from './notification.types';

const USER_DEFAULTS: Partial<Record<NotificationRequest['event'], NotificationChannel[]>> = {
  'post.published': ['in_app'],
  'post.failed': ['in_app', 'email'],
  'post.needs_approval': ['in_app'],
  'account.connected': ['in_app'],
  'account.disconnected': ['in_app', 'email'],
  'oauth.expiring': ['in_app', 'email'],
  'oauth.expired': ['in_app', 'email'],
  'subscription.expiring': ['email'],
  'subscription.payment_failed': ['in_app', 'email'],
  'quota.warning': ['in_app'],
  'quota.reached': ['in_app', 'email'],
  'weekly_report.ready': ['in_app', 'email'],
  'viral_post.detected': ['in_app'],
  'growth_opportunity.detected': ['in_app'],
  'autopilot.paused': ['in_app', 'email'],
  'autopilot.action_required': ['in_app', 'email'],
};

@Injectable()
export class NotificationPolicyService {
  channelsFor(request: NotificationRequest): NotificationChannel[] {
    const allowed = request.audience === 'admin'
      ? new Set<NotificationChannel>(['telegram'])
      : new Set<NotificationChannel>(['in_app', 'email']);
    const selected = request.channels ?? (request.audience === 'admin'
      ? ['telegram']
      : USER_DEFAULTS[request.event] ?? ['in_app']);
    return [...new Set(selected)].filter((channel) => allowed.has(channel));
  }
}


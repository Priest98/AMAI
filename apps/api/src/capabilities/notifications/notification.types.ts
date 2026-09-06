export type NotificationChannel = 'in_app' | 'email' | 'telegram';
export type NotificationAudience = 'user' | 'admin';

export type NotificationEventType =
  | 'post.published'
  | 'post.failed'
  | 'post.needs_approval'
  | 'account.connected'
  | 'account.disconnected'
  | 'oauth.expiring'
  | 'oauth.expired'
  | 'subscription.expiring'
  | 'subscription.payment_failed'
  | 'quota.warning'
  | 'quota.reached'
  | 'weekly_report.ready'
  | 'viral_post.detected'
  | 'growth_opportunity.detected'
  | 'autopilot.paused'
  | 'autopilot.action_required'
  | 'marketing.early_access_signup'
  | 'marketing.creator_application';

export interface NotificationRecipient {
  organizationId?: string;
  brandId?: string;
  userId?: string;
  email?: string;
}

export interface NotificationRequest {
  event: NotificationEventType;
  audience: NotificationAudience;
  recipient: NotificationRecipient;
  title: string;
  body: string;
  channels?: NotificationChannel[];
  postId?: string;
  mediaAssetId?: string;
  correlationId?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface NotificationDelivery {
  channel: NotificationChannel;
  providerId: string;
  state: 'sent' | 'skipped' | 'failed';
}

export interface NotificationResult {
  event: NotificationEventType;
  deliveries: NotificationDelivery[];
}


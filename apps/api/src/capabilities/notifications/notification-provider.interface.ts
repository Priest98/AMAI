import { NotificationChannel, NotificationRequest } from './notification.types';

export interface NotificationProvider {
  readonly id: string;
  readonly channel: NotificationChannel;
  isAvailable(request: NotificationRequest): boolean | Promise<boolean>;
  send(request: NotificationRequest): Promise<boolean>;
}

export const NOTIFICATION_PROVIDERS = Symbol('NOTIFICATION_PROVIDERS');


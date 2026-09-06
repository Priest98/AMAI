import { Injectable } from '@nestjs/common';
import { TelegramService } from '../../../common/telegram.service';
import { NotificationProvider } from '../notification-provider.interface';
import { NotificationRequest } from '../notification.types';

@Injectable()
export class TelegramNotificationAdapter implements NotificationProvider {
  readonly id = 'telegram-admin';
  readonly channel = 'telegram' as const;
  constructor(private readonly telegram: TelegramService) {}
  isAvailable(): boolean { return this.telegram.isConfigured(); }
  send(request: NotificationRequest): Promise<boolean> {
    return this.telegram.send(`<b>${escapeHtml(request.title)}</b>\n${escapeHtml(request.body)}`);
  }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}


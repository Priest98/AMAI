import { Injectable } from '@nestjs/common';
import { EmailService } from '../../../email/email.service';
import { NotificationProvider } from '../notification-provider.interface';
import { NotificationRequest } from '../notification.types';

@Injectable()
export class EmailNotificationAdapter implements NotificationProvider {
  readonly id = 'smtp';
  readonly channel = 'email' as const;
  constructor(private readonly email: EmailService) {}
  isAvailable(request: NotificationRequest): boolean { return Boolean(request.recipient.email); }
  send(request: NotificationRequest): Promise<boolean> {
    return this.email.sendEmail(request.recipient.email!, request.title, `<h2>${escapeHtml(request.title)}</h2><p>${escapeHtml(request.body).replace(/\n/g, '<br>')}</p>`);
  }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}


import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export class EmailDeliveryError extends Error {
  constructor(
    public readonly code: 'EMAIL_NOT_CONFIGURED' | 'EMAIL_REJECTED' | 'EMAIL_PROVIDER_FAILED',
    message: string,
  ) {
    super(message);
    this.name = 'EmailDeliveryError';
  }
}

/**
 * Real transactional email delivery via nodemailer/SMTP. Used for the
 * welcome/verification email, password reset email, and resend-verification
 * email.
 *
 * Configure with standard SMTP env vars: SMTP_HOST, SMTP_PORT, SMTP_USER,
 * SMTP_PASS, and optionally SMTP_SECURE ('true' for port 465) and
 * EMAIL_FROM (defaults to SMTP_USER). Works with Gmail (smtp.gmail.com,
 * port 587, an App Password as SMTP_PASS — not the account password),
 * or any other SMTP provider.
 *
 * If SMTP isn't configured, sends are skipped with a loud warning instead
 * of silently pretending to succeed — this mirrors the isGeminiConfigured()
 * pattern in AiService so missing config is always visible in logs rather
 * than masquerading as a working feature.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  private isConfigured(): boolean {
    return !!process.env.RESEND_API_KEY || !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  }

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      const port = Number(process.env.SMTP_PORT) || 587;
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: process.env.SMTP_SECURE === 'true' || port === 465,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
    return this.transporter;
  }

  private maskRecipient(value: string): string {
    const [local, domain] = value.split('@');
    if (!domain) return '[invalid recipient]';
    return `${local.slice(0, 2)}***@${domain}`;
  }

  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<boolean> {
    if (!this.isConfigured()) {
      this.logger.error('Transactional email is not configured; message was not accepted for delivery.');
      throw new EmailDeliveryError('EMAIL_NOT_CONFIGURED', 'Transactional email is not configured.');
    }

    const from = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL ||
      (process.env.NODE_ENV === 'production' ? 'Oyinca <auth@oyinca.com>' : process.env.SMTP_USER);
    if (!from) {
      this.logger.error('EMAIL_FROM is required in production; message was not accepted for delivery.');
      throw new EmailDeliveryError('EMAIL_NOT_CONFIGURED', 'The production sender identity is not configured.');
    }

    try {
      if (process.env.RESEND_API_KEY) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from, to: [to], subject, html, text }),
          signal: AbortSignal.timeout(20_000),
        });
        if (!response.ok) {
          this.logger.error(`Resend rejected ${this.maskRecipient(to)} (status=${response.status}).`);
          throw new EmailDeliveryError('EMAIL_REJECTED', 'The email provider did not accept the message.');
        }
        this.logger.log(`Email accepted by Resend for ${this.maskRecipient(to)}.`);
        return true;
      }
      const info = await this.getTransporter().sendMail({ from, to, subject, html, text });
      const accepted = (info.accepted || []).map(String).some((address: string) => address.toLowerCase() === to.toLowerCase());
      if (!accepted || (info.rejected || []).length > 0) {
        this.logger.error(`Email provider rejected ${this.maskRecipient(to)}.`);
        throw new EmailDeliveryError('EMAIL_REJECTED', 'The email provider did not accept the recipient.');
      }
      this.logger.log(`Email accepted by provider for ${this.maskRecipient(to)}.`);
      return true;
    } catch (err: any) {
      if (err instanceof EmailDeliveryError) throw err;
      const providerCode = typeof err?.code === 'string' ? err.code : 'unknown';
      const responseCode = Number.isFinite(err?.responseCode) ? err.responseCode : 'unknown';
      this.logger.error(
        `Email provider failed for ${this.maskRecipient(to)} (code=${providerCode}, responseCode=${responseCode}).`,
      );
      throw new EmailDeliveryError('EMAIL_PROVIDER_FAILED', 'The email provider did not accept the message.');
    }
  }
}

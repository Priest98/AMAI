import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

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
    return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  }

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      const port = Number(process.env.SMTP_PORT) || 587;
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: process.env.SMTP_SECURE === 'true' || port === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
    return this.transporter;
  }

  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.isConfigured()) {
      this.logger.warn(
        `SMTP not configured (need SMTP_HOST/SMTP_USER/SMTP_PASS) — skipping real send. Would have emailed "${subject}" to ${to}.`,
      );
      return false;
    }

    const from = process.env.EMAIL_FROM || (process.env.SMTP_USER as string);

    try {
      await this.getTransporter().sendMail({ from, to, subject, html });
      this.logger.log(`Email sent to ${to}: "${subject}"`);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send email to ${to}: ${err.message}`);
      return false;
    }
  }
}

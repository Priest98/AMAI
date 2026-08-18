import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { redactSecrets } from './redact';
import { ErrorSeverity } from '@prisma/client';

interface CaptureContext {
  request?: any;
  service?: string;
}

/**
 * Writes every genuine (5xx-worthy) exception into ErrorGroup/ErrorEvent so
 * the Admin dashboard's Errors/Logs pages have real, queryable data without
 * a Sentry API integration. Called from SentryExceptionFilter alongside
 * (not instead of) Sentry.captureException -- this is purely additive.
 *
 * Deliberately defensive throughout: a bug in error *capture* must never
 * become the reason a real request fails or the error response is
 * delayed, so every public method swallows its own failures.
 */
@Injectable()
export class ErrorCaptureService {
  private readonly logger = new Logger(ErrorCaptureService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Fire-and-forget: callers should not await this on the request's hot path. */
  capture(exception: unknown, context: CaptureContext = {}): void {
    this.captureInternal(exception, context).catch((err) => {
      this.logger.warn(`Failed to record error capture: ${err?.message || err}`);
    });
  }

  private async captureInternal(exception: unknown, context: CaptureContext): Promise<void> {
    const errorClass = (exception as any)?.constructor?.name || 'Error';
    const rawMessage: string =
      (exception as any)?.message !== undefined ? String((exception as any).message) : String(exception);
    const stack: string | undefined = (exception as any)?.stack;

    const normalizedMessage = this.normalize(rawMessage);
    const topFrame = this.topFrame(stack);
    const signature = this.hash(`${errorClass}|${normalizedMessage}|${topFrame}`);

    const request = context.request;
    const rawStatus = (exception as any)?.status ?? (exception as any)?.getStatus?.();
    const httpStatus = typeof rawStatus === 'number' ? rawStatus : undefined;
    const endpoint: string | undefined = request?.originalUrl || request?.url;
    const userId: string | undefined = request?.user?.id;
    const requestId: string | undefined = request?.headers?.['x-request-id'];
    const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';
    const deploymentSha = process.env.VERCEL_GIT_COMMIT_SHA;

    const contextPayload = request
      ? redactSecrets({
          method: request.method,
          query: request.query,
          params: request.params,
          body: request.body,
        })
      : undefined;

    const severity: ErrorSeverity = !httpStatus || httpStatus >= 500 ? ErrorSeverity.ERROR : ErrorSeverity.WARN;

    const group = await this.prisma.errorGroup.upsert({
      where: { signature },
      create: {
        signature,
        title: `${errorClass}: ${normalizedMessage}`.slice(0, 500),
        service: context.service ?? 'api',
        environment,
        severity,
        occurrenceCount: 1,
      },
      update: {
        occurrenceCount: { increment: 1 },
        lastSeenAt: new Date(),
        // A fresh occurrence means whatever caused this isn't actually
        // fixed -- re-open a group an admin previously marked resolved
        // rather than silently leaving a stale "resolved" badge on
        // something that just happened again.
        resolved: false,
      },
    });

    await this.prisma.errorEvent.create({
      data: {
        groupId: group.id,
        message: redactSecrets(rawMessage) as string,
        stackTrace: stack ? (redactSecrets(stack) as string) : undefined,
        service: context.service ?? 'api',
        endpoint,
        httpStatus,
        userId,
        requestId,
        environment,
        deploymentSha,
        context: contextPayload as any,
      },
    });
  }

  /**
   * Strips request-specific values (UUIDs, numeric IDs, emails, quoted
   * strings) from a message so repeated occurrences of the same underlying
   * error collapse into one group instead of each becoming "unique".
   */
  private normalize(message: string): string {
    return message
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<uuid>')
      .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '<email>')
      .replace(/\b\d+\b/g, '<n>')
      .replace(/"[^"]*"/g, '<str>')
      .replace(/'[^']*'/g, '<str>')
      .slice(0, 300);
  }

  private topFrame(stack: string | undefined): string {
    if (!stack) return '';
    const lines = stack.split('\n').map((l) => l.trim());
    // First line is usually "ErrorClass: message" -- the frame we want is
    // the first "at ..." line, normalized to drop column/line numbers so
    // the same call site groups together across occurrences.
    const frame = lines.find((l) => l.startsWith('at '));
    return (frame || '').replace(/:\d+:\d+\)?$/, '');
  }

  private hash(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex');
  }
}

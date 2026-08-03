import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/node';

/**
 * Reports every unhandled exception to Sentry, then delegates to NestJS's
 * own BaseExceptionFilter to produce the exact same HTTP response shape the
 * app already returns -- this is purely additive observability, not a
 * change to error-handling behavior. Ordinary HTTP exceptions (400s, a
 * rejected login, a validation error) are expected traffic, not incidents,
 * so only genuine 5xx-worthy failures (anything without a clean HTTP status,
 * or explicit 500s) are sent to Sentry to avoid drowning the error feed in
 * routine 401s/404s.
 */
@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly base: BaseExceptionFilter;

  constructor(httpAdapter: any) {
    this.base = new BaseExceptionFilter(httpAdapter);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const status = (exception as any)?.status ?? (exception as any)?.getStatus?.();
    if (!status || status >= 500) {
      Sentry.captureException(exception);
    }
    this.base.catch(exception, host);
  }
}

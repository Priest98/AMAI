import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { SentryExceptionFilter } from './common/sentry-exception.filter';

// No-ops entirely (Sentry.init is never called) until SENTRY_DSN is set in
// Vercel env vars -- safe to ship ahead of having a Sentry account. DSNs are
// meant to be public identifiers (like a publishable key), not secrets, so
// this is fine to configure via a plain env var.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    // Tracing/performance monitoring costs quota and isn't needed yet at
    // this stage -- error capture only, kept lean.
    tracesSampleRate: 0,
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Reports every unhandled exception to Sentry (a no-op if SENTRY_DSN
  // isn't set) while preserving NestJS's normal error-response behavior --
  // see SentryExceptionFilter for why it wraps BaseExceptionFilter instead
  // of replacing it.
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new SentryExceptionFilter(httpAdapter));

  // Add /api prefix so frontend can call /api/auth/login, /api/brands, etc.
  app.setGlobalPrefix('api');

  // Local dev only — the Vercel deployment boots this app from within a
  // Next.js Route Handler (apps/web/src/app/api/[...path]/route.ts) which has
  // its own CORS setup. This only matters when running the Next.js dev
  // server against a local API.
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:3000'],
    credentials: true,
  });
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  // Bind to 0.0.0.0 for containerized platforms like Render / Docker / Railway
  await app.listen(port, '0.0.0.0');
  console.log(`[Marketing OS API] Running on: http://0.0.0.0:${port}/api`);
}
bootstrap();

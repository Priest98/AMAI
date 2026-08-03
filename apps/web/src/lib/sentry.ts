// Minimal, manual Sentry wiring -- deliberately NOT using @sentry/nextjs's
// auto-instrumentation (withSentryConfig, instrumentation.ts hooks) because
// this app's next.config.ts already has a carefully-tuned, documented-as-
// fragile build setup (NestJS booted from inside a Next.js Route Handler,
// specific serverExternalPackages list -- see next.config.ts). Adding the
// Sentry build plugin on top of that is unnecessary risk for what this
// stage needs: capture errors, nothing more. @sentry/browser covers the
// client; the NestJS backend has its own separate @sentry/node wiring in
// apps/api/src/main.ts.
//
// No-ops completely (initClientSentry does nothing) until
// NEXT_PUBLIC_SENTRY_DSN is set -- safe to ship ahead of having a Sentry
// account. A DSN is a public identifier meant to be embedded in client
// bundles (like a Stripe publishable key), not a secret.
let initialized = false;

export function initClientSentry() {
  if (initialized || typeof window === 'undefined') return;
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  // Dynamic import keeps @sentry/browser out of the initial bundle for the
  // (currently default) case where no DSN is configured at all.
  import('@sentry/browser').then((Sentry) => {
    Sentry.init({
      dsn,
      environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || 'development',
      tracesSampleRate: 0,
    });
    initialized = true;
  });
}

export async function captureClientException(error: unknown) {
  if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  const Sentry = await import('@sentry/browser');
  Sentry.captureException(error);
}

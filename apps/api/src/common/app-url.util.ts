/**
 * Canonical public URL of this deployment.
 *
 * The frontend (Next.js) and API (NestJS) are deployed together as a single
 * Vercel project — there is no separate API domain. This one URL is used to
 * build OAuth redirect URIs, post-OAuth redirects back into the dashboard,
 * and links in transactional emails (verification, password reset).
 *
 * Must be set explicitly in production via the APP_URL env var (e.g.
 * https://your-app.vercel.app). Falls back to localhost outside production
 * so local dev keeps working without extra config.
 */
export function getAppUrl(): string {
  const url = process.env.APP_URL;
  if (url) return url.replace(/\/$/, '');
  if (process.env.NODE_ENV !== 'production') return 'http://localhost:3000';
  throw new Error(
    '[FATAL] APP_URL environment variable is not set. Set it to the public URL of ' +
    'this deployment (e.g. https://your-app.vercel.app) in the Vercel dashboard — ' +
    'without it, OAuth callbacks and email links will point to the wrong domain.',
  );
}

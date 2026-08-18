/**
 * Security audit fix (3.5): the session JWT used to be returned in the
 * login response body and stored in localStorage by the frontend, where
 * any XSS anywhere in the app (at any point during the token's up-to-30-day
 * lifetime) could read it straight out with `localStorage.getItem(...)`.
 * It's now set as an httpOnly cookie instead -- page JS can never read it,
 * only the browser's own HTTP layer can, which is exactly the property
 * that closes this finding.
 *
 * `cookie-parser` isn't a dependency of this app (deliberately not adding
 * it just for this), so requests are parsed manually here. Express always
 * exposes the raw `Cookie` header as `req.headers.cookie` regardless of
 * whether `cookie-parser` middleware is installed -- only the convenience
 * of a pre-parsed `req.cookies` object requires that package. Setting a
 * cookie on the way out doesn't need any extra package either: Express's
 * own `res.cookie()` (bundled with Express itself) handles that.
 */

export const AUTH_COOKIE_NAME = 'amai_session';

export function parseCookieHeader(header: string | undefined | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const rawValue = part.slice(idx + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(rawValue);
    } catch {
      out[key] = rawValue;
    }
  }
  return out;
}

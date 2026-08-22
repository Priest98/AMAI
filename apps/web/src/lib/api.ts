"use client";

/**
 * Single source of truth for talking to the Oyinca backend (NestJS API).
 * Centralizes the API base URL, auth token handling, and brand-scoped
 * fetch helpers so pages stop re-implementing the same logic.
 */

// The frontend and API are deployed together as a single Vercel project
// (see root vercel.json, which rewrites /api/:path* to the bundled NestJS
// serverless function). Relative /api paths therefore resolve on the same
// origin in production with zero config. Set NEXT_PUBLIC_API_URL only for
// local dev against a separately-running API (e.g. http://localhost:3001/api).
export const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || '/api'
).replace(/\/$/, '');

// Security audit fix (3.5): the session credential (JWT) used to be
// returned in the login response and persisted here under this key, where
// any XSS anywhere in the app -- at any point during the token's up-to-
// 30-day lifetime -- could read it straight out with a plain
// `localStorage.getItem(...)` and replay it as a fully-valid session from
// anywhere. It's now issued as an httpOnly cookie by AuthController.login
// instead (see apps/api/src/auth/auth.controller.ts): the browser attaches
// it automatically to same-origin requests, and page JS -- including any
// injected XSS payload -- can never read its value at all.
//
// This key now stores only a *non-sensitive* snapshot of the logged-in
// user (id/email/name/brandId + when the session expires) purely so the
// UI can synchronously answer "who's logged in?" without an extra network
// round trip on every render. If an attacker reads this, they learn your
// name and email -- not a credential they can do anything with. The actual
// access-control decision is always re-checked server-side against the
// httpOnly cookie on every request; this cache is a UI convenience only.
const USER_CACHE_KEY = 'amai_user';

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  brandId: string;
}

interface CachedUser extends CurrentUser {
  /** ISO timestamp, mirrors the httpOnly cookie's own expiry. */
  expiresAt: string;
}

/** Called after a successful login/register response to cache the (non-sensitive) user snapshot. */
export function setSession(user: CurrentUser, expiresAt: string): void {
  if (typeof window === 'undefined') return;
  const cached: CachedUser = { ...user, expiresAt };
  try {
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(cached));
  } catch {
    // Private-browsing / storage-disabled -- getCurrentUser() will just
    // return null until the next successful /auth/me call; nothing here is
    // itself a credential, so there's no security downside to losing it.
  }
}

function readCachedUser(): CachedUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedUser;
    if (!parsed?.expiresAt || new Date(parsed.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(USER_CACHE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * True if a (locally cached) session looks currently valid. This is a UI
 * convenience check only, based on the cached expiry -- it does NOT read
 * or verify the actual httpOnly cookie (page JS can't). The server is
 * always the real authority: any request whose cookie is missing, expired,
 * or otherwise invalid gets a 401 from the API regardless of what this
 * returns, and apiFetch()'s 401 handling reconciles the two by clearing
 * this cache and redirecting to Sign In.
 */
export function isAuthenticated(): boolean {
  return readCachedUser() !== null;
}

export function getCurrentUser(): CurrentUser | null {
  const cached = readCachedUser();
  if (!cached) return null;
  const { expiresAt, ...user } = cached;
  return user;
}

/**
 * Which client (Brand) the UI is currently acting on.
 *
 * The JWT carries a single `brandId` claim, resolved at login from
 * `organization.brands[0]`. That's correct for Free/Pro (one brand) but
 * can't express an Agency user switching between clients, since the token
 * is only reissued at login. So an explicitly-selected client is kept here
 * and takes precedence over the token claim.
 *
 * This is a UI convenience only and is NOT a security boundary: the server
 * re-verifies on every request that the brand belongs to an organization
 * the caller is a member of (BrandAccessGuard). Writing any brandId here
 * grants nothing -- an id the user has no membership for is rejected with
 * 403 server-side.
 */
export const ACTIVE_CLIENT_KEY = 'amai_active_client_id';

export function getActiveClientId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(ACTIVE_CLIENT_KEY);
  } catch {
    return null;
  }
}

export function setActiveClientId(brandId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (brandId) localStorage.setItem(ACTIVE_CLIENT_KEY, brandId);
    else localStorage.removeItem(ACTIVE_CLIENT_KEY);
  } catch {
    // Private-browsing / storage-disabled: fall back to the token claim.
  }
  // Cached GETs are scoped by path, and every brand-scoped path embeds the
  // brandId -- but clearing avoids briefly showing the previous client's
  // data on any shared (non-brand-scoped) endpoint.
  clearGetCache();
}

/** Convenience — most pages only need the brandId to scope their requests. */
export function getBrandId(): string {
  return getActiveClientId() || getCurrentUser()?.brandId || 'primary_brand';
}

/**
 * Clears the session and sends the user back to Sign In.
 *
 * Security audit fix (3.5): the session cookie is httpOnly, so page JS
 * can never clear it directly the way `localStorage.removeItem` used to --
 * this now calls the backend's /auth/logout to actually clear it
 * server-side first. Best-effort: even if that call fails (offline, etc.),
 * the local user cache is still cleared and the user is still sent to
 * Sign In, matching the old behavior's guarantee that the UI never gets
 * stuck looking authenticated after logout.
 */
export async function logout(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
  } catch {
    // best-effort -- still clear local state and redirect below
  }
  localStorage.removeItem(USER_CACHE_KEY);
  window.location.href = '/login';
}

// -- Lightweight GET cache + in-flight de-dupe --------------------------
// Every page independently re-fetches on mount (connected accounts, engine
// state, post lists, ...), so fast navigation between dashboard pages --
// or two components on the same page both wanting the same data -- was
// paying a full network round trip every single time, even for data that
// hadn't changed a second ago. A short TTL cache plus in-flight request
// de-dupe makes that instantaneous on the common path without risking
// staleness: any mutating call (POST/PATCH/PUT/DELETE) blows the whole
// cache away, and pages that need fresh data after a mutation already
// call their own reload function, which simply repopulates the cache.
const GET_CACHE_TTL_MS = 15_000;
const getCache = new Map<string, { expiresAt: number; data: any }>();
const inFlight = new Map<string, Promise<any>>();

function clearGetCache() {
  getCache.clear();
}

/** fetch() wrapper that adds the Authorization header and JSON handling. */
export async function apiFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method || 'GET').toUpperCase();
  const cacheKey = `${method} ${path}`;

  if (method === 'GET') {
    const cached = getCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }
    const pending = inFlight.get(cacheKey);
    if (pending) {
      return pending as Promise<T>;
    }
  } else {
    // Any write invalidates cached reads so the next GET reflects it.
    clearGetCache();
  }

  const doFetch = async (): Promise<T> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    };

    // Security audit fix (3.5): no Authorization header built from a
    // client-readable token anymore -- the httpOnly session cookie travels
    // automatically on same-origin requests. `credentials: 'include'` is
    // technically redundant for same-origin fetches (the default is
    // 'same-origin', which already includes cookies), but explicit here
    // since API_BASE can be overridden to a different origin for local dev
    // (NEXT_PUBLIC_API_URL), where the default would silently drop it.
    const res = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: 'include' });

    // A 401 means the session is no longer valid (expired, revoked, or the
    // token never existed) -- bounce back to Sign In instead of leaving
    // the UI in a half-authenticated state showing failed requests.
    if (res.status === 401) {
      logout();
      throw new Error('Your session has expired. Please sign in again.');
    }

    let data: any = null;
    try {
      data = await res.json();
    } catch {
      // no body
    }

    if (!res.ok) {
      const message = data?.message || `Request failed (${res.status})`;
      const err: any = new Error(Array.isArray(message) ? message.join(', ') : message);
      // Attached (not just thrown as a string) so callers that need to
      // distinguish e.g. 403 (access denied) from a generic failure can --
      // see the /dashboard/admin layout's use of this for platformRole
      // gating, since the JWT itself doesn't carry that claim client-side.
      err.status = res.status;
      throw err;
    }

    if (method === 'GET') {
      getCache.set(cacheKey, { expiresAt: Date.now() + GET_CACHE_TTL_MS, data });
    }

    return data as T;
  };

  if (method !== 'GET') {
    return doFetch();
  }

  const promise = doFetch().finally(() => inFlight.delete(cacheKey));
  inFlight.set(cacheKey, promise);
  return promise;
}

/** Same as apiFetch but automatically scoped to the current user's brand. */
export function brandFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const brandId = getBrandId();
  return apiFetch<T>(`/brands/${brandId}${path}`, init);
}

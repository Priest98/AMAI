"use client";

/**
 * Single source of truth for talking to the AMAI backend (NestJS API).
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

export const TOKEN_KEY = 'marketing_os_token';

function decodeJwtPayload(token: string): any | null {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

/** True if the token is malformed, missing an exp claim, or past expiry. */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  return payload.exp * 1000 <= Date.now();
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  if (isTokenExpired(token)) {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
  return token;
}

/** True if there's a currently-valid (present, well-formed, unexpired) session. */
export function isAuthenticated(): boolean {
  return getToken() !== null;
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  brandId: string;
}

export function getCurrentUser(): CurrentUser | null {
  const token = getToken();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  return {
    id: payload.sub || payload.id || '',
    email: payload.email || '',
    name: payload.name || (payload.email ? payload.email.split('@')[0] : 'User'),
    brandId: payload.brandId || 'primary_brand',
  };
}

/** Convenience — most pages only need the brandId to scope their requests. */
export function getBrandId(): string {
  return getCurrentUser()?.brandId || 'primary_brand';
}

/** Clears the session and sends the user back to Sign In. */
export function logout(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
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
    const token = getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

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
      throw new Error(Array.isArray(message) ? message.join(', ') : message);
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

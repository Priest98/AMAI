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

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
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
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.sub || payload.id || '',
      email: payload.email || '',
      name: payload.name || (payload.email ? payload.email.split('@')[0] : 'User'),
      brandId: payload.brandId || 'primary_brand',
    };
  } catch {
    return null;
  }
}

/** Convenience — most pages only need the brandId to scope their requests. */
export function getBrandId(): string {
  return getCurrentUser()?.brandId || 'primary_brand';
}

/** fetch() wrapper that adds the Authorization header and JSON handling. */
export async function apiFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

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

  return data as T;
}

/** Same as apiFetch but automatically scoped to the current user's brand. */
export function brandFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const brandId = getBrandId();
  return apiFetch<T>(`/brands/${brandId}${path}`, init);
}

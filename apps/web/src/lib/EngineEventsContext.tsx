"use client";

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { API_BASE, getBrandId, getToken } from './api';

export interface EngineEvent {
  id: string;
  brandId: string;
  type: string;
  postId?: string | null;
  mediaAssetId?: string | null;
  message?: string | null;
  createdAt: string;
}

type Listener = (event: EngineEvent) => void;

const EngineEventsContext = createContext<{ subscribe: (fn: Listener) => () => void } | null>(null);

/**
 * Opens exactly one SSE connection to the AMAI Engine's activity stream for
 * the lifetime of the dashboard, instead of every page that calls
 * useEngineEvents() opening (and tearing down) its own EventSource on every
 * navigation. Mounted once in dashboard/layout.tsx, which persists across
 * all nested /dashboard/* route changes.
 */
export function EngineEventsProvider({ children }: { children: React.ReactNode }) {
  const listenersRef = useRef<Set<Listener>>(new Set());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const brandId = getBrandId();
    const token = getToken();
    const url = `${API_BASE}/brands/${brandId}/engine/events${token ? `?token=${encodeURIComponent(token)}` : ''}`;

    let source: EventSource | null = null;
    try {
      source = new EventSource(url, { withCredentials: false });
      source.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          listenersRef.current.forEach((fn) => fn(parsed));
        } catch {
          // ignore malformed events
        }
      };
      source.onerror = () => {};
    } catch {
      // SSE unsupported/unreachable — subscribers just won't get live
      // pushes and can rely on their own manual refresh actions.
    }

    return () => {
      source?.close();
    };
  }, []);

  const subscribe = (fn: Listener) => {
    listenersRef.current.add(fn);
    return () => listenersRef.current.delete(fn);
  };

  return (
    <EngineEventsContext.Provider value={{ subscribe }}>
      {children}
    </EngineEventsContext.Provider>
  );
}

/**
 * Subscribes to the AMAI Engine's live activity stream. Reuses the single
 * shared connection from EngineEventsProvider when mounted under one
 * (every /dashboard/* page); falls back to its own standalone EventSource
 * if used outside the provider so nothing breaks if called elsewhere.
 */
export function useEngineEvents(onEvent: (event: EngineEvent) => void) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;
  const ctx = useContext(EngineEventsContext);

  useEffect(() => {
    if (ctx) {
      return ctx.subscribe((event) => handlerRef.current(event));
    }

    if (typeof window === 'undefined') return;
    const brandId = getBrandId();
    const token = getToken();
    const url = `${API_BASE}/brands/${brandId}/engine/events${token ? `?token=${encodeURIComponent(token)}` : ''}`;

    let source: EventSource | null = null;
    try {
      source = new EventSource(url, { withCredentials: false });
      source.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          handlerRef.current(parsed);
        } catch {
          // ignore malformed events
        }
      };
      source.onerror = () => {};
    } catch {
      // SSE unsupported/unreachable.
    }

    return () => {
      source?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx]);
}

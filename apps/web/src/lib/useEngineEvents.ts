"use client";

import { useEffect, useRef } from 'react';
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

/**
 * Subscribes to the AMAI Engine's live activity stream (Server-Sent Events)
 * so pages can update instantly — new uploads, generated captions, approval
 * queue changes, scheduled posts, and publish results — without the user
 * ever needing to refresh the page.
 *
 * Falls back gracefully: if the SSE connection drops, the browser's
 * EventSource automatically reconnects on its own.
 */
export function useEngineEvents(onEvent: (event: EngineEvent) => void) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const brandId = getBrandId();
    const token = getToken();

    // EventSource can't set custom headers, so pass the token as a query
    // param — the API only uses it to resolve the brand, not to gate SSE.
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
      // Swallow connection errors — EventSource retries automatically.
      source.onerror = () => {};
    } catch {
      // SSE unsupported/unreachable — pages relying on this just won't
      // get live pushes and can rely on their own manual refresh actions.
    }

    return () => {
      source?.close();
    };
  }, []);
}

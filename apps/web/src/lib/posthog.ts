"use client";

// Minimal PostHog wiring, client-side only. No-ops completely until
// NEXT_PUBLIC_POSTHOG_KEY is set -- safe to ship ahead of having a PostHog
// account. Project API keys are meant to be embedded in client bundles
// (PostHog's own docs say so explicitly), not secrets.
let posthogInstance: typeof import('posthog-js').default | null = null;
let initPromise: Promise<void> | null = null;

export function initPostHog(): Promise<void> {
  if (initPromise) return initPromise;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (typeof window === 'undefined' || !key) {
    initPromise = Promise.resolve();
    return initPromise;
  }

  initPromise = import('posthog-js').then(({ default: posthog }) => {
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      // Manual pageview capture (see PostHogInit's route-change effect)
      // since this is an SPA-style App Router app -- the default
      // history-change autocapture doesn't reliably see Next's client-side
      // navigations.
      capture_pageview: false,
      persistence: 'localStorage+cookie',
    });
    posthogInstance = posthog;
  });
  return initPromise;
}

export function capture(event: string, properties?: Record<string, unknown>) {
  if (!posthogInstance) return;
  posthogInstance.capture(event, properties);
}

export function identify(userId: string, properties?: Record<string, unknown>) {
  if (!posthogInstance) return;
  posthogInstance.identify(userId, properties);
}

/**
 * Maps the AMAI Engine's live activity stream (see EngineEventsContext) to
 * the exact activation funnel the operating manual calls out: connect →
 * caption → schedule → approve. Centralizing this here means every
 * dashboard page that already fires these engine events gets funnel
 * tracking for free, with no per-page instrumentation needed.
 */
const ENGINE_EVENT_TO_FUNNEL_STEP: Record<string, string> = {
  ACCOUNT_CONNECTED: 'funnel_account_connected',
  CAPTION_GENERATED: 'funnel_caption_generated',
  AUTO_SCHEDULED: 'funnel_post_scheduled',
  APPROVAL_QUEUED: 'funnel_post_scheduled',
  POST_APPROVED: 'funnel_post_approved',
  PUBLISH_SUCCEEDED: 'funnel_post_published',
};

export function trackEngineEvent(event: { type: string; postId?: string | null; mediaAssetId?: string | null }) {
  const funnelName = ENGINE_EVENT_TO_FUNNEL_STEP[event.type];
  if (!funnelName) return;
  capture(funnelName, { engineEventType: event.type, postId: event.postId, mediaAssetId: event.mediaAssetId });
}

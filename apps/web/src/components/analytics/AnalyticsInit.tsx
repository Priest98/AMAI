"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useReportWebVitals } from 'next/web-vitals';
import { initClientSentry } from '@/lib/sentry';
import { initPostHog, capture } from '@/lib/posthog';
import { applySessionReplayPolicy } from '@/lib/observability/session-replay';

/**
 * Mounted once in the root layout. Initializes both Sentry (error capture)
 * and PostHog (product analytics) client-side -- each no-ops entirely if
 * its env var isn't set, so this is safe to ship before either account
 * exists. Also fires PostHog pageview events on every client-side route
 * change, since Next's App Router navigations don't trigger a full page
 * load for PostHog's default history-based autocapture to see.
 *
 * Deliberately uses only usePathname(), not useSearchParams() -- the latter
 * forces the nearest Suspense boundary and would de-opt every statically
 * prerendered page in this app (confirmed several are "○ Static" in the
 * build output) into dynamic rendering just to capture a query string on
 * pageview events, which isn't worth the trade at this stage.
 */
export default function AnalyticsInit() {
  const pathname = usePathname();

  useReportWebVitals((metric) => {
    capture('web_vital', {
      metricName: metric.name,
      metricValue: Math.round(metric.value),
      metricRating: metric.rating,
      navigationType: metric.navigationType,
    });
  });

  useEffect(() => {
    initClientSentry();
    initPostHog();

    const markNavigationStart = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.origin !== window.location.origin || anchor.target === '_blank') return;
      const destination = new URL(anchor.href).pathname;
      if (destination === window.location.pathname) return;
      sessionStorage.setItem('oyinca:navigation-start', String(performance.now()));
      sessionStorage.setItem('oyinca:navigation-destination', destination);
    };
    document.addEventListener('click', markNavigationStart, { capture: true });
    return () => document.removeEventListener('click', markNavigationStart, { capture: true });
  }, []);

  useEffect(() => {
    initPostHog().then(() => {
      capture('$pageview', { $current_url: pathname });
    });
    applySessionReplayPolicy(pathname);

    const startedAt = Number(sessionStorage.getItem('oyinca:navigation-start'));
    const destination = sessionStorage.getItem('oyinca:navigation-destination');
    if (Number.isFinite(startedAt) && destination === pathname) {
      requestAnimationFrame(() => {
        const durationMs = Math.round(performance.now() - startedAt);
        performance.measure(`oyinca-route:${pathname}`, { start: startedAt, end: performance.now() });
        capture('route_transition', { destinationPath: pathname, durationMs });
        sessionStorage.removeItem('oyinca:navigation-start');
        sessionStorage.removeItem('oyinca:navigation-destination');
      });
    }
  }, [pathname]);

  return null;
}

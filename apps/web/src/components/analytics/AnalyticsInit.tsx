"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { initClientSentry } from '@/lib/sentry';
import { initPostHog, capture } from '@/lib/posthog';

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

  useEffect(() => {
    initClientSentry();
    initPostHog();
  }, []);

  useEffect(() => {
    initPostHog().then(() => {
      capture('$pageview', { $current_url: pathname });
    });
  }, [pathname]);

  return null;
}

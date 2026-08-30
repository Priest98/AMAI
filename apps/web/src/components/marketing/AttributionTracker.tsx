'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export function AttributionTracker({ pageName }: { pageName: string }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    try {
      let sessionId = localStorage.getItem('oyinca_session_id');
      if (!sessionId) {
        sessionId = 'oy_sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
        localStorage.setItem('oyinca_session_id', sessionId);
      }

      const utmSource = searchParams.get('utm_source');
      const utmMedium = searchParams.get('utm_medium');
      const utmCampaign = searchParams.get('utm_campaign');
      const ref = searchParams.get('ref');

      if (utmSource || utmMedium || utmCampaign || ref) {
        const attribution = {
          utmSource: utmSource || (ref ? 'referral' : undefined),
          utmMedium: utmMedium || (ref ? 'link' : undefined),
          utmCampaign: utmCampaign || undefined,
          referralCode: ref || undefined,
        };
        localStorage.setItem('oyinca_attribution', JSON.stringify(attribution));
      }

      // Log attribution event to API
      fetch('/api/marketing/attribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          eventType: 'PAGE_VIEW',
          utmSource: utmSource || undefined,
          utmMedium: utmMedium || undefined,
          utmCampaign: utmCampaign || undefined,
          referrerUrl: typeof document !== 'undefined' ? document.referrer : undefined,
          landingPage: pageName,
        }),
      }).catch(() => {
        // Silent catch for background attribution
      });
    } catch {
      // LocalStorage access safeguard
    }
  }, [searchParams, pageName]);

  return null;
}

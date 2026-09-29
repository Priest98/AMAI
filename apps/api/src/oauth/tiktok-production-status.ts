const TIKTOK_INBOX_PROVIDER_ID_PREFIX = 'inbox:';

export type TikTokPublishingMethod = 'DIRECT_POST' | 'MEDIA_UPLOAD';

export function isTikTokDirectPostEnabled(): boolean {
  return process.env.TIKTOK_DIRECT_POST_ENABLED === 'true';
}

export function getTikTokPublishingMethod(): TikTokPublishingMethod {
  return isTikTokDirectPostEnabled() ? 'DIRECT_POST' : 'MEDIA_UPLOAD';
}

export function encodeTikTokProviderId(publishId: string, method: TikTokPublishingMethod): string {
  return method === 'MEDIA_UPLOAD' ? `${TIKTOK_INBOX_PROVIDER_ID_PREFIX}${publishId}` : publishId;
}

export function decodeTikTokProviderId(providerId: string): {
  publishId: string;
  method: TikTokPublishingMethod;
} {
  if (providerId.startsWith(TIKTOK_INBOX_PROVIDER_ID_PREFIX)) {
    return {
      publishId: providerId.slice(TIKTOK_INBOX_PROVIDER_ID_PREFIX.length),
      method: 'MEDIA_UPLOAD',
    };
  }
  return { publishId: providerId, method: 'DIRECT_POST' };
}

/**
 * Non-secret operational facts shown only in the platform-admin dashboard.
 * The runtime flag remains the source of truth for whether Direct Post may
 * execute; keeping the review facts here avoids scattering status strings.
 */
export function getTikTokProductionStatus() {
  const directPostEnabled = isTikTokDirectPostEnabled();
  return {
    appId: process.env.TIKTOK_APP_ID || '7677253807461369863',
    environment: process.env.TIKTOK_ENVIRONMENT || 'Production',
    mainApp: 'Live',
    loginKit: 'Active',
    contentUpload: 'Active',
    directPost: directPostEnabled ? 'Active' : 'Pending Review',
    directPostApplicationSubmitted: process.env.TIKTOK_DIRECT_POST_SUBMITTED_AT || '2026-09-29',
    directPostEnabled,
  } as const;
}

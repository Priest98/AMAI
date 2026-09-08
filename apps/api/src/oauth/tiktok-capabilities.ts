export type TikTokCapabilities = {
  canAuthenticateWithTikTok: boolean;
  canReadProfile: boolean;
  canReadVideos: boolean;
  canUploadDraft: boolean;
  canDirectPost: boolean;
  canPublicPost: boolean;
};

export function deriveTikTokCapabilities(scopes: string[]): TikTokCapabilities {
  const granted = new Set(scopes);
  const direct = granted.has('video.publish');
  return {
    canAuthenticateWithTikTok: granted.has('user.info.basic'),
    canReadProfile: granted.has('user.info.basic') || granted.has('user.info.profile'),
    canReadVideos: granted.has('video.list'),
    canUploadDraft: granted.has('video.upload'),
    canDirectPost: direct,
    canPublicPost: direct && process.env.TIKTOK_CONTENT_AUDITED === 'true',
  };
}

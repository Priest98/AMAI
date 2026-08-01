import { PlatformMediaRules } from '../interfaces/media-rules.interface';

const MB = 1024 * 1024;

// Blurred-canvas letterbox/pillarbox is the default recovery behavior for
// every platform below, matching the product requirement: never reject an
// upload for being the "wrong shape," preserve the full original frame,
// pad it onto a background instead of cropping content away.
const DEFAULT_CANVAS = {
  enabled: true,
  backgroundStrategy: 'blur' as const,
  blurSigma: 45,
  backgroundDim: 0.35,
};

// Used only where canvas padding is explicitly turned off for a platform;
// 'attention' is sharp's saliency heuristic (an interest/contrast-based
// estimate of the busiest region of the frame) -- a genuinely useful
// signal for keeping faces/products/text in shot on average, but it is a
// heuristic, not real face/object detection. Documented here rather than
// overclaimed.
const DEFAULT_CROP = { strategy: 'attention' as const };

/**
 * NOTE ON THE NUMBERS BELOW: these reflect each platform's publicly
 * documented recommendations as of this implementation. Platforms change
 * these periodically (Instagram in particular has adjusted its accepted
 * feed aspect-ratio range before) -- when that happens, this is the only
 * file that needs to change. Nothing else in the app hardcodes a
 * dimension, ratio, or size limit.
 */
export const PLATFORM_MEDIA_RULES: Record<string, PlatformMediaRules> = {
  INSTAGRAM: {
    key: 'INSTAGRAM',
    label: 'Instagram',
    image: {
      // 4:5 (tallest allowed portrait) to 1.91:1 (widest allowed
      // landscape) -- Meta's documented feed-photo range, also confirmed
      // live via production 36003/2207009 rejection errors on out-of-range
      // portrait shots.
      supportedAspectRatios: [{ min: 4 / 5, max: 1.91, label: 'feed (portrait-landscape)' }],
      preferredDimensions: { width: 1080, height: 1350 }, // 4:5, Instagram's recommended default
      maxFileSizeBytes: 8 * MB,
      supportedFormats: ['image/jpeg', 'image/png'],
      compressionQuality: 90,
      canvasBehavior: DEFAULT_CANVAS,
      croppingBehavior: DEFAULT_CROP,
    },
    video: {
      // Reels (9:16) through feed video (up to 1.91:1 landscape).
      supportedAspectRatios: [{ min: 0.5625, max: 1.91, label: 'reels/feed video' }],
      preferredDimensions: { width: 1080, height: 1920 },
      maxFileSizeBytes: 250 * MB,
      maxDurationSeconds: 90,
      supportedFormats: ['video/mp4'],
      canvasBehavior: DEFAULT_CANVAS,
      targetBitrateKbps: 3500,
    },
  },

  TIKTOK: {
    key: 'TIKTOK',
    label: 'TikTok',
    image: {
      supportedAspectRatios: [{ min: 0.5625, max: 1.91, label: 'photo post' }],
      preferredDimensions: { width: 1080, height: 1920 },
      maxFileSizeBytes: 20 * MB,
      supportedFormats: ['image/jpeg'],
      compressionQuality: 90,
      canvasBehavior: DEFAULT_CANVAS,
      croppingBehavior: DEFAULT_CROP,
    },
    video: {
      // TikTok strongly prefers full vertical 9:16; a modest range is kept
      // so near-vertical content isn't force-padded unnecessarily.
      supportedAspectRatios: [{ min: 0.5, max: 0.6, label: 'vertical (9:16)' }],
      preferredDimensions: { width: 1080, height: 1920 },
      maxFileSizeBytes: 500 * MB,
      maxDurationSeconds: 600,
      supportedFormats: ['video/mp4'],
      canvasBehavior: DEFAULT_CANVAS,
      targetBitrateKbps: 4000,
    },
  },

  FACEBOOK: {
    key: 'FACEBOOK',
    label: 'Facebook',
    image: {
      supportedAspectRatios: [{ min: 4 / 5, max: 1.91, label: 'feed (portrait-landscape)' }],
      preferredDimensions: { width: 1080, height: 1350 },
      maxFileSizeBytes: 10 * MB,
      supportedFormats: ['image/jpeg', 'image/png'],
      compressionQuality: 88,
      canvasBehavior: DEFAULT_CANVAS,
      croppingBehavior: DEFAULT_CROP,
    },
    video: {
      supportedAspectRatios: [{ min: 0.5625, max: 1.91, label: 'reels/feed video' }],
      preferredDimensions: { width: 1080, height: 1920 },
      maxFileSizeBytes: 500 * MB,
      maxDurationSeconds: 240,
      supportedFormats: ['video/mp4'],
      canvasBehavior: DEFAULT_CANVAS,
      targetBitrateKbps: 4000,
    },
  },

  LINKEDIN: {
    key: 'LINKEDIN',
    label: 'LinkedIn',
    image: {
      supportedAspectRatios: [{ min: 1.0, max: 1.91, label: 'feed (square-landscape)' }],
      preferredDimensions: { width: 1200, height: 627 },
      maxFileSizeBytes: 10 * MB,
      supportedFormats: ['image/jpeg', 'image/png'],
      compressionQuality: 85,
      canvasBehavior: DEFAULT_CANVAS,
      croppingBehavior: DEFAULT_CROP,
    },
    video: {
      supportedAspectRatios: [{ min: 0.5625, max: 1.91, label: 'feed video' }],
      preferredDimensions: { width: 1920, height: 1080 },
      maxFileSizeBytes: 200 * MB,
      maxDurationSeconds: 600,
      supportedFormats: ['video/mp4'],
      canvasBehavior: DEFAULT_CANVAS,
      targetBitrateKbps: 4000,
    },
  },

  X: {
    key: 'X',
    label: 'X',
    image: {
      supportedAspectRatios: [{ min: 0.5, max: 2.0, label: 'wide range' }],
      preferredDimensions: { width: 1200, height: 675 },
      maxFileSizeBytes: 5 * MB,
      supportedFormats: ['image/jpeg', 'image/png'],
      compressionQuality: 85,
      canvasBehavior: DEFAULT_CANVAS,
      croppingBehavior: DEFAULT_CROP,
    },
    video: {
      supportedAspectRatios: [{ min: 0.5625, max: 1.91, label: 'wide range' }],
      preferredDimensions: { width: 1280, height: 720 },
      maxFileSizeBytes: 512 * MB,
      maxDurationSeconds: 140,
      supportedFormats: ['video/mp4'],
      canvasBehavior: DEFAULT_CANVAS,
      targetBitrateKbps: 5000,
    },
  },

  YOUTUBE_SHORTS: {
    key: 'YOUTUBE_SHORTS',
    label: 'YouTube Shorts',
    image: {
      supportedAspectRatios: [{ min: 0.5625, max: 0.5625, label: 'vertical cover (9:16)' }],
      preferredDimensions: { width: 1080, height: 1920 },
      maxFileSizeBytes: 2 * MB,
      supportedFormats: ['image/jpeg'],
      compressionQuality: 92,
      canvasBehavior: DEFAULT_CANVAS,
      croppingBehavior: DEFAULT_CROP,
    },
    video: {
      supportedAspectRatios: [{ min: 0.5625, max: 0.5625, label: 'vertical (9:16)' }],
      preferredDimensions: { width: 1080, height: 1920 },
      maxFileSizeBytes: 500 * MB,
      maxDurationSeconds: 60,
      supportedFormats: ['video/mp4'],
      canvasBehavior: DEFAULT_CANVAS,
      targetBitrateKbps: 6000,
    },
  },
};

export function getPlatformMediaRules(platformKey: string): PlatformMediaRules | null {
  return PLATFORM_MEDIA_RULES[platformKey.toUpperCase()] || null;
}

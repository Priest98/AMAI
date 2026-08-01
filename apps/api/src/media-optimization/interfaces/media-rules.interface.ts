/**
 * Every platform's media requirements live here as data, never as
 * scattered magic numbers in optimizer classes or the publishing service.
 * Adding a new platform (or adjusting an existing one when a platform
 * changes its rules — these do drift over time) is a config edit, not a
 * code change.
 */

export interface AspectRatioRange {
  /** width / height, inclusive lower bound (tallest allowed portrait). */
  min: number;
  /** width / height, inclusive upper bound (widest allowed landscape). */
  max: number;
  label: string;
}

export interface CanvasBehaviorConfig {
  /** If true and the source falls outside supportedAspectRatios, the
   *  source is padded onto a canvas at the preferred aspect ratio instead
   *  of being cropped -- the full original frame is preserved. */
  enabled: boolean;
  backgroundStrategy: 'blur' | 'solid';
  solidColor?: string; // used when backgroundStrategy === 'solid'
  /** Gaussian blur sigma applied to the background copy. Higher = softer. */
  blurSigma?: number;
  /** Background is darkened slightly (0-1) so the centered foreground
   *  reads clearly against it. */
  backgroundDim?: number;
}

export interface CroppingBehaviorConfig {
  /** 'attention'/'entropy' are sharp's saliency heuristics (a
   *  contrast/interest-based estimate of the "important" region) — a
   *  real, useful signal for keeping faces/products/text in frame on
   *  average, but it is a heuristic, not object/face detection. 'center'
   *  is a plain center crop. */
  strategy: 'attention' | 'entropy' | 'center';
}

export interface ImagePlatformRules {
  supportedAspectRatios: AspectRatioRange[];
  preferredDimensions: { width: number; height: number };
  maxFileSizeBytes: number;
  /** Output mime types this platform accepts, in preference order. The
   *  engine always encodes to the first one. */
  supportedFormats: string[];
  /** 0-100 starting quality for lossy encodes; the engine steps this down
   *  automatically if the result still exceeds maxFileSizeBytes. */
  compressionQuality: number;
  canvasBehavior: CanvasBehaviorConfig;
  croppingBehavior: CroppingBehaviorConfig;
}

export interface VideoPlatformRules {
  supportedAspectRatios: AspectRatioRange[];
  preferredDimensions: { width: number; height: number };
  maxFileSizeBytes: number;
  maxDurationSeconds: number;
  supportedFormats: string[];
  canvasBehavior: CanvasBehaviorConfig;
  /** Target video bitrate in kbps used when re-encoding. */
  targetBitrateKbps: number;
}

export interface PlatformMediaRules {
  key: string;
  label: string;
  image: ImagePlatformRules;
  video: VideoPlatformRules;
}

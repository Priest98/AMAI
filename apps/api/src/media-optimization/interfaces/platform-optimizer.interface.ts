import { PlatformMediaRules } from './media-rules.interface';

/**
 * A "platform optimizer" is intentionally thin: it's just an identity
 * (platformKey) plus a pointer at that platform's rules. The actual image
 * and video processing pipelines (ImageOptimizationEngine /
 * VideoOptimizationEngine) are shared, parameterized by whatever rules
 * they're handed -- six copies of the same sharp/ffmpeg pipeline would be
 * six times the bugs, not six times the modularity. What "adding a new
 * platform is just a new optimizer module" actually buys you here is: add
 * one rules entry in platform-media-rules.config.ts, add one small class
 * implementing this interface, register it. No changes to the engines, to
 * MediaOptimizationService, or to anything downstream.
 */
export interface PlatformOptimizer {
  readonly platformKey: string;
  readonly rules: PlatformMediaRules;
}

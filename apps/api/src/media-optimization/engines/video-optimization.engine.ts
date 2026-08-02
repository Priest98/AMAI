import { Injectable, Logger } from '@nestjs/common';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { VideoPlatformRules } from '../interfaces/media-rules.interface';

export interface OptimizedVideoResult {
  /** null when the source was left untouched (see `passthrough`). */
  buffer: Buffer | null;
  /** True when the source was too large/long to safely re-encode inside
   *  this serverless function's time budget, so the original bytes are
   *  reused as-is instead of risking a hard timeout mid-transcode. This
   *  is a deliberate, honest degrade -- never a silent failure. */
  passthrough: boolean;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  canvasApplied: boolean;
  thumbnailBuffer: Buffer | null;
}

// Vercel serverless functions have no persistent worker and a hard
// platform execution cap; ffmpeg-static gives real transcoding without a
// dedicated media-processing service, but only within a budget this
// function can safely finish inside. Above either threshold, re-encoding
// is skipped entirely (passthrough) rather than racing the platform's own
// kill switch -- see MediaOptimizationService for how the pipeline-level
// timeout composes with this.
const SAFE_PROCESS_MAX_BYTES = 30 * 1024 * 1024; // 30MB
const SAFE_PROCESS_MAX_DURATION_S = 90;
const FFMPEG_TIMEOUT_MS = 35_000;
const THUMBNAIL_TIMEOUT_MS = 8_000;

/**
 * Video processing pipeline shared by every platform optimizer, mirroring
 * ImageOptimizationEngine's role for images. Uses ffmpeg-static (a
 * bundled, precompiled ffmpeg binary — no system install required) via
 * fluent-ffmpeg. Every ffmpeg invocation is bounded by withTimeout-style
 * logic and every temp file is cleaned up in a `finally`, so a stuck or
 * slow encode can never leak disk space in `/tmp` or blow through
 * Vercel's platform timeout.
 */
@Injectable()
export class VideoOptimizationEngine {
  private readonly logger = new Logger(VideoOptimizationEngine.name);
  private ffmpegConfigured = false;

  private async ffmpeg() {
    const ffmpeg = (await import('fluent-ffmpeg')).default;
    if (!this.ffmpegConfigured) {
      const ffmpegPath = (await import('ffmpeg-static')).default as unknown as string;
      const ffprobeStatic = (await import('ffprobe-static')).default as unknown as { path: string };
      if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
      if (ffprobeStatic?.path) ffmpeg.setFfprobePath(ffprobeStatic.path);
      this.ffmpegConfigured = true;
    }
    return ffmpeg;
  }

  async optimize(sourceBuffer: Buffer, rules: VideoPlatformRules): Promise<OptimizedVideoResult> {
    // Kill switch, default OFF. ffmpeg-static bundles a real precompiled
    // ffmpeg binary and spawns it as a child process -- unlike sharp
    // (pure native addon, no subprocess), this depends on Vercel's build
    // actually including that binary in the deployed function bundle with
    // exec permission intact, which is a known trouble spot for this
    // package on serverless platforms. Reported symptom in production
    // (videos hanging at "generating hashtags", i.e. the upload pipeline
    // never completing) is consistent with a spawned ffmpeg process that
    // never resolves/rejects the way a pure-JS timeout expects, which can
    // stall or OOM-kill the whole function -- taking the otherwise-fine AI
    // pipeline down with it, since MediaService.triggerProcessing awaits
    // both concurrently. Until ffmpeg-static is confirmed to actually run
    // cleanly in this environment (verified via a real production test),
    // every video is treated as passthrough: original file reused as-is,
    // no thumbnail. Flip MEDIA_OPTIMIZATION_VIDEO_TRANSCODE=1 once that's
    // confirmed safe to re-enable real transcoding/thumbnailing below.
    if (process.env.MEDIA_OPTIMIZATION_VIDEO_TRANSCODE !== '1') {
      return { buffer: null, passthrough: true, width: null, height: null, durationSeconds: null, canvasApplied: false, thumbnailBuffer: null };
    }

    const ffmpeg = await this.ffmpeg();
    const workDir = os.tmpdir();
    const id = randomUUID();
    const inputPath = path.join(workDir, `${id}-in.mp4`);
    const outputPath = path.join(workDir, `${id}-out.mp4`);
    const thumbPath = path.join(workDir, `${id}-thumb.jpg`);

    try {
      await fs.writeFile(inputPath, sourceBuffer);

      const probe = await this.probe(ffmpeg, inputPath).catch((error: any) => {
        this.logger.warn(`Video probe failed, treating as passthrough: ${error?.message || error}`);
        return null;
      });

      const thumbnailBuffer = await this.extractThumbnail(ffmpeg, inputPath, thumbPath, probe?.duration ?? null);

      const withinSafeBudget =
        sourceBuffer.byteLength <= SAFE_PROCESS_MAX_BYTES &&
        (probe?.duration ?? 0) <= SAFE_PROCESS_MAX_DURATION_S;

      if (!probe || !withinSafeBudget) {
        if (probe) {
          this.logger.log(
            `Video (${(sourceBuffer.byteLength / 1024 / 1024).toFixed(1)}MB, ${probe.duration?.toFixed(0)}s) exceeds the safe synchronous re-encode budget -- using original file as-is for this platform, thumbnail generated separately.`,
          );
        }
        return {
          buffer: null,
          passthrough: true,
          width: probe?.width ?? null,
          height: probe?.height ?? null,
          durationSeconds: probe?.duration ?? null,
          canvasApplied: false,
          thumbnailBuffer,
        };
      }

      const ratio = probe.width / probe.height;
      const inRange = rules.supportedAspectRatios.some((r) => ratio >= r.min && ratio <= r.max);
      const canvasApplied = !inRange && rules.canvasBehavior.enabled;

      await this.transcode(ffmpeg, inputPath, outputPath, rules, canvasApplied);
      const buffer = await fs.readFile(outputPath);
      const outMeta = await this.probe(ffmpeg, outputPath).catch(() => null);

      return {
        buffer,
        passthrough: false,
        width: outMeta?.width ?? rules.preferredDimensions.width,
        height: outMeta?.height ?? rules.preferredDimensions.height,
        durationSeconds: outMeta?.duration ?? probe.duration,
        canvasApplied,
        thumbnailBuffer,
      };
    } catch (error: any) {
      this.logger.warn(`Video optimization failed, falling back to original file: ${error?.message || error}`);
      return { buffer: null, passthrough: true, width: null, height: null, durationSeconds: null, canvasApplied: false, thumbnailBuffer: null };
    } finally {
      await Promise.all([inputPath, outputPath, thumbPath].map((p) => fs.unlink(p).catch(() => {})));
    }
  }

  private probe(ffmpeg: any, filePath: string): Promise<{ width: number; height: number; duration: number }> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('ffprobe timed out')), 15_000);
      ffmpeg.ffprobe(filePath, (err: any, data: any) => {
        clearTimeout(timer);
        if (err) return reject(err);
        const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');
        if (!videoStream) return reject(new Error('No video stream found.'));
        resolve({
          width: videoStream.width,
          height: videoStream.height,
          duration: Number(data.format?.duration || videoStream.duration || 0),
        });
      });
    });
  }

  /** Best-effort only -- a failed thumbnail never fails the whole optimize() call. */
  private async extractThumbnail(ffmpeg: any, inputPath: string, thumbPath: string, durationS: number | null): Promise<Buffer | null> {
    const seekSeconds = durationS && durationS > 1 ? 1 : 0;
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Thumbnail extraction timed out')), THUMBNAIL_TIMEOUT_MS);
        ffmpeg(inputPath)
          .on('end', () => { clearTimeout(timer); resolve(); })
          .on('error', (err: any) => { clearTimeout(timer); reject(err); })
          .screenshots({ timestamps: [seekSeconds], filename: path.basename(thumbPath), folder: path.dirname(thumbPath), size: '640x?' });
      });
      return await fs.readFile(thumbPath);
    } catch (error: any) {
      this.logger.warn(`Thumbnail extraction failed: ${error?.message || error}`);
      return null;
    }
  }

  /**
   * Re-encodes to the platform's preferred canvas. When the source is
   * within the supported aspect-ratio range, this is a plain scale-down
   * (never upscale). When it's outside the range and canvas behavior is
   * enabled, builds the same blurred-background-canvas treatment as the
   * image engine, in ffmpeg's filter graph: one branch of the source is
   * scaled to fill and cropped to the canvas, then blurred, for the
   * background; the other branch is scaled to fit entirely inside the
   * canvas (no crop, no distortion) and overlaid centered on top.
   */
  private transcode(
    ffmpeg: any,
    inputPath: string,
    outputPath: string,
    rules: VideoPlatformRules,
    canvasApplied: boolean,
  ): Promise<void> {
    const { width, height } = rules.preferredDimensions;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        command.kill('SIGKILL');
        reject(new Error(`Video transcode timed out after ${FFMPEG_TIMEOUT_MS}ms`));
      }, FFMPEG_TIMEOUT_MS);

      const command = ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .videoBitrate(rules.targetBitrateKbps)
        .outputOptions(['-preset veryfast', '-movflags +faststart', '-pix_fmt yuv420p']);

      if (canvasApplied) {
        const blurSigma = rules.canvasBehavior.blurSigma ?? 45;
        command.complexFilter([
          `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},gblur=sigma=${Math.min(blurSigma, 50) / 3}[bg]`,
          `[0:v]scale=${width}:${height}:force_original_aspect_ratio=decrease[fg]`,
          `[bg][fg]overlay=(W-w)/2:(H-h)/2[outv]`,
        ], 'outv');
      } else {
        command.videoFilters(`scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black`);
      }

      command
        .on('end', () => { clearTimeout(timer); resolve(); })
        .on('error', (err: any) => { clearTimeout(timer); reject(err); })
        .save(outputPath);
    });
  }
}

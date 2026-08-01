import { Injectable, Logger } from '@nestjs/common';
import { ImagePlatformRules } from '../interfaces/media-rules.interface';

export interface OptimizedImageResult {
  buffer: Buffer;
  width: number;
  height: number;
  mimeType: string;
  canvasApplied: boolean;
  croppedApplied: boolean;
}

const FORMAT_TO_SHARP_METHOD: Record<string, 'jpeg' | 'png' | 'webp'> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// Compression is stepped down until the output fits under the platform's
// size cap, or these floors are hit -- whichever comes first. Bounded so a
// pathological source (already-tiny dimensions that just won't compress
// further) can never turn into an unbounded loop.
const MIN_QUALITY = 40;
const QUALITY_STEP = 10;
const MAX_DIMENSION_SHRINKS = 4;
const DIMENSION_SHRINK_FACTOR = 0.85;

/**
 * The actual image-processing pipeline, shared by every platform
 * optimizer (parameterized entirely by the ImagePlatformRules it's
 * handed — see interfaces/platform-optimizer.interface.ts for why this
 * is a shared engine rather than one hand-rolled sharp pipeline per
 * platform).
 *
 * Behavior, matching the product requirement exactly:
 *  - Source aspect ratio within the platform's supported range -> resize
 *    down to fit the preferred dimensions (never upscale) and compress.
 *    Nothing is cropped or padded.
 *  - Source aspect ratio outside the supported range, canvas behavior
 *    enabled -> the full original frame is preserved, centered on a
 *    canvas at the platform's preferred aspect ratio, background filled
 *    with a blurred/dimmed copy of the same image (never black bars,
 *    never stretched/distorted content).
 *  - Source aspect ratio outside range, canvas behavior disabled -> a
 *    saliency-aware crop (sharp's attention/entropy strategy) instead of
 *    a blind center crop.
 */
@Injectable()
export class ImageOptimizationEngine {
  private readonly logger = new Logger(ImageOptimizationEngine.name);

  async optimize(sourceBuffer: Buffer, rules: ImagePlatformRules): Promise<OptimizedImageResult> {
    const sharp = (await import('sharp')).default;
    // .rotate() with no args auto-orients using the image's EXIF
    // orientation tag and then strips it, so a portrait phone photo that's
    // stored "sideways" with an orientation flag doesn't get analyzed or
    // cropped as if it were landscape.
    const oriented = sharp(sourceBuffer).rotate();
    const meta = await oriented.metadata();
    if (!meta.width || !meta.height) {
      throw new Error('Could not read image dimensions.');
    }

    const orientedBuffer = await oriented.toBuffer();
    const ratio = meta.width / meta.height;
    const inRange = rules.supportedAspectRatios.some((r) => ratio >= r.min && ratio <= r.max);

    let working: Buffer;
    let canvasApplied = false;
    let croppedApplied = false;

    if (inRange) {
      working = await sharp(orientedBuffer)
        .resize({
          width: rules.preferredDimensions.width,
          height: rules.preferredDimensions.height,
          fit: 'inside', // never upscale past this, never distort
          withoutEnlargement: true,
        })
        .toBuffer();
    } else if (rules.canvasBehavior.enabled) {
      working = await this.buildCanvas(sharp, orientedBuffer, rules);
      canvasApplied = true;
    } else {
      const strategy =
        rules.croppingBehavior.strategy === 'center'
          ? 'centre'
          : rules.croppingBehavior.strategy === 'entropy'
            ? sharp.strategy.entropy
            : sharp.strategy.attention;
      working = await sharp(orientedBuffer)
        .resize({
          width: rules.preferredDimensions.width,
          height: rules.preferredDimensions.height,
          fit: 'cover',
          position: strategy as any,
        })
        .toBuffer();
      croppedApplied = true;
    }

    const format = rules.supportedFormats[0] || 'image/jpeg';
    const method = FORMAT_TO_SHARP_METHOD[format] || 'jpeg';
    const { buffer, width, height } = await this.compressUnderLimit(sharp, working, method, rules);

    return { buffer, width, height, mimeType: format, canvasApplied, croppedApplied };
  }

  /**
   * Pads the full original frame onto a canvas at the platform's
   * preferred aspect ratio: background = a cover-filled, blurred, dimmed
   * copy of the same image (never a stranger's content, never a flat
   * color unless the platform is explicitly configured for one);
   * foreground = the original, resized to fit entirely inside the canvas
   * with no cropping and no distortion, centered.
   */
  private async buildCanvas(sharp: any, sourceBuffer: Buffer, rules: ImagePlatformRules): Promise<Buffer> {
    const { width: canvasWidth, height: canvasHeight } = rules.preferredDimensions;
    const behavior = rules.canvasBehavior;

    let background: Buffer;
    if (behavior.backgroundStrategy === 'solid') {
      background = await sharp({
        create: {
          width: canvasWidth,
          height: canvasHeight,
          channels: 3,
          background: behavior.solidColor || '#000000',
        },
      })
        .jpeg()
        .toBuffer();
    } else {
      const dim = behavior.backgroundDim ?? 0.35;
      background = await sharp(sourceBuffer)
        .resize({ width: canvasWidth, height: canvasHeight, fit: 'cover', position: 'centre' })
        .blur(behavior.blurSigma ?? 45)
        .modulate({ brightness: Math.max(0.2, 1 - dim) })
        .toBuffer();
    }

    const foreground = await sharp(sourceBuffer)
      .resize({ width: canvasWidth, height: canvasHeight, fit: 'inside', withoutEnlargement: false })
      .toBuffer();

    return sharp(background)
      .composite([{ input: foreground, gravity: 'centre' }])
      .toBuffer();
  }

  /**
   * Encodes at the platform's starting quality, then steps quality (and,
   * if quality alone isn't enough, dimensions) down until the result fits
   * under maxFileSizeBytes or the bounded number of attempts is
   * exhausted -- whichever comes first. Always returns something (the
   * last attempt), never throws for being "still too big," since a
   * slightly-oversized optimized asset is still far better than none.
   */
  private async compressUnderLimit(
    sharp: any,
    working: Buffer,
    method: 'jpeg' | 'png' | 'webp',
    rules: ImagePlatformRules,
  ): Promise<{ buffer: Buffer; width: number; height: number }> {
    let quality = rules.compressionQuality;
    let currentInput = working;
    let lastResult: { buffer: Buffer; width: number; height: number } | null = null;

    for (let shrink = 0; shrink <= MAX_DIMENSION_SHRINKS; shrink++) {
      for (let q = quality; q >= MIN_QUALITY; q -= QUALITY_STEP) {
        const instance = sharp(currentInput);
        const encoded =
          method === 'png' ? instance.png({ quality: q }) : method === 'webp' ? instance.webp({ quality: q }) : instance.jpeg({ quality: q });
        const buffer: Buffer = await encoded.toBuffer();
        const meta = await sharp(buffer).metadata();
        lastResult = { buffer, width: meta.width || 0, height: meta.height || 0 };
        if (buffer.byteLength <= rules.maxFileSizeBytes) {
          return lastResult;
        }
      }
      if (shrink < MAX_DIMENSION_SHRINKS) {
        const meta = await sharp(currentInput).metadata();
        currentInput = await sharp(currentInput)
          .resize({
            width: Math.round((meta.width || rules.preferredDimensions.width) * DIMENSION_SHRINK_FACTOR),
            withoutEnlargement: true,
          })
          .toBuffer();
      }
    }

    if (!lastResult) throw new Error('Image compression produced no output.');
    this.logger.warn(`Optimized image still exceeds ${rules.maxFileSizeBytes} bytes after max compression attempts (final: ${lastResult.buffer.byteLength}).`);
    return lastResult;
  }
}

import { BadRequestException } from '@nestjs/common';

export const MAX_VIDEO_ANALYSIS_BYTES = 14 * 1024 * 1024;
export function assertSupportedVideoSize(mimeType: string, bytes: number): void {
  if (mimeType?.toLowerCase().startsWith('video/') && bytes > MAX_VIDEO_ANALYSIS_BYTES) {
    throw new BadRequestException('Automatic video preparation supports videos up to 14 MiB. Upload a compressed or shorter version.');
  }
}

import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { put, del } from '@vercel/blob';

/**
 * Real media storage backed by Vercel Blob.
 *
 * Requires a BLOB_READ_WRITE_TOKEN environment variable (create a Blob store
 * in your Vercel project -> Storage -> Blob, then copy the token into
 * apps/api/.env and your deployment's environment variables).
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  private get token(): string | undefined {
    return process.env.BLOB_READ_WRITE_TOKEN;
  }

  async uploadFile(file: Express.Multer.File, brandId: string): Promise<{ url: string; size: number; mimeType: string }> {
    if (!this.token) {
      throw new InternalServerErrorException(
        'Media storage is not configured. Ask an admin to add BLOB_READ_WRITE_TOKEN to the API environment variables.',
      );
    }

    const safeName = (file.originalname || 'upload').replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const pathname = `${brandId}/${Date.now()}-${safeName}`;

    try {
      const blob = await put(pathname, file.buffer, {
        access: 'public',
        contentType: file.mimetype,
        token: this.token,
        addRandomSuffix: true,
      });

      return {
        url: blob.url,
        size: file.size,
        mimeType: file.mimetype,
      };
    } catch (error: any) {
      this.logger.error(`Storage upload error: ${error?.message || error}`);
      throw new InternalServerErrorException(
        'We could not upload that file to storage. Please try again. If this keeps happening, the file may be too large or an unsupported format.',
      );
    }
  }

  /** Used by non-multer upload sources, e.g. files pulled in from Google Drive. */
  async uploadBuffer(buffer: Buffer, filename: string, mimeType: string, brandId: string): Promise<{ url: string; size: number; mimeType: string }> {
    if (!this.token) {
      throw new InternalServerErrorException(
        'Media storage is not configured. Ask an admin to add BLOB_READ_WRITE_TOKEN to the API environment variables.',
      );
    }

    const safeName = (filename || 'drive-file').replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const pathname = `${brandId}/${Date.now()}-${safeName}`;

    try {
      const blob = await put(pathname, buffer, {
        access: 'public',
        contentType: mimeType,
        token: this.token,
        addRandomSuffix: true,
      });

      return { url: blob.url, size: buffer.byteLength, mimeType };
    } catch (error: any) {
      this.logger.error(`Storage upload (buffer) error: ${error?.message || error}`);
      throw new InternalServerErrorException('We could not save that file to storage.');
    }
  }

  /**
   * Uploads content to an EXACT pathname (no random suffix, no brandId
   * prefix) at the root of this Blob store. Only used for one-off,
   * externally-dictated filenames -- e.g. a TikTok domain-ownership
   * verification file, which must live at the literal path TikTok's portal
   * specifies for `pull_by_url` (photo posting) to be verifiable at all.
   * Every other upload path in this file deliberately keeps
   * addRandomSuffix: true to avoid collisions; this is the one legitimate
   * exception.
   */
  async uploadExact(pathname: string, content: string, contentType: string): Promise<{ url: string }> {
    if (!this.token) {
      throw new InternalServerErrorException('Media storage is not configured.');
    }
    const blob = await put(pathname, content, {
      access: 'public',
      contentType,
      token: this.token,
      addRandomSuffix: false,
    });
    return { url: blob.url };
  }

  async deleteFile(fileUrl: string): Promise<void> {
    if (!fileUrl || !this.token) return;
    try {
      await del(fileUrl, { token: this.token });
    } catch (error: any) {
      // Deletion failures shouldn't block the caller's primary action (e.g.
      // marking a post published) — log and move on.
      this.logger.warn(`Storage delete error for ${fileUrl}: ${error?.message || error}`);
    }
  }
}

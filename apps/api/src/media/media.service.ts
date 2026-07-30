import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { EngineService } from '../engine/engine.service';
import { MediaStatus, ContentSource } from '@prisma/client';

// Every external AI call in the pipeline (AiService.analyzeImage /
// generateCaption / generateHashtags) is now individually time-bounded,
// so a single asset's full pipeline run has a real worst case instead of
// being open-ended. 2 minutes is comfortably past that, so this sweep
// won't collide with an asset that's still legitimately mid-flight.
const STALE_PROCESSING_MINUTES = 2;
// Re-processing a stale asset happens inline inside a GET /assets
// request, on top of whatever a cold Lambda start already costs (Nest
// boot + first DB connection can itself take several seconds) — observed
// in production hitting the 60s platform cap when a cold start landed on
// top of even a single bounded pipeline run. Sweeping only one stale item
// per call keeps the worst case predictable and leaves real headroom.
// Any remaining backlog clears over the next few polls — the Media
// Library re-fetches on every SSE engine event and on mount.
const SWEEP_MAX_ITEMS = 1;

@Injectable()
export class MediaService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private engineService: EngineService,
  ) {}

  async uploadAsset(brandId: string, file: Express.Multer.File, folderId?: string) {
    if (!file) throw new BadRequestException('No file provided');

    const uploadedData = await this.storage.uploadFile(file, brandId);

    return this.createAssetRecord(brandId, {
      filename: file.originalname || 'uploaded_media',
      url: uploadedData.url,
      size: uploadedData.size || file.size || 0,
      mimeType: uploadedData.mimeType || file.mimetype,
      folderId,
    });
  }

  /**
   * Registers a file that the browser already uploaded directly to Vercel
   * Blob storage (via the client-direct-upload flow), bypassing the
   * serverless function's ~4.5MB request-body cap that blocked large video
   * uploads through the legacy multipart `uploadAsset` path above.
   */
  async registerUploadedAsset(
    brandId: string,
    dto: { url: string; size: number; mimeType: string; filename: string; folderId?: string },
  ) {
    if (!dto?.url) throw new BadRequestException('No file URL provided');
    if (!/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//.test(dto.url)) {
      throw new BadRequestException('Invalid upload URL.');
    }

    return this.createAssetRecord(brandId, dto);
  }

  private async createAssetRecord(
    brandId: string,
    dto: { url: string; size?: number; mimeType: string; filename?: string; folderId?: string },
  ) {
    const asset = await this.prisma.mediaAsset.create({
      data: {
        brandId,
        folderId: dto.folderId || null,
        filename: dto.filename || 'uploaded_media',
        blobUrl: dto.url,
        sizeBytes: dto.size || 0,
        mimeType: dto.mimeType,
        source: ContentSource.DIRECT_UPLOAD,
        status: MediaStatus.PENDING,
      }
    });

    // Upload is always the trigger — the AMAI Engine picks this up
    // regardless of Active/Paused state (Paused only blocks publishing).
    //
    // This used to be a fire-and-forget events.emit('media.uploaded', ...)
    // that returned the HTTP response immediately, without waiting for the
    // AI pipeline to run. Vercel serverless functions can freeze the
    // instance the moment the response is flushed, so the asset regularly
    // got stuck in PROCESSING forever (same class of bug as the earlier
    // "Publish Now" fix — see PublishingService). Awaiting it here
    // synchronously guarantees the pipeline actually completes (or fails
    // cleanly to MediaStatus.FAILED) before this request ends.
    await this.engineService.handleMediaUploaded({ mediaAssetId: asset.id });

    // Re-fetch so the caller sees the real post-pipeline status (READY/
    // SCHEDULED/FAILED) instead of the stale PENDING snapshot from creation.
    return this.prisma.mediaAsset.findUnique({ where: { id: asset.id } });
  }

  /**
   * Self-heals any MediaAsset left stuck in PROCESSING — the only way that
   * can happen now is a hard function kill mid-pipeline (rare, but Vercel
   * gives no completion guarantee), same rationale as
   * PublishingService.publishDuePosts' stale-PUBLISHING sweep. Runs
   * opportunistically whenever the Media Library is loaded, since that's
   * naturally how soon a user notices something looks stuck.
   */
  private async sweepStaleProcessing(brandId: string): Promise<void> {
    const staleCutoff = new Date(Date.now() - STALE_PROCESSING_MINUTES * 60 * 1000);
    const stuck = await this.prisma.mediaAsset.findMany({
      where: { brandId, status: MediaStatus.PROCESSING, updatedAt: { lte: staleCutoff } },
      select: { id: true },
      take: SWEEP_MAX_ITEMS,
    });
    for (const asset of stuck) {
      await this.engineService.handleMediaUploaded({ mediaAssetId: asset.id });
    }
  }

  async deleteAsset(brandId: string, assetId: string) {
    const asset = await this.prisma.mediaAsset.findFirst({ where: { id: assetId, brandId } });
    if (!asset) throw new NotFoundException('Media asset not found.');

    if (asset.blobUrl) {
      await this.storage.deleteFile(asset.blobUrl);
    }
    await this.prisma.mediaAsset.delete({ where: { id: assetId } });
    return { success: true, id: assetId };
  }

  async getAssets(brandId: string, folderId?: string) {
    await this.sweepStaleProcessing(brandId).catch(() => {});

    // Projected + capped: the Media Library grid only ever renders these
    // seven fields (not batchId/batchName/relativePath/userId/platform/
    // providerPostId/publishedAt/updatedAt), and an unbounded findMany()
    // would eventually pull the brand's entire upload history on every
    // page load as the library grows. 300 is a generous ceiling for the
    // grid view today; if libraries grow past that this should become
    // real cursor pagination with a "load more" affordance in the UI.
    return this.prisma.mediaAsset.findMany({
      where: {
        brandId,
        folderId: folderId || null,
      },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        blobUrl: true,
        status: true,
        lastErrorMessage: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }

  async createFolder(brandId: string, name: string, parentId?: string) {
    return this.prisma.mediaFolder.create({
      data: {
        brandId,
        name,
        parentId: parentId || null
      }
    });
  }

  async getFolders(brandId: string, parentId?: string) {
    return this.prisma.mediaFolder.findMany({
      where: {
        brandId,
        parentId: parentId || null
      },
      include: {
        _count: {
          select: { assets: true, children: true }
        }
      }
    });
  }
}

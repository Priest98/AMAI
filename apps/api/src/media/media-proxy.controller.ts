import { Controller, Get, NotFoundException, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Streams Oyinca's Vercel Blob storage content through the app's own
 * primary domain (whatever APP_URL is set to -- oyinca.com in production;
 * see app-url.util.ts) itself.
 *
 * Why this exists: TikTok's photo-post endpoint only supports
 * PULL_FROM_URL (see publishTikTokPhoto in publishing.service.ts), which
 * requires verifying, in the TikTok Developer Portal, whatever domain the
 * image URLs actually live on. That domain is Vercel Blob storage
 * (*.public.blob.vercel-storage.com) -- and that domain turns out to be
 * unverifiable there in practice: TikTok's "Verify domains" check expects
 * either a DNS TXT record at the domain root (impossible -- Vercel, not
 * Oyinca, owns vercel-storage.com) or a file reachable at the bare domain
 * root `https://<store>.public.blob.vercel-storage.com/` (confirmed
 * empty/unservable -- Blob storage has no concept of a root "index"
 * document; it only ever responds at a blob's own exact stored pathname).
 * Every filename-convention workaround tried still failed for this reason.
 *
 * The app's own domain, by contrast, is verified with TikTok via the
 * DNS-record method (a tiktok-developers-site-verification=<token> TXT
 * record at the domain's root -- not a hosted file), and per TikTok's own
 * docs, that covers every path under the domain and its subdomains, not
 * just an exact URL. So instead of trying to verify Blob storage directly,
 * this proxies Blob content through a path on the domain that's already
 * verified -- `${getAppUrl()}/api/media/proxy/<same-pathname-blob-was-
 * stored-at>` fetches and streams back the matching blob.
 * publishTikTokPhoto rewrites photo URLs to this form before calling
 * TikTok's API.
 *
 * NOTE: this domain verification is tied to whatever host APP_URL points
 * at. If APP_URL is ever repointed to a new domain (e.g. a rebrand), that
 * new domain must be re-verified in the TikTok Developer Portal (DNS TXT
 * record) before photo publishing will work again -- verification does
 * NOT carry over automatically from the old domain.
 *
 * Deliberately generic (matches any pathname) rather than validating
 * against known MediaAsset rows, so it keeps working for any current or
 * future blob without a matching code change -- it's a transparent proxy,
 * not an access-control boundary. The underlying blobs are already
 * `access: 'public'` (see storage.service.ts), so this doesn't expose
 * anything that wasn't already publicly fetchable at its original URL.
 */
const BLOB_STORAGE_ORIGIN = 'https://nngbo9dlq90oakni.public.blob.vercel-storage.com';
const ROUTE_PREFIX = '/api/media/proxy/';

@Controller('media')
export class MediaProxyController {
  @Get('proxy/*')
  async proxyBlob(@Req() req: Request, @Res() res: Response) {
    const idx = req.originalUrl.indexOf(ROUTE_PREFIX);
    const suffix = idx >= 0 ? req.originalUrl.slice(idx + ROUTE_PREFIX.length) : '';
    if (!suffix) {
      throw new NotFoundException();
    }

    const upstream = await fetch(`${BLOB_STORAGE_ORIGIN}/${suffix}`);
    if (!upstream.ok || !upstream.body) {
      res.status(upstream.status || 404).end();
      return;
    }

    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream');
    // Blob content is immutable once written (uploads always get a new
    // pathname -- see storage.service.ts's addRandomSuffix: true), so this
    // is safe to cache hard at any layer (browser, CDN, TikTok's own
    // fetcher) between here and the origin.
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.send(buffer);
  }
}

import { Controller, Get, Query, UnauthorizedException } from '@nestjs/common';
import { StorageService } from './storage.service';

/**
 * TEMPORARY, single-purpose endpoint: publishes AMAI's TikTok
 * `pull_by_url` domain-ownership verification file to the exact path
 * TikTok's Developer Portal requires, at the root of AMAI's actual Blob
 * storage domain (the domain TikTok's photo-post endpoint really fetches
 * from -- NOT amai.codes). There's no other way to place a file at an
 * exact root-level path on a Vercel Blob store from outside the running
 * app, since the store isn't a filesystem or git repo Claude can push to
 * directly.
 *
 * Gated by a one-off secret hardcoded here (not an env var -- this was
 * never a real, ongoing credential, just a way to keep this call from
 * being trivially guessable while this file exists) rather than any
 * production secret, so completing this never required reading or
 * handling an actual secret from the deployment's environment.
 *
 * DELETE THIS FILE (and its registration in storage.module.ts) once the
 * verification file is confirmed live and TikTok's portal shows the
 * domain as verified -- it serves no purpose afterward and is scoped
 * narrowly on purpose so leaving it briefly live carries minimal risk.
 */
const ONE_OFF_SECRET = 'atv_9f3kD8qLmZ2xR7vN4pTgY6hWcE1sJb0u';

@Controller('admin/domain-verification')
export class DomainVerificationController {
  constructor(private readonly storageService: StorageService) {}

  @Get('tiktok-pull-by-url')
  async publishTikTokVerificationFile(@Query('secret') secret?: string) {
    if (secret !== ONE_OFF_SECRET) {
      throw new UnauthorizedException();
    }

    // First attempt (tiktok<token>.txt, matching the file TikTok's portal
    // gave us for a previous, different domain) failed TikTok's own
    // verification check ("couldn't find your verification signature").
    // We were never given this run's actual generated filename -- only the
    // file's text content -- so rather than guess wrong again, publish the
    // same content under every naming convention TikTok's portal is known
    // to have used (confirmed from this project's own history: earlier,
    // pre-this-session attempts at a different domain left behind files
    // named tiktok<token>.txt, <token>.txt (no prefix),
    // tiktok-developers-site-verification-<token>.{txt,html}, and
    // tiktok-developers-site-verification.{txt,html} -- six real prior
    // attempts, meaning this exact ambiguity has already been fought
    // through by trial and error once before). Uploading all of them at
    // once means whichever one TikTok's crawler actually requests will be
    // there, without another round trip.
    const token = 'hl0174gO61jMXCuPajZIsNQpsSPJ3osx';
    const signature = `tiktok-developers-site-verification=${token}`;
    const htmlBody = `<html><head><meta name="tiktok-developers-site-verification" content="${token}" /></head><body>${signature}</body></html>`;

    const candidates: Array<{ pathname: string; content: string; contentType: string }> = [
      { pathname: `tiktok${token}.txt`, content: `${signature}\n`, contentType: 'text/plain' },
      { pathname: `${token}.txt`, content: `${signature}\n`, contentType: 'text/plain' },
      { pathname: `tiktok-developers-site-verification-${token}.txt`, content: `${signature}\n`, contentType: 'text/plain' },
      { pathname: `tiktok-developers-site-verification-${token}.html`, content: htmlBody, contentType: 'text/html' },
      { pathname: 'tiktok-developers-site-verification.txt', content: `${signature}\n`, contentType: 'text/plain' },
      { pathname: 'tiktok-developers-site-verification.html', content: htmlBody, contentType: 'text/html' },
    ];

    const results = await Promise.all(
      candidates.map(async (c) => {
        const { url } = await this.storageService.uploadExact(c.pathname, c.content, c.contentType);
        return { pathname: c.pathname, url };
      }),
    );

    return { success: true, uploaded: results };
  }
}

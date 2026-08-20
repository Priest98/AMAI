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

    const { url } = await this.storageService.uploadExact(
      'tiktokhl0174gO61jMXCuPajZIsNQpsSPJ3osx.txt',
      'tiktok-developers-site-verification=hl0174gO61jMXCuPajZIsNQpsSPJ3osx\n',
      'text/plain',
    );

    return { success: true, url };
  }
}

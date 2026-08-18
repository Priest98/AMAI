import { Controller, Post, Body, Logger, Get, Query, Req, Headers, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { WebhooksService } from './webhooks.service';
import { Platform } from '@prisma/client';
import * as crypto from 'crypto';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  @Get('instagram')
  verifyInstagramWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string
  ) {
    const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN;
    if (!verifyToken) {
      this.logger.error('WEBHOOK_VERIFY_TOKEN env variable is not set!');
      throw new UnauthorizedException('Webhook verify token not configured');
    }

    if (mode === 'subscribe' && token === verifyToken) {
      this.logger.log('Instagram webhook verification successful');
      return challenge;
    }

    this.logger.warn('Instagram webhook verification failed — token mismatch');
    throw new UnauthorizedException('Invalid verification token');
  }

  /**
   * Fixed during the V2 full-system audit: this used to declare the
   * x-hub-signature-256 header as a parameter and never actually verify
   * it -- @Body() gave a pre-parsed object with no way to recover the
   * exact bytes Meta signed, so verification was structurally impossible
   * even if someone had wired up the HMAC check. Anyone could POST a
   * forged "new comment" payload and it would be processed as genuine
   * (an AI reply generated via Gemini, a PendingCommentReply row created).
   * Now requires the raw body (see backendPort.ts's express.raw() wiring
   * for this exact path) and verifies HMAC-SHA256 over those raw bytes
   * using META_APP_SECRET, per Meta's documented signature scheme --
   * https://developers.facebook.com/docs/messenger-platform/webhooks#security
   * -- with a timing-safe comparison so response-time can't leak the
   * correct signature byte-by-byte.
   */
  @Post('instagram')
  @HttpCode(HttpStatus.OK)
  async handleInstagramWebhook(
    @Req() req: Request,
    @Headers('x-hub-signature-256') signature?: string,
  ) {
    this.logger.log(`Instagram Webhook Hit!`);

    const rawBody = req.body;
    if (!Buffer.isBuffer(rawBody)) {
      this.logger.error('Instagram webhook received a non-Buffer body -- raw-body middleware is not wired correctly for this path.');
      return { success: false };
    }

    const appSecret = process.env.META_APP_SECRET;
    if (!appSecret) {
      this.logger.error('META_APP_SECRET is not set -- cannot verify webhook authenticity, refusing to process.');
      return { success: false };
    }
    if (!signature || !signature.startsWith('sha256=')) {
      this.logger.warn('Instagram webhook rejected: missing or malformed x-hub-signature-256 header.');
      throw new UnauthorizedException('Missing signature.');
    }
    const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
    const provided = Buffer.from(signature);
    const expectedBuf = Buffer.from(expected);
    if (provided.length !== expectedBuf.length || !crypto.timingSafeEqual(provided, expectedBuf)) {
      this.logger.warn('Instagram webhook rejected: signature mismatch.');
      throw new UnauthorizedException('Invalid signature.');
    }

    let body: any;
    try {
      body = JSON.parse(rawBody.toString('utf8'));
    } catch {
      this.logger.warn('Instagram webhook rejected: body is not valid JSON.');
      return { success: false };
    }

    if (body.object === 'instagram') {
      for (const entry of body.entry || []) {
        const platformAccountId = entry.id;
        for (const change of entry.changes || []) {
          if (change.field === 'comments') {
            const commentData = change.value;
            
            await this.webhooksService.processIncomingComment(
              Platform.INSTAGRAM,
              platformAccountId,
              commentData.media_id,
              commentData.id,
              commentData.text,
              "Caption not provided in webhook"
            );
          }
        }
      }
    }
    
    return { success: true };
  }

  /**
   * Fixed (was a known, explicitly-flagged gap): previously had zero
   * signature verification at all, so anyone could POST a forged
   * "new comment" payload and it would be processed as genuine -- same
   * exposure the Instagram handler above had before its own fix. Not fixed
   * alongside that one originally because TikTok's signing scheme wasn't
   * confirmed; now implemented per TikTok's own documented spec
   * (https://developers.tiktok.com/doc/webhooks-verification):
   *
   *   header:  Tiktok-Signature: t=<unix_seconds>,s=<hex_hmac_sha256>
   *   signed_payload = `${t}.${raw_json_body}`
   *   signature = HMAC-SHA256(key = app's TikTok client_secret, signed_payload)
   *
   * Reuses TIKTOK_CLIENT_SECRET -- already present and load-bearing for the
   * OAuth token exchange elsewhere (oauth.service.ts, publishing.service.ts)
   * -- rather than a new secret, per TikTok's own spec (the signing key IS
   * the app's client secret). Requires the raw body, same as Instagram: see
   * backendPort.ts's express.raw() wiring for this exact path. Also checks
   * the timestamp isn't stale, per TikTok's own documented replay-attack
   * guidance ("if the signature is valid but the timestamp is too old, you
   * can have your application reject the payload").
   */
  @Post('tiktok')
  @HttpCode(HttpStatus.OK)
  async handleTikTokWebhook(
    @Req() req: Request,
    @Headers('tiktok-signature') signatureHeader?: string,
  ) {
    this.logger.log(`TikTok Webhook Hit!`);

    const rawBody = req.body;
    if (!Buffer.isBuffer(rawBody)) {
      this.logger.error('TikTok webhook received a non-Buffer body -- raw-body middleware is not wired correctly for this path.');
      return { success: false };
    }

    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
    if (!clientSecret) {
      this.logger.error('TIKTOK_CLIENT_SECRET is not set -- cannot verify webhook authenticity, refusing to process.');
      return { success: false };
    }
    if (!signatureHeader) {
      this.logger.warn('TikTok webhook rejected: missing Tiktok-Signature header.');
      throw new UnauthorizedException('Missing signature.');
    }

    // "t=<ts>,s=<sig>" -- order isn't guaranteed by the spec, parse both
    // by prefix rather than assuming position.
    const parts = Object.fromEntries(
      signatureHeader.split(',').map((p) => {
        const idx = p.indexOf('=');
        return [p.slice(0, idx).trim(), p.slice(idx + 1).trim()];
      }),
    );
    const timestamp = parts['t'];
    const providedSignature = parts['s'];
    if (!timestamp || !providedSignature) {
      this.logger.warn('TikTok webhook rejected: malformed Tiktok-Signature header.');
      throw new UnauthorizedException('Malformed signature header.');
    }

    // Replay-attack guard, per TikTok's own documented recommendation.
    // 5 minutes is generous slack for normal delivery latency/clock skew
    // while still closing the door on a captured-and-replayed request.
    const TOLERANCE_SECONDS = 5 * 60;
    const tsNum = Number(timestamp);
    if (!Number.isFinite(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > TOLERANCE_SECONDS) {
      this.logger.warn('TikTok webhook rejected: timestamp missing or outside tolerance window.');
      throw new UnauthorizedException('Stale or invalid timestamp.');
    }

    const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`;
    const expected = crypto.createHmac('sha256', clientSecret).update(signedPayload).digest('hex');
    const provided = Buffer.from(providedSignature);
    const expectedBuf = Buffer.from(expected);
    if (provided.length !== expectedBuf.length || !crypto.timingSafeEqual(provided, expectedBuf)) {
      this.logger.warn('TikTok webhook rejected: signature mismatch.');
      throw new UnauthorizedException('Invalid signature.');
    }

    let body: any;
    try {
      body = JSON.parse(rawBody.toString('utf8'));
    } catch {
      this.logger.warn('TikTok webhook rejected: body is not valid JSON.');
      return { success: false };
    }

    if (body.type === 'comment.created') {
       const platformAccountId = body.creator_id;
       await this.webhooksService.processIncomingComment(
         Platform.TIKTOK,
         platformAccountId,
         body.video_id,
         body.comment_id,
         body.comment_text,
         "TikTok video caption"
       );
    }
    return { success: true };
  }
}

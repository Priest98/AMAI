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

  // KNOWN GAP, flagged during the V2 full-system audit, NOT fixed here:
  // this endpoint has no signature verification at all, so anyone can POST
  // a forged comment payload. Not fixed alongside the Instagram handler
  // above because TikTok's webhook-signing scheme isn't the same
  // documented x-hub-signature-256 HMAC as Meta's, and guessing at the
  // wrong scheme would produce false confidence (a check that looks like
  // security but verifies nothing). Needs TikTok's actual webhook
  // signature documentation before this can be implemented correctly --
  // see https://developers.tiktok.com/doc/webhooks-overview for the
  // current spec, then mirror the Instagram handler's raw-body +
  // timing-safe-compare pattern once the exact header/algorithm is known.
  @Post('tiktok')
  @HttpCode(HttpStatus.OK)
  async handleTikTokWebhook(@Body() body: any) {
    this.logger.log(`TikTok Webhook Hit!`);
    
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

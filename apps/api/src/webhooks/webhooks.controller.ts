import { Controller, Post, Body, Logger, Get, Query, Headers, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { Platform } from '@marketing-os/database';
import * as crypto from 'crypto';


@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  // ==========================================
  // INSTAGRAM WEBHOOKS
  // ==========================================

  /**
   * Facebook/Instagram requires a GET endpoint for the initial webhook challenge verification.
   */
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
   * The actual POST endpoint where Meta sends the live event data.
   * We validate the X-Hub-Signature-256 header to ensure the payload is authentic.
   */
  @Post('instagram')
  @HttpCode(HttpStatus.OK)
  async handleInstagramWebhook(
    @Body() body: any,
    @Headers('x-hub-signature-256') signature: string
  ) {
    this.logger.log(`Instagram Webhook Hit!`);

    // Validate the signature from Meta to prevent spoofed webhook events
    const appSecret = process.env.INSTAGRAM_APP_SECRET;
    if (appSecret && signature) {
      const expectedSig = 'sha256=' + crypto
        .createHmac('sha256', appSecret)
        .update(JSON.stringify(body))
        .digest('hex');
      if (signature !== expectedSig) {
        this.logger.warn('Instagram webhook signature mismatch — rejecting request');
        throw new UnauthorizedException('Invalid webhook signature');
      }
    } else if (appSecret && !signature) {
      this.logger.warn('Instagram webhook received without signature header — rejecting');
      throw new UnauthorizedException('Missing webhook signature');
    }

    // Basic parsing logic matching standard Meta webhook payload structure
    if (body.object === 'instagram') {
      for (const entry of body.entry || []) {
        const platformAccountId = entry.id; // The Instagram Account ID
        for (const change of entry.changes || []) {
          if (change.field === 'comments') {
            const commentData = change.value;
            
            await this.webhooksService.processIncomingComment(
              Platform.INSTAGRAM,
              platformAccountId,
              commentData.media_id,
              commentData.id,
              commentData.text,
              "Caption not provided in webhook" // Meta webhooks don't include original caption
            );
          }
        }
      }
    }
    
    // Always return 200 OK fast to acknowledge receipt
    return { success: true };
  }


  // ==========================================
  // TIKTOK WEBHOOKS
  // ==========================================

  @Post('tiktok')
  @HttpCode(HttpStatus.OK)
  async handleTikTokWebhook(@Body() body: any) {
    this.logger.log(`TikTok Webhook Hit!`);
    
    // TikTok comment webhook parsing
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


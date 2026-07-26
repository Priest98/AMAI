import { Controller, Post, Body, Logger, Get, Query, Headers, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
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

  @Post('instagram')
  @HttpCode(HttpStatus.OK)
  async handleInstagramWebhook(
    @Body() body: any,
    @Headers('x-hub-signature-256') signature: string
  ) {
    this.logger.log(`Instagram Webhook Hit!`);

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

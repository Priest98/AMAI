import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EncryptionModule } from './encryption/encryption.module';
import { StorageModule } from './storage/storage.module';
import { MediaModule } from './media/media.module';
import { PostsModule } from './posts/posts.module';
import { QueueModule } from './queue/queue.module';
import { AiModule } from './ai/ai.module';
import { EngineModule } from './engine/engine.module';
import { GrowthModule } from './growth/growth.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { OAuthModule } from './oauth/oauth.module';
import { BusinessBrainModule } from './business-brain/business-brain.module';
import { BillingModule } from './billing/billing.module';
import { BrandsModule } from './brands/brands.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),
    EventEmitterModule.forRoot(),
    PrismaModule, AuthModule, EncryptionModule, StorageModule, MediaModule, PostsModule, QueueModule, AiModule, EngineModule, GrowthModule, WebhooksModule, OAuthModule, BusinessBrainModule, BillingModule, BrandsModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    }
  ],
})
export class AppModule {}



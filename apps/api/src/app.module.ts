import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { EncryptionModule } from './encryption/encryption.module';
import { BrandsModule } from './brands/brands.module';
import { SocialAccountsModule } from './social-accounts/social-accounts.module';
import { StorageModule } from './storage/storage.module';
import { MediaModule } from './media/media.module';
import { PostsModule } from './posts/posts.module';
import { QueueModule } from './queue/queue.module';
import { AiModule } from './ai/ai.module';
import { AutoPilotModule } from './autopilot/autopilot.module';
import { GrowthModule } from './growth/growth.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),
    PrismaModule, AuthModule, OrganizationsModule, EncryptionModule, BrandsModule, SocialAccountsModule, StorageModule, MediaModule, PostsModule, QueueModule, AiModule, AutoPilotModule, GrowthModule, WebhooksModule
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

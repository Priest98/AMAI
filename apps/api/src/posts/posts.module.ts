import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { EngineModule } from '../engine/engine.module';
import { QueueModule } from '../queue/queue.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [EngineModule, QueueModule, BillingModule],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}

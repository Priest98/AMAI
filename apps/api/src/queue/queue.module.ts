import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PublisherWorker } from './publisher.worker';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        lazyConnect: true,
        enableOfflineQueue: false,
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
        retryStrategy: () => null,
      },
    }),
    BullModule.registerQueue({
      name: 'publish-queue',
    }),
  ],
  providers: [PublisherWorker],
  exports: [BullModule],
})
export class QueueModule {}

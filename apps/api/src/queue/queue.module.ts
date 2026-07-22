import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PublisherWorker } from './publisher.worker';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
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

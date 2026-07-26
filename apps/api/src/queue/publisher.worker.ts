import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { ReplyStatus as TargetStatus, Platform } from '@prisma/client';

@Processor('publish-queue')
export class PublisherWorker extends WorkerHost {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService
  ) {
    super();
  }

  async process(job: Job<{ postTargetId: string }>) {
    console.log(`Processing job ${job.id}`);
  }
}

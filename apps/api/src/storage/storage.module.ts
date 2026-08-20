import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { DomainVerificationController } from './domain-verification.controller';

@Global()
@Module({
  controllers: [DomainVerificationController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}

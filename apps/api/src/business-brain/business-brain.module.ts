import { Module } from '@nestjs/common';
import { BusinessBrainService } from './business-brain.service';
import { BusinessBrainController } from './business-brain.controller';

@Module({
  controllers: [BusinessBrainController],
  providers: [BusinessBrainService],
  exports: [BusinessBrainService],
})
export class BusinessBrainModule {}

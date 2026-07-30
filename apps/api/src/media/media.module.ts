import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { EngineModule } from '../engine/engine.module';

@Module({
  imports: [EngineModule],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}

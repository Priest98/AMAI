import { Module } from '@nestjs/common';
import { MarketingController } from './marketing.controller';
import { MarketingService } from './marketing.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TelegramModule } from '../common/telegram.module';

@Module({
  imports: [PrismaModule, TelegramModule],
  controllers: [MarketingController],
  providers: [MarketingService],
  exports: [MarketingService],
})
export class MarketingModule {}

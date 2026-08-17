import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ErrorsController } from './errors.controller';
import { ErrorsService } from './errors.service';
import { LogsController } from './logs.controller';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';
import { ErrorCaptureService } from '../common/error-capture.service';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  controllers: [AdminController, ErrorsController, LogsController, AuditLogController, CustomersController],
  providers: [AdminService, ErrorsService, AuditLogService, ErrorCaptureService, CustomersService],
  // ErrorCaptureService is retrieved via app.get() in main.ts to build the
  // global exception filter, which runs outside Nest's normal DI-resolved
  // controller/provider graph (see SentryExceptionFilter's constructor).
  exports: [ErrorCaptureService],
})
export class AdminModule {}

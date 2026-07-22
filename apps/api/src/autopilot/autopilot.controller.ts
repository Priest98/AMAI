import { Controller, Post, Param, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AutoPilotService } from './autopilot.service';

@Controller('autopilot')
export class AutoPilotController {
  constructor(private readonly autopilotService: AutoPilotService) {}

  @Post('ingest/:webhookToken')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (req, file, cb) => {
      // Only allow images and videos
      if (file.mimetype.match(/\/(jpg|jpeg|png|gif|mp4|mov|quicktime)$/)) {
        cb(null, true);
      } else {
        cb(new BadRequestException(`Unsupported file type ${file.originalname}`), false);
      }
    }
  }))
  async handleWebhookUpload(
    @Param('webhookToken') webhookToken: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded. Form field must be named "file".');
    }

    // Verify token and process file
    return this.autopilotService.processWebhookUpload(webhookToken, file);
  }
}

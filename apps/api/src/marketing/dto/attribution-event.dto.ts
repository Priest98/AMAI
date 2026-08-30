import { IsString, IsOptional } from 'class-validator';

export class AttributionEventDto {
  @IsString()
  sessionId!: string;

  @IsString()
  eventType!: string;

  @IsOptional()
  @IsString()
  utmSource?: string;

  @IsOptional()
  @IsString()
  utmMedium?: string;

  @IsOptional()
  @IsString()
  utmCampaign?: string;

  @IsOptional()
  @IsString()
  referrerUrl?: string;

  @IsString()
  landingPage!: string;

  @IsOptional()
  @IsString()
  signupId?: string;

  @IsOptional()
  @IsString()
  creatorAppId?: string;
}

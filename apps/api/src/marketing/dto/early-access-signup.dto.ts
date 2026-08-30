import { IsString, IsEmail, IsOptional } from 'class-validator';

export class EarlyAccessSignupDto {
  @IsString()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  tiktokUsername!: string;

  @IsOptional()
  @IsString()
  tiktokProfileUrl?: string;

  @IsString()
  followerRange!: string;

  @IsString()
  niche!: string;

  @IsString()
  postingFrequency!: string;

  @IsString()
  country!: string;

  @IsString()
  biggestProblem!: string;

  @IsString()
  automationWish!: string;

  @IsString()
  heardFrom!: string;

  @IsOptional()
  @IsString()
  preferredNextPlatform?: string;

  @IsOptional()
  @IsString()
  referralCode?: string;

  @IsOptional()
  @IsString()
  utmSource?: string;

  @IsOptional()
  @IsString()
  utmMedium?: string;

  @IsOptional()
  @IsString()
  utmCampaign?: string;
}

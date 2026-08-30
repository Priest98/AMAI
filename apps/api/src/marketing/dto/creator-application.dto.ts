import { IsString, IsEmail, IsOptional, IsArray, IsInt, Min } from 'class-validator';

export class CreatorApplicationDto {
  @IsString()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  country!: string;

  @IsString()
  preferredContact!: string;

  @IsString()
  tiktokUsername!: string;

  @IsString()
  tiktokProfileUrl!: string;

  @IsString()
  followerRange!: string;

  @IsOptional()
  @IsString()
  averageViews?: string;

  @IsString()
  postingFrequency!: string;

  @IsString()
  niche!: string;

  @IsInt()
  @Min(1)
  accountsManagedCount!: number;

  @IsArray()
  @IsString({ each: true })
  sampleVideoUrls!: string[];

  @IsString()
  currentWorkflow!: string;

  @IsString()
  timeConsumingPart!: string;

  @IsInt()
  @Min(1)
  videosPerWeek!: number;

  @IsOptional()
  @IsString()
  usesExistingTools?: string;

  @IsString()
  whyJoin!: string;

  @IsString()
  biggestProblem!: string;

  @IsString()
  workflowToRemove!: string;

  @IsString()
  willingToTest7Days!: string;

  @IsString()
  willingAutopilotChallenge!: string;

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

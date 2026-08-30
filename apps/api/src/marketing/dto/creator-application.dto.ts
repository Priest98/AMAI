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

  @IsOptional()
  @IsString()
  tiktokProfileUrl?: string;

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

  @IsOptional()
  @IsString()
  whyJoin?: string;

  @IsOptional()
  @IsString()
  biggestProblem?: string;

  @IsOptional()
  @IsString()
  workflowToRemove?: string;

  @IsString()
  willingToTest7Days!: string;

  @IsString()
  willingAutopilotChallenge!: string;

  @IsOptional()
  @IsString()
  videoParticipation?: string;

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

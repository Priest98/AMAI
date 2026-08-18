import { IsEnum, IsISO8601, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ScheduleStartOption, SchedulingPlatform } from '@prisma/client';

// Security audit fix (4.1): same rationale as posts/dto.ts.
//
// Note: every field below needs at least one class-validator decorator even
// when the "real" validation is loose/none, because the global
// ValidationPipe runs with `whitelist: true` -- a property with zero
// decorators isn't just unvalidated, it's silently *stripped* before the
// service ever sees it. @IsOptional() alone is enough to keep a field
// present while still allowing it to be entirely absent.

export class UpdateEngineConfigDto {
  @IsOptional()
  @IsString()
  defaultTone?: string;
}

export class UpdatePostingScheduleDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  postsPerDay?: number;

  @IsOptional()
  @IsEnum(ScheduleStartOption)
  scheduleStartFrom?: ScheduleStartOption;

  // `string | null` in the original inline type -- null explicitly clears a
  // custom start date. @IsOptional() short-circuits validation for both
  // null and undefined, so this still accepts null while keeping the field
  // in the whitelist and validating any actual string as ISO-8601.
  @IsOptional()
  @IsISO8601()
  customStartDate?: string | null;

  @IsOptional()
  @IsString()
  timeZone?: string;

  @IsOptional()
  @IsEnum(SchedulingPlatform)
  schedulingPlatform?: SchedulingPlatform;
}

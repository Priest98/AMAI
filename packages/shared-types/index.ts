export class RegisterDto {
  email!: string;
  password!: string;
  name!: string;
}

export class LoginDto {
  email!: string;
  password!: string;
}

export class CreateOrganizationDto {
  name!: string;
  slug!: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string | null;
}

export interface OrganizationResponse {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
}

export interface CreateBrandDto {
  name: string;
  industry?: string;
  timezone?: string;
}

export interface BrandResponse {
  id: string;
  name: string;
  organizationId: string;
  logo: string | null;
  colors: string | null;
  timezone: string;
  industry: string | null;
}

export interface ConnectSocialAccountDto {
  platform: 'INSTAGRAM' | 'FACEBOOK' | 'X' | 'LINKEDIN' | 'TIKTOK';
  platformAccountId: string;
  accessToken: string;
  refreshToken?: string;
  metadata?: any;
}

export class SocialAccountResponse {
  id!: string;
  platform!: string;
  platformAccountId!: string;
  metadata!: any | null;
  status!: 'CONNECTED' | 'EXPIRED';
  createdAt!: string;
}

export class UpdateGrowthSettingsDto {
  autoReplyComments?: boolean;
  commentTone?: string;
  optimizeHashtags?: boolean;
}

export class PendingCommentReplyResponse {
  id!: string;
  brandId!: string;
  platform!: string;
  platformAccountId!: string;
  originalPostId!: string;
  originalCommentId!: string;
  originalCommentText!: string;
  aiGeneratedReply!: string;
  status!: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';
  createdAt!: string;
}

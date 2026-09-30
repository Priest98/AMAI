import type { PlanEntitlements } from '../billing/plans.config';

export interface DashboardBootstrap {
  engine: { state: string; approvalMode: string };
  stats: {
    needsApprovalCount: number;
    scheduledCount: number;
    publishedCount: number;
    failedCount: number;
    mediaCount: number;
    pendingPreview: unknown[];
  };
  accounts: { socialAccounts: unknown[]; googleDrive: unknown | null };
  billing: {
    plan: string;
    subscribedPlan: string;
    status: string;
    entitlements: PlanEntitlements;
  };
}

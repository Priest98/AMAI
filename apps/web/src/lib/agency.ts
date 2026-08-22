"use client";

import { apiFetch, getBrandId } from './api';

/**
 * Agency (multi-client) data access.
 *
 * Everything here is org-scoped and read through the same authenticated
 * apiFetch as the rest of the app. Connection objects returned by the API
 * are metadata only -- access and refresh tokens never cross the boundary
 * (see apps/api/src/oauth/connection-health.ts), so nothing in this file
 * can expose a credential.
 */

export type ConnectionHealth =
  | 'CONNECTED'
  | 'EXPIRING_SOON'
  | 'REAUTH_REQUIRED'
  | 'DISCONNECTED'
  | 'UNKNOWN';

export interface PublicConnection {
  id: string;
  platform: 'INSTAGRAM' | 'TIKTOK' | 'FACEBOOK' | 'LINKEDIN' | 'TWITTER' | 'YOUTUBE' | string;
  accountName: string | null;
  health: ConnectionHealth;
  expiresAt: string | null;
  daysUntilExpiry: number | null;
  needsReauth: boolean;
}

export interface PortfolioClient {
  id: string;
  name: string;
  industry: string | null;
  logo: string | null;
  lastActivityAt: string;
  autopilotState: string | null;
  approvalMode: string | null;
  connections: PublicConnection[];
  connectionIssueCount: number;
  scheduledCount: number;
  awaitingApprovalCount: number;
  publishingTodayCount: number;
}

export interface Portfolio {
  clientCount: number;
  totals: {
    scheduled: number;
    awaitingApproval: number;
    publishingToday: number;
    connectionIssues: number;
  };
  clients: PortfolioClient[];
}

/**
 * The JWT doesn't carry organizationId, so it's resolved from whichever
 * brand the session currently has. Cached by apiFetch, so the extra hop is
 * effectively free after the first call.
 */
export async function getOrganizationId(): Promise<string> {
  const { organizationId } = await apiFetch<{ organizationId: string }>(
    `/brands/${getBrandId()}/organization`,
  );
  return organizationId;
}

export async function getPortfolio(): Promise<Portfolio> {
  const organizationId = await getOrganizationId();
  return apiFetch<Portfolio>(`/organizations/${organizationId}/portfolio`);
}

export async function listClients(): Promise<{ id: string; name: string; industry: string | null }[]> {
  const organizationId = await getOrganizationId();
  return apiFetch(`/organizations/${organizationId}/brands`);
}

export async function createClient(name: string): Promise<{ id: string; name: string }> {
  const organizationId = await getOrganizationId();
  return apiFetch(`/organizations/${organizationId}/brands`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

// ---- Cross-client aggregations -----------------------------------------

export interface AgencyQueuePost {
  id: string;
  caption: string;
  hashtags: string[];
  scheduledAt: string | null;
  createdAt: string;
  clientId: string;
  clientName: string;
  platforms: string[];
  thumbnailUrl: string | null;
}

export async function getAgencyApprovalQueue(): Promise<{ total: number; posts: AgencyQueuePost[] }> {
  const organizationId = await getOrganizationId();
  return apiFetch(`/organizations/${organizationId}/approval-queue`);
}

export interface AgencyCalendarPost {
  id: string;
  status: string;
  scheduledAt: string | null;
  caption: string;
  clientId: string;
  clientName: string;
  platforms: string[];
}

export async function getAgencyCalendar(days = 30): Promise<{ from: string; to: string; posts: AgencyCalendarPost[] }> {
  const organizationId = await getOrganizationId();
  return apiFetch(`/organizations/${organizationId}/calendar?days=${days}`);
}

export interface AgencyAnalytics {
  windowDays: number;
  since: string;
  totals: { published: number; failed: number; scheduled: number; awaitingApproval: number; clients: number };
  /** Metrics Oyinca cannot measure yet. The UI must say so rather than render a misleading zero. */
  unavailableMetrics: string[];
  perClient: {
    clientId: string;
    clientName: string;
    published: number;
    failed: number;
    scheduled: number;
    awaitingApproval: number;
  }[];
}

export async function getAgencyAnalytics(days = 30): Promise<AgencyAnalytics> {
  const organizationId = await getOrganizationId();
  return apiFetch(`/organizations/${organizationId}/analytics?days=${days}`);
}

// ---- P1 agency team/roles foundation -----------------------------------

export interface OrgMember {
  membershipId: string;
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'CREATOR' | 'EDITOR' | 'CLIENT' | 'VIEWER';
  memberSince: string;
  userId: string;
  email: string;
  name: string;
  avatar: string | null;
  lastLogin: string | null;
}

/** Read-only today -- see BrandsService.listMembers's doc comment for why invite/edit isn't built yet. */
export async function getOrgMembers(): Promise<OrgMember[]> {
  const organizationId = await getOrganizationId();
  return apiFetch(`/organizations/${organizationId}/members`);
}

/** Presentation metadata for each health state. Kept in one place so the dashboard, clients list and switcher can't drift. */
export const HEALTH_META: Record<ConnectionHealth, { label: string; tone: 'ok' | 'warn' | 'error' | 'muted' }> = {
  CONNECTED: { label: 'Connected', tone: 'ok' },
  EXPIRING_SOON: { label: 'Expires soon', tone: 'warn' },
  REAUTH_REQUIRED: { label: 'Reconnect required', tone: 'error' },
  DISCONNECTED: { label: 'Disconnected', tone: 'error' },
  UNKNOWN: { label: 'Status unknown', tone: 'muted' },
};

export function healthColor(tone: 'ok' | 'warn' | 'error' | 'muted'): string {
  switch (tone) {
    case 'ok': return 'var(--accent-success)';
    case 'warn': return 'var(--accent-warning)';
    case 'error': return 'var(--accent-error)';
    default: return 'var(--text-muted)';
  }
}

/** Human phrasing for a countdown, derived from the real expiry rather than a fixed string. */
export function expiryLabel(c: PublicConnection): string | null {
  if (c.health === 'REAUTH_REQUIRED') return 'Reconnect required';
  if (c.daysUntilExpiry == null) return null;
  if (c.daysUntilExpiry === 0) return 'Expires today';
  if (c.daysUntilExpiry === 1) return 'Expires tomorrow';
  return `Expires in ${c.daysUntilExpiry} days`;
}

import { ConnectionStatus, Platform } from '@prisma/client';

/**
 * Connection health, derived rather than stored.
 *
 * The schema's ConnectionStatus enum only has CONNECTED | EXPIRED, and a
 * stored status column would go stale the moment a token crossed its
 * expiry without anything writing to the row. So health is computed from
 * the real `tokenExpiresAt` on every read instead of being persisted and
 * backfilled. That means:
 *   - no migration and no backfill of existing rows
 *   - a connection can never report CONNECTED after it has actually lapsed
 *   - nothing invents an expiry the platform did not give us
 *
 * Platform behaviour is deliberately not guessed at. Where a platform hands
 * us an expiry we use it; where it doesn't (`tokenExpiresAt` null) we report
 * UNKNOWN rather than assuming the token is fine or assuming it is broken.
 */
export type ConnectionHealth =
  | 'CONNECTED'
  | 'EXPIRING_SOON'
  | 'REAUTH_REQUIRED'
  | 'DISCONNECTED'
  | 'UNKNOWN';

/**
 * How far ahead of expiry a connection starts warning. Overridable via env
 * so this is not a magic number buried in code, and so the threshold can be
 * widened if a publishing cadence needs more lead time.
 *
 * The default is 3 days: long enough that a warning is seen before a
 * weekend, short enough that it isn't permanently amber.
 */
export const EXPIRY_WARNING_DAYS = Number(process.env.CONNECTION_EXPIRY_WARNING_DAYS || 3);

export interface ConnectionHealthResult {
  health: ConnectionHealth;
  /** Null when the platform gave us no expiry, or the token has already lapsed. */
  daysUntilExpiry: number | null;
  expiresAt: Date | null;
  /** True when the user must complete an OAuth flow again; drives the Reconnect affordance. */
  needsReauth: boolean;
}

/**
 * Derives health for one connection. Takes only the fields it needs, never
 * the token itself, so it is impossible to accidentally leak a credential
 * through this path.
 */
export function deriveConnectionHealth(conn: {
  status: ConnectionStatus;
  tokenExpiresAt: Date | null;
  refreshToken?: string | null;
}, now: Date = new Date()): ConnectionHealthResult {
  // An explicitly EXPIRED row is authoritative: something (a failed publish,
  // a refresh attempt) already established the connection is dead.
  if (conn.status === ConnectionStatus.EXPIRED) {
    return { health: 'REAUTH_REQUIRED', daysUntilExpiry: null, expiresAt: conn.tokenExpiresAt, needsReauth: true };
  }

  if (!conn.tokenExpiresAt) {
    // No expiry from the platform. Long-lived or non-expiring token; report
    // honestly rather than fabricating a countdown.
    return { health: 'UNKNOWN', daysUntilExpiry: null, expiresAt: null, needsReauth: false };
  }

  const msRemaining = conn.tokenExpiresAt.getTime() - now.getTime();

  if (msRemaining <= 0) {
    return { health: 'REAUTH_REQUIRED', daysUntilExpiry: 0, expiresAt: conn.tokenExpiresAt, needsReauth: true };
  }

  const daysUntilExpiry = Math.floor(msRemaining / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry <= EXPIRY_WARNING_DAYS) {
    // A refresh token means AMAI may be able to renew this without the user,
    // so it is a warning rather than a hard "you must reconnect".
    return {
      health: 'EXPIRING_SOON',
      daysUntilExpiry,
      expiresAt: conn.tokenExpiresAt,
      needsReauth: !conn.refreshToken,
    };
  }

  return { health: 'CONNECTED', daysUntilExpiry, expiresAt: conn.tokenExpiresAt, needsReauth: false };
}

/**
 * The safe shape to hand the frontend: metadata only. Access and refresh
 * tokens are deliberately absent from this type, so a connection can be
 * serialised into an API response without a token ever crossing the
 * boundary.
 */
export interface PublicConnection {
  id: string;
  platform: Platform;
  accountName: string | null;
  health: ConnectionHealth;
  expiresAt: Date | null;
  daysUntilExpiry: number | null;
  needsReauth: boolean;
}

export function toPublicConnection(conn: {
  id: string;
  platform: Platform;
  metadata: string | null;
  status: ConnectionStatus;
  tokenExpiresAt: Date | null;
  refreshToken?: string | null;
}, now: Date = new Date()): PublicConnection {
  const h = deriveConnectionHealth(conn, now);

  // metadata is a JSON string in this schema; the handle/username lives in
  // there. Parsing is best-effort -- a malformed blob must not break the
  // health response for every other connection.
  let accountName: string | null = null;
  try {
    const meta = conn.metadata ? JSON.parse(conn.metadata) : null;
    accountName = meta?.username || meta?.handle || meta?.name || null;
  } catch {
    accountName = null;
  }

  return {
    id: conn.id,
    platform: conn.platform,
    accountName,
    health: h.health,
    expiresAt: h.expiresAt,
    daysUntilExpiry: h.daysUntilExpiry,
    needsReauth: h.needsReauth,
  };
}

/** True when at least one connection needs the user's attention. Drives the portfolio-level "N connection issues" figure. */
export function needsAttention(health: ConnectionHealth): boolean {
  return health === 'EXPIRING_SOON' || health === 'REAUTH_REQUIRED' || health === 'DISCONNECTED';
}

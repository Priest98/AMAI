/** Shared page/limit query-param parsing for admin list endpoints. */
export const ADMIN_MAX_LIMIT = 100;
export const ADMIN_DEFAULT_LIMIT = 25;

export function parsePage(value: string | undefined): number {
  const n = value ? parseInt(value, 10) : 1;
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function parseLimit(value: string | undefined, defaultLimit = ADMIN_DEFAULT_LIMIT): number {
  const n = value ? parseInt(value, 10) : defaultLimit;
  if (!Number.isFinite(n) || n <= 0) return defaultLimit;
  return Math.min(n, ADMIN_MAX_LIMIT);
}

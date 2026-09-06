const ALWAYS_BLOCKED = [
  /^\/login(?:\/|$)/,
  /^\/register(?:\/|$)/,
  /^\/forgot-password(?:\/|$)/,
  /^\/reset-password(?:\/|$)/,
  /^\/verify-email(?:\/|$)/,
  /^\/dashboard(?:\/|$)/,
  /^\/api(?:\/|$)/,
];

const DEFAULT_PUBLIC_ALLOWLIST = ['/', '/pricing', '/privacy', '/terms'];

export interface ReplayDecision { allowed: boolean; reason: 'disabled' | 'sensitive_route' | 'not_allowlisted' | 'allowed'; }

export function replayDecision(pathname: string): ReplayDecision {
  if (process.env.NEXT_PUBLIC_SESSION_REPLAY_ENABLED !== 'true') return { allowed: false, reason: 'disabled' };
  const cleanPath = pathname.split('?')[0].split('#')[0] || '/';
  if (ALWAYS_BLOCKED.some((pattern) => pattern.test(cleanPath))) return { allowed: false, reason: 'sensitive_route' };
  const configured = (process.env.NEXT_PUBLIC_SESSION_REPLAY_ALLOWED_PATHS || '')
    .split(',').map((path) => path.trim()).filter(Boolean);
  const allowlist = configured.length ? configured : DEFAULT_PUBLIC_ALLOWLIST;
  const allowed = allowlist.some((path) => cleanPath === path || (path !== '/' && cleanPath.startsWith(`${path}/`)));
  return allowed ? { allowed: true, reason: 'allowed' } : { allowed: false, reason: 'not_allowlisted' };
}


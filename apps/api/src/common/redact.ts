/**
 * Shared secret-redaction helper for anything that captures raw
 * request/error data for storage or display (ErrorEvent.context,
 * ErrorEvent.stackTrace, and any future admin-surfaced payload dump).
 *
 * Two passes: key-name based (catches secrets regardless of value shape --
 * a field literally called `password` or `apiKey` is redacted no matter
 * what it contains) and value-pattern based (catches secrets that leak
 * into fields with innocuous names, e.g. a stack trace line containing a
 * raw connection string or bearer token). Mirrors the same patterns used
 * for this repo's manual pre-commit secret scan (sk_live/sk_test_/AIza/
 * postgres:// with embedded credentials/PEM blocks) plus a few more that
 * are specific to runtime data (Authorization headers, JWTs, generic
 * long hex/base64 tokens attached to a "token"/"secret"/"key" key).
 */

const SENSITIVE_KEY_PATTERN =
  /(password|passwd|secret|token|api[-_]?key|apikey|authorization|auth|cookie|session|private[-_]?key|access[-_]?key|client[-_]?secret|refresh[-_]?token|dsn)/i;

const VALUE_PATTERNS: RegExp[] = [
  /sk_live_[a-zA-Z0-9]+/g,
  /sk_test_[a-zA-Z0-9]+/g,
  /AIza[0-9A-Za-z\-_]{20,}/g,
  /postgres(?:ql)?:\/\/[^\s@]+:[^\s@]+@[^\s/]+/gi,
  /-----BEGIN[\s\S]+?-----END[^\n]*-----/g,
  /Bearer\s+[A-Za-z0-9\-_.]+/g,
  /eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g, // JWT-shaped
];

const REDACTED = '[REDACTED]';
const MAX_DEPTH = 6;

function redactString(value: string): string {
  let result = value;
  for (const pattern of VALUE_PATTERNS) {
    result = result.replace(pattern, REDACTED);
  }
  return result;
}

/**
 * Deep-redacts an arbitrary value for safe storage/display. Never throws --
 * a redaction bug must never be the reason an error fails to be captured
 * at all, so anything unexpected (circular refs, exotic types) falls back
 * to a safe placeholder rather than propagating.
 */
export function redactSecrets(value: unknown, depth = 0): unknown {
  try {
    if (depth > MAX_DEPTH) return '[TRUNCATED]';
    if (value === null || value === undefined) return value;

    if (typeof value === 'string') return redactString(value);
    if (typeof value === 'number' || typeof value === 'boolean') return value;

    if (Array.isArray(value)) {
      return value.map((item) => redactSecrets(item, depth + 1));
    }

    if (typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        if (SENSITIVE_KEY_PATTERN.test(key)) {
          out[key] = REDACTED;
        } else {
          out[key] = redactSecrets(val, depth + 1);
        }
      }
      return out;
    }

    return String(value);
  } catch {
    return '[REDACTION_FAILED]';
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ResolvedKey {
  /** Env var name, e.g. "GROQ_API_KEY_2" -- used as the stable identity for
   *  health tracking. Never the raw secret. */
  label: string;
  value: string;
}

interface KeyHealthState {
  consecutiveFailures: number;
  disabledUntil: number | null; // epoch ms
}

// A key that fails this many times in a row gets temporarily benched
// rather than tried again on the very next request -- this is what keeps
// a single dead/expired key from eating one failed call out of every
// round-robin cycle forever.
const FAILURE_THRESHOLD = 3;
// Generic transient failure (network blip, 500, one-off timeout): short
// cooldown, worth retrying soon.
const TRANSIENT_COOLDOWN_MS = 5 * 60 * 1000;
// Rate-limit / daily-quota style failure: the key is good, it's just
// spent for a while -- no point retrying it again in the next few
// minutes, so bench it until the next UTC day instead.
const QUOTA_COOLDOWN_MS = 12 * 60 * 60 * 1000;

/**
 * Multi-key round robin + failover for providers that support it (Groq
 * today). Discovers every configured key for a provider from environment
 * variables, distributes requests across them round-robin, and benches a
 * key that's failing repeatedly instead of letting it eat one out of every
 * N requests forever.
 *
 * Health state is cached in memory for the life of the serverless
 * instance (cheap, no per-call DB round trip) and mirrored to
 * AiProviderKeyHealth so a key benched for hitting its daily quota stays
 * benched across cold starts too, rather than every fresh Lambda instance
 * re-discovering the same 429 from scratch. DB reads/writes here are
 * always best-effort and non-blocking on the write side -- a Postgres
 * hiccup must never be able to slow down or break an AI call, it can only
 * make key-health tracking slightly less accurate for a while.
 */
@Injectable()
export class ApiKeyManagerService {
  private readonly logger = new Logger(ApiKeyManagerService.name);
  private readonly health = new Map<string, KeyHealthState>(); // keyed by `${provider}:${label}`
  private readonly roundRobinIndex = new Map<string, number>(); // keyed by provider
  private readonly loadedFromDb = new Set<string>(); // providers whose DB state has been synced this instance

  constructor(private prisma: PrismaService) {}

  /**
   * All configured keys for a provider, in stable order. Supports up to 10
   * numbered env vars (GROQ_API_KEY, GROQ_API_KEY_2..GROQ_API_KEY_10) plus
   * an optional GROQ_API_KEYS comma-separated list, deduped by value so the
   * same key pasted twice doesn't get double weight in the round robin.
   */
  discoverKeys(provider: string): ResolvedKey[] {
    const prefix = provider.toUpperCase() + '_API_KEY';
    const found: ResolvedKey[] = [];
    const seenValues = new Set<string>();

    const tryAdd = (label: string, value: string | undefined) => {
      if (!value || value === 'placeholder') return;
      if (seenValues.has(value)) return;
      seenValues.add(value);
      found.push({ label, value });
    };

    tryAdd(prefix, process.env[prefix]);
    for (let i = 2; i <= 10; i++) {
      tryAdd(`${prefix}_${i}`, process.env[`${prefix}_${i}`]);
    }
    const bulk = process.env[`${provider.toUpperCase()}_API_KEYS`];
    if (bulk) {
      bulk.split(',').map((k) => k.trim()).filter(Boolean).forEach((value, i) => {
        tryAdd(`${prefix}S_${i + 1}`, value);
      });
    }

    return found;
  }

  /**
   * Returns the next key to try for this provider, preferring healthy
   * (not-currently-disabled) keys in round-robin order. If every key is
   * currently disabled, fails open and returns the one closest to
   * recovering rather than refusing the provider outright -- a slightly
   * stale "disabled" flag shouldn't take a whole provider offline when it
   * might have just recovered.
   */
  async getNextKey(provider: string): Promise<ResolvedKey | null> {
    const keys = this.discoverKeys(provider);
    if (keys.length === 0) return null;

    await this.ensureLoadedFromDb(provider, keys);

    const now = Date.now();
    const healthy = keys.filter((k) => {
      const state = this.health.get(`${provider}:${k.label}`);
      return !state?.disabledUntil || state.disabledUntil <= now;
    });

    const pool = healthy.length > 0 ? healthy : keys;
    const idx = (this.roundRobinIndex.get(provider) ?? 0) % pool.length;
    this.roundRobinIndex.set(provider, idx + 1);
    return pool[idx];
  }

  reportSuccess(provider: string, label: string): void {
    this.health.set(`${provider}:${label}`, { consecutiveFailures: 0, disabledUntil: null });
    this.persist(provider, label, { success: true }).catch(() => {});
  }

  reportFailure(provider: string, label: string, errorMessage: string): void {
    const key = `${provider}:${label}`;
    const prev = this.health.get(key) ?? { consecutiveFailures: 0, disabledUntil: null };
    const consecutiveFailures = prev.consecutiveFailures + 1;

    let disabledUntil: number | null = prev.disabledUntil;
    if (consecutiveFailures >= FAILURE_THRESHOLD) {
      const isQuotaLike = /rate.?limit|quota|429|too many requests/i.test(errorMessage);
      disabledUntil = Date.now() + (isQuotaLike ? QUOTA_COOLDOWN_MS : TRANSIENT_COOLDOWN_MS);
      this.logger.warn(
        `Key ${label} (${provider}) disabled until ${new Date(disabledUntil).toISOString()} after ${consecutiveFailures} consecutive failures: ${errorMessage}`,
      );
    }

    this.health.set(key, { consecutiveFailures, disabledUntil });
    this.persist(provider, label, { success: false, errorMessage, disabledUntil }).catch(() => {});
  }

  /** Loads persisted health state once per provider per warm instance. */
  private async ensureLoadedFromDb(provider: string, keys: ResolvedKey[]): Promise<void> {
    if (this.loadedFromDb.has(provider)) return;
    this.loadedFromDb.add(provider); // mark eagerly so a DB failure can't retry-storm every call

    try {
      const rows = await this.prisma.aiProviderKeyHealth.findMany({
        where: { provider, keyLabel: { in: keys.map((k) => k.label) } },
      });
      for (const row of rows) {
        this.health.set(`${provider}:${row.keyLabel}`, {
          consecutiveFailures: row.consecutiveFailures,
          disabledUntil: row.disabledUntil ? row.disabledUntil.getTime() : null,
        });
      }
    } catch (error: any) {
      this.logger.warn(`Could not load key health from DB for ${provider}, starting fresh this instance: ${error?.message || error}`);
    }
  }

  private async persist(
    provider: string,
    label: string,
    opts: { success: boolean; errorMessage?: string; disabledUntil?: number | null },
  ): Promise<void> {
    try {
      await this.prisma.aiProviderKeyHealth.upsert({
        where: { provider_keyLabel: { provider, keyLabel: label } },
        create: {
          provider,
          keyLabel: label,
          consecutiveFailures: opts.success ? 0 : 1,
          totalRequests: 1,
          totalErrors: opts.success ? 0 : 1,
          disabledUntil: opts.disabledUntil ? new Date(opts.disabledUntil) : null,
          lastUsedAt: new Date(),
          lastErrorMessage: opts.errorMessage || null,
        },
        update: {
          consecutiveFailures: opts.success ? 0 : { increment: 1 },
          totalRequests: { increment: 1 },
          totalErrors: opts.success ? undefined : { increment: 1 },
          disabledUntil: opts.success ? null : opts.disabledUntil ? new Date(opts.disabledUntil) : undefined,
          lastUsedAt: new Date(),
          lastErrorMessage: opts.success ? null : opts.errorMessage || undefined,
        },
      });
    } catch {
      // Best-effort only -- see class doc comment. In-memory state (already
      // set by the caller before this fires) is what actually governs
      // routing for the rest of this instance's life either way.
    }
  }
}

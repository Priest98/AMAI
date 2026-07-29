import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Always force pgbouncer-safe connection params onto DATABASE_URL, no matter
// what's configured in the hosting dashboard. Supabase's pooled connection
// (transaction-mode pgbouncer, port 6543) does not support prepared
// statements — without `pgbouncer=true` Prisma will intermittently reuse
// prepared-statement names across serverless invocations sharing the same
// pooled backend connection, producing Postgres error 42P05 ("prepared
// statement already exists"). Normalizing here means a missing/incorrect
// query string in the env var can never silently break production again.
function buildPooledDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return raw;

  try {
    const url = new URL(raw);
    url.searchParams.set('pgbouncer', 'true');
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', '1');
    }
    return url.toString();
  } catch {
    // Not a parseable URL (shouldn't happen) — fall back to the raw value
    // rather than crash the whole app at boot.
    return raw;
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const url = buildPooledDatabaseUrl();
    super(url ? { datasources: { db: { url } } } : undefined);
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

const { spawnSync } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');

const databaseUrl = process.env.DATABASE_URL || '';
const directUrl = process.env.DIRECT_URL || databaseUrl.replace(':6543/', ':5432/');

if (!directUrl) {
  console.error('DIRECT_URL and DATABASE_URL are not configured.');
  process.exit(1);
}

const prismaCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const schemaArgs = ['--schema', 'apps/api/prisma/schema.prisma'];

function runPrisma(args) {
  const result = spawnSync(prismaCommand, ['prisma', ...args], {
    cwd: process.cwd(),
    env: { ...process.env, DIRECT_URL: directUrl },
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function main() {
  const client = new PrismaClient({ datasources: { db: { url: directUrl } } });
  try {
    const rows = await client.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('_prisma_migrations', 'MarketIntelligenceSnapshot', 'BrainDecision')
    `;
    const tables = new Set(rows.map((row) => row.table_name));

    if (!tables.has('_prisma_migrations')) {
      const baseline = [
        ['MarketIntelligenceSnapshot', '20260906153000_market_intelligence_snapshot'],
        ['BrainDecision', '20260906203000_brain_decision'],
      ];
      for (const [table, migration] of baseline) {
        if (!tables.has(table)) {
          throw new Error(`Cannot baseline ${migration}: expected production table ${table} is missing.`);
        }
        runPrisma(['migrate', 'resolve', '--applied', migration, ...schemaArgs]);
      }
    }
  } finally {
    await client.$disconnect();
  }

  runPrisma(['migrate', 'deploy', ...schemaArgs]);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

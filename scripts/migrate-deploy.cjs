const { spawnSync } = require('node:child_process');

const databaseUrl = process.env.DATABASE_URL || '';
const directUrl = process.env.DIRECT_URL || databaseUrl.replace(':6543/', ':5432/');

if (!directUrl) {
  console.error('DIRECT_URL and DATABASE_URL are not configured.');
  process.exit(1);
}

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['prisma', 'migrate', 'deploy', '--schema', 'apps/api/prisma/schema.prisma'],
  {
    cwd: process.cwd(),
    env: { ...process.env, DIRECT_URL: directUrl },
    stdio: 'inherit',
  },
);

process.exit(result.status ?? 1);

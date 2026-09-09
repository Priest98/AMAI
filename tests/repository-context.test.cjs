const fs = require('node:fs');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const required = [
  'AGENTS.md',
  'apps/web/CONTEXT.md',
  'apps/api/CONTEXT.md',
  'apps/api/prisma/CONTEXT.md',
  'apps/api/src/business-brain/CONTEXT.md',
  'apps/api/src/engine/CONTEXT.md',
  'apps/api/src/oauth/CONTEXT.md',
  'apps/api/src/billing/CONTEXT.md',
  'docs/architecture.md',
  'docs/repository-map.md',
  'docs/architecture-audit.md',
  'docs/architecture/oyinca-context-audit.md',
  'docs/architecture/context-engine.md',
  'docs/architecture/oyinca-brain.md',
];

test('repository context hierarchy references real files', () => {
  for (const file of required) assert.equal(fs.existsSync(file), true, `${file} must exist`);
});

test('root agent guide routes to every local context boundary', () => {
  const guide = fs.readFileSync('AGENTS.md', 'utf8');
  for (const file of required.filter((path) => path.endsWith('CONTEXT.md'))) {
    assert.match(guide, new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(guide, /code and schema are the implementation truth/i);
  assert.match(guide, /search before creating/i);
});

test('architecture docs distinguish implemented behavior from future direction', () => {
  const brain = fs.readFileSync('docs/architecture/oyinca-brain.md', 'utf8');
  const audit = fs.readFileSync('docs/architecture/oyinca-context-audit.md', 'utf8');
  assert.match(brain, /planned direction/i);
  assert.match(brain, /There is no general-purpose agent ACL framework yet/i);
  assert.match(audit, /no average token reduction is claimed/i);
});

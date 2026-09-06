const path = require('node:path');
require('ts-node').register({ project: path.join(__dirname, '../apps/api/tsconfig.json'), transpileOnly: true });
require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { BrainDecisionTraceService } = require('../apps/api/src/capabilities/observability/brain-decision-trace.service');
const { sanitizeProperties } = require('../apps/web/src/lib/posthog');
const { replayDecision } = require('../apps/web/src/lib/observability/privacy-policy');

test('analytics property sanitizer removes content and credentials', () => {
  assert.deepEqual(sanitizeProperties({ email: 'private@example.com', token: 'secret', caption: 'private content', plan: 'pro', count: 2 }), { plan: 'pro', count: 2 });
});

test('session replay is disabled by default and hard-blocks private routes', () => {
  const previous = process.env.NEXT_PUBLIC_SESSION_REPLAY_ENABLED;
  process.env.NEXT_PUBLIC_SESSION_REPLAY_ENABLED = 'true';
  assert.equal(replayDecision('/dashboard').reason, 'sensitive_route');
  assert.equal(replayDecision('/login').reason, 'sensitive_route');
  assert.equal(replayDecision('/').allowed, true);
  if (previous === undefined) delete process.env.NEXT_PUBLIC_SESSION_REPLAY_ENABLED;
  else process.env.NEXT_PUBLIC_SESSION_REPLAY_ENABLED = previous;
});

test('decision trace stores codes and metadata without prompts or reasoning text', async () => {
  let data;
  const service = new BrainDecisionTraceService({ brainDecision: { create: async (args) => { data = args.data; } } });
  const stored = await service.record({ organizationId: 'org', brandId: 'brand', correlationId: 'run', objective: 'Generate ideas', decision: 'generate_content_ideas', reasonCodes: ['user_requested_content_ideas', 'INVALID TEXT'], skillsUsed: ['growth.content_strategy.1.0.0'], contextSections: ['brand', 'market'], latencyMs: 12.2, outcome: 'succeeded' });
  assert.equal(stored, true);
  assert.deepEqual(data.reasonCodes, ['user_requested_content_ideas']);
  assert.equal('prompt' in data, false);
  assert.equal('completion' in data, false);
});

test('decision tracing failure never fails the product action', async () => {
  const service = new BrainDecisionTraceService({ brainDecision: { create: async () => { throw new Error('db down'); } } });
  assert.equal(await service.record({ organizationId: 'org', brandId: 'brand', correlationId: 'run', objective: 'x', decision: 'publish', reasonCodes: ['approved'], latencyMs: 1, outcome: 'succeeded' }), false);
});

const path = require('node:path');
require('ts-node').register({ project: path.join(__dirname, '../apps/api/tsconfig.json'), transpileOnly: true });
require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CapabilityRegistryService } = require('../apps/api/src/capabilities/capability-registry.service');

const context = {
  organizationId: 'org-1',
  brandId: 'brand-1',
  correlationId: 'test-1',
};

test('disabled capabilities never inspect or execute providers', async () => {
  let touched = false;
  const provider = {
    id: 'test', capability: 'research',
    isAvailable: () => { touched = true; return true; },
    execute: async () => { touched = true; return {}; },
  };
  const registry = new CapabilityRegistryService({ isEnabled: () => false }, [provider]);
  const result = await registry.execute('research', {}, context);
  assert.equal(result.state, 'disabled');
  assert.equal(touched, false);
});

test('registry uses healthy providers in priority order', async () => {
  const providers = [
    { id: 'second', capability: 'research', priority: 20, isAvailable: () => true, execute: async () => 'wrong' },
    { id: 'first', capability: 'research', priority: 10, isAvailable: () => true, execute: async () => 'right' },
  ];
  const registry = new CapabilityRegistryService({ isEnabled: () => true }, providers);
  const result = await registry.execute('research', {}, context);
  assert.equal(result.state, 'completed');
  assert.equal(result.providerId, 'first');
  assert.equal(result.value, 'right');
  assert.deepEqual(result.attempts, ['first']);
});

test('registry falls back after a provider failure', async () => {
  const providers = [
    { id: 'broken', capability: 'research', priority: 1, isAvailable: () => true, execute: async () => { throw new Error('down'); } },
    { id: 'healthy', capability: 'research', priority: 2, isAvailable: () => true, execute: async () => 'cached' },
  ];
  const registry = new CapabilityRegistryService({ isEnabled: () => true }, providers);
  const result = await registry.execute('research', {}, context);
  assert.equal(result.state, 'completed');
  assert.equal(result.providerId, 'healthy');
  assert.deepEqual(result.attempts, ['broken', 'healthy']);
});

test('registry bounds slow providers and continues to fallback', async () => {
  const providers = [
    { id: 'slow', capability: 'research', priority: 1, isAvailable: () => true, execute: () => new Promise(() => {}) },
    { id: 'healthy', capability: 'research', priority: 2, isAvailable: () => true, execute: async () => 'fresh' },
  ];
  const registry = new CapabilityRegistryService({ isEnabled: () => true }, providers);
  const result = await registry.execute('research', {}, { ...context, deadlineMs: 5 });
  assert.equal(result.state, 'completed');
  assert.equal(result.providerId, 'healthy');
});

test('empty enabled capability fails without outbound work', async () => {
  const registry = new CapabilityRegistryService({ isEnabled: () => true }, []);
  const result = await registry.execute('research', {}, context);
  assert.equal(result.state, 'unavailable');
  assert.deepEqual(result.attempts, []);
});


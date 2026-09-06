const path = require('node:path');
require('ts-node').register({ project: path.join(__dirname, '../apps/api/tsconfig.json'), transpileOnly: true });
require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ResearchCacheService } = require('../apps/api/src/capabilities/research/research-cache.service');
const { MarketIntelligenceService } = require('../apps/api/src/capabilities/research/market-intelligence.service');
const { assertMarketIntelligence } = require('../apps/api/src/capabilities/research/research.types');

const context = { organizationId: 'org-1', brandId: 'brand-1', correlationId: 'run-1' };
const intelligence = {
  topic: 'fashion creators', timeWindow: '30d', trends: [], audienceQuestions: [],
  contentPatterns: [], competitorSignals: [], opportunities: [], confidence: 0.7,
  sources: [{ url: 'https://example.com/post', title: 'Post', platform: 'web', capturedAt: '2026-09-06T12:00:00.000Z' }],
  generatedAt: '2026-09-06T12:00:00.000Z', expiresAt: '2026-09-07T12:00:00.000Z',
};

test('cache hash is stable across unordered platform and competitor inputs', () => {
  const cache = new ResearchCacheService({});
  const a = cache.queryHash({ topic: ' Fashion ', platforms: ['TikTok', 'Instagram'], competitorHandles: ['B', 'a'] });
  const b = cache.queryHash({ topic: 'fashion', platforms: ['instagram', 'tiktok'], competitorHandles: ['A', 'b'] });
  assert.equal(a, b);
});

test('fresh cache prevents provider execution and stays tenant scoped', async () => {
  let executed = false;
  const cache = {
    queryHash: () => 'hash',
    read: async (org, brand, hash, stale) => {
      assert.equal(org, 'org-1'); assert.equal(brand, 'brand-1'); assert.equal(hash, 'hash'); assert.equal(stale, false);
      return { intelligence, stale: false };
    },
  };
  const service = new MarketIntelligenceService({ execute: async () => { executed = true; } }, cache);
  const result = await service.research({ topic: 'fashion' }, context);
  assert.equal(result.state, 'cached');
  assert.equal(executed, false);
});

test('provider outage degrades to stale intelligence', async () => {
  let reads = 0;
  const cache = {
    queryHash: () => 'hash',
    read: async () => ++reads === 1 ? null : { intelligence, stale: true },
  };
  const service = new MarketIntelligenceService({ execute: async () => ({ state: 'failed' }) }, cache);
  const result = await service.research({ topic: 'fashion' }, context);
  assert.equal(result.state, 'stale');
  assert.equal(result.intelligence.topic, 'fashion creators');
});

test('invalid or insecure provider output is rejected', () => {
  assert.throws(() => assertMarketIntelligence({ ...intelligence, confidence: 2 }), /confidence/);
  assert.throws(() => assertMarketIntelligence({ ...intelligence, sources: [{ ...intelligence.sources[0], url: 'http://example.com' }] }), /HTTPS/);
});

test('research requires tenant and brand context', async () => {
  const service = new MarketIntelligenceService({}, {});
  await assert.rejects(service.research({ topic: 'fashion' }, { organizationId: '', correlationId: 'x' }), /requires organization/);
});


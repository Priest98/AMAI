const path = require('node:path');
require('ts-node').register({ project: path.join(__dirname, '../apps/api/tsconfig.json'), transpileOnly: true });
require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AiService } = require('../apps/api/src/ai/ai.service');
const { PublishingService } = require('../apps/api/src/queue/publishing.service');
const { MediaService } = require('../apps/api/src/media/media.service');
const { MetricsService } = require('../apps/api/src/metrics/metrics.service');

test('AI outage cannot produce or log a successful generic caption', async () => {
  let logged = false;
  const service = new AiService({ aiUsageLog: { create: () => { logged = true; return Promise.resolve(); } } }, { generate: async () => null });
  await assert.rejects(service.generateCaption('brand', 'user', 'shirt', 'TikTok', 'Fashion'), /temporarily unavailable/);
  assert.equal(logged, false);
});

test('empty caption after formatting cleanup fails closed', async () => {
  const service = new AiService({}, { generate: async () => ({ text: 'Caption: ' }) });
  await assert.rejects(service.generateCaption('brand', 'user', 'shirt', 'TikTok', 'Fashion'), /temporarily unavailable/);
});

test('a sibling still publishing prevents finalization and media deletion', async () => {
  const prisma = { postTarget: { count: async ({ where }) => {
    assert.deepEqual(where.status.in, ['PENDING', 'PUBLISHING']);
    return 1;
  } } };
  await new PublishingService(prisma).finalizeIfComplete('post', 'TIKTOK', 'id', 'asset');
});

test('partial success preserves originals for failed destinations', async () => {
  let updated;
  const prisma = {
    postTarget: { count: async ({ where }) => typeof where.status === 'object' ? 0 : 1 },
    post: { update: async (args) => { updated = args.data.status; } },
  };
  await new PublishingService(prisma).finalizeIfComplete('post', 'TIKTOK', 'id', 'asset');
  assert.equal(updated, 'PUBLISHED');
});

test('TikTok acceptance does not delete media before asynchronous processing', async () => {
  let assetUpdate;
  let deleted = false;
  const prisma = {
    postTarget: { count: async ({ where }) => where.platform === 'TIKTOK' || where.status === 'PUBLISHED' ? 1 : 0 },
    post: { update: async () => ({}) },
    postMedia: { findMany: async () => [{ assetId: 'asset' }] },
    mediaAsset: {
      findMany: async () => [{ id: 'asset', blobUrl: 'https://example.com/image.png' }],
      updateMany: async ({ data }) => { assetUpdate = data; },
    },
  };
  await new PublishingService(prisma, {}, { deleteFile: async () => { deleted = true; } }).finalizeIfComplete('post', 'TIKTOK', 'job', 'asset');
  assert.equal(assetUpdate.blobUrl, undefined);
  assert.equal(deleted, false);
});

test('unreadable upload bytes do not create a record or delete the source', async () => {
  const url = 'https://store.public.blob.vercel-storage.com/mine/file.png';
  const service = new MediaService({ mediaAsset: { findFirst: async () => null } }, {
    inspectUpload: async () => ({ url, pathname: 'mine/file.png', size: 999, contentType: 'image/png' }),
  });
  service.fetchLeadingBytes = async () => null;
  await assert.rejects(service.registerUploadedAsset('mine', { url, mimeType: 'image/png', filename: 'file.png', size: 1 }), /Unable to verify/);
});

test('registration rejects another brand before storage lookup or deletion', async () => {
  const service = new MediaService({}, {});
  await assert.rejects(service.registerUploadedAsset('mine', {
    url: 'https://store.public.blob.vercel-storage.com/other/file.png',
    mimeType: 'image/png', filename: 'file.png', size: 1,
  }), /does not belong/);
});

test('storage quota uses authoritative bytes, not the claimed upload size', async () => {
  let charged;
  const url = 'https://store.public.blob.vercel-storage.com/mine/file.png';
  const service = new MediaService({ mediaAsset: { findFirst: async () => null } }, {
    inspectUpload: async () => ({ url, pathname: 'mine/file.png', size: 999, contentType: 'image/png' }),
  });
  service.fetchLeadingBytes = async () => Buffer.from([137,80,78,71,13,10,26,10]);
  service.assertWithinStorageLimit = async (_, bytes) => { charged = bytes; };
  service.createAssetRecord = async (_, dto) => dto;
  const asset = await service.registerUploadedAsset('mine', { url, mimeType: 'image/png', filename: 'file.png', size: 1 });
  assert.equal(charged, 999);
  assert.equal(asset.size, 999);
});

test('TikTok job ID resolves to video ID before engagement matching', async (t) => {
  let savedId;
  let snapshots;
  const prisma = {
    socialAccount: { findUnique: async () => ({ platform: 'TIKTOK' }) },
    postTarget: { update: async ({ data }) => { savedId = data.providerPostId; } },
    postPerformance: { createMany: async ({ data }) => { snapshots = data; } },
  };
  t.mock.method(global, 'fetch', async () => ({ ok: true, json: async () => ({ error: { code: 'ok' }, data: { publicaly_available_post_id: ['123456'] } }) }));
  const service = new MetricsService(prisma, {}, { ensureFreshAccessToken: async () => 'test-token' });
  service.fetchTikTokVideoPage = async () => ({ videos: [{ id: '123456', view_count: 42 }], hasMore: false });
  assert.equal(await service.syncOneAccount('account', new Map([['v_pub_job', 'target']])), 1);
  assert.equal(savedId, '123456');
  assert.equal(snapshots[0].views, 42);
  assert.equal(snapshots[0].postTargetId, 'target');
});

test('TikTok HTTP 200 API errors are reported as errors', async (t) => {
  t.mock.method(global, 'fetch', async () => ({ ok: true, json: async () => ({ error: { code: 'access_token_invalid' } }) }));
  await assert.rejects(new MetricsService().fetchTikTokVideoPage('test-token'), /access_token_invalid/);
});

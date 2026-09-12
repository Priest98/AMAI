const path = require('node:path');
const fs = require('node:fs');
const root = path.join(__dirname, '..');
require('ts-node').register({ project: path.join(__dirname, '../apps/api/tsconfig.json'), transpileOnly: true });
require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AiService } = require('../apps/api/src/ai/ai.service');
const { PublishingService } = require('../apps/api/src/queue/publishing.service');
const { MediaService } = require('../apps/api/src/media/media.service');
const { MetricsService } = require('../apps/api/src/metrics/metrics.service');
const { GroqProvider } = require('../apps/api/src/ai-layer/providers/groq.provider');

test('Groq product copy disables reasoning and honors the requested output budget', async (t) => {
  const previousModel = process.env.GROQ_MODEL;
  process.env.GROQ_MODEL = 'qwen/qwen3.6-27b';
  let requestBody;
  t.mock.method(global, 'fetch', async (_url, init) => {
    requestBody = JSON.parse(init.body);
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'Ready caption.' } }], usage: { total_tokens: 24 } }) };
  });
  const result = await new GroqProvider().complete([{ role: 'user', content: 'Write a caption.' }], { maxTokens: 300, timeoutMs: 1_000 }, 'test-key');
  assert.equal(result.text, 'Ready caption.');
  assert.equal(requestBody.reasoning_effort, 'none');
  assert.equal(requestBody.reasoning_format, 'hidden');
  assert.equal(requestBody.max_completion_tokens, 300);
  assert.equal('max_tokens' in requestBody, false);
  if (previousModel === undefined) delete process.env.GROQ_MODEL;
  else process.env.GROQ_MODEL = previousModel;
});

test('caption retry reuses an uploaded failed asset without rerunning video optimization', async () => {
  let pipelineRuns = 0;
  let optimizationRuns = 0;
  const asset = { id: 'asset', brandId: 'brand', status: 'FAILED', linkedPostId: null };
  const service = new MediaService({
    mediaAsset: {
      findFirst: async () => asset,
      findUnique: async () => ({ ...asset, status: 'READY' }),
    },
  }, {}, { handleMediaUploaded: async () => { pipelineRuns++; } }, {}, {});
  service.triggerOptimization = async () => { optimizationRuns++; };
  const result = await service.triggerProcessing('brand', 'asset');
  assert.equal(result.status, 'READY');
  assert.equal(pipelineRuns, 1);
  assert.equal(optimizationRuns, 0);
});

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
  const service = new MetricsService(prisma, {}, {
    ensureFreshAccessToken: async () => 'test-token',
    confirmTikTokPublication: async (_, videoId) => { savedId = videoId; },
  });
  service.fetchTikTokVideoPage = async () => ({ videos: [{ id: '123456', view_count: 42 }], hasMore: false });
  assert.equal(await service.syncOneAccount('account', new Map([['v_pub_job', { targetId: 'target', createdAt: new Date() }]])), 1);
  assert.equal(savedId, '123456');
  assert.equal(snapshots[0].views, 42);
  assert.equal(snapshots[0].postTargetId, 'target');
});

test('TikTok terminal failures and private publish completion leave no target stuck publishing', async (t) => {
  const calls = [];
  const prisma = {
    socialAccount: { findUnique: async () => ({ platform: 'TIKTOK' }) },
    postPerformance: { createMany: async () => {} },
  };
  let status = 'FAILED';
  t.mock.method(global, 'fetch', async () => ({ ok: true, json: async () => ({ error: { code: 'ok' }, data: { status, fail_reason: 'spam_risk' } }) }));
  const publishing = {
    ensureFreshAccessToken: async () => 'test-token',
    failTikTokPublication: async (id, reason) => calls.push(['failed', id, reason]),
    confirmTikTokPublication: async (id, publicId) => calls.push(['published', id, publicId]),
  };
  const service = new MetricsService(prisma, {}, publishing);
  service.fetchTikTokVideoPage = async () => ({ videos: [], hasMore: false });
  const target = { targetId: 'target', createdAt: new Date() };
  await service.syncOneAccount('account', new Map([['v_pub_job', target]]));
  status = 'PUBLISH_COMPLETE';
  await service.syncOneAccount('account', new Map([['v_pub_job_2', target]]));
  assert.deepEqual(calls, [
    ['failed', 'target', 'spam_risk'],
    ['published', 'target', undefined],
  ]);
});

test('TikTok metrics sweep includes processing submissions that do not have publishedAt yet', () => {
  const source = fs.readFileSync(path.join(root, 'apps/api/src/metrics/metrics.service.ts'), 'utf8');
  assert.match(source, /status: \{ in: \[TargetStatus\.PUBLISHING, TargetStatus\.PUBLISHED\] \}/);
  assert.match(source, /\{ status: 'PUBLISHING', createdAt: \{ gte: cutoff \} \}/);
});

test('TikTok HTTP 200 API errors are reported as errors', async (t) => {
  t.mock.method(global, 'fetch', async () => ({ ok: true, json: async () => ({ error: { code: 'access_token_invalid' } }) }));
  await assert.rejects(new MetricsService().fetchTikTokVideoPage('test-token'), /access_token_invalid/);
});

test('marketing administration routes require authenticated platform-admin access', () => {
  const source = fs.readFileSync(path.join(root, 'apps/api/src/marketing/marketing.controller.ts'), 'utf8');
  const adminRoutes = [
    "@Get('admin/stats')",
    "@Get('admin/early-access')",
    "@Get('admin/creators')",
    "@Patch('admin/creators/:id')",
  ];

  for (const route of adminRoutes) {
    const routeIndex = source.indexOf(route);
    assert.notEqual(routeIndex, -1, `${route} should exist`);
    const decoratorWindow = source.slice(Math.max(0, routeIndex - 100), routeIndex);
    assert.match(
      decoratorWindow,
      /@UseGuards\(JwtAuthGuard, PlatformAdminGuard\)/,
      `${route} must require both authentication and platform-admin authorization`,
    );
  }
});

test('Paystack first subscription can associate by verified customer email only when the organization is unambiguous', () => {
  const provider = fs.readFileSync(path.join(root, 'apps/api/src/billing/providers/paystack-provider.service.ts'), 'utf8');
  const billing = fs.readFileSync(path.join(root, 'apps/api/src/billing/billing.service.ts'), 'utf8');
  assert.match(provider, /customerEmail: typeof sub\.customer\?\.email/);
  assert.match(billing, /providerName === 'paystack' && normalized\.customerEmail/);
  assert.match(billing, /take: 2/);
  assert.match(billing, /if \(candidates\.length === 1\)/);
  assert.match(billing, /candidates\.length > 1/);
});

test('email verification and password-reset tokens are hashed before database lookup or storage', () => {
  const source = fs.readFileSync(path.join(root, 'apps/api/src/auth/auth.service.ts'), 'utf8');
  assert.match(source, /hashOneTimeToken\(token: string\)/);
  assert.match(source, /verificationToken: this\.hashOneTimeToken\(verificationToken\)/);
  assert.match(source, /verificationToken: this\.hashOneTimeToken\(dto\.token\)/);
  assert.match(source, /passwordResetToken: this\.hashOneTimeToken\(passwordResetToken\)/);
  assert.match(source, /passwordResetToken: this\.hashOneTimeToken\(dto\.token\)/);
});

test('durable recovery cron processes persisted media jobs and retains daily Vercel backstops for QStash', () => {
  const jobs = fs.readFileSync(path.join(root, 'apps/api/src/engine/engine-jobs.service.ts'), 'utf8');
  const cron = fs.readFileSync(path.join(root, 'apps/api/src/cron/cron.controller.ts'), 'utf8');
  const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  assert.match(jobs, /async processPendingMedia\(\)/);
  assert.match(jobs, /status: MediaStatus\.PENDING/);
  assert.match(cron, /@Get\('process-media'\)/);
  assert.match(cron, /@Post\('process-media'\)/);
  assert.equal(vercel.crons.find((entry) => entry.path === '/api/cron/publish-due')?.schedule, '0 12 * * *');
  assert.equal(vercel.crons.find((entry) => entry.path === '/api/cron/process-media')?.schedule, '30 12 * * *');
});

test('approval edits and rejected generations are persisted as Brain corrections', () => {
  const source = fs.readFileSync(path.join(root, 'apps/api/src/engine/engine.service.ts'), 'utf8');
  assert.match(source, /approval_edit_\$\{postId\}/);
  assert.match(source, /rejected_generation_\$\{postId\}/);
  assert.match(source, /type: MemoryEntryType\.CORRECTION/);
});

test('integration readiness distinguishes connection, approval, testing, and ready state', () => {
  const api = fs.readFileSync(path.join(root, 'apps/api/src/oauth/oauth.service.ts'), 'utf8');
  const ui = fs.readFileSync(path.join(root, 'apps/web/src/app/dashboard/integrations/page.tsx'), 'utf8');
  assert.match(api, /productionApproved:/);
  assert.match(api, /testedAccountIds\.has\(acc\.id\)/);
  assert.match(ui, /Approval pending/);
  assert.match(ui, /Connected · test required/);
  assert.match(ui, /Ready ✓/);
});

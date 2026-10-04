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
const { GeminiProvider } = require('../apps/api/src/ai-layer/providers/gemini.provider');
const { AiProviderRequestError } = require('../apps/api/src/ai-layer/interfaces/ai-provider.interface');
const { AiGatewayService } = require('../apps/api/src/ai-layer/ai-gateway.service');
const { EngineService } = require('../apps/api/src/engine/engine.service');
const { EngineJobsService } = require('../apps/api/src/engine/engine-jobs.service');
const { MAX_VIDEO_ANALYSIS_BYTES, assertSupportedVideoSize } = require('../apps/api/src/media/analysis-limits');

test('Groq product copy disables reasoning and honors the requested output budget', async (t) => {
  const previousModel = process.env.GROQ_MODEL;
  process.env.GROQ_MODEL = 'qwen/qwen3.8-27b';
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

test('retired Groq Qwen model is migrated to its supported multimodal successor', async (t) => {
  const previousModel = process.env.GROQ_MODEL;
  process.env.GROQ_MODEL = 'qwen/qwen3.6-27b';
  let requestBody;
  t.mock.method(global, 'fetch', async (_url, init) => {
    requestBody = JSON.parse(init.body);
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'Ready caption.' } }] }) };
  });
  await new GroqProvider().complete([{ role: 'user', content: 'Write a caption.' }], { maxTokens: 300, timeoutMs: 1_000 }, 'test-key');
  assert.equal(requestBody.model, 'qwen/qwen3.8-27b');
  if (previousModel === undefined) delete process.env.GROQ_MODEL;
  else process.env.GROQ_MODEL = previousModel;
});

test('Groq omits Qwen-only reasoning fields for operator-selected models', async (t) => {
  const previousModel = process.env.GROQ_MODEL;
  process.env.GROQ_MODEL = 'openai/gpt-oss-20b';
  let requestBody;
  t.mock.method(global, 'fetch', async (_url, init) => {
    requestBody = JSON.parse(init.body);
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'Ready caption.' } }] }) };
  });
  await new GroqProvider().complete([{ role: 'user', content: 'Write a caption.' }], { maxTokens: 300, timeoutMs: 1_000 }, 'test-key');
  assert.equal('reasoning_effort' in requestBody, false);
  assert.equal('reasoning_format' in requestBody, false);
  if (previousModel === undefined) delete process.env.GROQ_MODEL;
  else process.env.GROQ_MODEL = previousModel;
});

test('Groq exposes sanitized provider failure metadata without request credentials', async (t) => {
  t.mock.method(global, 'fetch', async () => ({
    ok: false,
    status: 404,
    headers: new Headers({ 'x-request-id': 'req_test' }),
    text: async () => JSON.stringify({ error: { message: 'model retired', type: 'invalid_request_error', code: 'model_not_found' } }),
  }));
  await assert.rejects(
    new GroqProvider().complete([{ role: 'user', content: 'Write a caption.' }], { maxTokens: 300, timeoutMs: 1_000 }, 'secret-test-key'),
    (error) => {
      assert.equal(error instanceof AiProviderRequestError, true);
      assert.equal(error.details.httpStatus, 404);
      assert.equal(error.details.code, 'model_not_found');
      assert.equal(error.details.requestId, 'req_test');
      assert.doesNotMatch(error.message, /secret-test-key/);
      return true;
    },
  );
});

function gatewayWith(groqComplete, geminiComplete) {
  const keyManager = {
    getNextKey: async () => ({ label: 'GROQ_API_KEY', value: 'test-key' }),
    reportSuccess: () => {},
    reportFailure: () => {},
  };
  const groq = {
    name: 'groq', model: 'qwen/qwen3.8-27b', supportsMultipleKeys: true,
    isConfigured: () => true, complete: groqComplete,
  };
  const gemini = {
    name: 'gemini', model: 'gemini-flash-latest', supportsMultipleKeys: false,
    isConfigured: () => true, complete: geminiComplete,
  };
  return new AiGatewayService(keyManager, groq, gemini);
}

test('AI gateway returns Groq success without invoking Gemini', async () => {
  let geminiCalls = 0;
  const gateway = gatewayWith(
    async () => ({ text: 'Groq caption' }),
    async () => { geminiCalls++; return { text: 'Gemini caption' }; },
  );
  const result = await gateway.generate({ label: 'caption generation', maxTokens: 300, messages: [{ role: 'user', content: 'caption' }] });
  assert.equal(result.provider, 'groq');
  assert.equal(result.text, 'Groq caption');
  assert.equal(geminiCalls, 0);
});

test('AI gateway falls back to Gemini after Groq failure', async () => {
  const gateway = gatewayWith(
    async () => { throw new AiProviderRequestError('model retired', { httpStatus: 404, code: 'model_not_found' }); },
    async () => ({ text: 'Gemini caption' }),
  );
  const result = await gateway.generate({ label: 'caption generation', maxTokens: 300, messages: [{ role: 'user', content: 'caption' }] });
  assert.equal(result.provider, 'gemini');
  assert.equal(result.text, 'Gemini caption');
});

test('AI gateway fails closed after every provider fails', async () => {
  const gateway = gatewayWith(
    async () => { throw new Error('Groq unavailable'); },
    async () => { throw new Error('Gemini unavailable'); },
  );
  const result = await gateway.generate({ label: 'caption generation', maxTokens: 300, messages: [{ role: 'user', content: 'caption' }] });
  assert.equal(result, null);
});

test('malformed Groq content package falls through to valid Gemini output', async () => {
  let groqCalls = 0;
  let geminiCalls = 0;
  const gateway = gatewayWith(
    async () => { groqCalls++; return { text: '{"caption":"missing hashtags"}' }; },
    async () => { geminiCalls++; return { text: '{"caption":"Ready.","hashtags":["#Ready"],"confidence":0.8}' }; },
  );
  const validate = (text) => {
    try {
      const value = JSON.parse(text);
      return typeof value.caption === 'string' && value.caption.length > 0 && Array.isArray(value.hashtags) && value.hashtags.length > 0;
    } catch { return false; }
  };
  const result = await gateway.generate({ label: 'content package', maxTokens: 650, validate, messages: [{ role: 'user', content: 'JSON' }] });
  assert.equal(groqCalls, 1);
  assert.equal(geminiCalls, 1);
  assert.equal(result.provider, 'gemini');
});

test('malformed Groq and Gemini content packages fail closed', async () => {
  const gateway = gatewayWith(
    async () => ({ text: 'not json' }),
    async () => ({ text: '{"caption":"still missing hashtags"}' }),
  );
  const validate = (text) => {
    try {
      const value = JSON.parse(text);
      return typeof value.caption === 'string' && Array.isArray(value.hashtags) && value.hashtags.length > 0;
    } catch { return false; }
  };
  const result = await gateway.generate({ label: 'content package', maxTokens: 650, validate, messages: [{ role: 'user', content: 'JSON' }] });
  assert.equal(result, null);
});

test('Gemini propagates maxTokens to the SDK request', async () => {
  const provider = new GeminiProvider();
  let request;
  provider.client = { models: { generateContent: async (value) => { request = value; return { text: 'bounded' }; } } };
  await provider.complete([{ role: 'user', content: 'Answer briefly.' }], { maxTokens: 137, timeoutMs: 1_000 });
  assert.equal(request.config.maxOutputTokens, 137);
  assert.equal(request.config.httpOptions.timeout, 1_000);
  assert.ok(request.config.abortSignal instanceof AbortSignal);
});

test('Gemini deadline aborts the underlying SDK operation', async () => {
  const provider = new GeminiProvider();
  let aborted = false;
  provider.client = { models: { generateContent: ({ config }) => new Promise((_resolve, reject) => {
    config.abortSignal.addEventListener('abort', () => {
      aborted = true;
      reject(config.abortSignal.reason);
    }, { once: true });
  }) } };
  await assert.rejects(
    provider.complete([{ role: 'user', content: 'Never resolves.' }], { maxTokens: 10, timeoutMs: 20 }),
    /timed out after 20ms/,
  );
  assert.equal(aborted, true);
});

test('Groq recognizes comma-separated GROQ_API_KEYS configuration', () => {
  const prior = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^GROQ_API_KEY(?:S|_\d+)?$/.test(key)));
  for (const key of Object.keys(prior)) delete process.env[key];
  process.env.GROQ_API_KEYS = 'first-key, second-key';
  try {
    assert.equal(new GroqProvider().isConfigured(), true);
  } finally {
    delete process.env.GROQ_API_KEYS;
    Object.assign(process.env, prior);
  }
});

test('caption retry queues the existing asset without rerunning optimization', async () => {
  const previous = { token: process.env.QSTASH_TOKEN, secret: process.env.CRON_SECRET, url: process.env.APP_URL, fetch: global.fetch };
  process.env.QSTASH_TOKEN = 'test-token'; process.env.CRON_SECRET = 'test-secret'; process.env.APP_URL = 'https://example.test';
  const deliveries = [];
  global.fetch = async (url, options) => { deliveries.push({ url, options }); return { ok: true }; };
  try {
    const asset = { id: 'asset', brandId: 'brand', status: 'FAILED', linkedPostId: null };
    const service = new MediaService({ mediaAsset: {
      findFirst: async () => asset,
      updateMany: async ({ data }) => { Object.assign(asset, data); return { count: 1 }; },
    } }, {}, {});
    const result = await service.triggerProcessing('brand', 'asset');
    assert.equal(result.status, 'PENDING');
    assert.equal(result.processingStage, 'QUEUED');
    assert.equal(deliveries.length, 1);
    assert.match(deliveries[0].url, /process-media\/asset$/);
    assert.match(deliveries[0].options.headers['Upstash-Flow-Control-Value'], /parallelism=1/);
  } finally {
    global.fetch = previous.fetch;
    for (const [key, value] of [['QSTASH_TOKEN', previous.token], ['CRON_SECRET', previous.secret], ['APP_URL', previous.url]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
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

test('email signup creates the account only after pending verification succeeds', () => {
  const schema = fs.readFileSync(path.join(root, 'apps/api/prisma/schema.prisma'), 'utf8');
  const source = fs.readFileSync(path.join(root, 'apps/api/src/auth/auth.service.ts'), 'utf8');
  const register = source.slice(source.indexOf('async register'), source.indexOf('async verifyEmail'));
  const activation = source.slice(source.indexOf('activatePendingRegistration'), source.indexOf('private escapeEmailText'));
  assert.match(schema, /model PendingRegistration/);
  assert.match(schema, /passwordHash String/);
  assert.match(schema, /tokenHash\s+String\s+@unique/);
  assert.match(register, /pendingRegistration\.upsert/);
  assert.doesNotMatch(register, /user\.create/);
  assert.match(activation, /emailVerified: true/);
  assert.match(activation, /tx\.user\.create/);
  assert.match(activation, /tx\.organization\.create/);
  assert.match(activation, /tx\.pendingRegistration\.delete/);
});

test('transactional email failures cannot masquerade as successful signup delivery', () => {
  const email = fs.readFileSync(path.join(root, 'apps/api/src/email/email.service.ts'), 'utf8');
  const auth = fs.readFileSync(path.join(root, 'apps/api/src/auth/auth.service.ts'), 'utf8');
  const controller = fs.readFileSync(path.join(root, 'apps/api/src/auth/auth.controller.ts'), 'utf8');
  assert.match(email, /throw new EmailDeliveryError\('EMAIL_NOT_CONFIGURED'/);
  assert.match(email, /process\.env\.RESEND_API_KEY/);
  assert.match(email, /https:\/\/api\.resend\.com\/emails/);
  assert.match(email, /Oyinca <auth@oyinca\.com>/);
  assert.match(email, /if \(!payload\?\.id\)/);
  assert.match(email, /Email accepted by provider for \$\{this\.maskRecipient\(to\)\}/);
  assert.doesNotMatch(email, /Email sent to \$\{to\}/);
  assert.match(auth, /VERIFICATION_EMAIL_NOT_ACCEPTED/);
  assert.match(auth, /Verification resend was not accepted/);
  assert.match(auth, /resendVerification[\s\S]*e instanceof EmailDeliveryError/);
  assert.match(auth, /deliveryStatus: 'accepted'/);
  assert.match(auth, /welcomeEmail\(\)/);
  assert.match(controller, /const \{ accessToken, user, expiresAt, maxAgeMs \} = await this\.authService\.verifyEmail/);
  assert.match(controller, /res\.cookie\(AUTH_COOKIE_NAME, accessToken/);
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

test('dashboard startup uses one guarded bootstrap and defers secondary data', () => {
  const controller = fs.readFileSync(path.join(root, 'apps/api/src/dashboard/dashboard.controller.ts'), 'utf8');
  const service = fs.readFileSync(path.join(root, 'apps/api/src/dashboard/dashboard.service.ts'), 'utf8');
  const page = fs.readFileSync(path.join(root, 'apps/web/src/app/dashboard/page.tsx'), 'utf8');
  const layout = fs.readFileSync(path.join(root, 'apps/web/src/app/dashboard/layout.tsx'), 'utf8');
  const provider = fs.readFileSync(path.join(root, 'apps/web/src/lib/DashboardDataContext.tsx'), 'utf8');

  assert.match(controller, /@UseGuards\(JwtAuthGuard, BrandAccessGuard\)/);
  assert.match(controller, /@Get\('bootstrap'\)/);
  assert.match(service, /organizationContext\.resolve\(brandId, organizationId\)/);
  assert.match(service, /Promise\.all\(\[/);
  assert.match(provider, /brandFetch<DashboardBootstrap>\('\/dashboard\/bootstrap'\)/);
  assert.match(provider, /if \(!bootstrap \|\| billing\) return/);
  assert.doesNotMatch(page, /brandFetch<[^>]+>\('\/engine\/state'\)/);
  assert.doesNotMatch(page, /apiFetch<any>\('\/oauth\/accounts'\)/);
  assert.doesNotMatch(page, /if \(loading \|\| loadError\) return/);
  assert.match(page, /event\.postId \|\| event\.mediaAssetId/);
  assert.match(page, /refreshStats\(\)/);
  assert.match(layout, /DashboardDataProvider/);
  assert.doesNotMatch(layout, /getBillingSummary/);
});


test('Brain content package rejects malformed output and removes duplicate hashtag work', () => {
  const { OyincaBrainService } = require('../apps/api/src/business-brain/oyinca-brain.service.ts');
  const brain = new OyincaBrainService({}, {}, {});
  const valid = { caption: 'Made carefully. #Craft', hashtags: ['Craft', '#Craft', '#Studio', 'bad tag'], confidence: 0.7 };
  const result = brain.parseDecision(JSON.stringify(valid));
  assert.equal(result.caption, 'Made carefully.');
  assert.deepEqual(result.hashtags, ['#Craft', '#Studio']);
  assert.equal(brain.parseDecision(JSON.stringify({ ...valid, caption: '' })), null);
  assert.equal(brain.parseDecision(JSON.stringify({ ...valid, confidence: 4 })), null);
  assert.equal(brain.parseDecision(JSON.stringify({ ...valid, hashtags: [] })), null);
  assert.equal(brain.parseDecision(JSON.stringify({ ...valid, confidence: 0 })).confidence, 0);
});

test('video content only reaches a capable provider', async () => {
  let groqCalls = 0;
  const gateway = gatewayWith(async () => { groqCalls++; return { text: 'wrong' }; }, async () => ({ text: 'actual video description' }));
  const result = await gateway.generate({ label: 'video', maxTokens: 100, messages: [{ role: 'user', content: [{ type: 'video_url', video_url: { url: 'https://example.test/video.mp4', mimeType: 'video/mp4' } }] }] });
  assert.equal(groqCalls, 0);
  assert.equal(result.provider, 'gemini');
});

function engineWith(prisma, entitlements = {}) {
  return new EngineService(
    prisma,
    {},
    {},
    {},
    {},
    {},
    entitlements,
    {},
    { record: async () => {} },
    {},
  );
}

test('stale linked PROCESSING asset reconciles from its post without creating a duplicate', async () => {
  let postCreates = 0;
  let assetUpdate;
  const asset = {
    id: 'asset-linked', brandId: 'brand', linkedPostId: 'post-existing', status: 'PROCESSING',
    processingAttempts: 1, updatedAt: new Date(Date.now() - 10 * 60_000),
  };
  const prisma = {
    mediaAsset: {
      findUnique: async () => asset,
      updateMany: async (args) => { assetUpdate = args; return { count: 1 }; },
    },
    post: {
      findFirst: async () => ({ id: 'post-existing', status: 'NEEDS_APPROVAL' }),
      create: async () => { postCreates++; },
    },
  };
  const stop = await engineWith(prisma).reconcileMediaAsset(asset.id);
  assert.equal(stop, true);
  assert.equal(postCreates, 0);
  assert.equal(assetUpdate.data.status, 'READY');
  assert.equal(assetUpdate.data.processingStage, 'READY_FOR_APPROVAL');
});

test('stale third processing attempt is reconciled to a terminal retryable failure', async () => {
  let assetUpdate;
  let releases = 0;
  const asset = {
    id: 'asset-third', brandId: 'brand', linkedPostId: null, status: 'PROCESSING',
    processingAttempts: 3, updatedAt: new Date(Date.now() - 10 * 60_000),
  };
  const prisma = { mediaAsset: {
    findUnique: async () => asset,
    updateMany: async (args) => { assetUpdate = args; return { count: 1 }; },
  } };
  const stop = await engineWith(prisma, { releaseMediaAiGeneration: async () => { releases++; } }).reconcileMediaAsset(asset.id);
  assert.equal(stop, true);
  assert.equal(assetUpdate.data.status, 'FAILED');
  assert.equal(assetUpdate.data.processingNextAttemptAt, null);
  assert.match(assetUpdate.data.lastErrorMessage, /three attempts/i);
  assert.equal(releases, 1);
});

test('pre-processing configuration failure refunds the durable AI reservation', async () => {
  const asset = {
    id: 'asset-config', brandId: 'brand', linkedPostId: null, status: 'PENDING',
    processingIntent: 'SINGLE', processingAttempts: 0, aiReservationOrgId: null,
    mimeType: 'image/png', sizeBytes: 100, filename: 'image.png', updatedAt: new Date(0),
  };
  let claims = 0;
  let reserves = 0;
  let releases = 0;
  const prisma = {
    mediaAsset: {
      findUnique: async () => asset,
      updateMany: async () => { claims++; return { count: 1 }; },
    },
    amaiEngineConfig: { findUnique: async () => { throw new Error('configuration unavailable'); } },
  };
  const service = engineWith(prisma, {
    reserveMediaAiGeneration: async () => { reserves++; return 'org'; },
    releaseMediaAiGeneration: async () => { releases++; },
  });
  await assert.rejects(service.processMediaAsset(asset.id), /configuration unavailable/);
  assert.equal(claims, 2); // claim, then terminal-state update
  assert.equal(reserves, 1);
  assert.equal(releases, 1);
});

test('optimization recovery dispatches a missed queued job independently', async () => {
  const previous = { token: process.env.QSTASH_TOKEN, secret: process.env.CRON_SECRET, url: process.env.APP_URL, fetch: global.fetch };
  process.env.QSTASH_TOKEN = 'test-token'; process.env.CRON_SECRET = 'test-secret'; process.env.APP_URL = 'https://example.test';
  const deliveries = [];
  global.fetch = async (url) => { deliveries.push(String(url)); return { ok: true }; };
  try {
    const prisma = { mediaAsset: {
      updateMany: async () => ({ count: 0 }),
      findMany: async () => [{ id: 'missed-optimization' }],
    } };
    const jobs = new EngineJobsService(prisma, {}, {}, {}, {}, {});
    const result = await jobs.recoverOptimizations();
    assert.equal(result.found, 1);
    assert.equal(deliveries.length, 1);
    assert.match(deliveries[0], /optimize-media\/missed-optimization$/);
  } finally {
    global.fetch = previous.fetch;
    for (const [key, value] of [['QSTASH_TOKEN', previous.token], ['CRON_SECRET', previous.secret], ['APP_URL', previous.url]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('oversized video is rejected before analysis and upload policy advertises the same limit', async () => {
  assert.throws(() => assertSupportedVideoSize('video/mp4', MAX_VIDEO_ANALYSIS_BYTES + 1), /14 MiB/);
  const policyService = new MediaService({}, {}, {
    getOrganizationIdForBrand: async () => 'org',
    checkStorageUsage: async () => ({ used: 0, limit: 500 * 1024 * 1024 }),
  });
  const policy = await policyService.getUploadPolicy('brand');
  assert.equal(policy.maximumVideoSizeInBytes, MAX_VIDEO_ANALYSIS_BYTES);

  const url = 'https://store.public.blob.vercel-storage.com/brand/large.mp4';
  let deleted = false;
  const registerService = new MediaService(
    { mediaAsset: { findFirst: async () => null } },
    {
      inspectUpload: async () => ({ url, pathname: 'brand/large.mp4', size: MAX_VIDEO_ANALYSIS_BYTES + 1, contentType: 'video/mp4' }),
      deleteFile: async () => { deleted = true; },
    },
    {},
  );
  await assert.rejects(
    registerService.registerUploadedAsset('brand', { url, size: 1, mimeType: 'video/mp4', filename: 'large.mp4' }),
    /14 MiB/,
  );
  assert.equal(deleted, true);
});

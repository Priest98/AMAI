const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (path) => fs.readFileSync(path, 'utf8');

test('TikTok sign-in requests only identity scope', () => {
  const source = read('apps/api/src/oauth/oauth.service.ts');
  assert.match(source, /options\.intent === 'LOGIN'[\s\S]*?\['user\.info\.basic'\]/);
});

test('TikTok OAuth state is random, stored hashed, expiring, and single-use', () => {
  const source = read('apps/api/src/oauth/oauth.service.ts');
  assert.match(source, /randomBytes\(32\)/);
  assert.match(source, /stateHash: this\.hashOAuthState\(state\)/);
  assert.match(source, /expiresAt: new Date\(Date\.now\(\) \+ 10 \* 60 \* 1000\)/);
  assert.match(source, /updateMany\([\s\S]*consumedAt: null/);
});

test('TikTok identity is stable and separate from optional capabilities', () => {
  const schema = read('apps/api/prisma/schema.prisma');
  const capabilities = read('apps/api/src/oauth/tiktok-capabilities.ts');
  assert.match(schema, /@@unique\(\[provider, providerAccountId\]\)/);
  assert.match(schema, /grantedScopes\s+String\[\]/);
  assert.match(capabilities, /canAuthenticateWithTikTok/);
  assert.match(capabilities, /canPublicPost/);
});

test('TikTok publishing selects upload or Direct Post from a server-side approval gate', () => {
  const source = read('apps/api/src/queue/publishing.service.ts');
  const status = read('apps/api/src/oauth/tiktok-production-status.ts');
  assert.match(status, /TIKTOK_DIRECT_POST_ENABLED/);
  assert.match(source, /capabilities\.canUploadDraft/);
  assert.match(source, /post\/publish\/inbox\/video\/init/);
  assert.match(source, /post_mode: directPost \? 'DIRECT_POST' : 'MEDIA_UPLOAD'/);
});

test('TikTok inbox delivery is not marked as published', () => {
  const metrics = read('apps/api/src/metrics/metrics.service.ts');
  assert.match(metrics, /status === 'PUBLISH_COMPLETE'/);
  assert.match(metrics, /status === 'SEND_TO_USER_INBOX' && method === 'MEDIA_UPLOAD'/);
  assert.doesNotMatch(metrics, /status === 'PUBLISH_COMPLETE' \|\| status === 'SEND_TO_USER_INBOX'/);
});

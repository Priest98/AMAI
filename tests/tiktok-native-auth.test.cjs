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

test('TikTok direct publishing fails closed without video.publish', () => {
  const source = read('apps/api/src/queue/publishing.service.ts');
  assert.match(source, /if \(!capabilities\.canDirectPost\)/);
});

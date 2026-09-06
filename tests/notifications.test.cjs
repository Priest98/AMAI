const path = require('node:path');
require('ts-node').register({ project: path.join(__dirname, '../apps/api/tsconfig.json'), transpileOnly: true });
require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { NotificationPolicyService } = require('../apps/api/src/capabilities/notifications/notification-policy.service');
const { NotificationService } = require('../apps/api/src/capabilities/notifications/notification.service');

const userRequest = { event: 'post.failed', audience: 'user', recipient: { organizationId: 'org', brandId: 'brand', email: 'owner@example.com' }, title: 'Post failed', body: 'Retry it.' };

test('notification policy restricts admin events to Telegram', () => {
  const policy = new NotificationPolicyService();
  assert.deepEqual(policy.channelsFor({ ...userRequest, audience: 'admin', recipient: {}, channels: ['email', 'telegram', 'in_app'] }), ['telegram']);
});

test('notification service fans out over the event policy', async () => {
  const sent = [];
  const providers = [
    { id: 'in-app', channel: 'in_app', isAvailable: () => true, send: async () => { sent.push('in_app'); return true; } },
    { id: 'email', channel: 'email', isAvailable: () => true, send: async () => { sent.push('email'); return true; } },
  ];
  const service = new NotificationService(new NotificationPolicyService(), providers);
  const result = await service.notify(userRequest);
  assert.deepEqual(sent, ['in_app', 'email']);
  assert.equal(result.deliveries.filter((delivery) => delivery.state === 'sent').length, 2);
});

test('unconfigured channels are skipped without failing the domain event', async () => {
  const provider = { id: 'email', channel: 'email', isAvailable: () => false, send: async () => { throw new Error('must not run'); } };
  const service = new NotificationService(new NotificationPolicyService(), [provider]);
  const result = await service.notify({ ...userRequest, channels: ['email'] });
  assert.equal(result.deliveries[0].state, 'skipped');
});

test('one channel failure does not block another channel', async () => {
  const providers = [
    { id: 'in-app', channel: 'in_app', isAvailable: () => true, send: async () => { throw new Error('down'); } },
    { id: 'email', channel: 'email', isAvailable: () => true, send: async () => true },
  ];
  const service = new NotificationService(new NotificationPolicyService(), providers);
  const result = await service.notify(userRequest);
  assert.equal(result.deliveries.find((delivery) => delivery.channel === 'in_app').state, 'failed');
  assert.equal(result.deliveries.find((delivery) => delivery.channel === 'email').state, 'sent');
});


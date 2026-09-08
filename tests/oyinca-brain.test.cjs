const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'Node' } });

const {
  autonomyAction,
  clampConfidence,
  decayConfidence,
  describeContentDifferences,
  evidenceConfidence,
  BRAIN_MIN_EVIDENCE,
} = require('../apps/api/src/business-brain/brain-policy.ts');

test('confidence is bounded and malformed values fail closed', () => {
  assert.equal(clampConfidence(2), 1);
  assert.equal(clampConfidence(-1), 0);
  assert.equal(clampConfidence(Number.NaN), 0);
});

test('autonomy thresholds fail safe and user approval remains required at medium confidence', () => {
  assert.equal(autonomyAction({ confidence: 0.9, policy: 'pass', repetitionRisk: 5 }), 'accept');
  assert.equal(autonomyAction({ confidence: 0.7, policy: 'pass', repetitionRisk: 5 }), 'request_approval');
  assert.equal(autonomyAction({ confidence: 0.4, policy: 'pass', repetitionRisk: 5 }), 'regenerate');
  assert.equal(autonomyAction({ confidence: 0.95, policy: 'block', repetitionRisk: 0 }), 'escalate');
  assert.equal(autonomyAction({ confidence: 0.95, policy: 'pass', repetitionRisk: 100 }), 'escalate');
  assert.equal(autonomyAction({ confidence: 0.95, policy: 'pass', repetitionRisk: 0, semanticRequired: true }), 'request_approval');
});

test('evidence accumulates gradually and contradictions weaken an insight', () => {
  assert.equal(BRAIN_MIN_EVIDENCE, 3);
  assert.ok(evidenceConfidence(3, 0) > evidenceConfidence(1, 0));
  assert.ok(evidenceConfidence(5, 3) < evidenceConfidence(5, 0));
  assert.ok(evidenceConfidence(100, 0) <= 1);
});

test('stale memory decays while recent evidence retains confidence', () => {
  const now = new Date('2026-09-08T00:00:00Z');
  assert.equal(decayConfidence(0.8, now, now), 0.8);
  assert.equal(decayConfidence(0.8, new Date('2026-03-12T00:00:00Z'), now), 0.4);
  assert.ok(decayConfidence(0.8, new Date('2025-09-08T00:00:00Z'), now) < 0.25);
});

test('caption edits become observations rather than instant permanent preferences', () => {
  const changes = describeContentDifferences('CAPTION_EDITED', 'Buy today ✨ and click to shop our complete collection now.', 'Quiet quality, made well.');
  assert.deepEqual(changes.sort(), ['removed_emojis', 'rewritten', 'shortened', 'softened_promotion'].sort());
  assert.deepEqual(describeContentDifferences('CAPTION_EDITED', ['not text'], ['not text']), []);
});

test('schema enforces tenant scoping and duplicate-event idempotency', () => {
  const schema = fs.readFileSync('apps/api/prisma/schema.prisma', 'utf8');
  assert.match(schema, /model BrainEvent[\s\S]*organizationId String[\s\S]*brandId\s+String/);
  assert.match(schema, /@@unique\(\[brandId, idempotencyKey\]\)/);
  assert.match(schema, /model LearnedInsight[\s\S]*@@unique\(\[brandId, key\]\)/);
  assert.match(schema, /model ContentAnalysis[\s\S]*@@unique\(\[brandId, mediaAssetId, fingerprint\]\)/);
});

test('service queries retain organization and brand boundaries for private memory', () => {
  const source = fs.readFileSync('apps/api/src/business-brain/oyinca-brain.service.ts', 'utf8');
  assert.match(source, /where: \{ organizationId, brandId, status: 'ACTIVE'/);
  assert.match(source, /where: \{ organizationId, brandId, type:/);
  assert.match(source, /where: \{ id: mediaAssetId, brandId \}/);
  assert.match(source, /where: \{ brandId_idempotencyKey:/);
});

test('model failure returns a low-confidence non-publishable fallback', () => {
  const source = fs.readFileSync('apps/api/src/business-brain/oyinca-brain.service.ts', 'utf8');
  assert.match(source, /provider could not return a valid structured decision/i);
  assert.match(source, /confidence: 0\.2/);
  assert.match(source, /parsed \? 'succeeded' : 'no_output'/);
});

test('Brain confidence can reduce but never grant Autopilot permission', () => {
  const source = fs.readFileSync('apps/api/src/engine/engine.service.ts', 'utf8');
  assert.match(source, /config\.approvalMode === ApprovalMode\.AUTO/);
  assert.match(source, /engineEntitlements\.autopilotLevel === 'advanced'/);
  assert.match(source, /if \(!brainEvaluation \|\| brainEvaluation\.action !== 'accept'\) willAutoPublish = false/);
});

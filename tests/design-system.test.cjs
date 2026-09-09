const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('canonical design intelligence documents exist', () => {
  for (const file of [
    'docs/design/OYINCA-DESIGN.md',
    'docs/design/MOTION.md',
    'docs/design/COMPONENTS.md',
    'docs/design/UX-PRINCIPLES.md',
    'docs/design/REFERENCES.md',
  ]) assert.equal(fs.existsSync(path.join(root, file)), true, `${file} is missing`);
});

test('semantic UI tokens and control sizes remain available', () => {
  const tokens = read('apps/web/src/styles/tokens.css');
  for (const token of [
    '--surface-canvas', '--surface-panel', '--surface-raised',
    '--action-primary', '--focus-ring', '--control-height-compact',
    '--control-height', '--control-height-prominent', '--content-width-wide',
  ]) assert.match(tokens, new RegExp(token));
});

test('product cards do not default to backdrop blur', () => {
  const css = read('apps/web/src/app/globals.css');
  const card = css.match(/\.exec-card\s*\{([\s\S]*?)\}/)?.[1] || '';
  assert.ok(card, 'exec-card rule is missing');
  assert.doesNotMatch(card, /backdrop-filter/);
  assert.match(css, /\.cinematic-glass\s*\{/);
});

test('mobile form controls retain a zoom-safe font size', () => {
  const css = read('apps/web/src/app/globals.css');
  assert.match(css, /input, select, textarea\s*\{[\s\S]*?font-size:\s*16px/);
});

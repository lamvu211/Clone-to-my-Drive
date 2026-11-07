import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bg = fs.readFileSync(
  path.join(__dirname, '../extension/background.js'),
  'utf8'
);

test('background imports stay inside extension package', () => {
  assert.doesNotMatch(bg, /\.\.\/lib\//);
  assert.match(bg, /from '\.\/lib\//);
  assert.doesNotMatch(bg, /PREFETCH_AUTH/);
  assert.doesNotMatch(bg, /CLONE_CURRENT_TAB/);
});

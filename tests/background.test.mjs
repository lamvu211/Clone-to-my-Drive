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

test('background persists app window id in chrome.storage.session', () => {
  assert.match(bg, /SESSION_KEY_APP_WINDOW\s*=\s*['"]appWindowId['"]/);
  assert.match(bg, /chrome\.storage\.session\.get/);
  assert.match(bg, /chrome\.storage\.session\.set/);
  assert.match(bg, /chrome\.storage\.session\.remove/);
});

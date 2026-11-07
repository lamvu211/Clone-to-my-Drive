import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(__dirname, '../extension/app.html'), 'utf8');

test('app UI contract', () => {
  assert.match(html, /id="destFolderLink"/);
  assert.match(html, /id="copyBtn"/);
  assert.doesNotMatch(html, /id="loadBtn"/);
  assert.match(html, /id="progressFill"/);
  assert.match(html, /id="langSelect"/);
  assert.match(html, /name="destMode"/);
  assert.match(html, /id="selectAllCheck"/);
});

test('app triggers OAuth from Load/Copy flow', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '../extension/app.js'), 'utf8');
  assert.match(appJs, /ensureGoogleSignIn/);
  assert.match(appJs, /chrome\.runtime\.connect/);
});

test('manifest opens app window (no default_popup)', () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../extension/manifest.json'), 'utf8')
  );
  assert.equal(manifest.action?.default_popup, undefined);
});

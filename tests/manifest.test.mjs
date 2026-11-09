import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extensionIdFromSha256Prefix } from '../scripts/extensionId.mjs';
import { STORE_EXTENSION_ID } from '../scripts/storeExtensionId.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(__dirname, '../extension/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

test('manifest is MV3 with required fields', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.background.type, 'module');
  assert.ok(manifest.permissions.includes('identity'));
  assert.ok(manifest.permissions.includes('storage'));
  assert.ok(manifest.host_permissions.some((h) => h.includes('googleapis.com')));
  assert.ok(manifest.oauth2?.scopes?.includes('https://www.googleapis.com/auth/drive'));
  assert.match(manifest.oauth2.client_id, /\.apps\.googleusercontent\.com$/);
});

test('dev manifest key matches Chrome Web Store extension ID', () => {
  const keyB64 = manifest.key;
  assert.ok(keyB64);
  const hash = createHash('sha256').update(Buffer.from(keyB64, 'base64')).digest();
  assert.equal(extensionIdFromSha256Prefix(hash), STORE_EXTENSION_ID);
});

test('icon files exist', () => {
  for (const size of ['16', '48', '128']) {
    const p = path.join(__dirname, `../extension/icons/icon${size}.png`);
    assert.ok(fs.statSync(p).size > 0);
  }
});

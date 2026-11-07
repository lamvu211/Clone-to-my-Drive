import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extRoot = path.join(__dirname, '../extension');

const FORBIDDEN_REL = [
  'popup.html',
  'popup.js',
  'popup.css',
  'lib/extensionId.js',
  'icons/review',
];

/**
 * @param {string} dir
 * @returns {string[]}
 */
function listRelFiles(dir, base = dir) {
  /** @type {string[]} */
  const out = [];
  if (!fs.existsSync(dir)) {
    return out;
  }
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    const rel = path.relative(base, full).replace(/\\/g, '/');
    if (ent.isDirectory()) {
      out.push(`${rel}/`);
      out.push(...listRelFiles(full, base));
    } else {
      out.push(rel);
    }
  }
  return out;
}

test('extension tree has no store-forbidden paths', () => {
  const files = listRelFiles(extRoot);
  for (const forbidden of FORBIDDEN_REL) {
    const hit = files.some(
      (f) => f === forbidden || f.startsWith(`${forbidden}/`)
    );
    assert.equal(hit, false, `forbidden path still present: ${forbidden}`);
  }
});

test('shipped extension includes only expected top-level entries', () => {
  const top = fs
    .readdirSync(extRoot)
    .filter((n) => !n.startsWith('.'))
    .sort();
  assert.deepEqual(top, [
    'app.css',
    'app.html',
    'app.js',
    'background.js',
    'icons',
    'lib',
    'manifest.json',
  ]);
});

test('icons folder ships only toolbar PNGs', () => {
  const iconsDir = path.join(extRoot, 'icons');
  const icons = fs.readdirSync(iconsDir).sort();
  assert.deepEqual(icons, ['icon128.png', 'icon16.png', 'icon48.png']);
});

test('manifest ships store OAuth fields', () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(extRoot, 'manifest.json'), 'utf8')
  );
  assert.match(manifest.oauth2?.client_id, /\.apps\.googleusercontent\.com$/);
  assert.ok(manifest.oauth2?.scopes?.includes('https://www.googleapis.com/auth/drive'));
  assert.ok(typeof manifest.key === 'string' && manifest.key.length > 0);
});

test('store package script keeps manifest.key', () => {
  const script = fs.readFileSync(
    path.join(__dirname, '../scripts/package-store.mjs'),
    'utf8'
  );
  assert.doesNotMatch(script, /delete manifest\.key/);
});

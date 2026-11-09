/**
 * Download published CRX and sync manifest.key so Load unpacked matches Chrome Web Store ID.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STORE_EXTENSION_ID } from './storeExtensionId.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const crxPath = path.join(root, 'dist/store.crx');
const distDir = path.dirname(crxPath);

fs.mkdirSync(distDir, { recursive: true });

const url =
  'https://clients2.google.com/service/update2/crx?response=redirect&prodversion=131.0.0.0&acceptformat=crx3&x=' +
  encodeURIComponent(`id=${STORE_EXTENSION_ID}&uc`);

const curl = spawnSync(
  'curl',
  [
    '-sL',
    '-A',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    url,
    '-o',
    crxPath,
  ],
  { stdio: 'inherit' }
);

if (curl.status !== 0) {
  console.error('curl failed — download CRX from Store manually, then run:');
  console.error(
    `  node scripts/extract-store-manifest-key.mjs <path-to.crx> ${STORE_EXTENSION_ID}`
  );
  process.exit(curl.status ?? 1);
}

const stat = fs.statSync(crxPath);
if (stat.size < 100) {
  console.error('Downloaded CRX is empty — extension may be unpublished or curl blocked.');
  process.exit(1);
}

const extract = spawnSync(
  process.execPath,
  [
    path.join(root, 'scripts/extract-store-manifest-key.mjs'),
    crxPath,
    STORE_EXTENSION_ID,
  ],
  { stdio: 'inherit', cwd: root }
);
process.exit(extract.status ?? 1);

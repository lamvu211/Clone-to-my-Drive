/**
 * Extract manifest "key" from a Chrome Web Store CRX so unpacked load matches Store Extension ID.
 * Usage: node scripts/extract-store-manifest-key.mjs <crx-path> [expected-extension-id]
 */
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extensionIdFromSha256Prefix } from './extensionId.mjs';

const require = createRequire(import.meta.url);
const crx = require('crx3-utils');

const crxPath = process.argv[2];
const expectedId = process.argv[3] || 'mimncbbpgpbpafnklcpibmjpboajkhgl';

if (!crxPath) {
  console.error('Usage: node scripts/extract-store-manifest-key.mjs <crx-path> [extension-id]');
  process.exit(1);
}

const buf = fs.readFileSync(crxPath);
const hdr = crx.parse(buf);
const mainIdx = crx.rsa_main_index(hdr);
if (mainIdx < 0) {
  console.error('Could not find developer RSA key in CRX.');
  process.exit(1);
}

const keyDer = hdr.sha256_with_rsa[mainIdx].public_key;
const keyB64 = Buffer.from(keyDer).toString('base64');
const verifyId = extensionIdFromSha256Prefix(
  createHash('sha256').update(Buffer.from(keyB64, 'base64')).digest()
);

if (verifyId !== expectedId) {
  console.error(`Key gives ID ${verifyId}, expected ${expectedId}.`);
  process.exit(1);
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'extension/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.key = keyB64;
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote manifest.key → extension ID ${verifyId}`);

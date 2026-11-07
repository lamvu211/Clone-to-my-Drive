import { createHash, generateKeyPairSync } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extensionIdFromSha256Prefix } from './extensionId.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'extension/manifest.json');
const pemPath = path.join(root, 'secrets/extension-private.pem');

const write = process.argv.includes('--write-manifest');

function computeIdFromKeyB64(keyB64) {
  const hash = createHash('sha256').update(Buffer.from(keyB64, 'base64')).digest();
  return extensionIdFromSha256Prefix(hash);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

let keyB64 = manifest.key;
if (!keyB64 && write) {
  fs.mkdirSync(path.dirname(pemPath), { recursive: true });
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  keyB64 = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  fs.writeFileSync(pemPath, pem, { mode: 0o600 });
  manifest.key = keyB64;
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote manifest key and ${pemPath} (gitignored).`);
} else if (!keyB64) {
  console.error('No manifest.key yet. Re-run with --write-manifest to generate.');
  process.exit(1);
}

const extensionId = computeIdFromKeyB64(keyB64);
console.log('');
console.log('Extension ID (dùng cho OAuth Chrome extension):');
console.log(extensionId);
console.log('');
console.log('Bước tiếp theo (một lần, nhà phát hành):');
console.log('1. Google Cloud Console → APIs → bật Google Drive API');
console.log('2. Credentials → Create OAuth client ID → Chrome extension');
console.log(`3. Application ID = ${extensionId}`);
console.log('4. Dán Client ID vào extension/manifest.json → oauth2.client_id');
console.log('5. Reload extension trên chrome://extensions');
console.log('');

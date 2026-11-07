/**
 * Build a Chrome Web Store upload ZIP from extension/.
 * Keeps manifest.key so Extension ID matches the OAuth "Chrome extension" client
 * (one client_id in manifest for all Store users; each user signs into their own Google account).
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const extRoot = path.join(root, 'extension');
const distDir = path.join(root, 'dist');
const stagingDir = path.join(distDir, 'store-extension');

const SKIP_NAMES = new Set([
  '.DS_Store',
  'Thumbs.db',
  'desktop.ini',
]);

/**
 * @param {string} dir
 * @param {(rel: string) => void} onFile
 */
function walkRel(dir, onFile) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_NAMES.has(ent.name)) {
      continue;
    }
    const full = path.join(dir, ent.name);
    const rel = path.relative(extRoot, full).replace(/\\/g, '/');
    if (ent.isDirectory()) {
      walkRel(full, onFile);
    } else {
      onFile(rel);
    }
  }
}

function rimraf(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }
  fs.rmSync(dir, { recursive: true, force: true });
}

function copyExtensionToStaging() {
  rimraf(stagingDir);
  fs.mkdirSync(stagingDir, { recursive: true });

  walkRel(extRoot, (rel) => {
    const src = path.join(extRoot, rel);
    const dest = path.join(stagingDir, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  });

}

function zipStaging(outZip) {
  fs.mkdirSync(distDir, { recursive: true });
  if (fs.existsSync(outZip)) {
    fs.unlinkSync(outZip);
  }

  if (process.platform === 'win32') {
    const escaped = outZip.replace(/'/g, "''");
    const srcGlob = path.join(stagingDir, '*').replace(/'/g, "''");
    const ps = `Compress-Archive -Path '${srcGlob}' -DestinationPath '${escaped}' -Force`;
    const res = spawnSync(
      'powershell',
      ['-NoProfile', '-Command', ps],
      { encoding: 'utf8' }
    );
    if (res.status !== 0) {
      console.error(res.stderr || res.stdout);
      process.exit(1);
    }
    return;
  }

  const res = spawnSync('zip', ['-qr', outZip, '.'], {
    cwd: stagingDir,
    encoding: 'utf8',
  });
  if (res.status !== 0) {
    console.error('zip failed — install zip(1) or run on Windows');
    if (res.stderr) {
      console.error(res.stderr);
    }
    process.exit(1);
  }
}

copyExtensionToStaging();

const manifest = JSON.parse(
  fs.readFileSync(path.join(stagingDir, 'manifest.json'), 'utf8')
);
const version = manifest.version || '0.0.0';
const outZip = path.join(distDir, `clone-to-my-drive-${version}.zip`);

zipStaging(outZip);

console.log(`Store package: ${outZip}`);
console.log(
  'Includes oauth2.client_id + manifest.key — verify Extension ID on CWS matches your OAuth client Application ID.'
);

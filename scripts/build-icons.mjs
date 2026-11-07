import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'scripts/icons/creative-08-orbit-twin.svg');
const outDir = path.join(root, 'extension/icons');

const sizes = [16, 48, 128];

for (const size of sizes) {
  const out = path.join(outDir, `icon${size}.png`);
  const res = spawnSync(
    'npx',
    ['--yes', '@resvg/resvg-js-cli', src, out, '--fit-width', String(size)],
    { cwd: root, shell: true, stdio: 'pipe' }
  );
  if (res.status !== 0) {
    console.error(`Failed to render ${size}px icon`);
    if (res.stderr) console.error(res.stderr.toString());
    process.exit(1);
  }
}

console.log('Icons built from creative-08-orbit-twin.svg (C8) → icon16/48/128.png');

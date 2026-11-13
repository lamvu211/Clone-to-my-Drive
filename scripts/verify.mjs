import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @type {{ name: string, cmd: string, cwd?: string }[]} */
const checks = [
  { name: 'oauthConfig', cmd: 'node --test tests/oauthConfig.test.mjs' },
  { name: 'authPrefetch', cmd: 'node --test tests/authPrefetch.test.mjs' },
  { name: 'extensionPackaging', cmd: 'node --test tests/extensionPackaging.test.mjs' },
  { name: 'background', cmd: 'node --test tests/background.test.mjs' },
  { name: 'driveIds', cmd: 'node --test tests/driveIds.test.mjs' },
  { name: 'driveCopier', cmd: 'node --test tests/driveCopier.test.mjs' },
  { name: 'manifest', cmd: 'node --test tests/manifest.test.mjs' },
  { name: 'app', cmd: 'node --test tests/app.test.mjs' },
  { name: 'listViewport', cmd: 'node --test tests/listViewport.test.mjs' },
  { name: 'tabListing', cmd: 'node --test tests/tabListing.test.mjs' },
  { name: 'copyWrap', cmd: 'node --test tests/copyWrap.test.mjs' },
  { name: 'storageContract', cmd: 'node --test tests/storageContract.test.mjs' },
  { name: 'storePackaging', cmd: 'node --test tests/storePackaging.test.mjs' },
  {
    name: 'reference_python_tests',
    cmd: 'python -m unittest discover -s _ref -p test_drive_copier.py -q',
    cwd: root,
  },
];

let failed = 0;

const iconBuild = spawnSync('node scripts/build-icons.mjs', {
  shell: true,
  cwd: root,
  encoding: 'utf8',
});
if (iconBuild.status === 0) {
  console.log('PASS build-icons');
} else {
  failed += 1;
  console.error('FAIL build-icons');
}

for (const check of checks) {
  const res = spawnSync(check.cmd, {
    shell: true,
    cwd: check.cwd || root,
    encoding: 'utf8',
  });
  if (res.status === 0) {
    console.log(`PASS ${check.name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${check.name} (exit ${res.status})`);
    if (res.stdout) {
      console.error(res.stdout);
    }
    if (res.stderr) {
      console.error(res.stderr);
    }
  }
}

if (failed) {
  process.exit(1);
}
console.log('All verify checks passed.');

/**
 * Remove a stale unpacked extension from Chrome Default profile.
 * Chrome must be fully closed before running.
 *
 * Usage: node scripts/remove-chrome-extension-id.mjs <extension-id>
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const EXT_ID = process.argv[2];
if (!EXT_ID || !/^[a-p]{32}$/.test(EXT_ID)) {
  console.error('Usage: node scripts/remove-chrome-extension-id.mjs <32-char-extension-id>');
  process.exit(1);
}

const chromeRunning = spawnSync('tasklist', ['/FI', 'IMAGENAME eq chrome.exe'], {
  encoding: 'utf8',
});
if (/chrome\.exe/i.test(chromeRunning.stdout || '')) {
  console.error('Close all Chrome windows first (no chrome.exe in Task Manager).');
  process.exit(1);
}

const userData = path.join(
  process.env.LOCALAPPDATA || '',
  'Google',
  'Chrome',
  'User Data',
  'Default'
);
const securePath = path.join(userData, 'Secure Preferences');
const prefsPath = path.join(userData, 'Preferences');

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data));
}

const secure = loadJson(securePath);
const prefs = loadJson(prefsPath);

let removed = false;
if (secure.extensions?.settings?.[EXT_ID]) {
  delete secure.extensions.settings[EXT_ID];
  removed = true;
}
const macs = secure.protection?.macs?.extensions?.settings;
if (macs?.[EXT_ID]) {
  delete macs[EXT_ID];
  removed = true;
}
if (secure.protection?.super_mac) {
  delete secure.protection.super_mac;
}

if (prefs.extensions?.settings?.[EXT_ID]) {
  delete prefs.extensions.settings[EXT_ID];
  removed = true;
}
if (prefs.extensions?.pinned_extensions) {
  const before = prefs.extensions.pinned_extensions.length;
  prefs.extensions.pinned_extensions = prefs.extensions.pinned_extensions.filter(
    (id) => id !== EXT_ID
  );
  if (prefs.extensions.pinned_extensions.length !== before) {
    removed = true;
  }
}
const toolbar = prefs.extensions?.toolbar?.pinned_ids;
if (Array.isArray(toolbar)) {
  const filtered = toolbar.filter((id) => id !== EXT_ID);
  if (filtered.length !== toolbar.length) {
    prefs.extensions.toolbar.pinned_ids = filtered;
    removed = true;
  }
}

if (!removed) {
  console.log(`No profile entry found for ${EXT_ID} (data dirs may still be removed).`);
}

saveJson(securePath, secure);
saveJson(prefsPath, prefs);

for (const sub of ['Local Extension Settings', 'Sync Extension Settings', 'Managed Extension Settings']) {
  const dir = path.join(userData, sub, EXT_ID);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log('Removed', dir);
  }
}

console.log(removed ? `Removed extension ${EXT_ID} from Chrome profile.` : 'Done.');
console.log('Open Chrome, enable Developer mode, Load unpacked again.');

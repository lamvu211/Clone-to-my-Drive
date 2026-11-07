import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storageKeys = fs.readFileSync(
  path.join(__dirname, '../extension/lib/storageKeys.js'),
  'utf8'
);
const appJs = fs.readFileSync(path.join(__dirname, '../extension/app.js'), 'utf8');

test('storage key contract', () => {
  assert.match(storageKeys, /STORAGE_KEY_YOUR_DRIVE_FOLDER_LINK\s*=\s*'yourDriveFolderLink'/);
  assert.match(storageKeys, /STORAGE_KEY_DRIVE_CLONE_FOLDER_ID/);
  assert.match(appJs, /chrome\.storage\.local\.set/);
  assert.match(appJs, /chrome\.storage\.local\.get/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractDriveResourceId,
  extractFolderIdFromUrl,
  isGoogleDriveUrl,
} from '../extension/lib/driveIds.js';

const validId = '1aBcDeFgHiJkLmNoPqRsTuVwXyZ12345';

test('extractFolderId matches reference repo cases', () => {
  assert.equal(
    extractFolderIdFromUrl(`https://drive.google.com/drive/folders/${validId}`),
    validId
  );
  assert.equal(
    extractFolderIdFromUrl(
      `https://drive.google.com/drive/folders/${validId}?usp=sharing`
    ),
    validId
  );
  assert.equal(
    extractFolderIdFromUrl(
      `https://drive.google.com/drive/u/1/folders/${validId}`
    ),
    validId
  );
  assert.equal(
    extractFolderIdFromUrl(`https://drive.google.com/open?id=${validId}`),
    validId
  );
  assert.equal(extractFolderIdFromUrl(validId), validId);
  assert.equal(
    extractFolderIdFromUrl(`  "https://drive.google.com/drive/folders/${validId}"  `),
    validId
  );
  assert.equal(extractFolderIdFromUrl(''), null);
  assert.equal(extractFolderIdFromUrl(null), null);
});

test('extractDriveResourceId from Docs and file URLs', () => {
  assert.equal(
    extractDriveResourceId(`https://docs.google.com/document/d/${validId}/edit`),
    validId
  );
  assert.equal(
    extractDriveResourceId(
      `https://docs.google.com/spreadsheets/d/${validId}/edit#gid=0`
    ),
    validId
  );
  assert.equal(
    extractDriveResourceId(`https://drive.google.com/file/d/${validId}/view`),
    validId
  );
});

test('isGoogleDriveUrl', () => {
  assert.equal(isGoogleDriveUrl(`https://drive.google.com/drive/folders/${validId}`), true);
  assert.equal(isGoogleDriveUrl(`https://example.com/${validId}`), false);
});

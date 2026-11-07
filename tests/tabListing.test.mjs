import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getListingContext,
  urlLooksLikeFileNotFolder,
} from '../extension/lib/tabListing.js';

const fid = '1aBcDeFgHiJkLmNoPqRsTuVwXyZ12345';

test('getListingContext folder URL', () => {
  const ctx = getListingContext(`https://drive.google.com/drive/folders/${fid}`);
  assert.equal(ctx.kind, 'folder');
  assert.equal(ctx.folderId, fid);
});

test('getListingContext single file URL', () => {
  const ctx = getListingContext(`https://docs.google.com/document/d/${fid}/edit`);
  assert.equal(ctx.kind, 'file');
  assert.equal(ctx.fileId, fid);
});

test('getListingContext drive home', () => {
  const ctx = getListingContext('https://drive.google.com/drive/home');
  assert.equal(ctx.kind, 'folder');
  assert.equal(ctx.folderId, 'root');
});

test('urlLooksLikeFileNotFolder', () => {
  assert.equal(urlLooksLikeFileNotFolder(`https://drive.google.com/drive/folders/${fid}`), false);
  assert.equal(
    urlLooksLikeFileNotFolder(`https://drive.google.com/file/d/${fid}/view`),
    true
  );
});

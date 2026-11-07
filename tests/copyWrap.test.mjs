import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ensureSourceNamedContainer,
  shouldUseSourceFolderWrap,
} from '../extension/lib/copyWrap.js';
import { DriveApiClient } from '../extension/lib/driveApi.js';

test('shouldUseSourceFolderWrap when browsing a folder with subfolders selected', () => {
  const listing = {
    kind: 'folder',
    folderId: 'src_parent',
    folderName: 'HƯỚNG DẪN AI',
  };
  assert.equal(
    shouldUseSourceFolderWrap(listing, [
      { isFolder: true },
      { isFolder: true },
    ]),
    true
  );
  assert.equal(
    shouldUseSourceFolderWrap(listing, [{ isFolder: true }]),
    true
  );
});

test('shouldUseSourceFolderWrap false for files-only or root', () => {
  const listing = {
    kind: 'folder',
    folderId: 'src_parent',
    folderName: 'Pack',
  };
  assert.equal(
    shouldUseSourceFolderWrap(listing, [{ isFolder: false }]),
    false
  );
  assert.equal(
    shouldUseSourceFolderWrap(
      { kind: 'folder', folderId: 'root' },
      [{ isFolder: true }]
    ),
    false
  );
  assert.equal(shouldUseSourceFolderWrap({ kind: 'file' }, []), false);
});

test('ensureSourceNamedContainer reuses existing folder (no delete)', async () => {
  const calls = { delete: 0, create: 0 };
  const fetchFn = async (url, init) => {
    const u = String(url);
    const method = init?.method || 'GET';
    if (method === 'DELETE') {
      calls.delete += 1;
    }
    if (method === 'POST' && u.includes('/files?') && !u.includes('/copy')) {
      calls.create += 1;
      return new Response(JSON.stringify({ id: 'new_shell' }), { status: 200 });
    }
    if (u.includes('in+parents') || u.includes('in parents')) {
      return new Response(
        JSON.stringify({ files: [{ id: 'existing_shell', name: 'Pack' }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response(JSON.stringify({ files: [] }), { status: 200 });
  };
  const api = new DriveApiClient({
    getAccessToken: async () => 't',
    fetch: fetchFn,
  });
  const id = await ensureSourceNamedContainer(api, 'dest_root', 'Pack');
  assert.equal(id, 'existing_shell');
  assert.equal(calls.delete, 0);
  assert.equal(calls.create, 0);
});

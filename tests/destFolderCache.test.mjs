import test from 'node:test';
import assert from 'node:assert/strict';
import { FOLDER_MIME } from '../extension/lib/driveApi.js';
import { DestFolderSnapshot } from '../extension/lib/destFolderCache.js';

test('DestFolderSnapshot overwrite targets match source name and Copy of', () => {
  const snap = DestFolderSnapshot.fromItems([
    { id: 'a', name: 'doc.pdf', mimeType: 'application/pdf' },
    { id: 'b', name: 'Copy of doc.pdf', mimeType: 'application/pdf' },
    { id: 'c', name: 'other.pdf', mimeType: 'application/pdf' },
  ]);
  const targets = snap.getOverwriteTargets('doc.pdf');
  assert.equal(targets.length, 2);
  assert.deepEqual(
    new Set(targets.map((t) => t.id)),
    new Set(['a', 'b'])
  );
});

test('DestFolderSnapshot findFolder excludes files', () => {
  const snap = DestFolderSnapshot.fromItems([
    { id: 'f1', name: 'Child', mimeType: FOLDER_MIME },
    { id: 'x', name: 'Child', mimeType: 'text/plain' },
  ]);
  assert.equal(snap.findFolder('Child')?.id, 'f1');
});

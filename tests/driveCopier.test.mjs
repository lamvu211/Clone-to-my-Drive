import test from 'node:test';
import assert from 'node:assert/strict';
import { DriveApiClient, FOLDER_MIME } from '../extension/lib/driveApi.js';
import { DriveCopier } from '../extension/lib/driveCopier.js';

/**
 * @param {Record<string, unknown>} handlers
 */
function mockFetch(handlers) {
  return async (url, init) => {
    const u = String(url);
    const method = init?.method || 'GET';
    const key = `${method} ${u}`;
    if (u.includes('/files/root')) {
      return jsonResponse({ id: 'my_drive_root' });
    }
    for (const [pattern, fn] of Object.entries(handlers)) {
      if (u.includes(pattern) || key.includes(pattern)) {
        return fn(url, init);
      }
    }
    return new Response(JSON.stringify({ error: { message: `unmocked ${key}` } }), {
      status: 404,
    });
  };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('copyResource copies single file when not duplicate', async () => {
  const calls = { copy: 0, copyBody: /** @type {unknown} */ (null) };
  const fetchFn = mockFetch({
    '/files/src_doc?': () =>
      jsonResponse({
        id: 'src_doc',
        name: 'Report.pdf',
        mimeType: 'application/pdf',
        size: '1000',
      }),
    '/files?': (url, init) => {
      if (init?.method === 'POST' && String(init?.body || '').includes('/copy')) {
        return jsonResponse({ id: 'new_copy' });
      }
      if (init?.method === 'POST') {
        calls.copy += 1;
        return jsonResponse({ id: 'new_copy' });
      }
      if (String(url).includes('in parents')) {
        return jsonResponse({ files: [] });
      }
      return jsonResponse({ files: [] });
    },
    '/copy?': (url, init) => {
      calls.copy += 1;
      calls.copyBody = init?.body ? JSON.parse(String(init.body)) : null;
      return jsonResponse({ id: 'new_copy' });
    },
  });

  const api = new DriveApiClient({
    getAccessToken: async () => 'token',
    fetch: fetchFn,
  });
  const copier = new DriveCopier(api, { maxWorkers: 1 });
  const stats = await copier.copyResource('src_doc', 'dest_folder');

  assert.equal(stats.copied, 1);
  assert.ok(calls.copy >= 1);
  assert.equal(calls.copyBody?.name, 'Report.pdf');
});

test('copyResource skips existing file by name', async () => {
  const fetchFn = mockFetch({
    '/files/src_doc?': () =>
      jsonResponse({
        id: 'src_doc',
        name: 'Report.pdf',
        mimeType: 'application/pdf',
        size: '1000',
      }),
    'dest_folder': () =>
      jsonResponse({
        files: [
          {
            id: 'existing_report',
            name: 'Report.pdf',
            mimeType: 'application/pdf',
          },
        ],
      }),
  });

  const api = new DriveApiClient({
    getAccessToken: async () => 'token',
    fetch: fetchFn,
  });
  const copier = new DriveCopier(api);
  const stats = await copier.copyResource('src_doc', 'dest_folder', {
    duplicateMode: 'skip',
  });
  assert.equal(stats.skipped, 1);
  assert.equal(stats.copied, 0);
});

test('copyResource folder creates subfolder and copies children', async () => {
  const fetchFn = async (url, init) => {
    const u = String(url);
    const method = init?.method || 'GET';
    if (u.includes('/files/root')) {
      return jsonResponse({ id: 'my_drive_root' });
    }
    if (u.includes('/files/src_folder?')) {
      return jsonResponse({
        id: 'src_folder',
        name: 'Shared Pack',
        mimeType: FOLDER_MIME,
      });
    }
    if (method === 'POST' && u.includes('/files?') && init?.body?.includes('folder')) {
      return jsonResponse({ id: 'new_sub' });
    }
    if (u.includes('src_folder') && u.includes('in+parents') && u.includes('orderBy')) {
      return jsonResponse({
        files: [
          { id: 'f1', name: 'a.txt', mimeType: 'text/plain', size: '10' },
        ],
      });
    }
    if (u.includes('Shared+Pack') || u.includes('Shared Pack')) {
      return jsonResponse({ files: [] });
    }
    if (u.includes('/copy?') || (method === 'POST' && u.includes('/copy'))) {
      return jsonResponse({ id: 'copied_f1' });
    }
    if (u.includes('new_sub') || u.includes("'new_sub'")) {
      return jsonResponse({ files: [] });
    }
    return jsonResponse({ files: [] });
  };

  const api = new DriveApiClient({
    getAccessToken: async () => 'token',
    fetch: fetchFn,
  });
  const copier = new DriveCopier(api, { maxWorkers: 1 });
  const stats = await copier.copyResource('src_folder', 'dest_root');
  assert.equal(stats.copied, 1);
});

test('executeWithRetry retries on 429', async () => {
  let attempts = 0;
  const fetchFn = async () => {
    attempts += 1;
    if (attempts === 1) {
      return jsonResponse({ error: { message: 'Rate Limit Exceeded' } }, 429);
    }
    return jsonResponse({ id: 'ok' });
  };
  const api = new DriveApiClient({
    getAccessToken: async () => 'token',
    fetch: fetchFn,
  });
  const result = await api.executeWithRetry(() =>
    fetchFn().then((r) => r)
  );
  assert.equal(result.id, 'ok');
  assert.equal(attempts, 2);
});

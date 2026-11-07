import test from 'node:test';
import assert from 'node:assert/strict';
import { prefetchAuthToken } from '../extension/lib/authPrefetch.js';

test('prefetchAuthToken uses silent token when available', async () => {
  const calls = [];
  const token = await prefetchAuthToken(async (interactive) => {
    calls.push(interactive);
    if (!interactive) {
      return 'cached-token';
    }
    throw new Error('should not prompt');
  });
  assert.equal(token, 'cached-token');
  assert.deepEqual(calls, [false]);
});

test('prefetchAuthToken prompts when silent fails', async () => {
  const calls = [];
  const token = await prefetchAuthToken(async (interactive) => {
    calls.push(interactive);
    if (!interactive) {
      throw new Error('no cache');
    }
    return 'fresh-token';
  });
  assert.equal(token, 'fresh-token');
  assert.deepEqual(calls, [false, true]);
});

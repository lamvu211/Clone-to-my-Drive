import test from 'node:test';
import assert from 'node:assert/strict';
import { oauthNotConfiguredMessageForUser } from '../extension/lib/oauthConfig.js';

test('oauthNotConfiguredMessageForUser is safe for end users (no dev/setup text)', () => {
  const msg = oauthNotConfiguredMessageForUser();
  assert.doesNotMatch(msg, /manifest/i);
  assert.doesNotMatch(msg, /npm/i);
  assert.doesNotMatch(msg, /oauth/i);
  assert.doesNotMatch(msg, /\.md/i);
});

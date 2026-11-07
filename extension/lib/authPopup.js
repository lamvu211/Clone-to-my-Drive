import { prefetchAuthToken } from './authPrefetch.js';
import {
  isOAuthClientConfigured,
  oauthNotConfiguredMessageForUser,
} from './oauthConfig.js';

/**
 * @param {boolean} interactive
 * @returns {Promise<string>}
 */
export function getAccessToken(interactive) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!token) {
        reject(new Error('No OAuth token'));
        return;
      }
      resolve(token);
    });
  });
}

/**
 * OAuth in a visible extension page (app window), not the service worker.
 * @param {{ allowInteractive: boolean }} [options]
 */
export async function ensureGoogleSignIn(options = { allowInteractive: true }) {
  if (!isOAuthClientConfigured()) {
    throw new Error(oauthNotConfiguredMessageForUser());
  }
  const getToken = (interactive) => {
    if (interactive && !options.allowInteractive) {
      return Promise.reject(new Error('Not signed in (cached token missing).'));
    }
    return getAccessToken(interactive);
  };
  if (options.allowInteractive) {
    return prefetchAuthToken(getToken);
  }
  return getAccessToken(false);
}

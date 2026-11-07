/**
 * @returns {boolean}
 */
export function isOAuthClientConfigured() {
  if (typeof chrome === 'undefined' || !chrome.runtime?.getManifest) {
    return true;
  }
  const clientId = chrome.runtime.getManifest()?.oauth2?.client_id || '';
  return (
    clientId.length > 0 &&
    !clientId.startsWith('REPLACE_WITH_OAUTH') &&
    clientId.endsWith('.apps.googleusercontent.com')
  );
}

/**
 * Shown only when manifest has no valid oauth2.client_id (broken/partial build).
 * @returns {string}
 */
export function oauthNotConfiguredMessageForUser() {
  return (
    'Không kết nối được Google Drive.\n' +
    'Extension chưa được cấu hình đăng nhập đúng cách — báo nhà phát hành hoặc thử cài lại bản mới từ Chrome Web Store.\n' +
    'Cannot connect to Google Drive — this build is missing a valid sign-in configuration.'
  );
}

/** @deprecated use oauthNotConfiguredMessageForUser */
export function oauthNotConfiguredMessage() {
  return oauthNotConfiguredMessageForUser();
}

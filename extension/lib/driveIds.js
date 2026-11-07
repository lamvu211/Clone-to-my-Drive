/**
 * Extract Google Drive file or folder ID from URLs and bare IDs.
 * Supports drive.google.com, docs/spreadsheets/slides/forms, and open?id= links.
 */

const DRIVE_HOST_PATTERN =
  /^(?:https?:\/\/)?(?:[\w-]+\.)*(?:drive|docs)\.google\.com/i;

const PATH_PATTERNS = [
  /\/folders\/([-\w]{25,})/,
  /\/file\/d\/([-\w]{25,})/,
  /\/(?:document|spreadsheets|presentation|forms|drawings|videos)\/d\/([-\w]{25,})/,
  /\/open\?[^#]*\bid=([-\w]{25,})/,
];

const QUERY_ID_PATTERN = /[?&]id=([-\w]{25,})/;
const BARE_ID_PATTERN = /^[-\w]{25,}$/;

/**
 * @param {string|null|undefined} url
 * @returns {string|null}
 */
function extractDriveResourceId(url) {
  if (url == null || url === '') {
    return null;
  }
  let s = String(url).trim().replace(/^["']|["']$/g, '');

  for (const re of PATH_PATTERNS) {
    const m = s.match(re);
    if (m) {
      return m[1];
    }
  }

  const qm = s.match(QUERY_ID_PATTERN);
  if (qm) {
    return qm[1];
  }

  if (BARE_ID_PATTERN.test(s)) {
    return s;
  }

  const fallback = s.match(/[-\w]{25,}/);
  return fallback ? fallback[0] : null;
}

/**
 * @param {string|null|undefined} url
 * @returns {boolean}
 */
function isGoogleDriveUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }
  const trimmed = url.trim();
  if (BARE_ID_PATTERN.test(trimmed)) {
    return true;
  }
  return DRIVE_HOST_PATTERN.test(trimmed);
}

/**
 * Same as extractDriveResourceId but named for folder-only links (compat with reference repo).
 * @param {string|null|undefined} url
 * @returns {string|null}
 */
function extractFolderIdFromUrl(url) {
  return extractDriveResourceId(url);
}

export { extractDriveResourceId, extractFolderIdFromUrl, isGoogleDriveUrl };

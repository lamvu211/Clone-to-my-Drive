import { extractDriveResourceId, isGoogleDriveUrl } from './driveIds.js';

/**
 * @typedef {{ kind: 'folder', folderId: string } | { kind: 'file', fileId: string } | { kind: 'invalid' }} ListingContext
 */

/**
 * Resolve what to list when user clicks Load on the active tab URL.
 * @param {string|null|undefined} pageUrl
 * @returns {ListingContext}
 */
export function getListingContext(pageUrl) {
  if (!pageUrl || !isGoogleDriveUrl(pageUrl)) {
    return { kind: 'invalid' };
  }
  const u = String(pageUrl);
  const folderMatch = u.match(/\/folders\/([-\w]{25,})/);
  if (folderMatch) {
    return { kind: 'folder', folderId: folderMatch[1] };
  }
  if (/\/drive\/(?:u\/\d+\/)?(?:home|my-drive)\b/i.test(u)) {
    return { kind: 'folder', folderId: 'root' };
  }
  const id = extractDriveResourceId(u);
  if (id) {
    return { kind: 'file', fileId: id };
  }
  return { kind: 'invalid' };
}

/**
 * @param {string|null|undefined} url
 * @returns {boolean}
 */
export function urlLooksLikeFileNotFolder(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }
  const u = url.trim();
  if (/\/folders\/[-\w]{25,}/.test(u)) {
    return false;
  }
  if (
    /\/file\/d\//.test(u) ||
    /\/(?:document|spreadsheets|presentation|forms|drawings|videos)\/d\//.test(u)
  ) {
    return true;
  }
  return false;
}

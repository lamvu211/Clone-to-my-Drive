/**
 * @typedef {{ kind: 'folder', folderId: string, folderName?: string } | { kind: 'file' } | { kind: 'invalid' }} ListingInfo
 */

/**
 * Wrap selected clones under a folder named like the Drive folder being browsed.
 * Partial selection (e.g. 5/20 subfolders) still wraps. Loose files only → no wrap.
 *
 * @param {ListingInfo | null | undefined} listing
 * @param {{ isFolder?: boolean }[]} selectedItems
 */
export function shouldUseSourceFolderWrap(listing, selectedItems) {
  if (!listing || listing.kind !== 'folder') {
    return false;
  }
  if (listing.folderId === 'root') {
    return false;
  }
  if (!listing.folderName) {
    return false;
  }
  return selectedItems.some((item) => item.isFolder);
}

/**
 * Ensure destination container folder exists. Never deletes an existing container:
 * overwrite applies to children inside via DriveCopier, not by recreating the shell.
 *
 * @param {import('./driveApi.js').DriveApiClient} api
 * @param {string} destParentId
 * @param {string} containerName
 */
export async function ensureSourceNamedContainer(api, destParentId, containerName) {
  const existing = await api.findFolderInParent(destParentId, containerName);
  if (existing) {
    return existing.id;
  }
  return api.createFolder(destParentId, containerName);
}

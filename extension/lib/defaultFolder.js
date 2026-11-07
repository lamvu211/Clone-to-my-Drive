import { DEFAULT_FOLDER_NAME, STORAGE_KEY_DRIVE_CLONE_FOLDER_ID } from './storageKeys.js';
import { FOLDER_MIME } from './driveApi.js';

/**
 * @param {import('./driveApi.js').DriveApiClient} api
 * @returns {Promise<string>} folder id
 */
export async function resolveDriveCloneFolderId(api) {
  const stored = await chrome.storage.local.get(STORAGE_KEY_DRIVE_CLONE_FOLDER_ID);
  let remembered = stored[STORAGE_KEY_DRIVE_CLONE_FOLDER_ID];
  if (remembered) {
    const stillThere = await api.getFileOptional(remembered);
    if (stillThere?.mimeType === FOLDER_MIME) {
      return api.ensureFolderReady(remembered);
    }
    await chrome.storage.local.remove(STORAGE_KEY_DRIVE_CLONE_FOLDER_ID);
    remembered = undefined;
  }

  const candidates = await api.findFoldersByNameOnRoot(DEFAULT_FOLDER_NAME);
  if (candidates.length) {
    const pick = candidates[0];
    await chrome.storage.local.set({
      [STORAGE_KEY_DRIVE_CLONE_FOLDER_ID]: pick.id,
    });
    return api.ensureFolderReady(pick.id);
  }

  const rootId = await api.getMyDriveRootId();
  const createdId = await api.createFolder(rootId, DEFAULT_FOLDER_NAME);
  await chrome.storage.local.set({
    [STORAGE_KEY_DRIVE_CLONE_FOLDER_ID]: createdId,
  });
  return api.ensureFolderReady(createdId);
}

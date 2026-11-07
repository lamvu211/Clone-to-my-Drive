import { FOLDER_MIME } from './driveApi.js';

/**
 * In-memory index of one destination folder (built from a single listChildren).
 * @typedef {{ id: string, name?: string }} IndexedItem
 */

export class DestFolderSnapshot {
  /**
   * @param {Map<string, IndexedItem[]>} filesByName
   * @param {Map<string, IndexedItem>} foldersByName
   */
  constructor(filesByName, foldersByName) {
    this.filesByName = filesByName;
    this.foldersByName = foldersByName;
  }

  /**
   * @param {{ id: string, name?: string, mimeType?: string }[]} items
   */
  static fromItems(items) {
    /** @type {Map<string, IndexedItem[]>} */
    const filesByName = new Map();
    /** @type {Map<string, IndexedItem>} */
    const foldersByName = new Map();
    for (const item of items) {
      const name = item.name;
      if (!name) {
        continue;
      }
      if (item.mimeType === FOLDER_MIME) {
        foldersByName.set(name, { id: item.id, name });
      } else {
        const arr = filesByName.get(name) || [];
        arr.push({ id: item.id, name });
        filesByName.set(name, arr);
      }
    }
    return new DestFolderSnapshot(filesByName, foldersByName);
  }

  /**
   * @param {string} sourceName
   * @returns {IndexedItem[]}
   */
  getOverwriteTargets(sourceName) {
    if (!sourceName) {
      return [];
    }
    const copyOf = `Copy of ${sourceName}`;
    /** @type {Map<string, IndexedItem>} */
    const byId = new Map();
    for (const n of [sourceName, copyOf]) {
      for (const f of this.filesByName.get(n) || []) {
        byId.set(f.id, f);
      }
    }
    return [...byId.values()];
  }

  /**
   * @param {string} name
   * @returns {IndexedItem | null}
   */
  findFolder(name) {
    return this.foldersByName.get(name) || null;
  }

  /**
   * @param {string[]} ids
   */
  removeFiles(ids) {
    const idSet = new Set(ids);
    for (const [name, arr] of this.filesByName) {
      const next = arr.filter((f) => !idSet.has(f.id));
      if (next.length) {
        this.filesByName.set(name, next);
      } else {
        this.filesByName.delete(name);
      }
    }
  }

  /**
   * @param {string} folderId
   */
  removeFolderById(folderId) {
    for (const [name, f] of this.foldersByName) {
      if (f.id === folderId) {
        this.foldersByName.delete(name);
        break;
      }
    }
  }

  /**
   * @param {IndexedItem} file
   */
  addFile(file) {
    const name = file.name;
    if (!name) {
      return;
    }
    const arr = this.filesByName.get(name) || [];
    arr.push({ id: file.id, name });
    this.filesByName.set(name, arr);
  }

  /**
   * @param {IndexedItem} folder
   */
  addFolder(folder) {
    if (!folder.name) {
      return;
    }
    this.foldersByName.set(folder.name, { id: folder.id, name: folder.name });
  }
}

/**
 * Lazily loads each destination folder once; updates index after local mutations.
 */
export class DestFolderCache {
  /**
   * @param {import('./driveApi.js').DriveApiClient} api
   */
  constructor(api) {
    this.api = api;
    /** @type {Map<string, Promise<DestFolderSnapshot>>} */
    this._loaders = new Map();
  }

  /**
   * @param {string} folderId
   */
  invalidate(folderId) {
    this._loaders.delete(folderId);
  }

  /**
   * @param {string} folderId
   * @returns {Promise<DestFolderSnapshot>}
   */
  async getSnapshot(folderId) {
    if (!this._loaders.has(folderId)) {
      this._loaders.set(
        folderId,
        this.api.listChildren(folderId).then((items) =>
          DestFolderSnapshot.fromItems(items)
        )
      );
    }
    return this._loaders.get(folderId);
  }

  /**
   * @param {string} folderId
   * @param {string} sourceName
   */
  async getOverwriteTargets(folderId, sourceName) {
    const snap = await this.getSnapshot(folderId);
    return snap.getOverwriteTargets(sourceName);
  }

  /**
   * @param {string} folderId
   * @param {string} name
   */
  async findFolderInParent(folderId, name) {
    const snap = await this.getSnapshot(folderId);
    return snap.findFolder(name);
  }

  /**
   * @param {string} folderId
   * @param {string[]} ids
   */
  async afterDeleteFiles(folderId, ids) {
    if (!ids.length) {
      return;
    }
    const snap = await this.getSnapshot(folderId);
    snap.removeFiles(ids);
  }

  /**
   * @param {string} parentId
   * @param {string} folderId
   */
  async afterDeleteFolder(parentId, folderId) {
    this.invalidate(folderId);
    const snap = await this.getSnapshot(parentId);
    snap.removeFolderById(folderId);
  }

  /**
   * @param {string} parentId
   * @param {string} id
   * @param {string} name
   */
  async afterCreateFolder(parentId, id, name) {
    const snap = await this.getSnapshot(parentId);
    snap.addFolder({ id, name });
    this.invalidate(id);
  }

  /**
   * @param {string} folderId
   * @param {{ id: string, name?: string }} file
   */
  async afterCopyFile(folderId, file) {
    const snap = await this.getSnapshot(folderId);
    snap.addFile(file);
  }
}

import { DriveApiClient, FOLDER_MIME, isRateOrTransientError } from './driveApi.js';
import { DestFolderCache } from './destFolderCache.js';

/** @typedef {'skip' | 'rewrite'} DuplicateMode */

/**
 * Port of SharedDrive-to-MyDrive copy orchestration.
 */
export class DriveCopier {
  /**
   * @param {DriveApiClient} api
   * @param {{ maxWorkers?: number, onProgress?: (msg: string) => void, onPercent?: (n: number) => void }} [options]
   */
  constructor(api, options = {}) {
    this.api = api;
    this.maxWorkers = options.maxWorkers ?? 5;
    this.onProgress = options.onProgress || (() => {});
    this.onPercent = options.onPercent || (() => {});
    this.stats = { copied: 0, skipped: 0, sizeMb: 0, failed: [] };
    this._stop = false;
    this._progressTotal = 1;
    this._progressDone = 0;
    /** @type {DestFolderCache | null} */
    this._destCache = null;
  }

  resetStats() {
    this.stats = { copied: 0, skipped: 0, sizeMb: 0, failed: [] };
    this._stop = false;
    this._progressDone = 0;
  }

  /**
   * @param {number} total
   */
  setProgressTotal(total) {
    this._progressTotal = Math.max(1, total);
    this._emitPercent();
  }

  _tickProgress() {
    this._progressDone += 1;
    this._emitPercent();
  }

  _emitPercent() {
    const pct = Math.min(
      100,
      Math.round((this._progressDone / this._progressTotal) * 100)
    );
    this.onPercent(pct);
  }

  /**
   * @param {string} label
   * @param {unknown} err
   */
  _recordFailure(label, err) {
    this.stats.failed.push({
      name: label,
      error: String(/** @type {Error} */ (err).message || err),
    });
    this._tickProgress();
  }

  /**
   * @param {string[]} sourceIds
   * @param {string} destParentFolderId
   * @param {{ duplicateMode?: DuplicateMode }} [options]
   */
  async copySelection(sourceIds, destParentFolderId, options = {}) {
    const duplicateMode = options.duplicateMode ?? 'rewrite';
    this.resetStats();
    this._destCache = new DestFolderCache(this.api);
    try {
      const total = await this.countSelectionFilesParallel(sourceIds);
      this.setProgressTotal(total);

      for (const sourceId of sourceIds) {
        if (this._stop) {
          break;
        }
        await this.copyResource(sourceId, destParentFolderId, { duplicateMode });
      }
      this.onPercent(100);
      return this.stats;
    } finally {
      this._destCache = null;
    }
  }

  /**
   * @param {string[]} sourceIds
   */
  async countSelectionFilesParallel(sourceIds) {
    if (!sourceIds.length) {
      return 1;
    }
    const counts = new Array(sourceIds.length).fill(0);
    await this.runPool(
      sourceIds.map((id, i) => ({ id, i })),
      async ({ id, i }) => {
        const n = await this.api.countFilesRecursive(id);
        counts[i] = n === 0 ? 1 : n;
      }
    );
    return Math.max(1, counts.reduce((a, b) => a + b, 0));
  }

  /**
   * @param {string} sourceId
   * @param {string} destParentFolderId
   * @param {{ duplicateMode?: DuplicateMode }} [options]
   */
  async copyResource(sourceId, destParentFolderId, options = {}) {
    const duplicateMode = options.duplicateMode ?? 'rewrite';
    const ownCache = !this._destCache;
    if (ownCache) {
      this._destCache = new DestFolderCache(this.api);
    }
    try {
      const meta = await this.api.getFile(sourceId);
      this.onProgress(`Source: ${meta.name}`);

      if (meta.mimeType === FOLDER_MIME) {
        const existing = await this.findDestFolder(
          destParentFolderId,
          meta.name
        );
        if (existing) {
          if (duplicateMode === 'skip') {
            this.stats.skipped += 1;
            this.onProgress(`Skipped (folder exists): ${meta.name}`);
            const pending = await this.api.countFilesRecursive(sourceId);
            this._progressDone += pending;
            this._emitPercent();
            return this.stats;
          }
          await this.api.deleteFile(existing.id);
          if (this._destCache) {
            await this._destCache.afterDeleteFolder(
              destParentFolderId,
              existing.id
            );
          }
        }
        const subDestId = await this.api.createFolder(
          destParentFolderId,
          meta.name
        );
        if (this._destCache) {
          await this._destCache.afterCreateFolder(
            destParentFolderId,
            subDestId,
            meta.name
          );
        }
        await this.copyFolderRecursive(sourceId, subDestId, { duplicateMode });
        const nFiles = await this.api.countFilesRecursive(sourceId);
        if (nFiles === 0) {
          this._tickProgress();
        }
      } else {
        await this.copySingleFile(destParentFolderId, meta, duplicateMode);
      }
      return this.stats;
    } finally {
      if (ownCache) {
        this._destCache = null;
      }
    }
  }

  /**
   * @param {string} destParentFolderId
   * @param {string} name
   */
  async findDestFolder(destParentFolderId, name) {
    if (this._destCache) {
      return this._destCache.findFolderInParent(destParentFolderId, name);
    }
    return this.api.findFolderInParent(destParentFolderId, name);
  }

  /**
   * @param {string} destFolderId
   * @param {{ id: string, name?: string, mimeType?: string, size?: string }} meta
   * @param {DuplicateMode} duplicateMode
   */
  async copySingleFile(destFolderId, meta, duplicateMode) {
    const sourceName = meta.name || '';
    const targets = this._destCache
      ? await this._destCache.getOverwriteTargets(destFolderId, sourceName)
      : await this.api.findOverwriteTargets(destFolderId, sourceName);
    if (targets.length) {
      if (duplicateMode === 'skip') {
        this.stats.skipped += 1;
        this.onProgress(`Skipped (exists): ${meta.name}`);
        this._tickProgress();
        return;
      }
      for (const t of targets) {
        await this.api.deleteFile(t.id);
      }
      if (this._destCache) {
        await this._destCache.afterDeleteFiles(
          destFolderId,
          targets.map((t) => t.id)
        );
      }
    }
    try {
      const copied = await this.api.copyFileTo(destFolderId, meta);
      if (this._destCache && copied?.id) {
        await this._destCache.afterCopyFile(destFolderId, {
          id: copied.id,
          name: copied.name || meta.name,
        });
      }
      this.stats.copied += 1;
      this.stats.sizeMb += Number(meta.size || 0) / (1024 * 1024);
      this.onProgress(`Copied: ${meta.name}`);
      this._tickProgress();
    } catch (err) {
      if (isRateOrTransientError(err)) {
        this._recordFailure(meta.name || meta.id, err);
        return;
      }
      throw err;
    }
  }

  /**
   * @param {string} sourceFolderId
   * @param {string} destFolderId
   * @param {{ duplicateMode: DuplicateMode }} opts
   */
  async copyFolderRecursive(sourceFolderId, destFolderId, opts) {
    const { duplicateMode } = opts;
    if (this._stop) {
      return;
    }
    const items = await this.api.listChildren(sourceFolderId);
    const files = [];
    const subfolders = [];

    for (const item of items) {
      if (item.mimeType === FOLDER_MIME) {
        subfolders.push(item);
      } else {
        files.push(item);
      }
    }

    await this.runPool(files, async (file) => {
      if (this._stop) {
        return;
      }
      await this.copySingleFile(destFolderId, file, duplicateMode);
    });

    for (const folder of subfolders) {
      if (this._stop) {
        break;
      }
      const existing = await this.findDestFolder(destFolderId, folder.name);
      let subDestId;
      if (existing) {
        if (duplicateMode === 'skip') {
          this.stats.skipped += 1;
          subDestId = existing.id;
        } else {
          await this.api.deleteFile(existing.id);
          if (this._destCache) {
            await this._destCache.afterDeleteFolder(destFolderId, existing.id);
          }
          subDestId = await this.api.createFolder(destFolderId, folder.name);
          if (this._destCache) {
            await this._destCache.afterCreateFolder(
              destFolderId,
              subDestId,
              folder.name
            );
          }
        }
      } else {
        subDestId = await this.api.createFolder(destFolderId, folder.name);
        if (this._destCache) {
          await this._destCache.afterCreateFolder(
            destFolderId,
            subDestId,
            folder.name
          );
        }
      }
      await this.copyFolderRecursive(folder.id, subDestId, opts);
    }
  }

  /**
   * @template T
   * @param {T[]} items
   * @param {(item: T) => Promise<void>} worker
   */
  async runPool(items, worker) {
    const queue = [...items];
    const workers = Math.min(this.maxWorkers, queue.length || 1);
    const runOne = async () => {
      while (queue.length && !this._stop) {
        const item = queue.shift();
        if (item) {
          await worker(item);
        }
      }
    };
    await Promise.all(Array.from({ length: workers }, () => runOne()));
  }
}

export { DriveApiClient };

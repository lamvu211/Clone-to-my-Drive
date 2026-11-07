/**
 * Google Drive API v3 client helpers (fetch-based, injectable for tests).
 */

const DRIVE_BASE = 'https://www.googleapis.com/drive/v3';

/**
 * @param {Response} res
 * @returns {Promise<any>}
 */
async function parseJsonOrThrow(res) {
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(body.error?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  if (res.status === 204 || !text) {
    return {};
  }
  return body;
}

/**
 * @param {unknown} err
 */
export function isRateOrTransientError(err) {
  const status = /** @type {{ status?: number }} */ (err).status;
  const msg = String(/** @type {Error} */ (err).message || '');
  return (
    status === 403 ||
    status === 429 ||
    status === 500 ||
    status === 503 ||
    msg.includes('rateLimitExceeded') ||
    msg.includes('userRateLimitExceeded')
  );
}

/**
 * @typedef {{ getAccessToken: (interactive: boolean) => Promise<string>, fetch?: typeof fetch }} DriveApiDeps
 */

export class DriveApiClient {
  /**
   * @param {DriveApiDeps} deps
   */
  constructor(deps) {
    this.deps = deps;
    // fetch must stay bound to globalThis — unbound references throw "Illegal invocation"
    // in MV3 service workers when called as this.fetchFn(...).
    this.fetchFn =
      deps.fetch || ((...args) => globalThis.fetch(...args));
    /** @type {string | null} */
    this._myDriveRootId = null;
  }

  /**
   * @param {string} pathWithQuery e.g. /files/abc?supportsAllDrives=true
   * @param {RequestInit} init
   * @param {boolean} [interactive]
   */
  async request(pathWithQuery, init = {}, interactive = false) {
    const token = await this.deps.getAccessToken(interactive);
    const headers = {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
    };
    if (init.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    const url = pathWithQuery.startsWith('http')
      ? pathWithQuery
      : `${DRIVE_BASE}${pathWithQuery}`;
    return this.fetchFn(url, { ...init, headers });
  }

  /**
   * @template T
   * @param {() => Promise<Response>} fn
   * @param {number} [maxRetries]
   * @returns {Promise<T>}
   */
  async executeWithRetry(fn, maxRetries = 5) {
    let lastErr;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const res = await fn();
        return await parseJsonOrThrow(res);
      } catch (err) {
        lastErr = err;
        const status = err.status;
        const msg = String(err.message || '');
        const rateLimited =
          status === 403 ||
          status === 429 ||
          status === 500 ||
          status === 503 ||
          msg.includes('rateLimitExceeded') ||
          msg.includes('userRateLimitExceeded');
        if (rateLimited && attempt < maxRetries - 1) {
          const sleepMs = 2 ** attempt * 500 + Math.random() * 1000;
          await new Promise((r) => setTimeout(r, sleepMs));
          continue;
        }
        throw err;
      }
    }
    throw lastErr;
  }

  /**
   * @param {string} fileId
   */
  getFile(fileId) {
    return this.executeWithRetry(() =>
      this.request(
        `/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size,trashed&supportsAllDrives=true`
      )
    );
  }

  /**
   * My Drive root folder id (not Shared drives).
   * @returns {Promise<string>}
   */
  async getMyDriveRootId() {
    if (this._myDriveRootId) {
      return this._myDriveRootId;
    }
    const root = await this.executeWithRetry(() =>
      this.request('/files/root?fields=id')
    );
    this._myDriveRootId = root.id;
    return root.id;
  }

  /**
   * @param {string} fileId
   * @returns {Promise<{ id: string, name?: string, mimeType?: string, size?: string } | null>}
   */
  async getFileOptional(fileId) {
    try {
      const meta = await this.getFile(fileId);
      if (meta.trashed) {
        return null;
      }
      return meta;
    } catch (err) {
      const status = /** @type {{ status?: number }} */ (err).status;
      if (status === 404) {
        return null;
      }
      throw err;
    }
  }

  /**
   * @param {string} name
   * @returns {Promise<{ id: string, createdTime?: string }[]>}
   */
  async findFoldersByNameOnRoot(name) {
    const rootId = await this.getMyDriveRootId();
    const escaped = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const q = `'${rootId}' in parents and name = '${escaped}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const params = new URLSearchParams({
      q,
      fields: 'files(id,createdTime)',
      orderBy: 'createdTime desc',
      pageSize: '50',
      supportsAllDrives: 'false',
    });
    const page = await this.executeWithRetry(() =>
      this.request(`/files?${params.toString()}`)
    );
    return page.files || [];
  }

  /**
   * @param {string} parentId
   * @param {string} name
   * @returns {Promise<string>} new folder id
   */
  async createFolder(parentId, name) {
    const parent =
      parentId === 'root' ? await this.getMyDriveRootId() : parentId;
    const created = await this.executeWithRetry(() =>
      this.request('/files?supportsAllDrives=true', {
        method: 'POST',
        body: JSON.stringify({
          name,
          mimeType: FOLDER_MIME,
          parents: [parent],
        }),
      })
    );
    return created.id;
  }

  /**
   * @param {string} folderId
   */
  async ensureFolderReady(folderId) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const meta = await this.getFileOptional(folderId);
      if (meta?.mimeType === FOLDER_MIME) {
        return folderId;
      }
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
    }
    const err = new Error('Destination folder is not available.');
    err.code = 'DEST_FOLDER_UNAVAILABLE';
    throw err;
  }

  /**
   * @param {string} parentId
   * @param {string} name
   */
  async findFolderInParent(parentId, name) {
    return this.findByNameInParent(parentId, name, FOLDER_MIME);
  }

  /**
   * @param {string} parentId
   * @param {string} name
   */
  async findFileInParent(parentId, name) {
    const files = await this.findAllFilesByNameInParent(parentId, name);
    return files[0] || null;
  }

  /**
   * All non-folder files in parent matching exact name (Drive allows duplicates).
   * @param {string} parentId
   * @param {string} name
   */
  async findAllFilesByNameInParent(parentId, name) {
    if (!name) {
      return [];
    }
    const escaped = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const q = `'${parentId}' in parents and name = '${escaped}' and mimeType != 'application/vnd.google-apps.folder' and trashed = false`;
    const out = [];
    let pageToken = null;
    do {
      const params = new URLSearchParams({
        q,
        fields: 'files(id,name),nextPageToken',
        pageSize: '100',
        supportsAllDrives: 'true',
        includeItemsFromAllDrives: 'true',
      });
      if (pageToken) {
        params.set('pageToken', pageToken);
      }
      const page = await this.executeWithRetry(() =>
        this.request(`/files?${params.toString()}`)
      );
      out.push(...(page.files || []));
      pageToken = page.nextPageToken || null;
    } while (pageToken);
    return out;
  }

  /**
   * Files to replace when overwriting a prior clone (includes Drive default "Copy of …" names).
   * @param {string} parentId
   * @param {string} sourceName
   * @returns {Promise<{ id: string, name?: string }[]>}
   */
  async findOverwriteTargets(parentId, sourceName) {
    if (!sourceName) {
      return [];
    }
    const variantNames = new Set([sourceName]);
    const copyOf = `Copy of ${sourceName}`;
    variantNames.add(copyOf);
    /** @type {Map<string, { id: string, name?: string }>} */
    const byId = new Map();
    for (const n of variantNames) {
      for (const f of await this.findAllFilesByNameInParent(parentId, n)) {
        byId.set(f.id, f);
      }
    }
    return [...byId.values()];
  }

  /**
   * @param {string} parentId
   * @param {string} name
   * @param {string} mimeType
   */
  async findByNameInParent(parentId, name, mimeType) {
    const escaped = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const q = `'${parentId}' in parents and name = '${escaped}' and mimeType = '${mimeType}' and trashed = false`;
    const params = new URLSearchParams({
      q,
      fields: 'files(id,name)',
      pageSize: '1',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    });
    const found = await this.executeWithRetry(() =>
      this.request(`/files?${params.toString()}`)
    );
    return found.files?.[0] || null;
  }

  /**
   * @param {string} fileId
   */
  deleteFile(fileId) {
    return this.executeWithRetry(() =>
      this.request(
        `/files/${encodeURIComponent(fileId)}?supportsAllDrives=true`,
        { method: 'DELETE' }
      )
    );
  }

  /**
   * Count non-folder files under id(s) for progress.
   * @param {string[]} rootIds
   */
  async countFilesInSelection(rootIds) {
    let total = 0;
    for (const id of rootIds) {
      const n = await this.countFilesRecursive(id);
      total += n === 0 ? 1 : n;
    }
    return Math.max(total, 1);
  }

  /**
   * @param {string} itemId
   */
  async countFilesRecursive(itemId) {
    const meta = await this.getFile(itemId);
    if (meta.mimeType === FOLDER_MIME) {
      const children = await this.listChildren(itemId);
      let n = 0;
      for (const child of children) {
        n += await this.countFilesRecursive(child.id);
      }
      return n;
    }
    return 1;
  }

  /**
   * @param {string} folderId
   */
  async listChildren(folderId) {
    const files = [];
    let pageToken = null;
    do {
      const q = `'${folderId}' in parents and trashed = false`;
      const params = new URLSearchParams({
        q,
        orderBy: 'folder, name',
        fields: 'files(id,name,mimeType,size),nextPageToken',
        pageSize: '1000',
        supportsAllDrives: 'true',
        includeItemsFromAllDrives: 'true',
      });
      if (pageToken) {
        params.set('pageToken', pageToken);
      }
      const page = await this.executeWithRetry(() =>
        this.request(`/files?${params.toString()}`)
      );
      files.push(...(page.files || []));
      pageToken = page.nextPageToken || null;
    } while (pageToken);
    return files;
  }

  /**
   * @param {string} folderId
   */
  async getExistingNamesInFolder(folderId) {
    const names = new Set();
    let pageToken = null;
    do {
      const q = `'${folderId}' in parents and trashed = false`;
      const params = new URLSearchParams({
        q,
        fields: 'files(name),nextPageToken',
        pageSize: '1000',
        supportsAllDrives: 'true',
        includeItemsFromAllDrives: 'true',
      });
      if (pageToken) {
        params.set('pageToken', pageToken);
      }
      const page = await this.executeWithRetry(() =>
        this.request(`/files?${params.toString()}`)
      );
      for (const item of page.files || []) {
        if (item.name) {
          names.add(item.name);
        }
      }
      pageToken = page.nextPageToken || null;
    } while (pageToken);
    return names;
  }

  /**
   * @param {string} parentId
   * @param {string} name
   */
  async getOrCreateFolder(parentId, name) {
    const escaped = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const q = `'${parentId}' in parents and name = '${escaped}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const params = new URLSearchParams({
      q,
      fields: 'files(id)',
      pageSize: '1',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    });
    const found = await this.executeWithRetry(() =>
      this.request(`/files?${params.toString()}`)
    );
    if (found.files?.length) {
      return found.files[0].id;
    }
    const created = await this.executeWithRetry(() =>
      this.request('/files?supportsAllDrives=true', {
        method: 'POST',
        body: JSON.stringify({
          name,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId],
        }),
      })
    );
    return created.id;
  }

  /**
   * @param {string} destFolderId
   * @param {{ id: string, name?: string }} sourceFile
   */
  copyFileTo(destFolderId, sourceFile) {
    const body = { parents: [destFolderId] };
    if (sourceFile.name) {
      body.name = sourceFile.name;
    }
    return this.executeWithRetry(() =>
      this.request(
        `/files/${encodeURIComponent(sourceFile.id)}/copy?supportsAllDrives=true`,
        {
          method: 'POST',
          body: JSON.stringify(body),
        }
      )
    );
  }
}

export const FOLDER_MIME = 'application/vnd.google-apps.folder';

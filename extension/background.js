import { extractFolderIdFromUrl } from './lib/driveIds.js';
import { DriveApiClient, FOLDER_MIME } from './lib/driveApi.js';
import { DriveCopier } from './lib/driveCopier.js';
import { getListingContext, urlLooksLikeFileNotFolder } from './lib/tabListing.js';
import { resolveDriveCloneFolderId } from './lib/defaultFolder.js';
import {
  ensureSourceNamedContainer,
  shouldUseSourceFolderWrap,
} from './lib/copyWrap.js';

const APP_URL = 'app.html';
const APP_WIDTH = 720;
const APP_HEIGHT = 520;
const SESSION_KEY_APP_WINDOW = 'appWindowId';

/**
 * @returns {Promise<number | null>}
 */
async function readAppWindowId() {
  const data = await chrome.storage.session.get(SESSION_KEY_APP_WINDOW);
  const id = data[SESSION_KEY_APP_WINDOW];
  return typeof id === 'number' ? id : null;
}

/**
 * @param {number | null | undefined} id
 */
async function writeAppWindowId(id) {
  if (id == null) {
    await chrome.storage.session.remove(SESSION_KEY_APP_WINDOW);
    return;
  }
  await chrome.storage.session.set({ [SESSION_KEY_APP_WINDOW]: id });
}

/**
 * Recover app UI window after service worker restart (session may be empty).
 * @returns {Promise<{ windowId: number, tabId: number } | null>}
 */
async function findAppWindowFromTabs() {
  const pattern = `${chrome.runtime.getURL(APP_URL)}*`;
  const tabs = await chrome.tabs.query({ url: pattern });
  const tab = tabs[0];
  if (!tab?.id || tab.windowId == null) {
    return null;
  }
  return { windowId: tab.windowId, tabId: tab.id };
}

/**
 * @param {number} windowId
 * @param {string} url
 * @param {number} [sourceTabId]
 */
async function focusAppWindow(windowId, url, sourceTabId) {
  await chrome.windows.update(windowId, { focused: true, drawAttention: true });
  if (sourceTabId == null) {
    return;
  }
  const tabs = await chrome.tabs.query({ windowId });
  const appTab = tabs.find((t) => t.url?.includes(APP_URL));
  if (appTab?.id) {
    await chrome.tabs.update(appTab.id, { url });
  }
}

/**
 * @returns {Promise<{ left: number, top: number }>}
 */
async function centeredWindowPosition() {
  try {
    const displays = await chrome.system.display.getInfo();
    const primary = displays.find((d) => d.isPrimary) || displays[0];
    if (!primary?.workArea) {
      return { left: 80, top: 80 };
    }
    const { workArea } = primary;
    return {
      left: Math.round(workArea.left + (workArea.width - APP_WIDTH) / 2),
      top: Math.round(workArea.top + (workArea.height - APP_HEIGHT) / 2),
    };
  } catch {
    return { left: 80, top: 80 };
  }
}

/**
 * @param {boolean} interactive
 * @returns {Promise<string>}
 */
function getAccessToken(interactive) {
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

function makeApi() {
  return new DriveApiClient({
    getAccessToken: async () => getAccessToken(false),
  });
}

/**
 * @param {number} [sourceTabId]
 */
async function openAppWindow(sourceTabId) {
  const url =
    sourceTabId != null
      ? `${APP_URL}?sourceTabId=${encodeURIComponent(String(sourceTabId))}`
      : APP_URL;

  let windowId = await readAppWindowId();
  if (windowId != null) {
    try {
      const w = await chrome.windows.get(windowId, { populate: false });
      if (w) {
        await focusAppWindow(windowId, url, sourceTabId);
        return;
      }
    } catch {
      await writeAppWindowId(null);
    }
  }

  const existing = await findAppWindowFromTabs();
  if (existing) {
    await writeAppWindowId(existing.windowId);
    await focusAppWindow(existing.windowId, url, sourceTabId);
    return;
  }

  const pos = await centeredWindowPosition();
  const created = await chrome.windows.create({
    url,
    type: 'popup',
    width: APP_WIDTH,
    height: APP_HEIGHT,
    left: pos.left,
    top: pos.top,
    focused: true,
  });
  if (created.id != null) {
    await writeAppWindowId(created.id);
  }
}

chrome.windows.onRemoved.addListener((windowId) => {
  (async () => {
    const stored = await readAppWindowId();
    if (stored === windowId) {
      await writeAppWindowId(null);
    }
  })();
});

chrome.action.onClicked.addListener(async () => {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const sourceTabId = tabs[0]?.id;
  openAppWindow(sourceTabId).catch((err) => console.error(err));
});

/**
 * @param {string} destFolderLink
 */
async function resolveCustomDestFolderId(destFolderLink) {
  if (urlLooksLikeFileNotFolder(destFolderLink)) {
    const err = new Error('NOT_A_FOLDER_LINK');
    err.code = 'NOT_A_FOLDER_LINK';
    throw err;
  }
  const destId = extractFolderIdFromUrl(destFolderLink);
  if (!destId) {
    throw new Error('Invalid folder link.');
  }
  const api = makeApi();
  const meta = await api.getFile(destId);
  if (meta.mimeType !== FOLDER_MIME) {
    const err = new Error('NOT_A_FOLDER_LINK');
    err.code = 'NOT_A_FOLDER_LINK';
    throw err;
  }
  return destId;
}

/**
 * @param {string} sourcePageUrl
 */
async function listItemsForTab(sourcePageUrl) {
  const ctx = getListingContext(sourcePageUrl);
  const api = makeApi();
  if (ctx.kind === 'invalid') {
    return { ok: false, code: 'NOT_DRIVE' };
  }
  if (ctx.kind === 'file') {
    const meta = await api.getFile(ctx.fileId);
    return {
      ok: true,
      listing: { kind: 'file' },
      items: [
        {
          id: meta.id,
          name: meta.name,
          mimeType: meta.mimeType,
          isFolder: meta.mimeType === FOLDER_MIME,
        },
      ],
    };
  }
  /** @type {string | undefined} */
  let folderName;
  if (ctx.folderId !== 'root') {
    const folderMeta = await api.getFile(ctx.folderId);
    folderName = folderMeta.name;
  }
  const children = await api.listChildren(ctx.folderId);
  return {
    ok: true,
    listing: {
      kind: 'folder',
      folderId: ctx.folderId,
      folderName,
    },
    items: children.map((c) => ({
      id: c.id,
      name: c.name,
      mimeType: c.mimeType,
      isFolder: c.mimeType === FOLDER_MIME,
    })),
  };
}

/**
 * @param {{ destMode: 'default' | 'custom', destFolderLink?: string, sourceIds: string[], duplicateMode: 'skip' | 'rewrite', wrapContainer?: { name: string }, selectionMeta?: { id: string, isFolder?: boolean }[] }} payload
 * @param {(pct: number) => void} onPercent
 */
async function runCopy(payload, onPercent) {
  const api = makeApi();
  let destId;
  if (payload.destMode === 'default') {
    destId = await resolveDriveCloneFolderId(api);
  } else {
    destId = await resolveCustomDestFolderId(payload.destFolderLink || '');
  }
  await api.ensureFolderReady(destId);

  let copyIntoId = destId;
  const listing = payload.listing;
  const selected =
    payload.selectionMeta?.filter((m) =>
      payload.sourceIds.includes(m.id)
    ) ||
    payload.selectionMeta ||
    [];
  if (
    payload.wrapContainer?.name &&
    shouldUseSourceFolderWrap(listing, selected)
  ) {
    copyIntoId = await ensureSourceNamedContainer(
      api,
      destId,
      payload.wrapContainer.name
    );
    await api.ensureFolderReady(copyIntoId);
  }

  const copier = new DriveCopier(api, {
    maxWorkers: 5,
    onPercent: (n) => onPercent(n),
  });
  return copier.copySelection(payload.sourceIds, copyIntoId, {
    duplicateMode: payload.duplicateMode,
  });
}

/** @type {Set<import('chrome.runtime').Port>} */
const progressPorts = new Set();

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'clone-ui') {
    return;
  }
  progressPorts.add(port);
  port.onDisconnect.addListener(() => progressPorts.delete(port));

  port.onMessage.addListener((message) => {
    if (message?.type === 'LOAD_TAB_ITEMS') {
      (async () => {
        try {
          const tabId = message.sourceTabId;
          if (!tabId) {
            port.postMessage({ type: 'LOAD_RESULT', ok: false, code: 'NO_TAB' });
            return;
          }
          const tab = await chrome.tabs.get(tabId);
          if (!tab?.url) {
            port.postMessage({ type: 'LOAD_RESULT', ok: false, code: 'NO_TAB' });
            return;
          }
          const result = await listItemsForTab(tab.url);
          port.postMessage({ type: 'LOAD_RESULT', ...result });
        } catch (err) {
          port.postMessage({
            type: 'LOAD_RESULT',
            ok: false,
            error: String(err.message || err),
          });
        }
      })();
      return;
    }

    if (message?.type === 'START_COPY') {
      (async () => {
        try {
          const stats = await runCopy(message.payload, (pct) => {
            port.postMessage({ type: 'COPY_PROGRESS', percent: pct });
          });
          port.postMessage({ type: 'COPY_RESULT', ok: true, stats });
        } catch (err) {
          port.postMessage({
            type: 'COPY_RESULT',
            ok: false,
            error: String(err.message || err),
            code: /** @type {{ code?: string }} */ (err).code,
          });
        }
      })();
    }
  });
});


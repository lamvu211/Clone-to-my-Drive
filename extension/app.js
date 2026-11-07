import { ensureGoogleSignIn } from './lib/authPopup.js';
import { t } from './lib/i18n.js';
import {
  STORAGE_KEY_DEST_MODE,
  STORAGE_KEY_DUPLICATE_MODE,
  STORAGE_KEY_UI_LOCALE,
  STORAGE_KEY_YOUR_DRIVE_FOLDER_LINK,
} from './lib/storageKeys.js';

/** @typedef {'en' | 'vi'} Locale */

const params = new URLSearchParams(globalThis.location.search);
const sourceTabId = Number.parseInt(params.get('sourceTabId') || '', 10);

const els = {
  langSelect: document.getElementById('langSelect'),
  destDefault: document.getElementById('destDefault'),
  destCustom: document.getElementById('destCustom'),
  destFolderLink: document.getElementById('destFolderLink'),
  copyBtn: document.getElementById('copyBtn'),
  progressPct: document.getElementById('progressPct'),
  progressFill: document.getElementById('progressFill'),
  progressTrack: document.getElementById('progressTrack'),
  status: document.getElementById('status'),
  emptyList: document.getElementById('emptyList'),
  itemTable: document.getElementById('itemTable'),
  itemBody: document.getElementById('itemBody'),
  selectAllCheck: document.getElementById('selectAllCheck'),
  thName: document.getElementById('thName'),
};

/** @type {Locale} */
let locale = 'vi';

/** @type {{ id: string, name: string, mimeType?: string, isFolder: boolean }[]} */
let loadedItems = [];

/** @type {{ kind: 'folder', folderId: string, folderName?: string } | { kind: 'file' } | null} */
let listingInfo = null;

/**
 * @param {string} text
 */
function setStatus(text) {
  els.status.textContent = text;
}

/**
 * @param {number|null} pct
 */
function setProgress(pct) {
  if (pct == null) {
    els.progressPct.textContent = t(locale, 'progressIdle');
    els.progressFill.style.width = '0%';
    els.progressTrack.setAttribute('aria-valuenow', '0');
    return;
  }
  const n = Math.max(0, Math.min(100, Math.round(pct)));
  els.progressPct.textContent = `${n}%`;
  els.progressFill.style.width = `${n}%`;
  els.progressTrack.setAttribute('aria-valuenow', String(n));
}

function syncSelectAllHeader() {
  const boxes = [...document.querySelectorAll('.row-check')];
  if (!boxes.length) {
    els.selectAllCheck.checked = false;
    els.selectAllCheck.indeterminate = false;
    return;
  }
  const nChecked = boxes.filter((b) => /** @type {HTMLInputElement} */ (b).checked).length;
  els.selectAllCheck.checked = nChecked === boxes.length;
  els.selectAllCheck.indeterminate = nChecked > 0 && nChecked < boxes.length;
}

/**
 * @param {boolean} checked
 */
function setAllRowsChecked(checked) {
  for (const cb of document.querySelectorAll('.row-check')) {
    /** @type {HTMLInputElement} */ (cb).checked = checked;
  }
  els.selectAllCheck.checked = checked;
  els.selectAllCheck.indeterminate = false;
}

function toggleAllRowsSelection() {
  const boxes = [...document.querySelectorAll('.row-check')];
  if (!boxes.length) {
    return;
  }
  const allChecked = boxes.every((b) => /** @type {HTMLInputElement} */ (b).checked);
  setAllRowsChecked(!allChecked);
}

function applyI18n() {
  document.getElementById('appTitle').textContent = t(locale, 'title');
  document.getElementById('lblDestDefault').textContent = t(locale, 'destDefault');
  document.getElementById('hintDestDefault').textContent = t(locale, 'destDefaultHint');
  document.getElementById('lblDestCustom').textContent = t(locale, 'destCustom');
  els.destFolderLink.placeholder = t(locale, 'folderLinkPlaceholder');
  document.getElementById('lblDuplicate').textContent = t(locale, 'duplicateLabel');
  document.getElementById('lblDupOverwrite').textContent = t(locale, 'duplicateOverwrite');
  document.getElementById('lblDupSkip').textContent = t(locale, 'duplicateSkip');
  els.copyBtn.textContent = t(locale, 'btnCopy');
  document.getElementById('thName').textContent = t(locale, 'colName');
  document.getElementById('thType').textContent = t(locale, 'colType');
  if (!loadedItems.length && els.emptyList.hidden === false) {
    els.emptyList.textContent = t(locale, 'emptyList');
  }
  els.langSelect.options[0].textContent = t(locale, 'langEn');
  els.langSelect.options[1].textContent = t(locale, 'langVi');
  els.selectAllCheck.setAttribute('aria-label', t(locale, 'btnSelectAll'));
  if (!els.copyBtn.disabled) {
    setProgress(null);
  }
}

function syncDestLinkVisibility() {
  const custom = els.destCustom.checked;
  els.destFolderLink.disabled = !custom;
  if (!custom) {
    els.destFolderLink.classList.add('dest-link-inline');
  }
}

async function loadPrefs() {
  const data = await chrome.storage.local.get([
    STORAGE_KEY_UI_LOCALE,
    STORAGE_KEY_DEST_MODE,
    STORAGE_KEY_DUPLICATE_MODE,
    STORAGE_KEY_YOUR_DRIVE_FOLDER_LINK,
  ]);
  locale = data[STORAGE_KEY_UI_LOCALE] === 'en' ? 'en' : 'vi';
  els.langSelect.value = locale;

  const destMode = data[STORAGE_KEY_DEST_MODE] === 'custom' ? 'custom' : 'default';
  els.destDefault.checked = destMode === 'default';
  els.destCustom.checked = destMode === 'custom';

  const dup = data[STORAGE_KEY_DUPLICATE_MODE] === 'skip' ? 'skip' : 'rewrite';
  const dupRadio = document.querySelector(`input[name="dupMode"][value="${dup}"]`);
  if (dupRadio) {
    /** @type {HTMLInputElement} */ (dupRadio).checked = true;
  }

  els.destFolderLink.value = data[STORAGE_KEY_YOUR_DRIVE_FOLDER_LINK] || '';
  syncDestLinkVisibility();
  applyI18n();
}

function getDupMode() {
  const el = document.querySelector('input[name="dupMode"]:checked');
  return /** @type {HTMLInputElement} */ (el)?.value === 'skip' ? 'skip' : 'rewrite';
}

function getDestMode() {
  return els.destCustom.checked ? 'custom' : 'default';
}

/**
 * @param {{ id: string, name: string, isFolder: boolean }[]} items
 * @param {{ selectAll?: boolean }} [opts]
 */
function renderList(items, opts = {}) {
  const selectAll = opts.selectAll !== false;
  loadedItems = items;
  els.itemBody.replaceChildren();
  if (!items.length) {
    els.itemTable.hidden = true;
    els.emptyList.hidden = false;
    els.emptyList.textContent = t(locale, 'statusNoItems');
    syncSelectAllHeader();
    return;
  }
  els.emptyList.hidden = true;
  els.itemTable.hidden = false;
  for (const item of items) {
    const tr = document.createElement('tr');
    const tdChk = document.createElement('td');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = selectAll;
    cb.dataset.id = item.id;
    cb.className = 'row-check';
    cb.addEventListener('change', syncSelectAllHeader);
    tdChk.appendChild(cb);
    const tdName = document.createElement('td');
    tdName.className = 'name-cell';
    tdName.textContent = item.name;
    tdName.addEventListener('click', () => {
      cb.checked = !cb.checked;
      syncSelectAllHeader();
    });
    const tdType = document.createElement('td');
    tdType.textContent = item.isFolder ? t(locale, 'typeFolder') : t(locale, 'typeFile');
    tr.append(tdChk, tdName, tdType);
    els.itemBody.appendChild(tr);
  }
  els.selectAllCheck.checked = selectAll;
  els.selectAllCheck.indeterminate = false;
}

function getSelectedIds() {
  return [...document.querySelectorAll('.row-check:checked')].map((el) =>
    /** @type {HTMLInputElement} */ (el).dataset.id
  );
}

function connectPort() {
  return chrome.runtime.connect({ name: 'clone-ui' });
}

/**
 * Auto-load list from the Drive tab when the window opens.
 */
async function autoLoadTabItems() {
  if (!sourceTabId) {
    setStatus(t(locale, 'statusNeedDriveTab'));
    renderList([], { selectAll: false });
    return;
  }
  els.emptyList.hidden = false;
  els.itemTable.hidden = true;
  els.emptyList.textContent = t(locale, 'statusLoading');
  setStatus('');

  const port = connectPort();
  try {
    try {
      await ensureGoogleSignIn({ allowInteractive: true });
    } catch {
      setStatus(t(locale, 'statusNeedSignIn'));
      els.emptyList.textContent = t(locale, 'emptyList');
      return;
    }
    await new Promise((resolve) => {
      port.postMessage({ type: 'LOAD_TAB_ITEMS', sourceTabId });
      port.onMessage.addListener(function onLoad(msg) {
        if (msg?.type !== 'LOAD_RESULT') {
          return;
        }
        port.onMessage.removeListener(onLoad);
        if (!msg.ok) {
          if (msg.code === 'NOT_DRIVE') {
            setStatus(t(locale, 'statusNeedDriveTab'));
          } else {
            setStatus(msg.error || t(locale, 'statusNeedDriveTab'));
          }
          renderList([], { selectAll: false });
          resolve();
          return;
        }
        listingInfo = msg.listing || null;
        renderList(msg.items || [], { selectAll: true });
        setStatus('');
        resolve();
      });
    });
  } catch (err) {
    setStatus(String(err.message || err));
  }
}

async function init() {
  await loadPrefs();

  els.langSelect.addEventListener('change', async () => {
    locale = els.langSelect.value === 'en' ? 'en' : 'vi';
    await chrome.storage.local.set({ [STORAGE_KEY_UI_LOCALE]: locale });
    applyI18n();
    if (loadedItems.length) {
      renderList(loadedItems, { selectAll: els.selectAllCheck.checked });
    }
  });

  for (const el of [els.destDefault, els.destCustom]) {
    el.addEventListener('change', async () => {
      syncDestLinkVisibility();
      await chrome.storage.local.set({
        [STORAGE_KEY_DEST_MODE]: getDestMode(),
      });
    });
  }

  for (const el of document.querySelectorAll('input[name="dupMode"]')) {
    el.addEventListener('change', async () => {
      await chrome.storage.local.set({
        [STORAGE_KEY_DUPLICATE_MODE]: getDupMode(),
      });
    });
  }

  const saveLink = async () => {
    await chrome.storage.local.set({
      [STORAGE_KEY_YOUR_DRIVE_FOLDER_LINK]: els.destFolderLink.value.trim(),
    });
  };
  els.destFolderLink.addEventListener('change', saveLink);
  els.destFolderLink.addEventListener('input', () => {
    if (els.destCustom.checked) {
      saveLink().catch(() => {});
    }
  });

  els.selectAllCheck.addEventListener('change', () => {
    setAllRowsChecked(els.selectAllCheck.checked);
  });

  els.thName.addEventListener('click', () => {
    toggleAllRowsSelection();
  });
  els.thName.setAttribute('role', 'button');
  els.thName.setAttribute('tabindex', '0');
  els.thName.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      toggleAllRowsSelection();
    }
  });

  els.copyBtn.addEventListener('click', async () => {
    const ids = getSelectedIds().filter(Boolean);
    if (!ids.length) {
      setStatus(t(locale, 'statusPickOne'));
      return;
    }
    if (getDestMode() === 'custom') {
      const link = els.destFolderLink.value.trim();
      if (!link) {
        setStatus(t(locale, 'statusEnterFolderLink'));
        return;
      }
      await chrome.storage.local.set({
        [STORAGE_KEY_YOUR_DRIVE_FOLDER_LINK]: link,
      });
    }

    els.copyBtn.disabled = true;
    setProgress(0);
    setStatus(t(locale, 'statusCopying'));

    const port = connectPort();
    try {
      await ensureGoogleSignIn({ allowInteractive: true });
    } catch {
      setStatus(t(locale, 'statusNeedSignIn'));
      els.copyBtn.disabled = false;
      setProgress(null);
      return;
    }

    function onCopyMsg(msg) {
      if (msg?.type === 'COPY_PROGRESS') {
        setProgress(msg.percent);
      }
      if (msg?.type === 'COPY_RESULT') {
        port.onMessage.removeListener(onCopyMsg);
        els.copyBtn.disabled = false;
        setProgress(100);
        if (!msg.ok) {
          if (msg.code === 'NOT_A_FOLDER_LINK') {
            setStatus(t(locale, 'statusInvalidFolderLink'));
          } else {
            setStatus(String(msg.error || 'Copy failed.'));
          }
          return;
        }
        const s = msg.stats;
        const failedCount = (s.failed || []).length;
        if (s.copied === 0 && s.skipped === 0 && failedCount === 0) {
          setStatus(t(locale, 'statusNothingCopied'));
          return;
        }
        let text = `${t(locale, 'statusDone')}\n${t(locale, 'statsSummary', {
          copied: s.copied,
          skipped: s.skipped,
          failed: failedCount,
        })}`;
        if (s.failed?.length) {
          text += `\n${t(locale, 'failedListTitle')}\n`;
          text += s.failed.map((f) => `• ${f.name}`).join('\n');
        }
        setStatus(text);
      }
    }
    port.onMessage.addListener(onCopyMsg);

    const selectionMeta = loadedItems
      .filter((item) => ids.includes(item.id))
      .map((item) => ({ id: item.id, isFolder: item.isFolder }));
    const wrapContainer =
      listingInfo?.kind === 'folder' && listingInfo.folderName
        ? { name: listingInfo.folderName }
        : undefined;

    port.postMessage({
      type: 'START_COPY',
      payload: {
        destMode: getDestMode(),
        destFolderLink: els.destFolderLink.value.trim(),
        sourceIds: ids,
        duplicateMode: getDupMode(),
        listing: listingInfo || undefined,
        selectionMeta,
        wrapContainer,
      },
    });
  });

  await autoLoadTabItems();
}

init();

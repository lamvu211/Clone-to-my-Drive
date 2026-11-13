/** Default visible data rows in the file/folder list at initial popup height. */
export const LIST_ROWS_DEFAULT = 6;

/** Maximum data rows before the list scrolls inside the popup. */
export const LIST_ROWS_MAX = 20;

/** Initial popup height (px) when the window is first opened; refined after layout measure. */
export const APP_WINDOW_HEIGHT_DEFAULT = 520;

/**
 * @param {number} itemCount
 * @param {{ defaultRows?: number, maxRows?: number }} [opts]
 * @returns {number}
 */
export function visibleListRows(itemCount, opts = {}) {
  const defaultRows = opts.defaultRows ?? LIST_ROWS_DEFAULT;
  const maxRows = opts.maxRows ?? LIST_ROWS_MAX;
  const need = itemCount > 0 ? itemCount : defaultRows;
  return Math.min(maxRows, Math.max(defaultRows, need));
}

/**
 * Exact list viewport height (px): header + N full data rows (or N rows when empty state).
 * @param {number} visibleRows
 * @param {number} rowHeightPx
 * @param {{ headerHeightPx?: number, hasTable?: boolean }} [opts]
 * @returns {number}
 */
export function listViewportHeightPx(visibleRows, rowHeightPx, opts = {}) {
  const rowH = Math.round(rowHeightPx);
  const hasTable = opts.hasTable !== false;
  if (!hasTable) {
    return visibleRows * rowH;
  }
  const headerH = Math.round(opts.headerHeightPx ?? rowH);
  return headerH + visibleRows * rowH;
}

/**
 * @param {number} listViewportPx
 * @param {number} appChromePx fixed chrome above/below list (header, dest, footer…)
 * @returns {number}
 */
export function windowHeightForListViewport(listViewportPx, appChromePx) {
  return Math.round(appChromePx + listViewportPx);
}

/**
 * @param {number} visibleRows
 * @param {number} rowHeightPx
 * @param {number} appChromePx
 * @param {{ headerHeightPx?: number, hasTable?: boolean }} [opts]
 * @returns {number}
 */
export function windowHeightForVisibleRows(visibleRows, rowHeightPx, appChromePx, opts = {}) {
  const listH = listViewportHeightPx(visibleRows, rowHeightPx, opts);
  return windowHeightForListViewport(listH, appChromePx);
}

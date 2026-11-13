import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LIST_ROWS_DEFAULT,
  LIST_ROWS_MAX,
  visibleListRows,
  listViewportHeightPx,
  windowHeightForListViewport,
  windowHeightForVisibleRows,
} from '../extension/lib/listViewport.js';

test('visibleListRows clamps between default and max', () => {
  assert.equal(visibleListRows(0), LIST_ROWS_DEFAULT);
  assert.equal(visibleListRows(2), LIST_ROWS_DEFAULT);
  assert.equal(visibleListRows(6), LIST_ROWS_DEFAULT);
  assert.equal(visibleListRows(7), 7);
  assert.equal(visibleListRows(20), LIST_ROWS_MAX);
  assert.equal(visibleListRows(100), LIST_ROWS_MAX);
});

test('listViewportHeightPx is an exact multiple of row height', () => {
  const rowH = 33.7;
  const headerH = 32.1;
  const listH = listViewportHeightPx(20, rowH, { headerHeightPx: headerH });
  assert.equal(listH, Math.round(headerH) + 20 * Math.round(rowH));
});

test('windowHeightForVisibleRows grows by one row at a time', () => {
  const rowH = 34;
  const headerH = 34;
  const chrome = 282;
  assert.equal(
    windowHeightForVisibleRows(LIST_ROWS_DEFAULT, rowH, chrome, {
      headerHeightPx: headerH,
    }),
    windowHeightForListViewport(listViewportHeightPx(6, rowH, { headerHeightPx: headerH }), chrome)
  );
  assert.equal(
    windowHeightForVisibleRows(LIST_ROWS_MAX, rowH, chrome, { headerHeightPx: headerH }),
    windowHeightForVisibleRows(LIST_ROWS_DEFAULT, rowH, chrome, { headerHeightPx: headerH }) +
      (LIST_ROWS_MAX - LIST_ROWS_DEFAULT) * rowH
  );
});

/** @typedef {'en' | 'vi'} Locale */

/** @type {Record<Locale, Record<string, string>>} */
const MESSAGES = {
  en: {
    title: 'Clone to MyDrive',
    destCustom: 'Clone to folder',
    destCustomHint: 'Enter your Google Drive folder link',
    destDefault: 'Default',
    destDefaultHint: 'Save automatically to the DriveClone folder in My Drive',
    folderLinkPlaceholder: 'https://drive.google.com/drive/folders/...',
    duplicateLabel: 'If name exists',
    duplicateSkip: 'Skip',
    duplicateOverwrite: 'Overwrite',
    btnLoad: 'Load',
    btnCopy: 'Copy',
    btnSelectAll: 'Select all',
    btnSelectNone: 'Unselect all',
    colName: 'Name',
    colType: 'Type',
    typeFolder: 'Folder',
    typeFile: 'File',
    progressIdle: '—%',
    statusLoading: 'Loading list…',
    statusCopying: 'Copying…',
    statusDone: 'Copy finished.',
    statusNothingCopied:
      'No files were copied. Sign in again, pick items, or check the destination folder.',
    statusNeedSignIn: 'Sign in with Google to continue.',
    statusNeedDriveTab: 'Open a Google Drive page in the active tab, then Load.',
    statusPickOne: 'Select at least one item.',
    statusEnterFolderLink: 'Enter a destination folder link.',
    statusInvalidFolderLink: 'That link is not a folder. Use a Drive folder link.',
    statusNoItems: 'Nothing to list on this page.',
    statsSummary: 'Copied: {copied} | Skipped: {skipped} | Failed: {failed}',
    failedListTitle: 'Not copied:',
    emptyList: 'Click Load to list items from the current Drive tab.',
    langEn: 'English',
    langVi: 'Tiếng Việt',
  },
  vi: {
    title: 'Clone to MyDrive',
    destCustom: 'Clone to folder',
    destCustomHint: 'Nhập đường link folder Google Drive của bạn',
    destDefault: 'Default',
    destDefaultHint: 'Tự động lưu vào folder DriveClone trong My Drive',
    folderLinkPlaceholder: 'https://drive.google.com/drive/folders/...',
    duplicateLabel: 'Khi trùng tên',
    duplicateSkip: 'Bỏ qua',
    duplicateOverwrite: 'Ghi đè',
    btnLoad: 'Load',
    btnCopy: 'Copy',
    btnSelectAll: 'Chọn tất cả',
    btnSelectNone: 'Bỏ chọn tất cả',
    colName: 'Tên',
    colType: 'Loại',
    typeFolder: 'Thư mục',
    typeFile: 'Tệp',
    progressIdle: '—%',
    statusLoading: 'Đang tải danh sách…',
    statusCopying: 'Đang copy…',
    statusDone: 'Hoàn thành copy.',
    statusNothingCopied:
      'Không có file nào được copy. Hãy đăng nhập lại, chọn mục, hoặc kiểm tra folder đích.',
    statusNeedSignIn: 'Hãy đăng nhập Google để tiếp tục.',
    statusNeedDriveTab: 'Mở trang Google Drive trên tab đang dùng, rồi bấm Load.',
    statusPickOne: 'Hãy chọn ít nhất một mục.',
    statusEnterFolderLink: 'Hãy nhập link folder đích.',
    statusInvalidFolderLink: 'Link không phải folder. Hãy dùng link thư mục Drive.',
    statusNoItems: 'Trang này không có mục nào để liệt kê.',
    statsSummary: 'Đã copy: {copied} | Bỏ qua: {skipped} | Lỗi: {failed}',
    failedListTitle: 'Chưa copy được:',
    emptyList: 'Bấm Load để lấy danh sách từ tab Drive hiện tại.',
    langEn: 'English',
    langVi: 'Tiếng Việt',
  },
};

/**
 * @param {Locale} locale
 * @param {string} key
 * @param {Record<string, string|number>} [vars]
 */
export function t(locale, key, vars) {
  const table = MESSAGES[locale] || MESSAGES.en;
  let s = table[key] ?? MESSAGES.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return s;
}

export { MESSAGES };

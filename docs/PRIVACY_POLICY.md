# Privacy Policy — Clone to My Drive

**Last updated:** 2026-11-07

**Clone to My Drive** is a Chrome extension that copies Google Drive items you select into a destination folder on your Google account.

## What data we process

| Data | Where it stays | Why |
|------|----------------|-----|
| Google sign-in token | Managed by Chrome (`chrome.identity`); not stored on the developer’s servers | Your own Google account — lets the extension call **your** Google Drive when you click Copy |
| Destination folder URL, UI language, copy options (default vs custom folder, skip/overwrite) | **On your device only** (`chrome.storage.local`) | Remembers your preferences between sessions |
| URL of the tab that was active when you opened the app window | Read from that tab once per open; used only to list items to copy | Know which Drive folder or file you are copying from |
| File and folder names, IDs, and types shown in the list | Fetched from **Google Drive API** when you use the extension; displayed in the app window | Lets you choose what to copy |

The extension uses **one** Google sign-in application (OAuth client) published by the extension author; that does **not** give the author access to your Drive. Only **you** approve access to **your** account.

We do **not** run our own backend. We do **not** sell data. We do **not** use analytics or advertising trackers.

## Third parties

The extension talks only to **Google** services:

- Google account sign-in (via Chrome)
- [Google Drive API](https://developers.google.com/drive) to list and copy files you select

Google’s privacy policy applies to data handled by Google: [Google Privacy Policy](https://policies.google.com/privacy).

## Data sharing

We do not share your data with anyone other than Google, as required to perform copies you request. We do not transmit your data to the extension developer’s servers.

## Retention and deletion

- Preferences on your device remain until you remove them or uninstall the extension / clear its site data in `chrome://extensions`.
- OAuth tokens are managed by Chrome; you can revoke access anytime at [Google Account → Third-party access](https://myaccount.google.com/permissions).

## Children

The extension is not directed at children under 13.

## Changes

We may update this policy when the extension changes. The “Last updated” date at the top will change. Material changes will be noted in Chrome Web Store release notes when applicable.

## Contact

For privacy or support questions about this extension:

- Email: **lamvu211@gmail.com**

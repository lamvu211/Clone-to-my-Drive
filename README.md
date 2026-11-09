# Clone to My Drive (Chrome extension)

Copy files and folders from the **Google Drive tab you have open** into **a folder on your Drive** — Google performs the copy on its servers (no downloading to your computer). Same general idea as [SharedDrive-to-MyDrive](https://github.com/lamvu211/SharedDrive-to-MyDrive).

## End users

See **[docs/HUONG_DAN_NGUOI_DUNG.md](docs/HUONG_DAN_NGUOI_DUNG.md)** (Vietnamese):

1. Install from the **Chrome Web Store**.
2. Open a **Google Drive** tab (folder, file, Doc, Sheet, …).
3. Click the **extension icon** → a small window opens with the file list and options.
4. Pick destination (**Default** = `DriveClone` on My Drive, or paste a folder link) → **Copy**.
5. The first time, approve **Google Drive access** when Chrome asks.

Your last-used folder link and UI preferences are saved on your device until you clear extension data.

## How it works

| Source tab | What happens |
|------------|----------------|
| Folder | Creates or reuses a subfolder with the same name under your destination, then copies contents (optional skip/overwrite for duplicate names). |
| Single file / Google Doc / Sheet / … | Copies into the destination folder according to your duplicate setting. |

Up to 5 parallel copy jobs; retries on Google rate limits (aligned with the reference Python tool).

## Developers

```bash
npm run verify
npm run package:store   # → dist/*.zip for Chrome Web Store
npm run build:icons
```

Privacy policy: **[docs/PRIVACY_POLICY.md](docs/PRIVACY_POLICY.md)** (source) · Public site (OAuth / Store): **https://lamvu211.github.io/Clone-to-my-Drive/privacy.html** after [GitHub Pages is enabled](docs/GITHUB_PAGES_OAUTH.md) · Contact: **lamvu211@gmail.com**

Load unpacked: `chrome://extensions` → Developer mode → **Load unpacked** → select the `extension/` folder.

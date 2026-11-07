# Fix OAuth Branding: verify home page (Google Search Console)

Google **does not** accept `https://github.com/.../repo` as a home page you own. Use **GitHub Pages** on `github.io` instead.

## 1. Enable GitHub Pages

1. Repo [Clone-to-my-Drive](https://github.com/lamvu211/Clone-to-my-Drive) → **Settings** → **Pages**.
2. **Build and deployment** → Source: **Deploy from a branch**.
3. Branch: **master**, folder **/docs** → Save.
4. Wait 1–5 minutes. Site: **https://lamvu211.github.io/Clone-to-my-Drive/**

## 2. Google Search Console — prove you own the site

1. Open [Google Search Console](https://search.google.com/search-console).
2. **Add property** → type **URL prefix**:
   `https://lamvu211.github.io/Clone-to-my-Drive/`
3. Verification method **HTML file** (or HTML tag in `docs/index.html`):
   - Download the file Google gives (e.g. `google123abc.html`).
   - Put it in **`docs/`** in this repo, commit, push.
   - Or add the meta tag inside `<head>` of `docs/index.html`.
4. Click **Verify** in Search Console.

Same Google account as Cloud Console is easiest.

## 3. OAuth consent screen → Branding

| Field | URL |
|-------|-----|
| Application home page | `https://lamvu211.github.io/Clone-to-my-Drive/` |
| Privacy policy | `https://lamvu211.github.io/Clone-to-my-Drive/privacy.html` |
| Terms of service | leave empty or same as home |

**Authorized domains:** add **`github.io`**

Save → Branding → **View issues** → **I have fixed the issues** → Proceed → wait **24h** if Google asks before retry.

## 4. Chrome Web Store

Use the same **privacy** URL in the listing.

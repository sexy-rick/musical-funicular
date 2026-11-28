# Plan: Alium download page and website ZIP

## Goal and scope

Update the v13 website in `telegram-catalog-bridge/website/`, then produce a new complete InfinityFree upload ZIP. This is a plan only: no website implementation, deployment, bot/Worker changes, or public-release changes are authorized yet. The owner uploads the ZIP after reviewing it.

## 1. Home page: Download app

- In `index.php`, place a clearly labeled **Download app** button next to the existing **Browse DLCs** button in the hero. It opens `/alium.php`, not the APK directly.
- Keep Browse DLCs pointing to `#catalog` and preserve all catalog search, sort, filters, pagination, request-bot behavior and responsive ordering. Buttons may wrap on small screens; both remain keyboard accessible and visually distinct.

## 2. Alium download page

- Add `/alium.php` as a normal PHP page using the existing shared header, footer and theme controls. Do not replace the existing `download.php`: it is an add-on redirect and must keep working. No new rewrite is needed for the `.php` path.
- Create an Alium-focused, Material 3 Expressive-inspired page with the existing flower app icon, **Alium by Marketplace Trader**, solid purple `#874F9E` accents, clear typography, rounded surfaces and generously sized controls. Respect light/dark theme, high contrast, responsive widths, keyboard focus and reduced motion. No gradients, glow, AI decorations, invented screenshots or misleading claims.
- Explain accurately that Alium is an Android app for browsing and downloading through the user's own Telegram account. Include a prominently labeled **Download Alium for Android** button, Android 7.0+ / API 24 requirement, visible beta status, a short install explanation (open the downloaded APK and allow installation from that source if Android asks), and a link to the official GitHub releases for notes and alternatives. Avoid promising all devices or all files work. Include basic help links without asking for credentials.
- **Proposed download behavior:** link directly to the currently published, verified `v0.1.0` APK (`https://github.com/Alchemiisst/Alium/releases/download/v0.1.0/app-release.apk`) with a separately visible GitHub Releases link. Display the pinned version and beta label; this static link is usable without JavaScript, GitHub API access or server-side calls. When a new version is published, the site maintainer must deliberately update the version, compatibility information and URL in the website ZIP; it does not automatically discover newer betas. Recheck the published release before implementation. Never use GitHub's `/releases/latest` for beta discovery, since prereleases are excluded. Do not host the APK inside the website ZIP or send visitors to an unverified file.
- Use the existing app icon (`android-app/assets/alium_icon.png`) as a local, optimized website image with appropriate alt text; do not assume the JPEG is needed. Clearly identify Android-only availability without hiding the page from desktop/iOS visitors. Avoid manufacturing feature counts or claims of speed.

## 3. Add-on page label

- In the active versioned catalog script, change only the detail-page **Open in Telegram** action's visible text to **Download**. Preserve the selected item's exact UUID in `https://t.me/Mc_addonbot?start=<uuid>`, the user-initiated link, new-tab safety, direct-app fallback, troubleshooting and sharing.
- Keep the adjacent text and an accessible name indicating the button opens Telegram, so **Download** does not imply an immediate browser file download. Update FAQ instructions that quote the old label, while keeping Telegram requirements explicit. Do not change the existing website detail-page KEEP EXPLORING section unless separately requested.

## Asset versioning and ZIP

- Create fresh physical `site-v14.css` and `catalog-v14.js`; update every active template, static error document, tests and package references to the appropriate current filenames, preserving `Cache-Control: no-cache, must-revalidate` on PHP pages. Do not alter unrelated versioned scripts or break shared routes.
- Build a full website upload ZIP with the same root-level layout as v13, including `.htaccess`, new page, icon and referenced assets. Exclude real `config.php`, credentials, private files, APK, source-repository internals and test dependencies; preserve existing `config.php` on the host during upload. Verify archive integrity, paths and required/excluded files. Keep a v13 rollback ZIP.
- No host, Cloudflare Worker, D1, CORS, bot, database schema, secrets or InfinityFree security-challenge changes. No deployment without separate authorization.

## Tests and acceptance

1. PHP lint for website PHP, JavaScript syntax checks, archive integrity and a file/reference audit; no missing versioned CSS/JS or icon.
2. Run relevant existing website tests against v14, including v13 no-result request, search/filter/catalog ordering and share behavior. Add tests for home action, page link, pinned beta APK/release links, FAQ wording and detail Download target, UUID and accessible Telegram context. Test that the legacy `download.php` still behaves as before.
3. Mocked browser testing at phone/tablet/desktop widths, light/dark and enlarged text: no horizontal overflow; actions wrap correctly; visible focus and accessible names; reduced motion; Telegram URL unchanged; download page and fallback usable with JavaScript disabled. Verify versioned assets remain consistent on static error pages.
4. After the owner uploads, separately check the real host, Android download/install prompt, Telegram handoff and InfinityFree security challenge. Local mocks do not prove APK installation, app behavior, live bot delivery or device compatibility. A later higher-code release is required to test Alium's in-app updater.

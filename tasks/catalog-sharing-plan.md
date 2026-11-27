# Plan: catalog download buttons, share links and home route

Status: implemented locally on 2026-11-27; upload to InfinityFree and real-device/host verification are pending. The `?i=1` provider security check was not changed.

## Evidence and constraints

- User screenshots show the Telegram link page in Firefox, an app-opening prompt, a bot screen with a start payload, and the bot sending an InsaneCraft file. This is evidence that a Telegram handoff and file message occurred on their device; do not claim that the 80.4 MB file finished downloading, that every item works, or that the Chrome failure is fixed. Firefox's prompt names another app handler, so the reason for the difference is not yet established.
- The catalog screenshot displays three cards across on a phone; the effective CSS viewport, browser desktop-site setting and zoom are unknown. Current local layout uses viewport breakpoints and produced one column below 600 CSS px. Diagnose on the actual browser with normal site mode, viewport and zoom; preserve one card per mobile row and four per desktop row. Do not assume a CSS pixel width from screenshot dimensions.
- Browser-side public Worker catalog, existing @Mc_addonbot delivery and $0 InfinityFree hosting remain unchanged. No bot/schema deployment is required. Existing `addon.php?uuid=...`, `index.php?cat=...&page=...`, search, pagination and links must keep working. Never bypass host security or expose secrets.

## 1. Card actions

- Refactor cards so the image/title link, Download and Share are separate, accessible controls; do not nest links or buttons. A card Download uses the same current Telegram UUID handoff as the detail page (not a direct file or an invented second storage method), with a clear label and new-tab/app behavior, plus a path to detail for troubleshooting. Share opens the item URL, not a Telegram file or secret.
- Retain large mobile cards, 4 desktop columns, responsive intermediate widths, touch targets, keyboard/focus support, reduced motion and correct search/filter/pagination. Test each control independently at 320/375/599/600/768/900/1024/1440 CSS px including long titles, no overflow and broken thumbnails; verify real device with normal mobile browser mode.

## 2. Shareable, human-readable URLs

- User clarified the version should appear once, with dots converted to hyphens, not as a second `v` segment: proposed `https://marketplacetrader.great-site.net/insanecraft-pack-1-6-bd69bd1d-411b-4a3b-bd6d-764d12692676` (illustration, not yet a working URL). Another example is `/example-craft-1-4-<uuid>` for version 1.4. Build a lowercase, bounded, URL-safe title slug; include an available version once, avoiding duplication when the title already contains it, and place the UUID at the end. Exact punctuation, hyphens, version matching, Unicode normalization, empty titles/version, very long titles and reserved paths need tests. Slug is descriptive only; validated final UUID determines the item, so old shared URLs still work if a title or version changes. Avoid exposing file IDs.
- Add an exact, narrowly scoped Apache rewrite for the slug-plus-UUID route and `/home`; preserve other routes, query parameters, security directives and genuine 404 behavior. Reserve paths such as `/home`, `/assets`, `/errors`, existing PHP routes and `.htaccess`; reject malformed UUID/slug. Test actual rewrite/query precedence and host configuration. Use root-relative assets/navigation so pretty routes resolve correctly. Fall back to existing `addon.php?uuid=...` if hosting cannot support rewrites; never break existing links. No redirect that strips InfinityFree's security query.
- Use the same URL builder from listing and detail so both Share buttons produce a stable absolute HTTPS URL without accidentally including a current search/filter query or `?i=1`. A fresh visitor may still see `?i=1` appended by the host after opening it.
- Use Web Share API on an actual click where available, preserving transient user activation. If unsupported/blocked, offer a copy-link action; if clipboard access is unavailable, display selectable URL. A cancelled share is not an error. Buttons must have an accessible name and visible focus. Source: https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API.
- Client-side rendering and InfinityFree browser challenge mean Telegram/social crawlers might not receive item-specific preview metadata. Ordinary browser viewing is the goal; rich unfurl previews need separate investigation and cannot be promised on this host.

## 3. `/home` and host-added `?i=1`

- Offer `/home` as a friendly route to the existing homepage while preserving `/` and `index.php` and category/search URLs. Use internal navigation to the preferred home route if host rewrite support is verified; test fresh sessions and security parameters.
- InfinityFree says `?i=1` is part of its mandatory free-hosting browser security check and cannot be disabled: https://forum.infinityfree.com/t/browser-security-system-features-and-limitations/49353 and https://forum.infinityfree.com/t/how-to-remove-i-1-from-the-website/113663. `/home` does not guarantee removal; a visitor may land on `/home?i=1`. Do not strip the challenge query or introduce redirects that could loop. Generated share links can be clean, subject to the host adding its parameter on visit.

## Implementation and verification notes

- Added separate Download/Share controls on catalog and search cards and Share on details, with native share and copy/selectable fallback. Added bounded title/version slugs with a final UUID, keeping the version once. Existing detail URLs remain supported and Telegram payloads are unchanged. New `/home` and slug routes are configured using Apache rewrites; root-relative resources avoid route-dependent asset resolution. Host security query parameters are not removed.
- jsdom tests cover URL generation, old/new UUID routes, share/cancel/copy/clipboard denial and safe DOM text. Chromium tests run on PHP-rendered HTML with a **mocked rewrite server**, catalog and Telegram endpoints, including mobile/desktop widths, controls and old assets. Pattern matching was checked independently, but **actual Apache mod_rewrite and InfinityFree routing were not testable locally**. The owner must verify `/home`, an existing `addon.php?uuid=...` link and a copied new share link after upload. A live failure needs rollback to the previous ZIP and investigation, not a claim of host compatibility.
- Android app handoff, actual download completion, share-sheet behavior and preview cards remain unverified on this release. Provider `?i=1` remains possible.

## 4. Tests and release

1. Reproduce the card control and share requirements with tests before implementation; verify old routes and both button types, correct UUIDs, no nested controls, XSS-safe labels and URL construction.
2. Test slug parser/rewrite locally with valid/malformed/missing UUIDs, altered slugs and versions, reserved paths, query strings and server status codes; test directly on InfinityFree after owner upload because local mocks cannot prove host rewrite behavior. If rewrite cannot be verified, keep query route as fallback.
3. Exercise native share, cancellation, clipboard fallback, denied clipboard/manual copy, accessible keyboard/focus states, actual new-tab/app links, and all viewport breakpoints.
4. Version asset filenames, rebuild and verify upload ZIP without private `config.php`, credentials or tests; keep existing `.htaccess` protections and error mappings. Record rollback steps and update handoff.
5. Owner uploads release; test live `/home`, old and new links, first-time host security check, actual phone Chrome/Firefox/Telegram and real file availability. No claim that all shared previews or `?i=1` are fixed without evidence.

# Handoff — Marketplace Trader

## Catalog sharing build (2026-11-27)

- Built local website catalog Download and Share buttons, detail Share, title/version/UUID share URLs with no repeated version, and `/home`; preserved old query detail links, bot payloads and host security query parameters. Added native share with copy/select fallback. New versioned assets `catalog-v5.js` / `site-v5.css`; no Worker, bot or database change.
- PHP lint, Worker/bot unit tests, jsdom and mocked Chromium browser tests pass; phone CSS viewport breakpoints and stale-asset scenario exercised. Rebuilt and verified `website-upload.zip` with `.htaccess` and no real config. Apache rewrite execution and actual InfinityFree host are **unverified**: there is no local Apache binary; browser routing was simulated. After uploading, test `/home`, an old query URL, a shared slug and Android app handoff. Roll back website ZIP if rewrites fail; host may still add `?i=1`, and crawlers may not show rich previews. File download completion remains unverified. See `tasks/catalog-sharing-plan.md`.

## Catalog sharing plan (2026-11-27)

- User screenshots show Telegram opening in Firefox/on-device and a bot file message for InsaneCraft; actual completion of the file download, all items, and Chrome handoff remain unverified. Fresh live homepage fetch returned revised v4 design and 27 listed items. One screenshot shows three columns on a phone; device CSS viewport, zoom and desktop mode are unknown and need verification.
- Planning only: `tasks/catalog-sharing-plan.md` covers separate catalog Download/Share controls, item-page Share, stable title/version/UUID URLs with existing route compatibility, `/home`, accessibility and live-host testing. InfinityFree can add `?i=1` during its mandatory browser check; do not bypass or promise its removal. Share preview crawlers may not pass that check. No implementation or deployment in this planning milestone.

## Telegram new-tab link (2026-11-27)

- User requested a browser deep link that opens in a new tab. Local website now uses an ordinary user-activated `https://t.me/Mc_addonbot?start=<uuid>` link with `_blank` and `noopener noreferrer`; it retains the `tg://` direct-app link and manual `/start <uuid>` fallback. Asset filenames are now v4. No bot, Worker or database changes. Browser or network configuration can still prevent Telegram from opening; Android app launch and file delivery require actual device testing after upload.
- Passed website jsdom tests, PHP lint and Chromium layout tests, including a mocked `t.me` popup that verifies click, new tab and matching UUID. ZIP rebuilt and tested with private config excluded. The owner must upload it; the live site is unchanged until then.

## Telegram opening investigation (2026-11-27)

- User supplied screenshots: Bio Dome detail loaded, then blank `t.me` browser/custom tab with a loading bar. The assistant initially misidentified the line; acknowledged correction. Cause unproven. Live Bio Dome link correctly includes `037f9836-628f-4213-b42d-f03e080ca2e0` and Telegram's t.me preview responds in our environment, but not proof of access on their phone. One screenshot address is truncated and appears to show a different start value; do not assume the complete URL.
- Local mitigation: website detail offers direct `tg://` app link, original HTTPS link, and manual `/start <uuid>` instructions. Versioned assets moved to v3. Both link formats are documented by Telegram; app opening and actual file delivery remain untested on Android. No bot, Worker or schema changes; live bot revision 68 was reported by user. See `tasks/bug-report.md`.
- Rebuilt and verified `website-upload.zip` (no private config). PHP lint, jsdom and Chromium mock website tests passed, including app/web/manual UUID links and 320px overflow. Upload ZIP to take effect; preserve `config.php`. On-phone app launch and file delivery remain unchecked. Custom app links may be blocked, and the t.me/network problem may remain.

## Mobile correction milestone (2026-11-27)

- User uploaded the earlier redesign but screenshots showed new markup paired with old two-column card styling, unstyled header/footer and unwanted decorative symbols. Independent fresh live fetch returned new CSS/JS and 23 catalog listings; the exact state of the phone/browser cache and upload timing is unknown. Live FAQ also rendered. Full import and Telegram delivery remain unverified.
- Reproduced locally by serving new markup with old CSS/JS from `e4d3499`: 320px rendered two columns with overflow. Corrected with physically versioned `assets/site-v2.css` and `assets/catalog-v2.js`, PHP HTML cache revalidation, simplified header/hero and plain-text controls without decorative symbols. All future asset changes must use new names and update templates/error documents.
- See `tasks/bug-report.md` for focused evidence and `tasks/plan.md` for the corrective plan. Rebuilt `website-upload.zip`, verified integrity, versioned assets and exclusion of private `config.php`; upload it again while preserving existing config. The live site will not show this correction until the owner uploads it. Actual InfinityFree/phone verification and custom error response codes are still pending.

## Build milestone (2026-11-27)

- Built a redesigned bridge site locally: 1-column mobile / 4-column desktop catalog, subtle reduced-motion-aware styling, About/FAQ, search/detail recovery, image fallback/lazy loading, and static 403/404/500/502/503/504/505 error documents. Existing public API and Telegram links preserved. Rebuilt `telegram-catalog-bridge/website-upload.zip`, checked archive integrity and excluded actual `config.php`.
- Locally hardened Worker `/sync` to validate JSON content type and stream-limit request bytes. This Worker change is **not deployed** and is not in the website ZIP; separate deployment must preserve `CATALOG`, `SYNC_SECRET` and CORS and verify actual bot sync.
- Passed Worker tests, mocked bot sync tests, jsdom client tests, PHP WASM lint for 11 files and PHP WASM home/FAQ rendering. Headless Chromium with mocked catalog verified 1/2/3/4 columns at 320, 375, 599, 600, 768, 900, 1024 and 1440 px, no horizontal overflow, reduced motion, FAQ disclosure, keyboard focus and generated Telegram link. A 320px search overflow was detected and fixed.
- **Not built:** production rate-limit/WAF, durable sync retries, deletion reconciliation, timestamp ordering fix, API caching/search optimization and R2. No live deployment, real-device/screen-reader audit, real response-code testing on InfinityFree, live bot delivery or completed import. Host/proxy may bypass custom error documents. Existing site remains live until user uploads the new ZIP.

## Current state

- Website: https://marketplacetrader.great-site.net, hosted on InfinityFree. User requested Material 3 Expressive without AI button, gradients or glow. Catalog browser fetches public metadata directly from Cloudflare Worker because InfinityFree intentionally blocks server-side workers.dev connections.
- **Live verified 2026-11-27:** home shows 20 add-ons; search for `furniture` returns matching entries; a detail page renders with the expected Telegram deep link. Fetch-based checks did not test actual Telegram delivery on a device. User confirmed uploading the fixed website ZIP.
- Worker `https://mc-catalog-1474006216.aman-nsipai.workers.dev`, D1 database `mc-catalog-1474006216`, binding `CATALOG`, and Worker sync secret are set up. Worker CORS allows the InfinityFree site; GitHub Actions run 45993085879 deployed and checked catalog and CORS. Do not overwrite bindings or secrets when redeploying.
- User reports a separate bot agent deployed bridge modules to @Mc_addonbot revision 68 with webhook synced; do not replace the live bot with revision 66 without coordinating. The first `/websync` batch reported 20 sent, 0 failed. `/websync` was run twice without a cursor, repeating the same batch. Backfill is incomplete; follow the bot's `Next batch` commands until finished. The last shown cursor is `0465fc68-01ea-41df-8c54-81d51d01511b`.
- Bot sends new/update/delete metadata to Worker; no persistent retry queue. Failed deletions can leave stale site entries; `/websync` does not reconcile deletions. Telegram bot deep link and real sync after Worker redeploy need live testing.
- R2 is deferred until user has a card. Telegram is the only download method currently; website direct downloads/R2 upload and replacement are not implemented. `website/lib/storage_guard.php` is unused and does not enforce the 9.4 GB cap; implement and test a real fail-closed guard before R2 uploads. Never expose bot token.
- User asked to ignore Telegram Serverless's 12 pending database schema changes; do not apply migrations.

## Files

- `telegram-catalog-bridge/website/` and `telegram-catalog-bridge/website-upload.zip` are the **current** deployed site; ZIP excludes `config.php`.
- `telegram-catalog-bridge/cloudflare/worker.js`: public catalog plus authenticated write bridge. `schema.sql` initialized D1. Only public metadata is shared.
- `telegram-catalog-bridge/bot/`: revision-66-derived bridge source used by the other agent; live bot now reported revision 68.
- `telegram-catalog-bridge/README.md`, `GITHUB-DEPLOY.md`: setup information; some earlier manual setup steps are already completed. `DESIGN.md`, `tasks/plan.md`, `AGENTS.md` contain project context.
- `website/` and root `website-upload.zip` are the older MySQL-only site, not the deployed bridge version.
- GitHub Actions workflows in `.github/workflows/` include deliberately triggered creation/deployment checks. Verify D1 binding and preserve sync secret before any Worker redeployment. Never print/request credentials.

## Planning milestone (2026-11-27)

- User requested research only, followed by a consolidated plan. `tasks/ui-research.md`, `tasks/landing-page-research.md` and `tasks/engine-research.md` contain research; `tasks/plan.md` now supersedes the older obsolete plan and lays out incremental UI, FAQ/error, performance, abuse-protection and reliability slices. No website/bot/Worker code or deployment changed during this milestone.
- The requested landing-page contract is one large item per mobile row and four per desktop row. Continue honoring the no-gradient/no-glow preference. `AGENTS.md` and `DESIGN.md` contain older conflicting architecture/layout statements; the plan calls for updating them when implementation begins.
- R2 remains deferred and no storage/billing guard is enforced. The old constant of 10,092,649,186 bytes is approximately 9.4 GiB, not 9.4 decimal GB; confirm units and design fail-closed reservations before any R2 work.

## Next steps

1. Await user approval/request to implement the roadmap; help import remaining existing add-ons via `/websync <cursor>` until Finished, or investigate a safe less-manual batch approach if requested.
2. Test an actual add-on opened via Telegram and a new/updated/deleted bot item end-to-end. Verify post-deployment sync and error handling.
3. When user is ready, plan R2 and a real quota/replacement design before enabling uploads or billing. $0 budget remains mandatory.

**Skipped / Unchecked:** Actual Telegram file delivery on device, completed backfill, automatic sync under failures, deletion reconciliation, R2 and its quota enforcement, complete mobile accessibility testing.
**Residual Risk:** Free-tier limits and hosting availability, stale listings on failed sync, no automatic retry, JavaScript required for catalog.

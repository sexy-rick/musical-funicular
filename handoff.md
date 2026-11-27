# Handoff — Marketplace Trader

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

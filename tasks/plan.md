# Plan — catalog filters, navigation, theme and price investigation

**Date:** 2026-11-27. **Status:** planning only; no site, bot, Worker, D1, ZIP or deployment changes. The user's latest screenshots show the v10-style header and no-results suggestions; exact live asset hashes are not independently verified. This plan supersedes conflicting portions of the earlier roadmap retained below.

## Goals and scope

1. Add sorting and category options that have truthful data, with a filter panel visually inspired by the supplied screenshot. Existing exact category identifiers and pagination must continue to work.
2. Correct my misunderstanding: put **both Search and Filters on the right of the search input**, in that order (input → Search → Filters). Keep 44px controls, accessible names, suggestion behavior and blank-search prevention.
3. Fix theme alignment: the screenshot shows the theme icon jutting outside the select border; `website/assets/site-v10.css:32,42-44` uses negative margins. Replace this with a single stable flex/grid wrapper that positions icon, native select text and chevron inside one outline; preserve Auto/Light/Dark, storage, system preference, focus ring, 44px touch target and error-page controls. Do not suppress the focus ring shown in the other screenshot.
4. Investigate the bot as a possible price source without inventing prices. Separate deployment/migration approval is required; see price slice below.
5. Rename the no-results suggestion heading **“You might like this”** (and update its accessible label, loading/failure text where appropriate, tests and FAQ). Keep it clear these are independent suggestions rather than search matches; feed currently uses latest catalog updates, not personalization.
6. Reduce vertical whitespace above and below “Back to collection” on search and detail pages. `site-v10.css:8` currently sets `.inner-page` top padding, `.page-heading` 38px top margin and `.detail` 36px top margin; adjust page-specific spacing rather than shrinking the link's accessible touch target or unrelated pages.
7. Make known categories clickable from both cards and detail pages, leading to the matching category catalog just like the studio link. Unknown/blank categories remain plain text. Refactor card structure rather than nesting a link inside `.card-link`; preserve card title/image detail link and standalone Download/Share, keyboard support and escape-safe text.

## Data capability and API contract

- Live bridge schema (`telegram-catalog-bridge/cloudflare/schema.sql:2-13`) has `updated_at`, category and creator but **no original upload/creation date, ratings, persona classification or price**. The current Worker (`cloudflare/worker.js:43-60`) supports seven category codes and date ranges, filters before pagination, and sorts by `updated_at DESC, uuid ASC`. `updated_at` is the sync/update timestamp, not the original DLC release date.
- Proposed UI sorts: **Newest updated** and **Oldest updated**, using `updated_at` descending/ascending respectively; give a clear “based on catalog updates” explanation. Do not call this original upload order or recently released DLC. Keep existing default behavior for URLs without a sort. If implementing Relevance, explicitly define a deterministic, query-based ranking (e.g. exact title, title prefix, title substring, creator matches; newest update then UUID as tie-breakers); only label it relevance if actually implemented and tested globally. With no query, fall back to newest updated. Keep Most/Least Rated and original New DLC unavailable/omitted until trusted fields exist; don't fabricate ratings or new releases. The screenshot's “Other” options are unknown, so do not invent them.
- Expose supported Add-Ons (`ADD-ON`), Textures (`TEXTURE PACK`), Worlds (`WORLD`), Mashups (`MASHUP PACK`), Skins (`SKIN PACK`), and retain Template and Application. Persona is not currently supported by the Worker allowlist or catalog schema. Existing bot file-based fallback category is heuristic (`bot/lib/handle_media.js:56-68`), so labels represent catalog classifications, not guaranteed marketplace truth.
- Propose `sort=updated_desc|updated_asc|relevance` as a validated Worker query parameter, default `updated_desc`. Reject unsupported values with 400; use a fixed allowlist of SQL ordering clauses, never interpolate raw user input. Apply sort **before** `LIMIT 24 OFFSET`, include UUID tiebreaker, and preserve `q`, `cat`, `updated`, `creator`, `sort` across apply/search/pagination/back. Reset page to 1 when criteria change. Sorting a fetched 24-item page client-side is not adequate. Offset pagination can still shift under concurrent catalog updates even with a deterministic tie-breaker.
- `website/lib/view.php:10` starts an early query; `assets/catalog-v10.js:76-95` constructs the consumed key and pagination; both must normalize/pass the new parameter identically. Update `filters-v10.js` for form state, cancel/clear, active indicators and hidden search fields. Update tests for malformed sort, old links, combinations, 25+ results, ties, page 2 and early-fetch deduplication. No schema migration is needed for update-time sorting, but a Worker code change and deployment are needed for global oldest-first.

## Price investigation — answer based on inspected source

**Possibly, but not yet like the current name field.** The checked-in bot source `Mc_addonbot/lib/marketplace.js:107-125,420-432` extracts XMC and USD from offer/price-specification data when present; it may also **estimate** USD by dividing coins by 175. The bridge-side upload session temporarily carries `priceCoins`/`priceDollar` (`telegram-catalog-bridge/bot/lib/handle_media.js:279-293`); it can use them in a channel caption (`:348-353,375-393`). But its finalized `files` row (`:635-651`), checked-in `Mc_addonbot/schema.js:10-26`, bridge payload `bot/lib/web_sync.js:9-13`, Worker select/write and D1 schema do not persist or publish those prices. Live bot is user-reported revision 68 and may differ from this checked-in source; current extraction success, price freshness and source/currency semantics are unverified. Existing historical rows cannot simply be assumed to contain a price.

**Separate design / authorization gate:**
- First inspect the actual deployed bot revision and non-secret configuration safely, compare it with checked-in source, check whether current/old records or permitted public responses contain confirmed prices, and review third-party data usage/availability and regional currency semantics. Do not ask the user to paste secrets or fetch encryption keys. No claims of current price accuracy.
- For verified prices, design a bounded optional metadata contract: integer Minecoins where explicitly supplied (including legitimate zero), unknown distinct from free, plus provenance/observed time and currency/region if fiat is ever supported. Do not present the `coins/175` estimate as a genuine USD price; prefer not displaying fiat unless its source is confirmed. Display “Not available” for unknown, never infer free from missing fields.
- To persist, a separately approved additive D1 migration or other durable store, Worker read/sync updates, and coordinated bot changes are likely needed. Consider sending session price during sync without Telegram schema changes for newly processed items, but explicitly design how later syncs preserve known price, how prices expire/refresh, and how deleted/out-of-order/same-second events behave. Existing `/websync` reads the saved row, which has no prices, so it cannot recover historical prices without a separately approved bounded enrichment/backfill or another validated source. Do not apply the user's pending Telegram DB changes.
- Test null, free zero, positive, stale, differing currencies/regions, malformed input, no-price updates, out-of-order events, delete/tombstone and failure; plan rollback that keeps existing `/sync` clients, data, `CATALOG`, CORS and secret intact. No price implementation/deployment until actual provenance, permissions and appropriate database/bot approvals are established.

## Implementation slices after authorization

1. **Baseline:** record Git state, retain v10 ZIP as rollback, verify mocked browser/Worker tests. Scope changes to the active `telegram-catalog-bridge/website` and existing Worker only; keep no-store, current branding, image deterrent limitations and Telegram UUID links.
2. **Worker sort (separate rollout):** implement validated sort as above; use SQLite/D1 tests for all pages, ties, searches, categories and dates. Measure `EXPLAIN QUERY PLAN`/read costs for oldest and relevance, particularly with leading-wildcard search; don't claim a performance improvement without measurements. New website should ship only after compatible Worker is deployed and verified, or handle old Worker explicitly rather than silently showing wrong order. Existing prior deployment permission applied to the prior Worker update only; obtain explicit permission before this new deployment.
3. **Website UI:** new physical versioned JS/CSS and references in templates and static error pages. Build screenshot-inspired Sorting / Type / Last updated groups using real options, not dead controls. Both buttons right of input; align theme and preserve icon/focus; compact back spacing; change suggestion copy; clickable supported category text. Maintain accessible labels, native semantics, no nested links, no horizontal overflow, active state and light/dark contrast. Preserve old assets for cached HTML and `.htaccess`/private config.
4. **Verification:** regress keyboard, Enter/blank query, IME/suggestions, filter apply/cancel/clear, sorting and query state, 25+ items, same-time tie, invalid sort/category, exact category links across card/detail and unknown category, no-match feed/error retry, share controls, theme Auto/light/dark + system changes + static error pages, reduced motion and 320/375/599/600/768/900/1024/1440px with long labels and focus indicators. Run JS, PHP WASM, Worker and bot tests. Simulated Chromium does not prove Android native UI, production dates/prices, real Apache or Telegram delivery; verify those separately on device after upload.
5. **Release:** after requested implementation and explicit Worker deployment approval, preserve binding/secret and deploy Worker first via the guarded path; verify old/new API URLs and no-store/CORS, then build and integrity-check a new ZIP with `.htaccess` and without `config.php`, test fresh versioned asset names and include v10 rollback. User uploads website; do not automatically deploy bot, migrate Telegram DB or use new paid services. Price slice needs its own approval and compatibility/backfill plan.

## References and outstanding decisions

- [SQLite SELECT ordering and limits](https://www.sqlite.org/lang_select.html), [Cloudflare D1 prepared statements](https://developers.cloudflare.com/d1/worker-api/prepared-statements/), [MDN native select](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/select). This plan relies on documented SQL ordering/parameter binding and labeled native controls; live D1 behavior and costs must still be tested.
- Confirm only if necessary during build: whether the user prefers a specific panel layout beyond the supplied screenshot; “Other” has no visible items. Default proposed ordering labels honestly refer to updated timestamps. Price investigation and new Worker deployment require separate explicit authorization. No application changes have been made in this planning turn.

---

# Previous roadmap (historical)

# Plan — Marketplace Trader: research-to-release roadmap

**Date:** 2026-11-27
**Status:** Website redesign and local sync input hardening built and tested; neither is deployed. Rate limiting, durable sync recovery, reconciliation, caching/search optimization and R2 remain future work.
**Source research:** [UI/UX and motion](ui-research.md), [landing page](landing-page-research.md), [website engine](engine-research.md).
**Supersedes:** The older plan in this file. Its GitHub Releases, direct-browser-download, manual-add-on entry and PHP/MySQL sync assumptions are obsolete; the old R2 guard proposal did not enforce a hard cap and must not be used as a design. Prior text remains available in Git history.

## Mobile correction (2026-11-27)

User reported two cards per mobile row, mixed/unstyled components and unwanted decorative symbols after uploading. Focused investigation: `tasks/bug-report.md`. Plan: reproduce stale old assets with current markup; release uniquely named CSS/JS and HTML revalidation; remove decorative symbols and arrows; re-test real Chromium mobile/desktop breakpoints with old asset URLs present; package and have owner upload without replacing private config. Verify the live site after upload. Use new asset filenames for each subsequent content change.

## 1. Goal and definition of success

Make the existing $0 Minecraft Bedrock catalog professional, expressive, accessible and resilient: a visitor can browse → search/filter → open a real listing → continue to `@Mc_addonbot` for delivery, with understandable help and recovery when something goes wrong.

**Requested outcome:**
- YouTube-video-feed-*inspired* landing page: **one large add-on per row on mobile, four per row on desktop**, without pretending the listings are videos or copying YouTube branding.
- Material 3 Expressive-inspired shapes, hierarchy and subtle motion; flat solid colors only. No AI button, gradients, glow or background glow.
- About and FAQ/help pages, plus useful 403, 404, 500, 502, 503, 504 and 505 experiences where the host can actually serve them.
- Practical speed improvements, bot/abuse protection, reliable catalog sync and a safe $0 deployment process.

**Not a success claim yet:** The first 20-item batch was imported and live browsing/search/detail were observed; full import and actual Telegram file delivery remain unverified. A detailed status and source of truth is in `handoff.md`.

## 2. Non-negotiable boundaries

- **Budget $0.** Do not enable paid products, move plans, require a paid domain or add billing without explicit owner approval. Free limits and features must be verified for the actual account.
- Website files are in `telegram-catalog-bridge/website/`, not the older root `website/`. InfinityFree hosts the PHP shell; browsers read the public Worker/D1 catalog. Keep the existing browser-fetch/CORS design: InfinityFree blocks server-side `workers.dev` access.
- Telegram currently delivers files. Preserve `https://t.me/Mc_addonbot?start=<uuid>` and existing bot behavior. Website must not display a fake direct download, claim delivery is verified or imply that R2 already exists.
- Bot token and sync secret never appear in browser code, logs, repository or upload ZIP. Existing server-side private `config.php`, live Worker secret and D1 binding must be preserved. Do not ask for credentials in chat.
- User asked us to ignore the 12 pending BotFather database changes. No Telegram DB migration or schema application. No bot rewrite. Any bot-side change requires separate review, tests and coordination with the live revision-68 bot.
- No user login, public upload, request form, comments, ratings, AI feature, admin panel, invented statistics, official affiliation, support channel or guaranteed compatibility.
- Do not manually add individual add-ons: import/sync existing records in owner-triggered batches and later improve automation safely.
- R2 and a real 9.4 GB guard are deferred. Do not claim free-tier storage, uploads, replacements or a $0 hard spending cap is enforced.

## 3. Current architecture and contracts

**Flow:** InfinityFree PHP/HTML/CSS → browser JavaScript → public Cloudflare Worker → D1 catalog. The bot sends public metadata to the Worker's authenticated `/sync` route. Downloads continue in Telegram.

**Existing files:**
- Site templates: `telegram-catalog-bridge/website/index.php`, `search.php`, `addon.php`, `lib/view.php`, `.htaccess`.
- Styling/client rendering: `assets/style.css`, `assets/catalog.js`.
- Catalog API: `telegram-catalog-bridge/cloudflare/worker.js`, D1 `schema.sql`; bot bridge under `telegram-catalog-bridge/bot/`.
- Tests: `telegram-catalog-bridge/tests/worker.test.mjs`, `bot.test.mjs`; add browser/client tests where useful.
- Delivery: `telegram-catalog-bridge/website-upload.zip`, containing site contents but **no actual `config.php`**, bot code, Worker secret, SQL or other private files.

**Compatibility contract:** Preserve existing query URLs (`index.php?cat=...&page=...`, `search.php?q=...`, `addon.php?uuid=...`), exact supported category identifiers, public API routes/JSON shape, current bot UUID deep links, existing security restrictions in `.htaccess` and correct CORS. A refactor must include regression tests for these contracts. Existing page size is 24; preserve unless deliberately changed and both sides/tests are updated.

**Documentation conflict:** `AGENTS.md` and portions of `DESIGN.md` describe an older GitHub Releases/MySQL/direct-download design and auto-sized grids. In the documentation portion of implementation, update them to match this roadmap, without changing the standing no-glow preference. Do not let obsolete instructions override the architecture above.

## 4. Release strategy: small vertical slices

Each slice gets a focused diff, relevant tests and review before the next. Site changes can be built locally even while end-to-end Telegram testing is pending, but do not claim the product flow is complete until the live test is done. Worker/bot changes are separate deployments with independent rollback; don't bundle them into a cosmetic release unnecessarily.

### Slice 0 — Baseline, test fixture and release safety

- [ ] Record baseline behavior and current Git status; preserve existing files/ZIP and private configuration. Establish local mock catalog data containing real-shaped records, including missing thumbnail/creator/version and a 120-character title.
- [ ] Re-run existing Worker/bot tests and PHP/JS syntax checks. Record actual outputs, not assumed passes. Identify an available real browser for responsive and accessibility testing; if unavailable, mark browser checks unverified.
- [ ] Reconfirm the live site's browse → search → item → Telegram link, preferably without disruptive testing. When the owner is ready, test actual file receipt and finish `/websync` with the bot-provided cursor. Do not claim completion until the bot says Finished.
- [ ] Confirm separate deploy/rollback for website and Worker, and preserve production `CATALOG` binding, secret and CORS. No destructive live test or migration.

**Done when:** Baseline and blockers are recorded; no existing behavior is knowingly broken. Live Telegram delivery and complete backfill are either observed or explicitly marked pending.

### Slice 1 — Design system and responsive landing page

- [ ] Update `DESIGN.md`/`AGENTS.md` to current product scope, responsive contract and correct deployed directory; keep flat solid green/dark design, system fonts and no glow.
- [ ] Build a compact header with visible labeled search, Browse/Help navigation and skip link. Ensure navigation works without a JavaScript-only menu.
- [ ] Reduce decorative hero height; present a concise Bedrock introduction and explain that downloads continue in Telegram. Make the actual catalog visible early.
- [ ] Implement a consistent image-first feed: actual thumbnail (landscape 16:9 initial proposal), title, creator/category if available, one understandable link to detail. No fake play icon, duration, view count, popularity or featured claims. Broken/missing images use the same-size neutral fallback; test crop vs contain with real images.
- [ ] Responsive grid based on available CSS viewport: **<600 px = 1 column; 600–899 = 2; 900–1023 = 3; ≥1024 = 4**, capped at four even on wide screens. At zoom/split-screen use the available width, not device type. Test breakpoint boundaries and long titles; avoid horizontal overflow.
- [ ] Retain supported category links, search, count only where meaningful, 24-item pagination and working back navigation; do not imply imported catalog is complete. Keep state in URLs.
- [ ] Use restrained nonessential press/hover feedback, visible keyboard focus and no animation needed to understand content. Respect `prefers-reduced-motion` and keep scroll/FAQ instantaneous where requested.

**Done when:** At 320–599 px one card occupies each row; at ≥1024 px four fit without clipping; search/filter/pagination still reach correct records. Usability, focus and reduced-motion checks pass where test tooling is available.

### Slice 2 — Search, detail and resilient client states

- [ ] Apply the new card system to search results. Preserve the query and provide meaningful empty, loading, API error and 429 states with safe Retry. Never confuse a failed request with no matches.
- [ ] Keep existing search behavior and make its current first-24-results limitation clear until actual pagination is added and tested. No invented result counts.
- [ ] Detail page displays only real available data, safe HTTPS image/Marketplace links, and an obvious **Open in Telegram** action with honest installation/help text. No promise that every item is compatible or delivered.
- [ ] Separate invalid UUID, Worker 404 for confirmed missing item, 429, timeout and Worker outage. Add a browser fetch timeout and manual retry without a retry loop. Do not leak secrets or render raw metadata as HTML.
- [ ] Provide a JS-disabled explanation; static page shell and informational links must remain available. Browser-side catalog requires JS under the present architecture.
- [ ] Handle the dynamic-detail soft-404 problem deliberately: PHP cannot change its original status after the browser's API fetch. Decide between a server-backed 404 route/redirect or `noindex` on a confirmed client-side missing item, document tradeoffs, and never treat network error as confirmed missing. Validate crawler behavior where available.

**Done when:** Users can identify what happened and recover; verified valid detail links still open Telegram; confirmed-missing vs outage are distinct. Search, XSS-safe text, unsafe URL rejection and navigation have regression tests.

### Slice 3 — About, FAQ and error documents

- [ ] Add simple About and Help/FAQ pages using existing site shell. Explain catalog purpose, Bedrock compatibility limits, Telegram steps, import basics, missing listings and troubleshooting. Use semantic native disclosures and no invented support contact, legal policy, creator attribution or guarantees.
- [ ] Provide static, lightweight error documents for **403, 404, 500, 502, 503, 504, 505** with accurate plain-language text and Home/Help recovery. 505 means HTTP Version Not Supported, not generic 500.
- [ ] Configure local-path Apache `ErrorDocument` directives only where supported; preserve all existing access controls. A nonexistent path should actually return 404. Avoid external error redirects that turn the response into 302/200. Test local HTML accessibility even if PHP is unavailable.
- [ ] Test actual headers and response bodies on an isolated staging deployment/host-approved path. Record limitations: InfinityFree security, upstream proxy/502/504 and protocol-level 505 can bypass site documents; a broken `.htaccess` can prevent custom 500 rendering. Do not simulate all statuses as 200 and claim success.

**Done when:** About and FAQ work on mobile and keyboard, and supported error responses return their original statuses. Any host-controlled exceptions are explicitly documented, not promised.

### Slice 4 — Image performance, caching and search efficiency

- [ ] On first render, do not lazy-load the likely above-the-fold/LCP image; lazy-load appropriate off-screen images. Set dimensions/aspect ratio and implement error fallback. Avoid prioritizing every image, heavy libraries or stretching art.
- [ ] Benchmark realistic mobile performance before/after. Browser-to-Worker fetch delays thumbnail discovery; changing lazy loading doesn't remove that waterfall. Observe LCP, layout shifts and interaction responsiveness where possible; goals are not guarantees.
- [ ] Ensure CSS/JS caching uses safe versioning/revalidation and test InfinityFree headers. Consider a short 30–60s TTL only for **successful public GET** catalog responses after measuring and validating workers.dev capabilities. Keep `/sync` and auth failures uncached; define cache keys for query/category/page and prevent one user's query from leaking into another response.
- [ ] Document temporary staleness of updates/deletes; do not claim immediate global purge. A per-data-center Cache API deletion is not global. If invalidation cannot meet removal requirements, use a short TTL or keep `no-store`.
- [ ] Measure D1 rows read and `EXPLAIN QUERY PLAN`, including leading-wildcard title/creator search, `COUNT(*)` and large offsets. Only then choose bounded pages, indexes, prefix/FTS or cursor pagination; test any changed search semantics and avoid schema changes without a separate D1 plan.

**Done when:** Before/after measurements or explicit tooling gaps are documented; first visible images and fallbacks work; cache/search correctness and stale-content behavior are verified.

### Slice 5 — Layered abuse and sync protection

- [ ] Confirm availability of Workers Rate Limiting bindings in the real free account and preserve all existing bindings during deployment. Scope a generous measured rate limit to public read endpoints; use trustworthy client information, return clear 429/retry behavior and test shared-network false positives.
- [ ] Treat rate limiting as approximate/per-location, not a hard global cap or protection against all scraping. Check actual `workers.dev` eligibility before suggesting zone WAF features; do not purchase a domain.
- [ ] Keep `/sync` protected with its existing server-to-server secret and not subject to a human challenge. Harden input, request methods/content type and **streamed byte-size limit**, including missing/misleading Content-Length and multibyte payloads. If adding an unauthorized-request limit, ensure legitimate 20-item imports and bot retries cannot be blocked.
- [ ] Add tests for malformed, oversized and unauthenticated payloads, rate limits and preserved valid sync. Keep response errors generic and logs secret-free.
- [ ] **No blanket CAPTCHA.** If a public form is explicitly approved in the future, assess Turnstile for that action only, with server-side Siteverify and an accessible failure path; test hosting connectivity first.

**Done when:** Local tests prove valid sync survives and invalid requests are bounded; isolated deployment confirms browsing/CORS and sync still work. Never claim complete bot prevention.

### Slice 6 — Catalog reliability and monitoring

- [ ] Design a durable retry mechanism compatible with the actual Telegram Serverless runtime and quota, with bounded exponential backoff and idempotency; do not call an in-memory queue durable. Review this separately before changing live bot modules.
- [ ] Design deterministic update/delete ordering to fix same-second ambiguity using a reliable version/event identity; preserve tombstones and test out-of-order events, retries and conflict handling.
- [ ] Design safe deletion reconciliation only after a verified authoritative **complete** snapshot or deletion log; an interrupted/partial batch must never delete valid records. Ordinary `/websync` does not currently reconcile deleted items.
- [ ] Add minimal, secret-free operational visibility for aggregate errors, Worker/D1 usage, sync failures and stale data. `/health` only proves Worker reachability, not D1 integrity or Telegram delivery.
- [ ] Test backups and recovery on isolated data; document manual repair and rollback. No production deletion test without a disposable record and permission.

**Done when:** Failure/retry/update/delete cases are tested in isolation, and any unresolved runtime or schema constraint is documented. Do not apply pending Telegram DB migrations.

### Slice 7 — Final verification, packaging and owner-led release

- [ ] Run existing Worker/bot tests, new UI/client tests, PHP syntax checks, JS syntax checks and archive inspection. Capture exact results. Test malformed data, long titles, empty results, invalid links and no-JS handling.
- [ ] Browser checks at 320, 375, 600, 768, 900, 1024, 1280 and 1440 CSS px, including breakpoint edges; keyboard, focus not obscured, reduced motion, 200–400% zoom/reflow, screen-reader checks where available. Automated checks do not prove WCAG compliance.
- [ ] Confirm actual status codes for supported error pages; confirm cache headers and live browser CORS. Do not force a production 500 or perform a live load test without a safe plan.
- [ ] Rebuild `telegram-catalog-bridge/website-upload.zip`, test archive integrity/content, and exclude real `config.php`, private bot library, `.env`, Worker secrets and database files. Include `.htaccess`.
- [ ] Update `handoff.md`, README/AGENTS/DESIGN for the deployed reality and report **Skipped / Unchecked** and **Residual Risk**. Only commit/push to the current Arena branch if appropriate and never expose secrets.
- [ ] Give the owner simple, explicit InfinityFree upload/replacement steps. Preserve existing `config.php`; confirm upload before checking live page, search, detail, response status and Telegram delivery. Deployment is not complete until separately verified. Worker changes require a separate safe deployment preserving secret/D1/CORS and owner coordination.

**Done when:** Packaging and local tests pass, the owner completes deployment, live checks pass, and all unverified host/device/error cases are honestly recorded. No automatic paid-plan or R2 setup.

## 5. Future R2 phase — separate approval and design

R2 is not active and Telegram is the current file delivery path. When the owner is ready, re-check actual pricing/units, card requirements and account-wide usage before any activation. The old unused constant is **10,092,649,186 bytes ≈ 9.4 GiB ≈ 10.093 decimal GB**, not 9.4 decimal GB. Decide an explicit conservative byte cap (user target: never exceed 9.4 GB) after confirming provider units.

A credible fail-closed storage design must account for concurrent atomic reservations, in-flight/multipart uploads, orphan cleanup, replacement overlap, existing provider usage, partial failures, reconciliation and a single controlled write path. Protect the old file until a replacement is verified, but count simultaneous storage against the limit. Storage controls alone do not cap operations or guarantee a $0 bill. If a reliable absolute guarantee is not possible with available services, say so rather than claim one. Do not implement direct downloads, billing, R2 or a fake guard as part of the UI slices.

## 6. Acceptance and owner decisions

**Acceptance checklist**
- [ ] One large item/row mobile, four/row desktop; solid expressive design with no glow/gradients.
- [ ] Browsing, search, category, detail and correct Telegram deep link work; actual file delivery verified separately.
- [ ] FAQ/About plus truthful error recovery and status behavior within hosting constraints.
- [ ] Reduced motion, keyboard, reflow, clear focus and meaningful loading/empty/error states tested; no unsupported accessibility claim.
- [ ] Performance improvements measured; rate-limit scope does not break real visitors or bot.
- [ ] Sync reliability limitations and import status accurately stated; Worker credentials/bindings remain intact.
- [ ] No paid service or R2 enabled; package excludes real secrets; rollback and user deployment instructions ready.

**Decisions only when they become relevant:** exact solid palette/rounding and image crop choice; whether to enable an approximate rate-limit after eligibility testing; how to handle confirmed missing-item indexing; whether a safe durable queue can be built without Telegram schema changes; eventual R2 byte ceiling and provider account constraints. No decision is required to begin local UI work using the proposed defaults.

## 7. Sources and research detail

- [Material motion physics](https://m3.material.io/styles/motion/overview/how-it-works), [Material adaptive cards](https://m3.material.io/components/cards/guidelines)
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/), [reflow](https://www.w3.org/WAI/WCAG21/Understanding/reflow.html)
- [web.dev image loading](https://web.dev/learn/images/performance-issues), [Web Vitals](https://web.dev/articles/vitals)
- [Apache ErrorDocument](https://httpd.apache.org/docs/current/en/mod/core.html), [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Workers rate limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/), [D1 indexes](https://developers.cloudflare.com/d1/best-practices/use-indexes/), [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [R2 pricing](https://developers.cloudflare.com/r2/pricing/)

**Skipped / Unchecked (build):** Live deployment, production rate-limit eligibility, complete import, real Telegram delivery, host-generated HTTP errors, screen-reader audit and real-device performance measurements.
**Residual risk:** Partial catalog import, unverified file delivery, stale listings on sync failure, external thumbnail and hosting availability, free-tier limits and no R2 hard budget enforcement.

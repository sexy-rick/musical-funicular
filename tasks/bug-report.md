# Bug hunt: catalog, search, sharing, filters and theme

Date: 2026-11-27. Audited checkout: `695cfd8`. This is an investigation, not an implementation. Prior report retained below for historical context. Paths below are relative to the repository root. P0 = critical outage/security, P1 = major functionality/data integrity, P2 = normal user-visible defect, P3 = minor issue or requested enhancement. No P0 or P1 demonstrated in this focused scope.

## Reproduced and code-confirmed findings

### P2 — Share icon jumps below Download after activation
- `telegram-catalog-bridge/website/assets/catalog-v9.js:47-64`; `telegram-catalog-bridge/website/assets/site-v9.css:17,32,35`.
- On a 375px local Chromium page with mocked catalog, mocked native share and blocked image, before/after activation the share control wrapped: Download top 377.9px, Share top 429.9px; status was “The catalog image is unavailable for sharing; sharing the link only.” The status grows the share control's flex item and the wrapping row moves the entire control. The separate copy-link fallback explicitly makes the flex item 100% wide. This reproduces a mechanism consistent with the screenshot, not proof of the exact browser state on the phone.
- Remove image preparation/sharing as requested; keep Download and share buttons in a stable row, place status and accessible copy fallback outside that row. Test share success, cancellation, unsupported share and clipboard failure at narrow widths; actual native share must be checked on device.

### P2 — Blank search submits and navigates
- `telegram-catalog-bridge/website/lib/view.php:15`; `telegram-catalog-bridge/website/assets/search-v9.js:31`; `telegram-catalog-bridge/website/assets/catalog-v9.js:111`.
- Local Chromium click on the search button with an empty field navigated to `/search.php`; whitespace is also unchecked. The handler only invalidates suggestions, and the destination's empty-state check occurs after navigation.
- Prevent submission for whitespace-only input via a submit handler for both click and Enter, preserve focus and accessible feedback. Do not block filter form submission: filter-only browsing is an intended separate action. Decide explicitly how retained filters interact with a blank search; the requested behavior is no navigation.

### P2 — Applying a filter hides the active search and the next application drops it
- `telegram-catalog-bridge/website/lib/view.php:16`; `telegram-catalog-bridge/website/assets/filters-v9.js:12`; `telegram-catalog-bridge/website/index.php:7`; `telegram-catalog-bridge/website/assets/catalog-v9.js:104-106`.
- The filter form sends the input query to `/index.php`, where results read `q` from the URL but the header is rendered with an empty query. Consequently the results remain filtered while the search input appears empty; reapplying filters sends the empty input and removes `q`. This is established from the request/render contract; the existing mocked browser test checks the URL but not the input or a second apply (`telegram-catalog-bridge/tests/website.browser.test.cjs:94-95`).
- Render the actual validated query in the header on catalog pages or preserve an explicit query state. Test search → apply → reopen → apply, clear, back and pagination.

### P2 — No-results state provides no recent catalog
- `telegram-catalog-bridge/website/assets/catalog-v9.js:66-67,109-120`; `telegram-catalog-bridge/cloudflare/worker.js:58-59`.
- Local Chromium search for a mocked no-match query displayed “No matches found / Try another search or filter / Browse the collection”, with zero cards. The requested recent catalog below the message is absent. API's default order is most recently *updated*, not confirmed recently added.
- Keep the failed query and explanatory message; independently request and label “Recently updated” cards, with its own loading/error/empty state. Do not label these as new uploads unless a verified added timestamp becomes available. Avoid applying the failed query/filters to the recommendation request; respect pagination and accessible live announcements.

### P2 — Literal wildcard characters return unrelated results
- `telegram-catalog-bridge/cloudflare/worker.js:44,56`; `telegram-catalog-bridge/website/assets/search-v9.js:16-19`.
- Query is parameterized (not SQL injection), but `%` and `_` are SQLite LIKE wildcards. A local SQLite check confirmed both patterns match `Furniture`; e.g. search `%` can match most records rather than a literal percent. Suggestions then compare with a literal substring, producing inconsistent behavior.
- Escape LIKE metacharacters with an explicit escape clause, or document wildcard semantics consistently. Add Worker tests for `%`, `_`, escape character and ordinary Unicode text; a Worker change/deployment requires separate authorization.

### P2 — Filter Cancel does not discard edits; fallback dialog accessibility is incomplete
- `telegram-catalog-bridge/website/assets/filters-v9.js:3-12`; `telegram-catalog-bridge/website/lib/view.php:16`.
- Category and date selects mutate immediately; Cancel/backdrop/Escape merely closes the dialog. Reopening keeps unsaved values, despite the Cancel label; after Clear then Cancel, hidden creator state is also cleared until reload. This is code-confirmed, not device-reproduced. On browsers without `showModal`, setting `open` and trapping only Tab does not provide a real modal/inert background.
- Restore snapshot on cancel and commit only on apply; use a tested accessible dialog fallback or gracefully avoid pretending it is modal. Test keyboard, Escape, outside interaction, creator clear/cancel and focus restoration.

### P2 — Sync may report success while ignoring equal-time updates
- `telegram-catalog-bridge/cloudflare/worker.js:79-87`; `telegram-catalog-bridge/bot/lib/web_sync.js:9-13,18-24`.
- Upserts replace a row only when incoming `updated_at` is strictly greater, while delete wins equal timestamps. Same-second edits may therefore be silently dropped even though `/sync` returns success. A failed sync merely returns false; ongoing retry/reconciliation depends on callers and is outside this focused audit. This affects the reliability of “last updated” ordering and filters, but frequency and live occurrence are unknown.
- Separately investigate event ordering, durable retries and reconciliation before changing sync/bot/DB; add equal-time edit/delete/out-of-order and failure tests. No bot/schema changes or deployment authorized by this investigation.

## Requested improvements and data constraints

### P2 — Requested filters cannot all be truthfully implemented with present data
- `telegram-catalog-bridge/website/lib/view.php:16`; `telegram-catalog-bridge/cloudflare/worker.js:4,43-59`; `telegram-catalog-bridge/cloudflare/schema.sql:2-13`; `telegram-catalog-bridge/bot/lib/web_sync.js:9-13`.
- Existing category values support Add-Ons, Textures, Worlds, Mashups and Skins through existing exact categories. Category completeness and semantics depend on synced records; Persona has no category in the allowlist, so support is unverified. Template and Application exist and must not silently disappear.
- Default order is update timestamp descending, not relevance. Newest/Oldest by original upload date, new DLC, ratings and most/least rated cannot be determined from the current schema. New update can only mean a clearly labeled sync/update time range, not a verified Marketplace update. Relevance requires an explicitly designed ranking algorithm. “Other” is a screenshot heading with no visible options; its meaning must be clarified. Any new true metadata requires a reliable source, rights/semantics, backfill and separately authorized data and deployment work. Do not fabricate or show nonfunctional choices.

### P3 — Search/filter placement clarification
- `telegram-catalog-bridge/website/lib/view.php:15`; `telegram-catalog-bridge/website/assets/site-v9.css:3,32-33`.
- Current search button is left of the input and filter button is right. The request “🔍 📁 on the left” could mean both icons adjacent on the left; confirm before implementing. Preserve accessible names, keyboard order and 44px targets.

### P3 — Link-sharing copy and theme UI refresh
- `telegram-catalog-bridge/website/assets/catalog-v9.js:50-62` sends item title as both title and text; replace with brief inviting link-focused copy if approved, keeping share/copy fallback and avoiding unsupported claims. Native targets may format or omit fields differently.
- `telegram-catalog-bridge/website/lib/view.php:17`, `telegram-catalog-bridge/website/assets/theme-v9.js:3-15` and `telegram-catalog-bridge/website/assets/site-v9.css:19-20,22,32-33` use a native Auto/Light/Dark select with a separate icon. No failure of the actual toggle was demonstrated; a professional redesign is a feature request, not a proven bug. Preserve saved preference, system changes, keyboard/screen-reader operation, both themes, responsive spacing, and all static error pages. In older browsers with only legacy `matchMedia.addListener`, auto mode won't receive change events (line 12); verify intended browser support.

### P3 — Expand FAQ and support
- `telegram-catalog-bridge/website/faq.php:2-14` already has ten questions and support links; expand with meaningful guidance about search/filters, share links, unavailable listings and safe installation, without claiming facts not known. It's an enhancement, not a site outage.

### P3 — Image download deterrence cannot be guaranteed
- `telegram-catalog-bridge/website/assets/catalog-v9.js:78-81` sends thumbnail URLs to the browser for display. Invisible overlays, context-menu/long-press restrictions and removal observers are cosmetic deterrents only: the browser or extensions can access the image/network, disable scripts, remove overlays or capture screenshots. No client implementation can guarantee resistance to uBlock/zapper or force permanent removal. Blocking long-press can also interfere with links and accessibility.
- If modest deterrence is desired, discuss watermarks, lower-resolution thumbnails or a clearly labeled unobtrusive overlay, understanding none prevents copying. Actual access control only helps limit delivery, not copying after display.

### P3 — Duplicate SVG symbol identifiers
- `telegram-catalog-bridge/website/assets/icons-v9.svg:8-10,13-15`: repeated light, dark and auto symbol IDs have identical paths now, but duplicate IDs risk ambiguity if they diverge; deduplicate in a future versioned asset and test error-page and header theme icons.

## Audit boundaries and verification

34 text files, **921 logical lines**, counted with `awk END{print NR}`; some CSS and HTML files have very long lines. Fully read in line-numbered chunks. Scope is active v9 website rendering/search/share/theme/filter code, active public Worker/schema, metadata sync contract, deployed helper/config files and five relevant test files. Active v9 CSS has no imports; v8 logo is a binary asset, not source. Historical v5–v8 JS/CSS/SVG are retained rollback assets but are not loaded by active v9 templates; excluded from this focused audit. Binary favicons, ZIPs, licenses, unrelated bot internals, operational workflow, private deployment configuration, real device, server environment and live site asset versions are not audited. This is not an exhaustive security, accessibility, deployment or whole-repository audit.

**Inventory** (paths prefixed `telegram-catalog-bridge/`):
- Website: `website/.htaccess`, `index.php`, `addon.php`, `search.php`, `faq.php`, `about.php`, `download.php`, `config.example.php`, `site.webmanifest`, `lib/db.php`, `lib/view.php`, `lib/catalog.php`, `lib/storage_guard.php`; `assets/catalog-v9.js`, `assets/search-v9.js`, `assets/filters-v9.js`, `assets/theme-v9.js`, `assets/site-v9.css`, `assets/icons-v9.svg`; `errors/403.html`, `404.html`, `500.html`, `502.html`, `503.html`, `504.html`, `505.html`.
- Bridge: `cloudflare/worker.js`, `cloudflare/schema.sql`, `bot/lib/web_sync.js`.
- Tests: `tests/website.test.cjs`, `website.browser.test.cjs`, `search-suggestions.test.cjs`, `branding.test.cjs`, `worker.test.mjs`.

**Executed:** Focused mocked Chromium reproduction exited 0 and observed the three behaviors above. Existing website client, search-suggestions, branding and Worker tests all passed (exit 0; Node emitted experimental SQLite warning). Existing mocked Chromium browser suite passed at 320, 375, 599, 600, 768, 900, 1024 and 1440px (exit 0). These existing tests do not assert post-share button position, blank submission, recommended cards, or preserved input after filter apply. SQLite wildcard check returned `percent_matches=1`, `underscore_matches=1`. Tests are local/mock-based, not a real phone, native share target, actual Apache/InfinityFree deployment or production performance measurement.

**Next step:** Await `/bugfix` or `/build` authorization; no application code, ZIP, Worker, bot or database has been modified or deployed by this bug hunt.

---

## Previous investigation (historical, not findings from this audit)

# Mobile UI regression: investigation and fix

Date: 2026-11-27. Scope: user-reported bridge website mobile layout, deployed static assets, navigation and decorative symbols. This is a focused investigation, not a complete security or application audit.

## Telegram handoff stalls (2026-11-27)

**Observed:** User's screenshots show Bio Dome detail loaded and `t.me` stalled in a blank Android browser/custom tab with a progress line. The browser address bar appears to show a different start value in one screenshot, so do not infer that screenshot's complete URL or payload from its truncated text. This is no longer the website's catalog-loading state. Exact cause is unknown: network access, app link handling, browser or Telegram could be involved.

**Checks:** The live Bio Dome page independently generated `https://t.me/Mc_addonbot?start=037f9836-628f-4213-b42d-f03e080ca2e0`. Telegram's web page responded to a fetch from this environment with the matching `tg://resolve?domain=Mc_addonbot&start=...` link. That does not prove reachability or app launch on the user's phone, nor file availability. Telegram documents both link forms: <https://core.telegram.org/api/links#bot-links>. The revision-66 source accepts `/start <uuid>`; the user reports the live bot is revision 68, so actual behavior must be checked on-device.

**Local mitigation:** `catalog-v3.js` provides direct Telegram-app (`tg://`) and standard web (`https://t.me`) options plus a manual `/start <uuid>` fallback; does not try to detect app installation or automatically redirect. The browser/device may block the native scheme, so no guaranteed launch. No Worker, bot or schema change. Tests verify link payloads and manual fallback, not real app launch or delivery. Upload revised ZIP and validate with user on real device.

## P1: Mixed old and new UI assets

**Evidence:** User screenshots show new page text and navigation mixed with old 2-column cards, old button/body styles and unstyled newer markup. At investigation time, an independent fresh fetch of the live `assets/style.css` and `assets/catalog.js` returned the newer files, and the live home returned new markup and 23 listings. The phone's exact cache contents and upload ordering were not observed, so stale browser/intermediary cache or timing is a strong hypothesis, not a proven diagnosis.

**Local reproduction:** Serve current HTML with the old unversioned CSS/JS from commit `e4d3499`. Headless Chromium at 320 CSS px showed **two columns instead of one** and horizontal overflow. This reproduces the user-visible mismatch.

**Root design defect:** The prior release reused the same `assets/style.css` and `assets/catalog.js` URLs even though markup and assets changed together. Cached versions could be mixed across deployments. MDN describes this exact risk and recommends versioned asset URLs: <https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching>.

**Fix:** Ship distinct physical filenames `assets/site-v2.css` and `assets/catalog-v2.js`; reference them from all templates and static error pages; request revalidation of PHP HTML. Future asset modifications must use fresh filenames and update every reference. This does not guarantee an intermediary honors HTML revalidation, and it requires uploading the new release and testing on the live host.

**Regression:** `website.browser.test.cjs` simulates stale old assets, checks 1 column at 320/375/599px, 2 at 600/768px, 3 at 900px and 4 at 1024/1440px, checks overflow, reduced motion, navigation, FAQ, Telegram link and no decorative glyphs. Initial simulated-stale test failed at 320px with two columns; after the fix it passes. Test uses mocked catalog and local PHP-rendered markup, not the live host.

## P2: Decorative marks and arrow characters

**Evidence:** User explicitly objected to stars, geometric placeholders and arrow-like characters. They were present in the header, hero, links, fallback graphics and error pages.

**Fix:** Remove those characters throughout the website, use plain text labels, a text-only image fallback and simple neutral styling. FAQ disclosures use Show/Hide labels rather than decorative symbols. Preserve functional headings, accessible focus and reduced-motion settings.

## P2: Visual mismatch from relying on current-asset-only testing

The previous browser test served only current assets; it could not catch old cached CSS/JS paired with updated HTML. The updated test includes the stale-asset scenario. Actual InfinityFree response headers, phone cache, mobile rendering and full screen-reader audit still need verification after the corrected ZIP is uploaded. Custom 5xx pages may be overridden by the hosting provider.

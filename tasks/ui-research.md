# Marketplace Trader — UI/UX research and design blueprint

**Research date:** 27 November 2026
**Status:** Research and proposal only. No site code, deployment or ZIP changed in this research turn.
**Product:** A free Minecraft Bedrock add-on catalog: browse → search → add-on → Telegram bot. Cloudflare provides the public catalog; InfinityFree serves the website. Telegram delivery is the current approach; R2 is a later possibility, not a current download feature.

## 1. Goals and constraints

Make the website feel polished, expressive, fast, reassuring and easy to use on phones, while preserving the existing bot and catalog. Apply Material 3 Expressive as inspiration, not as a claim that the website uses Google's official Android implementations. Use flat solid colors, no gradients, glows, background glow or AI button. No login, uploads, requests, admin panel, invented statistics, reviews, support contacts or other unconfirmed product features. $0 hosting remains a constraint.

**Primary user jobs**
1. Find an add-on by name or category.
2. Understand what it is and whether available details indicate that it fits their version/platform.
3. Open the correct Telegram bot link and obtain the file, if delivery works.
4. Recover from an empty search, catalog failure or invalid link.
5. Understand how to import a compatible pack into Bedrock.

**Product honesty:** A listing or Telegram button is not proof the file is delivered, safe, compatible or maintained. Show version, platform, author, file size and update information only when valid data actually exists. Do not present the current partial import as a complete catalog. Keep JavaScript dependency visible: the current catalog is fetched by the browser, so the shell/help can be accessible without JS, but the catalog cannot work without it unless architecture changes.

## 2. Research: what matters and why

### 2.1 Expressive but usable

Google's Material 3 Expressive expands Material with contrasting shapes, emphasized typography and integrated motion. Its physics system distinguishes **spatial** changes from **effects** and provides fast/default/slow tokens. The published motion integration is platform-specific; approximating its feeling with web transitions is inspiration, not proof of official spring-token compliance. Use emphasis where it helps users find search and the download action; do not make every surface equally loud. [Material overview](https://m3.material.io/get-started), [motion physics](https://m3.material.io/styles/motion/overview/how-it-works), [Material components](https://m3.material.io/).

**Decision:** build expressiveness from type scale, generous spacing, contrasting rounded corners, clear hierarchy and small interactive responses. Use a restrained palette of solid, accessible colors. Select exact colors only after contrast testing; avoid promising a theme or dark mode before it is designed and tested.

### 2.2 Usability and content

Nielsen Norman Group's heuristics emphasize system status, consistent controls, error prevention and recovery in plain language. Their e-commerce research also shows why descriptions matter after discovery: users need enough relevant information to decide whether a listing is useful. Transfer the principle to add-on downloads, without assuming retail study conversion figures apply to this website. [Usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/), [e-commerce findings](https://www.nngroup.com/articles/ecommerce-improvements/), [FAQ guidance](https://media.nngroup.com/media/reports/free/Strategic_Design_for_Frequently_Asked_Questions.pdf).

**Decision:** place search high on the home page; make card titles readable; show only real metadata; tell users that downloading continues in Telegram; keep Help consistently reachable. Distinguish loading, empty results and network errors rather than showing all three as an empty catalog. Provide a clear retry action for a fetch failure and clear filters for zero results.

### 2.3 Accessibility and motion

WCAG 2.2 AA requires at least 4.5:1 for normal text, with exceptions such as large text; minimum pointer target size is 24 × 24 CSS pixels subject to exceptions. The enhanced 44 × 44 target and the more specific focus-appearance criterion are AAA; choose a generous 44–48 px design target without incorrectly claiming those AAA requirements are AA. Focus must remain visible and not be entirely hidden by sticky UI. User testing and audits are necessary before making any conformance claim. [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [new criteria](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/).

Support keyboard navigation, skip link, semantic landmarks/headings, labels, focus indicators, status announcements and non-color cues. Test 200% zoom, narrow screens, text resizing and screen readers. For reduced motion, remove non-essential movement rather than relying on animation to convey information. [MDN accessibility media queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using_for_accessibility).

### 2.4 Performance

web.dev recommends field goals at the 75th percentile of page visits: LCP ≤ 2.5 seconds, INP ≤ 200 ms, CLS ≤ 0.1. These are targets, not measurements of the current site or guarantees on free hosting. [Web Vitals](https://web.dev/articles/vitals), [LCP](https://web.dev/articles/lcp).

Use system fonts or a carefully justified local font, reserve image dimensions, lazy-load appropriate off-screen images, avoid heavy animation libraries and keep the initial page useful while data loads. Avoid lazily loading the main above-the-fold image without measurement. Animate primarily transform/opacity, and measure on a real low-end phone: browser and GPU behavior varies. [MDN CSS performance](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Performance/CSS).

### 2.5 Errors, indexing and platform realities

A real missing URL should return 404, not a successful 200 page that only looks like an error. Apache supports local ErrorDocument paths, subject to server permissions; external URLs redirect and can lose the original error status. Static error documents are useful when PHP is unavailable, but cannot fix broken web-server configuration or failures intercepted by the host/proxy. Verify what InfinityFree actually allows rather than assuming it does. [Apache ErrorDocument](https://httpd.apache.org/docs/current/en/mod/core.html), [Google status handling](https://developers.google.com/search/docs/crawling-indexing/http-network-errors).

The existing add-on detail page gets data from the Worker **after** InfinityFree sends its HTML response. If an add-on UUID is valid-looking but absent, the browser can show a missing-item state but cannot retroactively change the initial HTTP 200. This is a separate issue from an Apache 404. Future implementation needs a deliberate solution—such as an appropriate noindex for confirmed missing items or a real 404 endpoint/redirect—without misclassifying network failures as missing items. JavaScript rendering/indexing also needs verification; Google can render JS but results are not guaranteed and other crawlers can differ. [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).

## 3. Proposed visual system

- **Identity:** playful, Minecraft-adjacent blocky structure balanced by expressive rounded controls; not a copy of Minecraft branding or an implication of official affiliation.
- **Palette:** one dark ink, one light neutral, one main action color and one restrained secondary color. All flat and solid. Test all actual text/background combinations; don't rely on color alone.
- **Typography:** strong readable page titles, smaller descriptive labels and comfortable body text. Avoid all-caps paragraphs and tiny metadata.
- **Layout:** centered bounded content on desktop; generous 16–24 px mobile edge space; cards flow from one column on narrow screens to a sensible responsive grid. Avoid fixed desktop widths and overflow.
- **Shapes:** pill primary buttons; rounded cards and fields; occasional larger, contrasting corner shapes. Consistency takes priority over novelty.
- **Iconography:** minimal local SVGs with text labels or accessible names. Decorative icons hidden from screen readers.
- **Images:** authentic available thumbnails only; consistent aspect ratio and non-misleading fallback when an image is missing. Do not manufacture featured artwork or popularity.
- **Navigation:** obvious Home/Browse, Help/FAQ and About; header and footer links remain usable on mobile, without relying on a JavaScript-only menu.

## 4. Motion blueprint

| Interaction | Proposed behavior | Purpose | Reduced motion |
|---|---|---|---|
| Buttons | Fast, subtle press response; color/focus feedback remains visible | Acknowledge touch | Remove scale/movement |
| Add-on cards | Gentle hover lift on capable pointer devices only | Show interactivity | No lift |
| Search/filter | Immediate active state; restrained result transition only if helpful | Confirm selection | No transition |
| FAQ | Native disclosure or short, calm expansion | Show answer belongs to question | Instant open/close |
| Loading | Clear text and optional low-key indicator; no infinite large motion | Show system status | Static indicator/text |
| Error | Stable plain-language message, no shake | Reduce stress | Same stable message |

Starting point for implementation experiments: ~120–180 ms for small feedback and ~180–250 ms for a disclosure; tune through testing, not as official Material token values. Avoid bounce on every element, parallax, auto-playing backgrounds, flash, scroll hijacking and animation that delays information. Motion should never be the only indicator of state. Verify touch, pointer, keyboard, interrupted interaction and reduced-motion behavior.

## 5. Complete page and state map

### Home / Browse
- Header with clear brand/navigation and a prominent, labeled search.
- Short plain-language introduction: discover Minecraft Bedrock add-ons and continue to Telegram for downloads.
- Real category filters if supported by current data/API. Avoid an invented Featured or Trending section.
- Responsive add-on cards: real title, thumbnail/fallback and available relevant metadata; each card has a clear link to its detail page.
- Explicit loading, no items, fetch failure and JS-disabled messages. Provide retry for failures.
- Pagination/load-more only if supported by the current API and tested; preserve filters/query.

### Search
- Show search query and meaningful result information without overstating counts (e.g., distinguish currently loaded count from total if API does not provide totals).
- Zero results: suggest checking spelling, a shorter query or clearing filters; provide a route back to browsing.
- Failure: describe catalog unavailability separately, preserving the query and giving Retry.

### Add-on detail
- Title, image/fallback, real description and available compatibility information.
- Primary **Open in Telegram** action explaining that Telegram/bot handles the file and might require a join step.
- Steps: open bot, follow its instructions, download the delivered file, import a compatible pack in Minecraft. No promise of successful delivery until verified.
- Missing UUID, confirmed missing item and network failure need distinct treatment. Invalid or unsafe external links should never be rendered as active download links.
- No invented ratings, screenshots, support claims, publisher, safety badge or guaranteed compatibility.

### About
- What the catalog does and how Telegram is used, in simple language.
- Clarify that the site is a community catalog and avoid unverified ownership or official-partnership claims.
- Link to browse and Help; only publish a contact channel if the owner confirms one.

### FAQ / Help
Use short questions grouped by topic with native accessible disclosure controls:
1. What is this website? A catalog to browse listed Bedrock add-ons.
2. How do I download? Open an add-on, use the Telegram button, then follow the bot's instructions.
3. Do I need Telegram? The current download flow uses Telegram; direct R2 downloads aren't active.
4. How do I import a pack? On supported devices, open a compatible .mcpack or .mcaddon file with Minecraft and activate relevant packs in a world as applicable. Steps vary by platform and package; do not claim all devices support the same flow. [Microsoft getting started](https://learn.microsoft.com/en-us/minecraft/creator/documents/gettingstarted?view=minecraft-bedrock-stable), [MCAddon example](https://learn.microsoft.com/en-us/minecraft/creator/documents/minecraftentitywizard?view=minecraft-bedrock-stable).
5. Does every add-on work with my version? Compatibility varies; consult the item's available information and back up important worlds.
6. The bot didn't send my file—what now? Check Telegram, follow bot prompts including any join gate, then try again; do not promise a fix or invent support.
7. Why can't I find an item? Check spelling and filters; some items may not yet be listed.
8. Why is the catalog unavailable? Check connection and retry later; distinguish from zero results.
9. Is this Java Edition? The intended catalog is Bedrock; do not imply Java mod compatibility.
10. Is downloading free? Do not promise total cost or licensing conditions for every third-party item without verifying them.

### Error pages and recovery
| Status | Accurate meaning | Proposed message/action | Caveat |
|---|---|---|---|
| 403 | Access forbidden | “This page isn't available to you.” Home and Help | Do not imply account login can solve it |
| 404 | Resource not found | “We couldn't find this page.” Search and Home | Preserve actual 404 |
| 500 | Internal server error | “Something went wrong on our side.” Retry later and Home | Static page may not be served if configuration fails |
| 502 | Bad gateway | “A service couldn't respond properly.” Try later | Often generated upstream; host may replace page |
| 503 | Service unavailable | “The service is temporarily unavailable.” Try later | Do not promise an estimated recovery time |
| 504 | Gateway timeout | “A service took too long to respond.” Retry | Often upstream and not customizable |
| 505 | HTTP version not supported | “Your browser's request could not be understood by the server.” Try an updated browser or retry later | Rare; may occur before the site can serve custom HTML |

505 is **not** the generic server error; that is 500. See [MDN status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status) and [MDN 505](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/505). Add only codes the hosting stack can realistically handle. Error templates should use real status codes where the server handles them, not simulated errors on a success response; test 403/404/5xx behavior without exposing protected paths or disrupting the live site.

## 6. Test plan before any release

1. **Regression:** home, categories, search, pagination if present, real item detail, Telegram deep links and actual file delivery; test with the current data, not mock claims.
2. **States:** slow/blocked Worker, empty dataset, no matches, missing item, malformed UUID, broken image, JS disabled, Telegram unavailable; ensure no unsafe or blank state.
3. **Accessibility:** keyboard-only, focus not obscured, screen reader announcements for loading/results/error, text contrast, target spacing, zoom/reflow and reduced motion. Automated tools support but do not replace manual testing.
4. **Devices:** narrow phone, wider phone, tablet, desktop; Android browser and at least one other browser/device where available; no horizontal overflow.
5. **Performance:** measure realistic slow-network/low-end conditions; actual field data where available. Targets are not proof of performance.
6. **Hosting:** on a safe staging path/domain or after carefully planned deployment, inspect real response codes and page bodies, including a nonexistent path and permission-denied case. A live host/proxy may override ErrorDocument or prevent a 505 page entirely.
7. **SEO:** verify the JS-rendered catalog and missing-item handling with Search Console/URL inspection when available; prevent soft 404s without treating temporary network failures as deleted content.
8. **Privacy/security:** no private credentials in the upload ZIP or browser; no new dependencies/services without need; do not infer or publish a legal policy without confirmed practices.

## 7. Proposed sequence, only after the owner requests implementation

1. Agree on the visual direction and page content.
2. Build a consistent design foundation and upgrade existing browse/search/detail without altering bot/Worker behavior.
3. Add About and FAQ/help.
4. Add error documents and safe server configuration, with host-specific verification and the separate dynamic-detail soft-404 plan.
5. Run regression, accessibility, motion and performance checks; rebuild the upload ZIP without private configuration; explain deployment and test on InfinityFree.

**Research gaps:** No visual prototype or user interviews; no full WCAG audit, performance field measurements, confirmed InfinityFree ErrorDocument behavior, full catalog import, or end-to-end Telegram file-delivery verification. No R2 hard quota enforcement is implemented. All remain explicitly unverified.

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

# Brand, search and desktop refresh

Status: implemented and locally verified; production upload and real-device checks pending.

- Source the user-provided logo and favicon ZIP from `Brach1` via GitHub; validate the archive and use only the listed image/manifest files. Preserve the logo artwork, add alt text and favicon metadata on standard and static error pages.
- Use `#c88828` for key accent surfaces and warm neutral tokens; use a darker/lighter companion for text where needed to preserve contrast. Keep Auto/Light/Dark, solid surfaces and reduced motion.
- Reproduce the reported search: live `/addons?q=Furniture` returns two records; screenshot shows a loading state and another screenshot shows the previous submitted query while the input is being edited. Start the actual search request early during search-page parsing, connect to the existing Worker sooner, consume the same single in-flight response and do not persist metadata against `no-store`. Keep 500ms autocomplete debounce, no change to bot/Worker, and retain errors/retry. Network speed cannot be guaranteed.
- Add useful category shortcuts to the empty desktop hero and a useful discovery/help panel to the detail page without fake content. Maintain one column below 600 CSS px and four from 1024; phone screenshot alone does not identify whether Desktop site or zoom is enabled.
- Version changed assets, verify all routes, responsive layout, color contrast, favicon archive, early search single request and fallback/retry, existing tests, safe release ZIP, and document skipped real-device/live checks. Retain v7 rollback and private config.

## Research and verification

- GitHub supplied logo blob `980ddbedd511afd38239ddd11b5c849bde5d9f5d` and favicon archive blob `09987c4ba629c8a5537317d9bfe6f01bb76f6ef3`; archive entries and dimensions were validated. No other code or logo was generated.
- Live Worker `/addons?q=Furniture` returned two listings, and the live search page showed the same two at observation time. This does not measure the user's phone connection; the screenshot with Carft is an earlier submitted query and the Furniture screenshot shows a loading state.
- Mock Chromium validates that the head search request finishes while an artificially delayed catalog script is still loading, consumes only one request, and reuses no persistent cache. No latency guarantee. 320–1440 CSS widths, icons, light/dark, key contrast checks, existing sharing, Worker/bot suites and PHP lint passed locally. Real mobile/browser zoom, real app attachment, complete accessibility and post-upload checks remain.

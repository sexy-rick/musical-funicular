# Catalog v10 repair plan

- Fix reported share wrapping and remove all image-sharing requests/files; provide link-only native share and copy fallback. Keep controls stable and accessible.
- Prevent blank/whitespace search submission without blocking filter-only browsing; preserve queries across filter applications and cancel unsaved filter changes.
- Show a separate, honestly labeled recently updated feed for no-match queries, with independent failure/retry handling. Preserve filters and navigation.
- Move search and filter buttons together on the left, improve theme select presentation, FAQ/help and modest long-press image deterrence without claiming real copy prevention.
- Existing API already supplies the five supported types and last-updated ranges. Do not falsely label update timestamps as new upload dates or synthesize ratings/persona. The requested PlayFab repo requires a separately running authenticated Node service and unverified upstream access; do not expose its secrets or deploy it untested. Hosting and real-service validation are unresolved.
- New physical asset versions, preserve old assets, config, .htaccess, bot, Worker and database; browser/jsdom regression tests, PHP lint, package and update handoff. Any Worker/bot deployment or schema change requires separate authorization.

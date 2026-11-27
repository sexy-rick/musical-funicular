# AGENTS.md — Marketplace Trader

## Current project and non-negotiable constraints

- Website: `telegram-catalog-bridge/website/`, served by InfinityFree. The browser fetches public metadata from the Cloudflare Worker/D1. InfinityFree blocks server-side calls to `workers.dev`; do not reintroduce that dependency.
- Catalog sync: existing `@Mc_addonbot` sends public metadata to the secret-protected Worker; Telegram delivers files via UUID deep links. Do not expose bot token, sync key, Telegram file IDs, or private config. The real bot is reported at revision 68; coordinate any bot changes.
- No paid services, login, public uploads, requests, comments or admin site in this version. R2 is deferred and its hard quota is not enforced. Never claim otherwise. Do not apply the 12 pending Telegram database schema changes.
- Style: Material 3 Expressive-inspired, flat solid colors, no gradients, glow, background glow or AI button. See `DESIGN.md`.
- User-facing catalog layout: one card per row on mobile, four per row on desktop with responsive intermediate widths.
- Preserve existing public routes, query parameters, categories, CORS, bindings, bot deep links and website configuration. Website ZIP must exclude the real `config.php` and all secrets.
- CSS/JS use versioned physical filenames to prevent cached old assets mixing with new HTML. On every future change, choose new asset filenames and update every template, static error page, package and test reference; keep PHP HTML revalidation. Do not rely on visitors manually clearing caches.
- Follow the minimalism ladder; avoid unnecessary dependencies. Never bypass InfinityFree protections.

## Verification and release

- Plan: `tasks/plan.md`; research: `tasks/*-research.md`; status: `handoff.md`.
- Run `node --experimental-sqlite telegram-catalog-bridge/tests/worker.test.mjs` and `node --experimental-vm-modules telegram-catalog-bridge/tests/bot.test.mjs` for Worker/bot changes. `tests/website.test.cjs` uses jsdom as a development-only dependency; never package it with the site.
- Check PHP and JavaScript syntax, ZIP contents and applicable browser/device/accessibility tests. Separate local validation from live hosting verification.
- Preserve `CATALOG` and `SYNC_SECRET` when deploying the Worker; deployment is separate from the website and requires safe testing. No blanket challenge on `/sync`.
- Update `handoff.md` after milestones, and report skipped checks and residual risks.

# Handoff — Marketplace Trader

## Current state

- Download-only Minecraft Bedrock catalog on InfinityFree: browse, search, detail, direct download redirect, Telegram fallback. PHP/MySQL; no bot changes.
- Domain `marketplacetrader.great-site.net` and database `if0_43548113_mcaddons` were set up by user. Actual website deployment and DB connection have not been verified.
- User asked for Material 3 Expressive: no AI button, gradients, glow or background glow. Updated PHP templates and CSS use flat, muted solid surfaces, rounded shapes and responsive layouts.
- Catalog shell now renders a neutral unavailable message when config/database is missing or unreachable, without exposing details. User will create their own `config.php`; ZIP must never contain it. Local config is gitignored.
- User chose Telegram-only downloads temporarily until they can set up Cloudflare R2, not GitHub Releases. Catalog rows must use the exact existing bot UUID, with an empty `file_url` (the current NOT NULL column accepts an empty string); detail pages then show Telegram only. Adding an HTTPS R2 `file_url` later enables direct download. Bot synchronization and R2 uploads are not implemented. Bot may require channel membership. The storage guard in `website/lib/storage_guard.php` is **not connected to any upload path** and does not enforce a cap. Future R2 integration needs a properly enforced quota, including concurrency/temporary replacement usage and the provider's billing units.
- User confirmed live @Mc_addonbot is revision 66, matching the 17-module ZIP. It runs on BotFather Telegram Serverless. Screenshot shows schema '12 changes pending'; user explicitly asked to ignore it. Do not apply migrations. Automatic import and sync of bot catalog (including updates/deletions) still needs implementation.
- Important correction: InfinityFree's browser security blocks external bots/webhooks/API requests (https://forum.infinityfree.com/t/browser-security-system-features-and-limitations/49353/1). Telegram Serverless endpoints require authenticated Mini App init data, so InfinityFree cannot directly pull them. `telegram-catalog-bridge/` now contains a proposed Cloudflare Worker+D1 bridge, revision-66 bot module replacements and a website ZIP. Bot posts public catalog metadata to Worker via shared secret; InfinityFree reads Worker over outbound HTTPS. See its README. No deployment or live integration tested; no R2 uploads or cap. Existing records use an owner-triggered batched import; new/update/delete sync only on successful network requests. No retry queue and failed deletes need repair. Do not apply bot database migrations.
- Local checks: PHP syntax and missing-config fallback; mock bot sync and SQLite-backed Worker tests. Secrets are excluded and config.php is not in the ZIP. Real platform integration, quota limits, mobile UI and bot rollback remain untested.
- GitHub Actions bootstrap workflow succeeded in run 45987682315 and created a **new** Worker at `https://mc-catalog-1474006216.aman-nsipai.workers.dev`; `/health` independently returned `{"ok":true,"service":"catalog-bridge"}`. User reports setting SYNC_SECRET on Worker and private library in Telegram (not independently verified). GitHub Actions run 45990487554 successfully created and initialized a NEW D1 database named `mc-catalog-1474006216`; user must add its `CATALOG` binding to the Worker before any data works. Bot sync modules and website integration are not deployed yet. The bootstrap refuses to overwrite an existing Worker. No credentials were requested or read.
- `.github/workflows/deploy-catalog-bridge.yml` and `telegram-catalog-bridge/GITHUB-DEPLOY.md` prepare the next D1-bound deployment. Trigger is absent (`cloudflare/deploy-trigger.txt`): no deploy until owner confirms settings and agent creates it and pushes current branch. That workflow expects secret `CLOUDFLARE_API_TOKEN` and repository variables `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_DATABASE_ID`, `CLOUDFLARE_CATALOG_WORKER_NAME`; bootstrap accepted alternatives ID/TOKEN, so reconcile names before using the next workflow. New D1 schema must be applied separately; deployment to an existing name overwrites its code, so only deploy to the freshly created catalog Worker with explicit owner authorization.

## Files

- `website/` contains deployable application; `website/config.example.php` documents configuration. `website/database.sql` describes catalog table.
- `website-upload.zip` contains the contents of `website/` except SQL and secret config; extract directly into `htdocs`.
- `DESIGN.md`, `tasks/plan.md`, `AGENTS.md` record design and project conventions.
- `Mc_addonbot/` is existing bot source, untouched.

## Validation / next steps

- PHP syntax checked with PHP WASM CLI; rendered home without config and confirmed layout and fallback message. A real MySQL connection, direct downloads, InfinityFree behavior and responsive display remain unchecked.
- User uploads updated ZIP and extracts to `htdocs` overwriting old website files, preserving `config.php`. Obtain an existing bot deep link/UUID and authorized add-on metadata, add one row with empty `file_url`, and test Telegram delivery. Then implement sync and connect R2 later. No secrets in chat.
- If site remains blank, request screenshot and check exact URL/config/hosting rather than assuming the cause.

**Skipped / Unchecked:** Live deployment, MySQL queries and direct-download flow, actual mobile browser, Telegram fallback.
**Residual Risk:** InfinityFree hosting/limits and GitHub release URL changes; no enforced R2 storage cap or automated sync yet.

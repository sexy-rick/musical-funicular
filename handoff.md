# Handoff — Marketplace Trader

## Current state

- Download-only Minecraft Bedrock catalog on InfinityFree: browse, search, detail, direct download redirect, Telegram fallback. PHP/MySQL; no bot changes.
- Domain `marketplacetrader.great-site.net` and database `if0_43548113_mcaddons` were set up by user. Actual website deployment and DB connection have not been verified.
- User asked for Material 3 Expressive: no AI button, gradients, glow or background glow. Updated PHP templates and CSS use flat, muted solid surfaces, rounded shapes and responsive layouts.
- Catalog shell now renders a neutral unavailable message when config/database is missing or unreachable, without exposing details. User will create their own `config.php`; ZIP must never contain it. Local config is gitignored.
- GitHub Releases are the interim file warehouse; R2 deferred because user has no card. The storage guard in `website/lib/storage_guard.php` is **not connected to any upload path** and does not enforce a cap. The earlier claim that a hard cap was built in was incorrect. Future R2 integration needs a properly enforced quota, including concurrency/temporary replacement usage and the provider's billing units.

## Files

- `website/` contains deployable application; `website/config.example.php` documents configuration. `website/database.sql` describes catalog table.
- `website-upload.zip` contains the contents of `website/` except SQL and secret config; extract directly into `htdocs`.
- `DESIGN.md`, `tasks/plan.md`, `AGENTS.md` record design and project conventions.
- `Mc_addonbot/` is existing bot source, untouched.

## Validation / next steps

- PHP syntax checked with PHP WASM CLI; rendered home without config and confirmed layout and fallback message. A real MySQL connection, direct downloads, InfinityFree behavior and responsive display remain unchecked.
- User uploads updated ZIP, extracts to `htdocs` overwriting old website files, preserves/creates `config.php`, and visits `/index.php`. Then test actual catalog and download links. No secrets in chat.
- If site remains blank, request screenshot and check exact URL/config/hosting rather than assuming the cause.

**Skipped / Unchecked:** Live deployment, MySQL queries and direct-download flow, actual mobile browser, Telegram fallback.
**Residual Risk:** InfinityFree hosting/limits and GitHub release URL changes; no enforced R2 storage cap or automated sync yet.

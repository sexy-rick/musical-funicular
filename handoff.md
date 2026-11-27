# Handoff — Marketplace Trader

## Current state

- Download-only Minecraft Bedrock catalog on InfinityFree: browse, search, detail, direct download redirect, Telegram fallback. PHP/MySQL; no bot changes.
- Domain `marketplacetrader.great-site.net` and database `if0_43548113_mcaddons` were set up by user. Actual website deployment and DB connection have not been verified.
- User asked for Material 3 Expressive: no AI button, gradients, glow or background glow. Updated PHP templates and CSS use flat, muted solid surfaces, rounded shapes and responsive layouts.
- Catalog shell now renders a neutral unavailable message when config/database is missing or unreachable, without exposing details. User will create their own `config.php`; ZIP must never contain it. Local config is gitignored.
- User chose Telegram-only downloads temporarily until they can set up Cloudflare R2, not GitHub Releases. Catalog rows must use the exact existing bot UUID, with an empty `file_url` (the current NOT NULL column accepts an empty string); detail pages then show Telegram only. Adding an HTTPS R2 `file_url` later enables direct download. Rows must still be populated manually for now; bot synchronization and R2 uploads are not implemented. Bot may require channel membership. The storage guard in `website/lib/storage_guard.php` is **not connected to any upload path** and does not enforce a cap. Future R2 integration needs a properly enforced quota, including concurrency/temporary replacement usage and the provider's billing units.

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

# AGENTS.md — Minecraft Add-on Website + Telegram Bot

## Project

- **Website:** PHP 8.1 + MySQL on InfinityFree free tier (VistaPanel, free subdomain, free SSL). Vanilla HTML/CSS/JS, no framework, no build step.
- **Bot:** Existing JS serverless bot in `Mc_addonbot/` (`@Mc_addonbot`, imports from `sdk` / `sdk/db`). Do not rewrite the bot for v1 — integrate via deep links + HTTP sync only.
- **File storage:** GitHub Releases (primary, direct browser download) + InfinityFree `htdocs` for thumbnails/small files + Telegram `file_id` as fallback. Never store binaries in MySQL.
- **Budget:** $0. No paid services, no credit-card-required services for v1.

## Conventions

- Website code lives in `website/` (to be created in Slice 1). Bot code stays in `Mc_addonbot/` untouched unless a slice explicitly says otherwise.
- One primary action per page: **Download** (`download.php?uuid=` → 302 to `file_url`).
- All DB access via PDO prepared statements. All output escaped with `htmlspecialchars(..., ENT_QUOTES, 'UTF-8')`.
- `website/config.php` holds DB creds + sync token. It is `.gitignore`d and never committed. Commit `website/config.example.php` instead.
- Reuse the bot's field names (`uuid`, `title`, `creator`, `category`, `thumbnail_url`, `marketplace_url`, `version`, `message_link`) so bot→website sync is a straight copy.
- Categories (exact strings): `ADD-ON`, `TEXTURE PACK`, `SKIN PACK`, `WORLD`, `MASHUP PACK`, `TEMPLATE`, `APPLICATION`.
- Deep link format: `https://t.me/Mc_addonbot?start=<uuid>` (already supported by `Mc_addonbot/lib/start.js`).
- Minimalism Ladder first: YAGNI → reuse → stdlib → platform native → existing deps → direct code. No new packages without a written reason in `tasks/plan.md`.
- Tag pragmatic shortcuts with `// ponytail: <reason + revisit trigger>`.

## Commands

- No build, no npm, no composer for the website. Deploy = upload `website/` contents to InfinityFree `htdocs/` via VistaPanel file manager or FTP.
- Verify: open the InfinityFree subdomain in a browser at 375 / 768 / 1024 / 1440px; test browse → search → detail → download → Telegram fallback.
- Bot changes (Slice 2+ only): edit `Mc_addonbot/lib/handle_media.js` to POST to `sync.php`; deploy via your existing serverless flow.

## Docs

- Plan: `tasks/plan.md` (source of truth for architecture + contracts)
- Design tokens: `DESIGN.md`
- Status: `handoff.md`

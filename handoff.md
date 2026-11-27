# Handoff — Minecraft Add-on Website + Telegram Bot

## 1. Goal

Public download-only website on InfinityFree (free + subdomain, $0) listing Minecraft Bedrock add-ons from `@Mc_addonbot`, with direct browser downloads. V1 = browse → search → detail → download. Bot stays as-is; website reuses its deep links.

## 2. Current state

- **Step 2 DONE** — InfinityFree subdomain live: `https://marketplacetrader.great-site.net` (verified: shows "Your domain is ready!" from `/htdocs`).
- **Step 3 DONE** — notebook created in phpMyAdmin: database `if0_43548113_mcaddons`, table `addons` (verified: green success, 0.1261s). Test row inserted.
- **Steps 4–5 BUILT (local)** — `website/` pages + brain ready: `index.php`, `addon.php`, `search.php`, `download.php`, `lib/db.php`, `lib/storage_guard.php` (9.4 GB cap), `assets/style.css`, `.htaccess`, `config.example.php`. Awaiting user upload to `htdocs` + `config.php` creation.
- **Step 1 paused** — user has no card right now, so Cloudflare R2 deferred. Interim warehouse = GitHub Releases (no card).
- **Plan complete** (`tasks/plan.md`). Architecture locked: PHP + MySQL catalog on InfinityFree, binaries on GitHub Releases now (R2 later when card available), Telegram deep link as fallback.
- **Vibecoder roadmap added** (`tasks/plan.md` §1.5): 8 small steps (warehouse → house → notebook → pages → brain → files → fallback → SSL). User does ~45 min of clicking; agent writes all code.
- **Bot code extracted** from `Mc_addonbot_code_backup_rev66.zip` → `Mc_addonbot/` (17 files, 3,276 lines). Mapped in `tasks/plan.md` §3. No bot edits yet.
- **Conventions locked:** `AGENTS.md` (stack, contracts, security) + `DESIGN.md` (dark Operate catalog, grass-green accent, system fonts).
- **No website code yet.** No InfinityFree account/subdomain created yet. No R2 bucket created yet.

## 3. Active files

| File | Status |
|---|---|
| `tasks/plan.md` | ✅ Plan (architecture, contracts, slices, risks) |
| `AGENTS.md` | ✅ Conventions for future builds |
| `DESIGN.md` | ✅ Design tokens for Slice 1 |
| `handoff.md` | ✅ This file |
| `Mc_addonbot/` | ✅ Extracted bot source (reference only, untouched) |
| `Mc_addonbot_code_backup_rev66.zip` | Original backup (kept at root) |
| `website/` | ⏳ To be created in Slice 1 (`/Build`) |

## 4. Changes made

- Extracted `Mc_addonbot_code_backup_rev66.zip` → `Mc_addonbot/` for codebase mapping.
- Researched InfinityFree limits, GitHub Releases / Cloudflare R2 direct-download tiers, and serverless bot hosting (citations in `tasks/plan.md` §4).
- Clarified scope with user: download-only MVP, direct-from-website downloads if possible, $0 budget.
- Wrote `tasks/plan.md`, `AGENTS.md`, `DESIGN.md`, and this `handoff.md`.
- **2026-11-27 (user-requested):** Added `tasks/plan.md` §11 — hard 9.4 GB cap (app-side guard, fail-closed), delete-old-upload-new on UUID update (R2 DeleteObject), and 100% hidden bot token rules (server-only, `.gitignore`, audit checklist). Updated architecture to R2 primary.

## 5. Failed attempts

- None yet. No code written, no deploys attempted.

## 6. Specific next steps (vibecoder order — one at a time)

1. **Step 1 (PAUSED):** Cloudflare R2 deferred (no card). Use GitHub Releases as warehouse for now. Migrate to R2 later by changing `file_url` only.
2. **Step 2 (DONE):** InfinityFree subdomain `https://marketplacetrader.great-site.net` live.
3. **Step 3 (DONE):** Notebook `addons` table created in `if0_43548113_mcaddons`.
4. **Steps 4–5 (BUILT, NEXT: upload):** User uploads `website/` contents to `htdocs` via File Manager, creates `config.php` with DB creds from VistaPanel, deletes `index2.html`, tests site.
5. **Step 6:** Upload first 5 files to GitHub Releases, add to notebook, test downloads.
4. **Steps 4–5 (me, 0 min for you):** I build HTML/CSS pages + PHP brain.
5. **Step 6 (you upload 5 files, me add to notebook, 15 min):** First real downloads on your phone.
6. **Step 7 (me):** Telegram fallback button.
7. **Step 8 (you click, I guide, 5 min):** Free SSL in VistaPanel → `https://` live.
8. **Later (Slice 2):** `sync.php` + bot-side POST so new bot uploads appear automatically.

---

**Skipped / Unchecked:** Live InfinityFree deploy, real GitHub Release URLs, bot DB export sample (needed to finalize `sync.php` in Slice 2).
**Residual Risk:** InfinityFree free-tier hit cap / idle suspension; GitHub Release tag renames break URLs (mitigated by storing full URLs in `file_url`).

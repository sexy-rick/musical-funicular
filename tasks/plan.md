# Plan: Minecraft Add-on Website + Telegram Bot (Download-Only MVP)

**Owner:** sexy-rick / Mc_addonbot
**Date:** 2026-11-27
**Budget:** $0
**Status:** Planned — ready for `/Build`

## 1. Goal

A public website on InfinityFree (free tier + subdomain) that lists Minecraft Bedrock add-ons from the existing Telegram bot (`@Mc_addonbot`) and lets visitors **download directly in the browser** — no login, no paywall, no link shortener.

V1 is **download-only** (browse → search → detail → download). Request forms, admin upload, and stats come later, after v1 succeeds.

## 1.5 Vibecoder roadmap — step by step, little steep at a time

No deep tech needed. Think of the website like this:

| Piece | Simple meaning | Analogy |
|---|---|---|
| **HTML** | The skeleton — what text/buttons exist | House frame |
| **CSS** | The clothes — colors, spacing, looks nice on phone | Paint + furniture |
| **PHP** | The brain — connects pages to the notebook | Manager |
| **SQL / MySQL** | The notebook — list of add-ons (name, creator, download link) | Notebook |
| **Cloudflare R2** | The warehouse — stores the actual `.mcaddon` files | Warehouse |
| **InfinityFree** | The house — where the website lives (free subdomain) | House |
| **Telegram bot** | The delivery boy — fallback if warehouse is down | Delivery boy |

**Order matters.** We build warehouse → house → notebook → pages. One small step at a time. You never do two steps at once.

### Step 1 — Warehouse (Cloudflare R2) — PAUSED (no card right now, do later)
- **Status 2026-11-27:** User has no card right now. R2 deferred. Interim warehouse = **GitHub Releases** (no card, 2 GiB/file, unlimited bandwidth).
- When card is available: create Cloudflare account → R2 → Create bucket named `mc-addons` → turn on public access → get `https://pub-xxx.r2.dev`
- **Done when (later):** you have a bucket URL like `https://pub-xxx.r2.dev`
- *Migration later is easy: just change `file_url` in the notebook from GitHub URL to R2 URL. No page changes.*
- **Next now → Step 2 (InfinityFree house, no card needed).**

### Step 2 — House (InfinityFree) — YOU do, 10 min
- Create free InfinityFree account → add subdomain (e.g. `mcaddons.infinityfreeapp.com`)
- Open VistaPanel → note your username + `htdocs` folder
- **Done when:** you can open `https://your-subdomain.infinityfreeapp.com` and see "Welcome to InfinityFree"
- *I give you the exact clicks. No code here.*

### Step 3 — Notebook (MySQL) — I build, YOU paste, 5 min
- I write one small SQL file that creates the `addons` notebook (list of add-ons)
- You open phpMyAdmin in VistaPanel → SQL tab → paste → Go
- **Done when:** you see an empty `addons` table in phpMyAdmin
- *You don't write SQL. You just paste what I give you.*

### Step 4 — Pages you see (HTML + CSS) — I build, 0 min for you
- I build `index.php` (home grid), `addon.php` (detail page), search box
- HTML = skeleton, CSS = clothes. You just look at it on your phone.
- **Done when:** you can open the site and see a pretty grid (empty at first — that's ok)

### Step 5 — Brain (PHP) — I build, 0 min for you
- PHP connects the pages to the notebook. When someone clicks Download, PHP reads the notebook and sends them to the warehouse file.
- **Done when:** clicking a test add-on tries to download (even if file not there yet)

### Step 6 — First 5 files — YOU upload, I add to notebook, 15 min
- You upload 5 `.mcaddon` files to your R2 warehouse (drag + drop in Cloudflare dashboard)
- You copy the 5 file URLs and send them to me
- I add those 5 to the notebook (SQL insert)
- **Done when:** you can download those 5 files from the website on your phone

### Step 7 — Telegram fallback button — I build, 0 min for you
- I add a second button: "Download via Telegram" → opens `t.me/Mc_addonbot?start=<uuid>`
- Your bot already knows how to send the file. No bot change.
- **Done when:** both buttons work on the same add-on page

### Step 8 — Go live + lock (SSL) — YOU click, I guide, 5 min
- VistaPanel → SSL → free Let's Encrypt → activate
- Site now shows `https://` with a lock. Visitors trust it.
- **Done when:** `https://` works, no "Not Secure" warning

**Total for you:** ~45 min of clicking across 8 small steps. All code is mine. If any step feels steep, stop there and tell me — we finish that one step before moving on.

## 2. Constraints (locked)

| Constraint | Value | Source |
|---|---|---|
| Budget | $0, no credit card | User |
| Website host | InfinityFree free + free subdomain | User |
| Bot host | Telegram serverless (JS, `sdk` / `sdk/db`) | User + code |
| Bot username | `Mc_addonbot` | `Mc_addonbot/lib/config.js` |
| Main channel | `@Minecraft_addon_free_download` | `config.js` |
| File types | `.mcaddon`, `.mcpack`, `.mcworld`, `.mctemplate`, `.apk`, `.zip` | `handle_media.js` |

## 3. What exists today (codebase map)

Extracted from `Mc_addonbot_code_backup_rev66.zip` → `Mc_addonbot/` (17 files, 3,276 lines).

| File | Role |
|---|---|
| `schema.js` | DB tables: `users`, `files` (uuid PK, file_id, type, category, name, items JSON, caption, marketplace_url, thumbnail_url, title, creator, message_link, version, version_key, updated_at), `upload_sessions`, `post_sessions` |
| `handlers/message.js` | Dispatcher: help → delete → forward → post → upload → media → start |
| `handlers/callback_query.js` | Inline-button callbacks (upload flow) |
| `handlers/chat_member.js` | Join/leave events → `info.js` |
| `lib/config.js` | Bot username, admin ID, channel IDs/URLs, required channels, custom emoji IDs |
| `lib/start.js` | `/start` + join-gate + deep-link download (`?start=<uuid>`), `parseStartPayload()` |
| `lib/handle_media.js` (908 lines) | Admin upload flow, category detection (`.mcaddon`→ADD-ON, `.mcpack`→SKIN/TEXTURE, etc.), Marketplace metadata |
| `lib/marketplace.js` (533 lines) | Fetches Marketplace metadata (title, creator, category, price, thumbnail), UUID extraction |
| `lib/upload.js` | Multi-channel upload session (toggle channels, start/finish) |
| `lib/post.js`, `lib/forward.js` | Channel posting / forwarding |
| `lib/delete.js` | `/delete <uuid|link>` — deletes file record + channel message |
| `lib/info.js`, `lib/help.js`, `lib/diag.js`, `lib/restore.js`, `lib/ui.js` | User info, help text, error diagnostics, legacy restore, HTML escape + inline keyboards |

**Key contract already in the bot:** `https://t.me/Mc_addonbot?start=<uuid>` downloads a file by UUID. The website reuses this as a fallback — no bot change needed for v1.

## 4. Verified facts (researched 2026-11-27)

**InfinityFree free tier:**
- 5 GB storage, unlimited bandwidth on paper, 50,000 daily hits cap, 30,000 inode cap [4](https://digitalprahlad.com/best-free-web-hosting-providers/)
- PHP up to 8.3 (8.2 not on free tier), MySQL 5.6, 400 databases with **50 MB cap per DB** [1](https://blog.webhostmost.com/infinityfree-review-2026/)
- **10 MB per-file upload limit** — files larger than 10 MB cannot be uploaded to `htdocs` [1](https://forum.infinityfree.com/t/how-to-upload-big-files-archives/49305)
- Free SSL via Let's Encrypt in VistaPanel, no forced ads [1](https://blog.webhostmost.com/infinityfree-review-2026/)
- No cron / background jobs, community-forum support only, risk of suspension if no traffic for 24h [3](https://www.aeserver.com/free-vs-paid-web-hosting/)

**Direct-download storage (browser download, $0):**
- **GitHub Releases:** up to **2 GiB per file**, no total-size or bandwidth limit, served via GitHub CDN, no credit card [1](https://michaelaye.github.io/posts/github-releases-as-data-cdn/) [3](https://compresto.app/blog/github-file-size-limit)
- **Cloudflare R2:** 10 GB free storage/month, **free egress (unlimited bandwidth)**, 1M Class A + 10M Class B ops free [1](https://developers.cloudflare.com/r2/pricing/) — but requires a payment method on file even for the free tier.
- **InfinityFree `htdocs`:** direct download works, but capped at 10 MB/file [1](https://forum.infinityfree.com/t/how-to-upload-big-files-archives/49305)

**Serverless Telegram bots:**
- Cloudflare Workers free tier ~100,000 requests/day, AWS Lambda 1M invocations/month — a small webhook bot fits in $0 [1](https://aziqdev.com/blog/telegram-bot-hosting-cost) [2](https://filtori.com/en/articles/telegram-serverless-bot/)
- Your bot's `sdk` / `sdk/db` pattern matches a Workers-style serverless runtime (edge JS + hosted DB). No shared DB with InfinityFree MySQL — integration must be HTTP (deep link / webhook), not a direct DB connection.

## 5. Architecture decision (Minimalism Ladder)

**Question:** "Can users download directly from the website?" — **Yes**, with one rule: don't store big binaries on InfinityFree.

```
Visitor browser
  │
  ├─► InfinityFree (PHP + MySQL) — catalog, search, detail pages
  │     │  reads
  │     ▼
  │   MySQL `addons` table (≤50 MB, catalog only — no binaries)
  │
  ├─► Direct download (primary NOW): GitHub Releases URL (no card)
  │     https://github.com/<owner>/<repo>/releases/download/<tag>/<file>.mcaddon
  │     (2 GiB/file, unlimited bandwidth, no card)
  │
  ├─► Direct download (primary LATER): Cloudflare R2 public URL
  │     https://pub-xxx.r2.dev/addons/<uuid>/<file>.mcaddon
  │     (10 GB free, free egress, CDN — needs card, deferred)
  │     Hard cap enforced in code at 9.4 GB (see §11.1, applies when R2 is live)
  │
  └─► Fallback: Telegram deep link
        https://t.me/Mc_addonbot?start=<uuid>
        (bot sends file via file_id — already works, zero change)
```

**Why this wins on the ladder:**
1. **YAGNI:** No login, no upload, no request form in v1 — download-only as requested.
2. **Reuse:** Reuse the bot's existing `files` fields + `?start=<uuid>` deep link. No bot rewrite.
3. **Stdlib / Platform native:** Vanilla PHP + MySQL + HTML/CSS/JS. No framework, no build step, no npm, no Composer — InfinityFree has no Node.
4. **Existing deps:** None. Zero packages to install.
5. **Direct code:** One `index.php`, one `addon.php`, one `download.php`, one `search.php`, one `sync.php` (import endpoint).

**Storage ranking for direct browser download ($0):**
1. **GitHub Releases (primary NOW, no card)** — free, no card, 2 GiB/file, unlimited bandwidth. Use this until card is available.
2. **Cloudflare R2 (primary LATER, per user choice)** — 10 GB free + free egress, CDN, needs card on file (Discover accepted). Hard cap at 9.4 GB enforced in code (see §11.1). Migrate by changing `file_url` only.
3. **InfinityFree htdocs (small files only)** — fine for thumbnails and <10 MB packs, not for large add-ons.
4. **Telegram `file_id` (fallback only)** — not a browser URL; needs the bot. Keep as "Download via Telegram" button.

## 6. Contracts (frozen for v1)

### 6.1 Website MySQL table `addons`

Mirrors the bot's `files` table so a future sync is a straight copy:

```sql
CREATE TABLE addons (
  uuid            VARCHAR(36) PRIMARY KEY,  -- Marketplace UUID, same as bot
  title           VARCHAR(255) NOT NULL,
  creator         VARCHAR(255),
  category        VARCHAR(64),              -- ADD-ON | TEXTURE PACK | SKIN PACK | WORLD | MASHUP PACK | TEMPLATE | APPLICATION
  version         VARCHAR(32),
  thumbnail_url   VARCHAR(512),
  marketplace_url VARCHAR(512),
  file_url        VARCHAR(512) NOT NULL,    -- GitHub Releases direct URL (primary)
  file_name       VARCHAR(255),
  file_size       BIGINT,                   -- bytes, for display
  file_ext        VARCHAR(16),              -- mcaddon | mcpack | mcworld | ...
  message_link    VARCHAR(512),             -- t.me channel post (optional)
  updated_at      INT NOT NULL,             -- unix timestamp
  INDEX idx_category (category),
  INDEX idx_title (title)
);
```

- Catalog-only: no binaries in MySQL. 50 MB cap is plenty for thousands of rows.
- `file_url` is the single source of truth for direct download.

### 6.2 Pages (v1)

| Page | File | Purpose |
|---|---|---|
| Home / Browse | `index.php` | Category chips + latest add-ons grid, search box |
| Search | `search.php?q=` | Title/creator search (MySQL `LIKE`, prepared statements) |
| Detail | `addon.php?uuid=` | Thumbnail, title, creator, category, version, size, description, **Download** + **Download via Telegram** |
| Download | `download.php?uuid=` | 302 redirect to `file_url` (counts as the one primary action) |
| Sync (admin) | `sync.php` | `POST` JSON array → upsert into `addons`. Token-protected. Used by manual import now, bot webhook later. |

### 6.3 Bot ↔ Website integration

- **Website → Bot (v1, no bot change):** Deep link `https://t.me/Mc_addonbot?start=<uuid>` — already implemented in `lib/start.js` (`parseStartPayload` + file lookup by UUID).
- **Bot → Website (v1, manual):** Export catalog as JSON from the bot DB, `POST` to `sync.php` with a shared secret token. No shared DB, no cron.
- **Bot → Website (v2, later):** Bot calls `sync.php` automatically after each upload in `handle_media.js`. Same endpoint, same token.

### 6.4 Security (non-negotiable)

- All queries via PDO prepared statements. No string-concatenated SQL.
- `sync.php` requires `X-Sync-Token` header matching a secret in `config.php` (never committed).
- `config.php` (DB creds + token) is `.gitignore`d and never uploaded to the repo.
- Escape all output with `htmlspecialchars(..., ENT_QUOTES, 'UTF-8')`.
- No user accounts in v1 → no password storage, no session risk.

## 7. Vertical slices

### Slice 1 — MVP: Download-only catalog (this is v1)
- [ ] `DESIGN.md` tokens + `AGENTS.md` conventions (done in this plan)
- [ ] MySQL `addons` table + seed with 10–20 real add-ons (GitHub Releases URLs)
- [ ] `index.php` (browse + category filter), `search.php`, `addon.php`, `download.php`
- [ ] Responsive layout at 375 / 768 / 1024 / 1440px, no horizontal scroll
- [ ] Deploy to InfinityFree subdomain, free SSL in VistaPanel
- [ ] **Done when:** a visitor can browse, search, open a detail page, and download a `.mcaddon` directly in the browser, with a working "via Telegram" fallback.

### Slice 2 — Catalog sync (bot → website)
- [ ] `sync.php` token-protected JSON import
- [ ] One-click export from bot (manual JSON now; auto-POST from `handle_media.js` later)
- [ ] **Done when:** uploading a file in the bot appears on the website without hand-editing MySQL.

### Slice 3 — Polish (only after Slice 1 succeeds)
- [ ] Thumbnails, version badges, "How to install" steps per file type
- [ ] SEO meta + sitemap, download counter
- [ ] Request form / admin upload (per your "once we succeed" note)

## 8. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| InfinityFree 10 MB/file limit | Large `.mcaddon` can't live in `htdocs` | GitHub Releases as primary store; `htdocs` for thumbnails only |
| InfinityFree 50 MB MySQL cap | Catalog overflow | Catalog-only table (no binaries); paginate + `LIMIT` |
| InfinityFree 50k hits/day + suspension if idle | Site pauses | Keep pages light (no framework, no images >200 KB); drive traffic via Telegram channel posts |
| No cron on InfinityFree | No auto-sync | Manual JSON import in v1; bot-side POST in v2 (bot has its own runtime) |
| GitHub Releases ToS | Files are public, no private access | Fine for public add-ons; don't upload anything private |
| Copyright (Marketplace content) | Takedown risk | Link to Marketplace URL on every detail page; keep `marketplace_url` populated |

## 9. What we explicitly skip in v1 (YAGNI)

- User accounts / Telegram Login (add only if needed)
- Website-side file upload (bot already handles uploads)
- Request-a-pack form (Slice 3)
- Comments, ratings, ads, link shorteners
- Node / React / WordPress (InfinityFree can't run Node; WP would eat the 50 MB DB cap)

## 10. Next steps

1. **Step 1 (you):** Cloudflare R2 bucket `mc-addons` → send me the `https://pub-....r2.dev` URL.
2. **Step 2 (you):** InfinityFree account + free subdomain → send me the subdomain.
3. **Steps 3–5 (me → you paste):** I build MySQL notebook + HTML/CSS pages + PHP brain.
4. **Step 6:** You upload first 5 files to R2, I add them to the notebook.
5. **Steps 7–8:** Telegram fallback button + free SSL → live.

---

## 11. Hard limits & safety (user-requested 2026-11-27)

### 11.1 Hard core limit at 9.4 GB — "never charge me"

**Simple meaning:** Cloudflare has no "stop" button, so we build our own stop in code. Before any new file is added, we check: "Will total files go over 9.4 GB?" If yes → block with "Storage Full". 9.4 GB leaves 0.6 GB buffer below the 10 GB free tier for rounding (Cloudflare rounds up to the next GB-month) [1](https://developers.cloudflare.com/r2/pricing/index.md).

**Why 9.4 GB:** 10 GB free tier is a billable allowance, not a hard stop — exceeding it generates charges instead of stopping [3](https://community.cloudflare.com/t/feature-request-hard-spending-usage-caps-for-the-age-of-ai-agents-context/974969). 9.4 GB is safely under, even with rounding.

**How it works (both sides enforce):**

| Side | Where | Check |
|---|---|---|
| **Website (PHP)** | `sync.php` + `lib/storage_guard.php` (new) | `SELECT SUM(file_size) FROM addons` → if `total + new_size > 9.4GB` → return HTTP 507 "Storage Full", do not insert |
| **Bot (JS)** | `Mc_addonbot/lib/handle_media.js` + new `lib/storage_guard.js` | `SELECT SUM(file_size) FROM files` → same check before upload. If full → tell admin "Storage full, delete old add-on first" |
| **Update case** | Both sides | If updating same UUID: `total - old_size + new_size > 9.4GB` → block. Deleting old first frees space (see §11.2) |

**Constants (frozen):**
```php
// website/lib/storage_guard.php
const STORAGE_LIMIT_BYTES = 10092649186; // 9.4 GiB = 9.4 * 1024^3
// ponytail: 9.4 GiB leaves 0.6 GiB buffer for Cloudflare rounding; revisit if R2 free tier changes
```

```js
// Mc_addonbot/lib/storage_guard.js
export const STORAGE_LIMIT_BYTES = 10092649186;
```

**Fail-closed:** If the SUM query fails or returns null, block the upload (don't guess). Log the error for admin.

**Tests (must pass before live):**
- Total 9.3 GB + new 0.2 GB file → blocked (9.5 > 9.4)
- Total 9.3 GB + update same UUID (old 0.5 GB → new 0.6 GB) → allowed (9.4 exactly)
- Total 9.4 GB + delete 1 GB → next 0.5 GB upload allowed
- SUM query fails → upload blocked, error logged

**Also set (you, 1 min):** Cloudflare dashboard → Billing → Alerts → notify at $1. This is a safety net email, not a stop — the code above is the real stop.

### 11.2 Delete old & upload new — "update replaces, doesn't duplicate"

**Simple meaning:** When you upload v2 of the same add-on, we delete v1 first, then add v2. No duplicates, no wasted space. This also helps stay under 9.4 GB.

**Identity:** Same **UUID** = same add-on. Your bot already uses UUID as the primary key in `files` table (`schema.js`). If UUID matches, it's an update.

**R2 key structure (frozen):**
```
addons/<uuid>/<filename>
e.g. addons/a1b2c3d4-.../CoolAddon_v2.mcaddon
```
Old and new versions have different filenames, so they don't collide. We delete the old key after the new one is safely uploaded.

**Flow (safe order — never delete before upload succeeds):**

```
1. Admin uploads new file (bot or R2 dashboard)
2. Check UUID exists? 
   - No → normal insert (check 9.4 GB limit first)
   - Yes → it's an update:
     a. Upload NEW file to R2 (new key) — if this fails, STOP, old file untouched
     b. Delete OLD file from R2 via DeleteObject API [1](https://developers.cloudflare.com/r2/objects/delete-objects/)
        - Workers: `env.MY_BUCKET.delete(key)` [1](https://developers.cloudflare.com/r2/objects/delete-objects/)
        - S3 API: `DeleteObjectCommand({Bucket, Key})` [1](https://developers.cloudflare.com/r2/objects/delete-objects/)
     c. Update DB record (same UUID, new file_url, new version, new file_size)
     d. Delete old Telegram channel message via existing `deleteMessageLink()` in `lib/delete.js` (optional, keeps channels clean)
3. Done — total size = old total - old_size + new_size
```

**Where to implement:**
- **Bot:** `Mc_addonbot/lib/handle_media.js` — add `replaceExisting(uuid, newFile)` helper. Reuse existing `deleteMessageLink()` from `lib/delete.js`.
- **Website:** `website/sync.php` — on upsert, if `file_url` changed, call R2 DeleteObject for old key (via S3-compatible API from PHP, or via Workers binding if bot does it). Simpler for v1: bot deletes old R2 file, website just updates the notebook row. Website never deletes R2 directly in v1 (YAGNI).
- **Manual (v1, you):** In R2 dashboard, delete old file → upload new → tell me new URL → I update notebook. Same result, no code needed for first 5 files.

**Tests:**
- Upload v1 (100 MB) → upload v2 same UUID (120 MB) → R2 has only v2, DB has v2, total = 120 MB (not 220 MB)
- Upload v2 fails (bad file) → v1 still there, DB unchanged
- Delete old R2 fails → DB not updated, error logged, admin notified

### 11.3 Hide 100% bot token — "never show it to anyone"

**Simple meaning:** Your bot token is like your house key. Anyone with it can control your bot. We never put it in the website, never in GitHub, never in browser code. Only the bot server and website server know it, and only in secret files.

**Verified facts:**
- "Never Expose Bot Token: The bot token is a secret—never include it in client-side code" [1](https://www.w3tutorials.net/blog/telegram-authorization-without-default-button/)
- "Treat the token like a password and not hardcode it in source code" [2](https://botpassword.com/keys/telegram)
- "Do not paste a real token into documentation, screenshots, chat messages, issue trackers, client-side JavaScript, or a public repository" [3](https://www.entergram.com/blog/telegram-access-token-api-id-hash-session-string)
- "Never ship it to the browser, commit it, put it in an image, print the full Bot API URL, or include it in application logs" [4](https://playcode.io/blog/how-to-create-a-telegram-bot)

**Your current bot is already safe:** `Mc_addonbot/lib/config.js` has **no token** — it uses `import { api } from 'sdk'`, so the token lives in your serverless platform's secrets, not in code. ✅ Keep it that way.

**Rules for website (frozen):**

| Rule | How |
|---|---|
| Token never in browser | Website HTML/JS only gets deep link `https://t.me/Mc_addonbot?start=<uuid>` — no token needed for that |
| Token only in server secret | `website/config.php` on InfinityFree server only (never in GitHub, `.gitignore`d). If website needs to call Telegram API (e.g. verify join gate), it does so in PHP server-side, never outputs token |
| Token never in logs | Never log full Bot API URL (it contains token). Log only `sendMessage` result, not URL |
| Token never in GitHub | `.gitignore` must include `config.php`, `.env`, `*.key`. Commit `config.example.php` with placeholder `YOUR_TOKEN_HERE` only |
| Token never in screenshots/chat | Don't paste token in chat, docs, or issues. If leaked → BotFather `/token` → new token → update both servers |
| Block config access | `.htaccess` denies direct access to `config.php` and `lib/` folder |

**Audit checklist (before live):**
- [ ] `grep -r "bot.*token\|BOT_TOKEN\|123456:" Mc_addonbot/ website/` → no real token found
- [ ] `config.php` not in GitHub (`git status` clean, `.gitignore` has it)
- [ ] Opening `https://your-site/config.php` in browser → 403/404, not code
- [ ] View-source on every page → no token string
- [ ] Bot token stored only in: (1) serverless platform secrets, (2) InfinityFree `config.php` on server

**If token ever leaks:** BotFather → `/token` → pick bot → copy new token → update serverless secrets + InfinityFree `config.php` → test bot. Old token stops working immediately.

---

**Skipped / Unchecked:** Live InfinityFree deploy, real R2 bucket URL, bot DB export sample for `sync.php`, R2 API credentials for PHP-side delete (v1 uses bot-side delete only).
**Residual Risk:** 9.4 GB guard relies on DB SUM accuracy — if R2 and DB drift (manual R2 uploads without DB update), guard may be off. Mitigation: always add files via bot or tell me the URL so DB stays in sync; periodic R2 dashboard check.

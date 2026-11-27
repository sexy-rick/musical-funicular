# Automatic catalog connection: setup guide

**Status: prepared for testing, not yet deployed or verified on BotFather/Cloudflare/InfinityFree.** Read this guide before installing. This is an alternative to the old MySQL catalog: it uses a Cloudflare Worker and D1 for public catalog metadata. Your current `config.php` and MySQL database stay untouched.

## What this does

- The bot sends add-on metadata to a small Cloudflare Worker. The Worker stores it in a free-tier D1 database.
- InfinityFree reads the public catalog from that Worker. Visitors browse and search, then open an add-on in Telegram.
- Existing bot records need a **one-time batch import**; new uploads/updates and bot `/delete` events attempt to sync automatically.
- **Does not upload files to R2.** Direct downloads, R2 uploads, quota enforcement and R2 replacement will be built separately. No 9.4 GB guard is enforced here.
- The bridge exposes titles, creator names, categories, versions, size, thumbnail and Marketplace URLs publicly. Only publish records you have permission to share. It never copies Telegram file IDs, bot tokens or user data.
- This changes the bot's code, not its database schema. **Do not run a migration or apply the 12 pending bot database changes.** Keep a copy of revision 66 for rollback.

## Before starting

1. A Cloudflare account on the **Workers Free** plan (a card is normally not needed for Workers/D1; R2 is a separate service). Limits apply; check your account before enabling anything paid.
2. Your existing InfinityFree `config.php` stays private. Never send credentials, the BotFather CLI access token or the sync key in chat or screenshots.
3. A long random sync key: download `secret-generator.html` and open it **locally on your own device**, tap Generate, and keep the key private. It uses the device's cryptographic random generator and makes no network requests. You will paste the **same 64-character key** into Cloudflare and the private bot library. Never commit that private library to GitHub.
4. Only use this guide with the exact revision 66 bot backup. Back up current bot code before replacing any module.

## 1. Set up the Cloudflare bridge

You can follow the manual steps below, or use [GITHUB-DEPLOY.md](GITHUB-DEPLOY.md) to deploy the Worker through GitHub Actions after creating D1. Do not do both deployments to an existing Worker name.

Dashboard labels may differ slightly. Do not select a paid plan.

1. In Cloudflare dashboard, open **Workers & Pages**. Create a Worker on the free plan and give it a name. Use **Edit code**, replace the sample code with the full contents of `cloudflare/worker.js`, and save/deploy. It may show a service error until the next steps are complete.
2. Under **Storage & databases → D1**, create a database (e.g. `marketplace-catalog`). Open its **Console**, paste the whole `cloudflare/schema.sql`, then execute it. This SQL is for the NEW Cloudflare database, **not** BotFather's database and not phpMyAdmin.
3. Open the Worker **Settings → Bindings**, add a **D1 database binding**, set variable name exactly `CATALOG`, and select your new D1 database. Save/deploy.
4. In the Worker's **Settings → Variables and Secrets**, add a **secret** named `SYNC_SECRET` containing your privately generated key. Save/deploy. Do not make it a public variable, put it in a URL, or share it.
5. Copy the Worker's base URL, like `https://your-worker.your-account.workers.dev` (no trailing slash). Open `YOUR-WORKER-URL/health` in a browser. It should show `{"ok":true,"service":"catalog-bridge"}`. This checks the Worker is online, not that D1 or bot sync works.

## 2. Prepare the website (without replacing your secret config)

1. Download `website-upload.zip` **from this folder**. Extract its contents into InfinityFree `htdocs`, replacing matching site files. It does **not** contain `config.php`, so your existing config is preserved. Do not extract the bot or Cloudflare files into `htdocs`.
2. Edit the existing `htdocs/config.php` privately. Inside its `return [ ... ];` array, add this line, replacing the URL with your real Worker URL from step 1:

   `'catalog_url' => 'https://your-worker.your-account.workers.dev',`

   Keep the other lines and commas. There must be no trailing `/`. **This URL is public and is not the secret key.**
3. Visit the website. Before importing add-ons, an empty catalog is expected. If it says the catalog is getting ready, stop and check Worker URL, binding, D1 schema and site connection.

## 3. Update the bot safely

These are replacement **source modules**, not an import into the bot database. In BotFather → Serverless → Library / Handlers, open each module and replace its contents with the matching file below; save after each one. Create the two new library modules first so the replacement modules can import them. Do not change schema or run migrations.

1. Create a library named `web_sync_private`. Use the contents of `bot/lib/web_sync_private.example.js` as a template. In BotFather only, fill in your public Worker URL and your private 64-character sync key. Never upload this real module to GitHub or show it in screenshots. If the key is exposed, change it in both places.
2. Create library `web_sync`, pasting `bot/lib/web_sync.js`.
3. Replace existing library `handle_media` with `bot/lib/handle_media.js`.
4. Replace existing library `delete` with `bot/lib/delete.js`.
5. Replace existing `message` handler with `bot/handlers/message.js`.

Keep a copy of revision 66. If saving or running the bot produces an error, stop and restore the original three modules. Do not apply database changes as a troubleshooting step. The additions are designed not to interrupt uploads if the bridge is unreachable; failures are reported to the admin. Actual behavior is not yet verified on the live platform.

## 4. One-time import and test

1. In a **private chat with your bot**, from the bot admin account, send `/websync`. It imports at most 20 records per batch; follow the bot's `Next batch` command until it says Finished. If a batch fails, rerun the same command after fixing the bridge. Only Marketplace UUID records are supported; non-UUID records are skipped.
2. Refresh your website and open one add-on → **Open in Telegram**. The bot's normal channel-join requirements still apply.
3. Test a new authorized add-on and an update. Check that the bot reports success and the website reflects the change. Test deletion only with a disposable record; verify it disappears.

## Limitations and safety

- No automatic background retry queue. A failed upload/update sync can be retried with `/websync`; a failed deletion requires an explicit repair (ask for help), otherwise the old website listing may remain. Running `/websync` alone does not remove stale listings. Monitor admin messages and test before relying on it.
- Listing endpoint is public by design, bounded to 24 items per page; website search currently shows the first 24 matches. Any internet user can read the catalog. Do not send private metadata.
- The free-tier Worker/D1 and your web host have quotas; failures return a friendly unavailable message. No guarantee of uptime. A full batch can require up to 20 Worker writes; large catalogs need several batches.
- No authenticated Mini App endpoint is being called from InfinityFree: Telegram Serverless Mini App endpoints require verified Telegram init data. The bot instead sends public metadata to the Worker. InfinityFree calls the Worker over outgoing HTTPS. These integrations still require live testing.
- A deleted catalog entry is recorded as a tombstone to stop older import records restoring it. Two updates within the same second may not be reflected reliably; retry after another update. Existing bot items with non-UUID IDs are skipped because the current bot's normal direct UUID deep-link flow does not serve them.

## Rollback

Restore original revision 66 `handlers/message`, `lib/handle_media`, and `lib/delete` in BotFather. Re-upload the previous website ZIP while keeping your `config.php`. Do not delete the Telegram database. Delete the private bot library and disable the Cloudflare secret/Worker if you no longer need them.

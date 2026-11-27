# GitHub Actions deployment (optional)

This is an alternative to manually pasting Worker code in the Cloudflare dashboard. It does not deploy until the deployment marker is created or changed and pushed on the session branch. Never put credentials in chat, code, workflow inputs, screenshots, or Git.

1. In Cloudflare create a **new** D1 database for this catalog. Run `cloudflare/schema.sql` in that new D1 database console. Do not change or migrate the Telegram database.
2. Choose a **new, unused** Worker name (lowercase, digits and hyphens). Deploying to an existing name overwrites that Worker's code/config. Do not use `marketplacetrader`, `marvin-gateway`, or any existing Worker.
3. In GitHub repository **Settings → Secrets and variables → Actions**, add the following:
   - **Secret:** `CLOUDFLARE_API_TOKEN` — a restricted Cloudflare token allowed to deploy Workers in the intended account. Create or paste it directly in GitHub; never send it to chat. Account API tokens and user API tokens can have different scope rules; follow Cloudflare's UI. Limit access to the required account and permissions.
   - **Variable:** `CLOUDFLARE_ACCOUNT_ID` — your Cloudflare account ID (32 hex characters).
   - **Variable:** `CLOUDFLARE_D1_DATABASE_ID` — the UUID for the new D1 database, not its name.
   - **Variable:** `CLOUDFLARE_CATALOG_WORKER_NAME` — the new, unused Worker name chosen above.
4. Once all settings are verified, ask the agent to trigger the deploy. The agent changes `cloudflare/deploy-trigger.txt` and pushes the **current session branch**. A GitHub Actions workflow on that push deploys the Worker and binds the D1 database as `CATALOG`. View the result in GitHub → Actions. It does not create the D1 database or run any SQL. Workflow dispatch is intentionally not used: GitHub requires workflow-dispatch files to exist on the default branch, and this session cannot change that branch.
5. In the new Worker's Cloudflare settings, add a **secret** named `SYNC_SECRET`, using the random private sync key described in `README.md`. This is a different secret from the Cloudflare API token. Then continue from the website and bot sections in `README.md`.

Only trusted people should be able to push this branch or edit the workflow/trigger: code running in a GitHub Actions job can use deployment secrets. Never put the token in pull requests or use pull-request triggers. If a token has been exposed, revoke it at Cloudflare and replace the GitHub secret. Do not enable Cloudflare Access in front of the bridge without designing service authentication, because the bot and website must call it.

Status: workflow syntax and configuration generation can be tested locally; deployment requires the owner's real Cloudflare account and has not been tested live.

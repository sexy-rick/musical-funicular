# Marketplace Trader Android — experimental test build

Flutter Android catalog client with flat Material 3-inspired warm colors, no AI button, glows, gradients, AI styling, or decorative symbols. Browse/search/filter uses the existing public catalog. Files are requested through the user's own Telegram account using TDLib; sessions are not shared and no pre-logged-in account or bot token is included. Telegram Login OAuth alone is not a user session.

## Important test limitations

This is an **experimental debug build**. Live Telegram authentication, file bot behavior, download correlation, membership gates, real-device save flow and large files have not been verified. The bot protocol lacks request IDs in replies, so another Telegram client can produce unrelated bot files while a request is active. The app shows candidate document names and asks the user to choose instead of claiming an exact match. The current implementation handles document replies, not video/photo packs; if no document arrives, open the bot in Telegram. It does not bypass required channel membership. API errors/timeouts and unsupported login variants require Telegram fallback. Do not distribute as a production-ready app or promise one-tap delivery.

## First-run developer configuration

TDLib requires an application API ID and API hash obtained by the app developer through Telegram's developer portal. The test build intentionally contains none. Enter an application API ID and hash in the app's Telegram account screen on the device, then authenticate your own Telegram account. Never post application credentials, login codes, passwords, bot tokens or session databases in GitHub or chat. Application API identifiers/hashes delivered to end-user apps are extractable and must not be treated as strong server secrets. A production release needs a reviewed approach for configuring the developer's application identity. No credentials are needed merely to browse.

The account session is held on the device by TDLib, with its database key stored using Android secure storage; device security and rooted devices affect protection. Android backup is disabled. The app intentionally keeps Telegram messages off our own server. Users must be informed that starting a bot sends an action as their Telegram account.

## Build

The branch GitHub Actions workflow builds a **debug-signed test APK**, not a Play Store release. It generates Flutter Android scaffolding, configures Internet permission and the system save dialog, installs checksum-pinned third-party prebuilt TDLib libraries for arm64-v8a, armeabi-v7a and x86_64, runs Flutter tests and uploads an artifact. Prebuilt TDLib source and build provenance are specified in `scripts/tdjson-manifest.json`; audit them before release. Upstream TDLib is Boost Software License 1.0; third-party build dependencies and licenses must be reviewed for distribution. The artifact expires after 14 days.

No existing Cloudflare Worker, website, Telegram bot or database is deployed or modified by the workflow. Android builds require internet access to Flutter/Gradle/pub and GitHub releases. A stable release needs its own protected signing key, tested upgrades, privacy policy, Telegram API compliance and rights to distribute content.

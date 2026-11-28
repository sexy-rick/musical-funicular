# Alium by Marketplace Trader — Android test build

Flutter Material 3 catalog app using the existing public catalog and the user's own TDLib Telegram session. It does not contain a shared Telegram account or a bot token. Android package ID is `alium.amberlyst.com`, so this installs separately from the earlier Marketplace Trader prototype and does not transfer its private session or preferences.

## Authentication and privacy

A developer obtains their own Telegram application API ID and hash through my.telegram.org and configures both as Dart defines `TELEGRAM_API_ID` and `TELEGRAM_API_HASH`; end users sign in with their own phone, code and optional two-step password. For the CI test build, optionally configure GitHub Actions secrets `ALIUM_TELEGRAM_API_ID` and `ALIUM_TELEGRAM_API_HASH` privately in repository settings, not in chat. With neither configured the debug APK exposes an explicitly labeled developer-only setup screen, so browsing still works. CI rejects half-configured values. Values embedded in an APK are extractable; CI secrets do not make the distributed app a safe secret store. Do not use someone else's application credentials. The session is stored locally with the TDLib database key held in Android secure storage; backup is disabled. User-initiated downloads send a request to the bot as that user.

## Download limitations

The current bot doesn't guarantee reply/request correlation. The download button requests in place, but a user must verify and select each candidate document. Replies may be unrelated or promotional. This client doesn't handle bot photos/videos as downloadable documents. Channel join gates are not bypassed; user-initiated native Telegram links have an optional browser fallback. One bot request can be active at a time. Android 10+ saves selected files to `Downloads/Alium/<category>` through MediaStore; Android 9 and below asks for a location with the system picker. The Downloads screen retains completed file URIs and supports opening, deleting and removing from history. Active requests and TDLib transfers are not guaranteed to survive closing, process death, reboot or background restrictions. Do not claim a safe persistent queue or background downloads without further implementation and real-device testing.

## Metadata

The existing catalog is retained and its available file size is shown. Toolcoin v1.6.2 source has been identified, but its metadata service authorization, license and real-world responses have not been verified. No Toolcoin code, secrets, download/decryption functionality or unverified metadata was integrated. Missing values are not invented.

## Build and testing

The GitHub Actions workflow generates the Flutter Android project, runs analysis and tests, installs checksum-pinned third-party TDLib binaries and uploads a **debug-signed test APK** retained for 14 days. Inspect `scripts/tdjson-manifest.json` and audit the native binaries and third-party licensing before distribution. A production release requires signing, privacy, security, Telegram terms and content-rights review. Configure optional developer values through `--dart-define` for local builds; avoid recording them in shell history or source. No Worker, website, bot or database deployment is performed.

This build has not been independently tested with live Telegram, file bot, actual Android MediaStore, country-specific phone formatting, session-list branding or on a real device. Telegram clients choose their own session icons; an Alium launcher icon does not automatically appear in another app's session list.

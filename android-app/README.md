# Alium by Marketplace Trader

Flutter Material 3 catalog app, application ID `alium.amberlyst.com`. Each user signs in to their own Telegram account. No shared Telegram session or bot token is embedded.

## CI Telegram configuration

Privately configure GitHub Actions repository secrets `TGID` and `TGHASH` as the developer's Telegram application API ID and hash, respectively. Do not put them in chat. Both values must be present together; if neither exists the app provides a developer setup screen. The values compiled into an APK are extractable even if stored as Actions secrets. Do not use another developer's credentials. Authentication codes and passwords are entered only on the user's device; TDLib session data is local, its database key is stored using secure storage, and Android backup is disabled.

## Signed release setup

This workflow produces a **release-mode APK signed with your own persistent release key**, never a debug-signing fallback. Configure these GitHub Actions secrets privately in repository settings:

- `ALIUM_KEYSTORE_BASE64`: base64 of the release keystore file.
- `ALIUM_KEYSTORE_PASSWORD`: keystore password.
- `ALIUM_KEY_ALIAS`: release key alias.
- `ALIUM_KEY_PASSWORD`: key password.

Keep a secure independent backup of the keystore and passwords. Losing the release key can prevent app updates. Use the **same signing key** as a previously installed app to update it while retaining its data. The previous test APK was debug-signed; a release signed with a different key cannot update it. Uninstalling the existing app may remove its private Telegram session/history, so back up anything important and sign in again as needed. The workflow checks that all signing values exist, builds `app-release.apk`, verifies its signature with `apksigner`, and removes the temporary keystore. No keystore is committed. Review the signing certificate fingerprint before distribution.

## Downloads and import: important limitations

One Download action contacts the bot and immediately starts each matching document response at TDLib priority 32 (the highest queue priority). That prioritizes downloads within TDLib; it does **not** guarantee faster network throughput. Pause requests TDLib cancellation and resume restarts it; byte preservation and process-death behavior are not verified. Saving copies the completed file to MediaStore or a user-selected SAF folder; older Android uses a per-file picker when no folder is selected. Transfers are not guaranteed to continue in the background or after process death. Multiple document replies are accepted until a 15-second quiet period after all saves; the bot supplies no verified end marker. The existing heuristic matches sender/chat/message ordering, not a guaranteed request ID, so late or unrelated bot replies could be associated with the wrong request or be missed. Test against the live bot; do not describe this as verified correlation. No bot or schema was changed.

For `.mcpack`, `.mcworld`, `.mcaddon` and `.mctemplate`, Alium sends a package-targeted `ACTION_VIEW` with a read grant to the official Minecraft application, without automatically falling back to another app. Android activity launch is not import confirmation; current Minecraft builds and URI/MIME compatibility have **not been tested on a real device**. The game itself reports import results. Other file types use Android's normal open behavior. Selected SAF providers may revoke access or fail; old files remain in their original locations.

## Build and testing

The workflow generates the Android project, installs checksum-pinned TDLib binaries, runs Flutter analysis/tests, builds a signed release APK and uploads it for 14 days. Inspect `scripts/tdjson-manifest.json` and audit native binaries and third-party licenses before distribution. Production distribution requires privacy, security, Telegram terms and content-rights review. No Worker, website, bot, database, or migration deployment is performed. Real Android/Telegram/Minecraft device tests remain required.

If signing secrets are missing, CI may compile using a disposable validation-only key, immediately discard that APK/key, and then fail the release step. That check is not a release artifact and cannot be used to sign future updates.

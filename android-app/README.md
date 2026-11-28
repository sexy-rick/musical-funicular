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

Files open using Android's **Open with** chooser and a temporary read grant. Android activity launch is not import confirmation; current Minecraft builds and URI/MIME compatibility have **not been tested on a real device**. Selected SAF providers may revoke access or fail; old files remain in their original locations. Refresh searches app-owned MediaStore downloads under Download/Alium and the currently selected SAF tree; Android may restrict access to files owned by other apps or after reinstall. It does not scan arbitrary storage. Pack icons are best effort, bounded and non-extracting; large, nested or unsupported archives use the generic icon.

## Build and testing

The workflow generates the Android project, installs checksum-pinned TDLib binaries, runs Flutter analysis/tests, builds a signed release APK and uploads it for 14 days. Inspect `scripts/tdjson-manifest.json` and audit native binaries and third-party licenses before distribution. Production distribution requires privacy, security, Telegram terms and content-rights review. No Worker, website, bot, database, or migration deployment is performed. Real Android/Telegram/Minecraft device tests remain required.

If signing secrets are missing, CI may compile using a disposable validation-only key, immediately discard that APK/key, and then fail the release step. That check is not a release artifact and cannot be used to sign future updates.

If you do not already have a release key, create one locally with `keytool -genkeypair -keystore alium-release.jks -alias alium -keyalg RSA -keysize 4096 -validity 10000`; keytool prompts for the passwords. Back up the keystore and passwords securely. Base64-encode the file locally (for example `base64 -w 0 alium-release.jks` on Linux) and enter the result and the other three values into the repository's Actions secrets settings. Do not paste any of them into chat. Keep using this key for future releases.

## Update metadata and distribution

This build checks the public `Alchemiisst/Alium` release list on app launch at most once per 24 hours and offers a manual Settings check. It considers published stable and beta pre-releases, skips drafts, selects the most recently published release among the first 30 results, and requires both `update.json` and `app-release.apk` attached to that release. A newer release with missing files is reported as an error rather than treated as up to date. Publishing an older version after a newer one can cause that older release to be selected, so publish versions in order. The beta-aware flow and end-to-end upgrade have not been verified on a device or against a complete live release. The first updater-enabled APK must be manually installed with the existing release key and a higher version code; a later release is required to test updating. Installation requires the user's permission and the Android installer, which performs the final signature verification. Exact current certificate matching is conservative and does not support signing-key rotation. The SHA-256 published alongside the APK detects corruption, not a compromised release account.

For a later release, keep the previously installed signed APK as a private baseline. With Android SDK `apkanalyzer` and `apksigner` on PATH, run `python3 scripts/create_update_metadata.py --apk path/to/app-release.apk --baseline path/to/baseline.apk --tag v0.1.2 --notes path/to/release-notes.txt`. The tool verifies package, higher version, signing certificate, actual manifest and APK digest; the tag is only an example, and real versions and notes must match the release. Review the output. Manually attach that exact APK and `update.json` to a draft release in the public distribution-only repository, then publish as stable or beta and test on-device. The old `0.1.1+2` build only checks GitHub latest stable releases; it must be manually updated to this beta-aware build first. Never upload source, credentials or signing keys. Protect the GitHub release account; metadata is not independently signed. No automatic publication occurs.

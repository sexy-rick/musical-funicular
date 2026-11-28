from pathlib import Path
import shutil

root = Path(__file__).resolve().parents[1]
p = root / 'android/app/src/main/AndroidManifest.xml'
s = p.read_text().replace('<application', '<uses-permission android:name="android.permission.INTERNET" />\n    <application android:allowBackup="false"')
s = s.replace('android:label="marketplace_trader"', 'android:label="Alium"')
link_filter = """<meta-data android:name="flutter_deeplinking_enabled" android:value="false" />
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="alium" />
            </intent-filter>
            <intent-filter>"""
if '<intent-filter>' not in s:
    raise SystemExit('Could not configure deep links')
s = s.replace('<intent-filter>', link_filter, 1)
p.write_text(s)
p = root / 'android/app/src/main/kotlin/net/greatsite/marketplace_trader/MainActivity.kt'
p.parent.mkdir(parents=True, exist_ok=True)
p.write_text((root / 'android-template/MainActivity.kt').read_text())
gradle = root / 'android/app/build.gradle.kts'
s = gradle.read_text()
s = s.replace('applicationId = "net.greatsite.marketplace_trader"', 'applicationId = "alium.amberlyst.com"')
if 'applicationId = "alium.amberlyst.com"' not in s:
    raise SystemExit('Could not configure application ID')
# Flutter's generated template signs release builds with the debug key by default.
# Replace it explicitly; release must never fall back to a debug certificate.
marker = '    buildTypes {'
if marker not in s or 'signingConfig = signingConfigs.getByName("debug")' not in s:
    raise SystemExit('Could not configure release signing')
s = s.replace(marker, """    signingConfigs {
        create("aliumRelease") {
            storeFile = System.getenv("ALIUM_KEYSTORE_PATH")?.let { file(it) }
            storePassword = System.getenv("ALIUM_KEYSTORE_PASSWORD")
            keyAlias = System.getenv("ALIUM_KEY_ALIAS")
            keyPassword = System.getenv("ALIUM_KEY_PASSWORD")
        }
    }
    buildTypes {""", 1)
s = s.replace('signingConfig = signingConfigs.getByName("debug")', 'signingConfig = signingConfigs.getByName("aliumRelease")')
gradle.write_text(s)
res = root / 'android/app/src/main/res'
for density in ('mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'):
    folder = res / ('mipmap-' + density)
    folder.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(root / 'assets/alium_icon.png', folder / 'ic_launcher.png')

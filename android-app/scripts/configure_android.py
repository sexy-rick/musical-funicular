from pathlib import Path
import shutil

root = Path(__file__).resolve().parents[1]
p = root / 'android/app/src/main/AndroidManifest.xml'
s = p.read_text().replace('<application', '<uses-permission android:name="android.permission.INTERNET" />\n    <application android:allowBackup="false"')
s = s.replace('android:label="marketplace_trader"', 'android:label="Alium"')
p.write_text(s)
p = root / 'android/app/src/main/kotlin/net/greatsite/marketplace_trader/MainActivity.kt'
p.parent.mkdir(parents=True, exist_ok=True)
p.write_text((root / 'android-template/MainActivity.kt').read_text())
gradle = root / 'android/app/build.gradle.kts'
s = gradle.read_text()
s = s.replace('applicationId = "net.greatsite.marketplace_trader"', 'applicationId = "alium.amberlyst.com"')
if 'applicationId = "alium.amberlyst.com"' not in s:
    raise SystemExit('Could not configure application ID')
gradle.write_text(s)
res = root / 'android/app/src/main/res'
for density in ('mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'):
    folder = res / ('mipmap-' + density)
    folder.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(root / 'assets/alium_icon.png', folder / 'ic_launcher.png')

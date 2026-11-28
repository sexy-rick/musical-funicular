from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'android/app/src/main/AndroidManifest.xml'
s=p.read_text().replace('<application', '<uses-permission android:name="android.permission.INTERNET" />\n    <application android:allowBackup="false"')
s=s.replace('android:label="marketplace_trader"', 'android:label="Marketplace Trader"')
p.write_text(s)
p=root/'android/app/src/main/kotlin/net/greatsite/marketplace_trader/MainActivity.kt'
p.parent.mkdir(parents=True, exist_ok=True)
p.write_text((root/'android-template/MainActivity.kt').read_text())

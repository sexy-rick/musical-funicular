import 'package:flutter_test/flutter_test.dart';
import 'package:marketplace_trader/updater.dart';

void main() {
  Map<String,dynamic> metadata()=>{
    'schema':1,'packageId':'alium.amberlyst.com','versionName':'0.1.2','versionCode':3,
    'minSdk':23,'size':1234,'sha256':'a'*64,'notes':'Real notes',
    'apkUrl':'https://github.com/Alchemiisst/Alium/releases/download/v0.1.2/app-release.apk',
  };
  test('accepts a bounded release asset description', () {
    final update=UpdateInfo.fromJson(metadata());
    expect(update.code,3); expect(update.notes,'Real notes');
  });
  test('rejects untrusted hosts, wrong package and unsafe sizes', () {
    for(final bad in [
      {'apkUrl':'https://evil.example/app-release.apk'},
      {'apkUrl':'https://github.com.evil.example/Alchemiisst/Alium/releases/download/x/app-release.apk'},
      {'apkUrl':'http://github.com/Alchemiisst/Alium/releases/download/x/app-release.apk'},
      {'packageId':'other.app'}, {'sha256':'bad'}, {'versionCode':0},
      {'size':251*1024*1024}, {'schema':2}, {'notes':'x'*8001},
    ]) {
      final value=metadata()..addAll(bad);
      expect(()=>UpdateInfo.fromJson(value),throwsFormatException);
    }
  });
}

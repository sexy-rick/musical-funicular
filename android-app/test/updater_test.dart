import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
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
      {'apkUrl':'https://github.com/Alchemiisst/Alium/releases/download/v1/extra/app-release.apk'},
      {'apkUrl':'https://github.com/Alchemiisst/Alium/releases/download/%2e%2e/app-release.apk'},
      {'packageId':'other.app'}, {'sha256':'bad'}, {'versionCode':0},
      {'size':251*1024*1024}, {'schema':2}, {'notes':'x'*8001},
    ]) {
      final value=metadata()..addAll(bad);
      expect(()=>UpdateInfo.fromJson(value),throwsFormatException);
    }
  });
  Map<String,dynamic> release(String tag,String published,{bool beta=false,bool draft=false,bool files=true}) {
    final base='https://github.com/Alchemiisst/Alium/releases/download/$tag';
    return {'tag_name':tag,'published_at':published,'prerelease':beta,'draft':draft,'assets':files ? [
      {'name':'app-release.apk','state':'uploaded','browser_download_url':'$base/app-release.apk'},
      {'name':'update.json','state':'uploaded','browser_download_url':'$base/update.json'},
    ] : []};
  }
  test('selects the newest published beta and excludes drafts', () {
    final value=selectPublishedRelease([
      release('v0.1.0','2026-01-01T00:00:00Z'),
      release('v0.2.0','2026-03-01T00:00:00Z',draft:true),
      release('v0.1.2','2026-02-01T00:00:00Z',beta:true),
    ]);
    expect(value!.tag,'v0.1.2'); expect(value.prerelease,isTrue);
    expect(value.metadataUrl,'https://github.com/Alchemiisst/Alium/releases/download/v0.1.2/update.json');
    expect(selectPublishedRelease([]),isNull);
  });
  test('does not silently skip a newer release with missing files', () {
    expect(()=>selectPublishedRelease([
      release('v0.1.1','2026-01-01T00:00:00Z'),
      release('v0.1.2','2026-02-01T00:00:00Z',beta:true,files:false),
    ]),throwsA(isA<MissingUpdateAssets>()));
    final unsafe=release('v0.1.2','2026-02-01T00:00:00Z');
    (unsafe['assets'] as List)[0]['browser_download_url']='https://evil.example/app-release.apk';
    expect(()=>selectPublishedRelease([unsafe]),throwsA(isA<MissingUpdateAssets>()));
    expect(()=>selectPublishedRelease({'not':'a list'}),throwsFormatException);
  });
  testWidgets('update dialog shows real versions and notes before install', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final info=UpdateInfo.fromJson(metadata());
    final client=UpdateClient();
    await tester.pumpWidget(MaterialApp(home:Scaffold(body:Builder(builder:(context)=>TextButton(onPressed:()=>showDialog<void>(context:context,builder:(_)=>UpdateDialog(info:info,installed:'0.1.1',client:client)),child:const Text('Check'))))));
    await tester.tap(find.text('Check')); await tester.pumpAndSettle();
    expect(find.text('New version: 0.1.2'),findsOneWidget);
    expect(find.text('Installed version: 0.1.1'),findsOneWidget);
    expect(find.text('Real notes'),findsOneWidget);
    expect(find.text('Download update'),findsOneWidget);
    expect(find.text('Install'),findsNothing);
    await tester.tap(find.text('Remind tomorrow')); await tester.pumpAndSettle();
    final prefs=await SharedPreferences.getInstance();
    expect(prefs.getInt('alium_update_remind_code'),3);
    expect(prefs.getInt('alium_update_remind_until'),greaterThan(DateTime.now().millisecondsSinceEpoch));
    client.close();
  });

}

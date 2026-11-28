import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/services.dart';
import 'package:marketplace_trader/bot_download.dart';
import 'package:marketplace_trader/td_client.dart';
import 'package:shared_preferences/shared_preferences.dart';

class FakeTelegram extends TelegramClient {
  final stream=StreamController<Map<String,dynamic>>.broadcast(sync:true);
  final requests=<Map<String,dynamic>>[];
  bool connected=true;
  Completer<void>? cancelGate;
  @override bool get ready => connected;
  @override Stream<Map<String,dynamic>> get events => stream.stream;
  @override Future<Map<String,dynamic>> query(Map<String,dynamic> q) async {
    requests.add(q);
    switch(q['@type']) {
      case 'searchPublicChat': return {'id': 1,'type':{'user_id':2}};
      case 'sendBotStartMessage': return {'id':10};
      case 'cancelDownloadFile': if(cancelGate != null) await cancelGate!.future; return {'@type':'ok'};
      case 'downloadFile': return {'id':q['file_id'],'size':100,'local':{'downloaded_size':0,'is_downloading_completed':false}};
      default: return {'@type':'ok'};
    }
  }
}
Map<String,dynamic> document(int id) => {'@type':'updateNewMessage','message':{'id':11,'chat_id':1,'sender_id':{'@type':'messageSenderUser','user_id':2},'content':{'@type':'messageDocument','document':{'file_name':'pack.mcpack','document':{'id':id,'size':100,'local':{'downloaded_size':0}}}}}};
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() => SharedPreferences.setMockInitialValues({}));
  tearDown(() => TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(const MethodChannel('marketplace_trader/files'), null));
  test('one tap begins transfer at highest TDLib priority', () async {
    final client=FakeTelegram(); final downloads=BotDownload(client);
    await downloads.request('12345678-1234-1234-1234-123456789abc');
    client.stream.add(document(9)); await Future<void>.delayed(Duration.zero);
    expect(client.requests.where((q)=>q['@type']=='downloadFile').single['priority'],32);
    downloads.dispose(); await client.stream.close();
  });
  test('paused while waiting does not auto-start until resume', () async {
    final client=FakeTelegram(); final downloads=BotDownload(client);
    await downloads.request('12345678-1234-1234-1234-123456789abc');
    await downloads.pause(); client.stream.add(document(9)); await Future<void>.delayed(Duration.zero);
    expect(client.requests.where((q)=>q['@type']=='downloadFile'),isEmpty);
    await downloads.resume(); await Future<void>.delayed(Duration.zero);
    expect(client.requests.where((q)=>q['@type']=='downloadFile'),hasLength(1));
    await downloads.cancelRequest(); downloads.dispose(); await client.stream.close();
  });
  test('display cleanup preserves the stored file name', () {
    expect(displayDownloadName('My Pack BY MARKETPLACE TRADER.mcpack'), 'My Pack.mcpack');
    expect(displayDownloadName('Pack by Marketplace Trader.MCWORLD'), 'Pack.MCWORLD');
    expect(displayDownloadName('By Marketplace Trader.mcpack'), 'By Marketplace Trader.mcpack');
    expect(displayDownloadName('Pack by Marketplace Trader extra.zip'), 'Pack by Marketplace Trader extra.zip');
    expect(displayDownloadName('Pack-by Marketplace Trader.zip'), 'Pack-by Marketplace Trader.zip');
  });
  testWidgets('queue waits through save and the response quiet period', (tester) async {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(const MethodChannel('marketplace_trader/files'), (call) async => call.method=='save' ? 'content://downloads/1' : null);
    final client=FakeTelegram(); final downloads=BotDownload(client);
    const first='12345678-1234-1234-1234-123456789abc', second='87654321-1234-1234-1234-123456789abc';
    await downloads.request(first,itemTitle:'First');
    await downloads.request(second,itemTitle:'Second');
    expect(downloads.queue,hasLength(1));
    expect(client.requests.where((q)=>q['@type']=='sendBotStartMessage'),hasLength(1));
    client.stream.add(document(9)); await tester.pump();
    client.stream.add({'@type':'updateFile','file':{'id':9,'size':100,'local':{'path':'/private/pack','downloaded_size':100,'is_downloading_completed':true}}});
    await tester.pump(); await tester.pump();
    expect(downloads.allDownloaded,isTrue);
    expect(downloads.history.single.name,'pack.mcpack');
    await tester.pump(const Duration(seconds:14));
    expect(client.requests.where((q)=>q['@type']=='sendBotStartMessage'),hasLength(1));
    await tester.pump(const Duration(seconds:2)); await tester.pump();
    expect(client.requests.where((q)=>q['@type']=='sendBotStartMessage'),hasLength(2));
    expect(downloads.uuid,second);
    await downloads.cancelRequest(); downloads.dispose(); await client.stream.close();
  });
  testWidgets('timeout retains actionable recovery and does not send queued request', (tester) async {
    final client=FakeTelegram(); final downloads=BotDownload(client);
    await downloads.request('12345678-1234-1234-1234-123456789abc');
    await downloads.request('87654321-1234-1234-1234-123456789abc');
    await tester.pump(const Duration(seconds:46));
    expect(downloads.status,contains('No file received'));
    expect(client.requests.where((q)=>q['@type']=='sendBotStartMessage'),hasLength(1));
    await downloads.cancelRequest(); await tester.pump();
    expect(client.requests.where((q)=>q['@type']=='sendBotStartMessage'),hasLength(2));
    await downloads.cancelRequest(); downloads.dispose(); await client.stream.close();
  });
  testWidgets('cancel completes before the next bot request', (tester) async {
    final client=FakeTelegram(); final downloads=BotDownload(client);
    await downloads.request('12345678-1234-1234-1234-123456789abc');
    client.stream.add(document(9)); await tester.pump();
    await downloads.request('87654321-1234-1234-1234-123456789abc');
    client.cancelGate=Completer<void>(); final canceled=downloads.cancelRequest();
    await tester.pump();
    expect(client.requests.where((q)=>q['@type']=='sendBotStartMessage'),hasLength(1));
    client.cancelGate!.complete(); await canceled; await tester.pump();
    expect(client.requests.where((q)=>q['@type']=='sendBotStartMessage'),hasLength(2));
    client.cancelGate=null; await downloads.cancelRequest(); downloads.dispose(); await client.stream.close();
  });
  testWidgets('sign out discards queued requests', (tester) async {
    final client=FakeTelegram(); final downloads=BotDownload(client);
    await downloads.request('12345678-1234-1234-1234-123456789abc');
    await downloads.request('87654321-1234-1234-1234-123456789abc');
    client.connected=false; client.stream.add({'@type':'updateAuthorizationState'}); await tester.pump();
    expect(downloads.uuid,isNull); expect(downloads.queue,isEmpty);
    expect(client.requests.where((q)=>q['@type']=='sendBotStartMessage'),hasLength(1));
    downloads.dispose(); await client.stream.close();
  });

  testWidgets('refresh adds discovered files without inventing a catalog link', (tester) async {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(const MethodChannel('marketplace_trader/files'), (call) async {
      if(call.method=='scan') return [{'uri':'content://downloads/2','name':'Local.mcpack','category':'Add-ons'}];
      if(call.method=='checkFiles') return <String>[];
      return null;
    });
    final client=FakeTelegram(); final downloads=BotDownload(client);
    await tester.pump(); await tester.pump();
    expect(downloads.visibleFiles.single.name,'Local.mcpack');
    expect(downloads.visibleFiles.single.uuid,isEmpty);
    downloads.dispose(); await client.stream.close();
  });
  testWidgets('refresh failure preserves previous discoveries', (tester) async {
    var fail=false;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(const MethodChannel('marketplace_trader/files'), (call) async {
      if(call.method=='scan') {if(fail) throw PlatformException(code:'denied'); return [{'uri':'content://downloads/2','name':'Local.mcpack'}];}
      if(call.method=='checkFiles') return <String>[];
      return null;
    });
    final client=FakeTelegram(); final downloads=BotDownload(client);
    await tester.pump(); await tester.pump();
    expect(downloads.visibleFiles,hasLength(1));
    fail=true; await downloads.refreshFiles();
    expect(downloads.visibleFiles,hasLength(1)); expect(downloads.scanError,isNotNull);
    downloads.dispose(); await client.stream.close();
  });

}

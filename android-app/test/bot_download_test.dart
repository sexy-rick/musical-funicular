import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:marketplace_trader/bot_download.dart';
import 'package:marketplace_trader/td_client.dart';
import 'package:shared_preferences/shared_preferences.dart';

class FakeTelegram extends TelegramClient {
  final stream=StreamController<Map<String,dynamic>>.broadcast(sync:true);
  final requests=<Map<String,dynamic>>[];
  @override bool get ready => true;
  @override Stream<Map<String,dynamic>> get events => stream.stream;
  @override Future<Map<String,dynamic>> query(Map<String,dynamic> q) async {
    requests.add(q);
    switch(q['@type']) {
      case 'searchPublicChat': return {'id': 1,'type':{'user_id':2}};
      case 'sendBotStartMessage': return {'id':10};
      case 'downloadFile': return {'id':q['file_id'],'size':100,'local':{'downloaded_size':0,'is_downloading_completed':false}};
      default: return {'@type':'ok'};
    }
  }
}
Map<String,dynamic> document(int id) => {'@type':'updateNewMessage','message':{'id':11,'chat_id':1,'sender_id':{'@type':'messageSenderUser','user_id':2},'content':{'@type':'messageDocument','document':{'file_name':'pack.mcpack','document':{'id':id,'size':100,'local':{'downloaded_size':0}}}}}};
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() => SharedPreferences.setMockInitialValues({}));
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
}

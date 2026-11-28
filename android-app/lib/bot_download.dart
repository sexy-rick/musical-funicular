import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'td_client.dart';

class BotFile {
  BotFile({required this.id, required this.name, this.bytes = 0, this.path = '', this.complete = false, this.downloaded = 0});
  final int id;
  final String name, path;
  final int bytes, downloaded;
  final bool complete;
  BotFile withUpdate(Map<String, dynamic> f) {
    final local = (f['local'] is Map ? f['local'] : {}) as Map;
    return BotFile(id: id, name: name, bytes: (f['size'] as num?)?.toInt() ?? bytes,
      path: (local['path'] ?? '').toString(), complete: local['is_downloading_completed'] == true,
      downloaded: (local['downloaded_size'] as num?)?.toInt() ?? 0);
  }
}

class BotDownload extends ChangeNotifier {
  BotDownload(this.client) { _sub = client.events.listen(_onEvent); }
  final TelegramClient client;
  late StreamSubscription<Map<String, dynamic>> _sub;
  final files = <int, BotFile>{};
  final _buffer = <Map<String, dynamic>>[];
  int? chatId, botId, sentId;
  String? uuid;
  String status = '';
  Timer? _deadline;
  static const _channel = MethodChannel('marketplace_trader/files');
  Future<void> request(String itemUuid) async {
    if (!client.ready) throw TdException('Sign in to Telegram first.');
    if (uuid != null) throw TdException('Finish or cancel the current request first.');
    if (!RegExp(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',caseSensitive:false).hasMatch(itemUuid)) throw TdException('Invalid item ID.');
    uuid = itemUuid; files.clear(); _buffer.clear(); sentId = null;
    status = 'Contacting the file bot…'; notifyListeners();
    try {
      final chat = await client.query({'@type':'searchPublicChat','username':'Mc_addonbot'});
      chatId = (chat['id'] as num).toInt();
      final type = chat['type'] as Map<String, dynamic>;
      botId = (type['user_id'] as num).toInt();
      final sent = await client.query({'@type':'sendBotStartMessage','bot_user_id':botId,'chat_id':chatId,'parameter':itemUuid});
      sentId = (sent['id'] as num).toInt();
      for (final msg in List<Map<String,dynamic>>.from(_buffer)) { _readMessage(msg); }
      _buffer.clear(); status = 'Waiting for the bot. If it asks you to join a channel, open Telegram and try again.'; notifyListeners();
      _deadline = Timer(const Duration(seconds:45), () { if (uuid != null && files.isEmpty) {status='No file received yet. Open the bot in Telegram to check its response.'; notifyListeners();} });
    } catch (_) { uuid = null; status='Could not contact the bot. Open it in Telegram and try again.'; notifyListeners(); rethrow; }
  }
  void _onEvent(Map<String, dynamic> event) {
    if (event['@type'] == 'updateFile' && event['file'] is Map<String,dynamic>) {
      final file = event['file'] as Map<String,dynamic>; final id = (file['id'] as num?)?.toInt();
      if (id != null && files.containsKey(id)) { files[id] = files[id]!.withUpdate(file); notifyListeners(); }
    }
    if (uuid == null || event['@type'] != 'updateNewMessage' || event['message'] is! Map<String,dynamic>) return;
    final message = event['message'] as Map<String,dynamic>;
    if (sentId == null) { if (_buffer.length < 50) _buffer.add(message); return; }
    _readMessage(message);
  }
  void _readMessage(Map<String,dynamic> message) {
    if ((message['chat_id'] as num?)?.toInt() != chatId || (message['id'] as num?) == null || (message['id'] as num).toInt() <= sentId!) return;
    final sender = message['sender_id'];
    if (sender is! Map || sender['@type'] != 'messageSenderUser' || (sender['user_id'] as num?)?.toInt() != botId) return;
    final content = message['content'];
    if (content is! Map || content['@type'] != 'messageDocument') return;
    final document = content['document']; if (document is! Map) return;
    final file = document['document']; if (file is! Map<String,dynamic> || file['id'] is! num) return;
    final id = (file['id'] as num).toInt();
    if (files.containsKey(id)) return;
    files[id] = BotFile(id:id, name:(document['file_name'] ?? 'download').toString()).withUpdate(file);
    status = 'File received from the bot. Check the name before saving.'; notifyListeners();
    // The bot does not include a request correlation ID; do not silently choose a file.
  }
  Future<void> download(int id) async {
    if (!files.containsKey(id)) throw TdException('File no longer available.');
    final response = await client.query({'@type':'downloadFile','file_id':id,'priority':16,'offset':0,'limit':0,'synchronous':false});
    if (files.containsKey(id)) { files[id] = files[id]!.withUpdate(response); notifyListeners(); }
  }
  Future<bool> save(int id) async {
    final file = files[id];
    if (file == null || !file.complete || file.path.isEmpty) throw TdException('Download has not completed.');
    return await _channel.invokeMethod<bool>('save', {'path':file.path,'name':file.name}) ?? false;
  }
  void finish() { _deadline?.cancel(); uuid=null; chatId=null; botId=null; sentId=null; _buffer.clear(); files.clear(); status=''; notifyListeners(); }
  @override void dispose() { _deadline?.cancel(); _sub.cancel(); super.dispose(); }
}

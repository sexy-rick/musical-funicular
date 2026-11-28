import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'td_client.dart';

String categoryFolder(String category) {
  switch (category.toUpperCase().trim()) {
    case 'ADD-ON': return 'Add-ons';
    case 'TEXTURE PACK': return 'Texture packs';
    case 'SKIN PACK': return 'Skin packs';
    case 'WORLD': return 'Worlds';
    case 'MASHUP PACK': return 'Mash-up packs';
    case 'TEMPLATE': return 'Templates';
    case 'APPLICATION': return 'Applications';
    default: return 'Other';
  }
}

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

class SavedDownload {
  SavedDownload({required this.name, required this.title, required this.category, required this.uri});
  final String name, title, category, uri;
  Map<String, String> toJson() => {'name':name, 'title':title, 'category':category, 'uri':uri};
  factory SavedDownload.fromJson(Map<String, dynamic> json) => SavedDownload(
    name: '${json['name'] ?? ''}', title: '${json['title'] ?? ''}', category: '${json['category'] ?? ''}', uri: '${json['uri'] ?? ''}');
}

class BotDownload extends ChangeNotifier {
  BotDownload(this.client) { _sub = client.events.listen(_onEvent); unawaited(_loadHistory()); }
  final TelegramClient client;
  late StreamSubscription<Map<String, dynamic>> _sub;
  final files = <int, BotFile>{};
  final selected = <int>{};
  final _saving = <int>{};
  final _saved = <int>{};
  final history = <SavedDownload>[];
  final _buffer = <Map<String, dynamic>>[];
  int? chatId, botId, sentId;
  String? uuid;
  String title = '', category = '', status = '';
  Timer? _deadline;
  bool _requesting = false;
  bool _disposed = false;
  static const _channel = MethodChannel('marketplace_trader/files');
  Future<void> _loadHistory() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = jsonDecode(prefs.getString('alium_downloads') ?? '[]');
      if (raw is List) { history.addAll(raw.whereType<Map<String, dynamic>>().map(SavedDownload.fromJson).where((e) => e.uri.startsWith('content://'))); }
      if (!_disposed) notifyListeners();
    } catch (_) { /* A damaged history must not stop downloads. */ }
  }
  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('alium_downloads', jsonEncode(history.map((e) => e.toJson()).toList()));
  }
  Future<void> request(String itemUuid, {String itemTitle = '', String itemCategory = ''}) async {
    if (!client.ready) throw TdException('Sign in to Telegram first.');
    if (uuid != null) throw TdException('Finish the current request first.');
    if (!RegExp(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',caseSensitive:false).hasMatch(itemUuid)) throw TdException('Invalid item ID.');
    _requesting = true;
    uuid = itemUuid; title = itemTitle; category = itemCategory; files.clear(); selected.clear(); _saved.clear(); _buffer.clear(); sentId = null;
    status = 'Contacting the file bot…'; notifyListeners();
    try {
      final chat = await client.query({'@type':'searchPublicChat','username':'Mc_addonbot'});
      chatId = (chat['id'] as num).toInt();
      final type = chat['type'] as Map<String, dynamic>;
      botId = (type['user_id'] as num).toInt();
      final sent = await client.query({'@type':'sendBotStartMessage','bot_user_id':botId,'chat_id':chatId,'parameter':itemUuid});
      sentId = (sent['id'] as num).toInt();
      for (final msg in List<Map<String,dynamic>>.from(_buffer)) { _readMessage(msg); }
      _buffer.clear(); if (files.isEmpty) status = 'Waiting for the bot. If it asks you to join a channel, open Telegram and try again.'; notifyListeners();
      _deadline = Timer(const Duration(seconds:45), () { if (uuid != null && files.isEmpty) {status='No file received yet. Open the bot in Telegram to check its response.'; notifyListeners();} });
    } catch (_) { uuid = null; status='Could not contact the bot. Open it in Telegram and try again.'; notifyListeners(); rethrow; } finally { _requesting = false; }
  }
  void _onEvent(Map<String, dynamic> event) {
    if (event['@type'] == 'updateFile' && event['file'] is Map<String,dynamic>) {
      final file = event['file'] as Map<String,dynamic>; final id = (file['id'] as num?)?.toInt();
      if (id != null && files.containsKey(id)) { files[id] = files[id]!.withUpdate(file); notifyListeners(); if (files[id]!.complete && selected.contains(id)) unawaited(_save(id)); }
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
    final id = (file['id'] as num).toInt(); if (files.containsKey(id)) return;
    files[id] = BotFile(id:id, name:(document['file_name'] ?? 'download').toString()).withUpdate(file);
    status = 'Check the file name before downloading; bot replies cannot be verified automatically.'; notifyListeners();
  }
  Future<void> download(int id) async {
    if (!files.containsKey(id)) throw TdException('File no longer available.');
    selected.add(id); notifyListeners();
    try {
      final response = await client.query({'@type':'downloadFile','file_id':id,'priority':16,'offset':0,'limit':0,'synchronous':false});
      if (files.containsKey(id)) { if (!files[id]!.complete) files[id] = files[id]!.withUpdate(response); notifyListeners(); if (files[id]!.complete) await _save(id); }
    } catch (_) { selected.remove(id); notifyListeners(); rethrow; }
  }
  Future<void> _save(int id) async {
    final file = files[id];
    if (file == null || !file.complete || file.path.isEmpty || _saving.contains(id) || _saved.contains(id)) return;
    _saving.add(id); status = 'Saving ${file.name}…'; notifyListeners();
    try {
      final uri = await _channel.invokeMethod<String>('save', {'path':file.path,'name':file.name,'category':categoryFolder(category)});
      if (uri == null || uri.isEmpty) { selected.remove(id); status='Save canceled. Select the file to try again.'; }
      else { history.insert(0, SavedDownload(name:file.name,title:title,category:categoryFolder(category),uri:uri)); _saved.add(id); await _persist(); status='Saved to Downloads. Select another file or finish the request.'; }
    } catch (_) { selected.remove(id); status='Could not save the file. Check storage and try again.'; }
    finally { _saving.remove(id); notifyListeners(); }
  }
  bool isSaved(int id) => _saved.contains(id);
  Future<void> open(SavedDownload item) async => _channel.invokeMethod<void>('open', {'uri':item.uri});
  Future<void> remove(SavedDownload item, {bool deleteFile = false}) async {
    if (deleteFile) await _channel.invokeMethod<void>('delete', {'uri':item.uri});
    history.remove(item); await _persist(); notifyListeners();
  }
  void finish() { if (_requesting) throw TdException('Please wait for the bot request to start.'); if (_saving.isNotEmpty || selected.any((id) => !_saved.contains(id))) throw TdException('Wait for the active download or cancel it first.'); _deadline?.cancel(); uuid=null; chatId=null; botId=null; sentId=null; _buffer.clear(); files.clear(); selected.clear(); _saved.clear(); status=''; notifyListeners(); }
  Future<void> cancel(int id) async { await client.query({'@type':'cancelDownloadFile','file_id':id,'only_if_pending':false}); selected.remove(id); notifyListeners(); }
  @override void dispose() { _disposed = true; _deadline?.cancel(); _sub.cancel(); super.dispose(); }
}

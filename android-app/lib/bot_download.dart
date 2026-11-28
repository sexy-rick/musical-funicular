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

String displayDownloadName(String name) {
  final dot = name.lastIndexOf('.');
  final stem = dot > 0 ? name.substring(0, dot) : name;
  final extension = dot > 0 ? name.substring(dot) : '';
  final clean = stem.replaceFirst(RegExp(r'\s+by\s+marketplace\s+trader\s*$', caseSensitive:false), '').trim();
  return clean.isEmpty ? name : '$clean$extension';
}

class BotFile {
  BotFile({required this.id, required this.name, this.messageId, this.bytes = 0, this.path = '', this.complete = false, this.downloaded = 0});
  final int id;
  final int? messageId;
  int get key => messageId ?? id;
  final String name, path;
  final int bytes, downloaded;
  final bool complete;
  BotFile withUpdate(Map<String, dynamic> f) {
    final local = (f['local'] is Map ? f['local'] : {}) as Map;
    return BotFile(id: id, name: name, messageId: messageId, bytes: (f['size'] as num?)?.toInt() ?? bytes,
      path: (local['path'] ?? '').toString(), complete: local['is_downloading_completed'] == true,
      downloaded: (local['downloaded_size'] as num?)?.toInt() ?? 0);
  }
}

class SavedDownload {
  SavedDownload({required this.name, required this.title, required this.category, required this.uri, this.uuid = '', this.version = ''});
  final String name, title, category, uri, uuid, version;
  Map<String, String> toJson() => {'name':name, 'title':title, 'category':category, 'uri':uri, 'uuid':uuid, 'version':version};
  factory SavedDownload.fromJson(Map<String, dynamic> json) => SavedDownload(
    name: '${json['name'] ?? ''}', title: '${json['title'] ?? ''}', category: '${json['category'] ?? ''}', uri: '${json['uri'] ?? ''}', uuid: '${json['uuid'] ?? ''}', version: '${json['version'] ?? ''}');
}

class BotDownload extends ChangeNotifier {
  BotDownload(this.client) { _sub = client.events.listen(_onEvent); _historyReady=_loadHistory(); }
  final TelegramClient client;
  late StreamSubscription<Map<String, dynamic>> _sub;
  late final Future<void> _historyReady;
  bool _historyLoaded=false;
  Future<void> _persistTail=Future<void>.value();
  final files = <int, BotFile>{};
  final selected = <int>{};
  final _saving = <int>{};
  final _saved = <int>{};
  final _attempts = <int,int>{};
  final history = <SavedDownload>[];
  final _discovered = <SavedDownload>[];
  final unavailable = <String>{};
  bool scanning = false;
  int scanRevision=0;
  String? scanError;
  List<SavedDownload> get visibleFiles {
    final known=history.map((item)=>item.uri).toSet();
    return [...history,..._discovered.where((item)=>!known.contains(item.uri))];
  }
  final _buffer = <Map<String, dynamic>>[];
  final _queue = <Map<String, String>>[];
  List<Map<String, String>> get queue => List.unmodifiable(_queue);
  bool get allDownloaded => files.isNotEmpty && _saving.isEmpty && files.keys.every(_saved.contains);
  void removeQueued(int index) { if(index >= 0 && index < _queue.length) { _queue.removeAt(index); _changed(); } }
  int? chatId, botId, sentId;
  String? uuid;
  String title = '', category = '', version = '', status = '';
  Timer? _deadline, _settle;
  int _generation = 0;
  bool paused = false, pausing = false, _disposed = false, _canceling = false, _logoutPending = false;
  static const _channel = MethodChannel('marketplace_trader/files');
  void _changed() { if (!_disposed) notifyListeners(); }
  Future<void> _loadHistory() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = jsonDecode(prefs.getString('alium_downloads') ?? '[]');
      if (raw is List) { history.addAll(raw.whereType<Map<String, dynamic>>().map(SavedDownload.fromJson).where((e) => e.uri.startsWith('content://'))); }
      _changed();
    } catch (_) { /* Damaged history must not stop downloads. */ }
    _historyLoaded=true;
    if (!_disposed) unawaited(refreshFiles());
  }
  Future<void> _persist() {
    final snapshot=jsonEncode(history.map((e)=>e.toJson()).toList());
    final next=_persistTail.catchError((_) {}).then((_) async {
      final prefs=await SharedPreferences.getInstance();
      await prefs.setString('alium_downloads',snapshot);
    });
    _persistTail=next;
    return next;
  }
  Future<void> refreshFiles() async {
    if (scanning) return;
    scanning=true; scanError=null; _changed();
    try {
      final entries=await _channel.invokeListMethod<dynamic>('scan');
      if (entries==null) throw const FormatException('Empty scan');
      final discovered=entries.whereType<Map>().map((row)=>SavedDownload.fromJson(Map<String,dynamic>.from(row))).where((row)=>row.uri.startsWith('content://')).toList();
      final check=await _channel.invokeListMethod<String>('checkFiles',{'uris':history.map((e)=>e.uri).toList()});
      if (_disposed) return;
      _discovered..clear()..addAll(discovered);
      scanRevision++;
      unavailable..clear()..addAll(check ?? const []);
    } catch (_) { if (!_disposed) scanError='Folder refresh unavailable. Check access and retry.'; }
    finally { scanning=false; _changed(); }
  }
  Future<void> request(String itemUuid, {String itemTitle = '', String itemCategory = '', String itemVersion = ''}) async {
    if (!_historyLoaded) await _historyReady;
    if (!client.ready) throw TdException('Sign in to Telegram first.');
    if (_disposed) throw TdException('Downloads unavailable.');
    if (_canceling) throw TdException('Cancellation in progress.');
    if (!RegExp(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',caseSensitive:false).hasMatch(itemUuid)) throw TdException('Invalid item ID.');
    if (uuid != null) {
      if (_queue.any((entry) => entry['uuid'] == itemUuid) || uuid == itemUuid) throw TdException('Download already requested.');
      if (_queue.length >= 20) throw TdException('Download queue is full.');
      _queue.add({'uuid':itemUuid,'title':itemTitle,'category':itemCategory,'version':itemVersion});
      _changed(); return;
    }
    final generation = ++_generation;
    uuid = itemUuid; title = itemTitle; category = itemCategory; version = itemVersion; files.clear(); selected.clear(); _saved.clear(); _buffer.clear(); sentId = null; paused = false;
    status = 'Contacting the bot…'; _changed();
    try {
      final chat = await client.query({'@type':'searchPublicChat','username':'Mc_addonbot'});
      if (generation != _generation) return;
      chatId = (chat['id'] as num).toInt();
      final type = chat['type'] as Map<String, dynamic>;
      botId = (type['user_id'] as num).toInt();
      final sent = await client.query({'@type':'sendBotStartMessage','bot_user_id':botId,'chat_id':chatId,'parameter':itemUuid});
      if (generation != _generation) return;
      sentId = (sent['id'] as num).toInt();
      for (final msg in List<Map<String,dynamic>>.from(_buffer)) { _readMessage(msg); }
      _buffer.clear();
      if (files.isEmpty) status = paused ? 'Paused' : 'Waiting for the bot…';
      _changed();
      _startDeadline(generation);
    } catch (_) {
      if (generation != _generation) return;
      status='Could not contact the bot. Cancel or open Telegram.'; _changed();
      throw TdException('Could not contact the bot.');
    }
  }
  void _startDeadline(int generation) {
    _deadline?.cancel();
    _deadline = Timer(const Duration(seconds:45), () {
      if (generation == _generation && uuid != null && files.isEmpty && !paused) {
        status='No file received. Cancel or open Telegram.'; _changed();
      }
    });
  }
  void _onEvent(Map<String, dynamic> event) {
    if (event['@type'] == 'updateAuthorizationState' && !client.ready) {
      _queue.clear();
      if (uuid != null) {
        if (_saving.isNotEmpty) { _logoutPending=true; _deadline?.cancel(); _settle?.cancel(); }
        else { unawaited(cancelRequest()); }
      }
      _changed(); return;
    }
    if (_canceling) return;
    if (event['@type'] == 'updateFile' && event['file'] is Map<String,dynamic>) {
      final file = event['file'] as Map<String,dynamic>; final id = (file['id'] as num?)?.toInt();
      if (id != null) {
        final matches=files.entries.where((entry)=>entry.value.id==id).map((entry)=>entry.key).toList();
        for (final key in matches) { files[key]=files[key]!.withUpdate(file); if (!paused && files[key]!.complete && selected.contains(key)) unawaited(_save(key)); }
        if (matches.isNotEmpty) _changed();
      }
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
    final messageId=(message['id'] as num).toInt();
    if (files.containsKey(messageId)) return;
    _settle?.cancel();
    files[messageId] = BotFile(id:id,messageId:messageId,name:(document['file_name'] ?? 'download').toString()).withUpdate(file);
    status = paused ? 'Paused' : 'Downloading…'; _changed();
    if (!paused) unawaited(_autoDownload(messageId));
  }
  Future<void> _autoDownload(int id) async {
    final generation = _generation;
    try { await download(id); } catch (_) { if (generation == _generation && uuid != null) { status='Download failed. Try again.'; _changed(); } }
  }
  Future<void> download(int id) async {
    if (!files.containsKey(id) || uuid == null) throw TdException('File no longer available.');
    final generation = _generation;
    final transferId=files[id]!.id;
    final attempt=(_attempts[id] ?? 0)+1; _attempts[id]=attempt;
    selected.add(id); _changed();
    try {
      // TDLib priority 32 is the highest queue priority, not a network speed guarantee.
      final response = await client.query({'@type':'downloadFile','file_id':transferId,'priority':32,'offset':0,'limit':0,'synchronous':false});
      if (generation != _generation || _attempts[id]!=attempt || paused || !selected.contains(id)) return;
      if (files.containsKey(id)) { if (!files[id]!.complete) files[id] = files[id]!.withUpdate(response); _changed(); if (files[id]!.complete) await _save(id); }
    } catch (_) { if (generation != _generation || _attempts[id]!=attempt) return; selected.remove(id); _changed(); rethrow; }
  }
  Future<void> _save(int id) async {
    final file = files[id];
    if (file == null || paused || !selected.contains(id) || !file.complete || file.path.isEmpty || _saving.contains(id) || _saved.contains(id)) return;
    final savedTitle=title, savedCategory=categoryFolder(category), savedUuid=uuid ?? '', savedVersion=version;
    _saving.add(id); status = 'Saving file…'; _changed();
    try {
      final uri = await _channel.invokeMethod<String>('save', {'path':file.path,'name':file.name,'category':savedCategory});
      if (uri == null || uri.isEmpty) { selected.remove(id); status='Save canceled. Try again.'; }
      else {
        history.insert(0, SavedDownload(name:file.name,title:savedTitle,category:savedCategory,uri:uri,uuid:savedUuid,version:savedVersion));
        _saved.add(id);
        try { await _persist(); status=files.keys.every(_saved.contains)?'Downloaded':files.keys.any((fileId)=>!_saved.contains(fileId) && selected.contains(fileId))?'Downloading…':'Download needs attention.'; }
        catch (_) { status='Downloaded; history could not be saved.'; }
      }
    } catch (_) { selected.remove(id); status='Could not save file.'; }
    finally { _saving.remove(id); _changed(); if (_logoutPending && _saving.isEmpty) { _logoutPending=false; unawaited(cancelRequest()); } else { _scheduleFinish(); } }
  }
  void _scheduleFinish() {
    _settle?.cancel();
    if (paused || uuid == null || files.isEmpty || _saving.isNotEmpty || files.keys.any((id)=>!_saved.contains(id))) return;
    final generation = _generation;
    // The bot has no end marker. This is a best-effort quiet period, not proof.
    _settle = Timer(const Duration(seconds:15), () { if (generation == _generation && !paused && _saving.isEmpty && files.keys.every(_saved.contains)) _finishAndContinue(); });
  }
  Future<void> pause() async {
    if (uuid == null || paused) return;
    paused = true; pausing = true; _deadline?.cancel(); _settle?.cancel(); status='Paused'; _changed();
    final pending=selected.where((key)=>!_saved.contains(key) && !_saving.contains(key)).toList();
    final transferIds=pending.map((key)=>files[key]?.id).whereType<int>().toSet();
    for (final key in pending) { _attempts[key]=(_attempts[key] ?? 0)+1; }
    selected.removeAll(pending);
    for (final id in transferIds) {
      try { await client.query({'@type':'cancelDownloadFile','file_id':id,'only_if_pending':false}); } catch (_) {}
    }
    pausing = false; _changed();
  }
  Future<void> resume() async {
    if (uuid == null || !paused || pausing) return;
    paused=false; status=files.isEmpty?'Waiting for the bot…':'Downloading…'; _changed();
    if (files.isEmpty && sentId != null) _startDeadline(_generation);
    for (final id in files.keys.toList()) { if (!_saved.contains(id) && !_saving.contains(id)) unawaited(_autoDownload(id)); }
    _scheduleFinish();
  }
  Future<void> cancelRequest() async {
    if (_saving.isNotEmpty) throw TdException('Wait until saving finishes.');
    if (_canceling || uuid == null) return;
    _canceling=true;
    final ids=selected.map((key)=>files[key]?.id).whereType<int>().toSet();
    // Invalidate pending callbacks immediately, but do not send the next bot
    // request until all cancellation queries have returned.
    _generation++; _deadline?.cancel(); _settle?.cancel();
    status='Canceling…'; _changed();
    for (final id in ids) { try { await client.query({'@type':'cancelDownloadFile','file_id':id,'only_if_pending':false}); } catch (_) {} }
    _canceling=false;
    _finishAndContinue();
  }
  void _finishAndContinue() {
    _reset();
    if (!client.ready) _queue.clear();
    if (_queue.isNotEmpty && client.ready && !_disposed) {
      final next = _queue.removeAt(0);
      unawaited(request(next['uuid']!, itemTitle:next['title']!, itemCategory:next['category']!, itemVersion:next['version']!).catchError((_) {}));
    }
    _changed();
  }
  void _reset() { _generation++; _deadline?.cancel(); _settle?.cancel(); uuid=null; chatId=null; botId=null; sentId=null; paused=false; pausing=false; _buffer.clear(); files.clear(); selected.clear(); _saved.clear(); _attempts.clear(); status=''; _logoutPending=false; }
  bool isSaved(int id) => _saved.contains(id);
  bool get isSaving => _saving.isNotEmpty;
  Future<void> shareFile(SavedDownload item) async => _channel.invokeMethod<void>('shareFile', {'uri':item.uri,'name':item.name});
  Future<void> open(SavedDownload item) async => _channel.invokeMethod<void>('open', {'uri':item.uri,'name':item.name});
  Future<void> remove(SavedDownload item, {bool deleteFile = false}) async {
    if (deleteFile) await _channel.invokeMethod<void>('delete', {'uri':item.uri});
    history.remove(item); _discovered.removeWhere((entry)=>entry.uri==item.uri); unavailable.remove(item.uri); await _persist(); _changed();
  }
  @override void dispose() { _disposed = true; _generation++; _deadline?.cancel(); _settle?.cancel(); _sub.cancel(); super.dispose(); }
}

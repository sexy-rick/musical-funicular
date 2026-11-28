import 'dart:async';
import 'dart:convert';
import 'dart:ffi';
import 'dart:io';
import 'dart:isolate';
import 'dart:math';
import 'package:ffi/ffi.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:path_provider/path_provider.dart';

// TDLib's documented JSON interface. A receive isolate prevents blocking Flutter.
typedef _CreateNative = Int32 Function();
typedef _SendNative = Void Function(Int32, Pointer<Utf8>);
typedef _ReceiveNative = Pointer<Utf8> Function(Double);

void _pump(SendPort port) {
  final lib = DynamicLibrary.open('libtdjson.so');
  final receive = lib.lookupFunction<_ReceiveNative, Pointer<Utf8> Function(double)>('td_receive');
  while (true) {
    final raw = receive(0.5);
    if (raw != nullptr) port.send(raw.toDartString());
  }
}

class TdException implements Exception {
  TdException(this.message);
  final String message;
  @override String toString() => message;
}

class TelegramClient extends ChangeNotifier {
  static const _store = FlutterSecureStorage();
  DynamicLibrary? _lib;
  Isolate? _isolate;
  ReceivePort? _port;
  late int _client;
  late void Function(int, Pointer<Utf8>) _send;
  int _sequence = 0;
  final _pending = <int, Completer<Map<String, dynamic>>>{};
  final _events = StreamController<Map<String, dynamic>>.broadcast();
  String state = 'notStarted';
  String hint = '';
  String? failure;
  int? _apiId;
  String? _apiHash;
  bool initialized = false;
  bool _closed = false;
  Stream<Map<String, dynamic>> get events => _events.stream;
  bool get ready => state == 'authorizationStateReady';

  Future<void> start({int? apiId, String? apiHash}) async {
    if (initialized) return;
    failure = null;
    final storedId = int.tryParse(await _store.read(key: 'telegram_api_id') ?? '');
    final storedHash = await _store.read(key: 'telegram_api_hash');
    _apiId = apiId ?? storedId;
    _apiHash = apiHash ?? storedHash;
    if (_apiId == null || _apiId! <= 0 || _apiHash == null || !RegExp(r'^[0-9a-fA-F]{32}$').hasMatch(_apiHash!)) {
      state = 'needsCredentials'; notifyListeners(); return;
    }
    try {
      await _store.write(key: 'telegram_api_id', value: '$_apiId');
      await _store.write(key: 'telegram_api_hash', value: _apiHash);
      _lib = DynamicLibrary.open('libtdjson.so');
      _client = _lib!.lookupFunction<_CreateNative, int Function()>('td_create_client_id')();
      _send = _lib!.lookupFunction<_SendNative, void Function(int, Pointer<Utf8>)>('td_send');
      _port = ReceivePort();
      _port!.listen(_receive);
      _isolate = await Isolate.spawn(_pump, _port!.sendPort);
      initialized = true;
      state = 'connecting'; notifyListeners();
      await query({'@type': 'getOption', 'name': 'version'});
    } catch (_) {
      state = 'failed'; failure = 'Telegram could not start on this device. Check the app configuration and try again.'; notifyListeners();
    }
  }

  Future<void> _parameters() async {
    try {
      final directory = await getApplicationSupportDirectory();
      final tdDir = Directory('${directory.path}/telegram');
      await tdDir.create(recursive: true);
      var key = await _store.read(key: 'td_database_key');
      if (key == null) {
        final random = Random.secure();
        key = base64Encode(List<int>.generate(32, (_) => random.nextInt(256)));
        await _store.write(key: 'td_database_key', value: key);
      }
      await query({'@type': 'setTdlibParameters', 'use_test_dc': false,
        'database_directory': tdDir.path, 'files_directory': tdDir.path,
        'database_encryption_key': key, 'use_file_database': true,
        'use_chat_info_database': true, 'use_message_database': true,
        'use_secret_chats': false, 'api_id': _apiId, 'api_hash': _apiHash,
        'system_language_code': 'en', 'device_model': 'Android',
        'system_version': Platform.operatingSystemVersion, 'application_version': '0.1.0'});
    } catch (_) { state = 'failed'; failure = 'Could not initialize Telegram storage.'; notifyListeners(); }
  }

  void _receive(dynamic raw) {
    if (_closed || raw is! String) return;
    try {
      final parsed = jsonDecode(raw);
      if (parsed is! Map<String, dynamic>) return;
      final extra = parsed['@extra'];
      if (extra is int) {
        final c = _pending.remove(extra);
        if (c != null && !c.isCompleted) {
          if (parsed['@type'] == 'error') { c.completeError(TdException((parsed['message'] ?? 'Telegram error').toString())); }
          else { c.complete(parsed); }
        }
      }
      if (parsed['@type'] == 'updateAuthorizationState') {
        final auth = parsed['authorization_state'];
        if (auth is Map<String, dynamic>) {
          state = (auth['@type'] ?? '').toString();
          hint = (auth['password_hint'] ?? '').toString();
          notifyListeners();
          if (state == 'authorizationStateWaitTdlibParameters') unawaited(_parameters());
        }
      }
      _events.add(parsed);
    } catch (_) { /* Ignore invalid native messages; never log Telegram content. */ }
  }

  Future<Map<String, dynamic>> query(Map<String, dynamic> value) async {
    if (!initialized) throw TdException('Telegram is not initialized.');
    final id = ++_sequence;
    final c = Completer<Map<String, dynamic>>();
    _pending[id] = c;
    final request = jsonEncode({...value, '@extra': id}).toNativeUtf8();
    try { _send(_client, request); } finally { calloc.free(request); }
    try { return await c.future.timeout(const Duration(seconds: 30)); }
    finally { _pending.remove(id); }
  }
  Future<void> phone(String number) async { await query({'@type':'setAuthenticationPhoneNumber','phone_number':number,'settings':null}); }
  Future<void> code(String code) async { await query({'@type':'checkAuthenticationCode','code':code}); }
  Future<void> password(String password) async { await query({'@type':'checkAuthenticationPassword','password':password}); }
  Future<void> email(String email) async { await query({'@type':'setAuthenticationEmailAddress','email_address':email}); }
  Future<void> emailCode(String code) async { await query({'@type':'checkAuthenticationEmailCode','code':{'@type':'emailAddressAuthenticationCode','code':code}}); }
  Future<void> logout() async { await query({'@type':'logOut'}); }
  @override void dispose() {
    _closed = true;
    _isolate?.kill(priority: Isolate.immediate); _port?.close();
    for (final c in _pending.values) { if (!c.isCompleted) c.completeError(TdException('Telegram client closed.')); }
    _pending.clear(); _events.close(); super.dispose();
  }
}

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

const updateChannel = MethodChannel('alium/updates');
const updateMetadataUrl = 'https://github.com/Alchemiisst/Alium/releases/latest/download/update.json';
const _redirectHosts = {'github.com', 'release-assets.githubusercontent.com', 'objects.githubusercontent.com'};

class UpdateInfo {
  const UpdateInfo({required this.version, required this.code, required this.minSdk, required this.size, required this.hash, required this.url, required this.notes});
  final String version, hash, url, notes;
  final int code, minSdk, size;
  factory UpdateInfo.fromJson(Map<String, dynamic> value) {
    final version=value['versionName'], code=value['versionCode'], sdk=value['minSdk'], size=value['size'], hash=value['sha256'], notes=value['notes'];
    final uri=Uri.tryParse('${value['apkUrl'] ?? ''}');
    if (value['schema'] != 1 || value['packageId'] != 'alium.amberlyst.com' || version is! String || version.isEmpty || version.length > 50 || code is! int || code <= 0 || sdk is! int || sdk < 1 || size is! int || size <= 0 || size > 250*1024*1024 || hash is! String || !RegExp(r'^[a-f0-9]{64}$').hasMatch(hash) || notes is! String || notes.length > 8000 || uri == null || uri.scheme != 'https' || uri.host.toLowerCase() != 'github.com' || uri.userInfo.isNotEmpty || uri.hasPort || uri.hasQuery || uri.hasFragment || uri.pathSegments.length!=6 || uri.pathSegments[0]!='Alchemiisst' || uri.pathSegments[1]!='Alium' || uri.pathSegments[2]!='releases' || uri.pathSegments[3]!='download' || !RegExp(r'^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$').hasMatch(uri.pathSegments[4]) || uri.pathSegments[5]!='app-release.apk') {
      throw const FormatException('Invalid update metadata');
    }
    return UpdateInfo(version:version, code:code, minSdk:sdk, size:size, hash:hash, url:uri.toString(), notes:notes);
  }
}

class UpdateClient {
  final HttpClient _http=HttpClient()..connectionTimeout=const Duration(seconds:15);
  bool canceled=false;
  Future<HttpClientResponse> _get(String url) async {
    var uri=Uri.parse(url);
    for (var i=0; i<6; i++) {
      if (uri.scheme!='https' || !_redirectHosts.contains(uri.host.toLowerCase()) || uri.userInfo.isNotEmpty || uri.hasPort) throw const FormatException('Untrusted update host');
      final request=await _http.getUrl(uri).timeout(const Duration(seconds:15));
      request.followRedirects=false;
      request.headers.set(HttpHeaders.userAgentHeader,'Alium Android updater');
      final response=await request.close().timeout(const Duration(seconds:20));
      if ([301,302,303,307,308].contains(response.statusCode)) {
        final location=response.headers.value(HttpHeaders.locationHeader);
        await response.drain<void>().timeout(const Duration(seconds:20));
        if (location==null) throw const FormatException('Missing redirect');
        uri=uri.resolve(location); continue;
      }
      return response;
    }
    throw const FormatException('Too many redirects');
  }
  Future<UpdateInfo?> check() async {
    final response=await _get(updateMetadataUrl);
    if (response.statusCode==404) { await response.drain<void>(); return null; }
    if (response.statusCode!=200) { await response.drain<void>(); throw const HttpException('Update check failed'); }
    final bytes=<int>[];
    await for (final chunk in response.timeout(const Duration(seconds:20))) {
      bytes.addAll(chunk);
      if (bytes.length>65536) throw const FormatException('Update metadata too large');
    }
    final data=jsonDecode(utf8.decode(bytes));
    if (data is! Map<String,dynamic>) throw const FormatException('Invalid update metadata');
    return UpdateInfo.fromJson(data);
  }
  Future<File> download(UpdateInfo info, void Function(double) onProgress) async {
    final cache=await getTemporaryDirectory();
    final directory=Directory('${cache.path}/alium_updates');
    await directory.create(recursive:true);
    final part=File('${directory.path}/update.part'), target=File('${directory.path}/update.apk');
    if (await part.exists()) await part.delete();
    if (await target.exists()) await target.delete();
    try {
      final response=await _get(info.url);
      if (response.statusCode!=200) { await response.drain<void>(); throw const HttpException('Update download failed'); }
      final sink=part.openWrite(); var count=0;
      try {
        await for (final chunk in response.timeout(const Duration(seconds:30))) {
          if (canceled) throw const HttpException('Canceled');
          count+=chunk.length;
          if (count>info.size) throw const FormatException('Update size mismatch');
          sink.add(chunk); onProgress(count/info.size);
        }
        await sink.flush();
      } finally { await sink.close(); }
      if (canceled || count!=info.size || (await sha256.bind(part.openRead()).first).toString()!=info.hash) throw const FormatException('Update verification failed');
      return await part.rename(target.path);
    } catch (_) { if (await part.exists()) await part.delete(); rethrow; }
  }
  void close() { canceled=true; _http.close(force:true); }
}

bool _checking=false;
Future<void> checkForUpdates(BuildContext context, {bool automatic=false}) async {
  if (_checking) return;
  _checking=true;
  final client=UpdateClient();
  try {
    final prefs=await SharedPreferences.getInstance();
    final now=DateTime.now().millisecondsSinceEpoch;
    final last=prefs.getInt('alium_update_last_check') ?? 0;
    if (automatic && last>0 && now>=last && now-last<const Duration(days:1).inMilliseconds) return;
    if (automatic) await prefs.setInt('alium_update_last_check',now);
    final installed=await updateChannel.invokeMapMethod<String,dynamic>('installed');
    if (installed==null || installed['versionCode'] is! int || installed['sdk'] is! int) throw const FormatException('App version unavailable');
    final info=await client.check();
    if (!context.mounted) return;
    if (info==null) {
      if (!automatic) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('No update metadata found.')));
      return;
    }
    if (info.code <= (installed['versionCode'] as int)) {
      if (!automatic) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Alium is up to date.')));
      return;
    }
    if (info.minSdk > (installed['sdk'] as int)) {
      if (!automatic) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Update requires a newer Android version.')));
      return;
    }
    if (automatic && prefs.getInt('alium_update_remind_code')==info.code && now<(prefs.getInt('alium_update_remind_until') ?? 0)) return;
    if (!context.mounted) return;
    await showDialog<void>(context:context,barrierDismissible:false,builder:(_)=>UpdateDialog(info:info,installed:'${installed['versionName'] ?? ''}',client:client));
  } catch (_) {
    if (context.mounted && !automatic) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Update check unavailable. Try again.')));
  } finally { client.close(); _checking=false; }
}

class UpdateDialog extends StatefulWidget {
  const UpdateDialog({super.key,required this.info,required this.installed,required this.client});
  final UpdateInfo info; final String installed; final UpdateClient client;
  @override State<UpdateDialog> createState()=>_UpdateDialogState();
}
class _UpdateDialogState extends State<UpdateDialog> {
  bool busy=false, verifying=false; double? progress; File? downloaded; String? error;
  UpdateClient? transfer;
  @override void dispose() {transfer?.close();super.dispose();}
  Future<void> download() async {
    setState((){busy=true;error=null;progress=null;});
    final current=UpdateClient(); transfer=current;
    try {
      final file=await current.download(widget.info,(value){if(mounted)setState(()=>progress=value);});
      if(current.canceled) throw const HttpException('Canceled');
      // Android validates archive identity and installed signer before offering installation.
      await updateChannel.invokeMethod<void>('verify',{'path':file.path,'versionName':widget.info.version,'versionCode':widget.info.code,'minSdk':widget.info.minSdk,'size':widget.info.size,'sha256':widget.info.hash});
      if(current.canceled) throw const HttpException('Canceled');
      if(mounted)setState(()=>downloaded=file);
    } catch (_) { if(mounted)setState(()=>error=current.canceled?'Download canceled.':'Download or verification failed.'); }
    finally { current.close(); if(mounted)setState(()=>busy=false); }
  }
  Future<void> install() async {
    setState((){verifying=true;error=null;});
    try {
      final result=await updateChannel.invokeMethod<String>('install',{'path':downloaded!.path,'versionName':widget.info.version,'versionCode':widget.info.code,'minSdk':widget.info.minSdk,'size':widget.info.size,'sha256':widget.info.hash});
      if(mounted && result=='permission') setState(()=>error='Allow installs, then tap Install again.');
    } catch (_) { if(mounted)setState((){downloaded=null;error='Update could not be installed. Download again.';}); }
    finally {if(mounted)setState(()=>verifying=false);}
  }
  Future<void> remind() async {
    final prefs=await SharedPreferences.getInstance();
    await prefs.setInt('alium_update_remind_code',widget.info.code);
    await prefs.setInt('alium_update_remind_until',DateTime.now().add(const Duration(days:1)).millisecondsSinceEpoch);
    if(mounted) Navigator.pop(context);
  }
  @override Widget build(BuildContext context)=>PopScope(canPop:!busy&&!verifying,child:AlertDialog(
    title:const Text('Update available'),
    content:SingleChildScrollView(child:Column(mainAxisSize:MainAxisSize.min,crossAxisAlignment:CrossAxisAlignment.start,children:[
      Text('New version: ${widget.info.version}'),Text('Installed version: ${widget.installed}'),const SizedBox(height:16),
      Text('Release notes',style:Theme.of(context).textTheme.titleMedium),const SizedBox(height:8),Text(widget.info.notes.isEmpty?'No release notes.':widget.info.notes),
      if(busy) ...[const SizedBox(height:16),LinearProgressIndicator(value:progress,semanticsLabel:'Update download progress')],
      if(error!=null) ...[const SizedBox(height:8),Text(error!,style:TextStyle(color:Theme.of(context).colorScheme.error))],
    ])),
    actions:[
      if(downloaded!=null) FilledButton(onPressed:verifying?null:install,child:const Text('Install')) else FilledButton(onPressed:busy?null:download,child:const Text('Download update')),
      TextButton(onPressed:busy||verifying?null:()=>Navigator.pop(context),child:const Text('Later')),
      TextButton(onPressed:busy||verifying?null:remind,child:const Text('Remind tomorrow')),
      if(busy) TextButton(onPressed:()=>transfer?.close(),child:const Text('Cancel')),
    ],
  ));
}

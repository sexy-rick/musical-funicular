import 'dart:io';
import 'package:country_picker/country_picker.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import 'bot_download.dart';
import 'catalog.dart';
import 'td_client.dart';

void main() => runApp(const MarketplaceApp());

Future<void> openTelegram(BuildContext context, String domain, [String? start]) async {
  final direct = Uri(scheme:'tg', host:'resolve', queryParameters:{'domain':domain, if (start != null) 'start':start});
  final web = Uri.https('t.me', '/$domain', start == null ? null : {'start':start});
  try { if (await launchUrl(direct, mode:LaunchMode.externalApplication)) return; } catch (_) {}
  if (!context.mounted) return;
  final useWeb = await showDialog<bool>(context:context, builder:(context)=>AlertDialog(title:const Text('Telegram app not found'),content:const Text('Open the Telegram link in your browser instead?'),actions:[TextButton(onPressed:()=>Navigator.pop(context,false),child:const Text('Cancel')),FilledButton(onPressed:()=>Navigator.pop(context,true),child:const Text('Open link'))]));
  if (useWeb == true) await launchUrl(web,mode:LaunchMode.externalApplication);
}

class MarketplaceApp extends StatefulWidget {
  const MarketplaceApp({super.key});
  @override State<MarketplaceApp> createState()=>_MarketplaceAppState();
}
class _MarketplaceAppState extends State<MarketplaceApp> {
  ThemeMode mode=ThemeMode.system;
  @override void initState(){super.initState(); _load();}
  Future<void> _load() async {final p=await SharedPreferences.getInstance(); final saved=p.getString('alium_theme'); if(mounted)setState(()=>mode=saved == 'light' ? ThemeMode.light : saved == 'dark' ? ThemeMode.dark : ThemeMode.system);}
  void setMode(ThemeMode value){setState(()=>mode=value); SharedPreferences.getInstance().then((p)=>p.setString('alium_theme',value.name));}
  @override Widget build(BuildContext context){
    ThemeData theme(Brightness brightness){
      final scheme=ColorScheme.fromSeed(seedColor:const Color(0xff426854),brightness:brightness);
      return ThemeData(useMaterial3:true,colorScheme:scheme,scaffoldBackgroundColor:scheme.surface,
        appBarTheme:AppBarTheme(backgroundColor:scheme.surface,scrolledUnderElevation:0),
        cardTheme:CardThemeData(color:scheme.surfaceContainerLow,elevation:0,shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(24),side:BorderSide(color:scheme.outlineVariant))),
        filledButtonTheme:FilledButtonThemeData(style:FilledButton.styleFrom(minimumSize:const Size(48,48))),
        outlinedButtonTheme:OutlinedButtonThemeData(style:OutlinedButton.styleFrom(minimumSize:const Size(48,48))));
    }
    return MaterialApp(title:'Alium',debugShowCheckedModeBanner:false,theme:theme(Brightness.light),darkTheme:theme(Brightness.dark),themeMode:mode,home:CatalogScreen(mode:mode,onTheme:setMode));
  }
}

class CatalogScreen extends StatefulWidget {
  const CatalogScreen({super.key,required this.mode,required this.onTheme});
  final ThemeMode mode; final ValueChanged<ThemeMode> onTheme;
  @override State<CatalogScreen> createState()=>_CatalogScreenState();
}
class _CatalogScreenState extends State<CatalogScreen> {
  final api=CatalogApi(); final telegram=TelegramClient(); final search=TextEditingController();
  late final downloads=BotDownload(telegram);
  String query='',category='',updated='',sort='updated_desc'; int page=1, tab=0;
  late Future<CatalogPage> result;
  @override void initState(){super.initState();result=load();telegram.start();}
  Future<CatalogPage> load()=>api.list(query:query,category:category,updated:updated,sort:sort,page:page);
  void reload(){setState(()=>result=load());}
  @override void dispose(){api.dispose();downloads.dispose();telegram.dispose();search.dispose();super.dispose();}
  Future<void> filters() async {
    var c=category,u=updated,s=sort;
    final applied=await showModalBottomSheet<bool>(context:context,isScrollControlled:true,showDragHandle:true,builder:(context)=>StatefulBuilder(builder:(context,setSheet)=>SafeArea(child:SingleChildScrollView(child:Padding(padding:EdgeInsets.fromLTRB(20,8,20,24+MediaQuery.viewInsetsOf(context).bottom),child:Column(mainAxisSize:MainAxisSize.min,crossAxisAlignment:CrossAxisAlignment.stretch,children:[
      Text('Filters',style:Theme.of(context).textTheme.headlineSmall),const SizedBox(height:20),
      DropdownButtonFormField<String>(initialValue:c,decoration:const InputDecoration(labelText:'Type',border:OutlineInputBorder()),items:const [DropdownMenuItem(value:'',child:Text('All categories')),DropdownMenuItem(value:'ADD-ON',child:Text('Add-on')),DropdownMenuItem(value:'TEXTURE PACK',child:Text('Texture pack')),DropdownMenuItem(value:'SKIN PACK',child:Text('Skin pack')),DropdownMenuItem(value:'WORLD',child:Text('World')),DropdownMenuItem(value:'MASHUP PACK',child:Text('Mashup pack')),DropdownMenuItem(value:'TEMPLATE',child:Text('Template')),DropdownMenuItem(value:'APPLICATION',child:Text('Application'))],onChanged:(v)=>setSheet(()=>c=v??'')),
      const SizedBox(height:14),DropdownButtonFormField<String>(initialValue:u,decoration:const InputDecoration(labelText:'Last updated',border:OutlineInputBorder()),items:const [DropdownMenuItem(value:'',child:Text('All dates')),DropdownMenuItem(value:'7d',child:Text('Past 7 days')),DropdownMenuItem(value:'30d',child:Text('Past 30 days')),DropdownMenuItem(value:'1y',child:Text('Past year'))],onChanged:(v)=>setSheet(()=>u=v??'')),
      const SizedBox(height:14),DropdownButtonFormField<String>(initialValue:s,decoration:const InputDecoration(labelText:'Sorting',border:OutlineInputBorder()),items:const [DropdownMenuItem(value:'updated_desc',child:Text('Newest updated')),DropdownMenuItem(value:'updated_asc',child:Text('Oldest updated')),DropdownMenuItem(value:'relevance',child:Text('Relevance'))],onChanged:(v)=>setSheet(()=>s=v??'updated_desc')),
      const SizedBox(height:18),Wrap(spacing:8,alignment:WrapAlignment.end,children:[TextButton(onPressed:()=>setSheet((){c='';u='';s='updated_desc';}),child:const Text('Clear')),TextButton(onPressed:()=>Navigator.pop(context,false),child:const Text('Cancel')),FilledButton(onPressed:()=>Navigator.pop(context,true),child:const Text('Apply filters'))])]))))));
    if(applied==true){category=c;updated=u;sort=s;page=1;reload();}
  }
  Widget browse()=>Column(children:[Padding(padding:const EdgeInsets.fromLTRB(16,8,16,8),child:Row(children:[Expanded(child:TextField(controller:search,decoration:const InputDecoration(labelText:'Search add-ons or creators',border:OutlineInputBorder(),isDense:true),onSubmitted:(v){query=v.trim();page=1;reload();})),IconButton(tooltip:'Search',onPressed:(){query=search.text.trim();page=1;reload();},icon:const Icon(Icons.search)),IconButton(tooltip:'Filters',onPressed:filters,icon:const Icon(Icons.tune))])),
    Expanded(child:FutureBuilder<CatalogPage>(future:result,builder:(context,snapshot){
      if(snapshot.connectionState!=ConnectionState.done)return const Center(child:CircularProgressIndicator());
      if(snapshot.hasError)return Center(child:Column(mainAxisSize:MainAxisSize.min,children:[const Text('Could not load the catalog.'),const SizedBox(height:12),FilledButton(onPressed:reload,child:const Text('Try again'))]));
      final data=snapshot.data!;
      if(data.items.isEmpty)return Center(child:Padding(padding:const EdgeInsets.all(24),child:Column(mainAxisSize:MainAxisSize.min,children:[Text(data.total>0?'Page not available':'No matches found',style:Theme.of(context).textTheme.headlineSmall),const SizedBox(height:8),const Text('Try another search or filter.'),if(query.isNotEmpty) ...[const SizedBox(height:16),FilledButton(onPressed:()=>openTelegram(context,'MARKETPLACE_TRADER_HELPER_BOT','suggest'),child:const Text('Request in Telegram'))]])));
      return LayoutBuilder(builder:(context,box){final columns=box.maxWidth>=1024?4:box.maxWidth>=900?3:box.maxWidth>=600?2:1;
        final cardWidth=(box.maxWidth-32-(columns-1)*12)/columns;
        final scale=MediaQuery.textScalerOf(context).scale(1).clamp(1.0,2.5);
        final extent=cardWidth*9/16+115*scale;
        return CustomScrollView(slivers:[SliverPadding(padding:const EdgeInsets.all(16),sliver:SliverGrid(delegate:SliverChildBuilderDelegate((context,index){final item=data.items[index];return CatalogCard(item:item,onTap:()=>Navigator.push(context,MaterialPageRoute(builder:(_)=>DetailScreen(item:item,telegram:telegram,downloads:downloads))));},childCount:data.items.length),gridDelegate:SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount:columns,crossAxisSpacing:12,mainAxisSpacing:12,mainAxisExtent:extent))),SliverToBoxAdapter(child:Padding(padding:const EdgeInsets.fromLTRB(16,12,16,24),child:Row(mainAxisAlignment:MainAxisAlignment.center,children:[OutlinedButton(onPressed:page>1?(){page--;reload();}:null,child:const Text('Previous')),Padding(padding:const EdgeInsets.symmetric(horizontal:16),child:Text('Page $page')),OutlinedButton(onPressed:page*24<data.total?(){page++;reload();}:null,child:const Text('Next'))]))) ]);
      });
    }))]);
  @override Widget build(BuildContext context)=>Scaffold(
    appBar:AppBar(title:Row(children:[ClipRRect(borderRadius:BorderRadius.circular(10),child:Image.asset('assets/alium_icon.png',width:40,height:40)),const SizedBox(width:10),Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,mainAxisSize:MainAxisSize.min,children:[Text('Alium',style:Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight:FontWeight.bold)),Text('by Marketplace Trader',style:Theme.of(context).textTheme.labelMedium,overflow:TextOverflow.ellipsis)]))]),actions:[AnimatedBuilder(animation:telegram,builder:(context,_)=>IconButton(tooltip:'Telegram account',onPressed:()=>Navigator.push(context,MaterialPageRoute(builder:(_)=>AccountScreen(telegram:telegram))),icon:ProfileAvatar(telegram:telegram,radius:16)))]),
    body:SafeArea(child:IndexedStack(index:tab,children:[browse(),DownloadsView(downloads:downloads),SettingsView(telegram:telegram,mode:widget.mode,onTheme:widget.onTheme)])),
    bottomNavigationBar:NavigationBar(selectedIndex:tab,onDestinationSelected:(v)=>setState(()=>tab=v),destinations:const [NavigationDestination(icon:Icon(Icons.grid_view_outlined),selectedIcon:Icon(Icons.grid_view),label:'Browse'),NavigationDestination(icon:Icon(Icons.download_outlined),selectedIcon:Icon(Icons.download),label:'Downloads'),NavigationDestination(icon:Icon(Icons.settings_outlined),selectedIcon:Icon(Icons.settings),label:'Settings')]));
}

class CatalogCard extends StatelessWidget {
  const CatalogCard({super.key,required this.item,required this.onTap}); final CatalogItem item; final VoidCallback onTap;
  @override Widget build(BuildContext context)=>Card(clipBehavior:Clip.antiAlias,child:InkWell(onTap:onTap,child:Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[AspectRatio(aspectRatio:16/9,child:CatalogImage(url:item.thumbnail)),Expanded(child:Padding(padding:const EdgeInsets.all(12),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(item.title,maxLines:2,overflow:TextOverflow.ellipsis,style:Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight:FontWeight.w700)),Text(item.creator.isEmpty?'Creator not listed':item.creator,maxLines:1,overflow:TextOverflow.ellipsis),Text(item.category,maxLines:1,overflow:TextOverflow.ellipsis,style:Theme.of(context).textTheme.labelMedium)])))])));
}
class CatalogImage extends StatelessWidget {
  const CatalogImage({super.key,required this.url}); final String url;
  @override Widget build(BuildContext context){final uri=Uri.tryParse(url);Widget fallback()=>ColoredBox(color:Theme.of(context).colorScheme.surfaceContainerHighest,child:const Center(child:Text('Image unavailable')));if(uri==null||uri.scheme!='https'||uri.host.isEmpty)return fallback();return Image.network(url,fit:BoxFit.cover,width:double.infinity,errorBuilder:(_,error,stack)=>fallback());}
}

class DetailScreen extends StatelessWidget {
  const DetailScreen({super.key,required this.item,required this.telegram,required this.downloads});
  final CatalogItem item;final TelegramClient telegram;final BotDownload downloads;
  @override Widget build(BuildContext context)=>Scaffold(appBar:AppBar(title:const Text('Details')),body:ListView(padding:const EdgeInsets.all(18),children:[ClipRRect(borderRadius:BorderRadius.circular(20),child:AspectRatio(aspectRatio:16/9,child:CatalogImage(url:item.thumbnail))),const SizedBox(height:18),Text(item.title,style:Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight:FontWeight.bold)),const SizedBox(height:8),Text(item.creator.isEmpty?'Creator not listed':item.creator),const SizedBox(height:8),Text(item.category.isEmpty?'Category not available':item.category),if(item.version.isNotEmpty)Text('Version: ${item.version}'),if(item.fileSize>0)Text('File size: ${(item.fileSize/1048576).toStringAsFixed(1)} MB'),const SizedBox(height:8),const Text('Marketplace price: Not available'),const SizedBox(height:20),DownloadPanel(item:item,telegram:telegram,downloads:downloads),const SizedBox(height:12),OutlinedButton(onPressed:()=>openTelegram(context,'Mc_addonbot',item.uuid),child:const Text('Open bot in Telegram')),const SizedBox(height:20),const Text('Minecraft Bedrock community catalog. Not affiliated with Mojang or Microsoft.') ]));
}

class DownloadPanel extends StatefulWidget {
  const DownloadPanel({super.key,required this.item,required this.telegram,required this.downloads});
  final CatalogItem item;final TelegramClient telegram;final BotDownload downloads;
  @override State<DownloadPanel> createState()=>_DownloadPanelState();
}
class _DownloadPanelState extends State<DownloadPanel> {
  bool busy=false;
  Future<void> perform(Future<void> Function() action) async {setState(()=>busy=true);try{await action();}catch(e){if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(e is TdException?e.message:'Could not complete the action. Try again or open Telegram.')));}finally{if(mounted)setState(()=>busy=false);}}
  @override Widget build(BuildContext context)=>AnimatedBuilder(animation:Listenable.merge([widget.telegram,widget.downloads]),builder:(context,_){final t=widget.telegram; final d=widget.downloads;return Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[
    if(!t.ready) FilledButton.icon(onPressed:()=>Navigator.push(context,MaterialPageRoute(builder:(_)=>AccountScreen(telegram:t))),icon:const Icon(Icons.account_circle_outlined),label:const Text('Sign in to download')),
    if(t.ready&&d.uuid==null) ...[const Text('Download requests are sent to the bot using your Telegram account.'),const SizedBox(height:10),FilledButton.icon(onPressed:busy?null:()=>perform(()=>d.request(widget.item.uuid,itemTitle:widget.item.title,itemCategory:widget.item.category)),icon:const Icon(Icons.download),label:const Text('Download'))],
    if(d.uuid!=null&&d.uuid!=widget.item.uuid) const Text('Another request is active. Check Downloads to finish it.'),
    if(d.uuid==widget.item.uuid) ...[Text(d.status),const SizedBox(height:10),if(d.files.isNotEmpty) const Text('Choose the correct file. The bot does not identify which request its replies belong to.'),for(final file in d.files.values) FileTile(file:file,downloads:d,perform:perform),const SizedBox(height:8),OutlinedButton(onPressed:busy?null:()=>perform(() async =>d.finish()),child:const Text('Finish request'))],
    if(d.uuid==widget.item.uuid) const Padding(padding:EdgeInsets.only(top:12),child:Text('If the bot asks you to join channels, complete that in Telegram and try again.')),
  ]);});
}

class FileTile extends StatelessWidget {
  const FileTile({super.key,required this.file,required this.downloads,required this.perform});
  final BotFile file;final BotDownload downloads;final Future<void> Function(Future<void> Function()) perform;
  @override Widget build(BuildContext context){final active=downloads.selected.contains(file.id), saved=downloads.isSaved(file.id);return Card(child:Padding(padding:const EdgeInsets.all(14),child:Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[Text(file.name,style:Theme.of(context).textTheme.titleMedium),if(file.bytes>0)Text('${(file.bytes/1048576).toStringAsFixed(1)} MB'),if(active&&!saved) ...[const SizedBox(height:8),LinearProgressIndicator(value:file.bytes>0?(file.downloaded/file.bytes).clamp(0.0,1.0):null),Text(file.complete?'Saving…':'Downloading ${(file.downloaded/1048576).toStringAsFixed(1)} MB')],const SizedBox(height:8),if(saved) const Text('Saved') else if(active&&!file.complete) OutlinedButton(onPressed:()=>perform(()=>downloads.cancel(file.id)),child:const Text('Cancel download')) else if(!active) FilledButton(onPressed:()=>perform(()=>downloads.download(file.id)),child:const Text('Download this file'))])));}
}

class DownloadsView extends StatelessWidget {
  const DownloadsView({super.key,required this.downloads}); final BotDownload downloads;
  Future<void> perform(BuildContext context,Future<void> Function() action) async {try{await action();}catch(e){if(context.mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(e is TdException?e.message:'File is unavailable or no compatible app is installed.')));}}
  @override Widget build(BuildContext context)=>AnimatedBuilder(animation:downloads,builder:(context,_){final d=downloads;return ListView(padding:const EdgeInsets.all(20),children:[Text('Downloads',style:Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight:FontWeight.bold)),const SizedBox(height:20),Text('Active',style:Theme.of(context).textTheme.titleLarge),const SizedBox(height:8),
    if(d.uuid==null) const Text('No active requests.') else ...[Text(d.title,style:Theme.of(context).textTheme.titleMedium),Text(d.status),if(d.files.isNotEmpty) const Text('Check the file name before downloading.'),for(final file in d.files.values) FileTile(file:file,downloads:d,perform:(action)=>perform(context,action)),OutlinedButton(onPressed:()=>perform(context,() async =>d.finish()),child:const Text('Finish request')),TextButton(onPressed:()=>openTelegram(context,'Mc_addonbot',d.uuid),child:const Text('Open bot in Telegram'))],
    const SizedBox(height:24),Text('Downloaded',style:Theme.of(context).textTheme.titleLarge),const SizedBox(height:8),if(d.history.isEmpty) const Text('Saved files will appear here.'),
    for(final item in d.history) Card(child:ListTile(title:Text(item.name),subtitle:Text('${item.title}\n${item.category}'),isThreeLine:true,onTap:()=>perform(context,()=>d.open(item)),trailing:PopupMenuButton<String>(tooltip:'Manage download',onSelected:(value) async {
      if(value=='open') {await perform(context,()=>d.open(item));return;}
      if(value=='remove') {await perform(context,()=>d.remove(item));return;}
      final delete=await showDialog<bool>(context:context,builder:(context)=>AlertDialog(title:const Text('Delete file?'),content:Text('Delete ${item.name} from your device?'),actions:[TextButton(onPressed:()=>Navigator.pop(context,false),child:const Text('Cancel')),FilledButton(onPressed:()=>Navigator.pop(context,true),child:const Text('Delete'))]));
      if(delete==true && context.mounted) await perform(context,()=>d.remove(item,deleteFile:true));
    },itemBuilder:(_)=>const [PopupMenuItem(value:'open',child:Text('Open')),PopupMenuItem(value:'remove',child:Text('Remove from history')),PopupMenuItem(value:'delete',child:Text('Delete file'))])))
  ]);});
}

class SettingsView extends StatelessWidget {
  const SettingsView({super.key,required this.telegram,required this.mode,required this.onTheme});
  final TelegramClient telegram;final ThemeMode mode;final ValueChanged<ThemeMode> onTheme;
  @override Widget build(BuildContext context)=>ListView(padding:const EdgeInsets.all(20),children:[Text('Settings',style:Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight:FontWeight.bold)),const SizedBox(height:16),Card(child:ListTile(leading:AnimatedBuilder(animation:telegram,builder:(_,__)=>ProfileAvatar(telegram:telegram,radius:22)),title:const Text('Telegram account'),subtitle:const Text('Profile and sign-in'),trailing:const Icon(Icons.chevron_right),onTap:()=>Navigator.push(context,MaterialPageRoute(builder:(_)=>AccountScreen(telegram:telegram))))),const SizedBox(height:16),Text('Appearance',style:Theme.of(context).textTheme.titleMedium),RadioListTile<ThemeMode>(title:const Text('Use device theme'),value:ThemeMode.system,groupValue:mode,onChanged:(v){if(v!=null)onTheme(v);}),RadioListTile<ThemeMode>(title:const Text('Light'),value:ThemeMode.light,groupValue:mode,onChanged:(v){if(v!=null)onTheme(v);}),RadioListTile<ThemeMode>(title:const Text('Dark'),value:ThemeMode.dark,groupValue:mode,onChanged:(v){if(v!=null)onTheme(v);}),const Divider(),const ListTile(leading:Icon(Icons.folder_outlined),title:Text('Download location'),subtitle:Text('Downloads / Alium / category on Android 10 and newer. Older devices use the file picker.')),ListTile(leading:const Icon(Icons.campaign_outlined),title:const Text('Main channel'),onTap:()=>openTelegram(context,'Minecraft_addon_free_download')),ListTile(leading:const Icon(Icons.forum_outlined),title:const Text('Community support'),onTap:()=>openTelegram(context,'minecraft_group_chat_friends')),ListTile(leading:const Icon(Icons.support_agent_outlined),title:const Text('Contact support'),onTap:()=>openTelegram(context,'alchemisst')),const ListTile(leading:Icon(Icons.info_outline),title:Text('Alium by Marketplace Trader'),subtitle:Text('Independent Minecraft Bedrock community catalog.'))]);
}
class ProfileAvatar extends StatelessWidget {
  const ProfileAvatar({super.key,required this.telegram,required this.radius});final TelegramClient telegram;final double radius;
  @override Widget build(BuildContext context){final path=telegram.avatarPath;final name=(telegram.profile?['first_name']??'').toString();return CircleAvatar(radius:radius,backgroundImage:path!=null&&path.isNotEmpty?FileImage(File(path)):null,child:path!=null&&path.isNotEmpty?null:name.isNotEmpty?Text(name.substring(0,1).toUpperCase(),semanticsLabel:'Telegram profile'):const Icon(Icons.person_outline));}
}

class AccountScreen extends StatefulWidget {
  const AccountScreen({super.key,required this.telegram});final TelegramClient telegram;
  @override State<AccountScreen> createState()=>_AccountScreenState();
}
class _AccountScreenState extends State<AccountScreen> {
  final apiId=TextEditingController(),apiHash=TextEditingController(),input=TextEditingController(); bool busy=false; Country? country;
  @override void dispose(){apiId.dispose();apiHash.dispose();input.dispose();super.dispose();}
  Future<void> perform(Future<void> Function() work) async {setState(()=>busy=true);try{await work();input.clear();}catch(_){if(mounted)ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Telegram could not complete that step. Check your details and try again.')));}finally{if(mounted)setState(()=>busy=false);}}
  @override Widget build(BuildContext context)=>Scaffold(appBar:AppBar(title:const Text('Telegram account')),body:AnimatedBuilder(animation:widget.telegram,builder:(context,_){
    final t=widget.telegram;final state=t.state; final name=[t.profile?['first_name'],t.profile?['last_name']].whereType<String>().where((s)=>s.isNotEmpty).join(' '); final usernames=t.profile?['usernames']; final active=usernames is Map ? usernames['active_usernames'] : null; final username=active is List && active.isNotEmpty ? active.first.toString() : ''; 
    return ListView(padding:const EdgeInsets.all(20),children:[if(t.ready) ...[Center(child:ProfileAvatar(telegram:t,radius:42)),const SizedBox(height:12),Center(child:Text(name.isEmpty?'Telegram account':name,style:Theme.of(context).textTheme.headlineSmall)),if(username.isNotEmpty) Center(child:Text('@$username')),const SizedBox(height:24)] else ...[Text('Your Telegram account',style:Theme.of(context).textTheme.headlineSmall),const SizedBox(height:10)],
      const Text('Alium uses your own Telegram account to contact the file bot when you request a download. Your session stays on this device. Never share login codes or passwords.'),const SizedBox(height:24),
      if(state=='needsCredentials') ...[const Text('This test build has not been configured by the developer. An app developer can enter the Telegram application API ID and hash here, or configure them at build time. Regular users do not need their own API ID.'),const SizedBox(height:12),TextField(controller:apiId,keyboardType:TextInputType.number,decoration:const InputDecoration(labelText:'Developer API ID',border:OutlineInputBorder())),const SizedBox(height:12),TextField(controller:apiHash,obscureText:true,enableSuggestions:false,autocorrect:false,decoration:const InputDecoration(labelText:'Developer API hash',border:OutlineInputBorder())),const SizedBox(height:12),FilledButton(onPressed:busy?null:()=>perform(() async {await t.start(apiId:int.tryParse(apiId.text),apiHash:apiHash.text.trim());apiHash.clear();}),child:const Text('Continue'))],
      if(state=='authorizationStateWaitPhoneNumber') ...[const Text('Select your country, then enter your own Telegram phone number.'),const SizedBox(height:12),OutlinedButton(onPressed:()=>showCountryPicker(context:context,showPhoneCode:true,onSelect:(value)=>setState(()=>country=value)),child:Text(country==null?'Choose country': '${country!.name}  +${country!.phoneCode}')),const SizedBox(height:12),TextField(controller:input,keyboardType:TextInputType.phone,decoration:const InputDecoration(labelText:'Phone number',hintText:'National number, or full international number',border:OutlineInputBorder())),const SizedBox(height:12),FilledButton(onPressed:busy?null:()=>perform(() async {final raw=input.text.trim().replaceAll(RegExp(r'[\s()\-]'),'');if(raw.isEmpty || (!raw.startsWith('+')&&country==null)) throw TdException('Select a country');final number=raw.startsWith('+')?raw:'+${country!.phoneCode}$raw';if(!RegExp(r'^\+[1-9]\d{5,14}$').hasMatch(number)) throw TdException('Invalid phone number');await t.phone(number);}),child:const Text('Continue'))],
      if(state=='authorizationStateWaitCode') ...[const Text('Enter the login code Telegram sent you.'),const SizedBox(height:12),TextField(controller:input,keyboardType:TextInputType.number,obscureText:true,enableSuggestions:false,autocorrect:false,decoration:const InputDecoration(labelText:'Telegram login code',border:OutlineInputBorder())),const SizedBox(height:12),FilledButton(onPressed:busy?null:()=>perform(()=>t.code(input.text.trim())),child:const Text('Verify code'))],
      if(state=='authorizationStateWaitPassword') ...[Text(t.hint.isEmpty?'Enter your Telegram two-step verification password.':'Two-step verification hint: ${t.hint}'),const SizedBox(height:12),TextField(controller:input,obscureText:true,enableSuggestions:false,autocorrect:false,decoration:const InputDecoration(labelText:'Two-step verification password',border:OutlineInputBorder())),const SizedBox(height:12),FilledButton(onPressed:busy?null:()=>perform(()=>t.password(input.text)),child:const Text('Continue'))],
      if(state=='authorizationStateWaitEmailAddress') ...[const Text('Telegram requires a login email address.'),const SizedBox(height:12),TextField(controller:input,keyboardType:TextInputType.emailAddress,decoration:const InputDecoration(labelText:'Email address',border:OutlineInputBorder())),const SizedBox(height:12),FilledButton(onPressed:busy?null:()=>perform(()=>t.email(input.text.trim())),child:const Text('Continue'))],
      if(state=='authorizationStateWaitEmailCode') ...[const Text('Enter the email code Telegram sent you.'),const SizedBox(height:12),TextField(controller:input,obscureText:true,keyboardType:TextInputType.number,decoration:const InputDecoration(labelText:'Email code',border:OutlineInputBorder())),const SizedBox(height:12),FilledButton(onPressed:busy?null:()=>perform(()=>t.emailCode(input.text.trim())),child:const Text('Verify code'))],
      if(t.ready) ...[const Text('Signed in on this device.'),const SizedBox(height:12),OutlinedButton(onPressed:busy?null:() async {final yes=await showDialog<bool>(context:context,builder:(context)=>AlertDialog(title:const Text('Sign out?'),content:const Text('This ends the Alium Telegram session on this device. Saved downloads remain on your device.'),actions:[TextButton(onPressed:()=>Navigator.pop(context,false),child:const Text('Cancel')),FilledButton(onPressed:()=>Navigator.pop(context,true),child:const Text('Sign out'))]));if(yes==true&&mounted)perform(t.logout);},child:const Text('Sign out'))],
      if(state=='authorizationStateClosed') const Text('Signed out. Close and reopen the app to sign in again.'),
      if(state=='failed') Text(t.failure??'Telegram is unavailable on this device.'),
      if(!['needsCredentials','authorizationStateWaitPhoneNumber','authorizationStateWaitCode','authorizationStateWaitPassword','authorizationStateWaitEmailAddress','authorizationStateWaitEmailCode','authorizationStateReady','authorizationStateClosed','failed'].contains(state)) const Text('Connecting to Telegram… If a different login method is required, open Telegram and try again.'),
    ]);
  }));
}

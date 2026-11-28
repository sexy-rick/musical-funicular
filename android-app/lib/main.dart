import 'dart:async';
import 'dart:io';
import 'dart:typed_data';
import 'package:country_picker/country_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import 'bot_download.dart';
import 'catalog.dart';
import 'td_client.dart';
import 'updater.dart';

void main() => runApp(const MarketplaceApp());

Future<void> openTelegram(BuildContext context, String domain, [String? start]) async {
  final direct = Uri(scheme:'tg', host:'resolve', queryParameters:{'domain':domain, if (start != null) 'start':start});
  final web = Uri.https('t.me', '/$domain', start == null ? null : {'start':start});
  try { if (await launchUrl(direct, mode:LaunchMode.externalApplication)) return; } catch (_) {}
  if (!context.mounted) return;
  final useWeb = await showDialog<bool>(context:context, builder:(context)=>AlertDialog(title:const Text('Telegram app not found'),content:const Text('Open link in browser?'),actions:[TextButton(onPressed:()=>Navigator.pop(context,false),child:const Text('Cancel')),FilledButton(onPressed:()=>Navigator.pop(context,true),child:const Text('Open link'))]));
  if (useWeb == true) await launchUrl(web,mode:LaunchMode.externalApplication);
}

const fileChannel = MethodChannel('marketplace_trader/files');
Future<void> shareItem(BuildContext context, String uuid, String title, String version) async {
  try { await fileChannel.invokeMethod<void>('share', {'uuid':uuid,'title':title,'version':version}); }
  catch (_) { if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Link unavailable.'))); }
}

class MarketplaceApp extends StatefulWidget {
  const MarketplaceApp({super.key});
  @override State<MarketplaceApp> createState()=>_MarketplaceAppState();
}
class _MarketplaceAppState extends State<MarketplaceApp> {
  ThemeMode mode=ThemeMode.system; int accent=0xff874f9e;
  @override void initState(){super.initState(); _load();}
  Future<void> _load() async {final p=await SharedPreferences.getInstance(); final saved=p.getString('alium_theme'); if(mounted)setState((){mode=saved == 'light' ? ThemeMode.light : saved == 'dark' ? ThemeMode.dark : ThemeMode.system;final value=p.getInt('alium_accent');if([0xff874f9e,0xff426854,0xff536486,0xff855b22].contains(value))accent=value!;});}
  void setMode(ThemeMode value){setState(()=>mode=value); SharedPreferences.getInstance().then((p)=>p.setString('alium_theme',value.name));}
  void setAccent(int value){setState(()=>accent=value);SharedPreferences.getInstance().then((p)=>p.setInt('alium_accent',value));}
  @override Widget build(BuildContext context){
    ThemeData theme(Brightness brightness){
      final scheme=ColorScheme.fromSeed(seedColor:Color(accent),brightness:brightness);
      return ThemeData(useMaterial3:true,colorScheme:scheme,scaffoldBackgroundColor:scheme.surface,
        appBarTheme:AppBarTheme(backgroundColor:scheme.surface,scrolledUnderElevation:0),
        cardTheme:CardThemeData(color:scheme.surfaceContainerLow,elevation:0,shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(24),side:BorderSide(color:scheme.outlineVariant))),
        filledButtonTheme:FilledButtonThemeData(style:FilledButton.styleFrom(minimumSize:const Size(48,48))),
        outlinedButtonTheme:OutlinedButtonThemeData(style:OutlinedButton.styleFrom(minimumSize:const Size(48,48))));
    }
    return MaterialApp(title:'Alium',debugShowCheckedModeBanner:false,theme:theme(Brightness.light),darkTheme:theme(Brightness.dark),themeMode:mode,home:CatalogScreen(mode:mode,onTheme:setMode,accent:accent,onAccent:setAccent));
  }
}

class CatalogScreen extends StatefulWidget {
  const CatalogScreen({super.key,required this.mode,required this.onTheme,required this.accent,required this.onAccent});
  final ThemeMode mode; final ValueChanged<ThemeMode> onTheme; final int accent; final ValueChanged<int> onAccent;
  @override State<CatalogScreen> createState()=>_CatalogScreenState();
}
class _CatalogScreenState extends State<CatalogScreen> {
  final api=CatalogApi(); final telegram=TelegramClient(); final search=TextEditingController();
  late final downloads=BotDownload(telegram);
  String query='',creator='',category='',updated='',sort='updated_desc'; int page=1, tab=0;
  late Future<CatalogPage> result; Timer? searchDebounce;
  static const links=MethodChannel('alium/links');
  @override void initState(){super.initState();result=load();telegram.start();
    links.setMethodCallHandler((call) async {if(call.method=='link' && call.arguments is String) await handleLink(call.arguments as String);});
    WidgetsBinding.instance.addPostFrameCallback((_) async {try {final link=await links.invokeMethod<String>('initial');if(link!=null)await handleLink(link);} catch (_) {} if(mounted) unawaited(checkForUpdates(context,automatic:true));});
  }
  Future<void> handleLink(String raw) async {
    if(!mounted || raw.length>512) return;
    final uri=Uri.tryParse(raw); if(uri==null || uri.scheme!='alium' || uri.userInfo.isNotEmpty || uri.hasPort || uri.hasQuery || uri.hasFragment) return;
    if(uri.path.isEmpty || uri.path=='/') {final index={'browse':0,'downloads':1,'settings':2}[uri.host];if(index!=null)setState(()=>tab=index);return;}
    if(uri.host!='item' || uri.pathSegments.length!=1) return;
    final id=uri.pathSegments.first; if(!RegExp(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',caseSensitive:false).hasMatch(id))return;
    try {final item=await api.detail(id);if(mounted)Navigator.push(context,MaterialPageRoute(builder:(_)=>DetailScreen(item:item,telegram:telegram,downloads:downloads,onFilter:filterItem)));}
    catch (_) {if(mounted)ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Item unavailable.')));}
  }
  Future<CatalogPage> load()=>api.list(query:query,creator:creator,category:category,updated:updated,sort:query.isNotEmpty && sort=='updated_desc' ? 'relevance' : sort,page:page);
  void reload(){setState(()=>result=load());}
  void filterItem({String? studio,String? type}) { searchDebounce?.cancel(); search.clear(); query=''; creator=studio??'';category=type??'';page=1;setState(()=>tab=0);reload(); }
  void runSearch(String value) { searchDebounce?.cancel(); query=value.trim(); creator=''; page=1; reload(); }
  void scheduleSearch(String value) { searchDebounce?.cancel(); searchDebounce=Timer(const Duration(milliseconds:300),()=>runSearch(value)); }
  @override void dispose(){links.setMethodCallHandler(null);searchDebounce?.cancel();api.dispose();downloads.dispose();telegram.dispose();search.dispose();super.dispose();}
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
  Widget browse()=>Column(children:[if(creator.isNotEmpty) ListTile(title:Text('Studio: $creator'),trailing:IconButton(tooltip:'Clear studio',icon:const Icon(Icons.close),onPressed:(){creator='';page=1;reload();})),Padding(padding:const EdgeInsets.fromLTRB(16,8,16,8),child:Row(children:[Expanded(child:TextField(controller:search,textInputAction:TextInputAction.search,decoration:InputDecoration(hintText:'Search add-ons or creators',labelText:'Search catalog',filled:true,border:OutlineInputBorder(borderRadius:BorderRadius.circular(28),borderSide:BorderSide.none),isDense:true,suffixIcon:search.text.isEmpty?null:IconButton(tooltip:'Clear search',onPressed:(){search.clear();runSearch('');},icon:const Icon(Icons.close))),onChanged:(v){setState((){});scheduleSearch(v);},onSubmitted:runSearch)),IconButton(tooltip:'Search',onPressed:()=>runSearch(search.text),icon:const Icon(Icons.search)),IconButton(tooltip:'Filters',onPressed:filters,icon:const Icon(Icons.tune))])),
    Expanded(child:FutureBuilder<CatalogPage>(future:result,builder:(context,snapshot){
      if(snapshot.connectionState!=ConnectionState.done)return const Center(child:Column(mainAxisSize:MainAxisSize.min,children:[CircularProgressIndicator(),SizedBox(height:12),Text('Loading catalog…')]));
      if(snapshot.hasError)return Center(child:Column(mainAxisSize:MainAxisSize.min,children:[const Text('Could not load the catalog.'),const SizedBox(height:12),FilledButton(onPressed:reload,child:const Text('Try again'))]));
      final data=snapshot.data!;
      if(data.items.isEmpty)return Center(child:Padding(padding:const EdgeInsets.all(24),child:Column(mainAxisSize:MainAxisSize.min,children:[Text(data.total>0?'Page not available':'No matches found',style:Theme.of(context).textTheme.headlineSmall),const SizedBox(height:8),const Text('Try another search or filter.'),if(query.isNotEmpty) ...[const SizedBox(height:16),FilledButton(onPressed:()=>openTelegram(context,'MARKETPLACE_TRADER_HELPER_BOT','suggest'),child:const Text('Request in Telegram'))]])));
      return LayoutBuilder(builder:(context,box){final columns=box.maxWidth>=1024?4:box.maxWidth>=900?3:box.maxWidth>=600?2:1;
        final cardWidth=(box.maxWidth-32-(columns-1)*12)/columns;
        final scale=MediaQuery.textScalerOf(context).scale(1).clamp(1.0,2.5);
        final extent=cardWidth*9/16+175*scale;
        Widget itemCard(BuildContext context,int index){
          final item=data.items[index];
          void openDetails()=>Navigator.push(context,MaterialPageRoute(builder:(_)=>DetailScreen(item:item,telegram:telegram,downloads:downloads,onFilter:filterItem)));
          return CatalogCard(item:item,onTap:openDetails,onCategory:const {'ADD-ON','TEXTURE PACK','SKIN PACK','WORLD','MASHUP PACK','TEMPLATE','APPLICATION'}.contains(item.category.toUpperCase().trim()) ? () => filterItem(type:item.category.toUpperCase().trim()) : null,onShare:()=>shareItem(context,item.uuid,item.title,item.version),onDownload:openDetails);
        }
        final children=SliverChildBuilderDelegate(itemCard,childCount:data.items.length);
        return CustomScrollView(slivers:[
          SliverPadding(padding:const EdgeInsets.all(16),sliver:columns==1 ? SliverList(delegate:children) : SliverGrid(delegate:children,gridDelegate:SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount:columns,crossAxisSpacing:12,mainAxisSpacing:12,mainAxisExtent:extent))),
          SliverToBoxAdapter(child:Padding(padding:const EdgeInsets.fromLTRB(16,12,16,24),child:Row(mainAxisAlignment:MainAxisAlignment.center,children:[OutlinedButton(onPressed:page>1?(){page--;reload();}:null,child:const Text('Previous')),Padding(padding:const EdgeInsets.symmetric(horizontal:16),child:Text('Page $page')),OutlinedButton(onPressed:page*24<data.total?(){page++;reload();}:null,child:const Text('Next'))]))),
        ]);
      });
    }))]);
  @override Widget build(BuildContext context)=>Scaffold(
    appBar:AppBar(title:Row(children:[ClipRRect(borderRadius:BorderRadius.circular(10),child:Image.asset('assets/alium_icon.png',width:40,height:40)),const SizedBox(width:10),Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,mainAxisSize:MainAxisSize.min,children:[Text('Alium',style:Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight:FontWeight.bold)),Text('by Marketplace Trader',style:Theme.of(context).textTheme.labelMedium,overflow:TextOverflow.ellipsis)]))]),actions:[AnimatedBuilder(animation:telegram,builder:(context,_)=>IconButton(tooltip:'Telegram account',onPressed:()=>Navigator.push(context,MaterialPageRoute(builder:(_)=>AccountScreen(telegram:telegram))),icon:ProfileAvatar(telegram:telegram,radius:16)))]),
    body:SafeArea(child:IndexedStack(index:tab,children:[browse(),DownloadsView(downloads:downloads),SettingsView(telegram:telegram,mode:widget.mode,onTheme:widget.onTheme,accent:widget.accent,onAccent:widget.onAccent,onManage:()=>setState(()=>tab=1))])),
    bottomNavigationBar:NavigationBar(selectedIndex:tab,onDestinationSelected:(v)=>setState(()=>tab=v),destinations:const [NavigationDestination(icon:Icon(Icons.grid_view_outlined),selectedIcon:Icon(Icons.grid_view),label:'Browse'),NavigationDestination(icon:Icon(Icons.download_outlined),selectedIcon:Icon(Icons.download),label:'Downloads'),NavigationDestination(icon:Icon(Icons.settings_outlined),selectedIcon:Icon(Icons.settings),label:'Settings')]));
}

class ExpressivePress extends StatefulWidget {
  const ExpressivePress({super.key,required this.child});
  final Widget child;
  @override State<ExpressivePress> createState()=>_ExpressivePressState();
}
class _ExpressivePressState extends State<ExpressivePress> {
  bool pressed=false;
  @override Widget build(BuildContext context)=>Listener(onPointerDown:(_)=>setState(()=>pressed=true),onPointerUp:(_)=>setState(()=>pressed=false),onPointerCancel:(_)=>setState(()=>pressed=false),child:AnimatedScale(scale:pressed&&!MediaQuery.disableAnimationsOf(context)&&!MediaQuery.of(context).accessibleNavigation?0.98:1,duration:const Duration(milliseconds:150),curve:Curves.easeOutBack,child:widget.child));
}

class CatalogCard extends StatelessWidget {
  const CatalogCard({super.key,required this.item,required this.onTap,this.onDownload,this.onShare,this.onCategory});
  final CatalogItem item;
  final VoidCallback onTap;
  final VoidCallback? onDownload,onShare,onCategory;

  @override
  Widget build(BuildContext context) {
    final theme=Theme.of(context);
    final category=item.category.trim().toLowerCase();
    Widget categoryLabel() {
      if(category.isEmpty) return const SizedBox.shrink();
      final label=Text(category,maxLines:2,overflow:TextOverflow.ellipsis,style:theme.textTheme.labelMedium);
      return onCategory==null ? Align(alignment:Alignment.centerLeft,child:label) : TextButton(
        onPressed:onCategory,
        style:TextButton.styleFrom(padding:EdgeInsets.zero,alignment:Alignment.centerLeft,minimumSize:const Size(48,48)),
        child:label,
      );
    }
    Widget actions() => Wrap(alignment:WrapAlignment.end,children:[
      if(onShare!=null) IconButton(tooltip:'Share',onPressed:onShare,icon:const Icon(Icons.share_outlined)),
      if(onDownload!=null) FilledButton.icon(style:FilledButton.styleFrom(padding:const EdgeInsets.symmetric(horizontal:12)),onPressed:onDownload,icon:const Icon(Icons.download,size:18),label:const Text('Download')),
    ]);
    return ExpressivePress(child:Card(clipBehavior:Clip.antiAlias,child:Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[
      InkWell(onTap:onTap,child:AspectRatio(aspectRatio:16/9,child:CatalogImage(url:item.thumbnail))),
      Padding(padding:const EdgeInsets.all(12),child:Column(mainAxisSize:MainAxisSize.min,crossAxisAlignment:CrossAxisAlignment.stretch,children:[
        InkWell(onTap:onTap,child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
          Text(item.title,maxLines:2,overflow:TextOverflow.ellipsis,style:theme.textTheme.titleMedium?.copyWith(fontWeight:FontWeight.w700)),
          Text(item.creator.isEmpty?'Creator not listed':item.creator,maxLines:1,overflow:TextOverflow.ellipsis),
        ])),
        const SizedBox(height:6),
        LayoutBuilder(builder:(context,box){
          // At large text sizes put the category above the actions rather than
          // squeezing either label or reducing the touch targets.
          final scale=MediaQuery.textScalerOf(context).scale(1);
          final separate=category.isNotEmpty && (onShare!=null || onDownload!=null) && box.maxWidth < 70 + (onShare!=null ? 48 : 0) + (onDownload!=null ? 88 + 48*scale : 0);
          if(separate) return Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[categoryLabel(),Align(alignment:Alignment.centerRight,child:actions())]);
          return Row(children:[Expanded(child:categoryLabel()),actions()]);
        }),
      ])),
    ])));
  }
}

class CatalogImage extends StatelessWidget {
  const CatalogImage({super.key,required this.url}); final String url;
  @override Widget build(BuildContext context){final uri=Uri.tryParse(url);Widget fallback()=>ColoredBox(color:Theme.of(context).colorScheme.surfaceContainerHighest,child:const Center(child:Text('Image unavailable')));if(uri==null||uri.scheme!='https'||uri.host.isEmpty)return fallback();return Image.network(url,fit:BoxFit.cover,width:double.infinity,errorBuilder:(_,error,stack)=>fallback());}
}

class DetailScreen extends StatelessWidget {
  const DetailScreen({super.key,required this.item,required this.telegram,required this.downloads,this.onFilter});
  final CatalogItem item; final TelegramClient telegram; final BotDownload downloads;
  final void Function({String? studio,String? type})? onFilter;
  @override Widget build(BuildContext context) {
    final theme=Theme.of(context);
    Future<void> help() async {try {if(await launchUrl(Uri.https('marketplacetrader.great-site.net','/faq.php'),mode:LaunchMode.externalApplication)) return;} catch (_) {} if(context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Could not open help.')));}
    return Scaffold(appBar:AppBar(title:Text(item.title,overflow:TextOverflow.ellipsis)),body:Center(child:ConstrainedBox(constraints:const BoxConstraints(maxWidth:760),child:ListView(padding:const EdgeInsets.fromLTRB(20,8,20,28),children:[
      ClipRRect(borderRadius:BorderRadius.circular(24),child:AspectRatio(aspectRatio:16/9,child:CatalogImage(url:item.thumbnail))),
      const SizedBox(height:20),Text(item.title,style:theme.textTheme.headlineSmall?.copyWith(fontWeight:FontWeight.bold)),
      const SizedBox(height:18),Text('Details',style:theme.textTheme.titleLarge?.copyWith(fontWeight:FontWeight.bold)),
      Card(child:Column(children:[
        ListTile(title:const Text('Studio'),subtitle:Text(item.creator.isEmpty?'Not available':item.creator),onTap:item.creator.isEmpty||onFilter==null?null:(){onFilter!(studio:item.creator);Navigator.pop(context);}),
        ListTile(title:const Text('Category'),subtitle:Text(item.category.isEmpty?'Not available':item.category),onTap:item.category.isEmpty||onFilter==null?null:(){onFilter!(type:item.category);Navigator.pop(context);}),
        ListTile(title:const Text('File type'),subtitle:Text(item.fileExt.isEmpty?'Not available':item.fileExt)),
        ListTile(title:const Text('File size'),subtitle:Text(item.fileSize>0?'${(item.fileSize/1048576).toStringAsFixed(1)} MB':'Not available')),
      ])),
      const SizedBox(height:18),DownloadPanel(item:item,telegram:telegram,downloads:downloads),
      const SizedBox(height:20),Card(child:ExpansionTile(title:const Text('Troubleshoot'),children:[ListTile(title:const Text('Telegram not opening?'),subtitle:const Text('Open the bot and try again.'),onTap:()=>openTelegram(context,'Mc_addonbot',item.uuid))])),
      const SizedBox(height:16),Text('How to get started',style:theme.textTheme.titleLarge),
      const SizedBox(height:8),const Text('1. Open the bot and follow its instructions.\n2. Download the file in Telegram if it is available.\n3. On supported devices, open a compatible pack with Minecraft and enable it in your world settings.'),
      Align(alignment:Alignment.centerLeft,child:TextButton(onPressed:help,child:const Text('Need help? Visit the FAQ'))),
      const SizedBox(height:16),Text('KEEP EXPLORING',style:theme.textTheme.labelLarge),Text('Find more for your world',style:theme.textTheme.titleLarge),
      const Text('Discover more add-ons and worlds, or visit our help page for getting started.'),
      Wrap(spacing:8,children:[TextButton(onPressed:()=>Navigator.pop(context),child:const Text('Browse')),TextButton(onPressed:help,child:const Text('Help'))]),
    ]))));
  }
}

class DownloadPanel extends StatefulWidget {
  const DownloadPanel({super.key,required this.item,required this.telegram,required this.downloads});
  final CatalogItem item;final TelegramClient telegram;final BotDownload downloads;
  @override State<DownloadPanel> createState()=>_DownloadPanelState();
}
class _DownloadPanelState extends State<DownloadPanel> {
  bool busy=false;
  Future<void> perform(Future<void> Function() action) async {setState(()=>busy=true);try{await action();}catch(e){if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(e is TdException?e.message:'Could not complete action.')));}finally{if(mounted)setState(()=>busy=false);}}
  @override Widget build(BuildContext context)=>AnimatedBuilder(animation:Listenable.merge([widget.telegram,widget.downloads]),builder:(context,_){final t=widget.telegram; final d=widget.downloads;return Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[
    if(!t.ready) ...[
      OutlinedButton(onPressed:()=>openTelegram(context,'Mc_addonbot',widget.item.uuid),child:const Text('Open in Telegram')),
      FilledButton(onPressed:()=>Navigator.push(context,MaterialPageRoute(builder:(_)=>AccountScreen(telegram:t))),child:const Text('Download in Alium')),
    ] else ...[
      FilledButton.icon(onPressed:busy || d.uuid==widget.item.uuid ? null : ()=>perform(()=>d.request(widget.item.uuid,itemTitle:widget.item.title,itemCategory:widget.item.category,itemVersion:widget.item.version)),icon:const Icon(Icons.download),label:const Text('Download')),
      OutlinedButton.icon(onPressed:()=>shareItem(context,widget.item.uuid,widget.item.title,widget.item.version),icon:const Icon(Icons.share_outlined),label:const Text('Share')),
    ],
    if(d.uuid==widget.item.uuid) ...[Text(d.status),for(final file in d.files.values) FileTile(file:file,downloads:d,perform:perform),if(!d.allDownloaded) Wrap(spacing:8,children:[OutlinedButton(onPressed:busy||d.isSaving||d.pausing?null:()=>perform(d.paused?d.resume:d.pause),child:Text(d.paused?'Resume':'Pause')),TextButton(onPressed:busy||d.isSaving||d.pausing?null:()=>perform(d.cancelRequest),child:const Text('Cancel'))]),if(d.status.startsWith('No file') || d.status.startsWith('Could not contact')) TextButton(onPressed:()=>openTelegram(context,'Mc_addonbot',d.uuid),child:const Text('Open Telegram'))],
    if(d.queue.any((entry)=>entry['uuid']==widget.item.uuid)) const Text('Waiting for previous request.'),
  ]);});
}

class FileTile extends StatelessWidget {
  const FileTile({super.key,required this.file,required this.downloads,required this.perform});
  final BotFile file;
  final BotDownload downloads;
  final Future<void> Function(Future<void> Function()) perform;
  @override
  Widget build(BuildContext context) {
    final active=downloads.selected.contains(file.id), saved=downloads.isSaved(file.id);
    final theme=Theme.of(context);
    final progress=file.bytes>0?(file.downloaded/file.bytes).clamp(0.0,1.0):null;
    return Padding(padding:const EdgeInsets.symmetric(vertical:6),child:Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[
      Text(displayDownloadName(file.name),style:theme.textTheme.titleSmall),
      if(active&&!saved) ...[
        const SizedBox(height:8),
        LinearProgressIndicator(value:progress,semanticsLabel:'File download progress'),
        const SizedBox(height:6),
        Text(file.complete?'Saving…':file.bytes>0?'${(file.downloaded/1048576).toStringAsFixed(1)} / ${(file.bytes/1048576).toStringAsFixed(1)} MB':'${(file.downloaded/1048576).toStringAsFixed(1)} MB downloaded',style:theme.textTheme.bodySmall),
      ] else if(saved) const Text('Downloaded') else if(!downloads.paused) Align(alignment:Alignment.centerLeft,child:TextButton(onPressed:()=>perform(()=>downloads.download(file.id)),child:const Text('Retry'))),
    ]));
  }
}

class DownloadsView extends StatelessWidget {
  const DownloadsView({super.key,required this.downloads});
  final BotDownload downloads;
  Future<void> perform(BuildContext context,Future<void> Function() action) async {try{await action();}catch(e){if(context.mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(e is TdException?e.message:"Couldn't open this file.")));}}
  @override
  Widget build(BuildContext context)=>AnimatedBuilder(animation:downloads,builder:(context,_){
    final d=downloads;
    final theme=Theme.of(context);
    return Center(child:ConstrainedBox(constraints:const BoxConstraints(maxWidth:760),child:ListView(padding:const EdgeInsets.fromLTRB(20,20,20,28),children:[
      Text('Downloads',style:theme.textTheme.headlineMedium?.copyWith(fontWeight:FontWeight.bold)),
      const SizedBox(height:20),
      Text('Active',style:theme.textTheme.titleLarge?.copyWith(fontWeight:FontWeight.bold)),
      const SizedBox(height:8),
      Card(child:Padding(padding:const EdgeInsets.all(16),child:d.uuid==null
        ? const ListTile(contentPadding:EdgeInsets.zero,dense:true,leading:Icon(Icons.download_outlined),title:Text('No active downloads'))
        : Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[
          Row(crossAxisAlignment:CrossAxisAlignment.start,children:[Icon(Icons.downloading,color:theme.colorScheme.primary),const SizedBox(width:12),Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(d.title.isEmpty?'Download':d.title,style:theme.textTheme.titleMedium?.copyWith(fontWeight:FontWeight.bold)),Text(d.status)]))]),
          for(final file in d.files.values) FileTile(file:file,downloads:d,perform:(action)=>perform(context,action)),
          const SizedBox(height:8),
          if(!d.allDownloaded) Wrap(spacing:8,runSpacing:8,children:[OutlinedButton(onPressed:d.isSaving||d.pausing?null:()=>perform(context,d.paused?d.resume:d.pause),child:Text(d.paused?'Resume':'Pause')),TextButton(onPressed:d.isSaving||d.pausing?null:()=>perform(context,d.cancelRequest),child:const Text('Cancel'))]),
          if(d.status.startsWith('No file') || d.status.startsWith('Could not contact')) Align(alignment:Alignment.centerLeft,child:TextButton(onPressed:()=>openTelegram(context,'Mc_addonbot',d.uuid),child:const Text('Open Telegram'))),
        ]))),
      for(var i=0;i<d.queue.length;i++) ListTile(title:Text(d.queue[i]['title'] ?? 'Download'),subtitle:const Text('Waiting for previous request.'),trailing:IconButton(tooltip:'Cancel queued download',icon:const Icon(Icons.close),onPressed:()=>d.removeQueued(i))),
      const SizedBox(height:24),
      Row(children:[Expanded(child:Text('Downloaded',style:theme.textTheme.titleLarge?.copyWith(fontWeight:FontWeight.bold))),IconButton(tooltip:'Refresh files',onPressed:d.scanning?null:()=>d.refreshFiles(),icon:const Icon(Icons.refresh))]),
      if(d.scanning) const Text('Checking accessible files…'),
      if(d.scanError!=null) Text(d.scanError!),
      const SizedBox(height:8),
      if(d.visibleFiles.isEmpty) const Card(child:ListTile(leading:Icon(Icons.folder_outlined),title:Text('No saved files yet'),subtitle:Text('Saved files will appear here.'))),
      for(final item in d.visibleFiles) Card(child:ListTile(
        dense:true,contentPadding:const EdgeInsets.fromLTRB(12,0,8,0),
        leading:PackIcon(item:item),
        title:Text(displayDownloadName(item.name),maxLines:2,overflow:TextOverflow.ellipsis),subtitle:Text(d.unavailable.contains(item.uri)?'File missing or inaccessible':item.category),
        onTap:()=>perform(context,()=>d.open(item)),
        trailing:PopupMenuButton<String>(tooltip:'Manage download',onSelected:(value) async {
          if(value=='open') {await perform(context,()=>d.open(item));return;}
          if(value=='file') {await perform(context,()=>d.shareFile(item));return;}
          if(value=='share') {await shareItem(context,item.uuid,item.title,item.version);return;}
          final delete=await showDialog<bool>(context:context,builder:(context)=>AlertDialog(title:const Text('Delete file?'),content:Text('Delete ${item.name} from your device?'),actions:[TextButton(onPressed:()=>Navigator.pop(context,false),child:const Text('Cancel')),FilledButton(onPressed:()=>Navigator.pop(context,true),child:const Text('Delete'))]));
          if(delete==true && context.mounted) await perform(context,()=>d.remove(item,deleteFile:true));
        },itemBuilder:(_)=>[const PopupMenuItem(value:'open',child:Text('Open')),if(item.uuid.isNotEmpty) const PopupMenuItem(value:'share',child:Text('Share link')),const PopupMenuItem(value:'file',child:Text('Share file')),const PopupMenuItem(value:'delete',child:Text('Delete file'))]),
      )),
    ])));
  });
}

class PackIcon extends StatefulWidget {
  const PackIcon({super.key,required this.item});
  final SavedDownload item;
  @override State<PackIcon> createState()=>_PackIconState();
}
class _PackIconState extends State<PackIcon> {
  Uint8List? bytes;
  int generation=0;
  @override void initState(){super.initState();_load();}
  @override void didUpdateWidget(covariant PackIcon oldWidget){super.didUpdateWidget(oldWidget);if(oldWidget.item.uri!=widget.item.uri || oldWidget.item.name!=widget.item.name){bytes=null;_load();}}
  Future<void> _load() async {
    final current=++generation;
    try {final value=await fileChannel.invokeMethod<Uint8List>('icon',{'uri':widget.item.uri,'name':widget.item.name});if(mounted && current==generation)setState(()=>bytes=value);} catch (_) {}
  }
  @override Widget build(BuildContext context){
    final theme=Theme.of(context);
    final fallback=Icon(Icons.insert_drive_file_outlined,color:theme.colorScheme.onSecondaryContainer);
    return CircleAvatar(backgroundColor:theme.colorScheme.secondaryContainer,child:bytes==null?fallback:ClipOval(child:Image.memory(bytes!,width:40,height:40,fit:BoxFit.cover,errorBuilder:(_,__,___)=>fallback)));
  }
}

class SettingsView extends StatelessWidget {
  const SettingsView({super.key,required this.telegram,required this.mode,required this.onTheme,required this.accent,required this.onAccent,this.onManage});
  final VoidCallback? onManage;
  final TelegramClient telegram;
  final ThemeMode mode;
  final ValueChanged<ThemeMode> onTheme;
  final int accent;
  final ValueChanged<int> onAccent;
  @override
  Widget build(BuildContext context) {
    final theme=Theme.of(context);
    Widget heading(String label)=>Padding(padding:const EdgeInsets.fromLTRB(4,20,4,8),child:Text(label,style:theme.textTheme.titleMedium?.copyWith(fontWeight:FontWeight.bold)));
    return Center(child:ConstrainedBox(constraints:const BoxConstraints(maxWidth:760),child:ListView(padding:const EdgeInsets.fromLTRB(20,20,20,28),children:[
      Text('Settings',style:theme.textTheme.headlineMedium?.copyWith(fontWeight:FontWeight.bold)),
      heading('Account'),
      Card(child:ListTile(leading:AnimatedBuilder(animation:telegram,builder:(_,__)=>ProfileAvatar(telegram:telegram,radius:22)),title:const Text('Telegram account'),subtitle:const Text('Profile and sign-in'),onTap:()=>Navigator.push(context,MaterialPageRoute(builder:(_)=>AccountScreen(telegram:telegram))))),
      heading('Preferences'),
      Card(child:ListTile(leading:const Icon(Icons.palette_outlined),title:const Text('Appearance'),subtitle:const Text('Theme and accent color'),onTap:()=>Navigator.push(context,MaterialPageRoute(builder:(_)=>AppearanceScreen(mode:mode,onTheme:onTheme,accent:accent,onAccent:onAccent))))),
      Card(child:ListTile(leading:const Icon(Icons.folder_outlined),title:const Text('Downloads & storage'),subtitle:const Text('Download location'),onTap:()=>Navigator.push(context,MaterialPageRoute(builder:(_)=>StorageScreen(onManage:onManage))))),
      Card(child:ListTile(leading:const Icon(Icons.system_update_outlined),title:const Text('App updates'),subtitle:const Text('Check for updates'),onTap:()=>checkForUpdates(context))),
      heading('Support & community'),
      Card(child:Column(children:[
        ListTile(leading:const Icon(Icons.language),title:const Text('Website'),onTap:() async {try {if(await launchUrl(Uri.https('marketplacetrader.great-site.net'),mode:LaunchMode.externalApplication)) return;} catch (_) {} if(context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Could not open website.')));}),
        ListTile(leading:const Icon(Icons.campaign_outlined),title:const Text('Main channel'),onTap:()=>openTelegram(context,'Minecraft_addon_free_download')),
        ListTile(leading:const Icon(Icons.forum_outlined),title:const Text('Community support'),onTap:()=>openTelegram(context,'minecraft_group_chat_friends')),
        ListTile(leading:const Icon(Icons.support_agent_outlined),title:const Text('Contact support'),onTap:()=>openTelegram(context,'alchemisst')),
      ])),
    ])));
  }
}

class AppearanceScreen extends StatefulWidget {
  const AppearanceScreen({super.key,required this.mode,required this.onTheme,required this.accent,required this.onAccent});
  final ThemeMode mode; final ValueChanged<ThemeMode> onTheme; final int accent; final ValueChanged<int> onAccent;
  @override State<AppearanceScreen> createState()=>_AppearanceScreenState();
}
class _AppearanceScreenState extends State<AppearanceScreen> {
  late ThemeMode mode=widget.mode; late int accent=widget.accent;
  @override Widget build(BuildContext context)=>Scaffold(appBar:AppBar(title:const Text('Appearance')),body:Center(child:ConstrainedBox(constraints:const BoxConstraints(maxWidth:760),child:ListView(padding:const EdgeInsets.all(20),children:[
    Card(child:Column(children:[
      for(final option in const [(ThemeMode.system,'Use device theme'),(ThemeMode.light,'Light'),(ThemeMode.dark,'Dark')]) RadioListTile<ThemeMode>(title:Text(option.$2),value:option.$1,groupValue:mode,onChanged:(value){if(value!=null){setState(()=>mode=value);widget.onTheme(value);}}),
      Padding(padding:const EdgeInsets.all(16),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text('Accent color',style:Theme.of(context).textTheme.labelLarge),const SizedBox(height:8),Wrap(spacing:8,runSpacing:8,children:[for(final option in const [(0xff874f9e,'Purple'),(0xff426854,'Green'),(0xff536486,'Blue'),(0xff855b22,'Amber')]) ChoiceChip(label:Text(option.$2),selected:accent==option.$1,onSelected:(_){setState(()=>accent=option.$1);widget.onAccent(option.$1);})])])),
    ])),
  ]))));
}
class StorageScreen extends StatelessWidget {
  const StorageScreen({super.key,this.onManage});
  final VoidCallback? onManage;
  @override Widget build(BuildContext context)=>Scaffold(appBar:AppBar(title:const Text('Downloads & storage')),body:Center(child:ConstrainedBox(constraints:const BoxConstraints(maxWidth:760),child:ListView(padding:const EdgeInsets.all(20),children:[const Card(child:DownloadFolderTile()),if(onManage!=null) Card(child:ListTile(leading:const Icon(Icons.download_outlined),title:const Text('Manage downloaded files'),onTap:(){Navigator.pop(context);onManage!();}))]))));
}

class DownloadFolderTile extends StatefulWidget {
  const DownloadFolderTile({super.key});
  @override State<DownloadFolderTile> createState()=>_DownloadFolderTileState();
}
class _DownloadFolderTileState extends State<DownloadFolderTile> {
  String? folder;
  @override void initState(){super.initState();_load();}
  Future<void> _load() async { try { final v=await fileChannel.invokeMethod<String>('getFolder'); if(mounted)setState(()=>folder=v); } catch (_) {} }
  Future<void> _choose() async { try { final v=await fileChannel.invokeMethod<String>('chooseFolder'); if(v!=null&&mounted)setState(()=>folder=v); } catch (_) { if(mounted)ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Folder access unavailable.'))); } }
  @override Widget build(BuildContext context)=>ListTile(leading:IconButton(tooltip:'Choose folder',onPressed:_choose,icon:const Icon(Icons.folder_outlined)),title:const Text('Download location'),subtitle:Text(folder==null?'/storage/emulated/0/Download/Alium':'Custom folder selected'),onTap:_choose,trailing:folder==null?null:IconButton(tooltip:'Restore default folder',icon:const Icon(Icons.restore),onPressed:() async {await fileChannel.invokeMethod<void>('resetFolder');if(mounted)setState(()=>folder=null);}));
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
  final apiId=TextEditingController(),apiHash=TextEditingController(),input=TextEditingController(); bool busy=false; Country? country=CountryService().findByCode('US'); Timer? clock;
  @override void initState(){super.initState();clock=Timer.periodic(const Duration(seconds:1),(_){if(mounted && widget.telegram.state=='authorizationStateWaitCode')setState((){});});}
  @override void dispose(){clock?.cancel();apiId.dispose();apiHash.dispose();input.dispose();super.dispose();}
  Future<void> perform(Future<void> Function() work) async {setState(()=>busy=true);try{await work();input.clear();}catch(_){if(mounted)ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Check your details and retry.')));}finally{if(mounted)setState(()=>busy=false);}}
  @override Widget build(BuildContext context)=>Scaffold(appBar:AppBar(title:const Text('Telegram account')),body:AnimatedBuilder(animation:widget.telegram,builder:(context,_){
    final t=widget.telegram;final state=t.state; final name=[t.profile?['first_name'],t.profile?['last_name']].whereType<String>().where((s)=>s.isNotEmpty).join(' '); final usernames=t.profile?['usernames']; final active=usernames is Map ? usernames['active_usernames'] : null; final username=active is List && active.isNotEmpty ? active.first.toString() : ''; 
    return LayoutBuilder(builder:(context,box)=>SingleChildScrollView(padding:const EdgeInsets.all(20),child:Center(child:ConstrainedBox(constraints:BoxConstraints(maxWidth:760,minHeight:box.maxHeight > 40 ? box.maxHeight-40 : 0),child:Column(crossAxisAlignment:CrossAxisAlignment.stretch,mainAxisAlignment:state=='authorizationStateWaitPhoneNumber'?MainAxisAlignment.center:MainAxisAlignment.start,children:[if(t.ready) ...[Center(child:ProfileAvatar(telegram:t,radius:42)),const SizedBox(height:12),Center(child:Text(name.isEmpty?'Telegram account':name,style:Theme.of(context).textTheme.headlineSmall)),if(username.isNotEmpty) Center(child:Text('@$username')),if(t.profile?['id']!=null) ListTile(title:const Text('Telegram ID'),subtitle:Text('${t.profile!['id']}'),trailing:const Icon(Icons.copy),onTap:() async {await Clipboard.setData(ClipboardData(text:'${t.profile!['id']}'));if(context.mounted)ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('ID copied.')));}),if(t.profileInfo?['bio'] is Map && (t.profileInfo!['bio']['text']??'').toString().isNotEmpty) ListTile(title:const Text('Bio'),subtitle:Text('${t.profileInfo!['bio']['text']}')),const SizedBox(height:24)] else ...[Text('Your Telegram account',style:Theme.of(context).textTheme.headlineSmall),const SizedBox(height:10)],
      if(!t.ready) ...[const Text('Downloads use your Telegram account.'),const Text('Never share your login code.'),const SizedBox(height:24)],
      if(state=='needsCredentials') ...[const Text('Developer configuration is missing.'),const SizedBox(height:12),TextField(controller:apiId,keyboardType:TextInputType.number,decoration:const InputDecoration(labelText:'Developer API ID',border:OutlineInputBorder())),const SizedBox(height:12),TextField(controller:apiHash,obscureText:true,enableSuggestions:false,autocorrect:false,decoration:const InputDecoration(labelText:'Developer API hash',border:OutlineInputBorder())),const SizedBox(height:12),FilledButton(onPressed:busy?null:()=>perform(() async {await t.start(apiId:int.tryParse(apiId.text),apiHash:apiHash.text.trim());apiHash.clear();}),child:const Text('Continue'))],
      if(state=='authorizationStateWaitPhoneNumber') ...[Card(child:Column(children:[ListTile(title:Text(country==null?'Choose country':'${country!.flagEmoji}  ${country!.name}'),trailing:const Icon(Icons.expand_more),onTap:()=>showCountryPicker(context:context,showPhoneCode:true,onSelect:(value)=>setState(()=>country=value))),const Divider(height:1),Padding(padding:const EdgeInsets.all(12),child:Row(children:[Text(country==null?'+':'+${country!.phoneCode}',style:Theme.of(context).textTheme.titleLarge),const SizedBox(width:12),Expanded(child:TextField(controller:input,keyboardType:TextInputType.phone,decoration:const InputDecoration(labelText:'Phone number',border:InputBorder.none)))]))])),const SizedBox(height:12),const Text('Use your Telegram phone number.'),const SizedBox(height:12),FilledButton(onPressed:busy?null:()=>perform(() async {final raw=input.text.trim().replaceAll(RegExp(r'[\s()\-]'),'');if(raw.isEmpty || (!raw.startsWith('+')&&country==null)) throw TdException('Select a country');final number=raw.startsWith('+')?raw:'+${country!.phoneCode}$raw';if(!RegExp(r'^\+[1-9]\d{5,14}$').hasMatch(number)) throw TdException('Invalid phone number');await t.phone(number);}),child:const Text('Continue'))],
      if(state=='authorizationStateWaitCode') ...[const Text('Enter your Telegram login code.'),const SizedBox(height:12),TextField(controller:input,keyboardType:TextInputType.number,obscureText:true,enableSuggestions:false,autocorrect:false,decoration:const InputDecoration(labelText:'Confirmation code',border:OutlineInputBorder())),const SizedBox(height:12),FilledButton(onPressed:busy?null:()=>perform(()=>t.code(input.text.trim())),child:const Text('Sign in')),if(t.canResendCode) TextButton(onPressed:busy || (t.resendAt?.isAfter(DateTime.now()) ?? false)?null:()=>perform(t.resendCode),child:Text((t.resendAt?.isAfter(DateTime.now()) ?? false)?'Resend in ${(t.resendAt!.difference(DateTime.now()).inSeconds + 1)}s':'Resend code'))],
      if(state=='authorizationStateWaitPassword') ...[Text(t.hint.isEmpty?'Enter your two-step password.':'Two-step verification hint: ${t.hint}'),const SizedBox(height:12),TextField(controller:input,obscureText:true,enableSuggestions:false,autocorrect:false,decoration:const InputDecoration(labelText:'Two-step verification password',border:OutlineInputBorder())),const SizedBox(height:12),FilledButton(onPressed:busy?null:()=>perform(()=>t.password(input.text)),child:const Text('Continue'))],
      if(state=='authorizationStateWaitEmailAddress') ...[const Text('Telegram requires your login email.'),const SizedBox(height:12),TextField(controller:input,keyboardType:TextInputType.emailAddress,decoration:const InputDecoration(labelText:'Email address',border:OutlineInputBorder())),const SizedBox(height:12),FilledButton(onPressed:busy?null:()=>perform(()=>t.email(input.text.trim())),child:const Text('Continue'))],
      if(state=='authorizationStateWaitEmailCode') ...[const Text('Enter your email login code.'),const SizedBox(height:12),TextField(controller:input,obscureText:true,keyboardType:TextInputType.number,decoration:const InputDecoration(labelText:'Email code',border:OutlineInputBorder())),const SizedBox(height:12),FilledButton(onPressed:busy?null:()=>perform(()=>t.emailCode(input.text.trim())),child:const Text('Verify code'))],
      if(t.ready) ...[const Text('Signed in on this device.'),const SizedBox(height:12),OutlinedButton(onPressed:busy?null:() async {final yes=await showDialog<bool>(context:context,builder:(context)=>AlertDialog(title:const Text('Sign out?'),content:const Text('Saved downloads remain on device.'),actions:[TextButton(onPressed:()=>Navigator.pop(context,false),child:const Text('Cancel')),FilledButton(onPressed:()=>Navigator.pop(context,true),child:const Text('Sign out'))]));if(yes==true&&mounted)perform(() async {await t.logout();});},child:const Text('Sign out'))],
      if(state=='authorizationStateClosed') const Text('Reopen Alium to sign in.'),
      if(state=='failed') Text(t.failure??'Telegram is unavailable on this device.'),
      if(!['needsCredentials','authorizationStateWaitPhoneNumber','authorizationStateWaitCode','authorizationStateWaitPassword','authorizationStateWaitEmailAddress','authorizationStateWaitEmailCode','authorizationStateReady','authorizationStateClosed','failed'].contains(state)) const Text('Connecting to Telegram…'),
    ])))));
  }));
}

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'bot_download.dart';
import 'catalog.dart';
import 'td_client.dart';

void main() => runApp(const MarketplaceApp());

class MarketplaceApp extends StatefulWidget {
  const MarketplaceApp({super.key});
  @override State<MarketplaceApp> createState() => _MarketplaceAppState();
}
class _MarketplaceAppState extends State<MarketplaceApp> {
  ThemeMode mode = ThemeMode.system;
  @override Widget build(BuildContext context) {
    ThemeData theme(Brightness brightness) {
      final scheme = ColorScheme.fromSeed(seedColor: const Color(0xffc88828), brightness: brightness);
      return ThemeData(useMaterial3:true, colorScheme:scheme, scaffoldBackgroundColor:scheme.surface,
        appBarTheme: AppBarTheme(backgroundColor:scheme.surface),
        cardTheme: CardThemeData(color:scheme.surfaceContainerLow, elevation:0, shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(22),side:BorderSide(color:scheme.outlineVariant))),
        filledButtonTheme: FilledButtonThemeData(style:FilledButton.styleFrom(minimumSize:const Size(48,48))),
        outlinedButtonTheme: OutlinedButtonThemeData(style:OutlinedButton.styleFrom(minimumSize:const Size(48,48))));
    }
    return MaterialApp(title:'Marketplace Trader', debugShowCheckedModeBanner:false,
      theme:theme(Brightness.light), darkTheme:theme(Brightness.dark), themeMode:mode,
      home:CatalogScreen(mode:mode,onTheme:(value)=>setState(()=>mode=value)));
  }
}

class CatalogScreen extends StatefulWidget {
  const CatalogScreen({super.key, required this.mode, required this.onTheme});
  final ThemeMode mode; final ValueChanged<ThemeMode> onTheme;
  @override State<CatalogScreen> createState()=>_CatalogScreenState();
}
class _CatalogScreenState extends State<CatalogScreen> {
  final api=CatalogApi(); final telegram=TelegramClient();
  late final BotDownload downloads=BotDownload(telegram);
  final search=TextEditingController();
  String query='',category='',updated='',sort='updated_desc'; int page=1;
  late Future<CatalogPage> result;
  @override void initState(){super.initState(); result=_load(); telegram.start();}
  Future<CatalogPage> _load()=>api.list(query:query,category:category,updated:updated,sort:sort,page:page);
  void reload(){setState(()=>result=_load());}
  @override void dispose(){api.dispose(); downloads.dispose(); telegram.dispose();search.dispose();super.dispose();}
  Future<void> openLink(String url) async {
    final uri=Uri.parse(url);
    if (!await launchUrl(uri,mode:LaunchMode.externalApplication) && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Could not open this link.')));
    }
  }
  Future<void> filters() async {
    var c=category,u=updated,s=sort;
    final applied=await showModalBottomSheet<bool>(context:context,isScrollControlled:true,showDragHandle:true,builder:(context)=>StatefulBuilder(builder:(context,setSheet)=>SafeArea(child:Padding(
      padding:EdgeInsets.fromLTRB(20,8,20,24+MediaQuery.viewInsetsOf(context).bottom),child:Column(mainAxisSize:MainAxisSize.min,crossAxisAlignment:CrossAxisAlignment.stretch,children:[
        Text('Filters',style:Theme.of(context).textTheme.headlineSmall),const SizedBox(height:20),
        DropdownButtonFormField<String>(initialValue:c,decoration:const InputDecoration(labelText:'Type',border:OutlineInputBorder()),items:const [
          DropdownMenuItem(value:'',child:Text('All categories')),DropdownMenuItem(value:'ADD-ON',child:Text('Add-on')),DropdownMenuItem(value:'TEXTURE PACK',child:Text('Texture pack')),DropdownMenuItem(value:'SKIN PACK',child:Text('Skin pack')),DropdownMenuItem(value:'WORLD',child:Text('World')),DropdownMenuItem(value:'MASHUP PACK',child:Text('Mashup pack')),DropdownMenuItem(value:'TEMPLATE',child:Text('Template')),DropdownMenuItem(value:'APPLICATION',child:Text('Application'))],onChanged:(v)=>setSheet(()=>c=v??'')),
        const SizedBox(height:14),DropdownButtonFormField<String>(initialValue:u,decoration:const InputDecoration(labelText:'Last updated',border:OutlineInputBorder()),items:const [DropdownMenuItem(value:'',child:Text('All dates')),DropdownMenuItem(value:'7d',child:Text('Past 7 days')),DropdownMenuItem(value:'30d',child:Text('Past 30 days')),DropdownMenuItem(value:'1y',child:Text('Past year'))],onChanged:(v)=>setSheet(()=>u=v??'')),
        const SizedBox(height:14),DropdownButtonFormField<String>(initialValue:s,decoration:const InputDecoration(labelText:'Sorting',border:OutlineInputBorder()),items:const [DropdownMenuItem(value:'updated_desc',child:Text('Newest updated')),DropdownMenuItem(value:'updated_asc',child:Text('Oldest updated')),DropdownMenuItem(value:'relevance',child:Text('Relevance'))],onChanged:(v)=>setSheet(()=>s=v??'updated_desc')),
        const SizedBox(height:18),Wrap(spacing:8,runSpacing:8,alignment:WrapAlignment.end,children:[TextButton(onPressed:()=>setSheet((){c='';u='';s='updated_desc';}),child:const Text('Clear')),TextButton(onPressed:()=>Navigator.pop(context,false),child:const Text('Cancel')),FilledButton(onPressed:()=>Navigator.pop(context,true),child:const Text('Apply filters'))])])))));
    if(applied==true){category=c;updated=u;sort=s;page=1;reload();}
  }
  @override Widget build(BuildContext context){
    return Scaffold(appBar:AppBar(title:Row(children:[ClipRRect(borderRadius:BorderRadius.circular(10),child:Image.asset('assets/logo.jpg',width:36,height:36,fit:BoxFit.cover)),const SizedBox(width:10),const Expanded(child:Text('Marketplace Trader',overflow:TextOverflow.ellipsis))]),actions:[IconButton(tooltip:'Telegram account',onPressed:()=>Navigator.push(context,MaterialPageRoute(builder:(_)=>AccountScreen(telegram:telegram))),icon:const Icon(Icons.account_circle_outlined)),PopupMenuButton<ThemeMode>(tooltip:'Theme',initialValue:widget.mode,onSelected:widget.onTheme,itemBuilder:(_)=>const [PopupMenuItem(value:ThemeMode.system,child:Text('System theme')),PopupMenuItem(value:ThemeMode.light,child:Text('Light theme')),PopupMenuItem(value:ThemeMode.dark,child:Text('Dark theme'))])]),
      body:SafeArea(child:Column(children:[Padding(padding:const EdgeInsets.fromLTRB(16,8,16,12),child:Row(children:[Expanded(child:TextField(controller:search,decoration:const InputDecoration(labelText:'Search add-ons or creators',border:OutlineInputBorder(),isDense:true),onSubmitted:(v){query=v.trim();page=1;reload();})),const SizedBox(width:4),IconButton(tooltip:'Search',onPressed:(){query=search.text.trim();page=1;reload();},icon:const Icon(Icons.search)),IconButton(tooltip:'Filters',onPressed:filters,icon:const Icon(Icons.tune))])),
        Expanded(child:FutureBuilder<CatalogPage>(future:result,builder:(context,snapshot){
          if(snapshot.connectionState!=ConnectionState.done)return const Center(child:CircularProgressIndicator());
          if(snapshot.hasError)return Center(child:Padding(padding:const EdgeInsets.all(24),child:Column(mainAxisSize:MainAxisSize.min,children:[const Text('Could not load the catalog. Check your connection.'),const SizedBox(height:12),FilledButton(onPressed:reload,child:const Text('Try again'))])));
          final data=snapshot.data!;
          if(data.items.isEmpty)return Center(child:Padding(padding:const EdgeInsets.all(24),child:Column(mainAxisSize:MainAxisSize.min,children:[Text(data.total>0?'Page not available':'No matches found',style:Theme.of(context).textTheme.headlineSmall),const SizedBox(height:8),const Text('Try another search or filter.',textAlign:TextAlign.center),const SizedBox(height:16),if(query.isNotEmpty) FilledButton(onPressed:()=>openLink('https://t.me/MARKETPLACE_TRADER_HELPER_BOT?start=suggest'),child:const Text('Request in Telegram'))])));
          return LayoutBuilder(builder:(context,box){final columns=box.maxWidth>=1024?4:box.maxWidth>=900?3:box.maxWidth>=600?2:1;return CustomScrollView(slivers:[SliverPadding(padding:const EdgeInsets.all(16),sliver:SliverGrid(delegate:SliverChildBuilderDelegate((context,index){final item=data.items[index];return CatalogCard(item:item,onTap:()=>Navigator.push(context,MaterialPageRoute(builder:(_)=>DetailScreen(item:item,telegram:telegram,downloads:downloads))));},childCount:data.items.length),gridDelegate:SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount:columns,crossAxisSpacing:12,mainAxisSpacing:12,mainAxisExtent:columns==1?330:315))),SliverToBoxAdapter(child:Padding(padding:const EdgeInsets.fromLTRB(16,12,16,24),child:Row(mainAxisAlignment:MainAxisAlignment.center,children:[OutlinedButton(onPressed:page>1?(){page--;reload();}:null,child:const Text('Previous')),Padding(padding:const EdgeInsets.symmetric(horizontal:16),child:Text('Page $page')),OutlinedButton(onPressed:page*24<data.total?(){page++;reload();}:null,child:const Text('Next'))])))]);});
        }))])));
  }
}

class CatalogCard extends StatelessWidget {
  const CatalogCard({super.key,required this.item,required this.onTap}); final CatalogItem item; final VoidCallback onTap;
  @override Widget build(BuildContext context)=>Card(clipBehavior:Clip.antiAlias,child:InkWell(onTap:onTap,child:Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[Expanded(child:CatalogImage(url:item.thumbnail)),Padding(padding:const EdgeInsets.all(14),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(item.title,maxLines:2,overflow:TextOverflow.ellipsis,style:Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight:FontWeight.w700)),const SizedBox(height:4),Text(item.creator.isEmpty?'Creator not listed':item.creator,maxLines:1,overflow:TextOverflow.ellipsis),const SizedBox(height:6),Text(item.category,maxLines:1,overflow:TextOverflow.ellipsis,style:Theme.of(context).textTheme.labelMedium)]))])));
}
class CatalogImage extends StatelessWidget {
  const CatalogImage({super.key,required this.url});final String url;
  @override Widget build(BuildContext context){final uri=Uri.tryParse(url);if(uri==null||uri.scheme!='https'||uri.host.isEmpty)return ColoredBox(color:Theme.of(context).colorScheme.surfaceContainerHighest,child:const Center(child:Text('Image unavailable')));return Image.network(url,fit:BoxFit.cover,errorBuilder:(_,error,stack)=>ColoredBox(color:Theme.of(context).colorScheme.surfaceContainerHighest,child:const Center(child:Text('Image unavailable'))));}
}

class DetailScreen extends StatelessWidget {
  const DetailScreen({super.key,required this.item,required this.telegram,required this.downloads});final CatalogItem item;final TelegramClient telegram;final BotDownload downloads;
  @override Widget build(BuildContext context)=>Scaffold(appBar:AppBar(title:const Text('Add-on details')),body:ListView(padding:const EdgeInsets.all(18),children:[ClipRRect(borderRadius:BorderRadius.circular(20),child:AspectRatio(aspectRatio:16/9,child:CatalogImage(url:item.thumbnail))),const SizedBox(height:18),Text(item.title,style:Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight:FontWeight.bold)),const SizedBox(height:8),Text(item.creator.isEmpty?'Creator not listed':item.creator),const SizedBox(height:8),Text(item.category),if(item.version.isNotEmpty)Text('Version: ${item.version}'),const SizedBox(height:8),const Text('Marketplace price: Not available'),const SizedBox(height:20),FilledButton.icon(onPressed:()=>Navigator.push(context,MaterialPageRoute(builder:(_)=>DownloadScreen(item:item,telegram:telegram,downloads:downloads))),icon:const Icon(Icons.download_outlined),label:const Text('Download')),const SizedBox(height:8),OutlinedButton(onPressed:() async {await launchUrl(Uri.parse('https://t.me/Mc_addonbot?start=${Uri.encodeComponent(item.uuid)}'),mode:LaunchMode.externalApplication);},child:const Text('Open in Telegram')),const SizedBox(height:20),const Text('Minecraft Bedrock community catalog. Not affiliated with Mojang or Microsoft.') ]));
}

class AccountScreen extends StatefulWidget {
  const AccountScreen({super.key,required this.telegram});final TelegramClient telegram;
  @override State<AccountScreen> createState()=>_AccountScreenState();
}
class _AccountScreenState extends State<AccountScreen> {
  final apiId=TextEditingController(),apiHash=TextEditingController(),input=TextEditingController();bool busy=false;
  @override void dispose(){apiId.dispose();apiHash.dispose();input.dispose();super.dispose();}
  Future<void> perform(Future<void> Function() work) async {setState(()=>busy=true);try{await work();input.clear();}catch(_){if(mounted)ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Telegram could not complete that step. Check your details and try again.')));}finally{if(mounted)setState(()=>busy=false);}}
  @override Widget build(BuildContext context)=>Scaffold(appBar:AppBar(title:const Text('Telegram account')),body:AnimatedBuilder(animation:widget.telegram,builder:(context,_){
    final t=widget.telegram; final state=t.state;
    return ListView(padding:const EdgeInsets.all(20),children:[Text('Your Telegram account',style:Theme.of(context).textTheme.headlineSmall),const SizedBox(height:10),const Text('This app uses TDLib to communicate with the file bot as your account when you request a download. Your session is stored on this device. Never share login codes or passwords with anyone.'),const SizedBox(height:24),
      if(state=='needsCredentials') ...[const Text('Developer setup: enter the Telegram application API ID and API hash for this app. These are not your Telegram login code or password.'),const SizedBox(height:12),TextField(controller:apiId,keyboardType:TextInputType.number,decoration:const InputDecoration(labelText:'Telegram API ID',border:OutlineInputBorder())),const SizedBox(height:12),TextField(controller:apiHash,obscureText:true,enableSuggestions:false,autocorrect:false,decoration:const InputDecoration(labelText:'Telegram API hash',border:OutlineInputBorder())),const SizedBox(height:12),FilledButton(onPressed:busy?null:()=>perform(() async {await t.start(apiId:int.tryParse(apiId.text),apiHash:apiHash.text.trim());apiHash.clear();}),child:const Text('Continue'))],
      if(state=='authorizationStateWaitPhoneNumber') ...[const Text('Enter the phone number for your own Telegram account, including the country code.'),const SizedBox(height:12),TextField(controller:input,keyboardType:TextInputType.phone,decoration:const InputDecoration(labelText:'Phone number',border:OutlineInputBorder())),const SizedBox(height:12),FilledButton(onPressed:busy?null:()=>perform(()=>t.phone(input.text.trim())),child:const Text('Continue'))],
      if(state=='authorizationStateWaitCode') ...[const Text('Enter the login code Telegram sent you.'),const SizedBox(height:12),TextField(controller:input,keyboardType:TextInputType.number,obscureText:true,enableSuggestions:false,autocorrect:false,decoration:const InputDecoration(labelText:'Telegram login code',border:OutlineInputBorder())),const SizedBox(height:12),FilledButton(onPressed:busy?null:()=>perform(()=>t.code(input.text.trim())),child:const Text('Verify code'))],
      if(state=='authorizationStateWaitPassword') ...[Text(t.hint.isEmpty?'Enter your Telegram two-step verification password.':'Two-step verification hint: ${t.hint}'),const SizedBox(height:12),TextField(controller:input,obscureText:true,enableSuggestions:false,autocorrect:false,decoration:const InputDecoration(labelText:'Two-step verification password',border:OutlineInputBorder())),const SizedBox(height:12),FilledButton(onPressed:busy?null:()=>perform(()=>t.password(input.text)),child:const Text('Continue'))],
      if(state=='authorizationStateWaitEmailAddress') ...[const Text('Telegram requires a login email address.'),const SizedBox(height:12),TextField(controller:input,keyboardType:TextInputType.emailAddress,decoration:const InputDecoration(labelText:'Email address',border:OutlineInputBorder())),const SizedBox(height:12),FilledButton(onPressed:busy?null:()=>perform(()=>t.email(input.text.trim())),child:const Text('Continue'))],
      if(state=='authorizationStateWaitEmailCode') ...[const Text('Enter the email code Telegram sent you.'),const SizedBox(height:12),TextField(controller:input,obscureText:true,keyboardType:TextInputType.number,decoration:const InputDecoration(labelText:'Email code',border:OutlineInputBorder())),const SizedBox(height:12),FilledButton(onPressed:busy?null:()=>perform(()=>t.emailCode(input.text.trim())),child:const Text('Verify code'))],
      if(state=='authorizationStateReady') ...[const Text('Signed in on this device.'),const SizedBox(height:12),OutlinedButton(onPressed:busy?null:()=>perform(t.logout),child:const Text('Sign out'))],
      if(state=='authorizationStateClosed') const Text('Signed out. Close and reopen the app to sign in again.'),
      if(state=='failed') Text(t.failure??'Telegram is unavailable on this device.'),
      if(!['needsCredentials','authorizationStateWaitPhoneNumber','authorizationStateWaitCode','authorizationStateWaitPassword','authorizationStateWaitEmailAddress','authorizationStateWaitEmailCode','authorizationStateReady','authorizationStateClosed','failed'].contains(state)) const Text('Connecting to Telegram… If a different login method is required, open Telegram and try again.'),
    ]);
  }));
}

class DownloadScreen extends StatefulWidget {
  const DownloadScreen({super.key,required this.item,required this.telegram,required this.downloads});final CatalogItem item;final TelegramClient telegram;final BotDownload downloads;
  @override State<DownloadScreen> createState()=>_DownloadScreenState();
}
class _DownloadScreenState extends State<DownloadScreen> {
  bool busy=false;
  Future<void> perform(Future<void> Function() action) async {setState(()=>busy=true);try{await action();}catch(_){if(mounted)ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Unable to complete that action. Try again or open Telegram.')));}finally{if(mounted)setState(()=>busy=false);}}
  @override Widget build(BuildContext context)=>Scaffold(appBar:AppBar(title:const Text('Download')),body:AnimatedBuilder(animation:Listenable.merge([widget.telegram,widget.downloads]),builder:(context,_){final d=widget.downloads;final t=widget.telegram;return ListView(padding:const EdgeInsets.all(20),children:[Text(widget.item.title,style:Theme.of(context).textTheme.headlineSmall),const SizedBox(height:8),const Text('The app will request this item from the file bot using your Telegram account.'),const SizedBox(height:16),
    if(!t.ready) ...[const Text('Sign in to your own Telegram account before requesting a file.'),const SizedBox(height:10),FilledButton(onPressed:()=>Navigator.push(context,MaterialPageRoute(builder:(_)=>AccountScreen(telegram:t))),child:const Text('Sign in to Telegram'))],
    if(t.ready&&d.uuid==null) FilledButton(onPressed:busy?null:()=>perform(()=>d.request(widget.item.uuid)),child:const Text('Request file')),
    if(d.uuid!=null&&d.uuid!=widget.item.uuid) ...[const Text('Another bot request is open. Finish it before requesting another item.'),OutlinedButton(onPressed:d.finish,child:const Text('Close previous request'))],
    if(d.uuid==widget.item.uuid) ...[Text(d.status),const SizedBox(height:12),if(d.files.isNotEmpty) const Text('The bot does not identify which request a file belongs to. Check the file name before downloading.'),for(final file in d.files.values) Card(child:Padding(padding:const EdgeInsets.all(14),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(file.name,style:Theme.of(context).textTheme.titleMedium),if(file.bytes>0)Text('${(file.bytes/1048576).toStringAsFixed(1)} MB'),if(file.downloaded>0&&!file.complete)Text('Downloaded ${(file.downloaded/1048576).toStringAsFixed(1)} MB'),const SizedBox(height:8),if(!file.complete)FilledButton(onPressed:busy?null:()=>perform(()=>d.download(file.id)),child:const Text('Download file')) else FilledButton(onPressed:busy?null:()=>perform(() async {final saved=await d.save(file.id);if(mounted&&saved)ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('File saved.')));}),child:const Text('Save file'))]))),const SizedBox(height:8),OutlinedButton(onPressed:d.finish,child:const Text('Finish request'))],
    const SizedBox(height:12),OutlinedButton(onPressed:() async {await launchUrl(Uri.parse('https://t.me/Mc_addonbot?start=${Uri.encodeComponent(widget.item.uuid)}'),mode:LaunchMode.externalApplication);},child:const Text('Open bot in Telegram')),
    const SizedBox(height:16),const Text('If the bot asks you to join channels or start the bot, complete that in Telegram, then return and try again.'),
  ]);}));
}

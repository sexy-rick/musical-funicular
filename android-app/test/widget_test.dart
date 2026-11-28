import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:marketplace_trader/main.dart';
import 'package:marketplace_trader/catalog.dart';
import 'package:marketplace_trader/bot_download.dart';
import 'package:marketplace_trader/td_client.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));
  testWidgets('missing thumbnail has a readable fallback', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: Scaffold(body: CatalogImage(url: ''))));
    expect(find.text('Image unavailable'), findsOneWidget);
  });
  testWidgets('catalog card is bounded with large text on a narrow screen', (tester) async {
    tester.view.physicalSize = const Size(320, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    const item = CatalogItem(uuid:'123',title:'A very long catalog title that should stay inside its card',creator:'Creator',category:'ADD-ON');
    await tester.pumpWidget(MaterialApp(home:MediaQuery(data:const MediaQueryData(size:Size(320,800),textScaler:TextScaler.linear(2)),child:Scaffold(body:Align(alignment:Alignment.topCenter,child:SingleChildScrollView(child:SizedBox(width:288,child:CatalogCard(item:item,onTap:(){}))))))));
    expect(tester.takeException(), isNull);
    final image = tester.getRect(find.byType(CatalogImage));
    expect(image.left,greaterThanOrEqualTo(0));
    expect(image.right,lessThanOrEqualTo(320));
  });
  testWidgets('catalog actions match website order and stay independent', (tester) async {
    tester.view.physicalSize = const Size(320, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    var detailTaps=0, categoryTaps=0, shareTaps=0, downloadTaps=0;
    const item=CatalogItem(uuid:'123',title:'Example',creator:'Creator',category:'ADD-ON');
    await tester.pumpWidget(MaterialApp(home:Scaffold(body:Align(alignment:Alignment.topCenter,child:SizedBox(width:288,height:350,child:CatalogCard(
      item:item,onTap:()=>detailTaps++,onCategory:()=>categoryTaps++,onShare:()=>shareTaps++,onDownload:()=>downloadTaps++,
    ))))));
    final category=tester.getRect(find.text('add-on'));
    final share=tester.getRect(find.byTooltip('Share'));
    final download=tester.getRect(find.text('Download'));
    expect(category.center.dy, closeTo(share.center.dy, 8));
    expect(category.right, lessThanOrEqualTo(share.left));
    expect(share.right, lessThanOrEqualTo(download.left));
    await tester.tap(find.text('add-on'));
    await tester.tap(find.byTooltip('Share'));
    await tester.tap(find.text('Download'));
    expect(categoryTaps,1);
    expect(shareTaps,1);
    expect(downloadTaps,1);
    expect(detailTaps,0);
    await tester.tap(find.text('Example'));
    expect(detailTaps,1);
    expect(tester.takeException(), isNull);
  });
  testWidgets('large text moves category above action buttons', (tester) async {
    tester.view.physicalSize = const Size(320, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    const item=CatalogItem(uuid:'123',title:'Example',creator:'Creator',category:'TEXTURE PACK');
    await tester.pumpWidget(MaterialApp(home:MediaQuery(data:const MediaQueryData(size:Size(320,800),textScaler:TextScaler.linear(2)),child:Scaffold(body:Align(alignment:Alignment.topCenter,child:SizedBox(width:288,height:530,child:CatalogCard(
      item:item,onTap:(){},onCategory:(){},onShare:(){},onDownload:(){},
    )))))));
    expect(tester.getRect(find.text('texture pack')).bottom, lessThanOrEqualTo(tester.getRect(find.byTooltip('Share')).top));
    expect(tester.takeException(), isNull);
  });
  testWidgets('downloads show honest empty and active states', (tester) async {
    final telegram = TelegramClient();
    final downloads = BotDownload(telegram);
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: DownloadsView(downloads: downloads))));
    await tester.pump();
    expect(find.text('No active downloads'), findsOneWidget);
    expect(find.text('No saved files yet'), findsOneWidget);
    downloads.uuid = '12345678-1234-1234-1234-123456789abc';
    downloads.title = 'Example pack';
    downloads.status = 'Waiting for the bot…';
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: DownloadsView(downloads: downloads))));
    await tester.pump();
    expect(find.text('Example pack'), findsOneWidget);
    expect(find.text('Waiting for the bot…'), findsOneWidget);
    expect(find.text('Pause'), findsOneWidget);
    await tester.pumpWidget(const SizedBox.shrink());
    downloads.dispose();
    telegram.dispose();
  });
  testWidgets('account keeps profile details without profile music', (tester) async {
    final telegram = TelegramClient();
    telegram.state = 'authorizationStateReady';
    telegram.profile = {'first_name':'Ari','id':42};
    telegram.profileInfo = {'bio':{'text':'Hello'},'first_profile_audio':{'title':'Hidden music'}};
    await tester.pumpWidget(MaterialApp(home: AccountScreen(telegram: telegram)));
    expect(find.text('Ari'), findsOneWidget);
    expect(find.text('Telegram ID'), findsOneWidget);
    expect(find.text('Hello'), findsOneWidget);
    expect(find.text('Hidden music'), findsNothing);
    await tester.pumpWidget(const SizedBox.shrink());
    telegram.dispose();
  });
  testWidgets('settings use grouped controls at narrow width', (tester) async {
    tester.view.physicalSize = const Size(320, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final telegram = TelegramClient();
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: SettingsView(
      telegram: telegram, mode: ThemeMode.system, onTheme: (_) {},
      accent: 0xff874f9e, onAccent: (_) {},
    ))));
    await tester.pump();
    expect(find.text('Telegram account'), findsOneWidget);
    expect(find.text('Appearance'), findsOneWidget);
    expect(find.text('Use device theme'), findsNothing);
    await tester.tap(find.text('Appearance'));
    await tester.pumpAndSettle();
    expect(find.text('Use device theme'), findsOneWidget);
    expect(find.text('About'), findsNothing);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
    telegram.dispose();
  });

  testWidgets('detail actions differ for signed-in and signed-out users', (tester) async {
    final telegram=TelegramClient(); final downloads=BotDownload(telegram);
    const item=CatalogItem(uuid:'12345678-1234-1234-1234-123456789abc',title:'Example');
    await tester.pumpWidget(MaterialApp(home:Scaffold(body:DownloadPanel(item:item,telegram:telegram,downloads:downloads))));
    expect(find.text('Open in Telegram'),findsOneWidget);
    expect(find.text('Download in Alium'),findsOneWidget);
    expect(find.text('Share'),findsNothing);
    telegram.state='authorizationStateReady';
    await tester.pumpWidget(MaterialApp(home:Scaffold(body:DownloadPanel(item:item,telegram:telegram,downloads:downloads))));
    await tester.pump();
    expect(find.text('Download'),findsOneWidget);
    expect(find.text('Share'),findsOneWidget);
    expect(find.text('Open in Telegram'),findsNothing);
    await tester.pumpWidget(const SizedBox.shrink()); downloads.dispose(); telegram.dispose();
  });

}

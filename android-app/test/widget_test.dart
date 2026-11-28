import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:marketplace_trader/main.dart';
import 'package:marketplace_trader/catalog.dart';

void main() {
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
    await tester.pumpWidget(MaterialApp(home:MediaQuery(data:const MediaQueryData(size:Size(320,800),textScaler:TextScaler.linear(2)),child:Scaffold(body:Align(alignment:Alignment.topCenter,child:SizedBox(width:288,height:380,child:CatalogCard(item:item,onTap:(){})))))));
    expect(tester.takeException(), isNull);
    final image = tester.getRect(find.byType(CatalogImage));
    expect(image.left,greaterThanOrEqualTo(0));
    expect(image.right,lessThanOrEqualTo(320));
  });
}

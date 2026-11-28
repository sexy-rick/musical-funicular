import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:marketplace_trader/main.dart';

void main() {
  testWidgets('missing thumbnail has a readable fallback', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: Scaffold(body: CatalogImage(url: ''))));
    expect(find.text('Image unavailable'), findsOneWidget);
  });
}

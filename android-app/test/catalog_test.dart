import 'package:flutter_test/flutter_test.dart';
import 'package:marketplace_trader/catalog.dart';
void main() {
  test('catalog maps optional fields safely', () {
    final item = CatalogItem.fromJson({'uuid':'a', 'title':'Example', 'creator':null});
    expect(item.title, 'Example'); expect(item.creator, ''); expect(item.thumbnail, '');
  });
}

import 'dart:convert';
import 'package:http/http.dart' as http;

class CatalogItem {
  const CatalogItem({required this.uuid, required this.title, this.creator = '', this.category = '', this.thumbnail = '', this.version = '', this.marketplaceUrl = ''});
  final String uuid, title, creator, category, thumbnail, version, marketplaceUrl;
  factory CatalogItem.fromJson(Map<String, dynamic> j) => CatalogItem(
    uuid: (j['uuid'] ?? '').toString(), title: (j['title'] ?? '').toString(),
    creator: (j['creator'] ?? '').toString(), category: (j['category'] ?? '').toString(),
    thumbnail: (j['thumbnail_url'] ?? '').toString(), version: (j['version'] ?? '').toString(),
    marketplaceUrl: (j['marketplace_url'] ?? '').toString());
}

class CatalogPage {
  const CatalogPage(this.items, this.total);
  final List<CatalogItem> items;
  final int total;
}

class CatalogApi {
  CatalogApi({http.Client? client}) : _client = client ?? http.Client();
  final http.Client _client;
  static const base = 'mc-catalog-1474006216.aman-nsipai.workers.dev';
  Future<CatalogPage> list({String query = '', String category = '', String updated = '', String sort = 'updated_desc', int page = 1}) async {
    final params = <String, String>{'page': '$page', 'sort': sort};
    if (query.trim().isNotEmpty) params['q'] = query.trim();
    if (category.isNotEmpty) params['cat'] = category;
    if (updated.isNotEmpty) params['updated'] = updated;
    final response = await _client.get(Uri.https(base, '/addons', params)).timeout(const Duration(seconds: 15));
    if (response.statusCode != 200) throw Exception('Catalog is unavailable (${response.statusCode}).');
    final data = jsonDecode(response.body);
    if (data is! Map || data['ok'] != true || data['items'] is! List || data['total'] is! num) throw const FormatException('Invalid catalog response');
    final items = (data['items'] as List).whereType<Map<String, dynamic>>().map(CatalogItem.fromJson)
      .where((item) => RegExp(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', caseSensitive: false).hasMatch(item.uuid) && item.title.isNotEmpty).toList();
    return CatalogPage(items, (data['total'] as num).toInt());
  }
  void dispose() => _client.close();
}

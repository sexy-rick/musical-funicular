import 'package:flutter_test/flutter_test.dart';
import 'package:marketplace_trader/bot_download.dart';

void main() {
  test('categories are allowlisted instead of used as file paths', () {
    expect(categoryFolder('ADD-ON'), 'Add-ons');
    expect(categoryFolder('MASHUP PACK'), 'Mash-up packs');
    expect(categoryFolder('../private'), 'Other');
  });
  test('file updates retain identity and report progress', () {
    final f = BotFile(id:1,name:'pack.mcpack').withUpdate({'size':100,'local':{'downloaded_size':25,'is_downloading_completed':false}});
    expect(f.name,'pack.mcpack'); expect(f.downloaded,25); expect(f.complete,isFalse);
  });
}

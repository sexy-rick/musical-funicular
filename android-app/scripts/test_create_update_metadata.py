import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import create_update_metadata as updater


class MetadataTests(unittest.TestCase):
    def test_builds_metadata_from_verified_apk(self):
        with tempfile.TemporaryDirectory() as directory:
            apk = Path(directory) / 'app-release.apk'
            baseline = Path(directory) / 'baseline.apk'
            apk.write_bytes(b'new apk')
            baseline.write_bytes(b'old apk')
            def manifest(path, field):
                return {'application-id': updater.PACKAGE, 'version-code': '3' if path == apk else '2',
                        'min-sdk': '23', 'version-name': '0.1.2'}[field]
            with patch.object(updater, 'manifest', side_effect=manifest), patch.object(updater, 'certs', return_value=['a' * 64]):
                result = updater.create(apk, baseline, 'v0.1.2', 'Fixes')
                self.assertEqual(result['versionCode'], 3)
                self.assertEqual(result['size'], 7)
                self.assertTrue(result['apkUrl'].endswith('/v0.1.2/app-release.apk'))
                self.assertEqual(len(result['sha256']), 64)
                with self.assertRaises(ValueError):
                    updater.create(apk, baseline, '../unsafe', 'Fixes')
                with self.assertRaises(ValueError):
                    updater.create(apk, baseline, 'v0.1.2', 'x' * 8001)
            with patch.object(updater, 'manifest', side_effect=manifest), patch.object(updater, 'certs', side_effect=[['a'], ['b']]):
                with self.assertRaises(ValueError):
                    updater.create(apk, baseline, 'v0.1.2', 'Fixes')


if __name__ == '__main__':
    unittest.main()

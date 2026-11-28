#!/usr/bin/env python3
"""Create Alium update metadata from two verified signed release APKs.

Run locally with Android SDK apkanalyzer/apksigner on PATH. Do not upload the
baseline or any private signing material to the public release repository.
"""
import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path
from urllib.parse import quote

PACKAGE = 'alium.amberlyst.com'
MAX_SIZE = 250 * 1024 * 1024


def command(*args):
    return subprocess.run(args, check=True, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout.strip()


def manifest(apk, field):
    return command('apkanalyzer', 'manifest', field, str(apk))


def certs(apk):
    output = command('apksigner', 'verify', '--verbose', '--print-certs', str(apk))
    values = re.findall(r'^(?:Signer #\d+|V[1-4] Signer(?: #\d+)?):? certificate SHA-256 digest:\s*([0-9a-fA-F]{64})\s*$', output, re.MULTILINE)
    if not values:
        raise ValueError('Could not read the verified signing certificate')
    return sorted({v.lower() for v in values})


def create(apk, baseline, tag, notes):
    if apk.name != 'app-release.apk' or not apk.is_file() or not baseline.is_file():
        raise ValueError('Supply the signed app-release.apk and installed baseline APK')
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]{0,79}', tag):
        raise ValueError('Invalid release tag')
    if manifest(apk, 'application-id') != PACKAGE or manifest(baseline, 'application-id') != PACKAGE:
        raise ValueError('Unexpected package ID')
    code = int(manifest(apk, 'version-code'))
    if code <= int(manifest(baseline, 'version-code')):
        raise ValueError('Update version code must be higher than the baseline')
    if certs(apk) != certs(baseline):
        raise ValueError('Signing certificates do not match')
    min_sdk = int(manifest(apk, 'min-sdk'))
    name = manifest(apk, 'version-name')
    size = apk.stat().st_size
    if not name or len(name) > 50 or min_sdk < 1 or not 0 < size <= MAX_SIZE or len(notes) > 8000:
        raise ValueError('APK or notes exceed updater limits')
    digest = hashlib.sha256()
    with apk.open('rb') as src:
        for block in iter(lambda: src.read(1024 * 1024), b''):
            digest.update(block)
    return {'schema': 1, 'packageId': PACKAGE, 'versionName': name, 'versionCode': code,
            'minSdk': min_sdk, 'size': size, 'sha256': digest.hexdigest(), 'notes': notes,
            'apkUrl': f'https://github.com/Alchemiisst/Alium/releases/download/{quote(tag, safe="")}/app-release.apk'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apk', type=Path, required=True)
    parser.add_argument('--baseline', type=Path, required=True)
    parser.add_argument('--tag', required=True)
    parser.add_argument('--notes', type=Path, required=True, help='UTF-8 release notes file')
    parser.add_argument('--output', type=Path, default=Path('update.json'))
    args = parser.parse_args()
    try:
        notes = args.notes.read_text(encoding='utf-8')
        result = create(args.apk, args.baseline, args.tag, notes)
        with args.output.open('x', encoding='utf-8') as output:
            json.dump(result, output, ensure_ascii=False, indent=2)
            output.write('\n')
        print(f'Created {args.output}. Review it and publish with the exact verified APK.')
    except (ValueError, OSError, subprocess.CalledProcessError) as exc:
        parser.exit(1, f'Metadata not created: {exc}\n')


if __name__ == '__main__':
    main()

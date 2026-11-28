import hashlib, json, pathlib, urllib.request, zipfile

root = pathlib.Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'scripts/tdjson-manifest.json').read_text())
tag = manifest['release_tag']
for abi in ('arm64-v8a', 'armeabi-v7a', 'x86_64'):
    name = f'tdjson-android-{abi}.zip'
    spec = manifest['assets'][name]
    url = f'https://github.com/iebb/mithka-tdjson/releases/download/{tag}/{name}'
    with urllib.request.urlopen(url, timeout=120) as response:
        data = response.read()
    if len(data) != spec['size'] or hashlib.sha256(data).hexdigest() != spec['sha256']:
        raise SystemExit(f'Checksum failed for {name}')
    import io
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        member = f'{abi}/libtdjson.so'
        binary = archive.read(member)
    expected = spec['members'][member]
    if len(binary) != expected['size'] or hashlib.sha256(binary).hexdigest() != expected['sha256']:
        raise SystemExit(f'Binary checksum failed for {abi}')
    output = root / 'android/app/src/main/jniLibs' / abi / 'libtdjson.so'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(binary)
    print(f'Installed verified TDLib for {abi}')

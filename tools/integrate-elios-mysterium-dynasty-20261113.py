"""Integrate verified Mysterium downloads and the official Dynasty SKU table.

The input directory contains locally downloaded originals; no login, remote
request, colour guessing or upload is performed by this script. Mysterium's
60x120 sample remains separate from the native 120x278 slab faces. Unprofiled
Dynasty CMYK originals are deliberately not used as web textures.
"""
import argparse
import copy
import hashlib
import json
import shutil
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BASE = 'assets/img/elios-mysterium-20261113/'
ORIGIN = 'https://leroyfactory.fr/'
DYNASTY_SOURCE = 'https://eliosceramica.com/wp-content/uploads/2026/08/ELIOS_CATALOGO_DYNASTY.pdf'
DYNASTY_COLORS = ['alpi', 'lepanto', 'marfil', 'monet', 'saint-laurent', 'calacatta-viola', 'bianco-aurora']


def read(path):
    return json.loads(path.read_text())


def write(path, value, pretty=False):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2 if pretty else None,
                               separators=None if pretty else (',', ':')) + '\n')


def integrate(prepared, inventory_file, dynasty_rgb_dir=None):
    inventory = read(inventory_file)
    entries = inventory['entries']
    mapping = read(ROOT / 'reports/elios-hd/mysterium-reference-mapping.json')['mysteriumVerified']
    assert len(entries) == 24 and len({e['sourceSHA256'] for e in entries}) == 24
    manufacturers = read(ROOT / 'shared/lrf-3d/manufacturer-surfaces.json')
    mysterium = next(c for c in manufacturers if c['name'] == 'Mysterium')
    dynasty = next(c for c in manufacturers if c['name'] == 'Dynasty')
    if dynasty_rgb_dir:
        for color in dynasty['colors']:
            if color['id'] not in DYNASTY_COLORS:
                continue
            original = dynasty_rgb_dir / (color['id'] + '-official.jpg')
            with Image.open(original) as image:
                assert image.mode == 'RGB' and image.size == (1200, 700)
            relative = 'assets/img/elios-dynasty-20261113/' + color['id'] + '.jpg'
            destination = ROOT / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(original, destination)
            color.update(file=ORIGIN + relative, faces=[ORIGIN + relative], resolution=[1200, 700],
                         nativeFaces=False, textureProvenance={
                             'kind': 'manufacturer-sample', 'source': color['source'],
                             'sourceSha256': hashlib.sha256(original.read_bytes()).hexdigest(),
                             'nativeDimensions': [1200, 700], 'generated': False, 'upscaled': False,
                             'manufacturerOriginal': True, 'originalBytesPreserved': True,
                         })
    native_rows = {}
    for ref, item in mapping.items():
        faces = sorted((e for e in entries if e['reference'] == ref), key=lambda e: e['face'])
        assert len(faces) == 4
        for e in faces:
            assert e['readyForIntegration'] and e['sourceICCsha256'] and e['rotateClockwise'] == 90
            assert e['format'] == '120x278' and e['colorId'] == item['colorId']
            assert e['nativeDimensions'] == [1200, 2780] and e['upscaled'] is False
        variants = {}
        for tier in ['fluid', 'balanced', 'max']:
            variants[tier] = []
            for e in faces:
                v = e['variants'][tier]
                src = prepared / v['file']
                assert hashlib.sha256(src.read_bytes()).hexdigest() == v['sha256']
                assert v['width'] <= 2780 and v['height'] <= 1200
                dst = ROOT / BASE / v['file']
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(src, dst)
                variants[tier].append(ORIGIN + BASE + v['file'])
        provenance = {
            'kind': 'manufacturer-portal-original', 'manufacturerOriginal': True,
            'source': 'https://portale.eliosceramica.it/',
            'folder': item['portalFolder'], 'reference': ref, 'format': '120x278',
            'referenceAssignmentVerified': True, 'generated': False, 'upscaled': False,
            'nativeDimensions': [1200, 2780], 'renderDimensions': [2780, 1200],
            'sourceFiles': [{'filename': e['sourceFilename'], 'sha256': e['sourceSHA256']} for e in faces],
            'colourConversion': faces[0]['colourConversion'], 'rotateClockwise': 90,
        }
        descriptor = {
            'verified': True, 'reference': ref, 'colorId': item['colorId'], 'format': '120x278',
            'nativeFaces': True, 'definitionLimited': False, 'textureRotation': 0,
            'resolution': [2780, 1200], 'textureVariants': variants,
            'textureProvenance': provenance,
        }
        color = next(c for c in mysterium['colors'] if c['id'] == item['colorId'])
        color.setdefault('textureVariantsByReference', {})[ref] = descriptor
        # Gallery preview is independent of the small-format rendering source.
        color['preview'] = variants['balanced'][0]
        color['definitionLimited'] = True
        native_rows[ref] = descriptor

    contract_path = ROOT / 'shared/lrf-3d/surface-contract.json'
    contract = read(contract_path)
    contract_collection = next(c for c in contract['collections'] if c['name'] == 'Mysterium')
    for color in contract_collection['colors']:
        color['references'] = [ref for ref, d in native_rows.items() if d['colorId'] == color['id']]
    encoded = json.dumps(contract, ensure_ascii=False, separators=(',', ':'))
    contract_path.write_text(encoded + '\n')
    (ROOT / 'shared/lrf-3d/surface-contract.mjs').write_text(
        '// Generated by scripts/sync-lrf-surface-catalogue.mjs.\nexport default ' + encoded + ';\n')

    f = next(f for f in dynasty['formats'] if f['id'] == '60x120')
    f.update(pcsBox=2, m2Box=1.44, source=DYNASTY_SOURCE)
    dynasty_rows = []
    for honed in [False, True]:
        for number, color_id in enumerate(DYNASTY_COLORS):
            color = next(c for c in dynasty['colors'] if c['id'] == color_id)
            # Existing RGB manufacturer samples preserve the reviewed colour.
            color['nativeFaces'] = False
            reference = '04N6A' + str(number + (0 if honed else 10)).zfill(2)
            dynasty_rows.append({
                'key': 'ELIOS|' + reference, 'reference': reference, 'brand': 'ELIOS',
                'collection': 'Dynasty', 'color': color['name'], 'colorId': color_id,
                'format': '60x120', 'finish': ('3D Honed' if honed else 'Naturel R10 B') + ' · Rectifié · 8,5 mm',
                'kind': 'base', 'thicknessMm': 8.5, 'rectified': True,
                'width': 120, 'height': 60, 'shape': 'rectangle', 'surfaces': ['floor', 'wall'],
                'packPieces': 2, 'packArea': 1.44, 'packVerified': True,
                'packSource': 'Catalogue ELIOS Dynasty 2026 · tableau technique · 60x120',
                'source': DYNASTY_SOURCE, 'preview': color['file'],
                'priceUnit': 'm²', 'priceTTC': None, 'priceSource': '', 'priceNote': '',
                'native': True, 'nativeFaces': False, 'definitionLimited': False, 'available3d': True,
            })
    new_keys = {r['key'] for r in dynasty_rows}
    dynasty['catalogueProducts'] = [r for r in dynasty.get('catalogueProducts', []) if r['key'] not in new_keys] + dynasty_rows
    write(ROOT / 'shared/lrf-3d/manufacturer-surfaces.json', manufacturers, pretty=True)

    for rel in ['assets/js/lrf-plan-pose/catalogue.json', 'shared/lrf-3d/commercial-surfaces.json']:
        data = read(ROOT / rel)
        for row in data['products']:
            if row.get('collection') == 'Dynasty' and row.get('format') == '60x120' and not row.get('reference'):
                color = next(c for c in dynasty['colors'] if c['id'] == row['colorId'])
                row.update(legacy=True, packPieces=2, packArea=1.44, packVerified=True,
                           packSource='Catalogue ELIOS Dynasty 2026 · tableau technique · 60x120',
                           preview=color['file'])
            descriptor = native_rows.get(row.get('reference')) if row.get('collection') == 'Mysterium' else None
            if descriptor:
                row.update(preview=descriptor['textureVariants']['balanced'][0], nativeFaces=True,
                           definitionLimited=False, textureProvenance=copy.deepcopy(descriptor['textureProvenance']))
                if rel.startswith('assets/'):
                    row.update(textureVariants=copy.deepcopy(descriptor['textureVariants']),
                               textureResolution=descriptor['resolution'], textureRotation=0,
                               textureReference=row['reference'], faces=descriptor['textureVariants']['max'],
                               textureSourceKind='reference-face')
            elif row.get('collection') == 'Mysterium':
                row['definitionLimited'] = True
        data['products'] = [r for r in data['products'] if r['key'] not in new_keys]
        for row in dynasty_rows:
            record = copy.deepcopy(row)
            if rel.startswith('assets/'):
                color = next(c for c in dynasty['colors'] if c['id'] == record['colorId'])
                record.update(native=True, purchaseHT=None, purchasePaletteHT=None, publicPriceHT=None,
                              renderColorId=color['id'], faces=copy.deepcopy(color['faces']),
                              textureResolution=color['resolution'], textureSourceKind='manufacturer-face',
                              catalogueRevision='lrf-surfaces-20261024-v1', continuousDecor=False)
            data['products'].append(record)
        write(ROOT / rel, data, pretty=rel.startswith('assets/'))

    samples = read(ROOT / 'assets/data/elios-samples.json')
    samples['products'] = [p for p in samples['products'] if p['key'] not in new_keys]
    for product in samples['products']:
        if product['collection'] == 'Dynasty' and product['format'] == '60x120' and not product['reference']:
            product.update(legacy=True, vrac=False, packPieces=2, packArea=1.44, packVerified=True,
                           packSource='Catalogue ELIOS Dynasty 2026 · tableau technique · 60x120')
        descriptor = native_rows.get(product['reference']) if product['collection'] == 'Mysterium' else None
        if descriptor:
            product.update(image=descriptor['textureVariants']['max'][0], thumbnail=descriptor['textureVariants']['fluid'][0],
                           imageResolution=descriptor['resolution'], definitionLimited=False,
                           imageSource='Photothèque officielle Elios · ' + product['reference'] + ' · 120x278',
                           textureProvenance=copy.deepcopy(descriptor['textureProvenance']))
    for row in dynasty_rows:
        color = next(c for c in dynasty['colors'] if c['id'] == row['colorId'])
        samples['products'].append({k: copy.deepcopy(row[k]) for k in [
            'key', 'reference', 'collection', 'color', 'colorId', 'format', 'finish', 'packVerified', 'packArea', 'packPieces', 'packSource']} | {
            'slug': 'dynasty', 'image': color['file'], 'thumbnail': color['file'],
            'available3d': True, 'definitionLimited': False, 'reconstructed': False,
            'vrac': 'R10' in row['finish'], 'sampleReference': row['reference'],
            'priceUnit': 'm²', 'shape': 'rectangle', 'tileWidth': 1.2, 'tileHeight': .6,
            'imageResolution': color['resolution'], 'imageSource': color['source'],
        })
    samples['version'] = '20261113-elios-mysterium-dynasty-v8'
    for rel in ['assets/data/elios-samples.json', 'functions/elios-samples-catalogue.json']:
        write(ROOT / rel, samples)
    write(ROOT / 'reports/elios-hd/mysterium-native-inventory-20261113.json', inventory, pretty=True)
    print(json.dumps({'mysteriumColors': 6, 'mysteriumFaces': 24, 'variants': 72,
                      'dynasty60x120References': len(dynasty_rows), 'dynastyVrac': 7}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--prepared', type=Path, required=True)
    parser.add_argument('--inventory', type=Path, required=True)
    parser.add_argument('--dynasty-rgb-dir', type=Path)
    args = parser.parse_args()
    integrate(args.prepared, args.inventory, args.dynasty_rgb_dir)

"""Prepare official finish samples without inventing pixels or changing the approved Alba.

Usage: python3 scripts/prepare-finish-textures.py /directory/of/attached/samples
The previously approved ALBA assets/manifest are kept byte for byte. Seven new
samples are EXIF-transposed, colour-managed to sRGB, and fitted into quality
budgets without upscaling. Manufacturer physical dimensions/gloss are unknown.
"""
from pathlib import Path
from PIL import Image, ImageCms, ImageOps, ImageStat
import argparse
import hashlib
import io
import json

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('source_directory', type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
out = root / 'dist/assets/finishes/20261022'
manifest_file = out / 'sources.json'
previous = json.loads(manifest_file.read_text())
alba = previous['finishes']['ALBA']
# ALBA was approved separately; even a re-uploaded smaller JPEG must not replace it.
alba_files = [root / 'dist/assets' / v['file'] for v in alba['variants'].values()]
alba_files.append(root / 'dist/assets' / alba['swatch'])
alba_hashes = {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in alba_files}
manifest = {
    'collection': 'STUDIO ONE',
    'date': '2026-10-22',
    'preparedDate': '2026-10-24',
    'notes': [
        'All eight finishes use the official flat manufacturer samples supplied by Juan Carlos Segura.',
        'The previously approved ALBA outputs are preserved byte for byte, using its original 1292 x 2800 sample.',
        'The seven remaining samples were supplied as user attachments on 24 October 2026; source sizes below describe those actual uploaded files.',
        'Embedded ICC profiles are converted to sRGB; files without a profile are interpreted as sRGB. EXIF orientation is applied before resizing.',
        'Aspect ratio is preserved and samples are never upscaled. Fluid, balanced and max indicate budgets, not invented source detail.',
        'Physical panel dimensions and measured gloss/roughness were not supplied; existing material settings are retained.',
        'Reference photographs are not used as flat textures.'
    ],
    'finishes': {'ALBA': alba}
}
sources = {
    'ROBLE': 'Roble amazona_acabado.jpeg',
    'NOGAL': 'Nogal valentina_acabado.jpeg',
    'WHITE': 'White bolero_acabado.jpeg',
    'AZUL': 'Azul acero_acabado.jpeg',
    'GRIS': 'Gris Tórtora_acabado.jpeg',
    'BISC': 'Biscuit_acabado.jpeg',
    'GREEN': 'Muted green_acabado.jpeg'
}
for finish_id, name in sources.items():
    source = args.source_directory / name
    with Image.open(source) as original:
        source_pixels = list(original.size)
        orientation = original.getexif().get(274)
        icc = original.info.get('icc_profile')
        im = ImageOps.exif_transpose(original)
        if icc:
            profile = ImageCms.ImageCmsProfile(io.BytesIO(icc))
            im = ImageCms.profileToProfile(im, profile, ImageCms.createProfile('sRGB'), outputMode='RGB')
            profile_name = ImageCms.getProfileName(profile).strip()
        else:
            im = im.convert('RGB')
            profile_name = None
        variants = {}
        for mode, size in [('fluid', 256), ('balanced', 1024), ('max', 2048)]:
            copy = im.copy()
            copy.thumbnail((size, size), Image.Resampling.LANCZOS)
            file = out / (finish_id.lower() + '-' + mode + '.webp')
            copy.save(file, format='WEBP', quality=94 if mode == 'max' else 90, method=6)
            variants[mode] = {
                'file': str(file.relative_to(root / 'dist/assets')),
                'size': list(copy.size),
                'bytes': file.stat().st_size,
                'sha256': hashlib.sha256(file.read_bytes()).hexdigest()
            }
        swatch = im.transpose(Image.Transpose.ROTATE_90)
        swatch.thumbnail((128, 128), Image.Resampling.LANCZOS)
        swatch_file = out / (finish_id.lower() + '-swatch.webp')
        swatch.save(swatch_file, format='WEBP', quality=92, method=6)
        mean = ImageStat.Stat(im.resize((64, 64))).mean
        hexcolour = '#' + ''.join(f'{round(x):02x}' for x in mean[:3])
        manifest['finishes'][finish_id] = {
            'original': name,
            'sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
            'sourcePixels': source_pixels,
            'processedPixels': list(im.size),
            'embeddedICC': profile_name,
            'exifOrientation': orientation,
            'outputColourSpace': 'sRGB',
            'newManufacturerSample': True,
            'averageSRGB': hexcolour,
            'variants': variants,
            'swatch': str(swatch_file.relative_to(root / 'dist/assets'))
        }
assert all(hashlib.sha256(p.read_bytes()).hexdigest() == h for p, h in alba_hashes.items())
manifest_file.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
for finish_id, data in manifest['finishes'].items():
    print(f"{finish_id}: {data['sourcePixels']} {data['averageSRGB']} max={data['variants']['max']['size']}")

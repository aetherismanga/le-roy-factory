"""Build the private SAXSO pricebook from the versioned, verified supplier file."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
FIELDS = ('page', 'index', 'label', 'variantIds', 'perPallet', 'weightPerUnit', 'unit')
PINNED = '112b095394e3e09352cb40afb6b41373abef1c8819375d044a5da8a8176adaaa'
parser = argparse.ArgumentParser()
parser.add_argument('--pdf', type=Path)
parser.add_argument('--out', type=Path)
parser.add_argument('--version', action='store_true')
args = parser.parse_args()
index = json.loads((ROOT / 'assets/data/saxso-net-index.json').read_text())
rows = [{field: row[field] for field in FIELDS} for row in index['rows']]
catalogue = json.loads((ROOT / 'assets/data/saxso-catalogue.json').read_text())
references = {variant['id']: variant['reference'] for collection in catalogue['collections'] for variant in collection['variants']}
for row in rows:
    row['references'] = {key: references[key] for key in row['variantIds'] if references[key] != row['label']}
digest = hashlib.sha256(json.dumps(rows, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()
version = dict(sourceHash=PINNED, indexHash=digest, path='private-tariffs/saxso/orders/' + digest + '.json')
version_file = ROOT / 'functions/data/saxso-order-version.json'
if index['documentSha256'] != PINNED or len(rows) != 53:
    raise ValueError('La version de la grille doit être vérifiée.')
if args.version:
    version_file.write_text(json.dumps(version, indent=2) + '\n')
else:
    if json.loads(version_file.read_text()) != version:
        raise ValueError('Régénérer la version de la matrice après vérification des correspondances.')
    if hashlib.sha256(args.pdf.read_bytes()).hexdigest() != PINNED:
        raise ValueError('Le document SAXSO diffère de la version vérifiée.')
    xml = subprocess.check_output(['pdftotext', '-bbox', str(args.pdf), '-'])
    columns = []
    for page in ET.fromstring(xml).findall('.//{*}page'):
        words = sorted((float(w.attrib['yMin']), w.text) for w in page.findall('{*}word')
                       if float(w.attrib['xMin']) > 480 and re.fullmatch(r'\d+,\d{2}', w.text or ''))
        columns.append([int(price.replace(',', '')) for _, price in words])
    if [len(values) for values in columns] != [18, 15, 20]:
        raise ValueError('Colonnes de prix non reconnues.')
    ids = set()
    for row in rows:
        if not row['variantIds'] or any(v in ids for v in row['variantIds']) or min(row['perPallet'],row['weightPerUnit']) <= 0:
            raise ValueError('Correspondance ou conditionnement manquant.')
        ids.update(row['variantIds'])
        row['cents'] = columns[row['page'] - 1][row['index']]
    args.out.write_text(json.dumps(dict(**version, rows=rows),ensure_ascii=False))
    print(f'{len(rows)} références contrôlées. Grille privée prête.')

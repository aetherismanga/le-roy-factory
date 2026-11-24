"""Apply the reviewed supplier workbook and its November merchandising supplement."""

import hashlib
import json
from pathlib import Path
import re
import shutil

import fitz
import openpyxl
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'tools' / 'elios-samples-v9'
VERSION = '20261124-elios-v9-cersaie'
BOOK = 'Nouveautés Cersaie — novembre 2026'
PDF_PATH = 'assets/pdf/elios-cersaie-novembre-2026.pdf'
IMAGE_DIR = 'assets/img/elios-merchandising-2026'
WORKBOOK_NAME = 'ARTICOLI VERS 9 nov 26.xlsx'
PDF_NAME = 'Elios_Merchandising_2026 news nov .pdf'


def source_hash(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_data(filename):
    return json.loads((DATA / filename).read_text())


def read_v9(workbook_path):
    mapping = load_data('rubiera.json')
    if source_hash(workbook_path) != mapping['workbookSha256']:
        raise ValueError('Vérifier à nouveau le rapprochement des références pour ce fichier V9.')
    rules = []
    allowed = {}
    workbook = openpyxl.load_workbook(workbook_path, data_only=True, read_only=True)
    try:
        for number, row in enumerate(workbook['magazzino_Rubiera_'].values, 1):
            if number < 4 or not row[0] or 'TOTAL' in str(row[0]):
                continue
            collection, fmt, finish, base_count, decor_count = row[:5]
            rule = {
                'row': number, 'collection': str(collection).strip(),
                'format': str(fmt or '').strip(), 'finish': str(finish or '').strip(),
                'references': base_count, 'decors': decor_count,
            }
            if override := mapping.get('authorizedCountOverrides', {}).get(str(number)):
                rule['authorizedOverride'] = override
            rules.append(rule)
            selected = mapping['rows'].get(str(number), {})
            for category, maximum in [('fonds', base_count), ('decors', decor_count)]:
                skus = selected.get(category, [])
                override = mapping.get('authorizedCountOverrides', {}).get(str(number), {})
                limit = override.get(category, maximum or 0)
                if not fmt or len(skus) > limit:
                    if skus:
                        raise ValueError(f'Trop de références vérifiées à la ligne {number} ({category}).')
                for sku in skus:
                    if sku in allowed:
                        raise ValueError(f'Référence V9 dupliquée : {sku}.')
                    allowed[sku] = (number, category)
    finally:
        workbook.close()
    return rules, allowed


def apply_v9(catalogue, rules, allowed):
    catalogue['rules'] = rules
    products = {p['key']: p for p in catalogue['products']}
    for product in load_data('products.json'):
        key = product['key']
        if key in products:
            candidate = products[key]
            if not candidate.get('image') and product.get('image'):
                for field in ('image', 'thumbnail', 'imageSource', 'imageResolution', 'definitionLimited'):
                    if field in product:
                        candidate[field] = product[field]
        else:
            products[key] = product
    seen = set()
    for product in products.values():
        sku = product.get('reference') or ''
        match = allowed.get(sku)
        eligible = bool(match and not product.get('legacy') and product['key'] == 'ELIOS|' + sku)
        product['vrac'] = eligible
        product['sampleReference'] = sku if eligible else ''
        product.pop('sampleReferencePending', None)
        product.pop('sampleOffer', None)
        product.pop('sampleV9', None)
        if eligible:
            number, category = match
            product['sampleV9'] = {'row': number, 'category': category}
            product['sampleOffer'] = 'offered'
            seen.add(sku)
    if missing := set(allowed) - seen:
        raise ValueError(f'Références V9 manquantes dans le catalogue : {sorted(missing)}.')
    catalogue['products'] = list(products.values())
    catalogue['sampleSelectionPolicy'] = 9


def page_images(page, number):
    # Customer previews omit printed supplier values, as in the other books.
    for block in page.get_text('dict', flags=fitz.TEXTFLAGS_TEXT)['blocks']:
        for line in block.get('lines', []):
            for span in line['spans']:
                if '€' in span['text']:
                    page.add_redact_annot(fitz.Rect(span['bbox']), fill=(1, 1, 1))
    page.apply_redactions(images=0, graphics=0)
    image = f'{IMAGE_DIR}/cersaie-novembre-{number:02}.webp'
    thumbnail = image.replace('.webp', '-thumb.webp')
    (ROOT / IMAGE_DIR).mkdir(parents=True, exist_ok=True)
    pixels = page.get_pixmap(matrix=fitz.Matrix(1.7, 1.7), alpha=False)
    picture = Image.frombytes('RGB', (pixels.width, pixels.height), pixels.samples)
    picture.save(ROOT / image, quality=88, method=6)
    picture.thumbnail((440, 440))
    picture.save(ROOT / thumbnail, quality=82, method=6)
    return dict(image=image, thumbnail=thumbnail, page=number, book=BOOK)


def update_merchandising(catalogue, pdf_path):
    source = load_data('cersaie.json')
    if source_hash(pdf_path) != source['pdfSha256']:
        raise ValueError('Vérifier à nouveau les références de merchandising pour ce PDF.')
    items = {item['id']: item for item in catalogue['merchandising']}
    blocked = set(source['ambiguousCodes'])
    for code in blocked & items.keys():
        items[code]['orderable'] = False
        items[code]['status'] = 'Code fabricant à vérifier'
    pages = [page for page in catalogue['documents'] if page.get('book') != BOOK]
    with fitz.open(pdf_path) as pdf:
        if len(pdf) != 22:
            raise ValueError('Le complément merchandising comporte 22 pages.')
        for number, entries in source['pages'].items():
            number = int(number)
            page = pdf[number - 1]
            codes = re.findall(r'\bcod\.\s+([A-Z0-9]{5,9})\b', page.get_text())
            visual = page_images(page, number)
            refs = []
            for ref, collection, description, dimensions, value in entries:
                if ref not in codes or ref in blocked:
                    raise ValueError(f'Code de merchandising non confirmé page {number} : {ref}.')
                item = items.setdefault(ref, {
                    'id': ref, 'reference': ref, 'collection': collection,
                    'description': description, 'unit': 'pièce', 'valueUnitHT': value,
                    'status': 'Selon disponibilité', 'payable': False,
                    'factoryApprovalRequired': True, 'sourceSheet': BOOK,
                    'priceSource': {'file': PDF_NAME, 'page': number}, 'images': [],
                })
                if dimensions:
                    item['dimensions'] = dimensions
                if collection != item['collection']:
                    item['relatedCollections'] = sorted(set(item.get('relatedCollections', [])) | {collection})
                if item['collection'] == collection:
                    item['description'] = description
                if all(old['image'] != visual['image'] for old in item['images']):
                    if item['collection'] == collection:
                        item['images'].insert(0, visual)
                    else:
                        item['images'].append(visual)
                refs.append(ref)
            pages.append({**visual, 'codes': refs})
    catalogue['merchandising'] = list(items.values())
    catalogue['documents'] = pages
    catalogue['cersaieSupplement'] = {'title': BOOK, 'path': PDF_PATH, 'pages': 22}


def write_catalogue(catalogue):
    data = json.dumps(catalogue, ensure_ascii=False, separators=(',', ':'))
    for path in ['assets/data/elios-samples.json', 'functions/elios-samples-catalogue.json']:
        (ROOT / path).write_text(data)


def refresh_v9(workbook, pdf):
    catalogue = json.loads((ROOT / 'assets/data/elios-samples.json').read_text())
    rules, allowed = read_v9(workbook)
    apply_v9(catalogue, rules, allowed)
    update_merchandising(catalogue, pdf)
    catalogue['version'] = VERSION
    catalogue['sourceDate'] = '2026-11-24'
    additions = {name: {'file': name, 'sha256': source_hash(path)}
                 for name, path in [(WORKBOOK_NAME, workbook), (PDF_NAME, pdf)]}
    catalogue['sources'] = [
        source for source in catalogue['sources'] if source['file'] not in additions
    ] + list(additions.values())
    if pdf.resolve() != (ROOT / PDF_PATH).resolve():
        shutil.copyfile(pdf, ROOT / PDF_PATH)
    write_catalogue(catalogue)
    print(json.dumps({'version': VERSION, 'vrac': len(allowed),
                      'merchandising': len(catalogue['merchandising'])}))

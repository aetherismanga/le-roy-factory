#!/usr/bin/env python3
"""Build the French SAXSO catalogue and public product data from the supplied PDF.

Photos are extracted at native resolution. Redactions remove text only: the
original image streams and vector artwork are retained without rasterisation.
Usage: python tools/import-saxso-catalogue.py /absolute/path/source.pdf
"""
import hashlib
import json
import re
import sys
import unicodedata
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1])
MEDIA = ROOT / 'assets/img/saxso-2026'
DATA = ROOT / 'assets/data/saxso-catalogue.json'
PDF = ROOT / 'assets/pdf/SAXSO_Catalogue_2026_FR.pdf'
for directory in (MEDIA, DATA.parent, PDF.parent):
    directory.mkdir(parents=True, exist_ok=True)
doc = fitz.open(SOURCE)

def clean(text):
    return re.sub(r'\s+', ' ', text).strip()

def slug(text):
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', text).strip('-')

WORDS = [
    ('con bordo a toro', 'avec nez arrondi'), ('con gocciolatoio', "avec goutte d'eau"),
    ('ad incastro', 'à emboîtement'), ('su cemento', 'sur ciment'),
    ('lavorati alla punta', 'smillés'), ('lavorato alla punta', 'smillé'),
    ('Pietra di Luserna', 'Pierre de Luserna'), ('Pietra d’Oriente', "Pierre d’Orient"),
    ('Quarzite Brasiliana', 'Quartzite brésilienne'), ('Porfido Trentino', 'Porphyre du Trentin'),
    ('Foglia D’Autunno', "Feuille d’automne"), ('Foglia d’autunno', "Feuille d’automne"),
    ('Colori Misti', 'Couleurs mélangées'), ('Giallo Ocra', 'Jaune ocre'),
    ('Giallo Imperiale', 'Jaune impérial'), ('Rosa Oriente', 'Rose Orient'),
    ('Superficie', 'Surface'), ('Piastrelle', 'Dalles'), ('Travertino', 'Travertin'),
    ('Quarzite', 'Quartzite'), ('Ardesia', 'Ardoise'), ('Basalto', 'Basalte'),
    ('Granito', 'Granit'), ('Ciottoli', 'Galets'), ('Granulati', 'Gravillons'),
    ('Muretti', 'Parements'), ('Muretto', 'Parement'), ('Listelli', 'Lamelles'),
    ('Listello', 'Lamelle'), ('Angoli', 'Angles'), ('Angolo', 'Angle'),
    ('Gradoni', 'Marches bloc'), ('Gradini', 'Marches'), ('Copertine', 'Couvertines'),
    ('Zoccolino', 'Plinthe'), ('Alzate', 'Contremarches'), ('Losette', 'Lauzes'),
    ('Quadrettoni', 'Opus romain'), ('Cubetti', 'Pavés'), ('Blocchetti', 'Barrettes'),
    ('Cordoli', 'Bordures'), ('Binderi', 'Boutisses'), ('Mosaico', 'Opus incertum'),
    ('Fiammati', 'Flammés'), ('Fiammato', 'Flammé'), ('Sabbiato', 'Sablé'),
    ('Spazzolato', 'Brossé'), ('Levigato', 'Adouci'), ('Anticati', 'Vieillis'),
    ('Anticato', 'Vieilli'), ('Ant.', 'Vieilli'), ('Bocciardato', 'Bouchardé'),
    ('Incastro', 'Emboîtement'), ('Rossiccio', 'Roux'), ('Grigio', 'Gris'),
    ('Grigia', 'Grise'), ('Mista', 'Mélangée'), ('Misto', 'Mélangé'),
    ('Gialla', 'Jaune'), ('Giallo', 'Jaune'), ('Ghiaccio', 'Glace'),
    ('Bianca', 'Blanche'), ('Verde', 'Vert'), ('Nera', 'Noire'), ('Nero', 'Noir'),
    ('Blu', 'Bleu'), ('Sottile', 'Fin'), ('Spesso', 'Épais'), ('Normale', 'Normal'),
    ('Gigante', 'Géant'), ('Sfere', 'Sphères'), ('Lastre', 'Tranches'),
    ('Misure miste', 'Dimensions mélangées'), ('da', 'de'),
]

def translate(text):
    text = clean(text)
    for old, new in WORDS:
        text = re.sub(r'(?<!\w)' + re.escape(old) + r'(?!\w)',
                      lambda m: new.upper() if m.group().isupper() else new, text, flags=re.I)
    text = re.sub(r'\bsp\.?\s*(?=\d)', 'ép. ', text, flags=re.I)
    text = re.sub(r'\bPZ\b', 'pièce', text)
    text = re.sub(r'\bA C\.', 'en longueur libre', text)
    text = re.sub(r'\bkg/Pz\b', 'kg/pièce', text, flags=re.I)
    return clean(text)

# Ranges follow the printed catalogue, preserving source-page references.
RANGES = [
    (12, 33, 'Pierre de Luserna', 'Extérieur'), (34, 39, 'Sakkara', 'Extérieur'),
    (40, 43, 'Moka', 'Extérieur'), (44, 51, 'Travertin', 'Extérieur'),
    (52, 67, "Pierre d’Orient", 'Extérieur'), (68, 69, 'Cristallo Blu', 'Extérieur'),
    (70, 75, 'Porphyre du Trentin', 'Extérieur'), (76, 85, 'Quartzite brésilienne', 'Extérieur'),
    (86, 89, 'Ardoise', 'Extérieur'), (90, 91, 'Polar White', 'Extérieur'),
    (92, 93, 'Metal Grey', 'Extérieur'), (94, 95, 'Perla Nera', 'Extérieur'),
    (96, 97, 'Atlantic Silver', 'Extérieur'), (98, 103, 'Galets', 'Extérieur'),
    (104, 109, 'Gravillons', 'Extérieur'), (110, 111, 'Paillettes', 'Extérieur'),
    (112, 119, 'Granit', 'Extérieur'), (120, 121, 'Basalte', 'Extérieur'),
    (124, 125, 'Parements quartzite et ardoise multicolore', 'Parement'),
    (126, 127, 'Parement ardoise noire · CG003', 'Parement'),
    (128, 130, 'Parements quartzite jaune, verte et rose', 'Parement'),
    (131, 132, 'Parements ardoise noire et quartzite glace', 'Parement'),
    (133, 135, 'Parements quartzite blanche, Luserna et ardoise', 'Parement'),
    (136, 137, 'Parements quartzite Metal', 'Parement'),
    (138, 139, 'Parements Desert, Fossil et Sahara', 'Parement'),
    (140, 141, 'Parements quartzite sur ciment', 'Parement'),
    (142, 143, 'Parement ardoise noire sur ciment', 'Parement'),
    (144, 145, 'Parements ardoise et gneiss sur ciment', 'Parement'),
    (146, 147, 'Parements Rusty et Mountain Mix', 'Parement'),
    (148, 149, 'Lamelles Fujian et Sahara', 'Parement'),
    (150, 151, 'Lamelles Polar White et Metal', 'Parement'),
    (152, 153, 'Lamelles ardoise', 'Parement'),
    (154, 155, 'Lamelles Metal Grey et quartzite noire', 'Parement'),
    (156, 157, 'Lamelles Luserna', 'Parement'),
    (160, 161, 'Pierre de Luserna', 'Intérieur'), (162, 163, 'Sakkara', 'Intérieur'),
    (164, 165, 'Travertin', 'Intérieur'), (166, 167, 'Porphyre du Trentin', 'Intérieur'),
    (168, 169, 'Quartzite brésilienne', 'Intérieur'), (170, 171, 'Ardoise', 'Intérieur'),
    (172, 173, 'Polar White', 'Intérieur'), (174, 175, 'Metal Grey', 'Intérieur'),
    (176, 177, 'Perla Nera', 'Intérieur'),
]
collections = [dict(id=slug(name + '-' + category), name=name, category=category,
                    page=start, endPage=end, images=[], variants=[])
               for start, end, name, category in RANGES]

def collection_for(page):
    return next((c for c in collections if c['page'] <= page <= c['endPage']), None)

image_assets = {}
page_images = {}
for pno, page in enumerate(doc, 1):
    current = []
    for info in page.get_image_info(xrefs=True):
        xref = info['xref']
        if not xref or info['width'] < 180 or info['height'] < 100:
            continue
        if xref not in image_assets:
            extracted = doc.extract_image(xref)
            ext = extracted['ext']
            target = MEDIA / f'photo-{xref}.{ext}'
            if not target.exists():
                target.write_bytes(extracted['image'])
            # These native catalogue photos are already compact. Reuse the
            # original for lazy-loaded cards instead of shipping a second,
            # lower-resolution file that is often larger than the original.
            image_assets[xref] = dict(url=str(target.relative_to(ROOT)),
                                     preview=str(target.relative_to(ROOT)),
                                     width=info['width'], height=info['height'])
        current.append({**image_assets[xref], 'rect': list(info['bbox']), 'page': pno})
    page_images[pno] = current
    coll = collection_for(pno)
    if coll:
        for asset in sorted(current, key=lambda x: -(x['width'] * x['height'])):
            if not any(old['url'] == asset['url'] for old in coll['images']):
                coll['images'].append(asset)

# A row is identified by its unit and its original table block. No prices are
# read or inferred; the figures after the unit are packaging and weight only.
units = {'M²': 'm²', 'ML': 'ml', 'PZ': 'pièce', 'T': 'tonne'}
rows = []
numeric = re.compile(r'^[\d\s.,≈~<>+/%–—−\-]+(?:\s*kg/(?:m2|Pz|ml))?$', re.I)
for pno, page in enumerate(doc, 1):
    coll = collection_for(pno)
    if not coll or pno >= 160:
        continue
    blocks=page.get_text('dict')['blocks']
    for block in blocks:
        if 'lines' not in block:
            continue
        lines = []
        for line in block['lines']:
            text = clean(''.join(s['text'] for s in line['spans']))
            if text:
                lines.append((text, line['bbox']))
        for index, (text, bbox) in enumerate(lines):
            if text not in units:
                continue
            desc = []
            for previous, box in reversed(lines[:index]):
                if previous in units or numeric.fullmatch(previous) or previous == 'KG':
                    break
                desc.insert(0, previous)
            reference = clean(' '.join(desc))
            reference_x=block['bbox'][0]
            if not reference:
                # In three source tables the description and the unit are
                # separate PDF text blocks but occupy the same printed row.
                candidates=[b for b in blocks if 'lines' in b and b is not block
                    and bbox[0]-260 < b['bbox'][0] < bbox[0]
                    and b['bbox'][2] < bbox[0]+2
                    and b['bbox'][1]-2 <= bbox[1] <= b['bbox'][3]+2]
                if candidates:
                    previous=max(candidates,key=lambda b:b['bbox'][0])
                    parts=[clean(''.join(s['text'] for s in l['spans'])) for l in previous['lines']]
                    parts=[t for t in parts if not re.match(r'^(?:Lauzes Opus|Dachplatten|Roofing|Toutes dimensions|Gemischte|Mixed sizes)',t)]
                    reference=clean(' '.join(parts));reference_x=previous['bbox'][0]
            if not re.search(r'\d', reference) or len(reference) < 10:
                continue
            numbers = []
            for following, box in lines[index + 1:]:
                if not numeric.fullmatch(following):
                    break
                numbers.append(following)
            pallet = numbers[0] if numbers else ''
            exact_pallet = float(pallet.replace(',', '.')) if re.fullmatch(r'\d+(?:[,.]\d+)?', pallet) else None
            identifier = f'saxso-{pno}-{round(bbox[0])}-{round(bbox[1])}-{slug(reference)}'
            if any(row['id'] == identifier for row in rows):
                continue
            row = dict(id=identifier, reference=reference, label=translate(reference),
                       unit=units[text], page=pno, packaging=pallet,
                       perPallet=exact_pallet, weight=numbers[-1] if len(numbers) > 1 else '')
            qualifiers=[]
            for nearby in blocks:
                for line in nearby.get('lines',[]):
                    label=clean(''.join(s['text'] for s in line['spans']))
                    if abs(line['bbox'][0]-reference_x)<35 and line['bbox'][3]<bbox[1] and re.match(r'^(?:Fin|Normal|Géant|Epais|Épais|XXL)\b',label) and 'pièces' in label:
                        qualifiers.append((line['bbox'][1],label))
            if qualifiers:
                row['description']=max(qualifiers)[1].replace('ép. 52/4','ép. 2/4')
            coll['variants'].append(row)
            rows.append(row)

# Interior pages list documented finishes rather than sale dimensions.
fr_start = re.compile(r'^(?:Dalles|Plinthe|Marches|Margelles|Contremarches|Tranches|Opus incertum|Lauzes)\b', re.I)
for coll in collections:
    if coll['category'] != 'Intérieur':
        continue
    for pno in range(coll['page'], coll['endPage'] + 1):
        for line in doc[pno - 1].get_text().splitlines():
            line = clean(line)
            if not fr_start.search(line):
                continue
            line = line.split('/')[0].strip()
            if any(v['label'] == line for v in coll['variants']):
                continue
            unit='ml' if re.match(r'Plinthe|Contremarches',line,re.I) else 'pièce' if re.match(r'Marches|Margelles',line,re.I) else 'm²'
            coll['variants'].append(dict(id=f'saxso-{pno}-{slug(line)}',
                reference=coll['name'] + ' — ' + line, label=line, unit=unit,
                page=pno, packaging='', perPallet=None, weight='',
                note='Formats, coloris et conditionnement à confirmer avec l’usine.'))

for coll in collections:
    labels={}
    for variant in coll['variants']:
        labels.setdefault(variant['label'],[]).append(variant)
    for label,duplicates in labels.items():
        if len(duplicates)>1:
            for variant in duplicates:
                suffix=variant.get('description') or f"unité {variant['unit']} · palette {variant['packaging'] or 'à confirmer'}"
                variant['label']=label+' · '+suffix
    coll['cover'] = coll['images'][0] if coll['images'] else None

# Strict language selection. French technical wording already present in the
# source is retained; foreign translations are physically removed.
foreign = re.compile(r'\b(?:Oberfl\w*|Kanten|Seiten|Bodenplatten|Stufen|Stärke|geschliffen|gesägt|gespalten|getrommelt|und|mit|auf|verfügbar|Dachplatten|Polygonalplatten|Handcut|Flamed|surface - Sawn|Tiles|Tumbled|sides|edges|handcut|hammered|Thickness|Skirting|Risers|Steps|Natural cleft|Sawn|Honed|Slabs|Gravel|Pebbles|Kieselsteine|Splitt|Riemchen|Strips|Ecken|Corner|Verlegung|Laying)\b', re.I)
french = re.compile(r'^(?:Surface|Dalles|Toutes?|Tous|Produit|Résistant|Unité|Quantité|kg par|Longueur|Couleur|Légère|Différence|Forte|Géant|Normal|Fin\b|Épais|Epais|XXL|Opus|Couvertines|Margelles|Marches|Bordures|Barrettes|Blocs|Lamelles|Contremarches|Plinthe|Tranches|Lauzes|Dessus|Côtés|Côtes|Cötés|Épaisseur|Epaisseur|Disponible|Pas Japonais surface|Sphéres|Sphères|2 côtés|3 cotés|mm sur|commune - autres|sur arrets commune)', re.I)
header_map = {
    'PIASTRELLE LATI SEGATI': 'DALLES CÔTÉS SCIÉS',
    'PIASTRELLE LATI TRANCIATI': 'DALLES CÔTÉS CLIVÉS',
    'PIASTRELLE PIANO FIAMMATO': 'DALLES FLAMMÉES',
    'PIASTRELLE': 'DALLES', 'QUADRETTONI': 'OPUS ROMAIN',
    'LOSETTE': 'LAUZES', 'CUBETTI': 'PAVÉS', 'CUBETTI 10X10': 'PAVÉS 10 × 10',
    'BLOCCHETTI TRANCIATI': 'BARRETTES CLIVÉES', 'TOPURE DA MURO': 'PIERRES À MURET',
    'BINDERI': 'BOUTISSES', 'CORDOLI': 'BORDURES', 'GRADONI': 'MARCHES BLOC',
    'MOSAICO': 'OPUS INCERTUM', 'MOSAICO BUGNATO': 'OPUS BOSSELÉ',
    'ZOCCOLINO': 'PLINTHE', 'BORDI PISCINA': 'MARGELLES',
    'COPERTINE': 'COUVERTINES', 'GRADINI': 'MARCHES', 'BLOCCHI DA MURO': 'BLOCS À MURET',
    'BLOCCHETTI': 'BARRETTES', 'ALZATE / ZOCCOLINO': 'CONTREMARCHES / PLINTHES',
    'GRADINI LATI SPACCO': 'MARCHES CÔTÉS CLIVÉS', 'ALZATE': 'CONTREMARCHES',
    'LASTRE': 'TRANCHES', 'PIASTRE': 'DALLES', 'CIOTTOLI': 'GALETS',
    'GRANULATI': 'GRAVILLONS', 'MURETTI': 'PLAQUETTES DE PAREMENT',
    'MURETTI SU CEMENTO': 'PAREMENTS SUR CIMENT', 'ANGOLI': 'ANGLES',
    'LISTELLI': 'LAMELLES', 'LISTELLI ANTICATI': 'LAMELLES VIEILLIES',
    'LISTELLI A SPACCO': 'LAMELLES CLIVÉES', 'SFERE': 'SPHÈRES',
    'PAILLETTES': 'PAILLETTES', 'PALISSADES': 'PALISSADES',
}
title_map = {'OUTDOOR': 'EXTÉRIEUR', 'INDOOR': 'INTÉRIEUR',
             'PIETRADILUSERNA': 'PIERRE DE LUSERNA', 'PIETRAD’ORIENTE': 'PIERRE D’ORIENT',
             'QUARZITEBRASILIANA': 'QUARTZITE BRÉSILIENNE', 'PORFIDOTRENTINO': 'PORPHYRE DU TRENTIN',
             'MURETTI': 'PAREMENTS', 'MURETTISUCEMENTO': 'PAREMENTS SUR CIMENT',
             'LISTELLI': 'LAMELLES', 'LISTELLIANTICATI': 'LAMELLES VIEILLIES',
             'LISTELLIASPACCO': 'LAMELLES CLIVÉES', 'GRANULATI': 'GRAVILLONS', 'CIOTTOLI': 'GALETS'}

font_cache = {}
for page in doc:
    for font in page.get_fonts():
        name = font[3].split('+')[-1]
        if name not in font_cache:
            try:
                font_cache[name] = doc.extract_font(font[0])[3]
            except Exception:
                pass

def all_lines(page):
    return [line for block in page.get_text('dict')['blocks'] for line in block.get('lines', [])]

def remove_text(page):
    for line in all_lines(page):
        page.add_redact_annot(fitz.Rect(line['bbox']), fill=False, cross_out=False)
    page.apply_redactions(images=0, graphics=0)

def put(page, rect, text, size=12, color=(.09,.1,.1), bold=False):
    fontname = 'SaxEditorialBold' if bold else 'SaxEditorial'
    page.insert_font(fontname=fontname,fontfile='/usr/share/fonts/truetype/dejavu/DejaVuSans'+('-Bold' if bold else '')+'.ttf')
    for test in (size, size*.94, size*.86, size*.76):
        result = page.insert_textbox(fitz.Rect(rect), text, fontname=fontname,
                                     fontsize=test, color=color, lineheight=1.45)
        if result >= 0:
            return
    raise RuntimeError(f'Text does not fit page {page.number+1}: {text[:60]}')

def editorial(page, title, subtitle, text, right_title='', right_text=''):
    remove_text(page)
    page.draw_rect(fitz.Rect(0,0,842,596), color=None, fill=(.976,.969,.95))
    put(page, (48,38,780,70), 'SAXSO  /  CATALOGUE 2026', 11, (.56,.38,.29), True)
    put(page, (48,105,790,220), title, 31, bold=True)
    put(page, (48,240,382,290), subtitle, 13, bold=True)
    put(page, (48,295,382,505), text, 12)
    if right_title:
        put(page, (445,240,792,290), right_title, 13, bold=True)
        put(page, (445,295,792,520), right_text, 12)
    put(page, (48,553,795,577), f'SAXSO · FRANÇAIS · 2026                                        {page.number+1}', 9)

special = {1,2,3,5,7,8,9,179,180}
for pno, page in enumerate(doc, 1):
    if pno in special:
        continue
    kept = []
    for line in all_lines(page):
        spans = line['spans']; text = clean(''.join(s['text'] for s in spans))
        if not text:
            continue
        font = spans[0]['font']; size = spans[0]['size']; compact = re.sub(r'\s+', '', text)
        result = text
        if pno == 178:
            if text in {'Typ','Formate cm','Size cm','Stk./mod.','VERLEGUNG','LAYING'}:
                continue
            if text in {'Type','Format cm','Pieces/mod.','M2/mod.'} and font == 'MyriadPro-Cond':
                continue
            result = {'Tipo':'Type','Formato cm':'Format cm','Pezzi/mod.':'Pièces/mod.','P O S A':'P O S E'}.get(text,text)
        elif re.fullmatch(r'[\d\s.,≈~%+×x/\-]+',text) or text in {'M²','ML','PZ','T','KG','mm','•','V1','V2','V3','V4'}:
            result = {'PZ':'Pce'}.get(text,text)
        elif ' / ' in text or re.search(r'/\s*(?:Sur |Surface|Toutes|Sans|Nez|avec|En cas|Oberfl|Auf|On |mit |Honed)',text):
            parts = [x.strip() for x in re.split(r'\s*/\s*(?=[A-Za-zÀ-ÿ])',text)]
            match = next((x for x in parts if (french.search(x.lstrip('* ')) or re.search(r'Toutes dimensions|Sans chanfrein|Nez vu|avec crochet|En cas de demande|Monolythe|Sur demande',x,re.I)) and not re.search(r'\b(?:pz|pc|Stk)\b',x)),None)
            if match: result=match
            elif foreign.search(text): continue
            else: result=translate(text)
        elif foreign.search(text) or re.search(r'Gitterkorb|Roll Crate|Su richiesta|Su richiesta|disponibile',text,re.I):
            continue
        elif font.startswith('Gill'):
            if re.search(r'\b(?:pz|pc|Stk)\b|\bsp\.',text):
                continue
            if compact in title_map:
                result = title_map[compact]
            elif size >= 12:
                result = translate(text) if len(compact) < 3 or not re.search(r'(?:\w\s){3}',text) else translate(compact)
            elif text in header_map:
                result = header_map[text]
            elif french.search(text):
                result = text.replace('ép. 52/4','ép. 2/4')
            elif re.match(r'^(?:CG|LG|G\d|LUSERNA|ARDESIA|QUARZITE|GRIGIO|MISTO|ROSSICCIO|GIALLO|MINT|GREEN|YELLOW|HIMALAYA|ROSA|INCASTRO|ANTICATO|FIAMMAT|A SPACCO|LAVORATI|BOCCIARDATE|LISTELLO|ANGOLO|PAILLETTES|PAS JAPONAIS)',text,re.I):
                result = translate(text)
                result = {'A SPACCO':'CLIVÉ', 'BOCCIARDATE':'BOUCHARDÉES'}.get(result,result)
            else:
                continue
        elif font.startswith('Myriad'):
            if pno >= 160 and (not french.search(text)) and len(text)>15:
                continue
            if re.match(r'^(?:Piastrelle|Superficie|Gradini superficie|Alzate /|Zoccolino superficie)',text,re.I):
                continue
            result = translate(text)
        else:
            result = translate(text)
        kept.append((line, result))
    remove_text(page)
    registered = {}
    for line, result in kept:
        span=line['spans'][0]; old=clean(''.join(s['text'] for s in line['spans']))
        color=fitz.sRGB_to_pdf(span['color']); size=span['size']; font=span['font']
        # Full Unicode fonts avoid missing glyphs in the manufacturer's subset
        # fonts when Italian labels are replaced with French text.
        if font not in registered:
            key=f'Sax{len(registered)}'
            bold='Bold' in font or 'Black' in font
            italic='Italic' in font
            variant=('-BoldOblique' if bold and italic else '-Bold' if bold else '-Oblique' if italic else '')
            path='/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed'+variant+'.ttf'
            page.insert_font(fontname=key,fontfile=path)
            registered[font]=key
        key=registered[font]
        origin=fitz.Point(span['origin'])
        width=max(1,line['bbox'][2]-line['bbox'][0])
        maxwidth = width if pno==178 and size<=8 else max(width, min(page.rect.width-origin.x-28, width*1.35))
        bold='Bold' in font or 'Black' in font
        italic='Italic' in font
        variant=('-BoldOblique' if bold and italic else '-Bold' if bold else '-Oblique' if italic else '')
        fobj=fitz.Font(fontfile='/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed'+variant+'.ttf')
        length=fobj.text_length(result,fontsize=size)
        if length>maxwidth:
            size*=maxwidth/length
        page.insert_text(origin,result,fontname=key,fontsize=size,color=color)

# French front matter and publication information, without a white patch over
# the historical imprint. Images remain the manufacturer's original images.
editorial(doc[0], 'LE LIVRE\nDES PIERRES', 'Pierres naturelles · SAXSO',
          'Extérieur, parements et intérieur.\n\nUne sélection de matières, de nuances et de finitions pour donner forme à vos projets.',
          'ÉDITION FRANÇAISE 2026', 'Catalogue de présentation sans prix.\n\nMinimum de commande : 4 palettes.\n\nSélectionnez vos articles et demandez un chiffrage sur leroyfactory.fr.')
remove_text(doc[1])
quarry=max(page_images[2],key=lambda x:x['width']*x['height'])
doc[1].insert_image(fitz.Rect(quarry['rect']),filename=ROOT/quarry['url'])
put(doc[1],(75,85,750,245),'SAXSO.\nLA VALEUR S’EXTRAIT\nDE LA CONNAISSANCE',28,(1,1,1),True)
editorial(doc[2],'La pierre. Une histoire\nqui traverse le temps.', 'LE MONDE SAXSO',
          'Fonctionnalité et prestige, matière et valeur : vous entrez dans le monde SAXSO.\n\nUne longue expérience de l’extraction et de la transformation des pierres naturelles accompagne chaque projet, dans la diversité des matières, des nuances et des usages.',
          'UNE MATIÈRE, MILLE POSSIBILITÉS', 'SAXSO recherche de nouvelles solutions pour transformer la créativité en un produit singulier.\n\nDécouvrez les collections, les finitions et leurs caractéristiques dans les pages qui suivent.')
editorial(doc[4],'Des nuances naturelles.\nDes espaces singuliers.', 'LES PIERRES SAXSO',
          'La perfection est une somme de qualités uniques. SAXSO propose une large gamme de pierres naturelles, du porphyre à la quartzite et à la pierre de Luserna, avec différentes coupes et finitions.',
          'CONCEPTION ET MISE EN ŒUVRE', 'SAXSO accompagne la conception et la pose des pierres dans les petits et les grands espaces.\n\nLes couleurs, veines et structures varient naturellement. Les visuels et les caractéristiques du catalogue sont indicatifs.')
editorial(doc[6],'Lire la matière.', 'NUANCES ET FORMATS',
          'V1 · Couleur uniforme\nV2 · Légère différence de nuances\nV3 · Différence de nuances modérée\nV4 · Forte différence de nuances\n\nLongueur libre : dimensions variables.\nLes épaisseurs et les dimensions sont indiquées dans les tableaux.',
          'USAGES ET CONDITIONNEMENTS', 'Les pictogrammes précisent les usages : sols, murs ou sols et murs, et la résistance au gel.\n\nm² : mètre carré · ml : mètre linéaire\nPce : pièce · T : tonne\n\nLes tableaux indiquent l’unité de vente, les quantités par palette ou caisse, par boîte si applicable et le poids par unité de vente.')

def index_page(page, title, selected):
    remove_text(page);page.draw_rect(page.rect,color=None,fill=(.976,.969,.95))
    put(page,(45,35,790,65),'SAXSO  /  SOMMAIRE 2026',11,(.56,.38,.29),True)
    put(page,(45,90,790,160),title,31,bold=True)
    for i,coll in enumerate(selected):
        col=i//10; row=i%10; x=45+col*390; y=190+row*32
        put(page,(x,y,x+340,y+28),f'{coll["name"]}  ·  {coll["page"]}',11)
        page.insert_link(dict(kind=fitz.LINK_GOTO,from_=fitz.Rect(x,y,x+340,y+28),page=coll['page']-1)) if False else None
        page.insert_link({'kind':fitz.LINK_GOTO,'from':fitz.Rect(x,y,x+340,y+28),'page':coll['page']-1})
    put(page,(45,552,790,580),'Minimum de commande : 4 palettes · Cliquez sur une collection pour la consulter.',10)
index_page(doc[7],'Extérieur', [c for c in collections if c['category']=='Extérieur'])
index_page(doc[8],'Parements et intérieur', [collections[18],collections[29]]+[c for c in collections if c['category']=='Intérieur'])
editorial(doc[178],'Pose et traitement.', 'CONSEILS DU FABRICANT',
          'Les revêtements de sols et de murs, à l’intérieur comme à l’extérieur, peuvent être posés avec un mortier traditionnel à base de ciment ou une colle adaptée.\n\nAprès la pose, le jointoiement s’effectue joint par joint. Le catalogue recommande un nettoyage lorsque les joints sont encore frais.',
          'PROTECTION ET VARIATIONS', 'Pour une pose en intérieur, le fabricant recommande une protection antitache hydrofuge et oléofuge, à effet mouillé ou préservant la couleur selon le produit choisi.\n\nLes pierres naturelles peuvent présenter des différences de couleur, de veines et de structure entre les lots et au sein d’un même lot. Les valeurs techniques et esthétiques sont indicatives.')
editorial(doc[179],'Votre projet commence ici.', 'CONTACT USINE · SAXSO',
          'Dora · Service export\nexport@saxso.it\n+39 0175 518090\n\nDépôt : Via Cuneo 38, Fraz. Crocera\n12032 Barge (CN), Italie\n\nSiège : Via Pianacci 2\n38040 Fornace (TN), Italie',
          'LE ROY FACTORY · 2026', 'Minimum de commande : 4 palettes.\n\nCatalogue sans prix. Sélection d’articles et demande de chiffrage sur leroyfactory.fr.\n\nAdaptation française 2026 du catalogue transmis par SAXSO. Conception graphique originale : FERRICOM / SAXSO.\n\nPhotographies et caractéristiques : SAXSO.')
doc[179].insert_link({'kind':fitz.LINK_URI,'from':fitz.Rect(48,326,380,350),'uri':'mailto:export@saxso.it'})
doc[177].draw_rect(fitz.Rect(38,93,170,144),color=None,fill=(1,1,1))

# Site links and PDF bookmarks complement the standalone PDF.
for coll in collections:
    for pno in range(coll['page'],coll['endPage']+1):
        page=doc[pno-1]
        rect=fitz.Rect(210,580,650,593)
        put(page,rect,'Sélection et demande de chiffrage · leroyfactory.fr · minimum 4 palettes',6.5,(.4,.3,.23))
        page.insert_link({'kind':fitz.LINK_URI,'from':rect,'uri':f'https://leroyfactory.fr/saxso-catalogue-interactif.html?collection={coll["id"]}'})
doc.set_toc([[1,'Catalogue SAXSO · Français 2026',1],[1,'Sommaire · Extérieur',8],
             [1,'Sommaire · Parements et intérieur',9]]+
            [[1,c['category']+' · '+c['name'],c['page']] for c in collections]+[[1,'Pose et traitement',179],[1,'Contacts et conditions',180]])
doc.set_metadata({'title':'SAXSO · Catalogue 2026 · Français','author':'SAXSO / LE ROY FACTORY',
                  'subject':'Pierres naturelles · Minimum de commande : 4 palettes · Sans prix',
                  'keywords':'SAXSO, pierre naturelle, français, 2026',
                  'creator':'Adaptation française LE ROY FACTORY', 'producer':'PyMuPDF',
                  'creationDate':'D:20261112120000+01\'00\'', 'modDate':'D:20261112120000+01\'00\''})
doc.set_xml_metadata('')
doc.save(PDF,garbage=4,deflate=True)
output=dict(version='20261112-saxso1',year=2026,language='fr',minimumPallets=4,
            contact=dict(name='Dora',email='export@saxso.it',phone='+39 0175 518090'),
            pdf=str(PDF.relative_to(ROOT)),collections=collections,
            provenance=dict(sourceFilename=SOURCE.name,sourceSha256=hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
                            pages=180,nativePhotos=len(image_assets),priceDataIncluded=False))
DATA.write_text(json.dumps(output,ensure_ascii=False,separators=(',',':'))+'\n')
print(json.dumps({'collections':len(collections),'variants':sum(len(c['variants']) for c in collections),
                  'nativePhotos':len(image_assets),'pdfBytes':PDF.stat().st_size,
                  'emptyCollections':[c['name'] for c in collections if not c['variants']]},ensure_ascii=False))

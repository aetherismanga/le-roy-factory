#!/usr/bin/env python3
"""Audit and map every SAXSO variant to the actual source-PDF illustration.

Read-only with respect to the public catalogue. Output is an intermediate
evidence manifest; a small PDF image is never labelled as a high-definition
photograph. Geometry is obtained from the printed section heading and row.
"""
from __future__ import annotations

import argparse
import collections
import difflib
import hashlib
import json
import math
import re
import unicodedata
from pathlib import Path

import fitz

HEADINGS = {
    'BORDI PISCINA': ('coping', 'Margelle'),
    'ZOCCOLINO': ('skirting', 'Plinthe'),
    'ALZATE / ZOCCOLINO': ('riser-skirting', 'Contremarche / plinthe'),
    'ALZATE': ('riser', 'Contremarche'),
    'COPERTINE': ('wall-cap', 'Couvertine'),
    'GRADONI': ('block-step', 'Marche bloc'),
    'GRADINI': ('step', 'Marche'),
    'PALISSADES': ('palisade', 'Palissade'),
    'PAS JAPONAIS': ('stepping-stone', 'Pas japonais'),
    'SFERE': ('sphere', 'Sphère'),
    'CORDOLI': ('kerb', 'Bordure'),
    'BINDERI': ('binder', 'Boutisse'),
    'TOPURE DA MURO': ('walling-stone', 'Pierre à muret'),
    'BLOCCHETTI TRANCIATI': ('wall-block', 'Barrette clivée'),
    'BLOCCHETTI': ('wall-block', 'Barrette'),
    'BLOCCHI DA MURO': ('wall-block', 'Bloc à muret'),
    'CUBETTI': ('cobble', 'Pavé'),
    'QUADRETTONI': ('roman-opus', 'Dalle opus romain'),
    'LOSETTE': ('roofing-slab', 'Lauze'),
    'MOSAICO BUGNATO': ('rough-opus', 'Opus bosselé'),
    'MOSAICO': ('crazy-paving', 'Opus incertum'),
    'MURETTI': ('cladding', 'Parement'),
    'LISTELLI': ('strip-cladding', 'Lamelle de parement'),
    'ANGOLI': ('corner', 'Angle'),
    'CIOTTOLI': ('pebbles', 'Galets'),
    'GRANULATI': ('gravel', 'Gravillons'),
    'PAILLETTES': ('chips', 'Paillettes'),
    'LASTRE': ('slab', 'Tranche'),
    'PIASTRE': ('slab', 'Tranche'),
    'PIASTRELLE': ('tile', 'Dalle'),
    'PIASTRELLE LATI SEGATI': ('sawn-tile', 'Dalle côtés sciés'),
    'PIASTRELLE LATI TRANCIATI': ('cleft-tile', 'Dalle côtés clivés'),
    'PIASTRELLE PIANO FIAMMATO': ('flamed-tile', 'Dalle flammée'),
}
FINISHES = [
    ('sabbiat', 'Sablé'), ('spazzolat', 'Brossé'), ('levigat', 'Adouci'),
    ('anticat', 'Vieilli'), ('fiammat', 'Flammé'), ('bocciardat', 'Bouchardé'),
    ('spacco', 'Brut de clivage'), ('punta', 'Smillé'), ('lucid', 'Poli'),
]
FR_FINISHES=[('sabl','Sablé'),('bross','Brossé'),('adouc','Adouci'),('vieill','Vieilli'),('flamm','Flammé'),('bouchard','Bouchardé'),('clivage','Brut de clivage'),('poli','Poli')]
COLORS = [
    'Grey', 'Dark', 'Light', 'Classico', 'Classique', 'Crema', 'Beige',
    'Grigio', 'Misto', 'Mista', 'Blu', 'Rossiccio', 'Dorée', 'Doree',
    'Rosa Oriente', 'Giallo Imperiale', 'Giallo Ocra', 'Giallo', 'Rosa',
    'Mint', 'Black', 'Yellow Brown', 'Himalaya Grey', 'Multicolor',
    'G603', 'G654', 'G684', 'Ghiaccio', 'Nera', 'Nero', 'Bianca', 'Bianco',
    'Verde', 'Fossil', 'Sahara', 'Desert', 'Metal', 'Rusty', 'Mountain Mix',
    'Fujian', 'Polar White', 'Metal Grey', 'Perla Nera', 'Atlantic Silver',
]


def norm(value):
    value = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '', value)


def lines(page):
    out = []
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines', []):
            text = re.sub(r'\s+', ' ', ''.join(s['text'] for s in line['spans'])).strip()
            if text:
                out.append({'text': text, 'bbox': list(line['bbox'])})
    return out


def geometry_from_reference(v, collection, heading):
    t = v['reference'] + ' ' + v['label']
    n = norm(t)
    for stem, kind, label in [('ciottol','pebbles','Galets'),('granulati','gravel','Gravillons'),('paillettes','chips','Paillettes'),('massi','boulder','Bloc décoratif')]:
        if stem in n:
            return kind,label
    for stem,kind,label in [('cubett','cobble','Pavé'),('gradon','block-step','Marche bloc'),('gradin','step','Marche'),('cordol','kerb','Bordure'),('copertin','wall-cap','Couvertine'),('bordipiscina','coping','Margelle')]:
        if stem in n:
            return kind,label
    if 'angolo' in n or re.search(r'\bAngle\b', t):
        return 'corner', 'Angle'
    if 'muretto' in n:
        return 'cladding', 'Parement'
    if 'listell' in n:
        return 'strip-cladding', 'Lamelle de parement'
    if 'zoccolino' in n or 'plinthe' in n:
        return 'skirting', 'Plinthe'
    if 'margelle' in n:
        return 'coping', 'Margelle'
    if 'contremarche' in n:
        return 'riser', 'Contremarche'
    if 'marchesbloc' in n:return 'block-step','Marche bloc'
    if 'marches' in n:return 'step','Marche'
    if 'tranches' in n:return 'slab','Tranche'
    if 'opusincertum' in n or 'mosaico' in n:
        return 'crazy-paving', 'Opus incertum'
    if 'losette' in n or 'lauzes' in n:
        return 'roofing-slab', 'Lauze'
    if v['page']==31:
        return 'crazy-paving','Opus incertum'
    if v['page']==63:
        return 'cobble','Pavé'
    if v['page']==72 and heading is None and v['unit']=='m²':
        return 'cobble','Pavé'
    if v['page']==74:
        return 'step','Marche'
    if v['page']==75:
        return 'crazy-paving','Opus incertum'
    if v['page']==113:
        return 'flamed-tile','Dalle flammée'
    if heading:
        return heading['kind'], heading['label']
    if collection['category'] == 'Parement':
        return 'cladding', 'Parement'
    return 'tile', 'Dalle'


def choose_row(v, page_lines):
    m = re.match(r'saxso-\d+-(\d+)-(\d+)-', v['id'])
    if not m:
        return None
    unit_x, row_y = map(float, m.groups())
    nearby = [l for l in page_lines if abs(l['bbox'][1] - row_y) < 12 and l['bbox'][0] < unit_x - 2]
    needle = norm(v['reference'])
    scored = [(difflib.SequenceMatcher(None, needle, norm(l['text'])).ratio(), l) for l in nearby]
    best = max(scored, default=(0, None), key=lambda x: x[0])
    if best[1] and best[0] > .23:
        return {**best[1], 'unitX': unit_x, 'rowY': row_y, 'matchScore': round(best[0], 3)}
    return {'text': '', 'bbox': [unit_x - 160, row_y, unit_x - 10, row_y + 11], 'unitX': unit_x, 'rowY': row_y, 'matchScore': 0}


def heading_for(row, page_headings):
    if not row:
        return None
    x, y = row['bbox'][0], row['bbox'][1]
    possible = [h for h in page_headings if h['bbox'][1] < y and abs(h['bbox'][0] - x) < 140]
    if not possible:
        return None
    return min(possible, key=lambda h: abs(h['bbox'][0] - x) + (y - h['bbox'][1]) * .025)


def source_color(v):
    t = v['reference']
    values = [x for x in COLORS if re.search(r'(?<!\w)' + re.escape(x) + r'(?!\w)', t, re.I)]
    return [x for x in values if not any(x.lower() != z.lower() and x.lower() in z.lower() for z in values)]


def codes_in(text):
    return sorted(set(a.upper()+b+c.upper() for a,b,c in re.findall(r'\b([CL]G)\s*(\d{3})\s*([A-Z]?)(?![A-Z])',text,re.I)))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    root, out = args.root.resolve(), args.output.resolve()
    out.mkdir(parents=True, exist_ok=True)
    media = out / 'pdf-native'
    media.mkdir(exist_ok=True)
    source = root / 'assets/pdf/Book_of_stones_Saxso_2023_OK.pdf'
    catalogue = json.loads((root / 'assets/data/saxso-catalogue.json').read_text())
    doc = fitz.open(source)
    pages, all_images, seen = {}, [], {}
    active_pages = {p for c in catalogue['collections'] for p in range(c['page'], c['endPage'] + 1)}
    for pno in sorted(active_pages):
        page, page_lines = doc[pno - 1], lines(doc[pno - 1])
        page_headings = []
        for line in page_lines:
            if line['text'] in HEADINGS:
                kind, label = HEADINGS[line['text']]
                page_headings.append({**line, 'kind': kind, 'label': label})
        images = []
        for info in page.get_image_info(xrefs=True):
            if not info['xref'] or info['width'] < 40 or info['height'] < 35:
                continue
            xref, bbox = info['xref'], list(info['bbox'])
            if xref not in seen:
                data = doc.extract_image(xref)
                local = media / f'photo-{xref}.{data["ext"]}'
                local.write_bytes(data['image'])
                seen[xref] = {'filename': local.name, 'localPath': str(local), 'sha256': hashlib.sha256(data['image']).hexdigest()}
            asset = {**seen[xref], 'xref': xref, 'width': info['width'], 'height': info['height'], 'bbox': bbox, 'page': pno}
            center_x = (bbox[0] + bbox[2]) / 2
            captions = [l for l in page_lines if -65 <= l['bbox'][1] - bbox[3] <= 58 and abs((l['bbox'][0]+l['bbox'][2])/2-center_x) < max(180,(bbox[2]-bbox[0])*.65) and not re.search(r'\bsp\.',l['text'],re.I)]
            ranked = sorted(captions, key=lambda l: abs(l['bbox'][1]-bbox[3]) + abs((l['bbox'][0]+l['bbox'][2])/2-center_x)*.12)
            asset['captions'] = [c['text'] for c in ranked[:8]]
            asset['codes'] = next((codes_in(t) for t in asset['captions'] if codes_in(t)),[])
            asset['primaryColorCaption'] = next((t for t in asset['captions'] if any(norm(co) in norm(t) for co in COLORS)),None)
            asset['belowOriginalFilter'] = info['width'] < 180 or info['height'] < 100
            asset['pixels'] = info['width'] * info['height']
            asset['role'] = 'ambience' if asset['pixels'] > 180000 and max(info['width'],info['height']) > 450 else 'product-or-material'
            asset['heading'] = heading_for({'bbox':bbox},page_headings)
            images.append(asset)
            all_images.append(asset)
        pages[pno] = {'page':pno,'headings':page_headings,'images':images,'lines':page_lines}

    variants = []
    for c in catalogue['collections']:
        for v in c['variants']:
            page = pages[v['page']]
            row = choose_row(v,page['lines'])
            heading = heading_for(row,page['headings'])
            kind,kind_label = geometry_from_reference(v,c,heading)
            code_values=codes_in(v['reference']);code=code_values[0] if code_values else None
            color = source_color(v)
            product_images = [i for i in page['images'] if i['role']!='ambience']
            if code:
                direct = [i for i in product_images if code.upper() in [k.upper() for k in i['codes']]]
                # A caption is paired only to the nearest illustration above it.
                if len(direct)>1:
                    direct = sorted(direct,key=lambda i: min((abs(l['bbox'][1]-i['bbox'][3]) for l in page['lines'] if code.upper() in codes_in(l['text']) and l['bbox'][1]>=i['bbox'][3]-38),default=999))
                candidates = direct or product_images
                reason = 'code-caption' if direct else 'page-unresolved'
            else:
                candidates,reason = product_images,'printed-table-column'
                aligned=[im for im in candidates if heading and im['heading'] and im['heading']['kind']==heading['kind']]
                if aligned:candidates=aligned
            def score(im):
                s = 0.0
                if row:
                    target_x = row['bbox'][0]+100
                    s -= abs((im['bbox'][0]+im['bbox'][2])/2-target_x)*.5
                    if im['bbox'][3] <= row['bbox'][1]+10:
                        s += 30
                if heading and im['heading'] and heading['kind']==im['heading']['kind']:
                    s += 120
                for co in color:
                    if norm(co) in norm(im['primaryColorCaption'] or ''):
                        s += 600
                for style in ['REGULAR','SLIM','A SPACCO']:
                    if style.lower() in v['reference'].lower() and style in ' '.join(im['captions'][:4]):s+=250
                if code and code.upper() in [k.upper() for k in im['codes']]:
                    s += 10000
                return s
            candidates=sorted(candidates,key=score,reverse=True)
            selected = candidates[0] if candidates else None
            confidence = 'high' if reason=='code-caption' or selected and row and abs((selected['bbox'][0]+selected['bbox'][2])/2-(row['bbox'][0]+100))<150 else 'review'
            if c['category']=='Intérieur':
                confidence,reason='review','interior-finish-matrix-has-no-dimensions'
                candidates=page['images']
                selected=None
            dimensions = re.findall(r'\d+(?:[,.]\d+)?\s*[x×]\s*\d+(?:[,.]\d+)?(?:\s*[x×]\s*\d+(?:[,.]\d+)?)?',v['reference'],re.I)
            thickness = re.search(r'\bsp\.?\s*([\d.,/]+)\s*(cm|mm)',v['reference'],re.I)
            finishes=list(dict.fromkeys([label for stem,label in FINISHES if stem in v['reference'].lower()]+[label for stem,label in FR_FINISHES if stem in norm(v['reference'])]))
            # The printed finish immediately over the image belongs to the
            # table column. Keep it as source evidence even if the row omits it.
            surface=[]
            if selected and row:
                imx=(selected['bbox'][0]+selected['bbox'][2])/2
                surface=[l['text'] for l in page['lines'] if l['text'].lower().startswith(('superficie','surface ')) and l['bbox'][1]<selected['bbox'][1]+15 and abs(l['bbox'][0]-selected['bbox'][0])<90]
            if not finishes and surface:
                ftext=' '.join(surface).lower()
                finishes=[label for stem,label in FINISHES if stem in ftext]
                if not finishes and 'brute de clivage' in ftext:finishes=['Brut de clivage']
            record={'id':v['id'],'collectionId':c['id'],'collection':c['name'],'category':c['category'],'reference':v['reference'],'label':v['label'],'page':v['page'],'kind':kind,'kindLabel':kind_label,'productType':kind,'productTypeLabel':kind_label,'dimensions':dimensions,'thickness':thickness.group(1)+' '+thickness.group(2) if thickness else None,'colors':color,'color':' / '.join(color) or None,'finishes':finishes,'surfaceFinish':' · '.join(finishes) or None,'surfaceFinishSource':surface,'row':row,'heading':heading,'mappingBasis':reason,'confidence':confidence,'matchConfidence':confidence,'selected':selected,'productPhoto':selected,'candidates':candidates[:4]}
            if not candidates:
                record['issue']='No product or material sample on source page; do not substitute an ambience as an exact article image.'
            variants.append(record)

    # Enforce known colours. A grey reference cannot inherit a dorée or mint
    # photograph simply because it is closest to the printed table column.
    for v in variants:
        if not v['selected'] or not v['colors'] or v['mappingBasis']=='code-caption':continue
        cs=v['candidates']
        matching=[i for i in cs if any(norm(co) in norm(i['primaryColorCaption'] or '') for co in v['colors'])]
        if not matching:
            # Some colour sample rows sit outside the heading's column, while
            # the table spans all five colours (Luserna opus, palisades).
            pool=[i for i in pages[v['page']]['images'] if i['role']!='ambience' and (not i['heading'] or i['heading']['kind']==v['productType'])]
            matching=[i for i in pool if any(norm(co) in norm(i['primaryColorCaption'] or '') for co in v['colors'])]
        captioned=[i for i in cs if i['primaryColorCaption']]
        if matching:
            v['selected']=v['productPhoto']=matching[0]
            v['confidence']=v['matchConfidence']='high'
            v['mappingBasis']='color-caption-and-section'
        elif captioned:
            v['selected']=v['productPhoto']=None
            v['confidence']=v['matchConfidence']='review'
            v['mappingBasis']='exact-color-not-illustrated-on-page'

    # Interior pages are finish-availability matrices, not new SKU dimensions.
    # Reuse documented exterior product photos only when the shape and finish
    # exist, preserving all eligible source alternatives for colour choice.
    for v in variants:
        if v['category']!='Intérieur':continue
        exterior=[w for w in variants if w['category']!='Intérieur' and w['collection']==v['collection'] and w['productPhoto']]
        tile_kinds={'tile','sawn-tile','cleft-tile','flamed-tile','slab'}
        def same_kind(w):return w['productType']==v['productType'] or v['productType'] in tile_kinds and w['productType'] in tile_kinds
        eligible=[w for w in exterior if same_kind(w) and all(f in w['finishes'] for f in v['finishes'])]
        if v['productType']=='skirting' and not eligible:
            eligible=[w for w in exterior if w['productType']=='riser-skirting' and all(f in w['finishes'] for f in v['finishes'])]
        if not eligible:eligible=[w for w in exterior if same_kind(w)]
        by_image={w['productPhoto']['xref']:w for w in eligible}
        if by_image:
            chosen=next(iter(by_image.values()))
            v['selected']=v['productPhoto']=chosen['productPhoto']
            v['candidates']=[w['productPhoto'] for w in by_image.values()][:8]
            v['mappingBasis']='same-material-exterior-product'
            v['confidence']=v['matchConfidence']='material-only' if len(by_image)>1 else 'high'
            v['sourceVariantIds']=[w['id'] for w in by_image.values()]
            v['availableColors']=list(dict.fromkeys(co for w in eligible for co in w['colors']))
            v['issue']='Interior source lists finishes without a sellable format; keep dimensions unconfirmed and label this as a material photograph.'

    # Contract for the consuming enrichment build, keeping exact source IDs.
    for v in variants:
        p=v['productPhoto']
        if v['confidence']=='review':
            # Never upgrade a review-only association into a SKU photograph.
            # Keep same-material evidence available to the geometric renderer.
            if p:
                v['materialPhoto']=p
            elif v['collection']=='Pierre de Luserna' and v['color']=='Grigio':
                v['materialPhoto']=next((i for i in all_images if i['xref']==34),None)
            elif v['color']=='G654':
                v['materialPhoto']=next((i for i in all_images if i['xref']==928),None)
            else:v['materialPhoto']=None
            v['productPhoto']=v['selected']=None
            p=v['materialPhoto']
            v['matchConfidence']='material-only' if p else 'review'
            v['issue']='The source identifies the material but does not prove this precise SKU photograph. Render a labelled geometric illustration using the sourced material, without claiming a SKU photograph.'
        v['source']={'type':'official-source-pdf','page':p['page'] if p else v['page'],'xref':p['xref'] if p else None,'nativeWidth':p['width'] if p else None,'nativeHeight':p['height'] if p else None,'cataloguePage':v['page']}
        crop={251:[85,45,135,70],249:[95,45,125,60],280:[95,45,125,60],282:[95,45,125,60]}.get(p['xref']) if p else None
        v['materialCropRect']=crop
        v['materialCropRectUnits']='native-image-pixels-x-y-width-height' if crop else None
        v['materialPhoto']={**p,'cropRect':crop} if p else None
        v['surfaceFinishStatus']='documented' if v['surfaceFinish'] else 'not-specified-in-source-row'
        v['productTypeSource']={'page':v['page'],'text':v['heading']['text'] if v['heading'] else v['reference']}

    assert len(variants)==sum(len(c['variants']) for c in catalogue['collections'])
    unique={i['xref']:i for i in all_images}
    excluded=[i for i in unique.values() if i['belowOriginalFilter']]
    selected=[v['selected'] for v in variants if v['selected']]
    summary={'schema':'saxso-visual-source-audit-v1','sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'collections':len(catalogue['collections']),'variants':len(variants),'sourcePages':len(pages),'sourceImageObjects':len(unique),'formerlyIgnoredImageObjects':len(excluded),'nativeHDImageObjects':sum(i['width']>=1600 or i['height']>=1600 for i in unique.values()),'productImageObjects':sum(i['role']=='product-or-material' for i in unique.values()),'variantKinds':dict(collections.Counter(v['kind'] for v in variants)),'mappedByCodeCaption':sum(v['mappingBasis']=='code-caption' for v in variants),'reviewNeeded':sum(v['confidence']=='review' for v in variants),'selectedProductNativeMaxWidth':max((i['width'] for i in selected),default=0),'selectedProductNativeMedianWidth':sorted(i['width'] for i in selected)[len(selected)//2] if selected else 0,'rule':'Source photos below native resolution must be presented as source details, not falsely described as HD. Use exact manufacturer HD sources or a separately labelled faithful product illustration.'}
    for name,data in [('variant-candidates.json',{'summary':summary,'variants':variants}),('source-pages.json',list(pages.values())),('audit-summary.json',summary),('formerly-ignored-images.json',excluded),('review-needed.json',[v for v in variants if v['confidence']=='review'])]:
        (out/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    keep=['id','collectionId','collection','category','reference','label','page','productType','productTypeLabel','productTypeSource','dimensions','thickness','color','colors','surfaceFinish','surfaceFinishStatus','surfaceFinishSource','mappingBasis','matchConfidence','source','materialCropRect','materialCropRectUnits','issue','availableColors']
    compact=[]
    for v in variants:
        row={k:v[k] for k in keep if k in v}
        for key in ['productPhoto','materialPhoto']:
            im=v[key]
            row[key]={k:im[k] for k in ['xref','page','localPath','filename','width','height','bbox','cropRect','sha256','captions','primaryColorCaption'] if k in im} if im else None
        compact.append(row)
    (out/'variant-visual-map.json').write_text(json.dumps({'schema':'saxso-variant-visual-map-v1','summary':summary,'variants':compact},ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(summary,ensure_ascii=False,indent=2))


if __name__=='__main__':
    main()

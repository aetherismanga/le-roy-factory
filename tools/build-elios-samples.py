"""Import supplier articles and indicative values without agent allocations."""
import argparse, hashlib, json, re, unicodedata, subprocess
from pathlib import Path
import fitz
import openpyxl
from elios_merchandising_values import read_merchandising, refresh_catalogue_values

ROOT = Path(__file__).resolve().parents[1]
def norm(value):
    return re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFD', str(value or '')).encode('ascii','ignore').decode().lower())
def dimensions(value):
    found = re.search(r'(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+(?:[.,]\d+)?)',str(value))
    return tuple(sorted(round(float(x.replace(',','.')),1) for x in found.groups())) if found else None

def run(source):
    catalogue=json.loads((ROOT/'shared/lrf-3d/commercial-surfaces.json').read_text())
    manufacturers=json.loads((ROOT/'shared/lrf-3d/manufacturer-surfaces.json').read_text())
    collections={x['name']:x for x in manufacturers if x['brand']=='ELIOS'}
    source_text=(ROOT/'assets/js/inspirations-elios-data.js').read_text()
    existing=json.loads(re.search(r'window.ELIOS_CATALOGUE\s*=\s*(\[.*?\]);',source_text,re.S).group(1))
    slugs={norm(p['name']):p['slug'] for p in existing}
    rules=[]
    sheet=openpyxl.load_workbook(source/'source-2.xlsx',data_only=True)['magazzino_Rubiera_']
    for row in list(sheet.values)[1:]:
        if not row[0] or 'TOTAL' in str(row[0]):continue
        rules.append({'collection':str(row[0]).strip(),'format':str(row[1] or '').strip(),'finish':str(row[2] or '').strip(),'references':row[3],'decors':row[4]})
    aliases={'millenniumquartz':'milleniumquartz','azulimood':'azuli','sedimenti':'sedimentiselected','designevo':'designevo'}
    def allowed(p):
        name=norm(p['collection']); fmt=dimensions(p['format']); finish=norm(p.get('finish'))
        for rule in rules:
            rname=norm(rule['collection'])
            if not (aliases.get(name,name)==rname or name=='sedimenti' and rname=='sedimentitumbled' or name.startswith('poolsurfaces') and rname=='piscine' or name=='terreetrusche' and rname=='terreetruscheesagonetta'):continue
            rfmt=dimensions(rule['format'])
            # Commercial dimensions are actual calibrated sizes. These two
            # explicit catalogue labels are the supplier's nominal formats.
            same=fmt==rfmt or name=='venere' and rfmt==(33.0,100.0) and fmt==(33.3,100.0) or name in ['yosemite','quercia'] and rfmt==(24.0,120.0) and fmt==(23.4,119.5)
            if not same and not ('ESAG' in rule['format'].upper() and ('hex' in finish or 'esag' in finish)):continue
            # The version-9 list names the standard samples. It does not
            # authorize outdoor / 20 mm, polished or lapped variants merely
            # because the collection and dimensions happen to match.
            if '20mm' in finish and '20' not in rule['finish']:continue
            if 'r11' in finish and 'R11' not in rule['finish'].upper():continue
            if any(x in finish for x in ['poli','lapp','polish']) and not any(x in norm(rule['finish']) for x in ['poli','lap']):continue
            if name in ['quercia','yosemite'] and 'RETT' in rule['finish'].upper() and not any(x in finish for x in ['rectif','rett']):continue
            if 'tumbled' in rname and 'tumbled' not in finish:continue
            if 'selected' in rname and 'tumbled' in finish:continue
            if 'R9' in rule['finish'].upper() and 'r9' not in finish:continue
            if 'R10' in rule['finish'].upper() and 'r10' not in finish:continue
            if 'R11' in rule['finish'].upper() and 'r11' not in finish:continue
            if 'SOFT' in rule['finish'].upper() and not any(x in finish for x in ['soft','matt']):continue
            if 'GLOS' in rule['finish'].upper() and not any(x in finish for x in ['gloss','lucid']):continue
            if rule['decors'] is None and re.search(r'decor|prestige|intars|fenix|rebel|palm|art\b',p['color']+' '+p.get('finish',''),re.I):continue
            return True
        return False
    products=[]
    for p in catalogue['products']:
        if p['brand']!='ELIOS':continue
        c=collections.get(p['collection'],{})
        color=next((x for x in c.get('colors',[]) if x['id']==p['colorId']),{})
        faces=color.get('textureVariants',{}).get('max') or color.get('faces') or []
        image=faces[0] if faces else p.get('preview')
        products.append({k:p.get(k) for k in ['key','reference','collection','color','colorId','format','finish','packVerified','packArea','packPieces','packSource']}|{
            'slug':slugs.get(norm(p['collection']), 'pool-'+p['collection'].split('—')[-1].strip().lower().replace(' ','-') if p['collection'].startswith('Pool Surfaces') else p['collection']),
            'image':image,'thumbnail':color.get('file') or image,'available3d':color.get('available3d',False),
            'definitionLimited':bool(color.get('definitionLimited') or p.get('definitionLimited')),
            'reconstructed':color.get('textureProvenance',{}).get('kind')=='ai-reconstruction',
            'vrac':allowed(p),'sampleReference':p['reference'],'priceUnit':p.get('priceUnit','m²')})
    # The user explicitly requests these instrument values for information.
    # They are not client amounts payable; never include agent allocations.
    merchandising=read_merchandising(source/'source-0.xlsx')
    out=ROOT/'assets/img/elios-merchandising-2026';out.mkdir(parents=True,exist_ok=True)
    pages=[]
    books=['merch-0.pdf','merch-1.pdf']+(['merch-latest.pdf'] if (source/'merch-latest.pdf').exists() else [])
    used=set()
    for number,filename in enumerate(books):
        doc=fitz.open(source/filename)
        for page_index,page in enumerate(doc):
            text=page.get_text();codes=set(re.findall(r'\b(?:E[A-Z0-9]{3,10}|\d{3}[A-Z]{2}\d{2}[A-Z]?)\b',text))
            if not codes.intersection(merchandising):continue
            # Supplier books include internal budget contributions. Remove
            # their numeric prices from customer-facing visual extracts.
            for block in page.get_text('dict')['blocks']:
                for line in block.get('lines',[]):
                    spans=line['spans']
                    if any('€' in s['text'] for s in spans):
                        for s in spans:page.add_redact_annot(fitz.Rect(s['bbox']),fill=(1,1,1))
            page.apply_redactions(images=0)
            name=f'book-{number+1}-p{page_index+1:03}'
            pix=page.get_pixmap(matrix=fitz.Matrix(2,2),alpha=False)
            from PIL import Image
            img=Image.frombytes('RGB',[pix.width,pix.height],pix.samples)
            img.save(out/(name+'.webp'),quality=91,method=6)
            img.thumbnail((440,440));img.save(out/(name+'-thumb.webp'),quality=84,method=6)
            used.update([name+'.webp',name+'-thumb.webp'])
            for code in codes:
                if code in merchandising:
                    item=merchandising[code];image={'image':f'assets/img/elios-merchandising-2026/{name}.webp','thumbnail':f'assets/img/elios-merchandising-2026/{name}-thumb.webp','page':page_index+1,'book':'Cersaie 2026' if number==0 else 'Merchandising 2026 · septembre' if number==2 else 'Merchandising 2026'}
                    images=item.setdefault('images',[])
                    if number==2 and not any(x['book']=='Cersaie 2026' for x in images):images.insert(0,image)
                    else:images.append(image)
            pages.append({'codes':sorted(codes),'image':f'assets/img/elios-merchandising-2026/{name}.webp','page':page_index+1,'book':number})
    for item in merchandising.values():
        if not item.get('images'):
            # No unrelated or approximate photo is substituted for a reference.
            item['images']=[]
    for generated in out.glob('book-*.webp'):
        if generated.name not in used:generated.unlink()
    data={'version':'20261112-elios-samples-v2','budgetYear':2027,'sourceDate':'2026-11-12','rules':rules,'products':products,'merchandising':list(merchandising.values()),'documents':pages,'sources':[{'file':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in source.glob('*') if p.suffix in ['.xlsx','.pdf']]}
    dest=ROOT/'assets/data/elios-samples.json';dest.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
    # The function receives the same public definitions for canonical validation.
    (ROOT/'functions/elios-samples-catalogue.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
    subprocess.run(['node', str(ROOT/'tools/refresh-elios-sample-media.mjs')], cwd=ROOT, check=True)
    print(json.dumps({'products':len(products),'vrac':sum(p['vrac'] for p in products),'merchandising':len(merchandising),'merchandisingWithImages':sum(bool(p['images']) for p in merchandising.values()),'pages':len(pages)}))

def refresh_values(source):
    merchandising=read_merchandising(source/'source-0.xlsx')
    for path in [ROOT/'assets/data/elios-samples.json',ROOT/'functions/elios-samples-catalogue.json']:
        data=refresh_catalogue_values(json.loads(path.read_text()),merchandising)
        path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
    print(json.dumps({'merchandising':len(merchandising),'priced':sum(item['valueUnitHT'] is not None for item in merchandising.values()),'imagesPreserved':True}))

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('source',type=Path)
    parser.add_argument('--values-only',action='store_true',help='Refresh values without rebuilding any media')
    args=parser.parse_args()
    (refresh_values if args.values_only else run)(args.source)

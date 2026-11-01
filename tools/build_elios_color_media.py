#!/usr/bin/env python3
"""Collect named colour samples from the manufacturer's own collection cards.

The source cards associate a title with a concrete file. No colour is inferred
from an atmosphere photograph or an approximate filename. Originals remain HD
manufacturer files; local WebP files are bounded display derivatives.
"""
from __future__ import annotations
import argparse
import concurrent.futures
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess
import unicodedata
from urllib.parse import urljoin
from urllib.request import Request, urlopen
from lxml import html
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
HOST = 'https://eliosceramica.com'
UPLOADS = HOST + '/wp-content/uploads/'
OUTPUT = ROOT / 'assets/js/inspirations-elios-color-media-20261101.js'
MEDIA = ROOT / 'assets/img/elios-colors-20261101'
CACHE = Path('/tmp/elios-color-source-cache')
ALIASES = {'millennium-quartz':'millenium-quartz','d-esign-evo':'design-evo',
           'loveanddecors-creative':'love-decors','loveanddecors':'love-decors-2'}
COLOUR_LABEL_ALIASES = {('deco','Décors'):'DECORI',('hexagon','Décors'):'DECORI',
                       ('segmento','Caeruleus'):'CAERLUEUS',('segmento','Viridis'):'VIRIDISIS'}
DELEGATED = {'dynasty','montblanc','stone-icon','terraforma'}

def norm(value):
    return re.sub(r'[^a-z0-9]', '', ''.join(c for c in unicodedata.normalize('NFD',str(value)).lower() if not unicodedata.combining(c)))

def fetch(url, suffix):
    CACHE.mkdir(exist_ok=True)
    target = CACHE / (hashlib.sha256(url.encode()).hexdigest() + suffix)
    if target.exists(): return target.read_bytes()
    with urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0 (compatible; LRF catalogue verification)'}),timeout=35) as response:
        payload=response.read()
    target.write_bytes(payload)
    return payload

def product_rows():
    code = '''const fs=require('fs'),vm=require('vm'),window={};const context=vm.createContext({window});for(const p of ['assets/js/inspirations-elios-data.js','assets/js/inspirations-elios-cersaie-2026.js'])vm.runInContext(fs.readFileSync(p,'utf8'),context);console.log(JSON.stringify(window.ELIOS_CATALOGUE.map(p=>({slug:p.slug,name:p.name,colors:p.colors||[]}))));'''
    return json.loads(subprocess.check_output(['node','-e',code],cwd=ROOT,text=True))

def parse_page(row):
    slug=row['slug']
    page=HOST+'/collezione/'+ALIASES.get(slug,slug)+'/'
    try:
        payload=fetch(page,'.html')
        doc=html.fromstring(payload)
        title=' '.join(doc.xpath('//h1//text()')).strip()
        cards=[]
        for card in doc.xpath('//li[contains(concat(" ",normalize-space(@class)," ")," colore ")]'):
            label=' '.join(card.xpath('.//h2//text()')).strip()
            if not label: continue
            files=[]
            for key in ['data-file','data-file2']:
                value=card.get(key,'')
                if value and not value.lower().endswith(('.pdf','.svg')):
                    url=urljoin(UPLOADS,value.lstrip('/')) if value.startswith('/') else urljoin(page,value)
                    suffix='2' if key=='data-file2' else ''
                    width=int(card.get('data-w'+suffix,'0') or 0)
                    height=int(card.get('data-h'+suffix,'0') or 0)
                    files.append((url,width,height))
            # The tacca is often only a 92–100 px palette chip. Prefer the
            # named large material-detail file; never upscale a tiny chip.
            for url,width,height in files:
                cards.append({'label':label,'url':url,'cardSlug':card.get('data-slug',''),'sourcePage':page,'advertisedWidth':width,'advertisedHeight':height})
        by_label={}
        for item in cards:
            by_label.setdefault(norm(item['label']),[]).append(item)
        for values in by_label.values():
            values.sort(key=lambda item: (-item['advertisedWidth']*item['advertisedHeight'],'tacca' in item['url'].lower(),item['url']))
        choices=[];missing=[]
        for color in row['colors']:
            label=COLOUR_LABEL_ALIASES.get((slug,color),color)
            candidates=by_label.get(norm(label),[])
            if slug=='segmento' and color=='Duplex':
                candidates=[values[0] for key,values in by_label.items() if key in ['duplexa','duplexb','duplexc','duplexd','duplexe','duplexf']]
                choices.extend({'slug':slug,'color':color,**candidate} for candidate in candidates)
                if not candidates:missing.append(color)
                continue
            if candidates:
                choices.append({'slug':slug,'color':color,**candidates[0]})
            else: missing.append(color)
        return {'slug':slug,'page':page,'title':title,'choices':choices,'missing':missing,'availableLabels':list(dict.fromkeys(item['label'] for item in cards))}
    except Exception as error:
        return {'slug':slug,'page':page,'choices':[],'missing':row['colors'],'error':str(error)}

def derivative(choice):
    url=choice['url']
    try:
        data=fetch(url,'.image')
        picture=Image.open(io.BytesIO(data));picture.load()
        original_size=picture.size
        picture=ImageOps.exif_transpose(picture).convert('RGB')
        picture.thumbnail((520,520),Image.Resampling.LANCZOS)
        name=hashlib.sha256(url.encode()).hexdigest()[:18]+'.webp'
        folder=MEDIA / choice['slug'];folder.mkdir(parents=True,exist_ok=True)
        target=folder/name
        picture.save(target,'WEBP',quality=86,method=6)
        return {**choice,'thumbnail':target.relative_to(ROOT).as_posix(),'width':original_size[0],'height':original_size[1],'bytes':len(data)}
    except Exception as error:return {**choice,'error':str(error)}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--only',nargs='*')
    parser.add_argument('--merge-cersaie',type=Path,default=Path('/tmp/elios-cersaie-colors.json'))
    parser.add_argument('--supplement',type=Path,nargs='*',default=[ROOT/'reports/elios-color-media-supplements-2026-11-01.json'])
    args=parser.parse_args()
    rows=product_rows()
    if args.only: rows=[row for row in rows if row['slug'] in args.only]
    else: rows=[row for row in rows if row['slug'] not in DELEGATED and not row['slug'].startswith('pool-')]
    with concurrent.futures.ThreadPoolExecutor(max_workers=7) as pool: pages=list(pool.map(parse_page,rows))
    choices=[choice for page in pages for choice in page['choices']]
    # The canonical 3D source retains independently verified manufacturer
    # sample URLs for older web cards that now only expose their decor group.
    surfaces=json.loads((ROOT/'shared/lrf-3d/manufacturer-surfaces.json').read_text())
    covered={(choice['slug'],choice['color']) for choice in choices}
    for row in rows:
        source=next((item for item in surfaces if item.get('brand')=='ELIOS' and norm(item['name'])==norm(row['name'])),None)
        if not source:continue
        for color in row['colors']:
            if (row['slug'],color) in covered:continue
            record=next((item for item in source['colors'] if norm(item['name'])==norm(color)),None)
            url=record.get('source','') if record else ''
            if url.startswith(UPLOADS) and record.get('file'):
                choices.append({'slug':row['slug'],'color':color,'label':record['name'],'url':url,'sourcePage':source['source'],'canonicalRecord':'shared/lrf-3d/manufacturer-surfaces.json'})
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool: samples=list(pool.map(derivative,choices))
    data={'galleries':{},'variants':{},'assets':{},'sources':{}}
    for sample in samples:
        if 'error' in sample: continue
        slug,color,url=sample['slug'],sample['color'],sample['url']
        urls=data['variants'].setdefault(slug,{}).setdefault(color,[])
        if url not in urls:urls.append(url)
        data['assets'][url]={'thumbnail':sample['thumbnail'],'original':url,'width':sample['width'],'height':sample['height'],'definitionLimited':min(sample['width'],sample['height'])<350,'kind':'manufacturer-colour-sample','sourcePage':sample['sourcePage'],'label':sample['label']}
        data['sources'][slug]={'url':sample['sourcePage'],'retrievedAt':'2026-11-01','mapping':'Exact visible manufacturer colour-card title'}
    for supplement in [args.merge_cersaie,*args.supplement]:
        if not supplement.exists():continue
        extra=json.loads(supplement.read_text())
        for key in data:
            for slug,value in extra.get(key,{}).items():
                if key=='variants':data[key].setdefault(slug,{}).update(value)
                else:data[key][slug]=value
    used={url for mapping in data['variants'].values() for values in mapping.values() for url in values}
    used.update(url for values in data['galleries'].values() for url in values)
    data['assets']={url:value for url,value in data['assets'].items() if url in used}
    OUTPUT.write_text('// Exact named manufacturer samples, with separate optimized derivatives and HD originals.\nwindow.ELIOS_COLOR_MEDIA = '+json.dumps(data,ensure_ascii=False,indent=2)+';\n')
    report={'date':'2026-11-01','collectionsRequested':len(rows),'mappedColors':sum(len(value) for value in data['variants'].values()),'mappedCollections':len(data['variants']),'pages':pages,'sampleFailures':[s for s in samples if 'error' in s],'derivatives':len(data['assets'])}
    (ROOT/'reports/elios-color-samples-2026-11-01.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({key:report[key] for key in ['collectionsRequested','mappedColors','mappedCollections','derivatives']}))

if __name__=='__main__':main()

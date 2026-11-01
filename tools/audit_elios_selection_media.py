#!/usr/bin/env python3
"""Audit the active Elios selection gallery and exact colour-image mappings.

Runs the data-only portions of the same scripts in an isolated Node VM. Never
loads tariffs or browser session data. A sparse checkout is distinguished from
a missing Git asset; HTTP failures and unverified network responses are separate.
"""
from __future__ import annotations
import argparse
import base64
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://leroyfactory.fr/'
TRACKED_PATHS = None
SCRIPTS = [
    'assets/js/inspirations-elios-data.js',
    *[f'assets/js/elios-images/elios-images-{i}.js' for i in range(1,12)],
    'assets/js/inspirations-elios-hd-remote.js',
    'assets/js/inspirations-elios-thickness-overrides.js',
    'assets/js/inspirations-elios-cersaie-2026.js',
    'assets/js/inspirations-elios-pricing.js',
    'assets/js/inspirations-elios-official-galleries.js',
    *[f'assets/js/inspirations-elios-official-galleries-{i}.js' for i in range(2,7)],
    'assets/js/inspirations-elios-fix-bavaria-dolomiti-harmony.js',
    'assets/js/inspirations-elios-pass1-hd.js',
    'assets/js/inspirations-elios-lot1-hd.js',
    'assets/js/inspirations-elios-montreal-hd.js',
    'assets/js/inspirations-elios-slate-hd.js',
    'assets/js/inspirations-elios-azuli-hd.js',
    'assets/js/inspirations-elios-selection-media.js',
    'assets/js/elios-selection-media-model.js',
    'assets/js/inspirations-elios-color-media-20261101.js',
]
NODE = r'''
const fs=require('fs'),vm=require('vm');
const window={addEventListener(){},dispatchEvent(){}};
const document={readyState:'loading',addEventListener(){},querySelector(){return{}},getElementById(){return null},head:{appendChild(){}}};
const context={window,document,console,setTimeout(){},setInterval(){},MutationObserver:class{observe(){}},CustomEvent:class{},sessionStorage:{getItem(){return null}}};
vm.createContext(context);const errors=[];
for(const file of JSON.parse(process.argv[1])){
 if(!fs.existsSync(file))continue;
 try{vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});}catch(error){errors.push({file,error:error.message});}
}
const products=(window.ELIOS_CATALOGUE||[]).map(p=>({name:p.name,slug:p.slug,colors:p.colors||[],gallery:p.gallery||[]}));
const model=window.ELIOS_SELECTION_MEDIA_MODEL;
if(!model)errors.push({file:'assets/js/elios-selection-media-model.js',error:'Current media model unavailable; coverage cannot be evaluated'});
const merged=model?.mergeVariants(window.ELIOS_VERIFIED_VARIANTS,window.ELIOS_SELECTION_MEDIA?.variants,window.ELIOS_COLOR_MEDIA?.variants)||{};
const resolvedColors=Object.fromEntries(products.map(p=>[p.slug,model?.colorEntries(p.colors,merged[p.slug])||[]]));
console.log(JSON.stringify({products,images:window.ELIOS_IMAGE_DATA||{},galleries:window.ELIOS_OFFICIAL_GALLERIES||{},variants:window.ELIOS_VERIFIED_VARIANTS||{},selection:window.ELIOS_SELECTION_MEDIA||{},overlay:window.ELIOS_COLOR_MEDIA||{},mergedVariants:merged,resolvedColors,remote:window.ELIOS_HD_REMOTE||{},errors}));
'''

def snapshot():
    return json.loads(subprocess.check_output(['node','-e',NODE,json.dumps(SCRIPTS)],cwd=ROOT,text=True))

def unique(values):
    return list(dict.fromkeys(v for v in values if v))

def media_id(src):
    return 'embedded:'+hashlib.sha256(src.encode()).hexdigest()[:20] if src.startswith('data:') else src

def local_status(src):
    global TRACKED_PATHS
    if (ROOT/src).is_file():
        return {'gitAsset':'checked-out','bytes':(ROOT/src).stat().st_size}
    if TRACKED_PATHS is None:
        TRACKED_PATHS=set(subprocess.check_output(['git','ls-tree','-r','--name-only','HEAD'],cwd=ROOT,text=True).splitlines())
    present=src in TRACKED_PATHS
    return {'gitAsset':'tracked-outside-sparse-checkout' if present else 'missing'}

def image_header(raw):
    return raw.startswith((b'\xff\xd8\xff',b'\x89PNG\r\n\x1a\n',b'GIF87a',b'GIF89a')) or (raw[:4]==b'RIFF' and raw[8:12]==b'WEBP') or b'<svg' in raw[:1000]

def request(url,method,headers=None):
    try:
        return urlopen(Request(url,method=method,headers={'User-Agent':'LRF-media-integrity-audit/1.0',**(headers or {})}),timeout=18)
    except HTTPError as error:
        return error

def check_image(src):
    if src.startswith('data:'):
        try:
            raw=base64.b64decode(src.split(',',1)[1],validate=True)
            if not image_header(raw):raise ValueError('Invalid image signature')
            return {'status':'ok','kind':'embedded','bytes':len(raw)}
        except Exception as error:
            return {'status':'invalid-image','kind':'embedded','error':str(error)[:160]}
    local=src.startswith('assets/') or src.startswith('/')
    url=ORIGIN+src.lstrip('/') if local else src
    info=local_status(src.lstrip('/')) if local else {}
    if local and (ROOT/src.lstrip('/')).is_file():
        with (ROOT/src.lstrip('/')).open('rb') as file:header=file.read(16384)
        return {'status':'ok' if image_header(header) else 'invalid-image','kind':'local','verification':'local-file',**info}
    try:
        with request(url,'HEAD') as response:
            code=response.getcode();mime=response.headers.get('Content-Type','').split(';')[0].lower()
            if code==200 and mime.startswith('image/'):
                return {'status':'ok','kind':'local' if local else 'remote','httpStatus':code,'mime':mime,**info}
        with request(url,'GET',{'Range':'bytes=0-16383'}) as response:
            code=response.getcode();mime=response.headers.get('Content-Type','').split(';')[0].lower()
            if code in (200,206):
                header=response.read(16384)
                if image_header(header):
                    return {'status':'ok','kind':'local' if local else 'remote','httpStatus':code,'mime':mime,'headerRead':True,**info}
                return {'status':'invalid-image','kind':'local' if local else 'remote','httpStatus':code,'mime':mime,**info}
            # A restriction is not proof the asset is missing.
            state='missing-http' if code in (404,410) else 'unverified-http'
            return {'status':state,'kind':'local' if local else 'remote','httpStatus':code,'mime':mime,**info}
    except (URLError,TimeoutError,OSError) as error:
        return {'status':'unverified-network','kind':'local' if local else 'remote','error':type(error).__name__,**info}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report',type=Path,default=ROOT/'reports/elios-media-audit-2026-11-01.json')
    parser.add_argument('--cache',type=Path,default=Path('/tmp/elios-selection-media-http-cache.json'))
    parser.add_argument('--workers',type=int,default=6)
    parser.add_argument('--no-network',action='store_true')
    args=parser.parse_args();data=snapshot();rows=[];used=set();shared=defaultdict(set)
    if data['errors']:
        print(json.dumps({'scriptErrors':data['errors']},ensure_ascii=False))
        raise SystemExit('One or more active data scripts failed; no partial coverage report was written')
    for product in data['products']:
        slug=product['slug'];old=(data['selection'].get('variants') or {}).get(slug,(data.get('variants') or {}).get(slug,{}))
        merged=data['mergedVariants'].get(slug,{})
        local_gallery=[data['images'].get(key) for key in product['gallery']]
        selected_gallery=data['selection'].get('galleries',{}).get(slug,[])
        overlay_gallery=data['overlay'].get('galleries',{}).get(slug,[])
        gallery=unique([*selected_gallery,*overlay_gallery] if selected_gallery else [*data['galleries'].get(slug,[]),*overlay_gallery,*[src for arr in merged.values() for src in arr],data['remote'].get(slug),*local_gallery])
        colors=[]
        for entry in data['resolvedColors'][slug]:
            color=entry['color'];urls=unique(entry['images']);used.update(urls)
            for src in urls:shared[src].add(slug+':'+color)
            colors.append({'name':color,'declared':color in product['colors'],'images':[media_id(src) for src in urls]})
        used.update(gallery)
        unresolved=[key for key in product['gallery'] if not data['images'].get(key)]
        rows.append({'slug':slug,'name':product['name'],'cover':media_id(gallery[0]) if gallery else None,'gallery':[media_id(src) for src in gallery],
                     'unresolvedGalleryKeys':unresolved,'colors':colors,'missingDeclaredColorImages':[row['name'] for row in colors if row['declared'] and not row['images']],
                     'priorMissingDeclaredColorImages':[color for color in product['colors'] if not old.get(color)]})
    for src in list(used):
        asset=data['overlay'].get('assets',{}).get(src)
        if isinstance(asset,dict):used.update(asset[key] for key in ['thumbnail','original'] if asset.get(key))
    checks=json.loads(args.cache.read_text()) if args.cache.exists() else {}
    wanted=[src for src in used if media_id(src) not in checks or
            ((src.startswith('assets/') or src.startswith('/')) and
             ((ROOT/src.lstrip('/')).is_file() or checks.get(media_id(src),{}).get('verification')=='local-file'))]
    if not args.no_network:
        with ThreadPoolExecutor(max_workers=max(1,min(8,args.workers))) as pool:
            futures={pool.submit(check_image,src):src for src in wanted}
            for index,future in enumerate(as_completed(futures),1):
                src=futures[future];checks[media_id(src)]=future.result()
                if index%50==0:
                    args.cache.write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n')
                    print(f'Checked {index}/{len(wanted)} image sources',flush=True)
        args.cache.write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n')
    active={media_id(src):checks.get(media_id(src),{'status':'not-checked'}) for src in used}
    for row in rows:
        row['brokenGallerySources']=[src for src in row['gallery'] if active[src]['status'] in ['missing-http','invalid-image']]
        row['unverifiedGallerySources']=[src for src in row['gallery'] if active[src]['status'].startswith(('unverified','not-checked'))]
        for color in row['colors']:
            color['verifiedImages']=[src for src in color['images'] if active[src]['status']=='ok']
    report={'checkedAt':datetime.now(timezone.utc).isoformat(),'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
            'inputHashes':{path:hashlib.sha256((ROOT/path).read_bytes()).hexdigest() for path in SCRIPTS if (ROOT/path).is_file()},
            'summary':{'collections':len(rows),'declaredColors':sum(len(p['colors']) for p in data['products']),
                       'priorMissingDeclaredColorImages':sum(len(row['priorMissingDeclaredColorImages']) for row in rows),
                       'missingDeclaredColorImages':sum(len(row['missingDeclaredColorImages']) for row in rows),
                       'declaredColorsWithVerifiedImage':sum(color['declared'] and bool(color['verifiedImages']) for row in rows for color in row['colors']),
                       'collectionsWithoutGallery':[row['slug'] for row in rows if not row['gallery']],
                       'unresolvedGalleryKeys':sum(len(row['unresolvedGalleryKeys']) for row in rows),'uniqueImageSources':len(active),
                       'imageChecks':dict(Counter(row['status'] for row in active.values()))},'scriptErrors':data['errors'],'collections':rows,'images':active,
            'imagesSharedBySeveralColorLabels':{media_id(src):sorted(labels) for src,labels in shared.items() if len(labels)>1}}
    args.report.parent.mkdir(parents=True,exist_ok=True);args.report.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(report['summary'],ensure_ascii=False))

if __name__=='__main__':main()

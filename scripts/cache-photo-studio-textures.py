"""Mirror existing public LRF manufacturer faces byte-for-byte for same-origin canvas export.
No proxy or runtime service. Sources are the generated eligible catalogue only;
fetches are restricted to the existing public LRF Firebase bucket. No user photo.
Run after build-photo-studio-catalogue.mjs, then run that generator again.
"""
import concurrent.futures, hashlib, io, json, os
from pathlib import Path
from urllib.parse import urlsplit, unquote
from urllib.request import urlopen, Request
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
CATALOGUE=ROOT/'assets/js/lrf-photo-studio/catalogue.json'
CACHE=ROOT/'assets/js/lrf-photo-studio/texture-cache.json'
OUT=ROOT/'assets/img/lrf-photo-studio/textures'
OUT.mkdir(parents=True,exist_ok=True)
products=json.loads(CATALOGUE.read_text())['products']
previous=json.loads(CACHE.read_text()).get('assets',{}) if CACHE.exists() else {}
reverse={entry['path']:url for url,entry in previous.items()}
urls=sorted({reverse.get(url,url) for p in products for key in ['textureFaces','workingTextureFaces'] for url in p.get(key,[]) if url.startswith('https://') or url in reverse} | {url for p in products for key in ['originalFaces','originalWorkingFaces'] for url in p.get('textureProvenance',{}).get(key,[]) if url.startswith('https://')})
checks_path=ROOT/'reports/elios-hd/quercia-publication-checks.json'
checks=json.loads(checks_path.read_text()).get('assets',[]) if checks_path.exists() else []
expected={item['publishedFilename']:item['expectedSHA256'] for item in checks}
expected_urls={face['url']:face['sha256'] for p in products for face in p.get('textureProvenance',{}).get('expectedFaces',[])}
def fetch(url):
    parsed=urlsplit(url)
    if parsed.scheme!='https' or parsed.hostname!='firebasestorage.googleapis.com' or not parsed.path.startswith('/v0/b/le-roy-factory.firebasestorage.app/o/'):
        raise ValueError('URL outside the existing approved public LRF bucket')
    object_name=unquote(parsed.path.split('/o/',1)[1])
    if not object_name.startswith('public-site-assets/configurator-materials/') or not object_name.endswith('.webp'):
        raise ValueError('URL outside public manufacturer texture prefix')
    old=previous.get(url)
    if old and (ROOT/old['path'].lstrip('/')).exists():
        data=(ROOT/old['path'].lstrip('/')).read_bytes()
        if hashlib.sha256(data).hexdigest()==old['sha256']:return url,old
    with urlopen(Request(url),timeout=35) as response:
        if response.status!=200 or 'image/' not in response.headers.get('Content-Type',''):raise ValueError('Image response missing')
        data=response.read(12_000_001)
        if len(data)>12_000_000:raise ValueError('Texture exceeds file limit')
    digest=hashlib.sha256(data).hexdigest()
    known=expected_urls.get(url) or expected.get(Path(object_name).name)
    if known and digest!=known:raise ValueError('Quercia publication SHA256 mismatch')
    with Image.open(io.BytesIO(data)) as im:
        size=list(im.size);im.verify()
    path='assets/img/lrf-photo-studio/textures/'+digest+'.webp'
    target=ROOT/path
    if not target.exists():target.write_bytes(data)
    return url,{'path':'/'+path,'sha256':digest,'bytes':len(data),'resolution':size,'sourceObject':object_name,'validatedAgainstPriorPublication':bool(known)}
assets=dict(previous);errors=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    futures={pool.submit(fetch,url):url for url in urls}
    for n,future in enumerate(concurrent.futures.as_completed(futures),1):
        try:
            url,entry=future.result();assets[url]=entry
        except Exception as exc:errors.append({'url':futures[future],'error':str(exc)})
        if n%25==0:print(json.dumps({'complete':n,'total':len(urls),'errors':len(errors)}),flush=True)
CACHE.parent.mkdir(parents=True,exist_ok=True)
CACHE.write_text(json.dumps({'version':1,'description':'Byte-for-byte public manufacturer faces; generated from canonical eligible LRF variants. No third-party runtime fetch.','assets':assets},ensure_ascii=False,separators=(',',':'))+'\n')
print(json.dumps({'requested':len(urls),'cached':len(assets),'bytes':sum(v['bytes'] for v in assets.values()),'errors':errors},ensure_ascii=False),flush=True)
if errors:raise SystemExit(1)

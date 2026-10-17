"""Build the reviewed VIEW assets only. Requires Pillow and PyMuPDF.

python tools/build-view-surfaces.py --cache /path/to/view-source
No generated graphic variants, colour filters, upscaling or artificial normal maps.
"""
import argparse, concurrent.futures, hashlib, io, json, urllib.request
from pathlib import Path
import fitz
from PIL import Image, ImageCms
ROOT=Path(__file__).resolve().parents[1]

def write_image(image,path):
    if path.exists() and path.stat().st_size>100:
        with Image.open(path) as check:check.verify()
        return
    buffer=io.BytesIO();image.save(buffer,'WEBP',lossless=True,method=6);payload=buffer.getvalue()
    if len(payload)<100:raise ValueError('Invalid WebP: '+str(path))
    path.write_bytes(payload)
    if path.stat().st_size!=len(payload):raise IOError('Incomplete asset: '+str(path))

def build(cache):
    manifest=ROOT/'tools/view-surfaces-sources.json';spec=json.loads(manifest.read_text())
    sources={s['url']:s for c in spec['collections'] for co in c['colors'] for s in co.get('sources',[])}
    cache.mkdir(parents=True,exist_ok=True)
    def locate(s):
        if s.get('repositoryFile'):return ROOT/s['repositoryFile']
        path=cache/s['url'].rsplit('/',1)[1]
        if not path.exists() or not path.stat().st_size:
            with urllib.request.urlopen(urllib.request.Request(s['url'],headers={'User-Agent':'LRF-VIEW-catalogue/1.0'}),timeout=60) as response:path.write_bytes(response.read())
        return path
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:located=dict(zip(sources,pool.map(locate,sources.values())))
    collections=[];provenance=[]
    for original in spec['collections']:
        c={k:v for k,v in original.items() if k!='colors'};colors=[]
        for original_color in original['colors']:
            co={k:v for k,v in original_color.items() if k!='sources'};co.update(faces=[],mobileFaces=[],resolution=[0,0],preview=None,available3d=False)
            if original_color.get('sources'):
                first=original_color['sources'][0];co['source']=first['url']+('#page='+str(first['page']) if first.get('page') else '')
            for source in original_color.get('sources',[]):
                raw=located[source['url']].read_bytes();digest=hashlib.sha256(raw).hexdigest()
                if source.get('sha256') and digest!=source['sha256']:raise ValueError('Source changed; review before updating: '+source['url'])
                source['sha256']=digest
                if 'xref' in source:
                    with fitz.open(located[source['url']]) as pdf:
                        pix=fitz.Pixmap(pdf,source['xref'])
                        if pix.colorspace.n!=3:pix=fitz.Pixmap(fitz.csRGB,pix)
                        image=Image.frombytes('RGB',[pix.width,pix.height],pix.samples)
                else:
                    image=Image.open(io.BytesIO(raw))
                    if image.info.get('icc_profile'):image=ImageCms.profileToProfile(image,ImageCms.ImageCmsProfile(io.BytesIO(image.info['icc_profile'])),ImageCms.createProfile('sRGB'),outputMode='RGB')
                    image=image.convert('RGB')
                original_size=list(image.size)
                if source.get('crop'):image=image.crop(source['crop'])
                destination=Path('assets/img/randal/surfaces/view')/c['slug']/(co['id']+'-'+str(len(co['faces'])+1)+'.webp');target=ROOT/destination;target.parent.mkdir(parents=True,exist_ok=True);write_image(image,target);mobile=destination
                if max(image.size)>1024:
                    small=image.copy();small.thumbnail((1024,1024),Image.Resampling.LANCZOS);mobile=destination.with_name(destination.stem+'-mobile.webp');write_image(small,ROOT/mobile)
                co['faces'].append(destination.as_posix());co['mobileFaces'].append(mobile.as_posix())
                if not co['preview']:
                    co['resolution']=list(image.size);preview=destination.with_name(co['id']+'-preview.webp');thumb=image.copy();thumb.thumbnail((280,280),Image.Resampling.LANCZOS);write_image(thumb,ROOT/preview);co['preview']=preview.as_posix()
                provenance.append({'collection':c['id'],'color':co['id'],'asset':destination.as_posix(),'pixels':list(image.size),'sourcePixels':original_size,'bytes':target.stat().st_size,'source':source,'sourceSha256':digest})
            co['available3d']=bool(co['faces']);co['status']='Disponible' if co['available3d'] else 'Visuel en préparation';colors.append(co)
        c['colors']=colors;c['available3d']=any(co['available3d'] for co in colors);collections.append(c)
    manifest.write_text(json.dumps(spec,ensure_ascii=False,indent=2)+'\n')
    (ROOT/'assets/js/view-surfaces/data.js').write_text('/* Generated from reviewed official VIEW sources. */\nwindow.ViewSurfaceCollections='+json.dumps(collections,ensure_ascii=False,separators=(',',':'))+';\n')
    report={'baseCommit':spec['baseCommit'],'collectionCount':len(collections),'activeCollections':sum(c['available3d'] for c in collections),'colorCount':sum(len(c['colors'])for c in collections),'activeColors':sum(co['available3d']for c in collections for co in c['colors']),'nativeFaces':len(provenance),'maps':'Official colour images. Grout bump only; no manufacturer normal/roughness maps supplied.','collections':collections,'assets':provenance};dest=ROOT/'reports/view-phase2b/inventory.json';dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items()if k not in ['collections','assets']},ensure_ascii=False))
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--cache',type=Path,default=ROOT/'tmp/view-source');build(p.parse_args().cache)

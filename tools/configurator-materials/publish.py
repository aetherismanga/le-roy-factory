"""Restore reviewed native manufacturer faces to the existing public asset bucket.
No generated tile designs or artificial upscaling. The project code only retains
source manifests; image bytes live in Cloud Storage, shared by both configurators.
"""
import concurrent.futures,hashlib,io,json,os,urllib.request,uuid
from pathlib import Path
import fitz
from PIL import Image,ImageCms
from google.cloud import storage
BASE=Path(__file__).resolve().parent
OUTPUT=Path(os.environ.get('MATERIAL_OUTPUT','/tmp/lrf-configurator-materials'))
PREFIX='public-site-assets/configurator-materials/20261022'
BUCKET='le-roy-factory.firebasestorage.app'
CACHE=OUTPUT/'sources'
CACHE.mkdir(parents=True,exist_ok=True)

def download(url,expected=None):
 path=CACHE/hashlib.sha256(url.encode()).hexdigest()
 if not path.exists():
  with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'LE-ROY-FACTORY-manufacturer-assets/1.0'}),timeout=90) as response:path.write_bytes(response.read())
 if expected and hashlib.sha256(path.read_bytes()).hexdigest()!=expected:raise ValueError('Manufacturer source changed: '+url)
 return path

def save(image,path):
 target=OUTPUT/path;target.parent.mkdir(parents=True,exist_ok=True)
 # Lossless storage preserves the manufacturer's actual pixels, including all faces.
 image.save(target,'WEBP',lossless=True,method=6)
 return target

def extract_view():
 spec=json.loads((BASE/'view-sources.json').read_text());sources={s['url']:s for c in spec['collections'] for co in c['colors'] for s in co.get('sources',[])}
 def locate(s):
  url=s['url']
  return download(spec.get('mirrors',{}).get(url,url),s.get('sha256'))
 with concurrent.futures.ThreadPoolExecutor(5) as pool:paths=dict(zip(sources,pool.map(locate,sources.values())))
 count=0
 for c in spec['collections']:
  for co in c['colors']:
   for index,source in enumerate(co.get('sources',[]),1):
    data=paths[source['url']]
    if source.get('xref'):
     with fitz.open(data) as pdf:
      pix=fitz.Pixmap(pdf,source['xref'])
      if pix.colorspace.n!=3:pix=fitz.Pixmap(fitz.csRGB,pix)
      image=Image.frombytes('RGB',[pix.width,pix.height],pix.samples)
    else:
     image=Image.open(io.BytesIO(data.read_bytes()))
     if image.info.get('icc_profile'):image=ImageCms.profileToProfile(image,ImageCms.ImageCmsProfile(io.BytesIO(image.info['icc_profile'])),ImageCms.createProfile('sRGB'),outputMode='RGB')
     image=image.convert('RGB')
    if source.get('crop'):image=image.crop(source['crop'])
    stem=Path('view')/c['slug']/(co['id']+'-'+str(index))
    save(image,stem.with_suffix('.webp'));count+=1
 return count

def extract_elios():
 spec=json.loads((BASE/'elios-faces.json').read_text());paths={key:download(v['url'],v['sha256'])for key,v in spec['pdfs'].items()};count=0
 for slug,colors in spec['collections'].items():
  for color,faces in colors.items():
   for index,face in enumerate(faces,1):
    with fitz.open(paths[face['pdf']]) as pdf:
     pix=fitz.Pixmap(pdf,face['xref'])
     if pix.colorspace.n!=3:pix=fitz.Pixmap(fitz.csRGB,pix)
     image=Image.frombytes('RGB',[pix.width,pix.height],pix.samples)
    save(image,Path('elios')/slug/(color+'-'+str(index)+'.webp'));count+=1
 return count

def publish():
 view=extract_view();elios=extract_elios();files=sorted(OUTPUT.glob('**/*.webp'))
 if view!=136 or elios<100:raise ValueError('Incomplete manufacturer asset recovery')
 bucket=storage.Client(project='le-roy-factory').bucket(BUCKET)
 def upload(path):
  relative=path.relative_to(OUTPUT).as_posix();blob=bucket.blob(PREFIX+'/'+relative);digest=hashlib.sha256(path.read_bytes()).hexdigest()
  if blob.exists():
   blob.reload()
   if blob.metadata and blob.metadata.get('source-sha256')==digest:return relative
   raise ValueError('Refusing to replace a different published material: '+relative)
  blob.cache_control='public, max-age=31536000, immutable';blob.metadata={'source-sha256':digest,'origin':'manufacturer-pdf','firebaseStorageDownloadTokens':str(uuid.uuid5(uuid.NAMESPACE_URL,'lrf-material:20261022/'+relative))};blob.upload_from_filename(str(path),content_type='image/webp',if_generation_match=0);return relative
 with concurrent.futures.ThreadPoolExecutor(6) as pool:published=list(pool.map(upload,files))
 print(json.dumps({'bucket':BUCKET,'prefix':PREFIX,'viewFaces':view,'eliosFaces':elios,'published':len(published)}))
if __name__=='__main__':publish()

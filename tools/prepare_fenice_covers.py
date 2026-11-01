#!/usr/bin/env python3
"""Create compact public covers; retain original gallery URLs in metadata."""
import pathlib,json,concurrent.futures,urllib.request,io,os,fitz
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[1];P=ROOT/'assets/data/fenice-catalogue.json';D=json.loads(P.read_text())
PDFS=ROOT.parent/'fenice-pdfs';FOLDER=ROOT/'assets/img/fenice-covers';FOLDER.mkdir(parents=True,exist_ok=True)
def pdfimage(doc,page,path):
 ims=doc[page-1].get_images(full=True);im=max(ims,key=lambda x:x[2]*x[3]);pix=fitz.Pixmap(doc,im[0])
 if pix.colorspace.n!=3:pix=fitz.Pixmap(fitz.csRGB,pix)
 pic=Image.frombytes('RGB',[pix.width,pix.height],pix.samples);pic.thumbnail((1600,1600));tmp=path.with_suffix('.tmp');pic.save(tmp,'WEBP',quality=83,method=4);tmp.replace(path)
# Correctly decode CMYK JPX originals and choose real photographed rooms first.
cersaie=fitz.open(PDFS/'Fenice_Catalogo_Cersaie_2026_MR.pdf')
for name,page in [('Oykos',58),('Oykos Fossil',60)]:
 c=next(c for c in D['collections'] if c['name']==name);rel=f'assets/img/fenice-selection-20261101/{c["slug"]}-ambiance.webp';pdfimage(cersaie,page,ROOT/rel);c['images'].insert(0,rel)
# Display photographed settings ahead of the catalogue opening texture swatches.
for name,first in [('Allure',2),('Aspen',2),('City Loft',2),('Heritage',2),('LifesTile',2),('Prime Stone',2)]:
 c=next(c for c in D['collections'] if c['name']==name);c['images']=[c['images'][first-1]]+[u for i,u in enumerate(c['images']) if i!=first-1]
# Remove description-page and blank extracted images from galleries.
for c in D['collections']:
 c['images']=[u for u in c['images'] if not (c['name']=='Oykos' and u.endswith('oykos-02.webp')) and not(c['name']=='Oykos Fossil' and u.endswith('oykos-fossil-02.webp'))]
def cover(c):
 u=c['images'][0];rel=f'assets/img/fenice-covers/{c["slug"]}.webp';f=ROOT/rel
 try:
  if u.startswith('assets/'):
   im=Image.open(ROOT/u).convert('RGB')
  else:
   req=urllib.request.Request(u,headers={'User-Agent':'LE-ROY-FACTORY-catalogue-sync/1.0'})
   im=Image.open(io.BytesIO(urllib.request.urlopen(req,timeout=40).read())).convert('RGB')
  im.thumbnail((768,768));tmp=f.with_suffix('.tmp');im.save(tmp,'WEBP',quality=78,method=4);tmp.replace(f);c['coverImage']=rel
  print(c['name'],f.stat().st_size,flush=True)
 except Exception as e:print('ERROR',c['name'],str(e),flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as e:list(e.map(cover,D['collections']))
D['counts']['images']=sum(len(c['images']) for c in D['collections']);P.write_text(json.dumps(D,ensure_ascii=False,indent=2)+'\n')
print('COVERS',len([c for c in D['collections'] if c.get('coverImage')]),flush=True)

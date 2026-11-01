#!/usr/bin/env python3
"""Finish the public catalogue with Home families and verified current size unions."""
import pathlib,json,re,unicodedata,io,fitz
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[1];P=ROOT/'assets/data/fenice-catalogue.json';D=json.loads(P.read_text());PDFS=ROOT.parent/'fenice-pdfs';CAT={c['id']:c for c in D['catalogues']}
def slug(s):return re.sub('[^a-z0-9]+','-',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower()).strip('-')
def unique(x):return list(dict.fromkeys(x))
cat=CAT['fenice-home'];doc=fitz.open(PDFS/cat['url'].rsplit('/',1)[1])
homes=[
 ('Home · Vasque sur pied',6,9,[],'Vasque sur pied en grès cérame, réalisable sur mesure et personnalisable avec ou sans perçage pour robinet.'),
 ('Home · Vasque suspendue',14,17,['120x50','95x50'],'Vasque suspendue en grès cérame, proposée en 120 × 50 cm ou 95 × 50 cm, également réalisable sur mesure.'),
 ('Home · Vasque à poser',20,23,[],'Vasque à poser en grès cérame, réalisable sur mesure et personnalisable avec ou sans perçage pour robinet.'),
 ('Home · Étagère',24,27,['120x50','95x50'],'Étagère en grès cérame, proposée en 120 × 50 cm ou 95 × 50 cm, avec ou sans perçages de robinet et de vidage.'),
 ('Home · Tables d’appoint',26,29,[],'Tables d’appoint avec surface en grès cérame et structure métallique ; deux dimensions figurent dans le catalogue fabricant.'),
]
for name,printed,page,formats,desc in homes:
 sid=slug(name)
 if any(c['slug']==sid for c in D['collections']):continue
 pg=doc[page-1];ims=pg.get_images(full=True);im=max(ims,key=lambda x:x[2]*x[3]);pix=fitz.Pixmap(doc,im[0])
 if pix.colorspace.n!=3:pix=fitz.Pixmap(fitz.csRGB,pix)
 pic=Image.frombytes('RGB',[pix.width,pix.height],pix.samples);pic.thumbnail((1600,1600));rel=f'assets/img/fenice-selection-20261101/{sid}.webp';pic.save(ROOT/rel,'WEBP',quality=83,method=4)
 pic.thumbnail((768,768));cover=f'assets/img/fenice-covers/{sid}.webp';pic.save(ROOT/cover,'WEBP',quality=78,method=4)
 D['collections'].append({'id':'fenice-'+sid,'slug':sid,'name':name,'sourceUrl':cat['url'],'url':cat['url'],'formats':formats,'colors':[],'swatches':[],'decors':[],'effect':'Mobilier et vasques','effects':['Mobilier et vasques'],'finishes':[],'categories':['Mobilier et vasques'],'productType':'Mobilier et vasques','unit':'pièce','images':[rel],'coverImage':cover,'pdf':cat['url'],'sources':[{'catalogueId':cat['id'],'label':cat['label'],'url':cat['url'],'page':printed+2,'printedPage':printed}],'catalogueIds':[cat['id']],'description':desc,'priceSource':'authorized-professional-tariff'})
# The same collection can gain a format in a specialist catalogue. Only the cm
# dimension preceding an explicit inches conversion in opening pages is merged.
opened={};changes=[]
for c in D['collections']:
 old=list(c['formats'])
 if c.get('unit')=='pièce':continue
 for source in c['sources']:
  cid=source['catalogueId']
  if cid not in CAT or cid=='fenice-home':continue
  f=PDFS/CAT[cid]['url'].rsplit('/',1)[1]
  if not f.exists():continue
  if str(f) not in opened:opened[str(f)]=fitz.open(f)
  pdf=opened[str(f)];start=source.get('page',1)-1
  text='\n'.join(pdf[i].get_text() for i in range(start,min(start+3,len(pdf))))
  sizes=re.findall(r'\b(\d{1,3}(?:[,.]\d+)?[x×]\d{1,3}(?:[,.]\d+)?)\s+\.\s+\d',text)
  for size in sizes:
   s=size.replace('×','x').replace('.',',')
   if s not in c['formats']:c['formats'].append(s)
 if c['formats']!=old:changes.append((c['name'],old,c['formats']))
 if not c.get('description'):c['description']=f"{c['name']}, {c['effect'].lower()} : coloris et formats du catalogue La Fenice."
 c.setdefault('productType','Carrelage');c.setdefault('unit','m²')
 if c['name'] in ['Il Travertino','Lapis']:c['keywords']=['carrelage imitation travertin','effet travertin']

for c in D['collections']:
 c['formats']=unique(f.replace('.',',') for f in c['formats'])
 if c['name']=='Prime Stone':
  c['formats']=['120x120','90x90','60x120','60x60','30x60'];c['finishes']=['Mat','Soft touch','Grip']
# Reviewed specialist memberships avoid confusing a finish called Touch or a
# Marble Velvet Statuario colour with the distinct polished Statuario product.
for c in D['collections']:
 remove=['natural'] if c['name']=='Touch' else ['marble-velvet','fenice-home'] if c['name']=='Statuario' else []
 c['sources']=[x for x in c['sources'] if x['catalogueId'] not in remove]
 c['catalogueIds']=[x for x in c['catalogueIds'] if x not in remove]
for name,cid,page in [('Natural Terre','natural',7),('Natural Resine','natural',15),('LifesTile','lifestile',1)]:
 c=next(c for c in D['collections'] if c['name']==name);cat=CAT[cid]
 if cid not in c['catalogueIds']:
  c['sources'].append({'catalogueId':cid,'label':cat['label'],'url':cat['url'],'page':page});c['catalogueIds'].append(cid)
for name,pp in [('Natural Terre',4),('Natural Resine',12),('Lithos',16),('Étoile',24),('Il Travertino',30),('Majestic',36),('Shapes',44)]:
 c=next(c for c in D['collections'] if c['name']==name);source=next(x for x in c['sources'] if x['catalogueId']=='cersaie-2025');source['page']=pp+2;source['printedPage']=pp
D['collections'].sort(key=lambda c:slug(c['name']));D['counts']={'collections':len(D['collections']),'catalogues':len(D['catalogues']),'images':sum(len(c['images']) for c in D['collections']),'covers':sum(bool(c.get('coverImage')) for c in D['collections'])}
P.write_text(json.dumps(D,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(D['counts']));print('VERIFIED FORMAT UNIONS',json.dumps(changes,ensure_ascii=False))
# Drop unused/broken intermediate gallery assets from publication.
used={u for c in D['collections'] for u in c['images'] if u.startswith('assets/')}
for f in (ROOT/'assets/img/fenice-selection-20261101').glob('*.webp'):
 if f.relative_to(ROOT).as_posix() not in used:f.unlink()

#!/usr/bin/env python3
"""Source-faithful Anima countertop palettes; no upscaling or invented colours."""
from pathlib import Path
from io import BytesIO
import json,re,hashlib,unicodedata
import fitz
from PIL import Image,ImageStat,ImageCms
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT.parent
SOURCE=BASE/'research/anima-premium-official'
DOC=fitz.open(BASE/'research/NEOBATH-ANIMA-2026.pdf')
OUT=ROOT/'assets/img/neobath-anima-2026/materials-premium'
OUT.mkdir(parents=True,exist_ok=True)
URL='https://leroyfactory.fr/assets/img/neobath-anima-2026/materials-premium/'
PDF_URL='https://neobathdesign.fr/wp-content/uploads/2026/02/NEOBATH-ANIMA-2026.pdf'
def slug(s):
 s=unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower().replace("'",'').replace('’','')
 return re.sub('[^a-z0-9]+','-',s).strip('-')
def to_srgb(im):
 icc=im.info.get('icc_profile')
 if icc:
  try:return ImageCms.profileToProfile(im,ImageCms.ImageCmsProfile(BytesIO(icc)),ImageCms.createProfile('sRGB'),outputMode='RGB')
  except (OSError,ValueError):pass
 return im.convert('RGB')
def save(im,name,max_size=None):
 im=to_srgb(im)
 if max_size:im.thumbnail((max_size,max_size),Image.Resampling.LANCZOS)
 b=BytesIO();im.save(b,'WEBP',quality=94,method=4)
 data=b.getvalue();assert len(data)>100
 Image.open(BytesIO(data)).verify()
 dest=OUT/name;tmp=dest.with_suffix('.pending');tmp.write_bytes(data);tmp.replace(dest)
 Image.open(dest).verify()
 return URL+name,list(im.size),hashlib.sha256(data).hexdigest()
def median_hex(im):
 im=to_srgb(im); rgb=ImageStat.Stat(im).median
 return '#'+''.join(f'{round(x):02x}' for x in rgb)
def native(xref):return Image.open(BytesIO(DOC.extract_image(xref)['image'])).convert('RGB')
S=[]
# FENIX exact official colour identities and original Arpa photographs.
f=json.load(open(SOURCE/'anima-fenix-official-assets.json'))
order=['Beige Arizona','Beige Luxor','Castoro Ottawa','Cacao Orinoco','Grigio Efeso','Grigio Antrim','Verde Kitami','Verde Comodoro','Rosso Namib','Blu Shaba','Viola Orissa']
for name in order:
 a=next(x for x in f if x['name']==name);im=Image.open(a['localPath'])
 tex,sz,sha=save(im.copy(),a['id']+'.webp',1024)
 hd,hsz,hsha=save(im.copy(),a['id']+'-hd.webp',2048)
 S.append(dict(id=a['id'],family='fenix',name=name,code=a['code'],codeScope='FENIX NTM / Arpa Industriale',hex=a['color'],texture=tex,swatch=tex,hdTexture=hd,roughness=.9,metalness=0,clearcoat=0,colorSource=a['colorSource'],photographicTexture=True,source={'pdfPage':74,'printedPage':146,'manufacturer':'FENIX / Arpa Industriale','url':a['sourceUrl'],'originalImageUrl':a['hiresUrl'],'nativeSize':a['nativeSize'],'imageSha256':a['fileSha256'],'runtimeSize':sz,'colorManagement':'Embedded source ICC converted to sRGB for web derivatives where present. Original manufacturer file remains unmodified.','hdSize':hsz,'hdSha256':hsha},renderParametersNote='Roughness is an appearance setting, not a measured PBR property. Uniform FENIX colour identity is the official manufacturer RGB.' ))
# PDF native samples are the authoritative baseline. Supplier HD replaces these only after visual corroboration.
hpl=[('Statuario',715),('Elite',709),('White Yule',719),('Kaspio Oro',707),('Terrazzo',705),('Mailand',713),('Botticino',711),('Travertino Tivoli',689),('Rovere Naturale',693),('Rovere Valweg',699),('Noce Sinfonia',697),('Olmo',701),('Noce',691),('Nero Ardesia',703)]
gres=[('Calacatta Oro',642),('Macchia Vecchia',657),('Bianco Statuario',659),('Pietra Grey',644),('Ossido Bruno',646),('Pietra Piasentina Grigio',647),('Pietra Piasentina Taupe',648),('Emperador Extra',654),("Ceppo Pietra d’Iseo",656),('Anima Nero Atlante',661),('Travertino',640)]
# Mapping is explicitly recorded below after comparing the manufacturer's native pattern with Anima's PDF.
HD_SOURCE_FILE=SOURCE/'verified-hd-surfaces.json'
HD=json.load(open(HD_SOURCE_FILE)) if HD_SOURCE_FILE.exists() else {}
for family,items,page in [('hpl',hpl,74),('gres',gres,73)]:
 for name,xref in items:
  ident=family+'-'+slug(name);im=native(xref);original_size=list(im.size)
  if family=='hpl' and im.width>im.height:im=im.transpose(Image.Transpose.ROTATE_90)
  source={'pdfPage':page,'printedPage':146 if family=='hpl' else 144,'xref':xref,'nativeSize':original_size,'url':None,'assetKind':'native-pdf-sample','resolutionNote':'Native embedded catalogue sample; not upscaled.'}
  if ident in HD:
   a=HD[ident];im=Image.open(Path(a['path']) if Path(a['path']).is_absolute() else BASE/a['path']).convert('RGB');source.update({k:v for k,v in a.items() if k!='path'});source['originalImageSha256']=hashlib.sha256((Path(a['path']) if Path(a['path']).is_absolute() else BASE/a['path']).read_bytes()).hexdigest();source['assetKind']='official-hd-sample';source['nativeSize']=list(im.size)
  tex,sz,sha=save(im,ident+'.webp',2048);source.update(runtimeSize=sz,imageSha256=sha)
  S.append(dict(id=ident,family=family,name=name,code=None,hex=median_hex(im),texture=tex,swatch=tex,hdTexture=tex,roughness=.64 if family=='hpl' else .5,metalness=0,clearcoat=0,colorSource='Median of the genuine source photograph; patterned surface must use texture.',patterned=True,source=source,renderParametersNote='Roughness is an appearance setting, not a measured PBR property.'))
# Geacril whites: actual blank material areas from each native manufacturer photograph.
for family,xref,box,page in [('geacril',566,(110,5,415,55),70),('geacril-stone',586,(6,6,166,590),71)]:
 im=native(xref).crop(box);tex,sz,sha=save(im,family+'-white-matte.webp')
 src={'pdfPage':page,'printedPage':138 if family=='geacril' else 140,'xref':xref,'crop':list(box),'nativeSize':sz,'assetKind':'native-pdf-photo-crop','resolutionNote':'Native crop of the white material, with photographic lighting retained; no fabricated texture.','imageSha256':sha}
 S.append(dict(id=family+'-white-matte',family=family,name='Blanc mat',code=None,hex=median_hex(im),texture=tex,swatch=tex,hdTexture=tex,roughness=.88 if family=='geacril' else .94,metalness=0,clearcoat=0,priceKey='white-matte',colorSource='Representative native manufacturer photo, not a calibrated white standard.',source=src))
 S.append(dict(id=family+'-ncs',family=family,name='Couleur mate NCS sur demande',code=None,hex=None,texture=None,swatch=None,hdTexture=None,roughness=.88 if family=='geacril' else .94,metalness=0,clearcoat=0,priceKey='ncs-matte',customNcs=True,source={'pdfPage':page,'printedPage':138 if family=='geacril' else 140,'assetKind':'manufacturer-custom-colour','resolutionNote':'Enter the exact NCS code. No RGB conversion or invented finite palette is supplied.'}))
F=[]
for family,name,depth,ref,page in [('fenix','FENIX',46.5,'TFX12 · composition06',61),('hpl','HPL',46.5,'THPL12 · composition07',62),('gres','Grès',50,'TGRS14 · composition10',62),('geacril','Geacril',46.2,'TPGEA12 · composition02',60),('geacril-stone','Geacril Stone',None,None,None)]:
 F.append({'id':family,'name':name,'surfaces':[a['id'] for a in S if a['family']==family],'referenceDepth':depth,'depthSource':{'kind':'catalogue-composition-example','reference':ref,'pdfPage':page} if ref else None,'referenceDepthNote':f'Composition example only: {ref}; not a universal manufacturing limit.' if ref else 'No universal plan depth is printed in the linear pricing table.','dimensionStatus':'confirm-fabrication','widthRangeNote':'The linear pricing tables do not document a universal 60–240 cm fabrication range.'})
B=[]
for key,label,source_name in [('fume-matte','Fumé gris transparent','grigio'),('bronze-matte','Fumé bronze transparent','bronzo')]:
 original=SOURCE/('ocritech-'+source_name+'.jpg')
 if not original.exists():continue
 im=Image.open(original).convert('RGB');crop=[40,220,360,360]
 swatch,sz,sha=save(im,'ocritech-'+source_name+'-reference.webp')
 B.append({'id':key,'priceKey':key,'name':label,'material':'ocritech','hex':median_hex(im.crop(crop)),'swatch':swatch,'texture':None,'transparent':True,'colorAccuracy':'Référence générique de matière Ocritech photographiée par Onsen ; pas une calibration Neobath.','source':{'url':'https://www.onsen.it/collezioni/tratto/','originalImageUrl':'https://www.onsen.it/wp-content/uploads/2025/07/Fume-'+source_name+'-trasparente.jpg','manufacturer':'Onsen','sampleCrop':crop,'nativeSize':list(im.size),'imageSha256':hashlib.sha256(original.read_bytes()).hexdigest(),'appearanceSource':'Manufacturer swatch with reflected environment retained; median sampled from the specified lower central material region.'}})
data={'version':1,'collection':'NEOBATH ANIMA 2026','source':{'catalogue':'NEOBATH ANIMA 2026','pdfPages':[70,71,73,74]},'materialFamilies':F,'surfaces':S,'basinReferenceFinishes':B,'notes':['The catalogue defines 11 FENIX, 14 HPL and 11 grès finishes. Geacril / Geacril Stone are white matte or custom NCS.','Surface appearance and pricing variant are separate. Manufacturer RGB is provided only where officially published; patterned surface hexadecimal values are photographic summaries.','No upscaling and no AI-generated manufacturer textures.']}
j=json.dumps(data,ensure_ascii=False,indent=2)+'\n'
(ROOT/'assets/data/neobath-anima-materials.json').write_text(j)
m='// Generated by tools/extract-neobath-anima-materials.py from the public manufacturer catalogue.\n// Pure serializable data; safe for UI, renderer, pricing and project validators.\n'
m+='export const MATERIAL_FAMILIES = '+json.dumps(F,ensure_ascii=False,indent=2)+';\n'
m+='export const MANUFACTURER_SURFACES = '+json.dumps(S,ensure_ascii=False,indent=2)+';\n'
m+='export const OCRITECH_REFERENCE_FINISHES = '+json.dumps(B,ensure_ascii=False,indent=2)+';\n'
(ROOT/'functions/neobath-anima/studio-adapter/materials-data.js').write_text(m)
print(json.dumps({'families':len(F),'surfaces':len(S),'assets':len(list(OUT.glob('*.webp'))),'bytes':sum(p.stat().st_size for p in OUT.glob('*.webp'))}))

"""Native ANIMA manufacturer pixels. No resize, sharpening or color correction.

Usage: python tools/extract-neobath-anima-finishes.py /absolute/catalogue.pdf
"""
from pathlib import Path
import sys,io,json,hashlib
import fitz
from PIL import Image,ImageStat,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/img/neobath-anima-2026/finishes-hd';OUT.mkdir(parents=True,exist_ok=True)
pdf=fitz.open(sys.argv[1]);sources={}
def native(page):
 if page not in sources:
  info=max(pdf[page-1].get_images(),key=lambda x:x[2]*x[3])
  data=pdf.extract_image(info[0]);im=Image.open(io.BytesIO(data['image'])).convert('RGB')
  sources[page]=(im,info[0])
 return sources[page]
def save(name,page,rect=None):
 im,xref=native(page);full=im.size
 if rect:im=im.crop(rect)
 target=OUT/(name+'.webp');buffer=io.BytesIO();im.save(buffer,'WEBP',lossless=True,method=4);payload=buffer.getvalue();assert len(payload)>0,name;Image.open(io.BytesIO(payload)).verify();temporary=target.with_suffix('.tmp.webp');temporary.write_bytes(payload);temporary.replace(target)
 rgb=tuple(int(v) for v in ImageStat.Stat(im).median)
 return {'url':'/'+target.relative_to(ROOT).as_posix(),'width':im.width,'height':im.height,'source':{'pdfPage':page,'xref':xref,'nativeWidth':full[0],'nativeHeight':full[1],'cropPixels':list(rect) if rect else None},'sampledColor':'#%02x%02x%02x'%rgb,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'colorTreatment':'manufacturer pixels, no color correction, no upscaling'}
# A frontal native manufacturer photograph of all six actual facades, without text.
overview=save('anima-six-facades-native',51)
# Frontal physical panels (some Pura, others Ribelle), all actual colors.
columns={
 'grigio-vulcano':(160,324,413,1180),
 'terra-rossa':(420,324,672,1180),
 'verde-agave':(680,324,933,1180),
 'argilla-secca':(940,324,1190,1180),
 'bianco-gesso':(1594,324,1842,1180),
 'rovere-alba':(1876,324,2122,1180)}
# Material-only unlabelled pixels. Oak Pura fronts run horizontally in comp.13.
material={
 'grigio-vulcano':(51,(180,365,390,710)),
 'terra-rossa':(51,(440,365,650,710)),
 'argilla-secca':(51,(960,365,1170,710)),
 'verde-agave':(32,(730,1020,990,1330)),
 'bianco-gesso':(27,(140,1360,1040,1490)),
 'rovere-alba':(42,(295,990,790,1160))}
finishes=[]
for key,rect in columns.items():
 page,crop=material[key]
 finishes.append({'id':key,'previewFacade':('pura' if key in ['grigio-vulcano','terra-rossa','argilla-secca'] else 'ribelle'),'preview':save('facade-'+key,51,rect),'material':save('material-'+key,page,crop),
  'materialUsage':'diffuse albedo appearance; manufacturer photo lighting is retained','woodGrainDirection':'horizontal-on-pura-drawer-fronts' if key=='rovere-alba' else None})
facades={
 'pura':save('pura-rovere-drawers-detail',42,(255,925,825,1440)),
 'ribelle':save('ribelle-rovere-grip-detail',29,(239,1097,1035,1514))}
# Bare oak panel in the official finish presentation, used on vertical surfaces.
verticalOak=save('material-rovere-alba-vertical-panel',4,(255,956,640,1160))
manifest={'schema':'neobath-anima-finish-assets','version':'20261102-native-hd-2','sourcePdf':'NEOBATH-ANIMA-2026.pdf','sourcePdfSha256':hashlib.sha256(Path(sys.argv[1]).read_bytes()).hexdigest(),'overview':overview,'finishes':finishes,'facades':facades,'verticalOak':verticalOak,'limitations':['PDF does not provide calibrated RAL/NCS identifiers for cabinet lacquers. These are exact source photographic pixels, not fabricated solid colors.','Fluted facade previews must not be used as diffuse materials over separately modeled flutes.','Pura oak drawer fronts in composition 13 have horizontal grain; the oak presentation panel has vertical grain.']}
manifest_path=Path(sys.argv[2]) if len(sys.argv)>2 else ROOT/'generated/neobath-audit/finish-assets-v2.json';manifest_path.parent.mkdir(parents=True,exist_ok=True);manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
# Temporary QA sheet only.
canvas=Image.new('RGB',(1200,640),'white');d=ImageDraw.Draw(canvas)
for i,f in enumerate(finishes):
 for j,k in enumerate(['preview','material']):
  a=Image.open(ROOT/f[k]['url'].lstrip('/'));a.thumbnail((180,260));x=i*200;y=25+j*300;canvas.paste(a,(x,y));d.text((x,y-18),f['id'] if j==0 else f[k]['sampledColor'],fill='black')
canvas.save(manifest_path.parent/'anima-finish-qa.png')
print(json.dumps({'files':len(list(OUT.glob('*.webp'))),'finishes':len(finishes),'widths':{f['id']:[f['material']['width'],f['material']['height']] for f in finishes}},ensure_ascii=False))

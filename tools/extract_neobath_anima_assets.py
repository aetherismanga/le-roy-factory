from pathlib import Path
import fitz,io,json
from PIL import Image,ImageDraw
import argparse
args=argparse.ArgumentParser(description='Extract manufacturer images and finish samples from the authorized ANIMA PDF.');args.add_argument('--pdf',required=True);opts=args.parse_args()
p=fitz.open(opts.pdf)
a=Path(__file__).resolve().parents[1]/'assets'/'img'/'neobath-anima-2026';a.mkdir(parents=True,exist_ok=True)
photos=[(1,7),(2,11),(3,15),(4,18),(5,20),(6,25),(7,27),(8,30),(9,32),(10,36),(11,38),(12,39),(13,42),(14,44),(15,46),(16,49)]
thumbs=[]
for num,pagenum in photos:
 imgs=p[pagenum-1].get_images();x=max(imgs,key=lambda x:x[2]*x[3]);d=p.extract_image(x[0]);im=Image.open(io.BytesIO(d['image'])).convert('RGB');im.thumbnail((1700,1700));target=a/f'composition-{num:02}.webp';temporary=target.with_suffix('.tmp.webp');im.save(temporary,'WEBP',quality=90,method=4);Image.open(temporary).verify();assert temporary.stat().st_size>0;temporary.replace(target)
 t=im.copy();t.thumbnail((240,170));thumbs.append((num,t))
swatches={'bianco-gesso':(970,600,1020,685),'argilla-secca':(980,533,1020,550),'verde-agave':(980,445,1020,475),'terra-rossa':(980,310,1020,385),'grigio-vulcano':(980,180,1020,240),'rovere-alba':(720,470,755,580)}
for name,rect in swatches.items():
 pix=p[3].get_pixmap(matrix=fitz.Matrix(3,3),clip=fitz.Rect(rect));im=Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB');target=a/f'finish-{name}.webp';temporary=target.with_suffix('.tmp.webp');im.save(temporary,'WEBP',quality=94,method=4);Image.open(temporary).verify();assert temporary.stat().st_size>0;temporary.replace(target)
print('written',len(list(a.glob('*.webp'))))

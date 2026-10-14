#!/usr/bin/env python3
"""Create exact high-quality ELIOS Creta 2026 swatches from the official 2026 catalogue.
Page 112 (PDF physical page), original solid colours (not décor/gallery photographs).
"""
from pathlib import Path
from io import BytesIO
from PIL import Image,ImageOps,ImageDraw,ImageFont
import fitz
import hashlib
PDF=Path("assets/pdf/ELIOSCATALOGUE-GENERALE 2026-1.pdf")
DEST=Path("assets/img/elios/creta/textures")
DEST.mkdir(parents=True,exist_ok=True)
doc=fitz.open(PDF)
p=doc[111]
# Matched visually against PDF page 112: each square immediately UNDER its colour label.
RECTS={
 "zucchero":(652,157,745,250),"avena":(770,157,863,250),
 "biscotto":(889,157,982,250),"caramello":(1008,157,1101,250),
 "matcha":(652,292,745,385),"ginepro":(770,292,863,385),
 "malto":(889,292,982,385),"pepe":(1008,292,1101,385)
}
seen=set()
for label,coords in RECTS.items():
 clip=fitz.Rect(coords)
 images=[]
 for imginfo in p.get_image_info(xrefs=True):
  bound=fitz.Rect(imginfo['bbox'])
  if clip.intersects(bound) and clip.get_area()>0:
   ratio=(clip & bound).get_area()/clip.get_area()
   if ratio>.92 and imginfo.get('xref',0)>0:
    try:
     obj=Image.open(BytesIO(doc.extract_image(imginfo['xref'])['image']))
     if obj.width>=250 and obj.height>=250:
      images.append((ratio,obj.copy(),bound))
    except Exception:pass
 if images:
  images.sort(key=lambda x:x[0],reverse=True)
  ratio,im,b=images[0]
  im=ImageOps.exif_transpose(im).convert('RGB')
  # Crop exactly the swatch window, even if the backing image extends beyond it.
  rc=((clip.x0-b.x0)/b.width,(clip.y0-b.y0)/b.height,(clip.x1-b.x0)/b.width,(clip.y1-b.y0)/b.height)
  im=im.crop(tuple(int(v*(im.width if i%2==0 else im.height)) for i,v in enumerate(rc)))
 else:
  px=p.get_pixmap(matrix=fitz.Matrix(6,6),clip=clip,alpha=False)
  im=Image.frombytes('RGB',(px.width,px.height),px.samples)
 im.thumbnail((1200,1200),Image.Resampling.LANCZOS)
 if min(im.size)<240:raise RuntimeError(f"Bad tile source {label}: {im.size}")
 out=DEST/(label+'.webp')
 im.save(out,'WEBP',quality=94,method=6)
 signature=hashlib.sha256(out.read_bytes()).hexdigest()
 if signature in seen:raise RuntimeError("Repeated tile image: "+label)
 seen.add(signature)
 print(f"{label}: {im.size} {out.stat().st_size} bytes")
# Visual quality verification contact sheet, separate from 3D textures.
contact=Image.new('RGB',(800,420),'#f7f4ef')
pen=ImageDraw.Draw(contact)
for i,label in enumerate(RECTS):
 im=Image.open(DEST/(label+'.webp')).convert('RGB')
 im=ImageOps.fit(im,(185,172),method=Image.Resampling.LANCZOS)
 x=10+(i%4)*198;y=10+(i//4)*206
 contact.paste(im,(x,y));pen.text((x,y+178),label.upper(),fill='#282820')
contact.save(DEST/'contact.jpg',quality=88)
print(f'8 authentic CRETA tiles generated from catalogue page 112')

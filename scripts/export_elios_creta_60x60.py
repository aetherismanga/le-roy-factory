#!/usr/bin/env python3
"""Extract genuine ELIOS Creta colours, certified on catalogue page 112 (60x60 RET).
Swatch centers are coordinates in the PDF page (1219x794 points).
Uses native embedded source images where available, otherwise high-res vector raster.
"""
from pathlib import Path
import fitz, io, hashlib
from PIL import Image, ImageOps, ImageEnhance
SRC=Path('assets/pdf/ELIOSCATALOGUE-GENERALE 2026-1.pdf')
DEST=Path('assets/img/elios/creta/textures')
COLOURS=[
 ('zucchero',(653,160,747,255)),('avena',(771,160,865,255)),
 ('biscotto',(890,160,984,255)),('caramello',(1008,160,1102,255)),
 ('matcha',(653,294,747,388)),('ginepro',(771,294,865,388)),
 ('malto',(890,294,984,388)),('pepe',(1008,294,1102,388))
]
def main():
 doc=fitz.open(SRC)
 page=doc[111]
 page_text=page.get_text().upper()
 for n,_ in COLOURS:
  if n.upper() not in page_text:raise RuntimeError('ELIOS CRETA catalogue mismatch: '+n)
 if '60X60' not in page_text.replace(' ','').replace('×','X'):
  raise RuntimeError('60x60 RET format not verified on catalogue source')
 DEST.mkdir(parents=True,exist_ok=True)
 image_refs=page.get_image_info(xrefs=True)
 print('Found catalogue images',len(image_refs))
 fingerprints=[]
 for name,coords in COLOURS:
  box=fitz.Rect(coords)
  center=fitz.Point((box.x0+box.x1)/2,(box.y0+box.y1)/2)
  candidates=[info for info in image_refs if info.get('xref',0)>0 and fitz.Rect(info['bbox']).contains(center)]
  candidates.sort(key=lambda x:abs(fitz.Rect(x['bbox']).width-box.width)+abs(fitz.Rect(x['bbox']).height-box.height))
  image=None
  if candidates:
   payload=doc.extract_image(candidates[0]['xref'])['image']
   image=Image.open(io.BytesIO(payload)).convert('RGB')
   print(name,'native source',image.size)
  else:
   clip=page.get_pixmap(matrix=fitz.Matrix(8,8),clip=box,alpha=False)
   image=Image.frombytes('RGB',(clip.width,clip.height),clip.samples)
   print(name,'high-res catalogue raster',image.size)
  # Avoid inventing grain / synthetic colour. Exact source swatch.
  image=ImageOps.fit(image,(1024,1024),method=Image.Resampling.LANCZOS,centering=(.5,.5))
  out=DEST/(name+'.webp')
  image.save(out,'WEBP',quality=93,method=6)
  sig=hashlib.sha256(out.read_bytes()).hexdigest()
  if sig in fingerprints:raise RuntimeError('Duplicate Creta texture: '+name)
  fingerprints.append(sig)
  print('SAVED',out,image.size,out.stat().st_size)
 print('SUCCESS: 8 original ELIOS Creta 60x60 textures, unique=',len(fingerprints))
if __name__=='__main__':main()

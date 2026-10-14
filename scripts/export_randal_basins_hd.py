#!/usr/bin/env python3
"""High-resolution RANDAL Sella, Tampa, Neris, Torne vector-diagram exports.
Source: manufacturer's official V04 pages 38 and 41, not generated basin photos.
"""
from pathlib import Path
import fitz
from PIL import Image

PDF=Path("assets/pdf/RANDAL-V04.pdf")
OUT=Path("assets/img/randal/accessories/hd")
CROPS={
 "basin-sella":(38,(59,175,172,230)),
 "basin-tampa":(38,(59,383,173,439)),
 "basin-neris":(41,(133,219,232,290)),
 "basin-torne":(41,(369,224,470,293))
}
doc=fitz.open(PDF)
assert doc.page_count==43
OUT.mkdir(parents=True,exist_ok=True)
for name,(page,rect) in CROPS.items():
 pix=doc[page-1].get_pixmap(matrix=fitz.Matrix(8,8),clip=fitz.Rect(rect),alpha=False)
 image=Image.frombytes("RGB",(pix.width,pix.height),pix.samples)
 image.thumbnail((1040,570),Image.Resampling.LANCZOS)
 canvas=Image.new("RGB",(1100,680),(250,249,245))
 canvas.paste(image,((1100-image.width)//2,(680-image.height)//2))
 dest=OUT/(name+".webp")
 canvas.save(dest,"WEBP",quality=94,method=6)
 check=Image.open(dest)
 if check.size!=(1100,680) or dest.stat().st_size<1800:
  raise RuntimeError("Invalid HD basin image "+name)
 print(dest,dest.stat().st_size)

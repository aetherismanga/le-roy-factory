from pathlib import Path
import fitz
from PIL import Image

PDF = Path("assets/pdf/RANDAL-V04.pdf")
OUT = Path("assets/img/randal/types")
OUT.mkdir(parents=True, exist_ok=True)
# Genuine schematic drawings cropped from the technical catalogue pages (1-based).
TYPES = [
 ("harmony-2-tiroirs",4,(24,130,180,310)),
 ("harmony-3-tiroirs",5,(24,125,180,323)),
 ("harmony-colonne",6,(45,125,190,415)),
 ("luce-meuble",8,(52,168,285,329)),
 ("luce-colonne",9,(42,127,202,423)),
 ("brent-3-tiroirs",12,(35,130,205,323)),
 ("brent-2-tiroirs-niche",12,(220,130,387,325)),
 ("brent-colonne",14,(30,128,204,438)),
 ("aruba-rainure-2-tiroirs",16,(32,123,190,303)),
 ("aruba-2-tiroirs",18,(33,122,188,299)),
 ("aruba-colonne",19,(35,120,195,409)),
 ("aras-2-tiroirs",21,(34,125,190,289)),
 ("aras-colonne",22,(35,122,190,413)),
 ("boreal-2-tiroirs",24,(34,122,196,300)),
 ("boreal-colonne",25,(34,124,188,413)),
 ("brunei-2-tiroirs",27,(33,130,195,284)),
 ("amat-2-tiroirs",29,(35,125,190,310)),
 ("amat-2-tiroirs-porte",29,(203,125,380,317)),
 ("amat-3-tiroirs",30,(33,125,185,320)),
 ("amat-3-tiroirs-porte",30,(201,120,380,330)),
 ("less-meuble",32,(30,120,200,360)),
 ("sima-plan",34,(40,150,260,310)),
]
doc=fitz.open(PDF)
if len(doc)!=43: raise RuntimeError("PDF RANDAL unexpected page count")
for name,pageno,box in TYPES:
    page=doc[pageno-1]
    pix=page.get_pixmap(matrix=fitz.Matrix(1.2,1.2),alpha=False)
    picture=Image.frombytes("RGB",(pix.width,pix.height),pix.samples)
    snippet=picture.crop(box)
    snippet.thumbnail((310,205),Image.Resampling.LANCZOS)
    out=Image.new("RGB",(360,245),(250,248,244))
    out.paste(snippet,((360-snippet.width)//2,(245-snippet.height)//2))
    destination=OUT/(name+".webp")
    out.save(destination,"WEBP",quality=86,method=6)
    print(f"{name}: p.{pageno}, {destination.stat().st_size} bytes")
print(f"{len(TYPES)} RANDAL catalogue model illustrations published")

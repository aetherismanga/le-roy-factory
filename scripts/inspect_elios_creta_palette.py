from pathlib import Path
import fitz, json
from PIL import Image,ImageDraw
PDF=Path("assets/pdf/ELIOSCATALOGUE-GENERALE 2026-1.pdf")
doc=fitz.open(PDF)
NAMES=["ZUCCHERO","AVENA","BISCOTTO","CARAMELLO","MATCHA","GINEPRO","MALTO","PEPE"]
candidates=[]
for i,p in enumerate(doc):
 txt=p.get_text().upper()
 score=sum(x in txt for x in NAMES)
 if score>=7:
  cands={n:[[round(r.x0),round(r.y0),round(r.x1),round(r.y1)] for r in p.search_for(n)] for n in NAMES}
  candidates.append(dict(page=i+1,score=score,rect=list(map(round,p.rect)),hits=cands))
print("Candidate catalogue pages:",json.dumps(candidates,ensure_ascii=False))
if not candidates:raise RuntimeError("No Creta palette page found.")
pageno=candidates[-1]["page"]
page=doc[pageno-1]
zoom=1.2
pix=page.get_pixmap(matrix=fitz.Matrix(zoom,zoom),alpha=False)
img=Image.frombytes("RGB",(pix.width,pix.height),pix.samples)
pen=ImageDraw.Draw(img)
for n,rects in candidates[-1]["hits"].items():
 for rect in rects:
  x0,y0,x1,y1=[r*zoom for r in rect]
  pen.rectangle((x0-4,y0-5,x1+4,y1+5),outline=(230,50,0),width=3)
  pen.text((x0,y0-16),n,fill=(230,50,0))
out=Path("assets/img/elios/creta/catalogue-palette-diagnostic.jpg")
img.save(out,quality=85,optimize=True)
Path("assets/img/elios/creta/catalogue-palette-diagnostic.json").write_text(json.dumps(candidates,ensure_ascii=False,indent=2))
for item in candidates:
 pn=item["page"]
 page=doc[pn-1]
 preview=page.get_pixmap(matrix=fitz.Matrix(.85,.85),alpha=False)
 im=Image.frombytes("RGB",(preview.width,preview.height),preview.samples)
 out2=Path(f"assets/img/elios/creta/catalogue-palette-page-{pn}.jpg")
 im.save(out2,quality=87)
 print("additional preview",out2)
print("saved",out, img.size)

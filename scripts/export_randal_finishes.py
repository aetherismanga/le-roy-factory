#!/usr/bin/env python3
"""Extract authentic furniture finish chips from RANDAL V04 technical pages."""
from pathlib import Path
import re
import unicodedata
import fitz
from PIL import Image, ImageDraw

DOC_PATH=Path('assets/pdf/RANDAL-V04.pdf')
OUTPUT=Path('assets/img/randal/finishes')
COLLECTIONS={
 'Harmony':(4,['Serenade Alba','Blanco mate','Gris tórtora']),
 'Luce':(8,['Verde Utopía','Azul Ceylan','Nogal Lincoln']),
 'Aruba rainuré':(16,['Roble Amazona acanalado','Nogal Valentina acanalado','Biscuit acanalado']),
 'Aruba':(18,['Roble Amazona','Nogal Valentina','Biscuit','Blanco mate','Serenade Alba','Azul Acero']),
 'Aras':(21,['Nogal Valentina','Biscuit','Blanco mate','Serenade Alba','Azul Acero']),
 'Boreal':(24,['Nogal Valentina','Biscuit','Blanco mate','Serenade Alba','Azul Acero']),
 'Brunei':(27,['Blanco mate','Negro','Gris','Serenade Alba']),
 'Amat':(29,['Biscuit','Fresno Lagom','Serenade Alba']),
 'Sima':(34,['Roble Natura','Nogal Mist','Serenade Alba']),
}
BRENT=[
 'Vert céladon · or vieilli','Bleu · or vieilli','Gris clair · or vieilli','Blanc cassé · or vieilli',
 'Vert céladon · argent vieilli','Bleu · argent vieilli','Gris clair · argent vieilli','Blanc cassé · argent vieilli'
]
LESS=['Serenade Alba / Tirador Blanco','Azul acero / Tirador Níquel','Gris Tórtora / Tirador Negro']

def slug(s):
    ascii_text=unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode('ascii').lower()
    return re.sub('(^-|-$)','',re.sub('[^a-z0-9]+','-',ascii_text))

def save_chip(doc,collection,name,page_number,center,radius=19.3):
    x,y=center
    page=doc[page_number-1]
    rect=fitz.Rect(x-radius,y-radius,x+radius,y+radius)
    if not page.rect.contains(rect):
        raise RuntimeError(f'Invalid finish location {collection} {name}')
    pix=page.get_pixmap(matrix=fitz.Matrix(4,4),clip=rect,alpha=False)
    img=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
    img=img.resize((188,188),Image.Resampling.LANCZOS).convert('RGBA')
    mask=Image.new('L',(188,188),0)
    ImageDraw.Draw(mask).ellipse((2,2,185,185),fill=255)
    img.putalpha(mask)
    path=OUTPUT/slug(collection)/(slug(name)+'.webp')
    path.parent.mkdir(parents=True,exist_ok=True)
    img.save(path,'WEBP',quality=86,method=6)
    if path.stat().st_size<500:raise RuntimeError(f'Empty finish {path}')
    print(collection,name,path.stat().st_size)

def main():
    if not DOC_PATH.is_file():raise RuntimeError(f'Missing {DOC_PATH}')
    doc=fitz.open(DOC_PATH)
    if doc.page_count!=43:raise RuntimeError('Expected 43 pages in RANDAL V04')
    count=0
    for collection,(page_number,names) in COLLECTIONS.items():
        page=doc[page_number-1]
        for name in names:
            matches=page.search_for(name)
            if not matches:raise RuntimeError(f'Missing {collection} - {name} on PDF page {page_number}')
            target=min(matches,key=lambda rect:abs(rect.y0-210))
            save_chip(doc,collection,name,page_number,((target.x0+target.x1)/2,target.y0-27))
            count+=1
    for i,name in enumerate(BRENT):
        center=(67.7 if i<4 else 339.8, [130,300,471,640][i%4])
        save_chip(doc,'Brent',name,13,center,22)
        count+=1
    for i,name in enumerate(LESS):
        save_chip(doc,'Less',name,32,(364,[226,313,397][i]),22)
        count+=1
    if count!=46:raise RuntimeError(f'Expected 46 finish photos, got {count}')
    print(f'46 authentic RANDAL furniture finishes exported.')

if __name__=='__main__':main()

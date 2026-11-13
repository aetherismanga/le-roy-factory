#!/usr/bin/env python3
"""Build the LRF R11 catalogue from the audited public product manifest."""
import json, math, os, re, hashlib, shutil
from pathlib import Path
from urllib.parse import quote, urlparse
from collections import defaultdict
from PIL import Image, ImageOps
from reportlab.pdfgen import canvas
from reportlab import rl_config
from reportlab.lib.colors import HexColor, Color, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader

REPO=Path(__file__).resolve().parents[1]
BASE=REPO
DATA=REPO/'assets/data/r11-catalogue.json'
OUT=REPO/'assets/pdf/selection-lrf-exterieur-r11.pdf'
CACHE=REPO/'tmp/pdfs/r11-images'
OUT.parent.mkdir(parents=True,exist_ok=True)
CACHE.mkdir(parents=True,exist_ok=True)
rl_config.useA85=0
W,H=841.8898,595.2756
M=35
INK=HexColor('#262923'); GOLD=HexColor('#9B8151'); CREAM=HexColor('#F4F1E9'); GREY=HexColor('#767970'); LINE=HexColor('#DBD8CF'); PALE=HexColor('#E8E5DC')
RED=HexColor('#BD292D')
FONTS=Path('/usr/share/fonts/truetype/dejavu')
for name,file in [('Sans','DejaVuSans.ttf'),('Bold','DejaVuSans-Bold.ttf'),('Serif','DejaVuSerif.ttf'),('SerifItalic','DejaVuSerif-Italic.ttf')]:
    pdfmetrics.registerFont(TTFont(name,str(FONTS/file)))

def txt(v):
    return str(v or '').replace('\u2011','-').replace('\u2013','-').replace('\u2014','-').strip()

def path_for(v):
    if isinstance(v,dict):
        v=v.get('src') or v.get('url') or v.get('image') or v.get('full') or v.get('path')
    if not v:return None
    v=str(v)
    v=v.removeprefix('https://raw.githubusercontent.com/aetherismanga/le-roy-factory/main/')
    if v.startswith('https://leroyfactory.fr/') or v.startswith('http://leroyfactory.fr/'):
        v=urlparse(v).path
    if v.startswith('http'):return None
    p=Path(v)
    if not p.is_file(): p=REPO/v.lstrip('/')
    return p if p.is_file() else None

image_cache={}
def image_reader(src,kind='photo'):
    path=path_for(src)
    if not path:return None
    key=(str(path),kind)
    if key in image_cache:return image_cache[key]
    try:
        im=Image.open(path)
        im=ImageOps.exif_transpose(im)
        if im.mode!='RGB':
            if im.mode=='RGBA':
                bg=Image.new('RGB',im.size,(244,241,233));bg.paste(im,mask=im.getchannel('A'));im=bg
            else:im=im.convert('RGB')
        im.thumbnail((2000,2000) if kind=='photo' else (1500,1500),Image.Resampling.LANCZOS)
        target=CACHE/(hashlib.sha1((str(path)+kind+'-print-v2').encode()).hexdigest()+'.jpg')
        if not target.is_file():im.save(target,quality=90,optimize=True)
        result=(ImageReader(str(target)),im.width,im.height)
        image_cache[key]=result;return result
    except Exception:return None

missing=[]
def picture(c,src,x,y,w,h,fit='cover',kind='photo'):
    result=image_reader(src,kind)
    if not result:
        c.setFillColor(PALE);c.rect(x,y,w,h,fill=1,stroke=0)
        c.setFillColor(GREY);c.setFont('Sans',8);c.drawCentredString(x+w/2,y+h/2,'Visuel à compléter')
        missing.append(str(src));return False
    image,iw,ih=result
    s=max(w/iw,h/ih) if fit=='cover' else min(w/iw,h/ih)
    dw,dh=iw*s,ih*s
    c.saveState();p=c.beginPath();p.rect(x,y,w,h);c.clipPath(p,stroke=0,fill=0)
    c.drawImage(image,x+(w-dw)/2,y+(h-dh)/2,dw,dh,mask='auto')
    c.restoreState();return True

def lines(text,width,font='Sans',size=9):
    paras=txt(text).split('\n');out=[]
    for para in paras:
        line=''
        for word in para.split():
            test=(line+' '+word).strip()
            if pdfmetrics.stringWidth(test,font,size)>width and line:
                out.append(line);line=word
            else:line=test
        out.append(line)
    return out

def textblock(c,text,x,y,width,font='Sans',size=9,leading=None,color=INK,maxlines=None):
    leading=leading or size*1.45
    wrapped=lines(text,width,font,size)
    if maxlines and len(wrapped)>maxlines:wrapped=wrapped[:maxlines-1]+[wrapped[maxlines-1].rstrip(' .')+'…']
    c.setFillColor(color);c.setFont(font,size)
    for line in wrapped:c.drawString(x,y,line);y-=leading
    return y

def small(c,text,x,y,color=GOLD,size=7.5):
    c.setFillColor(color);c.setFont('Bold',size)
    c.drawString(x,y,txt(text).upper())

def eye(c,x,y,size=10,color=GOLD):
    c.saveState();c.setStrokeColor(color);c.setLineWidth(.8)
    p=c.beginPath();p.moveTo(x,y);p.curveTo(x+size*.3,y+size*.48,x+size*.7,y+size*.48,x+size,y)
    p.curveTo(x+size*.7,y-size*.48,x+size*.3,y-size*.48,x,y);c.drawPath(p)
    c.circle(x+size*.5,y,size*.15,stroke=1,fill=0);c.restoreState()

def logo(c,x=M,y=H-74,size=49):
    c.drawImage(str(REPO/'assets/img/logo03lrf.png'),x,y,size,size,preserveAspectRatio=True,mask='auto')

def base(c,section='',page=0):
    c.setFillColor(CREAM);c.rect(0,0,W,H,fill=1,stroke=0)
    logo(c)
    small(c,'Sélection Le Roy Factory',M+65,H-41,color=INK,size=8)
    c.setFillColor(GREY);c.setFont('Sans',7.3);c.drawString(M+65,H-57,'CARRELAGE EXTÉRIEUR R11')
    c.setStrokeColor(LINE);c.setLineWidth(.55);c.line(M,H-86,W-M,H-86)
    c.line(M,34,W-M,34)
    c.setFillColor(GREY);c.setFont('Sans',6.9);c.drawString(M,21,'ÉDITION 2026  /  SÉLECTION EXTÉRIEURE')
    c.drawRightString(W-M,21,f'{section.upper()}  /  {page:03d}')
    c.linkRect('', 'toc', (M,12,M+260,33),relative=0,thickness=0)

def collection_url(col):return 'https://leroyfactory.fr/catalogue-exterieur-r11.html?collection='+quote(txt(col['id']))
def product_url(p):return 'https://leroyfactory.fr/catalogue-exterieur-r11.html?product='+quote(txt(p['id']))

def has20(col):
    return any(re.fullmatch(r'20(?:[.,]0+)?\s*(?:mm)?',txt(p.get('thickness')),re.I) for p in col['products'])

def badge20(c,x,y,width=55,height=23):
    c.saveState();c.setFillColor(RED);c.roundRect(x,y,width,height,3,fill=1,stroke=0)
    c.setFillColor(white);c.setFont('Bold',height*.43);c.drawCentredString(x+width/2,y+height*.33,'20 mm');c.restoreState()

def prepare_collection_images(cols):
    folder=REPO/'assets/img/r11-collection-hd';folder.mkdir(parents=True,exist_ok=True)
    result={}
    for col in cols:
        src=path_for(col['hero'])
        if not src:raise ValueError('Missing collection image: '+col['id'])
        im=ImageOps.exif_transpose(Image.open(src)).convert('RGB')
        # Retain the manufacturer's native definition; never upscale a small source.
        im.thumbnail((2560,2560),Image.Resampling.LANCZOS)
        target=folder/(col['id']+'.webp');im.save(target,'WEBP',quality=93,method=6)
        result[col['id']]={'image':target.relative_to(REPO).as_posix(),'width':im.width,'height':im.height}
    return result

def cover(c,cols,stats):
    candidates=[x for x in cols if 'coco' in x['id'].lower()]+[x for x in cols if 'stone-icon' in x['id'].lower()]+cols
    hero=next((x for x in candidates if image_reader(x.get('hero'))),cols[0])
    c.setFillColor(CREAM);c.rect(0,0,W,H,fill=1,stroke=0)
    picture(c,hero.get('hero'),300,0,W-300,H)
    c.setFillColor(INK);c.rect(300,0,W-300,55,fill=1,stroke=0)
    c.setFillColor(white);c.setFont('Sans',8);c.drawString(318,25,f"{txt(hero['brand']).upper()}  /  {txt(hero['name'])}")
    logo(c,M,H-104,62)
    small(c,'Collection extérieure',M,H-155)
    y=H-205
    for line in ['Sélection','Le Roy','Factory']:
        c.setFillColor(INK);c.setFont('Serif',34);c.drawString(M,y,line);y-=39
    y-=23
    c.setFillColor(GOLD);c.setFont('Serif',23);c.drawString(M,y,'Carrelage');c.drawString(M,y-30,'extérieur R11')
    textblock(c,'La matière, les nuances et les formats pour dessiner vos espaces extérieurs.',M,y-68,220,size=9.2,color=GREY)
    c.setStrokeColor(GOLD);c.setLineWidth(.7);c.line(M,95,256,95)
    small(c,'Elios  /  View  /  La Fenice',M,76,color=INK,size=8)
    c.setFillColor(GREY);c.setFont('Sans',7.2);c.drawString(M,56,f"{stats['collections']} collections  ·  {stats['products']} références R11")
    c.setFont('Sans',6.8);c.drawString(M,31,'ÉDITION 2026  /  EXTÉRIEUR R11')
    c.bookmarkPage('cover');c.addOutlineEntry('Couverture','cover',level=0)
    c.showPage()

def chunks(xs,n):return [xs[i:i+n] for i in range(0,len(xs),n)]

def build():
    data=json.loads(DATA.read_text())
    cols=data['collections']
    cols=sorted(cols,key=lambda x:({'Elios':0,'ELIOS':0,'View':1,'VIEW':1,'La Fenice':2,'LA FENICE':2}.get(x['brand'],3),txt(x['name']).lower()))
    stats={'collections':len(cols),'products':sum(len(x['products']) for x in cols)}
    plans=[]
    for col in cols:
        plans.append(('intro',col,None))
        for block in chunks(col['products'],8):plans.append(('products',col,block))
    # An interactive factory index followed by illustrated collection indexes.
    brands=list(dict.fromkeys(col['brand'] for col in cols))
    tocblocks=[(brand,block) for brand in brands for block in chunks([col for col in cols if col['brand']==brand],9)]
    brand_starts={brand:3+next(i for i,(b,_) in enumerate(tocblocks) if b==brand) for brand in brands}
    first=3+len(tocblocks)
    pageno=first
    starts={}
    for typ,col,block in plans:
        if typ=='intro':starts[col['id']]=pageno
        pageno+=1
    images=prepare_collection_images(cols)
    c=canvas.Canvas(str(OUT),pagesize=(W,H),pageCompression=1,invariant=1)
    c.setTitle('Sélection Le Roy Factory - Carrelage extérieur R11')
    c.setAuthor('LE ROY FACTORY')
    c.setSubject('Catalogue interactif extérieur R11 - Elios, View et La Fenice - Édition 2026')
    c.setKeywords('carrelage, extérieur, R11, Elios, View, La Fenice, catalogue')
    cover(c,cols,stats)
    base(c,'Sommaire',2);c.bookmarkPage('toc');c.addOutlineEntry('Sommaire des usines','toc',level=0)
    small(c,'Explorer la sélection',M,H-111)
    textblock(c,'Une usine, puis votre collection.',M,H-151,740,font='Serif',size=28)
    textblock(c,'Cliquez sur une usine pour découvrir ses collections en images. Le repère rouge signale les collections proposées en 20 mm.',M,H-178,740,size=9,color=GREY)
    cw=(W-2*M-32)/3
    for i,brand in enumerate(brands):
        group=[col for col in cols if col['brand']==brand]
        hero=next((col for col in group if 'coco' in col['id']),group[0])
        x=M+i*(cw+16);picture(c,hero['hero'],x,178,cw,195)
        c.setFillColor(white);c.rect(x,107,cw,71,fill=1,stroke=0)
        textblock(c,'VIEW' if brand=='View' else brand,x+14,151,cw-28,font='Serif',size=21)
        textblock(c,f"{len(group)} collections  /  Page {brand_starts[brand]}",x+14,126,cw-28,size=8,color=GREY)
        c.linkRect('', 'brand-'+norm_brand(brand), (x,107,x+cw,373),relative=0,thickness=0)
    c.showPage()
    for idx,(brand,block) in enumerate(tocblocks):
        page=idx+3;base(c,'Sommaire / '+brand,page)
        if page==brand_starts[brand]:
            c.bookmarkPage('brand-'+norm_brand(brand));c.addOutlineEntry('VIEW' if brand=='View' else brand,'brand-'+norm_brand(brand),level=0)
        small(c,'Explorer la sélection',M,H-110)
        textblock(c,'VIEW' if brand=='View' else brand,M,H-146,720,font='Serif',size=27)
        small(c,'CHOISIR UNE AUTRE USINE',W-M-154,H-139,color=GOLD,size=7)
        c.linkRect('', 'toc', (W-M-158,H-150,W-M,H-124),relative=0,thickness=0)
        textblock(c,'Cliquez sur une image pour ouvrir la collection. 20 mm : épaisseur disponible dans la collection.',M,H-166,710,size=8,color=GREY)
        gap=16;cw=(W-2*M-2*gap)/3;ch=111;top=H-186
        for i,col in enumerate(block):
            x=M+(i%3)*(cw+gap);y=top-(i//3)*(ch+10)-ch
            picture(c,col['hero'],x,y+30,cw,ch-30)
            c.setFillColor(white);c.rect(x,y,cw,30,fill=1,stroke=0)
            textblock(c,col['name'],x+9,y+11,cw-51,font='Bold',size=8,maxlines=1)
            c.setFillColor(GREY);c.setFont('Sans',8);c.drawRightString(x+cw-9,y+11,str(starts[col['id']]))
            if has20(col):badge20(c,x+cw-53,y+ch-24,width=47,height=19)
            c.linkRect('',col['id'],(x,y,x+cw,y+ch),relative=0,thickness=0)
        same=[j for j,(b,_) in enumerate(tocblocks) if b==brand]
        c.setFillColor(GREY);c.setFont('Sans',7.3);c.drawString(M,45,f"{len([col for col in cols if col['brand']==brand])} collections  /  {same.index(idx)+1} sur {len(same)}")
        if idx>same[0]:
            c.bookmarkPage('toc-page-'+str(page))
        if idx<same[-1]:
            c.setFillColor(GOLD);c.drawRightString(W-M,45,'COLLECTIONS SUIVANTES >')
            c.linkRect('', 'toc-page-'+str(page+1),(W-M-170,39,W-M,56),relative=0,thickness=0)
        c.showPage()
    # All body bookmarks are nested beneath a factory, including in native PDF readers.
    body_brand=None
    for offset,(typ,col,products) in enumerate(plans):
        page=first+offset
        base(c,col['brand'],page)
        if typ=='intro':
            if col['brand']!=body_brand:
                body_brand=col['brand'];c.bookmarkPage('body-'+norm_brand(body_brand));c.addOutlineEntry(('VIEW' if body_brand=='View' else body_brand)+' - Collections','body-'+norm_brand(body_brand),level=0)
            c.bookmarkPage(col['id']);c.addOutlineEntry(col['name'],col['id'],level=1)
            # Ambience occupying the left page; catalogue information on the right.
            picture(c,col.get('hero'),M,140,490,347)
            x=552
            small(c,col['brand'],x,478)
            title=txt(col['name'])
            ts=28 if len(title)<20 else 23
            y=textblock(c,title,x,443,252,font='Serif',size=ts,leading=ts*1.13,maxlines=3)-13
            category=txt(col.get('category') or 'Grès cérame extérieur')
            y=textblock(c,category,x,y,250,size=10,color=GREY)-20
            c.setFillColor(INK);c.roundRect(x,y-25,42,26,3,fill=1,stroke=0)
            c.setFillColor(white);c.setFont('Bold',10);c.drawCentredString(x+21,y-16,'R11')
            c.setFillColor(GREY);c.setFont('Sans',8);c.drawString(x+53,y-16,'Sélection extérieure')
            if has20(col):badge20(c,x+190,y-25)
            y-=54
            formats=list(dict.fromkeys(txt(p.get('format')) for p in col['products'] if p.get('format')))
            y=textblock(c,'FORMATS R11',x,y,245,font='Bold',size=7.5,color=GOLD)-4
            y=textblock(c,'  /  '.join(formats),x,y,245,size=9,leading=14)-16
            colors=list(dict.fromkeys(txt(p.get('color')) for p in col['products'] if p.get('color')))
            y=textblock(c,'NUANCES',x,y,245,font='Bold',size=7.5,color=GOLD)-4
            y=textblock(c,'  /  '.join(colors),x,y,245,size=8.3,leading=12,maxlines=5)-16
            y=textblock(c,f"{len(col['products'])} références dans les pages suivantes",x,y,245,size=8,color=GREY)-15
            c.setStrokeColor(LINE);c.line(x,max(137,y),W-M,max(137,y))
            # The lower panel presents real tile visuals for the colour palette.
            unique=[];seen=set()
            for p in col['products']:
                color=txt(p.get('color'))
                if color not in seen:unique.append(p);seen.add(color)
            selected=unique[:8];gap=9;sw=(490-gap*(len(selected)-1))/max(1,len(selected))
            sw=min(sw,85)
            for i,p in enumerate(selected):
                xx=M+i*(sw+gap);picture(c,p.get('image'),xx,64,sw,57,fit='contain',kind='tile')
                textblock(c,p.get('color'),xx,54,sw,size=5.8,leading=7,maxlines=1)
            c.setFillColor(GOLD);c.roundRect(x,73,252,35,3,fill=1,stroke=0)
            eye(c,x+13,91,color=white,size=14)
            c.setFillColor(white);c.setFont('Bold',8);c.drawString(x+39,88,'OUVRIR LE CATALOGUE INTERACTIF')
            c.linkURL(collection_url(col),(x,73,x+252,108),relative=0,thickness=0)
            c.setFillColor(GREY);c.setFont('Sans',6.5);c.drawString(x,57,'Accès aux prix d’achat avec vos codes LRF.')
        else:
            small(c,col['brand']+'  /  R11',M,478)
            textblock(c,col['name'],M,444,620,font='Serif',size=27,maxlines=1)
            c.setFillColor(GREY);c.setFont('Sans',8);c.drawRightString(W-M,449,'COULEURS & FORMATS')
            if has20(col):badge20(c,W-M-55,469)
            # Adjust the grid to the exact reference count so short ranges stay generous.
            n=len(products)
            nc=n if n<=3 else (2 if n==4 else (3 if n<=6 else 4))
            nr=math.ceil(n/nc)
            gap=13;cw=(W-2*M-(nc-1)*gap)/nc;ch=(360-(nr-1)*16)/nr;ytop=422
            image_h=ch-85
            for i,p in enumerate(products):
                colidx=i%nc;row=i//nc;x=M+colidx*(cw+gap);top=ytop-row*(ch+16);y=top-ch
                c.setFillColor(white);c.roundRect(x,y,cw,ch,3,fill=1,stroke=0)
                picture(c,p.get('image'),x+8,top-image_h-8,cw-16,image_h,fit='contain',kind='tile')
                textblock(c,p.get('color') or col['name'],x+9,y+62,cw-18,font='Bold',size=8.7,maxlines=1)
                form=txt(p.get('format'));th=txt(p.get('thickness'))
                if th and not 'mm' in th.lower():th+=' mm'
                details=form+('  ·  '+th if th else '')
                textblock(c,details,x+9,y+47,cw-18,size=7.8,maxlines=1)
                ref=txt(p.get('sku') or p.get('reference') or '')
                finish=txt(p.get('finish') or 'R11')
                subtitle=finish+('  ·  '+ref if ref else '')
                textblock(c,subtitle,x+9,y+33,cw-18,size=6.7,color=GREY,maxlines=1)
                resolution=p.get('imageResolution')
                if resolution and max(resolution)<600:
                    textblock(c,'Échantillon source - définition limitée',x+9,y+23,cw-18,size=5.7,color=GREY,maxlines=1)
                eye(c,x+10,y+12,size=12)
                c.setFillColor(GOLD);c.setFont('Bold',6.9);c.drawString(x+29,y+10,'VOIR MON PRIX D’ACHAT HT')
                c.linkURL(product_url(p),(x,y,x+cw,top),relative=0,thickness=0)
            textblock(c,'Les références présentées correspondent aux variantes R11 de la sélection. Les tarifs se consultent dans l’espace LRF connecté.',M,48,W-2*M,size=6.6,color=GREY,maxlines=1)
        c.showPage()
    # Compact reference and navigation panel closes the catalogue.
    end=first+len(plans);base(c,'Repères',end)
    small(c,'Vos projets commencent ici',M,475)
    textblock(c,'À chaque extérieur, sa matière.',M,426,650,font='Serif',size=30)
    columns=[('Trouver le bon format','Dans le catalogue interactif, croisez les filtres de format, de catégorie et d’usine pour comparer les références R11 de votre projet.'),('Consulter vos prix','Connectez-vous avec vos codes LRF puis cliquez sur le petit œil de chaque produit. Les prix d’achat restent dans votre espace connecté.'),('Préparer votre sélection','Ouvrez une fiche depuis les pages produits pour retrouver les visuels, les caractéristiques et les informations fabricant de la référence choisie.')]
    cw=(W-2*M-50)/3
    for i,(title,body) in enumerate(columns):
        x=M+i*(cw+25);small(c,'0'+str(i+1),x,350)
        y=textblock(c,title,x,320,cw,font='Serif',size=18,leading=23)-15
        textblock(c,body,x,y,cw,size=9,color=GREY)
    c.setFillColor(INK);c.roundRect(M,130,370,47,3,fill=1,stroke=0)
    c.setFillColor(white);c.setFont('Bold',9);c.drawString(M+18,149,'OUVRIR LA SÉLECTION EXTÉRIEURE R11')
    c.linkURL('https://leroyfactory.fr/catalogue-exterieur-r11.html',(M,130,M+370,177),relative=0,thickness=0)
    textblock(c,'Les liens ouvrent la sélection en ligne ; les tarifs sont réservés aux comptes LRF autorisés. Les visuels sont ceux des collections fabricants ; les variantes, épaisseurs et finitions sont indiquées sur chaque fiche.',M,91,720,size=7.1,color=GREY)
    c.showPage();c.save()
    reader=PdfReader(str(OUT));annots=sum(len(p.get('/Annots',[])) for p in reader.pages)
    index={'version':1,'revision':'20261113-navigation2','pageCount':len(reader.pages),'tocPage':2,
        'brands':[{'name':b,'page':brand_starts[b],'collections':len([x for x in cols if x['brand']==b]),'image':images[next(x['id'] for x in cols if x['brand']==b)]['image']} for b in brands],
        'collections':[{'id':col['id'],'brand':col['brand'],'name':col['name'],'category':col.get('category',''),'page':starts[col['id']],'endPage':starts[cols[i+1]['id']]-1 if i+1<len(cols) else end-1,'has20mm':has20(col),**images[col['id']]} for i,col in enumerate(cols)]}
    (REPO/'assets/data/r11-pdf-index.json').write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n')
    report={'path':str(OUT),'pages':len(reader.pages),'links':annots,'collections':len(cols),'products':stats['products'],'missingImages':sorted(set(missing)),'bytes':OUT.stat().st_size}
    (CACHE/'publication-qa.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps(report,ensure_ascii=False))

def norm_brand(brand):return re.sub(r'[^a-z0-9]','',brand.lower())

if __name__=='__main__':build()

#!/usr/bin/env python3
"""Publie la grille RANDAL STUDIO ONE pour les vasques.
Prix et références transcrits du PDF fourni :
STUDIO_ONE_VASQUES_PASTILLES_ET_MEUBLES_COMPLETS_V2-1.pdf (2 pages).
Les images proviennent exclusivement du catalogue RANDAL V04 stocké dans ce dépôt.
Conversion : prix public TTC / 1,20 * 0,50 = prix professionnel HT.
"""
from decimal import Decimal, ROUND_HALF_UP
from io import BytesIO
from pathlib import Path
import fitz
from PIL import Image
from reportlab.pdfgen.canvas import Canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader

CAT=Path("assets/pdf/RANDAL-V04.pdf")
OUT=Path("assets/pdf/RANDAL-STUDIO-ONE-VASQUES-TARIF-PRO-HT.pdf")
PW,PH=A4; PAD=52
BLUE=HexColor("#09335C"); INK=HexColor("#253039")
MUTED=HexColor("#667378"); BG=HexColor("#F6F4EF")
STRIPE=HexColor("#EAE8E1"); WHITE=HexColor("#FFFFFF")
SELLA=[
[("60",138,"2215"),("70",156,"2808"),("80",163.2,"2171"),("90",198,"13237"),("100",211.2,"3279")],
[("80",230.4,"6205"),("90",300,"13547"),("100",351.6,"6207"),("120",462,"6389")],
[("120 double",381.6,"2809")]]
TAMPA=[
[("60",146.4,"6227"),("70",165.6,"7781"),("80",170.4,"6228"),("90",207.6,"7782"),("100",230.4,"6229"),("120",334.8,"6232")],
[("80",241.2,"7865"),("90",338.4,"7463"),("100",364.8,"6231"),("120",493.2,"6234")],
[("120 double",387.6,"6235"),("140 double",807.6,"6236")]]
MAT=[
[("60",243.6,"13039"),("70",316.8,"13040"),("80",316.8,"13041"),("90",379.2,"13042"),("100",398.4,"13043"),("120",570,"13044")],
[("80",460.8,"13550"),("90",498,"13551"),("100",512.4,"13046"),("120",646.8,"13047")],
[("120 double",598.8,"13045"),("140 double*",1082.4,"13000")]]
FINISHES=[
("Blanc brillant","9567","9559","#F4F4F0"),("Blanc pur","9560","9552","#FFFFFF"),
("Anthracite","9564","9556","#848586"),("Noir mat","11371","10444","#343434"),
("Taupe","9561","9553","#AC9B8B"),("Vert Namibie","9562","9554","#68705F"),
("Ivoire","9563","9555","#E7E7DC"),("Rose Nadir","9566","9558","#CBA79C"),
("Bleu Kivu","9565","9557","#073A57")]

def pro(ttc):
    return (Decimal(str(ttc))/Decimal("1.20")*Decimal("0.50")).quantize(Decimal(".01"),rounding=ROUND_HALF_UP)
def euro(ttc):
    return (f"{pro(ttc):.2f}".replace(".",",")+" €")
def fill(c,x,y,w,h,color,r=0):
    c.setFillColor(color)
    if r: c.roundRect(x,y,w,h,r,stroke=0,fill=1)
    else: c.rect(x,y,w,h,stroke=0,fill=1)
def txt(c,t,x,y,size=9,color=INK,bold=False):
    c.setFillColor(color);c.setFont("Helvetica-Bold" if bold else "Helvetica",size)
    c.drawString(x,y,str(t))
def right(c,t,x,y,size=9,color=INK,bold=False):
    c.setFillColor(color);c.setFont("Helvetica-Bold" if bold else "Helvetica",size)
    c.drawRightString(x,y,str(t))
def header(c,heading,n):
    fill(c,0,0,PW,PH,BG)
    txt(c,"studio",PAD,PH-61,36,BLUE,True)
    txt(c,"one",PAD+124,PH-54,14,BLUE)
    txt(c,heading,PAD,PH-93,19,INK,True)
    fill(c,PW-192,PH-72,140,30,BLUE,6)
    right(c,"PRO HT  /  -50 %",PW-PAD-14,PH-61,10,WHITE,True)
    c.setStrokeColor(STRIPE);c.line(PAD,PH-109,PW-PAD,PH-109)
    fill(c,PAD,36,PW-2*PAD,1,STRIPE)
    txt(c,"RANDAL  |  STUDIO ONE  |  TARIF PROFESSIONNEL HT",PAD,23,8,BLUE,True)
    right(c,f"{n} / 2",PW-PAD,23,8,BLUE,True)
def band(c,t,y):
    fill(c,PAD,y,PW-2*PAD,24,STRIPE,3);txt(c,t,PAD+9,y+7,10,INK,True)
def crop(doc,page,xy):
    p=doc[page-1];pix=p.get_pixmap(matrix=fitz.Matrix(2.7,2.7),clip=fitz.Rect(*xy),alpha=False)
    im=Image.frombytes("RGB",(pix.width,pix.height),pix.samples);stream=BytesIO()
    im.save(stream,"JPEG",quality=90,optimize=True);stream.seek(0)
    return ImageReader(stream)
def pic(c,im,x,y,w,h):
    fill(c,x,y,w,h,WHITE,4)
    iw,ih=im.getSize();r=min(w/iw,h/ih);dw=iw*r;dh=ih*r
    c.drawImage(im,x+(w-dw)/2,y+(h-dh)/2,dw,dh)
def table(c,rows,x,top,width=151,step=17):
    fill(c,x,top-17,width,17,STRIPE)
    txt(c,"FORMAT",x+6,top-12,7.4,INK,True)
    right(c,"PRIX PRO HT",x+width-40,top-12,7.1,INK,True)
    right(c,"REF.",x+width-5,top-12,7.4,INK,True)
    for j,(fmt,ttc,ref) in enumerate(rows):
        y=top-17-step*(j+1)
        if j%2:fill(c,x,y,width,step,STRIPE)
        txt(c,fmt+" cm" if fmt.isdigit() else fmt,x+6,y+5,8.1)
        right(c,euro(ttc),x+width-33,y+5,7.7,BLUE,True)
        right(c,ref,x+width-5,y+5,7.6,MUTED)
def main():
    assert CAT.exists(),"Catalogue RANDAL V04 introuvable"
    doc=fitz.open(CAT);assert doc.page_count==43
    assert pro(138)==Decimal("57.50") and pro(271.2)==Decimal("113.00")
    OUT.parent.mkdir(parents=True,exist_ok=True)
    c=Canvas(str(OUT),pagesize=A4,pageCompression=1)
    c.setTitle("RANDAL STUDIO ONE - VASQUES - PRIX PRO HT - REMISE 50%")
    header(c,"VASQUES CERAMIQUES INTEGREES",1)
    txt(c,"SELLA et TAMPA  |  Modeles et cotes du catalogue RANDAL V04",PAD,PH-127,9.5,MUTED)
    band(c,"SELLA  |  Blanc brillant  |  Profondeur 46 cm / Hauteur 16 cm",PH-169)
    cols=[PAD,PAD+163,PAD+326]
    for i,clip in enumerate([(59,175,175,231),(251,175,371,231),(403,169,570,235)]):
        pic(c,crop(doc,38,clip),cols[i],PH-233,151,57)
    for i,rows in enumerate(SELLA):table(c,rows,cols[i],PH-239,step=16.3)
    band(c,"TAMPA  |  Profondeur 46 cm / Hauteur 15 cm",PH-385)
    for i,clip in enumerate([(58,381,175,440),(250,381,372,442),(402,383,570,446)]):
        pic(c,crop(doc,38,clip),cols[i],PH-449,151,57)
    txt(c,"BLANC BRILLANT",PAD,PH-465,10,BLUE,True)
    for i,rows in enumerate(TAMPA):table(c,rows,cols[i],PH-469,step=17)
    txt(c,"BLANC MAT  /  NOIR MAT",PAD,PH-620,10,BLUE,True)
    for i,rows in enumerate(MAT):table(c,rows,cols[i],PH-626,step=16.9)
    txt(c,"* Le document fourni mentionne 140 cm en blanc mat : disponibilite et references a confirmer.",PAD,56,8,MUTED)
    c.showPage()
    header(c,"VASQUES A POSER  |  NERIS ET TORNE",2)
    txt(c,"9 finitions disponibles aux memes tarifs professionnels",PAD,PH-126,9,MUTED)
    band(c,"MODELES ET COTES  |  PRIX PROFESSIONNEL HT",PH-165)
    pic(c,crop(doc,41,(133,214,242,288)),PAD+27,PH-301,190,105)
    pic(c,crop(doc,41,(358,215,483,291)),PW-PAD-217,PH-301,190,105)
    txt(c,"NERIS",PAD+92,PH-189,12,INK,True)
    txt(c,"TORNE",PW-PAD-143,PH-189,12,INK,True)
    txt(c,"46 x 33 cm  /  H 14 cm",PAD+57,PH-316,8.6)
    txt(c,"Diametre 37 cm  /  H 12 cm",PW-PAD-205,PH-316,8.6)
    txt(c,euro(271.2),PAD+95,PH-344,17,BLUE,True)
    txt(c,euro(271.2),PW-PAD-185,PH-344,17,BLUE,True)
    band(c,"9 FINITIONS ET REFERENCES",PH-390)
    top=PH-405
    fill(c,PAD,top-23,PW-2*PAD,23,STRIPE)
    txt(c,"FINITION",PAD+38,top-15,8,BLUE,True)
    right(c,"NERIS",PAD+334,top-15,8,BLUE,True)
    right(c,"TORNE",PW-PAD-15,top-15,8,BLUE,True)
    for i,(finish,neris,torne,hue) in enumerate(FINISHES):
        y=top-23-(i+1)*20.5
        if i%2==0:fill(c,PAD,y,PW-2*PAD,20.5,STRIPE)
        c.setFillColor(HexColor(hue));c.circle(PAD+17,y+10,6.5,stroke=1,fill=1)
        txt(c,finish,PAD+38,y+7,8.5)
        right(c,neris,PAD+334,y+7,8.5,INK,True)
        right(c,torne,PW-PAD-15,y+7,8.5,INK,True)
    band(c,"VISUELS DU CATALOGUE RANDAL V04",PH-643)
    pic(c,crop(doc,39,(15,149,292,427)),PAD,PH-779,230,114)
    pic(c,crop(doc,39,(303,149,583,478)),PW-PAD-230,PH-779,230,114)
    txt(c,"Prix PRO HT = prix public TTC / 1,20 puis remise de 50 %.",PAD,56,8,MUTED)
    c.save();print("OK",OUT,OUT.stat().st_size)
if __name__=="__main__":main()

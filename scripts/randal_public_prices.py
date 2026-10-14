#!/usr/bin/env python3
"""Rebuild the public RANDAL V04 PDF with taxes included but no tax labels.
Source is immutable 'RANDAL%20V04.pdf'; output is the public 'RANDAL-V04.pdf'.
All changes are applied to searchable PDF text, retaining 43 pages and images.
"""
import re
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
import fitz

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"assets/pdf/RANDAL%20V04.pdf"
DEST=ROOT/"assets/pdf/RANDAL-V04.pdf"
FONT=Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
PRICE=re.compile(r"(?<![\w\d])\d[\d ]*(?:[.,]\d+)?\s*€")
FULL_PRICE=re.compile(r"\s*\*?\s*\d[\d .]*\s*€\s*")

def adjust(line):
    def change(m):
        raw=m.group(0).replace("€","").replace(" ","").replace(",",".")
        value=(Decimal(raw)*Decimal("1.20")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        display=str(int(value)) if value%1==0 else f"{value:.2f}".replace(".",",")
        return display+" €"
    result=PRICE.sub(change,line)
    result=re.sub(r"Prix Vente H\.T\. conseillé", "Prix de vente conseillé", result, flags=re.I)
    result=re.sub(r"Prix Vente H\.T\.", "Prix de vente", result, flags=re.I)
    result=re.sub(r"Prix vente H\.T\s+conseill[eé]s","Prix de vente conseillés",result,flags=re.I)
    return result if result!=line else None

def run():
    if not SOURCE.exists():raise RuntimeError("Catalogue source introuvable")
    if not FONT.exists():raise RuntimeError("Police Unicode DejaVuSans indisponible")
    doc=fitz.open(SOURCE)
    if len(doc)!=43:raise RuntimeError(f"Nombre de pages inattendu : {len(doc)}")
    fontdata=FONT.read_bytes()
    font=fitz.Font(fontbuffer=fontdata)
    corrected=0
    for page in doc:
        updates=[]
        for block in page.get_text("dict")["blocks"]:
            for line in block.get("lines",[]):
                for span in line["spans"]:
                    changed=adjust(span["text"])
                    if changed is not None:
                        updates.append((span,changed))
        if not updates:continue
        for span,new in updates:
            rect=fitz.Rect(span["bbox"])
            origin=fitz.Point(span["origin"])
            tight=fitz.Rect(rect.x0-.2,origin.y-span["size"]*.86,rect.x1+.2,origin.y+span["size"]*.22)
            page.add_redact_annot(tight, fill=False, cross_out=False)
        page.apply_redactions(images=0,graphics=0,text=0)
        page.insert_font(fontname="randalpublic",fontbuffer=fontdata)
        for span,new in updates:
            size=span["size"]
            bounds=fitz.Rect(span["bbox"])
            origin=fitz.Point(span["origin"])
            is_price=bool(FULL_PRICE.fullmatch(span["text"]))
            max_width=bounds.width+15
            if is_price:max_width=min(46,max_width+1)
            while font.text_length(new,fontsize=size)>max_width and size>5.5:size-=.15
            width=font.text_length(new,fontsize=size)
            left=bounds.x1-width if is_price else bounds.x0
            color=((span["color"]>>16&255)/255,(span["color"]>>8&255)/255,(span["color"]&255)/255)
            page.insert_text((left,origin.y),new,fontname="randalpublic",fontsize=size,color=color,overlay=True)
        corrected+=len(updates)
    DEST.parent.mkdir(parents=True,exist_ok=True)
    doc.save(DEST,deflate=True,garbage=4)
    doc.close()
    check=fitz.open(DEST)
    text="\n".join(page.get_text() for page in check)
    if len(check)!=43 or corrected<300:raise RuntimeError(f"Invalid conversion: pages={len(check)} updates={corrected}")
    if "H.T." in text or "H.T " in text or "TTC" in text:raise RuntimeError("Tax labels remain in public catalogue")
    if "338,40 €" not in text or "384 €" not in text:raise RuntimeError("Price sample validation failed")
    if DEST.stat().st_size>25_000_000:raise RuntimeError(f"PDF too large: {DEST.stat().st_size} bytes")
    print(f"Public RANDAL PDF: {len(check)} pages, {corrected} text replacements, {DEST.stat().st_size} bytes")

if __name__=="__main__":
    run()

#!/usr/bin/env python3
"""Extract genuine metallic mirror frame finish chips from RANDAL V04, PDF page 36.

The original PDF shows four circular frame-finish swatches beside the metal
mirror reference tables. Crop those actual swatches, not approximated CSS colors.
"""
from pathlib import Path
import io
import fitz
from PIL import Image, ImageDraw

CATALOG = Path("assets/pdf/RANDAL%20V04.pdf")
OUT = Path("assets/img/randal/mirror-finishes")
SWATCH_Y = {"anthracite": 603, "dore": 627, "bronze": 651, "argent": 677}
SWATCH_X = 222

def main():
    if not CATALOG.is_file():
        raise RuntimeError("RANDAL source PDF not found")
    doc = fitz.open(CATALOG)
    if len(doc) != 43:
        raise RuntimeError("Unexpected catalogue page count")
    page = doc[35]
    OUT.mkdir(parents=True, exist_ok=True)
    for label, y in SWATCH_Y.items():
        rect = fitz.Rect(SWATCH_X-10.6, y-10.6, SWATCH_X+10.6, y+10.6)
        pix = page.get_pixmap(matrix=fitz.Matrix(7,7), clip=rect, alpha=False)
        original = Image.frombytes("RGB", (pix.width,pix.height), pix.samples)
        original = original.resize((180,180),Image.Resampling.LANCZOS).convert("RGBA")
        mask=Image.new("L",(180,180),0)
        ImageDraw.Draw(mask).ellipse((5,5,175,175),fill=255)
        original.putalpha(mask)
        target=OUT/(label+".webp")
        original.save(target,"WEBP",quality=94,method=6)
        if target.stat().st_size < 500:
            raise RuntimeError("Invalid miniature "+label)
        print(label, target.stat().st_size, "bytes")
    print("4 real RANDAL metallic mirror swatches from PDF page 36")

if __name__=="__main__":
    main()

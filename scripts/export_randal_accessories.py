#!/usr/bin/env python3
"""Build verified RANDAL V04 basin/mirror artwork (not generic furniture imagery)."""
from pathlib import Path
import fitz
from PIL import Image

CATALOGUE = Path("assets/pdf/RANDAL-V04.pdf")
OUT = Path("assets/img/randal/accessories")
OUT.mkdir(parents=True, exist_ok=True)

# Product shapes in the OFFICIAL French V04 PDF. Rects use PDF points.
# Drawings were visually validated on pages 36, 38 and 41.
PRODUCTS = [
    ("mirror-basic", 36, (39,153,165,302)),
    ("mirror-zen-led", 36, (255,152,352,300)),
    ("mirror-ilse-led", 36, (455,152,541,303)),
    ("mirror-capsula-led", 36, (65,398,144,563)),
    ("mirror-metal-rectangular", 36, (244,400,352,555)),
    ("mirror-metal-round", 36, (440,404,543,545)),
    ("basin-sella", 38, (59,175,172,230)),
    ("basin-tampa", 38, (59,383,173,439)),
    ("basin-neris", 41, (133,219,232,290)),
    ("basin-torne", 41, (369,224,470,293)),
]

if not CATALOGUE.is_file():
    raise SystemExit("Catalogue RANDAL V04 introuvable")
doc = fitz.open(CATALOGUE)
if doc.page_count != 43:
    raise SystemExit(f"Le catalogue doit contenir 43 pages : {doc.page_count}")

for slug, page_no, rect in PRODUCTS:
    page = doc[page_no - 1]
    source = page.get_pixmap(matrix=fitz.Matrix(3,3), clip=fitz.Rect(rect), alpha=False)
    image = Image.frombytes("RGB", (source.width,source.height), source.samples)
    image.thumbnail((430,250),Image.Resampling.LANCZOS)
    canvas = Image.new("RGB",(480,320),(248,246,242))
    canvas.paste(image, ((480-image.width)//2, (320-image.height)//2))
    path = OUT / (slug + ".webp")
    canvas.save(path, "WEBP", quality=88, method=6)
    if path.stat().st_size < 1200:
        raise RuntimeError("Unexpected tiny product image: " + slug)
    print(f"{slug}: PDF p.{page_no}, {path.stat().st_size} bytes")

assert len(list(OUT.glob("*.webp"))) >= len(PRODUCTS)
print("10 silhouettes officielles de vasques et miroirs générées.")

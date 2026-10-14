#!/usr/bin/env python3
"""Export 22 razor-sharp vector drawings directly from RANDAL's catalogue PDF.

Keeps the original PDF linework and text outlines as real SVG paths.
The 2026 preview exporter rasterized at 1.2x and reduced to 360px, which
caused severe blur when shoppers zoomed on phones. This version never rasterizes.
"""
from pathlib import Path
import fitz
import xml.etree.ElementTree as ET

PDF = Path("assets/pdf/RANDAL%20V04.pdf")  # Preserve original vector artwork
OUT = Path("assets/img/randal/types")
OUT.mkdir(parents=True, exist_ok=True)

# Source PDF page (1-based) and PDF-point crop around the representative drawing.
# Carefully bounded so the next letter/model does not leak into the thumbnail.
TYPES = [
    ("harmony-2-tiroirs",4,(20,105,157,248)),
    ("harmony-3-tiroirs",5,(20,103,157,254)),
    ("harmony-colonne",6,(28,108,170,448)),
    ("luce-meuble",8,(40,127,245,285)),
    ("luce-colonne",9,(35,113,174,454)),
    ("brent-3-tiroirs",12,(27,107,171,272)),
    ("brent-2-tiroirs-niche",12,(183,107,324,271)),
    ("brent-colonne",14,(28,109,178,373)),
    ("aruba-rainure-2-tiroirs",16,(26,105,162,242)),
    ("aruba-2-tiroirs",18,(26,105,165,226)),
    ("aruba-colonne",19,(30,106,165,445)),
    ("aras-2-tiroirs",21,(26,105,166,242)),
    ("aras-colonne",22,(30,106,165,445)),
    ("boreal-2-tiroirs",24,(33,107,166,228)),
    ("boreal-colonne",25,(29,106,165,447)),
    ("brunei-2-tiroirs",27,(26,107,164,236)),
    ("amat-2-tiroirs",29,(27,107,164,270)),
    ("amat-2-tiroirs-porte",29,(173,107,323,270)),
    ("amat-3-tiroirs",30,(27,106,164,276)),
    ("amat-3-tiroirs-porte",30,(173,106,325,276)),
    ("less-meuble",32,(24,106,175,432)),
    ("sima-plan",34,(27,110,228,235)),
]
if not PDF.is_file():
    raise SystemExit(f"Missing original PDF: {PDF}")
document=fitz.open(PDF)
if document.page_count!=43:
    raise SystemExit(f"Expected 43 RANDAL pages, got {document.page_count}")

total_bytes=0
for name,page_number,coordinates in TYPES:
    original=document[page_number-1]
    crop=fitz.Rect(coordinates)
    if crop.is_empty or not original.rect.contains(crop):
        raise RuntimeError(f"Invalid crop: {name}")
    # A temporary cropped PDF page lets fitz generate properly clipped, fully
    # vector SVG including font glyph outlines, not bitmap preview screenshots.
    temp=fitz.open()
    cropped=temp.new_page(width=crop.width,height=crop.height)
    cropped.show_pdf_page(cropped.rect,document,page_number-1,clip=crop,keep_proportion=False)
    svg=cropped.get_svg_image(text_as_path=True)
    # Sanity-check the SVG and the output dimensions.
    root=ET.fromstring(svg)
    if not root.tag.endswith('svg') or len(svg)<10000:
        raise RuntimeError(f"Unexpected SVG for {name}")
    dest=OUT / (name+".svg")
    dest.write_text(svg,encoding="utf-8")
    total_bytes+=dest.stat().st_size
    temp.close()
    print(f"{name}: page {page_number}, vector SVG {dest.stat().st_size} bytes")

assert len(TYPES)==22
print(f"22 crisp, resolution-independent RANDAL vector drawings exported ({total_bytes} bytes).")

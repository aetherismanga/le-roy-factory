#!/usr/bin/env python3
"""Export RANDAL's genuine high-resolution bathroom photo for the configurator hero.

Source: RANDAL catalogue V04 original, page 17 (Aruba). Only the embedded
photograph is used, never a screenshot or low-resolution generic category icon.
"""
from pathlib import Path
import io
import fitz
from PIL import Image, ImageOps

PDF = Path("assets/pdf/RANDAL%20V04.pdf")
DEST = Path("assets/img/randal/hero-meuble-hd.webp")

def main():
    if not PDF.is_file():
        raise RuntimeError(f"Missing original RANDAL catalogue: {PDF}")
    doc = fitz.open(PDF)
    if len(doc) != 43:
        raise RuntimeError(f"Unexpected RANDAL page count: {len(doc)}")

    # Technical PDF page 17 has one high-resolution product photograph and
    # its small compressed auxiliary image; choose the largest real photo.
    page = doc[16]
    images = []
    for entry in page.get_images(full=True):
        source = doc.extract_image(entry[0])
        if source["width"] >= 2000 and source["height"] >= 1800 and len(source["image"]) > 80000:
            images.append(source)
    if not images:
        raise RuntimeError("Expected high-resolution Aruba image not found on page 17")
    source = max(images, key=lambda x: len(x["image"]))
    image = ImageOps.exif_transpose(Image.open(io.BytesIO(source["image"]))).convert("RGB")
    if image.width < 2000 or image.height < 1800:
        raise RuntimeError("Source resolution is insufficient")

    image.thumbnail((2400, 2400), Image.Resampling.LANCZOS)
    DEST.parent.mkdir(parents=True, exist_ok=True)
    image.save(DEST, "WEBP", quality=91, method=6)
    with Image.open(DEST) as check:
        if check.width < 2000 or check.height < 1750:
            raise RuntimeError(f"Exported hero too small: {check.size}")
    print(f"RANDAL high-resolution hero: {image.width} x {image.height}; {DEST.stat().st_size} bytes")

if __name__ == "__main__":
    main()

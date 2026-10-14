#!/usr/bin/env python3
"""Exporte les vrais visuels des 11 collections RANDAL V04 depuis le PDF."""
import hashlib
import io
from pathlib import Path
import fitz
from PIL import Image, ImageOps

PDF = Path("assets/pdf/RANDAL-V04.pdf")
DEST = Path("assets/img/randal/v04")
# Chaque xref a été contrôlé sur la page officielle correspondante.
COLLECTIONS = [
    ("harmony", "HARMONY", 3, 134),
    ("luce", "LUCE", 7, 644),
    ("brent", "BRENT", 10, 860),
    ("aruba-rainure", "ARUBA", 15, 1419),
    ("aruba", "ARUBA", 17, 1590),
    ("aras", "ARAS", 20, 1897),
    ("boreal", "BOREAL", 23, 2189),
    ("brunei", "BRUNEI", 26, 2431),
    ("amat", "AMAT", 28, 2685),
    ("less", "LESS", 31, 3165),
    ("sima", "SIMA", 33, 3242),
]

def main():
    if not PDF.exists():
        raise SystemExit(f"PDF introuvable : {PDF}")
    doc = fitz.open(PDF)
    if doc.page_count != 43:
        raise SystemExit(f"Nombre de pages inattendu : {doc.page_count}")
    DEST.mkdir(parents=True, exist_ok=True)
    signatures = set()
    for slug, title, page, xref in COLLECTIONS:
        real_text = doc[page - 1].get_text("text").upper()
        if title not in real_text:
            raise SystemExit(f"Collection {title} non reconnue en page {page}")
        actual_xrefs = {i["xref"] for i in doc[page - 1].get_image_info(xrefs=True)}
        if xref not in actual_xrefs:
            raise SystemExit(f"Image {xref} non trouvée en page {page} ({title})")
        payload = doc.extract_image(xref)["image"]
        im = ImageOps.exif_transpose(Image.open(io.BytesIO(payload))).convert("RGB")
        im.thumbnail((960, 960), Image.Resampling.LANCZOS)
        file = DEST / f"{slug}.webp"
        im.save(file, "WEBP", quality=80, method=6)
        content = file.read_bytes()
        fingerprint = hashlib.sha256(content).hexdigest()
        if fingerprint in signatures:
            raise SystemExit(f"Image dupliquée détectée : {slug}")
        signatures.add(fingerprint)
        print(f"{slug}: PDF p.{page} xref={xref} => {im.width}x{im.height}, {len(content)} octets")
    print(f"{len(signatures)} photographies distinctes exportées.")

if __name__ == "__main__":
    main()

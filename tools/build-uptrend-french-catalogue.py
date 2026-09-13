#!/usr/bin/env python3
"""Create the French-only PDF used by the interactive UPTREND viewer.

The official bilingual PDF remains untouched and available in Catalogues.
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path

import fitz

ENGLISH = set("the a an and or with without for from of to in on our your this that is are be been bathroom bathrooms washbasin washbasins sink sinks countertop wall mounted product products catalogue catalog collection discover design designed modern elegant durable easy cleaning color colours shape round rectangular square oval glossy matte black white gold grey green blue weight width depth comfort quality years company information about where meets serenity harmony every detail brand philosophy authenticity factories year experience number patterns annual production warranty create spaces".split())
FRENCH = set("le la les un une des de du et ou avec sans pour dans sur notre votre ce cette est sont salle salles bain vasque vasques lavabo lavabos produit produits catalogue collection découvrez design moderne élégant durable facile nettoyage couleur couleurs forme rond ronde rectangulaire carré ovale brillant mate mat noir blanc doré gris vert bleu poids largeur profondeur confort qualité années entreprise informations nous créons espaces harmonie chaque détail marque philosophie authenticité usines expérience nombre modèles production garantie".split())
TRANSLATIONS = {
    "Color":"Couleur", "Shape":"Forme", "Weight":"Couleur", "Dimensions":"Dimensions",
    "White Glossy":"Blanc brillant", "White Matte":"Blanc mat", "Black Glossy":"Noir brillant",
    "Black Matte":"Noir mat", "White/Gold Matte":"Blanc / or mat", "Gold":"Or",
    "Grey Matte":"Gris mat", "Green Matte":"Vert mat", "Blue Matte":"Bleu mat",
    "Round":"Ronde", "Rectangular":"Rectangulaire", "Square":"Carrée", "Oval":"Ovale",
    "Product Catalog":"Catalogue de produits", "TABLE OF CONTENTS":"TABLE DES MATIÈRES",
    "COUNTERTOP SINKS":"VASQUES À POSER", "Sinks":"Vasques", "Washbasins":"Lavabos",
    "Toilet bowls":"Cuvettes WC", "Bidets":"Bidets", "Accesories":"Accessoires",
}

def clean(text: str) -> str:
    return " ".join(text.replace("\u00ad", "").split())

def scores(text: str) -> tuple[int, int]:
    words = re.findall(r"[A-Za-zÀ-ÿ]+", clean(text).lower())
    return sum(word in ENGLISH for word in words), sum(word in FRENCH for word in words)

def replacement(text: str) -> str | None:
    text = clean(text)
    if text in TRANSLATIONS:
        return TRANSLATIONS[text]
    if re.search(r"\s*/\s*", text):
        left, right = re.split(r"\s*/\s*", text, maxsplit=1)
        le, lf = scores(left); re_, rf = scores(right)
        if le > lf and rf >= re_:
            return right
    if " — " in text:
        left, right = text.split(" — ", 1)
        le, lf = scores(left); re_, rf = scores(right)
        if le > lf and rf >= re_:
            return right
        # Product name/dimensions followed by an English/French category.
        if re.search(r"\s*/\s*", right):
            en, fr = re.split(r"\s*/\s*", right, maxsplit=1)
            ee, ef = scores(en); fe, ff = scores(fr)
            if ee > ef and ff >= fe:
                return f"{left} — {fr}"
    english, french = scores(text)
    if english >= 2 and english > french * 1.35:
        return ""
    if english >= 1 and not french and len(text.split()) <= 4 and text.upper() == text:
        return ""
    return None

def fit_text(page: fitz.Page, rect: fitz.Rect, text: str, original_size: float) -> None:
    if not text:
        return
    size = max(6.5, min(original_size, 18))
    while size >= 6.5:
        result = page.insert_textbox(rect, text, fontsize=size, fontname="helv", color=(0.10, 0.10, 0.10), align=fitz.TEXT_ALIGN_LEFT)
        if result >= 0:
            return
        size -= .5

def build(source: Path, output: Path) -> dict:
    doc = fitz.open(source)
    edits = 0
    for page in doc:
        changes = []
        for block in page.get_text("dict").get("blocks", []):
            if "lines" not in block:
                continue
            text = clean(" ".join(span.get("text", "") for line in block["lines"] for span in line.get("spans", [])))
            new = replacement(text)
            if new is None or new == text:
                continue
            rect = fitz.Rect(block["bbox"])
            size = max((span.get("size", 9) for line in block["lines"] for span in line.get("spans", [])), default=9)
            # Removing text without painting a rectangle preserves the catalogue's
            # original photography and page backgrounds.
            page.add_redact_annot(rect + (-1, -1, 1, 1), fill=None)
            changes.append((rect, new, size))
        if changes:
            page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)
            for rect, text, size in changes:
                fit_text(page, rect, text, size)
            edits += len(changes)
    output.parent.mkdir(parents=True, exist_ok=True)
    doc.save(output, garbage=4, deflate=True, clean=True)
    pages = len(doc)
    doc.close()
    return {"pages": pages, "editedBlocks": edits}

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    print(build(args.source, args.output))

if __name__ == "__main__":
    main()

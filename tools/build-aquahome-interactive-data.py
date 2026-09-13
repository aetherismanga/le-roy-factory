#!/usr/bin/env python3
"""Extrait les références AQUAHOME 2026 et génère les données public/serveur.

Le JSON public ne contient que les prix publics TTC. Le prix source HT reste
uniquement dans le paquet Firebase Functions et sert au calcul PRO côté serveur.
"""
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "assets/pdf/aquahome2026.pdf"
PUBLIC_OUT = ROOT / "assets/data/aquahome-products.json"
PRIVATE_OUT = ROOT / "functions/aquahome-products.json"
REPORT_OUT = ROOT / "reports/aquahome-extraction-report.json"

PRICE_RE = re.compile(r"^\d{1,5}(?:[.,]\d{2})?€$")
REF_RE = re.compile(r"^(?=.*\d)[A-Z0-9][A-Z0-9./-]{4,17}$", re.I)
EXCLUDED_REFS = re.compile(r"(?:CM|MM|M2|X\d|G\d|IVA)$", re.I)

FINISHES = {
    "cromo brillo": "Chrome brillant",
    "negro mate": "Noir mat",
    "oro cepillado": "Or brossé",
    "copper": "Cuivre",
    "copper cepillado": "Cuivre brossé",
    "inox cepillado": "Inox brossé",
    "gun grey": "Gris canon",
    "blanco mate": "Blanc mat",
    "blanco brillo": "Blanc brillant",
    "grafito mate": "Graphite mat",
    "acero inoxidable": "Acier inoxydable",
}

NAMES = {
    "LAVABO": "Mitigeur lavabo",
    "LAVABO XL": "Mitigeur lavabo XL",
    "LAVABO ENCASTRAR": "Mitigeur lavabo encastré",
    "LAVABO ALTO": "Mitigeur lavabo haut",
    "BIDÉ": "Mitigeur bidet",
    "BIDE": "Mitigeur bidet",
    "BAÑO": "Mitigeur bain-douche",
    "BANO": "Mitigeur bain-douche",
    "DUCHA": "Mitigeur douche",
    "COCINA": "Mitigeur cuisine",
    "COLUMNA": "Colonne de douche",
}

NOISE = {
    "ACCESORIOS", "ACABADOS", "EXPOSITORES", "AQUAHOME", "ATENCIÓN",
    "ATENCION", "CR", "INOX", "GREY", "NM", "ORO", "BLANCO", "COPPER",
}


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def is_heading(text: str) -> bool:
    text = clean_text(text)
    if not (2 < len(text) < 85) or "€" in text or REF_RE.fullmatch(text):
        return False
    letters = [ch for ch in text if ch.isalpha()]
    return bool(letters) and sum(ch.isupper() for ch in letters) / len(letters) > .82


def french_name(raw: str) -> str:
    key = clean_text(raw).upper()
    if key in NAMES:
        return NAMES[key]
    for source, target in NAMES.items():
        if key.startswith(source + " "):
            return target + key[len(source):].lower()
    translated = key
    replacements = [
        ("GRIFO", "Robinet"), ("FREGADERO", "Évier"), ("TEMPORIZADO", "temporisé"),
        ("ENCIMERA", "sur plage"), ("MURAL", "mural"), ("AGUAS", "eaux"),
        ("AGUA", "eau"), ("ASIENTO DE BAÑO", "Siège de douche"),
        ("ASA DE BAÑO", "Barre d’appui"), ("ASA BAÑO", "Barre d’appui"),
        ("JABONERA", "Porte-savon"), ("CAÑO GIRATORIO", "Bec orientable"),
        ("PEDALES", "pédales"), ("PEDAL", "pédale"), ("DUCHA", "douche"),
        ("BIDÉ SUSTITUTIVO", "Douchette WC"), ("CON SENSOR AUTOMÁTICO", "avec capteur automatique"),
    ]
    for source, target in replacements:
        translated = translated.replace(source, target)
    return clean_text(translated).capitalize()


def finish_from_words(words, ref_x, price_x, y):
    bits = [w[4] for w in words if abs(w[1] - y) < 3.2 and ref_x - 150 <= w[0] < ref_x]
    raw = clean_text(" ".join(bits)).lower()
    for source, translated in sorted(FINISHES.items(), key=lambda item: -len(item[0])):
        if source in raw:
            return translated
    return clean_text(" ".join(bits)).title() or "Finition standard"


def nearest_heading(lines, price_word, half):
    x0, y0, x1, _, *_ = price_word
    candidates = []
    for line in lines:
        text = line["text"]
        if not is_heading(text) or text.upper() in NOISE:
            continue
        lx0, ly0, lx1, ly1 = line["bbox"]
        if ly1 > y0 + 2 or half != (0 if lx0 < 638 else 1):
            continue
        # Les titres produits se trouvent dans la même moitié et en général
        # au-dessus de la colonne références/prix.
        if half == 0 and lx0 > 630:
            continue
        if half == 1 and lx1 < 640:
            continue
        dy = y0 - ly1
        if dy > 270:
            continue
        score = dy + abs((lx0 + lx1) / 2 - (x0 - 115)) * .10
        candidates.append((score, text))
    return min(candidates)[1] if candidates else "Produit AQUAHOME"


def page_lines(page):
    out = []
    data = page.get_text("dict")
    for block in data.get("blocks", []):
        for line in block.get("lines", []):
            spans = line.get("spans", [])
            text = clean_text(" ".join(span.get("text", "") for span in spans))
            if text:
                out.append({"text": text, "bbox": list(line["bbox"]), "size": max(span.get("size", 0) for span in spans)})
    return out


def collection_for_page(lines):
    candidates = []
    for line in lines:
        text = line["text"]
        if not is_heading(text) or text.upper() in NOISE:
            continue
        x0, y0, x1, y1 = line["bbox"]
        if x0 < 638 and line["size"] >= 18:
            candidates.append((line["size"], -y0, text))
    if candidates:
        value = max(candidates)[2].title()
    else:
        headers = [line["text"] for line in lines if line["bbox"][1] < 42 and len(line["text"]) > 3 and not line["text"].isdigit()]
        value = headers[0] if headers else ""
    translations = {
        "Rociadores": "Pommes de douche", "Accesorios": "Accessoires",
        "Grifos temporizados": "Robinets temporisés", "Grifos de cocina": "Robinets de cuisine",
        "Grifos de cocina muelle": "Robinets de cuisine à ressort", "Expositores": "Présentoirs",
    }
    return translations.get(value, value.title()) if value else ""


def main():
    doc = fitz.open(PDF)
    rows = []
    missing_ref = []
    current_collection = "Aquahome 2026"
    for page_index, page in enumerate(doc):
        words = page.get_text("words")
        lines = page_lines(page)
        detected_collection = collection_for_page(lines)
        if detected_collection:
            current_collection = detected_collection
        collection = current_collection
        width, height = page.rect.width, page.rect.height
        for price in words:
            if not PRICE_RE.match(price[4]):
                continue
            px0, py0, px1, py1 = price[:4]
            same_line = [w for w in words if w[2] < px0 and abs(w[1] - py0) < 3.2]
            candidates = []
            for word in same_line:
                token = word[4].strip(" ,;:")
                if REF_RE.match(token) and not EXCLUDED_REFS.search(token):
                    candidates.append(word)
            ref_word = max(candidates, key=lambda w: w[2], default=None)
            source_ht = round(float(price[4][:-1].replace(",", ".")), 2)
            if not ref_word or px0 - ref_word[2] > 95:
                missing_ref.append({
                    "page": page_index + 1, "priceSourceHT": source_ht,
                    "publicTTC": round(source_ht * 1.20 + 1e-8, 2),
                    "bbox": [px0, py0, px1, py1],
                    "priceBox": [round((px0 - 3) / width, 6), round((py0 - 2) / height, 6), round((px1 - px0 + 6) / width, 6), round((py1 - py0 + 4) / height, 6)],
                })
                continue
            ref = ref_word[4].upper()
            finish = finish_from_words(words, ref_word[0], px0, py0)
            half = 0 if px0 < width / 2 else 1
            raw_name = nearest_heading(lines, price, half)
            name = french_name(raw_name)
            if name.lower() == "produit aquahome" and collection != "Aquahome 2026":
                name = collection
            hotspot_x0 = max(width * half / 2, ref_word[0] - 125)
            hotspot_x1 = min(width * (half + 1) / 2, px1 + 7)
            rows.append({
                "reference": ref,
                "name": name,
                "sourceName": raw_name,
                "collection": collection,
                "finish": finish,
                "page": page_index + 1,
                "priceSourceHT": source_ht,
                "publicTTC": round(source_ht * 1.20 + 1e-8, 2),
                "hotspot": [round(hotspot_x0 / width, 6), round((py0 - 4) / height, 6), round((hotspot_x1 - hotspot_x0) / width, 6), round((py1 - py0 + 8) / height, 6)],
                "priceBox": [round((px0 - 3) / width, 6), round((py0 - 2) / height, 6), round((px1 - px0 + 6) / width, 6), round((py1 - py0 + 4) / height, 6)],
            })

    counts = Counter(row["reference"] for row in rows)
    duplicate_refs = sorted(ref for ref, count in counts.items() if count > 1)
    inconsistent = []
    for ref in duplicate_refs:
        variants = {(r["priceSourceHT"], r["name"], r["finish"]) for r in rows if r["reference"] == ref}
        if len(variants) > 1:
            inconsistent.append({"reference": ref, "values": sorted(map(list, variants))})

    public_rows = []
    for row in rows:
        public_row = {k: v for k, v in row.items() if k != "priceSourceHT"}
        if row["reference"] in {item["reference"] for item in inconsistent}:
            public_row["priceAmbiguous"] = True
        public_rows.append(public_row)
    private_products = {}
    ambiguous_refs = {item["reference"] for item in inconsistent}
    for row in rows:
        if row["reference"] in ambiguous_refs:
            continue
        private_products.setdefault(row["reference"], {
            "reference": row["reference"], "name": row["name"], "collection": row["collection"],
            "finish": row["finish"], "page": row["page"], "sourceHT": row["priceSourceHT"],
        })

    pages = [{"page": i + 1, "width": round(page.rect.width, 3), "height": round(page.rect.height, 3)} for i, page in enumerate(doc)]
    PUBLIC_OUT.parent.mkdir(parents=True, exist_ok=True)
    PRIVATE_OUT.parent.mkdir(parents=True, exist_ok=True)
    REPORT_OUT.parent.mkdir(parents=True, exist_ok=True)
    public_unmatched = [{k: v for k, v in item.items() if k not in {"priceSourceHT", "bbox"}} for item in missing_ref]
    PUBLIC_OUT.write_text(json.dumps({"version": "2026-09-13", "pageCount": len(doc), "pages": pages, "products": public_rows, "unmatchedPrices": public_unmatched}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    PRIVATE_OUT.write_text(json.dumps({"version": "2026-09-13", "products": private_products}, ensure_ascii=False, indent=2), encoding="utf-8")
    report = {
        "pdfPages": len(doc), "priceTokens": len(rows) + len(missing_ref), "linkedPriceRows": len(rows),
        "uniqueReferences": len(counts), "duplicateReferences": duplicate_refs,
        "inconsistentDuplicates": inconsistent, "pricesWithoutReference": missing_ref,
    }
    REPORT_OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

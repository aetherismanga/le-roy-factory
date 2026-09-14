#!/usr/bin/env python3
"""Construit les données publiques du catalogue interactif REITANO 2026."""
from __future__ import annotations

import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[1]
CATALOGUE = ROOT / "assets/pdf/REITANO-Robinetterie-2026.pdf"
TARIFF = ROOT / "assets/pdf/Reitano tarif general 2026.pdf"
PUBLIC_OUT = ROOT / "assets/data/reitano-products.json"
REPORT_OUT = ROOT / "reports/reitano-extraction-report.json"

SERIES = [
    ("RX Steel", 13), ("Golf", 42), ("Polo", 52), ("Mastermax", 58),
    ("Round", 68), ("Rhapsody", 78), ("Rhapsody Design", 86),
    ("Dandy", 92), ("Nausika", 96), ("Elle", 104), ("Sky", 110),
    ("Airtech", 114), ("Delux", 120), ("Axia", 126),
    ("Axia Quadro", 132), ("Epoca", 138), ("Antea", 152),
    ("Robinets électroniques", 161), ("Robinets temporisés", 164),
    ("Douche", 165), ("Barres de douche", 173),
    ("Colonnes de douche", 177), ("Cuisine", 185),
]
FINISH_NAMES = {
    "CRO": "Chrome", "CRO/O": "Chrome-or", "CR/O": "Chrome-or",
    "COL": "Couleur", "BRO": "Bronze", "RAM": "Cuivre",
    "NIK": "Nickel", "DOR": "Or", "D/SO": "Or satiné",
    "D/NL": "Nickel noir", "D/NO": "Noir-or", "VL": "Couleur liquide",
    "INOX": "Inox", "PVD": "PVD", "ABS": "ABS", "BRASS": "Laiton",
}
FINISH_CODES = sorted(FINISH_NAMES, key=len, reverse=True)
AMOUNT_RE = re.compile(r"(?<!\d)((?:\d{1,3}(?:\.\d{3})+|\d+)[,.]\d{2})(?!\d)")
REF_RE = re.compile(r"^[A-Z0-9][A-Z0-9. /_+\-]{2,23}$", re.I)
DESCRIPTION_HINTS = (
    "MONOCOMANDO", "MISCELATORE", "RUBINETTO", "BOCCA", "SOFFIONE",
    "COLONNA", "DOCCIA", "PORTA ", "PRESA ACQUA", "COMBINAZIONE",
    "ELECTRONIC", "SHOWER", "MITIGEUR", "ROBINET", "BEC ", "BARRE ",
)


def clean(value):
    return re.sub(r"\s+", " ", value or "").strip()


def key(value):
    value = unicodedata.normalize("NFD", clean(value).upper())
    value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn")
    return re.sub(r"[^A-Z0-9]", "", value)


def amount(value):
    match = AMOUNT_RE.search(value or "")
    if not match:
        return None
    raw = match.group(1)
    if "." in raw and "," in raw:
        raw = raw.replace(".", "").replace(",", ".")
    elif "," in raw:
        raw = raw.replace(",", ".")
    try:
        return round(float(raw), 2)
    except ValueError:
        return None


def lines(page):
    result = []
    for block in page.get_text("dict", sort=True).get("blocks", []):
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            spans = line.get("spans", [])
            text = clean(" ".join(span.get("text", "") for span in spans))
            if not text:
                continue
            biggest = max(spans, key=lambda x: x.get("size", 0)) if spans else {}
            result.append({
                "text": text,
                "bbox": [float(v) for v in line["bbox"]],
                "size": float(biggest.get("size", 0)),
                "font": clean(biggest.get("font", "")),
            })
    return result


def valid_ref(text, allow_numeric=True):
    value = clean(text).upper()
    if not REF_RE.fullmatch(value) or not any(ch.isdigit() for ch in value):
        return False
    compact = key(value)
    if not compact or len(compact) < 3:
        return False
    if compact.startswith("ISO") or re.fullmatch(r"\d{1,3}", compact):
        return False
    if re.fullmatch(r"\d{2,4}(?:X|MM|CM)\d{0,4}", compact):
        return False
    if not allow_numeric and compact.isdigit():
        return False
    return True


def catalogue_rows():
    document = fitz.open(CATALOGUE)
    found = defaultdict(list)
    page_meta = []
    series_index = 0
    for page_number, page in enumerate(document, 1):
        while series_index + 1 < len(SERIES) and page_number >= SERIES[series_index + 1][1]:
            series_index += 1
        collection = SERIES[series_index][0] if page_number >= SERIES[0][1] else "REITANO 2026"
        rows = lines(page)
        page_meta.append({"page": page_number, "width": round(page.rect.width, 3), "height": round(page.rect.height, 3)})
        for index, row in enumerate(rows):
            x0, y0, x1, y1 = row["bbox"]
            text = clean(row["text"]).upper()
            bold = any(weight in row["font"].upper() for weight in ("BOLD", "DEMI", "BLACK"))
            if y0 > page.rect.height - 32 or not bold or not (7 <= row["size"] <= 15) or not valid_ref(text):
                continue
            next_rows = [candidate for candidate in rows[index + 1:index + 5] if candidate["bbox"][1] <= y1 + 42]
            descriptions = [candidate["text"] for candidate in next_rows if any(hint in candidate["text"].upper() for hint in DESCRIPTION_HINTS)]
            if not descriptions and page_number < 13:
                continue
            normalized = key(text)
            hotspot = [
                round(max(0, x0 - 8) / page.rect.width, 6),
                round(max(0, y0 - 7) / page.rect.height, 6),
                round(min(page.rect.width - max(0, x0 - 8), max(80, x1 - x0 + 150)) / page.rect.width, 6),
                round(min(page.rect.height - max(0, y0 - 7), max(28, y1 - y0 + 34)) / page.rect.height, 6),
            ]
            found[normalized].append({
                "reference": text, "page": page_number, "collection": collection,
                "catalogueDescription": descriptions[0] if descriptions else "",
                "hotspot": hotspot, "bbox": [round(v, 2) for v in row["bbox"]],
            })
    return document, page_meta, found


def finish_code(text):
    value = clean(text).upper().replace("CRO/O", "CR/O")
    for code in FINISH_CODES:
        canonical = code.replace("CRO/O", "CR/O")
        if value == canonical:
            return canonical
    return None


def french_description(rows, marker):
    y = marker["bbox"][1]
    candidates = [r["text"] for r in rows if r["bbox"][0] > 75 and y - 7 <= r["bbox"][1] <= y + 42 and any(h in r["text"].upper() for h in DESCRIPTION_HINTS)]
    if not candidates:
        return "Produit REITANO"
    value = " ".join(candidates)
    parts = [clean(p) for p in value.split("•") if clean(p)]
    if len(parts) >= 3:
        return parts[-1].capitalize()
    return parts[0].capitalize() if parts else value.capitalize()


def price_variants(block):
    direct = {}
    for row in block:
        code = next((c for c in FINISH_CODES if re.search(rf"(?<![A-Z0-9]){re.escape(c)}(?![A-Z0-9])", row["text"].upper())), None)
        value = amount(row["text"])
        if code and value is not None:
            direct[code.replace("CRO/O", "CR/O")] = value
    markers = []
    prices = []
    for row in block:
        code = finish_code(row["text"])
        cx = (row["bbox"][0] + row["bbox"][2]) / 2
        cy = (row["bbox"][1] + row["bbox"][3]) / 2
        if code:
            markers.append((code, cx, cy))
        value = amount(row["text"])
        if value is not None and row["bbox"][0] >= 330:
            prices.append((value, cx, cy))
    result = dict(direct)
    left_prices = [p for p in prices if p[1] < 445]
    right_prices = [p for p in prices if p[1] >= 445]
    groups = [
        ({"BRO", "RAM", "NIK"}, "RAM"),
        ({"DOR", "D/SO", "D/NL", "D/NO"}, None),
    ]
    for code, cx, cy in markers:
        if code in result:
            continue
        lane = left_prices if cx < 430 else right_prices
        if not lane:
            continue
        target_y = cy
        for members, anchor in groups:
            present = [m for m in markers if m[0] in members and (m[1] < 430) == (cx < 430)]
            if code in members and present:
                if anchor:
                    target_y = min(present, key=lambda m: 0 if m[0] == anchor else 1)[2]
                else:
                    target_y = sum(m[2] for m in present) / len(present)
                break
        candidate = min(lane, key=lambda p: abs(p[2] - target_y))
        if abs(candidate[2] - target_y) <= 34:
            result[code] = candidate[0]
    return result


def tariff_rows():
    document = fitz.open(TARIFF)
    products = []
    for page_number, page in enumerate(document, 1):
        rows = lines(page)
        headings = [r["text"] for r in rows if r["size"] >= 15 and not any(ch.isdigit() for ch in r["text"])]
        collection = clean(headings[0]).title() if headings else ""
        markers = []
        for row in rows:
            x0, y0, _, _ = row["bbox"]
            if x0 >= 125 or y0 > page.rect.height - 35 or row["size"] < 11.5:
                continue
            if valid_ref(row["text"]):
                markers.append(row)
        markers.sort(key=lambda r: r["bbox"][1])
        for index, marker in enumerate(markers):
            previous_y = markers[index - 1]["bbox"][1] if index else 0
            end_y = marker["bbox"][1] - 12
            start_y = max(previous_y + 22, end_y - 165)
            block = [r for r in rows if start_y <= r["bbox"][1] <= end_y]
            variants = price_variants(block)
            if not variants:
                continue
            products.append({
                "reference": clean(marker["text"]).upper(), "normalized": key(marker["text"]),
                "name": french_description(rows, marker), "collection": collection,
                "tariffPage": page_number, "variants": variants,
            })
    return document, products


def main():
    cat_doc, page_meta, catalogue = catalogue_rows()
    tariff_doc, tariffs = tariff_rows()
    products, private, conflicts, unmatched = [], {}, [], []
    seen = set()
    for item in tariffs:
        matches = catalogue.get(item["normalized"], [])
        catalog = matches[0] if matches else None
        if not catalog:
            unmatched.append({"reference": item["reference"], "tariffPage": item["tariffPage"]})
        for code, source_ht in sorted(item["variants"].items()):
            canonical = code.replace("CRO/O", "CR/O")
            product_key = f'{item["normalized"]}::{canonical}'
            value = {
                "key": product_key, "reference": item["reference"],
                "orderReference": f'{item["reference"]} {canonical}',
                "name": item["name"], "collection": catalog["collection"] if catalog else item["collection"],
                "finishCode": canonical, "finish": FINISH_NAMES.get(canonical, canonical),
                "page": catalog["page"] if catalog else None,
                "hotspot": catalog["hotspot"] if catalog else None,
                "publicTTC": round(source_ht * 1.2 + 1e-8, 2),
            }
            if product_key in seen:
                if private[product_key]["sourceHT"] != source_ht:
                    conflicts.append({"key": product_key, "first": private[product_key]["sourceHT"], "second": source_ht})
                continue
            seen.add(product_key)
            products.append(value)
            private[product_key] = {
                "key": product_key, "reference": item["reference"], "orderReference": value["orderReference"],
                "name": item["name"], "collection": value["collection"], "finishCode": canonical,
                "finish": value["finish"], "sourceHT": source_ht,
            }
    PUBLIC_OUT.parent.mkdir(parents=True, exist_ok=True)
    REPORT_OUT.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "version": "2026-09-14", "pageCount": len(cat_doc), "pages": page_meta,
        "series": [{"name": name, "page": page} for name, page in SERIES],
        "products": products,
    }
    PUBLIC_OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    report = {
        "cataloguePages": len(cat_doc), "tariffPages": len(tariff_doc),
        "catalogueReferenceKeys": len(catalogue), "tariffProductRows": len(tariffs),
        "variants": len(products), "variantsWithCatalogueHotspot": sum(bool(p["page"]) for p in products),
        "uniqueBaseReferences": len({p["reference"] for p in products}),
        "finishCounts": Counter(p["finishCode"] for p in products),
        "conflicts": conflicts, "unmatchedTariffProducts": unmatched,
        "privateProducts": private,
    }
    REPORT_OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "privateProducts"}, ensure_ascii=False, indent=2, default=dict))


if __name__ == "__main__":
    main()

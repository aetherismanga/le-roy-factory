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
PRIVATE_OUT = ROOT / "functions/reitano-products.json"
REPORT_OUT = ROOT / "reports/reitano-extraction-report.json"

SERIES = [
    ("RX Steel", 13), ("Golf", 42), ("Polo", 52), ("Mastermax", 58),
    ("Round", 68), ("Rhapsody", 78), ("Rhapsody Design", 86),
    ("Dandy", 92), ("Nausika", 96), ("Elle", 104), ("Sky", 110),
    ("Airtech", 114), ("Airtech Deluxe", 120), ("Axia", 126),
    ("Axia Quadro", 132), ("Epoca", 138), ("Epoca Deluxe", 146), ("Antea", 152),
    ("Robinets électroniques", 161), ("Robinets temporisés", 164),
    ("Douche", 165), ("Douchette WC", 171), ("Barres de douche", 173),
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


def span_visible(span):
    """Ignore les textes blancs/transparents des gabarits tarifaires."""
    alpha = int(span.get("alpha", 255))
    color = int(span.get("color", 0))
    red, green, blue = (color >> 16) & 255, (color >> 8) & 255, color & 255
    luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue
    return alpha > 8 and luminance < 245


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
                "visible": any(span_visible(span) for span in spans),
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
    # Les grilles contiennent aussi des valeurs techniques masquées (souvent
    # 570/630). Les prix réellement imprimés des groupes sont centrés ; une
    # ligne de tirets signifie que le groupe n'est pas commercialisé.
    direct = {}
    simple_codes = {"INOX", "PVD", "ABS", "BRASS"}
    for row in block:
        if not row.get("visible", True):
            continue
        upper = row["text"].upper()
        code = next((c for c in FINISH_CODES if re.search(rf"(?<![A-Z0-9]){re.escape(c)}(?![A-Z0-9])", upper)), None)
        value = amount(row["text"])
        if code in simple_codes and value is not None:
            direct[code] = value

    markers, prices = [], []
    for row in block:
        if not row.get("visible", True):
            continue
        code = finish_code(row["text"])
        cx = (row["bbox"][0] + row["bbox"][2]) / 2
        cy = (row["bbox"][1] + row["bbox"][3]) / 2
        if code:
            markers.append((code, cx, cy))
        value = amount(row["text"])
        if value is not None and row["bbox"][0] >= 330:
            prices.append((value, cx, cy, row))

    # Certains PDF superposent un ancien montant ou un fragment masqué au
    # montant imprimé (ex. 230,00 + 2,00). On regroupe d'abord ces objets
    # géométriquement identiques et on conserve le montant complet.
    deduplicated = []
    for candidate in sorted(prices, key=lambda p: (p[2], p[1])):
        row = candidate[3]
        x0, y0, x1, y1 = row["bbox"]
        overlap_index = next((
            index for index, existing in enumerate(deduplicated)
            if abs(existing[2] - candidate[2]) <= 2.2
            and min(existing[3]["bbox"][2], x1) - max(existing[3]["bbox"][0], x0) > 8
        ), None)
        if overlap_index is None:
            deduplicated.append(candidate)
            continue
        existing = deduplicated[overlap_index]
        def strength(price):
            match = AMOUNT_RE.search(price[3]["text"])
            raw = match.group(1) if match else ""
            integer = re.split(r"[,.]", raw)[0].replace(".", "")
            width = price[3]["bbox"][2] - price[3]["bbox"][0]
            return (len(integer.lstrip("0")), width, price[0])
        if strength(candidate) > strength(existing):
            deduplicated[overlap_index] = candidate
    prices = deduplicated
    result = dict(direct)
    grouped = ({"BRO", "RAM", "NIK"}, {"DOR", "D/SO", "D/NL", "D/NO"})
    grouped_codes = set().union(*grouped)

    for members in grouped:
        present = [m for m in markers if m[0] in members]
        if not present:
            continue
        left = sum(m[1] for m in present) / len(present) < 430
        lane_prices = [p for p in prices if (p[1] < 445) == left]
        low, high = min(m[2] for m in present) - 7, max(m[2] for m in present) + 7
        lane_x0, lane_x1 = (365, 430) if left else (465, 535)
        unavailable = any(
            lane_x0 <= (r["bbox"][0] + r["bbox"][2]) / 2 <= lane_x1
            and low <= (r["bbox"][1] + r["bbox"][3]) / 2 <= high
            and r.get("visible", True)
            and "---" in r["text"]
            for r in block
        )
        if unavailable or not lane_prices:
            continue
        target_y = sum(m[2] for m in present) / len(present)
        selected = min(lane_prices, key=lambda p: abs(p[2] - target_y))
        if abs(selected[2] - target_y) <= 28:
            for code, _, _ in present:
                result[code] = selected[0]

    for code, cx, cy in markers:
        if code in result or code in grouped_codes:
            continue
        lane = [p for p in prices if (p[1] < 445) == (cx < 430)]
        if not lane:
            continue
        candidate = min(lane, key=lambda p: abs(p[2] - cy))
        if abs(candidate[2] - cy) <= 8:
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


def near_reference(left, right):
    """Signale les références proches sans jamais les associer."""
    if left == right or abs(len(left) - len(right)) > 1:
        return False
    if len(left) == len(right):
        return sum(a != b for a, b in zip(left, right)) == 1
    short, long = (left, right) if len(left) < len(right) else (right, left)
    i = j = differences = 0
    while i < len(short) and j < len(long):
        if short[i] == long[j]:
            i += 1
        else:
            differences += 1
            if differences > 1:
                return False
        j += 1
    return True


def main():
    cat_doc, page_meta, catalogue = catalogue_rows()
    tariff_doc, tariffs = tariff_rows()
    candidates = defaultdict(list)
    unmatched_tariff = []
    tariff_norms = set()

    for item in tariffs:
        tariff_norms.add(item["normalized"])
        matches = catalogue.get(item["normalized"], [])
        catalog = matches[0] if matches else None
        if not catalog:
            unmatched_tariff.append({"reference": item["reference"], "tariffPage": item["tariffPage"]})
        for code, source_ht in sorted(item["variants"].items()):
            canonical = code.replace("CRO/O", "CR/O")
            product_key = f'{item["normalized"]}::{canonical}'
            candidates[product_key].append({
                "item": item, "catalog": catalog, "sourceHT": source_ht,
                "finishCode": canonical,
            })

    products, private = [], {}
    conflicts, duplicates, anomalies = [], [], []
    source_by_key = {}

    for product_key, entries in sorted(candidates.items()):
        first = entries[0]
        item, catalog, canonical = first["item"], first["catalog"], first["finishCode"]
        unique_prices = sorted({entry["sourceHT"] for entry in entries})
        source_ht = unique_prices[0] if len(unique_prices) == 1 else None
        if len(entries) > 1:
            duplicates.append({
                "key": product_key, "occurrences": len(entries),
                "prices": unique_prices,
                "status": "identical" if len(unique_prices) == 1 else "conflict",
            })
        if len(unique_prices) > 1:
            conflicts.append({"key": product_key, "prices": unique_prices})
            anomalies.append({"key": product_key, "reason": "tarifs contradictoires", "prices": unique_prices})
        if source_ht is not None and source_ht <= 2:
            anomalies.append({"key": product_key, "reason": "prix anormalement faible neutralisé", "sourceHT": source_ht})
            source_ht = None

        value = {
            "key": product_key, "reference": item["reference"],
            "orderReference": f'{item["reference"]} {canonical}',
            "name": item["name"],
            "collection": catalog["collection"] if catalog else item["collection"],
            "finishCode": canonical, "finish": FINISH_NAMES.get(canonical, canonical),
            "page": catalog["page"] if catalog else None,
            "hotspot": catalog["hotspot"] if catalog else None,
            "tariffPage": item["tariffPage"],
            "publicTTC": round(source_ht * 1.2 + 1e-8, 2) if source_ht is not None else None,
        }
        products.append(value)
        private[product_key] = {
            "key": product_key, "reference": item["reference"],
            "orderReference": value["orderReference"], "name": item["name"],
            "collection": value["collection"], "finishCode": canonical,
            "finish": value["finish"], "tariffPage": item["tariffPage"],
            "sourceHT": source_ht,
        }
        source_by_key[product_key] = source_ht

    unmatched_catalogue = []
    for normalized, matches in sorted(catalogue.items()):
        if normalized in tariff_norms:
            continue
        catalog = matches[0]
        placeholder_key = f"{normalized}::ASK"
        unmatched_catalogue.append({
            "reference": catalog["reference"], "cataloguePage": catalog["page"],
            "collection": catalog["collection"],
        })
        products.append({
            "key": placeholder_key, "reference": catalog["reference"],
            "orderReference": catalog["reference"],
            "name": catalog["catalogueDescription"] or "Produit REITANO",
            "collection": catalog["collection"], "finishCode": "ASK",
            "finish": "Finition à confirmer", "page": catalog["page"],
            "hotspot": catalog["hotspot"], "tariffPage": None, "publicTTC": None,
        })
        private[placeholder_key] = {
            "key": placeholder_key, "reference": catalog["reference"],
            "orderReference": catalog["reference"],
            "name": catalog["catalogueDescription"] or "Produit REITANO",
            "collection": catalog["collection"], "finishCode": "ASK",
            "finish": "Finition à confirmer", "tariffPage": None, "sourceHT": None,
        }
        source_by_key[placeholder_key] = None

    tariff_unmatched_keys = sorted({key(item["reference"]) for item in unmatched_tariff})
    catalogue_unmatched_keys = sorted({key(item["reference"]) for item in unmatched_catalogue})
    near_warnings = []
    for catalog_ref in catalogue_unmatched_keys:
        for tariff_ref in tariff_unmatched_keys:
            if near_reference(catalog_ref, tariff_ref):
                near_warnings.append({
                    "catalogueReference": catalog_ref,
                    "tariffReference": tariff_ref,
                    "action": "aucune association automatique",
                })

    base_prices = defaultdict(list)
    for product in products:
        source_ht = source_by_key[product["key"]]
        if source_ht is not None:
            base_prices[key(product["reference"])].append(source_ht)
    badge_summary = {"from": 0, "exact": 0, "onRequest": 0, "validationErrors": []}
    badge_by_base = {}
    for base_ref in {key(product["reference"]) for product in products}:
        unique = sorted(set(base_prices.get(base_ref, [])))
        if not unique:
            mode, minimum = "onRequest", None
        elif len(unique) == 1:
            mode, minimum = "exact", unique[0]
        else:
            mode, minimum = "from", unique[0]
        badge_summary[mode] += 1
        badge_by_base[base_ref] = {"mode": mode, "minimumHT": minimum}

    sample = []
    used_refs = set()
    for collection, _ in SERIES:
        options = [
            product for product in products
            if product["collection"] == collection
            and source_by_key[product["key"]] is not None
            and key(product["reference"]) not in used_refs
        ]
        options.sort(key=lambda product: (
            0 if product["finishCode"] == "BRO" else 1 if product["finishCode"] == "CRO" else 2,
            product["reference"], product["finishCode"],
        ))
        if not options:
            continue
        product = options[0]
        source_ht = source_by_key[product["key"]]
        badge = badge_by_base[key(product["reference"])]
        sample.append({
            "reference": product["reference"], "name": product["name"],
            "collection": product["collection"], "finish": product["finish"],
            "finishCode": product["finishCode"], "tariffPage": product["tariffPage"],
            "sourceHT": source_ht,
            "publicTTC": round(source_ht * 1.2 + 1e-8, 2),
            "proHT": round(source_ht * 0.5 + 1e-8, 2),
            "badgeMode": badge["mode"],
            "badgeMinimumPublicTTC": (
                round(badge["minimumHT"] * 1.2 + 1e-8, 2)
                if badge["minimumHT"] is not None else None
            ),
            "badgeMinimumProHT": (
                round(badge["minimumHT"] * 0.5 + 1e-8, 2)
                if badge["minimumHT"] is not None else None
            ),
        })
        used_refs.add(key(product["reference"]))
        if len(sample) == 20:
            break

    low_prices = [
        {
            "key": product["key"], "reference": product["reference"],
            "finishCode": product["finishCode"], "sourceHT": source_by_key[product["key"]],
            "tariffPage": product["tariffPage"],
        }
        for product in products
        if source_by_key[product["key"]] is not None and source_by_key[product["key"]] <= 20
    ]
    finish_counts = Counter(product["finishCode"] for product in products if product["finishCode"] != "ASK")

    PUBLIC_OUT.parent.mkdir(parents=True, exist_ok=True)
    REPORT_OUT.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "version": "2026-09-15", "pageCount": len(cat_doc), "pages": page_meta,
        "series": [{"name": name, "page": page} for name, page in SERIES],
        "products": products,
    }
    PUBLIC_OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    PRIVATE_OUT.write_text(
        json.dumps({"version": "2026-09-15", "products": private}, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    report = {
        "cataloguePages": len(cat_doc), "tariffPages": len(tariff_doc),
        "catalogueReferenceKeys": len(catalogue), "tariffProductRows": len(tariffs),
        "variants": len(products),
        "pricedVariants": sum(source is not None for source in source_by_key.values()),
        "variantsOnRequest": sum(source is None for source in source_by_key.values()),
        "variantsWithCatalogueHotspot": sum(bool(product["page"]) for product in products),
        "uniqueBaseReferences": len({product["reference"] for product in products}),
        "finishCounts": finish_counts,
        "conflicts": conflicts, "duplicates": duplicates,
        "anomalies": anomalies, "lowPriceVariants": low_prices,
        "unmatchedCatalogueProducts": unmatched_catalogue,
        "unmatchedTariffProducts": unmatched_tariff,
        "nearReferenceWarnings": near_warnings,
        "badgeAudit": badge_summary,
        "controlSample20": sample,
        "privateProducts": private,
    }
    REPORT_OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({key_: value for key_, value in report.items() if key_ != "privateProducts"}, ensure_ascii=False, indent=2, default=dict))


if __name__ == "__main__":
    main()

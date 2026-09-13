#!/usr/bin/env python3
"""Build the public, price-free UPTREND catalogue index and click zones.

Prices are deliberately never exported. They stay in the secured tariff PDF and
are read in the browser only after the existing PRO access check succeeds.
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

import fitz


REF_RE = re.compile(r"\b(?:STR|TR|UP)\s*-?\s*[A-Z]?[0-9][A-Z0-9+./-]*\b", re.I)


def clean(value: str) -> str:
    return " ".join(str(value or "").replace("\u00a0", " ").split())


def norm_ref(value: str) -> str:
    value = unicodedata.normalize("NFKD", clean(value)).upper()
    return re.sub(r"[^A-Z0-9]", "", value)


def canonical_ref(value: str) -> str:
    value = clean(value).upper().replace(" ", "")
    value = re.sub(r"-+", "-", value)
    return value.strip("-")


def words_in(words, x0, x1, y0, y1):
    return [w for w in words if x0 <= w[0] < x1 and y0 <= (w[1] + w[3]) / 2 < y1]


def join_words(words):
    return clean(" ".join(w[4] for w in sorted(words, key=lambda w: (round(w[1], 1), w[0]))))


def extract_tariff_rows(path: Path):
    doc = fitz.open(path)
    rows = []
    for page_index in range(2, min(14, len(doc))):
        page = doc[page_index]
        words = page.get_text("words")
        anchors = sorted(
            [w for w in words if w[4] in {"P", "NP"} and w[0] < 45 and 65 < w[1] < 795],
            key=lambda w: w[1],
        )
        centers = [(w[1] + w[3]) / 2 for w in anchors]
        for idx, anchor in enumerate(anchors):
            center = centers[idx]
            top = (centers[idx - 1] + center) / 2 if idx else max(64, center - 18)
            bottom = (center + centers[idx + 1]) / 2 if idx + 1 < len(centers) else min(796, center + 18)
            row_words = words_in(words, 0, 570, top, bottom)
            page_words = words_in(row_words, 45, 85, center - 5, center + 5)
            page_catalogue = None
            if anchor[4] == "P":
                nums = [w[4] for w in page_words if w[4].isdigit()]
                page_catalogue = int(nums[0]) if nums else None

            code_words = words_in(row_words, 85, 164.5, center - 5, center + 5)
            ref = canonical_ref(join_words(code_words))
            if not ref or not re.match(r"^(?:STR|TR|UP)", ref):
                continue
            name = join_words(words_in(row_words, 164.5, 235, top, bottom))
            designation = join_words(words_in(row_words, 235, 508, top, bottom))
            price_words = words_in(row_words, 508, 546, center - 5, center + 5)
            price_text = join_words(price_words)
            if not re.fullmatch(r"\d+[.,]\d{2}", price_text):
                continue
            rows.append(
                {
                    "reference": ref,
                    "referenceKey": norm_ref(ref),
                    "nom": name,
                    "designation": designation,
                    "pageCatalogue": page_catalogue,
                    "pageTarif": page_index + 1,
                }
            )
    doc.close()

    # Some tariff pages repeat a handful of products. Keep the first exact row.
    unique = {}
    duplicates = []
    for row in rows:
        key = row["referenceKey"]
        if key in unique:
            if row != unique[key]:
                duplicates.append({"reference": row["reference"], "kept": unique[key], "ignored": row})
            continue
        unique[key] = row
    return unique, duplicates


def catalogue_reference_occurrences(path: Path):
    doc = fitz.open(path)
    by_ref = defaultdict(list)
    for page_index, page in enumerate(doc):
        data = page.get_text("dict")
        for block in data.get("blocks", []):
            if "lines" not in block:
                continue
            for line in block["lines"]:
                for span in line.get("spans", []):
                    text = clean(span.get("text", ""))
                    for match in REF_RE.finditer(text):
                        raw = canonical_ref(match.group(0))
                        key = norm_ref(raw)
                        if len(key) < 5:
                            continue
                        bbox = [round(float(v), 2) for v in span["bbox"]]
                        by_ref[key].append(
                            {
                                "reference": raw,
                                "page": page_index + 1,
                                "bbox": bbox,
                                "fontSize": round(float(span.get("size", 0)), 2),
                                "text": text,
                            }
                        )
    page_sizes = {
        str(i + 1): [round(float(p.rect.width), 2), round(float(p.rect.height), 2)]
        for i, p in enumerate(doc)
    }
    count = len(doc)
    doc.close()
    return by_ref, page_sizes, count


def choose_hotspot(occurrences, expected_page=None):
    candidates = list(occurrences)
    if expected_page:
        exact = [o for o in candidates if o["page"] == expected_page]
        if exact:
            candidates = exact
    # Product-title references use a larger font than references repeated in prose.
    chosen = max(candidates, key=lambda o: (o["fontSize"], -len(o["text"]), -o["bbox"][1]))
    x0, y0, x1, y1 = chosen["bbox"]
    chosen = dict(chosen)
    chosen["bbox"] = [max(0, x0 - 8), max(0, y0 - 7), x1 + 8, y1 + 8]
    return chosen


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalogue", required=True, type=Path)
    parser.add_argument("--tariff", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    tariff, duplicates = extract_tariff_rows(args.tariff)
    occurrences, page_sizes, catalogue_pages = catalogue_reference_occurrences(args.catalogue)

    # Only references that appear as standalone product-title text are included.
    # Small-font prose occurrences are accepted only when also known by the tariff.
    catalogue_keys = {
        key for key, occs in occurrences.items()
        if max(o["fontSize"] for o in occs) >= 8 or key in tariff
    }
    products = {}
    for key in sorted(set(tariff) | catalogue_keys):
        row = dict(tariff.get(key) or {})
        occs = occurrences.get(key, [])
        expected = row.get("pageCatalogue")
        hotspot = choose_hotspot(occs, expected) if occs else None
        ref = row.get("reference") or (hotspot or {}).get("reference") or key
        products[key] = {
            "reference": ref,
            "nom": row.get("nom", ""),
            "designation": row.get("designation", ""),
            "pageCatalogue": (hotspot or {}).get("page") or expected,
            "pageTarif": row.get("pageTarif"),
            "dansCatalogue": bool(hotspot),
            "dansTarif": key in tariff,
            "hotspot": hotspot,
        }

    catalogue_only = sorted(k for k in products if products[k]["dansCatalogue"] and not products[k]["dansTarif"])
    tariff_only = sorted(k for k in products if products[k]["dansTarif"] and not products[k]["dansCatalogue"])
    mismatch_pages = sorted(
        {
            products[k]["reference"]
            for k in products
            if products[k]["dansCatalogue"]
            and products[k]["dansTarif"]
            and tariff[k].get("pageCatalogue")
            and products[k]["pageCatalogue"] != tariff[k]["pageCatalogue"]
        }
    )
    payload = {
        "version": "2026-09-13",
        "cataloguePages": catalogue_pages,
        "tarifPages": 17,
        "pageSizes": page_sizes,
        "products": products,
        "stats": {
            "catalogueReferences": sum(1 for p in products.values() if p["dansCatalogue"]),
            "tariffReferences": len(tariff),
            "matchedReferences": sum(1 for p in products.values() if p["dansCatalogue"] and p["dansTarif"]),
            "catalogueOnly": len(catalogue_only),
            "tariffOnly": len(tariff_only),
        },
        "anomalies": {
            "catalogueOnly": [products[k]["reference"] for k in catalogue_only],
            "tariffOnly": [products[k]["reference"] for k in tariff_only],
            "pageMismatch": mismatch_pages,
            "duplicateTariffRows": duplicates,
        },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload["stats"], ensure_ascii=False, indent=2))
    print("Catalogue only:", ", ".join(payload["anomalies"]["catalogueOnly"]) or "none")
    print("Tariff only:", len(payload["anomalies"]["tariffOnly"]))
    print("Page mismatch:", ", ".join(mismatch_pages) or "none")


if __name__ == "__main__":
    main()

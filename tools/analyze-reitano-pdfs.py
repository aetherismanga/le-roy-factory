#!/usr/bin/env python3
"""Audit intégral des PDF REITANO 2026 sans modifier le site ni le CRM."""
from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[1]
DOCUMENTS = {
    "catalogue": ROOT / "assets/pdf/REITANO-Robinetterie-2026.pdf",
    "tarif": ROOT / "assets/pdf/Reitano tarif general 2026.pdf",
}
OUTPUT = ROOT / "reports/reitano-pdf-analysis.json"

REF_RE = re.compile(r"(?i)^(?=.{3,32}$)(?=.*[a-z])(?=.*\d)[a-z0-9][a-z0-9./_+\-]*$")
PRICE_RE = re.compile(r"^(?:€\s*)?\d{1,6}(?:[.,]\d{1,3})?(?:\s*€)?$")


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def page_lines(page):
    rows = []
    data = page.get_text("dict", sort=True)
    for block in data.get("blocks", []):
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            spans = line.get("spans", [])
            text = clean(" ".join(span.get("text", "") for span in spans))
            if not text:
                continue
            bbox = [round(v, 2) for v in line.get("bbox", (0, 0, 0, 0))]
            rows.append({
                "text": text,
                "bbox": bbox,
                "size": round(max((span.get("size", 0) for span in spans), default=0), 2),
                "font": clean(max(spans, key=lambda item: item.get("size", 0)).get("font", "")) if spans else "",
            })
    return rows


def tokens(page):
    result = []
    for word in page.get_text("words", sort=True):
        text = clean(word[4])
        if not text:
            continue
        result.append({
            "text": text,
            "bbox": [round(v, 2) for v in word[:4]],
            "block": int(word[5]),
            "line": int(word[6]),
            "word": int(word[7]),
        })
    return result


def analyze(kind, path):
    document = fitz.open(path)
    pages = []
    all_refs = []
    price_count = 0
    for index, page in enumerate(document):
        page_tokens = tokens(page)
        refs = []
        prices = []
        for token in page_tokens:
            raw = token["text"].strip(" ,;:()[]")
            if REF_RE.fullmatch(raw):
                refs.append({**token, "normalized": raw.upper()})
                all_refs.append(raw.upper())
            if PRICE_RE.fullmatch(raw.replace(" ", "")):
                digits = re.sub(r"[^0-9,.]", "", raw)
                if digits and ("," in digits or "." in digits or "€" in raw):
                    prices.append(token)
        price_count += len(prices)
        lines = page_lines(page)
        pages.append({
            "page": index + 1,
            "width": round(page.rect.width, 2),
            "height": round(page.rect.height, 2),
            "text": page.get_text("text", sort=True),
            "lines": lines,
            "references": refs,
            "prices": prices,
            "imageCount": len(page.get_images(full=True)),
        })
    counts = Counter(all_refs)
    return {
        "kind": kind,
        "file": path.name,
        "bytes": path.stat().st_size,
        "metadata": document.metadata,
        "pageCount": len(document),
        "referenceOccurrences": len(all_refs),
        "uniqueReferences": len(counts),
        "priceTokens": price_count,
        "topRepeatedReferences": counts.most_common(100),
        "pages": pages,
    }


def main():
    result = {
        "version": "2026-09-14",
        "documents": {kind: analyze(kind, path) for kind, path in DOCUMENTS.items()},
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    summary = {
        name: {
            key: doc[key]
            for key in ("file", "bytes", "pageCount", "referenceOccurrences", "uniqueReferences", "priceTokens")
        }
        for name, doc in result["documents"].items()
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

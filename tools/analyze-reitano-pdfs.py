#!/usr/bin/env python3
"""Audit intégral, découpé et contrôlable des deux PDF REITANO 2026."""
from __future__ import annotations

import json
import re
import shutil
from collections import Counter
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[1]
DOCUMENTS = {
    "catalogue": ROOT / "assets/pdf/REITANO-Robinetterie-2026.pdf",
    "tarif": ROOT / "assets/pdf/Reitano tarif general 2026.pdf",
}
OUTPUT_DIR = ROOT / "reports/reitano-analysis"
LEGACY_OUTPUT = ROOT / "reports/reitano-pdf-analysis.json"
REF_RE = re.compile(r"(?i)^(?=.{3,32}$)(?=.*[a-z])(?=.*\d)[a-z0-9][a-z0-9./_+\-]*$")
PRICE_RE = re.compile(r"^(?:€\s*)?\d{1,6}(?:[.,]\d{1,3})?(?:\s*€)?$")


def clean(value):
    return re.sub(r"\s+", " ", value or "").strip()


def line_rows(page):
    rows = []
    for block in page.get_text("dict", sort=True).get("blocks", []):
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            spans = line.get("spans", [])
            text = clean(" ".join(span.get("text", "") for span in spans))
            if not text:
                continue
            biggest = max(spans, key=lambda item: item.get("size", 0)) if spans else {}
            rows.append({
                "text": text,
                "bbox": [round(v, 2) for v in line.get("bbox", (0, 0, 0, 0))],
                "size": round(biggest.get("size", 0), 2),
                "font": clean(biggest.get("font", "")),
            })
    return rows


def word_rows(page):
    return [{
        "text": clean(word[4]),
        "bbox": [round(v, 2) for v in word[:4]],
        "block": int(word[5]), "line": int(word[6]), "word": int(word[7]),
    } for word in page.get_text("words", sort=True) if clean(word[4])]


def analyze(kind, path):
    document = fitz.open(path)
    pages, all_refs, total_prices = [], [], 0
    for index, page in enumerate(document):
        words = word_rows(page)
        refs, prices = [], []
        for token in words:
            raw = token["text"].strip(" ,;:()[]")
            if REF_RE.fullmatch(raw):
                refs.append({**token, "normalized": raw.upper()})
                all_refs.append(raw.upper())
            compact = raw.replace(" ", "")
            if PRICE_RE.fullmatch(compact):
                digits = re.sub(r"[^0-9,.]", "", compact)
                if digits and ("," in digits or "." in digits or "€" in compact):
                    prices.append(token)
        total_prices += len(prices)
        pages.append({
            "page": index + 1,
            "width": round(page.rect.width, 2),
            "height": round(page.rect.height, 2),
            "text": page.get_text("text", sort=True),
            "lines": line_rows(page),
            "references": refs,
            "prices": prices,
            "imageCount": len(page.get_images(full=True)),
        })
    counts = Counter(all_refs)
    summary = {
        "kind": kind, "file": path.name, "bytes": path.stat().st_size,
        "metadata": document.metadata, "pageCount": len(document),
        "referenceOccurrences": len(all_refs), "uniqueReferences": len(counts),
        "priceTokens": total_prices, "topRepeatedReferences": counts.most_common(250),
    }
    return summary, pages


def main():
    if OUTPUT_DIR.exists():
        shutil.rmtree(OUTPUT_DIR)
    OUTPUT_DIR.mkdir(parents=True)
    if LEGACY_OUTPUT.exists():
        LEGACY_OUTPUT.unlink()
    summaries = {}
    for kind, path in DOCUMENTS.items():
        summary, pages = analyze(kind, path)
        summaries[kind] = summary
        for start in range(0, len(pages), 10):
            chunk = {
                "document": kind,
                "file": path.name,
                "pageStart": start + 1,
                "pageEnd": min(start + 10, len(pages)),
                "pages": pages[start:start + 10],
            }
            target = OUTPUT_DIR / f"{kind}-{start + 1:03d}-{min(start + 10, len(pages)):03d}.json"
            target.write_text(json.dumps(chunk, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (OUTPUT_DIR / "summary.json").write_text(
        json.dumps({"version": "2026-09-14", "documents": summaries}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(summaries, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

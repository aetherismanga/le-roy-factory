from __future__ import annotations

import json
import re
from pathlib import Path

import fitz  # PyMuPDF

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "generated" / "neobath-audit"
OUT.mkdir(parents=True, exist_ok=True)

PDFS = {
    "ANIMA": ROOT / "assets" / "pdf" / "neobathANIMA.pdf",
    "DNA": ROOT / "assets" / "pdf" / "neobathDNA.pdf",
}

KEYWORDS = [
    "base", "bases", "mobile", "mobili", "modulo", "moduli", "cassett", "drawer",
    "anta", "front", "facciata", "finitur", "finish", "colore", "color", "laccato", "legno",
    "lavabo", "lavabi", "washbasin", "vasca", "top", "piano", "mensola", "piano lavabo",
    "specchio", "specchi", "mirror", "led", "accessor", "porta salviette", "portasalviette",
    "pied", "piede", "piedi", "gamba", "gambe", "feet", "towel", "sifone", "scarico",
    "ceramica", "geacril", "ocritech", "hpl", "fenix", "gres", "marmo", "vetro",
]

PRICE_RE = re.compile(r"(?<!\d)(\d{1,4}[.,]\d{2})(?!\d)")
REF_RE = re.compile(r"\b[A-Z0-9][A-Z0-9._/-]{3,}\b")
DIM_RE = re.compile(r"\b\d{2,3}(?:[.,]\d+)?\s*[xX×]\s*\d{2,3}(?:[.,]\d+)?(?:\s*[xX×]\s*\d{2,3}(?:[.,]\d+)?)?\b")
WIDTH_RE = re.compile(r"\b(?:L|LARGH(?:EZZA)?|WIDTH)?\s*(\d{2,3})\s*(?:CM|cm)?\b")


def clean_line(line: str) -> str:
    return re.sub(r"\s+", " ", line).strip()


def audit_pdf(label: str, path: Path) -> dict:
    doc = fitz.open(path)
    page_summaries = []
    all_text_parts = []

    for page_index, page in enumerate(doc, start=1):
        text = page.get_text("text", sort=True) or ""
        lines = [clean_line(x) for x in text.splitlines() if clean_line(x)]
        lower = " ".join(lines).lower()
        hits = sorted({kw for kw in KEYWORDS if kw in lower})
        prices = PRICE_RE.findall(text)
        refs = REF_RE.findall(text)
        dims = DIM_RE.findall(text)
        widths = WIDTH_RE.findall(text)

        image_meta = []
        for img in page.get_images(full=True):
            xref = img[0]
            width = img[2]
            height = img[3]
            image_meta.append({"xref": xref, "width": width, "height": height})

        first_lines = lines[:24]
        page_summaries.append({
            "page": page_index,
            "width": round(page.rect.width, 2),
            "height": round(page.rect.height, 2),
            "first_lines": first_lines,
            "keyword_hits": hits,
            "price_count": len(prices),
            "price_samples": prices[:24],
            "reference_samples": refs[:30],
            "dimension_samples": dims[:20],
            "width_samples": widths[:20],
            "image_count": len(image_meta),
            "largest_images": sorted(image_meta, key=lambda x: x["width"] * x["height"], reverse=True)[:10],
            "text_chars": len(text),
        })
        all_text_parts.append(f"\n===== {label} PAGE {page_index} =====\n{text.rstrip()}\n")

    (OUT / f"{label.lower()}-layout.txt").write_text("".join(all_text_parts), encoding="utf-8")
    return {
        "collection": label,
        "pdf": str(path.relative_to(ROOT)),
        "pages": len(doc),
        "page_summaries": page_summaries,
    }


def main() -> None:
    result = {label: audit_pdf(label, path) for label, path in PDFS.items()}
    (OUT / "page-index.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    # Compact report in Actions logs, useful to locate tariff/product sections quickly.
    print("NEOBATH_AUDIT_READY")
    for label, info in result.items():
        print(f"\n### {label}: {info['pages']} pages")
        for p in info["page_summaries"]:
            if p["price_count"] or p["keyword_hits"]:
                heading = " | ".join(p["first_lines"][:6])
                print(
                    f"{label} p{p['page']:03d}: prices={p['price_count']:3d} "
                    f"images={p['image_count']:2d} keywords={','.join(p['keyword_hits']) or '-'} :: {heading[:360]}"
                )


if __name__ == "__main__":
    main()

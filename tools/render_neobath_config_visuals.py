from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

import fitz
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "assets" / "data" / "neobath-config-data.json"
OUT = ROOT / "assets" / "img" / "neobath-config"
OUT.mkdir(parents=True, exist_ok=True)

DOCS: dict[str, fitz.Document] = {}
CACHE: dict[tuple[str, int, str], str] = {}


def slug(value: str) -> str:
    value = re.sub(r"[^a-zA-Z0-9_-]+", "-", value).strip("-").lower()
    return value[:70] or "visual"


def doc_for(path: str) -> fitz.Document:
    if path not in DOCS:
        DOCS[path] = fitz.open(ROOT / path)
    return DOCS[path]


def union_rect(rects):
    if not rects:
        return None
    out = fitz.Rect(rects[0])
    for rect in rects[1:]:
        out.include_rect(rect)
    return out


def find_rect(page: fitz.Page, query: str):
    candidates = [query]
    if " / " in query:
        candidates.append(query.split(" / ")[0])
    if "·" in query:
        candidates.append(query.split("·")[0].strip())
    if " " in query:
        candidates.append(query.split()[0])
    for candidate in candidates:
        candidate = candidate.strip()
        if not candidate:
            continue
        rects = page.search_for(candidate)
        if rects:
            return union_rect(rects[:4])
    return None


def render_visual(meta: dict, hint: str) -> str | None:
    pdf = meta.get("pdf")
    page_number = meta.get("page")
    query = str(meta.get("query") or hint or "").strip()
    if not pdf or not page_number:
        return None
    key = (pdf, int(page_number), query)
    if key in CACHE:
        return CACHE[key]

    doc = doc_for(pdf)
    if int(page_number) < 1 or int(page_number) > len(doc):
        return None
    page = doc[int(page_number) - 1]
    found = find_rect(page, query)

    if found:
        # Wide horizontal crop around the exact tariff/reference line. This keeps
        # nearby diagrams/photos from the same PDF row visible as well.
        y0 = max(page.rect.y0, found.y0 - 72)
        y1 = min(page.rect.y1, found.y1 + 115)
        if y1 - y0 < 115:
            y1 = min(page.rect.y1, y0 + 115)
        clip = fitz.Rect(page.rect.x0, y0, page.rect.x1, y1)
    else:
        # If the text is vectorized or absent, keep the genuine source page as
        # the visual rather than inventing an illustration.
        clip = page.rect

    pix = page.get_pixmap(matrix=fitz.Matrix(1.55, 1.55), clip=clip, alpha=False)
    image = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    max_width = 1050
    if image.width > max_width:
        ratio = max_width / image.width
        image = image.resize((max_width, max(1, int(image.height * ratio))), Image.Resampling.LANCZOS)

    digest = hashlib.sha1(f"{pdf}|{page_number}|{query}".encode("utf-8")).hexdigest()[:10]
    filename = f"{slug(hint or query)}-{digest}.webp"
    target = OUT / filename
    image.save(target, "WEBP", quality=80, method=6)
    relative = target.relative_to(ROOT).as_posix()
    CACHE[key] = relative
    return relative


def enrich_visual(meta: dict | None, hint: str):
    if not isinstance(meta, dict):
        return meta
    image = render_visual(meta, hint)
    if image:
        meta["image"] = image
    return meta


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    for item in data.get("items", []):
        hint = f"{item.get('collection','')}-{item.get('ref','')}"
        item["visual"] = enrich_visual(item.get("visual"), hint)

    finishes = data.get("finishes", {})
    anima = finishes.get("ANIMA", {})
    for item in anima.get("facades", []):
        item["visual"] = enrich_visual(item.get("visual"), f"ANIMA-facade-{item.get('id','')}")
    for item in anima.get("colors", []):
        item["visual"] = enrich_visual(item.get("visual"), f"ANIMA-color-{item.get('name','')}")

    dna = finishes.get("DNA", {})
    dna["finishPageVisual"] = enrich_visual(dna.get("finishPageVisual"), "DNA-finitions")
    for group, values in dna.get("finishGroups", {}).items():
        for item in values:
            item["visual"] = enrich_visual(item.get("visual"), f"DNA-{group}-{item.get('name','')}")

    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"NEOBATH_VISUALS_READY: {len(CACHE)} source crops")


if __name__ == "__main__":
    main()

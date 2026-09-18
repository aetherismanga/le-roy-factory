#!/usr/bin/env python3
from __future__ import annotations

import argparse
import math
import re
import unicodedata
from pathlib import Path
import fitz

GENERAL_COLLECTIONS = [
    "Azuli Mood","Brooklyn","Clay","Creta","D_esign Evo","Deco","Domus","Glow",
    "Golden Hour","Hexagon","Horizon","Marechiaro","Montreal","Shell","Terre Etrusche",
    "Bavaria Stone","Dolomiti","Dynasty","Grand Place","Harmony","Millennium Quartz",
    "Roma","Sedimenti","Slate","Quercia","Yosemite","Allure","Dust","Love & Decors",
    "Segmento","Tropical","Twist","Venere","Lithos","Manhattan","Mysterium"
]

POOL_COLLECTIONS = [
    "Abyss","Acqua","Greek Isles","Italian Slate","Lakes","Mare",
    "Nevada","Pacific","Quantum","Sea Breeze","Seychelles","Twelfth Night"
]

ALIASES = {
    "D_esign Evo": ["d esign evo", "design evo"],
    "Love & Decors": ["love and decors", "love decors"],
    "Greek Isles": ["greek isles"],
    "Italian Slate": ["italian slate"],
    "Sea Breeze": ["sea breeze"],
    "Twelfth Night": ["twelfth night"],
}

def norm(value: str) -> str:
    s = unicodedata.normalize("NFD", str(value or ""))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.lower().replace("&", " and ").replace("_", " ")
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()

def variants(name: str) -> list[str]:
    vals = [name] + ALIASES.get(name, [])
    return list(dict.fromkeys(norm(v) for v in vals if norm(v)))

def page_heading_score(page: fitz.Page, name: str, page_index: int) -> float:
    best = -1.0
    wanted = variants(name)
    data = page.get_text("dict")
    for block in data.get("blocks", []):
        if "lines" not in block:
            continue
        spans = [sp for ln in block["lines"] for sp in ln.get("spans", [])]
        text = " ".join(sp.get("text", "") for sp in spans)
        nt = norm(text)
        if not nt:
            continue
        for target in wanted:
            if target not in nt:
                continue
            max_size = max((float(sp.get("size", 0)) for sp in spans), default=0.0)
            score = max_size * 4.0
            if nt == target:
                score += 60
            elif nt.startswith(target) or nt.endswith(target):
                score += 30
            if len(nt) <= len(target) + 24:
                score += 15
            # Front matter/table-of-contents mentions should lose against product headings.
            if page_index < 6:
                score -= 45
            best = max(best, score)
    return best

def find_pages(doc: fitz.Document, candidates: list[str]) -> dict[str, int]:
    mapping: dict[str, int] = {}
    for name in candidates:
        hits = []
        for i in range(doc.page_count):
            score = page_heading_score(doc[i], name, i)
            if score >= 0:
                hits.append((score, i))
        if hits:
            hits.sort(reverse=True)
            mapping[name] = hits[0][1]
            print(f"{name}: source page {hits[0][1] + 1}, score={hits[0][0]:.1f}")
    return mapping

def add_index(doc: fitz.Document, mapping: dict[str, int], label: str) -> int:
    names = list(mapping.keys())
    if not names:
        raise SystemExit("No collections located")

    width, height = doc[0].rect.width, doc[0].rect.height
    cols = 2
    rows = 9
    per_page = cols * rows
    index_pages = max(1, math.ceil(len(names) / per_page))

    for j in range(index_pages):
        doc.new_page(pno=1 + j, width=width, height=height)

    for j in range(index_pages):
        page = doc[1 + j]
        page.draw_rect(page.rect, color=(0.86, 0.84, 0.78), fill=(0.985, 0.978, 0.955), width=0)
        page.insert_text((44, 58), "ELIOS CERAMICA", fontsize=20, fontname="helv", color=(0.05, 0.20, 0.31))
        page.insert_text((44, 86), f"{label.upper()} - LEXIQUE INTERACTIF", fontsize=13, fontname="helv", color=(0.16, 0.20, 0.22))
        page.insert_text((44, 108), "Cliquez sur une collection pour aller directement a sa premiere page.", fontsize=9.5, fontname="helv", color=(0.35, 0.35, 0.35))
        page.insert_text((width - 95, 58), f"{j + 1}/{index_pages}", fontsize=9, fontname="helv", color=(0.42, 0.42, 0.42))

    left = 44
    col_gap = 22
    col_w = (width - left * 2 - col_gap) / 2
    y0 = 145
    row_h = 58

    shift = index_pages
    for idx, name in enumerate(names):
        pno = idx // per_page
        within = idx % per_page
        col = within // rows
        row = within % rows
        page = doc[1 + pno]
        x = left + col * (col_w + col_gap)
        y = y0 + row * row_h
        rect = fitz.Rect(x, y, x + col_w, y + 42)
        page.draw_rect(rect, color=(0.82, 0.78, 0.67), fill=(1, 1, 1), width=0.8)
        page.insert_text((x + 12, y + 17), name, fontsize=10.5, fontname="helv", color=(0.08, 0.14, 0.17))
        src = mapping[name]
        target = src + shift if src >= 1 else src
        page.insert_text((rect.x1 - 42, y + 17), f"p. {target + 1}", fontsize=7.5, fontname="helv", color=(0.45, 0.45, 0.45))
        page.insert_link({"kind": fitz.LINK_GOTO, "from": rect, "page": target})

    toc = [[1, f"ELIOS - {label} - Lexique interactif", 2]]
    for name in names:
        src = mapping[name]
        target = src + shift if src >= 1 else src
        toc.append([2, name, target + 1])
    doc.set_toc(toc)
    return shift

def validate(doc: fitz.Document, mapping: dict[str, int], shift: int) -> None:
    failures = []
    index_pages = list(range(1, 1 + shift))
    for name, src in mapping.items():
        found_links = []
        for pno in index_pages:
            page = doc[pno]
            for hit in page.search_for(name):
                for link in page.get_links():
                    if link.get("kind") == fitz.LINK_GOTO and fitz.Rect(link["from"]).intersects(hit):
                        found_links.append(link)
        if len(found_links) != 1:
            failures.append(f"{name}: expected 1 link, found {len(found_links)}")
            continue
        target = found_links[0]["page"]
        target_text = norm(doc[target].get_text("text"))
        if not any(v in target_text for v in variants(name)):
            failures.append(f"{name}: name absent from target page {target + 1}")
    if failures:
        raise SystemExit("\n".join(failures))

def build(source: Path, output: Path, label: str, mode: str, min_collections: int) -> None:
    doc = fitz.open(source)
    if doc.page_count < 8:
        raise SystemExit(f"Suspicious PDF: only {doc.page_count} pages")

    candidates = POOL_COLLECTIONS if mode == "pool" else GENERAL_COLLECTIONS
    mapping = find_pages(doc, candidates)
    print(f"Located {len(mapping)} collection(s): {', '.join(mapping)}")
    if len(mapping) < min_collections:
        raise SystemExit(f"Only {len(mapping)} collections found; minimum required is {min_collections}")

    shift = add_index(doc, mapping, label)
    validate(doc, mapping, shift)

    meta = doc.metadata or {}
    meta["title"] = f"ELIOS {label} - Lexique interactif LE ROY FACTORY"
    meta["subject"] = "Catalogue PDF interactif avec lexique cliquable des collections"
    doc.set_metadata(meta)

    output.parent.mkdir(parents=True, exist_ok=True)
    doc.save(output, garbage=4, deflate=True, clean=True)
    print(f"Saved {output}: {output.stat().st_size} bytes, {doc.page_count} pages")
    doc.close()

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True, type=Path)
    ap.add_argument("--output", required=True, type=Path)
    ap.add_argument("--label", required=True)
    ap.add_argument("--mode", choices=["general", "pool"], default="general")
    ap.add_argument("--min-collections", type=int, default=2)
    args = ap.parse_args()
    build(args.source, args.output, args.label, args.mode, args.min_collections)

if __name__ == "__main__":
    main()

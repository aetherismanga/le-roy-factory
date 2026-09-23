#!/usr/bin/env python3
from pathlib import Path
import argparse
import fitz

PRODUCTS = {
    "Aniet": 10, "Ketra": 11, "Luksy": 12, "Tekny": 13, "Woods": 14,
    "Arendal": 15, "Heritage": 16, "Larvik": 17, "Vita": 18,
}
SECTIONS = {
    "ONDABLOCK - Le système": 4,
    "STRUCTURE DU PRODUIT": 5,
    "AVANTAGES DU SYSTÈME": 6,
    "DOMAINES D’APPLICATION": 7,
}

def add_links(doc):
    index = doc[2]
    words = index.get_text("words")
    targets = {**SECTIONS, **PRODUCTS}
    for label, page_no in targets.items():
        parts = label.split()
        hits = [w for w in words if w[4].strip().lower() == parts[0].lower()]
        if not hits:
            continue
        for h in hits:
            y0, y1 = h[1], h[3]
            line = [w for w in words if abs(w[1]-y0) < 2.5]
            text = " ".join(w[4] for w in sorted(line, key=lambda x:x[0]))
            if label.lower() not in text.lower():
                continue
            x0=min(w[0] for w in line); x1=max(w[2] for w in line)
            index.insert_link({"kind":fitz.LINK_GOTO,"from":fitz.Rect(x0,y0,x1,y1),"page":page_no-1})
            break
    toc=[[1,"ONDABLOCK 2026 · Français",1],[1,"Sommaire interactif",3]]
    toc += [[2,n,p] for n,p in PRODUCTS.items()]
    doc.set_toc(toc)

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--source",type=Path,required=True)
    ap.add_argument("--output",type=Path,required=True)
    args=ap.parse_args()
    doc=fitz.open(args.source)
    add_links(doc)
    meta=doc.metadata or {}
    meta["title"]="Catalogue ONDABLOCK 2026 - Français interactif"
    meta["subject"]="Sommaire cliquable et accès direct aux collections"
    doc.set_metadata(meta)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    doc.save(args.output,garbage=4,deflate=True,clean=True)
    doc.close()

if __name__=="__main__":
    main()

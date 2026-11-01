#!/usr/bin/env python3
"""Choose one existing catalogue/page for each public La Fenice collection.

Edition year takes precedence over publication month: the 2026/2027 general
catalogue is the current edition even when a 2026 format brochure appeared
later. Original sources remain intact for imagery and extraction provenance.
"""
import argparse
import copy
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def edition_year(catalogue, source):
    # Titles and document filenames carry editions. Cover upload directories
    # only carry publication evidence and must not invent an edition label.
    text = " ".join(str(value or "") for value in (
        source.get("label"), catalogue.get("label"), catalogue.get("name"),
        source.get("url"),
    ))
    years = [int(value) for value in re.findall(r"(?<!\d)(20\d{2})(?!\d)", text)]
    return max(years) if years else None


def publication_month(catalogue, source):
    for kind, value in (("document filename", source.get("url", "")),
                        ("cover upload month", catalogue.get("cover", ""))):
        match = re.search(r"(?<!\d)(20\d{2})[/-](0[1-9]|1[0-2])(?:[/-]|_)", value)
        if match:
            return (int(match[1]), int(match[2])), {"kind": kind, "url": value}
    return (0, 0), None


def catalogue_priority(source, catalogue):
    identity = source.get("catalogueId") or catalogue.get("id") or ""
    if identity.startswith("general-"):
        return 4
    if identity.startswith("wall-"):
        return 3
    if identity.startswith("cersaie-"):
        return 2
    if identity.startswith("collections-"):
        return 1
    return 0


def select_source(product, catalogues):
    by_id = {c["id"]: c for c in catalogues}
    by_url = {c["url"]: c for c in catalogues if c.get("url")}
    candidates = []
    for index, source in enumerate(product.get("sources", [])):
        if not str(source.get("url", "")).startswith("https://"):
            continue
        catalogue = by_id.get(source.get("catalogueId")) or by_url.get(source["url"]) or {}
        edition = edition_year(catalogue, source)
        published, evidence = publication_month(catalogue, source)
        page_known = isinstance(source.get("page"), int) and source["page"] > 0
        rank = (edition or published[0], *published, page_known,
                catalogue_priority(source, catalogue), -index)
        candidates.append((rank, source, edition, evidence))
    if not candidates:
        raise ValueError(f"No existing catalogue source for {product.get('slug')}")
    _, selected, edition, evidence = max(candidates, key=lambda candidate: candidate[0])
    if not isinstance(selected.get("page"), int) or selected["page"] < 1:
        raise ValueError(f"No confirmed PDF page for {product.get('slug')}")
    return copy.deepcopy(selected), edition, evidence


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=ROOT / "assets/data/fenice-catalogue.json")
    parser.add_argument("--report", type=Path, default=ROOT / "reports/fenice-primary-catalogues-2026-11-01.json")
    args = parser.parse_args()
    data = json.loads(args.data.read_text())
    choices = []
    before = [{key: value for key, value in product.items() if key != "primaryCatalogueSource"}
              for product in data["collections"]]
    for product in data["collections"]:
        selected, edition, evidence = select_source(product, data["catalogues"])
        product["primaryCatalogueSource"] = selected
        choices.append({
            "collection": product["name"], "slug": product["slug"],
            "selected": selected, "editionEndYear": edition,
            "publicationEvidence": evidence,
            "directUrl": selected["url"].split("#", 1)[0] + "#page=" + str(selected["page"]),
            "otherSourceCount": len(product.get("sources", [])) - 1,
        })
    after = [{key: value for key, value in product.items() if key != "primaryCatalogueSource"}
             for product in data["collections"]]
    assert before == after, "Selecting a link must preserve product and original-source data"
    args.data.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    report = {
        "rule": "Highest edition end-year, then known document/cover publication month; ties prefer a confirmed series page and broader catalogue. Original source arrays are preserved.",
        "collectionCount": len(choices), "allPdfPagesKnown": True,
        "selectedCatalogues": dict(Counter(item["selected"].get("catalogueId") for item in choices)),
        "editionUnknown": [item["slug"] for item in choices if item["editionEndYear"] is None],
        "choices": choices,
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({key: report[key] for key in (
        "collectionCount", "allPdfPagesKnown", "selectedCatalogues", "editionUnknown"
    )}, ensure_ascii=False))


if __name__ == "__main__":
    main()

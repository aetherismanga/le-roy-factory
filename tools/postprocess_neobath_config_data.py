from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "assets" / "data" / "neobath-config-data.json"
SUMMARY = ROOT / "generated" / "neobath-audit" / "config-build-summary.json"

LIGHT_PREFIXES = ("BARLED", "MOON", "SOLAR", "DIAMANTE", "PLEXY", "SMART")
ACCESSORY_REFS = {"TOUCH", "SIDEBAR", "SIDE", "MLA", "MFR", "MCPI", "PIE35", "MNS1F", "MNS2F"}


def item_id(collection: str, ref: str) -> str:
    return f"{collection.lower()}-{ref.lower().replace('/', '-')}-manual"


def static_item(collection, ref, label, category, price, dims="", visual=None, source=None):
    nums = []
    import re
    for token in re.findall(r"\d+(?:[.,]\d+)?", dims):
        nums.append(float(token.replace(",", ".")))
    return {
        "id": item_id(collection, ref),
        "collection": collection,
        "category": category,
        "subtype": None,
        "ref": ref,
        "label": label,
        "dimensions": {
            "label": dims,
            "width": nums[0] if nums else None,
            "height": nums[1] if len(nums) > 1 else None,
            "depth": nums[2] if len(nums) > 2 else None,
        },
        "facade": None,
        "unit": "unit",
        "prices": [{"key": "standard", "label": "Tarif", "price": float(price)}],
        "source": source or {"tariff": collection},
        "visual": visual,
    }


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    items = data.get("items", [])

    for item in items:
        ref = str(item.get("ref") or "").upper()
        label = str(item.get("label") or "").lower()
        collection = item.get("collection")

        # Explicit references beat broad section labels.
        if ref.startswith("TPC"):
            item["category"] = "finishing_top"
        if ref in ACCESSORY_REFS or any(word in label for word in ["porta asciug", "portasciug", "foro per", "foro rubinet", "supporto", "pied", "touch", "mensola"]):
            item["category"] = "accessory"
        if item.get("category") == "lighting" and not ref.startswith(LIGHT_PREFIXES):
            item["category"] = "accessory"

        if collection == "DNA":
            if item.get("category") == "module":
                item["visual"] = {"pdf": "assets/pdf/neobathDNA.pdf", "page": 76, "query": str(item.get("dimensions", {}).get("width") or "")}
            elif item.get("category") == "accessory":
                if ref == "SIDEBAR" or "ASCIUG" in label:
                    item["visual"] = {"pdf": "assets/pdf/neobathDNA.pdf", "page": 73, "query": "SideBar"}
                elif ref.startswith("BRIDGE"):
                    item["visual"] = {"pdf": "assets/pdf/neobathDNA.pdf", "page": 74, "query": "Bridge"}
                elif ref == "PIE35":
                    item["visual"] = {"pdf": "assets/pdf/neobathDNA.pdf", "page": 76, "query": "Piede"}
                elif ref.startswith("MNS"):
                    item["visual"] = {"pdf": "assets/pdf/neobathDNA.pdf", "page": 72, "query": "Mensola"}
                else:
                    item["visual"] = {"pdf": "assets/pdf/neobathDNA.pdf", "page": 71, "query": ref}
            elif item.get("category") == "finishing_top":
                item["visual"] = {"pdf": "assets/pdf/neobathDNA.pdf", "page": 76, "query": "Basi"}

    existing_refs = {(x.get("collection"), str(x.get("ref") or "").upper()) for x in items}
    manual = [
        static_item(
            "DNA", "FRESATA-PORTASCIUGAMANO", "Rainure porte-serviette sur plan caisson",
            "accessory", 105, visual={"pdf": "assets/pdf/neobathDNA.pdf", "page": 73, "query": "porta asciugamano"},
            source={"tariff": "DNA", "note": "FRESATA PORTASCIUGAMANO · cad. 105,00"}
        ),
        static_item(
            "DNA", "SIDEBAR", "Barre porte-serviette latérale SideBar",
            "accessory", 115, "40 x 5 x 2,5", visual={"pdf": "assets/pdf/neobathDNA.pdf", "page": 73, "query": "SideBar"},
            source={"tariff": "DNA", "note": "ASTA PORTA ASCIUGAMANO / SIDEBAR"}
        ),
        static_item(
            "DNA", "BRIDGE140", "Structure / banc aluminium Bridge 140",
            "accessory", 303, "140 x 15 x 43,5", visual={"pdf": "assets/pdf/neobathDNA.pdf", "page": 74, "query": "Bridge"},
            source={"tariff": "DNA", "line": 571}
        ),
        static_item(
            "DNA", "PIE35", "Pied de support en aluminium H.35",
            "accessory", 38, "2,5 x 35 x 2,5", visual={"pdf": "assets/pdf/neobathDNA.pdf", "page": 76, "query": "Piede"},
            source={"tariff": "DNA", "note": "PIE35 · pied aluminium H.35"}
        ),
        static_item(
            "DNA", "MNS1F", "Étagère à un trou",
            "accessory", 70, "20 x 13,5", visual={"pdf": "assets/pdf/neobathDNA.pdf", "page": 72, "query": "Mensola"},
            source={"tariff": "DNA", "note": "MNS1F · mensola 1 foro"}
        ),
        static_item(
            "DNA", "MNS2F", "Étagère à deux trous",
            "accessory", 76, "20 x 13,5", visual={"pdf": "assets/pdf/neobathDNA.pdf", "page": 72, "query": "Mensola"},
            source={"tariff": "DNA", "note": "MNS2F · mensola 2 fori"}
        ),
    ]
    for item in manual:
        if (item["collection"], item["ref"].upper()) not in existing_refs:
            items.append(item)

    # DNA finish/color visuals come from the catalogue's dedicated finish page.
    dna = data.get("finishes", {}).get("DNA", {})
    page75 = {"pdf": "assets/pdf/neobathDNA.pdf", "page": 75, "query": "Finiture"}
    dna["finishPageVisual"] = page75
    for group, values in dna.get("finishGroups", {}).items():
        for entry in values:
            entry.setdefault("visual", None)
            if not entry["visual"]:
                entry["visual"] = {"pdf": "assets/pdf/neobathDNA.pdf", "page": 75, "query": group}

    data["items"] = items
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    categories = {}
    for item in items:
        key = f"{item.get('collection')}:{item.get('category')}"
        categories[key] = categories.get(key, 0) + 1
    summary = {
        "total": len(items),
        "categories": categories,
        "anima": len([x for x in items if x.get("collection") == "ANIMA"]),
        "dna": len([x for x in items if x.get("collection") == "DNA"]),
    }
    SUMMARY.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

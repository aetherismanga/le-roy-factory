#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
public = json.loads((ROOT / "assets/data/aquahome-products.json").read_text(encoding="utf-8"))
private = json.loads((ROOT / "functions/aquahome-products.json").read_text(encoding="utf-8"))["products"]
rows = {row["reference"]: row for row in public["products"] if not row.get("priceAmbiguous")}

REFERENCES = [
    "11340212701", "11940212701", "13240212701", "14640212701", "540000010",
    "R52020", "12759112603", "15159112501", "19039112701", "30402001",
]

for reference in REFERENCES:
    assert reference in rows, f"Référence publique absente : {reference}"
    assert reference in private, f"Référence PRO absente : {reference}"
    source = private[reference]["sourceHT"]
    assert rows[reference]["publicTTC"] == round(source * 1.20 + 1e-8, 2)
    assert round(source * 0.50 + 1e-8, 2) >= 0
    assert len(rows[reference]["hotspot"]) == 4
    assert 1 <= rows[reference]["page"] <= public["pageCount"]

assert "sourceHT" not in (ROOT / "assets/data/aquahome-products.json").read_text(encoding="utf-8")
assert "12759112601" not in private, "La référence fournisseur ambiguë ne doit pas recevoir de prix PRO"
print(f"OK — {len(REFERENCES)} références vérifiées en modes public TTC et PRO HT")

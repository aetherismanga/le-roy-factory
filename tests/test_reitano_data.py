import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
public = json.loads((ROOT / "assets/data/reitano-products.json").read_text(encoding="utf-8"))
private = json.loads((ROOT / "functions/reitano-products.json").read_text(encoding="utf-8"))["products"]
assert public["pageCount"] == 195
assert len(public["pages"]) == 195
assert len(public["series"]) >= 20
assert len(public["products"]) >= 2500
assert len({p["reference"] for p in public["products"]}) >= 350
assert not any("sourceHT" in p for p in public["products"])
assert all(p["key"] in private for p in public["products"])
assert all(round(private[p["key"]]["sourceHT"] * 1.2 + 1e-8, 2) == p["publicTTC"] for p in public["products"])
assert any(p["reference"] == "G202" and p["finishCode"] == "CRO" and p["page"] == 45 for p in public["products"])
assert any(p.get("hotspot") for p in public["products"])
print(f"REITANO: {len(public['products'])} variantes validées")

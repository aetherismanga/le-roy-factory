import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
public = json.loads((ROOT / "assets/data/reitano-products.json").read_text(encoding="utf-8"))
private = json.loads((ROOT / "functions/reitano-products.json").read_text(encoding="utf-8"))["products"]
report = json.loads((ROOT / "reports/reitano-extraction-report.json").read_text(encoding="utf-8"))

assert public["version"] == "2026-09-15"
assert public["pageCount"] == 195
assert len(public["pages"]) == 195
assert len(public["series"]) >= 20
assert len(public["products"]) >= 2500
assert len({p["reference"] for p in public["products"]}) >= 350
assert not any("sourceHT" in p for p in public["products"])
assert all(p["key"] in private for p in public["products"])

priced = [p for p in public["products"] if private[p["key"]]["sourceHT"] is not None]
assert priced
assert all(private[p["key"]]["sourceHT"] > 2 for p in priced)
assert all(round(private[p["key"]]["sourceHT"] * 1.2 + 1e-8, 2) == p["publicTTC"] for p in priced)
assert all(
    p["publicTTC"] is None
    for p in public["products"]
    if private[p["key"]]["sourceHT"] is None
)
assert not any(private[p["key"]]["sourceHT"] in (0, 1, 2) for p in public["products"])
assert any(p.get("hotspot") for p in public["products"])

by_key = {p["key"]: p for p in public["products"]}
assert private["5803::BRO"]["sourceHT"] == 230
assert by_key["5803::BRO"]["publicTTC"] == 276
assert round(private["5803::BRO"]["sourceHT"] * .5, 2) == 115
assert private["58102::BRO"]["sourceHT"] == 165
assert by_key["58102::BRO"]["publicTTC"] == 198
assert round(private["58102::BRO"]["sourceHT"] * .5, 2) == 82.5

bases = defaultdict(list)
for product in priced:
    bases[product["reference"]].append(product["publicTTC"])
for values in bases.values():
    unique = sorted(set(values))
    mode = "from" if len(unique) > 1 else "exact"
    assert (mode == "from") == (len(unique) > 1)
    assert min(unique) == unique[0]

assert not report["conflicts"]
assert not report["badgeAudit"]["validationErrors"]
assert len(report["controlSample20"]) == 20
assert report["variantsOnRequest"] == len([p for p in public["products"] if p["publicTTC"] is None])
print(
    f"REITANO: {len(public['products'])} variantes, "
    f"{len(priced)} tarifées, {report['variantsOnRequest']} sur demande, "
    "5803 BRO=230 HT validé"
)

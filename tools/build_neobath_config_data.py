from __future__ import annotations

import base64
import gzip
import json
import re
from pathlib import Path
from typing import Iterable

import fitz

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "data" / "neobath-config-data.json"
SUMMARY = ROOT / "generated" / "neobath-audit" / "config-build-summary.json"

ANIMA_PDF = ROOT / "assets" / "pdf" / "neobathANIMA.pdf"
DNA_PDF = ROOT / "assets" / "pdf" / "neobathDNA.pdf"

PRICE_RX = re.compile(r"(?<!\d)(\d{1,3}(?:\.\d{3})*,\d{2}|\d{1,4},\d{2})(?!\d)")
DIM_RX = re.compile(r"(?:Ø\s*)?\d{1,3}(?:[.,]\d+)?(?:\s*x\s*\d{1,3}(?:[.,]\d+)?){1,2}(?:\s*DV)?", re.I)
REF_RX = re.compile(r"\b[A-Z][A-Z0-9]{2,}(?:[-/][A-Z0-9]+)*\b")
WIDTH_RX = re.compile(r"\b(120DV|\d{2,3})\b")
CML_RX = re.compile(r"/\s*CML\s*(\d{1,2}[.,]\d{2})", re.I)

BLACKLIST = {
    "ANIMA", "DNA", "CODE", "CODICE", "DIMENSION", "DIMENSIONI", "PRICE", "PREZZO", "PRIX",
    "WHITE", "BLACK", "MATT", "MATTE", "GLOSSY", "COLOR", "COLOUR", "COLORE", "FINISH", "FINITION",
    "BIANCO", "NERO", "OPACO", "LUCIDO", "BASE", "TOP", "VASCA", "LAVABO", "SPECCHIO", "LAMPADA",
    "DUNE", "LEGNO", "LACCATO", "HPL", "FENIX", "GRES", "GEACRIL", "OCRITECH", "MINERAL",
}


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def price(value: str) -> float:
    value = value.replace(".", "").replace(",", ".")
    return round(float(value), 2)


def dimensions(value: str | None):
    if not value:
        return {"label": "", "width": None, "height": None, "depth": None}
    label = clean(value.replace("×", "x"))
    nums = [float(x.replace(",", ".")) for x in re.findall(r"\d+(?:[.,]\d+)?", label)]
    if label.upper().endswith("DV") and nums:
        width = nums[0]
    else:
        width = nums[0] if nums else None
    return {
        "label": label,
        "width": width,
        "height": nums[1] if len(nums) > 1 else None,
        "depth": nums[2] if len(nums) > 2 else None,
    }


def valid_ref(ref: str) -> bool:
    if ref in BLACKLIST:
        return False
    if ref.startswith(("H.", "L.", "P.", "W.", "D.")):
        return False
    return any(ch.isdigit() for ch in ref) or "-" in ref or ref in {"TOUCH", "PLEXY", "SIDEBAR", "SIDE"}


def price_variants(values: list[float], collection: str, section: str, category: str):
    if not values:
        return []
    if len(values) == 1:
        return [{"key": "standard", "label": "Tarif", "price": values[0]}]

    s = section.lower()
    if collection == "DNA" and category in {"module", "storage", "finishing_top"} and len(values) >= 3:
        return [
            {"key": "dune_legno", "label": "Dune / Legno", "price": values[0]},
            {"key": "lacquer_matte", "label": "Laqué mat", "price": values[1]},
            {"key": "lacquer_gloss", "label": "Laqué brillant", "price": values[2]},
        ]
    if "geacril" in s or "stone" in s:
        labels = ["Blanc mat", "Couleur / NCS"]
    elif "ceram" in s:
        labels = ["Blanc brillant", "Blanc / noir mat"]
    elif "appoggio" in s:
        labels = ["Blanc", "Couleur / finition"]
    else:
        labels = [f"Tarif {i + 1}" for i in range(len(values))]
    return [{"key": f"v{i+1}", "label": labels[i] if i < len(labels) else f"Tarif {i+1}", "price": p} for i, p in enumerate(values)]


def infer_category(collection: str, section: str, ref: str, context: str) -> str:
    s = f"{section} {context}".lower()
    r = ref.upper()
    if collection == "ANIMA" and r.startswith(("APUR-PL", "ARIB-PL")):
        return "module"
    if collection == "ANIMA" and r.startswith(("APUR-BA", "ARIB-BA")):
        return "module"
    if collection == "DNA" and r.startswith(("DNA-PL", "DNA-BA")):
        return "module"
    if r.startswith(("DNA-PA", "DNA-CO")) or "pensil" in s or "colonn" in s:
        return "storage"
    if r.startswith("TPC") or "top di copertura" in s:
        return "finishing_top"
    if "specchi" in s or "specchio" in s or r.startswith(("SF", "SPT", "SFR", "SPTR", "SFI", "SFT", "EDN", "ARL", "AR100", "MAKEUP", "OFFSET", "GLOW", "UP")):
        return "mirror"
    if "lampad" in s or r.startswith(("BARLED", "MOON", "SOLAR", "DIAMANTE", "PLEXY", "SMART")):
        return "lighting"
    if "lavabi in appoggio" in s or "countertop" in s or r.startswith(("FO0", "ECLISSE", "CVR", "PF1", "B578", "B571", "B860", "B861", "B862")):
        return "countertop_basin"
    if "lavabi in ceramica" in s and r.startswith("TA"):
        return "basin"
    if "vasca" in s and not r.startswith(("TGR", "THPL", "TFX", "TPGE", "TXT", "BNT", "TO", "TM", "PIC", "JUST", "TK")):
        return "basin"
    if "lavabo" in s and not "top" in s:
        return "basin"
    if "top" in s or r.startswith(("TK", "PIC", "JUST", "BNT", "TPGE", "TXT", "TO", "TM", "TMS", "TGR", "THPL", "TFX")):
        return "worktop"
    if "accessor" in s or "porta" in s or "pied" in s or "foro" in s or r in {"TOUCH", "SIDEBAR", "SIDE"}:
        return "accessory"
    return "accessory"


def make_record(collection: str, section: str, ref: str, dim: str | None, values: list[float], context: str, source: dict, unit: str = "unit"):
    category = infer_category(collection, section, ref, context)
    d = dimensions(dim)
    facade = None
    if collection == "ANIMA":
        if ref.startswith("APUR"):
            facade = "PURA"
        elif ref.startswith("ARIB"):
            facade = "RIBELLE"
    subtype = None
    if "-PL" in ref:
        subtype = "portalavabo"
    elif "-BA" in ref:
        subtype = "base"
    elif category == "storage" and "PA" in ref:
        subtype = "wall"
    elif category == "storage" and "CO" in ref:
        subtype = "column"
    return {
        "id": f"{collection.lower()}-{ref.lower().replace('/', '-')}-{source.get('page', source.get('line', 0))}",
        "collection": collection,
        "category": category,
        "subtype": subtype,
        "ref": ref,
        "label": clean(context)[:140] or ref,
        "dimensions": d,
        "facade": facade,
        "unit": unit,
        "prices": price_variants(values, collection, section, category),
        "source": source,
    }


def parse_segments(line: str, collection: str, section: str, context: str, source_base: dict):
    matches = [m for m in REF_RX.finditer(line) if valid_ref(m.group())]
    out = []
    for idx, match in enumerate(matches):
        ref = match.group()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(line)
        segment = line[match.end():end]
        values = [price(x) for x in PRICE_RX.findall(segment)]
        if not values:
            continue
        dim_match = DIM_RX.search(segment)
        dim = dim_match.group() if dim_match else None
        if dim is None and collection == "DNA" and ref.startswith(("DNA-PL", "DNA-BA")):
            w = WIDTH_RX.search(segment)
            if w:
                dim = w.group(1).replace("DV", "")
        source = dict(source_base)
        source["ref"] = ref
        out.append(make_record(collection, section, ref, dim, values, context, source))
    return out


def parse_anima():
    doc = fitz.open(ANIMA_PDF)
    records = []
    page_sections = {
        65: "Portalavabi e basi",
        66: "Portalavabi e basi H26",
        67: "Basi laterali, pensili, colonne e top di copertura",
        68: "Top e lavabi in ceramica",
        69: "Top in Geacril",
        70: "Top in Geacril al cm lineare e vasche",
        71: "Top in Geacril Stone al cm lineare e vasche",
        72: "Top in Ocritech e Mineral",
        73: "Top e vasche in Gres",
        74: "Top e vasche in HPL / Fenix",
        75: "Lavabi in appoggio Ocritech",
        76: "Lavabi in appoggio Ceramica / Geacril",
        77: "Specchi",
        78: "Specchi",
        79: "Specchi e accessori",
        80: "Lampade e accessori",
    }
    for page_num, section in page_sections.items():
        page = doc[page_num - 1]
        lines = [clean(x) for x in (page.get_text("text", sort=True) or "").splitlines() if clean(x)]
        context = section
        for line_no, line in enumerate(lines, start=1):
            upper = line.upper()
            if any(k in upper for k in ["PORTALAVABO", "BASE CON", "TOP ", "LAVAB", "VASCA", "SPECCH", "LAMPAD", "PENSILE", "COLONNA", "FORO", "PORTA ASCIUG"]):
                if not PRICE_RX.search(line):
                    context = line[:180]
            # Explicit linear-centimetre records.
            cml = CML_RX.findall(line)
            refs = [m.group() for m in REF_RX.finditer(line) if valid_ref(m.group())]
            if cml and refs:
                vals = [price(x) for x in cml]
                if page_num == 74 and len(refs) >= 2 and len(vals) >= 2:
                    for ref, p in zip(refs[:2], vals[:2]):
                        source = {"pdf": "assets/pdf/neobathANIMA.pdf", "page": page_num, "line": line_no, "ref": ref}
                        records.append(make_record("ANIMA", section, ref, None, [p], context, source, unit="cm"))
                    continue
                source = {"pdf": "assets/pdf/neobathANIMA.pdf", "page": page_num, "line": line_no, "ref": refs[0]}
                record = make_record("ANIMA", section, refs[0], None, vals, context, source, unit="cm")
                if len(vals) == 2:
                    record["prices"] = [
                        {"key": "white", "label": "Blanc mat", "price": vals[0]},
                        {"key": "color", "label": "Couleur / NCS", "price": vals[1]},
                    ]
                records.append(record)
                continue
            records.extend(parse_segments(
                line, "ANIMA", section, context,
                {"pdf": "assets/pdf/neobathANIMA.pdf", "page": page_num, "line": line_no},
            ))
    # Deduplicate exact source/ref combinations.
    seen = set()
    unique_records = []
    for item in records:
        key = (item["collection"], item["ref"], item["source"].get("page"), item["source"].get("line"), item["unit"])
        if key in seen:
            continue
        seen.add(key)
        unique_records.append(item)
    return unique_records


def decode_dna_tariff() -> str:
    part_dir = ROOT / "assets" / "data" / "neobath-dna-tarif"
    encoded = "".join(part.read_text(encoding="utf-8").strip() for part in sorted(part_dir.glob("part-*.txt")))
    return gzip.decompress(base64.b64decode(encoded)).decode("utf-8", errors="replace")


def section_chunks(text: str):
    markers = [
        ("Portalavabi / Basi", "DNA / Collection / Portalavabi"),
        ("Pensili e Colonne", "DNA / Collection / Pensili e Colonne"),
        ("Lavabi in Ceramica", "DNA / Collection / Lavabi in Ceramica"),
        ("Top in Geacril", "DNA / Collection / Top in Geacril"),
        ("Top in Ocritech", "DNA / Collection / Top in Ocritech"),
        ("Top in Mineral", "DNA / Collection / Top in Mineral"),
        ("Top in Gres", "DNA / Collection / Top in Gres"),
        ("Top in Hpl / Fenix", "DNA / Collection / Top in Hpl"),
        ("Lavabi in appoggio", "DNA / Collection / Lavabi in appoggio"),
        ("Specchi", "DNA / Collection / Specchi"),
        ("Lampade / Accessori", "DNA / Collection / Lampade"),
    ]
    starts = []
    for label, marker in markers:
        pos = text.find(marker)
        if pos >= 0:
            starts.append((pos, label))
    starts.sort()
    for i, (pos, label) in enumerate(starts):
        end = starts[i + 1][0] if i + 1 < len(starts) else len(text)
        yield label, text[pos:end]


def parse_dna():
    text = decode_dna_tariff()
    records = []
    global_line = 0
    for section, chunk in section_chunks(text):
        lines = chunk.splitlines()
        context = section
        for local_no, raw in enumerate(lines, start=1):
            global_line += 1
            line = clean(raw)
            if not line:
                continue
            upper = line.upper()
            if any(k in upper for k in ["PORTALAVABO", "BASE CON", "TOP ", "LAVAB", "VASCA", "SPECCH", "LAMPAD", "PENSILE", "COLONNA", "FORO", "PORTA ASCIUG", "PIEDE"]):
                if not PRICE_RX.search(line):
                    context = line[:180]
            cml = CML_RX.findall(line)
            refs = [m.group() for m in REF_RX.finditer(line) if valid_ref(m.group())]
            if cml and refs:
                vals = [price(x) for x in cml]
                # HPL/Fenix lines contain paired references and paired rates.
                if len(refs) >= 2 and len(vals) >= 2:
                    for ref, p in zip(refs[:2], vals[:2]):
                        source = {"tariff": "DNA", "line": global_line, "ref": ref}
                        records.append(make_record("DNA", section, ref, None, [p], context, source, unit="cm"))
                else:
                    source = {"tariff": "DNA", "line": global_line, "ref": refs[0]}
                    records.append(make_record("DNA", section, refs[0], None, vals, context, source, unit="cm"))
                continue
            parsed = parse_segments(line, "DNA", section, context, {"tariff": "DNA", "line": global_line})
            for rec in parsed:
                # DNA furniture table: first tariff applies to Dune and Legno, then matte/gloss lacquer.
                if rec["category"] in {"module", "storage", "finishing_top"} and len(rec["prices"]) >= 3:
                    vals = [p["price"] for p in rec["prices"][:3]]
                    rec["prices"] = [
                        {"key": "dune_legno", "label": "Dune / Legno", "price": vals[0]},
                        {"key": "lacquer_matte", "label": "Laqué mat", "price": vals[1]},
                        {"key": "lacquer_gloss", "label": "Laqué brillant", "price": vals[2]},
                    ]
                records.append(rec)
    seen = set()
    unique_records = []
    for item in records:
        key = (item["collection"], item["ref"], item["category"], item["dimensions"]["label"], tuple((p["key"], p["price"]) for p in item["prices"]))
        if key in seen:
            continue
        seen.add(key)
        unique_records.append(item)
    return unique_records


def first_page_with(doc: fitz.Document, term: str):
    term_low = term.lower()
    for idx, page in enumerate(doc, start=1):
        if term_low in (page.get_text("text") or "").lower():
            return idx
    return None


def finish_data():
    dna_doc = fitz.open(DNA_PDF)
    anima_colors = ["Bianco Gesso", "Argilla Secca", "Verde Agave", "Terra Rossa", "Grigio Vulcano", "Rovere Alba"]
    dna_groups = {
        "DUNE": ["Curry", "Indigo", "Paprika", "Kaffir"],
        "LEGNO": ["Rovere Cenere", "Rovere Sabbia", "Rovere Tabacco", "Rovere Avena"],
        "LACCATO": ["Bianco", "Grigio Chiaro", "Argilla", "Grigio Tundra", "Visone", "Ginger", "Mastice", "Rosso Mattone", "Mustard", "Rosa Antico", "Verde Salvia", "Grigio Ferro", "Verde Ottanio", "Blu Marino", "Nero"],
        "GRES": ["Calacatta Oro", "Bianco Statuario", "Pietra Grey", "Ossido Bruno", "Pietra Piasentina Grigio", "Pietra Piasentina Taupe", "Macchia Vecchia", "Emperador Extra", "Ceppo Pietra d’Iseo", "Anima Nero Atlante", "Travertino"],
        "FENIX": ["Rosso Namib", "Blu Shaba", "Viola Orissa", "Verde Comodoro", "Grigio Efeso", "Verde Kitami", "Cacao Orinoco", "Castoro Ottawa", "Beige Arizona", "Beige Luxor", "Grigio Antrim"],
        "HPL": ["Travertino Tivoli", "Terrazzo", "Kaspio Oro", "Elite", "Botticino", "Mailand", "White Yule", "Noce", "Rovere Naturale", "Noce Sinfonia", "Olmo", "Rovere Valweg", "Statuario", "Nero Ardesia"],
    }
    dna = {}
    for group, colors in dna_groups.items():
        dna[group] = []
        for name in colors:
            page = first_page_with(dna_doc, name)
            dna[group].append({"name": name, "visual": {"pdf": "assets/pdf/neobathDNA.pdf", "page": page, "query": name} if page else None})
    return {
        "ANIMA": {
            "facades": [
                {"id": "PURA", "name": "Pura · façade lisse", "visual": {"pdf": "assets/pdf/neobathANIMA.pdf", "page": 4, "query": "PURA"}},
                {"id": "RIBELLE", "name": "Ribelle · façade cannelée", "visual": {"pdf": "assets/pdf/neobathANIMA.pdf", "page": 4, "query": "RIBELLE"}},
            ],
            "colors": [{"name": name, "visual": {"pdf": "assets/pdf/neobathANIMA.pdf", "page": 4, "query": name}} for name in anima_colors],
        },
        "DNA": {
            "facades": [
                {"id": "DUNE", "name": "Dune", "priceKey": "dune_legno"},
                {"id": "LEGNO", "name": "Legno", "priceKey": "dune_legno"},
                {"id": "LACCATO_OPACO", "name": "Laqué mat", "priceKey": "lacquer_matte"},
                {"id": "LACCATO_LUCIDO", "name": "Laqué brillant", "priceKey": "lacquer_gloss"},
            ],
            "finishGroups": dna,
            "ralSurcharge": 0.20,
        },
    }


def attach_visuals(records: list[dict]):
    shared_pages = {
        "worktop": 70,
        "basin": 70,
        "countertop_basin": 76,
        "mirror": 77,
        "lighting": 80,
        "accessory": 80,
        "finishing_top": 67,
        "storage": 67,
    }
    for item in records:
        if item["collection"] == "ANIMA":
            src = item["source"]
            item["visual"] = {"pdf": src.get("pdf"), "page": src.get("page"), "query": item["ref"]}
        elif item["category"] == "module":
            item["visual"] = {"type": "module", "pdf": "assets/pdf/neobathDNA.pdf", "page": 76, "query": str(item["dimensions"].get("width") or "")}
        else:
            page = shared_pages.get(item["category"], 76)
            item["visual"] = {"pdf": "assets/pdf/neobathANIMA.pdf", "page": page, "query": item["ref"]}
    return records


def main():
    anima = parse_anima()
    dna = parse_dna()
    records = attach_visuals(anima + dna)
    data = {
        "version": "2026-08-18",
        "currency": "EUR",
        "proDiscount": {"first": 0.50, "second": 0.10, "factor": 0.45, "label": "-50% puis -10%"},
        "collections": ["ANIMA", "DNA", "LIBRE"],
        "finishes": finish_data(),
        "items": records,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    categories = {}
    for item in records:
        key = f"{item['collection']}:{item['category']}"
        categories[key] = categories.get(key, 0) + 1
    summary = {"total": len(records), "categories": categories, "anima": len(anima), "dna": len(dna)}
    SUMMARY.parent.mkdir(parents=True, exist_ok=True)
    SUMMARY.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

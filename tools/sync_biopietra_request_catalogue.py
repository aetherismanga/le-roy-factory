#!/usr/bin/env python3
"""Copy verified Biopietra ordering facts into the server validation snapshot."""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def request_catalogue(data):
    return {
        "schema": "lrf-biopietra-request-catalogue",
        "version": data["version"],
        "updatedAt": data["updatedAt"],
        "source": data["source"],
        "collections": [{
            "slug": product["slug"], "name": product["name"],
            "swatches": [{"id": color["id"], "name": color["name"]}
                         for color in product.get("swatches", [])],
            "variants": product.get("variants", []),
        } for product in data["collections"]],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=ROOT / "assets/data/biopietra-catalogue.json")
    parser.add_argument("--output", type=Path, default=ROOT / "functions/biopietra-catalogue.json")
    args = parser.parse_args()
    snapshot = request_catalogue(json.loads(args.source.read_text()))
    args.output.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"collections": len(snapshot["collections"]), "output": str(args.output)}))


if __name__ == "__main__":
    main()

"""Process one snapshot of a private local download queue, without networking.

Queue: [{"filename":"03V6A00@1.jpg", "path":"/local/original"}], or
{"files":[...]}. No original is removed. Re-running verifies immutable bytes.
"""
import argparse
import json
import re
from decimal import Decimal
from pathlib import Path
from types import SimpleNamespace

from prepare_elios_hd import REPO, PIPELINE_VERSION, atomic_json, digest, prepare


def portal_texture_sizes(path, collection):
    """Read private portal observations without copying private URLs to Git."""
    rows = json.loads(Path(path).read_text())
    if not isinstance(rows, list):
        raise ValueError("Portal observations must be an array")
    sizes = {}
    for row in rows:
        if row.get("collection", "").lower() != collection or row.get("category") != "texture":
            continue
        match = re.fullmatch(r"([\d.,]+)\s*(KB|MB|B)", row.get("size", ""))
        if not match:
            raise ValueError("Portal texture has an unsupported size observation")
        number = match.group(1)
        if "," in number:
            number = number.replace(".", "").replace(",", ".")
        expected = int((Decimal(number) * {"KB": 1000, "MB": 1000000, "B": 1}[match.group(2)]).to_integral_value())
        filename = row["name"]
        if filename in sizes and sizes[filename] != expected:
            raise ValueError(f"Ambiguous portal size for {filename}")
        sizes[filename] = expected
    if not sizes:
        raise ValueError("No official texture size observations for the collection")
    return sizes


def ingest(args):
    # Keep Creta's existing default and allow only explicitly reviewed collections.
    collection = getattr(args, "collection", "creta")
    if collection not in {"creta", "quercia"}:
        raise ValueError("Collection has no reviewed ingestion mapping")
    queue = json.loads(Path(args.queue).read_text())
    items = queue if isinstance(queue, list) else queue.get("files", queue.get("downloads"))
    if not isinstance(items, list):
        raise ValueError("Queue must be an array or contain a files array")
    mapping = json.loads(Path(args.mapping).read_text())[collection + "Verified"]
    # Quercia browser downloads may be interrupted. Check the exact name and
    # independently recorded portal size before accepting or reusing any bytes.
    portal_sizes = (portal_texture_sizes(getattr(args, "portal_files", REPO.parent / "elios-portal-files.json"), collection)
                    if collection == "quercia" else {})
    portal_validations = {}
    inventory_path = Path(args.inventory)
    previous = json.loads(inventory_path.read_text()).get("entries", []) if inventory_path.exists() else []
    results = []
    for item in items:
        filename = item.get("filename") or item.get("name")
        raw_path = item.get("path") or item.get("localPath")
        if not isinstance(filename, str) or not isinstance(raw_path, str):
            raise ValueError("Queue item requires filename and path")
        match = re.fullmatch(r"([A-Za-z0-9_-]+)@(\d+)\.jpg", filename, re.IGNORECASE)
        if not match:
            raise ValueError("Queue contains an unreviewed source filename")
        reference, face = match.group(1).upper(), int(match.group(2))
        verified = mapping.get(reference)
        if not verified or not verified.get("nativeTextureAssignmentAllowed"):
            raise ValueError(f"No verified reference mapping for {reference}")
        if filename not in verified.get("portalFaces", []):
            raise ValueError(f"Face not present in reviewed portal listing: {reference}/{face}")
        # Browser files are synchronized under the matching executor path.
        # Translate before stat: /home/oai may be inaccessible in this container.
        path = (Path("/workspace/scratch/") / raw_path.removeprefix("/home/oai/share/")
                if raw_path.startswith("/home/oai/share/") else Path(raw_path))
        if not path.is_file():
            results.append({"reference": reference, "face": face, "status": "original-not-local"})
            continue
        source_hash = digest(path)
        if collection == "quercia":
            expected_bytes = portal_sizes.get(filename)
            source_bytes = path.stat().st_size
            if expected_bytes is None or abs(source_bytes - expected_bytes) > 5:
                raise ValueError(f"Portal source size mismatch for {filename}: {source_bytes} bytes, expected {expected_bytes} ±5")
            observation = verified.get("faceObservations", {}).get(filename, {})
            if observation.get("sha256") and source_hash != observation["sha256"]:
                raise ValueError(f"Known official source hash mismatch for {filename}")
            if observation.get("bytes") and source_bytes != observation["bytes"]:
                raise ValueError(f"Known official source byte count mismatch for {filename}")
            portal_validations[(reference, face, source_hash)] = {
                "exactListedFilename": filename, "sourceBytes": source_bytes,
                "portalBytesRounded": expected_bytes, "toleranceBytes": 5,
                "sizeMatches": True,
                "knownSHA256Matches": True if observation.get("sha256") else None,
            }
        existing = next((entry for entry in previous if entry.get("collection") == collection and entry["reference"] == reference and
                         entry["face"] == face and entry["sourceFilename"] == filename), None)
        if collection == "quercia" and existing and source_hash != existing["sourceSHA256"]:
            raise ValueError(f"Previously verified source bytes changed for {filename}; review the source before replacement")
        if (existing and existing.get("identityVerified") and
            existing.get("colorId") == verified["colorId"] and
            existing.get("rotateClockwise") == args.rotate_cw and
            existing.get("recipe", {}).get("pipelineVersion") == PIPELINE_VERSION and
            existing.get("reuseAuthorization") == ("confirmed-by-user" if args.reuse_authorized else "pending") and
            source_hash == existing["sourceSHA256"] and
            all((Path(args.output) / variant["file"]).is_file() and
                digest(Path(args.output) / variant["file"]) == variant["sha256"]
                for variant in existing["variants"].values())):
            results.append({"reference": reference, "face": face, "status": "verified-existing"})
            print(json.dumps(results[-1]), flush=True)
            continue
        dims = verified["sourceFormatCm"]
        result = prepare(SimpleNamespace(
            source_file=str(path), source_name=filename, collection=collection,
            reference=reference, color_id=verified["colorId"], color=verified["color"],
            format_id=verified["sourceFormat"], format_cm=[dims["width"], dims["height"]],
            finish=verified["finish"], face=face, rotate_cw=args.rotate_cw,
            identity_verified=True, reuse_authorized=args.reuse_authorized,
            output=args.output, inventory=args.inventory,
        ))
        results.append({"reference": reference, "face": face, "status": "prepared", **result})
        print(json.dumps(results[-1], ensure_ascii=False), flush=True)
    summary = {"queued": len(items), "prepared": sum(r["status"] == "prepared" for r in results),
               "verifiedExisting": sum(r["status"] == "verified-existing" for r in results),
               "missing": sum(r["status"] == "original-not-local" for r in results),
               "originalsDeleted": 0, "uploaded": 0}
    if collection == "quercia" and inventory_path.exists():
        inventory = json.loads(inventory_path.read_text())
        for entry in inventory["entries"]:
            validation = portal_validations.get((entry["reference"], entry["face"], entry["sourceSHA256"]))
            if validation:
                entry["portalIdentityValidation"] = validation
        inventory["qualityPolicy"] = {
            "highTier": "native-source-definition-capped-at-4096",
            "upscalingAllowed": False,
            "note": "The max tier keeps native source detail; a 1200-pixel source is not a 4K texture.",
        }
        atomic_json(inventory_path, inventory)
        entries = [entry for entry in inventory["entries"] if entry["collection"] == collection]
        summary["inventoryFaces"] = len(entries)
        summary["readyFaces"] = sum(entry["readyForIntegration"] for entry in entries)
        summary["nativeSourceMaxSides"] = sorted({max(entry["nativeDimensions"]) for entry in entries})
        summary["portalSizeVerified"] = len(portal_validations)
    print(json.dumps(summary, ensure_ascii=False))
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--queue", required=True, help="Private local JSON, never committed")
    parser.add_argument("--collection", choices=["creta", "quercia"], default="creta")
    parser.add_argument("--output", required=True, help="Image directory outside Git checkout")
    parser.add_argument("--mapping", default=str(REPO / "reports/elios-hd/reference-mapping.json"))
    parser.add_argument("--portal-files", default=str(REPO.parent / "elios-portal-files.json"),
                        help="Private portal size observations, required for Quercia only; never committed")
    parser.add_argument("--inventory", help="Defaults to inventory.json for Creta or quercia-inventory.json for Quercia")
    parser.add_argument("--rotate-cw", type=int, choices=[0, 90, 180, 270], default=0)
    parser.add_argument("--reuse-authorized", action="store_true")
    args = parser.parse_args()
    if not args.inventory:
        args.inventory = str(REPO / "reports/elios-hd" / ("inventory.json" if args.collection == "creta" else "quercia-inventory.json"))
    ingest(args)


if __name__ == "__main__":
    main()

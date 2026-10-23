"""Process one snapshot of a private local download queue, without networking.

Queue: [{"filename":"03V6A00@1.jpg", "path":"/local/original"}], or
{"files":[...]}. No original is removed. Re-running verifies immutable bytes.
"""
import argparse
import json
import math
import re
from decimal import Decimal
from pathlib import Path
from types import SimpleNamespace

from prepare_elios_hd import REPO, PIPELINE_VERSION, atomic_json, digest, prepare, slug


def portal_texture_observations(path, collection):
    """Read private portal observations without copying private URLs to Git."""
    rows = json.loads(Path(path).read_text())
    if not isinstance(rows, list):
        raise ValueError("Portal observations must be an array")
    observations = {}
    for row in rows:
        if row.get("collection", "").casefold() != collection.casefold() or row.get("category") != "texture":
            continue
        match = re.fullmatch(r"([\d.,]+)\s*(KB|MB|B)", row.get("size", ""))
        if not match:
            raise ValueError("Portal texture has an unsupported size observation")
        number = match.group(1)
        if "," in number:
            number = number.replace(".", "").replace(",", ".")
        value = Decimal(number)
        multiplier = {"KB": 1000, "MB": 1000000, "B": 1}[match.group(2)]
        expected = int((value * multiplier).to_integral_value())
        # The portal rounds the displayed decimal unit. Two decimals in KB
        # mean ±5 bytes; two decimals in MB mean ±5000 bytes, not ±5.
        quantum = Decimal(10) ** value.as_tuple().exponent
        tolerance = (0 if match.group(2) == "B" else
                     max(1, int((quantum * multiplier / 2).to_integral_value(rounding="ROUND_CEILING"))))
        filename = row["name"]
        observation = {"portalBytesRounded": expected, "toleranceBytes": tolerance}
        if filename in observations and observations[filename] != observation:
            raise ValueError(f"Ambiguous portal size for {filename}")
        observations[filename] = observation
    if not observations:
        raise ValueError("No official texture size observations for the collection")
    return observations


def portal_texture_sizes(path, collection):
    """Compatibility helper for callers that need the rounded byte count."""
    return {name: row["portalBytesRounded"]
            for name, row in portal_texture_observations(path, collection).items()}


def ingest(args):
    # A new collection requires an explicit, reviewed reference table. Filenames
    # or a portal folder name alone never authorize a colour/format assignment.
    collection = slug(getattr(args, "collection", "creta"), "collection", "unassigned")
    queue = json.loads(Path(args.queue).read_text())
    items = queue if isinstance(queue, list) else queue.get("files", queue.get("downloads"))
    if not isinstance(items, list):
        raise ValueError("Queue must be an array or contain a files array")
    mapping_key = getattr(args, "mapping_key", None) or collection + "Verified"
    if not re.fullmatch(r"[A-Za-z][A-Za-z0-9]*Verified", mapping_key):
        raise ValueError("Mapping key must name an explicitly reviewed reference table")
    mapping = json.loads(Path(args.mapping).read_text()).get(mapping_key)
    if not isinstance(mapping, dict) or not mapping:
        raise ValueError("Collection has no reviewed ingestion mapping")
    # Browser downloads may be interrupted. Check the exact name and the
    # independently recorded portal size before accepting or reusing bytes.
    portal_observations = portal_texture_observations(
        getattr(args, "portal_files", REPO.parent / "elios-portal-files.json"),
        getattr(args, "portal_collection", None) or collection)
    portal_validations = {}
    inventory_path = Path(args.inventory)
    previous = json.loads(inventory_path.read_text()).get("entries", []) if inventory_path.exists() else []
    results = []
    queued_names = set()
    for item in items:
        filename = item.get("filename") or item.get("name")
        raw_path = item.get("path") or item.get("localPath")
        if not isinstance(filename, str) or not isinstance(raw_path, str):
            raise ValueError("Queue item requires filename and path")
        if filename in queued_names:
            raise ValueError(f"Duplicate source filename in queue: {filename}")
        queued_names.add(filename)
        match = re.fullmatch(r"([A-Za-z0-9_-]+)@(\d+)\.jpg", filename, re.IGNORECASE)
        if not match:
            raise ValueError("Queue contains an unreviewed source filename")
        reference, face = match.group(1).upper(), int(match.group(2))
        verified = mapping.get(reference)
        if not verified or not verified.get("nativeTextureAssignmentAllowed"):
            raise ValueError(f"No verified reference mapping for {reference}")
        mapped_collection = str(verified.get("collection", "")).casefold().replace(" ", "-")
        if mapped_collection != collection or verified.get("reference") != reference:
            raise ValueError(f"Reviewed mapping belongs to a different collection or reference: {reference}")
        dims = verified.get("sourceFormatCm", {})
        physical = [dims.get("width"), dims.get("height")]
        if not all(type(value) in {int, float} and math.isfinite(value) and 0 < value <= 1000
                   for value in physical):
            raise ValueError(f"Reviewed mapping has invalid physical dimensions: {reference}")
        rendered = physical[::-1] if args.rotate_cw in {90, 270} else physical
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
        observed_size = portal_observations.get(filename)
        source_bytes = path.stat().st_size
        if observed_size is None or abs(source_bytes - observed_size["portalBytesRounded"]) > observed_size["toleranceBytes"]:
            raise ValueError(f"Portal source size mismatch for {filename}: {source_bytes} bytes")
        observation = verified.get("faceObservations", {}).get(filename, {})
        if observation.get("sha256") and source_hash != observation["sha256"]:
            raise ValueError(f"Known official source hash mismatch for {filename}")
        if observation.get("bytes") and source_bytes != observation["bytes"]:
            raise ValueError(f"Known official source byte count mismatch for {filename}")
        portal_validations[(reference, face, source_hash)] = {
            "exactListedFilename": filename, "sourceBytes": source_bytes,
            **observed_size, "sizeMatches": True,
            "knownSHA256Matches": True if observation.get("sha256") else None,
        }
        existing = next((entry for entry in previous if entry.get("collection") == collection and entry["reference"] == reference and
                         entry["face"] == face and entry["sourceFilename"] == filename), None)
        if existing and source_hash != existing["sourceSHA256"]:
            raise ValueError(f"Previously verified source bytes changed for {filename}; review the source before replacement")
        if (existing and existing.get("identityVerified") is True and
            existing.get("readyForIntegration") is True and existing.get("sourceICCsha256") and
            existing.get("collection") == collection and existing.get("reference") == reference and
            existing.get("colorId") == verified["colorId"] and
            existing.get("color") == verified["color"] and
            existing.get("format") == verified["sourceFormat"] and
            existing.get("formatCm") == physical and existing.get("renderDimensionsCm") == rendered and
            existing.get("finish") == verified["finish"] and
            existing.get("rotateClockwise") == args.rotate_cw and
            existing.get("recipe", {}).get("pipelineVersion") == PIPELINE_VERSION and
            existing.get("reuseAuthorization") == ("confirmed-by-user" if args.reuse_authorized else "pending") and
            source_hash == existing["sourceSHA256"] and
            isinstance(existing.get("variants"), dict) and set(existing["variants"]) == {"fluid", "balanced", "max"} and
            all((Path(args.output) / variant["file"]).is_file() and
                digest(Path(args.output) / variant["file"]) == variant["sha256"]
                for variant in existing["variants"].values())):
            results.append({"reference": reference, "face": face, "status": "verified-existing"})
            print(json.dumps(results[-1]), flush=True)
            continue
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
    if inventory_path.exists():
        inventory = json.loads(inventory_path.read_text())
        for entry in inventory["entries"]:
            validation = portal_validations.get((entry["reference"], entry["face"], entry["sourceSHA256"]))
            if validation:
                entry["portalIdentityValidation"] = validation
        inventory["qualityPolicy"] = {
            "highTier": "native-source-definition-capped-at-4096",
            "upscalingAllowed": False,
            "note": "The max tier keeps native source detail up to 4096 pixels; lower-definition sources are never enlarged.",
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
    parser.add_argument("--collection", default="creta", help="Collection slug; its reviewed mapping is required")
    parser.add_argument("--output", required=True, help="Image directory outside Git checkout")
    parser.add_argument("--mapping", default=str(REPO / "reports/elios-hd/reference-mapping.json"))
    parser.add_argument("--mapping-key", help="Reviewed table key, default <collection>Verified")
    parser.add_argument("--portal-collection", help="Explicit portal top-level alias, e.g. Magnus for Mysterium")
    parser.add_argument("--portal-files", default=str(REPO.parent / "elios-portal-files.json"),
                        help="Private portal size observations required for every collection; never committed")
    parser.add_argument("--inventory", help="Defaults to inventory.json for Creta or <collection>-inventory.json")
    parser.add_argument("--rotate-cw", type=int, choices=[0, 90, 180, 270], default=0)
    parser.add_argument("--reuse-authorized", action="store_true")
    args = parser.parse_args()
    if not args.inventory:
        args.inventory = str(REPO / "reports/elios-hd" / ("inventory.json" if args.collection == "creta" else args.collection + "-inventory.json"))
    ingest(args)


if __name__ == "__main__":
    main()

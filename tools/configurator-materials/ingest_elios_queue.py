"""Process one snapshot of a private local download queue, without networking.

Queue: [{"filename":"03V6A00@1.jpg", "path":"/local/original"}], or
{"files":[...]}. No original is removed. Re-running verifies immutable bytes.
"""
import argparse
import json
import re
from pathlib import Path
from types import SimpleNamespace

from prepare_elios_hd import REPO, PIPELINE_VERSION, digest, prepare


def ingest(args):
    queue = json.loads(Path(args.queue).read_text())
    items = queue if isinstance(queue, list) else queue.get("files", queue.get("downloads"))
    if not isinstance(items, list):
        raise ValueError("Queue must be an array or contain a files array")
    mapping = json.loads(Path(args.mapping).read_text())["cretaVerified"]
    inventory_path = Path(args.inventory)
    previous = json.loads(inventory_path.read_text()).get("entries", []) if inventory_path.exists() else []
    results = []
    for item in items:
        filename = item.get("filename") or item.get("name")
        raw_path = item.get("path") or item.get("localPath")
        if not isinstance(filename, str) or not isinstance(raw_path, str):
            raise ValueError("Queue item requires filename and path")
        match = re.fullmatch(r"(03V6A\d{2})@(\d+)\.jpg", filename, re.IGNORECASE)
        if not match:
            raise ValueError("Queue contains an unreviewed source filename")
        reference, face = match.group(1).upper(), int(match.group(2))
        verified = mapping.get(reference)
        if not verified or not verified.get("nativeTextureAssignmentAllowed"):
            raise ValueError(f"No verified reference mapping for {reference}")
        if filename not in verified.get("portalFaces", []):
            raise ValueError(f"Face not present in reviewed portal listing: {reference}/{face}")
        path = Path(raw_path)
        if not path.exists() and raw_path.startswith("/home/oai/share/"):
            path = Path("/workspace/scratch/") / raw_path.removeprefix("/home/oai/share/")
        if not path.is_file():
            results.append({"reference": reference, "face": face, "status": "original-not-local"})
            continue
        existing = next((entry for entry in previous if entry["reference"] == reference and
                         entry["face"] == face and entry["sourceFilename"] == filename), None)
        if (existing and existing.get("identityVerified") and
            existing.get("colorId") == verified["colorId"] and
            existing.get("rotateClockwise") == args.rotate_cw and
            existing.get("recipe", {}).get("pipelineVersion") == PIPELINE_VERSION and
            existing.get("reuseAuthorization") == ("confirmed-by-user" if args.reuse_authorized else "pending") and
            digest(path) == existing["sourceSHA256"] and
            all((Path(args.output) / variant["file"]).is_file() and
                digest(Path(args.output) / variant["file"]) == variant["sha256"]
                for variant in existing["variants"].values())):
            results.append({"reference": reference, "face": face, "status": "verified-existing"})
            print(json.dumps(results[-1]), flush=True)
            continue
        dims = verified["sourceFormatCm"]
        result = prepare(SimpleNamespace(
            source_file=str(path), source_name=filename, collection="creta",
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
    print(json.dumps(summary, ensure_ascii=False))
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--queue", required=True, help="Private local JSON, never committed")
    parser.add_argument("--output", required=True, help="Image directory outside Git checkout")
    parser.add_argument("--mapping", default=str(REPO / "reports/elios-hd/reference-mapping.json"))
    parser.add_argument("--inventory", default=str(REPO / "reports/elios-hd/inventory.json"))
    parser.add_argument("--rotate-cw", type=int, choices=[0, 90, 180, 270], default=0)
    parser.add_argument("--reuse-authorized", action="store_true")
    ingest(parser.parse_args())


if __name__ == "__main__":
    main()

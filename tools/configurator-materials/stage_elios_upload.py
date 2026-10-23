"""Stage verified texture variants for one flat Firebase console upload.

This local-only tool never uploads, constructs URLs, changes the catalogue or
deletes originals. The image directory and private manifest stay outside Git.
By default it validates and reports the plan; --write creates the files.
"""
import argparse
import json
import shutil
from pathlib import Path

from prepare_elios_hd import REPO, atomic_json, digest, outside_repo, slug

PROFILES = {"fluid", "balanced", "max"}


def stage(args):
    source_root = outside_repo(Path(args.source_root), "Variant source directory")
    destination = outside_repo(Path(args.destination), "Upload staging directory")
    manifest_path = outside_repo(Path(args.manifest), "Private upload manifest")
    inventory = json.loads(Path(args.inventory).read_text())
    collection = slug(args.collection, "collection", "unassigned")
    entries = [row for row in inventory["entries"] if row["collection"] == collection]
    if not entries:
        raise ValueError("Inventory has no faces for the selected collection")
    assets, identities, filenames = [], set(), set()
    for entry in sorted(entries, key=lambda row: (row["reference"], row["face"])):
        identity = (entry["reference"], entry["face"])
        if identity in identities:
            raise ValueError("Inventory repeats a reference and face")
        identities.add(identity)
        if (not entry.get("identityVerified") or not entry.get("readyForIntegration") or
            entry.get("reuseAuthorization") != "confirmed-by-user" or
            not entry.get("sourceICCsha256") or entry.get("upscaled") is not False or
            set(entry["variants"]) != PROFILES):
            raise ValueError("An inventory face has not passed identity, rights, colour or quality checks")
        for tier in ["fluid", "balanced", "max"]:
            variant = entry["variants"][tier]
            relative = Path(variant["file"])
            source = (source_root / relative).resolve()
            if source_root not in source.parents or not source.is_file():
                raise ValueError("Variant is missing or escapes its source directory")
            if source.stat().st_size != variant["bytes"] or digest(source) != variant["sha256"]:
                raise ValueError("Variant bytes differ from the verified inventory")
            parts = [collection, entry["reference"], entry["colorId"], entry["format"],
                     f"face-{entry['face']:03d}", variant["sha256"][:12], tier]
            filename = "-".join(str(part) for part in parts) + ".webp"
            if Path(filename).name != filename or not all(str(part) for part in parts):
                raise ValueError("Inventory contains an unsafe upload filename")
            if filename in filenames:
                raise ValueError("Two variants map to the same upload filename")
            filenames.add(filename)
            target = destination / filename
            if target.exists() and (not target.is_file() or
                                    target.stat().st_size != variant["bytes"] or
                                    digest(target) != variant["sha256"]):
                raise ValueError("Refusing to replace a different staged asset")
            assets.append({"file": filename, "localPath": str(target), "variantFile": relative.as_posix(),
                           "reference": entry["reference"], "face": entry["face"], "tier": tier,
                           "width": variant["width"], "height": variant["height"],
                           "bytes": variant["bytes"], "sha256": variant["sha256"]})
    # All input and collision checks precede the first filesystem mutation.
    if args.write:
        destination.mkdir(parents=True, exist_ok=True)
        for asset in assets:
            target = Path(asset["localPath"])
            if not target.exists():
                shutil.copyfile(source_root / asset["variantFile"], target)
            if digest(target) != asset["sha256"]:
                raise ValueError("Staged asset failed its final checksum")
        atomic_json(manifest_path, {"schemaVersion": 1, "collection": collection,
                                   "assetCount": len(assets), "faceCount": len(entries),
                                   "totalBytes": sum(row["bytes"] for row in assets), "assets": assets})
    return {"collection": collection, "faces": len(entries), "assets": len(assets),
            "bytes": sum(row["bytes"] for row in assets), "written": bool(args.write),
            "uploaded": 0, "originalsDeleted": 0}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inventory", required=True)
    parser.add_argument("--collection", required=True)
    parser.add_argument("--source-root", required=True)
    parser.add_argument("--destination", required=True)
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--write", action="store_true")
    print(json.dumps(stage(parser.parse_args())))


if __name__ == "__main__":
    main()

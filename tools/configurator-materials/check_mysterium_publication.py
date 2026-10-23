"""Verify observed Mysterium public media URLs and write an inactive manifest.

The media input is the exact [{"file": "flat-upload-name.webp", "url": "..."}]
snapshot read from Firebase UI. This tool never constructs or rewrites URLs,
uploads files, activates textures, or reads account authentication data.
"""
import argparse
import concurrent.futures
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote, urlsplit

from check_elios_publication import ORIGINS, verify
from prepare_elios_hd import REPO, atomic_json

REMOTE_PREFIX = "/v0/b/le-roy-factory.firebasestorage.app/o/public-site-assets/configurator-materials/elios-hd-20261023/mysterium/"
PROFILES = {"fluid", "balanced", "max"}


def read_inputs(args):
    media = json.loads(Path(args.media).read_text())
    inventory = json.loads(Path(args.inventory).read_text())
    preparation = json.loads(Path(args.upload_manifest).read_text())
    mapping = {ref: row for ref, row in json.loads(Path(args.mapping).read_text())["mysteriumVerified"].items()
               if row.get("kind") == "base" and row.get("nativeTextureAssignmentAllowed") is True}
    if not isinstance(media, list) or len(media) != 72:
        raise ValueError("Exactly 72 observed public media records are required")
    expected_faces = {(ref, filename) for ref, row in mapping.items() for filename in row["portalFaces"]}
    entries = inventory["entries"]
    actual_faces = {(entry["reference"], entry["sourceFilename"]) for entry in entries}
    if len(entries) != 24 or len(actual_faces) != 24 or actual_faces != expected_faces:
        raise ValueError("Inventory does not contain exactly the 24 reviewed available Mysterium faces")
    lookup = {}
    for entry in entries:
        if (entry["collection"] != "mysterium" or not entry["identityVerified"] or
            not entry["readyForIntegration"] or not entry["sourceICCsha256"] or
            entry["reuseAuthorization"] != "confirmed-by-user" or
            entry["rotateClockwise"] != 90 or entry["upscaled"] or
            set(entry["variants"]) != PROFILES):
            raise ValueError("Mysterium inventory face has not passed identity, rights, colour or orientation checks")
        for profile, variant in entry["variants"].items():
            lookup[(entry["reference"], entry["face"], profile)] = (entry, variant)
    if preparation.get("assetCount") != 72 or len(preparation["assets"]) != 72:
        raise ValueError("Flat upload preparation is incomplete")
    prepared, prepared_keys = {}, set()
    for asset in preparation["assets"]:
        key = (asset["reference"], asset["face"], asset["tier"])
        if key not in lookup or asset["file"] in prepared or key in prepared_keys:
            raise ValueError("Flat preparation contains an unexpected or duplicate asset")
        _, variant = lookup[key]
        if (asset["sha256"] != variant["sha256"] or asset["bytes"] != variant["bytes"] or
            asset["variantFile"] != variant["file"]):
            raise ValueError("Flat preparation bytes do not match the sanitized inventory")
        prepared[asset["file"]] = (key, variant)
        prepared_keys.add(key)
    if prepared_keys != set(lookup):
        raise ValueError("Flat preparation does not cover each inventory variant exactly once")
    unique = {}
    for observed in media:
        filename, url = observed["file"], observed["url"]
        if filename not in prepared or filename in unique or not isinstance(url, str):
            raise ValueError("Observed media has an unexpected or duplicate upload filename")
        parts = urlsplit(url)
        if (parts.scheme != "https" or parts.username or parts.password or
            parts.hostname != "firebasestorage.googleapis.com" or
            not parts.path.startswith("/v0/b/le-roy-factory.firebasestorage.app/o/") or
            unquote(parts.path) != REMOTE_PREFIX + filename or parts.fragment):
            raise ValueError("Observed media URL does not identify its exact reviewed public upload path")
        unique[filename] = {"url": url}
    if set(unique) != set(prepared):
        raise ValueError("Observed media does not cover every prepared upload")
    return entries, mapping, lookup, prepared, unique


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--media", required=True, help="Private exact public-URL snapshot read from Firebase UI")
    parser.add_argument("--inventory", default=str(REPO / "reports/elios-hd/mysterium-inventory.json"))
    parser.add_argument("--upload-manifest", default=str(REPO.parent / "elios-mysterium-upload-manifest.json"))
    parser.add_argument("--mapping", default=str(REPO / "reports/elios-hd/mysterium-reference-mapping.json"))
    parser.add_argument("--report", default=str(REPO / "reports/elios-hd/mysterium-publication-checks.json"))
    parser.add_argument("--manifest", default=str(REPO / "reports/elios-hd/mysterium-published-assets.json"))
    parser.add_argument("--workers", type=int, choices=range(1, 17), default=12)
    parser.add_argument("--validate-only", action="store_true", help="Validate inputs without networking or writing reports")
    args = parser.parse_args()
    entries, mapping, lookup, prepared, unique = read_inputs(args)
    if args.validate_only:
        print(json.dumps({"inputValid": True, "faces": 24, "variants": 72, "plannedChecks": 216}))
        return
    futures, results = {}, {filename: [] for filename in unique}
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
        for filename, asset in unique.items():
            _, variant = prepared[filename]
            for origin in ORIGINS:
                futures[executor.submit(verify, asset, origin, variant)] = filename
        for future in concurrent.futures.as_completed(futures):
            results[futures[future]].append(future.result())
    assets = []
    for filename in sorted(results):
        key, variant = prepared[filename]
        checks = sorted(results[filename], key=lambda result: result["origin"])
        assets.append({"reference": key[0], "face": key[1], "profile": key[2],
                       "filename": Path(variant["file"]).name,
                       "publishedFilename": Path(unquote(urlsplit(unique[filename]["url"]).path)).name,
                       "urlSHA256": hashlib.sha256(unique[filename]["url"].encode()).hexdigest(),
                       "expectedBytes": variant["bytes"], "expectedSHA256": variant["sha256"],
                       "origins": checks, "passed": len(checks) == 3 and all(check["passed"] for check in checks)})
    report = {"checkedAt": datetime.now(timezone.utc).isoformat(), "collection": "Mysterium",
              "source": "Exact public media URLs observed in Firebase console DOM; no account authentication data",
              "mutations": 0, "publicURLsRewritten": False,
              "inventoryVariants": 72, "publishedVariantsChecked": len(unique),
              "allInventoryVariantsAvailable": len(unique) == 72, "origins": ORIGINS,
              "checks": sum(len(asset["origins"]) for asset in assets),
              "passedChecks": sum(check["passed"] for asset in assets for check in asset["origins"]),
              "assets": assets,
              "allPassed": len(assets) == 72 and all(asset["passed"] for asset in assets),
              "doesNotProve": ["Application integration or deployment", "Rendering on a physical smartphone",
                                "Complete coverage of decorative references or all commercial formats"]}
    atomic_json(Path(args.report), report)
    urls_by_key = {prepared[filename][0]: asset["url"] for filename, asset in unique.items()}
    faces = []
    for entry in sorted(entries, key=lambda row: (row["reference"], row["face"])):
        faces.append({"reference": entry["reference"], "colorId": entry["colorId"], "color": entry["color"],
                      "format": entry["format"], "sourceFormatCm": entry["formatCm"],
                      "renderDimensionsCm": entry["renderDimensionsCm"], "face": entry["face"],
                      "sourceFilename": entry["sourceFilename"], "sourceSHA256": entry["sourceSHA256"],
                      "rotateClockwise": 90, "textureRotation": 0, "publishedAllThreeProfiles": True,
                      "variants": {profile: [urls_by_key[(entry["reference"], entry["face"], profile)]]
                                   for profile in ["fluid", "balanced", "max"]},
                      "reuseAuthorization": "confirmed-by-user", "enabled": False})
    manifest = {"schemaVersion": 1, "manufacturer": "ELIOS", "collection": "Mysterium", "enabled": False,
                "allowedSourceFormats": sorted({entry["format"] for entry in entries}), "textureRotation": 0,
                "expectedBaseColors": len({entry["colorId"] for entry in entries}),
                "expectedBaseReferences": len(mapping), "expectedBaseFaces": 24, "publishedCompleteFaces": 24,
                "collectionComplete": False,
                "completenessScope": "All 24 available portal slab faces for the six verified polished rectified 6.5mm 120x278 references; smaller commercial formats excluded",
                "availableFaceCountProvenance": "24 exact filenames observed in the professional portal texture listing",
                "baseTextureInventoryComplete": report["allPassed"],
                "excludedCommercialFormats": ["60x120"],
                "independentFormatScope": "The 60x120 SKU keeps its existing independent source and is never assigned a slab face",
                "publicMediaChecksPassed": report["allPassed"], "reuseAuthorization": "confirmed-by-user",
                "qualityPolicy": {"maxTier": "native-source-definition-capped-at-4096",
                                  "nativeMaxSides": sorted({max(entry["nativeDimensions"]) for entry in entries}),
                                  "upscaled": False},
                "activationBlockedBy": ([] if report["allPassed"] else ["Public media verification failed"]) +
                                       ["Format-specific application integration and caches not verified"],
                "faces": faces,
                "urlPolicy": "Exact public media URLs observed in Firebase DOM; do not rewrite tokens or paths"}
    atomic_json(Path(args.manifest), manifest)
    print(json.dumps({key: report[key] for key in ["publishedVariantsChecked", "inventoryVariants", "checks",
                                                  "passedChecks", "allPassed", "allInventoryVariantsAvailable"]}))
    if not report["allPassed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()

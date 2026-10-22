"""Read-only verification of the exact public media URLs observed in Firebase UI.

The input contains public texture download URLs, never Google login tokens.
Do not discover, rewrite, construct or log download tokens. Each asset is GET
downloaded with each configured viewer Origin and hashed without storing a copy.
"""
import argparse
import concurrent.futures
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

from prepare_elios_hd import REPO, atomic_json

ORIGINS = ["https://leroyfactory.fr", "https://studio-one-beta-test-v2.vercel.app",
           "https://randal-catalogue-general-3d.vercel.app"]


def verify(asset, origin, expected):
    url = asset["url"]
    parts = urlsplit(url)
    if (parts.scheme != "https" or parts.hostname != "firebasestorage.googleapis.com" or
        not parts.path.startswith("/v0/b/le-roy-factory.firebasestorage.app/o/")):
        raise ValueError("Publication URL is outside the reviewed public Firebase image bucket")
    result = {"origin": origin}
    try:
        request = Request(url, headers={"Origin": origin})
        with urlopen(request, timeout=40) as response:
            checksum, count = hashlib.sha256(), 0
            for block in iter(lambda: response.read(1024 * 1024), b""):
                checksum.update(block)
                count += len(block)
            allow_origin = response.headers.get("Access-Control-Allow-Origin")
            result.update({"httpStatus": response.status,
                           "contentType": response.headers.get_content_type(),
                           "corsAllowOrigin": allow_origin,
                           "corsReadable": allow_origin in {"*", origin},
                           "bytes": count, "sha256": checksum.hexdigest(),
                           "bytesMatch": count == expected["bytes"],
                           "sha256Match": checksum.hexdigest() == expected["sha256"]})
            result["passed"] = (response.status == 200 and result["contentType"] == "image/webp" and
                                result["corsReadable"] and result["bytesMatch"] and result["sha256Match"])
    except Exception as error:
        # Exception text can contain request URLs. Keep only classification/status.
        result.update({"passed": False, "errorType": type(error).__name__,
                       "httpStatus": getattr(error, "code", None)})
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--media", required=True, help="Private local snapshot of DOM-observed public URLs")
    parser.add_argument("--inventory", default=str(REPO / "reports/elios-hd/inventory.json"))
    parser.add_argument("--report", default=str(REPO / "reports/elios-hd/publication-checks.json"))
    parser.add_argument("--manifest", default=str(REPO / "reports/elios-hd/published-assets.json"))
    parser.add_argument("--mapping", default=str(REPO / "reports/elios-hd/reference-mapping.json"))
    args = parser.parse_args()
    media = json.loads(Path(args.media).read_text())
    if not isinstance(media, list):
        raise ValueError("Media snapshot must be an array")
    inventory = json.loads(Path(args.inventory).read_text())
    lookup = {(entry["reference"], profile, Path(variant["file"]).name): variant
              for entry in inventory["entries"] for profile, variant in entry["variants"].items()}
    unique = {}
    for asset in media:
        key = (asset["reference"], asset["profile"], asset["filename"])
        if key not in lookup:
            raise ValueError("Media snapshot includes an asset absent from the prepared inventory")
        if key in unique and unique[key]["url"] != asset["url"]:
            raise ValueError("Conflicting URLs for the same inventory variant")
        unique[key] = asset
    futures = {}
    results = {key: [] for key in unique}
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        for key, asset in unique.items():
            for origin in ORIGINS:
                futures[executor.submit(verify, asset, origin, lookup[key])] = key
        for future in concurrent.futures.as_completed(futures):
            results[futures[future]].append(future.result())
    assets = [{"reference": key[0], "profile": key[1], "filename": key[2],
               "urlSHA256": hashlib.sha256(unique[key]["url"].encode()).hexdigest(),
               "expectedBytes": lookup[key]["bytes"], "expectedSHA256": lookup[key]["sha256"],
               "origins": sorted(result, key=lambda x: x["origin"]),
               "passed": len(result) == len(ORIGINS) and all(x["passed"] for x in result)}
              for key, result in sorted(results.items())]
    report = {"checkedAt": datetime.now(timezone.utc).isoformat(),
              "source": "Exact public media URLs observed in Firebase console DOM; no account authentication data",
              "mutations": 0, "publicURLsRewritten": False,
              "inventoryVariants": len(lookup), "publishedVariantsChecked": len(unique),
              "allInventoryVariantsAvailable": len(unique) == len(lookup),
              "origins": ORIGINS, "checks": len(ORIGINS) * len(unique),
              "passedChecks": sum(check["passed"] for asset in assets for check in asset["origins"]),
              "assets": assets,
              "allPassed": bool(assets) and all(asset["passed"] for asset in assets),
              "doesNotProve": ["Manufacturer reuse authorization", "Collection completeness",
                                "Application integration or deployment", "Rendering on a physical smartphone"]}
    atomic_json(Path(args.report), report)
    # Keep the exact public image URLs in their own inactive reference/format
    # manifest. Generic colour-level textureVariants would affect square tiles.
    verified = json.loads(Path(args.mapping).read_text())["cretaVerified"]
    bases = {ref: item for ref, item in verified.items() if item.get("kind") == "base"}
    face_records = []
    for entry in inventory["entries"]:
        matching = {profile: unique.get((entry["reference"], profile, Path(variant["file"]).name))
                    for profile, variant in entry["variants"].items()}
        if not any(matching.values()):
            continue
        complete = all(matching.values())
        face_records.append({"reference": entry["reference"], "colorId": entry["colorId"],
                             "color": entry["color"], "format": entry["format"],
                             "sourceFormatCm": entry["formatCm"],
                             "renderDimensionsCm": entry.get("renderDimensionsCm"),
                             "face": entry["face"], "sourceFilename": entry["sourceFilename"],
                             "sourceSHA256": entry["sourceSHA256"],
                             "rotateClockwise": entry["rotateClockwise"], "textureRotation": 0,
                             "publishedAllThreeProfiles": complete,
                             "variants": {profile: [asset["url"]] for profile, asset in matching.items() if asset},
                             "reuseAuthorization": entry["reuseAuthorization"], "enabled": False})
    published_face_ids = {(face["reference"], face["sourceFilename"])
                          for face in face_records if face["publishedAllThreeProfiles"]}
    expected_face_ids = {(ref, name) for ref, item in bases.items() for name in item["portalFaces"]}
    complete_faces, expected_faces = len(published_face_ids), len(expected_face_ids)
    reuse_confirmed = bool(face_records) and all(face["reuseAuthorization"] == "confirmed-by-user" for face in face_records)
    manifest = {"schemaVersion": 1, "manufacturer": "ELIOS", "collection": "Creta",
                "enabled": False, "allowedSourceFormat": "60x120", "textureRotation": 0,
                "expectedBaseColors": len(bases), "expectedBaseFaces": expected_faces,
                "publishedCompleteFaces": complete_faces,
                "collectionComplete": expected_face_ids.issubset(published_face_ids) and report["allPassed"],
                "publicMediaChecksPassed": report["allPassed"],
                "reuseAuthorization": "confirmed-by-user" if reuse_confirmed else "pending",
                "activationBlockedBy": ([] if reuse_confirmed else ["Manufacturer reuse authorization pending"]) +
                                       ["Collection not fully downloaded and verified",
                                        "Format-specific application integration and caches not verified"],
                "faces": face_records,
                "urlPolicy": "Exact public media URLs observed in Firebase DOM; do not rewrite tokens or paths"}
    atomic_json(Path(args.manifest), manifest)
    print(json.dumps({key: report[key] for key in ["publishedVariantsChecked", "inventoryVariants",
                                                  "checks", "passedChecks", "allPassed", "allInventoryVariantsAvailable"]}))


if __name__ == "__main__":
    main()

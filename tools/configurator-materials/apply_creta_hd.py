"""Apply publicly verified Creta base faces to exact native R9 references.

Dry-run is the default. This tool does not log in, upload, invent URLs, alter
colour-level previews, or enable other Elios collections. --write updates both
manufacturer manifests and rebuilds the exact-SKU LRF catalogue transactionally.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
from urllib.parse import unquote, urlsplit

REPO = Path(__file__).resolve().parents[2]
TIERS = ("fluid", "balanced", "max")
ORIGINS = {"https://leroyfactory.fr", "https://studio-one-beta-test-v2.vercel.app",
           "https://randal-catalogue-general-3d.vercel.app"}
REFERENCES = {
    "03V6A00": ("zucchero", "60x120"), "03V6A10": ("avena", "60x120"),
    "03V6A20": ("malto", "60x120"), "03V6A30": ("biscotto", "60x120"),
    "03V6A50": ("ginepro", "60x120"), "03V6A60": ("matcha", "60x120"),
    "03V6A80": ("caramello", "60x120"), "03V6A90": ("pepe", "60x120"),
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def dimensions_equal(actual, expected):
    return (isinstance(actual, list) and len(actual) == 2 and
            all(isinstance(v, (int, float)) for v in actual) and
            all(abs(a - b) < 1e-6 for a, b in zip(actual, expected)))


def public_filename(url):
    require(isinstance(url, str), "Missing public image URL")
    parsed = urlsplit(url)
    require(parsed.scheme == "https" and not parsed.username and not parsed.password and
            parsed.hostname == "firebasestorage.googleapis.com" and
            parsed.path.startswith("/v0/b/le-roy-factory.firebasestorage.app/o/"),
            "Image URL is outside the reviewed public Firebase bucket")
    key = unquote(parsed.path.split("/o/", 1)[1])
    require(key.startswith("public-site-assets/configurator-materials/") and key.endswith(".webp"),
            "Image URL is outside the configurator WebP prefix")
    return Path(key).name


def validate_publication(mapping, inventory, publication, checks):
    verified = {reference: item for reference, item in mapping.get("cretaVerified", {}).items()
                if item.get("nativeTextureAssignmentAllowed") is True}
    require(set(verified) == set(REFERENCES), "Creta must contain exactly eight reviewed references")
    expected = set()
    for reference, (color, fmt) in REFERENCES.items():
        item = verified[reference]
        require(item.get("collection") == "Creta" and item.get("reference") == reference and
                item.get("colorId") == color and item.get("sourceFormat") == fmt and
                item.get("nativeTextureAssignmentAllowed") is True and item.get("kind") == "base",
                "Reviewed reference/colour/format mismatch: " + reference)
        for name in item.get("portalFaces", []):
            require(re.fullmatch(re.escape(reference) + r"@[1-9][0-9]*\.jpg", name),
                    "Invalid reviewed portal filename")
            expected.add((reference, name))
    require(len(expected) == 53, "Expected exactly the 53 available portal faces")

    entries = inventory.get("entries", [])
    local = {(entry.get("reference"), entry.get("sourceFilename")): entry for entry in entries}
    require(len(entries) == 53 and len(local) == 53 and set(local) == expected,
            "Native inventory is incomplete, duplicated or out of scope")
    for (reference, _), entry in local.items():
        color, fmt = REFERENCES[reference]
        require(entry.get("brand") == "ELIOS" and str(entry.get("collection", "")).casefold() == "creta" and
                entry.get("colorId") == color and entry.get("format") == fmt and
                entry.get("identityVerified") is True and entry.get("readyForIntegration") is True and
                entry.get("reuseAuthorization") == "confirmed-by-user" and
                entry.get("upscaled") is False and entry.get("mirror") is False and
                entry.get("crop") is None and entry.get("rotateClockwise") == 90 and
                entry.get("textureRotation") == 0,
                "Native face identity, rights or orientation is not verified: " + reference)
        number = int(entry["sourceFilename"].split("@", 1)[1].split(".", 1)[0])
        require(type(entry.get("face")) is int and entry["face"] == number and
                re.fullmatch(r"[0-9a-f]{64}", entry.get("sourceSHA256", "")),
                "Native face number/checksum is invalid: " + reference)
        native = entry.get("nativeDimensions", [])
        require(isinstance(native, list) and len(native) == 2 and
                all(isinstance(size, int) and size > 0 for size in native),
                "Native image dimensions are missing")
        native_render_ratio = native[1] / native[0]
        require(abs(native_render_ratio - 2) <= .04,
                "Creta source does not represent a whole portrait 60x120 face")
        for profile, limit in {"fluid": 256, "balanced": 1024, "max": 4096}.items():
            variant = entry.get("variants", {}).get(profile, {})
            require(type(variant.get("bytes")) is int and variant["bytes"] > 0 and
                    re.fullmatch(r"[0-9a-f]{64}", variant.get("sha256", "")) and
                    type(variant.get("width")) is int and type(variant.get("height")) is int and
                    0 < variant["width"] <= min(limit, native[1]) and
                    0 < variant["height"] <= min(limit, native[0]),
                    "Native variant is incomplete or upscaled: " + reference + " / " + profile)
            require(abs(variant["width"] / variant["height"] - native_render_ratio) <=
                    max(.02, native_render_ratio / variant["height"]),
                    "Native face aspect ratio was changed: " + reference + " / " + profile)
    require(len({entry["sourceSHA256"] for entry in local.values()}) == 53,
            "Native source faces must not be duplicated to complete the inventory")

    require(publication.get("manufacturer") == "ELIOS" and publication.get("collection") == "Creta" and
            publication.get("enabled") is False and publication.get("baseTextureInventoryComplete") is True and
            publication.get("publicMediaChecksPassed") is True and
            publication.get("reuseAuthorization") == "confirmed-by-user" and
            publication.get("expectedBaseColors") == 8 and
            publication.get("expectedBaseReferences") == 8 and
            publication.get("expectedBaseFaces") == 53 and publication.get("publishedCompleteFaces") == 53,
            "Publication must be complete, reviewed and inactive before application")
    require(checks.get("allPassed") is True and checks.get("publicURLsRewritten") is False and
            checks.get("publishedVariantsChecked") == 159,
            "Public URL checks are incomplete or failed")
    checked = {(asset.get("reference"), asset.get("face"), asset.get("profile")): asset
               for asset in checks.get("assets", [])}
    require(len(checked) == 159 and len(checks.get("assets", [])) == 159,
            "Expected exactly 159 distinct verified public variants")

    faces = publication.get("faces", [])
    published = {(face.get("reference"), face.get("sourceFilename")): face for face in faces}
    require(len(faces) == 53 and len(published) == 53 and set(published) == expected,
            "Published faces do not exactly match the reviewed portal inventory")
    references = {reference: [] for reference in REFERENCES}
    all_urls = set()
    for identity, face in published.items():
        reference, filename = identity
        entry, definition = local[identity], verified[reference]
        physical = definition["sourceFormatCm"]
        expected_source = [physical["width"], physical["height"]]
        expected_render = list(reversed(expected_source))
        require(face.get("colorId") == entry["colorId"] and face.get("format") == entry["format"] and
                face.get("face") == entry["face"] and face.get("sourceSHA256") == entry["sourceSHA256"] and
                face.get("enabled") is False and face.get("publishedAllThreeProfiles") is True and
                face.get("reuseAuthorization") == "confirmed-by-user" and
                face.get("rotateClockwise") == 90 and face.get("textureRotation") == 0 and
                dimensions_equal(face.get("sourceFormatCm"), expected_source) and
                dimensions_equal(face.get("renderDimensionsCm"), expected_render),
                "Published native face metadata mismatch: " + reference + " / " + filename)
        for profile in TIERS:
            urls = face.get("variants", {}).get(profile)
            require(isinstance(urls, list) and len(urls) == 1, "One exact public URL is required per face/profile")
            url = urls[0]
            published_name = public_filename(url)
            require(url not in all_urls, "A public texture URL is duplicated across faces/profiles")
            all_urls.add(url)
            asset = checked.get((reference, face["face"], profile), {})
            variant = entry.get("variants", {}).get(profile, {})
            require(asset.get("passed") is True and
                    asset.get("urlSHA256") == hashlib.sha256(url.encode()).hexdigest() and
                    asset.get("expectedSHA256") == variant.get("sha256") and
                    asset.get("expectedBytes") == variant.get("bytes") and
                    asset.get("filename") == Path(variant.get("file", "")).name and
                    asset.get("publishedFilename") == published_name,
                    "Public URL does not match its verified native variant: " + reference + " / " + profile)
            origins = asset.get("origins", [])
            require(len(origins) == 3 and {origin.get("origin") for origin in origins} == ORIGINS,
                    "All three configurator origins must be checked")
            require(all(origin.get("passed") is True and origin.get("httpStatus") == 200 and
                        origin.get("contentType") == "image/webp" and origin.get("corsReadable") is True and
                        origin.get("sha256") == variant.get("sha256") and origin.get("bytes") == variant.get("bytes")
                        for origin in origins), "HTTP/CORS/body verification failed")
        references[reference].append(face)

    descriptors = {}
    for reference, records in references.items():
        records.sort(key=lambda item: item["face"])
        color, fmt = REFERENCES[reference]
        descriptors[reference] = {"verified": True, "reference": reference, "colorId": color,
                                  "format": fmt, "textureRotation": 0,
                                  "nativeFaceCount": len(records),
                                  "textureVariants": {profile: [face["variants"][profile][0] for face in records]
                                                      for profile in TIERS}}
    return descriptors


def apply_to_manifest(source, descriptors):
    result = copy.deepcopy(source)
    collections = [item for item in result if item.get("name") == "Creta" and item.get("brand") == "ELIOS"]
    require(len(collections) == 1, "The target must contain exactly one ELIOS Creta collection")
    collection = collections[0]
    formats = {item["id"] for item in collection.get("formats", [])}
    colors = {item["id"]: item for item in collection.get("colors", [])}
    require(len(colors) == len(collection.get("colors", [])), "Duplicate colour identifiers in the target")
    for reference, descriptor in descriptors.items():
        color, fmt = REFERENCES[reference]
        require(color in colors and fmt in formats and
                (not colors[color].get("formats") or fmt in colors[color]["formats"]),
                "Native reference is incompatible with the target's colour/format")
        colors[color].setdefault("textureVariantsByReference", {})[reference] = copy.deepcopy(descriptor)
    return result


def atomic_bytes(path, content):
    path = Path(path)
    handle, temporary = tempfile.mkstemp(prefix=".elios-apply-", dir=path.parent)
    try:
        with os.fdopen(handle, "wb") as stream:
            stream.write(content)
        os.replace(temporary, path)
    finally:
        Path(temporary).unlink(missing_ok=True)


def replace_creta_bytes(original, updated):
    """Preserve every other collection's literal bytes, including number syntax."""
    text = original.decode("utf-8")
    decoder = json.JSONDecoder()
    index = text.index("[") + 1
    replacement = next(item for item in updated if item.get("brand") == "ELIOS" and item.get("name") == "Creta")
    while index < len(text):
        while index < len(text) and text[index] in " \r\n\t,":
            index += 1
        if index == len(text) or text[index] == "]":
            break
        item, end = decoder.raw_decode(text, index)
        if item.get("brand") == "ELIOS" and item.get("name") == "Creta":
            encoded = json.dumps(replacement, ensure_ascii=False, separators=(",", ":"))
            return (text[:index] + encoded + text[end:]).encode("utf-8")
        index = end
    raise ValueError("Creta JSON byte range was not found")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--publication", default=str(REPO / "reports/elios-hd/creta-published-assets.json"))
    parser.add_argument("--checks", default=str(REPO / "reports/elios-hd/creta-publication-checks.json"))
    parser.add_argument("--mapping", default=str(REPO / "reports/elios-hd/reference-mapping.json"))
    parser.add_argument("--inventory", default=str(REPO / "reports/elios-hd/inventory.json"))
    parser.add_argument("--general", default=str(REPO / "randal-general/src/manufacturer-surfaces.json"))
    parser.add_argument("--studio", required=True, help="Existing Studio worktree's src/manufacturer-surfaces.json")
    parser.add_argument("--write", action="store_true", help="Apply only after dry-run and public resource QA succeed")
    args = parser.parse_args()
    read = lambda path: json.loads(Path(path).read_text())
    descriptors = validate_publication(read(args.mapping), read(args.inventory), read(args.publication), read(args.checks))
    targets = [Path(args.general).resolve(), Path(args.studio).resolve()]
    require(targets[0] != targets[1], "General and Studio must be separate existing source manifests")
    updated = {path: apply_to_manifest(read(path), descriptors) for path in targets}
    summary = {"collection": "Creta", "colors": 8, "formats": ["60x120"],
               "references": sorted(descriptors), "nativeFaces": 53, "publicVariants": 159,
               "textureRotation": 0, "write": args.write, "otherFieldsPreserved": True}
    if args.write:
        generated = [REPO / "assets/js/lrf-plan-pose/catalogue.json", REPO / "randal-general/src/commercial-surfaces.json"]
        previous = {path: path.read_bytes() for path in targets + generated}
        try:
            for path, data in updated.items():
                atomic_bytes(path, replace_creta_bytes(previous[path], data))
            subprocess.run(["node", "scripts/build-lrf-plan-catalogue.cjs"], cwd=REPO, check=True,
                           stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            subprocess.run(["node", "qa/creta-native-selection.mjs", "--require-active"],
                           cwd=REPO / "randal-general", check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        except BaseException:
            for path, content in previous.items():
                atomic_bytes(path, content)
            raise
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()

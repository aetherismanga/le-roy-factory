"""Prepare locally downloaded Elios faces; this tool never logs in or uploads.

Originals and generated image bytes must stay outside the Git checkout. Only the
sanitized inventory belongs in reports/elios-hd. Process one original at a time,
hash it in chunks, and ask libjpeg for a reduced decode before colour conversion.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import re
import tempfile
import warnings
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageCms, ImageOps

REPO = Path(__file__).resolve().parents[2]
LIMITS = {"fluid": 256, "balanced": 1024, "max": 4096}
PIPELINE_VERSION = 1
# LittleCMS stamps newly created profiles with the wall-clock time. Normalize
# this metadata to keep identical conversions reproducible between processes.
_profile = bytearray(ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes())
_profile[24:36] = bytes.fromhex("07d000010001000000000000")
SRGB_BYTES = bytes(_profile)
SRGB = ImageCms.ImageCmsProfile(io.BytesIO(SRGB_BYTES))
SLUG = re.compile(r"^[a-z0-9][a-z0-9._-]*$")
REFERENCE = re.compile(r"^[A-Za-z0-9_-]+$")


def digest(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def outside_repo(path: Path, label: str) -> Path:
    path = path.expanduser().resolve()
    if path == REPO or REPO in path.parents:
        raise ValueError(f"{label} must be outside the Git checkout")
    return path


def slug(value: str | None, label: str, fallback: str) -> str:
    value = value or fallback
    if not SLUG.fullmatch(value) or value in {".", ".."}:
        raise ValueError(f"Invalid {label}; use a lowercase path-safe identifier")
    return value


def atomic_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    handle, temporary = tempfile.mkstemp(prefix=".elios-inventory-", dir=path.parent)
    try:
        with os.fdopen(handle, "w", encoding="utf-8") as stream:
            json.dump(value, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
        os.replace(temporary, path)
    finally:
        Path(temporary).unlink(missing_ok=True)


def srgb_image(path: Path, rotate_cw: int) -> tuple[Image.Image, dict]:
    # Raise the warning threshold only for this known manufacturer workflow.
    # Reject >200 Mpx and let reduced JPEG decoding bound the working image.
    previous_limit = Image.MAX_IMAGE_PIXELS
    try:
        Image.MAX_IMAGE_PIXELS = 100_000_000
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", Image.DecompressionBombWarning)
            source = Image.open(path)
    finally:
        Image.MAX_IMAGE_PIXELS = previous_limit
    with source:
        width, height = source.size
        if width * height > 200_000_000:
            raise ValueError("Source exceeds the reviewed 200 Mpx processing limit")
        if min(width, height) < 1:
            raise ValueError("Empty source image")
        mode, image_format = source.mode, source.format
        profile = source.info.get("icc_profile")
        orientation = source.getexif().get(274, 1)
        if image_format == "JPEG":
            scale = min(1, LIMITS["max"] / max(width, height))
            source.draft(mode, (max(1, int(width * scale)), max(1, int(height * scale))))
        decoded = list(source.size)
        if source.width * source.height > 40_000_000:
            raise ValueError("Reduced decode remains above 40 Mpx; use a tiled image decoder")
        image = ImageOps.exif_transpose(source)
        if rotate_cw:
            rotated = image.transpose({90: Image.Transpose.ROTATE_270,
                                       180: Image.Transpose.ROTATE_180,
                                       270: Image.Transpose.ROTATE_90}[rotate_cw])
            image.close()
            image = rotated
        if profile:
            converted = ImageCms.profileToProfile(
                image, ImageCms.ImageCmsProfile(io.BytesIO(profile)), SRGB,
                renderingIntent=ImageCms.Intent.RELATIVE_COLORIMETRIC,
                outputMode="RGB", flags=ImageCms.Flags.BLACKPOINTCOMPENSATION,
            )
            color_status = "embedded-icc-to-srgb"
        elif image.mode in {"RGB", "RGBA", "L", "LA", "P"}:
            converted = image.convert("RGB")
            color_status = "unprofiled-assumed-srgb-needs-review"
        else:
            raise ValueError("Non-RGB source has no ICC profile; refusing guessed colours")
        image.close()
    converted.thumbnail((LIMITS["max"], LIMITS["max"]), Image.Resampling.LANCZOS)
    return converted, {
        "nativeDimensions": [width, height], "sourceMode": mode,
        "sourceImageFormat": image_format, "decodedDimensions": decoded,
        "sourceICCsha256": hashlib.sha256(profile).hexdigest() if profile else None,
        "exifOrientation": orientation, "rotateClockwise": rotate_cw,
        "sourceOrientation": "portrait" if height > width else "landscape" if width > height else "square",
        "renderOrientation": "portrait" if converted.height > converted.width else "landscape" if converted.width > converted.height else "square",
        "colourConversion": color_status,
        "renderingIntent": "relative-colorimetric-with-black-point-compensation" if profile else None,
        "crop": None, "mirror": False, "upscaled": False,
    }


def prepare(args: argparse.Namespace) -> dict:
    source = outside_repo(Path(args.source_file), "Original source")
    output = outside_repo(Path(args.output), "Generated image output")
    source_name = args.source_name or source.name
    if Path(source_name).name != source_name or "?" in source_name:
        raise ValueError("source-name must be the original basename, without URL or query")
    if not REFERENCE.fullmatch(args.reference):
        raise ValueError("Invalid manufacturer reference")
    collection = slug(args.collection, "collection", "unassigned")
    color_id = slug(args.color_id, "color", "unassigned")
    format_id = slug(args.format_id, "format", "unassigned")
    if args.face < 1:
        raise ValueError("Face number must be positive")
    source_hash = digest(source)
    image, metadata = srgb_image(source, args.rotate_cw)
    recipe = {"pipelineVersion": PIPELINE_VERSION, "sourceSHA256": source_hash,
              "rotateClockwise": args.rotate_cw, "limits": LIMITS,
              "webpMethod": 5, "qualities": {"fluid": 90, "balanced": 90, "max": 94},
              "pillowVersion": Image.__version__, "srgbProfileSHA256": hashlib.sha256(SRGB_BYTES).hexdigest()}
    recipe_hash = hashlib.sha256(json.dumps(recipe, sort_keys=True).encode()).hexdigest()
    stem = Path(collection) / args.reference / color_id / format_id
    variants = {}
    try:
        for profile, limit in LIMITS.items():
            variant = image.copy()
            variant.thumbnail((limit, limit), Image.Resampling.LANCZOS)
            relative = stem / f"face-{args.face:03d}-{recipe_hash[:12]}-{profile}.webp"
            target = output / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            handle, temporary = tempfile.mkstemp(prefix=".elios-face-", suffix=".webp", dir=target.parent)
            os.close(handle)
            temporary = Path(temporary)
            try:
                variant.save(temporary, "WEBP", quality=94 if profile == "max" else 90,
                             method=5, icc_profile=SRGB_BYTES, exact=True)
                if target.exists():
                    if digest(target) != digest(temporary):
                        raise ValueError(f"Refusing to overwrite different variant bytes: {relative}")
                else:
                    os.replace(temporary, target)
            finally:
                temporary.unlink(missing_ok=True)
            with Image.open(target) as check:
                check.load()
                if check.size != variant.size or check.mode != "RGB":
                    raise ValueError(f"Variant decoding failed: {relative}")
                if check.info.get("icc_profile") != SRGB_BYTES:
                    raise ValueError(f"Variant is missing its sRGB profile: {relative}")
            variants[profile] = {"file": relative.as_posix(), "width": variant.width,
                                 "height": variant.height, "bytes": target.stat().st_size,
                                 "sha256": digest(target), "encoding": "webp-lossy",
                                 "quality": 94 if profile == "max" else 90,
                                 "icc": "sRGB", "maxSide": limit}
            variant.close()
    finally:
        image.close()
    identity_ready = bool(args.color_id and args.color and args.format_id and args.format_cm)
    entry = {
        "brand": "ELIOS", "collection": args.collection,
        "reference": args.reference, "colorId": args.color_id,
        "color": args.color, "format": args.format_id,
        "formatCm": args.format_cm, "finish": args.finish,
        "renderDimensionsCm": args.format_cm[::-1] if args.format_cm and args.rotate_cw in {90, 270} else args.format_cm,
        "textureRotation": 0,
        "face": args.face, "sourceFilename": source_name,
        "sourceArea": "Elios Ceramica professional phototheque / MINIMALI",
        "sourceSHA256": source_hash, "sourceBytes": source.stat().st_size,
        **metadata, "recipe": recipe, "recipeSHA256": recipe_hash, "variants": variants,
        "identityVerified": bool(args.identity_verified and identity_ready),
        "reuseAuthorization": "confirmed-by-user" if args.reuse_authorized else "pending",
        "readyForIntegration": bool(args.identity_verified and identity_ready and
                                    args.reuse_authorized and metadata["sourceICCsha256"]),
    }
    inventory_path = Path(args.inventory).resolve()
    inventory = json.loads(inventory_path.read_text()) if inventory_path.exists() else {
        "schemaVersion": 1, "manufacturer": "ELIOS Ceramica", "entries": []}
    key = (entry["sourceSHA256"], entry["collection"], entry["reference"], entry["face"])
    inventory["entries"] = [item for item in inventory["entries"] if
                            (item["sourceSHA256"], item["collection"], item["reference"], item["face"]) != key]
    inventory["entries"].append(entry)
    inventory["updatedAt"] = datetime.now(timezone.utc).isoformat()
    inventory["counts"] = {
        "originals": len({item["sourceSHA256"] for item in inventory["entries"]}),
        "collections": len({item["collection"] for item in inventory["entries"]}),
        "faces": len(inventory["entries"]),
        "readyFaces": sum(item["readyForIntegration"] for item in inventory["entries"]),
        "variants": sum(len(item["variants"]) for item in inventory["entries"]),
    }
    atomic_json(inventory_path, inventory)
    # Never print absolute original paths, URLs, authentication data or profiles.
    return {"reference": args.reference, "face": args.face,
            "nativeDimensions": metadata["nativeDimensions"],
            "decodedDimensions": metadata["decodedDimensions"],
            "readyForIntegration": entry["readyForIntegration"],
            "variants": variants, "inventoryCounts": inventory["counts"]}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-file", required=True)
    parser.add_argument("--source-name", help="Exact original filename, never a signed download URL")
    parser.add_argument("--collection", required=True, help="Verified collection slug")
    parser.add_argument("--reference", required=True, help="Exact manufacturer reference")
    parser.add_argument("--color-id")
    parser.add_argument("--color")
    parser.add_argument("--format-id")
    parser.add_argument("--format-cm", type=float, nargs=2, metavar=("WIDTH", "HEIGHT"))
    parser.add_argument("--finish")
    parser.add_argument("--face", type=int, default=1)
    parser.add_argument("--rotate-cw", type=int, choices=[0, 90, 180, 270], default=0,
                        help="Explicitly verified rotation only; there is no automatic crop or rotation")
    parser.add_argument("--identity-verified", action="store_true")
    parser.add_argument("--reuse-authorized", action="store_true")
    parser.add_argument("--output", required=True, help="Generated image directory outside the Git checkout")
    parser.add_argument("--inventory", default=str(REPO / "reports/elios-hd/inventory.json"))
    args = parser.parse_args()
    if args.format_cm and (min(args.format_cm) <= 0 or max(args.format_cm) > 1000):
        parser.error("format-cm must contain two real tile dimensions in centimetres")
    print(json.dumps(prepare(args), ensure_ascii=False))


if __name__ == "__main__":
    main()

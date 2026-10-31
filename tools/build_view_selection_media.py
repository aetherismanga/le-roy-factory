#!/usr/bin/env python3
"""Build bounded VIEW selection media from verified manufacturer sources.

First run: --manifest path/to/view-official-media.json
Subsequent runs can use reports/view-selection-media-20261031.json, which retains
the source manifest. JPEG/PDF originals are cached outside the repository; source
PDFs are copied byte for byte, and full WebP images keep their pixel dimensions.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import io
import json
import pathlib
import re
import shutil
import subprocess
import tempfile
import threading
import time
import unicodedata
import urllib.parse
import urllib.request
import uuid

from PIL import Image, ImageOps

ROOT = pathlib.Path(__file__).resolve().parents[1]
STAMP = "20261031"
IMAGE_DIR = pathlib.Path(f"assets/img/view-selection-{STAMP}")
PDF_DIR = pathlib.Path(f"assets/pdf/view-selection-{STAMP}")
REPORT = ROOT / f"reports/view-selection-media-{STAMP}.json"
SCRIPT = ROOT / "assets/js/inspirations-view-selection-media.js"
LOCK = threading.Lock()


def norm(value):
    return re.sub(r"[^a-z0-9]", "", unicodedata.normalize("NFD", value).encode("ascii", "ignore").decode().lower())


def color_key(value):
    key = norm(value)
    return {"anthracite": "antracite", "calacattawhite": "calacatta", "statuariowhite": "statuario"}.get(key, key)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def write_atomic(path, data):
    temporary = path.with_name(path.name + "." + uuid.uuid4().hex + ".tmp")
    temporary.write_bytes(data)
    temporary.replace(path)


def fetch(url, cache, pdf=False):
    key = hashlib.sha256(url.encode()).hexdigest()
    path = cache / (key + (".pdf" if pdf else ".image"))
    metadata_path = cache / (key + ".json")
    if path.exists():
        data = path.read_bytes()
        try:
            if pdf:
                if not data.startswith(b"%PDF-"): raise ValueError("Invalid cached PDF")
            else:
                Image.open(io.BytesIO(data)).verify()
            return data, json.loads(metadata_path.read_text()) if metadata_path.exists() else {"cached": True}
        except Exception:
            pass
    error = None
    for attempt in range(3):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; LRF-Media-Builder/1.0)"})
            with urllib.request.urlopen(request, timeout=35) as response:
                data = response.read()
                metadata = {"httpStatus": response.status, "finalUrl": response.url, "contentType": response.headers.get("Content-Type"), "allowOrigin": response.headers.get("Access-Control-Allow-Origin")}
            if pdf:
                if not data.startswith(b"%PDF-"):
                    raise ValueError("Response is not a PDF")
            else:
                image = Image.open(io.BytesIO(data))
                image.verify()
            write_atomic(path, data)
            metadata_path.write_text(json.dumps(metadata, indent=2))
            return data, metadata
        except Exception as exc:
            error = exc
            if attempt < 2:
                time.sleep(attempt + 1)
    raise RuntimeError(f"Unable to retrieve {url}: {error}")


def source_image(item, cache):
    if item.get("localPath") and pathlib.Path(item["localPath"]).is_file():
        return pathlib.Path(item["localPath"]).read_bytes(), {"localPdfExtraction": True}
    if item.get("sourcePdfUrl"):
        url = item["sourcePdfUrl"]
        pdf, metadata = fetch(url, cache, pdf=True)
        pdf_key = hashlib.sha256(url.encode()).hexdigest()
        source_path = cache / (pdf_key + ".pdf")
        page = item["sourcePdfPage"]
        prefix = cache / f"{pdf_key}-page-{page}"
        target = pathlib.Path(str(prefix) + f"-{item['sourcePdfPageImageIndex']:03}.jpg")
        # Multiple COCO images may share the same page; serialize extraction.
        with LOCK:
            if not target.exists():
                subprocess.run(["pdfimages", "-f", str(page), "-l", str(page), "-j", str(source_path), str(prefix)], check=True, stdout=subprocess.DEVNULL)
        return target.read_bytes(), {**metadata, "localPdfExtraction": True}
    return fetch(item["url"], cache)


def choose_images(collection):
    images = collection["images"]
    chosen, used, missing = [], set(), []
    def add(image, color=None):
        key = image.get("url") or image.get("localPath") or (image.get("sourcePdfUrl"), image.get("sourcePdfPage"), image.get("sourcePdfPageImageIndex"))
        if key in used:
            return
        used.add(key)
        chosen.append({**image, **({"color": color} if color else {})})
    for image in [x for x in images if x["kind"] == "ambiance"][:2]:
        add(image)
    if not chosen and images:
        add(images[0])
    for color in collection["catalogColors"]:
        exact = next((url for key, url in collection.get("colorImages", {}).items() if color_key(key) == color_key(color)), None)
        image = next((im for im in images if im.get("url") == exact), None) if exact else None
        if image is None:
            local = collection.get("localColorImages", {}).get(color)
            image = next((im for im in images if local and im.get("localPath") == local), None)
        if image is None:
            image = next((im for im in images if color_key(im.get("catalogueColor", "")) == color_key(color)), None)
        if image is None:
            # The manufacturer's gallery can contain colours omitted by its swatches.
            matches = [im for im in images if im["kind"] == "texture" and color_key(color) in color_key(im["alt"])]
            image = next((im for im in matches if not re.search(r"mosaic|mosaico|outdoor|&", im["alt"], re.I)), None)
        if image:
            add(image, color)
        else:
            missing.append(color)
    return chosen[:12], missing


def build_image(task, cache):
    slug, index, item = task
    data, metadata = source_image(item, cache)
    image = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
    name = f"{index + 1:02}-{norm(item.get('color') or item['kind'])}"
    target = ROOT / IMAGE_DIR / slug
    target.mkdir(parents=True, exist_ok=True)
    generated = {}
    for kind, limit, quality in [("preview", 1000, 86), ("thumb", 240, 80), ("full", None, 92)]:
        copy = image.copy()
        if limit:
            copy.thumbnail((limit, limit), Image.Resampling.LANCZOS)
        path = target / f"{name}-{kind}.webp"
        buffer = io.BytesIO()
        copy.save(buffer, "WEBP", quality=quality, method=6)
        payload = buffer.getvalue()
        Image.open(io.BytesIO(payload)).verify()
        write_atomic(path, payload)
        generated[kind] = {"path": path.relative_to(ROOT).as_posix(), "bytes": path.stat().st_size, "width": copy.width, "height": copy.height, "sha256": sha(payload)}
    alt = re.sub(r"\s*\(\d+x\)\s*", " ", item["alt"]).strip()
    public = {"url": generated["preview"]["path"], "fullUrl": generated["full"]["path"], "thumbnail": generated["thumb"]["path"], "alt": alt, **({"color": item["color"]} if item.get("color") else {})}
    provenance = {"slug": slug, "index": index, "sourceUrl": item.get("url") or item.get("sourcePdfUrl"), "sourcePdfPage": item.get("sourcePdfPage"), "sourcePdfPageImageIndex": item.get("sourcePdfPageImageIndex"), "sourceBytes": len(data), "sourceSha256": sha(data), "sourceWidth": image.width, "sourceHeight": image.height, "http": metadata, "files": generated, "public": public}
    return slug, index, public, provenance


def migrated_catalogues():
    source = (ROOT / "catalogues.html").read_text()
    entries = re.findall(r"titre:'([^']+)'[^\n]*?lien:'([^']+)'", source)
    by_title = {title: url for title, url in entries}
    # Byte-identical to the original manufacturer PDFs, verified by SHA-256.
    mapping = {"ardenne": "Ardenne", "dorset": "Dorset", "marais": "Marais", "digione": "Digione", "coco": "COCO & Le Pietre di View", "new-wood": "Extérieur", "quantum": "Extérieur", "dorset-xl": "Extérieur", "pietre-60x90": "Extérieur"}
    return {slug: by_title[title] for slug, title in mapping.items() if title in by_title}


def build_pdf(task, cache):
    slug, item, reuse = task
    source_url = item["url"]
    reviewed = item.get("reviewedDerivative")
    if reviewed:
        # Retain a separately reviewed derivative instead of silently replacing
        # it with a larger original on subsequent media rebuilds.
        target = ROOT / reviewed["path"]
        data = target.read_bytes()
        if not data.startswith(b"%PDF-") or sha(data) != reviewed["sha256"]:
            raise ValueError(f"Reviewed PDF derivative must be restored: {target}")
        public = {"url": reviewed["path"], "title": item.get("label") or f"Catalogue VIEW · {slug}", "sourceUrl": source_url, "originalUrl": source_url}
        return slug, public, {"slug": slug, "sourceUrl": source_url, "servedUrl": reviewed["path"], "originalBytesPreserved": False, "reviewedDerivative": reviewed, "bytes": len(data), "sha256": sha(data)}
    if slug == "bigsize":
        # The public manufacturer's combined list/catalogue includes ex-works
        # figures. Only the separately reviewed photo extract belongs in the UI.
        target = ROOT / PDF_DIR / "bigsize-photos.pdf"
        data = target.read_bytes()
        if not data.startswith(b"%PDF-"):
            raise ValueError("Reviewed BIGSIZE photo extract is missing or invalid")
        url = target.relative_to(ROOT).as_posix()
        public = {"url": url, "title": "BIGSIZE · Ambiances"}
        return slug, public, {"slug": slug, "sourceUrl": source_url, "servedUrl": url, "originalBytesPreserved": False, "photoOnlyExtract": True, "bytes": len(data), "sha256": sha(data), "extraction": {"sourcePages": [1, 6, 7, 9], "sourcePage7": "Left photo area rasterized; price/note block excluded", "verifiedNoPrices": True}}
    url = reuse.get(slug) or source_url
    data, metadata = fetch(url, cache, pdf=True)
    if reuse.get(slug):
        # Firebase navigation is retained as a fallback, while PDF.js reads
        # byte-identical chunks from this origin to avoid bucket CORS failures.
        original_name = urllib.parse.unquote(urllib.parse.urlparse(url).path).rsplit("/", 1)[-1]
        filename = re.sub(r"[^a-zA-Z0-9._-]+", "-", original_name)
        folder = ROOT / PDF_DIR
        folder.mkdir(parents=True, exist_ok=True)
        parts = []
        for index, offset in enumerate(range(0, len(data), 4 * 1024 * 1024), 1):
            payload = data[offset:offset + 4 * 1024 * 1024]
            path = folder / f"{filename}.part{index:02}"
            if not path.exists() or sha(path.read_bytes()) != sha(payload):
                write_atomic(path, payload)
            parts.append({"path": path.relative_to(ROOT).as_posix(), "bytes": len(payload), "sha256": sha(payload)})
        joined = b"".join((ROOT / part["path"]).read_bytes() for part in parts)
        if joined != data:
            raise ValueError(f"PDF segments do not reassemble exactly: {slug}")
        public = {"url": url, "title": item.get("label") or f"Catalogue VIEW · {slug}", "sourceUrl": source_url, "originalUrl": source_url, "parts": [part["path"] for part in parts], "bytes": len(data)}
        return slug, public, {"slug": slug, "sourceUrl": source_url, "servedUrl": url, "originalBytesPreserved": True, "reusedFirebase": True, "mirroredSameOriginParts": True, "partBytes": 4 * 1024 * 1024, "parts": parts, "reassembledSha256Verified": True, "bytes": len(data), "sha256": sha(data), "http": metadata}
    mirrored = not reuse.get(slug) and "viewceramiche.com" in url
    if mirrored:
        basename = urllib.parse.unquote(urllib.parse.urlparse(source_url).path.rsplit("/", 1)[-1])
        filename = re.sub(r"[^a-zA-Z0-9._-]+", "-", basename)
        target = ROOT / PDF_DIR / filename
        target.parent.mkdir(parents=True, exist_ok=True)
        write_atomic(target, data)
        url = target.relative_to(ROOT).as_posix()
    public = {"url": url, "title": item.get("label") or f"Catalogue VIEW · {slug}", "sourceUrl": source_url}
    return slug, public, {"slug": slug, "sourceUrl": source_url, "servedUrl": url, "originalBytesPreserved": True, "reusedFirebase": bool(reuse.get(slug)), "mirroredSameOrigin": mirrored, "bytes": len(data), "sha256": sha(data), "http": metadata}


def js_source(data):
    return "/* Official VIEW media. Built by tools/build_view_selection_media.py. */\n(() => {\n  'use strict';\n  const media = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n" + """
  window.VIEW_SELECTION_MEDIA = media;
  const apply = () => {
    if (!Array.isArray(window.VIEW_CATALOGUE)) return;
    let count = 0;
    window.VIEW_CATALOGUE.forEach(product => {
      const slug = product.slug || String(product.id || '').replace(/^view-/, '');
      const images = media.galleries[slug];
      if (Array.isArray(images) && images.length) {
        product.images = images.map(image => ({ ...image }));
        product.coverImage = images[0].url;
        count += 1;
      }
      const catalogues = media.catalogues[slug];
      if (Array.isArray(catalogues) && catalogues.length) product.catalogues = catalogues.map(item => ({ ...item }));
    });
    window.dispatchEvent(new CustomEvent('lrf-view-media-ready', { detail: { collections: count } }));
  };
  apply();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
})();
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=pathlib.Path, default=REPORT)
    parser.add_argument("--cache-dir", type=pathlib.Path, default=pathlib.Path(tempfile.gettempdir()) / "lrf-view-selection-media-cache")
    parser.add_argument("--workers", type=int, default=6)
    args = parser.parse_args()
    manifest = json.loads(args.manifest.read_text())
    collections = manifest.get("sourceCollections") or manifest["collections"]
    if REPORT.exists() and args.manifest.resolve() != REPORT.resolve():
        previous = json.loads(REPORT.read_text())
        reviewed = {item["url"]: item["reviewedDerivative"] for collection in previous.get("sourceCollections", []) for item in collection.get("catalogues", []) if item.get("reviewedDerivative")}
        for collection in collections:
            for item in collection.get("catalogues", []):
                if item["url"] in reviewed:
                    item["reviewedDerivative"] = reviewed[item["url"]]
    args.cache_dir.mkdir(parents=True, exist_ok=True)
    media = {"galleries": {}, "variants": {}, "catalogues": {}}
    tasks, missing = [], {}
    for collection in collections:
        chosen, absent = choose_images(collection)
        missing[collection["slug"]] = absent
        tasks.extend((collection["slug"], index, item) for index, item in enumerate(chosen))
    provenance, errors, results = [], [], []
    print(f"Building {len(tasks)} images for {len(collections)} collections", flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=min(args.workers, 6)) as pool:
        futures = {pool.submit(build_image, task, args.cache_dir): task for task in tasks}
        for future in concurrent.futures.as_completed(futures):
            task = futures[future]
            try:
                result = future.result()
                results.append(result)
                print(f"Image {len(results)}/{len(tasks)}: {task[0]} {task[1] + 1}", flush=True)
            except Exception as exc:
                errors.append({"kind": "image", "slug": task[0], "index": task[1], "error": str(exc)})
                print(f"FAILED image {task[0]}: {exc}", flush=True)
    for slug, index, public, source in sorted(results, key=lambda x: (x[0], x[1])):
        media["galleries"].setdefault(slug, []).append(public)
        if public.get("color"):
            media["variants"].setdefault(slug, {}).setdefault(public["color"], []).append(public)
        provenance.append(source)
    reuse = migrated_catalogues()
    pdf_tasks = [(p["slug"], item, reuse) for p in collections for item in p.get("catalogues", [])]
    pdf_provenance = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=min(args.workers, 6)) as pool:
        futures = {pool.submit(build_pdf, task, args.cache_dir): task for task in pdf_tasks}
        for future in concurrent.futures.as_completed(futures):
            task = futures[future]
            try:
                slug, public, source = future.result()
                media["catalogues"].setdefault(slug, []).append(public)
                pdf_provenance.append(source)
                print(f"PDF: {slug} ({source['bytes']} bytes)", flush=True)
            except Exception as exc:
                errors.append({"kind": "pdf", "slug": task[0], "error": str(exc)})
                print(f"FAILED PDF {task[0]}: {exc}", flush=True)
    SCRIPT.write_text(js_source(media))
    # Remove machine-specific paths, retaining enough PDF extraction provenance to rebuild.
    clean_collections = json.loads(json.dumps(collections))
    for collection in clean_collections:
        collection.pop("localColorImages", None)
        for item in collection.get("images", []): item.pop("localPath", None)
        for item in collection.get("catalogues", []): item.pop("localPath", None)
    files = [p for base in (ROOT / IMAGE_DIR, ROOT / PDF_DIR) if base.exists() for p in base.rglob("*") if p.is_file()]
    for item in provenance:
        for kind, generated in item["files"].items():
            path = ROOT / generated["path"]
            with Image.open(path) as image:
                image.load()
                assert image.size == (generated["width"], generated["height"])
                assert path.stat().st_size == generated["bytes"]
                assert sha(path.read_bytes()) == generated["sha256"]
                if kind == "full":
                    assert image.size == (item["sourceWidth"], item["sourceHeight"])
                else:
                    assert max(image.size) <= (1000 if kind == "preview" else 240)
    report = {"date": "2026-10-31", "policy": {"maxImagesPerCollection": 12, "previewMaxWidth": 1000, "previewQuality": 86, "thumbnailMaxWidth": 240, "thumbnailQuality": 80, "fullQuality": 92, "fullDimensionsPreserved": True, "pdfOriginalBytesPreserved": all(item.get("originalBytesPreserved", False) for item in pdf_provenance), "pdfBytePreservationDetailedPerFile": True, "firebasePdfSameOriginPartBytes": 4 * 1024 * 1024, "firebasePdfReassembledOriginalBytesPreserved": True}, "sourceCollections": clean_collections, "images": provenance, "pdfs": pdf_provenance, "missingColorImages": {key: value for key, value in missing.items() if value}, "errors": errors, "summary": {"collections": len(collections), "collectionsWithImages": len(media["galleries"]), "images": len(provenance), "collectionsWithCatalogues": len(media["catalogues"]), "files": len(files), "totalBytes": sum(p.stat().st_size for p in files), "javascriptBytes": SCRIPT.stat().st_size}}
    REPORT.parent.mkdir(exist_ok=True)
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(report["summary"]), flush=True)
    if errors:
        raise SystemExit(f"{len(errors)} download failures; see {REPORT}")


if __name__ == "__main__":
    main()

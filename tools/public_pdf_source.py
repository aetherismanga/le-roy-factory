"""Resolve migrated public PDF inputs without storing binaries in Git."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import tempfile
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "reports/firebase-storage-migration.json"


def _valid(path: Path, item: dict) -> bool:
    if not path.is_file() or path.stat().st_size != item["bytes"]:
        return False
    digest = hashlib.sha256()
    with path.open("rb") as source:
        if source.read(5) != b"%PDF-":
            return False
        source.seek(0)
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest() == item["sha256"]


def resolve_pdf(source: Path | str) -> Path:
    source = Path(source)
    if source.is_file():
        return source
    key = source.resolve().relative_to(ROOT).as_posix()
    files = json.loads(MANIFEST.read_text(encoding="utf-8"))["files"]
    item = next((entry for entry in files if entry["path"] == key), None)
    if item is None:
        raise FileNotFoundError(f"No local PDF or migrated public source: {key}")
    if not item["url"].startswith(
        "https://firebasestorage.googleapis.com/v0/b/le-roy-factory.firebasestorage.app/o/"
    ):
        raise ValueError("Unexpected public PDF origin")
    cache = Path(os.environ.get("LRF_PUBLIC_PDF_CACHE", str(Path(tempfile.gettempdir()) / "lrf-public-pdfs")))
    cache.mkdir(parents=True, exist_ok=True)
    target = cache / (item["sha256"] + ".pdf")
    if _valid(target, item):
        return target
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=cache, suffix=".download", delete=False) as output:
            temporary = Path(output.name)
            count = 0
            request = Request(item["url"], headers={"User-Agent": "LRF-Public-PDF-Source/1"})
            with urlopen(request, timeout=180) as response:
                for block in iter(lambda: response.read(1024 * 1024), b""):
                    count += len(block)
                    if count > item["bytes"]:
                        raise ValueError(f"Unexpected PDF size: {key}")
                    output.write(block)
        if not _valid(temporary, item):
            raise ValueError(f"PDF integrity check failed: {key}")
        temporary.replace(target)
        return target
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("sources", nargs="+", type=Path)
    for source in parser.parse_args().sources:
        print(resolve_pdf(source))

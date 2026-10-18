"""Checks that migrated PDF sources cannot bypass integrity verification."""
import hashlib
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
import public_pdf_source as pdf


class PublicPdfSourceTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.cache = self.root / "cache"
        self.source = self.root / "assets/pdf/catalogue.pdf"
        self.source.mkdir(parents=True)
        self.content = b"%PDF-1.7 verified public source"
        self.item = {
            "path": "assets/pdf/catalogue.pdf",
            "bytes": len(self.content),
            "sha256": hashlib.sha256(self.content).hexdigest(),
            "url": "https://firebasestorage.googleapis.com/v0/b/le-roy-factory.firebasestorage.app/o/test",
        }
        self.manifest = self.root / "manifest.json"
        self.write_manifest()
        self.addCleanup(patch.stopall)
        patch.multiple(pdf, ROOT=self.root, MANIFEST=self.manifest).start()
        patch.dict("os.environ", {"LRF_PUBLIC_PDF_CACHE": str(self.cache)}).start()

    def write_manifest(self):
        self.manifest.write_text(json.dumps({"files": [self.item]}))

    def test_download_is_verified(self):
        with patch.object(pdf, "urlopen", return_value=io.BytesIO(self.content)):
            result = pdf.resolve_pdf(self.source)
        self.assertEqual(result.read_bytes(), self.content)
        self.assertTrue(self.source.is_dir())

    def test_same_size_corruption_is_rejected(self):
        with patch.object(pdf, "urlopen", return_value=io.BytesIO(b"%PDF-" + b"x" * (len(self.content) - 5))):
            with self.assertRaisesRegex(ValueError, "integrity"):
                pdf.resolve_pdf(self.source)
        self.assertEqual(list(self.cache.iterdir()), [])

    def test_oversized_download_is_rejected(self):
        with patch.object(pdf, "urlopen", return_value=io.BytesIO(self.content + b"extra")):
            with self.assertRaisesRegex(ValueError, "size"):
                pdf.resolve_pdf(self.source)

    def test_verified_cache_does_not_need_network(self):
        self.cache.mkdir()
        target = self.cache / (self.item["sha256"] + ".pdf")
        target.write_bytes(self.content)
        with patch.object(pdf, "urlopen") as request:
            self.assertEqual(pdf.resolve_pdf(self.source), target)
            request.assert_not_called()

    def test_corrupt_cache_is_replaced(self):
        self.cache.mkdir()
        target = self.cache / (self.item["sha256"] + ".pdf")
        target.write_bytes(b"corrupt")
        with patch.object(pdf, "urlopen", return_value=io.BytesIO(self.content)):
            self.assertEqual(pdf.resolve_pdf(self.source).read_bytes(), self.content)

    def test_unlisted_source_is_not_downloaded(self):
        with patch.object(pdf, "urlopen") as request:
            with self.assertRaises(FileNotFoundError):
                pdf.resolve_pdf(self.root / "assets/pdf/private.pdf")
            request.assert_not_called()

    def test_unexpected_origin_is_rejected(self):
        self.item["url"] = "https://example.com/catalogue.pdf"
        self.write_manifest()
        with patch.object(pdf, "urlopen") as request:
            with self.assertRaisesRegex(ValueError, "origin"):
                pdf.resolve_pdf(self.source)
            request.assert_not_called()

    def test_existing_local_sources_are_unchanged(self):
        private = self.root / "private.pdf"
        private.write_bytes(self.content)
        with patch.object(pdf, "urlopen") as request:
            self.assertEqual(pdf.resolve_pdf(private), private)
            request.assert_not_called()


if __name__ == "__main__":
    unittest.main()

"""Offline publication/activation contract checks; no synthetic URL is fetched."""
import copy
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
from urllib.parse import quote

import check_creta_publication as checker
from test_apply_creta_hd import activation, fixture


class CretaPublicationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.mapping, self.inventory, _, _ = fixture()
        self.preparation = {"assetCount": 159, "assets": []}
        self.media = []
        self.previous = {"faces": []}
        for entry in self.inventory["entries"]:
            definition = self.mapping["cretaVerified"][entry["reference"]]
            entry.update({"color": definition["color"], "sourceICCsha256": "reviewed-test-profile",
                          "formatCm": [60, 120], "renderDimensionsCm": [120, 60]})
            legacy_face = {key: entry[key] for key in ["reference", "face", "sourceSHA256"]}
            legacy_face["variants"] = {}
            for tier, variant in entry["variants"].items():
                filename = Path(variant["file"]).name
                self.preparation["assets"].append({"file": filename, "reference": entry["reference"],
                                                   "face": entry["face"], "tier": tier,
                                                   "variantFile": variant["file"],
                                                   "bytes": variant["bytes"], "sha256": variant["sha256"]})
                path = checker.REMOTE_PREFIX + filename
                if entry["reference"] in {"03V6A00", "03V6A10", "03V6A20"} and entry["face"] == 1:
                    path = checker.REMOTE_PREFIX.replace("/creta/", "/creta-previous/") + filename
                url = "https://firebasestorage.googleapis.com" + quote(path, safe="/") + "?alt=media"
                self.media.append({"file": filename, "url": url})
                legacy_face["variants"][tier] = [url]
            if entry["reference"] in {"03V6A00", "03V6A10", "03V6A20"} and entry["face"] == 1:
                self.previous["faces"].append(legacy_face)
        self.args = SimpleNamespace(**{name: str(self.root / (name + ".json")) for name in
                                       ["media", "inventory", "upload_manifest", "mapping", "previous_publication"]})
        self.save()

    def save(self):
        for name, value in [("media", self.media), ("inventory", self.inventory),
                            ("upload_manifest", self.preparation), ("mapping", self.mapping),
                            ("previous_publication", self.previous)]:
            Path(getattr(self.args, name)).write_text(json.dumps(value))

    def test_reuses_nine_exact_previous_urls_without_duplicate_uploads(self):
        entries, _, _, _, media = checker.read_inputs(self.args)
        self.assertEqual(len(entries), 53)
        self.assertEqual(len(media), 159)
        self.assertEqual(sum("creta-previous" in item["url"] for item in media.values()), 9)

    def test_changed_legacy_token_or_original_is_rejected(self):
        original = copy.deepcopy(self.media)
        next(row for row in self.media if "creta-previous" in row["url"])["url"] += "&unobserved=1"
        self.save()
        with self.assertRaisesRegex(ValueError, "exact reviewed"):
            checker.read_inputs(self.args)
        self.media = original
        self.previous["faces"][0]["sourceSHA256"] = "0" * 64
        self.save()
        with self.assertRaisesRegex(ValueError, "exact reviewed"):
            checker.read_inputs(self.args)

    def test_preparation_hash_drift_is_rejected_before_networking(self):
        self.preparation["assets"][0]["sha256"] = "0" * 64
        self.save()
        with self.assertRaisesRegex(ValueError, "bytes do not match"):
            checker.read_inputs(self.args)

    def test_generated_reports_match_the_fail_closed_activation_contract(self):
        report, publication = self.root / "checks.json", self.root / "publication.json"
        argv = ["check_creta_publication.py"]
        for name, value in vars(self.args).items():
            argv.extend(["--" + name.replace("_", "-"), value])
        argv.extend(["--report", str(report), "--manifest", str(publication), "--workers", "1"])

        def verified_test_body(asset, origin, expected):
            return {"origin": origin, "passed": True, "httpStatus": 200,
                    "contentType": "image/webp", "corsReadable": True,
                    "sha256": expected["sha256"], "bytes": expected["bytes"]}

        with patch("sys.argv", argv), patch.object(checker, "verify", verified_test_body):
            checker.main()
        manifest = json.loads(publication.read_text())
        checks = json.loads(report.read_text())
        self.assertFalse(manifest["collectionComplete"])
        self.assertTrue(manifest["baseTextureInventoryComplete"])
        self.assertEqual(checks["checks"], 477)
        self.assertEqual(len(activation.validate_publication(self.mapping, self.inventory, manifest, checks)), 8)


if __name__ == "__main__":
    unittest.main()

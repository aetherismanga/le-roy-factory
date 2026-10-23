"""Offline publication/activation contract checks; no synthetic URL is fetched."""
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
from urllib.parse import quote

import check_mysterium_publication as checker
from test_apply_mysterium_hd import activation, fixture


class MysteriumPublicationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.mapping, self.inventory, _, _ = fixture()
        self.preparation = {"assetCount": 72, "assets": []}
        self.media = []
        for entry in self.inventory["entries"]:
            definition = self.mapping["mysteriumVerified"][entry["reference"]]
            entry.update({"color": definition["color"], "sourceICCsha256": "reviewed-test-profile",
                          "formatCm": [120, 278], "renderDimensionsCm": [278, 120]})
            for tier, variant in entry["variants"].items():
                filename = Path(variant["file"]).name
                self.preparation["assets"].append({"file": filename, "reference": entry["reference"],
                                                   "face": entry["face"], "tier": tier,
                                                   "variantFile": variant["file"],
                                                   "bytes": variant["bytes"], "sha256": variant["sha256"]})
                path = checker.REMOTE_PREFIX + filename
                url = "https://firebasestorage.googleapis.com" + quote(path, safe="/") + "?alt=media"
                self.media.append({"file": filename, "url": url})
        self.args = SimpleNamespace(**{name: str(self.root / (name + ".json")) for name in
                                       ["media", "inventory", "upload_manifest", "mapping"]})
        self.save()

    def save(self):
        for name, value in [("media", self.media), ("inventory", self.inventory),
                            ("upload_manifest", self.preparation), ("mapping", self.mapping)]:
            Path(getattr(self.args, name)).write_text(json.dumps(value))

    def test_complete_exact_upload_set_is_required(self):
        entries, _, _, _, media = checker.read_inputs(self.args)
        self.assertEqual(len(entries), 24)
        self.assertEqual(len(media), 72)
        self.media.pop()
        self.save()
        with self.assertRaisesRegex(ValueError, "Exactly 72"):
            checker.read_inputs(self.args)

    def test_unapproved_public_folder_is_rejected(self):
        self.media[0]["url"] = self.media[0]["url"].replace("/mysterium/", "/other/")
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
        argv = ["check_mysterium_publication.py"]
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
        self.assertEqual(checks["checks"], 216)
        self.assertEqual(len(activation.validate_publication(self.mapping, self.inventory, manifest, checks)), 6)


if __name__ == "__main__":
    unittest.main()

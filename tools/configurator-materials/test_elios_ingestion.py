"""Checks for source-size rounding and immutable flat upload staging."""
import hashlib
import io
import json
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from ingest_elios_queue import ingest, portal_texture_observations
from stage_elios_upload import stage


class SourceSizeTests(unittest.TestCase):
    def test_decimal_units_preserve_the_portal_rounding_precision(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "portal.json"
            path.write_text(json.dumps([
                {"collection": "Creta", "category": "texture", "name": "a.jpg", "size": "108,21 MB"},
                {"collection": "Quercia", "category": "texture", "name": "b.jpg", "size": "124,04 KB"},
                {"collection": "Quercia", "category": "texture", "name": "c.jpg", "size": "900 B"},
            ]))
            self.assertEqual(portal_texture_observations(path, "creta")["a.jpg"],
                             {"portalBytesRounded": 108210000, "toleranceBytes": 5000})
            rows = portal_texture_observations(path, "quercia")
            self.assertEqual(rows["b.jpg"], {"portalBytesRounded": 124040, "toleranceBytes": 5})
            self.assertEqual(rows["c.jpg"], {"portalBytesRounded": 900, "toleranceBytes": 0})

    def test_ambiguous_duplicate_source_name_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "portal.json"
            path.write_text(json.dumps([
                {"collection": "Creta", "category": "texture", "name": "a.jpg", "size": size}
                for size in ["108,21 MB", "108,22 MB"]
            ]))
            with self.assertRaisesRegex(ValueError, "Ambiguous"):
                portal_texture_observations(path, "creta")


class StagingTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.source = root / "source"
        self.source.mkdir()
        self.inventory = root / "inventory.json"
        self.entry = {"collection": "creta", "reference": "03V6A00", "colorId": "zucchero",
                      "format": "60x120", "face": 1, "identityVerified": True,
                      "readyForIntegration": True, "reuseAuthorization": "confirmed-by-user",
                      "sourceICCsha256": "reviewed", "upscaled": False, "variants": {}}
        for tier in ["fluid", "balanced", "max"]:
            data = (tier + "-verified-fixture").encode()
            (self.source / (tier + ".webp")).write_bytes(data)
            self.entry["variants"][tier] = {"file": tier + ".webp", "bytes": len(data),
                                            "sha256": hashlib.sha256(data).hexdigest(),
                                            "width": 120, "height": 60}
        self.args = SimpleNamespace(inventory=str(self.inventory), collection="creta",
                                    source_root=str(self.source), destination=str(root / "upload"),
                                    manifest=str(root / "upload.json"), write=False)
        self.save()

    def save(self, entries=None):
        self.inventory.write_text(json.dumps({"entries": entries or [self.entry]}))

    def test_default_dry_run_then_idempotent_write(self):
        self.assertEqual(stage(self.args)["assets"], 3)
        self.assertFalse(Path(self.args.destination).exists())
        self.args.write = True
        self.assertTrue(stage(self.args)["written"])
        first = Path(self.args.manifest).read_bytes()
        stage(self.args)
        self.assertEqual(Path(self.args.manifest).read_bytes(), first)
        self.assertEqual(len(list(Path(self.args.destination).iterdir())), 3)

    def test_truncated_source_aborts_before_creating_destination(self):
        (self.source / "max.webp").write_bytes(b"truncated")
        self.args.write = True
        with self.assertRaisesRegex(ValueError, "bytes differ"):
            stage(self.args)
        self.assertFalse(Path(self.args.destination).exists())

    def test_corrupted_existing_upload_is_never_overwritten(self):
        self.args.write = True
        stage(self.args)
        target = next(Path(self.args.destination).iterdir())
        target.write_bytes(b"other asset")
        with self.assertRaisesRegex(ValueError, "Refusing to replace"):
            stage(self.args)
        self.assertEqual(target.read_bytes(), b"other asset")

    def test_duplicate_reference_face_is_rejected(self):
        self.save([self.entry, self.entry])
        with self.assertRaisesRegex(ValueError, "repeats"):
            stage(self.args)

    def test_missing_authorization_is_rejected(self):
        self.entry["reuseAuthorization"] = "pending"
        self.save()
        with self.assertRaisesRegex(ValueError, "rights"):
            stage(self.args)

    def test_variant_cannot_escape_source_directory(self):
        self.entry["variants"]["max"]["file"] = "../inventory.json"
        self.save()
        with self.assertRaisesRegex(ValueError, "escapes"):
            stage(self.args)


class ReviewedCollectionTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        source = root / "LB1201@1.jpg"
        source.write_bytes(b"official-test-source")
        self.mapping = {"mysteriumVerified": {"LB1201": {
            "collection": "Mysterium", "reference": "LB1201",
            "nativeTextureAssignmentAllowed": True, "portalFaces": [source.name],
            "colorId": "reviewed-colour", "color": "Reviewed colour", "sourceFormat": "120x278",
            "sourceFormatCm": {"width": 120, "height": 278}, "finish": "Reviewed finish",
        }}}
        for name, data in [("queue", [{"filename": source.name, "path": str(source)}]),
                           ("mapping", self.mapping), ("portal", [{"collection": "Magnus", "category": "texture",
                                                                    "name": source.name, "size": f"{source.stat().st_size} B"}])]:
            (root / (name + ".json")).write_text(json.dumps(data))
        self.args = SimpleNamespace(collection="mysterium", mapping_key="mysteriumVerified",
                                    portal_collection="Magnus", queue=str(root / "queue.json"),
                                    mapping=str(root / "mapping.json"), portal_files=str(root / "portal.json"),
                                    inventory=str(root / "inventory.json"), output=str(root / "variants"),
                                    rotate_cw=90, reuse_authorized=True)

    def test_explicit_reviewed_table_and_portal_alias_allow_a_new_collection(self):
        with patch("ingest_elios_queue.prepare", return_value={}) as prepare, redirect_stdout(io.StringIO()):
            results = ingest(self.args)
        self.assertEqual(results[0]["status"], "prepared")
        self.assertEqual(prepare.call_args.args[0].collection, "mysterium")
        self.assertEqual(prepare.call_args.args[0].reference, "LB1201")

    def test_portal_alias_does_not_bypass_reference_review(self):
        self.mapping["mysteriumVerified"]["LB1201"]["nativeTextureAssignmentAllowed"] = False
        Path(self.args.mapping).write_text(json.dumps(self.mapping))
        with patch("ingest_elios_queue.prepare") as prepare:
            with self.assertRaisesRegex(ValueError, "No verified reference mapping"):
                ingest(self.args)
            prepare.assert_not_called()

    def test_unreviewed_mapping_table_name_is_rejected(self):
        self.args.mapping_key = "sources"
        with self.assertRaisesRegex(ValueError, "explicitly reviewed"):
            ingest(self.args)

    def test_wrong_collection_reference_or_physical_dimensions_are_rejected(self):
        definition = self.mapping["mysteriumVerified"]["LB1201"]
        for field, invalid in [("collection", "Creta"), ("reference", "03V6A00"),
                               ("sourceFormatCm", {"width": 0, "height": 278}),
                               ("sourceFormatCm", {"width": float("nan"), "height": 278})]:
            original = definition[field]
            definition[field] = invalid
            Path(self.args.mapping).write_text(json.dumps(self.mapping))
            with patch("ingest_elios_queue.prepare") as prepare:
                with self.assertRaises(ValueError):
                    ingest(self.args)
                prepare.assert_not_called()
            definition[field] = original

    def existing_inventory(self):
        root = Path(self.tmp.name)
        output = Path(self.args.output); output.mkdir(exist_ok=True)
        source = root / "LB1201@1.jpg"
        entry = {"collection": "mysterium", "reference": "LB1201", "face": 1,
                 "sourceFilename": source.name, "sourceSHA256": hashlib.sha256(source.read_bytes()).hexdigest(),
                 "identityVerified": True, "readyForIntegration": True, "sourceICCsha256": "reviewed",
                 "colorId": "reviewed-colour", "color": "Reviewed colour", "format": "120x278",
                 "formatCm": [120, 278], "renderDimensionsCm": [278, 120], "finish": "Reviewed finish",
                 "nativeDimensions": [1200, 2780],
                 "rotateClockwise": 90, "recipe": {"pipelineVersion": 1},
                 "reuseAuthorization": "confirmed-by-user", "variants": {}}
        for tier in ["fluid", "balanced", "max"]:
            data = tier.encode();(output / (tier + ".webp")).write_bytes(data)
            entry["variants"][tier] = {"file": tier + ".webp", "sha256": hashlib.sha256(data).hexdigest()}
        return entry

    def test_resume_reuses_only_the_exact_verified_identity_and_all_three_profiles(self):
        original = self.existing_inventory()
        Path(self.args.inventory).write_text(json.dumps({"entries": [original]}))
        with patch("ingest_elios_queue.prepare") as prepare, redirect_stdout(io.StringIO()):
            result = ingest(self.args)
            prepare.assert_not_called()
            self.assertEqual(result[0]["status"], "verified-existing")
        for field, invalid in [("format", "60x120"), ("formatCm", [60, 120]),
                               ("renderDimensionsCm", [120, 278]), ("finish", "Other finish"),
                               ("color", "Other colour"), ("readyForIntegration", False), ("variants", {})]:
            updated = dict(original); updated[field] = invalid
            Path(self.args.inventory).write_text(json.dumps({"entries": [updated]}))
            with patch("ingest_elios_queue.prepare", return_value={}) as prepare, redirect_stdout(io.StringIO()):
                result = ingest(self.args)
                prepare.assert_called_once()
                self.assertEqual(result[0]["status"], "prepared")


if __name__ == "__main__":
    unittest.main()

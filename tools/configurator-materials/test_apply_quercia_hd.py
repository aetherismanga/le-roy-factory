"""Offline activation tests. Fixture URLs are never fetched or applied to disk."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import unittest
from urllib.parse import quote

TOOL = Path(__file__).with_name("apply_quercia_hd.py")
spec = importlib.util.spec_from_file_location("apply_quercia_hd", TOOL)
activation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(activation)


def fixture():
    mapping = json.loads((activation.REPO / "reports/elios-hd/reference-mapping.json").read_text())
    inventory = json.loads((activation.REPO / "reports/elios-hd/quercia-inventory.json").read_text())
    publication = {"manufacturer": "ELIOS", "collection": "Quercia", "enabled": False,
                   "collectionComplete": True, "publicMediaChecksPassed": True,
                   "reuseAuthorization": "confirmed-by-user", "expectedBaseColors": 4,
                   "expectedBaseReferences": 8, "expectedBaseFaces": 118, "publishedCompleteFaces": 118,
                   "faces": []}
    checks = {"allPassed": True, "publicURLsRewritten": False, "publishedVariantsChecked": 354, "assets": []}
    for entry in inventory["entries"]:
        face = {key: copy.deepcopy(entry[key]) for key in ["reference", "colorId", "color", "format", "face",
                                                         "sourceFilename", "sourceSHA256", "rotateClockwise",
                                                         "textureRotation", "renderDimensionsCm", "reuseAuthorization"]}
        face.update({"sourceFormatCm": entry["formatCm"], "enabled": False,
                     "publishedAllThreeProfiles": True, "variants": {}})
        for profile, variant in entry["variants"].items():
            name = entry["reference"] + "-" + Path(variant["file"]).name
            key = "public-site-assets/configurator-materials/quercia-offline-fixture/" + name
            url = "https://firebasestorage.googleapis.com/v0/b/le-roy-factory.firebasestorage.app/o/" + quote(key, safe="") + "?alt=media"
            face["variants"][profile] = [url]
            checks["assets"].append({"reference": entry["reference"], "face": entry["face"], "profile": profile,
                                     "passed": True, "urlSHA256": hashlib.sha256(url.encode()).hexdigest(),
                                     "expectedSHA256": variant["sha256"], "expectedBytes": variant["bytes"],
                                     "filename": Path(variant["file"]).name, "publishedFilename": name,
                                     "origins": [{"origin": origin, "passed": True, "httpStatus": 200,
                                                  "contentType": "image/webp", "corsReadable": True,
                                                  "sha256": variant["sha256"], "bytes": variant["bytes"]}
                                                 for origin in activation.ORIGINS]})
        publication["faces"].append(face)
    return mapping, inventory, publication, checks


class QuerciaActivationTest(unittest.TestCase):
    def test_exact_available_faces_and_consistent_numeric_face_order(self):
        inputs = fixture()
        descriptors = activation.validate_publication(*inputs)
        self.assertEqual(len(descriptors), 8)
        self.assertEqual(sum(item["nativeFaceCount"] for item in descriptors.values()), 118)
        amber = descriptors["00Y2C70"]
        self.assertEqual(amber["nativeFaceCount"], 13)
        self.assertTrue(all(len(amber["textureVariants"][profile]) == 13 for profile in activation.TIERS))
        self.assertTrue(amber["textureVariants"]["max"][0].split("%2F")[-1].startswith("00Y2C70-face-002-"))
        self.assertEqual(amber["textureRotation"], 0)

    def test_incomplete_collection_cannot_activate(self):
        inputs = list(fixture())
        inputs[2]["faces"].pop()
        with self.assertRaises(ValueError):
            activation.validate_publication(*inputs)

    def test_wrong_colour_format_or_double_rotation_cannot_activate(self):
        for key, value in [("colorId", "white"), ("format", "60x60"), ("textureRotation", 90)]:
            inputs = list(fixture())
            face = next(item for item in inputs[2]["faces"] if item["colorId"] == "amber")
            face[key] = value
            with self.assertRaises(ValueError):
                activation.validate_publication(*inputs)

    def test_unverified_public_body_or_missing_viewer_origin_cannot_activate(self):
        for mutate in [lambda asset: asset.update(expectedSHA256="0" * 64),
                       lambda asset: asset["origins"].pop(),
                       lambda asset: asset["origins"][0].update(httpStatus=403)]:
            inputs = list(fixture())
            mutate(inputs[3]["assets"][0])
            with self.assertRaises(ValueError):
                activation.validate_publication(*inputs)

    def test_unreviewed_url_or_duplicate_face_cannot_activate(self):
        inputs = list(fixture())
        inputs[2]["faces"][0]["variants"]["fluid"] = ["https://example.test/unreviewed.webp"]
        with self.assertRaises(ValueError):
            activation.validate_publication(*inputs)
        inputs = list(fixture())
        inputs[2]["faces"][-1] = copy.deepcopy(inputs[2]["faces"][0])
        with self.assertRaises(ValueError):
            activation.validate_publication(*inputs)

    def test_other_collections_and_legacy_colour_fields_are_unchanged(self):
        descriptors = activation.validate_publication(*fixture())
        source = json.loads((activation.REPO / "randal-general/src/manufacturer-surfaces.json").read_text())
        before = copy.deepcopy(source)
        after = activation.apply_to_manifest(source, descriptors)
        self.assertEqual(source, before)
        for old, new in zip(before, after):
            if old["name"] != "Quercia" or old["brand"] != "ELIOS":
                self.assertEqual(old, new)
                continue
            for old_color, new_color in zip(old["colors"], new["colors"]):
                for key, value in old_color.items():
                    if key != "textureVariantsByReference":
                        self.assertEqual(new_color[key], value)
                refs = new_color["textureVariantsByReference"]
                self.assertEqual(len(refs), 2)
                self.assertEqual({item["format"] for item in refs.values()}, {"24x120", "20.3x90.6"})
                self.assertTrue(all(item["colorId"] == old_color["id"] for item in refs.values()))

    def test_other_collections_keep_their_literal_bytes(self):
        source = b'[ {"name":"Other","brand":"VIEW","number":1e-07},\n{"name":"Quercia","brand":"ELIOS","colors":[],"formats":[]}, {"name":"Other Elios","brand":"ELIOS","number":2.0} ]\n'
        updated = json.loads(source)
        updated[1]["test"] = "native"
        result = activation.replace_quercia_bytes(source, updated)
        self.assertTrue(result.startswith(b'[ {"name":"Other","brand":"VIEW","number":1e-07},\n'))
        self.assertTrue(result.endswith(b', {"name":"Other Elios","brand":"ELIOS","number":2.0} ]\n'))


if __name__ == "__main__":
    unittest.main()

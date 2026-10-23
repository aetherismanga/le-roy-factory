"""Offline fail-closed activation tests; synthetic URLs are never published or fetched."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import unittest
from urllib.parse import quote

TOOL = Path(__file__).with_name("apply_creta_hd.py")
spec = importlib.util.spec_from_file_location("apply_creta_hd", TOOL)
activation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(activation)


def fixture():
    mapping = json.loads((activation.REPO / "reports/elios-hd/reference-mapping.json").read_text())
    inventory = {"entries": []}
    publication = {"manufacturer": "ELIOS", "collection": "Creta", "enabled": False,
                   "baseTextureInventoryComplete": True, "collectionComplete": False,
                   "publicMediaChecksPassed": True, "reuseAuthorization": "confirmed-by-user",
                   "expectedBaseColors": 8, "expectedBaseReferences": 8, "expectedBaseFaces": 53,
                   "publishedCompleteFaces": 53, "faces": []}
    checks = {"allPassed": True, "publicURLsRewritten": False, "publishedVariantsChecked": 159, "assets": []}
    for reference, (color, fmt) in activation.REFERENCES.items():
        for filename in mapping["cretaVerified"][reference]["portalFaces"]:
            face_no = int(filename.split("@")[1].split(".")[0])
            entry = {"brand": "ELIOS", "collection": "creta", "reference": reference,
                     "colorId": color, "format": fmt, "face": face_no, "sourceFilename": filename,
                     "sourceSHA256": hashlib.sha256(filename.encode()).hexdigest(),
                     "identityVerified": True, "readyForIntegration": True,
                     "reuseAuthorization": "confirmed-by-user", "upscaled": False, "mirror": False,
                     "crop": None, "rotateClockwise": 90, "textureRotation": 0,
                     "nativeDimensions": [6000, 12000], "variants": {}}
            face = {key: entry[key] for key in ["reference", "colorId", "format", "face", "sourceFilename",
                                               "sourceSHA256", "reuseAuthorization", "rotateClockwise", "textureRotation"]}
            face.update({"sourceFormatCm": [60, 120], "renderDimensionsCm": [120, 60],
                         "enabled": False, "publishedAllThreeProfiles": True, "variants": {}})
            for profile, limit in {"fluid": 256, "balanced": 1024, "max": 4096}.items():
                name = reference + "-face-" + str(face_no) + "-" + profile + ".webp"
                variant = {"file": "creta/" + name, "width": limit, "height": limit // 2,
                           "bytes": 1000, "sha256": hashlib.sha256(name.encode()).hexdigest()}
                entry["variants"][profile] = variant
                key = "public-site-assets/configurator-materials/creta-offline-fixture/" + name
                url = "https://firebasestorage.googleapis.com/v0/b/le-roy-factory.firebasestorage.app/o/" + quote(key, safe="") + "?alt=media"
                face["variants"][profile] = [url]
                checks["assets"].append({"reference": reference, "face": face_no, "profile": profile,
                                         "passed": True, "urlSHA256": hashlib.sha256(url.encode()).hexdigest(),
                                         "expectedSHA256": variant["sha256"], "expectedBytes": variant["bytes"],
                                         "filename": name, "publishedFilename": name,
                                         "origins": [{"origin": origin, "passed": True, "httpStatus": 200,
                                                      "contentType": "image/webp", "corsReadable": True,
                                                      "sha256": variant["sha256"], "bytes": variant["bytes"]}
                                                     for origin in activation.ORIGINS]})
            inventory["entries"].append(entry)
            publication["faces"].append(face)
    return mapping, inventory, publication, checks


class CretaActivationTest(unittest.TestCase):
    def test_complete_base_inventory_has_exact_face_order_and_tiers(self):
        descriptors = activation.validate_publication(*fixture())
        self.assertEqual(len(descriptors), 8)
        self.assertEqual(sum(item["nativeFaceCount"] for item in descriptors.values()), 53)
        self.assertEqual(descriptors["03V6A20"]["nativeFaceCount"], 16)
        self.assertEqual(descriptors["03V6A90"]["nativeFaceCount"], 13)
        self.assertTrue(descriptors["03V6A20"]["textureVariants"]["max"][1].endswith("face-2-max.webp?alt=media"))

    def test_incomplete_base_faces_cannot_activate(self):
        inputs = list(fixture()); inputs[2]["faces"].pop()
        with self.assertRaises(ValueError): activation.validate_publication(*inputs)

    def test_decor_cannot_be_substituted_for_a_base(self):
        inputs = list(fixture()); inputs[0]["cretaVerified"]["03V6ADC"]["nativeTextureAssignmentAllowed"] = True
        with self.assertRaises(ValueError): activation.validate_publication(*inputs)

    def test_square_wrong_color_double_rotation_or_face_cannot_activate(self):
        for key, value in [("format", "60x60"), ("colorId", "coccio"), ("textureRotation", 90), ("face", 99)]:
            inputs = list(fixture()); inputs[2]["faces"][0][key] = value
            with self.assertRaises(ValueError): activation.validate_publication(*inputs)

    def test_duplicate_originals_or_upscaling_cannot_activate(self):
        inputs = list(fixture()); inputs[1]["entries"][1]["sourceSHA256"] = inputs[1]["entries"][0]["sourceSHA256"]
        with self.assertRaises(ValueError): activation.validate_publication(*inputs)
        inputs = list(fixture()); inputs[1]["entries"][0]["variants"]["max"]["width"] = 12001
        with self.assertRaises(ValueError): activation.validate_publication(*inputs)

    def test_square_source_or_stretched_variant_cannot_activate(self):
        inputs = list(fixture()); inputs[1]["entries"][0]["nativeDimensions"] = [12000, 12000]
        with self.assertRaises(ValueError): activation.validate_publication(*inputs)
        inputs = list(fixture()); inputs[1]["entries"][0]["variants"]["fluid"]["height"] = 256
        with self.assertRaises(ValueError): activation.validate_publication(*inputs)

    def test_failed_public_body_or_missing_origin_cannot_activate(self):
        for mutate in [lambda a: a.update(expectedSHA256="0" * 64), lambda a: a["origins"].pop(),
                       lambda a: a["origins"][0].update(httpStatus=403)]:
            inputs = list(fixture()); mutate(inputs[3]["assets"][0])
            with self.assertRaises(ValueError): activation.validate_publication(*inputs)

    def test_unreviewed_url_or_duplicate_published_face_cannot_activate(self):
        inputs = list(fixture()); inputs[2]["faces"][0]["variants"]["fluid"] = ["https://example.test/unreviewed.webp"]
        with self.assertRaises(ValueError): activation.validate_publication(*inputs)
        inputs = list(fixture()); inputs[2]["faces"][-1] = copy.deepcopy(inputs[2]["faces"][0])
        with self.assertRaises(ValueError): activation.validate_publication(*inputs)

    def test_other_collections_and_legacy_fields_are_unchanged(self):
        descriptors = activation.validate_publication(*fixture())
        source = json.loads((activation.REPO / "randal-general/src/manufacturer-surfaces.json").read_text())
        before = copy.deepcopy(source); after = activation.apply_to_manifest(source, descriptors)
        self.assertEqual(source, before)
        for old, new in zip(before, after):
            if old["name"] != "Creta" or old["brand"] != "ELIOS": self.assertEqual(old, new); continue
            for old_color, new_color in zip(old["colors"], new["colors"]):
                for key, value in old_color.items():
                    if key != "textureVariantsByReference": self.assertEqual(new_color[key], value)
                if old_color["id"] == "coccio": self.assertNotIn("textureVariantsByReference", new_color); continue
                self.assertEqual(len(new_color["textureVariantsByReference"]), 1)

    def test_other_collections_keep_literal_bytes(self):
        source = b'[ {"name":"Other","brand":"VIEW","number":1e-07},\n{"name":"Creta","brand":"ELIOS","colors":[],"formats":[]}, {"name":"Quercia","brand":"ELIOS","number":2.0} ]\n'
        updated = json.loads(source); updated[1]["test"] = "native"
        result = activation.replace_creta_bytes(source, updated)
        self.assertTrue(result.startswith(b'[ {"name":"Other","brand":"VIEW","number":1e-07},\n'))
        self.assertTrue(result.endswith(b', {"name":"Quercia","brand":"ELIOS","number":2.0} ]\n'))


if __name__ == "__main__": unittest.main()

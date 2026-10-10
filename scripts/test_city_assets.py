import hashlib
import importlib.util
import json
import re
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageCms
from shapely.geometry import Point, shape

from export_atlas import WEST, geometry_path
from export_city_photos import export_photo


ROOT = Path(__file__).resolve().parents[1]


class CityAssetsTest(unittest.TestCase):
    def test_region_topology_provenance_and_projection(self):
        features = json.loads((ROOT / "data/city-regions.geojson").read_text())["features"]
        compiled = json.loads((ROOT / "art/city-regions.json").read_text())
        places = json.loads((ROOT / "places.json").read_text())["places"]
        self.assertEqual(compiled["west"], WEST)
        expected = {"beijing": (110000, 1), "nanjing": (320100, 2),
                    "suzhou": (320500, 1), "singapore": (None, 47)}
        self.assertEqual({f["properties"]["id"] for f in features}, set(expected))
        regions = {region["id"]: region for region in compiled["regions"]}
        for feature in features:
            properties = feature["properties"]
            identifier = properties["id"]
            with self.subTest(city=identifier):
                geometry = shape(feature["geometry"])
                self.assertTrue(geometry.is_valid and not geometry.is_empty)
                polygons = [geometry] if geometry.geom_type == "Polygon" else list(geometry.geoms)
                adcode, components = expected[identifier]
                self.assertEqual(len(polygons), components)
                self.assertEqual(properties["components"], components)
                self.assertEqual(properties.get("adcode"), adcode)
                self.assertRegex(properties["sourceSha256"], r"^[0-9a-f]{64}$")
                self.assertTrue(properties["source"].startswith("https://"))
                path = geometry_path(feature["geometry"])
                self.assertEqual(regions[identifier]["path"], path)
                self.assertEqual(path.count("M"), sum(1 + len(p.interiors) for p in polygons))
                coordinates = [(float(x), float(y)) for x, y in re.findall(r"([\d.]+),([\d.]+)", path)]
                projected = [min(x for x, _ in coordinates), min(y for _, y in coordinates),
                             max(x for x, _ in coordinates), max(y for _, y in coordinates)]
                self.assertEqual(regions[identifier]["bounds"], projected)
                place, = [place for place in places if place["region"] == identifier]
                self.assertTrue(geometry.covers(Point(place["longitude"], place["latitude"])))
                if identifier == "singapore":
                    self.assertIn("planning", properties["description"])
                    self.assertIn("not a territorial-water boundary", properties["description"])
                    self.assertEqual(regions[identifier]["credit"]["licenseUrl"], properties["license"])
                else:
                    self.assertIn("GCJ-02", properties["coordinateSystem"])

    def test_owner_exports_match_dimensions_and_have_no_private_metadata(self):
        places = json.loads((ROOT / "places.json").read_text())["places"]
        for city in ("beijing", "nanjing", "suzhou"):
            place, = [place for place in places if place["id"] == city]
            self.assertEqual(len(place["photos"]), 7)
            for photo in place["photos"]:
                with self.subTest(photo=photo["src"]), Image.open(ROOT / photo["src"]) as image:
                    self.assertEqual(image.format, "WEBP")
                    self.assertEqual(image.size, (photo["width"], photo["height"]))
                    self.assertEqual(max(image.size), 1600)
                    self.assertFalse(image.getexif())
                    self.assertFalse({"exif", "xmp", "icc_profile"} & image.info.keys())
                    self.assertEqual(image.n_frames, 1)

    @unittest.skipUnless(importlib.util.find_spec("pillow_heif"), "HEIC authoring requires pillow-heif")
    def test_heic_export_preserves_portrait_and_strips_metadata(self):
        from pillow_heif import register_heif_opener

        register_heif_opener()
        with tempfile.TemporaryDirectory() as temporary:
            source = Path(temporary) / "oriented.heic"
            destination = Path(temporary) / "clean.webp"
            image = Image.new("RGB", (40, 80), "red")
            image.paste("green", (0, 40, 40, 80))
            exif = Image.Exif()
            exif[315] = "Synthetic private metadata"
            image.save(source, "HEIF", exif=exif)
            original_hash = hashlib.sha256(source.read_bytes()).hexdigest()
            result = export_photo(source, destination)
            self.assertEqual((result["width"], result["height"]), (40, 80))
            self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(), original_hash)
            with Image.open(destination) as exported:
                self.assertFalse(exported.getexif())
                self.assertFalse({"exif", "xmp", "icc_profile"} & exported.info.keys())
                self.assertEqual(exported.n_frames, 1)
                self.assertGreater(exported.getpixel((20, 10))[0], 200)
                self.assertGreater(exported.getpixel((20, 70))[1], 100)

    def test_export_orients_pixels_strips_metadata_and_preserves_source(self):
        with tempfile.TemporaryDirectory() as temporary:
            source = Path(temporary) / "oriented.jpg"
            destination = Path(temporary) / "clean.webp"
            image = Image.new("RGB", (80, 40), "red")
            image.paste("green", (40, 0, 80, 40))
            exif = Image.Exif()
            exif[274] = 6
            exif[315] = "Synthetic private metadata"
            profile = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()
            image.save(source, exif=exif, icc_profile=profile)
            original_hash = hashlib.sha256(source.read_bytes()).hexdigest()
            result = export_photo(source, destination)
            self.assertEqual((result["width"], result["height"]), (40, 80))
            self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(), original_hash)
            with Image.open(destination) as exported:
                self.assertFalse(exported.getexif())
                self.assertFalse({"exif", "xmp", "icc_profile"} & exported.info.keys())
                self.assertGreater(exported.getpixel((20, 10))[0], 200)
                self.assertGreater(exported.getpixel((20, 70))[1], 100)
            with self.assertRaises(FileExistsError):
                export_photo(source, destination)
            with self.assertRaises(ValueError):
                export_photo(source, Path(temporary) / "wrong.png")


if __name__ == "__main__":
    unittest.main()

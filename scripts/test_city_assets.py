import hashlib
import importlib.util
import json
import re
import tempfile
import unittest
import zipfile
from pathlib import Path

from PIL import Image, ImageCms
from shapely.geometry import Point, shape

from export_atlas import WEST, geometry_path
from export_city_photos import export_photo
from export_city_regions import JAPAN_SOURCES, load_source


ROOT = Path(__file__).resolve().parents[1]


class CityAssetsTest(unittest.TestCase):
    def test_on_demand_index_preserves_every_outline(self):
        complete = json.loads((ROOT / "art/city-regions.json").read_text())
        index = json.loads((ROOT / "art/city-index.json").read_text())
        self.assertLess((ROOT / "art/city-index.json").stat().st_size, 5000)
        self.assertEqual(index["west"], complete["west"])
        self.assertEqual(len(index["regions"]), len(complete["regions"]))
        for entry, original in zip(index["regions"], complete["regions"]):
            self.assertEqual(entry["id"], original["id"])
            self.assertEqual(entry["bounds"], original["bounds"])
            self.assertEqual(entry.get("credit"), original.get("credit"))
            self.assertNotIn("path", entry)
            outline = json.loads((ROOT / entry["pathFile"]).read_text())
            self.assertEqual(outline, {"id": original["id"], "path": original["path"]})

    def test_mobile_photos_preserve_composition_without_private_metadata(self):
        places = json.loads((ROOT / "places.json").read_text())["places"]
        original_bytes = mobile_bytes = 0
        for place in places:
            for photo in place["photos"]:
                with self.subTest(photo=photo["src"]):
                    source, target = ROOT / photo["src"], ROOT / photo["mobileSrc"]
                    original_bytes += source.stat().st_size
                    mobile_bytes += target.stat().st_size
                    with Image.open(source) as original, Image.open(target) as image:
                        self.assertLessEqual(max(image.size), 768)
                        self.assertAlmostEqual(image.width / image.height,
                                               original.width / original.height, delta=.004)
                        self.assertFalse(image.getexif())
                        self.assertFalse({"exif", "xmp", "icc_profile"} & image.info.keys())
                        self.assertEqual(image.n_frames, 1)
        self.assertLess(mobile_bytes, original_bytes * .3)

    def test_region_topology_provenance_and_projection(self):
        features = json.loads((ROOT / "data/city-regions.geojson").read_text())["features"]
        compiled = json.loads((ROOT / "art/city-regions.json").read_text())
        places = json.loads((ROOT / "places.json").read_text())["places"]
        self.assertEqual(compiled["west"], WEST)
        expected = {"beijing": (110000, 1), "nanjing": (320100, 2),
                    "suzhou": (320500, 1), "singapore": (None, 47),
                    "hangzhou": (330100, 1), "shanghai": (310000, 11),
                    "wuxi": (320200, 1), "tokyo": (None, 86),
                    "osaka": (None, 16), "okinawa": (None, 4833)}
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
                elif identifier in JAPAN_SOURCES:
                    self.assertIn("JGD2011", properties["coordinateSystem"])
                    self.assertEqual(properties["sourceDate"], "2018-01-01")
                    self.assertEqual(regions[identifier]["credit"]["licenseUrl"], properties["license"])
                    self.assertIn("adapted", regions[identifier]["credit"]["label"])
                    if identifier in ("tokyo", "osaka"):
                        self.assertEqual(set(properties["municipalityCodes"]), JAPAN_SOURCES[identifier][2])
                        outside = (139.32, 35.66) if identifier == "tokyo" else (135.48, 34.57)
                        self.assertFalse(geometry.covers(Point(*outside)))
                else:
                    self.assertIn("GCJ-02", properties["coordinateSystem"])

    def test_owner_exports_match_dimensions_and_have_no_private_metadata(self):
        places = json.loads((ROOT / "places.json").read_text())["places"]
        expected = {"beijing": 7, "nanjing": 7, "suzhou": 7, "hangzhou": 7, "shanghai": 5,
                    "wuxi": 7, "tokyo": 6, "osaka": 13, "okinawa": 4}
        self.assertEqual(sum(expected.values()), 63)
        for city, count in expected.items():
            place, = [place for place in places if place["id"] == city]
            self.assertEqual(len(place["photos"]), count)
            for photo in place["photos"]:
                with self.subTest(photo=photo["src"]), Image.open(ROOT / photo["src"]) as image:
                    self.assertEqual(image.format, "WEBP")
                    self.assertEqual(image.size, (photo["width"], photo["height"]))
                    self.assertEqual(max(image.size), 1600)
                    self.assertFalse(image.getexif())
                    self.assertFalse({"exif", "xmp", "icc_profile"} & image.info.keys())
                    self.assertEqual(image.n_frames, 1)

    def test_travel_groups_keep_one_primary_city_and_no_residence_identity(self):
        places = {place["id"]: place for place in json.loads((ROOT / "places.json").read_text())["places"]}
        self.assertEqual({key for key, place in places.items() if place.get("residence")},
                         {"beijing", "nanjing", "suzhou", "singapore"})
        self.assertEqual(places["hangzhou"]["name"], {"en": "Hangzhou", "zh": "\u676d\u5dde"})
        self.assertEqual(places["hangzhou"]["albumTitle"],
                         {"en": "Hangzhou & Shaoxing", "zh": "\u676d\u5dde \u00b7 \u7ecd\u5174"})
        self.assertEqual(places["tokyo"]["albumTitle"]["en"], "Tokyo, Yokohama & Mount Fuji")
        self.assertEqual(places["osaka"]["albumTitle"]["en"], "Osaka, Kyoto, Nara & Kobe")
        for secondary in ("shaoxing", "yokohama", "mount-fuji", "kyoto", "nara", "kobe"):
            self.assertNotIn(secondary, places)
        for city in ("hangzhou", "shanghai", "wuxi", "tokyo", "osaka", "okinawa"):
            self.assertFalse(places[city]["residence"])
            self.assertNotIn("institution", places[city])
            self.assertEqual(places[city]["region"], city)

    def test_japanese_source_selection_and_rejection(self):
        prefecture, name, codes, _ = JAPAN_SOURCES["tokyo"]
        source = {
            "type": "FeatureCollection",
            "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:EPSG::6668"}},
            "features": [
                {"type": "Feature", "properties": {"N03_001": name, "N03_007": str(code)}}
                for code in sorted(codes | {13201})
            ],
        }
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)

            def write_source():
                with zipfile.ZipFile(directory / "tokyo.zip", "w") as archive:
                    archive.writestr(
                        f"N03-180101_{prefecture}_GML/N03-18_{prefecture}_180101.geojson",
                        json.dumps(source),
                    )

            write_source()
            features, provenance = load_source(directory, "tokyo", None)
            self.assertEqual(len(features), 23)
            self.assertEqual(provenance["municipalityCodes"], sorted(codes))
            self.assertEqual(provenance["sourceDate"], "2018-01-01")
            source["features"].pop(0)
            write_source()
            with self.assertRaisesRegex(ValueError, "Incomplete Japanese ward selection"):
                load_source(directory, "tokyo", None)
            source["features"][0]["properties"]["N03_001"] = "Wrong prefecture"
            write_source()
            with self.assertRaisesRegex(ValueError, "Wrong Japanese prefecture"):
                load_source(directory, "tokyo", None)
            source["crs"]["properties"]["name"] = "EPSG:4326"
            write_source()
            with self.assertRaisesRegex(ValueError, "Unexpected Japanese source coordinate system"):
                load_source(directory, "tokyo", None)

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

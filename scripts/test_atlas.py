import hashlib
import json
import re
import unittest
from pathlib import Path

from export_atlas import WEST, geometry_path


ROOT = Path(__file__).resolve().parents[1]


def inside_ring(point, ring):
    x, y = point
    inside = False
    for (ax, ay), (bx, by) in zip(ring, ring[1:]):
        if (ay > y) != (by > y) and x < (bx - ax) * (y - ay) / (by - ay) + ax:
            inside = not inside
    return inside


class AtlasTest(unittest.TestCase):
    def test_pinned_complete_china_source(self):
        raw = (ROOT / "data/china-outline.geojson").read_bytes()
        self.assertEqual(hashlib.sha256(raw).hexdigest(),
                         "83ac502aeac66a5527607ec844169418505d990f1a2dc33226743643541eed3c")
        feature, = json.loads(raw)["features"]
        self.assertEqual(feature["properties"]["adcode"], 100000)
        polygons = feature["geometry"]["coordinates"]
        self.assertEqual(len(polygons), 277)
        self.assertEqual(geometry_path(feature["geometry"]).count("M"), len(polygons))
        self.assertIn(geometry_path(feature["geometry"]), (ROOT / "art/atlas-china.svg").read_text())
        for name, point in {
            "Taiwan": (121, 23.7),
            "Zangnan": (94.7, 28.2),
            "Aksai Chin": (79.3, 35),
            "Hong Kong": (114.17, 22.32),
            "Macao": (113.55, 22.18),
            "Hainan": (110, 19),
        }.items():
            with self.subTest(region=name):
                self.assertTrue(any(inside_ring(point, rings[0]) and
                                    not any(inside_ring(point, hole) for hole in rings[1:])
                                    for rings in polygons))

    def test_east_china_and_japan_camera(self):
        css = (ROOT / "folio.css").read_text()
        number = lambda name: float(re.search(rf"--atlas-{name}: ([\d.-]+);", css).group(1))
        zoom, x_offset, y_offset = map(number, ("zoom", "x", "y"))
        self.assertAlmostEqual(zoom, 8)
        self.assertAlmostEqual((128 - WEST) / 360 * 1000 * zoom + x_offset, 500, places=3)
        self.assertAlmostEqual((90 - 34.5) / 180 * 500 * zoom + y_offset, 250, places=3)
        places = json.loads((ROOT / "places.json").read_text())["places"]
        for place in places:
            x = (place["longitude"] - WEST) / 360 * 1000 * zoom + x_offset
            y = (90 - place["latitude"]) / 180 * 500 * zoom + y_offset
            with self.subTest(city=place["id"]):
                if place["id"] == "singapore":
                    self.assertGreater(y, 500)
                else:
                    self.assertTrue(80 < x < 920 and 40 < y < 460)
        self.assertLess((90 - WEST) / 360 * 1000 * zoom + x_offset, 0)

    def test_pacific_order_and_projection_agreement(self):
        css = (ROOT / "folio.css").read_text()
        self.assertIn(f"--atlas-west: {WEST};", css)
        project = lambda lon: ((lon - WEST) % 360) / 360 * 1000
        self.assertLess(project(105), project(180))
        self.assertLess(project(180), project(-100))
        self.assertTrue(450 < project(180) < 650)

    def test_seam_is_clipped_not_connected_across_world(self):
        ring = [[-40, 10], [-20, 10], [-20, 20], [-40, 20], [-40, 10]]
        paths = geometry_path({"type": "Polygon", "coordinates": [ring]}).split("M")[1:]
        self.assertEqual(len(paths), 2)
        for path in paths:
            xs = [float(x) for x in re.findall(r"([\d.]+),", path)]
            self.assertGreaterEqual(min(xs), 0)
            self.assertLessEqual(max(xs), 1000)
            self.assertLess(max(xs) - min(xs), 30)

    def test_hole_is_preserved(self):
        ring = [[10, 10], [20, 10], [20, 20], [10, 20], [10, 10]]
        hole = [[12, 12], [18, 12], [18, 18], [12, 18], [12, 12]]
        self.assertEqual(geometry_path({"type": "Polygon", "coordinates": [ring, hole]}).count("M"), 2)

    def test_invalid_geometry_fails_explicitly(self):
        with self.assertRaises(ValueError):
            geometry_path({"type": "LineString", "coordinates": [[0, 0], [1, 1]]})
        with self.assertRaises(ValueError):
            geometry_path({"type": "Polygon", "coordinates": [[[0, 0], [1, float("nan")], [0, 0]]]})


if __name__ == "__main__":
    unittest.main()

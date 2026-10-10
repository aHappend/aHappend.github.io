import hashlib
import json
import re
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

from shapely.geometry import Point, Polygon, box, mapping

from export_atlas import WEST, geometry_path, shared_world_geometry


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

    def test_shared_world_contains_the_exact_china_path_once(self):
        china, = json.loads((ROOT / "data/china-outline.geojson").read_text())["features"]
        world = ET.parse(ROOT / "art/atlas-world.svg").getroot()
        land = world.find(".//*[@id='atlas-land']")
        self.assertIsNotNone(land)
        self.assertEqual(len(land), 2)
        self.assertEqual(land.find("*[@id='atlas-china-land']").get("d"),
                         geometry_path(china["geometry"]))
        foreign = land.find("*[@id='atlas-other-land']").get("d")
        rings = [[[float(value) for value in point.split(",")] for point in ring.split("L")]
                 for ring in re.findall(r"M([^MZ]+)Z", foreign)]
        for name, lon, lat, expected in [
            ("Taiwan", 121, 23.7, False), ("Zangnan", 94.7, 28.2, False),
            ("Aksai Chin", 79.3, 35, False), ("Hainan", 110, 19, False),
            ("Hong Kong", 114.17, 22.32, False), ("Macao", 113.55, 22.18, False),
            ("Tokyo", 139.7, 35.7, True), ("Moscow", 37.6, 55.75, True),
        ]:
            with self.subTest(region=name):
                point = (((lon - WEST) % 360) / 360 * 1000, (90 - lat) / 180 * 500)
                self.assertEqual(sum(inside_ring(point, ring) for ring in rings) % 2, expected)

    def test_shared_boundaries_close_seams_but_preserve_lakes(self):
        old_mainland = box(0, 0, 6, 6)
        island = box(8, 0, 9, 1)
        neighbor = Polygon([(0, 6), (6, 6), (6, 10), (0, 10)],
                           [[(1, 7), (2, 7), (2, 8), (1, 8)]])
        china = (old_mainland.difference(box(2, 5.6, 4, 6))
                 .difference(box(1, 1, 2, 2)).union(box(4, 6, 5, 7)).union(island))
        features = [{"properties": {"ADM0_A3": code}, "geometry": mapping(geometry)}
                    for code, geometry in [("CHN", old_mainland), ("TWN", island), ("OTHER", neighbor)]]
        foreign = shared_world_geometry(features, mapping(china))
        self.assertTrue(foreign.is_valid)
        self.assertAlmostEqual(foreign.intersection(china).area, 0)
        self.assertTrue(foreign.contains(Point(3, 5.8)), "Do not leave an inland border crack")
        self.assertFalse(foreign.contains(Point(1.5, 7.5)), "Preserve the original lake")
        self.assertFalse(foreign.contains(Point(1.5, 1.5)), "Preserve the China source hole")
        self.assertFalse(foreign.contains(Point(8.5, .5)), "Do not duplicate the Taiwan geometry")
        self.assertFalse(foreign.contains(Point(6.01, 5)), "Do not extend the coast")

    def test_map_uses_direct_coloring_without_a_long_tooltip(self):
        html = (ROOT / "index.html").read_text()
        self.assertNotIn("atlas-china-mask", html)
        self.assertNotIn("atlas-world-mask", html)
        self.assertNotIn("atlas-map-title", html)
        self.assertIn('class="atlas-map" viewBox="0 0 1000 500" role="img" aria-label="World map"', html)
        self.assertIn('data-en="China" data-zh="中国">China</button>', html)
        self.assertIn('#atlas-china-land" fill="url(#atlas-china-pigment)"', html)
        self.assertNotIn("art/atlas-china.svg", html)

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

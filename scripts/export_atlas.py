"""Export shared world geometry and the pinned Chinese-view reference.

World: ne_110m_admin_0_countries.geojson, natural-earth-vector commit
ca96624a56bd078437bca8184e78163e5039ad19.
License: https://www.naturalearthdata.com/about/terms-of-use/
China: https://geo.datav.aliyun.com/areas_v3/bound/100000.json
Reference: https://dnr.yn.gov.cn/html/2023/mtbd_0828/42854.html
Keep all 277 outline components, including islands and maritime indicators.
This illustrative export is not an officially reviewed standard map.
"""

import argparse
import hashlib
import json
import math
from pathlib import Path

from shapely import get_parts, make_valid, union_all
from shapely.geometry import Polygon, mapping, shape


WEST = -30
WORLD_SHA256 = "6866c877d39cba9c357620878839b336d569f8c662d3cfab4cb1dbe2d39c977f"
CHINA_TOLERANCE = 0.16


def clip_ring(ring, boundary, keep_right):
    result = []
    previous = ring[-1]
    for current in ring:
        previous_inside = previous[0] >= boundary if keep_right else previous[0] <= boundary
        current_inside = current[0] >= boundary if keep_right else current[0] <= boundary
        if previous_inside != current_inside:
            ratio = (boundary - previous[0]) / (current[0] - previous[0])
            result.append([boundary, previous[1] + ratio * (current[1] - previous[1])])
        if current_inside:
            result.append(current)
        previous = current
    return result


def geometry_path(geometry):
    polygons = geometry["coordinates"]
    if geometry["type"] == "Polygon":
        polygons = [polygons]
    elif geometry["type"] != "MultiPolygon":
        raise ValueError(f"Unsupported geometry: {geometry['type']}")
    rings = []
    for polygon in polygons:
        for source_ring in polygon:
            if any(not math.isfinite(value) for point in source_ring for value in point):
                raise ValueError("Invalid geographic coordinate")
            # Clip both sides of the new seam instead of drawing wraparound chords.
            for shift in (-360, 0, 360):
                ring = [[lon + shift, lat] for lon, lat in source_ring]
                ring = clip_ring(ring, WEST, True)
                if ring:
                    ring = clip_ring(ring, WEST + 360, False)
                if len(ring) < 3:
                    continue
                points = []
                for lon, lat in ring:
                    if not -90 <= lat <= 90:
                        raise ValueError("Invalid latitude")
                    points.append(f"{(lon - WEST) / 360 * 1000:.4f},{(90 - lat) / 180 * 500:.4f}")
                rings.append("M" + "L".join(points) + "Z")
    return "".join(rings)


def polygonal_coverage(geometry):
    # Source files and the exact reference export remain untouched.
    parts = [part for part in get_parts(make_valid(geometry))
             if part.geom_type in ("Polygon", "MultiPolygon")]
    coverage = union_all(parts)
    if coverage.is_empty or not coverage.is_valid:
        raise ValueError("Expected valid polygonal geographic coverage")
    return coverage


def interior_coverage(geometry):
    return union_all([Polygon(ring) for polygon in get_parts(geometry)
                      for ring in polygon.interiors])


def low_detail_china(geometry):
    parts = []
    for rings in geometry["coordinates"]:
        source = polygonal_coverage(Polygon(rings[0], rings[1:]))
        x1, y1, x2, y2 = source.bounds
        # Small islands and maritime indicators keep their footprint at this scale.
        tolerance = min(CHINA_TOLERANCE, (x2 - x1) / 8, (y2 - y1) / 8,
                        source.area / source.length * .5)
        parts.append(source.simplify(tolerance, preserve_topology=True))
    result = union_all(parts)
    if result.is_empty or not result.is_valid:
        raise ValueError("Invalid low-detail China coverage")
    return mapping(result)


def shared_world_geometry(features, china_geometry):
    countries = [(feature["properties"]["ADM0_A3"], polygonal_coverage(shape(feature["geometry"])))
                 for feature in features]
    if not countries:
        raise ValueError("Expected world geometry")
    world = union_all([geometry for _, geometry in countries])
    china = polygonal_coverage(shape(china_geometry))
    foreign = union_all([geometry for code, geometry in countries
                         if code not in {"CHN", "TWN", "HKG", "MAC"}]).difference(china)
    joined = foreign.union(china)
    # Close enclosed border seams introduced by replacing the coarse outline,
    # without filling original lakes or holes in the pinned China coverage.
    water = interior_coverage(world).union(interior_coverage(china))
    seams = interior_coverage(joined).difference(water).intersection(world)
    foreign = foreign.union(seams)
    if not foreign.is_valid or foreign.intersection(china).area > 1e-9:
        raise ValueError("Shared world geometry overlaps the China coverage")
    return foreign


def export(source, china_source):
    source_bytes = source.read_bytes()
    if hashlib.sha256(source_bytes).hexdigest() != WORLD_SHA256:
        raise ValueError("World source changed; use the pinned Natural Earth input")
    data = json.loads(source_bytes)
    china_bytes = china_source.read_bytes()
    if hashlib.sha256(china_bytes).hexdigest() != "83ac502aeac66a5527607ec844169418505d990f1a2dc33226743643541eed3c":
        raise ValueError("China source changed; review its full geographic coverage before updating the hash")
    china_data = json.loads(china_bytes)
    feature, = china_data["features"]
    if feature["properties"]["adcode"] != 100000 or len(feature["geometry"]["coordinates"]) != 277:
        raise ValueError("Expected the complete pinned Chinese outline")
    reference = geometry_path(feature["geometry"])
    simplified = low_detail_china(feature["geometry"])
    china = geometry_path(simplified)
    foreign = geometry_path(mapping(shared_world_geometry(data["features"], simplified)))
    root = Path(__file__).resolve().parents[1] / "art"
    header = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 500" fill="white">\n'
    (root / "atlas-world.svg").write_text(
        header
        + '<!-- Natural Earth + simplified DataV.GeoAtlas Chinese-view outline. Generated by scripts/export_atlas.py. -->\n'
        + '<g id="atlas-land">\n'
        + f'<path id="atlas-other-land" fill-rule="evenodd" d="{foreign}"/>\n'
        + f'<path id="atlas-china-land" fill-rule="evenodd" d="{china}"/>\n'
        + '</g>\n</svg>\n'
    )
    (root / "atlas-china.svg").write_text(
        header
        + '<!-- DataV.GeoAtlas, Chinese-view outline. Generated by scripts/export_atlas.py. -->\n'
        + f'<path fill-rule="evenodd" d="{reference}"/>\n</svg>\n'
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Pinned Natural Earth world GeoJSON")
    parser.add_argument("china_source", type=Path, help="Pinned DataV China outline GeoJSON")
    args = parser.parse_args()
    export(args.source, args.china_source)

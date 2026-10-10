"""Compile city-region outlines from DataV and URA source GeoJSON (requires Shapely)."""

import argparse
import hashlib
import json
from pathlib import Path

from shapely import force_2d, get_num_geometries, union_all
from shapely.geometry import mapping, shape

from export_atlas import WEST, geometry_path


ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    "beijing": (110000, "Beijing"),
    "nanjing": (320100, "Nanjing"),
    "suzhou": (320500, "Suzhou"),
    "singapore": (None, "Singapore"),
}
SINGAPORE_SOURCE = "https://data.gov.sg/datasets/d_2cc750190544007400b2cfd5d7f53209/view"
SINGAPORE_LICENSE = "https://data.gov.sg/open-data-licence"


def compile_regions(source_directory, accessed):
    features = []
    regions = []
    for identifier, (adcode, name) in SOURCES.items():
        raw = (source_directory / f"{identifier}.json").read_bytes()
        source = json.loads(raw)
        if source.get("type") != "FeatureCollection" or not source["features"]:
            raise ValueError(f"Expected a nonempty region collection: {identifier}")
        if adcode is not None and (
            len(source["features"]) != 1
            or source["features"][0]["properties"].get("adcode") != adcode
        ):
            raise ValueError(f"Wrong administrative unit: {identifier}")
        geometries = [force_2d(shape(feature["geometry"])) for feature in source["features"]]
        if any(not geometry.is_valid or geometry.is_empty for geometry in geometries):
            raise ValueError(f"Invalid source geometry: {identifier}")
        dissolved = union_all(geometries)
        simplified = dissolved.simplify(.00005, preserve_topology=True)
        if (
            not simplified.is_valid
            or simplified.geom_type not in ("Polygon", "MultiPolygon")
            or get_num_geometries(dissolved) != get_num_geometries(simplified)
            or abs(dissolved.area - simplified.area) / dissolved.area > .001
        ):
            raise ValueError(f"Simplification changed region coverage: {identifier}")
        geometry = dict(mapping(simplified))
        footprint = simplified
        west, south, east, north = footprint.bounds
        if not 100 < west < east < 123 or not 0 < south < north < 43:
            raise ValueError(f"Unexpected region extent: {identifier}")
        properties = {
            "id": identifier,
            "name": name,
            "source": f"https://geo.datav.aliyun.com/areas_v3/bound/{adcode}.json"
            if adcode else SINGAPORE_SOURCE,
            "sourceSha256": hashlib.sha256(raw).hexdigest(),
            "accessed": accessed,
            "coordinateSystem": "GCJ-02 (DataV source)" if adcode else "WGS84",
            "components": int(get_num_geometries(footprint)),
        }
        if adcode:
            properties["adcode"] = adcode
        else:
            properties.update({
                "description": "Dissolved URA Master Plan 2025 planning areas, no sea; an indicative planning footprint, not a territorial-water boundary.",
                "license": SINGAPORE_LICENSE,
            })
        features.append({"type": "Feature", "properties": properties, "geometry": geometry})
        region = {
            "id": identifier,
            "bounds": [
                round((west - WEST) / 360 * 1000, 4),
                round((90 - north) / 180 * 500, 4),
                round((east - WEST) / 360 * 1000, 4),
                round((90 - south) / 180 * 500, 4),
            ],
            "path": geometry_path(geometry),
        }
        if not adcode:
            region["credit"] = {
                "source": SINGAPORE_SOURCE,
                "label": "URA / MP2025",
                "license": "Singapore Open Data Licence",
                "licenseUrl": SINGAPORE_LICENSE,
            }
        regions.append(region)
        print(f"{identifier}: {properties['components']} components; {len(region['path'])} path bytes")

    (ROOT / "data/city-regions.geojson").write_text(json.dumps(
        {"type": "FeatureCollection", "features": features}, separators=(",", ":")
    ) + "\n")
    (ROOT / "art/city-regions.json").write_text(json.dumps(
        {"west": WEST, "regions": regions}, separators=(",", ":")
    ) + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source_directory", type=Path)
    parser.add_argument("--accessed", required=True, help="Source access date, YYYY-MM-DD")
    args = parser.parse_args()
    compile_regions(args.source_directory, args.accessed)

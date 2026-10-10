"""Compile DataV, URA and MLIT city-region outlines (requires Shapely)."""

import argparse
import hashlib
import io
import json
import zipfile
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
    "hangzhou": (330100, "Hangzhou"),
    "shanghai": (310000, "Shanghai"),
    "wuxi": (320200, "Wuxi"),
    "tokyo": (None, "Tokyo"),
    "osaka": (None, "Osaka"),
    "okinawa": (None, "Okinawa"),
}
SINGAPORE_SOURCE = "https://data.gov.sg/datasets/d_2cc750190544007400b2cfd5d7f53209/view"
SINGAPORE_LICENSE = "https://data.gov.sg/open-data-licence"
JAPAN_SOURCE = "https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-v2_3.html"
JAPAN_LICENSE = "https://nlftp.mlit.go.jp/ksj/other/agreement.html"
JAPAN_SOURCES = {
    "tokyo": (13, "\u6771\u4eac\u90fd", set(range(13101, 13124)),
              "Tokyo's 23 special wards; excludes western Tokyo and the distant islands."),
    "osaka": (27, "\u5927\u962a\u5e9c", set(range(27102, 27129)) - {27105, 27110, 27112},
              "Osaka City's 24 wards; not Osaka Prefecture or the other cities in the album."),
    "okinawa": (47, "\u6c96\u7e04\u770c", None,
                "Okinawa Prefecture's land footprint; not just the municipality named Okinawa."),
}


def load_source(source_directory, identifier, adcode):
    japanese = identifier in JAPAN_SOURCES
    raw = (source_directory / f"{identifier}.{'zip' if japanese else 'json'}").read_bytes()
    if japanese:
        prefecture, prefecture_name, selected_codes, description = JAPAN_SOURCES[identifier]
        archive_name = f"N03-180101_{prefecture}_GML"
        with zipfile.ZipFile(io.BytesIO(raw)) as archive:
            source = json.loads(archive.read(f"{archive_name}/N03-18_{prefecture}_180101.geojson"))
        if source.get("crs", {}).get("properties", {}).get("name") != "urn:ogc:def:crs:EPSG::6668":
            raise ValueError(f"Unexpected Japanese source coordinate system: {identifier}")
    else:
        source = json.loads(raw)
    if source.get("type") != "FeatureCollection" or not source.get("features"):
        raise ValueError(f"Expected a nonempty region collection: {identifier}")
    features = source["features"]
    properties = {"sourceSha256": hashlib.sha256(raw).hexdigest()}
    if japanese:
        if any(f["properties"].get("N03_001") != prefecture_name for f in features):
            raise ValueError(f"Wrong Japanese prefecture: {identifier}")
        if selected_codes is not None:
            features = [f for f in features if int(f["properties"].get("N03_007") or 0) in selected_codes]
            if {int(f["properties"]["N03_007"]) for f in features} != selected_codes:
                raise ValueError(f"Incomplete Japanese ward selection: {identifier}")
        properties.update({
            "source": f"https://nlftp.mlit.go.jp/ksj/gml/data/N03/N03-2018/{archive_name}.zip",
            "sourcePage": JAPAN_SOURCE,
            "sourceDate": "2018-01-01",
            "coordinateSystem": "JGD2011 geographic longitude/latitude (EPSG:6668)",
            "description": f"Derived and simplified from MLIT N03 (2018). {description}",
            "license": JAPAN_LICENSE,
            "licenseName": "Public Data License 1.0 (MLIT open-data terms)",
            "prefectureCode": prefecture,
        })
        if selected_codes is not None:
            properties["municipalityCodes"] = sorted(selected_codes)
    elif adcode is not None:
        if len(features) != 1 or features[0]["properties"].get("adcode") != adcode:
            raise ValueError(f"Wrong administrative unit: {identifier}")
        properties.update({
            "source": f"https://geo.datav.aliyun.com/areas_v3/bound/{adcode}.json",
            "coordinateSystem": "GCJ-02 (DataV source)",
            "adcode": adcode,
        })
    elif identifier == "singapore":
        properties.update({
            "source": SINGAPORE_SOURCE,
            "coordinateSystem": "WGS84",
            "description": "Dissolved URA Master Plan 2025 planning areas, no sea; an indicative planning footprint, not a territorial-water boundary.",
            "license": SINGAPORE_LICENSE,
        })
    else:
        raise ValueError(f"Unknown region source: {identifier}")
    return features, properties


def write_region_index(regions):
    directory = ROOT / "art/city-regions"
    directory.mkdir(exist_ok=True)
    index = []
    for region in regions:
        path = f"art/city-regions/{region['id']}.json"
        (ROOT / path).write_text(json.dumps(
            {"id": region["id"], "path": region["path"]}, separators=(",", ":")
        ) + "\n")
        index.append({key: value for key, value in region.items() if key != "path"} | {"pathFile": path})
    (ROOT / "art/city-index.json").write_text(json.dumps(
        {"west": WEST, "regions": index}, separators=(",", ":")
    ) + "\n")


def compile_regions(source_directory, accessed):
    features = []
    regions = []
    for identifier, (adcode, name) in SOURCES.items():
        source_features, provenance = load_source(source_directory, identifier, adcode)
        geometries = [force_2d(shape(feature["geometry"])) for feature in source_features]
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
        if not 100 < west < east < 141 or not 0 < south < north < 43:
            raise ValueError(f"Unexpected region extent: {identifier}")
        properties = {
            "id": identifier,
            "name": name,
            **provenance,
            "accessed": accessed,
            "components": int(get_num_geometries(footprint)),
        }
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
        if identifier == "singapore":
            region["credit"] = {
                "source": SINGAPORE_SOURCE,
                "label": "URA / MP2025",
                "license": "Singapore Open Data Licence",
                "licenseUrl": SINGAPORE_LICENSE,
            }
        elif identifier in JAPAN_SOURCES:
            region["credit"] = {
                "source": JAPAN_SOURCE,
                "label": "MLIT N03 / 2018 (adapted)",
                "license": "PDL 1.0",
                "licenseUrl": JAPAN_LICENSE,
            }
        regions.append(region)
        print(f"{identifier}: {properties['components']} components; {len(region['path'])} path bytes")

    (ROOT / "data/city-regions.geojson").write_text(json.dumps(
        {"type": "FeatureCollection", "features": features}, separators=(",", ":")
    ) + "\n")
    (ROOT / "art/city-regions.json").write_text(json.dumps(
        {"west": WEST, "regions": regions}, separators=(",", ":")
    ) + "\n")
    write_region_index(regions)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source_directory", type=Path)
    parser.add_argument("--accessed", required=True, help="Source access date, YYYY-MM-DD")
    args = parser.parse_args()
    compile_regions(args.source_directory, args.accessed)

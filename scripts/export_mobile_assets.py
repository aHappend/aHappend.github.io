"""Generate small, metadata-free mobile derivatives while preserving source assets."""

import json
from pathlib import Path
from urllib.request import urlopen

from PIL import Image

from export_city_photos import export_photo


ROOT = Path(__file__).resolve().parents[1]


def main():
    places_path = ROOT / "places.json"
    data = json.loads(places_path.read_text())
    total = 0
    for place in data["places"]:
        for photo in place["photos"]:
            target = ROOT / "photos/mobile" / (Path(photo["src"]).stem + ".webp")
            if not target.exists():
                export_photo(ROOT / photo["src"], target, max_edge=768, quality=78)
            photo["mobileSrc"] = target.relative_to(ROOT).as_posix()
            total += target.stat().st_size
    places_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    with Image.open(ROOT / "institutions/ntu-lockup.png") as source:
        image = source.convert("RGBA")
        image.thumbnail((360, 129), Image.Resampling.LANCZOS)
        image.save(ROOT / "institutions/ntu-lockup.webp", "WEBP", quality=88, method=6)
    with urlopen("https://avatars.githubusercontent.com/u/228031504?v=4&s=144", timeout=30) as response:
        with Image.open(response) as source:
            image = source.convert("RGB")
            image.thumbnail((144, 144), Image.Resampling.LANCZOS)
            clean = Image.new("RGB", image.size)
            clean.paste(image)
            clean.save(ROOT / "brand/avatar.webp", "WEBP", quality=85, method=6)
    print(f"Mobile photo derivatives: {total} bytes")


if __name__ == "__main__":
    main()

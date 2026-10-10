"""Export an oriented, sRGB city photograph without embedded source metadata."""

from __future__ import annotations

import argparse
import json
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageCms, ImageOps


def export_photo(source: Path, destination: Path, *, max_edge=1600, quality=85) -> dict:
    if destination.suffix.lower() != ".webp":
        raise ValueError("The destination must be a WebP file")
    if destination.exists():
        raise FileExistsError(f"Refusing to overwrite {destination}")
    if source.suffix.lower() in (".heic", ".heif"):
        from pillow_heif import register_heif_opener

        register_heif_opener()
    with Image.open(source) as original:
        original.seek(0)
        image = ImageOps.exif_transpose(original)
        profile = original.info.get("icc_profile")
        if profile:
            image = ImageCms.profileToProfile(
                image,
                ImageCms.ImageCmsProfile(BytesIO(profile)),
                ImageCms.createProfile("sRGB"),
                outputMode="RGB",
            )
        else:
            image = image.convert("RGB")
        image.thumbnail((max_edge, max_edge), Image.Resampling.LANCZOS)
        clean = Image.new("RGB", image.size)
        clean.paste(image)
        destination.parent.mkdir(parents=True, exist_ok=True)
        clean.save(destination, "WEBP", quality=quality, method=6)

    with Image.open(destination) as exported:
        if exported.getexif() or any(
            key in exported.info for key in ("exif", "xmp", "icc_profile")
        ):
            raise ValueError(f"Unexpected metadata in exported photo: {destination}")
        if getattr(exported, "n_frames", 1) != 1:
            raise ValueError(f"Expected only the primary photograph: {destination}")
        return {
            "src": destination.name,
            "width": exported.width,
            "height": exported.height,
            "bytes": destination.stat().st_size,
        }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    print(json.dumps(export_photo(args.source, args.destination)))

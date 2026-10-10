"""Bake the shared watercolor sun and moon into portable transparent sky images."""

from copy import deepcopy
from io import BytesIO
from pathlib import Path
import xml.etree.ElementTree as ET

from PIL import Image
from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
SIZE = 640
SVG = "{http://www.w3.org/2000/svg}"


def sky_document(source, name):
    drawing = ET.Element(f"{SVG}svg", {
        "viewBox": "1160 62 240 240", "width": str(SIZE), "height": str(SIZE),
    })
    definitions = deepcopy(source.find(f"{SVG}defs"))
    if name == "sun":
        definitions.append(deepcopy(source.find(f"{SVG}g[@id='sun-disc']")))
    drawing.append(definitions)
    ET.SubElement(drawing, f"{SVG}use", {"href": f"#{name}-disc"})
    ET.register_namespace("", "http://www.w3.org/2000/svg")
    return ET.tostring(drawing, encoding="unicode")


def main():
    source = ET.parse(ROOT / "art/painted-study.svg").getroot()
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel="chrome")
        page = browser.new_page(viewport={"width": SIZE, "height": SIZE}, device_scale_factor=1)
        for name in ("sun", "moon"):
            page.set_content(
                "<style>html,body{margin:0;background:transparent}svg{display:block}</style>"
                + sky_document(source, name)
            )
            image = Image.open(BytesIO(page.screenshot(omit_background=True))).convert("RGBA")
            alpha = image.getchannel("A")
            if alpha.getbbox() is None or max(alpha.getextrema()) < 128:
                raise ValueError(f"The {name} pigment did not render")
            for edge in (
                alpha.crop((0, 0, SIZE, 2)), alpha.crop((0, SIZE - 2, SIZE, SIZE)),
                alpha.crop((0, 0, 2, SIZE)), alpha.crop((SIZE - 2, 0, SIZE, SIZE)),
            ):
                if edge.getextrema()[1] > 2:
                    raise ValueError(f"The {name} must have transparent outer edges")
            target = ROOT / f"art/study-{name}.webp"
            image.save(target, "WEBP", quality=88, alpha_quality=85, method=6)
            image.resize((320, 320), Image.Resampling.LANCZOS).save(
                ROOT / f"art/study-{name}-mobile.webp", "WEBP",
                quality=82, alpha_quality=80, method=6,
            )
            print(f"Exported {name}: {SIZE}x{SIZE}, {target.stat().st_size} bytes")
        browser.close()


if __name__ == "__main__":
    main()

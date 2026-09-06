"""Optional asset-authoring utility; the website itself has no build step."""

from copy import deepcopy
from io import BytesIO
from pathlib import Path
import xml.etree.ElementTree as ET

from PIL import Image
from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
ET.register_namespace("", "http://www.w3.org/2000/svg")


def application_icon(source, scale):
    icon = deepcopy(source)
    icon.find(".//*[@id='tile']").attrib.pop("clip-path")
    icon.find(".//*[@id='lettering']").set(
        "transform", f"translate(64 64) scale({scale}) translate(-64 -64)"
    )
    return ET.tostring(icon, encoding="unicode")


def render(page, source, size):
    page.set_viewport_size({"width": size, "height": size})
    page.set_content(
        '<style>html,body{margin:0;background:transparent}'
        'svg{display:block;width:100vw;height:100vh}</style>' + source
    )
    return Image.open(BytesIO(page.screenshot(omit_background=True))).convert("RGBA")


def main():
    mark = ET.parse(ROOT / "brand/mark.svg").getroot()
    favicon = ET.tostring(ET.parse(ROOT / "favicon.svg").getroot(), encoding="unicode")
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel="chrome", args=["--no-sandbox"])
        page = browser.new_page(device_scale_factor=1, reduced_motion="reduce")
        favicons = {}
        for size in (16, 32, 48):
            favicons[size] = render(page, favicon, size)
            favicons[size].save(ROOT / f"favicon-{size}.png", optimize=True)
        favicons[48].save(
            ROOT / "favicon.ico",
            sizes=[(16, 16), (32, 32), (48, 48)],
            append_images=[favicons[16], favicons[32]],
            bitmap_format="bmp",
        )
        for size in (192, 512):
            render(page, application_icon(mark, .94), size).save(ROOT / f"icon-{size}.png", optimize=True)
            render(page, application_icon(mark, .78), size).save(ROOT / f"icon-maskable-{size}.png", optimize=True)
        render(page, application_icon(mark, .9), 180).save(ROOT / "apple-touch-icon.png", optimize=True)
        browser.close()
    print("Exported 16/32/48px favicons, ICO, Apple touch, and standard/maskable application icons.")


if __name__ == "__main__":
    main()

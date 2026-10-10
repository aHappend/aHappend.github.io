"""Bake the portrait's pigment filters once instead of repainting them on phones."""

from io import BytesIO
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]


def main():
    source = (ROOT / "art/painted-study-portrait.svg").read_text(encoding="utf-8")
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel="chrome")
        page = browser.new_page(viewport={"width": 720, "height": 1280}, device_scale_factor=1)
        page.set_content(
            "<style>html,body{margin:0;background:transparent}"
            "svg{display:block;width:100vw;height:100vh}</style>" + source
        )
        image = Image.open(BytesIO(page.screenshot(omit_background=True))).convert("RGBA")
        browser.close()
    alpha = image.getchannel("A")
    width, height = image.size
    for edge in (
        alpha.crop((0, 0, width, 2)), alpha.crop((0, height - 2, width, height)),
        alpha.crop((0, 0, 2, height)), alpha.crop((width - 2, 0, width, height)),
    ):
        if edge.getextrema()[1] > 2:
            raise ValueError("The portrait must fade to transparent on every outer edge")
    target = ROOT / "art/painted-study-portrait.webp"
    image.save(target, "WEBP", quality=80, alpha_quality=65, method=6)
    print(f"Exported {width}x{height} portrait watercolor with soft transparent edges: {target.stat().st_size} bytes")


if __name__ == "__main__":
    main()

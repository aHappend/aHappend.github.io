"""Bake the original paper filters for the moving map and postcard."""

from io import BytesIO
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]


def main():
    source = (ROOT / "art/studio-paper.svg").read_text(encoding="utf-8")
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel="chrome")
        page = browser.new_page(viewport={"width": 512, "height": 512}, device_scale_factor=1)
        page.set_content(
            "<style>html,body{margin:0;background:transparent}svg{display:block}</style>" + source
        )
        image = Image.open(BytesIO(page.screenshot(omit_background=True))).convert("RGBA")
        browser.close()
    if image.size != (512, 512) or not 0 < image.getchannel("A").getextrema()[1] < 128:
        raise ValueError("Expected the original translucent 512px paper tile")
    image = image.resize((256, 256), Image.Resampling.LANCZOS)
    target = ROOT / "art/studio-paper.webp"
    image.save(target, "WEBP", quality=85, method=6)
    print(f"Exported the original paper tile: {target.stat().st_size} bytes")


if __name__ == "__main__":
    main()

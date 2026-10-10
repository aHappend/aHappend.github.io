"""Self-host the site's OFL fonts, with Chinese glyphs subset to published text."""

import re
import subprocess
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "fonts"
AGENT = "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"


def download(url):
    with urlopen(Request(url, headers={"User-Agent": AGENT}), timeout=60) as response:
        return response.read()


def main():
    OUTPUT.mkdir(exist_ok=True)
    latin = download("https://fonts.googleapis.com/css2?"
        "family=DM+Mono:wght@400;500&family=Manrope:wght@400..800&"
        "family=Newsreader:ital,wght@0,500..600;1,500&display=swap").decode()
    blocks = re.findall(r"/\* latin \*/\s*(@font-face\s*\{[^}]+\})", latin)
    if len(blocks) != 5:
        raise ValueError(f"Expected five Latin font faces, got {len(blocks)}")
    text = "\n".join(path.read_text() for path in (
        ROOT / "index.html", ROOT / "script.js", ROOT / "city-atlas.js",
        ROOT / "photo-deck.js", ROOT / "places.json",
    ))
    characters = "".join(sorted({c for c in text if 0x2E80 <= ord(c) <= 0x9FFF
                                 or 0xF900 <= ord(c) <= 0xFAFF or 0xFF00 <= ord(c) <= 0xFFEF}))
    query = urlencode([
        ("family", "Noto Sans SC:wght@400..700"),
        ("family", "Noto Serif SC:wght@500..700"),
        ("display", "swap"), ("text", characters),
    ])
    chinese = re.findall(r"@font-face\s*\{[^}]+\}", download(
        "https://fonts.googleapis.com/css2?" + query).decode())
    if len(chinese) != 2:
        raise ValueError(f"Expected two Chinese font faces, got {len(chinese)}")
    coverage = "U+2E80-9FFF,U+F900-FAFF,U+FF00-FFEF"
    blocks.extend(re.sub(r"\s*unicode-range:[^;]+;", "", block).replace(
        "}", f"  unicode-range: {coverage};\n}}") for block in chinese)
    compiled = []
    for index, block in enumerate(blocks):
        url, = re.findall(r"url\((https://[^)]+)\)", block)
        data = download(url)
        if data[:4] != b"wOF2":
            raise ValueError(f"Expected WOFF2 from {url}")
        name = f"site-{index}.woff2"
        (OUTPUT / name).write_bytes(data)
        compiled.append(block.replace(url, name))
        print(f"{name}: {len(data)} bytes")
    (OUTPUT / "site-fonts.css").write_text("\n".join(compiled) + "\n")
    for family in ("dmmono", "manrope", "newsreader", "notosanssc", "notoserifsc"):
        license_text = subprocess.check_output([
            "gh", "api", f"repos/google/fonts/contents/ofl/{family}/OFL.txt",
            "-H", "Accept: application/vnd.github.raw+json",
        ])
        if b"SIL OPEN FONT LICENSE" not in license_text:
            raise ValueError(f"Missing OFL permission for {family}")
        (OUTPUT / f"{family}-LICENSE.txt").write_bytes(license_text)


if __name__ == "__main__":
    main()

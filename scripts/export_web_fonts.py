"""Self-host the site's OFL fonts, with Chinese glyphs subset to published text."""

import re
import subprocess
import tempfile
from hashlib import sha256
from pathlib import Path
from urllib.parse import urlencode


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "fonts"
AGENT = "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
CHINESE_CHUNK_SIZE = 600


def download(url):
    # A seekable output lets curl discard partial data before retrying.
    with tempfile.TemporaryDirectory(prefix="site-font-download-") as directory:
        output = Path(directory) / "response"
        subprocess.run([
            "curl", "--fail", "--silent", "--show-error", "--location",
            "--retry", "2", "--retry-all-errors", "--connect-timeout", "15",
            "--max-time", "90", "--user-agent", AGENT, "--output", str(output), url,
        ], check=True)
        return output.read_bytes()


def chinese_characters():
    text = "\n".join(path.read_text() for path in (
        ROOT / "index.html", ROOT / "script.js", ROOT / "city-atlas.js",
        ROOT / "photo-deck.js", ROOT / "places.json",
    ))
    return "".join(sorted({c for c in text if 0x2E80 <= ord(c) <= 0x9FFF
                           or 0xF900 <= ord(c) <= 0xFAFF or 0xFF00 <= ord(c) <= 0xFFEF}))


def chinese_font_blocks(characters):
    blocks = []
    # Large text requests can silently return the entire, unsubsetted families.
    for start in range(0, len(characters), CHINESE_CHUNK_SIZE):
        chunk = characters[start:start + CHINESE_CHUNK_SIZE]
        query = urlencode([
            ("family", "Noto Sans SC:wght@400..700"),
            ("family", "Noto Serif SC:wght@500..700"),
            ("display", "swap"), ("text", chunk),
        ])
        faces = re.findall(r"@font-face\s*\{[^}]+\}", download(
            "https://fonts.googleapis.com/css2?" + query).decode())
        if len(faces) != 2:
            raise ValueError(f"Expected two Chinese font faces for chunk {start}, got {len(faces)}")
        coverage = ",".join(f"U+{ord(character):X}" for character in chunk)
        blocks.extend(re.sub(r"\s*unicode-range:[^;]+;", "", face).replace(
            "}", f"  unicode-range: {coverage};\n}}") for face in faces)
    return blocks


def main():
    OUTPUT.mkdir(exist_ok=True)
    latin = download("https://fonts.googleapis.com/css2?"
        "family=DM+Mono:wght@400;500&family=Manrope:wght@400..800&"
        "family=Newsreader:ital,wght@0,500..600;1,500&display=swap").decode()
    blocks = re.findall(r"/\* latin \*/\s*(@font-face\s*\{[^}]+\})", latin)
    if len(blocks) != 5:
        raise ValueError(f"Expected five Latin font faces, got {len(blocks)}")
    blocks.extend(chinese_font_blocks(chinese_characters()))
    compiled = []
    for index, block in enumerate(blocks):
        url, = re.findall(r"url\((https://[^)]+)\)", block)
        data = download(url)
        if len(data) < 48 or data[:4] != b"wOF2" or int.from_bytes(data[8:12], "big") != len(data):
            raise ValueError(f"Expected complete WOFF2 from {url}")
        name = f"site-{index}.woff2"
        (OUTPUT / name).write_bytes(data)
        compiled.append(block.replace(url, f"{name}?v={sha256(data).hexdigest()[:12]}"))
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

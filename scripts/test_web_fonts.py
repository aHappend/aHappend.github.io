import re
import unittest
from hashlib import sha256
from pathlib import Path
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse
from xml.etree import ElementTree

from scripts.export_web_fonts import CHINESE_CHUNK_SIZE, chinese_characters, chinese_font_blocks, download

ROOT = Path(__file__).resolve().parents[1]


class WebFontsTest(unittest.TestCase):
    def test_header_controls_keep_compact_geometry(self):
        css = (ROOT / "styles.css").read_text()
        script = (ROOT / "script.js").read_text()
        self.assertIn("--header-height: 64px", css)
        self.assertIn("--header-height: 60px", css)
        self.assertIn("@media (max-width: 1100px)", css)
        self.assertIn('window.matchMedia("(max-width: 1100px)")', script)
        self.assertIn("width: 20px; height: 20px", css)
        self.assertIn("width: 22px; height: 22px", css)
        self.assertIn('querySelectorAll(".button, .filter")', script)
        self.assertNotIn('querySelectorAll(".button, .theme-toggle, .filter")', script)

    def test_action_arrows_do_not_depend_on_font_or_emoji_glyphs(self):
        html = (ROOT / "index.html").read_text()
        for source in ("index.html", "styles.css", "folio.css"):
            self.assertNotRegex((ROOT / source).read_text(), r"[\u2197\u2198\u2191\u2193]")
        icons = re.findall(r'<svg class="icon-arrow".*?</svg>', html, re.S)
        self.assertGreaterEqual(len(icons), 30)
        for markup in icons:
            icon = ElementTree.fromstring(markup)
            self.assertEqual(icon.get("viewBox"), "0 0 24 24")
            self.assertEqual(icon.get("aria-hidden"), "true")
            self.assertEqual(icon.get("focusable"), "false")
            self.assertIsNotNone(icon.find("path"))
        folio = (ROOT / "folio.css").read_text()
        indicator = re.search(r"\.project-select::after\s*\{([^}]+)\}", folio).group(1)
        self.assertIn('content: ""', indicator)
        self.assertIn('mask: url("data:image/svg+xml,', indicator)

    def test_fonts_and_avatar_do_not_depend_on_external_hosts(self):
        html = (ROOT / "index.html").read_text()
        self.assertNotIn("fonts.googleapis.com", html)
        self.assertNotIn("fonts.gstatic.com", html)
        self.assertNotIn("avatars.githubusercontent.com", html)
        self.assertTrue((ROOT / "brand/avatar.webp").is_file())
        css = (ROOT / "fonts/site-fonts.css").read_text()
        expected = 5 + 2 * ((len(chinese_characters()) + CHINESE_CHUNK_SIZE - 1) // CHINESE_CHUNK_SIZE)
        self.assertEqual(css.count("@font-face"), expected)
        self.assertEqual(css.count("font-display: swap"), expected)
        for url in re.findall(r"url\(([^)]+)\)", css):
            self.assertRegex(url, r"^site-\d+\.woff2\?v=[0-9a-f]{12}$")
            name, version = url.split("?v=")
            data = (ROOT / "fonts" / name).read_bytes()
            self.assertEqual(data[:4], b"wOF2")
            self.assertEqual(int.from_bytes(data[8:12], "big"), len(data))
            self.assertEqual(version, sha256(data).hexdigest()[:12])
        for family in ("dmmono", "manrope", "newsreader", "notosanssc", "notoserifsc"):
            self.assertIn("SIL OPEN FONT LICENSE", (ROOT / "fonts" / f"{family}-LICENSE.txt").read_text())

    def test_large_cjk_inventories_use_disjoint_bounded_subsets(self):
        characters = "".join(chr(0x4E00 + index) for index in range(CHINESE_CHUNK_SIZE * 2 + 1))
        response = b"@font-face {font-family: 'Noto Sans SC';}\n@font-face {font-family: 'Noto Serif SC';}"
        with patch("scripts.export_web_fonts.download", return_value=response) as download:
            blocks = chinese_font_blocks(characters)
        requests = [parse_qs(urlparse(call.args[0]).query)["text"][0] for call in download.call_args_list]
        self.assertEqual("".join(requests), characters)
        self.assertTrue(all(len(chunk) <= CHINESE_CHUNK_SIZE for chunk in requests))
        self.assertEqual(len(blocks), 6)
        for index, chunk in enumerate(requests):
            expected = ",".join(f"U+{ord(character):X}" for character in chunk)
            for block in blocks[index * 2:index * 2 + 2]:
                self.assertIn(f"unicode-range: {expected};", block)
        with patch("scripts.export_web_fonts.download", return_value=response * 101):
            with self.assertRaisesRegex(ValueError, "Expected two Chinese font faces"):
                chinese_font_blocks("字")

    def test_published_chinese_font_ranges_cover_every_character(self):
        css = (ROOT / "fonts/site-fonts.css").read_text()
        expected = {ord(character) for character in chinese_characters()}
        for family in ("Noto Sans SC", "Noto Serif SC"):
            faces = [block for block in re.findall(r"@font-face\s*\{[^}]+\}", css)
                     if f"font-family: '{family}'" in block]
            covered = []
            for face in faces:
                coverage = re.search(r"unicode-range:\s*([^;]+);", face).group(1)
                covered.extend(int(value.strip()[2:], 16) for value in coverage.split(","))
            self.assertEqual(len(covered), len(set(covered)))
            self.assertEqual(set(covered), expected)

    def test_font_downloads_use_seekable_retry_output(self):
        def curl(command, *, check):
            self.assertTrue(check)
            path = Path(command[command.index("--output") + 1])
            path.write_bytes(b"complete response")
        with patch("scripts.export_web_fonts.subprocess.run", side_effect=curl):
            self.assertEqual(download("https://fonts.example.test/font"), b"complete response")


if __name__ == "__main__":
    unittest.main()

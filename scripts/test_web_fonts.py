import re
import unittest
from hashlib import sha256
from pathlib import Path
from xml.etree import ElementTree


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
        self.assertEqual(css.count("@font-face"), 7)
        self.assertEqual(css.count("font-display: swap"), 7)
        for url in re.findall(r"url\(([^)]+)\)", css):
            self.assertRegex(url, r"^site-\d+\.woff2\?v=[0-9a-f]{12}$")
            name, version = url.split("?v=")
            data = (ROOT / "fonts" / name).read_bytes()
            self.assertEqual(data[:4], b"wOF2")
            self.assertEqual(version, sha256(data).hexdigest()[:12])
        for family in ("dmmono", "manrope", "newsreader", "notosanssc", "notoserifsc"):
            self.assertIn("SIL OPEN FONT LICENSE", (ROOT / "fonts" / f"{family}-LICENSE.txt").read_text())


if __name__ == "__main__":
    unittest.main()

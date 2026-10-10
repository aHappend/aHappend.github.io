import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class WebFontsTest(unittest.TestCase):
    def test_fonts_and_avatar_do_not_depend_on_external_hosts(self):
        html = (ROOT / "index.html").read_text()
        self.assertNotIn("fonts.googleapis.com", html)
        self.assertNotIn("fonts.gstatic.com", html)
        self.assertNotIn("avatars.githubusercontent.com", html)
        self.assertTrue((ROOT / "brand/avatar.webp").is_file())
        css = (ROOT / "fonts/site-fonts.css").read_text()
        self.assertEqual(css.count("@font-face"), 7)
        self.assertEqual(css.count("font-display: swap"), 7)
        for name in re.findall(r"url\(([^)]+)\)", css):
            self.assertRegex(name, r"^site-\d+\.woff2$")
            self.assertEqual((ROOT / "fonts" / name).read_bytes()[:4], b"wOF2")
        for family in ("dmmono", "manrope", "newsreader", "notosanssc", "notoserifsc"):
            self.assertIn("SIL OPEN FONT LICENSE", (ROOT / "fonts" / f"{family}-LICENSE.txt").read_text())


if __name__ == "__main__":
    unittest.main()

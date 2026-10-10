import unittest
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]


class SkyTest(unittest.TestCase):
    def test_portable_images_have_clear_shapes_and_transparent_edges(self):
        for name in ("sun", "moon"):
            with self.subTest(name=name), Image.open(ROOT / f"art/study-{name}.webp") as image:
                self.assertEqual(image.size, (640, 640))
                alpha = image.convert("RGBA").getchannel("A")
                self.assertGreater(alpha.getextrema()[1], 128)
                self.assertGreater(sum(alpha.histogram()[65:]), 30000)
                for edge in (
                    alpha.crop((0, 0, 640, 2)), alpha.crop((0, 638, 640, 640)),
                    alpha.crop((0, 0, 2, 640)), alpha.crop((638, 0, 640, 640)),
                ):
                    self.assertLessEqual(edge.getextrema()[1], 2)

    def test_sun_is_round_and_moon_is_a_crescent(self):
        with Image.open(ROOT / "art/study-sun.webp") as sun:
            alpha = sun.convert("RGBA").getchannel("A")
            left, top, right, bottom = alpha.point(lambda value: 255 if value > 100 else 0).getbbox()
            self.assertAlmostEqual((right - left) / (bottom - top), 1, delta=.06)
            self.assertGreater(alpha.getpixel((320, 320)), 100)
        with Image.open(ROOT / "art/study-moon.webp") as moon:
            alpha = moon.convert("RGBA").getchannel("A")
            self.assertGreater(alpha.getpixel((173, 358)), 64)
            self.assertGreater(alpha.getpixel((307, 506)), 64)
            self.assertLessEqual(alpha.getpixel((429, 205)), 2)
            self.assertLessEqual(alpha.getpixel((320, 320)), 2)

    def test_page_uses_images_not_external_sky_fragments(self):
        html = (ROOT / "index.html").read_text()
        self.assertIn('class="study-sun" src="art/study-sun.webp?', html)
        self.assertIn('class="study-moon" src="art/study-moon.webp?', html)
        self.assertNotIn("#sun-disc", html)
        self.assertNotIn("#moon-disc", html)
        for name in ("sun", "moon"):
            path = ROOT / f"art/study-{name}-mobile.webp"
            with Image.open(path) as image:
                self.assertEqual(image.size, (320, 320))
                self.assertLessEqual(image.convert("RGBA").getchannel("A").getpixel((0, 0)), 2)
            self.assertLess(path.stat().st_size, (ROOT / f"art/study-{name}.webp").stat().st_size * .4)


if __name__ == "__main__":
    unittest.main()

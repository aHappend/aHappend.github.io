import re
import unittest
from html import unescape
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class PortfolioTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / "index.html").read_text()
        cls.cards = re.findall(
            r'<article class="project-card\b.*?</article>', cls.html, re.S
        )

    def test_four_groups_keep_unique_visual_and_heading_ids(self):
        self.assertEqual(len(self.cards), 4)
        titles = ("Vulcan / Argus", "ACE / ANVIL", "RIVET / BILLET", "Hardware studies")
        for index, (card, title) in enumerate(zip(self.cards, titles), 1):
            self.assertIn(title, card)
            self.assertIn(f'id="project-title-{index}"', card)
            self.assertIn(f'id="project-visual-{index}"', card)
            self.assertIn(f'aria-labelledby="project-title-{index}"', card)
        ids = re.findall(r'\bid="([^"]+)"', self.html)
        self.assertEqual(len(ids), len(set(ids)))

    def test_family_and_classic_links_stay_in_their_groups(self):
        repositories = (
            ("microsoft/ArgusAgent", "aHappend/vulcan-showcase"),
            ("aHappend/ace-2", "aHappend/ace-3", "aHappend/anvil-e", "aHappend/anvil-q"),
            ("aHappend/rivet-a", "aHappend/rivet-h", "aHappend/billet-t",
             "aHappend/billet-f", "aHappend/sable", "aHappend/vulcan-showcase"),
            ("aHappend/64-point-fft-hardware", "aHappend/two-stage-cmos-op-amp"),
        )
        for card, expected in zip(self.cards, repositories):
            links = re.findall(r'href="https://github.com/([^"]+)"', card)
            self.assertCountEqual(links, expected)
            self.assertIn('class="project-links"', card)
        self.assertIn('href="https://ahappend.github.io/vulcan/"', self.cards[0])

    def test_filters_match_the_new_groups(self):
        categories = [
            re.search(r'data-category="([^"]+)"', card).group(1).split()
            for card in self.cards
        ]
        for category, expected in (("systems", 2), ("hardware", 4), ("research", 3)):
            self.assertEqual(sum(category in group for group in categories), expected)

    def test_bilingual_paragraphs_match_initial_english(self):
        paragraphs = re.findall(
            r'<p\b[^>]*data-en="([^"]+)"[^>]*data-zh="([^"]+)"[^>]*>(.*?)</p>',
            "\n".join(self.cards), re.S,
        )
        self.assertEqual(len(paragraphs), 11)
        for english, chinese, body in paragraphs:
            self.assertEqual(" ".join(unescape(body).split()), " ".join(unescape(english).split()))
            self.assertRegex(chinese, r"[\u4e00-\u9fff]")

    def test_claims_are_scoped_and_drawings_are_conceptual(self):
        for stale in ("624", "0.0899", "62,283", "0.614"):
            self.assertNotIn(stale, self.html)
        for required in (
            "full-regression, full-model and hardware acceptance remain open",
            "Q16.16 execution", "E3/Q2 remain developmental",
            "WORKFLOW CONCEPT", "ACE-2 / K/V REUSE", "BILLET-T CONCEPT",
            "not every family's architecture", "not results claimed by this paper",
        ):
            self.assertIn(required, self.html)
        self.assertIn('data-en="Work groups"', self.html)


if __name__ == "__main__":
    unittest.main()

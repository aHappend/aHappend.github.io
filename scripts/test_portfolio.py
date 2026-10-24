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
        titles = ("Vulcan", "ACE / ANVIL", "Hardware families", "Hardware studies")
        for index, (card, title) in enumerate(zip(self.cards, titles), 1):
            self.assertIn(title, card)
            self.assertIn(f'id="project-title-{index}"', card)
            self.assertIn(f'id="project-visual-{index}"', card)
            self.assertIn(f'aria-labelledby="project-title-{index}"', card)
        ids = re.findall(r'\bid="([^"]+)"', self.html)
        self.assertEqual(len(ids), len(set(ids)))

    def test_family_and_classic_links_stay_in_their_groups(self):
        repositories = (
            ("aHappend/vulcan-showcase",),
            ("aHappend/ace-2", "aHappend/ace-3", "aHappend/anvil-e", "aHappend/anvil-q"),
            ("aHappend/rivet-a", "aHappend/rivet-h", "aHappend/billet-t",
             "aHappend/billet-f", "aHappend/swage-s", "aHappend/bellows-l",
             "aHappend/crucible-g", "aHappend/furnace-x", "aHappend/sable",
             "aHappend/vulcan-showcase"),
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
        self.assertEqual(len(paragraphs), 12)
        for english, chinese, body in paragraphs:
            self.assertEqual(" ".join(unescape(body).split()), " ".join(unescape(english).split()))
            self.assertRegex(chinese, r"[\u4e00-\u9fff]")

    def test_claims_are_scoped_and_drawings_are_conceptual(self):
        for stale in ("624", "0.0899", "62,283", "0.614"):
            self.assertNotIn(stale, self.html)
        for required in (
            "full-regression, full-model and hardware acceptance remain open",
            "Q16.16 execution", "Q3 is in development; Q4 is planned",
            "WORKFLOW CONCEPT", "ACE-2 / K/V REUSE", "BILLET-T CONCEPT",
            "not every family's architecture",
        ):
            self.assertIn(required, self.html)
        self.assertIn('data-en="Work groups"', self.html)

    def test_october_release_and_board_scopes_are_distinct(self):
        self.assertIn("17 reported generations", self.cards[0])
        self.assertIn("seven hardware families", self.cards[0])
        self.assertIn("three-run, deterministic Arria 10 HIL receipts", self.cards[1])
        self.assertIn("not blanket full-model acceptance", self.cards[1])
        self.assertIn("SWAGE-S1 has public scaler RTL under verification", self.cards[2])
        self.assertIn("S2/S3 and BELLOWS-L are queued", self.cards[2])
        self.assertIn("are planned, not completed releases", self.cards[2])
        for unsupported in ("100% HIL", "17 verified chips", "E3/Q2 remain developmental"):
            self.assertNotIn(unsupported, self.html)

    def test_vulcan_is_separate_from_argus_team_and_paper(self):
        self.assertNotIn("Vulcan / Argus", self.html)
        self.assertIn("not part of Argus AI Team", self.cards[0])
        self.assertIn("不属于 Argus AI Team", self.cards[0])
        self.assertNotIn("microsoft/ArgusAgent", self.cards[0])
        paper = re.search(
            r'<a\b[^>]*href="https://arxiv.org/abs/2608\.05144"[^>]*>.*?</a>',
            self.html, re.S,
        )
        self.assertIsNotNone(paper)
        self.assertIn("Argus AI Team's runtime", paper.group())
        for independent_work in ("Vulcan", "ANVIL", "RIVET", "BILLET", "SABLE"):
            self.assertNotIn(independent_work, paper.group())


if __name__ == "__main__":
    unittest.main()

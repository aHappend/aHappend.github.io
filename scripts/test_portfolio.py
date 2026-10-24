import re
import unittest
from html import unescape
from pathlib import Path
from xml.etree import ElementTree


ROOT = Path(__file__).resolve().parents[1]
PROJECTS = (
    ("vulcan", "Vulcan", "systems", ("vulcan-showcase",)),
    ("ace", "ACE", "systems", ("ace-2", "ace-3")),
    ("anvil", "ANVIL", "families", ("anvil-e", "anvil-q")),
    ("rivet", "RIVET", "families", ("rivet-a", "rivet-h")),
    ("billet", "BILLET", "families", ("billet-t", "billet-f")),
    ("swage", "SWAGE", "families", ("swage-s",)),
    ("bellows", "BELLOWS", "families", ("bellows-l",)),
    ("crucible", "CRUCIBLE", "families", ("crucible-g",)),
    ("furnace", "FURNACE", "families", ("furnace-x",)),
    ("sable", "SABLE", "foundations", ("sable",)),
    ("fft", "64-point FFT", "foundations", ("64-point-fft-hardware",)),
    ("analog", "CMOS Op-Amp", "foundations", ("two-stage-cmos-op-amp",)),
)


class PortfolioTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / "index.html").read_text()
        cls.cards = re.findall(r'<article class="project-card\b.*?</article>', cls.html, re.S)
        cls.by_project = {
            re.search(r'data-project="([^"]+)"', card).group(1): card
            for card in cls.cards
        }
        cls.motion = (ROOT / "project-motion.css").read_text()

    def test_each_family_has_its_own_study(self):
        self.assertEqual(len(self.cards), len(PROJECTS))
        for index, (card, (slug, title, category, _)) in enumerate(zip(self.cards, PROJECTS), 1):
            self.assertIn(f'data-project="{slug}"', card)
            self.assertIn(f'data-category="{category}"', card)
            self.assertIn(title, card)
            self.assertIn(f'id="project-title-{index}"', card)
            self.assertIn(f'id="project-visual-{index}"', card)
            self.assertIn(f'aria-labelledby="project-title-{index}"', card)
        self.assertNotIn("ACE / ANVIL", "\n".join(self.cards))
        self.assertNotIn('data-en="Hardware families"', "\n".join(self.cards))
        self.assertIn('<dt>12</dt>', self.html)
        self.assertIn('data-en="Project studies"', self.html)

    def test_family_links_do_not_leak_into_unrelated_studies(self):
        for slug, _, _, repositories in PROJECTS:
            card = self.by_project[slug]
            links = re.findall(r'href="https://github.com/aHappend/([^"]+)"', card)
            self.assertCountEqual(links, repositories)
            self.assertIn('class="project-links"', card)
        self.assertIn('href="https://ahappend.github.io/vulcan/"', self.by_project["vulcan"])

    def test_categories_have_matching_headings_and_filters(self):
        for category, count in (("systems", 2), ("families", 7), ("foundations", 3)):
            self.assertEqual(sum(f'data-category="{category}"' in card for card in self.cards), count)
            self.assertIn(f'data-filter="{category}"', self.html)
            self.assertRegex(self.html, rf'class="project-group-heading mono" data-category="{category}"')

    def test_bilingual_copy_matches_initial_english(self):
        paragraphs = re.findall(
            r'<p\b[^>]*data-en="([^"]+)"[^>]*data-zh="([^"]+)"[^>]*>(.*?)</p>',
            "\n".join(self.cards), re.S,
        )
        self.assertGreaterEqual(len(paragraphs), 24)
        for english, chinese, body in paragraphs:
            self.assertEqual(" ".join(unescape(body).split()), " ".join(unescape(english).split()))
            self.assertRegex(chinese, r"[\u4e00-\u9fff]")

    def test_illustrations_have_unique_ids_and_resolvable_references(self):
        ids = re.findall(r'\bid="([^"]+)"', self.html)
        self.assertEqual(len(ids), len(set(ids)))
        drawings = []
        for card in self.cards:
            svgs = re.findall(r"<svg\b.*?</svg>", card, re.S)
            self.assertEqual(len(svgs), 1)
            svg = ElementTree.fromstring(svgs[0])
            self.assertEqual(svg.get("aria-hidden"), "true")
            self.assertFalse(list(svg.iter("text")))
            drawings.append(svgs[0])
            for reference in re.findall(r'(?:href="#|url\(#)([a-zA-Z][\w-]*)', svgs[0]):
                self.assertIn(reference, ids)
        self.assertEqual(len(drawings), len(set(drawings)))
        for owner, illustration in (("ace", "spec-memory"), ("fft", "spec-fft"), ("analog", "spec-analog")):
            self.assertIn(illustration, self.by_project[owner])
            self.assertEqual(sum(illustration in card for card in self.cards), 1)
        self.assertNotIn('class="chip-registration"', self.html)

    def test_new_studies_have_distinct_motion_mechanisms(self):
        mechanisms = {
            "vulcan": 'data-cursor="timing"', "anvil": 'data-grid="accumulator"',
            "rivet": 'data-grid="sha-7"', "billet": 'data-wave="iir"',
            "swage": 'data-grid="scaled"', "bellows": 'data-symbols="decoded"',
            "crucible": 'data-coverage=""', "furnace": 'data-grid="priority"',
            "sable": 'data-grid="ack-3"',
        }
        for project, mechanism in mechanisms.items():
            self.assertIn(f'data-study="{project}" viewBox="0 0 640 240"', self.by_project[project])
            self.assertIn(mechanism, self.by_project[project])
            self.assertGreaterEqual(self.by_project[project].count("<path"), 20)
        self.assertNotIn("scaleY", self.by_project["crucible"])
        for selector in (".study-fill", ".study-solid-warm", ".study-dot, .study-bar"):
            self.assertRegex(self.motion, rf"(?m)^{re.escape(selector)} \{{")

    def test_motion_and_directory_have_accessible_fallbacks(self):
        javascript = (ROOT / "script.js").read_text()
        for invariant in (
            'window.matchMedia("print")', "projectGrid.replaceChildren(...projectNodes)",
            'projectGroups.forEach', 'button.hidden = card.hidden',
            'intersectionRatio >= .2', 'document.addEventListener("visibilitychange", syncProjectVisibility)',
        ):
            self.assertIn(invariant, javascript)
        for boundary in ('[data-motion-paused]', ':not(.is-visible)', '[data-effects="off"]',
                         '(prefers-reduced-motion: reduce)', '@media print'):
            self.assertIn(boundary, self.motion)
        self.assertNotIn('button.addEventListener("pointerenter"', javascript)
        self.assertIn('target.dispatchEvent(new Event("studyvisibility"))', javascript)
        self.assertRegex(self.html, r'<script type="module" src="project-studies\.js\?v=')

    def test_report_publication_and_board_scopes_remain_distinct(self):
        self.assertIn("17 reported generations", self.by_project["vulcan"])
        self.assertIn("Seven hardware families", self.by_project["vulcan"])
        self.assertIn("three-run, deterministic Arria 10 HIL receipts", self.by_project["anvil"])
        self.assertIn("not blanket full-model acceptance", self.by_project["anvil"])
        self.assertIn("Q16.16 execution", self.by_project["anvil"])
        self.assertIn("Q3 is in development; Q4 is planned", self.by_project["anvil"])
        self.assertIn("full-regression, full-model and hardware acceptance remain open", self.by_project["ace"])
        self.assertIn("under verification", self.by_project["swage"])
        for project, stage in (("swage", "development"), ("bellows", "queued"),
                               ("crucible", "planned"), ("furnace", "planned")):
            self.assertIn(f'data-stage="{stage}"', self.by_project[project])
        for unsupported in ("100% HIL", "17 verified chips", "E3/Q2 remain developmental"):
            self.assertNotIn(unsupported, self.html)

    def test_vulcan_remains_separate_from_argus(self):
        self.assertNotIn("Vulcan / Argus", self.html)
        self.assertIn("not part of Argus AI Team", self.by_project["vulcan"])
        self.assertIn("不属于 Argus AI Team", self.by_project["vulcan"])
        self.assertNotIn("microsoft/ArgusAgent", self.by_project["vulcan"])
        paper = re.search(r'<a\b[^>]*href="https://arxiv.org/abs/2608\.05144"[^>]*>.*?</a>', self.html, re.S)
        self.assertIsNotNone(paper)
        self.assertIn("Argus AI Team's runtime", paper.group())
        for project in ("Vulcan", "ANVIL", "RIVET", "BILLET", "SABLE"):
            self.assertNotIn(project, paper.group())


if __name__ == "__main__":
    unittest.main()

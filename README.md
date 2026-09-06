# Sufeng Guo — Personal Website

Source for [ahappend.github.io](https://ahappend.github.io/), a bilingual portfolio for
Sufeng Guo's research and engineering work in autonomous AI systems, AI accelerators,
and hardware-software co-design.

The site is built with plain HTML, CSS, and JavaScript and is deployed through GitHub Pages.

## Local preview

```sh
python -m http.server 8767 --bind 127.0.0.1
```

Open `http://127.0.0.1:8767`. There is no build step or package dependency.

## Editing

- `index.html`: portfolio content. Keep `data-en` and `data-zh` translations together.
  The large bilingual headlines are the owner's rhyming poetry; preserve their
  wording and punctuation, and adapt the layout rather than rewriting them.
- `styles.css`: the watercolor field-guide design, responsive layouts, original
  sky-blue/cyan/orange palette and blue-black dark theme, reduced-motion support,
  and print layout.
- `brand/mark.svg`: the SG ink-seal master for the navigation mark and application
  icons. `favicon.svg` is its optically simplified small-size companion, with
  heavier strokes at 16px and no texture. Brand marks deliberately remain
  consistent across identity surfaces; the no-repeat rule below applies to scenes.
  Standard and maskable application icons are separate; maskable exports have
  opaque full-bleed backgrounds and additional lettering clearance.
- `art/*.svg`: seven original, code-authored nature compositions, each used in
  exactly one section: botanical still life (hero), mountain valley (Work),
  wildflower meadow (Ecosystem), water-lily pond (Research), woodland ferns
  (About), wild roses (Social), and coastal bay (Contact). Do not repeat an
  illustration across sections, even with different cropping or opacity.
  The illustrations use shaded
  forms, fine stems and veins, restrained pigment texture, and transparent edges.
  They blend into the page without frames or a gallery. No museum reproductions
  or image-generation service are used. Keep their frameless composition clear
  of readable text and controls. Each painting appears exactly once inside an
  accessible `.scene-art` button; the image itself never intercepts pointer input.
  The chip graphic remains conceptual, not a die photograph or physical-layout result.
- `preferences.js`: validated theme/language storage and pre-paint theme selection.
- `script.js`: language/theme controls, mobile navigation, animated accessible
  project filters, section reveals, layered illustration parallax, a fluttering
  butterfly, card tilt/spotlights, magnetic buttons, and canvas petal trails with
  click ripples. The native cursor stays visible; the canvas never intercepts
  input. Its particle count is capped at 64, pixel ratio at 1.5, and its frame loop
  stops when the trail fades. Scroll, blur, pointer cancellation, and hidden tabs
  clear transient effects. Painting clicks share that bounded pool and temporarily
  take priority over generic cursor effects. The hero's garden-effects toggle persists independently
  of theme/language, and system reduced-motion preferences always take priority.
  Phones keep mouse parallax/trails off, but support explicit taps on paintings.
  Painting controls use native clicks (including Enter/Space), never prevent
  touch scrolling, and are disabled with a visible explanation when motion is
  paused, reduced motion is requested, or their image/effect renderer is unavailable.
- `scene-effects.js`: pure canvas choreography for the seven paintings:
  falling bouquet petals, mountain birds, drifting meadow seeds, pond ripples and
  a dragonfly, unfurling fern shoots, opening roses, and three staggered shoreline
  surges with a translucent teal wash and bright foam, advancing then retreating.
  The coast follows the source SVG's `#coast-shoreline` Beziers. Its local canvas
  shares the painting's parallax and mask, behind the page text, rather than
  floating in the viewport overlay.   All canvases share the same capped particle
  pool, frame loop, and cleanup. Keep the source shoreline and sampled curves in sync.
  Ferns use a 4.8-second outward-unfurling cycle, with new branches behind the
  unchanged central plant. Their serrated leaflets, veins, and pigment come from
  the original SVG, not newly drawn flat icons. Regenerate the texture atlas with
  `python scripts/export_fern_art.py` after editing the woodland source.
  The fern layer shares the image's translation, rotation, and fit; missing
  textures disable only this interaction and leave the original painting visible.
  Pond ripples use three staggered sets of broken brush arcs on the water plane,
  clipped by a source-derived surface mask so they cannot paint over lilies,
  pads, or reeds. Regenerate that mask with `python scripts/export_pond_mask.py`
  after changing the pond artwork. The pond layer follows the image's parallax
  and draws the dragonfly after masking the water.
  `script.js` owns inputs, actual image bounds, timers, announcements, and cleanup.
  Preserve these distinct interactions rather than recoloring one shared burst.

The page remains readable and navigable without JavaScript. Browser storage is
optional; unavailable storage emits a console warning and settings remain usable
for the current page. External fonts have system fallbacks.
Reduced-motion preferences disable entrance/filter animation and pointer effects.

## Updating identity assets

Edit the two SVG masters, then run `python scripts/export_brand_icons.py` to
regenerate PNG and ICO files directly at their target sizes. This optional
authoring script uses Pillow, Python Playwright, and Google Chrome; none are
needed to serve the website. Do not upscale a small PNG to create larger icons.
When publishing new marks, update the identity cache keys in `index.html` and
`site.webmanifest` so browsers can refresh their cached icons.

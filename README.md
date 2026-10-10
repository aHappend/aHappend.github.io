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
- `folio.css`: the compact editorial composition and painted-paper layers.
  Desktop centers the owner's name and a site index, with a project directory
  that switches a shared technical stage when the pointer enters any part of a
  project row, or through keyboard focus or title-button clicks. The arrow and
  metadata have fixed columns so different title/tag lengths cannot shift them.
  The stage uses the original diagram nodes, not duplicate SVGs or cloned IDs.
  At widths above 900px and heights of at least 600px, enable this project browser;
  portrait tablets and short landscape phones show paired inline studies.
  Phones up to 600px use smaller typography, a two-column site index, short
  project entries, compact diagrams, and a dense ecosystem list. Responsive
  changes preserve the selected project, filters, open notes, and keyboard focus.
  Native `details` expose complete descriptions and repository links without JS.
  Print exposes all diagrams and notes, even when collapsed or filtered on screen.
  Six nature paintings grow into available heading/hero margins, with larger
  desktop and tablet sizes but no additional empty panels. Phones retain their
  compact sizes. The seventh, the coast, is a low-opacity Contact underlay,
  behind the heading and links rather than a separate illustration.
  The translucent pigment-wash hover/focus treatment is explicitly opt-in through
  `.watercolor-hover`, only for controls without a dedicated hover interaction:
  the four "Start anywhere" entries and the effects control. Small icon buttons
  use bounded background feedback with inset focus outlines, city-list entries
  use an underline, and source/license links change color. Photo prints use
  paper depth and shadows, not another paint overlay.
  Navigation underlines, animated buttons, project previews,
  repository/research/social cards, map labels, and painting controls retain their
  own feedback without a second wash layered over it. The wash never intercepts
  pointer input or changes layout; disabled controls are excluded. The effects
  control keeps its existing status dot and uses a separate wash pseudo-element.
  The homepage entries use this wash instead of their former title/arrow movement;
  touch presses also reveal it without relying on hover.
  Keyboard focus receives the same feedback; reduced motion/effects-off remove
  its transition, and print removes the wash.
  Other hover treatments emphasize institutional marks and research evidence;
  every essential action also works with keyboard or touch.
- `institutions/`: official institutional identity assets used as factual
  lockups, not as decorative scenes. `nju.svg` is the official Nanjing University
  bilingual mark in university purple, `microsoft.svg` is Microsoft's official
  corporate wordmark, and `ntu-lockup.png` is the web-sized official NTU lockup
  from its public brand guide. Preserve each asset's aspect ratio and source
  colors. Dark mode uses one consistent white plate behind the marks rather
  than recoloring or brightening the assets. The plate is a pseudo-element:
  never add logo-container padding or otherwise change the rendered image size
  between themes. Keep the technology stack below the About heading so the education
  and experience timeline can use the full right column. The ArgusAgent repository
  card uses Microsoft's four-square mark so it stays legible at phone size; the
  experience timeline continues to use the full corporate wordmark. In the
  single-column layout, show the introduction and full timeline before the
  technology stack.
- `brand/mark.svg`: the SG ink-seal master for the navigation mark and application
  icons. `favicon.svg` is its optically simplified small-size companion, with
  heavier strokes at 16px and no texture. Brand marks deliberately remain
  consistent across identity surfaces; the no-repeat rule below applies to scenes.
  Standard and maskable application icons are separate; maskable exports have
  opaque full-bleed backgrounds and additional lettering clearance.
- `art/*.svg`: seven original, code-authored nature compositions, each used in
  exactly one section: botanical still life (hero), woodland ferns (About),
  mountain valley (Work), wildflower meadow (Ecosystem), water-lily pond
  (Research), wild roses (Social), and coastal bay (Contact). Do not repeat an
  illustration across sections, even with different cropping or opacity.
  The illustrations use shaded
  forms, fine stems and veins, restrained pigment texture, and transparent edges.
  They blend into the page without frames or a gallery. No museum reproductions
  or image-generation service are used. Keep their frameless composition clear
  of readable text and controls; the coastal underlay is the deliberate
  background-layer exception. Each painting appears exactly once inside an
  accessible `.scene-art` button; the image itself never intercepts pointer input.
  ACE-3 retains the original angled chip and layered drawings, not a die
  photograph or a physical-layout result.
- `art/studio-paper.svg`: original tiled cold-pressed paper texture, with diffuse
  lighting for the paper tooth and a separate fine-fiber layer. It is rendered
  once as a background, never regenerated in the scroll callback.
- `art/painted-study.svg`: a separate original mountain-and-lake study, not a
  photograph or a claim about travel. The paper stays visibly blue from the
  first screen; scrolling draws the pencil underpainting, then reveals stronger
  blue pigment through a soft mask. The sketch and color layer move at
  different rates, bounded to 26px on desktop and 8px on phones. Text and the
  seven nature paintings never get scroll offsets. The contact area's
  "finished watercolor" link opens a native, keyboard-accessible dialog; without
  JS it links directly to the SVG. Reduced motion/effects off/no JS show the
  complete painting, and print removes decorative layers. The earlier
  `art/paper-washes.svg` remains an unused source asset.
  Its `landscape` group is reused through an external SVG `use` reference.
  `scripts/export_sky.py` bakes its shared `sun-disc` and `moon-disc` into separate
  640×640 transparent WebP images, with 320×320 phone variants selected by
  `picture`. This avoids WebKit's missing gradient/mask
  rendering through external SVG fragments and live pigment-filter work.
  The sun has a warm round pigment core; the moon retains its crescent cutout.
  The background has only one sun/moon, not a fixed sun underneath another
  celestial image. Switching theme lowers the outgoing sun
  or moon and raises the other; reduced motion and effects-off switch directly.
  Opening the standalone painting still shows the complete original sunlit work.
- `art/painted-study-portrait.svg` is a separately composed 720×1280 mountain,
  sky, and lake study for phones, not a crop or stretch of the desktop painting.
  The complete image uses `object-fit: contain`, with transparent feathered edges
  on all four sides blending into the blue paper. Its own pencil contours replace
  the wide-screen sketch; the shared sun/moon stays proportional and changes with
  the theme. Phone/tablet sky images sit below the measured header in both
  orientations, with enough contrast to remain visible before scrolling.
  `scripts/export_portrait_background.py` bakes pigment filters into
  the corresponding transparent WebP once, so phones only composite a cached image
  instead of running turbulence filters while scrolling. Regenerate with
  `python scripts/export_portrait_background.py` using the existing optional
  Pillow/Playwright/Chrome authoring setup. Regenerate the sky images separately
  with `python scripts/export_sky.py`. The website still needs no build step.
- The `#elsewhere` interlude defaults to **Follow scroll** on every page load.
  Its Pacific-centered world view places Asia on the left and the Americas on
  the right, with the longitude seam at 30°W. It moves to an 8x view centered
  near 128°E, 34.5°N, emphasizing eastern China and Japan through ordinary
  scrolling. A native sticky `.atlas-story` lets the world map reach a readable
  position first, then holds the section while scrolling changes only the map
  camera. Its 1.8-viewport scroll runway reserves the first and last 18% for
  the world and China views, with the zoom in between; it then releases naturally.
  Native proximity scroll-snap points inside those two pauses gently settle nearby
  scroll gestures into readable views. They are not mandatory stops: continuing
  to scroll or flinging beyond the map leaves normally. Once a view settles,
  its snap point releases on the next gesture, including a short swipe/wheel step,
  so repeated small inputs cannot get trapped. Points rearm after leaving the
  atlas. Reverse scrolling reverses the sequence. No wheel/touch events are
  prevented or replayed.
  The background painting pauses during this runway, leaving only the map camera
  moving. Scroll-linked variables are scoped to their visual layers rather than
  inherited by the entire document. Header/map dimensions and the city projection
  are cached until resize/reflow, map layers are prepared before entering the
  viewport, and pin positions use transforms rather than per-frame layout changes.
  Only the small HTML pins are promoted with `will-change`. The zooming SVG is
  deliberately not promoted: its textured continent layer otherwise causes large
  rasterization stalls during scale changes, especially on desktop/high-DPI screens.
  The atlas does not spawn decorative pointer particles or click ripples alongside
  its camera/album animation. Camera frames update map transforms and pins without
  remeasuring the card after each write; focused scrolling only checks the attached
  card's visibility, rather than redrawing an unchanged city camera.
  Touch browsing does not repeatedly reset desktop-only pointer effects.
  The map uses the small viewport height (`svh`), not the changing height of
  retracting mobile browser chrome. Older touch browsers freeze that height until
  the screen width changes. Address-bar movement does not change the scroll
  runway, sticky position, or album slot; actual layout/rotation changes still refit.
  The city list reserves space for both rows while the local data loads, so inserting
  city names does not shift the page or sticky reading position.
  The section is centered below the header when it fits; short screens align its
  lower map area above the viewport bottom rather than clipping the map.
  World/China buttons provide manual control on every device;
  manual selection persists until "Follow scroll" is selected. Reduced motion
  and effects off remove the sticky runway and disable scroll-follow but retain
  immediate manual changes. No JS and print also use normal document flow.
  Only the close-up camera changes: all 277 Chinese-view components, offshore
  islands, and maritime indicators stay in the coloring data. The close-up is
  not a full-country framing. It includes all nine eastern-China/Japan cities;
  Singapore remains available through the world view and city list.
  Color and texture never displace map geometry.
  The desktop map takes the larger side of a wider interlude, portrait tablets
  put a full-width map below compact introductory columns, and phones let the
  map extend to the screen edges. Short landscape screens keep a side-by-side
  composition. Scroll progress is measured from the story wrapper after the
  section reaches its sticky reading position, not from first entering the screen.
  `places.json` currently contains four owner-selected long-term places:
  Beijing, Nanjing, Suzhou, and Singapore. Beijing, Nanjing, and Suzhou each contain seven
  owner-supplied photographs; Singapore uses an openly credited placeholder,
  not claims about the owner's photography or dates of travel.
  Travel albums are Hangzhou/Shaoxing (seven photographs), Shanghai (five),
  Wuxi (seven), Tokyo/Yokohama/Mount Fuji (six), Osaka/Kyoto/Nara/Kobe (thirteen),
  and Okinawa (four), not additional residences.
- `art/atlas-world.svg` is the shared rendering geometry for the world and its
  China coloration. China changes its own gradient fill rather than receiving
  a second, differently shaped overlay. Its China outline is simplified to the
  world's low-detail visual scale, with topology-preserving simplification and
  smaller tolerances for small islands. `art/atlas-china.svg` retains the exact
  pinned reference outline but is no longer a separate runtime mask.
  The world source and China source are documented in [Map sources](#map-sources).
  No remote map service, API key, or runtime map dependency is used.
  The map uses a short bilingual accessible name, not a long SVG-title tooltip.
- `city-atlas.js` reads the local `places.json` and small `art/city-index.json`
  only when the map approaches the viewport. It fetches each exact outline from
  `art/city-regions/<id>.json` on first opening that city, rather than downloading
  all outlines before the first screen. Photographs and the camera can open while
  an outline loads; a visible status identifies pending or failed geometry.
  Failed data requests have a retry button and a bounded request timeout.
  It projects longitude/latitude
  into the same Pacific-centered coordinates as the map. Dots remain at their
  true coordinates; frameless, subtly shadowed names use collision-aware
  callouts and short leaders that stop before the actual text rather than running
  underneath it. Desktop hit boxes follow the measured name width (at least 32×26px);
  touch targets remain at least 80×44px. Measurements are cached across scroll frames
  and refreshed after language/font/layout changes. Nearby cities can be labeled
  individually without large visible boxes or oversized desktop collision zones.
  Callouts stay inside the map; crowded or off-camera cities remain accessible
  from the text city list. Long-term places use warm-colored dots and an album
  heading with the confirmed institution mark: Beijing/Microsoft,
  Nanjing/Nanjing University, Suzhou/Nanjing University, Singapore/NTU.
  Marks reuse the existing assets on the warm-white photo paper in either theme.
  The four residence postcards show the confirmed `period` below the city name:
  Nanjing 2023.09–2024.07, Suzhou 2024.09–2026.09, Beijing 2026.09–2026.12,
  and Singapore 2027.01–2027.05. Travel albums omit this line.
  Travel pins use smaller 10px/600 labels and 6px dots, below the residences'
  12px/800 labels and 9px dots. Leaders are at most 42px, with shorter placements
  preferred; touch retains the larger hit targets.
  Residences take priority when placing crowded callouts, except for the selected city.
  The city list separates residences in its first row from a quieter travel row;
  the latter can scroll horizontally as more destinations are added.
  Travel postcards show a bilingual "Travel / 旅行" heading label in the same
  position as "A place called home / 久居之地", without claiming a residence or institution.
  A text city list provides a second way to open
  each album, including cities outside the current map frame. A small non-modal
  card unfolds sideways from the real city point and retracts to it
  when closed. Opening also smoothly pans and zooms the map to fit the city's
  entire administrative outline (Singapore uses the planning footprint described below),
  keeping the map and every coordinate dot on one animated camera. It leaves
  space beside the outline for the card where the viewport permits. Opening
  uses a 1.2-second eased logarithmic zoom, panning toward the city ahead of the
  close-up so the enlargement stays perceptible. The paper unfolds over 700ms;
  closing retains its faster 560ms camera return and 440ms paper retraction.
  Reduced motion and effects-off still skip these transitions. The outline
  shares the map's geographic transform; it is not a skyline or decorative icon.
  Coarse world context fades while the selected boundary is highlighted.
  Above 12x zoom, the shared world geometry stops painting; the geographic city
  outline remains visible through focus and return. Normal world/China views
  and print restore the common world paths.
  Entries without a region keep point-based focus. An off-camera
  city unfolds from the clicked list entry before its point comes into view.
  The actual pre-open camera is retained, including a partial scroll zoom or
  interrupted manual transition, and restored on every dismissal. Switching
  cities updates the open card in place and retains that original return view.
  The card is an absolutely positioned child of the sticky atlas, not a fixed
  top-layer popover chasing scroll events. This keeps native/compositor scrolling
  and the card on the same layer, and does not require the Popover API,
  `@starting-style`, or discrete display/overlay transitions in older in-app browsers.
  Explicit open/close state preserves outside-click dismissal, Escape, focus return,
  and city switching without dismissing the album between two city buttons.
  Follow-scroll stays temporarily
  suspended while the album is open; after restoring, the next scroll movement
  smoothly rejoins the current scroll view. Explicit map controls take precedence.
  The card initially fits a viewport-bounded slot, then keeps its offset and height
  relative to the map throughout scrolling, including after the sticky section
  releases. Only a genuine viewport/layout change refits it; switching cities
  retains the slot. It never follows moving pin coordinates or flips sides mid-zoom.
  Its opening origin stays fixed
  through the entry animation; after focus, its closing origin follows the city.
  On narrow stacked layouts it unfolds above the map, leaving the actual
  geographic outline visible below. Compact phones fit the region beneath
  the card's reserved height, accounting for the second city row; short
  landscape maps also reserve space for both rows. In short landscape layouts,
  the card fits to the left of the map, over the introductory column, so neither
  city row is covered and all travel destinations remain tappable.
  Required third-party photo attribution appears in the album heading, outside
  the prints. Single- and multiple-photo albums share a bounded height, with
  complete photographs sized to the remaining space instead of changing the card's height.
  The rest of the page stays visible
  and scrollable, without a backdrop or focus trap. Printed-photo borders,
  paper shadows and slight rotations distinguish the pictures from a full-page
  gallery. `photo-deck.js` layers additional prints with exposed corners:
  click or tap any photograph to advance to the next one, including clicks on
  exposed rear prints. The whole stack follows one cyclic queue: the current print
  is highest, the next two prints expose their corners in order, and all remaining
  prints retain their lower queue ranks. Advancing moves the old top print to
  the tail. There is no previous-photo action. Swiping either left or right on
  a phone, Left/Right while a print is focused, and Enter/Space all advance.
  Only the current print is in the tab order. Photos have symmetric
  white borders with no captions or visible counter underneath; bilingual alt
  text, action labels and a screen-reader-only counter preserve accessibility.
  Vertical touch gestures remain native page scrolling. A swipe's synthetic
  click is suppressed without blocking a subsequent intentional tap.
  Explicit image dimensions preserve portrait/landscape framing without cropping;
  legacy photos without dimensions use a contained 3:2 area.
  On touch screens, prints share a bounded long-edge size, not a common height:
  landscape prints are wider/shorter and portrait prints narrower/taller.
  Phone cards use more of the available screen width while retaining a stable
  map-relative position and outer height when photographs change. Short phones
  reserve extra photo space without covering the remaining map or either city row.
  Only the selected and next two photos start loading eagerly; later photos load
  as they approach the front of the queue, without lazy-loading visible rear prints.
  The selected image has higher fetch priority than rear prints. A `picture`
  source selects metadata-free, 768px-long-edge derivatives on phone layouts,
  while desktop retains the original 1600px exports. Loading photographs have
  a visible status; failures expose a retry action without advancing the queue.
  Outside clicks,
  Escape, focus return, translated image descriptions, and explicit data/image errors are
  preserved. Scrolling keeps the album attached to the map, not clamped to the
  screen. It stays open while the atlas section remains visible, even when a point
  or city-list button goes offscreen, and dismisses after the entire section leaves
  the readable viewport. It continues moving with the map during that short fade,
  without covering the following section, and clips behind the fixed header.
  Explicit close/Escape retain the city-point retraction animation.
  Reduced motion/effects-off remove
  the card and camera animations while preserving focus and restoration. Manual map transitions, portrait-tablet
  letterboxing, reduced motion, and effects-off apply to the pins as well.
- The HyperCut and Argus + ACE research maps are semantic HTML/CSS diagrams in
  `index.html`. They use the site's theme variables and remain bilingual,
  responsive, printable, and readable without JavaScript. They are technical
  information graphics rather than additional watercolor scenes, so they do not
  change the one-scene-per-section rule. Keep each paper link, map, evidence, and
  explanatory copy in one `.publication` card so mobile readers never see the
  supporting material separated from its paper.
- The Argus ecosystem grid tracks public team repositories with meaningful
  team-owned or maintained work. Use organization URLs for ACE mirrors and
  maintained downstream projects; omit untouched integration/staging forks.
- The Selected Work illustrations combine the original HTML/SVG ACE-3 chip
  with three inline technical SVGs. They use
  seamless hover/focus loops on pointers and run while a phone touch is actively
  pressing or passing over a card; reduced motion and print disable those
  animations. They share a theme-aware graph-paper stage and cyan/orange
  accents, not the same drawing. ACE-3 retains its angled chip, 24 cells,
  registration sheets, traces, and scroll alignment; its compact lower ledger
  preserves the 24-layer/624-tensor facts and conceptual status. Keep ACE-2,
  FFT, and op-amp diagrams text-free. ACE-2 shows two token streams entering an RTL compute
  array, retained state banks, and the state-reuse return path. The FFT time
  waveform is one fixed trace: a sinusoidal segment followed by a long,
  irregular segment. Two identical copies move right at constant speed through
  a clipped viewport; the SVG path itself never morphs, and the 216-unit tile
  offset makes the loop seamless. Spectrum bins remain independent stems
  without a connecting envelope. The op-amp uses the
  referenced four-terminal enhancement MOS symbols: segmented channel,
  insulated gate, independent source/drain stems, and an open bulk terminal.
  The NMOS bulk arrow points toward the channel and the PMOS arrow points away.
  Preserve the netlist topology: NMOS differential pair, PMOS
  current-mirror load, NMOS tail device, PMOS common-source second stage, NMOS
  current-source load, and
  the first-stage-node → Rz → Cc → output compensation path.
- `preferences.js`: validated theme/language storage and pre-paint theme selection.
- `script.js`: language/theme controls with reduced-motion-aware view transitions,
  overlay mobile navigation that never changes page layout height, accessible
  project filters and preview selection, native project-disclosure scroll updates,
  progressive background painting, geographic zoom, section reveals,
  small pointer-driven illustration movement, a fluttering
  butterfly, card tilt/spotlights, magnetic buttons, and canvas petal trails with
  click ripples. The native cursor stays visible; the canvas never intercepts
  input. Generic cursor particles are capped at 64 and pixel ratio at 1.5; the
  click response uses softly diffused watercolor with tapered, broken pigment
  edges and a faint delayed echo, rather than hard oval outlines and confetti.
  Pigment contours stay stable as they expand; no more than four click ripples
  coexist. The mouse-movement petal trail remains unchanged. The
  shared frame loop stops when idle. Scroll and pointer cancellation clear cursor
  trails, not painting sequences. Each painting can have only one active sequence:
  repeated taps do not restart it, and other paintings cannot evict its actors.
  The seven full choreographies together are bounded at 70 actors and take
  priority over generic cursor effects. All paintings use image-local canvases,
  follow scrolling and parallax, and rescale without restarting during a resize
  (including a phone's collapsing address bar). Pause, reduced motion, blur,
  hidden tabs, and printing still clear all effects.
  The hero's effects toggle persists independently
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
  Mountain birds are five shaded, fork-tailed silhouettes in a loose formation,
  with different depths and wingbeat phases. Short wingbeat bursts alternate
  with gliding along a shared valley arc; the flock stays in an image-local layer.
  `script.js` owns inputs, actual image bounds, timers, announcements, and cleanup.
  Preserve these distinct interactions rather than recoloring one shared burst.

The content narrative is Hero → About → Elsewhere interlude → Work → Ecosystem →
Research → Connect → Contact. The geographic interlude is intentionally unnumbered.
Keep navigation, section numbering, and DOM order aligned. English
chapter headlines use concise internal rhymes; preserve the separate Chinese copy.

The page remains readable and navigable without JavaScript. Browser storage is
optional; unavailable storage emits a console warning and settings remain usable
for the current page. Typography is self-hosted under `fonts/`, with `font-display:
swap` and system fallbacks. No Google Fonts or GitHub avatar request is required
to render the page. `scripts/export_web_fonts.py` downloads the existing Latin
families and Chinese subsets covering published translations, and retains each
family's SIL Open Font License alongside the WOFF2 files. Regenerate after adding
Chinese copy; new glyphs still have native fallbacks. Chinese faces are restricted
to CJK ranges so an English-page arrow cannot trigger a full Chinese-font download.
The profile avatar and compact NTU logo are local; below-fold illustration and
institution images use native lazy loading and low fetch priority.
Reduced-motion preferences disable entrance/filter animation and pointer effects.

## Map sources

- World context: [Natural Earth 1:110m](https://github.com/nvkelso/natural-earth-vector/blob/ca96624a56bd078437bca8184e78163e5039ad19/geojson/ne_110m_admin_0_countries.geojson),
  commit `ca96624a56bd078437bca8184e78163e5039ad19`, [public domain](https://www.naturalearthdata.com/about/terms-of-use/).
  Input SHA-256: `6866c877d39cba9c357620878839b336d569f8c662d3cfab4cb1dbe2d39c977f`.
- Shared China geometry: [DataV.GeoAtlas](https://datav.aliyun.com/portal/school/atlas/area_selector),
  [national outline](https://geo.datav.aliyun.com/areas_v3/bound/100000.json).
  The exact input is preserved in `data/china-outline.geojson`, SHA-256
  `83ac502aeac66a5527607ec844169418505d990f1a2dc33226743643541eed3c`.
  Keep all 277 polygon components, including Taiwan, the Chinese-view disputed
  land areas, offshore islands, and maritime indicators. Do not replace this
  with Natural Earth's default mainland-only CHN selection.
- Geographic reference: the [government-published standard map and representation guidance](https://dnr.yn.gov.cn/html/2023/mtbd_0828/42854.html)
  and the [PRC map on the State Council website](https://www.gov.cn/guoqing/2017-07/28/content_5043915.htm).
  The highlight follows the PRC presentation requested for this site. This
  customized geographic illustration is **not** an officially reviewed standard
  map; do not attach an official map review number to it or claim legal approval.
  Consult the [official standard-map service](https://bzdt.ch.mnr.gov.cn/) when
  an approved standard-map publication is required.

The shared world replaces the coarse CHN/TWN shapes with a low-detail version of
the pinned China outline. Each of the 277 source components is normalized and
simplified with topology preservation, using a maximum tolerance of 0.16 degrees
and at most one eighth of the component's width/height or half its area/perimeter
ratio for small or narrow islands and maritime indicators. The source and exact
`art/atlas-china.svg` reference remain unchanged; the runtime China path has over
70% fewer coordinates. Coverage tests
retain the requested named regions and at least 80% of each source component.
The other-country path excludes the same simplified coverage, so the two
painted regions cannot overlap. Enclosed gaps caused by the different border
resolutions are filled outside the China path, preserving original lakes and
source holes. Known source self-intersections are normalized only in working
copies used for these boolean operations and simplification. Coloring changes the
existing China path's gradient, while paper texture reuses the same combined geometry.

Regenerate the shared world and reference outline with
`python scripts/export_atlas.py /path/to/ne_110m_admin_0_countries.geojson data/china-outline.geojson`.
The exporter clips polygons at the new world seam, preserves polygon holes,
and checks both pinned input hashes before writing. Shapely is required only
for authoring and tests, not for serving the website. Keep its `WEST = -30` aligned
with `--atlas-west` in `folio.css`; city projection reads the CSS value directly.
Run `python -m unittest discover -s scripts -p 'test_atlas.py'` after map changes.

### City-region outlines

`data/city-regions.geojson` records the normalized geometry, input SHA-256,
source URL, coordinate convention, and access date (2026-10-10).
`art/city-regions.json` retains the complete projected reference and compatibility
asset. The exporter also writes `art/city-index.json` (bounds and provenance) and
separate `art/city-regions/<id>.json` paths for on-demand delivery. Splitting does
not simplify or discard any components, including Okinawa's small islands.

- Beijing municipality (110000), Nanjing prefecture (320100), Suzhou prefecture
  (320500), Hangzhou prefecture (330100), Shanghai municipality (310000),
  and Wuxi prefecture (320200):
  [DataV GeoAtlas](https://help.aliyun.com/en/datav/datav-7-0/user-guide/datav-geoatlas-widgets/).
  The whole-unit sources are
  `https://geo.datav.aliyun.com/areas_v3/bound/<adcode>.json`.
  These are administrative extents, not just built-up city centers. DataV
  documents AMAP provenance and a primarily
  [GCJ-02 coordinate convention](https://www.alibabacloud.com/help/en/datav/datav-7-0/user-guide/map-data-format-1).
  Coordinates remain as supplied, consistent with the existing national highlight;
  do not describe the mixed-source map as survey-grade WGS84 alignment.
  DataV presents these data for learning/communication and directs copyright
  inquiries to AMAP; no blanket unrestricted license is asserted here.
- Singapore: [URA Master Plan 2025 Planning Area Boundary (No Sea)](https://data.gov.sg/datasets/d_2cc750190544007400b2cfd5d7f53209/view),
  used under the [Singapore Open Data Licence](https://data.gov.sg/open-data-licence).
  Dissolving the 55 planning areas retains all 47 geographic components.
  This is an indicative planning footprint excluding sea, **not** a territorial-water
  or cadastral boundary, or a guarantee of present-day coastline precision.
  The album displays source and license links; neither URA nor data.gov.sg endorses this site.
- Tokyo's 23 special wards, Osaka City's 24 wards, and Okinawa Prefecture:
  [MLIT National Land Numerical Information, N03 administrative areas, 2018-01-01](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-v2_3.html).
  These are adapted by this website from the official 2018 open-data release
  under the [MLIT Public Data License 1.0 terms](https://nlftp.mlit.go.jp/ksj/other/agreement.html),
  not the differently licensed 2020 release or an unlicensed community conversion.
  Source ZIPs contain GeoJSON in JGD2011 longitude/latitude (EPSG:6668); the
  exporter reads that GeoJSON directly without an extra shapefile dependency.
  Tokyo selects codes 13101–13123, excluding western Tokyo and distant islands.
  Osaka selects its 24 ward codes, excluding Sakai and the rest of Osaka Prefecture.
  Okinawa uses the prefecture's land footprint, not merely Okinawa City.
  Internal boundaries are dissolved, retaining 86, 16, and 4,833 components respectively.
  These dated, simplified illustrations are not current survey boundaries or
  combined outlines of the other destinations in each album. Source/license links
  and the adaptation notice appear in the album; MLIT does not endorse this site.

To regenerate, save the seven source collections as `beijing.json`, `nanjing.json`,
`suzhou.json`, `singapore.json`, `hangzhou.json`, `shanghai.json`, and `wuxi.json`.
Save the official Japanese source ZIPs as `tokyo.zip`, `osaka.zip`, and `okinawa.zip`
in the same local directory. Their URLs are
`https://nlftp.mlit.go.jp/ksj/gml/data/N03/N03-2018/N03-180101_<prefecture>_GML.zip`,
with prefecture codes 13, 27, and 47 respectively. Then run:

```sh
python scripts/export_city_regions.py /path/to/city-region-sources --accessed YYYY-MM-DD
python -m unittest discover -s scripts -p 'test_*.py'
```

The optional authoring/tests require Shapely and Pillow (`python -m pip install
shapely Pillow`); serving the site does not. The exporter dissolves internal
administrative/planning boundaries, preserves every geographic component, and limits simplification
area change to 0.1%. It uses the same seam/projection compiler as the national map.
Never change the pinned 277-component China source when refreshing city outlines.

## Adding city photos

Add only owner-confirmed cities to `places.json`. Beijing, Nanjing, and Suzhou each use seven
owner-supplied photographs. Singapore retains an owner-requested placeholder
photograph from Wikimedia Commons, with linked source, author and license
attribution in the album heading;
technical resize notices are not displayed in albums. The placeholder retains
its CC BY-SA 4.0 license; no endorsement is implied.
It is a 1280px Commons thumbnail, with no additional crops or color changes.
The owner's photos are not relicensed under the placeholders' Creative Commons licenses.
Each entry requires `id` (unique lowercase letters/numbers/hyphens), bilingual
`name: { "en": "...", "zh": "..." }`, numeric `longitude` and `latitude` in degrees,
and a non-empty `photos` array. Each photo has a local `src` under `photos/`,
bilingual `alt`, and an optional bilingual `caption` retained as metadata but
not displayed on the prints. Supply positive integer
`width` and `height` together to match the exported image's actual dimensions.
Third-party images also
use `credit: { author, title, source, license, licenseUrl, changes }`, where
`source` and `licenseUrl` are HTTPS URLs and optional `changes` is bilingual.
Supported formats are
JPG, PNG, WebP, and AVIF; use ASCII filenames without parent-directory segments.
Coordinates belong to the actual city, not a position measured from a screenshot.
This is a geographic overview rather than street-level navigation.

For a city group, keep `name`, coordinates, and `region` on the primary city;
set optional bilingual `albumTitle` for the name shown only inside the album.
For example, Hangzhou uses `albumTitle: { "en": "Hangzhou & Shaoxing", "zh": "杭州 · 绍兴" }`.
Its map label and city-list button still say Hangzhou, and its geographic outline
is Hangzhou alone, not a fabricated combined boundary. Future groups use the same
field without adding secondary map pins or changing the renderer.
Tokyo uses `Tokyo, Yokohama & Mount Fuji`; Osaka uses `Osaka, Kyoto, Nara & Kobe`.
Wuxi and Okinawa retain their single-place names.

New entries automatically create map pins, city-list buttons, and albums.
Use optional `residence: true` for long-term places and `institution` for the
confirmed mark (`microsoft`, `nju`, or `ntu`). Both fields are optional for
future travel-only cities; do not infer a residence or institution from a photo.
All six travel entries explicitly use `residence: false` and no `institution`.
The website contains 63 owner-supplied photographs plus Singapore's credited placeholder.
An optional `region` names a matching compiled geographic outline; an explicit
missing/invalid outline is an error, never an invented fallback boundary.
Replace a placeholder's `src`, `alt`, and `caption` with the owner's photograph
and remove that placeholder's `credit`; keep attribution on any retained stock
images. Add more photos to the same array to extend an album.
An empty dataset still shows neither empty albums nor explanatory placeholder
text. Remove private EXIF/GPS metadata from personal photographs before adding
them to this public repository.

For personal photos, use `python scripts/export_city_photos.py input.jpg photos/name.webp`.
This optional Pillow exporter corrects EXIF orientation, converts embedded color
profiles to sRGB, keeps the complete composition within 1600x1600, and writes only
pixels (no EXIF/GPS, XMP, ICC, or auxiliary MPO frames). It never alters the source,
upscales, or overwrites an existing destination. HEIC/HEIF input additionally
requires `python -m pip install pillow-heif`; that decoder is loaded only for those
formats. All 63 owner-photo exports use this pipeline, including the two
Nanjing and three additional Hangzhou/Shaoxing HEIC files and orientation-tagged portraits.
After updating `places.json`, run `python scripts/export_mobile_assets.py` to
generate missing 768px WebP derivatives and record each optional `mobileSrc`.
This reuses the metadata-safe exporter, preserves full-size photos, and refreshes
the small local avatar and NTU logo. Keep a changed photo's source filename unique
so existing derivatives are not mistaken for new content.

## Updating identity assets

Edit the two SVG masters, then run `python scripts/export_brand_icons.py` to
regenerate PNG and ICO files directly at their target sizes. This optional
authoring script uses Pillow, Python Playwright, and Google Chrome; none are
needed to serve the website. Do not upscale a small PNG to create larger icons.
When publishing new marks, update the identity cache keys in `index.html` and
`site.webmanifest` so browsers can refresh their cached icons.

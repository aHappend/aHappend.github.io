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
  the four "Start anywhere" entries, header contact link, menu/effects controls, close buttons, city-list entries,
  and photo credits. Navigation underlines, animated buttons, project previews,
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
  Its `landscape`, `sun-disc`, and `moon-disc` groups are reused through external
  SVG `use` references: the background has only one sun/moon, not a fixed sun
  underneath another celestial image. Switching theme lowers the outgoing sun
  or moon and raises the other; reduced motion and effects-off switch directly.
  Opening the standalone painting still shows the complete original sunlit work.
- `art/painted-study-portrait.svg` is a separately composed 720×1280 mountain,
  sky, and lake study for phones, not a crop or stretch of the desktop painting.
  The complete image uses `object-fit: contain`, with transparent feathered edges
  on all four sides blending into the blue paper. Its own pencil contours replace
  the wide-screen sketch; the shared sun/moon stays proportional and changes with
  the theme. `scripts/export_portrait_background.py` bakes pigment filters into
  the corresponding transparent WebP once, so phones only composite a cached image
  instead of running turbulence filters while scrolling. Regenerate with
  `python scripts/export_portrait_background.py` using the existing optional
  Pillow/Playwright/Chrome authoring setup. The website still needs no build step.
- The `#elsewhere` interlude defaults to **Follow scroll** on every page load.
  Its Pacific-centered world view places Asia on the left and the Americas on
  the right, with the longitude seam at 30°W. It moves to a 4.4x view centered
  near 110°E, 35°N, emphasizing mainland and eastern China through ordinary
  scrolling. A native sticky `.atlas-story` lets the world map reach a readable
  position first, then holds the section while scrolling changes only the map
  camera. Its 1.35-viewport scroll runway reserves the first and last 18% for
  the world and China views, with the zoom in between; it then releases naturally.
  Reverse scrolling reverses the sequence. No wheel/touch events are intercepted.
  The background painting pauses during this runway, leaving only the map camera
  moving. Scroll-linked variables are scoped to their visual layers rather than
  inherited by the entire document. Header/map dimensions and the city projection
  are cached until resize/reflow, map layers are prepared before entering the
  viewport, and pin positions use transforms rather than per-frame layout changes.
  Touch browsing does not repeatedly reset desktop-only pointer effects.
  The city-list row reserves its space while the local data loads, so inserting
  the initial four names does not shift the page or sticky reading position.
  The section is centered below the header when it fits; short screens align its
  lower map area above the viewport bottom rather than clipping the map.
  World/China buttons provide manual control on every device;
  manual selection persists until "Follow scroll" is selected. Reduced motion
  and effects off remove the sticky runway and disable scroll-follow but retain
  immediate manual changes. No JS and print also use normal document flow.
  Only the close-up camera changes: all 277 Chinese-view components, offshore
  islands, and maritime indicators stay in the coloring data. The close-up is
  not a full-country framing. Color and texture never displace map geometry.
  The desktop map takes the larger side of a wider interlude, portrait tablets
  put a full-width map below compact introductory columns, and phones let the
  map extend to the screen edges. Short landscape screens keep a side-by-side
  composition. Scroll progress is measured from the story wrapper after the
  section reaches its sticky reading position, not from first entering the screen.
  `places.json` currently contains four owner-selected long-term places:
  Beijing, Nanjing, Suzhou, and Singapore. At the owner's request, each album
  starts with an explicitly labeled, openly licensed placeholder photograph.
  These are not the owner's photographs or a claim about when a visit occurred.
- `art/atlas-world.svg` and `art/atlas-china.svg` are local geographic masks.
  They use different, explicitly documented sources; see [Map sources](#map-sources).
  No remote map service, API key, or runtime map dependency is used.
- `city-atlas.js` reads the local `places.json`, projects longitude/latitude
  into the same Pacific-centered coordinates as the map. Dots remain at their
  true coordinates; frameless, bold, contrast-outlined names use collision-aware
  callouts and fine leaders. Their transparent 80×44px targets keep nearby cities
  such as Nanjing and Suzhou separately usable without large visible boxes.
  Callouts stay inside the map; crowded or off-camera cities remain accessible
  from the text city list. Long-term places use warm-colored dots and an album
  heading with the confirmed institution mark: Beijing/Microsoft,
  Nanjing/Nanjing University, Suzhou/Nanjing University, Singapore/NTU.
  Marks reuse the existing assets on the warm-white photo paper in either theme.
  A text city list provides a second way to open
  each album, including cities outside the current map frame. A small non-modal
  native popover unfolds sideways from the real city point and retracts to it
  when closed. Opening also smoothly pans and zooms the map toward that city,
  keeping the map and every coordinate dot on one animated camera. It leaves
  space beside the point for the card where the viewport permits. An off-camera
  city initially unfolds from its list entry before its point comes into view.
  The actual pre-open camera is retained, including a partial scroll zoom or
  interrupted manual transition, and restored on every dismissal. Switching
  cities retains that original return view. Follow-scroll stays temporarily
  suspended while the album is open; after restoring, the next scroll movement
  smoothly rejoins the current scroll view. Explicit map controls take precedence.
  The card flips/clamps to stay within the viewport; on stacked mobile layouts
  it stays below the map controls and scrolls internally on short screens.
  The rest of the page stays visible
  and scrollable, without a backdrop or focus trap. Printed-photo borders,
  paper shadows and slight rotations distinguish the pictures from a full-page
  gallery. A reserved 3:2 print area contains each complete image without cropping
  and keeps the card stable while a photo loads. Additional photos scroll inside
  the same compact card. Outside clicks,
  Escape, focus return, translated captions, and explicit data/image errors are
  preserved. Scrolling keeps the card tied to its point and dismisses it when the
  point and list entry leave the readable screen. Reduced motion/effects-off remove
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
for the current page. External font styles load without blocking first paint or
map initialization; unavailable fonts retain system fallbacks. A `noscript`
stylesheet preserves the web fonts when JavaScript is disabled.
Reduced-motion preferences disable entrance/filter animation and pointer effects.

## Map sources

- World land: [Natural Earth 1:110m](https://github.com/nvkelso/natural-earth-vector/blob/ca96624a56bd078437bca8184e78163e5039ad19/geojson/ne_110m_admin_0_countries.geojson),
  commit `ca96624a56bd078437bca8184e78163e5039ad19`, [public domain](https://www.naturalearthdata.com/about/terms-of-use/).
- China highlight: [DataV.GeoAtlas](https://datav.aliyun.com/portal/school/atlas/area_selector),
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

Regenerate both masks with
`python scripts/export_atlas.py /path/to/ne_110m_admin_0_countries.geojson data/china-outline.geojson`.
The exporter clips polygons at the new world seam, preserves polygon holes,
and checks the China input hash before writing. Keep its `WEST = -30` aligned
with `--atlas-west` in `folio.css`; city projection reads the CSS value directly.
Run `python -m unittest discover -s scripts -p 'test_atlas.py'` after map changes.

## Adding city photos

Add only owner-confirmed cities to `places.json`. The initial four cities use
owner-requested placeholder photographs from Wikimedia Commons. Every image is
clearly labeled in both languages, with a linked source, author, and license;
technical resize notices are not displayed in albums. The local photographs retain their individual
licenses (CC BY-SA 4.0, or CC BY 3.0 for Suzhou); no endorsement is implied.
They are 1280px Commons thumbnails, with no additional crops or color changes.
Each entry requires `id` (unique lowercase letters/numbers/hyphens), bilingual
`name: { "en": "...", "zh": "..." }`, numeric `longitude` and `latitude` in degrees,
and a non-empty `photos` array. Each photo has a local `src` under `photos/`,
bilingual `alt`, and an optional bilingual `caption`. Third-party images also
use `credit: { author, title, source, license, licenseUrl, changes }`, where
`source` and `licenseUrl` are HTTPS URLs and optional `changes` is bilingual.
Supported formats are
JPG, PNG, WebP, and AVIF; use ASCII filenames without parent-directory segments.
Coordinates belong to the actual city, not a position measured from a screenshot.
This is a geographic overview rather than street-level navigation.

New entries automatically create map pins, city-list buttons, and albums.
Use optional `residence: true` for long-term places and `institution` for the
confirmed mark (`microsoft`, `nju`, or `ntu`). Both fields are optional for
future travel-only cities; do not infer a residence or institution from a photo.
Replace a placeholder's `src`, `alt`, and `caption` with the owner's photograph
and remove that placeholder's `credit`; keep attribution on any retained stock
images. Add more photos to the same array to extend an album.
An empty dataset still shows neither empty albums nor explanatory placeholder
text. Remove private EXIF/GPS metadata from personal photographs before adding
them to this public repository.

## Updating identity assets

Edit the two SVG masters, then run `python scripts/export_brand_icons.py` to
regenerate PNG and ICO files directly at their target sizes. This optional
authoring script uses Pillow, Python Playwright, and Google Chrome; none are
needed to serve the website. Do not upscale a small PNG to create larger icons.
When publishing new marks, update the identity cache keys in `index.html` and
`site.webmanifest` so browsers can refresh their cached icons.

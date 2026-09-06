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
- `art/*.webp`: responsive reproductions of public-domain watercolors by Winslow
  Homer and John Singer Sargent, supplied by The Metropolitan Museum of Art's Open
  Access collection. These are historical artworks, not paintings by the site owner.
  `art/credits.json` records original museum URLs, authors, dates, rights metadata,
  and resizing/display-crop details. Visible source links appear alongside the art
  and in the expandable artwork credits. The rejected procedural SVG motifs are
  no longer used. The chip graphic remains a conceptual illustration, not a die
  photograph or physical-layout result.
- `preferences.js`: validated theme/language storage and pre-paint theme selection.
- `script.js`: language/theme controls, mobile navigation, animated accessible
  project filters, section reveals, pointer-responsive lighting, and a native-dialog
  art gallery. Gallery controls support zoom, previous/next, arrow keys, Escape,
  and touch swipes. Closing the gallery restores focus to its trigger.

The page remains readable and navigable without JavaScript. Browser storage is
optional; unavailable storage emits a console warning and settings remain usable
for the current page. External fonts have system fallbacks.
Museum image links still work without JavaScript or native dialog support.
Reduced-motion preferences disable entrance/filter animation and pointer effects.

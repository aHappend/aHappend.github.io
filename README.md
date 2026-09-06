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
- `art/*.svg`: original, code-authored nature illustrations: the approved
  botanical still life, a varied wildflower meadow, woodland ferns, and a coastal
  landscape with beach, headlands and gentle surf. The illustrations use shaded
  forms, fine stems and veins, restrained pigment texture, and transparent edges.
  They blend into the page without frames or a gallery. No museum reproductions
  or image-generation service are used. Keep these layers decorative,
  non-interactive, and clear of readable text and controls.
  The chip graphic remains conceptual, not a die photograph or physical-layout result.
- `preferences.js`: validated theme/language storage and pre-paint theme selection.
- `script.js`: language/theme controls, mobile navigation, animated accessible
  project filters, section reveals, pointer-responsive lighting, and subtle
  background parallax. Phones use static, repositioned illustrations with unrestricted
  native scrolling; decorative backgrounds never capture clicks or touch gestures.

The page remains readable and navigable without JavaScript. Browser storage is
optional; unavailable storage emits a console warning and settings remain usable
for the current page. External fonts have system fallbacks.
Reduced-motion preferences disable entrance/filter animation and pointer effects.

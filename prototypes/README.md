# Prototypes

Throwaway demos, kept out of the site. Nothing here is linked from
`index.html` or loaded by it — open a file directly to look at it.

Each one reuses the real design tokens from `assets/css/site.css` (palette,
both themes, Fraunces + Instrument Sans, the `calm` reduce-motion contract)
so a demo reads the way it would read on the page. Fonts come from Google
Fonts here rather than `assets/fonts/`, which is the one thing that differs
from production.

- **`signature-moves.html`** — three candidates for a visual signature:
  a scroll-driven system diagram for the Work section, a depth-weighted
  typographic wall to replace the Stack chips, and generated canvas
  visuals for the side-project cards.

- **`live-type.html`** — idea 03: per-glyph variable-font response to the
  pointer. Also an audit of which Fraunces axes the site actually ships
  (`opsz` and `wght`; `SOFT` and `WONK` were instanced out of the subset,
  so the two `font-variation-settings` rules naming them are no-ops), what
  restoring each would cost in bytes, and how to move weight without the
  line changing width. The Google Fonts request here asks for axis
  *ranges* rather than pinned values, which is what makes the missing axes
  demonstrable at all.

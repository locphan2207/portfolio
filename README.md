# loc-phan.com

Personal site and portfolio for **Tan Loc Phan** — [loc-phan.com](https://www.loc-phan.com/)

A single static page. No build step, no framework, no runtime dependencies:
hand-written HTML, one stylesheet, one script, and four self-hosted webfonts.
Drop it on any static host.

```
index.html            markup
assets/css/site.css   design tokens + every component
assets/js/site.js     motion and interaction layer
assets/fonts/         Inter, Instrument Serif, JetBrains Mono (woff2, latin subset)
assets/img/           optimised portrait, project shots, favicon, share card
```

## Working on it

Any static server will do — there is nothing to compile:

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

## Notes

- **Theme** — dark and light are both first-class. The page follows
  `prefers-color-scheme` on first visit and remembers an explicit choice in
  `localStorage`. An inline script in `<head>` sets it before first paint so the
  wrong palette never flashes.
- **Skins** — the palette and the typefaces are one swappable unit. `site.css`
  ships three: `atelier` (bone paper, Fraunces, oxblood), `klein` (achromatic
  paper, Bricolage Grotesque, electric blue) and `press` (the hybrid — Fraunces
  on cool paper, blue and ochre). Switch with `data-skin` on `<html>`; drop the
  two you are not using and their fonts. Every skin is checked against WCAG AA
  in both themes.
- **Type roles** — components ask for `--display`, `--body`, `--label` and
  `--accentface`, never a family name, which is what lets a skin re-point the
  whole page from one block.
- **Motion** — everything pointer-driven shares one `requestAnimationFrame`
  loop; everything scroll-driven goes through `IntersectionObserver`. The page
  is complete and readable with JavaScript disabled.
- **Reduced motion** — `prefers-reduced-motion: reduce` seeds the default, but
  `html.calm` is what gates everything, and a nav toggle lets any visitor
  override it either way (persisted in `localStorage`). Reduce means no
  vestibular motion — translation, parallax, scroll-hijacking, drifting
  backgrounds — not a dead page: opacity and colour transitions stay. When the
  page is quiet only because the OS asked, it says so once, with a way to turn
  motion on, so a plain page never reads as broken.
- **Ink field** — the canvas behind the content spawns pigment along the pointer
  path and composites `multiply` on paper, `screen` on ink, so one particle
  system reads as bleed in the light theme and glow in the dark one. Blobs are
  drawn from a pre-rendered sprite; building a gradient per blob per frame is
  what makes this kind of effect stutter.
- **Work gallery** — the section is given enough height for the rail's overflow,
  then the stage sticks inside it and vertical progress drives `translateX`. The
  height is derived from the rail, so adding a project needs no magic numbers.
  Under 900px, and under reduced motion, it degrades to an ordinary swipeable
  scroller from the same markup.
- **Images** — sources live in git history. `assets/img/` holds derivatives in
  WebP with JPEG fallbacks, served through `<picture>`.

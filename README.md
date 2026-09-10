# loc-phan.com

Personal site and portfolio for **Loc Phan** — [loc-phan.com](https://www.loc-phan.com/)

A single static page. No build step, no framework, no runtime dependencies:
hand-written HTML, one stylesheet, one script, and three self-hosted webfonts.
Drop it on any static host.

```
index.html            markup
assets/css/site.css   design tokens + every component
assets/js/site.js     motion and interaction layer
assets/fonts/         Fraunces + Instrument Sans (woff2, latin subset)
assets/img/           optimized portrait, favicon, share card
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
- **Color** — the whole palette lives in the two `[data-theme]` blocks at the
  top of `site.css`. The accent is petrol teal: `#0e5560` on paper, `#52c6d8`
  on ink. `--ink-rgb` is the same color as an RGB triplet, which is what the
  ink field paints with. Every text color is checked against WCAG AA in both
  themes.
- **Type roles** — components ask for `--display`, `--body`, `--label` or
  `--accentface` and never name a face, so the whole page re-points from one
  block. Today that is Fraunces for display (SOFT 0, WONK 1) and Instrument
  Sans for everything else.
- **Motion** — everything pointer-driven shares one `requestAnimationFrame`
  loop; everything scroll-driven goes through `IntersectionObserver`. The page
  is complete and readable with JavaScript disabled.
- **Reduced motion** — `prefers-reduced-motion: reduce` seeds the default, but
  `html.calm` is what gates everything, and a nav toggle lets any visitor
  override it either way (persisted in `localStorage`). Reduce means no
  vestibular motion — translation, parallax, scroll-hijacking, drifting
  backgrounds — not a dead page: opacity and color transitions stay. When the
  page is quiet only because the OS asked, it says so once, with a way to turn
  motion on, so a plain page never reads as broken.
- **Ink field** — the canvas behind the content spawns pigment along the pointer
  path and composites `multiply` on paper, `screen` on ink, so one particle
  system reads as bleed in the light theme and glow in the dark one. Blobs are
  drawn from a pre-rendered sprite; building a gradient per blob per frame is
  what makes this kind of effect stutter.
- **Side-projects rail** — the section is given enough height for the rail's
  overflow, then the stage sticks inside it and vertical progress drives
  `translateX`. The height is derived from the rail, so adding a project needs
  no magic numbers.
  Under 900px, and under reduced motion, it degrades to an ordinary swipeable
  scroller from the same markup.
- **Images** — sources live in git history. `assets/img/` holds derivatives in
  WebP with JPEG fallbacks, served through `<picture>`.

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
- **Rails** — every run on the page uses the same device, so the page only ever
  teaches one scroll behaviour: the section is given enough height for the
  rail's overflow, then the stage sticks inside it and vertical progress
  drives `translateX`. Travel is measured off the last card rather than
  `scrollWidth`, because a flex row drops its trailing padding from that, and
  the height is derived from the rail, so adding a card needs no magic
  numbers. Both jobs in Work are one factory (`pinnedRail`) called twice —
  Google's adds the diagram that lights with the cards, Smarkets' is the same
  run with nothing beside it — so the two cannot drift apart.
  A rail whose cards already fit across hands its height back and renders as
  an ordinary row; the floor is half a card, because a run that brings in half
  a card is still a run and costs exactly its own length in scroll, where one
  that brings in nothing would buy a screen of it to move a hairline.
  The side-projects rail hands scrolling back to the browser under 900px. The
  work rails keep running off scroll there — width only decides whether the
  diagram's caption sits beside it or under it — and unpin only where they
  genuinely cannot work: a viewport too short to hold the diagram and a card
  at once, reduced motion, or no JavaScript. All degrade to an ordinary
  swipeable scroller from the same markup.
- **System diagram** — the work at Google is invisible by nature, so the Work
  section draws it instead of describing it. Each card lights the nodes it is
  about and runs traffic on the edges it uses; `pathLength="100"` normalises
  every edge so one dash pattern gives the same pulse on a long curve and a
  short straight. The drawing sits above the run rather than beside it: side
  by side the two halves each paid for the other — the diagram rendered in 44%
  of the screen and the cards ran ten lines deep in the rest. Stacked, height
  is the scarce thing, so the caption moves alongside the diagram and the
  drawing takes whatever the cards leave rather than a fixed cap. Step 03 is the only one that changes the drawing's shape:
  the datastore splits, both paths take writes, then the old table is cut
  loose. Every node label carries a short form for the narrow layout, where
  the drawing renders at about half size and the edge labels come off — the
  caption says the same thing in words.
- **Stack wall** — one mass instead of four chip trays. Size carries how deep
  the thing goes, colour carries the field, and picking a term pulls its whole
  field forward. The depth is a reading of the copy on this page, not a
  metric, which is why nothing on screen claims a number.
- **Images** — sources live in git history. `assets/img/` holds derivatives in
  WebP with JPEG fallbacks, served through `<picture>`.

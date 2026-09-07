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
- **Colour** — the whole palette lives in the `:root` / `[data-theme]` blocks at
  the top of `site.css`. Change `--ember`, `--amber` and `--iris` and the entire
  site follows. Text colours are checked against WCAG AA in both themes.
- **Motion** — everything pointer-driven shares one `requestAnimationFrame`
  loop; everything scroll-driven goes through `IntersectionObserver`. All of it
  switches off under `prefers-reduced-motion: reduce`, and the page is complete
  and readable with JavaScript disabled.
- **Images** — sources live in git history. `assets/img/` holds derivatives in
  WebP with JPEG fallbacks, served through `<picture>`.

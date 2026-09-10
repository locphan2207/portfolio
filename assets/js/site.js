/* ═══════════════════════════════════════════════════════════════════════
   Loc Phan — interaction layer. No dependencies.
   Everything pointer-driven shares one rAF loop; everything scroll-driven
   goes through IntersectionObserver. Nothing runs under reduced motion.
   ═══════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;

  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const fineQuery   = matchMedia('(hover: hover) and (pointer: fine)');

  // The OS setting is the default, not the verdict — a visitor can turn the
  // motion system on or off from the page, and that choice sticks. Everything
  // re-reads `calm` as it runs, so flipping it needs no reload.
  function storedMotion() {
    try { return localStorage.getItem('motion'); } catch (e) { return null; }
  }
  function resolveCalm() {
    const pref = storedMotion();
    if (pref === 'full') return false;
    if (pref === 'reduced') return true;
    return motionQuery.matches;
  }
  let calm = resolveCalm();
  function applyCalm() {
    calm = resolveCalm();
    root.classList.toggle('calm', calm);
    root.classList.toggle('has-cursor', !calm && fineQuery.matches);
    if (motionBtn) {
      motionBtn.setAttribute('aria-pressed', String(!calm));
      motionBtn.setAttribute('aria-label', calm ? 'Turn animation on' : 'Turn animation off');
      motionBtn.title = calm ? 'Animation off' : 'Animation on';
    }
    if (!calm) { measureRail && measureRail(); driveRail && driveRail(); }
  }
  motionQuery.addEventListener('change', () => { if (!storedMotion()) applyCalm(); });

  let motionBtn = null;
  const lerp  = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ── Loader ───────────────────────────────────────────────────────── */

  const loader = $('#loader');

  function bootLoader() {
    if (calm || !loader) { finish(0); return; }

    const bar   = $('#loaderBar');
    const count = $('#loaderCount');
    const start = performance.now();
    const span  = 900;
    let done = false;

    (function tick(now) {
      // Ease toward 100 so the bar decelerates instead of running out flat.
      const p = clamp((now - start) / span, 0, 1);
      const eased = 1 - Math.pow(1 - p, 2.4);
      const pct = Math.round(eased * 100);
      count.textContent = pct;
      bar.style.transform = `scaleX(${eased})`;
      if (p < 1) requestAnimationFrame(tick);
      else if (!done) { done = true; finish(280); }
    })(start);

    function finish(delay) {
      setTimeout(() => {
        loader && loader.classList.add('is-done');
        root.classList.add('is-ready');
        setTimeout(sweepName, 620);
      }, delay);
    }
  }

  if (document.readyState === 'complete') bootLoader();
  else addEventListener('load', bootLoader);
  // Never let a stalled asset trap the page behind the curtain.
  setTimeout(() => { loader && loader.classList.add('is-done'); root.classList.add('is-ready'); }, 3500);

  /* ── Reveal on scroll ─────────────────────────────────────────────── */

  const revealables = $$('[data-reveal], .cta, [data-words]');
  revealables.forEach(el => {
    if (el.dataset.delay) el.style.setProperty('--d', el.dataset.delay);
  });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        // Also fire for anything already scrolled past — a fast scroll or a
        // late layout shift must never leave copy parked at opacity 0.
        if (!entry.isIntersecting && entry.boundingClientRect.top > 0) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    revealables.forEach(el => io.observe(el));
  } else {
    revealables.forEach(el => el.classList.add('is-in'));
  }

  // The gallery re-measures once its images land, which moves everything below
  // it. A periodic sweep guarantees no copy is left parked at opacity 0 if that
  // shift outruns the observer.
  function sweepReveals() {
    for (const el of revealables) {
      if (el.classList.contains('is-in')) continue;
      if (el.getBoundingClientRect().top < innerHeight * .92) el.classList.add('is-in');
    }
  }

  /* ── Gradient-fill headings ───────────────────────────────────────── */
  // Duplicate the text into ::before so a pointer-tracked mask can wipe
  // the flat color away and let the gradient underneath show through.
  $$('[data-fill]').forEach(el => el.dataset.text = el.textContent);

  // One light-pass across the name on arrival, so the color underneath
  // announces itself before anyone thinks to move the mouse.
  function sweepName() {
    const title = $('#heroTitle');
    if (!title || calm) return;
    const words = $$('[data-fill]', title);
    if (!words.length) return;

    const box = title.getBoundingClientRect();
    const start = performance.now();
    const span = 1500;

    (function step(now) {
      const p = clamp((now - start) / span, 0, 1);
      const eased = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      const x = box.left + (-0.25 + eased * 1.5) * box.width;
      const y = box.top + box.height * .5;
      words.forEach(el => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--lx', `${x - r.left}px`);
        el.style.setProperty('--ly', `${y - r.top}px`);
        el.style.setProperty('--fx', `${clamp(((x - r.left) / r.width) * 100, 0, 100)}%`);
      });
      if (p < 1) requestAnimationFrame(step);
      else if (!pointer.has) words.forEach(el => {
        el.style.setProperty('--lx', '-400px');
        el.style.setProperty('--ly', '-400px');
      });
    })(start);
  }

  /* ── Pointer loop ─────────────────────────────────────────────────── */

  const cursor = $('#cursor');
  const dot    = cursor && $('.cursor__dot', cursor);
  const ring   = cursor && $('.cursor__ring', cursor);
  const spot   = $('.ambient__spot');
  const fills  = $$('[data-fill]');
  const magnets = $$('[data-magnetic]');
  const tilts   = $$('[data-tilt]');

  const pointer = { x: -400, y: -400, has: false };
  const eased   = { x: -400, y: -400 };
  const ringPos = { x: -400, y: -400 };

  let usePointer = fineQuery.matches && !calm;

  function enableCursor() {
    if (!usePointer || !cursor) return;
    root.classList.add('has-cursor');
  }
  enableCursor();
  fineQuery.addEventListener('change', e => {
    usePointer = e.matches && !calm;
    root.classList.toggle('has-cursor', usePointer);
  });

  addEventListener('pointermove', (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    if (!pointer.has) {
      pointer.has = true;
      eased.x = ringPos.x = pointer.x;
      eased.y = ringPos.y = pointer.y;
      cursor && cursor.classList.add('is-live');
    }
    hover(e.target);
  }, { passive: true });

  addEventListener('pointerdown', () => cursor && cursor.classList.add('is-down'));
  addEventListener('pointerup',   () => cursor && cursor.classList.remove('is-down'));
  document.addEventListener('mouseleave', () => cursor && cursor.classList.add('is-hidden'));
  document.addEventListener('mouseenter', () => cursor && cursor.classList.remove('is-hidden'));

  function hover(target) {
    if (!cursor) return;
    const hit = target instanceof Element ? target.closest('[data-cursor]') : null;
    const mode = hit ? hit.dataset.cursor : '';
    cursor.classList.toggle('is-link', mode === 'link');
    cursor.classList.toggle('is-view', mode === 'view');
  }

  let frame = 0;
  function loop() {
    frame = requestAnimationFrame(loop);
    if (!pointer.has || calm) return;

    // Two trailing speeds give the cursor its weight: dot snappy, ring lazy.
    eased.x   = lerp(eased.x,   pointer.x, .35);
    eased.y   = lerp(eased.y,   pointer.y, .35);
    ringPos.x = lerp(ringPos.x, pointer.x, .16);
    ringPos.y = lerp(ringPos.y, pointer.y, .16);

    if (usePointer && cursor) {
      dot.style.transform  = `translate3d(${eased.x}px, ${eased.y}px, 0) translate(-50%, -50%)`;
      ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0) translate(-50%, -50%)`;
    }

    if (spot) {
      spot.style.setProperty('--mx', `${eased.x}px`);
      spot.style.setProperty('--my', `${eased.y}px`);
    }

    for (const el of fills) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200) continue;
      el.style.setProperty('--lx', `${pointer.x - r.left}px`);
      el.style.setProperty('--ly', `${pointer.y - r.top}px`);
      el.style.setProperty('--fx', `${clamp(((pointer.x - r.left) / r.width) * 100, 0, 100)}%`);
      el.style.setProperty('--fy', `${clamp(((pointer.y - r.top) / r.height) * 100, 0, 100)}%`);
    }
  }
  loop();
  inkField();

  /* Pause the loop when the tab is hidden. */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(frame);
    else { cancelAnimationFrame(frame); loop(); }
  });


  /* ── Ink field ────────────────────────────────────────────────────── */
  // Pigment spawned along the pointer path, expanding and fading. The canvas
  // sits behind the content and composites with multiply on paper, screen on
  // ink, so the same particles read as bleed in one theme and glow in the
  // other. Blobs are drawn from a pre-rendered sprite — building a radial
  // gradient per blob per frame is what makes this kind of effect stutter.

  function inkField() {
    const cv = $('#ink');
    if (!cv) return;
    const ctx = cv.getContext('2d', { alpha: true });
    if (!ctx) return;

    const MAX = 210;
    const blobs = [];
    let w = 0, h = 0, dpr = 1, sprite = null, spriteKey = '';

    function readInk() {
      const raw = getComputedStyle(root).getPropertyValue('--ink-rgb').trim() || '255 106 61';
      const [r, g, b] = raw.split(/[\s,]+/).map(Number);
      return [r || 0, g || 0, b || 0];
    }

    function buildSprite() {
      const rgb = readInk();
      const key = rgb.join(',');
      if (key === spriteKey && sprite) return;
      spriteKey = key;
      const S = 128;
      sprite = document.createElement('canvas');
      sprite.width = sprite.height = S;
      const sc = sprite.getContext('2d');
      const g = sc.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      g.addColorStop(0,   `rgba(${rgb.join(',')},1)`);
      g.addColorStop(.30, `rgba(${rgb.join(',')},.78)`);
      g.addColorStop(.62, `rgba(${rgb.join(',')},.30)`);
      g.addColorStop(.85, `rgba(${rgb.join(',')},.07)`);
      g.addColorStop(1,   `rgba(${rgb.join(',')},0)`);
      sc.fillStyle = g;
      sc.fillRect(0, 0, S, S);
    }

    function size() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = innerWidth; h = innerHeight;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      cv.style.width = w + 'px';
      cv.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    size();
    buildSprite();
    addEventListener('resize', size, { passive: true });

    function spawn(x, y, vx, vy, power) {
      if (calm) return;
      const speed = Math.min(Math.hypot(vx, vy), 90);
      const n = 1 + Math.floor(speed / 22);
      for (let i = 0; i < n; i++) {
        blobs.push({
          x: x + (Math.random() - .5) * 16,
          y: y + (Math.random() - .5) * 16,
          vx: vx * .05 + (Math.random() - .5) * .8,
          vy: vy * .05 + (Math.random() - .5) * .8,
          r: (11 + Math.random() * 16 + speed * .22) * power,
          grow: .42 + Math.random() * .8,
          life: 0,
          span: 58 + Math.random() * 76,
          rot: Math.random() * Math.PI,
          squash: .58 + Math.random() * .74,
          a: (.11 + Math.random() * .1) * power,
        });
        if (blobs.length > MAX) blobs.shift();
      }
    }

    let px = -1, py = -1, lastMove = -1e9;
    function track(e) {
      const x = e.clientX, y = e.clientY;
      if (px >= 0) spawn(x, y, x - px, y - py, 1);
      px = x; py = y;
      lastMove = performance.now();
    }
    addEventListener('pointermove', track, { passive: true });
    addEventListener('pointerdown', (e) => {
      // A press throws a heavier splash than a drag ever will.
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        spawn(e.clientX, e.clientY, Math.cos(a) * 34, Math.sin(a) * 34, 1.5);
      }
    }, { passive: true });

    let raf = 0, idle = 0;
    function frame() {
      raf = requestAnimationFrame(frame);
      if (calm) {
        if (blobs.length) { blobs.length = 0; ctx.clearRect(0, 0, w, h); }
        return;
      }
      buildSprite();
      ctx.clearRect(0, 0, w, h);
      if (!sprite) return;

      // Bleed on its own whenever the pointer has been still for a moment,
      // so the page is never a flat rectangle waiting to be touched.
      if (performance.now() - lastMove > 1400 && ++idle % 16 === 0) {
        spawn(w * (.12 + Math.random() * .74), h * (.16 + Math.random() * .58),
              (Math.random() - .5) * 10, (Math.random() - .5) * 10, .85);
      }

      for (let i = blobs.length - 1; i >= 0; i--) {
        const b = blobs[i];
        b.life++;
        if (b.life >= b.span) { blobs.splice(i, 1); continue; }
        b.x += b.vx; b.y += b.vy;
        b.vx *= .94; b.vy *= .94;

        const t = b.life / b.span;
        const fade = t < .1 ? t / .1 : 1 - (t - .1) / .9;
        const r = b.r + b.grow * b.life;

        ctx.globalAlpha = Math.max(0, b.a * fade);
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);
        ctx.scale(1, b.squash);
        ctx.drawImage(sprite, -r, -r, r * 2, r * 2);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      ctx.globalAlpha = 1;
    }
    frame();

    document.addEventListener('visibilitychange', () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) frame();
    });
  }

  /* ── Magnetic buttons ─────────────────────────────────────────────── */

  magnets.forEach(el => {
    const pull = (e) => {
      if (calm) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${dx * .22}px, ${dy * .3}px)`;
    };
    el.addEventListener('pointermove', pull);
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });

  /* ── Card tilt ────────────────────────────────────────────────────── */

  tilts.forEach(card => {
    const frame = card.querySelector('.frame');
    if (!frame) return;

    card.addEventListener('pointermove', (e) => {
      if (calm || !fineQuery.matches) return;
      const r = frame.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width  - .5;
      const py = (e.clientY - r.top)  / r.height - .5;
      frame.style.transform =
        `perspective(1100px) rotateY(${px * 7}deg) rotateX(${-py * 5}deg) translate3d(0,-6px,0)`;
    });
    card.addEventListener('pointerleave', () => { frame.style.transform = ''; });
  });

  /* ── Portrait parallax ────────────────────────────────────────────── */

  const portrait = $('[data-parallax] img');
  if (portrait) {
    let ticking = false;
    addEventListener('scroll', () => {
      if (ticking || calm) return;
      ticking = true;
      requestAnimationFrame(() => {
        const r = portrait.getBoundingClientRect();
        const mid = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        portrait.style.setProperty('--py', `${clamp(mid * -26, -26, 26)}px`);
        ticking = false;
      });
    }, { passive: true });
  }


  /* ── Pinned horizontal gallery ────────────────────────────────────── */
  // The section is given enough height for the rail's overflow, then the
  // stage sticks inside it and vertical progress drives translateX. The
  // section height is derived from the rail, so adding a project needs no
  // magic numbers. Below the breakpoint the CSS hands scrolling back to the
  // browser and this stays out of the way.

  const gallery = $('#gallery');
  const rail = $('#rail');
  const meter = $('.gallery__meter i');
  const railNow = $('#railNow');
  const cardEls = rail ? $$('.card:not(.card--end)', rail) : [];
  const wide = matchMedia('(min-width: 901px)');

  let travel = 0;

  function measureRail() {
    if (!gallery || !rail) return;
    if (!wide.matches || calm) {
      rail.style.removeProperty('transform');
      gallery.classList.remove('is-static');
      gallery.style.height = '';
      rail.style.transform = '';
      travel = 0;
      return;
    }
    travel = Math.max(0, rail.scrollWidth - innerWidth);

    // The rail can simply fit: few enough cards, or a wide enough screen. There
    // is nothing to travel then, so hand the section back its natural height
    // rather than park a motionless stage in a viewport of reserved space.
    if (!travel) {
      gallery.classList.add('is-static');
      gallery.style.height = '';
      rail.style.transform = '';
      return;
    }

    gallery.classList.remove('is-static');
    // A little slack past the end so the last card is readable before release.
    gallery.style.height = `${innerHeight + travel + innerHeight * 0.15}px`;
  }

  function driveRail() {
    if (!gallery || !rail || !travel) return;
    const box = gallery.getBoundingClientRect();
    const span = box.height - innerHeight;
    const p = clamp(-box.top / span, 0, 1);
    rail.style.transform = `translate3d(${-p * travel}px, 0, 0)`;
    if (meter) meter.style.setProperty('--rail-p', p.toFixed(4));

    // Counter tracks whichever project card is nearest the reading edge.
    if (railNow) {
      const edge = innerWidth * .28;
      let best = 1, bestD = Infinity;
      cardEls.forEach((c, i) => {
        const d = Math.abs(c.getBoundingClientRect().left - edge);
        if (d < bestD) { bestD = d; best = i + 1; }
      });
      const label = String(Math.min(best, cardEls.length)).padStart(2, '0');
      if (railNow.textContent !== label) railNow.textContent = label;
    }
  }

  if (gallery && rail) {
    measureRail();
    driveRail();
    addEventListener('resize', () => { measureRail(); driveRail(); }, { passive: true });
    wide.addEventListener('change', () => { measureRail(); driveRail(); });
    // Screenshots load late and change the rail's width.
    addEventListener('load', () => { measureRail(); driveRail(); });
    $$('img', rail).forEach(img => {
      if (!img.complete) img.addEventListener('load', () => { measureRail(); driveRail(); }, { once: true });
    });
    // Tabbing into a card off-screen must bring it into view. Rail travel is
    // linear in scroll, so convert the wanted horizontal shift back to pixels
    // of page scroll rather than letting the browser scroll a pinned stage.
    $$('a', rail).forEach(a => a.addEventListener('focus', () => {
      if (!travel) return;
      const span = gallery.getBoundingClientRect().height - innerHeight;
      const want = a.getBoundingClientRect().left - innerWidth * .18;
      if (Math.abs(want) < 8) return;
      scrollTo({ top: scrollY + want * (span / travel), behavior: calm ? 'auto' : 'smooth' });
    }));
  }

  /* ── Scroll velocity ──────────────────────────────────────────────── */
  // One shared readout: how fast the page is moving, smoothed. Sections
  // stretch a little into the direction of travel and the marquee speeds up,
  // which is what makes fast scrolling feel like weight rather than teleporting.

  const skewables = $$('[data-skew]');
  const marqueeTracks = $$('.marquee__track');
  let lastScroll = scrollY, vel = 0, smooth = 0, lastRush = 1, sweepTick = 0;

  function velocityFrame() {
    const y = scrollY;
    vel = y - lastScroll;
    lastScroll = y;
    smooth += (vel - smooth) * .16;

    driveRail();
    if ((sweepTick = (sweepTick + 1) % 20) === 0) sweepReveals();

    if (!calm) {
      const stretch = clamp(smooth / 34, -1, 1);
      for (const el of skewables) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -100 || r.top > innerHeight + 100) continue;
        el.style.transform = `skewY(${(stretch * -1.15).toFixed(3)}deg) scaleY(${(1 + Math.abs(stretch) * .026).toFixed(4)})`;
      }
      const rush = 1 + Math.min(Math.abs(smooth) / 16, 3.2);
      if (Math.abs(rush - lastRush) > .04) {
        lastRush = rush;
        for (const t of marqueeTracks) t.style.animationDuration = `${(t.dataset.dur || 30) / rush}s`;
      }
    }
    requestAnimationFrame(velocityFrame);
  }
  requestAnimationFrame(velocityFrame);

  /* ── Per-word reveal ──────────────────────────────────────────────── */

  $$('[data-words]').forEach(el => {
    if (el.dataset.split) return;
    el.dataset.split = '1';
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach((word, i) => {
      const span = document.createElement('span');
      span.className = 'w';
      span.style.setProperty('--i', i);
      span.textContent = word;
      el.append(span, document.createTextNode(' '));
    });
  });

  /* ── Scrambling role words ────────────────────────────────────────── */

  const CHARS = '!<>-_\\/[]{}—=+*^?#________';

  $$('.scramble').forEach(el => {
    let words;
    try { words = JSON.parse(el.dataset.scramble); } catch (_) { return; }
    if (!Array.isArray(words) || words.length < 2) return;

    let index = 0, queue = [], raf = 0, tick = 0;

    const setText = (next) => new Promise(resolve => {
      const prev = el.textContent;
      const len = Math.max(prev.length, next.length);
      queue = [];
      for (let i = 0; i < len; i++) {
        const start = Math.floor(Math.random() * 24);
        queue.push({
          from: prev[i] || '',
          to: next[i] || '',
          start,
          end: start + Math.floor(Math.random() * 24) + 12,
          char: ''
        });
      }
      cancelAnimationFrame(raf);
      tick = 0;
      const run = () => {
        let out = '', settled = 0;
        for (const q of queue) {
          if (tick >= q.end) { settled++; out += q.to; }
          else if (tick >= q.start) {
            if (!q.char || Math.random() < .3) q.char = CHARS[Math.floor(Math.random() * CHARS.length)];
            out += `<i>${q.char}</i>`;
          } else out += q.from;
        }
        el.innerHTML = out;
        if (settled === queue.length) resolve();
        else { tick++; raf = requestAnimationFrame(run); }
      };
      run();
    });

    const cycle = () => {
      if (calm) { el.textContent = words[index]; setTimeout(cycle, 2400); return; }
      index = (index + 1) % words.length;
      setText(words[index]).then(() => setTimeout(cycle, 2400));
    };
    setTimeout(cycle, 2600);
  });

  /* Scrambled glyphs get the accent so the churn reads as deliberate. */
  const scrambleStyle = document.createElement('style');
  scrambleStyle.textContent = '.scramble i{font-style:normal;color:var(--ember);opacity:.85}';
  document.head.appendChild(scrambleStyle);

  /* ── Marquee ──────────────────────────────────────────────────────── */
  // Duplicate the track so the -50% translate loops with no visible seam,
  // and pace each row by its own width for a constant scroll speed.

  $$('[data-marquee]').forEach(row => {
    const track = $('.marquee__track', row);
    if (!track) return;
    const width = track.scrollWidth;
    track.innerHTML += track.innerHTML;
    const dur = Math.max(18, width / 45);
    track.dataset.dur = dur;
    track.style.setProperty('--dur', `${dur}s`);
  });

  /* ── Nav: stick, auto-hide, scrollspy, sliding pill ───────────────── */

  const nav      = $('#nav');
  const navLinks = $$('[data-nav]');
  const linkBox  = $('.nav__links');
  const bar      = $('#progress');

  let lastY = scrollY;

  function movePill(link) {
    if (!linkBox || !link) return;
    linkBox.classList.add('has-pill');
    linkBox.style.setProperty('--pill-x', `${link.offsetLeft}px`);
    linkBox.style.setProperty('--pill-w', `${link.offsetWidth}px`);
  }

  function onScroll() {
    const y = scrollY;
    const max = document.body.scrollHeight - innerHeight;

    nav.classList.toggle('is-stuck', y > 24);
    // Hide on the way down, but never over the hero and never while a menu is open.
    nav.classList.toggle('is-up', y > lastY && y > 420 && !document.body.classList.contains('is-locked'));
    lastY = y;

    if (bar) bar.style.setProperty('--p', max > 0 ? clamp(y / max, 0, 1) : 0);
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if ('IntersectionObserver' in window && navLinks.length) {
    const sections = navLinks
      .map(a => document.querySelector(a.getAttribute('href')))
      .filter(Boolean);

    const spy = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const link = navLinks.find(a => a.getAttribute('href') === `#${entry.target.id}`);
        navLinks.forEach(a => a.classList.toggle('is-active', a === link));
        movePill(link);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(s => spy.observe(s));

    // Above the first section nothing is active, so retire the pill.
    addEventListener('scroll', () => {
      const work = document.getElementById('work');
      if (work && work.getBoundingClientRect().top > innerHeight * .55) {
        navLinks.forEach(a => a.classList.remove('is-active'));
        linkBox && linkBox.classList.remove('has-pill');
      }
    }, { passive: true });

    linkBox && navLinks.forEach(a => {
      a.addEventListener('pointerenter', () => movePill(a));
    });
    linkBox && linkBox.addEventListener('pointerleave', () => {
      movePill(navLinks.find(a => a.classList.contains('is-active')));
      if (!navLinks.some(a => a.classList.contains('is-active'))) linkBox.classList.remove('has-pill');
    });
    addEventListener('resize', () => movePill(navLinks.find(a => a.classList.contains('is-active'))));
  }

  /* ── Mobile menu ──────────────────────────────────────────────────── */

  const burger = $('#burger');
  const menu   = $('#menu');

  function setMenu(open) {
    if (!menu || !burger) return;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('is-locked', open);
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add('is-open'));
    } else {
      menu.classList.remove('is-open');
      setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 450);
    }
  }

  burger && burger.addEventListener('click', () => {
    setMenu(burger.getAttribute('aria-expanded') !== 'true');
  });
  menu && $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  matchMedia('(min-width: 901px)').addEventListener('change', e => { if (e.matches) setMenu(false); });

  /* ── Theme ────────────────────────────────────────────────────────── */

  const toggle = $('#themeToggle');

  motionBtn = $('#motionToggle');
  applyCalm();

  // If the page is quiet only because the OS said so, say that once. A plain
  // page with no explanation reads as broken rather than as respectful.
  const notice = $('#motionNotice');
  if (notice) {
    let shown = false;
    try { shown = sessionStorage.getItem('motionNotice') === 'seen'; } catch (e) {}
    if (calm && !storedMotion() && !shown) {
      setTimeout(() => { notice.hidden = false; }, 1200);
    }
    const dismiss = () => {
      notice.hidden = true;
      try { sessionStorage.setItem('motionNotice', 'seen'); } catch (e) {}
    };
    $('#motionNoticeX', notice).addEventListener('click', dismiss);
    $('#motionNoticeOn', notice).addEventListener('click', () => {
      try { localStorage.setItem('motion', 'full'); } catch (e) {}
      applyCalm();
      dismiss();
    });
  }
  motionBtn && motionBtn.addEventListener('click', () => {
    const next = calm ? 'full' : 'reduced';
    try { localStorage.setItem('motion', next); } catch (e) {}
    applyCalm();
    if (calm) {
      // Leaving motion behind should not leave anything mid-flight.
      $$('[data-magnetic], .frame, [data-skew]').forEach(el => el.style.removeProperty('transform'));
    }
  });

  function labelToggle() {
    if (!toggle) return;
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    toggle.setAttribute('aria-label', `Switch to ${next} theme`);
  }
  labelToggle();

  toggle && toggle.addEventListener('click', (e) => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    const apply = () => {
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (_) {}
      labelToggle();
    };

    // Wipe the new palette in as a circle growing out of the button.
    if (!calm && document.startViewTransition) {
      const r = toggle.getBoundingClientRect();
      root.style.setProperty('--tx', `${r.left + r.width / 2}px`);
      root.style.setProperty('--ty', `${r.top + r.height / 2}px`);
      root.classList.add('vt-theme');
      const vt = document.startViewTransition(apply);
      vt.finished.finally(() => root.classList.remove('vt-theme'));
    } else {
      apply();
    }
  });

  /* ── Copy address ─────────────────────────────────────────────────── */

  const copyBtn = $('#copyMail');
  copyBtn && copyBtn.addEventListener('click', async () => {
    const mail = copyBtn.dataset.mail;
    const label = $('span', copyBtn);
    try {
      await navigator.clipboard.writeText(mail);
    } catch (_) {
      const tmp = document.createElement('textarea');
      tmp.value = mail;
      tmp.setAttribute('readonly', '');
      tmp.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(tmp);
      tmp.select();
      try { document.execCommand('copy'); } catch (__) { return; }
      tmp.remove();
    }
    copyBtn.classList.add('is-done');
    label.textContent = 'Copied';
    setTimeout(() => { copyBtn.classList.remove('is-done'); label.textContent = 'Copy'; }, 1900);
  });

  /* ── Odds and ends ────────────────────────────────────────────────── */

  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  // Smooth-scroll in-page links even when the UA ignores scroll-behavior.
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', id);
    });
  });
})();

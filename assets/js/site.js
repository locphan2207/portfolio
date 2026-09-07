/* ═══════════════════════════════════════════════════════════════════════
   Tan Loc Phan — interaction layer. No dependencies.
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
  let calm = motionQuery.matches;
  motionQuery.addEventListener('change', e => { calm = e.matches; });

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

  const revealables = $$('[data-reveal], .cta');
  revealables.forEach(el => {
    if (el.dataset.delay) el.style.setProperty('--d', el.dataset.delay);
  });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    revealables.forEach(el => io.observe(el));
  } else {
    revealables.forEach(el => el.classList.add('is-in'));
  }

  /* ── Gradient-fill headings ───────────────────────────────────────── */
  // Duplicate the text into ::before so a pointer-tracked mask can wipe
  // the flat colour away and let the gradient underneath show through.
  $$('[data-fill]').forEach(el => el.dataset.text = el.textContent);

  // One light-pass across the name on arrival, so the colour underneath
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
    if (!pointer.has) return;

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
  if (!calm) loop();

  /* Pause the loop when the tab is hidden. */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(frame);
    else if (!calm) { cancelAnimationFrame(frame); loop(); }
  });

  /* ── Magnetic buttons ─────────────────────────────────────────────── */

  magnets.forEach(el => {
    if (calm) return;
    const pull = (e) => {
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
    if (calm || !fineQuery.matches) return;
    const frame = card.querySelector('.frame');
    if (!frame) return;

    card.addEventListener('pointermove', (e) => {
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
  if (portrait && !calm) {
    let ticking = false;
    addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const r = portrait.getBoundingClientRect();
        const mid = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        portrait.style.setProperty('--py', `${clamp(mid * -26, -26, 26)}px`);
        ticking = false;
      });
    }, { passive: true });
  }

  /* ── Scrambling role words ────────────────────────────────────────── */

  const CHARS = '!<>-_\\/[]{}—=+*^?#________';

  $$('.scramble').forEach(el => {
    let words;
    try { words = JSON.parse(el.dataset.scramble); } catch (_) { return; }
    if (!Array.isArray(words) || words.length < 2) return;
    if (calm) { el.textContent = words[0]; return; }

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
    track.style.setProperty('--dur', `${Math.max(18, width / 45)}s`);
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

(function () {
  const { list, byId, MOTION, FAMILY } = Movements;
  const { TAU, mod } = Draw;
  const BASE = 1.1; // radians per second at 1× speed
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ───────── Animation views: every live canvas is a view in one rAF loop.
  const views = new Set();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) { const v = e.target.__view; if (v) v.visible = e.isIntersecting; }
  });
  function addView(canvas, mv, opts = {}) {
    const v = { canvas, mv, t: opts.t ?? 0.6, playing: opts.playing ?? !reduceMotion, speed: 1, visible: true, onFrame: opts.onFrame };
    canvas.__view = v; views.add(v); io.observe(canvas);
    Draw.render(canvas, mv, v.t);
    return v;
  }
  function clearViews(filter) {
    for (const v of [...views]) if (filter(v)) { io.unobserve(v.canvas); views.delete(v); }
  }
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    for (const v of views) {
      if (!v.canvas.isConnected) { views.delete(v); continue; }
      if (!v.visible) continue;
      if (v.playing) v.t += dt * BASE * v.speed * (v.mv.speed || 1);
      if (v.playing || v.dirty) { Draw.render(v.canvas, v.mv, v.t); v.dirty = false; v.onFrame?.(v); }
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  new ResizeObserver(() => views.forEach((v) => (v.dirty = true))).observe(document.body);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { Draw.readColors(); views.forEach((v) => (v.dirty = true)); });

  // ───────── Index: search + filters
  const state = { q: '', motion: null, family: null };

  // ───────── Filter selects: typeahead dropdowns with live counts
  const escRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const CHEV = '<svg viewBox="0 0 12 12"><path d="M3 4.5l3 3 3-3"/></svg>';
  const CLR = '<svg viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6"/></svg>';
  let searchRank = null; // Map id → rank for the current query, or null

  // Does movement m pass the search and every filter except `skip`?
  function passes(m, skip) {
    return (skip === 'motion' || !state.motion || m.motion === state.motion)
      && (skip === 'family' || !state.family || m.family === state.family)
      && (!searchRank || searchRank.has(m.id));
  }
  function countBy(group) {
    const c = { __all: 0 };
    for (const m of list) if (passes(m, group)) { c.__all++; c[m[group]] = (c[m[group]] || 0) + 1; }
    return c;
  }

  const selects = [];
  function makeSelect(el, dict) {
    const group = el.dataset.group, label = el.dataset.label, any = el.dataset.any;
    const used = new Set(list.map((m) => m[group]));
    const all = Object.entries(dict).filter(([k]) => used.has(k)).map(([k, v]) => ({ value: k, label: v.label || v }));
    el.innerHTML = `
      <div class="sel-box">
        <span class="sel-label">${esc(label)}</span>
        <input role="combobox" aria-label="${esc(label)} filter" aria-expanded="false" aria-autocomplete="list"
          aria-controls="sel-${group}" placeholder="${esc(any)}" spellcheck="false" autocomplete="off">
        <button class="sel-btn" type="button" tabindex="-1"></button>
      </div>
      <div class="suggest" role="listbox" id="sel-${group}" hidden></div>`;
    const input = $('input', el), btn = $('.sel-btn', el), menu = $('.suggest', el), box = $('.sel-box', el);
    let opts = [], active = -1;

    const sync = () => {
      const cur = all.find((o) => o.value === state[group]);
      input.value = cur ? cur.label : '';
      el.classList.toggle('has-value', !!cur);
      btn.innerHTML = cur ? CLR : CHEV;
      btn.setAttribute('aria-label', cur ? `Clear ${label.toLowerCase()} filter` : `Show ${label.toLowerCase()} options`);
    };
    const show = (on) => { menu.hidden = !on; input.setAttribute('aria-expanded', String(on)); };
    const paint = () => {
      menu.querySelectorAll('.opt').forEach((o) => o.setAttribute('aria-selected', String(+o.dataset.i === active)));
      const o = menu.querySelector(`[data-i="${active}"]`);
      if (o) { o.scrollIntoView({ block: 'nearest' }); input.setAttribute('aria-activedescendant', o.id); }
      else input.removeAttribute('aria-activedescendant');
    };
    function render(text) {
      const toks = text.trim().toLowerCase().split(/\s+/).filter(Boolean)
        .map((t) => ({ re: new RegExp(`(?:^|[^\\p{L}\\p{N}])(${escRe(t)})`, 'iu'), word: true }));
      const counts = countBy(group);
      opts = [{ value: null, label: any }, ...all].filter((o) => !toks.length || (o.value && toks.every((t) => t.re.test(o.label))));
      menu.innerHTML = opts.length
        ? opts.map((o, i) => `<div class="opt${o.value === state[group] ? ' current' : ''}" role="option" id="sel-${group}-${i}" data-i="${i}" aria-selected="false">
            <span class="label">${toks.length ? hl(o.label, toks) : esc(o.label)}</span>
            <span class="sub">${o.value ? counts[o.value] || 0 : counts.__all}</span></div>`).join('')
        : `<div class="none">No ${esc(label.toLowerCase())} matches “${esc(text)}”.</div>`;
      active = toks.length ? (opts.length ? 0 : -1) : Math.max(0, opts.findIndex((o) => o.value === state[group]));
      paint(); show(true);
    }
    function choose(i) {
      const o = opts[i]; if (!o) return;
      state[group] = o.value; sync(); show(false); input.blur(); applyFilter();
    }

    box.addEventListener('mousedown', (e) => { if (e.target !== input) { e.preventDefault(); } });
    box.addEventListener('click', (e) => { if (!e.target.closest('.sel-btn')) input.focus(); });
    btn.addEventListener('click', () => {
      if (state[group]) { state[group] = null; sync(); applyFilter(); input.blur(); show(false); }
      else if (menu.hidden) input.focus(); else input.blur();
    });
    input.addEventListener('focus', () => { input.select(); render(''); });
    input.addEventListener('input', () => render(input.value));
    input.addEventListener('blur', () => { show(false); sync(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (menu.hidden) return render('');
        if (!opts.length) return;
        active = (active + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length; paint();
      } else if (e.key === 'Enter') { e.preventDefault(); choose(active); }
      else if (e.key === 'Escape') { e.stopPropagation(); input.blur(); }
    });
    menu.addEventListener('mousedown', (e) => e.preventDefault());
    menu.addEventListener('click', (e) => { const o = e.target.closest('.opt'); if (o) choose(+o.dataset.i); });
    menu.addEventListener('mousemove', (e) => {
      const o = e.target.closest('.opt');
      if (o && +o.dataset.i !== active) { active = +o.dataset.i; paint(); }
    });
    sync();
    selects.push(sync);
  }
  makeSelect($('.select[data-group="motion"]'), MOTION);
  makeSelect($('.select[data-group="family"]'), FAMILY);

  const grid = $('#grid');
  grid.innerHTML = list.map((m) => `
    <a class="card" href="#/m/${m.id}" data-id="${m.id}">
      <canvas aria-hidden="true"></canvas>
      <div class="meta"><h3>${esc(m.title)}</h3><p class="conv">${esc(MOTION[m.motion].label)}</p></div>
    </a>`).join('');
  grid.querySelectorAll('.card').forEach((card, i) => {
    const v = addView($('canvas', card), byId[card.dataset.id], { t: 0.6 + i * 0.7 });
    if (reduceMotion) {
      card.addEventListener('mouseenter', () => (v.playing = true));
      card.addEventListener('mouseleave', () => (v.playing = false));
    }
  });

  function applyFilter() {
    const found = Search.run(state.q);
    searchRank = found ? new Map(found.results.map((r, i) => [r.m.id, i])) : null;
    let n = 0;
    grid.querySelectorAll('.card').forEach((card) => {
      const m = byId[card.dataset.id], ok = passes(m);
      card.hidden = !ok; if (ok) n++;
      card.style.order = searchRank && searchRank.has(m.id) ? searchRank.get(m.id) : '';
    });
    $('#empty').hidden = n > 0;
  }

  // ───────── Typeahead
  const q = $('#q'), sug = $('#suggest');
  let opts = [], active = -1;

  function hl(str, toks) {
    let out = '', at = 0;
    for (const [s, e] of Search.ranges(str, toks)) { out += esc(str.slice(at, s)) + `<mark>${esc(str.slice(s, e))}</mark>`; at = e; }
    return out + esc(str.slice(at));
  }
  const KIND = { title: '', aka: 'Also called', use: 'Used in' };
  const optHtml = (o, toks, i) => {
    const sub = o.kind === 'title' ? esc(FAMILY[o.m.family]) : `${KIND[o.kind]} → ${esc(o.m.title)}`;
    return `<a class="opt" role="option" id="opt-${i}" href="#/m/${o.m.id}" data-i="${i}" aria-selected="false">
      <span class="label">${hl(o.label, toks)}</span><span class="sub">${sub}</span></a>`;
  };
  const HINT = `<div class="hint">Try <code>use:engine</code> <code>motion:swing</code> <code>"straight line"</code> <code>/gear|belt/</code><br>↑↓ move · ↵ open · esc close</div>`;

  function renderSuggest() {
    const text = q.value;
    const found = Search.run(text);
    let html = '';
    if (!found) {
      // Empty query: full A–Z index of names and aliases.
      opts = Search.index;
      let letter = '';
      html = opts.map((o, i) => {
        const L = o.label[0].toUpperCase();
        const head = L !== letter ? `<div class="group">${(letter = L)}</div>` : '';
        return head + optHtml(o, null, i);
      }).join('');
    } else if (found.error) {
      opts = []; html = `<div class="none">${esc(found.error)}</div>`;
    } else {
      opts = found.results.slice(0, 10);
      const head = found.corrected ? `Showing results for “${esc(found.corrected)}”` : `${found.results.length} match${found.results.length === 1 ? '' : 'es'}`;
      html = opts.length ? `<div class="group">${head}</div>` + opts.map((o, i) => optHtml(o, found.toks, i)).join('')
        : `<div class="none">No movements match “${esc(text)}”.</div>`;
    }
    sug.innerHTML = html + HINT;
    active = found && opts.length ? 0 : -1;
    paintActive();
    openSuggest(true);
  }
  function paintActive() {
    sug.querySelectorAll('.opt').forEach((el) => el.setAttribute('aria-selected', String(+el.dataset.i === active)));
    const el = sug.querySelector(`#opt-${active}`);
    if (el) { el.scrollIntoView({ block: 'nearest' }); q.setAttribute('aria-activedescendant', el.id); }
    else q.removeAttribute('aria-activedescendant');
  }
  function openSuggest(on) { sug.hidden = !on; q.setAttribute('aria-expanded', String(on)); }
  function choose(i) {
    const o = opts[i]; if (!o) return;
    openSuggest(false); q.blur();
    location.hash = `#/m/${o.m.id}`;
  }

  q.addEventListener('input', () => { state.q = q.value; applyFilter(); renderSuggest(); });
  q.addEventListener('focus', renderSuggest);
  q.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (sug.hidden) return renderSuggest();
      const n = opts.length; if (!n) return;
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + n) % n; paintActive();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0) choose(active);
      else { openSuggest(false); q.blur(); if (location.hash.startsWith('#/m/')) location.hash = '#/'; }
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      if (!sug.hidden) openSuggest(false); else q.blur();
    }
  });
  sug.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus in input
  sug.addEventListener('click', (e) => {
    const code = e.target.closest('code');
    if (code) { e.preventDefault(); q.value = code.textContent; q.dispatchEvent(new Event('input')); return; }
    const a = e.target.closest('.opt');
    if (a) { e.preventDefault(); choose(+a.dataset.i); }
  });
  sug.addEventListener('mousemove', (e) => {
    const a = e.target.closest('.opt');
    if (a && +a.dataset.i !== active) { active = +a.dataset.i; paintActive(); }
  });
  q.addEventListener('blur', () => openSuggest(false));
  applyFilter();

  // ───────── Detail view
  const detail = $('#detail');
  const icons = {
    play: '<svg viewBox="0 0 14 14"><path d="M3 1.5v11l9.5-5.5z"/></svg>',
    pause: '<svg viewBox="0 0 14 14"><rect x="2.5" y="1.5" width="3.2" height="11" rx="1"/><rect x="8.3" y="1.5" width="3.2" height="11" rx="1"/></svg>',
  };
  let main = null;

  function showDetail(id) {
    const m = byId[id]; if (!m) return showIndex();
    const i = list.indexOf(m), prev = list[(i - 1 + list.length) % list.length], next = list[(i + 1) % list.length];
    const mo = MOTION[m.motion];
    clearViews((v) => detail.contains(v.canvas));
    detail.innerHTML = `
      <a class="back" href="#/">← All movements</a>
      <div class="detail-grid">
        <div class="stage">
          <div class="viewport"><canvas class="main" aria-label="Animation of ${esc(m.title)}"></canvas></div>
          <div class="controls">
            <button class="btn" id="play" aria-label="Play or pause (space)"></button>
            <label class="ctl grow"><input type="range" id="scrub" min="0" max="360" step="1" aria-label="Input angle"><output id="deg"></output></label>
            <label class="ctl speed">Speed <input type="range" id="speed" min="0.1" max="2.5" step="0.05" value="1"></label>
          </div>
          <div class="graph-wrap">
            <div class="glabel"><span>${esc(m.outLabel)}</span><span>one input cycle →</span></div>
            <canvas id="graph"></canvas>
          </div>
        </div>
        <article class="info">
          <h2>${esc(m.title)}</h2>
          <p class="aka">Also: ${m.aka.map(esc).join(' · ')}</p>
          <div class="badges">
            <span class="badge motion"><span class="in">${esc(mo.from)}</span> → <span class="out">${esc(mo.to)}</span></span>
            <span class="badge">${esc(FAMILY[m.family])}</span>
          </div>
          <p class="summary">${esc(m.summary)}</p>
          <h4>How it works</h4>
          ${m.how.map((p) => `<p>${esc(p)}</p>`).join('')}
          <p class="key">${esc(m.key)}</p>
          <h4>Where you'll find it</h4>
          <ul class="uses">${m.uses.map((u) => `<li>${esc(u)}</li>`).join('')}</ul>
          ${m.related?.length ? `<h4>Related</h4><div class="related">${m.related.map((r) => `
            <a href="#/m/${r}" data-id="${r}"><canvas aria-hidden="true"></canvas><span>${esc(byId[r].title)}</span></a>`).join('')}</div>` : ''}
          <nav class="pager"><a href="#/m/${prev.id}">← ${esc(prev.title)}</a><a href="#/m/${next.id}">${esc(next.title)} →</a></nav>
        </article>
      </div>`;

    const play = $('#play'), scrub = $('#scrub'), deg = $('#deg'), speed = $('#speed'), graph = $('#graph');
    const curve = sampleCurve(m);
    const sync = (v) => {
      const a = mod(v.t, TAU);
      scrub.value = Math.round((a / TAU) * 360);
      deg.textContent = `${scrub.value}°`;
      drawGraph(graph, curve, a / TAU);
    };
    main = addView($('canvas.main', detail), m, { t: 0.6, playing: true, onFrame: sync });
    const setPlay = (p) => { main.playing = p; play.innerHTML = p ? icons.pause : icons.play; };
    setPlay(true);
    play.onclick = () => setPlay(!main.playing);
    $('canvas.main', detail).onclick = () => setPlay(!main.playing);
    scrub.oninput = () => {
      setPlay(false);
      main.t = Math.floor(main.t / TAU) * TAU + (scrub.value / 360) * TAU;
      main.dirty = true;
    };
    speed.oninput = () => (main.speed = +speed.value);
    detail.querySelectorAll('.related a').forEach((a, k) => addView($('canvas', a), byId[a.dataset.id], { t: 1 + k }));
    sync(main);
  }

  function sampleCurve(m) {
    const N = 240, ys = [];
    for (let i = 0; i <= N; i++) ys.push(m.output((i / N) * TAU));
    // unwrap angle jumps for continuous plots
    let lo = Math.min(...ys), hi = Math.max(...ys);
    if (hi - lo < 1e-6) { lo -= 1; hi += 1; }
    return { ys, lo, hi };
  }
  function drawGraph(canvas, { ys, lo, hi }, f) {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (!w || !h) return;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const ctx = canvas.getContext('2d'), C = Draw.colors, pad = 8 * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, w, h);
    const X = (i) => (i / (ys.length - 1)) * w, Y = (y) => h - pad - ((y - lo) / (hi - lo)) * (h - 2 * pad);
    ctx.strokeStyle = C.line; ctx.lineWidth = dpr;
    for (const g of [0.25, 0.5, 0.75]) { ctx.beginPath(); ctx.moveTo(g * w, 0); ctx.lineTo(g * w, h); ctx.stroke(); }
    ctx.beginPath(); ys.forEach((y, i) => (i ? ctx.lineTo(X(i), Y(y)) : ctx.moveTo(X(i), Y(y))));
    ctx.strokeStyle = C.output; ctx.lineWidth = 1.8 * dpr; ctx.lineJoin = 'round'; ctx.stroke();
    const i = f * (ys.length - 1), y = ys[Math.round(i)];
    ctx.strokeStyle = C.input; ctx.lineWidth = dpr;
    ctx.beginPath(); ctx.moveTo(f * w, 0); ctx.lineTo(f * w, h); ctx.stroke();
    ctx.fillStyle = C.output; ctx.beginPath(); ctx.arc(f * w, Y(y), 4 * dpr, 0, TAU); ctx.fill();
  }

  // ───────── Routing
  const index = $('#index');
  function showIndex() {
    detail.hidden = true; index.hidden = false;
    clearViews((v) => detail.contains(v.canvas));
    detail.innerHTML = ''; main = null;
  }
  function route() {
    const m = location.hash.match(/^#\/m\/([\w-]+)/);
    if (m && byId[m[1]]) {
      index.hidden = true; detail.hidden = false;
      showDetail(m[1]);
      window.scrollTo(0, 0);
      document.title = `${byId[m[1]].title} · 507 Movements`;
    } else {
      showIndex();
      document.title = '507 Movements';
    }
  }
  addEventListener('hashchange', route);
  route();

  // ───────── Keyboard
  addEventListener('keydown', (e) => {
    const typing = /INPUT|TEXTAREA/.test(document.activeElement?.tagName) && document.activeElement.type !== 'range';
    if (e.key === '/' && !typing) { e.preventDefault(); if (location.hash.startsWith('#/m/')) location.hash = '#/'; q.focus(); q.select(); return; }
    if (e.key === 'Escape') { if (typing) q.blur(); else if (main) location.hash = '#/'; return; }
    if (!main || typing) return;
    if (e.key === ' ') { e.preventDefault(); $('#play').click(); }
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      if (document.activeElement?.type === 'range') return;
      e.preventDefault(); main.playing = false; $('#play').innerHTML = icons.play;
      main.t += (e.key === 'ArrowRight' ? 1 : -1) * (TAU / 72); main.dirty = true;
    }
  });

  // ───────── Offline / installable (PWA)
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();

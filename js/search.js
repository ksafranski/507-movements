// Search engine: field-weighted, word-prefix regex matching with synonyms.
//
// Query syntax
//   crank slider        every word must match (word-prefix, any field)
//   "straight line"     exact phrase
//   use:engine          restrict a word to a field (use, motion, family, aka, title)
//   motion:"stop & go"  field + phrase
//   /gear|belt/         raw regular expression (case-insensitive)
(function () {
  const { list, MOTION, FAMILY } = Movements;
  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Engineering terms people search for → words the catalog uses.
  const SYN = {
    reciproc: ['back & forth', 'back and forth', 'slider', 'piston'],
    linear: ['back & forth', 'straight', 'slider', 'rack'],
    oscillat: ['swing', 'rock'],
    rocker: ['swing', 'rock'],
    intermit: ['stop & go', 'index', 'step'],
    indexing: ['stop & go', 'step'],
    rotary: ['rotation', 'turn'],
    rotat: ['rotation', 'turn'],
    cog: ['gear'],
    sprocket: ['gear', 'belt'],
    chain: ['belt'],
    pulley: ['belt'],
    epicycl: ['planetary'],
    reduc: ['ratio', 'slow'],
    revers: ['opposite', 'reverse'],
    straight: ['straight line', 'straight-line'],
    clutch: ['ratchet', 'one way'],
    'one-way': ['ratchet', 'one way'],
    force: ['torque', 'toggle', 'lever'],
    leverage: ['lever', 'force'],
    ellipse: ['ellips', 'oval'],
  };

  const WEIGHT = { title: 10, aka: 7, use: 5, motion: 4, family: 4, key: 2, summary: 2, how: 1 };
  const FIELD = { title: 'title', name: 'title', aka: 'aka', alias: 'aka', use: 'use', uses: 'use', motion: 'motion', family: 'family', type: 'family' };

  const docs = list.map((m) => ({
    m,
    fields: {
      title: [m.title], aka: m.aka, use: m.uses,
      motion: [MOTION[m.motion].label], family: [FAMILY[m.family]],
      key: [m.key], summary: [m.summary], how: m.how,
    },
  }));

  // Word-prefix regex for a term, plus its synonyms and a crude stem.
  function termRe(val) {
    const alts = new Set([val]);
    let stem = val.replace(/(ings?|es|s)$/, '');
    if (stem.length >= 3) alts.add(stem); else stem = val;
    if (val.length >= 3) {
      for (const [k, v] of Object.entries(SYN)) if (k.startsWith(stem) || val.startsWith(k)) v.forEach((x) => alts.add(x));
    }
    const src = [...alts].sort((a, b) => b.length - a.length).map((a) => escRe(a).replace(/\s+/g, '[\\s-]+')).join('|');
    return { re: new RegExp(`(?:^|[^\\p{L}\\p{N}])(${src})`, 'iu'), word: true };
  }

  function parse(q) {
    q = q.trim();
    if (!q) return null;
    const raw = q.match(/^\/(.+)\/([gimsuy]*)$/);
    if (raw) {
      try { return [{ field: null, re: new RegExp(raw[1], raw[2].replace('g', '') + (raw[2].includes('i') ? '' : 'i')), word: false }]; }
      catch { return { error: 'Invalid regular expression' }; }
    }
    const toks = [];
    const rx = /([a-z]+):("[^"]*"?|\S+)|"([^"]*)"?|(\S+)/gi;
    let t;
    while ((t = rx.exec(q))) {
      let field = null, val;
      if (t[1] && FIELD[t[1].toLowerCase()]) { field = FIELD[t[1].toLowerCase()]; val = t[2].replace(/"/g, ''); }
      else val = t[3] ?? t[4] ?? `${t[1]} ${t[2]}`;
      val = val.toLowerCase().replace(/[^\p{L}\p{N}&'\- ]/gu, ' ').replace(/\s+/g, ' ').trim();
      if (val) toks.push({ field, ...termRe(val) });
    }
    return toks.length ? toks : null;
  }

  function score(doc, toks) {
    let total = 0;
    for (const tok of toks) {
      let best = 0;
      for (const [f, vals] of Object.entries(doc.fields)) {
        if (tok.field && tok.field !== f) continue;
        if (WEIGHT[f] > best && vals.some((v) => tok.re.test(v))) best = WEIGHT[f];
      }
      if (!best) return 0;
      total += best;
    }
    return total;
  }

  // Vocabulary for typo correction.
  const vocab = [...new Set(docs.flatMap((d) => Object.values(d.fields).flat())
    .flatMap((s) => s.toLowerCase().split(/[^\p{L}]+/u)).filter((w) => w.length >= 4))];
  function dist(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j), pp = null;
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (pp && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) cur[j] = Math.min(cur[j], pp[j - 2] + 1);
      }
      pp = prev; prev = cur;
    }
    return prev[b.length];
  }
  // Replace words that match nothing with the closest catalog word.
  function correct(q) {
    let changed = false;
    const out = q.replace(/\p{L}{4,}/gu, (w) => {
      const lw = w.toLowerCase();
      if (vocab.some((v) => v.startsWith(lw))) return w;
      const max = lw.length >= 7 ? 2 : 1;
      let best = null, bd = max + 1;
      for (const v of vocab) { const d = dist(lw, v.slice(0, Math.max(lw.length, Math.min(v.length, lw.length + 1))), max); if (d < bd) { bd = d; best = v; } }
      if (best) { changed = true; return best; }
      return w;
    });
    return changed ? out : null;
  }

  // Ranked movements for a query. Returns null for an empty query.
  function run(q, fuzzy = true) {
    const toks = parse(q);
    if (!toks) return null;
    if (toks.error) return { error: toks.error, results: [] };
    if (fuzzy && !q.trim().startsWith('/')) {
      const first = run(q, false);
      if (first.results.length) return first;
      const fixed = correct(q);
      if (fixed) { const r = run(fixed, false); if (r.results.length) return { ...r, corrected: fixed }; }
      return first;
    }
    const lq = q.trim().toLowerCase();
    const results = [];
    for (const doc of docs) {
      let s = score(doc, toks);
      if (!s) continue;
      if (doc.m.title.toLowerCase().startsWith(lq)) s += 25;
      else if (doc.m.aka.some((a) => a.toLowerCase().startsWith(lq))) s += 15;
      // Best label to show: the name/alias/use that matches the most terms.
      let label = doc.m.title, kind = 'title', hits = -1;
      for (const [f, vals] of [['title', doc.fields.title], ['aka', doc.fields.aka], ['use', doc.fields.use]]) {
        for (const v of vals) {
          const h = toks.filter((tk) => (!tk.field || tk.field === f) && tk.re.test(v)).length;
          if (h > hits) { hits = h; label = v; kind = f; }
        }
      }
      results.push({ m: doc.m, score: s, label, kind });
    }
    results.sort((a, b) => b.score - a.score || a.m.title.localeCompare(b.m.title));
    return { toks, results };
  }

  // Character ranges in `str` matched by the query terms.
  function ranges(str, toks) {
    const out = [];
    for (const tk of toks || []) {
      const g = new RegExp(tk.re.source, tk.re.flags.includes('g') ? tk.re.flags : tk.re.flags + 'g');
      let m;
      while ((m = g.exec(str))) {
        if (!m[0].length) { g.lastIndex++; continue; }
        const s = tk.word ? m.index + m[0].length - m[1].length : m.index;
        out.push([s, m.index + m[0].length]);
      }
    }
    out.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const r of out) { const l = merged[merged.length - 1]; if (l && r[0] <= l[1]) l[1] = Math.max(l[1], r[1]); else merged.push(r); }
    return merged;
  }

  // A–Z index of every name and alias.
  const index = docs.flatMap(({ m }) => [{ label: m.title, kind: 'title', m }, ...m.aka.map((a) => ({ label: a, kind: 'aka', m }))])
    .sort((a, b) => a.label.localeCompare(b.label));

  window.Search = { run, ranges, index };
})();

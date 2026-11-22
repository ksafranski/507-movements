// Small 2D drawing kit for mechanism diagrams.
// All movements draw into a 400 x 300 logical space.
(function () {
  const TAU = Math.PI * 2;
  const mod = (a, n) => ((a % n) + n) % n;
  const W = 400, H = 300;

  const colors = {};
  function readColors() {
    const s = getComputedStyle(document.documentElement);
    const g = (n) => s.getPropertyValue(n).trim();
    Object.assign(colors, {
      ink: g('--ink'), muted: g('--muted'), line: g('--line'), part: g('--part'),
      ground: g('--ground'), bg: g('--surface'),
      input: g('--input'), inputFill: g('--input-fill'),
      output: g('--output'), outputFill: g('--output-fill'),
    });
  }

  const layers = new WeakMap();
  const pick = (o, k, dflt) => (o[k] === undefined ? dflt : o[k]);

  function make(ctx) {
    const C = colors;
    const d = {
      C, ctx,
      paint(o = {}) {
        const fill = pick(o, 'fill', null);
        const stroke = pick(o, 'stroke', C.ink);
        if (fill) { ctx.fillStyle = fill; ctx.fill(o.rule || 'nonzero'); }
        if (stroke) {
          ctx.strokeStyle = stroke;
          ctx.lineWidth = o.w || 1.4;
          ctx.lineJoin = 'round'; ctx.lineCap = 'round';
          ctx.setLineDash(o.dash || []);
          if (o.dashOffset) ctx.lineDashOffset = o.dashOffset;
          ctx.stroke();
          ctx.setLineDash([]); ctx.lineDashOffset = 0;
        }
      },
      line(x1, y1, x2, y2, o = {}) {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        d.paint({ stroke: o.color || C.ink, w: o.w, dash: o.dash });
      },
      circle(x, y, r, o = {}) {
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); d.paint(o);
      },
      arc(x, y, r, a0, a1, o = {}) {
        ctx.beginPath(); ctx.arc(x, y, r, a0, a1); d.paint({ fill: null, ...o });
      },
      poly(pts, o = {}) {
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        if (o.close !== false) ctx.closePath();
        d.paint(o);
      },
      // A link: a capsule between two joint centers.
      bar(x1, y1, x2, y2, o = {}) {
        const r = (o.width || 10) / 2;
        const a = Math.atan2(y2 - y1, x2 - x1);
        ctx.beginPath();
        ctx.arc(x1, y1, r, a + Math.PI / 2, a + 1.5 * Math.PI);
        ctx.arc(x2, y2, r, a - Math.PI / 2, a + Math.PI / 2);
        ctx.closePath();
        d.paint({ fill: pick(o, 'fill', C.part), stroke: pick(o, 'stroke', C.ink), w: o.w });
      },
      box(cx, cy, w, h, ang = 0, o = {}) {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
        ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h);
        d.paint({ fill: pick(o, 'fill', C.part), stroke: pick(o, 'stroke', C.ink), w: o.w });
        ctx.restore();
      },
      pin(x, y, r = 3.2, o = {}) {
        d.circle(x, y, r, { fill: o.fill || C.bg, stroke: o.stroke || C.ink, w: 1.2 });
      },
      // Fixed pivot: little triangle on hatched ground.
      // dir: 1 = mounted below (floor), -1 = mounted above (ceiling).
      ground(x, y, s = 11, dir = 1) {
        const by = y + s * 1.3 * dir;
        d.poly([[x, y], [x - s * 0.75, by], [x + s * 0.75, by]],
          { fill: C.part, stroke: C.ground, w: 1.2 });
        d.hatch(x - s * 1.2, by, s * 2.4, dir);
        d.pin(x, y);
      },
      // Hatched line marking fixed frame. dir: 1 hatches below, -1 above.
      hatch(x, y, len, dir = 1) {
        d.line(x, y, x + len, y, { color: C.ground, w: 1.2 });
        ctx.beginPath();
        for (let i = 4; i <= len; i += 6) { ctx.moveTo(x + i, y); ctx.lineTo(x + i - 4, y + 5 * dir); }
        d.paint({ stroke: C.ground, w: 0.9 });
      },
      // Vertical hatched rail. dir: 1 hatches right, -1 left.
      vhatch(x, y, len, dir = 1) {
        d.line(x, y, x, y + len, { color: C.ground, w: 1.2 });
        ctx.beginPath();
        for (let i = 4; i <= len; i += 6) { ctx.moveTo(x, y + i); ctx.lineTo(x + 5 * dir, y + i - 4); }
        d.paint({ stroke: C.ground, w: 0.9 });
      },
      // Internal (ring) gear: teeth point inward.
      ringGear(cx, cy, z, m, ang, o = {}) {
        const rp = (m * z) / 2, rt = rp - m, rr = rp + 1.25 * m, p = TAU / z, outer = rr + 12;
        const pts = [];
        for (let i = 0; i < z; i++) {
          const b = ang + i * p;
          for (const [r, f] of [[rr, -0.5], [rr, -0.3], [rt, -0.13], [rt, 0.13], [rr, 0.3]]) {
            pts.push([cx + r * Math.cos(b + f * p), cy + r * Math.sin(b + f * p)]);
          }
        }
        const fill = o.fill || C.part, stroke = o.stroke || C.ink;
        d.layer((L) => {
          L.circle(cx, cy, outer, { fill, stroke });
          L.cut(() => L.poly(pts, { fill: '#000', stroke: null }));
          L.poly(pts, { fill: null, stroke, w: 1.3 });
        });
        return rp;
      },
      // Involute-ish spur gear. z teeth, module m, rotation ang.
      gear(cx, cy, z, m, ang, o = {}) {
        const rp = (m * z) / 2, ra = rp + m, rd = rp - 1.25 * m, p = TAU / z;
        const pts = [];
        for (let i = 0; i < z; i++) {
          const b = ang + i * p;
          for (const [r, f] of [[rd, -0.5], [rd, -0.3], [ra, -0.13], [ra, 0.13], [rd, 0.3]]) {
            pts.push([cx + r * Math.cos(b + f * p), cy + r * Math.sin(b + f * p)]);
          }
        }
        d.poly(pts, { fill: o.fill || C.part, stroke: o.stroke || C.ink, w: 1.3 });
        d.spokes(cx, cy, rp, ang, o);
        return rp;
      },
      // Lightening holes / marker so rotation is visible.
      spokes(cx, cy, r, ang, o = {}) {
        if (r >= 34) {
          const n = 5, hr = r * 0.17, at = r * 0.55;
          for (let i = 0; i < n; i++) {
            const a = ang + Math.PI / 5 + (i * TAU) / n;
            d.circle(cx + at * Math.cos(a), cy + at * Math.sin(a), hr, { fill: C.bg, stroke: o.stroke || C.ink, w: 1.1 });
          }
        } else {
          d.circle(cx + r * 0.55 * Math.cos(ang), cy + r * 0.55 * Math.sin(ang), 2.6, { fill: o.stroke || C.ink, stroke: null });
        }
        d.circle(cx, cy, Math.max(3.5, r * 0.14), { fill: C.bg, stroke: o.stroke || C.ink, w: 1.2 });
      },
      // Draw into an offscreen layer so shapes can have holes cut out (d.cut).
      layer(fn) {
        const cv = ctx.canvas;
        let off = layers.get(cv);
        if (!off) { off = document.createElement('canvas'); layers.set(cv, off); }
        if (off.width !== cv.width || off.height !== cv.height) { off.width = cv.width; off.height = cv.height; }
        const o = off.getContext('2d');
        o.setTransform(1, 0, 0, 1, 0, 0);
        o.clearRect(0, 0, off.width, off.height);
        o.setTransform(ctx.getTransform());
        fn(make(o));
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(off, 0, 0); ctx.restore();
      },
      cut(fn) {
        ctx.save(); ctx.globalCompositeOperation = 'destination-out'; fn(); ctx.restore();
      },
      clip(fn, clipFn) {
        ctx.save(); ctx.beginPath(); clipFn(ctx); ctx.clip(); fn(); ctx.restore();
      },
    };
    return d;
  }

  // Size a canvas to its CSS box and draw a movement at phase t.
  function render(canvas, mv, t) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (!w || !h) return;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const s = Math.min(w / W, h / H);
    ctx.setTransform(s, 0, 0, s, (w - W * s) / 2, (h - H * s) / 2);
    mv.draw(make(ctx), t);
  }

  readColors();
  window.Draw = { TAU, mod, W, H, colors, readColors, make, render };
})();

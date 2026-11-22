// Movement catalog. Each entry has descriptive data plus:
//   draw(d, t)  – render at input phase t (radians of the driver)
//   output(t)   – scalar output for the motion graph over one input cycle
(function () {
  const { TAU, mod } = Draw;
  const { cos, sin, sqrt, atan2, hypot, PI } = Math;

  const MOTION = {
    'rot-rot': { label: 'Rotation → Rotation', from: 'Rotation', to: 'Rotation' },
    'rot-lin': { label: 'Rotation → Back & forth', from: 'Rotation', to: 'Back & forth' },
    'rot-osc': { label: 'Rotation → Swing', from: 'Rotation', to: 'Swing' },
    'rot-int': { label: 'Rotation → Stop & go', from: 'Rotation', to: 'Stop & go' },
    'osc-int': { label: 'Swing → Stop & go', from: 'Swing', to: 'Stop & go' },
    'osc-lin': { label: 'Swing → Straight line', from: 'Swing', to: 'Straight line' },
    'lin-lin': { label: 'Back & forth → Back & forth', from: 'Back & forth', to: 'Back & forth' },
    'lin-rot': { label: 'Back & forth → Rotation', from: 'Back & forth', to: 'Rotation' },
  };
  const FAMILY = {
    gears: 'Gears', linkages: 'Linkages', cams: 'Cams', belts: 'Belts, ropes & chains', screws: 'Screws & worms', indexing: 'Stops & indexing',
  };

  const M = [];
  const add = (m) => M.push(m);
  const IN = (d) => ({ fill: d.C.inputFill, stroke: d.C.input });
  const OUT = (d) => ({ fill: d.C.outputFill, stroke: d.C.output });
  const GND = (d) => ({ fill: d.C.part, stroke: d.C.ground });
  const pulley = (d, c, r, a, o) => {
    d.circle(c.x, c.y, r, o);
    d.circle(c.x, c.y, r - 7, { fill: d.C.bg, stroke: o.stroke, w: 1 });
    for (let i = 0; i < 4; i++) { const s = a + (i * PI) / 2; d.line(c.x, c.y, c.x + (r - 7) * cos(s), c.y + (r - 7) * sin(s), { color: o.stroke, w: 3 }); }
    d.circle(c.x, c.y, 7, { fill: d.C.bg, stroke: o.stroke });
  };
  // Intersection of circle (p0, r0) and circle (p1, r1); side = ±1 picks the solution.
  const meet = (p0, r0, p1, r1, side) => {
    const dx = p1.x - p0.x, dy = p1.y - p0.y, dd = hypot(dx, dy);
    const a = (r0 * r0 - r1 * r1 + dd * dd) / (2 * dd), h = sqrt(Math.max(0, r0 * r0 - a * a));
    const mx = p0.x + (a * dx) / dd, my = p0.y + (a * dy) / dd;
    return { x: mx - (side * h * dy) / dd, y: my + (side * h * dx) / dd };
  };

  // ───────────────────────────── Spur gears
  add({
    id: 'spur-gears', title: 'Spur gears', aka: ['Gear pair', 'Cog wheels', 'Gear train'],
    motion: 'rot-rot', family: 'gears',
    summary: 'Two toothed wheels pass rotation between parallel shafts, reversing direction and trading speed for force.',
    how: [
      'Teeth on the driver push teeth on the driven gear, so their pitch circles roll against each other without slipping.',
      'The speed ratio is the tooth-count ratio. Here 12 teeth drive 20, so the output turns 0.6× as fast — with about 1.67× the torque — in the opposite direction. Put a third "idler" gear between them to keep the direction the same.',
    ],
    key: 'Speed ratio = driver teeth ÷ driven teeth.',
    uses: ['Clocks', 'Gearboxes', 'Hand drills', 'Kitchen mixers', 'Bicycle hubs'],
    related: ['rack-pinion', 'belt-drive'],
    outLabel: 'Output gear angle',
    draw(d, t) {
      const m = 8, z1 = 12, z2 = 20, r1 = (m * z1) / 2, r2 = (m * z2) / 2;
      const x1 = 120, x2 = x1 + r1 + r2, y = 150;
      d.gear(x2, y, z2, m, PI + PI / z2 - (t * z1) / z2, OUT(d));
      d.gear(x1, y, z1, m, t, IN(d));
    },
    output: (t) => -(t * 12) / 20,
  });

  // ───────────────────────────── Rack and pinion
  add({
    id: 'rack-pinion', title: 'Rack & pinion', aka: ['Rack and pinion', 'Gear rack'],
    motion: 'rot-lin', family: 'gears',
    summary: 'A gear meshing with a toothed bar turns rotation into straight-line travel — and back again.',
    how: [
      'The pinion is an ordinary gear; the rack is a gear "unrolled" flat. Each turn of the pinion moves the rack by one pitch circumference.',
      'It is reversible: push the rack and the pinion spins. In this demo the pinion swings back and forth so the rack stays on screen.',
    ],
    key: 'Travel per turn = π × pinion pitch diameter.',
    uses: ['Car steering', 'Drill press feed', 'Camera focus rails', 'Rack railways', 'Sliding gates'],
    related: ['spur-gears', 'scotch-yoke'],
    outLabel: 'Rack position',
    draw(d, t) {
      const m = 8, z = 12, r = 48, cx = 200, cy = 112;
      const th = 1.25 * sin(t), shift = -r * th, P = PI * m;
      const yp = cy + r, ya = yp - m, yr = yp + 1.25 * m, yb = yr + 22;
      const x0 = 30 + shift, x1 = 370 + shift;
      const pts = [[x0, yb], [x0, yr]];
      for (let k = -20; k <= 20; k++) {
        const xc = cx + P / 2 + k * P + shift;
        if (xc - 0.3 * P < x0 || xc + 0.3 * P > x1) continue;
        pts.push([xc - 0.3 * P, yr], [xc - 0.13 * P, ya], [xc + 0.13 * P, ya], [xc + 0.3 * P, yr]);
      }
      pts.push([x1, yr], [x1, yb]);
      d.hatch(20, yb + 9, 360, 1);
      for (const x of [80, 200, 320]) d.circle(x, yb + 4.5, 4.5, { fill: d.C.part, stroke: d.C.ground, w: 1.1 });
      d.poly(pts, OUT(d));
      d.gear(cx, cy, z, m, th, IN(d));
    },
    output: (t) => -48 * 1.25 * sin(t),
  });

  // ───────────────────────────── Slider-crank
  const sc = (t) => {
    const O = { x: 110, y: 150 }, r = 45, L = 150;
    const px = O.x + r * cos(t), py = O.y + r * sin(t);
    return { O, r, px, py, sx: px + sqrt(L * L - (py - O.y) ** 2) };
  };
  add({
    id: 'slider-crank', title: 'Slider-crank', aka: ['Crank and connecting rod', 'Piston and crank', 'Crank slider'],
    motion: 'rot-lin', family: 'linkages',
    summary: 'A turning crank and a connecting rod drive a slider back and forth — or a pushing piston turns the crank.',
    how: [
      'The crank pin travels in a circle. The connecting rod carries its position to a slider that can only move along a straight guide. The stroke is twice the crank radius.',
      'Because the rod tilts as it works, the motion is not a perfect sine wave — the slider moves a little faster on the half nearest the crank. At the two "dead centres" the rod and crank line up, and a piston alone could not start it moving; a flywheel carries it through.',
    ],
    key: 'Stroke = 2 × crank radius.',
    uses: ['Car engines', 'Steam engines', 'Air compressors', 'Pumps', 'Jigsaws'],
    related: ['scotch-yoke', 'quick-return', 'four-bar'],
    outLabel: 'Slider position',
    draw(d, t) {
      const { O, r, px, py, sx } = sc(t);
      d.hatch(180, 136, 175, -1);
      d.hatch(180, 164, 175, 1);
      d.circle(O.x, O.y, r + 14, IN(d));
      d.bar(O.x, O.y, px, py, { width: 14, ...IN(d) });
      d.box(sx, 150, 44, 26, 0, OUT(d));
      d.bar(px, py, sx, 150, { width: 9 });
      d.pin(O.x, O.y, 4); d.pin(px, py); d.pin(sx, 150);
    },
    output: (t) => sc(t).sx,
  });

  // ───────────────────────────── Scotch yoke
  const sy = (t) => { const O = { x: 120, y: 150 }, r = 50; return { O, r, px: O.x + r * cos(t), py: O.y + r * sin(t) }; };
  add({
    id: 'scotch-yoke', title: 'Scotch yoke', aka: ['Slotted yoke', 'Slotted link', 'Slotted crosshead'],
    motion: 'rot-lin', family: 'linkages',
    summary: 'A crank pin sliding in a slotted frame produces perfectly smooth, sinusoidal back-and-forth motion.',
    how: [
      'Only the side-to-side position of the pin reaches the yoke; its up-and-down motion is absorbed as the pin slides along the slot.',
      'So the output is exactly r·cos θ — pure simple harmonic motion, which a slider-crank can only approximate. It is compact, but the sliding contact wears faster than a pinned joint.',
    ],
    key: 'Output = crank radius × cos(angle).',
    uses: ['Valve actuators', 'Shake tables', 'Some compressors', 'Pipe-cutting saws'],
    related: ['slider-crank', 'cam'],
    outLabel: 'Rod position',
    draw(d, t) {
      const { O, r, px, py } = sy(t);
      d.circle(O.x, O.y, r + 14, IN(d));
      d.bar(O.x, O.y, px, py, { width: 12, ...IN(d) });
      d.pin(O.x, O.y, 4);
      // guide bearing
      d.box(235, 139, 30, 10, 0, { fill: d.C.part, stroke: d.C.ground });
      d.box(235, 161, 30, 10, 0, { fill: d.C.part, stroke: d.C.ground });
      d.layer((L) => {
        L.box(px + 107, 150, 214, 10, 0, OUT(L));
        L.box(px, 150, 28, 150, 0, OUT(L));
        L.cut(() => L.box(px, 150, 14, 132, 0, { fill: '#000', stroke: null }));
        L.box(px, 150, 14, 132, 0, { fill: null, stroke: L.C.output });
      });
      d.box(px, py, 13, 13, 0);
      d.pin(px, py);
    },
    output: (t) => sy(t).px,
  });

  // ───────────────────────────── Geneva drive
  const GEN = (() => {
    const n = 4, a = 120, r = a * sin(PI / n), R = a * cos(PI / n);
    const Cw = { x: 255, y: 150 }, D = { x: 255 - a, y: 150 };
    const lim = PI / 2 - PI / n;
    const wheel = (t) => {
      const k = Math.floor((t + PI) / TAU), phi = mod(t + PI, TAU) - PI, step = TAU / n;
      if (phi < -lim) return PI / n - k * step;
      if (phi > lim) return -PI / n - k * step;
      const px = -a + r * cos(phi), py = r * sin(phi);
      return atan2(-py, -px) - k * step;
    };
    return { n, a, r, R, Cw, D, wheel };
  })();
  add({
    id: 'geneva', title: 'Geneva drive', aka: ['Maltese cross', 'Geneva stop', 'Geneva mechanism'],
    motion: 'rot-int', family: 'indexing',
    summary: 'A continuously turning pin steps a slotted wheel a quarter turn, then locks it firmly in place.',
    how: [
      'While the pin is inside a slot it drags the wheel around 90°. When it leaves, the round locking disc on the driver nests in the wheel\'s curved notch, holding it still until the pin comes round to the next slot.',
      'With four slots the wheel moves for a quarter of each driver turn and rests for three quarters. The slots meet the pin tangentially, so it starts and stops without a jolt.',
    ],
    key: 'Moves 1/n of a turn per driver revolution, with a positive lock in between.',
    uses: ['Film projectors', 'Indexing tables', 'Watch winding stops', 'Bottle-filling lines'],
    related: ['ratchet', 'spur-gears'],
    outLabel: 'Wheel angle',
    speed: 0.9,
    draw(d, t) {
      const { n, a, r, R, Cw, D, wheel } = GEN;
      const w = wheel(t), hw = 7, rl = 50;
      d.layer((L) => {
        L.circle(Cw.x, Cw.y, R, OUT(L));
        const slots = [], notches = [];
        for (let i = 0; i < n; i++) {
          const s = w + PI + (i * TAU) / n, m = s + PI / n;
          slots.push([Cw.x + 28 * cos(s), Cw.y + 28 * sin(s), Cw.x + (R + 16) * cos(s), Cw.y + (R + 16) * sin(s)]);
          notches.push([Cw.x + a * cos(m), Cw.y + a * sin(m)]);
        }
        L.cut(() => {
          slots.forEach((s) => L.bar(...s, { width: hw * 2, fill: '#000', stroke: null }));
          notches.forEach(([x, y]) => L.circle(x, y, rl + 2, { fill: '#000', stroke: null }));
        });
        L.clip(() => {
          slots.forEach((s) => L.bar(...s, { width: hw * 2, fill: null, stroke: L.C.output }));
          notches.forEach(([x, y]) => L.circle(x, y, rl + 2, { fill: null, stroke: L.C.output }));
        }, (c) => c.arc(Cw.x, Cw.y, R + 0.8, 0, TAU));
      });
      d.layer((L) => {
        const nx = D.x + a * cos(t), ny = D.y + a * sin(t);
        L.circle(D.x, D.y, rl, IN(L));
        L.cut(() => L.circle(nx, ny, R + 3, { fill: '#000', stroke: null }));
        L.clip(() => L.circle(nx, ny, R + 3, { fill: null, stroke: L.C.input }),
          (c) => c.arc(D.x, D.y, rl + 0.8, 0, TAU));
      });
      const px = D.x + r * cos(t), py = D.y + r * sin(t);
      d.bar(D.x, D.y, px, py, { width: 12, ...IN(d) });
      d.circle(px, py, 6, { fill: d.C.input, stroke: d.C.input });
      d.pin(D.x, D.y, 4); d.pin(Cw.x, Cw.y, 4);
    },
    output: (t) => GEN.wheel(t),
  });

  // ───────────────────────────── Cam and follower
  const CAM = (() => {
    const O = { x: 200, y: 208 };
    const prof = (a) => 44 + 30 * Math.pow((1 + cos(a)) / 2, 2);
    const lift = (t) => {
      let h = 0;
      for (let i = 0; i < 180; i++) { const a = (i / 180) * TAU; h = Math.max(h, -prof(a) * sin(a + t)); }
      return h;
    };
    return { O, prof, lift };
  })();
  add({
    id: 'cam', title: 'Cam & follower', aka: ['Plate cam', 'Disc cam', 'Flat-faced follower'],
    motion: 'rot-lin', family: 'cams',
    summary: 'A shaped disc lifts and lowers a follower. The outline of the cam is the motion program.',
    how: [
      'As the cam turns, the follower rides its edge. The distance from the shaft to the edge at each angle sets how high the follower sits, so any pattern of rise, pause and fall can be cut into the profile.',
      'Gravity or a spring keeps the follower pressed against the cam. Watch the graph: the lobe gives a quick lift, then a long low dwell.',
    ],
    key: 'Profile radius at each angle = follower position.',
    uses: ['Engine valve trains', 'Automata', 'Sewing machines', 'Music boxes', 'Locks'],
    related: ['scotch-yoke', 'slider-crank'],
    outLabel: 'Follower lift',
    draw(d, t) {
      const { O, prof, lift } = CAM;
      const fy = O.y - lift(t);
      d.box(180, 82, 14, 26, 0, { fill: d.C.part, stroke: d.C.ground });
      d.box(220, 82, 14, 26, 0, { fill: d.C.part, stroke: d.C.ground });
      d.box(200, fy - 64, 14, 112, 0, OUT(d));
      d.box(200, fy - 5, 84, 10, 0, OUT(d));
      const pts = [];
      for (let i = 0; i < 120; i++) { const a = (i / 120) * TAU; pts.push([O.x + prof(a) * cos(a + t), O.y + prof(a) * sin(a + t)]); }
      d.poly(pts, IN(d));
      d.circle(O.x + 50 * cos(t), O.y + 50 * sin(t), 2.6, { fill: d.C.input, stroke: null });
      d.pin(O.x, O.y, 5);
    },
    output: (t) => CAM.lift(t),
  });

  // ───────────────────────────── Four-bar crank-rocker
  const FB = (() => {
    const A = { x: 125, y: 215 }, B = { x: 285, y: 215 }, a = 40, b = 150, c = 100;
    const at = (t) => {
      const P = { x: A.x + a * cos(t), y: A.y + a * sin(t) };
      const dx = B.x - P.x, dy = B.y - P.y, dd = hypot(dx, dy);
      const l = (b * b - c * c + dd * dd) / (2 * dd), h = sqrt(Math.max(0, b * b - l * l));
      const mx = P.x + (l * dx) / dd, my = P.y + (l * dy) / dd;
      const Q = { x: mx + (h * dy) / dd, y: my - (h * dx) / dd };
      const ux = (Q.x - P.x) / b, uy = (Q.y - P.y) / b;
      const E = { x: P.x + 0.5 * (Q.x - P.x) + 48 * uy, y: P.y + 0.5 * (Q.y - P.y) - 48 * ux };
      return { P, Q, E };
    };
    const trace = Array.from({ length: 200 }, (_, i) => { const { E } = at((i / 200) * TAU); return [E.x, E.y]; });
    return { A, B, at, trace };
  })();
  add({
    id: 'four-bar', title: 'Four-bar linkage', aka: ['Crank-rocker', 'Four-bar crank rocker', 'Coupler curve'],
    motion: 'rot-osc', family: 'linkages',
    summary: 'Four links joined in a loop turn a full rotation into a rocking swing, while the middle link traces a rich curve.',
    how: [
      'The frame between the two fixed pivots is the fourth link. The short crank turns all the way round; the coupler connects it to the rocker, which can only swing back and forth.',
      'Whether the crank can rotate fully is set by Grashof\'s rule: shortest + longest link must not exceed the sum of the other two. The dashed loop is the path of one point on the coupler — engineers once catalogued thousands of these curves.',
    ],
    key: 'Shortest + longest ≤ the other two → the crank can turn fully.',
    uses: ['Windscreen wipers', 'Oil pump jacks', 'Walking machines', 'Folding seats', 'Exercise machines'],
    related: ['slider-crank', 'quick-return'],
    outLabel: 'Rocker angle',
    draw(d, t) {
      const { A, B, at, trace } = FB, { P, Q, E } = at(t);
      d.poly(trace, { fill: null, stroke: d.C.muted, w: 1, dash: [3, 4] });
      d.ground(A.x, A.y); d.ground(B.x, B.y);
      d.bar(B.x, B.y, Q.x, Q.y, { width: 12, ...OUT(d) });
      d.poly([[P.x, P.y], [Q.x, Q.y], [E.x, E.y]], { fill: d.C.part, stroke: d.C.ink });
      d.bar(A.x, A.y, P.x, P.y, { width: 12, ...IN(d) });
      d.pin(A.x, A.y); d.pin(B.x, B.y); d.pin(P.x, P.y); d.pin(Q.x, Q.y);
      d.circle(E.x, E.y, 4, { fill: d.C.ink, stroke: null });
    },
    output: (t) => { const { Q } = FB.at(t); return -atan2(Q.y - FB.B.y, Q.x - FB.B.x); },
  });

  // ───────────────────────────── Ratchet and pawl
  const RAT = (() => {
    const C = { x: 200, y: 172 }, z = 12, p = TAU / z, Rt = 72, Rr = 58, Rp = 98, Lp = 42, eps = 0.04;
    const prof = (rho) => Rt - ((Rt - Rr) * rho) / p;
    // Tip angle offset when the tip sits in a tooth root.
    const rt = prof(p - eps);
    const off = Math.acos((Rp * Rp + rt * rt - Lp * Lp) / (2 * Rp * rt));
    const drive0 = -PI / 2 - 2 * p - eps - off;
    const hold = -PI / 2 + 2 * p - eps - off;
    const state = (t) => {
      const k = Math.floor(t / TAU), ph = mod(t, TAU), u = (1 - cos(ph)) / 2;
      const w = ph < PI ? k * p + p * u : (k + 1) * p;
      return { w, lever: drive0 + p * u };
    };
    // Rigid pawl rotating about its pivot until its tip touches the wheel.
    const pawl = (pivAng, w) => {
      const px = C.x + Rp * cos(pivAng), py = C.y + Rp * sin(pivAng);
      const inside = (b) => {
        const tx = px + Lp * cos(b), ty = py + Lp * sin(b);
        const rho = mod(atan2(ty - C.y, tx - C.x) - w, p);
        return hypot(tx - C.x, ty - C.y) < prof(rho);
      };
      const b0 = pivAng + PI / 2 - 0.2, step = (PI / 2 + 0.2) / 40;
      let lo = b0, hi = b0 + 40 * step;
      for (let i = 1; i <= 40; i++) { const b = b0 + step * i; if (inside(b)) { hi = b; lo = b - step; break; } }
      for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2; if (inside(m)) hi = m; else lo = m; }
      return { px, py, tx: px + Lp * cos(lo), ty: py + Lp * sin(lo) };
    };
    return { C, z, p, Rt, Rr, Rp, prof, hold, state, pawl };
  })();
  add({
    id: 'ratchet', title: 'Ratchet & pawl', aka: ['Click and ratchet', 'Ratchet wheel', 'Detent'],
    motion: 'osc-int', family: 'indexing',
    summary: 'A swinging lever pushes a toothed wheel forward one tooth at a time; a second pawl stops it slipping back.',
    how: [
      'On the forward stroke the driving pawl catches a steep tooth face and carries the wheel along. On the return stroke it slides up the sloping backs of the teeth and drops into the next gap.',
      'Meanwhile the fixed holding pawl does the same in reverse: it clicks over teeth as the wheel advances and blocks any backward turn.',
    ],
    key: 'Motion passes one way only.',
    uses: ['Socket wrenches', 'Winches', 'Clock winding', 'Car jacks', 'Cable ties'],
    related: ['geneva', 'four-bar'],
    outLabel: 'Wheel angle',
    speed: 0.8,
    draw(d, t) {
      const { C, z, p, Rp, prof, hold, state, pawl } = RAT, { w, lever } = state(t);
      const pts = [];
      for (let j = 0; j < z; j++) for (let s = 0; s <= 6; s++) {
        const rho = (s / 6) * p, r = prof(rho), a = w + j * p + rho;
        pts.push([C.x + r * cos(a), C.y + r * sin(a)]);
      }
      d.poly(pts, OUT(d));
      d.spokes(C.x, C.y, 40, w, { stroke: d.C.output });
      const h = pawl(hold, w);
      d.ground(h.px, h.py - 0.01);
      d.bar(h.px, h.py, h.tx, h.ty, { width: 7 });
      const dp = pawl(lever, w);
      d.bar(C.x, C.y, dp.px, dp.py, { width: 13, ...IN(d) });
      d.bar(dp.px, dp.py, dp.tx, dp.ty, { width: 7, ...IN(d) });
      d.pin(C.x, C.y, 4); d.pin(dp.px, dp.py); d.pin(h.px, h.py);
      void Rp;
    },
    output: (t) => RAT.state(t).w,
  });

  // ───────────────────────────── Belt drive
  const BELT = { c1: { x: 115, y: 150 }, r1: 62, c2: { x: 300, y: 150 }, r2: 36 };
  add({
    id: 'belt-drive', title: 'Belt & pulleys', aka: ['Open belt drive', 'Pulley drive', 'Flat belt'],
    motion: 'rot-rot', family: 'belts',
    summary: 'A loop of belt links two pulleys, carrying rotation across a distance in the same direction.',
    how: [
      'The belt moves at the same surface speed over both pulleys, so the speed ratio is the diameter ratio: the large pulley here turns the small one about 1.7× faster.',
      'Crossing the belt into a figure-eight reverses the direction. A belt can slip under overload, which protects the machine — or, with teeth added, it can be made not to.',
    ],
    key: 'Speed ratio = driver diameter ÷ driven diameter.',
    uses: ['Car engine accessories', 'Lathes', 'Vacuum cleaners', '3D printers', 'Line-shaft workshops'],
    related: ['spur-gears'],
    outLabel: 'Small pulley angle',
    draw(d, t) {
      const { c1, r1, c2, r2 } = BELT;
      pulley(d, c1, r1, t, IN(d));
      pulley(d, c2, r2, (t * r1) / r2, OUT(d));
      const dist = c2.x - c1.x, nx = (r1 - r2) / dist, ny = sqrt(1 - nx * nx);
      const up = atan2(-ny, nx), dn = atan2(ny, nx);
      const ctx = d.ctx;
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(c1.x + r1 * nx, c1.y - r1 * ny);
        ctx.lineTo(c2.x + r2 * nx, c2.y - r2 * ny);
        ctx.arc(c2.x, c2.y, r2, up, dn);
        ctx.lineTo(c1.x + r1 * nx, c1.y + r1 * ny);
        ctx.arc(c1.x, c1.y, r1, dn, up + TAU);
        ctx.closePath();
      };
      path(); d.paint({ stroke: d.C.ink, w: 5 });
      path(); d.paint({ stroke: d.C.bg, w: 2, dash: [3, 11], dashOffset: -r1 * t });
      d.pin(c1.x, c1.y, 3); d.pin(c2.x, c2.y, 3);
    },
    output: (t) => (t * 62) / 36,
  });

  // ───────────────────────────── Quick-return (crank & slotted lever)
  const QR = (() => {
    const O = { x: 200, y: 190 }, A = { x: 200, y: 280 }, r = 45, Ll = 230, Lk = 60, ry = 30;
    const at = (t) => {
      const P = { x: O.x + r * cos(t), y: O.y + r * sin(t) };
      const dl = hypot(P.x - A.x, P.y - A.y), ux = (P.x - A.x) / dl, uy = (P.y - A.y) / dl;
      const T = { x: A.x + Ll * ux, y: A.y + Ll * uy };
      const dy = T.y - ry, Rx = T.x + sqrt(Lk * Lk - dy * dy);
      return { P, ux, uy, T, Rx };
    };
    return { O, A, r, ry, at };
  })();
  add({
    id: 'quick-return', title: 'Quick-return', aka: ['Crank and slotted lever', 'Whitworth quick return', 'Shaper mechanism'],
    motion: 'rot-lin', family: 'linkages',
    summary: 'A crank swinging a slotted lever gives a slow working stroke and a fast return stroke.',
    how: [
      'The crank pin slides inside the lever\'s slot. Because the lever pivots below the crank, the pin spends the long arc of its circle pushing the lever one way and only the short arc bringing it back.',
      'Here that is 240° forward and 120° back — a 2 : 1 ratio — so a cutting tool moves slowly through the work and hurries back, saving time. The dashed arc on the crank marks the slow stroke.',
    ],
    key: 'Time ratio = long arc ÷ short arc of the crank circle.',
    uses: ['Metal shapers', 'Slotting machines', 'Power hacksaws'],
    related: ['slider-crank', 'scotch-yoke'],
    outLabel: 'Ram position',
    draw(d, t) {
      const { O, A, r, ry, at } = QR, { P, ux, uy, T, Rx } = at(t);
      d.hatch(30, ry - 8, 340, -1); d.hatch(30, ry + 8, 340, 1);
      d.box(Rx - 45, ry, 130, 14, 0, OUT(d));
      d.circle(O.x, O.y, r + 12, IN(d));
      d.arc(O.x, O.y, r, PI / 2 + PI / 3, PI / 2 - PI / 3 + TAU, { stroke: d.C.input, w: 1.2, dash: [4, 4] });
      d.ground(A.x, A.y);
      const ang = atan2(uy, ux);
      d.bar(A.x, A.y, T.x, T.y, { width: 18 });
      d.bar(A.x + 30 * ux, A.y + 30 * uy, A.x + 150 * ux, A.y + 150 * uy, { width: 7, fill: d.C.bg });
      d.bar(O.x, O.y, P.x, P.y, { width: 10, ...IN(d) });
      d.box(P.x, P.y, 20, 9, ang, IN(d));
      d.bar(T.x, T.y, Rx, ry, { width: 7 });
      d.pin(O.x, O.y, 4); d.pin(P.x, P.y, 2.6); d.pin(A.x, A.y); d.pin(T.x, T.y); d.pin(Rx, ry);
    },
    output: (t) => QR.at(t).Rx,
  });

  // ───────────────────────────── Planetary gears
  const PL = { zs: 14, zp: 10, zr: 34, m: 6, a: 72, C: { x: 200, y: 150 } };
  add({
    id: 'planetary', title: 'Planetary gears', aka: ['Epicyclic gear train', 'Sun and planet gears', 'Planetary gearbox'],
    motion: 'rot-rot', family: 'gears',
    summary: 'A sun gear drives planets that roll around inside a fixed ring, turning their carrier slowly with great force.',
    how: [
      'The ring gear is held still. As the sun turns, the planets mesh with both the sun and the ring, so they must walk around the inside of the ring, taking the carrier with them.',
      'With 14 sun teeth and 34 ring teeth the carrier turns 14 ÷ (14 + 34) — about 0.29× the sun speed — a big reduction in a small, coaxial package. Holding a different member (sun, ring or carrier) gives a different ratio, which is how automatic gearboxes change gear.',
    ],
    key: 'Ring fixed: carrier speed = sun speed × sun teeth ÷ (sun + ring teeth).',
    uses: ['Automatic transmissions', 'Electric screwdrivers', 'Bicycle hub gears', 'Wind turbines', 'Robot joints'],
    related: ['spur-gears', 'cardan-gears'],
    outLabel: 'Carrier angle',
    speed: 1.2,
    draw(d, t) {
      const { zs, zp, zr, m, a, C } = PL, c = (t * zs) / (zs + zr);
      d.ringGear(C.x, C.y, zr, m, 0, GND(d));
      const centers = [];
      for (let i = 0; i < 3; i++) {
        const f = c + (i * TAU) / 3, x = C.x + a * cos(f), y = C.y + a * sin(f);
        centers.push([x, y]);
        d.gear(x, y, zp, m, f + PI + PI / zp - (zs / zp) * (t - f));
      }
      d.gear(C.x, C.y, zs, m, t, IN(d));
      for (const [x, y] of centers) d.bar(C.x, C.y, x, y, { width: 9, ...OUT(d) });
      d.circle(C.x, C.y, 10, OUT(d));
      for (const [x, y] of centers) d.pin(x, y);
      d.pin(C.x, C.y);
    },
    output: (t) => (t * 14) / 48,
  });

  // ───────────────────────────── Cardan gears (Tusi couple)
  add({
    id: 'cardan-gears', title: 'Cardan gears', aka: ['Tusi couple', 'Hypocycloid straight-line motion', 'Cardan circles'],
    motion: 'rot-lin', family: 'gears',
    summary: 'A gear rolling inside a ring twice its size makes every point on its rim travel in a perfectly straight line.',
    how: [
      'The crank carries the small gear around the inside of the fixed ring. Rolling inside a circle of exactly twice its diameter, the small gear spins backwards at the same rate the crank turns forwards.',
      'Those two motions cancel sideways and add lengthways, so a point on the small gear\'s pitch circle slides along a diameter of the ring — straight-line motion from pure rotation, with no guides. Nasir al-Din al-Tusi described the idea in the 13th century.',
    ],
    key: 'Rolling inside a circle twice its size → rim points move in straight lines.',
    uses: ['Printing presses', 'Some pumps and engines', 'Astronomical models', 'Ellipse-drawing tools'],
    related: ['planetary', 'trammel', 'scotch-yoke'],
    outLabel: 'Point position',
    draw(d, t) {
      const C = { x: 200, y: 150 }, cp = { x: C.x + 50 * cos(t), y: C.y + 50 * sin(t) };
      d.ringGear(C.x, C.y, 40, 5, 0, GND(d));
      d.line(C.x - 100, C.y, C.x + 100, C.y, { color: d.C.output, w: 1.2, dash: [4, 4] });
      d.gear(cp.x, cp.y, 20, 5, -t + PI / 20);
      d.bar(C.x, C.y, cp.x, cp.y, { width: 12, ...IN(d) });
      const X = { x: cp.x + 50 * cos(-t), y: cp.y + 50 * sin(-t) };
      d.box(X.x, X.y, 18, 12, 0, OUT(d));
      d.pin(C.x, C.y, 4); d.pin(cp.x, cp.y); d.pin(X.x, X.y);
    },
    output: (t) => 100 * cos(t),
  });

  // ───────────────────────────── Crossed belt
  const XB = { c1: { x: 115, y: 150 }, r1: 56, c2: { x: 295, y: 150 }, r2: 42 };
  add({
    id: 'crossed-belt', title: 'Crossed belt', aka: ['Cross belt drive', 'Reversing belt', 'Figure-eight belt'],
    motion: 'rot-rot', family: 'belts',
    summary: 'Twisting a belt into a figure-eight makes the driven pulley turn the opposite way.',
    how: [
      'Each strand of the belt leaves the top of one pulley and arrives at the bottom of the other, so the two pulleys turn in opposite directions — like a pair of gears, but over a distance.',
      'The crossed belt wraps further around each pulley, so it grips better than an open belt, but the strands rub where they cross. Old workshops used a shifting belt between open and crossed pulleys to reverse machines.',
    ],
    key: 'Crossing the belt reverses direction; the ratio is still the diameter ratio.',
    uses: ['Line-shaft workshops', 'Lathe reversing', 'Spinning wheels', 'Toys'],
    related: ['belt-drive', 'spur-gears'],
    outLabel: 'Driven pulley angle',
    draw(d, t) {
      const { c1, r1, c2, r2 } = XB;
      pulley(d, c1, r1, t, IN(d));
      pulley(d, c2, r2, (-t * r1) / r2, OUT(d));
      const dist = c2.x - c1.x, nx = (r1 + r2) / dist, ny = sqrt(1 - nx * nx);
      const uA = atan2(-ny, nx), dA = atan2(ny, nx);
      const ctx = d.ctx;
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(c1.x + r1 * nx, c1.y - r1 * ny);
        ctx.lineTo(c2.x - r2 * nx, c2.y + r2 * ny);
        ctx.arc(c2.x, c2.y, r2, atan2(ny, -nx), atan2(-ny, -nx), true);
        ctx.lineTo(c1.x + r1 * nx, c1.y + r1 * ny);
        ctx.arc(c1.x, c1.y, r1, dA, uA + TAU);
        ctx.closePath();
      };
      path(); d.paint({ stroke: d.C.ink, w: 5 });
      path(); d.paint({ stroke: d.C.bg, w: 2, dash: [3, 11], dashOffset: -r1 * t });
      d.pin(c1.x, c1.y, 3); d.pin(c2.x, c2.y, 3);
    },
    output: (t) => (-t * 56) / 42,
  });

  // ───────────────────────────── Eccentric
  const EC = (t) => {
    const O = { x: 120, y: 150 }, e = 22, L = 165;
    const E = { x: O.x + e * cos(t), y: O.y + e * sin(t) };
    return { O, E, sx: E.x + sqrt(L * L - (E.y - O.y) ** 2) };
  };
  add({
    id: 'eccentric', title: 'Eccentric', aka: ['Eccentric and strap', 'Eccentric sheave', 'Offset disc'],
    motion: 'rot-lin', family: 'cams',
    summary: 'A disc mounted off-centre on its shaft acts as a crank with a tiny throw, driving a rod through a strap around its rim.',
    how: [
      'The disc (sheave) is fixed to the shaft but its centre is offset. A strap rides around the disc, and as the shaft turns, the strap and its rod move back and forth exactly like a crank of radius equal to the offset.',
      'Because there is no crank arm, the shaft can run straight through — which is why steam engines used eccentrics to work their valves from the middle of a crankshaft.',
    ],
    key: 'An eccentric is a crank whose pin is bigger than the shaft.',
    uses: ['Steam engine valve gear', 'Pumps', 'Punch presses', 'Vibrating sanders'],
    related: ['slider-crank', 'cam'],
    outLabel: 'Slider position',
    draw(d, t) {
      const { O, E, sx } = EC(t);
      d.hatch(225, 137, 130, -1); d.hatch(225, 163, 130, 1);
      d.box(sx, 150, 38, 26, 0, OUT(d));
      d.bar(E.x + 58 * cos(atan2(150 - E.y, sx - E.x)), E.y + 58 * sin(atan2(150 - E.y, sx - E.x)), sx, 150, { width: 9 });
      d.circle(E.x, E.y, 64);
      d.circle(E.x, E.y, 52, IN(d));
      d.circle(O.x, O.y, 9, { fill: d.C.bg, stroke: d.C.input });
      d.circle(E.x, E.y, 2.4, { fill: d.C.input, stroke: null });
      d.pin(O.x, O.y, 4); d.pin(sx, 150);
    },
    output: (t) => EC(t).sx,
  });

  // ───────────────────────────── Bell crank
  const BC = (t) => {
    const P = { x: 200, y: 165 }, r = 70, L = 80, f = 0.4 * sin(t);
    const A = { x: P.x + r * sin(f), y: P.y - r * cos(f) };
    const B = { x: P.x + r * cos(f), y: P.y + r * sin(f) };
    return { P, A, B, si: A.x - sqrt(L * L - (A.y - 95) ** 2), so: B.y + sqrt(L * L - (B.x - 270) ** 2) };
  };
  add({
    id: 'bell-crank', title: 'Bell crank', aka: ['Angle lever', 'L-lever', 'Bellcrank'],
    motion: 'lin-lin', family: 'linkages',
    summary: 'An L-shaped lever turns a push or pull through a right angle — and can scale it up or down.',
    how: [
      'The lever pivots at its corner. Pushing one arm sideways swings the other arm up or down, so motion along one line comes out along another.',
      'With equal arms, the output moves as far as the input; make one arm longer and you trade distance for force. It is named after the levers that once ran doorbell wires around the corners of houses.',
    ],
    key: 'Output ÷ input movement = output arm ÷ input arm.',
    uses: ['Bicycle brakes', 'Aircraft controls', 'Railway signals', 'Old house bells', 'Car suspension'],
    related: ['four-bar', 'toggle'],
    outLabel: 'Output slider',
    draw(d, t) {
      const { P, A, B, si, so } = BC(t);
      d.hatch(55, 82, 115, -1); d.hatch(55, 108, 115, 1);
      d.vhatch(257, 200, 90, -1); d.vhatch(283, 200, 90, 1);
      d.box(si, 95, 34, 24, 0, IN(d));
      d.box(270, so, 24, 34, 0, OUT(d));
      d.bar(si, 95, A.x, A.y, { width: 8 });
      d.bar(B.x, B.y, 270, so, { width: 8 });
      d.bar(P.x, P.y, A.x, A.y, { width: 14 }); d.bar(P.x, P.y, B.x, B.y, { width: 14 });
      d.circle(P.x, P.y, 6.5, { fill: d.C.part, stroke: null });
      d.ground(P.x, P.y);
      d.pin(si, 95); d.pin(A.x, A.y); d.pin(B.x, B.y); d.pin(270, so);
    },
    output: (t) => -BC(t).so,
  });

  // ───────────────────────────── Watt's linkage
  const WT = (() => {
    const A = { x: 95, y: 95 }, B = { x: 305, y: 205 }, r = 105, b = 110;
    const at = (al) => {
      const P = { x: A.x + r * cos(al), y: A.y + r * sin(al) };
      const Q = meet(P, b, B, r, 1);
      const Q2 = meet(P, b, B, r, -1);
      const q = Q.x < Q2.x ? Q : Q2;
      return { P, Q: q, M: { x: (P.x + q.x) / 2, y: (P.y + q.y) / 2 } };
    };
    const ang = (t) => 0.42 * sin(t);
    const full = Array.from({ length: 241 }, (_, i) => at(-0.75 + (1.5 * i) / 240).M).map((p) => [p.x, p.y]);
    const used = Array.from({ length: 61 }, (_, i) => at(-0.42 + (0.84 * i) / 60).M).map((p) => [p.x, p.y]);
    return { A, B, at, ang, full, used };
  })();
  add({
    id: 'watt-linkage', title: "Watt's linkage", aka: ['Watt parallel motion', 'Straight-line linkage', 'Watt link'],
    motion: 'osc-lin', family: 'linkages',
    summary: 'Two swinging arms joined by a short link make the link\'s midpoint move in a nearly straight line.',
    how: [
      'Each arm\'s end moves on an arc, but the arcs curve in opposite directions. At the midpoint of the connecting link the two curvatures cancel, leaving a path that is almost perfectly straight over a useful stroke.',
      'James Watt needed exactly this in 1784 to guide his engine\'s piston rod from a rocking beam without sliding guides. He called it the invention he was proudest of. Swing further and the path bends into a figure-eight (dashed).',
    ],
    key: 'Opposing arcs cancel at the midpoint → approximate straight line.',
    uses: ['Beam steam engines', 'Car rear suspension', 'Race-car axles', 'Lifting tables'],
    related: ['four-bar', 'cardan-gears', 'trammel'],
    outLabel: 'Midpoint height',
    draw(d, t) {
      const { A, B, at, ang, full, used } = WT, { P, Q, M } = at(ang(t));
      d.poly(full, { fill: null, stroke: d.C.muted, w: 1, dash: [3, 4], close: false });
      d.poly(used, { fill: null, stroke: d.C.output, w: 2, close: false });
      d.ground(A.x, A.y); d.ground(B.x, B.y);
      d.bar(B.x, B.y, Q.x, Q.y, { width: 11 });
      d.bar(P.x, P.y, Q.x, Q.y, { width: 11, ...OUT(d) });
      d.bar(A.x, A.y, P.x, P.y, { width: 11, ...IN(d) });
      d.pin(A.x, A.y); d.pin(B.x, B.y); d.pin(P.x, P.y); d.pin(Q.x, Q.y);
      d.circle(M.x, M.y, 4.5, { fill: d.C.output, stroke: null });
    },
    output: (t) => -WT.at(WT.ang(t)).M.y,
  });

  // ───────────────────────────── Oscillating cylinder engine
  const OE = (t) => {
    const T = { x: 92, y: 150 }, O = { x: 272, y: 150 }, r = 42, Lr = 128;
    const P = { x: O.x + r * cos(t), y: O.y + r * sin(t) };
    const dl = hypot(P.x - T.x, P.y - T.y);
    return { T, O, r, P, ang: atan2(P.y - T.y, P.x - T.x), s: dl - Lr };
  };
  add({
    id: 'oscillating-engine', title: 'Oscillating cylinder', aka: ['Oscillating engine', 'Wobbler', 'Rocking cylinder'],
    motion: 'lin-rot', family: 'linkages',
    summary: 'The whole cylinder rocks on a pivot, so the piston rod can push straight onto the crank with no connecting rod.',
    how: [
      'The piston rod is fixed to the piston and pinned directly to the crank. As the crank turns, the cylinder tips back and forth on its trunnion to follow it.',
      'The rocking motion itself can open and close the steam ports, so the engine needs no separate valve gear. That simplicity made it a favourite for paddle steamers and toy engines.',
    ],
    key: 'Let the cylinder swing, and the piston rod becomes the connecting rod.',
    uses: ['Toy steam engines', 'Paddle steamers', 'Hydraulic rams on diggers', 'Model engines'],
    related: ['slider-crank', 'eccentric'],
    outLabel: 'Crank angle',
    draw(d, t) {
      const { T, O, r, P, ang, s } = OE(t);
      pulley(d, O, r + 22, t, OUT(d));
      d.poly([[T.x, T.y], [T.x - 13, T.y + 36], [T.x + 13, T.y + 36]], GND(d));
      d.hatch(T.x - 18, T.y + 36, 36, 1);
      d.layer((L) => {
        const c = L.ctx;
        c.save(); c.translate(T.x, T.y); c.rotate(ang);
        L.box(48, 0, 134, 42, 0, GND(L));
        L.cut(() => L.box(58, 0, 130, 30, 0, { fill: '#000', stroke: null }));
        L.box(58, 0, 130, 30, 0, { fill: null, stroke: L.C.ground });
        c.restore();
      });
      const px = T.x + s * cos(ang), py = T.y + s * sin(ang);
      d.bar(px, py, P.x, P.y, { width: 7, ...IN(d) });
      d.box(px, py, 12, 28, ang, IN(d));
      d.bar(O.x, O.y, P.x, P.y, { width: 12, ...OUT(d) });
      d.pin(T.x, T.y, 4); d.pin(O.x, O.y, 4); d.pin(P.x, P.y);
    },
    output: (t) => t,
  });

  // ───────────────────────────── Elliptic trammel
  const TR = (t) => {
    const C = { x: 200, y: 150 }, L = 80;
    const A = { x: C.x + L * cos(t), y: C.y }, B = { x: C.x, y: C.y + L * sin(t) };
    return { C, A, B, M: { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 }, E: { x: 1.5 * A.x - 0.5 * B.x, y: 1.5 * A.y - 0.5 * B.y } };
  };
  add({
    id: 'trammel', title: 'Elliptic trammel', aka: ['Trammel of Archimedes', 'Ellipsograph', 'Kitchen-table nonsense machine'],
    motion: 'rot-lin', family: 'linkages',
    summary: 'Two sliders in crossed grooves joined by a bar: the sliders shuttle back and forth while the end of the bar draws an ellipse.',
    how: [
      'One block can only move left–right and the other only up–down. The bar between them keeps them a fixed distance apart, so as the crank turns the bar\'s midpoint, each slider oscillates along its own groove.',
      'Every other point on the bar traces an ellipse whose two radii are its distances to the sliders. Carpenters still use this to lay out oval tabletops and arches.',
    ],
    key: 'A point on the bar draws an ellipse with radii equal to its distances from the two sliders.',
    uses: ['Drawing ellipses', 'Oval tables and windows', 'Desk toys', 'Some engine designs'],
    related: ['cardan-gears', 'scotch-yoke', 'watt-linkage'],
    outLabel: 'Pen height',
    draw(d, t) {
      const { C, A, B, M, E } = TR(t);
      d.ctx.beginPath(); d.ctx.ellipse(C.x, C.y, 120, 40, 0, 0, TAU);
      d.paint({ stroke: d.C.output, w: 1.2, dash: [4, 4] });
      d.box(C.x, C.y, 210, 18, 0, { fill: d.C.bg, stroke: d.C.ground });
      d.box(C.x, C.y, 18, 210, 0, { fill: d.C.bg, stroke: d.C.ground });
      d.box(C.x, C.y, 16.5, 16.5, 0, { fill: d.C.bg, stroke: null });
      d.box(A.x, A.y, 24, 14, 0); d.box(B.x, B.y, 14, 24, 0);
      d.bar(E.x, E.y, B.x, B.y, { width: 9, ...OUT(d) });
      d.bar(C.x, C.y, M.x, M.y, { width: 10, ...IN(d) });
      d.pin(C.x, C.y); d.pin(A.x, A.y); d.pin(B.x, B.y); d.pin(M.x, M.y, 2.4);
      d.circle(E.x, E.y, 4.5, { fill: d.C.output, stroke: null });
    },
    output: (t) => -TR(t).E.y,
  });

  // ───────────────────────────── Toggle joint
  const TG = (t) => {
    const F = { x: 200, y: 40 }, O = { x: 61, y: 125 }, rc = 26, Lr = 110, l = 80;
    const P = { x: O.x + rc * cos(t), y: O.y + rc * sin(t) };
    const K = meet(F, l, P, Lr, -1);
    return { F, O, P, K, R: { x: F.x, y: K.y + sqrt(Math.max(0, l * l - (K.x - F.x) ** 2)) } };
  };
  add({
    id: 'toggle', title: 'Toggle joint', aka: ['Toggle press', 'Knee joint', 'Toggle linkage'],
    motion: 'rot-lin', family: 'linkages',
    summary: 'Two links that nearly straighten into a line multiply force enormously at the end of the stroke.',
    how: [
      'Pushing the knee sideways straightens the two links and drives the ram down. As the links approach a straight line, a large sideways movement of the knee produces only a tiny movement of the ram.',
      'Because work in equals work out, that tiny movement comes with a huge force — ideal for stamping, crushing and clamping. Pushed just past straight, the joint locks itself, which is how toggle clamps and folding table legs hold.',
    ],
    key: 'Near straight, small ram motion ↔ very large ram force.',
    uses: ['Stamping presses', 'Toggle clamps', 'Stone crushers', 'Folding legs', 'Injection moulders'],
    related: ['bell-crank', 'slider-crank'],
    outLabel: 'Ram position',
    draw(d, t) {
      const { F, O, P, K, R } = TG(t);
      d.hatch(150, 242, 100, 1);
      d.box(200, 234, 64, 16, 0, GND(d));
      d.vhatch(178, 150, 70, -1); d.vhatch(222, 150, 70, 1);
      d.box(R.x, R.y + 10, 42, 30, 0, OUT(d));
      d.circle(O.x, O.y, 36, IN(d));
      d.bar(O.x, O.y, P.x, P.y, { width: 11, ...IN(d) });
      d.bar(P.x, P.y, K.x, K.y, { width: 8 });
      d.bar(F.x, F.y, K.x, K.y, { width: 12 }); d.bar(K.x, K.y, R.x, R.y, { width: 12 });
      d.ground(F.x, F.y, 11, -1);
      d.pin(O.x, O.y, 4); d.pin(P.x, P.y); d.pin(K.x, K.y); d.pin(R.x, R.y);
    },
    output: (t) => -TG(t).R.y,
  });

  // ───────────────────────────── Worm gear
  add({
    id: 'worm-gear', title: 'Worm & wheel', aka: ['Worm gear', 'Worm drive', 'Endless screw'],
    motion: 'rot-rot', family: 'screws',
    summary: 'A screw-like worm turns a gear wheel at right angles, giving a huge speed reduction in one step.',
    how: [
      'Each full turn of the single-thread worm pushes the wheel forward by just one tooth, so this 24-tooth wheel turns once for every 24 turns of the worm. Seen from the side, the thread looks like a rack sliding endlessly along.',
      'Friction between the sliding surfaces usually means the wheel cannot drive the worm backwards. That self-locking is a feature: a lifted load stays put when you let go.',
    ],
    key: 'Ratio = wheel teeth ÷ worm starts — 24 : 1 here.',
    uses: ['Guitar tuning pegs', 'Gate openers', 'Conveyor drives', 'Steering boxes', 'Winches'],
    related: ['lead-screw', 'rack-pinion', 'spur-gears'],
    outLabel: 'Wheel angle',
    speed: 2,
    draw(d, t) {
      const m = 6, z = 24, rp = 72, W = { x: 200, y: 190 }, P = PI * m, yp = W.y - rp;
      const base = mod((P * t) / TAU, P), yc = yp - 30;
      const bTip = yp + m, bRoot = yp - 1.25 * m, tTip = yc - 30 - m, tRoot = yc - 30 + 1.25 * m;
      d.gear(W.x, W.y, z, m, t / z, OUT(d));
      d.bar(40, yc, 360, yc, { width: 14, ...IN(d) });
      for (const x of [62, 338]) d.box(x, yc, 16, 34, 0, GND(d));
      const top = [], bot = [];
      for (let k = -9; k <= 9; k++) {
        const xb = 200 + P / 2 + base + k * P, xt = xb + P / 2;
        top.push([xt - 0.3 * P, tRoot], [xt - 0.13 * P, tTip], [xt + 0.13 * P, tTip], [xt + 0.3 * P, tRoot]);
        bot.push([xb - 0.3 * P, bRoot], [xb - 0.13 * P, bTip], [xb + 0.13 * P, bTip], [xb + 0.3 * P, bRoot]);
      }
      d.clip(() => {
        d.poly([...top, ...bot.reverse()], IN(d));
        d.ctx.beginPath();
        for (let k = -9; k <= 9; k++) { const xb = 200 + P / 2 + base + k * P; d.ctx.moveTo(xb, bRoot + 2); d.ctx.lineTo(xb + P / 2, tRoot - 2); }
        d.paint({ stroke: d.C.input, w: 1 });
      }, (c) => c.rect(90, 0, 220, 300));
      d.line(90, tRoot, 90, bRoot, { color: d.C.input }); d.line(310, tRoot, 310, bRoot, { color: d.C.input });
      d.pin(W.x, W.y, 4);
    },
    output: (t) => t / 24,
  });

  // ───────────────────────────── Lead screw
  const LSc = { P: 28, psi: (t) => 12 * sin(t) };
  add({
    id: 'lead-screw', title: 'Lead screw', aka: ['Screw and nut', 'Power screw', 'Feed screw', 'Ball screw'],
    motion: 'rot-lin', family: 'screws',
    summary: 'Turning a threaded rod drives a nut along it — slow, precise, powerful straight-line motion.',
    how: [
      'The nut is kept from turning by its guide, so as the screw rotates the thread pushes the nut along by one pitch per turn. Watch the thread: it appears to slide with the nut.',
      'A fine pitch gives very small, very controllable movements with a large force — the same idea as a ramp wrapped around a cylinder. Reverse the handle and the nut comes back.',
    ],
    key: 'Travel per turn = thread pitch.',
    uses: ['Vices and clamps', 'Lathe carriages', 'CNC machines', '3D printer Z axis', 'Car jacks'],
    related: ['worm-gear', 'rack-pinion'],
    outLabel: 'Nut position',
    draw(d, t) {
      const { P, psi } = LSc, a = psi(t), shift = (P * a) / TAU, xn = 210 + shift;
      d.hatch(120, 104, 180, -1);
      d.box(356, 150, 12, 44, 0, GND(d));
      d.box(210, 150, 284, 32, 0, IN(d));
      d.clip(() => {
        d.ctx.beginPath();
        for (let k = -12; k <= 12; k++) { const x = 210 + shift + k * P; d.ctx.moveTo(x - P / 4, 134); d.ctx.lineTo(x + P / 4, 166); }
        d.paint({ stroke: d.C.input, w: 1.4 });
      }, (c) => c.rect(68, 134, 284, 32));
      d.box(xn, 111, 110, 12, 0, OUT(d));
      d.box(xn, 150, 48, 58, 0, OUT(d));
      d.line(xn - 24, 150, xn + 24, 150, { color: d.C.output, w: 1, dash: [3, 3] });
      const ky = 150 - 34 * sin(a);
      d.line(52, 150, 68, 150, { color: d.C.input, w: 6 });
      d.box(50, 150, 8, 80, 0, IN(d));
      d.bar(50, 150, 50, ky, { width: 7, ...IN(d) });
      d.circle(38, ky, 6, IN(d));
      d.line(38, ky, 50, ky, { color: d.C.input, w: 4 });
    },
    output: (t) => 210 + (LSc.P * LSc.psi(t)) / TAU,
  });

  // ───────────────────────────── Chain and sprockets
  const CH = (() => {
    const p = 14, z1 = 18, z2 = 12, R1 = (z1 * p) / TAU, R2 = (z2 * p) / TAU;
    const geom = (dist) => {
      const nx = (R1 - R2) / dist, ny = sqrt(1 - nx * nx), beta = Math.asin(nx);
      const S = sqrt(dist * dist - (R1 - R2) ** 2);
      return { nx, ny, S, L: 2 * S + R1 * (PI + 2 * beta) + R2 * (PI - 2 * beta) };
    };
    // choose the centre distance so the chain is a whole number of links
    const n = Math.round(geom(165).L / p);
    let lo = 140, hi = 190;
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (geom(mid).L < n * p) lo = mid; else hi = mid; }
    const dist = (lo + hi) / 2, g = geom(dist);
    const c1 = { x: 200 - dist / 2 - (R1 - R2) / 2, y: 150 }, c2 = { x: c1.x + dist, y: 150 };
    const up = atan2(-g.ny, g.nx), dn = atan2(g.ny, g.nx);
    const A1 = { x: c1.x + R1 * g.nx, y: c1.y - R1 * g.ny }, A2 = { x: c2.x + R2 * g.nx, y: c2.y - R2 * g.ny };
    const B2 = { x: c2.x + R2 * g.nx, y: c2.y + R2 * g.ny }, B1 = { x: c1.x + R1 * g.nx, y: c1.y + R1 * g.ny };
    const arc2 = R2 * (dn - up), s1 = g.S, s2 = s1 + arc2, s3 = s2 + g.S, L = n * p;
    const at = (s) => {
      s = mod(s, L);
      if (s < s1) { const f = s / g.S; return [A1.x + (A2.x - A1.x) * f, A1.y + (A2.y - A1.y) * f]; }
      if (s < s2) { const a = up + (s - s1) / R2; return [c2.x + R2 * cos(a), c2.y + R2 * sin(a)]; }
      if (s < s3) { const f = (s - s2) / g.S; return [B2.x + (B1.x - B2.x) * f, B2.y + (B1.y - B2.y) * f]; }
      const a = dn + (s - s3) / R1; return [c1.x + R1 * cos(a), c1.y + R1 * sin(a)];
    };
    return { p, z1, z2, R1, R2, n, c1, c2, at, ph1: dn - s3 / R1 - PI / z1, ph2: up - s1 / R2 - PI / z2 };
  })();
  add({
    id: 'chain-drive', title: 'Chain & sprockets', aka: ['Roller chain', 'Sprocket drive', 'Bicycle chain'],
    motion: 'rot-rot', family: 'belts',
    summary: 'A loop of linked rollers wraps toothed sprockets, carrying rotation over a distance without slipping.',
    how: [
      'Each roller drops into a gap between sprocket teeth, so unlike a belt the chain cannot slip. Both sprockets move the same number of links per second, so the speed ratio is the tooth ratio: 18 teeth drive 12, making the small sprocket turn 1.5× faster.',
      'The chain must be a whole number of links, which is why the shaft spacing is chosen carefully (or a tensioner takes up the slack).',
    ],
    key: 'Speed ratio = driver teeth ÷ driven teeth, with no slip.',
    uses: ['Bicycles', 'Motorcycles', 'Camshaft timing', 'Conveyors', 'Chainsaws'],
    related: ['belt-drive', 'spur-gears'],
    outLabel: 'Small sprocket angle',
    draw(d, t) {
      const { p, z1, z2, R1, R2, n, c1, c2, at, ph1, ph2 } = CH;
      // Sprocket: tall pointed teeth with round roller seats between them.
      const sprocket = (c, z, R, ang, o) => {
        const pa = TAU / z, pts = [];
        for (let i = 0; i < z; i++) {
          const b = ang + i * pa;
          for (const [r, f] of [[R + 6, -0.1], [R + 6, 0.1], [R - 0.5, 0.3], [R - 3.2, 0.5], [R - 0.5, 0.7]]) {
            pts.push([c.x + r * cos(b + f * pa), c.y + r * sin(b + f * pa)]);
          }
        }
        d.poly(pts, o);
        d.spokes(c.x, c.y, R - 4, ang, o);
      };
      sprocket(c1, z1, R1, t + ph1, IN(d));
      sprocket(c2, z2, R2, (t * R1) / R2 + ph2, OUT(d));
      const pts = Array.from({ length: n }, (_, k) => at(R1 * t + k * p));
      d.poly(pts, { fill: null, stroke: d.C.ink, w: 4.5 });
      d.poly(pts, { fill: null, stroke: d.C.bg, w: 1.6 });
      for (const [x, y] of pts) { d.circle(x, y, 3.1, { fill: d.C.ink, stroke: null }); d.circle(x, y, 1.2, { fill: d.C.bg, stroke: null }); }
    },
    output: (t) => t * 1.5,
  });

  // ───────────────────────────── Idler gear train
  const ID = { m: 8, z: [12, 9, 16], x: [100, 184, 284], y: 150 };
  const idAng = (t) => {
    const [z1, z2, z3] = ID.z, a2 = PI + PI / z2 - (t * z1) / z2;
    return [t, a2, PI + PI / z3 - (a2 * z2) / z3];
  };
  add({
    id: 'idler-gear', title: 'Idler gear', aka: ['Gear train', 'Intermediate gear', 'Three-gear train'],
    motion: 'rot-rot', family: 'gears',
    summary: 'A gear placed between two others keeps them turning the same way without changing the ratio.',
    how: [
      'Every external mesh reverses direction, so two meshes in a row cancel out: the first and last gears turn the same way. The idler\'s own tooth count drops out of the ratio — only the first and last gears matter (12 : 16 here).',
      'Idlers also bridge a gap between shafts that are too far apart for two gears, and a sliding idler is how many machines engage reverse.',
    ],
    key: 'The idler changes direction and spacing, never the ratio.',
    uses: ['Car reverse gear', 'Printers', 'Clockwork', 'Lathe change gears'],
    related: ['spur-gears', 'planetary'],
    outLabel: 'Output gear angle',
    draw(d, t) {
      const a = idAng(t), { m, z, x, y } = ID;
      d.gear(x[2], y, z[2], m, a[2], OUT(d));
      d.gear(x[1], y, z[1], m, a[1]);
      d.gear(x[0], y, z[0], m, a[0], IN(d));
    },
    output: (t) => idAng(t)[2],
  });

  // ───────────────────────────── Heart cam with roller follower
  const HC = (() => {
    const O = { x: 200, y: 205 }, r0 = 38, h = 48, rr = 11;
    const prof = (a) => r0 + (h * Math.abs(mod(a + PI, TAU) - PI)) / PI;
    const N = 360;
    const pts = (t) => Array.from({ length: N }, (_, i) => { const a = (i / N) * TAU; const r = prof(a); return [O.x + r * cos(a - PI / 2 + t), O.y + r * sin(a - PI / 2 + t)]; });
    const roller = (t) => {
      let y = Infinity;
      for (const [px, py] of pts(t)) { const dx = px - O.x; if (Math.abs(dx) < rr) y = Math.min(y, py - sqrt(rr * rr - dx * dx)); }
      return y;
    };
    return { O, rr, pts, roller };
  })();
  add({
    id: 'heart-cam', title: 'Heart cam', aka: ['Uniform-motion cam', 'Constant-velocity cam', 'Roller follower'],
    motion: 'rot-lin', family: 'cams',
    summary: 'A heart-shaped cam raises and lowers its follower at a perfectly steady speed.',
    how: [
      'The cam\'s radius grows by the same amount for every degree of rotation, then shrinks the same way — so the follower rises and falls at constant speed. Compare its zig-zag graph with the smooth one from the plate cam.',
      'A roller on the follower reduces friction. The catch is the sharp reversal at the top and bottom, which causes a jolt at high speed. Heart cams classically wound thread evenly onto bobbins.',
    ],
    key: 'Equal turn → equal lift: a straight-sided graph.',
    uses: ['Sewing-machine bobbin winders', 'Fishing reels', 'Stopwatch reset', 'Textile machines'],
    related: ['cam', 'eccentric'],
    outLabel: 'Follower lift',
    draw(d, t) {
      const { O, rr, pts, roller } = HC, ry = roller(t);
      d.box(181, 64, 12, 28, 0, GND(d)); d.box(219, 64, 12, 28, 0, GND(d));
      d.box(200, ry - 62, 14, 110, 0, OUT(d));
      d.box(200, ry - 8, 30, 14, 0, OUT(d));
      d.poly(pts(t), IN(d));
      d.circle(O.x + 30 * cos(t + PI / 2), O.y + 30 * sin(t + PI / 2), 2.6, { fill: d.C.input, stroke: null });
      d.circle(200, ry, rr, OUT(d)); d.pin(200, ry, 2.5);
      d.pin(O.x, O.y, 5);
    },
    output: (t) => -HC.roller(t),
  });

  // ───────────────────────────── Pantograph
  const PG = (() => {
    const O = { x: 46, y: 246 }, T0 = { x: 126, y: 196 }, k = 2.5, L = 168;
    const tracer = (t) => ({ x: T0.x + 20 * (cos(t) + 0.35 * cos(2 * t)), y: T0.y + 20 * (sin(t) - 0.35 * sin(2 * t)) });
    const at = (t) => {
      const T = tracer(t), P = { x: O.x + k * (T.x - O.x), y: O.y + k * (T.y - O.y) };
      const e1 = meet(O, L, P, L, 1), e2 = meet(O, L, P, L, -1), E = e1.y < e2.y ? e1 : e2;
      const F = { x: O.x + (E.x - O.x) / k, y: O.y + (E.y - O.y) / k }, G = { x: E.x + (P.x - E.x) / k, y: E.y + (P.y - E.y) / k };
      return { T, P, E, F, G };
    };
    const small = Array.from({ length: 120 }, (_, i) => { const T = tracer((i / 120) * TAU); return [T.x, T.y]; });
    const big = small.map(([x, y]) => [O.x + k * (x - O.x), O.y + k * (y - O.y)]);
    return { O, at, small, big };
  })();
  add({
    id: 'pantograph', title: 'Pantograph', aka: ['Copying linkage', 'Scaling linkage', 'Parallelogram linkage'],
    motion: 'lin-lin', family: 'linkages',
    summary: 'A jointed parallelogram copies whatever the tracer point draws, enlarged (or reduced) by a fixed scale.',
    how: [
      'Four bars form a parallelogram, with one corner on a fixed pivot. The pivot, the tracer and the pen always lie on one straight line, and their distances from the pivot keep a fixed ratio — 2.5× here.',
      'So any path the tracer follows is reproduced by the pen at 2.5× the size. Swap the tracer and pen and it reduces instead: engravers used this to cut tiny lettering from large templates.',
    ],
    key: 'Pen distance ÷ tracer distance from the pivot = the scale.',
    uses: ['Engraving machines', 'Copying drawings', 'Signature machines', 'Train current collectors', 'Wall-mounted lamps'],
    related: ['four-bar', 'trammel'],
    outLabel: 'Pen height',
    draw(d, t) {
      const { O, at, small, big } = PG, { T, P, E, F, G } = at(t);
      d.poly(small, { fill: null, stroke: d.C.input, w: 1, dash: [3, 3] });
      d.poly(big, { fill: null, stroke: d.C.output, w: 1.2, dash: [4, 4] });
      d.line(O.x, O.y, P.x, P.y, { color: d.C.muted, w: 0.8, dash: [2, 5] });
      d.bar(O.x, O.y, E.x, E.y, { width: 9 }); d.bar(E.x, E.y, P.x, P.y, { width: 9 });
      d.bar(F.x, F.y, T.x, T.y, { width: 9 }); d.bar(G.x, G.y, T.x, T.y, { width: 9 });
      d.ground(O.x, O.y);
      for (const q of [E, F, G]) d.pin(q.x, q.y);
      d.circle(T.x, T.y, 5, { fill: d.C.input, stroke: null });
      d.circle(P.x, P.y, 5, { fill: d.C.output, stroke: null });
    },
    output: (t) => -PG.at(t).P.y,
  });

  // ───────────────────────────── Block and tackle
  const BT = (t) => { const dd = 30 * (1 - cos(t)); return { dd, ym: 200 - dd, yh: 120 + 2 * dd }; };
  add({
    id: 'block-tackle', title: 'Block & tackle', aka: ['Pulley system', 'Movable pulley', 'Rope and pulleys'],
    motion: 'lin-lin', family: 'belts',
    summary: 'A rope running through a fixed and a movable pulley halves the effort needed to lift a load.',
    how: [
      'The load hangs from the movable pulley, which is held up by two strands of rope. Each strand carries half the weight, so you pull with half the force.',
      'The price is distance: to raise the load by one unit, both strands must shorten, so you pull twice as much rope. The fixed pulley only changes the direction of the pull. More pulleys mean more strands and more advantage.',
    ],
    key: 'Mechanical advantage = number of strands supporting the load.',
    uses: ['Cranes', 'Sailing rigs', 'Elevators', 'Rock climbing hauls', 'Garage hoists'],
    related: ['belt-drive', 'toggle'],
    outLabel: 'Load height',
    draw(d, t) {
      const { dd, ym, yh } = BT(t), r = 26, fx = 202, fy = 62, mx = 150;
      d.hatch(90, 22, 160, -1);
      d.line(fx, 22, fx, fy, { color: d.C.ground, w: 3 });
      d.line(mx, ym, mx, ym + 40, { color: d.C.ink, w: 2 });
      d.box(mx, ym + 56, 56, 34, 0, OUT(d));
      pulley(d, { x: mx, y: ym }, r, dd / r, GND(d));
      pulley(d, { x: fx, y: fy }, r, (2 * dd) / r, GND(d));
      const ctx = d.ctx;
      ctx.beginPath();
      ctx.moveTo(mx - r, 22); ctx.lineTo(mx - r, ym);
      ctx.arc(mx, ym, r, PI, 0, true);
      ctx.lineTo(fx - r, fy);
      ctx.arc(fx, fy, r, PI, TAU);
      ctx.lineTo(fx + r, yh);
      d.paint({ stroke: d.C.ink, w: 2.5 });
      d.box(fx + r, yh + 12, 16, 26, 0, IN(d));
      d.pin(mx, ym); d.pin(fx, fy);
    },
    output: (t) => BT(t).dd,
  });

  // ───────────────────────────── Peaucellier–Lipkin linkage
  const PLK = (() => {
    const O = { x: 100, y: 150 }, Q = { x: 150, y: 150 }, r = 50, L = 150, s = 60;
    const at = (t) => {
      const f = 0.8 * sin(t), A = { x: Q.x + r * cos(f), y: Q.y + r * sin(f) };
      const dA = (A.x - O.x) ** 2 + (A.y - O.y) ** 2, k = (L * L - s * s) / dA;
      return { A, B: meet(O, L, A, s, 1), C: meet(O, L, A, s, -1), P: { x: O.x + k * (A.x - O.x), y: O.y + k * (A.y - O.y) } };
    };
    return { O, Q, at, lineX: O.x + (L * L - s * s) / (2 * r) };
  })();
  add({
    id: 'peaucellier', title: 'Peaucellier–Lipkin linkage', aka: ['Peaucellier cell', 'Inversor', 'Exact straight-line linkage'],
    motion: 'osc-lin', family: 'linkages',
    summary: 'Seven bars and pivots only — yet one point moves in a mathematically perfect straight line.',
    how: [
      'Two long bars and a diamond of four short bars form an "inversor": the diamond\'s far corner always sits at a distance inversely proportional to its near corner\'s distance from the fixed pivot.',
      'Geometry says that inverting a circle that passes through the pivot gives a straight line. So driving the near corner around such a circle (with the orange crank) sends the far corner along an exact straight line. Discovered in 1864, it was the first linkage to do this without guides.',
    ],
    key: 'Inversion turns a circle through the pivot into a straight line.',
    uses: ['Early steam-engine guides', 'Precision instruments', 'Teaching geometry', 'Ventilation fans (historic)'],
    related: ['watt-linkage', 'chebyshev', 'cardan-gears'],
    outLabel: 'Point position',
    draw(d, t) {
      const { O, Q, at, lineX } = PLK, { A, B, C, P } = at(t);
      d.line(lineX, 30, lineX, 270, { color: d.C.output, w: 1.2, dash: [4, 4] });
      d.bar(O.x, O.y, B.x, B.y, { width: 8 }); d.bar(O.x, O.y, C.x, C.y, { width: 8 });
      for (const [p1, p2] of [[A, B], [A, C], [B, P], [C, P]]) d.bar(p1.x, p1.y, p2.x, p2.y, { width: 8 });
      d.bar(Q.x, Q.y, A.x, A.y, { width: 10, ...IN(d) });
      d.ground(O.x, O.y); d.ground(Q.x, Q.y);
      for (const q of [A, B, C]) d.pin(q.x, q.y);
      d.circle(P.x, P.y, 5, { fill: d.C.output, stroke: null });
    },
    output: (t) => -PLK.at(t).P.y,
  });

  // ───────────────────────────── Chebyshev lambda linkage
  const CB = (() => {
    // Unit design: ground 2, crank 1, rocker 2.5, coupler 5 with the rocker at its midpoint.
    const raw = (t) => {
      const A = { x: 0, y: 0 }, B = { x: 2, y: 0 }, C = { x: cos(t), y: sin(t) };
      const D = meet(C, 2.5, B, 2.5, -1);
      return { A, B, C, D, P: { x: 2 * D.x - C.x, y: 2 * D.y - C.y } };
    };
    const samples = Array.from({ length: 180 }, (_, i) => raw((i / 180) * TAU));
    const xs = samples.flatMap((s) => [s.A.x, s.B.x, s.C.x, s.D.x, s.P.x]), ys = samples.flatMap((s) => [s.A.y, s.B.y, s.C.y, s.D.y, s.P.y]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const S = Math.min(340 / (x1 - x0), 240 / (y1 - y0));
    const tf = (p) => ({ x: 200 + (p.x - (x0 + x1) / 2) * S, y: 150 + (p.y - (y0 + y1) / 2) * S });
    const at = (t) => { const r = raw(t); return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, tf(v)])); };
    const trace = samples.map((s) => { const p = tf(s.P); return [p.x, p.y]; });
    return { at, trace };
  })();
  add({
    id: 'chebyshev', title: 'Chebyshev lambda', aka: ['Lambda linkage', 'Chebyshev linkage', 'Walking linkage'],
    motion: 'rot-lin', family: 'linkages',
    summary: 'A four-bar linkage whose long coupler tip runs along a near-straight line for half the cycle, then lifts and returns.',
    how: [
      'The crank turns fully; the rocker is pinned to the middle of the long coupler. For about half of every turn the coupler\'s tip travels along an almost perfectly straight, almost constant-speed line, then it swings up and back in a loop.',
      'That D-shaped path is exactly what a walking leg needs: a flat stride on the ground and a lifted return. Pafnuty Chebyshev used it in his 1878 "plantigrade machine", one of the first walking robots.',
    ],
    key: 'Flat stride, lifted return — a leg from one rotation.',
    uses: ['Walking robots', 'Strandbeest-style toys', 'Film advance mechanisms', 'Conveyor pushers'],
    related: ['four-bar', 'peaucellier', 'watt-linkage'],
    outLabel: 'Tip height',
    draw(d, t) {
      const { at, trace } = CB, { A, B, C, D, P } = at(t);
      d.poly(trace, { fill: null, stroke: d.C.output, w: 1.2, dash: [4, 4] });
      d.bar(B.x, B.y, D.x, D.y, { width: 10 });
      d.bar(C.x, C.y, P.x, P.y, { width: 10, ...OUT(d) });
      d.bar(A.x, A.y, C.x, C.y, { width: 11, ...IN(d) });
      d.ground(A.x, A.y); d.ground(B.x, B.y);
      d.pin(C.x, C.y); d.pin(D.x, D.y);
      d.circle(P.x, P.y, 5, { fill: d.C.output, stroke: null });
    },
    output: (t) => -CB.at(t).P.y,
  });

  window.Movements = { list: M, byId: Object.fromEntries(M.map((m) => [m.id, m])), MOTION, FAMILY };
})();

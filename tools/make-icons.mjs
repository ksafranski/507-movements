// Generates the logo mark and app icons as SVG.
//   node tools/make-icons.mjs
// Two meshing spur gears: orange driver, blue driven — the site's input/output colours.
import { writeFileSync, mkdirSync } from 'node:fs';

const TAU = Math.PI * 2;
const C = { bg: '#18181a', input: '#ff8c52', output: '#6aa8ff', inputLight: '#d24a12', outputLight: '#1f63c2' };
const f = (n) => +n.toFixed(2);

// Gear outline + holes as one even-odd path (holes are transparent).
function gearPath(cx, cy, z, m, ang, holes) {
  // Chunkier than the site's diagram gears so it reads at favicon size.
  const rp = (m * z) / 2, ra = rp + 0.8 * m, rd = rp - 0.9 * m, p = TAU / z;
  const pts = [];
  for (let i = 0; i < z; i++) {
    const b = ang + i * p;
    for (const [r, k] of [[rd, -0.5], [rd, -0.33], [ra, -0.15], [ra, 0.15], [rd, 0.33]]) {
      pts.push([cx + r * Math.cos(b + k * p), cy + r * Math.sin(b + k * p)]);
    }
  }
  let d = `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`;
  const circle = (x, y, r) => `M${f(x - r)} ${f(y)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
  d += circle(cx, cy, rp * (holes > 1 ? 0.17 : 0.24));
  for (let i = 0; i < holes; i++) {
    const a = ang + Math.PI / holes + (i * TAU) / holes;
    d += circle(cx + rp * 0.55 * Math.cos(a), cy + rp * 0.55 * Math.sin(a), rp * 0.15);
  }
  return { d, ra };
}

// Lay out the pair around the origin, centred on its bounding box.
function pair(m) {
  const z1 = 8, z2 = 12, dir = (-35 * Math.PI) / 180, a = 0.12;
  const dist = (m * (z1 + z2)) / 2;
  const c1 = { x: 0, y: 0 }, c2 = { x: dist * Math.cos(dir), y: dist * Math.sin(dir) };
  const r1 = m * z1 / 2 + 0.8 * m, r2 = m * z2 / 2 + 0.8 * m;
  const minX = Math.min(c1.x - r1, c2.x - r2), maxX = Math.max(c1.x + r1, c2.x + r2);
  const minY = Math.min(c1.y - r1, c2.y - r2), maxY = Math.max(c1.y + r1, c2.y + r2);
  const ox = -(minX + maxX) / 2, oy = -(minY + maxY) / 2;
  const g1 = gearPath(c1.x + ox, c1.y + oy, z1, m, dir + a, 0);
  const g2 = gearPath(c2.x + ox, c2.y + oy, z2, m, dir + Math.PI + Math.PI / z2 - (a * z1) / z2, 5);
  return { g1, g2, w: maxX - minX, h: maxY - minY };
}

const out = new URL('../icons/', import.meta.url);
mkdirSync(out, { recursive: true });
const write = (name, svg) => writeFileSync(new URL(name, out), svg.trim() + '\n');

// App icons (512 grid). Maskable keeps everything inside the 80% safe circle.
const icon = ({ rounded, m }) => {
  const { g1, g2 } = pair(m);
  const bg = rounded ? `<rect width="512" height="512" rx="112" fill="${C.bg}"/>` : `<rect width="512" height="512" fill="${C.bg}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${bg}
<g transform="translate(256 256)" fill-rule="evenodd"><path fill="${C.output}" d="${g2.d}"/><path fill="${C.input}" d="${g1.d}"/></g></svg>`;
};
write('icon.svg', icon({ rounded: true, m: 18.5 }));
write('icon-maskable.svg', icon({ rounded: false, m: 15.5 }));

// Transparent logo mark, coloured for light or dark backgrounds.
const mark = (light) => {
  const { g1, g2, w, h } = pair(12);
  const pad = 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(-w / 2 - pad)} ${f(-h / 2 - pad)} ${f(w + 2 * pad)} ${f(h + 2 * pad)}" fill-rule="evenodd">
<path fill="${light ? C.outputLight : C.output}" d="${g2.d}"/><path fill="${light ? C.inputLight : C.input}" d="${g1.d}"/></svg>`;
};
write('mark-light.svg', mark(true));
write('mark-dark.svg', mark(false));

// Inline mark for the site header: colours come from CSS variables.
const { g1, g2, w, h } = pair(12);
const inline = `<svg class="logo-mark" viewBox="${f(-w / 2 - 2)} ${f(-h / 2 - 2)} ${f(w + 4)} ${f(h + 4)}" fill-rule="evenodd" aria-hidden="true"><path class="o" d="${g2.d}"/><path class="i" d="${g1.d}"/></svg>`;
write('mark-inline.svg.txt', inline);

// Horizontal lockup for sharing / docs.
const lockup = (light) => {
  const ink = light ? '#1d1d1f' : '#ebeae6', muted = light ? '#6e6d6a' : '#98968f';
  const s = 120 / (h + 4);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 140">
<g transform="translate(${f(10 + ((w + 4) * s) / 2)} 70) scale(${f(s)})" fill-rule="evenodd"><path fill="${light ? C.outputLight : C.output}" d="${g2.d}"/><path fill="${light ? C.inputLight : C.input}" d="${g1.d}"/></g>
<text x="${f(30 + (w + 4) * s)}" y="84" font-family="'Instrument Serif', Georgia, serif" font-size="76" fill="${ink}">507</text>
<text x="${f(32 + (w + 4) * s)}" y="112" font-family="Inter, system-ui, sans-serif" font-size="17" font-weight="500" letter-spacing="2.4" fill="${muted}">MECHANICAL MOVEMENTS</text></svg>`;
};
write('logo-light.svg', lockup(true));
write('logo-dark.svg', lockup(false));
console.log('icons written to', out.pathname);

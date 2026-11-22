# 507 Mechanical Movements

An animated, searchable companion to Henry T. Brown's 1868 classic *507 Mechanical Movements*. Each mechanism is a live, geometrically accurate animation with a plain-English explanation, a motion graph, and where you'll find it in everyday machines.

Plain HTML, CSS and JavaScript. No build step, no dependencies. Installable as a PWA and works offline.

## Run locally

```bash
python3 -m http.server 5173
```

Then open http://localhost:5173. (Opening `index.html` directly also works, minus the service worker.)

## Structure

| Path | What it is |
|---|---|
| `js/movements.js` | The catalog: each movement's text plus `draw(d, t)` and `output(t)` |
| `js/draw.js` | Small 2D drawing kit (gears, links, sliders, ground pivots) in a 400×300 space |
| `js/search.js` | Search: field-weighted word-prefix matching, synonyms, typo correction, `field:` and `/regex/` queries |
| `js/app.js` | Grid, filters, typeahead, detail view, animation loop, service-worker registration |
| `sw.js` | Service worker — bump `VERSION` when shipping changes |
| `tools/make-icons.mjs` | Regenerates the logo and icon SVGs (`node tools/make-icons.mjs`) |

## Adding a movement

Add an entry with `add({...})` in `js/movements.js`. `draw(d, t)` renders the mechanism at driver angle `t`; use `IN(d)` for the driving part, `OUT(d)` for the driven part. `output(t)` returns one number for the motion graph.

## Deploy

Static site — on Vercel, import the repo with framework preset **Other**, no build command, output directory `.` (root). `vercel.json` sets the service-worker and manifest headers.

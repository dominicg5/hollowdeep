
/* =====================================================================
   RIM CITY — painted art: sprite atlases, ground textures, the Hollow
   Assets live in assets/ (WebP). If they fail to load, the map falls
   back to the procedural painter.
   ===================================================================== */
const ART = { ok: false, ready: false, failed: false, atlas: [], tex: {}, mips: {}, pats: {}, hollow: null, sil: {}, progress: 0 };
const ART_BASE = 'assets/';
const CROPS = ['wheat', 'cabbage', 'pumpkin', 'lavender', 'corn', 'vines', 'furrows', 'sunflower'];
const TEX_KEYS = ['grass', 'sand', 'rock', 'forest', 'crystal', 'farm', 'badlands', 'moss', 'orchard', 'water', 'chasm', 'cobble', 'dirt', 'wall', 'cliff'].concat(CROPS);
// world units covered by one 512px texture tile
const TEX_WORLD = { grass: 190, sand: 240, rock: 230, forest: 200, crystal: 210, farm: 560, badlands: 230, moss: 210, orchard: 200, water: 320, chasm: 150, cobble: 64, dirt: 120, wall: 640, cliff: 70, wheat: 70, cabbage: 60, pumpkin: 70, lavender: 60, corn: 70, vines: 70, furrows: 70, sunflower: 60 };
const REGION_TEX = { docks: 'grass', dunes: 'sand', bluffs: 'rock', wood: 'forest', crystal: 'crystal', farms: 'grass', badlands: 'badlands', moss: 'moss', amber: 'orchard' };
const REGION_BLD = { docks: 'b_lake', dunes: 'b_sand', bluffs: 'b_cliff', wood: 'b_forest', crystal: 'b_crystal', farms: 'b_farm', badlands: 'b_forge', moss: 'b_garden', amber: 'b_orchard' };

function loadArt(onProgress, onDone) {
  if (ART.loading) return; ART.loading = true;
  const v = (typeof ART_MANIFEST !== 'undefined' && ART_MANIFEST.v) || 1;
  const jobs = [];
  const load = (src) => new Promise((res) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => res(null); im.src = ART_BASE + src + '?v=' + v; });
  let done = 0; const total = (ART_MANIFEST.atlases || 0) + TEX_KEYS.length + 1;
  const tick = (p) => p.then((im) => { done++; ART.progress = done / total; if (onProgress) onProgress(ART.progress); return im; });
  for (let i = 0; i < ART_MANIFEST.atlases; i++) jobs.push(tick(load('atlas' + i + '.webp')).then((im) => { ART.atlas[i] = im; }));
  for (const k of TEX_KEYS) jobs.push(tick(load('t_' + k + '.webp')).then((im) => { ART.tex[k] = im; }));
  jobs.push(tick(load('hollow.webp')).then((im) => { ART.hollow = im; }));
  Promise.all(jobs).then(() => {
    ART.ok = ART.atlas.length === ART_MANIFEST.atlases && ART.atlas.every(Boolean) && TEX_KEYS.every((k) => ART.tex[k]) && !!ART.hollow;
    ART.failed = !ART.ok; ART.ready = true;
    if (ART.ok) { try { buildMips(); buildSilhouettes(); } catch (e) { console.warn('art prep failed', e); ART.ok = false; } }
    if (onDone) onDone(ART.ok);
  });
}
function buildMips() {
  for (const k of TEX_KEYS) {
    const list = []; let src = ART.tex[k], size = src.width;
    const c0 = document.createElement('canvas'); c0.width = c0.height = size; c0.getContext('2d').drawImage(src, 0, 0); list.push(c0); src = c0;
    while (size > 16) { size >>= 1; const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, size, size); list.push(c); src = c; }
    ART.mips[k] = list;
  }
}
// black silhouettes (for sky-fish ground shadows)
function buildSilhouettes() {
  for (const n of ['skyfish_0', 'skyfish_1', 'skyfish_2', 'skyfish_3', 'skyfish_4', 'skyfish_5', 'creatures_1']) {
    const e = ART_MANIFEST.s[n]; if (!e) continue; const c = document.createElement('canvas'); c.width = e[3]; c.height = e[4]; const g = c.getContext('2d');
    g.drawImage(ART.atlas[e[0]], e[1], e[2], e[3], e[4], 0, 0, e[3], e[4]); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#000'; g.fillRect(0, 0, e[3], e[4]); ART.sil[n] = c;
  }
}
const artScratch = { c: null, g: null };
function scratch(n) { if (!artScratch.c || artScratch.c.width !== n) { artScratch.c = document.createElement('canvas'); artScratch.c.width = artScratch.c.height = n; artScratch.g = artScratch.c.getContext('2d'); } return artScratch.g; }
// a texture pattern whose texel density suits device scale s (device px per world unit)
function texPattern(g, key, s, ws) {
  const mips = ART.mips[key], worldSz = ws || TEX_WORLD[key];
  const want = worldSz * s; let i = 0; while (i < mips.length - 1 && mips[i + 1].width >= want) i++;
  const img = mips[i], id = key + ':' + i;
  let p = ART.pats[id]; if (!p) { p = g.createPattern(img, 'repeat'); ART.pats[id] = p; }
  p.setTransform(new DOMMatrix().scale(worldSz / img.width));
  return p;
}
function sprE(name) { return ART_MANIFEST.s[name]; }
// draw a sprite: (x,y) = ground anchor in world units, w = world width, anchor fractions ax/ay
function drawSprite(c, name, x, y, w, ax, ay, flip, alpha) {
  const e = ART_MANIFEST.s[name]; if (!e) return 0; const h = w * e[4] / e[3];
  const dx = x - w * (ax == null ? 0.5 : ax), dy = y - h * (ay == null ? 0.85 : ay);
  if (alpha != null) c.globalAlpha = alpha;
  if (flip) { c.save(); c.translate(x, 0); c.scale(-1, 1); c.drawImage(ART.atlas[e[0]], e[1], e[2], e[3], e[4], -(w * (ax == null ? 0.5 : ax)), dy, w, h); c.restore(); }
  else c.drawImage(ART.atlas[e[0]], e[1], e[2], e[3], e[4], dx, dy, w, h);
  if (alpha != null) c.globalAlpha = 1;
  return h;
}
// soft contact shadow (light from top-left, so shadows fall bottom-right)
let shadowImg = null;
function softShadow(c, x, y, rx, ry, a) {
  if (!shadowImg) { shadowImg = document.createElement('canvas'); shadowImg.width = shadowImg.height = 64; const g = shadowImg.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(18,14,10,.55)'); gr.addColorStop(0.55, 'rgba(18,14,10,.32)'); gr.addColorStop(1, 'rgba(18,14,10,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
  c.globalAlpha = a == null ? 1 : a; c.drawImage(shadowImg, x - rx, y - ry, rx * 2, ry * 2); c.globalAlpha = 1;
}
const pickOf = (arr, seed) => arr[Math.floor(seed * 9973) % arr.length];

/* ---------- terrain: blended region textures per tile ---------- */
const TG = 17; const maskCv = document.createElement('canvas'); maskCv.width = maskCv.height = TG; const maskCtx = maskCv.getContext('2d'); const maskImg = maskCtx.createImageData(TG, TG);
const smooth01 = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function terrainWeights(x, y, out) {
  const f = regionF(x, y), i = Math.floor(f) % NREG, fr = f - Math.floor(f), edge = 0.12;
  let wi = 1, wn = 0, n = -1;
  if (fr > 1 - edge) { n = (i + 1) % NREG; wn = smooth01(1 - edge, 1 + edge, fr) ; wi = 1 - wn; }
  else if (fr < edge) { n = (i + NREG - 1) % NREG; wn = 1 - smooth01(-edge, edge, fr); wi = 1 - wn; }
  const add = (k, w) => { if (w > 0) out[k] = (out[k] || 0) + w; };
  const put = (ri, w) => {
    const key = REGIONS[ri].key, tk = REGION_TEX[key];
    if (key === 'farms') { const m = smooth01(0.42, 0.58, vnoise(x / 260 + 7, y / 260)); add('farm', w * m); add('grass', w * (1 - m)); }
    else if (key === 'wood') { const m = smooth01(0.5, 0.75, vnoise(x / 180, y / 180 + 3)); add('grass', w * m * 0.7); add('forest', w * (1 - m * 0.7)); }
    else if (key === 'moss') { const m = smooth01(0.55, 0.8, vnoise(x / 200 + 2, y / 200)); add('grass', w * m * 0.6); add('moss', w * (1 - m * 0.6)); }
    else if (key === 'bluffs') { const m = smooth01(0.45, 0.7, vnoise(x / 160 + 4, y / 160)); add('grass', w * m * 0.55); add('rock', w * (1 - m * 0.55)); }
    else add(tk, w);
  };
  put(i, wi); if (n >= 0) put(n, wn);
  // sandy-dirt lip around the Hollow and along cracks
  const hd = hollowDist(x, y); const lip = clamp(1 - hd / 150, 0, 1) * 0.75;
  if (lip > 0) { for (const k in out) out[k] *= (1 - lip); add('dirt', lip); }
  return out;
}
/* World-anchored terrain maps: weights are sampled ONCE on a fixed world grid, so every zoom level and
   every tile blends regions identically (no borders shifting or textures popping while zooming). */
const TMAP = { G: 32, n: 0, RW: 0, keys: ['grass', 'farm', 'forest', 'moss', 'rock', 'sand', 'badlands', 'crystal', 'orchard', 'dirt'], w: {}, mask: {}, macro: null, fog: null };
function buildTerrainMaps() {
  const G = TMAP.G, RW = CITY.R + 640, n = Math.ceil((2 * RW) / G) + 1; TMAP.n = n; TMAP.RW = RW;
  for (const k of TMAP.keys) TMAP.w[k] = new Float32Array(n * n);
  const o = {};
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { for (const k in o) delete o[k]; const x = -RW + i * G, y = -RW + j * G; terrainWeights(x, y, o); let sum = 0; for (const k in o) sum += o[k]; for (const k in o) if (TMAP.w[k]) TMAP.w[k][j * n + i] = o[k] / (sum || 1); }
  const mk = () => { const cv = document.createElement('canvas'); cv.width = cv.height = n; return cv; };
  // sequential "over" compositing in a fixed order reproduces the normalized blend exactly: alpha_k = w_k / sum(w_0..w_k)
  const cum = new Float32Array(n * n);
  for (const k of TMAP.keys) { const W8 = TMAP.w[k]; let any = false; for (let q = 0; q < n * n; q++) if (W8[q] > 0.003) { any = true; break; } if (!any) { TMAP.w[k] = null; continue; }
    const cv = mk(), g = cv.getContext('2d'), im = g.createImageData(n, n);
    for (let q = 0; q < n * n; q++) { cum[q] += W8[q]; const a = cum[q] > 1e-4 ? W8[q] / cum[q] : 0; const o4 = q * 4; im.data[o4] = im.data[o4 + 1] = im.data[o4 + 2] = 255; im.data[o4 + 3] = Math.round(clamp(a, 0, 1) * 255); }
    g.putImageData(im, 0, 0); TMAP.mask[k] = cv; }
  // macro light/dark variation + fog beyond the rim
  const mc = mk(), mg = mc.getContext('2d'), mi = mg.createImageData(n, n), fc = mk(), fg = fc.getContext('2d'), fi = fg.createImageData(n, n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x = -RW + i * G, y = -RW + j * G, q = (j * n + i) * 4;
    const v = Math.round(clamp(0.78 + vnoise(x / 520, y / 520) * 0.16 + vnoise(x / 150 + 3, y / 150) * 0.08, 0, 1) * 255); mi.data[q] = mi.data[q + 1] = mi.data[q + 2] = v; mi.data[q + 3] = 255;
    fi.data[q] = FOG[0]; fi.data[q + 1] = FOG[1]; fi.data[q + 2] = FOG[2]; fi.data[q + 3] = Math.round(clamp((Math.hypot(x, y) - (CITY.R - 250)) / 480, 0, 1) * 255); }
  mg.putImageData(mi, 0, 0); fg.putImageData(fi, 0, 0); TMAP.macro = mc; TMAP.fog = fc; TMAP.world = W;
}
// draw the part of a world-grid map covering [x0,x1]x[y0,y1] (with margin so bilinear edges stay off-tile)
function drawMap(g, cv, x0, y0, x1, y1) {
  const G = TMAP.G, RW = TMAP.RW, n = TMAP.n;
  const i0 = clamp(Math.floor((x0 + RW) / G) - 2, 0, n - 1), j0 = clamp(Math.floor((y0 + RW) / G) - 2, 0, n - 1), i1 = clamp(Math.ceil((x1 + RW) / G) + 2, 0, n - 1), j1 = clamp(Math.ceil((y1 + RW) / G) + 2, 0, n - 1);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(cv, i0, j0, i1 - i0 + 1, j1 - j0 + 1, -RW + i0 * G - G / 2, -RW + j0 * G - G / 2, (i1 - i0 + 1) * G, (j1 - j0 + 1) * G);
}
function mapAny(k, x0, y0, x1, y1) {
  const Wk = TMAP.w[k]; if (!Wk) return false; const G = TMAP.G, RW = TMAP.RW, n = TMAP.n;
  const i0 = clamp(Math.floor((x0 + RW) / G) - 1, 0, n - 1), j0 = clamp(Math.floor((y0 + RW) / G) - 1, 0, n - 1), i1 = clamp(Math.ceil((x1 + RW) / G) + 1, 0, n - 1), j1 = clamp(Math.ceil((y1 + RW) / G) + 1, 0, n - 1);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (Wk[j * n + i] > 0.003) return true; return false;
}
function drawTerrain(c, x0, y0, x1, y1, s) {
  if (TMAP.world !== W) buildTerrainMaps();
  const ws = x1 - x0, N = c.canvas.width, T = c.getTransform();
  c.fillStyle = texPattern(c, 'grass', s); c.fillRect(x0, y0, ws, ws);
  const g = scratch(N);
  for (const k of TMAP.keys) {
    if (!TMAP.mask[k] || !mapAny(k, x0, y0, x1, y1)) continue;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, N, N);
    g.setTransform(T); g.fillStyle = texPattern(g, k, s); g.fillRect(x0, y0, ws, ws);
    g.globalCompositeOperation = 'destination-in'; drawMap(g, TMAP.mask[k], x0, y0, x1, y1); g.globalCompositeOperation = 'source-over';
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(g.canvas, 0, 0); c.restore();
  }
  c.globalCompositeOperation = 'multiply'; drawMap(c, TMAP.macro, x0, y0, x1, y1); c.globalCompositeOperation = 'source-over';
  const rMax = Math.hypot(Math.max(Math.abs(x0), Math.abs(x1)), Math.max(Math.abs(y0), Math.abs(y1)));
  if (rMax > CITY.R - 260) drawMap(c, TMAP.fog, x0, y0, x1, y1);
}

/* ---------- water, the Hollow, cracks, roads (textured) ---------- */
function artWater(c, x0, y0, x1, y1, s) {
  const L = W.lake;
  if (boxHit([L.x - 460, L.y - 460, L.x + 460, L.y + 460], x0, y0, x1, y1)) {
    pathPoly(c, W.lakePts); c.save(); c.lineJoin = 'round'; c.lineWidth = 30; c.strokeStyle = texPattern(c, 'sand', s); c.stroke(); c.lineWidth = 12; c.strokeStyle = 'rgba(120,100,60,.25)'; c.stroke(); c.restore();
    c.fillStyle = texPattern(c, 'water', s); c.fill();
    const g = c.createRadialGradient(L.x, L.y, 20, L.x, L.y, L.r * 1.25); g.addColorStop(0, 'rgba(10,40,70,.45)'); g.addColorStop(0.65, 'rgba(10,50,80,.15)'); g.addColorStop(1, 'rgba(160,220,210,.25)');
    c.fillStyle = g; c.fill(); c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 2.5; c.stroke();
  }
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = texPattern(c, 'sand', s); c.lineWidth = 60; polyStroke(c, W.river);
  c.strokeStyle = 'rgba(90,70,40,.25)'; c.lineWidth = 46; polyStroke(c, W.river);
  c.strokeStyle = texPattern(c, 'water', s); c.lineWidth = 42; polyStroke(c, W.river);
  c.strokeStyle = 'rgba(200,240,255,.22)'; c.lineWidth = 14; polyStroke(c, W.river);
}
// wall details (camps, scaffolds, roots, fungus shelves, cave mouths, crystal veins, mossy trickles) placed on the
// terraces; mostly on the north wall, which faces the camera in this 3/4 view
let HOLLOW_BITS = null;
function hollowBits() {
  if (HOLLOW_BITS && HOLLOW_BITS.w === W) return HOLLOW_BITS.list;
  const rr = mulberry32(4242), list = [];
  for (let i = 0; i < 70; i++) {
    const north = rr() < 0.78, a = north ? Math.PI * (1.08 + rr() * 0.84) : rr() * Math.PI, f = 0.5 + rr() * 0.42, k = rr();
    const kind = k < 0.16 ? 0 : k < 0.3 ? 1 : k < 0.46 ? 3 : k < 0.56 ? 6 : k < 0.68 ? 7 : k < 0.8 ? 8 : 5;
    const R = hollowR(a) * f; list.push({ x: Math.cos(a) * R, y: Math.sin(a) * R, f, spr: 'hollow_bits_' + kind, w: (34 + rr() * 22) * (0.45 + f * 0.6), flip: rr() < 0.5 });
  }
  for (let i = 0; i < 26; i++) { const a = Math.PI * (1.05 + rr() * 0.9), R = hollowR(a) * (0.965 + rr() * 0.02); list.push({ x: Math.cos(a) * R, y: Math.sin(a) * R, f: 0.99, spr: 'hollow_bits_2', w: 30 + rr() * 26, flip: rr() < 0.5, hang: true }); }
  list.sort((p, q) => p.y - q.y); HOLLOW_BITS = { w: W, list }; return list;
}
function artHollow(c, s, bx0, by0, bx1, by1) {
  if (bx0 == null) { bx0 = by0 = -1e9; bx1 = by1 = 1e9; }
  const inB = (x, y, m) => x > bx0 - m && x < bx1 + m && y > by0 - m && y < by1 + m;
  let mr = 0; for (const p of W.hollowPts) mr = Math.max(mr, Math.hypot(p[0], p[1]));
  c.save();
  // rocky rim
  pathPoly(c, W.hollowPts.map((p) => [p[0] * 1.035, p[1] * 1.035])); c.fillStyle = texPattern(c, 'rock', s); c.fill();
  c.strokeStyle = 'rgba(60,50,40,.35)'; c.lineWidth = 6; c.stroke();
  pathPoly(c, W.hollowPts); c.clip();
  const R = mr * 1.06; c.imageSmoothingEnabled = true; c.drawImage(ART.hollow, -R, -R + 18, R * 2, R * 2);
  // terraced walls: the wall texture wrapped around the pit so its ledges run as concentric terraces that follow the rim
  const N = c.canvas.width, T = c.getTransform(), g = scratch(N);
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, N, N); g.setTransform(T);
  const mips = ART.mips.wall, want = TEX_WORLD.wall * s; let mi = 0; while (mi < mips.length - 1 && mips[mi + 1].width >= want) mi++;
  const img = mips[mi], pat = g.createPattern(img, 'repeat'), NW = 128;
  for (let i = 0; i < NW; i++) {
    const a0 = (i / NW) * TAU, a1 = ((i + 1) / NW) * TAU, am = (a0 + a1) / 2, hr = hollowR(am), k = hr / CITY.hollowR, sc = TEX_WORLD.wall / img.width;
    { const pm = polar(hollowR(am) * 0.68, am), half = hollowR(am) * 0.36 + 40; if (!inB(pm[0], pm[1], half)) continue; }
    pat.setTransform(new DOMMatrix().rotate(((am + Math.PI / 2) * 180) / Math.PI).scale(sc, sc * k).translate((-am * CITY.hollowR * 0.75) / sc, 0));
    g.fillStyle = pat; g.beginPath(); const o0 = polar(hollowR(a0) * 1.01 + 3, a0 - 0.004), o1 = polar(hollowR(a1) * 1.01 + 3, a1 + 0.004), i1 = polar(hollowR(a1) * 0.36, a1 + 0.004), i0 = polar(hollowR(a0) * 0.36, a0 - 0.004);
    g.moveTo(o0[0], o0[1]); g.lineTo(o1[0], o1[1]); g.lineTo(i1[0], i1[1]); g.lineTo(i0[0], i0[1]); g.closePath(); g.fill();
  }
  // light from the top-left: the north wall faces us and catches light, the south wall falls into shadow
  g.globalCompositeOperation = 'source-atop';
  let lg = g.createLinearGradient(-mr * 0.6, -mr, mr * 0.4, mr); lg.addColorStop(0, 'rgba(255,226,170,.16)'); lg.addColorStop(0.45, 'rgba(255,226,170,0)'); lg.addColorStop(0.75, 'rgba(10,14,30,.25)'); lg.addColorStop(1, 'rgba(6,8,22,.6)'); g.fillStyle = lg; g.fillRect(-mr, -mr, mr * 2, mr * 2);
  // depth: deeper terraces sink into blue haze
  let dg = g.createRadialGradient(0, 30, mr * 0.3, 0, 0, mr); dg.addColorStop(0, 'rgba(14,20,46,.8)'); dg.addColorStop(0.4, 'rgba(18,26,56,.35)'); dg.addColorStop(0.75, 'rgba(18,24,40,0)'); dg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = dg; g.fillRect(-mr, -mr, mr * 2, mr * 2);
  // fade the terraces out toward the glowing core so the painted depths show through
  g.globalCompositeOperation = 'destination-in';
  const fg = g.createRadialGradient(0, 30, mr * 0.34, 0, 20, mr * 0.62); fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(1, 'rgba(0,0,0,0.92)'); g.fillStyle = fg; g.fillRect(-mr * 1.1, -mr * 1.1, mr * 2.2, mr * 2.2);
  g.globalCompositeOperation = 'source-over';
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.filter = 'brightness(1.3) contrast(1.25) saturate(1.25)'; c.drawImage(g.canvas, 0, 0); c.filter = 'none'; c.restore();
  // details on the ledges, darker and smaller the deeper they sit
  if (s > 0.09) for (const b of hollowBits()) { if (!inB(b.x, b.y, b.w)) continue;
    if (b.hang) { c.globalAlpha = 0.95; drawSprite(c, b.spr, b.x, b.y - 4, b.w, 0.5, 0.04, b.flip); c.globalAlpha = 1; continue; }
    softShadow(c, b.x + b.w * 0.1, b.y + b.w * 0.25, b.w * 0.4, b.w * 0.16, 0.7);
    const dk = clamp((0.95 - b.f) * 1.3, 0, 0.55); c.filter = `brightness(${(1 - dk).toFixed(2)}) saturate(${(1 - dk * 0.6).toFixed(2)})`;
    drawSprite(c, b.spr, b.x, b.y, b.w, 0.5, 0.6, b.flip); c.filter = 'none';
  }
  // soft shadow under the lip (light from top-left)
  c.lineJoin = 'round'; pathPoly(c, W.hollowPts.map((p) => [p[0] + 8, p[1] + 12])); for (let i = 0; i < 9; i++) { c.strokeStyle = 'rgba(8,10,24,.07)'; c.lineWidth = 16 + i * 14; c.stroke(); }
  // warm deep glow + distant delvers' lights on the terraces
  const gg = c.createRadialGradient(0, 40, 10, 0, 40, CITY.hollowR * 0.5); gg.addColorStop(0, 'rgba(255,214,120,.35)'); gg.addColorStop(1, 'rgba(255,190,90,0)');
  c.fillStyle = gg; c.beginPath(); c.arc(0, 40, CITY.hollowR * 0.5, 0, TAU); c.fill();
  const rr = mulberry32(7); for (let k = 0; k < 140; k++) { const a = rr() * TAU, f = 0.38 + rr() * 0.58; const [x, y] = polar(hollowR(a) * f, a); const al = (0.35 + rr() * 0.5) * (0.4 + f * 0.6), r = (0.8 + rr() * 1.4) * (0.5 + f * 0.6); c.fillStyle = `rgba(255,${200 + Math.floor(rr() * 50)},120,${al})`; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
  c.restore();
  // lip highlight
  c.strokeStyle = 'rgba(255,240,200,.25)'; c.lineWidth = 3; pathPoly(c, W.hollowPts.map((p) => [p[0] - 2, p[1] - 3])); c.stroke();
}
function artCrack(c, k, s) {
  const mw = Math.max(...k.ws), d = Math.min(26, mw * 0.55 + 4);
  c.save(); c.lineJoin = 'round';
  pathPoly(c, k.poly); c.lineWidth = k.wide ? 14 : 7; c.strokeStyle = texPattern(c, 'rock', s); c.stroke(); c.lineWidth = k.wide ? 3 : 1.6; c.strokeStyle = 'rgba(40,32,26,.5)'; c.stroke();
  c.clip();
  // the far (north) wall face is visible in this 3/4 view: rock strata texture
  c.fillStyle = texPattern(c, 'cliff', s); c.fill();
  // shading: lit top of the face, darker going down
  c.strokeStyle = 'rgba(255,240,210,.18)'; c.lineWidth = 3; pathPoly(c, k.poly.map((p) => [p[0], p[1] + 1.5])); c.stroke();
  // the chasm floor/darkness: the same outline pushed down by the wall height
  pathPoly(c, k.poly.map((p) => [p[0], p[1] + d])); c.fillStyle = texPattern(c, 'chasm', s); c.fill();
  for (let i = 0; i < 4; i++) { pathPoly(c, k.poly.map((p) => [p[0], p[1] + d * (0.55 + i * 0.12)])); c.fillStyle = 'rgba(8,8,20,.16)'; c.fill(); }
  c.lineCap = 'round';
  c.strokeStyle = 'rgba(6,6,18,.6)'; c.lineWidth = mw * 0.3; polyStroke(c, k.pts.map((p) => [p[0] + 2, p[1] + d * 0.8]));
  if (k.wide) { c.strokeStyle = 'rgba(255,200,110,.22)'; c.lineWidth = 3; polyStroke(c, k.pts.map((p) => [p[0] + 2, p[1] + d * 0.8])); }
  c.restore();
}
function artRoad(c, rd, s, x0, y0, x1, y1) {
  const wOuter = rd.kind === 'promenade' ? 30 : rd.kind === 'ring' ? 25 : 21;
  c.lineCap = 'round'; c.lineJoin = 'round';
  const runs = []; let cur = null;
  for (let i = 0; i < rd.pts.length - 1; i++) {
    const p = rd.pts[i], q = rd.pts[i + 1];
    if (Math.max(p[0], q[0]) < x0 - 40 || Math.min(p[0], q[0]) > x1 + 40 || Math.max(p[1], q[1]) < y0 - 40 || Math.min(p[1], q[1]) > y1 + 40) { cur = null; continue; }
    if (rd.bridge[i]) { cur = null; artBridge(c, p, q, wOuter, s); continue; }
    if (!cur) { cur = [p]; runs.push(cur); } cur.push(q);
  }
  const tex = rd.kind === 'radial' ? 'dirt' : 'cobble';
  for (const run of runs) { c.strokeStyle = 'rgba(40,30,18,.32)'; c.lineWidth = wOuter + 7; polyStroke(c, run.map((p) => [p[0] + 1.5, p[1] + 2])); }
  for (const run of runs) { c.strokeStyle = rd.kind === 'radial' ? '#8a7150' : '#7d705e'; c.lineWidth = wOuter + 2; polyStroke(c, run); }
  for (const run of runs) { c.strokeStyle = texPattern(c, tex, s); c.lineWidth = wOuter - 2; polyStroke(c, run); }
  if (s > 0.2) for (const run of runs) { c.strokeStyle = 'rgba(255,240,210,.10)'; c.lineWidth = wOuter * 0.45; polyStroke(c, run); }
}
function artBridge(c, p, q, w, s) {
  const ang = Math.atan2(q[1] - p[1], q[0] - p[0]), len = Math.hypot(q[0] - p[0], q[1] - p[1]);
  c.save(); c.translate(p[0], p[1]); c.rotate(ang);
  c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(-4, -w / 2 + 8, len + 8, w);
  const pl = ['#8a6440', '#7d5a38', '#946c45', '#6f5034']; for (let d = -4; d < len + 4; d += 4.2) { c.fillStyle = pl[(Math.abs(Math.round(d * 7.3)) | 0) % 4]; c.fillRect(d, -w / 2, 3.9, w); }
  if (s > 0.2) { c.fillStyle = 'rgba(30,20,10,.35)'; for (let d = -4; d < len + 4; d += 4.2) c.fillRect(d + 3.6, -w / 2, 0.6, w); }
  c.fillStyle = '#4b3420'; c.fillRect(-4, -w / 2 - 2.5, len + 8, 3); c.fillRect(-4, w / 2 - 0.5, len + 8, 3);
  c.fillStyle = '#3a2716'; for (let d = 0; d <= len; d += Math.max(18, len / 6)) { c.fillRect(d - 2, -w / 2 - 4, 4, 5); c.fillRect(d - 2, w / 2 - 1.5, 4, 5); }
  c.strokeStyle = 'rgba(214,190,140,.8)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-4, -w / 2 - 2); c.lineTo(len + 4, -w / 2 - 2); c.moveTo(-4, w / 2 + 1); c.lineTo(len + 4, w / 2 + 1); c.stroke();
  c.restore();
}

/* ---------- flora: scattered at paint time from a world-seeded hash (no stored objects) ---------- */
const FLORA_P = { docks: 0.34, dunes: 0.3, bluffs: 0.26, wood: 0.5, crystal: 0.3, farms: 0.26, badlands: 0.4, moss: 0.55, amber: 0.42, lava: 0.18 };
function artFlora(c, x0, y0, x1, y1, minR) {
  const G = 30, list = [];
  for (let gx = Math.floor((x0 - 24) / G); gx <= Math.floor((x1 + 4) / G); gx++) for (let gy = Math.floor((y0 - 4) / G); gy <= Math.floor((y1 + 30) / G); gy++) {
    const q = hash2(gx * 7 + 3, gy * 13 + 5), x = gx * G + hash2(gx, gy + 911) * 26, y = gy * G + hash2(gx + 577, gy) * 26;
    if (q > 0.55 || Math.hypot(x, y) > CITY.R - 30) continue;
    const k = REGIONS[regionAt(x, y)].key; if (q > (FLORA_P[k] || 0.3)) continue;
    const sz = 5 + hash2(gx + 31, gy - 7) * 6;
    if (sz < minR) continue;
    if (hollowDist(x, y) < 40 || chasmDist(x, y) < 8 || isWet(x, y, 4) || !occFree(OCC.obj, x, y, sz * 0.8)) continue;
    const fl = FLORA[k] || FLORA.badlands, spr = fl[Math.floor(hash2(gx - 99, gy + 41) * fl.length)];
    list.push({ x, y, r: spr.startsWith('props2') ? 7 : sz, spr, sd: hash2(gx + 3, gy + 3) });
  }
  list.sort((a, b) => a.y - b.y);
  for (const o of list) { const w = o.r * 2.6 * (o.spr.startsWith('p_crystal') ? 0.62 : o.spr === 'p_desert_2' ? 1.25 : 1); if (w > 12) softShadow(c, o.x + w * 0.12, o.y + w * 0.02, w * 0.4, w * 0.16, 0.6); drawSprite(c, o.spr, o.x, o.y, w, 0.5, 0.82, o.sd > 0.5); }
}
/* ---------- sprite choices for world objects ---------- */
const FLORA = {
  docks: ['p_forest_6', 'p_forest_7', 'p_garden_2', 'p_garden_3', 'p_garden_5'],
  dunes: ['p_desert_2', 'p_desert_3', 'p_desert_4', 'p_desert_5', 'p_desert_5', 'p_desert_6', 'p_desert_8'],
  bluffs: ['p_rocks_8', 'p_garden_3', 'p_forest_7', 'p_rocks_6', 'p_forest_8'],
  wood: ['p_forest_6', 'p_forest_6', 'p_forest_7', 'p_forest_8', 'p_forest_3'],
  crystal: ['p_crystal_1', 'p_crystal_5', 'p_crystal_8', 'p_rocks_8', 'p_crystal_4'],
  farms: ['p_garden_3', 'props2_4', 'p_garden_2', 'props2_5', 'props2_3', 'p_forest_7'],
  badlands: ['p_rocks_2', 'p_rocks_3', 'p_rocks_8', 'p_rocks_5', 'p_rocks_1'],
  moss: ['p_garden_0', 'p_garden_1', 'p_garden_6', 'p_garden_7', 'p_garden_4', 'p_garden_2', 'p_garden_0'],
  amber: ['p_orchard_5', 'p_orchard_7', 'p_orchard_8', 'p_orchard_6', 'p_orchard_5'],
};
const TREES = { docks: ['p_forest_0', 'p_forest_5', 'p_forest_4'], wood: ['p_forest_0', 'p_forest_0', 'p_forest_4', 'p_forest_5', 'p_forest_7'], moss: ['p_garden_8', 'p_forest_4', 'p_forest_0', 'p_garden_8'], farms: ['p_forest_0', 'p_forest_5'], amber: ['p_orchard_1', 'p_orchard_2', 'p_orchard_4'], def: ['p_forest_0'] };
function homeTier(level) { return level <= 3 ? 0 : level <= 7 ? 1 : level <= 13 ? 2 : level <= 20 ? 3 : level <= 29 ? 4 : 5; }
function homeSeed(h) { return ((h.lanternPhase || 0) / TAU) % 1; }
// two painted designs per region and size; mirrored ones face the other way
function homeSprite(h) { const k = REGION_BLD[REGIONS[h.region].key], t = h === W.player ? Math.min(5, Math.floor(h.level / 2)) : homeTier(h.level); const alt = h !== W.player && (homeSeed(h) * 7.31) % 1 < 0.5; const n = (alt ? k.replace('b_', 'b2_') : k) + '_' + t; return ART_MANIFEST.s[n] ? n : k + '_' + t; }
function homeFlip(h) { return h !== W.player && (homeSeed(h) * 13.7) % 1 < 0.5; }
// little yard details around homes: laundry, fences, vegetable plots, woodpiles, coops, wells, benches, herb beds, barrels
const YARD = { docks: [0, 1, 8, 6], dunes: [8, 6, 7], bluffs: [7, 1, 5, 2], wood: [3, 3, 0, 8], crystal: [3, 8, 5], farms: [2, 4, 1, 0, 2], badlands: [8, 3, 5], moss: [7, 1, 2, 6], amber: [2, 8, 1, 4] };
const YARD_W = [26, 22, 24, 18, 22, 16, 14, 18, 12];
function homeYard(h, w) {
  if (h === W.player) return [];
  const sd = homeSeed(h), list = YARD[REGIONS[h.region].key] || [8], out = [], n = sd < 0.3 ? 0 : sd < 0.75 ? 1 : 2;
  for (let i = 0; i < n; i++) { const r = (sd * (17.3 + i * 9.1)) % 1, a = (i === 0 ? 0.35 : 2.6) + r * 1.4; const k = list[Math.floor(((sd * (5.7 + i * 3.3)) % 1) * list.length)];
    out.push({ spr: 'yard_' + k, x: h.x + Math.cos(a) * w * 0.62, y: h.y + Math.sin(a) * w * 0.32 + w * 0.06, w: YARD_W[k] * (0.9 + r * 0.3), flip: r > 0.5 }); }
  return out;
}
function homeW(h, tier) { if (tier == null) tier = h === W.player ? Math.min(5, Math.floor(h.level / 2)) : homeTier(h.level); return (h.size * (1.55 + tier * 0.09) + 8) * 1.22; }
function artHome(c, h, s) {
  const tier = h === W.player ? Math.min(5, Math.floor(h.level / 2)) : homeTier(h.level), w = homeW(h, tier);
  softShadow(c, h.x + w * 0.1, h.y + w * 0.05, w * 0.55, w * 0.3, 0.9);
  const yard = s > 0.09 ? homeYard(h, w) : [];
  for (const y of yard) if (y.y < h.y) drawSprite(c, y.spr, y.x, y.y, y.w, 0.5, 0.8, y.flip);
  drawSprite(c, homeSprite(h), h.x, h.y, w, 0.5, 0.74, homeFlip(h));
  for (const y of yard) if (y.y >= h.y) { softShadow(c, y.x + 2, y.y, y.w * 0.4, y.w * 0.14, 0.5); drawSprite(c, y.spr, y.x, y.y, y.w, 0.5, 0.8, y.flip); }
  if (s > 0.28) {
    const top = h.y - w * 0.55;
    for (let i = 0; i < h.banners; i++) { const bx = h.x - w * 0.38 + i * 6, by = h.y + w * 0.12; c.strokeStyle = '#3a2e22'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx, by - 13); c.stroke(); c.fillStyle = LAYER_COLORS[i]; c.beginPath(); c.moveTo(bx, by - 13); c.lineTo(bx + 6, by - 10.5); c.lineTo(bx, by - 8); c.closePath(); c.fill(); }
    if (h.trophies) { const tx = h.x + w * 0.3, ty = top + w * 0.25; c.fillStyle = '#f2ead6'; c.beginPath(); c.ellipse(tx, ty, 4.5, 3.4, 0, 0, TAU); c.fill(); c.fillStyle = '#3a2e22'; c.beginPath(); c.arc(tx - 1.6, ty, 0.9, 0, TAU); c.arc(tx + 1.6, ty, 0.9, 0, TAU); c.fill(); }
    if (h.battered) { c.strokeStyle = 'rgba(30,18,10,.75)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(h.x + w * 0.18, h.y - w * 0.2); c.lineTo(h.x + w * 0.12, h.y - w * 0.12); c.lineTo(h.x + w * 0.16, h.y - w * 0.05); c.stroke(); c.fillStyle = '#7a7266'; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(h.x + w * 0.3 + i * 2.4, h.y + w * 0.14 - (i % 2) * 2, 1.7, 0, TAU); c.fill(); } }
  }
}
function artObj(c, o, s) {
  const key = REGIONS[o.region] ? REGIONS[o.region].key : 'docks', sd = o.seed || 0.5;
  const tree = (name, w) => { softShadow(c, o.x + w * 0.16, o.y + w * 0.04, w * 0.42, w * 0.2, 0.85); drawSprite(c, name, o.x, o.y, w, 0.5, 0.9, sd > 0.5); };
  switch (o.type) {
    case 'home': return artHome(c, o, s);
    case 'tree': { if (o.autumn) return tree(pickOf(TREES.amber, sd), o.r * 2.9); const list = TREES[key] || TREES.def; return tree(pickOf(list, sd), o.r * 2.7); }
    case 'orchard': return tree(sd < 0.6 ? 'p_orchard_0' : 'p_orchard_3', o.r * 2.9);
    case 'pine': return tree(sd < 0.55 ? 'p_forest_1' : 'p_forest_2', o.r * 2.3);
    case 'palm': return tree(sd < 0.45 ? 'p_desert_0' : sd < 0.75 ? 'p_desert_1' : 'p_desert_2', o.r * 2.8);
    case 'deadtree': return tree(pickOf(['p_rocks_0', 'p_rocks_1', 'p_rocks_2'], sd), o.r * 3.8);
    case 'rock': case 'boulder': { const name = key === 'badlands' ? pickOf(['p_rocks_3', 'p_rocks_4'], sd) : key === 'crystal' ? 'p_crystal_8' : key === 'dunes' ? 'p_desert_7' : pickOf(['p_rocks_6', 'p_rocks_7'], sd); softShadow(c, o.x + o.r * 0.3, o.y + o.r * 0.15, o.r * 1.2, o.r * 0.55, 0.8); drawSprite(c, name, o.x, o.y, o.r * 2.5, 0.5, 0.75, sd > 0.5); return; }
    case 'crystal': softShadow(c, o.x + 4, o.y + 2, o.r * 1.1, o.r * 0.5, 0.7); drawSprite(c, pickOf(['p_crystal_0', 'p_crystal_1', 'p_crystal_2', 'p_crystal_3', 'p_crystal_4', 'p_crystal_6', 'p_crystal_7'], sd), o.x, o.y, o.r * 2.5, 0.5, 0.78, sd > 0.5); return;
    case 'slag': softShadow(c, o.x + 4, o.y + 2, o.r * 1.1, o.r * 0.5, 0.7); drawSprite(c, 'p_rocks_5', o.x, o.y, o.r * 2.3, 0.5, 0.7, sd > 0.5); return;
    case 'hay': drawSprite(c, 'props2_4', o.x, o.y, 20, 0.5, 0.75); return;
    case 'windmill': softShadow(c, o.x + 8, o.y + 4, 22, 11, 0.9); drawSprite(c, 'props_0', o.x, o.y, 58, 0.55, 0.86); return;
    case 'logs': drawSprite(c, 'props_6', o.x, o.y, 28, 0.5, 0.75); return;
    case 'sawmill': softShadow(c, o.x + 6, o.y + 4, 30, 14, 0.8); drawSprite(c, 'b_forest_0', o.x, o.y, 54, 0.5, 0.74); drawSprite(c, 'props_6', o.x + 30, o.y + 14, 26, 0.5, 0.75); drawSprite(c, 'props_5', o.x - 28, o.y + 16, 24, 0.5, 0.75); return;
    case 'post': drawSprite(c, 'props2_8', o.x, o.y, 15, 0.6, 0.97); return;
    case 'flora': { const w = o.r * 2.6 * (o.spr.startsWith('p_crystal') ? 0.62 : o.spr === 'p_desert_2' ? 1.25 : 1); if (w > 12) softShadow(c, o.x + w * 0.12, o.y + w * 0.02, w * 0.4, w * 0.16, 0.6); drawSprite(c, o.spr, o.x, o.y, w, 0.5, 0.82, sd > 0.5); return; }
    case 'market': softShadow(c, o.x + 10, o.y + 12, o.r * 1.35, o.r * 0.9, 0.7); drawSprite(c, 'civic_market_0', o.x, o.y, o.r * 2.6, 0.5, 0.52); return;
    case 'vault': softShadow(c, o.x + 10, o.y + 6, o.r * 1.2, o.r * 0.6, 0.9); drawSprite(c, 'civic_vault_0', o.x, o.y, o.r * 2.5, 0.5, 0.8); return;
    case 'lift': softShadow(c, o.x + 10, o.y + 4, 20, 10, 0.9); drawSprite(c, 'civic_vault_1', o.x, o.y, 40, 0.5, 0.94); return;
    case 'statue': softShadow(c, o.x + 8, o.y + 6, o.r * 1.3, o.r * 0.7, 0.8); drawSprite(c, 'landmarks_0', o.x, o.y, o.r * 2.8, 0.5, 0.78); return;
    case 'memorial': softShadow(c, o.x + 8, o.y + 6, 50, 18, 0.8); drawSprite(c, 'landmarks_1', o.x, o.y, 96, 0.5, 0.78); return;
    case 'gate': softShadow(c, o.x + 8, o.y + 6, o.r * 1.4, o.r * 0.7, 0.9); drawSprite(c, 'landmarks_2', o.x, o.y, o.r * 3.2, 0.5, 0.82); return;
    case 'plaza': { c.fillStyle = texPattern(c, 'cobble', s); c.beginPath(); c.arc(o.x, o.y, o.r, 0, TAU); c.fill(); c.strokeStyle = 'rgba(70,60,45,.55)'; c.lineWidth = 3; c.stroke();
      if (o.fountain) { c.fillStyle = '#9a9283'; c.beginPath(); c.arc(o.x, o.y, 11, 0, TAU); c.fill(); c.fillStyle = texPattern(c, 'water', s); c.beginPath(); c.arc(o.x, o.y, 8.5, 0, TAU); c.fill(); c.fillStyle = '#b8b0a0'; c.beginPath(); c.arc(o.x, o.y, 2.5, 0, TAU); c.fill(); }
      else drawSprite(c, 'props_8', o.x, o.y, 22, 0.5, 0.75); return; }
    case 'pond': { blob(c, o.x, o.y, o.r, o.seed); c.lineWidth = 6; c.strokeStyle = texPattern(c, 'dirt', s); c.stroke(); c.fillStyle = texPattern(c, 'water', s); c.fill(); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.5; c.stroke(); drawSprite(c, 'p_garden_6', o.x + o.r * 0.9, o.y + o.r * 0.6, 18, 0.5, 0.8); return; }
    case 'pier': { c.save(); c.translate(o.x, o.y); c.rotate(o.a); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(3, -3, 52, 12); const pl = ['#9a7048', '#8a6240', '#a47a50']; for (let d = 0; d < 52; d += 3.6) { c.fillStyle = pl[(d * 3 | 0) % 3]; c.fillRect(d, -6, 3.3, 12); } c.fillStyle = '#4b3420'; for (let d = 6; d < 52; d += 14) { c.fillRect(d, -8, 3, 3); c.fillRect(d, 6, 3, 3); } c.restore();
      if (o.seed < 0.45) drawSprite(c, 'props2_6', o.x + Math.cos(o.a) * 58, o.y + Math.sin(o.a) * 58, 34, 0.5, 0.8); return; }
    case 'kiln': softShadow(c, o.x + 5, o.y + 3, o.r, o.r * 0.5, 0.8); drawSprite(c, 'b_sand_0', o.x, o.y, o.r * 2.6, 0.5, 0.74); return;
    case 'chimney': softShadow(c, o.x + 5, o.y + 3, 14, 7, 0.8); c.fillStyle = '#6e3a28'; c.fillRect(o.x - 6, o.y - 30, 12, 32); c.fillStyle = '#8a4a32'; c.fillRect(o.x - 6, o.y - 30, 5, 32); c.fillStyle = '#2a1e1a'; c.fillRect(o.x - 7, o.y - 33, 14, 4); return;
    case 'mine': { c.strokeStyle = '#4a3a2a'; c.lineWidth = 1.6; const dx = Math.cos(o.a), dy = Math.sin(o.a), nx = -dy * 3, ny = dx * 3; c.beginPath(); c.moveTo(o.x + nx, o.y + ny); c.lineTo(o.x + nx + dx * 70, o.y + ny + dy * 70); c.moveTo(o.x - nx, o.y - ny); c.lineTo(o.x - nx + dx * 70, o.y - ny + dy * 70); c.stroke();
      c.strokeStyle = '#6a4a2a'; for (let d = 4; d < 70; d += 6) { c.beginPath(); c.moveTo(o.x + dx * d + nx * 1.6, o.y + dy * d + ny * 1.6); c.lineTo(o.x + dx * d - nx * 1.6, o.y + dy * d - ny * 1.6); c.stroke(); }
      softShadow(c, o.x + 5, o.y + 4, 26, 12, 0.8); drawSprite(c, 'b_crystal_5', o.x, o.y, 64, 0.5, 0.74); return; }
    case 'quarry': { for (let i = 0; i < 4; i++) { c.fillStyle = `rgba(${120 - i * 18},${116 - i * 18},${104 - i * 16},1)`; c.fillRect(o.x - o.r + i * 7, o.y - o.r * 0.7 + i * 5, (o.r - i * 7) * 2, (o.r * 0.7 - i * 5) * 2); } drawSprite(c, 'p_rocks_7', o.x + o.r * 0.7, o.y + o.r * 0.5, 30, 0.5, 0.75); return; }
  }
}
function artDecal(c, o, s) {
  switch (o.type) {
    case 'field': { c.save(); c.translate(o.x, o.y); c.rotate(o.a); const w = o.r * 1.7, h = o.r * 1.2, crop = CROPS[Math.floor(((o.c || 0) * 7.77 + (o.seed || 0)) * 8) % 8];
      c.fillStyle = texPattern(c, 'dirt', s); c.fillRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6);
      c.fillStyle = texPattern(c, crop, s); c.fillRect(-w / 2, -h / 2, w, h);
      // soft inner edge + hedgerow border
      c.strokeStyle = 'rgba(40,30,15,.25)'; c.lineWidth = 2; c.strokeRect(-w / 2, -h / 2, w, h);
      c.strokeStyle = 'rgba(70,100,45,.85)'; c.lineWidth = 3.2; c.setLineDash([4, 2.5]); c.strokeRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6); c.setLineDash([]);
      c.restore(); return; }
    case 'cliff': softShadow(c, o.x + o.r * 0.3, o.y + o.r * 0.2, o.r * 0.9, o.r * 0.45, 0.6); drawSprite(c, 'p_rocks_7', o.x, o.y, o.r * 1.5, 0.5, 0.72, o.seed > 0.5); return;
    case 'scree': drawSprite(c, 'p_rocks_8', o.x, o.y, o.r * 1.3, 0.5, 0.6, o.seed > 0.5); return;
    case 'leaves': drawSprite(c, 'p_orchard_7', o.x, o.y, o.r * 1.4, 0.5, 0.6, o.seed > 0.5); return;
    case 'dune': { c.save(); c.translate(o.x, o.y); c.rotate(o.a); c.lineCap = 'round';
      c.strokeStyle = 'rgba(140,92,40,.13)'; c.lineWidth = o.r * 0.45; c.beginPath(); c.arc(0, o.r * 0.22, o.r, Math.PI * 1.18, Math.PI * 1.82); c.stroke();
      c.strokeStyle = 'rgba(255,238,200,.16)'; c.lineWidth = o.r * 0.14; c.beginPath(); c.arc(0, 0, o.r, Math.PI * 1.2, Math.PI * 1.8); c.stroke(); c.restore(); return; }
    case 'cracked': c.save(); c.globalAlpha = 0.55; drawDecal(c, o, s); c.restore(); return;
    case 'slag': softShadow(c, o.x + o.r * 0.3, o.y + o.r * 0.15, o.r, o.r * 0.45, 0.6); drawSprite(c, 'p_rocks_5', o.x, o.y, o.r * 1.9, 0.5, 0.7, o.seed > 0.5); return;
    case 'mosspatch': drawSprite(c, 'p_garden_0', o.x, o.y, o.r * 0.9, 0.5, 0.7, o.seed > 0.5); return;
    default: return drawDecal(c, o, s);
  }
}
function artStatic(c, x0, y0, x1, y1, s) {
  drawTerrain(c, x0, y0, x1, y1, s);
  const objs = queryObjs(x0, y0, x1, y1, 160, 150);
  for (const o of objs) if (o.layer === 0) artDecal(c, o, s);
  artWater(c, x0, y0, x1, y1, s);
  if (x1 > -CITY.hollowR * 1.4 && x0 < CITY.hollowR * 1.4 && y1 > -CITY.hollowR * 1.4 && y0 < CITY.hollowR * 1.4) { artHollow(c, s, x0, y0, x1, y1); const e0 = W.river[W.river.length - 1], d = Math.hypot(e0[0], e0[1]), e = [e0[0] + e0[0] / d * 50, e0[1] + e0[1] / d * 50]; softShadow(c, e[0] + 8, e[1] + 60, 46, 22, 0.8); drawSprite(c, 'props2_2', e[0], e[1], 92, 0.42, 0.1); }
  for (const k of W.cracks) if (boxHit(k.bbox, x0, y0, x1, y1)) artCrack(c, k, s);
  c.lineCap = 'round';
  for (const L of W.lifts) if (boxHit(bboxOf([[L.x, L.y], [L.bx, L.by]], 10), x0, y0, x1, y1)) { c.strokeStyle = 'rgba(40,30,20,.75)'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(L.x, L.y - 30); c.lineTo(L.bx, L.by); c.stroke(); c.strokeStyle = 'rgba(255,220,140,.35)'; c.lineWidth = 0.8; c.stroke(); }
  if (s < 0.05) { // far LOD: settlements read as warm roof specks, big features only
    for (const o of objs) { if (o.isPlayer) continue; if (o.type === 'home') { const w = Math.max(1.2 / s, o.size * 0.9); c.fillStyle = o.roofD; c.fillRect(o.x - w / 2, o.y - w / 2, w, w * 0.8); c.fillStyle = o.roofL; c.fillRect(o.x - w / 2, o.y - w / 2, w * 0.6, w * 0.45); }
      else if (o.layer === 1 && o.type !== 'rock' && (o.r || 0) >= 18) artObj(c, o, s); }
    return; }
  artFlora(c, x0, y0, x1, y1, s < 0.1 ? 6 : 0);
  const l1 = objs.filter((o) => o.layer === 1 && !o.isPlayer).sort((a, b) => a.y - b.y);
  for (const o of l1) artObj(c, o, s);
}

/* ---------- living sprites ---------- */
const PEOPLE_N = 16;
const NPC_SPR = { maddox: 4, pell: 2, greta: 3, ilse: 5, kip: 6, juniper: 7, hennick: 8 };
const PET_SPR = { pup: 'creatures_0', wisp: 'creatures_1', moth: 'creatures_2', ferret: 'creatures_4', tortoise: 'creatures_5', kit: 'creatures_6' };
function strHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
// walk cycle: body bobs, legs (bottom slice) split into two halves that swing opposite ways
function drawWalk(c, name, x, y, w, ay, flip, ph, split, stride, bob) {
  const e = ART_MANIFEST.s[name]; if (!e) return; const h = w * e[4] / e[3], img = ART.atlas[e[0]];
  const sy = e[4] * split | 0, top = h * split, dy = y - h * ay, s1 = Math.sin(ph), s2 = Math.sin(ph + Math.PI);
  c.save(); c.translate(x, 0); if (flip) c.scale(-1, 1);
  const lx = -w / 2, hw = e[3] / 2, lh = e[4] - sy, dh = h - top;
  // back leg first (darker), then front leg
  c.drawImage(img, e[1] + hw, e[2] + sy, hw, lh, lx + w / 2 + s2 * stride, dy + top + Math.max(0, -s2) * 0.6, w / 2, dh - Math.max(0, -s2) * 0.6);
  c.drawImage(img, e[1], e[2] + sy, hw, lh, lx + s1 * stride, dy + top + Math.max(0, -s1) * 0.6, w / 2, dh - Math.max(0, -s1) * 0.6);
  c.drawImage(img, e[1], e[2], e[3], sy + 1, lx, dy - bob, w, top + h / e[4] + bob * 0.3);
  c.restore();
}
function artPerson(c, x, y, ang, t, ph, idx, opt) {
  opt = opt || {}; const bob = Math.abs(Math.sin(t * 8 + ph)) * 0.9, H = opt.h || 15;
  softShadow(c, x + 2, y + 0.5, 5, 2.4, 0.9);
  const e = ART_MANIFEST.s['people_' + idx]; if (!e) return; const w = H * e[3] / e[4];
  if (opt.idle || c.getTransform().a < 1.1) drawSprite(c, 'people_' + idx, x, y - bob, w, 0.5, 0.96, Math.cos(ang) < 0);
  else drawWalk(c, 'people_' + idx, x, y, w, 0.96, Math.cos(ang) < 0, t * 8 + ph, 0.66, w * 0.07, bob * 0.6);
  if (opt.lantern) { c.fillStyle = 'rgba(255,212,107,.95)'; c.beginPath(); c.arc(x + (Math.cos(ang) < 0 ? -3.5 : 3.5), y - H * 0.45 - bob, 1.4, 0, TAU); c.fill(); }
}
function artPet(c, kind, x, y, ang, t, ph, sleeping) {
  const name = PET_SPR[kind]; if (!name) return; const H = kind === 'tortoise' ? 7 : kind === 'moth' ? 7 : 8;
  const e = ART_MANIFEST.s[name]; const w = H * e[3] / e[4] * (kind === 'moth' ? 1 : 1);
  const hop = sleeping ? 0 : kind === 'wisp' || kind === 'moth' ? 3 + Math.sin(t * 3 + ph) * 1.5 : Math.abs(Math.sin(t * 10 + ph)) * 0.8;
  softShadow(c, x + 1, y + 0.5, w * 0.45, 1.8, kind === 'wisp' ? 0.3 : 0.8);
  if (sleeping) { c.save(); c.translate(x, y); c.scale(1, 0.8); drawSprite(c, name, 0, 0, w, 0.5, 0.92, ph % 2 > 1, 0.9); c.restore(); c.fillStyle = 'rgba(255,255,255,.9)'; c.font = '5px Georgia'; c.fillText('z', x + 3, y - H - (t * 2 + ph) % 4); return; }
  if (kind === 'moth') { c.save(); c.translate(x, y - hop); c.scale(0.7 + 0.3 * Math.abs(Math.sin(t * 14 + ph)), 1); drawSprite(c, name, 0, 0, w, 0.5, 0.9); c.restore(); return; }
  if (kind === 'wisp' || c.getTransform().a < 1.1) drawSprite(c, name, x, y - hop, w, 0.5, 0.92, Math.cos(ang) < 0);
  else drawWalk(c, name, x, y, w, 0.92, Math.cos(ang) < 0, t * 10 + ph, 0.62, w * 0.06, hop);
}
const FISH_SPR = { manta: 'skyfish_0', koi: 'skyfish_1', koi2: 'skyfish_4', eel: 'skyfish_2', glowmanta: 'skyfish_3', school: 'skyfish_5' };
function artSkyFish(c, kind, x, y, ang, size, t, ph, glowOn, alpha, shadow) {
  let name = FISH_SPR[kind] || FISH_SPR.manta; if (kind === 'koi' && (ph * 10 | 0) % 2) name = FISH_SPR.koi2; if (glowOn && kind === 'manta') name = FISH_SPR.glowmanta;
  const e = ART_MANIFEST.s[name]; if (!e) return; const und = Math.sin(t * 2.6 + ph);
  const len = kind === 'eel' ? size * 2.2 : kind === 'koi' ? size * 1.8 : size * 1.25; // along body
  const w = len * e[3] / e[4];
  c.save(); c.globalAlpha = alpha; c.translate(x, y); c.rotate(ang + Math.PI / 2 + (kind === 'manta' ? 0 : und * 0.08));
  if (kind === 'manta') c.scale(0.86 + 0.16 * und, 1); else c.scale(1 + und * 0.05, 1 - Math.abs(und) * 0.04);
  const img = shadow ? ART.sil[name] : ART.atlas[e[0]];
  if (shadow) c.drawImage(img, 0, 0, img.width, img.height, -w / 2, -len / 2, w, len); else c.drawImage(img, e[1], e[2], e[3], e[4], -w / 2, -len / 2, w, len);
  c.restore();
}

// live depth layers over the painted Hollow: parallax mist, pulsing Lumen core, delver lanterns going down
let HDEPTH = null;
function hollowDepthInit() {
  const rnd = mulberry32(777), lights = [], mist = [];
  for (let i = 0; i < 28; i++) lights.push({ a: rnd() * TAU, sp: 0.004 + rnd() * 0.01, ph: rnd(), sw: (rnd() - 0.5) * 0.6, warm: rnd() < 0.8 });
  for (let i = 0; i < 7; i++) mist.push({ a: rnd() * TAU, f: 0.3 + rnd() * 0.3, r: 110 + rnd() * 90, sp: (rnd() - 0.5) * 0.02, d: 0.25 + rnd() * 0.5 });
  HDEPTH = { lights, mist };
}
function drawHollowDepth(c, t, inV, camx, camy, z, night, glow) {
  const R = CITY.hollowR; if (!inV(0, 0, R * 1.1)) return; if (!HDEPTH) hollowDepthInit();
  const par = (x, y, d) => [x + (camx - x) * d * 0.18, y + (camy - y) * d * 0.18]; // deeper = drifts with the camera
  c.save();
  // Lumen core: breathes, sits deepest
  const [cx, cy] = par(0, 0, 1), pulse = 0.75 + 0.25 * Math.sin(t * 0.9) + 0.08 * Math.sin(t * 2.3);
  glow(c, cx, cy, R * 0.32, 'rgba(255,222,150,.9)', 0.32 * pulse); glow(c, cx, cy, R * 0.12, 'rgba(255,248,220,1)', 0.35 * pulse);
  // drifting mist banks at mid depth
  for (const m of HDEPTH.mist) { const a = m.a + t * m.sp, rr = hollowR(a) * m.f, [x, y] = par(Math.cos(a) * rr, Math.sin(a) * rr, m.d); glow(c, x, y, m.r, 'rgba(150,170,205,1)', 0.10 + 0.04 * Math.sin(t * 0.4 + m.a * 3)); }
  // delvers: lantern lights spiralling down the terraces, smaller and dimmer as they go deeper
  if (z > 0.12) for (const L of HDEPTH.lights) { const u = (L.ph + t * L.sp) % 1, a = L.a + u * 2.2 + L.sw * Math.sin(u * 9), rr = hollowR(a) * (0.9 - u * 0.55), d = u;
    const [x, y] = par(Math.cos(a) * rr, Math.sin(a) * rr, d); const fade = Math.min(1, u * 8) * Math.min(1, (1 - u) * 6), fl = 0.8 + 0.2 * Math.sin(t * 11 + L.a * 20);
    const sz = (1 - u * 0.6) * (z > 1 ? 3.2 : 4.5);
    glow(c, x, y, sz * 4, L.warm ? 'rgba(255,200,110,1)' : 'rgba(170,220,255,1)', 0.35 * fade * fl * (0.6 + night * 0.4));
    c.fillStyle = L.warm ? `rgba(255,236,180,${0.9 * fade})` : `rgba(220,240,255,${0.9 * fade})`; c.beginPath(); c.arc(x, y, sz * 0.32, 0, TAU); c.fill(); }
  c.restore();
}

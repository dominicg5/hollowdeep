
/* =====================================================================
   RIM CITY — procedural, seeded world around the Hollow
   ===================================================================== */
const CITY = {
  homeTerm: 'Lanternhold', functional: false,              // in-world name for each player's capital
  seed: 20261114,
  R: 11000, hollowR: 700,                // world radius, hollow base radius (world units)
  ringRoads: [1080, 1580, 2120, 2700], radialRoads: 20,
  tilePx: 256, levels: [0.015625, 0.03125, 0.0625, 0.125, 0.25, 0.5, 1, 2], maxTiles: 300,
  zoomMin: 0.018, zoomMax: 3.2, startZoom: 1.05,
  homePetShare: 0.12, innerR: 3150,
  villageP: { docks: 0.6, dunes: 0.4, bluffs: 0.45, wood: 0.5, crystal: 0.35, farms: 0.7, badlands: 0.35, moss: 0.6, amber: 0.6, lava: 0.15 },
  seasonDays: 7, testSeasonDays: 1,     // game days per season (test mode uses testSeasonDays)
  moleWindowHours: 8, moleChance: 0.75, moleDurationHours: 1.5,
  spikeWindowHours: 3, spikeChance: 0.25, spikeMult: 1.6,
  weatherSeconds: 45,                   // real seconds per weather event
};
const REGIONS = [
  { key: 'docks', name: 'Mirrorlake Docks', icon: '🐟', res: ['🐟 Fish', '💧 Freshwater', '🧂 Salt'], sells: ['lumen'],
    blurb: 'A mirror-still lake spills over the lip into the Hollow in a roaring veil. Fishers, ferrymen and lamp-oil pressers.',
    ground: [150, 192, 160], roofs: ['#5f7f99', '#6f8fa8', '#4f6a80'], wall: '#e6dcc8', styles: [0, 1] },
  { key: 'dunes', name: 'Glassdune Quarter', icon: '⏳', res: ['⏳ Sand', '🔮 Sunglass', '🟠 Amber'], sells: ['amber'],
    blurb: 'Wind-carved dunes and glass kilns that glow all night. Sunglass lenses for every lantern on the Rim.',
    ground: [232, 207, 152], roofs: ['#e9d4a4', '#d9b77a', '#c99a5a'], wall: '#f3e3bf', styles: [2] },
  { key: 'bluffs', name: 'Greystone Bluffs', icon: '🪨', res: ['🪨 Stone', '🤍 Chalk', '🏛️ Marble'], sells: ['stone'],
    blurb: 'Stepped cliffs and quarries. Every wall on the Rim started here, and every winter the frost starts here too.',
    ground: [180, 178, 162], roofs: ['#7c7f86', '#8f8f8a', '#6c6e73'], wall: '#d9d4c4', styles: [1] },
  { key: 'wood', name: 'Hushwood', icon: '🌲', res: ['🪵 Timber', '🍯 Resin', '🍄 Mushrooms'], sells: ['timber'],
    blurb: 'An old, quiet forest. Sawmills hum at its edge; the deep trees whisper back.',
    ground: [104, 150, 98], roofs: ['#6b4a32', '#7d5638', '#5a3d2a'], wall: '#d8c3a0', styles: [0] },
  { key: 'crystal', name: 'Shardglow Mines', icon: '💎', res: ['💎 Crystal', '🏮 Lumen', '🔷 Deepglass'], sells: ['lumen', 'amber'],
    blurb: 'Crystal seams break the surface here, humming with Lumen. Miners never need lanterns.',
    ground: [130, 126, 156], roofs: ['#6a5a9a', '#7c6bb0', '#584a82'], wall: '#d9d2e6', styles: [1, 3] },
  { key: 'farms', name: 'Goldenstep Terraces', icon: '🌾', res: ['🌾 Grain', '🍚 Mossrice', '🍯 Honey'], sells: ['timber'], premium: true,
    blurb: 'Golden fields step down toward the rim, and the windmills never stop. Traders here pay the best Crowns for anything you sell.',
    ground: [206, 193, 120], roofs: ['#c9a65a', '#b8904a', '#d6b46a'], wall: '#efe2c2', styles: [0] },
  { key: 'badlands', name: 'Cinderreach Badlands', icon: '⛓️', res: ['⛓️ Iron', '⚫ Breathcoal', '🟤 Copper'], sells: ['iron', 'coal'],
    blurb: 'Cracked red earth, slag heaps and smoking chimneys. Iron and Breathcoal for the forges.',
    ground: [166, 120, 92], roofs: ['#8a4a32', '#6d3a2a', '#9a5a3a'], wall: '#cdb49a', styles: [2, 1] },
  { key: 'moss', name: 'Lanternmoss Gardens', icon: '🌿', res: ['🌿 Lanternmoss', '🏮 Lumen Oil', '🌱 Herbs'], sells: ['moss', 'lumen'],
    blurb: 'Glowing moss gardens and lantern-lit paths. The softest light on the Rim, and your home.',
    ground: [122, 174, 130], roofs: ['#4f8c6a', '#5f9c78', '#3f7a5c'], wall: '#e8e0c8', styles: [3, 0] },
  { key: 'amber', name: 'Amberfall Orchards', icon: '🍂', res: ['🟠 Amber', '🍎 Fruit', '🪵 Heartwood'], sells: ['amber', 'timber'],
    blurb: 'Autumn orchards whose trees weep amber. Sweet air, sticky boots.',
    ground: [200, 152, 94], roofs: ['#b0573a', '#c46a40', '#9a4a30'], wall: '#f0dcc0', styles: [0, 1] },
  { key: 'lava', name: 'The Emberwound', icon: '🌋', res: ['🖤 Obsidian', '🔥 Magma', '🪨 Basalt'], sells: ['obsidian'], outer: true,
    blurb: 'Far out where the earth is splitting open, molten rock seeps up through the cracks. Smiths pay dearly for the black glass it leaves behind.',
    ground: [92, 70, 62], roofs: ['#4a3a36', '#5a4038', '#3a2e2c'], wall: '#8a7a70', styles: [2] },
];
const NREG_IN = 9; // the original lands ring the Hollow; outer patchwork lands can also be any of these, or lava
const NREG = REGIONS.length;
const smooth01g = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/* ---------- seeded randomness & noise ---------- */
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hash2(x, y) { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ CITY.seed; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function hash1(n) { return hash2(n, 7919); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const TAU = Math.PI * 2;
const polar = (r, a) => [Math.cos(a) * r, Math.sin(a) * r];
function distSeg(px, py, x1, y1, x2, y2) { const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1; let t = ((px - x1) * dx + (py - y1) * dy) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t; const ex = x1 + t * dx - px, ey = y1 + t * dy - py; return [Math.sqrt(ex * ex + ey * ey), t]; }
function shade(rgb, f) { return `rgb(${clamp(Math.round(rgb[0] * f), 0, 255)},${clamp(Math.round(rgb[1] * f), 0, 255)},${clamp(Math.round(rgb[2] * f), 0, 255)})`; }
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

/* ---------- the world object ---------- */
const W = { ready: false };

function regionF(x, y) {
  const a = (Math.atan2(y, x) + Math.PI) / TAU;
  const w = (vnoise(x / 700 + 50, y / 700) - 0.5) * 0.55 + (vnoise(x / 240, y / 240 + 9) - 0.5) * 0.14;
  return (((a * NREG_IN + w) % NREG_IN) + NREG_IN) % NREG_IN;
}
/* Outer lands: a domain-warped patchwork of lands (jittered Voronoi), blended in beyond the old city. */
const OUTER = { cell: 2500, r0: 3000, r1: 3800, sites: null, off: 0, n: 0, LAVA: REGIONS.findIndex((r) => r.key === 'lava') };
function outerSites() {
  if (OUTER.sites) return OUTER.sites;
  const c = OUTER.cell, n = Math.ceil((CITY.R + 1600) / c) + 1, sites = []; OUTER.off = n; OUTER.n = n * 2 + 1;
  for (let gy = -n; gy <= n; gy++) for (let gx = -n; gx <= n; gx++) {
    const sx = (gx + 0.15 + hash2(gx * 3 + 1, gy * 5 + 2) * 0.7) * c, sy = (gy + 0.15 + hash2(gx * 7 - 3, gy * 11 + 4) * 0.7) * c, r = Math.hypot(sx, sy), q = hash2(gx + 71, gy - 33);
    const lavaP = 0.02 + smooth01g(5000, 10000, r) * 0.2; let ri;
    if (q < lavaP) ri = OUTER.LAVA; else if (q < lavaP + 0.5) ri = Math.floor(regionF(sx, sy)) % NREG_IN; else ri = Math.floor(hash2(gx - 5, gy + 9) * NREG_IN) % NREG_IN;
    sites.push([sx, sy, ri]);
  }
  // a lava field always smoulders beyond the Cinderreach, close enough to find
  { const [tx, ty] = polar(5600, regionAngle(6)); let best = null, bd = 1e18; for (const s of sites) { const d = (s[0] - tx) ** 2 + (s[1] - ty) ** 2; if (d < bd) { bd = d; best = s; } } best[2] = OUTER.LAVA; }
  OUTER.sites = sites; return sites;
}
const RMIX = [0, 0, 0, 0, 0, 0, 0, 0];
// up to four (region, weight) pairs for a point: angular inner lands, patchwork outer lands, soft borders
function regionMix(x, y) {
  const M = RMIX, r = Math.hypot(x, y), t = smooth01g(OUTER.r0, OUTER.r1, r);
  M[1] = M[3] = M[5] = M[7] = 0;
  if (t < 1) { const f = regionF(x, y), i = Math.floor(f) % NREG_IN, fr = f - Math.floor(f), edge = 0.12; let wn = 0, n = i;
    if (fr > 1 - edge) { n = (i + 1) % NREG_IN; wn = smooth01g(1 - edge, 1 + edge, fr); } else if (fr < edge) { n = (i + NREG_IN - 1) % NREG_IN; wn = 1 - smooth01g(-edge, edge, fr); }
    M[0] = i; M[1] = (1 - wn) * (1 - t); M[2] = n; M[3] = wn * (1 - t); }
  if (t > 0) { const S = outerSites(), c = OUTER.cell;
    const wx = x + (vnoise(x / 1300 + 20, y / 1300) - 0.5) * 1500 + (vnoise(x / 320, y / 320 + 40) - 0.5) * 260, wy = y + (vnoise(x / 1300, y / 1300 + 60) - 0.5) * 1500 + (vnoise(x / 320 + 80, y / 320) - 0.5) * 260;
    const gx = Math.floor(wx / c), gy = Math.floor(wy / c); let d1 = 1e18, d2 = 1e18, s1 = null, s2 = null;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const X = gx + i + OUTER.off, Y = gy + j + OUTER.off; if (X < 0 || Y < 0 || X >= OUTER.n || Y >= OUTER.n) continue; const s = S[Y * OUTER.n + X], d = (s[0] - wx) ** 2 + (s[1] - wy) ** 2;
      if (d < d1) { d2 = d1; s2 = s1; d1 = d; s1 = s; } else if (d < d2) { d2 = d; s2 = s; } }
    if (s1) { const gap = Math.sqrt(d2) - Math.sqrt(d1), w2 = s2 && s2[2] !== s1[2] ? 0.5 * (1 - smooth01g(0, 420, gap)) : 0;
      M[4] = s1[2]; M[5] = (1 - w2) * t; M[6] = s2 ? s2[2] : s1[2]; M[7] = w2 * t; } }
  return M;
}
/* discovery: region names and resources stay hidden until the player explores them */
function isDiscovered(i) { return !!(W.player && W.player.region === i) || !!(typeof S !== 'undefined' && S && S.discovered && S.discovered[i]); }
function discoverRegion(i, quiet) { if (isDiscovered(i)) return false; S.discovered = S.discovered || {}; S.discovered[i] = true; if (!quiet && typeof toast === 'function') toast(`🗺️ Discovered ${REGIONS[i].icon} ${REGIONS[i].name}!`); if (typeof save === 'function') save(); return true; }
function regionName(i) { return isDiscovered(i) ? REGIONS[i].name : 'the unexplored lands'; }
function regionAt(x, y) { const M = regionMix(x, y); let b = M[0], bw = M[1]; for (let k = 2; k < 8; k += 2) if (M[k + 1] > bw) { bw = M[k + 1]; b = M[k]; } return b; }
function regionAngle(i) { return ((i + 0.5) / NREG_IN) * TAU - Math.PI; }
function hollowR(a) { let r = 1; for (const [k, amp, ph] of W.hTerms) r += amp * Math.sin(k * a + ph); return CITY.hollowR * r; }
function hollowDist(x, y) { return Math.hypot(x, y) - hollowR(Math.atan2(y, x)); } // >0 outside
function ringR(i, a) { const [p1, p2] = W.ringPh[i]; return CITY.ringRoads[i] + 40 * Math.sin(3 * a + p1) + 22 * Math.sin(5 * a + p2); }
function lakeR(a) { let r = 1; for (const [k, amp, ph] of W.lakeTerms) r += amp * Math.sin(k * a + ph); return W.lake.r * r; }
function inLake(x, y, m) { const dx = x - W.lake.x, dy = y - W.lake.y; return Math.hypot(dx, dy) < lakeR(Math.atan2(dy, dx)) + (m || 0); }

/* segment grid for chasm/river distance queries */
function segGridAdd(grid, seg, cell) {
  const pad = seg.w / 2 + 2;
  const x0 = Math.floor((Math.min(seg.x1, seg.x2) - pad) / cell), x1 = Math.floor((Math.max(seg.x1, seg.x2) + pad) / cell);
  const y0 = Math.floor((Math.min(seg.y1, seg.y2) - pad) / cell), y1 = Math.floor((Math.max(seg.y1, seg.y2) + pad) / cell);
  for (let gx = x0; gx <= x1; gx++) for (let gy = y0; gy <= y1; gy++) { const k = gx + ',' + gy; (grid.get(k) || grid.set(k, []).get(k)).push(seg); }
}
function segGridDist(grid, cell, x, y) { // distance to nearest edge (negative = inside)
  const gx = Math.floor(x / cell), gy = Math.floor(y / cell); let best = 1e9;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const arr = grid.get((gx + i) + ',' + (gy + j)); if (!arr) continue;
    for (const s of arr) { const [d, t] = distSeg(x, y, s.x1, s.y1, s.x2, s.y2); const w = s.w1 + (s.w2 - s.w1) * t; const e = d - w / 2; if (e < best) best = e; } }
  return best;
}
const chasmDist = (x, y) => segGridDist(W.crackGrid, 160, x, y);
const riverDist = (x, y) => segGridDist(W.riverGrid, 160, x, y);
function isWet(x, y, m) { return inLake(x, y, m) || riverDist(x, y) < (m || 0); }

/* occupancy grids */
const OCC = { cell: 16, n: 0, off: 0 };
function occInit() { OCC.n = Math.ceil((CITY.R + 800) * 2 / OCC.cell); OCC.off = CITY.R + 800; OCC.road = new Uint8Array(OCC.n * OCC.n); OCC.obj = new Uint8Array(OCC.n * OCC.n); }
function occIter(x, y, r, fn) {
  const c = OCC.cell, x0 = Math.floor((x - r + OCC.off) / c), x1 = Math.floor((x + r + OCC.off) / c), y0 = Math.floor((y - r + OCC.off) / c), y1 = Math.floor((y + r + OCC.off) / c);
  for (let gx = x0; gx <= x1; gx++) for (let gy = y0; gy <= y1; gy++) { if (gx < 0 || gy < 0 || gx >= OCC.n || gy >= OCC.n) continue;
    const cx = gx * c - OCC.off + c / 2, cy = gy * c - OCC.off + c / 2; if ((cx - x) ** 2 + (cy - y) ** 2 > (r + c * 0.5) ** 2) continue; if (fn(gx * OCC.n + gy) === false) return false; }
  return true;
}
const occMark = (g, x, y, r) => occIter(x, y, r, (i) => { g[i] = 1; });
const occFree = (g, x, y, r) => occIter(x, y, r, (i) => (g[i] ? false : true));

/* ---------- names ---------- */
const NM = {
  a: ['Ves', 'Kor', 'Ash', 'Bri', 'Tam', 'Mor', 'Lio', 'Ren', 'Sab', 'Fen', 'Oda', 'Quil', 'Har', 'Iv', 'Jor', 'Nel', 'Pell', 'Rook', 'Sil', 'Tov', 'Ula', 'Wex', 'Yar', 'Zel', 'Cal', 'Dun', 'Eli', 'Gav', 'Mae', 'Thes', 'Bram', 'Cora', 'Dov', 'Isk'],
  b: ['sa', 'rin', 'lyn', 'dle', 'ric', 'ow', 'ka', 'vin', 'eth', 'a', 'os', 'wyn', 'mar', 'ette', 'is', 'und', 'ra', 'el', 'ock', 'ith', 'ley', 'ana', 'ius', 'o'],
  sur: ['Morrow', 'Vane', 'Holloway', 'Ashgrove', 'Tallow', 'Wick', 'Deepwater', 'Ropewright', 'Brindle', 'Kettle', 'Marsh', 'Cindervale', 'Lark', 'Thorne', 'Gale', 'Fernsby'],
  adj: ['Deep', 'Lantern', 'Moss', 'Rope', 'Hollow', 'Ember', 'Quiet', 'Amber', 'Salt', 'Glass', 'Iron', 'Pale', 'Wick', 'Tether', 'Rim', 'Mothlit', 'Cinder', 'Gloam'],
  noun: ['diver', 'fang', 'wright', 'keeper', 'runner', 'moth', 'wolf', 'song', 'hook', 'lark', 'smith', 'born', 'walker', 'sage', 'bell', 'heart', 'fox'],
  pa: ['Brindle', 'Cinder', 'Moth', 'Hush', 'Salt', 'Glim', 'Fern', 'Kettle', 'Thorn', 'Wick', 'Ash', 'Gull', 'Lark', 'Rook', 'Bell', 'Ember', 'Mire', 'Copper', 'Tallow', 'Dusk', 'Hearth', 'Gloam', 'Pebble', 'Sorrel'],
  pb: ['wick', 'gate', 'court', 'rest', 'reach', 'mere', 'watch', 'fold', 'croft', 'stead', 'ledge', 'spire', 'end', 'nook', 'row', 'well'],
};
function makeOwner(rnd, used) {
  for (let tries = 0; tries < 20; tries++) {
    const p = (a) => a[Math.floor(rnd() * a.length)];
    const k = rnd(); let n;
    if (k < 0.35) n = p(NM.a) + p(NM.b);
    else if (k < 0.6) n = p(NM.a) + p(NM.b) + ' ' + p(NM.sur);
    else if (k < 0.85) n = p(NM.adj) + p(NM.noun);
    else n = p(NM.adj) + p(NM.noun) + (10 + Math.floor(rnd() * 89));
    if (!used.has(n)) { used.add(n); return n; }
  }
  return 'Delver' + Math.floor(rnd() * 9999);
}
const PET_KINDS = ['pup', 'wisp', 'moth', 'ferret', 'tortoise', 'kit'];
const PET_NAMES = { pup: 'Moss Pup', wisp: 'Chalk Wisp', moth: 'Amber Moth', ferret: 'Bellows Ferret', tortoise: 'Shellback calf', kit: 'Lanternkit' };
const LAYER_COLORS = ['#d9b46a', '#7fb07a', '#c08a4a', '#b0573a'];

/* ---------- generation ---------- */
function generateCity() {
  const t0 = performance.now();
  const rnd = mulberry32(CITY.seed);
  const R = CITY.R;
  W.hTerms = [[2, 0.05, rnd() * TAU], [3, 0.07, rnd() * TAU], [5, 0.045, rnd() * TAU], [8, 0.03, rnd() * TAU], [13, 0.018, rnd() * TAU], [21, 0.01, rnd() * TAU]];
  W.hollowPts = []; for (let i = 0; i < 240; i++) { const a = (i / 240) * TAU - Math.PI; W.hollowPts.push(polar(hollowR(a), a)); }
  W.ringPh = CITY.ringRoads.map(() => [rnd() * TAU, rnd() * TAU]);
  occInit();

  // Lake (Mirrorlake Docks) + river spilling into the Hollow
  const la = regionAngle(0) + 0.05;
  W.lake = { x: Math.cos(la) * 1330, y: Math.sin(la) * 1330, r: 250 };
  W.lakeTerms = [[2, 0.12, rnd() * TAU], [3, 0.08, rnd() * TAU], [5, 0.05, rnd() * TAU]];
  W.lakePts = []; for (let i = 0; i < 90; i++) { const a = (i / 90) * TAU; const r = lakeR(a); W.lakePts.push([W.lake.x + Math.cos(a) * r, W.lake.y + Math.sin(a) * r]); }
  W.river = []; { let p = [W.lake.x * 0.82, W.lake.y * 0.82]; const end = polar(hollowR(la - 0.03) - 30, la - 0.03); for (let i = 0; i <= 12; i++) { const u = i / 12; W.river.push([p[0] + (end[0] - p[0]) * u + Math.sin(u * 9) * 22 * (1 - u), p[1] + (end[1] - p[1]) * u + Math.cos(u * 7) * 18 * (1 - u)]); } }
  W.riverGrid = new Map(); for (let i = 0; i < W.river.length - 1; i++) segGridAdd(W.riverGrid, { x1: W.river[i][0], y1: W.river[i][1], x2: W.river[i + 1][0], y2: W.river[i + 1][1], w: 40, w1: 40, w2: 46 }, 160);

  // Cracks: wide side-chasms + narrow fissures, branching outward
  W.cracks = []; W.crackGrid = new Map();
  const addCrack = (x, y, ang, len, w0, w1, depth, o) => {
    o = o || {}; const step = 36, n = Math.max(3, Math.ceil(len / step)); const pts = [[x, y]], ws = [w0]; let a = ang, cx = x, cy = y;
    for (let i = 1; i <= n; i++) { const rad = Math.atan2(cy, cx) + (o.inward ? Math.PI : 0); a += (rnd() - 0.5) * 0.55; { let d = rad - a; d = ((d + 3 * Math.PI) % TAU) - Math.PI; a += d * (o.bias == null ? 0.15 : o.bias); } cx += Math.cos(a) * step; cy += Math.sin(a) * step;
      if (Math.hypot(cx, cy) > R - 140 || (o.inward && hollowDist(cx, cy) < 160)) break; pts.push([cx, cy]); ws.push(w0 + (w1 - w0) * (i / n)); }
    const c = { pts, ws, wide: w0 > 60, depth, glow: !!o.glow, outer: !!o.outer }; W.cracks.push(c);
    for (let i = 0; i < pts.length - 1; i++) segGridAdd(W.crackGrid, { x1: pts[i][0], y1: pts[i][1], x2: pts[i + 1][0], y2: pts[i + 1][1], w: Math.max(ws[i], ws[i + 1]), w1: ws[i], w2: ws[i + 1] }, 160);
    if (depth < 2) { const nb = c.wide ? 3 : 1; for (let b = 0; b < nb; b++) if (rnd() < 0.7 && pts.length > 6) { const j = Math.floor(pts.length * (0.3 + rnd() * 0.5)); const side = rnd() < 0.5 ? -1 : 1; addCrack(pts[j][0], pts[j][1], a + side * (0.6 + rnd() * 0.6), len * (0.3 + rnd() * 0.3), ws[j] * 0.45, 2, depth + 1, { glow: o.glow, bias: o.bias }); } }
    return c;
  };
  const crackAngles = [];
  const wideAt = [regionAngle(2) + 0.1, regionAngle(4) - 0.05, regionAngle(6) + 0.12];
  // the great chasms run from the Hollow far out into the lands
  for (const a of wideAt) { crackAngles.push(a); addCrack(...polar(hollowR(a) - 30, a), a, 4200 + rnd() * 2600, 130 + rnd() * 30, 30, 0, { glow: true }); }
  for (let i = 0; i < 10; i++) { let a; do { a = rnd() * TAU - Math.PI; } while (crackAngles.some((b) => Math.abs(((a - b + 3 * Math.PI) % TAU) - Math.PI) < 0.22) || Math.abs(((a - la + 3 * Math.PI) % TAU) - Math.PI) < 0.3);
    crackAngles.push(a); addCrack(...polar(hollowR(a) - 15, a), a, 700 + rnd() * 1600, 22 + rnd() * 22, 3, 0); }
  // out in the far lands the earth is splitting open: fissure systems that point back toward the Hollow; some breathe Lumen
  W.rifts = [];
  for (let i = 0, made = 0; i < 400 && made < 34; i++) { const a = rnd() * TAU - Math.PI, r = 4200 + Math.sqrt(rnd()) * (R - 5200), [x, y] = polar(r, a);
    if (W.cracks.some((c) => c.depth === 0 && Math.hypot(c.pts[0][0] - x, c.pts[0][1] - y) < 1500)) continue; made++;
    const inward = rnd() < 0.6, glow = rnd() < 0.4, w0 = 34 + rnd() * 48;
    addCrack(x, y, a + (inward ? Math.PI : 0) + (rnd() - 0.5) * 0.6, 1100 + rnd() * 2200, w0, 4, 0, { inward, glow, bias: 0.08, outer: true }); }
  // lava: cracks that run through the Emberwound fill with molten rock, which seeps out across the ground in flows
  W.lavaFlows = [];
  const lavaFlow = (x, y, a, len, w0, stopOcc) => { const pts = [[x, y]], ws = [w0]; const n = Math.ceil(len / 22);
    for (let i = 1; i <= n; i++) { a += (rnd() - 0.5) * 0.7; const nx = x + Math.cos(a) * 22, ny = y + Math.sin(a) * 22; if (regionAt(nx, ny) !== OUTER.LAVA || Math.hypot(nx, ny) > R - 160 || (stopOcc && !occFree(OCC.obj, nx, ny, 4))) break; x = nx; y = ny; pts.push([x, y]); ws.push(w0 * (1 - 0.8 * i / n) + 2); }
    if (pts.length < 3) return null; const f = { pts, ws, bbox: bboxOf(pts, w0 + 30), ph: rnd() * TAU }; W.lavaFlows.push(f); for (const p of pts) occMark(OCC.obj, p[0], p[1], w0 * 0.6 + 4); return f; };
  for (const c of W.cracks) { let nl = 0; for (const p of c.pts) if (regionAt(p[0], p[1]) === OUTER.LAVA) nl++; c.lava = false && nl > c.pts.length * 0.4; if (c.lava) { c.glow = false;
      const nf = 1 + Math.floor(rnd() * 3 + c.pts.length / 30); for (let k = 0; k < nf; k++) { const j = 1 + Math.floor(rnd() * (c.pts.length - 2)), p = c.pts[j], q = c.pts[j + 1]; const ang = Math.atan2(q[1] - p[1], q[0] - p[0]) + (rnd() < 0.5 ? 1 : -1) * (1.2 + rnd() * 0.6), off = c.ws[j] / 2 + 2;
        lavaFlow(p[0] + Math.cos(ang) * off, p[1] + Math.sin(ang) * off, ang, 160 + rnd() * 420, 9 + rnd() * 10); } } }
  W.bridges = [];
  for (const c of W.cracks) { if (c.depth > 1) continue; for (let i = 6; i < c.pts.length - 4; i += 12 + Math.floor(rnd() * 6)) { const w = c.ws[i]; if (w < 18 || Math.hypot(c.pts[i][0], c.pts[i][1]) < CITY.hollowR + 200) continue;
    const p = c.pts[i - 1], q = c.pts[i + 1], ang = Math.atan2(q[1] - p[1], q[0] - p[0]) + Math.PI / 2, L = w / 2 + 22, m = c.pts[i];
    W.bridges.push({ p: [m[0] - Math.cos(ang) * L, m[1] - Math.sin(ang) * L], q: [m[0] + Math.cos(ang) * L, m[1] + Math.sin(ang) * L], w: Math.min(26, 14 + w * 0.08) }); } }
  for (const b of W.bridges) { b.bbox = bboxOf([b.p, b.q], 30); occMark(OCC.obj, b.p[0], b.p[1], 18); occMark(OCC.obj, b.q[0], b.q[1], 18); }
  W.rifts = W.cracks.filter((c) => c.outer && c.depth === 0 && c.glow && !c.lava && c.pts.length > 6).slice(0, 10);
  // Polygon outlines for cracks
  for (const c of W.cracks) { const L = [], Rr = []; for (let i = 0; i < c.pts.length; i++) { const p = c.pts[i], q = c.pts[Math.min(i + 1, c.pts.length - 1)], o = c.pts[Math.max(i - 1, 0)];
      const ang = Math.atan2(q[1] - o[1], q[0] - o[0]), nx = -Math.sin(ang), ny = Math.cos(ang), w = c.ws[i] / 2 * (0.85 + hash2(i, c.pts.length) * 0.3);
      L.push([p[0] + nx * w, p[1] + ny * w]); Rr.push([p[0] - nx * w, p[1] - ny * w]); }
    c.poly = L.concat(Rr.reverse()); c.bbox = bboxOf(c.poly, 20); }

  // No roads: the city grows organically in clusters around the Hollow and out across the lands
  W.roads = []; W.lamps = []; W.plazas = [];
  W.civic = []; W.markets = []; W.vaults = [];
  const siteOK = (x, y, rr) => hollowDist(x, y) > 120 && chasmDist(x, y) > rr && !isWet(x, y, rr) && occFree(OCC.obj, x, y, rr);
  if (CITY.functional) { // bazaars and public vaults are not on the map any more
  REGIONS.forEach((reg, ri) => { if (reg.outer) return;
    for (let tries = 0; tries < 40; tries++) { const a = regionAngle(ri) + (rnd() - 0.5) * 0.35, r = 1500 + rnd() * 700, [x, y] = polar(r, a); if (regionAt(x, y) !== ri || !siteOK(x, y, 80)) continue;
      const m = { type: 'market', x, y, r: 66, region: ri, name: `${reg.name.split(' ')[0]} Bazaar`, idx: W.markets.length, stalls: [] };
      for (let k = 0; k < 10; k++) { const ang = (k / 10) * TAU + rnd() * 0.2; m.stalls.push({ a: ang, c: ['#c8634c', '#e2b04a', '#4f8c8a', '#7a5fa0', '#d98a3a'][Math.floor(rnd() * 5)] }); }
      W.markets.push(m); W.civic.push(m); occMark(OCC.obj, x, y, 80); break; } });
  { const best = outerSites().filter((s) => s[2] === OUTER.LAVA && Math.hypot(s[0], s[1]) > 4300).sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]))[0];
    for (let tries = 0; best && tries < 160; tries++) { const x = best[0] + (rnd() - 0.5) * 1800, y = best[1] + (rnd() - 0.5) * 1800; if (regionAt(x, y) !== OUTER.LAVA || Math.hypot(x, y) > R - 300 || !siteOK(x, y, 80)) continue;
      const m = { type: 'market', x, y, r: 66, region: OUTER.LAVA, name: 'Cinderglass Bazaar', idx: W.markets.length, stalls: [] };
      for (let k = 0; k < 10; k++) m.stalls.push({ a: (k / 10) * TAU + rnd() * 0.2, c: ['#c8634c', '#e2b04a', '#3a2e2c', '#d98a3a'][Math.floor(rnd() * 4)] });
      W.markets.push(m); W.civic.push(m); occMark(OCC.obj, x, y, 80); break; } }
  const vaultNames = ['The Deepcoin Vault', 'Old Ledger Vault', 'Gullwing Strongrooms', 'The Amber Coffers', 'Marrow & Daughters Vault', 'Undercliff Depository'];
  for (let k = 0; k < 6; k++) for (let tries = 0; tries < 40; tries++) { const a = rnd() * TAU - Math.PI, r = (rnd() < 0.5 ? 1100 : 2600) + rnd() * 200, [x, y] = polar(r, a); if (!siteOK(x, y, 58)) continue;
    const v = { type: 'vault', x, y, r: 44, region: regionAt(x, y), name: vaultNames[k], idx: W.vaults.length }; W.vaults.push(v); W.civic.push(v); occMark(OCC.obj, x, y, 58); break; }
  }
  // Tether lift towers on the lip, cables into the Hollow
  W.lifts = []; const liftNames = ['North Spine', 'Gullhook Lift', 'Old Maddox\'s Lift', 'Lantern Ladder', 'Cinder Drop', 'Saltline', 'Mothwing Lift', 'Greystone Spine', 'Rootfall Express', 'Brindle Drop', 'Amber Spine', 'The Long Rope', 'Hushline', 'Glassline'];
  for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU - Math.PI + (rnd() - 0.5) * 0.15; const [x, y] = polar(hollowR(a) + 28, a);
    if (chasmDist(x, y) < 30 || isWet(x, y, 30)) continue;
    const [bx, by] = polar(hollowR(a) * (0.32 + rnd() * 0.25), a + (rnd() - 0.5) * 0.3);
    const L = { type: 'lift', x, y, r: 18, bx, by, a, name: liftNames[i], region: regionAt(x, y), phase: rnd() * TAU, speed: 0.12 + rnd() * 0.1 }; W.lifts.push(L); W.civic.push(L); occMark(OCC.obj, x, y, 24); }
  // Cranes over the wide chasms
  W.cranes = []; for (const c of W.cracks) if (c.wide) for (const f of [0.35, 0.65]) { const i = Math.floor(c.pts.length * f), p = c.pts[i], q = c.pts[i + 1] || p; const ang = Math.atan2(q[1] - p[1], q[0] - p[0]) + Math.PI / 2, w = c.ws[i] / 2 + 26;
    const base = [p[0] + Math.cos(ang) * w, p[1] + Math.sin(ang) * w]; W.cranes.push({ x: base[0], y: base[1], ang: ang + Math.PI, len: w * 2 - 10, phase: rnd() * TAU }); occMark(OCC.obj, base[0], base[1], 22); }

  // Landmarks with lore
  W.landmarks = [];
  const lmAt = (a, dr, type, name, r) => { const [x, y] = polar(hollowR(a) + dr, a); const lm = { type, x, y, r, name, a, region: regionAt(x, y) }; W.landmarks.push(lm); W.civic.push(lm); occMark(OCC.obj, x, y, r + 14); return lm; };
  lmAt(regionAngle(7) + 0.22, 150, 'statue', 'Statue of Aurel Vane, First to Descend', 26);
  lmAt(regionAngle(8) - 0.2, 150, 'memorial', 'The Wall of Lanterns Out', 40);
  { const c = W.cracks.find((k) => k.wide && k.pts.length > 10); const e = c.pts[c.pts.length - 1], q = c.pts[c.pts.length - 3]; const ang = Math.atan2(e[1] - q[1], e[0] - q[0]);
    const x = e[0] + Math.cos(ang) * 46, y = e[1] + Math.sin(ang) * 46; const lm = { type: 'gate', x, y, r: 34, name: 'The Undergate', a: ang, region: regionAt(x, y) }; W.landmarks.push(lm); W.civic.push(lm); occMark(OCC.obj, x, y, 52); }

  const riftNames = ['The Lumen Throat', 'Glimmerdrop', 'The Breathing Rift', 'Old Delver\'s Mouth', 'The Pale Stair', 'Moth Rift', 'Wickfall Cleft', 'The Second Hollow?', 'Murmur Gap', 'Lanternfall Rift'];
  W.rifts.forEach((c, i) => { const p = c.pts[0], q = c.pts[2]; const ang = Math.atan2(p[1] - q[1], p[0] - q[0]); const x = p[0] + Math.cos(ang) * 40, y = p[1] + Math.sin(ang) * 40;
    const lm = { type: 'rift', x, y, r: 30, name: riftNames[i % riftNames.length], a: ang, crack: c, region: regionAt(x, y) }; c.mouth = lm; W.landmarks.push(lm); W.civic.push(lm); occMark(OCC.obj, x, y, 60); });

  // Mountains: a ring of peaks round the edge of the world and a few ridges that split the outer districts
  W.mountains = [];
  const addMtn = (x, y, r) => { if (hollowDist(x, y) < 900 || chasmDist(x, y) < r * 0.5 || isWet(x, y, r)) return; const m = { type: 'mountain', x, y, r, layer: 1, seed: rnd(), spr: 'mtn_' + Math.floor(rnd() * 9) }; W.mountains.push(m); occMark(OCC.obj, x, y, r * 0.8); };
  for (let row = 0; row < 3; row++) { const rr = R - 260 - row * 520, n = Math.floor(TAU * rr / (420 + row * 60)); for (let i = 0; i < n; i++) { if (row === 2 && rnd() < 0.45) continue; const a = (i + rnd() * 0.6) / n * TAU; addMtn(Math.cos(a) * (rr + (rnd() - 0.5) * 200), Math.sin(a) * (rr + (rnd() - 0.5) * 200), 200 + rnd() * 140 - row * 25); } }
  for (let k = 0; k < 9; k++) { let a = rnd() * TAU, r = 4600 + rnd() * 4400; const da = (rnd() < 0.5 ? 1 : -1) * (0.04 + rnd() * 0.03), dr = (rnd() - 0.5) * 120, n = 6 + Math.floor(rnd() * 10);
    for (let i = 0; i < n; i++) { a += da; r += dr; addMtn(Math.cos(a) * r + (rnd() - 0.5) * 120, Math.sin(a) * r + (rnd() - 0.5) * 120, 150 + rnd() * 120); } }
  W.mountains.sort((p, q) => p.y - q.y);

  // Homes (Lanternholds): a dense old city around the Hollow that thins outward, plus villages in the far lands
  W.homes = []; const used = new Set();
  const addHome = (x, y, face, lvlBias) => {
    const level = Math.max(1, Math.min(40, Math.floor(1 + 39 * Math.pow(rnd(), 2.3 + (lvlBias || 0)))));
    const size = 22 + level * 0.55 + rnd() * 6, rad = size * 0.62;
    if (hollowDist(x, y) < 150 || Math.hypot(x, y) > CITY.R - 90 || chasmDist(x, y) < rad + 8 || isWet(x, y, rad + 6) || !occFree(OCC.obj, x, y, rad + 3)) return null;
    const region = regionAt(x, y), reg = REGIONS[region];
    const style = reg.styles[Math.floor(rnd() * reg.styles.length)];
    const base = hexRgb(reg.roofs[Math.floor(rnd() * reg.roofs.length)]), lf = 0.9 + rnd() * 0.2;
    const h = { id: W.homes.length, x, y, ang: face, size, level, region, style,
      roofL: shade(base, lf * 1.12), roofD: shade(base, lf * 0.78), roof: shade(base, lf),
      owner: makeOwner(rnd, used), name: NM.pa[Math.floor(rnd() * NM.pa.length)] + NM.pb[Math.floor(rnd() * NM.pb.length)] + ' ' + CITY.homeTerm,
      power: Math.round((10 + level * 9) * (0.85 + rnd() * 0.3)),
      banners: Math.min(4, Math.floor(level / 8 + rnd() * 1.5)), trophies: rnd() < 0.25 + level / 80 ? 1 + Math.floor(rnd() * Math.min(5, level / 6 + 1)) : 0,
      battered: rnd() < 0.12, pet: rnd() < CITY.homePetShare ? PET_KINDS[Math.floor(rnd() * PET_KINDS.length)] : null, petPhase: rnd() * TAU, petSleep: true,
      lanternPhase: rnd() * TAU, wing: level > 12 ? (rnd() < 0.5 ? -1 : 1) : 0, tower: level > 24 };
    W.homes.push(h); occMark(OCC.obj, x, y, rad + 2); return h;
  };
  // the metropolis: homes packed shoulder to shoulder around the Hollow, thinning into dense districts between the
  // mountains and crevices of the outer lands. Tall, high-level homes crowd the lip.
  W.villages = [];
  for (let gx = -R; gx < R; gx += 60) for (let gy = -R; gy < R; gy += 60) {
    const x = gx + rnd() * 34, y = gy + rnd() * 34, r = Math.hypot(x, y), q = rnd(); if (r > R - 300) continue;
    const dist = vnoise(x / 1300 + 3, y / 1300 - 8), lane = vnoise(x / 260 + 40, y / 260);
    let p = r < 3800 ? 0.92 : 0.12 + 0.8 * smooth01g(0.36, 0.56, dist);
    if (lane < 0.22) p *= 0.35; // little squares and gaps
    if (q > p) continue;
    addHome(x, y, Math.atan2(-y, -x) + (rnd() - 0.5) * 0.8, r < 1700 ? -1.3 : r < 3000 ? -0.6 : 0.3);
  }
  // The player's Lanternhold: Lanternmoss Gardens, near the second ring
  { const ra = regionAngle(7); let best = null, bd = 1e9; for (const h of W.homes) { if (h.region !== 7) continue; const d = Math.abs(Math.hypot(h.x, h.y) - 1580) + Math.abs(((Math.atan2(h.y, h.x) - ra + 3 * Math.PI) % TAU) - Math.PI) * 900; if (d < bd) { bd = d; best = h; } }
    best.isPlayer = true; best.owner = 'You'; best.name = 'Your ' + CITY.homeTerm; best.size = 40; best.style = 3; best.wing = 1; best.tower = true; W.player = best; }

  // Region scenery (decals on the ground + objects)
  W.objs = [];
  const add = (o) => { W.objs.push(o); return o; };
  W.windmills = []; W.chimneys = []; W.crystals = []; W.mines = []; W.posts = []; W.kilns = []; W.piers = [];
  W.vents = []; W.lavaPools = [];
  const decorAt = (x, y) => { const r = Math.hypot(x, y);
    if (r > R - 60 || hollowDist(x, y) < 45 || chasmDist(x, y) < 10) return;
    const ri = regionAt(x, y), k = REGIONS[ri].key, q = rnd();
    const wet = isWet(x, y, 6); if (wet) return;
    const free = (rr) => occFree(OCC.road, x, y, rr * 0.7) && occFree(OCC.obj, x, y, rr);
    const deco = (o) => { if (occFree(OCC.road, x, y, (o.r || 20) * 0.5)) add(Object.assign({ x, y, layer: 0, region: ri, seed: rnd() }, o)); };
    const obj = (o) => { if (free(o.r)) { add(Object.assign({ x, y, layer: 1, region: ri, seed: rnd() }, o)); occMark(OCC.obj, x, y, o.r); return true; } return false; };
    if (k === 'docks') { if (inLake(x, y, 90)) { if (q < 0.5) deco({ type: 'reeds', r: 14 }); } else if (q < 0.3) obj({ type: 'tree', r: 14 + rnd() * 6 }); else if (q < 0.35) obj({ type: 'rock', r: 9 }); }
    else if (k === 'dunes') { if (q < 0.32) deco({ type: 'dune', r: 40 + rnd() * 30, a: rnd() * TAU }); else if (q < 0.36) obj({ type: 'palm', r: 12 }); else if (q < 0.41) obj({ type: 'rock', r: 9 }); else if (q < 0.425 && obj({ type: 'kiln', r: 18 })) W.kilns.push(W.objs[W.objs.length - 1]); }
    else if (k === 'bluffs') { if (q < 0.13) deco({ type: 'cliff', r: 50 + rnd() * 40, a: rnd() * TAU }); else if (q < 0.33) obj({ type: 'boulder', r: 10 + rnd() * 9 }); else if (q < 0.42) obj({ type: 'pine', r: 12 }); else if (q < 0.432) obj({ type: 'quarry', r: 34 }); }
    else if (k === 'wood') { if (q < 0.42) obj({ type: 'tree', r: 15 + rnd() * 9 }); else if (q < 0.7) obj({ type: 'pine', r: 13 + rnd() * 6 }); else if (q < 0.708) obj({ type: 'sawmill', r: 26 }); else if (q < 0.73) obj({ type: 'logs', r: 12 }); else if (q < 0.77) deco({ type: 'shrooms', r: 8 }); }
    else if (k === 'crystal') { if (q < 0.18) { if (obj({ type: 'crystal', r: 14 + rnd() * 8 })) W.crystals.push(W.objs[W.objs.length - 1]); } else if (q < 0.32) obj({ type: 'rock', r: 10 }); else if (q < 0.345) { if (obj({ type: 'mine', r: 22, a: rnd() * TAU })) W.mines.push(W.objs[W.objs.length - 1]); } else if (q < 0.45) deco({ type: 'scree', r: 30 }); }
    else if (k === 'farms') { if (q < 0.36) deco({ type: 'field', r: 46 + rnd() * 18, a: rnd() * Math.PI, c: rnd() }); else if (q < 0.41) obj({ type: 'hay', r: 7 }); else if (q < 0.425) { if (obj({ type: 'windmill', r: 18 })) W.windmills.push(W.objs[W.objs.length - 1]); } else if (q < 0.46) obj({ type: 'tree', r: 13 }); }
    else if (k === 'badlands') { if (q < 0.26) deco({ type: 'cracked', r: 36, a: rnd() * TAU }); else if (q < 0.32) obj({ type: 'slag', r: 18 + rnd() * 8 }); else if (q < 0.335) { if (obj({ type: 'chimney', r: 14 })) W.chimneys.push(W.objs[W.objs.length - 1]); } else if (q < 0.43) obj({ type: 'rock', r: 10 }); else if (q < 0.46) obj({ type: 'deadtree', r: 10 }); }
    else if (k === 'moss') { if (q < 0.3) deco({ type: 'mosspatch', r: 34 + rnd() * 20 }); else if (q < 0.37) { if (obj({ type: 'post', r: 6 })) W.posts.push(W.objs[W.objs.length - 1]); } else if (q < 0.53) obj({ type: 'tree', r: 14 + rnd() * 5, mossy: 1 }); else if (q < 0.55) obj({ type: 'pond', r: 22 }); }
    else if (k === 'lava') { if (q < 0.022) { deco({ type: 'lavapool', r: 26 + rnd() * 14 }); W.lavaPools.push(W.objs[W.objs.length - 1]); } else if (q < 0.07) obj({ type: 'basalt', r: 16 + rnd() * 10 }); else if (q < 0.085) { if (obj({ type: 'vent', r: 18 + rnd() * 8 })) W.vents.push(W.objs[W.objs.length - 1]); } else if (q < 0.12) obj({ type: 'obsidian', r: 14 + rnd() * 8 }); else if (q < 0.15) obj({ type: 'deadtree', r: 10 }); else if (q < 0.2) deco({ type: 'cracked', r: 36, a: rnd() * TAU }); }
    else if (k === 'amber') { if (q < 0.3) obj({ type: 'orchard', r: 12 }); else if (q < 0.42) obj({ type: 'tree', r: 15, autumn: 1 }); else if (q < 0.45) obj({ type: 'rock', r: 8 }); else if (q < 0.5) deco({ type: 'leaves', r: 26 }); }
  };
  void decorAt; // regional scenery retired: flat grass and only a handful of trees
  for (let gx = -R; gx < R; gx += 90) for (let gy = -R; gy < R; gy += 90) { const x = gx + rnd() * 80, y = gy + rnd() * 80, q = rnd(); if (q > 0.012 || Math.hypot(x, y) > R - 200 || hollowDist(x, y) < 150 || chasmDist(x, y) < 14 || isWet(x, y, 8)) continue;
    const r0 = 16 + rnd() * 8; if (!occFree(OCC.obj, x, y, r0)) continue; W.objs.push({ type: 'tree', x, y, r: r0, layer: 1, region: 0, seed: rnd() }); occMark(OCC.obj, x, y, r0); }
  for (const v of W.vents) if (rnd() < 0.7) { const a = rnd() * TAU; lavaFlow(v.x + Math.cos(a) * (v.r + 6), v.y + Math.sin(a) * (v.r + 6), a, 90 + rnd() * 220, 7 + rnd() * 6, true); }
  // Flora is scattered at paint time from a world-seeded hash (see artFlora), so it costs no memory
  // Piers on the lake shore
  for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU + rnd() * 0.3, r = lakeR(a); const x = W.lake.x + Math.cos(a) * (r - 20), y = W.lake.y + Math.sin(a) * (r - 20); const p = { type: 'pier', x, y, r: 36, a: a + Math.PI, layer: 1, seed: rnd(), region: 0 }; W.piers.push(p); W.objs.push(p); }

  // Spatial index for drawing & hit tests
  W.bucket = 256; W.buckets = new Map();
  const put = (o) => { const k = Math.floor(o.x / W.bucket) + ',' + Math.floor(o.y / W.bucket); (W.buckets.get(k) || W.buckets.set(k, []).get(k)).push(o); };
  W.homes.forEach((h) => { h.type = 'home'; h.layer = 1; h.r = h.size * 0.75; put(h); });
  W.objs.forEach(put); W.civic.forEach((c) => { c.layer = 1; put(c); });

  // Ambient life
  genLife(rnd);
  W.genMs = Math.round(performance.now() - t0);
  W.ready = true;
}
function bboxOf(pts, pad) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); } return [x0 - pad, y0 - pad, x1 + pad, y1 + pad]; }
function segIndex(rd, s) { let lo = 0, hi = rd.cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (rd.cum[m] <= s) lo = m; else hi = m; } return lo; }
function roadPos(rd, s) {
  const lo = segIndex(rd, s), hi = Math.min(lo + 1, rd.pts.length - 1); const p = rd.pts[lo], q = rd.pts[hi]; const l = (rd.cum[hi] - rd.cum[lo]) || 1, u = clamp((s - rd.cum[lo]) / l, 0, 1);
  return [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, Math.atan2(q[1] - p[1], q[0] - p[0]), rd.bridge[Math.min(lo, rd.bridge.length - 1)]];
}
function queryObjs(x0, y0, x1, y1, pad, ext) {
  const out = [], b = W.bucket; pad = pad || 140; ext = ext || 0;
  for (let gx = Math.floor((x0 - pad) / b); gx <= Math.floor((x1 + pad) / b); gx++) for (let gy = Math.floor((y0 - pad) / b); gy <= Math.floor((y1 + pad) / b); gy++) {
    const arr = W.buckets.get(gx + ',' + gy); if (!arr) continue; for (const o of arr) { const r = Math.max(o.r || 20, ext); if (o.x + r >= x0 && o.x - r <= x1 && o.y + r >= y0 && o.y - r <= y1) out.push(o); } }
  return out;
}

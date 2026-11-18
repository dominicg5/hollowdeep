
/* =====================================================================
   RIM CITY — procedural, seeded world around the Hollow
   ===================================================================== */
const CITY = {
  homeTerm: 'Ledge', functional: false, water: false,
  base: true,       // approved base only: terrain, homes, the Lumen Tree, trees, day/night, clouds (no events, NPCs, landmarks...)
  maxDepth: 99,     // the Hollow's depth levels (99 is the far goalpost)
  homeCount: 760,   // total homes on the map (one value: raise or lower it here)
  rings: 10,        // players are split into deciles by rank: ring 1 (top 10%) on the summit by the lip ... ring 10 out by the far mountains
  heartwoodSeats: 10, // the Rim's top 10 players live in the Heartwood, the giant tree rising out of the Hollow's wall (seats #1..#10)
  homeGap: 1.9,     // spacing between Ledges (x their footprint)
  summitH: 1800,    // height of the raised plateau (the summit around the Hollow) above the lowlands
     // share of homes ringing the Hollow lip; the rest form small lowland towns              // in-world name for each player's capital
  seed: 20261114,
  R: 13000, hollowR: 3000, plateauR: 5400, // the Hollow sits on a raised plateau; the cracked lowlands spread out below                // world radius, hollow base radius (world units)
  ringRoads: [1080, 1580, 2120, 2700], radialRoads: 20,
  tilePx: 256, levels: [0.015625, 0.03125, 0.0625, 0.125, 0.25, 0.5, 1, 2], maxTiles: 300,
  houseScale: 0.45, // Ledges are drawn small so the Rim feels vast (room for ~10,000 homes later); the Lumen Tree and its seat houses keep their size
  zoomMin: 0.018, zoomMax: 7, startZoom: 1.05, homeZoom: 2.3, // homeZoom: how close the Home button / Ledge focus comes (scaled to the small Ledges)
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
function plateauR(a) { let r = 1; for (const [k, amp, ph] of W.pTerms) r += amp * Math.sin(k * a + ph); return CITY.plateauR * r; }
function cliffW(a) { return 120 + 170 * Math.max(0, Math.sin(a)) + 30 * Math.sin(a * 7 + 1); } // visible cliff face: tallest on the south side, which faces the camera
function plateauDist(x, y) { return Math.hypot(x, y) - plateauR(Math.atan2(y, x)); } // >0 off the plateau top
function onCliff(x, y, m) { const a = Math.atan2(y, x), d = Math.hypot(x, y) - plateauR(a); return d > -(m || 0) - 10 && d < cliffW(a) + (m || 0); }
function lowland(x, y) { const a = Math.atan2(y, x); return Math.hypot(x, y) > plateauR(a) + cliffW(a); }
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
  W.pTerms = [[3, 0.05, rnd() * TAU], [5, 0.035, rnd() * TAU], [9, 0.02, rnd() * TAU], [17, 0.008, rnd() * TAU]];
  W.plateauPts = []; W.cliffPts = []; for (let i = 0; i < 360; i++) { const a = (i / 360) * TAU - Math.PI, r = plateauR(a); W.plateauPts.push(polar(r, a)); W.cliffPts.push(polar(r + cliffW(a), a)); }
  occInit();

  // Lake (Mirrorlake Docks) + river spilling into the Hollow
  const la = regionAngle(0) + 0.05;
  W.lake = { x: Math.cos(la) * (CITY.hollowR + 650), y: Math.sin(la) * (CITY.hollowR + 650), r: 250 };
  W.lakeTerms = [[2, 0.12, rnd() * TAU], [3, 0.08, rnd() * TAU], [5, 0.05, rnd() * TAU]];
  W.lakePts = []; for (let i = 0; i < 90; i++) { const a = (i / 90) * TAU; const r = lakeR(a); W.lakePts.push([W.lake.x + Math.cos(a) * r, W.lake.y + Math.sin(a) * r]); }
  W.river = []; { let p = [W.lake.x * 0.82, W.lake.y * 0.82]; const end = polar(hollowR(la - 0.03) - 30, la - 0.03); for (let i = 0; i <= 12; i++) { const u = i / 12; W.river.push([p[0] + (end[0] - p[0]) * u + Math.sin(u * 9) * 22 * (1 - u), p[1] + (end[1] - p[1]) * u + Math.cos(u * 7) * 18 * (1 - u)]); } }
  // no water features for now: the lake and rivers are parked far off the map (the land fills their place)
  W.lake = { x: 1e7, y: 1e7, r: 1 }; W.lakePts = [[1e7, 1e7], [1e7 + 1, 1e7], [1e7, 1e7 + 1]]; W.river = [[1e7, 1e7], [1e7 + 2, 1e7], [1e7 + 4, 1e7]];
  W.riverGrid = new Map(); for (let i = 0; i < 0; i++) segGridAdd(W.riverGrid, { x1: W.river[i][0], y1: W.river[i][1], x2: W.river[i + 1][0], y2: W.river[i + 1][1], w: 40, w1: 40, w2: 46 }, 160);

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
  for (let i = 0; i < 4; i++) { let a; do { a = rnd() * TAU - Math.PI; } while (crackAngles.some((b) => Math.abs(((a - b + 3 * Math.PI) % TAU) - Math.PI) < 0.22) || Math.abs(((a - la + 3 * Math.PI) % TAU) - Math.PI) < 0.3);
    crackAngles.push(a); addCrack(...polar(hollowR(a) - 15, a), a, 500 + rnd() * 700, 44 + rnd() * 20, 8, 0); } // opened up enough to climb down
  // out in the far lands the earth is splitting open: fissure systems that point back toward the Hollow; some breathe Lumen
  W.rifts = [];
  // the lowlands below the plateau are split by cracks that spread out from the foot of the cliffs in every direction,
  // cutting the land into plateaus; cross-cracks link them up. Frontier outposts sit where the outermost ones are still opening.
  W.radial = [];
  for (let i = 0; i < 22; i++) { const a = (i / 22) * TAU - Math.PI + (rnd() - 0.5) * 0.12; if (crackAngles.some((b) => Math.abs(((a - b + 3 * Math.PI) % TAU) - Math.PI) < 0.1)) continue;
    const r0 = plateauR(a) + cliffW(a) + 20, [x, y] = polar(r0, a); const len = (R - 900 - r0) * (0.55 + rnd() * 0.45);
    const c = addCrack(x, y, a, len, 64 + rnd() * 40, 16 + rnd() * 10, 0, { glow: rnd() < 0.45, bias: 0.1 }); c.radial = true; W.radial.push(c); }
  for (let i = 0, made = 0; i < 300 && made < 18; i++) { const a = rnd() * TAU - Math.PI, r = plateauR(a) + 900 + rnd() * (R - 2600 - plateauR(a)), [x, y] = polar(r, a);
    if (chasmDist(x, y) < 300) continue; made++;
    addCrack(x, y, a + (rnd() < 0.5 ? 1 : -1) * Math.PI / 2 + (rnd() - 0.5) * 0.5, 900 + rnd() * 1600, 30 + rnd() * 34, 6, 1, { glow: rnd() < 0.4, bias: 0, outer: true }); }
  // lava: cracks that run through the Emberwound fill with molten rock, which seeps out across the ground in flows
  W.lavaFlows = [];
  const lavaFlow = (x, y, a, len, w0, stopOcc) => { const pts = [[x, y]], ws = [w0]; const n = Math.ceil(len / 22);
    for (let i = 1; i <= n; i++) { a += (rnd() - 0.5) * 0.7; const nx = x + Math.cos(a) * 22, ny = y + Math.sin(a) * 22; if (regionAt(nx, ny) !== OUTER.LAVA || Math.hypot(nx, ny) > R - 160 || (stopOcc && !occFree(OCC.obj, nx, ny, 4))) break; x = nx; y = ny; pts.push([x, y]); ws.push(w0 * (1 - 0.8 * i / n) + 2); }
    if (pts.length < 3) return null; const f = { pts, ws, bbox: bboxOf(pts, w0 + 30), ph: rnd() * TAU }; W.lavaFlows.push(f); for (const p of pts) occMark(OCC.obj, p[0], p[1], w0 * 0.6 + 4); return f; };
  for (const c of W.cracks) { let nl = 0; for (const p of c.pts) if (regionAt(p[0], p[1]) === OUTER.LAVA) nl++; c.lava = false && nl > c.pts.length * 0.4; if (c.lava) { c.glow = false;
      const nf = 1 + Math.floor(rnd() * 3 + c.pts.length / 30); for (let k = 0; k < nf; k++) { const j = 1 + Math.floor(rnd() * (c.pts.length - 2)), p = c.pts[j], q = c.pts[j + 1]; const ang = Math.atan2(q[1] - p[1], q[0] - p[0]) + (rnd() < 0.5 ? 1 : -1) * (1.2 + rnd() * 0.6), off = c.ws[j] / 2 + 2;
        lavaFlow(p[0] + Math.cos(ang) * off, p[1] + Math.sin(ang) * off, ang, 160 + rnd() * 420, 9 + rnd() * 10); } } }
  // rivers run down from the mountains and pour into the cracks as waterfalls
  W.rivers = [W.river]; W.falls = [];
  for (let i = 0, made = 0; i < 0 && made < 7; i++) { let a = rnd() * TAU - Math.PI, r = R - 1150 - rnd() * 500; const pts = [polar(r, a)]; let ok = false, dir = a + Math.PI + (rnd() - 0.5) * 0.6;
    for (let k = 0; k < 140; k++) { const [px, py] = pts[pts.length - 1]; const toC = Math.atan2(-py, -px); let d = toC - dir; d = ((d + 3 * Math.PI) % TAU) - Math.PI; dir += d * 0.08 + (rnd() - 0.5) * 0.5;
      const q = [px + Math.cos(dir) * 40, py + Math.sin(dir) * 40]; pts.push(q); if (chasmDist(q[0], q[1]) < 4) { ok = true; break; } if (!lowland(q[0], q[1])) break; }
    if (!ok || pts.length < 12) continue; made++; W.rivers.push(pts); const e = pts[pts.length - 1], f = pts[pts.length - 3]; W.falls.push({ x: e[0], y: e[1], a: Math.atan2(e[1] - f[1], e[0] - f[0]) });
    for (let k = 0; k < pts.length - 1; k++) segGridAdd(W.riverGrid, { x1: pts[k][0], y1: pts[k][1], x2: pts[k + 1][0], y2: pts[k + 1][1], w: 30, w1: 30, w2: 30 }, 160); }
  W.bridges = [];
  for (const c of W.cracks) { if (c.depth > 1) continue; for (let i = 6; i < c.pts.length - 4; i += 12 + Math.floor(rnd() * 6)) { const w = c.ws[i]; if (w < 18 || Math.hypot(c.pts[i][0], c.pts[i][1]) < CITY.hollowR + 200) continue;
    const p = c.pts[i - 1], q = c.pts[i + 1], ang = Math.atan2(q[1] - p[1], q[0] - p[0]) + Math.PI / 2, L = w / 2 + 22, m = c.pts[i];
    W.bridges.push({ p: [m[0] - Math.cos(ang) * L, m[1] - Math.sin(ang) * L], q: [m[0] + Math.cos(ang) * L, m[1] + Math.sin(ang) * L], w: Math.min(26, 14 + w * 0.08) }); } }
  for (const b of W.bridges) { b.bbox = bboxOf([b.p, b.q], 30); occMark(OCC.obj, b.p[0], b.p[1], 18); occMark(OCC.obj, b.q[0], b.q[1], 18); }
  W.rifts = W.cracks.filter((c) => c.outer && c.glow && !c.lava && c.pts.length > 6).slice(0, 10);
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

  // Set pieces from the concept art: frontier outposts at the open ends of the radial cracks (farm patches round them),
  // Lake Falls Town draining into a fresh chasm, and the Rift Pass cleaving the mountain wall; plus stairs down the plateau cliffs
  W.outposts = []; W.sets = [];
  const opNames = ['Firstrope Camp', 'Headframe Hill', 'Brightcrack Post', 'Winchwater', 'Splitfield Camp', 'Tallow Rest', 'Newmouth Post', 'Gloamfurrow', 'Ropeyard', 'Lastlight Camp', 'Breakfield', 'Cobbler\'s Drop'];
  for (const c of W.radial) { if (W.outposts.length >= 12) break; const e = c.pts[c.pts.length - 1], q = c.pts[c.pts.length - 3]; const ang = Math.atan2(e[1] - q[1], e[0] - q[0]);
    const side = rnd() < 0.5 ? 1 : -1, x = e[0] + Math.cos(ang) * 30 + Math.cos(ang + side * Math.PI / 2) * 95, y = e[1] + Math.sin(ang) * 30 + Math.sin(ang + side * Math.PI / 2) * 95;
    if (Math.hypot(x, y) > R - 1000 || chasmDist(x, y) < 50) continue; c.glow = true; c.frontier = true;
    const lm = { type: 'outpost', x, y, r: 80, a: ang, name: opNames[W.outposts.length], region: regionAt(x, y), layer: 1 }; W.outposts.push(lm); W.landmarks = W.landmarks || []; occMark(OCC.obj, x, y, 120);
    for (let k = 0; k < 9; k++) { const fa = rnd() * TAU, fr = 150 + rnd() * 230, fx = x + Math.cos(fa) * fr, fy = y + Math.sin(fa) * fr, rr = 50 + rnd() * 26; if (chasmDist(fx, fy) < rr + 10 || !occFree(OCC.obj, fx, fy, rr * 0.9)) continue;
      W.sets.push({ type: 'field', x: fx, y: fy, r: rr, a: ang + (rnd() < 0.5 ? 0 : Math.PI / 2) + (rnd() - 0.5) * 0.3, c: rnd(), layer: 0, seed: rnd(), region: 0 }); occMark(OCC.obj, fx, fy, rr * 0.9); } }
  { let best = null; for (let i = 0; i < 400; i++) { const a = rnd() * TAU - Math.PI, r = 5600 + rnd() * 1800, [x, y] = polar(r, a); const d = chasmDist(x, y); if (d < 420 || isWet(x, y, 400)) continue; if (!best || d > best[2]) best = [x, y, d]; if (d > 700) break; }
    if (best && CITY.water) { W.lakeFalls = { type: 'falls', x: best[0], y: best[1], r: 300, name: 'Lake Falls Town', layer: 1, region: regionAt(best[0], best[1]) }; occMark(OCC.obj, best[0], best[1] - 40, 330); } }
  { const a = -Math.PI / 2 + 0.35 + (rnd() - 0.5) * 0.4, [x, y] = polar(R - 900, a); W.pass = { type: 'pass', x, y, r: 420, name: 'The Rift Pass', layer: 1, region: regionAt(x, y) }; occMark(OCC.obj, x, y - 200, 480); }
  W.stairs = [];
  for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU - Math.PI + 0.2 + (rnd() - 0.5) * 0.2, r0 = plateauR(a) - 30, r1 = plateauR(a) + cliffW(a) + 50, n = 5 + Math.round(cliffW(a) / 60), pts = [];
    for (let k = 0; k <= n; k++) { const u = k / n, r = r0 + (r1 - r0) * u, off = (k === 0 || k === n) ? 0 : (k % 2 ? 1 : -1) * 70; const t = a + off / r; pts.push(polar(r, t)); }
    if (pts.some((p) => chasmDist(p[0], p[1]) < 40)) continue; W.stairs.push({ pts, a, bbox: bboxOf(pts, 40) }); for (const p of pts) occMark(OCC.obj, p[0], p[1], 34); }
  if (CITY.base) { // approved base only: no lifts, cranes, landmarks, rift mouths, outposts, farm sets, pass, bridges or stairs
    W.lifts = []; W.cranes = []; W.landmarks = []; W.rifts = []; W.outposts = []; W.sets = []; W.pass = null; W.lakeFalls = null; W.bridges = []; W.stairs = []; W.civic = [];
    for (const c of W.cracks) { c.mouth = null; c.frontier = false; } }
  // The outdoor Exchange is retired (the Lumen Tree is the Hollow's commune now). Its old site is still worked out and kept
  // clear so the seeded map (and the Lumen Tree's footing) stays exactly where it was.
  { const a0 = regionAngle(7) + 0.42; let ex = null;
    for (let k = 0; k < 200 && !ex; k++) { const a = a0 + (k % 2 ? 1 : -1) * k * 0.01, [x, y] = polar(hollowR(a) + 430, a); if (chasmDist(x, y) < 120 || plateauDist(x, y) > -150 || !occFree(OCC.obj, x, y, 110)) continue; ex = { x, y }; }
    W.exSite = ex; W.exchange = null; if (ex) occMark(OCC.obj, ex.x, ex.y, 130); }
  // Mountains: a ring of peaks round the edge of the world and a few ridges that split the outer districts
  W.mountains = [];
  const addMtn = (x, y, r) => { if (hollowDist(x, y) < 900 || !lowland(x, y) || onCliff(x, y, r) || (W.pass && Math.hypot(x - W.pass.x, y - W.pass.y) < 700) || chasmDist(x, y) < r * 0.5 || isWet(x, y, r)) return; const m = { type: 'mountain', x, y, r, layer: 1, seed: rnd(), spr: 'mtn_' + Math.floor(rnd() * 9) }; W.mountains.push(m); occMark(OCC.obj, x, y, r * 0.8); };
  for (let row = 0; row < 3; row++) { const rr = R - 260 - row * 520, n = Math.floor(TAU * rr / (420 + row * 60)); for (let i = 0; i < n; i++) { if (row === 2 && rnd() < 0.45) continue; const a = (i + rnd() * 0.6) / n * TAU; addMtn(Math.cos(a) * (rr + (rnd() - 0.5) * 200), Math.sin(a) * (rr + (rnd() - 0.5) * 200), 200 + rnd() * 140 - row * 25); } }
  for (let row = 0; row < 3; row++) { const rr = CITY.R - 1300 - row * 650, n = Math.floor(2.2 * rr / 380); for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i / n - 0.5) * 2.2 + (rnd() - 0.5) * 0.03; if (rnd() < 0.15 * row) continue; addMtn(Math.cos(a) * (rr + (rnd() - 0.5) * 260), Math.sin(a) * (rr + (rnd() - 0.5) * 260), 260 + rnd() * 160 - row * 40); } }
  for (let k = 0; k < 6; k++) { let a = rnd() * TAU, r = CITY.plateauR + 1800 + rnd() * (CITY.R - CITY.plateauR - 3600); const da = (rnd() < 0.5 ? 1 : -1) * (0.04 + rnd() * 0.03), dr = (rnd() - 0.5) * 120, n = 6 + Math.floor(rnd() * 10);
    for (let i = 0; i < n; i++) { a += da; r += dr; addMtn(Math.cos(a) * r + (rnd() - 0.5) * 120, Math.sin(a) * r + (rnd() - 0.5) * 120, 150 + rnd() * 120); } }
  W.mountains.sort((p, q) => p.y - q.y);

  // Homes (Ledges): a dense old city around the Hollow that thins outward, plus villages in the far lands
  W.homes = []; const used = new Set();
  const addHome = (x, y, face, lvlBias) => {
    const level = Math.max(1, Math.min(40, Math.floor(1 + 39 * Math.pow(rnd(), 2.3 + (lvlBias || 0)))));
    const size = 22 + level * 0.55 + rnd() * 6, rad = size * 0.62, gap = rad * (CITY.homeGap || 1);
    if (hollowDist(x, y) < 110 || onCliff(x, y, rad + 14) || Math.hypot(x, y) > CITY.R - 90 || chasmDist(x, y) < rad + 8 || isWet(x, y, rad + 6) || !occFree(OCC.obj, x, y, gap + 3)) return null;
    const region = regionAt(x, y), reg = REGIONS[region];
    const style = reg.styles[Math.floor(rnd() * reg.styles.length)];
    const base = hexRgb(reg.roofs[Math.floor(rnd() * reg.roofs.length)]), lf = 0.9 + rnd() * 0.2;
    const h = { id: W.homes.length, x, y, ang: face, size, level, region, style,
      roofL: shade(base, lf * 1.12), roofD: shade(base, lf * 0.78), roof: shade(base, lf),
      owner: makeOwner(rnd, used), name: '', nm2: NM.pa[Math.floor(rnd() * NM.pa.length)] + NM.pb[Math.floor(rnd() * NM.pb.length)],
      power: Math.round((10 + level * 9) * (0.85 + rnd() * 0.3)),
      banners: Math.min(4, Math.floor(level / 8 + rnd() * 1.5)), trophies: rnd() < 0.25 + level / 80 ? 1 + Math.floor(rnd() * Math.min(5, level / 6 + 1)) : 0,
      battered: rnd() < 0.12, pet: rnd() < CITY.homePetShare ? PET_KINDS[Math.floor(rnd() * PET_KINDS.length)] : null, petPhase: rnd() * TAU, petSleep: true,
      lanternPhase: rnd() * TAU, wing: level > 12 ? (rnd() < 0.5 ? -1 : 1) : 0, tower: level > 24 };
    h.name = ledgeName(h.owner); W.homes.push(h); occMark(OCC.obj, x, y, gap + 2); return h;
  };
  // the metropolis: homes packed shoulder to shoulder around the Hollow, thinning into dense districts between the
  // mountains and crevices of the outer lands. Tall, high-level homes crowd the lip.
  W.villages = [];
  // Every home sits on a ring set by its owner's DEEPEST level reached in the Hollow: the deepest delvers live on the
  // lip, shallower ones further out. AI depths: most shallow, a few deep, none near the 99 goalpost.
  { const N = CITY.homeCount - 1, depths = [];
    for (let i = 0; i < N; i++) depths.push(Math.max(1, Math.min(72, 1 + Math.floor(-Math.log(1 - rnd() * 0.9999) * 9))));
    depths.sort((a, b) => b - a);
    W.heartwood = makeHeartwood(rnd);
    // ring by rank decile
    const byRing = []; for (let i = 0; i < N; i++) { const k = Math.max(1, ringForRank(i, N + 1)); (byRing[k] || (byRing[k] = [])).push(i); }
    for (let k = 0; k <= CITY.rings; k++) { const L = byRing[k]; if (!L) continue;
      // spread evenly round the ring: one slot per home, natural jitter in angle and across the band, no clumps
      const ph = rnd() * TAU, n = L.length, freeA = []; for (let q = 0; q < 1440; q++) { const a = ph + (q / 1440) * TAU, [x, y] = polar(ringR(k, a, 0.5), a); if (!underHeartwood(x, y, 250)) freeA.push(a); } // slots only round the arc clear of the Heartwood
      const da = TAU * (freeA.length / 1440) / n;
      L.forEach((i, j) => { let h = null; const a0 = freeA.length ? freeA[Math.floor(((j + 0.5) / n) * freeA.length)] : ph + j * da, u0 = 0.12 + 0.76 * ((j * 0.618034 + rnd() * 0.25) % 1);
        for (let t = 0; t < 70 && !h; t++) { const sp = Math.min(1, 0.35 + t * 0.03), a = a0 + (rnd() - 0.5) * da * 0.7 * (t < 20 ? 1 : 1 + t * 0.1), u = clamp(u0 + (rnd() - 0.5) * sp * (t < 10 ? 0.3 : 1), 0.02, 0.98);
          const [x, y] = polar(ringR(k, a, u), a); if (!ringGround(x, y, k) || underHeartwood(x, y)) continue; h = addHome(x, y, Math.atan2(-y, -x) + (rnd() - 0.5) * 0.6, k <= 1 ? -1.3 : k < 4 ? -0.6 : 0.3); }
        for (let t = 0; t < 200 && !h; t++) { const a = rnd() * TAU - Math.PI, [x, y] = polar(ringR(k, a, rnd()), a); if ((t < 120 && !ringGround(x, y, k)) || underHeartwood(x, y)) continue; h = addHome(x, y, Math.atan2(-y, -x), 0); } // rare fallback
        if (h) { h.deepest = depths[i]; h.ring = k; h.battered = false; h.banners = 0; h.trophies = 0; h.pet = null; } }); }
    // the player's home: placed by their own record (see relocatePlayer)
    let P = null; for (let k = 0; k < 400 && !P; k++) { const a = regionAngle(7) + (rnd() - 0.5) * 0.6, [x, y] = polar(CITY.plateauR + 900 + rnd() * 800, a); P = addHome(x, y, Math.atan2(-y, -x), 0); }
    P.isPlayer = true; P.owner = 'You'; P.name = 'Your ' + CITY.homeTerm; P.size = 40; P.style = 3; P.wing = 1; P.tower = true; P.deepest = 0; P.battered = false; P.banners = 0; P.trophies = 0; P.pet = null; W.player = P;
    seatHeartwood(); }

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
  for (let gx = -R; gx < R; gx += 90) for (let gy = -R; gy < R; gy += 90) { const x = gx + rnd() * 80, y = gy + rnd() * 80, q = rnd(); if (q > 0.012 || Math.hypot(x, y) > R - 200 || hollowDist(x, y) < 150 || nearHeartwood(x, y) || chasmDist(x, y) < 14 || isWet(x, y, 8)) continue;
    const r0 = 16 + rnd() * 8; if (!occFree(OCC.obj, x, y, r0)) continue; W.objs.push({ type: 'tree', x, y, r: r0, layer: 1, region: 0, seed: rnd() }); occMark(OCC.obj, x, y, r0); }
  for (let i = 0; i < 2600; i++) { const a = rnd() * TAU - Math.PI, top = rnd() < 0.45, r = top ? plateauR(a) - 30 - rnd() * 60 : plateauR(a) + cliffW(a) + 25 + rnd() * 120, [x, y] = polar(r, a);
    if (chasmDist(x, y) < 20 || isWet(x, y, 8) || nearHeartwood(x, y) || vnoise(x / 300 + 11, y / 300) < 0.5) continue; const r0 = 13 + rnd() * 8; if (!occFree(OCC.obj, x, y, r0)) continue;
    W.objs.push({ type: 'tree', x, y, r: r0, layer: 1, region: 0, seed: rnd() }); occMark(OCC.obj, x, y, r0); }
  for (const s0 of W.sets) W.objs.push(s0);
  for (const o of W.outposts) { W.landmarks.push(o); W.civic.push(o); }
  for (const o of [W.lakeFalls, W.pass]) if (o) { W.landmarks.push(o); W.mountains.push(o); } W.mountains.sort((p, q) => p.y - q.y); // big set pieces draw like mountains (no tile clipping)
  for (const v of W.vents) if (rnd() < 0.7) { const a = rnd() * TAU; lavaFlow(v.x + Math.cos(a) * (v.r + 6), v.y + Math.sin(a) * (v.r + 6), a, 90 + rnd() * 220, 7 + rnd() * 6, true); }
  // Flora is scattered at paint time from a world-seeded hash (see artFlora), so it costs no memory
  // Piers on the lake shore
  for (let i = 0; i < (CITY.water ? 9 : 0); i++) { const a = (i / 9) * TAU + rnd() * 0.3, r = lakeR(a); const x = W.lake.x + Math.cos(a) * (r - 20), y = W.lake.y + Math.sin(a) * (r - 20); const p = { type: 'pier', x, y, r: 36, a: a + Math.PI, layer: 1, seed: rnd(), region: 0 }; W.piers.push(p); W.objs.push(p); }

  if (typeof GRAND !== 'undefined') GRAND.fit(); // the Lumen Tree's streams, falls and lake: clear the water, re-house anyone standing in it
  // Spatial index for drawing & hit tests
  W.bucket = 256; W.buckets = new Map();
  const put = (o) => { const k = Math.floor(o.x / W.bucket) + ',' + Math.floor(o.y / W.bucket); (W.buckets.get(k) || W.buckets.set(k, []).get(k)).push(o); };
  W.homes.forEach((h) => { h.type = 'home'; h.layer = 1; h.r = h.size * 0.75; put(h); }); W.put = put;
  W.objs.forEach(put); W.civic.forEach((c) => { c.layer = 1; put(c); });

  // Ambient life
  if (CITY.base) { W.npcs = []; W.caravans = []; W.dayFish = []; W.nightFish = []; W.motes = []; W.visitors = []; W.walkers = []; } else genLife(rnd);
  relocatePlayer(true);
  W.genMs = Math.round(performance.now() - t0);
  W.ready = true;
}
// ring radius for a rim-proximity percentile q (0 = deepest delver, on the lip; 1 = shallowest, far out in the lowlands)
// every home is a Ledge (like a portaledge), named after its owner
function ledgeName(owner) { return `${owner}'s ${CITY.homeTerm}`; }
// rank (0-based, of total) -> ring: 0 = the Heartwood (top 10 players), 1 = summit lip (the rest of the top 10%), ... 10 = far mountains (bottom 10%)
function heartwoodCount() { return CITY.heartwoodSeats; }
function ringForRank(i, total) { if (i < heartwoodCount()) return 0; return Math.min(CITY.rings, 1 + Math.floor(i * CITY.rings / total)); }
// radius of ring k at angle a, u = 0..1 across the ring's band. Ring 1 sits on the summit; rings 2..10 spread from the foot of
// the plateau across the lowlands to the mountain slopes at the world's edge.
function ringR(k, a, u) { const hr = hollowR(a), pr = plateauR(a);
  if (k <= 1) { const r0 = hr + 160, r1 = hr + 0.55 * (pr - hr); return r0 + (r1 - r0) * u; }
  const r0 = pr + 1100, w = (CITY.R - 1500 - r0) / (CITY.rings - 1); return r0 + (k - 2 + u) * w; }
// follow the terrain: no steep slopes or cliffs; ring 1 stays on the summit, outer rings stay below it
function ringGround(x, y, k) { if (typeof M3 === 'undefined' || !M3.ground) return true; const g = M3.ground(x, y); if (g.slope > 0.33) return false;
  return k <= 1 ? g.h > CITY.summitH - 90 : g.h < CITY.summitH * 0.72; }
/* ---- the Heartwood: one colossal upright tree growing out of the Hollow's inner wall, its roots gripping the lip.
   The Rim's top 10 players live in it, in 10 fixed, numbered seats (#1 near the crown ... #10 low on the trunk). ---- */
const HW_H = 8600, HW_R0 = 1250, HW_HOUSE = 440;
// seats: [height (fraction of HW_H), angle offset from the side facing the Hollow, limb distance (0 = deck wrapped round the trunk)]
const HW_SEATS = [[0.585, 0.15, 0], [0.555, -1.25, 1650], [0.51, 1.2, 0], [0.465, -0.2, 1850], [0.415, 2.35, 0], [0.365, -1.05, 0], [0.315, 0.7, 0], [0.265, -2.3, 1600], [0.205, -0.15, 0], [0.145, 1.55, 0]];
function makeHeartwood() { let best = null, bd = -1;
  for (let a = -Math.PI / 2 - 0.9; a <= -Math.PI / 2 + 0.9; a += 0.05) { const [x, y] = polar(hollowR(a) + 40, a); let d = 1e9; for (let r = -200; r <= 1400; r += 100) { const [x2, y2] = polar(hollowR(a) + r, a); d = Math.min(d, chasmDist(x2, y2)); } for (const da of [-0.12, 0.12]) { const [x3, y3] = polar(hollowR(a + da) + 40, a + da); d = Math.min(d, chasmDist(x3, y3) * 1.5); }
    if (W.exSite) d = Math.min(d, Math.hypot(W.exSite.x - x, W.exSite.y - y) * 0.5); d -= Math.abs(a + Math.PI / 2) * 120; if (d > bd) { bd = d; best = a; } }
  const a = best, [bx, by] = polar(hollowR(a) - HW_R0 * 0.5, a); // the trunk stands against the inner wall, just inside the rim: its back half is sunk into the lip
  return { a, x: bx, y: by, H: HW_H, R0: HW_R0, base: CITY.summitH - 650, in: Math.atan2(-by, -bx), type: 'heartwood' }; }
// trunk radius at height fraction f (flared base, gently tapering), and the trunk's slightly wandering axis
function hwTrunkR(f) { const g = Math.max(0, f); return HW_R0 * (0.62 + 0.38 * Math.exp(-g * 4)) * (1 - 0.3 * Math.min(1, g)) * (f < 0 ? 1 - f * 1.2 : 1); }
function hwAxis(f) { const T = W.heartwood, g = Math.max(0, f); return [T.x + Math.sin(g * 5.1 + 0.7) * HW_H * 0.009 - Math.sin(0.7) * HW_H * 0.009, T.y + Math.sin(g * 4.3 + 2.1) * HW_H * 0.007 - Math.sin(2.1) * HW_H * 0.007]; } // nearly plumb: the roots hold it straight up
function heartwoodSlot(j) { const T = W.heartwood, S = HW_SEATS[j], f = S[0], th = T.in + S[1], [ax, ay] = hwAxis(f), r = S[2] || hwTrunkR(f) + 330;
  return { x: ax + Math.cos(th) * r, y: ay + Math.sin(th) * r, elev: T.base + f * HW_H + 20, th, f, limb: S[2] }; }
// no Ledge under the Heartwood's crown (its florets reach ~4,100 from the trunk) or on its roots: a clear disc round the tree
const HW_CLEAR = 4500; function underHeartwood(x, y, pad) { const T = W.heartwood; return !!T && Math.hypot(x - T.x, y - T.y) < HW_CLEAR + (pad || 0); }
function nearHeartwood(x, y) { const T = W.heartwood; if (!T) return false; const dx = x - T.x, dy = y - T.y, d = Math.hypot(dx, dy); return d < 2700 + 1700 * Math.max(0, -(dx * Math.cos(T.in) + dy * Math.sin(T.in)) / (d || 1)); } // clear of the trunk and the great roots spread over the lip
function moveHome(h, x, y) { if (W.buckets) { const k = Math.floor(h.x / W.bucket) + ',' + Math.floor(h.y / W.bucket), L = W.buckets.get(k); if (L) { const i = L.indexOf(h); if (i >= 0) L.splice(i, 1); } }
  h.x = x; h.y = y; if (W.put) W.put(h); }
// seat the Rim's top 10 (by deepest level) in the Heartwood: seat #N = rank #N. Anyone bumped out returns to their ground spot on ring 1.
function seatHeartwood() { const n = heartwoodCount(), B = W.homes.slice().sort((a, b) => (b.deepest - a.deepest) || ((a.heartwood ? 0 : 1) - (b.heartwood ? 0 : 1)) || ((a.isPlayer ? 1 : 0) - (b.isPlayer ? 1 : 0)) || (a.id - b.id));
  B.forEach((h, i) => { if (i < n) { if (!h.heartwood) { h.gx = h.x; h.gy = h.y; h.gRing = h.ring; } const p = heartwoodSlot(i); moveHome(h, p.x, p.y); h.elev = p.elev; h.heartwood = true; h.ring = 0; h.slot = i; h.hwTh = p.th; h.battered = false; h.pet = null; }
    else if (h.heartwood) { h.heartwood = false; delete h.elev; delete h.slot; if (!h.isPlayer && h.gx != null) { moveHome(h, h.gx, h.gy); h.ring = h.gRing || 1; } } });
  W.rankOf = null; }
// the player's deepest Hollow level on the 1..99 scale: each layer the hero has reached counts as six levels (placeholder mapping)
function playerDeepest() { const d = (typeof S !== 'undefined' && S && S.stats) ? (S.stats.deepest || 0) : 0; return Math.max(1, Math.min(CITY.maxDepth - 1, 1 + d * 6)); }
// rim ranking: deeper record first, then nearer the rim
function rimBoard() { return W.homes.slice().sort((a, b) => (b.deepest - a.deepest) || ((a.heartwood ? a.slot : 99) - (b.heartwood ? b.slot : 99)) || ((a.ring || 0) - (b.ring || 0)) || (hollowDist(a.x, a.y) - hollowDist(b.x, b.y))); }
function rimRank(h) { if (!W.rankOf || W.rankStamp !== W.player.deepest) { W.rankOf = new Map(); rimBoard().forEach((o, i) => W.rankOf.set(o, i + 1)); W.rankStamp = W.player.deepest; } return W.rankOf.get(h); }
function rimRing(h) { return h.ring || 0; }
function ringLabel(h) { return h.heartwood ? 'Lumen Tree #' + (h.slot + 1) : 'Ring ' + h.ring; }
// move the player's home to the ring that matches their record (called on load and whenever the record improves)
function relocatePlayer(force) { const P = W.player, d = playerDeepest(); if (!P || (!force && P.deepest === d)) return false;
  const others = W.homes.filter((h) => !h.isPlayer), total = others.length + 1, rank0 = others.filter((h) => h.deepest > d).length, ring = ringForRank(rank0, total), rr = mulberry32(d * 7919 + 13);
  P.deepest = d;
  if (ring === 0) { seatHeartwood(); W.playerMoves = (W.playerMoves || 0) + 1; return true; }
  let spot = null;
  for (let k = 0; k < 500 && !spot; k++) { const a = regionAngle(7) + (rr() - 0.5) * (0.5 + k * 0.02), u = rr(), [x, y] = polar(ringR(ring, a, u), a), rad = P.size * 0.62;
    if (hollowDist(x, y) < 150 || underHeartwood(x, y) || chasmDist(x, y) < rad + 8 || (k < 400 && !ringGround(x, y, ring))) continue;
    if (W.homes.some((h) => !h.isPlayer && Math.hypot(h.x - x, h.y - y) < (h.size + P.size) * 0.62) || (typeof GRAND !== 'undefined' && GRAND.wet(x, y, rad + 60))) continue; spot = [x, y]; }
  if (!spot) { seatHeartwood(); return false; }
  P.heartwood = false; delete P.elev; delete P.slot; moveHome(P, spot[0], spot[1]); P.ang = Math.atan2(-P.y, -P.x); P.region = regionAt(P.x, P.y); P.ring = ring;
  seatHeartwood(); W.rankOf = null; W.playerMoves = (W.playerMoves || 0) + 1; return true; }
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

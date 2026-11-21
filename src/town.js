/* =====================================================================
   BEGINNER TOWN (working name, no sign text) - Art's town pack (/workspace/mia/handoff/town).
   On the lower playing field (the lowlands), ~150 m north of the starter Ledge, on a gentle slope that falls to the west:
   three terraces step down toward a drop (stone retaining walls, cobble steps), a cobble main street enters from the land side
   and ends at a round square at the drop, rope rails along the edge. Six buildings from the per-building folders, home lots
   H1-H6 and landmark lots L1-L3 as flat empty lots. Layout is authored in the concept map's pixel space (town_layout_topdown.jpg)
   and turned into the world by W2(). Everything is merged per material (one draw call each), solid circles for every wall and prop.
   ===================================================================== */
const Town = (() => {
  const WS = 6.35, K = 0.55, SU = 30; // map units per metre; world units per concept px; 1 SU = the Lv01 shack footprint (~4.7 m)
  const T = { cx: -5690, cy: 8040, ox: 370, oy: 290 }; // concept px (ox, oy) sits at world (cx, cy); the map is turned 180 deg (land side east, drop west)
  const LV = [150, 136, 122]; // terrace tops (world units): T1 land side, T2, T3 the square at the drop (2 m steps)
  const STEP = [170, 315], RUN = 56, BAND = [213, 268]; // terrace step lines (px), stair run (px) and the main street band
  const STAIRS = [[0, 213, 268], [1, 213, 268], [1, 64, 106], [1, 424, 466]]; // cobble stairs down each step: [step, py0, py1] (main street + the two lot-row lanes)
  const stairAt = (s, py) => STAIRS.find((q) => q[0] === s && py > q[1] && py < q[2]);
  const W2 = (px, py) => [T.cx - (px - T.ox) * K, T.cy - (py - T.oy) * K];
  const P2 = (x, y) => [T.ox - (x - T.cx) / K, T.oy - (y - T.cy) / K];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), sm = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const jit = (s, k) => 5 * Math.sin(s * 0.093 + k * 1.7) + 3 * Math.sin(s * 0.231 + k * 4.1) + 1.5 * Math.sin(s * 0.61 + k);
  // ---- the outline (px): irregular on every outer edge, with the L2 / L3 outcrop jutting over the drop
  const OUT = (() => { const o = [];
    for (let x = -60; x < 600; x += 12) o.push([x, 20 + jit(x, 1)]);
    for (let y = 20; y < 228; y += 12) o.push([605 + jit(y, 2), y]);
    for (let x = 605; x < 760; x += 12) o.push([x, 230 + jit(x, 3) * 0.6]);
    for (let a = -90; a <= 90; a += 15) { const r = 45 + jit(a, 4) * 0.5; o.push([760 + Math.cos(a * Math.PI / 180) * r, 273 + Math.sin(a * Math.PI / 180) * r]); }
    for (let x = 760; x > 605; x -= 12) o.push([x, 316 + jit(x, 5) * 0.6]);
    for (let y = 318; y < 530; y += 12) o.push([605 + jit(y, 6), y]);
    for (let x = 605; x > 170; x -= 12) o.push([x, 530 + jit(x, 7)]); o.push([170, 530], [170, 560]);
    for (let x = 158; x > -60; x -= 12) o.push([x, 560 + jit(x, 8)]);
    for (let y = 560; y > 20; y -= 12) o.push([-60 + jit(y, 9), y]);
    return o; })();
  const inPoly = (P, x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
  const segD = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1, t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / l2, 0, 1); return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t); };
  const edgeD = (px, py) => { let d = 1e9; for (let i = 0; i < OUT.length; i++) d = Math.min(d, segD(px, py, OUT[i], OUT[(i + 1) % OUT.length])); return d; };
  // world bbox (padded) for the cheap early-outs in the terrain hooks
  const BB = (() => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const [a, b] of OUT) { const [x, y] = W2(a, b); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return { x0, x1, y0, y1 }; })();
  const near = (x, y, m) => x > BB.x0 - m && x < BB.x1 + m && y > BB.y0 - m && y < BB.y1 + m;
  const tIdx = (px) => (px < STEP[0] ? 0 : px < STEP[1] ? 1 : 2);
  // walking height inside the town: the terrace top, or the cobble stair ramps down each step on the main street
  function lvlPx(px, py) { const t = tIdx(px); if (t > 0 && stairAt(t - 1, py)) { const b = STEP[t - 1]; if (px < b + RUN) return LV[t - 1] + (LV[t] - LV[t - 1]) * (px - b) / RUN; } return LV[t]; }
  // the entrance: the main street's land end; the connecting path stops here, before the cobbles
  const GATE = W2(-66, 240), GATE_IN = W2(-40, 240);
  const inEntry = (px, py) => px < -30 && Math.abs(py - 240) < 46;
  let SKIP = false; // bypass: natural ground (for building the walls and the tests)
  /* terrain hooks (map3d): the rendered ground under the town is cut a little below the terraces (hidden under the platforms) and
     banks down to them outside; at the entrance the ground rises to meet the main street. meshH() reports the terrace tops. */
  function carve(x, y, hm) { if (SKIP || !near(x, y, 90)) return hm; const [px, py] = P2(x, y); const h = hm[0];
    if (inPoly(OUT, px, py)) return [Math.min(h, LV[tIdx(px)] - 5), 0];
    const d = edgeD(px, py) * K, M = 75, tg = LV[tIdx(clamp(px, -60, 900))] - 3; if (d > M) return hm;
    if (inEntry(px, py) || (px < -20 && h < tg)) { const w = 1 - sm(0, M, d); return [h + (LV[0] - 1 - h) * w, hm[1] * (1 - w)]; }
    if (h > tg) return [tg + (h - tg) * sm(0, M, d), hm[1]]; return hm; }
  function hOver(x, y) { if (SKIP || x < BB.x0 || x > BB.x1 || y < BB.y0 || y > BB.y1) return null; const [px, py] = P2(x, y); if (!inPoly(OUT, px, py)) return null; return lvlPx(px, py); }
  const nat = (x, y) => { SKIP = true; const h = M3.heightAt(x, y)[0]; SKIP = false; return h; };
  // ---- buildings: concept-map centre (px), facing (+1: toward +py, -1: toward -py), footprint (local metres, x across the front, z depth)
  const BLD = [
    { id: 'general_store', name: 'General Store', px: 88, py: 160, face: 1, t: 0, w: 7.1, d: 5.9, npc: 'goldie' },
    { id: 'smithy', name: 'Smithy', px: 240, py: 150, face: 1, t: 1, w: 8.3, d: 5.9, npc: 'brannick' },
    { id: 'bank', name: 'Bank', px: 478, py: 140, face: 1, t: 2, w: 7.1, d: 7.1, round: 1, npc: 'ambrose' },
    { id: 'rope_maker', name: 'Rope Maker', px: 95, py: 405, face: -1, t: 0, w: 4.7, d: 16.5, npc: 'tess' },
    { id: 'inn', name: 'Inn', px: 245, py: 352, face: -1, t: 1, w: 9.4, d: 8.3, npc: 'hattie' },
    { id: 'guide_hut', name: "Guide's Hut", px: 470, py: 362, face: -1, t: 2, w: 4.7, d: 4.7, round: 1, npc: 'fennick' },
  ];
  // lots: flat empty plots (packed dirt with a chalk-dashed border), no buildings yet
  const LOTS = [['H1', 88, 52, 100, 52], ['H2', 222, 52, 96, 52], ['H3', 470, 52, 100, 52], ['H4', 12, 488, 96, 52], ['H5', 240, 470, 100, 52], ['H6', 488, 470, 104, 52],
    ['L1', 385, 265, 0, 0, 44], ['L2', 690, 273, 66, 62], ['L3', 776, 273, 0, 0, 22]];
  const SQ = { px: 385, py: 265, r: 70 };
  // world placement of a building: origin at its centre on its terrace, yaw so local +z (the front) points the right way
  function place(B) { const [x, y] = W2(B.px, B.py), dir = W2(B.px, B.py + B.face), fx = dir[0] - x, fy = dir[1] - y; return { x, y, h: LV[B.t], yaw: Math.atan2(fx, fy) }; }
  // ---- solids (Explore.colList): every wall, prop and the drop edges are circles
  let COLS = null;
  function cols() { if (COLS) return COLS; if (typeof M3 === 'undefined' || !M3.st || !M3.st.ok || !M3.scene) return []; if (Town.ST && !Town.ST.built) Town.build(); COLS = []; const add = (x, y, r, key) => COLS.push({ x, y, r, key: key || 'town' });
    // buildings: their footprint filled with circles (local metres -> world)
    for (const B of BLD) { const P = place(B), cs = Math.cos(P.yaw), sn = Math.sin(P.yaw), L = (lx, lz) => [P.x + (lx * cs + lz * sn) * WS, P.y + (-lx * sn + lz * cs) * WS];
      for (const f of B.foot || [[-B.w / 2, -B.d / 2, B.w / 2, B.d / 2]]) { if (f.length === 3) { const [cx, cz, r] = f; for (let a = 0; a < 6.28; a += 0.5) { const [x, y] = L(cx + Math.cos(a) * (r - 0.45), cz + Math.sin(a) * (r - 0.45)); add(x, y, WS * 0.6); } const [x, y] = L(cx, cz); add(x, y, (r - 0.4) * WS); continue; }
        const [x0, z0, x1, z1] = f, st = 0.8; for (let lx = x0 + 0.4; lx <= x1 - 0.39; lx += st) for (let lz = z0 + 0.4; lz <= z1 - 0.39; lz += st) { const [x, y] = L(lx, lz); add(x, y, WS * 0.56); } } }
    // props placed with the buildings (crates, barrels, anvil, posts, easel, boulder ...)
    for (const c of PCOL) add(c[0], c[1], c[2], 'townProp');
    for (const B of BLD) { const [x, y] = npcSpot(B).at; add(x, y, WS * 0.38, 'townNpc'); } // the townsfolk stand still: solid
    // retaining walls: the terrace steps (open where the stairs come down) and every outer edge that drops more than ~0.7 m
    for (const [s, a, b] of STAIRS) for (const yy of [a - 3, b + 3]) for (let px = STEP[s]; px < STEP[s] + RUN * 0.8; px += 7) { const [x, y] = W2(px, yy); add(x, y, WS * 0.42, 'townStair'); } // the stairs' cheek walls
    for (let s = 0; s < 2; s++) for (let py = 20; py <= 560; py += 9) { if (STAIRS.some((q) => q[0] === s && py > q[1] - 4 && py < q[2] + 4)) continue; if (!inPoly(OUT, STEP[s] + 4, py) && !inPoly(OUT, STEP[s] - 4, py)) continue; const [x, y] = W2(STEP[s], py); add(x, y, WS * 0.55, 'townWall'); }
    for (let i = 0; i < OUT.length; i++) { const a = OUT[i], b = OUT[(i + 1) % OUT.length], L2 = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L2 / 8)); for (let k = 0; k < n; k++) { const px = a[0] + (b[0] - a[0]) * k / n, py = a[1] + (b[1] - a[1]) * k / n; if (inEntry(px - 4, py)) continue; const [x, y] = W2(px, py), drop = LV[tIdx(px)] - nat(x, y); if (drop < WS * 0.7 && !(px > 590)) continue; add(x, y, WS * 0.5, 'townEdge'); } }
    return COLS; }
  function nav(cls, nx, ny, REG, C) { const L = cols(); if (!L.length) return; const i0 = Math.max(0, Math.floor((BB.x0 - REG.X0) / C)), i1 = Math.min(nx - 1, Math.ceil((BB.x1 - REG.X0) / C)), j0 = Math.max(0, Math.floor((BB.y0 - REG.Y0) / C)), j1 = Math.min(ny - 1, Math.ceil((BB.y1 - REG.Y0) / C));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const [px, py] = P2(REG.X0 + i * C, REG.Y0 + j * C); if (inPoly(OUT, px, py)) cls[j * nx + i] = 1; }
    for (const c of L) { const R = c.r + C * (c.key === 'townStair' || c.key === 'townWall' ? 0.15 : 0.45), a0 = Math.max(0, Math.floor((c.x - R - REG.X0) / C)), a1 = Math.min(nx - 1, Math.ceil((c.x + R - REG.X0) / C)), b0 = Math.max(0, Math.floor((c.y - R - REG.Y0) / C)), b1 = Math.min(ny - 1, Math.ceil((c.y + R - REG.Y0) / C)); for (let j = b0; j <= b1; j++) for (let i = a0; i <= a1; i++) if (Math.hypot(REG.X0 + i * C - c.x, REG.Y0 + j * C - c.y) < R) cls[j * nx + i] = 0; } }
  // where each building's keeper stands (beside the door, facing the street) and where she stops to talk (in front of them)
  function npcSpot(B) { const P = place(B), cs = Math.cos(P.yaw), sn = Math.sin(P.yaw), L = (lx, lz) => [P.x + (lx * cs + lz * sn) * WS, P.y + (-lx * sn + lz * cs) * WS], D = B.round ? B.w / 2 : B.d / 2, o = NPCX[B.id] || [1.8, 1.4];
    return { at: L(o[0], D + o[1]), talk: L(o[0], D + o[1] + 1.5), yaw: P.yaw, h: LV[B.t] }; }
  const NPCX = { general_store: [-1.9, 1.5], smithy: [1.6, 1.4], bank: [1.9, 1.2], rope_maker: [1.5, 1.2], inn: [-2.0, 1.3], guide_hut: [1.6, 1.3] };
  const PCOL = []; // prop circles (world x, y, r), filled as the meshes are built
  // ---- keep-out for the map's trees, rocks, tufts and focal boulders
  function hit(x, y, pad) { if (!near(x, y, (pad || 0) + 40)) return false; const [px, py] = P2(x, y); if (inPoly(OUT, px, py)) return true; return edgeD(px, py) * K < (pad || 0) + WS * 3; }
  // ---- the connecting footpath: out of the main street's land end, round the town's south-east corner, onto the nearest worn path
  let PTH = null;
  function paths(base) { if (PTH) return PTH; const mid = W2(-112, -30); let best = null, bd = 1e9; for (const P of base || []) for (let i = 1; i + 1 < P.length; i += 2) { const d = Math.hypot(P[i] - mid[0], P[i + 1] - mid[1]); if (d >= bd || hit(P[i], P[i + 1], 60)) continue; let clear = true; for (let s = 1; s < 16 && clear; s++) { const t = s / 16; if (hit(mid[0] + (P[i] - mid[0]) * t, mid[1] + (P[i + 1] - mid[1]) * t, 30)) clear = false; } if (clear) { bd = d; best = [P[i], P[i + 1]]; } }
    if (!best) return []; const pts = [GATE, W2(-100, 236), W2(-118, 150), mid], v = [mid[0] - best[0], mid[1] - best[1]], L = Math.hypot(v[0], v[1]), n = Math.max(1, Math.round(L / 60));
    for (let k = 1; k <= n; k++) pts.push([mid[0] - v[0] * k / n, mid[1] - v[1] * k / n]);
    PTH = [[0, ...pts.flat().map((q) => Math.round(q))]]; return PTH; }
  return { WS, K, SU, T, LV, STEP, RUN, BAND, STAIRS, W2, P2, OUT, BB, BLD, LOTS, SQ, GATE, GATE_IN, inPoly, edgeD, tIdx, lvlPx, carve, hOver, nat, place, npcSpot, cols, hit, paths, PCOL, near, inEntry,
    nav, resetCols: () => { COLS = null; }, get skip() { return SKIP; }, set skip(v) { SKIP = v; } };
})();
/* ---- the town's meshes: painted canvas textures (one per material), geometry merged per material ---- */
Town.art = (() => {
  const TX = {}; let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const rgb = (c, v, a) => `rgba(${clamp255(c[0] * v)},${clamp255(c[1] * v)},${clamp255(c[2] * v)},${a == null ? 1 : a})`; function clamp255(v) { return Math.max(0, Math.min(255, v | 0)); }
  function canvas(n, fn) { const cv = document.createElement('canvas'); cv.width = cv.height = n; const g = cv.getContext('2d'); fn(g, n); return cv; }
  const blob = (g, x, y, rx, ry, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, rnd() * 3, 0, 6.283); g.fill(); };
  const wrapDraw = (g, n, fn) => { for (const dx of [-n, 0, n]) for (const dy of [-n, 0, n]) { g.save(); g.translate(dx, dy); fn(); g.restore(); } };
  // stones laid on a jittered grid, each a rounded irregular polygon with a lit top and a dark bottom edge (tiles seamlessly)
  function stones(g, n, o) { g.fillStyle = o.mortar; g.fillRect(0, 0, n, n); const rows = o.rows, cols = o.cols;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const cw = n / cols, ch = n / rows, cx = (i + 0.5 + (j % 2) * 0.5 * (o.bond || 0) + (rnd() - 0.5) * 0.25) * cw, cy = (j + 0.5 + (rnd() - 0.5) * 0.2) * ch, rx = cw * (0.42 + rnd() * 0.08), ry = ch * (0.4 + rnd() * 0.08);
      const base = o.pal[Math.floor(rnd() * o.pal.length)], v = 0.82 + rnd() * 0.3, pts = []; const N = 7 + Math.floor(rnd() * 3); for (let k = 0; k < N; k++) { const a = k / N * 6.283 + rnd() * 0.3, r = 0.82 + rnd() * 0.22; pts.push([Math.cos(a) * rx * r, Math.sin(a) * ry * r]); }
      wrapDraw(g, n, () => { g.translate(cx, cy); g.beginPath(); pts.forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); const gr = g.createLinearGradient(0, -ry, 0, ry); gr.addColorStop(0, rgb(base, v * 1.22)); gr.addColorStop(0.45, rgb(base, v)); gr.addColorStop(1, rgb(base, v * 0.62)); g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(30,20,12,.45)'; g.lineWidth = 1.4; g.stroke();
        for (let k = 0; k < 5; k++) blob(g, (rnd() - 0.5) * rx * 1.2, (rnd() - 0.5) * ry * 1.2, 1 + rnd() * 3, 1 + rnd() * 2, rnd() < 0.5 ? 'rgba(255,240,210,.12)' : 'rgba(40,25,10,.15)');
        if (o.moss && rnd() < o.moss) blob(g, (rnd() - 0.5) * rx, -ry * 0.5, rx * (0.3 + rnd() * 0.4), ry * 0.25, 'rgba(96,118,42,.55)'); }); } }
  function grain(g, n, base, dark, planks, vert) { g.fillStyle = base; g.fillRect(0, 0, n, n); for (let k = 0; k < 900; k++) { const x = rnd() * n, y = rnd() * n; g.fillStyle = rnd() < 0.5 ? 'rgba(30,15,5,.12)' : 'rgba(255,220,170,.07)'; vert ? g.fillRect(x, y, 1 + rnd() * 1.5, 6 + rnd() * 30) : g.fillRect(x, y, 6 + rnd() * 30, 1 + rnd() * 1.5); }
    for (let i = 0; i < planks; i++) { const p = (i / planks) * n; g.fillStyle = dark; vert ? g.fillRect(p, 0, 2.5, n) : g.fillRect(0, p, n, 2.5); } for (let k = 0; k < 6; k++) blob(g, rnd() * n, rnd() * n, 3 + rnd() * 3, 2 + rnd() * 2, 'rgba(40,20,8,.35)'); }
  function speck(g, n, base, cols, k, rmax) { g.fillStyle = base; g.fillRect(0, 0, n, n); for (let i = 0; i < k; i++) { const x = rnd() * n, y = rnd() * n, r = 1 + rnd() * rmax, c = cols[Math.floor(rnd() * cols.length)]; wrapDraw(g, n, () => blob(g, x, y, r, r * (0.6 + rnd() * 0.5), c)); } }
  const PAINT = {
    cobble: (g, n) => stones(g, n, { rows: 7, cols: 7, bond: 1, mortar: '#6a5236', pal: [[190, 156, 112], [168, 136, 98], [204, 170, 120], [150, 120, 86], [180, 158, 128]], moss: 0.1 }),
    stone: (g, n) => stones(g, n, { rows: 4, cols: 3, bond: 1, mortar: '#5c4a36', pal: [[170, 150, 120], [150, 132, 108], [186, 162, 126], [136, 120, 100], [160, 150, 132], [150, 128, 96]], moss: 0.25 }),
    dirt: (g, n) => speck(g, n, '#9a7a4a', ['rgba(120,90,52,.35)', 'rgba(176,146,98,.3)', 'rgba(84,64,38,.25)', 'rgba(110,112,58,.22)', 'rgba(200,170,120,.18)'], 900, 9),
    moss: (g, n) => { speck(g, n, '#5a6228', ['rgba(120,138,52,.55)', 'rgba(70,84,28,.6)', 'rgba(150,160,70,.35)', 'rgba(48,58,22,.5)', 'rgba(170,150,70,.25)'], 1400, 11); },
    wood: (g, n) => grain(g, n, '#6b4628', 'rgba(36,20,8,.75)', 4, false),
    woodV: (g, n) => grain(g, n, '#5e3d22', 'rgba(30,16,6,.8)', 5, true),
    plaster: (g, n) => speck(g, n, '#d9c08c', ['rgba(170,128,74,.12)', 'rgba(255,244,214,.14)', 'rgba(140,110,70,.1)'], 500, 14),
    brass: (g, n) => { const gr = g.createLinearGradient(0, 0, n, n); gr.addColorStop(0, '#c99a45'); gr.addColorStop(0.5, '#a87a32'); gr.addColorStop(1, '#d6ad5c'); g.fillStyle = gr; g.fillRect(0, 0, n, n); for (let k = 0; k < 300; k++) blob(g, rnd() * n, rnd() * n, 2 + rnd() * 8, 1 + rnd() * 4, rnd() < 0.5 ? 'rgba(90,60,20,.12)' : 'rgba(255,230,160,.12)');
      g.strokeStyle = 'rgba(80,52,18,.6)'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(0, i * n / 4 + 1); g.lineTo(n, i * n / 4 + 1); g.stroke(); } for (let i = 0; i < 4; i++) for (let k = 0; k < 8; k++) { blob(g, (k + 0.5) * n / 8, i * n / 4 + 8, 3, 3, '#6e4a1a'); blob(g, (k + 0.5) * n / 8 - 1, i * n / 4 + 7, 1.6, 1.6, '#f3d28a'); } },
    canvas: (g, n) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#e8d6ae' : '#9c4a26'; g.fillRect(i * n / 8, 0, n / 8, n); } for (let k = 0; k < 600; k++) { g.fillStyle = 'rgba(60,30,10,.06)'; g.fillRect(rnd() * n, rnd() * n, 1, 4 + rnd() * 10); } },
    canvasG: (g, n) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#e3d3a6' : '#4f6b5a'; g.fillRect(i * n / 8, 0, n / 8, n); } for (let k = 0; k < 600; k++) { g.fillStyle = 'rgba(60,30,10,.06)'; g.fillRect(rnd() * n, rnd() * n, 1, 4 + rnd() * 10); } },
    brick: (g, n) => { g.fillStyle = '#2e241e'; g.fillRect(0, 0, n, n); const rw = n / 8, cw = n / 4; for (let j = 0; j < 8; j++) for (let i = -1; i < 4; i++) { const x = i * cw + (j % 2) * cw / 2, v = 0.7 + rnd() * 0.4, soot = rnd(); g.fillStyle = rgb(soot < 0.4 ? [70, 58, 50] : [118, 72, 50], v); g.fillRect(x + 2, j * rw + 2, cw - 4, rw - 4); } },
    iron: (g, n) => speck(g, n, '#3c3e42', ['rgba(90,92,96,.3)', 'rgba(20,20,24,.35)', 'rgba(120,80,50,.18)'], 400, 6),
    rope: (g, n) => { g.fillStyle = '#a98552'; g.fillRect(0, 0, n, n); g.strokeStyle = 'rgba(70,48,22,.7)'; g.lineWidth = 5; for (let i = -n; i < 2 * n; i += 18) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + n * 0.5, n); g.stroke(); } g.strokeStyle = 'rgba(230,200,150,.35)'; g.lineWidth = 2; for (let i = -n; i < 2 * n; i += 18) { g.beginPath(); g.moveTo(i + 5, 0); g.lineTo(i + 5 + n * 0.5, n); g.stroke(); } },
    bark: (g, n) => { g.fillStyle = '#3d2c1c'; g.fillRect(0, 0, n, n); const rows = 8; for (let j = 0; j < rows; j++) for (let i = 0; i < 6; i++) { const x = (i + (j % 2) * 0.5) * n / 6, y = j * n / rows, v = 0.75 + rnd() * 0.45, moss = rnd() < 0.45; wrapDraw(g, n, () => { g.fillStyle = moss ? rgb([96, 112, 44], v) : rgb([112, 80, 50], v); g.beginPath(); g.moveTo(x, y); g.lineTo(x + n / 6, y); g.lineTo(x + n / 6 - 3, y + n / rows + 6); g.quadraticCurveTo(x + n / 12, y + n / rows + 12, x + 3, y + n / rows + 6); g.closePath(); g.fill(); g.strokeStyle = 'rgba(20,12,6,.5)'; g.stroke(); }); } },
    glowTeal: (g, n) => { const gr = g.createRadialGradient(n / 2, n / 2, 2, n / 2, n / 2, n / 2); gr.addColorStop(0, '#e8fffb'); gr.addColorStop(0.4, '#5fe6d6'); gr.addColorStop(1, '#1d8f8a'); g.fillStyle = gr; g.fillRect(0, 0, n, n); },
    glowFire: (g, n) => { const gr = g.createRadialGradient(n / 2, n * 0.7, 2, n / 2, n / 2, n * 0.6); gr.addColorStop(0, '#fff2b0'); gr.addColorStop(0.35, '#ffb040'); gr.addColorStop(0.8, '#d0501a'); gr.addColorStop(1, '#6a1a08'); g.fillStyle = gr; g.fillRect(0, 0, n, n); },
    glowWin: (g, n) => { g.fillStyle = '#3a2412'; g.fillRect(0, 0, n, n); const gr = g.createRadialGradient(n / 2, n / 2, 4, n / 2, n / 2, n * 0.55); gr.addColorStop(0, '#ffe7a8'); gr.addColorStop(0.6, '#f0a648'); gr.addColorStop(1, '#a8601e'); g.fillStyle = gr; g.fillRect(n * 0.08, n * 0.08, n * 0.84, n * 0.84); g.fillStyle = '#3a2412'; g.fillRect(n * 0.47, 0, n * 0.06, n); g.fillRect(0, n * 0.47, n, n * 0.06); },
    cloth: (g, n) => { speck(g, n, '#f2eee6', ['rgba(120,100,80,.10)', 'rgba(255,255,255,.18)', 'rgba(90,70,50,.08)'], 700, 4); g.fillStyle = 'rgba(80,60,40,.05)'; for (let i = 0; i < n; i += 4) g.fillRect(0, i, n, 1); },
    chalk: (g, n) => { g.clearRect(0, 0, n, n); g.fillStyle = 'rgba(240,232,210,.85)'; for (let i = 0; i < 8; i++) g.fillRect(i * n / 8 + 4, n * 0.4, n / 8 - 12, n * 0.2); },
  };
  // pictogram signs (no text): backpack, anvil, coiled rope, coin with a crystal, frothy mug, lantern - one 4x2 sheet
  const SIGN_CELLS = { general_store: 0, smithy: 1, rope_maker: 2, bank: 3, inn: 4, guide_hut: 5 };
  function paintSigns(g, n) { const cw = n / 4, ch = n / 2; for (let c = 0; c < 8; c++) { const x0 = (c % 4) * cw, y0 = Math.floor(c / 4) * ch, cx = x0 + cw / 2, cy = y0 + ch / 2, r = cw * 0.42;
      g.fillStyle = '#4a2f18'; g.fillRect(x0, y0, cw, ch); g.fillStyle = '#7a5530'; g.fillRect(x0 + 6, y0 + 6, cw - 12, ch - 12); g.strokeStyle = '#c59a48'; g.lineWidth = 6; g.strokeRect(x0 + 8, y0 + 8, cw - 16, ch - 16);
      g.fillStyle = '#e2c27a'; g.strokeStyle = '#3a2410'; g.lineWidth = 4; const P = (fn) => { g.beginPath(); fn(); g.fill(); g.stroke(); };
      if (c === 0) { P(() => g.roundRect(cx - r * 0.45, cy - r * 0.35, r * 0.9, r * 0.95, 14)); P(() => g.roundRect(cx - r * 0.3, cy - r * 0.1, r * 0.6, r * 0.35, 8)); g.beginPath(); g.arc(cx, cy - r * 0.35, r * 0.25, Math.PI, 0); g.stroke(); }
      if (c === 1) { P(() => { g.moveTo(cx - r * 0.75, cy - r * 0.25); g.lineTo(cx + r * 0.55, cy - r * 0.25); g.quadraticCurveTo(cx + r * 0.8, cy - r * 0.2, cx + r * 0.8, cy - r * 0.05); g.lineTo(cx + r * 0.25, cy + r * 0.05); g.lineTo(cx + r * 0.3, cy + r * 0.45); g.lineTo(cx - r * 0.35, cy + r * 0.45); g.lineTo(cx - r * 0.3, cy + r * 0.05); g.closePath(); }); }
      if (c === 2) { for (let k = 4; k > 0; k--) { g.beginPath(); g.arc(cx, cy, r * 0.2 * k, 0, 6.283); g.lineWidth = 10; g.strokeStyle = '#3a2410'; g.stroke(); g.lineWidth = 6; g.strokeStyle = '#e2c27a'; g.stroke(); } }
      if (c === 3) { P(() => g.arc(cx, cy, r * 0.7, 0, 6.283)); g.fillStyle = '#5fd6c8'; P(() => { g.moveTo(cx, cy - r * 0.45); g.lineTo(cx + r * 0.28, cy); g.lineTo(cx, cy + r * 0.45); g.lineTo(cx - r * 0.28, cy); g.closePath(); }); }
      if (c === 4) { P(() => g.roundRect(cx - r * 0.42, cy - r * 0.3, r * 0.7, r * 0.8, 10)); g.beginPath(); g.arc(cx + r * 0.32, cy + r * 0.08, r * 0.22, -1.4, 1.4); g.lineWidth = 9; g.stroke(); g.fillStyle = '#fbf3dc'; P(() => { g.arc(cx - r * 0.25, cy - r * 0.32, r * 0.2, 0, 6.283); g.arc(cx + r * 0.05, cy - r * 0.42, r * 0.22, 0, 6.283); g.arc(cx + r * 0.25, cy - r * 0.3, r * 0.17, 0, 6.283); }); }
      if (c === 5) { P(() => { g.moveTo(cx - r * 0.3, cy - r * 0.35); g.lineTo(cx + r * 0.3, cy - r * 0.35); g.lineTo(cx + r * 0.36, cy + r * 0.45); g.lineTo(cx - r * 0.36, cy + r * 0.45); g.closePath(); }); g.fillStyle = '#7ff0e0'; P(() => g.arc(cx, cy + r * 0.05, r * 0.18, 0, 6.283)); g.beginPath(); g.arc(cx, cy - r * 0.5, r * 0.18, Math.PI, 0); g.stroke(); } } }
  function tex(k) { if (TX[k]) return TX[k]; seed = 101 + Object.keys(PAINT).indexOf(k) * 977; const cv = k === 'sign' ? canvas(512, paintSigns) : canvas(256, PAINT[k]); const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = k === 'sign' ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return (TX[k] = t); }
  // material key -> [texture, metres per tile, extra]
  const MAT = { cobble: [1.6], stone: [1.5], dirt: [3.2], moss: [2.2], wood: [1.1], woodV: [1.1], plaster: [2.0], brass: [1.4, 'shiny'], canvas: [1.6], canvasG: [1.6], brick: [1.2], iron: [1.0, 'shiny'], rope: [0.4], bark: [1.4], glowTeal: [0.5, 'glow'], glowFire: [1.4, 'glow'], glowWin: [1, 'glow'], cloth: [0.35], chalk: [1.0, 'alpha'], sign: [1, 'sign'] };
  const MATS = {}; function mat(k) { if (MATS[k]) return MATS[k]; const t = tex(k), f = MAT[k][1]; let m;
    if (f === 'glow') m = new THREE.MeshBasicMaterial({ map: t, vertexColors: true, toneMapped: false });
    else if (f === 'shiny') m = new THREE.MeshPhongMaterial({ map: t, vertexColors: true, specular: 0x6a5a40, shininess: 40 });
    else if (f === 'alpha') m = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    else m = new THREE.MeshLambertMaterial({ map: t, vertexColors: true }); m.side = THREE.DoubleSide; m.name = 'town_' + k; return (MATS[k] = m); }
  return { tex, mat, MAT, SIGN_CELLS };
})();
/* ---- geometry builder: primitives in a building's local metres (x across the front, y up, z out of the front), merged per material ---- */
Town.gb = (() => {
  const TW = Town, WS = TW.WS; let G = {}, FM = null, FMi = null; const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = V(1, 1, 1);
  function reset() { G = {}; } function buf(k) { return G[k] || (G[k] = { p: [], n: [], u: [], c: [] }); }
  // frame: world (x, y) on the map, base height h, yaw; local metres
  function frame(x, y, h, yaw) { FM = new THREE.Matrix4().compose(V(x, h, y), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw || 0, 0)), V(WS, WS, WS)); }
  function xf(c, r) { e.set(r ? r[0] : 0, r ? r[1] : 0, r ? r[2] : 0); q.setFromEuler(e); return new THREE.Matrix4().compose(V(c[0], c[1], c[2]), q, one); }
  let PL = new THREE.Matrix4(); // primitive -> frame-local
  const tile = (k) => Town.art.MAT[k][0];
  const col3 = (c) => (c == null ? [1, 1, 1] : typeof c === 'number' ? [c, c, c] : c);
  // one triangle from primitive-local points; uv: planar on the frame-local face (continuous tiling across pieces) unless given
  function tri(k, a, b, c, col, uv, nrm) { const B = buf(k), A = [a, b, c].map((p) => V(p[0], p[1], p[2]).applyMatrix4(PL)), Wd = A.map((p) => p.clone().applyMatrix4(FM));
    const n = new THREE.Vector3().subVectors(Wd[1], Wd[0]).cross(new THREE.Vector3().subVectors(Wd[2], Wd[0])).normalize(), nl = new THREE.Vector3().subVectors(A[1], A[0]).cross(new THREE.Vector3().subVectors(A[2], A[0])).normalize(), t = tile(k), cc = col3(col);
    for (let i = 0; i < 3; i++) { const p = A[i]; B.p.push(Wd[i].x, Wd[i].y, Wd[i].z); if (nrm) { const nn = V(nrm[i][0], nrm[i][1], nrm[i][2]).transformDirection(PL).transformDirection(FM); B.n.push(nn.x, nn.y, nn.z); } else B.n.push(n.x, n.y, n.z);
      if (uv) B.u.push(uv[i][0], uv[i][1]); else { const ax = Math.abs(nl.x), ay = Math.abs(nl.y), az = Math.abs(nl.z); if (ay >= ax && ay >= az) B.u.push(p.x / t, p.z / t); else if (ax >= az) B.u.push(p.z / t, p.y / t); else B.u.push(p.x / t, p.y / t); }
      const cv = Array.isArray(col) && Array.isArray(col[0]) ? col[i] : cc; B.c.push(cv[0], cv[1], cv[2]); } }
  function quad(k, a, b, c, d, col, uv) { const cl = Array.isArray(col) && Array.isArray(col[0]) ? col : null; tri(k, a, b, c, cl ? [cl[0], cl[1], cl[2]] : col, uv && [uv[0], uv[1], uv[2]]); tri(k, a, c, d, cl ? [cl[0], cl[2], cl[3]] : col, uv && [uv[0], uv[2], uv[3]]); }
  function at(c, r) { PL = xf(c || [0, 0, 0], r); }
  // box centred at c (primitive-local origin at its base centre), size s, rotation r; skip faces: 'b' bottom, 't' top
  function box(k, c, s, col, r, skip, kTop) { at(c, r); const [w, h, d] = s, x0 = -w / 2, x1 = w / 2, z0 = -d / 2, z1 = d / 2, y0 = 0, y1 = h, sk = skip || '';
    quad(k, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], col); quad(k, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], col);
    quad(k, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], col); quad(k, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], col);
    if (!sk.includes('t')) quad(kTop || k, [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], col); if (!sk.includes('b')) quad(k, [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], col); }
  // vertical cylinder / frustum (base at c), smooth sides; a0..a1 arc; caps optional
  function cyl(k, c, r0, r1, h, seg, col, r, o) { at(c, r); o = o || {}; const a0 = o.a0 || 0, a1 = o.a1 == null ? Math.PI * 2 : o.a1, ut = tile(k), circ = (a1 - a0) * Math.max(r0, r1);
    for (let i = 0; i < seg; i++) { const ta = a0 + (a1 - a0) * i / seg, tb = a0 + (a1 - a0) * (i + 1) / seg, ca = Math.cos(ta), sa = Math.sin(ta), cb = Math.cos(tb), sb = Math.sin(tb), sl = (r0 - r1) / h;
      const A = [ca * r0, 0, sa * r0], B2 = [cb * r0, 0, sb * r0], C = [cb * r1, h, sb * r1], D = [ca * r1, h, sa * r1], na = [ca, sl, sa], nb = [cb, sl, sb], ua = circ * i / seg / ut, ub = circ * (i + 1) / seg / ut;
      if (o.out !== false) { tri(k, A, D, C, col, [[ua, 0], [ua, h / ut], [ub, h / ut]], [na, na, nb]); tri(k, A, C, B2, col, [[ua, 0], [ub, h / ut], [ub, 0]], [na, nb, nb]); }
      if (o.top && r1 > 0) tri(o.kTop || k, [0, h, 0], C, D, col); if (o.bot) tri(k, [0, 0, 0], A, B2, col); } }
  // dome (half ellipsoid) of radius r, height hh, from latitude 0 to l1 (1 = closed top)
  function dome(k, c, r, hh, seg, rings, col, o) { at(c, null); o = o || {}; const l1 = o.l1 || 1; for (let j = 0; j < rings; j++) { const p0 = (j / rings) * l1 * Math.PI / 2, p1 = ((j + 1) / rings) * l1 * Math.PI / 2;
      for (let i = 0; i < seg; i++) { const t0 = i / seg * Math.PI * 2, t1 = (i + 1) / seg * Math.PI * 2, P = (p, t) => [Math.cos(p) * Math.cos(t) * r, Math.sin(p) * hh, Math.cos(p) * Math.sin(t) * r], N = (p, t) => [Math.cos(p) * Math.cos(t) / r, Math.sin(p) / hh, Math.cos(p) * Math.sin(t) / r];
        const uv = (p, t) => [t * r / tile(k), p * hh / tile(k) * 1.6]; tri(k, P(p0, t0), P(p1, t0), P(p1, t1), col, [uv(p0, t0), uv(p1, t0), uv(p1, t1)], [N(p0, t0), N(p1, t0), N(p1, t1)]); tri(k, P(p0, t0), P(p1, t1), P(p0, t1), col, [uv(p0, t0), uv(p1, t1), uv(p0, t1)], [N(p0, t0), N(p1, t1), N(p0, t1)]); } } }
  // a soft lump (low-poly squashed sphere) - moss cushions, boulders, sacks
  function lump(k, c, s, col, sd, r) { at(c, r); let z = sd || 1; const rn = () => (z = (z * 16807) % 2147483647) / 2147483647, NS = 6, NR = 3, P = [];
    for (let j = 0; j <= NR; j++) { const row = []; for (let i = 0; i < NS; i++) { const p = -Math.PI / 2 + Math.PI * j / NR, t = i / NS * Math.PI * 2, f = j === 0 || j === NR ? 1 : 0.85 + 0.3 * rn(); row.push([Math.cos(p) * Math.cos(t) * s[0] * f, (Math.sin(p) + 1) * 0.5 * s[1], Math.cos(p) * Math.sin(t) * s[2] * f]); } P.push(row); }
    for (let j = 0; j < NR; j++) for (let i = 0; i < NS; i++) { const a = P[j][i], b = P[j][(i + 1) % NS], cc = P[j + 1][(i + 1) % NS], d = P[j + 1][i]; tri(k, a, d, cc, col); tri(k, a, cc, b, col); } }
  // a moss gable roof: ridge along local x from x0..x1, eaves at z0/z1 (height ye), ridge height yr, overhang ov, slab thickness th; lumpy moss cushions on the eaves
  function gable(c, x0, x1, z0, z1, ye, yr, ov, th, o) { o = o || {}; const zm = (z0 + z1) / 2, dz = (z1 - z0) / 2 + ov, sl = (yr - ye) / ((z1 - z0) / 2), yE = ye - ov * sl, X0 = x0 - (o.ovx == null ? ov : o.ovx), X1 = x1 + (o.ovx == null ? ov : o.ovx), k = o.k || 'moss', sd = o.sd || 7;
    at(c, o.r); for (const sg of [1, -1]) { const zE = zm + sg * dz, A = [X0, yE, zE], B = [X1, yE, zE], C = [X1, yr, zm], D = [X0, yr, zm], up = th;
      if (sg > 0) { quad(k, A, B, [X1, yr + up, zm], [X0, yr + up, zm]); } else { quad(k, B, A, [X0, yr + up, zm], [X1, yr + up, zm]); }
      const Au = [X0, yE + up * 0.4, zE], Bu = [X1, yE + up * 0.4, zE]; if (sg > 0) { quad(k, A, Au, Bu, B); quad(k, [X0, yE, zE], [X1, yE, zE], [X1, yr, zm], [X0, yr, zm], 0.55); } else { quad(k, B, Bu, Au, A); quad(k, [X1, yE, zE], [X0, yE, zE], [X0, yr, zm], [X1, yr, zm], 0.55); }
      // the slab's end faces (gable edges)
      for (const xx of [X0, X1]) { const s2 = xx === X0 ? -1 : 1; const P1 = [xx, yE, zE], P2 = [xx, yE + up * 0.4, zE], P3 = [xx, yr + up, zm], P4 = [xx, yr, zm]; if (s2 * sg > 0) quad(k, P1, P4, P3, P2, 0.8); else quad(k, P2, P3, P4, P1, 0.8); } }
    // moss cushions drooping over the eaves and along the ridge
    if (o.lumps !== false) { const n = Math.max(3, Math.round((X1 - X0) / 0.9)); for (let i = 0; i <= n; i++) { const x = X0 + (X1 - X0) * i / n; const ry = o.r ? o.r[1] : 0, cr = Math.cos(ry), sr = Math.sin(ry), RP = (p) => [c[0] + p[0] * cr + p[2] * sr, c[1] + p[1], c[2] - p[0] * sr + p[2] * cr]; for (const sg of [1, -1]) lump(k, RP([x, yE - 0.12, zm + sg * (dz - 0.05)]), [0.42, 0.42 + 0.12 * Math.sin(i * 2.1 + sg), 0.34], [0.95, 1, 0.9], sd + i * 13 + (sg > 0 ? 3 : 0), [0, ry, 0]); if (i % 2 === 0) lump(k, RP([x, yr + th * 0.6, zm]), [0.36, 0.3, 0.42], [1.05, 1.08, 0.95], sd + i * 7, [0, ry, 0]); } at(c, o.r); }
    // gable-end infill walls (triangles) in the wall material
    if (o.wall) for (const xx of [x0, x1]) { const s2 = xx === x0 ? -1 : 1, a = [xx, ye, z0], b = [xx, ye, z1], t = [xx, yr, zm]; if (s2 > 0) tri(o.wall, a, t, b, o.wallCol); else tri(o.wall, b, t, a, o.wallCol); } }
  function flush(parent, name, opt) { const out = []; for (const k in G) { const B = G[k]; if (!B.p.length) continue; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(B.u, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(B.c, 3)); g.computeBoundingSphere();
      const m = new THREE.Mesh(g, Town.art.mat(k)); m.name = name + '_' + k; const glow = Town.art.MAT[k][1]; m.castShadow = !glow && !(opt && opt.noShadow) && k !== 'dirt' && k !== 'cobble'; m.receiveShadow = !glow; m.matrixAutoUpdate = false; m.updateMatrix(); parent.add(m); out.push(m); } G = {}; return out; }
  return { reset, frame, at, tri, quad, box, cyl, dome, lump, gable, flush, get G() { return G; } };
})();
/* ---- the town-wide pieces: terrace tops, retaining walls, cobble streets and square, stairs, rope rails, lot markings ---- */
Town.ground = (G) => {
  const TW = Town, B = Town.gb, WS = TW.WS, K = TW.K, W2 = TW.W2, LV = TW.LV;
  B.frame(0, 0, 0, 0); B.at(); // identity frame scaled by WS: so world points are passed / WS
  const P = (px, py, h) => { const [x, y] = W2(px, py); return [x / WS, h / WS, y / WS]; };
  const fh = (a, b) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s); };
  // clip the outline to each terrace's px range, triangulate, subdivide, tint (grass creeping in from the edges, worn dirt in the middle)
  const clipX = (poly, lo, hi) => { let out = poly; for (const [lim, sg] of [[lo, 1], [hi, -1]]) { const inp = out; out = []; for (let i = 0; i < inp.length; i++) { const a = inp[i], b = inp[(i + 1) % inp.length], ia = (a[0] - lim) * sg >= 0, ib = (b[0] - lim) * sg >= 0; if (ia) out.push(a); if (ia !== ib) { const t = (lim - a[0]) / (b[0] - a[0]); out.push([lim, a[1] + (b[1] - a[1]) * t]); } } } return out; };
  const R = [[-1e3, TW.STEP[0]], [TW.STEP[0], TW.STEP[1]], [TW.STEP[1], 1e3]];
  const tint = (px, py, h) => { const d = TW.edgeD(px, py) * K, g = Math.max(0, 1 - d / (WS * 3.5)) * (0.55 + 0.45 * fh(px * 0.05, py * 0.05)), patch = fh(Math.floor(px / 40), Math.floor(py / 40)) < 0.18 ? 0.35 : 0, w = Math.min(1, g + patch), v = 0.9 + 0.2 * fh(px, py);
    return [v * (1 - w) + w * 0.62 * v, v * (1 - w) + w * 0.82 * v, v * (1 - w) + w * 0.42 * v]; };
  R.forEach(([lo, hi], t) => { const poly = clipX(TW.OUT, lo, hi); if (poly.length < 3) return; const v2 = poly.map((p) => new THREE.Vector2(p[0], p[1])); const tris = THREE.ShapeUtils.triangulateShape(v2, []);
    const emit = (a, b, c, depth) => { const L = Math.max(Math.hypot(a[0] - b[0], a[1] - b[1]), Math.hypot(b[0] - c[0], b[1] - c[1]), Math.hypot(c[0] - a[0], c[1] - a[1])); if (L > 60 && depth < 5) { const m = (u, v) => [(u[0] + v[0]) / 2, (u[1] + v[1]) / 2], ab = m(a, b), bc = m(b, c), ca = m(c, a); emit(a, ab, ca, depth + 1); emit(ab, b, bc, depth + 1); emit(ca, bc, c, depth + 1); emit(ab, bc, ca, depth + 1); return; }
      const h = LV[t]; B.tri('dirt', P(a[0], a[1], h), P(b[0], b[1], h), P(c[0], c[1], h), [tint(a[0], a[1]), tint(b[0], b[1]), tint(c[0], c[1])]); };
    for (const [i, j, k] of tris) emit(poly[i], poly[j], poly[k], 0); });
  // retaining walls: fieldstone faces from each terrace's lip down past the ground, with a capstone course along the top
  const wall = (pa, pb, top, bot, out) => { const [ax, ay] = W2(pa[0], pa[1]), [bx, by] = W2(pb[0], pb[1]), L = Math.hypot(bx - ax, by - ay), nx = (by - ay) / L * out, ny = -(bx - ax) / L * out, cap = WS * 0.28, lip = WS * 0.12;
    const A = [ax / WS, top[0] / WS, ay / WS], Bp = [bx / WS, top[1] / WS, by / WS], C = [bx / WS, bot[1] / WS, by / WS], D = [ax / WS, bot[0] / WS, ay / WS]; const sh = [[0.95, 0.95, 0.95], [0.95, 0.95, 0.95], [0.6, 0.58, 0.55], [0.6, 0.58, 0.55]];
    B.quad('stone', D, C, Bp, A, [sh[3], sh[2], sh[1], sh[0]]);
    const o = (p, dy) => [p[0] + nx * lip / WS, p[1] + dy, p[2] + ny * lip / WS]; B.quad('stone', o(A, -cap / WS), o(Bp, -cap / WS), o(Bp, 0.02), o(A, 0.02), 1.08);
    B.quad('stone', [A[0], A[1] + 0.02, A[2]], o(A, 0.02), o(Bp, 0.02), [Bp[0], Bp[1] + 0.02, Bp[2]], 1.12); };
  const O = TW.OUT; for (let i = 0; i < O.length; i++) { const a = O[i], b = O[(i + 1) % O.length]; if (Math.abs(a[0] - TW.STEP[0]) < 0.5 && Math.abs(b[0] - TW.STEP[0]) < 0.5) { /* the jog where T1 runs further south */ }
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, probe = [m[0] + dy / L * 3, m[1] - dx / L * 3], out = TW.inPoly(O, probe[0], probe[1]) ? -1 : 1;
    const t = TW.tIdx(Math.min(a[0], b[0]) + 0.01), ta = TW.tIdx(a[0] - (a[0] === TW.STEP[0] || a[0] === TW.STEP[1] ? 1 : 0)), top = LV[Math.max(t, ta)], [xa, ya] = W2(a[0], a[1]), [xb, yb] = W2(b[0], b[1]);
    const ha = Math.min(TW.nat(xa, ya), top) - WS * 1.6, hb = Math.min(TW.nat(xb, yb), top) - WS * 1.6; wall(a, b, [LV[TW.tIdx(a[0] - 0.01)], LV[TW.tIdx(b[0] - 0.01)]], [ha, hb], out); }
  // the two terrace steps (open where the cobble stairs come down)
  for (let s = 0; s < 2; s++) { const x = TW.STEP[s]; let y0 = null; const ys = []; for (let py = 0; py <= 580; py += 6) if (TW.inPoly(O, x + 1, py) || TW.inPoly(O, x - 1, py)) ys.push(py);
    const cuts = TW.STAIRS.filter((q) => q[0] === s).map((q) => [q[1], q[2]]).sort((a, b) => a[0] - b[0]), runs = []; let from = ys[0]; for (const [a, b] of cuts) { runs.push([from, a]); from = b; } runs.push([from, ys[ys.length - 1]]); for (const [ya, yb] of runs) for (let py = ya; py < yb; py += 12) { const pb = Math.min(yb, py + 12); wall([x, py], [x, pb], [LV[s], LV[s]], [LV[s + 1] - WS * 0.4, LV[s + 1] - WS * 0.4], 1); } y0; }
  // cobble streets, the square and the stairs (a hair above the terrace tops); edges ragged where the cobbles give way to dirt
  const CB = 0.06 * WS; const cob = (pts, t) => { const v2 = pts.map((p) => new THREE.Vector2(p[0], p[1])); for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(v2, [])) { const a = pts[i], b = pts[j], c = pts[k], h = (p) => TW.lvlPx(p[0], p[1]) + CB; B.tri('cobble', P(a[0], a[1], h(a)), P(b[0], b[1], h(b)), P(c[0], c[1], h(c)), [0.98, 0.96, 0.94]); } };
  const strip = (x0, x1, y0, y1, k) => { const pts = [], n = Math.max(2, Math.round((x1 - x0) / 10)); for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n; pts.push([x, y0 + Math.sin(x * 0.3 + k) * 2.2 + Math.sin(x * 0.11 + k * 3) * 1.5]); } for (let i = n; i >= 0; i--) { const x = x0 + (x1 - x0) * i / n; pts.push([x, y1 + Math.sin(x * 0.27 + k * 2) * 2.2 + Math.sin(x * 0.13 + k) * 1.5]); } return pts; };
  const stripV = (y0, y1, x0, x1, k) => strip(y0, y1, x0, x1, k).map(([a, b]) => [b, a]).reverse();
  cob(strip(-62, TW.STEP[0], TW.BAND[0], TW.BAND[1], 1)); cob(strip(TW.STEP[0] + TW.RUN, TW.STEP[1], TW.BAND[0], TW.BAND[1], 2));
  { const S = TW.SQ, pts = []; for (let a = 0; a < 64; a++) { const t = a / 64 * Math.PI * 2, r = S.r + 2.5 * Math.sin(t * 7) + 1.5 * Math.sin(t * 13); pts.push([S.px + Math.cos(t) * r, S.py + Math.sin(t) * r]); } cob(pts); }
  cob(strip(TW.STEP[1] + TW.RUN, TW.SQ.px, TW.BAND[0], TW.BAND[1], 3)); cob(strip(TW.SQ.px + 40, 662, 246, 298, 4));
  cob(stripV(78, TW.SQ.py - TW.SQ.r + 10, 372, 398, 5)); cob(strip(TW.STEP[1] + TW.RUN, 398, 64, 106, 6)); cob(stripV(TW.SQ.py + TW.SQ.r - 10, 466, 366, 392, 7)); cob(strip(TW.STEP[1] + TW.RUN, 392, 424, 466, 8));
  // stairs: cobble-capped stone steps on the lower side of each step line, with stone cheek walls
  for (const [s, Y0, Y1] of TW.STAIRS) { const b = TW.STEP[s], N = 6, hi = LV[s], lo = LV[s + 1], BAND = [Y0, Y1]; for (let i = 0; i < N; i++) { const xa = b + TW.RUN * i / N, xb = b + TW.RUN * (i + 1) / N, top = hi - (hi - lo) * (i + 0.5) / N + WS * 0.04;
      const c = [[xa, BAND[0]], [xb, BAND[0]], [xb, BAND[1]], [xa, BAND[1]]].map((p) => P(p[0], p[1], top)); B.quad('cobble', c[0], c[1], c[2], c[3], 1.05);
      const f = [[xb, BAND[0]], [xb, BAND[1]]]; B.quad('stone', P(f[0][0], f[0][1], top), P(f[1][0], f[1][1], top), P(f[1][0], f[1][1], top - (hi - lo) / N - WS * 0.05), P(f[0][0], f[0][1], top - (hi - lo) / N - WS * 0.05), 0.8); }
    for (const yy of [BAND[0] - 3, BAND[1] + 3]) for (let i = 0; i < 4; i++) { const xa = b + TW.RUN * i / 4 - 2, xb = b + TW.RUN * (i + 1) / 4 - 2, ha = hi - (hi - lo) * i / 4 + WS * 0.5, hb = hi - (hi - lo) * (i + 1) / 4 + WS * 0.5;
      for (const dy of [-3, 3]) B.quad('stone', P(xa, yy + dy, lo - 2), P(xb, yy + dy, lo - 2), P(xb, yy + dy, hb), P(xa, yy + dy, ha), 0.85); B.quad('stone', P(xa, yy - 3, ha), P(xb, yy - 3, hb), P(xb, yy + 3, hb), P(xa, yy + 3, ha), 1.1); } }
  // rope rails on the drop: timber posts and sagging hemp rope along the square's terrace edge and round the outcrop
  const posts = []; let acc = 0; for (let i = 0; i < O.length; i++) { const a = O[i], b = O[(i + 1) % O.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let s = 0; s < L; s += 2) { acc += 2; const x = a[0] + (b[0] - a[0]) * s / L, y = a[1] + (b[1] - a[1]) * s / L; if (x < TW.STEP[1] + 24 || acc < 30) continue; acc = 0; posts.push([x, y]); } }
  const inset = (p) => { const c = TW.inPoly(O, p[0] + 3, p[1]) ? 3 : -3, d = TW.inPoly(O, p[0], p[1] + 3) ? 3 : -3; return [p[0] + (TW.inPoly(O, p[0] + 3, p[1]) ? 2.5 : -2.5), p[1] + (TW.inPoly(O, p[0], p[1] + 3) ? 2.5 : -2.5)]; };
  const PO = posts.map(inset); PO.forEach((p, i) => { const [x, y] = W2(p[0], p[1]), h = LV[2]; B.frame(x, y, h, i * 0.7); B.box('wood', [0, 0, 0], [0.16, 1.05, 0.16], 0.85); B.lump('wood', [0, 1.02, 0], [0.11, 0.08, 0.11], 0.8, i + 3); TW.PCOL.push([x, y, WS * 0.3]);
    const n = PO[i + 1]; if (!n || Math.hypot(n[0] - p[0], n[1] - p[1]) > 40) return; B.frame(0, 0, 0, 0); for (const hh of [0.95, 0.55]) { const S = 4; for (let k = 0; k < S; k++) { const t0 = k / S, t1 = (k + 1) / S, sag = (t) => -0.16 * Math.sin(Math.PI * t), q0 = [p[0] + (n[0] - p[0]) * t0, p[1] + (n[1] - p[1]) * t0], q1 = [p[0] + (n[0] - p[0]) * t1, p[1] + (n[1] - p[1]) * t1];
      const A = P(q0[0], q0[1], h + (hh + sag(t0)) * WS), Bq = P(q1[0], q1[1], h + (hh + sag(t1)) * WS), e = 0.035; B.quad('rope', [A[0], A[1] - e, A[2]], [Bq[0], Bq[1] - e, Bq[2]], [Bq[0], Bq[1] + e, Bq[2]], [A[0], A[1] + e, A[2]]); } } });
  B.frame(0, 0, 0, 0); B.at();
  // lots: chalk-dashed borders on packed ground, nothing built (H1-H6 future homes, L1 square landmark, L2 Mosby station, L3 lookout)
  for (const [id, px, py, w, d, r] of TW.LOTS) { const h = TW.lvlPx(px, py) + WS * 0.05; const ring = []; if (r) for (let a = 0; a < 24; a++) ring.push([px + Math.cos(a / 24 * 6.283) * r, py + Math.sin(a / 24 * 6.283) * r]); else ring.push([px - w / 2, py - d / 2], [px + w / 2, py - d / 2], [px + w / 2, py + d / 2], [px - w / 2, py + d / 2]);
    for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), nx = -(b[1] - a[1]) / L * 1.1, ny = (b[0] - a[0]) / L * 1.1, u = L * K / WS / 1.0;
      B.quad('chalk', P(a[0] - nx, a[1] - ny, h), P(b[0] - nx, b[1] - ny, h), P(b[0] + nx, b[1] + ny, h), P(a[0] + nx, a[1] + ny, h), null, [[0, 0], [u, 0], [u, 1], [0, 1]]); } }
  return B.flush(G, 'townGround', { noShadow: true });
};
/* ---- building kit helpers (metres) ---- */
Town.kit = (() => {
  const B = Town.gb, WS = Town.WS; let CP = null;
  const set = (p) => { CP = p; }; // current building's world placement, for solid props
  const prop = (x, z, r) => { if (!CP) return; const cs = Math.cos(CP.yaw), sn = Math.sin(CP.yaw); Town.PCOL.push([CP.x + (x * cs + z * sn) * WS, CP.y + (-x * sn + z * cs) * WS, r * WS]); };
  const box = (...a) => B.box(...a), cyl = (...a) => B.cyl(...a), lump = (...a) => B.lump(...a);
  function beam(a, b, w, k, col) { const A = new THREE.Vector3(...a), C = new THREE.Vector3(...b), d = C.clone().sub(A), L = d.length(), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), e = new THREE.Euler().setFromQuaternion(q); box(k || 'wood', a, [w, L, w], col, [e.x, e.y, e.z]); }
  function log(a, b, r, col, rope) { const A = new THREE.Vector3(...a), C = new THREE.Vector3(...b), d = C.clone().sub(A), L = d.length(), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()), e = new THREE.Euler().setFromQuaternion(q), rot = [e.x, e.y, e.z]; cyl('wood', a, r, r * 0.94, L, 8, col, rot, { top: true, bot: true });
    if (rope) for (const t of [0.1, 0.9]) { const C2 = A.clone().addScaledVector(d, L * t); cyl('rope', [C2.x, C2.y, C2.z], r * 1.1, r * 1.1, r * 1.5, 8, 0.95, rot); } }
  function torus(k, c, R, tube, rot, seg, col) { const N = Math.min(seg || 14, 14), M = 4; B.at(c, rot); for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const p = (a, t) => [(R + Math.cos(t) * tube) * Math.cos(a), (R + Math.cos(t) * tube) * Math.sin(a), Math.sin(t) * tube], a = i / N * Math.PI * 2, b = (i + 1) / N * Math.PI * 2, t = j / M * Math.PI * 2, u = (j + 1) / M * Math.PI * 2; B.quad(k, p(a, t), p(b, t), p(b, u), p(a, u), col); } }
  // arched face in the +z plane; base at y=0, centre x=0, width w, height h (top is half circle)
  function arch(k, x, y, z, w, h, col) { const r = w / 2, yc = h - r, pts = [[-r, 0], [r, 0], [r, yc]]; for (let a = 0; a <= 12; a++) { const t = a / 12 * Math.PI; pts.push([Math.cos(t) * r, yc + Math.sin(t) * r]); } pts.push([-r, 0]); B.at([x, y, z]); for (let i = 1; i < pts.length - 1; i++) B.tri(k, [pts[0][0], pts[0][1], 0], [pts[i][0], pts[i][1], 0], [pts[i + 1][0], pts[i + 1][1], 0], col,
      [[(pts[0][0] + r) / w, pts[0][1] / h], [(pts[i][0] + r) / w, pts[i][1] / h], [(pts[i + 1][0] + r) / w, pts[i + 1][1] / h]]); }
  function archFrame(x, y, z, w, h, thick, k, stone) { const r = w / 2, cy = h - r; for (const sg of [-1, 1]) box(k || 'wood', [x + sg * (r + thick / 2), y, z - thick * 0.4], [thick, cy, thick], 1.1);
    const N = stone ? 9 : 12; for (let i = 0; i < N; i++) { const t = (i + 0.5) / N * Math.PI, rr = r + thick * 0.55, xx = x + Math.cos(t) * rr, yy = y + cy + Math.sin(t) * rr; box(k || 'wood', [xx, yy - thick / 2, z - thick * 0.4], [Math.PI * rr / N * (stone ? 0.88 : 1.04), thick, thick], 0.94 + (i % 3) * 0.05, [0, 0, t - Math.PI / 2]); } }
  function door(x, y, z, w, h, o) { o = o || {}; arch('woodV', x, y, z, w, h, o.col || 0.85); archFrame(x, y, z + 0.015, w, h, o.stone ? 0.22 : 0.15, o.stone ? 'stone' : 'wood', o.stone);
    for (const yy of [0.45, 1.15]) { box('iron', [x - w * 0.31, y + yy, z + 0.03], [w * 0.5, 0.075, 0.055], 0.8); cyl('brass', [x + w * 0.23, y + yy, z + 0.06], 0.04, 0.04, 0.035, 6, 1, [Math.PI / 2, 0, 0], { top: true }); }
    torus('brass', [x + w * 0.23, y + 0.9, z + 0.09], 0.085, 0.025, null, 10, 1); }
  function win(x, y, z, w, h, o) { o = o || {}; arch('glowWin', x, y, z, w, h, [0.95, 0.9, 0.78]); archFrame(x, y, z + 0.02, w, h, 0.11, 'wood'); box('wood', [x, y - 0.08, z + 0.02], [w + 0.3, 0.13, 0.24], 0.9);
    if (o.shutters) for (const sg of [-1, 1]) { box('woodV', [x + sg * (w * 0.65 + 0.08), y + 0.05, z - 0.04], [w * 0.32, h * 0.72, 0.09], [0.75, 0.8, 0.62]); box('iron', [x + sg * (w * 0.65 + 0.08), y + h * 0.25, z + 0.02], [w * 0.32, 0.035, 0.03], 0.6); } }
  function lamp(x, y, z, scale) { const s = scale || 1; box('brass', [x, y + 0.1 * s, z], [0.25 * s, 0.06 * s, 0.25 * s], 0.85); cyl('glowTeal', [x, y + 0.16 * s, z], 0.1 * s, 0.1 * s, 0.38 * s, 8, [0.75, 0.95, 0.9]); cyl('brass', [x, y + 0.52 * s, z], 0.17 * s, 0.06 * s, 0.13 * s, 8, 0.9, null, { top: true });
    for (const sg of [-1, 1]) beam([x + sg * 0.11 * s, y + 0.15 * s, z], [x + sg * 0.11 * s, y + 0.55 * s, z], 0.035 * s, 'iron'); torus('brass', [x, y + 0.7 * s, z], 0.07 * s, 0.018 * s, null, 10); }
  function crystal(x, y, z, r, h) { B.at([x, y, z]); const N = 6, sh = [[0.55, 0.85, 0.85], [0.72, 1, 0.95], [0.95, 1.1, 1.05], [0.65, 0.9, 0.92], [0.85, 1.05, 1], [0.5, 0.8, 0.85]]; for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2, b = (i + 1) / N * Math.PI * 2, P = (t, yy, rr) => [Math.cos(t) * rr, yy, Math.sin(t) * rr]; B.quad('glowTeal', P(a, 0, r * 0.72), P(b, 0, r * 0.72), P(b, h * 0.63, r), P(a, h * 0.63, r), sh[i]); B.tri('glowTeal', P(a, h * 0.63, r), P(b, h * 0.63, r), [0.06 * r, h, 0], sh[i]); } }
  function crate(x, y, z, s, o) { o = o || {}; prop(x, z, s * 0.72); box('wood', [x, y, z], [s, s, s], 1); for (const sg of [-1, 1]) { box('wood', [x, y + (sg > 0 ? s - 0.1 : 0), z], [s + 0.03, 0.11, s + 0.03], 0.8); for (const zz of [-1, 1]) box('wood', [x + sg * (s / 2 - 0.06), y, z + zz * (s / 2 + 0.01)], [0.1, s, 0.06], 0.75); }
    for (const zz of [-1, 1]) beam([x - s * 0.4, y + 0.1, z + zz * s * 0.51], [x + s * 0.4, y + s - 0.1, z + zz * s * 0.51], 0.09, 'wood', 0.75); if (o.crystal) { box('wood', [x, y + s * 0.75, z], [s, 0.15, s], 0.8); for (let k = 0; k < 3; k++) crystal(x + (k - 1) * s * 0.24, y + s * 0.8, z, s * 0.12, s * (0.25 + 0.15 * (k % 2))); } }
  function barrel(x, y, z, r, h, o) { prop(x, z, r); o = o || {}; cyl('woodV', [x, y, z], r * 0.88, r, h * 0.22, 10, 1); cyl('woodV', [x, y + h * 0.22, z], r, r * 1.02, h * 0.56, 10, 1); cyl('woodV', [x, y + h * 0.78, z], r * 1.02, r * 0.88, h * 0.22, 10, 1, null, { top: true }); for (const f of [0.13, 0.82]) cyl('iron', [x, y + h * f, z], r * (f < 0.5 ? 0.96 : 0.99), r * (f < 0.5 ? 0.96 : 0.99), h * 0.07, 10, 0.8); torus('wood', [x, y + h + 0.01, z], r * 0.84, 0.06, [Math.PI / 2, 0, 0], 12, 0.9); if (o.rope) for (let k = 0; k < 3; k++) torus('rope', [x, y + h + 0.03 + k * 0.04, z], r * (0.48 + k * 0.1), 0.045, [Math.PI / 2, 0, 0], 16, 1); }
  function sack(x, y, z, r, h) { prop(x, z, r * 0.7); lump('dirt', [x, y, z], [r, h, r * 0.8], [1.1, 1.05, 0.9], Math.floor(x * x * 41 + z * z * 17 + 1)); cyl('rope', [x, y + h * 0.82, z], r * 0.3, r * 0.3, h * 0.06, 8, 0.8); }
  function sign(id, x, y, z, o) { o = o || {}; const w = o.w || 0.75, h = o.h || 0.92; beam([x - 0.1, y + h + 0.35, z - 0.4], [x - 0.1, y + h + 0.35, z + 0.4], 0.085, 'brass'); beam([x - 0.1, y + h + 0.35, z - 0.4], [x - 0.1, y + h + 0.05, z + 0.25], 0.05, 'brass');
    for (const sx of [-0.25, 0.25]) torus('iron', [x + sx * w, y + h + 0.12, z + 0.36], 0.08, 0.02, null, 10); box('wood', [x, y, z + 0.36], [w + 0.08, h + 0.04, 0.1], 0.8); const c = Town.art.SIGN_CELLS[id], u = (c % 4) / 4, v = Math.floor(c / 4) / 2; B.at([x, y, z + 0.42]);
    B.quad('sign', [-w / 2, 0, 0], [w / 2, 0, 0], [w / 2, h, 0], [-w / 2, h, 0], 1, [[u + 0.005, 1 - v - 0.495], [u + 0.245, 1 - v - 0.495], [u + 0.245, 1 - v - 0.005], [u + 0.005, 1 - v - 0.005]]); }
  function porch(x, z, w, d, y, steps) { const ht = y || 0.38; box('stone', [x, -0.12, z], [w + 0.15, ht, d + 0.1], 0.95); box('wood', [x, ht - 0.02, z], [w, 0.13, d], 1.05); const n = steps || 2; for (let i = 0; i < n; i++) { const h = ht * (n - i) / n; box('wood', [x, 0, z + d / 2 + 0.13 + i * 0.25], [Math.min(w * 0.7, 2), h, 0.3], 0.9); } }
  function corners(w, d, h, hp, o) { o = o || {}; for (const sx of [-1, 1]) for (const sz of [-1, 1]) { box('wood', [sx * (w / 2 - 0.05), hp, sz * (d / 2 - 0.05)], [0.25, h - hp, 0.25], 0.9); for (const yy of [hp + 0.15, h - 0.4]) cyl('rope', [sx * (w / 2 - 0.05), yy, sz * (d / 2 - 0.05)], 0.2, 0.2, 0.17, 8, 1); } }
  function trussFront(w, z, ye, yr, x) { x = x || 0; log([x - w / 2 - 0.2, ye - 0.15, z], [x, yr + 0.12, z], 0.17, 0.9, true); log([x, yr + 0.12, z], [x + w / 2 + 0.2, ye - 0.15, z], 0.17, 0.9, true); beam([x - w / 2, ye, z], [x + w / 2, ye, z], 0.22, 'wood', 0.85); beam([x, ye, z], [x, yr - 0.15, z], 0.2, 'wood', 0.85); }
  // front-gable roof (ridge along z, front at +z): achieved by a yawed cross-gable
  function frontRoof(x, z, w, d, ye, yr, o) { o = o || {}; const ov = o.ov == null ? 0.42 : o.ov; B.gable([x, 0, z], -d / 2, d / 2, -w / 2, w / 2, ye, yr, ov, 0.18, { r: [0, Math.PI / 2, 0], wall: o.wall || 'plaster', wallCol: o.wallCol || 0.8, sd: o.sd || 19, lumps: o.lumps });
    // ridge log + barge boards (warped / hooked at ends)
    const zy = yr + 0.2; log([x, zy + 0.1, z - d / 2 - 0.5], [x, zy, z + d / 2 + 0.55], 0.19, 1, true); for (const sg of [-1, 1]) { const zz = z + sg * (d / 2 + ov + 0.02); trussFront(w + ov * 1.4, zz, ye - 0.25, yr + 0.05, x); } }
  function chimney(x, z, y0, h, w, d, soot) { box(soot ? 'brick' : 'stone', [x, y0, z], [w, h - y0, d], 0.85); box('stone', [x, h - 0.18, z], [w + 0.22, 0.2, d + 0.22], 0.7); box('iron', [x, h + 0.03, z], [w * 0.7, 0.02, d * 0.7], 0.25); }
  function dormer(x, y, z, w, d) { box('woodV', [x, y, z], [w, 0.8, d], 0.9); frontRoof(x, z, w, d, y + 0.75, y + 1.45, { wall: 'woodV', ov: 0.2, sd: 39 }); win(x, y + 0.05, z + d / 2 + 0.05, w * 0.48, 0.85); }
  function awning(x, y, z, w, d, green) { const k = green ? 'canvasG' : 'canvas', N = 6; B.at([x, y, z]); for (let i = 0; i < N; i++) { const t0 = i / N, t1 = (i + 1) / N, f = (t) => -0.45 * t - 0.08 * Math.sin(Math.PI * t), a = [x - w / 2, y + f(t0), z + d * t0], b = [x + w / 2, y + f(t0), z + d * t0], c = [x + w / 2, y + f(t1), z + d * t1], d2 = [x - w / 2, y + f(t1), z + d * t1]; B.at(); B.quad(k, a, b, c, d2, 1, [[0, 1 - t0], [1, 1 - t0], [1, 1 - t1], [0, 1 - t1]]); }
    // scalloped valance, one scallop per stripe (no alpha)
    for (let i = 0; i < 8; i++) { const x0 = x - w / 2 + w * i / 8, x1 = x - w / 2 + w * (i + 1) / 8, yy = y - 0.45, zz = z + d; B.at(); B.quad(k, [x0, yy, zz], [x1, yy, zz], [x1, yy - 0.19, zz], [x0, yy - 0.19, zz], 1, [[i / 8, 1], [(i + 1) / 8, 1], [(i + 1) / 8, 0.8], [i / 8, 0.8]]); B.tri(k, [x0, yy - 0.19, zz], [x1, yy - 0.19, zz], [(x0 + x1) / 2, yy - 0.3, zz], 1, [[i / 8, 0.8], [(i + 1) / 8, 0.8], [(i + 0.5) / 8, 0.7]]); }
    for (const sg of [-1, 1]) { log([x + sg * (w / 2 - 0.08), 0.4, z + d - 0.04], [x + sg * (w / 2 - 0.08), y - 0.38, z + d - 0.04], 0.075, 0.8); prop(x + sg * (w / 2 - 0.08), z + d - 0.04, 0.16); } }
  // the established gold spiral drill on an angled wooden tripod (as on the drill sheets), merged into the town's meshes
  function drill(x, z, ry) { for (let i = 0; i < 3; i++) { const a = ry + i / 3 * Math.PI * 2; log([x + Math.cos(a) * 0.75, 0, z + Math.sin(a) * 0.75], [x, 1.75, z], 0.07, 0.85, i === 0); } prop(x, z, 0.8);
    const tilt = [0.0, ry, -0.75]; B.at([x, 1.55, z], tilt); const T = new THREE.Matrix4().compose(new THREE.Vector3(x, 1.55, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, -0.75)), new THREE.Vector3(1, 1, 1)), P = (a, b, c) => new THREE.Vector3(a, b, c).applyMatrix4(T).toArray();
    cyl('brass', P(0, 0, 0), 0.24, 0.24, 0.55, 10, 1, tilt, { top: true, bot: true }); cyl('iron', P(0, 0.55, 0), 0.16, 0.16, 0.12, 8, 0.8, tilt, { top: true }); cyl('brass', P(0, -0.55, 0), 0.2, 0.02, 0.0001, 8, 1, tilt);
    cyl('brass', P(0, 0, 0), 0.19, 0.03, -1.0, 10, [1.15, 1.0, 0.6], tilt); for (let i = 0; i < 14; i++) { const t = i / 14, r = 0.21 * (1 - t) + 0.03, a = t * Math.PI * 6; box('brass', P(Math.cos(a) * r, -t * 1.0, Math.sin(a) * r), [0.07, 0.05, 0.16], [1.2, 1.05, 0.55], [tilt[0], tilt[1] - a, tilt[2]]); } }
  return { drill, set, prop, box, cyl, lump, beam, log, torus, arch, archFrame, door, win, lamp, crystal, crate, barrel, sack, sign, porch, corners, trussFront, frontRoof, chimney, dormer, awning };
})();
/* ---- the six buildings (per-building folders are the design source): local metres, ground at the terrace top, front toward +z ---- */
Town.houses = (() => {
  const k = Town.kit, B = Town.gb, box = k.box, cyl = k.cyl, lump = k.lump;
  const ST = [0.96, 0.94, 0.9], WD = 0.92;
  function general_store() { // 1.5 x 1.25 SU, 1.5 storeys: fieldstone ground floor, timber-framed upper floor, moss roof + dormer, striped awning, porch with goods, crate lean-to on the right
    const x0 = -3.55, x1 = 1.85, cx = (x0 + x1) / 2, z0 = -2.5, z1 = 2.0, w = x1 - x0, d = z1 - z0, cz = (z0 + z1) / 2;
    box('stone', [cx, 0, cz], [w, 2.5, d], ST); box('plaster', [cx, 2.5, cz], [w - 0.1, 1.05, d - 0.1], 0.95); k.corners(w, d, 3.55, 0, {}); B.at();
    for (const z of [z1 + 0.02]) { k.beam([x0, 2.5, z], [x1, 2.5, z], 0.2, 'wood'); k.beam([x0, 3.5, z], [x1, 3.5, z], 0.18, 'wood'); for (let i = 1; i < 5; i++) k.beam([x0 + w * i / 5, 2.5, z], [x0 + w * i / 5, 3.5, z], 0.14, 'wood'); k.beam([x0 + 0.3, 2.6, z], [x0 + w * 0.2, 3.45, z], 0.11, 'wood'); k.beam([x1 - 0.3, 2.6, z], [x1 - w * 0.2, 3.45, z], 0.11, 'wood'); }
    for (const x of [x0 - 0.03, x1 + 0.03]) { k.beam([x, 3.5, z0], [x, 3.5, z1], 0.18); k.beam([x, 3.5, z0 + 0.3], [x, 5.9, cz], 0.14); k.beam([x, 3.5, z1 - 0.3], [x, 5.9, cz], 0.14); k.beam([x, 3.5, cz], [x, 5.95, cz], 0.14); }
    B.gable([cx, 0, cz], x0, x1, z0, z1, 3.5, 6.0, 0.55, 0.22, { wall: 'plaster', wallCol: 0.9, sd: 11 }); k.log([x0 - 0.75, 6.2, cz], [x1 + 0.75, 6.25, cz], 0.2, 1, true);
    k.dormer(cx - 0.9, 4.0, 1.0, 1.3, 1.4); k.chimney(x0 + 0.7, z0 + 0.8, 4.0, 7.2, 0.8, 0.8);
    k.door(0.35, 0.05, z1 + 0.03, 1.15, 2.05); k.win(-1.9, 0.9, z1 + 0.03, 0.85, 1.15, { shutters: 1 }); k.win(-1.4, 2.65, z1 + 0.04, 0.6, 0.7); k.win(1.25, 0.95, z1 + 0.03, 0.55, 0.85);
    k.awning(0.55, 2.55, z1 + 0.05, 2.8, 1.35); k.porch(cx, z1 + 0.6, w + 0.3, 1.15, 0.32, 2); k.lamp(-0.55, 1.6, z1 + 0.18, 1);
    // goods: ore barrels and a crystal crate on the porch, sacks
    k.barrel(-3.0, 0.3, z1 + 0.65, 0.33, 0.75); k.barrel(-2.35, 0.3, z1 + 0.7, 0.3, 0.7); for (const [x, z] of [[-3.0, z1 + 0.65], [-2.35, z1 + 0.7]]) for (let i = 0; i < 4; i++) k.crystal(x + (i % 2 - 0.5) * 0.25, 1.0, z + (i > 1 ? 0.1 : -0.1), 0.06, 0.2 + i * 0.03);
    k.crate(1.35, 0.32, z1 + 0.6, 0.6, { crystal: 1 }); k.sack(-1.1, 0.32, z1 + 0.85, 0.26, 0.5); k.sack(2.35, 0, z1 + 1.15, 0.3, 0.55);
    // the tall stacked-crate lean-to on the right side under a plank roof
    for (const [x, y, z, s] of [[2.35, 0, 1.1, 0.95], [3.15, 0, 1.0, 0.75], [2.4, 0, 0.0, 0.9], [3.2, 0, -0.2, 0.85], [2.6, 0.95, 0.75, 0.8], [3.1, 0.85, -0.1, 0.7], [2.5, 0.9, -0.9, 0.85], [2.8, 1.75, 0.2, 0.7], [2.4, 0, -1.2, 0.8]]) k.crate(x, y, z, s);
    k.beam([x1, 2.7, -1.8], [3.55, 2.15, -1.8], 0.12); k.beam([x1, 2.7, 1.6], [3.55, 2.15, 1.6], 0.12); box('wood', [2.7, 2.35, -0.1], [1.9, 0.1, 3.8], 0.85, [0, 0, -0.32]); k.log([3.5, 0, 1.6], [3.5, 2.2, 1.6], 0.09, 0.8); k.log([3.5, 0, -1.8], [3.5, 2.2, -1.8], 0.09, 0.8);
    k.sign('general_store', 2.4, 1.85, z1 + 0.2); for (let i = 0; i < 6; i++) lump('moss', [x0 + 0.2 + i * 0.9, 0, z1 + 0.05 + (i % 2) * 0.1], [0.35, 0.22, 0.25], [0.9, 1, 0.85], 5 + i);
    return { foot: [[x0, z0, x1, z1 + 1.2], [x1, -1.8, 3.6, 1.6]] }; }
  function smithy() { // 1.75 x 1.25 SU: fat stone chimney / forge tower on the left with a glowing mouth, timber crane arm with pulley and hook, open-sided work shed, the gold spiral drill on its tripod out front
    const x0 = -1.4, x1 = 3.9, z0 = -2.6, z1 = 1.5, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    box('stone', [cx, 0, cz], [w, 1.0, d], ST); box('woodV', [cx, 1.0, cz], [w - 0.12, 1.9, d - 0.12], 0.9); k.corners(w, d, 2.95, 0); B.at();
    B.gable([cx, 0, cz], x0, x1, z0, z1, 2.9, 5.1, 0.5, 0.22, { wall: 'woodV', wallCol: 0.8, sd: 23 }); k.log([x0 - 0.6, 5.3, cz], [x1 + 0.7, 5.35, cz], 0.19, 1, true); k.dormer(cx + 0.6, 3.4, 0.55, 1.2, 1.3);
    k.win(2.9, 1.1, z1 + 0.03, 0.7, 0.95, { shutters: 1 }); k.door(0.3, 0.02, z1 + 0.03, 1.1, 2.0, { col: 0.7 });
    // forge tower: fat tapered fieldstone, sooty brick stack above, glowing arched forge mouth at the front
    cyl('stone', [-2.75, 0, -0.55], 1.55, 1.25, 3.4, 10, ST, null, { top: true }); box('stone', [-2.75, 3.3, -0.55], [1.7, 2.6, 1.7], ST); box('brick', [-2.75, 5.9, -0.55], [1.25, 2.3, 1.25], 0.8); box('stone', [-2.75, 8.15, -0.55], [1.55, 0.25, 1.55], 0.75); box('iron', [-2.75, 8.4, -0.55], [0.9, 0.03, 0.9], 0.15);
    for (let i = 0; i < 6; i++) lump('stone', [-2.75 + Math.cos(i) * 1.45, 0, -0.55 + Math.sin(i) * 1.45], [0.45, 0.4, 0.4], 0.9, 31 + i);
    k.arch('glowFire', -2.75, 0.55, 0.98, 1.15, 1.25, 1); k.archFrame(-2.75, 0.55, 1.0, 1.15, 1.25, 0.26, 'stone', 1); box('stone', [-2.75, 0, 1.15], [1.9, 0.55, 0.5], 0.85);
    // brass bellows beside the forge
    box('brass', [-1.6, 0.55, 1.35], [0.15, 0.2, 0.6], 1, [0.5, 0, 0]); lump('iron', [-1.55, 0.6, 1.4], [0.35, 0.3, 0.45], [0.55, 0.42, 0.35], 77); k.beam([-1.55, 0.95, 1.4], [-1.95, 1.0, 1.0], 0.07, 'wood');
    // crane arm: post, raking brace, horizontal boom, pulley and hook on a rope
    k.log([-1.25, 0, 2.1], [-1.25, 5.3, 2.1], 0.17, 0.9, true); k.log([-1.25, 5.1, 2.1], [-3.9, 5.2, 2.3], 0.15, 0.9); k.beam([-1.25, 3.6, 2.1], [-2.9, 5.1, 2.25], 0.12); k.prop(-1.25, 2.1, 0.25);
    k.torus('iron', [-3.65, 4.85, 2.28], 0.22, 0.06, null, 12, 0.8); k.beam([-3.65, 4.6, 2.28], [-3.65, 1.7, 2.28], 0.045, 'rope'); k.torus('iron', [-3.65, 1.55, 2.28], 0.13, 0.04, [0, 0, 0.6], 10, 0.6);
    // the open-sided work shed on the front right: lean-to on posts, anvil on a stump, grindstone, tool rack
    for (const x of [0.6, 2.2, 3.85]) { k.log([x, 0, 3.05], [x, 2.35, 3.05], 0.11, 0.85); k.prop(x, 3.05, 0.18); } box('moss', [2.25, 2.5, 2.3], [3.6, 0.14, 1.9], 0.9, [0.28, 0, 0]); for (let i = 0; i < 4; i++) lump('moss', [0.6 + i * 1.1, 2.15, 3.25], [0.4, 0.25, 0.25], 0.9, 41 + i);
    cyl('wood', [1.35, 0, 2.3], 0.34, 0.3, 0.55, 9, 0.8, null, { top: true }); box('iron', [1.35, 0.55, 2.3], [0.75, 0.22, 0.3], 0.8); box('iron', [1.35, 0.77, 2.3], [0.95, 0.15, 0.36], 0.85); box('iron', [1.85, 0.79, 2.3], [0.35, 0.09, 0.15], 0.85); k.prop(1.35, 2.3, 0.42);
    cyl('stone', [3.05, 0.55, 2.4], 0.5, 0.5, 0.18, 14, 1, [Math.PI / 2, 0, 0], { top: true, bot: true }); for (const s of [-0.18, 0.18]) k.beam([3.05 + s * 2, 0, 2.4], [3.05, 0.7, 2.4], 0.08); k.prop(3.05, 2.4, 0.5);
    box('wood', [2.2, 0.9, 1.6], [1.3, 0.1, 0.12], 0.8); for (let i = 0; i < 4; i++) k.beam([1.75 + i * 0.3, 0.4, 1.66], [1.75 + i * 0.3, 1.25, 1.66], 0.05, i % 2 ? 'iron' : 'wood');
    k.barrel(0.0, 0, 2.7, 0.33, 0.8, { rope: 1 }); k.crate(-0.65, 0, 2.95, 0.55); k.lamp(2.1, 1.6, z1 + 0.16); k.sign('smithy', 4.1, 1.6, 1.0);
    // a coil of rope and the drill's spot (the established gold spiral drill model is placed by Town.build)
    k.torus('rope', [-0.35, 0.06, 3.5], 0.35, 0.07, [Math.PI / 2, 0, 0], 14); k.torus('rope', [-0.35, 0.16, 3.5], 0.26, 0.07, [Math.PI / 2, 0, 0], 14);
    return { foot: [[x0, z0, x1, z1], [-4.3, -2.1, x0, 1.45], [0.4, 1.5, 4.0, 3.2]], drill: [-2.9, 2.7, 0.55] }; }
  function rope_maker() { // 3.5 x 1 SU rope-walk hall, open-sided, plus a 0.75 SU drying tower with ropes hanging; giant spoked twisting wheel on the front gable
    const w = 4.6, zF = 8.2, zB = -4.4, L = zF - zB, cz = (zF + zB) / 2;
    box('stone', [0, 0, cz], [w, 0.55, L], ST); box('wood', [0, 0.55, cz], [w - 0.4, 0.08, L - 0.3], 0.75);
    for (let z = zB + 0.15; z <= zF - 0.1; z += L / 6) for (const sg of [-1, 1]) { k.log([sg * (w / 2 - 0.15), 0.5, z], [sg * (w / 2 - 0.15), 2.45, z], 0.14, 0.85, true); k.beam([sg * (w / 2 - 0.15), 2.0, z], [sg * (w / 2 - 0.15), 2.4, z + (z < zF - 1 ? 0.6 : -0.6)], 0.08); }
    for (const sg of [-1, 1]) { k.beam([sg * (w / 2 - 0.15), 2.4, zB], [sg * (w / 2 - 0.15), 2.4, zF], 0.2); k.beam([sg * (w / 2 - 0.15), 1.25, zB], [sg * (w / 2 - 0.15), 1.25, zF], 0.08, 'rope'); }
    k.frontRoof(0, cz, w, L, 2.45, 4.5, { wall: 'woodV', wallCol: 0.78, sd: 51 }); box('woodV', [0, 0.55, zF - 0.05], [w - 0.3, 1.9, 0.12], 0.8); box('woodV', [0, 0.55, zB + 0.05], [w - 0.3, 1.9, 0.12], 0.8);
    // the giant spoked wheel on the front gable
    const wc = [0, 2.15, zF + 0.35], R = 1.85; k.torus('wood', wc, R, 0.14, null, 26, 0.95); k.torus('wood', wc, R - 0.32, 0.07, null, 22, 0.85); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; k.beam(wc, [wc[0] + Math.cos(a) * (R - 0.05), wc[1] + Math.sin(a) * (R - 0.05), wc[2]], 0.09); }
    cyl('brass', [0, 2.15, zF + 0.1], 0.32, 0.32, 0.5, 10, 1, [Math.PI / 2, 0, 0], { top: true, bot: true }); k.torus('rope', [0, 2.15, zF + 0.62], 0.2, 0.06, null, 10); k.beam([-0.5, 0.0, zF + 0.4], [0, 2.15, zF + 0.4], 0.14); k.beam([0.5, 0.0, zF + 0.4], [0, 2.15, zF + 0.4], 0.14); k.prop(0, zF + 0.4, 0.5);
    // rope walk inside: strands stretched the hall's length, spools of pale-blue glowing tether cord
    for (const x of [-0.8, -0.25, 0.3, 0.85]) k.beam([x, 1.05, zB + 0.4], [x, 1.1, zF - 0.6], 0.035, 'rope');
    for (let i = 0; i < 4; i++) { const z = zB + 1.6 + i * 2.6, x = i % 2 ? 1.25 : -1.25; for (const s of [-0.32, 0.32]) cyl('wood', [x + s, 0.63, z], 0.45, 0.45, 0.06, 12, 0.85, [0, 0, Math.PI / 2], { top: true, bot: true }); cyl('glowTeal', [x - 0.3, 0.63, z], 0.36, 0.36, 0.6, 12, [0.55, 0.8, 1.15], [0, 0, -Math.PI / 2]); }
    // drying tower at the back end: four posts, braces, two platforms, a small roof, ropes hanging down
    const tz = zB - 1.75, tw = 3.4, th = 8.2; for (const sx of [-1, 1]) for (const sz of [-1, 1]) { k.log([sx * tw / 2, 0, tz + sz * tw / 2], [sx * tw / 2 * 0.9, th, tz + sz * tw / 2 * 0.9], 0.15, 0.85, true); }
    for (const y of [2.6, 5.4]) { box('wood', [0, y, tz], [tw + 0.2, 0.14, tw + 0.2], 0.85); for (const sg of [-1, 1]) { k.beam([sg * tw / 2, y - 2.3, tz - tw / 2], [-sg * tw / 2, y, tz - tw / 2], 0.1); k.beam([tw / 2, y - 2.3, tz + sg * tw / 2], [tw / 2, y, tz - sg * tw / 2], 0.1); k.beam([-tw / 2, y - 2.3, tz + sg * tw / 2], [-tw / 2, y, tz - sg * tw / 2], 0.1); } }
    cyl('moss', [0, th, tz], 2.7, 0.15, 1.6, 4, 0.95, [0, Math.PI / 4, 0], { bot: true }); box('wood', [0, th - 0.1, tz], [tw, 0.2, tw], 0.8); for (let i = 0; i < 7; i++) { const x = -1.2 + i * 0.4; k.beam([x, th - 0.2, tz + 0.3 * (i % 3 - 1)], [x + 0.05, 1.0 + (i % 3) * 0.6, tz + 0.3 * (i % 3 - 1)], 0.05, 'rope'); }
    k.beam([0, th - 0.4, tz + tw / 2], [0, 1.0, zB + 0.3], 0.04, 'rope'); k.lamp(-w / 2 - 0.1, 1.5, zF - 0.3); k.lamp(w / 2 + 0.1, 1.5, zF - 0.3); k.sign('rope_maker', -w / 2 - 0.6, 1.5, zF - 0.6);
    k.barrel(w / 2 + 0.55, 0, zF - 1.6, 0.32, 0.75, { rope: 1 }); k.crate(w / 2 + 0.6, 0, zF - 2.6, 0.6); k.lump('moss', [-w / 2 - 0.2, 0, 2], [0.5, 0.3, 0.9], 0.9, 66);
    return { foot: [[-w / 2 - 0.2, zB, w / 2 + 0.2, zF + 0.6], [-tw / 2 - 0.2, tz - tw / 2 - 0.2, tw / 2 + 0.2, zB]] }; }
  function bank() { // a round squat fieldstone drum (1.5 SU across), riveted brass dome with a teal crystal finial, a giant round vault door as the entrance, front steps; no lettering
    const R = 3.25; cyl('stone', [0, 0, 0], R + 0.25, R + 0.2, 0.45, 24, 0.85, null, { top: true }); cyl('stone', [0, 0.45, 0], R, R, 2.9, 24, ST, null, {}); cyl('stone', [0, 3.35, 0], R + 0.22, R + 0.22, 0.28, 24, 0.75, null, { top: true });
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + 0.13; if (Math.abs(Math.sin(a) - 1) < 0.15) continue; box('stone', [Math.cos(a) * (R + 0.05), 0.45, Math.sin(a) * (R + 0.05)], [0.4, 2.9, 0.3], 0.85, [0, -a + Math.PI / 2, 0]); }
    cyl('stone', [0, 3.63, 0], 2.9, 2.85, 0.45, 22, 0.9, null, {}); cyl('brass', [0, 4.08, 0], 3.0, 3.0, 0.14, 22, 0.8, null, { top: true }); B.dome('brass', [0, 4.15, 0], 2.85, 2.1, 20, 7, 1);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; for (let j = 0; j < 6; j++) { const p0 = j / 6 * Math.PI / 2 * 0.92, p1 = (j + 1) / 6 * Math.PI / 2 * 0.92; k.beam([Math.cos(p0) * Math.cos(a) * 2.88, 4.15 + Math.sin(p0) * 2.12, Math.cos(p0) * Math.sin(a) * 2.88], [Math.cos(p1) * Math.cos(a) * 2.88, 4.15 + Math.sin(p1) * 2.12, Math.cos(p1) * Math.sin(a) * 2.88], 0.09, 'brass', 0.75); } }
    cyl('brass', [0, 6.2, 0], 0.4, 0.25, 0.3, 10, 0.9, null, { top: true }); k.crystal(0, 6.45, 0, 0.22, 0.85);
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + 0.3; lump('moss', [Math.cos(a) * (R + 0.15), 0.4, Math.sin(a) * (R + 0.15)], [0.45, 0.25, 0.3], [0.9, 1, 0.85], 81 + i); }
    // the vault door: a thick round brass disc in a stone surround, a spoked wheel, a ring of bolts, the hinge on the left
    const dz = R + 0.04, dy = 1.55, dr = 1.2; k.torus('stone', [0, dy, dz], dr + 0.18, 0.26, null, 22, 0.8); cyl('brass', [0, dy, dz - 0.1], dr, dr, 0.3, 24, 0.95, [Math.PI / 2, 0, 0], { top: true });
    k.torus('brass', [0, dy, dz + 0.24], dr * 0.86, 0.06, null, 22, 0.7); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; cyl('iron', [Math.cos(a) * dr * 0.93, dy + Math.sin(a) * dr * 0.93, dz + 0.2], 0.055, 0.04, 0.07, 6, 0.8, [Math.PI / 2, 0, 0], { top: true }); }
    k.torus('iron', [0, dy, dz + 0.36], 0.55, 0.06, null, 16, 0.85); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; k.beam([0, dy, dz + 0.36], [Math.cos(a) * 0.55, dy + Math.sin(a) * 0.55, dz + 0.36], 0.06, 'iron', 0.9); } cyl('brass', [0, dy, dz + 0.22], 0.2, 0.2, 0.22, 10, 1, [Math.PI / 2, 0, 0], { top: true });
    for (const y of [0.85, 2.25]) box('iron', [-dr - 0.15, dy - 1.55 + y, dz + 0.05], [0.35, 0.22, 0.3], 0.7);
    for (let i = 0; i < 3; i++) cyl('stone', [0, i * 0.15, dz - 0.3], 2.0 - i * 0.18 + 0.6, 2.0 - i * 0.18 + 0.6, 0.15, 16, 0.9 + i * 0.05, null, { top: true, a0: 0.1, a1: Math.PI - 0.1 });
    for (const sg of [-1, 1]) { const a = Math.PI / 2 + sg * 1.0, x = Math.cos(a) * (R + 0.02), z = Math.sin(a) * (R + 0.02); B.at([x, 2.0, z], [0, -a + Math.PI / 2, 0]); cyl('glowWin', [x, 2.05, z], 0.42, 0.42, 0.06, 14, 1, [Math.PI / 2, -a + Math.PI / 2, 0], { top: true }); k.torus('brass', [x, 2.05, z], 0.45, 0.07, [0, -a + Math.PI / 2, 0], 14, 0.9); }
    k.lamp(-1.85, 1.4, R - 0.45); k.lamp(1.85, 1.4, R - 0.45); k.sign('bank', 3.0, 1.9, 2.0);
    return { foot: [[0, 0, R + 0.3], [-1.9, R - 0.5, 1.9, R + 1.15]] }; }
  function inn() { // 2 x 1.75 SU, L-shaped, 2.5 storeys - the tallest: timber-framed main block, balcony with rope rails, tall stone chimney, two dormers, a lower one-storey wing with an outdoor table
    const x0 = -4.6, x1 = 1.2, z0 = -4.1, z1 = 1.4, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    box('stone', [cx, 0, cz], [w, 2.9, d], ST); box('plaster', [cx, 2.9, cz], [w - 0.1, 2.8, d - 0.1], 0.95); k.corners(w, d, 5.7, 0); B.at();
    for (const z of [z1 + 0.02]) { for (const y of [2.9, 5.65]) k.beam([x0, y, z], [x1, y, z], 0.2); for (let i = 0; i <= 6; i++) k.beam([x0 + w * i / 6, 2.9, z], [x0 + w * i / 6, 5.65, z], 0.15); for (let i = 0; i < 6; i += 2) k.beam([x0 + w * i / 6, 2.95, z], [x0 + w * (i + 1) / 6, 4.2, z], 0.1); }
    for (const x of [x0 - 0.03, x1 + 0.03]) { for (const y of [2.9, 5.65]) k.beam([x, y, z0], [x, y, z1], 0.2); for (let i = 0; i <= 5; i++) k.beam([x, 2.9, z0 + d * i / 5], [x, 5.65, z0 + d * i / 5], 0.15); k.beam([x, 5.65, z0 + 0.3], [x, 8.8, cz], 0.15); k.beam([x, 5.65, z1 - 0.3], [x, 8.8, cz], 0.15); k.beam([x, 5.65, cz], [x, 8.9, cz], 0.15); k.beam([x, 2.95, z0], [x, 4.3, z0 + d * 0.4], 0.1); }
    B.gable([cx, 0, cz], x0, x1, z0, z1, 5.6, 9.0, 0.6, 0.24, { wall: 'plaster', wallCol: 0.9, sd: 61 }); k.log([x0 - 0.8, 9.2, cz], [x1 + 0.8, 9.25, cz], 0.21, 1, true); k.dormer(cx - 1.4, 6.0, 0.15, 1.3, 1.6); k.dormer(cx + 1.4, 6.0, 0.15, 1.3, 1.6);
    k.chimney(x0 + 0.45, z0 + 1.2, 0, 11.2, 1.1, 1.0); // tall stone chimney up the left gable
    k.door(-1.65, 0.05, z1 + 0.03, 1.3, 2.25, { stone: 1 }); k.win(-3.6, 0.9, z1 + 0.03, 0.9, 1.25, { shutters: 1 }); k.win(0.2, 0.9, z1 + 0.03, 0.75, 1.15);
    for (const x of [-3.6, -1.7, 0.2]) k.win(x, 3.35, z1 + 0.03, 0.75, 1.2); k.porch(-1.65, z1 + 0.45, 2.4, 0.8, 0.3, 2);
    // balcony along the second floor: plank deck on brackets, posts, rope rails
    box('wood', [cx, 2.9, z1 + 0.55], [w + 0.2, 0.16, 1.05], 0.9); for (let i = 0; i <= 6; i++) { const x = x0 + w * i / 6; k.beam([x, 2.9, z1 + 1.0], [x, 3.95, z1 + 1.0], 0.1); k.beam([x, 2.15, z1 + 0.05], [x, 2.88, z1 + 0.95], 0.09); }
    for (const y of [3.9, 3.45]) k.beam([x0, y, z1 + 1.0], [x1, y, z1 + 1.0], 0.05, 'rope'); k.lamp(-0.6, 1.3, z1 + 0.15); k.lamp(-2.7, 1.3, z1 + 0.15); k.sign('inn', -4.75, 2.0, z1 + 0.2);
    // the lower one-storey wing to the right-front, with a striped awning over its door and an outdoor table with benches
    const wx0 = 1.2, wx1 = 4.7, wz0 = -2.6, wz1 = 2.6, ww = wx1 - wx0, wd = wz1 - wz0, wcx = (wx0 + wx1) / 2, wcz = (wz0 + wz1) / 2;
    box('stone', [wcx, 0, wcz], [ww, 2.6, wd], ST); B.gable([wcx, 0, wcz], wx0, wx1, wz0, wz1, 2.6, 4.25, 0.45, 0.2, { wall: 'stone', wallCol: 0.9, sd: 71 }); k.log([wx0 - 0.2, 4.4, wcz], [wx1 + 0.6, 4.45, wcz], 0.17, 1, true);
    k.door(2.4, 0.05, wz1 + 0.03, 1.0, 2.0); k.win(3.85, 0.95, wz1 + 0.03, 0.7, 0.95); k.awning(2.4, 2.45, wz1 + 0.06, 1.7, 0.9, true); k.lamp(3.2, 1.3, wz1 + 0.15);
    box('wood', [3.5, 0.72, wz1 + 1.6], [1.7, 0.09, 0.85], 0.95); for (const sx of [-0.7, 0.7]) for (const sz of [-0.3, 0.3]) k.beam([3.5 + sx, 0, wz1 + 1.6 + sz], [3.5 + sx, 0.72, wz1 + 1.6 + sz], 0.07);
    for (const sz of [-0.75, 0.75]) { box('wood', [3.5, 0.42, wz1 + 1.6 + sz], [1.6, 0.07, 0.3], 0.85); for (const sx of [-0.65, 0.65]) k.beam([3.5 + sx, 0, wz1 + 1.6 + sz], [3.5 + sx, 0.42, wz1 + 1.6 + sz], 0.06); }
    for (let i = 0; i < 3; i++) cyl('brass', [3.1 + i * 0.35, 0.8, wz1 + 1.55], 0.07, 0.08, 0.17, 8, 1, null, { top: true }); k.prop(3.5, wz1 + 1.6, 1.0); k.barrel(x0 + 0.1, 0, z1 + 0.6, 0.33, 0.8); k.barrel(x0 + 0.7, 0, z1 + 0.75, 0.3, 0.75);
    return { foot: [[x0, z0, x1, z1 + 0.9], [wx0, wz0, wx1, wz1]] }; }
  function guide_hut() { // the smallest: a tiny round hut (1 SU across), a very tall pointed conical moss-and-bark roof with a teal crystal finial, a big boulder hugging the back, a rope-wrapped guide post with crystal and bell, lesson easel, brass telescope
    const R = 2.2; cyl('stone', [0, 0, 0], R + 0.2, R + 0.12, 0.65, 18, ST, null, { top: true }); cyl('woodV', [0, 0.65, 0], R, R - 0.05, 1.7, 18, 0.85); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.2; k.log([Math.cos(a) * R, 0.6, Math.sin(a) * R], [Math.cos(a) * (R - 0.05), 2.4, Math.sin(a) * (R - 0.05)], 0.1, 0.8); }
    k.torus('rope', [0, 2.3, 0], R + 0.02, 0.06, [Math.PI / 2, 0, 0], 22);
    const RT = 4.6, R0 = 3.0, NL = 5; let y = 2.15; for (let i = 0; i < NL; i++) { const f0 = i / NL, f1 = (i + 1) / NL, r0 = R0 * (1 - f0) + 0.1, r1 = R0 * (1 - f1) * 0.97, km = i % 2 ? 'bark' : 'moss'; cyl(km, [0, 2.15 + RT * f0 - (i ? 0.12 : 0), 0], r0 + (i ? 0.12 : 0), r1, RT / NL + (i ? 0.12 : 0), 16, km === 'moss' ? [0.95, 1, 0.9] : 0.95, null, { bot: true }); } y = 2.15 + RT;
    cyl('brass', [0, y - 0.15, 0], 0.18, 0.1, 0.3, 8, 1, null, { top: true }); k.crystal(0, y + 0.1, 0, 0.17, 0.7); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; lump('moss', [Math.cos(a) * 2.85, 2.05, Math.sin(a) * 2.85], [0.45, 0.28, 0.38], [0.95, 1, 0.9], 91 + i); }
    k.door(0, 0.62, R - 0.02, 1.0, 1.75); k.win(-1.4, 1.2, 1.55, 0.5, 0.6); box('stone', [0, 0, R + 0.4], [1.3, 0.32, 0.55], 0.9); box('stone', [0, 0, R + 0.85], [1.1, 0.16, 0.45], 0.9);
    lump('stone', [0.2, -0.2, -2.6], [1.9, 2.6, 1.6], [0.85, 0.82, 0.78], 123); lump('moss', [0.1, 1.85, -2.6], [1.3, 0.6, 1.0], 0.9, 124); k.prop(0.2, -2.6, 1.6); k.prop(-1.0, -2.2, 1.0); k.prop(1.3, -2.2, 1.0);
    // guide post: rope-wrapped pole, crystal on top, an arm with a call bell (the interact point)
    k.log([2.4, 0, 1.9], [2.4, 3.1, 1.9], 0.12, 0.85); for (let i = 0; i < 5; i++) cyl('rope', [2.4, 0.9 + i * 0.32, 1.9], 0.14, 0.14, 0.14, 8, 1); k.crystal(2.4, 3.1, 1.9, 0.13, 0.5); k.beam([2.4, 2.6, 1.9], [2.95, 2.6, 1.9], 0.07, 'wood');
    cyl('brass', [2.9, 2.05, 1.9], 0.2, 0.08, 0.38, 10, 1, null, { bot: true, top: true }); k.prop(2.4, 1.9, 0.25);
    // lesson easel (a slate board on a tripod), brass telescope on a tripod
    for (const s of [-0.35, 0.35]) k.beam([-2.55 + s, 0, 2.35], [-2.55, 1.6, 2.2], 0.06); k.beam([-2.55, 0, 1.85], [-2.55, 1.55, 2.2], 0.06); box('iron', [-2.55, 0.75, 2.32], [0.85, 0.65, 0.05], [0.35, 0.37, 0.34], [-0.12, 0, 0]); k.prop(-2.55, 2.2, 0.4);
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; k.beam([-3.4 + Math.cos(a) * 0.35, 0, 1.0 + Math.sin(a) * 0.35], [-3.4, 1.05, 1.0], 0.045); } cyl('brass', [-3.4, 1.1, 1.0], 0.07, 0.11, 1.0, 10, 1, [0, 0, -1.15], { top: true, bot: true }); k.prop(-3.4, 1.0, 0.35);
    box('wood', [1.9, 0.38, 2.75], [1.1, 0.08, 0.35], 0.85); for (const s of [-0.45, 0.45]) box('wood', [1.9 + s, 0, 2.75], [0.08, 0.38, 0.3], 0.75); k.lamp(-0.85, 1.6, R + 0.05);
    return { foot: [[0, 0, R + 0.25], [-0.7, R, 0.7, R + 1.1]] }; }
  return { general_store, smithy, rope_maker, bank, inn, guide_hut };
})();
/* ---- build + per-frame: one group in the map scene, LOD (small pieces drop out with distance), hidden past the fog ---- */
Object.assign(Town, (() => {
  const TW = Town, ST = { built: false, g: null, far: null, err: null };
  function build() { if (ST.built || typeof M3 === 'undefined' || !M3.st || !M3.st.ok || !M3.scene) return; ST.built = true; const t0 = performance.now();
    const g = new THREE.Group(); g.name = 'town'; TW.PCOL.length = 0; Town.gb.reset();
    const ground = Town.ground(g);
    for (const B of TW.BLD) { const P = TW.place(B); Town.kit.set(P); Town.gb.frame(P.x, P.y, P.h, P.yaw); const r = Town.houses[B.id](); B.foot = r.foot; B.P = P;
      if (r.drill) Town.kit.drill(...r.drill); }
    const parts = Town.gb.flush(g, 'townBld'); ST.small = parts.filter((m) => /_(rope|iron|sign|glowTeal|chalk|brass)$/.test(m.name)); ST.g = g; ST.ms = Math.round(performance.now() - t0); M3.scene.add(g);
    TW.resetCols(); return g; }
  let lastLod = 0;
  function tick() { if (!ST.built) { build(); return; } const cam = M3.camera; if (!cam || !ST.g) return; const now = performance.now(); if (now - lastLod < 250) return; lastLod = now;
    const d = Math.hypot(cam.position.x - TW.T.cx, cam.position.z - TW.T.cy); ST.g.visible = d < 9000; const sm = d < 2600; for (const m of ST.small) m.visible = sm; for (const m of ST.g.children) if (m.isMesh) m.castShadow = d < 2200 && !/_(dirt|cobble|glow)/.test(m.name); }
  function hook() { if (typeof M3 === 'undefined' || !M3.render || M3.render.__town) return; const R0 = M3.render; M3.render = function () { try { tick(); if (Town.npcTick) Town.npcTick(); } catch (e) { if (!ST.err) console.error((ST.err = e)); } return R0.apply(this, arguments); }; M3.render.__town = true; }
  if (typeof window !== 'undefined') { const iv = setInterval(() => { if (typeof M3 !== 'undefined' && M3.render) { hook(); clearInterval(iv); } }, 400); }
  return { build, tick, ST };
})());
/* ---- the townsfolk (phase 2): one keeper per building, from each folder's npc_turnaround (placeholder names and roles). Each is one merged,
   vertex-coloured mesh (6 draw calls), standing with a breathing / weight-shift idle, turning to face her when she comes close. Tap one ->
   she walks up -> a field-kit dialogue box (Art's mosby_dialog layout, direction B) with the keeper's portrait. The bank opens the vault,
   the store has a placeholder buy / sell; the rest talk. ---- */
Town.folk = (() => {
  const TW = Town, WS = TW.WS, gb = Town.gb, K = 'cloth', c = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255].map((v) => Math.pow(v / 255, 2.2)); // sRGB hex -> linear vertex colour
  // body plan in metres: h height, g girth (half-width at the hips), sk skirt, colours, hair / beard / props
  const P = {
    goldie: { h: 1.55, g: 0.27, sk: 1, skin: 0xf0b896, top: 0xe8dcc0, vest: 0x56663e, low: 0x5a3a26, apron: 0xa8957a, boots: 0x5a3a22, hair: 0x9a4a22, hs: 'bun', specs: 1, prop: 'ledger',
      name: 'Goldie', role: 'General Store', say: ["Welcome in, love! Rope, snacks, chalk for the climb - if it fits in a pack, I've got it.", "The shelves are still being stocked, but have a look."], acts: [['Buy', 'buy'], ['Sell', 'sell']] },
    brannick: { h: 1.95, g: 0.32, skin: 0xc98a62, top: 0x8a3226, low: 0x464a32, apron: 0x6a4428, boots: 0x5a3a22, hair: null, hs: 'bald', beard: 'braids', bc: 0x8c8a86, goggles: 1, prop: 'hammer',
      name: 'Brannick', role: 'Smithy', say: ["Mind the sparks. Bring me good ore and I'll make it sing.", "Upgrades come later. For now, keep that pick sharp."] },
    tess: { h: 1.75, g: 0.19, skin: 0xd9a27a, top: 0xa08460, low: 0x6e4a2e, boots: 0x6a4428, hair: 0x5a321a, hs: 'braid', band: 0x5a7038, prop: 'coil',
      name: 'Tess', role: 'Rope Maker', say: ["Every climb hangs on a good rope. I braid mine three ways.", "Come back when you need a longer tether."] },
    ambrose: { h: 1.9, g: 0.2, skin: 0xeab896, top: 0x234a50, vest: 0xb08a3a, low: 0x4e3424, boots: 0x3a2416, hair: 0xe4e0da, hs: 'chops', specs: 1, coat: 1, stoop: 0.12, prop: 'tray',
      name: 'Ambrose', role: 'Bank', say: ["Ah. Valuables? The vault keeps what the pit cannot take.", "Shall I open it for you?"], acts: [['Open the vault', 'vault']] },
    hattie: { h: 1.62, g: 0.29, sk: 1, skin: 0xd9a282, top: 0xe4d4b4, vest: 0x56663e, low: 0x56663e, apron: 0xa84e36, stripe: 1, boots: 0x5a3a22, hair: 0x26201e, hs: 'short', prop: 'mugs',
      name: 'Hattie', role: 'Inn', say: ["Sit, eat, warm up! The stew's on and the beds are soft.", "Rooms come later - for now, the mugs are full."] },
    fennick: { h: 1.25, g: 0.22, sk: 1, skin: 0x8a5a3a, top: 0xb09a72, low: 0x6a5030, cloak: 0x56603a, boots: 0x7a5434, hair: 0xe8e4dc, hs: 'cap', cap: 0x8a6438, beard: 'long', bc: 0xece8e0, stoop: 0.2, prop: 'staff',
      name: 'Old Fennick', role: "Guide's Hut", say: ["New to the edge, are you? Walk the paths, watch the ground.", "Come back up before dark, and I'll point you further down when you're ready."] },
  };
  // a figure in local metres (front +z, feet at y 0)
  function figure(o) { const H = o.h, s = H / 1.75, g = o.g, hipY = 0.86 * s, shY = 1.42 * s - (o.stoop || 0) * 0.3, hr = 0.115 * s * (o.g > 0.25 ? 1.08 : 1), hy = shY + 0.1 * s, fz = (o.stoop || 0) * 0.35;
    const BX = (k2, cc, sz, col, r) => gb.box(K, cc, sz, c(col), r), CY = (cc, r0, r1, h, col, r, op) => gb.cyl(K, cc, r0, r1, h, 10, c(col), r, op), LU = (cc, sz, col, sd, r) => gb.lump(K, cc, sz, c(col), sd || 3, r);
    // boots and legs
    for (const sx of [-1, 1]) { LU([sx * g * 0.42, 0, 0.04], [0.075 * s, 0.13 * s, 0.13 * s], o.boots, 5 + sx); CY([sx * g * 0.42, 0.1 * s, 0], 0.07 * s, 0.075 * s, hipY - 0.1 * s, o.low); }
    // skirt / coat tails / cloak, torso, belly
    if (o.sk) CY([0, 0.2 * s, 0], g * 1.08, g * 0.92, hipY - 0.2 * s + 0.05, o.cloak ? o.top : (o.vest || o.low), null, { bot: true });
    if (o.coat) CY([0, 0.45 * s, 0], g * 1.15, g * 0.95, hipY - 0.45 * s + 0.05, o.top, null, { bot: true });
    CY([0, hipY, fz * 0.3], g * 0.95, g * 0.8, shY - hipY, o.vest && !o.coat ? o.vest : o.top, [o.stoop || 0, 0, 0], { top: true });
    if (o.g > 0.25) LU([0, hipY - 0.05, 0.05], [g * 0.95, (shY - hipY) * 0.85, g * 0.95], o.vest || o.top, 9);
    if (o.coat) { BX(K, [0, hipY, g * 0.72 + fz * 0.3], [g * 0.7, shY - hipY - 0.05, 0.04], o.vest, [o.stoop || 0, 0, 0]); }
    if (o.apron) { const ay = o.sk ? 0.3 * s : 0.5 * s; BX(K, [0, ay, g * 1.0], [g * 1.5, shY - ay - 0.1 * s, 0.03], o.apron); if (o.stripe) for (let i = -2; i <= 2; i++) BX(K, [i * g * 0.28, ay, g * 1.02], [g * 0.1, shY - ay - 0.1 * s, 0.02], 0xe0c8a8); }
    if (o.cloak) { CY([0, 0.18 * s, -0.02], g * 1.3, g * 0.9, shY - 0.18 * s, o.cloak, [o.stoop || 0, 0, 0], { bot: true }); LU([0, shY - 0.12 * s, -g * 0.7], [g * 0.8, 0.22 * s, 0.16 * s], o.cloak, 21); }
    // shoulders, arms (forward when holding something), hands
    LU([0, shY - 0.08 * s, fz], [g * 1.05, 0.16 * s, g * 0.75], o.coat || o.cloak ? (o.cloak || o.top) : o.top, 4);
    const hold = { ledger: [0.9, 0.6], hammer: [0.2, 0.5], coil: [0.2, 0.2], tray: [1.2, 0.1], mugs: [1.3, 1.3], staff: [0.2, 0.9] }[o.prop] || [0.1, 0.1];
    for (const sx of [-1, 1]) { const ax = sx * (g * 1.05 + 0.04), fw = sx < 0 ? hold[0] : hold[1], L = 0.6 * s, r = [-fw, 0, sx * 0.12], v = new THREE.Vector3(0, -L, 0).applyEuler(new THREE.Euler(...r));
      CY([ax, shY - 0.04, fz], 0.06 * s, 0.05 * s, -L, o.coat ? o.top : o.cloak || (o.prop === 'coil' ? o.skin : o.top), r); LU([ax + v.x, shY - 0.04 + v.y - 0.05 * s, fz + v.z], [0.05 * s, 0.09 * s, 0.05 * s], o.skin, 11 + sx); }
    // neck, head, face
    CY([0, shY - 0.02, fz], 0.05 * s, 0.05 * s, 0.1 * s, o.skin); const hz = fz + 0.02;
    gb.dome(K, [0, hy + hr, hz], hr, hr * 1.1, 10, 4, c(o.skin)); gb.dome(K, [0, hy + hr, hz], hr, -hr, 10, 3, c(o.skin));
    LU([0, hy + hr * 0.75, hz + hr * 0.92], [0.025 * s, 0.035 * s, 0.03 * s], o.skin, 13); for (const sx of [-1, 1]) { LU([sx * hr * 0.38, hy + hr * 1.12, hz + hr * 0.9], [0.014, 0.016, 0.01], 0x231610, 2); LU([sx * hr * 0.98, hy + hr, hz], [0.02, 0.04, 0.03], o.skin, 3); }
    if (o.specs) for (const sx of [-1, 1]) gb.cyl(K, [sx * hr * 0.38, hy + hr * 1.12, hz + hr * 0.95], 0.03, 0.03, 0.008, 8, c(0x8a6430), [Math.PI / 2, 0, 0], { out: true });
    if (o.goggles) { CY([0, hy + hr * 1.45, hz], hr * 1.02, hr * 1.02, 0.04, 0x5a3a22); for (const sx of [-1, 1]) CY([sx * hr * 0.4, hy + hr * 1.5, hz + hr * 0.85], 0.04, 0.04, 0.05, 0xb08a3a, [Math.PI / 2.4, 0, 0], { top: true }); }
    // hair
    const HC = o.hair, top = [0, hy + hr * 1.05, hz - 0.01];
    if (o.hs === 'bun') { gb.dome(K, top, hr * 1.08, hr * 1.05, 10, 3, c(HC)); for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283; LU([Math.cos(a) * hr * 0.95, hy + hr * (0.7 + 0.2 * Math.sin(i)), hz + Math.sin(a) * hr * 0.9 - 0.02], [0.05, 0.07, 0.05], HC, 30 + i); } LU([0, hy + hr * 1.9, hz - 0.03], [0.08, 0.11, 0.08], HC, 41); CY([0.03, hy + hr * 2.0, hz - 0.03], 0.006, 0.004, 0.14, 0xd0a040, [0.3, 0, -0.5]); }
    if (o.hs === 'short') { gb.dome(K, top, hr * 1.1, hr * 1.12, 10, 3, c(HC)); LU([hr * 0.3, hy + hr * 1.9, hz + 0.03], [0.07, 0.04, 0.06], 0x9a9690, 44); for (const sx of [-1, 1]) LU([sx * hr * 1.0, hy + hr * 0.7, hz + 0.01], [0.012, 0.022, 0.012], 0xd0a040, 45); }
    if (o.hs === 'braid') { gb.dome(K, top, hr * 1.1, hr * 1.08, 10, 3, c(HC)); CY([0, hy + hr * 1.35, hz], hr * 1.08, hr * 1.06, 0.045, o.band); for (let i = 0; i < 6; i++) LU([0.03, hy + hr * 0.4 - i * 0.11 * s, hz - hr * 0.85 - (i < 2 ? 0 : 0.02)], [0.04, 0.07, 0.04], HC, 50 + i); for (let i = 0; i < 5; i++) LU([Math.cos(i * 1.3) * hr, hy + hr * 0.6, hz + Math.sin(i * 1.3) * hr * 0.6], [0.04, 0.08, 0.04], HC, 60 + i); }
    if (o.hs === 'chops') { for (const sx of [-1, 1]) { LU([sx * hr * 0.95, hy + hr * 0.55, hz + hr * 0.3], [0.04, 0.09, 0.05], HC, 70 + sx); LU([sx * hr * 0.9, hy + hr * 1.25, hz - hr * 0.3], [0.04, 0.06, 0.07], HC, 72 + sx); } LU([0, hy + hr * 2.05, hz], [0.03, 0.03, 0.03], HC, 74); }
    if (o.hs === 'cap') { gb.dome(K, [0, hy + hr * 1.15, hz], hr * 1.12, hr * 0.95, 10, 3, c(o.cap)); CY([0, hy + hr * 1.05, hz], hr * 1.13, hr * 1.12, 0.05, o.cap); for (const sx of [-1, 1]) LU([sx * hr * 0.98, hy + hr * 0.95, hz - 0.02], [0.04, 0.05, 0.05], HC, 80 + sx); for (const sx of [-1, 1]) LU([sx * hr * 0.38, hy + hr * 1.3, hz + hr * 0.85], [0.04, 0.018, 0.02], HC, 82 + sx); }
    if (o.hs === 'bald') for (const sx of [-1, 1]) LU([sx * hr * 0.95, hy + hr * 0.95, hz - 0.02], [0.035, 0.05, 0.06], o.bc, 85 + sx);
    // beards
    if (o.beard === 'braids') { LU([0, hy + hr * 0.15, hz + hr * 0.6], [hr * 0.9, hr * 0.9, hr * 0.55], o.bc, 90); for (const sx of [-1, 1]) { for (let i = 0; i < 4; i++) LU([sx * 0.045, hy - 0.04 - i * 0.075, hz + hr * 0.75], [0.03, 0.05, 0.03], o.bc, 91 + i); CY([sx * 0.045, hy - 0.3, hz + hr * 0.75], 0.022, 0.022, 0.02, 0xc09040); } }
    if (o.beard === 'long') { gb.cyl(K, [0, hy + hr * 0.55, hz + hr * 0.6], hr * 0.85, 0.03, -0.34 * s / 0.71, 8, c(o.bc), [0.25, 0, 0]); LU([0, hy + hr * 0.5, hz + hr * 0.7], [hr * 0.8, hr * 0.55, hr * 0.5], o.bc, 95); for (const sx of [-1, 1]) LU([sx * hr * 0.4, hy + hr * 1.45, hz + hr * 0.9], [0.05, 0.022, 0.025], o.bc, 96 + sx); }
    // carried things
    const hand = (sx) => { const fw = sx < 0 ? hold[0] : hold[1], v = new THREE.Vector3(0, -0.6 * s, 0).applyEuler(new THREE.Euler(-fw, 0, sx * 0.12)); return [sx * (g * 1.05 + 0.04) + v.x, shY - 0.04 + v.y - 0.04, fz + v.z]; };
    if (o.prop === 'ledger') { const p = hand(-1); BX(K, [p[0] + 0.04, p[1] - 0.12, p[2] + 0.02], [0.05, 0.3, 0.24], 0x5a3420, [0, 0.3, 0.1]); const q = [g * 0.6, hipY * 0.75, g + 0.05]; LU(q, [0.07, 0.1, 0.03], 0xb08a3a, 98); for (let i = 0; i < 6; i++) CY([-g * 0.6, hipY * 0.95 - i * 0.07, g + 0.05], 0.03, 0.03, 0.04, 0xc8aa5a); }
    if (o.prop === 'hammer') { const p = hand(1), hr2 = [-0.25, 0, 0.12]; CY([p[0], p[1] - 0.2, p[2]], 0.026, 0.026, 0.95, 0x6a4428, hr2); const v = new THREE.Vector3(0, 0.75, 0).applyEuler(new THREE.Euler(...hr2)); BX(K, [p[0] + v.x, p[1] - 0.2 + v.y, p[2] + v.z], [0.26, 0.16, 0.15], 0x4a4c50, hr2); BX(K, [0, hipY - 0.06, 0], [g * 2.1, 0.07, g * 2.0], 0x4a3020); LU([-g * 1.05 - 0.06, shY - 0.58 * s, fz + 0.1], [0.075, 0.1, 0.075], 0x5a3a22, 99); }
    if (o.prop === 'coil') { for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; LU([g * 1.0 + Math.cos(a) * 0.14, hipY - 0.12 + Math.sin(a) * 0.16, g * 0.4], [0.035, 0.035, 0.04], 0xa98552, 100 + i); } CY([-g * 1.1, hipY - 0.12, 0.02], 0.07, 0.07, 0.15, 0x4fc8c8, [0, 0, Math.PI / 2], { top: true }); BX(K, [0, shY - 0.3, g * 0.55], [0.06, 0.6, 0.06], 0xa98552, [0, 0, 0.75]); }
    if (o.prop === 'tray') { const p = hand(-1); CY([p[0], p[1] + 0.05, p[2] + 0.06], 0.14, 0.12, 0.04, 0x6a4428, null, { top: true }); for (let i = 0; i < 5; i++) LU([p[0] + Math.cos(i) * 0.07, p[1] + 0.08, p[2] + 0.06 + Math.sin(i) * 0.06], [0.04, 0.03, 0.04], 0xd4aa48, 110 + i); for (let i = 0; i < 4; i++) CY([g * 0.55 + i * 0.03, hipY - 0.2 - i * 0.03, g * 0.9], 0.02, 0.02, 0.1, 0x9a7a3a); }
    if (o.prop === 'mugs') { const zf = hand(1)[2]; CY([0, hand(1)[1] + 0.03, zf * 0.85], 0.32, 0.32, 0.035, 0x5a3a22, null, { top: true }); for (let i = -1; i <= 1; i++) { CY([i * 0.17, hand(1)[1] + 0.065, zf * 0.85], 0.06, 0.065, 0.13, 0x6a4428, null, { top: true }); LU([i * 0.17, hand(1)[1] + 0.18, zf * 0.85], [0.06, 0.04, 0.06], 0xf6eedc, 120 + i); } BX(K, [g * 0.85, shY - 0.35, -0.02], [0.08, 0.36, 0.16], 0xa84e36); }
    if (o.prop === 'staff') { const p = hand(1); CY([p[0] + 0.02, 0, p[2]], 0.028, 0.022, H + 0.25, 0x5a3a22); for (let i = 0; i < 3; i++) LU([p[0] + 0.02, H + 0.02 + i * 0.05, p[2]], [0.04, 0.03, 0.04], 0x6a4428, 130 + i); LU([p[0] + 0.02, H + 0.2, p[2]], [0.06, 0.18, 0.06], 0x4fe0c8, 133); CY([0, hipY - 0.1, g * 0.9], 0.04, 0.045, 0.1, 0xc09040, null, { top: true }); for (let i = 0; i < 2; i++) CY([-g * 0.6 + i * 0.06, hipY - 0.25, g * 0.95], 0.025, 0.025, 0.22, 0xe8dcc0, null, { top: true }); }
  }
  const ST = { built: false, list: [], dlg: null, talk: null };
  function build() { if (ST.built || !TW.ST || !TW.ST.built || !TW.ST.g) return; ST.built = true; const mat = new THREE.MeshLambertMaterial({ map: Town.art.tex('cloth'), vertexColors: true }); mat.name = 'town_folk';
    for (const B of TW.BLD) { const o = P[B.npc]; if (!o) continue; const sp = TW.npcSpot(B); gb.reset(); gb.frame(0, 0, 0, 0); figure(o); const grp = new THREE.Group(); grp.name = 'townNpc_' + B.npc; const ms = gb.flush(grp, 'townNpc_' + B.npc, {}); for (const m of ms) { m.material = mat; m.castShadow = true; }
      grp.position.set(sp.at[0], sp.h, sp.at[1]); grp.rotation.y = sp.yaw; TW.ST.g.add(grp); ST.list.push({ id: B.npc, B, o, sp, grp, yaw: sp.yaw, ph: B.px * 0.013, x: sp.at[0], y: sp.at[1], h: sp.h, hgt: o.h * WS }); }
    gb.reset(); }
  // idle: breathing, a slow weight shift and a little nod; they turn to face her when she is close, back to the street when she leaves
  let t0 = 0;
  // a keeper under the finger wins over the pet mole (its tap wrapper sits on Explore.tap): keep ours outermost
  function wrapTap() { if (typeof Explore === 'undefined' || !Explore.tap || Explore.tap.__town) return; const t0 = Explore.tap, f = function (sx, sy, ...r) { if (Explore.EX && Explore.EX.on && ST.built && hitAt(sx, sy)) return tap(sx, sy); return t0.call(this, sx, sy, ...r); }; f.__town = true; Explore.tap = f; }
  function tick() { wrapTap(); if (!ST.built) { build(); if (!ST.built) return; } const t = performance.now() / 1000, cam = M3.camera, far = cam && Math.hypot(cam.position.x - TW.T.cx, cam.position.z - TW.T.cy) > 2600, hr = typeof Explore !== 'undefined' && Explore.EX && Explore.EX.on ? Explore.here() : null; const dt = Math.min(0.1, t - (t0 || t)); t0 = t;
    for (const n of ST.list) { n.grp.visible = !far; if (far) continue; const tk = ST.talk === n, br = Math.sin(t * (tk ? 3.2 : 2.0) + n.ph);
      let want = n.sp.yaw; if (hr) { const dx = hr[0] - n.x, dy = hr[1] - n.y; if (Math.hypot(dx, dy) < WS * 7) want = Math.atan2(dx, dy); }
      let d = want - n.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); n.yaw += d * Math.min(1, dt * 3);
      n.grp.rotation.set(Math.sin(t * 0.7 + n.ph) * 0.012 + (tk ? Math.max(0, br) * 0.025 : 0), n.yaw, Math.sin(t * 0.45 + n.ph) * 0.02); n.grp.scale.set(1 - br * 0.006, 1 + br * 0.012, 1 - br * 0.006); n.grp.position.y = n.h + (tk ? Math.abs(br) * 0.004 * WS : 0); }
    if (ST.talk && hr && Math.hypot(hr[0] - ST.talk.x, hr[1] - ST.talk.y) > WS * 6 && !ST.walking) close(); }
  // tap: the figure's base-to-top segment on screen
  function hitAt(sx, sy) { let best = null, bd = 1e9; for (const n of ST.list) { if (!n.grp.visible) continue; const a = M3.project(n.x, n.y, 0), b = M3.project(n.x, n.y, n.hgt); if (a[0] < -999 || b[0] < -999) continue; const vx = b[0] - a[0], vy = b[1] - a[1], l2 = vx * vx + vy * vy || 1, u = Math.max(0, Math.min(1, ((sx - a[0]) * vx + (sy - a[1]) * vy) / l2)), dd = Math.hypot(a[0] + vx * u - sx, a[1] + vy * u - sy), rad = Math.max(22, Math.sqrt(l2) * 0.4); if (dd < rad && dd - rad < bd) { bd = dd - rad; best = n; } } return best; }
  function tap(sx, sy) { if (!ST.built) return null; const n = hitAt(sx, sy); if (!n) return null; const hr = Explore.here(), [tx, ty] = n.sp.talk;
    if (hr && Math.hypot(hr[0] - tx, hr[1] - ty) < WS * 1.5) { talk(n); return 'npc'; } ST.walking = true; const r = Explore.goTo(tx, ty, () => { ST.walking = false; talk(n); }); if (!r) { ST.walking = false; talk(n); } return 'npc'; }
  // ---- the dialogue box: leather-and-canvas bar, brass corners, cream stitched well, brass porthole portrait popping out above the bar
  const CSS = `#townDlg{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom) + 92px);transform:translateX(-50%);width:min(540px,calc(100% - 16px));z-index:60;font:16px Georgia,"Iowan Old Style",serif;color:#33200f;pointer-events:auto;filter:drop-shadow(0 6px 10px rgba(0,0,0,.45))}
#townDlg.hidden{display:none}#townDlg .tdBar{position:relative;margin-top:46px;border:18px solid transparent;border-image:url(assets/ui/kit_leather.webp) 62 fill / 18px stretch;border-radius:10px}
#townDlg .tdBar:before,#townDlg .tdBar:after,#townDlg .tdC1,#townDlg .tdC2{content:'';position:absolute;width:22px;height:22px;border:5px solid #c99a45;filter:drop-shadow(0 1px 1px rgba(0,0,0,.5))}
#townDlg .tdBar:before{left:-14px;top:-14px;border-right:0;border-bottom:0;border-radius:6px 0 0 0}#townDlg .tdBar:after{right:-14px;top:-14px;border-left:0;border-bottom:0;border-radius:0 6px 0 0}
#townDlg .tdC1{left:-14px;bottom:-14px;border-right:0;border-top:0;border-radius:0 0 0 6px}#townDlg .tdC2{right:-14px;bottom:-14px;border-left:0;border-top:0;border-radius:0 0 6px 0}
#townDlg .tdWell{position:relative;min-height:74px;padding:12px 44px 12px 84px;border-radius:8px;background:linear-gradient(#f8ecd0,#ecd9b0);box-shadow:inset 0 2px 5px rgba(90,50,20,.35);outline:1.5px dashed rgba(140,96,48,.7);outline-offset:-6px}
#townDlg .tdWell p{margin:0;line-height:1.38;min-height:44px}#townDlg .tdName{position:absolute;left:96px;top:-34px;padding:3px 14px;border-radius:8px;background:linear-gradient(#e7c27a,#b9863e);color:#3a2412;font:700 14px Georgia,serif;box-shadow:0 0 0 2px #6e4a1c,0 2px 4px rgba(0,0,0,.4)}
#townDlg .tdName small{font:italic 400 12px Georgia,serif;margin-left:6px;opacity:.8}
#townDlg .tdPort{position:absolute;left:-4px;top:-2px;width:88px;height:88px;border-radius:50%;z-index:2;background:#f6efe0 center/cover no-repeat;box-shadow:0 0 0 5px #b07a34,0 0 0 7px #e6bb68,0 0 0 9px #6e4a1c,inset 0 2px 6px rgba(0,0,0,.35)}
#townDlg .tdPort i{position:absolute;width:5px;height:5px;border-radius:50%;background:#f3d28a;box-shadow:0 0 0 1px #6e4a1c}
#townDlg .tdPip{position:absolute;right:10px;bottom:10px;width:24px;height:24px;border-radius:50%;background:radial-gradient(circle at 50% 40%,#e6bb68,#9a6a2a);box-shadow:0 0 0 2px #6e4a1c;animation:tdBob 1s ease-in-out infinite}
#townDlg .tdPip:after{content:'';position:absolute;left:7px;top:6px;width:7px;height:7px;border-right:2.5px solid #3a2412;border-bottom:2.5px solid #3a2412;transform:rotate(45deg)}
@keyframes tdBob{50%{transform:translateY(3px)}}#townDlg .tdBtns{display:flex;flex-wrap:wrap;gap:12px;justify-content:flex-end;margin-top:10px}#townDlg .tdBtns button{min-height:44px;padding:4px 18px}
#townDlg .kGreen{background:radial-gradient(120% 95% at 50% 22%,#8fcf7a,#3f8a3a 55%,#245a22)}
.tdShop{padding:6px 4px}.tdShop h2{margin:0 0 8px}.tdShop .row{display:flex;align-items:center;gap:10px;padding:8px 10px;margin:6px 0;border-radius:8px;background:rgba(110,62,24,.12);box-shadow:inset 0 0 0 1px rgba(110,62,24,.3)}.tdShop .row b{flex:1}.tdShop .row button{min-height:40px;padding:2px 14px}.tdShop button[disabled]{opacity:.5}#modal[data-k=town-shop] .sheet{background:none;box-shadow:none;padding:10px 8px calc(env(safe-area-inset-bottom) + 12px)}`;
  function el() { if (ST.dlg) return ST.dlg; const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); const d = document.createElement('div'); d.id = 'townDlg'; d.className = 'kKit hidden'; d.setAttribute('role', 'dialog');
    d.innerHTML = '<div class="tdPort"></div><div class="tdBar"><span class="tdC1"></span><span class="tdC2"></span><div class="tdName"></div><div class="tdWell"><p></p><i class="tdPip"></i><div class="tdBtns"></div></div></div>';
    const port = d.querySelector('.tdPort'); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283, r = 48.5; const b = document.createElement('i'); b.style.left = 44 + Math.cos(a) * r - 2.5 + 'px'; b.style.top = 44 + Math.sin(a) * r - 2.5 + 'px'; port.appendChild(b); }
    d.addEventListener('pointerdown', (e) => e.stopPropagation()); d.addEventListener('click', (e) => { e.stopPropagation(); const b = e.target.closest('button'); if (b) return act(b.dataset.a); if (ST.page < ST.talk.o.say.length - 1) { ST.page++; show(); } });
    (document.getElementById('cityWrap') || document.body).appendChild(d); return (ST.dlg = d); }
  function talk(n) { ST.talk = n; ST.page = 0; const d = el(); d.querySelector('.tdPort').style.backgroundImage = `url(assets/ui/npc/${n.id}.webp)`; d.querySelector('.tdName').innerHTML = `${n.o.name}<small>${n.o.role}</small>`; d.classList.remove('hidden'); show(); }
  function show() { const d = ST.dlg, n = ST.talk, last = ST.page >= n.o.say.length - 1; d.querySelector('.tdWell p').textContent = n.o.say[ST.page]; d.querySelector('.tdPip').style.display = last ? 'none' : '';
    d.querySelector('.tdBtns').innerHTML = last ? (n.o.acts || []).map(([t, a]) => `<button class="kBtn kGreen" data-a="${a}">${t}</button>`).join('') + '<button class="kBtn kCream" data-a="bye">Goodbye</button>' : ''; }
  function close() { ST.talk = null; if (ST.dlg) ST.dlg.classList.add('hidden'); }
  function act(a) { const n = ST.talk; if (a === 'bye') return close(); if (a === 'vault') { close(); if (typeof CharView !== 'undefined' && CharView.openVault) CharView.openVault(); return; }
    if (a === 'buy' || a === 'sell') { close(); const rows = a === 'buy' ? [['Climbing chalk', 5], ['Trail biscuits', 3], ['Spare rope (10 m)', 12], ['Lumenite lamp oil', 8]] : [['Ore from your backpack', null], ['Crystals', null]];
      openModal(`<div class="kKit tdShop"><div class="kLeather"><h2>${n.o.name}'s ${a === 'buy' ? 'shelves' : 'counter'}</h2>${rows.map(([t, p]) => `<div class="row"><b>${t}</b>${p ? `<span>${p} gold</span>` : ''}<button class="kBtn kCream" disabled>${a === 'buy' ? 'Buy' : 'Sell'}</button></div>`).join('')}<div class="kFoot">Trading opens soon - the store is still being stocked.</div><div style="text-align:right;margin-top:8px"><button class="kBtn kCream" data-shopx style="min-height:44px;padding:4px 18px">Close</button></div></div></div>`, 'town-shop');
      const x = document.querySelector('#modalBody [data-shopx]'); if (x) x.addEventListener('click', () => closeModal()); } }
  return { P, ST, build, tick, tap, talk, close, act, figure, hitAt };
})();
Town.npcTick = () => Town.folk.tick();
Town.tap = (sx, sy) => Town.folk.tap(sx, sy);

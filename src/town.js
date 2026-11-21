/* =====================================================================
   BEGINNER TOWN (working name, no sign text) - Art's town pack (/workspace/mia/handoff/town).
   On the lower playing field (the lowlands), ~150 m north of the starter Ledge, on a gentle slope that falls to the west:
   three terraces step down toward a drop (stone retaining walls, cobble steps), a cobble main street enters from the land side
   and ends at a round square at the drop, rope rails along the edge. Six buildings from the per-building folders, home lots
   H1-H6 and landmark lots L1-L3 as flat empty lots. Layout is authored in the concept map's pixel space (town_layout_topdown.jpg)
   and turned into the world by W2(). Everything is merged per material (one draw call each), solid circles for every wall and prop.
   ===================================================================== */
const Town = (() => {
  const WS = 6.35, K = 6.35 / 14, SU = 30; // map units per metre; world units per concept px; 1 SU = the Lv01 shack footprint (~4.7 m)
  const T = { cx: -5690, cy: 8040, ox: 28 * 14, oy: 24 * 14 }; // concept px (ox, oy) sits at world (cx, cy); the map is turned 180 deg (land side east, drop west)
  const FIELD = 132, LV = [FIELD + 2.8 * WS, FIELD + 1.6 * WS, FIELD + 1.6 * WS];
  const STEP = [13.2 * 14, 13.2 * 14], RUN = 2.1 * 14, BAND = [22.5 * 14, 26.5 * 14];
  // extras3: S1/S2/S3 field entries, S4 upper terrace, S5 back entry. Metres, axis and ascending direction.
  const ENTRIES = [
    {id:'S1',x:1.2,y:24.5,axis:'x',dir:1,w:4,run:2.8,lo:FIELD,hi:LV[1],n:8},
    {id:'S2',x:57.3,y:24.5,axis:'x',dir:-1,w:2.5,run:2.8,lo:FIELD,hi:LV[1],n:8},
    {id:'S3',x:30,y:46.9,axis:'y',dir:-1,w:2.5,run:2.8,lo:FIELD,hi:LV[1],n:8},
    {id:'S4',x:30,y:15.3,axis:'y',dir:-1,w:2.5,run:2.1,lo:LV[1],hi:LV[0],n:6},
    {id:'S5',x:30,y:2.6,axis:'y',dir:1,w:2.5,run:4.9,lo:FIELD,hi:LV[0],n:14}
  ];
  const STAIRS = [];
  const stairCoord=(e,px,py)=>{const x=px/14,y=py/14;return [(e.axis==='x'?x-e.x:y-e.y)*e.dir,Math.abs(e.axis==='x'?y-e.y:x-e.x)];};
  const entryAt=(px,py,pad=0)=>ENTRIES.find(e=>{const [u,v]=stairCoord(e,px,py);return u>=-pad&&u<=e.run+pad&&v<=e.w/2+pad;});
  const W2 = (px, py) => [T.cx - (px - T.ox) * K, T.cy - (py - T.oy) * K];
  const P2 = (x, y) => [T.ox - (x - T.cx) / K, T.oy - (y - T.cy) / K];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), sm = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const jit = (s, k) => 5 * Math.sin(s * 0.093 + k * 1.7) + 3 * Math.sin(s * 0.231 + k * 4.1) + 1.5 * Math.sin(s * 0.61 + k);
  // ---- the outline (px): irregular on every outer edge, with the L2 / L3 outcrop jutting over the drop
  const OUT = (() => { // rounded extras3 no-bank outline; 56.1 x 44.3 m, no square corners
    const q=[[1.2,9],[3.6,3.7],[10,2.6],[17,3],[22,4],[28,3],[32,4],[34.5,9],[37,11],[43,10.5],[49,12],[54,16],[57.3,21],[56.5,29],[57,36],[54,43.5],[50,46.9],[44,46],[40,44],[37,40.5],[34,43],[28,45],[22,45],[17,46],[11,46],[5,43.5],[3.5,37],[2,31],[1.5,24],[2,18]];
    const curve=new THREE.CatmullRomCurve3(q.map(p=>new THREE.Vector3(p[0]*14,p[1]*14,0)),true,'centripetal');return curve.getPoints(240).slice(0,-1).map(p=>[p.x,p.y]);})();
  const inPoly = (P, x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
  const segD = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1, t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / l2, 0, 1); return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t); };
  const edgeD = (px, py) => { let d = 1e9; for (let i = 0; i < OUT.length; i++) d = Math.min(d, segD(px, py, OUT[i], OUT[(i + 1) % OUT.length])); return d; };
  // world bbox (padded) for the cheap early-outs in the terrain hooks
  const BB = (() => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const [a, b] of OUT) { const [x, y] = W2(a, b); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return { x0, x1, y0, y1 }; })();
  const near = (x, y, m) => x > BB.x0 - m && x < BB.x1 + m && y > BB.y0 - m && y < BB.y1 + m;
  const tIdx = (px,py) => py != null && py < 13.2*14 ? 0 : 1;
  function lvlPx(px, py) {const e=entryAt(px,py);if(e){const [u]=stairCoord(e,px,py);return e.lo+(e.hi-e.lo)*clamp(u/e.run,0,1);}return LV[tIdx(px,py)];}
  const GATE=W2(0.5*14,24.5*14),GATE_IN=W2(5*14,24.5*14);
  const inEntry=(px,py)=>!!entryAt(px,py,.6);
  let SKIP = false; // bypass: natural ground (for building the walls and the tests)
  /* terrain hooks (map3d): the rendered ground under the town is cut a little below the terraces (hidden under the platforms) and
     banks down to them outside; at the entrance the ground rises to meet the main street. meshH() reports the terrace tops. */
  function carve(x,y,hm){if(SKIP||!near(x,y,WS*5))return hm;const [px,py]=P2(x,y),d=edgeD(px,py)*K;if(inPoly(OUT,px,py))return [Math.min(FIELD-WS*.15,hm[0]),0];if(d>WS*4)return hm;const w=1-sm(WS*1.5,WS*4,d);return [hm[0]+(FIELD-hm[0])*w,hm[1]*(1-w)];}
  function hOver(x,y){if(SKIP||!near(x,y,WS*.2))return null;const [px,py]=P2(x,y);if(!inPoly(OUT,px,py)&&!entryAt(px,py))return null;return lvlPx(px,py);}
  const nat = (x, y) => { SKIP = true; const h = M3.heightAt(x, y)[0]; SKIP = false; return h; };
  // ---- buildings: concept-map centre (px), facing (+1: toward +py, -1: toward -py), footprint (local metres, x across the front, z depth)
  const BLD = [
    {id:'general_store',name:'General Store',px:8.4*14,py:18.2*14,face:1,t:1,w:8.1,d:6.5,npc:'goldie'},
    {id:'smithy',name:'Smithy',px:18.35*14,py:18.2*14,face:1,t:1,w:8.6,d:6.5,npc:'brannick'},
    {id:'rope_maker',name:'Rope Maker',px:9*14,py:34.5*14,face:-1,t:1,w:4.6,d:13.8,npc:'tess'},
    {id:'inn',name:'Inn',px:18.5*14,py:30.9*14,face:-1,t:1,w:9.4,d:5.6,npc:'hattie'},
    {id:'guide_hut',name:"Guide's Hut",px:39*14,py:31.4*14,face:-1,t:1,w:5.8,d:5.8,round:1,npc:'fennick'}
  ];
  const LOTS=[['H1',8.5*14,8.6*14,8*14,6*14],['H2',18.1*14,8.6*14,8*14,6*14],['H3',42.5*14,17.5*14,8*14,6*14],['H4',49*14,32.5*14,8*14,6*14],['H5',18*14,40.2*14,8*14,6*14],['H6',49*14,40.5*14,8*14,6*14],['L1',30*14,24.5*14,0,0,2*14],['L2',52*14,23.5*14,6*14,10*14],['L3',55*14,30*14,0,0,1*14]];
  const SQ={px:30*14,py:24.5*14,r:7*14};
  // world placement of a building: origin at its centre on its terrace, yaw so local +z (the front) points the right way
  function place(B) { const [x, y] = W2(B.px, B.py), dir = W2(B.px, B.py + B.face), fx = dir[0] - x, fy = dir[1] - y; return { x, y, h: lvlPx(B.px,B.py), yaw: Math.atan2(fx, fy) }; }
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
    // Solid rim, skirt and cheek walls share the visual outline. Entries are genuinely open.
    for(let i=0;i<OUT.length;i+=2){const p=OUT[i];if(entryAt(p[0],p[1],.6))continue;const [x,y]=W2(...p);add(x,y,WS*.42,'townWall');}
    for(const e of ENTRIES) for(const side of [-1,1]) for(let u=.3;u<e.run;u+=.7){const x=e.x+(e.axis==='x'?u*e.dir:side*(e.w/2+.25)),y=e.y+(e.axis==='y'?u*e.dir:side*(e.w/2+.25));add(...W2(x*14,y*14),WS*.23,'townStair');}
    return COLS; }
  function nav(cls, nx, ny, REG, C) { const L = cols(); if (!L.length) return; const i0 = Math.max(0, Math.floor((BB.x0 - REG.X0) / C)), i1 = Math.min(nx - 1, Math.ceil((BB.x1 - REG.X0) / C)), j0 = Math.max(0, Math.floor((BB.y0 - REG.Y0) / C)), j1 = Math.min(ny - 1, Math.ceil((BB.y1 - REG.Y0) / C));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const [px, py] = P2(REG.X0 + i * C, REG.Y0 + j * C); if (inPoly(OUT, px, py) || entryAt(px, py, 0.6)) cls[j * nx + i] = 1; } // the S1-S5 flights walk (0.20 m rises), never a climb
    for (const c of L) { const R = c.r + C * (c.key === 'townStair' || c.key === 'townWall' ? 0.08 : 0.15), a0 = Math.max(0, Math.floor((c.x - R - REG.X0) / C)), a1 = Math.min(nx - 1, Math.ceil((c.x + R - REG.X0) / C)), b0 = Math.max(0, Math.floor((c.y - R - REG.Y0) / C)), b1 = Math.min(ny - 1, Math.ceil((c.y + R - REG.Y0) / C)); for (let j = b0; j <= b1; j++) for (let i = a0; i <= a1; i++) if (Math.hypot(REG.X0 + i * C - c.x, REG.Y0 + j * C - c.y) < R) cls[j * nx + i] = 0; } }
  // where each building's keeper stands (beside the door, facing the street) and where she stops to talk (in front of them)
  function npcSpot(B) { const P = place(B), cs = Math.cos(P.yaw), sn = Math.sin(P.yaw), L = (lx, lz) => [P.x + (lx * cs + lz * sn) * WS, P.y + (-lx * sn + lz * cs) * WS], D = B.round ? B.w / 2 : B.d / 2, o = NPCX[B.id] || [1.8, 1.4];
    return { at: L(o[0], D + o[1]), talk: L(o[0], D + o[1] + 1.5), yaw: P.yaw, h: lvlPx(B.px,B.py) }; }
  const NPCX = { general_store: [-1.9, 1.5], smithy: [1.6, 1.4], bank: [1.9, 1.2], rope_maker: [1.5, 1.2], inn: [-2.0, 1.3], guide_hut: [1.6, 1.3] };
  const PCOL = []; // prop circles (world x, y, r), filled as the meshes are built
  // ---- keep-out for the map's trees, rocks, tufts and focal boulders
  function hit(x, y, pad) { if (!near(x, y, (pad || 0) + 40)) return false; const [px, py] = P2(x, y); if (inPoly(OUT, px, py)) return true; return edgeD(px, py) * K < (pad || 0) + WS * 3; }
  // ---- the connecting footpath: out of the main street's land end, round the town's south-east corner, onto the nearest worn path
  let PTH = null;
  function paths(base) { if (PTH) return PTH; const mid = W2(-5*14,24.5*14); let best = null, bd = 1e9; for (const P of base || []) for (let i = 1; i + 1 < P.length; i += 2) { const d = Math.hypot(P[i] - mid[0], P[i + 1] - mid[1]); if (d >= bd || hit(P[i], P[i + 1], 60)) continue; let clear = true; for (let s = 1; s < 16 && clear; s++) { const t = s / 16; if (hit(mid[0] + (P[i] - mid[0]) * t, mid[1] + (P[i + 1] - mid[1]) * t, 30)) clear = false; } if (clear) { bd = d; best = [P[i], P[i + 1]]; } }
    if (!best) return []; const pts = [GATE, mid], v = [mid[0] - best[0], mid[1] - best[1]], L = Math.hypot(v[0], v[1]), n = Math.max(1, Math.round(L / 60));
    for (let k = 1; k <= n; k++) pts.push([mid[0] - v[0] * k / n, mid[1] - v[1] * k / n]);
    PTH = [[0, ...pts.flat().map((q) => Math.round(q))]]; return PTH; }
  return { WS, K, SU, T, FIELD, ENTRIES, entryAt, stairCoord, LV, STEP, RUN, BAND, STAIRS, W2, P2, OUT, BB, BLD, LOTS, SQ, GATE, GATE_IN, inPoly, edgeD, tIdx, lvlPx, carve, hOver, nat, place, npcSpot, cols, hit, paths, PCOL, near, inEntry,
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
  function tex(k) { if (TX[k]) return TX[k]; seed = 101 + Math.max(0, Object.keys(PAINT).indexOf(k)) * 977; const cv = k === 'sign' ? canvas(512, paintSigns) : canvas(256, PAINT[k] || PAINT.brass); const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = k === 'sign' ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
    if (SWATCH[k]) { const im = new Image(); im.onload = () => { t.image = im; t.needsUpdate = true; }; im.src = `assets/tex/town/${SWATCH[k]}.jpg`; } // Art's seamless swatch replaces the painted stand-in once it loads
    return (TX[k] = t); }
  // Art's tileable swatches (extras/swatches, compressed to 256-512 px jpg for mobile); world tile sizes from the README
  const SWATCH = { cobble: 'cobble', stone: 'dressed_stone', moss: 'moss_roof', dirt: 'painted_ground', plaster: 'plaster', woodV: 'wood_planks', brass: 'brass', bronze: 'brass' };
  // material key -> [texture, metres per tile, extra]
  const MAT = { cobble: [4.0], stone: [3.0], dirt: [4.0], moss: [2.0], wood: [1.1], woodV: [2.0], plaster: [2.0], brass: [1.0, 'shiny'], bronze: [1.0, 'aged'], canvas: [1.6], canvasG: [1.6], brick: [1.2], iron: [1.0, 'shiny'], rope: [0.4], bark: [1.4], glowTeal: [0.5, 'glow'], glowFire: [1.4, 'glow'], glowWin: [1, 'glow'], cloth: [0.35], chalk: [1.0, 'alpha'], sign: [1, 'sign'] };
  const MATS = {}; function mat(k) { if (MATS[k]) return MATS[k]; const t = tex(k), f = MAT[k][1]; let m;
    if (f === 'glow') m = new THREE.MeshBasicMaterial({ map: t, vertexColors: true, toneMapped: false });
    else if (f === 'aged') m = new THREE.MeshPhongMaterial({ map: t, vertexColors: true, specular: 0x30271c, shininess: 9 });
    else if (f === 'shiny') m = new THREE.MeshLambertMaterial({ map: t, vertexColors: true }); // extras3: painted matte, no metallic glare
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
  const up0 = (th) => th;
  function gable(c, x0, x1, z0, z1, ye, yr, ov, th, o) { o = o || {}; ov = Math.max(ov, 0.6); th = 0.30; const zm = (z0 + z1) / 2, dz = (z1 - z0) / 2 + ov, sl = (yr - ye) / ((z1 - z0) / 2), yE = ye - ov * sl, X0 = x0 - (o.ovx == null ? ov : o.ovx), X1 = x1 + (o.ovx == null ? ov : o.ovx), k = o.k || 'moss', sd = o.sd || 7;
    at(c, o.r); for (const sg of [1, -1]) { const zE = zm + sg * dz, A = [X0, yE, zE], B = [X1, yE, zE], C = [X1, yr, zm], D = [X0, yr, zm], up = th;
      if (sg > 0) { quad(k, A, B, [X1, yr + up, zm], [X0, yr + up, zm]); } else { quad(k, B, A, [X0, yr + up, zm], [X1, yr + up, zm]); }
      const Au = [X0, yE + up * 0.4, zE], Bu = [X1, yE + up * 0.4, zE]; if (sg > 0) { quad(k, A, Au, Bu, B); quad(k, [X0, yE, zE], [X1, yE, zE], [X1, yr, zm], [X0, yr, zm], 0.55); } else { quad(k, B, Bu, Au, A); quad(k, [X1, yE, zE], [X0, yE, zE], [X0, yr, zm], [X1, yr, zm], 0.55); }
      // the slab's end faces (gable edges)
      for (const xx of [X0, X1]) { const s2 = xx === X0 ? -1 : 1; const P1 = [xx, yE, zE], P2 = [xx, yE + up * 0.4, zE], P3 = [xx, yr + up, zm], P4 = [xx, yr, zm]; if (s2 * sg > 0) quad(k, P1, P4, P3, P2, 0.8); else quad(k, P2, P3, P4, P1, 0.8); } }
    // Art's kit (modular_kit_sheet 3 + 4): layered moss courses stepping up the slope with ragged lower lips, a rounded moss eave edge (slab ~0.35 m, face ~0.45 m), a moss ridge cap and plank bargeboards - no blobs
    if (o.layer !== false) { const L = Math.hypot(dz, yr + up0(th) - yE), sx = (X1 - X0), nseg = Math.max(4, Math.round(sx / 0.55)), NC = Math.max(3, Math.round(L / 0.62)), tl = Town.art.MAT[k] ? Town.art.MAT[k][0] : 2, hsh = (a, b) => { const v = Math.sin(a * 91.7 + b * 47.3 + sd) * 43758.5; return v - Math.floor(v); };
      for (const sg of [1, -1]) { const zE = zm + sg * dz, ny0 = sg * (zE - zm), nz0 = sg * (yr - yE), nl = Math.hypot(ny0, nz0), ny = ny0 / nl, nz = nz0 / nl;
        const S = (x, t, lift) => [x, yE + (yr - yE) * t + ny * lift, zE + (zm - zE) * t + nz * lift], X = (j) => X0 + sx * j / nseg;
        for (let i = 0; i < NC; i++) { const t0 = i / NC, t1 = Math.min(1, (i + 1) / NC + 0.08), base = th + 0.02 + i * 0.004, cv = 0.86 + 0.16 * hsh(i, sg);
          for (let j = 0; j < nseg; j++) { const xa = X(j), xb = X(j + 1), ja = (hsh(i * 7 + j, sg) - 0.5) * 0.12 / L, jb = (hsh(i * 7 + j + 1, sg) - 0.5) * 0.12 / L, ta = Math.max(0, t0 + ja), tb = Math.max(0, t0 + jb), dropA = 0.11 + hsh(j, i) * 0.06, dropB = 0.11 + hsh(j + 1, i) * 0.06;
            const ua = xa / tl, ub = xb / tl, v0 = ta * L / tl, v1 = t1 * L / tl, P = sg > 0 ? [S(xa, ta, base + dropA), S(xb, tb, base + dropB), S(xb, t1, base), S(xa, t1, base)] : [S(xb, tb, base + dropB), S(xa, ta, base + dropA), S(xa, t1, base), S(xb, t1, base)];
            const U = sg > 0 ? [[ua, v0], [ub, v0], [ub, v1], [ua, v1]] : [[ub, v0], [ua, v0], [ua, v1], [ub, v1]]; quad(k, P[0], P[1], P[2], P[3], [[cv * 1.06, cv * 1.06, cv], [cv * 1.06, cv * 1.06, cv], [cv * 0.8, cv * 0.82, cv * 0.78], [cv * 0.8, cv * 0.82, cv * 0.78]], U);
            const F = sg > 0 ? [S(xa, ta, base - 0.06), S(xb, tb, base - 0.06), S(xb, tb, base + dropB), S(xa, ta, base + dropA)] : [S(xb, tb, base - 0.06), S(xa, ta, base - 0.06), S(xa, ta, base + dropA), S(xb, tb, base + dropB)]; quad(k, F[0], F[1], F[2], F[3], 0.62 * cv, [[U[0][0], v0 - 0.06], [U[1][0], v0 - 0.06], [U[1][0], v0], [U[0][0], v0]]); } }
        // plank bargeboards up both gable edges
        for (const [xx, s2] of [[X0 - 0.03, -1], [X1 + 0.03, 1]]) { const a0 = S(xx, 0, -0.12), a1 = S(xx, 1, -0.12), b1 = S(xx, 1, th + 0.26), b0 = S(xx, 0, th + 0.26); if (s2 * sg > 0) quad('wood', a0, a1, b1, b0, 0.8); else quad('wood', b0, b1, a1, a0, 0.8); } }
      const ry = o.r ? o.r[1] : 0, cr = Math.cos(ry), sr = Math.sin(ry), RP = (p) => [c[0] + p[0] * cr + p[2] * sr, c[1] + p[1], c[2] - p[0] * sr + p[2] * cr];
      for (const sg of [1, -1]) cyl(k, RP([X0 - 0.05, yE + 0.02, zm + sg * (dz + 0.02)]), 0.2, 0.2, sx + 0.1, 7, [0.78, 0.82, 0.72], [0, ry, -Math.PI / 2]); // rounded eave edge
      if (o.cap !== false) cyl(k, RP([X0 - 0.02, yr + th * 0.9, zm]), 0.26, 0.26, sx + 0.04, 8, [0.95, 1, 0.9], [0, ry, -Math.PI / 2]); // moss ridge cap
      at(c, o.r); }
    else if (o.lumps !== false) { const n = Math.max(3, Math.round((X1 - X0) / 0.9)); for (let i = 0; i <= n; i++) { const x = X0 + (X1 - X0) * i / n; const ry = o.r ? o.r[1] : 0, cr = Math.cos(ry), sr = Math.sin(ry), RP = (p) => [c[0] + p[0] * cr + p[2] * sr, c[1] + p[1], c[2] - p[0] * sr + p[2] * cr]; for (const sg of [1, -1]) lump(k, RP([x, yE - 0.12, zm + sg * (dz - 0.05)]), [0.42, 0.42 + 0.12 * Math.sin(i * 2.1 + sg), 0.34], [0.95, 1, 0.9], sd + i * 13 + (sg > 0 ? 3 : 0), [0, ry, 0]); if (i % 2 === 0) lump(k, RP([x, yr + th * 0.6, zm]), [0.36, 0.3, 0.42], [1.05, 1.08, 0.95], sd + i * 7, [0, ry, 0]); } at(c, o.r); }
    // gable-end infill walls (triangles) in the wall material
    if (o.wall) for (const xx of [x0, x1]) { const s2 = xx === x0 ? -1 : 1, a = [xx, ye, z0], b = [xx, ye, z1], t = [xx, yr, zm]; if (s2 > 0) tri(o.wall, a, t, b, o.wallCol); else tri(o.wall, b, t, a, o.wallCol); } }
  function flush(parent, name, opt) { const out = []; for (const k in G) { const B = G[k]; if (!B.p.length) continue; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(B.u, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(B.c, 3)); g.computeBoundingSphere();
      const m = new THREE.Mesh(g, Town.art.mat(k)); m.name = name + '_' + k; const glow = Town.art.MAT[k][1]; m.castShadow = !glow && !(opt && opt.noShadow) && k !== 'dirt' && k !== 'cobble'; m.receiveShadow = !glow; m.matrixAutoUpdate = false; m.updateMatrix(); parent.add(m); out.push(m); } G = {}; return out; }
  return { reset, frame, at, tri, quad, box, cyl, dome, lump, gable, flush, get G() { return G; } };
})();
/* ---- the town-wide pieces: terrace tops, retaining walls, cobble streets and square, stairs, rope rails, lot markings ---- */
Town.ground = (G) => {
  const T=Town,B=Town.gb,W=T.WS,F=T.FIELD;B.frame(0,0,0,0);B.at();
  const P=(x,y,h)=>{const p=T.W2(x*14,y*14);return [p[0]/W,h/W,p[1]/W];};
  const hash=(x,y)=>{const q=Math.sin(x*91.7+y*47.3)*43758.545;return q-Math.floor(q);};
  // Anti-tile floor (extras3 floor_game_camera_antitile): world-space macro layers on the vertex colour, never UV. 4 layers in one draw:
  // painted ground #76693E tiled 4 m x value drift (6 m, +-10%) x hue drift (5 m, +-10%); moss #5B5F30 from a 2 m noise mask whose threshold
  // drops near the rim (1.6 m) and beside buildings, soft 0.35 m edge; worn dirt #9A774A at doorsteps (2.0 x 1.2 m) and 1.4 m desire paths.
  const vn=(x,y,sd)=>{const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),r=(a,b)=>hash(a+sd*17.1,b-sd*9.3);return (r(xi,yi)*(1-u)+r(xi+1,yi)*u)*(1-v)+(r(xi,yi+1)*(1-u)+r(xi+1,yi+1)*u)*v;};
  const fbm=(x,y,sd)=>.65*vn(x,y,sd)+.35*vn(x*2.1+5.3,y*2.1-1.7,sd+3);
  const lin=(hx)=>[0,2,4].map(i=>Math.pow(parseInt(hx.slice(i,i+2),16)/255,2.2));const PG=lin('76693E'),MO=lin('5B5F30'),DI=lin('9A774A');
  const rat=(c)=>c.map((v,i)=>v/PG[i]),TXG=lin('8D8049'),TXC=lin('7E6749'),CB=lin('6E5A45'),kG=PG.map((v,i)=>v/TXG[i]),kC=CB.map((v,i)=>v/TXC[i]);/* swatch means -> the colour key */const kMO=rat(MO),kDI=rat(DI);
  const doors=T.BLD.map(Bd=>{const P0=T.place(Bd),D=(Bd.round?Bd.w/2:Bd.d/2)+.9,f=[P0.x+Math.sin(P0.yaw)*D*W,P0.y+Math.cos(P0.yaw)*D*W],q=T.P2(f[0],f[1]);return [q[0]/14,q[1]/14,P0.yaw];});
  const segM=(x,y,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],l2=dx*dx+dy*dy||1,t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/l2));return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t);};
  const desire=doors.map(d=>[[d[0],d[1]],[d[0],Math.max(22.5,Math.min(26.5,d[1]))]]).concat([[[30,7.5],[30,13.2]],[[30,15.3],[30,22.5]],[[30,44.1],[30,26.5]],[[30,7.5],[18,8.6]],[[30,7.5],[8.5,8.6]]]);
  const bldD=(x,y)=>{let d=1e9;for(const Bd of T.BLD){const q=[Bd.px/14,Bd.py/14];d=Math.min(d,Math.hypot(x-q[0],y-q[1])-Math.max(Bd.w,Bd.d)/2);}return d;};
  const floorCol=(x,y,paved)=>{const val=1+.2*(fbm(x/6,y/6,1)-.5),hue=.2*(fbm(x/5,y/5,2)-.5),rimD=T.edgeD(x*14,y*14)/14;
    let c=[val*(1+hue*.6),val,val*(1-hue)];if(paved)return c.map((v,i)=>v*kC[i]*(1+.14*(vn(x/3,y/3,7)-.5)));c=c.map((v,i)=>v*kG[i]);
    const thr=.56-.24*(1-Math.min(1,rimD/1.6))-.14*(1-Math.min(1,Math.max(0,bldD(x,y))/2.5)),m=Math.max(0,Math.min(1,(fbm(x/2,y/2,4)-thr)/.17+.5));
    let dw=0;for(const d of doors){const lx=x-d[0],ly=y-d[1];dw=Math.max(dw,1-Math.max(Math.abs(lx)/1.0,Math.abs(ly)/0.6));}for(const [a,b] of desire)dw=Math.max(dw,1-segM(x,y,a,b)/.7);
    dw=Math.max(0,Math.min(1,dw*1.6+.35*(vn(x/.6,y/.6,9)-.5)))*.95;const mm=m*(1-dw);
    return c.map((v,i)=>v*(1+(kMO[i]-1)*mm)*(1+(kDI[i]-1)*dw));};
  const step=.65,inTop=(x,y)=>T.inPoly(T.OUT,x*14,y*14)&&!T.entryAt(x*14,y*14);
  for(let y=1;y<48;y+=step)for(let x=0;x<59;x+=step){if(!inTop(x+step*.5,y+step*.5))continue;
    const h=T.lvlPx((x+step*.5)*14,(y+step*.5)*14),cs=[[x,y],[x,y+step],[x+step,y+step],[x+step,y]].map(([a,b])=>floorCol(a,b,false));B.at();B.quad('dirt',P(x,y,h),P(x,y+step,h),P(x+step,y+step,h),P(x+step,y,h),cs);}
  // Rim: bulging strata, half-sunk toe boulders, soil and 0.15m moss lip overhanging .4m. No berm ledge.
  const rim=(a,b,ha,hb)=>{const ax=a[0]/14,ay=a[1]/14,bx=b[0]/14,by=b[1]/14,dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy),nx=dy/len,ny=-dx/len;
    let sg=T.inPoly(T.OUT,(ax+nx*.3)*14,(ay+ny*.3)*14)?-1:1;const pt=(x,y,h,o)=>P(x+nx*o*sg,y+ny*o*sg,h);
    for(const [u,v,ka,kb,m,col] of [[0,.30,.05,.17,'stone',[.52,.47,.4]],[.30,.69,.17,.08,'stone',[.62,.56,.45]],[.69,.91,.08,.03,'dirt',[.58,.48,.36]],[.91,1,.03,0,'dirt',[.62,.54,.4]]]){B.at();B.quad(m,pt(ax,ay,F+(ha-F)*u,ka),pt(bx,by,F+(hb-F)*u,ka),pt(bx,by,F+(hb-F)*v,kb),pt(ax,ay,F+(ha-F)*v,kb),col);}
    B.at();B.quad('moss',pt(ax,ay,ha-.15*W,.42),pt(bx,by,hb-.15*W,.42),pt(bx,by,hb,.36),pt(ax,ay,ha,.36),[.72,.75,.62]);B.quad('moss',pt(ax,ay,ha,.36),pt(bx,by,hb,.36),pt(bx,by,hb,-.2),pt(ax,ay,ha,-.2),[.9,.93,.78]);
  };
  for(let i=0;i<T.OUT.length;i++){const a=T.OUT[i],b=T.OUT[(i+1)%T.OUT.length];if(T.entryAt(a[0],a[1],.5))continue;rim(a,b,T.lvlPx(...a),T.lvlPx(...b));if(i%3===0){const x=a[0]/14,y=a[1]/14,h=T.lvlPx(...a);const p=P(x,y,F-.22*W);B.lump('stone',p,[.35+hash(i,1)*.3,.6+hash(i,2)*.3,.4+hash(i,3)*.3],[.58,.5,.4],i+7);}}
  // Wavy upper terrace retaining wall with the same strata, cut for S4.
  for(let x=3.5;x<47;x+=.7){const y=13.2+.25*Math.sin(x*.8);if(T.entryAt(x*14,y*14,.7))continue;const a=P(x,y,T.LV[1]),b=P(x+.7,y,T.LV[1]),c=P(x+.7,y,T.LV[0]),d=P(x,y,T.LV[0]);B.at();B.quad('stone',a,b,c,d,[.78,.73,.62]);}
  // Five real stone stair flights, precise .20 m risers and .35 m treads (S5 needs 14 to reach +2.8).
  for(const e of T.ENTRIES)for(let i=0;i<e.n;i++){const u0=e.run*i/e.n,u1=e.run*(i+1)/e.n,h=e.lo+(e.hi-e.lo)*(i+1)/e.n,pt=(u,v,hh)=>P(e.x+(e.axis==='x'?u*e.dir:v),e.y+(e.axis==='y'?u*e.dir:v),hh),a=pt(u0,-e.w/2,h),b=pt(u1,-e.w/2,h),c=pt(u1,e.w/2,h),d=pt(u0,e.w/2,h);B.at();B.quad('stone',a,b,c,d,[1,.96,.86]);B.quad('stone',pt(u0,-e.w/2,h-.2*W),a,d,pt(u0,e.w/2,h-.2*W),[.67,.63,.55]);}
  // Main street + square: warm laid cobble, 4 m street, 14 m square; lanes 2.5 m.
  const curbD=(x,y)=>Math.min(Math.abs(y-22.5),Math.abs(y-26.5),Math.abs(Math.hypot(x-30,y-24.5)-7)),cobC=(x,y)=>{const c=floorCol(x,y,true),cd=curbD(x,y),mc=Math.max(0,Math.min(1,(.9-cd)/.6))*Math.min(1,Math.max(0,(fbm(x/2,y/2,5)-.35)*2.5));return c.map((v,i)=>v*(1+(kMO[i]*1.25-1)*mc*.5));};
  const pave=(x,y,dx,dy)=>{const h=T.lvlPx((x+dx*.5)*14,(y+dy*.5)*14)+W*.035;B.at();B.quad('cobble',P(x,y,h),P(x,y+dy,h),P(x+dx,y+dy,h),P(x+dx,y,h),[[x,y],[x,y+dy],[x+dx,y+dy],[x+dx,y]].map(([a,b])=>cobC(a,b)));};
  for(let x=4;x<54.5;x+=.5)for(let y=22.5;y<26.5;y+=.5)if(!T.entryAt((x+.25)*14,(y+.25)*14))pave(x,y,.5,.5);
  for(let y=17.5;y<31.5;y+=.5)for(let x=23;x<37;x+=.5)if(Math.hypot(x+.25-30,y+.25-24.5)<7)pave(x,y,.5,.5);
  // Empty lots: chalk dashes only; never filler props.
  for(const l of T.LOTS){if(l[3]===0)continue;const x=l[1]/14,y=l[2]/14,w=l[3]/14,d=l[4]/14,h=T.lvlPx(l[1],l[2])+W*.045;for(let a=-w/2;a<w/2;a+=.8)for(const sg of [-1,1]){B.at();B.quad('chalk',P(x+a,y+sg*d/2,h),P(x+a+.4,y+sg*d/2,h),P(x+a+.4,y+sg*d/2+.025,h),P(x+a,y+sg*d/2+.025,h),.8);}for(let a=-d/2;a<d/2;a+=.8)for(const sg of [-1,1]){B.at();B.quad('chalk',P(x+sg*w/2,y+a,h),P(x+sg*w/2+.025,y+a,h),P(x+sg*w/2+.025,y+a+.4,h),P(x+sg*w/2,y+a+.4,h),.8);}}
  return B.flush(G,'townGround',{noShadow:true});
};
/* shared building kit */
Town.kit = (() => {
  const B = Town.gb, WS = Town.WS; let CP = null;
  const set = (p) => { CP = p; }; // current building's world placement, for solid props
  const prop = (x, z, r) => { if (!CP) return; const cs = Math.cos(CP.yaw), sn = Math.sin(CP.yaw); Town.PCOL.push([CP.x + (x * cs + z * sn) * WS, CP.y + (-x * sn + z * cs) * WS, r * WS]); };
  const box = (...a) => B.box(...a), cyl = (...a) => B.cyl(...a), lump = (...a) => B.lump(...a);
  function beam(a, b, w, k, col) { const A = new THREE.Vector3(...a), C = new THREE.Vector3(...b), d = C.clone().sub(A), L = d.length(), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), e = new THREE.Euler().setFromQuaternion(q); box(k || 'wood', a, [w, L, w], col, [e.x, e.y, e.z]); }
  function log(a, b, r, col, rope) { const A = new THREE.Vector3(...a), C = new THREE.Vector3(...b), d = C.clone().sub(A), L = d.length(), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()), e = new THREE.Euler().setFromQuaternion(q), rot = [e.x, e.y, e.z]; cyl('wood', a, r, r * 0.94, L, 8, col, rot, { top: true, bot: true });
    if (rope) for (let dist = 0.35; dist < L - 0.1; dist += 1.0) for (let wrap=0;wrap<3;wrap++) { const C2 = A.clone().addScaledVector(d, (dist + wrap*.035) / L); cyl('rope', [C2.x, C2.y, C2.z], r * 1.06, r * 1.06, .025, 8, .85, rot); } }
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
  function porch(x, z, w, d, y, steps) { const ht = y || 0.38; box('stone', [x, -0.12, z], [w + 0.15, ht, d + 0.1], 0.95); box('wood', [x, ht - 0.02, z], [w, 0.13, d], 1.05); const n = steps || 2; for (let i = 0; i < n; i++) { const h = ht * (n - i) / n; box('stone', [x, 0, z + d / 2 + 0.175 + i * 0.35], [Math.min(w * 0.7, 2.5), h, 0.35], 0.9); } }
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
    const x0 = -4.05, x1 = 4.05, cx = (x0 + x1) / 2, z0 = -3.25, z1 = 3.25, w = x1 - x0, d = z1 - z0, cz = (z0 + z1) / 2;
    box('stone', [cx, 0, cz], [w, 1.2, d], ST); box('plaster', [cx, 1.2, cz], [w - 0.1, 2.7, d - 0.1], 0.95); k.corners(w, d, 3.9, 0, {}); B.at();
    for (const z of [z1 + 0.02]) { k.beam([x0, 2.5, z], [x1, 2.5, z], 0.2, 'wood'); k.beam([x0, 3.9, z], [x1, 3.9, z], 0.18, 'wood'); for (let i = 1; i < 5; i++) k.beam([x0 + w * i / 5, 2.5, z], [x0 + w * i / 5, 3.9, z], 0.14, 'wood'); k.beam([x0 + 0.3, 2.6, z], [x0 + w * 0.2, 3.45, z], 0.11, 'wood'); k.beam([x1 - 0.3, 2.6, z], [x1 - w * 0.2, 3.45, z], 0.11, 'wood'); }
    for (const x of [x0 - 0.03, x1 + 0.03]) { k.beam([x, 3.9, z0], [x, 3.9, z1], 0.18); k.beam([x, 3.9, z0 + 0.3], [x, 6.9, cz], 0.14); k.beam([x, 3.9, z1 - 0.3], [x, 6.9, cz], 0.14); k.beam([x, 3.9, cz], [x, 6.95, cz], 0.14); }
    B.gable([0, 0, 0], x0, x1, z0, z1, 3.9, 7.0, 0.55, 0.22, { wall: 'plaster', wallCol: 0.9, sd: 11 }); k.log([x0 - 0.75, 7.2, cz], [x1 + 0.75, 7.25, cz], 0.175, 1, true);
    k.dormer(cx - 0.9, 4.0, 1.0, 1.3, 1.4); k.chimney(x0 + 0.7, z0 + 0.8, 4.0, 7.2, 0.8, 0.8);
    k.door(0.35, 0.4, z1 + 0.03, 1.2, 2.2); k.win(-1.9, 0.9, z1 + 0.03, 0.85, 1.15, { shutters: 1 }); k.win(-1.4, 2.65, z1 + 0.04, 0.6, 0.7); k.win(1.25, 0.95, z1 + 0.03, 0.55, 0.85);
    k.awning(0, 2.95, z1 + 0.05, 7.5, 1.35); k.porch(cx, z1 + 0.6, w + 0.3, 1.15, 0.32, 2); k.lamp(-0.55, 1.6, z1 + 0.18, 1);
    // goods: ore barrels and a crystal crate on the porch, sacks
    k.barrel(-3.0, 0.3, z1 + 0.65, 0.33, 0.75); k.barrel(-2.35, 0.3, z1 + 0.7, 0.3, 0.7); for (const [x, z] of [[-3.0, z1 + 0.65], [-2.35, z1 + 0.7]]) for (let i = 0; i < 4; i++) k.crystal(x + (i % 2 - 0.5) * 0.25, 1.0, z + (i > 1 ? 0.1 : -0.1), 0.06, 0.2 + i * 0.03);
    k.crate(1.35, 0.32, z1 + 0.6, 0.6, { crystal: 1 }); k.sack(-1.1, 0.32, z1 + 0.85, 0.26, 0.5); k.sack(2.35, 0, z1 + 1.15, 0.3, 0.55);
    // Reuse the established crate dressing on the street-side left, outside the wall; no new filler props.
    for (const [x,y,z,sz] of [[-4.7,0,2.5,.9],[-4.7,.9,2.5,.8],[-4.7,0,1.5,.9]]) k.crate(x,y,z,sz);
    k.sign('general_store', 2.4, 1.85, z1 + 0.2); for (let i = 0; i < 6; i++) lump('moss', [x0 + 0.2 + i * 0.9, 0, z1 + 0.05 + (i % 2) * 0.1], [0.35, 0.22, 0.25], [0.9, 1, 0.85], 5 + i);
    return { foot: [[x0, z0, x1, z1 + 1.2]] }; }
  function smithy() { // 1.75 x 1.25 SU: fat stone chimney / forge tower on the left with a glowing mouth, timber crane arm with pulley and hook, open-sided work shed, the gold spiral drill on its tripod out front
    const x0 = -1.4, x1 = 3.9, z0 = -2.6, z1 = 1.5, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    box('stone', [cx, 0, cz], [w, 1.0, d], ST); box('woodV', [cx, 1.0, cz], [w - 0.12, 1.9, d - 0.12], 0.9); k.corners(w, d, 2.95, 0); B.at();
    B.gable([0, 0, 0], x0, x1, z0, z1, 2.9, 5.1, 0.5, 0.22, { wall: 'woodV', wallCol: 0.8, sd: 23 }); k.log([x0 - 0.6, 5.3, cz], [x1 + 0.7, 5.35, cz], 0.19, 1, true); k.dormer(cx + 0.6, 3.4, 0.55, 1.2, 1.3);
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
    const w = 4.6, zF = 6.9, zB = -6.9, L = zF - zB, cz = (zF + zB) / 2;
    box('stone', [0, 0, cz], [w, 0.55, L], ST); box('wood', [0, 0.55, cz], [w - 0.4, 0.08, L - 0.3], 0.75);
    for (let z = zB + 0.15; z <= zF - 0.1; z += L / 6) for (const sg of [-1, 1]) { k.log([sg * (w / 2 - 0.15), 0.5, z], [sg * (w / 2 - 0.15), 2.45, z], 0.14, 0.85); k.beam([sg * (w / 2 - 0.15), 2.0, z], [sg * (w / 2 - 0.15), 2.4, z + (z < zF - 1 ? 0.6 : -0.6)], 0.08); }
    for (const sg of [-1, 1]) { k.beam([sg * (w / 2 - 0.15), 2.4, zB], [sg * (w / 2 - 0.15), 2.4, zF], 0.2); k.beam([sg * (w / 2 - 0.15), 1.25, zB], [sg * (w / 2 - 0.15), 1.25, zF], 0.08, 'rope'); }
    k.frontRoof(0, cz, w, L, 2.45, 4.5, { wall: 'woodV', wallCol: 0.78, sd: 51 }); box('woodV', [0, 0.55, zF - 0.05], [w - 0.3, 1.9, 0.12], 0.8); box('woodV', [0, 0.55, zB + 0.05], [w - 0.3, 1.9, 0.12], 0.8);
    // the giant spoked wheel on the front gable
    const wc = [0, 2.15, zF + 0.35], R = 1.5; k.torus('wood', wc, R, 0.14, null, 26, 0.95); k.torus('wood', wc, R - 0.32, 0.07, null, 22, 0.85); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; k.beam(wc, [wc[0] + Math.cos(a) * (R - 0.05), wc[1] + Math.sin(a) * (R - 0.05), wc[2]], 0.09); }
    cyl('brass', [0, 2.15, zF + 0.1], 0.32, 0.32, 0.5, 10, 1, [Math.PI / 2, 0, 0], { top: true, bot: true }); k.torus('rope', [0, 2.15, zF + 0.62], 0.2, 0.06, null, 10); k.beam([-0.5, 0.0, zF + 0.4], [0, 2.15, zF + 0.4], 0.14); k.beam([0.5, 0.0, zF + 0.4], [0, 2.15, zF + 0.4], 0.14); k.prop(0, zF + 0.4, 0.5);
    // rope walk inside: strands stretched the hall's length, spools of pale-blue glowing tether cord
    for (const x of [-0.8, -0.25, 0.3, 0.85]) k.beam([x, 1.05, zB + 0.4], [x, 1.1, zF - 0.6], 0.035, 'rope');
    for (let i = 0; i < 4; i++) { const z = zB + 1.6 + i * 2.6, x = i % 2 ? 1.25 : -1.25; for (const s of [-0.32, 0.32]) cyl('wood', [x + s, 0.63, z], 0.45, 0.45, 0.06, 12, 0.85, [0, 0, Math.PI / 2], { top: true, bot: true }); cyl('glowTeal', [x - 0.3, 0.63, z], 0.36, 0.36, 0.6, 12, [0.55, 0.8, 1.15], [0, 0, -Math.PI / 2]); }
    // drying tower at the back end: four posts, braces, two platforms, a small roof, ropes hanging down
    const tz = zB - 1.75, tw = 3.0, th = 4.0; for (const sx of [-1, 1]) for (const sz of [-1, 1]) { k.log([sx * tw / 2, 0, tz + sz * tw / 2], [sx * tw / 2 * 0.9, th, tz + sz * tw / 2 * 0.9], 0.15, 0.85, true); }
    for (const y of [2.6, 5.4]) { box('wood', [0, y, tz], [tw + 0.2, 0.14, tw + 0.2], 0.85); for (const sg of [-1, 1]) { k.beam([sg * tw / 2, y - 2.3, tz - tw / 2], [-sg * tw / 2, y, tz - tw / 2], 0.1); k.beam([tw / 2, y - 2.3, tz + sg * tw / 2], [tw / 2, y, tz - sg * tw / 2], 0.1); k.beam([-tw / 2, y - 2.3, tz + sg * tw / 2], [-tw / 2, y, tz - sg * tw / 2], 0.1); } }
    cyl('moss', [0, th, tz], 2.7, 0.15, 1.6, 4, 0.95, [0, Math.PI / 4, 0], { bot: true }); box('wood', [0, th - 0.1, tz], [tw, 0.2, tw], 0.8); for (let i = 0; i < 7; i++) { const x = -1.2 + i * 0.4; k.beam([x, th - 0.2, tz + 0.3 * (i % 3 - 1)], [x + 0.05, 1.0 + (i % 3) * 0.6, tz + 0.3 * (i % 3 - 1)], 0.05, 'rope'); }
    k.beam([0, th - 0.4, tz + tw / 2], [0, 1.0, zB + 0.3], 0.04, 'rope'); k.lamp(-w / 2 - 0.1, 1.5, zF - 0.3); k.lamp(w / 2 + 0.1, 1.5, zF - 0.3); k.sign('rope_maker', -w / 2 - 0.6, 1.5, zF - 0.6);
    k.barrel(w / 2 + 0.55, 0, zF - 1.6, 0.32, 0.75, { rope: 1 }); k.crate(w / 2 + 0.6, 0, zF - 2.6, 0.6); k.lump('moss', [-w / 2 - 0.2, 0, 2], [0.5, 0.3, 0.9], 0.9, 66);
    return { foot: [[-w / 2 - 0.2, zB, w / 2 + 0.2, zF + 0.6], [-tw / 2 - 0.2, tz - tw / 2 - 0.2, tw / 2 + 0.2, zB]] }; }
  function bank() { // a round squat fieldstone drum (1.5 SU across), riveted brass dome with a teal crystal finial, a giant round vault door as the entrance, front steps; no lettering
    const R = 3.05; cyl('stone', [0, 0, 0], R + 0.25, R + 0.2, 0.45, 24, 0.85, null, { top: true }); cyl('stone', [0, 0.45, 0], R, R, 2.9, 24, ST, null, {}); cyl('stone', [0, 3.35, 0], R + 0.22, R + 0.22, 0.28, 24, 0.75, null, { top: true });
    // radially laid individual capstones and tapered load-bearing buttresses
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; box('stone', [Math.sin(a) * 3.18, 3.4, Math.cos(a) * 3.18], [0.78, 0.3, 0.62], 0.83 + (i % 3) * 0.045, [0, a, 0]); }
    for (let i = 0; i < 6; i++) { const a = (i + 0.5) / 6 * Math.PI * 2, sn = Math.sin(a), cs = Math.cos(a), r = R + 0.12;
      box('stone', [sn * r, 0, cs * r], [0.55, 0.4, 0.7], 0.8, [0, a, 0]);
      // tapered profile: 0.50 m deep at the foot, 0.27 at the head (two load-bearing halves)
      k.beam([sn * (r + 0.1), 0.4, cs * (r + 0.1)], [sn * r, 3.4, cs * r], 0.35, 'wood', 0.7);
      for (const y of [0.7, 2.9]) for (let q = 0; q < 3; q++) { const rr = r + (3.4 - y) / 3 * 0.1; box('rope', [sn * rr, y + q * 0.055, cs * rr], [0.39, 0.04, 0.32], 0.78, [0, a, 0]); }
    }
    cyl('stone', [0, 3.4, 0], 1.95, 1.95, 0.35, 24, 0.83, null, { top: true });
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; box('stone', [Math.sin(a) * 1.78, 3.43, Math.cos(a) * 1.78], [0.6, 0.35, 0.35], 0.82 + (i % 3) * 0.035, [0, a, 0]); }
    cyl('bronze', [0, 3.75, 0], 1.63, 1.63, 0.15, 24, [0.38, 0.26, 0.17], null, { top: true });
    B.at(); const dp = (a, p, lift) => [Math.cos(a) * (1.6 + lift) * Math.cos(p), 3.75 + (1.25 + lift) * Math.sin(p), Math.sin(a) * (1.6 + lift) * Math.cos(p)];
    B.dome('bronze', [0, 3.75, 0], 1.595, 1.245, 24, 8, [0.28, 0.23, 0.18]);
    for (let j = 0; j < 12; j++) { const a0 = j / 12 * Math.PI * 2 + 0.012, a1 = (j + 1) / 12 * Math.PI * 2 - 0.012, patina = j % 4 === 0 ? [0.34, 0.4, 0.27] : [0.48 + (j % 3) * 0.035, 0.35 + (j % 3) * 0.025, 0.22];
      for (let q = 0; q < 7; q++) { const p0 = q / 7 * Math.PI / 2, p1 = (q + 1) / 7 * Math.PI / 2; B.at(); B.quad('bronze', dp(a0, p0, 0), dp(a0, p1, 0), dp(a1, p1, 0), dp(a1, p0, 0), patina); }
      for (let q = 0; q < 7; q++) { const pp = 0.07 + q * 0.21, rr = dp(a0 + 0.022, pp, 0.025); lump('bronze', [rr[0], rr[1] - 0.025, rr[2]], [0.02, 0.025, 0.02], [0.63, 0.47, 0.29], j * 7 + q + 1); }
    } B.at();
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; for (let j = 0; j < 6; j++) { const p0 = j / 6 * Math.PI / 2 * 0.92, p1 = (j + 1) / 6 * Math.PI / 2 * 0.92; k.beam([Math.cos(p0) * Math.cos(a) * 1.63, 3.75 + Math.sin(p0) * 1.28, Math.cos(p0) * Math.sin(a) * 1.63], [Math.cos(p1) * Math.cos(a) * 1.63, 3.75 + Math.sin(p1) * 1.28, Math.cos(p1) * Math.sin(a) * 1.63], 0.075, 'bronze', [0.4, 0.3, 0.21]); } }
    cyl('bronze', [0, 5.0, 0], 0.35, 0.3, 0.15, 12, [0.48, 0.35, 0.21], null, { top: true }); k.crystal(0, 5.15, 0, 0.18, 0.35);
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + 0.3; lump('moss', [Math.cos(a) * (R + 0.15), 0.4, Math.sin(a) * (R + 0.15)], [0.45, 0.25, 0.3], [0.9, 1, 0.85], 81 + i); }
    // the vault door: a thick round brass disc in a stone surround, a spoked wheel, a ring of bolts, the hinge on the left
    const dz = R + 0.04, dy = 1.55, dr = 1.2; k.torus('stone', [0, dy, dz], dr + 0.18, 0.26, null, 22, 0.8); cyl('brass', [0, dy, dz - 0.1], dr, dr, 0.3, 24, 0.95, [Math.PI / 2, 0, 0], { top: true });
    k.torus('brass', [0, dy, dz + 0.24], dr * 0.86, 0.06, null, 22, 0.7); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; cyl('iron', [Math.cos(a) * dr * 0.93, dy + Math.sin(a) * dr * 0.93, dz + 0.2], 0.055, 0.04, 0.07, 6, 0.8, [Math.PI / 2, 0, 0], { top: true }); }
    k.torus('iron', [0, dy, dz + 0.36], 0.55, 0.06, null, 16, 0.85); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; k.beam([0, dy, dz + 0.36], [Math.cos(a) * 0.55, dy + Math.sin(a) * 0.55, dz + 0.36], 0.06, 'iron', 0.9); } cyl('brass', [0, dy, dz + 0.22], 0.2, 0.2, 0.22, 10, 1, [Math.PI / 2, 0, 0], { top: true });
    for (const y of [0.85, 2.25]) box('iron', [-dr - 0.15, dy - 1.55 + y, dz + 0.05], [0.35, 0.22, 0.3], 0.7);
    for (let i = 0; i < 3; i++) cyl('stone', [0, i * 0.18, dz - 0.3], 2.0 - i * 0.4 + 0.6, 2.0 - i * 0.4 + 0.6, 0.18, 16, 0.76 + i * 0.04, null, { top: true, a0: 0.1, a1: Math.PI - 0.1 });
    for (const sg of [-1, 1]) { const a = Math.PI / 2 + sg * 1.0, x = Math.cos(a) * (R + 0.02), z = Math.sin(a) * (R + 0.02); B.at([x, 2.0, z], [0, -a + Math.PI / 2, 0]); cyl('glowWin', [x, 2.05, z], 0.42, 0.42, 0.06, 14, 1, [Math.PI / 2, -a + Math.PI / 2, 0], { top: true }); k.torus('brass', [x, 2.05, z], 0.45, 0.07, [0, -a + Math.PI / 2, 0], 14, 0.9); }
    k.lamp(-1.85, 1.4, R - 0.45); k.lamp(1.85, 1.4, R - 0.45); k.sign('bank', 3.0, 1.9, 2.0);
    return { foot: [[0, 0, R + 0.3], [-1.9, R - 0.5, 1.9, R + 1.15]] }; }
  function inn() { // 2 x 1.75 SU, L-shaped, 2.5 storeys - the tallest: timber-framed main block, balcony with rope rails, tall stone chimney, two dormers, a lower one-storey wing with an outdoor table
    const x0 = -4.6, x1 = 1.2, z0 = -4.1, z1 = 1.4, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    box('stone', [cx, 0, cz], [w, 2.9, d], ST); box('plaster', [cx, 2.9, cz], [w - 0.1, 2.8, d - 0.1], 0.95); k.corners(w, d, 5.7, 0); B.at();
    for (const z of [z1 + 0.02]) { for (const y of [2.9, 5.65]) k.beam([x0, y, z], [x1, y, z], 0.2); for (let i = 0; i <= 6; i++) k.beam([x0 + w * i / 6, 2.9, z], [x0 + w * i / 6, 5.65, z], 0.15); for (let i = 0; i < 6; i += 2) k.beam([x0 + w * i / 6, 2.95, z], [x0 + w * (i + 1) / 6, 4.2, z], 0.1); }
    for (const x of [x0 - 0.03, x1 + 0.03]) { for (const y of [2.9, 5.65]) k.beam([x, y, z0], [x, y, z1], 0.2); for (let i = 0; i <= 5; i++) k.beam([x, 2.9, z0 + d * i / 5], [x, 5.65, z0 + d * i / 5], 0.15); k.beam([x, 5.65, z0 + 0.3], [x, 8.8, cz], 0.15); k.beam([x, 5.65, z1 - 0.3], [x, 8.8, cz], 0.15); k.beam([x, 5.65, cz], [x, 8.9, cz], 0.15); k.beam([x, 2.95, z0], [x, 4.3, z0 + d * 0.4], 0.1); }
    B.gable([0, 0, 0], x0, x1, z0, z1, 5.6, 9.0, 0.6, 0.24, { wall: 'plaster', wallCol: 0.9, sd: 61 }); k.log([x0 - 0.8, 9.2, cz], [x1 + 0.8, 9.25, cz], 0.21, 1, true); k.dormer(cx - 1.4, 6.0, 0.15, 1.3, 1.6); k.dormer(cx + 1.4, 6.0, 0.15, 1.3, 1.6);
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
    const RT = 4.2, R0 = 3.0, NL = 5; let y = 2.9; for (let i = 0; i < NL; i++) { const f0 = i / NL, f1 = (i + 1) / NL, r0 = R0 * (1 - f0) + 0.1, r1 = R0 * (1 - f1) * 0.97, km = 'moss'; cyl(km, [0, 2.9 + RT * f0 - (i ? 0.12 : 0), 0], r0 + (i ? 0.16 : 0), r1, RT / NL + (i ? 0.12 : 0), 16, i % 2 ? [0.78, 0.8, 0.7] : [0.98, 1, 0.9], null, { bot: true }); cyl('rope', [0, 2.9 + RT * f0 - (i ? 0.06 : 0), 0], r0 + (i ? 0.17 : 0.01), r0 + (i ? 0.17 : 0.01), 0.07, 16, 0.85); } y = 2.9 + RT; // layered moss tiers with a rope band at each lip (Art's guide_hut: no bark checker)
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
/* ---- townsfolk v2: sculpted characters built the way the player is (Catmull-Rom ring lofts on bone chains, toon shading with the same
   6-step ramp, an ink outline hull), but all six share ONE skinned mesh + ONE outline (2 draw calls): each keeper has 5 bones
   (root, chest, head, left arm, right arm) so they breathe, shift weight, sway their arms and turn their heads independently. ---- */
Town.sculpt = (() => {
  const TAU = Math.PI * 2, V = (x, y, z) => new THREE.Vector3(x, y, z);
  const crm = (a, b, c, d, t) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  const lin = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255].map((v) => Math.pow(v / 255, 2.2));
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  let OUT = null; // { p, n, c, si, sw, idx } accumulators
  let BONE = 0, XF = null; // current bone index, current local->mesh matrix
  // a grid of rows (each row: array of [x,y,z]) -> indexed geometry, normals, per-vertex colours (row colours or fn)
  function grid(rows, col, o) { o = o || {}; const R = rows.length, C = rows[0].length, pos = [], idx = []; for (const r of rows) for (const p of r) pos.push(p[0], p[1], p[2]);
    const wrap = o.wrap !== false; for (let i = 0; i < R - 1; i++) for (let j = 0; j < C - (wrap ? 0 : 1); j++) { const j2 = (j + 1) % C, a = i * C + j, b = i * C + j2, c = (i + 1) * C + j, d = (i + 1) * C + j2; if (o.flip) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    // seam normals: average the wrap seam (rows are closed rings, first==last not duplicated, so nothing to do) and pole rows
    const cols = []; for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) { const c = typeof col === 'function' ? col(i / (R - 1), j / C, rows[i][j]) : Array.isArray(col) && Array.isArray(col[0]) ? col[Math.min(col.length - 1, Math.floor(i / (R - 1) * col.length * 0.999))] : col; cols.push(...c); }
    add(g, cols); }
  function add(g, cols) { if (XF) g.applyMatrix4(XF); const P = g.attributes.position, N = g.attributes.normal, base = OUT.p.length / 3; for (let i = 0; i < P.count; i++) { OUT.p.push(P.getX(i), P.getY(i), P.getZ(i)); OUT.n.push(N.getX(i), N.getY(i), N.getZ(i)); OUT.c.push(cols[i * 3], cols[i * 3 + 1], cols[i * 3 + 2]); OUT.si.push(BONE, 0, 0, 0); OUT.sw.push(1, 0, 0, 0); }
    const I = g.index.array; for (let k = 0; k < I.length; k++) OUT.idx.push(I[k] + base); g.dispose(); }
  // lathe: rings [y, rx, rz, cz, cx] (Catmull-Rom between, sub steps), seg around; a0..a1 arc (open if partial); fold: [amp, count] cloth folds growing toward the low end; caps close the ends
  function lathe(rings, col, o) { o = o || {}; const seg = Math.min(o.seg || 14, 16), sub = o.sub || 2, R = []; for (let i = 0; i < rings.length - 1; i++) for (let k = 0; k < sub; k++) { const p0 = rings[Math.max(0, i - 1)], p1 = rings[i], p2 = rings[i + 1], p3 = rings[Math.min(rings.length - 1, i + 2)]; R.push([0, 1, 2, 3, 4].map((j) => crm(p0[j] || 0, p1[j] || 0, p2[j] || 0, p3[j] || 0, k / sub))); } R.push(rings[rings.length - 1].map((v) => v || 0));
    const a0 = o.a0 == null ? 0 : o.a0, a1 = o.a1 == null ? TAU : o.a1, full = a1 - a0 >= TAU - 1e-6, n = full ? seg : seg + 1, ylo = Math.min(...R.map((r) => r[0])), yhi = Math.max(...R.map((r) => r[0]));
    const rows = R.map(([y, rx, rz, cz, cx]) => { const row = []; for (let j = 0; j < n; j++) { const a = a0 + (a1 - a0) * j / seg; let f = 1; if (o.fold) { const t = 1 - (y - ylo) / (yhi - ylo || 1); f = 1 + o.fold[0] * Math.pow(t, o.fold[2] || 1) * Math.sin(a * o.fold[1] + (o.fold[3] || 0)); } row.push([(cx || 0) + Math.sin(a) * Math.max(1e-4, rx) * f, y, (cz || 0) + Math.cos(a) * Math.max(1e-4, rz) * f]); } return row; });
    if (o.cap0) rows.unshift(rows[0].map(() => [R[0][4] || 0, R[0][0], R[0][3] || 0])); if (o.cap1) { const L = R[R.length - 1]; rows.push(rows[0].map(() => [L[4] || 0, L[0], L[3] || 0])); }
    const desc = R[R.length - 1][0] < R[0][0]; grid(rows, col, { wrap: full, flip: !desc }); }
  // tube along a Catmull-Rom path of points with radii (one per point), seg around; ends capped
  function tube(pts, rad, col, o) { o = o || {}; const seg = Math.min(o.seg || 6, 6), sub = o.sub || 2, P = [], Rr = []; for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < sub; k++) { const q = [0, 1, 2].map((j) => crm(pts[Math.max(0, i - 1)][j], pts[i][j], pts[i + 1][j], pts[Math.min(pts.length - 1, i + 2)][j], k / sub)); P.push(V(...q)); Rr.push(rad[i] + (rad[i + 1] - rad[i]) * k / sub); } P.push(V(...pts[pts.length - 1])); Rr.push(rad[rad.length - 1]);
    const rows = []; let nrm = null; for (let i = 0; i < P.length; i++) { const t = (i < P.length - 1 ? P[i + 1].clone().sub(P[i]) : P[i].clone().sub(P[i - 1])).normalize(); if (!nrm) { nrm = Math.abs(t.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0); } const b = V().crossVectors(t, nrm).normalize(); nrm = V().crossVectors(b, t).normalize(); const row = []; for (let j = 0; j < seg; j++) { const a = j / seg * TAU, r = Rr[i] * (o.flat ? (Math.abs(Math.cos(a)) * (1 - o.flat) + o.flat) : 1); row.push(P[i].clone().addScaledVector(nrm, Math.cos(a) * r * (o.sx || 1)).addScaledVector(b, Math.sin(a) * r).toArray()); } rows.push(row); }
    if (o.caps !== false) { rows.unshift(rows[0].map(() => P[0].toArray())); rows.push(rows[0].map(() => P[P.length - 1].toArray())); } grid(rows, col, { flip: true }); }
  // ellipsoid at c with radii r, rotation e
  function ell(c, r, col, o) { o = o || {}; const g = new THREE.SphereGeometry(1, Math.min(o.w || 7, 10), Math.min(o.h || 5, 6)); g.applyMatrix4(new THREE.Matrix4().compose(V(...c), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(o.e || [0, 0, 0]))), V(...r))); const n = g.attributes.position.count, cs = []; for (let i = 0; i < n; i++) cs.push(...col); add(g, cs); }
  function box(c, s, col, e) { const g = new THREE.BoxGeometry(...s); g.applyMatrix4(new THREE.Matrix4().compose(V(...c), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(e || [0, 0, 0]))), V(1, 1, 1))); const n = g.attributes.position.count, cs = []; for (let i = 0; i < n; i++) cs.push(...col); add(g, cs); }
  function torus(c, R, r, col, e, o) { o = o || {}; const g = new THREE.TorusGeometry(R, r, o.r || 3, Math.min(o.t || 9, 9), o.arc || TAU); g.applyMatrix4(new THREE.Matrix4().compose(V(...c), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(e || [0, 0, 0]))), V(1, 1, 1))); const n = g.attributes.position.count, cs = []; for (let i = 0; i < n; i++) cs.push(...col); add(g, cs); }
  // a hand at the wrist w, pointing along d; the palm faces pal (unit, toward what it holds / the thigh); curl 0..1; four fingers + thumb
  function hand(w, d, pal0, skin, curl, o) { o = o || {}; const D = V(...d).normalize(), pal = V(...pal0).projectOnPlane(D).normalize(), up = V().crossVectors(D, pal).normalize(), sz = o.s || 1, W = V(...w), cu = curl == null ? 0.35 : curl;
    const g = new THREE.SphereGeometry(1, 8, 6); g.applyMatrix4(new THREE.Matrix4().makeBasis(up, D, pal).scale(V(0.04 * sz, 0.05 * sz, 0.021 * sz)).setPosition(W.clone().addScaledVector(D, 0.045 * sz))); const cs = []; for (let i = 0; i < g.attributes.position.count; i++) cs.push(...skin); add(g, cs);
    for (let f = 0; f < 4; f++) { const off = (f - 1.5) * 0.018 * sz, L = [0.034, 0.026, 0.02].map((v) => v * sz * (f === 3 ? 0.8 : f === 1 ? 1.08 : 1)); let p = W.clone().addScaledVector(D, 0.085 * sz).addScaledVector(up, off); const pts = [p.toArray()];
      for (let k = 0; k < 3; k++) { const a = cu * 0.75 * (k + 1); const dir = D.clone().multiplyScalar(Math.cos(a)).addScaledVector(pal, Math.sin(a)); p = p.clone().addScaledVector(dir, L[k]); pts.push(p.toArray()); }
      tube(pts, [0.0098, 0.009, 0.0082, 0.007].map((v) => v * sz), o.tip && f >= 0 ? skin : skin, { seg: 5, sub: 1 }); }
    const T0 = W.clone().addScaledVector(D, 0.03 * sz).addScaledVector(up, (o.th || -1) * 0.032 * sz).addScaledVector(pal, 0.008 * sz), td = D.clone().addScaledVector(pal, 0.6 + cu * 0.3).addScaledVector(up, (o.th || -1) * 0.3).normalize();
    tube([T0.toArray(), T0.clone().addScaledVector(td, 0.028 * sz).toArray(), T0.clone().addScaledVector(td, 0.05 * sz).addScaledVector(pal, 0.01 * sz).toArray()], [0.012 * sz, 0.01 * sz, 0.0085 * sz], skin, { seg: 5, sub: 1 }); }
  function begin() { OUT = { p: [], n: [], c: [], si: [], sw: [], idx: [] }; }
  function bone(i, m) { BONE = i; XF = m || null; }
  function end() { const g = new THREE.BufferGeometry(), O = OUT; g.setAttribute('position', new THREE.Float32BufferAttribute(O.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(O.n, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(O.c, 3)); g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(O.si, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(O.sw, 4)); g.setIndex(O.idx.length > 65535 ? new THREE.Uint32BufferAttribute(O.idx, 1) : new THREE.Uint16BufferAttribute(O.idx, 1)); g.computeBoundingSphere(); OUT = null; return g; }
  const tris = () => (OUT ? OUT.idx.length / 3 : 0);
  return { lathe, tube, ell, box, torus, hand, begin, bone, end, lin, mix, tris, V };
})();
/* the six keepers, after each folder's npc_turnaround: local metres, feet at y 0, front +z. bones: b+0 root (legs, skirt, boots), b+1 chest
   (torso, apron, belt, props on the body), b+2 head (face, hair, beard, hat), b+3 / b+4 left / right arm (sleeve, hand, what it holds) */
Town.folkModel = (() => {
  const S = Town.sculpt, L = S.lin, TAU = Math.PI * 2;
  const C = { white: L(0xf6f2ea), ink: L(0x2a1a10), iris: L(0x4a2e1a), lip: L(0xa0503e), brass: L(0xc89a48), brassDk: L(0x8a6428), iron: L(0x55585e), ironDk: L(0x34363a), leather: L(0x6a4428), leatherDk: L(0x4a2e18), wood: L(0x6e4a2c), rope: L(0xb08a58), crystal: L(0x5fe8d2), paper: L(0xeadfc4), teal: L(0x48c2c4) };
  // a standing body: legs, boots, torso (+belly), skirt/coat, apron, neck; returns the joint positions
  function body(o, B) { const H = o.h, s = H / 1.75, hipY = 0.79 * s, shY = 1.30 * s - (o.stoop || 0) * 0.08, g = o.g, gd = o.gd || g * 0.78, sw = o.sw || g * 1.05, fz = (o.stoop || 0) * 0.12;
    S.bone(B + 0, o.M); // legs + boots
    for (const sx of [-1, 1]) { const x = sx * g * 0.45; S.tube([[x, hipY, 0], [x * 0.95, hipY * 0.55, 0.01], [x * 0.9, 0.14, 0]], [g * 0.36 + 0.02, 0.065 * s + (o.g > 0.25 ? 0.015 : 0), 0.05 * s], o.legs, { seg: 9, sub: 2 });
      S.lathe([[0, 0.068, 0.12, 0.035, x], [0.04, 0.072, 0.125, 0.04, x], [0.085, 0.065, 0.1, 0.025, x], [0.13 * s + 0.05, 0.062, 0.068, 0.005, x], [0.2 * s + 0.07, 0.06, 0.064, 0, x]], o.boots, { seg: 12, cap0: true }); if (o.cuff) S.torus([x, 0.2 * s + 0.06, 0], 0.064, 0.016, o.cuff, [Math.PI / 2, 0, 0]); }
    if (o.skirt) S.lathe([[hipY + 0.08, g * 0.98, gd * 1.02], [hipY - 0.05, g * 1.12, gd * 1.12], [hipY * 0.6, g * 1.24, gd * 1.2], [o.skirt, g * 1.32, gd * 1.26]], o.skirtC, { seg: 22, fold: [0.12, 7, 1.1], cap0: false });
    if (o.coat) S.lathe([[shY - 0.2, g * 1.02, gd * 1.05, fz * 0.5], [hipY + 0.05, g * 1.04, gd * 1.06], [hipY - 0.15, g * 1.16, gd * 1.16], [o.coat, g * 1.28, gd * 1.24]], o.coatC, { seg: 22, a0: 0.42, a1: TAU - 0.42, fold: [0.05, 7, 1.2] });
    if (o.cloak) S.lathe([[shY + 0.02, g * 0.78, gd * 0.82, fz], [shY - 0.12, sw * 1.18, gd * 1.24, fz * 0.8], [hipY, g * 1.3, gd * 1.34], [o.cloak, g * 1.42, gd * 1.42]], o.cloakC, { seg: 22, a0: 0.5, a1: TAU - 0.5, fold: [0.09, 8, 1.1] });
    S.bone(B + 1, o.M); // torso
    const bel = o.belly || 0; S.lathe([[hipY - 0.06, g * 0.98, gd], [hipY + 0.08, g * (0.96 + bel * 0.12), gd * (1 + bel * 0.25), bel * 0.04], [hipY + (shY - hipY) * 0.5, g * (0.93 + bel * 0.23), gd * (0.98 + bel * 0.22), bel * 0.05 + fz * 0.4], [shY - 0.13, sw * (o.bust ? 1.02 : 0.98), gd * (o.bust ? 1.05 : 0.92), fz * 0.8 + (o.bust ? 0.015 : 0)], [shY - 0.02, sw * 0.95, gd * 0.68, fz], [shY + 0.025, sw * 0.45, gd * 0.45, fz], [shY + 0.05, 0.05 * s + 0.01, 0.05 * s + 0.01, fz + 0.005]], o.torsoC, { seg: 16, sub: 2, cap0: true });
    if (o.apron) { const pc = typeof o.apronC === 'function' ? L(0x8a5b37) : S.mix(o.apronC, [0,0,0], 0.16), zp = gd * (1.19 + bel * 0.3) + 0.035;
      for (const sx of [-1,1]) { S.lathe([[hipY - 0.03, 0.08, 0.028, zp, sx * g * 0.5], [hipY - 0.15, 0.075, 0.035, zp, sx * g * 0.5], [hipY - 0.18, 0.05, 0.02, zp, sx * g * 0.5]], pc, { seg: 7, sub: 1, a0: -1.65, a1: 1.65 }); S.tube([[sx*g*.5-.065,hipY-.03,zp+.028],[sx*g*.5,hipY-.04,zp+.032],[sx*g*.5+.065,hipY-.03,zp+.028]],[.004,.004,.004],C.rope,{seg:4,sub:1}); }
    }
    if (o.collar) S.torus([0, shY + 0.02, fz], 0.065 * s + 0.01, 0.018, o.collar, [Math.PI / 2, 0, 0], { t: 12 });
    if (o.belt) S.lathe([[hipY + 0.03, g * (1.0 + bel * 0.1), gd * (1.05 + bel * 0.22), bel * 0.035], [hipY + 0.09, g * (1.0 + bel * 0.12), gd * (1.06 + bel * 0.24), bel * 0.04]], o.belt, { seg: 20, sub: 1 });
    if (o.apron) { const ay0 = o.apronY0 || hipY * 0.5, top = o.apronTop || shY - 0.16; S.lathe([[top, sw * 0.82, gd * (1.08 + bel * 0.2) + 0.025, fz * 0.7 + bel * 0.03], [hipY + 0.05, g * (1.1 + bel * 0.12), gd * (1.1 + bel * 0.28) + 0.025, bel * 0.045], [hipY - 0.1, g * (o.skirt ? 1.18 : 1.05), gd * (o.skirt ? 1.18 : 1.1) + 0.012], [ay0, g * (o.skirt ? 1.42 : 1.12), gd * (o.skirt ? 1.42 : 1.14) + 0.02]], o.apronC, { seg: 14, a0: -1.05, a1: 1.05, fold: [0.05, 5, 0.8, 0.6] });
      for (const sx of [-1, 1]) S.tube([[sx * sw * 0.55, top, gd * 0.98 + fz * 0.7], [sx * sw * 0.62, shY + 0.01, fz * 0.6], [sx * sw * 0.55, shY - 0.05, -gd * 0.8]], [0.012, 0.012, 0.012], o.strap || o.apronC, { seg: 5, flat: 0.35 }); }
    S.tube([[0, shY + 0.02, fz], [0, shY + 0.1 * s, fz + 0.01]], [0.05 * s + 0.004, 0.047 * s], o.skin, { seg: 10 });
    return { s, hipY, shY, g, gd, sw, fz, neck: [0, shY + 0.1 * s, fz + 0.012] }; }
  // an arm from the shoulder via elbow to wrist (local offsets), sleeve to elbow (rolled) or to wrist, hand, curl
  function arm(o, B, J, sx, E, Wr, cfg) { cfg = cfg || {}; S.bone(B + (sx < 0 ? 3 : 4), o.M); const s = J.s, sh = [sx * J.sw * 0.95, J.shY - 0.05, J.fz], el = [sh[0] + E[0] * sx, sh[1] + E[1], sh[2] + E[2]], wr = [el[0] + Wr[0] * sx, el[1] + Wr[1], el[2] + Wr[2]];
    const ru = 0.058 * s + (o.g > 0.25 ? 0.012 : 0), rl = 0.045 * s + (o.g > 0.25 ? 0.008 : 0), roll = cfg.roll != null ? cfg.roll : o.roll;
    S.ell([sh[0] * 0.98, sh[1] + 0.01, sh[2]], [ru * 1.25, ru * 1.1, ru * 1.2], o.sleeve);
    if (roll) { S.tube([sh, el], [ru, ru * 1.05], o.sleeve, { seg: 10 }); S.torus(el, ru * 0.95, 0.02, o.sleeve, null, { t: 10 }); S.tube([el, wr], [rl, rl * 0.72], o.skin, { seg: 10 }); }
    else { S.tube([sh, el, wr], [ru, ru * 0.9, rl * 0.95], o.sleeve, { seg: 10 }); if (o.cuffArm) S.torus(wr, rl * 0.95, 0.014, o.cuffArm, [0, 0, 0], { t: 10 }); }
    const d = [wr[0] - el[0], wr[1] - el[1], wr[2] - el[2]]; S.hand(wr, cfg.dir || d, cfg.pal || [-sx, 0, 0], cfg.glove || o.skin, cfg.curl, { s: (o.handS || 1) * s * 0.95 + 0.05, th: cfg.th });
    return { sh, el, wr }; }
  // the head: a lathed skull and face, eyes / brows / nose / mouth / ears; returns the head centre and size
  function head(o, B, J) { S.bone(B + 2, o.M); const hs = (o.hs || 1) * 1.35, hh = 0.235 * hs, c = [0, J.neck[1] + hh * 0.48, J.neck[2] + 0.012], w = (o.faceW || 1), ch = o.cheek || 1;
    const R = [[-0.5, 0.028, 0.03, 0.055], [-0.42, 0.06 * w, 0.06, 0.035], [-0.28, 0.082 * w * ch, 0.08, 0.016], [-0.08, 0.094 * w * ch, 0.092, 0.006], [0.1, 0.095 * w, 0.096, 0], [0.28, 0.09 * w, 0.094, -0.006], [0.44, 0.068 * w, 0.072, -0.012], [0.53, 0.012, 0.014, -0.014]].map(([y, rx, rz, cz]) => [c[1] + y * hh, rx * hs, rz * hs, c[2] + cz * hs]);
    S.lathe(R, o.skin, { seg: 18, cap0: true, cap1: true, sub: 2 }); const fy = (t) => c[1] + t * hh, fz = (t) => c[2] + 0.094 * hs * (1 - t * t * 0.9) - 0.002;
    const ey = fy(0.08), ex = 0.036 * hs * w, ez = c[2] + 0.084 * hs; for (const sx of [-1, 1]) { S.ell([sx * ex, ey, ez], [0.018 * hs, 0.0135 * hs * (o.eyeH || 1), 0.008 * hs], C.white, { w: 8, h: 6 }); S.ell([sx * ex, ey - 0.001, ez + 0.006 * hs], [0.0095 * hs, 0.011 * hs * (o.eyeH || 1), 0.004 * hs], o.iris || C.iris, { w: 8, h: 5 }); S.ell([sx * ex + 0.003, ey + 0.004, ez + 0.0095 * hs], [0.0028, 0.0028, 0.001], C.white, { w: 4, h: 3 });
      S.tube([[sx * ex - sx * 0.02 * hs, ey + 0.009 * hs, ez + 0.002], [sx * ex, ey + 0.015 * hs * (o.eyeH || 1), ez + 0.006], [sx * ex + sx * 0.02 * hs, ey + 0.008 * hs, ez + 0.001]], [0.0035, 0.004, 0.003], L(o.lid || 0x6a3e28), { seg: 5, sub: 2 }); // lid line
      const bw = o.browW || 1; S.tube([[sx * (ex - 0.022 * hs), ey + 0.03 * hs, ez + 0.004], [sx * ex, ey + 0.037 * hs + (o.browUp || 0), ez + 0.006], [sx * (ex + 0.026 * hs * bw), ey + 0.03 * hs - (o.browDroop || 0), ez - 0.006]], [0.0055 * bw, 0.007 * bw, 0.004 * bw], o.brow, { seg: 5, sub: 2 });
      S.ell([sx * 0.093 * hs * w, fy(0.0), c[2] - 0.004], [0.014 * hs, 0.028 * hs, 0.02 * hs], o.skin, { w: 6, h: 4 }); // ears
      if (o.blush) S.ell([sx * 0.052 * hs * w, fy(-0.14), c[2] + 0.075 * hs], [0.02 * hs, 0.012 * hs, 0.006 * hs], o.blush, { w: 7, h: 4 }); }
    const nl = o.nose || 1; S.ell([0, fy(-0.08), c[2] + 0.094 * hs + 0.006 * nl], [0.016 * hs * nl, 0.024 * hs * nl, 0.017 * hs * nl], S.mix(o.skin, L(0xa05a3a), 0.12), { w: 8, h: 6 }); S.ell([0, fy(-0.17), c[2] + 0.096 * hs + 0.01 * nl], [0.019 * hs * nl, 0.013 * hs, 0.014 * hs], S.mix(o.skin, L(0xa05a3a), 0.15), { w: 8, h: 5 });
    const my = fy(-0.3), mz = c[2] + 0.078 * hs, sm = o.smile == null ? 1 : o.smile; S.tube([[-0.026 * hs, my + 0.006 * sm, mz - 0.006], [-0.012 * hs, my - 0.004 * sm, mz + 0.002], [0.012 * hs, my - 0.004 * sm, mz + 0.002], [0.026 * hs, my + 0.006 * sm, mz - 0.006]], [0.003, 0.0045, 0.0045, 0.003], C.lip, { seg: 5, sub: 2 });
    S.lathe([[c[1] + .105*hs,.092*hs,.093*hs,c[2]-.016], [c[1]+.03*hs,.108*hs,.105*hs,c[2]-.012], [c[1]-.06*hs,.099*hs,.09*hs,c[2]-.025]], o.brow, {seg:12,sub:1,a0:.95,a1:TAU-.95}); // continuous back/scalp shell under the swept locks
    return { c, hh, hs, ey, ex, ez, fy }; }
  const sph = (n, c, R, col, rad, seed, o) => { o = o || {}; n = Math.min(n, 5); let z = seed || 7; const rn = () => (z = (z * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < n; i++) { const a = (o.a0 || 0) + ((o.a1 || TAU) - (o.a0 || 0)) * (i + 0.25) / n, yv = (o.y0 || -0.2) + ((o.y1 || 0.6) - (o.y0 || -0.2)) * rn(), rr = rad * (1.05 + rn() * 0.25), p = [c[0] + Math.sin(a) * R[0] * Math.cos(yv), c[1] + Math.sin(yv) * R[1], c[2] + Math.cos(a) * R[2] * Math.cos(yv)];
      S.tube([[p[0] - Math.sin(a) * rr, p[1] + rr * 0.65, p[2] - rr * 0.25], p, [p[0] + Math.sin(a) * rr * 0.65, p[1] - rr * 0.8, p[2] - rr * 0.45]], [rr * 0.55, rr, rr * 0.08], S.mix(col, [1,1,1], (i % 3) * 0.018), { seg: 5, sub: 1, flat: 0.7 }); } };
  const NPC = {
    goldie(M, B) { const o = { M, h: 1.55, g: 0.255, gd: 0.22, sw: 0.25, belly: 1, bust: 1, skin: L(0xf0b896), legs: L(0x5a3a26), boots: L(0x5e3c22), cuff: L(0x4a2e18), skirt: 0.24, skirtC: L(0x5a3a26), torsoC: L(0x56663e), collar: L(0xe8dcc0), apron: 1, apronC: L(0xb4a07e), strap: L(0x56663e), apronY0: 0.32, sleeve: L(0xe8dcc0), roll: 1, belt: L(0xa8946e), brow: L(0x8a3e1c), blush: L(0xe88a78), cheek: 1.12, faceW: 1.06, iris: L(0x5a3a1a), hs: 1.05 };
      const J = body(o, B); S.bone(B + 1, M); for (const [x, y] of [[-0.1, 0.62], [0.1, 0.6]]) S.box([x, y, J.gd * 1.32 + 0.03], [0.1, 0.1, 0.012], L(0x9c8a68)); S.tube([[0.06, 0.72, J.gd * 1.3 + 0.03], [0.065, 0.5, J.gd * 1.35 + 0.04], [0.07, 0.36, J.gd * 1.3 + 0.03]], [0.008, 0.008, 0.008], C.brass, { seg: 4, flat: 0.3 }); // tape measure
      S.tube([[-0.12, 0.66, J.gd * 1.34 + 0.04], [-0.12, 0.59, J.gd * 1.36 + 0.05]], [0.003, 0.003], C.brassDk, { seg: 4 }); S.torus([-0.12, 0.56, J.gd * 1.36 + 0.05], 0.03, 0.004, C.brass, [Math.PI / 2, 0, 0], { arc: Math.PI, t: 8 }); // little brass scale
      for (let i = 0; i < 3; i++) S.torus([J.sw * 1.06, 0.62 - i * 0.03, 0.05], 0.045, 0.009, C.rope, [Math.PI / 2 - 0.2, 0.3, 0], { t: 8 }); // rope coil at the hip
      arm(o, B, J, -1, [0.03, -0.24, 0.1], [0.06, -0.02, 0.2], { curl: 0.55, pal: [1, 0, 0.2] }); S.bone(B + 3, M); S.box([-0.15, J.shY - 0.32, 0.25], [0.05, 0.27, 0.2], L(0x5a3420), [0.15, 0.25, 0.05]); S.box([-0.122, J.shY - 0.32, 0.25], [0.012, 0.25, 0.185], C.paper, [0.15, 0.25, 0.05]); // ledger
      arm(o, B, J, 1, [0.03, -0.26, 0.04], [-0.04, -0.17, 0.1], { curl: 0.45, pal: [-1, 0, 0.3] });
      const Hd = head(o, B, J), c = Hd.c, hs = Hd.hs; // round specs, curly auburn hair, bun, pencil
      for (const sx of [-1, 1]) S.torus([sx * Hd.ex, Hd.ey, Hd.ez + 0.012], 0.022 * hs, 0.0028, C.brassDk, [0, 0, 0], { t: 14, r: 4 }); S.tube([[-0.014 * hs, Hd.ey + 0.004, Hd.ez + 0.014], [0.014 * hs, Hd.ey + 0.004, Hd.ez + 0.014]], [0.0025, 0.0025], C.brassDk, { seg: 4 });
      const hair = L(0x9a4a22); S.ell([0, c[1] + 0.075 * hs, c[2] - 0.02], [0.102 * hs, 0.065 * hs, 0.098 * hs], hair, { w: 10, h: 6 }); S.ell([0, c[1] - 0.0, c[2] - 0.035], [0.1 * hs, 0.1 * hs, 0.08 * hs], hair, { w: 10, h: 6 }); sph(10, [0, c[1] + 0.02 * hs, c[2] - 0.01], [0.1 * hs, 0.11 * hs, 0.098 * hs], hair, 0.028 * hs, 11, { a0: 0.9, a1: TAU - 0.9, y0: -0.5, y1: 0.9 }); sph(4, [0, c[1] + 0.1 * hs, c[2] + 0.015], [0.085 * hs, 0.04 * hs, 0.065 * hs], hair, 0.024 * hs, 5, { a0: -0.9, a1: 0.9, y0: 0.5, y1: 1.2 });
      sph(6, [0, c[1] + 0.16 * hs, c[2] - 0.03], [0.05 * hs, 0.045 * hs, 0.05 * hs], hair, 0.03 * hs, 3, { y0: -0.6, y1: 1.2 }); S.tube([[0.02, c[1] + 0.16 * hs, c[2] - 0.03], [0.05, c[1] + 0.26 * hs, c[2] - 0.05]], [0.006, 0.004], L(0xd8a848), { seg: 5 }); },
    brannick(M, B) { const o = { M, h: 1.92, g: 0.3, gd: 0.25, sw: 0.33, belly: 0.8, skin: L(0xc98a62), legs: L(0x464a32), boots: L(0x5a3a22), cuff: L(0x6a4428), torsoC: L(0x8a3226), apron: 1, apronC: L(0x6a4428), strap: L(0x4a2e18), apronY0: 0.42, apronTop: 1.25, sleeve: L(0x8a3226), roll: 1, belt: L(0x4a2e18), brow: L(0x5a5450), iris: L(0x3a2a1a), hs: 1.05, faceW: 1.05, nose: 1.3, smile: -0.3, browDroop: 0.006, eyeH: 0.85 };
      const J = body(o, B); S.bone(B + 1, M); S.box([0, J.hipY + 0.06, J.gd * 1.32 + 0.02], [0.07, 0.05, 0.012], C.brass); for (let i = 0; i < 4; i++) S.box([-0.2 + i * 0.05, J.hipY - 0.06, J.gd * 1.3 + 0.03], [0.012, 0.16, 0.01], i % 2 ? C.iron : C.ironDk, [0, 0, 0.15 * (i - 1.5)]); S.box([0.2, J.hipY - 0.12, J.gd * 1.2], [0.11, 0.14, 0.06], C.leatherDk); S.box([-0.27, J.hipY - 0.12, J.gd * 0.9], [0.08, 0.14, 0.1], C.leatherDk);
      arm(o, B, J, -1, [0.02, -0.3, 0.02], [0.02, -0.25, 0.08], { curl: 0.6, glove: L(0x5a3a22), gauntlet: 1, pal: [1, 0, 0] });
      const A = arm(o, B, J, 1, [0.03, -0.3, 0.0], [0.0, -0.24, 0.1], { curl: 0.9, pal: [-1, 0, 0] }); S.bone(B + 4, M); const hp = [A.wr[0] + 0.0, A.wr[1] - 0.06, A.wr[2] + 0.06]; S.tube([[hp[0], hp[1] - 0.25, hp[2] - 0.05], [hp[0], hp[1] + 0.12, hp[2] + 0.015]], [0.022, 0.024], C.wood, { seg: 7 }); S.box([hp[0], hp[1] - 0.3, hp[2] - 0.06], [0.11, 0.24, 0.12], C.iron, [0.15, 0, 0]); // the big hammer, head down by his boot
      const Hd = head(o, B, J), c = Hd.c, hs = Hd.hs; const bc = L(0x8c8a86);
      S.lathe([[Hd.fy(-0.2), 0.09 * hs, 0.08 * hs, c[2] + 0.02], [Hd.fy(-0.42), 0.095 * hs, 0.09 * hs, c[2] + 0.04], [Hd.fy(-0.7), 0.075 * hs, 0.07 * hs, c[2] + 0.06], [Hd.fy(-0.95), 0.04 * hs, 0.04 * hs, c[2] + 0.07]], bc, { seg: 14, a0: -1.6, a1: 1.6, fold: [0.12, 11, 0.5], cap1: true }); S.tube([[-0.04, Hd.fy(-0.27), c[2] + 0.1 * hs], [0, Hd.fy(-0.24), c[2] + 0.104 * hs], [0.04, Hd.fy(-0.27), c[2] + 0.1 * hs]], [0.012, 0.015, 0.012], bc, { seg: 6 }); // beard + moustache
      for (const sx of [-1, 1]) { for (let i = 0; i < 5; i++) S.ell([sx * 0.04, Hd.fy(-0.95) - i * 0.045, c[2] + 0.075 - i * 0.004], [0.02, 0.028, 0.02], S.mix(bc, [0, 0, 0], (i % 2) * 0.1), { w: 6, h: 5 }); S.torus([sx * 0.04, Hd.fy(-0.95) - 0.24, c[2] + 0.055], 0.018, 0.006, C.brass, [Math.PI / 2, 0, 0], { t: 10 }); S.ell([sx * 0.09 * hs, c[1] + 0.0, c[2] - 0.03], [0.02, 0.05, 0.04], bc, { w: 6, h: 5 }); }
      S.torus([0, c[1] + 0.07 * hs, c[2] - 0.004], 0.1 * hs, 0.011, C.leatherDk, [Math.PI / 2 + 0.25, 0, 0], { t: 18 }); for (const sx of [-1, 1]) { S.torus([sx * 0.038, c[1] + 0.1 * hs, c[2] + 0.085 * hs], 0.024, 0.008, C.brass, [-0.25, 0, 0], { t: 12 }); S.ell([sx * 0.038, c[1] + 0.1 * hs, c[2] + 0.088 * hs], [0.02, 0.02, 0.006], L(0x6a8a8a), { w: 7, h: 5 }); } },
    tess(M, B) { const o = { M, h: 1.75, g: 0.17, gd: 0.14, sw: 0.19, skin: L(0xd9a27a), legs: L(0x6e4a2e), boots: L(0x7a5434), cuff: L(0x5a3a22), torsoC: L(0xa08460), skirt: 0.6, skirtC: L(0xa08460), sleeve: L(0xd9a27a), roll: 0, belt: L(0x5a3a22), brow: L(0x4a2a16), iris: L(0x4a3018), hs: 0.98, blush: L(0xd88a6a), faceW: 0.95 };
      const J = body(o, B); S.bone(B + 1, M); for (let i = 0; i < 10; i++) { const t = i / 9; S.ell([-J.sw * 0.9 + t * J.sw * 1.8, J.shY - 0.02 - t * 0.48, J.gd * 1.05 + Math.sin(t * Math.PI) * 0.03], [0.022, 0.022, 0.022], C.rope, { w: 6, h: 4 }); } // rope across the body
      for (let i = 0; i < 4; i++) S.torus([J.sw * 1.05, J.hipY - 0.08 - i * 0.02, 0.03], 0.08 - i * 0.004, 0.011, C.rope, [Math.PI / 2 - 0.3, 0.2, 0.2], { t: 10 }); S.lathe([[J.hipY - 0.02, 0.05, 0.05, 0.06, -J.sw * 1.1], [J.hipY - 0.13, 0.05, 0.05, 0.06, -J.sw * 1.1]], C.teal, { seg: 12, sub: 1, cap0: true, cap1: true }); for (const y of [J.hipY - 0.02, J.hipY - 0.13]) S.torus([-J.sw * 1.1, y, 0.06], 0.058, 0.01, C.wood, [Math.PI / 2, 0, 0], { t: 12 });
      arm(o, B, J, -1, [0.04, -0.28, 0.02], [0.02, -0.25, 0.04], { curl: 0.35, pal: [1, 0, 0] }); arm(o, B, J, 1, [0.03, -0.28, 0.0], [0.01, -0.25, 0.05], { curl: 0.35, pal: [-1, 0, 0] }); S.bone(B + 3, M); for (const sx of [-1, 1]) { S.bone(B + (sx < 0 ? 3 : 4), M); S.lathe([[J.shY - 0.6, 0.045, 0.045, 0.04, sx * (J.sw + 0.03)], [J.shY - 0.48, 0.048, 0.048, 0.03, sx * (J.sw + 0.02)]], L(0xd8c8a8), { seg: 10, sub: 1 }); }
      const Hd = head(o, B, J), c = Hd.c, hs = Hd.hs, hair = L(0x5a321a); S.ell([0, c[1] + 0.075 * hs, c[2] - 0.02], [0.103 * hs, 0.065 * hs, 0.098 * hs], hair, { w: 10, h: 6 }); S.ell([0, c[1] - 0.01, c[2] - 0.035], [0.1 * hs, 0.11 * hs, 0.08 * hs], hair, { w: 10, h: 6 }); sph(11, [0, c[1] - 0.02, c[2] - 0.01], [0.1 * hs, 0.12 * hs, 0.09 * hs], hair, 0.026 * hs, 21, { a0: 1.2, a1: TAU - 1.2, y0: -0.9, y1: 0.3 });
      for (const phase of [0, Math.PI]) { const pts = [], rs = []; for (let i = 0; i <= 12; i++) { const t = i / 12, aa = t * Math.PI * 7 + phase; pts.push([Math.sin(aa) * 0.019, c[1] - 0.045 - t * 0.49, c[2] - 0.13 * hs + Math.cos(aa) * 0.015]); rs.push(0.02 * (1 - t * 0.65)); } S.tube(pts, rs, hair, { seg: 5, sub: 1 }); } S.torus([0, c[1] + 0.06 * hs, c[2] - 0.005], 0.104 * hs, 0.018, L(0x5a7038), [Math.PI / 2 - 0.15, 0, 0], { t: 18 }); S.ell([0.05, c[1] + 0.08 * hs, c[2] - 0.1 * hs], [0.03, 0.02, 0.02], L(0x5a7038), { w: 6, h: 4 }); },
    ambrose(M, B) { const o = { M, h: 1.9, g: 0.18, gd: 0.15, sw: 0.21, stoop: 0.5, skin: L(0xeab896), legs: L(0x4e3424), boots: L(0x3a2416), torsoC: L(0xb08a3a), coat: 0.62, coatC: L(0x234a50), collar: L(0xf0ece0), sleeve: L(0x234a50), cuffArm: L(0xb08a3a), roll: 0, brow: L(0xe4e0da), iris: L(0x5a6a6a), hs: 0.98, faceW: 0.9, nose: 1.45, browUp: 0.004 };
      const J = body(o, B); S.bone(B + 1, M); for (const sx of [-1, 1]) S.lathe([[J.shY - 0.02, 0.06, 0.05, J.gd * 0.6, sx * J.sw * 0.4], [J.shY - 0.32, 0.05, 0.03, J.gd * 1.05, sx * J.sw * 0.62]], L(0x234a50), { seg: 8, a0: sx < 0 ? -0.3 : -1.2, a1: sx < 0 ? 1.2 : 0.3 }); // lapels
      for (let i = 0; i < 4; i++) S.ell([0, J.shY - 0.2 - i * 0.07, J.gd * 1.02 + J.fz * 0.6], [0.008, 0.008, 0.005], C.brassDk, { w: 5, h: 4 }); S.tube([[0, J.shY + 0.02, J.gd * 0.6 + J.fz], [0, J.shY - 0.08, J.gd * 0.95 + J.fz]], [0.016, 0.012], L(0x5a3a20), { seg: 5 }); // buttons, tie
      for (let i = 0; i < 4; i++) { S.torus([-J.g * 0.6 - i * 0.012, J.hipY - 0.1 - i * 0.02, J.gd * 1.1], 0.03, 0.005, C.ironDk, [0.2 * i, 1.3, 0], { t: 10 }); S.box([-J.g * 0.6 - i * 0.012, J.hipY - 0.18 - i * 0.03, J.gd * 1.12], [0.008, 0.09, 0.012], C.iron); }
      const A = arm(o, B, J, -1, [0.03, -0.27, 0.07], [0.0, -0.02, 0.24], { curl: 0.2, pal: [0, 1, 0], th: 1 }); S.bone(B + 3, M); S.lathe([[A.wr[1] + 0.035, 0.1, 0.1, A.wr[2] + 0.1, A.wr[0] + 0.02], [A.wr[1] + 0.06, 0.13, 0.13, A.wr[2] + 0.1, A.wr[0] + 0.02]], C.wood, { seg: 16, sub: 1, cap0: true }); for (let i = 0; i < 9; i++) S.ell([A.wr[0] + 0.02 + Math.sin(i * 2.4) * 0.07, A.wr[1] + 0.07 + (i % 3) * 0.01, A.wr[2] + 0.1 + Math.cos(i * 2.4) * 0.07], [0.022, 0.008, 0.022], C.brass, { w: 7, h: 4 });
      arm(o, B, J, 1, [0.02, -0.3, 0.0], [0.0, -0.25, 0.06], { curl: 0.3, pal: [-1, 0, 0] });
      const Hd = head(o, B, J), c = Hd.c, hs = Hd.hs, wh = L(0xe8e4de); for (const sx of [-1, 1]) { S.torus([sx * Hd.ex, Hd.ey, Hd.ez + 0.014], 0.02 * hs, 0.0026, C.brassDk, [0, 0, 0], { t: 14, r: 4 }); S.ell([sx * 0.085 * hs, Hd.fy(-0.25), c[2] + 0.03], [0.032, 0.07, 0.045], wh, { w: 8, h: 6 }); sph(5, [sx * 0.085 * hs, c[1] + 0.06, c[2] - 0.03], [0.02, 0.03, 0.03], wh, 0.02, 31 + sx, {}); }
      S.tube([[-0.013, Hd.ey + 0.004, Hd.ez + 0.016], [0.013, Hd.ey + 0.004, Hd.ez + 0.016]], [0.0025, 0.0025], C.brassDk, { seg: 4 }); sph(4, [0, c[1] + 0.13 * hs, c[2] - 0.02], [0.02, 0.01, 0.02], wh, 0.015, 9, {}); },
    hattie(M, B) { const o = { M, h: 1.62, g: 0.26, gd: 0.23, sw: 0.27, belly: 1, bust: 1, skin: L(0xd9a282), legs: L(0x56663e), boots: L(0x5e3c22), cuff: L(0x4a2e18), skirt: 0.26, skirtC: L(0x56663e), torsoC: L(0x56663e), collar: L(0xe4d4b4), apron: 1, apronY0: 0.3, sleeve: L(0xe4d4b4), roll: 1, brow: L(0x26201e), blush: L(0xd88070), cheek: 1.1, faceW: 1.04, hs: 1.04, iris: L(0x3a2418) };
      o.apronC = (u, v) => (Math.floor(v * 14) % 2 ? L(0xa84e36) : L(0xd8b894)); const J = body(o, B); S.bone(B + 1, M); S.box([0.06, 0.6, J.gd * 1.34 + 0.03], [0.13, 0.12, 0.014], L(0x7a4a2c)); for (let i = 0; i < 3; i++) S.torus([0.03 + i * 0.03, 0.66, J.gd * 1.36 + 0.04], 0.012, 0.003, C.brassDk, [0, 0, 0], { t: 8 });
      S.lathe([[J.shY + 0.03, 0.05, 0.03, J.gd * 0.1, J.sw * 0.55], [J.shY - 0.25, 0.065, 0.025, J.gd * 0.9, J.sw * 0.75]], (u, v) => (Math.floor(v * 8 + u * 6) % 2 ? L(0xa84e36) : L(0xe4d0a8)), { seg: 10, sub: 2 }); // towel on the shoulder
      const A = arm(o, B, J, -1, [0.04, -0.22, 0.1], [0.08, 0.02, 0.2], { curl: 0.15, pal: [0, 1, 0], th: 1 }); arm(o, B, J, 1, [0.04, -0.22, 0.1], [0.08, 0.02, 0.2], { curl: 0.15, pal: [0, 1, 0], th: 1 });
      S.bone(B + 1, M); const ty = A.wr[1] + 0.035, tz = A.wr[2] + 0.04; S.lathe([[ty, 0.3, 0.17, tz], [ty + 0.025, 0.31, 0.18, tz]], C.wood, { seg: 14, sub: 1, cap0: true, cap1: true }); for (let i = -1; i <= 1; i++) { S.lathe([[ty + 0.025, 0.055, 0.055, tz, i * 0.17], [ty + 0.15, 0.058, 0.058, tz, i * 0.17]], C.wood, { seg: 9, sub: 1, cap0: true }); for (const y of [ty + 0.05, ty + 0.13]) S.torus([i * 0.17, y, tz], 0.059, 0.006, C.ironDk, [Math.PI / 2, 0, 0], { t: 8 }); sph(3, [i * 0.17, ty + 0.16, tz], [0.035, 0.01, 0.035], C.white, 0.025, 40 + i, { y0: 0, y1: 0.8 }); S.torus([i * 0.17 + 0.065, ty + 0.09, tz], 0.03, 0.009, C.wood, [0, 0, 0], { t: 7, arc: Math.PI * 1.2 }); }
      const Hd = head(o, B, J), c = Hd.c, hs = Hd.hs, hair = L(0x26201e); S.ell([0, c[1] + 0.08 * hs, c[2] - 0.018], [0.105 * hs, 0.068 * hs, 0.1 * hs], hair, { w: 10, h: 6 }); S.ell([0, c[1] + 0.0, c[2] - 0.04], [0.1 * hs, 0.09 * hs, 0.075 * hs], hair, { w: 10, h: 6 }); sph(8, [0, c[1] + 0.05, c[2] - 0.02], [0.1 * hs, 0.09 * hs, 0.09 * hs], hair, 0.03 * hs, 51, { a0: 0.5, a1: TAU - 0.5, y0: 0.1, y1: 1.2 }); sph(4, [0.035, c[1] + 0.1, c[2] + 0.04], [0.04, 0.02, 0.04], L(0xa8a49e), 0.026, 53, { a0: -0.5, a1: 0.6, y0: 0.6, y1: 1.1 }); for (const sx of [-1, 1]) S.torus([sx * 0.095 * hs, Hd.fy(-0.2), c[2]], 0.012, 0.0028, C.brass, [0, Math.PI / 2, 0], { t: 10 }); },
    fennick(M, B) { const o = { M, h: 1.22, g: 0.2, gd: 0.18, sw: 0.21, stoop: 1.0, skin: L(0x8a5a3a), legs: L(0x6a5030), boots: L(0x7a5434), skirt: 0.2, skirtC: L(0xb09a72), torsoC: L(0xb09a72), cloak: 0.24, cloakC: L(0x56603a), sleeve: L(0x56603a), roll: 0, belt: L(0x8a6438), brow: L(0xf0ece4), browW: 1.9, browDroop: 0.01, iris: L(0x2a1a10), hs: 1.12, faceW: 1.02, nose: 1.35, eyeH: 0.8 };
      const J = body(o, B); S.bone(B + 1, M); S.lathe([[J.shY - 0.03, 0.15, 0.13, -0.04], [J.shY + 0.08, 0.14, 0.12, -0.08], [J.shY + 0.14, 0.06, 0.05, -0.1]], o.cloakC, { seg: 12, a0: 1.7, a1: TAU - 1.7, cap1: true }); // the hood down his back
      for (let i = 0; i < 3; i++) S.lathe([[J.hipY - 0.1, 0.022, 0.022, J.gd * 1.2, 0.04 + i * 0.03], [J.hipY + 0.06 + i * 0.01, 0.022, 0.022, J.gd * 1.22, 0.04 + i * 0.03]], C.paper, { seg: 8, sub: 1, cap1: true }); S.box([-0.08, J.hipY - 0.08, J.gd * 1.25], [0.1, 0.12, 0.05], C.leather);
      S.tube([[0, J.shY + 0.02, J.gd * 0.9 + J.fz], [0, J.shY - 0.18, J.gd * 1.15 + J.fz]], [0.004, 0.004], C.leatherDk, { seg: 4 }); S.lathe([[J.shY - 0.18, 0.012, 0.012, J.gd * 1.18 + J.fz], [J.shY - 0.27, 0.03, 0.03, J.gd * 1.2 + J.fz]], C.brass, { seg: 10, sub: 1, cap0: true }); // the bell
      arm(o, B, J, -1, [0.03, -0.2, 0.06], [0.0, -0.14, 0.08], { curl: 0.5, pal: [1, 0, 0] }); const A = arm(o, B, J, 1, [0.06, -0.18, 0.1], [0.04, -0.02, 0.12], { curl: 0.95, pal: [-1, 0, 0] }); S.bone(B + 4, M); const sx0 = A.wr[0] + 0.02, sz0 = A.wr[2] + 0.05;
      S.tube([[sx0, 0.0, sz0], [sx0 + 0.01, 0.6, sz0 - 0.01], [sx0, 1.2, sz0], [sx0 + 0.01, 1.48, sz0]], [0.022, 0.024, 0.026, 0.03], C.wood, { seg: 7 }); for (let i = 0; i < 3; i++) S.torus([sx0, 1.3 + i * 0.04, sz0], 0.03, 0.006, C.rope, [Math.PI / 2, 0, 0], { t: 10 }); S.ell([sx0, 1.58, sz0], [0.045, 0.085, 0.045], C.crystal, { w: 6, h: 4 });
      const Hd = head(o, B, J), c = Hd.c, hs = Hd.hs, wh = L(0xece8e0); S.lathe([[Hd.fy(-0.15), 0.092 * hs, 0.08 * hs, c[2] + 0.025], [Hd.fy(-0.5), 0.09 * hs, 0.085 * hs, c[2] + 0.045], [Hd.fy(-1.1), 0.07 * hs, 0.06 * hs, c[2] + 0.07], [Hd.fy(-1.7), 0.02 * hs, 0.02 * hs, c[2] + 0.08]], wh, { seg: 14, a0: -1.7, a1: 1.7, fold: [0.14, 13, 0.4], cap1: true }); S.tube([[-0.05, Hd.fy(-0.26), c[2] + 0.1 * hs], [0, Hd.fy(-0.22), c[2] + 0.108 * hs], [0.05, Hd.fy(-0.26), c[2] + 0.1 * hs]], [0.014, 0.017, 0.014], wh, { seg: 6 });
      for (const sx of [-1, 1]) sph(4, [sx * 0.09 * hs, c[1] - 0.02, c[2] - 0.02], [0.02, 0.03, 0.03], wh, 0.022, 61 + sx, {}); const cap = L(0x8a6438); S.lathe([[c[1] + 0.06 * hs, 0.104 * hs, 0.106 * hs, c[2] - 0.01], [c[1] + 0.14 * hs, 0.1 * hs, 0.102 * hs, c[2] - 0.012], [c[1] + 0.2 * hs, 0.06 * hs, 0.062 * hs, c[2] - 0.014], [c[1] + 0.225 * hs, 0.01, 0.01, c[2] - 0.014]], (u) => (Math.floor(u * 9) % 2 ? cap : S.mix(cap, [0, 0, 0], 0.2)), { seg: 18, cap1: true }); S.torus([0, c[1] + 0.065 * hs, c[2] - 0.01], 0.105 * hs, 0.012, S.mix(cap, [0, 0, 0], 0.15), [Math.PI / 2, 0, 0], { t: 18 }); },
  };
  // joint pivots (local metres) for the bones, per keeper: chest pivot at the hips, head pivot at the neck, arms at the shoulders
  function joints(id) { const h = { goldie: 1.55, brannick: 1.92, tess: 1.75, ambrose: 1.9, hattie: 1.62, fennick: 1.22 }[id], s = h / 1.75, sw = { goldie: 0.25, brannick: 0.33, tess: 0.19, ambrose: 0.21, hattie: 0.27, fennick: 0.21 }[id], st = { ambrose: 0.5, fennick: 1.0 }[id] || 0, hipY = 0.79 * s, shY = 1.30 * s - st * 0.08;
    return { hip: [0, hipY, 0], neck: [0, shY + 0.1 * s, st * 0.12], shL: [-sw * 0.95, shY - 0.05, st * 0.12], shR: [sw * 0.95, shY - 0.05, st * 0.12] }; }
  return { NPC, joints, C };
})();

// Bone/material-aware spatial edge clustering: actual indexed LOD topology, never deleted random triangles.
Town.folkReduce = (src, budgets) => {
  const P=src.attributes.position,N=src.attributes.normal,C=src.attributes.color,SI=src.attributes.skinIndex,SW=src.attributes.skinWeight,I=src.index.array, all={p:[],n:[],c:[],si:[],sw:[],idx:[]}, counts=[];
  for(let owner=0;owner<budgets.length;owner++) { const ts=[]; for(let k=0;k<I.length;k+=3) if(Math.floor(SI.getX(I[k])/5)===owner) ts.push(I[k],I[k+1],I[k+2]);
    const make=(cell)=> {const map=new Map(),vs=[],ix=[],seen=new Map(), remap=new Map();
      for(const v of ts) {if(remap.has(v))continue; const key=[Math.floor(P.getX(v)/cell),Math.floor(P.getY(v)/cell),Math.floor(P.getZ(v)/cell),SI.getX(v),Math.round(C.getX(v)*12),Math.round(C.getY(v)*12),Math.round(C.getZ(v)*12)].join('/'); let j=map.get(key); if(j==null){j=vs.length;map.set(key,j);vs.push({p:[0,0,0],n:[0,0,0],c:[0,0,0],v,num:0});} const a=vs[j];a.num++;for(let q=0;q<3;q++){a.p[q]+=P.array[v*3+q];a.n[q]+=N.array[v*3+q];a.c[q]+=C.array[v*3+q];}remap.set(v,j);}
      for(let k=0;k<ts.length;k+=3){const a=remap.get(ts[k]),b=remap.get(ts[k+1]),c=remap.get(ts[k+2]);if(a===b||b===c||c===a)continue;const key=[a,b,c].sort((a,b)=>a-b).join('/');if(seen.has(key))continue;seen.set(key,1);ix.push(a,b,c);}return {vs,ix};};
    let lo=.00001,hi=Town.WS*.22,r=make(lo);if(r.ix.length/3>budgets[owner]){for(let j=0;j<14;j++){const mid=(lo+hi)*.5,q=make(mid);if(q.ix.length/3>budgets[owner])lo=mid;else{hi=mid;r=q;}}r=make(hi);}
    const base=all.p.length/3;for(const a of r.vs){for(let q=0;q<3;q++){all.p.push(a.p[q]/a.num);all.n.push(a.n[q]/a.num);all.c.push(a.c[q]/a.num);}for(let q=0;q<4;q++){all.si.push(SI.array[a.v*4+q]);all.sw.push(SW.array[a.v*4+q]);}}for(const v of r.ix)all.idx.push(base+v);counts.push(r.ix.length/3);
  }
  const g=new THREE.BufferGeometry();for(const [key,arr,size] of [['position',all.p,3],['normal',all.n,3],['color',all.c,3],['skinWeight',all.sw,4]])g.setAttribute(key,new THREE.Float32BufferAttribute(arr,size));g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(all.si,4));g.setIndex(all.idx);g.normalizeNormals();g.computeBoundingSphere();g.userData.tris=counts;return g;
};
// One 1024 atlas: 4096 painted palette patches with subtle fibre/value variation. Linear vertex colours -> sRGB diffuse texture.
Town.folkAtlas = (geos) => {const cv=document.createElement('canvas');cv.width=cv.height=1024;const ctx=cv.getContext('2d'),im=ctx.createImageData(1024,1024);
  for(let i=0;i<4096;i++){const r=(i>>8)&15,g=(i>>4)&15,b=i&15,x=(i%64)*16,y=Math.floor(i/64)*16;for(let yy=0;yy<16;yy++)for(let xx=0;xx<16;xx++){const k=((y+yy)*1024+x+xx)*4,v=1+Math.sin(xx*17+yy*33+i)*.015;im.data[k]=Math.pow(r/15,1/2.2)*255*v;im.data[k+1]=Math.pow(g/15,1/2.2)*255*v;im.data[k+2]=Math.pow(b/15,1/2.2)*255*v;im.data[k+3]=255;}}ctx.putImageData(im,0,0);
  for(const geo of geos){const counts=geo.userData.tris;const expanded=geo.toNonIndexed();geo.copy(expanded);geo.userData.tris=counts;expanded.dispose();const c=geo.attributes.color,uv=[];for(let i=0;i<c.count;i+=3){let r=0,g=0,b=0;for(let j=0;j<3;j++){r+=c.getX(i+j);g+=c.getY(i+j);b+=c.getZ(i+j);}r=Math.min(15,Math.round(r*5));g=Math.min(15,Math.round(g*5));b=Math.min(15,Math.round(b*5));const n=r*256+g*16+b;for(let j=0;j<3;j++)uv.push(((n%64)*16+8)/1024,1-(Math.floor(n/64)*16+8)/1024);}geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2)); const indices=Array.from({length:c.count},(_,i)=>i);geo.setIndex(indices);}

  const tx=new THREE.CanvasTexture(cv);tx.encoding=THREE.sRGBEncoding;tx.name='townFolk_paintedAtlas1024';return tx;
};
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
  function build() { if (ST.built || !TW.ST || !TW.ST.built || !TW.ST.g) return; ST.built = true; const S = Town.sculpt, FM = Town.folkModel, bones = []; S.begin();
    for (const B of TW.BLD) { const sp = TW.npcSpot(B), id = B.npc, o = P[id]; if (!o || !FM.NPC[id]) continue; const q = ST.list.length, M = new THREE.Matrix4().compose(new THREE.Vector3(sp.at[0], sp.h, sp.at[1]), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), sp.yaw), new THREE.Vector3(WS, WS, WS)), t0 = S.tris();
      FM.NPC[id](M, q * 5); const J = FM.joints(id), bn = [0, 1, 2, 3, 4].map(() => new THREE.Bone()); bn[0].position.set(sp.at[0], sp.h, sp.at[1]); bn[0].rotation.y = sp.yaw; bn[0].scale.setScalar(WS);
      bn[1].position.set(...J.hip); bn[0].add(bn[1]); bn[2].position.set(J.neck[0] - J.hip[0], J.neck[1] - J.hip[1], J.neck[2] - J.hip[2]); bn[1].add(bn[2]); bn[3].position.set(J.shL[0], J.shL[1] - J.hip[1], J.shL[2]); bn[4].position.set(J.shR[0], J.shR[1] - J.hip[1], J.shR[2]); bn[1].add(bn[3], bn[4]);
      bones.push(...bn); ST.list.push({ id, B, o, sp, bones: bn, yaw: sp.yaw, look: 0, ph: B.px * 0.013, x: sp.at[0], y: sp.at[1], h: sp.h, hgt: o.h * WS, tris: S.tris() - t0 }); }
    const raw = S.end(), targets=ST.list.map(n=>({goldie:4500,brannick:5100,tess:4000,hattie:4500,fennick:4500}[n.id]));
    const geo = Town.folkReduce(raw,targets), lod1=Town.folkReduce(geo,targets.map(n=>Math.floor(n*.5))), lod2=Town.folkReduce(geo,targets.map(n=>Math.floor(n*.2))); raw.dispose(); ST.lods=[geo,lod1,lod2]; for(let i=0;i<ST.list.length;i++) {ST.list[i].tris=geo.userData.tris[i]; ST.list[i].lodTris=ST.lods.map(g=>g.userData.tris[i]);}
    const atlas=Town.folkAtlas(ST.lods); ST.atlas=atlas; const grad = (() => { const c = document.createElement('canvas'); c.width = 6; c.height = 1; const g = c.getContext('2d'); ['#5e5650', '#7d746c', '#a99f95', '#d7cdc2', '#f3ece4', '#ffffff'].forEach((col, i) => { g.fillStyle = col; g.fillRect(i, 0, 1, 1); }); const t = new THREE.CanvasTexture(c); t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; })();
    const mat = new THREE.MeshLambertMaterial({ map:atlas }); mat.name = 'town_folk'; const ink = new THREE.MeshBasicMaterial({ color: 0x2a1a10, side: THREE.BackSide }); ink.name = 'town_folkInk'; ink.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <skinning_vertex>', '#include <skinning_vertex>\n\ttransformed += normalize(objectNormal) * ' + (0.007 * WS).toFixed(4) + ';'); };
    const m = new THREE.SkinnedMesh(geo, mat); m.name = 'townFolk'; m.castShadow = true; m.frustumCulled = false; for (let q = 0; q < ST.list.length; q++) m.add(ST.list[q].bones[0]); TW.ST.g.add(m); m.updateMatrixWorld(true); const sk = new THREE.Skeleton(bones); m.bind(sk, m.matrixWorld);
    const ol = new THREE.SkinnedMesh(geo, ink); ol.name = 'townFolkInk'; ol.frustumCulled = false; TW.ST.g.add(ol); ol.updateMatrixWorld(true); ol.bind(sk, ol.matrixWorld); ST.mesh = m; ST.ink = ol; ST.tris = geo.index.count / 3; }
  // idle: breathing, a slow weight shift and a little nod; they turn to face her when she is close, back to the street when she leaves
  let t0 = 0;
  // a keeper under the finger wins over the pet mole (its tap wrapper sits on Explore.tap): keep ours outermost
  function wrapTap() { if (typeof Explore === 'undefined' || !Explore.tap || Explore.tap.__town) return; const t0 = Explore.tap, f = function (sx, sy, ...r) { if (Explore.EX && Explore.EX.on && ST.built && hitAt(sx, sy)) return tap(sx, sy); return t0.call(this, sx, sy, ...r); }; f.__town = true; Explore.tap = f; }
  function tick() { wrapTap(); if (!ST.built) { build(); if (!ST.built) return; } const t = performance.now() / 1000, cam = M3.camera, far = cam && Math.hypot(cam.position.x - TW.T.cx, cam.position.z - TW.T.cy) > 2600, hr = typeof Explore !== 'undefined' && Explore.EX && Explore.EX.on ? Explore.here() : null; const dt = Math.min(0.1, t - (t0 || t)); t0 = t;
    if (ST.mesh) ST.mesh.visible = ST.ink.visible = !far; if (far) return;
    if (cam && ST.lods) { let d=Infinity; for(const n of ST.list)d=Math.min(d,Math.hypot(cam.position.x-n.x,cam.position.y-n.h,cam.position.z-n.y)/WS);const level=d>30?2:d>15?1:0;ST.lod=level;ST.mesh.geometry=ST.ink.geometry=ST.lods[level]; }
    for (const n of ST.list) { const tk = ST.talk === n, br = Math.sin(t * (tk ? 3.2 : 2.0) + n.ph), [R0, CH, HD, AL, AR] = n.bones;
      let want = n.sp.yaw; if (hr) { const dx = hr[0] - n.x, dy = hr[1] - n.y; if (Math.hypot(dx, dy) < WS * 7) want = Math.atan2(dx, dy); }
      let d = want - n.sp.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); const bodyT = n.sp.yaw + d * 0.55, headT = Math.max(-0.7, Math.min(0.7, d * 0.45)); // the body turns part way, the head the rest
      let e = bodyT - n.yaw; e = Math.atan2(Math.sin(e), Math.cos(e)); n.yaw += e * Math.min(1, dt * 3); n.look += (headT - n.look) * Math.min(1, dt * 4); R0.rotation.y = n.yaw;
      CH.rotation.set(Math.sin(t * 0.7 + n.ph) * 0.012 + (tk ? Math.max(0, br) * 0.02 : 0), Math.sin(t * 0.35 + n.ph) * 0.03, Math.sin(t * 0.45 + n.ph) * 0.02); CH.scale.set(1 - br * 0.004, 1 + br * 0.01, 1 + br * 0.008);
      HD.rotation.set(Math.sin(t * 0.9 + n.ph * 2) * 0.03 + (tk ? Math.sin(t * 5.1) * 0.04 : 0), n.look + Math.sin(t * 0.27 + n.ph) * 0.12, Math.sin(t * 0.6 + n.ph) * 0.025);
      AL.rotation.set(Math.sin(t * 1.0 + n.ph) * 0.03, 0, -br * 0.02); AR.rotation.set(Math.sin(t * 1.0 + n.ph + 1.3) * 0.03, 0, br * 0.02); }
    if (ST.talk && hr && Math.hypot(hr[0] - ST.talk.x, hr[1] - ST.talk.y) > WS * 6 && !ST.walking) close(); }
  // tap: the figure's base-to-top segment on screen
  function hitAt(sx, sy) { let best = null, bd = 1e9; for (const n of ST.list) { if (!ST.mesh || !ST.mesh.visible) continue; const a = M3.project(n.x, n.y, 0), b = M3.project(n.x, n.y, n.hgt); if (a[0] < -999 || b[0] < -999) continue; const vx = b[0] - a[0], vy = b[1] - a[1], l2 = vx * vx + vy * vy || 1, u = Math.max(0, Math.min(1, ((sx - a[0]) * vx + (sy - a[1]) * vy) / l2)), dd = Math.hypot(a[0] + vx * u - sx, a[1] + vy * u - sy), rad = Math.max(22, Math.sqrt(l2) * 0.4); if (dd < rad && dd - rad < bd) { bd = dd - rad; best = n; } } return best; }
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
  function talk(n) { ST.talk = n; ST.page = 0; for (const ex of ['talk', 'neutral', 'pleased']) new Image().src = `assets/ui/npc/${n.id}_${ex}.webp`; const d = el(); d.querySelector('.tdPort').style.backgroundImage = `url(assets/ui/npc/${n.id}.webp)`; d.querySelector('.tdName').innerHTML = `${n.o.name}<small>${n.o.role}</small>`; d.classList.remove('hidden'); show(); }
  // Art's porthole expressions (talk / neutral / pleased): talking while a line lands, then settle; '!' lines end pleased
  function face(n, ex) { const p = ST.dlg.querySelector('.tdPort'); p.style.backgroundImage = `url(assets/ui/npc/${n.id}_${ex}.webp)`; p.dataset.face = ex; }
  function show() { const d = ST.dlg, n = ST.talk, last = ST.page >= n.o.say.length - 1; d.querySelector('.tdWell p').textContent = n.o.say[ST.page]; face(n, 'talk'); clearTimeout(ST.faceT); ST.faceT = setTimeout(() => ST.talk === n && face(n, /!/.test(n.o.say[ST.page]) ? 'pleased' : 'neutral'), 1400); d.querySelector('.tdPip').style.display = last ? 'none' : '';
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

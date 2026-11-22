/* =====================================================================
   THE TETHER MILL (Dominic t438u named it; Art's handoff, filed as: stations/roller_mill - roller_mill_mechanics_diagram.png is the source of truth, open_v5 blockouts for geometry):
   an open-air, water-powered mill on a natural ledge where the grey-highland stream bends above its lake (NW of the Tin Mine). The stream steps down
   to a ledge lip and pours onto the top paddles of a 12 m overshot wheel just past top dead centre (clockwise from the front). A big lumenite pit gear
   on the wheel axle (behind stand 1) meshes a lumenite pinion that drives the line shaft through a brass bevel; the shaft runs behind and above four
   stone roll stands. At each stand a brass bevel turns a sprocket, a chain drops the drive to the top roll, and a meshing pinion pair turns the stacked
   grooved stone rolls (top CCW, bottom CW from the front). The shaft runs on to a bevel and chain that wind the spool (CW) through a slip clutch.
   Cold-rolled metal (no glow, coloured by the ingot: Craft.BIT_T) shows only between the stands, thinner after each one, and leaves stand 4 as
   rope-coloured braid with a teal thread. Every speed comes from one chain of ratios (wheel -> pit gear 40 : pinion 11 -> shaft -> per-stand sprockets
   sized so each stand runs faster as the bar thins), so the gears, chains, rolls, bar and braid all read as one machine.
   Scope: structure, water, terrain, animation and a look-at prompt. It does not craft anything yet (anvil tether recipes are unchanged).
   Local frame (metres, then x WS): x = s along the line (strip travel, downstream), y = up from the mill floor, z = d toward the front (viewer side).
   ===================================================================== */
const MILL = (() => {
  const WS = 6.35, SI = 1, NEAR = [-8594, 2104], HF = 130; // stream 1 (grey highlands -> the west lake); site picked at Dominic's circled bend; floor height (world units)
  const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  // layout, metres in the local frame
  const L = { lip: -8.5, pitE: 8.0, pitD: [-3.6, 3.4], quay: 3.4, pad: [-8.5, 29.5, 3.4, 12.5], apron: 8.2, shelf: [-38, -32, -9, 6.5], Hl: 10.2, pool: -2.3, pitY: -4.6,
    steps: [-38, -44, -50], wheel: { x: 0, y: 3.0, z: 0.5, R: 6.0, W: 3.0 }, gearR: 3.2, gearZ: 2.5, pinR: 0.9, shY: 7.1, shZ: 3.3, stZ: 5.9, stands: [1, 7, 13, 19], spool: 25.5, nip: 2.35, rollR: 0.75 };
  const T = [0.36, 0.24, 0.15, 0.09], Wd = [1.0, 0.9, 0.75, 0.6], TG = [0.24, 0.15, 0.09, 0.1]; // TG: each stand's roll gap (its output) // bar thickness / width: the ingot, then after stands 1-3 (stand 4 makes the braid)
  // speeds: stand k runs so the bar's volume flow is conserved (v * area constant), all driven off one shaft
  const SP = (() => { const w1 = 0.5, v = [], om = []; const A = T.map((t, i) => t * Wd[i]); v[1] = w1 * L.rollR; v[0] = v[1] * A[1] / A[0]; v[2] = v[1] * A[1] / A[2]; v[3] = v[1] * A[1] / A[3]; v[4] = v[3] * 1.25;
    for (let k = 1; k <= 4; k++) om[k] = v[k] / L.rollR; const wheel = 0.4, pin = wheel * 40 / 11, shaft = pin, rS = 0.45, spoolR = 1.5, spool = v[4] / spoolR;
    return { v, om, wheel, pin, shaft, rS, stubR: [0, ...[1, 2, 3, 4].map((k) => rS * om[k] / shaft)], spool, spSpr: 0.6, spStub: 0.6 * spool / shaft }; })();
  const rollY0 = (k) => [L.nip + TG[k] + L.rollR, L.nip - L.rollR];
  const M = { F: null, built: false, grp: null, t0: 0, metal: null, chip: null, bub: null, near: false, lastUI: 0 };

  /* ---------- the site frame: the stream's own line at the bend (computed from GRAND's stream polyline, before any resampling) ---------- */
  function frame(P) { if (M.F) return M.F; let best = null; const A = [0]; for (let i = 1; i < P.length; i++) A.push(A[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    for (let i = 0; i + 1 < P.length; i++) { const a = P[i], b = P[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((NEAR[0] - a[0]) * dx + (NEAR[1] - a[1]) * dy) / l2)), x = a[0] + dx * t, y = a[1] + dy * t, d = Math.hypot(NEAR[0] - x, NEAR[1] - y); if (!best || d < best.d) best = { d, x, y, a: A[i] + Math.sqrt(l2) * t }; }
    const at = (s) => { s = Math.max(0, Math.min(A[A.length - 1], s)); let i = 1; while (i < A.length - 1 && A[i] < s) i++; const t = (s - A[i - 1]) / ((A[i] - A[i - 1]) || 1); return [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * t, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * t]; };
    const p0 = at(best.a - 120), p1 = at(best.a + 120), ul = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1, ux = (p1[0] - p0[0]) / ul, uy = (p1[1] - p0[1]) / ul;
    // front (viewer side) = the side where the stream runs to the viewer's right: f = (u.y, -u.x) turned round -> stands on the WNW bank here
    return (M.F = { ox: best.x, oy: best.y, a0: best.a, ux, uy, fx: -uy, fy: ux, at }); }
  const loc = (x, y) => { const F = M.F; const dx = x - F.ox, dy = y - F.oy; return [(dx * F.ux + dy * F.uy) / WS, (dx * F.fx + dy * F.fy) / WS]; };
  const wld = (s, d) => { const F = M.F; return [F.ox + (F.ux * s + F.fx * d) * WS, F.oy + (F.uy * s + F.fy * d) * WS]; };

  /* ---------- water: resample stream 1 through the site (3 m spacing) with exact points at the steps, the ledge lip and the pit end ---------- */
  function resample(P) { const F = frame(P), A = [0]; for (let i = 1; i < P.length; i++) A.push(A[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const a0 = F.a0 + -62 * WS, a1 = F.a0 + 42 * WS, keys = new Set(); for (let s = -62; s <= 42; s += 3) keys.add(+s.toFixed(2)); for (const s of L.steps) { keys.add(s - 0.15); keys.add(s + 0.15); }
    keys.add(L.lip); keys.add(L.lip + 0.08); keys.add(L.pitE - 0.08); keys.add(L.pitE); const K = [...keys].sort((a, b) => a - b).map((s) => F.a0 + s * WS);
    const out = []; for (let i = 0; i < P.length; i++) { if (A[i] > a0 && A[i] < a1) continue; if (A[i] >= a1 && out.length && !out.done) { for (const k of K) out.push(F.at(k)); out.done = true; } out.push(P[i]); }
    if (!out.done) for (const k of K) out.push(F.at(k)); delete out.done; return out; }
  // levels: after GRAND's own plan; the shelf holds level to the lip, the approach drops in small steps, the pit and tailrace sit 2.3 m under the floor
  function levels(S) { if (S.id !== SI || !M.F) return; const P = S.P, wl = S.wl, s = [0]; for (let i = 1; i < P.length; i++) s.push(s[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])); for (let i = 0; i < P.length; i++) s[i] = (s[i] - M.F.a0) / WS; /* arc metres from the wheel axle (the resampled points sit at exact arc keys) */ const hid = new Array(P.length).fill(false), Hw = HF + (L.Hl - 0.6) * WS, Hp = HF + L.pool * WS;
    const nat = wl.slice(), poolLv = (lo, hi, floor) => { let m = 1e9; for (let i = 0; i < P.length; i++) if (s[i] >= lo - 0.2 && s[i] <= hi + 0.2) m = Math.min(m, nat[i]); return Math.max(m === 1e9 ? floor : m, floor); };
    const lv = [Hw]; for (let k = 0; k + 1 < L.steps.length; k++) lv.push(poolLv(L.steps[k + 1], L.steps[k], lv[k] + 0.5)); // lv[0] = the shelf (s > steps[0]); lv[k] = the pool between steps[k] and steps[k-1]
    for (let i = 0; i < P.length; i++) { const x = s[i];
      if (x > L.lip + 0.01 && x < L.pitE - 0.01) { wl[i] = Hp; hid[i] = true; continue; }
      if (x >= L.pitE - 0.01) continue; // tailrace: handled below
      if (x <= L.lip + 0.01 && x > L.steps[0]) { wl[i] = Hw + (L.lip - x) * 0.02 * WS * 0.2; continue; }
      for (let k = 1; k < L.steps.length; k++) if (x <= L.steps[k - 1] && x > L.steps[k]) { wl[i] = Math.min(nat[i], lv[k]); break; } }
    let started = false, prev = Hp; for (let i = 0; i < P.length; i++) { if (s[i] < L.pitE - 0.01) { if (started) break; continue; } if (s[i] > 60) break; started = true; const ds = i ? Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]) : 0; prev = Math.min(prev - (s[i] > L.pitE + 0.01 ? 0.02 * ds : 0), wl[i]); wl[i] = prev; }
    const stp = []; for (const s0 of L.steps) for (let i = 0; i + 1 < P.length; i++) if (s[i] < s0 && s[i + 1] >= s0 && s[i + 1] - s[i] < 0.6) { stp.push({ s0, i }); break; }
    S.hid = hid; S.millLv = { Hw, Hp, lv, s, stp }; }

  /* ---------- terrain: the ledge shelf (raised to the lip), the mill floor (one flat painted pad) and the wheel pit ---------- */
  function inBox(s, d, m) { return s > -66 - m && s < 44 + m && d > -24 - m && d < 26 + m; }
  function wShelf(s, d) { const [s0, s1, d0, d1] = L.shelf; return sm(s0, s1, s) * (1 - sm(L.lip - 1.5, L.lip, s)) * sm(d0 - 5, d0, d) * (1 - sm(d1, d1 + 4.5, d)); }
  function wPad(s, d, back) { const [s0, s1, d0, d1] = L.pad; return sm(s0 - 1.5, s0, s) * (1 - sm(s1, s1 + 6, s)) * sm(d0 - back, d0, d) * (1 - sm(d1, d1 + 6, d)); }
  function wPit(s, d) { return sm(L.lip - 0.2, L.lip + 1.2, s) * (1 - sm(L.pitE - 1.0, L.pitE + 1.5, s)) * sm(L.pitD[0] - 1.5, L.pitD[0], d) * (1 - sm(L.pitD[1] - 0.4, L.pitD[1], d)); }
  function pre(x, y, h, mh) { if (!M.F) return [h, mh]; const [s, d] = loc(x, y); if (!inBox(s, d, 0)) return [h, mh];
    const ws = wShelf(s, d); if (ws > 0) { h += (HF + L.Hl * WS - h) * ws; }
    const wp = wPad(s, d, 0.8); if (wp > 0) { h += (HF - h) * wp; mh *= 1 - wp; }
    const wq = GRAND.water && GRAND.water.planning ? 0 : wPit(s, d); if (wq > 0) { const tg = HF + L.pitY * WS; if (tg < h) h += (tg - h) * wq; } /* (the stream's plan never sees the pit: its tailrace levels follow the ground beyond it) */
    return [h, mh]; }
  function post(x, y, h, mh) { if (!M.F) return [h, mh]; const [s, d] = loc(x, y); if (!inBox(s, d, 0)) return [h, mh];
    const wp = wPad(s, d, 0.4); if (wp > 0) { h += (HF - h) * wp; mh *= 1 - wp; }
    const wq = wPit(s, d); if (wq > 0) { const tg = HF + L.pitY * WS; if (tg < h) h += (tg - h) * wq; }
    return [h, mh]; }
  // nothing generated grows or lies on the works: trees / rocks / bushes are cleared off the ledge, the floor and the pit
  const PRUNE = new Set(['tree', 'pine', 'palm', 'deadtree', 'rock', 'boulder', 'basalt', 'scree', 'logs', 'leaves', 'mosspatch', 'shrooms', 'reeds', 'crystal', 'obsidian', 'slag', 'hay']);
  function inside(x, y, m) { if (!M.F) return false; const [s, d] = loc(x, y), mm = (m || 0) / WS; return s > -40 - mm && s < 33 + mm && d > -14 - mm && d < 18 + mm; }
  function prune(objs) { if (!M.F || !objs) return 0; let n = 0; for (let i = objs.length - 1; i >= 0; i--) { const o = objs[i]; if (PRUNE.has(o.type) && inside(o.x, o.y, (o.r || 0) + 20)) { objs.splice(i, 1); n++; } } return n; }

  /* ---------- geometry helpers (all in metres, merged per material) ---------- */
  function box(sx, sy, sz, x, y, z, ry, rz) { const g = new THREE.BoxGeometry(sx, sy, sz), uv = g.attributes.uv, D = [[sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy]]; for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * D[f][0], uv.getY(i) * D[f][1]); }
    if (rz) g.rotateZ(rz); if (ry) g.rotateY(ry); g.translate(x, y, z); return g; }
  function cyl(r0, r1, len, seg, x, y, z, axis) { const g = new THREE.CylinderGeometry(r0, r1, len, seg, 1); if (axis === 'z') g.rotateX(Math.PI / 2); else if (axis === 'x') g.rotateZ(Math.PI / 2); g.translate(x, y, z); return g; }
  function merge(list) { const P = [], N = [], U = []; for (let g of list) { if (g.index) g = g.toNonIndexed(); const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv; for (let i = 0; i < p.count; i++) { P.push(p.getX(i), p.getY(i), p.getZ(i)); N.push(n.getX(i), n.getY(i), n.getZ(i)); if (u) U.push(u.getX(i), u.getY(i)); else U.push(0, 0); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.computeBoundingSphere(); return g; }
  // spur gear in the x-y plane (axis z), r = pitch radius, n teeth, holes = spoke windows
  function gearGeo(r, n, th, tooth, holes, hub) { const s = new THREE.Shape(), ro = r + tooth * 0.5, ri = r - tooth * 0.6; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, da = (Math.PI * 2) / n; const pts = [[ri, a], [ro, a + da * 0.18], [ro, a + da * 0.48], [ri, a + da * 0.66]]; pts.forEach(([rr, aa], k) => { const X = Math.cos(aa) * rr, Y = Math.sin(aa) * rr; if (!i && !k) s.moveTo(X, Y); else s.lineTo(X, Y); }); } s.closePath();
    if (holes) { const r0 = (hub || r * 0.22) + r * 0.06, r1 = ri - r * 0.12; for (let k = 0; k < holes; k++) { const a0 = (k / holes) * Math.PI * 2 + 0.16, a1 = ((k + 1) / holes) * Math.PI * 2 - 0.16, hp = new THREE.Path(); hp.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0); for (let j = 0; j <= 5; j++) { const a = a0 + (a1 - a0) * j / 5; hp.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); } hp.lineTo(Math.cos(a1) * r0, Math.sin(a1) * r0); hp.closePath(); s.holes.push(hp); } }
    const g = new THREE.ExtrudeGeometry(s, { depth: th, bevelEnabled: false, curveSegments: 2 }); g.translate(0, 0, -th / 2); return g; }
  // bevel gear: toothed cone frustum, axis +y (apex up), unit size
  function bevelGeo(n) { const g = new THREE.CylinderGeometry(0.62, 1, 0.55, n * 2, 1), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z); if (r < 0.05) continue; const a = Math.atan2(z, x), k = Math.round(((a / (Math.PI * 2)) * n * 2 + n * 4)) % 2, f = k ? 1.0 : 0.86; p.setXYZ(i, x * f, p.getY(i), z * f); } g.computeVertexNormals(); return g; }
  // grooved stone roll (wire-mill stepped passes), axis z, length 2.5, radius 0.75, journals out to +-2.0
  function rollGeo(seg) { const pr = [[0.0, -2.15], [0.2, -2.15], [0.2, -1.32], [0.62, -1.3], [0.74, -1.25]]; const G = [[-0.9, 0.09], [-0.45, 0.075], [0.0, 0.06], [0.4, 0.045], [0.78, 0.03]];
    let y = -1.2; for (const [c, dp] of G) { pr.push([0.75, c - 0.14], [0.75 - dp, c - 0.04], [0.75 - dp, c + 0.04], [0.75, c + 0.14]); } pr.push([0.74, 1.25], [0.62, 1.3], [0.2, 1.32], [0.2, 2.0], [0.0, 2.0]); void y;
    const g = new THREE.LatheGeometry(pr.map(([r, z]) => new THREE.Vector2(r, z)), seg); g.rotateX(Math.PI / 2); return g; }
  function ringGeo(r0, r1, th, seg) { const s = new THREE.Shape(); s.absarc(0, 0, r1, 0, Math.PI * 2, false); const h = new THREE.Path(); h.absarc(0, 0, r0, 0, Math.PI * 2, true); s.holes.push(h); const g = new THREE.ExtrudeGeometry(s, { depth: th, bevelEnabled: false, curveSegments: seg }); g.translate(0, 0, -th / 2); return g; }
  function cvTex(w, h, fn, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; if (rep) t.repeat.set(rep[0], rep[1]); return t; }
  function imgTex(src, rep) { const t = new THREE.TextureLoader().load(src); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; if (rep) t.repeat.set(rep, rep); return t; }
  const woodTex = () => cvTex(128, 128, (g, w, h) => { g.fillStyle = '#7a4f2a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 70; i++) { const y = Math.random() * h; g.strokeStyle = `rgba(${40 + Math.random() * 40},${22 + Math.random() * 20},10,${0.25 + Math.random() * 0.3})`; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x * 0.05 + i) * 2); g.stroke(); } for (let y = 0; y < h; y += 32) { g.fillStyle = 'rgba(30,16,6,.55)'; g.fillRect(0, y, w, 2); } });
  const ropeTex = () => cvTex(64, 64, (g, w, h) => { g.fillStyle = '#b8935c'; g.fillRect(0, 0, w, h); for (let i = -4; i < 8; i++) { g.strokeStyle = 'rgba(92,62,30,.7)'; g.lineWidth = 3; g.beginPath(); g.moveTo(i * 10, 0); g.lineTo(i * 10 + 32, h); g.stroke(); g.strokeStyle = 'rgba(236,206,150,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(i * 10 + 4, 0); g.lineTo(i * 10 + 36, h); g.stroke(); }
    g.strokeStyle = '#3fd8cc'; g.lineWidth = 3; g.beginPath(); g.moveTo(-16, 0); g.lineTo(16, h); g.stroke(); g.beginPath(); g.moveTo(48, 0); g.lineTo(80, h); g.stroke(); });
  const metalTex = () => cvTex(64, 32, (g, w, h) => { g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { const y = Math.random() * h; g.fillStyle = `rgba(255,255,255,${Math.random() * 0.25})`; g.fillRect(0, y, w, 1); g.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`; g.fillRect(0, Math.random() * h, w, 1); } for (let x = 0; x < w; x += 16) { g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(x, 0, 3, h); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x + 3, 0, 2, h); } });

  /* ---------- the water bits the stream ribbon can't do: the lip spout onto the wheel, the bucket spill, the pit pool and the approach steps ---------- */
  function waterMat() { return new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uT: { value: 0 }, uN: { value: 0 } }]), transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true,
    vertexShader: '#include <fog_pars_vertex>\nattribute vec3 aW; varying vec3 vW; varying vec2 vU; void main(){ vW = aW; vU = uv; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;\n#include <fog_vertex>\n}',
    fragmentShader: '#include <fog_pars_fragment>\nuniform float uT; uniform float uN; varying vec3 vW; varying vec2 vU;\nfloat h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\nfloat vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }\n' +
      'void main(){ float k = vW.x, sp = vW.y, fo = vW.z; vec2 q = vec2(vU.x * 6.0, vU.y * 1.2 - uT * sp); float st = vn(q * vec2(1.0, 2.0)) * 0.6 + vn(q * vec2(3.0, 5.0)) * 0.4; vec3 deep = vec3(0.06, 0.29, 0.41), sh = vec3(0.17, 0.45, 0.42), foam = vec3(0.95, 0.98, 1.0);\n' +
      ' vec3 col = mix(deep, sh, 0.5 + 0.5 * st); float a; if (k < 0.5) { float r = vn(vU * 3.0 + vec2(uT * 0.3, -uT * 0.2)); col = mix(col, foam, clamp(fo * (0.55 + 0.45 * r) + smoothstep(0.7, 0.95, r) * 0.15, 0.0, 1.0)); a = 0.86; } else { float s2 = smoothstep(0.35, 0.85, st); col = mix(col, foam, clamp(s2 * 0.7 + fo, 0.0, 1.0)); a = (0.7 + 0.25 * s2) * smoothstep(0.0, 0.12, vU.x) * smoothstep(1.0, 0.88, vU.x); }\n' +
      ' col *= mix(1.0, 0.16, uN); gl_FragColor = vec4(col, a);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n#include <fog_fragment>\n}' }); }

  /* ---------- build ---------- */
  function build(C) { if (M.built || !M.F || typeof THREE === 'undefined') return; M.built = true; const scene = C.scene, mob = typeof QUALITY !== 'undefined' && QUALITY.name === 'mobile', SEG = mob ? 10 : 16;
    const F = M.F, g = new THREE.Group(); g.name = 'tetherMill'; g.position.set(F.ox, HF, F.oy); g.rotation.y = Math.atan2(-F.uy, F.ux); g.scale.setScalar(WS); M.grp = g; scene.add(g);
    const stoneT = imgTex('assets/t_rock.webp', 0.5), cliffT = imgTex('assets/t_cliff.webp', 0.22), woodT = woodTex();
    const mStone = new THREE.MeshLambertMaterial({ map: stoneT, color: 0xc9c2b4 }), mCliff = new THREE.MeshLambertMaterial({ map: cliffT, color: 0xb8ad9c }), mWood = new THREE.MeshLambertMaterial({ map: woodT, color: 0xffffff }),
      mBrass = new THREE.MeshLambertMaterial({ color: 0xc8954a, emissive: 0x2a1a06 }), mIron = new THREE.MeshLambertMaterial({ color: 0x4a4744 }), mLum = new THREE.MeshLambertMaterial({ color: 0x3fd9cf, emissive: 0x0d5552 }),
      mRoll = new THREE.MeshLambertMaterial({ map: stoneT, color: 0xa8a39a }), ropeT = ropeTex(), mRope = new THREE.MeshLambertMaterial({ map: ropeT }), metT = metalTex(), mMetal = new THREE.MeshLambertMaterial({ map: metT, color: 0x6b7580 });
    M.mats = { mMetal, mRope, ropeT, metT };
    const add = (geo, mat, shadow) => { const m = new THREE.Mesh(geo, mat); m.castShadow = !!shadow && !mob; m.receiveShadow = true; g.add(m); return m; };
    const S = [], CL = [], WD = [], BR = [], IR = [], st = L.stands, zS = L.stZ, wh = L.wheel;
    /* the natural ledge: broken rock columns stepping down from the shelf to the pit, a low notch where the stream crosses the lip */
    { let q = 7; const r = () => (q = (q * 16807) % 2147483647) / 2147483647; for (let z = -7.2; z < 7.0;) { const w = 1.0 + r() * 1.3, cz = z + w / 2, inCh = cz > -4.2 && cz < 2.6, top = inCh ? L.Hl - 1.05 : L.Hl + 0.15 + r() * 0.7, x0 = L.lip - 0.15 - r() * 0.5, dpt = 2.6 + r() * 2.2;
        CL.push(box(dpt, top - L.pitY, w, x0 - dpt / 2, (top + L.pitY) / 2, cz)); if (!inCh && r() < 0.6) { const w2 = w * 0.7, h2 = 0.4 + r() * 0.5; CL.push(box(dpt * 0.6, h2, w2, x0 - dpt * 0.55, top + h2 / 2, cz + (r() - 0.5) * 0.3)); } z += w; }
      // the lip tongue: a rock spur reaching out over the wheel's upstream crown, its top carrying the water to just short of top dead centre
      CL.push(box(7.2, 0.45, 3.4, L.lip + 3.3, L.Hl - 0.95, wh.z)); CL.push(box(2.2, 0.6, 3.8, L.lip + 0.6, L.Hl - 1.2, wh.z));
      // stone sills where the approach steps down
      for (const s0 of L.steps) CL.push(box(0.9, 1.0, 8.5, s0, 0, 0)); }
    /* the floor's stone quay along the pit and tailrace, the wheel piers */
    S.push(box(L.pad[1] - L.lip, 5.2, 0.6, (L.lip + L.pad[1]) / 2, -2.55, L.quay - 0.3)); S.push(box(L.pad[1] - L.lip - 0.4, 5.1, L.apron - L.quay + 0.6, (L.lip + L.pad[1]) / 2 + 0.2, -2.45, (L.apron + L.quay - 0.6) / 2)); /* the stone apron the stands and spool stand on, from the quay to 8.2 m out (it also hides the terrain grid's slope down to the water) */ S.push(box(1.3, 7.4, 0.6, 0, -1.0, 3.1)); S.push(box(1.3, 7.6, 0.8, 0, -1.1, -1.75));
    BR.push(box(0.9, 0.4, 0.7, 0, 2.75, 3.1), box(0.9, 0.4, 0.9, 0, 2.75, -1.75));
    /* the line shaft's pillars (behind the stands, between them) and its head bracket over the pinion */
    for (const x of [-1.6, 4, 10, 16, 22.3]) { S.push(box(0.7, L.shY - 0.2, 0.7, x, (L.shY - 0.2) / 2, L.shZ)); BR.push(box(0.8, 0.35, 0.8, x, L.shY - 0.15, L.shZ)); }
    S.push(box(1.9, 0.5, 0.6, -0.65, L.shY + 0.45, L.shZ)); IR.push(box(0.5, 0.9, 0.3, -0.05, L.shY + 0.1, L.gearZ + 0.25));
    /* four stone roll stands on stone footings (no rails): two portal cheeks each, brass chocks, the rolls between */
    const rollY = rollY0;
    st.forEach((x, k) => { S.push(box(3.4, 0.5, 4.2, x, 0.25, zS)); for (const zc of [zS - 1.45, zS + 1.45]) { for (const sx of [-1.1, 1.1]) S.push(box(0.45, 4.0, 0.42, x + sx, 2.5, zc)); S.push(box(2.75, 0.5, 0.46, x, 4.35, zc)); S.push(box(2.75, 0.35, 0.46, x, 0.68, zc));
        const [yt, yb] = rollY(k); for (const yy of [yt, yb]) for (const sx of [-0.64, 0.64]) BR.push(box(0.46, 0.42, 0.5, x + sx, yy, zc)); }
      IR.push(cyl(0.12, 0.12, zS - 2.05 - L.shZ + 0.1, 6, x, L.shY, (zS - 2.05 + L.shZ) / 2, 'z')); });
    /* the feed table at stand 1 with a stack of waiting ingots (their colour follows the metal) */
    WD.push(box(4.2, 0.16, 1.7, -3.35, L.nip - 0.1, zS)); for (const [x, z] of [[-5.25, zS - 0.7], [-5.25, zS + 0.7], [-1.55, zS - 0.7], [-1.55, zS + 0.7]]) WD.push(box(0.22, L.nip - 0.18, 0.22, x, (L.nip - 0.18) / 2, z));
    /* spool frame: two stone pedestals with brass caps, and its footing */
    S.push(box(5.2, 0.4, 4.4, L.spool, 0.2, zS)); for (const zc of [zS - 1.6, zS + 1.6]) { S.push(box(1.1, 2.3, 0.6, L.spool, 1.35, zc)); BR.push(box(0.8, 0.4, 0.7, L.spool, 2.55, zc)); }
    IR.push(cyl(0.12, 0.12, zS - 2.05 - L.shZ + 0.1, 6, L.spool, L.shY, (zS - 2.05 + L.shZ) / 2, 'z'));
    add(merge(S), mStone, true); add(merge(CL), mCliff, true); add(merge(WD), mWood, true); add(merge(BR), mBrass); add(merge(IR), mIron);
    /* ---- moving parts ---- */
    // the overshot wheel: two rims, eight spokes a side, 24 buckets (sole + start boards), brass bands and hub
    { const wg = new THREE.Group(); wg.position.set(wh.x, wh.y, wh.z); g.add(wg); const Wd2 = [], Bd = [], hw = wh.W / 2 - 0.12;
      for (const z of [-hw, hw]) { Wd2.push(ringGeo(5.15, 5.75, 0.24, mob ? 20 : 32).translate(0, 0, z)); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + (z > 0 ? 0 : Math.PI / 8); Wd2.push(box(5.0, 0.26, 0.22, Math.cos(a) * 2.9, Math.sin(a) * 2.9, z, 0, a)); } }
      for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; Wd2.push(box(1.1, 0.1, wh.W - 0.1, Math.cos(a) * 5.2, Math.sin(a) * 5.2, 0, 0, a + Math.PI / 2)); const ab = a + 0.12; Wd2.push(box(0.85, 0.09, wh.W - 0.1, Math.cos(ab) * 5.62, Math.sin(ab) * 5.62, 0, 0, ab - 0.5)); }
      Wd2.push(cyl(0.75, 0.75, wh.W - 0.3, 12, 0, 0, 0, 'z')); for (const z of [-hw, hw]) Bd.push(ringGeo(5.72, 5.84, 0.3, mob ? 20 : 32).translate(0, 0, z), ringGeo(0.74, 0.95, 0.34, 12).translate(0, 0, z));
      Bd.push(cyl(0.34, 0.34, 5.5, 10, 0, 0, 0.65 - wh.z, 'z'));
      const ww = new THREE.Mesh(merge(Wd2), mWood), wb = new THREE.Mesh(merge(Bd), mBrass); ww.castShadow = !mob; wg.add(ww, wb); M.wheel = wg; }
    // lumenite pit gear (on the wheel axle, behind stand 1) and the lumenite pinion above it
    { const pg = new THREE.Mesh(merge([gearGeo(L.gearR, 40, 0.42, 0.34, 6, 0.6), cyl(0.6, 0.6, 0.6, 12, 0, 0, 0, 'z')]), mLum); pg.position.set(wh.x, wh.y, L.gearZ); g.add(pg); M.pit = pg;
      const pn = new THREE.Mesh(merge([gearGeo(L.pinR, 11, 0.42, 0.34, 0), cyl(0.18, 0.18, 1.0, 8, 0, 0, 0.35, 'z')]), mLum); pn.position.set(0, wh.y + L.gearR + L.pinR, L.gearZ); g.add(pn); M.pin = pn; }
    // the line shaft with its collars
    { const pts = [cyl(0.16, 0.16, L.spool + 0.6, 8, (L.spool + 0.6) / 2 - 0.3, 0, 0, 'x')]; for (const x of [-1.6, 4, 10, 16, 22.3]) pts.push(cyl(0.26, 0.26, 0.24, 8, x + 0.5, 0, 0, 'x'), cyl(0.26, 0.26, 0.24, 8, x - 0.5, 0, 0, 'x'));
      const sh = new THREE.Mesh(merge(pts), mIron); sh.position.set(0, L.shY, L.shZ); g.add(sh); M.shaft = sh; }
    // instanced: rolls, roll pinions, sprockets, bevels, chain links, ingots
    const IM = (geo, mat, n) => { const m = new THREE.InstancedMesh(geo, mat, n); m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); g.add(m); return m; };
    M.rolls = IM(rollGeo(SEG), mRoll, 8); M.rolls.castShadow = !mob; M.pins = IM(gearGeo(1, 16, 0.22, 0.14, 0), mBrass, 8); M.spr = IM(gearGeo(1, 12, 0.12, 0.22, mob ? 0 : 4, 0.3), mIron, 10); M.bev = IM(bevelGeo(10), mBrass, 12);
    M.links = IM(new THREE.BoxGeometry(0.22, 0.07, 0.08), mIron, mob ? 120 : 180); M.ingots = IM(new THREE.BoxGeometry(1.2, T[0], Wd[0]), mMetal, 7);
    // the bar between the stands: one merged mesh, each gap's texture scale set so a single scroll shows each gap's own speed (the bar speeds up as it thins)
    { const parts = []; for (let k = 0; k < 3; k++) { const x0 = st[k], x1 = st[k + 1], b = box(x1 - x0, T[k + 1], Wd[k + 1], (x0 + x1) / 2, L.nip + T[k + 1] / 2, zS), uv = b.attributes.uv, lam = SP.v[k + 1] / SP.v[1] * 1.0; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) / lam); parts.push(b); }
      M.bar = add(merge(parts), mMetal); }
    // braid: from stand 4's nip up onto the spool's crown
    { const a = new THREE.Vector3(st[3], L.nip + 0.05, zS), b = new THREE.Vector3(L.spool - 0.25, 2.5 + SP.spool * 0 + 1.53, zS), len = a.distanceTo(b), cg = new THREE.CylinderGeometry(0.07, 0.07, len, 8, 1, true); cg.rotateZ(-Math.PI / 2); const uv = cg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), uv.getY(i) * len / 0.6);
      const br = new THREE.Mesh(cg, mRope); br.position.copy(a).add(b).multiplyScalar(0.5); br.rotation.z = Math.atan2(b.y - a.y, b.x - a.x); g.add(br); M.braidLen = len; }
    // spool: wooden flanges with brass rims, the wound braid, a brass slip clutch on the axle
    { const sg = new THREE.Group(); sg.position.set(L.spool, 2.5, zS); g.add(sg); const fw = [], fb = []; for (const z of [-1.25, 1.25]) { fw.push(cyl(2.0, 2.0, 0.16, 20, 0, 0, z, 'z')); fb.push(ringGeo(1.96, 2.06, 0.2, 20).translate(0, 0, z)); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; fb.push(box(1.5, 0.12, 0.06, Math.cos(a) * 1.05, Math.sin(a) * 1.05, z + Math.sign(z) * 0.1, 0, a)); } }
      fb.push(cyl(0.18, 0.18, 4.4, 8, 0, 0, -0.75, 'z'), cyl(0.5, 0.5, 0.12, 14, 0, 0, -1.72, 'z')); const bg = new THREE.CylinderGeometry(1.5, 1.5, 2.34, 20, 1, true); bg.rotateX(Math.PI / 2); { const uv = bg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 14, uv.getY(i) * 6); }
      const bt = ropeT.clone(); bt.needsUpdate = true; sg.add(new THREE.Mesh(merge(fw), mWood), new THREE.Mesh(merge(fb), mBrass), new THREE.Mesh(bg, new THREE.MeshLambertMaterial({ map: bt }))); M.spoolG = sg; }
    // water
    buildWater(g, C);
    // solids: she walks round (and under the bar between) the stands, never through the works
    if (typeof Explore !== 'undefined' && Explore.addSolid) { const out = [], put = (s, d, r) => { const [x, y] = wld(s, d); out.push({ x, y, r: r * WS, key: 'mill' }); };
      st.forEach((x) => { put(x, zS - 0.9, 1.5); put(x, zS + 0.9, 1.5); }); for (let x = -7.5; x <= 28.5; x += 2) put(x, 5.2, 2.3); /* the apron behind the stands is off limits (the bar runs at head height there) */ put(L.spool, zS - 1.1, 2.2); put(L.spool, zS + 1.1, 2.2); put(-4.4, zS, 1.0); put(-2.3, zS, 1.0); for (const x of [-1.6, 4, 10, 16, 22.3]) put(x, L.shZ, 0.45);
      for (let x = -6; x <= 6; x += 2) put(x, wh.z, 1.7); Explore.addSolid(out); M.solids = out; }
    setMetal(pickMetal()); M.t0 = performance.now() / 1000; }
  function buildWater(g, C) { const P = [], U = [], A = [], I = [], wh = L.wheel; const quad = (pts, k, sp, foam) => { const b = P.length / 3; pts.forEach(([x, y, z, u, v], i) => { P.push(x, y, z); U.push(u, v); A.push(k, sp, foam[i] || 0); }); return b; };
    const strip = (path, z0, z1, sp, foamEnd) => { const n = path.length, b = P.length / 3; path.forEach(([x, y], i) => { for (const [z, u] of [[z0, 0], [z1, 1]]) { P.push(x, y, z); U.push(u, i / (n - 1) * (path.len || 1)); A.push(1, sp, foamEnd ? Math.pow(i / (n - 1), 3) * 0.6 : 0); } }); for (let i = 0; i + 1 < n; i++) { const a = b + i * 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } };
    // spout: along the tongue, then over its end in an arc onto the paddles just past top dead centre
    const Ht = L.Hl - 0.62, sp = []; for (let i = 0; i <= 6; i++) sp.push([L.lip - 0.2 + (L.lip + 6.9 - (L.lip - 0.2)) * i / 6, Ht]); for (let i = 1; i <= 8; i++) { const t = i / 8; sp.push([-1.6 + 2.5 * t, Ht - 0.15 * t - 0.62 * t * t]); } sp.len = 4; strip(sp, wh.z - 1.25, wh.z + 1.25, 1.6, true);
    // bucket spill: the descending buckets empty past ~4 o'clock into the pool
    const sl = []; for (let i = 0; i <= 8; i++) { const t = i / 8; sl.push([5.25 + 0.9 * t, 1.1 - (1.1 - L.pool) * t * t]); } sl.len = 2; strip(sl, wh.z - 1.3, wh.z + 1.3, 1.4, true);
    // the pit pool (foam churned round the wheel's foot and under the spill)
    { const NX = 12, NZ = 4, x0 = L.lip + 0.4, x1 = L.pitE - 0.1, z0 = L.pitD[0] + 0.1, z1 = L.quay - 0.05, b = P.length / 3; for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) { const x = x0 + (x1 - x0) * i / NX, z = z0 + (z1 - z0) * j / NZ, dz = Math.abs(z - wh.z) / 2.2, fo = Math.max(0, 1 - Math.hypot((x - 1.5) / 6.5, dz)) * 0.8 + Math.max(0, 1 - Math.hypot((x - 6.0) / 2.0, dz)) * 0.6; P.push(x, L.pool, z); U.push(x / 4, z / 4); A.push(0, 0.6, Math.min(1, fo)); }
      for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const a = b + j * (NX + 1) + i; I.push(a, a + 1, a + NX + 2, a, a + NX + 2, a + NX + 1); } }
    // the approach steps: a short curtain at each drop the plan made
    const S = GRAND.streamLines()[SI]; if (S && S.millLv) for (const { s0, i } of S.millLv.stp) { const top = S.wl[i], bot = S.wl[i + 1]; if (top - bot < 0.4 * WS) continue;
      const [, d0] = loc(S.P[i][0], S.P[i][1]), path = []; for (let j = 0; j <= 4; j++) { const t = j / 4; path.push([s0 - 0.1 + 0.45 * t, (top - HF) / WS - ((top - bot) / WS) * t * t]); } path.len = 1; strip(path, d0 - 2.6, d0 + 2.6, 1.8, true); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); geo.setAttribute('aW', new THREE.Float32BufferAttribute(A, 3)); geo.setIndex(I); geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, waterMat()); m.renderOrder = 4; m.frustumCulled = false; g.add(m); M.water = m; void quad; void C; }

  /* ---------- metal colour: the ingot being rolled (Craft.BIT_T); cold-rolled, never glowing ---------- */
  function pickMetal() { const B = (typeof Craft !== 'undefined' && Craft.BIT_T) || []; let best = 'steel'; try { for (const [k] of B) if (Craft.have && Craft.have('ingot:' + k) > 0) best = k; } catch (e) {} return best; }
  function setMetal(k) { const B = (typeof Craft !== 'undefined' && Craft.BIT_T) || [['steel', 'Steel', '#6B7580']], t = B.find((q) => q[0] === k) || B.find((q) => q[0] === 'steel') || B[0]; M.metal = t[0]; if (!M.mats) return;
    const m = M.mats.mMetal; m.color.set(t[2]); m.emissive.set(t[0] === 'lumen' ? 0x0a2a2c : t[0] === 'onyx' ? 0x1a0408 : 0x000000); m.needsUpdate = true; }

  /* ---------- animation ---------- */
  let D = null;
  function dummy() { return D || (D = new THREE.Object3D()); }
  function chainPath(c1, r1, c2, r2) { const pts = []; const N1 = 10; for (let i = 0; i <= N1; i++) { const a = (i / N1) * Math.PI; pts.push([c1[0] + Math.cos(a) * r1, c1[1] + Math.sin(a) * r1]); } for (let i = 0; i <= N1; i++) { const a = Math.PI + (i / N1) * Math.PI; pts.push([c2[0] + Math.cos(a) * r2, c2[1] + Math.sin(a) * r2]); } pts.push(pts[0]);
    const A = [0]; for (let i = 1; i < pts.length; i++) A.push(A[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return { pts, A, len: A[A.length - 1] }; }
  function along(C, s) { s = ((s % C.len) + C.len) % C.len; let i = 1; while (i < C.A.length - 1 && C.A[i] < s) i++; const t = (s - C.A[i - 1]) / ((C.A[i] - C.A[i - 1]) || 1), a = C.pts[i - 1], b = C.pts[i]; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Math.atan2(b[1] - a[1], b[0] - a[0])]; }
  let chains = null;
  function setupChains() { if (chains) return chains; chains = []; const zc = L.stZ - 2.05; L.stands.forEach((x, k) => { chains.push({ C: chainPath([x, L.shY], SP.stubR[k + 1] + 0.08, [x, rollY0(k)[0]], SP.rS + 0.08), v: SP.shaft * SP.stubR[k + 1], z: zc }); });
    chains.push({ C: chainPath([L.spool, L.shY], SP.spStub + 0.08, [L.spool, 2.5], SP.spSpr + 0.08), v: -SP.shaft * SP.spStub, z: zc }); return chains; }
  let lastVis = 0, visOn = true, detOn = true;
  // ---- Brannick, the keeper with the hammer (Art's NPC kit 'brannick') runs the mill (Dominic t438u). Art's spot: a worn flag in the flagstone bay bumped out
  // from the apron's front edge (s -3.2..0.2, d 8.2..10.8), centred at s -1.5, d 9.6, facing -d toward the works with the feed table on his left and stand 1 on
  // his right; no solids on the pad. He turns to Wren when she is close. Tap him: she walks up to him and the Tether Mill card opens with his intro line.
  const KP = { s: -1.5, d: 9.6, y: 0, face: [-1.5, 5.9], talk: [-1.5, 11.6] }, BR = { k: null, x: 0, y: 0, hgt: 0, t: 0, walking: false };
  function keeper(now) { if (typeof NpcKit === 'undefined' || typeof THREE === 'undefined' || !M.F || !M.grp || !M.grp.parent) return;
    if (!BR.k) { if (NpcKit.ST.state === 'idle') NpcKit.load().catch(() => {}); if (!NpcKit.has('brannick')) return; const [x, y] = wld(KP.s, KP.d), [fx, fy] = wld(KP.face[0], KP.face[1]);
      const k = NpcKit.create('brannick', { scale: WS, yaw: Math.atan2(fx - x, fy - y), pos: new THREE.Vector3(x, HF + KP.y * WS, y) }); if (!k) return; k.root.name = 'millKeeper'; M.grp.parent.add(k.root);
      Object.assign(BR, { k, x, y, hgt: k.h * WS, t: now }); }
    wrapTap(); const k = BR.k, cam = M3.camera, dt = Math.min(0.1, Math.max(0, now - BR.t)); BR.t = now; const dc = cam ? Math.hypot(cam.position.x - BR.x, cam.position.y - HF, cam.position.z - BR.y) / WS : 10;
    k.root.visible = visOn && dc < 260; if (!k.root.visible) return; let face = null; const h = typeof Explore !== 'undefined' && Explore.EX && Explore.EX.on ? Explore.here() : null; if (h && Math.hypot(h[0] - BR.x, h[1] - BR.y) < WS * 7) face = Math.atan2(h[0] - BR.x, h[1] - BR.y);
    NpcKit.update(k, dt, { talking: !!(M.bub && !M.bub.classList.contains('hidden')), face, camDist: dc }); }
  function keeperAt(sx, sy) { if (!BR.k || !BR.k.root.visible || !M3.project) return false; const a = M3.project(BR.x, BR.y, KP.y * WS), b = M3.project(BR.x, BR.y, KP.y * WS + BR.hgt); if (a[0] < -999 || b[0] < -999) return false; // his base-to-top segment on screen (as the town keepers)
    const vx = b[0] - a[0], vy = b[1] - a[1], l2 = vx * vx + vy * vy || 1, u = Math.max(0, Math.min(1, ((sx - a[0]) * vx + (sy - a[1]) * vy) / l2)); return Math.hypot(a[0] + vx * u - sx, a[1] + vy * u - sy) < Math.max(22, Math.sqrt(l2) * 0.4); }
  function talkTo() { const [tx, ty] = wld(KP.talk[0], KP.talk[1]), h = Explore.here(); if (h && Math.hypot(h[0] - tx, h[1] - ty) < WS * 1.5) { open(); return 'npc'; }
    BR.walking = true; const r = Explore.goTo(tx, ty, () => { BR.walking = false; open(); }); if (!r) { BR.walking = false; open(); } return 'npc'; }
  function wrapTap() { if (M.tapW || typeof Explore === 'undefined' || !Explore.tap) return; M.tapW = true; const t0 = Explore.tap; Explore.tap = function (sx, sy, ...r) { if (Explore.EX && Explore.EX.on && keeperAt(sx, sy)) return talkTo(); return t0.call(this, sx, sy, ...r); }; }
  function anim(t, night) { if (!M.grp) return; const now = performance.now() / 1000, tt = now - M.t0, cam = typeof M3 !== 'undefined' ? M3.camera : null;
    if (cam && now - lastVis > 0.25) { lastVis = now; const c = wld(9, 2), dist = Math.hypot(cam.position.x - c[0], cam.position.z - c[1], cam.position.y - HF); const fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
      visOn = fr.intersectsSphere(new THREE.Sphere(new THREE.Vector3(c[0], HF + 4 * WS, c[1]), 26 * WS)); M.grp.visible = visOn; detOn = dist < 420 * WS; for (const o of [M.links, M.bev, M.spr, M.pins, M.ingots]) if (o) o.visible = detOn; uiTick(); }
    keeper(now);
    if (!visOn) return; const wa = -SP.wheel * tt; M.wheel.rotation.z = wa; M.pit.rotation.z = wa; M.pin.rotation.z = SP.pin * tt; M.shaft.rotation.x = SP.shaft * tt; M.spoolG.rotation.z = -SP.spool * tt;
    if (M.water) { const u = M.water.material.uniforms; u.uT.value = tt; u.uN.value = night || 0; }
    M.mats.metT.offset.x = -(SP.v[1] * tt) % 1; M.mats.ropeT.offset.y = (SP.v[4] * tt / 0.6) % 1;
    const d = dummy(), zS = L.stZ; let n = 0;
    // rolls: top CCW (+z), bottom CW (-z) seen from the front; stand k turns at om[k]
    L.stands.forEach((x, k) => { const [yt, yb] = rollY0(k), a = SP.om[k + 1] * tt; d.position.set(x, yt, zS); d.rotation.set(0, 0, a); d.scale.set(1, 1, 1); d.updateMatrix(); M.rolls.setMatrixAt(n++, d.matrix); d.position.set(x, yb, zS); d.rotation.set(0, 0, -a); d.updateMatrix(); M.rolls.setMatrixAt(n++, d.matrix); }); M.rolls.instanceMatrix.needsUpdate = true;
    if (!detOn) return;
    n = 0; L.stands.forEach((x, k) => { const [yt, yb] = rollY0(k), r = (yt - yb) / 2, a = SP.om[k + 1] * tt; d.position.set(x, yt, zS - 1.82); d.rotation.set(0, 0, a); d.scale.set(r, r, 1); d.updateMatrix(); M.pins.setMatrixAt(n++, d.matrix); d.position.set(x, yb, zS - 1.82); d.rotation.set(0, 0, -a + Math.PI / 16); d.updateMatrix(); M.pins.setMatrixAt(n++, d.matrix); }); M.pins.instanceMatrix.needsUpdate = true;
    // sprockets: per stand the stub one (up on the shaft) and the top-roll one; then the spool pair
    n = 0; const zc = zS - 2.05; L.stands.forEach((x, k) => { const [yt] = rollY0(k), r = SP.stubR[k + 1]; d.position.set(x, L.shY, zc); d.rotation.set(0, 0, SP.shaft * tt); d.scale.set(r, r, 1); d.updateMatrix(); M.spr.setMatrixAt(n++, d.matrix); d.position.set(x, yt, zc); d.rotation.set(0, 0, SP.om[k + 1] * tt); d.scale.set(SP.rS, SP.rS, 1); d.updateMatrix(); M.spr.setMatrixAt(n++, d.matrix); });
    d.position.set(L.spool, L.shY, zc); d.rotation.set(0, 0, -SP.shaft * tt); d.scale.set(SP.spStub, SP.spStub, 1); d.updateMatrix(); M.spr.setMatrixAt(n++, d.matrix); d.position.set(L.spool, 2.5, zc); d.rotation.set(0, 0, -SP.spool * tt); d.scale.set(SP.spSpr, SP.spSpr, 1); d.updateMatrix(); M.spr.setMatrixAt(n++, d.matrix); M.spr.instanceMatrix.needsUpdate = true;
    // bevels: on the shaft (axis x) and on each stub (axis z), plus the head pair at the pinion
    n = 0; const bev = (x, y, z, ax, ang, s) => { d.position.set(x, y, z); if (ax === 'x') d.rotation.set(ang, 0, -Math.PI / 2, 'XYZ'); else d.rotation.set(Math.PI / 2, ang, 0, 'XYZ'); d.scale.set(s, s, s); d.updateMatrix(); M.bev.setMatrixAt(n++, d.matrix); };
    for (const x of [...L.stands, L.spool]) { bev(x - 0.42, L.shY, L.shZ, 'x', SP.shaft * tt, 0.3); bev(x, L.shY, L.shZ + 0.38, 'z', -SP.shaft * tt, 0.3); }
    bev(0.42, L.shY, L.shZ, 'x', SP.shaft * tt, 0.36); bev(0, L.shY, L.shZ - 0.42, 'z', SP.pin * tt, 0.36); M.bev.count = n; M.bev.instanceMatrix.needsUpdate = true;
    // chain links run round each sprocket pair at the sprocket's own rim speed
    n = 0; const CH = setupChains(), cap = M.links.instanceMatrix.count; for (const c of CH) { const sp = 0.4, N = Math.floor(c.C.len / sp), off = (c.v * tt) % sp; for (let i = 0; i < N && n < cap; i++) { const [x, y, a] = along(c.C, i * sp + off); d.position.set(x, y, c.z); d.rotation.set(0, 0, a); d.scale.set(1, 1, 1); d.updateMatrix(); M.links.setMatrixAt(n++, d.matrix); } } M.links.count = n; M.links.instanceMatrix.needsUpdate = true;
    // ingots slide off the feed table into stand 1's nip (each disappears into the rolls); two wait at the back of the table
    n = 0; const gap = 1.45, x0 = -5.2, xe = L.stands[0] - 0.4, off = (SP.v[0] * tt) % gap; for (let i = 0; i < 4; i++) { const xc = x0 + off + i * gap, xa = xc - 0.6, xb = Math.min(xc + 0.6, xe); if (xb <= xa + 0.02 || xa < x0 - 0.62) continue; d.position.set((xa + xb) / 2, L.nip + T[0] / 2, zS); d.rotation.set(0, 0, 0); d.scale.set((xb - xa) / 1.2, 1, 1); d.updateMatrix(); M.ingots.setMatrixAt(n++, d.matrix); }
    for (const [x, y] of [[-4.75, L.nip + T[0] * 1.5 + 0.01], [-4.0, L.nip + T[0] * 1.5 + 0.01]]) { d.position.set(x, y, zS - 0.6); d.rotation.set(0, 0, 0); d.scale.set(0.55, 1, 0.45); d.updateMatrix(); M.ingots.setMatrixAt(n++, d.matrix); } M.ingots.count = n; M.ingots.instanceMatrix.needsUpdate = true; }

  /* ---------- the look-at prompt: near the mill a chip appears; tap it for a card (which metal it is rolling: a preview only, nothing is crafted) ---------- */
  const CSS = `#millChip{position:absolute;z-index:8;transform:translate(-50%,-100%);display:none;align-items:center;gap:6px;padding:6px 12px 6px 6px;border-radius:20px;border:0;font:600 13px Georgia,serif;color:#33200f;background:rgba(246,236,212,.96);box-shadow:0 0 0 2px #c8954a,0 3px 8px rgba(0,0,0,.35);cursor:pointer;touch-action:manipulation;white-space:nowrap}
#millChip.on{display:flex}#millChip i{display:grid;place-items:center;width:26px;height:26px;border-radius:50%;font-style:normal;background:radial-gradient(closest-side,#1e3434 66%,#e6bb68 72%,#7a4f1c 86%,#c8954a 100%)}
#millBub{position:absolute;z-index:60;left:50%;bottom:96px;transform:translateX(-50%);box-sizing:border-box;width:min(320px,calc(100% - 16px));padding:4px 2px 8px;border:16px solid transparent;border-image:url(assets/ui/kit_moss.webp) 52 fill / 16px stretch;color:#f3e4c2;font:13px Georgia,serif;filter:drop-shadow(0 4px 8px rgba(0,0,0,.5))}
#millBub.hidden{display:none}#millBub .mbTop{display:flex;align-items:center;gap:8px;margin:-6px -4px 6px}#millBub .mbI{display:grid;place-items:center;width:36px;height:36px;border-radius:50%;font-size:18px;background:radial-gradient(closest-side,#1e3434 66%,#e6bb68 72%,#7a4f1c 86%,#c8954a 100%)}
#millBub .mbN{flex:1;display:flex;flex-direction:column;min-width:0}#millBub .mbN b{font:700 16px Georgia,serif;color:#f8ecd2}#millBub .mbN small{color:#e3d3b0;font-size:12px}#millBub p{margin:2px 6px 8px;line-height:1.35;color:#f1e3c4}
#millBub .mbK{display:flex;align-items:flex-start;gap:8px;margin:0 6px 8px;padding:6px 8px;border-radius:10px;background:rgba(20,30,22,.45)}#millBub .mbK p{margin:0;font-style:italic;font-size:12.5px}#millBub .mbK b{font-style:normal}#millBub .mbK small{font-style:normal;color:#d8c69e}#millBub .mbP{flex:none;width:46px;height:46px;border-radius:50%;background:#2b3b2b url(assets/ui/npc/brannick.webp) center/cover;box-shadow:0 0 0 2px #c8954a}
#millBub .mbX{width:34px;height:34px;min-width:34px;border-radius:50%;border:0;background:#2b3b2b;color:#f3e4c2;box-shadow:0 0 0 2px #c8954a;cursor:pointer}#millBub .mbM{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:0 6px}
#millBub .mbM button{display:flex;align-items:center;gap:5px;min-height:34px;padding:4px 6px;border:0;border-radius:10px;font:12px Georgia,serif;color:#f3e4c2;background:rgba(20,30,22,.55);box-shadow:0 0 0 1px rgba(200,149,74,.6);cursor:pointer}#millBub .mbM button.on{box-shadow:0 0 0 2px #ffd36a;background:rgba(60,48,20,.7)}#millBub .mbM s{display:block;width:12px;height:12px;border-radius:3px;flex:0 0 12px;text-decoration:none;box-shadow:0 0 0 1px rgba(0,0,0,.5)}`;
  function uiEls() { if (M.chip) return true; if (typeof document === 'undefined') return false; const wrap = document.getElementById('cityWrap') || document.body, st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    const c = document.createElement('button'); c.id = 'millChip'; c.innerHTML = '<i>⚙️</i><span>Tether Mill</span>'; wrap.appendChild(c); const b = document.createElement('div'); b.id = 'millBub'; b.className = 'kKit hidden'; b.setAttribute('role', 'dialog'); wrap.appendChild(b);
    for (const el of [c, b]) for (const e of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'mouseup']) el.addEventListener(e, (ev) => ev.stopPropagation());
    c.addEventListener('click', (e) => { e.stopPropagation(); open(); }); b.addEventListener('click', (e) => { e.stopPropagation(); const t = e.target.closest('button'); if (!t) return; if (t.dataset.k === 'x') return close(); if (t.dataset.m) { setMetal(t.dataset.m); open(); } });
    M.chip = c; M.bub = b; return true; }
  function open() { if (!uiEls()) return; const B = (typeof Craft !== 'undefined' && Craft.BIT_T) || [], cur = B.find((q) => q[0] === M.metal) || ['steel', 'Steel', '#6B7580'];
    M.bub.innerHTML = `<div class="mbTop"><span class="mbI">⚙️</span><span class="mbN"><b>Tether Mill</b><small>Water-powered · cold-rolls ingots into Ledge Tether braid</small></span><button class="mbX" data-k="x" aria-label="Close">✕</button></div>` +
      `<div class="mbK"><span class="mbP"></span><p><b>Brannick</b> <small>keeper of the Tether Mill</small><br>"Every Ledge Tether starts here. Bring me good ingots and the river does the heavy work: four stands, thinner every pass, and out comes braid you can hang your life on."</p></div>` +
      `<p>The stream turns the wheel, the lumenite gears turn four roll stands, and the bar thins at every stand before it leaves as braid on the spool. Rolling <b>${cur[1]}</b> now.</p><div class="mbM">${B.map(([k, n, col]) => `<button data-m="${k}" class="${k === M.metal ? 'on' : ''}"><s style="background:${col}"></s>${n === 'Ember Onyx' ? 'Onyx' : n}</button>`).join('')}</div>`;
    M.bub.classList.remove('hidden'); }
  function close() { if (M.bub) M.bub.classList.add('hidden'); }
  function blocked() { const r = document.documentElement, m = document.getElementById('modal'); return !!(r.classList.contains('bag-open') || r.classList.contains('skills-open') || r.classList.contains('drill-open') || (m && !m.classList.contains('hidden')) || document.querySelector('#exMap.on,#bagSheet.on,#skillsSheet.on,#tetherOrb.on,#drillCtl.on,#drillUse.on,#mosDlg:not(.hidden),#mosCard:not(.hidden),#townDlg:not(.hidden),#tetherBub:not(.hidden)')); }
  function uiTick() { if (typeof Explore === 'undefined' || typeof document === 'undefined') return; const on = Explore.on && (typeof ui === 'undefined' || ui.tab === 'city') && (typeof CityMap === 'undefined' || !CityMap.mapView || CityMap.mapView().mode !== 'dev'); let near = false, h = null;
    if (on && Explore.here) { h = Explore.here(); if (h) { const [s, d] = loc(h[0], h[1]); near = s > -16 && s < 36 && d > -10 && d < 24; } }
    if (!near || blocked()) { if (M.chip) M.chip.classList.remove('on'); if (!near) close(); return; } if (!uiEls()) return; const [x, y] = wld(10, L.stZ), p = M3.project ? M3.project(x, y, 6.2 * WS) : [-9999, -9999], wrap = M.chip.parentElement.getBoundingClientRect();
    const px = p[0] < -999 ? wrap.width / 2 : Math.max(70, Math.min(wrap.width - 70, p[0])), py = p[0] < -999 ? wrap.height * 0.3 : Math.max(60, Math.min(wrap.height - 140, p[1])); M.chip.style.left = px + 'px'; M.chip.style.top = py + 'px'; M.chip.classList.add('on'); }

  return { WS, L, SP, T, M, BR, KP, keeperAt, frame, resample, levels, pre, post, inside, prune, build, anim, setMetal, open, close, loc, wld, get F() { return M.F; } };
})();

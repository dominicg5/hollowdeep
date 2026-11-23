// Offline bake of the Volcanic Forge ape's body + head into ONE continuous skinned mesh (Dominic: "his joints... look separate").
// Smooth-min SDF union of the rig's primitives (blend ~5% of his height at the shoulders / hips / neck, ~2.5% at the elbows / knees / wrists / ankles),
// the head sculpted into the SDF (one brow ridge over deep sockets, a crest from the brow back over the crown peaking behind, one muzzle form: broad flat nose set high,
// deep upper lip, slight underbite, flat cheeks), marching cubes on a 0.3 m grid, quadric decimation (meshoptimizer) to the budget, then per-vertex skin weights
// transferred from the rig (nearest two adjacent bones, blended over ~10% of the limb length either side of each joint), the silverback gradient value, region
// (fur / face skin / skin shadow) and fur-clump candidates on the silhouette. The arms are baked abducted (A-pose: their bind pose in the game) so they never weld to the torso.
// Writes assets/forge_ape.bin (quantised). Never run at game time.
// Usage: (cd /workspace/bake-node && npm i isosurface meshoptimizer) ; NODE_PATH=/workspace/bake-node/node_modules node tools/bake_ape.js [targetTris]
// The rig values below MUST match BP in src/volcanic_forge.js.
const fs = require('fs'), path = require('path'), { marchingCubes } = require('isosurface'), { MeshoptSimplifier } = require('meshoptimizer');
const BP = { hip: 34, hipW: 6, thigh: 17, shin: 15, ankle: 2, chestUp: 2, torso: 26, shA: [11, 24, 0], shB: [10, 14, 1], armA: [19, 17], armB: [15, 14], head: [0, 28, 7] };
const DEG = Math.PI / 180, AP = { A: 62 * DEG, B: 48 * DEG }, HS = 1.15, hy = BP.hip, cy = hy + BP.chestUp, HC = [0, cy + BP.head[1] + 1.5, BP.head[2] + 1.5], TARGET = +(process.argv[2] || 24000);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; }, smax = (a, b, k) => -smin(-a, -b, k);
const ell = (p, c, r) => { const x = (p[0] - c[0]) / r[0], y = (p[1] - c[1]) / r[1], z = (p[2] - c[2]) / r[2], k0 = Math.hypot(x, y, z), k1 = Math.hypot(x / r[0], y / r[1], z / r[2]); return k1 > 1e-9 ? k0 * (k0 - 1) / k1 : -Math.min(...r); };
const seg = (p, a, b) => { const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]], t = clamp((ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / (ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2), 0, 1); return [Math.hypot(ap[0] - ab[0] * t, ap[1] - ab[1] * t, ap[2] - ab[2] * t), t]; };
const cap = (p, a, b, r) => seg(p, a, b)[0] - r, rcone = (p, a, b, r1, r2) => { const [d, t] = seg(p, a, b); return d - lerp(r1, r2, t); }, sph = (p, c, r) => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) - r;
const add3 = (a, b, k) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const K = { sh: 4.0, hip: 6.0, neck: 4.0, waist: 4.0, el: 1.8, kn: 1.8, wr: 1.6, an: 1.6 };
const ARMS = []; for (const [S0, ang, L1, L2, r1, rE, rW, b0R, b0L] of [[BP.shA, AP.A, BP.armA[0], BP.armA[1], 4.6, 4.0, 4.7, 9, 7], [BP.shB, AP.B, BP.armB[0], BP.armB[1], 3.8, 3.4, 4.0, 13, 11]]) for (const s of [1, -1]) {
  const S = [s * S0[0], cy + S0[1], S0[2]], u = [s * Math.sin(ang), -Math.cos(ang), 0], E = add3(S, u, L1), W = add3(E, u, L2); ARMS.push({ s, S, u, E, W, L1, L2, r1, rE, rW, b0: s > 0 ? b0L : b0R }); }
const LEGS = [1, -1].map((s) => ({ s, x: s * BP.hipW, bt: s > 0 ? 3 : 5, bs: s > 0 ? 4 : 6, bf: s > 0 ? 18 : 19 }));
function parts(p) { const B = {}, put = (b, d) => { B[b] = B[b] === undefined ? d : Math.min(B[b], d); };
  const hips = smin(ell(p, [0, hy + 1, -0.5], [11.5, 8, 9]), ell(p, [0, hy - 2.5, -2.8], [12.5, 8.5, 8.5]), 3.0); put(0, hips); /* (pass 7: one rump mass flowing into the thighs) */
  const c1 = ell(p, [0, cy + 13, 0.5], [13.5, 15.5, 11]), c2 = ell(p, [0, cy + 19, 1.5], [15.5, 9, 10.5]), h1 = ell(p, [0, cy + 21.5, -4], [17, 9.5, 10]), h2 = ell(p, [0, cy + 24.5, -6], [10, 7, 8]), cs = ell(p, [0, cy + 16, 9.2], [8, 8, 3]), nb = ell(p, [0, cy + 24.5, 4.0], [7.2, 5.0, 6.6]);
  const chest = smin(smin(smin(smin(smin(c1, c2, 2), h1, 2.5), h2, 2), cs, 1.5), nb, 2); put(1, chest); const torso = smin(hips, chest, K.waist);
  const hd = head(p); put(2, hd.d); let D = smin(torso, hd.d, K.neck);
  for (const A of ARMS) { const del = ell(p, add3(A.S, [A.s * 0.4, 0.6, -0.5], 1), [A.r1 * 1.3, A.r1 * 1.15, A.r1 * 1.25]), up = cap(p, add3(A.S, A.u, 1), A.E, A.r1), upper = smin(del, up, 1.5); put(A.b0, upper);
    const el = sph(p, A.E, Math.max(A.rE, A.r1 * 0.9)), Wb = add3(A.W, A.u, -0.6), fo = rcone(p, A.E, Wb, A.rE, A.rW), wr = sph(p, Wb, A.rW * 0.92), fore = smin(smin(el, fo, 1.0), wr, K.wr); put(A.b0 + 1, fore);
    D = Math.min(D, smin(torso, smin(upper, fore, K.el), K.sh)); }
  for (const G of LEGS) { const th = cap(p, [G.x, hy - 2.5, -0.5], [G.x * 1.15, hy - 14.5, 0], 6.6); put(G.bt, th); const kn = sph(p, [G.x * 1.15, hy - BP.thigh, 0.3], 5.2), sh = rcone(p, [G.x * 1.15, hy - BP.thigh - 0.5, 0.3], [G.x * 1.1, 3.5, 0.3], 5.75, 4.5), /* (pass 7: thighs + calves ~25% thicker, short and heavy) */ shin = smin(kn, sh, 1.0); put(G.bs, shin);
    const ft = smin(ell(p, [G.x, 1.7, 2.6], [4.0, 1.8, 6.4]), ell(p, [G.x, 1.2, 7.6], [3.4, 1.2, 1.6]), 1.0); put(G.bf, ft); D = Math.min(D, smin(torso, smin(smin(th, shin, K.kn), ft, K.an), K.hip)); }
  return { D, B, hd, cs, chest }; }
// pass 6 wrinkle folds: polylines laid on the face surface (found once on the fold-free head), carved as shallow grooves (shadow colour)
let WR = null; function wrinkles() { if (WR) return WR; const surf = (x, y) => { for (let z = 13; z > 2; z -= 0.04) if (head([HC[0] + x * HS, HC[1] + y * HS, HC[2] + z * HS], true).d < 0) return z; return null; }, line = (f) => { const P = []; for (let i = 0; i <= 8; i++) { const [x, y] = f(i / 8), z = surf(x, y); if (z != null) P.push([x, y, z]); } return P; };
  WR = [line((t) => [lerp(-1.4, 1.4, t), 0.5 + 0.12 * (1 - Math.pow(2 * t - 1, 2))]), line((t) => [lerp(-1.6, 1.6, t), 0.95 + 0.1 * (1 - Math.pow(2 * t - 1, 2))])]; // two across the nose bridge
  for (const s of [1, -1]) WR.push(line((t) => [s * (t < 0.5 ? lerp(2.5, 3.3, t * 2) : lerp(3.3, 3.05, t * 2 - 1)), t < 0.5 ? lerp(-1.0, -2.8, t * 2) : lerp(-2.8, -4.4, t * 2 - 1)])); // nose-to-mouth folds
  return WR; }
function head(p, noWr) { const q = [(p[0] - HC[0]) / HS, (p[1] - HC[1]) / HS, (p[2] - HC[2]) / HS];
  const skull0 = ell(q, [0, 0.3, -1.0], [4.7, 4.7, 6.0]), fore = cap(q, [0, 3.1, 4.3], [0, 5.3, -2.0], 2.6), skull = smin(skull0, fore, 2.5), crest = Math.min(cap(q, [0, 4.9, 0.8], [0, 6.0, -2.6], 0.75), cap(q, [0, 6.0, -2.6], [0, 6.4, -4.6], 0.9), cap(q, [0, 6.4, -4.6], [0, 4.6, -6.8], 0.9)); /* (pass 7: a narrower skull, the forehead sloping straight back from the brow into a low narrow crest peaking behind: no helmet step) */
  const brow = smin(ell(q, [0, 2.3, 4.9], [5.0, 1.45, 1.7]), cap(q, [-4.9, 2.0, 3.4], [4.9, 2.0, 3.4], 1.2), 1.0), neck = cap(q, [0, -4.5, -2.5], [0, -11, -6.5], 5.0);
  const lip = ell(q, [0, -2.7, 8.5], [2.7, 1.25, 1.0]), chin = ell(q, [0, -5.5, 9.3], [1.9, 1.05, 1.35]), muz = ell(q, [0, -2.5, 6.0], [4.0, 3.0, 3.8]), nose = ell(q, [0, -0.9, 8.7], [2.9, 1.15, 1.05]), jaw = ell(q, [0, -4.8, 6.4], [3.5, 1.45, 3.6]);
  let cheeks = 1e9, ears = 1e9; for (const s of [1, -1]) { cheeks = Math.min(cheeks, ell(q, [s * 3.4, -1.4, 4.6], [1.9, 1.9, 1.5]), ell(q, [s * 3.3, -3.3, 4.6], [2.1, 2.0, 2.2])); ears = Math.min(ears, ell(q, [s * 4.9, -0.6, -0.6], [0.75, 1.2, 0.9])); }
  const fur = smin(smin(smin(skull, crest, 1.4), brow, 1.8), neck, 2.0), face = smin(smin(smin(smin(smin(muz, nose, 0.5), jaw, 0.6), cheeks, 1.0), lip, 0.8), chin, 0.9); /* (pass 6: a deeper upper lip, a slightly jutting chin) */
  let d = smin(smin(fur, face, 1.4), ears, 0.5);
  let sub = 1e9, wsub = 1e9; for (const s of [1, -1]) { const so = Math.hypot(q[0] - s * 2.0, q[1] - 0.55, q[2] - 5.75) - 1.5, /* (pass 6: deeper sockets) */ ns = Math.hypot(q[0] - s * 0.95, q[1] + 1.35, q[2] - 9.75) - 0.42; d = smax(d, -so, 0.6); d = smax(d, -ns, 0.2); sub = Math.min(sub, Math.abs(so), Math.abs(ns) * 1.5); }
  const mo = Math.min(cap(q, [-2.9, -4.1, 8.6], [0, -3.75, 9.55], 0.2), cap(q, [0, -3.75, 9.55], [2.9, -4.1, 8.6], 0.2)); d = smax(d, -mo, 0.25); sub = Math.min(sub, Math.abs(mo) * 1.2);
  if (!noWr && q[2] > 5 && Math.abs(q[0]) < 4.5 && q[1] > -5.5 && q[1] < 2) for (const P of wrinkles()) for (let i = 1; i < P.length; i++) { const w = cap(q, P[i - 1], P[i], 0.36); if (w < 1) { d = smax(d, -w, 0.12); wsub = Math.min(wsub, Math.abs(w)); } /* (pass 7: folds ~2x deeper, their own crease tint) */ }
  return { d: d * HS, wsub, q, fur, face: Math.min(face, ears), brow, sub, skull }; }
const BOUNDS = [[-50, -1, -17], [50, 77, 24]], H = 0.3, ADJ = new Set(['0,1', '1,2', '1,7', '7,8', '1,9', '9,10', '1,11', '11,12', '1,13', '13,14', '0,3', '3,4', '0,5', '5,6', '4,18', '6,19']);
(async () => { const t0 = Date.now(), dims = BOUNDS[1].map((v, i) => Math.round((v - BOUNDS[0][i]) / H) + 1), [nx, ny, nz] = dims;
  const C = 4, cx = Math.ceil(nx / C) + 1, cyN = Math.ceil(ny / C) + 1, cz = Math.ceil(nz / C) + 1, coarse = new Float32Array(cx * cyN * cz), at = (i, j, k) => [BOUNDS[0][0] + i * H, BOUNDS[0][1] + j * H, BOUNDS[0][2] + k * H];
  for (let k = 0; k < cz; k++) for (let j = 0; j < cyN; j++) for (let i = 0; i < cx; i++) coarse[(k * cyN + j) * cx + i] = parts(at(i * C, j * C, k * C)).D;
  const G = new Float32Array(nx * ny * nz); let nf = 0; for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const dc = coarse[(Math.round(k / C) * cyN + Math.round(j / C)) * cx + Math.round(i / C)]; let d = dc; if (Math.abs(dc) < 2.6) { d = parts(at(i, j, k)).D; nf++; } G[(k * ny + j) * nx + i] = d; }
  console.log('grid', dims.join('x'), 'fine evals', nf, ((Date.now() - t0) / 1000).toFixed(1) + 's');
  const mc = marchingCubes(dims, (x, y, z) => -G[(Math.round((z - BOUNDS[0][2]) / H) * ny + Math.round((y - BOUNDS[0][1]) / H)) * nx + Math.round((x - BOUNDS[0][0]) / H)], [BOUNDS[0], BOUNDS[1].map((v, i) => BOUNDS[0][i] + dims[i] * H)]);
  const key = new Map(), P = [], remap = mc.positions.map((v) => { const kk = v.map((c) => Math.round(c * 2000)).join(','); let id = key.get(kk); if (id === undefined) { id = P.length / 3; key.set(kk, id); P.push(...v); } return id; });
  let I = []; for (const c of mc.cells) { const a = remap[c[0]], b = remap[c[1]], d = remap[c[2]]; if (a !== b && b !== d && a !== d) I.push(a, b, d); }
  console.log('marched', P.length / 3, 'verts', I.length / 3, 'tris', ((Date.now() - t0) / 1000).toFixed(1) + 's');
  await MeshoptSimplifier.ready; const pos = new Float32Array(P); let idx = MeshoptSimplifier.simplify(new Uint32Array(I), pos, 3, TARGET * 3, 0.05, [])[0];
  const used = new Map(), P2 = []; const I2 = Array.from(idx, (v) => { let n = used.get(v); if (n === undefined) { n = P2.length / 3; used.set(v, n); P2.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]); } return n; });
  const nV = P2.length / 3, nT = I2.length / 3; console.log('decimated', nV, 'verts', nT, 'tris');
  const grad = (p) => { const e = 0.05, f = (q) => parts(q).D; const g = [f([p[0] + e, p[1], p[2]]) - f([p[0] - e, p[1], p[2]]), f([p[0], p[1] + e, p[2]]) - f([p[0], p[1] - e, p[2]]), f([p[0], p[1], p[2] + e]) - f([p[0], p[1], p[2] - e])], l = Math.hypot(...g) || 1; return g.map((v) => v / l); };
  let flip = 0; for (let t = 0; t < nT; t += 37) { const [a, b, c] = [I2[t * 3], I2[t * 3 + 1], I2[t * 3 + 2]].map((v) => [P2[v * 3], P2[v * 3 + 1], P2[v * 3 + 2]]), u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]], g = grad(a); flip += n[0] * g[0] + n[1] * g[1] + n[2] * g[2] < 0 ? 1 : -1; }
  if (flip > 0) for (let t = 0; t < nT; t++) { const x = I2[t * 3 + 1]; I2[t * 3 + 1] = I2[t * 3 + 2]; I2[t * 3 + 2] = x; }
  const SB = new Uint8Array(nV * 2), SW = new Uint8Array(nV), GR = new Uint8Array(nV), RG = new Uint8Array(nV), cnt = { fur: 0, skin: 0, shadow: 0, cards: 0 };
  for (let v = 0; v < nV; v++) { const p = [P2[v * 3], P2[v * 3 + 1], P2[v * 3 + 2]], R = parts(p), n = grad(p), bs = Object.entries(R.B).map(([b, d]) => [+b, d]).sort((a, b) => a[1] - b[1]);
    let [b1, d1] = bs[0], b2 = 0, w = 1; const second = bs.slice(1).find(([b]) => ADJ.has(Math.min(b, b1) + ',' + Math.max(b, b1))); if (second && second[1] - d1 < 3) { b2 = second[0]; w = 1 / (1 + Math.exp(-(second[1] - d1) / 0.55)); }
    SB[v * 2] = b1; SB[v * 2 + 1] = b2; SW[v] = Math.round(w * 255);
    let g; const A = ARMS.find((a) => a.b0 === b1 || a.b0 + 1 === b1);
    if (A) { const sA = clamp(((p[0] - A.S[0]) * A.u[0] + (p[1] - A.S[1]) * A.u[1]) / (A.L1 + A.L2), 0, 1); g = lerp(3, 2, sm(0, 0.3, sA)) - 1.4 * sm(0.38, 0.68, sA) - 0.6 * sm(0.85, 1.0, sA); } // (pass 6: one soft fade over ~30% of the arm, centred on the elbow: no glove edge)
    else if (b1 === 2) { const q = R.hd.q; g = lerp(1, 3, sm(4.4, 7.8, q[1] + 0.8 * Math.max(0, -q[2] - 0.5) - 0.35 * Math.max(0, q[2]))); /* (pass 7: dark ~25% of the skull up from the brow, the silver mostly on the back of the head) */ g = lerp(g, 3, sm(-1, -4, q[2]) * sm(-13, -3, q[1])); } // (pass 6: dark #5e5952 brow, the crest grading to silver over ~40% of the skull, the saddle down the back of the neck)
    else { const ye = p[1] + 9 * sm(-1, -7, p[2]) * (b1 <= 1 ? 1 : 0); g = ye > cy + 17 ? lerp(2, 3, sm(cy + 17, cy + 24, ye)) : ye > cy - 2 ? lerp(1, 2, sm(cy - 2, cy + 15, ye)) : lerp(0, 1, sm(hy - BP.thigh - 5, hy - BP.thigh + 5, ye)); } // (knee fade ~30% of the leg)
    GR[v] = Math.round(clamp(g / 3, 0, 1) * 255);
    let rg = 0; if (b1 === 2) { const h = R.hd, q = h.q; if (h.wsub < 0.42) rg = 3; else if (h.sub < 0.45 || (h.brow < h.fur + 0.2 && n[1] < -0.35 && q[2] > 3)) rg = 2; else if (h.face < Math.min(h.fur, h.brow) + 0.25 || (q[2] > 4.0 && q[1] > -1 && q[1] < 1.4 && Math.abs(q[0]) < 4.6 && h.brow > 0.4)) rg = 1; }
    else if (b1 === 1 && R.cs < R.chest + 0.3 && p[2] > 8) rg = 1; else if ((b1 === 18 || b1 === 19) && n[1] < -0.3) rg = 1;
    let card = false; if (rg === 0) { if (b1 === 1 && n[1] > 0.45 && p[1] > cy + 16) card = true; else if (b1 === 1 && n[2] < -0.75 && p[1] > cy + 4) card = true; else if (A) { const o = [-A.u[1] * A.s, A.u[0] * A.s, 0]; if (n[0] * o[0] + n[1] * o[1] > 0.7) card = true; } else if (b1 === 2 && n[1] > 0.6) card = true; }
    RG[v] = rg | (card ? 4 : 0); cnt[['fur', 'skin', 'shadow', 'crease'][rg]] = (cnt[['fur', 'skin', 'shadow', 'crease'][rg]] || 0) + 1; if (card) cnt.cards++; }
  const mn = [0, 1, 2].map((i) => { let m = 1e9; for (let k = i; k < P2.length; k += 3) m = Math.min(m, P2[k]); return m; }), mx = [0, 1, 2].map((i) => { let m = -1e9; for (let k = i; k < P2.length; k += 3) m = Math.max(m, P2[k]); return m; }), sc = mn.map((v, i) => (mx[i] - v) / 65535);
  const Q = new Uint16Array(nV * 3); for (let v = 0; v < nV; v++) for (let i = 0; i < 3; i++) Q[v * 3 + i] = Math.round((P2[v * 3 + i] - mn[i]) / sc[i]);
  if (nV > 65535) throw new Error('too many verts for uint16 indices');
  const hdr = new Float32Array([0x41504531, nV, nT * 3, ...mn, ...sc, AP.A, AP.B, HS]), arrs = [hdr, Q, SB, SW, GR, RG, new Uint16Array(I2)].map((a) => Buffer.from(a.buffer, a.byteOffset, a.byteLength));
  const pad = (b) => (b.length % 4 ? Buffer.concat([b, Buffer.alloc(4 - (b.length % 4))]) : b), out = Buffer.concat(arrs.map(pad)), f = path.join(__dirname, '..', 'assets', 'forge_ape.bin');
  fs.writeFileSync(f, out); console.log('wrote', f, out.length, 'bytes', JSON.stringify(cnt), ((Date.now() - t0) / 1000).toFixed(1) + 's');
})();

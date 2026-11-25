/* crystalCrown.js — Lumenite skill-tree crown + branch module (Art, ART-16 crown_v3: 9-crown tree, per-colour merged draws)
   three.js r149 (global THREE, same as assets/vendor/three.min.js). No other deps. Classic script:
   exposes window.CrystalCrown = { createCrystalCrown, createCrystalBranch, createBraid, createCrystalTree, createCrownSet, makeCrystalMaterial, setBloom, TREE_LAYOUT }.
   Units: skill-tree local units (H = 4.15, SPEC_v2). +Y up.
   Game integration (tree-fix-v1): includeTrunk/includeRoots flags (the game keeps its claw roots + trunk strands + tether);
   limb paths follow each crown's azimuth so the 9 crowns can sit all the way around the trunk (t488u);
   glowPoints clamp gl_PointSize at 511 and hide points closer than 0.18 m so close-up cameras don't clip the near plane.
   setPoints on the tree group takes { combat, production, beasts } fractions. */
(function (root) {
  'use strict';
  const THREE = root.THREE;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function rng(seed) { let a = (seed >>> 0) || 1; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* ---------------- material: toon crystal, inner glow, white-hot edges, procedural facet web, fresnel rim, glints ---------------- */
  const VS = `
attribute vec3 aBary; attribute vec2 aLeaf; attribute vec3 aCol; attribute vec2 aUV;
#ifdef USE_INSTANCING
attribute vec3 iData;
#endif
varying vec3 vB; varying vec2 vL; varying vec3 vC; varying vec3 vD; varying vec3 vWP; varying vec2 vUV;
#include <common>
#include <fog_pars_vertex>
void main(){
  mat4 m = modelMatrix;
#ifdef USE_INSTANCING
  m = modelMatrix * instanceMatrix; vD = iData;
#else
  vD = vec3(0.45, 0.5, 0.3);
#endif
  vB = aBary; vL = aLeaf; vC = aCol; vUV = aUV;
  vec4 wp = m * vec4(position, 1.0); vWP = wp.xyz;
  vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
  const FS = `
uniform vec3 uColor; uniform vec3 uGlow; uniform vec3 uRim; uniform vec3 uLight; uniform float uAmb; uniform float uEm; uniform float uEdge; uniform float uLines; uniform float uFres; uniform float uGlint; uniform float uWeb; uniform float uHot; uniform float uDeep;
varying vec3 vB; varying vec2 vL; varying vec3 vC; varying vec3 vD; varying vec3 vWP; varying vec2 vUV;
#include <common>
#include <fog_pars_fragment>
float h1(float n){ return fract(sin(n * 91.345) * 47453.53); }
float lineAt(float a){ float d = abs(fract(a - 0.5) - 0.5); return 1.0 - smoothstep(0.0, fwidth(a) * 1.4, d); }
void main(){
  vec3 N = normalize(cross(dFdx(vWP), dFdy(vWP)));
  vec3 Vv = normalize(cameraPosition - vWP); if (dot(N, Vv) < 0.0) N = -N;
  float ndl = dot(N, normalize(uLight));
  float band = 0.6 * smoothstep(-0.3, 0.05, ndl) + 0.4 * smoothstep(0.35, 0.6, ndl);
  vec3 alb = uColor * vC * (0.82 + 0.3 * vD.y) * mix(1.0, 1.0 - uDeep, smoothstep(0.3, 0.65, vD.x));   // inner facets deeper
  float au = abs(vUV.x), v = vUV.y;
  // procedural facet web (leaves only): chevron veins + counter-veins + midrib, each cell its own tint -> stained-crystal mosaic
  float web = 0.0, cell = 1.0;
  if (uWeb > 0.0) {
    float s = vD.z * 7.0, a1 = v * 7.5 - au * 2.6 + s, a2 = v * 7.5 + au * 2.6 + s * 1.7;
    cell = 0.86 + 0.28 * h1(floor(a1) * 13.0 + floor(a2) * 7.0 + s);
    web = max(max(lineAt(a1), lineAt(a2) * 0.75), 1.0 - smoothstep(0.0, fwidth(vUV.x) * 1.6, au)) * uWeb;
  }
  vec3 col = alb * (uAmb + 0.6 * band) * cell * ((uWeb > 0.0) ? mix(0.72, 1.12, v) : 1.0);   // leaf base deeper, tip lighter
  float g = (0.35 + 0.65 * vD.x) * mix(1.25, 0.55, vL.y);
  col += uGlow * vC * uEm * g;
  float fr = pow(1.0 - clamp(dot(N, Vv), 0.0, 1.0), 2.2);
  col += mix(uColor, uRim, 0.6) * fr * uFres;
  float w = min(min(vB.x, vB.y), vB.z); float ln = 1.0 - smoothstep(0.0, fwidth(w) * 1.3, w);
  col = mix(col, mix(uColor * 1.3, uRim, 0.28), max(ln * uLines, web * 0.42));
  float e = (uWeb > 0.0) ? smoothstep(0.8, 0.98, au) + smoothstep(0.93, 1.0, v) * 0.5 : smoothstep(0.8, 0.97, vL.x);
  col = mix(col, uRim * (1.0 + 0.35 * uHot), clamp(e * uEdge, 0.0, 1.0)) + uRim * e * uEdge * 0.35 * uHot;   // white-hot edges
  vec3 Hh = normalize(normalize(uLight) + Vv); float sp = pow(max(dot(N, Hh), 0.0), 48.0);
  col += vec3(1.0) * smoothstep(0.55, 0.7, sp) * uGlint * (0.5 + vD.z);
  gl_FragColor = vec4(col, 1.0);
  #include <fog_fragment>
}`;
  function makeCrystalMaterial(o) {
    o = o || {};
    const c = new THREE.Color(o.color !== undefined ? o.color : 0xffffff);
    const rim = o.rim ? new THREE.Color(o.rim) : c.clone().lerp(new THREE.Color(1, 0.97, 0.92), 0.7);
    const glow = o.glow ? new THREE.Color(o.glow) : c.clone().lerp(new THREE.Color(1, 0.85, 0.5), 0.15);
    const m = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        uColor: { value: c }, uGlow: { value: glow }, uRim: { value: rim },
        uLight: { value: (o.light || V(-0.45, 0.8, 0.55)).clone().normalize() },
        uAmb: { value: o.amb !== undefined ? o.amb : 0.34 }, uEm: { value: o.em !== undefined ? o.em : 0.42 },
        uEdge: { value: o.edge !== undefined ? o.edge : 0.6 }, uLines: { value: o.lines !== undefined ? o.lines : 0.1 },
        uFres: { value: o.fres !== undefined ? o.fres : 0.22 }, uGlint: { value: o.glint !== undefined ? o.glint : 0.5 },
        uWeb: { value: o.web !== undefined ? o.web : 0 }, uHot: { value: o.hot !== undefined ? o.hot : 1 }, uDeep: { value: o.deep || 0 } }]),
      vertexShader: VS, fragmentShader: FS, fog: true, toneMapped: false });
    m.extensions = { derivatives: true };
    return m;
  }

  /* ---------------- geometry helpers (non-indexed, with barycentrics) ---------------- */
  function Builder() { this.p = []; this.b = []; this.l = []; this.c = []; this.u = []; }
  Builder.prototype.tri = function (A, B, C, la, lb, lc, ca, cb, cc, ua, ub, uc) {
    this.p.push(A.x, A.y, A.z, B.x, B.y, B.z, C.x, C.y, C.z); this.b.push(1, 0, 0, 0, 1, 0, 0, 0, 1);
    this.l.push(la[0], la[1], lb[0], lb[1], lc[0], lc[1]); cb = cb || ca; cc = cc || ca;
    this.c.push(ca.r, ca.g, ca.b, cb.r, cb.g, cb.b, cc.r, cc.g, cc.b);
    ua = ua || [0, 0]; ub = ub || ua; uc = uc || ua; this.u.push(ua[0], ua[1], ub[0], ub[1], uc[0], uc[1]); };
  Builder.prototype.geo = function () { const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('aBary', new THREE.Float32BufferAttribute(this.b, 3));
    g.setAttribute('aLeaf', new THREE.Float32BufferAttribute(this.l, 2)); g.setAttribute('aCol', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('aUV', new THREE.Float32BufferAttribute(this.u, 2));
    g.computeBoundingSphere(); g.computeBoundingBox(); return g; };

  /* broad flat crystal leaf: +Y length 1, max width ~0.56, low diamond section (thin midrib ridge), 54 tris.
     aUV = (across -1..1, along 0..1) drives the facet web and the white-hot edge in the shader. */
  function leafGeometry(seed) {
    const r = rng(seed || 7), B = new Builder(), W = new THREE.Color(1, 1, 1);
    const T = [0, 0.12, 0.36, 0.62, 0.84], HW = [0.06, 0.29, 0.35, 0.27, 0.11], NS = 4, TH = 0.22;
    const rings = T.map((t, i) => { const out = []; const w = HW[i] * (1 + (r() - 0.5) * 0.1);
      for (let k = 0; k < NS; k++) { const cx = [1, 0, -1, 0][k], cz = [0, 1, 0, -1][k];
        out.push({ v: V(cx * w, t, cz * w * TH), uv: [cx, t], e: Math.abs(cx), t }); } return out; });
    const tip = V(0, 1.0, 0);
    for (let i = 0; i < T.length - 1; i++) for (let k = 0; k < NS; k++) { const a = rings[i][k], b = rings[i][(k + 1) % NS], c = rings[i + 1][(k + 1) % NS], d = rings[i + 1][k];
      B.tri(a.v, b.v, c.v, [a.e, a.t], [b.e, b.t], [c.e, c.t], W, W, W, a.uv, b.uv, c.uv); B.tri(a.v, c.v, d.v, [a.e, a.t], [c.e, c.t], [d.e, d.t], W, W, W, a.uv, c.uv, d.uv); }
    const L = rings[T.length - 1]; for (let k = 0; k < NS; k++) { const a = L[k], b = L[(k + 1) % NS]; B.tri(a.v, b.v, tip, [a.e, a.t], [b.e, b.t], [0, 1], W, W, W, a.uv, b.uv, [0, 1]); }
    const C0 = rings[0]; B.tri(C0[0].v, C0[2].v, C0[1].v, [0.3, 0], [0.3, 0], [0.3, 0], W, W, W, [0, 0]); B.tri(C0[0].v, C0[3].v, C0[2].v, [0.3, 0], [0.3, 0], [0.3, 0], W, W, W, [0, 0]);
    return B.geo(); }

  /* tapered faceted tube along a curve; col = THREE.Color or fn(t) */
  function addTube(B, curve, r0, r1, col, o) {
    o = o || {}; const NS = o.ns || 6, NL = o.nl || 10, rr = rng(o.seed || 3);
    const fr = curve.computeFrenetFrames(NL, false); const rings = [];
    for (let i = 0; i <= NL; i++) { const t = i / NL, p = curve.getPointAt(t), N = fr.normals[i], Bn = fr.binormals[i];
      let rad = lerp(r0, r1, Math.pow(t, o.pw || 1)); if (o.tipTaper && t > 1 - o.tipTaper) rad *= lerp(1, 0.35, (t - (1 - o.tipTaper)) / o.tipTaper);
      const ring = []; for (let k = 0; k < NS; k++) { const a = k / NS * Math.PI * 2 + i * 0.35, j = 1 + (rr() - 0.5) * 0.14;
        ring.push(p.clone().addScaledVector(N, Math.cos(a) * rad * j).addScaledVector(Bn, Math.sin(a) * rad * j)); }
      rings.push({ ring, t, c: typeof col === 'function' ? col(t) : col }); }
    for (let i = 0; i < NL; i++) for (let k = 0; k < NS; k++) { const A = rings[i], C = rings[i + 1], e0 = k % 2 ? 0.55 : 0.25, e1 = (k + 1) % 2 ? 0.55 : 0.25;
      const a = A.ring[k], b = A.ring[(k + 1) % NS], c = C.ring[(k + 1) % NS], d = C.ring[k];
      B.tri(a, b, c, [e0, 0.4], [e1, 0.4], [e1, 0.4], A.c, A.c, C.c); B.tri(a, c, d, [e0, 0.4], [e1, 0.4], [e0, 0.4], A.c, C.c, C.c); }
    if (o.capEnd) { const L = rings[NL], tp = curve.getPointAt(1).add(curve.getTangentAt(1).multiplyScalar(o.capEnd));
      for (let k = 0; k < NS; k++) B.tri(L.ring[k], L.ring[(k + 1) % NS], tp, [0.4, 0.6], [0.4, 0.6], [1, 1], L.c); }
    return B; }

  /* 3-ply braid around a centreline. colors: [c0,c1,c2]; radii: [r0..] start radius per ply; returns Builder */
  function createBraid(B, pts, o) {
    const cl = new THREE.CatmullRomCurve3(pts), L = cl.getLength(), NL = o.nl || Math.ceil(L * 26), fr = cl.computeFrenetFrames(NL, false);
    const turns = o.turns !== undefined ? o.turns : L * 0.9, hr = o.hr || 0.07;
    for (let s = 0; s < 3; s++) { const P = [];
      for (let i = 0; i <= NL; i++) { const t = i / NL, p = cl.getPointAt(t), a = s / 3 * Math.PI * 2 + t * turns * Math.PI * 2 + (o.phase || 0);
        const h = hr * (o.hrFn ? o.hrFn(t) : 1); P.push(p.addScaledVector(fr.normals[i], Math.cos(a) * h).addScaledVector(fr.binormals[i], Math.sin(a) * h)); }
      const r = o.radii[s]; addTube(B, new THREE.CatmullRomCurve3(P), r[0], r[1], o.colors[s], { ns: o.ns || 7, nl: NL, seed: 11 + s, pw: 1, tipTaper: o.tipTaper }); }
    return B; }

  /* ---------------- halo sprite ---------------- */
  const _halo = {};
  function haloTex(col) { const k = col.getHexString(); if (_halo[k]) return _halo[k]; const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const x = cv.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64), c = col, s = (a) => `rgba(${c.r * 255 | 0},${c.g * 255 | 0},${c.b * 255 | 0},${a})`;
    g.addColorStop(0, s(1)); g.addColorStop(0.3, s(0.7)); g.addColorStop(0.6, s(0.25)); g.addColorStop(0.85, s(0.06)); g.addColorStop(1, s(0)); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return (_halo[k] = new THREE.CanvasTexture(cv)); }

  /* ---------------- crown ---------------- */
  /* opts: color, height (visible tip-to-tip height at 0 pts), radius (visible half-width), seed, pointsFraction 0..1,
           shape 'round'|'teardrop', inward (+1/-1: x side the limb comes from, 0 = centred), stem (Vector3 override),
           growth (max extra scale at 1), halo, glow (frond glow points = the cheap "bloom"), em */
  function createCrystalCrown(opts) {
    const o = Object.assign({ color: 0xe8382c, height: 1.46, radius: 0.78, seed: 1, pointsFraction: 0, shape: 'round', inward: 0, halo: true, glow: true, growth: 0.12 }, opts || {});
    const R = o.radius, Hh = o.height / 2, col = new THREE.Color(o.color), tear = o.shape === 'teardrop', up = V(0, 1, 0);
    const stem = o.stem ? o.stem.clone() : V(o.inward * 0.5 * R, -1.55 * Hh, 0);
    const grp = new THREE.Group(); grp.name = 'crystalCrown';
    const inner = new THREE.Group(); grp.add(inner);
    // frond list: unit direction from the crown heart, size, fan-axis tilt. 7 fronds; teardrop = 1 tall top + 2 rings of 3.
    let FR;
    if (o.lite) FR = [{ d: [0.05, 1, 0.15], s: 1.0 }, { d: [-0.85, 0.5, 0.25], s: 0.95 }, { d: [0.85, 0.5, -0.25], s: 0.95 }, { d: [-0.9, -0.3, -0.3], s: 0.85 }, { d: [0.9, -0.3, 0.3], s: 0.85 }, { d: [0.1, 0.1, 1], s: 0.8, tilt: 0.75 }];
    else if (!tear) { const lo = o.inward ? -o.inward : 0;
      FR = [{ d: [0.05, 1, 0.12], s: 1.0 }, { d: [-0.78, 0.55, 0.32], s: 0.95 }, { d: [0.78, 0.55, -0.32], s: 0.95 },
        { d: [-0.95, -0.3 - (lo < 0 ? 0.2 : 0), -0.28], s: lo < 0 ? 0.85 : 0.8 }, { d: [0.95, -0.3 - (lo > 0 ? 0.2 : 0), 0.28], s: lo > 0 ? 0.85 : 0.8 },
        { d: [0.12, -0.05, 1], s: 0.9, tilt: 0.75 }, { d: [-0.12, 0.0, -1], s: 0.9, tilt: 0.75 }]; }
    else FR = [{ d: [0, 1, 0], s: 1.25, top: 1 }, { d: [0.0, 0.42, 1], s: 0.9 }, { d: [0.87, 0.42, -0.5], s: 0.9 }, { d: [-0.87, 0.42, -0.5], s: 0.9 },
      { d: [0.87, -0.3, 0.5], s: 1.0 }, { d: [-0.87, -0.3, 0.5], s: 1.0 }, { d: [0, -0.3, -1], s: 1.0 }];

    function layout(ex, ey, oy) {
      const r = rng(o.seed * 9301 + 17), leaves = [], fronds = [], ribLines = [];
      const pushLeaf = (p, dir, L, inn, tier, nrm) => { dir = dir.clone(); dir.normalize(); if (dir.y < -0.26) { dir.y = -0.26 + r() * 0.06; dir.normalize(); }
        leaves.push({ p, dir, L, inner: inn, tier, n: nrm.clone(), w: lerp(0.95, 1.15, r()), tint: r(), gl: r() }); };
      FR.forEach((f, fi) => {
        const n = V(...f.d).normalize(), yn = n.y, sx = tear ? (yn > 0 ? 1 - 0.42 * yn : 1) : 1;
        const Pc = V(n.x * R * ex * sx * 0.55, n.y * Hh * ey * 0.55 + oy, n.z * R * ex * sx * 0.55);
        const Rf = R * 1.05 * f.s;
        // frond axis points out from the heart and up; its broad faces turn sideways (horizontal tangent), so every frond
        // shows full leaf faces exactly when it is on the silhouette; a crossed layer covers the face-on angle.
        const a = n.clone().add(V(0, f.top ? 0 : (f.tilt !== undefined ? f.tilt : (n.y > 0.2 ? 0.25 : 0.6)), 0)).normalize();
        let nf = V(0, 1, 0).cross(n); if (nf.lengthSq() < 0.02) nf = V(Math.cos(fi * 2.3 + 0.4), 0, Math.sin(fi * 2.3 + 0.4)); nf.normalize();
        nf.addScaledVector(a, -nf.dot(a)).normalize();
        const lat = nf.clone().cross(a).normalize();
        const B = Pc.clone().addScaledVector(a, -0.42 * Rf);
        fronds.push({ Pc, B, a, nf, lat, Rf, n });
        // palmate-pinnate frond (like the painting): 3 ribs fan out from the twig tip in the frond's face plane, each rib carries
        // paired leaves (wide-angled + longer at the base, one terminal leaf). A 4th rib sits crossed (lat plane) so the frond
        // keeps broad faces through the spin, and a short inner rib layer adds depth. Leaves are small vs the crown (~1/7 width).
        const ribs = [{ ang: 0, pn: nf, lt: lat, len: 1.0, k: 7, ls: 1.0, off: 0.02 }, { ang: -0.62, pn: nf, lt: lat, len: 0.82, k: 6, ls: 0.95, off: 0 }, { ang: 0.62, pn: nf, lt: lat, len: 0.82, k: 6, ls: 0.95, off: 0 },
                      { ang: 0, pn: lat, lt: nf, len: 0.85, k: 6, ls: 0.9, off: -0.01, cross: 1 }, { ang: 0.0, pn: nf, lt: lat, len: 0.55, k: 4, ls: 0.8, off: -0.05 }, { ang: -0.32, pn: nf, lt: lat, len: 0.7, k: 4, ls: 0.85, off: -0.09 }, { ang: 0.32, pn: nf, lt: lat, len: 0.7, k: 4, ls: 0.85, off: -0.09 }];
        const RB = o.lite ? [{ ang: 0, pn: nf, lt: lat, len: 1.0, k: 3, ls: 1.45, off: 0.02 }, { ang: -0.62, pn: nf, lt: lat, len: 0.82, k: 2, ls: 1.4, off: 0 }, { ang: 0.62, pn: nf, lt: lat, len: 0.82, k: 2, ls: 1.4, off: 0 }, { ang: 0, pn: lat, lt: nf, len: 0.85, k: 2, ls: 1.3, off: -0.01, cross: 1 }]
                 : (o.depth === false ? ribs.slice(0, 5) : ribs);
        RB.forEach((rb_, ri) => { const ax = a.clone().multiplyScalar(Math.cos(rb_.ang)).addScaledVector(rb_.lt, Math.sin(rb_.ang)).normalize();
          const rl = Rf * rb_.len; if (ri < (o.lite ? 1 : 4)) ribLines.push({ B: B.clone(), ax, rl, pn: rb_.pn, fi });
          for (let k = 0; k <= rb_.k; k++) { const t = k / rb_.k;
            const p0 = B.clone().addScaledVector(ax, rl * lerp(0.08, 0.8, t)).addScaledVector(rb_.pn, rb_.off * R);
            (k === rb_.k ? [0] : [-1, 1]).forEach((sd) => {
              const ang = sd === 0 ? 0 : lerp(1.25, 0.45, t) + (r() - 0.5) * 0.18;
              const dir = ax.clone().multiplyScalar(Math.cos(ang)).addScaledVector(rb_.lt, sd * Math.sin(ang)).addScaledVector(n, 0.14 + 0.3 * Math.abs(sd) * (1 - 0.5 * t));
              if (f.top) dir.y += 0.12;
              const L = Rf * 0.5 * rb_.ls * (sd === 0 ? 1.0 : lerp(1.0, 0.72, t)) * lerp(0.9, 1.1, r());
              pushLeaf(p0.clone().add(V(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.02 * R)), dir, L, ri >= 3 ? 0.65 : 0.25 + 0.35 * (1 - t), r(), rb_.pn); }); } });
      });
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      leaves.forEach((l) => { if (l.tier >= 0.8) return; for (const t of [-0.1, 0.9]) { const q = l.p.clone().addScaledVector(l.dir, t * l.L);
        x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); } });
      return { leaves, fronds, ribLines, ext: { hx: (x1 - x0) / 2, cx: (x0 + x1) / 2, hy: (y1 - y0) / 2, cy: (y0 + y1) / 2 } };
    }
    let ex = 1, ey = 1, oy = 0, LY;
    for (let pass = 0; pass < 8; pass++) { LY = layout(ex, ey, oy); const e = LY.ext; if (pass === 7) break;
      ex *= clamp(Math.pow(R / e.hx, 1.3), 0.6, 1.6); ey *= clamp(Math.pow(Hh / e.hy, 1.3), 0.6, 1.6); oy -= e.cy * 0.8; }
    const { leaves, fronds, ribLines } = LY;

    // branches: stem -> 3 thin curving secondaries -> curving twigs, one per frond -> a short midrib into each frond. Plus a small heart body.
    const Bb = new Builder(), bc = col.clone().multiplyScalar(0.95), rb = rng(o.seed * 31 + 3);
    const curvy = (A, Bp, bend) => { const d = Bp.clone().sub(A), side = d.clone().cross(V(rb() - 0.5, 0.2, rb() - 0.5)).normalize().multiplyScalar(bend * d.length());
      return new THREE.CatmullRomCurve3([A, A.clone().lerp(Bp, 0.33).add(side), A.clone().lerp(Bp, 0.68).addScaledVector(side, -0.7).add(V(0, 0.03, 0)), Bp]); };
    const groups = [[], [], []]; fronds.forEach((f, i) => { const k = f.Pc.x < -0.25 * R ? 0 : f.Pc.x > 0.25 * R ? 2 : 1; groups[k].push(i); });
    groups.forEach((gi, k) => { if (!gi.length) return;
      const cen = gi.reduce((a, i) => a.add(fronds[i].B), V(0, 0, 0)).multiplyScalar(1 / gi.length);
      const sec = stem.clone().lerp(cen, 0.45).add(V((rb() - 0.5) * 0.06, 0.04, (rb() - 0.5) * 0.06));
      addTube(Bb, curvy(stem, sec, 0.14), 0.056, 0.036, bc, { nl: 12, ns: 6, seed: 20 + k });
      gi.forEach((fi) => { const f = fronds[fi];
        addTube(Bb, curvy(sec, f.B, 0.18), 0.034, 0.017, bc, { nl: o.lite ? 7 : 10, ns: 5, seed: 40 + fi });
        }); });
    // visible crystal ribs (the frond's own little branches), sitting just proud of the leaves like the painted branch-veins
    ribLines.forEach((rl, i) => { const s0 = rl.B.clone().addScaledVector(rl.pn, 0.03 * R), e = s0.clone().addScaledVector(rl.ax, rl.rl * 0.8);
      addTube(Bb, new THREE.CatmullRomCurve3([s0, s0.clone().lerp(e, 0.5).addScaledVector(rl.pn, 0.02 * R), e]), 0.02, 0.006, bc.clone().lerp(new THREE.Color(1, 1, 1), 0.15), { nl: 4, ns: 4, seed: 80 + i, capEnd: 0.02 }); });
    const ico = new THREE.IcosahedronGeometry(1, 1), ip = ico.attributes.position, dark = new THREE.Color(0.7, 0.66, 0.66);
    const hc = V(0, fronds.reduce((a, f) => a + f.B.y, 0) / fronds.length, 0), m4 = new THREE.Matrix4().compose(hc.clone().add(V(0, 0.1 * R, 0)), new THREE.Quaternion(), V(0.2 * R, 0.18 * R, 0.2 * R));
    for (let i = 0; i < ip.count; i += 3) Bb.tri(V(0, 0, 0).fromBufferAttribute(ip, i).applyMatrix4(m4), V(0, 0, 0).fromBufferAttribute(ip, i + 1).applyMatrix4(m4), V(0, 0, 0).fromBufferAttribute(ip, i + 2).applyMatrix4(m4), [0.2, 0.2], [0.2, 0.2], [0.2, 0.2], dark);
    if (o.sink) { const K = o.sink, off = o.offset || V(0, 0, 0), M0 = new THREE.Matrix4(), X0 = V(0, 0, 0), Y0 = V(0, 0, 0), Z0 = V(0, 0, 0);
      const b0 = Bb.p; for (let i = 0; i < b0.length; i += 3) { b0[i] += off.x; b0[i + 1] += off.y; b0[i + 2] += off.z; }
      ['p', 'b', 'l', 'c', 'u'].forEach((k) => { for (const x of Bb[k]) K.Bb[k].push(x); });
      const first = K.leaves.length;
      leaves.forEach((l) => { Y0.copy(l.dir); X0.copy(l.n).cross(Y0); if (X0.lengthSq() < 1e-6) X0.set(1, 0, 0); X0.normalize(); Z0.crossVectors(X0, Y0).normalize(); M0.makeBasis(X0, Y0, Z0);
        K.leaves.push(Object.assign(l, { q: new THREE.Quaternion().setFromRotationMatrix(M0), off, stem: stem.clone(), growth: o.growth })); });
      K.crowns.push({ first, count: leaves.length, R, Hh, off, hc: hc.clone().add(off) });
      const hot = col.clone().lerp(new THREE.Color(1, 1, 1), 0.2), hcol = col.clone().lerp(new THREE.Color(1, 0.92, 0.75), 0.18);
      K.halo.push({ p: off.clone().add(V(0, 0, -0.2 * R)), s: Math.max(R * 3.4, Hh * 3.2) * (o.haloK || 1), c: hcol });
      fronds.forEach((f) => K.glow.push({ p: f.Pc.clone().addScaledVector(f.n, 0.12 * R).add(off), s: R * (o.lite ? 0.6 : 0.8), c: hot }));
      K.glow.push({ p: hc.clone().add(V(0, 0.15 * R, 0)).add(off), s: R * 0.8, c: hot });
      return { leaves: leaves.length, fronds: fronds.length, stem: stem.clone().add(off) }; }
    const bMesh = new THREE.Mesh(Bb.geo(), makeCrystalMaterial({ color: col, em: 0.42, edge: 0.4, lines: 0.12, glint: 0.3 })); bMesh.name = 'crownBranches'; inner.add(bMesh);

    // leaves
    const geo = leafGeometry(o.seed * 3 + 1), mat = makeCrystalMaterial({ color: col, em: o.em !== undefined ? o.em : 0.42, web: 1, edge: 0.5, hot: 0.7, fres: 0.14, amb: 0.4, deep: o.deep });
    const im = new THREE.InstancedMesh(geo, mat, leaves.length); im.name = 'crownLeaves'; im.frustumCulled = false;
    const data = new Float32Array(leaves.length * 3); leaves.forEach((l, i) => { data[i * 3] = l.inner; data[i * 3 + 1] = l.tint; data[i * 3 + 2] = l.gl; });
    geo.setAttribute('iData', new THREE.InstancedBufferAttribute(data, 3)); inner.add(im);
    const M = new THREE.Matrix4(), S = V(1, 1, 1), X = V(0, 0, 0), Y = V(0, 0, 0), Z = V(0, 0, 0);
    leaves.forEach((l) => { Y.copy(l.dir); X.copy(l.n).cross(Y); if (X.lengthSq() < 1e-6) X.set(1, 0, 0); X.normalize(); Z.crossVectors(X, Y).normalize(); M.makeBasis(X, Y, Z); l.q = new THREE.Quaternion().setFromRotationMatrix(M); });

    // glow: halo sprite + one Points draw with a soft glow card per frond and one for the heart (cheap selective "bloom")
    const hcol = col.clone().lerp(new THREE.Color(1, 0.92, 0.75), 0.18);
    let halo = null, gl = null;
    if (o.halo) { halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(hcol), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8, fog: false }));
      halo.scale.set(R * 3.4, Hh * 3.2, 1); halo.position.set(0, 0, -0.2 * R); halo.renderOrder = -1; halo.name = 'crownHalo'; halo.userData.s0 = halo.scale.clone(); inner.add(halo); }
    if (o.glow) { const pts = [], cols = [], hot = col.clone().lerp(new THREE.Color(1, 1, 1), 0.2);
      fronds.forEach((f) => { const q = f.Pc.clone().addScaledVector(f.n, 0.12 * R); pts.push(q.x, q.y, q.z); cols.push(hot.r, hot.g, hot.b); });
      pts.push(hc.x, hc.y + 0.15 * R, hc.z); cols.push(hot.r, hot.g, hot.b);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
      gl = new THREE.Points(g, new THREE.PointsMaterial({ size: R * 2.0, map: haloTex(new THREE.Color(1, 1, 1)), vertexColors: true, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, opacity: 0.32, sizeAttenuation: true, fog: false }));
      gl.name = 'crownGlow'; gl.renderOrder = 5; gl.frustumCulled = false; inner.add(gl); }

    function setPoints(f) { f = clamp(f, 0, 1); const g = 1 + o.growth * f;
      leaves.forEach((l, i) => { const show = l.tier < 0.8 ? 1 : clamp((f - (l.tier - 0.8) / 0.2 * 0.7) / 0.3, 0, 1);
        const L = l.L * lerp(0.001, 1, show); S.set(L * l.w, L, L * l.w); M.compose(X.copy(l.p), l.q, S); im.setMatrixAt(i, M); });
      im.instanceMatrix.needsUpdate = true; inner.scale.setScalar(g); inner.position.copy(stem).multiplyScalar(1 - g); grp.userData.pointsFraction = f; }
    const tris = geo.attributes.position.count / 3 * leaves.length + bMesh.geometry.attributes.position.count / 3 + (halo ? 2 : 0) + (gl ? fronds.length * 2 + 2 : 0);
    grp.userData = { setPoints, stem, fit: LY.ext, radius: R, height: o.height, leaves: leaves.length, fronds: fronds.length, tris, drawCalls: 2 + (halo ? 1 : 0) + (gl ? 1 : 0), materials: [mat, bMesh.material], halo, glow: gl, pointsFraction: 0 };
    setPoints(o.pointsFraction);
    return grp; }

  /* main limb: 3-colour braid from `from` to `to` (tree-local), dominant colour index thicker; then a crown at crownCentre */
  function createCrystalBranch(o) {
    const B = new Builder(); const C = o.colors.map((c) => new THREE.Color(c));
    const dom = o.dominant !== undefined ? o.dominant : 0;
    createBraid(B, o.points, { colors: C, radii: C.map((c, i) => i === dom ? [0.07, 0.055] : [0.05, 0.034]), hr: o.hr || 0.06, turns: o.turns, tipTaper: 0.1 });
    const m = new THREE.Mesh(B.geo(), makeCrystalMaterial({ color: 0xffffff, glow: 0xfff0dc, rim: 0xffffff, em: 0.3, edge: 0.3, lines: 0.12, glint: 0.4 }));
    m.name = 'limbBraid'; return m; }

  /* world-sized additive glow points (one draw for many halos / glow cards). Size is world units, like a Sprite. */
  const GPVS = `attribute float aSize; attribute vec3 color; varying vec3 vC; uniform float uScale; uniform float uPx;
void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.0); float z = -mv.z;
  if (z < 0.18) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; return; }
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min(aSize * uScale * projectionMatrix[1][1] * uPx / max(0.22, z), 511.0); }`;
  const GPFS = `uniform sampler2D uMap; uniform float uOpacity; varying vec3 vC; void main(){ float a = texture2D(uMap, gl_PointCoord).a; gl_FragColor = vec4(vC * a * uOpacity, 1.0); }`;
  function glowPoints(list, o) { const P = [], C = [], S = [];
    list.forEach((q) => { P.push(q.p.x, q.p.y, q.p.z); C.push(q.c.r, q.c.g, q.c.b); S.push(q.s); });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setAttribute('aSize', new THREE.Float32BufferAttribute(S, 1));
    const m = new THREE.ShaderMaterial({ vertexShader: GPVS, fragmentShader: GPFS, transparent: true, depthWrite: false, depthTest: o.depthTest, blending: THREE.AdditiveBlending,
      uniforms: { uMap: { value: haloTex(new THREE.Color(1, 1, 1)) }, uOpacity: { value: o.opacity }, uScale: { value: 1 }, uPx: { value: 500 } } });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = o.renderOrder || 0; pts.name = o.name; m.userData.o0 = o.opacity;
    const tmp = new THREE.Vector2(); pts.onBeforeRender = (r) => { r.getDrawingBufferSize(tmp); m.uniforms.uPx.value = tmp.y / 2; };
    return pts; }

  /* several crowns of ONE colour merged into 4 draw calls: instanced leaves, merged branches (+ any extra tubes), halo points, glow-card points.
     items: [{ position, height, radius, shape, lite, seed, inward, stem, growth, haloK }]. extra(B) may add side-branch tubes to the branch builder. */
  function createCrownSet(o) {
    const col = new THREE.Color(o.color), K = { Bb: new Builder(), leaves: [], crowns: [], halo: [], glow: [] }, g = new THREE.Group(); g.name = 'crownSet';
    const info = o.items.map((it, i) => createCrystalCrown(Object.assign({ color: o.color, seed: (o.seed || 1) + i * 17, halo: true, glow: true }, it, { sink: K, offset: V(...it.position), pointsFraction: 0 })));
    if (o.extra) o.extra(K.Bb, info);
    const bMesh = new THREE.Mesh(K.Bb.geo(), makeCrystalMaterial({ color: col, em: 0.42, edge: 0.4, lines: 0.12, glint: 0.3 })); bMesh.name = 'crownBranches'; g.add(bMesh);
    const geo = leafGeometry((o.seed || 1) * 3 + 1), mat = makeCrystalMaterial({ color: col, em: 0.42, web: 1, edge: 0.5, hot: 0.7, fres: 0.14, amb: 0.4, deep: o.deep || 0 });
    const L = K.leaves, im = new THREE.InstancedMesh(geo, mat, L.length); im.name = 'crownLeaves'; im.frustumCulled = false;
    const data = new Float32Array(L.length * 3); L.forEach((l, i) => { data[i * 3] = l.inner; data[i * 3 + 1] = l.tint; data[i * 3 + 2] = l.gl; });
    geo.setAttribute('iData', new THREE.InstancedBufferAttribute(data, 3)); g.add(im);
    let halo = null, gl = null;
    if (o.halo !== false) { halo = glowPoints(K.halo, { opacity: 0.8, depthTest: true, renderOrder: -1, name: 'crownHalo' }); g.add(halo); }
    if (o.glow !== false) { gl = glowPoints(K.glow, { opacity: 0.28, depthTest: false, renderOrder: 5, name: 'crownGlow' }); g.add(gl); }
    const M = new THREE.Matrix4(), S = V(1, 1, 1), X = V(0, 0, 0);
    function setPoints(f) { f = clamp(f, 0, 1);
      L.forEach((l, i) => { const gr = 1 + (l.growth || 0) * f, show = l.tier < 0.8 ? 1 : clamp((f - (l.tier - 0.8) / 0.2 * 0.7) / 0.3, 0, 1);
        const len = l.L * lerp(0.001, 1, show) * gr; S.set(len * l.w, len, len * l.w);
        X.copy(l.p).sub(l.stem).multiplyScalar(gr).add(l.stem).add(l.off); M.compose(X, l.q, S); im.setMatrixAt(i, M); });
      im.instanceMatrix.needsUpdate = true; g.userData.pointsFraction = f; }
    const tris = geo.attributes.position.count / 3 * L.length + bMesh.geometry.attributes.position.count / 3 + (halo ? K.halo.length * 2 : 0) + (gl ? K.glow.length * 2 : 0);
    g.userData = { setPoints, crowns: K.crowns, info, leaves: L.length, tris, drawCalls: 2 + (halo ? 1 : 0) + (gl ? 1 : 0), halo, glow: gl, pointsFraction: 0 };
    setPoints(o.pointsFraction || 0); return g; }

  /* full-tree (tree-local, origin on the trunk axis, roots reach y ~ -0.45 if includeRoots). The game keeps its own trunk strands, claw roots and tether
     (createCrystalTree({ includeTrunk: false, includeRoots: false })). v3: 3 main crowns + 2 smaller crowns per colour on thin curving side branches.
     Azimuth: 0 = +X (right from the walkway), 90 = -Z (back), 180 = -X (left), 270 = +Z (toward the walkway); x = r cos az, z = -r sin az.
     t488u layout: mains and side crowns at varied azimuths and heights all the way around, not a flat front plane. Yellow stays on top and dominant.
     combat main 205° / y 2.70 / r 1.90; smalls 160° y 2.08 r 2.55 and 250° y 1.92 r 1.65.
     production main 25° / y 2.55 / r 1.90; smalls 80° y 2.18 r 2.45 and 340° y 1.85 r 1.65.
     beasts main 280° / y 3.12 / r 0.18; smalls 145° y 3.38 r 1.40 and 325° y 3.48 r 1.40. */
  const TREE_LAYOUT = {
    splitY: 1.25,
    combat: { C: [-1.722, 2.70, 0.803], height: 1.38, radius: 0.8, fork: [0.72, 0.32],
      small: [{ C: [-2.396, 2.08, -0.872], height: 0.8, radius: 0.44 }, { C: [-0.564, 1.92, 1.550], height: 0.8, radius: 0.44 }] },
    production: { C: [1.722, 2.55, -0.803], height: 1.38, radius: 0.8, fork: [0.72, 0.32],
      small: [{ C: [0.425, 2.18, -2.413], height: 0.8, radius: 0.44 }, { C: [1.550, 1.85, 0.564], height: 0.8, radius: 0.44 }] },
    beasts: { C: [0.031, 3.12, 0.177], height: 1.8, radius: 1.08, shape: 'teardrop', growth: 0.06, fork: [0.62, 0.62],
      small: [{ C: [-1.147, 3.38, -0.803], height: 0.8, radius: 0.45 }, { C: [1.147, 3.48, 0.803], height: 0.8, radius: 0.45 }] } };
  function createCrystalTree(o) {
    o = Object.assign({ points: { combat: 0, production: 0, beasts: 0 }, seed: 1, colors: { combat: 0xd42a22, production: 0x2f86f0, beasts: 0xf3b52a }, includeTrunk: true, includeRoots: true }, o || {});
    const g = new THREE.Group(), B = new Builder(), Lt = o.layout || TREE_LAYOUT, S = Lt.splitY;
    const cR = new THREE.Color(o.colors.combat), cB = new THREE.Color(o.colors.production), cY = new THREE.Color(o.colors.beasts);
    if (o.includeTrunk !== false) createBraid(B, [V(0, -0.45, 0), V(0, 0.4, 0), V(0, 1.0, 0), V(0, S + 0.08, 0)], { colors: [cR, cB, cY], radii: [[0.1, 0.09], [0.1, 0.09], [0.1, 0.09]], hr: 0.1, turns: 3.0 });
    if (o.includeRoots === 'claws') {
      // game claws (fix_v3): thick, short reach, curl back in toward the trunk and tether; one mesh with the wood
      const AZ = [[160, cR], [232, cR], [104, cY], [284, cY], [20, cB], [308, cB]];
      const RY = [[0.10, 0.42], [0.26, 0.22], [0.34, 0.06], [0.22, -0.02]];
      AZ.forEach(([az, c], i) => { const a = az * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
        const P = [V(ca * 0.10, 0.42, sa * 0.10), ...RY.map(([rr, y]) => V(ca * rr, y, sa * rr))];
        addTube(B, new THREE.CatmullRomCurve3(P), 0.19, 0.11, c, { ns: 7, nl: 12, seed: 70 + i, pw: 0.7, capEnd: 0.14 }); });
    } else if (o.includeRoots !== false) {
      const AZ = [[160, cR], [232, cR], [104, cY], [284, cY], [20, cB], [308, cB]];
      AZ.forEach(([az, c], i) => { const a = az * Math.PI / 180, d = V(Math.cos(a), 0, -Math.sin(a));
        const P = [[0.1, 0.3], [0.3, 0.12], [0.52, -0.02], [0.68, -0.12]].map(([rr, y]) => V(d.x * rr, y, d.z * rr));
        addTube(B, new THREE.CatmullRomCurve3(P), 0.105, 0.055, c, { ns: 7, nl: 10, seed: 70 + i, capEnd: 0.2 }); });
    }
    const crowns = {}, sets = {}; let nCrowns = 0;
    const mk = (key, col, others, seed) => { const L = Lt[key], C = V(...L.C), Hh = L.height / 2;
      const horiz = Math.hypot(C.x, C.z) || 1, dx = C.x / horiz, dz = C.z / horiz;
      const stemM = V(-dx * 0.4 * L.radius, -(key === 'beasts' ? 1.0 : 1.15) * Hh, -dz * 0.4 * L.radius);
      const st = stemM.clone().add(C);
      // main limb leaves the trunk along the crown's azimuth (not a left/right plane) and rises ~30-40 deg into the stem
      const pts = key === 'beasts'
        ? [V(0, S, 0), V(C.x * 0.25, S + 0.35, C.z * 0.25), V(C.x * 0.7, lerp(S, st.y, 0.75), C.z * 0.7), st]
        : [V(0.10 * dx, S, 0.10 * dz), V(0.45 * dx, S + 0.2, 0.45 * dz), st.clone().lerp(V(0.45 * dx, S + 0.2, 0.45 * dz), 0.45).add(V(0, 0.05, 0)), st];
      B_limbs.push({ pts, colors: [new THREE.Color(col), new THREE.Color(others[0]), new THREE.Color(others[1])], hr: key === 'beasts' ? 0.075 : 0.06, turns: key === 'beasts' ? 1.6 : 1.8 });
      const limb = new THREE.CatmullRomCurve3(pts), dark = new THREE.Color(col).multiplyScalar(0.95);
      const items = [{ position: L.C, height: L.height, radius: L.radius, shape: L.shape || 'round', growth: L.growth !== undefined ? L.growth : 0.12, inward: 0, stem: stemM, depth: false }]
        .concat(L.small.map((sm) => { const h = Math.hypot(sm.C[0], sm.C[2]) || 1;
          return { position: sm.C, height: sm.height, radius: sm.radius, lite: true, growth: 0.1, inward: 0, stem: V(-sm.C[0] / h * 0.3 * sm.radius, -1.25 * sm.height / 2, -sm.C[2] / h * 0.3 * sm.radius), haloK: 0.9 }; }));
      const set = createCrownSet({ color: col, seed: o.seed + seed, items, deep: key === 'combat' ? 0.32 : 0.18, halo: o.halo, glow: o.glow,
        extra: (Bb, info) => { L.small.forEach((sm, i) => { const t = L.fork[i], A = limb.getPointAt(t), E = info[i + 1].stem, d = E.clone().sub(A);
          const side = d.clone().cross(V(0, 1, 0)); if (side.lengthSq() < 1e-8) side.set(d.z, 0, -d.x); side.normalize().multiplyScalar(0.12 * d.length() * (i ? -1 : 1));
          const cv = new THREE.CatmullRomCurve3([A, A.clone().lerp(E, 0.3).add(side).add(V(0, 0.05, 0)), A.clone().lerp(E, 0.7).addScaledVector(side, -0.6), E]);
          addTube(Bb, cv, 0.05, 0.03, dark, { nl: 14, ns: 6, seed: 90 + i, capEnd: 0.02 }); }); } });
      g.add(set); sets[key] = set; crowns[key] = set; nCrowns += items.length; set.userData.setPoints(o.points[key] || 0); };
    const B_limbs = [];
    mk('combat', o.colors.combat, [o.colors.production, o.colors.beasts], 3); mk('production', o.colors.production, [o.colors.beasts, o.colors.combat], 7); mk('beasts', o.colors.beasts, [o.colors.combat, o.colors.production], 11);
    B_limbs.forEach((lb) => { const dom = 0; createBraid(B, lb.pts, { colors: lb.colors, radii: lb.colors.map((c, k) => k === dom ? [0.07, 0.055] : [0.05, 0.034]), hr: lb.hr, turns: lb.turns, tipTaper: 0.1 }); });
    const tm = new THREE.Mesh(B.geo(), makeCrystalMaterial({ color: 0xffffff, glow: 0xfff0dc, rim: 0xffffff, em: 0.3, edge: 0.3, lines: 0.12, glint: 0.4 })); tm.name = 'trunkRootsLimbs'; g.add(tm);
    function setPoints(pts) { pts = pts || {}; for (const k in sets) sets[k].userData.setPoints(pts[k] || 0); }
    g.userData = { crowns, sets, layout: Lt, nCrowns, setPoints, wood: tm }; return g; }

  /* glow toggle (cheap selective bloom): ON = frond glow cards visible, halo brighter/bigger, emissive + edge heat up. OFF = plain. */
  function setBloom(obj, on) { obj.traverse((n) => {
    if (n.name === 'crownGlow') n.visible = !!on;
    if (n.name === 'crownHalo') { if (n.material.uniforms && n.material.uniforms.uOpacity) { n.material.uniforms.uOpacity.value = on ? 1.0 : 0.55; n.material.uniforms.uScale.value = on ? 1.2 : 0.9; }
      else { n.material.opacity = on ? 1.0 : 0.55; n.scale.copy(n.userData.s0).multiplyScalar(on ? 1.2 : 0.9); } }
    if (n.material && n.material.uniforms && n.material.uniforms.uEm) { const U = n.material.uniforms; if (U.uEm.base === undefined) { U.uEm.base = U.uEm.value; U.uHot.base = U.uHot.value; }
      U.uEm.value = U.uEm.base * (on ? 1.45 : 0.8); U.uHot.value = on ? 1.3 : 0.15; } }); }

  root.CrystalCrown = { createCrystalCrown, createCrystalBranch, createBraid: (pts, o) => { const B = new Builder(); createBraid(B, pts, o); return new THREE.Mesh(B.geo(), makeCrystalMaterial({ color: 0xffffff })); }, createCrystalTree, createCrownSet, makeCrystalMaterial, leafGeometry, setBloom, TREE_LAYOUT };
})(typeof window !== 'undefined' ? window : globalThis);

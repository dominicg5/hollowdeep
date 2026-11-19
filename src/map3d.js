
/* =====================================================================
   LEDGEVILLE 3D — Three.js renderer: heightmap terrain (raised plateau, the Hollow pit, carved fissures, snowy
   mountains), painted ground textures, sun + soft shadows, haze, instanced billboard homes/trees, night Lumen glow.
   The 2D canvas on top only carries labels/HUD. Falls back to the 2D painter when WebGL is missing.
   ===================================================================== */
const M3 = (() => {
  const P_H = CITY.summitH, PIT = 3800, FOV = 40; const IN = () => CITY.plateauR + 1700; // half-size of the painted inner ground texture (tB)
  // the fine terrain grid now covers all the land (every home, the lowlands round the Ledge): same vertex spacing as before (~9 m) so the summit is unchanged, out to ~12000
  const FIN = (mob) => { const st0 = (2 * IN()) / (mob ? 320 : 400), k = Math.floor((12000 - IN()) / st0), half = IN() + k * st0; return { half, N: Math.round((2 * half) / st0) }; };
  const st = { ok: false, building: false, tris: 0, calls: 0 };
  let renderer, scene, camera, sun, hemi, lumen, lumen2, hazeSpr = [], lumenSpr, ring, ringGlow, terrainMat, bbMat = [], bbMesh = [], lightPts, moleSpr, clouds = [], cv3;
  const grids = []; // [{half, N, step, h:Float32Array}]
  let texA, texB, texC, cCanvas, cState = null, mtGrid = null;
  const T = { x: 0, y: 0, h: P_H }; // smoothed look target
  const v3 = () => new THREE.Vector3();

  /* ---------- height field ---------- */
  function buildMtGrid() { notches = null; mtGrid = new Map(); for (const m of W.mountains) { if (m.type !== 'mountain') continue; const k = Math.floor(m.x / 1000) + ',' + Math.floor(m.y / 1000); (mtGrid.get(k) || mtGrid.set(k, []).get(k)).push(m); } }
  function mtnH(x, y) { const gx = Math.floor(x / 1000), gy = Math.floor(y / 1000); let h = 0;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const L = mtGrid.get((gx + i) + ',' + (gy + j)); if (!L) continue;
      for (const m of L) { const s = m.r * 1.45, dx = x - m.x, dy = y - m.y, d2 = (dx * dx + dy * dy) / (s * s); if (d2 > 9) continue; const hp = m.r * 2.7 * (0.85 + m.seed * 0.3) * (1 + 0.45 * clamp(-m.y / CITY.R, 0, 1));
        h = Math.max(h, hp * Math.exp(-d2 * (1.0 + 0.3 * Math.sin(Math.atan2(dy, dx) * 3 + m.seed * 9)))); } }
    if (h > 1) { // ridged relief so peaks read as rock, not cones
      const rn = (u, v) => 1 - Math.abs(2 * vnoise(u, v) - 1); const r = 0.55 * rn(x / 260, y / 260) + 0.3 * rn(x / 110 + 7, y / 110) + 0.15 * rn(x / 47, y / 47 + 3);
      h *= 0.62 + 0.55 * r; }
    return h; }
  // ridged multifractal (0..~1): sharp crests, weighted octaves
  // rounded-crest variant (a parabolic crest, not a knife edge): the Hollow's rim and walls read as weathered ridges, not saw-teeth on the mesh
  function ridgedS(x, y, oct) { let sum = 0, amp = 0.6, fr = 1; for (let i = 0; i < oct; i++) { const v = 2 * vnoise(x * fr + i * 17.3, y * fr - i * 9.1) - 1; let n = 1 - v * v; n = n * n * (3 - 2 * n); sum += n * amp; fr *= 2.07; amp *= 0.42; } return sum; }
  function ridged(x, y, oct) { let sum = 0, amp = 0.55, fr = 1, w = 1; for (let i = 0; i < oct; i++) { let n = 1 - Math.abs(2 * vnoise(x * fr + i * 17.3, y * fr - i * 9.1) - 1); n *= n; n *= w; w = clamp(n * 1.7, 0, 1); sum += n * amp; fr *= 2.07; amp *= 0.5; } return sum; }
  function fbm(x, y, oct) { let sum = 0, amp = 0.5, fr = 1; for (let i = 0; i < oct; i++) { sum += (vnoise(x * fr + i * 5.7, y * fr + i * 3.1) - 0.5) * amp; fr *= 2.03; amp *= 0.5; } return sum; }
  // crevices that reach the Hollow keep cutting: notches/channels through the lip and down the pit wall
  let notches = null;
  function buildNotches() { notches = []; for (const c of W.cracks || []) { const p = c.pts[0]; if (!p || hollowDist(p[0], p[1]) > 90) continue; notches.push({ a: Math.atan2(p[1], p[0]), w: Math.max(40, c.ws[0] * 1.1), deep: c.wide ? 1 : 0.6 }); } }
  function heightAt(x, y) {
    if (!notches) buildNotches();
    const r = Math.hypot(x, y), a = Math.atan2(y, x);
    // domain-warped outline: the summit edge wanders organically instead of a clean cylinder
    const wx = x + 900 * fbm(x / 2600 + 3.1, y / 2600 - 1.7, 3), wy = y + 900 * fbm(x / 2600 - 7.3, y / 2600 + 4.2, 3);
    const rw = Math.hypot(wx, wy), aw = Math.atan2(wy, wx), pr = plateauR(aw) * (1 + 0.06 * fbm(Math.cos(aw) * 2 + 9, Math.sin(aw) * 2, 3));
    const low = 40 + 90 * vnoise(x / 1900 + 5, y / 1900 - 3) + 35 * vnoise(x / 650, y / 650 + 9) + 120 * Math.max(0, fbm(x / 1400 + 2, y / 1400, 4));
    const d = rw - pr; let h, rock = 0;
    // the summit towers over the lowlands: tall layered cliff bands and sheer faces on several sides, foothill ramps elsewhere
    const cn = vnoise(Math.cos(aw) * 1.7 + 5.5, Math.sin(aw) * 1.7 + 2.5), cliffy = smooth01(0.36, 0.52, cn);
    const cwid = 520 + 260 * vnoise(Math.cos(aw) * 4 + 2, Math.sin(aw) * 4), slopeW = cwid + (1 - cliffy) * (2300 + 1300 * vnoise(Math.cos(aw) * 3 + 1, Math.sin(aw) * 3));
    if (d <= 0) h = P_H + 14 * vnoise(x / 500, y / 500) + 180 * Math.max(0, fbm(x / 900, y / 900 + 7, 3)) * smooth01(-1300, 0, d);
    else if (d < slopeW) { const u = d / slopeW;
      // cliff: three sheer bands with narrow ledges between them (the band edges wander)
      const uc = clamp(d / cwid, 0, 1), nb = 3, b = uc * nb + 0.25 * fbm(x / 500, y / 500, 2), bi = Math.floor(b), bf = b - bi;
      const cl = 1 - clamp((bi + smooth01(0.2, 0.75, bf)) / nb, 0, 1);
      const ramp = Math.pow(1 - u, 1.6);
      const prof = cliffy * cl + (1 - cliffy) * ramp;
      const hills = (1 - cliffy) * Math.sin(Math.PI * u) * (420 * (0.5 + fbm(x / 800 + 4, y / 800, 4)) + 360 * ridged(x / 1400, y / 1400, 3));
      h = low + (P_H - low) * prof + hills; if (cliffy > 0.5) rock = Math.max(rock, 300 * (1 - u)); }
    else h = low;
    // craggy peaks and shoulders on the rim of the plateau, and rocky buttresses/spurs radiating down from it
    const zone = smooth01(-900, 200, d) * (1 - smooth01(1200, 5200, d));
    if (zone > 0) { const ang = (A) => ridged(A * (CITY.plateauR / 1150), d / 2300 + 0.35 * fbm(x / 1800, y / 1800, 2), 4);
      const sw = smooth01(2.5, Math.PI, Math.abs(aw)), n = sw > 0 ? ang(aw) * (1 - sw) + ang(aw < 0 ? aw + TAU : aw) * sw : ang(aw);
      const crag = smooth01(0.45, 0.7, vnoise(Math.cos(aw) * 2.4 + 3, Math.sin(aw) * 2.4 - 6));
      const sp = zone * Math.pow(n, 1.5) * (900 + 700 * cliffy) * (0.6 + 0.8 * crag); h += sp * (1 - 0.6 * smooth01(0, -700, d)); rock = Math.max(rock, sp); }
    const hr = hollowR(a);
    if (r < hr + 2) { // the pit: broken, irregular strata ledges of varied depth (not concentric rings), rough rock between
      const g = clamp(1 - r / hr, 0, 1), TT = 8, warp = 1.3 * fbm(x / 1100 + 3, y / 1100 - 2, 3) + 0.45 * Math.sin(a * 3 + g * 6 + 1.3) + 0.3 * Math.sin(a * 7 - g * 4);
      const gt = g * TT + warp * smooth01(0, 0.08, g), fi = Math.floor(gt), fr = gt - fi, sh = 0.35 + 0.45 * vnoise(fi * 3.7 + Math.cos(a) * 2, Math.sin(a) * 2 + fi);
      const step = clamp((fi + smooth01(sh, 1, fr)) / TT, 0, 1), brk = smooth01(0.3, 0.62, vnoise(x / 760 + fi * 1.7, y / 760 - fi)), base = (Math.pow(step, 0.8) * brk + Math.pow(g, 0.8) * (1 - brk)) * 0.86 + Math.pow(g, 0.8) * 0.14; const base2 = Math.max(base, (1 - smooth01(0.06, 0.16, g)) * Math.pow(g, 0.85) * 1.15); // no flat terrace at the lip: grass and rock break straight over the edge
      h = P_H - PIT * base2 - 30 * g - 95 * ridgedS(x / 470, y / 470, 2) * smooth01(0, 0.09, g) * (1 - smooth01(0.85, 1, g)); }
    // fissures: carved trenches; where they meet the Hollow they keep cutting down the pit wall as channels
    // (fissures are no longer a coarse heightfield trench: every crack is a real crevice mesh - rock walls with strata dropping into darkness - and the ground is cut away over it; see buildCrevices)
    if (r < hr + 60 && r > hr - 2200) for (const nt of notches) { let da = a - nt.a; da = ((da + 3 * Math.PI) % TAU) - Math.PI; const dist = Math.abs(da) * r, into = hr - r, wd = nt.w * (0.55 + Math.max(0, into) / 900);
      if (dist > wd) continue; const fl = P_H - 460 * nt.deep - Math.max(0, into) * 1.25, s0 = Math.pow(smooth01(0, 1, dist / wd), 1.3) * (1 - smooth01(-60, 0, -into) * 0);
      h = Math.min(h, fl + (h - fl) * s0); rock = Math.max(rock, 120); }
    let mh = mtnH(x, y) + rock * 0.55;
    // the world's edge rises into a wall of rocky peaks fading into haze (no sea, no coastline)
    const eg = smooth01(CITY.R - 700, CITY.R + 900, r); if (eg > 0) { const rn = (u, v) => 1 - Math.abs(2 * vnoise(u, v) - 1); { const q = 0.6 * rn(x / 420, y / 420) + 0.4 * rn(x / 150 + 3, y / 150); mh = Math.max(mh, eg * (260 + 760 * q * q)); } }
    if (typeof GRAND !== 'undefined') { const c = GRAND.carve(x, y, h + mh - rock * 0.55, mh); return routeCarve(x, y, c); } // the Lumen Tree's streams, falls and lake
    return routeCarve(x, y, [h + mh - rock * 0.55, mh]);
  }
  // terrain probe used when placing homes (height + slope), before or after the meshes exist
  // the Silverseam climb: a ledge route carved up the summit cliff above the Silverseam portaledge - broad ledges joined by short
  // climbable rock pitches (~35 m each), cut into the face so the lowlands (your Ledge) and the summit (Ledgeville, the Grand Tree) connect
  const SSR = { a: [-2656, 6952], b: [-2832, 4376], h0: 173, h1: 2022, N: 13, w: 44, bank: 80, ledge: 0.68 };
  function routeCarve(x, y, hm) { const [ax, ay] = SSR.a, dx = SSR.b[0] - ax, dy = SSR.b[1] - ay, L2 = dx * dx + dy * dy, t = ((x - ax) * dx + (y - ay) * dy) / L2; if (t < -0.08 || t > 1.08) return hm;
    const tc = clamp(t, 0, 1), d = Math.hypot(x - (ax + dx * tc), y - (ay + dy * tc)), W = SSR.w + SSR.bank; if (d > W) return hm;
    const u = tc * SSR.N, k = Math.floor(u), f = u - k, face = k < SSR.N ? smooth01(SSR.ledge, 1, f) : 0, ht = SSR.h0 + (SSR.h1 - SSR.h0) * Math.min(1, (k + face) / SSR.N);
    const wt = smooth01(W, SSR.w, d) * smooth01(-0.08, 0, t) * smooth01(1.08, 1, t), h = hm[0] + (ht - hm[0]) * wt, rk = f > SSR.ledge && f < 0.995 && k < SSR.N ? 300 : 30;
    return [h, hm[1] + (rk - hm[1]) * wt]; }
  function ground(x, y) { if (!mtGrid) buildMtGrid(); const e = 30, h = heightAt(x, y)[0], hx = heightAt(x + e, y)[0], hy = heightAt(x, y + e)[0]; return { h, slope: Math.hypot(hx - h, hy - h) / e }; }
  function buildGrid(half, N, hide) {
    const g = { half, N, step: (2 * half) / N, h: new Float32Array((N + 1) * (N + 1)), m: new Float32Array((N + 1) * (N + 1)) };
    for (let iy = 0; iy <= N; iy++) for (let ix = 0; ix <= N; ix++) { const x = -half + ix * g.step, y = -half + iy * g.step; const q = iy * (N + 1) + ix;
      if (hide && Math.abs(x) < hide - 2 * g.step && Math.abs(y) < hide - 2 * g.step) { g.h[q] = -4000; continue; }
      const [h, mh] = heightAt(x, y); g.h[q] = h - (hide && Math.abs(x) < hide + g.step && Math.abs(y) < hide + g.step ? 25 : 0); g.m[q] = clamp(mh / 320, 0, 1); }
    return g;
  }
  function gridH(g, x, y) { const fx = (x + g.half) / g.step, fy = (y + g.half) / g.step; const ix = clamp(Math.floor(fx), 0, g.N - 1), iy = clamp(Math.floor(fy), 0, g.N - 1), u = clamp(fx - ix, 0, 1), v = clamp(fy - iy, 0, 1), N1 = g.N + 1;
    const a = g.h[iy * N1 + ix], b = g.h[iy * N1 + ix + 1], c = g.h[(iy + 1) * N1 + ix], d = g.h[(iy + 1) * N1 + ix + 1];
    // PlaneGeometry splits each quad along the (ix,iy+1)-(ix+1,iy) diagonal
    if (u + v <= 1) return a + (b - a) * u + (c - a) * v; return d + (c - d) * (1 - u) + (b - d) * (1 - v); }
  function meshH(x, y) { const gi = grids[1]; if (gi && Math.abs(x) < gi.half && Math.abs(y) < gi.half) return gridH(gi, x, y); return grids[0] ? gridH(grids[0], x, y) : 0; }
  // the fine grid's outer band eases onto the coarse grid's surface so the two meet without a step (nav saw the old seam as a cliff)
  function edgeBlend(g, o) { const N1 = g.N + 1, band = 8 * g.step; for (let iy = 0; iy <= g.N; iy++) for (let ix = 0; ix <= g.N; ix++) { const x = -g.half + ix * g.step, y = -g.half + iy * g.step, e = g.half - Math.max(Math.abs(x), Math.abs(y)); if (e >= band) continue; const w = smooth01(0, band, e), q = iy * N1 + ix; g.h[q] = gridH(o, x, y) + (g.h[q] - gridH(o, x, y)) * w; } }
  // the fine grid as T x T tiles (normals from the whole grid, so no lighting seams) - tiles out of view are culled
  function makeTerrainTiles(g, T) { const full = new THREE.PlaneGeometry(2 * g.half, 2 * g.half, g.N, g.N); full.rotateX(-Math.PI / 2); const fp = full.attributes.position; for (let i = 0; i < fp.count; i++) fp.setY(i, g.h[i]); full.computeVertexNormals();
    const fn = full.attributes.normal, fu = full.attributes.uv, N1 = g.N + 1, out = [], per = Math.ceil(g.N / T);
    for (let ty = 0; ty < T; ty++) for (let tx = 0; tx < T; tx++) { const x0 = tx * per, y0 = ty * per, x1 = Math.min(g.N, x0 + per), y1 = Math.min(g.N, y0 + per); if (x0 >= x1 || y0 >= y1) continue; const nx = x1 - x0 + 1, ny = y1 - y0 + 1, n = nx * ny;
      const P = new Float32Array(n * 3), Nn = new Float32Array(n * 3), UV = new Float32Array(n * 2), M = new Float32Array(n), idx = [];
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const s0 = (y0 + j) * N1 + (x0 + i), d = j * nx + i; P[d * 3] = fp.getX(s0); P[d * 3 + 1] = fp.getY(s0); P[d * 3 + 2] = fp.getZ(s0); Nn[d * 3] = fn.getX(s0); Nn[d * 3 + 1] = fn.getY(s0); Nn[d * 3 + 2] = fn.getZ(s0); UV[d * 2] = fu.getX(s0); UV[d * 2 + 1] = fu.getY(s0); M[d] = g.m[s0]; }
      for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; idx.push(a, c, b, c, d, b); } // PlaneGeometry's own split (a-c-b, c-d-b), so meshH matches
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(Nn, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(UV, 2)); geo.setAttribute('aMt', new THREE.BufferAttribute(M, 1)); geo.setIndex(idx); geo.computeBoundingSphere(); geo.computeBoundingBox();
      const mesh = new THREE.Mesh(geo, terrainMat); mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = 'terrainTile'; out.push(mesh); }
    full.dispose(); return out; }
  /* ---------- crevices: every crack on the map is a real cut - the ground is masked away over it (tK) and rock walls with strata drop into darkness ---------- */
  const CRV = { mesh: null, maskCv: null, tex: null, win: null, depth: [] };
  function crevDepth(c, i) { const w = c.ws[i], tip = Math.min(1, i / 3, (c.pts.length - 1 - i) / 4); return (c.wide ? 720 : clamp(w * 7, 60, 420)) * (0.35 + 0.65 * clamp(tip, 0, 1)); }
  function strataTex() { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 512; const g = cv.getContext('2d'); let sd = 31; const rn = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    g.fillStyle = '#7d7466'; g.fillRect(0, 0, 256, 512); let y = 0; // bedded layers with wavy, uneven edges and gentle tone changes (no hard stripes)
    while (y < 512) { const h = 14 + rn() * 40, v = 104 + rn() * 34 | 0, wm = rn() < 0.3, ph = rn() * 6, a1 = 2 + rn() * 5; g.fillStyle = wm ? `rgb(${v + 14},${v - 2},${v - 20})` : `rgb(${v},${v - 5},${v - 14})`; g.beginPath(); g.moveTo(0, y + a1 * Math.sin(ph)); for (let x = 0; x <= 256; x += 8) g.lineTo(x, y + a1 * Math.sin(ph + x / 256 * 6.283 * 2) + (rn() - 0.5) * 2); for (let x = 256; x >= 0; x -= 8) g.lineTo(x, y + h + a1 * Math.sin(ph + 1 + x / 256 * 6.283 * 2) + (rn() - 0.5) * 2); g.closePath(); g.fill();
      g.fillStyle = 'rgba(30,24,18,.28)'; g.beginPath(); for (let x = 0; x <= 256; x += 8) g.lineTo(x, y + h + a1 * Math.sin(ph + 1 + x / 256 * 6.283 * 2) - 1.5); g.lineTo(256, y + h + 3); g.lineTo(0, y + h + 3); g.fill(); y += h; }
    for (let k = 0; k < 900; k++) { const q = 70 + rn() * 90 | 0; g.fillStyle = `rgba(${q},${q - 5},${q - 12},${0.12 + rn() * 0.2})`; g.beginPath(); g.ellipse(rn() * 256, rn() * 512, 2 + rn() * 12, 1 + rn() * 5, rn() * 3, 0, 6.3); g.fill(); } // weathered blotches and pits
    for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(${70 + rn() * 30 | 0},${96 + rn() * 30 | 0},${44 + rn() * 20 | 0},${0.25 + rn() * 0.3})`; g.beginPath(); g.ellipse(rn() * 256, rn() * 512, 3 + rn() * 10, 2 + rn() * 4, 0, 0, 6.3); g.fill(); } // moss and lichen in the joints
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); return t; }
  function buildCrevices() { if (CRV.mesh) { scene.remove(CRV.mesh); CRV.mesh.geometry.dispose(); }
    const pos = [], col = [], uv = [], idx = []; let sd = 3; const rn = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    // wall profile across the crack, from the left lip down to the floor and up to the right lip: [offset as a fraction of the half-width (+ extra units), depth fraction]
    const PROF = [[1.0, 3.5, -1], [1.0, 0, 0.012], [0.96, 0, 0.035], [0.9, 0, 0.08], [0.83, 0, 0.17], [0.74, 0, 0.3], [0.64, 0, 0.46], [0.52, 0, 0.68], [0.36, 0, 1]]; // a grassy rounded lip that overhangs a little, then rock bulging and receding down into the dark
    for (const c of W.cracks || []) { const n = c.pts.length; if (n < 2) continue; let arc = 0, prev = -1;
      for (let i = 0; i < n; i++) { const p = c.pts[i], a = c.pts[Math.max(0, i - 1)], b = c.pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l; if (i) arc += Math.hypot(p[0] - c.pts[i - 1][0], p[1] - c.pts[i - 1][1]);
        if (hollowDist(p[0], p[1]) < 30) { prev = -1; continue; } // inside the Hollow mouth: its notch carries on down the pit wall
        const hw = Math.max(3, c.ws[i] / 2), D = crevDepth(c, i), base = pos.length / 3;
        for (const sgn of [-1, 1]) { const pr = sgn < 0 ? PROF : PROF.slice().reverse(), top = meshH(p[0] + nx * sgn * (hw + 1), p[1] + ny * sgn * (hw + 1)); for (const [f, ex, dz] of pr) { const mid = dz > 0.02 && dz < 0.99, rel = mid ? (vnoise(arc / 22 + sgn * 7, dz * 5) - 0.5) * 0.5 + (vnoise(arc / 7, dz * 14 + 3) - 0.5) * 0.18 : 0, o = sgn * (hw * f * (1 + rel) + ex);
            const yy = dz < 0 ? meshH(p[0] + nx * o, p[1] + ny * o) - 0.5 : /* the lip edge tucks just under the ground (at +0.35 it showed as a thin black line along both sides) */ top - 1.6 - D * dz + (mid ? (vnoise(arc / 15, dz * 9) - 0.5) * D * 0.05 : 0), k = Math.pow(clamp(dz, 0, 1), 0.45), br = (1 - 0.9 * k) * (0.85 + 0.3 * vnoise(arc / 9, dz * 11 + 1));
            let c3 = [br, br * 0.97, br * 0.93]; if (dz < 0) c3 = [0.44, 0.58, 0.26]; else if (dz < 0.02) c3 = [0.5, 0.56, 0.32]; else { const fg = clamp((dz - 0.3) / 0.7, 0, 1) * 0.85; c3 = c3.map((v, q) => v * (1 - fg) + [0.05, 0.06, 0.09][q] * fg); if (dz < 0.1) c3 = c3.map((v, q) => v * 0.7 + [0.4, 0.5, 0.26][q] * 0.3); } // grass on the lip, moss under it, fog-dark depths
            pos.push(p[0] + nx * o, yy, p[1] + ny * o); col.push(c3[0], c3[1], c3[2]); uv.push(arc / 70, (top - yy) / 90); } }
        const m = PROF.length * 2; if (prev >= 0) for (let q = 0; q + 1 < m; q++) { const a0 = prev + q, b0 = prev + q + 1, c0 = base + q, d0 = base + q + 1; idx.push(a0, c0, b0, b0, c0, d0); }
        const endHere = i === n - 1 || hollowDist(c.pts[i + 1][0], c.pts[i + 1][1]) < 30; if (prev < 0 || endHere) for (let q = 1; q + 1 < m / 2; q++) { const a0 = base + q, b0 = base + q + 1, c0 = base + m - 1 - q, d0 = base + m - 2 - q; idx.push(a0, b0, c0, b0, d0, c0); } /* end caps: a rock wall closes each end of the cut (no open, see-through ends) */
        prev = base; } }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals(); geo.computeBoundingSphere();
    const mat = new THREE.MeshLambertMaterial({ map: strataTex(), vertexColors: true, side: THREE.DoubleSide }); mat.polygonOffset = true; mat.polygonOffsetFactor = -1; mat.polygonOffsetUnits = -2; CRV.mesh = new THREE.Mesh(geo, mat); CRV.mesh.name = 'crevices'; CRV.mesh.receiveShadow = true; CRV.mesh.castShadow = true; /* the walls shade their own depths */ scene.add(CRV.mesh);
    CRV.maskCv = document.createElement('canvas'); CRV.maskCv.width = CRV.maskCv.height = 2048; CRV.tex = new THREE.CanvasTexture(CRV.maskCv); CRV.tex.flipY = false; CRV.tex.generateMipmaps = false; CRV.tex.minFilter = THREE.LinearFilter; CRV.win = null; }
  // ground including the crevices: inside a crack the floor lies its depth below the (cut-away) ground surface
  function groundH(x, y) { const h = meshH(x, y), cell = 160, gx = Math.floor(x / cell), gy = Math.floor(y / cell); let best = 1e9, bw = 0; if (!W.crackGrid) return h;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const arr = W.crackGrid.get((gx + i) + ',' + (gy + j)); if (!arr) continue; for (const s of arr) { const [d, t] = distSeg(x, y, s.x1, s.y1, s.x2, s.y2), w = s.w1 + (s.w2 - s.w1) * t, e = d - Math.max(6, w) / 2; if (e < best) { best = e; bw = w; } } }
    if (best >= 0) return h; const D = bw > 60 ? 720 : clamp(bw * 7, 60, 420); return h - 1.6 - D * clamp(-best / Math.max(3, bw / 2) * 1.6, 0, 1); }
  // the ground-cut mask: the cracks painted (true width) into a 2048 px window (~4 units a pixel) round the view, repainted as the view moves
  function crevMask(cx, cy, S) { const U = terrainMat.userData.U; S = S || 8000; if (!CRV.maskCv) return; if (CRV.win && CRV.win[2] === S && Math.hypot(cx - CRV.win[0], cy - CRV.win[1]) < S * 0.19) return; /* close up (Explore) a 3000-unit window: ~1.5 units a texel, so the cut hugs the rock walls instead of leaving dark slits along the lips */ const x0 = Math.round(cx - S / 2), y0 = Math.round(cy - S / 2), k = 2048 / S, g = CRV.maskCv.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#000'; g.fillRect(0, 0, 2048, 2048); g.setTransform(k, 0, 0, k, -x0 * k, -y0 * k); g.lineCap = 'round'; g.lineJoin = 'round';
    pathsVis(x0, y0, S);
    g.strokeStyle = '#f00';
    for (const c of W.cracks || []) { const P = c.pts; let inb = false; for (const p of P) if (p[0] > x0 - 200 && p[0] < x0 + S + 200 && p[1] > y0 - 200 && p[1] < y0 + S + 200) { inb = true; break; } if (!inb) continue;
      for (let i = 0; i + 1 < P.length; i++) { if (hollowDist(P[i][0], P[i][1]) < 30) continue; const endA = i === 0 || hollowDist(P[i - 1][0], P[i - 1][1]) < 30, endB = i + 2 >= P.length || hollowDist(P[i + 2][0], P[i + 2][1]) < 30; g.lineCap = endA || endB ? 'butt' : 'round'; g.lineWidth = Math.max(5, (c.ws[i] + c.ws[i + 1]) / 2 - 1.5); g.beginPath(); g.moveTo(P[i][0], P[i][1]); g.lineTo(P[i + 1][0], P[i + 1][1]); g.stroke(); } }
    CRV.tex.needsUpdate = true; U.tK.value = CRV.tex; U.uK.value.set(x0, y0, S, S); CRV.win = [cx, cy, S]; }
  /* ---------- worn footpaths: real ground - a dished dirt ribbon (with scattered cobbles; the Lumen Tree's way fully cobbled) laid into the terrain, which is cut away
     under the path's core (tK green) so the dip shows; soft alpha edges into the grass. Data: Explore.allPaths() = [kind, x0, y0, x1, y1, ...] (kind 1 = cobbled) ---------- */
  const PTH = { HW: 12, DIP: 0.55, list: [], hash: new Map(), B: 160, chunks: [] };
  function pathDip(x, y) { if (!PTH.list.length) return 0; const B = PTH.B, bx = Math.floor(x / B), by = Math.floor(y / B), L = PTH.hash.get(bx * 100003 + by); if (!L) return 0; let d2 = 1e9;
    for (const sgi of L) { const sg = PTH.segs[sgi], ax = sg[0], ay = sg[1], dx = sg[2] - ax, dy = sg[3] - ay, l2 = dx * dx + dy * dy || 1, t = clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1), ex = ax + dx * t - x, ey = ay + dy * t - y; d2 = Math.min(d2, ex * ex + ey * ey); }
    const d = Math.sqrt(d2) / PTH.HW; return d >= 1 ? 0 : PTH.DIP * (1 - d * d) ** 2; }
  // the concept's lightly stoned footway: worn tan dirt, a scatter of flat pale flagstones set into it (thicker down the middle), soft grassy edges
  function stoneTex() { return hwCanvasTex(128, 512, (g, w, h) => { let sd = 53; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      const img = g.createImageData(w, h), D = img.data; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = (y * w + x) * 4, e = Math.abs(x / w - 0.5) * 2, n = 0.9 + 0.1 * Math.sin(x * 0.31 + y * 0.07) * Math.sin(y * 0.05 - x * 0.11) + 0.06 * Math.sin(y * 0.6 + x * 0.9) + (R() - 0.5) * 0.14, wear = 1.06 - 0.12 * e;
        const cw = 1 + 0.16 * Math.max(0, 1 - e * 1.6), pn = 0.5 + 0.5 * Math.sin(y * 0.09 + Math.sin(x * 0.2) * 1.3) * Math.sin(y * 0.031 + x * 0.05 + 1.3) + 0.25 * Math.sin(y * 0.23 + x * 0.4), edge = e - 0.62 - 0.22 * pn - (R() - 0.5) * 0.08, inner = pn > 1.05 && e > 0.25 ? 1 : 0;
        D[k] = 146 * n * wear * cw; D[k + 1] = 120 * n * wear * cw; D[k + 2] = 90 * n * wear * cw; D[k + 3] = Math.round(255 * Math.max(0, Math.min(1, 1 - edge * 9)) * (inner ? 0.35 : 1)); } g.putImageData(img, 0, 0);
      for (let q = 0; q < 160; q++) { const x = R() * w, y = R() * h; g.fillStyle = `rgba(${90 + R() * 40 | 0},${70 + R() * 30 | 0},${50 + R() * 20 | 0},.5)`; g.fillRect(x, y, 1.5, 1.5); }
      const stones = []; for (let q = 0; q < 300 && stones.length < 20; q++) { const u = (R() + R() + R()) / 3, x = w * (0.14 + 0.72 * u), y = R() * h, r = 10 + R() * 9; if (stones.some((t) => Math.hypot(t[0] - x, (t[1] - y) * 0.75) < t[2] + r + 3)) continue; stones.push([x, y, r]); }
      for (const [x, y, r] of stones) { const v = 110 + R() * 20 | 0, NP = 7, pts = []; for (let i = 0; i < NP; i++) { const a = i / NP * 6.2832 + R() * 0.4, rr = r * (0.78 + R() * 0.3); pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 1.35]); }
        for (const oy of [-h, 0, h]) { g.save(); g.translate(x, y + oy); const poly = (dx, dy, k) => { g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo : g.moveTo).call(g, px * k + dx, py * k + dy)); g.closePath(); };
          g.fillStyle = 'rgba(60,44,30,.5)'; poly(1, 1.6, 1.1); g.fill(); g.fillStyle = `rgb(${v},${v - 6},${v - 18})`; poly(0, 0, 1); g.fill(); g.fillStyle = 'rgba(255,248,230,.16)'; poly(-r * 0.15, -r * 0.2, 0.6); g.fill(); g.strokeStyle = 'rgba(80,62,44,.35)'; g.lineWidth = 1; poly(0, 0, 1); g.stroke(); g.restore(); } }
      for (let q = 0; q < 110; q++) { const x = R() < 0.5 ? R() * 18 : w - R() * 18, y = R() * h; g.strokeStyle = `rgba(${70 + R() * 40 | 0},${110 + R() * 40 | 0},${40 + R() * 20 | 0},.75)`; g.lineWidth = 1.5; for (let b = 0; b < 4; b++) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 8, y - 4 - R() * 7); g.stroke(); } } }); }
  function pathTex(cob) { return hwCanvasTex(128, 512, (g, w, h) => { let sd = cob ? 91 : 37; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      const img = g.createImageData(w, h), D = img.data; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = (y * w + x) * 4, n = 0.86 + 0.14 * Math.sin(x * 0.9 + y * 0.37) * Math.sin(y * 0.21 - x * 0.13) + (R() - 0.5) * 0.12, e = Math.abs(x / w - 0.5) * 2, wear = 1 - 0.12 * (1 - e);
        D[k] = 132 * n * wear; D[k + 1] = 104 * n * wear; D[k + 2] = 74 * n * wear; D[k + 3] = 255; } g.putImageData(img, 0, 0);
      for (let q = 0; q < (cob ? 260 : 46); q++) { const x = cob ? 10 + R() * (w - 20) : w * (0.2 + R() * 0.6), y = R() * h, r = cob ? 6 + R() * 6 : 3 + R() * 6, v = 118 + R() * 50 | 0, rot = R() * 3;
        for (const oy of [-h, 0, h]) { g.save(); g.translate(x, y + oy); g.rotate(rot); g.fillStyle = 'rgba(40,30,20,.45)'; g.beginPath(); g.ellipse(1.2, 1.6, r * 1.08, r * 0.82, 0, 0, 6.3); g.fill(); g.fillStyle = `rgb(${v},${v - 6},${v - 16})`; g.beginPath(); g.ellipse(0, 0, r, r * 0.76, 0, 0, 6.3); g.fill(); g.fillStyle = 'rgba(255,250,235,.18)'; g.beginPath(); g.ellipse(-r * 0.25, -r * 0.25, r * 0.55, r * 0.35, 0, 0, 6.3); g.fill(); g.restore(); } }
      for (let q = 0; q < 90; q++) { const x = R() < 0.5 ? R() * 16 : w - R() * 16, y = R() * h; g.strokeStyle = `rgba(${70 + R() * 40 | 0},${110 + R() * 40 | 0},${40 + R() * 20 | 0},.75)`; g.lineWidth = 1.5; for (let b = 0; b < 4; b++) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 8, y - 4 - R() * 7); g.stroke(); } } }); }
  function setPaths(list) { for (const m of PTH.chunks) { scene && scene.remove(m); m.geometry.dispose(); } PTH.chunks = []; PTH.hash = new Map(); PTH.segs = []; PTH.list = [];
    const chaik = (P) => { const o = [P[0]]; for (let i = 0; i + 1 < P.length; i++) { const a = P[i], b = P[i + 1]; o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } o.push(P[P.length - 1]); return o; };
    for (const f of list || []) { let P = []; for (let i = 1; i + 1 < f.length; i += 2) P.push([f[i], f[i + 1]]); if (P.length < 2) continue; P = chaik(chaik(P)); const Q = [P[0]]; for (let i = 1; i < P.length; i++) { const a = Q[Q.length - 1], b = P[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(L / 6); for (let q = 1; q <= n; q++) Q.push([a[0] + (b[0] - a[0]) * q / n, a[1] + (b[1] - a[1]) * q / n]); } PTH.list.push({ k: f[0], P: Q }); }
    for (const pa of PTH.list) for (let i = 0; i + 1 < pa.P.length; i++) { const a = pa.P[i], b = pa.P[i + 1], id = PTH.segs.push([a[0], a[1], b[0], b[1]]) - 1, r = PTH.HW + 2; for (let bx = Math.floor((Math.min(a[0], b[0]) - r) / PTH.B); bx <= Math.floor((Math.max(a[0], b[0]) + r) / PTH.B); bx++) for (let by = Math.floor((Math.min(a[1], b[1]) - r) / PTH.B); by <= Math.floor((Math.max(a[1], b[1]) + r) / PTH.B); by++) { const key = bx * 100003 + by; let L = PTH.hash.get(key); if (!L) PTH.hash.set(key, (L = [])); L.push(id); } }
    if (!scene) return; const mats = PTH.mats || (PTH.mats = [0, 1].map((c) => { const m = new THREE.MeshLambertMaterial({ map: c ? pathTex(c) : stoneTex(), vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }); m.userData.kind = c ? 'cobble' : 'dirt'; return m; }));
    const O = [-1.18, -0.92, -0.6, -0.3, 0, 0.3, 0.6, 0.92, 1.18], CH = 3000, bins = new Map();
    for (const pa of PTH.list) { const P = pa.P; let run = 0; for (let i = 0; i < P.length; i++) { const p = P[i], a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)]; let tx = b[0] - a[0], ty = b[1] - a[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl; if (i) run += Math.hypot(p[0] - P[i - 1][0], p[1] - P[i - 1][1]);
        const key = pa.k + ':' + Math.floor(p[0] / CH) + ',' + Math.floor(p[1] / CH); let G = bins.get(key); if (!G) bins.set(key, (G = { k: pa.k, pos: [], col: [], uv: [], idx: [], last: null })); if (G.last !== pa || i === 0) { G.last = pa; G.prev = -1; }
        const base = G.pos.length / 3, endF = Math.min(1, Math.min(i, P.length - 1 - i) / 3);
        for (const o of O) { const x = p[0] - ty * o * PTH.HW, y = p[1] + tx * o * PTH.HW, d = Math.abs(o), dip = d < 1 ? PTH.DIP * (1 - d * d) ** 2 : 0, gh = meshH(x, y); G.pos.push(x, gh + 1 - dip * 0.4, y); G.uv.push((o / 1.18 + 1) / 2, run / 48); const al = (d < 0.72 ? 1 : Math.max(0, 1 - (d - 0.72) / 0.46)) * (0.35 + 0.65 * endF), sh = 1 - 0.1 * (1 - Math.min(1, d)); G.col.push(sh, sh, sh, al); }
        if (G.prev >= 0) for (let c = 0; c + 1 < O.length; c++) { const a0 = G.prev + c, b0 = base + c; G.idx.push(a0, a0 + 1, b0, a0 + 1, b0 + 1, b0); } /* wound to face up (the other way round they were culled from above) */ G.prev = base; } }
    for (const G of bins.values()) { if (!G.idx.length) continue; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(G.pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(G.col, 4)); g.setAttribute('uv', new THREE.Float32BufferAttribute(G.uv, 2)); g.setIndex(G.idx); g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere();
      const m = new THREE.Mesh(g, PTH.mats[G.k ? 1 : 0]); m.receiveShadow = true; m.renderOrder = 1; m.userData.path = true; scene.add(m); PTH.chunks.push(m); }
    CRV.win = null; }
  function pathsVis(x0, y0, S) { for (const m of PTH.chunks) { const b = m.geometry.boundingBox; m.visible = b.max.x > x0 && b.min.x < x0 + S && b.max.z > y0 && b.min.z < y0 + S; } } // only where the mask (which cuts the ground under them) is laid
  function makeTerrain(g) {
    const geo = new THREE.PlaneGeometry(2 * g.half, 2 * g.half, g.N, g.N); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position; // after rotation: x right, z = map y (row iy -> z = -half + iy*step)
    for (let i = 0; i < pos.count; i++) pos.setY(i, g.h[i]);
    geo.setAttribute('aMt', new THREE.BufferAttribute(g.m, 1)); geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, terrainMat); mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; return mesh;
  }

  /* ---------- painted ground textures (re-using the 2D painter in ground-only mode) ---------- */
  function paint(cv, x0, y0, size, px, ox = 0, oy = 0, w) {
    const g = cv.getContext('2d'), s = px / size; ART.ground3d = true;
    try { g.save(); g.beginPath(); g.rect(ox, oy, w || px, w || px); g.clip(); g.setTransform(s, 0, 0, s, -x0 * s, -y0 * s);
      const sx0 = x0 + ox / s, sy0 = y0 + oy / s, sw = (w || px) / s; g.fillStyle = '#6f8f55'; g.fillRect(sx0, sy0, sw, sw);
      drawStatic(g, sx0, sy0, sx0 + sw, sy0 + sw, s); g.restore(); } finally { ART.ground3d = false; }
  }
  function canvasTex(cv) { const t = new THREE.CanvasTexture(cv); t.flipY = false; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.encoding = THREE.sRGBEncoding; return t; }
  function imgTex(img, rep, an) { const t = new THREE.Texture(img); t.needsUpdate = true; t.flipY = false; t.encoding = THREE.sRGBEncoding; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; } t.anisotropy = Math.min(an || 4, renderer.capabilities.getMaxAnisotropy()); return t; }

  /* ---------- terrain material ---------- */
  function makeTerrainMat(U) {
    const m = new THREE.MeshLambertMaterial({ color: 0xffffff });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aMt; varying vec3 vWP; varying vec3 vWN; varying float vMt; varying float vVD;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal); vMt = aMt;').replace('#include <project_vertex>', '#include <project_vertex>\nvVD = length(mvPosition.xyz);');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vWP; varying vec3 vWN; varying float vMt; varying float vVD;
uniform sampler2D tK; uniform vec4 uK; uniform sampler2D tA; uniform sampler2D tB; uniform sampler2D tC; uniform sampler2D tRock; uniform sampler2D tGrass; uniform vec4 uA; uniform vec4 uB; uniform vec4 uC; uniform float uCOn; uniform float uExOn; float exBump = 0.0;
uniform float uPH; uniform float uHR; uniform vec3 uLumen; uniform float uDeep; uniform float uSnowR; uniform float uHaze;
vec4 texAn(sampler2D t, vec2 uv, float k) { vec2 dx = dFdx(uv), dy = dFdy(uv); float lx = length(dx), ly = length(dy), cap = min(lx, ly) * k; if (lx > cap) dx *= cap / lx; if (ly > cap) dy *= cap / ly; return textureGrad(t, uv, dx, dy); } // grazing angles: limit the footprint's long axis (a cheap anisotropic filter) so close ground stays crisp
float edgeF(vec2 u, float w) { return smoothstep(0.0, w, min(min(u.x, 1.0 - u.x), min(u.y, 1.0 - u.y))); }
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm2(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * vn2(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; } return s; }
float h31(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vn3(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(mix(h31(i), h31(i + vec3(1.0, 0.0, 0.0)), f.x), mix(h31(i + vec3(0.0, 1.0, 0.0)), h31(i + vec3(1.0, 1.0, 0.0)), f.x), f.y), mix(mix(h31(i + vec3(0.0, 0.0, 1.0)), h31(i + vec3(1.0, 0.0, 1.0)), f.x), mix(h31(i + vec3(0.0, 1.0, 1.0)), h31(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z); }
float fbm3(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * vn3(p); p = p * 2.01 + vec3(5.3, 1.7, 9.1); a *= 0.5; } return s; }`)
        .replace('#include <map_fragment>', `
vec2 wp = vWP.xz; { vec2 uk = (wp - uK.xy) / uK.zw; if (uk.x > 0.0 && uk.x < 1.0 && uk.y > 0.0 && uk.y < 1.0 && texture2D(tK, uk).r > 0.5) discard; } // the ground is cut away over every crevice (its rock walls are a mesh below)
vec4 tc = texture2D(tA, (wp - uA.xy) / uA.zw);
vec2 ub = (wp - uB.xy) / uB.zw; if (ub.x > 0.0 && ub.x < 1.0 && ub.y > 0.0 && ub.y < 1.0) tc = mix(tc, texture2D(tB, ub), edgeF(ub, 0.02));
if (uCOn > 0.5) { vec2 uc = (wp - uC.xy) / uC.zw; if (uc.x > 0.0 && uc.x < 1.0 && uc.y > 0.0 && uc.y < 1.0) { vec4 cN = texture2D(tC, uc);
  if (uExOn > 0.5) { vec4 cL = texture2D(tC, uc, 3.0); cN.rgb = min(cN.rgb, cL.rgb * 1.08); cN.rgb = mix(cN.rgb, cL.rgb, 0.8 * (1.0 - smoothstep(200.0, 600.0, vVD))); } // Explore: magnified splat texels smear (pale flower specks became pale streaks) - cap the specks and keep only the splat's broad colour up close; the shader's own grass detail supplies the fine texture
  tc = mix(tc, cN, edgeF(uc, 0.08)); } }
vec3 nn = normalize(vWN); float slope = 1.0 - clamp(nn.y, 0.0, 1.0);
vec3 bw = pow(abs(nn), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
vec3 rockV = texture2D(tRock, vec2(vWP.z, -vWP.y) / 260.0).rgb * bw.x + texture2D(tRock, vec2(vWP.x, -vWP.y) / 260.0).rgb * bw.z + texture2D(tRock, wp / 260.0).rgb * bw.y;
rockV = mix(rockV, rockV * vec3(1.05, 0.98, 0.9), 0.5) * 1.08;
// layered strata: horizontal bands on the faces, wandering with the rock texture
float strata = sin(vWP.y / 38.0 + texture2D(tRock, wp / 900.0).r * 6.0) * 0.5 + 0.5;
rockV *= 0.78 + 0.34 * smoothstep(0.25, 0.75, strata) + 0.1 * sin(vWP.y / 11.0 + wp.x / 300.0);
vec3 rockT = (texture2D(tRock, wp / 420.0).rgb * bw.y + rockV * (1.0 - bw.y)) * vec3(0.95, 0.93, 0.92);
float steep = smoothstep(0.38, 0.62, slope);
tc.rgb = mix(tc.rgb, rockT, smoothstep(0.2, 0.75, vMt) * (1.0 - steep));
tc.rgb = mix(tc.rgb, rockV, steep);
float snow = smoothstep(1050.0, 1300.0, vWP.y + 160.0 * texture2D(tRock, wp / 700.0).r) * smoothstep(0.25, 0.7, vMt) * (1.0 - smoothstep(0.35, 0.6, slope)) * smoothstep(uSnowR, uSnowR + 1500.0, length(wp));
tc.rgb = mix(tc.rgb, vec3(0.94, 0.96, 1.0), snow);
// tiled grass detail near the camera + richer painterly greens on open ground
float camD = length(vWP - cameraPosition); float nearF = 1.0 - smoothstep(2500.0, 9000.0, camD);
float grassM = (1.0 - steep) * (1.0 - smoothstep(0.15, 0.6, vMt)) * (1.0 - snow);
vec3 gd = texture2D(tGrass, wp / 150.0).rgb; vec3 gd2 = texture2D(tGrass, wp / 37.0 + 0.37).rgb;
float gl = dot(gd * 0.6 + gd2 * 0.4, vec3(0.3, 0.59, 0.11));
tc.rgb *= mix(1.0, clamp(gl / 0.36, 0.6, 1.45), 0.6 * grassM * nearF);
float tl = dot(tc.rgb, vec3(0.3, 0.59, 0.11)); tc.rgb = mix(vec3(tl), tc.rgb, 1.0 + 0.1 * grassM);
tc.rgb = mix(tc.rgb, tc.rgb * vec3(0.86, 1.0, 0.78), 0.35 * grassM);
// Explore close-up: hand-made ground at true scale (4 units = 1 m) around the player - grass clumps at blade scale (a cheap anisotropic filter keeps it crisp at grazing angles), faint worn patches,
// and rock as a solid noise with warped strata layers 0.6-1.2 m thick, darker bedding joints, lit lips and vertical cracks; fades out by ~150 m
float exF = uExOn * (1.0 - smoothstep(160.0, 640.0, vVD)); /* view-space distance */ exBump = 0.0;
if (exF > 0.002) {
  float gC = fbm2(wp / 3.0), gF = vn2(wp * 2.5) * 0.6 + vn2(wp * 6.3 + 3.1) * 0.4, dry = smoothstep(0.52, 0.78, fbm2(wp / 9.0 + 3.0));
  vec3 gpart = tc.rgb * (0.78 + 0.4 * gC) * (0.88 + 0.24 * gF); gpart = mix(gpart, gpart * vec3(1.06, 1.0, 0.72), dry * 0.3);
  { float hP = fbm2(wp / 46.0 + 1.7), hQ = fbm2(wp / 17.0 - 4.2); gpart *= mix(vec3(0.9, 1.02, 0.86), vec3(1.1, 1.05, 0.74), smoothstep(0.3, 0.7, hP)) * (0.92 + 0.16 * hQ); gpart *= vec3(1.08, 0.95, 0.5); { float mL = fbm2(wp / 140.0 + 9.1), mS = fbm2(wp / 60.0 - 2.3); gpart *= mix(vec3(0.84, 0.97, 0.78), vec3(1.14, 1.02, 0.62), smoothstep(0.28, 0.72, mL)) * (0.9 + 0.2 * mS); } /* soft large-scale mottling: golden swathes and deeper green hollows */ { float gL = dot(gpart, vec3(0.3, 0.59, 0.11)); gpart = max(vec3(0.0), mix(vec3(gL), gpart, 1.12)) * vec3(1.1, 0.95, 0.55); /* golden straw-green, not lime */ } } /* ACES compresses bright ground toward grey: richer, warmer albedo so the meadow reads sunlit yellow-green, not pastel */ // meadow colour drift: lush deep-green swathes and warm sunlit yellow-green, broken up at a few metres
  { float fw = min(length(dFdx(wp)), length(dFdy(wp))) * 1.6; vec2 q = mat2(0.8, -0.6, 0.6, 0.8) * wp; vec3 lw = vec3(0.3, 0.59, 0.11);
    float g1 = dot(texAn(tGrass, wp / 11.0 + 0.21, 2.5).rgb, lw) / max(0.05, dot(texture2D(tGrass, wp / 11.0 + 0.21, 7.0).rgb, lw)), g2 = dot(texAn(tGrass, q / 4.3 + 0.63, 2.5).rgb, lw) / max(0.05, dot(texture2D(tGrass, q / 4.3 + 0.63, 7.0).rgb, lw));
    float bl = vn2(vec2(wp.x * 9.0 + 3.0 * vn2(wp * 1.3), wp.y * 9.0)) * 0.5 + vn2(q * 17.0) * 0.5, bA = 1.0 - smoothstep(0.03, 0.09, fw), tA2 = 1.0 - smoothstep(0.25, 0.7, fw);
    gpart *= mix(1.0, clamp(g1 * 0.55 + g2 * 0.45, 0.45, 1.7), 1.25 * tA2) * mix(1.0, 0.82 + 0.36 * bl, bA); } // near grass: the painted grass texture at blade scale (2-4 m tiles, two rotations) plus fine blade streaks, each faded by the pixel footprint so low angles stay crisp, not noisy
  float worn = smoothstep(0.6, 0.8, fbm2(wp / 24.0 + 7.0) + 0.1 * (gC - 0.5)) * grassM; gpart *= mix(vec3(1.0), vec3(0.8, 0.78, 0.66), worn * 0.45); // a little worn, darker ground here and there - no pale bare-soil blotches (they lit up grey-white in daylight)
  vec3 rp = vWP / 4.0; float sy = rp.y + 1.6 * fbm3(rp * vec3(0.12, 0.05, 0.12)), lid = floor(sy / 0.9), lay = fract(sy / 0.9), lt = h21(vec2(lid, 3.7));
  float rN = fbm3(rp * 0.8), rF = vn3(rp * 5.5) * 0.6 + vn3(rp * 13.0) * 0.4, cj = abs(vn3(vec3(rp.x * 0.9 + rp.y * 0.3, lid * 3.1, rp.z * 0.9)) - 0.5) + step(lt, 0.45);
  vec3 rpart = tc.rgb * (0.74 + 0.4 * lt) * mix(vec3(1.04, 0.98, 0.9), vec3(0.92, 0.96, 1.04), h21(vec2(lid, 9.1))) * (0.66 + 0.68 * rN) * (0.8 + 0.4 * rF);
  rpart *= 0.72 + 0.28 * smoothstep(0.0, 0.05 + 0.08 * rN, lay); rpart += tc.rgb * 0.14 * smoothstep(0.88, 1.0, lay) * rN; rpart *= 0.7 + 0.3 * smoothstep(0.0, 0.022, cj);
  float rockW = clamp(steep + smoothstep(0.2, 0.75, vMt) * (1.0 - steep), 0.0, 1.0) * (1.0 - snow);
  float rH = 0.16 * rN + 0.05 * rF + 0.12 * smoothstep(0.0, 0.12, lay) * (1.0 - 0.6 * smoothstep(0.7, 1.0, lay)) - 0.08 * (1.0 - smoothstep(0.0, 0.03, cj)); // metres: rounded bed lips, recessed joints and cracks
  rpart *= 0.84 + 0.32 * clamp(rH / 0.3, 0.0, 1.0);
  exBump = 4.0 * rH * rockW * exF * (1.0 - smoothstep(0.15, 0.5, length(fwidth(rp)))); 
  tc.rgb = mix(tc.rgb, mix(gpart, rpart, rockW), exF); }
if (uExOn > 0.5) { float wF = grassM * (1.0 - exF) * (1.0 - smoothstep(3000.0, 9000.0, camD)), mL = fbm2(wp / 140.0 + 9.1), mS = fbm2(wp / 60.0 - 2.3); vec3 wg = tc.rgb * mix(vec3(0.98, 1.0, 0.7), vec3(1.2, 1.04, 0.5), smoothstep(0.28, 0.72, mL)) * (0.9 + 0.2 * mS); float wl = dot(wg, vec3(0.3, 0.59, 0.11)); wg = max(vec3(0.0), mix(vec3(wl), wg, 1.3)); tc.rgb = mix(tc.rgb, wg, wF); float gB = grassM * (1.0 - smoothstep(3000.0, 9000.0, camD)); vec3 gw = tc.rgb * vec3(1.2, 1.0, 0.34) * 1.04; float gwl = dot(gw, vec3(0.3, 0.59, 0.11)); tc.rgb = mix(tc.rgb, max(vec3(0.0), mix(vec3(gwl), gw, 1.12)), gB * 0.85); /* golden straw-green (Mia's meadow) */ } /* the ACES grade lifts bright albedo to pastel: a deeper, more saturated golden-green meadow reads warm and sunlit after it */ /* Explore: the meadow beyond the close-up band shares its warm golden-green grade and soft mottling (no flat pale green past ~100 m) */
float inPit = 1.0 - smoothstep(uHR * 0.98, uHR * 1.04, length(wp));
float dep = clamp((uPH - vWP.y) / 3000.0, 0.0, 1.0);
// pit walls: moss on the ledges, dangling roots below the lip, darker undercuts beneath each ledge
float flatM = 1.0 - smoothstep(0.25, 0.5, slope);
vec3 moss = vec3(0.24, 0.33, 0.12) * (0.7 + 0.6 * texture2D(tGrass, wp / 90.0).g);
float mossN = smoothstep(0.45, 0.7, texture2D(tRock, wp / 1300.0 + 0.3).r * 0.6 + texture2D(tGrass, wp / 400.0).g * 0.5);
tc.rgb = mix(tc.rgb, moss, inPit * flatM * mossN * smoothstep(0.02, 0.08, dep) * (1.0 - smoothstep(0.55, 0.85, dep)) * 0.7);
float rootN = texture2D(tRock, vec2((vWP.x + vWP.z) / 70.0, vWP.y / 900.0)).r;
tc.rgb = mix(tc.rgb, vec3(0.22, 0.15, 0.09), inPit * steep * smoothstep(0.55, 0.75, rootN) * (1.0 - smoothstep(0.03, 0.14, dep)) * 0.8);
tc.rgb *= 1.0 - 0.35 * inPit * steep * smoothstep(0.3, 0.9, strata);
tc.rgb *= mix(1.0, mix(1.0, 0.3, dep), inPit);
float crack = smoothstep(uPH - 60.0, uPH - 380.0, vWP.y) * (1.0 - inPit) * step(vWP.y, 300.0 + uPH) * 0.0;
float low = smoothstep(-40.0, -420.0, vWP.y - 0.0) * (1.0 - inPit); tc.rgb *= mix(1.0, 0.45, low);
diffuseColor *= tc;`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
if (abs(exBump) > 0.0 || exF > 0.002) { vec3 bp = -vViewPosition, sX = dFdx(bp), sY = dFdy(bp), R1 = cross(sY, normal), R2 = cross(normal, sX); float fDet = dot(sX, R1) * faceDirection; vec2 dH = vec2(dFdx(exBump), dFdy(exBump)); vec3 vG = sign(fDet) * (dH.x * R1 + dH.y * R2); normal = normalize(abs(fDet) * normal - vG); } // Explore: rock slopes get real relief in the lighting (bump from the strata/crack height)`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
float ledge = 0.55 + 0.45 * smoothstep(0.3, 0.8, slope); // terrace walls catch more glow than their ledges, so the steps read
totalEmissiveRadiance += uLumen * inPit * (pow(dep, 0.9) * 1.25 * ledge) * (tc.rgb * 1.8 + 0.04) + uLumen * 0.1 * inPit * smoothstep(0.7, 1.0, dep);`)
        .replace('#include <fog_fragment>', `#include <fog_fragment>
#ifdef USE_FOG
float hz = uHaze * (1.0 - smoothstep(0.0, uPH * 0.85, vWP.y)) * (1.0 - inPitH(vWP.xz)) * smoothstep(1500.0, 9000.0, vVD); /* true view distance (cameraPosition is not the follow camera's position in Explore: the haze washed the near meadow grey-pale) */
gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, hz);
#endif`);
      sh.fragmentShader = sh.fragmentShader.replace('float edgeF(', 'float inPitH(vec2 p) { return 1.0 - smoothstep(uHR * 0.98, uHR * 1.04, length(p)); }\nfloat edgeF(');
    };
    return m;
  }

  /* ---------- billboards ---------- */
  const BB_VS = `
attribute vec3 iPos; attribute vec4 iUV; attribute vec4 iSz; attribute float iLum;
uniform float uFogN; uniform float uFogF;
varying vec2 vUv; varying float vFog; varying float vLum; varying float vY;
void main() {
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec2 q = position.xy + 0.5; // 0..1, y up
  float flip = iSz.z < 0.0 ? 1.0 : 0.0; float ax = abs(iSz.z);
  vec3 toCam = normalize(cameraPosition - iPos);
  vec3 p = iPos + right * (q.x - ax) * iSz.x + up * (q.y - (1.0 - iSz.w)) * iSz.y + toCam * iSz.y * 0.22;
  float u = flip > 0.5 ? 1.0 - q.x : q.x;
  vUv = vec2(iUV.x + u * iUV.z, iUV.y + (1.0 - q.y) * iUV.w);
  vec4 mv = viewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
  vFog = smoothstep(uFogN, uFogF, -mv.z); vLum = iLum; vY = iPos.y;
}`;
  const BB_FS = `
uniform sampler2D map; uniform vec3 uLight; uniform vec3 uFogC; uniform vec3 uLumen;
varying vec2 vUv; varying float vFog; varying float vLum; varying float vY;
void main() {
  vec4 c = texture2D(map, vUv); float a = clamp((c.a - 0.5) / max(fwidth(c.a), 1e-3) + 0.5, 0.0, 1.0); if (a < 0.02) discard; // a crisp, anti-aliased cut-out edge (alpha to coverage), not a hard texel staircase
  vec3 col = c.rgb * uLight + c.rgb * uLumen * vLum;
  gl_FragColor = vec4(mix(col, uFogC, vFog), a);
  #include <tonemapping_fragment>
  #include <encodings_fragment>
}`;
  function lumAt(x, y) { const d = Math.hypot(x, y) - CITY.hollowR, u = clamp(1 - d / (CITY.hollowR * 0.7), 0, 1); return u * u; }
  function spriteList() {
    const L = [];
    const add = (spr, x, y, w, ay, flip, lum, elev) => { const e = ART_MANIFEST.s[spr]; if (!e) return; L.push({ e, x, y, w, ay, flip, elev, lum: lum == null ? lumAt(x, y) : lum }); };
    if (!MD) for (const h of W.homes) { const tier = tierOf(h); add(homeSprite(h), h.x, h.y, homeW(h, tier) * 1.4, TIER_AY[tier], homeFlip(h), null, h.elev); }
    if (!MD) for (const o of W.objs) if (o.type === 'tree') add(pickOf(TREES.def.concat(['p_forest_5', 'p_forest_4']), o.seed || 0.5), o.x, o.y, o.r * 2.9, 0.9, (o.seed || 0) > 0.5);
    for (const o of W.civic) { if (o.type === 'exchange') { add('civ_market', o.x, o.y, 230, 0.78, false); continue; } if (o.type === 'lift') add('civ_lift', o.x, o.y, 54, 0.95, false); else if (o.type === 'statue') add('landmarks_0', o.x, o.y, o.r * 2.8, 0.78); else if (o.type === 'memorial') add('landmarks_1', o.x, o.y, 96, 0.78); else if (o.type === 'gate') add('landmarks_2', o.x, o.y, o.r * 3.2, 0.82); else if (o.type === 'rift') add('landmarks_2', o.x, o.y, o.r * 3, 0.82); else if (o.type === 'outpost') add('sp_outpost_0', o.x, o.y, 300, 0.62); }
    for (const m of W.mountains) if (m.type === 'pass') add('sp_pass_0', m.x, m.y, m.r * 2.7, 0.9);
    return L;
  }
  function buildBillboards() {
    for (const m of bbMesh) scene.remove(m); bbMesh = [];
    const L = spriteList(), by = new Map(); for (const o of L) { const k = o.e[0]; (by.get(k) || by.set(k, []).get(k)).push(o); }
    const base = new THREE.PlaneGeometry(1, 1);
    for (const [ai, list] of by) { const img = ART.atlas[ai], AW = img.width, AH = img.height, n = list.length;
      const g = new THREE.InstancedBufferGeometry(); g.index = base.index; g.attributes.position = base.attributes.position; g.instanceCount = n;
      const P = new Float32Array(n * 3), UV = new Float32Array(n * 4), SZ = new Float32Array(n * 4), LU = new Float32Array(n);
      list.forEach((o, i) => { const e = o.e, h = o.w * e[4] / e[3]; P.set([o.x, o.elev != null ? o.elev : meshH(o.x, o.y), o.y], i * 3); UV.set([e[1] / AW, e[2] / AH, e[3] / AW, e[4] / AH], i * 4); SZ.set([o.w, h, (o.flip ? -1 : 1) * 0.5, o.ay], i * 4); LU[i] = o.lum; });
      g.setAttribute('iPos', new THREE.InstancedBufferAttribute(P, 3)); g.setAttribute('iUV', new THREE.InstancedBufferAttribute(UV, 4)); g.setAttribute('iSz', new THREE.InstancedBufferAttribute(SZ, 4)); g.setAttribute('iLum', new THREE.InstancedBufferAttribute(LU, 1));
      if (!bbMat[ai]) { const tex = imgTex(img); tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
        bbMat[ai] = new THREE.ShaderMaterial({ uniforms: { map: { value: tex }, uLight: { value: new THREE.Color(1, 1, 1) }, uFogC: { value: new THREE.Color() }, uFogN: { value: 1e5 }, uFogF: { value: 2e5 }, uLumen: { value: new THREE.Color(0, 0, 0) } }, vertexShader: BB_VS, fragmentShader: BB_FS, alphaToCoverage: true }); }
      const mesh = new THREE.Mesh(g, bbMat[ai]); mesh.frustumCulled = false; scene.add(mesh); bbMesh.push(mesh); }
    st.sprites = L.length; st.playerTier = playerTier();
  }
  // the player's ring is draped over the terrain so it never clips into slopes
  let ringAt = null;
  function drapeRing() { const h = W.player, w = homeW(h), r0 = w * 0.7, r1 = w * 0.82, n = 72, pos = [], idx = [];
    for (let i = 0; i <= n; i++) { const a = (i / n) * TAU; for (const r of [r0, r1]) { const x = h.x + Math.cos(a) * r, y = h.y + Math.sin(a) * r; pos.push(x, (h.elev != null ? h.elev : meshH(x, y)) + 4, y); } }
    for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); ring.geometry.dispose(); ring.geometry = g; ringAt = h.x + ',' + h.y; }
  // far LOD: roof-coloured blobs so the lip reads as a red-roofed city ring from far away
  let roofPts = null;
  function roofTex() { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 30, 4, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.7, 'rgba(235,235,235,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 30, 0, TAU); g.fill(); return new THREE.CanvasTexture(c); }
  function buildRoofLOD() { if (roofPts) { scene.remove(roofPts); roofPts.geometry.dispose(); }
    const pos = [], col = [], c = new THREE.Color();
    for (const h of W.homes) { const w = homeW(h); pos.push(h.x, (h.elev != null ? h.elev : meshH(h.x, h.y)) + w * 0.35, h.y); c.set(h.roof || '#b5533c'); c.convertSRGBToLinear(); col.push(c.r, c.g, c.b); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    roofPts = new THREE.Points(g, new THREE.PointsMaterial({ size: 210, sizeAttenuation: true, vertexColors: true, map: roofTex(), transparent: true, alphaTest: 0.4, depthWrite: true, fog: true })); roofPts.frustumCulled = false; scene.add(roofPts); }
  function winPts() { const pts = []; for (const h of W.homes) if (((h.lanternPhase * 10) | 0) % 3 === 0) { const w = homeW(h) * 0.95; pts.push(h.x + (homeSeed(h) - 0.5) * w * 0.5, (h.elev != null ? h.elev : meshH(h.x, h.y)) + w * 0.3, h.y + w * 0.45); } return pts; }
  function lightsPts() { if (lightPts) lightPts.geometry.setAttribute('position', new THREE.Float32BufferAttribute(winPts(), 3)); }
  function glowTex(inner, outer) { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, inner); gr.addColorStop(0.4, outer); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); return t; }

  /* ---------- real 3D models: houses + trees (meshopt-compressed LODs, instanced), yard props, the Heartwood ---------- */
  let MD = null, mdState = 'idle'; const IM = { homes: [], trees: [], props: null, all: [] }; let hero = null, lodTick = 0, lodAt = null;
  const LU = { uLumenC: { value: new THREE.Color(0, 0, 0) }, uWin: { value: 0 } };
  function loadScript(src) { return new Promise((res, rej) => { const e = document.createElement('script'); e.src = src; e.onload = res; e.onerror = rej; document.head.appendChild(e); }); }
  function lumenify(mat) { mat.onBeforeCompile = (sh) => { sh.uniforms.uLumenC = LU.uLumenC; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float iLum; varying float vLum;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLum = iLum;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uLumenC; varying float vLum;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uLumenC * vLum * diffuseColor.rgb;'); }; return mat; }
  // houses and trees are procedural models built from the concept art (see map_houses.js), not loaded files
  function loadModels() { if (mdState !== 'idle') return; mdState = 'loading';
    try { const out = Object.assign({}, HOUSE_KIT.houses(), HOUSE_KIT.trees()); const mats = new Set(); for (const k in out) mats.add(out[k].mat); for (const m of mats) lumenify(m); MD = out; mdState = 'ready'; buildModelScene(); }
    catch (e) { console.warn('3D models unavailable, keeping billboards', e); mdState = 'failed'; } }
  // an instanced set: one InstancedMesh per LOD, refilled with only the instances in view (nearest get the detailed LOD)
  function makeSet(key, list, opt) { const m = MD[key], meshes = m.geos.map((g0, li) => { const g = new THREE.BufferGeometry(); for (const n in g0.attributes) g.setAttribute(n, g0.attributes[n]); g.setIndex(g0.index);
      g.setAttribute('iLum', new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, list.length)), 1)); const im = new THREE.InstancedMesh(g, m.mat, Math.max(1, list.length)); im.count = 0; im.frustumCulled = false;
      im.castShadow = li === 0 && opt.shadow; im.receiveShadow = true; im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, list.length) * 3), 3); scene.add(im); return im; });
    const M = new Float32Array(list.length * 16), C = new Float32Array(list.length * 3), Lm = new Float32Array(list.length), P = new Float32Array(list.length * 4), mt = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    list.forEach((o, i) => { e.set(o.tilt || 0, o.rot, 0, 'YXZ'); q.setFromEuler(e); mt.compose(v3().set(o.x, o.y, o.z), q, v3().set(o.s * (o.sx || 1), o.s * (o.sy || 1), o.s * (o.sz || 1))); mt.toArray(M, i * 16); C.set(o.c, i * 3); Lm[i] = o.lum || 0; P.set([o.x, o.y + o.s * 0.4, o.z, o.s * 0.8], i * 4); });
    const set = { key, list, meshes, M, C, L: Lm, P, near: opt.near, far: opt.far || 1e9, minZ: opt.minZ || 0 }; IM.all.push(set); return set; }
  const frus = new THREE.Frustum(), pm = new THREE.Matrix4(), sph = new THREE.Sphere();
  function fillSet(set, camZ) { const [m0, m1] = set.meshes; let n0 = 0, n1 = 0; const cp = camera.position, hide = camZ < set.minZ;
    if (!hide) for (let i = 0, n = set.list.length; i < n; i++) { sph.center.set(set.P[i * 4], set.P[i * 4 + 1], set.P[i * 4 + 2]); sph.radius = set.P[i * 4 + 3]; if (!frus.intersectsSphere(sph)) continue;
      const d = sph.center.distanceTo(cp); if (d > set.far) continue; const tgt = d < set.near || !m1 ? m0 : m1, j = tgt === m0 ? n0++ : n1++;
      tgt.instanceMatrix.array.set(set.M.subarray(i * 16, i * 16 + 16), j * 16); tgt.instanceColor.array.set(set.C.subarray(i * 3, i * 3 + 3), j * 3); tgt.geometry.attributes.iLum.array[j] = set.L[i]; }
    for (const [m, n] of [[m0, n0], [m1, n1]]) if (m) { m.count = n; m.visible = n > 0; m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; m.geometry.attributes.iLum.needsUpdate = true; } }
  function homeElev(h) { return h.elev != null ? h.elev : meshH(h.x, h.y); }
  const M3LM = { list: [], minD: 0 }; // landmark (boulder-gripping) trees: where they are and the enforced spacing
  function treeKind(o) { const hd = hollowDist(o.x, o.y), pd = Math.abs(plateauDist(o.x, o.y)), [, mh] = heightAt(o.x, o.y);
    if (hd < 600 || pd < 900) return 'willow'; if (mh > 120 || Math.hypot(o.x, o.y) > CITY.R - 2600) return 'sequoia'; return 'oak'; }
  function tintFor(seed, warm) { const v = 0.86 + 0.2 * hash1(seed * 13.1), w = (hash1(seed * 7.7) - 0.5) * 0.12 * (warm || 1); return [v * (1 + w), v, v * (1 - w)]; }
  // static primitives for props and the Heartwood's structures (unit box / cylinder), filled per frame with what's near the camera
  const PR = { box: [], cyl: [], lamp: [], smoke: [], glow: [] };
  function stick(arr, a, b, th, col, owner) { const d = v3().subVectors(b, a), L = d.length(); if (L < 0.5) return; const q = new THREE.Quaternion().setFromUnitVectors(v3().set(0, 1, 0), d.normalize());
    arr.push({ m: new THREE.Matrix4().compose(v3().addVectors(a, b).multiplyScalar(0.5), q, v3().set(th, L, th)), c: col, o: owner }); }
  function block(arr, x, y, z, sx, sy, sz, rot, col, owner) { arr.push({ m: new THREE.Matrix4().compose(v3().set(x, y + sy / 2, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot, 0)), v3().set(sx, sy, sz)), c: col, o: owner }); }
  const WOOD = [[0.45, 0.32, 0.2], [0.55, 0.4, 0.26], [0.38, 0.27, 0.17], [0.6, 0.47, 0.3]], ROPE = [0.62, 0.52, 0.36], IRON = [0.25, 0.24, 0.23];
  // the models carry their own lanterns, barrels, crates and ladders; here only the chimney smoke is added
  // chimney smoke and night lantern glows come from the points each house model records (chimney tops, lantern bodies)
  function yardProps(h, i, key, w) { const m = MD[key]; if (!m) return; const rot = h._rot, cs = Math.cos(rot), sn = Math.sin(rot), y0 = homeElev(h), at = (c) => [h.x + (c[0] * cs + c[2] * sn) * w, y0 + c[1] * w, h.y + (-c[0] * sn + c[2] * cs) * w];
    if (m.chim && m.chim[0] && hash1(i * 3.3 + 1) < 0.45) { const p = at(m.chim[0]); PR.smoke.push([p[0], p[1], p[2], hash1(i * 7.7) * 10, h]); }
    if (m.lamps) for (const c of m.lamps) { const p = at(c); PR.glow.push([p[0], p[1], p[2], h]); }
    if (h.isPlayer && m.doors && m.doors.length) { const D = m.doors[0], p = at(D.p), q = at(D.q), nx = q[0] - p[0], nz = q[2] - p[2], nl = Math.hypot(nx, nz) || 1; W.playerDoor = { x: p[0], y: p[2], up: p[1], nx: nx / nl, nz: nz / nl, w: D.w * w, h: D.h * w }; } } // the player's house front door (map units), where Explore hangs the Ledge door
  /* ---------- the Heartwood: one colossal upright tree growing out of the Hollow's inner wall (merged geometry, instanced foliage) ---------- */
  function hwCanvasTex(w, h, draw, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); if (rep) t.repeat.set(rep[0], rep[1]); return t; }
  // the Grand Tree's bark, hand-made (same craft as the Lumen Tree's hall): long interlocking plates drawn out up the trunk, split by deep dark furrows, every
  // plate its own weathered tone (grey-brown, some warmer, some mossy), combed with fibres and baked as a lit relief so it reads deep at every zoom; fine
  // cross-cracks and a few knots on top. Tileable.
  // the Grand Tree's bark (approved concept): rich warm-brown elm, long rounded ridges that twist up the trunk (one full spiral step per tile), split and
  // rejoin, separated by deep dark furrows; combed fibres along each ridge, warm sunlit edges, cool shadowed furrows, moss and lichen settling in the
  // furrows. Painted as a height field and baked with soft light from the upper left so it reads as deep relief at every zoom. Tileable both ways.
  function barkTex() { return hwCanvasTex(512, 512, (g, w, h) => { let s = 7; const R = () => (s = (s * 16807) % 2147483647) / 2147483647, NR = 9, rd = [];
      for (let j = 0; j < NR; j++) rd.push({ ph: R() * TAU, ps: R() * TAU, pw: R() * TAU, pg: R() * TAU, a1: 0.022 + R() * 0.018, a2: 0.008 + R() * 0.01, wk: 0.78 + R() * 0.3, tone: 0.86 + R() * 0.28, warm: R() });
      const H = new Float32Array(w * h), ID = new Uint8Array(w * h), MS = new Float32Array(w * h);
      const vn = (x, y) => Math.sin(x * 1.7 + Math.sin(y * 1.3) * 1.5) * Math.sin(y * 1.1 + Math.sin(x * 0.9) * 1.8);
      for (let py = 0; py < h; py++) { const v = py / h; for (let px = 0; px < w; px++) { const u = px / w; let best = 0, bid = 0;
          for (let j = 0; j < NR; j++) { const r = rd[j], uc = (j + 0.5) / NR + v / NR + r.a1 * Math.sin(TAU * v + r.ph) + r.a2 * Math.sin(TAU * 3 * v + r.ps), ww = 0.5 / NR * r.wk * (0.82 + 0.22 * Math.sin(TAU * 2 * v + r.pw));
            let d = u - uc; d -= Math.round(d); const q = Math.abs(d) / ww; if (q >= 1.05) continue; let hv = Math.pow(Math.max(0, 1 - q * q), 0.55);
            const split = Math.pow(Math.max(0, Math.sin(TAU * v + r.pg)), 6); hv *= 1 - 0.65 * split * Math.exp(-Math.pow(d / (ww * 0.16), 2)); // a ridge splitting in two for a stretch
            if (hv > best) { best = hv; bid = j; } }
          const fib = 0.05 * Math.sin(u * NR * 22 + 2.2 * Math.sin(v * TAU * 3 + u * 9)) + 0.03 * Math.sin(u * NR * 47 + 3 * Math.sin(v * TAU * 5)); // combed fibres
          const k = py * w + px; H[k] = Math.max(0, best * (0.92 + fib)); ID[k] = bid; MS[k] = vn(u * TAU * 2, v * TAU * 2) * 0.5 + vn(u * TAU * 5 + 3, v * TAU * 4 + 1) * 0.3; } }
      const img = g.createImageData(w, h), D = img.data, at = (x, y) => H[((y + h) % h) * w + ((x + w) % w)];
      for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) { const k = py * w + px, hv = H[k], r = rd[ID[k]], lit = Math.max(-1, Math.min(1, ((at(px - 2, py) - at(px + 2, py)) * 0.8 + (at(px, py - 2) - at(px, py + 2)) * 0.35) * 3.2)), cr = Math.min(1, hv * 2.6);
        // furrow (cool near-black brown) -> ridge body (warm brown, each ridge its own tone) -> sunlit edge (golden tan)
        let cR = 34 + (112 - 34) * cr, cG = 30 + (100 - 30) * cr, cB = 27 + (88 - 27) * cr; const tn = r.tone * (1 + 0.08 * (r.warm - 0.5)); cR *= tn * (1 + 0.04 * r.warm); cG *= tn; cB *= tn * (1 - 0.03 * r.warm); // dark grey-brown elm: near-black furrows, ash-brown ridges
        const L = 1 + 0.55 * lit * cr; cR = cR * L + Math.max(0, lit) * cr * 26; cG = cG * L + Math.max(0, lit) * cr * 23; cB = cB * L + Math.max(0, lit) * cr * 19;
        const mz = Math.max(0, MS[k] - 0.06) * 1.5 * (1 - cr * 0.55); if (mz > 0) { const m = Math.min(0.85, mz); cR = cR * (1 - m) + 78 * m * (0.7 + 0.3 * cr); cG = cG * (1 - m) + 104 * m * (0.7 + 0.3 * cr); cB = cB * (1 - m) + 42 * m * (0.7 + 0.3 * cr); } // moss in the furrows
        D[k * 4] = Math.min(255, cR); D[k * 4 + 1] = Math.min(255, cG); D[k * 4 + 2] = Math.min(255, cB); D[k * 4 + 3] = 255; }
      g.putImageData(img, 0, 0);
      // a few soft cross-checks and knots on the ridges (painted, low contrast)
      for (let i = 0; i < 26; i++) { const x = R() * w, y = R() * h, l = 6 + R() * 12; for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) { g.strokeStyle = 'rgba(24,20,16,.35)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x + ox - l / 2, y + oy); g.quadraticCurveTo(x + ox, y + oy + 2, x + ox + l / 2, y + oy - 1); g.stroke(); } }
      for (let i = 0; i < 3; i++) { const cx = R() * w, cy = R() * h, rw = 7 + R() * 6, rh = 12 + R() * 8; for (let q = 0; q < 4; q++) { g.strokeStyle = q % 2 ? 'rgba(150,138,122,.4)' : 'rgba(26,22,18,.55)'; g.lineWidth = 1.8; g.beginPath(); g.ellipse(cx, cy, rw * (1 - q * 0.2), rh * (1 - q * 0.2), 0, 0, TAU); g.stroke(); } }
      // lichen flecks
      for (let i = 0; i < 140; i++) { g.fillStyle = `rgba(${150 + R() * 40 | 0},${160 + R() * 30 | 0},${110 + R() * 30 | 0},${0.12 + R() * 0.18})`; g.beginPath(); g.ellipse(R() * w, R() * h, 1 + R() * 3, 1 + R() * 2, R() * 3, 0, TAU); g.fill(); } }); }
  function leafTex() { return hwCanvasTex(256, 256, (g, w, h) => { g.fillStyle = '#7c9a42'; g.fillRect(0, 0, w, h); let s = 11; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 2600; i++) { const x = R() * w, y = R() * h, r = 2 + R() * 4, k = R(); g.fillStyle = k < 0.3 ? `rgba(${70 + R() * 20 | 0},${96 + R() * 20 | 0},${40 + R() * 10 | 0},.75)` : k < 0.8 ? `rgba(${124 + R() * 30 | 0},${154 + R() * 26 | 0},${66 + R() * 20 | 0},.8)` : `rgba(${176 + R() * 30 | 0},${196 + R() * 20 | 0},${104 + R() * 30 | 0},.75)`;
      g.beginPath(); g.ellipse(x, y, r, r * 0.55, R() * TAU, 0, TAU); g.fill(); } }); }
  function plankTex() { return hwCanvasTex(128, 128, (g, w, h) => { let s = 5; const R = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < 8; i++) { const c = 0.75 + R() * 0.3; g.fillStyle = `rgb(${142 * c | 0},${104 * c | 0},${66 * c | 0})`; g.fillRect(0, i * 16, w, 16); g.fillStyle = 'rgba(40,26,14,.7)'; g.fillRect(0, i * 16 + 14, w, 2); g.fillRect((R() * w) | 0, i * 16, 2, 14); } }); }
  // geometry accumulator -> one merged mesh
  // Explore close-up: the same hand-made plate bark again at true scale (6x and 29x the tile) over the trunk, roots and limbs near the camera, as a relief on the base plates
  function barkDetail(m) { m.onBeforeCompile = (sh) => { sh.uniforms.uExOn = EXU; sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uExOn;').replace('#include <map_fragment>', `#ifdef USE_MAP
vec4 sdc = texture2D(map, vUv); float vdB = 1.0 / gl_FragCoord.w, bfB = uExOn * (1.0 - smoothstep(140.0, 700.0, vdB));
if (bfB > 0.002) { vec3 lw = vec3(0.3, 0.59, 0.11); float d1 = dot(texture2D(map, vUv * 6.0 + vec2(0.31, 0.17)).rgb, lw) / (dot(texture2D(map, vUv * 6.0 + vec2(0.31, 0.17), 6.0).rgb, lw) + 0.01), d2 = dot(texture2D(map, vUv * 29.0 + 0.6).rgb, lw) / (dot(texture2D(map, vUv * 29.0 + 0.6, 6.0).rgb, lw) + 0.01);
  sdc.rgb *= mix(1.0, clamp(pow(d1, 1.25) * 0.8 + d2 * 0.2, 0.22, 1.8), bfB * 0.18); } /* (only a whisper of close-up grain: the big ridges carry the bark) */
diffuseColor *= sdc;
#endif`); }; m.customProgramCacheKey = () => 'barkDetail'; return m; }
  function GA() { return { p: [], n: [], uv: [], c: [], i: [] }; }
  function gaMesh(A, mat, normals) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(A.p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(A.uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(A.c, 3)); g.setIndex(A.i);
    if (normals) g.setAttribute('normal', new THREE.Float32BufferAttribute(A.n, 3)); else g.computeVertexNormals(); g.computeBoundingSphere(); const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m; }
  // a tube through centres `pts` with radius rad(i, ang) (parallel-transport frames), vertex colour col(i, ang, pos)
  function gaTube(A, pts, seg, rad, col, uvk) { const n = pts.length, base = A.p.length / 3; let nr = null, vacc = 0;
    for (let i = 0; i < n; i++) { const t = v3().subVectors(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize();
      if (!nr) { nr = Math.abs(t.y) < 0.9 ? v3().set(0, 1, 0).cross(t).normalize() : v3().set(1, 0, 0).cross(t).normalize(); } else nr.addScaledVector(t, -nr.dot(t)).normalize();
      const b = v3().crossVectors(t, nr); if (i) vacc += pts[i].distanceTo(pts[i - 1]) * (uvk[2] ? uvk[1] * uvk[0] / (TAU * Math.max(1, rad(i, 0))) : 1); // uvk[2]: square bark plates along a tapering root (v follows the local girth)
      for (let k = 0; k <= seg; k++) { const a = (k / seg) * TAU, d = v3().copy(nr).multiplyScalar(Math.cos(a)).addScaledVector(b, Math.sin(a)), r = rad(i, a), p = v3().copy(pts[i]).addScaledVector(d, r);
        A.p.push(p.x, p.y, p.z); A.n.push(d.x, d.y, d.z); A.uv.push((k / seg) * uvk[0], vacc / uvk[1]); const c = col(i, a, p, d); A.c.push(c[0], c[1], c[2]); } }
    for (let i = 0; i < n - 1; i++) for (let k = 0; k < seg; k++) { const a = base + i * (seg + 1) + k, b2 = a + seg + 1; A.i.push(a, b2, a + 1, a + 1, b2, b2 + 1); } }
  function bez(p0, p1, p2, p3, n) { const c = new THREE.CubicBezierCurve3(p0, p1, p2, p3); return c.getPoints(n); }
  const HWX = { built: false, objs: [], mush: null, mushGlow: null, clumps: [], rootMeshes: [] }, EXU = { value: 0 }; // EXU: Explore close-up detail on (shared by the terrain and bark shaders)
  // the pit wall: radius (from the Hollow's centre) where the wall reaches height y along angle phi
  function wallR(phi, y) { let lo = Math.max(50, hollowR(phi) - 3000), hi = hollowR(phi) + 300; for (let i = 0; i < 20; i++) { const m = (lo + hi) / 2, [x, z] = polar(m, phi); if (meshH(x, z) > y) hi = m; else lo = m; } return (lo + hi) / 2; }
  function puffGeo(det, seed) { // one leafy floret: a lumpy ball (cauliflower bumps), lit from the top, dark underneath
    const g = new THREE.IcosahedronGeometry(1, det), P = g.attributes.position, cc = [], uv = [];
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      const n = 1 + 0.16 * (vnoise(x * 2.1 + seed, z * 2.1 + y * 1.9 + seed) - 0.5) * 2 + 0.07 * Math.sin(x * 9 + seed) * Math.sin(y * 8 + 1) * Math.sin(z * 9 + 2) + 0.04 * Math.sin(x * 17 + y * 13 + z * 15);
      P.setXYZ(i, x * n, (y > 0 ? y * 0.92 : y * 0.62) * n, z * n);
      const t = clamp((y + 0.75) / 1.6, 0, 1), sh = 0.38 + 0.78 * Math.pow(t, 1.15); cc.push(sh * (0.97 + 0.1 * t), sh, sh * (0.86 - 0.14 * t)); uv.push((Math.atan2(z, x) / Math.PI + 1) * 1.5, (y + 1) * 1.2); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
    { const N = g.attributes.normal, acc = new Map(), key = (i) => Math.round(P.getX(i) * 1e4) + ',' + Math.round(P.getY(i) * 1e4) + ',' + Math.round(P.getZ(i) * 1e4); // the icosphere is unindexed: average the face normals per corner so the floret shades soft and leafy, not as flat facets
      for (let i = 0; i < P.count; i++) { const k = key(i), v = acc.get(k) || acc.set(k, [0, 0, 0]).get(k); v[0] += N.getX(i); v[1] += N.getY(i); v[2] += N.getZ(i); }
      for (let i = 0; i < P.count; i++) { const v = acc.get(key(i)), l = Math.hypot(v[0], v[1], v[2]) || 1; N.setXYZ(i, v[0] / l, v[1] / l, v[2] / l); } N.needsUpdate = true; }
    return g; }
  function canopyLeafTex() { return hwCanvasTex(1024, 1024, (g, w, h) => { const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#4f6a2c'); bg.addColorStop(1, '#3f5724'); g.fillStyle = bg; g.fillRect(0, 0, w, h); let s = 23; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
    // layered elm leaves: pointed, slightly serrated ovals with a midrib, painted back to front (deep shade -> mid green -> sunlit -> a few bright tips), each wrapped across the tile edges so it tiles
    const leaf = (x, y, L, a, fill, rib) => { for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) { const cx = x + ox, cy = y + oy; if (cx < -L || cx > w + L || cy < -L || cy > h + L) continue; g.save(); g.translate(cx, cy); g.rotate(a); g.fillStyle = fill; g.beginPath(); g.moveTo(-L, 0);
        g.bezierCurveTo(-L * 0.55, -L * 0.62, L * 0.35, -L * 0.5, L, 0); g.bezierCurveTo(L * 0.35, L * 0.5, -L * 0.55, L * 0.62, -L, 0); g.fill(); g.strokeStyle = rib; g.lineWidth = Math.max(1, L * 0.07); g.beginPath(); g.moveTo(-L * 0.95, 0); g.quadraticCurveTo(0, -L * 0.06, L * 0.9, 0); g.stroke();
        g.lineWidth = Math.max(0.6, L * 0.03); for (let k = -3; k <= 3; k++) if (k) { const t = k / 4; g.beginPath(); g.moveTo(t * L * 0.8, 0); g.lineTo(t * L * 0.8 + L * 0.22, Math.sign(k) * L * 0.3); g.stroke(); } g.restore(); } };
    const P = [[2600, 9, 15, () => [30 + R() * 16, 48 + R() * 18, 20 + R() * 10], 0.95], [3400, 10, 17, () => [72 + R() * 26, 102 + R() * 26, 38 + R() * 14], 0.95], [2200, 10, 16, () => [116 + R() * 30, 146 + R() * 24, 54 + R() * 18], 0.95], [700, 8, 13, () => [168 + R() * 30, 186 + R() * 20, 86 + R() * 26], 0.9]];
    for (const [n, l0, l1, C, al] of P) for (let i = 0; i < n; i++) { const [r, gg, b] = C(), L = l0 + R() * (l1 - l0); leaf(R() * w, R() * h, L, R() * TAU, `rgba(${r | 0},${gg | 0},${b | 0},${al})`, `rgba(${r * 0.6 | 0},${gg * 0.66 | 0},${b * 0.6 | 0},.55)`); } }); }
  function buildHeartwood() { const T = W.heartwood; if (!T) return; const H = T.H, B = T.base;
    const ax = (f) => { const [x, y] = hwAxis(f); return v3().set(x, B + f * H, y); }, dirAt = (th) => v3().set(Math.cos(th), 0, Math.sin(th));
    const tr = (f, th, r) => ax(f).addScaledVector(dirAt(th), r != null ? r : hwTrunkR(f));
    const add = (o) => { scene.add(o); HWX.objs.push(o); return o; };
    const OUT = T.in + Math.PI; // the side facing away from the Hollow (onto the plateau)
    if (!HWX.built) { HWX.built = true; const bark = new THREE.MeshLambertMaterial({ map: barkTex(), color: 0xaca298, vertexColors: true, side: THREE.DoubleSide }), A = GA(); /* darker, greyer elm bark (the light tan read as pine) */ barkDetail(bark); HWX.barkMat = new THREE.MeshLambertMaterial({ map: bark.map, color: 0x9a928a }); // same tone as the trunk (its vertex colours sit near 0.9 grey), so filler bark round the door matches
      const moss = (p, d, k) => { const m = Math.max(0, d.y) * 0.7 + (vnoise(p.x / 600 + k, p.z / 600 + p.y / 800) - 0.56) * 1.5; const u = clamp(m, 0, 1), dk = 0.86 + 0.14 * clamp((p.y - B) / (H * 0.4), 0, 1); return [(1 - 0.45 * u) * dk, (1 - 0.1 * u) * dk, (1 - 0.6 * u) * dk]; }; HWX.trunkMat = bark; HWX.moss = moss;
      // the trunk: a braid of great twisted strands, deeply ridged, buttressed at the foot
      const trunkRad = (f, a) => { const tw = f * 4.2, Bt = Math.exp(-Math.max(0, f + 0.04) * 7), lobe = Math.pow(0.5 + 0.5 * Math.cos(6 * (a - tw)), 2.2), lobe2 = Math.pow(0.5 + 0.5 * Math.cos(11 * (a - tw * 1.3) + 1), 4), dA = Math.abs(Math.atan2(Math.sin(a - T.in - Math.PI), Math.cos(a - T.in - Math.PI))), dm = 1 - smooth01(0.62, 0.2, dA) * smooth01(0.24, 0.1, f), r = hwTrunkR(f) * (1 + 0.55 * Bt * lobe * dm - 0.08 * Bt); /* no buttress cleft where the great door stands: the bark runs smooth and continuous round the portal */
          return r * (1 + 0.075 * lobe2 + 0.06 * Math.sin(3 * a + f * 17) + 0.05 * (vnoise(a * 2.2 + 3, f * 14) - 0.5) - (f > 0.66 ? (f - 0.66) * 5 : 0)); };
      HWX.trunkRad = trunkRad; HWX.ax = ax; const DC = { T, trunkRad, ax, meshH, OUT: T.in + Math.PI };
      { const pts = [], fs = []; for (let i = 0; i <= 72; i++) { const f = -0.07 + (i / 72) * 0.8, fr = f; fs.push(fr); pts.push(ax(fr)); }
        /* the doorway: the trunk is recessed behind the door's light plane inside the arch, so no bark sits in the doorway (seen through the leaves' gap) */
        const DS = GRAND.doorSpot(DC), dHW = 330 * 1.35 + 30, dH = 1020 * 1.35, dYS = 620 * 1.35, rIn = DS.rD - 160, inDoor = (i, ph, r) => { const d = Math.atan2(Math.sin(ph - DC.OUT), Math.cos(ph - DC.OUT)); if (Math.cos(d) <= 0.3) return r; const x = Math.sin(d) * r, y = pts[i].y - DS.gy; if (Math.abs(x) > dHW || y < -250 || y > dYS + (dH - dYS) * Math.sqrt(Math.max(0, 1 - (x / dHW) ** 2)) + 40) return r; return Math.min(r, rIn / Math.cos(d)); };
        gaTube(A, pts, 64, (i, a) => inDoor(i, Math.PI / 2 - a, trunkRad(fs[i], Math.PI / 2 - a) * (fs[i] < 0 ? 1 + fs[i] * 3 : 1)) /* gaTube's ring angle a is measured from its own frame (vertex at world azimuth pi/2 - a on the upright trunk): trunkRad wants the world azimuth, else the buttress lobes land where the door's smooth cleft should be and bulge over the door */, (i, a, p, d) => moss(p, d, 0), [7, 900]); }
      // strands wound round the trunk up into the crown
      for (let k = 0; k < 12; k++) { const a0 = (k / 12) * TAU + 0.3, pts = [], rs = [], f1 = 0.52 + hash1(k * 7.3) * 0.16, n = 48;
        for (let i = 0; i <= n; i++) { const f = 0.02 + (f1 - 0.02) * i / n, aa = a0 + f * 3.4; pts.push(tr(f, aa, trunkRad(f, aa) * 0.95)); rs.push(HW_R0 * (0.17 + 0.06 * hash1(k)) * (1 - 0.6 * i / n) * (i < 3 ? 0.5 + i / 6 : 1)); }
        GRAND.dodge(pts, DC, rs); gaTube(A, pts, 10, (i, aa) => rs[i] * (1 + 0.1 * Math.sin(aa * 2 + i * 0.4)), (i, aa, p, d) => moss(p, d, k + 40), [2, 600]); }
      // LIP ROOTS: wind down the trunk, then arch out over the lip and grip the plateau behind the tree
      const rootMesh = (fill) => { const AR = GA(); fill(AR); const m = add(gaMesh(AR, bark, true)); m.userData.occU = true; m.name = 'greatRoot'; HWX.rootMeshes.push(m); }; // each great root its own mesh, so the Explore camera can fade just the one in the way
      const rootPts = [], rootR = []; HWX.rootPts = rootPts; HWX.rootR = rootR; // (the Explore nav keeps her off the great roots)
      const lipRoot = (a, fTop, L, r0, k, from) => { const pts = [], rs = []; let prev;
        if (!from) { const nS = Math.max(3, Math.round(fTop / 0.012)), tw = 1.6 * (k % 2 ? 1 : -0.8);
          for (let i = 0; i <= nS; i++) { const f = fTop * (1 - i / nS) + 0.01, aa = a - (f - 0.01) * tw; pts.push(tr(f, aa, trunkRad(f, aa) * 0.9)); rs.push(r0 * (0.3 + 0.7 * Math.pow(i / nS, 0.6))); } prev = pts[pts.length - 1]; }
        else { prev = from.p; pts.push(prev); rs.push(r0); }
        const c = from ? from.p : ax(0), s0 = Math.hypot(prev.x - c.x, prev.z - c.z), n = 26, y0 = prev.y;
        for (let i = 1; i <= n; i++) { const u = i / n, s2 = s0 + L * Math.pow(u, 0.9), aa = a + Math.sin(u * 4.5 + k) * 0.22 * u, x = c.x + Math.cos(aa) * s2, z = c.z + Math.sin(aa) * s2, rr = r0 * (1 - 0.9 * Math.pow(u, 0.8));
          const gy = meshH(x, z), arch = Math.sin(Math.min(1, u * 2.2) * Math.PI) * rr * 0.5; const y = Math.max(gy + rr * 0.32 + arch, y0 + (gy - y0) * clamp(u * 3, 0, 1) + rr * 0.3); const p = v3().set(x, y, z); pts.push(p); rs.push(rr); }
        if (pts.length > 4) { const nn = pts.length; rs[nn - 1] *= 0.2; rs[nn - 2] *= 0.5; rs[nn - 3] *= 0.8; }
        GRAND.dodge(pts, DC, rs); rootMesh((AR) => gaTube(AR, pts, 12, (i, aa) => rs[i] * (1 + 0.13 * Math.sin(aa * 3 + i * 0.8)) * (1 - 0.15 * Math.max(0, Math.sin(aa))), (i, aa, p, d) => moss(p, d, k), [3, 520, 1])); rootPts.push(pts.slice(from ? 0 : 6)); rootR.push(rs); return { pts, rs }; };
      for (let k = 0; k < 11; k++) { if (k === 5) continue; /* the Lumen Tree's great door stands where this root ran */ const a = OUT + (k / 10 - 0.5) * 3.9 + (hash1(k * 3.1) - 0.5) * 0.2, side = Math.abs(Math.cos(a - OUT)), L = H * (0.13 + 0.15 * side) * (0.8 + 0.4 * hash1(k + 9)), r0 = HW_R0 * (0.3 + 0.12 * hash1(k + 2));
        const R1 = lipRoot(a, 0.1 + hash1(k + 5) * 0.16, L, r0, k);
        for (const s of [-1, 1]) if (hash1(k * 5 + s) < 0.75) { const i = 8 + ((hash1(k * 2 + s) * 8) | 0); if (R1.pts[i]) lipRoot(a + s * (0.5 + hash1(k + s) * 0.4), 0, L * 0.45, R1.rs[i] * 0.55, k + s * 20, { p: v3().copy(R1.pts[i]) }); } }
      // the bridge root: one of the lip roots, grown long, arching over the pools above the falls

      // WALL ROOTS: from the trunk's Hollow side straight down the inner wall, clawing into the rock, holding the tree up
      const wallRoot = (phiOff, fTop, drop, r0, k) => { const pts = [], rs = [], aT = T.in + phiOff * 1.6, nS = 6;
        for (let i = 0; i <= nS; i++) { const f = fTop * (1 - i / nS) + 0.0, aa = aT + (fTop - f) * 1.2 * (k % 2 ? 1 : -1); pts.push(tr(f, aa, trunkRad(f, aa) * 0.9)); rs.push(r0 * (0.4 + 0.6 * i / nS)); }
        const p0 = pts[pts.length - 1], phi0 = Math.atan2(p0.z, p0.x), r0w = Math.hypot(p0.x, p0.z), y0 = p0.y, n = 30;
        for (let i = 1; i <= n; i++) { const u = i / n, y = y0 - drop * u, phi = phi0 + phiOff * (0.3 + 1.1 * u) * 0.9 + Math.sin(u * 5 + k) * 0.03, rr = r0 * (1 - 0.86 * Math.pow(u, 0.85));
          const rw = wallR(phi, y), r = Math.min(r0w + 120 * u, rw - rr * 0.25); const [x, z] = polar(r, phi); pts.push(v3().set(x, Math.max(y, meshH(x, z) + rr * 0.15), z)); rs.push(rr); }
        rootMesh((AR) => gaTube(AR, pts, 12, (i, aa) => rs[i] * (1 + 0.12 * Math.sin(aa * 3 + i)), (i, aa, p, d) => moss(p, d, k + 70), [3, 520, 1])); rootPts.push(pts.slice(nS)); rootR.push(rs.slice(nS)); };
      for (let k = 0; k < 9; k++) { const off = (k / 8 - 0.5) * 0.9 + (hash1(k * 4.7) - 0.5) * 0.06; wallRoot(off, 0.03 + hash1(k * 1.9) * 0.08, 1800 + hash1(k * 2.3) * 2000 - Math.abs(off) * 900, HW_R0 * (0.26 + 0.12 * hash1(k + 7)), k); }
      // limbs: great crown limbs that fork, each fork ending in a cauliflower floret of foliage
      const limbs = [], ends = [];
      const tube = (pts, r0, r1, seed) => gaTube(A, pts, 12, (i, a) => (r0 + (r1 - r0) * i / (pts.length - 1)) * (1 + 0.09 * Math.sin(a * 3 + i * 0.7 + seed)), (i, a, p, d2) => moss(p, d2, seed), [3, 600]);
      const branch = (p0, th, out, rise, r0, depth, seed) => { const d = dirAt(th), p3 = v3().copy(p0).addScaledVector(d, out).add(v3().set(0, rise, 0));
        const p1 = v3().copy(p0).addScaledVector(d, out * 0.3).add(v3().set(0, rise * 0.45, 0)), p2 = v3().copy(p0).addScaledVector(d, out * 0.68).add(v3().set(0, rise * 0.95, 0)), pts = bez(p0, p1, p2, p3, 16);
        tube(pts, r0, r0 * 0.3, seed); const L = { pts, th, end: p3, r0, depth }; limbs.push(L);
        if (depth > 0) { const forks = depth > 1 ? 3 : 2; for (let k = 0; k < forks; k++) { const i = depth > 1 ? [7, 11, 14][k] : [10, 14][k], s = k % 2 ? 1 : -1, q0 = pts[i];
            branch(q0, th + s * (0.45 + hash1(seed + k) * 0.35), out * (0.42 + hash1(seed * 2 + k) * 0.12), rise * (0.35 + hash1(seed * 3 + k) * 0.3), r0 * (1 - i / 16 * 0.7) * 0.75, depth - 1, seed * 1.7 + k + 1); } }
        else ends.push({ p: p3, R: out * 0.95 + 380, th }); return L; };
      const crownF = [0.62, 0.66, 0.7, 0.64, 0.68, 0.71, 0.63, 0.67];
      for (let k = 0; k < 8; k++) { const th = T.in + (k / 8) * TAU + 0.25 + (hash1(k * 4.4) - 0.5) * 0.35, towardPit = Math.cos(th - T.in), f0 = crownF[k];
        branch(tr(f0, th, hwTrunkR(f0) * 0.35), th, H * (0.2 + 0.05 * hash1(k + 1)) * (1 - 0.18 * Math.max(0, towardPit)), H * (0.05 + 0.08 * hash1(k + 3)), hwTrunkR(f0) * 0.5, 2, k * 13 + 1); }
      for (const [th, f0] of [[T.in + 1.3, 0.7], [OUT + 0.6, 0.71], [T.in - 1.9, 0.72]]) branch(tr(f0, th, hwTrunkR(f0) * 0.3), th, H * 0.07, H * 0.13, hwTrunkR(f0) * 0.42, 1, th * 7); // leaders
      const pulleyLimb = { pts: null }; { const f0 = 0.5, th = T.in + 0.45, p0 = tr(f0, th, hwTrunkR(f0) * 0.4), d = dirAt(th), p3 = v3().copy(p0).addScaledVector(d, H * 0.29).add(v3().set(0, H * 0.035, 0));
        const pts = bez(p0, v3().copy(p0).addScaledVector(d, H * 0.1).add(v3().set(0, H * 0.04, 0)), v3().copy(p0).addScaledVector(d, H * 0.2).add(v3().set(0, H * 0.045, 0)), p3, 18); tube(pts, hwTrunkR(f0) * 0.36, hwTrunkR(f0) * 0.12, 77); pulleyLimb.pts = pts; limbs.push({ pts, th, end: p3, r0: hwTrunkR(f0) * 0.36 }); ends.push({ p: v3().copy(p3).add(v3().set(H * 0.01 * d.x, 120, H * 0.01 * d.z)), R: 700, th }); }

      // hanging vines: drooping catenaries between neighbouring limbs
      for (let k = 0; k < limbs.length - 1; k += 2) { const a = limbs[k].pts[12], b = limbs[k + 1].pts[10]; if (!a || !b || a.distanceTo(b) > 4200 || a.distanceTo(b) < 600) continue; const pts = []; for (let i = 0; i <= 14; i++) { const u = i / 14; pts.push(v3().lerpVectors(a, b, u).add(v3().set(0, -Math.sin(u * Math.PI) * a.distanceTo(b) * 0.28, 0))); }
        gaTube(A, pts, 5, () => 22, () => [0.42, 0.55, 0.3], [1, 300]); }
      add(gaMesh(A, bark, true));
      // VINES (the approved concept): leafy strands with tiny white flowers creeping up the trunk's base and along the top of every great root
      { const VA = GA(), vp = [], vf = []; let sd = 4242; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647, up = v3().set(0, 1, 0);
        const strand = (pts, r0) => { if (pts.length < 3) return; gaTube(VA, pts, 5, (i) => r0 * (1 - 0.45 * i / pts.length), (i) => { const g = 0.75 + 0.25 * Math.sin(i * 0.7); return [0.42 * g, 0.6 * g, 0.26 * g]; }, [1, 200]);
          for (let i = 1; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], t = v3().subVectors(b, a), L = t.length(); if (L < 1e-3) continue; t.divideScalar(L); for (let q = 0; q < L; q += 9 + R() * 7) { const c = v3().copy(a).addScaledVector(t, q), s = R() < 0.5 ? -1 : 1; vp.push([c.x, c.y, c.z, t.x, t.y, t.z, s, 18 + R() * 16]); if (R() < 0.3) vf.push([c.x + (R() - 0.5) * 22, c.y + 4, c.z + (R() - 0.5) * 22, 7 + R() * 5]); } } };
        for (let k = 0; k < 44; k++) { const a0 = (k / 44) * TAU + R() * 0.15, f1 = 0.1 + R() * 0.32, pts = [], n = 40; let aa = a0;
          for (let i = 0; i <= n; i++) { const f = -0.02 + (f1 + 0.02) * i / n; aa += (R() - 0.5) * 0.05 + 0.012 * Math.sin(i * 0.4 + k); pts.push(tr(f, aa, trunkRad(f, aa) + 9)); }
          const rs = pts.map(() => 12); GRAND.dodge(pts, DC, rs); strand(pts, 7 + R() * 5); } /* ropey vines, thick enough to read at the hero view */
        HWX.rootPts.forEach((P, ri) => { const rr = HWX.rootR[ri] || []; for (const side of [-0.35, 0.3]) { const pts = []; for (let i = 0; i < P.length; i++) { const r = (rr[i] || 60) * 1.02, q = P[i]; pts.push(v3().copy(q).add(v3().set(Math.sin(i * 0.5 + ri + side * 5) * r * 0.25 + side * r * 0.4, r * 0.93, Math.cos(i * 0.45 + ri) * r * 0.25))); } strand(pts, 5.5 + R() * 3); } });
        const vm = add(gaMesh(VA, new THREE.MeshLambertMaterial({ vertexColors: true }), false)); vm.name = 'treeVines';
        const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.42, 0.22, 0.12, 1, 0, 0, 0.42, -0.22, 0.12, 0, 0, 0, 1, 0, 0], 3)); lg.setIndex([0, 1, 2, 0, 2, 3]); lg.computeVertexNormals();
        const lm = new THREE.InstancedMesh(lg, new THREE.MeshLambertMaterial({ color: 0x5f8a3a, side: THREE.DoubleSide }), vp.length), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = v3(), Pp = v3(), C2 = new THREE.Color();
        vp.forEach((L, i) => { const ang = Math.atan2(-L[5], L[3]) + L[6] * (0.9 + R() * 0.5); E.set((R() - 0.5) * 1.2, ang, (R() - 0.5) * 0.8 + L[6] * 0.4); Q.setFromEuler(E); S.set(L[7], L[7], L[7]); M.compose(Pp.set(L[0], L[1], L[2]), Q, S); lm.setMatrixAt(i, M); C2.setHSL(0.24 + R() * 0.06, 0.45, 0.3 + R() * 0.12); lm.setColorAt(i, C2); });
        lm.castShadow = false; lm.receiveShadow = true; lm.name = 'treeVineLeaves'; add(lm);
        const fg = new THREE.CircleGeometry(1, 5); fg.rotateX(-Math.PI / 2); const fm = new THREE.InstancedMesh(fg, new THREE.MeshLambertMaterial({ color: 0xfbf8ee, emissive: 0x2a2a22, side: THREE.DoubleSide }), vf.length);
        vf.forEach((F, i) => { E.set((R() - 0.5) * 0.9, R() * 6.3, (R() - 0.5) * 0.9); Q.setFromEuler(E); S.set(F[3], F[3], F[3]); M.compose(Pp.set(F[0], F[1], F[2]), Q, S); fm.setMatrixAt(i, M); }); fm.name = 'treeVineFlowers'; add(fm); HWX.vines = { strands: VA.p.length / 3, leaves: vp.length, flowers: vf.length }; }
      // CANOPY: one floret (cluster of lumpy puffs) per branch tip, plus the crown dome; dark core puffs fill the gaps between florets
      const clumps = []; const clump = (x, y, z, r, sh, hue) => clumps.push([x, y, z, r, sh, hue]);
      const floret = (c, R, sd) => { const hue = hash1(sd * 1.3);
        clump(c.x, c.y - R * 0.12, c.z, R * 0.7, 0.5, hue);
        const n = 6 + ((hash1(sd) * 4) | 0); for (let k = 0; k < n; k++) { const aa = (k / n) * TAU + hash1(sd + k) * 0.7, rr = R * (0.5 + hash1(sd * 2 + k) * 0.22); clump(c.x + Math.cos(aa) * rr, c.y + (hash1(sd * 3 + k) - 0.62) * R * 0.32, c.z + Math.sin(aa) * rr, R * (0.36 + hash1(sd * 5 + k) * 0.16), 0.68 + hash1(sd * 7 + k) * 0.2, hue + (hash1(k + sd) - 0.5) * 0.3); }
        const m = 3 + ((hash1(sd * 9) * 3) | 0); for (let k = 0; k < m; k++) { const aa = hash1(sd * 11 + k) * TAU, rr = R * 0.28 * hash1(sd * 13 + k); clump(c.x + Math.cos(aa) * rr, c.y + R * (0.26 + hash1(sd * 17 + k) * 0.16), c.z + Math.sin(aa) * rr, R * (0.3 + hash1(sd * 19 + k) * 0.12), 0.9 + hash1(sd * 23 + k) * 0.16, hue + (hash1(k * 3 + sd) - 0.5) * 0.3); } };
      ends.forEach((e2, i) => floret(e2.p, e2.R, i * 5.7 + 1));
      for (const L of limbs) if (L.depth === 2 && hash1(L.th * 9.1) < 0.5) { const p = L.pts[12]; floret(v3().copy(p).add(v3().set(0, 420, 0)), 760, p.x * 0.01); }
      { const top = ax(0.8); floret(v3().copy(top).add(v3().set(0, 700, 0)), 1500, 99); floret(v3().copy(top).add(v3().set(0, 250, 0)).addScaledVector(dirAt(OUT), 900), 1200, 98); }
      const keep = clumps; HWX.clumps = keep;
      const big = keep.filter((c) => c[3] >= 520), small = keep.filter((c) => c[3] < 520);
      const lm = new THREE.MeshLambertMaterial({ map: canopyLeafTex(), vertexColors: true }), mt = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      const PAL = [[0.92, 0.94, 0.6], [0.78, 0.88, 0.6], [1.0, 0.96, 0.62], [0.7, 0.82, 0.58]];
      for (const [L2, det] of [[big, 3], [small, 2]]) { if (!L2.length) continue; const im = new THREE.InstancedMesh(puffGeo(det, det * 3.7), lm, L2.length); im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(L2.length * 3), 3);
        L2.forEach((c, i) => { e.set((hash1(i * 2.9) - 0.5) * 0.3, hash1(i * 1.7) * TAU, (hash1(i * 3.9) - 0.5) * 0.3); q.setFromEuler(e); mt.compose(v3().set(c[0], c[1], c[2]), q, v3().set(c[3] * (0.95 + hash1(i + 2) * 0.12), c[3] * (0.82 + hash1(i) * 0.22), c[3] * (0.95 + hash1(i + 1) * 0.12))); im.setMatrixAt(i, mt);
          const hu = ((c[5] % 1) + 1) % 1, a = PAL[(hu * 4) | 0], b = PAL[(((hu * 4) | 0) + 1) % 4], u = (hu * 4) % 1, ht = 0.9 + 0.16 * clamp((c[1] - B - H * 0.55) / (H * 0.3), 0, 1), s = c[4] * ht;
          im.instanceColor.setXYZ(i, s * (a[0] + (b[0] - a[0]) * u), s * (a[1] + (b[1] - a[1]) * u), s * (a[2] + (b[2] - a[2]) * u)); });
        im.castShadow = true; im.receiveShadow = true; add(im); }
      // hanging moss: strands under the limbs and the florets
      const hang = []; for (const L of limbs) for (let k = 3; k < L.pts.length - 1; k += 2) { const p = L.pts[k], n2 = 1 + ((hash1(k * 3 + L.th) * 3) | 0); for (let j = 0; j < n2; j++) { const hx = p.x + (hash1(k + j * 7 + L.th) - 0.5) * L.r0 * 1.4, hz = p.z + (hash1(k * 5 + j + L.th) - 0.5) * L.r0 * 1.4; { const len = 160 + hash1(k * 11 + j + L.th * 3) * 520; hang.push([hx, p.y - L.r0 * 0.5, hz, len]); } } }
      for (const c of keep) if (c[3] > 300 && hash1(c[0] * 0.01 + c[2] * 0.003) < 0.7) for (let j = 0; j < 6; j++) { const hx = c[0] + (hash1(j + c[1]) - 0.5) * c[3] * 1.3, hz = c[2] + (hash1(j * 3 + c[1]) - 0.5) * c[3] * 1.3; const len = 200 + hash1(j * 7 + c[0]) * 650; hang.push([hx, c[1] - c[3] * 0.4, hz, len]); }
      { const hg = new THREE.CylinderGeometry(0.15, 1, 1, 5, 3); hg.translate(0, -0.5, 0); { const P = hg.attributes.position; for (let i = 0; i < P.count; i++) { const y = P.getY(i); P.setX(i, P.getX(i) + Math.sin(y * 7) * 0.8); } } hg.computeVertexNormals();
        const hm = new THREE.InstancedMesh(hg, new THREE.MeshLambertMaterial({ color: 0xffffff }), hang.length); hm.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(hang.length * 3), 3);
        hang.forEach((h2, i) => { e.set(0, hash1(i * 1.1) * TAU, 0); q.setFromEuler(e); mt.compose(v3().set(h2[0], h2[1], h2[2]), q, v3().set(6 + hash1(i) * 7, h2[3], 6 + hash1(i) * 7)); hm.setMatrixAt(i, mt); const v = hash1(i * 2.2); hm.instanceColor.setXYZ(i, 0.22 + v * 0.14, 0.3 + v * 0.14, 0.13 + v * 0.07); }); hm.castShadow = true; add(hm); }
      // rocks gripped by the roots
      { const rk = []; rootPts.forEach((pts, ri) => { for (let i = 3; i < pts.length; i += 3) if (hash1(i + pts[i].x) < 0.3) { const rr = (rootR[ri][Math.min(rootR[ri].length - 1, i)] || 100); { const rx = pts[i].x + (hash1(i * 3 + pts[i].z) - 0.5) * rr * 3, rz = pts[i].z + (hash1(i * 7 + pts[i].x) - 0.5) * rr * 3, DS = GRAND.doorSpot(DC), dx = DS.cx + Math.cos(DS.OUT) * DS.rD, dz = DS.cz + Math.sin(DS.OUT) * DS.rD; if (Math.hypot(rx - dx, rz - dz) > 2100) rk.push([rx, rz, 50 + hash1(i + pts[i].z) * 120]); } } }); /* no boulders in front of the Lumen Tree door */
        const rg = new THREE.DodecahedronGeometry(1, 1); { const P = rg.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), n = 1 + 0.18 * Math.sin(x * 5 + z * 3) * Math.cos(y * 4); P.setXYZ(i, x * n, y * n * 0.8, z * n); } } rg.computeVertexNormals();
        const rm = new THREE.InstancedMesh(rg, new THREE.MeshLambertMaterial({ color: 0x4e4740, flatShading: true }), rk.length); rm.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(rk.length * 3), 3);
        rk.forEach((r, i) => { e.set(hash1(i) * 3, hash1(i + 1) * 3, 0); q.setFromEuler(e); mt.compose(v3().set(r[0], meshH(r[0], r[1]) - r[2] * 0.1, r[1]), q, v3().set(r[2], r[2] * 0.7, r[2] * 0.9)); rm.setMatrixAt(i, mt); const v = 0.62 + hash1(i * 3) * 0.25, mo = hash1(i * 5) < 0.4 ? 0.85 : 1; rm.instanceColor.setXYZ(i, v * mo, v * 0.98, v * 0.9 * mo); });
        rm.castShadow = true; rm.receiveShadow = true; add(rm); }
      // glowing blue mushrooms on the roots and round the foot of the trunk; glowing hollows in the trunk
      { const ms = []; rootPts.forEach((pts) => { for (let i = 2; i < pts.length - 2; i++) if (hash1(i * 1.3 + pts[i].x) < 0.4) { const n = 1 + ((hash1(i * 7 + pts[i].z) * 3) | 0); for (let j = 0; j < n; j++) ms.push([pts[i].x + (hash1(i + j * 3 + pts[i].z) - 0.5) * 220, pts[i].y + 20, pts[i].z + (hash1(i * 2 + j + pts[i].x) - 0.5) * 220, 22 + hash1(i * 5 + j + pts[i].z) * 46]); } });
        for (let k = 0; k < 90; k++) { const f = -0.02 + hash1(k * 3.7) * 0.2, a = hash1(k * 9.1) * TAU, p = tr(f, a, trunkRad(f, a) * 0.99); { const dA = Math.abs(Math.atan2(Math.sin(a - T.in - Math.PI), Math.cos(a - T.in - Math.PI))); if (dA < 0.5) continue; /* none in or round the great door's opening */ } ms.push([p.x, p.y, p.z, 20 + hash1(k) * 44]); }
        const capG = new THREE.SphereGeometry(1, 12, 5, 0, TAU, 0, Math.PI / 2); capG.scale(1, 0.55, 1); const stG = new THREE.CylinderGeometry(0.18, 0.26, 0.9, 6); stG.translate(0, -0.45, 0);
        const mm = new THREE.MeshBasicMaterial({ color: 0x66d8ff, toneMapped: false }), cap = new THREE.InstancedMesh(capG, mm, ms.length), stem = new THREE.InstancedMesh(stG, new THREE.MeshLambertMaterial({ color: 0xeedcbc }), ms.length);
        ms.forEach((m2, i) => { e.set((hash1(i) - 0.5) * 0.5, 0, (hash1(i + 3) - 0.5) * 0.5); q.setFromEuler(e); mt.compose(v3().set(m2[0], m2[1], m2[2]), q, v3().set(m2[3], m2[3], m2[3])); cap.setMatrixAt(i, mt); stem.setMatrixAt(i, mt); });
        add(cap); add(stem); HWX.mush = mm;
        const gp = []; for (let i = 0; i < ms.length; i += 3) gp.push(ms[i][0], ms[i][1] + 20, ms[i][2]);
        const hollowM = new THREE.MeshBasicMaterial({ color: 0x140d08 }), glowM = new THREE.MeshBasicMaterial({ color: 0x5fd0ff, toneMapped: false }), rimM = new THREE.MeshLambertMaterial({ color: 0x4a3626 }); HWX.hollowGlow = glowM;
        for (const [f, da, s] of [[0.06, 0.4, 1.2], [0.15, -1.5, 1], [0.24, 2.5, 1.1], [0.33, 0.95, 0.9], [0.44, -0.55, 0.8], [0.2, -0.35, 1], [0.1, 1.9, 0.9], [0.29, -2.6, 0.8]]) { const a = T.in + da, p = tr(f, a, trunkRad(f, a) * 0.96), n2 = dirAt(a);
          const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.22, 6, 18), rimM); rim.position.copy(p).addScaledVector(n2, 26); rim.lookAt(v3().copy(rim.position).add(n2)); rim.scale.set(120 * s, 180 * s, 90 * s); add(rim);
          const o = new THREE.Mesh(new THREE.CircleGeometry(1, 18), hollowM); o.position.copy(p).addScaledVector(n2, 30); o.lookAt(v3().copy(o.position).add(n2)); o.scale.set(115 * s, 175 * s, 1); add(o);
          const gl = new THREE.Mesh(new THREE.CircleGeometry(1, 18), glowM); gl.position.copy(p).addScaledVector(n2, 34); gl.lookAt(v3().copy(gl.position).add(n2)); gl.scale.set(70 * s, 115 * s, 1); add(gl); gp.push(gl.position.x + n2.x * 40, gl.position.y, gl.position.z + n2.z * 40); }
        const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3)); HWX.mushGlow = add(new THREE.Points(gg, new THREE.PointsMaterial({ size: 300, map: glowTex('rgba(120,220,255,.9)', 'rgba(60,160,255,.25)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.3 }))); HWX.mushGlow.frustumCulled = false; HWX.mushGlow.visible = false; /* the big blue glow-orb billboards read as floating orbs round the houses: retired */ }
      // the pulley's limb end
      HWX.pulleyAt = v3().copy(pulleyLimb.pts[15]); HWX.pulleyBase = v3().copy(pulleyLimb.pts[3]);
  }


    // (the old pulley rig - wheel, rope and the crate dangling into the Hollow - is retired; the great limb stays)
    }
  function poseRope(r, a, b, th) { r.position.lerpVectors(a, b, 0.5); r.scale.set(th, a.distanceTo(b), th); r.quaternion.setFromUnitVectors(v3().set(0, 1, 0), v3().subVectors(b, a).normalize()); }
  function animPulley(t, night) {
    if (HWX.mush) { const k = 0.45 + night * 0.75; HWX.mush.color.setRGB(0.32 * k, 0.78 * k, 1.0 * k); HWX.hollowGlow.color.setRGB(0.3 * k, 0.75 * k, 0.95 * k); HWX.mushGlow.material.opacity = 0.12 + night * 0.5; HWX.mushGlow.visible = false; } }
  // props meshes: rebuilt (instances near the camera only) on each LOD pass
  function propMesh(geo, mat, cap) { const im = new THREE.InstancedMesh(geo, mat, cap); im.count = 0; im.frustumCulled = false; im.receiveShadow = true; im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3); scene.add(im); return im; }
  // climb spots: every crevice that runs out of the Hollow gets a glowing, tappable crack where its mouth breaks the rim - a lumen ribbon draped down the first
  // stretch of the crack (bright along its spine, soft at its edges, pulsing slowly) and a floating climb-down marker; tapping it offers "Climb down (coming soon)"
  const CLB = { spots: [], grp: null };
  function buildClimbSpots() { if (CLB.grp) { scene.remove(CLB.grp); CLB.grp = null; } CLB.spots = []; W.climbSpots = CLB.spots; return; /* no way down into the Hollow for now: the crevices stay carved, but no glowing ribbons, markers or climb-down offers */ const grp = new THREE.Group(); grp.name = 'climbSpots'; scene.add(grp); CLB.grp = grp; CLB.spots = [];
    const glowT = hwCanvasTex(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(60,230,210,0)'); gr.addColorStop(0.32, 'rgba(70,240,220,.35)'); gr.addColorStop(0.5, 'rgba(220,255,250,1)'); gr.addColorStop(0.68, 'rgba(70,240,220,.35)'); gr.addColorStop(1, 'rgba(60,230,210,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); const g2 = g.createLinearGradient(0, 0, 0, h); g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(0.12, 'rgba(0,0,0,1)'); g2.addColorStop(0.8, 'rgba(0,0,0,1)'); g2.addColorStop(1, 'rgba(0,0,0,0)'); g.globalCompositeOperation = 'destination-in'; g.fillStyle = g2; g.fillRect(0, 0, w, h); });
    const icoT = hwCanvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 8, 64, 64, 64); gr.addColorStop(0, 'rgba(120,255,240,.55)'); gr.addColorStop(1, 'rgba(120,255,240,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#0f3d3a'; g.beginPath(); g.arc(64, 64, 34, 0, TAU); g.fill(); g.lineWidth = 5; g.strokeStyle = '#9ffff0'; g.stroke(); g.strokeStyle = '#e8fffb'; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(64, 44); g.lineTo(64, 82); g.moveTo(50, 70); g.lineTo(64, 84); g.lineTo(78, 70); g.stroke(); });
    const mat = new THREE.MeshBasicMaterial({ map: glowT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide, opacity: 0.8 });
    const rimH = (a, nx, ny, w) => { let h = -1e9; for (const f of [-1, -0.6, 0, 0.6, 1]) for (const g2 of [0, Math.PI / 2]) { const cx = Math.cos(g2) * nx - Math.sin(g2) * ny, cy = Math.sin(g2) * nx + Math.cos(g2) * ny; h = Math.max(h, meshH(a[0] + cx * w * 0.9 * f, a[1] + cy * w * 0.9 * f)); } return h; };
    let n = 0; for (const c of W.cracks || []) { const p0 = c.pts[0]; if (!p0 || hollowDist(p0[0], p0[1]) > 90 || c.pts.length < 5) continue; const K = Math.min(c.pts.length - 1, 9), pos = [], uv = [], idx = [];
      for (let i = 0; i <= K; i++) { const a = c.pts[i], b = c.pts[Math.min(i + 1, c.pts.length - 1)], q = c.pts[Math.max(0, i - 1)], tx = b[0] - q[0], ty = b[1] - q[1], tl = Math.hypot(tx, ty) || 1, nx = -ty / tl, ny = tx / tl, hw = Math.max(26, c.ws[i] * 0.75);
        for (const sd of [-1, 1]) { const x = a[0] + nx * hw * sd, y = a[1] + ny * hw * sd; pos.push(x, rimH(a, nx, ny, c.ws[i]) - 6 + 10 * Math.abs(sd), y); uv.push(sd < 0 ? 0 : 1, i / K); } if (i < K) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); const rib = new THREE.Mesh(geo, mat); rib.renderOrder = 5; grp.add(rib);
      const m = c.pts[2], hgt = rimH(m, 1, 0, c.ws[2]) + 55, ico = new THREE.Sprite(new THREE.SpriteMaterial({ map: icoT, transparent: true, depthWrite: false, depthTest: false, toneMapped: false })); ico.scale.set(120, 120, 1); ico.position.set(m[0], hgt, m[1]); ico.renderOrder = 6; grp.add(ico);
      CLB.spots.push({ type: 'climb', i: n++, x: m[0], y: m[1], up: hgt - 40, wide: !!c.wide, ico, rib, name: c.wide ? 'Great chasm' : 'Narrow crevice' }); }
    W.climbSpots = CLB.spots; }
  // solid footprints for Explore's nav: every house's model plan (its bounding box in the model frame, a touch inset) placed like the instance
  function solids() { const out = []; if (!MD) return out; for (const h of W.homes) { if (!h._key || !MD[h._key]) continue; const m = MD[h._key]; if (!m.bb) { const bb = new THREE.Box3(); for (const g of m.geos || []) { if (!g.boundingBox) g.computeBoundingBox(); bb.union(g.boundingBox); } m.bb = bb; }
      out.push({ x: h.x, y: h.y, w: h._w, cs: Math.cos(h._rot), sn: Math.sin(h._rot), b: [m.bb.min.x * 0.94, m.bb.max.x * 0.94, m.bb.min.z * 0.94, m.bb.max.z * 0.94], player: !!h.isPlayer, key: h._key, doorH: m.doors && m.doors[0] ? m.doors[0].h * h._w : 0, doorW: m.doors && m.doors[0] ? m.doors[0].w * h._w : 0 }); } return out; }
  function buildModelScene() { if (!MD || !scene) return;
    for (const s2 of IM.all) for (const m of s2.meshes) { scene.remove(m); m.geometry.dispose(); } IM.all = []; IM.homes = []; IM.trees = [];
    PR.box = []; PR.cyl = []; PR.lamp = []; PR.smoke = []; PR.glow = [];
    const byKey = {}; const push = (k, o) => (byKey[k] || (byKey[k] = [])).push(o);
    W.homes.forEach((h, i) => { const tier = tierOf(h); let key = HOUSE_KIT.keyFor(tier, hash1(i * 3.71 + 0.3)), w = homeW(h, tier) * 0.95 * (1 + 0.06 * (tier % 2)), rot = (h.isPlayer ? 0.4 : hash1(i * 7.13 + 1) * TAU);
      if (h.isPlayer && /^h\d/.test(key) && HOUSE_KIT.variant) { const pk = key + 'P' + Math.round(w * 10); if (!MD[pk]) { const raw = HOUSE_KIT.variant(key, 1), d0 = raw.doors[0]; MD[pk] = d0 ? HOUSE_KIT.variant(key, HOUSE_KIT.DOOR_H / (d0.h * w), true) : raw; } key = pk; } // the player's larger home: its door still the one world size
      h._rot = rot; h._key = key; h._w = w; const y = homeElev(h); push(key, { x: h.x, y: y - (h.elev != null ? 0 : 2), z: h.y, rot, s: w, c: h.isPlayer ? [1.05, 1, 0.95] : tintFor(i + 1, 1 + (tier % 2)), lum: lumAt(h.x, h.y) * 0.9, h }); yardProps(h, i, key, w); });
    for (const k of HOUSE_KIT.KEYS.concat(Object.keys(byKey).filter((q) => /P\d+$/.test(q)))) if (byKey[k]) IM.homes.push(makeSet(k, byKey[k], { near: 2600, minZ: 0.05, shadow: true }));
    /* landmark trees (a tree gripping a mossy boulder): rare - a greedy, seeded pick keeps any two at least a 5-minute run apart (run speed x her map body scale) */
    const LMD = 300 * 3.7 * ((typeof CharView !== 'undefined' && CharView.EXK) || 1.18) * ((typeof Explore !== 'undefined' && Explore.WS) || 6.35), LM = new Set(), lmk = [];
    { const cand = W.objs.filter((o) => o.type === 'tree' && treeKind(o) !== 'sequoia').map((o) => ({ o, h: hash1((o.seed || 0.5) * 13.7 + 0.21) })).sort((a, b) => a.h - b.h);
      for (const { o } of cand) { if (lmk.some((q) => Math.hypot(q.x - o.x, q.y - o.y) < LMD)) continue; LM.add(o); lmk.push({ x: o.x, y: o.y }); } }
    let nt = 0; for (const o of W.objs) if (o.type === 'tree') { const k = treeKind(o), s = o.r * (k === 'sequoia' ? 7.5 : k === 'willow' ? 5.2 : 5.4), y = meshH(o.x, o.y) - 2; nt++;
      // variety: one of 2-3 shapes per kind, its own height/width (0.75-1.35x), a slight lean, and a wide spread of leaf tints (yellow-green to deep blue-green)
      const sd = o.seed || 0.5; let vk = k === 'oak' ? ['oak', 'oak2', 'oak3'][Math.floor(hash1(sd * 91.7) * 3)] : k === 'willow' ? (hash1(sd * 53.1) < 0.5 ? 'willow' : 'willow2') : (hash1(sd * 37.3) < 0.5 ? 'sequoia' : 'sequoia2'); const sz = 0.75 + 0.6 * hash1(sd * 17.9), wd = 0.85 + 0.3 * hash1(sd * 23.3), hu = hash1(sd * 61.1) - 0.5, vv = 0.84 + 0.26 * hash1(sd * 29.9);
      if (LM.has(o)) { vk = vk === 'oak3' ? 'oak3L' : vk.startsWith('willow') ? 'willowL' : 'oakL'; lmk.find((q) => q.x === o.x && q.y === o.y).vk = vk; } M3LM.list = lmk; M3LM.minD = LMD;
      push('t_' + vk, { x: o.x, y, z: o.y, rot: sd * TAU * 7, s: s * sz, sx: wd, sz: wd * (0.92 + 0.16 * hash1(sd * 41.3)), sy: 0.9 + 0.25 * hash1(sd * 47.7), tilt: (hash1(sd * 71.3) - 0.5) * 0.08, c: [vv * (1 + 0.22 * hu), vv * (1 + 0.04 * Math.abs(hu)), vv * (1 - 0.3 * hu)], lum: lumAt(o.x, o.y) * 0.8 }); }
    for (const k of ['oak', 'oak2', 'oak3', 'sequoia', 'sequoia2', 'willow', 'willow2', 'oakL', 'oak3L', 'willowL']) if (byKey['t_' + k] && MD[k]) { MD['t_' + k] = MD[k]; IM.trees.push(makeSet('t_' + k, byKey['t_' + k], { near: 1800, far: 26000, minZ: 0.0, shadow: true })); }
    buildHeartwood(); buildClimbSpots(); if (HWX.trunkRad) GRAND.build({ scene, T: W.heartwood, trunkRad: HWX.trunkRad, ax: HWX.ax, meshH, OUT: W.heartwood.in + Math.PI, barkMat: HWX.barkMat, trunkMat: HWX.trunkMat, moss: HWX.moss, PR });
    const cap = (a) => Math.max(1, a.length);
    if (!IM.props) { const lam = new THREE.MeshLambertMaterial({ color: 0xffffff }); IM.props = { box: propMesh(new THREE.BoxGeometry(1, 1, 1), lam, cap(PR.box)), cyl: propMesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 9), lam, cap(PR.cyl)), lamp: propMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), cap(PR.lamp)) }; }
    else for (const k of ['box', 'cyl', 'lamp']) { const im = IM.props[k]; if (im.instanceMatrix.count < PR[k].length) { scene.remove(im); IM.props[k] = propMesh(im.geometry, im.material, cap(PR[k])); } }
    IM.props.box.castShadow = true;
    // night lantern glows + chimney smoke (shader-animated points)
    if (IM.glow) scene.remove(IM.glow); if (IM.smoke) scene.remove(IM.smoke);
    { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(PR.glow.flatMap((p) => p.slice(0, 3)), 3)); IM.glow = new THREE.Points(g, new THREE.PointsMaterial({ size: 26, map: glowTex('rgba(255,236,180,1)', 'rgba(255,170,80,.4)'), color: 0xffc070, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true })); IM.glow.frustumCulled = false; scene.add(IM.glow); }
    { const pos = [], ph = []; for (const p of PR.smoke) for (let k = 0; k < 7; k++) { pos.push(p[0], p[1], p[2]); ph.push(p[3] + k / 7); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aPh', new THREE.Float32BufferAttribute(ph, 1));
      IM.smoke = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uC: { value: new THREE.Color(0.85, 0.85, 0.85) }, uS: { value: 1 }, uK: { value: CITY.houseScale || 1 }, map: { value: glowTex('rgba(255,255,255,.75)', 'rgba(255,255,255,.3)') } }, transparent: true, depthWrite: false,
        vertexShader: 'attribute float aPh; uniform float uT; uniform float uS; uniform float uK; varying float vA; void main(){ float f = fract(uT * 0.07 + aPh); vec3 p = position + uK * vec3(sin(aPh * 17.0 + f * 3.0) * 6.0 + f * 40.0, f * 120.0, cos(aPh * 11.0) * 6.0 + f * 18.0); vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = min(220.0, uS * uK * (14.0 + f * 50.0) * 600.0 / -mv.z); vA = (1.0 - f) * smoothstep(0.0, 0.12, f) * smoothstep(90.0, 260.0, -mv.z); }',
        fragmentShader: 'uniform sampler2D map; uniform vec3 uC; varying float vA; void main(){ vec4 c = texture2D(map, gl_PointCoord); gl_FragColor = vec4(uC, c.a * vA * 0.55); }' })); IM.smoke.frustumCulled = false; scene.add(IM.smoke); }
    // homes and trees are 3D now: billboards keep only the Exchange
    buildBillboards(); lodAt = null; st.models = { homes: W.homes.length, trees: nt, props: PR.box.length + PR.cyl.length + PR.lamp.length, smoke: PR.smoke.length }; }
  function fillProps(near) { const tv = v3(); for (const k of ['box', 'cyl', 'lamp']) { const im = IM.props[k], A = PR[k]; let n = 0;
      for (const p of A) { const o = p.o; let ok;
        if (!o) ok = true; else if (!near) ok = false;
        else { const y = o.elev != null ? o.elev : (o._gy != null ? o._gy : (o._gy = meshH(o.x, o.y))), dx = o.x - T.x, dz = o.y - T.y; ok = (dx * dx + dz * dz < 1.2e7) && frus.intersectsSphere(sph.set(tv.set(o.x, y, o.y), 160)); }
        if (!ok) continue; p.m.toArray(im.instanceMatrix.array, n * 16); im.instanceColor.array.set(p.c, n * 3); n++; }
      im.count = n; im.visible = n > 0; im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; } }
  function updateModels(t, cam, night, pulse, LC) { if (!MD || !IM.all.length) return;
    LU.uLumenC.value.copy(LC).multiplyScalar(night * 0.22 * pulse + 0.02);
    const key = (st.camOv ? 'x' : 'm') + Math.round(camera.position.x / 60) + ',' + Math.round(camera.position.y / 60) + ',' + Math.round(camera.position.z / 60) + ',' + cam.rot.toFixed(2) + ',' + cam.tilt.toFixed(1);
    const zE = st.camOv ? 1 : cam.z; /* Explore (character scale): the map zoom left behind must never hide the houses - always the full detailed kits near her */
    if (key !== lodAt || ++lodTick > 30) { lodAt = key; lodTick = 0; pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frus.setFromProjectionMatrix(pm);
      for (const s2 of IM.all) fillSet(s2, zE); fillProps(zE > 0.14); }
    IM.props.lamp.material.color.setRGB(0.35 + night * 0.75, 0.27 + night * 0.5, 0.16 + night * 0.25);
    IM.glow.material.opacity = night * 0.28; IM.glow.material.size = st.camOv ? 7 : 26; if (MD.h0a) MD.h0a.mat.emissiveIntensity = night * 0.8; IM.glow.visible = false; /* no glowing orbs around the houses, in any mode or zoom (windows glow through their own emissive) */
    IM.smoke.material.uniforms.uT.value = t; IM.smoke.visible = (st.camOv ? 1 : cam.z) > 0.12; IM.smoke.material.uniforms.uS.value = renderer.getPixelRatio() * cssH / 900; IM.smoke.material.uniforms.uC.value.setRGB(0.86 - night * 0.6, 0.86 - night * 0.6, 0.88 - night * 0.55);
    animPulley(t, night); GRAND.anim(t, night, renderer.getPixelRatio() * cssH / 900);
    if (CLB.grp) { const k = 0.75 + 0.25 * Math.sin(t * 1.6); CLB.grp.children.forEach((o) => { if (o.isMesh) o.material.opacity = k; else if (o.isSprite) { o.material.opacity = 0.75 + 0.25 * Math.sin(t * 2.2); const sc = 120 * Math.max(0.8, Math.min(4, 0.5 / Math.max(0.05, cam.z))); o.scale.set(sc, sc, 1); } }); } }

  /* ---------- build ---------- */
  function supported() { try { const c = document.createElement('canvas'); return !!(window.THREE && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; } }
  function init(wrap, onProgress) {
    if (st.ok || st.building || !supported() || window.NO3D || location.protocol === 'file:') return st.ok; // file:// pages taint WebGL textures: use the 2D painter there
    st.building = true; const prog = onProgress || (() => {});
    cv3 = document.createElement('canvas'); cv3.id = 'city3d'; wrap.insertBefore(cv3, wrap.firstChild);
    renderer = new THREE.WebGLRenderer({ canvas: cv3, antialias: true, powerPreference: 'high-performance' }); // MSAA: tree cut-outs, roofs and ridgelines were stair-stepped (the 'pixelated' look)
    renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene(); scene.background = new THREE.Color(0xbcd3e6); scene.fog = new THREE.Fog(0xbcd3e6, 1e4, 4e4);
    camera = new THREE.PerspectiveCamera(FOV, 1, 20, 2e5);
    hemi = new THREE.HemisphereLight(0xdfeeff, 0x5a6a40, 0.55); scene.add(hemi);
    sun = new THREE.DirectionalLight(0xfff1d6, 1.15); sun.castShadow = true; const mob = Math.min(screen.width, screen.height) < 700; sun.shadow.mapSize.set(mob ? 1024 : 2048, mob ? 1024 : 2048);
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 1.5; scene.add(sun); scene.add(sun.target);
    lumen = new THREE.PointLight(0xffc878, 1, CITY.hollowR * 3.4, 1.1); lumen.position.set(0, P_H - 1500, 0); scene.add(lumen);
    lumen2 = new THREE.PointLight(0xffc878, 0, CITY.hollowR * 2.2, 1.0); lumen2.position.set(0, P_H + 300, 0); scene.add(lumen2); // lifts the glow onto the lip and the nearest rooftops
    const steps = [
      () => { buildMtGrid(); grids[0] = buildGrid(CITY.R + 1500, mob ? 170 : 220, FIN(mob).half); },
      () => { const F = FIN(mob); grids[1] = buildGrid(F.half, F.N, 0); edgeBlend(grids[1], grids[0]); },
      () => { const a = document.createElement('canvas'); a.width = a.height = 2048; paint(a, -(CITY.R + 1500), -(CITY.R + 1500), 2 * (CITY.R + 1500), 2048); texA = canvasTex(a); },
      () => { const b = document.createElement('canvas'); b.width = b.height = 2048; paint(b, -IN(), -IN(), 2 * IN(), 2048); texB = canvasTex(b); },
      () => { cCanvas = document.createElement('canvas'); cCanvas.width = cCanvas.height = 2048; texC = canvasTex(cCanvas);
        const U = { tA: { value: texA }, tB: { value: texB }, tC: { value: texC }, tRock: { value: imgTex(ART.tex.cliff, true, 8) }, uA: { value: new THREE.Vector4(-(CITY.R + 1500), -(CITY.R + 1500), 2 * (CITY.R + 1500), 2 * (CITY.R + 1500)) }, uB: { value: new THREE.Vector4(-IN(), -IN(), 2 * IN(), 2 * IN()) }, tGrass: { value: imgTex(ART.tex.grass, true, 8) }, uC: { value: new THREE.Vector4(0, 0, 1, 1) }, uCOn: { value: 0 }, uExOn: EXU, tK: { value: null }, uK: { value: new THREE.Vector4(0, 0, 1, 1) }, uPH: { value: P_H }, uHR: { value: CITY.hollowR }, uSnowR: { value: CITY.plateauR + 2600 }, uHaze: { value: 0.4 }, uLumen: { value: new THREE.Color(0, 0, 0) } };
        terrainMat = makeTerrainMat(U); terrainMat.userData.U = U; scene.add(makeTerrain(grids[0])); for (const m of makeTerrainTiles(grids[1], 8)) scene.add(m); buildCrevices(); },
      () => { buildBillboards();
        lumenSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(255,214,140,.9)', 'rgba(255,170,80,.3)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); lumenSpr.position.set(0, P_H - PIT * 0.55, 0);
        { const ht = glowTex('rgba(255,196,96,.9)', 'rgba(255,150,50,.3)'); for (let i = 0; i < 9; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: ht, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })); const a = hash1(i * 5.3) * TAU, r = hash1(i * 2.1) * CITY.hollowR * 0.45; sp.userData = { x: Math.cos(a) * r, y: Math.sin(a) * r, ph: i / 9, s: CITY.hollowR * (1.1 + hash1(i + 4) * 0.6) }; hazeSpr.push(sp); scene.add(sp); } } lumenSpr.scale.set(CITY.hollowR * 2.2, CITY.hollowR * 2.2, 1); scene.add(lumenSpr);
        ring = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0xffd46b, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, toneMapped: false })); ring.frustumCulled = false; scene.add(ring); buildRoofLOD();
        ringGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(255,220,120,1)', 'rgba(255,200,90,.35)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); scene.add(ringGlow);
        // dim, sparse window lights for night
        const pts = []; for (const h of W.homes) if (((h.lanternPhase * 10) | 0) % 3 === 0) { const w = homeW(h) * 0.95; pts.push(h.x + (homeSeed(h) - 0.5) * w * 0.5, (h.elev != null ? h.elev : meshH(h.x, h.y)) + w * 0.3, h.y + w * 0.45); }
        const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        lightPts = new THREE.Points(pg, new THREE.PointsMaterial({ size: 9, map: glowTex('rgba(255,236,180,1)', 'rgba(255,190,100,.5)'), color: 0xffc878, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true })); scene.add(lightPts);
        moleSpr = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, alphaTest: 0.5 })); { const e = ART_MANIFEST.s.creatures_3; if (e) { const img = ART.atlas[e[0]], t = imgTex(img); t.offset.set(e[1] / img.width, (e[2] + e[4]) / img.height); t.repeat.set(e[3] / img.width, -e[4] / img.height); moleSpr.material.map = t; moleSpr.scale.set(130, 130 * e[4] / e[3], 1); moleSpr.center.set(0.5, 0.3); } } moleSpr.visible = false; scene.add(moleSpr);
        const ct = glowTex('rgba(255,255,255,.9)', 'rgba(255,255,255,.35)'); for (let i = 0; i < 14; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ct, transparent: true, depthWrite: false, opacity: 0.5 })); s.userData = { a: hash1(i * 7) * TAU, r: 3000 + hash1(i * 3) * 8000, sp: 0.004 + hash1(i) * 0.006, sz: 1800 + hash1(i + 9) * 2200 }; s.scale.set(s.userData.sz * 1.6, s.userData.sz, 1); clouds.push(s); scene.add(s); }
        if (typeof Explore !== 'undefined') Explore.buildWorld(scene); // sturdy bridges across the summit clefts
        if (typeof Explore !== 'undefined' && Explore.allPaths) setPaths(Explore.allPaths()); // worn footpaths between the key places and every bridge
        st.ok = true; st.building = false; loadModels(); },
    ];
    let i = 0; const run = () => { const t0 = performance.now(); while (i < steps.length && performance.now() - t0 < 30) { steps[i](); i++; prog(i / steps.length); } if (i < steps.length) setTimeout(run, 0); else prog(null); };
    try { run(); } catch (e) { console.error('3D init failed', e); st.building = false; st.ok = false; return false; }
    return true;
  }

  /* ---------- camera ---------- */
  let cssW = 1, cssH = 1;
  function resize(w, h, dpr) { if (!renderer) return; cssW = w; cssH = h; renderer.setPixelRatio(Math.min(2, dpr)); renderer.setSize(w, h, false); cv3.style.width = w + 'px'; cv3.style.height = h + 'px'; camera.aspect = w / h; camera.updateProjectionMatrix(); }
  function dist(cam) { return cssH / (cam.z * 2 * Math.tan((FOV * Math.PI) / 360)); }
  function targetH(x, y) { let th = Math.max(meshH(x, y), P_H * (1 - clamp((Math.hypot(x, y) - CITY.hollowR) / 600, 0, 1)) - 200);
    return th; }
  function place(cam, snap) {
    const OV = st.camOv; if (OV) { camera.position.copy(OV.P); camera.lookAt(OV.L); T.x = OV.L.x; T.h = OV.L.y; T.y = OV.L.z; camera.near = OV.near || 1.5; camera.far = OV.far || 32000; camera.updateProjectionMatrix(); camera.updateMatrixWorld(); return; } // Explore: the shared follow camera drives the view (and every screen projection)
    const th = targetH(cam.x, cam.y);
    if (snap === 'keep') snap = Math.hypot(T.x - cam.x, T.y - cam.y) > 300 ? true : null;
    T.x = cam.x; T.y = cam.y; T.h = snap === null ? T.h : snap ? th : T.h + (th - T.h) * 0.12;
    const D = dist(cam), ph = (cam.tilt * Math.PI) / 180, th2 = cam.rot;
    camera.position.set(T.x + Math.sin(th2) * Math.cos(ph) * D, T.h + Math.sin(ph) * D, T.y + Math.cos(th2) * Math.cos(ph) * D);
    const g = meshH(camera.position.x, camera.position.z) + 60; if (camera.position.y < g) camera.position.y = g;
    canopyClear(D, ph, th2);
    camera.lookAt(T.x, T.h, T.y); camera.updateMatrixWorld(); camera.far = D * 6 + 30000; camera.near = Math.max(5, D * 0.02); camera.updateProjectionMatrix();
  }
  // never put the camera inside the Heartwood's foliage: if florets sit between the target and the camera, drop the camera
  // lower (a flatter view from under the canopy, same distance); only if that fails, pull it in front of the leaves
  function blockedAt(C, tx, ty, tz, px, py, pz) { let ddx = px - tx, ddy = py - ty, ddz = pz - tz; const L = Math.hypot(ddx, ddy, ddz) || 1; ddx /= L; ddy /= L; ddz /= L; let hit = L;
    for (const c of C) { const ox = tx - c[0], oy = ty - c[1], oz = tz - c[2], r = c[3] * 1.12 + 80, bb = ox * ddx + oy * ddy + oz * ddz, cc = ox * ox + oy * oy + oz * oz - r * r; if (cc < 0) continue; const disc = bb * bb - cc; if (disc < 0) continue; const t0 = -bb - Math.sqrt(disc); if (t0 > 0 && t0 < hit) hit = t0; }
    return hit < L ? hit : 0; }
  function canopyClear(D, ph, rot) { const C = HWX.clumps, Tw = W.heartwood; if (!C || !C.length || !Tw) return; const cp = camera.position; if (Math.hypot(T.x - Tw.x, T.y - Tw.y) > 8000 && Math.hypot(cp.x - Tw.x, cp.z - Tw.y) > 9000) return;
    if (!blockedAt(C, T.x, T.h, T.y, cp.x, cp.y, cp.z)) return;
    for (let p2 = ph - 0.06; p2 > -0.12; p2 -= 0.06) { const x = T.x + Math.sin(rot) * Math.cos(p2) * D, y = T.h + Math.sin(p2) * D, z = T.y + Math.cos(rot) * Math.cos(p2) * D; if (y < meshH(x, z) + 60) break; if (!blockedAt(C, T.x, T.h, T.y, x, y, z)) { cp.set(x, y, z); return; } }
    const hit = blockedAt(C, T.x, T.h, T.y, cp.x, cp.y, cp.z), L = Math.hypot(cp.x - T.x, cp.y - T.h, cp.z - T.y), k = Math.max(hit - 60, Math.min(L, 260)) / L; cp.set(T.x + (cp.x - T.x) * k, T.h + (cp.y - T.h) * k, T.y + (cp.z - T.y) * k); }
  // is the straight line from a target point to a camera position clear of terrain, the Heartwood's trunk and its foliage?
  function sightBlocked(tx, ty, tz, px, py, pz) { const Tw = W.heartwood, nearHW = Tw && (Math.hypot(tx - Tw.x, tz - Tw.y) < 9000 || Math.hypot(px - Tw.x, pz - Tw.y) < 9000);
    const L = Math.hypot(px - tx, py - ty, pz - tz) || 1, mx = (tx + px) / 2, mz = (tz + pz) / 2, R2 = Math.hypot(px - tx, pz - tz) / 2 + 300;
    const nb = []; for (const h of W.homes) { if (Math.hypot(h.x - mx, h.y - mz) > R2 || Math.hypot(h.x - tx, h.y - tz) < 30) continue; const w = homeW(h); nb.push([h.x, h.y, w * 0.62, meshH(h.x, h.y) + w * 1.45]); } // neighbouring houses in the way
    for (let i = 1; i <= 40; i++) { const u = i / 40, x = tx + (px - tx) * u, y = ty + (py - ty) * u, z = tz + (pz - tz) * u; for (const q of nb) if (y < q[3] && Math.hypot(x - q[0], z - q[1]) < q[2]) return 'house'; }
    for (let i = 1; i <= 40; i++) { const u = i / 40, x = tx + (px - tx) * u, y = ty + (py - ty) * u, z = tz + (pz - tz) * u; if (u * L < 70) continue; // the house's own yard
      if (y < meshH(x, z) + 12) return 'ground';
      if (!nearHW) continue; const f = (y - Tw.base) / Tw.H;
      if (f > -0.12 && f < 0.82) { const [ax0, az0] = hwAxis(f), r = hwTrunkR(f) * (f < 0.12 ? 1.7 : 1.3) + 60; if (Math.hypot(x - ax0, z - az0) < r) return 'trunk'; }
 }
    if (nearHW && HWX.clumps.length && blockedAt(HWX.clumps, tx, ty, tz, px, py, pz)) return 'leaves';
    return null; }
  // pick a camera direction, tilt and zoom that see a spot clearly: start from the preferred view, then turn round it, tilt up, and move in
  // (second pass: foliage alone is acceptable, since place() then slips the camera under the canopy at the same distance)
  function focusView(x, y, z, rot0, tilt0) { const th = targetH(x, y), base = clamp(tilt0 || 40, 35, 70);
    for (const soft of [false, true]) { const tried = [];
      for (const zk of [1, 1.3, 1.7, 2.3]) for (const tl of [base, base + 10, base + 20, 70]) { const tilt = Math.min(70, tl); if (tried.includes(zk + ':' + tilt)) continue; tried.push(zk + ':' + tilt);
        const D = dist({ z: z * zk }), ph = (tilt * Math.PI) / 180;
        for (let k = 0; k < 18; k++) { const rot = rot0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.35, px = x + Math.sin(rot) * Math.cos(ph) * D, py = th + Math.sin(ph) * D, pz = y + Math.cos(rot) * Math.cos(ph) * D;
          if (py < meshH(px, pz) + 60) continue; const b = sightBlocked(x, th, y, px, py, pz); if (!b || (soft && b === 'leaves')) return { rot, tilt, z: z * zk, clear: !b }; } } }
    return { rot: rot0, tilt: 70, z: z * 2.3, clear: false }; }
  function project(x, y, up, abs) { const p = v3().set(x, (abs ? 0 : meshH(x, y)) + (up || 0), y).project(camera); if (p.z > 1) return [-9999, -9999]; return [((p.x + 1) / 2) * cssW, ((1 - p.y) / 2) * cssH]; }
  function unproject(sx, sy) {
    const o = camera.position.clone(), d = v3().set((sx / cssW) * 2 - 1, -(sy / cssH) * 2 + 1, 0.5).unproject(camera).sub(o).normalize();
    let t = 0, prev = 0; const maxT = camera.far, step0 = Math.max(10, o.y / 300);
    for (let i = 0; i < 600 && t < maxT; i++) { const step = step0 * (1 + t / 4000); t += step; const p = o.clone().addScaledVector(d, t); if (p.y <= meshH(p.x, p.z)) { let a = prev, b = t; for (let k = 0; k < 14; k++) { const m = (a + b) / 2, q = o.clone().addScaledVector(d, m); if (q.y <= meshH(q.x, q.z)) b = m; else a = m; } const q = o.clone().addScaledVector(d, b); return [q.x, q.z]; } prev = t; }
    if (d.y < 0) { const tt = (o.y - P_H * 0) / -d.y; const q = o.clone().addScaledVector(d, tt); return [q.x, q.z]; } return [T.x, T.y];
  }
  function viewBox() { const pts = [[0, 0], [cssW, 0], [0, cssH], [cssW, cssH], [cssW / 2, cssH / 2]].map(([a, b]) => unproject(a, b)); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } const R = CITY.R + 1500; return { x0: Math.max(x0, -R), y0: Math.max(y0, -R), x1: Math.min(x1, R), y1: Math.min(y1, R), pts }; }

  /* ---------- detail texture around the camera ---------- */
  function updateDetail(cam) {
    const U = terrainMat.userData.U;
    const ex = !!st.camOv; EXU.value = ex ? 1 : 0; if (ex) crevMask(st.camOv.L.x, st.camOv.L.z, 3000); else crevMask(cam.x, cam.y, 8000); if (typeof Explore !== 'undefined' && Explore.lod) Explore.lod(cam.x, cam.y); // Explore: a tight, sharp splat around the player (~11 cm a texel) plus the shader's close-up ground detail
    if (cam.z < 0.28 && !ex) { U.uCOn.value = 0; cState = null; return; }
    const size = ex ? 1000 : 2600, px = 2048; if (cState && cState.size !== size) cState = null;
    if (!cState || Math.hypot(cam.x - cState.cx, cam.y - cState.cy) > (ex ? 220 : 700)) { if (cState && cState.q < 4) {} else { cState = { cx: Math.round(cam.x / 50) * 50, cy: Math.round(cam.y / 50) * 50, q: 0, size }; } }
    if (cState.q < 4) { const q = cState.q, ox = (q % 2) * 1024, oy = (q >> 1) * 1024, s0 = px / size; if (q === 0) cState.parts = [];
      const tmp = document.createElement('canvas'); tmp.width = tmp.height = 1024; paint(tmp, cState.cx - size / 2 + ox / s0, cState.cy - size / 2 + oy / s0, size / 2, 1024); cState.parts.push([tmp, ox, oy]); cState.q++;
      if (cState.q === 4) { const g = cCanvas.getContext('2d'); g.clearRect(0, 0, px, px); for (const [c, x, y] of cState.parts) g.drawImage(c, x, y); cState.parts = null; texC.dispose(); texC = canvasTex(cCanvas); U.tC.value = texC; /* a fresh texture each repaint: re-using one left a stale mip chain (pale blotches at a distance) */ U.uC.value.set(cState.cx - size / 2, cState.cy - size / 2, size, size); U.uCOn.value = 1; } }
  }

  /* ---------- per frame ---------- */
  const cDay = new THREE.Color(0xbfd5e8), cNight = new THREE.Color(0x101830), tmpC = new THREE.Color(), tmpL = new THREE.Color(), tmpT = new THREE.Color();
  function render(t, cam) {
    if (!st.ok) return;
    if (playerTier() !== st.playerTier) buildBillboards();
    place(cam); // (in Explore the shared follow camera drives the view - see place)
    const night = nightFactor(), pulse = 0.78 + 0.22 * Math.sin(t * 0.9) + 0.06 * Math.sin(t * 2.3), D = st.camOv ? st.camOv.D : dist(cam);
    // sun & sky
    const sunDir = st.camOv ? v3().set(-0.6, 0.46, -0.5).normalize() : v3().set(-0.55, 0.75, -0.45).normalize(); /* close up (Explore): a lower, warmer afternoon sun - long soft shadows */
    sun.position.set(T.x + sunDir.x * 9000, T.h + sunDir.y * 9000, T.y + sunDir.z * 9000); sun.target.position.set(T.x, T.h, T.y); sun.target.updateMatrixWorld();
    const S = clamp(D * 1.1, 500, 9000), sc = sun.shadow.camera; if (sc.right !== S) { sc.left = -S; sc.right = S; sc.top = S; sc.bottom = -S; sc.near = 100; sc.far = 22000; sc.updateProjectionMatrix(); }
    const wm = st.camOv ? 1 : 0; sun.intensity = (1.15 + 0.1 * wm) * (1 - night * 0.88); sun.color.setRGB(1, 0.95 - night * 0.1 - 0.06 * wm, 0.85 - night * 0.1 - 0.17 * wm);
    hemi.intensity = 0.55 - night * 0.33; hemi.color.copy(tmpC.set(wm ? 0xfff0d6 : 0xdfeeff).lerp(new THREE.Color(0x5068a8), night)); hemi.groundColor.set(wm ? 0x6a5a2c : 0x5a6a40);
    const sky = tmpC.copy(cDay).lerp(cNight, night); scene.background.copy(sky); scene.fog.color.copy(sky);
    scene.fog.near = D * 1.4 + 1500; scene.fog.far = D * 5 + 12000;
    // the Hollow: the great light at night
    // Lumen: a rich pulse that drifts between warm gold and soft teal (tone-mapped, so it never clips to white)
    const hue = 0.5 + 0.5 * Math.sin(t * 0.23), LC = tmpL.setRGB(1.0, 0.58, 0.16).lerp(tmpT.setRGB(0.35, 0.9, 0.85), hue * 0.55 * (0.35 + 0.65 * night));
    const lum = (1.7 + night * 2.2) * pulse; lumen.intensity = lum; lumen.distance = CITY.hollowR * (3.2 + night * 1.0); lumen.color.copy(LC); lumen2.intensity = night * 2.2 * pulse; lumen2.color.copy(LC);
    lumenSpr.material.opacity = (0.3 - night * 0.06) * pulse; lumenSpr.material.color.copy(LC); lumenSpr.scale.setScalar(CITY.hollowR * (1.9 + 0.2 * pulse));
    const U = terrainMat.userData.U; U.uLumen.value.copy(LC).multiplyScalar((0.62 + night * 0.55) * pulse);
    // a column of glowing haze rising out of the pit, clearly visible by day too
    for (const hs of hazeSpr) { const u = hs.userData, f = (u.ph + t * 0.012) % 1; hs.position.set(u.x, P_H - 1700 + f * 3600, u.y); const s2 = u.s * (0.7 + 0.6 * f); hs.scale.set(s2, s2 * 0.75, 1); hs.material.opacity = (0.22 - night * 0.1) * pulse * Math.sin(Math.PI * f); hs.material.color.copy(LC); } U.uHaze.value = 0.4 * (1 - night * 0.5);
    const light = 1.0 - night * 0.62, bl = new THREE.Color(light, light * (1 - night * 0.05), light * (1 + night * 0.12));
    for (const m of bbMat) if (m) { m.uniforms.uLight.value.copy(bl); m.uniforms.uFogC.value.copy(sky); m.uniforms.uFogN.value = scene.fog.near; m.uniforms.uFogF.value = scene.fog.far; m.uniforms.uLumen.value.copy(LC).multiplyScalar(night * 0.7 * pulse); }
    if (roofPts) { const f = st.camOv ? 0 : clamp((0.16 - cam.z) / 0.08, 0, 1); roofPts.visible = f > 0.01; /* far-map roof dots only: never at character scale (they read as giant coloured domes over the houses) */ roofPts.material.opacity = f; roofPts.material.color.copy(bl); }
    lightPts.material.opacity = night * 0.45; lightPts.visible = false; /* (window-light orbs retired) */
    // player highlight
    const h = W.player, w = homeW(h), gy = (h.elev != null ? h.elev : meshH(h.x, h.y)) + 3, p2 = 0.5 + 0.5 * Math.sin(t * 2.5);
    if (ringAt !== h.x + ',' + h.y) drapeRing(); ring.material.opacity = 0.5 + p2 * 0.4;
    ringGlow.position.set(h.x, gy + w * 0.3, h.y); ringGlow.scale.setScalar(w * 2.4); ringGlow.material.opacity = 0.35 + 0.2 * p2; ring.visible = !st.camOv; ringGlow.visible = false; /* Explore: no map-scale 'your home' ring and glow orb hovering round the house at character scale */
    // mole
    const mole = currentMole(); moleSpr.visible = !!mole; if (mole) moleSpr.position.set(mole.x, meshH(mole.x, mole.y) + Math.sin(t * 3) * 3, mole.y);
    // clouds drift high above
    const wx = weatherNow(t); for (const c of clouds) { const u = c.userData, a = u.a + t * u.sp * 0.1; c.position.set(Math.cos(a) * u.r, 2600 + u.sz * 0.2, Math.sin(a) * u.r); c.material.opacity = (wx.type === 'cloud' ? 0.55 : 0.32) * (1 - night * 0.6) * clamp((D - 1500) / 4000, 0, 1); }
    updateModels(t, cam, night, pulse, LC);
    updateDetail(cam);
    renderer.render(scene, camera); st.calls = renderer.info.render.calls; st.tris = renderer.info.render.triangles;
    if (st.overlay) { const enc = renderer.outputEncoding, tm = renderer.toneMapping, ac = renderer.autoClear; renderer.autoClear = false; renderer.outputEncoding = THREE.LinearEncoding; renderer.toneMapping = THREE.NoToneMapping; renderer.render(st.overlay, camera); renderer.outputEncoding = enc; renderer.toneMapping = tm; renderer.autoClear = ac; } // Explore: Wren drawn with her own Character-tab lights and colour response, depth-tested against the map
  }
  function tapSprites(sx, sy, list) { // screen-space hit test against standing billboards: distance to the segment from base to top
    let best = null, bd = 1e9;
    for (const o of list) { const hgt = o.hgt, up = o.up || 0; const a = project(o.x, o.y, up), b = project(o.x, o.y, up + hgt); if (a[0] < -999 || b[0] < -999) continue;
      const vx = b[0] - a[0], vy = b[1] - a[1], l2 = vx * vx + vy * vy || 1; if (l2 > cssH * cssH * 2) continue; let u = ((sx - a[0]) * vx + (sy - a[1]) * vy) / l2; u = clamp(u, 0, 1); const d = Math.hypot(a[0] + vx * u - sx, a[1] + vy * u - sy);
      const rad = Math.max(14, Math.hypot(vx, vy) * (o.wf || 0.35)); if (d < rad && d - rad < bd) { bd = d - rad; best = o.o; } }
    return best;
  }
  return { landmarks: M3LM, setPaths, pathDip, get paths() { return PTH; }, solids, groundH, get crevices() { return CRV; }, SSR, routeCarve, get scene() { return scene; }, get camera() { return camera; }, get renderer() { return renderer; }, heightAt, get climb() { return CLB; }, get hwx() { return HWX; }, get im() { return IM; }, lodReset: () => { lodAt = null; }, focusView, sightBlocked, targetH, treeKind, refresh: () => { if (st.ok) { buildBillboards(); buildRoofLOD(); drapeRing(); lightsPts(); if (MD) buildModelScene(); } }, st, ground, get models() { return mdState; }, init, resize, render, project, unproject, viewBox, meshH, place, tapSprites, dist, get dbg() { return { texA, texB, texC, U: terrainMat && terrainMat.userData.U }; }, get canvas() { return cv3; } };
})();

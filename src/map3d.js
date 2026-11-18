
/* =====================================================================
   RIM CITY 3D — Three.js renderer: heightmap terrain (raised plateau, the Hollow pit, carved fissures, snowy
   mountains), painted ground textures, sun + soft shadows, haze, instanced billboard homes/trees, night Lumen glow.
   The 2D canvas on top only carries labels/HUD. Falls back to the 2D painter when WebGL is missing.
   ===================================================================== */
const M3 = (() => {
  const P_H = CITY.summitH, PIT = 3800, FOV = 40; const IN = () => CITY.plateauR + 1700; // half-size of the fine inner terrain grid
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
      h = P_H - PIT * base2 - 30 * g - 110 * ridged(x / 380, y / 380, 3) * smooth01(0, 0.05, g) * (1 - smooth01(0.85, 1, g)); }
    // fissures: carved trenches; where they meet the Hollow they keep cutting down the pit wall as channels
    const cd = chasmDist(x, y); if (cd < 14) { const q = smooth01(14, -22, cd), n = 5, qn = q * n, qi = Math.floor(qn); h -= 720 * ((qi + smooth01(0.35, 1, qn - qi)) / n); } // deep, ledged clefts: climbable rock walls stepping down
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
  // climbable rock pitches (~35 m each), cut into the face so the lowlands (your Ledge) and the summit (Rim City, the Grand Tree) connect
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
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aMt; varying vec3 vWP; varying vec3 vWN; varying float vMt;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal); vMt = aMt;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vWP; varying vec3 vWN; varying float vMt;
uniform sampler2D tA; uniform sampler2D tB; uniform sampler2D tC; uniform sampler2D tRock; uniform sampler2D tGrass; uniform vec4 uA; uniform vec4 uB; uniform vec4 uC; uniform float uCOn;
uniform float uPH; uniform float uHR; uniform vec3 uLumen; uniform float uDeep; uniform float uSnowR; uniform float uHaze;
float edgeF(vec2 u, float w) { return smoothstep(0.0, w, min(min(u.x, 1.0 - u.x), min(u.y, 1.0 - u.y))); }`)
        .replace('#include <map_fragment>', `
vec2 wp = vWP.xz; vec4 tc = texture2D(tA, (wp - uA.xy) / uA.zw);
vec2 ub = (wp - uB.xy) / uB.zw; if (ub.x > 0.0 && ub.x < 1.0 && ub.y > 0.0 && ub.y < 1.0) tc = mix(tc, texture2D(tB, ub), edgeF(ub, 0.02));
if (uCOn > 0.5) { vec2 uc = (wp - uC.xy) / uC.zw; if (uc.x > 0.0 && uc.x < 1.0 && uc.y > 0.0 && uc.y < 1.0) tc = mix(tc, texture2D(tC, uc), edgeF(uc, 0.08)); }
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
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
float ledge = 0.55 + 0.45 * smoothstep(0.3, 0.8, slope); // terrace walls catch more glow than their ledges, so the steps read
totalEmissiveRadiance += uLumen * inPit * (pow(dep, 0.9) * 1.25 * ledge) * (tc.rgb * 1.8 + 0.04) + uLumen * 0.1 * inPit * smoothstep(0.7, 1.0, dep);`)
        .replace('#include <fog_fragment>', `#include <fog_fragment>
#ifdef USE_FOG
float hz = uHaze * (1.0 - smoothstep(0.0, uPH * 0.85, vWP.y)) * (1.0 - inPitH(vWP.xz)) * smoothstep(1500.0, 9000.0, length(vWP - cameraPosition));
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
  vec4 c = texture2D(map, vUv); if (c.a < 0.5) discard;
  vec3 col = c.rgb * uLight + c.rgb * uLumen * vLum;
  gl_FragColor = vec4(mix(col, uFogC, vFog), 1.0);
  #include <tonemapping_fragment>
  #include <encodings_fragment>
}`;
  function lumAt(x, y) { const d = Math.hypot(x, y) - CITY.hollowR, u = clamp(1 - d / (CITY.hollowR * 0.7), 0, 1); return u * u; }
  function spriteList() {
    const L = [];
    const add = (spr, x, y, w, ay, flip, lum, elev) => { const e = ART_MANIFEST.s[spr]; if (!e) return; L.push({ e, x, y, w, ay, flip, elev, lum: lum == null ? lumAt(x, y) : lum }); };
    if (!MD) for (const h of W.homes) { const tier = tierOf(h); add(homeSprite(h), h.x, h.y, homeW(h, tier) * (h.heartwood ? 0.9 : 1.4), TIER_AY[tier], homeFlip(h), null, h.elev); }
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
        bbMat[ai] = new THREE.ShaderMaterial({ uniforms: { map: { value: tex }, uLight: { value: new THREE.Color(1, 1, 1) }, uFogC: { value: new THREE.Color() }, uFogN: { value: 1e5 }, uFogF: { value: 2e5 }, uLumen: { value: new THREE.Color(0, 0, 0) } }, vertexShader: BB_VS, fragmentShader: BB_FS }); }
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
  function winPts() { const pts = []; for (const h of W.homes) if (((h.lanternPhase * 10) | 0) % 3 === 0) { const w = homeW(h) * (h.heartwood ? 0.62 : 0.95); pts.push(h.x + (homeSeed(h) - 0.5) * w * 0.5, (h.elev != null ? h.elev : meshH(h.x, h.y)) + w * 0.3, h.y + w * 0.45); } return pts; }
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
    if (m.chim && m.chim[0] && (h.heartwood || hash1(i * 3.3 + 1) < 0.45)) { const p = at(m.chim[0]); PR.smoke.push([p[0], p[1], p[2], hash1(i * 7.7) * 10, h]); }
    if (m.lamps) for (const c of m.lamps) { const p = at(c); PR.glow.push([p[0], p[1], p[2], h]); } }
  /* ---------- the Heartwood: one colossal upright tree growing out of the Hollow's inner wall (merged geometry, instanced foliage) ---------- */
  function hwCanvasTex(w, h, draw, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; if (rep) t.repeat.set(rep[0], rep[1]); return t; }
  // the Grand Tree's bark, hand-made (same craft as the Lumen Tree's hall): long interlocking plates drawn out up the trunk, split by deep dark furrows, every
  // plate its own weathered tone (grey-brown, some warmer, some mossy), combed with fibres and baked as a lit relief so it reads deep at every zoom; fine
  // cross-cracks and a few knots on top. Tileable.
  function barkTex() { return hwCanvasTex(256, 512, (g, w, h) => { let s = 7; const R = () => (s = (s * 16807) % 2147483647) / 2147483647, GX = 6, GY = 3, pts = [], tone = [], ph = R() * 100;
      for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) { pts.push([(i + 0.15 + R() * 0.7) / GX, (j + 0.15 + R() * 0.7) / GY]); const k = R(); tone.push(k < 0.16 ? [0.9, 1.02, 0.78] : k < 0.36 ? [1.1, 0.95, 0.82] : [0.92 + R() * 0.16, 0.92 + R() * 0.12, 0.9 + R() * 0.1]); }
      const H = new Float32Array(w * h), T = new Int16Array(w * h);
      for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) { const v = py / h, u = (px / w + 0.012 * Math.sin(v * TAU * 2 + ph + Math.sin(px / w * TAU * 2) * 2) + 1) % 1, ci = Math.floor(u * GX), cj = Math.floor(v * GY); let d1 = 9, d2 = 9, id = 0;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ii = (ci + di + GX) % GX, jj = (cj + dj + GY) % GY, P = pts[jj * GX + ii], ox = ((ci + di) - ii) / GX, oy = ((cj + dj) - jj) / GY, dx = P[0] + ox - u, dy = (P[1] + oy - v) * 0.3, d = dx * dx + dy * dy; if (d < d1) { d2 = d1; d1 = d; id = jj * GX + ii; } else if (d < d2) d2 = d; }
        const e = Math.sqrt(d2) - Math.sqrt(d1), fib = 0.5 + 0.5 * Math.sin(u * TAU * 14 + Math.sin(v * TAU * 2 + ph) * 0.9 + Math.sin(u * TAU * 5) * 1.2); H[py * w + px] = Math.min(1, e * 9) ** 0.6 * (0.72 + 0.28 * fib); T[py * w + px] = id; }
      const img = g.createImageData(w, h), D = img.data, at = (px, py) => H[((py + h) % h) * w + ((px + w) % w)];
      for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) { const k = py * w + px, hv = H[k], lit = Math.max(-1, Math.min(1, (-(at(px + 1, py) - at(px - 1, py)) * 0.7 - (at(px, py + 1) - at(px, py - 1)) * 0.7) * 5)), tn = tone[T[k]], crev = 1 - Math.min(1, hv * 3.2), sh = (0.42 + 0.58 * hv) * (1 + 0.4 * lit) * (1 - 0.82 * crev), n2 = 0.95 + 0.1 * Math.sin(px * 1.7 + py * 0.31 + Math.sin(py * 0.05) * 9);
        D[k * 4] = Math.min(255, 150 * tn[0] * sh * n2 + 12); D[k * 4 + 1] = Math.min(255, 124 * tn[1] * sh * n2 + 9); D[k * 4 + 2] = Math.min(255, 96 * tn[2] * sh * n2 + 7); D[k * 4 + 3] = 255; }
      g.putImageData(img, 0, 0);
      for (let i = 0; i < 50; i++) { let px = R() * w, py = R() * h; g.strokeStyle = `rgba(24,16,10,${0.25 + R() * 0.3})`; g.lineWidth = 0.8 + R(); g.beginPath(); g.moveTo(px, py); for (let q = 0; q < 4; q++) { px += (R() - 0.5) * 8; py += 4 + R() * 9; g.lineTo(px, py); } g.stroke(); }
      for (let i = 0; i < 4; i++) { const cx = R() * w, cy = R() * h, rw = 4 + R() * 6, rh = 9 + R() * 12; for (let k = 0; k < 4; k++) { g.strokeStyle = k % 2 ? 'rgba(170,140,105,.35)' : 'rgba(28,18,10,.6)'; g.lineWidth = 1.3; g.beginPath(); g.ellipse(cx, cy, rw * (1 - k * 0.22), rh * (1 - k * 0.22), 0, 0, TAU); g.stroke(); } } }); }
  function leafTex() { return hwCanvasTex(256, 256, (g, w, h) => { g.fillStyle = '#7c9a42'; g.fillRect(0, 0, w, h); let s = 11; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 2600; i++) { const x = R() * w, y = R() * h, r = 2 + R() * 4, k = R(); g.fillStyle = k < 0.3 ? `rgba(${70 + R() * 20 | 0},${96 + R() * 20 | 0},${40 + R() * 10 | 0},.75)` : k < 0.8 ? `rgba(${124 + R() * 30 | 0},${154 + R() * 26 | 0},${66 + R() * 20 | 0},.8)` : `rgba(${176 + R() * 30 | 0},${196 + R() * 20 | 0},${104 + R() * 30 | 0},.75)`;
      g.beginPath(); g.ellipse(x, y, r, r * 0.55, R() * TAU, 0, TAU); g.fill(); } }); }
  function plankTex() { return hwCanvasTex(128, 128, (g, w, h) => { let s = 5; const R = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < 8; i++) { const c = 0.75 + R() * 0.3; g.fillStyle = `rgb(${142 * c | 0},${104 * c | 0},${66 * c | 0})`; g.fillRect(0, i * 16, w, 16); g.fillStyle = 'rgba(40,26,14,.7)'; g.fillRect(0, i * 16 + 14, w, 2); g.fillRect((R() * w) | 0, i * 16, 2, 14); } }); }
  // geometry accumulator -> one merged mesh
  function GA() { return { p: [], n: [], uv: [], c: [], i: [] }; }
  function gaMesh(A, mat, normals) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(A.p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(A.uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(A.c, 3)); g.setIndex(A.i);
    if (normals) g.setAttribute('normal', new THREE.Float32BufferAttribute(A.n, 3)); else g.computeVertexNormals(); g.computeBoundingSphere(); const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m; }
  // a tube through centres `pts` with radius rad(i, ang) (parallel-transport frames), vertex colour col(i, ang, pos)
  function gaTube(A, pts, seg, rad, col, uvk) { const n = pts.length, base = A.p.length / 3; let nr = null, vacc = 0;
    for (let i = 0; i < n; i++) { const t = v3().subVectors(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize();
      if (!nr) { nr = Math.abs(t.y) < 0.9 ? v3().set(0, 1, 0).cross(t).normalize() : v3().set(1, 0, 0).cross(t).normalize(); } else nr.addScaledVector(t, -nr.dot(t)).normalize();
      const b = v3().crossVectors(t, nr); if (i) vacc += pts[i].distanceTo(pts[i - 1]);
      for (let k = 0; k <= seg; k++) { const a = (k / seg) * TAU, d = v3().copy(nr).multiplyScalar(Math.cos(a)).addScaledVector(b, Math.sin(a)), r = rad(i, a), p = v3().copy(pts[i]).addScaledVector(d, r);
        A.p.push(p.x, p.y, p.z); A.n.push(d.x, d.y, d.z); A.uv.push((k / seg) * uvk[0], vacc / uvk[1]); const c = col(i, a, p, d); A.c.push(c[0], c[1], c[2]); } }
    for (let i = 0; i < n - 1; i++) for (let k = 0; k < seg; k++) { const a = base + i * (seg + 1) + k, b2 = a + seg + 1; A.i.push(a, b2, a + 1, a + 1, b2, b2 + 1); } }
  function bez(p0, p1, p2, p3, n) { const c = new THREE.CubicBezierCurve3(p0, p1, p2, p3); return c.getPoints(n); }
  const HWX = { built: false, objs: [], mush: null, mushGlow: null, badges: [], clumps: [], seats: [] };
  // the pit wall: radius (from the Hollow's centre) where the wall reaches height y along angle phi
  function wallR(phi, y) { let lo = Math.max(50, hollowR(phi) - 3000), hi = hollowR(phi) + 300; for (let i = 0; i < 20; i++) { const m = (lo + hi) / 2, [x, z] = polar(m, phi); if (meshH(x, z) > y) hi = m; else lo = m; } return (lo + hi) / 2; }
  function puffGeo(det, seed) { // one leafy floret: a lumpy ball (cauliflower bumps), lit from the top, dark underneath
    const g = new THREE.IcosahedronGeometry(1, det), P = g.attributes.position, cc = [], uv = [];
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      const n = 1 + 0.16 * (vnoise(x * 2.1 + seed, z * 2.1 + y * 1.9 + seed) - 0.5) * 2 + 0.07 * Math.sin(x * 9 + seed) * Math.sin(y * 8 + 1) * Math.sin(z * 9 + 2) + 0.04 * Math.sin(x * 17 + y * 13 + z * 15);
      P.setXYZ(i, x * n, (y > 0 ? y * 0.92 : y * 0.62) * n, z * n);
      const t = clamp((y + 0.75) / 1.6, 0, 1), sh = 0.38 + 0.78 * Math.pow(t, 1.15); cc.push(sh * (0.97 + 0.1 * t), sh, sh * (0.86 - 0.14 * t)); uv.push((Math.atan2(z, x) / Math.PI + 1) * 1.5, (y + 1) * 1.2); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g; }
  function canopyLeafTex() { return hwCanvasTex(512, 512, (g, w, h) => { g.fillStyle = '#5f7334'; g.fillRect(0, 0, w, h); let s = 23; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 5200; i++) { const x = R() * w, y = R() * h, r = 3 + R() * 6, k = R(), a = R() * TAU;
      g.fillStyle = k < 0.22 ? `rgba(${38 + R() * 20 | 0},${58 + R() * 20 | 0},${26 + R() * 10 | 0},.85)` : k < 0.72 ? `rgba(${118 + R() * 30 | 0},${138 + R() * 26 | 0},${56 + R() * 18 | 0},.85)` : k < 0.93 ? `rgba(${160 + R() * 28 | 0},${174 + R() * 22 | 0},${80 + R() * 24 | 0},.85)` : `rgba(${204 + R() * 28 | 0},${204 + R() * 20 | 0},${118 + R() * 30 | 0},.8)`;
      g.beginPath(); g.ellipse(x, y, r, r * 0.5, a, 0, TAU); g.fill(); g.strokeStyle = 'rgba(30,44,20,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); g.stroke(); } }); }
  function buildHeartwood() { const T = W.heartwood; if (!T) return; const H = T.H, B = T.base;
    const ax = (f) => { const [x, y] = hwAxis(f); return v3().set(x, B + f * H, y); }, dirAt = (th) => v3().set(Math.cos(th), 0, Math.sin(th));
    const tr = (f, th, r) => ax(f).addScaledVector(dirAt(th), r != null ? r : hwTrunkR(f));
    const add = (o) => { scene.add(o); HWX.objs.push(o); return o; };
    const OUT = T.in + Math.PI; // the side facing away from the Hollow (onto the plateau)
    if (!HWX.built) { HWX.built = true; const bark = new THREE.MeshLambertMaterial({ map: barkTex(), vertexColors: true, side: THREE.DoubleSide }), A = GA(); HWX.barkMat = new THREE.MeshLambertMaterial({ map: bark.map, color: 0xa08a74 });
      const moss = (p, d, k) => { const m = Math.max(0, d.y) * 0.7 + (vnoise(p.x / 600 + k, p.z / 600 + p.y / 800) - 0.56) * 1.5; const u = clamp(m, 0, 1), dk = 0.86 + 0.14 * clamp((p.y - B) / (H * 0.4), 0, 1); return [(1 - 0.45 * u) * dk, (1 - 0.1 * u) * dk, (1 - 0.6 * u) * dk]; }; HWX.trunkMat = bark; HWX.moss = moss;
      // the trunk: a braid of great twisted strands, deeply ridged, buttressed at the foot
      const trunkRad = (f, a) => { const tw = f * 4.2, Bt = Math.exp(-Math.max(0, f + 0.04) * 7), lobe = Math.pow(0.5 + 0.5 * Math.cos(6 * (a - tw)), 2.2), lobe2 = Math.pow(0.5 + 0.5 * Math.cos(11 * (a - tw * 1.3) + 1), 4), r = hwTrunkR(f) * (1 + 0.55 * Bt * lobe - 0.08 * Bt);
          return r * (1 + 0.075 * lobe2 + 0.06 * Math.sin(3 * a + f * 17) + 0.05 * (vnoise(a * 2.2 + 3, f * 14) - 0.5) - (f > 0.66 ? (f - 0.66) * 5 : 0)); };
      HWX.trunkRad = trunkRad; HWX.ax = ax; const DC = { T, trunkRad, ax, meshH, OUT: T.in + Math.PI };
      { const pts = [], fs = []; for (let i = 0; i <= 72; i++) { const f = -0.07 + (i / 72) * 0.8, fr = f; fs.push(fr); pts.push(ax(fr)); }
        gaTube(A, pts, 64, (i, a) => trunkRad(fs[i], a) * (fs[i] < 0 ? 1 + fs[i] * 3 : 1), (i, a, p, d) => moss(p, d, 0), [7, 900]); }
      // strands wound round the trunk up into the crown
      for (let k = 0; k < 12; k++) { const a0 = (k / 12) * TAU + 0.3, pts = [], rs = [], f1 = 0.52 + hash1(k * 7.3) * 0.16, n = 48;
        for (let i = 0; i <= n; i++) { const f = 0.02 + (f1 - 0.02) * i / n, aa = a0 + f * 3.4; pts.push(tr(f, aa, trunkRad(f, aa) * 0.95)); rs.push(HW_R0 * (0.17 + 0.06 * hash1(k)) * (1 - 0.6 * i / n) * (i < 3 ? 0.5 + i / 6 : 1)); }
        GRAND.dodge(pts, DC, rs); gaTube(A, pts, 10, (i, aa) => rs[i] * (1 + 0.1 * Math.sin(aa * 2 + i * 0.4)), (i, aa, p, d) => moss(p, d, k + 40), [2, 600]); }
      // LIP ROOTS: wind down the trunk, then arch out over the lip and grip the plateau behind the tree
      const rootPts = [], rootR = []; HWX.rootPts = rootPts; HWX.rootR = rootR; // (the Explore nav keeps her off the great roots)
      const lipRoot = (a, fTop, L, r0, k, from) => { const pts = [], rs = []; let prev;
        if (!from) { const nS = Math.max(3, Math.round(fTop / 0.012)), tw = 1.6 * (k % 2 ? 1 : -0.8);
          for (let i = 0; i <= nS; i++) { const f = fTop * (1 - i / nS) + 0.01, aa = a - (f - 0.01) * tw; pts.push(tr(f, aa, trunkRad(f, aa) * 0.9)); rs.push(r0 * (0.3 + 0.7 * Math.pow(i / nS, 0.6))); } prev = pts[pts.length - 1]; }
        else { prev = from.p; pts.push(prev); rs.push(r0); }
        const c = from ? from.p : ax(0), s0 = Math.hypot(prev.x - c.x, prev.z - c.z), n = 26, y0 = prev.y;
        for (let i = 1; i <= n; i++) { const u = i / n, s2 = s0 + L * Math.pow(u, 0.9), aa = a + Math.sin(u * 4.5 + k) * 0.22 * u, x = c.x + Math.cos(aa) * s2, z = c.z + Math.sin(aa) * s2, rr = r0 * (1 - 0.9 * Math.pow(u, 0.8));
          const gy = meshH(x, z), arch = Math.sin(Math.min(1, u * 2.2) * Math.PI) * rr * 0.5; const y = Math.max(gy + rr * 0.32 + arch, y0 + (gy - y0) * clamp(u * 3, 0, 1) + rr * 0.3); const p = v3().set(x, y, z); pts.push(p); rs.push(rr); }
        GRAND.dodge(pts, DC, rs); gaTube(A, pts, 12, (i, aa) => rs[i] * (1 + 0.13 * Math.sin(aa * 3 + i * 0.8)) * (1 - 0.15 * Math.max(0, Math.sin(aa))), (i, aa, p, d) => moss(p, d, k), [3, 520]); rootPts.push(pts.slice(from ? 0 : 6)); rootR.push(rs); return { pts, rs }; };
      for (let k = 0; k < 11; k++) { if (k === 5) continue; /* the Lumen Tree's great door stands where this root ran */ const a = OUT + (k / 10 - 0.5) * 3.9 + (hash1(k * 3.1) - 0.5) * 0.2, side = Math.abs(Math.cos(a - OUT)), L = H * (0.13 + 0.15 * side) * (0.8 + 0.4 * hash1(k + 9)), r0 = HW_R0 * (0.3 + 0.12 * hash1(k + 2));
        const R1 = lipRoot(a, 0.1 + hash1(k + 5) * 0.16, L, r0, k);
        for (const s of [-1, 1]) if (hash1(k * 5 + s) < 0.75) { const i = 8 + ((hash1(k * 2 + s) * 8) | 0); if (R1.pts[i]) lipRoot(a + s * (0.5 + hash1(k + s) * 0.4), 0, L * 0.45, R1.rs[i] * 0.55, k + s * 20, { p: v3().copy(R1.pts[i]) }); } }
      // the bridge root: one of the lip roots, grown long, arching over the pools above the falls
      { const BR = GRAND.bridgeRoot(DC); if (BR) for (const b of BR.out) { GRAND.dodge(b.pts, DC, b.rs); gaTube(A, b.pts, b.k ? (b.big ? 12 : 8) : 14, (i, aa) => b.rs[i] * (1 + 0.13 * Math.sin(aa * 3 + i * 0.8)) * (1 - 0.15 * Math.max(0, Math.sin(aa))) * (b.k ? 1 : 1 - 0.24 * Math.max(0, Math.cos(aa - Math.PI / 2 - i * 0.09))), (i, aa, p, d) => moss(p, d, 60 + b.k), [3, 520]); } }
      // WALL ROOTS: from the trunk's Hollow side straight down the inner wall, clawing into the rock, holding the tree up
      const wallRoot = (phiOff, fTop, drop, r0, k) => { const pts = [], rs = [], aT = T.in + phiOff * 1.6, nS = 6;
        for (let i = 0; i <= nS; i++) { const f = fTop * (1 - i / nS) + 0.0, aa = aT + (fTop - f) * 1.2 * (k % 2 ? 1 : -1); pts.push(tr(f, aa, trunkRad(f, aa) * 0.9)); rs.push(r0 * (0.4 + 0.6 * i / nS)); }
        const p0 = pts[pts.length - 1], phi0 = Math.atan2(p0.z, p0.x), r0w = Math.hypot(p0.x, p0.z), y0 = p0.y, n = 30;
        for (let i = 1; i <= n; i++) { const u = i / n, y = y0 - drop * u, phi = phi0 + phiOff * (0.3 + 1.1 * u) * 0.9 + Math.sin(u * 5 + k) * 0.03, rr = r0 * (1 - 0.86 * Math.pow(u, 0.85));
          const rw = wallR(phi, y), r = Math.min(r0w + 120 * u, rw - rr * 0.25); const [x, z] = polar(r, phi); pts.push(v3().set(x, Math.max(y, meshH(x, z) + rr * 0.15), z)); rs.push(rr); }
        gaTube(A, pts, 12, (i, aa) => rs[i] * (1 + 0.12 * Math.sin(aa * 3 + i)), (i, aa, p, d) => moss(p, d, k + 70), [3, 520]); rootPts.push(pts.slice(nS)); rootR.push(rs.slice(nS)); };
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
      for (let j = 0; j < HW_SEATS.length; j++) { const S = HW_SEATS[j]; if (!S[2]) continue; const th = T.in + S[1], f = S[0];
        const p0 = tr(f - 0.07, th, hwTrunkR(f - 0.07) * 0.4), d = dirAt(th), under = v3().copy(ax(f)).addScaledVector(d, S[2]).add(v3().set(0, -60, 0)), p3 = v3().copy(under).addScaledVector(d, 650).add(v3().set(0, H * 0.05, 0));
        const pts = bez(p0, v3().copy(p0).addScaledVector(d, S[2] * 0.4).add(v3().set(0, H * 0.035, 0)), v3().copy(under).addScaledVector(d, -200).add(v3().set(0, -30, 0)), p3, 20);
        const r0 = hwTrunkR(f) * 0.34; tube(pts, r0, r0 * 0.3, j * 3 + 5); limbs.push({ pts, th, end: p3, r0, seat: j }); ends.push({ p: v3().copy(p3).add(v3().set(0, 260, 0)), R: 620, th, seat: j }); }
      // hanging vines: drooping catenaries between neighbouring limbs
      for (let k = 0; k < limbs.length - 1; k += 2) { const a = limbs[k].pts[12], b = limbs[k + 1].pts[10]; if (!a || !b || a.distanceTo(b) > 4200 || a.distanceTo(b) < 600) continue; const pts = []; for (let i = 0; i <= 14; i++) { const u = i / 14; pts.push(v3().lerpVectors(a, b, u).add(v3().set(0, -Math.sin(u * Math.PI) * a.distanceTo(b) * 0.28, 0))); }
        gaTube(A, pts, 5, () => 22, () => [0.42, 0.55, 0.3], [1, 300]); }
      add(gaMesh(A, bark, true));
      // CANOPY: one floret (cluster of lumpy puffs) per branch tip, plus the crown dome; dark core puffs fill the gaps between florets
      const clumps = []; const clump = (x, y, z, r, sh, hue) => clumps.push([x, y, z, r, sh, hue]);
      const floret = (c, R, sd) => { const hue = hash1(sd * 1.3);
        clump(c.x, c.y - R * 0.12, c.z, R * 0.7, 0.5, hue);
        const n = 6 + ((hash1(sd) * 4) | 0); for (let k = 0; k < n; k++) { const aa = (k / n) * TAU + hash1(sd + k) * 0.7, rr = R * (0.5 + hash1(sd * 2 + k) * 0.22); clump(c.x + Math.cos(aa) * rr, c.y + (hash1(sd * 3 + k) - 0.62) * R * 0.32, c.z + Math.sin(aa) * rr, R * (0.36 + hash1(sd * 5 + k) * 0.16), 0.68 + hash1(sd * 7 + k) * 0.2, hue + (hash1(k + sd) - 0.5) * 0.3); }
        const m = 3 + ((hash1(sd * 9) * 3) | 0); for (let k = 0; k < m; k++) { const aa = hash1(sd * 11 + k) * TAU, rr = R * 0.28 * hash1(sd * 13 + k); clump(c.x + Math.cos(aa) * rr, c.y + R * (0.26 + hash1(sd * 17 + k) * 0.16), c.z + Math.sin(aa) * rr, R * (0.3 + hash1(sd * 19 + k) * 0.12), 0.9 + hash1(sd * 23 + k) * 0.16, hue + (hash1(k * 3 + sd) - 0.5) * 0.3); } };
      ends.forEach((e2, i) => floret(e2.p, e2.R, i * 5.7 + 1));
      for (const L of limbs) if (!L.seat && L.depth === 2 && hash1(L.th * 9.1) < 0.5) { const p = L.pts[12]; floret(v3().copy(p).add(v3().set(0, 420, 0)), 760, p.x * 0.01); }
      { const top = ax(0.8); floret(v3().copy(top).add(v3().set(0, 700, 0)), 1500, 99); floret(v3().copy(top).add(v3().set(0, 250, 0)).addScaledVector(dirAt(OUT), 900), 1200, 98); }
      // keep the seats clear: no foliage on top of a deck or a house
      const seatPts = HW_SEATS.map((S, j) => heartwoodSlot(j)), clearOf = (x, y, z, r) => seatPts.every((q) => Math.hypot(q.x - x, q.y - z) > r + 420 || y + r < q.elev - 60 || y - r > q.elev + HW_HOUSE * 1.6);
      const keep = clumps.filter((c) => clearOf(c[0], c[1], c[2], c[3] * 0.85)); HWX.clumps = keep;
      const big = keep.filter((c) => c[3] >= 520), small = keep.filter((c) => c[3] < 520);
      const lm = new THREE.MeshLambertMaterial({ map: canopyLeafTex(), vertexColors: true }), mt = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      const PAL = [[0.92, 0.94, 0.6], [0.78, 0.88, 0.6], [1.0, 0.96, 0.62], [0.7, 0.82, 0.58]];
      for (const [L2, det] of [[big, 3], [small, 2]]) { if (!L2.length) continue; const im = new THREE.InstancedMesh(puffGeo(det, det * 3.7), lm, L2.length); im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(L2.length * 3), 3);
        L2.forEach((c, i) => { e.set((hash1(i * 2.9) - 0.5) * 0.3, hash1(i * 1.7) * TAU, (hash1(i * 3.9) - 0.5) * 0.3); q.setFromEuler(e); mt.compose(v3().set(c[0], c[1], c[2]), q, v3().set(c[3] * (0.95 + hash1(i + 2) * 0.12), c[3] * (0.82 + hash1(i) * 0.22), c[3] * (0.95 + hash1(i + 1) * 0.12))); im.setMatrixAt(i, mt);
          const hu = ((c[5] % 1) + 1) % 1, a = PAL[(hu * 4) | 0], b = PAL[(((hu * 4) | 0) + 1) % 4], u = (hu * 4) % 1, ht = 0.9 + 0.16 * clamp((c[1] - B - H * 0.55) / (H * 0.3), 0, 1), s = c[4] * ht;
          im.instanceColor.setXYZ(i, s * (a[0] + (b[0] - a[0]) * u), s * (a[1] + (b[1] - a[1]) * u), s * (a[2] + (b[2] - a[2]) * u)); });
        im.castShadow = true; im.receiveShadow = true; add(im); }
      // hanging moss: strands under the limbs and the florets
      const strandClear = (x, y, z, len) => seatPts.every((q) => Math.hypot(q.x - x, q.y - z) > 1500 || y - len > q.elev + 2600 || y < q.elev - 100); // keep the view onto every seat free of strands
      const hang = []; for (const L of limbs) for (let k = 3; k < L.pts.length - 1; k += 2) { const p = L.pts[k], n2 = 1 + ((hash1(k * 3 + L.th) * 3) | 0); for (let j = 0; j < n2; j++) { const hx = p.x + (hash1(k + j * 7 + L.th) - 0.5) * L.r0 * 1.4, hz = p.z + (hash1(k * 5 + j + L.th) - 0.5) * L.r0 * 1.4; { const len = 160 + hash1(k * 11 + j + L.th * 3) * 520; if (L.seat == null && strandClear(hx, p.y, hz, len)) hang.push([hx, p.y - L.r0 * 0.5, hz, len]); } } }
      for (const c of keep) if (c[3] > 300 && hash1(c[0] * 0.01 + c[2] * 0.003) < 0.7) for (let j = 0; j < 6; j++) { const hx = c[0] + (hash1(j + c[1]) - 0.5) * c[3] * 1.3, hz = c[2] + (hash1(j * 3 + c[1]) - 0.5) * c[3] * 1.3; const len = 200 + hash1(j * 7 + c[0]) * 650; if (strandClear(hx, c[1], hz, len)) hang.push([hx, c[1] - c[3] * 0.4, hz, len]); }
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
        for (let k = 0; k < 90; k++) { const f = -0.02 + hash1(k * 3.7) * 0.2, a = hash1(k * 9.1) * TAU, p = tr(f, a, trunkRad(f, a) * 0.99); ms.push([p.x, p.y, p.z, 20 + hash1(k) * 44]); }
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
        const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3)); HWX.mushGlow = add(new THREE.Points(gg, new THREE.PointsMaterial({ size: 300, map: glowTex('rgba(120,220,255,.9)', 'rgba(60,160,255,.25)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.3 }))); HWX.mushGlow.frustumCulled = false; }
      // seat decks: wrapped round the trunk, or laid on a big limb (merged planks)
      { const D = GA(), slab = (O, I, y, th2) => { // a deck slab between an outer and an inner polyline (x,z): top, underside and rim
          const n = O.length, vt = (x, yy, z, nx, ny, nz, u, v, c) => { D.p.push(x, yy, z); D.n.push(nx, ny, nz); D.uv.push(u, v); D.c.push(c, c, c); return D.p.length / 3 - 1; };
          for (const [yy, ny, c] of [[y, 1, 1], [y - th2, -1, 0.6]]) { const o = O.map(([x, z]) => vt(x, yy, z, 0, ny, 0, x / 120, z / 120, c)), ii = I.map(([x, z]) => vt(x, yy, z, 0, ny, 0, x / 120, z / 120, c));
            for (let k = 0; k < n - 1; k++) { if (ny > 0) D.i.push(o[k], ii[k], o[k + 1], o[k + 1], ii[k], ii[k + 1]); else D.i.push(o[k], o[k + 1], ii[k], o[k + 1], ii[k + 1], ii[k]); } }
          const loop = O.concat(I.slice().reverse()); for (let k = 0; k < loop.length; k++) { const [x0, z0] = loop[k], [x1, z1] = loop[(k + 1) % loop.length], l = Math.hypot(x1 - x0, z1 - z0) || 1, nx = (z1 - z0) / l, nz = -(x1 - x0) / l;
            const a = vt(x0, y, z0, nx, 0, nz, 0, 0, 0.75), b = vt(x1, y, z1, nx, 0, nz, l / 120, 0, 0.75), c2 = vt(x1, y - th2, z1, nx, 0, nz, l / 120, th2 / 120, 0.75), d2 = vt(x0, y - th2, z0, nx, 0, nz, 0, th2 / 120, 0.75); D.i.push(a, b, c2, a, c2, d2); } };
        HWX.seats = [];
        for (let j = 0; j < HW_SEATS.length; j++) { const S = HW_SEATS[j], f = S[0], th = T.in + S[1], c = ax(f), y = B + f * H + 20, cs = [];
          if (!S[2]) { const ri = hwTrunkR(f) * 0.86, ro = hwTrunkR(f) + 640, span = 0.62, O = [], I = []; for (let k = 0; k <= 12; k++) { const a = th - span + (k / 12) * span * 2; O.push([c.x + Math.cos(a) * ro, c.z + Math.sin(a) * ro]); I.push([c.x + Math.cos(a) * ri, c.z + Math.sin(a) * ri]); }
            slab(O, I, y, 34); HWX.seats.push({ j, th, f, y, c, ri, ro, span }); }
          else { const d = dirAt(th), sd = new THREE.Vector3(-d.z, 0, d.x), m = v3().copy(c).addScaledVector(d, S[2]), hw2 = 330, P2 = (u, v) => [m.x + d.x * u * hw2 + sd.x * v * hw2, m.z + d.z * u * hw2 + sd.z * v * hw2]; slab([P2(-1, 1), P2(1, 1)], [P2(-1, -1), P2(1, -1)], y, 34);
            // a walkway along the limb back to the trunk
            const w0 = v3().copy(c).addScaledVector(d, hwTrunkR(f) * 0.9), w1 = v3().copy(m).addScaledVector(d, -hw2), W2 = (p, s3) => [p.x + sd.x * s3 * 70, p.z + sd.z * s3 * 70]; slab([W2(w0, 1), W2(w1, 1)], [W2(w0, -1), W2(w1, -1)], y - 6, 24);
            HWX.seats.push({ j, th, f, y, c, limb: S[2], m, d, sd, hw2 }); } }
        const pm2 = new THREE.MeshLambertMaterial({ map: plankTex(), vertexColors: true, side: THREE.DoubleSide }), dm = gaMesh(D, pm2, true); add(dm); }
      // the pulley's limb end
      HWX.pulleyAt = v3().copy(pulleyLimb.pts[15]); HWX.pulleyBase = v3().copy(pulleyLimb.pts[3]);
      // seat number badges (always face the camera)
      for (const s2 of HWX.seats) { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#5a3b22'; g.beginPath(); g.arc(64, 64, 58, 0, TAU); g.fill(); g.lineWidth = 8; g.strokeStyle = '#e8c27a'; g.stroke();
        g.fillStyle = '#ffe7a8'; g.font = 'bold 60px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('#' + (s2.j + 1), 64, 68); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false })); const p = s2.limb ? v3().copy(s2.m).addScaledVector(s2.d, s2.hw2 * 0.8) : v3().copy(s2.c).addScaledVector(dirAt(s2.th + s2.span * 0.75), s2.ro - 40); sp.position.set(p.x, s2.y + 150, p.z); sp.scale.set(150, 150, 1); add(sp); HWX.badges.push(sp); }
      // carved, hanging number boards on each deck's rail (#1 gilded), readable from the street below
      HWX.signs = []; for (const s2 of HWX.seats) { const c = document.createElement('canvas'); c.width = 256; c.height = 160; const g = c.getContext('2d'); const top = s2.j === 0;
        g.fillStyle = '#6b4526'; g.fillRect(0, 0, 256, 160); for (let k = 0; k < 5; k++) { g.fillStyle = k % 2 ? 'rgba(0,0,0,.12)' : 'rgba(255,220,170,.06)'; g.fillRect(0, k * 32, 256, 30); g.fillStyle = 'rgba(30,18,8,.6)'; g.fillRect(0, k * 32 + 30, 256, 2); }
        g.lineWidth = 12; g.strokeStyle = top ? '#d9a93c' : '#3b2614'; g.strokeRect(6, 6, 244, 148); g.fillStyle = '#2a190c'; for (const [x, y] of [[20, 20], [236, 20], [20, 140], [236, 140]]) { g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill(); }
        g.font = 'bold 108px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 10; g.strokeStyle = '#24160a'; g.strokeText('#' + (s2.j + 1), 128, 86); g.fillStyle = top ? '#ffd65a' : '#f3dca0'; g.fillText('#' + (s2.j + 1), 128, 86);
        const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; const board = new THREE.Mesh(new THREE.PlaneGeometry(190, 119), new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide, emissive: 0xffc070, emissiveIntensity: 0, emissiveMap: t }));
        let at, nrm; if (s2.limb) { at = v3().copy(s2.m).addScaledVector(s2.d, s2.hw2 + 6).setY(s2.y - 20); nrm = s2.d; } else { const a = s2.th + s2.span * 0.42; nrm = dirAt(a); at = v3().copy(s2.c).addScaledVector(nrm, s2.ro + 4).setY(s2.y - 20); }
        board.position.copy(at); board.lookAt(v3().copy(at).add(nrm)); add(board); HWX.signs.push(board); } }
    // railings, posts, struts, ladders, walkways and hanging lanterns (instanced props, rebuilt with the scene)
    const ST = WOOD[2], RL = WOOD[0], lamp = (p) => { stick(PR.box, p, v3().copy(p).add(v3().set(0, -40, 0)), 3, ROPE, null); block(PR.lamp, p.x, p.y - 70, p.z, 22, 30, 22, 0, [1, 0.75, 0.4], null); PR.glow.push([p.x, p.y - 55, p.z, null]); };
    const rail = (pts, ht) => { let prev = null; pts.forEach((p, i) => { const top = v3().copy(p).add(v3().set(0, ht, 0)); stick(PR.box, p, top, 12, ST, null); if (prev) { stick(PR.box, prev, top, 6, RL, null); stick(PR.box, v3().copy(prev).add(v3().set(0, -ht * 0.5, 0)), v3().copy(top).add(v3().set(0, -ht * 0.5, 0)), 4, RL, null); } prev = top; }); };
    const anchor = [];
    for (const s2 of HWX.seats) { const { th, y } = s2;
      if (!s2.limb) { const pts = []; for (let k = 0; k <= 12; k++) { const a = th - s2.span + (k / 12) * s2.span * 2; pts.push(v3().copy(s2.c).addScaledVector(dirAt(a), s2.ro - 14).setY(y)); } rail(pts, 70);
        for (const k of [0, 3, 6, 9, 12]) { const a = th - s2.span + (k / 12) * s2.span * 2, o = v3().copy(s2.c).addScaledVector(dirAt(a), s2.ro - 30).setY(y - 34), tk = v3().copy(ax(s2.f - 0.045)).addScaledVector(dirAt(a), hwTrunkR(s2.f - 0.045) * 0.9); stick(PR.box, o, tk, 26, WOOD[0], null);
          const ti = v3().copy(s2.c).addScaledVector(dirAt(a), s2.ri + 40).setY(y - 40); stick(PR.box, v3().copy(o).setY(y - 40), ti, 22, WOOD[2], null); const mid = v3().lerpVectors(o, tk, 0.45); stick(PR.box, mid, v3().lerpVectors(o, ti, 0.55).setY(y - 40), 14, WOOD[3], null); }
        for (const k of [0, 12]) { const a = th - s2.span + (k / 12) * s2.span * 2, b = v3().copy(s2.c).addScaledVector(dirAt(a), s2.ro - 14).setY(y), tp = v3().copy(b).add(v3().set(0, 190, 0)), arm = v3().copy(tp).addScaledVector(dirAt(a), 70); stick(PR.box, b, tp, 14, ST, null); stick(PR.box, tp, arm, 8, IRON, null); lamp(arm); }
        for (const k of [3, 9]) { const a = th - s2.span + (k / 12) * s2.span * 2; lamp(v3().copy(s2.c).addScaledVector(dirAt(a), s2.ro + 10).setY(y + 70)); }
        anchor.push({ a: th, y, r: hwTrunkR(s2.f) + 200, span: s2.span }); }
      else { const { m, d, sd, hw2 } = s2, cn = (u, v) => v3().copy(m).addScaledVector(d, u * hw2).addScaledVector(sd, v * hw2).setY(y); rail([cn(-1, -1), cn(1, -1), cn(1, 1), cn(-1, 1)], 70);
        for (const v of [-1, 1]) lamp(v3().copy(cn(1, v)).add(v3().set(0, 70, 0)));
        const knee = v3().copy(m).setY(y - 300); for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) stick(PR.box, v3().copy(cn(u * 0.9, v * 0.9)).setY(y - 34), knee, 22, WOOD[0], null); stick(PR.box, v3().copy(m).setY(y - 34), knee, 30, WOOD[2], null);
        for (const u of [-0.6, 0, 0.6]) stick(PR.box, v3().copy(cn(u, -1)).setY(y - 40), v3().copy(cn(u, 1)).setY(y - 40), 22, WOOD[2], null);
        for (const v of [-1, 1]) { const b = cn(-1, v), tp = v3().copy(b).add(v3().set(0, 190, 0)), arm = v3().copy(tp).addScaledVector(sd, v * 70); stick(PR.box, b, tp, 14, ST, null); stick(PR.box, tp, arm, 8, IRON, null); lamp(arm); } for (const v of [-1, 1]) for (let k = 1; k < 6; k++) { const p = v3().copy(s2.c).addScaledVector(d, hwTrunkR(s2.f) + (s2.limb - hw2 - hwTrunkR(s2.f)) * k / 6).addScaledVector(sd, v * 70).setY(y - 6); stick(PR.box, p, v3().copy(p).add(v3().set(0, 55, 0)), 7, ST, null); }
        anchor.push({ a: th, y, r: hwTrunkR(s2.f) + 200, span: 0.12 }); } }
    // seat k+1 (lower) climbs to seat k: a ladder up the trunk at the lower deck's edge, a landing, then a plank walk round the trunk
    for (let j = anchor.length - 1; j > 0; j--) { const lo = anchor[j], hi = anchor[j - 1]; let dA = Math.atan2(Math.sin(hi.a - lo.a), Math.cos(hi.a - lo.a)); const sg = dA >= 0 ? 1 : -1, a0 = lo.a + sg * Math.min(lo.span * 0.8, Math.abs(dA)), fH = (hi.y - B) / H;
      const rTop = hwTrunkR(fH) + 200, rB = Math.min(lo.r, hwTrunkR((lo.y - B) / H) + 200), p0 = v3().copy(ax((lo.y - B) / H)).addScaledVector(dirAt(a0), rB).setY(lo.y), p1 = v3().copy(ax(fH)).addScaledVector(dirAt(a0), rTop).setY(hi.y), sd = new THREE.Vector3(-Math.sin(a0), 0, Math.cos(a0));
      for (const o of [-26, 26]) stick(PR.box, v3().copy(p0).addScaledVector(sd, o), v3().copy(p1).addScaledVector(sd, o).add(v3().set(0, 60, 0)), 9, WOOD[1], null);
      const L = p0.distanceTo(p1); for (let k = 1; k < L / 45; k++) { const q = v3().lerpVectors(p0, p1, (k * 45) / L); stick(PR.box, v3().copy(q).addScaledVector(sd, -26), v3().copy(q).addScaledVector(sd, 26), 5, WOOD[1], null); }
      block(PR.box, p1.x, p1.y - 24, p1.z, 160, 24, 160, -a0, WOOD[2], null); lamp(v3().copy(p1).add(v3().set(0, 160, 0)));
      // plank walk round the trunk from the landing to the upper deck's edge
      const a1 = hi.a - sg * hi.span * 0.85, rem = Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0)); if (Math.abs(rem) < 0.05 || Math.sign(rem) !== sg) continue;
      const n = Math.max(2, Math.ceil(Math.abs(rem) * rTop / 70)); let prev = p1, prevR = null;
      for (let k = 1; k <= n; k++) { const a = a0 + rem * k / n, q = v3().copy(ax(fH)).addScaledVector(dirAt(a), rTop).setY(hi.y - 4); stick(PR.box, prev, q, 30, WOOD[2], null); const qr = v3().copy(ax(fH)).addScaledVector(dirAt(a), rTop + 40).setY(hi.y + 60); stick(PR.box, v3().copy(qr).setY(hi.y), qr, 6, ST, null); if (prevR) stick(PR.box, prevR, qr, 4, ROPE, null); prevR = qr; prev = q; } }
    // (the old pulley rig - wheel, rope and the crate dangling into the Hollow - is retired; the great limb stays)
    const res = W.homes.filter((h) => h.heartwood); if (res.length) { T.cx = T.x; T.cy = T.y; T.ce = res.reduce((s2, h) => s2 + h.elev, 0) / res.length; } }
  function poseRope(r, a, b, th) { r.position.lerpVectors(a, b, 0.5); r.scale.set(th, a.distanceTo(b), th); r.quaternion.setFromUnitVectors(v3().set(0, 1, 0), v3().subVectors(b, a).normalize()); }
  function animPulley(t, night) {
    if (HWX.mush) { const k = 0.45 + night * 0.75; HWX.mush.color.setRGB(0.32 * k, 0.78 * k, 1.0 * k); HWX.hollowGlow.color.setRGB(0.3 * k, 0.75 * k, 0.95 * k); HWX.mushGlow.material.opacity = 0.12 + night * 0.5; } }
  // props meshes: rebuilt (instances near the camera only) on each LOD pass
  function propMesh(geo, mat, cap) { const im = new THREE.InstancedMesh(geo, mat, cap); im.count = 0; im.frustumCulled = false; im.receiveShadow = true; im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3); scene.add(im); return im; }
  // climb spots: every crevice that runs out of the Hollow gets a glowing, tappable crack where its mouth breaks the rim - a lumen ribbon draped down the first
  // stretch of the crack (bright along its spine, soft at its edges, pulsing slowly) and a floating climb-down marker; tapping it offers "Climb down (coming soon)"
  const CLB = { spots: [], grp: null };
  function buildClimbSpots() { if (CLB.grp) { scene.remove(CLB.grp); } const grp = new THREE.Group(); grp.name = 'climbSpots'; scene.add(grp); CLB.grp = grp; CLB.spots = [];
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
  function buildModelScene() { if (!MD || !scene) return;
    for (const s2 of IM.all) for (const m of s2.meshes) { scene.remove(m); m.geometry.dispose(); } IM.all = []; IM.homes = []; IM.trees = [];
    PR.box = []; PR.cyl = []; PR.lamp = []; PR.smoke = []; PR.glow = [];
    const byKey = {}; const push = (k, o) => (byKey[k] || (byKey[k] = [])).push(o);
    W.homes.forEach((h, i) => { const tier = tierOf(h), key = h.heartwood ? (h.slot % 2 ? 'seatb' : 'seata') : HOUSE_KIT.keyFor(tier, hash1(i * 3.71 + 0.3)), w = h.heartwood ? HW_HOUSE : homeW(h, tier) * 0.95 * (1 + 0.06 * (tier % 2)), rot = h.heartwood ? Math.PI / 2 - h.hwTh : (h.isPlayer ? 0.4 : hash1(i * 7.13 + 1) * TAU);
      h._rot = rot; const y = homeElev(h); push(key, { x: h.x, y: y - (h.elev != null ? 0 : 2), z: h.y, rot, s: w, c: h.isPlayer ? [1.05, 1, 0.95] : tintFor(i + 1, 1 + (tier % 2)), lum: lumAt(h.x, h.y) * 0.9 + (h.heartwood ? 0.4 : 0), h }); yardProps(h, i, key, w); });
    for (const k of HOUSE_KIT.KEYS.concat(['seata', 'seatb'])) if (byKey[k]) IM.homes.push(makeSet(k, byKey[k], { near: 2600, minZ: 0.05, shadow: true }));
    let nt = 0; for (const o of W.objs) if (o.type === 'tree') { const k = treeKind(o), s = o.r * (k === 'sequoia' ? 7.5 : k === 'willow' ? 5.2 : 5.4), y = meshH(o.x, o.y) - 2; nt++;
      push('t_' + k, { x: o.x, y, z: o.y, rot: (o.seed || 0.5) * TAU * 7, s, c: tintFor(o.seed * 100 + 3, 0.6), lum: lumAt(o.x, o.y) * 0.8 }); }
    for (const k of ['oak', 'sequoia', 'willow']) if (byKey['t_' + k]) { MD['t_' + k] = MD[k]; IM.trees.push(makeSet('t_' + k, byKey['t_' + k], { near: 1800, far: 26000, minZ: 0.0, shadow: true })); }
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
        vertexShader: 'attribute float aPh; uniform float uT; uniform float uS; uniform float uK; varying float vA; void main(){ float f = fract(uT * 0.07 + aPh); vec3 p = position + uK * vec3(sin(aPh * 17.0 + f * 3.0) * 6.0 + f * 40.0, f * 120.0, cos(aPh * 11.0) * 6.0 + f * 18.0); vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = uS * uK * (14.0 + f * 50.0) * 600.0 / -mv.z; vA = (1.0 - f) * smoothstep(0.0, 0.12, f); }',
        fragmentShader: 'uniform sampler2D map; uniform vec3 uC; varying float vA; void main(){ vec4 c = texture2D(map, gl_PointCoord); gl_FragColor = vec4(uC, c.a * vA * 0.55); }' })); IM.smoke.frustumCulled = false; scene.add(IM.smoke); }
    // homes and trees are 3D now: billboards keep only the Exchange
    buildBillboards(); lodAt = null; st.models = { homes: W.homes.length, trees: nt, props: PR.box.length + PR.cyl.length + PR.lamp.length, smoke: PR.smoke.length }; }
  function fillProps(near) { const tv = v3(); for (const k of ['box', 'cyl', 'lamp']) { const im = IM.props[k], A = PR[k]; let n = 0;
      for (const p of A) { const o = p.o; let ok;
        if (!o) ok = true; else if (!near) ok = !!o.heartwood;
        else { const y = o.elev != null ? o.elev : (o._gy != null ? o._gy : (o._gy = meshH(o.x, o.y))), dx = o.x - T.x, dz = o.y - T.y; ok = (o.heartwood || dx * dx + dz * dz < 1.2e7) && frus.intersectsSphere(sph.set(tv.set(o.x, y, o.y), 160)); }
        if (!ok) continue; p.m.toArray(im.instanceMatrix.array, n * 16); im.instanceColor.array.set(p.c, n * 3); n++; }
      im.count = n; im.visible = n > 0; im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; } }
  function updateModels(t, cam, night, pulse, LC) { if (!MD || !IM.all.length) return;
    LU.uLumenC.value.copy(LC).multiplyScalar(night * 0.22 * pulse + 0.02);
    const key = Math.round(camera.position.x / 60) + ',' + Math.round(camera.position.y / 60) + ',' + Math.round(camera.position.z / 60) + ',' + cam.rot.toFixed(2) + ',' + cam.tilt.toFixed(1);
    if (key !== lodAt || ++lodTick > 30) { lodAt = key; lodTick = 0; pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frus.setFromProjectionMatrix(pm);
      for (const s2 of IM.all) fillSet(s2, cam.z); fillProps(cam.z > 0.14); }
    IM.props.lamp.material.color.setRGB(0.35 + night * 0.75, 0.27 + night * 0.5, 0.16 + night * 0.25);
    IM.glow.material.opacity = night * 0.28; if (MD.h0a) MD.h0a.mat.emissiveIntensity = night * 0.8; if (HWX.signs) for (const b of HWX.signs) b.material.emissiveIntensity = night * 0.3; IM.glow.visible = night > 0.05;
    IM.smoke.material.uniforms.uT.value = t; IM.smoke.visible = cam.z > 0.12; IM.smoke.material.uniforms.uS.value = renderer.getPixelRatio() * cssH / 900; IM.smoke.material.uniforms.uC.value.setRGB(0.86 - night * 0.6, 0.86 - night * 0.6, 0.88 - night * 0.55);
    animPulley(t, night); GRAND.anim(t, night, renderer.getPixelRatio() * cssH / 900);
    if (CLB.grp) { const k = 0.75 + 0.25 * Math.sin(t * 1.6); CLB.grp.children.forEach((o) => { if (o.isMesh) o.material.opacity = k; else if (o.isSprite) { o.material.opacity = 0.75 + 0.25 * Math.sin(t * 2.2); const sc = 120 * Math.max(0.8, Math.min(4, 0.5 / Math.max(0.05, cam.z))); o.scale.set(sc, sc, 1); } }); } }

  /* ---------- build ---------- */
  function supported() { try { const c = document.createElement('canvas'); return !!(window.THREE && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; } }
  function init(wrap, onProgress) {
    if (st.ok || st.building || !supported() || window.NO3D || location.protocol === 'file:') return st.ok; // file:// pages taint WebGL textures: use the 2D painter there
    st.building = true; const prog = onProgress || (() => {});
    cv3 = document.createElement('canvas'); cv3.id = 'city3d'; wrap.insertBefore(cv3, wrap.firstChild);
    renderer = new THREE.WebGLRenderer({ canvas: cv3, antialias: false, powerPreference: 'high-performance' });
    renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene(); scene.background = new THREE.Color(0xbcd3e6); scene.fog = new THREE.Fog(0xbcd3e6, 1e4, 4e4);
    camera = new THREE.PerspectiveCamera(FOV, 1, 20, 2e5);
    hemi = new THREE.HemisphereLight(0xdfeeff, 0x5a6a40, 0.55); scene.add(hemi);
    sun = new THREE.DirectionalLight(0xfff1d6, 1.15); sun.castShadow = true; const mob = Math.min(screen.width, screen.height) < 700; sun.shadow.mapSize.set(mob ? 1024 : 2048, mob ? 1024 : 2048);
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 1.5; scene.add(sun); scene.add(sun.target);
    lumen = new THREE.PointLight(0xffc878, 1, CITY.hollowR * 3.4, 1.1); lumen.position.set(0, P_H - 1500, 0); scene.add(lumen);
    lumen2 = new THREE.PointLight(0xffc878, 0, CITY.hollowR * 2.2, 1.0); lumen2.position.set(0, P_H + 300, 0); scene.add(lumen2); // lifts the glow onto the lip and the nearest rooftops
    const steps = [
      () => { buildMtGrid(); grids[0] = buildGrid(CITY.R + 1500, mob ? 170 : 220, IN()); },
      () => { grids[1] = buildGrid(IN(), mob ? 320 : 400, 0); },
      () => { const a = document.createElement('canvas'); a.width = a.height = 2048; paint(a, -(CITY.R + 1500), -(CITY.R + 1500), 2 * (CITY.R + 1500), 2048); texA = canvasTex(a); },
      () => { const b = document.createElement('canvas'); b.width = b.height = 2048; paint(b, -IN(), -IN(), 2 * IN(), 2048); texB = canvasTex(b); },
      () => { cCanvas = document.createElement('canvas'); cCanvas.width = cCanvas.height = 2048; texC = canvasTex(cCanvas);
        const U = { tA: { value: texA }, tB: { value: texB }, tC: { value: texC }, tRock: { value: imgTex(ART.tex.cliff, true, 8) }, uA: { value: new THREE.Vector4(-(CITY.R + 1500), -(CITY.R + 1500), 2 * (CITY.R + 1500), 2 * (CITY.R + 1500)) }, uB: { value: new THREE.Vector4(-IN(), -IN(), 2 * IN(), 2 * IN()) }, tGrass: { value: imgTex(ART.tex.grass, true, 8) }, uC: { value: new THREE.Vector4(0, 0, 1, 1) }, uCOn: { value: 0 }, uPH: { value: P_H }, uHR: { value: CITY.hollowR }, uSnowR: { value: CITY.plateauR + 2600 }, uHaze: { value: 0.4 }, uLumen: { value: new THREE.Color(0, 0, 0) } };
        terrainMat = makeTerrainMat(U); terrainMat.userData.U = U; scene.add(makeTerrain(grids[0])); scene.add(makeTerrain(grids[1])); },
      () => { buildBillboards();
        lumenSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(255,214,140,.9)', 'rgba(255,170,80,.3)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); lumenSpr.position.set(0, P_H - PIT * 0.55, 0);
        { const ht = glowTex('rgba(255,196,96,.9)', 'rgba(255,150,50,.3)'); for (let i = 0; i < 9; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: ht, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })); const a = hash1(i * 5.3) * TAU, r = hash1(i * 2.1) * CITY.hollowR * 0.45; sp.userData = { x: Math.cos(a) * r, y: Math.sin(a) * r, ph: i / 9, s: CITY.hollowR * (1.1 + hash1(i + 4) * 0.6) }; hazeSpr.push(sp); scene.add(sp); } } lumenSpr.scale.set(CITY.hollowR * 2.2, CITY.hollowR * 2.2, 1); scene.add(lumenSpr);
        ring = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0xffd46b, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, toneMapped: false })); ring.frustumCulled = false; scene.add(ring); buildRoofLOD();
        ringGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(255,220,120,1)', 'rgba(255,200,90,.35)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); scene.add(ringGlow);
        // dim, sparse window lights for night
        const pts = []; for (const h of W.homes) if (((h.lanternPhase * 10) | 0) % 3 === 0) { const w = homeW(h) * (h.heartwood ? 0.62 : 0.95); pts.push(h.x + (homeSeed(h) - 0.5) * w * 0.5, (h.elev != null ? h.elev : meshH(h.x, h.y)) + w * 0.3, h.y + w * 0.45); }
        const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        lightPts = new THREE.Points(pg, new THREE.PointsMaterial({ size: 9, map: glowTex('rgba(255,236,180,1)', 'rgba(255,190,100,.5)'), color: 0xffc878, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true })); scene.add(lightPts);
        moleSpr = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, alphaTest: 0.5 })); { const e = ART_MANIFEST.s.creatures_3; if (e) { const img = ART.atlas[e[0]], t = imgTex(img); t.offset.set(e[1] / img.width, (e[2] + e[4]) / img.height); t.repeat.set(e[3] / img.width, -e[4] / img.height); moleSpr.material.map = t; moleSpr.scale.set(130, 130 * e[4] / e[3], 1); moleSpr.center.set(0.5, 0.3); } } moleSpr.visible = false; scene.add(moleSpr);
        const ct = glowTex('rgba(255,255,255,.9)', 'rgba(255,255,255,.35)'); for (let i = 0; i < 14; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ct, transparent: true, depthWrite: false, opacity: 0.5 })); s.userData = { a: hash1(i * 7) * TAU, r: 3000 + hash1(i * 3) * 8000, sp: 0.004 + hash1(i) * 0.006, sz: 1800 + hash1(i + 9) * 2200 }; s.scale.set(s.userData.sz * 1.6, s.userData.sz, 1); clouds.push(s); scene.add(s); }
        if (typeof Explore !== 'undefined') Explore.buildWorld(scene); // sturdy bridges across the summit clefts
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
    if (W.heartwood) { let bw = 0, be = 0; for (const h of W.homes) if (h.heartwood) { const w = 1 - smooth01(260, 700, Math.hypot(x - h.x, y - h.y)); if (w > bw) { bw = w; be = h.elev; } } if (bw > 0) th = th + (be - th) * bw; } // look at the Heartwood seat, not the pit floor below
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
  // is the straight line from a target point to a camera position clear of terrain, the Heartwood's trunk, its seat decks and houses, and its foliage?
  function sightBlocked(tx, ty, tz, px, py, pz) { const Tw = W.heartwood, nearHW = Tw && (Math.hypot(tx - Tw.x, tz - Tw.y) < 9000 || Math.hypot(px - Tw.x, pz - Tw.y) < 9000);
    const L = Math.hypot(px - tx, py - ty, pz - tz) || 1, mx = (tx + px) / 2, mz = (tz + pz) / 2, R2 = Math.hypot(px - tx, pz - tz) / 2 + 300;
    const nb = []; for (const h of W.homes) { if (h.heartwood || Math.hypot(h.x - mx, h.y - mz) > R2 || Math.hypot(h.x - tx, h.y - tz) < 30) continue; const w = homeW(h); nb.push([h.x, h.y, w * 0.62, meshH(h.x, h.y) + w * 1.45]); } // neighbouring houses in the way
    for (let i = 1; i <= 40; i++) { const u = i / 40, x = tx + (px - tx) * u, y = ty + (py - ty) * u, z = tz + (pz - tz) * u; for (const q of nb) if (y < q[3] && Math.hypot(x - q[0], z - q[1]) < q[2]) return 'house'; }
    for (let i = 1; i <= 40; i++) { const u = i / 40, x = tx + (px - tx) * u, y = ty + (py - ty) * u, z = tz + (pz - tz) * u; if (u * L < 70) continue; // the house's own yard
      if (y < meshH(x, z) + 12) return 'ground';
      if (!nearHW) continue; const f = (y - Tw.base) / Tw.H;
      if (f > -0.12 && f < 0.82) { const [ax0, az0] = hwAxis(f), r = hwTrunkR(f) * (f < 0.12 ? 1.7 : 1.3) + 60; if (Math.hypot(x - ax0, z - az0) < r) return 'trunk'; }
      for (const s2 of HWX.seats) { if (y < s2.y - 380 || y > s2.y + HW_HOUSE * 1.5) continue; if (Math.hypot(tx - (s2.limb ? s2.m.x : s2.c.x + Math.cos(s2.th) * (s2.ro + s2.ri) / 2), tz - (s2.limb ? s2.m.z : s2.c.z + Math.sin(s2.th) * (s2.ro + s2.ri) / 2)) < 1000) continue; // the target's own deck
        if (s2.limb) { if (Math.hypot(x - s2.m.x, z - s2.m.z) < s2.hw2 * 1.5) return 'deck'; }
        else { const dx = x - s2.c.x, dz = z - s2.c.z, r = Math.hypot(dx, dz), da = Math.atan2(Math.sin(Math.atan2(dz, dx) - s2.th), Math.cos(Math.atan2(dz, dx) - s2.th)); if (r > s2.ri * 0.9 && r < s2.ro + 80 && Math.abs(da) < s2.span + 0.08) return 'deck'; } } }
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
    if (cam.z < 0.28) { U.uCOn.value = 0; cState = null; return; }
    const size = 2600, px = 2048;
    if (!cState || Math.hypot(cam.x - cState.cx, cam.y - cState.cy) > 700) { if (cState && cState.q < 4) {} else { cState = { cx: Math.round(cam.x / 100) * 100, cy: Math.round(cam.y / 100) * 100, q: 0 }; } }
    if (cState.q < 4) { const q = cState.q, ox = (q % 2) * 1024, oy = (q >> 1) * 1024, s0 = px / size; if (q === 0) cState.parts = [];
      const tmp = document.createElement('canvas'); tmp.width = tmp.height = 1024; paint(tmp, cState.cx - size / 2 + ox / s0, cState.cy - size / 2 + oy / s0, size / 2, 1024); cState.parts.push([tmp, ox, oy]); cState.q++;
      if (cState.q === 4) { const g = cCanvas.getContext('2d'); g.clearRect(0, 0, px, px); for (const [c, x, y] of cState.parts) g.drawImage(c, x, y); cState.parts = null; texC.needsUpdate = true; U.uC.value.set(cState.cx - size / 2, cState.cy - size / 2, size, size); U.uCOn.value = 1; } }
  }

  /* ---------- per frame ---------- */
  const cDay = new THREE.Color(0xbfd5e8), cNight = new THREE.Color(0x101830), tmpC = new THREE.Color(), tmpL = new THREE.Color(), tmpT = new THREE.Color();
  function render(t, cam) {
    if (!st.ok) return;
    if (playerTier() !== st.playerTier) buildBillboards();
    place(cam); // (in Explore the shared follow camera drives the view - see place)
    const night = nightFactor(), pulse = 0.78 + 0.22 * Math.sin(t * 0.9) + 0.06 * Math.sin(t * 2.3), D = st.camOv ? st.camOv.D : dist(cam);
    // sun & sky
    const sunDir = v3().set(-0.55, 0.75, -0.45).normalize();
    sun.position.set(T.x + sunDir.x * 9000, T.h + sunDir.y * 9000, T.y + sunDir.z * 9000); sun.target.position.set(T.x, T.h, T.y); sun.target.updateMatrixWorld();
    const S = clamp(D * 1.1, 500, 9000), sc = sun.shadow.camera; if (sc.right !== S) { sc.left = -S; sc.right = S; sc.top = S; sc.bottom = -S; sc.near = 100; sc.far = 22000; sc.updateProjectionMatrix(); }
    sun.intensity = 1.15 * (1 - night * 0.88); sun.color.setRGB(1, 0.95 - night * 0.1, 0.85 - night * 0.1);
    hemi.intensity = 0.55 - night * 0.33; hemi.color.copy(tmpC.set(0xdfeeff).lerp(new THREE.Color(0x5068a8), night));
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
    if (roofPts) { const f = clamp((0.16 - cam.z) / 0.08, 0, 1); roofPts.visible = f > 0.01; roofPts.material.opacity = f; roofPts.material.color.copy(bl); }
    lightPts.material.opacity = night * 0.45; lightPts.visible = night > 0.05 && cam.z > 0.12;
    // player highlight
    const h = W.player, w = homeW(h), gy = (h.elev != null ? h.elev : meshH(h.x, h.y)) + 3, p2 = 0.5 + 0.5 * Math.sin(t * 2.5);
    if (ringAt !== h.x + ',' + h.y) drapeRing(); ring.material.opacity = 0.5 + p2 * 0.4;
    ringGlow.position.set(h.x, gy + w * 0.3, h.y); ringGlow.scale.setScalar(w * 2.4); ringGlow.material.opacity = 0.35 + 0.2 * p2;
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
  return { SSR, routeCarve, get scene() { return scene; }, get camera() { return camera; }, get renderer() { return renderer; }, heightAt, get climb() { return CLB; }, get hwx() { return HWX; }, focusView, sightBlocked, targetH, treeKind, refresh: () => { if (st.ok) { buildBillboards(); buildRoofLOD(); drapeRing(); lightsPts(); if (MD) buildModelScene(); } }, st, ground, get models() { return mdState; }, init, resize, render, project, unproject, viewBox, meshH, place, tapSprites, dist, get dbg() { return { texA, texB, texC, U: terrainMat && terrainMat.userData.U }; }, get canvas() { return cv3; } };
})();

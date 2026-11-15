
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
      const step = clamp((fi + smooth01(sh, 1, fr)) / TT, 0, 1), brk = smooth01(0.3, 0.62, vnoise(x / 760 + fi * 1.7, y / 760 - fi)), base = (Math.pow(step, 0.8) * brk + Math.pow(g, 0.8) * (1 - brk)) * 0.86 + Math.pow(g, 0.8) * 0.14;
      h = P_H - PIT * base - 30 * g - 110 * ridged(x / 380, y / 380, 3) * smooth01(0, 0.05, g) * (1 - smooth01(0.85, 1, g)); }
    // fissures: carved trenches; where they meet the Hollow they keep cutting down the pit wall as channels
    const cd = chasmDist(x, y); if (cd < 8) h -= 460 * smooth01(8, -20, cd);
    if (r < hr + 60 && r > hr - 2200) for (const nt of notches) { let da = a - nt.a; da = ((da + 3 * Math.PI) % TAU) - Math.PI; const dist = Math.abs(da) * r, into = hr - r, wd = nt.w * (0.55 + Math.max(0, into) / 900);
      if (dist > wd) continue; const fl = P_H - 460 * nt.deep - Math.max(0, into) * 1.25, s0 = Math.pow(smooth01(0, 1, dist / wd), 1.3) * (1 - smooth01(-60, 0, -into) * 0);
      h = Math.min(h, fl + (h - fl) * s0); rock = Math.max(rock, 120); }
    let mh = mtnH(x, y) + rock * 0.55;
    // the world's edge rises into a wall of rocky peaks fading into haze (no sea, no coastline)
    const eg = smooth01(CITY.R - 700, CITY.R + 900, r); if (eg > 0) { const rn = (u, v) => 1 - Math.abs(2 * vnoise(u, v) - 1); { const q = 0.6 * rn(x / 420, y / 420) + 0.4 * rn(x / 150 + 3, y / 150); mh = Math.max(mh, eg * (260 + 760 * q * q)); } }
    return [h + mh - rock * 0.55, mh];
  }
  // terrain probe used when placing homes (height + slope), before or after the meshes exist
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
  const MODEL_KEYS = ['shack', 'cottage', 'townhouse', 'workshop', 'oak', 'sequoia', 'willow', 'hero'];
  const TIER_MODEL = ['shack', 'shack', 'cottage', 'cottage', 'townhouse', 'townhouse', 'workshop', 'workshop'];
  let MD = null, mdState = 'idle'; const IM = { homes: [], trees: [], props: null, all: [] }; let hero = null, lodTick = 0, lodAt = null; const heroObjs = [];
  const LU = { uLumenC: { value: new THREE.Color(0, 0, 0) }, uWin: { value: 0 } };
  function loadScript(src) { return new Promise((res, rej) => { const e = document.createElement('script'); e.src = src; e.onload = res; e.onerror = rej; document.head.appendChild(e); }); }
  async function parseModel(key) { const ab = await (await fetch('assets/models/' + key + '.bin')).arrayBuffer(), dv = new DataView(ab), hl = dv.getUint32(4, true);
    const H = JSON.parse(new TextDecoder().decode(new Uint8Array(ab, 8, hl))); let off = 8 + hl; const tree = /oak|sequoia|willow|hero/.test(key), geos = [];
    const sx = H.mx[0] - H.mn[0], sy = H.mx[1] - H.mn[1], sz = H.mx[2] - H.mn[2], cx = (H.mx[0] + H.mn[0]) / 2, cz = (H.mx[2] + H.mn[2]) / 2;
    const k = tree ? 1 / sy : 1 / Math.max(sx, sz), y0 = H.mn[1] + sy * (tree ? 0 : 0.07); // houses: sink the dirt slab a little into the ground
    for (const L of H.lods) { const vs = new Uint8Array(ab, off, L.vb); off += L.vb; const is = new Uint8Array(ab, off, L.ib); off += L.ib;
      const vb = new Uint8Array(L.vc * 16); MeshoptDecoder.decodeVertexBuffer(vb, L.vc, 16, vs); const ib = new Uint32Array(L.ic); MeshoptDecoder.decodeIndexBuffer(new Uint8Array(ib.buffer), L.ic, 4, is);
      const d = new DataView(vb.buffer), P = new Float32Array(L.vc * 3), N = new Float32Array(L.vc * 3), UV = new Float32Array(L.vc * 2);
      for (let i = 0; i < L.vc; i++) { const o = i * 16; for (let j = 0; j < 3; j++) { P[i * 3 + j] = H.mn[j] + (d.getInt16(o + j * 2, true) / 32767 + 1) / 2 * (H.mx[j] - H.mn[j]); N[i * 3 + j] = d.getInt8(o + 8 + j) / 127; }
        P[i * 3] = (P[i * 3] - cx) * k; P[i * 3 + 1] = (P[i * 3 + 1] - y0) * k; P[i * 3 + 2] = (P[i * 3 + 2] - cz) * k;
        for (let j = 0; j < 2; j++) UV[i * 2 + j] = H.umn[j] + d.getUint16(o + 12 + j * 2, true) / 65535 * (H.umx[j] - H.umn[j]); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.BufferAttribute(UV, 2)); g.setIndex(new THREE.BufferAttribute(L.ic < 65536 && L.vc < 65536 ? new Uint16Array(ib) : ib, 1)); g.computeBoundingSphere(); geos.push(g); }
    const tl = new THREE.TextureLoader(), tex = (u) => new Promise((res) => tl.load(u, (t) => { t.flipY = false; t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; res(t); }, undefined, () => res(null)));
    const map = await tex('assets/models/' + key + '.webp'), nrm = /shack|cottage|townhouse|workshop|hero/.test(key) ? await tex('assets/models/' + key + '_n.webp') : null; if (nrm) nrm.encoding = THREE.LinearEncoding;
    const mat = tree && key !== 'hero' ? new THREE.MeshLambertMaterial({ map, color: key === 'willow' ? 0x9cb48a : 0xb6bd96 }) : new THREE.MeshPhongMaterial({ map, normalMap: nrm, shininess: 6, specular: 0x161310, color: key === 'hero' ? 0xa8bf96 : 0xffffff });
    mat.onBeforeCompile = (sh) => { sh.uniforms.uLumenC = LU.uLumenC; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float iLum; varying float vLum;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLum = iLum;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uLumenC; varying float vLum;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uLumenC * vLum * diffuseColor.rgb;'); };
    return { geos, mat, tree }; }
  async function loadModels() { if (mdState !== 'idle') return; mdState = 'loading';
    try { if (!window.MeshoptDecoder) await loadScript('assets/vendor/meshopt_decoder.js'); await MeshoptDecoder.ready;
      const out = {}; await Promise.all(MODEL_KEYS.map(async (k) => { out[k] = await parseModel(k); })); MD = out; mdState = 'ready'; buildModelScene(); }
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
  function yardProps(h, i) { const sd = homeSeed(h) * 1000 + i, R = (k) => hash1(sd * 3.7 + k * 1.91), w = homeW(h) * 0.95, rot = h._rot, cs = Math.cos(rot), sn = Math.sin(rot), y0 = homeElev(h);
    const at = (lx, lz) => { const x = h.x + lx * cs + lz * sn, y = h.y - lx * sn + lz * cs; return [x, h.elev != null ? y0 : meshH(x, y), y]; };
    const wood = WOOD[(R(1) * 4) | 0];
    if (h.elev == null && R(2) < 0.65) { const f = w * 0.82, sides = R(3) < 0.5 ? [[-1, 1], [1, 1], [1, -1]] : [[-1, -1], [-1, 1], [1, 1]];
      for (let s2 = 0; s2 < 2; s2++) { const [ax, az] = sides[s2], [bx, bz] = sides[s2 + 1], n = 4; let prev = null;
        for (let k = 0; k <= n; k++) { const u = k / n; if (s2 === 1 && k === 2 && R(4) < 0.7) { prev = null; continue; } const [x, gy, y] = at(f * (ax + (bx - ax) * u), f * (az + (bz - az) * u)), top = v3().set(x, gy + 11, y);
          stick(PR.box, v3().set(x, gy - 3, y), top.clone().setY(gy + 13), 2.4, wood, h); if (prev) { stick(PR.box, prev, top, 1.3, wood, h); stick(PR.box, prev.clone().setY(prev.y - 6), top.clone().setY(top.y - 6), 1.3, wood, h); } prev = top; } } }
    const nc = 1 + ((R(5) * 3) | 0); for (let k = 0; k < nc; k++) { const sz = 7 + R(6 + k) * 5, [x, gy, y] = at(w * (0.45 + 0.12 * k), w * (0.42 - 0.1 * k)); block(PR.box, x, gy - 1, y, sz, sz, sz, R(9 + k) * 3, WOOD[(R(11 + k) * 4) | 0], h); }
    if (R(13) < 0.6) for (let k = 0; k < 1 + (R(14) < 0.5); k++) { const [x, gy, y] = at(-w * (0.5 + 0.13 * k), w * 0.45); block(PR.cyl, x, gy - 1, y, 7, 10, 7, 0, [0.42, 0.28, 0.16], h); }
    if (R(15) < 0.75 || h.elev != null) { const [x, gy, y] = at(w * 0.62, -w * 0.5); stick(PR.box, v3().set(x, gy - 3, y), v3().set(x, gy + 24, y), 2, IRON, h); block(PR.lamp, x, gy + 22, y, 4.5, 5, 4.5, 0, [1, 0.75, 0.4], h); PR.glow.push([x, gy + 25, y, h]); }
    if (R(17) < 0.35 && h.elev == null) { const [x, gy, y] = at(w * 0.2, -w * 0.18); PR.smoke.push([x, gy + w * 0.85, y, R(18) * 10, h]); } }
  function buildHeartwood() { const T = W.heartwood; if (!T || !MD.hero) return; const H = T.ht, ix = -Math.cos(T.a), iz = -Math.sin(T.a), tx = -iz, tz = ix, g0 = P_H;
    const tp = (lx, ly, lz) => { const p = heartwoodPoint(lx, ly, lz || 0); return v3().set(p.x, p.elev, p.y); };
    // the giant willow, leaning out over the Hollow, its root-ball gripping the lip
    for (const o of heroObjs) scene.remove(o); heroObjs.length = 0; const add = (o) => { scene.add(o); heroObjs.push(o); return o; };
    const m = new THREE.Mesh(MD.hero.geos[0], MD.hero.mat); m.geometry = MD.hero.geos[0].clone(); m.geometry.setAttribute('iLum', new THREE.BufferAttribute(new Float32Array(m.geometry.attributes.position.count).fill(0.25), 1));
    const grp = new THREE.Group(); grp.position.set(T.x, g0 - H * 0.16, T.y); grp.rotation.set(0, Math.PI - T.a, -T.lean, 'YXZ'); m.scale.setScalar(H * 1.05); grp.add(m); m.castShadow = true; m.receiveShadow = true; add(grp); hero = { grp, m };
    // roots: thick bark tubes clawing over the lip and down the pit wall, others gripping the summit
    const bark = new THREE.MeshLambertMaterial({ color: 0x5a4330 }), roots = [];
    for (let k = 0; k < 9; k++) { const side = (k / 8 - 0.5) * 0.5, back = k % 3 === 0, s0 = tp(0, 0.13, side * 0.05);
      const p1 = v3().set(T.x + (back ? -ix : ix) * H * 0.12 + tx * side * H * 0.5, g0 + 30, T.y + (back ? -iz : iz) * H * 0.12 + tz * side * H * 0.5);
      const ex = T.x + (back ? -ix : ix) * H * (back ? 0.32 : 0.2) + tx * side * H * 0.9, ez = T.y + (back ? -iz : iz) * H * (back ? 0.32 : 0.2) + tz * side * H * 0.9;
      const p2 = v3().set(ex, (back ? meshH(ex, ez) - 10 : g0 - H * (0.25 + 0.2 * hash1(k))), ez);
      const curve = new THREE.CatmullRomCurve3([s0, p1, v3().lerpVectors(p1, p2, 0.6).add(v3().set(0, back ? 10 : -40, 0)), p2]);
      roots.push(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, H * (0.028 - 0.012 * Math.abs(side)), 6, false), bark)); }
    for (const r of roots) { r.castShadow = true; add(r); }
    // Ledge platforms built into the tree, struts to the trunk, rope walkways between neighbours, ladders up the trunk
    const res = W.homes.filter((h) => h.heartwood).sort((a, b) => a.elev - b.elev), plank = WOOD[2];
    if (res.length) { T.cx = res.reduce((s2, h) => s2 + h.x, 0) / res.length; T.cy = res.reduce((s2, h) => s2 + h.y, 0) / res.length; T.ce = res.reduce((s2, h) => s2 + h.elev, 0) / res.length; }
    for (const h of res) { const p = v3().set(h.x, h.elev, h.y), w = homeW(h) * 0.8, sl = HW_SLOTS[h.slot % HW_SLOTS.length]; block(PR.cyl, h.x, h.elev - 8, h.y, w * 1.3, 8, w * 1.3, 0, plank, h);
      if (sl[1] < 0.7 && sl[0] > 0.3) { // portaledge hung under the canopy edge over the pit: four ropes up into the branches
        const anchor = tp(sl[0] - 0.08, 0.74, sl[2]); for (const [ox, oz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) stick(PR.box, p.clone().add(v3().set(ox * w * 0.5, -6, oz * w * 0.5)), anchor, 1.6, ROPE, h); }
      else if (sl[1] < 0.5) { const trunk = tp(0, sl[1] - 0.03, 0); stick(PR.box, p.clone().setY(h.elev - 8), trunk, 10, WOOD[0], h); } }
    // rope walkways between neighbouring canopy homes, ladders down to the hanging ones and the trunk
    for (let i = 0; i < res.length; i++) { const a = res[i]; let b = null, bd = 1e9; for (const o of res) { if (o === a || o.elev < a.elev - 1) continue; const d = Math.hypot(o.x - a.x, o.y - a.y, (o.elev - a.elev) * 0.5); if (d < bd && !(o._lnk === a)) { bd = d; b = o; } } if (!b) continue; a._lnk = b;
      const pa = v3().set(a.x, a.elev + 2, a.y), pb = v3().set(b.x, b.elev + 2, b.y), dir = v3().subVectors(pb, pa); const side = v3().set(-dir.z, 0, dir.x).normalize();
      if (Math.abs(b.elev - a.elev) > pa.distanceTo(pb) * 0.6) { for (const o of [-6, 6]) stick(PR.box, pa.clone().addScaledVector(side, o), pb.clone().addScaledVector(side, o), 1.6, WOOD[1], b);
        const L = pa.distanceTo(pb); for (let k = 1; k < L / 14; k++) { const q = v3().lerpVectors(pa, pb, k * 14 / L); stick(PR.box, q.clone().addScaledVector(side, -6), q.clone().addScaledVector(side, 6), 1.2, WOOD[1], b); } continue; }
      const n = 10; let prev = pa; for (let k = 1; k <= n; k++) { const u = k / n, q = v3().lerpVectors(pa, pb, u); q.y -= Math.sin(Math.PI * u) * 24; stick(PR.box, prev, q, 3.5, plank, b); for (const o of [-5, 5]) stick(PR.box, prev.clone().addScaledVector(side, o).setY(prev.y + 10), q.clone().addScaledVector(side, o).setY(q.y + 10), 0.9, ROPE, b); prev = q; } }
    for (const h of res) delete h._lnk;
    // the pulley: a beam out along a great branch, a wheel, a winch on the lip, and a crate dangling into the Hollow
    const b0 = tp(0.02, 0.5, 0.05), b1 = b0.clone().add(v3().set(ix, 0, iz).multiplyScalar(H * 0.62)); stick(PR.box, b0, b1, 24, WOOD[0], null); stick(PR.box, tp(0.0, 0.36, 0.05), v3().lerpVectors(b0, b1, 0.45), 13, WOOD[0], null);
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(20, 5, 6, 16), new THREE.MeshLambertMaterial({ color: 0x4a3828 })); wheel.position.copy(b1).add(v3().set(0, -26, 0)); wheel.rotation.y = Math.PI / 2 - Math.atan2(iz, ix); add(wheel);
    stick(PR.box, b1, wheel.position, 4, IRON, null);
    const winch = v3().set(T.x - ix * 160 + tx * 90, 0, T.y - iz * 160 + tz * 90); winch.y = meshH(winch.x, winch.z); block(PR.cyl, winch.x, winch.y, winch.z, 34, 30, 34, 0, WOOD[0], null); block(PR.box, winch.x, winch.y, winch.z, 50, 8, 10, 0, WOOD[1], null);
    const ropeM = new THREE.MeshLambertMaterial({ color: 0x9c8460 }), rope = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 5), ropeM), rope2 = new THREE.Mesh(rope.geometry, ropeM);
    const load = new THREE.Group(); { const crate = new THREE.Mesh(new THREE.BoxGeometry(70, 60, 70), new THREE.MeshLambertMaterial({ color: 0x8a6440 })); crate.position.y = -30; load.add(crate); for (const y of [-8, -52]) { const band = new THREE.Mesh(new THREE.BoxGeometry(73, 5, 73), new THREE.MeshLambertMaterial({ color: 0x333030 })); band.position.y = y; load.add(band); }
      for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { const r = new THREE.Mesh(rope.geometry, ropeM); const a = v3().set(sx * 33, -2, sz * 33), b = v3().set(0, 40, 0); r.position.lerpVectors(a, b, 0.5); r.scale.set(1.5, a.distanceTo(b), 1.5); r.quaternion.setFromUnitVectors(v3().set(0, 1, 0), b.clone().sub(a).normalize()); load.add(r); } }
    const lanternL = new THREE.Mesh(new THREE.BoxGeometry(10, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffc070 })); lanternL.position.y = 46; load.add(lanternL);
    for (const o of [rope, rope2, load]) { o.castShadow = true; add(o); }
    hero.pulley = { top: wheel.position.clone().add(v3().set(0, -20, 0)), winch: winch.clone().setY(winch.y + 30), rope, rope2, load, lanternL, dir: v3().set(tx, 0, tz), wheel };
    PR.glow.push([b1.x, b1.y - 40, b1.z, null]); }
  function poseRope(r, a, b, th) { r.position.lerpVectors(a, b, 0.5); r.scale.set(th, a.distanceTo(b), th); r.quaternion.setFromUnitVectors(v3().set(0, 1, 0), v3().subVectors(b, a).normalize()); }
  function animPulley(t, night) { const P = hero && hero.pulley; if (!P) return; const len = 700 + 520 * (0.5 - 0.5 * Math.cos(t * 0.11)), sw = Math.sin(t * 0.7) * 26 + Math.sin(t * 1.9) * 6;
    const lp = P.top.clone().add(v3().set(0, -len, 0)).addScaledVector(P.dir, sw); P.load.position.copy(lp).add(v3().set(0, -40, 0)); P.load.rotation.set(sw * 0.004, t * 0.05, -sw * 0.003);
    poseRope(P.rope, P.top, lp, 2.4); poseRope(P.rope2, P.winch, P.top.clone().add(v3().set(0, 20, 0)), 2.4); P.wheel.rotation.x = len * 0.05; P.lanternL.material.color.setRGB(0.5 + night * 0.6, 0.36 + night * 0.4, 0.2 + night * 0.15); }
  // props meshes: rebuilt (instances near the camera only) on each LOD pass
  function propMesh(geo, mat, cap) { const im = new THREE.InstancedMesh(geo, mat, cap); im.count = 0; im.frustumCulled = false; im.receiveShadow = true; im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3); scene.add(im); return im; }
  function buildModelScene() { if (!MD || !scene) return;
    for (const s2 of IM.all) for (const m of s2.meshes) { scene.remove(m); m.geometry.dispose(); } IM.all = []; IM.homes = []; IM.trees = [];
    PR.box = []; PR.cyl = []; PR.lamp = []; PR.smoke = []; PR.glow = [];
    const byKey = {}; const push = (k, o) => (byKey[k] || (byKey[k] = [])).push(o);
    W.homes.forEach((h, i) => { const tier = tierOf(h), key = h.heartwood ? (i % 2 ? 'cottage' : 'shack') : TIER_MODEL[tier], w = homeW(h, tier) * (h.heartwood ? 0.8 : 0.95) * (1 + 0.06 * (tier % 2)), rot = (h.isPlayer ? 0.4 : hash1(i * 7.13 + 1) * TAU);
      h._rot = rot; const y = homeElev(h); push(key, { x: h.x, y: y - (h.elev != null ? 0 : 2), z: h.y, rot, s: w, c: h.isPlayer ? [1.05, 1, 0.95] : tintFor(i + 1, 1 + (tier % 2)), lum: lumAt(h.x, h.y) * 0.9 + (h.heartwood ? 0.4 : 0), h }); yardProps(h, i); });
    for (const k of ['shack', 'cottage', 'townhouse', 'workshop']) if (byKey[k]) IM.homes.push(makeSet(k, byKey[k], { near: 2600, minZ: 0.05, shadow: true }));
    let nt = 0; for (const o of W.objs) if (o.type === 'tree') { const k = treeKind(o), s = o.r * (k === 'sequoia' ? 7.5 : k === 'willow' ? 5.2 : 5.4), y = meshH(o.x, o.y) - (k === 'willow' ? s * 0.16 : 3); nt++;
      push('t_' + k, { x: o.x, y, z: o.y, rot: (o.seed || 0.5) * TAU * 7, s, c: tintFor(o.seed * 100 + 3, 0.6), lum: lumAt(o.x, o.y) * 0.8 }); }
    for (const k of ['oak', 'sequoia', 'willow']) if (byKey['t_' + k]) { MD['t_' + k] = MD[k]; IM.trees.push(makeSet('t_' + k, byKey['t_' + k], { near: 1800, far: 26000, minZ: 0.0, shadow: true })); }
    buildHeartwood();
    const cap = (a) => Math.max(1, a.length);
    if (!IM.props) { const lam = new THREE.MeshLambertMaterial({ color: 0xffffff }); IM.props = { box: propMesh(new THREE.BoxGeometry(1, 1, 1), lam, cap(PR.box)), cyl: propMesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 9), lam, cap(PR.cyl)), lamp: propMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), cap(PR.lamp)) }; }
    else for (const k of ['box', 'cyl', 'lamp']) { const im = IM.props[k]; if (im.instanceMatrix.count < PR[k].length) { scene.remove(im); IM.props[k] = propMesh(im.geometry, im.material, cap(PR[k])); } }
    IM.props.box.castShadow = true;
    // night lantern glows + chimney smoke (shader-animated points)
    if (IM.glow) scene.remove(IM.glow); if (IM.smoke) scene.remove(IM.smoke);
    { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(PR.glow.flatMap((p) => p.slice(0, 3)), 3)); IM.glow = new THREE.Points(g, new THREE.PointsMaterial({ size: 26, map: glowTex('rgba(255,236,180,1)', 'rgba(255,170,80,.4)'), color: 0xffc070, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true })); IM.glow.frustumCulled = false; scene.add(IM.glow); }
    { const pos = [], ph = []; for (const p of PR.smoke) for (let k = 0; k < 7; k++) { pos.push(p[0], p[1], p[2]); ph.push(p[3] + k / 7); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aPh', new THREE.Float32BufferAttribute(ph, 1));
      IM.smoke = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uC: { value: new THREE.Color(0.85, 0.85, 0.85) }, uS: { value: 1 }, map: { value: glowTex('rgba(255,255,255,.75)', 'rgba(255,255,255,.3)') } }, transparent: true, depthWrite: false,
        vertexShader: 'attribute float aPh; uniform float uT; uniform float uS; varying float vA; void main(){ float f = fract(uT * 0.07 + aPh); vec3 p = position + vec3(sin(aPh * 17.0 + f * 3.0) * 6.0 + f * 40.0, f * 120.0, cos(aPh * 11.0) * 6.0 + f * 18.0); vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = uS * (14.0 + f * 50.0) * 600.0 / -mv.z; vA = (1.0 - f) * smoothstep(0.0, 0.12, f); }',
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
    LU.uLumenC.value.copy(LC).multiplyScalar(night * 1.1 * pulse + 0.05);
    const key = Math.round(camera.position.x / 60) + ',' + Math.round(camera.position.y / 60) + ',' + Math.round(camera.position.z / 60) + ',' + cam.rot.toFixed(2) + ',' + cam.tilt.toFixed(1);
    if (key !== lodAt || ++lodTick > 30) { lodAt = key; lodTick = 0; pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frus.setFromProjectionMatrix(pm);
      for (const s2 of IM.all) fillSet(s2, cam.z); fillProps(cam.z > 0.14); }
    IM.props.lamp.material.color.setRGB(0.35 + night * 0.75, 0.27 + night * 0.5, 0.16 + night * 0.25);
    IM.glow.material.opacity = night * 0.5; IM.glow.visible = night > 0.05;
    IM.smoke.material.uniforms.uT.value = t; IM.smoke.visible = cam.z > 0.12; IM.smoke.material.uniforms.uS.value = renderer.getPixelRatio() * cssH / 900; IM.smoke.material.uniforms.uC.value.setRGB(0.86 - night * 0.6, 0.86 - night * 0.6, 0.88 - night * 0.55);
    animPulley(t, night); }

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
  function place(cam, snap) {
    let th = Math.max(meshH(cam.x, cam.y), P_H * (1 - clamp((Math.hypot(cam.x, cam.y) - CITY.hollowR) / 600, 0, 1)) - 200);
    const hw = W.heartwood; if (hw && hw.ce) { const d = Math.hypot(cam.x - hw.cx, cam.y - hw.cy); th = Math.max(th, th + (hw.ce - th) * (1 - smooth01(500, 1100, d))); } // look at the Heartwood's homes, not the pit floor below
    if (snap === 'keep') snap = Math.hypot(T.x - cam.x, T.y - cam.y) > 300 ? true : null;
    T.x = cam.x; T.y = cam.y; T.h = snap === null ? T.h : snap ? th : T.h + (th - T.h) * 0.12;
    const D = dist(cam), ph = (cam.tilt * Math.PI) / 180, th2 = cam.rot;
    camera.position.set(T.x + Math.sin(th2) * Math.cos(ph) * D, T.h + Math.sin(ph) * D, T.y + Math.cos(th2) * Math.cos(ph) * D);
    const g = meshH(camera.position.x, camera.position.z) + 60; if (camera.position.y < g) camera.position.y = g;
    camera.lookAt(T.x, T.h, T.y); camera.updateMatrixWorld(); camera.far = D * 6 + 30000; camera.near = Math.max(5, D * 0.02); camera.updateProjectionMatrix();
  }
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
    place(cam);
    const night = nightFactor(), pulse = 0.78 + 0.22 * Math.sin(t * 0.9) + 0.06 * Math.sin(t * 2.3), D = dist(cam);
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
  }
  function tapSprites(sx, sy, list) { // screen-space hit test against standing billboards: distance to the segment from base to top
    let best = null, bd = 1e9;
    for (const o of list) { const hgt = o.hgt, up = o.up || 0; const a = project(o.x, o.y, up), b = project(o.x, o.y, up + hgt); if (a[0] < -999) continue;
      const vx = b[0] - a[0], vy = b[1] - a[1], l2 = vx * vx + vy * vy || 1; let u = ((sx - a[0]) * vx + (sy - a[1]) * vy) / l2; u = clamp(u, 0, 1); const d = Math.hypot(a[0] + vx * u - sx, a[1] + vy * u - sy);
      const rad = Math.max(14, Math.hypot(vx, vy) * (o.wf || 0.35)); if (d < rad && d - rad < bd) { bd = d - rad; best = o.o; } }
    return best;
  }
  return { refresh: () => { if (st.ok) { buildBillboards(); buildRoofLOD(); drapeRing(); lightsPts(); if (MD) buildModelScene(); } }, st, ground, get models() { return mdState; }, init, resize, render, project, unproject, viewBox, meshH, place, tapSprites, dist, get dbg() { return { texA, texB, texC, U: terrainMat && terrainMat.userData.U }; }, get canvas() { return cv3; } };
})();

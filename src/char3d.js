/* ============================================================
   CHARACTER TAB: the player's delver on a warm little stage.
   Procedural, stylised (Ghibli-ish) male and female delvers from concept/char-male.jpg and char-female.jpg,
   built on a nested Object3D rig (hips, spine, chest, neck, head, shoulders, arms, hands, legs, feet, braid chain),
   with a layered idle (breathing, sway, blinks, look-arounds), randomised impatient fidgets blended with easing,
   leg/arm IK so feet stay planted, and inertial secondary motion (braid, rope, lantern).
   ============================================================ */
const CharView = (() => {
  const TAU = Math.PI * 2, V = (x, y, z) => new THREE.Vector3(x, y, z), clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
  const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }, ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  let FLOOR = [], WALLG = null, R = null, scene, cam, wrap, canvas, running = false, raf = 0, rig = null, built = {}, tPrev = 0, clk = 0;
  const st = { anim: 'idle', ok: false, yaw: 0.0, yawV: 0, dist: 4.1, lastInput: 0, fidget: null, frames: 0, sex: 'm' };
  function prng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  /* ---------- textures & materials ---------- */
  function cv(w, h, f) { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; }
  let GRAD = null; const gradMap = () => GRAD || (GRAD = (() => { const c = document.createElement('canvas'); c.width = 6; c.height = 1; const g = c.getContext('2d'); ['#5e5650', '#7d746c', '#a99f95', '#d7cdc2', '#f3ece4', '#ffffff'].forEach((col, i) => { g.fillStyle = col; g.fillRect(i, 0, 1, 1); }); const t = new THREE.CanvasTexture(c); t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; return t; })());
  const hex = (c) => '#' + c.toString(16).padStart(6, '0');
  // painted fabric: base colour, mottled wear, a fine weave, optional stitched seams
  function fabric(col, o = {}) { const r = prng(o.seed || 7); return cv(256, 256, (g, w, h) => { g.fillStyle = hex(col); g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { const a = r() * (o.mottle ?? 0.05); g.fillStyle = r() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,240,220,${a * 0.8})`; g.beginPath(); g.arc(r() * w, r() * h, 4 + r() * 22, 0, TAU); g.fill(); }
    g.globalAlpha = o.weave ?? 0.07; for (let y = 0; y < h; y += 3) { g.fillStyle = y % 6 ? '#000' : '#fff'; g.fillRect(0, y, w, 1); } for (let x = 0; x < w; x += 4) { g.fillStyle = '#000'; g.fillRect(x, 0, 1, h); } g.globalAlpha = 1;
    if (o.folds) { g.save(); g.filter = 'blur(2.2px)'; g.lineCap = 'round'; for (let i = 0; i < o.folds; i++) { const x = r() * w, y = r() * h, L = 30 + r() * 90, a = (r() - 0.5) * (o.foldTilt ?? 0.6), dx = Math.cos(a) * L, dy = Math.sin(a) * L, bw = (r() - 0.5) * 26;
        for (const [ox, c, lw] of [[0, 'rgba(30,15,5,.22)', 6], [4, 'rgba(255,240,215,.16)', 4]]) for (const sx of [0, -w, w]) { g.strokeStyle = c; g.lineWidth = lw; g.beginPath(); g.moveTo(x + sx, y + ox); g.quadraticCurveTo(x + sx + dx / 2, y + dy / 2 + bw + ox, x + sx + dx, y + dy + ox); g.stroke(); } } g.restore(); }
    if (o.stitch) { g.strokeStyle = o.stitch; g.lineWidth = 2; g.setLineDash([6, 5]); for (const y of o.seams || [24, 232]) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } g.setLineDash([]); }
    if (o.laces) { g.strokeStyle = '#d8c29a'; g.lineWidth = 5; for (let y = 20; y < h - 10; y += 34) { g.beginPath(); g.moveTo(100, y); g.lineTo(156, y + 20); g.moveTo(156, y); g.lineTo(100, y + 20); g.stroke(); } g.fillStyle = '#2a1b12'; for (let y = 20; y < h; y += 34) { g.beginPath(); g.arc(100, y, 4, 0, TAU); g.arc(156, y, 4, 0, TAU); g.fill(); } }
  }); }
  function patchTex(col, edge) { return cv(128, 128, (g, w, h) => { g.fillStyle = hex(col); g.fillRect(0, 0, w, h); const r = prng(3); for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.12})`; g.fillRect(r() * w, r() * h, 8, 3); }
    g.strokeStyle = edge; g.lineWidth = 4; g.setLineDash([9, 7]); g.strokeRect(10, 10, w - 20, h - 20); g.setLineDash([]); }); }
  function spiralTex(col) { return cv(128, 128, (g, w, h) => { g.fillStyle = hex(col); g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(40,24,12,.7)'; g.lineWidth = 5; g.beginPath(); for (let a = 0; a < 18; a += 0.1) { const rr = 3 + a * 3.3; g.lineTo(64 + Math.cos(a) * rr, 64 + Math.sin(a) * rr); } g.stroke(); }); }
  function radial(inner, outer) { const t = cv(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, inner); gr.addColorStop(0.5, outer); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; }
  // hair strands: along the lock (u) dark root > soft sheen band > base > lighter tip; fine strand lines around (v)
  function hairTex(col, seed) { const r = prng(seed), c0 = new THREE.Color(col), sh = (k) => '#' + c0.clone().multiplyScalar(k).getHexString();
    return cv(256, 64, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, sh(0.62)); gr.addColorStop(0.18, sh(0.95)); gr.addColorStop(0.32, sh(1.55)); gr.addColorStop(0.42, sh(1.08)); gr.addColorStop(0.75, sh(0.98)); gr.addColorStop(1, sh(1.18)); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) { const y = r() * h, l = r() < 0.5; g.strokeStyle = l ? 'rgba(255,225,190,' + (0.05 + r() * 0.08) + ')' : 'rgba(20,10,5,' + (0.08 + r() * 0.12) + ')'; g.lineWidth = 0.6 + r(); g.beginPath(); g.moveTo(r() * w * 0.3, y); g.bezierCurveTo(w * 0.4, y + (r() - 0.5) * 3, w * 0.7, y + (r() - 0.5) * 3, w, y + (r() - 0.5) * 4); g.stroke(); } }); }
  // worn helmet metal/leather: base colour, mottling, grime toward the edges, fine light scratches and a few dents
  function wornTex(col, seed) { const r = prng(seed), c0 = new THREE.Color(col), sh = (k) => '#' + c0.clone().multiplyScalar(k).getHexString();
    return cv(512, 512, (g, w, h) => { g.fillStyle = sh(1); g.fillRect(0, 0, w, h);
      g.save(); g.filter = 'blur(7px)'; for (let i = 0; i < 160; i++) { const a = r() * 0.08; g.fillStyle = r() < 0.55 ? `rgba(30,18,8,${a})` : `rgba(255,240,210,${a * 0.8})`; g.beginPath(); g.arc(r() * w, r() * h, 10 + r() * 40, 0, TAU); g.fill(); } g.restore();
      for (let i = 0; i < 26; i++) { const x = r() * w, y = r() * h, gr = g.createRadialGradient(x, y, 0, x, y, 8 + r() * 14); gr.addColorStop(0, 'rgba(25,14,6,.14)'); gr.addColorStop(0.6, 'rgba(255,235,200,.07)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - 24, y - 24, 48, 48); }
      g.lineCap = 'round'; for (let i = 0; i < 90; i++) { const x = r() * w, y = r() * h, a = r() * TAU, L = 4 + r() * 22; g.strokeStyle = `rgba(255,238,205,${0.12 + r() * 0.2})`; g.lineWidth = 0.6 + r() * 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); }
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.85, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(30,18,8,.25)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }); }
  const toon = (col, map, o = {}) => new THREE.MeshToonMaterial(Object.assign({ color: map ? 0xffffff : col, map: map || null, gradientMap: gradMap() }, o));
  // ink outline: an inverted hull pushed out along the normals
  const OUT = new THREE.ShaderMaterial({ uniforms: { uW: { value: 0.0045 }, uC: { value: new THREE.Color(0x2a1a10) } }, side: THREE.BackSide,
    vertexShader: 'uniform float uW; void main(){ vec3 p = position + normalize(normal) * uW; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
    fragmentShader: 'uniform vec3 uC; void main(){ gl_FragColor = vec4(uC, 1.0); }' });
  /* ---------- geometry helpers ---------- */
  function rbox(w, h, d, r, seg = 5) { const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg), P = g.attributes.position, hw = w / 2 - r, hh = h / 2 - r, hd = d / 2 - r, v = V(0, 0, 0), c = V(0, 0, 0);
    for (let i = 0; i < P.count; i++) { v.set(P.getX(i), P.getY(i), P.getZ(i)); c.set(clamp(v.x, -hw, hw), clamp(v.y, -hh, hh), clamp(v.z, -hd, hd)); v.sub(c); if (v.lengthSq() > 0) v.setLength(r); v.add(c); P.setXYZ(i, v.x, v.y, v.z); } g.computeVertexNormals(); return g; }
  const ell = (rx, ry, rz, w = 20, h = 14) => new THREE.SphereGeometry(1, w, h).scale(rx, ry, rz);
  const cyl = (r0, r1, h, s = 18, open = false) => new THREE.CylinderGeometry(r1, r0, h, s, 1, open); // r0 bottom, r1 top
  const capsule = (r, len, s = 12) => new THREE.CapsuleGeometry(r, len, 6, s);
  const lathe = (pts, s = 32, p0 = 0, pl = TAU) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), s, p0, pl);
  function tube(pts, r, s = 8, tseg = 24) { return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => V(...p))), tseg, r, s, false); }
  function part(parent, geo, mat, pos, rot, scl, o = {}) { const m = new THREE.Mesh(geo, mat); if (pos) m.position.set(...pos); if (rot) m.rotation.set(...rot); if (scl) m.scale.set(...scl); m.castShadow = o.shadow !== false; parent.add(m);
    if (o.ink !== false) { const ol = new THREE.Mesh(geo, OUT); m.add(ol); } return m; }
  // lofted shell along z: sections [z, half-width, bottom y, top y, (x centre)], superellipse cross-sections (n: squareness), rounded end caps
  function loft(sec, n = 3, seg = 20, caps = true) { const pos = [], idx = [], S = sec.length, pw = 2 / n;
    for (const [z, hw, yb, yt, xc = 0] of sec) { const ym = (yb + yt) / 2, hh = (yt - yb) / 2; for (let i = 0; i < seg; i++) { const a = i / seg * TAU, c = Math.cos(a), si = Math.sin(a); pos.push(xc + hw * Math.sign(c) * Math.pow(Math.abs(c), pw), ym + hh * Math.sign(si) * Math.pow(Math.abs(si), pw), z); } }
    for (let j = 0; j < S - 1; j++) for (let i = 0; i < seg; i++) { const a = j * seg + i, b = j * seg + (i + 1) % seg, c = a + seg, d = b + seg; idx.push(a, b, c, b, d, c); }
    if (caps) for (const [j, f] of [[0, -1], [S - 1, 1]]) { const [z, , yb, yt, xc = 0] = sec[j], ci = pos.length / 3; pos.push(xc, (yb + yt) / 2, z + f * 0.002); for (let i = 0; i < seg; i++) { const a = j * seg + i, b = j * seg + (i + 1) % seg; if (f > 0) idx.push(a, b, ci); else idx.push(b, a, ci); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; }
  // boot foot (ankle-bone space, toe toward +z): rounded toe, tapered heel, toe spring; sole: a separate darker band, thicker under the heel
  function bootGeo(F) { const k = F ? 0.93 : 1, U = [[-0.06, 0.03, -0.066, -0.012], [-0.054, 0.04, -0.072, 0.006], [-0.04, 0.046, -0.074, 0.014], [-0.01, 0.049, -0.074, 0.016], [0.03, 0.05, -0.074, 0.008], [0.065, 0.051, -0.073, -0.01], [0.1, 0.049, -0.071, -0.028], [0.125, 0.044, -0.069, -0.038], [0.142, 0.036, -0.067, -0.045], [0.154, 0.024, -0.065, -0.051], [0.16, 0.01, -0.063, -0.056]];
    const So = [[-0.062, 0.032, -0.092, -0.07], [-0.056, 0.043, -0.093, -0.07], [-0.03, 0.049, -0.093, -0.071], [-0.006, 0.048, -0.091, -0.072], [0.008, 0.047, -0.083, -0.073], [0.04, 0.052, -0.083, -0.072], [0.08, 0.054, -0.082, -0.07], [0.12, 0.048, -0.079, -0.067], [0.145, 0.038, -0.075, -0.063], [0.16, 0.024, -0.071, -0.06], [0.167, 0.01, -0.068, -0.059]];
    const sc = (a) => a.map(([z, w, b, t]) => [z * k, w * k, b, t]); return { up: loft(sc(U), 2.6, 24), sole: loft(sc(So), 4, 24) }; }
  const bone = (name, parent, x, y, z) => { const b = new THREE.Object3D(); b.name = name; b.position.set(x, y, z); parent.add(b); return b; };

  /* ---------- palettes (picked from the turnaround sheets) ---------- */
  const PAL = {
    m: { skin: 0xe6b994, blush: 'rgba(240,120,110,.5)', hair: 0x2e211a, iris: '#6a4426', jacket: 0x6e4732, jacketDk: 0x4f3324, shirt: 0xa8916f, pants: 0x6c5b41, patch: 0x55524c, glove: 0x4f3e2e, belt: 0x45301f, boot: 0x5a3e29, bootDk: 0x45301f, pack: 0x725438, packDk: 0x553c27, helmet: 0x76583c, brass: 0xa8874c, rope: 0x9c7446, sock: 0x7c766a },
    f: { skin: 0xecc2a2, blush: 'rgba(245,125,120,.55)', hair: 0x32231a, iris: '#6b4122', jacket: 0x857150, jacketDk: 0x625234, shirt: 0x58432f, pants: 0x5a4834, patch: 0x5d5c50, glove: 0x45332a, belt: 0x553823, boot: 0x5e432d, bootDk: 0x45301f, pack: 0x765a3c, packDk: 0x584029, helmet: 0x7f7356, brass: 0xab8a50, rope: 0x9c7446, sock: 0x6e675a },
  };
  /* ---------- pickaxe: a swappable module, one palette per grade (head / handle / binding, optional runes + glow) ---------- */
  const GRADES = { // in upgrade order; each tier adds geometry, not just colour
    stick: { name: 'Stickaxe', tier: -1, head: 0x8d8a82, handle: 0x6e4c2e, bind: 0xb89a62, chip: 0x7a5a36, stick: true },
    bronze: { name: 'Bronze', tier: 0, head: 0xb07f45, handle: 0x8a5a34, bind: 0xa8743f },
    iron: { name: 'Iron', tier: 1, head: 0x80858d, handle: 0x6e4628, bind: 0x55585e },
    steel: { name: 'Steel', tier: 2, head: 0x6b7580, handle: 0x5b3a22, bind: 0x7d8792, wrap: 0x3a2618, emissive: 0x0a0d10, shine: 0xd8e2ec, shin: 55, chip: 0x8e99a6 },
    gold: { name: 'Gold', tier: 3, head: 0xe6b640, handle: 0x5e2f1a, bind: 0xe6b640, wrap: 0x8a2a1e, emissive: 0x2a1c00 },
    mithril: { name: 'Mithril', tier: 4, head: 0x6f97c6, handle: 0xd9d2c2, bind: 0x9cc0e6, wrap: 0x5f7ea6, emissive: 0x14243a, shine: 0xe8f6ff, shin: 90, chip: 0x93b8de },
    rune: { name: 'Rune', tier: 5, head: 0x3b424c, handle: 0x33261e, bind: 0x8f8160, wrap: 0x2a1d16, glow: 0xb48cff, chip: 0x8f66ee },
    lumen: { name: 'Lumen', tier: 6, head: 0x7ff4ff, handle: 0x2b3038, bind: 0x5fd8f0, wrap: 0x23272e, glow: 0x7ff4ff },
    onyx: { name: 'Ember Onyx', tier: 7, head: 0x16131a, handle: 0x1d1a21, bind: 0x5a1610, wrap: 0x221c20, chip: 0xc8301c, onyx: true },
  };
  let RUNES = null; const runeTex = () => RUNES || (RUNES = (() => { const t = cv(256, 64, (g, w) => { g.clearRect(0, 0, w, 64); g.strokeStyle = '#d8feff'; g.shadowColor = '#5fe8ff'; g.shadowBlur = 10; g.lineWidth = 5; g.lineCap = 'round'; const r = prng(31);
    for (let k = 0; k < 5; k++) { const x0 = 28 + k * 50; g.beginPath(); g.moveTo(x0, 12); g.lineTo(x0, 52); for (let s = 0; s < 2; s++) { const y = 16 + r() * 30; g.moveTo(x0, y); g.lineTo(x0 + (r() < 0.5 ? -1 : 1) * (9 + r() * 9), y + (r() - 0.5) * 20); } g.stroke(); } }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; })());
  /* ---------- Ember Onyx: red-hot veins with little flame licks (one Points draw call, flames rise in world-up and fade) ---------- */
  const FLAME_MAT = () => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, // premultiplied: reads on light and dark backdrops
    uniforms: { uTime: { value: 0 }, uUp: { value: V(0, 1, 0) }, uScale: { value: 400 } },
    vertexShader: `attribute vec3 aOut; attribute float aSeed; uniform float uTime; uniform vec3 uUp; uniform float uScale; varying float vLife; varying float vSeed;
      void main() { float rate = 1.6 + fract(aSeed * 7.31) * 1.3; float t = fract(uTime * rate + aSeed); vLife = t; vSeed = aSeed;
        vec3 side = normalize(cross(uUp, aOut + vec3(0.001, 0.0, 0.0)));
        vec3 p = position + aOut * (0.003 + 0.004 * t) + uUp * (t * (0.042 + 0.026 * fract(aSeed * 3.7))) + side * 0.004 * sin(uTime * 7.0 + aSeed * 40.0) * t;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        float flick = 0.75 + 0.25 * sin(uTime * 23.0 + aSeed * 91.0);
        float size = (0.038 + 0.026 * fract(aSeed * 5.3)) * pow(sin(3.14159 * min(1.0, t * 1.15)), 0.6) * flick;
        gl_PointSize = size * projectionMatrix[1][1] * uScale / -mv.z; }`,
    fragmentShader: `varying float vLife; varying float vSeed; uniform float uTime;
      void main() { vec2 q = gl_PointCoord * 2.0 - 1.0; q.y = -q.y; float h = (q.y + 1.0) * 0.5;
        float w = mix(0.5, 0.03, pow(h, 0.75)); float x = q.x + 0.18 * h * sin(h * 6.0 + vSeed * 20.0 + uTime * 11.0);
        float body = smoothstep(w, w * 0.25, abs(x)) * smoothstep(0.0, 0.18, h) * smoothstep(1.0, 0.75, h);
        float core = smoothstep(w * 0.55, 0.0, abs(x)) * (1.0 - h);
        vec3 col = mix(vec3(0.8, 0.06, 0.02), vec3(1.0, 0.62, 0.18), core);
        float a = clamp(body * pow(1.0 - vLife, 0.8) * 1.3, 0.0, 1.0); if (a < 0.01) discard; gl_FragColor = vec4(col * a * 1.1, a); }` });
  // emit flame sites along a set of polylines: base points + outward directions
  function flamePoints(sites) { const pos = [], out = [], seed = []; const r = prng(77);
    for (const [p, o] of sites) { pos.push(p.x, p.y, p.z); out.push(o.x, o.y, o.z); seed.push(r()); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aOut', new THREE.Float32BufferAttribute(out, 3)); g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1));
    const pts = new THREE.Points(g, FLAME_MAT()); pts.frustumCulled = false; pts.renderOrder = 5; return pts; }
  function onyxDetail(px, head, top, thick) { const veinM = new THREE.MeshBasicMaterial({ color: 0xff3418 }), r = prng(41), sites = [];
    // veins: meandering lines across both faces of the blade, plus a few branches
    for (const side of [-1, 1]) for (let k = 0; k < 3; k++) { const pts = [], f0 = 0.25 + k * 0.25; for (let i = 0; i <= 14; i++) { const x = -0.245 + 0.47 * i / 14 + (r() - 0.5) * 0.01, u = (x + 0.27) / 0.52, f = clamp(f0 + (r() - 0.5) * 0.22 + 0.08 * Math.sin(i * 1.3 + k), 0.12, 0.88); pts.push(V(x, top(x) - thick(u) * f, side * 0.0168)); }
      const cur = new THREE.CatmullRomCurve3(pts); part(head, new THREE.TubeGeometry(cur, 40, 0.0023, 4, false), veinM, null, null, null, { ink: false, shadow: false });
      for (let i = 0; i < 22; i++) { const p = cur.getPointAt((i + r() * 0.8) / 22.5); sites.push([p.add(V(0, head.position.y, 0)), V(0, 0, side)]); } }
    // twisted handle: a red seam riding the groove of the twist
    const hp = []; for (let i = 0; i <= 60; i++) { const y = -0.26 + 0.86 * i / 60, th = (Math.PI + y * 18) / 3; hp.push(V(Math.cos(th) * 0.0128, y, Math.sin(th) * 0.0128)); }
    const hc = new THREE.CatmullRomCurve3(hp); part(px, new THREE.TubeGeometry(hc, 120, 0.0016, 4, false), veinM, null, null, null, { ink: false, shadow: false });
    for (let i = 0; i < 26; i++) { const p = hc.getPointAt((i + r()) / 26.5); if (Math.abs(p.y) < 0.07) continue; sites.push([p, V(p.x, 0, p.z).normalize()]); }
    const fl = flamePoints(sites); px.add(fl); px.userData.flames = fl; px.userData.veins = veinM; }
  function twistedHandle(len, r0) { const g = new THREE.CylinderGeometry(r0 * 0.9, r0, len, 15, 48), P = g.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), th = Math.atan2(z, x), rr = Math.hypot(x, z), yy = y + 0.22; const k = 1 + 0.16 * Math.cos(3 * th - yy * 18); P.setXYZ(i, Math.cos(th) * rr * k, y, Math.sin(th) * rr * k); } g.computeVertexNormals(); return g; }
  // sparkles (Lumen): twinkling star points, premultiplied so they read on any backdrop
  const SPARK_MAT = (col) => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    uniforms: { uTime: { value: 0 }, uUp: { value: V(0, 1, 0) }, uScale: { value: 400 }, uCol: { value: new THREE.Color(col) } },
    vertexShader: `attribute float aSeed; uniform float uTime; uniform float uScale; varying float vA;
      void main() { float t = fract(uTime * (0.45 + fract(aSeed * 5.1) * 0.5) + aSeed); float tw = pow(max(0.0, sin(3.14159 * t)), 5.0); vA = tw;
        vec3 p = position + vec3(0.0, 0.012 * t, 0.0); vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = (0.018 + 0.02 * fract(aSeed * 9.7)) * tw * projectionMatrix[1][1] * uScale / -mv.z; }`,
    fragmentShader: `uniform vec3 uCol; varying float vA; void main() { vec2 q = gl_PointCoord * 2.0 - 1.0; float s = max(exp(-abs(q.x) * 16.0) * exp(-abs(q.y) * 2.5), exp(-abs(q.y) * 16.0) * exp(-abs(q.x) * 2.5)) + exp(-dot(q, q) * 10.0);
      float a = clamp(s * vA, 0.0, 1.0); if (a < 0.01) discard; gl_FragColor = vec4(mix(uCol, vec3(1.0), 0.6) * a, a); }` });
  function bladeShape(top, thick, x0, x1, N = 26) { const sh = new THREE.Shape(), pts = []; for (let i = 0; i <= N; i++) { const x = x0 + (x1 - x0) * i / N; pts.push([x, top(x)]); }
    sh.moveTo(...pts[0]); for (const p of pts) sh.lineTo(...p); for (let i = N; i >= 0; i--) { const [x, y] = pts[i]; sh.lineTo(x, y - thick(i / N)); } sh.closePath(); return sh; }
  function extrudeHead(sh, D, bev) { const g = new THREE.ExtrudeGeometry(sh, { depth: D, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * 0.85, bevelSegments: bev > 0.006 ? 3 : 2, curveSegments: 4 }); g.translate(0, 0, -D / 2); g.computeVertexNormals(); return g; }
  function helix(par, y0, y1, turns, r, tr, mat, phase = 0) { const pts = []; for (let i = 0; i <= turns * 12; i++) { const t = i / (turns * 12), a = phase + t * turns * TAU; pts.push(V(Math.cos(a) * r, y0 + (y1 - y0) * t, Math.sin(a) * r)); } return part(par, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 20, tr, 5, false), mat, null, null, null, { ink: false }); }
  function faceLines(head, lines, mat, z, r) { for (const side of [-1, 1]) for (const l of lines) part(head, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(l.map(([x, y]) => V(x, y, side * z))), Math.max(10, l.length * 6), r, 4, false), mat, null, null, null, { ink: false, shadow: false }); }
  const spiral = (cx, cy, r0, turns, dir = 1, n = 18) => { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, a = dir * t * turns * TAU, rr = r0 * (1 - 0.8 * t); o.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } return o; };
  // grip at the origin, handle along +y, blade in the local x/y plane (x = the pick's forward)
  /* ---------- Stickaxe: a gnarled, twisting branch with a forked spur and a lashed stone ---------- */
  function barkTex() { return cv(256, 64, (g, w, h) => { g.fillStyle = '#6e4c2e'; g.fillRect(0, 0, w, h); const r = prng(31);
    for (let i = 0; i < 90; i++) { const y = r() * h; g.strokeStyle = r() < 0.55 ? 'rgba(38,22,10,.55)' : 'rgba(160,120,78,.35)'; g.lineWidth = 1 + r() * 2.5; g.beginPath(); const x0 = r() * w; g.moveTo(x0, y); g.bezierCurveTo(x0 + 20, y + (r() - 0.5) * 6, x0 + 45, y + (r() - 0.5) * 6, x0 + 30 + r() * 50, y + (r() - 0.5) * 5); g.stroke(); }
    for (let i = 0; i < 5; i++) { g.fillStyle = 'rgba(35,20,8,.55)'; g.beginPath(); g.ellipse(r() * w, r() * h, 5 + r() * 4, 3 + r() * 3, 0, 0, TAU); g.fill(); } }); }
  function gnarl(pts, r0, r1, seed, knots = []) { const cur = new THREE.CatmullRomCurve3(pts.map((p) => V(...p))), ts = 64, rs = 10, g = new THREE.TubeGeometry(cur, ts, 1, rs, false), P = g.attributes.position, c = V(0, 0, 0), v = V(0, 0, 0), r = prng(seed), ph = [r() * 6, r() * 6];
    for (let i = 0; i < P.count; i++) { const ti = Math.floor(i / (rs + 1)), t = ti / ts, a = (i % (rs + 1)) / rs * TAU; cur.getPointAt(t, c); let rad = lerp(r0, r1, t) * (1 + 0.11 * Math.sin(t * 23 + ph[0] + a * 2) + 0.06 * Math.sin(t * 57 + ph[1]));
      for (const [kt, ka, kd] of knots) rad += ka * Math.exp(-(((t - kt) / 0.03) ** 2)) * Math.max(0, Math.cos(a - kd)) ** 2; v.set(P.getX(i), P.getY(i), P.getZ(i)).sub(c); P.setXYZ(i, c.x + v.x * rad, c.y + v.y * rad, c.z + v.z * rad); }
    g.computeVertexNormals(); return g; }
  function makeStickaxe(px) { const bt = barkTex(); bt.wrapS = bt.wrapT = THREE.RepeatWrapping; bt.repeat.set(3, 1); const bark = toon(0, bt), r = prng(13);
    const hp = []; for (let i = 0; i <= 9; i++) { const y = -0.3 + i * 0.115; hp.push([0.011 * Math.sin(i * 1.4), y, 0.009 * Math.cos(i * 1.9)]); }
    part(px, gnarl(hp, 0.0195, 0.0165, 3, [[0.28, 0.009, 1.2], [0.55, 0.007, 4.0], [0.8, 0.006, 2.4]]), bark);
    // the forked spur: a side branch bending out and down to a whittled point
    const bt2 = bt.clone(); bt2.needsUpdate = true; bt2.repeat.set(1.2, 1); part(px, gnarl([[0, 0.62, 0], [-0.07, 0.69, 0.004], [-0.15, 0.71, 0.0], [-0.22, 0.67, -0.004], [-0.27, 0.6, 0]], 0.016, 0.003, 9, [[0.35, 0.004, 0]]), toon(0, bt2));
    // a sharpened stone lashed on the other side with twine
    const sg = new THREE.DodecahedronGeometry(0.05, 0); sg.scale(1.75, 0.62, 0.55); { const P = sg.attributes.position; for (let i = 0; i < P.count; i++) if (P.getX(i) > 0.02) P.setY(i, P.getY(i) * 0.55); sg.computeVertexNormals(); }
    part(px, sg, new THREE.MeshPhongMaterial({ color: 0x8d8a82, flatShading: true, shininess: 8 }), [0.085, 0.675, 0], [0, 0, -0.12]);
    helix(px, 0.635, 0.715, 5, 0.022, 0.0042, toon(0, fabric(0xb89a62, { seed: 22, weave: 0.25 })));
    // a leaf still clinging to the broken tip
    const ls = new THREE.Shape(); ls.moveTo(0, 0); ls.quadraticCurveTo(0.022, 0.03, 0, 0.065); ls.quadraticCurveTo(-0.022, 0.03, 0, 0); const leaf = part(px, new THREE.ShapeGeometry(ls, 6), toon(0x6f9a3c, null, { side: THREE.DoubleSide }), [0.004, 0.735, 0.012], [0.3, 0.4, -0.6], null, { ink: false }); void leaf; void r;
    return px; }
  /* ---------- Tether: the coiled rope on the hip as a swappable, graded module ----------
     Every grade is a neat coil: n wound loops packed into a round bundle, a wrapped binding at the top (where it hangs from the belt ring),
     the cord built from real twisted strands (vine > 3-strand rope > braided cable). Higher grades add metal bands, wire servings,
     rune bands, glowing strands or red-hot vein strands with flames - all on the coil itself, nothing sticking out. */
  const TGRADES = {
    regular: { name: 'Vine', tier: 0, col: 0x6a7d36, dk: 0x4a5a26, chip: 0x6f9a3c },
    bronze: { name: 'Bronze', tier: 1, col: 0xa98250, dk: 0x7a5a34, metal: 0xb5823f, chip: 0xb07f45 },
    iron: { name: 'Iron', tier: 2, col: 0x8f704a, dk: 0x5e4a33, metal: 0x7d828a, chip: 0x80858d },
    steel: { name: 'Steel', tier: 3, col: 0xa3adb8, dk: 0x5c646e, metal: 0xc8d1da, shine: 0xe0e8f0, chip: 0x8e99a6 },
    gold: { name: 'Gold', tier: 4, col: 0xb9a27a, dk: 0x6e6250, metal: 0xe6b640, shine: 0xfff0b0, chip: 0xe6b640 },
    mithril: { name: 'Mithril', tier: 5, col: 0xb8d2ee, dk: 0x6f8fb4, metal: 0xdfeefa, shine: 0xf0f8ff, chip: 0x93b8de },
    rune: { name: 'Rune', tier: 6, col: 0x463e52, dk: 0x2a2432, metal: 0x8f8160, glow: 0xb48cff, chip: 0x8f66ee },
    lumen: { name: 'Lumen', tier: 7, col: 0x9ff6ff, dk: 0x2a7f96, metal: 0x5fd8f0, glow: 0x7ff4ff, chip: 0x7ff4ff },
    onyx: { name: 'Ember Onyx', tier: 8, col: 0x1d1920, dk: 0x0e0c10, metal: 0x2a2228, chip: 0xc8301c, onyx: true },
  };
  function tRuneTex(col) { return cv(256, 32, (g, w, h) => { g.fillStyle = '#2a2236'; g.fillRect(0, 0, w, h); g.strokeStyle = col; g.lineWidth = 2.4; g.lineCap = 'round'; const r = prng(5);
    for (let x = 8; x < w; x += 21) { g.beginPath(); const k = (r() * 5) | 0; g.moveTo(x, 7); g.lineTo(x, 25); if (k === 0) { g.moveTo(x, 9); g.lineTo(x + 8, 15); } else if (k === 1) { g.moveTo(x, 16); g.lineTo(x + 8, 9); g.moveTo(x, 16); g.lineTo(x + 8, 23); } else if (k === 2) { g.moveTo(x, 9); g.lineTo(x + 8, 15); g.lineTo(x, 21); } else if (k === 3) { g.moveTo(x - 4, 12); g.lineTo(x + 4, 20); } else { g.moveTo(x, 8); g.lineTo(x + 7, 13); g.lineTo(x + 7, 25); } g.stroke(); }
    g.fillStyle = col; g.fillRect(0, 0, w, 2); g.fillRect(0, h - 2, w, 2); }); }
  // o: { R loop radius, n loops, tr cord radius, sy loop squash (tall hanging loops) }
  function makeTether(grade, o = {}) { const key = TGRADES[grade] ? grade : 'regular', G = TGRADES[key], T = G.tier, grp = new THREE.Group(); grp.name = 'tether'; grp.userData = { grade: key, fx: [] };
    const R = o.R || 0.058, n = o.n || 5, tr = o.tr || 0.0105, sy = o.sy || 1, rr = prng(11 + T), vine = T === 0;
    // loops packed in a round bundle: (radial, z) offsets in cord spacings
    const h = 0.866, OFF = n <= 4 ? [[-h / 2, 0.5], [-h / 2, -0.5], [h / 2, 0.5], [h / 2, -0.5]] : n === 5 ? [[0, 0], [-h, 0.5], [-h, -0.5], [h, 0.5], [h, -0.5]] : n === 6 ? [[-h, 0.5], [-h, -0.5], [h, 0.5], [h, -0.5], [0, 1], [0, -1]] : [[0, 0], [0, 1], [-h, 0.5], [-h, -0.5], [0, -1], [h, 0.5], [h, -0.5]], sp = 2 * tr * (vine ? 0.82 : 0.9);
    const LP = []; for (let k = 0; k < n; k++) { const [dr, dz] = OFF[k % 7]; LP.push({ r: R + dr * sp, z: dz * sp, ph: rr() * TAU, w: vine ? 0.0012 : 0.0003 }); }
    const er = Math.max(...LP.map((l) => Math.abs(l.r - R))) + tr, ez = Math.max(...LP.map((l) => Math.abs(l.z))) + tr;
    const C = (l, a) => { const q = l.r + l.w * Math.sin(3 * a + l.ph) + (vine ? 0.0007 * Math.sin(7 * a + l.ph * 2) : 0); return V(q * Math.cos(a), q * sy * Math.sin(a), l.z + (vine ? 0.0009 * Math.sin(5 * a + l.ph) : 0)); };
    const Nm = (a) => V(sy * Math.cos(a), Math.sin(a), 0).normalize(), Tg = (a) => V(-Math.sin(a), sy * Math.cos(a), 0).normalize(), Z = V(0, 0, 1);
    const ring = (l, f, M = 200) => { const pts = []; for (let i = 0; i < M; i++) { const a = i / M * TAU; pts.push(f(a, C(l, a))); } return new THREE.CatmullRomCurve3(pts, true); };
    // a strand wound round the loop's centreline: off = distance from the centre, tw = turns per loop, ph0 = start phase, dir = lay direction
    const strand = (l, off, tw, ph0, dir = 1) => ring(l, (a, c) => { const th = dir * tw * a + ph0, N = Nm(a); return c.addScaledVector(N, off * Math.cos(th)).addScaledVector(Z, off * Math.sin(th)); });
    const tubeOn = (curve, r, mat, segs = 260, ink = false) => part(grp, new THREE.TubeGeometry(curve, segs, r, 6, true), mat, null, null, null, { ink });
    const shiny = (col, sh = G.shine || 0x888888, s = 60, extra = {}) => new THREE.MeshPhongMaterial(Object.assign({ color: col, specular: sh, shininess: s }, extra));
    const cordM = vine ? toon(G.col) : G.onyx ? shiny(G.col, 0x7a6a80, 80) : T === 7 ? shiny(G.col, 0xffffff, 90, { emissive: 0x1d93ad, transparent: true, opacity: 0.62 }) : G.shine ? shiny(G.col) : toon(G.col);
    const coreM = T === 7 ? new THREE.MeshBasicMaterial({ color: G.glow }) : T === 2 ? toon(G.metal) : toon(G.dk);
    const metal = G.metal ? (G.shine ? shiny(G.metal, G.shine, 80) : toon(G.metal)) : null;
    // the cord: a dark core (carries the ink outline) + twisted strands
    const NS = vine ? 2 : T <= 2 ? 3 : T <= 4 ? 6 : 8, TW = vine ? 2 : NS >= 6 ? 11 : 9, K = tr / 0.0105;
    const cordM2 = vine ? toon(0x55652a) : cordM; grp.userData.cord = { cordM, cordM2, coreM, NS, braid: NS >= 6, vine, core: vine ? 0.7 : T === 2 ? 0.62 : 0.66, off: vine ? 0.38 : NS >= 6 ? 0.56 : 0.5, sr: (j) => vine ? (j ? 0.48 : 0.62) : NS >= 6 ? 0.42 : 0.55, pitch: Math.PI * R * (1 + sy) / TW / tr };
    for (const l of LP) { tubeOn(ring(l, (a, c) => c), tr * (vine ? 0.7 : T === 2 ? 0.62 : 0.66), coreM, 160, true);
      for (let j = 0; j < NS; j++) { const braid = NS >= 6, dir = braid ? (j % 2 ? -1 : 1) : 1, ph = (braid ? Math.floor(j / 2) / (NS / 2) : j / NS) * TAU;
        tubeOn(strand(l, tr * (vine ? 0.38 : braid ? 0.56 : 0.5), TW, ph + l.ph, dir), tr * (vine ? (j ? 0.48 : 0.62) : braid ? 0.42 : 0.55), j % 2 ? cordM2 : cordM, braid ? 320 : 260); } }
    // binding at the top of the coil (where it hangs): a tight wrap round the whole bundle
    const a0 = Math.PI / 2, bindW = (vine ? 0.02 : 0.022) * K, aw = bindW / R, wire = (vine ? 0.0034 : 0.0019) * K;
    const bindAt = (am, turns, rw, mat, w = aw, M = 400) => { const pts = []; for (let i = 0; i <= M; i++) { const t = i / M, th = t * turns * TAU, c = V(R * Math.cos(am), R * sy * Math.sin(am), 0).addScaledVector(Tg(am), (t - 0.5) * w * R); pts.push(c.addScaledVector(Nm(am), (er + rw) * Math.cos(th)).addScaledVector(Z, (ez + rw) * Math.sin(th))); }
      return part(grp, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), M * 2, rw, 5, false), mat, null, null, null, { ink: false }); };
    const bM = vine ? toon(G.dk) : T === 1 ? toon(G.metal) : metal || cordM; bindAt(a0, vine ? 3.5 : bindW / (wire * 1.7), wire, bM); if (T >= 6) bindAt(-Math.PI / 2, bindW / (wire * 1.7), wire, bM);
    // a band (ferrule) round the bundle at angle a: elliptical sleeve with rolled rims
    const band = (a, h, mat, rims = 0, rimMat = mat) => { const c = V(R * Math.cos(a), R * sy * Math.sin(a), 0), q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(Nm(a), Tg(a), Z));
      const m = part(grp, new THREE.CylinderGeometry(1, 1, h, 24, 1, true), mat, null, null, null, { ink: false }); m.position.copy(c); m.quaternion.copy(q); m.scale.set(er + 0.0008, 1, ez + 0.0008); m.material.side = THREE.DoubleSide;
      for (let i = 0; i < rims; i++) { const rm = part(grp, new THREE.TorusGeometry(1, 0.12, 5, 24), rimMat, null, null, null, { ink: false }); rm.position.copy(c).addScaledVector(Tg(a), (i ? 1 : -1) * h / 2); rm.quaternion.copy(q).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0))); rm.scale.set(er + 0.0016, ez + 0.0016, 0.016); } return m; };
    if (T >= 1) { // hang ring through the binding (clips to the belt)
      const hr = part(grp, new THREE.TorusGeometry(0.011, 0.0026, 6, 18), metal, null, null, null, { ink: false }); hr.position.set(0, R * sy + er + 0.006, 0); hr.rotation.y = Math.PI / 2; }
    if (vine) { // leaves still on the vine, lying along the coil, and one curling tendril
      const lm = toon(0x77a23f, null, { side: THREE.DoubleSide }), lm2 = toon(0x5d8a32, null, { side: THREE.DoubleSide }), ls = new THREE.Shape(); ls.moveTo(0, 0); ls.bezierCurveTo(0.012, 0.006, 0.014, 0.022, 0, 0.034); ls.bezierCurveTo(-0.014, 0.022, -0.012, 0.006, 0, 0);
      const lg = new THREE.ShapeGeometry(ls, 8); { const P = lg.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i); P.setZ(i, 0.12 * y * y / 0.034 + 0.002 * Math.abs(x) / 0.012); } lg.computeVertexNormals(); } grp.userData.leaf = { lg, lm, lm2 };
      const lf = LP.reduce((b, l) => (l.z > b.z ? l : b), LP[0]); for (const [a, side, k, s] of [[-0.35, 1, 0, 1], [0.8, -1, 1, 0.85], [2.35, 1, 1, 1.1], [3.7, -1, 0, 0.9], [5.0, 1, 1, 0.8]]) { const l = lf, c = C(l, a), N = Nm(a), tg = Tg(a), out = N.clone().multiplyScalar(0.55).addScaledVector(Z, 0.83).normalize();
        const y = tg.clone().multiplyScalar(side).addScaledVector(out, 0.55).normalize(), zz = V(0, 0, 0).crossVectors(y, out).normalize(), x = V(0, 0, 0).crossVectors(y, zz); const m = part(grp, lg, k ? lm2 : lm, null, null, null, { ink: false });
        m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, V(0, 0, 0).crossVectors(x, y))); m.position.copy(c).addScaledVector(out, tr * 0.9); m.scale.setScalar(s * K * 1.25); }
      const tc = []; { const a = 1.6, c = C(lf, a).addScaledVector(Z, tr * 0.9); for (let i = 0; i <= 30; i++) { const u = i / 30, rr2 = 0.009 * (1 - u * 0.8), th = u * 9; tc.push(c.clone().addScaledVector(Tg(a), 0.012 * u + rr2 * Math.cos(th) * 0.6).addScaledVector(Z, rr2 * Math.sin(th) * 0.5 + 0.002)); } }
      part(grp, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tc), 60, 0.0012, 4, false), lm, null, null, null, { ink: false }); }
    // metal bands round the coil: more with each grade
    const NB = [0, 1, 2, 3, 4, 4, 0, 0, 5][T]; for (let i = 0; i < NB; i++) { const a = a0 + (i + 1) * TAU / (NB + 1); band(a, 0.016 * K, T === 8 ? shiny(0x2a2230, 0x9a8aa0, 90, { flatShading: true }) : metal, T >= 4 ? 2 : 0, T === 8 ? new THREE.MeshBasicMaterial({ color: 0xff4a1c }) : metal); }
    // gold: a bright wire served along the cable groove
    // mithril: filigree curls on each band + a gem set in the binding
    if (T === 5) { for (let i = 0; i < NB; i++) { const a = a0 + (i + 1) * TAU / (NB + 1), c = V(R * Math.cos(a), R * sy * Math.sin(a), ez + 0.0022), pts = []; for (let j = 0; j <= 24; j++) { const u = j / 24, th = u * TAU * 1.2; pts.push(c.clone().addScaledVector(Tg(a), (u - 0.5) * 0.01 + 0.002 * Math.cos(th)).addScaledVector(Nm(a), 0.0035 * Math.sin(th))); } part(grp, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.0009, 4, false), metal, null, null, null, { ink: false }); }
      part(grp, ell(0.0042, 0.0042, 0.0028, 10, 8), toon(0x9fd8ff, null, { emissive: 0x2a6a9a }), [0, R * sy, ez + 0.003], null, null, { ink: false }); }
    // rune: glowing rune bands, a violet thread in the twist groove, a rune stone on the binding
    if (T === 6) { const tx = tRuneTex("#c9a2ff"); tx.repeat.set(1, 1); const bm = new THREE.MeshBasicMaterial({ map: tx }); for (let i = 0; i < 4; i++) band(a0 + (i + 1) * TAU / 5, 0.02 * K, bm, 2, toon(G.metal));
      const vm = new THREE.MeshBasicMaterial({ color: 0xc9a2ff }); for (const l of LP) tubeOn(strand(l, tr * 0.84, 11, l.ph + Math.PI / 5), tr * 0.15, vm, 320);
      part(grp, new THREE.OctahedronGeometry(0.0055, 0), new THREE.MeshBasicMaterial({ color: G.glow }), [0, R * sy, ez + 0.004], null, [1, 1.3, 0.6], { ink: false });
      const pl = new THREE.PointLight(G.glow, 0.25, 0.5, 2); grp.add(pl); grp.userData.light = pl; }
    // lumen: crystal-fibre cable with a glowing core and light threads, crystal-capped binding, glow + sparkles
    if (T === 7) { const gm = new THREE.MeshBasicMaterial({ color: 0xc8fcff }); for (const l of LP) tubeOn(strand(l, tr * 0.84, 11, l.ph + Math.PI / 5), tr * 0.16, gm, 320); const gb = new THREE.MeshPhongMaterial({ color: 0xbffaff, emissive: 0x3ab8d0, specular: 0xffffff, shininess: 100, transparent: true, opacity: 0.8 }); for (let i = 0; i < 4; i++) band(a0 + (i + 1) * TAU / 5, 0.014 * K, gb, 2, new THREE.MeshBasicMaterial({ color: 0x9ff8ff }));
      const cm = new THREE.MeshPhongMaterial({ color: 0x8ff6ff, emissive: 0x1d93ad, specular: 0xffffff, shininess: 90, flatShading: true }); for (const sgn of [-1, 1]) { const a = a0 + sgn * aw * 0.62, c = V(R * Math.cos(a), R * sy * Math.sin(a), 0); const m = part(grp, new THREE.CylinderGeometry(1, 1, 0.006, 6), cm, null, null, null, { ink: false }); m.position.copy(c); m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(Nm(a), Tg(a), Z)); m.scale.set(er + 0.003, 1, ez + 0.003); }
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: radial('rgba(120,240,255,.45)', 'rgba(90,220,255,.12)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); gl.scale.set(R * 4, R * 4 * sy, 1); grp.add(gl); grp.userData.glow = gl;
      const pl = new THREE.PointLight(G.glow, 0.35, 0.7, 2); grp.add(pl); grp.userData.light = pl; const sp2 = [], seed = [];
      for (let i = 0; i < 26; i++) { const l = LP[(rr() * n) | 0], a = rr() * TAU, p = C(l, a).addScaledVector(Nm(a), (rr() - 0.3) * tr * 1.5).addScaledVector(Z, (rr() - 0.5) * tr * 2); sp2.push(p.x, p.y, p.z); seed.push(rr()); }
      const sgm = new THREE.BufferGeometry(); sgm.setAttribute('position', new THREE.Float32BufferAttribute(sp2, 3)); sgm.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1)); const spk = new THREE.Points(sgm, SPARK_MAT(G.glow)); spk.frustumCulled = false; spk.renderOrder = 5; grp.add(spk); grp.userData.fx.push(spk); }
    // ember onyx: one strand of each loop is a red-hot vein; small flames lick off it along the outer loops
    if (T === 8) { const vm = new THREE.MeshBasicMaterial({ color: 0xff3418 }); grp.userData.veins = vm; const sites = [];
      LP.forEach((l, k) => { const cur = strand(l, tr * 0.84, 11, l.ph + Math.PI / 5); tubeOn(cur, tr * 0.2, vm, 320); if (k > 2 && k !== 5) return; for (let i = 0; i < 14; i++) { const u = (i + 0.5) / 14, a = u * TAU, p = cur.getPointAt(u); if (Math.abs(a - a0) < aw) continue; sites.push([p, Nm(a).multiplyScalar(0.5).addScaledVector(Z, 0.5).normalize()]); } });
      const fl = flamePoints(sites); grp.add(fl); grp.userData.fx.push(fl); grp.userData.flames = fl; }
    return grp; }
  function makePickaxe(grade) { const key = GRADES[grade] ? grade : 'stick', G = GRADES[key], T = G.tier, px = new THREE.Group(); px.name = 'pickaxe'; px.userData.grade = key; px.userData.fx = []; if (G.stick) return makeStickaxe(px);
    const metal = G.shine ? new THREE.MeshPhongMaterial({ color: G.head, specular: G.shine, shininess: G.shin || 60, emissive: G.emissive || 0 }) : toon(G.head, null, G.emissive ? { emissive: G.emissive } : {}), bindM = toon(G.bind), wood = toon(0, fabric(G.handle, { seed: 23, weave: T >= 4 ? 0.03 : 0.06 })), wrapM = toon(0, fabric(G.wrap || 0x4b3020, { seed: 25, weave: 0.22 }));
    // handle
    if (G.onyx) part(px, twistedHandle(1.04, 0.0165), toon(G.handle), [0, 0.22, 0]); else part(px, cyl(0.016, 0.0138, 1.04, T >= 4 ? 14 : 10), wood, [0, 0.22, 0]);
    // grip: rope (bronze) > plain leather (iron) > spiral leather strap (steel+) > cross-wrapped (mithril+)
    if (T === 0) { const rm = toon(0, fabric(G.bind, { seed: 22, weave: 0.2 })); helix(px, -0.065, 0.075, 9, 0.0178, 0.0047, rm); for (const y of [-0.068, 0.078]) part(px, ell(0.007, 0.006, 0.007, 10, 8), rm, [0.017, y, 0], null, null, { ink: false }); }
    else if (T === 1) part(px, cyl(0.0182, 0.0182, 0.13, 10), wrapM, [0, 0, 0]);
    else { part(px, cyl(0.0172, 0.0172, 0.15, 12), wrapM, [0, 0, 0]); helix(px, -0.072, 0.072, 6, 0.0178, 0.0032, toon(G.wrap || 0x3a2618)); if (T >= 4) helix(px, -0.072, 0.072, 6, 0.0178, 0.0026, bindM, Math.PI);
      for (const y of [-0.08, 0.08]) part(px, cyl(0.0198, 0.0198, 0.012, 14), bindM, [0, y, 0]); }
    // ferrule at the butt (steel+), knob (gold+)
    if (T >= 2) { part(px, cyl(0.0185, 0.0172, 0.045, 12), T >= 3 ? bindM : metal, [0, -0.3, 0]); if (T >= 3) part(px, ell(0.02, 0.016, 0.02, 14, 10), bindM, [0, -0.325, 0]); }
    // bands up the handle (more with each tier)
    for (const y of [[], [0.6], [0.6, 0.26], [0.6, 0.45, 0.26], [0.6, 0.45, 0.26], [0.6, 0.4, 0.2], [0.6, 0.38, 0.18], [0.6, -0.26]][T]) part(px, cyl(0.019, 0.019, T >= 3 ? 0.016 : 0.022, 12), T >= 3 ? bindM : toon(G.bind), [0, y, 0]);
    // head profile per tier
    const head = new THREE.Group(); head.position.y = 0.68; px.add(head); let top = (x) => 0.03 - 0.2 * Math.pow((x + 0.01) / 0.27, 2), thick = (u) => 0.006 + 0.05 * Math.sin(Math.PI * Math.pow(u, 0.9)), x0 = -0.27, x1 = 0.25, D = 0.022, bev = 0.006;
    if (T === 0) { top = (x) => 0.014 - 0.07 * Math.pow(x / 0.22, 2); thick = (u) => 0.01 + 0.032 * Math.sin(Math.PI * u); x0 = -0.2; x1 = 0.21; D = 0.026; bev = 0.003; }
    if (T === 2) bev = 0.0095;
    if (T === 3) { D = 0.024; bev = 0.008; }
    if (T === 4) { top = (x) => 0.036 - 0.27 * Math.pow((x + 0.01) / 0.31, 2); thick = (u) => 0.004 + 0.034 * Math.pow(Math.sin(Math.PI * u), 1.5); x0 = -0.32; x1 = 0.31; D = 0.015; bev = 0.006; }
    if (T === 5) { thick = (u) => u < 0.5 ? 0.056 + 0.045 * Math.pow((0.5 - u) * 2, 2) : 0.006 + 0.05 * Math.sin(Math.PI * Math.pow(u, 0.9)); D = 0.028; bev = 0.008; }
    const u2x = (u) => x0 + (x1 - x0) * u, mid = (u, f = 0.5) => { const x = u2x(u); return [x, top(x) - thick(u) * f]; }, faceZ = D / 2 + bev;
    if (T !== 6) part(head, extrudeHead(bladeShape(top, thick, x0, x1), D, bev), metal);
    // socket, collars, rivets, langets
    part(head, rbox(T ? 0.048 : 0.04, T ? 0.078 : 0.06, T ? 0.048 : 0.04, T ? 0.01 : 0.006), T === 6 ? toon(0x2b3038) : metal);
    if (T >= 1) { for (const y of T >= 2 ? [-0.048, 0.044] : [-0.048]) part(head, new THREE.TorusGeometry(0.024, 0.0055, 6, 18), T >= 3 ? bindM : metal, [0, y, 0], [Math.PI / 2, 0, 0]);
      for (const sz of [-1, 1]) for (const [rx, ry] of [[-0.012, 0.018], [0.012, 0.018], [-0.012, -0.018], [0.012, -0.018]]) part(head, ell(0.0045, 0.0045, 0.003, 8, 6), T >= 3 ? bindM : toon(0x4a4d52), [rx, ry, sz * 0.0245], null, null, { ink: false }); }
    if (T >= 3) for (const sz of [-1, 1]) part(head, rbox(0.026, 0.14, 0.005, 0.002), bindM, [0, -0.11, sz * 0.0195]);
    // steel: polished bevel edge along the cutting edges
    if (T === 2) faceLines(head, [Array.from({ length: 13 }, (_, i) => mid(i / 12, 0.96))], toon(0xf2f7fc), faceZ - 0.0025, 0.0022);
    // gold: engraved scrollwork, gilded finial
    if (T === 3) { const eng = toon(0x8a6418); faceLines(head, [Array.from({ length: 9 }, (_, i) => mid(0.04 + i * 0.045, 0.5)), Array.from({ length: 9 }, (_, i) => mid(0.6 + i * 0.045, 0.5)), spiral(-0.05, -0.012, 0.016, 1.3, 1), spiral(0.05, -0.012, 0.016, 1.3, -1)], eng, faceZ, 0.0017);
      part(head, new THREE.ConeGeometry(0.012, 0.035, 8), bindM, [0, 0.055, 0]); part(head, ell(0.012, 0.012, 0.012, 10, 8), bindM, [0, 0.074, 0]); }
    // mithril: silver filigree curls along a sleek blade
    if (T === 4) { const fil = toon(0xf6fbff, null, { emissive: 0x223040 }); const L = [];
      for (const [a, b, d] of [[0.06, 0.34, 1], [0.66, 0.94, -1]]) { L.push(Array.from({ length: 9 }, (_, i) => mid(a + (b - a) * i / 8, 0.5))); for (let k = 0; k < 3; k++) { const [x, y] = mid(a + (b - a) * (k + 0.5) / 3, 0.5); L.push(spiral(x, y + 0.009 * (k % 2 ? -1 : 1), 0.009, 1.2, d * (k % 2 ? -1 : 1), 12)); } }
      faceLines(head, L, fil, faceZ, 0.0012); part(head, ell(0.011, 0.011, 0.011, 10, 8), toon(0x9fd8ff, null, { emissive: 0x2a6a9a }), [0, 0.05, 0]); }
    // rune: carved glowing runes and inset gems
    if (T === 5) { const rm = new THREE.MeshBasicMaterial({ map: runeTex(), color: G.glow, transparent: true, depthWrite: false });
      for (const side of [-1, 1]) { const sg = new THREE.Group(); sg.rotation.y = side < 0 ? Math.PI : 0; head.add(sg);
        for (const u of [0.18, 0.78]) { const [x, y] = mid(u, 0.5), sl = (top(x + 0.01) - top(x - 0.01)) / 0.02, m = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.026), rm); m.position.set(side * x, y, faceZ + 0.0008); m.rotation.z = Math.atan(side * sl); sg.add(m); } }
      const gem = new THREE.MeshBasicMaterial({ color: 0xc9a2ff }); for (const sz of [-1, 1]) { const g = new THREE.Mesh(new THREE.OctahedronGeometry(0.011, 0), gem); g.position.set(0, 0, sz * 0.026); g.scale.set(1, 1.3, 0.5); head.add(g); }
      part(head, new THREE.OctahedronGeometry(0.013, 0), gem, [0, 0.055, 0], null, [1, 1.5, 1]);
      faceLines(head, [Array.from({ length: 17 }, (_, i) => mid(0.03 + i * 0.058, 0.1)), Array.from({ length: 17 }, (_, i) => mid(0.03 + i * 0.058, 0.9))], bindM, faceZ, 0.0016);
      for (const y of [0.4, 0.2]) for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; part(px, new THREE.OctahedronGeometry(0.0055, 0), gem, [Math.cos(a) * 0.019, y, Math.sin(a) * 0.019], null, null, { ink: false }); }
      const pl = new THREE.PointLight(G.glow, 0.22, 0.6, 2); head.add(pl); px.userData.light = pl; }
    // lumen: a crystalline head (faceted shards along the crescent), glow and sparkles
    if (T === 6) { const cm = new THREE.MeshPhongMaterial({ color: 0x8ff6ff, emissive: 0x1d93ad, specular: 0xffffff, shininess: 90, flatShading: true, transparent: true, opacity: 0.92 }), r = prng(61);
      for (let i = 0; i <= 10; i++) { const u = i / 10, [x, y] = mid(u, 0.45), sl = (top(x + 0.01) - top(x - 0.01)) / 0.02, len = (i === 0 || i === 10 ? 0.075 : 0.05) * (0.85 + r() * 0.3), w = 0.016 + 0.018 * Math.sin(Math.PI * u);
        const m = part(head, new THREE.OctahedronGeometry(1, 0), cm, [x, y, (r() - 0.5) * 0.008], [0, (r() - 0.5) * 0.6, Math.atan(sl) + Math.PI / 2 + (r() - 0.5) * 0.3], [w, len, 0.014 + r() * 0.006], { ink: i % 3 === 0 }); m.castShadow = false; }
      for (const sz of [-1, 1]) part(head, new THREE.OctahedronGeometry(0.014, 0), new THREE.MeshBasicMaterial({ color: 0xbffcff }), [0, 0, sz * 0.026], null, [1, 1.4, 0.5], { ink: false });
      for (let i = 0; i < 14; i++) { const u = 0.04 + i * 0.07, [x, y] = mid(u, i % 2 ? 0.12 : 0.88), sl = (top(x + 0.01) - top(x - 0.01)) / 0.02; part(head, new THREE.OctahedronGeometry(1, 0), cm, [x, y, (i % 2 ? 1 : -1) * 0.009], [0.4, 0, Math.atan(sl) + (i % 2 ? 0.9 : -0.9)], [0.008, 0.024 + r() * 0.012, 0.007], { ink: false }); }
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: radial('rgba(170,250,255,1)', 'rgba(90,220,255,.3)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); gl.scale.set(0.5, 0.34, 1); head.add(gl);
      const pl = new THREE.PointLight(G.glow, 0.4, 0.9, 2); head.add(pl); px.userData.glow = gl; px.userData.light = pl;
      const sp = [], seed = []; for (let i = 0; i < 40; i++) { const [x, y] = mid(r(), r()); sp.push(x + (r() - 0.5) * 0.05, y + head.position.y + (r() - 0.5) * 0.06, (r() - 0.5) * 0.07); seed.push(r()); }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); sg.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1)); const spk = new THREE.Points(sg, SPARK_MAT(G.glow)); spk.frustumCulled = false; spk.renderOrder = 5; px.add(spk); px.userData.fx.push(spk); }
    if (G.onyx) { onyxDetail(px, head, top, thick); px.userData.fx.push(px.userData.flames);
      const thorn = toon(0x221d26), rg = new THREE.MeshBasicMaterial({ color: 0xff3a1c });
      for (let i = 0; i < 10; i++) { const u = 0.1 + i * 0.089, [x] = mid(u, 0), y = top(x), sl = (top(x + 0.01) - top(x - 0.01)) / 0.02; part(head, new THREE.ConeGeometry(0.0075, 0.03 - Math.abs(u - 0.5) * 0.02, 5), thorn, [x, y + 0.008, 0], [0, 0, Math.atan(sl) + (x < 0 ? 0.35 : -0.35)]); }
      for (const sz of [-1, 1]) for (const ry of [0.02, -0.02]) part(head, new THREE.OctahedronGeometry(0.007, 0), rg, [0, ry, sz * 0.026], null, [1, 1.3, 0.5], { ink: false });
      part(px, new THREE.OctahedronGeometry(0.018, 0), toon(0x16131a), [0, -0.34, 0], null, [1, 1.8, 1]); }
    return px; }
  /* ---------- Climbing Picks: a pair of rock dry-tooling tools, one per hand, graded like the pickaxe ----------
     Local frame like the pickaxe: grip at the origin, shaft along +y, the hooking pick pointing +x. Short, aggressively curved shaft (bows back
     behind the grip, then sweeps forward into the head), a thin hooking pick with a drooping tip, an offset ergonomic grip with a finger rest,
     a pommel spike, and a wrist leash. No adze. Stone: a twisting branch with knapped stone hooks lashed on (Stickaxe style). */
  const CGRADES = Object.assign({ stone: { name: 'Stone', tier: -1, head: 0x8d8a82, handle: 0x6e4c2e, bind: 0xb89a62, chip: 0x8d8a82, stone: true } }, Object.fromEntries(Object.entries(GRADES).filter(([k]) => k !== 'stick')));
  function curveHelix(cur, r, turns, ph, n = 120) { const fr = cur.computeFrenetFrames(n, false), pts = []; for (let i = 0; i <= n; i++) { const t = i / n, p = cur.getPointAt(t), a = ph + t * turns * TAU; pts.push(p.addScaledVector(fr.normals[i], Math.cos(a) * r).addScaledVector(fr.binormals[i], Math.sin(a) * r)); } return new THREE.CatmullRomCurve3(pts); }
  function makeClimbPick(grade) { const key = CGRADES[grade] ? grade : 'stone', G = CGRADES[key], T = G.tier, px = new THREE.Group(); px.name = 'climbPick'; px.userData = { grade: key, fx: [] }; const stone = !!G.stone;
    const shine = (col, o = {}) => G.shine ? new THREE.MeshPhongMaterial(Object.assign({ color: col, specular: G.shine, shininess: G.shin || 60, emissive: G.emissive || 0 }, o)) : toon(col, null, Object.assign(G.emissive ? { emissive: G.emissive } : {}, o));
    const metal = shine(G.head), bindM = toon(G.bind), cordM = toon(0, fabric(G.bind, { seed: 23, weave: 0.25 })), leather = toon(T >= 3 ? (G.wrap || 0x3a2618) : 0x5a3a22);
    // shaft centreline: pommel > offset grip > bowed-back shaft > head
    const SP = [[0.012, -0.072], [0.004, -0.04], [0, 0], [-0.004, 0.05], [-0.022, 0.12], [-0.04, 0.2], [-0.037, 0.27], [-0.014, 0.332], [0.012, 0.366]].map(([x, y]) => V(x, y, 0)), cur = new THREE.CatmullRomCurve3(SP);
    if (stone) { const bt = barkTex(); bt.wrapS = bt.wrapT = THREE.RepeatWrapping; bt.repeat.set(1.5, 1); part(px, gnarl(SP.map((p, i) => [p.x + 0.004 * Math.sin(i * 1.7), p.y, 0.004 * Math.cos(i * 2.1)]), 0.0135, 0.011, 5, [[0.3, 0.006, 1.0], [0.62, 0.005, 3.6]]), toon(0, bt)); }
    else if (G.onyx) { part(px, new THREE.TubeGeometry(cur, 64, 0.0115, 9, false), toon(G.handle)); for (let k = 0; k < 3; k++) part(px, new THREE.TubeGeometry(curveHelix(cur, 0.0108, 5, k * TAU / 3), 160, 0.0042, 5, false), toon(G.handle), null, null, null, { ink: false }); }
    else part(px, new THREE.TubeGeometry(cur, 64, 0.0115, T >= 2 ? 12 : 9, false), T >= 2 ? shine(G.bind) : toon(0, fabric(G.handle, { seed: 31, weave: 0.1 })));
    // grip: lashed twine (stone/bronze) > leather sleeve (iron) > ridged rubber grip (steel+); finger rest under the grip, pommel spike below
    if (T <= 0) helix(px, -0.045, 0.045, 7, 0.0128, 0.0034, cordM); else { part(px, cyl(0.0138, 0.0138, 0.095, 12), leather, [0, 0, 0]); if (T >= 2) part(px, cyl(0.0146, 0.0146, 0.07, 12), toon(0x2a2a2e), [0, 0, 0], null, null, { ink: false }); }
    const rest = new THREE.CatmullRomCurve3([V(0.0, 0.058, 0), V(0.022, 0.06, 0), V(0.036, 0.048, 0), V(0.038, 0.034, 0)]); part(px, new THREE.TubeGeometry(rest, 16, stone ? 0.0068 : 0.0058, 7, false), stone ? toon(0, fabric(G.handle, { seed: 5 })) : T >= 1 ? metal : bindM);
    if (stone) { const sp = new THREE.ConeGeometry(0.009, 0.034, 5); part(px, sp, new THREE.MeshPhongMaterial({ color: G.head, flatShading: true, shininess: 8 }), [0.016, -0.088, 0], [0, 0, 0.25]); helix(px, -0.078, -0.058, 3, 0.0125, 0.0028, cordM); }
    else { part(px, new THREE.ConeGeometry(0.0085, 0.038, T >= 2 ? 10 : 6), metal, [0.016, -0.09, 0], [0, 0, 0.25]); if (T >= 1) part(px, cyl(0.0125, 0.012, 0.016, 12), T >= 3 ? bindM : metal, [0.011, -0.068, 0], [0, 0, 0.25]); }
    if (T >= 2) part(px, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(-0.026, 0.165, 0), V(-0.008, 0.168, 0), V(0.004, 0.158, 0)]), 10, 0.0048, 6, false), metal, null, null, null, { ink: false }); // upper rest for matching hands
    // the hooking pick: thin, drooping, teeth along the underside (more teeth with the grade)
    const nT = stone ? 0 : [3, 5, 6, 7, 8, 8, 9, 9][T], top = (x) => 0.383 - 2.4 * x * x - 0.06 * x, th = (u) => (stone ? 0.034 : 0.028) * (1 - u) + 0.0045 + (nT && u > 0.25 && u < 0.92 ? 0.0045 * Math.max(0, Math.sin(u * nT * Math.PI * 1.35)) : 0);
    const sh = bladeShape(top, th, -0.012, stone ? 0.15 : 0.165, 40), D = stone ? 0.012 : T >= 2 ? 0.0045 : 0.006, bev = stone ? 0.0025 : 0.0016; const bg = extrudeHead(sh, D, bev);
    if (stone) { const P = bg.attributes.position, r = prng(17); for (let i = 0; i < P.count; i++) { P.setY(i, P.getY(i) + (r() - 0.5) * 0.003); P.setZ(i, P.getZ(i) * (0.8 + r() * 0.4)); } bg.computeVertexNormals(); }
    const bladeM = stone ? new THREE.MeshPhongMaterial({ color: G.head, flatShading: true, shininess: 8 }) : T === 6 ? new THREE.MeshPhongMaterial({ color: 0x8ff6ff, emissive: 0x1d93ad, specular: 0xffffff, shininess: 90, flatShading: true, transparent: true, opacity: 0.9 }) : metal;
    part(px, bg, bladeM); const faceZ = D / 2 + bev, mid = (u, f = 0.5) => { const x = -0.012 + (0.165 + 0.012) * u; return [x, top(x) - th(u) * f]; };
    // head: socket over the shaft top (no adze), lashing for stone
    if (stone) { helix(px, 0.338, 0.385, 5, 0.0145, 0.0034, cordM); helix(px, 0.35, 0.375, 3, 0.016, 0.003, cordM, 1.4); const ls = new THREE.Shape(); ls.moveTo(0, 0); ls.quadraticCurveTo(0.016, 0.022, 0, 0.046); ls.quadraticCurveTo(-0.016, 0.022, 0, 0); part(px, new THREE.ShapeGeometry(ls, 6), toon(0x6f9a3c, null, { side: THREE.DoubleSide }), [-0.016, 0.372, 0.006], [0.3, 0.3, 0.7], null, { ink: false }); }
    else { part(px, rbox(0.03, 0.05, 0.022, 0.008), T === 6 ? toon(0x2b3038) : metal, [0.006, 0.36, 0], [0, 0, -0.35]); for (const sz of [-1, 1]) part(px, ell(0.0035, 0.0035, 0.0025, 8, 6), T >= 3 ? bindM : toon(0x4a4d52), [0.006, 0.36, sz * 0.012], null, null, { ink: false }); part(px, cyl(0.0135, 0.0128, 0.014, 12), T >= 3 ? bindM : metal, [-0.006, 0.33, 0], [0, 0, 0.5]); }
    // grade detail
    if (T >= 3 && !G.onyx && T !== 6) for (const y of [0.29, 0.22]) part(px, cyl(0.0132, 0.0132, 0.008, 12), bindM, [cur.getPointAt(y / 0.44).x, y, 0], null, null, { ink: false });
    if (T === 3) { faceLines(px, [Array.from({ length: 9 }, (_, i) => mid(0.05 + i * 0.09, 0.55))], toon(0x8a6418), faceZ, 0.0011); part(px, ell(0.006, 0.006, 0.006, 10, 8), toon(0xc8301c, null, { emissive: 0x401008 }), [0.004, 0.385, 0], null, null, { ink: false }); }
    if (T === 4) { const fil = toon(0xf6fbff, null, { emissive: 0x223040 }); faceLines(px, [Array.from({ length: 9 }, (_, i) => mid(0.05 + i * 0.09, 0.5)), spiral(...mid(0.3, 0.45), 0.008, 1.3, 1), spiral(...mid(0.6, 0.45), 0.007, 1.3, -1)], fil, faceZ, 0.0009); part(px, ell(0.0062, 0.0062, 0.0062, 10, 8), toon(0x9fd8ff, null, { emissive: 0x2a6a9a }), [0.004, 0.386, 0], null, null, { ink: false }); part(px, new THREE.TubeGeometry(curveHelix(cur, 0.0122, 7, 0.4), 160, 0.0016, 4, false), bindM, null, null, null, { ink: false }); }
    if (T === 5) { const rm = new THREE.MeshBasicMaterial({ map: runeTex(), color: G.glow, transparent: true, depthWrite: false }); for (const sz of [-1, 1]) for (const uu of [0.3, 0.68]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.012), rm); m.position.set(mid(uu, 0.5)[0], mid(uu, 0.5)[1], sz * (faceZ + 0.0006)); m.rotation.set(0, sz < 0 ? Math.PI : 0, -0.25 - uu * 0.5); px.add(m); }
      const gem = new THREE.MeshBasicMaterial({ color: 0xc9a2ff }); part(px, new THREE.OctahedronGeometry(0.007, 0), gem, [0.004, 0.388, 0], null, [1, 1.4, 1], { ink: false }); part(px, new THREE.OctahedronGeometry(0.005, 0), gem, [0.016, -0.11, 0], null, [1, 1.4, 1], { ink: false }); for (const y of [0.12, 0.18, 0.24]) part(px, new THREE.OctahedronGeometry(0.0045, 0), gem, [cur.getPointAt(y / 0.44).x - 0.012, y, 0], null, [1, 1.3, 1], { ink: false });
      const pl = new THREE.PointLight(G.glow, 0.15, 0.4, 2); pl.position.set(0.06, 0.36, 0); px.add(pl); px.userData.light = pl; }
    if (T === 6) { const cm = new THREE.MeshPhongMaterial({ color: 0x8ff6ff, emissive: 0x1d93ad, specular: 0xffffff, shininess: 90, flatShading: true }); for (let i = 0; i < 9; i++) { const [x, y] = mid(0.06 + i * 0.105, 0.5); part(px, new THREE.OctahedronGeometry(1, 0), cm, [x, y, 0], [0, 0, -0.5 - i * 0.07], [0.008, 0.013, 0.0055], { ink: false }); } for (const p of [[0.04, 0.034, 0], [0.016, -0.11, 0]]) part(px, new THREE.OctahedronGeometry(0.0065, 0), new THREE.MeshBasicMaterial({ color: 0xbffcff }), p, null, [1, 1.4, 1], { ink: false });
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: radial('rgba(170,250,255,1)', 'rgba(90,220,255,.3)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); gl.position.set(0.07, 0.35, 0); gl.scale.set(0.2, 0.14, 1); px.add(gl); const pl = new THREE.PointLight(G.glow, 0.25, 0.6, 2); pl.position.copy(gl.position); px.add(pl); px.userData.glow = gl; px.userData.light = pl;
      const r = prng(63), sp = [], seed = []; for (let i = 0; i < 20; i++) { const [x, y] = mid(r(), r()); sp.push(x + (r() - 0.5) * 0.02, y + (r() - 0.5) * 0.03, (r() - 0.5) * 0.03); seed.push(r()); } const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); sg.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1)); const spk = new THREE.Points(sg, SPARK_MAT(G.glow)); spk.frustumCulled = false; spk.renderOrder = 5; px.add(spk); px.userData.fx.push(spk); }
    if (G.onyx) { const vm = new THREE.MeshBasicMaterial({ color: 0xff3418 }); px.userData.veins = vm; const vc = curveHelix(cur, 0.0118, 5, TAU / 6); part(px, new THREE.TubeGeometry(vc, 160, 0.0016, 4, false), vm, null, null, null, { ink: false, shadow: false });
      const bl = new THREE.CatmullRomCurve3(Array.from({ length: 9 }, (_, i) => { const [x, y] = mid(0.04 + i * 0.11, 0.45); return V(x, y, 0); })); for (const sz of [-1, 1]) part(px, new THREE.TubeGeometry(bl, 30, 0.0013, 4, false), vm, [0, 0, sz * faceZ], null, null, { ink: false, shadow: false });
      for (const sz of [-1, 1]) part(px, new THREE.OctahedronGeometry(0.005, 0), new THREE.MeshBasicMaterial({ color: 0xff3a1c }), [0.006, 0.36, sz * 0.0125], null, [1, 1.3, 0.5], { ink: false }); for (const y of [0.2, 0.27]) part(px, cyl(0.0148, 0.0148, 0.01, 8), shine(0x2a2230, { flatShading: true }), [cur.getPointAt(y / 0.44).x, y, 0]);
      const sites = []; for (let i = 0; i < 18; i++) { const p = vc.getPointAt((i + 0.5) / 18); if (Math.abs(p.y) < 0.06) continue; sites.push([p, V(p.x - cur.getPointAt((i + 0.5) / 18).x, 0, p.z).normalize()]); } for (let i = 0; i < 8; i++) { const p = bl.getPointAt((i + 0.5) / 8); sites.push([p.clone().setZ(faceZ), V(0, 0, 1)]); sites.push([p.clone().setZ(-faceZ), V(0, 0, -1)]); }
      const fl = flamePoints(sites); px.add(fl); px.userData.fx.push(fl); px.userData.flames = fl; }
    return px; }
  function updatePickFx(pk, t) { if (!pk) return; pk.getWorldQuaternion(_q2); _q2.invert(); for (const fx of pk.userData.fx) { const u = fx.material.uniforms; u.uTime.value = t; u.uUp.value.set(0, 1, 0).applyQuaternion(_q2); u.uScale.value = R ? R.domElement.height / 2 : 400; }
    if (pk.userData.veins) pk.userData.veins.color.setRGB(1, 0.18 + 0.06 * Math.sin(t * 5.3), 0.07);
    if (pk.userData.glow) { const pg = 0.8 + 0.2 * Math.sin(t * 2.4) + 0.05 * Math.sin(t * 13); pk.userData.glow.material.opacity = 0.75 * pg; }
    if (pk.userData.light) pk.userData.light.intensity = (pk.userData.glow ? 0.35 : 0.22) * (0.85 + 0.15 * Math.sin(t * 2.4)); }

  /* ---------- skinned shells: rings (rest pose, character space) lofted into one continuous tube, weights blended across the joints ---------- */
  const INK_S = new THREE.MeshBasicMaterial({ color: 0x2a1a10, side: THREE.BackSide });
  INK_S.onBeforeCompile = (s) => { s.vertexShader = s.vertexShader.replace('#include <skinning_vertex>', '#include <skinning_vertex>\n\ttransformed += normalize(objectNormal) * 0.0045;'); };
  const crm = (p0, p1, p2, p3, t) => 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
  // ring = [y, rx, rz, cx, cz, frontGap]; chain = [[bone], [bone, jointY, blend], ...] ordered along the rings
  function shell(list, rings0, chain, mat, o = {}) { const seg = o.seg || 22, sub = o.sub || 3, rings = rings0.map((r) => [r[0], r[1], r[2], r[3] ?? o.cx ?? 0, r[4] ?? o.cz ?? 0, r[5] ?? o.gap ?? 0]), R = [];
    for (let i = 0; i < rings.length - 1; i++) for (let k = 0; k < sub; k++) { const p0 = rings[Math.max(0, i - 1)], p1 = rings[i], p2 = rings[i + 1], p3 = rings[Math.min(rings.length - 1, i + 2)]; R.push(p1.map((_, j) => { const v = crm(p0[j], p1[j], p2[j], p3[j], k / sub); return j === 1 || j === 2 || j === 5 ? Math.max(0, v) : v; })); }
    R.push(rings[rings.length - 1].slice()); for (const r of R) if (r[3] !== r[3]) r[3] = 0;
    const N = seg + 1, desc = R[R.length - 1][0] < R[0][0], pos = [], uv = [], si = [], sw = [], idx = []; let vAcc = 0; const closed = !R.some((r) => r[5] > 0);
    R.forEach((r, ri) => { const [y, rx, rz, cx, cz, gap] = r; if (ri) vAcc += Math.abs(y - R[ri - 1][0]) + Math.abs(rx - R[ri - 1][1]);
      const w = [1, 0, 0, 0]; for (let b = 1; b < chain.length; b++) { const yj = chain[b][1], bw = chain[b][2] ?? o.blend ?? 0.045, t = desc ? ss(yj + bw, yj - bw, y) : ss(yj - bw, yj + bw, y); for (let q = 0; q < b; q++) w[q] *= 1 - t; w[b] = t; }
      for (let j = 0; j < N; j++) { const a = gap / 2 + (TAU - gap) * j / seg; pos.push(cx + Math.sin(a) * rx, y, cz + Math.cos(a) * rz); uv.push(j / seg * (o.uRep || 2), vAcc * (o.vRep || 4)); si.push(0, 1, 2, 3); sw.push(...w); } });
    for (let r = 0; r < R.length - 1; r++) for (let j = 0; j < seg; j++) { const a = r * N + j, b = a + 1, c = a + N, d = b + N; if (desc) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4)); g.setIndex(idx); g.computeVertexNormals();
    if (closed) { const n = g.attributes.normal, t = V(0, 0, 0); for (let r = 0; r < R.length; r++) { const a = r * N, b = a + seg; t.set(n.getX(a) + n.getX(b), n.getY(a) + n.getY(b), n.getZ(a) + n.getZ(b)).normalize(); n.setXYZ(a, t.x, t.y, t.z); n.setXYZ(b, t.x, t.y, t.z); } }
    const m = new THREE.SkinnedMesh(g, mat); m.castShadow = true; m.frustumCulled = false; const bones = chain.map((c) => c[0]); while (bones.length < 4) bones.push(bones[bones.length - 1]);
    list.push({ m, bones, ink: o.ink !== false }); return m; }
  function bindShells(root, list) { root.updateMatrixWorld(true); for (const s of list) { root.add(s.m); s.m.updateMatrixWorld(true); const sk = new THREE.Skeleton(s.bones); s.m.bind(sk, s.m.matrixWorld);
    if (s.ink) { const ol = new THREE.SkinnedMesh(s.m.geometry, INK_S); ol.frustumCulled = false; ol.castShadow = false; root.add(ol); ol.updateMatrixWorld(true); ol.bind(sk, ol.matrixWorld); } } }

  /* ---------- the character ---------- */
  function build(sex) { const P = PAL[sex], F = sex === 'f', root = new THREE.Group(); root.name = 'delver'; const skins = [];
    const M = { skin: skinMat(F), skinDk: skinMat(F), hair: toon(P.hair), hairL: toon(0, hairTex(P.hair, F ? 3 : 5), { color: 0xbab2ae }), jacket: toon(0, fabric(P.jacket, { stitch: 'rgba(40,20,10,.45)', seed: 11, folds: 34 }), { side: THREE.DoubleSide }), jacketDk: toon(0, fabric(P.jacketDk, { seed: 12 })),
      shirt: toon(0, fabric(P.shirt, { seed: 13, folds: 12 })), pants: toon(0, fabric(P.pants, { seed: 14, folds: 24, stitch: 'rgba(40,25,10,.35)', seams: [128] })), patch: toon(0, patchTex(P.patch, 'rgba(230,220,200,.55)')), glove: toon(0, fabric(P.glove, { seed: 15, weave: 0.03 })),
      belt: toon(0, fabric(P.belt, { seed: 16, weave: 0.02, stitch: 'rgba(220,190,140,.35)', seams: [40, 216] })), boot: toon(0, fabric(P.boot, { seed: 17, weave: 0.02 })), bootLace: toon(0, fabric(P.boot, { seed: 18, weave: 0.02, laces: true })), bootDk: toon(P.bootDk),
      pack: toon(0, fabric(P.pack, { seed: 19, stitch: 'rgba(30,18,8,.4)' })), packDk: toon(0, fabric(P.packDk, { seed: 20 })), helmet: toon(0, fabric(P.helmet, { seed: 21, weave: 0.015 })), brass: toon(P.brass), dark: toon(0x2c2420), rope: toon(0, fabric(P.rope, { seed: 22, weave: 0.18 })),
      sock: toon(0, fabric(P.sock, { seed: 24, weave: 0.14 })), lens: new THREE.MeshBasicMaterial({ color: 0x23211f }) };
    // proportions: the female delver has slightly shorter legs (per the sheet)
    const LT = F ? 0.34 : 0.36, LS = F ? 0.33 : 0.345, HY = 0.045 + LT + LS + 0.07;
    const B = {}; // rig
    B.hips = bone('hips', root, 0, HY, 0); B.spine = bone('spine', B.hips, 0, 0.1, 0); B.chest = bone('chest', B.spine, 0, 0.16, 0); B.neck = bone('neck', B.chest, 0, 0.135, 0); B.head = bone('head', B.neck, 0, 0.055, 0.005);
    for (const [s, k] of [[-1, 'R'], [1, 'L']]) { B['sh' + k] = bone('shoulder' + k, B.chest, s * 0.15, 0.085, -0.005); B['ua' + k] = bone('upperArm' + k, B['sh' + k], 0, 0, 0); B['fa' + k] = bone('forearm' + k, B['ua' + k], 0, -0.245, 0); B['hd' + k] = bone('hand' + k, B['fa' + k], 0, -0.215, 0);
      B['th' + k] = bone('thigh' + k, B.hips, s * 0.082, -0.045, 0); B['sn' + k] = bone('shin' + k, B['th' + k], 0, -LT, 0); B['ft' + k] = bone('foot' + k, B['sn' + k], 0, -LS, 0); }
    // ---- head: a sculpted anime head (oval, cheek volume, small nose / lip / chin profile) with a painted face decal ----
    const HC = V(0, 0.122, 0.012), head = new THREE.Group(); head.position.copy(HC); head.scale.setScalar(F ? 0.93 : 0.94); B.head.add(head); B.headC = head;
    const HD = HEADS[F ? 'f' : 'm'], hgeo = headGeo(F); { const hm = part(head, hgeo, headMat(F), null, null, null, { ink: false }); hm.add(new THREE.Mesh(hgeo, headInk())); } if (window.HSHELL !== 0) part(head, hairShell(hgeo, F), headMat(F, true), null, null, null, { ink: false });
    // ears (with an inner shade) placed behind the jaw, as on the side view
    for (const s of [-1, 1]) { // anime ears per the sheet: top at the eyes, lobe at the nose tip, tucked behind the jaw with the back edge angled out.
      // One sculpted surface (no ink hull: at this size it read as a black blob): a dome with a rolled helix rim round the top and back,
      // a hollow concha with a soft antihelix fold, and warm vertex shading in the hollow and along the outer edge.
      const [ey, ez] = HD.ear, W = tab(HD.rows, ey, 1), g = new THREE.Group(); g.position.set(s * (W - 0.001), ey, ez); g.rotation.set(0, -s * 0.2, s * 0.06); head.add(g);
      // the ear surface is baked into head space and coloured by the head's own projection, so it carries the sheet's painted ear (side view) with real relief
      g.updateMatrix(); const eg = earGeo(s).clone().applyMatrix4(g.matrix); head.remove(g); head.add(Object.assign(new THREE.Mesh(eg, headMat(F, false, true)), { castShadow: false })); }
    // eyes: their own layered decal, a skin of the head's front-facing triangles around the sockets (so they bend with the head surface and foreshorten
    // naturally; the far eye is hidden by real depth / the nose). Layers, all painted from the upscaled sheet front view: the eye as drawn (lashes, lid lines,
    // whites) / a separate iris + pupil + highlight that darts inside the eye opening / blink lids (skin from the face atlas + closed lash line) on top.
    { const nh = hgeo.toNonIndexed(), P3 = nh.attributes.position, N3 = nh.attributes.normal, pos = [], uv = [], nrm = [], K = HD.K;
      for (let t = 0; t < P3.count; t += 3) { let ok = true, inb = false; for (let q = 0; q < 3; q++) { const xq = P3.getX(t + q) / K, yq = -(P3.getY(t + q) + 0.03) / K; if (N3.getZ(t + q) < -0.3 || P3.getZ(t + q) < 0.0) ok = false; if (Math.abs(xq) < 54 && yq > -26 && yq < 18) inb = true; } if (!ok || !inb) continue;
        for (let q = 0; q < 3; q++) { const x = P3.getX(t + q), y = P3.getY(t + q), z = P3.getZ(t + q), o = 0.00035; pos.push(x + N3.getX(t + q) * o, y + N3.getY(t + q) * o, z + N3.getZ(t + q) * o); nrm.push(N3.getX(t + q), N3.getY(t + q), N3.getZ(t + q)); uv.push((x / K + 56) / 112, 1 - (-(y + 0.03) / K + 28) / 48); } }
      const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); dg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); dg.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
      const uL = { value: lidTex(F, 0) }, uD = { value: new THREE.Vector2(0, 0) }, uC = { value: 0 }, sx = F ? 'f' : 'm';
      const dm = new THREE.MeshLambertMaterial({ color: new THREE.Color(...SKTINT), map: eyeTex(sx, 'a'), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
      dm.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, { uK: { value: K }, mapB: { value: eyeTex(sx, 'b') }, mapM: { value: eyeTex(sx, 'm') }, mapL: uL, mapH: { value: headAtlas(F) }, uD, uC });
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP; varying vec3 vON;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = position; vON = normal;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP; varying vec3 vON; uniform float uK; uniform sampler2D mapB; uniform sampler2D mapM; uniform sampler2D mapL; uniform sampler2D mapH; uniform vec2 uD; uniform float uC;\n')
          .replace('#include <map_fragment>', ['float xq = vOP.x / uK, yq = -(vOP.y + 0.03) / uK; vec2 eu = vec2((xq + 56.0) / 112.0, 1.0 - (yq + 28.0) / 48.0);',
            'vec4 ea = texture2D(map, eu); vec4 eb = texture2D(mapB, eu - vec2(uD.x / 112.0, -uD.y / 48.0)); vec4 em = texture2D(mapM, eu); float ia = eb.a * em.g;',
            'vec3 c = mix(ea.rgb, eb.rgb, ia); float A = max(ea.a, ia) * (1.0 - uC);', // fully closed: only the lid (skin + lash line) over the face skin
            'vec4 lt = texture2D(mapL, vec2((64.0 + xq) / 128.0, 1.0 - (60.0 + yq) / 116.0)); vec3 sk = texture2D(mapH, vec2(clamp(4.0 * (64.0 + xq) / 1024.0, 0.002, 0.498), 1.0 - 4.0 * (60.0 + yq) / 1024.0)).rgb;',
            'float Ao = lt.a + A * (1.0 - lt.a); c = (sk * lt.rgb * lt.a + c * A * (1.0 - lt.a)) / max(Ao, 1e-4); A = Ao; float hr = em.r * uC * ea.a; c = mix(c, ea.rgb, hr); A = max(A, hr); diffuseColor.rgb *= c; diffuseColor.a *= A;'].join('\n'))
          .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + TONE2('1.0', SKMASK) + '0.2;'); }; dm.customProgramCacheKey = () => 'eyedecal1';
      const dec = new THREE.Mesh(dg, dm); dec.renderOrder = 1; head.add(dec); built.face = { m: dm, mesh: dec, key: -1, F, uL, uD, uC }; }
    // ---- hair: a cap plus layered, tapered clumps (fringe, side locks, back) ----
    // back-of-head hair cap: the head surface behind the ears pushed out a little, in hair, down to the nape hairline, so no projected skin or gaps show between the locks
    { const g = hgeo, P = g.attributes.position, N = g.attributes.normal, I = g.index.array, pos = [], idx = [], map = new Map(), yH = F ? -0.1 : -0.075;
      const ok = (i) => { const y = P.getY(i), nz = N.getZ(i), nx = Math.abs(N.getX(i)); return y > yH + 0.02 * nx && (nz < -0.12 || (nz < 0.25 && y > -0.01 && nx > 0.6)); };
      const vi = (i) => { if (!map.has(i)) { const y = P.getY(i), d = 0.0045 + 0.003 * ss(yH, yH + 0.05, y); map.set(i, pos.length / 3); pos.push(P.getX(i) + N.getX(i) * d, y + N.getY(i) * d, P.getZ(i) + N.getZ(i) * d); } return map.get(i); };
      for (let t = 0; t < I.length; t += 3) if (ok(I[t]) && ok(I[t + 1]) && ok(I[t + 2])) idx.push(vi(I[t]), vi(I[t + 1]), vi(I[t + 2]));
      const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); cg.setIndex(idx); cg.computeVertexNormals(); part(head, cg, M.hair, null, null, null, { ink: false }); }
    const lock = (pts, r0, o = {}) => { const cur = new THREE.CatmullRomCurve3(pts.map((p) => V(...p))), ts = 16, rs = 9, g = new THREE.TubeGeometry(cur, ts, r0, rs, false), Pp = g.attributes.position, c = V(0, 0, 0), v = V(0, 0, 0), n = V(0, 0, 0);
      for (let i = 0; i < Pp.count; i++) { const t = Math.floor(i / (rs + 1)) / ts; cur.getPointAt(t, c); v.set(Pp.getX(i), Pp.getY(i), Pp.getZ(i)).sub(c); n.copy(c).sub(HAIRC).normalize(); v.addScaledVector(n, -v.dot(n) * (o.flat ?? 0.66)); v.multiplyScalar(Math.pow(1 - t, o.tp ?? 0.8) * (1 + (o.bulge ?? 0.5) * Math.sin(Math.PI * Math.pow(t, 0.8))) + 0.03); Pp.setXYZ(i, c.x + v.x, c.y + v.y, c.z + v.z); }
      g.computeVertexNormals(); return part(o.parent || head, g, o.mat || M.hairL, null, null, null, { ink: o.ink }); };
    const HAIRC = V(0, -0.01, -0.01);
    if (!F) { const rp = prng(5);
      // flyaways out past the brim line at the temples
      for (const s of [-1, 1]) for (let k = 0; k < 2; k++) lock([[s * 0.125, 0.05 - k * 0.02, 0.03 - k * 0.04], [s * 0.15, 0.04 - k * 0.02, 0.035 - k * 0.04], [s * 0.168, 0.05 - k * 0.025, 0.038 - k * 0.04]], 0.007, { tp: 1.2 });
      // side volume under the brim: wide, flattened dark clumps at the temples, above the ears and behind them (the sheet's hair flares out beside the face)
      for (const s of [-1, 1]) for (const [z, ty, r, ox] of [[0.045, 0.006, 0.02, 0.0], [0.026, -0.014, 0.02, 0.006], [0.012, -0.014, 0.026, 0.01], [-0.088, -0.088, 0.026, 0.006], [-0.114, -0.08, 0.028, 0.0]]) lock([[s * 0.098, 0.07, z], [s * (0.128 + ox), 0.015, z - 0.004], [s * (0.124 + ox), ty, z - 0.008]], r, { tp: 1.3, flat: 0.8, bulge: 0.65 });
      // nape: a ring of thick pointed locks
      for (let i = 0; i < 7; i++) { const a = -0.9 + i * 0.3, fl = 0.015 + rp() * 0.02; lock([[Math.sin(a) * 0.1, 0.07, -Math.cos(a) * 0.1], [Math.sin(a) * 0.137, 0.0, -Math.cos(a) * 0.137], [Math.sin(a) * (0.14 + fl), -0.065 - rp() * 0.03, -Math.cos(a) * (0.14 + fl)]], 0.032, { tp: 1.1, flat: 0.75 }); } }
    else {
      for (const s of [-1, 1]) {
        // the sheet's thick, wide locks down both cheeks to the chin (in front of the ear), with a second layer behind for thickness
        lock([[s * 0.094, 0.075, 0.03], [s * 0.114, 0.0, 0.012], [s * 0.11, -0.075, 0.01], [s * 0.094, -0.134, 0.012]], 0.032, { tp: 1.0, flat: 0.45, bulge: 0.35 });
        lock([[s * 0.1, 0.075, -0.004], [s * 0.124, -0.005, -0.006], [s * 0.12, -0.07, -0.006], [s * 0.106, -0.115, -0.004]], 0.022, { tp: 1.05, flat: 0.85, bulge: 0.35 });
        // hair behind the ear and the side mass toward the back
        lock([[s * 0.104, 0.07, -0.078], [s * 0.134, -0.01, -0.082], [s * 0.126, -0.09, -0.088]], 0.028, { tp: 0.8, flat: 0.72 });
        lock([[s * 0.094, 0.075, -0.105], [s * 0.118, -0.01, -0.108], [s * 0.112, -0.09, -0.11], [s * 0.098, -0.14, -0.104]], 0.028, { tp: 0.95, flat: 0.72 }); }
      for (let i = 0; i < 5; i++) { const a = -0.8 + i * 0.4; lock([[Math.sin(a) * 0.11, 0.07, -Math.cos(a) * 0.11], [Math.sin(a) * 0.12, 0.0, -Math.cos(a) * 0.136], [Math.sin(a) * 0.025, -0.045, -0.13]], 0.03, { tp: 0.35, flat: 0.4 }); } }
    // braid (female): a thick chain of crossed links hanging from the back of the head, over the pack
    built.braid = []; if (F) { let par = bone('braid0', head, 0, -0.045, -0.128); part(par, ell(0.034, 0.03, 0.03), M.hair);
      for (let i = 0; i < 11; i++) { const ln = bone('braid' + (i + 1), par, 0, i ? -0.048 : 0, 0); const w = 0.038 * (1 - i * 0.045); for (const s of [-1, 1]) part(ln, ell(w, 0.034, w * 0.82), M.hair, [s * w * 0.38, -0.024, 0], [0, 0, s * 0.5]); built.braid.push({ b: ln, rx: i ? (i < 5 ? -0.035 : -0.13) : 1.1, ax: 0, az: 0, vx: 0, vz: 0 }); ln.rotation.x = i ? (i < 5 ? -0.035 : -0.13) : 1.1; par = ln; }
      const tip = bone('braidTip', par, 0, -0.054, 0); part(tip, cyl(0.014, 0.018, 0.022), M.belt, [0, 0.01, 0]); for (let k = 0; k < 5; k++) { const g = new THREE.ConeGeometry(0.012, 0.06, 6); g.translate(0, -0.03, 0); const m = part(tip, g, M.hair); m.rotation.set(0.05 * k, 0, (k - 2) * 0.2); } }
    // ---- helmet, rebuilt from the sheet's front / side / back views: tall round dome with a raised front-to-back ridge, a junction bead, a rolled brim that droops toward the back,
    //      a stitched leather band with a side buckle, back buckle + tab, side clips and rivets, a gunmetal headlamp on a mount plate, and a pair of smoked goggles ----
    { const HL = F ? { y: 0.05, z: -0.022, rx: -0.3, r0: 0.148, ds: 1.04, bw: 0.02, bwb: 0.03, droop: 0.02, lampT: -0.5, gog: [0.1, 0.7], gs: 1.42, ls: 1.05, gy: -0.017, bf: 0.068, bb: 0.03, buck: 0.95 }
        : { y: 0.042, z: -0.018, rx: -0.24, r0: 0.15, ds: 1.02, bw: 0.024, bwb: 0.034, droop: 0.018, lampT: 0, gog: [-0.47, 0.47], gs: 1.4, ls: 1.2, gy: -0.008, bf: 0.056, bb: 0.03, buck: 1.12 };
      const hg = new THREE.Group(); hg.position.set(0, HL.y, HL.z); hg.rotation.x = HL.rx; head.add(hg); built.helmet = hg; built.helmetCfg = HL;
      const ZS = 1.05, rd = (y) => HL.r0 * Math.sqrt(Math.max(0, 1 - (y / (HL.r0 * HL.ds)) ** 2)), slope = (y) => Math.atan2(HL.r0 * HL.r0 * y / (HL.r0 * HL.ds) ** 2, Math.max(1e-4, rd(y)));
      const onDome = (th, y, off = 0) => { const r = rd(y) + off; return [Math.sin(th) * r, y, Math.cos(th) * r * ZS]; };
      const HM = toon(0, wornTex(P.helmet, F ? 31 : 21)), MET = toon(0x4a4743), MET2 = toon(0x6b655c), LEA = toon(0, fabric(F ? 0x463527 : 0x3e2c20, { seed: 41, weave: 0.025, mottle: 0.04 }));
      // generic swept ring: closed cross-section prof(th) = [[r, y], ...] swept around the helmet axis
      const sweep = (prof, n = 64, rev) => { const pos = [], uv = [], idx = []; let K = 0; for (let i = 0; i <= n; i++) { const th = i / n * TAU, pr = prof(th); K = pr.length; for (let k = 0; k < K; k++) { const [r, y] = pr[k]; pos.push(Math.sin(th) * r, y, Math.cos(th) * r * ZS); uv.push(i / n * 6, k / (K - 1)); } }
        for (let i = 0; i < n; i++) for (let k = 0; k < K - 1; k++) { const a = i * K + k, b = a + K; if (rev) idx.push(a, b, a + 1, b, b + 1, a + 1); else idx.push(a, a + 1, b, b, a + 1, b + 1); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g; };
      // dome
      part(hg, new THREE.SphereGeometry(HL.r0, 48, 22, 0, TAU, 0, Math.PI / 2), HM, null, null, [1, HL.ds, ZS]);
      // raised ridge (comb) over the crown, front base to back base, with bevelled edges
      { const pos = [], idx = [], N = 40, X = [-0.019, -0.015, 0.015, 0.019], Hh = [0.0, 0.0065, 0.0065, 0.0]; for (let i = 0; i <= N; i++) { const a = i / N * Math.PI, ny = Math.sin(a) / HL.ds, nz = Math.cos(a) / ZS, nl = Math.hypot(ny, nz);
          for (let k = 0; k < 4; k++) { const bx = X[k], by = HL.r0 * HL.ds * Math.sin(a) * Math.sqrt(Math.max(0, 1 - (bx / HL.r0) ** 2)), bz = HL.r0 * ZS * Math.cos(a) * Math.sqrt(Math.max(0, 1 - (bx / HL.r0) ** 2)), h = Hh[k] + 0.001; pos.push(bx, by + ny / nl * h, bz + nz / nl * h); } }
        for (let i = 0; i < N; i++) for (let k = 0; k < 3; k++) { const a = i * 4 + k, b = a + 4; idx.push(a, a + 1, b, b, a + 1, b + 1); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); part(hg, g, HM); }
      // junction bead and the brim (wider and lower at the back), with a rolled lip
      part(hg, sweep(() => { const o = []; for (let k = 0; k <= 8; k++) { const a = k / 8 * TAU; o.push([HL.r0 + 0.002 + Math.cos(a) * 0.004, 0.002 + Math.sin(a) * 0.004]); } return o; }, 72), HM, null, null, null, { ink: false });
      part(hg, sweep((th) => { const u = (1 - Math.cos(th)) / 2, w = lerp(HL.bw, HL.bwb, u), d = HL.droop * (0.55 + 0.45 * u), r0 = HL.r0 - 0.002;
        return [[r0, 0.003], [r0 + w * 0.45, -d * 0.25], [r0 + w * 0.85, -d * 0.72], [r0 + w + 0.003, -d - 0.001], [r0 + w + 0.005, -d - 0.006], [r0 + w + 0.001, -d - 0.01], [r0 + w * 0.8, -d * 0.72 - 0.007], [r0 + w * 0.4, -d * 0.25 - 0.006], [r0, -0.004], [r0, 0.003]]; }, 80), HM);
      // leather band hugging the dome
      const BH = 0.034, bandY = (th) => lerp(HL.bf, HL.bb, (1 - Math.cos(th)) / 2) + 0.006 * Math.sin(th) * 0; part(hg, sweep((th) => { const b0 = bandY(th) - BH / 2, b1 = b0 + BH; return [[rd(b0) + 0.0045, b0], [rd((b0 + b1) / 2) + 0.005, (b0 + b1) / 2], [rd(b1) + 0.0045, b1], [rd(b1) - 0.003, b1], [rd(b0) - 0.003, b0], [rd(b0) + 0.0045, b0]]; }, 72, true), LEA);
      const atBand = (th, y0, off, grp) => { const y = y0 == null ? bandY(th) : y0; return atBand0(th, y, off, grp); }, atBand0 = (th, y, off, grp) => { const g = grp || new THREE.Group(); g.position.set(...onDome(th, y, off)); g.rotation.set(0, th, 0); const t = new THREE.Group(); t.rotation.x = -slope(y); g.add(t); hg.add(g); return t; };
      // buckles: a rectangular frame with a prong and a keeper loop (one on the side, one at the back with a hanging tab)
      const buckle = (th, s = 1) => { const t = atBand(th, null, 0.006); for (const [w, h, x, y] of [[0.026 * s, 0.004, 0, 0.016 * s], [0.026 * s, 0.004, 0, -0.016 * s], [0.004, 0.036 * s, -0.012 * s, 0], [0.004, 0.036 * s, 0.012 * s, 0]]) part(t, new THREE.BoxGeometry(w, h, 0.004), MET2, [x, y, 0.002], null, null, { ink: false });
        part(t, new THREE.BoxGeometry(0.003, 0.03 * s, 0.003), MET2, [0.002, 0, 0.003], null, null, { ink: false }); part(t, new THREE.BoxGeometry(0.008, 0.04 * s, 0.006), LEA, [0.018 * s, 0, 0.0], null, null, { ink: false }); return t; };
      buckle(HL.buck); { const t = buckle(Math.PI, 1.05); part(t, rbox(0.026, 0.03, 0.006, 0.002), LEA, [0, -0.03, -0.004], [0.2, 0, 0]); part(t, new THREE.BoxGeometry(0.02, 0.004, 0.005), MET2, [0, -0.04, -0.001], [0.2, 0, 0], null, { ink: false }); }
      // side clips (box brackets where the goggle strap is anchored) with rivets
      for (const s of [-1, 1]) { const t = atBand(s * 1.92, null, 0.007); part(t, rbox(0.02, 0.04, 0.01, 0.002), MET, [0, 0, 0]); for (const yy of [-0.012, 0.012]) part(t, ell(0.0032, 0.0032, 0.002, 8, 6), MET2, [0, yy, 0.0055], null, null, { ink: false }); }
      // rivets around the band (skipping the lamp / goggles / buckles) and a pair on the dome side
      for (let k = 0; k < 18; k++) { const th = k / 18 * TAU; const dd = (a) => Math.abs(Math.atan2(Math.sin(th - a), Math.cos(th - a))); if (dd(HL.lampT) < 0.35 || HL.gog.some((g) => dd(g) < 0.3) || dd(HL.buck) < 0.25 || dd(Math.PI) < 0.25 || dd(1.92) < 0.2 || dd(-1.92) < 0.2) continue;
        const t = atBand(th, null, 0.0055); part(t, ell(0.0034, 0.0034, 0.0022, 8, 6), toon(P.brass), [0, 0, 0], null, null, { ink: false }); }
      for (const [th, y] of F ? [[1.25, 0.085], [1.4, 0.07]] : [[1.3, 0.09]]) { const t = atBand(th, y, 0.0005); part(t, ell(0.0045, 0.0045, 0.002, 10, 6), MET, [0, 0, 0], null, null, { ink: false }); }
      // headlamp: mount plate, gunmetal housing, front bezel, bright lens, back cap and side knob
      { const t = atBand(HL.lampT, null, 0.004); part(t, rbox(0.036, 0.034, 0.008, 0.003), MET, [0, 0, 0.002]); const L = new THREE.Group(); L.position.set(0, 0.002, 0.006); L.scale.setScalar(HL.ls); L.rotation.x = -0.12 + slope(bandY(HL.lampT)); t.add(L);
        part(L, cyl(0.024, 0.029, 0.048, 20), MET, [0, 0, 0.026], [Math.PI / 2, 0, 0]); part(L, new THREE.TorusGeometry(0.028, 0.0055, 8, 22), MET2, [0, 0, 0.05]); part(L, cyl(0.02, 0.024, 0.006, 16), MET, [0, 0, 0.0], [Math.PI / 2, 0, 0], null, { ink: false });
        part(L, ell(0.005, 0.007, 0.006, 8, 6), MET2, [0.026, 0, 0.022], null, null, { ink: false });
        built.lampLens = new THREE.MeshBasicMaterial({ color: 0xfff6d8 }); const lens = new THREE.Mesh(new THREE.CircleGeometry(0.0235, 20), built.lampLens); lens.position.z = 0.0505; L.add(lens);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: radial('rgba(255,248,215,1)', 'rgba(255,220,150,.35)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); glow.position.z = 0.062; glow.scale.set(0.075, 0.075, 1); L.add(glow); built.lampGlow = glow; }
      // goggles: two round lenses in thick dark rims on the band, smoked glass with a highlight, joined by a short bridge
      const GL = new THREE.MeshBasicMaterial({ color: 0x131518 }), GH = new THREE.MeshBasicMaterial({ color: 0x6f757c, transparent: true, opacity: 0.45 });
      for (const th of HL.gog) { const t = atBand(th, null, 0.005); const G = new THREE.Group(); G.scale.setScalar(HL.gs); G.position.y = HL.gy; G.rotation.x = slope(bandY(th)) * 0.6 - 0.15; t.add(G);
        part(G, cyl(0.022, 0.021, 0.016, 20), MET, [0, 0, 0.008], [Math.PI / 2, 0, 0]); part(G, new THREE.TorusGeometry(0.0205, 0.0042, 8, 22), MET, [0, 0, 0.0165]);
        const ln = new THREE.Mesh(new THREE.CircleGeometry(0.0175, 20), GL); ln.position.z = 0.0168; G.add(ln); const hl = new THREE.Mesh(new THREE.CircleGeometry(0.0052, 10), GH); hl.position.set(-0.006, 0.006, 0.0172); hl.scale.set(1, 0.6, 1); hl.rotation.z = 0.6; G.add(hl); }
      { const [a, b] = HL.gog, mid = (a + b) / 2, t = atBand(mid, null, 0.004); part(t, new THREE.BoxGeometry(Math.abs(b - a) * rd(bandY(mid)) * 0.5, 0.008, 0.006), MET, [0, 0, 0], null, null, { ink: false }); } }
    // ---- neck, torso (skinned: hips > spine > chest > neck) ----
    part(B.neck, cyl(0.039, 0.034, 0.13, 14), skinMat(F, 0.08, 1.028), [0, 0.05, 0.006]); // the neck faces the key light more squarely than the jaw: a smaller lit share keeps the jaw/neck tone continuous
    const TOR = [[B.hips], [B.spine, HY + 0.1, 0.06], [B.chest, HY + 0.26, 0.07], [B.neck, HY + 0.395, 0.03]], fw = F ? 0.96 : 1;
    shell(skins, [[HY - 0.03, 0.118 * fw, 0.086], [HY + 0.06, 0.119 * fw, 0.087], [HY + 0.15, 0.121 * fw, 0.088], [HY + 0.24, 0.128 * fw, 0.092], [HY + 0.31, 0.136 * fw, 0.098], [HY + 0.35, 0.138 * fw, 0.099], [HY + 0.385, 0.115, 0.088], [HY + 0.41, 0.07, 0.06], [HY + 0.43, 0.043, 0.041], [HY + 0.445, 0.04, 0.038]], TOR, M.shirt, { cz: 0.005 });
    if (!F) for (const [y, z] of [[0.08, 0.103], [0.025, 0.099], [-0.03, 0.094], [-0.085, 0.091]]) part(B.chest, ell(0.006, 0.006, 0.004, 8, 6), M.dark, [0, y, z + 0.004], null, null, { ink: false });
    // jacket: open front (wider at the hem), soft hem flare
    const JK = F ? [[HY - 0.085, 0.176, 0.142, 0, 0, 1.08], [HY - 0.045, 0.163, 0.131, 0, 0, 0.92], [HY - 0.0, 0.157, 0.125, 0, 0, 0.84], [HY + 0.07, 0.15, 0.119, 0, 0, 0.72], [HY + 0.16, 0.144, 0.112, 0, 0, 0.62], [HY + 0.26, 0.142, 0.11, 0, 0, 0.56], [HY + 0.32, 0.152, 0.116, 0, 0, 0.56], [HY + 0.36, 0.158, 0.12, 0, 0, 0.6], [HY + 0.4, 0.137, 0.106, 0, 0, 0.74], [HY + 0.425, 0.092, 0.076, 0, 0, 0.9]]
      : [[HY - 0.095, 0.17, 0.138, 0, 0, 1.32], [HY - 0.035, 0.157, 0.127, 0, 0, 1.2], [HY + 0.05, 0.147, 0.116, 0, 0, 1.0], [HY + 0.15, 0.139, 0.108, 0, 0, 0.86], [HY + 0.25, 0.138, 0.106, 0, 0, 0.76], [HY + 0.32, 0.149, 0.113, 0, 0, 0.72], [HY + 0.36, 0.156, 0.118, 0, 0, 0.78], [HY + 0.4, 0.135, 0.104, 0, 0, 0.95], [HY + 0.425, 0.09, 0.074, 0, 0, 1.1]];
    shell(skins, JK, TOR.slice(0, 3), M.jacket, { seg: 26, ink: false });
    { for (const s of [-1, 1]) { const pts = JK.map((r) => { const ang = s * (r[5] / 2); return [Math.sin(ang) * r[1], r[0], Math.cos(ang) * r[2]]; }); const g = tube(pts, 0.009, 6, 24); const pos = g.attributes.position, si = [], sw = [];
      for (let i = 0; i < pos.count; i++) { const y = pos.getY(i), w = [1, 0, 0, 0]; for (const [b, yj] of [[1, HY + 0.1], [2, HY + 0.26]]) { const t = ss(yj - 0.06, yj + 0.06, y); for (let q = 0; q < b; q++) w[q] *= 1 - t; w[b] = t; } si.push(0, 1, 2, 3); sw.push(...w); }
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4)); const m = new THREE.SkinnedMesh(g, M.jacket); m.castShadow = true; m.frustumCulled = false; skins.push({ m, bones: [B.hips, B.spine, B.chest, B.chest], ink: true }); } }
    // hem and front-edge piping in the jacket's own colour (rolled edge, no dark planks)
    { const h = JK[0], a0 = h[5] / 2; part(B.hips, new THREE.TorusGeometry(1, 0.017 / h[1], 7, 40, TAU - h[5]), M.jacket, [0, h[0] - HY, 0], [Math.PI / 2, 0, Math.PI / 2 + a0], [h[1], h[2], h[1]]); }
    if (!F) { for (const s of [-1, 1]) { part(B.chest, rbox(0.05, 0.13, 0.012, 0.005), M.jacket, [s * 0.072, 0.075, 0.112], [-0.2, s * 0.38, s * 0.36]); part(B.chest, rbox(0.034, 0.03, 0.012, 0.004), M.jacketDk, [s * 0.098, 0.13, 0.098], [-0.3, s * 0.5, s * -0.5]); }
      part(B.chest, new THREE.TorusGeometry(0.08, 0.022, 8, 24, TAU - 0.9), M.jacket, [0, 0.16, -0.004], [Math.PI / 2 + 0.3, 0, Math.PI / 2 + 0.45], [1.05, 0.9, 1]); }
    else { part(B.chest, new THREE.TorusGeometry(0.094, 0.027, 10, 28), M.jacket, [0, 0.152, -0.024], [Math.PI / 2 + 0.3, 0, 0], [1.1, 0.86, 1]); for (const s of [-1, 1]) part(B.chest, ell(0.05, 0.06, 0.05), M.jacket, [s * 0.1, 0.16, 0.0], [0.2, 0, s * 0.4]);
      part(B.chest, new THREE.SphereGeometry(1, 22, 14, 0, TAU, 0, Math.PI * 0.55), M.jacket, [0, 0.158, -0.07], [-1.75, 0, 0], [0.112, 0.058, 0.05]); part(B.chest, new THREE.TorusGeometry(0.052, 0.009, 6, 20, Math.PI), M.jacketDk, [0, 0.176, -0.088], [0.35, 0, 0], [1.25, 0.8, 1]); }
    for (const s of F ? [-1, 1] : [1]) { const x = s * (F ? 0.082 : 0.085), y = F ? 0.0 : 0.02; part(B.chest, rbox(0.058, 0.064, 0.014, 0.006), M.jacket, [x, y, 0.118], [-0.12, s * 0.3, 0]); part(B.chest, rbox(0.064, 0.026, 0.018, 0.006), M.jacketDk, [x, y + 0.034, 0.121], [-0.05, s * 0.3, 0]); part(B.chest, rbox(0.01, 0.01, 0.006, 0.002), M.brass, [x, y + 0.028, 0.131], null, null, { ink: false }); }
    // pockets with flaps (on the spine so they ride the lower jacket)
    for (const s of [-1, 1]) { const y = F ? -0.075 : -0.05, z = F ? 0.1 : 0.094; part(B.spine, rbox(0.078, 0.075, 0.016, 0.008), M.jacket, [s * 0.097, y, z], [0, s * 0.62, 0]); part(B.spine, rbox(0.084, 0.028, 0.02, 0.008), M.jacketDk, [s * 0.099, y + 0.035, z + 0.004], [0.08, s * 0.62, 0]); }
    // ---- belt, buckle, pouches, rope ----
    part(B.hips, new THREE.TorusGeometry(0.127, 0.02, 8, 36), M.belt, [0, 0.085, 0.002], [Math.PI / 2, 0, 0], [1, 0.76, 1.3]);
    part(B.hips, rbox(0.05, 0.04, 0.012, 0.004), M.brass, [0, 0.085, 0.1]); part(B.hips, rbox(0.03, 0.022, 0.014, 0.003), M.belt, [0, 0.085, 0.103]);
    for (const [px0, pz0, ry0] of F ? [[-0.075, 0.112, -0.38], [0.075, 0.112, 0.38]] : [[-0.07, 0.114, -0.36], [-0.122, 0.085, -0.85]]) { const pz = part(B.hips, rbox(0.052, 0.066, 0.034, 0.01), M.belt, [px0, 0.05, pz0], [0, ry0, 0]); part(pz, rbox(0.055, 0.026, 0.038, 0.008), M.packDk, [0, 0.026, 0.002]); part(pz, rbox(0.012, 0.012, 0.006, 0.002), M.brass, [0, 0.018, 0.022], null, null, { ink: false }); }
    // ---- pelvis, legs (skinned: hips > thigh > shin > foot) ----
    part(B.hips, lathe([[0.0, -0.11], [0.11, -0.1], [0.126, -0.05], [0.128, 0.03], [0.125, 0.1], [0.0, 0.1]], 28), M.pants, null, null, [1, 1, 0.78]);
    for (const [s, k] of [[-1, 'R'], [1, 'L']]) { const th = B['th' + k], sn = B['sn' + k], ft = B['ft' + k], yh = HY - 0.045, yk = yh - LT, ya = yk - LS, cx = s * 0.082;
      if (F) { shell(skins, [[yh + 0.07, 0.075, 0.075], [yh + 0.02, 0.086, 0.084], [yh - 0.08, 0.087, 0.085], [yh - 0.15, 0.089, 0.087], [yh - 0.175, 0.092, 0.09]], [[B.hips], [th, yh, 0.06]], M.pants, { cx, seg: 18 });
        part(th, new THREE.TorusGeometry(0.09, 0.011, 6, 22), M.pants, [0, -0.172, 0], [Math.PI / 2, 0, 0]);
        shell(skins, [[yh - 0.1, 0.062, 0.062], [yh - 0.17, 0.056, 0.057], [yh - 0.25, 0.049, 0.05], [yk + 0.02, 0.045, 0.046], [yk - 0.03, 0.043, 0.045], [yk - 0.1, 0.043, 0.046], [yk - 0.17, 0.037, 0.039], [ya + 0.1, 0.032, 0.033]], [[th], [sn, yk, 0.05]], M.skin, { cx, seg: 16 });
        const st = -0.06, sb = -LS + 0.12; part(sn, cyl(0.042, 0.047, st - sb, 16), M.sock, [0, (st + sb) / 2, 0]); part(sn, new THREE.TorusGeometry(0.047, 0.013, 6, 18), M.sock, [0, st, 0], [Math.PI / 2, 0, 0]);
        part(sn, cyl(0.057, 0.061, 0.17, 18), M.bootLace, [0, -LS + 0.085, 0]); part(sn, new THREE.TorusGeometry(0.06, 0.011, 6, 20), M.boot, [0, -LS + 0.17, 0], [Math.PI / 2, 0, 0]); }
      else { shell(skins, [[yh + 0.07, 0.07, 0.07], [yh + 0.02, 0.083, 0.082], [yh - 0.08, 0.083, 0.081], [yh - 0.2, 0.078, 0.076], [yk + 0.06, 0.072, 0.071], [yk, 0.071, 0.074], [yk - 0.08, 0.068, 0.069], [yk - 0.12, 0.068, 0.067], [ya + 0.27, 0.073, 0.073], [ya + 0.215, 0.075, 0.075], [ya + 0.19, 0.068, 0.068]], [[B.hips], [th, yh, 0.06], [sn, yk, 0.06]], M.pants, { cx, seg: 18 });
        part(th, rbox(0.03, 0.095, 0.08, 0.012), M.pants, [s * 0.082, -0.2, 0.0]); part(th, rbox(0.034, 0.03, 0.085, 0.01), M.pants, [s * 0.085, -0.155, 0.0]); part(th, rbox(0.006, 0.012, 0.012, 0.002), M.brass, [s * 0.103, -0.155, 0.0], null, null, { ink: false });
        part(sn, ell(0.07, 0.06, 0.07, 16, 12), M.pants, [0, 0.0, 0.002]); part(sn, rbox(0.086, 0.09, 0.014, 0.008), M.patch, [0, -0.02, 0.075], [-0.06, 0, 0], [1, 1, 1]);
        part(sn, cyl(0.064, 0.067, 0.22, 18), M.bootLace, [0, -LS + 0.11, 0.004]); part(sn, new THREE.TorusGeometry(0.067, 0.013, 6, 20), M.boot, [0, -LS + 0.215, 0.004], [Math.PI / 2, 0, 0]); }
      { const bg = bootGeo(F); part(ft, bg.up, M.boot, [0, 0.008, 0]); part(ft, bg.sole, M.bootDk, [0, 0.008, 0]); } }
    // ---- arms (skinned: shoulder > upper arm > forearm > hand) ----
    for (const [s, k] of [[-1, 'R'], [1, 'L']]) { const sh = B['sh' + k], ua = B['ua' + k], fa = B['fa' + k], hd = B['hd' + k], ys = HY + 0.345, cx = s * 0.15, cz = -0.005, AC = [[sh], [ua, ys, 0.05], [fa, ys - 0.245, 0.045], [hd, ys - 0.46, 0.02]];
      if (!F) { shell(skins, [[ys + 0.062, 0.002, 0.002], [ys + 0.055, 0.03, 0.03], [ys + 0.04, 0.05, 0.05], [ys + 0.015, 0.062, 0.059], [ys - 0.04, 0.062, 0.058], [ys - 0.13, 0.055, 0.052], [ys - 0.2, 0.052, 0.05], [ys - 0.222, 0.057, 0.055], [ys - 0.242, 0.051, 0.049], [ys - 0.262, 0.056, 0.053], [ys - 0.285, 0.051, 0.049]], AC.slice(0, 3), M.jacket, { cx, cz, seg: 18 });
        shell(skins, [[ys - 0.25, 0.042, 0.04], [ys - 0.3, 0.041, 0.039], [ys - 0.37, 0.036, 0.034], [ys - 0.43, 0.031, 0.029]], AC.slice(1, 3), M.skin, { cx, cz, seg: 16 });
        part(fa, new THREE.TorusGeometry(0.05, 0.02, 8, 22), M.jacket, [0, -0.04, 0], [Math.PI / 2, 0, 0]); part(fa, new THREE.TorusGeometry(0.046, 0.014, 8, 22), M.shirt, [0, -0.063, 0], [Math.PI / 2, 0, 0]);
        part(fa, cyl(0.04, 0.046, 0.09, 16), M.glove, [0, -0.17, 0]); part(fa, new THREE.TorusGeometry(0.045, 0.006, 6, 18), M.belt, [0, -0.15, 0], [Math.PI / 2, 0, 0]); }
      else { shell(skins, [[ys + 0.062, 0.002, 0.002], [ys + 0.055, 0.03, 0.03], [ys + 0.04, 0.05, 0.05], [ys + 0.015, 0.063, 0.06], [ys - 0.04, 0.064, 0.06], [ys - 0.13, 0.057, 0.054], [ys - 0.2, 0.054, 0.051], [ys - 0.222, 0.059, 0.056], [ys - 0.242, 0.053, 0.05], [ys - 0.262, 0.058, 0.055], [ys - 0.29, 0.052, 0.05], [ys - 0.34, 0.05, 0.047], [ys - 0.41, 0.05, 0.047], [ys - 0.435, 0.055, 0.052]], AC, M.jacket, { cx, cz, seg: 18 });
        part(fa, new THREE.TorusGeometry(0.053, 0.012, 6, 20), M.jacket, [0, -0.19, 0], [Math.PI / 2, 0, 0]); part(fa, cyl(0.037, 0.042, 0.05, 16), M.glove, [0, -0.2, 0]); }
      part(fa, ell(0.05, 0.05, 0.048, 16, 12), M.jacket, [0, 0.004, -0.004]); // elbow cap: keeps the bent elbow round
      if (!F || s > 0) part(ua, rbox(0.056, 0.066, 0.012, 0.006), M.patch, [s * 0.061, -0.075, 0], [0, s * Math.PI / 2, 0]);
      // hand: mitten palm + glove over the first finger joints, bare finger tips, thumb (curl about x toward the palm, -z)
      part(hd, rbox(0.064, 0.064, 0.034, 0.015), M.glove, [0, -0.036, 0]);
      const kn = bone('knuckles' + k, hd, 0, -0.064, 0); part(kn, rbox(0.062, 0.03, 0.03, 0.013), M.glove, [0, -0.013, 0]);
      const tp = bone('tips' + k, kn, 0, -0.026, 0); for (let i = 0; i < 4; i++) part(tp, capsule(0.0075, i === (s < 0 ? 0 : 3) ? 0.007 : 0.011, 8), M.skin, [-0.0225 + i * 0.015, -0.009, 0], null, null, { ink: false });
      const th = bone('thumb' + k, hd, s * -0.031, -0.024, -0.01); th.rotation.set(0.3, 0, s * 0.6); part(th, capsule(0.0105, 0.018, 8), M.glove, [0, -0.012, 0], null, null, { ink: false }); part(th, capsule(0.0085, 0.01, 8), M.skin, [0, -0.031, 0], null, null, { ink: false });
      B['kn' + k] = kn; B['tp' + k] = tp; B['thumb' + k] = th; }
    // ---- backpack: big canvas rucksack (body, buckled top flap, outer pocket, side pockets, rope coil / bedroll / lantern) ----
    { const pk = new THREE.Group(); pk.position.set(0, -0.02, -0.125); B.chest.add(pk); built.pack = pk;
      const W = F ? 0.31 : 0.345, H = F ? 0.37 : 0.41, D = F ? 0.17 : 0.19, y0 = F ? -0.065 : -0.08, zc = -0.004 - D / 2, zb = zc - D / 2;
      part(pk, rbox(W, H, D, 0.05), M.pack, [0, y0, zc]);
      for (const s of [-1, 1]) part(pk, rbox(0.012, H * 0.94, D * 0.9, 0.005), M.packDk, [s * (W / 2 - 0.004), y0, zc], null, null, { ink: false });
      // top flap draped over the top and down the back, with two buckled straps
      part(pk, rbox(W * 1.02, 0.05, D * 1.06, 0.022), M.packDk, [0, y0 + H / 2 + 0.006, zc - 0.004]);
      part(pk, rbox(W * 0.96, H * 0.3, 0.026, 0.012), M.packDk, [0, y0 + H * 0.36, zb - 0.01], [0.06, 0, 0]);
      for (const s of [-1, 1]) { part(pk, rbox(0.028, H * 0.52, 0.01, 0.004), M.belt, [s * W * 0.24, y0 + H * 0.16, zb - 0.026]); part(pk, rbox(0.034, 0.026, 0.014, 0.004), M.brass, [s * W * 0.24, y0 + H * 0.2, zb - 0.032]); part(pk, rbox(0.016, 0.01, 0.016, 0.002), M.belt, [s * W * 0.24, y0 + H * 0.2, zb - 0.036], null, null, { ink: false }); }
      // outer pocket with its own flap and straps
      part(pk, rbox(W * 0.74, H * 0.36, 0.07, 0.024), M.pack, [0, y0 - H * 0.22, zb - 0.03]);
      part(pk, rbox(W * 0.78, H * 0.12, 0.08, 0.02), M.packDk, [0, y0 - H * 0.06, zb - 0.032], [0.1, 0, 0]);
      for (const s of [-1, 1]) { part(pk, rbox(0.024, H * 0.24, 0.008, 0.003), M.belt, [s * W * 0.2, y0 - H * 0.2, zb - 0.068]); part(pk, rbox(0.028, 0.022, 0.012, 0.003), M.brass, [s * W * 0.2, y0 - H * 0.12, zb - 0.072]); }
      // side pocket opposite the lantern was replaced by the Tether coil; the lantern side keeps its pocket
      for (const s of [1]) { part(pk, rbox(0.06, H * 0.42, D * 0.66, 0.02), M.pack, [s * (W / 2 + 0.024), y0 - H * 0.18, zc]); part(pk, rbox(0.068, H * 0.11, D * 0.7, 0.016), M.packDk, [s * (W / 2 + 0.026), y0 - H * 0.0, zc], [0, 0, s * -0.08]); part(pk, rbox(0.008, H * 0.2, 0.02, 0.003), M.belt, [s * (W / 2 + 0.056), y0 - H * 0.14, zc]); }
      // shoulder straps (wide, padded, buckled at the chest) and a sternum strap
      for (const s of [-1, 1]) { part(B.chest, tube([[s * 0.094, -0.1, 0.092], [s * 0.098, 0.0, 0.106], [s * 0.103, 0.1, 0.102], [s * 0.108, 0.158, 0.03], [s * 0.098, 0.14, -0.1], [s * 0.088, 0.07, -0.13]], 0.012, 6, 24), M.packDk, null, null, [1.25, 1, 0.62]);
        part(B.chest, rbox(0.032, 0.024, 0.012, 0.003), M.brass, [s * 0.096, -0.02, 0.105], null, null, { ink: false }); part(B.chest, tube([[s * 0.094, -0.1, 0.09], [s * 0.11, -0.2, 0.05], [s * 0.13, -0.25, -0.06]], 0.008, 5, 10), M.packDk, null, null, [1, 1, 0.7]); }
      if (F) part(B.chest, rbox(0.17, 0.016, 0.008, 0.003), M.packDk, [0, 0.05, 0.108]);
      if (!F) { // bedroll strapped under the pack
        const by = y0 - H / 2 - 0.045; part(pk, cyl(0.052, 0.052, W * 1.06, 22), M.packDk, [0, by, zc + 0.005], [0, 0, Math.PI / 2]); const sp = toon(0, spiralTex(P.packDk)); for (const s of [-1, 1]) part(pk, new THREE.CircleGeometry(0.051, 22), sp, [s * W * 0.531, by, zc + 0.005], [0, s * Math.PI / 2, 0], null, { ink: false });
        for (const s of [-1, 1]) part(pk, new THREE.TorusGeometry(0.054, 0.008, 6, 20), M.belt, [s * W * 0.3, by, zc + 0.005], [0, Math.PI / 2, 0]); }
      else { const ry = y0 - H / 2 - 0.055; part(pk, cyl(0.068, 0.068, W * 1.12, 22), M.packDk, [0, ry, zc - 0.005], [0, 0, Math.PI / 2]); const sp = toon(0, spiralTex(P.packDk)); for (const s of [-1, 1]) part(pk, new THREE.CircleGeometry(0.067, 22), sp, [s * W * 0.561, ry, zc - 0.005], [0, s * Math.PI / 2, 0], null, { ink: false });
        for (const s of [-1, 1]) part(pk, new THREE.TorusGeometry(0.07, 0.008, 6, 20), M.belt, [s * W * 0.3, ry, zc - 0.005], [0, Math.PI / 2, 0]); }
      { // the Tether coil hangs from a strap on the right side of the pack (where the side pocket was), coil plane flat against the pack side
        const pv = bone('ropePivot', pk, -(W / 2 + 0.052), y0 + H * 0.16, zc - 0.035); part(pk, rbox(0.024, 0.05, 0.022, 0.003), M.belt, [-(W / 2 + 0.018), y0 + H * 0.16, zc - 0.035], null, null, { ink: false }); part(pk, rbox(0.014, 0.014, 0.014, 0.003), M.brass, [-(W / 2 + 0.034), y0 + H * 0.16 - 0.02, zc - 0.035], null, null, { ink: false });
        built.rope = { b: pv, ax: 0, az: 0, vx: 0, vz: 0 }; built.tethers = []; const tg = { parent: pv, pos: [-0.004, -0.09, 0], rot: [0, -Math.PI / 2, 0.04], o: { R: 0.058, n: 5, dr: 0.003, tr: 0.0105, dz: 0.0065, sy: 1.75 } }; built.tethers.push(tg); mountTether(tg, S && S.tetherGrade); }
      { // ascender winch: clips to the back panel, upper right corner (above the Tether coil, outside the flap straps); shown while ascending
        const wn = new THREE.Group(); wn.position.set(-(W / 2 - 0.045), y0 + H * 0.36, zb - 0.05); pk.add(wn); built.winch = wn; const wm = toon(0x4a4e55), wb = toon(P.brass);
        part(wn, rbox(0.068, 0.054, 0.044, 0.008), wm); const dr = new THREE.Group(); dr.position.set(0, 0.032, -0.004); wn.add(dr); built.winchDrum = dr; part(dr, cyl(0.016, 0.016, 0.05, 12), toon(0x2c2f34), null, [0, 0, Math.PI / 2]); part(dr, rbox(0.052, 0.006, 0.01, 0.002), wb, [0, 0.014, 0], null, null, { ink: false });
        part(wn, rbox(0.014, 0.03, 0.012, 0.003), wb, [0.026, -0.03, 0.02], null, null, { ink: false }); part(wn, rbox(0.014, 0.03, 0.012, 0.003), wb, [-0.026, -0.03, 0.02], null, null, { ink: false }); wn.visible = false; }
      { // the lantern on its ring, swinging off the left side of the pack (same model and placement for both delvers)
        const pv = bone('lanternPivot', pk, W / 2 + 0.07, y0 + 0.01, zc + 0.03); built.lantern = { b: pv, ax: 0, az: 0, vx: 0, vz: 0 }; part(pv, new THREE.TorusGeometry(0.014, 0.003, 5, 12), M.dark, [0, -0.01, 0], [0, Math.PI / 2, 0]);
        const L = new THREE.Group(); L.position.y = -0.09; pv.add(L); part(L, new THREE.ConeGeometry(0.038, 0.035, 8), M.dark, [0, 0.055, 0]); part(L, cyl(0.036, 0.036, 0.016, 10), M.dark, [0, -0.05, 0]); part(L, cyl(0.03, 0.03, 0.01, 10), M.dark, [0, 0.035, 0]);
        for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + 0.4; part(L, cyl(0.003, 0.003, 0.085, 4), M.dark, [Math.cos(a) * 0.031, -0.005, Math.sin(a) * 0.031], null, null, { ink: false }); }
        built.lanternCore = new THREE.MeshBasicMaterial({ color: 0xffc46a }); const core = new THREE.Mesh(cyl(0.024, 0.024, 0.075, 12), built.lanternCore); core.position.y = -0.005; L.add(core);
        const lg = new THREE.Sprite(new THREE.SpriteMaterial({ map: radial('rgba(255,210,120,1)', 'rgba(255,150,60,.35)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); lg.scale.set(0.3, 0.3, 1); L.add(lg); built.lanternGlow = lg;
        const pl = new THREE.PointLight(0xffb060, 0.5, 0.9, 2); L.add(pl); built.lanternLight = pl; }
    }
    // ---- pickaxe: a logical mount on the chest (what the fidgets move) + the swappable visual pick parented to the right hand ----
    { const mt = new THREE.Object3D(); mt.name = 'pickMount'; B.chest.add(mt); built.mount = mt; built.pick = makePickaxe(S && S.pickGrade); B.hdR.add(built.pick); }
    // the back slot: a leather keeper on the pack's front edge that the stowed pick handle slides through (between the pack and the back)
    { const lp = SLOT_O.clone().addScaledVector(SLOT_D, 0.08), lm = toon(P.belt), lg = part(B.chest, new THREE.TorusGeometry(0.024, 0.005, 6, 18), lm, [lp.x, lp.y, lp.z]); lg.quaternion.setFromUnitVectors(V(0, 0, 1), SLOT_D); lg.scale.set(1, 1.3, 1); }
    // belt hooks for the climbing picks (their picks hook over these), and the picks themselves
    for (const s of [-1, 1]) { const hp = HOLSTER(s); part(B.hips, rbox(0.02, 0.05, 0.034, 0.006), toon(P.belt), [hp.x - s * 0.006, hp.y + 0.006, hp.z], [0, 0, s * 0.08]); part(B.hips, rbox(0.012, 0.012, 0.012, 0.003), toon(P.brass), [hp.x + s * 0.006, hp.y + 0.028, hp.z], null, null, { ink: false }); }
    built.climb = { R: makeClimbPick(S && S.climbGrade), L: makeClimbPick(S && S.climbGrade) }; B.hdR.add(built.climb.R); B.hdL.add(built.climb.L);
    bindShells(root, skins); built.skins = skins;
    root.traverse((o) => { if (o.isMesh && o.material !== OUT) o.receiveShadow = false; });
    return { root, B, sex, P, built, LT, LS, HY };
  }
  /* ---------- concept-projected head: a head sculpted to the sheet's front + side silhouettes, textured by projecting the concept art itself ---------- */
  // tables [y, half-width W, front depth Zf, back depth Zb] (head-local metres) measured from the front and side views; nose / lip bumps from the side profile
  const HEADS = {
    m: { K: 0.0023, xref: 730.4, rows: [[0.132, 0, -0.012, -0.012], [0.12, 0.058, 0.05, -0.078], [0.1, 0.086, 0.078, -0.106], [0.07, 0.102, 0.095, -0.12], [0.04, 0.107, 0.102, -0.125], [0.01, 0.107, 0.103, -0.124], [-0.015, 0.105, 0.1, -0.121], [-0.03, 0.102, 0.097, -0.117], [-0.045, 0.098, 0.091, -0.108], [-0.053, 0.095, 0.092, -0.096], [-0.062, 0.09, 0.093, -0.068], [-0.08, 0.082, 0.095, -0.036], [-0.095, 0.073, 0.092, -0.018], [-0.11, 0.059, 0.087, -0.004], [-0.122, 0.046, 0.083, 0.012], [-0.132, 0.032, 0.078, 0.032], [-0.14, 0.018, 0.072, 0.052], [-0.147, 0, 0.066, 0.066]],
      nose: [[-0.022, 0], [-0.032, 0.0025], [-0.045, 0.0055], [-0.055, 0.011], [-0.063, 0.0195], [-0.068, 0.024], [-0.073, 0.0165], [-0.079, 0.005], [-0.084, 0]], lips: [-0.094, 0.0062], relief: { eye: [0.05, -0.026], ck: 1 }, ear: [-0.044, -0.05],
      eyesF: [[-32.6, -14.1, -7.3, 3.4], [14.2, 33.4, -7.8, 3.6]], pe: 120, skin: '#d2a87f' },
    f: { K: 0.0023, xref: 730.4, rows: [[0.132, 0, -0.012, -0.012], [0.12, 0.058, 0.05, -0.078], [0.1, 0.085, 0.078, -0.106], [0.07, 0.1, 0.095, -0.12], [0.04, 0.106, 0.103, -0.125], [0.01, 0.106, 0.104, -0.124], [-0.015, 0.104, 0.1, -0.121], [-0.03, 0.101, 0.096, -0.117], [-0.045, 0.097, 0.097, -0.108], [-0.053, 0.094, 0.098, -0.096], [-0.065, 0.087, 0.099, -0.064], [-0.085, 0.077, 0.104, -0.028], [-0.1, 0.068, 0.1, -0.005], [-0.114, 0.055, 0.092, 0.02], [-0.127, 0.04, 0.087, 0.046], [-0.136, 0.029, 0.084, 0.064], [-0.142, 0.019, 0.082, 0.073], [-0.146, 0.009, 0.08, 0.077], [-0.148, 0, 0.079, 0.079]],
      nose: [[-0.022, 0], [-0.032, 0.002], [-0.043, 0.0045], [-0.053, 0.0095], [-0.061, 0.0165], [-0.066, 0.02], [-0.071, 0.0135], [-0.077, 0.004], [-0.082, 0]], lips: [-0.088, 0.0055], relief: { eye: [0.053, -0.028], ck: 0.8 }, ear: [-0.047, -0.052],
      eyesF: [[-36.8, -16.2, -9.525, 8.775], [16.2, 36.8, -9.525, 8.775]], pe: 179.4, skin: '#d6a784' } };
  // body skin (neck, hands, legs): the face atlas's median skin with the same tint, Lambert lighting and emissive lift as the projected head, so there is no tone step at the jaw
  // soft anime shading on skin: a gentle, wide gradient away from the key light (far cheek, under the chin), on top of the flat concept colour;
  // on the head it is masked off the front of the face (eyes, nose, mouth) except the underside of the jaw
  const TONE2 = (k, msk) => 'vec3 Ld2 = normalize((viewMatrix * vec4(0.38, 0.71, 0.59, 0.0)).xyz); float t2s = 1.0 - 0.085 * (1.0 - smoothstep(-0.6, 0.3, dot(normal, Ld2))) * ' + (msk || '1.0') + ';\ntotalEmissiveRadiance += diffuseColor.rgb * ' + k + ' * t2s; diffuseColor.rgb *= ';
  // skin tint shared by the head, lids and body skin: brings the lit result back to the sheet's tan (measured: sheet cheek 206,163,122)
  const SKTINT = [0.915, 0.92, 0.94];
  const SKMASK = '(1.0 - smoothstep(0.3, 0.65, normalize(vON).z) * (1.0 - smoothstep(-0.25, -0.55, normalize(vON).y)))';
  const _skinMats = {}; function skinMat(F, lit = 0.2, gain = 1) { const k = (F ? 'f' : 'm') + lit + '_' + gain; if (_skinMats[k]) return _skinMats[k]; const c = new THREE.Color(HEADS[F ? 'f' : 'm'].skin); c.r *= SKTINT[0]; c.g *= SKTINT[1]; c.b *= SKTINT[2]; const m = _skinMats[k] = new THREE.MeshLambertMaterial({ color: c });
    m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + TONE2(((1.0 - lit * 0.15) * gain).toFixed(3)) + lit.toFixed(3) + ';'); }; m.customProgramCacheKey = () => 'skinlift3' + lit + '_' + gain; return m; }
  // sculpted ear surface in its own frame: x = out of the ear, y up, z forward (toward the face); vertex colour = shading
  const _earG = {}; function earGeo(s) { if (_earG[s]) return _earG[s]; const NR = 14, NT = 36, A = 0.0205, Bh = 0.0315, pos = [], col = [], idx = [];
    const rimM = (th) => { const z = Math.cos(th), y = Math.sin(th); return ss(0.35, -0.2, z) * ss(-0.95, -0.55, y) + ss(0.35, -0.2, z) * 0 + ss(0.2, 0.75, y) * ss(0.9, 0.2, z) ; };
    const P = (r, th) => { const z = A * r * Math.cos(th) * (1 - 0.12 * Math.sin(th)), y = Bh * r * Math.sin(th) - 0.002 * r * r; const rm = clamp(rimM(th) + ss(-0.2, -0.6, Math.cos(th)), 0, 1);
      const cb = Math.exp(-(((z - 0.0035) / 0.0085) ** 2 + ((y + 0.004) / 0.0135) ** 2)), ah = Math.exp(-(((r - 0.62) / 0.08) ** 2)) * ss(0.3, -0.3, Math.cos(th)) * ss(-0.7, 0.1, Math.sin(th));
      const x = 0.0062 * (1 - r ** 4) + 0.0042 * Math.exp(-(((r - 0.86) / 0.085) ** 2)) * rm - 0.0058 * cb * (1 - 0.6 * rm * ss(0.6, 0.9, r)) + 0.0018 * ah;
      const c = clamp(1 - 0.26 * cb - 0.32 * ss(0.9, 1.0, r) * (0.5 + 0.5 * rm) - 0.1 * Math.exp(-(((r - 0.74) / 0.05) ** 2)) * rm, 0.55, 1); return [s * x, y, z, c]; };
    for (let i = 0; i <= NR; i++) for (let j = 0; j < NT; j++) { const [x, y, z, c] = P(i / NR, j / NT * TAU); pos.push(x, y, z); { const c2 = 1 - 0.45 * (1 - c); col.push(c2, c2 * 0.985, c2 * 0.975); } }
    for (let i = 0; i < NR; i++) for (let j = 0; j < NT; j++) { const a = i * NT + j, b = i * NT + (j + 1) % NT, c = a + NT, d = b + NT; if (s > 0) idx.push(a, b, d, a, d, c); else idx.push(a, d, b, a, c, d); }
    // back: a flat cap pushed into the head, sharing the outline
    const o = pos.length / 3; pos.push(-s * 0.004, -0.001, 0); col.push(0.8, 0.77, 0.75); const ob = o + 1; for (let j = 0; j < NT; j++) { const q = (NR * NT + j) * 3; pos.push(pos[q] - s * 0.0045, pos[q + 1] * 0.96, pos[q + 2] * 0.96); col.push(0.7, 0.67, 0.65); }
    for (let j = 0; j < NT; j++) { const e0 = NR * NT + j, e1 = NR * NT + (j + 1) % NT, b0 = ob + j, b1 = ob + (j + 1) % NT; if (s > 0) idx.push(e0, b1, e1, e0, b0, b1, o, b1, b0); else idx.push(e0, e1, b1, e0, b1, b0, o, b0, b1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals(); return (_earG[s] = g); }
  function earMat(F) { const k = (F ? 'f' : 'm') + 'ear'; if (_skinMats[k]) return _skinMats[k]; const b = skinMat(F, 0.15, 1), m = b.clone(); m.vertexColors = true; m.onBeforeCompile = b.onBeforeCompile; m.customProgramCacheKey = () => 'skinlift3ear'; return (_skinMats[k] = m); }
  // warm shaded skin for the ear's inner fold / rim line (a plain darker skin went grey)
  function earShade(F, k) { const key = 'ear' + k; if (_skinMats[(F ? 'f' : 'm') + key]) return _skinMats[(F ? 'f' : 'm') + key]; const m = skinMat(F, 0.05, 1).clone(); m.color.multiply(new THREE.Color(k, k * 0.9, k * 0.84)); m.onBeforeCompile = skinMat(F, 0.05, 1).onBeforeCompile; m.customProgramCacheKey = () => 'skinlift3' + 0.05 + '_' + 1; _skinMats[(F ? 'f' : 'm') + key] = m; return m; }
  const tab = (T, y, k) => { const n = T.length; if (y >= T[0][0]) return T[0][k]; if (y <= T[n - 1][0]) return T[n - 1][k]; let i = 1; while (T[i][0] > y) i++; const p1 = T[i - 1], p2 = T[i], p0 = T[Math.max(0, i - 2)], p3 = T[Math.min(n - 1, i + 1)], t = (p1[0] - y) / (p1[0] - p2[0]);
    const m1 = (p2[k] - p0[k]) / Math.max(1e-6, (p0[0] - p2[0])) * (p1[0] - p2[0]), m2 = (p3[k] - p1[k]) / Math.max(1e-6, (p1[0] - p3[0])) * (p1[0] - p2[0]), t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * p1[k] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[k] + (t3 - t2) * m2; };
  function headGeo(F) { const H = HEADS[F ? 'f' : 'm'], R = H.rows, NR = 84, NC = 96, y0 = R[0][0], y1 = R[R.length - 1][0], pos = [], col = [], uv = [], idx = [];
    for (let i = 0; i <= NR; i++) { const t = i / NR, y = lerp(y0, y1, t), W = tab(R, y, 1), Zf = tab(R, y, 2), Zb = tab(R, y, 3), zc = (Zf + Zb) / 2, nb = tab(H.nose, y, 1), lp = H.lips[1] * Math.exp(-(((y - H.lips[0]) / 0.006) ** 2));
      for (let j = 0; j <= NC; j++) { const th = -Math.PI + j / NC * TAU, s = Math.sin(th), c = Math.cos(th), pf = c > 0 ? 2.6 - 0.32 * ss(0.02, -0.01, y) * ss(-0.1, -0.06, y) : 2.2, x = W * Math.sign(s) * Math.pow(Math.abs(s), 2 / pf);
        let z = c > 0 ? zc + (Zf - zc) * Math.pow(c, 2 / pf) : zc - (zc - Zb) * Math.pow(-c, 2 / pf);
        if (c > 0) { const rl = H.relief, ax = Math.abs(x), ec = rl.eye; z += c * (-0.006 * Math.exp(-(((ax - ec[0]) / 0.021) ** 2 + ((y - ec[1]) / 0.015) ** 2)) + 0.0026 * Math.exp(-(((ax - ec[0] + 0.008) / 0.03) ** 2 + ((y - ec[1] - 0.027) / 0.008) ** 2)) + 0.0032 * rl.ck * Math.exp(-(((ax - 0.07) / 0.02) ** 2 + ((y - ec[1] + 0.03) / 0.018) ** 2))); }
        if (c > 0) z += nb * Math.exp(-((x / (0.0065 + 0.004 * ss(-0.045, -0.068, y))) ** 2)) + lp * Math.exp(-((x / 0.014) ** 2));
        pos.push(x, y, z); uv.push(j / NC, 1 - t); const m = 1 - 0.08 * ss(0.0, -0.1, z) * ss(-0.08, -0.02, y); col.push(m, m, m); } }
    for (let i = 0; i < NR; i++) for (let j = 0; j < NC; j++) { const a = i * (NC + 1) + j, b = a + NC + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; }
  // head outline: like OUT, but in side views the ink along the back of the jaw (seen against the neck) fades out, so the jaw blends into the neck
  let _headInk = null; function headInk() { if (_headInk) return _headInk; _headInk = new THREE.ShaderMaterial({ uniforms: { uW: OUT.uniforms.uW, uC: OUT.uniforms.uC, uView: HVIEW }, side: THREE.BackSide,
    vertexShader: 'uniform float uW; uniform vec3 uView; void main(){ float f = smoothstep(0.5, 0.72, abs(uView.x)) * smoothstep(0.005, -0.035, position.y) * smoothstep(0.06, 0.01, position.z) * smoothstep(-0.095, -0.06, position.z); vec3 p = position + normalize(normal) * uW * (1.0 - 0.9 * f); gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
    fragmentShader: OUT.fragmentShader }); return _headInk; }
  const _headTex = {}, HVIEW = { value: new THREE.Vector3(0, 0, 1) };
  function eyeTex(sx, k) { const key = 'e' + sx + k; if (!_headTex[key]) { const t = new THREE.TextureLoader().load('assets/char/eye-' + sx + '-' + k + '.webp'); t.anisotropy = 4; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; _headTex[key] = t; } return _headTex[key]; }
  let _pre = false; function headAtlas(F) { if (!_pre) { _pre = true; for (const q of 'mf') { for (const e of 'abm') eyeTex(q, e); if (q !== (F ? 'f' : 'm')) headAtlas(q === 'f'); } } const k = F ? 'f' : 'm'; if (!_headTex[k]) { const t = new THREE.TextureLoader().load('assets/char/face-' + k + '.webp'); t.anisotropy = 4; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; _headTex[k] = t; } return _headTex[k]; }
  // toon material whose colour comes from the concept: front view projected along z, side view along x, blended by the surface normal
  const _headMats = {};
  function headMat(F, shell, ear) { const mk = (F ? 'f' : 'm') + (shell ? 's' : '') + (ear ? 'e' : ''); if (_headMats[mk]) return _headMats[mk]; const H = HEADS[F ? 'f' : 'm'], m = _headMats[mk] = new THREE.MeshLambertMaterial({ map: headAtlas(F), vertexColors: true, alphaTest: shell ? 0.5 : 0 });
    m.onBeforeCompile = (sh) => { sh.uniforms.uHK = { value: new THREE.Vector2(H.K, H.xref) }; 
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP; varying vec3 vON;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = position; vON = normal;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP; varying vec3 vON; uniform vec2 uHK;\n').replace('#include <map_fragment>', [
        'float hk = uHK.x; float rr = 4.0 * (60.0 - (vOP.y + 0.03) / hk); float sx = 4.0 * (uHK.y - vOP.z / hk - 667.0);',
        'vec2 uF = vec2(clamp(4.0 * (64.0 + vOP.x / hk) / 1024.0, 0.002, 0.498), clamp(1.0 - rr / 1024.0, 0.553, 0.999));',
        'vec2 uS = vec2(clamp((512.0 + sx) / 1024.0, 0.502, 0.998), clamp(1.0 - rr / 1024.0, 0.553, 0.999));',
        // fixed on the surface (no view dependence): front projection, the side projection past |n.x| 0.8 and under the jaw
        'vec3 nn = normalize(vON); float ws = ' + (ear ? '1.0' : 'max(smoothstep(0.8, 0.85, abs(nn.x)), smoothstep(-0.3, -0.36, nn.z))') + ';',
        'vec4 hc = mix(texture2D(map, uF), texture2D(map, uS), ws);',
        // the sheet's painted nose shading belongs to the front view: as the nose's own sides turn toward the camera it fades to the neighbouring cheek skin
        // (otherwise the front-projected nostril / side shadow stretched into a dark mark at 50-60deg)
        ear ? '' : 'float nzn = exp(-pow(vOP.x / 0.02, 2.0)) * smoothstep(-0.03, -0.045, vOP.y) * smoothstep(-0.092, -0.08, vOP.y) * smoothstep(0.3, 0.62, abs(nn.x)) * (1.0 - ws); hc.rgb = mix(hc.rgb, texture2D(map, uF + vec2(sign(vOP.x) * 0.028, 0.0)).rgb, nzn);',
        shell ? 'hc.a *= smoothstep(-0.5, -0.28, nn.y); diffuseColor *= hc;' : 'diffuseColor.rgb *= hc.rgb * vec3(' + SKTINT.join(', ') + ') * (1.0 - 0.075 * (1.0 - smoothstep(0.12, 0.62, normalize(vNormal).z)));'].join('\n')).replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + TONE2('1.0', SKMASK) + '0.2;'); };
    m.customProgramCacheKey = () => 'headproj4' + (F ? 'f' : 'm') + (shell ? 's' : '') + (ear ? 'e' : ''); return m; }
  // hair shell: the head pushed out along its normals, showing only the concept's hair pixels (alpha mask), so painted hair gets real volume
  function hairShell(g, F) { const s = g.clone(), P = s.attributes.position, N = s.attributes.normal; for (let i = 0; i < P.count; i++) { const y = P.getY(i), d = 0.006 + 0.008 * ss(0.0, 0.08, y) + 0.004 * ss(0.0, -0.1, P.getZ(i)); P.setXYZ(i, P.getX(i) + N.getX(i) * d, y + N.getY(i) * d, P.getZ(i) + N.getZ(i) * d); }
    s.computeVertexNormals(); return s; }
  // blink lids: skin-coloured lid shapes + a closed lash line, drawn in the frontal concept frame (canvas px = 4 * (x' + 64), 4 * (row + 60))
  const _lidCache = {};
  function lidTex(F, lidK) { const key = (F ? 'f' : 'm') + lidK; if (_lidCache[key]) return _lidCache[key]; const H = HEADS[F ? 'f' : 'm'];
    // lid shapes are white (multiplied onto the head atlas skin sampled in the shader, so a closed lid is exactly the surrounding skin) + soft shadow + lash line
    const t = cv(512, 464, (g) => { g.clearRect(0, 0, 512, 464); if (!lidK) return; for (const [ex0, ex1, ey0, ey1] of H.eyesF) { const cx = (ex0 + ex1) / 2, cy = (ey0 + ey1) / 2, rx = (ex1 - ex0) / 2 + 3.2, ry = (ey1 - ey0) / 2 + 3.9, X = (x) => 4 * (x + 64), Y = (y) => 4 * (y + 60);
        const yl = lidK === 2 ? cy + ry * 0.35 : cy - ry * 0.05, col = '#ffffff';
        g.save(); g.filter = 'blur(3px)'; g.fillStyle = col; g.beginPath(); g.ellipse(X(cx), Y(cy), rx * 4, ry * 4, 0, Math.PI, TAU); g.lineTo(X(cx + rx), Y(yl)); g.quadraticCurveTo(X(cx), Y(yl + ry * 0.35), X(cx - rx), Y(yl)); g.closePath(); if (lidK === 2) g.ellipse(X(cx), Y(cy), rx * 4, ry * 4, 0, 0, Math.PI); g.fill(); g.restore();
        // soft shadow along the closed lid, then the lash line
        g.save(); g.filter = 'blur(4px)'; g.strokeStyle = 'rgba(120,70,50,.35)'; g.lineWidth = 14; g.beginPath(); g.moveTo(X(cx - rx * 0.9), Y(yl - 1.2)); g.quadraticCurveTo(X(cx), Y(yl + ry * 0.3 - 1.2), X(cx + rx * 0.9), Y(yl - 1.6)); g.stroke(); g.restore();
        g.strokeStyle = 'rgba(40,22,14,.95)'; g.lineWidth = lidK === 2 ? 7 : 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(X(cx - rx * 0.95), Y(yl - 0.4)); g.quadraticCurveTo(X(cx), Y(yl + ry * 0.38), X(cx + rx * 0.98), Y(yl - 0.8)); g.stroke(); } });
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; _lidCache[key] = t; return t; }
  function mountTether(tg, grade) { if (tg.grp) { tg.parent.remove(tg.grp); tg.grp.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); } const g = makeTether(grade, tg.o); g.position.set(...tg.pos); g.rotation.set(...tg.rot); tg.parent.add(g); tg.grp = g; return g; }
  function setFace(built, lid) { const f = built.face; if (!f) return; const k = lid < 0.3 ? 0 : lid < 0.8 ? 1 : 2; if (k === f.key) return; f.key = k; f.uL.value = lidTex(f.F, k); f.uC.value = k === 2 ? 1 : 0; }

  /* ---------- posing: rest pose, IK ---------- */
  const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _m = new THREE.Matrix4(), _v = V(0, 0, 0), _v2 = V(0, 0, 0), _v3 = V(0, 0, 0);
  function aim(bone, dirW, hingeW) { // point the bone's -y along dirW with its x axis on the hinge
    const y = _v.copy(dirW).normalize().negate(), x = _v2.copy(hingeW).addScaledVector(y, -hingeW.dot(y)).normalize(), z = _v3.crossVectors(x, y); _m.makeBasis(x, y, z); _q.setFromRotationMatrix(_m);
    bone.parent.getWorldQuaternion(_q2); bone.quaternion.copy(_q2.invert().multiply(_q)); bone.updateMatrixWorld(true); }
  function ik(up, lo, la, lb, target, pole, out) { const S = up.getWorldPosition(V(0, 0, 0)), D = target.clone().sub(S), d = clamp(D.length(), 0.02, (la + lb) * 0.999), dir = D.normalize();
    const cosA = clamp((la * la + d * d - lb * lb) / (2 * la * d), -1, 1), sinA = Math.sqrt(1 - cosA * cosA), pn = pole.clone().addScaledVector(dir, -pole.dot(dir)).normalize(), E = S.clone().addScaledVector(dir, la * cosA).addScaledVector(pn, la * sinA);
    const hinge = V(0, 0, 0).crossVectors(dir, pn).normalize(); if (out) hinge.negate(); aim(up, E.clone().sub(S), hinge); const T = S.clone().addScaledVector(dir, d); aim(lo, T.sub(E), hinge); }
  function setup(c) { const { B } = c; c.root.updateMatrixWorld(true);
    // fixed ankle targets (character space) and the pickaxe mount (its origin is the grip)
    c.ankle = { R: V(-0.095, 0.08, 0.0), L: V(0.1, 0.08, -0.02) };
    const mt = c.built.mount; { // per the sheets: he carries it short over the right shoulder; she rests it across the back of her neck
      const F = c.sex === 'f', d = (F ? V(0.1, 0.6, -0.8) : V(0.14, 0.58, -0.8)).normalize(), bl = V(-1, 0.8, 0).addScaledVector(d, -V(-1, 0.8, 0).dot(d)).normalize(), x = V(0, 0, 0).crossVectors(d, bl); _m.makeBasis(bl, d, x.negate()); mt.quaternion.setFromRotationMatrix(_m); mt.position.copy(F ? V(-0.195, 0.07, 0.12) : V(-0.21, 0.075, 0.12)); c.gripAt = 0.08; }
    { const key = (o, d, x, h) => { d = d.normalize(); x = x.addScaledVector(d, -x.dot(d)).normalize(); return { o, q: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, d, x.clone().cross(d))), h }; };
      const xs = V(-1, -0.55, 0).normalize(), Sk = key(SLOT_O.clone(), SLOT_D.clone(), xs.clone(), 0.56); c.pk = { S: Sk, A: { o: SLOT_O.clone().addScaledVector(SLOT_D, 0.24), q: Sk.q.clone(), h: 0.56 }, O: key(V(-0.27, -0.12, 0.05), V(-0.12, 1, 0.12), V(0, 0.1, 1), 0.48) }; c.pk.B = { o: c.pk.A.o.clone().add(V(-0.12, 0.02, 0.02)), q: c.pk.A.q.clone().slerp(c.pk.O.q, 0.5), h: 0.52 }; }
    if (!WALLG) { WALLG = makeWall(); scene.add(WALLG); } c.wall = WALLG;
    c.pickRest = { p: mt.position.clone(), q: mt.quaternion.clone() }; c.restQ = {}; for (const k in B) if (B[k] && B[k].isObject3D) c.restQ[k] = B[k].quaternion.clone(); }
  // run arm swing (s = +1 left, -1 right), driven from the shoulder: the upper arm pitches forward/back opposite the legs, the elbow stays bent ~80-100 deg
  // (flexing more on the forward swing), the forearm lags the upper arm a little (overlapping action), the hand crosses toward the midline in front and
  // comes back to/past the hip behind. Returns the wrist target, an elbow pole and the forearm direction (local + world).
  // arm swing (s = +1 left, -1 right), opposite the legs, driven from the shoulder.
  // walk (k = 0): relaxed, a small fore-aft swing that scales with speed, lagging the legs a touch; the elbow is always bent (~17 deg at the back
  //   of the swing, ~40 deg at the front) and the forearm trails the upper arm (follow-through), so it swings further; the hand drifts in toward the
  //   midline in front. run (k = 1): driven swing, elbow ~80-100 deg, the hand crossing toward the midline in front and back past the hip behind.
  // sh: the arm root the wrist offset is measured from (the upper-arm joint for the walk, the clavicle for the run, blended by k)
  function runArm(s, ph, sh, RQ, k = 1) { const sg = s > 0 ? -1 : 1, am = clamp((st.gaitV || GAIT.walk.v) / GAIT.walk.v, 0.35, 1.25);
    const su = sg * Math.cos(TAU * (ph - 0.03)), sf = sg * Math.cos(TAU * (ph - 0.11)), thW = 0.03 + am * (su > 0 ? 0.25 : 0.29) * su, flW = 0.3 + (0.42 * (0.5 + 0.5 * sf)) * (0.65 + 0.35 * Math.min(1, am)), crW = Math.max(0, sf) * 0.45 * Math.min(1, am);
    const sw = sg * Math.cos(TAU * ph), sl = sg * Math.cos(TAU * (ph - 0.07)), thR = sw > 0 ? 0.52 * sw : 0.78 * sw, flR = 1.4 + 0.36 * (0.5 + 0.5 * sl), crR = Math.max(0, sl);
    const th = lerp(thW, thR, k), fl = lerp(flW, flR, k), cr = lerp(crW, crR, k);
    const d1 = V(s * lerp(0.2, 0.12, k), -Math.cos(th), Math.sin(th)).normalize(), a2 = th + fl, dl = V(s * lerp(0.07, 0.03, k) - s * lerp(0.2, 0.26, k) * cr, -Math.cos(a2), Math.sin(a2)).normalize(), wl = d1.multiplyScalar(0.245).addScaledVector(dl, 0.215);
    return { wr: sh.clone().add(wl.applyQuaternion(RQ)), pole: V(s * 0.4, -0.15, -1).applyQuaternion(RQ), dl, d2: dl.clone().applyQuaternion(RQ) }; }
  const PALM = V(0, -0.045, -0.031), SLOT_O = V(0.03, -0.4, -0.123), SLOT_D = V(-0.55, 1, 0).normalize(), HOLSTER = (s) => V(s * 0.174, 0.035, -0.06);
  function solveLimbs(c, f) { const { B } = c, root = c.root; if (!c.hol) c.hol = { R: { ax: 0, az: 0, vx: 0, vz: 0 }, L: { ax: 0, az: 0, vx: 0, vz: 0 } }; root.updateMatrixWorld(true); c._clr = !!((f.mine && f.mine.w > 0.01) || (f.climb && f.climb.w > 0.01) || (f.eq && f.eq.seq));
    // legs: feet planted on their ankle targets, knees forward
    const fwd = V(0, 0, 1).applyQuaternion(root.quaternion);
    for (const k of ['R', 'L']) { const a = c.ankle[k].clone(); let pitch = f.tap && k === 'R' ? -f.tap * 0.7 : 0, fy = k === 'R' ? -0.14 : 0.16; if (k === 'R' && f.tap) { a.y += f.tap * 0.05; a.z += f.tap * 0.015; }
      if (f.run) { const g = runFoot(f.run.ph + (k === 'L' ? 0 : 0.5), f.run.k ?? 1), w = f.run.w; a.lerp(V(k === 'R' ? -0.085 : 0.085, g.y, g.z), w); pitch = lerp(pitch, g.p, w); fy = lerp(fy, k === 'R' ? -0.05 : 0.05, w); }
      if (f.mine) { const w = f.mine.w; a.lerp(k === 'R' ? V(-0.13, 0.08, -0.1) : V(0.13, 0.08, 0.09), w); fy = lerp(fy, k === 'R' ? -0.35 : 0.2, w); }
      if (f.climb) { const F = f.climb.F[k], w = f.climb.w; a.lerp(F.a, w); pitch = lerp(pitch, F.p ?? 0.12 * F.sn, w); fy = lerp(fy, k === 'R' ? -0.1 : 0.1, w); }
      const kp = fwd.clone().add(V(0, 0.2, 0)); if (f.climb) kp.add(V(k === 'R' ? -0.6 : 0.6, 0, 0).applyQuaternion(root.quaternion).multiplyScalar(f.climb.w)); if (f.mine) kp.add(V(k === 'R' ? -0.55 : 0.55, 0, 0).applyQuaternion(root.quaternion).multiplyScalar(f.mine.w)); ik(B['th' + k], B['sn' + k], c.LT, c.LS, root.localToWorld(a), kp, false);
      B['ft' + k].parent.getWorldQuaternion(_q2); _q.setFromEuler(new THREE.Euler(pitch, fy, 0)); _q.premultiply(root.quaternion); B['ft' + k].quaternion.copy(_q2.invert().multiply(_q)); }
    // mining: the pick is held two-handed - its grip pose comes from the swing keys (character space), blended over the carry pose
    let gripAt = c.gripAt || 0; if (f.mine && f.mine.w > 0) { const m = f.mine, mt0 = c.built.mount, th = m.th, d = V(m.dx, Math.cos(th), Math.sin(th)).normalize(), bl = V(0, 0, 0).crossVectors(V(1, 0, 0), d).normalize().multiplyScalar(MINE_SPIKE), z = V(0, 0, 0).crossVectors(bl, d);
      _m.makeBasis(bl, d, z); const Qd = new THREE.Quaternion().setFromRotationMatrix(_m).premultiply(root.quaternion), Pd = root.localToWorld(m.G.clone());
      mt0.updateMatrixWorld(true); const P0 = mt0.getWorldPosition(V(0, 0, 0)), Q0 = mt0.getWorldQuaternion(new THREE.Quaternion()); P0.lerp(Pd, m.w); Q0.slerp(Qd, m.w);
      mt0.position.copy(mt0.parent.worldToLocal(P0)); mt0.parent.getWorldQuaternion(_q2); mt0.quaternion.copy(_q2.invert().multiply(Q0)); mt0.updateMatrixWorld(true); gripAt = lerp(gripAt, MINE_GRIP, m.w); }
    // ---- tools. The equip sequencer (f.eq: held tool + the running motion) poses both tools: the pickaxe in the hand (carry / mine) or in its back loop;
    // pickDraw = reach over the right shoulder, grip under the head, pull it up out of the loop along its shaft, swing it over the shoulder to the carry;
    // pickStow = lift over the shoulder, line the handle up behind the back, slide it down into the loop, let go. climbDraw = hands down to the hip holsters,
    // grip, lift the picks off their hooks, swing up to the ready; climbStow = lower them to the hips, hook them in, let go. Hands close through gripSolve.
    const RQ = root.quaternion, E = f.eq || { held: 'pick', seq: null, t: 0 }, et = E.t, mt = c.built.mount, K = c.pk; B.chest.updateMatrixWorld(true); const chQ = B.chest.getWorldQuaternion(new THREE.Quaternion());
    const dM = V(0, 1, 0).applyQuaternion(mt.quaternion); let pO = mt.position.clone().addScaledVector(dM, -gripAt), pQ = mt.quaternion.clone(), pH = gripAt, wP = 1, pUp = 0;
    { const toK = (k, w) => { pO.lerp(k.o, w); pQ.slerp(k.q, w); pH = lerp(pH, k.h, w); };
      if (E.seq === 'pickDraw') { const C = { o: pO.clone(), q: pQ.clone(), h: pH }; pO = K.S.o.clone(); pQ = K.S.q.clone(); pH = K.S.h; toK(K.A, ss(0.3, 0.5, et)); toK(K.B, ss(0.5, 0.64, et)); toK(K.O, ss(0.64, 0.8, et)); toK(C, ss(0.8, 1, et)); wP = ss(0.06, 0.3, et); pUp = 1 - ss(0.72, 1, et); }
      else if (E.seq === 'pickStow') { toK(K.O, ss(0, 0.24, et)); toK(K.B, ss(0.24, 0.4, et)); toK(K.A, ss(0.4, 0.54, et)); toK(K.S, ss(0.54, 0.78, et)); wP = 1 - ss(0.8, 0.97, et); pUp = ss(0.04, 0.26, et); }
      else if (E.held !== 'pick') { pO = K.S.o.clone(); pQ = K.S.q.clone(); pH = K.S.h; wP = 0; } }
    const pOw = B.chest.localToWorld(pO.clone()), pQw = chQ.clone().multiply(pQ), pdW = V(0, 1, 0).applyQuaternion(pQw), pGw = pOw.clone().addScaledVector(pdW, pH + (f.mine ? f.mine.w * f.mine.h2 : 0));
    // mining: keep the lead-hand slide point within the right arm's reach (soft clamp along the shaft) so the hand never lifts off the handle at full extension
    if (f.mine && f.mine.w > 0) { const Sh = B.shR.getWorldPosition(V(0, 0, 0)), rel = Sh.sub(pOw), s0 = rel.dot(pdW), r2 = rel.lengthSq() - s0 * s0, Rm = 0.442, sd = pH + f.mine.w * f.mine.h2;
      if (r2 < Rm * Rm) { const hw = Math.sqrt(Rm * Rm - r2), kS = 0.05, smin = (a, b2) => { const h = clamp(0.5 + 0.5 * (b2 - a) / kS, 0, 1); return lerp(b2, a, h) - kS * h * (1 - h); }; let sc = smin(sd, s0 + hw); sc = -smin(-sc, -(s0 - hw)); const fd = f.dt || 1 / 60; c._msc = c._msc === undefined || Math.abs(c._msc - sc) > 0.3 ? sc : c._msc + (sc - c._msc) * (1 - Math.exp(-fd / 0.03)); pGw.copy(pOw).addScaledVector(pdW, Math.min(c._msc, s0 + hw)); } }
    let wC = 0, vC = 0, lC = 0, hC = 0.08; if (E.seq === 'climbDraw') { wC = ss(0.04, 0.3, et); lC = ss(0.3, 0.5, et); vC = ss(0.5, 1, et); hC = lerp(0.08, 0, ss(0.55, 0.95, et)); }
    else if (E.seq === 'climbStow') { vC = 1 - ss(0, 0.45, et); lC = et < 0.45 ? 1 : 1 - ss(0.45, 0.7, et); wC = 1 - ss(0.72, 0.92, et); hC = lerp(0, 0.08, ss(0.05, 0.4, et)); }
    else if (E.held === 'climb') { wC = 1; vC = 1; hC = 0; }
    const cT = {}; B.hips.updateMatrixWorld(true); const hipQ = B.hips.getWorldQuaternion(new THREE.Quaternion());
    for (const [k, s] of [['R', -1], ['L', 1]]) { // climbing pick pose: hip holster (hung by the head, blade out to the side) > lifted off > ready hold
      const hs = c.hol[k], Pv = HOLSTER(s), pw = B.hips.localToWorld(Pv.clone()); root.worldToLocal(pw); const dt = Math.min(f.dt || 0, 0.05);
      if (dt > 0) { if (!hs.p) { hs.p = pw.clone(); hs.v = V(0, 0, 0); } const v = pw.clone().sub(hs.p).divideScalar(dt), a = v.clone().sub(hs.v).divideScalar(dt).clampLength(0, 25); hs.p.copy(pw); hs.v.copy(v); pend(hs, a.z * 0.9, -a.x * 0.6, dt, 34, 5.5); hs.ax = clamp(hs.ax, -0.33, 0.33); hs.az = clamp(hs.az, -0.16, 0.16); }
      const rs = f.run ? f.run.w * 0.13 * Math.sin(TAU * f.run.ph + (s > 0 ? 0 : Math.PI) - 0.9) : 0, qS = new THREE.Quaternion().setFromEuler(new THREE.Euler(hs.ax + rs, 0, hs.az + s * Math.abs(rs) * 0.25));
      const dH = V(-s * 0.3, 1, 0.26).normalize(), xH = V(-s * 0.1, 0, 1).addScaledVector(dH, -V(-s * 0.1, 0, 1).dot(dH)).normalize(), qH = new THREE.Quaternion().setFromRotationMatrix(_m.makeBasis(xH, dH, xH.clone().cross(dH))).premultiply(qS), oH = B.hips.localToWorld(Pv.clone().sub(V(0.006, 0.36, 0).applyQuaternion(qH))), qHw = hipQ.clone().multiply(qH);
      const G = V(s * 0.19, 0.92 + 0.006 * (f.br || 0), 0.22); if (f.run) { const sw = (s > 0 ? -1 : 1) * Math.cos(TAU * f.run.ph); G.z += (sw > 0 ? 0.12 : 0.05) * sw * f.run.w; G.y += 0.015 * Math.max(0, sw) * f.run.w; G.x += s * 0.02 * f.run.w; }
      const dR = V(s * (0.32 + (f.run ? 0.18 * f.run.w : 0)), 1, 0.22).normalize(), xR = V(0, 0, 1).addScaledVector(dR, -dR.z).normalize(), qR = new THREE.Quaternion().setFromRotationMatrix(_m.makeBasis(xR, dR, xR.clone().cross(dR))).premultiply(RQ);
      const dHw = V(s * 0.35, 1, 0.25).normalize().applyQuaternion(hipQ), o = oH.clone().addScaledVector(dHw, 0.15 * lC).lerp(root.localToWorld(G), vC).add(V(s * 0.13, 0.03, 0.12).multiplyScalar(Math.sin(Math.PI * vC)).applyQuaternion(RQ)), q = qHw.slerp(qR, vC);
      if (f.climb && f.climb.w > 0 && f.climb.H && vC > 0) { const Hc = f.climb.H[k], a = Hc.a, dC = V(s * 0.08, Math.cos(a), Math.sin(a)).normalize(), xC = V(0, -Math.sin(a), Math.cos(a)); xC.addScaledVector(dC, -xC.dot(dC)).normalize();
        const qC = new THREE.Quaternion().setFromRotationMatrix(_m.makeBasis(xC, dC, xC.clone().cross(dC))).premultiply(RQ); o.lerp(root.localToWorld(Hc.g.clone()), f.climb.w * vC); q.slerp(qC, f.climb.w * vC); }
      let choke = 0; if (f.run && f.run.w > 0 && vC > 0 && !(f.climb && f.climb.w > 0)) { const rw = f.run.w * vC, kk = f.run.k ?? 1, ra = runArm(s, f.run.ph, B['sh' + k].getWorldPosition(V(0, 0, 0)).lerp(B['ua' + k].getWorldPosition(V(0, 0, 0)), 1 - kk), RQ, kk), dn = V(-s * 0.15, ra.dl.z, -ra.dl.y); if (dn.y < 0) dn.negate(); dn.normalize();
        // choked up: the fist just below the head, the shaft hanging down past the hand
        const xL = V(0, 0, 1).addScaledVector(dn, -dn.z).normalize(), qL = new THREE.Quaternion().setFromRotationMatrix(_m.makeBasis(xL, dn, xL.clone().cross(dn))).premultiply(RQ), dw = dn.clone().applyQuaternion(RQ), gW = ra.wr.clone().addScaledVector(ra.d2, lerp(0.045, 0.075, kk));
        o.lerp(gW.addScaledVector(dw, -0.27), rw); q.slerp(qL, rw); choke = 0.27 * rw; }
      const d = V(0, 1, 0).applyQuaternion(q); cT[k] = { o, q, d, g: o.clone().addScaledVector(d, hC * (1 - (f.climb ? f.climb.w : 0)) + choke) }; }
    // right arm: rest (hangs like the left), the pickaxe grip and/or the right climbing pick
    { const shR = B.shR.getWorldPosition(V(0, 0, 0)), wr0 = shR.clone().add(V(-0.105, -0.44, 0.03).applyQuaternion(RQ)), pr0 = V(-0.12, -0.05, -1).applyQuaternion(RQ);
      const poleP = (f.mine ? V(-0.3, -1, -0.15).lerp(V(-0.9, -0.6, -0.2), f.mine.w) : V(-0.3, -1, -0.15)).lerp(V(-0.55, 0.9, 0.5), pUp).applyQuaternion(RQ), poleC = (f.climb ? V(-0.6, -1, -0.5).lerp(V(-1, -0.4, -0.3), f.climb.w) : V(-0.6, -1, -0.5)).applyQuaternion(RQ);
      const gp = wP > 0 ? gripSolve(c, 'R', pGw, pdW, poleP) : null, gc = wC > 0 ? gripSolve(c, 'R', cT.R.g, cT.R.d, poleC) : null;
      const wr = wr0.clone(), pr = pr0.clone(); if (f.run && f.run.w > 0) { const kR = f.run.k ?? 1, ra = runArm(-1, f.run.ph, shR.clone().lerp(B.uaR.getWorldPosition(V(0, 0, 0)), 1 - kR), RQ, kR); wr.lerp(ra.wr, f.run.w); pr.lerp(ra.pole, f.run.w); } if (f.rope && f.rope.w > 0) { wr.lerp(root.localToWorld(f.rope.R.clone()), f.rope.w); pr.lerp(V(-0.8, -0.5, -0.4).applyQuaternion(RQ), f.rope.w); } if (gp) { wr.lerp(gp.wrist, wP); pr.lerp(poleP, wP); } if (gc) { wr.lerp(gc.wrist, wC); pr.lerp(poleC, wC); } ikA(c, 'R', wr, pr);
      const y = B.faR.getWorldPosition(V(0, 0, 0)).sub(B.hdR.getWorldPosition(V(0, 0, 0))).normalize(), z = V(-1, 0, 0.18).applyQuaternion(RQ); z.addScaledVector(y, -z.dot(y)).normalize(); _m.makeBasis(V(0, 0, 0).crossVectors(y, z), y, z);
      const Qr = new THREE.Quaternion().setFromRotationMatrix(_m).multiply(_q.setFromEuler(new THREE.Euler(-0.12, 0, -0.06))); if (gp) Qr.slerp(gp.Q, wP); if (gc) Qr.slerp(gc.Q, wC);
      B.hdR.parent.getWorldQuaternion(_q2); B.hdR.quaternion.copy(_q2.invert().multiply(Qr)); B.hdR.updateMatrixWorld(true);
      const g = Math.max(wP, wC, f.rope ? f.rope.w : 0); B.knR.rotation.x = lerp(0.32, 1.3, g); B.tpR.rotation.x = lerp(0.42, 1.25, g); B.thumbR.rotation.set(lerp(0.3, 1.05, g), 0, lerp(-0.6, -0.35, g)); }
    const placeT = (obj, hand, o, q) => { if (!obj) return; obj.position.copy(hand.worldToLocal(o.clone())); hand.getWorldQuaternion(_q2); obj.quaternion.copy(_q2.invert().multiply(q)); };
    placeT(c.built.pick, B.hdR, pOw, pQw); if (c.built.climb) placeT(c.built.climb.R, B.hdR, cT.R.o, cT.R.q);
    // left arm: hangs relaxed (palm toward the thigh, thumb forward, elbow straight back so the upper arm has no twist), or reaches up so the
    // finger tips scratch the cheek (elbow swinging down and out, palm toward the face). Hand frame: -y = finger direction, +z = the back of the hand.
    const sh = B.shL.getWorldPosition(V(0, 0, 0)), r = f.reach || 0; let wristL = sh.clone().add(V(0.105, -0.44, 0.03).applyQuaternion(RQ));
    let pole2 = V(0.12, -0.05, -1).applyQuaternion(RQ), Qsc = null;
    if (r) { B.headC.updateMatrixWorld(true); const w = Math.sin(f.scr || 0), hcW = B.headC.getWorldPosition(V(0, 0, 0));
      // treat forearm + hand as one straight segment to the finger tips (no bent wrist), elbow swung down and out
      const tip = B.headC.localToWorld(V(0.084, -0.066 + 0.007 * w, 0.06)), Lf = 0.215 + 0.1, S = sh.clone(), D = tip.clone().sub(S), dd = clamp(D.length(), 0.05, (0.245 + Lf) * 0.999), dir = D.normalize();
      const pp = V(1.1, -1.0, 0.25).applyQuaternion(RQ), pn = pp.addScaledVector(dir, -pp.dot(dir)).normalize(), cA = clamp((0.245 * 0.245 + dd * dd - Lf * Lf) / (2 * 0.245 * dd), -1, 1);
      const E = S.clone().addScaledVector(dir, 0.245 * cA).addScaledVector(pn, 0.245 * Math.sqrt(1 - cA * cA)), fd = tip.clone().sub(E).normalize(), ws = E.clone().addScaledVector(fd, 0.215 + 0.008 * w);
      wristL.lerp(ws, r); pole2.lerp(E.clone().sub(S.clone().lerp(ws, 0.5)), r);
      const yv = fd.clone().negate(), zv = ws.clone().sub(hcW); zv.addScaledVector(yv, -zv.dot(yv)).normalize(); _m.makeBasis(V(0, 0, 0).crossVectors(yv, zv), yv, zv); Qsc = new THREE.Quaternion().setFromRotationMatrix(_m); }
    if (f.run) { const w = f.run.w, kL = f.run.k ?? 1, ra = runArm(1, f.run.ph, sh.clone().lerp(B.uaL.getWorldPosition(V(0, 0, 0)), 1 - kL), RQ, kL); wristL.lerp(ra.wr, w); pole2.lerp(ra.pole, w); }
    let QmL = null; if (f.mine && f.mine.w > 0) { const w = f.mine.w, mt0 = c.built.mount, gL = mt0.getWorldPosition(V(0, 0, 0)), dd = V(0, 1, 0).applyQuaternion(mt0.getWorldQuaternion(new THREE.Quaternion())); 
      const pl = V(1, -0.7, -0.1).applyQuaternion(RQ), w0 = wristL.clone(), p0 = pole2.clone(); let wl = gL.clone(); QmL = new THREE.Quaternion(); pole2 = p0.clone().lerp(pl, w);
      for (let it = 0; it < 3; it++) { ikA(c, 'L', w0.clone().lerp(wl, w), pole2); const y = B.faL.getWorldPosition(V(0, 0, 0)).sub(wl).normalize(), x = dd.clone().negate(); y.addScaledVector(x, -y.dot(x)).normalize(); _m.makeBasis(x, y, V(0, 0, 0).crossVectors(x, y)); QmL.setFromRotationMatrix(_m); wl = gL.clone().sub(PALM.clone().applyQuaternion(QmL)); }
      wristL = w0.lerp(wl, w); }
    let gcl = null; if (wC > 0) { const pc = (f.climb ? V(0.6, -1, -0.5).lerp(V(1, -0.4, -0.3), f.climb.w) : V(0.6, -1, -0.5)).applyQuaternion(RQ); gcl = gripSolve(c, 'L', cT.L.g, cT.L.d, pc); wristL.lerp(gcl.wrist, wC); pole2.lerp(pc, wC); }
    if (f.rope && f.rope.w > 0 && f.rope.L) { const rw2 = f.rope.w * (1 - wC); wristL.lerp(root.localToWorld(f.rope.L.clone()), rw2); pole2.lerp(V(0.8, -0.5, -0.4).applyQuaternion(RQ), rw2); } if (f.sighDrop) wristL.y -= f.sighDrop * 0.015; ikA(c, 'L', wristL, pole2);
    { const y = B.faL.getWorldPosition(V(0, 0, 0)).sub(B.hdL.getWorldPosition(V(0, 0, 0))).normalize(), z = V(1, 0, 0.18).applyQuaternion(RQ); z.addScaledVector(y, -z.dot(y)).normalize(); _m.makeBasis(V(0, 0, 0).crossVectors(y, z), y, z);
      const Qr = new THREE.Quaternion().setFromRotationMatrix(_m).multiply(_q.setFromEuler(new THREE.Euler(-0.12, 0, 0.06))); if (Qsc) Qr.slerp(Qsc, ss(0, 0.85, r)); if (QmL) Qr.slerp(QmL, f.mine.w); if (gcl) Qr.slerp(gcl.Q, wC);
      B.hdL.parent.getWorldQuaternion(_q2); B.hdL.quaternion.copy(_q2.invert().multiply(Qr)); }
    B.knL.rotation.x = lerp(0.32, 0.8 + 0.35 * Math.sin(f.scr || 0), r); B.tpL.rotation.x = lerp(0.42, 0.6 + 0.3 * Math.sin((f.scr || 0) + 1), r); B.thumbL.rotation.set(0.35, 0, 0.6);
    const fist = Math.max(f.run ? f.run.w * (0.25 + 0.55 * (f.run.k ?? 1)) : 0, f.mine ? f.mine.w : 0, wC, f.rope ? f.rope.w : 0); if (fist) { B.knL.rotation.x = lerp(B.knL.rotation.x, 1.3, fist); B.tpL.rotation.x = lerp(B.tpL.rotation.x, 1.25, fist); B.thumbL.rotation.set(lerp(0.35, 1.05, fist), 0, lerp(0.6, 0.35, fist)); }
    if (c.built.climb) { B.hdL.updateMatrixWorld(true); placeT(c.built.climb.L, B.hdL, cT.L.o, cT.L.q); } }
  // close a hand on a tool: palm on the grip point, hand x along the shaft (thumb toward the head: +d for the right hand, -d for the left), y back to the elbow
  // arm IK with body clearance: while mining, the hand target is pushed out of the torso (an ellipse in chest space, with a sleeve margin), and if the
  // elbow lands inside the torso or the head the pole swings it outward and the arm is re-solved
  function ikA(c, k, target, pole) { const B = c.B, up = B['ua' + k], lo = B['fa' + k]; if (!c._clr) return ik(up, lo, 0.245, 0.215, target, pole, false);
    const ch = B.chest, inT = (pw, m) => { const q = ch.worldToLocal(pw.clone()); if (q.y < -0.55 || q.y > 0.24) return null; const rx = 0.15 + m, rz = q.z > 0 ? 0.105 + m : 0.12 + m, e = (q.x / rx) ** 2 + (q.z / rz) ** 2; return e < 1 ? { q, e, rx, rz } : null; };
    const t = target.clone(), h = inT(t, 0.05); if (h) { const s = 1 / Math.sqrt(Math.max(h.e, 1e-4)); h.q.x *= s; h.q.z *= s; if (Math.abs(h.q.x) < 0.02 && Math.abs(h.q.z) < 0.02) h.q.z = h.rz; t.copy(ch.localToWorld(h.q)); }
    let pl = pole.clone(); for (let it = 0; it < 4; it++) { ik(up, lo, 0.245, 0.215, t, pl, false); const e = lo.getWorldPosition(V(0, 0, 0)), he = inT(e, 0.055), hc = B.headC.getWorldPosition(V(0, 0, 0)), dh = e.distanceTo(hc);
      if (!he && dh > 0.2) break; const out = he ? V(he.q.x / he.rx, 0, he.q.z / he.rz).normalize().transformDirection(ch.matrixWorld) : e.clone().sub(hc).normalize(); pl.addScaledVector(out, 1.5).normalize(); } }
  function gripSolve(c, k, gW, dW, pole) { const B = c.B, up = B['ua' + k], lo = B['fa' + k], x = dW.clone().multiplyScalar(k === 'R' ? 1 : -1), Q = new THREE.Quaternion(); let wr = gW.clone();
    for (let it = 0; it < 3; it++) { ikA(c, k, wr, pole); const y = lo.getWorldPosition(V(0, 0, 0)).sub(wr).normalize(); y.addScaledVector(x, -y.dot(x)).normalize(); _m.makeBasis(x, y, V(0, 0, 0).crossVectors(x, y)); Q.setFromRotationMatrix(_m); wr = gW.clone().sub(PALM.clone().applyQuaternion(Q)); }
    return { wrist: wr, Q }; }

  /* ---------- locomotion + work cycles ---------- */
  const SEQ_T = { pickDraw: 1.35, pickStow: 1.35, climbDraw: 1.0, climbStow: 1.0 }, TOOL_T = 2.2, RUN_T = 0.62, WALK_T = 1.05, MINE_T = 1.7, MINE_SPIKE = 1, MINE_GRIP = -0.255;
  // run foot path (character space) for a leg phase q in [0,1): stance 0-0.38 (heel strike > flat > toe push-off), then the swing (heel kick, knee drive, reach)
  // gait foot paths (character space, +z forward) for a leg phase q in [0,1): q = 0 is initial contact. The stance foot is PLANTED: its flat-foot
  // ankle position slides back by exactly D over the stance fraction b, and the phase is driven by distance travelled (dPhase = ground distance / S,
  // S = D / b), so the foot stays locked to the ground at any speed. Contact rolls over the heel (toe-up pitch about the heel), the foot goes flat,
  // then the heel rises about the planted ball of the foot to toe-off; the swing lifts the foot (knee bends via the leg IK), carries it through and
  // reaches forward (with a small paw-back in the run so it meets the ground moving backwards)
  const GAIT = { walk: { v: 1.2, D: 0.55, Z0: 0.285, b: 0.6, pS: -0.3, pO: 0.6, pm: -0.06, roll: 0.15, rise: 0.55, hy: 0.075, hpk: 0.6, paw: 0.012, zs0: 0.08 },
    run: { v: 3.7, D: 0.66, Z0: 0.25, b: 0.28, pS: -0.08, pO: 0.78, pm: 0.12, roll: 0.2, rise: 0.4, hy: 0.27, hpk: 0.72, paw: 0.05, zs0: 0.16 } };
  for (const g of Object.values(GAIT)) g.S = g.D / g.b;
  function footPose(zs, p) { const ha = 0.06, Lt = 0.11, Lh = 0.05; return p >= 0 ? { z: zs + Lt - Lt * Math.cos(p) - ha * Math.sin(p), y: 0.02 + Lt * Math.sin(p) + ha * Math.cos(p), p } : { z: zs - Lh + Lh * Math.cos(p) - ha * Math.sin(p), y: 0.02 - Lh * Math.sin(p) + ha * Math.cos(p), p }; }
  function gaitFoot(q, G) { q = ((q % 1) + 1) % 1; if (q < G.b) { const u = q / G.b, p = u < G.roll ? lerp(G.pS, 0, ss(0, G.roll, u)) : u > G.rise ? G.pO * ss(G.rise, 1, u) : 0; return Object.assign(footPose(G.Z0 - G.D * u, p), { st: u }); }
    const v = (q - G.b) / (1 - G.b), A = footPose(G.Z0 - G.D, G.pO), Bf = footPose(G.Z0, G.pS);
    return { z: A.z + (Bf.z - A.z) * ss(G.zs0, 0.9, v) + G.paw * Math.sin(Math.PI * ss(0.55, 1, v)), y: lerp(A.y, Bf.y, ss(0, 1, v)) + G.hy * Math.pow(Math.sin(Math.PI * Math.pow(v, G.hpk)), 1.3), p: v < 0.5 ? lerp(G.pO, G.pm, ss(0, 0.5, v)) : lerp(G.pm, G.pS, ss(0.5, 0.95, v)), st: -1 }; }
  function walkFoot(q) { return gaitFoot(q, GAIT.walk); }
  function runFoot(q, k = 1) { const a = k < 0.999 ? gaitFoot(q, GAIT.walk) : null, b = k > 0.001 ? gaitFoot(q, GAIT.run) : null; if (!a) return b; if (!b) return a; return { z: lerp(a.z, b.z, k), y: lerp(a.y, b.y, k), p: lerp(a.p, b.p, k), st: k < 0.5 ? a.st : b.st }; }
  // mining swing keys (character space, two-handed leverage grip): [u, bottom-hand grip x, y, z, handle angle from up toward +z (deg), handle lean to the right (x),
  //   body lean, hip drop, head pitch, ease (1 smooth, 2 accelerate, 0 linear), lead-hand distance up the shaft from the bottom hand, hip shift forward, torso twist]
  // the bottom hand stays near the butt; the lead hand rides high near the head at the wind-up (pick cocked over the right shoulder) and slides down
  // to the bottom hand as the hips and torso uncoil and the arms pull through the strike
  // keys: [u, bottom-hand grip x,y,z (character space; the LEFT hand holds the butt), shaft pitch deg, shaft side lean, body lean, drop, head pitch, ease,
  //        h2 = how far up the shaft the RIGHT (sliding) hand sits, hip shift, torso twist]. Wind-up: left fist in front of the sternum, pick cocked over the right
  //        shoulder, right hand up by the ear near the head; strike: right hand slides down to the left as the hips drive forward; recoil + settle; pull out.
  const MINE_K = [[0, 0.03, 0.88, 0.25, 75, 0, 0.1, 0.03, 0.15, 1, 0.3, 0, 0], [0.14, 0, 0.98, 0.26, 25, -0.15, 0.0, 0.04, 0.05, 1, 0.42, -0.03, -0.16], [0.4, -0.07, 1.06, 0.23, -35, -0.5, -0.18, 0.075, -0.12, 2, 0.42, -0.06, -0.42],
    [0.47, -0.03, 1.07, 0.3, 45, -0.12, 0.2, 0.05, 0.12, 0, 0.25, 0.02, -0.06], [0.52, 0, 0.71, 0.29, 128, 0, 0.54, 0.15, 0.45, 1, 0.06, 0.075, 0.2], [0.565, 0, 0.77, 0.28, 117, 0, 0.46, 0.115, 0.36, 1, 0.08, 0.05, 0.14],
    [0.66, 0, 0.73, 0.29, 125, 0, 0.5, 0.13, 0.42, 1, 0.08, 0.06, 0.15], [0.82, 0.02, 0.82, 0.27, 100, 0, 0.32, 0.075, 0.3, 1, 0.18, 0.03, 0.06], [1, 0.03, 0.88, 0.25, 75, 0, 0.1, 0.03, 0.15, 1, 0.3, 0, 0]];
  // ---------- wall climbing with the picks: a big rock wall (fixed in the stage), jittered pick pockets + foot ledges; the climber really moves on it.
  // One limb moves at a time in a gait that depends on the direction (up: hand leads, down: feet lead, traverse: lead side first), each move lands
  // the pick tip in a pocket / the toes on a ledge, and the body shifts between moves (push). The camera follows.
  const CL = { ZW: 0.36, TS: 0.4, SV: 0.46, SH: 0.32, tip: V(0.166, 0.308, 0), tipH: V(0, 0.308, 0), AH: 0.085, TOE: 0.168, BX: 8.3, BY0: 0, BY1: 10.2,
    N: { RH: V(-0.24, 1.3, 0), LH: V(0.24, 1.3, 0), RF: V(-0.13, 0.16, 0), LF: V(0.13, 0.16, 0) } };
  const WALL = { X0: -9, X1: 9, Y0: -0.1, Y1: 12.2 }; // trial wall: 18 m wide, 12 m tall (the camera follows the climber)
  function holdGrid(sp, seed) { const r = prng(seed), nx = Math.floor((WALL.X1 - WALL.X0) / sp) + 1, ny = Math.floor((WALL.Y1 - 0.12) / sp) + 1, pts = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) pts.push(V(WALL.X0 + i * sp + (r() - 0.5) * sp * 0.6, 0.12 + j * sp + (r() - 0.5) * sp * 0.6, 0)); return { sp, nx, ny, pts }; }
  const HG = { hand: holdGrid(0.13, 41), foot: holdGrid(0.15, 43) };
  function snapHold(G, p) { const i0 = Math.round((p.x - WALL.X0) / G.sp), j0 = Math.round((p.y - 0.12) / G.sp); let best = null, bd = 1e9;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const i = i0 + di, j = j0 + dj; if (i < 0 || j < 0 || i >= G.nx || j >= G.ny) continue; const q = G.pts[j * G.nx + i], d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2; if (d < bd) { bd = d; best = q; } }
    return (best || p).clone(); }
  const DIRS = { u: [0, 1], d: [0, -1], l: [1, 0], r: [-1, 0], ul: [0.7071, 0.7071], ur: [-0.7071, 0.7071], dl: [0.7071, -0.7071], dr: [-0.7071, -0.7071], stop: [0, 0] };
  function gaitOrder(dx, dy) { const s = dx > 0.3 ? 'L' : 'R', o = s === 'L' ? 'R' : 'L'; if (dy > 0.3) return [s + 'H', o + 'F', o + 'H', s + 'F']; if (dy < -0.3) return [s + 'F', o + 'H', o + 'F', s + 'H']; return [s + 'H', s + 'F', o + 'H', o + 'F']; }
  const isH = (k) => k[1] === 'H';
  function climbInit(P0) { const P = P0 ? V(P0.x, P0.y, 0) : V(0, 0, 0), L = {}; for (const k of ['RH', 'LH', 'RF', 'LF']) { const t = P.clone().add(CL.N[k]); if (isH(k)) t.add(CL.tipH); L[k] = snapHold(isH(k) ? HG.hand : HG.foot, t); }
    return { P, L, slotT: 1, idx: 0, mv: null, from: null, to: null, bf: P.clone(), bt: P.clone(), wt: 0 }; }
  // limb rest offset relative to the body for a hold (hands: grip = pocket - tip)
  const relOf = (k, h, P) => { const r = h.clone().sub(P); if (isH(k)) r.sub(CL.tipH); return r.sub(CL.N[k]); };
  function climbStep(C, dt) { C.slotT += dt * (st.climbFac || 1) / CL.TS;
    if (C.slotT >= 1) { if (C.mv) C.L[C.mv] = C.to; C.mv = null; C.P.copy(C.bt); C.slotT = Math.min(C.slotT - 1, 0.5);
      if (st.climbAuto) { C.wt -= CL.TS; if (C.wt <= 0) { const ks = Object.keys(DIRS).filter((k) => k !== 'stop').filter((k) => { const d = DIRS[k]; return Math.abs(C.P.x + d[0] * 0.8) < CL.BX && C.P.y + d[1] * 0.8 > CL.BY0 - 0.01 && C.P.y + d[1] * 0.8 < CL.BY1; });
        st.climbDir = Math.random() < 0.1 ? 'stop' : ks[(Math.random() * ks.length) | 0] || 'u'; C.wt = 2.5 + Math.random() * 2.5; markClimb(); } }
      const dv = DIRS[st.climbDir] || DIRS.stop, s = V(dv[0] * CL.SH, dv[1] * CL.SV, 0);
      let blk = ''; if (Math.abs(C.P.x + s.x * 0.25) > CL.BX) { s.x = 0; blk = 'side'; } if (C.P.y + s.y * 0.25 < CL.BY0) { s.y = 0; blk = 'bottom'; } else if (C.P.y + s.y * 0.25 > CL.BY1) { s.y = 0; blk = 'top'; } C.blk = blk; C.bf = C.P.clone(); C.bt = C.P.clone();
      if (s.lengthSq() > 1e-6) { const ord = gaitOrder(dv[0], dv[1]), sl = s.length(), sn = s.clone().divideScalar(sl), Pn = C.P.clone().addScaledVector(s, 0.25);
        // the limb furthest behind moves first if it is near its reach limit, else the gait order
        let k = ord[C.idx % 4], worst = 0; for (const q of ord) { const lag = -relOf(q, C.L[q], Pn).dot(sn) / sl; if (lag > 0.62 && lag > worst) { worst = lag; k = q; } } C.idx++;
        const tg = C.P.clone().add(CL.N[k]).addScaledVector(s, 0.75); if (isH(k)) { tg.add(CL.tipH); tg.x = k === 'RH' ? Math.min(tg.x, C.P.x - 0.21) : Math.max(tg.x, C.P.x + 0.21); } C.mv = k; C.from = C.L[k].clone(); C.to = snapHold(isH(k) ? HG.hand : HG.foot, tg);
        let ok = true; for (const q of ['RH', 'LH', 'RF', 'LF']) { if (q === k) continue; const r = relOf(q, C.L[q], Pn); if (Math.abs(r.x) > 0.3 || Math.abs(r.y) > 0.34 || (isH(q) && (q[0] === 'L' ? r.x : -r.x) < -0.05)) ok = false; } if (ok) C.bt = Pn; } }
    const u = C.slotT, P = C.bf.clone().lerp(C.bt, ss(0.3, 0.95, u)), out = { P, H: {}, F: {}, mv: C.mv, mu: 0, up: 0, blk: C.blk || '' };
    for (const k of ['RH', 'LH', 'RF', 'LF']) { let h = C.L[k], sn = 0, a = 0, m = 0; if (k === C.mv) { m = clamp(u / 0.62, 0, 1); h = C.from.clone().lerp(C.to, ss(0.12, 0.88, m)); sn = Math.sin(Math.PI * m); out.mu = m; out.up = C.to.y - C.from.y;
        if (isH(k)) a = m < 0.38 ? -1.05 * ss(0, 0.38, m) : -1.05 * (1 - ((m - 0.38) / 0.62) ** 2); }
      const r = h.clone().sub(P); if (isH(k)) out.H[k[0]] = { g: V(r.x - CL.tip.x * 0, r.y - CL.tip.y + 0.04 * sn, CL.ZW + 0.004 - CL.tip.x - 0.14 * sn), a, tipW: h };
      else out.F[k[0]] = { a: V(r.x, r.y + CL.AH + 0.06 * sn, CL.ZW - CL.TOE - 0.09 * sn), sn }; }
    return out; }
  /* ---------- Tether vertical system: anchor pin > rappel (bounding hops, rope feeding from the anchor) / ascender winch (reels up, feet walk the wall) > unclip + coil > picks.
     an.tv = { k: 'anchor' | 'clip' | 'prep' | 'rappel' | 'hang' | 'ascend' | 'coil' | 'draw', t, A: anchor (wall frame), P: body (wall frame), fac: tether-grade speed } */
  // Tether timing. Rappel and ascend move in push-off bounds: feet kick off the wall, the body swings out in an arc on the taut line, then swings back in to the
  // next foot contact (rappel drops hop m per bound of hopT s; the ascender winch reels aD m per bound of aT s while she pushes off). x the Tether grade factor.
  const TV = { landT: 0.9, anchorT: 1.6, coilT: 1.9, hop: 0.9, hopT: 0.81, aD: 0.9, aT: 0.97, sw: 0.36, top: 1.08 }; // rappel 0.9/0.81 = 1.11 m/s, ascend 0.9/0.97 = 0.93 m/s: 1.5x the original 4bcd32e speeds (0.74 / 0.62 m/s) at the base grade; per-grade factor T.fac unchanged
  // one push-off bound at phase h: o = swing-out distance off the wall, contact = feet on the rock, tuck = knee flex in the air, land = absorb on the return
  function bound(h) { const o = TV.sw * Math.sin(Math.PI * ss(0.05, 0.92, h)), push = Math.sin(Math.PI * ss(0, 0.2, h)), land = Math.sin(Math.PI * ss(0.82, 1, h)), tuck = Math.sin(Math.PI * ss(0.18, 0.78, h)), fly = ss(0.12, 0.22, h) * (1 - ss(0.8, 0.9, h)); return { o, push, land, tuck, fly }; }
  function boundPose(out, b, rel) { let hz = -0.27 - b.o - 0.08 * b.push + 0.07 * b.land, hipX = -0.36 - 0.12 * b.o / TV.sw + 0.06 * b.land;
    for (const [k, sx, lag] of [['R', -0.12, 0], ['L', 0.12, 0.04]]) { const fo = b.o * (0.8 - 0.1 * b.fly) + lag * b.fly, y = rel + 0.1 * b.fly * b.tuck - 0.04 * b.land;
      out.F[k] = { a: V(sx * (1 + 0.25 * b.fly), y, CL.ZW - 0.13 - fo * b.fly), sn: 0.65 * b.tuck * b.fly + 0.45 * b.land, p: -0.55 + 0.3 * b.tuck * b.fly }; }
    return { hz, hipX }; }
  function tetherPose(T, dt) { const P = T.P, out = { P: P.clone(), H: null, F: {}, mv: null, mu: 0, up: 0, blk: '' }; let hz = -0.27, hipX = -0.36, rope = null;
    if (T.k === 'rappel') { if (T.y0 === undefined) { T.y0 = P.y; T.D = Math.min(TV.hop, T.y0); } T.h = (T.h || 0) + dt * T.fac / TV.hopT;
      if (T.h >= 1) { P.y = T.y0 - T.D; T.h -= 1; T.y0 = P.y; T.D = Math.min(TV.hop, T.y0); if (T.D < 1e-3) { T.k = 'hang'; T.h = 0; P.y = 0; } }
      const h = T.k === 'hang' ? 0 : T.h, b = bound(h); P.y = T.y0 - T.D * ss(0.1, 0.86, h); out.P.copy(P); const r = boundPose(out, b, 0.4); hz = r.hz; hipX = r.hipX;
      rope = { L: V(0.04, 1.06 - 0.04 * b.o / TV.sw, -0.2), R: V(-0.21, 0.66 + 0.05 * b.o / TV.sw, -0.42 - 0.05 * b.push) }; out.blk = ''; }
    else if (T.k === 'hang') { if (P.y <= 0.001) { T.land = (T.land || 0) + dt; if (T.land > TV.landT && !T.unanchor) { T.k = 'coil'; T.t = 0; T.unanchor = true; T.ground = true; } } else T.land = 0; out.F.R = { a: V(-0.12, 0.4, CL.ZW - 0.13), sn: 0, p: -0.55 }; out.F.L = { a: V(0.12, 0.4, CL.ZW - 0.13), sn: 0, p: -0.55 }; rope = { L: V(0.04, 1.06, -0.2), R: V(-0.21, 0.66, -0.42) }; out.blk = P.y <= 0.001 ? 'bottom' : ''; }
    else if (T.k === 'ascend' || T.k === 'coil' || T.k === 'draw') { const top = T.A.y - TV.top; let b = null;
      if (T.k === 'ascend') { if (T.y0 === undefined) { T.y0 = P.y; T.D = Math.max(0, Math.min(TV.aD, top - T.y0)); } T.h = (T.h || 0) + dt * T.fac / TV.aT;
        if (T.h >= 1) { P.y = T.y0 + T.D; T.h -= 1; T.y0 = P.y; T.D = Math.max(0, Math.min(TV.aD, top - T.y0)); }
        if (T.D < 1e-3) { T.k = 'coil'; T.t = 0; } else { b = bound(T.h); P.y = T.y0 + T.D * ss(0.08, 0.84, T.h); T.ph = T.h; } }
      out.P.copy(P); hz = -0.24; hipX = -0.26;
      if (b) { const r = boundPose(out, b, 0.42); hz = r.hz + 0.03; hipX = r.hipX + 0.1; }
      else for (const [k, sx] of [['R', -0.12], ['L', 0.12]]) out.F[k] = { a: V(sx, 0.42, CL.ZW - 0.13), sn: 0, p: -0.5 };
      rope = T.k === 'draw' ? null : T.k === 'coil' ? (() => { const u = T.t / TV.coilT, a = TAU * 2.5 * ss(0.15, 0.85, u); return { L: V(-0.08, 1.02, -0.14), R: V(-0.26 + 0.06 * Math.cos(a), 0.86 + 0.08 * Math.sin(a), -0.2 + 0.05 * Math.sin(a)) }; })() : { L: V(-0.02, 1.16, -0.14), R: V(-0.14, 1.08, -0.16) }; }
    out.hz = hz; out.hipX = hipX; out.rope = rope; return out; }
  function tetherTick(T, dt) { T.t = (T.t || 0) + dt; if (T.pose) T.bw = Math.min(1, (T.bw || 0) + dt / 0.5); const Q = an.eq;
    if (T.k === 'anchor' && T.t >= TV.anchorT) { T.k = 'clip'; T.t = 0; T.clipped = true; T.depth = 0.4; }
    else if (T.k === 'clip' && T.t >= 0.35) { T.k = 'anchored'; T.t = 0; }
    else if (T.k === 'prep' && Q && !Q.seq && Q.held === 'none') { T.k = T.next; T.t = 0; T.pose = true; T.bw = 0; T.h = 0; T.y0 = undefined; }
    else if (T.k === 'coil' && T.t >= TV.coilT) { T.k = 'draw'; T.t = 0; T.free = false; T.clipped = false; }
    else if (T.k === 'draw' && Q && !Q.seq && Q.held === 'climb') { if (T.ground) { an.tv = null; markTether(); dismount(T.P); return; } an.cl = climbInit(T.P); an.tv = null; markTether(); return; }
    if (T.k === 'coil' && T.t > 0.3) T.pin = false; if (T._mk !== T.k + T.clipped) { T._mk = T.k + T.clipped; markTether(); } }
  /* ---------- on the ground at the foot of the wall: step off, walk with the pad (run cycle, smooth turns), walk back into the wall to climb again ---------- */
  const DMAX = 40; // max zoom-out distance (frames the whole wall and the field)
  const GW = { spd: 3.7, walk: 1.2, back: 0.45, X0: -21, X1: 21, Z0: -24, turn: 9 }, WX0 = WALL.X0 + 0.5, WX1 = WALL.X1 - 0.5; // the ground is a big field in front of (and wider than) the wall
  function dismount(P) { st.gnd = { x: P.x, z: 0, face: 0, mv: 0, back: GW.back, vx: 0, vz: 0 }; an.cl = climbInit(V(P.x, 0, 0)); an.tv = null; an.gb = 0; st.climbDir = 'stop'; st.climbAuto = false; st.tvK = null; st.climbBlk = ''; markTether(); markClimb(); const nt = document.querySelector('#charClimb .cnote'); if (nt) nt.textContent = 'On the ground: tap to move, tap the wall to climb'; if (st.pg) { st.gnd.back = 0.25; } }

  /* ---------- tap-to-move path planning: grid A* (8-directional, no corner cutting) over a walkability grid of the bounds minus the solid
     obstacles (inflated by her body radius + clearance), then string-pulled with exact segment-vs-circle line of sight (any-angle, so the path is
     the true shortest route around things in any direction). The walker follows it with a look-ahead carrot and smoothed heading (curved turns). */
  const BODY = 0.2, NAVC = 0.15; // body radius (also used by the push-out) and extra planning clearance for the curved follow
  function navObs(G) { return G && G.home ? (G.obs || []) : FIELD_OBS; }
  function navBounds(G) { const B = G && G.bnd; return B ? { X0: B.X0, X1: B.X1, Z0: B.Z0, Z1: B.Z1 } : { X0: GW.X0, X1: GW.X1, Z0: GW.Z0, Z1: -0.12 }; }
  function segClear(ax, az, bx, bz, obs, pad) { const vx = bx - ax, vz = bz - az, L2 = vx * vx + vz * vz; for (const o of obs) { let t = L2 > 1e-9 ? ((o.x - ax) * vx + (o.z - az) * vz) / L2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t; const dx = ax + vx * t - o.x, dz = az + vz * t - o.z, rr = o.r + pad; if (dx * dx + dz * dz < rr * rr) return false; } return true; }
  function navPlan(G, sx, sz, tx, tz) { const obs = navObs(G), B = navBounds(G), h = G && G.home ? 0.1 : 0.25, pad = BODY + NAVC;
    tx = clamp(tx, B.X0, B.X1); tz = clamp(tz, B.Z0, B.Z1); const nx = Math.max(2, Math.ceil((B.X1 - B.X0) / h) + 1), nz = Math.max(2, Math.ceil((B.Z1 - B.Z0) / h) + 1), cx = (i) => Math.min(B.X1, B.X0 + i * h), cz = (j) => Math.min(B.Z1, B.Z0 + j * h);
    const near = obs.filter((o) => o.x > B.X0 - o.r - pad && o.x < B.X1 + o.r + pad && o.z > B.Z0 - o.r - pad && o.z < B.Z1 + o.r + pad), free = new Uint8Array(nx * nz);
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const x = cx(i), z = cz(j); let f = 1; for (const o of near) { const dx = x - o.x, dz = z - o.z, rr = o.r + pad; if (dx * dx + dz * dz < rr * rr) { f = 0; break; } } free[i * nz + j] = f; }
    const cellOf = (x, z) => [clamp(Math.round((x - B.X0) / h), 0, nx - 1), clamp(Math.round((z - B.Z0) / h), 0, nz - 1)];
    const nearestFree = (i0, j0) => { if (free[i0 * nz + j0]) return [i0, j0]; for (let R = 1; R < Math.max(nx, nz); R++) { let best = null, bd = 1e9; for (let i = i0 - R; i <= i0 + R; i++) for (let j = j0 - R; j <= j0 + R; j++) { if (Math.max(Math.abs(i - i0), Math.abs(j - j0)) !== R || i < 0 || j < 0 || i >= nx || j >= nz || !free[i * nz + j]) continue; const d = (i - i0) ** 2 + (j - j0) ** 2; if (d < bd) { bd = d; best = [i, j]; } } if (best) return best; } return [i0, j0]; };
    const [si, sj] = nearestFree(...cellOf(sx, sz)), g0 = cellOf(tx, tz), [gi, gj] = nearestFree(g0[0], g0[1]), snapped = gi !== g0[0] || gj !== g0[1], gx = snapped ? cx(gi) : tx, gz = snapped ? cz(gj) : tz;
    if (segClear(sx, sz, gx, gz, near, pad - 0.02)) return { pts: [{ x: gx, z: gz }], goal: { x: gx, z: gz }, snapped, h };
    const N = nx * nz, gs = new Float32Array(N).fill(1e9), par = new Int32Array(N).fill(-1), closed = new Uint8Array(N), heap = [], S0 = si * nz + sj, GI = gi * nz + gj, H = (i, j) => { const dx = Math.abs(i - gi), dz = Math.abs(j - gj); return (dx + dz + (Math.SQRT2 - 2) * Math.min(dx, dz)) * h; };
    const push = (f, n) => { heap.push([f, n]); let k = heap.length - 1; while (k > 0) { const q = (k - 1) >> 1; if (heap[q][0] <= heap[k][0]) break; [heap[q], heap[k]] = [heap[k], heap[q]]; k = q; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const a = 2 * k + 1, b = a + 1; let m = k; if (a < heap.length && heap[a][0] < heap[m][0]) m = a; if (b < heap.length && heap[b][0] < heap[m][0]) m = b; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
    gs[S0] = 0; push(H(si, sj), S0); let found = false;
    while (heap.length) { const [, n] = pop(); if (closed[n]) continue; closed[n] = 1; if (n === GI) { found = true; break; } const i = (n / nz) | 0, j = n % nz;
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) { if (!di && !dj) continue; const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const m = a * nz + b; if (!free[m] || closed[m]) continue; if (di && dj && (!free[i * nz + b] || !free[a * nz + j])) continue;
        const ng = gs[n] + (di && dj ? Math.SQRT2 : 1) * h; if (ng < gs[m]) { gs[m] = ng; par[m] = n; push(ng + H(a, b), m); } } }
    if (!found) return null;
    const raw = []; for (let n = GI; n !== -1; n = par[n]) raw.push({ x: cx((n / nz) | 0), z: cz(n % nz) }); raw.reverse(); raw[0] = { x: sx, z: sz }; raw[raw.length - 1] = { x: gx, z: gz };
    // string pulling: from each kept point jump to the farthest later point still in clear line of sight
    const out = []; let a = 0; while (a < raw.length - 1) { let b = raw.length - 1; while (b > a + 1 && !segClear(raw[a].x, raw[a].z, raw[b].x, raw[b].z, near, pad - 0.02)) b--; out.push(raw[b]); a = b; }
    return { pts: out, goal: { x: gx, z: gz }, snapped, h }; }
  function pathLen(sx, sz, pts) { let L = 0, px = sx, pz = sz; for (const q of pts) { L += Math.hypot(q.x - px, q.z - pz); px = q.x; pz = q.z; } return L; }
  // walk there: plan, then hand the walker the path; done() runs on arrival (at the snapped goal if the tap was inside something)
  function navTo(G, x, z, done) { const P = navPlan(G, G.x, G.z, x, z); if (!P) { G.path = null; G.goal = { x, z, done }; return null; } G.path = P.pts.slice(); G.pi = 0; G.goal = { x: P.goal.x, z: P.goal.z, done }; return P; }
  // the look-ahead point on the remaining path (pure pursuit): her heading eases toward it, so corners become curves
  function navCarrot(G, L) { const P = G.path; while (G.pi < P.length - 1 && Math.hypot(P[G.pi].x - G.x, P[G.pi].z - G.z) < L * 0.6) G.pi++;
    let px = G.x, pz = G.z, rem = L; for (let i = G.pi; i < P.length; i++) { const q = P[i], d = Math.hypot(q.x - px, q.z - pz); if (d >= rem || i === P.length - 1) { const t = d > 1e-6 ? Math.min(1, rem / d) : 1; return { x: px + (q.x - px) * t, z: pz + (q.z - pz) * t }; } rem -= d; px = q.x; pz = q.z; } return P[P.length - 1]; }
  function groundTick(dt) { const G = st.gnd; let dx = 0, dz = 0;
    if (G.back > 0) { const s2 = Math.min(G.back, dt * 0.625); G.z -= s2; G.back -= s2; G.mv = 0; if (G.back <= 0 && st.pg && st.pg.ph === 'down') pgGround(); return; } // step back off the wall onto both feet
    if (st.pg && st.pg.ph === 'down') pgGround();
    if (G.goal) { const ex = G.goal.x - G.x, ez = G.goal.z - G.z, L = Math.hypot(ex, ez); if (L < 0.03) { const g2 = G.goal; G.goal = null; G.path = null; G.mv = Math.min(G.mv, 0.1); if (g2.done) g2.done(); } else if (G.path && G.path.length > 1 && L > 0.25) { const lk = st.gait === 'walk' ? 0.4 : 0.6, c = navCarrot(G, lk), cx2 = c.x - G.x, cz2 = c.z - G.z, cl = Math.hypot(cx2, cz2) || 1; dx = cx2 / cl; dz = cz2 / cl; } else { dx = ex / L; dz = ez / L; } }
    else { const d = DIRS[st.climbDir] || DIRS.stop; dx = d[0]; dz = d[1]; }
    const want = Math.hypot(dx, dz) > 0.01 ? 1 : 0; G.mv += (want - G.mv) * (1 - Math.exp(-dt * 8));
    if (want) { const fa = Math.atan2(dx, dz); let df = fa - G.face; df = Math.atan2(Math.sin(df), Math.cos(df)); G.face += df * (1 - Math.exp(-dt * GW.turn)); }
    const sp = (st.gait === 'walk' ? GW.walk : GW.spd) * G.mv * (want ? Math.max(0.25, Math.cos(Math.min(1.4, Math.abs(Math.atan2(Math.sin(Math.atan2(dx, dz) - G.face), Math.cos(Math.atan2(dx, dz) - G.face)))))) : 1), nx = G.x + (want ? dx : Math.sin(G.face)) * sp * dt * (want || G.mv > 0.02 ? 1 : 0), nz = G.z + (want ? dz : Math.cos(G.face)) * sp * dt * (want || G.mv > 0.02 ? 1 : 0);
    const Bd = G.bnd || { X0: GW.X0, X1: GW.X1, Z0: GW.Z0, Z1: 0 }, px0 = G.x, pz0 = G.z; G.x = clamp(nx, Bd.X0, Bd.X1); G.z = clamp(nz, Bd.Z0, Bd.Z1); for (const o of navObs(G)) { const ex = G.x - o.x, ez = G.z - o.z, L = Math.hypot(ex, ez), rr = o.r + BODY; if (L < rr && L > 1e-4) { G.x = o.x + ex / L * rr; G.z = o.z + ez / L * rr; } } G.vel = dt > 0 ? Math.hypot(G.x - px0, G.z - pz0) / dt : 0;
    if (!G.home && want && dz > 0.3 && G.z >= -0.02 && G.x > WX0 && G.x < WX1 && Math.abs(Math.atan2(Math.sin(G.face), Math.cos(G.face))) < 0.9) mount(); }
  /* ---------- Playground: tap the ground to run there, tap the wall to run to its foot, mount and climb to the spot ---------- */
  let PGM = null; const _ray = new THREE.Raycaster();
  function pgMark(hit) { if (!PGM) { PGM = new THREE.Group(); const m = new THREE.MeshBasicMaterial({ color: 0xfff1c2, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }); PGM.add(new THREE.Mesh(new THREE.RingGeometry(0.07, 0.1, 32), m), new THREE.Mesh(new THREE.CircleGeometry(0.025, 16), m)); PGM.userData.m = m; PGM.renderOrder = 5; scene.add(PGM); }
    PGM.visible = !!hit; if (!hit) return; const wl = st.home ? { rotation: { y: 0 } } : WALLG; PGM.position.copy(hit.wall ? V(hit.x, hit.y, CL.ZW - 0.012) : V(hit.x, 0.006, hit.z)).applyAxisAngle(V(0, 1, 0), wl ? wl.rotation.y : st.yaw); PGM.rotation.set(hit.wall ? 0 : -Math.PI / 2, hit.wall ? (wl ? wl.rotation.y : st.yaw) : 0, 0, 'YXZ'); PGM.userData.t = 0; PGM.userData.m.opacity = 0.9; }
  function pgFade(dt) { if (!PGM || !PGM.visible) return; const m = PGM.userData.m; if (st.pg) { PGM.scale.setScalar(1 + 0.12 * Math.sin(clk * 6)); return; } PGM.userData.t += dt; m.opacity = 0.9 * Math.max(0, 1 - PGM.userData.t / 0.8); if (PGM.userData.t > 0.8) PGM.visible = false; }
  function pgScreen(h) { const wl = WALLG, q = (h.wall ? V(h.x, h.y, CL.ZW) : V(h.x, 0, h.z)).applyAxisAngle(V(0, 1, 0), wl ? wl.rotation.y : st.yaw).project(cam), r = canvas.getBoundingClientRect(); return { x: r.left + (q.x + 1) / 2 * r.width, y: r.top + (1 - q.y) / 2 * r.height }; }
  // screen point -> wall-frame hit: { wall: true, x, y } on the climbing wall, or { x, z } on the ground in front of it
  function pgPick(cx, cy) { const r = canvas.getBoundingClientRect(), nd = new THREE.Vector2((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); _ray.setFromCamera(nd, cam);
    const yw = WALLG ? WALLG.rotation.y : st.yaw, o = _ray.ray.origin.clone().applyAxisAngle(V(0, 1, 0), -yw), d = _ray.ray.direction.clone().applyAxisAngle(V(0, 1, 0), -yw);
    if (d.z > 1e-4) { const t = (CL.ZW - o.z) / d.z, q = o.clone().addScaledVector(d, t); if (t > 0 && q.y > 0.05 && q.y < CL.BY1 + 1.2 && q.x > WX0 && q.x < WX1) return { wall: true, x: q.x, y: q.y }; }
    if (d.y < -1e-4) { const t = -o.y / d.y, q = o.clone().addScaledVector(d, t); if (t > 0 && q.z <= CL.ZW && q.z > GW.Z0 - 0.6 && Math.abs(q.x) < GW.X1 + 0.6) return { x: clamp(q.x, GW.X0, GW.X1), z: clamp(q.z, GW.Z0, -0.2) }; }
    return null; }
  function pgGo(hit) { if (!(st.play || st.anim === 'climb') || st.ledge || !hit) return false; pgMark(hit); st.pg = hit.wall ? { wall: true, x: clamp(hit.x, WX0, WX1), y: clamp(hit.y - 1.1, 0, CL.BY1), ph: 'run' } : { x: hit.x, z: hit.z, ph: 'run' }; const P = st.pg; st.climbAuto = false;
    if (st.gnd) pgGround(); else if (an.tv) P.ph = 'unclip'; else if (an.act === 'climb') { if (P.wall) P.ph = 'climb'; else P.ph = 'down'; } st.lastInput = clk; return true; }
  function pgGround() { const P = st.pg, G = st.gnd; if (!P || !G) return; G.back = 0; P.ph = 'run'; if (!P.wall) navTo(G, P.x, P.z, () => { if (st.pg === P) { st.pg = null; P.ph = 'done'; } });
    else { const bx = wallBase(P.x); navTo(G, bx, -0.3, () => { if (st.pg !== P || !st.gnd) return; st.gnd.path = null; st.gnd.goal = { x: bx, z: 0, done: () => { if (st.pg !== P || !st.gnd) return; st.gnd.face = 0; P.ph = 'climb'; mount(); st.climbDir = 'stop'; } }; }); } }
  // the reachable foot of the wall nearest below a tapped spot: the closest x along the base whose step-up strip is clear of obstacles
  function wallBase(x) { x = clamp(x, WX0, WX1); const ok = (q) => q >= WX0 && q <= WX1 && segClear(q, -0.3, q, 0, FIELD_OBS, BODY + 0.05); for (let d = 0; d < 12; d += 0.1) { if (ok(x - d)) return x - d; if (ok(x + d)) return x + d; } return x; }
  // while climbing toward a tapped wall spot (or down to the ground for a ground tap), steer the pad one slot at a time
  function pgClimb(C) { const P = st.pg; if (!P || an.tv) return; let k = 'stop'; if (P.ph === 'unclip' || P.ph === 'run') P.ph = P.wall ? 'climb' : 'down';
    if (P.ph === 'climb') { const dx = P.x - C.P.x, dy = P.y - C.P.y, L = Math.hypot(dx, dy); if (L < 0.2 || (P.bt = C.blk ? (P.bt || 0) + 1 : 0) > 45 || (P.last && DIRS[P.last][0] * dx + DIRS[P.last][1] * dy < -0.02)) { st.pg = null; P.ph = 'done'; } else { let best = -2; for (const q in DIRS) { if (q === 'stop') continue; const v = DIRS[q], dd = (v[0] * dx + v[1] * dy) / L / Math.hypot(v[0], v[1]); if (dd > best) { best = dd; k = q; } } if (C.mu < 0.05) P.last = k; } }
    else if (P.ph === 'down') { k = 'd'; if (st.gnd) { P.ph = 'run'; pgGround(); return; } }
    if (st.climbDir !== k) { st.climbDir = k; markClimb(); } }
  function mount() { const G = st.gnd; st.gnd = null; an.cl = climbInit(V(G.x, 0, 0)); an.act = 'climb'; an.at = 0; an.mw = 0.6; if (!(st.climbDir in DIRS) || st.climbDir === 'stop' || /^d/.test(st.climbDir)) st.climbDir = 'stop'; st.climbDir = /^u/.test(st.climbDir) ? st.climbDir : 'stop'; markClimb(); const nt = document.querySelector('#charClimb .cnote'); if (nt) nt.textContent = ''; if (G.onMount) G.onMount(); if (st.pg) { if (st.pg.wall) { st.pg.ph = 'climb'; st.climbDir = 'stop'; } else st.pg = null; } }
  function tetherAct(k) { if ((an.act !== 'climb' && st.anim !== 'climb') || st.gnd) return; const P = an.cl ? an.cl.P.clone() : V(0, 0, 0); let T = an.tv; st.climbAuto = false; st.climbDir = 'stop'; markClimb(); const g = rig && rig.built.tethers && rig.built.tethers[0] && rig.built.tethers[0].grp, tier = g ? (TGRADES[g.userData.grade] || { tier: 0 }).tier : 0, fac = 1 + 0.07 * tier;
    if (k === 'anchor' && T && T.clipped) k = 'unanchor'; // once clipped, the Anchor button reads Unanchor
    if (k === 'unanchor') { if (!T || !T.clipped || T.k === 'coil' || T.k === 'draw') return;
      if (!T.pose) { T.pin = false; an.tv = null; if (!an.cl) an.cl = climbInit(T.P); markTether(); return; } // still on the picks: just unclip and carry on climbing
      T.k = 'coil'; T.t = 0; T.unanchor = true; markTether(); return; } // on the rope: coil the line from where she hangs, then back onto the picks right here
    if (k === 'stop') { if (T && (T.k === 'rappel' || T.k === 'ascend' || T.k === 'prep')) { if (T.k === 'prep') { T.k = 'anchored'; T.free = false; } else { T.k = 'hang'; T.h = 0; T.y0 = undefined; T.D = 0; } } markTether(); return; }
    if ((k === 'rappel' || k === 'ascend') && T && T.k === k) return tetherAct('stop'); // tapping the running action again stops on the rope
    if (k === 'anchor') { if (T) return; an.tv = { k: 'anchor', t: 0, A: V(clamp(P.x - 0.42, WALL.X0 + 0.2, WALL.X1 - 0.2), P.y + 1.02, 0), P, fac, depth: 1 }; }
    else if (k === 'rappel' || k === 'ascend') { if (!T || !T.clipped || T.k === 'coil' || T.k === 'draw' || T.k === 'anchor') return; T.fac = fac;
      if (k === 'ascend' && T.P.y >= T.A.y - TV.top - 1e-3) return;
      if (T.pose) { T.k = k; T.t = 0; T.h = 0; T.y0 = undefined; T.D = 0; } else { T.k = 'prep'; T.next = k; T.free = true; T.t = 0; } }
    markTether(); }
  function markTether() { const T = an.tv; document.querySelectorAll('#charClimb [data-tv]').forEach((b) => { const k = b.dataset.tv; b.classList.toggle('on', !!T && (T.k === k || (T.k === 'hang' && k === 'rappel') || (T.k === 'prep' && T.next === k) || (k === 'anchor' && !!T.clipped)));
      b.classList.toggle('dis', st.gnd ? true : k === 'anchor' ? !!T && !(T.clipped && T.k !== 'coil' && T.k !== 'draw') : !T || !T.clipped || T.k === 'coil' || T.k === 'draw');
      if (k === 'anchor') { const un = !!T && !!T.clipped; if (b.textContent !== (un ? 'Unanchor' : 'Anchor')) { b.textContent = un ? 'Unanchor' : 'Anchor'; b.title = un ? 'Unclip from the Tether here, coil it and climb on from this spot' : 'Drive an anchor pin and clip the Tether'; } } }); }
  /* ---------- the paid-out Tether line: built from the pack coil's own cord recipe (same core + twisted strand materials, strand count, thickness, vine leaves), drawn as live tubes ---------- */
  // a tube whose centreline is set every frame (parallel-transport frames, uv wraps the strand texture so it twists along the length)
  function dynTube(M, RS, mat) { const n = (M + 1) * (RS + 1), geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
    const idx = []; for (let i = 0; i < M; i++) for (let j = 0; j < RS; j++) { const a = i * (RS + 1) + j, b = a + RS + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); } geo.setIndex(idx); const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.castShadow = true; m.userData = { M, RS }; m.visible = false; return m; }
  const _tn = V(0, 0, 0), _tb = V(0, 0, 0), _tt = V(0, 0, 0), _tp = V(0, 0, 0);
  function setTube(m, pts, rad, curve = true) { const { M, RS } = m.userData, P = curve && pts.length > 2 ? new THREE.CatmullRomCurve3(pts, false, 'centripetal').getSpacedPoints(M) : Array.from({ length: M + 1 }, (_, i) => { const u = i / M * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(u)); return pts[k].clone().lerp(pts[k + 1], u - k); });
    const pos = m.geometry.attributes.position, nor = m.geometry.attributes.normal, uv = m.geometry.attributes.uv, tw = 3; let s = 0;
    _tt.copy(P[1]).sub(P[0]).normalize(); _tn.set(0, 0, 1); if (Math.abs(_tt.z) > 0.9) _tn.set(1, 0, 0); _tn.addScaledVector(_tt, -_tn.dot(_tt)).normalize();
    for (let i = 0; i <= M; i++) { if (i) s += P[i].distanceTo(P[i - 1]); _tt.copy(P[Math.min(M, i + 1)]).sub(P[Math.max(0, i - 1)]).normalize(); _tn.addScaledVector(_tt, -_tn.dot(_tt)).normalize(); _tb.crossVectors(_tt, _tn);
      for (let j = 0; j <= RS; j++) { const a = j / RS * TAU, k = i * (RS + 1) + j; _tp.copy(_tn).multiplyScalar(Math.cos(a)).addScaledVector(_tb, Math.sin(a)); nor.setXYZ(k, _tp.x, _tp.y, _tp.z); pos.setXYZ(k, P[i].x + _tp.x * rad, P[i].y + _tp.y * rad, P[i].z + _tp.z * rad); uv.setXY(k, j / RS, s / (rad * TAU * tw)); } const F = m.userData.F || (m.userData.F = { N: [], B: [], s: [] }); F.N[i] = (F.N[i] || V(0, 0, 0)).copy(_tn); F.B[i] = (F.B[i] || V(0, 0, 0)).copy(_tb); F.s[i] = s; }
    pos.needsUpdate = nor.needsUpdate = uv.needsUpdate = true; m.geometry.computeBoundingSphere(); m.visible = true; return P; }
  // twisted strands laid round a live core tube, the same way makeTether lays them round each coil loop
  function cordStrands(core, P, list, cd, rad, pitch) { const F = core.userData.F, M = P.length - 1; for (let j = 0; j < list.length; j++) { const st2 = list[j], dir = cd.braid ? (j % 2 ? -1 : 1) : 1, ph = (cd.braid ? Math.floor(j / 2) / (cd.NS / 2) : j / cd.NS) * TAU, off = rad * cd.off, pts = st2.userData.pts || (st2.userData.pts = P.map(() => V(0, 0, 0)));
      for (let i = 0; i <= M; i++) { const th = dir * F.s[i] / pitch * TAU + ph; pts[i].copy(P[i]).addScaledVector(F.N[i], off * Math.cos(th)).addScaledVector(F.B[i], off * Math.sin(th)); } setTube(st2, pts, rad * cd.sr(j), false); } }
  function tetherRope(c, T) { if (!c.wall) return; const W2 = c.wall; if (!W2.userData.pin) { const g = new THREE.Group(), m = toon(0x6a6e74); part(g, cyl(0.007, 0.007, 0.07, 8), m, [0, 0, -0.03], [Math.PI / 2, 0, 0]); part(g, rbox(0.03, 0.05, 0.006, 0.003), m, [0, -0.012, -0.066]); part(g, new THREE.TorusGeometry(0.013, 0.0035, 6, 14), toon(0xb8902c), [0, -0.03, -0.072], [0, 0, 0], null, { ink: false }); g.visible = false; W2.add(g); W2.userData.pin = g;
      W2.userData.ropes = [dynTube(160, 8, toon(0x4a5a26)), dynTube(220, 8, toon(0x4a5a26))]; W2.userData.str = { gk: null, s: [[], []] }; for (const r of W2.userData.ropes) scene.add(r); W2.userData.leaves = []; }
    const pin = W2.userData.pin, ropes = W2.userData.ropes, B = c.B, show = !!T && T.k !== 'anchor0';
    for (const r of ropes) r.visible = false; for (const L2 of W2.userData.str.s) for (const m of L2) m.visible = false; pin.visible = !!T && !!T.A && T.pin !== false; if (!pin.visible) return; pin.position.set(T.A.x, T.A.y, CL.ZW - 0.002 + 0.03 * (1 - (T.depth ?? 1)));
    for (const lf of W2.userData.leaves) lf.visible = false; if (!show || !T.clipped) return; const tg0 = c.built.tethers && c.built.tethers[0], coil = tg0 && tg0.grp, gk = coil ? coil.userData.grade : 'regular', cd = coil && coil.userData.cord, SR = W2.userData.str;
    if (cd && SR.gk !== gk) { SR.gk = gk; for (const L2 of SR.s) { for (const m of L2) { scene.remove(m); m.geometry.dispose(); } L2.length = 0; } for (let k = 0; k < 2; k++) { ropes[k].material = cd.coreM; for (let j = 0; j < cd.NS; j++) { const m = dynTube(ropes[k].userData.M, 6, j % 2 ? cd.cordM2 : cd.cordM); scene.add(m); SR.s[k].push(m); } } }
    const ws = coil ? coil.getWorldScale(V(0, 0, 0)).x : 1, rad = (tg0 ? tg0.o.tr : 0.0105) * ws, pitch = cd ? cd.pitch * rad : 0.05; // same cord thickness and lay as the coil on the pack
    // rig: the line runs from the anchor down to the winch at the front centre of the belt; from the winch a slack loop sags and swings back round the
    // right hip to the spool on the pack, the lower (right) hand managing it on the rope; the upper (left) hand rides the main line above the winch
    W2.updateMatrixWorld(true); const top = W2.localToWorld(V(T.A.x, T.A.y - 0.03, CL.ZW - 0.072)), wn = c.built.winch; let end = wn ? wn.localToWorld(V(0, 0.03, 0.012)) : B.hips.localToWorld(V(0, 0.06, 0.15)), bot = wn ? wn.localToWorld(V(0, -0.03, 0.012)) : end.clone();
    // the line feeds off the pack coil: leave the bundle at its lowest loop, running a short way round the coil first so it reads as unspooling
    const co = tg0 ? tg0.o : { R: 0.058, sy: 1.75 }, onCoil = (a2, out = 0) => coil.localToWorld(V((co.R + out) * Math.cos(a2), (co.R + out) * co.sy * Math.sin(a2), 0.014)), aE = -Math.PI / 2 - 0.35;
    const spool = coil ? onCoil(aE) : B.hips.localToWorld(V(-0.2, 0.2, -0.15)), feedIn = coil ? [onCoil(aE + 0.5, 0.004), onCoil(aE + 1.0, 0.002), onCoil(aE + 1.5, 0)] : [];
    if (T.k === 'coil') { const u = ss(0.12, 0.9, T.t / TV.coilT); top.lerp(B.hdR.getWorldPosition(V(0, 0, 0)), u); end.lerp(spool, u); bot.lerp(spool, u); }
    const seg = (r, a, b2) => { const d = b2.clone().sub(a), L = d.length(); if (L < 0.004) return; r.visible = true; r.position.copy(a).addScaledVector(d, 0.5); r.scale.set(1, L, 1); r.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); };
    { const P0 = setTube(ropes[0], [top, end], rad * (cd ? cd.core : 1), false); if (cd) cordStrands(ropes[0], P0, SR.s[0], cd, rad, Math.max(pitch, top.distanceTo(end) / 20)); } if (T.k === 'clip') return;
    const held = T.pose && (T.k === 'rappel' || T.k === 'hang' || T.k === 'ascend'), now = clk, sw = Math.sin(now * 2.3) * 0.025, dn = V(0, -1, 0), side = B.hips.localToWorld(V(-0.2, -0.04, 0.02)), pts = [bot];
    const sag = (a, b2, d) => a.clone().lerp(b2, 0.5).addScaledVector(dn, d).add(V(sw, 0, sw * 0.6));
    if (held) { const hd = B.hdR.localToWorld(V(0, -0.06, -0.02)); pts.push(sag(bot, hd, 0.09 + 0.03 * (T.feed || 0)), hd, sag(hd, side, 0.16 + 0.04 * (T.feed || 0))); } else pts.push(sag(bot, side, 0.2));
    pts.push(side, side.clone().lerp(spool, 0.55).add(V(0, 0.02, 0)), spool);
    for (const q of feedIn) pts.push(q); const P = setTube(ropes[1], pts, rad * (cd ? cd.core : 1)); if (cd) cordStrands(ropes[1], P, SR.s[1], cd, rad, Math.max(pitch, (ropes[1].userData.F.s[P.length - 1] || 1) / 36));
    // vine grade: a couple of leaves still on the paid-out line
    if (gk === 'regular' && coil && coil.userData.leaf) { const L = coil.userData.leaf, lv = W2.userData.leaves; while (lv.length < 3) { const m = new THREE.Mesh(L.lg, lv.length % 2 ? L.lm2 : L.lm); m.castShadow = false; scene.add(m); lv.push(m); }
      const M = P.length - 1; [[0.3, 1], [0.62, -1], [0.85, 1]].forEach(([u, sd], k) => { const i = Math.round(u * M), a2 = P[Math.max(0, i - 1)], b2 = P[Math.min(M, i + 1)], t2 = b2.clone().sub(a2).normalize(), m = lv[k]; m.visible = true; m.position.copy(P[i]); m.scale.setScalar(rad / 0.0105 * 1.1);
        const up = V(0, 1, 0).cross(t2).normalize().multiplyScalar(sd).addScaledVector(t2, 0.5).normalize(); m.quaternion.setFromUnitVectors(V(0, 1, 0), up); m.rotateY(sd * 0.6); m.position.addScaledVector(up, rad * 0.6); }); } }
  // the field in front of the wall: textured dirt/grass with a trail, boulders, pines, cairns and marker posts so running across it reads
  let FIELD_OBS = []; // solid things on the field (boulders, pines, cairns, marker posts) as circles for walking + path planning
  function makeField(g) { FIELD_OBS = []; const r = prng(77), FW = GW.X1 - GW.X0 + 4, FD = -GW.Z0 + 3;
    const tex = cv(512, 512, (x, w, h) => { x.fillStyle = '#8f7650'; x.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { const a = 0.05 + r() * 0.12; x.fillStyle = r() < 0.45 ? `rgba(70,48,28,${a})` : r() < 0.7 ? `rgba(110,128,62,${a * 1.3})` : `rgba(255,236,200,${a})`; x.beginPath(); x.ellipse(r() * w, r() * h, 4 + r() * 22, 3 + r() * 12, r() * 3, 0, TAU); x.fill(); }
      x.strokeStyle = 'rgba(92,120,52,.55)'; x.lineWidth = 1.6; for (let i = 0; i < 260; i++) { const px = r() * w, py = r() * h; for (let j = 0; j < 4; j++) { x.beginPath(); x.moveTo(px + j * 2, py); x.lineTo(px + j * 2 + (r() - 0.5) * 6, py - 5 - r() * 7); x.stroke(); } }
      for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(${150 + r() * 40 | 0},${136 + r() * 30 | 0},${118 + r() * 25 | 0},.85)`; x.beginPath(); x.ellipse(r() * w, r() * h, 3 + r() * 6, 2 + r() * 4, r() * 3, 0, TAU); x.fill(); } });
    tex.repeat.set(FW / 4, FD / 4); part(g, new THREE.BoxGeometry(FW, 0.06, FD), toon(0, tex), [0, -0.03, CL.ZW - FD / 2], null, null, { ink: false }).receiveShadow = true;
    const path = cv(64, 256, (x, w, h) => { x.fillStyle = 'rgba(210,180,135,.0)'; x.fillRect(0, 0, w, h); for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(214,186,140,${0.25 + r() * 0.4})`; x.beginPath(); x.ellipse(w / 2 + (r() - 0.5) * w * 0.7, r() * h, 4 + r() * 8, 3 + r() * 6, r() * 3, 0, TAU); x.fill(); } });
    path.repeat.set(1, 6); const pm = new THREE.Mesh(new THREE.PlaneGeometry(1.6, -GW.Z0 - 1), new THREE.MeshBasicMaterial({ map: path, transparent: true, depthWrite: false })); pm.rotation.x = -Math.PI / 2; pm.position.set(0, 0.004, CL.ZW - 1.2 - (-GW.Z0 - 1) / 2); g.add(pm);
    const rock = toon(0x8a7a66), rock2 = toon(0x6f6252), bark = toon(0x6b4a2e), pine = toon(0x4f7a45), pine2 = toon(0x3f6639), wood = toon(0xb08455), flag = [0xd9573c, 0x3d8fd6, 0xe9b949];
    const clear = (x, z) => Math.abs(x) < 3.2 && z > -5; // keep the space in front of the start clear
    const spot = (x0, x1, z0, z1) => { for (let k = 0; k < 20; k++) { const x = lerp(x0, x1, r()), z = lerp(z0, z1, r()); if (!clear(x, z) && Math.abs(x) > 1.4) return [x, z]; } return [x1, z1]; };
    for (let i = 0; i < 22; i++) { const [x, z] = spot(GW.X0 + 1, GW.X1 - 1, GW.Z0 + 1, -1.5), s2 = 0.35 + r() * 0.9; FIELD_OBS.push({ x, z, r: s2 * 0.9, k: 'boulder' }); part(g, new THREE.DodecahedronGeometry(s2, 0), r() < 0.5 ? rock : rock2, [x, s2 * 0.45, z], [r() * 3, r() * 3, r() * 3], [1, 0.7 + r() * 0.4, 1]); }
    for (let i = 0; i < 26; i++) { const [x, z] = spot(GW.X0 + 1, GW.X1 - 1, GW.Z0 + 1, -6), hh = 1.6 + r() * 2.2, T = new THREE.Group(); T.position.set(x, 0, z); g.add(T); FIELD_OBS.push({ x, z, r: Math.max(0.12, hh * 0.3), k: 'tree' }); part(T, new THREE.CylinderGeometry(0.07, 0.11, hh * 0.35, 7), bark, [0, hh * 0.17, 0]); for (let j = 0; j < 3; j++) part(T, new THREE.ConeGeometry(hh * (0.32 - j * 0.07), hh * 0.42, 9), j % 2 ? pine2 : pine, [0, hh * (0.33 + j * 0.2), 0]); }
    for (let i = 0; i < 5; i++) { const [x, z] = spot(-14, 14, -20, -4), C = new THREE.Group(); C.position.set(x, 0, z); g.add(C); FIELD_OBS.push({ x, z, r: 0.22, k: 'cairn' }); let y = 0; for (let j = 0; j < 4; j++) { const rr = 0.2 - j * 0.035; part(C, new THREE.SphereGeometry(rr, 8, 6), j % 2 ? rock : rock2, [(r() - 0.5) * 0.04, y + rr * 0.7, 0], null, [1, 0.6, 1]); y += rr * 1.2; } }
    for (let d = 8; d <= -GW.Z0 - 2; d += 4) for (const sx of [-1, 1]) { const P2 = new THREE.Group(); P2.position.set(sx * 1.4, 0, CL.ZW - d); g.add(P2); FIELD_OBS.push({ x: sx * 1.4, z: CL.ZW - d, r: 0.06, k: 'post' }); part(P2, new THREE.BoxGeometry(0.08, 1.1, 0.08), wood, [0, 0.55, 0]); if (sx > 0) { const fl = part(P2, new THREE.BoxGeometry(0.34, 0.2, 0.015), toon(flag[Math.floor(d / 4) % 3]), [0.18, 0.98, 0]); fl.userData.flag = 1; } }
  }
  function makeWall() { const g = new THREE.Group(), r = prng(31), Wd = WALL.X1 - WALL.X0, H = WALL.Y1 - WALL.Y0, P = 0.7;
    const tex = cv(256, 512, (x, w, h) => { x.fillStyle = '#8d7c68'; x.fillRect(0, 0, w, h); for (let i = 0; i < 520; i++) { const a = r() * 0.13; x.fillStyle = r() < 0.5 ? `rgba(40,28,18,${a})` : `rgba(255,240,215,${a * 0.8})`; x.beginPath(); x.ellipse(r() * w, r() * h, 6 + r() * 30, 3 + r() * 12, (r() - 0.5) * 0.6, 0, TAU); x.fill(); }
      x.fillStyle = 'rgba(60,40,25,.28)'; for (let y = 20; y < h; y += 128) x.fillRect(0, y + r() * 10, w, 3); x.strokeStyle = 'rgba(48,32,20,.6)'; x.lineWidth = 2;
      for (let i = 0; i < 12; i++) { let px = r() * w, py = r() * h * 0.8; x.beginPath(); x.moveTo(px, py); for (let j = 0; j < 5; j++) { px += (r() - 0.5) * 36; py += 10 + r() * 24; x.lineTo(px, py); } x.stroke(); } });
    tex.repeat.set(Wd / (P * 0.5), H / P); part(g, new THREE.BoxGeometry(Wd, H, 0.2), toon(0, tex), [0, WALL.Y0 + H / 2, CL.ZW + 0.1]);
    makeField(g);
    // holds are instanced per 3 m tile; only the tiles around the climber are drawn (the wall is large, see the climb branch of animate)
    const TL = 3, tiles = new Map(), tile = (p) => { const i = Math.floor((p.x - WALL.X0) / TL), j = Math.floor(p.y / TL), k = i + ',' + j; if (!tiles.has(k)) { const t = new THREE.Group(); t.userData.c = V(WALL.X0 + (i + 0.5) * TL, (j + 0.5) * TL, 0); g.add(t); tiles.set(k, t); } return tiles.get(k); };
    const inst = (geo, mat, G, f) => { const by = new Map(); for (const p of G.pts) { const t = tile(p); if (!by.has(t)) by.set(t, []); by.get(t).push(p); }
      for (const [t, ps] of by) { const m = new THREE.InstancedMesh(geo, mat, ps.length), o = new THREE.Object3D(); ps.forEach((p, i) => { f(o, p); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }); m.castShadow = false; m.frustumCulled = false; t.add(m); } };
    inst(new THREE.DodecahedronGeometry(0.05, 0), toon(0x9c8a74), HG.foot, (o, p) => { o.position.set(p.x, p.y - 0.018, CL.ZW - 0.018); o.rotation.set(r() * 0.3, r() * 3, 0); o.scale.set(1.25, 0.42, 0.8); });
    inst(new THREE.SphereGeometry(0.014, 6, 4), toon(0x5a4a3a), HG.hand, (o, p) => { o.position.set(p.x, p.y, CL.ZW - 0.002); o.rotation.set(0, 0, r()); o.scale.set(1, 1.5, 0.3); });
    g.userData.tiles = [...tiles.values()]; g.visible = false; return g; }
  function mineKey(u) { let i = 0; while (i < MINE_K.length - 2 && u > MINE_K[i + 1][0]) i++; const A = MINE_K[i], Bk = MINE_K[i + 1], t0 = clamp((u - A[0]) / (Bk[0] - A[0]), 0, 1), e = Bk[9], t = e === 1 ? ss(0, 1, t0) : e === 2 ? t0 * t0 : t0;
    const L = (j) => lerp(A[j], Bk[j], t); const dr = L(7); return { G: V(L(1), L(2) - Math.max(0, dr - 0.02) * 0.45, L(3) + L(11) * 0.4), th: L(4) * Math.PI / 180, dx: L(5), lean: L(6), drop: L(7), hp: L(8), h2: mineSlide(u), hz: L(11), tw: L(12) }; }
  // lead (right) hand position along the shaft: one continuous C2-eased glide UP the handle from the pull-out through the lift to the top of the wind-up,
  // then the fast slide down into the strike (accelerating), and a short hold through the impact
  const sst = (x) => { x = clamp(x, 0, 1); return x * x * x * (x * (x * 6 - 15) + 10); };
  function mineSlide(u) { const H0 = 0.07, H1 = 0.44; if (u >= 0.4 && u < 0.52) { const w = (u - 0.4) / 0.12; return lerp(H1, H0 - 0.01, 1 - Math.pow(1 - w, 2.5)); } if (u >= 0.52 && u < 0.66) return lerp(H0 - 0.01, H0, sst((u - 0.52) / 0.14));
    const w = ((u >= 0.66 ? u - 1 : u) + 0.02) / 0.42; return H0 + (H1 - H0) * Math.pow(sst(w), 3.5); }
  /* ---------- impact debris: dirt chunks + sparks + a dust puff (world space, one Points draw call) ---------- */
  const DEB = { n: 72, i: 0 };
  function initDebris() { const n = DEB.n; DEB.pos = new Float32Array(n * 3); DEB.vel = new Float32Array(n * 3); DEB.col = new Float32Array(n * 3); DEB.life = new Float32Array(n); DEB.rate = new Float32Array(n); DEB.size = new Float32Array(n);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(DEB.pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(DEB.col, 3)); g.setAttribute('aLife', new THREE.BufferAttribute(DEB.life, 1)); g.setAttribute('aSize', new THREE.BufferAttribute(DEB.size, 1));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uScale: { value: 400 } }, vertexColors: true,
      vertexShader: 'attribute float aLife; attribute float aSize; uniform float uScale; varying float vL; varying vec3 vC; void main(){ vL = aLife; vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aLife > 0.0 ? aSize * projectionMatrix[1][1] * uScale / -mv.z : 0.0; }',
      fragmentShader: 'varying float vL; varying vec3 vC; void main(){ vec2 q = gl_PointCoord * 2.0 - 1.0; float r = dot(q, q); if (r > 1.0 || vL <= 0.0) discard; gl_FragColor = vec4(vC, clamp(vL * 1.6, 0.0, 1.0) * (1.0 - 0.3 * r)); }' });
    DEB.pts = new THREE.Points(g, m); DEB.pts.frustumCulled = false; DEB.pts.renderOrder = 6; scene.add(DEB.pts);
    DEB.puff = new THREE.Sprite(new THREE.SpriteMaterial({ map: radial('rgba(205,170,125,.8)', 'rgba(190,150,105,.35)'), transparent: true, depthWrite: false, opacity: 0 })); DEB.puff.visible = false; scene.add(DEB.puff); DEB.pt = 9; }
  function spawnDebris(p, sparks) { const r = Math.random; for (let k = 0; k < 30; k++) { const i = DEB.i = (DEB.i + 1) % DEB.n, spk = k < (sparks ? 12 : 3), a = r() * TAU, sp = spk ? 0.9 + r() * 1.1 : 0.3 + r() * 0.6;
      DEB.pos.set([p.x, p.y + 0.01, p.z], i * 3); DEB.vel.set([Math.cos(a) * sp, (spk ? 1.0 : 0.8) + r() * (spk ? 1.3 : 0.9), Math.sin(a) * sp], i * 3);
      const sh = 0.75 + r() * 0.4; DEB.col.set(spk ? [1, 0.82 + r() * 0.15, 0.45] : [0.42 * sh, 0.3 * sh, 0.2 * sh], i * 3); DEB.life[i] = 1; DEB.rate[i] = spk ? 2.6 + r() * 1.5 : 1.3 + r() * 0.6; DEB.size[i] = spk ? 0.009 + r() * 0.006 : 0.016 + r() * 0.018; }
    DEB.puff.position.set(p.x, p.y + 0.05, p.z); DEB.pt = 0; DEB.puff.visible = true; }
  function updDebris(dt) { if (!DEB.pts) return; let any = false; for (let i = 0; i < DEB.n; i++) { if (DEB.life[i] <= 0) continue; any = true; const j = i * 3; DEB.vel[j + 1] -= 4.8 * dt; for (let q = 0; q < 3; q++) DEB.pos[j + q] += DEB.vel[j + q] * dt;
      if (DEB.pos[j + 1] < 0.006) { DEB.pos[j + 1] = 0.006; DEB.vel[j + 1] *= -0.25; DEB.vel[j] *= 0.5; DEB.vel[j + 2] *= 0.5; } DEB.life[i] -= DEB.rate[i] * dt; }
    const g = DEB.pts.geometry; if (any) { g.attributes.position.needsUpdate = g.attributes.aLife.needsUpdate = g.attributes.color.needsUpdate = g.attributes.aSize.needsUpdate = true; } DEB.pts.material.uniforms.uScale.value = R ? R.domElement.height / 2 : 400;
    DEB.pt += dt; const k = DEB.pt / 0.7; if (k < 1) { DEB.puff.scale.setScalar(0.12 + 0.4 * Math.sqrt(k)); DEB.puff.material.opacity = 0.55 * (1 - k); } else DEB.puff.visible = false; }

  /* ---------- animation: layered idle + fidgets + secondary motion ---------- */
  const FIDGETS = ['shift', 'scratch', 'tap', 'pick', 'glance', 'sigh'];
  const DUR = { shift: 3.4, scratch: 2.8, tap: 2.4, pick: 2.2, glance: 2.6, sigh: 2.6 };
  const an = { next: 3, blinkAt: 1.5, blink: 0, lookT: 0, look: [0, 0], lookTo: [0, 0], dartT: 0, dart: [0, 0], dartTo: [0, 0], fid: null, ft: 0, prev: null, last: '' };
  function pickFidget(now) { const idle = now - st.lastInput > 20; const L = st.tool === 'climb' || !an.eq || an.eq.held !== 'pick' || an.eq.seq ? FIDGETS.filter((q) => q !== 'scratch' && q !== 'pick') : FIDGETS; let k; do k = L[(Math.random() * L.length) | 0]; while (k === an.last); an.last = k; an.fid = k; an.ft = 0; st.fidget = k; an.next = now + (idle ? 2.5 + Math.random() * 2.5 : 4 + Math.random() * 6) + DUR[k]; }
  function pend(o, ax, az, dt, k = 38, c = 4.5) { // damped pendulum driven by the parent's acceleration (character space)
    o.vx += (-k * o.ax - c * o.vx + ax) * dt; o.vz += (-k * o.az - c * o.vz + az) * dt; o.ax += o.vx * dt; o.az += o.vz * dt; o.ax = clamp(o.ax, -0.9, 0.9); o.az = clamp(o.az, -0.9, 0.9); }
  function animate(c, t, dt) { const { B } = c, f = {};
    // run / mine modes: ease in over ~0.25 s, and back out to idle before switching
    // equip timeline: tau runs 0 -> TOOL_T (stow the pickaxe on the back, draw the climbing picks) or back down (holster the picks, draw the pickaxe)
    // equip sequencer: stow the tool in hand, then draw the wanted one (each a dedicated motion, not a reverse playback)
    if (!an.eq) an.eq = { held: st.tool === 'climb' ? 'climb' : 'pick', seq: null, t: 0 };
    { const Q = an.eq, wantT = an.tv && an.tv.free ? 'none' : st.tool; if (!Q.seq && Q.held !== wantT) { Q.seq = Q.held === 'pick' ? 'pickStow' : Q.held === 'climb' ? 'climbStow' : wantT === 'pick' ? 'pickDraw' : 'climbDraw'; Q.t = 0; }
      if (Q.seq) { Q.t += dt / SEQ_T[Q.seq]; if (Q.t >= 1) { const dn = Q.seq; Q.seq = null; Q.t = 0; Q.held = /Stow$/.test(dn) ? 'none' : dn === 'pickDraw' ? 'pick' : 'climb'; if (Q.held === 'none' && wantT !== 'none') { Q.seq = wantT === 'pick' ? 'pickDraw' : 'climbDraw'; } } }
      st.toolPh = Q.seq ? 1.1 : Q.held === 'climb' ? TOOL_T : 0; st.toolSeq = Q.seq; f.eq = { held: Q.held, seq: Q.seq, t: Q.t }; }
    const ready = (k) => !an.eq.seq && an.eq.held === k, switching = !ready(st.tool) && !an.tv; if (switching && an.fid) { an.fid = null; st.fidget = null; an.next = t + 3; }
    if (st.gnd) groundTick(dt); const want = st.gnd ? (st.gnd.mv > 0.15 ? 'run' : null) : st.anim === 'run' || (st.anim === 'mine' && ready('pick')) || (st.anim === 'climb' && (ready('climb') || !!an.tv)) ? st.anim : null; if (want !== an.act) { an.mw = Math.max(0, (an.mw || 0) - dt / 0.22); if (an.mw <= 0 || !an.act) { an.act = want; an.at = 0; an.rp = 0; an.mw = 0; an.mp = undefined; } } else if (an.act) an.mw = Math.min(1, (an.mw || 0) + dt / 0.25);
    const mw = an.act ? ss(0, 1, an.mw) : 0; if (an.act) { an.at += dt; if (an.fid) { an.fid = null; st.fidget = null; } an.next = t + 4; }
    const fid = an.fid, u = fid ? an.ft / DUR[fid] : 0, env = fid ? ss(0, 0.18, u) * ss(1, 0.78, u) : 0;
    if (fid) { an.ft += dt; if (an.ft >= DUR[fid]) { an.fid = null; st.fidget = null; } } if (t > an.next && !an.fid && !st.calm && !an.act && !switching) pickFidget(t);
    // idle layers
    const br = Math.sin(t * 2 * Math.PI / 3.6), sway = Math.sin(t * 0.55), sway2 = Math.sin(t * 0.37 + 1);
    let hx = 0.008 * sway, hy = 0, hz = 0.012 * sway2, hrz = -0.018 * sway, cx = 0.018 * br, crz = 0.014 * sway, cry = 0, nrx = 0, hry = 0, hrx = 0, hrzH = 0, shY = 0.004 * br, pickRx = 0, pickY = 0, smile = 0;
    // look-arounds: drift toward a new random target every few seconds
    if (t > an.lookT) { an.lookT = t + 2.2 + Math.random() * 3.2; an.lookTo = st.calm ? [0, 0] : [(Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.22]; } if (st.calm && st.faceCam) { an.look[0] = an.look[1] = 0; an.lookTo = [0, 0]; }
    const kl = 1 - Math.exp(-dt * 2.2); an.look[0] += (an.lookTo[0] - an.look[0]) * kl; an.look[1] += (an.lookTo[1] - an.look[1]) * kl; hry += an.look[0]; hrx += an.look[1];
    // eye darts (the iris layer flicks to a new spot every 1.5-4 s) and a slow, gentle idle head turn; both off for the posed calm face shots
    const still = st.calm && st.faceCam; if (t > an.dartT) { an.dartT = t + 1.5 + Math.random() * 2.5; an.dartTo = still ? [0, 0] : [(Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 1.2]; } if (still) an.dart[0] = an.dart[1] = an.dartTo[0] = an.dartTo[1] = 0;
    const kd = 1 - Math.exp(-dt * 22); an.dart[0] += (an.dartTo[0] - an.dart[0]) * kd; an.dart[1] += (an.dartTo[1] - an.dart[1]) * kd;
    if (!still) { hry += 0.2 * Math.sin(t * 2 * Math.PI / 9.5) + 0.06 * Math.sin(t * 0.83 + 0.4); hrx += 0.03 * Math.sin(t * 0.41 + 2); }
    // fidgets (each eased in and out by env)
    if (fid === 'shift') { const side = Math.sin(Math.PI * ss(0.1, 0.5, u)) * 0 + (ss(0.08, 0.35, u) - ss(0.62, 0.92, u)) * (an.side || (an.side = Math.random() < 0.5 ? -1 : 1)); hx += 0.068 * side; hy -= 0.026 * Math.abs(side); hrz += 0.09 * side; crz -= 0.095 * side; hrzH += 0.07 * side; hry -= 0.2 * side; if (u > 0.95) an.side = 0; }
    if (fid === 'scratch') { f.reach = ss(0.05, 0.3, u) * ss(1, 0.75, u); f.scr = t * 22; hrzH -= 0.17 * f.reach; hry += 0.22 * f.reach; hrx += 0.1 * f.reach; crz += 0.045 * f.reach; smile -= 0.3 * f.reach; }
    if (fid === 'tap') { const on = ss(0.05, 0.2, u) * ss(1, 0.85, u); f.tap = on * (0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 2.2)); hrx += 0.09 * on; hry -= 0.14 * on; crz += 0.025 * on; hrz -= 0.02 * on; hx += 0.012 * on; }
    if (fid === 'pick') { const e = Math.sin(Math.PI * ss(0.05, 0.85, u)); pickY = 0.07 * e - 0.015 * Math.sin(Math.PI * ss(0.55, 1, u)); pickRx = -0.45 * Math.sin(Math.PI * ss(0.1, 0.6, u)) + 0.15 * Math.sin(Math.PI * ss(0.5, 0.95, u)); crz -= 0.07 * e; hrzH += 0.1 * e; shY += 0.02 * e; hry += 0.25 * e; }
    if (fid === 'glance') { const g = ss(0.05, 0.3, u) * ss(1, 0.7, u), toCam = Math.atan2(Math.sin(-st.yaw), Math.cos(-st.yaw)); hry = lerp(hry, clamp(toCam, -1.1, 1.1) * 0.75, g); hrx = lerp(hrx, -0.06, g); cry += clamp(toCam, -1.1, 1.1) * 0.26 * g; smile += g; }
    let leanS = 0, hipY = 0, hipX = 0; const iw = 1 - mw; hry *= iw; hrx *= iw;
    if (an.act === 'run') { const gk = an.gk = an.gk === undefined ? 1 : an.gk + ((st.gnd && st.gait === 'walk' ? 0 : 1) - an.gk) * (1 - Math.exp(-dt * 6)), Sg = lerp(GAIT.walk.S, GAIT.run.S, gk), vg = st.gnd ? (st.gnd.vel || 0) : lerp(GAIT.walk.v, GAIT.run.v, gk); an.rp = ((an.rp || 0) + vg * dt / Sg) % 1; st.gaitV = vg;
      const ph = an.rp, s1 = Math.sin(TAU * ph), w0 = mw, w = w0 * gk, ww = w0 * (1 - gk); f.run = { ph, w: w0, k: gk }; st.runPh = ph; st.gaitK = gk;
      // walk (ww): hips highest over the planted leg at mid-stance and lowest in double support (subtle bob), pelvis yaws forward with the swinging leg,
      // the swing-side hip drops a little while the hips shift over the stance foot, shoulders counter-rotate and the head stays level and forward
      const c1 = Math.cos(TAU * ph), cm = Math.cos(TAU * (ph - 0.3));
      hy += ww * (-0.045 + 0.017 * Math.cos(2 * TAU * (ph - 0.3))); hz += ww * 0.012; leanS += ww * 0.04; cx += ww * 0.03; hipY -= ww * 0.12 * c1; cry += ww * 0.1 * c1; hry -= ww * 0.08 * c1;
      hrz += ww * 0.055 * cm; hx += ww * 0.016 * cm; crz -= ww * 0.02 * cm; hrzH -= ww * 0.02 * cm; hrx -= ww * 0.04; hipX += ww * 0.03;
      // run (w): low over the flexed stance leg, high in the flight phase; strong forward lean from the hips, pelvis + shoulder counter-rotation
      hy += w * (-0.06 + 0.035 * Math.cos(2 * TAU * (ph - 0.42))); hz += w * 0.035; leanS += w * 0.26; cx += w * 0.15; hipX += w * 0.06; hipY -= w * 0.13 * c1; cry += w * 0.2 * c1; hry -= w * 0.12 * c1; hrz += w * 0.03 * cm; crz -= w * 0.02 * cm;
      hrx -= w * 0.3; nrx -= w * 0.07; pickY += w * 0.012 * Math.cos(2 * TAU * ph); pickRx += w * 0.05 * Math.sin(2 * TAU * ph); shY += w * 0.008 * Math.cos(2 * TAU * ph); }
    if (an.act === 'mine') { const pg = c.built.pick && GRADES[c.built.pick.userData.grade], sf = 1 + 0.15 * (pg && pg.tier > 0 ? pg.tier : 0) / 7; an.mp = ((an.mp ?? an.at / MINE_T) + dt * sf / MINE_T); st.mineFac = sf; const um = an.mp % 1, k = mineKey(um), w = mw; f.mine = Object.assign(k, { w, u: um }); st.minePh = um;
      if (an.mu !== undefined && an.mu < 0.52 && um >= 0.52 && w > 0.9) an.hit = true; an.mu = um;
      leanS += w * k.lean * 0.45; cx += w * k.lean * 0.55; hy -= w * k.drop; hz += w * (k.hz - k.drop * 0.4); cry += w * k.tw; hipY += w * k.tw * 0.45; hrx += w * (k.hp - k.lean * 0.6); nrx += w * k.hp * 0.3; }
    // equip body motion: look over the right shoulder and turn into the stow, then dip and glance down to the belt while drawing the climbing picks
    // equip body motion: pickaxe - look over the right shoulder and turn into the reach; climbing picks - dip and look down to the hip holsters
    { const Q = an.eq, t2 = Q.t; let e1 = 0, e2 = 0; if (Q.seq === 'pickDraw') e1 = Math.sin(Math.PI * ss(0, 0.62, t2)); if (Q.seq === 'pickStow') e1 = Math.sin(Math.PI * ss(0.3, 1, t2));
      if (Q.seq === 'climbDraw') e2 = Math.sin(Math.PI * ss(0, 0.62, t2)); if (Q.seq === 'climbStow') e2 = Math.sin(Math.PI * ss(0.38, 1, t2));
      hry -= 0.42 * e1; cry -= 0.18 * e1; crz += 0.05 * e1; shY += 0.018 * e1; hy -= 0.06 * e2; cx += 0.12 * e2; hrx += 0.3 * e2; hz -= 0.012 * e2; }
    if (an.act === 'climb') { if (!an.cl) an.cl = climbInit(); { const cg = c.built.climb && CGRADES[c.built.climb.R.userData.grade]; st.climbFac = 1 + 0.05 * ((cg ? cg.tier : -1) + 1); } const T = an.tv; if (T) tetherTick(T, dt);
      let C = T && T.pose ? tetherPose(T, dt) : climbStep(an.cl, dt); if (T && !T.pose) { T.P = C.P.clone(); T.C0 = { P: C.P.clone(), F: { R: { a: C.F.R.a.clone() }, L: { a: C.F.L.a.clone() } } }; }
      if (T && T.k === 'anchor' && C.H) { const u = T.t / TV.anchorT, r0 = C.H.R, inb = ss(0, 0.18, u) * (1 - ss(0.86, 1, u)), g = V(T.A.x - C.P.x, T.A.y - C.P.y - CL.tip.y, CL.ZW + 0.004 - CL.tip.x), tap = u > 0.18 && u < 0.86 ? Math.abs(Math.sin(Math.PI * 3 * (u - 0.18) / 0.68)) : 0;
        C.H.R = { g: r0.g.clone().lerp(g, inb), a: lerp(r0.a, -0.75 * tap, inb), tipW: r0.tipW }; T.depth = 1 - 0.6 * ss(0.2, 0.84, u); }
      if (T && T.bw !== undefined && T.C0) { const b = ss(0, 1, T.bw); if (b < 1) { C.P.lerp(T.C0.P, 1 - b); for (const k of ['R', 'L']) C.F[k].a.lerp(T.C0.F[k].a, 1 - b); } C.hz = (C.hz || 0) * b; C.hipX = (C.hipX || 0) * b; if (C.rope) C.rope.w = b; }
      if (st.pg && T && st.pg.ph === 'unclip' && T.clipped && T.k !== 'coil' && T.k !== 'draw' && T.k !== 'clip') tetherAct('unanchor'); if (st.pg && !T) pgClimb(C); if (!T && C.blk === 'bottom' && /^d/.test(st.climbDir) && !st.climbAuto) { an.gb = (an.gb || 0) + dt; if (an.gb > 0.35) dismount(C.P); } else an.gb = 0;
      const w = mw; f.climb = Object.assign(C, { w }); st.climbPh = ((an.cl.idx % 4) + an.cl.slotT) / 4; st.climbPos = { x: C.P.x, y: C.P.y }; st.tvK = T ? T.k : null; if (T && T.pose) { hz += w * C.hz; hipX += w * C.hipX; if (C.rope) f.rope = Object.assign({}, C.rope, { w: w * (C.rope.w ?? 1) });
        // on the rope: upper (left) hand on the main line ~0.3 m above the belt winch, lower (right) hand managing the slack loop just below/right of it
        if (C.rope && /rappel|hang|ascend/.test(T.k) && c.built.winch && c.built.winch.parent === c.B.hips) { const wl = c.root.worldToLocal(c.built.winch.getWorldPosition(V(0, 0, 0))), al = V(T.A.x - C.P.x, T.A.y - 0.03 - C.P.y, CL.ZW - 0.072), dl = al.clone().sub(wl).normalize(), fe = T.feed || 0, rg = Math.sin(clk * 9) * 0.015 * fe;
          f.rope.L = wl.clone().addScaledVector(dl, 0.3 + rg).add(V(0.035, 0, 0)); f.rope.R = wl.clone().add(V(-0.13, -0.15 - rg, 0.07)); } } if ((C.blk || '') !== (st.climbBlk || '') || st._bd !== st.climbDir) { st.climbBlk = C.blk || ''; st._bd = st.climbDir; const nt = document.querySelector('#charClimb .cnote'); if (nt) nt.textContent = { bottom: 'Ground reached', top: 'Top of the wall', side: 'Edge of the wall' }[C.blk] || ''; document.querySelectorAll('#charClimb [data-dir]').forEach((b) => b.classList.toggle('blk', !!C.blk && b.dataset.dir === st.climbDir)); }
      const ms = C.mv ? (C.mv[0] === 'R' ? -1 : 1) : 0, e = Math.sin(Math.PI * C.mu), hand = C.mv && isH(C.mv), tp = T && T.pose ? 1 : 0;
      hy -= w * (0.04 - 0.02 * tp); hz += w * 0.02; cx += w * (0.1 - 0.16 * tp); if (tp) { hrx -= w * 0.25; nrx -= w * 0.1; } hx -= w * (hand ? 0 : 0.03 * ms * e); crz -= w * 0.035 * ms * e;
      // head: mostly steady on the torso (a constant gentle look up the wall), with a small, low-passed glance toward the reaching pick / stepping foot (~1/3 of before, no snaps between moves)
      { const tg = [hand ? -0.04 * Math.sign(C.up) * e : 0.1 * e, (hand ? 0.055 : 0.035) * ms * e, 0.013 * ms * e * (hand ? 1 : -1)], hs = an.hcl || (an.hcl = [0, 0, 0]), kk = 1 - Math.exp(-dt * 4); for (let q = 0; q < 3; q++) hs[q] += (tg[q] - hs[q]) * kk;
        hrx -= w * (0.24 - hs[0]); hry += w * hs[1]; hrz += w * hs[2]; } nrx -= w * 0.08; }
    else if (an.cl && !an.act) { an.cl = null; if (an.tv) { an.tv = null; markTether(); } }
    { const P = an.act === 'climb' && f.climb ? f.climb.P : null, G = st.gnd; c.root.position.set(G ? G.x : P ? P.x : 0, P && !G ? P.y : 0, G ? G.z : 0).applyAxisAngle(V(0, 1, 0), st.yaw); if (G) c.root.rotation.y = st.yaw + G.face; if (st.ledge) c.root.position.copy(LG.char); const wl = c.wall; if (wl) { wl.visible = an.act === 'climb' || (!!G && !G.home); wl.rotation.y = st.yaw; if (wl.visible && wl.userData.tiles) { const q = G ? V(G.x, 0, 0) : P || V(0, 0, 0); for (const t of wl.userData.tiles) t.visible = Math.abs(t.userData.c.x - q.x) < 3.9 && Math.abs(t.userData.c.y - q.y + 0.6) < 3.9; } for (const fl of FLOOR) fl.visible = !wl.visible && !st.home && !st.ledge; } }
    if (fid === 'sigh') { const s1 = Math.sin(Math.PI * ss(0.05, 0.45, u)), s2 = Math.sin(Math.PI * ss(0.4, 0.95, u)); cx += 0.085 * s1 - 0.08 * s2; shY += 0.03 * s1 - 0.04 * s2; nrx += 0.14 * s2; hrx += 0.15 * s2; hy -= 0.012 * s2; f.sighDrop = s2; }
    // apply: hips, spine, chest, neck, head
    const E = (k, x, y, z) => { B[k].quaternion.copy(c.restQ[k]).multiply(_q.setFromEuler(new THREE.Euler(x, y, z))); };
    B.hips.position.set(hx, c.HY + hy - 0.004 * Math.abs(sway), hz); E('hips', hipX, hipY, hrz); E('spine', cx * 0.4 + leanS, cry * 0.4 - hipY * 0.5, -hrz * 0.6 + crz * 0.3); E('chest', cx, cry, crz); B.chest.scale.set(1 + 0.008 * br, 1 + 0.006 * br, 1 + 0.012 * br);
    E('neck', nrx + hrx * 0.3, hry * 0.35, hrzH * 0.4); E('head', hrx * 0.7, hry * 0.65, hrzH * 0.6 - crz * 0.4);
    for (const k of ['shR', 'shL']) B[k].position.y = 0.085 + shY; B.shR.rotation.z = -shY * 2; B.shL.rotation.z = shY * 2;
    // pickaxe rides on the chest; the adjust fidget lifts and resettles it
    const px = c.built.mount; px.position.copy(c.pickRest.p).add(V(0, pickY, 0)); px.quaternion.copy(c.pickRest.q).premultiply(_q.setFromEuler(new THREE.Euler(pickRx, 0, 0)));
    f.dt = dt; solveLimbs(c, f);
    { const T = an.act === 'climb' ? an.tv : null, wv = !!T && T.pose && (T.k === 'ascend' || T.k === 'coil' || (T.k === 'draw' && T.t < 0.3)); if (c.built.winch && c.built.winch.parent !== c.B.hips) { c.B.hips.add(c.built.winch); c.built.winch.position.set(0, 0.0, 0.158); c.built.winch.rotation.set(0, Math.PI, 0); c.built.winch.scale.setScalar(0.85); } tetherRope(c, T); if (c.built.winch) { c.built.winch.visible = !!T && (T.clipped || wv) && !(T.k === 'draw' && T.t > 0.3); if (T && T.pose && dt > 0) { const py = T.P.y, v = c._tvy === undefined ? 0 : (py - c._tvy) / dt; c._tvy = py; T.feed = clamp(Math.abs(v) / 2.2, 0, 1); c.built.winchDrum.rotation.x -= dt * v * 22; } else c._tvy = undefined; }
      const cg = c.built.tethers && c.built.tethers[0] && c.built.tethers[0].grp; if (cg) { const out = !!T && T.clipped && T.pose ? (T.k === 'coil' ? 1 - ss(0.2, 0.95, T.t / TV.coilT) : 1) : 0; cg.scale.setScalar(1 - 0.42 * out); } }
    if (an.hit) { an.hit = false; const pk = built.pick; pk.updateMatrixWorld(true); const p = pk.localToWorld(V(MINE_SPIKE * 0.24, 0.7, 0)); p.y = 0.004; spawnDebris(p, pk.userData.grade !== 'stick'); } updDebris(dt);
    // blinks (random, sometimes double), held shut through a sigh
    if (t > an.blinkAt) { an.blink = 0.0001; an.blinkAt = t + 2 + Math.random() * 3.8; if (Math.random() < 0.2) an.dbl = true; }
    let lid = 1; if (an.blink > 0) { an.blink += dt; const b = an.blink / 0.16; lid = b < 0.5 ? 1 - b * 2 : (b - 0.5) * 2; if (b >= 1) { an.blink = an.dbl ? -0.12 : 0; an.dbl = false; } } else if (an.blink < 0) { an.blink += dt; if (an.blink >= 0) an.blink = 0.0001; }
    if (fid === 'sigh') lid = Math.min(lid, 1 - 0.85 * Math.sin(Math.PI * ss(0.45, 0.85, u))); setFace(built, clamp(1 - lid, 0, 1)); if (built.face) built.face.uD.value.set(an.dart[0], an.dart[1]);
    updatePickFx(built.pick, t); if (built.climb) { updatePickFx(built.climb.R, t); updatePickFx(built.climb.L, t); } if (showPick) for (const sp of showPick.userData.all || [showPick]) updatePickFx(sp, t); for (const tg of built.tethers || []) updatePickFx(tg.grp, t);
    // secondary motion: braid, rope and lantern swing with inertia (driven by their anchors' acceleration)
    c.root.updateMatrixWorld(true); const sec = (o, anchor, gain, k, cdamp) => { const p = anchor.getWorldPosition(V(0, 0, 0)); if (o.wq) p.applyQuaternion(c.root.quaternion.clone().invert()); else c.root.worldToLocal(p); if (!o.p || o.wq !== o.wq0) { o.p = p.clone(); o.v = V(0, 0, 0); o.wq0 = o.wq; }
      const v = p.clone().sub(o.p).divideScalar(Math.max(dt, 1e-3)), a = v.clone().sub(o.v).divideScalar(Math.max(dt, 1e-3)); o.p.copy(p); o.v.copy(v); a.clampLength(0, 30); pend(o, a.z * gain + (o.wq ? -a.y * gain * 0.4 : 0), -a.x * gain, dt, k, cdamp); if (o.wq) { o.ax = clamp(o.ax, -0.5, 0.42); o.az = clamp(o.az, -0.4, 0.4); } };
    const rw = f.run ? f.run.w : 0, rph = f.run ? f.run.ph : 0, bob = Math.sin(2 * TAU * rph);
    if (built.braid.length) { const hb = built.braid[0].b, onR = an.act === 'climb' && !!an.tv && !!an.tv.pose; built.braid[0].wq = onR; sec(built.braid[0], hb.parent, onR ? 1.7 : 1.4, onR ? 26 : 30, onR ? 2.6 : 3.2); const head = B.head.getWorldQuaternion(new THREE.Quaternion()), eu = new THREE.Euler().setFromQuaternion(head.premultiply(c.root.quaternion.clone().invert()));
      built.braid.forEach((L, i) => { if (i) { const P2 = built.braid[i - 1]; L.ax += (P2.ax * 0.8 - L.ax) * Math.min(1, dt * 9); L.az += (P2.az * 0.8 - L.az) * Math.min(1, dt * 9); } L.b.rotation.x = L.rx + L.ax * (i ? 0.35 : 1) - (i ? 0 : eu.x * 0.8) + 0.03 * Math.sin(t * 1.3 + i * 0.5) * 0.3 + rw * (i ? 0.05 + 0.05 * Math.sin(2 * TAU * rph - i * 0.7) : 0.22 + 0.08 * bob); L.b.rotation.z = L.az * (i ? 0.35 : 1) - (i ? 0 : eu.z * 0.8) + rw * 0.06 * Math.sin(TAU * rph - i * 0.6); }); }
    if (built.rope) { sec(built.rope, built.pack, 1.4, 30, 3); built.rope.b.rotation.set(built.rope.ax + rw * (0.08 + 0.06 * bob), 0, Math.min(0.05, built.rope.az - rw * 0.05 * Math.sin(TAU * rph))); }
    if (built.lantern) { sec(built.lantern, built.pack, 1.6, 26, 2.6); built.lantern.b.rotation.set(built.lantern.ax + rw * (0.3 + 0.16 * Math.sin(2 * TAU * rph - 1)), 0, built.lantern.az + rw * 0.12 * Math.sin(TAU * rph)); const fl = 0.85 + 0.1 * Math.sin(t * 9) + 0.05 * Math.sin(t * 23); built.lanternGlow.material.opacity = 0.75 * fl; built.lanternLight.intensity = 0.5 * fl; }
  }

  /* ---------- stage, camera, input ---------- */
  function initGL() { wrap = document.getElementById('charWrap'); canvas = document.getElementById('charCanvas');
    try { R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false }); } catch (e) { st.ok = false; return false; }
    R.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap; R.outputEncoding = THREE.LinearEncoding;
    scene = new THREE.Scene(); scene.background = cv(8, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f6e7cc'); gr.addColorStop(0.55, '#e9c99a'); gr.addColorStop(1, '#b9814f'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    cam = new THREE.PerspectiveCamera(26, 1, 0.1, 160);
    scene.add(new THREE.HemisphereLight(0xfff1dc, 0x7a5236, 0.4));
    const key = new THREE.DirectionalLight(0xfff0dc, 0.55); key.position.set(1.4, 3.2, 2.6); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -1.2, right: 1.2, top: 2, bottom: -0.4, near: 0.5, far: 8 }); key.shadow.bias = -0.0008; key.shadow.radius = 4; scene.add(key);
    const fill = new THREE.DirectionalLight(0xffd8b0, 0.14); fill.position.set(-2.2, 1.2, 1.4); scene.add(fill);
    const rim1 = new THREE.DirectionalLight(0xffe6c0, 0.32); rim1.position.set(-1.6, 2.2, -2.6); scene.add(rim1); const rim2 = new THREE.DirectionalLight(0xfff0d8, 0.22); rim2.position.set(1.8, 1.6, -2.2); scene.add(rim2);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.25, 64), new THREE.MeshBasicMaterial({ map: radial('rgba(255,236,205,1)', 'rgba(222,178,128,.9)'), transparent: true, depthWrite: false })); disc.rotation.x = -Math.PI / 2; scene.add(disc);
    const sh = new THREE.Mesh(new THREE.CircleGeometry(1.0, 48), new THREE.ShadowMaterial({ opacity: 0.32, color: 0x4a2a14 })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.002; sh.receiveShadow = true; scene.add(sh);
    const blob = new THREE.Mesh(new THREE.CircleGeometry(0.34, 32), new THREE.MeshBasicMaterial({ map: radial('rgba(70,40,20,.45)', 'rgba(70,40,20,.15)'), transparent: true, depthWrite: false })); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.003; scene.add(blob); FLOOR = [disc, sh, blob];
    initDebris(); bindInput(); st.ok = true; return true; }
  function setChar(sex) { if (rig && rig.sex === sex) return; if (rig) { scene.remove(rig.root); rig.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); } built = {}; rig = build(sex); scene.add(rig.root); setup(rig); for (const k in an) if (k === 'next') an.next = clk + 2.5; st.sex = sex;
    document.querySelectorAll('#charSex [data-sex]').forEach((b) => b.classList.toggle('on', b.dataset.sex === sex)); markPick(); }
  // showcase: one pickaxe alone on the stage (for previews / screenshots)
  let showPick = null;
  function showcase(g, rz = 0.55) { if (showPick) { scene.remove(showPick.parent); showPick = null; } if (rig) rig.root.visible = !g; if (!g) return; const grp = new THREE.Group(), pk = makePickaxe(g); grp.add(pk); pk.rotation.z = rz; grp.position.set(Math.sin(rz) * 0.68, 1.16 - Math.cos(rz) * 0.68, 0); scene.add(grp); showPick = pk; }
  function showcaseClimb(g) { if (showPick) { scene.remove(showPick.parent); showPick = null; } if (rig) rig.root.visible = !g; if (!g) return; const grp = new THREE.Group(); for (const s of [-1, 1]) { const t = makeClimbPick(g); t.position.set(s * 0.15 - 0.05, 0, s * 0.02); t.rotation.set(0, s * 0.25, 0); grp.add(t); } grp.scale.setScalar(1.45); grp.position.set(0, 0.68, 0); scene.add(grp); showPick = grp.children[0]; showPick.userData.all = grp.children; }
  function showcaseTether(g) { if (showPick) { scene.remove(showPick.parent); showPick = null; } if (rig) rig.root.visible = !g; if (!g) return; const grp = new THREE.Group(), t = makeTether(g, { R: 0.1, n: 6, dr: 0.004, tr: 0.016, dz: 0.011, sy: 1.25 }); grp.add(t); t.rotation.set(0.15, 0.45, 0); grp.position.set(0, 1.3, 0); scene.add(grp); showPick = t; }
  // swap the pickaxe module in the right hand (keeps its current pose)
  function setPick(g) { if (!rig) return; const b = rig.built, old = b.pick; b.pick = makePickaxe(g); b.pick.position.copy(old.position); b.pick.quaternion.copy(old.quaternion); old.parent.add(b.pick); old.parent.remove(old); old.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); markPick(); }
  function setTether(g) { if (!rig) return; for (const tg of rig.built.tethers || []) mountTether(tg, g); markPick(); }
  // equip: 'pick' (pickaxe in hand) or 'climb' (the climbing picks, one per hand); the switch animates through an.tau
  // climb direction pad: the climber's own left/right (seen from behind the arrows match the screen), stop, and an auto-wander demo
  function setClimbDir(k) { if (k === 'auto') { st.climbAuto = !st.climbAuto; if (st.climbAuto && an.cl) an.cl.wt = 0; } else { st.climbAuto = false; st.climbDir = DIRS[k] ? k : 'stop'; } markClimb(); }
  function setGait(k) { st.gait = k === 'walk' ? 'walk' : 'run'; if (typeof S !== 'undefined' && S) { S.gait = st.gait; if (typeof save === 'function') save(); } document.querySelectorAll('#charClimb [data-gait]').forEach((b) => b.classList.toggle('on', b.dataset.gait === st.gait)); }
  function markClimb() { document.querySelectorAll('#charClimb [data-dir]').forEach((b) => b.classList.toggle('on', b.dataset.dir === 'auto' ? !!st.climbAuto : !st.climbAuto && b.dataset.dir === st.climbDir)); }
  function setTool(k, quiet) { st.tool = k === 'climb' ? 'climb' : 'pick'; if (st.tool === 'pick' && st.anim === 'climb') { st.anim = 'idle'; st.gnd = null; st.play = false; st.pg = null; if (typeof pgMark === 'function') pgMark(null); document.querySelectorAll('#charAnim [data-anim]').forEach((b) => b.classList.toggle('on', b.dataset.anim === 'idle')); } if (!quiet && typeof S !== 'undefined' && S) { S.toolMode = st.tool; if (typeof save === 'function') save(); } document.querySelectorAll('#charEquip [data-tool]').forEach((b) => b.classList.toggle('on', b.dataset.tool === st.tool)); }
  function setClimb(g) { if (!rig) return; const b = rig.built; for (const k of ['R', 'L']) { const old = b.climb[k], nw = makeClimbPick(g); nw.position.copy(old.position); nw.quaternion.copy(old.quaternion); old.parent.add(nw); old.parent.remove(old); old.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); b.climb[k] = nw; } markPick(); }
  function setAnim(k) { const play = k === 'play'; if (play) k = 'climb'; if (!play) { st.play = false; st.pg = null; pgMark(null); } st.anim = k === 'run' || k === 'mine' || k === 'climb' ? k : 'idle'; if (st.anim !== 'climb') st.gnd = null; if (st.anim === 'mine' && st.tool === 'climb') setTool('pick'); if (st.anim === 'climb') { if (st.tool !== 'climb') setTool('climb'); st.yaw = Math.PI + 0.65; st.yawV = 0; if (!st.climbDir || !st.play) st.climbDir = 'stop'; } const cc = document.getElementById('charClimb'); if (cc) cc.classList.toggle('off', st.anim !== 'climb'); markClimb(); if (play && !st.play) { st.play = true; an.tv = null; an.cl = null; if (!an.eq) an.eq = { held: 'climb', seq: null, t: 0 }; st.gnd = { x: 0, z: -1.2, face: 0, mv: 0, back: 0 }; st.climbDir = 'stop'; st.climbAuto = false; markClimb(); markTether(); const nt = document.querySelector('#charClimb .cnote'); if (nt) nt.textContent = 'Tap the ground to move there, tap the wall to climb to it'; }
    document.querySelectorAll('#charAnim [data-anim]').forEach((b) => b.classList.toggle('on', st.play ? b.dataset.anim === 'play' : b.dataset.anim === st.anim)); }
  let gear = 'pick';
  function markPick() { const cp = document.getElementById('charPick'); if (!cp) return; const T = gear === 'pick' ? GRADES : gear === 'climb' ? CGRADES : TGRADES, cur = gear === 'pick' ? (rig ? rig.built.pick.userData.grade : S.pickGrade) : gear === 'climb' ? (rig && rig.built.climb ? rig.built.climb.R.userData.grade : S.climbGrade || 'stone') : (rig && rig.built.tethers ? rig.built.tethers[0].grp.userData.grade : S.tetherGrade || 'regular');
    cp.innerHTML = `<span class="gear" role="tablist"><button data-gear="pick" title="Pickaxe" aria-label="Pickaxe" class="${gear === 'pick' ? 'on' : ''}">⛏️</button><button data-gear="tether" title="Tether" aria-label="Tether" class="${gear === 'tether' ? 'on' : ''}">🪢</button><button data-gear="climb" title="Climbing Picks" aria-label="Climbing Picks" class="${gear === 'climb' ? 'on' : ''}">🧗</button></span>` + Object.entries(T).map(([k, G]) => `<button data-grade="${k}" title="${G.name}" class="${k === cur ? 'on' : ''}"><i style="background:${hex(G.chip || (G.runes ? G.glow : G.head))}"></i><span>${G.name}</span></button>`).join(''); }
  /* ---------- Portaledges: a hanging camp on a cliff at a mithril vein (the Portaledges tab) ----------
     Cliff face at z = 0 (rock behind, z < 0); the platform hangs in front of it, top at y = 0, from 4 corner ropes to one ring / carabiner on a piton.
     The delver stands on the cliff side of the platform, facing the rock, mining the vein with the pickaxe swing. Orbit camera around the camp. */
  /* ---------- ores: every ore the gear tiers need, each with its own vein look and its own spark colour (pure visual selection, no economy) ----------
     feeds: which gear tier it is for. style: how its crystals / nuggets look where they break out of the rock. gl: how strongly the seam glows. */
  const ORES = {
    copper: { name: 'Copper', feeds: 'Bronze', vein: 0xe0874a, glow: 0xc0582a, gl: 0.18, spark: 0xff8a3c, crys: 0xc8703a, cEm: 0x2a0e00, acc: 0x4fa58a, style: 'nugget' },
    tin: { name: 'Tin', feeds: 'Bronze', vein: 0xdfe2da, glow: 0x9aa0a0, gl: 0.12, spark: 0xf4f6f0, crys: 0x4d3f35, cEm: 0x000000, acc: 0xd8dcd6, style: 'chunk' },
    iron: { name: 'Iron', feeds: 'Iron, Steel', vein: 0xb4583a, glow: 0x7a2c18, gl: 0.14, spark: 0xffb050, crys: 0x5e5a5f, cEm: 0x120808, acc: 0xa04a30, style: 'chunk' },
    coal: { name: 'Coal', feeds: 'Steel', vein: 0x2a282c, glow: 0xff7a30, gl: 0.06, spark: 0xff6a2a, crys: 0x1b1a1e, cEm: 0x000000, acc: 0x3a383e, style: 'coal', dark: true },
    gold: { name: 'Gold', feeds: 'Gold', vein: 0xffd25a, glow: 0xd49a20, gl: 0.3, spark: 0xffd84a, crys: 0xf0b83a, cEm: 0x3a2400, acc: 0xfff0a0, style: 'nugget' },
    mithril: { name: 'Mithril', feeds: 'Mithril', vein: 0xbfe0ff, glow: 0x3f8fe8, gl: 0.3, spark: 0x6db6ff, crys: 0x7fb6e6, cEm: 0x16426e, acc: 0xe8f6ff, style: 'hex' },
    runite: { name: 'Runite', feeds: 'Rune', vein: 0xd2b8ff, glow: 0x8f5ef0, gl: 0.34, spark: 0xb48cff, crys: 0x7a56c8, cEm: 0x2a1060, acc: 0x5fe0c8, style: 'hex' },
    lumenite: { name: 'Lumenite', feeds: 'Lumen', vein: 0xd8fcff, glow: 0x2fc8f0, gl: 0.45, spark: 0x7ff4ff, crys: 0x8ff6ff, cEm: 0x1d93ad, acc: 0xffffff, style: 'hex', bright: true },
    onyx: { name: 'Ember Onyx', feeds: 'Ember Onyx', vein: 0xff4a1c, glow: 0xe0301a, gl: 0.32, spark: 0xff5a28, crys: 0x16131a, cEm: 0x200404, acc: 0xff3418, style: 'onyx', flames: true },
  };
  // the Lifeline per tier: strands, colours, the energy it carries (also tints the drill's flute thread and lightning) and extras
  const LGRADES = {
    bronze: { n: 2, col: 0xc07a3c, core: 0xffa860, co: 0.08, en: 0xffb070, r: 0.011 },
    iron: { n: 3, col: 0x7d8288, core: 0x9fc0ff, co: 0.08, en: 0xa8c8ff, r: 0.012, bands: 0x55585e },
    steel: { n: 3, col: 0x9aa4ae, core: 0x8fd0ff, co: 0.14, en: 0x9fd8ff, r: 0.012, bands: 0x7d8792, cable: true },
    gold: { n: 3, col: 0xe6b640, core: 0xffd070, co: 0.14, en: 0xffe08a, r: 0.013, bands: 0xe6b640, wrap: 0x8a2a1e },
    mithril: { n: 3, col: 0x9cc0e6, core: 0xbfe6ff, co: 0.2, en: 0xbfe6ff, r: 0.013, bands: 0xe8f6ff, fil: 0xf6fbff },
    rune: { n: 3, col: 0x3b424c, core: 0xb48cff, co: 0.24, en: 0xc6a2ff, r: 0.014, bands: 0x8f8160, runes: 0xb48cff },
    lumen: { n: 3, col: 0x55c8f0, core: 0x9ad4ff, co: 0.3, en: 0x9ff4ff, r: 0.014, glowS: true },
    onyx: { n: 3, col: 0x16131a, core: 0xff5a28, co: 0.16, en: 0xff7a40, r: 0.014, vein: 0xff3418, flames: true },
  };
  const DTIERS = ['bronze', 'iron', 'steel', 'gold', 'mithril', 'rune', 'lumen', 'onyx'];
  const LG = { S: 1.4, W: 2.9, D: 1.5, cx: 0.4, z0: 0.06, ore: 'mithril', dg: 'bronze', lg: 'bronze', xfer: 'auto', char: V(-0.78, 0.105, 1.1), tgt: V(0.32, 0.95, 0.95), drill: { x: 0.12, y: 0.25, tip: -0.03, L: 0.88, R: 0.13, hub: 0.15, rps: 1.6 }, rocks: [] }; // camp built at 1/S scale, then scaled so the tent stands about her height
  let LEDGE = null;
  function rockGeo(w, h, d, seed, j = 0.07) { const g = new THREE.BoxGeometry(w, h, d, 3, Math.max(2, Math.round(h / 0.5)), 2), P = g.attributes.position, r = prng(seed), m = new Map();
    for (let i = 0; i < P.count; i++) { const k = P.getX(i).toFixed(3) + ',' + P.getY(i).toFixed(3) + ',' + P.getZ(i).toFixed(3); if (!m.has(k)) m.set(k, [(r() - 0.5) * w * j * 2, (r() - 0.5) * h * j * 0.5, (r() - 0.5) * d * j * 2]); const o = m.get(k); P.setXYZ(i, P.getX(i) + o[0], P.getY(i) + o[1], P.getZ(i) + o[2]); }
    g.computeVertexNormals(); return g; }
  /* ---------- ore vein, built into the cliff face: rays find the actual rock surface, so seams lie IN the face (a dark crevice, the ore core, a soft glow),
     crystals / nuggets break out of the rock from inside, and the two working spots (her pick, the drill bite) are recessed pockets ---------- */
  const veinX = (y) => -0.8 + 0.28 * Math.sin(y * 0.9 + 0.4) + 0.12 * Math.sin(y * 2.3);
  function oreCluster(par, p, n, s, O, r, sink = 0.4) { const c = new THREE.Group(); c.position.copy(p).addScaledVector(n, -s * sink); c.quaternion.setFromUnitVectors(V(0, 1, 0), n); par.add(c);
    const M = O.style === 'coal' ? new THREE.MeshPhongMaterial({ color: O.crys, specular: 0x8a8a96, shininess: 70, flatShading: true }) : O.style === 'onyx' ? new THREE.MeshPhongMaterial({ color: O.crys, specular: 0xff8060, shininess: 90, flatShading: true, emissive: O.cEm })
      : O.bright ? new THREE.MeshPhongMaterial({ color: O.crys, emissive: O.cEm, specular: 0xffffff, shininess: 90, flatShading: true, transparent: true, opacity: 0.93 }) : toon(O.crys, null, { emissive: O.cEm });
    const acc = new THREE.MeshBasicMaterial({ color: O.acc });
    if (O.style === 'hex' || O.style === 'onyx') for (let q = 0; q < 5; q++) { const h = s * (q ? 0.5 + r() * 0.45 : 1), w = s * 0.17 * (q ? 0.7 : 1), sub = new THREE.Group(); sub.rotation.set((r() - 0.5) * (q ? 1.2 : 0.25), r() * 3, (r() - 0.5) * (q ? 1.2 : 0.25)); sub.position.set((r() - 0.5) * s * 0.3, 0, (r() - 0.5) * s * 0.3); c.add(sub);
      part(sub, new THREE.CylinderGeometry(w, w * 1.05, h * 0.75, 6), M, [0, h * 0.375, 0], null, null, { ink: q === 0 }); part(sub, new THREE.ConeGeometry(w, h * 0.3, 6), M, [0, h * 0.9, 0], null, null, { ink: false });
      if (O.style === 'onyx') part(sub, new THREE.CylinderGeometry(w * 0.22, w * 0.22, h * 0.7, 4), acc, [w * 0.8, h * 0.4, 0], null, null, { ink: false, shadow: false }); }
    else if (O.style === 'nugget') for (let q = 0; q < 4; q++) { const k = s * (q ? 0.3 + r() * 0.25 : 0.5); part(c, new THREE.IcosahedronGeometry(k, 0), M, [(r() - 0.5) * s * 0.7, k * 0.3, (r() - 0.5) * s * 0.7], [r() * 3, r() * 3, r() * 3], [1, 0.7 + r() * 0.3, 1], { ink: q === 0 });
      if (q === 0) part(c, new THREE.IcosahedronGeometry(k * 0.45, 0), acc, [k * 0.5, k * 0.45, 0], [r(), r(), r()], null, { ink: false }); }
    else for (let q = 0; q < 4; q++) { const k = s * (q ? 0.28 + r() * 0.2 : 0.45); part(c, new THREE.OctahedronGeometry(k, 0), M, [(r() - 0.5) * s * 0.7, k * 0.3, (r() - 0.5) * s * 0.7], [r() * 3, r() * 3, r() * 3], [1, 0.6 + r() * 0.5, 0.8], { ink: q === 0 }); }
    return c; }
  function buildVein(key) { const cliff = LG.cliff; if (!cliff) return; const O = ORES[key] || ORES.mithril, r = prng(1234);
    if (LG.veinG) { cliff.remove(LG.veinG); LG.veinG.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); } const vg = new THREE.Group(); vg.name = 'vein'; cliff.add(vg); LG.veinG = vg;
    LG.g.updateMatrixWorld(true); const ray = new THREE.Raycaster(), Z = V(0, 0, 1);
    const faceAt = (x, y) => { const o = cliff.localToWorld(V(x, y, 1.2)); ray.set(o, V(0, 0, -1)); ray.far = 4; const h = ray.intersectObjects(LG.rocks, false)[0];
      if (!h) return { p: V(x, y, -0.1), n: Z.clone() }; const n = h.face.normal.clone().transformDirection(h.object.matrixWorld); if (n.z < 0.2) n.lerp(Z, 0.7); n.lerp(Z, 0.35).normalize(); return { p: cliff.worldToLocal(h.point.clone()), n }; };
    const soft = LG.softTex || (LG.softTex = cv(4, 64, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.35, 'rgba(255,255,255,.9)'); gr.addColorStop(0.5, '#fff'); gr.addColorStop(0.65, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); }));
    const coreTex = LG.coreTex || (LG.coreTex = cv(64, 32, (x, w, h) => { x.clearRect(0, 0, w, h); const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.3, 'rgba(255,255,255,.75)'); gr.addColorStop(0.5, '#fff'); gr.addColorStop(0.7, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); const q = prng(3); x.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 40; i++) x.fillRect(q() * w, h * (0.3 + q() * 0.4), 2 + q() * 5, 1); }));
    const crev = new THREE.MeshBasicMaterial({ color: O.dark ? 0x0e0d10 : 0x2a221c, map: soft, transparent: true, depthWrite: false, side: THREE.DoubleSide }), core = new THREE.MeshBasicMaterial({ color: O.vein, map: coreTex, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
      glow = new THREE.MeshBasicMaterial({ color: O.glow, map: soft, transparent: true, opacity: O.gl * 0.8, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }); LG.veinMats = { crev, core, glow };
    const strip = (S, w, m, off) => { const pos = [], idx = [], uv = []; for (let i = 0; i < S.length; i++) { const a = S[Math.max(0, i - 1)].p, b = S[Math.min(S.length - 1, i + 1)].p, t = b.clone().sub(a).normalize(), sd = t.clone().cross(S[i].n).normalize(), ww = w(i / (S.length - 1));
        const c = S[i].p.clone().addScaledVector(S[i].n, off); pos.push(...c.clone().addScaledVector(sd, ww).toArray(), ...c.clone().addScaledVector(sd, -ww).toArray()); uv.push(i / 8, 0, i / 8, 1); if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); } }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); const m2 = new THREE.Mesh(geo, m); m2.renderOrder = m === crev ? 1 : m === core ? 2 : 3; vg.add(m2); return m2; };
    const flameSites = [];
    const seam = (pts2, wid, crystals) => { const S = pts2.map(([x, y]) => faceAt(x, y)), n = S.length, wob = (u) => 0.75 + 0.25 * Math.sin(u * 23 + wid * 90) + 0.15 * Math.sin(u * 61);
      const taper = (u) => Math.min(1, u * 8, (1 - u) * 8); strip(S, (u) => wid * 2.4 * wob(u) * taper(u), crev, 0.003); strip(S, (u) => wid * 0.8 * wob(u) * taper(u), core, 0.005); if (O.gl > 0.01) strip(S, (u) => wid * 5.5 * taper(u), glow, 0.006);
      if (crystals) for (let i = 3; i < n - 3; i += crystals) { const j = i + Math.floor(r() * 3); if (j >= n) break; oreCluster(vg, S[j].p, S[j].n.clone().add(V((r() - 0.5) * 0.6, (r() - 0.5) * 0.4, 0)).normalize(), 0.07 + r() * 0.08, O, r); }
      if (O.flames) for (let i = 0; i < n; i += 2) flameSites.push([S[i].p.clone().addScaledVector(S[i].n, 0.008), S[i].n.clone()]); return S; };
    const main = []; for (let y = -4.2; y <= 3.3; y += 0.05) main.push([veinX(y), y]); seam(main, 0.026, 11);
    for (let k = 0; k < 9; k++) { const y0 = -3.6 + k * 0.78 + r() * 0.3, s = r() < 0.5 ? -1 : 1, P = []; let x = veinX(y0), y = y0; for (let q = 0; q < 14; q++) { P.push([x, y]); x += s * (0.025 + r() * 0.012); y += (r() - 0.4) * 0.03; } seam(P, 0.011, 0); }
    const D = LG.drill, bP = []; for (let u = 0; u <= 1; u += 0.025) { const x = lerp(veinX(-0.05), D.x + 0.5, u), y = lerp(-0.05, D.y + 0.45, u) + 0.08 * Math.sin(u * 9); bP.push([x, y]); } seam(bP, 0.016, 9);
    const pocket = (x, y, rad) => { const F = faceAt(x, y), q = new THREE.Quaternion().setFromUnitVectors(Z, F.n); const m = part(vg, new THREE.CircleGeometry(rad * 1.3, 18), LG.pitM || (LG.pitM = new THREE.MeshBasicMaterial({ map: radial('rgba(20,16,14,.95)', 'rgba(20,16,14,0)'), transparent: true, depthWrite: false })), null, null, null, { ink: false, shadow: false }); m.position.copy(F.p).addScaledVector(F.n, 0.004); m.quaternion.copy(q);
      const c2 = part(vg, new THREE.CircleGeometry(rad * 0.6, 14), new THREE.MeshBasicMaterial({ color: O.vein, map: radial('rgba(255,255,255,1)', 'rgba(255,255,255,0)'), transparent: true, depthWrite: false }), null, null, null, { ink: false, shadow: false }); c2.position.copy(F.p).addScaledVector(F.n, 0.006); c2.quaternion.copy(q); c2.scale.set(1, 0.7, 1);
      const gq = part(vg, new THREE.CircleGeometry(rad * 2.2, 20), new THREE.MeshBasicMaterial({ color: O.glow, map: radial('rgba(255,255,255,.8)', 'rgba(255,255,255,0)'), transparent: true, opacity: O.gl, depthWrite: false, blending: THREE.AdditiveBlending }), null, null, null, { ink: false, shadow: false }); gq.position.copy(F.p).addScaledVector(F.n, 0.007); gq.quaternion.copy(q);
      for (let k = 0; k < 3; k++) { const a = k / 3 * TAU + r(), p = faceAt(x + Math.cos(a) * rad * 0.9, y + Math.sin(a) * rad * 0.9); oreCluster(vg, p.p, p.n.clone().add(V(Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0)).normalize(), 0.06 + r() * 0.05, O, r); }
      for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + r() * 0.5, P = []; let px = x, py = y; for (let j = 0; j < 9; j++) { P.push([px, py]); px += Math.cos(a) * 0.022 + (r() - 0.5) * 0.012; py += Math.sin(a) * 0.026 + (r() - 0.5) * 0.012; } seam(P, 0.006, 0); } return { F, gq }; };
    pocket(LG.char.x / LG.S + 0.01, 0.3, 0.09); const bp = pocket(D.x, D.y, 0.075); LG.biteGlow = bp.gq; LG.bite = bp.F.p.clone().addScaledVector(bp.F.n, 0.01);
    if (O.flames && flameSites.length) { const fl = flamePoints(flameSites.filter((s2) => s2[0].y > -2.5 && s2[0].y < 2.8)); vg.add(fl); LG.veinFx = fl; } else LG.veinFx = null;
    if (LG.veinL) { LG.veinL.color.setHex(O.glow); LG.veinL.intensity = 0.08 + O.gl * 0.5; } if (LG.biteL) LG.biteL.color.setHex(O.spark);
    if (LG.sparks) { LG.sparks.pts.material.color.setHex(O.spark); LG.sparks.lines.material.color.setHex(O.spark); }
    vg.traverse((o) => { if (o.isMesh) o.receiveShadow = true; }); }
  /* ---------- Lifeline Drill bit, one look per pickaxe tier (more detail each step up); built along +z with the tip at the cliff, spins about z ---------- */
  function makeDrillBit(key) { const G = GRADES[key] || GRADES.bronze, T = Math.max(0, G.tier), D = LG.drill, Lb = D.L, R0 = D.R, bit = new THREE.Group(); bit.name = 'drillbit'; bit.userData.grade = key; bit.userData.fx = [];
    const metal = T === 6 ? new THREE.MeshPhongMaterial({ color: 0x8ff6ff, emissive: 0x1d93ad, specular: 0xffffff, shininess: 90, flatShading: true, transparent: true, opacity: 0.92 })
      : G.shine ? new THREE.MeshPhongMaterial({ color: G.head, specular: G.shine, shininess: G.shin || 60, emissive: G.emissive || 0 }) : toon(G.head, null, G.emissive ? { emissive: G.emissive } : {});
    const bindM = toon(G.bind), z0 = D.tip, zb = z0 + Lb, tipR = T === 0 ? 0.022 : T === 1 ? 0.014 : 0.006;
    part(bit, new THREE.CylinderGeometry(R0, tipR, Lb, T >= 2 ? 28 : 20, 1).rotateX(Math.PI / 2), metal, [0, 0, z0 + Lb / 2]);
    const zl = new THREE.MeshBasicMaterial({ color: LGRADES[(LG.tw || TWIN0()).a.grade].en, map: LG.zap, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }); LG.zapM = zl; part(bit, new THREE.CylinderGeometry(R0 + 0.002, tipR + 0.002, Lb * 0.96, 24, 1, true).rotateX(Math.PI / 2), zl, [0, 0, z0 + Lb / 2], null, null, { ink: false, shadow: false });
    if (T >= 2) part(bit, new THREE.ConeGeometry(0.012, 0.06, 10).rotateX(-Math.PI / 2), T >= 3 ? bindM : metal, [0, 0, z0 - 0.02]);
    const helixC = (rOff, turns, ph = 0, n = 260) => { const pts = []; for (let i = 0; i <= n; i++) { const u = i / n, rr = tipR * 0.6 + (R0 - tipR * 0.6) * u + rOff, a = u * turns * TAU + ph; pts.push(V(Math.cos(a) * rr, Math.sin(a) * rr, z0 + 0.012 + u * (Lb - 0.03))); } return new THREE.CatmullRomCurve3(pts); };
    const nF = [1, 1, 2, 2, 3, 2, 3, 2][T], turns = T === 0 ? 5 : 6.5 - (nF - 1) * 1.2, fr = T === 0 ? 0.015 : 0.013, fM = T === 3 ? bindM : T === 6 ? metal : toon(new THREE.Color(G.head).multiplyScalar(0.8).getHex());
    for (let f = 0; f < nF; f++) { const ph = f / nF * TAU; part(bit, new THREE.TubeGeometry(helixC(0.004, turns, ph), 520, fr, 6, false), fM);
      if (T === 2) part(bit, new THREE.TubeGeometry(helixC(0.016, turns, ph), 520, 0.004, 4, false), toon(0xf2f7fc), null, null, null, { ink: false });
      if (f === 0) part(bit, new THREE.TubeGeometry(helixC(-0.004, turns, ph + 0.25), 520, 0.006, 5, false), LG.enM, null, null, null, { ink: false, shadow: false }); }
    part(bit, cyl(R0 + 0.012, R0 + 0.012, 0.05, 24).rotateX(Math.PI / 2), T >= 3 ? bindM : metal, [0, 0, zb + 0.02]); part(bit, cyl(R0 - 0.02, R0 - 0.02, 0.05, 24).rotateX(Math.PI / 2), metal, [0, 0, zb + 0.065]);
    if (T >= 1) { const nr = T >= 3 ? 10 : 6; for (let k = 0; k < nr; k++) { const a = k / nr * TAU; part(bit, ell(0.007, 0.007, 0.005, 8, 6), T >= 3 ? bindM : toon(0x4a4d52), [Math.cos(a) * (R0 + 0.012), Math.sin(a) * (R0 + 0.012), zb + 0.02], null, null, { ink: false }); } }
    if (T >= 2) part(bit, new THREE.TorusGeometry(R0 + 0.01, 0.006, 6, 28), T >= 3 ? bindM : toon(0x9aa4ae), [0, 0, zb - 0.01]);
    if (T === 3) { part(bit, cyl(R0 + 0.004, R0 + 0.004, 0.035, 24, true).rotateX(Math.PI / 2), toon(0, fabric(G.wrap, { seed: 25, weave: 0.22 })), [0, 0, zb - 0.045], null, null, { ink: false }); for (const u of [0.35, 0.6, 0.82]) part(bit, new THREE.TorusGeometry(tipR + (R0 - tipR) * u + 0.002, 0.003, 5, 26), toon(0x8a6418), [0, 0, z0 + u * Lb], null, null, { ink: false }); }
    if (T === 4) { part(bit, new THREE.TubeGeometry(helixC(0.006, -4.5, 1.1), 420, 0.003, 4, false), toon(0xf6fbff, null, { emissive: 0x223040 }), null, null, null, { ink: false }); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + 0.26; part(bit, new THREE.OctahedronGeometry(0.011, 0), toon(0x9fd8ff, null, { emissive: 0x2a6a9a }), [Math.cos(a) * (R0 + 0.014), Math.sin(a) * (R0 + 0.014), zb + 0.045], null, [1, 1, 0.6], { ink: false }); } }
    if (T === 5) { const rm = new THREE.MeshBasicMaterial({ map: runeTex(), color: G.glow, transparent: true, depthWrite: false, side: THREE.DoubleSide }); for (const u of [0.5, 0.8]) { const rr = tipR + (R0 - tipR) * u + 0.004; part(bit, new THREE.CylinderGeometry(rr, rr, 0.05, 28, 1, true).rotateX(Math.PI / 2), rm, [0, 0, z0 + u * Lb], null, null, { ink: false, shadow: false }); }
      const gem = new THREE.MeshBasicMaterial({ color: 0xc9a2ff }); for (let k = 0; k < 4; k++) { const a = k / 4 * TAU; part(bit, new THREE.OctahedronGeometry(0.013, 0), gem, [Math.cos(a) * (R0 + 0.014), Math.sin(a) * (R0 + 0.014), zb + 0.045], null, [1, 1, 0.6], { ink: false }); }
      const pl = new THREE.PointLight(G.glow, 0.25, 0.9, 2); pl.position.set(0, 0, z0 + Lb * 0.6); bit.add(pl); bit.userData.light = pl; }
    if (T === 6) { const r = prng(61); for (let i = 0; i < 26; i++) { const u = 0.08 + i / 26 * 0.9, a = u * turns * TAU + r() * 0.4, rr = tipR + (R0 - tipR) * u; part(bit, new THREE.OctahedronGeometry(1, 0), metal, [Math.cos(a) * rr, Math.sin(a) * rr, z0 + u * Lb], [r() * 3, r() * 3, a], [0.012, 0.03 + r() * 0.015, 0.012], { ink: false }); }
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: radial('rgba(170,250,255,.7)', 'rgba(90,220,255,.2)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); gl.scale.set(0.5, 0.5, 1); gl.position.set(0, 0, z0 + Lb * 0.45); bit.add(gl); bit.userData.glow = gl;
      const pl = new THREE.PointLight(G.glow, 0.4, 1.1, 2); pl.position.set(0, 0, z0 + Lb * 0.5); bit.add(pl); bit.userData.light = pl; }
    if (T === 7) { const veinM = new THREE.MeshBasicMaterial({ color: 0xff3418 }), sites = [], r = prng(41), thorn = toon(0x221d26); bit.userData.veins = veinM;
      for (let f = 0; f < 2; f++) { const pts = []; for (let i = 0; i <= 120; i++) { const u = 0.05 + i / 120 * 0.92, a = u * turns * TAU + (f + 0.5) / 2 * TAU + 0.18 * Math.sin(u * 40 + f), rr = tipR + (R0 - tipR) * u + 0.002; pts.push(V(Math.cos(a) * rr, Math.sin(a) * rr, z0 + u * Lb)); }
        const c = new THREE.CatmullRomCurve3(pts); part(bit, new THREE.TubeGeometry(c, 240, 0.0035, 4, false), veinM, null, null, null, { ink: false, shadow: false }); for (let i = 0; i < 26; i++) { const p = c.getPointAt((i + r()) / 26.5); sites.push([p, V(p.x, p.y, 0).normalize()]); } }
      for (let i = 0; i < 14; i++) { const u = 0.15 + i / 14 * 0.8, a = u * turns * TAU, rr = tipR + (R0 - tipR) * u + 0.02, c = part(bit, new THREE.ConeGeometry(0.008, 0.035, 5), thorn, [Math.cos(a) * rr, Math.sin(a) * rr, z0 + u * Lb]); c.quaternion.setFromUnitVectors(V(0, 1, 0), V(Math.cos(a), Math.sin(a), 0)); }
      for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + 0.4; part(bit, new THREE.OctahedronGeometry(0.012, 0), new THREE.MeshBasicMaterial({ color: 0xff3a1c }), [Math.cos(a) * (R0 + 0.014), Math.sin(a) * (R0 + 0.014), zb + 0.045], null, [1, 1.3, 0.6], { ink: false }); }
      const fl = flamePoints(sites); bit.add(fl); bit.userData.fx.push(fl); bit.userData.flames = fl; }
    return bit; }
  /* ---------- the Lifeline per tier; a pulse rises along it only while ore is moving (LG.xfer: auto = while the drill sends up a load, on, off) ---------- */

  /* ---------- twin Lifelines: every Lifeline is two twined strands, A and B, each with its own tier and its own direction (to / from the Ledge) ---------- */
  const TWIN0 = () => ({ a: { grade: 'bronze', dir: 'to' }, b: { grade: 'bronze', dir: 'from' } });
  function strandOf(x, d) { x = x || {}; return { grade: LGRADES[x.grade] ? x.grade : d.grade, dir: x.dir === 'from' || x.dir === 'to' ? x.dir : d.dir }; }
  // normalise a saved Lifeline (old saves: { grade, dir: 'in' | 'out' } -> both strands that tier, A in the old flow, B the other way)
  function twinOf(P, def) { def = def || TWIN0(); if (P && P.a) return { a: strandOf(P.a, def.a), b: strandOf(P.b, def.b) }; if (P && P.grade) { const g = LGRADES[P.grade] ? P.grade : 'bronze', d = P.dir === 'out' ? 'from' : 'to'; return { a: { grade: g, dir: d }, b: { grade: g, dir: d === 'to' ? 'from' : 'to' } }; } return { a: Object.assign({}, def.a), b: Object.assign({}, def.b) }; }
  function strandMat(L) { return L.glowS ? new THREE.MeshBasicMaterial({ color: L.col }) : L.cable ? new THREE.MeshPhongMaterial({ color: L.col, specular: 0xffffff, shininess: 60 }) : toon(L.col, null, { emissive: new THREE.Color(L.core).multiplyScalar(0.15).getHex() }); }
  // the braid along a centre path: two helices half a turn apart, each strand in its own tier's material (stripe/wrap details ride on that strand),
  // each with its own glow sheath and its own transfer beads. ledgeEnd: 1 if the Ledge is at the end of the path, 0 if at its start
  function twinCord(par, pts, tw, k = 2.4, ledgeEnd = 0) { const C = new THREE.CatmullRomCurve3(pts, false, 'centripetal'), len = C.getLength(), NP = Math.max(60, Math.min(900, Math.round(len / 0.01))), P = C.getSpacedPoints(NP), g = new THREE.Group(); par.add(g);
    const LA = LGRADES[tw.a.grade] || LGRADES.bronze, LB = LGRADES[tw.b.grade] || LGRADES.bronze, srs = [LA.r * k, LB.r * k], rr = Math.max(srs[0], srs[1]) * 0.95, twist = TAU / (7 * (srs[0] + srs[1]));
    const Nn = [], Bn = []; let n0 = Math.abs(P[1].clone().sub(P[0]).normalize().y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0); for (let i = 0; i <= NP; i++) { const t2 = P[Math.min(NP, i + 1)].clone().sub(P[Math.max(0, i - 1)]).normalize(); n0.addScaledVector(t2, -n0.dot(t2)).normalize(); Nn.push(n0.clone()); Bn.push(t2.clone().cross(n0)); }
    const helix = (off, ph) => { let sA = 0; const H = []; for (let i = 0; i <= NP; i++) { if (i) sA += P[i].distanceTo(P[i - 1]); const a = ph + sA * twist; H.push(P[i].clone().addScaledVector(Nn[i], Math.cos(a) * off).addScaledVector(Bn[i], Math.sin(a) * off)); } return H; };
    const strands = [];
    ['a', 'b'].forEach((key, j) => { const x = tw[key], L = LGRADES[x.grade] || LGRADES.bronze, sr = srs[j], ph = j * Math.PI, hp = helix(rr, ph), hc = new THREE.CatmullRomCurve3(hp), seg = NP * 2;
      part(g, new THREE.TubeGeometry(hc, seg, sr, 7, false), strandMat(L), null, null, null, { ink: true });
      if (L.wrap) part(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix(rr + sr * 0.72, ph + 0.55)), seg, sr * 0.34, 4, false), toon(L.wrap), null, null, null, { ink: false, shadow: false });
      else if (L.bands) part(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix(rr + sr * 0.72, ph + 0.55)), seg, sr * 0.26, 4, false), toon(L.bands), null, null, null, { ink: false, shadow: false });
      const sc = L.vein || L.fil || L.runes; if (sc) part(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix(rr + sr * 0.78, ph - 0.5)), seg, sr * 0.24, 4, false), new THREE.MeshBasicMaterial({ color: sc }), null, null, null, { ink: false, shadow: false });
      const core = new THREE.MeshBasicMaterial({ color: L.core, transparent: true, opacity: L.co * 1.4, depthWrite: false, blending: THREE.AdditiveBlending }); part(g, new THREE.TubeGeometry(hc, seg, sr * 1.75, 8, false), core, null, null, null, { ink: false, shadow: false });
      const pm = new THREE.MeshBasicMaterial({ color: new THREE.Color(L.en).lerp(new THREE.Color(0xffffff), 0.35), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }), beads = [];
      for (let i = 0; i < 4; i++) { const b = part(g, new THREE.SphereGeometry(1, 10, 8), pm, null, null, null, { ink: false, shadow: false }); b.visible = false; beads.push(b); }
      strands.push({ key, grade: x.grade, dir: x.dir, curve: hc, pts: hp, core, co: L.co * 1.4, pm, beads, sr, xl: 0, u: 0, len: hc.getLength() }); });
    g.userData = { C, strands, rr, len, ledgeEnd, twin: tw, core: strands[0].core, co: strands[0].co }; return g; }
  // per-strand load: auto = each strand carries a load 3 s out of every 8, the two strands out of step (so each dims on its own); seed varies it per Lifeline
  function strandLoad(t, j, seed = 0) { return LG.xfer === 'on' ? 1 : LG.xfer === 'off' ? 0 : ((t + j * 4 + seed) % 8 < 3 ? 1 : 0); }
  // idle: full steady glow, no pulse; under load the strand's glow dims and its pulses run in that strand's direction ('to' runs toward the Ledge end)
  function twinTick(cd, t, dt, wants) { const U = cd.userData; let mv = 0; U.strands.forEach((S2, j) => { S2.xl = lerp(S2.xl, wants[j], 1 - Math.exp(-dt * 3)); const xl = S2.xl; if (xl > 0.05) mv = 1; S2.core.opacity = S2.co * (1.25 - 0.7 * xl); S2.pm.opacity = 0.34 * xl;
      const fwd = (S2.dir === 'to') === (U.ledgeEnd === 1), n = S2.beads.length, L = Math.max(0.6, S2.len), bl = Math.max(0.035, Math.min(0.1, S2.len * 0.04));
      for (let k = 0; k < n; k++) { const b = S2.beads[k], u0 = (t * 0.45 / L + k / n + j * 0.13) % 1, u = fwd ? u0 : 1 - u0, sc = Math.min(1, u0 / 0.06, (1 - u0) / 0.06); if (!k) S2.u = u; b.visible = xl > 0.02; S2.curve.getPointAt(u, b.position); b.quaternion.setFromUnitVectors(V(0, 1, 0), S2.curve.getTangentAt(u)); b.scale.set(S2.sr * 2.3, bl * (0.5 + 0.5 * sc), S2.sr * 2.3); } }); return mv; }
  function makeLifeline(tw) { tw = twinOf(tw && tw.a ? tw : tw ? { grade: tw, dir: 'in' } : null); const LA = LGRADES[tw.a.grade], grp = new THREE.Group(); grp.name = 'lifeline'; grp.userData.fx = []; const y0 = 0.3, top = 4.2, sr = Math.max(LA.r, LGRADES[tw.b.grade].r), rr = sr * 1.05;
    // the main line climbs from the hub toward the Ledge (the Ledge is at the top end)
    const main = twinCord(grp, [V(0, y0, 0), V(0, (y0 + top) / 2, 0), V(0, top, 0)], tw, 1, 1); grp.userData.main = main;
    main.userData.strands.forEach((S2, j) => { const L = LGRADES[S2.grade]; if (!L.vein) return; const sites = []; for (let i = 0; i < S2.pts.length; i += 5) if (S2.pts[i].y < 2.4) sites.push([S2.pts[i], V(S2.pts[i].x, 0, S2.pts[i].z).normalize()]); const fl = flamePoints(sites); grp.add(fl); grp.userData.fx.push(fl); grp.userData.flames = fl; });
    part(grp, cyl(rr + sr + 0.012, rr + sr + 0.008, 0.07, 12), DTIERS.indexOf(tw.a.grade) >= 3 ? toon(LA.bands || LA.col) : strandMat(LA), [0, y0 + 0.02, 0], null, null, { ink: false });
    // the spare Lifeline: out of the rear of the hub, down onto the deck in two heavy loops, the loose end hanging off the deck edge (ready to feed a deeper drop)
    { const D = LG.drill, deckY = 0.07 - D.y + rr + sr, edgeZ = LG.z0 + LG.D - LG.hubZ + 0.03, path = [V(0, 0, 0.1), V(0, -0.02, 0.17), V(0.01, deckY + 0.04, 0.24), V(0.03, deckY, 0.3)];
      const loop = (cx, cz, r0, a0, lift) => { for (let i = 1; i <= 14; i++) { const a = a0 + i / 14 * TAU, cr = r0 * (1 - 0.05 * i / 14); path.push(V(cx + Math.sin(a) * cr, deckY + lift * Math.max(0, Math.sin(a * 0.5 + 0.4)) * 2 * (rr + sr), cz - Math.cos(a) * cr)); } };
      loop(0.06, 0.37, 0.13, 0, 0.9); loop(0.15, 0.39, 0.12, 0.35, 0.9); path.push(V(0.2, deckY, edgeZ - 0.12), V(0.24, deckY, edgeZ - 0.02), V(0.25, deckY - 0.05, edgeZ + 0.03), V(0.25, deckY - 0.2, edgeZ + 0.045), V(0.24, deckY - 0.3, edgeZ + 0.04));
      const tail = twinCord(grp, path, tw, 1, 0); grp.userData.tailCord = tail; grp.userData.tail = tail.userData.C;
      part(grp, cyl(rr + sr + 0.006, rr + sr + 0.01, 0.06, 12).rotateX(Math.PI / 2), DTIERS.indexOf(tw.a.grade) >= 3 ? toon(LA.bands || LA.col) : strandMat(LA), [0, 0, 0.1], null, null, { ink: false }); }
    grp.userData.core = main.userData.core; grp.userData.co = main.userData.co; grp.userData.y0 = y0; grp.userData.rr = rr; grp.userData.tw = tw;
    return grp; }
  const rr2 = (U) => (U.rr || 0.02) * 2.6;
  function lifelineState(t) { return LG.xfer === 'on' ? 1 : LG.xfer === 'off' ? 0 : (t % 8 < 3 ? 1 : 0); } // auto: the drill sends a load up every 8 s and the line carries it for 3 s
  function setDrillGrade(key) { if (!GRADES[key] || key === 'stick') key = 'bronze'; LG.dg = key; if (LG.drillG) { const old = LG.bit, a = old ? old.rotation.z : 0; if (old) { LG.drillG.remove(old); old.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
      const b = makeDrillBit(key); b.rotation.z = a; b.traverse((o) => { if (o.isMesh) o.receiveShadow = true; }); LG.drillG.add(b); LG.bit = b; } ledgeMark(); }
  function setLine(tw) { LG.tw = twinOf(tw); LG.lg = LG.tw.a.grade; if (LG.drillG) { if (LG.line) { LG.drillG.remove(LG.line); LG.line.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
      const l = makeLifeline(LG.tw); l.position.set(0, 0, LG.hubZ); LG.drillG.add(l); LG.line = l; const en = LGRADES[LG.tw.a.grade].en; LG.enM.color.setHex(en); if (LG.zapM) LG.zapM.color.setHex(en); } ledgeMark(); }
  function setLineGrade(key) { if (!LGRADES[key]) key = 'bronze'; const t = twinOf(LG.tw); t.a.grade = key; t.b.grade = key; setLine(t); } // both strands
  function setStrand(w, ch) { const t = twinOf(LG.tw); Object.assign(t[w === 'b' ? 'b' : 'a'], ch); setLine(t); if (typeof S !== 'undefined' && S) { S.ledgeLine = LG.tw; delete S.lineGrade; if (typeof save === 'function') save(); } }
  function setOre(key) { if (!ORES[key]) key = 'mithril'; LG.ore = key; if (LG.cliff) buildVein(key); const e = document.getElementById('ledgeOre'); if (e) e.textContent = ORES[key].name; ledgeMark(); }
  function setXfer(k) { LG.xfer = k === 'on' || k === 'off' ? k : 'auto'; ledgeMark(); }
  function ledgeMark() { const box = document.getElementById('ledgeCtl'); if (!box) return; for (const b of box.querySelectorAll('button[data-v]')) { const k = b.parentNode.dataset.k; const tw = LG.tw || TWIN0(); b.classList.toggle('on', b.dataset.v === (k === 'ore' ? LG.ore : k === 'drill' ? LG.dg : /^l[ab]$/.test(k) ? tw[k[1]].grade : /^d[ab]$/.test(k) ? tw[k[1]].dir : LG.xfer)); } }
  function ledgeUI() { const box = document.getElementById('ledgeCtl'); if (!box || box.dataset.ok) return; box.dataset.ok = 1; const hx = (c) => '#' + c.toString(16).padStart(6, '0');
    const row = (k, label, items) => `<div class="lrow"><b>${label}</b><div class="chips" data-k="${k}">${items.map(([v, n, c]) => `<button data-v="${v}"${c !== undefined ? ` style="--sw:${hx(c)}"` : ''}>${c !== undefined ? '<i></i>' : ''}${n}</button>`).join('')}</div></div>`;
    const strandRow = (w, label) => `<div class="lrow"><b>${label}</b><div class="chips dirs" data-k="d${w}"><button data-v="to">To Ledge</button><button data-v="from">From Ledge</button></div><div class="chips" data-k="l${w}">${DTIERS.map((k) => `<button data-v="${k}" style="--sw:${hx(LGRADES[k].col)}"><i></i>${GRADES[k].name}</button>`).join('')}</div></div>`;
    box.innerHTML = row('ore', 'Ore', Object.entries(ORES).map(([k, o]) => [k, o.name, o.vein])) + row('drill', 'Drill bit', DTIERS.map((k) => [k, GRADES[k].name, GRADES[k].head])) + strandRow('a', 'Strand A') + strandRow('b', 'Strand B') + row('xfer', 'Transfer', [['auto', 'Auto'], ['on', 'On'], ['off', 'Off']]);
    box.addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (!b) return; const k = b.parentNode.dataset.k, v = b.dataset.v; if (k === 'ore') { setOre(v); S.ledgeOre = v; } else if (k === 'drill') { setDrillGrade(v); S.drillGrade = v; } else if (/^[ld][ab]$/.test(k)) setStrand(k[1], k[0] === 'l' ? { grade: v } : { dir: v }); else { setXfer(v); S.ledgeXfer = LG.xfer; } if (typeof save === 'function') save(); st.lastInput = clk; });
    ledgeMark(); }
  function makeLedge() { const g = new THREE.Group(), r = prng(77); g.name = 'portaledge';
    const rockTex = cv(128, 128, (x, w, h) => { x.fillStyle = '#857b6e'; x.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { const a = r() * 0.16; x.fillStyle = r() < 0.5 ? `rgba(40,34,28,${a})` : `rgba(235,225,205,${a})`; x.beginPath(); x.ellipse(r() * w, r() * h, 2 + r() * 9, 1 + r() * 5, r() * 3, 0, TAU); x.fill(); }
      x.strokeStyle = 'rgba(40,32,26,.45)'; x.lineWidth = 1; for (let i = 0; i < 10; i++) { let px = r() * w, py = r() * h; x.beginPath(); x.moveTo(px, py); for (let j = 0; j < 4; j++) { px += (r() - 0.5) * 22; py += (r() - 0.5) * 22; x.lineTo(px, py); } x.stroke(); } });
    const rock = toon(0xffffff, rockTex), rockDk = toon(0x6b6257), moss = toon(0x6f7d3a), wood = toon(0x6a4529), woodDk = toon(0x553722), iron = toon(0x4c4f55), ropeM = toon(0xa07a4a), canvas = toon(0xb99d72);
    // cliff: a tall pillar of columnar blocks, stepped and broken, tapering to a point below
    const cliff = new THREE.Group(); g.add(cliff);
    for (let i = 0; i < 9; i++) { const x0 = -2.0 + i * 0.44 + (r() - 0.5) * 0.08; let y = -6.5 + (i % 2) * 0.3 + Math.abs(i - 4) * 0.55; const zf = -0.02 - Math.abs(i - 3.6) * 0.05 - r() * 0.12, top = 3.4 - Math.abs(i - 4) * 0.22 + (r() - 0.5) * 0.4;
      while (y < top) { const h = Math.min(top - y, 0.7 + r() * 1.3), w = 0.42 + r() * 0.1, d = 1.6 + r() * 0.4, zf2 = zf + (r() - 0.5) * 0.1; const b = part(cliff, rockGeo(w, h, d, 1000 + i * 31 + Math.round(y * 10)), rock, [x0, y + h / 2, zf2 - d / 2]); LG.rocks.push(b);
        b.material = rock; if (r() < 0.35) part(cliff, new THREE.ConeGeometry(0.05 + r() * 0.04, 0.07, 5), moss, [x0 + (r() - 0.5) * 0.2, y + h + 0.02, zf2 - 0.06], null, null, { ink: false }); y += h + 0.01; } }
    part(cliff, rockGeo(3.6, 1.2, 2.0, 9), rockDk, [-0.2, -7.0, -1.1], [0, 0, 0.15]); part(cliff, new THREE.ConeGeometry(1.4, 2.6, 7), rockDk, [-0.3, -8.6, -1.0], [Math.PI, 0.3, 0.05]);
    const crysM = toon(0x7fb6e6, null, { emissive: 0x16426e }), crysL = new THREE.MeshBasicMaterial({ color: 0x4f98e0, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending });
    const crystal = (p, s, tilt, par = cliff) => { const c = new THREE.Group(); c.position.copy(p); c.rotation.set(tilt[0], tilt[1], tilt[2]); par.add(c);
      for (let q = 0; q < 5; q++) { const h = s * (q ? 0.5 + r() * 0.4 : 1), w = s * 0.18 * (q ? 0.7 : 1), sub = new THREE.Group(); sub.rotation.set((r() - 0.5) * (q ? 1.1 : 0.2), r() * 3, (r() - 0.5) * (q ? 1.1 : 0.2)); sub.position.set((r() - 0.5) * s * 0.3, 0, (r() - 0.5) * s * 0.3); c.add(sub);
        part(sub, new THREE.CylinderGeometry(w, w * 1.05, h * 0.75, 6), crysM, [0, h * 0.375, 0], null, null, { ink: false }); part(sub, new THREE.ConeGeometry(w, h * 0.3, 6), crysM, [0, h * 0.9, 0], null, null, { ink: false }); part(sub, new THREE.CylinderGeometry(w * 1.6, w * 1.6, h * 0.9, 6), crysL, [0, h * 0.45, 0], null, null, { ink: false, shadow: false }); }
      return c; };
    // platform: planks over two cross beams, iron corner rings
    const pf = new THREE.Group(); pf.position.set(LG.cx, 0, LG.z0 + LG.D / 2); g.add(pf); const n = 7, pw = LG.D / n;
    for (let i = 0; i < n; i++) part(pf, rbox(LG.W - (r() - 0.5) * 0.04, 0.05, pw - 0.012, 0.008), i % 2 ? wood : toon(0x76502f), [(r() - 0.5) * 0.03, 0.045, -LG.D / 2 + pw * (i + 0.5)], [0, (r() - 0.5) * 0.01, 0]);
    for (const s of [-1, 1]) { part(pf, rbox(0.09, 0.07, LG.D + 0.08, 0.01), woodDk, [s * (LG.W / 2 - 0.12), -0.02, 0]); part(pf, rbox(LG.W + 0.1, 0.06, 0.08, 0.01), woodDk, [0, 0.0, s * (LG.D / 2 - 0.02)]); }
    const corners = []; for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const p = V(sx * (LG.W / 2 + 0.02), 0.03, sz * (LG.D / 2 + 0.02)); part(pf, new THREE.TorusGeometry(0.035, 0.009, 6, 12), iron, [p.x, p.y, p.z], [0, Math.PI / 4 * sx * sz, 0]); corners.push(p.clone().add(pf.position)); }
    // rigging: 4 ropes from the corners to one ring + carabiner, a short chain to a piton driven into the rock
    const ring = V(LG.cx, 2.75, 0.62), pit = V(LG.cx, 3.05, 0.0), seg = (a, b, rad, m) => { const d = b.clone().sub(a), L = d.length(), o = part(g, cyl(rad, rad, 1, 6), m, null, null, null, { ink: false }); o.position.copy(a).addScaledVector(d, 0.5); o.scale.set(1, L, 1); o.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); return o; };
    for (const c2 of corners) seg(c2, ring, 0.011, ropeM); part(g, new THREE.TorusGeometry(0.05, 0.012, 6, 14), iron, [ring.x, ring.y, ring.z], [0, 0, 0]); part(g, new THREE.TorusGeometry(0.035, 0.009, 6, 12), iron, [ring.x, ring.y + 0.07, ring.z], [0, Math.PI / 2, 0]);
    for (let k = 0; k < 6; k++) { const p = ring.clone().lerp(pit, (k + 1.5) / 7.5); part(g, new THREE.TorusGeometry(0.03, 0.008, 6, 10), iron, [p.x, p.y, p.z], [Math.atan2(pit.z - ring.z, pit.y - ring.y) + Math.PI / 2, k % 2 ? Math.PI / 2 : 0, 0]); }
    part(g, cyl(0.014, 0.02, 0.16, 8), iron, [pit.x, pit.y, pit.z + 0.03], [Math.PI / 2, 0, 0]); part(g, rbox(0.06, 0.08, 0.012, 0.004), iron, [pit.x, pit.y, pit.z + 0.1]);
    // tent: a ridge tent on the right two-thirds, open toward the front, patched canvas, flaps tied back, lantern inside
    const tent = new THREE.Group(); tent.position.set(1.12, 0.07, LG.z0 + LG.D / 2 + 0.05); g.add(tent); const tw = 1.25, td = 1.2, th = 1.05; g.updateMatrixWorld(true);
    const sheet = (pts, m) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3)); geo.setIndex(pts.length === 4 ? [0, 1, 2, 0, 2, 3] : [0, 1, 2]); geo.computeVertexNormals(); const o = part(tent, geo, m, null, null, null, { ink: false }); o.material.side = THREE.DoubleSide; return o; };
    const cm = toon(0xb99d72); cm.side = THREE.DoubleSide; const cmIn = toon(0x9c8460); cmIn.side = THREE.DoubleSide;
    for (const s of [-1, 1]) { sheet([[0, th, -td / 2], [0, th, td / 2], [s * tw / 2, 0, td / 2 + 0.04], [s * tw / 2, 0, -td / 2 - 0.04]], cm); sheet([[0, th - 0.02, -td / 2 + 0.01], [0, th - 0.02, td / 2], [s * (tw / 2 - 0.02), 0.01, td / 2 + 0.03], [s * (tw / 2 - 0.02), 0.01, -td / 2 - 0.03]], cmIn); }
    sheet([[-tw / 2, 0, -td / 2], [tw / 2, 0, -td / 2], [0, th, -td / 2]], cmIn); part(tent, new THREE.PlaneGeometry(tw * 0.95, td * 0.95).rotateX(-Math.PI / 2), cmIn, [0, 0.005, 0], null, null, { ink: false });
    for (const s of [-1, 1]) { const fl = sheet([[0, th, td / 2], [s * tw / 2, 0, td / 2 + 0.04], [s * tw * 0.3, 0, td / 2 + 0.12]], cm); fl.position.x = 0; part(tent, cyl(0.025, 0.025, 0.24, 8), cm, [s * tw * 0.36, 0.34, td / 2 + 0.07], [0, 0, s * 0.35], null, { ink: false }); }
    part(tent, cyl(0.018, 0.018, td + 0.12, 8), woodDk, [0, th + 0.01, 0], [Math.PI / 2, 0, 0]); for (const z of [-td / 2, td / 2]) for (const s of [-1, 1]) seg(tent.localToWorld(V(s * 0.015, th, z)).sub(g.position), tent.localToWorld(V(s * tw / 2, 0, z)).sub(g.position), 0.008, ropeM);
    const patch = (s, u, v, w, h, col) => { const a = Math.atan2(th, tw / 2), x = s * tw / 2 * (1 - v), y = th * v; const o = part(tent, new THREE.PlaneGeometry(w, h), toon(col), [x + s * 0.004, y + 0.004, u], [0, s * Math.PI / 2, 0], null, { ink: false }); o.rotateX(-(Math.PI / 2 - a)); o.material.side = THREE.DoubleSide; };
    patch(1, -0.2, 0.45, 0.24, 0.2, 0x8a4f34); patch(1, 0.25, 0.3, 0.2, 0.18, 0x6f7449); patch(-1, 0.1, 0.5, 0.18, 0.16, 0x7a6a3c);
    const lan = new THREE.Group(); lan.position.set(0, th - 0.18, 0.05); tent.add(lan); part(lan, rbox(0.07, 0.1, 0.07, 0.01), iron); part(lan, rbox(0.055, 0.075, 0.055, 0.008), new THREE.MeshBasicMaterial({ color: 0xffc66a }), null, null, null, { ink: false, shadow: false });
    part(lan, new THREE.SphereGeometry(0.085, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffb04a, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }), null, null, null, { ink: false, shadow: false }); const ll = new THREE.PointLight(0xffb060, 0.4, 1.6, 2); lan.add(ll); seg(tent.localToWorld(V(0, th, 0.05)).sub(g.position), tent.localToWorld(V(0, th - 0.13, 0.05)).sub(g.position), 0.004, iron);
    const bucket = (par, p, s) => { const b = new THREE.Group(); b.position.copy(p); b.scale.setScalar(s); par.add(b); part(b, cyl(0.15, 0.18, 0.28, 16, true), wood, [0, 0.14, 0]); const bm = toon(0x6b4527); bm.side = THREE.DoubleSide; part(b, new THREE.CircleGeometry(0.15, 16).rotateX(-Math.PI / 2), bm, [0, 0.01, 0], null, null, { ink: false }); for (const y of [0.05, 0.23]) part(b, new THREE.TorusGeometry(0.155 + y * 0.1, 0.008, 6, 20), iron, [0, y, 0], [Math.PI / 2, 0, 0]);
      for (let q = 0; q < 9; q++) { const a = q / 9 * TAU, rr = 0.09 * Math.sqrt(r()); crystal(V(Math.cos(a) * rr, 0.25, Math.sin(a) * rr), 0.07 + r() * 0.04, [(r() - 0.5) * 0.8, 0, (r() - 0.5) * 0.8], b); } return b; };
    // small details: a bucket of crystals by the tent, a hammer and a coil on the planks
    bucket(g, V(0.95, 0.07, LG.z0 + LG.D - 0.2), 0.8); const hm = new THREE.Group(); hm.position.set(-0.92, 0.09, LG.z0 + 0.45); hm.rotation.set(0, 0.7, Math.PI / 2); g.add(hm); part(hm, cyl(0.014, 0.016, 0.34, 8), wood, [0, 0, 0]); part(hm, rbox(0.11, 0.045, 0.045, 0.008), iron, [0, 0.17, 0]);
    part(g, new THREE.TorusGeometry(0.1, 0.022, 8, 18), ropeM, [-0.36, 0.1, LG.z0 + 1.36], [Math.PI / 2, 0, 0]);
    LG.rocks.push(part(cliff, rockGeo(0.8, 0.9, 0.34, 4242, 0.05), rock, [LG.drill.x, LG.drill.y + 0.1, -0.17])); // rock boss the bit bites into, face at z ~ 0
    // Lifeline Drill (idle miner): a spiral cone bit lying on the deck, perpendicular to the cliff, its tip boring into the vein; brass hub at the back on one iron bearing block (its only support);
    // the Lifeline drops from above into the hub. No engine, no gearbox, nothing touches the spinning bit. The bit and the Lifeline are rebuilt per tier (setDrillGrade / setLineGrade).
    { const D = LG.drill, ore = ORES[LG.ore] || ORES.mithril, dr = new THREE.Group(); dr.position.set(D.x, D.y, 0); g.add(dr); LG.drillG = dr;
      const brass = toon(0xb3893f), brassDk = toon(0x8a6428);
      LG.zap = cv(256, 64, (x, w, h) => { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); x.strokeStyle = '#ffffff'; x.lineWidth = 1.4; const q = prng(5); for (let i = 0; i < 9; i++) { let px = q() * w, py = q() * h; x.beginPath(); x.moveTo(px, py); for (let j = 0; j < 6; j++) { px += (q() - 0.3) * 18; py += (q() - 0.5) * 14; x.lineTo(px, py); } x.stroke(); } });
      LG.enM = new THREE.MeshBasicMaterial({ color: 0x7cc4ff, map: cv(64, 8, (x, w, h) => { const gr = x.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); }), transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }); LG.enM.map.repeat.set(10, 1);
      const zb = D.tip + D.L, hz = zb + 0.09 + D.hub / 2; LG.hubZ = hz;
      part(dr, cyl(0.085, 0.085, D.hub, 22).rotateX(Math.PI / 2), brass, [0, 0, hz]); part(dr, cyl(0.1, 0.1, 0.03, 22).rotateX(Math.PI / 2), brassDk, [0, 0, hz - D.hub / 2]);
      part(dr, cyl(0.055, 0.055, 0.04, 18).rotateX(Math.PI / 2), brassDk, [0, 0, hz + D.hub / 2 + 0.02]); part(dr, cyl(0.03, 0.03, 0.04, 14).rotateX(Math.PI / 2), brass, [0, 0, hz + D.hub / 2 + 0.06]);
      part(dr, cyl(0.03, 0.026, 0.1, 14), brass, [0, 0.11, hz]); part(dr, cyl(0.04, 0.04, 0.02, 14), brassDk, [0, 0.08, hz]); part(dr, new THREE.TorusGeometry(0.022, 0.007, 6, 12), iron, [0, 0.18, hz], [0, Math.PI / 2, 0]);
      for (let k = 0; k < 2; k++) part(dr, new THREE.TorusGeometry(0.024, 0.0075, 6, 12), iron, [0, 0.22 + k * 0.04, hz], [0, k ? 0 : Math.PI / 2, 0]);
      const by = -D.y + 0.07; part(dr, rbox(0.1, D.y - 0.07 - 0.05, 0.12, 0.01), iron, [0, by + (D.y - 0.12) / 2 + 0.035, hz]); part(dr, rbox(0.2, 0.05, 0.2, 0.012), iron, [0, by + 0.025, hz]); part(dr, rbox(0.14, 0.03, 0.15, 0.01), iron, [0, -0.06, hz]);
      const bl = new THREE.PointLight(ore.spark, 0.6, 1.6, 2); bl.position.set(D.x, D.y, 0.2); g.add(bl); LG.biteL = bl;
      const vl = new THREE.PointLight(ore.glow, 0.08 + ore.gl * 0.5, 2.6, 2); vl.position.set(LG.char.x / LG.S + 0.1, 0.6, 0.45); g.add(vl); LG.veinL = vl;
      const N = 220, pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3)); const spM = new THREE.PointsMaterial({ color: ore.spark, size: 0.05, map: radial('rgba(255,255,255,1)', 'rgba(255,255,255,0)'), transparent: true, depthWrite: false, sizeAttenuation: true });
      const sp = new THREE.Points(pg, spM); sp.frustumCulled = false; g.add(sp); LG.sparks = { pts: sp, p: new Float32Array(N * 3), v: new Float32Array(N * 3), life: new Float32Array(N), N, acc: 0, rnd: prng(99) };
      // a streak layer (short line segments along each spark's velocity) so they read as sparks, not dots
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 6), 3)); const ls = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: ore.spark, transparent: true, opacity: 0.95, depthWrite: false })); ls.frustumCulled = false; g.add(ls); LG.sparks.lines = ls; LG.bite = V(D.x, D.y, D.tip + 0.01); }
    g.traverse((o) => { if (o.isMesh && o.material !== OUT) o.receiveShadow = true; }); g.scale.setScalar(LG.S); g.visible = false; LG.g = g; LG.cliff = cliff;
    buildVein(LG.ore); setDrillGrade(LG.dg); setLine(LG.tw); return g; }
  // Lifeline Drill per-frame: bit spin, energy along the flute, tier effects, the transfer pulse, bite flicker, ore-coloured sparks thrown back off the cliff
  function ledgeTick(dt) { if (!LEDGE || !LG.bit) return; const on = LG.drillOn !== false; LG.spin = lerp(LG.spin || 0, on ? LG.drill.rps * TAU : 0, 1 - Math.exp(-dt * 3)); LG.bit.rotation.z -= LG.spin * dt; const t = clk;
    LG.enM.map.offset.x -= dt * 2.2 * (LG.spin / (LG.drill.rps * TAU) || 0); LG.zap.offset.set((t * 0.37) % 1, (t * 0.9) % 1);
    updatePickFx(LG.bit, t); const ln = LG.line; if (ln) { for (const fx of ln.userData.fx) { const u = fx.material.uniforms; u.uTime.value = t; u.uUp.value.set(0, 1, 0); u.uScale.value = R ? R.domElement.height / 2 : 400; } }
    if (LG.veinFx) { const u = LG.veinFx.material.uniforms; u.uTime.value = t; u.uUp.value.set(0, 1, 0); u.uScale.value = (R ? R.domElement.height / 2 : 400) * 2.2; }
    // transfer pulse: fades in while ore is moving, three soft beads climbing the Lifeline; gone when nothing moves
    if (ln) { const U = ln.userData, w = [strandLoad(t, 0), strandLoad(t, 1)], m1 = twinTick(U.main, t, dt, w); twinTick(U.tailCord, t, dt, w); LG.xl = Math.max(...U.main.userData.strands.map((x) => x.xl)); LG.moving = !!m1; }
    const st2 = document.getElementById('ledgeXferS'); if (st2) { const s = LG.moving ? 'moving ore' : 'idle'; if (st2.textContent !== s) st2.textContent = s; }
    const k = on ? 1 : 0, fl = 0.6 + 0.4 * Math.sin(t * 37) * Math.sin(t * 23); LG.biteL.intensity = k * (0.25 + 0.2 * fl); if (LG.biteGlow) { LG.biteGlow.scale.setScalar(0.85 + 0.3 * fl * k); LG.biteGlow.material.opacity = (0.5 + 0.5 * k * fl) * (ORES[LG.ore].gl + 0.1); }
    const S2 = LG.sparks, P = S2.p, Vv = S2.v, L = S2.life, r = S2.rnd, b = LG.bite; S2.acc += dt * 260 * k * LG.spin / (LG.drill.rps * TAU);
    for (let i = 0; i < S2.N; i++) { if (L[i] <= 0 && S2.acc >= 1) { S2.acc -= 1; const a = r() * TAU, rr = 0.02 * r(); P[i * 3] = b.x + Math.cos(a) * rr; P[i * 3 + 1] = b.y + Math.sin(a) * rr; P[i * 3 + 2] = b.z + 0.01;
        const sp = 1.2 + r() * 2.4, th = r() * TAU, cone = 0.35 + r() * 1.0; Vv[i * 3] = Math.cos(th) * Math.sin(cone) * sp; Vv[i * 3 + 1] = Math.sin(th) * Math.sin(cone) * sp + 0.6; Vv[i * 3 + 2] = Math.cos(cone) * sp * 0.8; L[i] = 0.18 + r() * 0.4; }
      if (L[i] > 0) { L[i] -= dt; Vv[i * 3 + 1] -= 6.5 * dt; for (let j = 0; j < 3; j++) { Vv[i * 3 + j] *= Math.exp(-dt * 1.5); P[i * 3 + j] += Vv[i * 3 + j] * dt; } if (P[i * 3 + 2] < 0.01) { P[i * 3 + 2] = 0.01; Vv[i * 3 + 2] *= -0.4; } if (P[i * 3 + 1] < 0.08 && P[i * 3 + 2] > 0.06) L[i] = 0; } }
    const pa = S2.pts.geometry.attributes.position, la = S2.lines.geometry.attributes.position;
    for (let i = 0; i < S2.N; i++) { const live = L[i] > 0, x = live ? P[i * 3] : 0, y = live ? P[i * 3 + 1] : -50, z = live ? P[i * 3 + 2] : 0; pa.setXYZ(i, x, y, z); const s = 0.035; la.setXYZ(i * 2, x, y, z); la.setXYZ(i * 2 + 1, x - Vv[i * 3] * s, y - Vv[i * 3 + 1] * s, z - Vv[i * 3 + 2] * s); }
    pa.needsUpdate = true; la.needsUpdate = true; }
  function ledgeMode(on) { if (!R) return; if (on && !LEDGE) { LG.ore = ORES[S.ledgeOre] ? S.ledgeOre : 'mithril'; LG.dg = LGRADES[S.drillGrade] ? S.drillGrade : 'bronze'; LG.tw = twinOf(S.ledgeLine || (LGRADES[S.lineGrade] ? { grade: S.lineGrade, dir: 'in' } : null)); LG.lg = LG.tw.a.grade; LG.xfer = S.ledgeXfer || 'auto'; LEDGE = makeLedge(); ledgeUI(); const e = document.getElementById('ledgeOre'); if (e) e.textContent = ORES[LG.ore].name; scene.add(LEDGE); LG.bg = cv(8, 256, (g2, w, h) => { const gr = g2.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#dfe9f2'); gr.addColorStop(0.6, '#efe4d0'); gr.addColorStop(1, '#c9a87c'); g2.fillStyle = gr; g2.fillRect(0, 0, w, h); }); LG.bg0 = scene.background; }
    st.ledge = !!on; cam.fov = on ? 34 : 26; cam.updateProjectionMatrix(); if (LEDGE) LEDGE.visible = !!on; for (const fl of FLOOR) fl.visible = !on; if (LG.bg) scene.background = on ? LG.bg : LG.bg0; wrap.classList.toggle('ledge', !!on);
    const key = scene.children.find((o) => o.isDirectionalLight && o.castShadow); if (key) { Object.assign(key.shadow.camera, on ? { left: -3.8, right: 3.8, top: 4.2, bottom: -3.4, near: 0.5, far: 18 } : { left: -1.2, right: 1.2, top: 2, bottom: -0.4, near: 0.5, far: 8 }); key.shadow.camera.updateProjectionMatrix(); key.position.set(on ? 2.2 : 1.4, on ? 4.5 : 3.2, on ? 4.2 : 2.6); }
    if (on) { if (!st.orb) st.orb = { az: 0.62, el: 0.2, d: 7.6 }; st.tool = 'pick'; an.eq = { held: 'pick', seq: null, t: 0 }; an.cl = null; an.tv = null; setAnim('mine'); st.yaw = Math.PI; st.yawV = 0; } }
  function bindInput() { const pts = new Map(); let pinch0 = 0, dist0 = 0;
    let tap0 = null; canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); tap0 = pts.size === 1 ? [e.clientX, e.clientY, performance.now(), st.yaw] : null; st.lastInput = clk; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); dist0 = (st.ledge || st.home) && st.orb ? st.orb.d : st.dist; } });
    canvas.addEventListener('pointermove', (e) => { if (!pts.has(e.pointerId)) return; const pr = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); st.lastInput = clk;
      if (pts.size === 1 && (st.ledge || st.home) && st.orb) { const dx = e.clientX - pr[0], dy = e.clientY - pr[1]; st.orb.az -= dx * 0.009; st.orb.azV = -dx * 0.009 / 0.016; st.orb.el = clamp(st.orb.el + dy * 0.006, -0.35, 1.2); } else if (pts.size === 1) { const dx = e.clientX - pr[0]; st.yaw += dx * 0.011; st.yawV = dx * 0.011 / 0.016; } else if (pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch0 > 0) { if ((st.ledge || st.home) && st.orb) st.orb.d = clamp(dist0 * pinch0 / d, 2.4, 14); else st.dist = clamp(dist0 * pinch0 / d, 2.0, DMAX); } } });
    const up = (e) => { if (e.type === 'pointerup' && tap0 && st.home && Math.hypot(e.clientX - tap0[0], e.clientY - tap0[1]) < 10 && performance.now() - tap0[2] < 600) { homeTap(e.clientX, e.clientY); } else if (e.type === 'pointerup' && tap0 && (st.play || st.anim === 'climb') && !st.ledge && !st.home && Math.hypot(e.clientX - tap0[0], e.clientY - tap0[1]) < 10 && performance.now() - tap0[2] < 600) { st.yaw = tap0[3]; st.yawV = 0; if (WALLG) WALLG.rotation.y = st.yaw; pgGo(pgPick(e.clientX, e.clientY)); } tap0 = null; pts.delete(e.pointerId); if (pts.size < 2) pinch0 = 0; }; canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); if (st.ledge && st.orb) st.orb.d = clamp(st.orb.d * Math.exp(e.deltaY * 0.0012), 3.2, 14); else st.dist = clamp(st.dist * Math.exp(e.deltaY * 0.0012), 2.0, DMAX); st.lastInput = clk; }, { passive: false });
    const cp = document.getElementById('charPick'); if (cp) { markPick();
      cp.addEventListener('click', (e) => { const gb = e.target.closest('[data-gear]'); if (gb) { gear = gb.dataset.gear; markPick(); return; } const b = e.target.closest('[data-grade]'); if (!b) return; if (gear === 'pick') { S.pickGrade = b.dataset.grade; setPick(S.pickGrade); } else if (gear === 'climb') { S.climbGrade = b.dataset.grade; setClimb(S.climbGrade); } else { S.tetherGrade = b.dataset.grade; setTether(S.tetherGrade); } if (typeof save === 'function') save(); st.lastInput = clk; }); }
    const cl = document.getElementById('charClimb'); if (cl) cl.addEventListener('click', (e) => { const gb = e.target.closest('[data-gait]'); if (gb) { setGait(gb.dataset.gait); st.lastInput = clk; return; } const b = e.target.closest('[data-dir]'); if (b && st.pg) { st.pg = null; if (st.gnd) st.gnd.goal = null; } if (b && (!an.tv || an.tv.k === 'anchored')) setClimbDir(b.dataset.dir); else if (b && b.dataset.dir === 'stop') tetherAct('stop'); const tb = e.target.closest('[data-tv]'); if (tb) tetherAct(tb.dataset.tv); st.lastInput = clk; });
    const lh = document.getElementById('ledgeHome'); if (lh) lh.addEventListener('click', () => { if (typeof S !== 'undefined' && S) S.homeArrive = 'globe'; if (typeof setTab === 'function') setTab('home'); });
    const ce = document.getElementById('charEquip'); if (ce) ce.addEventListener('click', (e) => { const b = e.target.closest('[data-tool]'); if (b) setTool(b.dataset.tool); st.lastInput = clk; });
    const ca = document.getElementById('charAnim'); if (ca) ca.addEventListener('click', (e) => { const b = e.target.closest('[data-anim]'); if (b) setAnim(b.dataset.anim); st.lastInput = clk; });
    document.getElementById('charSex').addEventListener('click', (e) => { const b = e.target.closest('[data-sex]'); if (!b) return; S.charSex = b.dataset.sex; setChar(S.charSex); if (typeof save === 'function') save(); st.lastInput = clk; });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (st.visible) start(); }); }
  function resize() { const w = wrap.clientWidth || 390, h = wrap.clientHeight || 600; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  function frame(ts) { if (!running) return; raf = requestAnimationFrame(frame); const now = ts / 1000, dt = Math.min(0.05, tPrev ? now - tPrev : 0.016); tPrev = now; clk += dt; st.frames++;
    if (st.paused) return; // frame capture / tests drive time with advance()
    if (st.fixedDt) return renderAt(st.fixedDt);
    step(dt); }
  function step(dt) { pgFade(dt); if (!st.dragging) { st.yaw += st.yawV * dt; st.yawV *= Math.exp(-dt * 4); } rig.root.rotation.y = st.yaw; animate(rig, clk, dt);
    if (st.ledge) { ledgeTick(dt); const o = st.orb; if (!st.dragging) { o.az += (o.azV || 0) * dt; o.azV = (o.azV || 0) * Math.exp(-dt * 4); } const t = LG.tgt, ce = Math.cos(o.el); cam.position.set(t.x + Math.sin(o.az) * ce * o.d, t.y + Math.sin(o.el) * o.d, t.z + Math.cos(o.az) * ce * o.d); cam.lookAt(t); updHV(); (st.noRender || R.render(scene, cam)); return; }
    if (st.home) { homeTick(dt); const o = st.orb; if (!st.dragging) { o.az += (o.azV || 0) * dt; o.azV = (o.azV || 0) * Math.exp(-dt * 4); } const G = st.gnd, want = HM.mode === 'in' ? V(G ? G.x * 0.25 : 0, 0.55, G ? G.z * 0.25 - 0.25 : 0) : V(HM.dx, 0.8, HM.FZ + 0.25), t = HM.tgt || (HM.tgt = want.clone()); t.lerp(want, st.paused ? 1 : 1 - Math.exp(-dt * 3)); const ce = Math.cos(o.el);
      cam.position.set(t.x + Math.sin(o.az) * ce * o.d, t.y + Math.sin(o.el) * o.d, t.z + Math.cos(o.az) * ce * o.d); cam.lookAt(t); if (st.homeCam) st.homeCam(cam); const cp = cam.position, Wl = HM.walls; if (HM.ceil) HM.ceil.visible = HM.mode === 'in' && cp.y < HM.H - 0.05; homeLights(HM.mode === 'in'); if (Wl) { Wl.front.visible = !!(HM.mode === 'door' || cp.z < HM.FZ || (HM.anim && HM.anim.walk)); Wl.left.visible = cp.x > -HM.W / 2; Wl.right.visible = cp.x < HM.W / 2; Wl.back.visible = cp.z > HM.BZ; HM.door.visible = Wl.front.visible; for (const [m, sd] of HM.edge || []) m.visible = sd.every((k) => Wl[k].visible); for (const cd of HM.cordList || []) if (cd.userData.ext) cd.visible = HM.mode === 'door'; } updHV(); (st.noRender || R.render(scene, cam)); return; }
    if (st.faceCam) { rig.root.updateMatrixWorld(true); const h = rig.B.headC.getWorldPosition(V(0, 0, 0)), fc = st.faceCam; cam.position.set(h.x, h.y + (fc.dy || 0), h.z + fc.d); updHV(); cam.lookAt(h.x, h.y + (fc.ly || 0), h.z); (st.noRender || R.render(scene, cam)); return; }
    const z = clamp((4.1 - st.dist) / 2.1, 0, 1), ty = lerp(0.84, 1.28, z), cf = st.camF || (st.camF = V(0, 0, 0)); cf.lerp(an.act === 'climb' ? (() => { const h = rig.B.hips.getWorldPosition(V(0, 0, 0)); return V(h.x, rig.root.position.y, h.z); })() : rig.root.position, st.paused ? 1 - Math.exp(-dt * 6) : 1 - Math.exp(-dt * 3)); const pl = st.pl = (st.pl || 0) + ((st.play ? 1 : 0) - (st.pl || 0)) * (st.paused ? 1 : 1 - Math.exp(-dt * 3)); const zo = ss(5.6, DMAX, st.dist), ce = V(0, 6.2, -6).applyAxisAngle(V(0, 1, 0), st.yaw), lx = lerp(cf.x, ce.x, zo * 0.85), ly = lerp(cf.y + ty - 0.55 * pl, ce.y, zo * 0.85), lz = lerp(cf.z, ce.z, zo * 0.85); cam.position.set(lx, ly + 0.18 + 0.1 * (1 - z) + 0.55 * pl + 0.3 * (st.dist - 5.6) * zo + (1 - zo) * 0.55 * pl, lz + st.dist + 1.4 * pl); cam.lookAt(lx, ly, lz); if (Math.abs(cam.fov - (26 + 10 * pl)) > 0.05) { cam.fov = 26 + 10 * pl; cam.updateProjectionMatrix(); } if (st.camFn) st.camFn(cam, rig); updHV(); (st.noRender || R.render(scene, cam)); }
  function updHV() { const hc = rig && rig.B.headC; if (!hc) return; rig.root.updateMatrixWorld(true); HVIEW.value.copy(cam.position); hc.worldToLocal(HVIEW.value); HVIEW.value.normalize(); }
  function renderAt(dt) { clk += dt; step(dt); }
  function start() { if (running || !st.ok) return; running = true; tPrev = 0; resize(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function show(mode) { wrap = document.getElementById('charWrap'); wrap.classList.remove('hidden'); st.visible = true; if (!R && !initGL()) return; const sex = S.charSex === 'f' ? 'f' : 'm'; if (st.tool === undefined) { st.tool = S.toolMode === 'climb' ? 'climb' : 'pick'; an.eq = null; setTool(st.tool, true); } setChar(sex); if (st.gait === undefined) { st.gait = S.gait === 'walk' ? 'walk' : 'run'; document.querySelectorAll('#charClimb [data-gait]').forEach((b) => b.classList.toggle('on', b.dataset.gait === st.gait)); } if (mode === 'home') homeMode(true); else if (st.home) { homeMode(false); setAnim('idle'); } if (mode === 'ledge') ledgeMode(true); else if (st.ledge) { ledgeMode(false); setAnim('idle'); } resize(); start(); }
  function hide() { if (st.home) { homeMode(false); setAnim('idle'); } const w = document.getElementById('charWrap'); if (w) w.classList.add('hidden'); st.visible = false; stop(); }
  window.addEventListener('resize', () => { if (running) resize(); });
  /* ---------- Home: the delver's door in the cliff (Lifeline ports) and the room behind it ---------- */
  // frame: door in the front wall plane z = HM.FZ, interior x in [-HM.W/2, HM.W/2], z in [HM.BZ, HM.FZ]; exterior ledge shelf in front (z > HM.FZ)
  const HM = { W: 7.2, BZ: -2.8, FZ: 2.8, H: 2.6, dw: 0.92, dh: 1.55, dx: -1.5, pc: 0.86, ring: 0.3, mode: null, open: 0, ports: null, sel: 'c', g: null, ext: null, room: null, obs: [] };
  const PORTS = ['c', 'p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
  function homeState() { if (typeof S === 'undefined' || !S) return { ports: {}, open: 0 }; if (!S.home) S.home = { ports: {}, open: 0 }; return S.home; } // open: how many of the 8 small ports are unlocked
  function portPos(id) { if (id === 'c') return V(0, HM.pc, 0); const i = +id.slice(1), a = Math.PI / 2 - i * TAU / 8; return V(Math.cos(a) * HM.ring, HM.pc + Math.sin(a) * HM.ring * 1.12, 0); }
  function woodTex(base, dark, seed, n = 6) { const r = prng(seed); return cv(128, 256, (x, w, h) => { x.fillStyle = base; x.fillRect(0, 0, w, h); for (let k = 0; k < n; k++) { const x0 = k * w / n; x.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.08})`; x.fillRect(x0, 0, w / n, h); x.fillStyle = dark; x.fillRect(x0, 0, 1.5, h); for (let i = 0; i < 9; i++) { x.strokeStyle = `rgba(40,20,8,${0.12 + r() * 0.15})`; x.lineWidth = 1; x.beginPath(); const xx = x0 + 3 + r() * (w / n - 6); x.moveTo(xx, 0); x.bezierCurveTo(xx + (r() - 0.5) * 8, h * 0.3, xx + (r() - 0.5) * 8, h * 0.7, xx, h); x.stroke(); } } }); }
  function archShape(w, h, inset = 0) { const s = new THREE.Shape(), hw = w / 2 - inset, r = hw, yb = inset, yt = h - inset - r; s.moveTo(-hw, yb); s.lineTo(hw, yb); s.lineTo(hw, yt); s.absarc(0, yt, r, 0, Math.PI, false); s.lineTo(-hw, yb); return s; }
  // the door leaf (both faces): planks, iron band, studs, hinges, iron handle, brass ports. Built in its own frame: hinge line at x = +dw/2, outward face +z
  function makeDoor() { const g = new THREE.Group(), w = HM.dw, h = HM.dh, th = 0.07, piv = new THREE.Group(), leaf = new THREE.Group(); piv.position.x = w / 2; g.add(piv); leaf.position.x = -w; piv.add(leaf); // pivot on the hinge (right) side, handle on the left
    const plank = woodTex('#8a5a32', 'rgba(40,20,8,.55)', 5), ex = new THREE.ExtrudeGeometry(archShape(w, h, 0.01), { depth: th, bevelEnabled: false, curveSegments: 24 }); ex.translate(0, 0, -th / 2);
    { const P = ex.attributes.position, uv = ex.attributes.uv; for (let i = 0; i < P.count; i++) uv.setXY(i, (P.getX(i) + w / 2) / w, P.getY(i) / h); }
    const body = part(leaf, ex, toon(0xffffff, plank), [w / 2, 0, 0]); body.userData.door = true;
    const iron = toon(0x45474b), brass = toon(0xb07a3a), stud = new THREE.SphereGeometry(0.014, 8, 6);
    // iron band round the edge (both faces) + studs
    for (const sz of [1, -1]) { const band = archShape(w, h, 0.012); band.holes.push(new THREE.Path(archShape(w, h, 0.085).getPoints(40)));
      part(leaf, new THREE.ExtrudeGeometry(band, { depth: 0.012, bevelEnabled: false, curveSegments: 24 }), iron, [w / 2, 0, sz * th / 2 + (sz < 0 ? -0.012 : 0)], null, null, { ink: false });
      const pts = archShape(w, h, 0.048).getSpacedPoints(30); for (const p of pts) part(leaf, stud, toon(0x8a6a3a), [w / 2 + p.x, p.y, sz * (th / 2 + 0.014)], null, null, { ink: false, shadow: false });
      // hinges (on the hinge side, outside face shows straps)
      for (const y of [0.32, h - 0.42]) part(leaf, rbox(0.34, 0.07, 0.01, 0.004), iron, [w - 0.13, y, sz * (th / 2 + 0.008)], null, null, { ink: false }); }
    // iron handle: a back plate + a lever on both faces (latch side, x = 0.12)
    const handle = new THREE.Group(); handle.position.set(0.12, 0.78, 0); leaf.add(handle); for (const sz of [1, -1]) { part(handle, rbox(0.06, 0.2, 0.012, 0.005), iron, [0, 0, sz * (th / 2 + 0.008)], null, null, { ink: false }); part(handle, cyl(0.012, 0.012, 0.11, 8), iron, [0.045, 0.02, sz * (th / 2 + 0.05)], [0, 0, Math.PI / 2]); part(handle, cyl(0.009, 0.009, 0.05, 6), iron, [0, 0.02, sz * (th / 2 + 0.028)], [Math.PI / 2, 0, 0]); } handle.userData.handle = true; g.userData.handle = handle;
    // ports: centre (brass, glowing blue Lifeline socket) + 8 small rings; exterior padlocks on the locked ones
    const glowM = new THREE.MeshBasicMaterial({ map: radial('rgba(150,210,255,1)', 'rgba(40,110,255,.55)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), holeM = toon(0x0d1424), starT = cv(64, 64, (x, w2, h2) => { const gr = x.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, '#5aa2ff'); gr.addColorStop(0.6, '#1a3a9a'); gr.addColorStop(1, '#0a1230'); x.fillStyle = gr; x.fillRect(0, 0, w2, h2); const r = prng(9); for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(200,230,255,${0.4 + r() * 0.6})`; x.fillRect(r() * w2, r() * h2, 1.2, 1.2); } });
    const ports = {}; for (const id of PORTS) { const c = id === 'c', p = portPos(id), R0 = c ? 0.085 : 0.042, pg = new THREE.Group(); pg.position.set(w / 2 + p.x, p.y, 0); leaf.add(pg); pg.userData.port = id;
      for (const sz of [1, -1]) { const f = new THREE.Group(); f.position.z = sz * th / 2; if (sz < 0) f.rotation.y = Math.PI; pg.add(f);
        if (c) part(f, cyl(R0 * 1.9, R0 * 1.9, 0.012, 32).rotateX(Math.PI / 2), iron, [0, 0, 0.006], null, null, { ink: false });
        part(f, new THREE.TorusGeometry(R0, R0 * (c ? 0.34 : 0.3), 8, 28), brass, [0, 0, 0.018]); part(f, new THREE.CircleGeometry(R0 * 0.85, 24), c ? new THREE.MeshBasicMaterial({ map: starT }) : holeM, [0, 0, 0.012], null, null, { ink: false, shadow: false });
        for (let k = 0; k < (c ? 10 : 6); k++) { const a = k / (c ? 10 : 6) * TAU; part(f, stud, brass, [Math.cos(a) * R0 * (c ? 1.5 : 1.38), Math.sin(a) * R0 * (c ? 1.5 : 1.38), 0.016], null, c ? [1.1, 1.1, 1.1] : [0.7, 0.7, 0.7], { ink: false, shadow: false }); }
        if (c) { part(f, rbox(0.05, 0.11, 0.02, 0.008), brass, [0, R0 * 1.75, 0.02]); const gl = part(f, new THREE.PlaneGeometry(R0 * 3.2, R0 * 3.2), glowM, [0, 0, 0.03], null, null, { ink: false, shadow: false }); gl.renderOrder = 3; pg.userData.glow = gl; } }
      if (!c) { const lk = new THREE.Group(); lk.position.z = th / 2 + 0.02; pg.add(lk); part(lk, rbox(0.1, 0.035, 0.012, 0.004), iron, [0, 0.01, 0], null, null, { ink: false }); part(lk, rbox(0.04, 0.036, 0.016, 0.006), toon(0xc09040), [0, -0.035, 0.012]); part(lk, new THREE.TorusGeometry(0.013, 0.004, 6, 14, Math.PI), iron, [0, -0.016, 0.012], null, null, { ink: false }); part(lk, cyl(0.004, 0.004, 0.003, 6).rotateX(Math.PI / 2), toon(0x2a1a0a), [0, -0.038, 0.021], null, null, { ink: false, shadow: false }); pg.userData.lock = lk; }
      ports[id] = pg; }
    g.userData.ports = ports; g.userData.leaf = piv; return g; }
  // a thick twisted Lifeline cord along a path (strands + glowing core + pulse beads) in the grade's look
  // the cliff face outside: rock wall with the arched doorway, timber lintel/awning on brackets, a plank shelf to stand on, a lantern
  function makeHomeExt() { const g = new THREE.Group(), r = prng(41), W = 9, Hc = 7, th = 0.24;
    const rock = cv(256, 256, (x, w, h) => { x.fillStyle = '#6e655c'; x.fillRect(0, 0, w, h); for (let i = 0; i < 90; i++) { const cx = r() * w, cy = r() * h, rw = 14 + r() * 34, rh = 10 + r() * 26; x.fillStyle = `rgba(${150 + r() * 40},${140 + r() * 34},${125 + r() * 30},${0.35 + r() * 0.3})`; x.beginPath(); x.ellipse(cx, cy, rw, rh, r() * 0.5, 0, TAU); x.fill(); x.strokeStyle = 'rgba(30,24,20,.55)'; x.lineWidth = 2; x.stroke(); } for (let i = 0; i < 24; i++) { x.fillStyle = 'rgba(110,130,60,.55)'; x.fillRect(r() * w, r() * h, 5, 3); } });
    rock.repeat.set(W / 2.2, Hc / 2.2); const sh = new THREE.Shape(), y0 = -2.2, y1 = Hc - 2.2; sh.moveTo(-W / 2, y0); sh.lineTo(W / 2, y0); sh.lineTo(W / 2, y1); sh.lineTo(-W / 2, y1); sh.lineTo(-W / 2, y0);
    const hole = archShape(HM.dw + 0.16, HM.dh + 0.08); sh.holes.push(new THREE.Path(hole.getPoints(40).map((p) => new THREE.Vector2(p.x + HM.dx, p.y))));
    const gm = new THREE.ExtrudeGeometry(sh, { depth: th, bevelEnabled: false, curveSegments: 24 }); { const P = gm.attributes.position, uv = gm.attributes.uv; for (let i = 0; i < P.count; i++) uv.setXY(i, P.getX(i) / 2.2, P.getY(i) / 2.2); }
    part(g, gm, toon(0xffffff, rock), [0, 0, HM.FZ - th / 2], null, null, { ink: false });
    for (let i = 0; i < 46; i++) { const x = (r() - 0.5) * W, y = -2.2 + r() * Hc; if (Math.abs(x - HM.dx) < 1.25 && y > -0.6 && y < HM.dh + 0.7) continue; const s = 0.18 + r() * 0.35; part(g, new THREE.DodecahedronGeometry(s, 0), toon(new THREE.Color(0x7a7066).offsetHSL(0, 0, (r() - 0.5) * 0.08).getHex()), [x, y, HM.FZ + th / 2 + s * 0.15], [r() * 3, r() * 3, 0], [1, 0.8 + r() * 0.5, 0.45]); }
    const wd = toon(0x7a4c2a), wdD = toon(0x5c381e), bx = HM.dx; // timber frame round the door, lintel awning + brackets, shelf + brackets
    const fr = archShape(HM.dw + 0.34, HM.dh + 0.17); fr.holes.push(new THREE.Path(archShape(HM.dw + 0.06, HM.dh + 0.03).getPoints(40))); part(g, new THREE.ExtrudeGeometry(fr, { depth: 0.08, bevelEnabled: false, curveSegments: 24 }), wd, [bx, 0, HM.FZ + th / 2 - 0.02]);
    part(g, rbox(HM.dw + 1.1, 0.14, 0.42, 0.02), wd, [bx, HM.dh + 0.42, HM.FZ + th / 2 + 0.19]); for (const sx of [-1, 1]) part(g, rbox(0.1, 0.36, 0.3, 0.015), wdD, [bx + sx * (HM.dw / 2 + 0.36), HM.dh + 0.2, HM.FZ + th / 2 + 0.14], [-0.5, 0, 0]);
    part(g, rbox(HM.dw + 1.5, 0.09, 0.95, 0.02), toon(0xffffff, woodTex('#8a5a32', 'rgba(40,20,8,.5)', 8, 4)), [bx, -0.045, HM.FZ + th / 2 + 0.46]); for (const sx of [-1, 1]) part(g, rbox(0.1, 0.42, 0.42, 0.015), wdD, [bx + sx * (HM.dw / 2 + 0.45), -0.3, HM.FZ + th / 2 + 0.2], [0.55, 0, 0]);
    part(g, rbox(HM.dw + 0.06, 0.16, 0.06, 0.01), wdD, [bx, 0.08, HM.FZ + th / 2 + 0.02]); // threshold step
    // lantern on an iron bracket, left of the door
    const ln = new THREE.Group(); ln.position.set(bx - HM.dw / 2 - 0.42, 1.28, HM.FZ + th / 2 + 0.12); g.add(ln); const ir = toon(0x34363a); part(ln, cyl(0.008, 0.008, 0.2, 6), ir, [0.1, 0.12, -0.06], [0, 0, Math.PI / 2]); part(ln, new THREE.TorusGeometry(0.03, 0.006, 6, 12), ir, [0, 0.08, 0]); part(ln, cyl(0.06, 0.045, 0.05, 8), ir, [0, 0.04, 0]); part(ln, cyl(0.05, 0.05, 0.13, 8, true), new THREE.MeshBasicMaterial({ color: 0xffd58a, transparent: true, opacity: 0.85 }), [0, -0.05, 0], null, null, { ink: false }); part(ln, cyl(0.06, 0.06, 0.025, 8), ir, [0, -0.125, 0]);
    const lgl = part(ln, new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: radial('rgba(255,210,130,.9)', 'rgba(255,170,80,.25)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), [0, -0.05, 0.03], null, null, { ink: false, shadow: false }); lgl.renderOrder = 3; const pl = new THREE.PointLight(0xffc070, 0.9, 3.2, 1.6); pl.position.set(0, -0.05, 0.1); ln.add(pl); g.userData.lamp = pl;
    return g; }
  // the room: plank floor, plaster/rock walls with timber posts and beams (front wall is the cutaway side), and the door from inside
  /* ---------- the Ledge interior, replicating the concept art (2a entrance view is the master layout): a timber-framed room cut into the cliff,
     warm plaster walls between dark posts and braces, a vaulted ceiling on arched ribs, dark plank floor, and the left wall the bare cliff rock
     (big rounded stones) with the round vault set in it. Dim and warm: lanterns, the forge and the globe light the room. ---------- */
  function plankTex(seed, base = [104, 64, 36]) { const r = prng(seed); return cv(256, 256, (x, w, h) => { const n = 8, ph = h / n; for (let i = 0; i < n; i++) { const k = 0.82 + r() * 0.3, c = base.map((v) => Math.round(v * k)); x.fillStyle = `rgb(${c})`; x.fillRect(0, i * ph, w, ph);
      for (let j = 0; j < 14; j++) { x.strokeStyle = `rgba(40,20,8,${0.1 + r() * 0.18})`; x.lineWidth = 1; x.beginPath(); const yy = i * ph + 2 + r() * (ph - 4); x.moveTo(0, yy); x.bezierCurveTo(w * 0.3, yy + (r() - 0.5) * 5, w * 0.7, yy + (r() - 0.5) * 5, w, yy); x.stroke(); }
      x.fillStyle = 'rgba(255,220,170,.07)'; x.fillRect(0, i * ph + 1, w, 2); x.fillStyle = 'rgba(25,12,4,.85)'; x.fillRect(0, i * ph, w, 1.6); const e = r() * w; x.fillRect(e, i * ph, 1.6, ph); x.fillStyle = 'rgba(20,10,4,.6)'; for (const q of [e - 6, e + 6]) { x.beginPath(); x.arc(q, i * ph + ph / 2, 1.3, 0, TAU); x.fill(); } } }); }
  function plasterTex(seed) { const r = prng(seed); return cv(256, 256, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#b89d78'); gr.addColorStop(0.25, '#d6bf98'); gr.addColorStop(0.75, '#d2b991'); gr.addColorStop(1, '#a88c68'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) { x.fillStyle = r() < 0.55 ? `rgba(110,80,50,${r() * 0.07})` : `rgba(255,240,215,${r() * 0.08})`; x.beginPath(); x.ellipse(r() * w, r() * h, 3 + r() * 18, 2 + r() * 10, r() * 3, 0, TAU); x.fill(); }
      for (let i = 0; i < 18; i++) { x.strokeStyle = `rgba(90,62,40,${0.08 + r() * 0.1})`; x.lineWidth = 0.8; x.beginPath(); let px = r() * w, py = r() * h; x.moveTo(px, py); for (let k = 0; k < 4; k++) { px += (r() - 0.5) * 18; py += r() * 12; x.lineTo(px, py); } x.stroke(); } }); }
  function stoneTex(seed, base = [112, 106, 98], cell = 34) { const r = prng(seed); return cv(256, 256, (x, w, h) => { x.fillStyle = '#2b2622'; x.fillRect(0, 0, w, h); for (let row = 0, y = 0; y < h; row++) { const rh = cell * (0.8 + r() * 0.4); let xx = row % 2 ? -cell * 0.5 : 0; while (xx < w) { const sw = cell * (1 + r() * 0.7), k = 0.78 + r() * 0.35, c = base.map((v) => Math.round(v * k));
          x.fillStyle = `rgb(${c})`; x.beginPath(); x.roundRect ? x.roundRect(xx + 2, y + 2, sw - 4, rh - 4, 7) : x.rect(xx + 2, y + 2, sw - 4, rh - 4); x.fill(); x.fillStyle = 'rgba(255,240,220,.1)'; x.fillRect(xx + 5, y + 4, sw - 12, 3); x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(xx + 4, y + rh - 8, sw - 9, 3); xx += sw; } y += rh; } }); }
  function makeRoom() { const g = new THREE.Group(), r = prng(57), W = HM.W, D = HM.FZ - HM.BZ, H = HM.H, zc = (HM.FZ + HM.BZ) / 2;
    const fl = plankTex(21); fl.repeat.set(W / 1.7, D / 1.7); part(g, new THREE.BoxGeometry(W, 0.08, D), toon(0xffffff, fl), [0, -0.04, zc], null, null, { ink: false });
    const plas = plasterTex(7); plas.repeat.set(3, 1); const pM = toon(0xffffff, plas), beam = toon(0x5a3820), beamD = toon(0x462b18);
    HM.walls = {}; HM.walls.back = part(g, new THREE.BoxGeometry(W, H, 0.14), pM, [0, H / 2, HM.BZ - 0.07]); { const pr = plasterTex(8); pr.repeat.set(2.2, 1); HM.walls.right = part(g, new THREE.BoxGeometry(0.14, H, D), toon(0xffffff, pr), [W / 2 + 0.07, H / 2, zc]); }
    // left wall: the bare cliff, big rounded grey stones stacked tight on a dark backing (the vault is set into it)
    { const L = new THREE.Group(); HM.walls.left = L; g.add(L); part(L, new THREE.BoxGeometry(0.14, H + 1.2, D), toon(0x2e2925), [-W / 2 - 0.07, (H + 1.2) / 2, zc], null, null, { ink: false });
      const rm = [toon(0x5d5852), toon(0x524d48), toon(0x67615a), toon(0x48443f)]; for (let z = HM.BZ + 0.1; z < HM.FZ; z += 0.42 + r() * 0.18) for (let y = 0.15; y < H + 0.9; y += 0.42 + r() * 0.22) { if (Math.hypot(z - HMP.vault.z, y - HMP.vault.y) < 0.92) continue; const s = 0.3 + r() * 0.14;
          part(L, new THREE.DodecahedronGeometry(1, 0), rm[Math.floor(r() * 4)], [-W / 2 + 0.02 + r() * 0.07, y + (r() - 0.5) * 0.14, z + (r() - 0.5) * 0.12], [r() * 3, r() * 3, r() * 3], [0.2 + r() * 0.08, s * (0.9 + r() * 0.5), s * (0.85 + r() * 0.4)]); } }
    // front wall from inside (hidden when the camera is outside the room): two panels and a lintel round the doorway
    const fw = new THREE.Group(); g.add(fw); HM.walls.front = fw; const sh = new THREE.Shape(); sh.moveTo(-W / 2, 0); sh.lineTo(W / 2, 0); sh.lineTo(W / 2, H); sh.lineTo(-W / 2, H); sh.lineTo(-W / 2, 0); sh.holes.push(new THREE.Path(archShape(HM.dw + 0.16, HM.dh + 0.08).getPoints(40).map((p) => new THREE.Vector2(p.x + HM.dx, p.y))));
    const fg = new THREE.ExtrudeGeometry(sh, { depth: 0.14, bevelEnabled: false, curveSegments: 24 }); { const P = fg.attributes.position, uv = fg.attributes.uv; for (let i = 0; i < P.count; i++) uv.setXY(i, P.getX(i) / 2.4, P.getY(i) / H); } part(fw, fg, pM, [0, 0, HM.FZ - 0.07]);
    const fr = archShape(HM.dw + 0.34, HM.dh + 0.17); fr.holes.push(new THREE.Path(archShape(HM.dw + 0.06, HM.dh + 0.03).getPoints(40))); part(fw, new THREE.ExtrudeGeometry(fr, { depth: 0.06, bevelEnabled: false, curveSegments: 24 }), beam, [HM.dx, 0, HM.FZ - 0.12]);
    // timber frame: corner + wall posts, a sill, the wall plate, diagonal braces into the posts
    for (const [x, z] of [[W / 2, HM.BZ], [-W / 2 + 0.12, HM.BZ], [W / 2, HM.FZ], [-1.45, HM.BZ], [1.25, HM.BZ], [W / 2, -0.35], [W / 2, 1.5]]) part(g, rbox(0.2, H + 0.1, 0.2, 0.03), beam, [x, H / 2, z]);
    part(g, rbox(W + 0.2, 0.2, 0.2, 0.03), beamD, [0, H, HM.BZ + 0.04]); part(g, rbox(0.2, 0.2, D + 0.2, 0.03), beamD, [W / 2, H, zc]); part(g, rbox(0.2, 0.2, D + 0.2, 0.03), beamD, [-W / 2 + 0.1, H, zc]); part(g, rbox(W + 0.2, 0.2, 0.2, 0.03), beamD, [0, H, HM.FZ - 0.04]);
    for (const [x, z, sx, sz] of [[0, HM.BZ + 0.03, W, 0.06], [W / 2 - 0.03, zc, 0.06, D]]) part(g, rbox(sx, 0.12, sz, 0.01), beamD, [x, 0.06, z], null, null, { ink: false, shadow: false });
    for (const [x, sgn] of [[-1.45, 1], [1.25, -1], [-1.45, -1], [1.25, 1]]) part(g, rbox(0.12, 0.85, 0.1, 0.02), beam, [x + sgn * 0.3, H - 0.35, HM.BZ + 0.05], [0, 0, sgn * 0.78]);
    for (const [z, sgn] of [[-0.35, 1], [-0.35, -1], [1.5, -1]]) part(g, rbox(0.1, 0.85, 0.12, 0.02), beam, [W / 2 - 0.05, H - 0.35, z + sgn * 0.3], [-sgn * 0.78, 0, 0]);
    HM.edge = []; for (const m of g.children) { if (!m.isMesh) continue; const q = m.position, sd = []; if (q.x < -W / 2 + 0.2) sd.push('left'); if (q.x > W / 2 - 0.12) sd.push('right'); if (q.z < HM.BZ + 0.12) sd.push('back'); if (q.z > HM.FZ - 0.12) sd.push('front'); if (sd.length && !Object.values(HM.walls).includes(m)) HM.edge.push([m, sd]); } // posts and beams on a cut-away wall hide with it
    // vaulted ceiling (only when the camera is inside, under it): arched ribs across the room on the posts, a ridge beam, plaster panels between
    { const C = new THREE.Group(); g.add(C); HM.ceil = C; const rise = 1.0, half = W / 2, arc = (t) => V(-half + t * W, H + Math.sin(Math.PI * t) * rise, 0); const vp = plasterTex(9); vp.repeat.set(2, 1);
      const vg = new THREE.CylinderGeometry(1, 1, D + 0.1, 28, 1, true, -Math.PI / 2, Math.PI); vg.rotateX(-Math.PI / 2); vg.scale(half, rise, 1); const vm = toon(0xffffff, vp); vm.side = THREE.DoubleSide; part(C, vg, vm, [0, H, zc], null, null, { ink: false, shadow: false });
      { const gs = new THREE.Shape(); gs.moveTo(-half, 0); for (let i = 0; i <= 24; i++) { const a = Math.PI * (1 - i / 24); gs.lineTo(Math.cos(a) * half, Math.sin(a) * rise); } const gg = new THREE.ShapeGeometry(gs, 1), P = gg.attributes.position, uv = gg.attributes.uv; for (let i = 0; i < P.count; i++) uv.setXY(i, P.getX(i) / 2.4, 0.5 + P.getY(i) / 2.6); part(C, gg, toon(0xffffff, vp), [0, H, HM.BZ + 0.001], null, null, { ink: false, shadow: false }); }
      for (const z of [HM.BZ + 0.1, -1.0, 0.7, HM.FZ - 0.15]) { const pts = []; for (let i = 0; i <= 24; i++) { const t = i / 24, a = Math.PI * t; pts.push(V(-Math.cos(a) * (half - 0.05), H + Math.sin(a) * (rise - 0.04), z)); } part(C, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.09, 6), beam, null, null, null, { shadow: false }); }
      part(C, rbox(0.18, 0.18, D, 0.03), beamD, [0, H + rise - 0.1, zc], null, null, { shadow: false }); for (const x of [-2.4, 2.4]) part(C, rbox(0.14, 0.14, D, 0.02), beamD, [x, H + rise * Math.sin(Math.acos(x / half)) - 0.12, zc], null, null, { shadow: false }); }
    // the cliff ledge the room sits on (seen in the high cut-away view): rock under the floor, dropping away
    { const rk = stoneTex(31, [96, 90, 84], 48); rk.repeat.set(3, 2); const rockM = toon(0xffffff, rk); part(g, rockGeo(W + 0.6, 2.4, D + 0.6, 12, 0.08), rockM, [0, -1.28, zc], null, null, { ink: false }); }
    const dr = makeDoor(); dr.position.set(HM.dx, 0, HM.FZ); g.add(dr); HM.door = dr;
    // light: a soft warm ambience for the room's own fixtures to build on (the scene's daylight dims inside, see homeLights)
    const lamp = new THREE.PointLight(0xffb468, 0.15, 8, 1.3); lamp.position.set(0.2, 2.4, 0.3); g.add(lamp); HM.lamp = lamp; const amb = new THREE.HemisphereLight(0xffd9a8, 0x3a2414, 0.13); g.add(amb); HM.inLights = [lamp, amb];
    return g; }
  // furnishings (2a entrance view): the vault in the cliff rock on the left, an arched plank door in the back wall, bed along the right with the big
  // arched window and shelves, Persian rugs, iron lanterns, potted plants, a wall shelf of keepsakes
  const HMP = { vault: V(-HM.W / 2 + 0.03, 0.98, -0.85), table: V(0.15, 0, 0.45) };
  function quiltTex() { const r = prng(33), cols = ['#9a3f2e', '#2f4f72', '#b8862f', '#5b7440', '#7a3a4e', '#c9a77a', '#3e6a66', '#8a5a2e']; return cv(256, 256, (x, w, h) => { const n = 7; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { x.fillStyle = cols[Math.floor(r() * cols.length)]; x.fillRect(i * w / n, j * h / n, w / n, h / n); x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(i * w / n, j * h / n + h / n - 4, w / n, 4);
      x.strokeStyle = 'rgba(255,236,200,.45)'; x.setLineDash([3, 3]); x.lineWidth = 1.2; x.strokeRect(i * w / n + 3, j * h / n + 3, w / n - 6, h / n - 6); x.beginPath(); x.moveTo(i * w / n + 3, j * h / n + 3); x.lineTo((i + 1) * w / n - 3, (j + 1) * h / n - 3); x.stroke(); } x.setLineDash([]); x.strokeStyle = 'rgba(30,15,8,.5)'; x.lineWidth = 1.5; for (let i = 0; i <= n; i++) { x.beginPath(); x.moveTo(i * w / n, 0); x.lineTo(i * w / n, h); x.moveTo(0, i * h / n); x.lineTo(w, i * h / n); x.stroke(); } }); }
  function rugTex(seed, field, border, accent) { const r = prng(seed); return cv(256, 160, (x, w, h) => { x.fillStyle = border; x.fillRect(0, 0, w, h); x.fillStyle = field; x.fillRect(18, 18, w - 36, h - 36); x.strokeStyle = accent; x.lineWidth = 3; x.strokeRect(10, 10, w - 20, h - 20); x.strokeRect(22, 22, w - 44, h - 44);
      x.fillStyle = accent; for (let i = 0; i < 26; i++) { const t = i / 26; for (const [px, py] of [[t * w, 5], [t * w, h - 5]]) { x.beginPath(); x.moveTo(px, py - 3); x.lineTo(px + 4, py); x.lineTo(px, py + 3); x.lineTo(px - 4, py); x.fill(); } }
      x.save(); x.translate(w / 2, h / 2); x.fillStyle = border; x.beginPath(); x.moveTo(0, -44); x.lineTo(62, 0); x.lineTo(0, 44); x.lineTo(-62, 0); x.closePath(); x.fill(); x.fillStyle = accent; x.beginPath(); x.moveTo(0, -30); x.lineTo(42, 0); x.lineTo(0, 30); x.lineTo(-42, 0); x.closePath(); x.fill(); x.fillStyle = field; x.beginPath(); x.arc(0, 0, 12, 0, TAU); x.fill(); x.restore();
      for (const [cx, cy] of [[40, 40], [w - 40, 40], [40, h - 40], [w - 40, h - 40]]) { x.fillStyle = accent; x.beginPath(); x.arc(cx, cy, 7, 0, TAU); x.fill(); } for (let i = 0; i < 600; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,230,190'},${r() * 0.06})`; x.fillRect(r() * w, r() * h, 2, 1); } }); }
  function wallLantern(g, p, ry = 0, hang = false) { const ln = new THREE.Group(); ln.position.copy(p); ln.rotation.y = ry; g.add(ln); const ir = toon(0x2e2f33);
    if (hang) part(ln, cyl(0.006, 0.006, 0.5, 5), ir, [0, 0.42, 0]); else { part(ln, rbox(0.05, 0.16, 0.03, 0.008), ir, [0, 0.16, -0.16]); part(ln, rbox(0.02, 0.02, 0.18, 0.006), ir, [0, 0.24, -0.08]); part(ln, cyl(0.004, 0.004, 0.06, 5), ir, [0, 0.21, 0]); }
    part(ln, new THREE.ConeGeometry(0.075, 0.07, 6), ir, [0, 0.15, 0]); part(ln, new THREE.TorusGeometry(0.012, 0.004, 5, 10), ir, [0, 0.195, 0]); part(ln, cyl(0.055, 0.055, 0.14, 6, true), new THREE.MeshBasicMaterial({ color: 0xffc66a, side: THREE.DoubleSide }), [0, 0.05, 0], null, null, { ink: false, shadow: false });
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; part(ln, rbox(0.01, 0.15, 0.01, 0.002), ir, [Math.cos(a) * 0.057, 0.05, Math.sin(a) * 0.057]); } part(ln, cyl(0.07, 0.06, 0.025, 6), ir, [0, -0.03, 0]); part(ln, new THREE.SphereGeometry(0.02, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff1c0 }), [0, 0.04, 0], null, null, { ink: false, shadow: false });
    const gl = part(ln, new THREE.PlaneGeometry(0.75, 0.75), new THREE.MeshBasicMaterial({ map: radial('rgba(255,196,110,.75)', 'rgba(255,150,60,.16)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), [0, 0.05, 0.08], null, null, { ink: false, shadow: false }); gl.renderOrder = 3;
    const pl = new THREE.PointLight(0xffa04a, 0.32, 3.2, 1.8); pl.position.set(0, 0.05, 0.2); ln.add(pl); (HM.inLights = HM.inLights || []).push(pl); return ln; }
  function plant(g, p, s = 1, kind = 0) { const pg = new THREE.Group(); pg.position.copy(p); pg.scale.setScalar(s); g.add(pg); const pot = toon(0x9c5432), potD = toon(0x7c3e22); part(pg, cyl(0.1, 0.14, 0.2, 14), pot, [0, 0.1, 0]); part(pg, cyl(0.15, 0.15, 0.035, 14), potD, [0, 0.2, 0]); part(pg, cyl(0.13, 0.13, 0.01, 14), toon(0x3a2616), [0, 0.215, 0], null, null, { ink: false });
    const lm = [toon(0x557d32), toon(0x3f6a2a), toon(0x6d9440)], r = prng(Math.round(p.x * 100 + p.z * 7 + 99)); const n = kind ? 12 : 8; for (let i = 0; i < n; i++) { const a = i / n * TAU + r(), L = (kind ? 0.12 : 0.2) + r() * 0.08, l = part(pg, ell(kind ? 0.025 : 0.05, L, 0.012), lm[i % 3], [Math.cos(a) * 0.05, 0.22 + L * 0.8, Math.sin(a) * 0.05]); l.rotation.order = 'YXZ'; l.rotation.set(0.35 + r() * 0.5, -a + Math.PI / 2, 0); } return pg; }
  function furnishRoom(g) { HM.obs = []; const W = HM.W, r = prng(64), wood = toon(0x6e4426), woodD = toon(0x4e301b), woodL = toon(0x8a5a32), iron = toon(0x45474b), ironD = toon(0x34363a), brass = toon(0xb8873a);
    // vault: a big flat round iron door set into the cliff rock, studded rim, hinge block, spoked handle, brass Lifeline port in the middle
    { const v = new THREE.Group(); v.position.copy(HMP.vault); v.rotation.y = Math.PI / 2; g.add(v); HM.vault = v;
      part(v, cyl(0.8, 0.8, 0.1, 44).rotateX(Math.PI / 2), toon(0x3a3633), [0, 0, 0.02]); part(v, cyl(0.72, 0.72, 0.1, 44).rotateX(Math.PI / 2), toon(0x6e6f72), [0, 0, 0.07]); part(v, new THREE.TorusGeometry(0.72, 0.04, 8, 48), ironD, [0, 0, 0.12]); part(v, new THREE.TorusGeometry(0.5, 0.025, 8, 40), ironD, [0, 0, 0.125]);
      for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; part(v, new THREE.SphereGeometry(0.03, 8, 6), toon(0x6a5a44), [Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0.125], null, null, { ink: false }); } for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.2; part(v, rbox(0.05, 0.14, 0.03, 0.01), ironD, [Math.cos(a) * 0.38, Math.sin(a) * 0.38, 0.13], [0, 0, a]); }
      part(v, rbox(0.2, 0.62, 0.1, 0.03), ironD, [-0.76, 0, 0.1]); for (const y of [-0.2, 0.2]) part(v, cyl(0.04, 0.04, 0.16, 10), iron, [-0.8, y, 0.12]);
      part(v, rbox(0.06, 0.24, 0.06, 0.02), ironD, [0.5, 0.02, 0.17]); part(v, rbox(0.14, 0.04, 0.05, 0.01), iron, [0.5, 0.14, 0.17]);
      part(v, cyl(0.17, 0.17, 0.05, 28).rotateX(Math.PI / 2), brass, [0, 0, 0.14]); part(v, new THREE.TorusGeometry(0.12, 0.035, 10, 28), brass, [0, 0, 0.17]); part(v, new THREE.CircleGeometry(0.1, 22), new THREE.MeshBasicMaterial({ color: 0x0b1530 }), [0, 0, 0.165], null, null, { ink: false });
      for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; part(v, new THREE.SphereGeometry(0.016, 6, 5), brass, [Math.cos(a) * 0.22, Math.sin(a) * 0.22, 0.17], null, null, { ink: false }); } }
    // arched plank door in the back wall (left), iron strap hinges and ring pull
    { const d = new THREE.Group(); d.position.set(-2.45, 0, HM.BZ + 0.02); g.add(d); const fr = archShape(1.06, 2.0); fr.holes.push(new THREE.Path(archShape(0.86, 1.9).getPoints(30))); part(d, new THREE.ExtrudeGeometry(fr, { depth: 0.1, bevelEnabled: false, curveSegments: 20 }), woodD, [0, 0, 0]);
      const pl = plankTex(41, [118, 74, 42]); pl.rotation = Math.PI / 2; pl.repeat.set(0.6, 1); part(d, new THREE.ShapeGeometry(archShape(0.86, 1.9), 20), toon(0xffffff, pl), [0, 0, 0.04]); { const geo = d.children[1].geometry, P = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < P.count; i++) uv.setXY(i, P.getX(i) / 0.86 + 0.5, P.getY(i) / 1.9); }
      for (const y of [0.45, 1.35]) part(d, rbox(0.6, 0.06, 0.02, 0.01), ironD, [-0.12, y, 0.055]); part(d, new THREE.TorusGeometry(0.05, 0.01, 6, 14), ironD, [0.3, 0.95, 0.07]); part(d, rbox(0.86, 0.1, 0.05, 0.01), woodD, [0, 1.05, 0.05]); }
    // bed along the right wall, head to the wall: turned posts with ball finials, panelled head and foot boards, patchwork quilt, pillows
    { const b = new THREE.Group(); b.position.set(W / 2 - 1.0, 0, 0.75); b.rotation.y = -Math.PI / 2; g.add(b); HM.bed = b; const L = 1.95, Wb = 1.15;
      for (const [x, z, hh] of [[-Wb / 2, -L / 2, 1.05], [Wb / 2, -L / 2, 1.05], [-Wb / 2, L / 2, 0.68], [Wb / 2, L / 2, 0.68]]) { part(b, cyl(0.05, 0.045, hh, 10), woodD, [x, hh / 2, z]); part(b, new THREE.SphereGeometry(0.065, 12, 8), woodD, [x, hh + 0.05, z]); }
      part(b, rbox(Wb, 0.42, 0.06, 0.03), wood, [0, 0.72, -L / 2]); part(b, rbox(Wb, 0.06, 0.08, 0.02), woodD, [0, 0.96, -L / 2]); part(b, rbox(Wb, 0.3, 0.06, 0.02), wood, [0, 0.42, L / 2]); part(b, rbox(Wb, 0.14, L, 0.02), woodD, [0, 0.24, 0]);
      part(b, rbox(Wb - 0.06, 0.16, L - 0.08, 0.06), toon(0xe8d9bc), [0, 0.38, 0]); part(b, rbox(Wb + 0.06, 0.1, L * 0.68, 0.05), toon(0xffffff, quiltTex()), [0, 0.47, 0.25]); part(b, rbox(Wb + 0.08, 0.26, 0.05, 0.02), toon(0xffffff, quiltTex()), [0, 0.36, 0.25 + L * 0.34]); for (const s of [-1, 1]) part(b, rbox(0.05, 0.26, L * 0.68, 0.02), toon(0xffffff, quiltTex()), [s * (Wb / 2 + 0.04), 0.36, 0.25]);
      part(b, rbox(0.95, 0.06, 0.3, 0.03), toon(0xd9c8a6), [0, 0.5, -0.33]); part(b, rbox(0.62, 0.16, 0.32, 0.07), toon(0xf1e6cf), [0, 0.53, -L / 2 + 0.25]); part(b, rbox(0.4, 0.3, 0.1, 0.05), toon(0x8a5a36), [-0.2, 0.62, -L / 2 + 0.38], [-0.5, 0.2, 0]); part(b, rbox(0.36, 0.28, 0.1, 0.05), toon(0x46628a), [0.24, 0.62, -L / 2 + 0.34], [-0.45, -0.25, 0]);
      HM.obs.push({ x: b.position.x + 0.5, z: b.position.z, r: 0.62 }, { x: b.position.x - 0.45, z: b.position.z, r: 0.62 }); }
    // big arched window in the right wall, deep sill, cross bars; the cliffs and sky outside
    { const wv = new THREE.Group(); wv.position.set(W / 2 + 0.005, 0.9, -1.55); wv.rotation.y = -Math.PI / 2; g.add(wv); HM.window = wv; const sky = cv(160, 256, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#8fb9d8'); gr.addColorStop(0.45, '#e9e2cf'); gr.addColorStop(1, '#c9b494'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
        x.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 4; i++) { x.beginPath(); x.ellipse(30 + i * 34, 40 + (i % 2) * 18, 26, 9, 0, 0, TAU); x.fill(); } const cliff = (x0, x1, top, col) => { x.fillStyle = col; x.beginPath(); x.moveTo(x0, h); for (let k = 0; k <= 8; k++) { const xx = x0 + (x1 - x0) * k / 8; x.lineTo(xx, top + Math.sin(k * 1.7) * 14 + (k % 3) * 8); } x.lineTo(x1, h); x.fill(); x.strokeStyle = 'rgba(60,55,60,.35)'; for (let k = 0; k < 9; k++) { x.beginPath(); const xx = x0 + (x1 - x0) * (k + 0.5) / 9; x.moveTo(xx, top + 20); x.lineTo(xx + 4, h); x.stroke(); } };
        cliff(-10, 70, 90, 'rgb(122,116,120)'); cliff(95, 170, 60, 'rgb(104,98,104)'); cliff(40, 120, 150, 'rgb(150,140,135)'); });
      part(wv, new THREE.ShapeGeometry(archShape(1.0, 1.55), 20), new THREE.MeshBasicMaterial({ map: sky }), [0, 0, -0.06], null, null, { ink: false }); { const geo = wv.children[0].geometry, P = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < P.count; i++) uv.setXY(i, P.getX(i) / 1.0 + 0.5, P.getY(i) / 1.55); }
      const fr = archShape(1.28, 1.7); fr.holes.push(new THREE.Path(archShape(1.0, 1.55).getPoints(30))); part(wv, new THREE.ExtrudeGeometry(fr, { depth: 0.12, bevelEnabled: false, curveSegments: 20 }), wood, [0, -0.07, -0.05]); part(wv, rbox(0.04, 1.5, 0.04, 0.01), woodD, [0, 0.76, 0.0]); part(wv, rbox(1.0, 0.04, 0.04, 0.01), woodD, [0, 0.62, 0.0]);
      part(wv, rbox(1.45, 0.08, 0.32, 0.02), woodL, [0, -0.06, 0.14]); plant(wv, V(-0.4, -0.02, 0.15), 0.6); plant(wv, V(0.42, -0.02, 0.15), 0.55, 1);
      const sun = new THREE.PointLight(0xffe2b8, 0.25, 3.5, 1.6); sun.position.set(0, 0.8, 0.6); wv.add(sun); HM.inLights.push(sun); }
    // shelves on the right wall, front of the window: books, jars, boxes
    { const bs = new THREE.Group(); bs.position.set(W / 2 - 0.2, 0, -0.75); bs.rotation.y = -Math.PI / 2; g.add(bs); part(bs, rbox(0.06, 1.75, 0.32, 0.01), woodD, [-0.42, 0.875, 0]); part(bs, rbox(0.06, 1.75, 0.32, 0.01), woodD, [0.42, 0.875, 0]); part(bs, rbox(0.9, 1.7, 0.03, 0.01), toon(0x3e2616), [0, 0.85, -0.15]);
      const cols = [0x7a2e24, 0x2e4a6a, 0x5a6a2e, 0x8a6a2e, 0x4e2e4a, 0x2a4440, 0x6a4a2a]; for (let s2 = 0; s2 < 4; s2++) { const y0 = 0.08 + s2 * 0.42; part(bs, rbox(0.84, 0.035, 0.3, 0.005), wood, [0, y0, 0.0]); let x = -0.38; while (x < 0.34) { if (r() < 0.18) { const bw = 0.12 + r() * 0.06; part(bs, r() < 0.5 ? cyl(0.05, 0.045, 0.13, 10) : rbox(bw, 0.1, 0.18, 0.01), toon(r() < 0.5 ? 0x9c7a52 : 0x6a4a30), [x + bw / 2, y0 + 0.08, 0.02]); x += bw + 0.02; continue; }
          const bw = 0.035 + r() * 0.035, bh = 0.22 + r() * 0.12; part(bs, rbox(bw, bh, 0.22, 0.006), toon(cols[Math.floor(r() * cols.length)]), [x + bw / 2, y0 + 0.02 + bh / 2, 0.02], [0, 0, r() < 0.12 ? 0.18 : 0], null, { shadow: false }); x += bw + 0.006; } } part(bs, rbox(0.9, 0.04, 0.34, 0.01), wood, [0, 1.76, 0]); plant(bs, V(0.2, 1.78, 0), 0.55);
      HM.obs.push({ x: W / 2 - 0.25, z: -0.75, r: 0.4 }); }
    // wall shelf of keepsakes over the bed's head (clock, figurine, jar of marbles) and a framed sketch
    { const sf = new THREE.Group(); sf.position.set(W / 2 - 0.12, 1.62, 0.75); sf.rotation.y = -Math.PI / 2; g.add(sf); part(sf, rbox(1.1, 0.05, 0.22, 0.01), wood, [0, 0, 0.04]); for (const x of [-0.4, 0.4]) part(sf, rbox(0.05, 0.16, 0.16, 0.02), woodD, [x, -0.1, 0.02]);
      part(sf, cyl(0.075, 0.075, 0.03, 20).rotateX(Math.PI / 2), brass, [-0.32, 0.1, 0.04]); part(sf, new THREE.CircleGeometry(0.06, 20), toon(0xf1e6cf), [-0.32, 0.1, 0.057]); part(sf, new THREE.TorusGeometry(0.02, 0.006, 5, 10), brass, [-0.32, 0.19, 0.04]);
      part(sf, cyl(0.03, 0.035, 0.06, 8), toon(0x5a4a3a), [0, 0.05, 0.04]); part(sf, ell(0.04, 0.07, 0.035), toon(0x6a5440), [0, 0.13, 0.04]); part(sf, new THREE.SphereGeometry(0.035, 10, 8), toon(0x7a6450), [0, 0.22, 0.04]);
      part(sf, rbox(0.14, 0.2, 0.02, 0.01), woodD, [0.18, 0.12, -0.04], [0.15, 0, 0]); part(sf, cyl(0.065, 0.065, 0.16, 14, true), new THREE.MeshPhongMaterial({ color: 0xdde8f0, transparent: true, opacity: 0.35, shininess: 100 }), [0.38, 0.105, 0.04]);
      for (let i = 0; i < 9; i++) part(sf, new THREE.SphereGeometry(0.018, 6, 5), toon([0x3f7fd0, 0x2fb0c0, 0xd04a3a][i % 3]), [0.38 + (r() - 0.5) * 0.07, 0.04 + r() * 0.08, 0.04 + (r() - 0.5) * 0.07]);
      const pic = new THREE.Group(); pic.position.set(0.05, 0.55, 0); sf.add(pic); part(pic, rbox(0.34, 0.28, 0.03, 0.01), woodD, [0, 0, 0]); part(pic, new THREE.PlaneGeometry(0.26, 0.2), toon(0xd8c8a4), [0, 0, 0.017]); }
    // Persian rugs: under the globe table and by the bed
    { const rug = (w, d, p, ry, t) => { part(g, new THREE.PlaneGeometry(w, d), toon(0xffffff, t), [p.x, 0.006, p.z], [-Math.PI / 2, 0, ry], null, { ink: false, shadow: false }); for (const s of [-1, 1]) for (let i = 0; i < 18; i++) part(g, new THREE.PlaneGeometry(0.012, 0.06), toon(0xd9c7a0), [p.x + (s * (w / 2 + 0.03)) * Math.cos(ry) - ((i / 17 - 0.5) * d * 0.95) * Math.sin(ry), 0.007, p.z - (s * (w / 2 + 0.03)) * Math.sin(ry) - ((i / 17 - 0.5) * d * 0.95) * Math.cos(ry)], [-Math.PI / 2, 0, ry + Math.PI / 2], null, { ink: false, shadow: false }); };
      rug(2.5, 1.7, HMP.table, 0, rugTex(3, '#6a2420', '#262838', '#a8803e')); rug(1.6, 1.0, V(1.95, 0, 1.85), 0.12, rugTex(4, '#5a2422', '#30262a', '#9a7440')); }
    // lanterns on the posts and walls, one hanging from the ridge
    wallLantern(g, V(-1.45, 1.75, HM.BZ + 0.22), 0); wallLantern(g, V(1.25, 1.75, HM.BZ + 0.22), 0); wallLantern(g, V(-W / 2 + 0.32, 1.6, 0.85), Math.PI / 2); wallLantern(g, V(W / 2 - 0.22, 1.75, 1.5), -Math.PI / 2); HM.ceilLamp = wallLantern(HM.ceil || g, V(1.6, 2.6, -0.4), 0, true);
    // plants and a few odds and ends
    plant(g, V(-W / 2 + 0.45, 0, 0.35), 1.1); plant(g, V(-1.8, 0, HM.BZ + 0.35), 0.9); plant(g, V(-W / 2 + 0.4, 0, 1.9), 0.95, 1); plant(g, V(2.0, 0, 2.45), 0.8);
    for (let i = 0; i < 4; i++) part(g, new THREE.DodecahedronGeometry(0.1 + r() * 0.08, 1), toon(0x6a655e), [-W / 2 + 0.35 + r() * 0.3, 0.06, -0.05 + r() * 0.3], [r() * 3, r() * 3, 0], [1, 0.7, 1]);
    // flagstone path from the front door to the vault (the cut-away concept)
    { const fm = [toon(0x5a544d), toon(0x4f4a44), toon(0x625b53)], A = V(HM.dx, 0, HM.FZ - 0.45), B = V(HMP.vault.x + 0.55, 0, HMP.vault.z + 0.1); for (let i = 0; i <= 11; i++) { const t = i / 11, c = A.clone().lerp(B, t); for (const off of [-0.2, 0.2]) { const n = V(-(B.z - A.z), 0, B.x - A.x).normalize(); part(g, new THREE.CircleGeometry(0.15 + r() * 0.04, 6), fm[Math.floor(r() * 3)], [c.x + n.x * off + (r() - 0.5) * 0.06, 0.008, c.z + n.z * off + (r() - 0.5) * 0.06], [-Math.PI / 2, 0, r() * 3], [1.15, 0.9, 1], { ink: false, shadow: false }); } } }
    HM.obs.push({ x: -2.45, z: HM.BZ + 0.2, r: 0.2 }); }
  // inside, the main Lifeline runs on from the door's centre port across the floor, round the globe table and unbroken into the vault's port
  function mainLinePts() { const v = HMP.vault, t = HMP.table, x0 = HM.dx; return [V(x0, HM.pc, HM.FZ - 0.08), V(x0, HM.pc - 0.18, HM.FZ - 0.2), V(x0 + 0.05, 0.12, HM.FZ - 0.5), V(x0 + 0.3, 0.06, HM.FZ - 1.1), V(t.x - 0.7, 0.06, t.z + 0.75), V(t.x - 0.72, 0.06, t.z + 0.05), V(-1.4, 0.06, -0.35), V(-2.6, 0.06, -0.7), V(v.x + 0.35, 0.1, v.z + 0.05), V(v.x + 0.22, v.y - 0.3, v.z), V(v.x + 0.18, v.y, v.z)]; }
  // smithing (back wall, centre, as in the concepts): a beehive stone forge on a stepped plinth, an arched brick mouth with an iron door cracked open
  // on glowing embers, a banded stone chimney up through the vault; an anvil on a ringed stump with a hammer, ingots, and a wall rack with a pickaxe,
  // crossed tools and a coiled Lifeline rope. One skill shown visually: ore -> ingot -> Lifeline, pickaxe or tether (no recipes, no economy)
  const SMITH = { furnace: V(-0.7, 0, -2.2), anvil: V(0.55, 0, -1.5), rack: V(0.75, 1.55, -2.8 + 0.03) };
  function furnishSmithing(g) { const r = prng(91), iron = toon(0x3c3e42), ironL = toon(0x5a5d62), wood = toon(0x6e4426), woodD = toon(0x4e301b), bark = toon(0x5a3d24), ring = toon(0xb8936a);
    const st0 = stoneTex(15, [100, 95, 88], 30); st0.repeat.set(4, 2); const stM = toon(0xffffff, st0), st1 = stoneTex(16, [104, 98, 92], 40); st1.repeat.set(3, 1); const stB = toon(0xffffff, st1), stones = [toon(0x77716a), toon(0x6a645d), toon(0x837c73)];
    const F = new THREE.Group(); F.position.copy(SMITH.furnace); F.scale.setScalar(1.45); g.add(F); HM.furnace = F; const R0 = 0.62;
    // plinth: two stepped courses of dressed stone and a front step
    part(F, cyl(R0 + 0.12, R0 + 0.12, 0.22, 24), stB, [0, 0.11, 0], null, [1, 1, 0.85]); part(F, cyl(R0 + 0.04, R0 + 0.04, 0.16, 24), stB, [0, 0.3, 0], null, [1, 1, 0.85]); part(F, rbox(0.9, 0.14, 0.3, 0.03), stones[1], [0, 0.07, R0 * 0.85 + 0.2]);
    // the dome: a stone-textured beehive with proud stones round its courses
    part(F, new THREE.SphereGeometry(R0, 28, 18, 0, TAU, 0, Math.PI / 2), stM, [0, 0.38, 0], null, [1, 1.45, 0.85]);
    for (let k = 0; k < 6; k++) { const ph = (k + 0.5) / 6 * Math.PI / 2 * 0.92, y = 0.38 + Math.sin(ph) * R0 * 1.45, rr = Math.cos(ph) * R0; const n = Math.max(5, Math.round(14 * Math.cos(ph))); for (let j = 0; j < n; j++) { const a = (j + (k % 2) * 0.5) / n * TAU; if (Math.sin(a) > 0.45 && k < 3) continue; part(F, rbox(0.17 * Math.cos(ph) + 0.06, 0.1, 0.07, 0.03), stones[(j + k) % 3], [Math.cos(a) * rr * 1.01, y, Math.sin(a) * rr * 0.85 * 1.01], [0, -a + Math.PI / 2, 0]); } }
    // arched mouth: brick voussoirs, a dark hearth, embers + glow, the iron door on its hinge (cracked open)
    const mz = R0 * 0.85 - 0.02; for (let i = 0; i <= 8; i++) { const a = Math.PI * i / 8; part(F, rbox(0.12, 0.08, 0.1, 0.015), toon(0x8a4a2e), [Math.cos(a) * 0.3, 0.42 + Math.sin(a) * 0.3, mz], [0, 0, a - Math.PI / 2]); } for (const s of [-1, 1]) part(F, rbox(0.1, 0.12, 0.1, 0.015), toon(0x8a4a2e), [s * 0.3, 0.42, mz]);
    { const ms = archShape(0.5, 0.55); part(F, new THREE.ShapeGeometry(ms, 16), new THREE.MeshBasicMaterial({ color: 0x1e0e06 }), [0, 0.36, mz + 0.01], null, null, { ink: false, shadow: false }); }
    const ember = new THREE.MeshBasicMaterial({ color: 0xff6a1a }), emberH = new THREE.MeshBasicMaterial({ color: 0xffc85a });
    HM.embers = []; for (let i = 0; i < 10; i++) { const e = part(F, new THREE.DodecahedronGeometry(0.03 + r() * 0.025, 0), i % 3 ? ember : emberH, [(r() - 0.5) * 0.36, 0.4 + r() * 0.05, mz - 0.06 + r() * 0.08], [r() * 3, r() * 3, 0], null, { ink: false, shadow: false }); HM.embers.push(e); }
    const glow = part(F, new THREE.PlaneGeometry(1.1, 0.8), new THREE.MeshBasicMaterial({ map: cv(64, 64, (x, w, h) => { const gr = x.createRadialGradient(w / 2, h * 0.65, 2, w / 2, h * 0.65, w / 2); gr.addColorStop(0, 'rgba(255,160,50,.95)'); gr.addColorStop(1, 'rgba(255,100,20,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), [0, 0.55, mz + 0.06], null, null, { ink: false, shadow: false }); HM.emberGlow = glow;
    const fl = new THREE.PointLight(0xff7a2a, 1.2, 4.5, 1.5); fl.position.set(0, 0.55, mz + 0.45); F.add(fl); HM.forgeLight = fl;
    const dp = new THREE.Group(); dp.position.set(-0.25, 0.36, mz + 0.03); F.add(dp); { const ds = archShape(0.25, 0.53); part(dp, new THREE.ExtrudeGeometry(ds, { depth: 0.03, bevelEnabled: false, curveSegments: 12 }), iron, [0.125, 0, 0]); for (const y of [0.12, 0.36]) part(dp, rbox(0.27, 0.035, 0.015, 0.005), ironL, [0.125, y, 0.035]); part(dp, new THREE.TorusGeometry(0.03, 0.008, 6, 12), ironL, [0.2, 0.25, 0.05]); }
    dp.rotation.y = -0.75; HM.forgeDoor = dp;
    // chimney: banded stone flue up through the ceiling
    { const ch = stoneTex(17, [96, 92, 88], 26); ch.repeat.set(3, 6); part(F, cyl(0.24, 0.22, 2.6, 16), toon(0xffffff, ch), [0, 2.2, -0.12]); for (const y of [1.3, 2.0, 2.7]) part(F, cyl(0.215, 0.215, 0.06, 16), iron, [0, y, -0.12]); }
    // anvil (horn, waist, feet) on a ringed stump, hammer resting on it, ingots by the foot
    const A = new THREE.Group(); A.position.copy(SMITH.anvil); A.rotation.y = -0.25; g.add(A); HM.anvil = A;
    part(A, cyl(0.27, 0.3, 0.52, 16), bark, [0, 0.26, 0]); part(A, cyl(0.265, 0.265, 0.02, 16), ring, [0, 0.525, 0], null, null, { ink: false }); part(A, new THREE.TorusGeometry(0.13, 0.006, 4, 24).rotateX(Math.PI / 2), toon(0x8a6a48), [0, 0.537, 0], null, null, { ink: false });
    { const s = new THREE.Shape(); s.moveTo(-0.2, 0); s.lineTo(0.18, 0); s.lineTo(0.12, 0.04); s.lineTo(0.07, 0.07); s.lineTo(0.07, 0.15); s.lineTo(0.22, 0.17); s.quadraticCurveTo(0.36, 0.18, 0.44, 0.24); s.lineTo(0.2, 0.27); s.lineTo(-0.24, 0.27); s.lineTo(-0.26, 0.2); s.lineTo(-0.08, 0.17); s.lineTo(-0.08, 0.07); s.lineTo(-0.15, 0.04); s.lineTo(-0.2, 0);
      part(A, new THREE.ExtrudeGeometry(s, { depth: 0.15, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 1 }), toon(0x46484d), [-0.05, 0.53, -0.075]); part(A, rbox(0.42, 0.012, 0.16, 0.004), toon(0x6e7178), [-0.07, 0.808, 0], null, null, { ink: false }); }
    const hm = new THREE.Group(); hm.position.set(-0.1, 0.83, 0.03); hm.rotation.set(0, 0.7, 0.03); A.add(hm); part(hm, rbox(0.035, 0.035, 0.36, 0.01), wood, [0, 0, 0.1]); part(hm, rbox(0.1, 0.06, 0.06, 0.01), ironL, [0, 0.005, -0.08]); HM.hammer = hm;
    const ingot = (x, y, z, ry, col) => part(g, new THREE.CylinderGeometry(0.06, 0.085, 0.05, 4, 1).rotateY(Math.PI / 4).scale(1.6, 1, 0.8), toon(col), [x, y, z], [0, ry, 0]); const ic = [0x9aa3ab, 0x8c949c, 0xa8b0b8];
    for (let i = 0; i < 3; i++) ingot(SMITH.anvil.x + 0.42 + i * 0.03, 0.025, SMITH.anvil.z + 0.15 + i * 0.12, 0.2, ic[i]); ingot(SMITH.anvil.x + 0.46, 0.075, SMITH.anvil.z + 0.22, 0.4, ic[1]); HM.ingots = 4;
    // a little shelf of ingots beside the forge, ore lumps waiting, a firewood bucket
    { const sh2 = new THREE.Group(); sh2.position.set(SMITH.furnace.x - 1.0, 0.95, HM.BZ + 0.16); g.add(sh2); part(sh2, rbox(0.46, 0.05, 0.26, 0.01), wood, [0, 0, 0]); part(sh2, rbox(0.05, 0.14, 0.2, 0.02), woodD, [-0.15, -0.09, -0.02]); part(sh2, rbox(0.05, 0.14, 0.2, 0.02), woodD, [0.15, -0.09, -0.02]); for (let i = 0; i < 3; i++) part(sh2, new THREE.CylinderGeometry(0.05, 0.07, 0.045, 4, 1).rotateY(Math.PI / 4).scale(1.6, 1, 0.8), toon(ic[i]), [-0.1 + i * 0.1, 0.05, 0.02]); part(sh2, new THREE.CylinderGeometry(0.05, 0.07, 0.045, 4, 1).rotateY(Math.PI / 4).scale(1.6, 1, 0.8), toon(ic[0]), [-0.05, 0.095, 0.02]); }
    for (let i = 0; i < 5; i++) part(g, new THREE.DodecahedronGeometry(0.05 + r() * 0.03, 0), toon([0x6b5a4a, 0xa0703a, 0x7d8a96][i % 3]), [SMITH.furnace.x + 0.75 + r() * 0.25, 0.04, SMITH.furnace.z + 0.55 + r() * 0.2], [r() * 3, r() * 3, 0]);
    { const bk = new THREE.Group(); bk.position.set(SMITH.furnace.x - 0.95, 0, SMITH.furnace.z + 0.35); g.add(bk); part(bk, cyl(0.17, 0.2, 0.3, 14), wood, [0, 0.15, 0]); for (const y of [0.06, 0.24]) part(bk, cyl(0.205, 0.18, 0.025, 14), iron, [0, y, 0]); for (let i = 0; i < 7; i++) part(bk, cyl(0.025, 0.025, 0.36, 6), toon(0x7a5232), [(r() - 0.5) * 0.18, 0.36, (r() - 0.5) * 0.18], [(r() - 0.5) * 0.4, 0, (r() - 0.5) * 0.4]); HM.obs.push({ x: bk.position.x, z: bk.position.z, r: 0.22 }); }
    // wall rack: pickaxe, crossed tools and a coiled Lifeline rope (the things the smithing makes), a lantern hook
    const K = new THREE.Group(); K.position.copy(SMITH.rack); g.add(K); HM.rack = K; part(K, rbox(1.1, 0.12, 0.05, 0.015), woodD, [0, 0.12, 0.03]); for (const x of [-0.38, 0.05, 0.4]) part(K, cyl(0.015, 0.012, 0.1, 6).rotateX(Math.PI / 2), iron, [x, 0.1, 0.1]);
    const pk = makePickaxe('iron'); const ph = new THREE.Group(); ph.position.set(-0.36, 0.08, 0.12); ph.rotation.set(0, 0, Math.PI * 0.08); K.add(ph); ph.add(pk); pk.rotation.set(Math.PI / 2, 0, 0); pk.scale.setScalar(1.15); HM.rackPick = pk;
    for (const [a, c] of [[0.5, 0x6e4426], [-0.5, 0x5a3820]]) { const tl = new THREE.Group(); tl.position.set(0.05, -0.28, 0.08); tl.rotation.z = a; K.add(tl); part(tl, rbox(0.03, 0.42, 0.03, 0.01), toon(c), [0, 0, 0]); part(tl, rbox(0.1, 0.05, 0.04, 0.01), ironL, [0, 0.2, 0]); }
    const tc = makeTether('steel', { R: 0.13, n: 7, dr: 0.004, tr: 0.016, dz: 0.011, sy: 1.3 }); tc.position.set(0.4, -0.12, 0.12); K.add(tc); HM.rackRope = tc;
    // a stool by the back wall with a bundle on it
    { const sl = new THREE.Group(); sl.position.set(1.85, 0, HM.BZ + 0.45); g.add(sl); part(sl, cyl(0.2, 0.2, 0.05, 14), wood, [0, 0.5, 0]); for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; part(sl, cyl(0.025, 0.03, 0.5, 6), woodD, [Math.cos(a) * 0.13, 0.25, Math.sin(a) * 0.13], [Math.sin(a) * 0.15, 0, -Math.cos(a) * 0.15]); } part(sl, rbox(0.26, 0.14, 0.2, 0.06), toon(0x5d7040), [0, 0.6, 0]); HM.obs.push({ x: sl.position.x, z: sl.position.z, r: 0.25 }); }
    HM.obs.push({ x: SMITH.furnace.x, z: SMITH.furnace.z, r: 0.8 }, { x: SMITH.anvil.x, z: SMITH.anvil.z, r: 0.38 }); }
  function smithTick(dt) { if (!HM.forgeLight) return; const t = HM.t || 0, f = 0.75 + 0.18 * Math.sin(t * 7.3) + 0.12 * Math.sin(t * 13.1 + 1) + 0.06 * Math.sin(t * 23.7); HM.forgeLight.intensity = 1.0 * f; HM.emberGlow.material.opacity = 0.55 + 0.4 * f; HM.embers.forEach((e, i) => e.scale.setScalar(0.85 + 0.25 * Math.max(0, Math.sin(t * (3 + i * 0.7) + i)))); }
  // the globe table: a crystal sphere on a brass stand (centre rug), a tiny portaledge hanging inside with crackling light; a frayed branch of the
  // main Lifeline climbs a table leg and threads in and out of the globe while the main line carries on into the vault. Tap it: travel to the Hanging Camp
  function furnishGlobe(g) { const t = HMP.table, wood = toon(0x6e4426), woodD = toon(0x52301a), brass = toon(0xc9963e), brassD = toon(0x9a6c2a), r = prng(23);
    const T = new THREE.Group(); T.position.set(t.x, 0, t.z); g.add(T); HM.table = T;
    { const tp = plankTex(51, [124, 80, 46]); tp.repeat.set(0.5, 0.5); part(T, cyl(0.5, 0.5, 0.09, 32), toon(0xffffff, tp), [0, 0.6, 0]); } part(T, cyl(0.51, 0.51, 0.025, 32), woodD, [0, 0.548, 0], null, null, { ink: false }); part(T, cyl(0.36, 0.36, 0.08, 24, true), woodD, [0, 0.5, 0]);
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4; part(T, rbox(0.1, 0.52, 0.1, 0.02), wood, [Math.cos(a) * 0.3, 0.29, Math.sin(a) * 0.3], [Math.sin(a) * 0.1, 0, -Math.cos(a) * 0.1]); part(T, rbox(0.14, 0.08, 0.14, 0.02), woodD, [Math.cos(a) * 0.33, 0.04, Math.sin(a) * 0.33]); }
    part(T, cyl(0.27, 0.25, 0.05, 28), brassD, [0, 0.67, 0]); part(T, cyl(0.23, 0.22, 0.09, 28), brass, [0, 0.74, 0]); part(T, new THREE.TorusGeometry(0.205, 0.022, 8, 32).rotateX(Math.PI / 2), brassD, [0, 0.79, 0]); part(T, new THREE.TorusGeometry(0.235, 0.012, 6, 32).rotateX(Math.PI / 2), brassD, [0, 0.695, 0]);
    const gems = [0x3f9bff, 0x3f9bff, 0x3f9bff, 0x3f9bff]; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; const gm = part(T, new THREE.OctahedronGeometry(0.028, 0), new THREE.MeshToonMaterial({ color: gems[i % 4], emissive: gems[i % 4], emissiveIntensity: 0.6, gradientMap: gradMap() }), [Math.cos(a) * 0.232, 0.74, Math.sin(a) * 0.232], [0, -a, 0], [0.5, 1.3, 1]); part(T, new THREE.TorusGeometry(0.032, 0.007, 5, 10), brassD, [Math.cos(a) * 0.229, 0.74, Math.sin(a) * 0.229], [0, Math.PI / 2 - a, 0]); }
    // the crystal sphere and what is inside it
    const G2 = new THREE.Group(); G2.position.set(0, 1.08, 0); T.add(G2); HM.globe = G2;
    const inner = new THREE.Group(); G2.add(inner); HM.globeIn = inner;
    part(inner, rbox(0.16, 0.012, 0.08, 0.004), toon(0x8a5a32), [0, -0.05, 0]); for (const [x, z] of [[-0.08, -0.04], [0.08, -0.04], [-0.08, 0.04], [0.08, 0.04]]) { const L = new THREE.Vector3(-x, 0.17, -z).length(); part(inner, cyl(0.002, 0.002, L, 4), toon(0xe8dcc0), [x / 2, 0.035, z / 2], [Math.atan2(z, 0.17) * -1, 0, Math.atan2(x, 0.17)], null, { ink: false, shadow: false }); }
    part(inner, rbox(0.06, 0.04, 0.035, 0.008), toon(0x4a6f9e), [0.03, -0.025, 0], null, null, { shadow: false }); part(inner, new THREE.ConeGeometry(0.035, 0.05, 10), toon(0xd9573c), [-0.04, -0.015, 0.01], null, null, { shadow: false });
    const bolt = new THREE.LineBasicMaterial({ color: 0x9fe4ff, transparent: true, opacity: 0.9 }); HM.bolts = []; for (let i = 0; i < 3; i++) { const pts = []; let p = V((r() - 0.5) * 0.1, 0.24, (r() - 0.5) * 0.1); for (let j = 0; j < 6; j++) { pts.push(p.clone()); p = p.add(V((r() - 0.5) * 0.08, -0.05, (r() - 0.5) * 0.08)); } const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), bolt); inner.add(ln); HM.bolts.push(ln); }
    const glass = new THREE.MeshPhongMaterial({ color: 0xa8d4ff, emissive: 0x1d4f9a, transparent: true, opacity: 0.42, shininess: 120, specular: 0xffffff, depthWrite: false, side: THREE.DoubleSide }); const sph = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 22), glass); sph.renderOrder = 4; G2.add(sph); HM.globeGlass = sph;
    const halo = part(G2, new THREE.SphereGeometry(0.34, 24, 16), new THREE.MeshBasicMaterial({ color: 0x7fd3ff, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.BackSide }), [0, 0, 0], null, null, { ink: false, shadow: false }); HM.globeHalo = halo;
    const gl = new THREE.PointLight(0x6fb8ff, 0.6, 3.2, 1.5); G2.add(gl); HM.globeLight = gl;
    const tap = () => { HM.offer = true; HM.extraActs = [['camp', '🌐 Travel: Hanging Camp']]; homeUI(true); st.lastInput = clk; }; T.traverse((o) => { if (o.isMesh) o.userData.tap = tap; }); T.userData.tap = tap;
    HM.onAct = (v) => { if (v === 'camp') { HM.offer = false; HM.extraActs = []; HM.travel = 'camp'; if (typeof setTab === 'function') setTab('ledge'); } };
    HM.obs.push({ x: t.x, z: t.z, r: 0.55 }); }
  // the frayed branch: off the main line on the floor, up a table leg, then threading into the globe and out again
  function globeBranch(tw) { tw = twinOf(tw && tw.a ? tw : tw ? { grade: tw, dir: 'in' } : null); const t = HMP.table, a = mainLinePts()[5], leg = V(t.x + Math.cos(0.3 + 2 * Math.PI * 2 / 3) * 0.3, 0, t.z + Math.sin(0.3 + 2 * Math.PI * 2 / 3) * 0.3);
    const pts = [a.clone().setY(0.06), V(lerp(a.x, leg.x, 0.5), 0.05, lerp(a.z, leg.z, 0.5) + 0.05), V(leg.x - 0.04, 0.06, leg.z), V(leg.x - 0.02, 0.3, leg.z), V(leg.x * 0.9 + t.x * 0.1, 0.58, leg.z), V(t.x - 0.36, 0.67, t.z - 0.05), V(t.x - 0.2, 0.68, t.z - 0.03), V(t.x - 0.05, 0.75, t.z), V(t.x + 0.01, 0.95, t.z), V(t.x + 0.02, 1.3, t.z), V(t.x - 0.02, 1.22, t.z), V(t.x, 1.08, t.z)];
    const cd = twinCord(HM.cords, pts, tw, 0.9, 0); cd.userData.port = 'globe'; cd.userData.seed = 0; cd.userData.inside = true; cd.userData.branch = true; HM.cordList.push(cd); HM.branch = cd; HM.branchPts = pts; if (HM.table) cd.traverse((o) => { o.userData.tap = HM.table.userData.tap; });
    const fm = toon(LGRADES[tw.a.grade].col), fm2 = toon(LGRADES[tw.b.grade].col); for (let i = 0; i < 5; i++) { const s0 = pts[0].clone().lerp(pts[1], 0.15 + i * 0.12), f = [s0, s0.clone().add(V(0.03 + i * 0.01, 0.02, (i % 2 ? 1 : -1) * 0.05)), s0.clone().add(V(0.07, 0.005, (i % 2 ? 1 : -1) * 0.08))]; const fb = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(f), 8, 0.0035, 4), i % 2 ? fm2 : fm); HM.cords.add(fb); } }
  function globeTick(dt) { if (!HM.globe) return; const t = HM.t || 0; HM.globeIn.rotation.y += dt * 0.4; HM.globeIn.position.y = 0.012 * Math.sin(t * 1.3); const fl = Math.max(0, Math.sin(t * 9.1) * Math.sin(t * 3.7 + 1)); HM.bolts.forEach((b, i) => { b.visible = ((t * 5 + i * 1.7) % 3) < 1.1; b.material.opacity = 0.5 + 0.5 * fl; }); HM.globeLight.intensity = (HM.offer ? 1.0 : 0.6) + 0.2 * fl; HM.globeHalo.material.opacity = (HM.offer ? 0.3 : 0.18) + 0.05 * Math.sin(t * 2); }
  // interior mood: inside the Ledge the scene's daylight rig drops to a dim warm ambience and the room is lit by its own lanterns, forge and globe
  function homeLights(inside) { if (HM._lit === inside) return; HM._lit = inside; for (const o of scene.children) { if (!o.isLight) continue; if (o.userData.base === undefined) o.userData.base = o.intensity; o.intensity = o.userData.base * (inside ? (o.isHemisphereLight ? 0.2 : 0.16) : 1); }
    for (const l of HM.inLights || []) l.visible = inside; }
  function makeHome() { const g = new THREE.Group(); g.name = 'home'; HM.room = makeRoom(); furnishRoom(HM.room); furnishSmithing(HM.room); furnishGlobe(HM.room); g.add(HM.room); HM.ext = makeHomeExt(); g.add(HM.ext); HM.cords = new THREE.Group(); g.add(HM.cords); HM.tw = twinOf(S && (S.homeStrands || (LGRADES[S.homeLine] ? { grade: S.homeLine, dir: 'in' } : null)), { a: { grade: 'lumen', dir: 'to' }, b: { grade: 'lumen', dir: 'from' } }); refreshPorts(); return g; }
  // ports: locks on the 8 small ones until unlocked; plugged Lifelines get a brass plug and a cord (outside: down off the shelf; inside, the centre port's line runs to the vault)
  // rounded corners for a polyline route (exterior Lifeline cords)
  function rounded(pts, r = 0.05) { const o = [pts[0]]; for (let i = 1; i < pts.length - 1; i++) { const a = pts[i - 1], b = pts[i], c = pts[i + 1], d1 = b.clone().sub(a), d2 = c.clone().sub(b), r1 = Math.min(r, d1.length() * 0.45), r2 = Math.min(r, d2.length() * 0.45); d1.normalize(); d2.normalize(); o.push(b.clone().addScaledVector(d1, -r1), b.clone().addScaledVector(d1, -r1 * 0.3).addScaledVector(d2, r2 * 0.3), b.clone().addScaledVector(d2, r2)); } o.push(pts[pts.length - 1]); return o; }
  // every cord leaves its port straight out (perpendicular to the door) to its own stand-off plane, drops plumb down the door face like the main
  // one, and near the threshold eases into its own floor lane, then runs along the shelf in parallel and over the edge. Stand-offs are layered so a
  // cord that drops past a lower port passes in front of that port's plug and cord (top port furthest out, bottom port closest to the door).
  const DOOR_LANE = { c: [0.2, 0], p0: [0.33, 0.12], p1: [0.2, 0.31], p2: [0.14, 0.39], p3: [0.08, 0.23], p4: [0.07, -0.12], p5: [0.08, -0.23], p6: [0.14, -0.39], p7: [0.2, -0.31] };
  function doorRoute(id, ox, oy, z0) { const E = HM.FZ + 1.0, fy = 0.035, [so, ln] = DOOR_LANE[id] || [0.12, 0], zs = z0 + so, lx = HM.dx + ln, c = id === 'c', yk = Math.min(oy - 0.08, 0.34);
    return rounded([V(ox, oy, z0 + 0.03), V(ox, oy, zs), V(ox, yk, zs), V(lx, fy, zs + 0.16), V(lx, fy, E), V(lx, -0.3, E + 0.06), V(lx, -1.2, E + 0.07)], c ? 0.07 : 0.05); }
  function refreshPorts() { const hs = homeState(), dr = HM.door; if (!dr) return; for (const [i, id] of PORTS.entries()) { const pg = dr.userData.ports[id], locked = id !== 'c' && i - 1 >= hs.open, P2 = hs.ports[id]; if (pg.userData.lock) pg.userData.lock.visible = locked; if (pg.userData.glow) pg.userData.glow.visible = !P2; }
    for (const c of [...HM.cords.children]) { HM.cords.remove(c); c.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); } HM.cordList = [];
    for (const id of PORTS) { if (!hs.ports[id]) continue; const P2 = hs.ports[id] = twinOf(hs.ports[id]); const pp = portPos(id), c = id === 'c', k = c ? 2.4 : 1.4, ox = HM.dx + pp.x, oy = pp.y, z0 = HM.FZ + 0.06;
      const plug = new THREE.Group(); plug.position.set(ox, oy, z0); HM.cords.add(plug); part(plug, cyl(c ? 0.07 : 0.035, c ? 0.06 : 0.03, 0.08, 16).rotateX(Math.PI / 2), toon(0xb07a3a), [0, 0, 0.03]);
      const out = doorRoute(id, ox, oy, z0);
      const cd = twinCord(HM.cords, out, P2, k, 0); cd.userData.port = id; cd.userData.seed = PORTS.indexOf(id) * 1.7; cd.userData.ext = true; HM.cordList.push(cd);
      if (c) { const zin = HM.FZ - 0.06, pin = new THREE.Group(); pin.position.set(ox, oy, zin); HM.cords.add(pin); part(pin, cyl(0.07, 0.06, 0.08, 16).rotateX(-Math.PI / 2), toon(0xb07a3a), [0, 0, -0.03]); HM.plugIn = pin; // inside, the main Lifeline runs unbroken across the floor into the vault port
        const ic = twinCord(HM.cords, mainLinePts(), P2, 2.4, 1); ic.userData.port = 'c'; ic.userData.seed = 0; ic.userData.inside = true; HM.cordList.push(ic); HM.mainCord = ic; globeBranch(P2); } }
    hs.ports && (HM.n = Object.keys(hs.ports).length); homeInfo(); }
  function homeInfo() { const hs = homeState(), e = document.getElementById('homeLines'); if (!e) return; const v = Object.values(hs.ports).map((p) => twinOf(p)), sv = v.flatMap((p) => [p.a, p.b]), i = sv.filter((x) => x.dir === 'to').length, o = sv.length - i; e.textContent = v.length ? `${v.length} × 2 strands · ${i} to Ledge · ${o} from` : 'no Lifelines plugged'; const m = document.getElementById('homeMode'); if (m) m.textContent = HM.mode === 'in' ? 'inside' : 'at the door'; const sm = document.querySelector('#homeInfo small'); if (sm) { const t2 = HM.mode === 'in' ? 'Your Ledge, inside the cliff. Drag to orbit · tap to walk' : HM.menu ? 'Ledge door: enter, or manage the Lifeline ports' : 'Your Ledge in the cliff. Tap the door to enter or manage Lifelines · drag to orbit'; if (sm.textContent !== t2) sm.textContent = t2; } }
  function plugPort(id, a, b) { const hs = homeState(); id = id || HM.sel; const i = PORTS.indexOf(id); if (i < 0) return false; if (id !== 'c' && i - 1 >= hs.open) return false; if (hs.ports[id]) return false; // one Lifeline per port
    hs.ports[id] = typeof a === 'string' ? twinOf({ grade: a, dir: b }) : a && a.a ? twinOf(a) : a && b ? twinOf({ a, b }) : twinOf(HM.tw); if (typeof save === 'function') save(); refreshPorts(); homeMark(); return true; }
  function unplugPort(id) { const hs = homeState(); id = id || HM.sel; if (!hs.ports[id]) return false; delete hs.ports[id]; if (typeof save === 'function') save(); refreshPorts(); homeMark(); return true; }
  // Strand A / B selectors: re-string the selected port's Lifeline live if one is plugged in, otherwise set the pair to plug in next
  function setHomeStrand(w, ch) { const hs = homeState(), P2 = hs.ports[HM.sel]; w = w === 'b' ? 'b' : 'a'; if (P2) { const t = twinOf(P2); Object.assign(t[w], ch); hs.ports[HM.sel] = t; refreshPorts(); } else { Object.assign(HM.tw[w], ch); HM.tw = twinOf(HM.tw); if (typeof S !== 'undefined' && S) { S.homeStrands = HM.tw; delete S.homeLine; } } if (typeof save === 'function') save(); homeMark(); }
  function unlockPort() { const hs = homeState(); if (hs.open >= 8) return false; hs.open++; if (typeof save === 'function') save(); refreshPorts(); homeUI(true); return true; }
  // walking: the shared ground walker with the room's bounds and furniture as round obstacles
  function homeWalker(x, z, face) { st.gnd = { home: true, x, z, face, mv: 0, back: 0, bnd: HM.mode === 'in' ? { X0: -HM.W / 2 + 0.35, X1: HM.W / 2 - 0.35, Z0: HM.BZ + 0.4, Z1: HM.FZ - 0.4 } : { X0: HM.dx - 1.05, X1: HM.dx + 1.05, Z0: HM.FZ + 0.32, Z1: HM.FZ + 0.82 }, obs: HM.mode === 'in' ? HM.obs : [] }; }
  function setHomeMode(m) { HM.mode = m === 'in' ? 'in' : 'door'; HM.ext.visible = HM.mode === 'door'; if (HM.mode === 'in') { homeWalker(HM.dx, HM.FZ - 0.75, Math.PI); Object.assign(st.orb, { az: 0.18, el: 0.75, d: 12 }); } else { homeWalker(HM.dx + 0.85, HM.FZ + 0.75, Math.PI); Object.assign(st.orb, { az: 0.3, el: 0.16, d: 3.9 }); } HM.open = 0; HM.anim = null; HM.menu = false; homeUI(true); doorMenu(false); }
  // the door menu: hidden until the door (or one of its ports) is tapped; Enter Ledge, Lifeline ports (plug/unplug, unlock upgrade, type, flow)
  function doorMenu(on) { HM.menu = !!on && HM.mode === 'door'; const box = document.getElementById('homeCtl'); if (box) box.classList.toggle('shut', HM.mode === 'door' && !HM.menu); homeMark(); homeInfo(); }
  // Enter Ledge: she walks up to the shut door, the view fades out and back in inside (the door never swings open)
  function enterLedge() { if (HM.mode !== 'door' || HM.anim) return false; const G = st.gnd; doorMenu(false); HM.anim = { k: 'go', t: 0 }; G.bnd = { X0: -9, X1: 9, Z0: HM.FZ - 1, Z1: HM.FZ + 1 }; G.goal = { x: HM.dx, z: HM.FZ + 0.4, done: () => { HM.anim = { k: 'fade', t: 0, to: 'in' }; } }; return true; }
  const openDoor = enterLedge;
  function goOutside() { if (HM.mode !== 'in' || HM.anim) return false; const G = st.gnd; G.bnd = { X0: -9, X1: 9, Z0: HM.BZ, Z1: HM.FZ + 1 }; G.obs = []; G.goal = { x: HM.dx, z: HM.FZ - 0.45, done: () => { HM.anim = { k: 'fade', t: 0, to: 'door' }; } }; HM.anim = { k: 'go', t: 0 }; return true; }
  function homeTick(dt) { const A = HM.anim, G = st.gnd; HM.t = (HM.t || 0) + dt; smithTick(dt); globeTick(dt);
    // fade transition (0.32 s out, switch scenes, 0.32 s in); the door leaf stays shut
    if (A) { A.t += dt; if (A.k === 'fade') { const F = 0.32; if (A.t >= F && !A.sw) { A.sw = true; setHomeMode(A.to); HM.anim = A; } HM.fade = A.t < F ? ss(0, F, A.t) : 1 - ss(F, 2 * F, A.t); if (A.t >= 2 * F) { HM.anim = null; HM.fade = 0; } } }
    { const fe = document.getElementById('homeFade'); if (fe) { const o = (HM.fade || 0).toFixed(3); if (fe.style.opacity !== o) fe.style.opacity = o; } }
    if (HM.door) HM.door.userData.leaf.rotation.y = 0;
    let mv = 0, xm = 0; for (const cd of HM.cordList || []) { const sd = cd.userData.seed || 0; mv |= twinTick(cd, HM.t, dt, [strandLoad(HM.t, 0, sd), strandLoad(HM.t, 1, sd)]); for (const x of cd.userData.strands) xm = Math.max(xm, x.xl); } HM.xl = xm; HM.moving = !!mv;
    for (const pg of Object.values(HM.door ? HM.door.userData.ports : {})) if (pg.userData.glow && pg.userData.glow.visible) pg.userData.glow.material.opacity = 0.75 + 0.1 * Math.sin(HM.t * 2);
    if (HM.ext.userData.lamp) HM.ext.userData.lamp.intensity = 0.85 + 0.08 * Math.sin(HM.t * 7) * Math.sin(HM.t * 3.1);
    if (HM.tickX) HM.tickX(dt); const s2 = document.getElementById('homeXfer'); if (s2) { const s = HM.moving ? 'moving' : 'idle'; if (s2.textContent !== s) s2.textContent = s; } }
  function homeMark() { const box = document.getElementById('homeCtl'); if (!box) return; const hs = homeState(); for (const b of box.querySelectorAll('button[data-v]')) { const k = b.parentNode.dataset.k, v = b.dataset.v; let on = false, dis = false;
      if (k === 'port') { const i = PORTS.indexOf(v); on = v === HM.sel; dis = v !== 'c' && i - 1 >= hs.open; b.classList.toggle('full', !!hs.ports[v]); } else if (/^[ld][ab]$/.test(k)) { const tw = hs.ports[HM.sel] ? twinOf(hs.ports[HM.sel]) : HM.tw; on = v === tw[k[1]][k[0] === 'l' ? 'grade' : 'dir']; } else if (k === 'dir') on = v === HM.dir; else if (k === 'xfer') on = v === LG.xfer;
      b.classList.toggle('on', on); b.classList.toggle('dis', dis); }
    const pb = box.querySelector('[data-v=plug]'); if (pb) pb.textContent = hs.ports[HM.sel] ? 'Unplug Lifeline' : 'Plug in Lifeline'; }
  function homeUI(force) { const box = document.getElementById('homeCtl'); if (!box) return; if (box.dataset.m === HM.mode && !force) return homeMark(); box.dataset.m = HM.mode; const hx = (c) => '#' + c.toString(16).padStart(6, '0'), hs = homeState();
    const row = (k, label, items) => `<div class="lrow"><b>${label}</b><div class="chips" data-k="${k}">${items.map(([v, n, c]) => `<button data-v="${v}"${c !== undefined ? ` style="--sw:${hx(c)}"` : ''}>${c !== undefined ? '<i></i>' : ''}${n}</button>`).join('')}</div></div>`;
    const strandRow = (w, label) => `<div class="lrow"><b>${label}</b><div class="chips dirs" data-k="d${w}"><button data-v="to">To Ledge</button><button data-v="from">From Ledge</button></div><div class="chips" data-k="l${w}">${DTIERS.map((k) => `<button data-v="${k}" style="--sw:${hx(LGRADES[k].col)}"><i></i>${GRADES[k].name}</button>`).join('')}</div></div>`;
    box.innerHTML = HM.mode === 'in' ? row('act', 'Ledge', [['out', 'Go outside']].concat(HM.extraActs || [])) + row('xfer', 'Transfer', [['auto', 'Auto'], ['on', 'On'], ['off', 'Off']])
      : '<div class="dhead"><b>Ledge door</b><button data-v="close" title="Close">✕</button></div>' + row('act', 'Door', [['enter', 'Enter Ledge'], ['plug', 'Plug in Lifeline'], ['unlock', 'Upgrade: unlock a port']]) + row('port', 'Port', PORTS.map((id, i) => [id, id === 'c' ? 'Main' : (i - 1 >= hs.open ? '🔒' : '') + i])) + strandRow('a', 'Strand A') + strandRow('b', 'Strand B');
    homeMark(); }
  function homeMode(on) { if (!R) return; if (!!on === !!st.home) return; if (!on) homeLights(false); /* the UI re-renders call show('home') every tick: never reset the camera, walker or panel while already home */ if (on && !HM.g) { HM.g = makeHome(); scene.add(HM.g); HM.bg = cv(8, 256, (g2, w, h) => { const gr = g2.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f3dcb4'); gr.addColorStop(0.55, '#e2b987'); gr.addColorStop(1, '#a9825e'); g2.fillStyle = gr; g2.fillRect(0, 0, w, h); }); HM.bg0 = scene.background;
      const box = document.getElementById('homeCtl'); if (box && !box.dataset.ok) { box.dataset.ok = 1; box.addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (!b || b.classList.contains('dis')) return; const k = b.parentNode.dataset.k || '', v = b.dataset.v;
        if (v === 'close' && !k) doorMenu(false); else if (k === 'act') { if (v === 'enter' || v === 'open') enterLedge(); else if (v === 'out') goOutside(); else if (v === 'plug') { if (!plugPort(HM.sel, HM.tw)) unplugPort(HM.sel); } else if (v === 'unlock') unlockPort(); else if (HM.onAct) HM.onAct(v); }
        else if (k === 'port') HM.sel = v; else if (/^[ld][ab]$/.test(k)) setHomeStrand(k[1], k[0] === 'l' ? { grade: v } : { dir: v }); else if (k === 'xfer') { setXfer(v); S.ledgeXfer = LG.xfer; } if (typeof save === 'function') save(); homeMark(); st.lastInput = clk; }); } }
    if (on && st.ledge) ledgeMode(false); st.home = !!on; if (HM.g) HM.g.visible = !!on; for (const fl of FLOOR) fl.visible = !on && !st.ledge; if (HM.bg) scene.background = on ? HM.bg : (st.ledge ? LG.bg : HM.bg0); wrap.classList.toggle('home', !!on); cam.fov = on ? 50 : st.ledge ? 34 : 26; cam.updateProjectionMatrix();
    const key = scene.children.find((o) => o.isDirectionalLight && o.castShadow); if (key && on) { Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 0.5, far: 22 }); key.shadow.camera.updateProjectionMatrix(); key.position.set(2.5, 6, 5); }
    if (on) { st.orbL = st.orb; st.orb = HM.orb || (HM.orb = { az: 0.42, el: 0.14, d: 3.6 }); st.tool = 'pick'; an.eq = { held: 'pick', seq: null, t: 0 }; an.cl = null; an.tv = null; st.play = false; st.pg = null; st.anim = 'idle'; st.yaw = 0; st.yawV = 0; const arr = typeof S !== 'undefined' && S && S.homeArrive === 'globe'; setHomeMode(arr ? 'in' : (HM.mode || 'door')); if (arr) { delete S.homeArrive; const t2 = HMP.table; st.gnd.x = t2.x + 0.75; st.gnd.z = t2.z + 0.55; st.gnd.face = -2.2; HM.arrived = 'globe'; HM.tgt = null; } }
    else { if (st.orbL !== undefined) st.orb = st.orbL; st.gnd = null; if (key) { Object.assign(key.shadow.camera, { left: -1.2, right: 1.2, top: 2, bottom: -0.4, near: 0.5, far: 8 }); key.shadow.camera.updateProjectionMatrix(); key.position.set(1.4, 3.2, 2.6); } } }
  // tap inside the home: floor -> walk there; the door from outside -> handle opens it, a port selects it
  function homeTap(cx, cy) { cam.updateMatrixWorld(); HM.g.updateMatrixWorld(true); const r = canvas.getBoundingClientRect(), nd = new THREE.Vector2((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); _ray.setFromCamera(nd, cam); const hits = _ray.intersectObject(HM.g, true);
    for (const h of hits) { let vis = true; for (let q = h.object; q && q !== HM.g; q = q.parent) if (!q.visible) vis = false; if (!vis) continue; let o = h.object; while (o && o !== HM.g) { if (o.userData.tap) return o.userData.tap(), true; if (HM.mode === 'door' && (o.userData.port || o.userData.handle || o === HM.door)) { if (o.userData.port) HM.sel = o.userData.port; doorMenu(true); return true; } o = o.parent; } let inC = false; for (let q = h.object; q; q = q.parent) if (q === HM.cords) inC = true; if (h.object.visible && !inC) break; }
    const o = _ray.ray.origin, d = _ray.ray.direction; if (HM.mode === 'door' && HM.menu) doorMenu(false); if (d.y < -1e-4 && st.gnd && !HM.anim) { const t = -o.y / d.y, q = o.clone().addScaledVector(d, t), B = st.gnd.bnd; navTo(st.gnd, clamp(q.x, B.X0, B.X1), clamp(q.z, B.Z0, B.Z1), () => { st.pg = null; }); pgMark({ x: st.gnd.goal.x, z: st.gnd.goal.z }); st.pg = { home: true }; return true; } return false; }
  function homeScreen(p) { cam.updateMatrixWorld(); const q = p.clone().project(cam), r = canvas.getBoundingClientRect(); return { x: r.left + (q.x + 1) / 2 * r.width, y: r.top + (1 - q.y) / 2 * r.height }; }
  return { get cam() { return cam; }, globeBranch, SMITH, HMP, mainLinePts, HM, homeMode, setHomeMode, openDoor, enterLedge, doorMenu, twinOf, setStrand, setLine, setHomeStrand, refreshPorts, goOutside, plugPort, unplugPort, unlockPort, homeTap, homeScreen, homeState, setGait, GAIT, navPlan, navTo, pathLen, segClear, wallBase, get FIELD_OBS() { return FIELD_OBS; }, get DMAX() { return DMAX; }, GW, pgGo, pgPick, pgScreen, get pgMarker() { return PGM; }, show, hide, st, LG, ORES, LGRADES, DTIERS, setOre, setDrillGrade, setLineGrade, setXfer, get ledge() { return LEDGE; }, CLIMB_T: 4 * CL.TS, get rig() { return rig; }, setPick, setTether, setAnim, setTool, setClimb, setClimbDir, tetherAct, CGRADES, makeClimbPick, TGRADES, makeTether, showcase, showcaseTether, showcaseClimb, GRADES, makePickaxe, setYaw: (y) => { st.yaw = y; st.yawV = 0; }, fidget: (k) => { an.fid = k; an.ft = 0; st.fidget = k; an.next = clk + 999; }, advance: (sec, n = 1) => { for (let i = 0; i < n; i++) renderAt(sec); }, sim: (sec, n = 1) => { st.noRender = true; try { for (let i = 0; i < n; i++) renderAt(sec); } finally { st.noRender = false; } } /* tests: step time without drawing (no GPU backlog) */, an };
})();

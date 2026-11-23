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
  // the winch drum centre in the winch's own frame (hung on its strap below/out from the belt); the rope attach points sit on it
  const WINCH_DRUM = { y: -0.024, z: -0.02 };
  // merge [geo, colour, pos, rot, scl] parts into one non-indexed geometry with vertex colours (one draw + one ink hull)
  function mergeVC(items) { const P = [], N = [], Cc = [], m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
    for (const [g0, c, p = [0, 0, 0], r = [0, 0, 0], sc = [1, 1, 1]] of items) { const g = g0.index ? g0.toNonIndexed() : g0.clone(); g0.dispose(); m.compose(V(...p), q.setFromEuler(e.set(...r)), V(...sc)); g.applyMatrix4(m); const a = g.attributes.position, n = g.attributes.normal; col.set(c);
      for (let i = 0; i < a.count; i++) { P.push(a.getX(i), a.getY(i), a.getZ(i)); N.push(n.getX(i), n.getY(i), n.getZ(i)); Cc.push(col.r, col.g, col.b); } g.dispose(); }
    const G = new THREE.BufferGeometry(); G.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); G.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); G.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3)); return G; }
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
    uniforms: { uTime: { value: 0 }, uUp: { value: V(0, 1, 0) }, uScale: { value: 400 }, uBig: { value: 1 }, uC1: { value: new THREE.Color(0.8, 0.06, 0.02) }, uC2: { value: new THREE.Color(1.0, 0.62, 0.18) } },
    vertexShader: `attribute vec3 aOut; attribute float aSeed; uniform float uTime; uniform vec3 uUp; uniform float uScale; uniform float uBig; varying float vLife; varying float vSeed;
      void main() { float rate = 1.6 + fract(aSeed * 7.31) * 1.3; float t = fract(uTime * rate + aSeed); vLife = t; vSeed = aSeed;
        vec3 side = normalize(cross(uUp, aOut + vec3(0.001, 0.0, 0.0)));
        vec3 p = position + aOut * (0.003 + 0.004 * t) + uUp * (t * (0.042 + 0.026 * fract(aSeed * 3.7)) * uBig) + side * 0.004 * sin(uTime * 7.0 + aSeed * 40.0) * t;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        float flick = 0.75 + 0.25 * sin(uTime * 23.0 + aSeed * 91.0);
        float size = (0.038 + 0.026 * fract(aSeed * 5.3)) * uBig * pow(sin(3.14159 * min(1.0, t * 1.15)), 0.6) * flick;
        gl_PointSize = size * length(modelMatrix[0].xyz) * projectionMatrix[1][1] * uScale / -mv.z; }`, /* (map fix) times the model's world scale: on the map she is ~7.5x bigger in world units, so local-unit flame sizes shrank to specks */
    fragmentShader: `varying float vLife; varying float vSeed; uniform float uTime; uniform vec3 uC1; uniform vec3 uC2;
      void main() { vec2 q = gl_PointCoord * 2.0 - 1.0; q.y = -q.y; float h = (q.y + 1.0) * 0.5;
        float w = mix(0.5, 0.03, pow(h, 0.75)); float x = q.x + 0.18 * h * sin(h * 6.0 + vSeed * 20.0 + uTime * 11.0);
        float body = smoothstep(w, w * 0.25, abs(x)) * smoothstep(0.0, 0.18, h) * smoothstep(1.0, 0.75, h);
        float core = smoothstep(w * 0.55, 0.0, abs(x)) * (1.0 - h);
        vec3 col = mix(uC1, uC2, core);
        float a = clamp(body * pow(1.0 - vLife, 0.8) * 1.3, 0.0, 1.0); if (a < 0.01) discard; gl_FragColor = vec4(col * a * 1.1, a); }` });
  // big flowing flame licks: camera-facing ribbons rooted on the head that rise toward world-up, taper, sway and lick upward (one draw call; same uniforms as the ember points)
  // flame licks: camera-facing tapered tongues rooted on the head - a full base, a waist and a curling tip that sways and rises toward world-up; additive, one draw call
  function flameRibbons(licks) { const NS = 14, pos = [], uv = [], base = [], dir = [], dim = [], idx = []; const r = prng(91);
    licks.forEach(([b, o, H, Wd]) => { const v0 = pos.length / 3, sd = r(); for (let j = 0; j <= NS; j++) for (const x of [-1, 1]) { pos.push(0, 0, 0); uv.push(x, j / NS); base.push(b.x, b.y, b.z); dir.push(o.x, o.y, o.z); dim.push(H, Wd, sd); }
      for (let j = 0; j < NS; j++) { const a = v0 + j * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('aBase', new THREE.Float32BufferAttribute(base, 3)); g.setAttribute('aDir', new THREE.Float32BufferAttribute(dir, 3)); g.setAttribute('aDim', new THREE.Float32BufferAttribute(dim, 3)); g.setIndex(idx);
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 }, uUp: { value: V(0, 1, 0) }, uScale: { value: 400 }, uH: { value: 1 }, uR1: { value: new THREE.Color(0.75, 0.1, 0.02) }, uR2: { value: new THREE.Color(0.55, 0.3, 0.03) }, uR3: { value: new THREE.Color(0.5, 0.45, 0.25) } },
      vertexShader: `attribute vec3 aBase; attribute vec3 aDir; attribute vec3 aDim; uniform float uTime; uniform vec3 uUp; uniform float uH; varying vec2 vUv; varying float vSeed;
        void main() { float y = uv.y, sd = aDim.z, ph = uTime * (2.6 + sd * 1.8) + sd * 40.0; float H = aDim.x * uH * (0.85 + 0.2 * sin(ph));
          vec3 d = normalize(mix(aDir, uUp, 0.35 + 0.6 * y)); vec3 sw = normalize(cross(uUp, aDir + vec3(0.001, 0.0, 0.0001)));
          float curl = sin(y * 3.4 - uTime * 4.5 + sd * 30.0) * pow(y, 1.5);
          vec3 P = aBase + d * H * y + sw * H * 0.32 * curl;
          vec4 mv = modelViewMatrix * vec4(P, 1.0); vec3 T = normalize((modelViewMatrix * vec4(d + sw * 0.9 * cos(y * 3.4 - uTime * 4.5 + sd * 30.0) * y, 0.0)).xyz); vec3 S = normalize(cross(T, vec3(0.0, 0.0, 1.0)));
          float w = aDim.y * smoothstep(-0.02, 0.16, y) * pow(1.0 - y, 1.25) * (1.0 + 0.7 * exp(-pow((y - 0.22) / 0.17, 2.0)));
          mv.xyz += S * uv.x * w * length(modelMatrix[0].xyz); vUv = uv; vSeed = sd; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec2 vUv; varying float vSeed; uniform float uTime; uniform vec3 uR1; uniform vec3 uR2; uniform vec3 uR3;
        void main() { float y = vUv.y, x = abs(vUv.x); float m = 1.0 - smoothstep(0.6, 1.0, x); float tip = 1.0 - smoothstep(0.78, 1.0, y + 0.08 * sin(uTime * 11.0 + vSeed * 50.0));
          float core = (1.0 - smoothstep(0.0, 0.45, x)) * (1.0 - smoothstep(0.2, 0.75, y)); float mid = (1.0 - smoothstep(0.2, 0.8, x)) * (1.0 - smoothstep(0.4, 0.95, y));
          vec3 col = uR1 * m + uR2 * mid + uR3 * core;
          float a = m * tip * smoothstep(0.0, 0.06, y); if (a < 0.01) discard; gl_FragColor = vec4(col * a, 1.0); }` });
    const ms = new THREE.Mesh(g, m); ms.frustumCulled = false; ms.renderOrder = 6; return ms; }
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
        vec3 p = position + vec3(0.0, 0.012 * t, 0.0); vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = (0.018 + 0.02 * fract(aSeed * 9.7)) * tw * length(modelMatrix[0].xyz) * projectionMatrix[1][1] * uScale / -mv.z; }`,
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
  /* Ember Onyx (concept ember_onyx_shard_v2): a wing-swept faceted black onyx head - a long swept blade behind, a hooked pick point in front, a crown of
     shards on top - glowing red veins with flame licks, a molten ember core where the head meets the handle; a faceted onyx handle with red seams, a wrapped
     grip and small brass bands. Flat-shaded facets with a metallic sheen (Phong), toon-clean colours, no gritty texture. */
  function onyxBlade(pts2, wF, tF, n, jit, r) { const C = new THREE.CatmullRomCurve3(pts2.map(([x, y]) => V(x, y, 0))), rings = [], Z = V(0, 0, 1);
    for (let i = 0; i <= n; i++) { const u = i / n, p = C.getPointAt(u), t = C.getTangentAt(u), N = V(-t.y, t.x, 0), w = wF(u), th = tF(u), j = () => 1 + (r() - 0.5) * jit;
      rings.push([p.clone().addScaledVector(N, w * j()), p.clone().addScaledVector(N, w * 0.35).addScaledVector(Z, th * j()), p.clone().addScaledVector(N, -w * 0.45).addScaledVector(Z, th * 0.8 * j()), p.clone().addScaledVector(N, -w * j()), p.clone().addScaledVector(N, -w * 0.45).addScaledVector(Z, -th * 0.8 * j()), p.clone().addScaledVector(N, w * 0.35).addScaledVector(Z, -th * j())]); }
    const P = []; const tri = (a, b, c) => P.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    for (let i = 0; i < n; i++) for (let k = 0; k < 6; k++) { const a = rings[i][k], b = rings[i][(k + 1) % 6], c = rings[i + 1][k], d = rings[i + 1][(k + 1) % 6]; tri(a, c, b); tri(b, c, d); }
    const r0 = rings[0]; for (let k = 1; k < 5; k++) tri(r0[0], r0[k + 1], r0[k]);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.computeVertexNormals(); return { g, C }; }
  /* ---------- (Dominic, Mia's ember_onyx_tier_flames ladder) the tiered Ember Onyx pickaxe: only the glowing cracks and the flames change colour with its tier
     (the stone stays); flames grow and flicker a little more each tier; T10 adds a #d8e8ff core and floating violet sparks. Plain Ember Onyx is T0 (the original look). */
  const ONYX_TIER_HEX = ['#ff4a1c', '#ff6a1a', '#ff8f1f', '#ffb52e', '#ffe08a', '#c8f4ff', '#5fdcff', '#3aa0ff', '#3f5cff', '#7a4dff', '#b04bff'];
  const onyxTierNow = () => (typeof S !== 'undefined' && S && S.pickGrade === 'onyx' && typeof Craft !== 'undefined' && Craft.equippedPickTierN ? Craft.equippedPickTierN() : 0);
  const ONYX_GLOW = {}; const onyxGlowTex = (t) => ONYX_GLOW[t] || (ONYX_GLOW[t] = (() => { const c = new THREE.Color(ONYX_TIER_HEX[t]), h = c.clone().lerp(new THREE.Color(t === 10 ? 0xd8e8ff : 0xffffff), 0.35), f = (q, a) => `rgba(${Math.round(q.r * 255)},${Math.round(q.g * 255)},${Math.round(q.b * 255)},${a})`; return radial(f(h, 1), f(c, 0.25)); })());
  function onyxTint(px, t) { t = Math.max(0, Math.min(10, Math.floor(t || 0))); px.userData.onyxT = t; px.userData.tierCol = ONYX_TIER_HEX[t]; if (!t) return px; // T0: the painted original
    const C = new THREE.Color(ONYX_TIER_HEX[t]), Wc = new THREE.Color(t === 10 ? 0xd8e8ff : 0xffffff), hot = C.clone().lerp(Wc, 0.55), hsl = {};
    px.traverse((o) => { const m = o.material; if (!m || !m.isMeshBasicMaterial || m === px.userData.veins || m.userData.tinted) return; m.color.getHSL(hsl); if (!(m.color.r > 0.6 && hsl.s > 0.5 && m.color.r >= m.color.b)) return; m.userData.tinted = 1; m.color.copy(C).lerp(Wc, Math.max(0, Math.min(1, (hsl.l - 0.55) / 0.3)) * 0.85); });
    px.userData.veinCol = C.clone(); if (px.userData.veins) px.userData.veins.color.copy(C);
    if (px.userData.light) px.userData.light.color.copy(C); if (px.userData.glow) px.userData.glow.material.map = onyxGlowTex(t);
    const fl = px.userData.flames, rb = px.userData.ribbons, grow = 1 + 0.035 * t;
    if (fl) { const u = fl.material.uniforms; u.uC1.value.copy(C).multiplyScalar(0.85); u.uC2.value.copy(hot); u.uBig.value *= grow; }
    if (rb) { const u = rb.material.uniforms; u.uR1.value.copy(C).multiplyScalar(0.75); u.uR2.value.copy(C).lerp(hot, 0.5).multiplyScalar(0.55); u.uR3.value.copy(hot).multiplyScalar(0.5); u.uH.value = grow; }
    px.userData.fl = 1 + 0.04 * t; px.userData.sparkRGB = hot; // flicker rate (updatePickFx) and the impact sparks
    if (t === 10) { const bx = new THREE.Box3().setFromObject(px), r = prng(13), sp = [], seed = []; for (let i = 0; i < 28; i++) { sp.push(bx.min.x + r() * (bx.max.x - bx.min.x), bx.max.y - r() * (bx.max.y - bx.min.y) * 0.4 + 0.02, (r() - 0.5) * 0.09); seed.push(r()); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1)); const spk = new THREE.Points(g, SPARK_MAT(0xb04bff)); spk.frustumCulled = false; spk.renderOrder = 5; px.add(spk); px.userData.fx.push(spk); }
    return px; }
  function onyxShard(px, G) { const r = prng(57), onyx = new THREE.MeshPhongMaterial({ color: 0x2a2630, specular: 0x6a5e74, shininess: 45, flatShading: true }), onyx2 = new THREE.MeshPhongMaterial({ color: 0x302b35, specular: 0x4a4252, shininess: 30, flatShading: true }),
      veinM = new THREE.MeshBasicMaterial({ color: 0xff3418 }), hotM = new THREE.MeshBasicMaterial({ color: 0xff8a2a }), brass = new THREE.MeshPhongMaterial({ color: 0xb08a3c, specular: 0xffe0a0, shininess: 70 }), sites = [], vein = (par, pts, rad, seg = 40) => part(par, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, rad, 4, false), veinM, null, null, null, { ink: false, shadow: false });
    // handle: a thick faceted, slightly twisted onyx shaft (6 facets) ending in a rounded faceted pommel
    const HR = 0.034; { const g = new THREE.CylinderGeometry(HR - 0.002, HR + 0.002, 1.0, 6, 24), P = g.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), a = Math.atan2(z, x) + y * 1.4, rr = Math.hypot(x, z); P.setXYZ(i, Math.cos(a) * rr, y, Math.sin(a) * rr); } g.computeVertexNormals();
      part(px, g.toNonIndexed(), onyx, [0, 0.17, 0]); }
    part(px, new THREE.IcosahedronGeometry(0.054, 1), onyx2, [0, -0.37, 0], [0.2, 0.3, 0.1], [1, 1.25, 1]);
    // red seams spiralling up the facets
    for (let k = 0; k < 3; k++) for (const [y0, y1] of [[-0.3, -0.25], [-0.17, 0.37], [0.47, 0.62]]) { const pts = []; for (let i = 0; i <= 16; i++) { const y = y0 + (y1 - y0) * i / 16, a = k * TAU / 3 + (y - 0.17) * 1.4 + 0.52 + Math.sin(y * 34 + k) * 0.14; pts.push(V(Math.cos(a) * (HR - 0.0005), y, Math.sin(a) * (HR - 0.0005))); } vein(px, pts, 0.0019, 32);
      if (k === 0 && y1 - y0 > 0.3) for (let i = 0; i < 6; i++) { const p = pts[2 + i * 2]; sites.push([p.clone(), V(p.x, 0, p.z).normalize()]); } }
    // two prominent brass bands (three stacked rings each, studded)
    for (const yc of [-0.215, 0.42]) { for (const dy of [-0.024, 0, 0.024]) part(px, new THREE.TorusGeometry(HR + 0.003, 0.0072, 6, 18), brass, [0, yc + dy, 0], [Math.PI / 2, 0, 0]); for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + 0.4; part(px, new THREE.SphereGeometry(0.0062, 6, 4), brass, [Math.cos(a) * (HR + 0.009), yc, Math.sin(a) * (HR + 0.009)]); } }
    // the head: one heavy crescent - a long sweep back and down to a molten point, a shorter hooked point up front
    const head = new THREE.Group(); head.position.y = 0.68; px.add(head);
    part(head, new THREE.DodecahedronGeometry(0.066, 0), onyx, [0, -0.012, 0], [0.2, 0.4, 0], [1, 1.45, 0.95]);
    const BW = 0.1, HW = 0.072, BT = 0.044, HT = 0.036, licks = [];
    // the crescent: one smooth, sharp faceted blade sweeping back and down to a needle point, a smooth hooked point up front
    const back = onyxBlade([[0.02, 0.03], [-0.11, 0.075], [-0.24, 0.035], [-0.335, -0.1], [-0.395, -0.35]], (u) => BW * Math.pow(1 - u, 1.05) + 0.0012, (u) => BT * (1 - u * 0.9) + 0.0012, 16, 0.03, r);
    const hook = onyxBlade([[0, 0.04], [0.11, 0.1], [0.21, 0.13], [0.3, 0.12], [0.37, 0.075]], (u) => HW * Math.pow(1 - u, 1.0) + 0.001, (u) => HT * (1 - u * 0.9) + 0.001, 14, 0.03, r);
    part(head, back.g, onyx); part(head, hook.g, onyx);
    // long tapered shards layered like feathers along the back of the sweep: each one roots inside the blade and lies along the curve toward the point, overlapping the next
    const shard = (B, u0, du, out, wd, th, z, m) => { const P = (u, o) => { const p = B.C.getPointAt(Math.min(0.995, u)), t = B.C.getTangentAt(Math.min(0.995, u)); return p.add(V(-t.y, t.x, 0).multiplyScalar(o)); };
      const w0 = B === back ? BW : HW, wa = (u) => w0 * Math.pow(1 - Math.min(0.995, u), 1.05), p0 = P(u0, out.s * wa(u0) * 0.5), p1 = P(u0 + du * 0.5, out.s * (wa(u0 + du * 0.5) * 0.95 + out.k * 0.55)), p2 = P(u0 + du, out.s * (wa(u0 + du) + out.k));
      const sb = onyxBlade([[p0.x, p0.y], [p1.x, p1.y], [p2.x, p2.y]], (u) => wd * Math.pow(1 - u, 0.9) + 0.0008, (u) => th * (1 - u * 0.85) + 0.0008, 6, 0.04, r); const ms = part(head, sb.g, m); ms.position.z = z; return { p2, n: V(p2.x - p0.x, p2.y - p0.y, 0).normalize() }; };
    for (let i = 0; i < 5; i++) { const u0 = 0.0 + i * 0.15, k = 1 - i * 0.1, e = shard(back, u0, 0.32, { s: -1, k: 0.07 * k }, 0.085 * k, 0.03 * k, (i % 2 ? 1 : -1) * 0.006, i % 2 ? onyx2 : onyx);
      licks.push([V(e.p2.x * 0.55 + back.C.getPointAt(Math.min(0.99, u0 + 0.12)).x * 0.45, e.p2.y * 0.55 + back.C.getPointAt(Math.min(0.99, u0 + 0.12)).y * 0.45 + head.position.y, 0), V(e.n.x * 0.2, 1, 0).normalize(), (0.2 + r() * 0.1) * k, 0.06 * k]); }
    for (let i = 0; i < 3; i++) { const k = 1 - i * 0.15; shard(hook, 0.02 + i * 0.17, 0.3, { s: 1, k: 0.045 * k }, 0.06 * k, 0.025 * k, (i % 2 ? -1 : 1) * 0.005, i % 2 ? onyx : onyx2); }
    // large angular plates lying on both faces along the curve (the faceted face of the wing)
    for (const s of [-1, 1]) for (const [B, u0, du, wd, th] of [[back, 0.0, 0.45, 0.05, 0.012], [back, 0.3, 0.45, 0.035, 0.01], [hook, 0.0, 0.5, 0.036, 0.01]]) { const tm = B === back ? BT : HT; shard(B, u0, du, { s: B === back ? -1 : 1, k: -0.01 }, wd, th, s * (tm * (1 - (u0 + du * 0.4) * 0.9) + 0.002), r() < 0.5 ? onyx : onyx2); }
    // flame licks up from the core and off the underside toward the point
    for (const s of [-1, 1]) licks.push([V(-0.02, head.position.y + 0.03, s * 0.06), V(-0.15, 1, s * 0.25).normalize(), 0.3, 0.075]);
    for (let i = 0; i < 3; i++) { const u = 0.55 + i * 0.13, p = back.C.getPointAt(u), t = back.C.getTangentAt(u), w = BW * Math.pow(1 - u, 1.05); const q = p.clone().add(V(-t.y, t.x, 0).multiplyScalar(w)); licks.push([q.add(V(0, head.position.y, 0)), V(-0.5, 0.6, 0).normalize(), 0.09, 0.026]); }
    // the blade's glowing edge (molten toward the point) and veins across both faces
    // the molten underside edge: a hot core line and a wide additive glow along the blade's concave edge, brightest toward the point
    { const e = []; for (let i = 0; i <= 18; i++) { const u = 0.18 + 0.82 * i / 18, p = back.C.getPointAt(u), t = back.C.getTangentAt(u), w = BW * Math.pow(1 - u, 1.05) + 0.0012; e.push(p.clone().add(V(-t.y, t.x, 0).multiplyScalar(w * 0.97))); } const ec = new THREE.CatmullRomCurve3(e);
      part(head, new THREE.TubeGeometry(ec, 40, 0.0055, 5, false), hotM, null, null, null, { ink: false, shadow: false }); part(head, new THREE.TubeGeometry(ec, 40, 0.0028, 4, false), new THREE.MeshBasicMaterial({ color: 0xffd27a }), null, null, null, { ink: false, shadow: false });
      part(head, new THREE.TubeGeometry(ec, 40, 0.016, 6, false), new THREE.MeshBasicMaterial({ color: 0xff5a1c, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }), null, null, null, { ink: false, shadow: false }); }
    for (const [B, wm, tm] of [[back, BW, BT], [hook, HW, HT]]) for (const s of [-1, 1]) for (let k = 0; k < 2; k++) { const pts = []; for (let i = 0; i <= 10; i++) { const u = 0.04 + 0.82 * i / 10, p = B.C.getPointAt(u), t = B.C.getTangentAt(u), w = wm * (1 - Math.pow(u, 1.25)), f = (k ? -0.4 : 0.25) + 0.25 * Math.sin(i * 1.7 + k * 2 + s); pts.push(p.clone().add(V(-t.y, t.x, 0).multiplyScalar(w * f)).add(V(0, 0, s * (tm * (1 - u * 0.9) * 0.9 + 0.002)))); }
      vein(head, pts, 0.0022); for (let i = 1; i < 10; i += 2) sites.push([pts[i].clone().add(V(0, head.position.y, 0)), V(-0.3, 0.7, s * 0.6).normalize()]); }
    // the molten ember core where the head meets the handle, both faces, with a glow
    for (const s of [-1, 1]) { part(head, new THREE.OctahedronGeometry(0.018, 0), hotM, [-0.004, 0.004, s * 0.05], null, [1.5, 1.8, 0.45], { ink: false }); part(head, new THREE.OctahedronGeometry(0.01, 0), new THREE.MeshBasicMaterial({ color: 0xffd070 }), [-0.004, 0.004, s * 0.055], null, [1.2, 1.5, 0.4], { ink: false }); }
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: radial('rgba(255,140,60,1)', 'rgba(255,60,20,.25)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); gl.scale.set(0.2, 0.2, 1); gl.position.set(-0.004, 0.004, 0); head.add(gl); px.userData.glow = gl;
    const pl = new THREE.PointLight(0xff5a28, 0.35, 0.8, 2); head.add(pl); px.userData.light = pl;
    { const s0 = sites.length; for (let i = 0; i < s0; i++) { const [p, o] = sites[i]; sites.push([p.clone().add(V((r() - 0.5) * 0.014, 0.006, (r() - 0.5) * 0.014)), o]); } } // two licks per site
    const fl = flamePoints(sites); fl.material.uniforms.uBig.value = 1.3; /* embers */ px.add(fl); const rb = flameRibbons(licks); px.add(rb); px.userData.ribbons = rb; px.userData.fx.push(rb); px.userData.flames = fl; px.userData.veins = veinM; px.userData.fx.push(fl); return px; }
  function makePickaxe(grade, tier) { const key = GRADES[grade] ? grade : 'stick', G = GRADES[key], T = G.tier, px = new THREE.Group(); px.name = 'pickaxe'; px.userData.grade = key; px.userData.fx = []; if (G.stick) return makeStickaxe(px); if (G.onyx) return onyxTint(onyxShard(px, G), tier == null ? onyxTierNow() : tier);
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
  function updatePickFx(pk, t) { if (!pk) return; pk.getWorldQuaternion(_q2); _q2.invert(); const RR = st.explore && typeof M3 !== 'undefined' && M3.renderer ? M3.renderer : R; /* (map fix) size the points for the canvas actually drawing her */ for (const fx of pk.userData.fx) { const u = fx.material.uniforms; u.uTime.value = t * (pk.userData.fl || 1); u.uUp.value.set(0, 1, 0).applyQuaternion(_q2); u.uScale.value = RR ? RR.domElement.height / 2 : 400; }
    if (pk.userData.veins) { if (pk.userData.veinCol) pk.userData.veins.color.copy(pk.userData.veinCol).multiplyScalar(0.9 + 0.1 * Math.sin(t * 5.3 * (pk.userData.fl || 1))); else pk.userData.veins.color.setRGB(1, 0.18 + 0.06 * Math.sin(t * 5.3), 0.07); }
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
        const wn = new THREE.Group(); wn.position.set(-(W / 2 - 0.045), y0 + H * 0.36, zb - 0.05); pk.add(wn); built.winch = wn; wn.userData.grade = 'iron'; /* (Dominic: the one Iron Winch for everyone; no other grades) */
        /* (Art: dark forged iron like the iron pickaxe binding, rust in the recesses, a drum the rope wraps, two bolted side plates, a brass ratchet lever, the gear ink,
           hung from the harness on a short strap so it stands clear of the hip. Two vertex-coloured merged meshes (frame + spinning drum), each with its ink hull) */
        const D = WINCH_DRUM, R = 0.012, FE = 0x55585e, DK = 0x3e4146, BO = 0x6c7077, RU = 0x7a4a2a, RD = 0x5e3a22, BR = 0xb8893a, BK = 0xd8b060, LE = 0x5a3a22, RP = 0xc9a66b, wv = toon(0xffffff, null, { vertexColors: true });
        const F = [];
        for (const sx of [-1, 1]) { const x = sx * 0.026; F.push([rbox(0.008, 0.07, 0.05, 0.003), FE, [x, D.y - 0.004, D.z]]); /* side plate */
          for (const [by, bz] of [[0.024, 0.016], [0.024, -0.016], [-0.03, 0.016], [-0.03, -0.016]]) { F.push([cyl(0.0052, 0.0052, 0.0012, 10), RU, [x + sx * 0.0043, D.y + by, D.z + bz], [0, 0, Math.PI / 2]]); F.push([cyl(0.0034, 0.0034, 0.004, 8), BO, [x + sx * 0.005, D.y + by, D.z + bz], [0, 0, Math.PI / 2]]); } /* bolts, rust round their seats */
          F.push([cyl(0.0068, 0.0068, 0.006, 12), DK, [x + sx * 0.006, D.y, D.z], [0, 0, Math.PI / 2]]); F.push([rbox(0.0018, 0.012, 0.034, 0.0008), RD, [sx * 0.0215, D.y - 0.03, D.z]]); /* axle boss; rust along the inner foot */ }
        F.push([rbox(0.044, 0.01, 0.012, 0.003), FE, [0, D.y + 0.031, D.z - 0.012]], [rbox(0.044, 0.01, 0.014, 0.003), FE, [0, D.y - 0.037, D.z - 0.01]]); /* top cam housing + bottom spacer (outer side, clear of the rope) */
        for (const sx of [-1, 1]) F.push([rbox(0.005, 0.012, 0.016, 0.0015), RU, [sx * 0.0205, D.y + 0.031, D.z - 0.012]], [rbox(0.005, 0.012, 0.016, 0.0015), RU, [sx * 0.0205, D.y - 0.037, D.z - 0.01]]); /* rust in the plate joints */
        F.push([rbox(0.004, 0.036, 0.007, 0.0015), BR, [0.0352, D.y + 0.013, D.z - 0.01], [0.6, 0, 0]], [ell(0.0055, 0.0055, 0.0055, 10, 8), BK, [0.0352, D.y + 0.027, D.z - 0.027]], [rbox(0.005, 0.008, 0.008, 0.002), BR, [0.0352, D.y, D.z]]); /* brass ratchet lever on the right plate */
        F.push([new THREE.TorusGeometry(0.0085, 0.0018, 6, 14), DK, [0, D.y + 0.04, D.z - 0.004], [0, Math.PI / 2, 0]]); /* D-ring on the top housing */
        F.push([rbox(0.016, 0.044, 0.004, 0.0015), LE, [0, 0.022, -0.012], [0.588, 0, 0]], [rbox(0.022, 0.012, 0.007, 0.002), LE, [0, 0.044, 0.002]], [rbox(0.018, 0.004, 0.0055, 0.001), DK, [0, 0.034, -0.0035], [0.588, 0, 0]]); /* the short strap up to the belt, its loop and buckle bar */
        part(wn, mergeVC(F), wv); const dr = new THREE.Group(); dr.position.set(0, D.y, D.z); wn.add(dr); built.winchDrum = dr;
        const G = [[cyl(R, R, 0.036, 14), DK, [0, 0, 0], [0, 0, Math.PI / 2]]]; for (const sx of [-1, 1]) { G.push([cyl(0.0175, 0.0175, 0.004, 14), FE, [sx * 0.019, 0, 0], [0, 0, Math.PI / 2]]); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; G.push([rbox(0.0045, 0.004, 0.004, 0.001), FE, [sx * 0.019, Math.cos(a) * 0.0185, Math.sin(a) * 0.0185], [a, 0, 0]]); } G.push([rbox(0.0016, 0.03, 0.0032, 0.0006), RD, [sx * 0.0212, 0, 0]]); } /* drum + cam flanges with ratchet teeth; a dark spoke shows the spin */
        for (const x of [-0.0075, 0, 0.0075]) G.push([new THREE.TorusGeometry(R + 0.0024, 0.0027, 6, 18), RP, [x, 0, 0], [0, Math.PI / 2, 0]]); /* rope wraps */
        part(dr, mergeVC(G), wv); wn.visible = false; }
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
  const SEQ_T = { pickDraw: 1.35, pickStow: 1.35, climbDraw: 1.0, climbStow: 1.0 }, TOOL_T = 2.2, RUN_T = 0.62, WALK_T = 1.05, MINE_T = 1.7, SWING_VIS_MAX = 1.5, MINE_SPIKE = 1, MINE_GRIP = -0.255;
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
    if (C.slotT >= 1) { if (C.mv) C.L[C.mv] = C.to; if (C.mv2) C.L[C.mv2] = C.to2; C.mv = null; C.mv2 = null; C.P.copy(C.bt); C.slotT = Math.min(C.slotT - 1, 0.5);
      if (st.climbAuto) { C.wt -= CL.TS; if (C.wt <= 0) { const ks = Object.keys(DIRS).filter((k) => k !== 'stop').filter((k) => { const d = DIRS[k]; return Math.abs(C.P.x + d[0] * 0.8) < CL.BX && C.P.y + d[1] * 0.8 > CL.BY0 - 0.01 && C.P.y + d[1] * 0.8 < CL.BY1; });
        st.climbDir = Math.random() < 0.1 ? 'stop' : ks[(Math.random() * ks.length) | 0] || 'u'; C.wt = 2.5 + Math.random() * 2.5; markClimb(); } }
      const dv = DIRS[st.climbDir] || DIRS.stop, PR = !!st.explore, s = V(dv[0] * CL.SH * (PR ? 1.3 : 1), dv[1] * CL.SV * (PR ? 1.5 : 1), 0); // Explore: longer reaches, and diagonal pairs (a pick with the opposite foot) move together
      let blk = ''; if (Math.abs(C.P.x + s.x * 0.25) > CL.BX) { s.x = 0; blk = 'side'; } if (C.P.y + s.y * 0.25 < CL.BY0) { s.y = 0; blk = 'bottom'; } else if (C.P.y + s.y * 0.25 > CL.BY1) { s.y = 0; blk = 'top'; } C.blk = blk; C.bf = C.P.clone(); C.bt = C.P.clone();
      if (s.lengthSq() > 1e-6) { const ord = gaitOrder(dv[0], dv[1]), sl = s.length(), sn = s.clone().divideScalar(sl), Pn = C.P.clone().addScaledVector(s, PR ? 0.5 : 0.25);
        // the limb furthest behind moves first if it is near its reach limit, else the gait order
        let k = ord[C.idx % 4], worst = 0; for (const q of ord) { const lag = -relOf(q, C.L[q], Pn).dot(sn) / sl; if (lag > 0.62 && lag > worst) { worst = lag; k = q; } } C.idx += PR ? 2 : 1;
        const tg = C.P.clone().add(CL.N[k]).addScaledVector(s, 0.75); if (isH(k)) { tg.add(CL.tipH); tg.x = k === 'RH' ? Math.min(tg.x, C.P.x - 0.21) : Math.max(tg.x, C.P.x + 0.21); } C.mv = k; C.from = C.L[k].clone(); C.to = snapHold(isH(k) ? HG.hand : HG.foot, tg);
        if (PR) { const k2 = { RH: 'LF', LH: 'RF', RF: 'LH', LF: 'RH' }[k], t2 = C.P.clone().add(CL.N[k2]).addScaledVector(s, 0.75); if (isH(k2)) { t2.add(CL.tipH); t2.x = k2 === 'RH' ? Math.min(t2.x, C.P.x - 0.21) : Math.max(t2.x, C.P.x + 0.21); } C.mv2 = k2; C.from2 = C.L[k2].clone(); C.to2 = snapHold(isH(k2) ? HG.hand : HG.foot, t2); }
        let ok = true; for (const q of ['RH', 'LH', 'RF', 'LF']) { if (q === k || q === C.mv2) continue; const r = relOf(q, C.L[q], Pn); if (Math.abs(r.x) > 0.3 || Math.abs(r.y) > 0.34 || (isH(q) && (q[0] === 'L' ? r.x : -r.x) < (st.explore ? -0.11 : -0.05))) ok = false; } if (ok) C.bt = Pn; else if (s.y < 0 && C.P.y < 1.3) C.blk = 'bottom'; } }
    const u = C.slotT, P = C.bf.clone().lerp(C.bt, ss(0.3, 0.95, u)), out = { P, H: {}, F: {}, mv: C.mv, mu: 0, up: 0, blk: C.blk || '' };
    for (const k of ['RH', 'LH', 'RF', 'LF']) { let h = C.L[k], sn = 0, a = 0, m = 0; if (k === C.mv || k === C.mv2) { const two = k === C.mv2, fr = two ? C.from2 : C.from, to = two ? C.to2 : C.to; m = clamp(u / 0.62, 0, 1); h = fr.clone().lerp(to, ss(0.12, 0.88, m)); sn = Math.sin(Math.PI * m); if (!two) { out.mu = m; out.up = to.y - fr.y; }
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
    else if (T.k === 'clip' && T.t >= 0.35) { T.k = 'anchored'; T.t = 0; if (T.auto) { T.next = T.auto; T.auto = null; T.k = 'prep'; T.free = true; } } // the Rappel button: straight on into the rappel
    else if (T.k === 'prep' && Q && !Q.seq && Q.held === 'none') { T.k = T.next; T.t = 0; T.pose = true; T.bw = 0; T.h = 0; T.y0 = undefined; }
    else if (T.k === 'coil' && T.t >= TV.coilT) { T.k = 'draw'; T.t = 0; T.free = false; T.clipped = false; }
    else if (T.k === 'draw' && Q && !Q.seq && Q.held === 'climb') { if (T.ground) { an.tv = null; markTether(); dismount(T.P); return; } an.cl = climbInit(T.P); an.tv = null; markTether(); return; }
    if (T.k === 'coil' && T.t > 0.3) T.pin = false; if (T._mk !== T.k + T.clipped) { T._mk = T.k + T.clipped; markTether(); } }
  /* ---------- on the ground at the foot of the wall: step off, walk with the pad (run cycle, smooth turns), walk back into the wall to climb again ---------- */
  const DMAX = 40; // max zoom-out distance (frames the whole wall and the field)
  const GW = { spd: 3.7, walk: 1.2, back: 0.45, X0: -21, X1: 21, Z0: -24, turn: 9 }, WX0 = WALL.X0 + 0.5, WX1 = WALL.X1 - 0.5; // the ground is a big field in front of (and wider than) the wall
  function dismount(P) { st.gnd = st.ledge && LP.on ? Object.assign(lpWalker(P.x, 0, 0), { back: GW.back, vx: 0, vz: 0 }) : { x: P.x, z: 0, face: 0, mv: 0, back: GW.back, vx: 0, vz: 0 }; an.cl = climbInit(V(P.x, 0, 0)); an.tv = null; an.gb = 0; st.climbDir = 'stop'; st.climbAuto = false; st.tvK = null; st.climbBlk = ''; markTether(); markClimb(); const nt = document.querySelector('#charClimb .cnote'); if (nt) nt.textContent = 'On the ground: tap to move, tap the wall to climb'; if (st.pg) { st.gnd.back = 0.25; }  markTether(); }

  /* ---------- tap-to-move path planning: grid A* (8-directional, no corner cutting) over a walkability grid of the bounds minus the solid
     obstacles (inflated by her body radius + clearance), then string-pulled with exact segment-vs-circle line of sight (any-angle, so the path is
     the true shortest route around things in any direction). The walker follows it with a look-ahead carrot and smoothed heading (curved turns). */
  const BODY = 0.2, NAVC = 0.15; // body radius (also used by the push-out) and extra planning clearance for the curved follow
  function navObs(G) { return G && (G.home || G.ledge) ? (G.obs || []) : FIELD_OBS; }
  function navBounds(G) { const B = G && G.bnd; return B ? { X0: B.X0, X1: B.X1, Z0: B.Z0, Z1: B.Z1 } : { X0: GW.X0, X1: GW.X1, Z0: GW.Z0, Z1: -0.12 }; }
  function segClear(ax, az, bx, bz, obs, pad) { const vx = bx - ax, vz = bz - az, L2 = vx * vx + vz * vz; for (const o of obs) { let t = L2 > 1e-9 ? ((o.x - ax) * vx + (o.z - az) * vz) / L2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t; const dx = ax + vx * t - o.x, dz = az + vz * t - o.z, rr = o.r + pad; if (dx * dx + dz * dz < rr * rr) return false; } return true; }
  function navPlan(G, sx, sz, tx, tz) { const obs = navObs(G), B = navBounds(G), h = G && G.cell ? G.cell : G && G.home ? 0.1 : 0.25, pad = BODY + NAVC;
    tx = clamp(tx, B.X0, B.X1); tz = clamp(tz, B.Z0, B.Z1); const nx = Math.max(2, Math.ceil((B.X1 - B.X0) / h) + 1), nz = Math.max(2, Math.ceil((B.Z1 - B.Z0) / h) + 1), cx = (i) => Math.min(B.X1, B.X0 + i * h), cz = (j) => Math.min(B.Z1, B.Z0 + j * h);
    const near = obs.filter((o) => o.x > B.X0 - o.r - pad && o.x < B.X1 + o.r + pad && o.z > B.Z0 - o.r - pad && o.z < B.Z1 + o.r + pad), free = new Uint8Array(nx * nz);
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const x = cx(i), z = cz(j); let f = 1; for (const o of near) { const dx = x - o.x, dz = z - o.z, rr = o.r + pad; if (dx * dx + dz * dz < rr * rr) { f = 0; break; } } if (f && G && G.inb && !G.inb(x, z)) f = 0; free[i * nz + j] = f; }
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
    let GE = GI, ex = gx, ez = gz, sn = snapped; if (!found) { let bd = 1e9; for (let n = 0; n < N; n++) if (closed[n]) { const d = H((n / nz) | 0, n % nz) + gs[n] * 1e-3; if (d < bd) { bd = d; GE = n; } } if (!closed[GE]) return null; ex = cx((GE / nz) | 0); ez = cz(GE % nz); sn = true; if (GE === S0) return { pts: [{ x: sx, z: sz }], goal: { x: sx, z: sz }, snapped: true, h }; }
    const raw = []; for (let n = GE; n !== -1; n = par[n]) raw.push({ x: cx((n / nz) | 0), z: cz(n % nz) }); raw.reverse(); raw[0] = { x: sx, z: sz }; raw[raw.length - 1] = { x: ex, z: ez };
    // string pulling: from each kept point jump to the farthest later point still in clear line of sight
    const out = []; let a = 0; while (a < raw.length - 1) { let b = raw.length - 1; while (b > a + 1 && !segClear(raw[a].x, raw[a].z, raw[b].x, raw[b].z, near, pad - 0.02)) b--; out.push(raw[b]); a = b; }
    return { pts: out, goal: { x: ex, z: ez }, snapped: sn, h }; }
  function pathLen(sx, sz, pts) { let L = 0, px = sx, pz = sz; for (const q of pts) { L += Math.hypot(q.x - px, q.z - pz); px = q.x; pz = q.z; } return L; }
  // walk there: plan, then hand the walker the path; done() runs on arrival (at the snapped goal if the tap was inside something)
  const STALL_T = 0.7; // s without getting closer to the goal before she gives up and stands still (blocked by a wall / obstacle)
  function navTo(G, x, z, done) { const P = navPlan(G, G.x, G.z, x, z); G.gBest = 1e9; G.stall = 0; if (!P) { G.path = null; G.goal = { x: G.x, z: G.z, done }; return null; } G.path = P.pts.slice(); G.pi = 0; G.goal = { x: P.goal.x, z: P.goal.z, done }; return P; }
  // the look-ahead point on the remaining path (pure pursuit): her heading eases toward it, so corners become curves
  function navCarrot(G, L) { const P = G.path; while (G.pi < P.length - 1 && Math.hypot(P[G.pi].x - G.x, P[G.pi].z - G.z) < L * 0.6) G.pi++;
    let px = G.x, pz = G.z, rem = L; for (let i = G.pi; i < P.length; i++) { const q = P[i], d = Math.hypot(q.x - px, q.z - pz); if (d >= rem || i === P.length - 1) { const t = d > 1e-6 ? Math.min(1, rem / d) : 1; return { x: px + (q.x - px) * t, z: pz + (q.z - pz) * t }; } rem -= d; px = q.x; pz = q.z; } return P[P.length - 1]; }
  function groundTick(dt) { const G = st.gnd; let dx = 0, dz = 0;
    if (G.back > 0) { const s2 = Math.min(G.back, dt * 0.625); G.z -= s2; G.back -= s2; G.mv = 0; if (G.back <= 0 && st.pg && st.pg.ph === 'down') pgGround(); return; } // step back off the wall onto both feet
    if (st.pg && st.pg.ph === 'down') pgGround();
    if (G.goal && !G.goal.fit) { const g = G.goal, Bd = G.bnd || { X0: GW.X0, X1: GW.X1, Z0: GW.Z0, Z1: 0 }; g.x = clamp(g.x, Bd.X0, Bd.X1); g.z = clamp(g.z, Bd.Z0, Bd.Z1); if (G.circR) { const L2 = Math.hypot(g.x, g.z); if (L2 > G.circR) { g.x *= G.circR / L2; g.z *= G.circR / L2; } } for (const o of navObs(G)) { const ex = g.x - o.x, ez = g.z - o.z, L = Math.hypot(ex, ez), rr = o.r + BODY + 0.005; if (L < rr) { const k = L > 1e-4 ? rr / L : 0; g.x = L > 1e-4 ? o.x + ex * k : o.x + rr; g.z = L > 1e-4 ? o.z + ez * k : g.z; } } g.fit = true; } // a goal she cannot stand on moves to the nearest spot she can
    if (G.goal) { const ex = G.goal.x - G.x, ez = G.goal.z - G.z, L = Math.hypot(ex, ez); if (L < 0.03) { const g2 = G.goal; G.goal = null; G.path = null; G.mv = Math.min(G.mv, 0.1); if (g2.done) g2.done(); } else if (G.path && G.path.length > 1 && L > 0.25) { const lk = 0.6, c = navCarrot(G, lk), cx2 = c.x - G.x, cz2 = c.z - G.z, cl = Math.hypot(cx2, cz2) || 1; dx = cx2 / cl; dz = cz2 / cl; } else { dx = ex / L; dz = ez / L; } }
    else { const d = DIRS[st.climbDir] || DIRS.stop; dx = d[0]; dz = d[1]; }
    const want = Math.hypot(dx, dz) > 0.01 ? 1 : 0; G.mv += (want - G.mv) * (1 - Math.exp(-dt * 8));
    if (want) { const fa = Math.atan2(dx, dz); let df = fa - G.face; df = Math.atan2(Math.sin(df), Math.cos(df)); G.face += df * (1 - Math.exp(-dt * GW.turn)); }
    let sp = GW.spd /* always at a run */ * (G.spdK || 1) * G.mv * (want ? Math.max(0.25, Math.cos(Math.min(1.4, Math.abs(Math.atan2(Math.sin(Math.atan2(dx, dz) - G.face), Math.cos(Math.atan2(dx, dz) - G.face)))))) : 1), nx = G.x + (want ? dx : Math.sin(G.face)) * sp * dt * (want || G.mv > 0.02 ? 1 : 0), nz = G.z + (want ? dz : Math.cos(G.face)) * sp * dt * (want || G.mv > 0.02 ? 1 : 0);
    { const gL0 = G.goal && want ? Math.hypot(G.goal.x - G.x, G.goal.z - G.z) : 0; if (gL0 && !(G.path && G.path.length > 1 && gL0 > 0.25) && Math.hypot(nx - G.x, nz - G.z) >= gL0) { nx = G.goal.x; nz = G.goal.z; } } // never overshoot the goal on a long frame (that see-saws her back and forth)
    const Bd = G.bnd || { X0: GW.X0, X1: GW.X1, Z0: GW.Z0, Z1: 0 }, px0 = G.x, pz0 = G.z; G.x = clamp(nx, Bd.X0, Bd.X1); G.z = clamp(nz, Bd.Z0, Bd.Z1); for (const o of navObs(G)) { const ex = G.x - o.x, ez = G.z - o.z, L = Math.hypot(ex, ez), rr = o.r + BODY; if (L < rr && L > 1e-4) { G.x = o.x + ex / L * rr; G.z = o.z + ez / L * rr; } } if (G.circR) { const L2 = Math.hypot(G.x, G.z); if (L2 > G.circR) { G.x *= G.circR / L2; G.z *= G.circR / L2; } } G.vel = dt > 0 ? Math.hypot(G.x - px0, G.z - pz0) / dt : 0;
    if (G.goal && want && dt > 0) { if (G.gObj !== G.goal) { G.gObj = G.goal; G.gBest = 1e9; G.stall = 0; } const gL = Math.hypot(G.goal.x - G.x, G.goal.z - G.z); if (gL < (G.gBest ?? 1e9) - 0.01) { G.gBest = gL; G.stall = 0; } else if (!G.noStall && (G.stall = (G.stall || 0) + dt) > STALL_T) { const g2 = G.goal; G.goal = null; G.path = null; G.stalled = (G.stalled || 0) + 1; if (g2.done) g2.done(); } }
    if (!G.home && want && dz > 0.3 && G.z >= -0.02 && G.x > WX0 && G.x < WX1 && (!G.ledge || Math.abs(G.x) <= LP.BX) && Math.abs(Math.atan2(Math.sin(G.face), Math.cos(G.face))) < 0.9) { if (!st.play || (!an.eq.seq && an.eq.held === 'climb')) mount(); else { st.wantClimb = true; G.z = Math.min(G.z, -0.02); } } else if (st.wantClimb && !(st.pg && st.pg.wall)) st.wantClimb = false; }
  /* ---------- Playground: tap the ground to run there, tap the wall to run to its foot, mount and climb to the spot ---------- */
  let PGM = null; const _ray = new THREE.Raycaster();
  function pgMark(hit) { if (!PGM) { PGM = new THREE.Group(); const m = new THREE.MeshBasicMaterial({ color: 0xfff1c2, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }); PGM.add(new THREE.Mesh(new THREE.RingGeometry(0.07, 0.1, 32), m), new THREE.Mesh(new THREE.CircleGeometry(0.025, 16), m)); PGM.userData.m = m; PGM.renderOrder = 5; scene.add(PGM); }
    PGM.visible = !!hit; if (!hit) return; if (st.ledge && LP.on) { PGM.position.copy(lpF2W(hit.wall ? V(hit.x, hit.y, CL.ZW - 0.012) : V(hit.x, 0.006, hit.z))); PGM.rotation.set(hit.wall ? 0 : -Math.PI / 2, hit.wall ? st.yaw : 0, 0, 'YXZ'); PGM.userData.t = 0; PGM.userData.m.opacity = 0.9; return; } const wl = st.home || st.tree ? { rotation: { y: 0 } } : WALLG; PGM.position.copy(hit.wall ? V(hit.x, hit.y, CL.ZW - 0.012) : V(hit.x, (hit.y || 0) + 0.006, hit.z)).applyAxisAngle(V(0, 1, 0), wl ? wl.rotation.y : st.yaw); PGM.rotation.set(hit.wall ? 0 : -Math.PI / 2, hit.wall ? (wl ? wl.rotation.y : st.yaw) : 0, 0, 'YXZ'); PGM.userData.t = 0; PGM.userData.m.opacity = 0.9; }
  function pgFade(dt) { if (!PGM || !PGM.visible) return; const m = PGM.userData.m; if (st.pg) { PGM.scale.setScalar(1 + 0.12 * Math.sin(clk * 6)); return; } PGM.userData.t += dt; m.opacity = 0.9 * Math.max(0, 1 - PGM.userData.t / 0.8); if (PGM.userData.t > 0.8) PGM.visible = false; }
  function pgScreen(h) { const wl = WALLG, q = (h.wall ? V(h.x, h.y, CL.ZW) : V(h.x, 0, h.z)).applyAxisAngle(V(0, 1, 0), wl ? wl.rotation.y : st.yaw).project(cam), r = canvas.getBoundingClientRect(); return { x: r.left + (q.x + 1) / 2 * r.width, y: r.top + (1 - q.y) / 2 * r.height }; }
  // screen point -> wall-frame hit: { wall: true, x, y } on the climbing wall, or { x, z } on the ground in front of it
  function pgPick(cx, cy) { const r = canvas.getBoundingClientRect(), nd = new THREE.Vector2((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); _ray.setFromCamera(nd, cam);
    const yw = WALLG ? WALLG.rotation.y : st.yaw, o = _ray.ray.origin.clone().applyAxisAngle(V(0, 1, 0), -yw), d = _ray.ray.direction.clone().applyAxisAngle(V(0, 1, 0), -yw);
    if (d.z > 1e-4) { const t = (CL.ZW - o.z) / d.z, q = o.clone().addScaledVector(d, t); if (t > 0 && q.y > 0.05 && q.y < CL.BY1 + 1.2 && q.x > WX0 && q.x < WX1) return { wall: true, x: q.x, y: q.y }; }
    if (d.y < -1e-4) { const t = -o.y / d.y, q = o.clone().addScaledVector(d, t); if (t > 0 && q.z <= CL.ZW && q.z > GW.Z0 - 0.6 && Math.abs(q.x) < GW.X1 + 0.6) return { x: clamp(q.x, GW.X0, GW.X1), z: clamp(q.z, GW.Z0, -0.2) }; }
    return null; }
  function pgGo(hit) { if (!(st.play || st.anim === 'climb') || (st.ledge && !LP.on) || !hit) return false; pgMark(hit); if (st.gnd) st.gnd.mine = false; const bx = st.ledge ? LP.BX : WX1; st.pg = hit.wall ? { wall: true, x: clamp(hit.x, -bx, bx), y: clamp(hit.y - 1.1, 0, CL.BY1), ph: 'run' } : { x: hit.x, z: hit.z, ph: 'run', mine: !!hit.mine }; const P = st.pg; st.climbAuto = false;
    if (st.gnd) pgGround(); else if (an.tv) P.ph = 'unclip'; else if (an.act === 'climb') { if (P.wall) P.ph = 'climb'; else P.ph = 'down'; } st.lastInput = clk; return true; }
  function pgGround() { const P = st.pg, G = st.gnd; if (!P || !G) return; G.back = 0; P.ph = 'run'; if (!P.wall) navTo(G, P.x, P.z, () => { if (st.pg === P) { st.pg = null; P.ph = 'done'; if (P.mine && st.gnd) { st.gnd.face = 0; st.gnd.mine = true; } } });
    else { const bx = wallBase(P.x); navTo(G, bx, -0.3, () => { if (st.pg !== P || !st.gnd) return; st.gnd.path = null; st.gnd.goal = { x: bx, z: 0, done: () => { if (st.pg !== P || !st.gnd) return; st.gnd.face = 0; P.ph = 'draw'; } }; }); } }
  // the reachable foot of the wall nearest below a tapped spot: the closest x along the base whose step-up strip is clear of obstacles
  function wallBase(x) { const G = st.gnd, lp = !!(G && G.ledge), X0 = lp ? -LP.BX : WX0, X1 = lp ? LP.BX : WX1, ob = lp ? G.obs : FIELD_OBS; x = clamp(x, X0, X1); const ok = (q) => q >= X0 && q <= X1 && segClear(q, -0.3, q, 0, ob, BODY + 0.05); for (let d = 0; d < 12; d += 0.1) { if (ok(x - d)) return x - d; if (ok(x + d)) return x + d; } return x; }
  // while climbing toward a tapped wall spot (or down to the ground for a ground tap), steer the pad one slot at a time
  function pgClimb(C) { const P = st.pg; if (!P || an.tv) return; let k = 'stop'; if (P.ph === 'unclip' || P.ph === 'run') P.ph = P.wall ? 'climb' : 'down';
    if (P.ph === 'climb') { const dx = P.x - C.P.x, dy = P.y - C.P.y, L = Math.hypot(dx, dy); if (L < 0.2 || (P.bt = C.blk ? (P.bt || 0) + 1 : 0) > 45 || (P.last && DIRS[P.last][0] * dx + DIRS[P.last][1] * dy < -0.02)) { st.pg = null; P.ph = 'done'; } else { let best = -2; for (const q in DIRS) { if (q === 'stop') continue; const v = DIRS[q], dd = (v[0] * dx + v[1] * dy) / L / Math.hypot(v[0], v[1]); if (dd > best) { best = dd; k = q; } } if (C.mu < 0.05) P.last = k; } }
    else if (P.ph === 'down') { k = 'd'; if (st.gnd) { P.ph = 'run'; pgGround(); return; } }
    if (st.climbDir !== k) { st.climbDir = k; markClimb(); } }
  function mount() { const G = st.gnd; st.gnd = null; st.wantClimb = false; an.cl = climbInit(V(G.x, 0, 0)); an.act = 'climb'; an.at = 0; an.mw = 0.6; if (!(st.climbDir in DIRS) || st.climbDir === 'stop' || /^d/.test(st.climbDir)) st.climbDir = 'stop'; st.climbDir = /^u/.test(st.climbDir) ? st.climbDir : 'stop'; markClimb(); const nt = document.querySelector('#charClimb .cnote'); if (nt) nt.textContent = ''; if (G.onMount) G.onMount(); if (st.pg) { if (st.pg.wall) { st.pg.ph = 'climb'; st.climbDir = 'stop'; } else st.pg = null; }  markTether(); }
  function tetherAct(k) { const kk = k; if ((an.act !== 'climb' && st.anim !== 'climb') || st.gnd) return; const P = an.cl ? an.cl.P.clone() : V(0, 0, 0); let T = an.tv; st.climbAuto = false; st.climbDir = 'stop'; markClimb(); const g = rig && rig.built.tethers && rig.built.tethers[0] && rig.built.tethers[0].grp, fac = CLIMB_LOCK.teth;
    if (k === 'anchor' && T && T.clipped) k = 'unanchor'; // once clipped, the Anchor button reads Unanchor
    if (k === 'unanchor') { if (!T || !T.clipped || T.k === 'coil' || T.k === 'draw') return;
      if (!T.pose) { T.pin = false; an.tv = null; if (!an.cl) an.cl = climbInit(T.P); markTether(); return; } // still on the picks: just unclip and carry on climbing
      T.k = 'coil'; T.t = 0; T.unanchor = true; markTether(); return; } // on the rope: coil the line from where she hangs, then back onto the picks right here
    // (Dominic) one Rappel button: from the picks it drives the pin, clips and stows (the anchor sequence) and then rappels on its own; Stop hangs her on the rope
    if (k === 'go') { if (!T) k = 'anchor'; else if (T.k === 'anchored' || T.k === 'hang') k = 'rappel'; else return; }
    if (k === 'stop') { if (T && (T.k === 'anchor' || T.k === 'clip')) T.auto = null; /* stopped mid-anchor: stays clipped on the picks */ if (T && (T.k === 'rappel' || T.k === 'ascend' || T.k === 'prep')) { if (T.k === 'prep') { T.k = 'anchored'; T.free = false; } else { T.k = 'hang'; T.h = 0; T.y0 = undefined; T.D = 0; T.pair = true; } } markTether(); return; }
    if ((k === 'rappel' || k === 'ascend') && T && T.k === k) { if (T.pair) return tetherAct('stop'); if (kk !== 'go') return tetherAct('stop'); return; } // tapping the running action again stops on the rope
    if (k === 'anchor') { if (T) return; an.tv = { k: 'anchor', t: 0, A: V(clamp(P.x - 0.42, WALL.X0 + 0.2, WALL.X1 - 0.2), P.y + 1.02, 0), P, fac, depth: 1, auto: kk === 'go' ? 'rappel' : null }; }
    else if (k === 'rappel' || k === 'ascend') { if (!T || !T.clipped || T.k === 'coil' || T.k === 'draw' || T.k === 'anchor') return; T.fac = fac;
      if (k === 'ascend' && T.P.y >= T.A.y - TV.top - 1e-3) return;
      if (T.pose) { T.k = k; T.t = 0; T.h = 0; T.y0 = undefined; T.D = 0; } else { T.k = 'prep'; T.next = k; T.free = true; T.t = 0; } }
    markTether(); }
  // the Rappel slot (#charClimb .tvb): climbing -> [Rappel]; anchoring / rappelling -> [Stop]; stopped on the rope -> [Ascend][Rappel] (each runs on its own, tap it again to stop)
  function tvMode() { const T = an.tv; if (st.gnd || (an.act !== 'climb' && st.anim !== 'climb')) return 'off'; if (!T) return 'go'; if (T.k === 'coil' || T.k === 'draw') return 'busy';
    if (T.k === 'anchored' && !T.pose) return 'go'; if (T.pair && (T.k === 'hang' || T.k === 'rappel' || T.k === 'ascend' || T.k === 'prep')) return 'pair'; return T.k === 'hang' ? 'pair' : 'stop'; }
  function markTether() { const box = document.querySelector('#charClimb .tvb'); if (!box) return; const T = an.tv, m = tvMode(), on = (k) => !!T && (T.k === k || (T.k === 'prep' && T.next === k)), key = m + (m === 'pair' ? (on('ascend') ? 'A' : on('rappel') ? 'R' : '') : '');
    const os = document.querySelector('#charClimb [data-dir="stop"]'); if (os) os.style.display = (m === 'stop' || m === 'pair' || m === 'busy') ? 'none' : ''; // (Dominic) the old Stop hides while she's on the rope (the Rappel slot has its own Stop)
    st.tvMode = m; if (box.dataset.m === key) return; box.dataset.m = key;
    box.innerHTML = m === 'stop' ? '<button data-tv="stop" class="on" title="Stop and hang on the rope">Stop</button>'
      : m === 'pair' ? `<div class="tvp"><button data-tv="ascend" class="${on('ascend') ? 'on' : ''}" title="Winch back up to the anchor (tap again to stop)">Ascend</button><button data-tv="rappel" class="${on('rappel') ? 'on' : ''}" title="Rappel down (tap again to stop)">Rappel</button></div>`
      : `<button data-tv="go" class="${m === 'go' ? '' : 'dis'}" title="Anchor the Tether and rappel down">Rappel</button>`; }
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
    W2.updateMatrixWorld(true); const top = W2.localToWorld(V(T.A.x, T.A.y - 0.03, CL.ZW - 0.072)), wn = c.built.winch; let end = wn ? wn.localToWorld(V(0, WINCH_DRUM.y + 0.03, WINCH_DRUM.z + 0.0146)) : B.hips.localToWorld(V(0, 0.06, 0.15)), bot = wn ? wn.localToWorld(V(0, WINCH_DRUM.y - 0.03, WINCH_DRUM.z + 0.0146)) : end.clone(); /* (the rope runs tangent to the drum's inner face, over the wraps) */
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
      const sh = 0.75 + r() * 0.4, tc = rig && rig.built && rig.built.pick && rig.built.pick.userData.sparkRGB; DEB.col.set(spk ? (tc ? [Math.min(1, tc.r + r() * 0.08), Math.min(1, tc.g + r() * 0.08), Math.min(1, tc.b + r() * 0.08)] : [1, 0.82 + r() * 0.15, 0.45]) : [0.42 * sh, 0.3 * sh, 0.2 * sh], i * 3); DEB.life[i] = 1; DEB.rate[i] = spk ? 2.6 + r() * 1.5 : 1.3 + r() * 0.6; DEB.size[i] = spk ? 0.009 + r() * 0.006 : 0.016 + r() * 0.018; }
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
    if (!an.eq) an.eq = { held: st.tool === 'climb' ? 'climb' : st.tool === 'none' ? 'none' : 'pick', seq: null, t: 0 };
    { const Q = an.eq, wantT = an.tv && an.tv.free ? 'none' : st.play ? (st.gnd && st.gnd.mine ? 'pick' : st.gnd && !st.wantClimb && !(st.pg && st.pg.ph === 'draw') ? st.tool : 'climb') : st.tool; if (!Q.seq && Q.held !== wantT) { Q.seq = Q.held === 'pick' ? 'pickStow' : Q.held === 'climb' ? 'climbStow' : wantT === 'pick' ? 'pickDraw' : 'climbDraw'; Q.t = 0; }
      if (Q.seq) { Q.t += dt / SEQ_T[Q.seq]; if (Q.t >= 1) { const dn = Q.seq; Q.seq = null; Q.t = 0; Q.held = /Stow$/.test(dn) ? 'none' : dn === 'pickDraw' ? 'pick' : 'climb'; if (Q.held === 'none' && wantT !== 'none') { Q.seq = wantT === 'pick' ? 'pickDraw' : 'climbDraw'; } } }
      st.toolPh = Q.seq ? 1.1 : Q.held === 'climb' ? TOOL_T : 0; st.toolSeq = Q.seq; f.eq = { held: Q.held, seq: Q.seq, t: Q.t }; }
    // Playground: at the wall foot she draws the climbing picks, then mounts (a wall tap, or walking into the wall)
    if (st.gnd && !st.gnd.home && !an.eq.seq && an.eq.held === 'climb') { if (st.pg && st.pg.ph === 'draw') { st.gnd.face = 0; st.pg.ph = 'climb'; mount(); st.climbDir = 'stop'; } else if (st.wantClimb) mount(); }
    const ready = (k) => !an.eq.seq && an.eq.held === k, switching = !ready(st.play ? an.eq.held : st.tool) && !an.tv; if (switching && an.fid) { an.fid = null; st.fidget = null; an.next = t + 3; }
    const exC = st.gnd && st.gnd.exC; if (exC) st.gnd.mv = 0; else if (st.gnd) groundTick(dt); /* Explore rock face: the walker stops; the wall-climb gait below carries her */ const want = st.gnd ? (exC ? (ready('climb') ? 'climb' : null) : st.gnd.mv > 0.15 ? 'run' : st.gnd.mine && ready('pick') ? 'mine' : null) : st.anim === 'run' || (st.anim === 'mine' && ready('pick')) || (st.anim === 'climb' && (ready('climb') || !!an.tv)) ? st.anim : null; if (want !== an.act) { an.mw = Math.max(0, (an.mw || 0) - dt / 0.22); if (an.mw <= 0 || !an.act) { an.act = want; an.at = 0; an.rp = 0; an.mw = 0; an.mp = undefined; } } else if (an.act) an.mw = Math.min(1, (an.mw || 0) + dt / 0.25);
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
    if (an.act === 'run') { const gk = an.gk = an.gk === undefined ? 1 : an.gk + (1 - an.gk) * (1 - Math.exp(-dt * 6)), Sg = lerp(GAIT.walk.S, GAIT.run.S, gk), vg = st.gnd ? (st.gnd.vel || 0) : lerp(GAIT.walk.v, GAIT.run.v, gk); an.rp = ((an.rp || 0) + vg * dt / Sg) % 1; st.gaitV = vg;
      const ph = an.rp, s1 = Math.sin(TAU * ph), w0 = mw, w = w0 * gk, ww = w0 * (1 - gk); f.run = { ph, w: w0, k: gk }; st.runPh = ph; st.gaitK = gk;
      // walk (ww): hips highest over the planted leg at mid-stance and lowest in double support (subtle bob), pelvis yaws forward with the swinging leg,
      // the swing-side hip drops a little while the hips shift over the stance foot, shoulders counter-rotate and the head stays level and forward
      const c1 = Math.cos(TAU * ph), cm = Math.cos(TAU * (ph - 0.3));
      hy += ww * (-0.045 + 0.017 * Math.cos(2 * TAU * (ph - 0.3))); hz += ww * 0.012; leanS += ww * 0.04; cx += ww * 0.03; hipY -= ww * 0.12 * c1; cry += ww * 0.1 * c1; hry -= ww * 0.08 * c1;
      hrz += ww * 0.055 * cm; hx += ww * 0.016 * cm; crz -= ww * 0.02 * cm; hrzH -= ww * 0.02 * cm; hrx -= ww * 0.04; hipX += ww * 0.03;
      // run (w): low over the flexed stance leg, high in the flight phase; strong forward lean from the hips, pelvis + shoulder counter-rotation
      hy += w * (-0.06 + 0.035 * Math.cos(2 * TAU * (ph - 0.42))); hz += w * 0.035; leanS += w * 0.26; cx += w * 0.15; hipX += w * 0.06; hipY -= w * 0.13 * c1; cry += w * 0.2 * c1; hry -= w * 0.12 * c1; hrz += w * 0.03 * cm; crz -= w * 0.02 * cm;
      hrx -= w * 0.3; nrx -= w * 0.07; pickY += w * 0.012 * Math.cos(2 * TAU * ph); pickRx += w * 0.05 * Math.sin(2 * TAU * ph); shY += w * 0.008 * Math.cos(2 * TAU * ph); }
    if (an.act === 'mine') { const pg = c.built.pick && GRADES[c.built.pick.userData.grade], sf0 = 1 + 0.15 * (pg && pg.tier > 0 ? pg.tier : 0) / 7; const oreN = (typeof Explore !== 'undefined' && Explore.ORE && Explore.ORE.mining) ? Explore.ORE.mining.type : null; const sf = sf0 * (oreN && typeof Skills !== 'undefined' ? Skills.levelSpeedBonus(Skills.level('mining'), Skills.oreUnlock(oreN)) : 1); const sfv = Math.min(sf, SWING_VIS_MAX); an.mp = ((an.mp ?? an.at / MINE_T) + dt * sfv / MINE_T); st.mineFac = sf; st.mineRep = sf / sfv; /* (the swing is drawn at most SWING_VIS_MAX x; Explore lands the rest as extra strikes) */ const um = an.mp % 1, k = mineKey(um), w = mw; f.mine = Object.assign(k, { w, u: um }); st.minePh = um;
      if (an.mu !== undefined && an.mu < 0.52 && um >= 0.52 && w > 0.9) an.hit = true; an.mu = um;
      leanS += w * k.lean * 0.45; cx += w * k.lean * 0.55; hy -= w * k.drop; hz += w * (k.hz - k.drop * 0.4); cry += w * k.tw; hipY += w * k.tw * 0.45; hrx += w * (k.hp - k.lean * 0.6); nrx += w * k.hp * 0.3; }
    // equip body motion: look over the right shoulder and turn into the stow, then dip and glance down to the belt while drawing the climbing picks
    // equip body motion: pickaxe - look over the right shoulder and turn into the reach; climbing picks - dip and look down to the hip holsters
    { const Q = an.eq, t2 = Q.t; let e1 = 0, e2 = 0; if (Q.seq === 'pickDraw') e1 = Math.sin(Math.PI * ss(0, 0.62, t2)); if (Q.seq === 'pickStow') e1 = Math.sin(Math.PI * ss(0.3, 1, t2));
      if (Q.seq === 'climbDraw') e2 = Math.sin(Math.PI * ss(0, 0.62, t2)); if (Q.seq === 'climbStow') e2 = Math.sin(Math.PI * ss(0.38, 1, t2));
      hry -= 0.42 * e1; cry -= 0.18 * e1; crz += 0.05 * e1; shY += 0.018 * e1; hy -= 0.06 * e2; cx += 0.12 * e2; hrx += 0.3 * e2; hz -= 0.012 * e2; }
    if (an.act === 'climb') { const EG = st.explore && st.gnd && st.gnd.exC ? st.gnd : null; if (EG && EG.exNew) { an.cl = climbInit(V(0, 4, 0)); an.exPy = an.cl.P.y; an.exPx = an.cl.P.x; EG.exNew = false; } if (!an.cl) an.cl = climbInit(); { const cg = c.built.climb && CGRADES[c.built.climb.R.userData.grade]; st.climbFac = climbFacFor(!!EG); } /* Explore: a natural climbing pace, its own - never the run speed: one pick swing, then a step up, Bronze ~0.5 m/s up a face, each Climbing Pick tier ~8% quicker */ const T = an.tv; if (T) tetherTick(T, dt);
      let C = T && T.pose ? tetherPose(T, dt) : climbStep(an.cl, dt); if (T && !T.pose) { T.P = C.P.clone(); T.C0 = { P: C.P.clone(), F: { R: { a: C.F.R.a.clone() }, L: { a: C.F.L.a.clone() } } }; }
      if (EG && !T) { const dP = C.P.y - an.exPy, dX = C.P.x - an.exPx; an.exPy = C.P.y; an.exPx = C.P.x; if (EG.exAdv && (dP || dX)) EG.exAdv(dX, dP); if (Math.abs(an.cl.P.x) > 4) { const sx = -Math.sign(an.cl.P.x) * 3.9; for (const v of new Set([an.cl.P, an.cl.bf, an.cl.bt, an.cl.from, an.cl.to, an.cl.from2, an.cl.to2, ...Object.values(an.cl.L)])) if (v && v.isVector3) v.x += sx; an.exPx += sx; } // the body only rises (or lowers) when a push moves it between planted picks and toes, and the map position follows exactly that - no sliding
        const K = an.cl; if (K.P.y > 7 || K.P.y < 1.6) { const sh = K.P.y > 7 ? -3.9 : 3.9; for (const v of new Set([K.P, K.bf, K.bt, K.from, K.to, K.from2, K.to2, ...Object.values(K.L)])) if (v && v.isVector3) v.y += sh; an.exPy += sh; } } // an endless face: re-base the wall frame on whole hold-grid steps
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
    { const P = an.act === 'climb' && f.climb ? f.climb.P : null, G = st.gnd; c.root.position.set(G ? G.x : P ? P.x : 0, G && G.hy ? G.y || 0 : P && !G ? P.y : 0, G ? G.z : 0).applyAxisAngle(V(0, 1, 0), st.yaw); if (G) c.root.rotation.y = st.yaw + G.face; c.root.rotation.order = 'YXZ'; c.root.rotation.x = G && G.exLeanS ? G.exLeanS : 0; if (G && G.exOff) c.root.position.add(G.exOff); /* Explore: leaned onto the rock face, the wall plane on the slope */ if (st.ledge) { if (LP.on) c.root.position.add(LP.off); else c.root.position.copy(LG.char); } const wl = c.wall; if (wl) { wl.visible = !st.ledge && (an.act === 'climb' || (!!G && !G.home)); wl.rotation.y = st.yaw; if (wl.visible && wl.userData.tiles) { const q = G ? V(G.x, 0, 0) : P || V(0, 0, 0); for (const t of wl.userData.tiles) t.visible = Math.abs(t.userData.c.x - q.x) < 3.9 && Math.abs(t.userData.c.y - q.y + 0.6) < 3.9; } for (const fl of FLOOR) fl.visible = !wl.visible && !st.home && !st.ledge; } }
    if (fid === 'sigh') { const s1 = Math.sin(Math.PI * ss(0.05, 0.45, u)), s2 = Math.sin(Math.PI * ss(0.4, 0.95, u)); cx += 0.085 * s1 - 0.08 * s2; shY += 0.03 * s1 - 0.04 * s2; nrx += 0.14 * s2; hrx += 0.15 * s2; hy -= 0.012 * s2; f.sighDrop = s2; }
    // apply: hips, spine, chest, neck, head
    const E = (k, x, y, z) => { B[k].quaternion.copy(c.restQ[k]).multiply(_q.setFromEuler(new THREE.Euler(x, y, z))); };
    B.hips.position.set(hx, c.HY + hy - 0.004 * Math.abs(sway), hz); E('hips', hipX, hipY, hrz); E('spine', cx * 0.4 + leanS, cry * 0.4 - hipY * 0.5, -hrz * 0.6 + crz * 0.3); E('chest', cx, cry, crz); B.chest.scale.set(1 + 0.008 * br, 1 + 0.006 * br, 1 + 0.012 * br);
    E('neck', nrx + hrx * 0.3, hry * 0.35, hrzH * 0.4); E('head', hrx * 0.7, hry * 0.65, hrzH * 0.6 - crz * 0.4);
    for (const k of ['shR', 'shL']) B[k].position.y = 0.085 + shY; B.shR.rotation.z = -shY * 2; B.shL.rotation.z = shY * 2;
    // pickaxe rides on the chest; the adjust fidget lifts and resettles it
    const px = c.built.mount; px.position.copy(c.pickRest.p).add(V(0, pickY, 0)); px.quaternion.copy(c.pickRest.q).premultiply(_q.setFromEuler(new THREE.Euler(pickRx, 0, 0)));
    f.dt = dt; solveLimbs(c, f);
    { const T = an.act === 'climb' ? an.tv : null, wv = !!T && T.pose && (T.k === 'ascend' || T.k === 'coil' || (T.k === 'draw' && T.t < 0.3)); if (c.built.winch && c.built.winch.parent !== c.B.hips) { c.B.hips.add(c.built.winch); const ws = 0.85 * 1.3; c.built.winch.scale.setScalar(ws); c.built.winch.rotation.set(0, Math.PI, 0); c.built.winch.position.set(0, -0.044 * (ws - 0.85), 0.158 + 0.002 * (ws - 0.85)); /* (Dominic: ~30% bigger; scaled about the strap's belt loop so it stays on the harness) */ } tetherRope(c, T); if (c.built.winch) { c.built.winch.visible = !!T && (T.clipped || wv) && !(T.k === 'draw' && T.t > 0.3); if (T && T.pose && dt > 0) { const py = T.P.y, v = c._tvy === undefined ? 0 : (py - c._tvy) / dt; c._tvy = py; T.feed = clamp(Math.abs(v) / 2.2, 0, 1); c.built.winchDrum.rotation.x -= dt * v * 22; } else c._tvy = undefined; }
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
    R.setPixelRatio(Math.min(QUALITY.dpr, window.devicePixelRatio || 1)); R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap; R.outputEncoding = THREE.LinearEncoding;
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
  function setPick(g, tier) { if (!rig) return; const b = rig.built, old = b.pick; b.pick = makePickaxe(g, tier); b.pick.position.copy(old.position); b.pick.quaternion.copy(old.quaternion); old.parent.add(b.pick); old.parent.remove(old); old.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); markPick(); }
  function setTether(g) { if (!rig) return; for (const tg of rig.built.tethers || []) mountTether(tg, g); markPick(); }
  // equip: 'pick' (pickaxe in hand) or 'climb' (the climbing picks, one per hand); the switch animates through an.tau
  // climb direction pad: the climber's own left/right (seen from behind the arrows match the screen), stop, and an auto-wander demo
  function setClimbDir(k) { if (k === 'auto') { st.climbAuto = !st.climbAuto; if (st.climbAuto && an.cl) an.cl.wt = 0; } else { st.climbAuto = false; st.climbDir = DIRS[k] ? k : 'stop'; } markClimb(); }
  function setGait(k) { st.gait = 'run'; /* she always runs: no walk mode */ if (typeof S !== 'undefined' && S) { S.gait = st.gait; if (typeof save === 'function') save(); } document.querySelectorAll('#charClimb [data-gait]').forEach((b) => b.classList.toggle('on', b.dataset.gait === st.gait)); }
  function markClimb() { document.querySelectorAll('#charClimb [data-dir]').forEach((b) => b.classList.toggle('on', b.dataset.dir === 'auto' ? !!st.climbAuto : !st.climbAuto && b.dataset.dir === st.climbDir)); }
  function setTool(k, quiet) { st.tool = k === 'climb' ? 'climb' : k === 'none' ? 'none' : 'pick'; if (st.tool !== 'climb' && st.anim === 'climb' && !st.play) { st.anim = 'idle'; st.gnd = null; st.play = false; st.pg = null; if (typeof pgMark === 'function') pgMark(null); document.querySelectorAll('#charAnim [data-anim]').forEach((b) => b.classList.toggle('on', b.dataset.anim === 'idle')); } if (!quiet && typeof S !== 'undefined' && S) { S.toolMode = st.tool; if (typeof save === 'function') save(); } document.querySelectorAll('#charEquip [data-tool]').forEach((b) => b.classList.toggle('on', b.dataset.tool === st.tool)); }
  function setClimb(g) { if (!rig) return; const b = rig.built; for (const k of ['R', 'L']) { const old = b.climb[k], nw = makeClimbPick(g); nw.position.copy(old.position); nw.quaternion.copy(old.quaternion); old.parent.add(nw); old.parent.remove(old); old.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); b.climb[k] = nw; } markPick(); }
  function setAnim(k) { const play = k === 'play'; if (play) k = 'climb'; if (!play) { st.play = false; st.pg = null; pgMark(null); } st.anim = k === 'run' || k === 'mine' || k === 'climb' ? k : 'idle'; if (st.anim !== 'climb') st.gnd = null; if (st.anim === 'mine' && st.tool !== 'pick') setTool('pick'); if (st.anim === 'climb') { if (st.tool !== 'climb' && !play) setTool('climb'); st.yaw = Math.PI + 0.65; st.yawV = 0; if (!st.climbDir || !st.play) st.climbDir = 'stop'; } const cc = document.getElementById('charClimb'); if (cc) cc.classList.toggle('off', st.anim !== 'climb'); markClimb(); if (play && !st.play) { st.play = true; an.tv = null; an.cl = null; if (!an.eq) an.eq = { held: 'climb', seq: null, t: 0 }; st.gnd = { x: 0, z: -1.2, face: 0, mv: 0, back: 0 }; st.climbDir = 'stop'; st.climbAuto = false; markClimb(); markTether(); const nt = document.querySelector('#charClimb .cnote'); if (nt) nt.textContent = 'Tap the ground to move there, tap the wall to climb to it'; }
    document.querySelectorAll('#charAnim [data-anim]').forEach((b) => b.classList.toggle('on', st.play ? b.dataset.anim === 'play' : b.dataset.anim === st.anim)); }
  let gear = 'pick';
  function markPick() { const cp = document.getElementById('charPick'); if (!cp) return; const T = gear === 'pick' ? GRADES : gear === 'climb' ? CGRADES : TGRADES, cur = gear === 'pick' ? (rig ? rig.built.pick.userData.grade : S.pickGrade) : gear === 'climb' ? (rig && rig.built.climb ? rig.built.climb.R.userData.grade : S.climbGrade || 'stone') : (rig && rig.built.tethers ? rig.built.tethers[0].grp.userData.grade : S.tetherGrade || 'regular');
    cp.innerHTML = `<span class="gear" role="tablist"><button data-gear="pick" title="Pickaxe" aria-label="Pickaxe" class="${gear === 'pick' ? 'on' : ''}">⛏️</button><button data-gear="tether" title="Tether" aria-label="Tether" class="${gear === 'tether' ? 'on' : ''}">🪢</button><button data-gear="climb" title="Climbing Picks" aria-label="Climbing Picks" class="${gear === 'climb' ? 'on' : ''}">🧗</button></span>` + Object.entries(T).filter(([k]) => gear === 'pick' || typeof Craft === 'undefined' || !Craft.skinOwned || Craft.skinOwned(gear === 'climb' ? 'climb' : 'tlink', k)).map(([k, G]) => `<button data-grade="${k}" title="${G.name}" class="${k === cur ? 'on' : ''}"><i style="background:${hex(G.chip || (G.runes ? G.glow : G.head))}"></i><span>${G.name}</span></button>`).join('')
      + (gear === 'pick' && typeof Craft !== 'undefined' && Craft.worn && Craft.worn().pick ? `<button data-unequip="pick" class="unq" title="Put the pickaxe in hand back into the backpack"><span>Unequip</span></button>` : ''); } // (the backpack's equipment row is gone: unequip lives here)
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
  // the Ledge Tether per tier: strands, colours, the energy it carries (also tints the drill's flute thread and lightning), extras, and v8 push/pull strand capacities
  const LGRADES = {
    bronze: { n: 2, col: 0xc07a3c, core: 0xffa860, co: 0.08, en: 0xffb070, r: 0.011, push: 3, pull: 220 },
    iron: { n: 3, col: 0x7d8288, core: 0x9fc0ff, co: 0.08, en: 0xa8c8ff, r: 0.012, bands: 0x55585e, push: 5, pull: 250 },
    steel: { n: 3, col: 0x9aa4ae, core: 0x8fd0ff, co: 0.14, en: 0x9fd8ff, r: 0.012, bands: 0x7d8792, cable: true, push: 9, pull: 290 },
    gold: { n: 3, col: 0xe6b640, core: 0xffd070, co: 0.14, en: 0xffe08a, r: 0.013, bands: 0xe6b640, wrap: 0x8a2a1e, push: 15, pull: 330 },
    mithril: { n: 3, col: 0x9cc0e6, core: 0xbfe6ff, co: 0.2, en: 0xbfe6ff, r: 0.013, bands: 0xe8f6ff, fil: 0xf6fbff, push: 25, pull: 370 },
    rune: { n: 3, col: 0x3b424c, core: 0xb48cff, co: 0.24, en: 0xc6a2ff, r: 0.014, bands: 0x8f8160, runes: 0xb48cff, push: 40, pull: 440 },
    lumen: { n: 3, col: 0x2f6fe0, core: 0x5c9dff, co: 0.34, en: 0x9fd0ff, r: 0.014, glowS: true, push: 63, pull: 510 },
    onyx: { n: 3, col: 0x16131a, core: 0xff5a28, co: 0.16, en: 0xff7a40, r: 0.014, vein: 0xff3418, flames: true, push: 100, pull: 700 },
  }; // push = coal/h vault → drill, pull = ore/h drill → vault (v8 Ledge Tether strand capacities)
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
    const mp = pocket(LG.char.x / LG.S + 0.01, 0.3, 0.09); LG.mineP = mp.F.p.clone(); LG.mineN = mp.F.n.clone(); const bp = pocket(D.x, D.y, 0.075); LG.biteGlow = bp.gq; LG.bite = bp.F.p.clone().addScaledVector(bp.F.n, 0.01);
    if (O.flames && flameSites.length) { const fl = flamePoints(flameSites.filter((s2) => s2[0].y > -2.5 && s2[0].y < 2.8)); vg.add(fl); LG.veinFx = fl; } else LG.veinFx = null;
    if (LG.veinL) { LG.veinL.color.setHex(O.glow); LG.veinL.intensity = 0.08 + O.gl * 0.5; } if (LG.biteL) LG.biteL.color.setHex(O.spark);
    if (LG.sparks) { LG.sparks.pts.material.color.setHex(O.spark); LG.sparks.lines.material.color.setHex(O.spark); }
    vg.traverse((o) => { if (o.isMesh) o.receiveShadow = true; }); }
  /* ---------- Ledge Tether Drill bit, one look per pickaxe tier (more detail each step up); built along +z with the tip at the cliff, spins about z ---------- */
  function drillMats(force) { if (LG.zap && !force) return;
    LG.zap = cv(256, 64, (x, w, h) => { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); x.strokeStyle = '#ffffff'; x.lineWidth = 1.4; const q = prng(5); for (let i = 0; i < 9; i++) { let px = q() * w, py = q() * h; x.beginPath(); x.moveTo(px, py); for (let j = 0; j < 6; j++) { px += (q() - 0.3) * 18; py += (q() - 0.5) * 14; x.lineTo(px, py); } x.stroke(); } });
    LG.enM = new THREE.MeshBasicMaterial({ color: 0x7cc4ff, map: cv(64, 8, (x, w, h) => { const gr = x.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); }), transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }); LG.enM.map.repeat.set(10, 1);
  }
  /* ---------- field / camp drill: a swappable bit on an adjustable stand (Art's stand_sheet, bit_sheet, stand_angle_adjust) ---------- */
  const DEG = Math.PI / 180;
  const DRILL_ANG = { // Art NOTES.md §7
    pitchMin: -60 * DEG, pitchMax: 15 * DEG, step: 15 * DEG, pitchDef: -30 * DEG, yawStep: 15 * DEG,
    pitches: [-60, -45, -30, -15, 0, 15].map((d) => d * DEG),
    portY: 0.17, socketZ: -0.15, hubY: 0.82, hubR: 0.15, collarH: 0.035, bitL: 0.88,
    portSeatY: 0.045, // visual bore (dark collar) in tetherPort-local space
  };
  DRILL_ANG.bitLen = Math.abs(DRILL_ANG.socketZ) + DRILL_ANG.collarH + DRILL_ANG.bitL; // hub centre → tip (level)
  const STAND_LOOK = {
    timber: { leg: 0x7a5230, band: 0x55585e, foot: 0x7a5230, moss: 0x6e7f3a, rope: 0xc9a66b, iron: 0x55585e, brass: 0xb8893a },
    iron: { leg: 0x4e5258, band: 0x3a3d42, foot: 0x4e5258, rivet: 0x3a3d42, iron: 0x4e5258, brass: 0xb8893a },
    brass: { leg: 0x4e5258, band: 0xd2a04a, foot: 0xd2a04a, iron: 0x4e5258, brass: 0xb8893a, bright: 0xd2a04a },
    lumenite: { leg: 0x2e3136, band: 0xc8963e, foot: 0x2e3136, glow: 0x5fe8f0, iron: 0x2e3136, brass: 0xc8963e },
  };
  const BIT_SPARK = { bronze: 0xffb35c, iron: 0xffd9a0, steel: 0xe8f2ff, gold: 0xffe27a, mithril: 0xbfe0ff, rune: 0xb48cff, lumen: 0x7ff4ff, onyx: 0xc8301c };
  const STAND_KEYS = Object.keys(STAND_LOOK);
  function snapAng(a, step) { return Math.round(a / step) * step; }
  // world delta from hub to the vein (y up) → yaw so the bit's -Z points at it, pitch snapped into the 6 notches
  function drillAim(dx, dy, dz) { const yaw = snapAng(Math.atan2(-dx, -dz), DRILL_ANG.yawStep), horiz = Math.hypot(dx, dz), elev = Math.atan2(dy, horiz);
    const inRange = elev >= DRILL_ANG.pitchMin - 1e-4 && elev <= DRILL_ANG.pitchMax + 1e-4, pitch = snapAng(clamp(elev, DRILL_ANG.pitchMin, DRILL_ANG.pitchMax), DRILL_ANG.step);
    return { yaw, pitch, elev, inRange }; }
  function drillTipOffset(pitch, yaw, sc = 1) { const L = DRILL_ANG.bitLen, cp = Math.cos(pitch), sp = Math.sin(pitch);
    return { x: -L * cp * Math.sin(yaw) * sc, y: (DRILL_ANG.hubY + L * sp) * sc, z: -L * cp * Math.cos(yaw) * sc }; }
  function drillSockLocal(g) {
    const sock = V(0, DRILL_ANG.portSeatY, 0);
    const p = g && (g.userData.tetherPort || (g.userData.stand && g.userData.stand.userData.tetherPort));
    if (p) { g.updateMatrixWorld(true); p.localToWorld(sock); g.worldToLocal(sock); }
    else sock.set(0, DRILL_ANG.hubY + DRILL_ANG.portY + DRILL_ANG.portSeatY, 0);
    return sock;
  }
  function drillPortWorld(g, out) {
    const v = out || V(0, 0, 0), p = g && (g.userData.tetherPort || (g.userData.stand && g.userData.stand.userData.tetherPort));
    v.set(0, DRILL_ANG.portSeatY, 0);
    if (p) { g.updateMatrixWorld(true); return p.localToWorld(v); }
    if (g && g.userData.sock) { g.updateMatrixWorld(true); return g.localToWorld(g.userData.sock.clone()); }
    return null;
  }
  function setDrillPose(g, yaw, pitch) { const u = g.userData; if (!u || !u.yawNode) return g;
    u.yaw = yaw; u.pitch = pitch; u.yawNode.rotation.y = yaw; u.hubPivot.rotation.x = pitch;
    if (u.sock) u.sock.copy(drillSockLocal(g));
    return g; }
  function matte(col, o) { return toon(col, null, o || {}); }
  function brassMat(col) { // modest highlight only (the rest of the drill stays matte / metallic 0)
    return new THREE.MeshPhongMaterial({ color: col == null ? 0xb8893a : col, specular: 0x3a2710, shininess: 18 }); }
  // v1 grooved-bit helper, from b89d017 / 5f8823d: a Catmull-Rom helix on the cone, then a rounded TubeGeometry flange.
  function helixC(R0, tipR, zTip, Lb, rOff, turns, ph = 0, n = 80) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, rr = tipR * 0.6 + (R0 - tipR * 0.6) * u + rOff, a = u * turns * TAU + ph;
      pts.push(V(Math.cos(a) * rr, Math.sin(a) * rr, zTip + 0.012 + u * (Lb - 0.03)));
    }
    return new THREE.CatmullRomCurve3(pts);
  }
  function metalRamp(hex) { return cv(64, 8, (x, w, h) => { const c = new THREE.Color(hex), dk = c.clone().multiplyScalar(0.58), hx = (q) => '#' + q.getHexString();
    const gr = x.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, hx(dk)); gr.addColorStop(0.5, hx(c)); gr.addColorStop(1, hx(dk)); x.fillStyle = gr; x.fillRect(0, 0, w, h); }); }
  function quadrantPlate(r0, r1, th, a0, a1, segs) { const pos = [], idx = [];
    for (let i = 0; i <= segs; i++) { const t = i / segs, a = a0 + (a1 - a0) * t, ca = Math.cos(a), sa = Math.sin(a);
      for (const [rr, sx] of [[r0, -th / 2], [r0, th / 2], [r1, -th / 2], [r1, th / 2]]) pos.push(sx, sa * rr, -ca * rr); }
    for (let i = 0; i < segs; i++) { const a = i * 4, b = a + 4, q = (p, q2, r, s) => { idx.push(p, q2, r, q2, s, r); };
      q(a, b, a + 1, b + 1); q(a + 2, a + 3, b + 2, b + 3); q(a, a + 2, b, b + 2); q(a + 1, b + 1, a + 3, b + 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; }
  function tickDrillAnim(g, dt) { const u = g && g.userData; if (!u || !u.anim) return;
    u.anim.t += dt; const k = Math.min(1, u.anim.t / (u.anim.dur || 0.3)), e = k * k * (3 - 2 * k);
    if (u.yawNode) u.yawNode.rotation.y = u.anim.fromY + (u.anim.toY - u.anim.fromY) * e;
    if (u.hubPivot) u.hubPivot.rotation.x = u.anim.fromP + (u.anim.toP - u.anim.fromP) * e;
    if (k >= 1) u.anim = null; }
  function tickDrillLod(bit) { const fl = bit && bit.userData && bit.userData.flights; if (!fl) return;
    const c = (typeof M3 !== 'undefined' && M3.camera) || (typeof CityMap !== 'undefined' && CityMap.cam) || cam;
    if (!c) { fl.visible = true; return; }
    bit.getWorldPosition(_lodP); bit.getWorldScale(_lodS);
    fl.visible = _lodP.distanceTo(c.position) < 110 * Math.max(1, _lodS.x); }
  const _lodP = V(0, 0, 0), _lodS = V(1, 1, 1);
  function setDrillAngle(g, pitch, yaw) { if (!g || !g.userData || !g.userData.yawNode) return g;
    if (yaw == null) yaw = g.userData.yaw || 0;
    pitch = snapAng(clamp(pitch, DRILL_ANG.pitchMin, DRILL_ANG.pitchMax), DRILL_ANG.step);
    yaw = snapAng(yaw, DRILL_ANG.yawStep);
    const u = g.userData, fromP = u.hubPivot.rotation.x, fromY = u.yawNode.rotation.y;
    u.pitch = pitch; u.yaw = yaw;
    if (Math.abs(fromP - pitch) < 1e-4 && Math.abs(fromY - yaw) < 1e-4) { u.anim = null; return setDrillPose(g, yaw, pitch); }
    u.anim = { fromP, toP: pitch, fromY, toY: yaw, t: 0, dur: 0.3 }; return g; }
  function drillPortUp(g) { const p = g.userData && g.userData.tetherPort; if (!p) return V(0, 1, 0);
    g.updateMatrixWorld(true); const q = new THREE.Quaternion(); p.getWorldQuaternion(q); return V(0, 1, 0).applyQuaternion(q).normalize(); }
  function countTris(obj, ink = false) { let n = 0; obj.traverse((o) => { if (!o.isMesh) return; if (!ink && o.material === OUT) return;
    const g = o.geometry, idx = g.index; n += (idx ? idx.count : g.attributes.position.count) / 3; }); return n; }
  function swapDrillBit(g, grade) { const sock = g.userData && g.userData.bitSocket; if (!sock) return null;
    const old = g.userData.bit, a = old ? old.rotation.z : 0; if (old) { sock.remove(old); old.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
    if (!grade) { g.userData.bit = null; g.userData.tipMark = null; return null; }
    const b = makeDrillBit(grade); b.rotation.z = a; b.traverse((o) => { if (o.isMesh) o.castShadow = true; }); sock.add(b);
    g.userData.bit = b; g.userData.tipMark = b.userData.tip; g.userData.bitSpark = BIT_SPARK[grade] || 0xffb35c; return b; }

  function makeDrillBit(key) { const G = GRADES[key] || GRADES.bronze, T = Math.max(0, G.tier), D = LG.drill, Lb = D.L, R0 = D.R, bit = new THREE.Group(); bit.name = 'drillbit'; bit.userData.grade = key; bit.userData.fx = [];
    // sheet-matched body colours, all matte (toon). steel/mithril used to wash out under a Phong shine.
    const BODY = [0xb07f45, 0x6a6f76, 0x6b7580, 0xe6b640, 0x6f97c6, 0x3b424c, 0x7ff4ff, 0x16131a][T];
    const body = T === 6 ? matte(0x7ff4ff, { emissive: 0x1d93ad }) : toon(0xffffff, metalRamp(BODY), G.emissive && T !== 5 ? { emissive: G.emissive } : {});
    const ironM = matte(0x6a6d72), brassM = brassMat(0xb8893a), zCol = -DRILL_ANG.collarH, zTip = zCol - Lb;
    const tipR = T === 0 ? 0.018 : T === 1 ? 0.028 : T === 3 ? 0.012 : T === 4 ? 0.008 : T === 7 ? 0.018 : T === 6 ? 0.016 : 0.01;
    part(bit, cyl(0.04, 0.04, 0.10, 8).rotateX(Math.PI / 2), ironM, [0, 0, 0.05]);
    part(bit, new THREE.BoxGeometry(0.020, 0.015, 0.06), ironM, [0, 0.0475, 0.04]);
    part(bit, new THREE.BoxGeometry(0.022, 0.008, 0.028), matte(0x2a2c30), [0.038, 0, 0.05], null, null, { ink: false });
    const colM = T === 5 || T === 6 || T === 7 ? brassM : T >= 3 ? matte(G.bind) : body;
    part(bit, cyl(0.11, 0.11, 0.035, 12).rotateX(Math.PI / 2), colM, [0, 0, zCol / 2]);
    
    if (T === 2) { part(bit, cyl(0.116, 0.1, 0.02, 12).rotateX(Math.PI / 2), colM, [0, 0, zCol / 2], null, null, { ink: false }); }
    if (T === 3) { part(bit, cyl(0.125, 0.11, 0.03, 8).rotateX(Math.PI / 2), colM, [0, 0, zCol / 2], null, null, { ink: false }); }
    if (T === 4) { part(bit, cyl(0.115, 0.115, 0.008, 10).rotateX(Math.PI / 2), matte(0x9cc0e6), [0, 0, zCol / 2], null, null, { ink: false }); }
    if (T === 7) { for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; const c = part(bit, new THREE.BoxGeometry(0.02, 0.012, 0.05), brassM, [Math.cos(a) * 0.12, Math.sin(a) * 0.12, zCol * 0.3], null, null, { ink: false }); c.lookAt(0, 0, zCol); } }
    // solid tapered core + thick rounded TubeGeometry flanges (the v1 grooved construction)
    part(bit, cyl(tipR, R0, Lb, 12, true).rotateX(Math.PI / 2), body, [0, 0, zCol - Lb / 2]);
    // Art sheet flange counts; pitch stays open so the core reads as deep grooves, not a pinecone of fins
    const spec = [
      { nF: 2, turns: 3.3, fr: 0.022, segs: 22, radial: 4 }, // bronze: 2 broad, coarse
      { nF: 2, turns: 4.0, fr: 0.018, segs: 22, radial: 4 }, // iron: 2, medium
      { nF: 3, turns: 4.4, fr: 0.012, segs: 16, radial: 4 }, // steel: 3 thin, fine
      { nF: 3, turns: 3.8, fr: 0.016, segs: 16, radial: 4 }, // gold: 3, medium
      { nF: 4, turns: 3.6, fr: 0.010, segs: 12, radial: 4 }, // mithril: 4 fine, tight
      { nF: 3, turns: 4.4, fr: 0.012, segs: 16, radial: 4 }, // rune: steel shape
      { nF: 2, turns: 3.8, fr: 0.022, segs: 22, radial: 4 }, // lumen: 2 broad, crystal
      { nF: 3, turns: 3.8, fr: 0.016, segs: 16, radial: 4 }, // onyx: 3, medium
    ][T];
    const fCol = T === 7 ? 0x3a3338 : T === 6 ? BODY : new THREE.Color(BODY).multiplyScalar(0.82).getHex();
    const fM = T === 6 ? body : matte(fCol);
    const flights = new THREE.Group(); flights.name = 'flights';
    for (let f = 0; f < spec.nF; f++) {
      const curve = helixC(R0, tipR, zTip, Lb, 0.004, spec.turns, f / spec.nF * TAU, Math.max(36, spec.segs * 2));
      part(flights, new THREE.TubeGeometry(curve, spec.segs, spec.fr, spec.radial, false), fM, null, null, null, { ink: T !== 6 });
    }
    bit.add(flights); bit.userData.flights = flights;
    // tips: needle / stubby 4-sided pyramid / spear / slim / faceted crystal / ruby gem
    if (T === 1) { const pyr = matte(BODY, { flatShading: true }); part(bit, cyl(0.032, 0.032, 0.024, 4).rotateX(Math.PI / 2), pyr, [0, 0, zTip + 0.008], null, null, { ink: false }); part(bit, new THREE.ConeGeometry(0.056, 0.052, 4).rotateX(-Math.PI / 2), pyr, [0, 0, zTip - 0.022]); }
    else if (T === 3) part(bit, new THREE.ConeGeometry(0.016, 0.10, 8).rotateX(-Math.PI / 2), body, [0, 0, zTip - 0.035]);
    else if (T === 4) part(bit, new THREE.ConeGeometry(0.011, 0.11, 8).rotateX(-Math.PI / 2), body, [0, 0, zTip - 0.04]);
    else if (T === 6) part(bit, new THREE.OctahedronGeometry(0.055, 0), body, [0, 0, zTip - 0.02], null, [0.72, 0.72, 1.55], { ink: false });
    else if (T === 7) { const gem = matte(0xc8301c, { emissive: 0x5a0a08, flatShading: true }); part(bit, new THREE.OctahedronGeometry(0.068, 0), gem, [0, 0, zTip - 0.03], null, [0.95, 0.95, 1.8], { ink: false }); }
    else if (T === 0 || T === 2 || T === 5) part(bit, new THREE.ConeGeometry(T === 0 ? 0.016 : 0.012, T === 0 ? 0.055 : 0.065, 8).rotateX(-Math.PI / 2), body, [0, 0, zTip - 0.022]);
    if (T === 5) { const rm = new THREE.MeshBasicMaterial({ map: runeTex(), color: 0xb48cff, transparent: true, depthWrite: false, side: THREE.DoubleSide });
      for (const u of [0.35, 0.65]) { const rr = tipR + (R0 - tipR) * (1 - u) + 0.004; part(bit, new THREE.CylinderGeometry(rr, rr, 0.04, 10, 1, true).rotateX(Math.PI / 2), rm, [0, 0, zCol - u * Lb], null, null, { ink: false, shadow: false }); } }
    const tipZ = zTip - (T === 4 ? 0.10 : T === 3 ? 0.085 : T === 1 ? 0.06 : T === 6 || T === 7 ? 0.08 : 0.05);
    const tip = new THREE.Object3D(); tip.name = 'tip'; tip.position.set(0, 0, tipZ); bit.add(tip); bit.userData.tip = tip; bit.userData.spark = BIT_SPARK[key] || 0xffb35c; return bit; }

  function makeDrillStand(tier, o = {}) { const key = 'iron', L = STAND_LOOK[key], deck = !!o.deck, g = new THREE.Group(); g.name = 'drillStand';
    const brass = brassMat(L.brass), brassDk = brassMat(0x5e3e16), aged = brassMat(0x7d5424), iron = matte(L.iron);
    const legM = key === 'timber' ? toon(0, fabric(L.leg, { seed: 41, weave: 0.04, folds: 8 })) : matte(L.leg);
    const bandM = key === 'brass' ? brassMat(L.band) : matte(L.band), footM = key === 'brass' ? brassMat(L.foot) : (key === 'timber' ? legM : matte(L.foot));
    const hubY = deck ? 0 : DRILL_ANG.hubY, footR = 0.74;
    if (!deck) {
      for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + Math.PI, x = Math.cos(a) * footR, z = Math.sin(a) * footR, lg = new THREE.Group(); g.add(lg);
        const top = V(0, hubY - 0.04, 0), bot = V(x, 0.04, z), d = bot.clone().sub(top), len = d.length();
        const thick = key === 'timber' ? [0.092, 0.074] : [0.076, 0.060];
        const pole = part(lg, cyl(thick[0], thick[1], 1, 8), legM); pole.position.copy(top).addScaledVector(d, 0.5); pole.scale.set(1, len, 1); pole.quaternion.setFromUnitVectors(V(0, 1, 0), d.clone().normalize());
        if (key === 'timber') {
          part(lg, rbox(0.18, 0.07, 0.18, 0.025), footM, [x, 0.035, z]);
          const moss = matte(L.moss); for (let k = 0; k < 5; k++) part(lg, new THREE.IcosahedronGeometry(0.05, 0), moss, [x + (k - 2) * 0.045, 0.025, z + ((k % 2) - 0.4) * 0.055], null, [1.2, 0.55, 1.15], { ink: false });
          const ropeM = matte(L.rope);
          for (const t of [0.12, 0.16, 0.84, 0.88]) { const p = top.clone().lerp(bot, t); const rr = thick[0] * (1 - t) + thick[1] * t; const rp = part(lg, new THREE.TorusGeometry(rr + 0.008, 0.018, 5, 10), ropeM, null, null, null, { ink: false }); rp.position.copy(p); rp.quaternion.copy(pole.quaternion); }
          for (const t of [0.08, 0.92]) { const p = top.clone().lerp(bot, t); const rr = thick[0] * (1 - t) + thick[1] * t; const b = part(lg, cyl(rr + 0.012, rr + 0.012, 0.045, 8), iron); b.position.copy(p); b.quaternion.copy(pole.quaternion); }
        } else {
          part(lg, rbox(key === 'brass' ? 0.16 : 0.18, 0.05, key === 'brass' ? 0.16 : 0.18, 0.012), footM, [x, 0.025, z]);
          for (const t of [0.16, 0.5, 0.84]) { const p = top.clone().lerp(bot, t); const rr = thick[0] * (1 - t) + thick[1] * t; const b = part(lg, cyl(rr + 0.01, rr + 0.01, 0.048, 8), bandM); b.position.copy(p); b.quaternion.copy(pole.quaternion);
            if (key === 'iron') for (const s of [-1, 1]) { const rv = part(lg, new THREE.BoxGeometry(0.014, 0.014, 0.014), matte(0x3a3d42), null, null, null, { ink: false }); rv.position.copy(p).addScaledVector(new THREE.Vector3(Math.cos(a + s * 0.5), 0, Math.sin(a + s * 0.5)), rr + 0.01); } }
          if (key === 'lumenite') { const glow = new THREE.MeshBasicMaterial({ color: 0x5fe8f0 });
            const p0 = top.clone().lerp(bot, 0.10), p1 = top.clone().lerp(bot, 0.90), mid = p0.clone().add(p1).multiplyScalar(0.5), ld = p1.clone().sub(p0), axis = ld.clone().normalize();
            const midR = (thick[0] + thick[1]) / 2, outward = V(x, 0, z).normalize(), sidev = new THREE.Vector3().crossVectors(axis, outward).normalize();
            // sit the inlay ON the pole (previous offsets were inside the cylinder, so the teal vanished)
            for (const offv of [outward.clone().multiplyScalar(midR + 0.006), sidev.clone().multiplyScalar(midR * 0.35).add(outward.clone().multiplyScalar(midR * 0.75))]) {
              const sl = part(lg, cyl(0.014, 0.014, 1, 6), glow, null, null, null, { ink: false, shadow: false }); sl.position.copy(mid).add(offv); sl.scale.set(1, ld.length(), 1); sl.quaternion.setFromUnitVectors(V(0, 1, 0), axis); } }
        }
      }
    } else part(g, rbox(0.32, 0.06, 0.32, 0.012), iron, [0, -0.14, 0]);
    const yawNode = new THREE.Group(); yawNode.name = 'yawNode'; yawNode.position.y = hubY; g.add(yawNode);
    part(yawNode, new THREE.TorusGeometry(0.15, 0.028, 6, 20), iron, [0, -0.06, 0], [Math.PI / 2, 0, 0]);
    part(yawNode, cyl(0.13, 0.13, 0.045, 14), iron, [0, -0.06, 0]);
    const knob = new THREE.Group(); knob.position.set(0.18, -0.06, 0); yawNode.add(knob); part(knob, cyl(0.014, 0.014, 0.055, 6).rotateZ(Math.PI / 2), brass, [0, 0, 0]); part(knob, rbox(0.06, 0.016, 0.028, 0.004), brass, [0.035, 0, 0]);
    const yoke = new THREE.Group(); yoke.name = 'yoke'; yawNode.add(yoke);
    const cheekX = 0.21, cheekH = 0.30;
    for (const sx of [-1, 1]) { part(yoke, rbox(0.062, cheekH, 0.13, 0.012), iron, [sx * cheekX, 0.03, 0]); for (let k = 0; k < 4; k++) part(yoke, new THREE.BoxGeometry(0.014, 0.014, 0.014), matte(0x3a3d42), [sx * cheekX, -0.08 + k * 0.07, 0.055], null, null, { ink: false }); }
    part(yoke, rbox(0.44, 0.05, 0.1, 0.01), iron, [0, 0.175, 0]);
    part(yoke, quadrantPlate(0.125, 0.175, 0.028, 15 * DEG, -60 * DEG, 14), brass, [cheekX - 0.01, 0, 0], null, null, { ink: false });
    for (const a of DRILL_ANG.pitches) part(yoke, rbox(0.03, 0.014, 0.022, 0.002), brassDk, [cheekX - 0.01, Math.sin(a) * 0.15, -Math.cos(a) * 0.15], null, null, { ink: false });
    const tetherPort = new THREE.Group(); tetherPort.name = 'tetherPort'; tetherPort.position.set(0, DRILL_ANG.portY, 0); yoke.add(tetherPort);
    part(tetherPort, cyl(0.045, 0.05, 0.07, 12), aged, [0, 0.012, 0]); part(tetherPort, new THREE.TorusGeometry(0.048, 0.012, 6, 14), brassDk, [0, 0.045, 0], [Math.PI / 2, 0, 0]);
    part(tetherPort, new THREE.CircleGeometry(0.032, 12).rotateX(-Math.PI / 2), matte(0x141210), [0, 0.048, 0], null, null, { ink: false });
    part(tetherPort, new THREE.TorusGeometry(0.03, 0.006, 5, 14), new THREE.MeshBasicMaterial({ color: 0x5fe8f0 }), [0, 0.05, 0], [Math.PI / 2, 0, 0], null, { ink: false, shadow: false });
    part(yoke, cyl(0.024, 0.024, 0.11, 8), brass, [0, 0.085, 0], null, null, { ink: false });
    const hubPivot = new THREE.Group(); hubPivot.name = 'hubPivot'; yoke.add(hubPivot);
    const hub = new THREE.Group(); hub.name = 'hub'; hubPivot.add(hub);
    // aged-brass CYLINDER hub Ø0.30 × 0.30, centre at the pivot; darker rims so it does not read as a lemon ball
    part(hub, cyl(0.15, 0.15, 0.30, 20).rotateX(Math.PI / 2), aged, [0, 0, 0]);
    part(hub, cyl(0.155, 0.155, 0.022, 16).rotateX(Math.PI / 2), brassDk, [0, 0, -0.145], null, null, { ink: false });
    part(hub, cyl(0.155, 0.155, 0.022, 16).rotateX(Math.PI / 2), brassDk, [0, 0, 0.145], null, null, { ink: false });
    part(hub, cyl(0.048, 0.048, 0.12, 12).rotateX(Math.PI / 2), matte(0x141210), [0, 0, -0.15 + 0.055], null, null, { ink: false });
    part(hub, new THREE.TorusGeometry(0.055, 0.008, 6, 14), brassDk, [0, 0, -0.15 + 0.01], null, null, { ink: false });
    part(hub, rbox(0.022, 0.03, 0.06, 0.002), matte(0x141210), [0, 0.048, -0.15 + 0.04], null, null, { ink: false });
    part(hub, cyl(0.022, 0.022, 0.05, 8).rotateX(Math.PI / 2), brassDk, [0, 0, 0.15 + 0.02]);
    part(hub, cyl(0.014, 0.014, 0.035, 6).rotateZ(Math.PI / 2), iron, [0, 0.16, 0.08]);
    part(yoke, cyl(0.05, 0.05, 0.46, 14).rotateZ(Math.PI / 2), aged, [0, 0, 0]);
    for (const sx of [-1, 1]) { part(yoke, cyl(0.065, 0.065, 0.04, 14).rotateZ(Math.PI / 2), aged, [sx * 0.23, 0, 0]); part(yoke, cyl(0.024, 0.024, 0.022, 8).rotateZ(Math.PI / 2), brassDk, [sx * 0.255, 0, 0]); }
    // iron bearing block under the hub (saddle + rivets), hangs with the hub
    part(hub, rbox(0.24, 0.15, 0.26, 0.016), iron, [0, -0.165, 0.01]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(hub, new THREE.BoxGeometry(0.016, 0.016, 0.016), matte(0x3a3d42), [sx * 0.08, -0.2, sz * 0.08], null, null, { ink: false });
    const lever = new THREE.Group(); lever.name = 'lever'; lever.position.set(cheekX - 0.07, 0, 0); hub.add(lever);
    part(lever, cyl(0.012, 0.012, 0.14, 6), iron, [0, 0.055, 0], [0, 0, 0.45]); part(lever, new THREE.SphereGeometry(0.026, 8, 6), matte(0x7a5230), [0, 0.125, 0.03]);
    const bitSocket = new THREE.Group(); bitSocket.name = 'bitSocket'; bitSocket.position.set(0, 0, DRILL_ANG.socketZ); hub.add(bitSocket);
    g.userData = { tier: key, deck, yawNode, yoke, hubPivot, hub, bitSocket, tetherPort, lever, pitch: 0, yaw: 0, bit: null };
    setDrillPose(g, o.yaw || 0, o.pitch != null ? o.pitch : (deck ? 0 : DRILL_ANG.pitchDef)); return g; }

  function mapDrill(grade, ore, standKey, ang) { drillMats(); const g = new THREE.Group(); g.name = 'mapDrill'; const O = ORES[ore] || { spark: ore === 'tin' ? 0xdfe8ff : ore === 'coal' ? 0xffb060 : 0xff8a4a };
    const stand = makeDrillStand(standKey || 'iron', ang || {}); g.add(stand);
    const bit = grade ? swapDrillBit(stand, grade) : null;
    const N = 60, pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
    pg.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
    const sp = new THREE.Points(pg, new THREE.PointsMaterial({ vertexColors: true, size: 0.06, map: radial('rgba(255,255,255,1)', 'rgba(255,255,255,0)'), transparent: true, depthWrite: false })); sp.frustumCulled = false; g.add(sp);
    const oc = new THREE.Color(O.spark), bc = new THREE.Color((stand.userData.bitSpark) || 0xffb35c);
    ledgeLook(g); g.updateMatrixWorld(true);
    const u = stand.userData, tip = V(0, 0, 0);
    g.updateMatrixWorld(true);
    const sock = V(0, DRILL_ANG.portSeatY, 0);
    if (u.tetherPort) { u.tetherPort.localToWorld(sock); g.worldToLocal(sock); }
    Object.assign(g.userData, u, { stand, sp, N, p: new Float32Array(N * 3), v: new Float32Array(N * 3), life: new Float32Array(N), col: new Float32Array(N * 3), r: prng(7), spin: 0, oreCol: oc, bitCol: bc, tip, sock, sockDir: V(0, 1, 0) });
    return g; }
  function mapDrillTick(g, dt, on) { const u = g.userData; tickDrillAnim(g, dt); tickDrillLod(u.bit); u.spin = lerp(u.spin, on ? LG.drill.rps * TAU : 0, 1 - Math.exp(-dt * 3)); if (u.bit) u.bit.rotation.z -= u.spin * dt;
    if (u.tipMark) { u.tipMark.getWorldPosition(u.tip); g.worldToLocal(u.tip); } else if (u.bit && u.bit.userData.tip) { u.bit.userData.tip.getWorldPosition(u.tip); g.worldToLocal(u.tip); }
    const P = u.p, Vv = u.v, L = u.life, C = u.col, r = u.r, k = u.spin / (LG.drill.rps * TAU), oc = u.oreCol, bc = u.bitCol;
    for (let i = 0; i < u.N; i++) { if (L[i] <= 0 && r() < k * dt * 40) { P[i * 3] = u.tip.x; P[i * 3 + 1] = u.tip.y; P[i * 3 + 2] = u.tip.z; const th = r() * TAU, sp2 = 0.8 + r() * 1.6; Vv[i * 3] = Math.cos(th) * sp2; Vv[i * 3 + 1] = 0.8 + r() * 1.5; Vv[i * 3 + 2] = Math.sin(th) * sp2 - 0.6; L[i] = 0.2 + r() * 0.35;
        const flash = r() < 0.2, cr = flash ? bc : oc; C[i * 3] = cr.r; C[i * 3 + 1] = cr.g; C[i * 3 + 2] = cr.b; }
      if (L[i] > 0) { L[i] -= dt; Vv[i * 3 + 1] -= 6.5 * dt; for (let j = 0; j < 3; j++) P[i * 3 + j] += Vv[i * 3 + j] * dt; } else P[i * 3 + 1] = -99; }
    u.sp.geometry.attributes.position.array.set(P); u.sp.geometry.attributes.position.needsUpdate = true;
    if (u.sp.geometry.attributes.color) { u.sp.geometry.attributes.color.array.set(C); u.sp.geometry.attributes.color.needsUpdate = true; } }

  /* ---------- the Ledge Tether per tier; a pulse rises along it only while ore is moving (LG.xfer: auto = while the drill sends up a load, on, off) ---------- */

  /* ---------- twin Ledge Tethers: every Ledge Tether is two twined strands, A and B, each with its own tier and its own direction (to / from the Ledge) ---------- */
  const TWIN0 = () => ({ a: { grade: 'bronze', dir: 'to' }, b: { grade: 'bronze', dir: 'from' } });
  function strandOf(x, d) { x = x || {}; const o = { grade: LGRADES[x.grade] ? x.grade : d.grade, dir: x.dir === 'from' || x.dir === 'to' ? x.dir : d.dir }; const it = Array.isArray(x.items) ? x.items : d && Array.isArray(d.items) ? d.items : null; if (it) o.items = it.slice(); if (typeof x.name === 'string' && x.name) o.name = x.name.slice(0, 40); return o; } // flow: dir 'to' = toward the Ledge (into the vault), 'from' = out of the vault; items = which items the strand moves (absent: everything)
  // normalise a saved Ledge Tether (old saves: { grade, dir: 'in' | 'out' } -> both strands that tier, A in the old flow, B the other way)
  function twinOf(P, def) { def = def || TWIN0(); if (P && P.a) return { a: strandOf(P.a, def.a), b: strandOf(P.b, def.b) }; if (P && P.grade) { const g = LGRADES[P.grade] ? P.grade : 'bronze', d = P.dir === 'out' ? 'from' : 'to'; return { a: { grade: g, dir: d }, b: { grade: g, dir: d === 'to' ? 'from' : 'to' } }; } return { a: Object.assign({}, def.a), b: Object.assign({}, def.b) }; }
  function strandMat(L) { return L.glowS ? new THREE.MeshBasicMaterial({ color: L.col }) : L.cable ? new THREE.MeshPhongMaterial({ color: L.col, specular: 0xffffff, shininess: 60 }) : toon(L.col, null, { emissive: new THREE.Color(L.core).multiplyScalar(0.15).getHex() }); }
  // the braid along a centre path: two helices half a turn apart, each strand in its own tier's material (stripe/wrap details ride on that strand),
  // each with its own glow sheath and its own transfer beads. ledgeEnd: 1 if the Ledge is at the end of the path, 0 if at its start
  let BOPT = null; // one-shot options for the next braidCord: { np: samples, s0: arc length the lay starts at, n0: starting frame normal }
  /* the same parallel-transport frames braidCord builds, without any geometry: the frame a chunk of a long cord starts with */
  function braidFrames(pts, NP, n0) { const C = new THREE.CatmullRomCurve3(pts, false, 'centripetal'), P = C.getSpacedPoints(NP), n = n0.clone(); for (let i = 0; i <= NP; i++) { const t2 = P[Math.min(NP, i + 1)].clone().sub(P[Math.max(0, i - 1)]).normalize(); n.addScaledVector(t2, -n.dot(t2)).normalize(); } return { n1: n, len: C.getLength() }; }
  function twinCord(par, pts, tw, k = 2.4, ledgeEnd = 0, r = 0) { if (r) BOPT = Object.assign(BOPT || {}, { r }); const g = braidCord(par, pts, [Object.assign({ key: 'a' }, tw.a), Object.assign({ key: 'b' }, tw.b)], k, ledgeEnd); g.userData.twin = tw; g.userData.r = r; return g; }
  /* every Ledge Tether plugged into the door (main hole or a side port, Ledge door or map door) has the main line's gauge: the grade sets the strand colours and bands, never the girth */
  function ltR() { const c = homeState().ports.c, t = c ? twinOf(c) : null; return t ? Math.max(LGRADES[t.a.grade].r, LGRADES[t.b.grade].r) : LGRADES.lumen.r; }
  // the same lay for any number of strands: 2 -> the twin helix; more -> one big rope, every strand (its own tier material, sheath and beads) laid
  // round a dark heart at a ring radius that grows with the count, so the braid thickens with each Ledge Tether twined in
  const BRAID_GAP = 1.16, BRAID_LAY = 2.8; // big rope: ring spacing (>1 leaves a thin dark gap between neighbouring strands), lay length in ring circumferences
  // a laid rope's axis: spaced points with parallel-transported frames (the same construction braidCord lays its strands on), arc length S
  function layAxis(pts, NP) { const C = new THREE.CatmullRomCurve3(pts, false, 'centripetal'), P = C.getSpacedPoints(NP), Nn = [], Bn = [], T = [], S = [0]; let n0 = Math.abs(P[1].clone().sub(P[0]).normalize().y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0);
    for (let i = 0; i <= NP; i++) { const t2 = P[Math.min(NP, i + 1)].clone().sub(P[Math.max(0, i - 1)]).normalize(); n0.addScaledVector(t2, -n0.dot(t2)).normalize(); Nn.push(n0.clone()); Bn.push(t2.clone().cross(n0)); T.push(t2); if (i) S.push(S[i - 1] + P[i].distanceTo(P[i - 1])); } return { C, P, Nn, Bn, T, S }; }
  function braidCord(par, pts, list, k = 2.4, ledgeEnd = 0) { const BO = BOPT || {}; BOPT = null; const C = new THREE.CatmullRomCurve3(pts, false, 'centripetal'), len = C.getLength(), NS = list.length, NP = BO.np || Math.max(60, Math.min(NS > 2 ? 520 : 900, Math.round(len / 0.01))), P = C.getSpacedPoints(NP), g = new THREE.Group(); par.add(g);
    const BIG = NS > 2, shrink = BIG ? Math.max(0.6, 1 - 0.03 * (NS - 2)) : 1, sr0 = list.map((x) => (BO.r || (LGRADES[x.grade] || LGRADES.bronze).r) * k * shrink), smax = Math.max(...sr0), srs = BIG ? sr0.map(() => smax) : sr0,
      // big rope: every strand the same gauge, laid side by side round the core with a small even gap (BRAID_GAP), one lay length for all - no strand crosses another
      rr = BIG ? smax / Math.sin(Math.PI / NS) * BRAID_GAP : smax * 0.95, twist = BIG ? TAU / (rr * TAU * BRAID_LAY) : TAU / (7 * (srs[0] + srs[1]));
    const Nn = [], Bn = []; let n0 = BO.n0 ? BO.n0.clone() : Math.abs(P[1].clone().sub(P[0]).normalize().y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0); for (let i = 0; i <= NP; i++) { const t2 = P[Math.min(NP, i + 1)].clone().sub(P[Math.max(0, i - 1)]).normalize(); n0.addScaledVector(t2, -n0.dot(t2)).normalize(); Nn.push(n0.clone()); Bn.push(t2.clone().cross(n0)); }
    const n1 = Nn[NP].clone();
    const helix = (off, ph) => { let sA = BO.s0 || 0; const H = []; for (let i = 0; i <= NP; i++) { if (i) sA += P[i].distanceTo(P[i - 1]); const a = ph + sA * twist; H.push(P[i].clone().addScaledVector(Nn[i], Math.cos(a) * off).addScaledVector(Bn[i], Math.sin(a) * off)); } return H; };
    const strands = [], seg = NS > 2 ? NP : NP * 2, rs = NS > 2 ? 6 : 7;
    // the common core: dark, filling the lay right up to the strands so the gaps between them read as dark shading lines
    if (BIG) { const cf = list[0].coreFrom || 0, crr = Math.max(0.004, rr - smax * 0.25), CC = cf > 0 ? new THREE.CatmullRomCurve3(Array.from({ length: 81 }, (_, i) => C.getPointAt(Math.min(1, cf / len + (1 - cf / len) * i / 80)))) : C; part(g, new THREE.TubeGeometry(CC, NP, crr, 16, false), toon(0x231c1a), null, null, null, { ink: false });
      if (cf > 0) part(g, new THREE.SphereGeometry(crr, 16, 10), toon(0x231c1a), CC.getPoint(0).toArray(), null, null, { ink: false }); }
    list.forEach((x, j) => { const L = LGRADES[x.grade] || LGRADES.bronze, sr = x.sr || srs[j], ph = NS > 2 ? j / NS * TAU : j * Math.PI, hp = x.path || helix(rr, ph), hc = new THREE.CatmullRomCurve3(hp), sg = x.path ? Math.max(60, Math.min(1400, Math.round(hc.getLength() / 0.006))) : seg;
      const tc = x.tube ? new THREE.CatmullRomCurve3(x.tube) : hc, tsg = x.tube ? Math.max(60, Math.min(2400, Math.round(tc.getLength() / 0.006))) : sg; /* x.tube: draw the strand along this (longer) path - one unbroken tube; x.noTube: drawn by another cord */
      if (!x.noTube) part(g, new THREE.TubeGeometry(tc, tsg, sr, rs, false), strandMat(L), null, null, null, { ink: true });
      const oph = (d) => BIG ? ph : ph + d / Math.max(1, NS / 2), orr = (f) => BIG ? rr + sr * 0.82 : rr + sr * f;
      if (L.wrap && !BIG && !x.path) part(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix(orr(0.72), oph(0.55))), seg, sr * (BIG ? 0.3 : 0.34), 4, false), toon(L.wrap), null, null, null, { ink: false, shadow: false });
      else if (L.bands && !BIG && !x.path) part(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix(orr(0.72), oph(0.55))), seg, sr * 0.26, 4, false), toon(L.bands), null, null, null, { ink: false, shadow: false });
      const sc = L.vein || L.fil || L.runes; if (sc && !BIG && !x.path) part(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix(orr(0.78), oph(-0.5))), seg, sr * (BIG ? 0.2 : 0.24), 4, false), new THREE.MeshBasicMaterial({ color: sc }), null, null, null, { ink: false, shadow: false });
      const core = new THREE.MeshBasicMaterial({ color: L.core, transparent: true, opacity: L.co * (BIG ? 0.8 : 1.4), depthWrite: false, blending: THREE.AdditiveBlending }); if (!x.noTube) part(g, new THREE.TubeGeometry(tc, tsg, sr * (BIG || x.path ? 1.12 : 1.75), 8, false), core, null, null, null, { ink: false, shadow: false });
      const pm = new THREE.MeshBasicMaterial({ color: new THREE.Color(L.en).lerp(new THREE.Color(0xffffff), 0.35), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }), beads = [];
      for (let i = 0; i < 4; i++) { const b = part(g, new THREE.SphereGeometry(1, 10, 8), pm, null, null, null, { ink: false, shadow: false }); b.visible = false; beads.push(b); }
      strands.push({ key: x.key, port: x.port, seed: x.seed || 0, lj: x.lj === undefined ? j : x.lj, grade: x.grade, dir: x.dir, curve: hc, pts: hp, full: x.tube || hp, drawn: !x.noTube, core, co: L.co * (BIG ? 0.8 : 1.4), pm, beads, sr, bs: BIG ? 1.3 : 2.3, xl: 0, u: 0, len: hc.getLength() }); });
    g.userData = { C, strands, rr, R: rr + smax, len, ledgeEnd, core: strands[0].core, co: strands[0].co, n1, twist, srs }; return g; }
  // per-strand load: auto = each strand carries a load 3 s out of every 8, the two strands out of step (so each dims on its own); seed varies it per Ledge Tether
  function strandLoad(t, j, seed = 0) { return LG.xfer === 'on' ? 1 : LG.xfer === 'off' ? 0 : ((t + j * 4 + seed) % 8 < 3 ? 1 : 0); }
  // idle: full steady glow, no pulse; under load the strand's glow dims and its pulses run in that strand's direction ('to' runs toward the Ledge end)
  function twinTick(cd, t, dt, wants) { const U = cd.userData; let mv = 0; U.strands.forEach((S2, j) => { S2.xl = lerp(S2.xl, wants[j], 1 - Math.exp(-dt * 3)); const xl = S2.xl; if (xl > 0.05) mv = 1; S2.core.opacity = S2.co * (1.25 - 0.7 * xl); S2.pm.opacity = 0.34 * xl;
      const fwd = (S2.dir === 'to') === (U.ledgeEnd === 1), n = S2.beads.length, L = Math.max(0.6, S2.len), bl = Math.max(0.035, Math.min(0.1, S2.len * 0.04));
      for (let k = 0; k < n; k++) { const b = S2.beads[k], u0 = (t * 0.45 / L + k / n + j * 0.13) % 1, u = fwd ? u0 : 1 - u0, sc = Math.min(1, u0 / 0.06, (1 - u0) / 0.06); if (!k) S2.u = u; b.visible = xl > 0.02; S2.curve.getPointAt(u, b.position); b.quaternion.setFromUnitVectors(V(0, 1, 0), S2.curve.getTangentAt(u)); b.scale.set(S2.sr * (S2.bs || 2.3), bl * (0.5 + 0.5 * sc), S2.sr * (S2.bs || 2.3)); } }); return mv; }
  function makeLifeline(tw) { tw = twinOf(tw && tw.a ? tw : tw ? { grade: tw, dir: 'in' } : null); const LA = LGRADES[tw.a.grade], grp = new THREE.Group(); grp.name = 'lifeline'; grp.userData.fx = []; const y0 = 0.3, top = 4.2, sr = Math.max(LA.r, LGRADES[tw.b.grade].r), rr = sr * 1.05;
    // the main line climbs from the hub toward the Ledge (the Ledge is at the top end)
    const main = twinCord(grp, [V(0, y0, 0), V(0, (y0 + top) / 2, 0), V(0, top, 0)], tw, 1, 1); grp.userData.main = main;
    main.userData.strands.forEach((S2, j) => { const L = LGRADES[S2.grade]; if (!L.vein) return; const sites = []; for (let i = 0; i < S2.pts.length; i += 5) if (S2.pts[i].y < 2.4) sites.push([S2.pts[i], V(S2.pts[i].x, 0, S2.pts[i].z).normalize()]); const fl = flamePoints(sites); grp.add(fl); grp.userData.fx.push(fl); grp.userData.flames = fl; });
    part(grp, cyl(rr + sr + 0.012, rr + sr + 0.008, 0.07, 12), DTIERS.indexOf(tw.a.grade) >= 3 ? toon(LA.bands || LA.col) : strandMat(LA), [0, y0 + 0.02, 0], null, null, { ink: false });
    // the spare Ledge Tether: out of the rear of the hub, down onto the deck in two heavy loops, the loose end hanging off the deck edge (ready to feed a deeper drop)
    { const D = LG.drill, deckY = 0.07 - D.y + rr + sr, edgeZ = LG.z0 + LG.D - LG.hubZ + 0.03, path = [V(0, 0, 0.1), V(0, -0.02, 0.17), V(0.01, deckY + 0.04, 0.24), V(0.03, deckY, 0.3)];
      const loop = (cx, cz, r0, a0, lift) => { for (let i = 1; i <= 14; i++) { const a = a0 + i / 14 * TAU, cr = r0 * (1 - 0.05 * i / 14); path.push(V(cx + Math.sin(a) * cr, deckY + lift * Math.max(0, Math.sin(a * 0.5 + 0.4)) * 2 * (rr + sr), cz - Math.cos(a) * cr)); } };
      loop(0.06, 0.37, 0.13, 0, 0.9); loop(0.15, 0.39, 0.12, 0.35, 0.9); path.push(V(0.2, deckY, edgeZ - 0.12), V(0.24, deckY, edgeZ - 0.02), V(0.25, deckY - 0.05, edgeZ + 0.03), V(0.25, deckY - 0.2, edgeZ + 0.045), V(0.24, deckY - 0.3, edgeZ + 0.04));
      const tail = twinCord(grp, path, tw, 1, 0); grp.userData.tailCord = tail; grp.userData.tail = tail.userData.C;
      part(grp, cyl(rr + sr + 0.006, rr + sr + 0.01, 0.06, 12).rotateX(Math.PI / 2), DTIERS.indexOf(tw.a.grade) >= 3 ? toon(LA.bands || LA.col) : strandMat(LA), [0, 0, 0.1], null, null, { ink: false }); }
    grp.userData.core = main.userData.core; grp.userData.co = main.userData.co; grp.userData.y0 = y0; grp.userData.rr = rr; grp.userData.tw = tw;
    return grp; }
  const rr2 = (U) => (U.rr || 0.02) * 2.6;
  function lifelineState(t) { return LG.xfer === 'on' ? 1 : LG.xfer === 'off' ? 0 : (t % 8 < 3 ? 1 : 0); } // auto: the drill sends a load up every 8 s and the line carries it for 3 s
  function setDrillGrade(key) { if (!GRADES[key] || key === 'stick') key = 'bronze'; LG.dg = key;
    if (LG.standG) { const b = swapDrillBit(LG.standG, key); if (b) { b.traverse((o) => { if (o.isMesh) o.receiveShadow = true; }); LG.bit = b; } else LG.bit = null; }
    else if (LG.drillG) { const old = LG.bit, a = old ? old.rotation.z : 0; if (old) { LG.drillG.remove(old); old.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
      const b = makeDrillBit(key); b.rotation.z = a; b.traverse((o) => { if (o.isMesh) o.receiveShadow = true; }); LG.drillG.add(b); LG.bit = b; } ledgeMark(); }
  function setLine(tw) { LG.tw = twinOf(tw); LG.lg = LG.tw.a.grade; const hold = LG.portHold || LG.drillG;
    if (hold) { if (LG.line) { LG.line.parent && LG.line.parent.remove(LG.line); LG.line.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
      const l = makeLifeline(LG.tw); l.position.set(0, 0, 0); hold.add(l); LG.line = l; const en = LGRADES[LG.tw.a.grade].en; if (LG.enM) LG.enM.color.setHex(en); if (LG.zapM) LG.zapM.color.setHex(en); } ledgeMark(); }
  function setLineGrade(key) { if (!LGRADES[key]) key = 'bronze'; const t = twinOf(LG.tw); t.a.grade = key; t.b.grade = key; setLine(t); } // both strands
  function setStrand(w, ch) { const t = twinOf(LG.tw); Object.assign(t[w === 'b' ? 'b' : 'a'], ch); setLine(t); if (typeof S !== 'undefined' && S) { S.ledgeLine = LG.tw; delete S.lineGrade; if (typeof save === 'function') save(); } }
  function setOre(key) { if (!ORES[key]) key = 'mithril'; LG.ore = key; if (LG.cliff) buildVein(key); const e = document.getElementById('ledgeOre'); if (e) e.textContent = ORES[key].name; ledgeMark(); }
  function setXfer(k) { LG.xfer = k === 'on' || k === 'off' ? k : 'auto'; ledgeMark(); }
  function ledgeMark() { const box = document.getElementById('ledgeCtl'); if (!box) return; for (const b of box.querySelectorAll('button[data-v]')) { const k = b.parentNode.dataset.k; const tw = LG.tw || TWIN0(); b.classList.toggle('on', b.dataset.v === (k === 'ore' ? LG.ore : k === 'drill' ? LG.dg : /^l[ab]$/.test(k) ? tw[k[1]].grade : /^d[ab]$/.test(k) ? tw[k[1]].dir : LG.xfer)); } }
  function ledgeUI() { const box = document.getElementById('ledgeCtl'); if (!box || box.dataset.ok) return; box.dataset.ok = 1; const hx = (c) => '#' + c.toString(16).padStart(6, '0');
    const row = (k, label, items) => `<div class="lrow"><b>${label}</b><div class="chips" data-k="${k}">${items.map(([v, n, c]) => `<button data-v="${v}"${c !== undefined ? ` style="--sw:${hx(c)}"` : ''}>${c !== undefined ? '<i></i>' : ''}${n}</button>`).join('')}</div></div>`;
    const strandRow = (w, label) => `<div class="lrow"><b>${label}</b><div class="chips dirs" data-k="d${w}"><button data-v="to">To Ledge</button><button data-v="from">From Ledge</button></div><div class="chips" data-k="l${w}">${DTIERS.map((k) => `<button data-v="${k}" style="--sw:${hx(LGRADES[k].col)}"><i></i>${GRADES[k].name}</button>`).join('')}</div></div>`;
    box.innerHTML = row('ore', 'Ore', Object.entries(ORES).map(([k, o]) => [k, o.name, o.vein])) + row('drill', 'Drill bit', DTIERS.map((k) => [k, GRADES[k].name, GRADES[k].head])) /* (tether grades are no longer picked freely here: upgrade / swap strands with owned tether in the Tether Orb's settings) */ + row('xfer', 'Transfer', [['auto', 'Auto'], ['on', 'On'], ['off', 'Off']]);
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
    const pf = new THREE.Group(); pf.position.set(LG.cx, 0, LG.z0 + LG.D / 2); g.add(pf); LG.pf = pf; const n = 7, pw = LG.D / n;
    for (let i = 0; i < n; i++) part(pf, rbox(LG.W - (r() - 0.5) * 0.04, 0.05, pw - 0.012, 0.008), i % 2 ? wood : toon(0x76502f), [(r() - 0.5) * 0.03, 0.045, -LG.D / 2 + pw * (i + 0.5)], [0, (r() - 0.5) * 0.01, 0]);
    for (const s of [-1, 1]) { part(pf, rbox(0.09, 0.07, LG.D + 0.08, 0.01), woodDk, [s * (LG.W / 2 - 0.12), -0.02, 0]); part(pf, rbox(LG.W + 0.1, 0.06, 0.08, 0.01), woodDk, [0, 0.0, s * (LG.D / 2 - 0.02)]); }
    const corners = []; for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const p = V(sx * (LG.W / 2 + 0.02), 0.03, sz * (LG.D / 2 + 0.02)); part(pf, new THREE.TorusGeometry(0.035, 0.009, 6, 12), iron, [p.x, p.y, p.z], [0, Math.PI / 4 * sx * sz, 0]); corners.push(p.clone().add(pf.position)); }
    // rigging: a giant forged iron spike driven into the cliff face just above the platform's back edge - a thick tapering square shank (most of it buried in the
    // rock, a dished bearing plate and a burr of cracked stone where it went in), a big hammered mushroom head, and a forged eye under the head carrying one heavy
    // ring; the four suspension ropes are lashed to that ring, so the back pair runs close down the rock and the platform hangs snug against the cliff. No chain.
    const SPK = V(LG.cx, 2.92, 0), ring = V(LG.cx, 2.74, 0.25), seg = (a, b, rad, m) => { const d = b.clone().sub(a), L = d.length(), o = part(g, cyl(rad, rad, 1, 6), m, null, null, null, { ink: false }); o.position.copy(a).addScaledVector(d, 0.5); o.scale.set(1, L, 1); o.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); return o; };
    { const S = new THREE.Group(); S.position.copy(SPK); S.rotation.x = -0.12; g.add(S); LG.spike = S; const fi = toon(0x3d3f44), fiL = toon(0x585b61), fiD = toon(0x2a2b2f);
      // shank: square-section, tapering into the rock, slightly irregular from the forge
      { const geo = new THREE.CylinderGeometry(0.05, 0.022, 0.62, 4, 3).rotateY(Math.PI / 4).rotateX(Math.PI / 2), P = geo.attributes.position; for (let k = 0; k < P.count; k++) { const z = P.getZ(k); P.setX(k, P.getX(k) * (1 + 0.06 * Math.sin(z * 31))); P.setY(k, P.getY(k) * (1 + 0.06 * Math.cos(z * 27))); } geo.computeVertexNormals(); part(S, geo, fi, [0, 0, 0.0], null, null, {}); }
      part(S, cyl(0.13, 0.15, 0.03, 9), fiD, [0, 0, 0.012], [Math.PI / 2, 0, 0]); // the dished bearing plate on the rock
      for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + 0.4; part(S, new THREE.CylinderGeometry(0.014, 0.017, 0.02, 6), fiL, [Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0.03], [Math.PI / 2, 0, 0], null, { ink: false }); } // its rivets
      part(S, rbox(0.075, 0.075, 0.33, 0.01), fi, [0, 0, 0.18], [0, 0, Math.PI / 4]); // the exposed shank, square
      // the big hammered head: a faceted mushroom, wider than tall, its crown flattened and its rim curled over by the blows that drove it home
      { const hg = new THREE.SphereGeometry(0.13, 9, 6, 0, TAU, 0, Math.PI / 2).scale(1, 0.55, 1).rotateX(Math.PI / 2), P = hg.attributes.position, rp2 = prng(5151); for (let k = 0; k < P.count; k++) { const f = 0.93 + rp2() * 0.12; P.setX(k, P.getX(k) * f); P.setY(k, P.getY(k) * f); } hg.computeVertexNormals(); part(S, hg, fi, [0, 0, 0.355], null, null, {}); }
      part(S, new THREE.TorusGeometry(0.115, 0.022, 6, 14), fiL, [0, 0, 0.352], null, null, { ink: false }); part(S, cyl(0.09, 0.1, 0.03, 9), fiD, [0, 0, 0.34], [Math.PI / 2, 0, 0], null, { ink: false });
      // forged eye under the head, and the heavy ring through it
      part(S, new THREE.TorusGeometry(0.045, 0.017, 7, 14), fi, [0, -0.055, 0.25], [0, Math.PI / 2, 0]); }
    // cracked, burred stone round where the spike went in
    for (let k = 0; k < 7; k++) { const a = k / 7 * TAU + r() * 0.4, rr = 0.15 + r() * 0.08; part(cliff, rockGeo(0.07 + r() * 0.05, 0.05 + r() * 0.04, 0.05, 6000 + k), rockDk, [SPK.x + Math.cos(a) * rr, SPK.y + Math.sin(a) * rr, -0.005], [0, 0, a]); }
    { const rl = part(g, new THREE.TorusGeometry(0.085, 0.019, 8, 20), iron, [ring.x, ring.y, ring.z], [0, Math.PI / 2, 0]); LG.anchorRing = rl; }
    // the ropes: each runs from its corner ring up to the big ring, where it is lashed with a few tight wraps
    for (const c2 of corners) { const tie = ring.clone().add(V(Math.sign(c2.x - ring.x) * 0.02, -0.07, Math.sign(c2.z - ring.z - 0.3) * 0.03)); seg(c2, tie, 0.012, ropeM); for (let w = 0; w < 3; w++) part(g, new THREE.TorusGeometry(0.02, 0.008, 5, 10), ropeM, [tie.x, tie.y + w * 0.014, tie.z], [Math.PI / 2, 0, 0], null, { ink: false }); }
    LG.ropes = corners.length;
    // tent: a ridge tent on the right two-thirds, open toward the front, patched canvas, flaps tied back, lantern inside
    const tent = new THREE.Group(); tent.position.set(1.12, 0.07, LG.z0 + LG.D / 2 + 0.05); g.add(tent); LG.tent = tent; const tw = 1.25, td = 1.2, th = 1.05; g.updateMatrixWorld(true);
    const sheet = (pts, m) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3)); geo.setIndex(pts.length === 4 ? [0, 1, 2, 0, 2, 3] : [0, 1, 2]); geo.computeVertexNormals(); const o = part(tent, geo, m, null, null, null, { ink: false }); o.material.side = THREE.DoubleSide; return o; };
    const cm = toon(0xb99d72); cm.side = THREE.DoubleSide; const cmIn = toon(0x9c8460); cmIn.side = THREE.DoubleSide;
    for (const s of [-1, 1]) { sheet([[0, th, -td / 2], [0, th, td / 2], [s * tw / 2, 0, td / 2 + 0.04], [s * tw / 2, 0, -td / 2 - 0.04]], cm); sheet([[0, th - 0.02, -td / 2 + 0.01], [0, th - 0.02, td / 2], [s * (tw / 2 - 0.02), 0.01, td / 2 + 0.03], [s * (tw / 2 - 0.02), 0.01, -td / 2 - 0.03]], cmIn); }
    sheet([[-tw / 2, 0, -td / 2], [tw / 2, 0, -td / 2], [0, th, -td / 2]], cmIn); part(tent, new THREE.PlaneGeometry(tw * 0.95, td * 0.95).rotateX(-Math.PI / 2), cmIn, [0, 0.005, 0], null, null, { ink: false });
    for (const s of [-1, 1]) { const fl = sheet([[0, th, td / 2], [s * tw / 2, 0, td / 2 + 0.04], [s * tw * 0.3, 0, td / 2 + 0.12]], cm); fl.position.x = 0; part(tent, cyl(0.025, 0.025, 0.24, 8), cm, [s * tw * 0.36, 0.34, td / 2 + 0.07], [0, 0, s * 0.35], null, { ink: false }); }
    part(tent, cyl(0.018, 0.018, td + 0.12, 8), woodDk, [0, th + 0.01, 0], [Math.PI / 2, 0, 0]); for (const z of [-td / 2, td / 2]) for (const s of [-1, 1]) seg(tent.localToWorld(V(s * 0.015, th, z)).sub(g.position), tent.localToWorld(V(s * tw / 2, 0, z)).sub(g.position), 0.008, ropeM);
    const patch = (s, u, v, w, h, col) => { const a = Math.atan2(th, tw / 2), x = s * tw / 2 * (1 - v), y = th * v; const o = part(tent, new THREE.PlaneGeometry(w, h), toon(col), [x + s * 0.003, y + 0.003, u], [0, s * Math.PI / 2, 0], null, { ink: false, shadow: false }); o.rotateX(-(Math.PI / 2 - a)); o.material.side = THREE.DoubleSide; };
    patch(1, -0.2, 0.45, 0.24, 0.2, 0x8a4f34); patch(1, 0.25, 0.3, 0.2, 0.18, 0x6f7449); patch(-1, 0.1, 0.5, 0.18, 0.16, 0x7a6a3c);
    const lan = new THREE.Group(); lan.position.set(0, th - 0.18, 0.05); tent.add(lan); part(lan, rbox(0.07, 0.1, 0.07, 0.01), iron); part(lan, rbox(0.055, 0.075, 0.055, 0.008), new THREE.MeshBasicMaterial({ color: 0xffc66a }), null, null, null, { ink: false, shadow: false });
    part(lan, new THREE.SphereGeometry(0.085, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffb04a, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }), null, null, null, { ink: false, shadow: false }); const ll = new THREE.PointLight(0xffb060, 0.4, 1.6, 2); lan.add(ll); seg(tent.localToWorld(V(0, th, 0.05)).sub(g.position), tent.localToWorld(V(0, th - 0.13, 0.05)).sub(g.position), 0.004, iron);
    const bucket = (par, p, s) => { const b = new THREE.Group(); b.position.copy(p); b.scale.setScalar(s); par.add(b); part(b, cyl(0.15, 0.18, 0.28, 16, true), wood, [0, 0.14, 0]); const bm = toon(0x6b4527); bm.side = THREE.DoubleSide; part(b, new THREE.CircleGeometry(0.15, 16).rotateX(-Math.PI / 2), bm, [0, 0.01, 0], null, null, { ink: false }); for (const y of [0.05, 0.23]) part(b, new THREE.TorusGeometry(0.155 + y * 0.1, 0.008, 6, 20), iron, [0, y, 0], [Math.PI / 2, 0, 0]);
      for (let q = 0; q < 9; q++) { const a = q / 9 * TAU, rr = 0.09 * Math.sqrt(r()); crystal(V(Math.cos(a) * rr, 0.25, Math.sin(a) * rr), 0.07 + r() * 0.04, [(r() - 0.5) * 0.8, 0, (r() - 0.5) * 0.8], b); } return b; };
    // small details: a bucket of crystals by the tent (no hammer, no loose rope on the deck)
    bucket(g, V(0.95, 0.07, LG.z0 + LG.D - 0.2), 0.8); /* no loose rope on the deck by the drill and the mining spot */
    LG.rocks.push(part(cliff, rockGeo(0.8, 0.9, 0.34, 4242, 0.05), rock, [LG.drill.x, LG.drill.y + 0.1, -0.17])); // rock boss the bit bites into, face at z ~ 0
    // Drill on the deck: the same stand hierarchy (no tripod legs), pitch 0° (level into the cliff vein). The Ledge Tether port sits on the yoke so the line stays vertical. The bit and the line are rebuilt per tier (setDrillGrade / setLineGrade).
    { const D = LG.drill, ore = ORES[LG.ore] || ORES.mithril, dr = new THREE.Group(); g.add(dr); LG.drillG = dr;
      drillMats(true);
      const stand = makeDrillStand('iron', { deck: true, pitch: 0, yaw: 0 });
      const Ltip = DRILL_ANG.bitLen; // at pitch 0 the tip is Ltip along -Z from the hub
      stand.position.set(D.x, D.y, D.tip + Ltip); dr.add(stand);
      LG.standG = stand; LG.portHold = stand.userData.tetherPort; LG.hubZ = D.tip + Ltip; LG.bitSocket = stand.userData.bitSocket;
      const bl = new THREE.PointLight(ore.spark, 0.6, 1.6, 2); bl.position.set(D.x, D.y, 0.2); g.add(bl); LG.biteL = bl;
      const vl = new THREE.PointLight(ore.glow, 0.08 + ore.gl * 0.5, 2.6, 2); vl.position.set(LG.char.x / LG.S + 0.1, 0.6, 0.45); g.add(vl); LG.veinL = vl;
      const N = 220, pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3)); pg.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
      const spM = new THREE.PointsMaterial({ vertexColors: true, size: 0.05, map: radial('rgba(255,255,255,1)', 'rgba(255,255,255,0)'), transparent: true, depthWrite: false, sizeAttenuation: true });
      const sp = new THREE.Points(pg, spM); sp.frustumCulled = false; g.add(sp); LG.sparks = { pts: sp, p: new Float32Array(N * 3), v: new Float32Array(N * 3), life: new Float32Array(N), col: new Float32Array(N * 3), N, acc: 0, rnd: prng(99), oreCol: new THREE.Color(ore.spark), bitCol: new THREE.Color(BIT_SPARK[LG.dg] || 0xffb35c) };
      // a streak layer (short line segments along each spark's velocity) so they read as sparks, not dots
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 6), 3)); const ls = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: ore.spark, transparent: true, opacity: 0.95, depthWrite: false })); ls.frustumCulled = false; g.add(ls); LG.sparks.lines = ls; LG.bite = V(D.x, D.y, D.tip + 0.01); }
    g.traverse((o) => { if (o.isMesh && o.material !== OUT) o.receiveShadow = true; }); g.scale.setScalar(LG.S); g.visible = false; LG.g = g; LG.cliff = cliff;
    buildVein(LG.ore); setDrillGrade(LG.dg); setLine(LG.tw); return g; }
  // Ledge Tether Drill per-frame: bit spin, energy along the flute, tier effects, the transfer pulse, bite flicker, ore-coloured sparks thrown back off the cliff
  function ledgeTick(dt) { if (!LEDGE || !LG.bit) return; if (LG.standG) { tickDrillAnim(LG.standG, dt); tickDrillLod(LG.standG.userData && LG.standG.userData.bit); } const on = LG.drillOn !== false; LG.spin = lerp(LG.spin || 0, on ? LG.drill.rps * TAU : 0, 1 - Math.exp(-dt * 3)); LG.bit.rotation.z -= LG.spin * dt; const t = clk;
    LG.enM.map.offset.x -= dt * 2.2 * (LG.spin / (LG.drill.rps * TAU) || 0); LG.zap.offset.set((t * 0.37) % 1, (t * 0.9) % 1);
    updatePickFx(LG.bit, t); const ln = LG.line; if (ln) { for (const fx of ln.userData.fx) { const u = fx.material.uniforms; u.uTime.value = t; u.uUp.value.set(0, 1, 0); u.uScale.value = R ? R.domElement.height / 2 : 400; } }
    if (LG.veinFx) { const u = LG.veinFx.material.uniforms; u.uTime.value = t; u.uUp.value.set(0, 1, 0); u.uScale.value = (R ? R.domElement.height / 2 : 400) * 2.2; }
    // transfer pulse: fades in while ore is moving, three soft beads climbing the Ledge Tether; gone when nothing moves
    if (ln) { const U = ln.userData, w = [strandLoad(t, 0), strandLoad(t, 1)], m1 = twinTick(U.main, t, dt, w); twinTick(U.tailCord, t, dt, w); LG.xl = Math.max(...U.main.userData.strands.map((x) => x.xl)); LG.moving = !!m1; }
    const st2 = document.getElementById('ledgeXferS'); if (st2) { const s = LG.moving ? 'moving ore' : 'idle'; if (st2.textContent !== s) st2.textContent = s; }
    const k = on ? 1 : 0, fl = 0.6 + 0.4 * Math.sin(t * 37) * Math.sin(t * 23); LG.biteL.intensity = k * (0.25 + 0.2 * fl); if (LG.biteGlow) { LG.biteGlow.scale.setScalar(0.85 + 0.3 * fl * k); LG.biteGlow.material.opacity = (0.5 + 0.5 * k * fl) * (ORES[LG.ore].gl + 0.1); }
    if (LG.bit && LG.bit.userData.tip && LEDGE) { LG.bit.userData.tip.getWorldPosition(LG.bite); LEDGE.worldToLocal(LG.bite); }
    if (LG.sparks) LG.sparks.bitCol.setHex(BIT_SPARK[LG.dg] || 0xffb35c);
    const S2 = LG.sparks, P = S2.p, Vv = S2.v, L = S2.life, r = S2.rnd, b = LG.bite, Cc = S2.col; S2.acc += dt * 260 * k * LG.spin / (LG.drill.rps * TAU);
    for (let i = 0; i < S2.N; i++) { if (L[i] <= 0 && S2.acc >= 1) { S2.acc -= 1; const a = r() * TAU, rr = 0.02 * r(); P[i * 3] = b.x + Math.cos(a) * rr; P[i * 3 + 1] = b.y + Math.sin(a) * rr; P[i * 3 + 2] = b.z + 0.01;
        const flash = r() < 0.2, cr = flash ? S2.bitCol : S2.oreCol; if (Cc) { Cc[i * 3] = cr.r; Cc[i * 3 + 1] = cr.g; Cc[i * 3 + 2] = cr.b; }
        const sp = 1.2 + r() * 2.4, th = r() * TAU, cone = 0.35 + r() * 1.0; Vv[i * 3] = Math.cos(th) * Math.sin(cone) * sp; Vv[i * 3 + 1] = Math.sin(th) * Math.sin(cone) * sp + 0.6; Vv[i * 3 + 2] = Math.cos(cone) * sp * 0.8; L[i] = 0.18 + r() * 0.4; }
      if (L[i] > 0) { L[i] -= dt; Vv[i * 3 + 1] -= 6.5 * dt; for (let j = 0; j < 3; j++) { Vv[i * 3 + j] *= Math.exp(-dt * 1.5); P[i * 3 + j] += Vv[i * 3 + j] * dt; } if (P[i * 3 + 2] < 0.01) { P[i * 3 + 2] = 0.01; Vv[i * 3 + 2] *= -0.4; } if (P[i * 3 + 1] < 0.08 && P[i * 3 + 2] > 0.06) L[i] = 0; } }
    const pa = S2.pts.geometry.attributes.position, la = S2.lines.geometry.attributes.position;
    for (let i = 0; i < S2.N; i++) { const live = L[i] > 0, x = live ? P[i * 3] : 0, y = live ? P[i * 3 + 1] : -50, z = live ? P[i * 3 + 2] : 0; pa.setXYZ(i, x, y, z); const s = 0.035; la.setXYZ(i * 2, x, y, z); la.setXYZ(i * 2 + 1, x - Vv[i * 3] * s, y - Vv[i * 3 + 1] * s, z - Vv[i * 3 + 2] * s); }
    pa.needsUpdate = true; la.needsUpdate = true; if (S2.col && S2.pts.geometry.attributes.color) { S2.pts.geometry.attributes.color.array.set(S2.col); S2.pts.geometry.attributes.color.needsUpdate = true; } lpTick(dt); }
  /* ---------- Hanging Camp play: she walks the portaledge deck, mines the ore vein and climbs the cliff, on the Playground's own walker / climb system.
     The camp is laid out in that system's wall frame (x along the cliff, y up, z out from it; the body 0.36 m off the rock) turned by yaw pi and offset onto the deck:
     world = rotY(pi) * frame + LP.off. The deck is the walkable ground (the drill, tent and rigging kept clear), the cliff above it the climbable wall. ---------- */
  const LP = { on: false, off: V(-0.67, 0.098, 0.3), BX: 0.6, BY1: 2.3, bnd: { X0: -1.2, X1: 0.66, Z0: -1.72, Z1: 0 }, mineZ: -0.85, hits: 0, tgt: null };
  const lpF2W = (q) => V(-q.x + LP.off.x, q.y + LP.off.y, -q.z + LP.off.z), lpW2F = (p) => V(LP.off.x - p.x, p.y - LP.off.y, LP.off.z - p.z);
  function lpObs() { const o = [], D = LG.drill, dx = LP.off.x - D.x * LG.S; for (const z of [0, -0.3, -0.6, -0.9, -1.15]) o.push({ x: dx, z, r: 0.17 }); return o; }
  function lpWalker(x, z, face) { return { ledge: true, x, z, face: face || 0, mv: 0, back: 0, cell: 0.1, bnd: Object.assign({}, LP.bnd), obs: lpObs() }; }
  function lpMineSpot() { const w = LG.cliff.localToWorld(LG.mineP.clone()), f = lpW2F(w); return { x: clamp(f.x, -LP.BX + 0.05, LP.BX - 0.05), z: LP.mineZ, w }; }
  function lpStart() { if (!LP.CL0) LP.CL0 = { BX: CL.BX, BY1: CL.BY1 }; CL.BX = LP.BX; CL.BY1 = LP.BY1; LP.on = true; st.yaw = Math.PI; st.yawV = 0; st.play = true; st.anim = 'climb'; st.pg = null; st.wantClimb = false; an.cl = null; an.tv = null; an.act = null; an.mw = 0;
    st.climbDir = 'stop'; st.climbAuto = false; LG.g.updateMatrixWorld(true); const m = lpMineSpot(); st.gnd = lpWalker(m.x, m.z, 0); st.gnd.mine = true; an.eq = { held: 'pick', seq: null, t: 0 }; LP.tgt = null; pgMark(null); const nt = document.querySelector('#ledgeInfo small'); if (nt) nt.textContent = 'Hanging Camp: tap the deck to walk, the vein to mine, the cliff to climb · drag to orbit'; }
  function lpStop() { if (!LP.on) return; LP.on = false; if (LP.CL0) { CL.BX = LP.CL0.BX; CL.BY1 = LP.CL0.BY1; } st.pg = null; st.gnd = null; an.cl = null; an.tv = null; an.act = null; pgMark(null); setAnim('idle'); }
  // tap: the vein -> walk to it and mine; the cliff -> walk to its foot, draw the picks and climb to the spot; the deck -> walk there
  const CV_HOOK = {};
  function ledgeTap(cx, cy) { if (!LP.on || !LEDGE) return null; cam.updateMatrixWorld(); LEDGE.updateMatrixWorld(true); const r = canvas.getBoundingClientRect(), nd = new THREE.Vector2((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); _ray.setFromCamera(nd, cam);
    const hits = _ray.intersectObject(LEDGE, true).filter((h) => h.object.visible && !h.object.isPoints && !h.object.isLine && h.object.material !== OUT), up = (o, a) => { for (let q = o; q; q = q.parent) if (q === a) return true; return false; }, m = lpMineSpot();
    let hit = null; // the first hit that decides: the vein, the cliff, the deck; thin things in the way (Ledge Tether, drill, rigging) are looked through; the tent falls back to the deck plane
    for (const h of hits) { if ((up(h.object, LG.veinG) && h.point.y < 1.4) || (up(h.object, LG.cliff) && h.point.distanceTo(m.w) < 0.5)) { hit = { x: m.x, z: m.z, mine: true, k: 'vein' }; break; }
      if (up(h.object, LG.cliff)) { const f = lpW2F(h.point); if (f.z < -0.25 || f.z > 0.6 || Math.abs(f.x) > LP.BX + 0.3) continue; /* rock beside, in front of or behind the climbing face (a camera swung into the rock sees its inside): look past it */ /* side rock jutting out beside or in front of the deck: look past it */ hit = f.y < 0.3 ? { x: clamp(f.x, LP.bnd.X0, LP.bnd.X1), z: -0.25, k: 'deck' } : { wall: true, x: clamp(f.x, -LP.BX, LP.BX), y: f.y, k: 'cliff' }; break; }
      if (up(h.object, LG.pf) || up(h.object, LG.tent)) break; }
    if (!hit) { const o = lpW2F(_ray.ray.origin), e = lpW2F(_ray.ray.origin.clone().add(_ray.ray.direction)).sub(o); if (Math.abs(e.z) > 1e-4) { const t = (CL.ZW - o.z) / e.z, f = o.clone().addScaledVector(e, t); if (t > 0 && f.y >= 0.3 && f.y < LP.BY1 + 1 && Math.abs(f.x) < LP.BX + 0.3) hit = { wall: true, x: clamp(f.x, -LP.BX, LP.BX), y: f.y, k: 'cliff' }; } } // the face plane itself
    if (!hit) { const d = _ray.ray.direction, o = _ray.ray.origin; if (d.y < -1e-4) { const t = (LP.off.y - o.y) / d.y, f = lpW2F(o.clone().addScaledVector(d, t)); if (f.x > LP.bnd.X0 - 0.6 && f.x < LP.bnd.X1 + 0.6 && f.z > LP.bnd.Z0 - 0.6 && f.z < 0.4) hit = { x: clamp(f.x, LP.bnd.X0, LP.bnd.X1), z: clamp(f.z, LP.bnd.Z0, -0.2), k: 'deck' }; } }
    if (!hit) return null; pgGo(hit); st.lastInput = clk; return hit; }
  function ledgeScreen(f) { cam.updateMatrixWorld(); const q = lpF2W(f).project(cam), r = canvas.getBoundingClientRect(); return { x: r.left + (q.x + 1) / 2 * r.width, y: r.top + (1 - q.y) / 2 * r.height }; }
  function lpCamTgt(dt) { if (!LP.on || !rig) return LG.tgt; const want = rig.root.position.clone().add(V(0, 0.9, 0)).lerp(LG.tgt, 0.3); if (!LP.tgt) LP.tgt = want.clone(); LP.tgt.lerp(want, st.paused ? 1 : 1 - Math.exp(-dt * 5)); return LP.tgt; }
  // mining sparks in the ore's colour, a burst off the vein at each pick strike
  function lpTick(dt) { if (!LEDGE) return; if (!LP.sp) { const N = 90, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 6), 3)); const ls = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false })); ls.frustumCulled = false; scene.add(ls);
      const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3)); const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.06, map: radial('rgba(255,255,255,1)', 'rgba(255,255,255,0)'), transparent: true, depthWrite: false })); pts.frustumCulled = false; scene.add(pts);
      LP.sp = { N, ls, pts, p: new Float32Array(N * 3), v: new Float32Array(N * 3), life: new Float32Array(N), rnd: prng(7) }; }
    const S2 = LP.sp, col = ORES[LG.ore].spark; S2.ls.visible = S2.pts.visible = st.ledge; S2.ls.material.color.setHex(col); S2.pts.material.color.setHex(col);
    const G = st.gnd, ph = st.minePh || 0, striking = LP.on && G && G.mine && an.act === 'mine'; if (striking && LP.ph0 !== undefined && LP.ph0 < 0.53 && ph >= 0.53) { LP.hits++; const o = LG.cliff.localToWorld(LG.mineP.clone()), n = LG.mineN.clone().transformDirection(LG.cliff.matrixWorld), r = S2.rnd; let k = 0;
      for (let i = 0; i < S2.N && k < 26; i++) { if (S2.life[i] > 0) continue; k++; S2.p.set([o.x + n.x * 0.03, o.y + n.y * 0.03, o.z + n.z * 0.03], i * 3); const sp = 1.4 + r() * 2.2, a = r() * TAU, c = 0.3 + r() * 0.9; S2.v.set([Math.cos(a) * Math.sin(c) * sp + n.x * sp * 0.6, Math.sin(a) * Math.sin(c) * sp + 0.8, n.z * sp * Math.cos(c) + 0.2], i * 3); S2.life[i] = 0.25 + r() * 0.35; } }
    LP.ph0 = striking ? ph : undefined; const pa = S2.pts.geometry.attributes.position, la = S2.ls.geometry.attributes.position; LP.live = 0;
    for (let i = 0; i < S2.N; i++) { const L = S2.life, P = S2.p, Vv = S2.v; if (L[i] > 0) { L[i] -= dt; Vv[i * 3 + 1] -= 7 * dt; for (let j = 0; j < 3; j++) P[i * 3 + j] += Vv[i * 3 + j] * dt; LP.live++; } const live = L[i] > 0, x = live ? P[i * 3] : 0, y = live ? P[i * 3 + 1] : -50, z = live ? P[i * 3 + 2] : 0; pa.setXYZ(i, x, y, z); la.setXYZ(i * 2, x, y, z); la.setXYZ(i * 2 + 1, x - Vv[i * 3] * 0.03, y - Vv[i * 3 + 1] * 0.03, z - Vv[i * 3 + 2] * 0.03); }
    pa.needsUpdate = la.needsUpdate = true; }
  function ledgeMode(on) { if (!R) return; if (on && !LEDGE) { LG.ore = ORES[S.ledgeOre] ? S.ledgeOre : 'mithril'; LG.dg = LGRADES[S.drillGrade] ? S.drillGrade : 'bronze'; LG.tw = twinOf(S.ledgeLine || (LGRADES[S.lineGrade] ? { grade: S.lineGrade, dir: 'in' } : null)); LG.lg = LG.tw.a.grade; LG.xfer = S.ledgeXfer || 'auto'; LEDGE = makeLedge(); ledgeUI(); const e = document.getElementById('ledgeOre'); if (e) e.textContent = ORES[LG.ore].name; scene.add(LEDGE); LG.bg = cv(8, 256, (g2, w, h) => { const gr = g2.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#dfe9f2'); gr.addColorStop(0.6, '#efe4d0'); gr.addColorStop(1, '#c9a87c'); g2.fillStyle = gr; g2.fillRect(0, 0, w, h); }); LG.bg0 = scene.background; }
    st.ledge = !!on; cam.fov = on ? 34 : 26; cam.updateProjectionMatrix(); if (LEDGE) LEDGE.visible = !!on; for (const fl of FLOOR) fl.visible = !on; if (LG.bg) scene.background = on ? LG.bg : LG.bg0; wrap.classList.toggle('ledge', !!on);
    const key = scene.children.find((o) => o.isDirectionalLight && o.castShadow); if (key) { Object.assign(key.shadow.camera, on ? { left: -3.8, right: 3.8, top: 4.2, bottom: -3.4, near: 0.5, far: 18 } : { left: -1.2, right: 1.2, top: 2, bottom: -0.4, near: 0.5, far: 8 }); key.shadow.camera.updateProjectionMatrix(); key.position.set(on ? 2.2 : 1.4, on ? 4.5 : 3.2, on ? 4.2 : 2.6); }
    if (on) { if (!st.orb) st.orb = { az: 0.62, el: 0.2, d: 7.6 }; if (!LP.on) lpStart(); } else lpStop(); }
  // is she free to walk here (so the shared follow camera is in charge)?
  // the farthest zoom at which the camera stays inside the Lumen Tree's hall at EVERY orbit angle and tilt, from her damped foot point: the user's zoom is clamped to it
  // (a hard limit on the zoom input, so orbiting / tilting never changes the distance and the camera never has to be pushed in)
    function trZoomCap(cf) { const ok = (d) => { for (let k = 0; k < 16; k++) { const az = k / 16 * TAU; for (const tl of [-0.12, 0.25, 0.7, TILT_MAX]) if (!trInside(camP(cf, d, tl, az, 1).P)) return false; } return true; };
    if (ok(DMAX)) return DMAX; let lo = 2.0, hi = DMAX; if (!ok(lo)) return lo; for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2; if (ok(m)) lo = m; else hi = m; } return lo; }
  function zoomCap() { return st.tree && st.orb && st.orb.fw ? (st.trCap ?? DMAX) : DMAX; }
  function freeCam() { return !!st.orb && ((st.ledge && LP.on) || st.tree || (st.home && HM.mode === 'in' && !!st.gnd)); }
  function bindInput() { const pts = new Map(); let pinch0 = 0, dist0 = 0;
    let tap0 = null; canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); tap0 = pts.size === 1 ? [e.clientX, e.clientY, performance.now(), st.yaw, st.tilt] : null; st.lastInput = clk; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); dist0 = (st.ledge || st.home || st.tree) && st.orb ? st.orb.d : st.dist; } });
    canvas.addEventListener('pointermove', (e) => { if (!pts.has(e.pointerId)) return; const pr = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); st.lastInput = clk;
      if (pts.size === 1 && (st.ledge || st.home || st.tree) && st.orb) { const dx = e.clientX - pr[0], dy = e.clientY - pr[1], fr = freeCam(); st.orb.az -= dx * (fr ? 0.011 : 0.009); st.orb.azV = -dx * (fr ? 0.011 : 0.009) / 0.016; if (fr) st.orb.tilt = clamp((st.orb.tilt || 0) + dy * 0.006, -0.12, TILT_MAX); else st.orb.el = clamp(st.orb.el + dy * 0.006, -0.35, 1.2); } else if (pts.size === 1) { const dx = e.clientX - pr[0], dy = e.clientY - pr[1]; st.yaw += dx * 0.011; st.yawV = dx * 0.011 / 0.016; if (!st.home && !st.ledge) st.tilt = clamp((st.tilt || 0) + dy * 0.006, -0.12, TILT_MAX); } else if (pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch0 > 0) { if (freeCam()) st.orb.d = clamp(dist0 * pinch0 / d, 2.0, zoomCap()); else if ((st.ledge || st.home) && st.orb) st.orb.d = clamp(dist0 * pinch0 / d, 2.4, 14); else st.dist = clamp(dist0 * pinch0 / d, 2.0, DMAX); } } });
    const up = (e) => { if (e.type === 'pointerup' && tap0 && st.tree && Math.hypot(e.clientX - tap0[0], e.clientY - tap0[1]) < 10 && performance.now() - tap0[2] < 600) { treeTap(e.clientX, e.clientY); } else if (e.type === 'pointerup' && tap0 && st.home && Math.hypot(e.clientX - tap0[0], e.clientY - tap0[1]) < 10 && performance.now() - tap0[2] < 600) { homeTap(e.clientX, e.clientY); } else if (e.type === 'pointerup' && tap0 && (st.play || st.anim === 'climb') && !st.ledge && !st.home && Math.hypot(e.clientX - tap0[0], e.clientY - tap0[1]) < 10 && performance.now() - tap0[2] < 600) { st.yaw = tap0[3]; st.yawV = 0; st.tilt = tap0[4]; if (WALLG) WALLG.rotation.y = st.yaw; pgGo(pgPick(e.clientX, e.clientY)); } else if (e.type === 'pointerup' && tap0 && st.ledge && LP.on && Math.hypot(e.clientX - tap0[0], e.clientY - tap0[1]) < 10 && performance.now() - tap0[2] < 600) { ledgeTap(e.clientX, e.clientY); } else if (e.type === 'pointerup' && tap0 && st.ledge && LP.on && Math.hypot(e.clientX - tap0[0], e.clientY - tap0[1]) < 10 && CV_HOOK.veinHold) { const h = ledgeTap(e.clientX, e.clientY); if (h && h.k === 'vein') CV_HOOK.veinHold(); } /* long press on the camp vein: its drill panel */ tap0 = null; pts.delete(e.pointerId); if (pts.size < 2) pinch0 = 0; }; canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); if (freeCam()) st.orb.d = clamp(st.orb.d * Math.exp(e.deltaY * 0.0012), 2.0, zoomCap()); else if (st.tree && st.orb) st.orb.d = clamp(st.orb.d * Math.exp(e.deltaY * 0.0012), 3, 26); else if (st.ledge && st.orb) st.orb.d = clamp(st.orb.d * Math.exp(e.deltaY * 0.0012), 3.2, 14); else st.dist = clamp(st.dist * Math.exp(e.deltaY * 0.0012), 2.0, DMAX); st.lastInput = clk; }, { passive: false });
    const cp = document.getElementById('charPick'); if (cp) { markPick();
      cp.addEventListener('click', (e) => { const ub = e.target.closest('[data-unequip]'); if (ub) { const id = typeof Craft !== 'undefined' && Craft.worn().pick; if (id && Craft.unequip(id)) { if (typeof toast === 'function') toast('🎒 ' + Craft.nm(id) + ' back in the backpack'); if (typeof save === 'function') save(); } markPick(); st.lastInput = clk; return; } const gb = e.target.closest('[data-gear]'); if (gb) { gear = gb.dataset.gear; markPick(); return; } const b = e.target.closest('[data-grade]'); if (!b) return; if (gear === 'pick') { if (typeof Craft !== 'undefined' && Craft.equipGrade) { Craft.equipGrade(b.dataset.grade); markPick(); } else { S.pickGrade = b.dataset.grade; setPick(S.pickGrade); } } /* a real equip: the old pickaxe goes back to the backpack */ else if (gear === 'climb') { S.climbGrade = b.dataset.grade; setClimb(S.climbGrade); } else { S.tetherGrade = b.dataset.grade; setTether(S.tetherGrade); } if (typeof save === 'function') save(); st.lastInput = clk; }); }
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
    if (st.ledge) { ledgeTick(dt); const o = orbDrift(dt); if (LP.on) { camPose(sceneFollow('ledge', dt), o.d, o.tilt || 0, o.az, 1, (q) => q.y > LP.off.y + 0.25); if (st.homeCam) st.homeCam(cam); } else { const t = lpCamTgt(dt), ce = Math.cos(o.el); cam.position.set(t.x + Math.sin(o.az) * ce * o.d, t.y + Math.sin(o.el) * o.d, t.z + Math.cos(o.az) * ce * o.d); cam.lookAt(t); } if (st.ledgeCam) st.ledgeCam(cam); updHV(); (st.noRender || R.render(scene, cam)); return; }
    if (st.tree) { treeTick(dt); const o = orbDrift(dt), cf = sceneFollow('tree', dt); st.trCap = trZoomCap(cf); if (o.d > st.trCap) o.d = st.trCap; camPose(cf, o.d, o.tilt || 0, o.az, 1); occFade(TR.occ, dt); TR.tgt = st.camLook; if (st.homeCam) st.homeCam(cam); updHV(); (st.noRender || R.render(scene, cam)); return; }
    if (st.home) { homeTick(dt); const o = orbDrift(dt); if (HM.mode === 'in' && st.gnd) { camPose(sceneFollow('home', dt), o.d, o.tilt || 0, o.az, 1); HM.tgt = st.camLook; } else { const want = V(HM.dx, 0.8, HM.FZ + 0.25), t = HM.tgt || (HM.tgt = want.clone()); t.lerp(want, st.paused ? 1 : 1 - Math.exp(-dt * 3)); const ce = Math.cos(o.el);
      cam.position.set(t.x + Math.sin(o.az) * ce * o.d, t.y + Math.sin(o.el) * o.d, t.z + Math.cos(o.az) * ce * o.d); cam.lookAt(t); } if (st.homeCam) st.homeCam(cam); const cp = cam.position, Wl = HM.walls; if (HM.ceil) HM.ceil.visible = HM.mode === 'in' && cp.y < HM.H - 0.05; homeLights(HM.mode === 'in'); if (Wl) { const nw = HM.mode === 'in' ? 0.45 : 0; /* near-wall culling: a wall the camera is at or beyond is cut away */ Wl.front.visible = !!(HM.mode === 'door' || cp.z < HM.FZ - nw || (HM.anim && HM.anim.walk)); Wl.left.visible = cp.x > -HM.W / 2 + nw; Wl.right.visible = cp.x < HM.W / 2 - nw; Wl.back.visible = cp.z > HM.BZ + nw; HM.door.visible = Wl.front.visible; for (const [m, sd] of HM.edge || []) m.visible = sd.every((k) => Wl[k].visible); for (const cd of HM.cordList || []) if (cd.userData.ext) cd.visible = HM.mode === 'door'; } if (HM.mode === 'in' && st.gnd) occFade(HM.occ || (HM.occ = homeOccList()), dt); else occFade(null, dt); updHV(); (st.noRender || R.render(scene, cam)); return; }
    if (st.faceCam) { rig.root.updateMatrixWorld(true); const h = rig.B.headC.getWorldPosition(V(0, 0, 0)), fc = st.faceCam; cam.position.set(h.x, h.y + (fc.dy || 0), h.z + fc.d); updHV(); cam.lookAt(h.x, h.y + (fc.ly || 0), h.z); (st.noRender || R.render(scene, cam)); return; }
    const cf = camFollow(dt); const pl = st.pl = (st.pl || 0) + ((st.play ? 1 : 0) - (st.pl || 0)) * (st.paused ? 1 : 1 - Math.exp(-dt * 3)); camPose(cf, st.dist, st.tilt || 0, 0, pl); if (st.camFn) st.camFn(cam, rig); updHV(); (st.noRender || R.render(scene, cam)); }
  // THE follow camera, shared by every scene she walks around in (Playground, Ledge interior, Lumen Tree, Hanging Camp): from her damped foot point cf, zoom dist, tilt offset and orbit azimuth az
  // (the Playground turns the world instead, so az = 0 there): the look target stays locked on her at every zoom, zooming out lifts and pulls back the same way, the tilt is the same;
  // pl = play blend (1 whenever she is free to move). Optional inside(p) pulls the camera in along the line to her until it is clear of walls / ceiling (interiors)
  function camP(cf, d, tilt, az, pl) { const z = clamp((4.1 - d) / 2.1, 0, 1), ty = lerp(0.84, 1.28, z), zo = ss(5.6, DMAX, d), L = V(cf.x, cf.y + ty - 0.55 * pl + zo * 2, cf.z);
      const hO = 0.18 + 0.1 * (1 - z) + 0.55 * pl + 0.3 * (d - 5.6) * zo + (1 - zo) * 0.55 * pl, dz = d + 1.4 * pl, rr = Math.hypot(hO, dz), e0 = Math.atan2(hO, dz), el = Math.min(Math.max(TILT_MAX, e0), e0 + tilt), ce = Math.cos(el) * rr;
      return { L, P: V(L.x + Math.sin(az) * ce, L.y + Math.sin(el) * rr, L.z + Math.cos(az) * ce) }; }
  function camPose(cf, dist, tilt, az, pl, inside) {
    const pose = (d) => camP(cf, d, tilt, az, pl);
    // interiors: the view pulls in along the SAME zoom curve to the farthest clear zoom (continuous in the requested zoom, so zooming never pops), and if even the closest
    // zoom is blocked the camera slides in along its ray; a pull-out after a sudden clearance is eased so it never jumps. Outside it is the plain Playground pose.
    let d = dist, ps = pose(d), fb = false; if (st.camKey !== inside) { st.camKey = inside; st.camDs = undefined; }
    if (inside && !inside(ps.P)) { const p0 = pose(2.0); if (inside(p0.P)) { let lo = 2.0, hi = dist; for (let i = 0; i < 16; i++) { const m = (lo + hi) / 2; if (inside(pose(m).P)) lo = m; else hi = m; } d = lo; } else { d = 2.0; fb = true; } }
    if (st.camDs === undefined || st.paused || d < st.camDs) st.camDs = d; else st.camDs = Math.min(d, st.camDs + Math.max(0.3, 0.08 * st.camDs, (d - st.camDs) * 0.18)); d = st.camDs; ps = pose(d);
    if (fb || (inside && !inside(ps.P))) { let L = ps.L; if (!inside(L)) { let lo = 0, hi = 1; const B0 = V(cf.x, cf.y + 0.6, cf.z); for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; if (inside(B0.clone().lerp(L, m))) lo = m; else hi = m; } L = B0.lerp(L, lo); }
      let lo = 0, hi = 1; for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2; if (inside(L.clone().lerp(ps.P, m))) lo = m; else hi = m; } ps = { L, P: L.clone().lerp(ps.P, lo) }; }
    cam.position.copy(ps.P); st.camPulled = 1 - ps.P.distanceTo(ps.L) / Math.max(1e-3, pose(dist).P.distanceTo(pose(dist).L)); st.camD = d; cam.lookAt(ps.L); st.camLook = ps.L; if (Math.abs(cam.fov - (26 + 10 * pl)) > 0.05) { cam.fov = 26 + 10 * pl; cam.updateProjectionMatrix(); } }
  // cutaway fade: whatever stands between the camera and her (furniture, wall fittings, roots...) fades to see-through instead of the camera being pushed in.
  // list = the scene's fade units (each fades whole); null restores everything. One fade state for every scene.
  const OCC_A = 0.18, _fr = new THREE.Raycaster();
  function occFade(list, dt) { const F = st.faded || (st.faded = new Map()), k = st.paused ? 1 : 1 - Math.exp(-dt * 10), hit = new Set();
    if (list !== st.fadeList) { for (const [u] of F) F.set(u, 0.999); st.fadeList = list; }
    if (list) { const tgt = rig.root.getWorldPosition(V(0, 0, 0)); tgt.y += 0.9; const dir = tgt.clone().sub(cam.position), dist = dir.length(); _fr.set(cam.position, dir.normalize()); _fr.camera = cam; _fr.near = 0; _fr.far = Math.max(0, dist - 0.3);
      if (_fr.far > 0) for (const h of _fr.intersectObjects(list, true)) { if (!h.object.isMesh) continue; let u = h.object; while (u.parent && !u.userData.occU) u = u.parent; if (u.userData.occU && u.visible) hit.add(u); } }
    for (const u of hit) if (!F.has(u)) F.set(u, 1);
    for (const [u, a] of F) { const want = hit.has(u) ? OCC_A : 1, na = a + (want - a) * k; F.set(u, na); const back = na > 0.99 && !hit.has(u);
      u.traverse((m) => { if (!(m.isMesh || m.isLine) || Array.isArray(m.material)) return; const ud = m.userData; if (!ud.mat0) { ud.mat0 = m.material; ud.matF = m.material.isShaderMaterial ? m.material : m.material.clone(); ud.matF.transparent = true; ud.matF.depthWrite = false; } /* shader materials fade through their own shared uF uniform */
        if (ud.matF.uniforms && ud.matF.uniforms.uF) ud.matF.uniforms.uF.value = back ? 1 : na;
        if (back) m.material = ud.mat0; else { m.material = ud.matF; ud.matF.opacity = (ud.mat0.opacity ?? 1) * na; } }); u.userData.occA = back ? 1 : na; if (back) F.delete(u); } }
  // the room's fade units: every piece of furniture / fitting that stands up off the floor (not the walls and ceiling - the cutaway hides those - nor rugs, floor or lines)
  function homeOccList() { const out = [], skip = new Set([...Object.values(HM.walls || {}), HM.ceil, HM.cords].filter(Boolean)), bb = new THREE.Box3();
    for (const c of HM.room.children) { if (skip.has(c) || c.isLight || c.isPoints || c.isSprite) continue; bb.setFromObject(c); if (bb.isEmpty() || bb.max.y < 0.45 || bb.max.y - bb.min.y < 0.2) continue; c.userData.occU = true; out.push(c); } return out; }
  // her damped foot point in a free-walk scene (same follow speed as the Playground's camFollow); snap on entry
  const CAM_FOLLOW = 8; // one follow speed for the Playground and every walkable scene
  function sceneFollow(key, dt) { const w = rig.root.getWorldPosition(V(0, 0, 0)), o = st.orb; if (!o.fw || st.camSnap || o.fwKey !== key) { o.fw = w.clone(); o.fwKey = key; st.camSnap = false; } else o.fw.lerp(w, st.paused ? 1 : 1 - Math.exp(-dt * CAM_FOLLOW)); return o.fw.clone(); }
  function orbDrift(dt) { const o = st.orb; if (!st.dragging) { o.az += (o.azV || 0) * dt; o.azV = (o.azV || 0) * Math.exp(-dt * 4); } return o; }
  // playground follow: the camera target chases the character in the wall's own frame (so an orbit turns the view about her instead of swinging her across it), damped so walking, running, climbing and rappelling never snap; then it is turned by the orbit yaw
  const TILT_MAX = 1.4; // camera elevation cap, ~10 deg off straight down
  function camFollow(dt) { const w = an.act === 'climb' ? (() => { const h = rig.B.hips.getWorldPosition(V(0, 0, 0)); return V(h.x, rig.root.position.y, h.z); })() : rig.root.position.clone(); w.applyAxisAngle(V(0, 1, 0), -st.yaw);
    const fw = st.camW || (st.camW = w.clone()); if (st.camSnap) { fw.copy(w); st.camSnap = false; } else fw.lerp(w, 1 - Math.exp(-dt * CAM_FOLLOW)); return (st.camF = fw.clone().applyAxisAngle(V(0, 1, 0), st.yaw)); }
  function updHV() { const hc = rig && rig.B.headC; if (!hc) return; rig.root.updateMatrixWorld(true); HVIEW.value.copy(cam.position); hc.worldToLocal(HVIEW.value); HVIEW.value.normalize(); }
  function renderAt(dt) { clk += dt; step(dt); }
  function start() { if (running || !st.ok) return; running = true; tPrev = 0; resize(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  // Explore (main map): her rig joins the map scene inside a metre-scale group; the map renders, this runs her walker + animation
  const CLIMB_EX = 0.6; // Explore wall-climb gait rate (was 1.63: borrowed the run's pace and looked frantic)
  // (Dominic: locked) climbing and the rope run at the old Ember Onyx set-up's rates for everyone, whatever look the gear wears (skins never change speed):
  // Explore wall climb CLIMB_EX x (1 + 0.08 x 7) = x1.56 (Ember Onyx picks were CGRADES tier 7); climbing outside Explore 1 + 0.05 x (7 + 1) = 1.40;
  // rappel / ascend 1 + 0.07 x 8 = 1.56 (the Ember Onyx tether was TGRADES tier 8): 0.9/0.81 x 1.56 = 1.73 m/s down, 0.9/0.97 x 1.56 = 1.45 m/s up
  const CLIMB_LOCK = { ex: 1 + 0.08 * 7, out: 1 + 0.05 * 8, teth: 1 + 0.07 * 8 };
  const climbFacFor = (explore) => (explore ? CLIMB_EX * CLIMB_LOCK.ex : CLIMB_LOCK.out);
  const climbSpeeds = () => ({ ex: climbFacFor(true), out: climbFacFor(false), teth: CLIMB_LOCK.teth, down: (TV.hop / TV.hopT) * CLIMB_LOCK.teth, up: (TV.aD / TV.aT) * CLIMB_LOCK.teth, picks: rig && rig.built.climb ? rig.built.climb.R.userData.grade : null, tether: rig && rig.built.tethers && rig.built.tethers[0] ? rig.built.tethers[0].grp.userData.grade : null });
  const EXK = 1.18; // Explore body scale (character scale on the map)
function exploreOn(par, x, z, face, hy) { if (!R && !initGL()) return null; setChar(S.charSex === 'f' ? 'f' : 'm'); if (st.tree) treeMode(false); if (st.home) homeMode(false); if (st.ledge) ledgeMode(false); stop(); st.explore = true; st.play = false; st.pg = null; pgMark(null); st.anim = 'idle'; st.yaw = 0; st.yawV = 0; st.tool = 'none'; an.eq = { held: 'none', seq: null, t: 0 }; an.cl = null; an.tv = null; an.act = null;
    par.add(rig.root); rig.root.scale.setScalar(EXK); /* on the map she stands ~0.13 m under the top of her Ledge door set (1.91 m vs 2.04 m) */ rig.root.traverse((o) => { if (o.isMesh) { if (o.userData.rs0 === undefined) o.userData.rs0 = o.receiveShadow; o.receiveShadow = false; for (const m of [].concat(o.material)) if (m.toneMapped) { m.toneMapped = false; m.userData.tm0 = 1; m.needsUpdate = true; } } }); // the map's km-scale shadow map would stripe her (acne); the map's ACES grade would wash her out, so she keeps her own colours
    st.gnd = { home: true, explore: true, x, z, y: hy(x, z), face, mv: 0, back: 0, bnd: { X0: -1e5, X1: 1e5, Z0: -1e5, Z1: 1e5 }, obs: [], hy }; st.exCf = V(x, st.gnd.y, z); return st.gnd; }
  function exploreOff() { if (!st.explore) return; st.explore = false; st.gnd = null; if (rig) { scene.add(rig.root); rig.root.scale.setScalar(1); rig.root.position.set(0, 0, 0); rig.root.rotation.y = 0; rig.root.traverse((o) => { if (o.isMesh && o.userData.rs0 !== undefined) o.receiveShadow = o.userData.rs0; if (o.isMesh) for (const m of [].concat(o.material)) if (m.userData.tm0) { m.toneMapped = true; m.userData.tm0 = 0; m.needsUpdate = true; } }); } st.tool = S.toolMode === 'climb' ? 'climb' : 'pick'; an.eq = null; an.act = null; }
  function exploreStep(dt) { const G = st.gnd; if (!st.explore || !G) return; clk += dt; st.frames++; st.yaw = 0; const par = rig.root.parent, s0 = par ? par.scale.x : 1; if (par) { par.scale.setScalar(1); par.updateMatrixWorld(true); } animate(rig, clk, dt); if (par) { par.scale.setScalar(s0); par.updateMatrixWorld(true); } /* the limb IK works in metres: solve the pose unscaled (bone rotations do not depend on the group scale), then show her at map scale */ if (!G.exC) G.y += (G.hy(G.x, G.z) - G.y) * (1 - Math.exp(-dt * 14)); const k = 1 - Math.exp(-dt * CAM_FOLLOW), c = st.exCf; /* the same tight follow as every walkable scene */ c.x += (G.x - c.x) * k; c.y += (G.y - c.y) * k; c.z += (G.z - c.z) * k; }
  function exploreCam(d, tilt, az) { return camP(st.exCf, d, tilt, az, 1); }
  function show(mode) { if (st.explore && typeof Explore !== 'undefined') Explore.exit(); wrap = document.getElementById('charWrap'); wrap.classList.remove('hidden'); st.visible = true; if (!R && !initGL()) return; const sex = S.charSex === 'f' ? 'f' : 'm'; if (st.tool === undefined) { st.tool = S.toolMode === 'climb' ? 'climb' : 'pick'; an.eq = null; setTool(st.tool, true); } setChar(sex); if (st.gait === undefined) { st.gait = 'run'; document.querySelectorAll('#charClimb [data-gait]').forEach((b) => b.classList.toggle('on', b.dataset.gait === st.gait)); } if (mode !== 'tree' && st.tree) { treeMode(false); setAnim('idle'); } if (mode === 'home') homeMode(true); else if (st.home) { homeMode(false); setAnim('idle'); } if (mode === 'ledge') ledgeMode(true); else if (st.ledge) { ledgeMode(false); setAnim('idle'); } if (mode === 'tree') treeMode(true); resize(); start(); }
  function hide() { if (st.tree) { treeMode(false); setAnim('idle'); } if (st.home) { homeMode(false); setAnim('idle'); } const w = document.getElementById('charWrap'); if (w) w.classList.add('hidden'); st.visible = false; stop(); }
  window.addEventListener('resize', () => { if (running) resize(); });
  /* ---------- Home: the delver's door in the cliff (Ledge Tether ports) and the room behind it ---------- */
  // frame: door in the front wall plane z = HM.FZ, interior x in [-HM.W/2, HM.W/2], z in [HM.BZ, HM.FZ]; exterior ledge shelf in front (z > HM.FZ)
  const HM = { W: 7.2, BZ: -2.8, FZ: 2.8, H: 2.6, dw: 0.92, dh: 1.55, dx: -1.5, pc: 0.86, ring: 0.3, mode: null, open: 0, ports: null, sel: 'c', g: null, ext: null, room: null, obs: [] };
  const PORTS = ['c', 'p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
  function homeState() { if (typeof S === 'undefined' || !S) return { ports: {}, open: 0 }; if (!S.home) S.home = { ports: {}, open: 0, tv: 2 }; return S.home; } // open: how many of the 8 small ports are unlocked
  function portPos(id) { if (id === 'c') return V(0, HM.pc, 0); const i = +id.slice(1), a = Math.PI / 2 - i * TAU / 8; return V(Math.cos(a) * HM.ring, HM.pc + Math.sin(a) * HM.ring * 1.12, 0); }
  function woodTex(base, dark, seed, n = 6) { const r = prng(seed); return cv(128, 256, (x, w, h) => { x.fillStyle = base; x.fillRect(0, 0, w, h); for (let k = 0; k < n; k++) { const x0 = k * w / n; x.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.08})`; x.fillRect(x0, 0, w / n, h); x.fillStyle = dark; x.fillRect(x0, 0, 1.5, h); for (let i = 0; i < 9; i++) { x.strokeStyle = `rgba(40,20,8,${0.12 + r() * 0.15})`; x.lineWidth = 1; x.beginPath(); const xx = x0 + 3 + r() * (w / n - 6); x.moveTo(xx, 0); x.bezierCurveTo(xx + (r() - 0.5) * 8, h * 0.3, xx + (r() - 0.5) * 8, h * 0.7, xx, h); x.stroke(); } } }); }
  function archShape(w, h, inset = 0) { const s = new THREE.Shape(), hw = w / 2 - inset, r = hw, yb = inset, yt = h - inset - r; s.moveTo(-hw, yb); s.lineTo(hw, yb); s.lineTo(hw, yt); s.absarc(0, yt, r, 0, Math.PI, false); s.lineTo(-hw, yb); return s; }
  // the door leaf (both faces): planks, iron band, studs, hinges, iron handle, brass ports. Built in its own frame: hinge line at x = +dw/2, outward face +z
  // the Ledge front door with its timber surround (arched frame, lintel awning on brackets, threshold) exactly as on the Ledge tab, origin at the door's foot
  function makeDoorSet() { const g = new THREE.Group(), d = makeDoor(), th = 0.07, wd = toon(0x7a4c2a), wdD = toon(0x5c381e), W0 = HM.dw, H0 = HM.dh; g.add(d);
    const fr = archShape(W0 + 0.34, H0 + 0.17); fr.holes.push(new THREE.Path(archShape(W0 + 0.06, H0 + 0.03).getPoints(40))); part(g, new THREE.ExtrudeGeometry(fr, { depth: 0.08, bevelEnabled: false, curveSegments: 24 }), wd, [0, 0, th / 2 - 0.06]);
    part(g, rbox(W0 + 1.1, 0.14, 0.42, 0.02), wd, [0, H0 + 0.42, th / 2 + 0.19]); for (const sx of [-1, 1]) part(g, rbox(0.1, 0.36, 0.3, 0.015), wdD, [sx * (W0 / 2 + 0.36), H0 + 0.2, th / 2 + 0.14], [-0.5, 0, 0]);
    part(g, rbox(W0 + 0.06, 0.16, 0.06, 0.01), wdD, [0, 0.08, th / 2 + 0.02]); return g; }
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
    // ports: centre (brass, glowing blue Ledge Tether socket) + 8 small rings; exterior padlocks on the locked ones
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
  // a thick twisted Ledge Tether cord along a path (strands + glowing core + pulse beads) in the grade's look
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
      const rm = [toon(0x5d5852), toon(0x524d48), toon(0x67615a), toon(0x48443f)]; for (let z = HM.BZ + 0.1; z < HM.FZ; z += 0.42 + r() * 0.18) for (let y = 0.15; y < H + 0.9; y += 0.42 + r() * 0.22) { if (Math.hypot(z - HMP.vault.z, y - HMP.vault.y) < 1.2) continue; const s = 0.3 + r() * 0.14;
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
  // ornate rug: guard stripes, a main border of repeating rosettes and vine, corner spandrels, a lobed layered medallion, scattered field motifs, wear
  function rugTex(seed, field, border, accent, a2 = '#2f4f72', a3 = '#d9c7a0') { const r = prng(seed); return cv(512, 320, (x, w, h) => { const band = (i, c) => { x.fillStyle = c; x.fillRect(i, i, w - 2 * i, h - 2 * i); };
      band(0, a3); band(5, border); band(12, a3); band(15, accent); band(18, border); band(54, a3); band(57, accent); band(60, field);
      const ros = (cx, cy, R, c1, c2) => { x.fillStyle = c1; for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; x.beginPath(); x.ellipse(cx + Math.cos(a) * R * 0.55, cy + Math.sin(a) * R * 0.55, R * 0.42, R * 0.2, a, 0, TAU); x.fill(); } x.fillStyle = c2; x.beginPath(); x.arc(cx, cy, R * 0.35, 0, TAU); x.fill(); };
      x.strokeStyle = a3; x.lineWidth = 2; for (const [y0, hz] of [[36, true], [h - 36, true]]) { x.beginPath(); for (let px = 20; px <= w - 20; px += 4) { const py = y0 + Math.sin(px / 18) * 8; px === 20 ? x.moveTo(px, py) : x.lineTo(px, py); } x.stroke(); for (let px = 40; px < w - 30; px += 36) ros(px, y0, 12, accent, a2); }
      for (const x0 of [36, w - 36]) { x.beginPath(); for (let py = 20; py <= h - 20; py += 4) { const px = x0 + Math.sin(py / 18) * 8; py === 20 ? x.moveTo(px, py) : x.lineTo(px, py); } x.stroke(); for (let py = 76; py < h - 60; py += 36) ros(x0, py, 12, accent, a2); }
      for (const [cx, cy, sx, sy] of [[60, 60, 1, 1], [w - 60, 60, -1, 1], [60, h - 60, 1, -1], [w - 60, h - 60, -1, -1]]) { x.fillStyle = border; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + sx * 90, cy); x.quadraticCurveTo(cx + sx * 40, cy + sy * 20, cx, cy + sy * 70); x.closePath(); x.fill(); ros(cx + sx * 26, cy + sy * 22, 10, accent, a3); }
      x.save(); x.translate(w / 2, h / 2); for (const [R, c] of [[118, border], [100, a3], [94, accent], [72, a2], [52, field], [36, accent], [18, a3]]) { x.fillStyle = c; x.beginPath(); for (let k = 0; k <= 64; k++) { const a = k / 64 * TAU, rr = R * (1 + 0.12 * Math.cos(a * 8)); const px = Math.cos(a) * rr * 1.35, py = Math.sin(a) * rr * 0.78; k ? x.lineTo(px, py) : x.moveTo(px, py); } x.fill(); }
      for (const s of [-1, 1]) { x.fillStyle = border; x.beginPath(); x.moveTo(s * 150, 0); x.lineTo(s * 190, -22); x.lineTo(s * 205, 0); x.lineTo(s * 190, 22); x.closePath(); x.fill(); ros(s * 190, 0, 9, accent, a3); } x.restore();
      for (let i = 0; i < 40; i++) { const px = 70 + r() * (w - 140), py = 70 + r() * (h - 140); if (Math.hypot((px - w / 2) / 1.35, (py - h / 2) / 0.78) < 150) continue; ros(px, py, 5 + r() * 3, r() < 0.5 ? accent : a3, a2); }
      for (let i = 0; i < 2500; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,230,190'},${r() * 0.07})`; x.fillRect(r() * w, r() * h, 2, 1); } }); }
  function wallLantern(g, p, ry = 0, hang = false) { const ln = new THREE.Group(); ln.position.copy(p); ln.rotation.y = ry; g.add(ln); const ir = toon(0x2e2f33);
    if (hang) part(ln, cyl(0.006, 0.006, 0.5, 5), ir, [0, 0.42, 0]); else { part(ln, rbox(0.05, 0.16, 0.03, 0.008), ir, [0, 0.16, -0.16]); part(ln, rbox(0.02, 0.02, 0.18, 0.006), ir, [0, 0.24, -0.08]); part(ln, cyl(0.004, 0.004, 0.06, 5), ir, [0, 0.21, 0]); }
    part(ln, new THREE.ConeGeometry(0.075, 0.07, 6), ir, [0, 0.15, 0]); part(ln, new THREE.TorusGeometry(0.012, 0.004, 5, 10), ir, [0, 0.195, 0]); part(ln, cyl(0.055, 0.055, 0.14, 6, true), new THREE.MeshBasicMaterial({ color: 0xffc66a, side: THREE.DoubleSide }), [0, 0.05, 0], null, null, { ink: false, shadow: false });
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; part(ln, rbox(0.01, 0.15, 0.01, 0.002), ir, [Math.cos(a) * 0.057, 0.05, Math.sin(a) * 0.057]); } part(ln, cyl(0.07, 0.06, 0.025, 6), ir, [0, -0.03, 0]); part(ln, new THREE.SphereGeometry(0.02, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff1c0 }), [0, 0.04, 0], null, null, { ink: false, shadow: false });
    const gl = part(ln, new THREE.PlaneGeometry(0.75, 0.75), new THREE.MeshBasicMaterial({ map: radial('rgba(255,196,110,.75)', 'rgba(255,150,60,.16)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), [0, 0.05, 0.08], null, null, { ink: false, shadow: false }); gl.renderOrder = 3;
    const pl = new THREE.PointLight(0xffa04a, 0.32, 3.2, 1.8); pl.position.set(0, 0.05, 0.2); ln.add(pl); (HM.inLights = HM.inLights || []).push(pl); return ln; }
  function plant(g, p, s = 1, kind = 0) { const pg = new THREE.Group(); pg.position.copy(p); pg.scale.setScalar(s); g.add(pg); const pot = toon(0x9c5432), potD = toon(0x7c3e22); part(pg, cyl(0.1, 0.14, 0.2, 14), pot, [0, 0.1, 0]); part(pg, cyl(0.15, 0.15, 0.035, 14), potD, [0, 0.2, 0]); part(pg, cyl(0.13, 0.13, 0.01, 14), toon(0x3a2616), [0, 0.215, 0], null, null, { ink: false });
    const lm = [toon(0x557d32), toon(0x3f6a2a), toon(0x6d9440)], r = prng(Math.round(p.x * 100 + p.z * 7 + 99)); const n = kind ? 12 : 8; for (let i = 0; i < n; i++) { const a = i / n * TAU + r(), L = (kind ? 0.12 : 0.2) + r() * 0.08, l = part(pg, ell(kind ? 0.025 : 0.05, L, 0.012), lm[i % 3], [Math.cos(a) * 0.05, 0.22 + L * 0.8, Math.sin(a) * 0.05]); l.rotation.order = 'YXZ'; l.rotation.set(0.35 + r() * 0.5, -a + Math.PI / 2, 0); } return pg; }
  function furnishRoom(g) { HM.obs = []; const W = HM.W, r = prng(64), wood = toon(0x6e4426), woodD = toon(0x4e301b), woodL = toon(0x8a5a32), iron = toon(0x45474b), ironD = toon(0x34363a), brass = toon(0xb8873a);
    // vault (2a / 2b / 3): a massive round iron door set in a stone-and-iron collar in the cliff rock. Stepped concentric faces (rim, riveted band,
    // inner plate, hub), a ring of big domed rivets, locking-bolt lugs round the rim, two heavy hinge blocks with pins on the left, a lever handle on
    // the right, and a thick brass porthole hub in the middle where the Ledge Tether plugs in. A lantern each side and a warm fill keep it readable.
    { const v = new THREE.Group(); v.position.copy(HMP.vault); v.rotation.y = Math.PI / 2; g.add(v); HM.vault = v; const vI = toon(0x6e7075), vD = toon(0x45474c), vL = toon(0x8a8c90), stn = toon(0x6a645c), rv = toon(0x8a8a86);
      // stone collar: wedge blocks in a ring, an iron frame ring inside it
      for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; part(v, rbox(0.34, 0.2, 0.16, 0.04, 3), toon([0x6a645c, 0x5d5852, 0x726b62, 0x625c55][i % 4]), [Math.cos(a) * 0.98, Math.sin(a) * 0.98, 0.0], [0, 0, a + Math.PI / 2]); }
      part(v, cyl(0.92, 0.92, 0.06, 48).rotateX(Math.PI / 2), toon(0x1d1b1a), [0, 0, -0.02], null, null, { ink: false });
      part(v, new THREE.TorusGeometry(0.86, 0.055, 10, 56), vD, [0, 0, 0.05]);
      // the door: one lathed stepped face (rim bevel -> riveted band -> recessed plate -> raised inner ring -> hub boss)
      const prof = [[0, 0.17], [0.15, 0.17], [0.17, 0.155], [0.3, 0.15], [0.33, 0.175], [0.37, 0.175], [0.4, 0.15], [0.52, 0.14], [0.55, 0.165], [0.66, 0.165], [0.7, 0.14], [0.79, 0.11], [0.81, 0.07], [0.81, 0.0]];
      part(v, lathe(prof.slice().reverse(), 56).rotateX(Math.PI / 2), vI, [0, 0, 0]);
      part(v, new THREE.TorusGeometry(0.605, 0.022, 8, 56), vL, [0, 0, 0.17]); part(v, new THREE.TorusGeometry(0.35, 0.018, 8, 40), vL, [0, 0, 0.178]);
      for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; part(v, new THREE.SphereGeometry(0.03, 10, 6, 0, TAU, 0, Math.PI / 2).rotateX(Math.PI / 2), rv, [Math.cos(a) * 0.73, Math.sin(a) * 0.73, 0.125], null, null, { ink: false }); }
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + 0.13; part(v, new THREE.SphereGeometry(0.022, 8, 5, 0, TAU, 0, Math.PI / 2).rotateX(Math.PI / 2), rv, [Math.cos(a) * 0.46, Math.sin(a) * 0.46, 0.145], null, null, { ink: false }); }
      // radial iron straps across the plate, riveted
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.PI / 6; const s = part(v, rbox(0.15, 0.06, 0.03, 0.01), vD, [Math.cos(a) * 0.45, Math.sin(a) * 0.45, 0.16], [0, 0, a]); s.userData.strap = 1; }
      // locking-bolt lugs round the rim, poking into the collar
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + Math.PI / 8; part(v, rbox(0.13, 0.07, 0.06, 0.015), vL, [Math.cos(a) * 0.83, Math.sin(a) * 0.83, 0.1], [0, 0, a]); }
      // hinge blocks + pins (left), lever handle on a boss (right)
      for (const y of [-0.36, 0.36]) { part(v, rbox(0.26, 0.2, 0.14, 0.03), vD, [-0.84, y, 0.11]); part(v, cyl(0.05, 0.05, 0.28, 14), vL, [-0.95, y, 0.14]); for (const s of [-1, 1]) part(v, new THREE.SphereGeometry(0.018, 8, 5), rv, [-0.8, y + s * 0.06, 0.185], null, null, { ink: false }); }
      part(v, cyl(0.07, 0.07, 0.06, 18).rotateX(Math.PI / 2), vD, [0.6, 0, 0.2]); part(v, rbox(0.05, 0.3, 0.05, 0.02), vL, [0.6, -0.12, 0.25]); part(v, new THREE.SphereGeometry(0.04, 10, 8), vL, [0.6, -0.28, 0.25]);
      part(v, rbox(0.08, 0.22, 0.05, 0.02), vD, [0.66, 0.24, 0.17]); part(v, new THREE.TorusGeometry(0.06, 0.015, 6, 18, Math.PI), vL, [0.7, 0.24, 0.2], [0, 0, -Math.PI / 2]);
      // porthole hub: thick brass ring, glass-dark socket, bolt ring
      const brass2 = toon(0xc0903e); part(v, cyl(0.2, 0.2, 0.08, 32).rotateX(Math.PI / 2), vD, [0, 0, 0.18]); part(v, new THREE.TorusGeometry(0.14, 0.045, 12, 32), brass2, [0, 0, 0.22]);
      part(v, new THREE.CircleGeometry(0.1, 24), new THREE.MeshBasicMaterial({ color: 0x0b1530 }), [0, 0, 0.215], null, null, { ink: false });
      for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; part(v, new THREE.SphereGeometry(0.017, 6, 5), brass2, [Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0.225], null, null, { ink: false }); }
      // light: a warm fill in front, a lantern on the far side to match the near one
      const vf = new THREE.PointLight(0xffc27a, 1.1, 3.6, 1.4); vf.position.set(0.3, 0.45, 1.4); v.add(vf); (HM.inLights = HM.inLights || []).push(vf); HM.vaultLight = vf; }
    wallLantern(g, V(-W / 2 + 0.32, 1.6, HMP.vault.z - 1.25), Math.PI / 2);
    // arched plank door in the back wall (left), iron strap hinges and ring pull
    { const d = new THREE.Group(); d.position.set(-2.45, 0, HM.BZ + 0.02); g.add(d); const fr = archShape(1.06, 2.0); fr.holes.push(new THREE.Path(archShape(0.86, 1.9).getPoints(30))); part(d, new THREE.ExtrudeGeometry(fr, { depth: 0.1, bevelEnabled: false, curveSegments: 20 }), woodD, [0, 0, 0]);
      const pl = plankTex(41, [118, 74, 42]); pl.rotation = Math.PI / 2; pl.repeat.set(0.6, 1); part(d, new THREE.ShapeGeometry(archShape(0.86, 1.9), 20), toon(0xffffff, pl), [0, 0, 0.04]); { const geo = d.children[1].geometry, P = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < P.count; i++) uv.setXY(i, P.getX(i) / 0.86 + 0.5, P.getY(i) / 1.9); }
      for (const y of [0.45, 1.35]) part(d, rbox(0.6, 0.06, 0.02, 0.01), ironD, [-0.12, y, 0.055]); part(d, new THREE.TorusGeometry(0.05, 0.01, 6, 14), ironD, [0.3, 0.95, 0.07]); part(d, rbox(0.86, 0.1, 0.05, 0.01), woodD, [0, 1.05, 0.05]); }
    // grand bed along the right wall, head to the wall: turned posts with finials, a tall carved arched headboard with raised panels and a rosette crest,
    // panelled footboard, plump mattress, a layered patchwork quilt with a red border and gold piping, a folded sheet, big pillows and a cushion, a fur throw at the foot, a bedside chest
    { const b = new THREE.Group(); b.position.set(W / 2 - 1.0, 0, 0.75); b.rotation.y = -Math.PI / 2; g.add(b); HM.bed = b; const L = 1.95, Wb = 1.15, wC = toon(0x5a3820), wL = toon(0x7d5130), gold = toon(0xc9963e), red = toon(0x7a2420), redD = toon(0x5a1a18), cream = toon(0xeadcbf), qt = quiltTex();
      const post = (h) => lathe([[0.001, 0], [0.065, 0], [0.065, 0.28], [0.082, 0.31], [0.05, 0.36], [0.045, 0.62], [0.07, 0.66], [0.045, 0.7], [0.04, h - 0.2], [0.062, h - 0.16], [0.04, h - 0.11], [0.05, h - 0.06], [0.001, h - 0.06]], 14);
      for (const [x, z, h] of [[-Wb / 2, -L / 2, 1.72], [Wb / 2, -L / 2, 1.72], [-Wb / 2, L / 2, 1.05], [Wb / 2, L / 2, 1.05]]) { part(b, post(h), wC, [x, 0, z]); part(b, new THREE.SphereGeometry(0.06, 12, 8), wC, [x, h + 0.01, z]); part(b, new THREE.SphereGeometry(0.022, 8, 6), gold, [x, h + 0.08, z]); }
      { const s = new THREE.Shape(), hw = Wb / 2 - 0.03; s.moveTo(-hw, 0); s.lineTo(hw, 0); s.lineTo(hw, 0.9); s.quadraticCurveTo(hw * 0.5, 0.95, 0.2, 1.08); s.quadraticCurveTo(0, 1.2, -0.2, 1.08); s.quadraticCurveTo(-hw * 0.5, 0.95, -hw, 0.9); s.lineTo(-hw, 0);
        part(b, new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 16 }), wL, [0, 0.42, -L / 2 - 0.03]);
        for (const x of [-0.34, 0, 0.34]) { part(b, new THREE.ShapeGeometry(archShape(0.27, x === 0 ? 0.66 : 0.56), 12), wC, [x, 0.55, -L / 2 + 0.045], null, null, { ink: false }); part(b, new THREE.ShapeGeometry(archShape(0.21, x === 0 ? 0.6 : 0.5), 12), wL, [x, 0.58, -L / 2 + 0.05]); }
        part(b, new THREE.TorusGeometry(0.06, 0.016, 6, 16), gold, [0, 1.47, -L / 2 + 0.05]); part(b, new THREE.SphereGeometry(0.035, 10, 8), gold, [0, 1.47, -L / 2 + 0.055]); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; part(b, ell(0.03, 0.012, 0.008), gold, [Math.cos(a) * 0.1, 1.47 + Math.sin(a) * 0.1, -L / 2 + 0.05], [0, 0, a]); } }
      part(b, rbox(Wb, 0.44, 0.06, 0.02), wL, [0, 0.52, L / 2]); part(b, rbox(Wb + 0.06, 0.06, 0.1, 0.02), wC, [0, 0.76, L / 2]); for (const x of [-0.28, 0.28]) part(b, rbox(0.4, 0.28, 0.02, 0.02), wC, [x, 0.52, L / 2 + 0.035]); part(b, new THREE.SphereGeometry(0.03, 8, 6), gold, [0, 0.52, L / 2 + 0.05]);
      for (const s of [-1, 1]) part(b, rbox(0.06, 0.2, L, 0.02), wC, [s * Wb / 2, 0.32, 0]); part(b, rbox(Wb - 0.04, 0.1, L - 0.06, 0.02), wC, [0, 0.27, 0]);
      part(b, rbox(Wb - 0.05, 0.22, L - 0.08, 0.08), cream, [0, 0.43, 0]);
      part(b, rbox(Wb + 0.16, 0.06, L * 0.72, 0.03), red, [0, 0.555, 0.24]); part(b, rbox(Wb + 0.08, 0.07, L * 0.66, 0.03), toon(0xffffff, qt), [0, 0.575, 0.24]); for (const s of [-1, 1]) { part(b, rbox(0.012, 0.012, L * 0.66, 0.005), gold, [s * (Wb / 2 + 0.045), 0.61, 0.24], null, null, { ink: false }); part(b, rbox(0.04, 0.3, L * 0.72, 0.02), toon(0xffffff, qt), [s * (Wb / 2 + 0.07), 0.43, 0.24]); part(b, rbox(0.05, 0.07, L * 0.72, 0.02), red, [s * (Wb / 2 + 0.075), 0.26, 0.24]); part(b, rbox(0.054, 0.012, L * 0.72, 0.004), gold, [s * (Wb / 2 + 0.077), 0.3, 0.24], null, null, { ink: false }); }
      part(b, rbox(Wb + 0.1, 0.06, 0.22, 0.03), cream, [0, 0.6, -0.2]); part(b, rbox(Wb + 0.11, 0.02, 0.04, 0.01), toon(0x2f4f72), [0, 0.63, -0.16], null, null, { ink: false });
      for (const x of [-0.27, 0.27]) part(b, ell(0.29, 0.11, 0.17), toon(0xf4ead6), [x, 0.66, -L / 2 + 0.3], [-0.45, x * 0.4, 0]); part(b, ell(0.22, 0.1, 0.15), toon(0xe6d6b6), [0, 0.7, -L / 2 + 0.38], [-0.4, 0, 0]);
      part(b, ell(0.17, 0.11, 0.06), toon(0x2f4f72), [0, 0.7, -L / 2 + 0.52], [-0.55, 0, 0]); part(b, new THREE.TorusGeometry(0.16, 0.008, 4, 24).scale(1.05, 0.62, 1), gold, [0, 0.7, -L / 2 + 0.55], [-0.55, 0, 0], null, { ink: false });
      { const fg = ell(Wb / 2 + 0.14, 0.05, 0.3, 28, 12), P = fg.attributes.position, fr = prng(77); for (let i = 0; i < P.count; i++) { const k = 1 + (fr() - 0.5) * 0.12; P.setXYZ(i, P.getX(i) * k, P.getY(i) * (1 + fr() * 0.5), P.getZ(i) * k); } fg.computeVertexNormals(); part(b, fg, toon(0xb39670), [0, 0.63, L / 2 - 0.34]); { const tm = [toon(0xc2a67e), toon(0x9a7c56)]; for (let i = 0; i < 40; i++) { const a = i / 40 * TAU, ex = Math.cos(a) * (Wb / 2 + 0.13), ez = Math.sin(a) * 0.29; part(b, new THREE.ConeGeometry(0.022, 0.07, 5), tm[i % 2], [ex, 0.64, L / 2 - 0.34 + ez], [Math.PI / 2 * Math.sin(a), 0, -Math.PI / 2 * Math.cos(a)], null, { ink: false }); } for (let i = 0; i < 30; i++) part(b, new THREE.ConeGeometry(0.018, 0.05, 5), tm[i % 2], [(fr() - 0.5) * Wb, 0.67, L / 2 - 0.34 + (fr() - 0.5) * 0.4], [(fr() - 0.5) * 0.8, 0, (fr() - 0.5) * 0.8], null, { ink: false }); } HM.fur = true; }
      HM.obs.push({ x: b.position.x + 0.5, z: b.position.z, r: 0.62 }, { x: b.position.x - 0.45, z: b.position.z, r: 0.62 }); }
    // bedside chest by the head: iron-banded, domed lid, brass lock plate
    { const c = new THREE.Group(); c.position.set(W / 2 - 0.38, 0, 1.68); c.rotation.y = -Math.PI / 2; g.add(c); HM.chest = c; const cw = toon(0x6a4024), ci = toon(0x3c3e42);
      part(c, rbox(0.6, 0.34, 0.38, 0.02), cw, [0, 0.19, 0]); part(c, new THREE.CylinderGeometry(0.19, 0.19, 0.6, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2), cw, [0, 0.36, 0], null, [1, 0.5, 1]);
      for (const x of [-0.22, 0, 0.22]) { part(c, rbox(0.04, 0.35, 0.39, 0.005), ci, [x, 0.19, 0]); part(c, new THREE.TorusGeometry(0.19, 0.012, 4, 16, Math.PI).rotateY(Math.PI / 2), ci, [x, 0.36, 0], null, [1, 0.5, 1], { ink: false }); }
      part(c, rbox(0.1, 0.12, 0.02, 0.01), toon(0xc9963e), [0, 0.32, 0.2]); part(c, new THREE.TorusGeometry(0.02, 0.005, 4, 10), toon(0x9a6c2a), [0, 0.27, 0.212]); for (const s of [-1, 1]) part(c, new THREE.TorusGeometry(0.04, 0.008, 4, 12), ci, [s * 0.31, 0.24, 0], [0, Math.PI / 2, 0]);
      HM.obs.push({ x: c.position.x, z: c.position.z, r: 0.3 }); }
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
    { const sf = new THREE.Group(); sf.position.set(W / 2 - 0.12, 1.98, 0.75); sf.rotation.y = -Math.PI / 2; g.add(sf); part(sf, rbox(1.1, 0.05, 0.22, 0.01), wood, [0, 0, 0.04]); for (const x of [-0.4, 0.4]) part(sf, rbox(0.05, 0.16, 0.16, 0.02), woodD, [x, -0.1, 0.02]);
      part(sf, cyl(0.075, 0.075, 0.03, 20).rotateX(Math.PI / 2), brass, [-0.32, 0.1, 0.04]); part(sf, new THREE.CircleGeometry(0.06, 20), toon(0xf1e6cf), [-0.32, 0.1, 0.057]); part(sf, new THREE.TorusGeometry(0.02, 0.006, 5, 10), brass, [-0.32, 0.19, 0.04]);
      part(sf, cyl(0.03, 0.035, 0.06, 8), toon(0x5a4a3a), [0, 0.05, 0.04]); part(sf, ell(0.04, 0.07, 0.035), toon(0x6a5440), [0, 0.13, 0.04]); part(sf, new THREE.SphereGeometry(0.035, 10, 8), toon(0x7a6450), [0, 0.22, 0.04]);
      part(sf, rbox(0.14, 0.2, 0.02, 0.01), woodD, [0.18, 0.12, -0.04], [0.15, 0, 0]); part(sf, cyl(0.065, 0.065, 0.16, 14, true), new THREE.MeshPhongMaterial({ color: 0xdde8f0, transparent: true, opacity: 0.35, shininess: 100 }), [0.38, 0.105, 0.04]);
      for (let i = 0; i < 9; i++) part(sf, new THREE.SphereGeometry(0.018, 6, 5), toon([0x3f7fd0, 0x2fb0c0, 0xd04a3a][i % 3]), [0.38 + (r() - 0.5) * 0.07, 0.04 + r() * 0.08, 0.04 + (r() - 0.5) * 0.07]);
      const pic = new THREE.Group(); pic.position.set(0.05, 0.38, 0); sf.add(pic); part(pic, rbox(0.34, 0.28, 0.03, 0.01), woodD, [0, 0, 0]); part(pic, new THREE.PlaneGeometry(0.26, 0.2), toon(0xd8c8a4), [0, 0, 0.017]); }
    // Persian rugs, laid flat with clear floor between them (none overlap or tuck under furniture): a big ornate carpet under the globe table, a rich one beside the bed and a door mat; thick pile edges and knotted fringe
    { const rug = (w, d, p, ry, t, y) => { const q = new THREE.Group(); q.position.set(p.x, y, p.z); q.rotation.y = ry; g.add(q); part(q, new THREE.BoxGeometry(w, 0.012, d), toon(0x3a2418), [0, 0.006, 0], null, null, { ink: false, shadow: false }); part(q, new THREE.PlaneGeometry(w, d), toon(0xffffff, t), [0, 0.0125, 0], [-Math.PI / 2, 0, 0], null, { ink: false, shadow: false });
        const fm = toon(0xe6d6b4); for (const s of [-1, 1]) for (let i = 0; i < Math.round(d / 0.035); i++) part(q, new THREE.BoxGeometry(0.075, 0.006, 0.012), fm, [s * (w / 2 + 0.035), 0.004, -d / 2 + 0.02 + i * 0.035], null, null, { ink: false, shadow: false }); return q; };
      HM.mat = rug(1.3, 0.7, V(HM.dx, 0, HM.FZ - 0.55), 0, rugTex(5, '#2a3c5a', '#6a2420', '#c9963e', '#7a2420', '#d8c49a'), 0.0); HM.rugs = [rug(2.5, 1.8, V(HMP.table.x - 0.05, 0, HMP.table.z - 0.05), 0.03, rugTex(3, '#6a1e1c', '#1f2a44', '#c9963e', '#2f4f72', '#e0cca0'), 0.004), rug(1.6, 0.95, V(2.05, 0, 2.02), 0, rugTex(4, '#5a2422', '#2a2230', '#b8862f', '#3e6a66', '#d9c7a0'), 0.0)]; }
    // lanterns on the posts and walls, one hanging from the ridge
    wallLantern(g, V(-1.45, 1.75, HM.BZ + 0.22), 0); wallLantern(g, V(1.25, 1.75, HM.BZ + 0.22), 0); wallLantern(g, V(-W / 2 + 0.32, 1.6, 0.85), Math.PI / 2); wallLantern(g, V(W / 2 - 0.22, 1.75, 1.5), -Math.PI / 2); HM.ceilLamp = wallLantern(HM.ceil || g, V(1.6, 2.6, -0.4), 0, true);
    // plants and a few odds and ends
    plant(g, V(-W / 2 + 0.45, 0, 0.35), 1.1); plant(g, V(-W / 2 + 0.4, 0, 1.9), 0.95, 1); plant(g, V(W / 2 - 0.4, 0, HM.FZ - 0.35), 0.8);
    for (let i = 0; i < 4; i++) part(g, new THREE.DodecahedronGeometry(0.1 + r() * 0.08, 1), toon(0x6a655e), [-W / 2 + 0.35 + r() * 0.3, 0.06, HM.FZ - 0.5 + r() * 0.3], [r() * 3, r() * 3, 0], [1, 0.7, 1]);
    HM.obs.push({ x: -2.45, z: HM.BZ + 0.2, r: 0.2 }); }
  // inside, the main Ledge Tether runs on from the door's centre port across the floor, round the globe table and unbroken into the vault's port
  // the main Ledge Tether inside: door -> across the floor -> up the front-left table leg onto the globe's cradle (lineIn), then out of the cradle -> down the back-left leg -> along the floor into the vault port (lineOut)
  function globeRoute() { const v = HMP.vault, t = HMP.table, x0 = HM.dx, d = 0.15;
    const a = [V(x0, HM.pc, HM.FZ - 0.08), V(x0, HM.pc - 0.18, HM.FZ - 0.2), V(x0 + 0.05, 0.12, HM.FZ - 0.5), V(x0 + 0.3, 0.06, HM.FZ - 1.1), V(t.x - 0.75, 0.06, t.z + 0.6), V(t.x - 0.3, 0.06, t.z + 0.3), V(t.x - 0.25, 0.3, t.z + 0.25), V(t.x - 0.36, 0.6, t.z + 0.36), V(t.x - 0.37, 0.7, t.z + 0.37), V(t.x - 0.22, 0.68, t.z + 0.22), V(t.x - d, 0.76, t.z + d), V(t.x - 0.12, 0.84, t.z + 0.12)];
    const b = [V(t.x - 0.12, 0.84, t.z - 0.12), V(t.x - d, 0.76, t.z - d), V(t.x - 0.22, 0.68, t.z - 0.22), V(t.x - 0.37, 0.7, t.z - 0.37), V(t.x - 0.36, 0.6, t.z - 0.36), V(t.x - 0.25, 0.3, t.z - 0.25), V(t.x - 0.3, 0.06, t.z - 0.3), V(t.x - 0.8, 0.06, t.z - 0.6), V(-1.4, 0.06, -0.35), V(-2.6, 0.06, -0.7), V(v.x + 0.35, 0.1, v.z + 0.05), V(v.x + 0.22, v.y - 0.3, v.z), V(v.x + 0.18, v.y, v.z)];
    return { a, b }; }
  function mainLinePts() { const R = globeRoute(); return R.a.concat(R.b); }
  // smithing (back wall, centre, as in the concepts): a beehive stone forge on a stepped plinth, an arched brick mouth with an iron door cracked open
  // on glowing embers, a banded stone chimney up through the vault; an anvil on a ringed stump with a hammer, ingots, and a wall rack with a pickaxe,
  // crossed tools and a coiled Ledge Tether rope. One skill shown visually: ore -> ingot -> Ledge Tether, pickaxe or tether (no recipes, no economy)
  const RACK_PEG_Y = 0.1;
  const SMITH = { furnace: V(-0.7, 0, -2.2), anvil: V(0.72, 0, -1.45), rack: V(0.75, 1.55, -2.8 + 0.03) };
  function furnishSmithing(g) { const r = prng(91), iron = toon(0x3c3e42), ironL = toon(0x5a5d62), wood = toon(0x6e4426), woodD = toon(0x4e301b), bark = toon(0x5a3d24), ring = toon(0xb8936a);
    const st0 = stoneTex(15, [100, 95, 88], 30); st0.repeat.set(4, 2); const stM = toon(0xffffff, st0), st1 = stoneTex(16, [104, 98, 92], 40); st1.repeat.set(3, 1); const stB = toon(0xffffff, st1), stones = [toon(0x77716a), toon(0x6a645d), toon(0x837c73)];
    // ---- the forge (concepts 2c / 3): a SQUAT wide low dome of rounded dark-grey fieldstones in mortar (about 1.6x as wide as tall), a thick iron flue pipe with banded collars
    //      rising from its crown into the ceiling, a wide stone hearth ledge in front and a low wide arched mouth closed by a curved riveted iron door
    const FLUE_Y = 1.0; const F = new THREE.Group(); F.position.copy(SMITH.furnace); g.add(F); HM.furnace = F; const ZS = 0.86, MW = 0.4, MS = 0.3, AH = 0.5, MT = MS + AH, DTOP = 1.02; // depth squash, mouth half-width, sill, arch height, mouth crown, dome crown
    { const fp = toon(0x34363a), fb = toon(0x4c4f54); part(F, cyl(0.3, 0.32, 0.07, 20), fb, [0, FLUE_Y + 0.0, 0], null, [1, 1, 1]); part(F, cyl(0.21, 0.27, 0.1, 20), fp, [0, FLUE_Y + 0.08, 0], null, [1, 1, 1]); part(F, cyl(0.17, 0.17, 3.15 - FLUE_Y, 18), fp, [0, (FLUE_Y + 3.15) / 2 + 0.05, 0]);
      HM.flueBands = 0; for (let y = FLUE_Y + 0.3; y < 3.1; y += 0.4) { part(F, cyl(0.195, 0.195, 0.06, 18), fb, [0, y, 0]); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; part(F, new THREE.SphereGeometry(0.011, 6, 4), fb, [Math.sin(a) * 0.197, y, Math.cos(a) * 0.197], null, null, { ink: false }); } HM.flueBands++; } }
    const prof = (y) => y < 0.32 ? 0.9 - 0.03 * (y - 0.2) / 0.12 : 0.24 + 0.63 * Math.pow(Math.cos(Math.PI / 2 * Math.min(1, (y - 0.32) / (DTOP - 0.32))), 0.55);
    { const lp = []; for (let y = 0.2; y <= DTOP; y += 0.03) lp.push([prof(y) - 0.035, y]); lp.push([0.22, DTOP + 0.02], [0.15, DTOP + 0.03]); part(F, lathe(lp, 36), toon(0x3b3734), null, null, [1, 1, ZS], { ink: false }); }
    const SL = [], sc = (hx, k) => { const c = new THREE.Color(hx); c.offsetHSL((r() - 0.5) * 0.02, (r() - 0.5) * 0.05, (r() - 0.5) * 0.09 * (k || 1)); return c; }, SP = [0x5a5652, 0x4c4946, 0x66615b, 0x54504b, 0x46433f, 0x5f5a54] /* dark grey fieldstone like the concepts */;
    // coursed dome stones (each its own rounded block, staggered, leaning with the bell)
    for (let y = 0.27, k = 0; y < DTOP - 0.06; k++) { const h = 0.1 + r() * 0.05, yc = y + h / 2, rr = prof(yc), dr = (prof(yc + 0.02) - prof(yc - 0.02)) / 0.04, re = rr * (1 + ZS) / 2, n = Math.max(6, Math.round(TAU * re / (0.17 + r() * 0.1))), off = (k % 2) * 0.5 + r() * 0.2;
      for (let j = 0; j < n; j++) { const a = (j + off) / n * TAU, sx = Math.sin(a) * rr, cz = Math.cos(a); if (cz > 0 && Math.abs(sx) < MW + 0.12 && yc < MT + 0.1) continue; const w = (TAU * re / n) * (0.8 + r() * 0.3) - 0.03, nrm = Math.atan2(Math.sin(a), Math.cos(a) / ZS);
        const hh = h - 0.022 - r() * 0.025; SL.push([rbox(Math.max(0.08, w), hh, 0.09 + r() * 0.04, Math.min(hh, w) * 0.42, 3), sc(SP[(j * 7 + k * 3) % 6], 1.4), [sx, yc + (r() - 0.5) * 0.02, Math.cos(a) * rr * ZS], [Math.atan(dr), nrm, (r() - 0.5) * 0.25, 'YXZ']]); }
      y += h; }
    // chimney: squared blocks in courses up through the vault, iron collar where the bell meets the flue
    for (let y = FLUE_Y, k = 0; y < FLUE_Y - 0.06; k++) { const h = 0.13 + r() * 0.02; for (let j = 0; j < 8; j++) { const a = (j + (k % 2) * 0.5) / 8 * TAU; SL.push([rbox(0.19, h - 0.02, 0.08, 0.02, 2), sc(SP[(j + k) % 5]), [Math.sin(a) * 0.27, y + h / 2, Math.cos(a) * 0.27 * ZS], [0, a, 0, 'YXZ']]); } y += h; }
    // plinth: a ring of big flat footing stones, then two front hearth steps
    for (let j = 0; j < 20; j++) { const a = j / 20 * TAU; SL.push([rbox(0.27 + r() * 0.03, 0.18 + r() * 0.03, 0.2, 0.06, 3), sc(SP[j % 6], 1.4), [Math.sin(a) * 0.94, 0.1, Math.cos(a) * 0.94 * ZS], [0, Math.atan2(Math.sin(a), Math.cos(a) / ZS), 0, 'YXZ']]); }
    for (const [w, y, z, d] of [[2.0, 0.11, 1.02, 0.5]]) { let x = -w / 2; while (x < w / 2 - 0.05) { const sw = Math.min(w / 2 - x, 0.26 + r() * 0.14); SL.push([rbox(sw - 0.02, 0.2, d - r() * 0.06, 0.05, 3), sc(SP[Math.floor(r() * 6)], 1.4), [x + sw / 2, y, z + (r() - 0.5) * 0.03], [0, (r() - 0.5) * 0.06, 0, 'YXZ']]); x += sw; } HM.hearthW = w; } // a wide stone hearth ledge across the front
    SL.push([rbox(MW * 2 + 0.16, 0.06, 0.36, 0.02, 2), sc(0x4a4642), [0, MS - 0.03, 0.72], [0, 0, 0, 'YXZ']]); // hearth sill
    // brick arch round the mouth: radial voussoirs, a keystone, jamb bricks
    const BR = [0x5e3626, 0x6a3e2c, 0x52301f, 0x704430], mz = 0.76; for (let i = 0; i <= 12; i++) { const a = Math.PI * i / 12, kk = i === 6; SL.push([rbox(kk ? 0.13 : 0.1, kk ? 0.17 : 0.14, 0.18, 0.018, 2), sc(BR[i % 4], 0.6), [Math.cos(a) * (MW + 0.07), MS + AH - MW + Math.sin(a) * (MW + 0.07), mz], [0, 0, a - Math.PI / 2, 'XYZ']]); }
    for (const s of [-1, 1]) for (let i = 0; i < 1; i++) SL.push([rbox(0.12, 0.095, 0.18, 0.016, 2), sc(BR[(i + (s > 0 ? 1 : 0)) % 4], 0.6), [s * (MW + 0.07), MS + 0.05 + i * 0.1, mz], [0, 0, 0, 'XYZ']]);
    { const pos = [], nor = [], col = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); for (const [geo, c, p, ro] of SL) { const gg = geo.index ? geo.toNonIndexed() : geo; e.set(ro[0], ro[1], ro[2], ro[3]); q.setFromEuler(e); m4.compose(V(...p), q, V(1, 1, 1)); gg.applyMatrix4(m4); const P = gg.attributes.position, N = gg.attributes.normal; for (let i = 0; i < P.count; i++) { pos.push(P.getX(i), P.getY(i), P.getZ(i)); nor.push(N.getX(i), N.getY(i), N.getZ(i)); col.push(c.r, c.g, c.b); } }
      const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); mg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); mg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); HM.forgeStones = part(F, mg, toon(0xffffff, null, { vertexColors: true })); HM.forgeStones.userData.n = SL.length; }
    // the mouth: dark firebox, side reveals, a bed of glowing coals with little flames, sparks rising out of the arch
    part(F, new THREE.ShapeGeometry(archShape(MW * 2, AH), 16), new THREE.MeshBasicMaterial({ color: 0x170a04 }), [0, MS, 0.56], null, null, { ink: false, shadow: false });
    for (const s of [-1, 1]) part(F, new THREE.BoxGeometry(0.03, AH - MW, 0.24), toon(0x3a2418), [s * MW, MS + (AH - MW) / 2, 0.66], null, null, { ink: false });
    const cM = [0xff5a14, 0xffa030, 0x8a2008, 0xffd070, 0x3a1208].map((c) => new THREE.MeshBasicMaterial({ color: c })); HM.embers = [];
    for (let i = 0; i < 26; i++) { const e = part(F, new THREE.DodecahedronGeometry(0.028 + r() * 0.03, 0), cM[i % 5], [(r() - 0.5) * MW * 1.6, MS + 0.02 + r() * 0.05, 0.58 + r() * 0.16], [r() * 3, r() * 3, 0], [1, 0.7, 1], { ink: false, shadow: false }); e.userData.k = i % 5; HM.embers.push(e); }
    const fM = new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending }); HM.flames = []; for (let i = 0; i < 5; i++) { const fl = part(F, new THREE.ConeGeometry(0.04 + r() * 0.025, 0.2, 7), fM, [(i - 2) * 0.1 + (r() - 0.5) * 0.04, MS + 0.13, 0.63 + r() * 0.06], null, null, { ink: false, shadow: false }); fl.userData.ph = r() * 7; HM.flames.push(fl); }
    const glow = part(F, new THREE.PlaneGeometry(1.2, 0.9), new THREE.MeshBasicMaterial({ map: cv(64, 64, (x, w, h) => { const gr = x.createRadialGradient(w / 2, h * 0.7, 2, w / 2, h * 0.7, w / 2); gr.addColorStop(0, 'rgba(255,160,50,.95)'); gr.addColorStop(1, 'rgba(255,100,20,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), [0, MS + 0.22, 0.9], null, null, { ink: false, shadow: false }); HM.emberGlow = glow;
    const spM = new THREE.MeshBasicMaterial({ color: 0xffc060, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }); HM.sparks = []; for (let i = 0; i < 16; i++) { const s = part(F, new THREE.SphereGeometry(0.011, 5, 4), spM.clone(), [0, -1, 0], null, null, { ink: false, shadow: false }); s.userData = { life: 0, t: 1 + r(), v: V(0, 0, 0) }; HM.sparks.push(s); }
    const fl = new THREE.PointLight(0xff7a2a, 1.2, 4.5, 1.5); fl.position.set(0, 0.55, 1.25); F.add(fl); HM.forgeLight = fl;
    // iron door (concept 3): not a flat slab - a round-topped door bowed outward like a shield (curved surface, deepest mid-low), a raised rolled rim
    // round its edge, two riveted iron bands that follow the bow, strap hinges on knuckles at the left jamb, a domed boss with a ring pull, a peep slot.
    // A heavy iron frame rings the mouth inside the brick arch.
    const DW = MW * 2 - 0.02, DH = AH - 0.02, DB = 0.08, dr = DW / 2, dyt = DH - dr, bow = (x, y) => { const u = x / dr, w2 = (y - DH * 0.42) / (DH * 0.62); return DB * Math.max(0, 1 - u * u) * Math.max(0, 1 - w2 * w2 * 0.8); };
    const dGeo = (() => { const gq = new THREE.PlaneGeometry(DW, DH, 22, 26); gq.translate(0, DH / 2, 0); const P = gq.attributes.position; for (let k = 0; k < P.count; k++) { let x = P.getX(k); const y = P.getY(k); if (y > dyt) x *= Math.sqrt(Math.max(0, dr * dr - (y - dyt) ** 2)) / dr; P.setXYZ(k, x, y, bow(x, y)); } gq.computeVertexNormals(); return gq; })();
    { const fr = new THREE.CatmullRomCurve3(archShape(MW * 2 + 0.06, AH + 0.03).getPoints(24).slice(1).map((q) => V(q.x, q.y, 0)), false); part(F, new THREE.TubeGeometry(fr, 48, 0.02, 8, false), toon(0x2a2c30), [0, MS - 0.01, mz + 0.09], null, null, { ink: false }); HM.forgeFrame = fr; }
    const dp = new THREE.Group(); dp.position.set(-MW, MS, mz + 0.1); F.add(dp); { const dI = toon(0x34363a, null, { side: THREE.DoubleSide }), dL = toon(0x5c5f65), dK = toon(0x26282b); HM.forgeDoorGeo = dGeo;
      const body = part(dp, dGeo, dI, [MW, 0, 0]); body.userData.bow = DB;
      // rolled rim round the edge
      { const o = archShape(DW, DH).getPoints(30).map((q) => V(q.x, q.y, bow(q.x, q.y) + 0.004)); part(dp, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(o, true), 80, 0.016, 6, true), dK, [MW, 0, 0], null, null, { ink: false }); }
      // two iron bands following the bow, rivets along them
      for (const y of [DH * 0.22, DH * 0.62]) { const xm = y > dyt ? Math.sqrt(dr * dr - (y - dyt) ** 2) : dr, bp = []; for (let k = 0; k <= 16; k++) { const x = -xm + 2 * xm * k / 16; bp.push(V(x, y, bow(x, y) + 0.008)); } part(dp, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bp), 32, 0.018, 6, false), dL, [MW, 0, 0], [0, 0, 0], [1, 1, 1], { ink: false });
        for (let k = 1; k < 7; k++) { const x = -xm + 2 * xm * k / 7; part(dp, new THREE.SphereGeometry(0.012, 6, 4), dK, [MW + x, y, bow(x, y) + 0.026], null, null, { ink: false }); }
        part(dp, cyl(0.022, 0.022, 0.08, 10), dL, [-0.005, y, 0.02]); }
      // domed boss with a ring pull, peep slot above
      const by = DH * 0.42; part(dp, new THREE.SphereGeometry(0.05, 14, 8, 0, TAU, 0, Math.PI / 2).rotateX(Math.PI / 2), dK, [MW + 0.08, by, bow(0.08, by) - 0.01], null, [0.8, 0.8, 0.8]); part(dp, new THREE.TorusGeometry(0.04, 0.01, 6, 18), dL, [MW + 0.08, by - 0.035, bow(0.08, by) + 0.035], [0.5, 0, 0]);
      part(dp, rbox(0.15, 0.024, 0.02, 0.006), new THREE.MeshBasicMaterial({ color: 0x1a0c05 }), [MW, DH * 0.8, bow(0, DH * 0.8) + 0.004], null, null, { ink: false }); part(dp, rbox(0.19, 0.012, 0.02, 0.004), dL, [MW, DH * 0.8 + 0.022, bow(0, DH * 0.8 + 0.02) + 0.006], null, null, { ink: false }); }
    dp.rotation.y = -0.5; HM.forgeDoor = dp;
    // bellows on a low trestle at the left flank, its iron nozzle into the forge; long handles out the back
    { const B = new THREE.Group(); B.position.set(-1.2, 0, 0.1); B.rotation.y = -0.08; F.add(B); HM.bellows = B; const lth = toon(0x6a3e22), lthD = toon(0x4e2c17);
      for (const x of [-0.22, 0.18]) { part(B, rbox(0.05, 0.32, 0.05, 0.01), woodD, [x, 0.16, -0.13], [0.15, 0, 0]); part(B, rbox(0.05, 0.32, 0.05, 0.01), woodD, [x, 0.16, 0.13], [-0.15, 0, 0]); part(B, rbox(0.05, 0.04, 0.32, 0.01), wood, [x, 0.32, 0]); }
      const bs = new THREE.Shape(); bs.moveTo(-0.3, 0); bs.quadraticCurveTo(-0.3, 0.2, -0.02, 0.2); bs.lineTo(0.22, 0.06); bs.lineTo(0.22, -0.06); bs.lineTo(-0.02, -0.2); bs.quadraticCurveTo(-0.3, -0.2, -0.3, 0); const bg = new THREE.ExtrudeGeometry(bs, { depth: 0.025, bevelEnabled: false, curveSegments: 10 }).rotateX(-Math.PI / 2);
      part(B, bg, wood, [0, 0.35, 0]); const top = part(B, bg, wood, [0, 0.5, 0], [0, 0, 0.1]); HM.bellowsTop = top;
      for (const [y, s] of [[0.39, 0.92], [0.43, 1], [0.47, 0.95]]) part(B, ell(0.25 * s, 0.032, 0.17 * s), lth, [-0.06, y, 0]); for (let i = 0; i < 7; i++) part(B, new THREE.SphereGeometry(0.008, 5, 4), toon(0xb8873a), [-0.3 + i * 0.07, 0.528, 0.16 - Math.abs(i - 3) * 0.015], null, null, { ink: false });
      part(B, cyl(0.045, 0.022, 0.34, 10).rotateZ(-Math.PI / 2), iron, [0.38, 0.42, 0]); part(B, cyl(0.05, 0.05, 0.03, 10).rotateZ(-Math.PI / 2), lthD, [0.22, 0.42, 0]);
      for (const y of [0.37, 0.53]) part(B, rbox(0.3, 0.03, 0.035, 0.01), woodD, [-0.44, y, 0]); part(B, rbox(0.035, 0.035, 0.14, 0.01), woodD, [-0.58, 0.53, 0]); }
    // tongs leaning on the footing at the right, a long poker beside them
    { const T = new THREE.Group(); T.position.set(0.95, 0.02, 0.45); T.rotation.set(0.05, -0.5, 0.28); F.add(T); HM.tongs = T; const ti = toon(0x3a3c40);
      for (const s of [-1, 1]) { part(T, cyl(0.011, 0.011, 0.62, 6), ti, [s * 0.025, 0.31, 0], [0, 0, s * 0.04]); part(T, rbox(0.022, 0.1, 0.018, 0.006), ti, [s * 0.01, 0.67, 0], [0, 0, -s * 0.35]); } part(T, cyl(0.018, 0.018, 0.03, 8).rotateX(Math.PI / 2), ironL, [0, 0.6, 0]);
      part(T, cyl(0.012, 0.012, 0.8, 6), ti, [0.09, 0.4, -0.05], [0, 0, -0.05]); part(T, new THREE.TorusGeometry(0.03, 0.008, 5, 10), ti, [0.11, 0.82, -0.05]); }
    // anvil: a big London-pattern anvil (feet, waisted body, heel, step, long horn) sitting on a short iron-banded oak block on the floor; ingots stacked by it
    const A = new THREE.Group(); A.position.copy(SMITH.anvil); A.rotation.y = -0.25; g.add(A); HM.anvil = A; const aI = toon(0x3e4045), aF = toon(0x7a7e86);
    part(A, cyl(0.36, 0.38, 0.2, 18), bark, [0, 0.1, 0]); part(A, cyl(0.345, 0.345, 0.02, 18), ring, [0, 0.2, 0], null, null, { ink: false }); part(A, cyl(0.385, 0.385, 0.04, 18, true), iron, [0, 0.08, 0]); for (const k of [0.12, 0.22, 0.3]) part(A, new THREE.TorusGeometry(k, 0.004, 4, 28).rotateX(Math.PI / 2), toon(0x8a6a48), [0, 0.211, 0], null, null, { ink: false });
    const AB = new THREE.Group(); AB.position.y = 0.21; AB.scale.setScalar(0.86); A.add(AB); HM.anvilBody = AB;
    part(AB, rbox(0.6, 0.08, 0.36, 0.02), aI, [-0.02, 0.04, 0]); for (const [x, z] of [[-0.26, -0.14], [-0.26, 0.14], [0.22, -0.14], [0.22, 0.14]]) part(AB, rbox(0.15, 0.1, 0.12, 0.03), aI, [x, 0.05, z]);
    { const s = new THREE.Shape(); s.moveTo(-0.24, 0); s.lineTo(0.22, 0); s.quadraticCurveTo(0.11, 0.08, 0.12, 0.22); s.lineTo(0.22, 0.3); s.lineTo(-0.26, 0.3); s.lineTo(-0.13, 0.22); s.quadraticCurveTo(-0.12, 0.08, -0.24, 0); part(AB, new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 1, curveSegments: 8 }), aI, [-0.01, 0.08, -0.11]); }
    part(AB, rbox(0.66, 0.14, 0.27, 0.02), aI, [-0.06, 0.45, 0]); part(AB, rbox(0.13, 0.11, 0.22, 0.02), aI, [0.33, 0.435, 0]); part(AB, new THREE.ConeGeometry(0.105, 0.4, 16).rotateZ(-Math.PI / 2), aI, [0.59, 0.44, 0], null, [1, 0.85, 1]);
    part(AB, rbox(0.62, 0.012, 0.25, 0.004), aF, [-0.06, 0.522, 0], null, null, { ink: false }); part(AB, rbox(0.04, 0.006, 0.04, 0.002), toon(0x15161a), [-0.31, 0.528, 0.04], null, null, { ink: false }); part(AB, cyl(0.014, 0.014, 0.006, 10), toon(0x15161a), [-0.23, 0.528, 0.05], null, null, { ink: false });
    const ingot = (x, y, z, ry, col) => (HM.ingotL = HM.ingotL || []).push(part(g, new THREE.CylinderGeometry(0.06, 0.085, 0.05, 4, 1).rotateY(Math.PI / 4).scale(1.6, 1, 0.8), toon(col), [x, y, z], [0, ry, 0])); const ic = [0x9aa3ab, 0x8c949c, 0xa8b0b8];
    for (let i = 0; i < 3; i++) ingot(SMITH.anvil.x + 0.56 + i * 0.02, 0.025, SMITH.anvil.z - 0.1 + i * 0.13, -0.15, ic[i]); ingot(SMITH.anvil.x + 0.58, 0.075, SMITH.anvil.z - 0.03, 0.1, ic[1]); HM.ingots = 4;
    // a little shelf of ingots beside the forge, ore lumps waiting, a firewood bucket
    { const sh2 = new THREE.Group(); sh2.position.set(SMITH.furnace.x - 1.0, 0.95, HM.BZ + 0.16); g.add(sh2); part(sh2, rbox(0.46, 0.05, 0.26, 0.01), wood, [0, 0, 0]); part(sh2, rbox(0.05, 0.14, 0.2, 0.02), woodD, [-0.15, -0.09, -0.02]); part(sh2, rbox(0.05, 0.14, 0.2, 0.02), woodD, [0.15, -0.09, -0.02]); for (let i = 0; i < 3; i++) part(sh2, new THREE.CylinderGeometry(0.05, 0.07, 0.045, 4, 1).rotateY(Math.PI / 4).scale(1.6, 1, 0.8), toon(ic[i]), [-0.1 + i * 0.1, 0.05, 0.02]); part(sh2, new THREE.CylinderGeometry(0.05, 0.07, 0.045, 4, 1).rotateY(Math.PI / 4).scale(1.6, 1, 0.8), toon(ic[0]), [-0.05, 0.095, 0.02]); }
    for (let i = 0; i < 5; i++) part(g, new THREE.DodecahedronGeometry(0.05 + r() * 0.03, 0), toon([0x6b5a4a, 0xa0703a, 0x7d8a96][i % 3]), [SMITH.furnace.x + 0.75 + r() * 0.25, 0.04, SMITH.furnace.z + 0.55 + r() * 0.2], [r() * 3, r() * 3, 0]);
    { const bk = new THREE.Group(); bk.position.set(SMITH.furnace.x - 1.4, 0, SMITH.furnace.z + 0.75); g.add(bk); part(bk, cyl(0.17, 0.2, 0.3, 14), wood, [0, 0.15, 0]); for (const y of [0.06, 0.24]) part(bk, cyl(0.205, 0.18, 0.025, 14), iron, [0, y, 0]); for (let i = 0; i < 7; i++) part(bk, cyl(0.025, 0.025, 0.36, 6), toon(0x7a5232), [(r() - 0.5) * 0.18, 0.36, (r() - 0.5) * 0.18], [(r() - 0.5) * 0.4, 0, (r() - 0.5) * 0.4]); HM.obs.push({ x: bk.position.x, z: bk.position.z, r: 0.22 }); }
    // wall rack: pickaxe, crossed tools and a coiled Ledge Tether rope (the things the smithing makes), a lantern hook
    const K = new THREE.Group(); K.position.copy(SMITH.rack); g.add(K); HM.rack = K; part(K, rbox(1.1, 0.12, 0.05, 0.015), woodD, [0, 0.12, 0.03]); HM.rackHang = []; const peg = (x, nm, y = RACK_PEG_Y) => { const m = part(K, cyl(0.014, 0.012, 0.11, 8).rotateX(Math.PI / 2), iron, [x, y, 0.1]); m.userData.peg = nm; part(K, cyl(0.02, 0.02, 0.012, 8).rotateX(Math.PI / 2), iron, [x, y, 0.155], null, null, { ink: false }); return m; };
    const pk = makePickaxe('iron'); const ph = new THREE.Group(); ph.position.set(-0.36, -0.86, 0.085); ph.rotation.set(0, 0, 0.06); K.add(ph); ph.add(pk); pk.rotation.set(0, 0, 0); pk.scale.setScalar(1.0); HM.rackPick = pk;
    // flat to the wall, the head's two arms resting square on two pegs either side of the shaft (seated from the head's own underside, so there's no gap)
    { K.updateMatrixWorld(true); const inv = K.matrixWorld.clone().invert(), v = V(0, 0, 0), low = (x) => { let y = 9; pk.traverse((m) => { if (!m.isMesh || m.geometry.type !== 'ExtrudeGeometry') return; const P = m.geometry.attributes.position; for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld).applyMatrix4(inv); if (Math.abs(v.x - x) < 0.012) y = Math.min(y, v.y); } }); return y; }, px = [-0.47, -0.27], dy = RACK_PEG_Y + 0.014 - Math.min(...px.map(low)); ph.position.y += dy; K.updateMatrixWorld(true); HM.rackHang.push({ tool: pk, pegs: px.map((x) => peg(x, 'pick', low(x) - 0.014)), kind: 'head' }); }
    for (const [x0, c, k] of [[0.02, 0x6e4426, 'shovel'], [0.17, 0x5a3820, 'rake']]) { const tl = new THREE.Group(); tl.position.set(x0, RACK_PEG_Y - 0.001 - 0.02 - 0.3, 0.1); tl.name = k; K.add(tl); part(tl, rbox(0.028, 0.5, 0.022, 0.008), toon(c), [0, 0.05, 0]); part(tl, new THREE.TorusGeometry(0.02, 0.005, 6, 14), iron, [0, 0.32, 0], null, null, { ink: false }); HM.rackHang.push({ tool: tl, pegs: [peg(x0, k)], kind: 'eye' }); part(tl, cyl(0.02, 0.02, 0.05, 8), iron, [0, -0.22, 0]); if (k === 'shovel') part(tl, rbox(0.12, 0.14, 0.012, 0.01), ironL, [0, -0.31, 0]); else { part(tl, rbox(0.014, 0.12, 0.014, 0.004), iron, [0, -0.3, 0]); part(tl, rbox(0.1, 0.014, 0.014, 0.004), iron, [0.04, -0.36, 0]); } } // coal shovel and fire rake each hang straight down from a peg by an iron eye at the handle end (no smithing hammer: players craft their own)
    const tc = makeTether('steel', { R: 0.13, n: 7, dr: 0.004, tr: 0.016, dz: 0.011, sy: 1.3 }); tc.position.set(0.4, -0.12, 0.12); K.add(tc); HM.rackRope = tc; { const pg = peg(0.4, 'rope'); K.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(tc), top = K.worldToLocal(bb.max.clone()).y, cx = K.worldToLocal(bb.getCenter(V(0, 0, 0))).x; tc.position.x += 0.4 - cx; tc.position.y += RACK_PEG_Y + 0.016 - top; HM.rackHang.push({ tool: tc, pegs: [pg], kind: 'coil' }); } // the coil's top loop over its peg
    // a stool by the back wall with a bundle on it
    { const sl = new THREE.Group(); sl.position.set(1.85, 0, HM.BZ + 0.45); g.add(sl); part(sl, cyl(0.2, 0.2, 0.05, 14), wood, [0, 0.5, 0]); for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; part(sl, cyl(0.025, 0.03, 0.5, 6), woodD, [Math.cos(a) * 0.13, 0.25, Math.sin(a) * 0.13], [Math.sin(a) * 0.15, 0, -Math.cos(a) * 0.15]); } part(sl, rbox(0.26, 0.14, 0.2, 0.06), toon(0x5d7040), [0, 0.6, 0]); HM.obs.push({ x: sl.position.x, z: sl.position.z, r: 0.25 }); }
    { const S2 = new THREE.Group(); S2.position.set(SMITH.furnace.x - 1.15, 1.3, -2.8 + 0.13); g.add(S2); HM.ingotShelf = S2; part(S2, rbox(0.62, 0.045, 0.24, 0.012), wood, [0, 0, 0]); for (const s of [-1, 1]) part(S2, rbox(0.035, 0.16, 0.18, 0.01), woodD, [s * 0.22, -0.1, -0.02], [0.45, 0, 0]);
      const im = [0x9aa3ab, 0x8c949c, 0xa8b0b8].map((c) => toon(c)); let n = 0; for (const [row, cnt] of [[0, 3], [1, 2], [2, 1]]) for (let i = 0; i < cnt; i++) { part(S2, new THREE.CylinderGeometry(0.055, 0.075, 0.05, 4, 1).rotateY(Math.PI / 4).scale(1.45, 1, 0.8), im[(i + row) % 3], [(i - (cnt - 1) / 2) * 0.165, 0.047 + row * 0.05, 0], [0, row % 2 ? Math.PI : 0, 0]); n++; } HM.shelfIngots = n; }
    { const fg = part(g, new THREE.PlaneGeometry(1.6, 1.1), new THREE.MeshBasicMaterial({ map: cv(64, 64, (x, w, h) => { const gr = x.createRadialGradient(w / 2, h * 0.2, 2, w / 2, h * 0.2, w * 0.6); gr.addColorStop(0, 'rgba(255,140,40,.55)'); gr.addColorStop(1, 'rgba(255,90,20,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), [SMITH.furnace.x, 0.012, SMITH.furnace.z + 1.35], [-Math.PI / 2, 0, 0], null, { ink: false, shadow: false }); HM.floorGlow = fg; }
    // quench bucket: coopered staves, two iron hoops, dark water with a glint
    { const Q = new THREE.Group(); Q.position.set(1.25, 0, -2.1); g.add(Q); HM.quench = Q; for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; part(Q, rbox(0.1, 0.36, 0.03, 0.01), toon(new THREE.Color(0x6e4426).offsetHSL(0, 0, (r() - 0.5) * 0.06).getHex()), [Math.sin(a) * 0.21, 0.18, Math.cos(a) * 0.21], [0, a, 0], [1, 1, 1], { ink: i % 2 === 0 }); }
      for (const y of [0.07, 0.29]) part(Q, cyl(0.232, 0.228, 0.035, 20, true), iron, [0, y, 0]); part(Q, new THREE.CircleGeometry(0.2, 20), toon(0x1e3a48, null, { emissive: 0x0a1820 }), [0, 0.3, 0], [-Math.PI / 2, 0, 0], null, { ink: false }); part(Q, new THREE.CircleGeometry(0.05, 10), new THREE.MeshBasicMaterial({ color: 0x9fc4d4, transparent: true, opacity: 0.35 }), [0.06, 0.302, -0.05], [-Math.PI / 2, 0, 0], [1.6, 0.5, 1], { ink: false, shadow: false }); HM.obs.push({ x: Q.position.x, z: Q.position.z, r: 0.25 }); }
    HM.obs.push({ x: SMITH.furnace.x, z: SMITH.furnace.z + 0.1, r: 1.0 }, { x: SMITH.furnace.x - 1.3, z: SMITH.furnace.z + 0.1, r: 0.35 }, { x: SMITH.anvil.x + 0.08, z: SMITH.anvil.z, r: 0.5 }); }
  function smithTick(dt) { if (!HM.forgeLight) return; const t = HM.t || 0, f = 0.75 + 0.18 * Math.sin(t * 7.3) + 0.12 * Math.sin(t * 13.1 + 1) + 0.06 * Math.sin(t * 23.7); HM.forgeLight.intensity = 1.0 * f; HM.emberGlow.material.opacity = 0.55 + 0.4 * f; if (HM.floorGlow) HM.floorGlow.material.opacity = 0.6 + 0.4 * f;
    HM.embers.forEach((e, i) => e.scale.setScalar(0.85 + 0.25 * Math.max(0, Math.sin(t * (3 + i * 0.7) + i))));
    for (const fl of HM.flames || []) { const u = fl.userData.ph + t; fl.scale.set(1, 0.6 + 0.5 * Math.abs(Math.sin(u * 5.1)) + 0.2 * Math.sin(u * 11.3), 1); fl.position.y = 0.42 + 0.06 + 0.1 * fl.scale.y / 2; fl.material.opacity = 0.45 + 0.3 * f; }
    if (HM.bellowsTop) HM.bellowsTop.rotation.z = 0.06 + 0.05 * Math.max(0, Math.sin(t * 1.3));
    for (const s of HM.sparks || []) { const u = s.userData; u.t += dt; if (u.t > u.life) { const r = Math.random; u.t = 0; u.life = 0.8 + r() * 0.9; s.position.set((r() - 0.5) * 0.3, 0.72 + r() * 0.2, 0.68 + r() * 0.05); u.v.set((r() - 0.5) * 0.25, 0.45 + r() * 0.5, 0.12 + r() * 0.18); } s.position.addScaledVector(u.v, dt); u.v.x += (Math.random() - 0.5) * dt * 0.8; u.v.y -= dt * 0.15; s.material.opacity = Math.max(0, 1 - u.t / u.life); } }
  // the globe table: a crystal sphere on a brass stand (centre rug), a tiny portaledge hanging inside with crackling light; a frayed branch of the
  // the orb's core: every strand feeding it (both strands of every plugged Ledge Tether, by tier) blends into twisting, swirling bands of combined colour.
  // A shader shell samples a palette of up to 8 strand colours along a twisted, time-advected band coordinate (soft blends between neighbours, bright seams).
  const ORB_VS = 'varying vec3 vP; varying vec3 vN; varying vec3 vV; void main(){ vP = position; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }';
  const ORB_FS = 'uniform vec3 uC[8]; uniform float uN; uniform float uT; uniform float uPh; varying vec3 vP; varying vec3 vN; varying vec3 vV;\n' +
    'vec3 pal(float x){ x = fract(x) * uN; float i = floor(x), f = smoothstep(0.2, 0.8, fract(x)); vec3 a = uC[0], b = uC[0]; for (int k = 0; k < 8; k++) { float fk = float(k); if (fk == mod(i, uN)) a = uC[k]; if (fk == mod(i + 1.0, uN)) b = uC[k]; } return mix(a, b, f); }\n' +
    'void main(){ vec3 p = normalize(vP); float lon = atan(p.z, p.x) / 6.28318, lat = p.y; float t = uT + uPh;\n' +
    ' float w = lon * 2.0 + lat * (2.2 + 0.6 * sin(t * 0.35)) + t * 0.14 + 0.16 * sin(lat * 5.0 + t * 1.4 + lon * 12.566) + 0.07 * sin(lon * 25.13 - lat * 8.0 - t * 2.1);\n' +
    ' vec3 c = pal(w); float seam = pow(abs(sin(w * uN * 3.14159)), 14.0); float fr = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.4);\n' +
    ' float lit = 0.55 + 0.6 * (1.0 - fr); vec3 o = c * lit * (0.75 + 0.25 * seam) + vec3(0.18) * pow(1.0 - seam, 3.0) * (1.0 - fr); gl_FragColor = vec4(o, 0.92 - 0.5 * fr); }';
  function orbShell(rad, ph) { const u = { uC: { value: Array.from({ length: 8 }, () => new THREE.Color(0x5c9dff)) }, uN: { value: 1 }, uT: { value: 0 }, uPh: { value: ph } };
    const m = new THREE.Mesh(new THREE.SphereGeometry(rad, 40, 28), new THREE.ShaderMaterial({ uniforms: u, vertexShader: ORB_VS, fragmentShader: ORB_FS, transparent: true, depthWrite: false, blending: ph ? THREE.AdditiveBlending : THREE.NormalBlending })); m.renderOrder = ph ? 3 : 2; m.userData.orb = true; return m; }
  // the strands feeding the orb: both strands of every plugged Ledge Tether (main first, then the extra ports in order), by tier colour
  function orbStrands() { const hs = homeState(), o = []; for (const id of PORTS) { const P2 = hs.ports && hs.ports[id]; if (!P2) continue; const tw = twinOf(P2); for (const w of ['a', 'b']) o.push(LGRADES[tw[w].grade] ? tw[w].grade : 'bronze'); } return o; }
  function orbColGeo(geo) { geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 3), 3)); return geo; }
  // paint a tube's vertex colours: position along the tube (u) + time scroll -> a smooth cycle through the strand colours (rep = how many full cycles along the tube)
  const _oc = new THREE.Color(); function orbPaint(m, t) { const c = m.userData.cs, cols = HM.orbColsC; if (!c || !cols) return; const A = m.geometry.attributes.color, n = cols.length;
    for (let i = 0; i <= c.n; i++) { let w = ((i / c.n) * c.rep + c.ph + t * c.sp) % 1; if (w < 0) w += 1; const x = w * n, k = Math.floor(x) % n, f = x - Math.floor(x), e = f * f * (3 - 2 * f); const hl = _oc.copy(cols[k]).lerp(cols[(k + 1) % n], e);
      for (let j = 0; j <= c.r; j++) A.setXYZ(i * (c.r + 1) + j, hl.r, hl.g, hl.b); } A.needsUpdate = true; }
  function orbRefresh(force) { if (!HM.globe) return; const gs = orbStrands(), key = gs.join(); if (!force && key === HM.orbKey) return; HM.orbKey = key; const cols = (gs.length ? gs : ['lumen']).slice(0, 8).map((g) => new THREE.Color(LGRADES[g].core)), mean = new THREE.Color(0, 0, 0);
    cols.forEach((c) => mean.add(c)); mean.multiplyScalar(1 / cols.length); HM.orbCols = cols.map((c) => c.getHex()); HM.orbMean = mean.getHex();
    HM.orbColsC = cols.map((c) => c.clone().lerp(new THREE.Color(0xffffff), 0.12)); HM.globeHalo.material.color.copy(mean); HM.globeLight.color.copy(mean).lerp(new THREE.Color(0xffffff), 0.2);
    for (const b of HM.bolts || []) b.material.color.copy(cols[Math.floor(Math.random() * cols.length)]).lerp(new THREE.Color(0xffffff), 0.45); }
  // main Ledge Tether climbs a table leg and threads in and out of the globe while the main line carries on into the vault. Tap it: travel to the Hanging Camp
  function furnishGlobe(g) { const t = HMP.table, wood = toon(0x6e4426), woodD = toon(0x52301a), brass = toon(0xc9963e), brassD = toon(0x9a6c2a), r = prng(23);
    const T = new THREE.Group(); T.position.set(t.x, 0, t.z); g.add(T); HM.table = T;
    { const tp = plankTex(51, [124, 80, 46]); tp.repeat.set(0.5, 0.5); part(T, cyl(0.5, 0.5, 0.09, 32), toon(0xffffff, tp), [0, 0.6, 0]); } part(T, cyl(0.51, 0.51, 0.025, 32), woodD, [0, 0.548, 0], null, null, { ink: false }); part(T, cyl(0.36, 0.36, 0.08, 24, true), woodD, [0, 0.5, 0]);
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4; part(T, rbox(0.1, 0.52, 0.1, 0.02), wood, [Math.cos(a) * 0.3, 0.29, Math.sin(a) * 0.3], [Math.sin(a) * 0.1, 0, -Math.cos(a) * 0.1]); part(T, rbox(0.14, 0.08, 0.14, 0.02), woodD, [Math.cos(a) * 0.33, 0.04, Math.sin(a) * 0.33]); }
    part(T, cyl(0.27, 0.25, 0.05, 28), brassD, [0, 0.67, 0]); part(T, cyl(0.23, 0.22, 0.09, 28), brass, [0, 0.74, 0]); part(T, new THREE.TorusGeometry(0.205, 0.022, 8, 32).rotateX(Math.PI / 2), brassD, [0, 0.79, 0]); part(T, new THREE.TorusGeometry(0.235, 0.012, 6, 32).rotateX(Math.PI / 2), brassD, [0, 0.695, 0]);
    // the open globe: no glass. Brass petals cup a floating, swirling energy core (a tiny portaledge drifting in it), three gimbal rings turn round it; crackling lightning
    const G2 = new THREE.Group(); G2.position.set(0, 1.08, 0); T.add(G2); HM.globe = G2;
    { const pm = new THREE.MeshToonMaterial({ color: 0xc9963e, gradientMap: gradMap(), side: THREE.DoubleSide }); HM.petals = []; for (let i = 0; i < 6; i++) { const a0 = i / 6 * TAU; const pe = part(T, lathe([[0.17, 0], [0.22, 0.035], [0.27, 0.07], [0.3, 0.095], [0.305, 0.11]], 8, a0 + 0.08, TAU / 6 - 0.16), pm, [0, 0.79, 0]); HM.petals.push(pe); for (const y of [0.08, 0.15]) part(T, new THREE.SphereGeometry(0.008, 6, 4), brassD, [Math.sin(a0 + TAU / 12) * (y < 0.1 ? 0.24 : 0.3), 0.79 + y * 0.6, Math.cos(a0 + TAU / 12) * (y < 0.1 ? 0.24 : 0.3)], null, null, { ink: false }); } }
    const rings = new THREE.Group(); G2.add(rings); HM.globeRings = []; { const rm = toon(0xc9963e), rd = toon(0x9a6c2a);
      const R1 = new THREE.Group(); rings.add(R1); part(R1, new THREE.TorusGeometry(0.31, 0.011, 8, 64), rm); for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; part(R1, rbox(0.006, 0.022, 0.026, 0.002), rd, [Math.cos(a) * 0.31, Math.sin(a) * 0.31, 0], [0, 0, a], null, { ink: false }); }
      const R2 = new THREE.Group(); R1.add(R2); part(R2, new THREE.TorusGeometry(0.27, 0.009, 8, 64), rm, null, [0, Math.PI / 2, 0]);
      const R3 = new THREE.Group(); R3.rotation.set(Math.PI / 2 + 0.35, 0, 0.2); rings.add(R3); part(R3, new THREE.TorusGeometry(0.235, 0.008, 8, 64), rm); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; part(R3, new THREE.SphereGeometry(0.012, 8, 6), rd, [Math.cos(a) * 0.235, Math.sin(a) * 0.235, 0], null, null, { ink: false }); }
      for (const s of [-1, 1]) part(R1, new THREE.SphereGeometry(0.016, 8, 6), rd, [s * 0.31, 0, 0]); HM.globeRings = [R1, R2, R3];
      // two counter-wound glowing spirals coil round the outer ring (and one round the middle ring), each band cycling through the incoming strand colours as it runs along
      HM.ringSpirals = []; for (const [RG, rad, tr, turns, ph0, rot] of [[R1, 0.31, 0.02, 14, 0, null], [R1, 0.31, 0.02, 14, Math.PI, null], [R2, 0.27, 0.017, 11, 0.5, [0, Math.PI / 2, 0]]]) { const pts = [], NS = 220;
        for (let i = 0; i <= NS; i++) { const th = i / NS * TAU, ph = (ph0 > 3 ? -1 : 1) * th * turns + ph0, rr = rad + Math.cos(ph) * tr; pts.push(V(Math.cos(th) * rr, Math.sin(th) * rr, Math.sin(ph) * tr)); }
        const sm = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }), m = part(RG, orbColGeo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), NS, 0.0042, 4, true), NS, 4), sm, null, rot, null, { ink: false, shadow: false });
        m.userData.cs = { n: NS, r: 4, ph: ph0 / TAU, rep: 3, sp: ph0 > 3 ? -0.06 : 0.06 }; HM.ringSpirals.push(m); } }
    const add = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending });
    const core = new THREE.Group(); G2.add(core); HM.globeCore = core; part(core, new THREE.SphereGeometry(0.032, 16, 12), add(0xb8d4ff, 0.8), null, null, null, { ink: false, shadow: false }); HM.coreMid = part(core, new THREE.SphereGeometry(0.085, 20, 14), add(0x2a5fe8, 0.45), null, null, null, { ink: false, shadow: false }); HM.coreGlow = part(core, new THREE.SphereGeometry(0.15, 20, 14), add(0x1d3fbf, 0.28), null, null, null, { ink: false, shadow: false });
    HM.swirls = []; for (let k = 0; k < 3; k++) { const pts = []; for (let i = 0; i <= 60; i++) { const u = i / 60, a = u * TAU * 2.2 + k * 2.1, rr = 0.05 + 0.1 * Math.sin(Math.PI * u); pts.push(V(Math.cos(a) * rr, (u - 0.5) * 0.24, Math.sin(a) * rr)); } const sm = add(0xffffff, 0.6); sm.vertexColors = true; const sw = part(core, orbColGeo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.006, 5, false), 80, 5), sm, null, [k * 0.7, 0, k * 0.5], null, { ink: false, shadow: false }); sw.userData.cs = { n: 80, r: 5, ph: k / 3, rep: 1, sp: 0.05 }; HM.swirls.push(sw); }
    const inner = new THREE.Group(); inner.scale.setScalar(0.55); G2.add(inner); HM.globeIn = inner;
    part(inner, rbox(0.16, 0.012, 0.08, 0.004), toon(0x8a5a32), [0, -0.05, 0]); for (const [x, z] of [[-0.08, -0.04], [0.08, -0.04], [-0.08, 0.04], [0.08, 0.04]]) { const L = new THREE.Vector3(-x, 0.17, -z).length(); part(inner, cyl(0.002, 0.002, L, 4), toon(0xe8dcc0), [x / 2, 0.035, z / 2], [Math.atan2(z, 0.17) * -1, 0, Math.atan2(x, 0.17)], null, { ink: false, shadow: false }); }
    part(inner, rbox(0.06, 0.04, 0.035, 0.008), toon(0x4a6f9e), [0.03, -0.025, 0], null, null, { shadow: false }); part(inner, new THREE.ConeGeometry(0.035, 0.05, 10), toon(0xd9573c), [-0.04, -0.015, 0.01], null, null, { shadow: false });
    const boltM = new THREE.LineBasicMaterial({ color: 0x8fb8ff, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }), boltM2 = new THREE.LineBasicMaterial({ color: 0x3f7bff, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }); HM.bolts = [];
    for (let i = 0; i < 10; i++) { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(8 * 3), 3)); const ln = new THREE.Line(geo, i % 3 ? boltM : boltM2); ln.frustumCulled = false; T.add(ln); HM.bolts.push(ln); }
    const halo = part(G2, new THREE.SphereGeometry(0.34, 24, 16), new THREE.MeshBasicMaterial({ color: 0x3f7bff, transparent: true, opacity: 0.06, depthWrite: false, side: THREE.BackSide }), [0, 0, 0], null, null, { ink: false, shadow: false }); HM.globeHalo = halo; HM.globeGlass = rings;
    const gl = new THREE.PointLight(0x4f8cff, 0.6, 3.2, 1.5); G2.add(gl); HM.globeLight = gl;
    
    HM.onAct = (v) => { if (v === 'camp') { HM.offer = false; HM.extraActs = []; HM.travel = 'camp'; if (typeof setTab === 'function') setTab('ledge'); } };
    HM.obs.push({ x: t.x, z: t.z, r: 0.55 }); }
  // the untethering: where lineIn reaches the cradle its two strands unravel into a fan of glowing fibres that sweep out and merge into the core;
  // out of the core a second fan gathers back together into lineOut, which re-forms and runs on to the vault. Beads of light run along every fibre.
  function globeWeave(tw) { const lst = Array.isArray(tw) ? tw : null; if (lst) tw = { a: lst[0], b: lst[1] }; tw = twinOf(tw && tw.a ? tw : tw ? { grade: tw, dir: 'in' } : null); const R = globeRoute(), t = HMP.table, C0 = V(t.x, 1.08, t.z), ea = R.a[R.a.length - 1], eb = R.b[0], W = new THREE.Group(); HM.cords.add(W); HM.weave = W; HM.fibres = [];
    const LS = lst ? lst.map((x) => LGRADES[x.grade] || LGRADES.bronze) : [LGRADES[tw.a.grade] || LGRADES.bronze, LGRADES[tw.b.grade] || LGRADES.bronze], NF = Math.max(12, Math.min(24, LS.length * 2)), rp = prng(41);
    for (const [side, e] of [['in', ea], ['out', eb]]) for (let i = 0; i < NF; i++) { const L2 = LS[i % LS.length], ph = Math.atan2(e.z - C0.z, e.x - C0.x) + (i / (NF - 1) - 0.5) * 2.6, rr = 0.19 + rp() * 0.08, yy = (rp() - 0.5) * 0.24,
        w = V(C0.x + Math.cos(ph) * rr, C0.y + yy, C0.z + Math.sin(ph) * rr), up = e.clone().add(V((rp() - 0.5) * 0.04, 0.05, (rp() - 0.5) * 0.04)), pts = [e.clone(), up, w, C0.clone().add(V((rp() - 0.5) * 0.04, (rp() - 0.5) * 0.04, (rp() - 0.5) * 0.04)), C0.clone()];
      const cu = new THREE.CatmullRomCurve3(side === 'in' ? pts : pts.reverse()), N = 40, geo = new THREE.TubeGeometry(cu, N, 0.0045 + rp() * 0.003, 5, false), P = geo.attributes.position, col = new Float32Array(P.count * 4), c = new THREE.Color(L2.col).lerp(new THREE.Color(L2.core), 0.3);
      for (let k = 0; k < P.count; k++) { const u = Math.floor(k / 6) / N, uc = side === 'in' ? u : 1 - u, al = Math.min(1, (1 - uc) / 0.4) * 0.6 * Math.min(1, 12 / NF) * Math.min(1, (1 - uc) / 0.55 + 0.25); /* fainter as they crowd in, so many Ledge Tethers don't white out the core */ col.set([c.r, c.g, c.b, al], k * 4); } geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); W.add(m); const bd = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(L2.en).lerp(new THREE.Color(0xffffff), 0.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); W.add(bd);
      HM.fibres.push({ m, cu, bd, side, u: rp() }); }
    for (const e of [ea, eb]) part(W, cyl(0.04, 0.035, 0.04, 14), toon(0xc9963e), [e.x, e.y - 0.01, e.z], [0, 0, 0]); if (HM.table) W.traverse((o) => { o.userData.tap = HM.table.userData.tap; }); }
  function globeTick(dt) { if (!HM.globe) return; const t = HM.t || 0, fl = Math.max(0, Math.sin(t * 9.1) * Math.sin(t * 3.7 + 1)), [R1, R2, R3] = HM.globeRings; R1.rotation.y += dt * 0.5; R2.rotation.x += dt * 0.8; R3.rotation.z += dt * 0.35; HM.globeIn.rotation.y += dt * 0.4; HM.globeIn.position.y = 0.012 * Math.sin(t * 1.3);
    const pu = 1 + 0.08 * Math.sin(t * 3.1) + 0.05 * fl; HM.globeCore.scale.setScalar(pu); HM.swirls.forEach((s, i) => { s.rotation.y += dt * (1.6 + i * 0.7) * (i % 2 ? -1 : 1); s.rotation.x += dt * 0.3 * (i + 1); }); HM.coreGlow.material.opacity = 0.22 + 0.12 * fl;
    (HM.petals || []).forEach((p, i) => { p.rotation.y = 0.04 * Math.sin(t * 0.8 + i); });
    for (const f of HM.fibres || []) { f.u = (f.u + dt * 0.55) % 1; f.cu.getPointAt(f.u, f.bd.position); f.bd.material.opacity = f.side === 'in' ? Math.min(1, (1 - f.u) / 0.3) : Math.min(1, f.u / 0.3); }
    HM.boltT = (HM.boltT || 0) - dt; if (HM.boltT <= 0) { HM.boltT = 0.06 + Math.random() * 0.06; const cz = V(0, 1.08, 0), Fb = HM.fibres || []; HM.bolts.forEach((b, i) => { const P = b.geometry.attributes.position, on = Math.random() < 0.75; b.visible = on; if (!on) return; let a = cz.clone(), z;
        if (i < 6) { const d = V(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(); z = cz.clone().addScaledVector(d, 0.24 + Math.random() * 0.08); } else if (Fb.length) { const f = Fb[Math.floor(Math.random() * Fb.length)], p0 = f.cu.getPointAt(0.15 + Math.random() * 0.5).sub(HM.table.position); a = p0; z = p0.clone().add(V((Math.random() - 0.5) * 0.18, (Math.random() - 0.3) * 0.12, (Math.random() - 0.5) * 0.18)); } else z = cz.clone();
        for (let k = 0; k < 8; k++) { const u = k / 7, q = a.clone().lerp(z, u); if (k && k < 7) q.add(V((Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05)); P.setXYZ(k, q.x, q.y, q.z); } P.needsUpdate = true; b.material.opacity = 0.45 + 0.4 * Math.random(); }); }
    orbRefresh(); HM.orbT = t; for (const m of HM.swirls) orbPaint(m, t); for (const m of HM.ringSpirals || []) orbPaint(m, t); if (HM.orbColsC) { const cs = HM.orbColsC, n = cs.length, x = (t * 0.05) % 1 * n, k = Math.floor(x) % n, f = x - Math.floor(x), cc = cs[k].clone().lerp(cs[(k + 1) % n], f * f * (3 - 2 * f)); HM.coreMid.material.color.copy(cc).lerp(new THREE.Color(0x2a5fe8), 0.35); HM.coreGlow.material.color.copy(cc).multiplyScalar(0.7).lerp(new THREE.Color(0x1d3fbf), 0.35); } HM.globeLight.intensity = (HM.offer ? 1.0 : 0.6) + 0.25 * fl; HM.globeHalo.material.opacity = (HM.offer ? 0.16 : 0.06) + 0.03 * Math.sin(t * 2); }
  // interior mood: inside the Ledge the scene's daylight rig drops to a dim warm ambience and the room is lit by its own lanterns, forge and globe
  // the camera's clear space in the Ledge room: inside the side and back walls and under the ceiling; the front is the open cut-away side
  function homeInside(q) { const m = 0.22; return q.x > -HM.W / 2 + m && q.x < HM.W / 2 - m && q.z > HM.BZ + m && q.y > 0.3 && q.y < HM.H - m; }
  function homeLights(inside) { if (HM._lit === inside) return; HM._lit = inside; for (const o of scene.children) { if (!o.isLight) continue; if (o.userData.base === undefined) o.userData.base = o.intensity; o.intensity = o.userData.base * (inside ? (o.isHemisphereLight ? 0.2 : 0.16) : 1); }
    for (const l of HM.inLights || []) l.visible = inside; }
  /* ---------- the Vault: tap the safe for everything stored in the Ledge. Ores read the game's own counts where they exist (Iron ore, Breathcoal, Steel);
     everything else lives in saved state (S.ledgeVault) that starts at 0 - no made-up economy. Sections are data, so new kinds of stored items just add a row. ---------- */
  function vaultState() { if (typeof S === 'undefined' || !S) return { ores: {}, ingots: {}, gear: {}, lines: {} }; const v = S.ledgeVault || (S.ledgeVault = {}); for (const k of ['ores', 'ingots', 'gear', 'lines']) v[k] = v[k] || {}; return v; }
  const _vIcon = {}; function vIcon(kind, k, c1, c2) { const key = kind + k; if (_vIcon[key]) return _vIcon[key]; const hx = (c) => '#' + new THREE.Color(c).getHexString(); const cvs = document.createElement('canvas'); cvs.width = cvs.height = 64; const x = cvs.getContext('2d');
    if (kind === 'ore') { const r = prng(k.length * 7 + k.charCodeAt(0)), pts = []; for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + r() * 0.4, rr = 20 + r() * 8; pts.push([32 + Math.cos(a) * rr, 34 + Math.sin(a) * rr * 0.8]); } x.fillStyle = hx(c2); x.beginPath(); pts.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py))); x.closePath(); x.fill(); x.lineWidth = 3; x.strokeStyle = '#2a1a10'; x.stroke();
      x.fillStyle = hx(c1); for (let i = 0; i < 4; i++) { const [px, py] = pts[(i * 2) % 7]; x.beginPath(); x.moveTo(32, 33); x.lineTo(px * 0.7 + 32 * 0.3, py * 0.7 + 34 * 0.3); x.lineTo(pts[(i * 2 + 1) % 7][0] * 0.6 + 32 * 0.4, pts[(i * 2 + 1) % 7][1] * 0.6 + 34 * 0.4); x.closePath(); x.fill(); } x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.ellipse(24, 24, 6, 3, -0.6, 0, TAU); x.fill(); }
    else if (kind === 'ingot') { x.fillStyle = hx(c1); x.beginPath(); x.moveTo(10, 44); x.lineTo(54, 44); x.lineTo(46, 24); x.lineTo(18, 24); x.closePath(); x.fill(); x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.moveTo(18, 24); x.lineTo(46, 24); x.lineTo(43, 30); x.lineTo(21, 30); x.closePath(); x.fill(); x.lineWidth = 3; x.strokeStyle = '#2a1a10'; x.beginPath(); x.moveTo(10, 44); x.lineTo(54, 44); x.lineTo(46, 24); x.lineTo(18, 24); x.closePath(); x.stroke(); }
    else { x.lineWidth = 7; x.lineCap = 'round'; for (const [c, ph] of [[c1, 0], [c2, Math.PI]]) { x.strokeStyle = hx(c); x.beginPath(); for (let i = 0; i <= 30; i++) { const u = i / 30, px = 10 + u * 44, py = 32 + Math.sin(u * TAU * 1.5 + ph) * 9; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); } }
    return (_vIcon[key] = cvs.toDataURL()); }
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const artIco = (id) => (typeof itemIco === 'function' && itemIco(id)) || '';
  const VAULT_SECTIONS = [
    { id: 'ores', title: '⛏️ Ores', items: () => Object.keys(ORES).map((k) => ({ k, name: ORES[k].name, sub: 'feeds ' + ORES[k].feeds, ico: artIco('ore:' + k), icon: vIcon('ore', k, ORES[k].vein, ORES[k].crys), n: k === 'iron' ? (S.res && S.res.iron) || 0 : k === 'coal' ? (S.res && S.res.coal) || 0 : vaultState().ores[k] || 0 })) },
    { id: 'ingots', title: '🧱 Ingots', items: () => ['bronze', 'iron', 'steel', 'gold', 'mithril', 'rune', 'lumen', 'onyx'].map((k) => ({ k, name: (k === 'onyx' ? 'Ember Onyx' : cap(k)) + ' ingot', ico: artIco('ingot:' + k), icon: vIcon('ingot', k, (LGRADES[k] || {}).col || 0x9aa3ab), n: k === 'steel' ? (S.res && S.res.steel) || 0 : vaultState().ingots[k] || 0 })) },
    { id: 'gear', title: '🎒 Gear', items: () => { const o = [['pick', '⛏️', 'Pickaxe', GRADES[S.pickGrade || 'stick']], ['climb', '🧗', 'Climbing picks', CGRADES[S.climbGrade || 'stone']], ['tether', '🪢', 'Tether', TGRADES[S.tetherGrade || 'regular']]].map(([k, e, nm, G]) => ({ k, emoji: e, name: G && /axe$/i.test(G.name) ? G.name : (G ? G.name + ' ' : '') + nm, sub: 'equipped', n: 1 })); for (const k in vaultState().gear) if (vaultState().gear[k] > 0) { const it = typeof Craft !== 'undefined' && Craft.ITEMS['tool:' + k]; o.push({ k, ico: artIco('tool:' + k), emoji: it ? it.emoji : '📦', name: it ? it.name : cap(k), n: vaultState().gear[k] }); } return o; } },
    { id: 'lines', title: '🔗 Tethers & Ledge Tethers', items: () => { const hs = homeState(), o = []; for (const id of PORTS) { const P2 = hs.ports && hs.ports[id]; if (!P2) continue; const tw = twinOf(P2); o.push({ k: id, name: (id === 'c' ? 'Main' : 'Port ' + id.slice(1)) + ' Ledge Tether', sub: cap(tw.a.grade) + ' + ' + cap(tw.b.grade) + ' · plugged in', ico: artIco('tether:' + tw.a.grade), icon: vIcon('line', tw.a.grade + tw.b.grade, (LGRADES[tw.a.grade] || {}).col || 0x888888, (LGRADES[tw.b.grade] || {}).col || 0x888888), n: 1 }); } for (const k in vaultState().lines) if (vaultState().lines[k] > 0) o.push({ k, ico: artIco('tether:' + k), emoji: '🪢', name: cap(k) + ' Ledge Tether (spare)', n: vaultState().lines[k] }); return o; } },
  ];
  function vaultHTML() { const esc2 = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])), fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(n >= 1e4 ? 0 : 1) + 'k' : String(Math.floor(n)));
    // (Dominic: field-kit skin, Art's B_vault) a brass vault-door medallion instead of a VAULT title, brass plaques for section names and totals; counts are live
    let h = '<div class="vaultp kKit"><div class="kVHead"><img class="kDoor" src="assets/ui/kit_door.webp" alt="Vault"><span class="kTag">Ledge safe</span></div>';
    for (const sec of VAULT_SECTIONS) { const it = sec.items(), tot = it.reduce((a, b) => a + b.n, 0); h += `<div class="card vsec vs-${sec.id}" data-sec="${sec.id}"><div class="row between"><h3 class="kTag">${sec.title.replace(/^\S+\s/, '').replace(' & Ledge Tethers', '')}</h3><span class="tag kTag">${fmt(tot)}</span></div>`;
      h += it.length ? `<div class="vgrid">${it.map((q) => `<div class="vitem${q.n ? '' : ' zero'}${/equipped|plugged in/.test(q.sub || '') ? ' eq' : ''}" data-k="${esc2(q.k)}" title="${esc2(q.name)}"><span class="vic">${q.ico || (q.icon ? `<img src="${q.icon}" alt="">` : `<span class="ve">${q.emoji || '📦'}</span>`)}</span><div class="vn">${esc2(q.name)}${q.sub ? `<small>${esc2(q.sub)}</small>` : ''}</div><b class="vc">${fmt(q.n)}</b></div>`).join('')}</div>` : '<div class="dim">Nothing stored here yet.</div>';
      h += '</div>'; }
    return h + '<div class="kVBtns">' + (typeof Craft !== 'undefined' ? '<button class="btn alt kBtn kBlue" data-cx="xfer"><span class="kBag">🎒</span>Backpack ⇄ Vault</button>' : '') + '<button class="btn kBtn kCream" data-vclose>Close</button></div></div>'; }
  function openVault() { if (typeof openModal !== 'function') return false; vaultState(); openModal(vaultHTML(), 'vault'); const b = document.querySelector('#modalBody [data-vclose]'); if (b) b.addEventListener('click', () => (typeof closeModal === 'function' ? closeModal() : null)); HM.vaultOpen = (HM.vaultOpen || 0) + 1; st.lastInput = clk; return true; }
  function makeHome() { const g = new THREE.Group(); g.name = 'home'; HM.room = makeRoom(); furnishRoom(HM.room); furnishSmithing(HM.room); furnishGlobe(HM.room);  g.add(HM.room); HM.ext = makeHomeExt(); g.add(HM.ext); HM.cords = new THREE.Group(); g.add(HM.cords); HM.tw = twinOf(S && (S.homeStrands || (LGRADES[S.homeLine] ? { grade: S.homeLine, dir: 'in' } : null)), { a: { grade: 'lumen', dir: 'to' }, b: { grade: 'lumen', dir: 'from' } }); refreshPorts(); return g; }
  // ports: locks on the 8 small ones until unlocked; plugged Ledge Tethers get a brass plug and a cord (outside: down off the shelf; inside, the centre port's line runs to the vault)
  // rounded corners for a polyline route (exterior Ledge Tether cords)
  function rounded(pts, r = 0.05) { const o = [pts[0]]; for (let i = 1; i < pts.length - 1; i++) { const a = pts[i - 1], b = pts[i], c = pts[i + 1], d1 = b.clone().sub(a), d2 = c.clone().sub(b), r1 = Math.min(r, d1.length() * 0.45), r2 = Math.min(r, d2.length() * 0.45); d1.normalize(); d2.normalize(); o.push(b.clone().addScaledVector(d1, -r1), b.clone().addScaledVector(d1, -r1 * 0.3).addScaledVector(d2, r2 * 0.3), b.clone().addScaledVector(d2, r2)); } o.push(pts[pts.length - 1]); return o; }
  // every cord leaves its port straight out (perpendicular to the door) to its own stand-off plane, drops plumb down the door face like the main
  // one, and near the threshold eases into its own floor lane, then runs along the shelf in parallel and over the edge. Stand-offs are layered so a
  // cord that drops past a lower port passes in front of that port's plug and cord (top port furthest out, bottom port closest to the door).
  /* every port's Ledge Tether has the main line's girth, so the side lines leave their ports in three depth layers (a line dropping past a lower port clears its plug) and fan out into floor lanes ~0.13 apart */
  const DOOR_LANE = { c: [0.2, 0], p0: [0.35, 0.15], p1: [0.42, 0.43], p2: [0.2, 0.56], p3: [0.07, 0.28], p4: [0.07, -0.15], p5: [0.07, -0.28], p6: [0.2, -0.56], p7: [0.42, -0.43] };
  function doorRoute(id, ox, oy, z0) { const E = HM.FZ + 1.0, fy = 0.035, [so, ln] = DOOR_LANE[id] || [0.12, 0], zs = z0 + so, lx = HM.dx + ln, c = id === 'c', yk = Math.min(oy - 0.08, 0.34);
    return rounded([V(ox, oy, z0 + 0.03), V(ox, oy, zs), V(ox, yk, zs), V(lx, fy, zs + 0.16), V(lx, fy, E), V(lx, -0.3, E + 0.06), V(lx, -1.2, E + 0.07)], c ? 0.07 : 0.05); }
  function refreshPorts() { syncDoors(); const hs = homeState(), dr = HM.door; if (!dr) return; for (const [i, id] of PORTS.entries()) { const pg = dr.userData.ports[id], locked = id !== 'c' && i - 1 >= hs.open, P2 = hs.ports[id]; if (pg.userData.lock) pg.userData.lock.visible = locked; if (pg.userData.glow) pg.userData.glow.visible = !P2; }
    for (const c of [...HM.cords.children]) { HM.cords.remove(c); c.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); } HM.cordList = [];
    for (const id of PORTS) { if (!hs.ports[id]) continue; const P2 = hs.ports[id] = twinOf(hs.ports[id]); const pp = portPos(id), c = id === 'c', k = 2.4 /* the main line's braid at every port */, ox = HM.dx + pp.x, oy = pp.y, z0 = HM.FZ + 0.06;
      const plug = new THREE.Group(); plug.position.set(ox, oy, z0); HM.cords.add(plug); part(plug, cyl(0.07, 0.06, 0.08, 16).rotateX(Math.PI / 2), toon(0xb07a3a), [0, 0, 0.03]);
      const out = doorRoute(id, ox, oy, z0);
      const cd = twinCord(HM.cords, out, P2, k, 0, c ? 0 : ltR()); cd.userData.port = id; cd.userData.seed = PORTS.indexOf(id) * 1.7; cd.userData.ext = true; HM.cordList.push(cd);
    }
    insideLines(hs);
    hs.ports && (HM.n = Object.keys(hs.ports).length); homeInfo(); }
  // inside the Ledge. Main line alone: door -> table -> globe -> vault as before. With extra ports plugged, every extra Ledge Tether comes in through the
  // door too: each drops from its port down to the floor and joins the main line where it lands, and from there all the strands (2 per Ledge Tether,
  // each in its tier colour) run on twined into one big braided Ledge Tether - up the table, unravelling into the globe, re-forming and on to the vault.
  // Its thickness grows with the number of Ledge Tethers in it.
  function braidR(list, k = 2.4) { const NS = list.length, sh = NS > 2 ? Math.max(0.6, 1 - 0.03 * (NS - 2)) : 1, sm = Math.max(...list.map((x) => (LGRADES[x.grade] || LGRADES.bronze).r * k * sh)); return NS > 2 ? sm / Math.sin(Math.PI / NS) * BRAID_GAP + sm : sm * 1.95; }
  // the Ledge Tether bundle's axis from the door hub to the floor: out of the hub, a turn down, straight down the door, then one generous bend (radius RB) onto the floor
  // heading for Mf (arriving along t0) - points only, the caller lays strands round it
  function doorAxis(D0, Tg, yF, RB = 0.3, Rt = 0.18) { const zo = D0.z - 0.32, cz = zo - Rt, col = V(D0.x, 0, cz), h = V(Tg.x - col.x, 0, Tg.z - col.z); if (h.lengthSq() < 1e-6) h.set(0, 0, -1); h.normalize();
    const out = [D0.clone(), V(D0.x, D0.y, D0.z - 0.1), V(D0.x, D0.y, D0.z - 0.21), V(D0.x, D0.y, zo)]; for (let k = 1; k <= 6; k++) { const a = k / 6 * Math.PI / 2; out.push(V(D0.x, D0.y - Rt * (1 - Math.cos(a)), zo - Rt * Math.sin(a))); }
    const yb = yF + RB; if (D0.y - Rt - yb > 0.1) out.push(V(D0.x, (D0.y - Rt + yb) / 2, cz)); for (let k = 0; k <= 10; k++) { const a = k / 10 * Math.PI / 2; out.push(col.clone().addScaledVector(h, RB * (1 - Math.cos(a))).setY(yb - RB * Math.sin(a))); }
    const Fb = col.clone().addScaledVector(h, RB).setY(yF); out.push(Fb.clone().addScaledVector(h, 0.12), Fb.clone().addScaledVector(h, 0.3)); return out; } // then straight on along the floor to Tg
  function insideLines(hs) { HM.mainCord = HM.mainOut = HM.mainLead = HM.bigBraid = null; HM.feeders = []; const main = hs.ports.c, extras = PORTS.filter((id) => id !== 'c' && hs.ports[id]); if (!main && !extras.length) { HM.weave = null; HM.fibres = []; return; }
    const GR = globeRoute(), pinAt = (id, big) => { const pp = portPos(id), pin = new THREE.Group(); pin.position.set(HM.dx + pp.x, pp.y, HM.FZ - 0.06); HM.cords.add(pin); part(pin, cyl(big ? 0.07 : 0.035, big ? 0.06 : 0.03, 0.08, 16).rotateX(-Math.PI / 2), toon(0xb07a3a), [0, 0, -0.03]); return pin; };
    if (main) HM.plugIn = pinAt('c', true);
    if (!extras.length) { const P2 = main, F3 = GR.a[3], t3 = GR.a[4].clone().sub(F3).setY(0).normalize(), yT = Math.max(0.06, (LGRADES[P2.a.grade] || LGRADES.bronze).r * 2.4 * 2 + 0.005), ic = twinCord(HM.cords, doorAxis(GR.a[0], GR.a[4], yT, 0.3).concat(GR.a.slice(4).map((q) => (q.y < yT ? V(q.x, yT, q.z) : q))), P2, 2.4, 1); ic.userData.port = 'c'; ic.userData.seed = 0; ic.userData.inside = true; ic.userData.pts = mainLinePts(); HM.cordList.push(ic); HM.mainCord = ic; const oc = twinCord(HM.cords, GR.b, P2, 2.4, 1); oc.userData.port = 'c'; oc.userData.seed = 0.5; oc.userData.inside = true; HM.cordList.push(oc); HM.mainOut = oc; globeWeave(P2); return; }
    // ONE continuous lay: every Ledge Tether's twin leaves its port and gathers into a single bundle round one axis; the bundle comes out of the door hub, turns down, falls
    // straight down the door and bends onto the floor through a generous radius; there, over a transition length LT, each twin's pitch, radius and phase blend (C2-smooth
    // weights) into its two strands' helix slots round the big rope, which carries on to the globe - no seam, kink, gap, overlap or gauge step anywhere
    const MI = 3, M = GR.a[MI].clone(), t0 = GR.a[MI + 1].clone().sub(M).setY(0).normalize(), D0 = V(HM.dx, HM.pc, HM.FZ - 0.08), all = (main ? ['c'] : []).concat(extras);
    const pre = all.flatMap((id) => { const tw = twinOf(hs.ports[id]); return [tw.a, tw.b]; }), NSb = pre.length, shB = Math.max(0.6, 1 - 0.03 * (NSb - 2)), smx = Math.max(...pre.map((x) => (LGRADES[x.grade] || LGRADES.bronze).r * 2.4 * shB)),
      rrb = smx / Math.sin(Math.PI / NSb) * BRAID_GAP, twb = TAU / (rrb * TAU * BRAID_LAY), R0 = rrb + smx, yF = R0 + 0.02, lift = (q) => (q.y < yF ? V(q.x, yF, q.z) : q.clone());
    const axp = doorAxis(D0, GR.a[MI + 1], yF, 0.26 + 0.03 * Math.min(4, all.length)).concat(GR.a.slice(MI + 1).map(lift)), al0 = new THREE.CatmullRomCurve3(axp, false, 'centripetal').getLength(), AX = layAxis(axp, Math.max(120, Math.min(900, Math.round(al0 / 0.008)))), NA = AX.P.length;
    const sw = (u) => { u = clamp(u, 0, 1); return u * u * u * (u * (u * 6 - 15) + 10); }, wrapA = (d) => Math.atan2(Math.sin(d), Math.cos(d));
    let iA = AX.P.findIndex((q, i) => i > 4 && q.y < yF + 0.004); if (iA < 0) iA = Math.floor(NA * 0.3); const sA = AX.S[iA], LT = HM.joinLT = Math.min(0.9, Math.max(0.45, 2.4 * R0)), sE = sA + LT, sG = Math.min(0.3, sA * 0.4); /* the gather into the bundle is done before the axis turns down */
    let iE = AX.S.findIndex((v) => v >= sE); if (iE < 0) iE = NA - 1; const W = AX.S.map((v) => sw((v - sA) / LT)), PHI = [0]; for (let i = 1; i < NA; i++) PHI.push(PHI[i - 1] + (AX.S[i] - AX.S[i - 1]) * twb * 0.5 * (W[i] + W[i - 1]));
    const onAx = (i, ang, rad) => AX.P[i].clone().addScaledVector(AX.Nn[i], Math.cos(ang) * rad).addScaledVector(AX.Bn[i], Math.sin(ang) * rad);
    // each port's place round the bundle where it leaves the door (seen down the axis) -> its slot: ports keep their angular order (best rotation), the hub's twin moves out into a gap
    const n = all.length, slotA = (k) => ((2 * k + 0.5) / NSb) * TAU, pol = {}; for (const id of all) { const pp = portPos(id), dy = pp.y - HM.pc; pol[id] = { r: Math.hypot(pp.x, dy), f: Math.atan2(pp.x, dy) }; }
    const rings = all.filter((id) => id !== 'c').sort((x, y) => pol[x].f - pol[y].f); let best = null;
    for (let q = 0; q < (main ? rings.length + 1 : 1); q++) { const seq = main ? rings.slice(0, q).concat(['c'], rings.slice(q)) : rings.slice(); for (let k = 0; k < n; k++) { let c = 0; seq.forEach((id, i) => { if (id !== 'c') c += Math.abs(wrapA(pol[id].f - slotA((i + k) % n))); }); if (!best || c < best.c - 1e-9) best = { c, seq, k }; } }
    const ids = []; best.seq.forEach((id, i) => { ids[(i + best.k) % n] = id; });
    const list = []; for (const id of ids) { const tw = twinOf(hs.ports[id]), sd = id === 'c' ? 0 : PORTS.indexOf(id) * 1.7; list.push(Object.assign({ key: 'a', port: id, seed: sd, lj: 0 }, tw.a), Object.assign({ key: 'b', port: id, seed: sd, lj: 1 }, tw.b)); }
    HM.braidN = ids.length; HM.braidR = R0; HM.braidList = list.map((x) => x.grade); HM.braidSlots = ids.slice();
    const braidAt = (j, i) => onAx(i, j / NSb * TAU + PHI[i], rrb), twT = TAU / (7 * 2 * smx), rt = smx * 0.95;
    const lead = (id) => { const k = ids.indexOf(id), ja = 2 * k, jb = 2 * k + 1, pc = pol[id], dF = id === 'c' || pc.r < 1e-4 ? 0 : wrapA(slotA(k) - pc.f), f0 = id === 'c' || pc.r < 1e-4 ? slotA(k) : pc.f;
      const Q = []; for (let i = 0; i <= iE; i++) { const g = sw(AX.S[i] / sG); Q.push(onAx(i, f0 + dF * g + PHI[i], lerp(pc.r, rrb, g))); }
      const Nq = [], Bq = [], sQ = [0]; let n0 = AX.Nn[0].clone(); for (let i = 0; i <= iE; i++) { const t2 = Q[Math.min(iE, i + 1)].clone().sub(Q[Math.max(0, i - 1)]).normalize(); n0.addScaledVector(t2, -n0.dot(t2)).normalize(); Nq.push(n0.clone()); Bq.push(t2.clone().cross(n0)); if (i) sQ.push(sQ[i - 1] + Q[i].distanceTo(Q[i - 1])); }
      const th = [0]; for (let i = 1; i <= iE; i++) th.push(th[i - 1] + (sQ[i] - sQ[i - 1]) * (twT * (1 - W[i]) + twb * W[i]));
      const dA = braidAt(ja, iE).sub(Q[iE]), th0 = Math.atan2(dA.dot(Bq[iE]), dA.dot(Nq[iE])) - th[iE];
      const path = (side, j) => { let pd = null; return Q.map((q, i) => { const a = th0 + th[i] + side * Math.PI; if (!(W[i] > 0)) return q.clone().addScaledVector(Nq[i], Math.cos(a) * rt).addScaledVector(Bq[i], Math.sin(a) * rt); const T2 = braidAt(j, i).sub(q), tq = Q[Math.min(iE, i + 1)].clone().sub(Q[Math.max(0, i - 1)]).normalize(), ax2 = T2.dot(tq); T2.addScaledVector(tq, -ax2); const rb = T2.length(), ab = Math.atan2(T2.dot(Bq[i]), T2.dot(Nq[i])), w = W[i]; let dd = wrapA(ab - a); if (pd !== null) { while (dd - pd > Math.PI) dd -= TAU; while (dd - pd < -Math.PI) dd += TAU; } pd = dd; const aa = a + w * dd, rr2 = lerp(rt, rb, w); return q.clone().addScaledVector(Nq[i], Math.cos(aa) * rr2).addScaledVector(Bq[i], Math.sin(aa) * rr2).addScaledVector(tq, ax2 * w); }); };
      const tw = twinOf(hs.ports[id]), sd = id === 'c' ? 0 : PORTS.indexOf(id) * 1.7, full = (pa, j) => pa.concat(AX.P.slice(iE + 1).map((_, q) => braidAt(j, iE + 1 + q))), pa0 = path(0, ja), pb0 = path(1, jb), fd = braidCord(HM.cords, Q, [Object.assign({ key: 'a', sr: smx, path: pa0, tube: full(pa0, ja) }, tw.a), Object.assign({ key: 'b', sr: smx, path: pb0, tube: full(pb0, jb) }, tw.b)], 2.4, 1);
      fd.userData.twin = tw; fd.userData.port = id; fd.userData.seed = sd; fd.userData.inside = true; HM.cordList.push(fd); return fd; };
    if (main) HM.mainLead = lead('c');
    extras.forEach((id) => { pinAt(id, false); const fd = lead(id); fd.userData.feeder = true; HM.feeders.push(fd); });
    const iC = Math.min(iE, AX.S.findIndex((v) => v >= sA + 0.75 * LT)), bi = braidCord(HM.cords, AX.P.slice(iC), list.map((x, j) => Object.assign({}, x, { path: AX.P.slice(iE).map((_, q) => braidAt(j, iE + q)), coreFrom: 0.001, noTube: true })), 2.4, 1);
    bi.userData.joinLT = LT; bi.userData.port = 'c'; bi.userData.inside = true; bi.userData.braid = true; bi.userData.pts = mainLinePts(); HM.cordList.push(bi); HM.mainCord = HM.bigBraid = bi; HM.joinAxis = AX; HM.joinIdx = { iA, iE, iC };
    const bo = braidCord(HM.cords, GR.b.map((q, i) => (i < GR.b.length - 2 ? lift(q) : q.clone())), list, 2.4, 1); bo.userData.port = 'c'; bo.userData.inside = true; bo.userData.braid = true; HM.cordList.push(bo); HM.mainOut = bo; globeWeave(list); }
  function homeInfo() { const hs = homeState(), e = document.getElementById('homeLines'); if (!e) return; const v = Object.values(hs.ports).map((p) => twinOf(p)), sv = v.flatMap((p) => [p.a, p.b]), i = sv.filter((x) => x.dir === 'to').length, o = sv.length - i; e.textContent = v.length ? `${v.length} × 2 strands · ${i} to Ledge · ${o} from` : 'no Ledge Tethers plugged'; const m = document.getElementById('homeMode'); if (m) m.textContent = HM.mode === 'in' ? 'inside' : 'at the door'; const sm = document.querySelector('#homeInfo small'); if (sm) { const t2 = HM.mode === 'in' ? 'Your Ledge, inside the cliff. Drag to orbit · tap to walk' : HM.menu ? 'Ledge door: enter, or manage the Ledge Tether ports' : 'Your Ledge in the cliff. Tap the door to enter or manage Ledge Tethers · drag to orbit'; if (sm.textContent !== t2) sm.textContent = t2; } }
  function plugPort(id, a, b) { const hs = homeState(); id = id || HM.sel; const i = PORTS.indexOf(id); if (i < 0) return false; if (id !== 'c' && i - 1 >= hs.open) return false; if (hs.ports[id]) return false; // one Ledge Tether per port
    hs.ports[id] = typeof a === 'string' ? twinOf({ grade: a, dir: b }) : a && a.a ? twinOf(a) : a && b ? twinOf({ a, b }) : twinOf(HM.tw); if (typeof save === 'function') save(); refreshPorts(); homeMark(); return true; }
  function unplugPort(id) { const hs = homeState(); id = id || HM.sel; if (!hs.ports[id]) return false; delete hs.ports[id];
    if (typeof Explore !== 'undefined' && Explore.NV) { if (id === 'c') Explore.NV.tether = null; Explore.NV.tdest = {}; } // drop the cached main-line / port routes so the rope cannot stay tappable or listed
    try { const D = typeof Explore !== 'undefined' && Explore.drillState && Explore.drillState(); if (D) for (const d of D.list) if (d.port === id && d.camp) d.port = null; } catch (e) {}
    if (typeof save === 'function') save(); refreshPorts(); homeMark(); return true; }
  // Strand A / B selectors: re-string the selected port's Ledge Tether live if one is plugged in, otherwise set the pair to plug in next
  function setHomeStrand(w, ch) { const hs = homeState(), P2 = hs.ports[HM.sel]; w = w === 'b' ? 'b' : 'a'; if (P2) { const t = twinOf(P2); Object.assign(t[w], ch); hs.ports[HM.sel] = t; refreshPorts(); } else { Object.assign(HM.tw[w], ch); HM.tw = twinOf(HM.tw); if (typeof S !== 'undefined' && S) { S.homeStrands = HM.tw; delete S.homeLine; } } if (typeof save === 'function') save(); homeMark(); }
  function unlockPort() { const hs = homeState(); if (hs.open >= 8) return false; hs.open++; if (typeof save === 'function') save(); refreshPorts(); homeUI(true); return true; }
  // walking: the shared ground walker with the room's bounds and furniture as round obstacles
  function homeWalker(x, z, face) { st.gnd = { home: true, x, z, face, mv: 0, back: 0, bnd: HM.mode === 'in' ? { X0: -HM.W / 2 + 0.35, X1: HM.W / 2 - 0.35, Z0: HM.BZ + 0.4, Z1: HM.FZ - 0.4 } : { X0: HM.dx - 1.05, X1: HM.dx + 1.05, Z0: HM.FZ + 0.32, Z1: HM.FZ + 0.82 }, obs: HM.mode === 'in' ? HM.obs : [] }; }
  function setHomeMode(m) { HM.mode = m === 'in' ? 'in' : 'door'; HM.ext.visible = HM.mode === 'door'; if (HM.mode === 'in') { homeWalker(HM.dx, HM.FZ - 0.75, Math.PI); Object.assign(st.orb, { az: 0.18, el: 0.75, d: 12 }); } else { homeWalker(HM.dx + 0.85, HM.FZ + 0.75, Math.PI); Object.assign(st.orb, { az: 0.3, el: 0.16, d: 3.9 }); } HM.open = 0; HM.anim = null; HM.menu = false; homeUI(true); doorMenu(false); }
  // the door menu: hidden until the door (or one of its ports) is tapped; Enter Ledge, Ledge Tether ports (plug/unplug, unlock upgrade, type, flow)
  function doorMenu(on) { HM.menu = !!on && HM.mode === 'door'; const box = document.getElementById('homeCtl'); if (box) box.classList.toggle('shut', HM.mode === 'door' && !HM.menu); homeMark(); homeInfo(); }
  // Enter Ledge: she walks up to the shut door, the view fades out and back in inside (the door never swings open)
  function enterLedge() { if (HM.mode !== 'door' || HM.anim) return false; const G = st.gnd; doorMenu(false); HM.anim = { k: 'go', t: 0 }; G.bnd = { X0: -9, X1: 9, Z0: HM.FZ - 1, Z1: HM.FZ + 1 }; G.goal = { x: HM.dx, z: HM.FZ + 0.4, done: () => { HM.anim = { k: 'fade', t: 0, to: 'in' }; } }; return true; }
  const openDoor = enterLedge;
  function goOutside() { if (HM.mode !== 'in' || HM.anim) return false; doorMenu(false); const f = st.exRet; st.exRet = null; /* straight out to the main map, just in front of the Ledge door (the loading screen covers the switch) */ if (typeof Explore !== 'undefined' && Explore.outsideLedge) Explore.outsideLedge(); else if (f) f(); else if (typeof setTab === 'function') setTab('city'); return true; }
  function homeTick(dt) { const A = HM.anim, G = st.gnd; HM.t = (HM.t || 0) + dt; iaHome(); iaTick(dt); smithTick(dt); globeTick(dt);
    // fade transition (0.32 s out, switch scenes, 0.32 s in); the door leaf stays shut
    if (A) { A.t += dt; if (A.k === 'fade') { const F = 0.32; if (A.t >= F && !A.sw) { A.sw = true; setHomeMode(A.to); HM.anim = A; } HM.fade = A.t < F ? ss(0, F, A.t) : 1 - ss(F, 2 * F, A.t); if (A.t >= 2 * F) { HM.anim = null; HM.fade = 0; } } }
    { const fe = document.getElementById('homeFade'); if (fe) { const o = (HM.fade || 0).toFixed(3); if (fe.style.opacity !== o) fe.style.opacity = o; } }
    if (HM.door) HM.door.userData.leaf.rotation.y = 0;
    let mv = 0, xm = 0; for (const cd of HM.cordList || []) { const sd = cd.userData.seed || 0; mv |= twinTick(cd, HM.t, dt, cd.userData.strands.map((x, j) => x.port ? strandLoad(HM.t, x.lj, x.seed) : strandLoad(HM.t, j, sd))); for (const x of cd.userData.strands) xm = Math.max(xm, x.xl); } HM.xl = xm; HM.moving = !!mv;
    for (const pg of Object.values(HM.door ? HM.door.userData.ports : {})) if (pg.userData.glow && pg.userData.glow.visible) pg.userData.glow.material.opacity = 0.75 + 0.1 * Math.sin(HM.t * 2);
    if (HM.ext.userData.lamp) HM.ext.userData.lamp.intensity = 0.85 + 0.08 * Math.sin(HM.t * 7) * Math.sin(HM.t * 3.1);
    if (HM.tickX) HM.tickX(dt); const s2 = document.getElementById('homeXfer'); if (s2) { const s = HM.moving ? 'moving' : 'idle'; if (s2.textContent !== s) s2.textContent = s; } }
  function homeMark() { markBox(document.getElementById('homeCtl')); if (XD.box && XD.on) markBox(XD.box); }
  function markBox(box) { if (!box) return; ensureTw(); /* the strand picks exist even before the Ledge view was ever opened */ const hs = homeState(); for (const b of box.querySelectorAll('button[data-v]')) { const k = b.parentNode.dataset.k, v = b.dataset.v; let on = false, dis = false;
      if (k === 'port') { const i = PORTS.indexOf(v); on = v === HM.sel; dis = v !== 'c' && i - 1 >= hs.open; b.classList.toggle('full', !!hs.ports[v]); } else if (/^[ld][ab]$/.test(k)) { const tw = hs.ports[HM.sel] ? twinOf(hs.ports[HM.sel]) : HM.tw; on = v === tw[k[1]][k[0] === 'l' ? 'grade' : 'dir']; } else if (k === 'dir') on = v === HM.dir; else if (k === 'xfer') on = v === LG.xfer;
      b.classList.toggle('on', on); b.classList.toggle('dis', dis); }
    const pb = box.querySelector('[data-v=plug]'); if (pb) pb.textContent = hs.ports[HM.sel] ? 'Unplug Ledge Tether' : 'Plug in Ledge Tether'; }
  function homeUI(force) { const box = document.getElementById('homeCtl'); if (!box) return; if (box.dataset.m === HM.mode && !force) return homeMark(); box.dataset.m = HM.mode; const hx = (c) => '#' + c.toString(16).padStart(6, '0'), hs = homeState();
    const row = (k, label, items) => `<div class="lrow"><b>${label}</b><div class="chips" data-k="${k}">${items.map(([v, n, c]) => `<button data-v="${v}"${c !== undefined ? ` style="--sw:${hx(c)}"` : ''}>${c !== undefined ? '<i></i>' : ''}${n}</button>`).join('')}</div></div>`;
    const strandRow = (w, label) => `<div class="lrow"><b>${label}</b><div class="chips dirs" data-k="d${w}"><button data-v="to">To Ledge</button><button data-v="from">From Ledge</button></div><div class="chips" data-k="l${w}">${DTIERS.map((k) => `<button data-v="${k}" style="--sw:${hx(LGRADES[k].col)}"><i></i>${GRADES[k].name}</button>`).join('')}</div></div>`;
    box.innerHTML = HM.mode === 'in' ? row('act', 'Ledge', [['out', 'Go outside']].concat(HM.extraActs || [])) + row('xfer', 'Transfer', [['auto', 'Auto'], ['on', 'On'], ['off', 'Off']])
      : '<div class="dhead"><b>Ledge door</b></div><div class="lrow dim">Tap the door to go in. Tethers, strands and ports are set at the 🔮 Tether Orb inside.</div>';
    homeMark(); if (XD.on) mapDoorPanel(true); }
  function doorRows() { const hx = (c) => '#' + c.toString(16).padStart(6, '0'), hs = homeState();
    const row = (k, label, items) => `<div class="lrow"><b>${label}</b><div class="chips" data-k="${k}">${items.map(([v, n, c]) => `<button data-v="${v}"${c !== undefined ? ` style="--sw:${hx(c)}"` : ''}>${c !== undefined ? '<i></i>' : ''}${n}</button>`).join('')}</div></div>`;
    const strandRow = (w, label) => `<div class="lrow"><b>${label}</b><div class="chips dirs" data-k="d${w}"><button data-v="to">To Ledge</button><button data-v="from">From Ledge</button></div><div class="chips" data-k="l${w}">${DTIERS.map((k) => `<button data-v="${k}" style="--sw:${hx(LGRADES[k].col)}"><i></i>${GRADES[k].name}</button>`).join('')}</div></div>`;
    return '<div class="dhead"><b>Ledge door</b><button data-v="close" title="Close">✕</button></div>' + row('act', 'Door', [['enter', 'Enter Ledge'], ['plug', 'Plug in Ledge Tether'], ['unlock', 'Upgrade: unlock a port']]) + row('port', 'Port', PORTS.map((id, i) => [id, id === 'c' ? 'Main' : (i - 1 >= hs.open ? '🔒' : '') + i])) + strandRow('a', 'Strand A') + strandRow('b', 'Strand B'); }
  /* the same front-door menu, in-world on the main map: anchored at the real map door (Explore). Tether plug / unlock / strand changes act on that door in place; only Enter goes inside */
  const XD = { box: null, on: false, doors: [], onEnter: null, onClose: null };
  function doorAct(k, v) { if (k === 'act') { if (v === 'plug') { if (!plugPort(HM.sel, HM.tw)) unplugPort(HM.sel); } else if (v === 'unlock') unlockPort(); else return false; }
    else if (k === 'port') HM.sel = v; else if (/^[ld][ab]$/.test(k)) setHomeStrand(k[1], k[0] === 'l' ? { grade: v } : { dir: v }); else return false; if (typeof save === 'function') save(); homeMark(); return true; }
  function ensureTw() { if (!HM.tw) HM.tw = twinOf(typeof S !== 'undefined' && S && (S.homeStrands || (LGRADES[S.homeLine] ? { grade: S.homeLine, dir: 'in' } : null)), { a: { grade: 'lumen', dir: 'to' }, b: { grade: 'lumen', dir: 'from' } }); }
  function mapDoorPanel(on, opt) { if (opt) Object.assign(XD, opt); let box = XD.box; if (!box) { box = XD.box = document.createElement('div'); box.id = 'mapDoorCtl'; box.className = 'mapDoorCtl'; box.setAttribute('aria-label', 'Ledge door');
      box.addEventListener('pointerdown', (e) => e.stopPropagation()); box.addEventListener('click', (e) => { e.stopPropagation(); const b = e.target.closest('button[data-v]'); if (!b || b.classList.contains('dis')) return; const k = b.parentNode.dataset.k || '', v = b.dataset.v;
        if (v === 'close' && !k) { mapDoorPanel(false); if (XD.onClose) XD.onClose(); } else if (k === 'act' && (v === 'enter' || v === 'open')) { mapDoorPanel(false); if (XD.onEnter) XD.onEnter(); } else doorAct(k, v); }); (document.getElementById('city') || document.body).appendChild(box); }
    XD.on = !!on; box.classList.toggle('hidden', !on); if (!on) return; ensureTw(); box.innerHTML = doorRows(); markBox(box); }
  // a map door set (makeDoorSet on the map house) mirrors the Ledge's ports: locks, glows and a plugged Ledge Tether stub in every used port
  function syncDoorSet(set) { const dr = set && (set.userData.ports ? set : set.children.find((c) => c.userData && c.userData.ports)); if (!dr) return; const hs = homeState();
    for (const [i, id] of PORTS.entries()) { const pg = dr.userData.ports[id]; if (!pg) continue; const locked = id !== 'c' && i - 1 >= hs.open, P2 = hs.ports[id]; if (pg.userData.lock) pg.userData.lock.visible = locked; if (pg.userData.glow) pg.userData.glow.visible = !P2; }
    if (!dr.userData.plugs) { dr.userData.plugs = new THREE.Group(); dr.add(dr.userData.plugs); } const G2 = dr.userData.plugs; for (const c of [...G2.children]) { G2.remove(c); c.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
    dr.userData.cords = []; dr.userData.ends = {}; for (const id of PORTS) { const P2 = hs.ports[id]; if (!P2) continue; const dest = XD.dest ? XD.dest(id) : null; if (XD.dest && !dest) continue; /* no real destination yet (drills come later): nothing drawn on the map */ const t = twinOf(P2), pp = portPos(id), c = id === 'c', k = 2.4 /* every Ledge Tether is the same twin braid as the main line */, plug = new THREE.Group(), z0 = 0.06; plug.position.set(pp.x, pp.y, z0); G2.add(plug); part(plug, cyl(0.07, 0.06, 0.08, 16).rotateX(Math.PI / 2), toon(0xb07a3a), [0, 0, 0.03]);
      /* the same braided twin Ledge Tether as the door interface: out of the port, down the door face, out across the ground and into it */
      const [so, ln] = DOOR_LANE[id] || [0.12, 0], zs = z0 + so, yk = Math.min(pp.y - 0.08, 0.34), fy = 0.035, E = 1.6 + so;
      const out = rounded([V(pp.x, pp.y, z0 + 0.03), V(pp.x, pp.y, zs), V(pp.x, yk, zs), V(ln, fy, zs + 0.16)].concat(XD.surf && dest ? (dest.end3 ? ropeEnd(dr, drapeRoute(dr, ln, zs + 0.16, so, dest.pts), dest) : drapeRoute(dr, ln, zs + 0.16, so, dest.pts)) : [V(ln, fy, E), V(ln * 1.4, fy, E + 1.4), V(ln * 1.6, -0.25, E + 1.9)]), c ? 0.07 : 0.05);
      if (dest) dr.userData.ends[id] = dest.name; void 0; let head = out, tail = null; if (dest && out.length > 12) { let acc = 0, cut = out.length - 1; for (let q = 1; q < out.length; q++) { acc += out[q].distanceTo(out[q - 1]); if (acc > 6) { cut = q; break; } } if (cut < out.length - 2) { head = out.slice(0, cut + 1); tail = out.slice(cut); } }
      const cd = twinCord(G2, head, t, k, 0, c ? 0 : ltR()); cd.userData.k = k; ledgeLook(cd); if (tail) cd.userData.chunks = cordChunks(G2, cd, tail, t, k); cd.userData.port = id; cd.userData.seed = PORTS.indexOf(id) * 1.7; dr.userData.cords.push(cd); } }
  /* the map tether drapes over the real ground: out from the door, curving toward the Hollow, sampled every 0.5 m along the terrain (bridge decks where it crosses), pulled taut over narrow dips like crevices, ending in the ground */
  /* the map renderer is sRGB + ACES (exposure 1.25) while the Ledge view is linear with no tone mapping: the same tether materials would come out
     washed and shifted outdoors. Each map cord material (built by the same braidCord/LGRADES code as inside) skips tone mapping and the output
     encoding, so its grade colours, glow and strand bands read exactly as they do in the Ledge; toon parts take a fixed key-lit shade (1.0x shadow .. 1.4x lit, tinted by the Ledge's warm key light (1, 1.08, 0.93): measured by sampling the same bronze strand along its centre line in the Ledge door render and the map render) instead of the
     outdoor sun (1.15) + sky (0.55), which is about twice the Ledge's light and was bleaching the bronze/iron bands. */
  /* (Dominic: tethers vanished on paths / mining ground) the ground overlays (path strips, cobble, mining-field dirt, lush patches) are transparent decals with no depth
     write, pulled toward the camera by polygonOffset - drawn after the opaque pass, they painted over a rope resting on the ground. Map cords now draw in the
     transparent pass after every overlay (opacity 1, depth write on, renderOrder above the overlays'), so only real terrain / objects can hide them; the rope
     itself stays on the ground (same drape height) */
  function ledgeLook(g) { g.traverse((o) => { if (o.isMesh) o.renderOrder = Math.max(o.renderOrder, 8); for (const m of [].concat(o.material || [])) lookMat(m); }); }
  function lookMat(m) { { if (!m || m.userData.ledgeLook) return; m.userData.ledgeLook = 1; m.toneMapped = false; m.fog = false; if (!m.transparent) { m.transparent = true; m.opacity = 1; m.depthWrite = true; m.userData.overGround = 1; } const ob = m.onBeforeCompile; m.onBeforeCompile = (sh, r) => { if (ob) ob(sh, r); sh.fragmentShader = sh.fragmentShader.replace('#include <encodings_fragment>', ''); if (m.isMeshToonMaterial) sh.fragmentShader = sh.fragmentShader.replace('#include <output_fragment>', 'outgoingLight = diffuseColor.rgb * vec3(1.0, 1.08, 0.93) * mix(1.0, 1.4, smoothstep(-0.2, 0.5, dot(normal, normalize(vec3(0.3, 0.6, 0.75))))) + totalEmissiveRadiance;\n#include <output_fragment>'); }; m.customProgramCacheKey = () => 'ledgeLook'; m.needsUpdate = true; } }
  /* a long map cord keeps the door's exact lay: the same twist per metre at the same sampling (2 cm), never spread over the length. The run past the
     first few metres is cut into 5 m chunks that carry on the lay phase (arc length) and the strand frame from the chunk before; a chunk near the
     camera is the real braided geometry, farther ones are a light textured tube with the same two strands painted at the same lay. */
  function cordChunks(G2, cd, tail, tw, k) { const out = [], ud = cd.userData; let n0 = ud.n1.clone(), s0 = ud.len, i = 0;
    while (i < tail.length - 1) { let acc = 0, j = i + 1; for (; j < tail.length; j++) { acc += tail[j].distanceTo(tail[j - 1]); if (acc >= 5 || j === tail.length - 1) break; } if (tail.length - 1 - j < 2) j = tail.length - 1;
      const pts = tail.slice(i, j + 1); if (pts.length === 2) pts.splice(1, 0, pts[0].clone().lerp(pts[1], 0.5)); const np = Math.max(20, Math.round(acc / 0.02)), fr = braidFrames(pts, np, n0), c = pts[pts.length >> 1].clone();
      const far = cordFar(pts, tw, ud, s0, fr.len); out.push({ pts, np, n0: n0.clone(), s0, c, far, near: null }); n0 = fr.n1; s0 += fr.len; i = j; }
    /* every far piece merged into one mesh (one draw call); chunks shown as real braid are cut out of it with draw groups */
    const P = [], N = [], UV = [], I = []; let base = 0; for (const c of out) { const g = c.far, ix = g.index.array; c.i0 = I.length; for (let q = 0; q < ix.length; q++) I.push(ix[q] + base); c.i1 = I.length; P.push(...g.attributes.position.array); N.push(...g.attributes.normal.array); UV.push(...g.attributes.uv.array); base += g.attributes.position.count; g.dispose(); c.far = null; }
    const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); mg.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); mg.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); mg.setIndex(I); mg.addGroup(0, I.length, 0);
    const La = LGRADES[tw.a.grade] || LGRADES.bronze, Lb = LGRADES[tw.b.grade] || LGRADES.bronze, fm = new THREE.Mesh(mg, [toon(0xffffff, farTex(La.col, Lb.col))]); fm.castShadow = false; G2.add(fm); ledgeLook(fm); out.mesh = fm; out.key = ''; return out; }
  const FARTEX = {}; function farTex(ca, cb) { const key = ca + '/' + cb; if (FARTEX[key]) return FARTEX[key]; const W = 64, H = 64, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d'), im = x.createImageData(W, H), A = new THREE.Color(ca), B = new THREE.Color(cb);
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) { const f = px / W, v = py / H, w = ((v - f) % 1 + 1) % 1, inA = w < 0.5, u = (w % 0.5) / 0.5, sh = 0.55 + 0.45 * Math.sin(Math.PI * u), C = inA ? A : B, o = (py * W + px) * 4, seam = u < 0.06 || u > 0.94 ? 0.35 : 1;
      im.data[o] = 255 * Math.min(1, C.r * sh * seam); im.data[o + 1] = 255 * Math.min(1, C.g * sh * seam); im.data[o + 2] = 255 * Math.min(1, C.b * sh * seam); im.data[o + 3] = 255; }
    x.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; return (FARTEX[key] = t); }
  function cordFar(pts, tw, ud, s0, len) { const C = new THREE.CatmullRomCurve3(pts, false, 'centripetal'), seg = Math.max(8, Math.round(len / 0.12)), R = ud.rr + Math.max(...ud.srs);
    const g = new THREE.TubeGeometry(C, seg, R, 8, false), uv = g.attributes.uv, per = TAU / ud.twist; for (let q = 0; q < uv.count; q++) uv.setX(q, (s0 + uv.getX(q) * len) / per); return g; }
  function chunkLOD(dr, cd) { const ch = cd.userData.chunks; if (!ch || typeof M3 === 'undefined' || !M3.camera) return; const cam = dr.worldToLocal(M3.camera.position.clone()); let built = 0;
    for (const c of ch) { const d = c.c.distanceTo(cam); if (!c.near && d < 16 && built < 1) { BOPT = { np: c.np, s0: c.s0, n0: c.n0, r: cd.userData.r || 0 }; c.near = braidCord(ch.mesh.parent, c.pts, [Object.assign({ key: 'a' }, cd.userData.twin.a), Object.assign({ key: 'b' }, cd.userData.twin.b)], cd.userData.k || 2.4, 0); ledgeLook(c.near); built++; }
      else if (c.near && d > 26) { c.near.parent.remove(c.near); c.near.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.dispose) o.material.dispose(); }); c.near = null; } }
    const key = ch.map((c) => (c.near ? 1 : 0)).join(''); if (key !== ch.key) { ch.key = key; const g = ch.mesh.geometry; g.clearGroups(); let st = 0; for (const c of ch) { if (c.near) { if (c.i0 > st) g.addGroup(st, c.i0 - st, 0); st = c.i1; } } if (st < g.index.count) g.addGroup(st, g.index.count - st, 0); } }
  // a short gooseneck out of the yoke port: seated in the bore, then a few metres-scale points loop to the side
  // (toward the incoming lay) so the strand does not fold straight down over the stand or through the bit.
  // offsets are in metres; pass sc=WS when S0/U/Hor are in map units.
  function plugLoop(S0, U, Hor, sc = 1) {
    const p = (u, h) => S0.clone().addScaledVector(U, u * sc).addScaledVector(Hor, h * sc);
    return [S0.clone(), p(0.05, 0.07), p(0.22, 0.20), p(0.16, 0.36), p(0.06, 0.52)];
  }
  function routeHor(end3, pts) {
    const x = end3[0], z = end3[2] != null ? end3[2] : end3[1], min = 0.8 * ((typeof Explore !== 'undefined' && Explore.WS) || 6.35);
    if (pts && pts.length) {
      for (let i = pts.length - 1; i >= 0; i--) { const dx = pts[i][0] - x, dz = (pts[i][2] != null ? pts[i][2] : pts[i][1]) - z, L = Math.hypot(dx, dz); if (L > min) return V(dx, 0, dz).normalize(); }
    }
    return V(1, 0, 0);
  }
  function drillPlugLeave(dest) {
    if (!dest || !dest.end3 || !dest.endDir) return null;
    const WS = (typeof Explore !== 'undefined' && Explore.WS) || 6.35;
    const S0 = V(dest.end3[0], dest.end3[1], dest.end3[2]), U = V(dest.endDir[0], dest.endDir[1], dest.endDir[2]).normalize();
    const Hor = routeHor(dest.end3, dest.pts), loop = plugLoop(S0, U, Hor, WS), d = loop[1].clone().sub(loop[0]);
    const horiz = Math.hypot(d.x, d.z), vert = Math.abs(d.y);
    return { end: loop[0], next: loop[1], deg: Math.atan2(horiz, vert) * 180 / Math.PI, horiz, vert };
  }
  function plugIn(dr, dest) { const [x, y, z] = dest.end3, [ux, uy, uz] = dest.endDir, S0 = dr.worldToLocal(V(x, y, z)), U = dr.worldToLocal(V(x + ux, y + uy, z + uz)).sub(S0).normalize();
    const Hor = routeHor([S0.x, S0.y, S0.z], (dest.pts || []).map((q) => { const p = dr.worldToLocal(V(q[0], 0, q[1])); return [p.x, p.z]; }));
    return plugLoop(S0, U, Hor.lengthSq() ? Hor : V(1, 0, 0)); }
  /* (Dominic: no 90 degree kink at an angled drill; loop to the side so it does not fold straight down)
     the last few metres into a drill: the ground route is cut back ~4 m short of the socket, then one
     smooth curve leaves the route along its own heading and arrives at a side shoulder beside the port
     (sagging under its own weight, resting on the ground where it would touch it). A short gooseneck
     — a few extra segments — loops from that shoulder into the bore, leaving sideways, whatever way
     the drill is tilted or turned. */
  function ropeEnd(dr, drape, dest) { const [x, y, z] = dest.end3, [ux, uy, uz] = dest.endDir, S0 = dr.worldToLocal(V(x, y, z)), U = dr.worldToLocal(V(x + ux * 6.35, y + uy * 6.35, z + uz * 6.35)).sub(S0).normalize();
    const pts = drape.slice(); while (pts.length > 2 && Math.hypot(pts[pts.length - 1].x - S0.x, pts[pts.length - 1].z - S0.z) < 2.6) pts.pop();
    const A = pts[pts.length - 1], Hor = V(A.x - S0.x, 0, A.z - S0.z);
    if (Hor.lengthSq() < 1e-6) { const t0 = A.clone().sub(pts[pts.length - 2]); t0.y = 0; if (t0.lengthSq() > 1e-6) Hor.copy(t0); else Hor.set(1, 0, 0); }
    Hor.normalize();
    const loop = plugLoop(S0, U, Hor), E = loop[loop.length - 1];
    const tA = A.clone().sub(pts[pts.length - 2]); tA.y = 0; const tE = V(E.x - A.x, 0, E.z - A.z); if (tE.lengthSq() < 1e-6) tE.copy(Hor).negate(); tE.normalize();
    if (tA.lengthSq() < 1e-6) tA.copy(tE); tA.normalize(); if (tA.dot(tE) < 0.3) tA.add(tE).normalize(); /* never set off away from the drill (that looped) */
    const d = A.distanceTo(E), C1 = A.clone().addScaledVector(tA, d * 0.38), C2 = E.clone().addScaledVector(Hor, Math.min(d * 0.25, 0.55)).add(V(0, Math.min(0.08, d * 0.04), 0)) /* arrive from the side, not from above */, n = Math.max(10, Math.ceil(d / 0.3)), sag = 0.1 * d, out = [];
    const gr = (p) => { if (!XD.surf) return -1e9; const w = dr.localToWorld(p.clone()); return dr.worldToLocal(V(w.x, XD.surf(w.x, w.z), w.z)).y + 0.06; };
    for (let i = 1; i <= n; i++) { const t = i / n, mt = 1 - t, p = V(0, 0, 0).addScaledVector(A, mt * mt * mt).addScaledVector(C1, 3 * mt * mt * t).addScaledVector(C2, 3 * mt * t * t).addScaledVector(E, t * t * t); p.y -= sag * Math.sin(Math.PI * t) * (1 - t * 0.5); if (i < n) p.y = Math.max(p.y, gr(p)); out.push(p); }
    return pts.concat(out, loop.slice(0, -1).reverse()); }
  function drapeRoute(dr, ln, z1, so, W2) { dr.updateMatrixWorld(true); const pts = [], lift = 0.06, st = 1.0, L2 = (wx, wz) => dr.worldToLocal(V(wx, 0, wz)), first = V(ln, 0, z1 + 1.2), path = [first].concat(W2.map(([wx, wz]) => L2(wx, wz)));
    /* follow the route (door -> its real end) over the ground, resampled every metre; a small side offset per strand lane keeps the cords apart */
    for (let q = 1; q < path.length; q++) { const A = path[q - 1], B = path[q], dx = B.x - A.x, dz = B.z - A.z, L = Math.hypot(dx, dz); if (L < 1e-3) continue; const nx = -dz / L, nz = dx / L, n = Math.max(1, Math.ceil(L / st)); for (let k = q === 1 ? 0 : 1; k <= n; k++) { const t = k / n, x = A.x + dx * t + nx * ln * 0.6, z = A.z + dz * t + nz * ln * 0.6, w = dr.localToWorld(V(x, 0, z)), gy = XD.surf(w.x, w.z); pts.push(V(x, dr.worldToLocal(V(w.x, gy, w.z)).y + lift, z)); } }
    for (let it = 0; it < 6; it++) for (let i = 1; i < pts.length - 1; i++) pts[i].y = Math.max(pts[i].y, (pts[i - 1].y + pts[i + 1].y) / 2 - 0.03); /* a rope settles: a little sag, but it spans narrow dips like crevices */
    return pts; }
  function mapDoorTick(dt) { XD.t = (XD.t || 0) + dt; for (const d of XD.doors) { const dr = d.userData.ports ? d : d.children.find((c) => c.userData && c.userData.ports); if (!dr || !dr.userData.cords) continue; for (const cd of dr.userData.cords) { chunkLOD(dr, cd); const sd = cd.userData.seed || 0; twinTick(cd, XD.t, dt, cd.userData.strands.map((x, j) => x.port ? strandLoad(XD.t, x.lj, x.seed) : strandLoad(XD.t, j, sd))); } } }
  function syncDoors() { XD.doors = XD.doors.filter((d) => d.parent); for (const d of XD.doors) syncDoorSet(d); }

  function homeMode(on) { if (!R) return; if (!!on === !!st.home) return; if (!on) homeLights(false); /* the UI re-renders call show('home') every tick: never reset the camera, walker or panel while already home */ if (on && !HM.g) { HM.g = makeHome(); scene.add(HM.g); HM.bg = cv(8, 256, (g2, w, h) => { const gr = g2.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f3dcb4'); gr.addColorStop(0.55, '#e2b987'); gr.addColorStop(1, '#a9825e'); g2.fillStyle = gr; g2.fillRect(0, 0, w, h); }); HM.bg0 = scene.background;
      const box = document.getElementById('homeCtl'); if (box && !box.dataset.ok) { box.dataset.ok = 1; box.addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (!b || b.classList.contains('dis')) return; const k = b.parentNode.dataset.k || '', v = b.dataset.v;
        if (v === 'close' && !k) doorMenu(false); else if (k === 'act') { if (v === 'enter' || v === 'open') enterLedge(); else if (v === 'out') goOutside(); else if (v === 'plug') { if (!plugPort(HM.sel, HM.tw)) unplugPort(HM.sel); } else if (v === 'unlock') unlockPort(); else if (HM.onAct) HM.onAct(v); }
        else if (k === 'port') HM.sel = v; else if (/^[ld][ab]$/.test(k)) setHomeStrand(k[1], k[0] === 'l' ? { grade: v } : { dir: v }); else if (k === 'xfer') { setXfer(v); S.ledgeXfer = LG.xfer; } if (typeof save === 'function') save(); homeMark(); st.lastInput = clk; }); } }
    if (on && st.ledge) ledgeMode(false); st.home = !!on; if (HM.g) HM.g.visible = !!on; for (const fl of FLOOR) fl.visible = !on && !st.ledge; if (HM.bg) scene.background = on ? HM.bg : (st.ledge ? LG.bg : HM.bg0); wrap.classList.toggle('home', !!on); cam.fov = on ? 50 : st.ledge ? 34 : 26; cam.updateProjectionMatrix();
    const key = scene.children.find((o) => o.isDirectionalLight && o.castShadow); if (key && on) { Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 0.5, far: 22 }); key.shadow.camera.updateProjectionMatrix(); key.position.set(2.5, 6, 5); }
    if (on) { st.orbL = st.orb; st.orb = HM.orb || (HM.orb = { az: 0.42, el: 0.14, d: 3.6 }); st.tool = 'pick'; an.eq = { held: 'pick', seq: null, t: 0 }; an.cl = null; an.tv = null; st.play = false; st.pg = null; st.anim = 'idle'; st.yaw = 0; st.yawV = 0; const arr = typeof S !== 'undefined' && S && S.homeArrive === 'globe'; if (typeof S !== 'undefined' && S && S.homeArrive === 'in') delete S.homeArrive; setHomeMode('in'); /* the Ledge always opens inside (the old door-front scene is gone: its door menu lives on the map door) */ if (arr) { delete S.homeArrive; const t2 = HMP.table; st.gnd.x = t2.x + 0.75; st.gnd.z = t2.z + 0.55; st.gnd.face = -2.2; HM.arrived = 'globe'; HM.tgt = null; } }
    else { if (st.orbL !== undefined) st.orb = st.orbL; st.gnd = null; if (key) { Object.assign(key.shadow.camera, { left: -1.2, right: 1.2, top: 2, bottom: -0.4, near: 0.5, far: 8 }); key.shadow.camera.updateProjectionMatrix(); key.position.set(1.4, 3.2, 2.6); } } }
  // tap inside the home: floor -> walk there; the door from outside -> handle opens it, a port selects it
  // ---- interactables (vault, furnace, anvil, orb, door, Lumen crystal): a soft pulsing ring + a floating tap label when Wren is near; tapping walks her up first, then opens
  const IA = { list: [] };
  function iaLabel(text) { const c = document.createElement('canvas'); c.width = 448; c.height = 96; const x = c.getContext('2d'); x.font = '600 38px system-ui,sans-serif'; const w = Math.min(436, x.measureText(text).width + 92);
    x.fillStyle = 'rgba(14,24,30,.82)'; x.strokeStyle = 'rgba(159,246,255,.9)'; x.lineWidth = 4; x.beginPath(); x.roundRect((448 - w) / 2, 14, w, 64, 32); x.fill(); x.stroke(); x.fillStyle = '#eaffff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('👆 ' + text, 224, 47);
    const t = new THREE.CanvasTexture(c); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, depthWrite: false, opacity: 0, fog: false })); s.renderOrder = 40; return s; }
  function iaAdd(par, key, o) { const I = Object.assign({ key, near: 2.1, sc: 1, open: () => {} }, o); I.label = iaLabel(o.text); I.label.position.copy(o.at); I.label.scale.set(1.4 * I.sc, 0.3 * I.sc, 1); par.add(I.label);
    const rr = o.ring.r, ring = new THREE.Mesh(new THREE.RingGeometry(rr * 0.78, rr, 48), new THREE.MeshBasicMaterial({ color: 0x9ff6ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); ring.rotation.x = -Math.PI / 2; ring.position.set(o.ring.x, o.ring.y || 0.012, o.ring.z); ring.renderOrder = 3; par.add(ring); I.ringM = ring;
    const tap = () => iaGo(I); I.tap = tap; I.label.userData.tap = tap; if (o.obj) o.obj.traverse((m) => { m.userData.tap = tap; }); IA.list.push(I); return I; }
  function iaScene() { return st.tree ? 'tree' : st.home && HM.mode === 'in' ? 'home' : null; }
  function iaGo(I) { const G = st.gnd; st.lastInput = clk; if (!G || I.scene !== iaScene()) return I.open(), true; const d = Math.hypot(G.x - I.spot.x, G.z - I.spot.z);
    const arrive = () => { st.pg = null; if (I.face !== undefined) G.face = I.face; IA.pending = null; IA.opened = I.key; I.open(); };
    if (d < 0.3) { arrive(); return true; } navTo(G, I.spot.x, I.spot.z, arrive); IA.pending = I.key; pgMark({ x: G.goal.x, z: G.goal.z, y: G.hy ? G.hy(G.goal.x, G.goal.z) : 0 }); st.pg = { home: true, tree: !!st.tree }; return true; }
  function iaTick(dt) { const sc = iaScene(), G = st.gnd, t = clk; let best = null, bd = 1e9; if (G) for (const I of IA.list) { const d = Math.hypot(G.x - I.spot.x, G.z - I.spot.z); if (I.scene === sc && d < I.near && d < bd) { bd = d; best = I; } } IA.near = best ? best.key : null;
    for (const I of IA.list) { const on = I.scene === sc && !!G; const nr = on && (I === best || IA.pending === I.key) ? 1 : 0;
      I.nf = (I.nf || 0) + (nr - (I.nf || 0)) * (1 - Math.exp(-dt * 6)); I.near0 = nr; const pu = 0.5 + 0.5 * Math.sin(t * 3.2 + I.key.length);
      I.label.visible = on && I.nf > 0.02; I.label.material.opacity = I.nf; I.label.position.y = I.at.y + Math.sin(t * 2.2) * 0.03 * I.sc;
      I.ringM.visible = on; I.ringM.material.opacity = (0.1 + 0.45 * I.nf) * (0.45 + 0.55 * pu); I.ringM.scale.setScalar(1 + 0.05 * pu * I.nf); } }
  function iaHome() { if (IA.home) return; IA.home = true; const W = HM.W, R = HM.room, sm = (o) => Object.assign(o, { scene: 'home' });
    iaAdd(R, 'vault', sm({ text: 'Vault', obj: HM.vault, at: V(HMP.vault.x + 0.25, 2.05, HMP.vault.z), spot: { x: -W / 2 + 0.85, z: -0.85 }, face: -Math.PI / 2, ring: { x: -W / 2 + 0.42, z: -0.85, r: 0.42 }, open: () => openVault() }));
    iaAdd(R, 'furnace', sm({ text: 'Furnace', obj: HM.furnace, at: V(SMITH.furnace.x, 2.15, SMITH.furnace.z + 0.4), spot: { x: SMITH.furnace.x, z: SMITH.furnace.z + 1.3 }, face: Math.PI, ring: { x: SMITH.furnace.x, z: SMITH.furnace.z + 0.55, r: 0.6 }, open: () => (typeof Craft !== 'undefined' ? Craft.open('furnace') : null) }));
    iaAdd(R, 'anvil', sm({ text: 'Anvil', obj: HM.anvil, at: V(SMITH.anvil.x, 1.25, SMITH.anvil.z), spot: { x: SMITH.anvil.x + 0.05, z: SMITH.anvil.z + 0.72 }, face: Math.PI, ring: { x: SMITH.anvil.x + 0.05, z: SMITH.anvil.z, r: 0.48 }, open: () => (typeof Craft !== 'undefined' ? Craft.open('anvil') : null) }));
    iaAdd(R, 'orb', sm({ text: 'Tether Orb', obj: HM.table, at: V(HMP.table.x, 1.95, HMP.table.z), spot: { x: HMP.table.x, z: HMP.table.z + 0.78 }, face: Math.PI, ring: { x: HMP.table.x, z: HMP.table.z, r: 0.62 }, open: () => tetherOrb() }));
    const dh = new THREE.Mesh(new THREE.BoxGeometry(HM.dw, HM.dh, 0.12), new THREE.MeshBasicMaterial({ visible: false })); dh.position.set(HM.dx, HM.dh / 2, HM.FZ - 0.08); R.add(dh); HM.doorHit = dh;
    iaAdd(R, 'door', sm({ text: 'Go outside', obj: dh, at: V(HM.dx, HM.dh + 0.35, HM.FZ - 0.15), spot: { x: HM.dx, z: HM.FZ - 0.75 }, face: 0, ring: { x: HM.dx, z: HM.FZ - 0.3, r: 0.45 }, open: () => goOutside() })); }
  function iaTree() { if (IA.tree) return; IA.tree = true; const g = TR.g, sc = 2.6, tr = (o) => Object.assign(o, { scene: 'tree', near: 5.5, sc: 2.8 });
    const cz = TR.CR + 0.75; iaAdd(g, 'crystal', Object.assign(tr({ text: 'Lumen Crystal', obj: TR.crystal, at: V(0, TR.PH + TR.CR * 3.1, 0), spot: { x: 0, z: cz }, face: Math.PI, ring: { x: 0, y: TR.PH + 0.03, z: 0, r: TR.CR + 0.55 }, /* she walks up the front flight onto the dais and right up to the crystal; it only offers itself when she stands at it */ open: () => (typeof Craft !== 'undefined' ? Craft.open('exchange') : null) }), { near: 1.9 }));
    iaAdd(g, 'tdoor', tr({ text: 'Go outside', obj: TR.exit, at: V(0, 7.4, TR_DZ - 0.6), spot: { x: 0, z: Math.min(TR.RW - 0.4, TR_DZ - 2.4) }, face: 0, ring: { x: 0, y: trHeight(0, Math.min(TR.RW - 0.4, TR_DZ - 2.4)) + 0.03, z: Math.min(TR.RW - 0.4, TR_DZ - 2.4), r: 1.3 }, open: () => (typeof setTab === 'function' ? setTab('city') : null) })); }
  // what moves through each strand (mole hauls / fetches, wired drills): a live log (not saved) of items per second, for Tether Settings' per-minute readout
  function flowLog(port, dir, n) { if (!n || !port) return; const P = homeState().ports[port]; let w = null; if (P) { const tw = twinOf(P); w = ['a', 'b'].find((q) => tw[q].dir === dir) || null; } if (!w) return; const F = HM.flow || (HM.flow = {}), k = port + ':' + w, now = Math.floor(Date.now() / 1000), L = F[k] || (F[k] = []), last = L[L.length - 1]; if (last && last[0] === now) last[1] += n; else L.push([now, n]); while (L.length && L[0][0] < now - 300) L.shift(); }
  function flowRate(port, w) { const L = (HM.flow || {})[port + ':' + w]; if (!L) return 0; const now = Date.now() / 1000; let s = 0; for (const [t, n] of L) if (t > now - 300) s += n; return s / 5; }
  /* the Tether Orb (replaces the travel orb): a full-screen view - Teleportation (every tether end: the Ledge door, the Hanging Camp line, drill tethers, drop
     tethers) and Tether Settings (each tether and its two strands: push materials out of the vault or pull them in, and a player name for each) */
  const TO = { view: 'home' };
  function tetherOrb(view) { let el = document.getElementById('tetherOrb'); if (!el) { el = document.createElement('div'); el.id = 'tetherOrb'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Tether Orb'); document.body.appendChild(el);
      el.addEventListener('click', (e) => { const b = e.target.closest('[data-to]'); if (!b) return; const k = b.dataset.to, v = b.dataset.v; if (k === 'close') return tetherOrbClose(); if (k === 'view') return tetherOrb(v);
        if (k === 'tp') { tetherOrbClose(); HM.travel = 'tether'; if (typeof Explore !== 'undefined') Explore.teleportTo(v); return; }
        if (k === 'dir') { const [port, w] = v.split(':'), hs = homeState(), P = hs.ports[port]; if (P) { const t = twinOf(P); t[w].dir = b.dataset.d; hs.ports[port] = t; if (typeof save === 'function') save(); try { refreshPorts(); } catch (e2) {} } return tetherOrb('set'); }
        if (k === 'undrop') { if (typeof Explore !== 'undefined') Explore.dropRemove(v); return tetherOrb('set'); }
        if (k === 'unlock') { unlockPort(); /* placeholder: unlock requirements TBD by Dominic */ if (typeof save === 'function') save(); return tetherOrb('set'); }
        if (k === 'plug') { const CR = typeof Craft !== 'undefined' ? Craft : null, g = DTIERS.find((q) => LGRADES[q] && CR && CR.have('tether:' + q) > 0) || 'bronze'; plugPort(v, g, 'to'); return tetherOrb('set'); }
        if (k === 'unplug') { unplugPort(v); return tetherOrb('set'); }
        if (k === 'untether') { if (typeof Explore !== 'undefined') { const D = Explore.drillState(), d = D && D.list.find((q) => q.id === v); if (d) Explore.drillWire(d, false); } return tetherOrb('set'); }
        if (k === 'pick') { TO.pick = v || null; TO.str = null; return tetherOrb('set'); }
        if (k === 'pstr') { TO.str = v || null; return tetherOrb('set'); }
        if (k === 'swap') { tetherSwap(v.split(':')[0], v.split(':')[1], b.dataset.g); return tetherOrb('set'); } });
      el.addEventListener('change', (e) => { const t = e.target; if (!t.dataset || !t.dataset.ton) return; const v = t.value; if (t.dataset.ton === 'teth') { if (typeof Explore !== 'undefined') Explore.tetherRename(t.dataset.k, v); }
        else { const [port, w] = t.dataset.k.split(':'), hs = homeState(), P = hs.ports[port]; if (P) { const tw = twinOf(P); tw[w].name = String(v || '').trim().slice(0, 40); if (!tw[w].name) delete tw[w].name; hs.ports[port] = tw; if (typeof save === 'function') save(); } } }); }
    TO.view = view || 'home'; HM.orbPick = (HM.orbPick || 0) + 1; const L = typeof Explore !== 'undefined' && Explore.tetherList ? Explore.tetherList() : [], hs = homeState(), esc2 = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const KI = { door: '🚪', camp: '⛺', drill: '🛠️', drop: '🪢' }, KN = { door: 'House door tether', camp: 'Main line', drill: 'Drill tether', drop: 'Drop tether' };
    // (Dominic: field-kit skin, Art's B_* concepts) the orb's screens sit on one moss-canvas panel: brass dome close / back, small label, enamel buttons
    const TT = TO.view === 'tp' ? 'Teleportation' : TO.view === 'set' ? 'Tether Settings' : 'Tether Orb';
    let h = `<div class="toPanel kKit kv-${TO.view}"><div class="toTop"><button class="toBack kX${TO.view === 'home' ? '' : ' back'}" data-to="${TO.view === 'home' ? 'close' : 'view'}" data-v="home" aria-label="${TO.view === 'home' ? 'Close' : 'Back'}">${TO.view === 'home' ? '✕' : '‹'}</button><h2>${TT}</h2></div><div class="toBody">`;
    if (TO.view === 'home') h += `<img class="kOrb" src="assets/ui/kit_orb.webp" alt=""><div class="toDim">Every Ledge Tether tied to the door runs through the orb.</div><button class="toBig kBlue" data-to="view" data-v="tp"><span>✨</span><b>Teleportation</b><small>${L.length} tether ends to travel to</small></button><button class="toBig kRed" data-to="view" data-v="set"><span>🪢</span><b>Tether Settings</b><small>Strands: push or pull, names</small></button>`;
    else if (TO.view === 'tp') h += L.map((t) => `<div class="toRow"><span class="toI">${KI[t.kind]}</span><span class="toN"><b>${esc2(t.name)}</b><small>${KN[t.kind]}${t.len ? ' · ' + t.len + ' m' : ''}</small></span><button class="btn alt kTp" data-to="tp" data-v="${t.key}">Teleport</button></div>`).join('');
    else { const seen = new Set(), CR = typeof Craft !== 'undefined' ? Craft : null, coil = (g) => (CR ? CR.have('tether:' + g) : 0), GN = (g) => (GRADES[g] ? GRADES[g].name : g), sw = (g) => '#' + (((LGRADES[g] && (LGRADES[g].col || LGRADES[g].chip)) || 0x999999).toString(16).padStart(6, '0')),
        rate = (port, w) => { const r = flowRate(port, w); return r > 0 ? `≈ ${r < 10 ? r.toFixed(1) : Math.round(r)} / min` : '0 / min'; };
      // door ports: plug / unplug, unlock more (the old front-door options) - brass jack sockets, a red dome to unlock (cost TBD)
      h += `<div class="toCard toDoor"><button class="kDome kRed" data-to="unlock" ${hs.open >= 8 ? 'disabled' : ''} aria-label="Unlock a port"></button><div class="toN"><b>Door ports</b><small>${hs.open} of 8 extra ports open · main + ${hs.open}</small><b>Unlock a port</b><small>Unlock cost: TBD (placeholder, free for now)</small></div></div><div class="toPorts">`;
      PORTS.forEach((id, i) => { const locked = id !== 'c' && i - 1 >= hs.open, P = hs.ports[id], T = L.find((q) => q.port === id && !q.camp), tw = P ? twinOf(P) : null; h += `<div class="toPort${P ? ' full' : ''}${locked ? ' lock' : ''}"><b>${id === 'c' ? 'M' : i}</b><span class="kJack">${tw ? `<i style="--c1:${sw(tw.a.grade)};--c2:${sw(tw.b.grade)}"></i>` : ''}</span><small>${locked ? 'locked' : P ? esc2(T ? T.name : 'plugged (no tether laid)') : id === 'c' ? 'Main · free' : 'free'}</small>${locked ? '' : P ? (T && T.kind === 'drill' ? `<button data-to="untether" data-v="${T.key}">Untether</button>` : T && T.kind === 'drop' ? `<button data-to="undrop" data-v="${T.key}">Take up</button>` : `<button data-to="unplug" data-v="${id}">Unplug</button>`) : `<button data-to="plug" data-v="${id}">Plug in</button>`}</div>`; });
      h += '</div>';
      // (Dominic: the reskin must keep every old option) pick the exact tether, then the exact strand, to work on; 'All' shows every tether as before
      const TL = L.filter((t) => t.kind !== 'camp'); if (TO.pick && !TL.some((t) => t.key === TO.pick)) { TO.pick = null; TO.str = null; } const PT = TO.pick ? TL.find((t) => t.key === TO.pick) : null;
      h += `<div class="toPick" role="tablist" aria-label="Choose a tether"><button data-to="pick" data-v="" class="${TO.pick ? '' : 'on'}">All tethers</button>${TL.map((t) => `<button data-to="pick" data-v="${esc2(t.key)}" class="${TO.pick === t.key ? 'on' : ''}"><span>${KI[t.kind]}</span>${esc2(t.name)}</button>`).join('')}</div>`;
      if (PT && hs.ports[PT.port]) { const tw = twinOf(hs.ports[PT.port]); h += `<div class="toPick sub" role="tablist" aria-label="Choose a strand"><button data-to="pstr" data-v="" class="${TO.str ? '' : 'on'}">Both strands</button>${['a', 'b'].map((w) => `<button data-to="pstr" data-v="${PT.port}:${w}" class="${TO.str === PT.port + ':' + w ? 'on' : ''}"><i style="background:${sw(tw[w].grade)}"></i>${esc2(tw[w].name || 'Strand ' + w.toUpperCase())}</button>`).join('')}</div>`; }
      // each tether: its name, then its two strands - a name, Pull in / Push out, and how much is moving through it per minute (no material choice here)
      for (const t of L) { if (t.kind === 'camp' || (TO.pick && t.key !== TO.pick)) continue; const P = hs.ports[t.port]; h += `<div class="toCard"><div class="toRow"><span class="toI kTi">${KI[t.kind]}</span><span class="toN"><input class="toIn" data-ton="teth" data-k="${t.key}" value="${esc2(t.name)}" aria-label="Tether name" maxlength="40"><small>${KN[t.kind]} · door port ${t.port === 'c' ? 'main' : PORTS.indexOf(t.port)}${t.kind === 'door' ? ' · main line to the Hanging Camp' : ''}</small></span>${t.kind === 'drop' ? `<button class="btn sm ghost" data-to="undrop" data-v="${t.key}">Take up</button>` : ''}</div>`;
        if (P && !seen.has(t.port)) { seen.add(t.port); const tw = twinOf(P), Ln = typeof Explore !== 'undefined' && Explore.tetherLen ? Explore.tetherLen(t.port) : 0; for (const w of ['a', 'b']) { const sd = tw[w], G = LGRADES[sd.grade]; if (TO.str && TO.str !== t.port + ':' + w) continue;
          h += `<div class="toStr"><b class="kSl">Strand ${w.toUpperCase()}</b><span class="toSw" style="--c:${sw(sd.grade)}"></span><input class="toIn sm" data-ton="str" data-k="${t.port}:${w}" value="${esc2(sd.name || '')}" placeholder="Strand ${w.toUpperCase()} (${G ? GN(sd.grade) : sd.grade})" aria-label="Strand ${w.toUpperCase()} name" maxlength="40"><span class="toSeg ${sd.dir === 'from' ? 'push' : 'pull'}"><button data-to="dir" data-v="${t.port}:${w}" data-d="to" class="${sd.dir === 'to' ? 'on' : ''}">Pull in</button><i class="kLever"></i><button data-to="dir" data-v="${t.port}:${w}" data-d="from" class="${sd.dir === 'from' ? 'on' : ''}">Push out</button></span><small class="kRate">${GN(sd.grade)} · ${Ln} m · <b>${rate(t.port, w)}</b></small></div>`;
          // braid / grade: upgrade or swap this strand with a Ledge Tether grade she owns (backpack + vault) - not a cargo-material choice
          h += `<div class="toSwap"><small>Strand ${w.toUpperCase()} braid: <b>${GN(sd.grade)}</b> · ${Ln} m. Upgrade / swap with a tether you own:</small><div class="toChips">${DTIERS.filter((g) => g !== sd.grade && LGRADES[g]).map((g) => { const hv = coil(g), okk = hv >= Ln && hv > 0; return `<button data-to="swap" data-v="${t.port}:${w}" data-g="${g}" class="${okk ? '' : 'dis'}" ${okk ? '' : 'disabled'} title="${okk ? 'Swap to ' + GN(g) : 'not enough: needs ' + Ln + ' m'}"><i style="background:${sw(g)}"></i>${GN(g)}<small>${hv} m</small></button>`; }).join('')}</div></div>`; } }
        else if (!P) h += `<div class="toDim">No Ledge Tether plugged in this port.</div>`; h += '</div>'; } h += `<div class="toDim">Pull in: the strand carries materials into the vault. Push out: it sends them from the vault to that end. The rate is what moved through that strand over the last 5 minutes. A braid swap takes the length from your backpack first, then the vault, and the old strand's length goes back to the vault.</div>`; }
    el.innerHTML = h + '</div></div>'; el.classList.add('on'); return true; }
  // upgrade / swap one strand of a laid tether: needs that tether's length of the new grade (backpack first, then vault); the old strand's length goes to the vault
  function tetherSwap(port, w, g) { const hs = homeState(), P = hs.ports[port], CR = typeof Craft !== 'undefined' ? Craft : null; if (!P || !CR || !LGRADES[g]) return false; const tw = twinOf(P), old = tw[w].grade; if (old === g) return false; const L = typeof Explore !== 'undefined' && Explore.tetherLen ? Explore.tetherLen(port) : 0;
    if (CR.have('tether:' + g) < L || (L === 0 && CR.have('tether:' + g) <= 0)) { if (typeof toast === 'function') toast(`Not enough ${GRADES[g] ? GRADES[g].name : g} Ledge Tether: needs ${L} m`); return false; } if (L > 0) { CR.take('tether:' + g, L); CR.add('vault', 'tether:' + old, L); }
    tw[w].grade = g; hs.ports[port] = tw; if (typeof save === 'function') save(); try { refreshPorts(); } catch (e) {} if (typeof toast === 'function') toast(`🪢 Strand ${w.toUpperCase()} → ${GRADES[g] ? GRADES[g].name : g} (${L} m)`); return true; }
  function tetherOrbClose() { const el = document.getElementById('tetherOrb'); if (el) el.classList.remove('on'); }
  // the travel orb's destination picker: only after Wren walks up to it
  const ORB_DEST = [['home', '🏠', 'The Ledge', 'your home in the cliff'], ['camp', '⛺', 'Silverseam portaledge', 'Hanging Camp at the mithril vein'], ['tree', '🌳', 'Inside the Lumen Tree', 'the Lumen Crystal and the Hollow hall'], ['city', '🗺️', 'Ledgeville', 'the map of the Hollow']];
  function orbPicker() { if (typeof openModal !== 'function') return false; HM.orbPick = (HM.orbPick || 0) + 1; const here = 'home';
    openModal(`<div class="cxp orbp"><div class="row between"><h2>🌐 Travel orb</h2><span class="tag">choose a destination</span></div><div class="dim">The orb carries you anywhere a Ledge Tether has been tied.</div><div class="card cxl">${ORB_DEST.map(([k, e, n, s]) => `<div class="cxr"><span class="cxi" style="--c:#5fd6e8">${e}</span><span class="cxn">${n}<small>${s}</small></span><button class="btn sm ${k === here ? 'ghost' : 'alt'}" data-orb="${k}" ${k === here ? 'disabled' : ''}>${k === here ? 'You are here' : 'Travel'}</button></div>`).join('')}</div><button class="btn ghost" data-orb="close">Close</button></div>`, 'orb');
    document.querySelectorAll('#modalBody [data-orb]').forEach((b) => b.addEventListener('click', () => { const k = b.dataset.orb; if (typeof closeModalQuiet === 'function') closeModalQuiet(); if (k === 'close') return; HM.travel = k; if (typeof setTab === 'function') setTab(k === 'camp' ? 'ledge' : k); })); return true; }
  function homeTap(cx, cy) { cam.updateMatrixWorld(); HM.g.updateMatrixWorld(true); const r = canvas.getBoundingClientRect(), nd = new THREE.Vector2((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); _ray.setFromCamera(nd, cam); const hits = _ray.intersectObject(HM.g, true);
    for (const h of hits) { let vis = true; for (let q = h.object; q && q !== HM.g; q = q.parent) if (!q.visible) vis = false; if (!vis) continue; let o = h.object; while (o && o !== HM.g) { if (o.userData.tap) return o.userData.tap(), true; if (HM.mode === 'door' && (o.userData.port || o.userData.handle || o === HM.door)) { enterLedge(); return true; } /* the front door just goes in: tether options are in the Tether Orb */ o = o.parent; } let inC = false; for (let q = h.object; q; q = q.parent) if (q === HM.cords) inC = true; if (h.object.visible && !inC) break; }
    const o = _ray.ray.origin, d = _ray.ray.direction; if (HM.mode === 'door' && HM.menu) doorMenu(false); if (d.y < -1e-4 && st.gnd && !HM.anim) { const t = -o.y / d.y, q = o.clone().addScaledVector(d, t), B = st.gnd.bnd; navTo(st.gnd, clamp(q.x, B.X0, B.X1), clamp(q.z, B.Z0, B.Z1), () => { st.pg = null; }); pgMark({ x: st.gnd.goal.x, z: st.gnd.goal.z }); st.pg = { home: true }; return true; } return false; }
  function homeScreen(p) { cam.updateMatrixWorld(); const q = p.clone().project(cam), r = canvas.getBoundingClientRect(); return { x: r.left + (q.x + 1) / 2 * r.width, y: r.top + (1 - q.y) / 2 * r.height }; }
  /* ---------- inside the Lumen Tree (approved concept: lumen_tree/APPROVED_lumen_tree_inside.jpg): the hollow heart of the colossal tree, the Hollow's
     commune and gathering space, reached through the great door. Built to the tree's own scale (the trunk is ~23 m in radius on the map, so the hall
     is ~46 m across wall to wall, ~37 m walkable, ~38 m up to the dome): twisting root-and-bark walls with wood grain, a raised round root dais with steps on all four sides, a huge
     lumenite crystal at its heart, glowing lumenite veins branching over the floor, up the steps and the roots, and two knotholes high on the far wall
     throwing warm shafts of light. Tap to walk, drag to orbit, pinch or scroll to zoom (as in the Ledge). Unnamed for now. ---------- */
  const TR = { R: 23, RW: 18.4, H: 38, PR: 7, PH: 0.6, SD: 0.55, SH: 0.15, NS: 3, HA: 0.24, FL: [0, Math.PI / 2, Math.PI, -Math.PI / 2], CR: 2.8, g: null, obs: [], walk: [], knots: [], shafts: [], occ: [], veins: 0, t: 0 }; // occ: roots / buttresses that fade see-through when they come between the camera and her
  const trDA = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  function trFlight(x, z) { const a = Math.atan2(x, z); let best = 9; for (const f of TR.FL) best = Math.min(best, trDA(a, f)); return best; }
  // floor height under her: the dais top, a step of one of the four flights, or the floor
  function trHeight(x, z) { const r = Math.hypot(x, z); if (r <= TR.PR) return TR.PH; if (r < TR.PR + TR.SD * TR.NS && trFlight(x, z) < TR.HA) { const k = Math.ceil((r - TR.PR) / TR.SD); return TR.PH - TR.SH * k; } return 0; }
  // the wall: a bulging trunk hollow closing to a dome, carved into twisting root columns; flattened round the knotholes and the door
  const TR_DZ = trProfile(4) * (1 - 0.9 / TR.R) - 0.25; // the great door's plane (z), inside face
  const TR_KNOTS = [[Math.PI + 0.5, 10.8], [Math.PI - 0.54, 11.4]]; // low enough on the far wall to sit in the view from the door, framing the crystal as in the concept
  function trInside(q) { return q.y > 0.45 && q.y < TR.H - 3 && Math.hypot(q.x, q.z) < Math.max(1.5, trProfile(q.y) - 0.9); } // the camera's clear space inside the hollow tree (bark wall, dome)
function trProfile(y) { const R = TR.R, b = R * (1 + 0.06 * Math.sin(Math.PI * Math.min(y, 13) / 13)); return y <= 12 ? b : b * Math.pow(Math.max(0, Math.cos(Math.PI / 2 * Math.min(1, (y - 12) / (TR.H - 12)))), 0.75); }
  function trRidge(a, y) { const s = 0.5 + 0.5 * Math.sin(13 * a + 0.22 * y + 0.8 * Math.sin(5 * a - 0.06 * y)), s2 = 0.5 + 0.5 * Math.sin(31 * a - 0.11 * y + 1.3), s3 = 0.5 + 0.5 * Math.sin(7 * a + 0.3 * Math.sin(0.2 * y)); const s4 = 0.5 + 0.5 * Math.sin(53 * a + 0.35 * y + 2 * Math.sin(9 * a)), s5 = 0.5 + 0.5 * Math.sin(23 * a - 0.27 * y + 0.5); let d = 1.6 * Math.pow(s, 1.6) + 0.4 * s2 * s2 + 0.45 * s3 + 0.35 * Math.pow(s4, 3) + 0.45 * Math.pow(s5, 2); if (y < 4) d += Math.pow((4 - y) / 4, 2) * 2.6 * Math.pow(s, 2); return d; }
  function trWallR(a, y) { let d = trRidge(a, y); for (const [ka, ky] of TR_KNOTS) { const w = Math.exp(-((trDA(a, ka) * TR.R / 3.6) ** 2) - ((y - ky) / 4.6) ** 2); d = lerp(d, 1.0, w); } const ax = Math.abs(trDA(a, 0)) * TR.R, hy = y < 11.5 ? 1 : Math.exp(-(((y - 11.5) / 2.5) ** 2)), dw = Math.exp(-((Math.max(0, ax - 4.4) / 2.2) ** 2)) * hy; d = lerp(d, 0.9, dw); const p = trProfile(y); let rr = Math.max(0.2, p - d * p / TR.R);
    // the doorway is carved into the trunk: round the opening the wall is recessed to just behind the door's plane, top to bottom (no bark bulge over its foot)
    const rw = Math.exp(-((Math.max(0, ax - 4.0) / 0.9) ** 2)) * hy; if (rw > 0.001) rr = Math.max(rr, lerp(rr, TR_DZ / Math.max(0.5, Math.cos(trDA(a, 0))) + 0.5, rw)); return rr; }
  // hand-made bark for the Lumen Tree: interlocking, vertically drawn-out plates (a tileable cell pattern) split by deep furrows, every plate its own shade
  // (warm brown, some redder, some grey-weathered), its face combed with fibres and lit as a raised, bevelled relief (light from above-left) so the bark
  // reads deep even under the hall's flat ambient light; a few knots and fine cracks on top
  function barkTex(seed) { const r = prng(seed); return cv(512, 512, (x, w, h) => { const GX = 8, GY = 2, pts = [], tone = [];
      for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) { pts.push([(i + 0.15 + r() * 0.7) / GX, (j + 0.15 + r() * 0.7) / GY]); const k = r(); tone.push(k < 0.18 ? [0.86, 0.74, 0.66] : k < 0.36 ? [1.12, 0.86, 0.7] : [0.92 + r() * 0.2, 0.9 + r() * 0.12, 0.86 + r() * 0.1]); }
      const H = new Float32Array(w * h), T = new Int16Array(w * h), ph = r() * 100;
      for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) { const v = py / h, u = (px / w + 0.012 * Math.sin(v * TAU + ph + Math.sin(px / w * TAU * 2) * 2) + 0.008 * Math.sin(v * TAU * 3 + px / w * TAU * 3) + 1) % 1, ci = Math.floor(u * GX), cj = Math.floor(v * GY); let d1 = 9, d2 = 9, id = 0;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ii = (ci + di + GX) % GX, jj = (cj + dj + GY) % GY, P = pts[jj * GX + ii], qx = P[0] + Math.floor((ci + di) / GX) * 1 + 0, qy = P[1] + Math.floor((cj + dj) / GY); const ox = ((ci + di) - ((ci + di + GX) % GX)) / GX, oy = ((cj + dj) - ((cj + dj + GY) % GY)) / GY; const dx = (P[0] + ox - u) * 1.0, dy = (P[1] + oy - v) * 0.22, d = dx * dx + dy * dy; if (d < d1) { d2 = d1; d1 = d; id = jj * GX + ii; } else if (d < d2) d2 = d; }
        const e = Math.sqrt(d2) - Math.sqrt(d1), fib = 0.5 + 0.5 * Math.sin(u * TAU * 16 + Math.sin(v * TAU * 2 + ph) * 0.9 + Math.sin(u * TAU * 5) * 1.2);
        H[py * w + px] = Math.min(1, e * 11) ** 0.6 * (0.72 + 0.28 * fib); T[py * w + px] = id; }
      const img = x.createImageData(w, h), D = img.data, at = (px, py) => H[((py + h) % h) * w + ((px + w) % w)];
      for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) { const k = py * w + px, hv = H[k], gx = at(px + 1, py) - at(px - 1, py), gy = at(px, py + 1) - at(px, py - 1), lit = Math.max(-1, Math.min(1, (-gx * 0.7 - gy * 0.7) * 5)), tn = tone[T[k]];
        const crev = 1 - Math.min(1, hv * 3.2), base = 0.42 + 0.58 * hv, sh = base * (1 + 0.42 * lit) * (1 - 0.65 * crev), n2 = 0.94 + 0.12 * Math.sin(px * 1.7 + py * 0.31 + Math.sin(py * 0.05) * 9);
        D[k * 4] = Math.min(255, 122 * tn[0] * sh * n2 + 10); D[k * 4 + 1] = Math.min(255, 80 * tn[1] * sh * n2 + 5); D[k * 4 + 2] = Math.min(255, 48 * tn[2] * sh * n2 + 2); D[k * 4 + 3] = 255; }
      x.putImageData(img, 0, 0);
      // fine cracks across the plates and a few knots
      for (let i = 0; i < 90; i++) { let px = r() * w, py = r() * h; x.strokeStyle = `rgba(22,10,4,${0.25 + r() * 0.3})`; x.lineWidth = 0.8 + r() * 1.2; x.beginPath(); x.moveTo(px, py); for (let s = 0; s < 4; s++) { px += (r() - 0.5) * 10; py += 4 + r() * 10; x.lineTo(px, py); } x.stroke(); }
      for (let i = 0; i < 6; i++) { const cx = r() * w, cy = r() * h, rw = 5 + r() * 8, rh = 10 + r() * 16; for (let k = 0; k < 4; k++) { x.strokeStyle = k % 2 ? 'rgba(150,100,60,.35)' : 'rgba(25,12,5,.6)'; x.lineWidth = 1.4; x.beginPath(); x.ellipse(cx, cy, rw * (1 - k * 0.22), rh * (1 - k * 0.22), 0, 0, TAU); x.stroke(); } } }); }
  // a lumenite vein drawn into a glow map: it meanders, tapers organically (width falls off with distance along it), forks into thinner daughters that fork
  // again, and sheds a few hair-fine capillaries; the whole tree is then stroked in passes from a wide faint halo to a hot thin core, so the glow falls off
  // softly from every thread
  function trVeinsDraw(x, r, x0, y0, ang, len, wid, depth, segs) { const top = !segs; segs = segs || []; let px = x0, py = y0, a = ang; const a0 = ang, st = 7;
    for (let s = 0; s < len; s += st) { const u = s / len, wc = Math.max(0.45, wid * Math.pow(1 - u, 0.7) * (0.85 + 0.3 * r())), nx = px + Math.cos(a) * st, ny = py + Math.sin(a) * st; segs.push([px, py, nx, ny, wc]); px = nx; py = ny;
      a += (r() - 0.5) * 0.5 + Math.atan2(Math.sin(a0 - a), Math.cos(a0 - a)) * 0.1;
      if (depth < 4 && r() < 0.06 + 0.025 * depth) trVeinsDraw(x, r, px, py, a + (r() < 0.5 ? -1 : 1) * (0.45 + r() * 0.65), (len - s) * (0.3 + r() * 0.45), wc * 0.66, depth + 1, segs);
      else if (depth >= 1 && depth < 5 && r() < 0.04) trVeinsDraw(x, r, px, py, a + (r() < 0.5 ? -1 : 1) * (0.9 + r() * 0.6), len * (0.05 + r() * 0.08), wc * 0.45, 5, segs); }
    if (!top) return; x.save(); x.shadowBlur = 0; x.lineCap = 'round'; x.strokeStyle = '#ffffff';
    for (const [m, al] of [[6, 0.05], [3.2, 0.11], [1.7, 0.26], [0.95, 0.5], [0.4, 0.62]]) { x.globalAlpha = al; for (const [ax, ay, bx, by, wc] of segs) { x.lineWidth = Math.max(0.6, wc * m); x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.stroke(); } } x.restore(); }
  // lumenite vein tube that hugs a surface: pts of [x, y, z]; it tapers from its root to a fine tip and carries a faint wider glow sheath that tapers with it
  function trVein(par, pts, rad, m) { if (pts.length < 2) return; const c = new THREE.CatmullRomCurve3(pts.map((p) => V(p[0], p[1], p[2]))), NT = Math.max(6, pts.length * 3);
    const taper = (geo, k0) => { const P = geo.attributes.position, q = V(0, 0, 0), cp = V(0, 0, 0); for (let i = 0; i <= NT; i++) { const u = i / NT, f = k0 * Math.pow(1 - 0.88 * u, 0.85); c.getPointAt(u, cp); for (let j = 0; j <= 5; j++) { const vi = i * 6 + j; q.fromBufferAttribute(P, vi).sub(cp).multiplyScalar(f).add(cp); P.setXYZ(vi, q.x, q.y, q.z); } } P.needsUpdate = true; return geo; };
    part(par, taper(new THREE.TubeGeometry(c, NT, rad, 5, false), 1.25), m, null, null, null, { ink: false, shadow: false });
    part(par, taper(new THREE.TubeGeometry(c, NT, rad * 3.4, 5, false), 1.1), TR.veinGlow || (TR.veinGlow = new THREE.MeshBasicMaterial({ color: 0x2aa8e0, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false })), null, null, null, { ink: false, shadow: false }); TR.veins++; }
  function makeTree() { const g = new THREE.Group(); g.name = 'lumenTree'; const r = prng(808), R = TR.R, vm = new THREE.MeshBasicMaterial({ color: 0x1fb6d6, transparent: true, opacity: 0.62, blending: THREE.AdditiveBlending, depthWrite: false }), vm2 = new THREE.MeshBasicMaterial({ color: 0x1478a8, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }); TR.veinM = [vm, vm2];
    const bark = barkTex(31); bark.repeat.set(1, 1);
    // floor: dark heartwood, its grain flowing round the dais in rings and swirling out to the roots; lumenite veins as an emissive map branching out from the dais
    { const S = 2048, k = S / (2 * (R + 1)), grain = cv(S, S, (x, w, h) => { x.fillStyle = '#2c190b'; x.fillRect(0, 0, w, h); const c = w / 2;
        for (let i = 0; i < 16000; i++) { const a = r() * TAU, q = (TR.PR + 0.3 + Math.pow(r(), 0.8) * (R + 1 - TR.PR)) * k, ln = (10 + r() * 22), ta = a + Math.PI / 2 + Math.sin(a * 5 + q * 0.01) * 0.5, px = c + Math.cos(a) * q, py = c + Math.sin(a) * q; x.strokeStyle = r() < 0.5 ? `rgba(105,66,34,${0.25 + r() * 0.3})` : `rgba(12,6,2,${0.3 + r() * 0.3})`; x.lineWidth = 1.5 + r() * 2.5; x.beginPath(); x.arc(px - Math.cos(ta + Math.PI / 2) * ln, py - Math.sin(ta + Math.PI / 2) * ln, ln, ta + Math.PI / 2 - 0.5, ta + Math.PI / 2 + 0.5); x.stroke(); }
        for (let i = 0; i < 520; i++) { const rr = (TR.PR + 0.8 + r() * (R - TR.PR)) * k, ph = r() * TAU, amp = 6 + r() * 22, lob = 3 + Math.floor(r() * 6); x.strokeStyle = r() < 0.55 ? `rgba(18,9,3,${0.18 + r() * 0.25})` : `rgba(120,76,40,${0.08 + r() * 0.14})`; x.lineWidth = 1 + r() * 3; x.beginPath(); const a0 = r() * TAU, span = 0.4 + r() * 1.6; for (let t = 0; t <= 40; t++) { const a = a0 + span * t / 40, q = rr + amp * Math.sin(lob * a + ph); t ? x.lineTo(c + Math.cos(a) * q, c + Math.sin(a) * q) : x.moveTo(c + Math.cos(a) * q, c + Math.sin(a) * q); } x.stroke(); }
        for (let i = 0; i < 2600; i++) { const a = r() * TAU, q = (TR.PR + r() * (R - TR.PR)) * k; x.fillStyle = `rgba(${r() < 0.5 ? '15,8,3' : '120,80,44'},${0.1 + r() * 0.15})`; x.fillRect(c + Math.cos(a) * q, c + Math.sin(a) * q, 2 + r() * 6, 1 + r() * 2); } });
      const veins = cv(S, S, (x, w, h) => { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); const c = w / 2; x.strokeStyle = '#ffffff'; x.shadowColor = '#7fffee'; x.shadowBlur = 6;
        for (let i = 0; i < 20; i++) { const a = i / 20 * TAU + (r() - 0.5) * 0.15, q = (TR.PR + (trFlight(Math.sin(a), Math.cos(a)) < TR.HA ? TR.SD * TR.NS : 0.05)) * k; trVeinsDraw(x, r, c + Math.sin(a) * q, c + Math.cos(a) * q, Math.atan2(Math.cos(a), Math.sin(a)) + (r() - 0.5) * 0.5, (3.5 + r() * 7) * k, 2.6 + r() * 1.4, 0); }
        for (let i = 0; i < 8; i++) { const a = r() * TAU, q = (R - 0.8 - r() * 2) * k; trVeinsDraw(x, r, c + Math.sin(a) * q, c + Math.cos(a) * q, Math.atan2(-Math.cos(a), -Math.sin(a)) + (r() - 0.5) * 0.8, (2 + r() * 4) * k, 3, 1); } });
      const geo = new THREE.CircleGeometry(R + 1, 160).rotateX(-Math.PI / 2), uv = geo.attributes.uv, P = geo.attributes.position; for (let i = 0; i < P.count; i++) uv.setXY(i, 0.5 + P.getX(i) / (2 * (R + 1)), 0.5 - P.getZ(i) / (2 * (R + 1)));
      const fl = part(g, geo, toon(0xffffff, grain, { emissive: 0x1aa6c8, emissiveMap: veins, emissiveIntensity: 0.6 }), null, null, null, { ink: false }); fl.receiveShadow = true; fl.userData.walk = true; TR.floor = fl; TR.walk.push(fl); TR.floorVeins = veins; }
    // walls: one shell of twisting root columns over bark and grain, darkest in the folds; it closes overhead into a dome
    { const NA = 260, NY = 96, pos = [], col = [], uvs = [], idx = [], c0 = new THREE.Color(0x120804), c1 = new THREE.Color(0x4e3119), c2 = new THREE.Color(0x957048), cc = new THREE.Color();
      for (let j = 0; j <= NY; j++) { const y = TR.H * Math.pow(j / NY, 1.18) - 0.3; for (let i = 0; i <= NA; i++) { const a = i / NA * TAU, rr = trWallR(a, y), d = trRidge(a, y); pos.push(Math.sin(a) * rr, y, Math.cos(a) * rr); const t = clamp(d / 2.6, 0, 1), dd = (trRidge(a + 0.004, y) - trRidge(a - 0.004, y)) / 0.008, side = clamp(0.55 + dd * 0.09, 0, 1); cc.copy(c0).lerp(c1, ss(0.02, 0.5, t)).lerp(c2, ss(0.45, 1, t) * side * 0.85); const fall = 1 - 0.55 * ss(8, 30, y); cc.multiplyScalar((0.45 + 0.75 * side) * fall);
        let kw = 0; for (const [ka, ky] of TR_KNOTS) kw += Math.exp(-((trDA(a, ka) * TR.R / 6) ** 2) - ((y - ky) / 6) ** 2); cc.r += 0.32 * kw * t; cc.g += 0.2 * kw * t; cc.b += 0.08 * kw * t; const cy = Math.exp(-y / 2.2) * (0.4 + 0.6 * t) * (0.6 + 0.4 * Math.sin(a * 17) ** 2); cc.r += 0.0 * cy; cc.g += 0.16 * cy; cc.b += 0.14 * cy; col.push(cc.r, cc.g, cc.b); uvs.push(i / NA * 26, y / 3.6); } }
      for (let j = 0; j < NY; j++) for (let i = 0; i < NA; i++) { const a = j * (NA + 1) + i, b = a + 1, c = a + NA + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geo.setIndex(idx); geo.computeVertexNormals();
      const wm = new THREE.MeshBasicMaterial({ map: bark, vertexColors: true, side: THREE.DoubleSide }); wm.color.setScalar(1.15); TR.wall = part(g, geo, wm, null, null, null, { ink: false, shadow: false }); TR.wall.receiveShadow = true; }
    // wall veins: lumenite threads climbing the root folds from the floor, forking as they go
    for (let k = 0; k < 16; k++) { const a0 = r() * TAU; if (trDA(a0, 0) < 0.3) continue; const up = (a, y, h, rad, dep) => { const pts = []; let aa = a; for (let y2 = y; y2 <= y + h; y2 += 0.35) { aa += (r() - 0.5) * 0.02 + 0.004; pts.push([Math.sin(aa) * (trWallR(aa, y2) - 0.06), y2, Math.cos(aa) * (trWallR(aa, y2) - 0.06)]); if (dep < 2 && r() < 0.06) up(aa, y2, (y + h - y2) * 0.6, rad * 0.7, dep + 1); } trVein(g, pts, rad, dep ? vm2 : vm); }; up(a0, 0.05, 1.0 + r() * 2.6, 0.035, 0); }
    // the dais: a raised round root platform, ring-grained top with a rolled rim, bark sides, curved steps down on all four sides
    { const D = new THREE.Group(); g.add(D); TR.dais = D; const S = 1024, k = S / (2 * TR.PR), top = cv(S, S, (x, w, h) => { x.fillStyle = '#4e2c16'; x.fillRect(0, 0, w, h); const c = w / 2; for (let i = 0; i < 70; i++) { const q = (0.6 + i / 70 * (TR.PR - 0.5)) * k; x.strokeStyle = i % 3 ? 'rgba(30,14,5,.45)' : 'rgba(140,92,50,.3)'; x.lineWidth = 1.5 + r() * 2.5; x.beginPath(); for (let t = 0; t <= 90; t++) { const a = t / 90 * TAU, qq = q * (1 + 0.025 * Math.sin(5 * a + i) + 0.012 * Math.sin(13 * a)); t ? x.lineTo(c + Math.cos(a) * qq, c + Math.sin(a) * qq) : x.moveTo(c + Math.cos(a) * qq, c + Math.sin(a) * qq); } x.stroke(); }
          for (let i = 0; i < 900; i++) { const a = r() * TAU, q = r() * TR.PR * k; x.fillStyle = `rgba(30,14,5,${0.15 + r() * 0.2})`; x.fillRect(c + Math.cos(a) * q, c + Math.sin(a) * q, 1 + r() * 4, 1 + r() * 3); } }),
        tv = cv(S, S, (x, w, h) => { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); x.strokeStyle = '#fff'; x.shadowColor = '#7fffee'; x.shadowBlur = 5; const c = w / 2; for (let i = 0; i < 18; i++) { const a = i / 18 * TAU + (r() - 0.5) * 0.2; trVeinsDraw(x, r, c + Math.cos(a) * TR.CR * k * 0.85, c + Math.sin(a) * TR.CR * k * 0.85, a + (r() - 0.5) * 0.4, (TR.PR - TR.CR) * k * (0.8 + r() * 0.4), 5, 1); } });
      const tg = new THREE.CircleGeometry(TR.PR, 128).rotateX(-Math.PI / 2), uv = tg.attributes.uv, P = tg.attributes.position; for (let i = 0; i < P.count; i++) uv.setXY(i, 0.5 + P.getX(i) / (2 * TR.PR), 0.5 - P.getZ(i) / (2 * TR.PR));
      const tm = part(D, tg, toon(0xffffff, top, { emissive: 0x1aa6c8, emissiveMap: tv, emissiveIntensity: 0.45 }), [0, TR.PH + 0.002, 0], null, null, { ink: false }); tm.receiveShadow = true; TR.walk.push(tm); TR.daisTop = tm;
      const sideT = barkTex(33); sideT.repeat.set(16, 0.3); part(D, cyl(TR.PR + 0.08, TR.PR, TR.PH, 128, true), toon(0xffffff, sideT, { color: 0x8a5a34 }), [0, TR.PH / 2, 0], null, null, { ink: false });
      part(D, new THREE.TorusGeometry(TR.PR - 0.1, 0.13, 10, 160).rotateX(Math.PI / 2), toon(0x7a4a26), [0, TR.PH + 0.02, 0], null, [1, 0.55, 1]);
      part(D, new THREE.TorusGeometry(TR.PR + 0.06, 0.1, 8, 160).rotateX(Math.PI / 2), toon(0x5a3820), [0, 0.04, 0], null, [1, 0.6, 1], { ink: false });
      const stepM = toon(0x4a2c16), nosM = toon(0x6e4424); for (const fa of TR.FL) for (let s = 1; s <= TR.NS; s++) { const ha = TR.HA + 0.012 * s, r0 = TR.PR - 0.1, r1 = TR.PR + TR.SD * s, sh = new THREE.Shape(); sh.absarc(0, 0, r1, -ha, ha, false); sh.absarc(0, 0, r0, ha, -ha, true);
          const hgt = TR.PH - TR.SH * s, eg = new THREE.ExtrudeGeometry(sh, { depth: hgt, bevelEnabled: false, curveSegments: 40 }).rotateX(-Math.PI / 2).rotateY(fa - Math.PI / 2); const st2 = part(D, eg, stepM, null, null, null, {}); st2.userData.walk = true; TR.walk.push(st2);
          part(D, new THREE.TorusGeometry(r1 - 0.03, 0.045, 6, 48, 2 * ha).rotateX(Math.PI / 2).rotateY(fa - Math.PI / 2 + ha), nosM, [0, hgt, 0], [0, 0, 0], [1, 0.7, 1], { ink: false }); }
      // veins spilling down each flight's treads
      for (const fa of TR.FL) for (const off of [-0.07, 0.05]) { const pts = []; for (let rr = TR.PR - 0.3; rr <= TR.PR + TR.SD * TR.NS + 0.3; rr += 0.09) { const a = fa + off + Math.sin(rr * 3) * 0.01, x = Math.sin(a) * rr, z = Math.cos(a) * rr; pts.push([x, trHeight(x, z) + 0.015, z]); } trVein(D, pts, 0.03, vm); }
      // the rim stops her except at the four flights; the crystal's root mound is solid
      TR.obs.push({ x: 0, z: 0, r: TR.CR }); const n = 96; for (let i = 0; i < n; i++) { const a = i / n * TAU; if (trFlight(Math.sin(a), Math.cos(a)) < TR.HA - 0.05) continue; TR.obs.push({ x: Math.sin(a) * (TR.PR + 0.05), z: Math.cos(a) * (TR.PR + 0.05), r: 0.24 }); } }
    // the lumenite crystal (hand-shaped after the approved concept): one tall, slightly leaning master spire hugged by a tight cluster of lesser spires, each an
    // irregular, asymmetric hexagonal prism (uneven corners, bevels of varied width, a gentle bulge and lean) ending in its own chiselled point or a fractured top;
    // dozens of small fragment shards sprout in sprays from the dark root-and-rubble mound round its foot. The stone is slick: sharp specular glints and a tight
    // clearcoat lobe off every facet plus a fresnel rim; it is clear toward its silhouette edges and tips and dense toward the middle, where an inner lumenite-blue
    // core glows through it and breathes slowly (no strobing)
    { const C = new THREE.Group(); C.position.set(0, TR.PH, 0); C.scale.setScalar(1.15); g.add(C); TR.crystal = C; const CRs = TR.CR / 1.15;
      const U = { uT: { value: 0 }, uP: { value: 1 }, uF: { value: 1 } }; TR.crystalU = U; /* uF: the camera fade (occFade) */
      const VS = 'attribute vec3 aS; varying vec3 vW; varying vec3 vS; void main() { vS = aS; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
      const FH = 'uniform float uT; uniform float uP; uniform float uF; varying vec3 vW; varying vec3 vS; float h3(vec3 n) { return fract(sin(dot(n, vec3(12.99, 78.23, 37.71))) * 43758.5); }' +
        ' vec3 fN() { vec3 N = normalize(cross(dFdx(vW), dFdy(vW))); if (dot(N, cameraPosition - vW) < 0.0) N = -N; return N; } float pulse(float ndv) { float d = length(vec2(1.0 - ndv, (vS.y - 0.38) * 1.15)), ph = 6.2832 * (uT / 9.0 + vS.z) - d * 6.2832 * 1.1, w = pow(0.5 + 0.5 * sin(ph), 3.0); return uP * (0.9 + 0.32 * w * (1.0 - smoothstep(0.55, 1.0, d))) * 1.18; } /* a slow wave (~9 s, staggered per shard) born at the heart of each shard and travelling out through the stone toward its faces, base and tip */';
      // the glossy shell: per-facet tint variation, warm glints from the two knotholes, a cool top glint, a tight clearcoat lobe, a fresnel rim; alpha high face-on (looking
      // through the thick middle, where the core shows) and low at grazing angles and toward the tip, so the edges read clear
      const FS = FH + ' uniform vec3 uTint; uniform vec3 uDeep; void main() { vec3 N = fN(), Vd = normalize(cameraPosition - vW); float ndv = clamp(dot(N, Vd), 0.0, 1.0), fr = pow(1.0 - ndv, 4.0), fv = h3(floor(N * 7.0 + 0.5)), p = pulse(ndv);' +
        ' float tip = smoothstep(0.62, 1.0, vS.y), core = pow(ndv, 1.6) * (1.0 - 0.65 * tip) * (0.55 + 0.45 * (1.0 - vS.x));' +
        ' vec3 col = mix(uDeep, uTint, 0.15 + 0.4 * ndv * ndv + 0.3 * fv) + vec3(0.1, 0.42, 0.85) * core * 0.32 * p;' +
        ' vec3 L1 = normalize(vec3(-0.42, 0.42, -0.8)), L2 = normalize(vec3(0.48, 0.4, -0.78)), L3 = normalize(vec3(0.15, 1.0, 0.5)), L4 = normalize(vec3(0.2, 0.35, 0.9));' +
        ' float d1 = max(dot(N, normalize(L1 + Vd)), 0.0), d2 = max(dot(N, normalize(L2 + Vd)), 0.0), d3 = max(dot(N, normalize(L3 + Vd)), 0.0), d4 = max(dot(N, normalize(L4 + Vd)), 0.0);' +
        ' float sW = pow(d1, 70.0) + pow(d2, 70.0), sC = pow(d3, 45.0) + 0.6 * pow(d4, 60.0), cc = pow(d1, 600.0) + pow(d2, 600.0) + pow(d3, 400.0) + pow(d4, 500.0);' +
        ' vec3 Rf = reflect(-Vd, N); col += mix(vec3(0.03, 0.02, 0.015), vec3(0.32, 0.2, 0.1), smoothstep(-0.3, 0.7, Rf.y)) * (0.18 + 0.7 * fr); /* the warm hall mirrored in the polish */ col += vec3(1.0, 0.8, 0.52) * sW * 0.8 + vec3(0.62, 1.0, 1.0) * sC * 0.5 + vec3(1.0) * cc * 2.0 + vec3(0.35, 0.95, 0.9) * fr * 0.45;' +
        ' float a = (0.24 + 0.52 * pow(ndv, 1.2)) * (1.0 - 0.5 * tip); a = clamp(a + fr * 0.4 + (sW + sC) * 0.45 + cc, 0.0, 1.0); gl_FragColor = vec4(col, a * uF); }';
      // the inner core: a slimmer copy inside each big shard, drawn first and additively, brightest seen straight on, fading toward its tip - the glow seen through the stone
      const FC = FH + ' void main() { vec3 N = fN(), Vd = normalize(cameraPosition - vW); float ndv = clamp(dot(N, Vd), 0.0, 1.0), k = pow(ndv, 2.2) * (1.0 - 0.75 * smoothstep(0.45, 1.0, vS.y)) * smoothstep(-0.05, 0.12, vS.y), p = pulse(ndv);' +
        ' gl_FragColor = vec4((vec3(0.08, 0.42, 1.0) * k * 1.5 + vec3(0.35, 0.92, 1.0) * k * k * k * 0.8) * p * uF, 1.0); }';
      const shellM = (tint, deep) => new THREE.ShaderMaterial({ uniforms: { uT: U.uT, uP: U.uP, uF: U.uF, uTint: { value: new THREE.Color(tint) }, uDeep: { value: new THREE.Color(deep) } }, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, extensions: { derivatives: true } });
      const cm = shellM(0x16a892, 0x02201c), cm2 = shellM(0x1aa09a, 0x022420), coreM = new THREE.ShaderMaterial({ uniforms: { uT: U.uT, uP: U.uP, uF: U.uF }, vertexShader: VS, fragmentShader: FC, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, extensions: { derivatives: true } });
      const crk = new THREE.MeshBasicMaterial({ color: 0xc8fff6, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }), edgeM = new THREE.LineBasicMaterial({ color: 0xd8fffa, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }),
        incM = new THREE.MeshBasicMaterial({ color: 0xe6fffa, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      TR.crystalM = [cm, cm2, coreM, crk, edgeM, incM]; TR.crystalEdges = 0; TR.crystalInc = 0; TR.crystalCore = 0; TR.crystalFrag = 0; TR.crystalSpires = [];
      // one hand-shaped shard (local y up, foot at 0): six uneven corners with jittered angles and radii, each bevelled by its own width; a slight bulge and lean;
      // the termination starts at a different height on every corner (a chiselled, asymmetric point off the axis) or, for a broken shard, a tilted fracture face.
      // aS = (radial fraction, height fraction, phase) for the shaders
      const shardGeo = (h, rad, o = {}) => { const n = 6, ph = r() * TAU, cs = []; for (let i = 0; i < n; i++) { const a = ph + (i + (r() - 0.5) * 0.42) / n * TAU, rr = rad * (0.68 + r() * 0.5); cs.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
        const ring = []; for (let i = 0; i < n; i++) { const c = cs[i], a = cs[(i + n - 1) % n], b = cs[(i + 1) % n], bv = 0.05 + r() * 0.17; ring.push([lerp(c[0], a[0], bv), lerp(c[1], a[1], bv)], [lerp(c[0], b[0], bv), lerp(c[1], b[1], bv)]); }
        const m = ring.length, lean = [(r() - 0.5) * rad * 0.6, (r() - 0.5) * rad * 0.6], bul = 1.02 + r() * 0.08, tb = o.broken ? 0.9 : 0.6 + r() * 0.14, ph2 = r();
        const tops = ring.map(() => h * (tb + (o.broken ? (r() - 0.5) * 0.06 : r() * 0.1))), lv = [[-0.3, 0.97], [0.07, 1], [0.4, bul], [-1, 0.9]];
        const R2 = lv.map(([f, k]) => ring.map(([x, z], i) => { const y = f === -1 ? tops[i] : f * h, u = Math.max(0, y) / h; return V(x * k + lean[0] * u, y, z * k + lean[1] * u); })), pos = [], aS = [];
        const tri = (...P) => { for (const q of P) { pos.push(q.x, q.y, q.z); aS.push(Math.min(1, Math.hypot(q.x - lean[0] * Math.max(0, q.y) / h, q.z - lean[1] * Math.max(0, q.y) / h) / rad), Math.max(0, q.y) / h, ph2); } };
        for (let j = 0; j < R2.length - 1; j++) for (let i = 0; i < m; i++) { const a = R2[j][i], b = R2[j][(i + 1) % m], c = R2[j + 1][i], d = R2[j + 1][(i + 1) % m]; tri(a, c, b); tri(b, c, d); }
        const top = R2[R2.length - 1], tk = 0.12 + r() * 0.2, apx = o.broken ? V(lean[0] + (r() - 0.5) * rad * 0.3, h * (tb + 0.07), lean[1] + (r() - 0.5) * rad * 0.3) : V(lean[0] * 1.25 + (r() - 0.5) * rad * 0.55, h, lean[1] * 1.25 + (r() - 0.5) * rad * 0.55);
        // a split termination: one ridge vertex part-way up, so the point has two or three big facets of different size rather than six equal ones
        const rg = apx.clone().lerp(top[0], tk + 0.25); rg.y = lerp(tops[0], h, 0.55); for (let i = 0; i < m; i++) { const A = top[i], B = top[(i + 1) % m]; if (!o.broken && (i < 2 || i === m - 1)) { tri(A, rg, B); if (i === 1) tri(B, rg, apx); if (i === m - 1) tri(rg, apx, A); } else tri(A, apx, B); }
        const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g2.setAttribute('aS', new THREE.Float32BufferAttribute(aS, 3)); g2.computeVertexNormals(); return g2; };
      const spire = (h, rad, m, p, tilt, yaw, cracks, o = {}) => { const geo = shardGeo(h, rad, o); const S2 = new THREE.Group(); S2.position.copy(p); S2.rotation.set(tilt, yaw, 0, 'YXZ'); C.add(S2); TR.crystalSpires.push(S2);
        const core = part(S2, geo, coreM, [0, 0.02 * h, 0], null, [0.36, 0.84, 0.36], { ink: false, shadow: false }); core.renderOrder = 1; TR.crystalCore++; const sh = part(S2, geo, m, null, null, null, { ink: false }); sh.renderOrder = 2;
        // faint glints along the bevels, inclusions (fracture planes) and veins of light deep inside the larger shards
        if (rad > 0.3) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 14), edgeM); e.renderOrder = 3; S2.add(e); TR.crystalEdges++;
          for (let q = 0; q < Math.round(rad * 4); q++) { part(S2, new THREE.PlaneGeometry(rad * (0.4 + r() * 0.5), h * (0.06 + r() * 0.1)), incM, [(r() - 0.5) * rad * 0.7, h * (0.15 + r() * 0.45), (r() - 0.5) * rad * 0.7], [r() * 3, r() * 3, r() * 3], null, { ink: false, shadow: false }); TR.crystalInc++; } }
        for (let q = 0; q < cracks; q++) { const pts = []; let a = r() * TAU; for (let y = 0.05 * h; y < 0.82 * h; y += h / 14) { a += (r() - 0.5) * 0.6; const rr = rad * 0.42 * (1 - 0.6 * y / h) * (0.6 + r() * 0.4); pts.push(V(Math.cos(a) * rr, y, Math.sin(a) * rr)); } const t2 = part(S2, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.012 + rad * 0.008, 4, false), crk, null, null, null, { ink: false, shadow: false }); t2.renderOrder = 1; }
        return S2; };
      // the mound: a dark rounded root boss with pointed rock teeth round it (as in the concept) and rubble
      part(C, ell(CRs * 0.95, 0.55, CRs * 0.95, 24, 10), toon(0xffffff, bark, { color: 0x3e2414 }), [0, 0, 0], null, null, { ink: false });
      const rk = toon(0xffffff, bark, { color: 0x45291a }); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + r() * 0.3, rr = CRs * (0.7 + r() * 0.3), hh = 0.45 + r() * 0.55, S3 = new THREE.Group(); S3.position.set(Math.sin(a) * rr, 0, Math.cos(a) * rr); S3.rotation.set(0.35 + r() * 0.3, a, 0, 'YXZ'); C.add(S3); part(S3, new THREE.ConeGeometry(0.28 + r() * 0.2, hh, 7).translate(0, hh / 2 - 0.1, 0), rk, null, null, [1, 1, 0.7]); }
      { const mx = toon(0x24302c, null, {}); mx.flatShading = true; const mx2 = toon(0x3a2a1e, null, {}); mx2.flatShading = true; TR.crystalBase = 0;
        for (let i = 0; i < 26; i++) { const a = r() * TAU, rr = CRs * (0.25 + r() * 0.7), sz = 0.16 + r() * 0.3; part(C, new THREE.DodecahedronGeometry(sz, 0), i % 3 ? mx : mx2, [Math.sin(a) * rr, 0.1 + sz * 0.25, Math.cos(a) * rr], [r() * 3, r() * 3, r() * 3], [1, 0.55 + r() * 0.3, 1], { ink: false }); TR.crystalBase++; } }
      // the master spire and the cluster hugging it: tall companions close in, leaning only a little; medium spires further out leaning more; a couple of broken ones
      TR.spire = spire(8.4, 1.12, cm, V(0.05, 0, -0.05), 0.05, 0.3, 4);
      const comp = [[0.4, 0.78, 5.6, 0.5, 0.14], [1.5, 0.86, 4.4, 0.46, 0.2], [2.5, 0.8, 5.0, 0.42, 0.16], [3.5, 0.92, 3.6, 0.4, 0.24], [4.4, 0.84, 4.8, 0.48, 0.15], [5.4, 0.9, 3.2, 0.36, 0.26]];
      comp.forEach(([a, rr, h, rad, tl], i) => spire(h * (0.92 + r() * 0.16), rad * (0.9 + r() * 0.2), i % 2 ? cm2 : cm, V(Math.sin(a) * rr, 0, Math.cos(a) * rr), tl + r() * 0.06, a + (r() - 0.5) * 0.3, i % 2));
      for (let i = 0; i < 9; i++) { const a = (i + 0.3) / 9 * TAU + r() * 0.35, rr = 1.3 + r() * 0.55; spire(1.3 + r() * 1.7, 0.2 + r() * 0.16, i % 3 ? cm2 : cm, V(Math.sin(a) * rr, 0.08, Math.cos(a) * rr), 0.32 + r() * 0.3, a + (r() - 0.5) * 0.4, i % 2, { broken: i % 4 === 1 }); }
      // the fragments: sprays of 2-5 little shards growing from shared roots all over the mound (and a few loose chips), merged into one mesh
      { const P = [], S = [], M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1); let nf = 0;
        const put = (geo, pos, tilt, yaw, s = 1) => { M4.compose(pos, Q.setFromEuler(E.set(tilt, yaw, 0, 'YXZ')), one.clone().multiplyScalar(s)); geo.applyMatrix4(M4); P.push(...geo.attributes.position.array); S.push(...geo.attributes.aS.array); nf++; };
        for (let c = 0; c < 30; c++) { const a = c / 30 * TAU + (r() - 0.5) * 0.2, rr = CRs * (0.42 + r() * 0.62), base = V(Math.sin(a) * rr, 0.55 * Math.sqrt(Math.max(0, 1 - (rr / (CRs * 0.95)) ** 2)) - 0.04, Math.cos(a) * rr), k = 2 + Math.floor(r() * 4);
          for (let q = 0; q < k; q++) put(shardGeo(0.3 + r() * (0.9 - q * 0.12), 0.06 + r() * 0.11, { broken: r() < 0.2 }), base.clone().add(V((r() - 0.5) * 0.16, 0, (r() - 0.5) * 0.16)), 0.25 + r() * 0.75, a + (r() - 0.5) * 1.4); }
        for (let c = 0; c < 14; c++) { const a = r() * TAU, rr = CRs * (1.0 + r() * 0.35); put(shardGeo(0.12 + r() * 0.2, 0.04 + r() * 0.05, { broken: true }), V(Math.sin(a) * rr, 0.02, Math.cos(a) * rr), 1.2 + r() * 0.3, r() * TAU); }
        const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); fg.setAttribute('aS', new THREE.Float32BufferAttribute(S, 3)); fg.computeVertexNormals();
        const fm = part(C, fg, cm2, null, null, null, { ink: false, shadow: false }); fm.renderOrder = 2; TR.crystalFrag = nf; TR.crystalFragMesh = fm; }
      const L = new THREE.PointLight(0x48e8ff, 1.1, 22, 1.3); L.position.set(0, 3.4, 0); C.add(L); TR.crystalLight = L; const L2 = new THREE.PointLight(0x2fd0e0, 0.6, 12, 1.4); L2.position.set(0, 7, 0); C.add(L2);
      const glowT = cv(128, 128, (x, w, h) => { const gr = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(140,235,255,.5)'); gr.addColorStop(0.35, 'rgba(60,200,230,.2)'); gr.addColorStop(1, 'rgba(20,140,160,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.12 })); sp.scale.set(12, 15, 1); sp.position.set(0, 4.2, 0); sp.renderOrder = 4; C.add(sp); TR.glow = sp; C.userData.occU = true; TR.occ.push(C); /* the whole cluster fades see-through if the camera ends up behind or inside it */ }
    // knotholes high on the far wall: warm daylight ovals in thick bark lips, each throwing a dusty shaft down toward the dais
    { const lip = new THREE.MeshBasicMaterial({ map: bark, color: 0xb98652 }), lip2 = new THREE.MeshBasicMaterial({ map: bark, color: 0x7a5232 }), kgT = cv(128, 128, (x, w, h) => { const gr = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,220,150,.55)'); gr.addColorStop(0.5, 'rgba(255,170,80,.18)'); gr.addColorStop(1, 'rgba(255,150,60,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); }), holeT = cv(128, 192, (x, w, h) => { const gr = x.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, h / 2); gr.addColorStop(0, '#fffbe8'); gr.addColorStop(0.45, '#ffe3a0'); gr.addColorStop(0.8, '#f0a650'); gr.addColorStop(1, '#a8602a'); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
      TR_KNOTS.forEach(([a, y], i) => { const rr = trWallR(a, y), p = V(Math.sin(a) * (rr - 0.12), y, Math.cos(a) * (rr - 0.12)), K = new THREE.Group(); K.position.copy(p); K.lookAt(0, y - 2, 0); g.add(K); TR.knots.push(K);
        part(K, new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ map: holeT, fog: false }), [0, 0, -0.05], null, [1.35, 2.5, 1], { ink: false, shadow: false });
        part(K, new THREE.TorusGeometry(1.65, 0.55, 12, 40), lip, [0, 0, 0.15], null, [1, 1.55, 0.8], { ink: false });
        part(K, new THREE.TorusGeometry(2.55, 0.5, 10, 40), lip2, [0, 0, -0.05], null, [1, 1.45, 0.7], { ink: false }); part(K, new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: kgT, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), [0, 0, 0.5], null, [9, 12, 1], { ink: false, shadow: false });
        const tgt = i === 0 ? V(-4.2, 0.6, 4.4) : V(4.6, 0.6, 3.8), d = tgt.clone().sub(p), Ls = d.length(), NS = 12, sg = new THREE.CylinderGeometry(1.5, 4.2, Ls, 32, NS, true).translate(0, -Ls / 2, 0), P = sg.attributes.position, cl = [];
        for (let k = 0; k < P.count; k++) { const u = -P.getY(k) / Ls, al = (i === 0 ? 0.42 : 0.34) * (0.4 + 0.6 * Math.pow(Math.max(0, 1 - u), 1.2)) * ss(0, 0.05, u) * (1 - 0.5 * ss(0.94, 1, u)); cl.push(1, 0.82, 0.52, al); } sg.setAttribute('color', new THREE.Float32BufferAttribute(cl, 4));
        const sh = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); sh.position.copy(p); sh.quaternion.setFromUnitVectors(V(0, -1, 0), d.clone().normalize()); sh.renderOrder = 4; g.add(sh); TR.shafts.push(sh);
        const pool = part(g, new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: TR.poolT || (TR.poolT = cv(128, 128, (x, w, h) => { const gr = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,226,160,.95)'); gr.addColorStop(0.55, 'rgba(255,190,110,.45)'); gr.addColorStop(1, 'rgba(255,160,80,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); })), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), [tgt.x, tgt.y + 0.03, tgt.z], [-Math.PI / 2, 0, 0], [8.5, 8.5, 1], { ink: false, shadow: false }); pool.renderOrder = 3; (TR.knotPools = TR.knotPools || []).push(pool);
        const sl = new THREE.SpotLight(0xffc87a, i === 0 ? 2.8 : 2.2, 45, 0.3, 0.8, 1.0); sl.position.copy(p); sl.target.position.copy(tgt); g.add(sl, sl.target); TR['knotLight' + i] = sl;
        const mp = [], N = 140; for (let k = 0; k < N; k++) { const u = r(), q = p.clone().addScaledVector(d, u), rad = lerp(1.0, 3.6, u) * Math.sqrt(r()) * 0.8, a2 = r() * TAU; mp.push(q.x + Math.cos(a2) * rad, q.y + (r() - 0.5) * rad, q.z + Math.sin(a2) * rad); } const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(mp, 3));
        const mo = new THREE.Points(mg, new THREE.PointsMaterial({ color: 0xffe2a8, size: 0.06, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })); mo.userData.base = mp.slice(); g.add(mo); (TR.motes = TR.motes || []).push(mo); }); }
    // the great door from inside (matches the exterior's grand door, concept/grand-door.jpg): a pointed lancet arch in a carved wooden casing with a crest at its apex,
    // two tall plank leaves - inside face: ledges and braces, iron straps, strap hinges, ring pulls - standing a hand's width ajar on a blade of Lumen daylight,
    // the bark lips and roots of the trunk folding round the casing, glowing mushrooms and shards at its foot. Tap the door or its light to go out.
    { const rr = TR_DZ, D = new THREE.Group(); D.position.set(0, 0, rr); D.rotation.y = Math.PI; g.add(D); TR.door = D; const hw = 2.6, ys = 6.2, rd = hw * 1.6;
      const ytop = (x, h, s0) => s0 + Math.sqrt(Math.max(0, rd * rd - (x - (x <= 0 ? -h + rd : h - rd)) ** 2)), lancet = (h, s0, x0 = -h, x1 = h) => { const sh = new THREE.Shape(), N = 36; sh.moveTo(x0, 0); for (let i = 0; i <= N; i++) { const x = x0 + (x1 - x0) * i / N; sh.lineTo(x, ytop(x, h, s0)); } sh.lineTo(x1, 0); sh.closePath(); return sh; };
      const apex = ys + Math.sqrt(rd * rd - (hw - rd) ** 2); TR.doorApex = apex;
      // the light beyond: a bright plane set back in the doorway (tap target), and a pool of it spilling in across the floor
      const lt = cv(64, 256, (x, w, h) => { const gr = x.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, '#fff2c8'); gr.addColorStop(0.5, '#e8fff6'); gr.addColorStop(1, '#9ff5e2'); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
      const EX = new THREE.Group(); D.add(EX); TR.exit = EX; const op = part(EX, new THREE.ShapeGeometry(lancet(hw, ys), 24), new THREE.MeshBasicMaterial({ map: lt, fog: false }), [0, 0.02, -0.25], null, null, { ink: false, shadow: false }); { const P = op.geometry.attributes.position, uv = op.geometry.attributes.uv; for (let i = 0; i < P.count; i++) uv.setXY(i, P.getX(i) / (2 * hw) + 0.5, P.getY(i) / apex); } op.userData.exit = true; TR.doorLight = op;
      const pool = part(D, new THREE.PlaneGeometry(3.2, 7.5), new THREE.MeshBasicMaterial({ map: cv(64, 128, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,236,190,.55)'); gr.addColorStop(1, 'rgba(255,220,160,0)'); x.fillStyle = gr; x.beginPath(); x.moveTo(w * 0.42, 0); x.lineTo(w * 0.58, 0); x.lineTo(w, h); x.lineTo(0, h); x.fill(); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }), [0, 0.03, 3.6], [-Math.PI / 2, 0, 0], null, { ink: false, shadow: false }); TR.doorPool = pool;
      // the two leaves, inside face: vertical planks with grain and dark joints
      const pl = cv(256, 512, (x, w, h) => { const r2 = prng(57); x.fillStyle = '#6b4627'; x.fillRect(0, 0, w, h); const n = 6; for (let i = 0; i < n; i++) { const x0 = i * w / n; x.fillStyle = `rgb(${74 + r2() * 20},${46 + r2() * 14},${26 + r2() * 10})`; x.fillRect(x0 + 2, 0, w / n - 4, h); for (let k = 0; k < 26; k++) { x.strokeStyle = `rgba(40,22,10,${0.15 + r2() * 0.25})`; x.lineWidth = 1 + r2() * 1.5; x.beginPath(); const gx = x0 + 6 + r2() * (w / n - 12); x.moveTo(gx, 0); for (let y = 0; y < h; y += 24) x.lineTo(gx + Math.sin(y * 0.02 + k) * 3, y); x.stroke(); } x.fillStyle = 'rgba(25,12,5,.9)'; x.fillRect(x0, 0, 2, h); } for (let k = 0; k < 7; k++) { const cx = r2() * w, cy = r2() * h; x.strokeStyle = 'rgba(40,20,8,.6)'; x.beginPath(); x.ellipse(cx, cy, 4 + r2() * 4, 9 + r2() * 8, 0, 0, TAU); x.stroke(); } });
      const plM = toon(0xffffff, pl), woodD = toon(0x4e301a), woodC = toon(0x553620), iron = toon(0x2e2a28), ironL = toon(0x4a4440); TR.leaves = [];
      for (const sd of [-1, 1]) { const L = new THREE.Group(); L.position.set(sd * hw, 0, 0.05); L.rotation.y = sd * -0.16 * (sd < 0 ? 1 : 0.8); EX.add(L); TR.leaves.push(L);
        const gap = 0.12, sh = sd < 0 ? lancet(hw, ys, -hw, -gap) : lancet(hw, ys, gap, hw); const eg = new THREE.ExtrudeGeometry(sh, { depth: 0.22, bevelEnabled: false, curveSegments: 20 }); eg.translate(-sd * hw, 0, 0); const P = eg.attributes.position, uv = eg.attributes.uv; for (let i = 0; i < P.count; i++) uv.setXY(i, (P.getX(i) + sd * hw) / (2 * hw) + 0.5, P.getY(i) / apex); const lf = part(L, eg, plM, null, null, null, {}); lf.userData.exit = true;
        const wid = (y) => Math.max(0.3, (y <= ys ? hw : (hw - rd) + Math.sqrt(Math.max(0, rd * rd - (y - ys) ** 2))) - gap);
        // ledges (horizontal battens) and a brace between them, on the inside face
        for (const y of [1.1, 3.6, 6.0]) { const w = wid(y) - 0.25; part(L, rbox(w, 0.34, 0.1, 0.03), woodC, [-sd * (0.12 + w / 2), y, 0.28], null, null, {}); part(L, rbox(w + 0.1, 0.08, 0.06, 0.02), iron, [-sd * (0.12 + w / 2), y + 0.2, 0.34], null, null, { ink: false }); for (let k = 0; k < 7; k++) part(L, new THREE.SphereGeometry(0.035, 6, 4), ironL, [-sd * (0.2 + (w - 0.1) * k / 6), y + 0.2, 0.37], null, null, { ink: false }); }
        for (const [y0, y1] of [[1.1, 3.6], [3.6, 6.0]]) { const w = wid(y1) - 0.5, dx = w, dy = y1 - y0, ln = Math.hypot(dx, dy); part(L, rbox(0.26, ln - 0.2, 0.09, 0.03), woodC, [-sd * (0.25 + w / 2), (y0 + y1) / 2, 0.27], [0, 0, sd * Math.atan2(dx, dy)], null, {}); }
        // strap hinges on the outer edge with knuckles; a ring pull by the meeting edge
        for (const y of [1.6, 5.2]) { part(L, rbox(1.6, 0.16, 0.05, 0.02), iron, [-sd * 0.8, y, 0.3], null, null, { ink: false }); part(L, cyl(0.09, 0.09, 0.4, 10), ironL, [0, y, 0.15], null, null, { ink: false }); part(L, new THREE.ConeGeometry(0.12, 0.3, 4).rotateZ(sd * Math.PI / 2), iron, [-sd * 1.65, y, 0.3], null, null, { ink: false }); }
        part(L, new THREE.TorusGeometry(0.16, 0.035, 6, 16), ironL, [-sd * (wid(3) - 0.15), 2.9, 0.34], null, null, { ink: false }); part(L, new THREE.SphereGeometry(0.07, 8, 6), iron, [-sd * (wid(3) - 0.15), 3.08, 0.32], null, null, { ink: false }); }
      // the blade of light between the leaves
      part(EX, new THREE.PlaneGeometry(0.34, ys + 1.6), new THREE.MeshBasicMaterial({ color: 0xeafff4, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), [0, (ys + 1.6) / 2, 0.2], null, null, { ink: false, shadow: false }).userData.exit = true;
      // carved casing: a lancet ring with an inset moulding and a crest at the apex carrying a glowing Lumen rune
      const ring = (o, i, depth, m, z) => { const sh = lancet(hw + o, ys); sh.holes.push(new THREE.Path(lancet(hw + i, ys).getPoints(60))); return part(D, new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2, curveSegments: 24 }), m, [0, 0, z], null, null, {}); };
      TR.casing = ring(0.75, 0.02, 0.5, toon(0xffffff, pl, { color: 0x9a6a3e }), -0.15); ring(0.42, 0.28, 0.62, woodD, -0.15); ring(1.15, 0.7, 0.35, toon(0xffffff, bark, { color: 0x6a4024 }), -0.25);
      // the threshold: a worn heartwood sill across the foot of the opening, flush with the floor, the leaves and casing standing on it
      TR.sill = part(D, rbox(2 * hw + 1.5, 0.1, 1.0, 0.03), toon(0xffffff, pl, { color: 0x8a5a32 }), [0, 0.0, 0.12], null, null, {}); part(D, rbox(2 * hw + 1.6, 0.06, 0.12, 0.02), woodD, [0, 0.03, 0.66], null, null, { ink: false });
      { const C = new THREE.Group(); C.position.set(0, apex + 0.55, 0.45); D.add(C); TR.crest = C; part(C, new THREE.OctahedronGeometry(0.75, 0), toon(0x8a5c34), null, null, [1, 1.25, 0.35], {}); part(C, new THREE.OctahedronGeometry(0.48, 0), woodD, [0, 0, 0.12], null, [1, 1.25, 0.35], {}); part(C, new THREE.TorusGeometry(0.2, 0.04, 6, 20), new THREE.MeshBasicMaterial({ color: 0x6ff5df }), [0, 0, 0.3], null, null, { ink: false, shadow: false }); part(C, new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xbffff4 }), [0, 0, 0.32], null, null, { ink: false, shadow: false }); }
      // bark lips and roots of the trunk folding round the casing, flaring onto the floor so nothing floats
      { const bm = toon(0xffffff, bark, { color: 0x6e4428 }), rp = prng(77); TR.doorRoots = 0; for (let k = 0; k < 9; k++) { const sd = k % 2 ? 1 : -1, i = Math.floor(k / 2), pts = [], ox = hw + 1.0 + i * 0.55 + rp() * 0.3, top = ys + 1.4 + i * 1.1 + rp() * 0.8; for (let t = 0; t <= 1.0001; t += 0.1) { const y = lerp(-0.1, top, t), x = sd * (ox + Math.sin(t * 3.1 + i) * 0.25 - (t > 0.75 ? (t - 0.75) * 4 * (ox - 0.6) * (k === 8 ? 1 : 0.55) : 0)), z = 0.2 + Math.sin(t * 5 + k) * 0.15; /* (no flared filler at the foot: the roots stand straight into the floor) */ pts.push(V(x, y, z)); } const cu = new THREE.CatmullRomCurve3(pts); const rad = 0.28 + rp() * 0.22; part(D, new THREE.TubeGeometry(cu, 40, rad, 9, false), bm, null, null, null, {}); part(D, new THREE.SphereGeometry(rad, 9, 6), bm, pts[pts.length - 1].toArray(), null, null, { ink: false }); TR.doorRoots++; } }
      // no lanterns: the hall is lit only by the knotholes, the crystal and the veins
      TR.doorLanterns = [];
      // glowing mushrooms and Lumen shards at the door's foot
      { const rp = prng(91), capM = [new THREE.MeshBasicMaterial({ color: 0xb48cff }), new THREE.MeshBasicMaterial({ color: 0x7ff0e0 }), new THREE.MeshBasicMaterial({ color: 0xffb37a })], stM = toon(0xe8dcc0), shM = new THREE.MeshBasicMaterial({ color: 0x5ff2dc, transparent: true, opacity: 0.85 }); for (let k = 0; k < 14; k++) { const sd = k % 2 ? 1 : -1, x = sd * (hw + 0.9 + rp() * 1.8), z = 0.8 + rp() * 1.4, hh = 0.18 + rp() * 0.35; part(D, cyl(0.03, 0.045, hh, 6), stM, [x, hh / 2, z], null, null, { ink: false }); part(D, new THREE.SphereGeometry(0.12 + rp() * 0.1, 10, 6, 0, TAU, 0, Math.PI / 2), capM[k % 3], [x, hh, z], null, [1, 0.6, 1], { ink: false, shadow: false }); }
        for (let k = 0; k < 6; k++) { const sd = k % 2 ? 1 : -1; part(D, new THREE.ConeGeometry(0.12 + rp() * 0.1, 0.5 + rp() * 0.6, 5), shM, [sd * (hw + 0.6 + rp() * 0.8), 0.25, 0.6 + rp() * 0.6], [(rp() - 0.5) * 0.6, 0, (rp() - 0.5) * 0.6], null, { ink: false, shadow: false }); } }
      const dl = new THREE.PointLight(0xfff0d0, 0.8, 18, 1.4); dl.position.set(0, 3, 3.5); D.add(dl); }
    // more life in the hall: roots dangling from the dome with glowing tips, root buttresses flaring from the wall onto the floor, glowing mushroom clusters and
    // Lumen shard clusters round the wall's foot, and fireflies drifting through the air (all outside the walkable ring)
    { const rp = prng(4242), barkL = barkTex(35); barkL.center.set(0.5, 0.5); barkL.rotation = Math.PI / 2; barkL.repeat.set(1, 3); /* the grain runs along each root */ const bm = toon(0xffffff, barkL, { color: 0x6a4228 }), tipM = new THREE.MeshBasicMaterial({ color: 0x7ff6e4 }), D = { hang: 0, butt: 0, mush: 0, shards: 0, lant: 0 };
      for (let k = 0; k < 34; k++) { const a = rp() * TAU, rr = 4 + rp() * (TR.R - 9), y0 = Math.min(TR.H - 4, 14 + (TR.R - rr) * 0.9 + rp() * 4), ln = 3 + rp() * 7, pts = []; for (let t = 0; t <= 1.0001; t += 0.2) pts.push(V(Math.sin(a) * rr + Math.sin(t * 4 + k) * 0.3 * t, y0 - ln * t, Math.cos(a) * rr + Math.cos(t * 3 + k) * 0.3 * t)); const hr = part(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.06 + rp() * 0.08, 5, false), bm, null, null, null, { ink: false, shadow: false }); hr.userData.occU = true; TR.occ.push(hr); part(g, new THREE.SphereGeometry(0.1 + rp() * 0.06, 8, 6), tipM, pts[pts.length - 1].toArray(), null, null, { ink: false, shadow: false }); D.hang++; }
      for (let k = 0; k < 14; k++) { const a = (k + 0.5) / 14 * TAU + (rp() - 0.5) * 0.15; if (trDA(a, 0) < 0.35) continue; const pts = []; for (let t = 0; t <= 1.0001; t += 0.125) { const y = lerp(7 + rp() * 3, 0.05, t), rr = lerp(trWallR(a, 7) - 0.3, TR.RW + 0.5, Math.pow(t, 1.6)); pts.push(V(Math.sin(a + Math.sin(t * 3) * 0.02) * rr, y, Math.cos(a + Math.sin(t * 3) * 0.02) * rr)); } const bu = part(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.55 + rp() * 0.35, 9, false), bm, null, null, null, { ink: false }); bu.userData.occU = true; TR.occ.push(bu); D.butt++; }
      const capM = [new THREE.MeshBasicMaterial({ color: 0xb48cff }), new THREE.MeshBasicMaterial({ color: 0x7ff0e0 }), new THREE.MeshBasicMaterial({ color: 0xffb37a })], stM = toon(0xe8dcc0), shM = new THREE.MeshBasicMaterial({ color: 0x5ff2dc, transparent: true, opacity: 0.85 });
      for (let c = 0; c < 22; c++) { const a = rp() * TAU; if (trDA(a, 0) < 0.25) continue; const rr = TR.RW + 0.6 + rp() * 2.2; for (let k = 0; k < 6; k++) { const b2 = a + (rp() - 0.5) * 0.06, r2 = rr + (rp() - 0.5) * 0.8, x = Math.sin(b2) * r2, z = Math.cos(b2) * r2, hh = 0.15 + rp() * 0.4; part(g, cyl(0.03, 0.05, hh, 6), stM, [x, hh / 2, z], null, null, { ink: false, shadow: false }); part(g, new THREE.SphereGeometry(0.1 + rp() * 0.14, 10, 6, 0, TAU, 0, Math.PI / 2), capM[(c + k) % 3], [x, hh, z], null, [1, 0.6, 1], { ink: false, shadow: false }); } D.mush++; }
      for (let c = 0; c < 12; c++) { const a = rp() * TAU; if (trDA(a, 0) < 0.25) continue; const rr = TR.RW + 1 + rp() * 2; for (let k = 0; k < 5; k++) { const b2 = a + (rp() - 0.5) * 0.05, r2 = rr + (rp() - 0.5) * 0.6, hh = 0.5 + rp() * 1.3; part(g, new THREE.ConeGeometry(0.12 + rp() * 0.14, hh, 5), shM, [Math.sin(b2) * r2, hh / 2 - 0.05, Math.cos(b2) * r2], [(rp() - 0.5) * 0.7, rp() * 3, (rp() - 0.5) * 0.7], null, { ink: false, shadow: false }); } D.shards++; }
      /* (no lanterns in the hall - the knotholes, crystal and veins light it) */
      { const N = 260, mp = []; for (let k = 0; k < N; k++) { const a = rp() * TAU, rr = Math.sqrt(rp()) * (TR.R - 3); mp.push(Math.sin(a) * rr, 0.8 + rp() * 14, Math.cos(a) * rr); } const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(mp, 3)); const ff = new THREE.Points(mg, new THREE.PointsMaterial({ color: 0x9ffff0, size: 0.16, map: cv(32, 32, (x, w, h) => { const gr = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(200,255,245,.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); }), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })); ff.userData.base = mp.slice(); g.add(ff); (TR.motes = TR.motes || []).push(ff); TR.fireflies = ff; }
      TR.detail = D; }
    // dim warm ambience (the scene's daylight rig is turned right down while inside); no lamps - the knotholes, the crystal and the veins light the hall
    { const hl = new THREE.HemisphereLight(0x8a5e3c, 0x120804, 0.62); g.add(hl); const am = new THREE.AmbientLight(0x2a180c, 0.3); g.add(am); }
    return g; }
  function trWalker(x, z, face) { st.gnd = { home: true, tree: true, x, z, y: trHeight(x, z), face, mv: 0, back: 0, cell: 0.3, circR: TR.RW, inb: (px, pz) => Math.hypot(px, pz) <= TR.RW, hy: trHeight, bnd: { X0: -TR.RW, X1: TR.RW, Z0: -TR.RW, Z1: TR.RW }, obs: TR.obs }; }
  function treeLights(on) { if (TR._lit === on) return; TR._lit = on; HM._lit = undefined; for (const o of scene.children) { if (!o.isLight) continue; if (o.userData.base === undefined) o.userData.base = o.intensity; o.intensity = o.userData.base * (on ? 0.08 : 1); } }
  function treeMode(on) { if (!R) return; if (!!on === !!st.tree) return; if (on) { if (st.home) homeMode(false); if (st.ledge) ledgeMode(false); if (!TR.g) { TR.g = makeTree(); scene.add(TR.g); TR.bg = new THREE.Color(0x0e0704); } }
    st.tree = !!on; TR.g.visible = !!on; for (const fl of FLOOR) fl.visible = !on; treeLights(!!on); wrap.classList.toggle('tree', !!on);
    if (on) { TR.bg0 = scene.background; TR.fog0 = scene.fog; scene.background = TR.bg; scene.fog = new THREE.Fog(0x140a05, 26, 70); cam.fov = 50; cam.far = Math.max(cam.far, 200); cam.updateProjectionMatrix(); st.orbT = st.orb; st.orb = TR.orb = { az: 0, el: 0.22, d: 9, tilt: -0.1 }; /* a level opening view down the hall to the crystal and the knotholes */ st.tool = 'pick'; an.eq = { held: 'pick', seq: null, t: 0 }; an.cl = null; an.tv = null; st.play = false; st.pg = null; st.anim = 'idle'; st.yaw = 0; st.yawV = 0; trWalker(0, TR.RW - 0.9, Math.PI); TR.tgt = null; }
    else { scene.background = TR.bg0; scene.fog = TR.fog0 || null; if (st.orbT !== undefined) st.orb = st.orbT; st.gnd = null; if (PGM) PGM.visible = false; cam.fov = 26; cam.updateProjectionMatrix(); } }
  function treeTick(dt) { const t = TR.t = (TR.t || 0) + dt, G = st.gnd; iaTree(); iaTick(dt); if (G && G.hy) G.y += (G.hy(G.x, G.z) - G.y) * (st.paused && !G.mv ? 1 : 1 - Math.exp(-dt * 12));
    const p = 0.86 + 0.13 * Math.sin(t * 0.7); TR.breath = p; /* one slow breath every ~9 s, from inside the stone */ if (TR.crystalLight) TR.crystalLight.intensity = 1.0; if (TR.glow) TR.glow.material.opacity = 0.11; if (TR.crystalU) { TR.crystalU.uT.value = t; TR.crystalU.uP.value = 1; } if (TR.crystalM) TR.crystalM[3].opacity = 0.52; if (TR.floor) TR.floor.material.emissiveIntensity = 0.58; if (TR.daisTop) TR.daisTop.material.emissiveIntensity = 0.42; if (TR.veinM) TR.veinM[0].opacity = 0.56; /* the hall, dais and veins hold a steady glow - the pulse lives only inside the crystal shards */
    for (const mo of TR.motes || []) { const P = mo.geometry.attributes.position, b = mo.userData.base; for (let i = 0; i < P.count; i++) P.setXYZ(i, b[i * 3] + Math.sin(t * 0.3 + i) * 0.25, b[i * 3 + 1] + Math.sin(t * 0.2 + i * 1.7) * 0.3, b[i * 3 + 2] + Math.cos(t * 0.25 + i * 0.7) * 0.25); P.needsUpdate = true; } }
  // tap inside the tree: the door glow -> back outside; anything else -> walk to the floor/dais/step point under the tap
  function treeTap(cx, cy) { cam.updateMatrixWorld(); TR.g.updateMatrixWorld(true); const rc = canvas.getBoundingClientRect(), nd = new THREE.Vector2((cx - rc.left) / rc.width * 2 - 1, -((cy - rc.top) / rc.height) * 2 + 1); _ray.setFromCamera(nd, cam);
    iaTree(); { const fh = _ray.intersectObjects(TR.walk, false), fd = fh.length ? fh[0].distance : 1e9; let bI = null, bd = fd; for (const I of IA.list) { if (I.scene !== 'tree') continue; const hh = _ray.intersectObject(I.obj, true).filter((q) => q.object.isMesh && q.object.visible).concat(I.label.visible ? _ray.intersectObject(I.label) : []); for (const q of hh) if (q.distance < bd) { bd = q.distance; bI = I; } } if (bI) { iaGo(bI); return bI.key === 'tdoor' ? 'exit' : bI.key; } }
    const hits = _ray.intersectObjects(TR.walk, false); let q = hits.length ? hits[0].point : null; if (!q) { const o = _ray.ray.origin, d = _ray.ray.direction; if (d.y > -1e-4) return false; q = o.clone().addScaledVector(d, -o.y / d.y); }
    const G = st.gnd; if (!G) return false; let x = q.x, z = q.z; const L = Math.hypot(x, z); if (L > TR.RW) { x *= TR.RW / L; z *= TR.RW / L; } navTo(G, x, z, () => { st.pg = null; }); pgMark({ x: G.goal.x, z: G.goal.z, y: trHeight(G.goal.x, G.goal.z) }); st.pg = { home: true, tree: true }; return true; }
  function treeScreen(p) { return homeScreen(p); }
  function treeGo(x, z) { const G = st.gnd; if (!G || !G.tree) return null; navTo(G, x, z, () => { st.pg = null; }); st.pg = { home: true, tree: true }; return G.goal; }
  return { CLIMB_LOCK, climbFacFor, climbSpeeds, ONYX_TIER_HEX, makePickaxe, onyxTint, flowLog, flowRate, EXK, CLIMB_EX, DOOR_LANE, makeLedgeDoor: () => makeDoor(), makeLedgeDoorSet: () => { const g = makeDoorSet(); XD.doors.push(g); syncDoorSet(g); return g; }, mapDoorPanel, syncDoors, mapDoorTick, setMapDoorSurf: (f) => { XD.surf = f; }, setMapDoorDest: (f) => { XD.dest = f; }, get mapDoorEnds() { const o = {}; for (const d of XD.doors) { const dr = d.userData.ports ? d : d.children.find((c) => c.userData && c.userData.ports); if (dr && dr.userData.ends) Object.assign(o, dr.userData.ends); } return o; }, get mapDoorOn() { return XD.on; }, get mapDoorBox() { return XD.box; }, IA, iaGo, orbPicker, tetherOrb, tetherOrbClose, tetherSwap, exploreOn, exploreOff, exploreStep, exploreCam, get rig() { return rig; }, get cam() { return cam; }, camPose, freeCam, CAM_FOLLOW,  trInside, trProfile, trWallR, get TR_DZ() { return TR_DZ; }, homeInside, LP, ledgeTap, ledgeScreen, lpF2W, lpW2F, lpMineSpot, orbStrands, orbRefresh, TR, trHeight, treeMode, treeTap, treeGo, treeScreen, globeWeave, globeRoute, openVault, vaultState, VAULT_SECTIONS, SMITH, HMP, mainLinePts, HM, homeMode, setHomeMode, openDoor, enterLedge, doorMenu, twinOf, setStrand, setLine, setHomeStrand, refreshPorts, goOutside, plugPort, unplugPort, unlockPort, homeTap, homeScreen, homeState, setGait, GAIT, navPlan, navTo, pathLen, segClear, wallBase, get FIELD_OBS() { return FIELD_OBS; }, get DMAX() { return DMAX; }, GW, pgGo, pgPick, pgScreen, get pgMarker() { return PGM; }, show, hide, st, LG, ORES, LGRADES, DTIERS, mapDrill, mapDrillTick, makeDrillStand, makeDrillBit, swapDrillBit, setDrillPose, setDrillAngle, drillSockLocal, drillPortWorld, drillPlugLeave, plugLoop, drillAim, drillTipOffset, drillPortUp, countTris, DRILL_ANG, BIT_SPARK, STAND_LOOK, CV_HOOK, PORTS, setOre, setDrillGrade, setLineGrade, setXfer, get ledge() { return LEDGE; }, CLIMB_T: 4 * CL.TS, get rig() { return rig; }, setPick, setTether, setAnim, setTool, setClimb, setClimbDir, tetherAct, CGRADES, makeClimbPick, TGRADES, makeTether, showcase, showcaseTether, showcaseClimb, GRADES, makePickaxe, setYaw: (y) => { st.yaw = y; st.yawV = 0; }, fidget: (k) => { an.fid = k; an.ft = 0; st.fidget = k; an.next = clk + 999; }, advance: (sec, n = 1) => { for (let i = 0; i < n; i++) renderAt(sec); }, sim: (sec, n = 1) => { st.noRender = true; try { for (let i = 0; i < n; i++) renderAt(sec); } finally { st.noRender = false; } } /* tests: step time without drawing (no GPU backlog) */, an };
})();

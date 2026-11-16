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
  let R = null, scene, cam, wrap, canvas, running = false, raf = 0, rig = null, built = {}, tPrev = 0, clk = 0;
  const st = { ok: false, yaw: 0.0, yawV: 0, dist: 4.1, lastInput: 0, fidget: null, frames: 0, sex: 'm' };
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
  const bone = (name, parent, x, y, z) => { const b = new THREE.Object3D(); b.name = name; b.position.set(x, y, z); parent.add(b); return b; };

  /* ---------- palettes (picked from the turnaround sheets) ---------- */
  const PAL = {
    m: { skin: 0xe6b994, blush: 'rgba(240,120,110,.5)', hair: 0x2e211a, iris: '#6a4426', jacket: 0x6e4732, jacketDk: 0x4f3324, shirt: 0xa8916f, pants: 0x6c5b41, patch: 0x55524c, glove: 0x4f3e2e, belt: 0x45301f, boot: 0x684c33, bootDk: 0x45301f, pack: 0x725438, packDk: 0x553c27, helmet: 0x76583c, brass: 0xa8874c, rope: 0x9c7446, sock: 0x7c766a },
    f: { skin: 0xecc2a2, blush: 'rgba(245,125,120,.55)', hair: 0x32231a, iris: '#6b4122', jacket: 0x857150, jacketDk: 0x625234, shirt: 0x58432f, pants: 0x5a4834, patch: 0x5d5c50, glove: 0x45332a, belt: 0x553823, boot: 0x684a32, bootDk: 0x45301f, pack: 0x765a3c, packDk: 0x584029, helmet: 0x7f7356, brass: 0xab8a50, rope: 0x9c7446, sock: 0x6e675a },
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
  /* ---------- Tether: the coiled rope (hip + pack) as a swappable, graded module ---------- */
  const TGRADES = {
    regular: { name: 'Regular', tier: 0, col: 0xa07a48, chip: 0xa07a48 },
    bronze: { name: 'Bronze', tier: 1, col: 0x9a7446, metal: 0xb07f45, chip: 0xb07f45 },
    iron: { name: 'Iron', tier: 2, col: 0x7e6446, metal: 0x7d828a, chip: 0x80858d },
    steel: { name: 'Steel', tier: 3, col: 0x8f99a4, metal: 0xc8d1da, shine: 0xe0e8f0, chip: 0x8e99a6 },
    gold: { name: 'Gold', tier: 4, col: 0xd6a63a, metal: 0xe6b640, shine: 0xfff0b0, chip: 0xe6b640 },
    mithril: { name: 'Mithril', tier: 5, col: 0x8fb6e0, metal: 0xcfe2f4, shine: 0xf0f8ff, chip: 0x93b8de },
    rune: { name: 'Rune', tier: 6, col: 0x3a3442, metal: 0x8f8160, glow: 0xb48cff, chip: 0x8f66ee },
    lumen: { name: 'Lumen', tier: 7, col: 0x7ff4ff, metal: 0x5fd8f0, glow: 0x7ff4ff, chip: 0x7ff4ff },
    onyx: { name: 'Ember Onyx', tier: 8, col: 0x1a161d, metal: 0x2a2228, chip: 0xc8301c, onyx: true },
  };
  function braidTex(col, o = {}) { return cv(256, 32, (g, w, h) => { g.fillStyle = hex(col); g.fillRect(0, 0, w, h); g.strokeStyle = o.dark || 'rgba(30,18,8,.45)'; g.lineWidth = o.lw || 3; for (let x = -h; x < w + h; x += o.step || 10) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + h, h); g.stroke(); if (o.cross) { g.beginPath(); g.moveTo(x + h, 0); g.lineTo(x, h); g.stroke(); } } if (o.hi) { g.strokeStyle = o.hi; g.lineWidth = 1.5; for (let x = 3; x < w + h; x += o.step || 10) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + h, h); g.stroke(); } } }); }
  // o: { R outer loop radius, dr radius step, n loops, tr cord radius, dz loop spacing (local z), sy loop squash, flat (pack spiral) }
  function makeTether(grade, o = {}) { const key = TGRADES[grade] ? grade : 'regular', G = TGRADES[key], T = G.tier, grp = new THREE.Group(); grp.name = 'tether'; grp.userData = { grade: key, fx: [] };
    const R = o.R || 0.058, n = (o.n || 5) + (T === 5 ? 2 : 0), dr = o.dr ?? 0.003, tr = (o.tr || 0.0105) * (T === 3 ? 0.8 : T === 5 ? 0.72 : 1), dz = o.dz ?? 0.006, sy = o.sy || 1;
    let cord; if (T === 7) cord = new THREE.MeshBasicMaterial({ color: G.col }); else if (G.shine) { const tx = braidTex(G.col, { cross: T !== 3, step: T === 3 ? 6 : 8, lw: T === 3 ? 1.5 : 2, hi: 'rgba(255,255,255,.35)' }); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(8, 1); cord = new THREE.MeshPhongMaterial({ map: tx, specular: G.shine, shininess: 60 }); }
    else { const tx = braidTex(G.col, { step: T === 6 || T === 8 ? 14 : 9, dark: T === 8 ? 'rgba(0,0,0,.7)' : undefined }); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(10, 1); cord = toon(0, tx); }
    const loops = []; for (let k = 0; k < n; k++) { const rr = R - k * dr, z = o.flat ? -k * 0.004 : (k - (n - 1) / 2) * dz; loops.push([rr, z]); part(grp, new THREE.TorusGeometry(rr, tr, 7, 34), cord, [0, 0, z], [0, 0, 0.1 * k], [1, sy, 1], { ink: true }); }
    if (o.flat) part(grp, new THREE.CircleGeometry(R - (n - 1) * dr - tr * 0.6, 16), cord, [0, 0, -(n - 1) * 0.004 - 0.003], [0, Math.PI, 0], null, { ink: false });
    const Rin = R - (n - 1) * dr, zA = Math.min(...loops.map((l) => l[1])), zB = Math.max(...loops.map((l) => l[1])), Rm = (R + Rin) / 2, zm = (zA + zB) / 2;
    const metal = G.metal ? (G.shine ? new THREE.MeshPhongMaterial({ color: G.metal, specular: G.shine, shininess: 70 }) : toon(G.metal)) : null;
    const at = (a, rad = R) => V(rad * Math.cos(a), rad * sy * Math.sin(a), zm), basis = (a) => { const rd = V(Math.cos(a), Math.sin(a) * sy, 0).normalize(), tg = V(-Math.sin(a), Math.cos(a) * sy, 0).normalize(); return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(rd, V(0, 0, 1), tg)); };
    // wire wraps / ferrules around the bundle (more with each grade)
    const nb = [0, 2, 2, 6, 6, 7, 7, 8, 8][T]; for (let i = 0; i < nb; i++) { const a = Math.PI * 0.12 + i * TAU / Math.max(nb, 1), m = part(grp, new THREE.TorusGeometry(1, 0.2, 5, 18), T === 8 ? new THREE.MeshBasicMaterial({ color: 0xff4a1c }) : metal, null, null, null, { ink: false }); m.position.copy(at(a, Rm)); m.quaternion.copy(basis(a)); m.scale.set((R - Rin) / 2 + tr + 0.003, (zB - zA) / 2 + tr + 0.003, 0.045); }
    // clasp hanging at the bottom of the coil
    if (T >= 1) { const cg = new THREE.Group(); cg.position.copy(at(-Math.PI / 2, R + tr)); grp.add(cg); const s = o.flat ? 1.4 : 1;
      part(cg, new THREE.TorusGeometry(0.012 * s, 0.0032 * s, 6, 16), metal, [0, -0.01 * s, 0], [0, Math.PI / 2, 0]);
      if (T === 1) part(cg, new THREE.TorusGeometry(0.009 * s, 0.0026 * s, 5, 12, Math.PI * 1.3), metal, [0, -0.028 * s, 0], [0, 0, Math.PI * 0.85]);
      if (T === 2) { for (let k = 0; k < 4; k++) part(cg, new THREE.TorusGeometry(0.0085 * s, 0.0024 * s, 5, 12), metal, [0, (-0.026 - k * 0.012) * s, 0], [0, k % 2 ? Math.PI / 2 : 0, 0], [0.7, 1, 1], { ink: false }); part(cg, new THREE.TorusGeometry(0.011 * s, 0.003 * s, 5, 14, Math.PI * 1.4), metal, [0, -0.085 * s, 0], [0, 0, Math.PI * 0.8]); }
      if (T >= 3) { const cb = part(cg, new THREE.TorusGeometry(0.014 * s, 0.003 * s, 6, 20), metal, [0, -0.034 * s, 0], [0, Math.PI / 2, 0], [1, 1.6, 1]); void cb; part(cg, cyl(0.0022 * s, 0.0022 * s, 0.03 * s, 6), metal, [0, -0.034 * s, 0.011 * s], null, null, { ink: false }); }
      if (T >= 4) for (const sgn of [-1, 1]) part(cg, ell(0.005 * s, 0.005 * s, 0.005 * s, 10, 8), metal, [0, (-0.034 + sgn * 0.024) * s, 0], null, null, { ink: false });
      if (T === 4) part(cg, new THREE.ConeGeometry(0.005 * s, 0.014 * s, 8), metal, [0, -0.07 * s, 0], [Math.PI, 0, 0]);
      if (T === 5) { for (const sgn of [-1, 1]) part(cg, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiral(0, 0, 0.008 * s, 1.3, sgn, 12).map(([x, y]) => V(0.004 * sgn * s, y - 0.034 * s, x))), 24, 0.0012 * s, 4, false), metal, null, null, null, { ink: false }); part(cg, ell(0.005 * s, 0.006 * s, 0.004 * s, 10, 8), toon(0x9fd8ff, null, { emissive: 0x2a6a9a }), [0.006 * s, -0.034 * s, 0], null, null, { ink: false }); }
      if (T >= 6) part(cg, new THREE.OctahedronGeometry(0.008 * s, 0), new THREE.MeshBasicMaterial({ color: T === 8 ? 0xff3a1c : G.glow }), [0, -0.034 * s, 0], null, [1, 1.4, 1], { ink: false }); }
    // rune beads strung on the outer loop
    if (T === 6) { const bm = new THREE.MeshBasicMaterial({ color: 0xc9a2ff }); for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + 0.6 + i * 0.75, m = part(grp, new THREE.OctahedronGeometry(tr * 0.95, 0), bm, null, null, [1, 1.5, 1], { ink: false }); m.position.copy(at(a)); m.position.z = zB + tr * 0.5; }
      const pl = new THREE.PointLight(G.glow, 0.25, 0.5, 2); grp.add(pl); grp.userData.light = pl; }
    // lumen: crystal-thread glow + sparkles
    if (T === 7) { const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: radial('rgba(120,240,255,.45)', 'rgba(90,220,255,.12)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); gl.scale.set(R * 4, R * 4 * sy, 1); grp.add(gl); grp.userData.glow = gl;
      const pl = new THREE.PointLight(G.glow, 0.35, 0.7, 2); grp.add(pl); grp.userData.light = pl; const rr = prng(71), sp = [], seed = [];
      for (let i = 0; i < 26; i++) { const a = rr() * TAU, p = at(a, Rin + (R - Rin) * rr()); sp.push(p.x + (rr() - 0.5) * 0.02, p.y + (rr() - 0.5) * 0.02, p.z + (rr() - 0.5) * 0.03); seed.push(rr()); }
      const sgm = new THREE.BufferGeometry(); sgm.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); sgm.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1)); const spk = new THREE.Points(sgm, SPARK_MAT(G.glow)); spk.frustumCulled = false; spk.renderOrder = 5; grp.add(spk); grp.userData.fx.push(spk); }
    if (T === 7) { const cm = new THREE.MeshPhongMaterial({ color: 0x8ff6ff, emissive: 0x1d93ad, specular: 0xffffff, shininess: 90, flatShading: true }); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.2, m = part(grp, new THREE.OctahedronGeometry(1, 0), cm, null, null, [tr * 0.7, tr * 1.8, tr * 0.7], { ink: false }); m.position.copy(at(a, R + tr * 0.6)); m.rotation.z = a - Math.PI / 2; } }
    if (T === 8) { const em = new THREE.MeshBasicMaterial({ color: 0xff6a24 }); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.35, m = part(grp, new THREE.OctahedronGeometry(tr * 0.6, 0), em, null, null, null, { ink: false }); m.position.copy(at(a, R)); m.position.z = (o.flat ? 0 : zB) + tr * 0.7; } }
    // ember onyx: a red-hot vein wound through the outer loop, little flames licking off it
    if (T === 8) { const vm = new THREE.MeshBasicMaterial({ color: 0xff3418 }); grp.userData.veins = vm; const vp = []; for (let i = 0; i <= 80; i++) { const a = i / 80 * TAU, p = at(a, R), w = a * 9; vp.push(V(p.x + Math.cos(a) * Math.cos(w) * tr * 0.95, p.y + Math.sin(a) * sy * Math.cos(w) * tr * 0.95, (o.flat ? 0 : zB) + Math.sin(w) * tr * 0.95)); }
      part(grp, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(vp, true), 160, tr * 0.22, 4, true), vm, null, null, null, { ink: false });
      const sites = []; for (let i = 0; i < 40; i++) { const a = i / 40 * TAU, p = at(a, R + tr * 0.7); sites.push([p, V(Math.cos(a), Math.sin(a), 0.3).normalize()]); } const fl = flamePoints(sites); grp.add(fl); grp.userData.fx.push(fl); grp.userData.flames = fl; }
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
    { const HL = F ? { y: 0.05, z: -0.022, rx: -0.3, r0: 0.148, ds: 1.04, bw: 0.02, bwb: 0.03, droop: 0.02, lampT: -0.5, gog: [0.1, 0.7], gs: 1.42, ls: 1.05, gy: -0.003, bf: 0.068, bb: 0.03, buck: 0.95 }
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
    else { part(B.chest, new THREE.TorusGeometry(0.094, 0.038, 10, 28), M.jacket, [0, 0.15, -0.035], [Math.PI / 2 + 0.3, 0, 0], [1.12, 0.9, 1]); for (const s of [-1, 1]) part(B.chest, ell(0.05, 0.06, 0.05), M.jacket, [s * 0.1, 0.16, 0.0], [0.2, 0, s * 0.4]);
      part(B.chest, new THREE.SphereGeometry(1, 22, 14, 0, TAU, 0, Math.PI * 0.55), M.jacket, [0, 0.135, -0.1], [-1.9, 0, 0], [0.15, 0.13, 0.12]); part(B.chest, ell(0.1, 0.05, 0.035), M.jacketDk, [0, 0.19, -0.165], [0.5, 0, 0]); }
    for (const s of F ? [-1, 1] : [1]) { const x = s * (F ? 0.082 : 0.085), y = F ? 0.0 : 0.02; part(B.chest, rbox(0.058, 0.064, 0.014, 0.006), M.jacket, [x, y, 0.118], [-0.12, s * 0.3, 0]); part(B.chest, rbox(0.064, 0.026, 0.018, 0.006), M.jacketDk, [x, y + 0.034, 0.121], [-0.05, s * 0.3, 0]); part(B.chest, rbox(0.01, 0.01, 0.006, 0.002), M.brass, [x, y + 0.028, 0.131], null, null, { ink: false }); }
    // pockets with flaps (on the spine so they ride the lower jacket)
    for (const s of [-1, 1]) { const y = F ? -0.075 : -0.05, z = F ? 0.1 : 0.094; part(B.spine, rbox(0.078, 0.075, 0.016, 0.008), M.jacket, [s * 0.097, y, z], [0, s * 0.62, 0]); part(B.spine, rbox(0.084, 0.028, 0.02, 0.008), M.jacketDk, [s * 0.099, y + 0.035, z + 0.004], [0.08, s * 0.62, 0]); }
    // ---- belt, buckle, pouches, rope ----
    part(B.hips, new THREE.TorusGeometry(0.127, 0.02, 8, 36), M.belt, [0, 0.085, 0.002], [Math.PI / 2, 0, 0], [1, 0.76, 1.3]);
    part(B.hips, rbox(0.05, 0.04, 0.012, 0.004), M.brass, [0, 0.085, 0.1]); part(B.hips, rbox(0.03, 0.022, 0.014, 0.003), M.belt, [0, 0.085, 0.103]);
    for (const [px0, pz0, ry0] of F ? [[-0.075, 0.112, -0.38], [0.075, 0.112, 0.38]] : [[-0.07, 0.114, -0.36], [-0.122, 0.085, -0.85]]) { const pz = part(B.hips, rbox(0.052, 0.066, 0.034, 0.01), M.belt, [px0, 0.05, pz0], [0, ry0, 0]); part(pz, rbox(0.055, 0.026, 0.038, 0.008), M.packDk, [0, 0.026, 0.002]); part(pz, rbox(0.012, 0.012, 0.006, 0.002), M.brass, [0, 0.018, 0.022], null, null, { ink: false }); }
    { const pv = F ? bone('ropePivot', B.hips, -0.15, 0.06, 0.03) : bone('ropePivot', B.hips, 0.142, 0.05, 0.07), ry = F ? Math.PI / 2 : 1.05; built.rope = { b: pv, ax: 0, az: 0, vx: 0, vz: 0 }; built.tethers = []; const tg = { parent: pv, pos: F ? [-0.012, -0.068, 0] : [0.01, -0.088, 0], rot: [0, ry, 0.08], o: { R: 0.058, n: 5, dr: 0.003, tr: 0.0105, dz: 0.0065, sy: 1.75 } }; built.tethers.push(tg); mountTether(tg, S && S.tetherGrade); }
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
      part(ft, rbox(0.1, 0.085, 0.2, 0.038), M.boot, [0, -0.03, 0.045]); part(ft, rbox(0.106, 0.024, 0.212, 0.01), M.bootDk, [0, -0.07, 0.046]); part(ft, rbox(0.04, 0.03, 0.09, 0.012), M.bootLace, [0, 0.01, 0.07], [0.5, 0, 0], null, { ink: false }); }
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
    { const pk = new THREE.Group(); pk.position.set(0, -0.02, -0.095); B.chest.add(pk); built.pack = pk;
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
      // side pockets
      for (const s of F ? [-1, 1] : [1]) { part(pk, rbox(0.06, H * 0.42, D * 0.66, 0.02), M.pack, [s * (W / 2 + 0.024), y0 - H * 0.18, zc]); part(pk, rbox(0.068, H * 0.11, D * 0.7, 0.016), M.packDk, [s * (W / 2 + 0.026), y0 - H * 0.0, zc], [0, 0, s * -0.08]); part(pk, rbox(0.008, H * 0.2, 0.02, 0.003), M.belt, [s * (W / 2 + 0.056), y0 - H * 0.14, zc]); }
      // shoulder straps (wide, padded, buckled at the chest) and a sternum strap
      for (const s of [-1, 1]) { part(B.chest, tube([[s * 0.094, -0.1, 0.092], [s * 0.098, 0.0, 0.106], [s * 0.103, 0.1, 0.102], [s * 0.108, 0.158, 0.03], [s * 0.098, 0.14, -0.1], [s * 0.088, 0.07, -0.13]], 0.012, 6, 24), M.packDk, null, null, [1.25, 1, 0.62]);
        part(B.chest, rbox(0.032, 0.024, 0.012, 0.003), M.brass, [s * 0.096, -0.02, 0.105], null, null, { ink: false }); part(B.chest, tube([[s * 0.094, -0.1, 0.09], [s * 0.11, -0.2, 0.05], [s * 0.13, -0.25, -0.06]], 0.008, 5, 10), M.packDk, null, null, [1, 1, 0.7]); }
      if (F) part(B.chest, rbox(0.17, 0.016, 0.008, 0.003), M.packDk, [0, 0.05, 0.108]);
      if (!F) { // rope coil on the right side, bedroll strapped across the top
        const cx0 = -(W / 2 + 0.04); { const tg = { parent: pk, pos: [cx0, y0 + H * 0.06, zc], rot: [0, Math.PI / 2, 0], o: { R: 0.105, n: 6, dr: 0.013, tr: 0.015, flat: true } }; built.tethers.push(tg); mountTether(tg, S && S.tetherGrade); }
        part(pk, new THREE.TorusGeometry(0.06, 0.007, 5, 16), M.belt, [cx0 + 0.01, y0 + H * 0.06, zc], [0, 0, 0], [1, 1.9, 0.6]);
        const by = y0 - H / 2 - 0.045; part(pk, cyl(0.052, 0.052, W * 1.06, 22), M.packDk, [0, by, zc + 0.005], [0, 0, Math.PI / 2]); const sp = toon(0, spiralTex(P.packDk)); for (const s of [-1, 1]) part(pk, new THREE.CircleGeometry(0.051, 22), sp, [s * W * 0.531, by, zc + 0.005], [0, s * Math.PI / 2, 0], null, { ink: false });
        for (const s of [-1, 1]) part(pk, new THREE.TorusGeometry(0.054, 0.008, 6, 20), M.belt, [s * W * 0.3, by, zc + 0.005], [0, Math.PI / 2, 0]); }
      else { const ry = y0 - H / 2 - 0.055; part(pk, cyl(0.068, 0.068, W * 1.12, 22), M.packDk, [0, ry, zc - 0.005], [0, 0, Math.PI / 2]); const sp = toon(0, spiralTex(P.packDk)); for (const s of [-1, 1]) part(pk, new THREE.CircleGeometry(0.067, 22), sp, [s * W * 0.561, ry, zc - 0.005], [0, s * Math.PI / 2, 0], null, { ink: false });
        for (const s of [-1, 1]) part(pk, new THREE.TorusGeometry(0.07, 0.008, 6, 20), M.belt, [s * W * 0.3, ry, zc - 0.005], [0, Math.PI / 2, 0]);
        // the lantern on its ring, swinging off the left side of the pack
        const pv = bone('lanternPivot', pk, W / 2 + 0.07, y0 + 0.01, zc + 0.03); built.lantern = { b: pv, ax: 0, az: 0, vx: 0, vz: 0 }; part(pv, new THREE.TorusGeometry(0.014, 0.003, 5, 12), M.dark, [0, -0.01, 0], [0, Math.PI / 2, 0]);
        const L = new THREE.Group(); L.position.y = -0.09; pv.add(L); part(L, new THREE.ConeGeometry(0.038, 0.035, 8), M.dark, [0, 0.055, 0]); part(L, cyl(0.036, 0.036, 0.016, 10), M.dark, [0, -0.05, 0]); part(L, cyl(0.03, 0.03, 0.01, 10), M.dark, [0, 0.035, 0]);
        for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + 0.4; part(L, cyl(0.003, 0.003, 0.085, 4), M.dark, [Math.cos(a) * 0.031, -0.005, Math.sin(a) * 0.031], null, null, { ink: false }); }
        built.lanternCore = new THREE.MeshBasicMaterial({ color: 0xffc46a }); const core = new THREE.Mesh(cyl(0.024, 0.024, 0.075, 12), built.lanternCore); core.position.y = -0.005; L.add(core);
        const lg = new THREE.Sprite(new THREE.SpriteMaterial({ map: radial('rgba(255,210,120,1)', 'rgba(255,150,60,.35)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); lg.scale.set(0.3, 0.3, 1); L.add(lg); built.lanternGlow = lg;
        const pl = new THREE.PointLight(0xffb060, 0.5, 0.9, 2); L.add(pl); built.lanternLight = pl; } }
    // ---- pickaxe: a logical mount on the chest (what the fidgets move) + the swappable visual pick parented to the right hand ----
    { const mt = new THREE.Object3D(); mt.name = 'pickMount'; B.chest.add(mt); built.mount = mt; built.pick = makePickaxe(S && S.pickGrade); B.hdR.add(built.pick); }
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
    f: { K: 0.0023, xref: 730.4, rows: [[0.132, 0, -0.012, -0.012], [0.12, 0.058, 0.05, -0.078], [0.1, 0.085, 0.078, -0.106], [0.07, 0.1, 0.095, -0.12], [0.04, 0.106, 0.103, -0.125], [0.01, 0.106, 0.104, -0.124], [-0.015, 0.104, 0.1, -0.121], [-0.03, 0.101, 0.096, -0.117], [-0.045, 0.097, 0.097, -0.108], [-0.053, 0.094, 0.098, -0.096], [-0.065, 0.087, 0.099, -0.064], [-0.085, 0.077, 0.104, -0.028], [-0.1, 0.067, 0.1, -0.005], [-0.114, 0.052, 0.092, 0.02], [-0.128, 0.034, 0.087, 0.048], [-0.137, 0.02, 0.084, 0.068], [-0.144, 0.009, 0.082, 0.077], [-0.149, 0, 0.08, 0.08]],
      nose: [[-0.022, 0], [-0.032, 0.002], [-0.043, 0.0045], [-0.053, 0.0095], [-0.061, 0.0165], [-0.066, 0.02], [-0.071, 0.0135], [-0.077, 0.004], [-0.082, 0]], lips: [-0.088, 0.0055], relief: { eye: [0.053, -0.028], ck: 0.8 }, ear: [-0.047, -0.052],
      eyesF: [[-40.6, -16.5, -8.8, 11], [14.4, 35.5, -11.3, 7.6]], pe: 179.4, skin: '#d6a784' } };
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
      const F = c.sex === 'f', d = (F ? V(0.625, 0.404, -0.673) : V(0.14, 0.58, -0.8)).normalize(), bl = F ? V(0, 1, 0).addScaledVector(d, -d.y).normalize() : V(-1, 0.8, 0).addScaledVector(d, -V(-1, 0.8, 0).dot(d)).normalize(), x = V(0, 0, 0).crossVectors(d, bl); _m.makeBasis(bl, d, x.negate()); mt.quaternion.setFromRotationMatrix(_m); mt.position.copy(F ? V(-0.2, 0.09, 0.1) : V(-0.21, 0.075, 0.12)); c.gripAt = F ? 0.0 : 0.08; }
    c.pickRest = { p: mt.position.clone(), q: mt.quaternion.clone() }; c.restQ = {}; for (const k in B) if (B[k] && B[k].isObject3D) c.restQ[k] = B[k].quaternion.clone(); }
  const PALM = V(0, -0.045, -0.031);
  function solveLimbs(c, f) { const { B } = c, root = c.root; root.updateMatrixWorld(true);
    // legs: feet planted on their ankle targets, knees forward
    const fwd = V(0, 0, 1).applyQuaternion(root.quaternion);
    for (const k of ['R', 'L']) { const a = c.ankle[k].clone(); if (k === 'R' && f.tap) { a.y += f.tap * 0.05; a.z += f.tap * 0.015; } ik(B['th' + k], B['sn' + k], c.LT, c.LS, root.localToWorld(a), fwd.clone().add(V(0, 0.2, 0)), false);
      B['ft' + k].parent.getWorldQuaternion(_q2); _q.setFromEuler(new THREE.Euler(f.tap && k === 'R' ? -f.tap * 0.7 : 0, (k === 'R' ? -0.14 : 0.16), 0)); _q.premultiply(root.quaternion); B['ft' + k].quaternion.copy(_q2.invert().multiply(_q)); }
    // right arm: the wrist is placed so the palm closes round the pick grip; hand x runs along the handle, y back to the elbow (no broken wrist)
    const mt = c.built.mount; mt.updateMatrixWorld(true); const grip = mt.getWorldPosition(V(0, 0, 0)), Qm = mt.getWorldQuaternion(new THREE.Quaternion()), d = V(0, 1, 0).applyQuaternion(Qm), pole = V(-0.3, -1, -0.15).applyQuaternion(root.quaternion), Qh = new THREE.Quaternion(); let wrist = grip.clone();
    for (let it = 0; it < 3; it++) { ik(B.uaR, B.faR, 0.245, 0.215, wrist, pole, false); const y = B.faR.getWorldPosition(V(0, 0, 0)).sub(wrist).normalize(); y.addScaledVector(d, -y.dot(d)).normalize(); const z = V(0, 0, 0).crossVectors(d, y); _m.makeBasis(d, y, z); Qh.setFromRotationMatrix(_m); wrist = grip.clone().sub(PALM.clone().applyQuaternion(Qh)); }
    B.hdR.parent.getWorldQuaternion(_q2); B.hdR.quaternion.copy(_q2.invert().multiply(Qh)); B.hdR.updateMatrixWorld(true);
    const pk = c.built.pick; pk.position.copy(B.hdR.worldToLocal(grip.clone().addScaledVector(d, -(c.gripAt || 0)))); pk.quaternion.copy(Qh.clone().invert().multiply(Qm));
    B.knR.rotation.x = 1.3; B.tpR.rotation.x = 1.25; B.thumbR.rotation.set(1.05, 0, -0.35);
    // left arm: hangs relaxed (palm toward the thigh, thumb forward, elbow straight back so the upper arm has no twist), or reaches up so the
    // finger tips scratch the cheek (elbow swinging down and out, palm toward the face). Hand frame: -y = finger direction, +z = the back of the hand.
    const sh = B.shL.getWorldPosition(V(0, 0, 0)), RQ = root.quaternion, r = f.reach || 0; let wristL = sh.clone().add(V(0.06, -0.445, 0.03).applyQuaternion(RQ));
    let pole2 = V(0.12, -0.05, -1).applyQuaternion(RQ), Qsc = null;
    if (r) { B.headC.updateMatrixWorld(true); const w = Math.sin(f.scr || 0), hcW = B.headC.getWorldPosition(V(0, 0, 0));
      // treat forearm + hand as one straight segment to the finger tips (no bent wrist), elbow swung down and out
      const tip = B.headC.localToWorld(V(0.084, -0.066 + 0.007 * w, 0.06)), Lf = 0.215 + 0.1, S = sh.clone(), D = tip.clone().sub(S), dd = clamp(D.length(), 0.05, (0.245 + Lf) * 0.999), dir = D.normalize();
      const pp = V(1.1, -1.0, 0.25).applyQuaternion(RQ), pn = pp.addScaledVector(dir, -pp.dot(dir)).normalize(), cA = clamp((0.245 * 0.245 + dd * dd - Lf * Lf) / (2 * 0.245 * dd), -1, 1);
      const E = S.clone().addScaledVector(dir, 0.245 * cA).addScaledVector(pn, 0.245 * Math.sqrt(1 - cA * cA)), fd = tip.clone().sub(E).normalize(), ws = E.clone().addScaledVector(fd, 0.215 + 0.008 * w);
      wristL.lerp(ws, r); pole2.lerp(E.clone().sub(S.clone().lerp(ws, 0.5)), r);
      const yv = fd.clone().negate(), zv = ws.clone().sub(hcW); zv.addScaledVector(yv, -zv.dot(yv)).normalize(); _m.makeBasis(V(0, 0, 0).crossVectors(yv, zv), yv, zv); Qsc = new THREE.Quaternion().setFromRotationMatrix(_m); }
    if (f.sighDrop) wristL.y -= f.sighDrop * 0.015; ik(B.uaL, B.faL, 0.245, 0.215, wristL, pole2, false);
    { const y = B.faL.getWorldPosition(V(0, 0, 0)).sub(B.hdL.getWorldPosition(V(0, 0, 0))).normalize(), z = V(1, 0, 0.18).applyQuaternion(RQ); z.addScaledVector(y, -z.dot(y)).normalize(); _m.makeBasis(V(0, 0, 0).crossVectors(y, z), y, z);
      const Qr = new THREE.Quaternion().setFromRotationMatrix(_m).multiply(_q.setFromEuler(new THREE.Euler(-0.12, 0, 0.06))); if (Qsc) Qr.slerp(Qsc, ss(0, 0.85, r));
      B.hdL.parent.getWorldQuaternion(_q2); B.hdL.quaternion.copy(_q2.invert().multiply(Qr)); }
    B.knL.rotation.x = lerp(0.32, 0.8 + 0.35 * Math.sin(f.scr || 0), r); B.tpL.rotation.x = lerp(0.42, 0.6 + 0.3 * Math.sin((f.scr || 0) + 1), r); B.thumbL.rotation.set(0.35, 0, 0.6); }

  /* ---------- animation: layered idle + fidgets + secondary motion ---------- */
  const FIDGETS = ['shift', 'scratch', 'tap', 'pick', 'glance', 'sigh'];
  const DUR = { shift: 3.4, scratch: 2.8, tap: 2.4, pick: 2.2, glance: 2.6, sigh: 2.6 };
  const an = { next: 3, blinkAt: 1.5, blink: 0, lookT: 0, look: [0, 0], lookTo: [0, 0], dartT: 0, dart: [0, 0], dartTo: [0, 0], fid: null, ft: 0, prev: null, last: '' };
  function pickFidget(now) { const idle = now - st.lastInput > 20; let k; do k = FIDGETS[(Math.random() * FIDGETS.length) | 0]; while (k === an.last); an.last = k; an.fid = k; an.ft = 0; st.fidget = k; an.next = now + (idle ? 2.5 + Math.random() * 2.5 : 4 + Math.random() * 6) + DUR[k]; }
  function pend(o, ax, az, dt, k = 38, c = 4.5) { // damped pendulum driven by the parent's acceleration (character space)
    o.vx += (-k * o.ax - c * o.vx + ax) * dt; o.vz += (-k * o.az - c * o.vz + az) * dt; o.ax += o.vx * dt; o.az += o.vz * dt; o.ax = clamp(o.ax, -0.9, 0.9); o.az = clamp(o.az, -0.9, 0.9); }
  function animate(c, t, dt) { const { B } = c, f = {}; const fid = an.fid, u = fid ? an.ft / DUR[fid] : 0, env = fid ? ss(0, 0.18, u) * ss(1, 0.78, u) : 0;
    if (fid) { an.ft += dt; if (an.ft >= DUR[fid]) { an.fid = null; st.fidget = null; } } if (t > an.next && !an.fid && !st.calm) pickFidget(t);
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
    if (fid === 'sigh') { const s1 = Math.sin(Math.PI * ss(0.05, 0.45, u)), s2 = Math.sin(Math.PI * ss(0.4, 0.95, u)); cx += 0.085 * s1 - 0.08 * s2; shY += 0.03 * s1 - 0.04 * s2; nrx += 0.14 * s2; hrx += 0.15 * s2; hy -= 0.012 * s2; f.sighDrop = s2; }
    // apply: hips, spine, chest, neck, head
    const E = (k, x, y, z) => { B[k].quaternion.copy(c.restQ[k]).multiply(_q.setFromEuler(new THREE.Euler(x, y, z))); };
    B.hips.position.set(hx, c.HY + hy - 0.004 * Math.abs(sway), hz); E('hips', 0, 0, hrz); E('spine', cx * 0.4, cry * 0.4, -hrz * 0.6 + crz * 0.3); E('chest', cx, cry, crz); B.chest.scale.set(1 + 0.008 * br, 1 + 0.006 * br, 1 + 0.012 * br);
    E('neck', nrx + hrx * 0.3, hry * 0.35, hrzH * 0.4); E('head', hrx * 0.7, hry * 0.65, hrzH * 0.6 - crz * 0.4);
    for (const k of ['shR', 'shL']) B[k].position.y = 0.085 + shY; B.shR.rotation.z = -shY * 2; B.shL.rotation.z = shY * 2;
    // pickaxe rides on the chest; the adjust fidget lifts and resettles it
    const px = c.built.mount; px.position.copy(c.pickRest.p).add(V(0, pickY, 0)); px.quaternion.copy(c.pickRest.q).premultiply(_q.setFromEuler(new THREE.Euler(pickRx, 0, 0)));
    solveLimbs(c, f);
    // blinks (random, sometimes double), held shut through a sigh
    if (t > an.blinkAt) { an.blink = 0.0001; an.blinkAt = t + 2 + Math.random() * 3.8; if (Math.random() < 0.2) an.dbl = true; }
    let lid = 1; if (an.blink > 0) { an.blink += dt; const b = an.blink / 0.16; lid = b < 0.5 ? 1 - b * 2 : (b - 0.5) * 2; if (b >= 1) { an.blink = an.dbl ? -0.12 : 0; an.dbl = false; } } else if (an.blink < 0) { an.blink += dt; if (an.blink >= 0) an.blink = 0.0001; }
    if (fid === 'sigh') lid = Math.min(lid, 1 - 0.85 * Math.sin(Math.PI * ss(0.45, 0.85, u))); setFace(built, clamp(1 - lid, 0, 1)); if (built.face) built.face.uD.value.set(an.dart[0], an.dart[1]);
    updatePickFx(built.pick, t); if (showPick) updatePickFx(showPick, t); for (const tg of built.tethers || []) updatePickFx(tg.grp, t);
    // secondary motion: braid, rope and lantern swing with inertia (driven by their anchors' acceleration)
    c.root.updateMatrixWorld(true); const sec = (o, anchor, gain, k, cdamp) => { const p = anchor.getWorldPosition(V(0, 0, 0)); c.root.worldToLocal(p); if (!o.p) { o.p = p.clone(); o.v = V(0, 0, 0); }
      const v = p.clone().sub(o.p).divideScalar(Math.max(dt, 1e-3)), a = v.clone().sub(o.v).divideScalar(Math.max(dt, 1e-3)); o.p.copy(p); o.v.copy(v); a.clampLength(0, 30); pend(o, a.z * gain + (st.yawV || 0) * 0.0, -a.x * gain, dt, k, cdamp); };
    if (built.braid.length) { const hb = built.braid[0].b; sec(built.braid[0], hb.parent, 1.4, 30, 3.2); const head = B.head.getWorldQuaternion(new THREE.Quaternion()), eu = new THREE.Euler().setFromQuaternion(head.premultiply(c.root.quaternion.clone().invert()));
      built.braid.forEach((L, i) => { if (i) { const P2 = built.braid[i - 1]; L.ax += (P2.ax * 0.8 - L.ax) * Math.min(1, dt * 9); L.az += (P2.az * 0.8 - L.az) * Math.min(1, dt * 9); } L.b.rotation.x = L.rx + L.ax * (i ? 0.35 : 1) - (i ? 0 : eu.x * 0.8) + 0.03 * Math.sin(t * 1.3 + i * 0.5) * 0.3; L.b.rotation.z = L.az * (i ? 0.35 : 1) - (i ? 0 : eu.z * 0.8); }); }
    if (built.rope) { sec(built.rope, B.hips, 1.2, 40, 4); built.rope.b.rotation.set(built.rope.ax, 0, built.rope.az); }
    if (built.lantern) { sec(built.lantern, built.pack, 1.6, 26, 2.6); built.lantern.b.rotation.set(built.lantern.ax, 0, built.lantern.az); const fl = 0.85 + 0.1 * Math.sin(t * 9) + 0.05 * Math.sin(t * 23); built.lanternGlow.material.opacity = 0.75 * fl; built.lanternLight.intensity = 0.5 * fl; }
  }

  /* ---------- stage, camera, input ---------- */
  function initGL() { wrap = document.getElementById('charWrap'); canvas = document.getElementById('charCanvas');
    try { R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false }); } catch (e) { st.ok = false; return false; }
    R.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap; R.outputEncoding = THREE.LinearEncoding;
    scene = new THREE.Scene(); scene.background = cv(8, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f6e7cc'); gr.addColorStop(0.55, '#e9c99a'); gr.addColorStop(1, '#b9814f'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    cam = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
    scene.add(new THREE.HemisphereLight(0xfff1dc, 0x7a5236, 0.4));
    const key = new THREE.DirectionalLight(0xfff0dc, 0.55); key.position.set(1.4, 3.2, 2.6); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -1.2, right: 1.2, top: 2, bottom: -0.4, near: 0.5, far: 8 }); key.shadow.bias = -0.0008; key.shadow.radius = 4; scene.add(key);
    const fill = new THREE.DirectionalLight(0xffd8b0, 0.14); fill.position.set(-2.2, 1.2, 1.4); scene.add(fill);
    const rim1 = new THREE.DirectionalLight(0xffe6c0, 0.32); rim1.position.set(-1.6, 2.2, -2.6); scene.add(rim1); const rim2 = new THREE.DirectionalLight(0xfff0d8, 0.22); rim2.position.set(1.8, 1.6, -2.2); scene.add(rim2);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.25, 64), new THREE.MeshBasicMaterial({ map: radial('rgba(255,236,205,1)', 'rgba(222,178,128,.9)'), transparent: true, depthWrite: false })); disc.rotation.x = -Math.PI / 2; scene.add(disc);
    const sh = new THREE.Mesh(new THREE.CircleGeometry(1.0, 48), new THREE.ShadowMaterial({ opacity: 0.32, color: 0x4a2a14 })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.002; sh.receiveShadow = true; scene.add(sh);
    const blob = new THREE.Mesh(new THREE.CircleGeometry(0.34, 32), new THREE.MeshBasicMaterial({ map: radial('rgba(70,40,20,.45)', 'rgba(70,40,20,.15)'), transparent: true, depthWrite: false })); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.003; scene.add(blob);
    bindInput(); st.ok = true; return true; }
  function setChar(sex) { if (rig && rig.sex === sex) return; if (rig) { scene.remove(rig.root); rig.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); } built = {}; rig = build(sex); scene.add(rig.root); setup(rig); for (const k in an) if (k === 'next') an.next = clk + 2.5; st.sex = sex;
    document.querySelectorAll('#charSex [data-sex]').forEach((b) => b.classList.toggle('on', b.dataset.sex === sex)); markPick(); }
  // showcase: one pickaxe alone on the stage (for previews / screenshots)
  let showPick = null;
  function showcase(g, rz = 0.55) { if (showPick) { scene.remove(showPick.parent); showPick = null; } if (rig) rig.root.visible = !g; if (!g) return; const grp = new THREE.Group(), pk = makePickaxe(g); grp.add(pk); pk.rotation.z = rz; grp.position.set(Math.sin(rz) * 0.68, 1.16 - Math.cos(rz) * 0.68, 0); scene.add(grp); showPick = pk; }
  function showcaseTether(g) { if (showPick) { scene.remove(showPick.parent); showPick = null; } if (rig) rig.root.visible = !g; if (!g) return; const grp = new THREE.Group(), t = makeTether(g, { R: 0.1, n: 6, dr: 0.004, tr: 0.016, dz: 0.011, sy: 1.25 }); grp.add(t); t.rotation.set(0.15, 0.45, 0); grp.position.set(0, 1.3, 0); scene.add(grp); showPick = t; }
  // swap the pickaxe module in the right hand (keeps its current pose)
  function setPick(g) { if (!rig) return; const b = rig.built, old = b.pick; b.pick = makePickaxe(g); b.pick.position.copy(old.position); b.pick.quaternion.copy(old.quaternion); old.parent.add(b.pick); old.parent.remove(old); old.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); markPick(); }
  function setTether(g) { if (!rig) return; for (const tg of rig.built.tethers || []) mountTether(tg, g); markPick(); }
  let gear = 'pick';
  function markPick() { const cp = document.getElementById('charPick'); if (!cp) return; const T = gear === 'pick' ? GRADES : TGRADES, cur = gear === 'pick' ? (rig ? rig.built.pick.userData.grade : S.pickGrade) : (rig && rig.built.tethers ? rig.built.tethers[0].grp.userData.grade : S.tetherGrade || 'regular');
    cp.innerHTML = `<span class="gear" role="tablist"><button data-gear="pick" title="Pickaxe" aria-label="Pickaxe" class="${gear === 'pick' ? 'on' : ''}">⛏️</button><button data-gear="tether" title="Tether" aria-label="Tether" class="${gear === 'tether' ? 'on' : ''}">🪢</button></span>` + Object.entries(T).map(([k, G]) => `<button data-grade="${k}" title="${G.name}" class="${k === cur ? 'on' : ''}"><i style="background:${hex(G.chip || (G.runes ? G.glow : G.head))}"></i><span>${G.name}</span></button>`).join(''); }
  function bindInput() { const pts = new Map(); let pinch0 = 0, dist0 = 0;
    canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); st.lastInput = clk; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); dist0 = st.dist; } });
    canvas.addEventListener('pointermove', (e) => { if (!pts.has(e.pointerId)) return; const pr = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); st.lastInput = clk;
      if (pts.size === 1) { const dx = e.clientX - pr[0]; st.yaw += dx * 0.011; st.yawV = dx * 0.011 / 0.016; } else if (pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch0 > 0) st.dist = clamp(dist0 * pinch0 / d, 2.0, 5.6); } });
    const up = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch0 = 0; }; canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); st.dist = clamp(st.dist * Math.exp(e.deltaY * 0.0012), 2.0, 5.6); st.lastInput = clk; }, { passive: false });
    const cp = document.getElementById('charPick'); if (cp) { markPick();
      cp.addEventListener('click', (e) => { const gb = e.target.closest('[data-gear]'); if (gb) { gear = gb.dataset.gear; markPick(); return; } const b = e.target.closest('[data-grade]'); if (!b) return; if (gear === 'pick') { S.pickGrade = b.dataset.grade; setPick(S.pickGrade); } else { S.tetherGrade = b.dataset.grade; setTether(S.tetherGrade); } if (typeof save === 'function') save(); st.lastInput = clk; }); }
    document.getElementById('charSex').addEventListener('click', (e) => { const b = e.target.closest('[data-sex]'); if (!b) return; S.charSex = b.dataset.sex; setChar(S.charSex); if (typeof save === 'function') save(); st.lastInput = clk; });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (st.visible) start(); }); }
  function resize() { const w = wrap.clientWidth || 390, h = wrap.clientHeight || 600; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  function frame(ts) { if (!running) return; raf = requestAnimationFrame(frame); const now = ts / 1000, dt = Math.min(0.05, tPrev ? now - tPrev : 0.016); tPrev = now; clk += dt; st.frames++;
    if (st.paused) return; // frame capture / tests drive time with advance()
    if (st.fixedDt) return renderAt(st.fixedDt);
    step(dt); }
  function step(dt) { if (!st.dragging) { st.yaw += st.yawV * dt; st.yawV *= Math.exp(-dt * 4); } rig.root.rotation.y = st.yaw; animate(rig, clk, dt);
    if (st.faceCam) { rig.root.updateMatrixWorld(true); const h = rig.B.headC.getWorldPosition(V(0, 0, 0)), fc = st.faceCam; cam.position.set(h.x, h.y + (fc.dy || 0), h.z + fc.d); updHV(); cam.lookAt(h.x, h.y + (fc.ly || 0), h.z); R.render(scene, cam); return; }
    const z = clamp((4.1 - st.dist) / 2.1, 0, 1), ty = lerp(0.84, 1.28, z); cam.position.set(0, ty + 0.18 + 0.1 * (1 - z), st.dist); cam.lookAt(0, ty, 0); updHV(); R.render(scene, cam); }
  function updHV() { const hc = rig && rig.B.headC; if (!hc) return; rig.root.updateMatrixWorld(true); HVIEW.value.copy(cam.position); hc.worldToLocal(HVIEW.value); HVIEW.value.normalize(); }
  function renderAt(dt) { clk += dt; step(dt); }
  function start() { if (running || !st.ok) return; running = true; tPrev = 0; resize(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function show() { wrap = document.getElementById('charWrap'); wrap.classList.remove('hidden'); st.visible = true; if (!R && !initGL()) return; const sex = S.charSex === 'f' ? 'f' : 'm'; setChar(sex); resize(); start(); }
  function hide() { const w = document.getElementById('charWrap'); if (w) w.classList.add('hidden'); st.visible = false; stop(); }
  window.addEventListener('resize', () => { if (running) resize(); });
  return { show, hide, st, get rig() { return rig; }, setPick, setTether, TGRADES, makeTether, showcase, showcaseTether, GRADES, makePickaxe, setYaw: (y) => { st.yaw = y; st.yawV = 0; }, fidget: (k) => { an.fid = k; an.ft = 0; st.fidget = k; an.next = clk + 999; }, advance: (sec, n = 1) => { for (let i = 0; i < n; i++) renderAt(sec); }, an };
})();

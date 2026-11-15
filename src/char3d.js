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
    for (let i = 0; i < 260; i++) { const a = r() * 0.09; g.fillStyle = r() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,240,220,${a * 0.8})`; g.beginPath(); g.arc(r() * w, r() * h, 4 + r() * 22, 0, TAU); g.fill(); }
    g.globalAlpha = o.weave ?? 0.07; for (let y = 0; y < h; y += 3) { g.fillStyle = y % 6 ? '#000' : '#fff'; g.fillRect(0, y, w, 1); } for (let x = 0; x < w; x += 4) { g.fillStyle = '#000'; g.fillRect(x, 0, 1, h); } g.globalAlpha = 1;
    if (o.stitch) { g.strokeStyle = o.stitch; g.lineWidth = 2; g.setLineDash([6, 5]); for (const y of o.seams || [24, 232]) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } g.setLineDash([]); }
    if (o.laces) { g.strokeStyle = '#d8c29a'; g.lineWidth = 5; for (let y = 20; y < h - 10; y += 34) { g.beginPath(); g.moveTo(100, y); g.lineTo(156, y + 20); g.moveTo(156, y); g.lineTo(100, y + 20); g.stroke(); } g.fillStyle = '#2a1b12'; for (let y = 20; y < h; y += 34) { g.beginPath(); g.arc(100, y, 4, 0, TAU); g.arc(156, y, 4, 0, TAU); g.fill(); } }
  }); }
  function patchTex(col, edge) { return cv(128, 128, (g, w, h) => { g.fillStyle = hex(col); g.fillRect(0, 0, w, h); const r = prng(3); for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.12})`; g.fillRect(r() * w, r() * h, 8, 3); }
    g.strokeStyle = edge; g.lineWidth = 4; g.setLineDash([9, 7]); g.strokeRect(10, 10, w - 20, h - 20); g.setLineDash([]); }); }
  function spiralTex(col) { return cv(128, 128, (g, w, h) => { g.fillStyle = hex(col); g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(40,24,12,.7)'; g.lineWidth = 5; g.beginPath(); for (let a = 0; a < 18; a += 0.1) { const rr = 3 + a * 3.3; g.lineTo(64 + Math.cos(a) * rr, 64 + Math.sin(a) * rr); } g.stroke(); }); }
  function radial(inner, outer) { const t = cv(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, inner); gr.addColorStop(0.5, outer); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; }
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
    m: { skin: 0xf2c6a2, blush: 'rgba(240,120,110,.5)', hair: 0x2b211c, iris: '#6a4426', jacket: 0x8a4f33, jacketDk: 0x6c3a25, shirt: 0xcdb48e, pants: 0x8b7556, patch: 0x5d6168, glove: 0x4a3022, belt: 0x4b3020, boot: 0x7a5236, bootDk: 0x4a3020, pack: 0x7b5638, packDk: 0x5c3e28, helmet: 0x9b7a4e, brass: 0xb08a4a, rope: 0xa8743f, sock: 0x8b8b84 },
    f: { skin: 0xf6cdb0, blush: 'rgba(245,125,120,.55)', hair: 0x5a3a26, iris: '#6b4122', jacket: 0x8d8259, jacketDk: 0x6b6342, shirt: 0x4e4a38, pants: 0x5e5038, patch: 0x5c5f55, glove: 0x4a3324, belt: 0x5a3a24, boot: 0x7a5034, bootDk: 0x4a2e1c, pack: 0x7a5634, packDk: 0x5a3e26, helmet: 0x9a7c50, brass: 0xb38f4f, rope: 0xa8743f, sock: 0x8c8c86 },
  };
  /* ---------- the character ---------- */
  function build(sex) { const P = PAL[sex], F = sex === 'f', root = new THREE.Group(); root.name = 'delver';
    const M = { skin: toon(P.skin), skinDk: toon(0xe0a888), hair: toon(P.hair), jacket: toon(0, fabric(P.jacket, { stitch: 'rgba(40,20,10,.45)', seed: 11 }), { side: THREE.DoubleSide }), jacketDk: toon(0, fabric(P.jacketDk, { seed: 12 })),
      shirt: toon(0, fabric(P.shirt, { seed: 13 })), pants: toon(0, fabric(P.pants, { seed: 14, stitch: 'rgba(40,25,10,.35)', seams: [128] })), patch: toon(0, patchTex(P.patch, 'rgba(230,220,200,.55)')), glove: toon(0, fabric(P.glove, { seed: 15, weave: 0.03 })),
      belt: toon(0, fabric(P.belt, { seed: 16, weave: 0.02, stitch: 'rgba(220,190,140,.35)', seams: [40, 216] })), boot: toon(0, fabric(P.boot, { seed: 17, weave: 0.02 })), bootLace: toon(0, fabric(P.boot, { seed: 18, weave: 0.02, laces: true })), bootDk: toon(P.bootDk),
      pack: toon(0, fabric(P.pack, { seed: 19, stitch: 'rgba(30,18,8,.4)' })), packDk: toon(0, fabric(P.packDk, { seed: 20 })), helmet: toon(0, fabric(P.helmet, { seed: 21, weave: 0.015 })), brass: toon(P.brass), dark: toon(0x2c2420), rope: toon(0, fabric(P.rope, { seed: 22, weave: 0.18 })),
      wood: toon(0, fabric(0x7a4a2a, { seed: 23, weave: 0.05 })), bronze: toon(0xb58a4c), sock: toon(0, fabric(P.sock, { seed: 24, weave: 0.14 })), lens: new THREE.MeshBasicMaterial({ color: 0x2f4c52 }) };
    const B = {}; // rig
    B.hips = bone('hips', root, 0, 0.82, 0); B.spine = bone('spine', B.hips, 0, 0.1, 0); B.chest = bone('chest', B.spine, 0, 0.16, 0); B.neck = bone('neck', B.chest, 0, 0.135, 0); B.head = bone('head', B.neck, 0, 0.055, 0.005);
    for (const [s, k] of [[-1, 'R'], [1, 'L']]) { B['sh' + k] = bone('shoulder' + k, B.chest, s * 0.15, 0.085, -0.005); B['ua' + k] = bone('upperArm' + k, B['sh' + k], 0, 0, 0); B['fa' + k] = bone('forearm' + k, B['ua' + k], 0, -0.245, 0); B['hd' + k] = bone('hand' + k, B['fa' + k], 0, -0.215, 0);
      B['th' + k] = bone('thigh' + k, B.hips, s * 0.082, -0.045, 0); B['sn' + k] = bone('shin' + k, B['th' + k], 0, -0.36, 0); B['ft' + k] = bone('foot' + k, B['sn' + k], 0, -0.345, 0); }
    // ---- head ----
    const HC = V(0, 0.105, 0.01), HR = 0.125, head = new THREE.Group(); head.position.copy(HC); B.head.add(head); B.headC = head;
    part(head, ell(HR, HR * 1.0, HR * 0.97, 32, 24), M.skin); part(head, ell(0.088, 0.075, 0.088), M.skin, [0, -0.058, 0.026]);
    for (const s of [-1, 1]) part(head, ell(0.018, 0.03, 0.013), M.skin, [s * 0.121, -0.025, -0.005], [0, s * 0.3, 0]);
    const onFace = (x, y, out = 0.0015) => { const zz = Math.sqrt(Math.max(0, 1 - (x / HR) ** 2 - (y / HR) ** 2)) * HR * 0.97; return [x, y, zz + out]; };
    // eyes: big, dark-lashed, two highlights; each eye is a group so it can blink
    const eyeW = new THREE.MeshBasicMaterial({ color: 0xfffbf4 }), irisT = cv(64, 64, (g) => { const gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, '#2a160c'); gr.addColorStop(0.55, P.iris); gr.addColorStop(1, '#b07a44'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); g.fillStyle = '#140904'; g.beginPath(); g.ellipse(32, 30, 12, 15, 0, 0, TAU); g.fill(); });
    const irisM = new THREE.MeshBasicMaterial({ map: irisT }), hiM = new THREE.MeshBasicMaterial({ color: 0xffffff }), lashM = new THREE.MeshBasicMaterial({ color: 0x24150d }); built.eyes = [];
    for (const s of [-1, 1]) { const ex = s * 0.047, ey = -0.018, eg = new THREE.Group(); eg.position.set(...onFace(ex, ey, 0.001)); eg.rotation.set(0.12, s * 0.42, 0); head.add(eg); built.eyes.push(eg);
      const sc = new THREE.Mesh(new THREE.CircleGeometry(1, 24), eyeW); sc.scale.set(0.027, 0.033, 1); eg.add(sc);
      const ir = new THREE.Mesh(new THREE.CircleGeometry(1, 24), irisM); ir.scale.set(0.02, 0.027, 1); ir.position.set(s * -0.002, -0.003, 0.0008); eg.add(ir);
      for (const [hx, hy, hr] of [[0.007, 0.01, 0.0065], [-0.006, -0.009, 0.0032]]) { const h = new THREE.Mesh(new THREE.CircleGeometry(hr, 12), hiM); h.position.set(hx * -s, hy, 0.0016); eg.add(h); }
      const lid = new THREE.Mesh(new THREE.TorusGeometry(0.029, 0.0042, 5, 18, Math.PI * 0.95), lashM); lid.rotation.z = Math.PI * 0.025; lid.scale.set(1, 1.12, 0.4); lid.position.z = 0.001; eg.add(lid);
      const flick = new THREE.Mesh(new THREE.ConeGeometry(0.004, 0.014, 4), lashM); flick.position.set(s * 0.03, 0.012, 0.001); flick.rotation.z = -s * 1.1; eg.add(flick);
      const brow = part(head, capsule(0.0032, 0.03, 6), new THREE.MeshBasicMaterial({ color: F ? 0x4a2e1c : 0x231a15 }), onFace(s * 0.05, 0.035, 0.003), [0.2, s * 0.4, s * 1.43], null, { ink: false, shadow: false }); brow.renderOrder = 2; }
    part(head, ell(0.0085, 0.01, 0.009), M.skinDk, onFace(0, -0.048, -0.004), null, null, { ink: false });
    { const arc = Math.PI * 0.62, m = new THREE.Mesh(new THREE.TorusGeometry(0.013, 0.0024, 5, 14, arc), new THREE.MeshBasicMaterial({ color: 0x8a3c2c })); m.rotation.set(0.25, 0, Math.PI * 1.5 - arc / 2); m.position.set(...onFace(0, -0.07, 0.0)); m.position.z += 0.022; head.add(m); }
    { const bl = new THREE.MeshBasicMaterial({ map: radial(P.blush, 'rgba(240,120,110,.18)'), transparent: true, depthWrite: false }); for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.PlaneGeometry(0.045, 0.03), bl); c.position.set(...onFace(s * 0.072, -0.05, 0.003)); c.rotation.y = s * 0.62; head.add(c); } }
    // ---- hair ----
    const spike = (len, r, pos, dir, mat = M.hair) => { const g = new THREE.ConeGeometry(r, len, 7); g.translate(0, -len / 2, 0); const m = part(head, g, mat, pos); m.quaternion.setFromUnitVectors(V(0, -1, 0), V(...dir).normalize()); return m; };
    part(head, new THREE.SphereGeometry(HR * 1.045, 28, 18, 0, TAU, 0, Math.PI * 0.6), M.hair, [0, 0.004, -0.008], [-0.42, 0, 0]);
    if (!F) { const rp = prng(5); for (let i = 0; i < 9; i++) { const x = -0.085 + i * 0.021; spike(0.06 + rp() * 0.04, 0.02, [x, 0.06, 0.098 - Math.abs(x) * 0.25], [x * 1.5 + (rp() - 0.5) * 0.3, -1, 0.35]); }
      for (const s of [-1, 1]) for (let i = 0; i < 4; i++) spike(0.06 + rp() * 0.03, 0.02, [s * 0.118, 0.04 - i * 0.012, 0.05 - i * 0.04], [s * 0.35, -1, -0.15 + rp() * 0.2]);
      for (let i = 0; i < 7; i++) { const a = -1.0 + i * 0.33; spike(0.07 + rp() * 0.03, 0.024, [Math.sin(a) * 0.11, 0.01, -Math.cos(a) * 0.11], [Math.sin(a) * 0.4, -1, -0.5]); } }
    else { const rp = prng(9); for (let i = 0; i < 8; i++) { const x = -0.08 + i * 0.023; spike(0.055 + rp() * 0.035, 0.018, [x, 0.065, 0.098 - Math.abs(x) * 0.25], [x * 1.8 + (rp() - 0.5) * 0.3, -1, 0.3]); }
      for (const s of [-1, 1]) { spike(0.17, 0.022, [s * 0.105, 0.035, 0.06], [s * 0.18, -1, 0.12]); spike(0.15, 0.02, [s * 0.118, 0.03, 0.02], [s * 0.25, -1, 0.0]); spike(0.12, 0.022, [s * 0.11, 0.02, -0.04], [s * 0.3, -1, -0.2]); }
      for (let i = 0; i < 6; i++) { const a = -0.9 + i * 0.36; spike(0.08, 0.026, [Math.sin(a) * 0.11, 0.0, -Math.cos(a) * 0.11], [Math.sin(a) * 0.3, -1, -0.4]); } }
    // braid (female): a chain of links hanging from the back of the head, over the pack
    built.braid = []; if (F) { let par = bone('braid0', head, 0, -0.035, -0.122); const tie = part(par, ell(0.03, 0.03, 0.03), M.hair); tie.scale.set(1, 0.9, 1);
      for (let i = 0; i < 9; i++) { const ln = bone('braid' + (i + 1), par, 0, i ? -0.046 : 0, 0); const w = 0.028 * (1 - i * 0.045); for (const s of [-1, 1]) part(ln, ell(w, 0.03, w * 0.8), M.hair, [s * w * 0.35, -0.022, 0], [0, 0, s * 0.5]); built.braid.push({ b: ln, rx: i ? -0.08 : 0.95, ax: 0, az: 0, vx: 0, vz: 0 }); ln.rotation.x = i ? -0.08 : 0.95; par = ln; }
      const tip = bone('braidTip', par, 0, -0.05, 0); part(tip, cyl(0.012, 0.016, 0.02), M.belt, [0, 0.01, 0]); for (let k = 0; k < 5; k++) { const g = new THREE.ConeGeometry(0.01, 0.05, 6); g.translate(0, -0.025, 0); const m = part(tip, g, M.hair); m.rotation.set(0.05 * k, 0, (k - 2) * 0.18); } }
    // ---- helmet: brass-olive dome, brim, leather band with rivets, headlamp and goggles ----
    { const hg = new THREE.Group(); hg.position.set(0, 0.03, -0.004); hg.rotation.x = -0.08; head.add(hg); built.helmet = hg;
      part(hg, new THREE.SphereGeometry(0.153, 32, 16, 0, TAU, 0, Math.PI / 2), M.helmet, [0, 0.0, 0], null, [1, 0.9, 1.07]);
      part(hg, new THREE.TorusGeometry(0.13, 0.008, 6, 40, Math.PI), M.helmet, [0, 0.0, 0], [0, Math.PI / 2, 0], [1, 1.05, 1.07]);
      part(hg, lathe([[0.149, 0.006], [0.172, -0.002], [0.196, -0.016], [0.205, -0.03], [0.197, -0.034], [0.176, -0.02], [0.149, -0.008]], 48), M.helmet, [0, -0.004, 0.004], null, [1, 1, 1.08]);
      part(hg, cyl(0.1555, 0.1545, 0.032, 40, true), M.belt, [0, 0.016, 0], null, [1, 1, 1.07]);
      for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; part(hg, ell(0.005, 0.005, 0.004, 8, 6), M.brass, [Math.sin(a) * 0.157, 0.016, Math.cos(a) * 0.157 * 1.07], null, null, { ink: false }); }
      const lampX = F ? -0.055 : 0, lamp = new THREE.Group(); lamp.position.set(lampX, 0.03, 0.166 - Math.abs(lampX) * 0.12); lamp.rotation.y = -lampX * 2.2; hg.add(lamp);
      part(lamp, cyl(0.027, 0.03, 0.045, 18), M.brass, [0, 0, 0.012], [Math.PI / 2, 0, 0]); part(lamp, new THREE.TorusGeometry(0.028, 0.006, 6, 18), M.brass, [0, 0, 0.035]);
      built.lampLens = new THREE.MeshBasicMaterial({ color: 0xfff6d8 }); const lens = new THREE.Mesh(new THREE.CircleGeometry(0.023, 18), built.lampLens); lens.position.z = 0.036; lamp.add(lens);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: radial('rgba(255,248,215,1)', 'rgba(255,220,150,.35)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); glow.position.z = 0.05; glow.scale.set(0.16, 0.16, 1); lamp.add(glow); built.lampGlow = glow;
      const gog = F ? [0.012, 0.066] : [-0.062, 0.062]; for (const gx of gog) { const gg = new THREE.Group(); gg.position.set(gx, 0.045, Math.sqrt(Math.max(0, 0.155 ** 2 - gx * gx)) * 1.07 - 0.004); gg.rotation.set(-0.35, gx * 3.2, 0); hg.add(gg);
        part(gg, cyl(0.024, 0.024, 0.02, 16), M.brass, [0, 0, 0.006], [Math.PI / 2, 0, 0]); const ln = new THREE.Mesh(new THREE.CircleGeometry(0.019, 16), M.lens); ln.position.z = 0.0165; gg.add(ln); const hl = new THREE.Mesh(new THREE.CircleGeometry(0.005, 8), new THREE.MeshBasicMaterial({ color: 0x9fc9cf })); hl.position.set(0.007, 0.007, 0.017); gg.add(hl); }
      part(hg, cyl(0.159, 0.159, 0.012, 40, true), M.dark, [0, 0.05, 0], [-0.25, 0, 0], [1, 1, 1.07]); }
    // ---- neck and torso ----
    part(B.neck, cyl(0.04, 0.036, 0.09, 14), M.skin, [0, 0.03, 0.004]);
    const torsoZ = 0.72; part(B.chest, lathe([[0.0, -0.17], [0.118, -0.17], [0.121, -0.08], [0.126, 0.0], [0.136, 0.07], [0.142, 0.11], [0.12, 0.145], [0.07, 0.16], [0.0, 0.165]], 28), M.shirt, [0, 0, 0.005], null, [1, 1, torsoZ]);
    if (!F) for (let k = 0; k < 4; k++) part(B.chest, ell(0.006, 0.006, 0.004, 8, 6), M.dark, [0, 0.08 - k * 0.055, 0.126 * torsoZ + 0.005 - (k > 1 ? 0.004 : 0)], null, null, { ink: false });
    { const gap = F ? 0.55 : 0.75, prof = F ? [[0.15, -0.36], [0.152, -0.25], [0.142, -0.12], [0.14, 0.0], [0.15, 0.07], [0.156, 0.11], [0.134, 0.15], [0.085, 0.172]] : [[0.148, -0.27], [0.146, -0.18], [0.138, -0.1], [0.137, 0.0], [0.148, 0.07], [0.155, 0.11], [0.132, 0.15], [0.085, 0.17]];
      part(B.chest, lathe(prof, 32, gap / 2, TAU - gap), M.jacket, [0, 0, 0.0], null, [1, 1, 0.78]);
      // collar / hood and lapels
      if (F) { part(B.chest, new THREE.TorusGeometry(0.085, 0.035, 10, 24), M.jacket, [0, 0.165, -0.025], [Math.PI / 2 + 0.25, 0, 0], [1.05, 0.85, 1]); part(B.chest, ell(0.1, 0.07, 0.05), M.jacket, [0, 0.16, -0.1], [0.3, 0, 0]); }
      else part(B.chest, new THREE.TorusGeometry(0.08, 0.022, 8, 24, TAU - 0.9), M.jacket, [0, 0.16, -0.004], [Math.PI / 2 + 0.3, 0, Math.PI / 2 + 0.45], [1.05, 0.9, 1]);
      for (const s of [-1, 1]) part(B.chest, rbox(0.034, 0.2, 0.01, 0.005), M.jacket, [s * 0.058, 0.02, 0.114], [0.1, s * 0.32, s * -0.14]);
      // front pockets on the jacket, shoulder patch(es)
      for (const s of [-1, 1]) part(B.chest, rbox(0.085, 0.075, 0.02, 0.008), M.jacketDk, [s * 0.1, -0.19, 0.103], [0, s * 0.62, 0]);
      const pm = F ? [1] : [-1, 1]; for (const s of pm) part(B.chest, rbox(0.06, 0.07, 0.012, 0.006), M.patch, [s * 0.165, 0.03, 0.0], [0, s * Math.PI / 2, 0]);
      if (F) part(B.chest, rbox(0.04, 0.05, 0.01, 0.005), M.patch, [-0.0, -0.06, -0.122], [0, Math.PI, 0]); }
    // ---- belt, buckle, pouches, rope ----
    part(B.hips, new THREE.TorusGeometry(0.127, 0.02, 8, 36), M.belt, [0, 0.085, 0.002], [Math.PI / 2, 0, 0], [1, 0.76, 1.3]);
    part(B.hips, rbox(0.05, 0.04, 0.012, 0.004), M.brass, [0, 0.085, 0.1]); part(B.hips, rbox(0.03, 0.022, 0.014, 0.003), M.belt, [0, 0.085, 0.103]);
    for (const s of [-1, 1]) { const pz = part(B.hips, rbox(0.06, 0.075, 0.04, 0.01), M.belt, [s * 0.118, 0.04, 0.055], [0, s * 0.55, 0]); part(pz, rbox(0.062, 0.03, 0.044, 0.008), M.packDk, [0, 0.03, 0.002]); }
    { const side = F ? -1 : 1, pv = bone('ropePivot', B.hips, side * 0.13, 0.07, 0.0); built.rope = { b: pv, ax: 0, az: 0, vx: 0, vz: 0 }; for (let k = 0; k < 4; k++) part(pv, new THREE.TorusGeometry(0.06 - k * 0.003, 0.011, 6, 26), M.rope, [side * 0.012, -0.075 + k * 0.006, (k - 1.5) * 0.007], [0.1 * k, Math.PI / 2, 0.15], [1, 1.35, 1]); }
    // ---- pelvis, legs ----
    part(B.hips, lathe([[0.0, -0.11], [0.11, -0.1], [0.126, -0.05], [0.128, 0.03], [0.125, 0.1], [0.0, 0.1]], 28), M.pants, null, null, [1, 1, 0.78]);
    for (const [s, k] of [[-1, 'R'], [1, 'L']]) { const th = B['th' + k], sn = B['sn' + k], ft = B['ft' + k];
      if (F) { part(th, cyl(0.072, 0.082, 0.2, 18), M.pants, [0, -0.09, 0]); part(th, new THREE.TorusGeometry(0.071, 0.011, 6, 20), M.pants, [0, -0.19, 0], [Math.PI / 2, 0, 0]); part(th, cyl(0.05, 0.063, 0.25, 18), M.skin, [0, -0.24, 0]); part(th, ell(0.05, 0.055, 0.052), M.skin, [0, -0.36, 0.0]);
        part(sn, cyl(0.04, 0.05, 0.2, 16), M.skin, [0, -0.09, 0]); part(sn, cyl(0.046, 0.052, 0.16, 16), M.sock, [0, -0.13, 0]); part(sn, new THREE.TorusGeometry(0.052, 0.013, 6, 18), M.sock, [0, -0.055, 0], [Math.PI / 2, 0, 0]);
        part(sn, cyl(0.057, 0.06, 0.14, 18), M.bootLace, [0, -0.275, 0]); part(sn, new THREE.TorusGeometry(0.059, 0.01, 6, 20), M.boot, [0, -0.205, 0], [Math.PI / 2, 0, 0]); }
      else { part(th, cyl(0.064, 0.074, 0.38, 18), M.pants, [0, -0.18, 0]); part(th, rbox(0.03, 0.09, 0.075, 0.01), M.pants, [s * 0.068, -0.2, 0.0]); part(th, rbox(0.012, 0.03, 0.078, 0.005), M.belt, [s * 0.084, -0.16, 0.0]); part(th, ell(0.063, 0.06, 0.064), M.pants, [0, -0.36, 0]);
        part(sn, rbox(0.075, 0.075, 0.012, 0.006), M.patch, [0, -0.01, 0.057], [-0.1, 0, 0]); part(sn, cyl(0.058, 0.062, 0.22, 18), M.pants, [0, -0.1, 0]);
        part(sn, cyl(0.06, 0.064, 0.15, 18), M.bootLace, [0, -0.27, 0]); part(sn, new THREE.TorusGeometry(0.065, 0.012, 6, 20), M.boot, [0, -0.195, 0], [Math.PI / 2, 0, 0]); }
      part(ft, rbox(0.1, 0.085, 0.2, 0.038), M.boot, [0, -0.03, 0.045]); part(ft, rbox(0.106, 0.024, 0.212, 0.01), M.bootDk, [0, -0.07, 0.046]); part(ft, rbox(0.04, 0.03, 0.09, 0.012), M.bootLace, [0, 0.01, 0.07], [0.5, 0, 0], null, { ink: false }); }
    // ---- arms ----
    for (const [s, k] of [[-1, 'R'], [1, 'L']]) { const sh = B['sh' + k], ua = B['ua' + k], fa = B['fa' + k], hd = B['hd' + k];
      part(sh, ell(0.06, 0.058, 0.058), M.jacket); part(ua, capsule(0.049, 0.17, 14), M.jacket, [0, -0.12, 0]); part(ua, ell(0.047, 0.047, 0.047), M.jacket, [0, -0.245, 0]);
      if (!F) { part(fa, new THREE.TorusGeometry(0.047, 0.02, 8, 20), M.shirt, [0, -0.03, 0], [Math.PI / 2, 0, 0]); part(fa, capsule(0.037, 0.08, 12), M.skin, [0, -0.09, 0]); part(fa, cyl(0.04, 0.045, 0.09, 16), M.glove, [0, -0.17, 0]); part(fa, new THREE.TorusGeometry(0.044, 0.006, 6, 18), M.belt, [0, -0.15, 0], [Math.PI / 2, 0, 0]); }
      else { part(fa, capsule(0.044, 0.13, 12), M.jacket, [0, -0.09, 0]); part(fa, new THREE.TorusGeometry(0.046, 0.012, 6, 18), M.jacketDk, [0, -0.165, 0], [Math.PI / 2, 0, 0]); part(fa, cyl(0.038, 0.042, 0.06, 16), M.glove, [0, -0.19, 0]); }
      // hand: gloved palm, fingerless fingers (glove knuckle, skin tip), thumb; finger groups so they can curl
      part(hd, rbox(0.07, 0.07, 0.034, 0.014), M.glove, [0, -0.035, 0]); const fingers = [];
      for (let i = 0; i < 4; i++) { const fg = bone('finger', hd, -0.026 + i * 0.0175, -0.068, 0.002); part(fg, capsule(0.0095, 0.018, 8), M.glove, [0, -0.012, 0], null, null, { ink: false }); part(fg, capsule(0.0088, 0.016, 8), M.skin, [0, -0.034, 0.0], null, null, { ink: false }); fingers.push(fg); }
      const th = bone('thumb', hd, s * -0.035, -0.03, 0.012); th.rotation.set(0.3, 0, s * 0.7); part(th, capsule(0.01, 0.022, 8), M.skin, [0, -0.016, 0], null, null, { ink: false });
      B['fing' + k] = fingers; B['thumb' + k] = th; }
    // ---- backpack ----
    { const pk = new THREE.Group(); pk.position.set(0, -0.02, -0.095); B.chest.add(pk); built.pack = pk;
      part(pk, rbox(0.3, 0.33, 0.15, 0.045), M.pack, [0, 0, -0.08]); part(pk, rbox(0.29, 0.13, 0.07, 0.03), M.packDk, [0, 0.11, -0.13], [0.15, 0, 0]);
      part(pk, rbox(0.21, 0.13, 0.045, 0.02), M.pack, [0, -0.075, -0.165]); part(pk, rbox(0.17, 0.05, 0.03, 0.012), M.packDk, [0, -0.025, -0.188]);
      for (const s of [-1, 1]) { part(pk, rbox(0.03, 0.26, 0.012, 0.005), M.belt, [s * 0.065, 0.0, -0.157 - 0.035]); part(pk, rbox(0.022, 0.018, 0.016, 0.003), M.brass, [s * 0.065, 0.05, -0.2]); part(pk, rbox(0.06, 0.15, 0.1, 0.02), M.packDk, [s * 0.165, -0.06, -0.08]);
        part(B.chest, tube([[s * 0.075, -0.07, 0.112], [s * 0.088, 0.08, 0.1], [s * 0.098, 0.15, 0.02], [s * 0.088, 0.13, -0.1], [s * 0.08, 0.06, -0.13]], 0.012, 6, 20), M.belt, null, null, [1, 1, 1]); }
      if (!F) { for (let k = 0; k < 5; k++) part(pk, new THREE.TorusGeometry(0.085 - k * 0.012, 0.014, 6, 28), M.rope, [-0.17 - k * 0.003, 0.02, -0.07], [0, Math.PI / 2, 0]); part(pk, new THREE.CircleGeometry(0.03, 12), M.rope, [-0.186, 0.02, -0.07], [0, -Math.PI / 2, 0], null, { ink: false }); }
      else { const roll = part(pk, cyl(0.065, 0.065, 0.34, 22), M.packDk, [0, -0.2, -0.085], [0, 0, Math.PI / 2]); const sp = toon(0, spiralTex(P.packDk)); for (const s of [-1, 1]) part(pk, new THREE.CircleGeometry(0.064, 22), sp, [s * 0.171, -0.2, -0.085], [0, s * Math.PI / 2, 0], null, { ink: false });
        for (const s of [-1, 1]) part(pk, new THREE.TorusGeometry(0.067, 0.008, 6, 20), M.belt, [s * 0.1, -0.2, -0.085], [0, Math.PI / 2, 0]); void roll;
        // the lantern on its ring, swinging
        const pv = bone('lanternPivot', pk, 0.19, 0.0, -0.06); built.lantern = { b: pv, ax: 0, az: 0, vx: 0, vz: 0 }; part(pv, new THREE.TorusGeometry(0.014, 0.003, 5, 12), M.dark, [0, -0.01, 0], [0, Math.PI / 2, 0]);
        const L = new THREE.Group(); L.position.y = -0.09; pv.add(L); part(L, new THREE.ConeGeometry(0.038, 0.035, 8), M.dark, [0, 0.055, 0]); part(L, cyl(0.036, 0.036, 0.016, 10), M.dark, [0, -0.05, 0]); part(L, cyl(0.03, 0.03, 0.01, 10), M.dark, [0, 0.035, 0]);
        for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + 0.4; part(L, cyl(0.003, 0.003, 0.085, 4), M.dark, [Math.cos(a) * 0.031, -0.005, Math.sin(a) * 0.031], null, null, { ink: false }); }
        built.lanternCore = new THREE.MeshBasicMaterial({ color: 0xffc46a }); const core = new THREE.Mesh(cyl(0.024, 0.024, 0.075, 12), built.lanternCore); core.position.y = -0.005; L.add(core);
        const lg = new THREE.Sprite(new THREE.SpriteMaterial({ map: radial('rgba(255,210,120,1)', 'rgba(255,150,60,.35)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); lg.scale.set(0.3, 0.3, 1); L.add(lg); built.lanternGlow = lg;
        const pl = new THREE.PointLight(0xffb060, 0.5, 0.9, 2); L.add(pl); built.lanternLight = pl; } }
    // ---- pickaxe: carried over the right shoulder, held in the right hand (rides on the chest; the hand is IK'd onto its grip) ----
    { const px = new THREE.Group(); px.name = 'pickaxe'; B.chest.add(px); built.pick = px; const L0 = 0.2, L1 = 0.72;
      part(px, cyl(0.016, 0.014, L0 + L1, 10), M.wood, [0, (L1 - L0) / 2, 0]); for (const y of [-L0 + 0.02, L1 - 0.12]) part(px, cyl(0.019, 0.019, 0.025, 10), M.belt, [0, y, 0]);
      const sh = new THREE.Shape(), N = 20, pts = []; for (let i = 0; i <= N; i++) { const u = i / N, x = -0.27 + 0.52 * u, y = 0.03 - 0.2 * Math.pow((x + 0.01) / 0.27, 2); pts.push([x, y]); }
      sh.moveTo(pts[0][0], pts[0][1]); for (const [x, y] of pts) sh.lineTo(x, y); for (let i = N; i >= 0; i--) { const [x, y] = pts[i], u = i / N, th = 0.006 + 0.05 * Math.sin(Math.PI * Math.pow(u, 0.9)); sh.lineTo(x, y - th); } sh.closePath();
      const hg = new THREE.ExtrudeGeometry(sh, { depth: 0.022, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.005, bevelSegments: 2, curveSegments: 4 }); hg.translate(0, 0, -0.011); hg.computeVertexNormals();
      const head = new THREE.Group(); head.position.y = L1 - 0.06; px.add(head); part(head, hg, M.bronze, [0, 0.0, 0]); part(head, rbox(0.045, 0.07, 0.045, 0.008), M.bronze, [0, 0.0, 0]); }
    root.traverse((o) => { if (o.isMesh && o.material !== OUT) o.receiveShadow = false; });
    return { root, B, sex, P, built };
  }

  /* ---------- posing: rest pose, IK ---------- */
  const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _m = new THREE.Matrix4(), _v = V(0, 0, 0), _v2 = V(0, 0, 0), _v3 = V(0, 0, 0);
  function aim(bone, dirW, hingeW) { // point the bone's -y along dirW with its x axis on the hinge
    const y = _v.copy(dirW).normalize().negate(), x = _v2.copy(hingeW).addScaledVector(y, -hingeW.dot(y)).normalize(), z = _v3.crossVectors(x, y); _m.makeBasis(x, y, z); _q.setFromRotationMatrix(_m);
    bone.parent.getWorldQuaternion(_q2); bone.quaternion.copy(_q2.invert().multiply(_q)); bone.updateMatrixWorld(true); }
  function ik(up, lo, la, lb, target, pole, out) { const S = up.getWorldPosition(V(0, 0, 0)), D = target.clone().sub(S), d = clamp(D.length(), 0.02, (la + lb) * 0.999), dir = D.normalize();
    const cosA = clamp((la * la + d * d - lb * lb) / (2 * la * d), -1, 1), sinA = Math.sqrt(1 - cosA * cosA), pn = pole.clone().addScaledVector(dir, -pole.dot(dir)).normalize(), E = S.clone().addScaledVector(dir, la * cosA).addScaledVector(pn, la * sinA);
    const hinge = V(0, 0, 0).crossVectors(dir, pn).normalize(); if (out) hinge.negate(); aim(up, E.clone().sub(S), hinge); const T = S.clone().addScaledVector(dir, d); aim(lo, T.sub(E), hinge); }
  function setup(c) { const { B } = c; c.root.updateMatrixWorld(true); const w = (o, x, y, z) => c.root.localToWorld(V(x, y, z));
    // fixed ankle targets (character space) and the pickaxe grip
    c.ankle = { R: V(-0.095, 0.08, 0.0), L: V(0.1, 0.08, -0.02) };
    const px = c.root.getObjectByName('pickaxe'); { const d = V(0.22, 0.5, -0.84).normalize(), bl = V(0, 0, 1).addScaledVector(d, -d.z).normalize(), x = V(0, 0, 0).crossVectors(d, bl); _m.makeBasis(bl, d, x.negate()); px.quaternion.setFromRotationMatrix(_m); px.position.set(-0.2, -0.02, 0.2); }
    c.pickRest = { p: px.position.clone(), q: px.quaternion.clone() }; c.restQ = {}; for (const k in B) if (B[k] && B[k].isObject3D) c.restQ[k] = B[k].quaternion.clone(); void w; }
  function solveLimbs(c, f) { const { B } = c, root = c.root; root.updateMatrixWorld(true);
    // legs: feet planted on their ankle targets, knees forward
    const fwd = V(0, 0, 1).applyQuaternion(root.quaternion);
    for (const k of ['R', 'L']) { const a = c.ankle[k].clone(); if (k === 'R' && f.tap) { a.y += f.tap * 0.035; a.z += f.tap * 0.01; } ik(B['th' + k], B['sn' + k], 0.36, 0.345, root.localToWorld(a), fwd.clone().add(V(0, 0.2, 0)), false);
      B['ft' + k].parent.getWorldQuaternion(_q2); _q.setFromEuler(new THREE.Euler(f.tap && k === 'R' ? -f.tap * 0.55 : 0, (k === 'R' ? -0.14 : 0.16), 0)); _q.premultiply(root.quaternion); B['ft' + k].quaternion.copy(_q2.invert().multiply(_q)); }
    // right arm: hand on the pickaxe grip (just below where it crosses the shoulder)
    const px = c.root.getObjectByName('pickaxe'); px.updateMatrixWorld(true); const grip = px.localToWorld(V(0, -0.02, 0.0)), back = V(-0.6, -0.4, -0.7).applyQuaternion(root.quaternion);
    ik(B.uaR, B.faR, 0.245, 0.215, grip.add(V(0, 0, 0)), back, false); { B.hdR.parent.getWorldQuaternion(_q2); _q.copy(px.getWorldQuaternion(new THREE.Quaternion())).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -Math.PI / 2))).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -Math.PI / 2, 0))); B.hdR.quaternion.copy(_q2.invert().multiply(_q)); }
    for (const fg of B.fingR) fg.rotation.x = 1.45; B.thumbR.rotation.x = 1.1;
    // left arm: hangs relaxed, or reaches for the cheek when scratching
    const sh = B.shL.getWorldPosition(V(0, 0, 0)); let hand = sh.clone().add(V(0.07, -0.43, 0.06).applyQuaternion(root.quaternion)); const pole = V(0.3, 0, -1).applyQuaternion(root.quaternion);
    if (f.reach) { const cheek = B.headC.localToWorld(V(0.085, -0.055, 0.075 + 0.012 * Math.sin(f.scr || 0))); hand = hand.lerp(cheek.add(V(0.0, -0.06, 0.03)), f.reach); }
    if (f.sighDrop) hand.y -= f.sighDrop * 0.01; ik(B.uaL, B.faL, 0.245, 0.215, hand, pole.add(V(0.4, -0.3, 0)), false);
    { B.hdL.parent.getWorldQuaternion(_q2); _q.copy(B.faL.getWorldQuaternion(new THREE.Quaternion())).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(f.reach ? -0.9 * f.reach + Math.sin(f.scr || 0) * 0.25 * f.reach : 0.1, -0.5, 0.05))); B.hdL.quaternion.copy(_q2.invert().multiply(_q)); }
    for (const [i, fg] of B.fingL.entries()) fg.rotation.x = lerp(0.35 + i * 0.08, 0.9 + 0.35 * Math.sin((f.scr || 0) + i), f.reach || 0); B.thumbL.rotation.x = 0.3; }

  /* ---------- animation: layered idle + fidgets + secondary motion ---------- */
  const FIDGETS = ['shift', 'scratch', 'tap', 'pick', 'glance', 'sigh'];
  const DUR = { shift: 3.4, scratch: 2.8, tap: 2.4, pick: 2.2, glance: 2.6, sigh: 2.6 };
  const an = { next: 3, blinkAt: 1.5, blink: 0, lookT: 0, look: [0, 0], lookTo: [0, 0], fid: null, ft: 0, prev: null, last: '' };
  function pickFidget(now) { const idle = now - st.lastInput > 20; let k; do k = FIDGETS[(Math.random() * FIDGETS.length) | 0]; while (k === an.last); an.last = k; an.fid = k; an.ft = 0; st.fidget = k; an.next = now + (idle ? 2.5 + Math.random() * 2.5 : 4 + Math.random() * 6) + DUR[k]; }
  function pend(o, ax, az, dt, k = 38, c = 4.5) { // damped pendulum driven by the parent's acceleration (character space)
    o.vx += (-k * o.ax - c * o.vx + ax) * dt; o.vz += (-k * o.az - c * o.vz + az) * dt; o.ax += o.vx * dt; o.az += o.vz * dt; o.ax = clamp(o.ax, -0.9, 0.9); o.az = clamp(o.az, -0.9, 0.9); }
  function animate(c, t, dt) { const { B } = c, f = {}; const fid = an.fid, u = fid ? an.ft / DUR[fid] : 0, env = fid ? ss(0, 0.18, u) * ss(1, 0.78, u) : 0;
    if (fid) { an.ft += dt; if (an.ft >= DUR[fid]) { an.fid = null; st.fidget = null; } } if (t > an.next && !an.fid) pickFidget(t);
    // idle layers
    const br = Math.sin(t * 2 * Math.PI / 3.6), sway = Math.sin(t * 0.55), sway2 = Math.sin(t * 0.37 + 1);
    let hx = 0.008 * sway, hy = 0, hz = 0.012 * sway2, hrz = -0.018 * sway, cx = 0.018 * br, crz = 0.014 * sway, cry = 0, nrx = 0, hry = 0, hrx = 0, hrzH = 0, shY = 0.004 * br, pickRx = 0, pickY = 0;
    // look-arounds: drift toward a new random target every few seconds
    if (t > an.lookT) { an.lookT = t + 2.2 + Math.random() * 3.2; an.lookTo = [(Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.22]; }
    const kl = 1 - Math.exp(-dt * 2.2); an.look[0] += (an.lookTo[0] - an.look[0]) * kl; an.look[1] += (an.lookTo[1] - an.look[1]) * kl; hry += an.look[0]; hrx += an.look[1];
    // fidgets (each eased in and out by env)
    if (fid === 'shift') { const side = Math.sin(Math.PI * ss(0.1, 0.5, u)) * 0 + (ss(0.08, 0.35, u) - ss(0.62, 0.92, u)) * (an.side || (an.side = Math.random() < 0.5 ? -1 : 1)); hx += 0.045 * side; hy -= 0.018 * Math.abs(side); hrz += 0.06 * side; crz -= 0.07 * side; hrzH += 0.05 * side; hry -= 0.15 * side; if (u > 0.95) an.side = 0; }
    if (fid === 'scratch') { f.reach = ss(0.05, 0.3, u) * ss(1, 0.75, u); f.scr = t * 22; hrzH -= 0.12 * f.reach; hry += 0.18 * f.reach; hrx += 0.08 * f.reach; crz += 0.03 * f.reach; }
    if (fid === 'tap') { const on = ss(0.05, 0.2, u) * ss(1, 0.85, u); f.tap = on * (0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 2.2)); hrx += 0.06 * on; hry -= 0.1 * on; crz += 0.015 * on; }
    if (fid === 'pick') { const e = Math.sin(Math.PI * ss(0.05, 0.85, u)); pickY = 0.05 * e - 0.01 * Math.sin(Math.PI * ss(0.55, 1, u)); pickRx = -0.35 * Math.sin(Math.PI * ss(0.1, 0.6, u)) + 0.12 * Math.sin(Math.PI * ss(0.5, 0.95, u)); crz -= 0.05 * e; hrzH += 0.07 * e; shY += 0.012 * e; }
    if (fid === 'glance') { const g = ss(0.05, 0.3, u) * ss(1, 0.7, u), toCam = Math.atan2(Math.sin(-st.yaw), Math.cos(-st.yaw)); hry = lerp(hry, clamp(toCam, -1.1, 1.1) * 0.75, g); hrx = lerp(hrx, -0.06, g); cry += clamp(toCam, -1.1, 1.1) * 0.22 * g; }
    if (fid === 'sigh') { const s1 = Math.sin(Math.PI * ss(0.05, 0.45, u)), s2 = Math.sin(Math.PI * ss(0.4, 0.95, u)); cx += 0.06 * s1 - 0.06 * s2; shY += 0.02 * s1 - 0.028 * s2; nrx += 0.1 * s2; hrx += 0.12 * s2; hy -= 0.008 * s2; f.sighDrop = s2; }
    // apply: hips, spine, chest, neck, head
    const E = (k, x, y, z) => { B[k].quaternion.copy(c.restQ[k]).multiply(_q.setFromEuler(new THREE.Euler(x, y, z))); };
    B.hips.position.set(hx, 0.82 + hy - 0.004 * Math.abs(sway), hz); E('hips', 0, 0, hrz); E('spine', cx * 0.4, cry * 0.4, -hrz * 0.6 + crz * 0.3); E('chest', cx, cry, crz); B.chest.scale.set(1 + 0.008 * br, 1 + 0.006 * br, 1 + 0.012 * br);
    E('neck', nrx + hrx * 0.3, hry * 0.35, hrzH * 0.4); E('head', hrx * 0.7, hry * 0.65, hrzH * 0.6 - crz * 0.4);
    for (const k of ['shR', 'shL']) B[k].position.y = 0.085 + shY; B.shR.rotation.z = -shY * 2; B.shL.rotation.z = shY * 2;
    // pickaxe rides on the chest; the adjust fidget lifts and resettles it
    const px = c.root.getObjectByName('pickaxe'); px.position.copy(c.pickRest.p).add(V(0, pickY, 0)); px.quaternion.copy(c.pickRest.q).premultiply(_q.setFromEuler(new THREE.Euler(pickRx, 0, 0)));
    solveLimbs(c, f);
    // blinks (random, sometimes double), held shut through a sigh
    if (t > an.blinkAt) { an.blink = 0.0001; an.blinkAt = t + 2 + Math.random() * 3.8; if (Math.random() < 0.2) an.dbl = true; }
    let lid = 1; if (an.blink > 0) { an.blink += dt; const b = an.blink / 0.16; lid = b < 0.5 ? 1 - b * 2 : (b - 0.5) * 2; if (b >= 1) { an.blink = an.dbl ? -0.12 : 0; an.dbl = false; } } else if (an.blink < 0) { an.blink += dt; if (an.blink >= 0) an.blink = 0.0001; }
    if (fid === 'sigh') lid = Math.min(lid, 1 - 0.85 * Math.sin(Math.PI * ss(0.45, 0.85, u))); for (const e of built.eyes) e.scale.y = Math.max(0.07, lid);
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
    document.querySelectorAll('#charSex [data-sex]').forEach((b) => b.classList.toggle('on', b.dataset.sex === sex)); }
  function bindInput() { const pts = new Map(); let pinch0 = 0, dist0 = 0;
    canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); st.lastInput = clk; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); dist0 = st.dist; } });
    canvas.addEventListener('pointermove', (e) => { if (!pts.has(e.pointerId)) return; const pr = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); st.lastInput = clk;
      if (pts.size === 1) { const dx = e.clientX - pr[0]; st.yaw += dx * 0.011; st.yawV = dx * 0.011 / 0.016; } else if (pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch0 > 0) st.dist = clamp(dist0 * pinch0 / d, 2.0, 5.6); } });
    const up = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch0 = 0; }; canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); st.dist = clamp(st.dist * Math.exp(e.deltaY * 0.0012), 2.0, 5.6); st.lastInput = clk; }, { passive: false });
    document.getElementById('charSex').addEventListener('click', (e) => { const b = e.target.closest('[data-sex]'); if (!b) return; S.charSex = b.dataset.sex; setChar(S.charSex); if (typeof save === 'function') save(); st.lastInput = clk; });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (st.visible) start(); }); }
  function resize() { const w = wrap.clientWidth || 390, h = wrap.clientHeight || 600; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  function frame(ts) { if (!running) return; raf = requestAnimationFrame(frame); const now = ts / 1000, dt = Math.min(0.05, tPrev ? now - tPrev : 0.016); tPrev = now; clk += dt; st.frames++;
    if (st.paused) return; // frame capture / tests drive time with advance()
    if (st.fixedDt) return renderAt(st.fixedDt);
    step(dt); }
  function step(dt) { if (!st.dragging) { st.yaw += st.yawV * dt; st.yawV *= Math.exp(-dt * 4); } rig.root.rotation.y = st.yaw; animate(rig, clk, dt);
    const z = clamp((4.1 - st.dist) / 2.1, 0, 1), ty = lerp(0.84, 1.28, z); cam.position.set(0, ty + 0.18 + 0.1 * (1 - z), st.dist); cam.lookAt(0, ty, 0); R.render(scene, cam); }
  function renderAt(dt) { clk += dt; step(dt); }
  function start() { if (running || !st.ok) return; running = true; tPrev = 0; resize(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function show() { wrap = document.getElementById('charWrap'); wrap.classList.remove('hidden'); st.visible = true; if (!R && !initGL()) return; const sex = S.charSex === 'f' ? 'f' : 'm'; setChar(sex); resize(); start(); }
  function hide() { const w = document.getElementById('charWrap'); if (w) w.classList.add('hidden'); st.visible = false; stop(); }
  window.addEventListener('resize', () => { if (running) resize(); });
  return { show, hide, st, get rig() { return rig; }, setYaw: (y) => { st.yaw = y; st.yawV = 0; }, fidget: (k) => { an.fid = k; an.ft = 0; st.fidget = k; an.next = clk + 999; }, advance: (sec, n = 1) => { for (let i = 0; i < n; i++) renderAt(sec); }, an };
})();

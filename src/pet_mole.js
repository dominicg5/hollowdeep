/* ---------- Mole pet (Mia's mole_turnaround / mole_details / pet_mole): a chubby dark-furred mole with a pink star nose, closed happy eyes, rosy cheeks,
   pink hands and feet, a brass miner's lamp on a leather headband and a leather satchel on a cross strap. In Explore it trots after her; whenever her
   backpack holds ore, ingots or gems it fills its satchel, waddles to the nearest Ledge Tether (any wired drill line, or the Ledge door hub where every
   tether lands), plugs the satchel in, the load rides the tether into the vault, and it comes back to her. Loops until stopped (Mole button on the Explore bar). ---------- */
const Mole = (() => {
  const M = { on: false, g: null, st: 'off', pos: null, face: 0, path: null, pi: 0, carry: {}, trips: 0, moved: 0, t: 0, cool: 0, replan: 0, goal: null, dig: 0, walk: 0, routes: null, routesT: 0, hist: [] };
  const WS = () => Explore.WS, H = 0.78; // standing height in metres (her knee-to-hip: a pet she looks down at)
  // ---- model: built at unit height (1 = H metres), facing +z, merged by part into 6 meshes (body, two arms, two feet, lamp lens)
  function vcol(g, f) { g = g.index ? g.toNonIndexed() : g; const P = g.attributes.position, C = new Float32Array(P.count * 3); for (let i = 0; i < P.count; i++) { const c = f(P.getX(i), P.getY(i), P.getZ(i)); C[i * 3] = c[0] ** 2.2; C[i * 3 + 1] = c[1] ** 2.2; C[i * 3 + 2] = c[2] ** 2.2; } /* painted (sRGB) colours -> linear */ g.setAttribute('color', new THREE.BufferAttribute(C, 3)); if (!g.attributes.normal) g.computeVertexNormals(); return g; }
  function merge(list) { let n = 0; for (const g of list) n += g.attributes.position.count; const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3); let o = 0;
    for (const g of list) { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); C.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; }
    const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(P, 3)); m.setAttribute('normal', new THREE.BufferAttribute(N, 3)); m.setAttribute('color', new THREE.BufferAttribute(C, 3)); m.computeBoundingSphere(); return m; }
  const hn = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
  const fur = (x, y, z) => { const v = 0.82 + 0.3 * hn(Math.round(x * 60), Math.round(y * 60), Math.round(z * 60)) + 0.06 * Math.sin(y * 40 + x * 30); return [0.30 * v, 0.235 * v, 0.19 * v]; };
  const solid = (c) => () => c, PINK = [0.93, 0.62, 0.52], TAN = [0.84, 0.64, 0.47], LEATH = [0.55, 0.34, 0.17], LEATH2 = [0.43, 0.26, 0.13], BRASS = [0.78, 0.58, 0.22], INK = [0.07, 0.05, 0.05], STAR = [0.92, 0.45, 0.45], BLUSH = [0.9, 0.5, 0.48], ORE = [0.45, 0.47, 0.52];
  const xf = (g, x, y, z, rx, ry, rz, sx, sy, sz) => { g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)), new THREE.Vector3(sx || 1, sy || sx || 1, sz || sx || 1))); return g; };
  // pear-shaped head-and-body in one (the concept has no neck), radius by height
  const PROF = [[0.0, 0.1], [0.2, 0.11], [0.3, 0.16], [0.355, 0.26], [0.37, 0.38], [0.355, 0.5], [0.325, 0.6], [0.3, 0.68], [0.27, 0.76], [0.22, 0.84], [0.15, 0.9], [0.07, 0.935], [0.0, 0.945]];
  const R = (y) => { if (y <= PROF[0][1]) return 0; for (let i = 0; i + 1 < PROF.length; i++) { const [r0, y0] = PROF[i], [r1, y1] = PROF[i + 1]; if (y <= y1) return r0 + (r1 - r0) * (y - y0) / (y1 - y0); } return 0; };
  function surf(dx, dy, dz, cy) { /* point on the body surface along a direction from (0, cy, 0) */ let lo = 0, hi = 0.6; for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2, y = cy + dy * m, r = Math.hypot(dx * m, dz * m * 1.08); if (r < R(y)) lo = m; else hi = m; } return new THREE.Vector3(dx * lo, cy + dy * lo, dz * lo); }
  function build() { const parts = [];
    const body = new THREE.LatheGeometry(PROF.map(([r, y]) => new THREE.Vector2(r, y)), 28); xf(body, 0, 0, 0, 0, 0, 0, 1, 1, 0.93); parts.push(vcol(body, fur));
    const mz = xf(new THREE.SphereGeometry(0.13, 18, 12), 0, 0.6, 0.285, 0, 0, 0, 1.12, 0.82, 0.9); parts.push(vcol(mz, (x, y) => TAN.map((c) => c * (y < 0.56 ? 0.92 : 1))));
    const sh = new THREE.Shape(); for (let k = 0; k < 10; k++) { const a = Math.PI / 2 + k / 10 * Math.PI * 2, r = k % 2 ? 0.032 : 0.072; k ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const star = new THREE.ExtrudeGeometry(sh, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.012, bevelSegments: 2 }); xf(star, 0, 0.64, 0.38); parts.push(vcol(star, solid(STAR)));
    for (const s of [-1, 1]) { const e = new THREE.TorusGeometry(0.03, 0.007, 5, 10, Math.PI); xf(e, s * 0.105, 0.705, 0.0, 0, 0, 0); const p = surf(s * 0.105 / 0.3, 0.2, 1, 0.62); e.translate(0, 0, p.z + 0.002); e.rotateY(s * 0.32); parts.push(vcol(e, solid(INK)));
      const ch = new THREE.CircleGeometry(0.045, 14), q = surf(s * 0.62, 0.05, 0.78, 0.62); xf(ch, q.x, q.y, q.z + 0.003, 0, s * 0.62, 0, 1, 0.78, 1); parts.push(vcol(ch, solid(BLUSH)));
      const ea = xf(new THREE.SphereGeometry(0.045, 10, 8), s * 0.285, 0.72, 0.0, 0, 0, s * 0.3, 0.45, 1, 1); parts.push(vcol(ea, solid(PINK)));
      const lg = xf(new THREE.CylinderGeometry(0.1, 0.11, 0.12, 12), s * 0.14, 0.12, 0.02); parts.push(vcol(lg, fur)); }
    // headband round the crown + brass lamp
    const bandY = 0.8, br = R(bandY), band = new THREE.TorusGeometry(1, 0.022, 6, 32); xf(band, 0, bandY, 0, Math.PI / 2 - 0.12, 0, 0, br + 0.006, br * 0.93 + 0.006, 1); parts.push(vcol(band, solid(LEATH)));
    const lp = surf(0, 0.12, 1, bandY - 0.03), lamp = new THREE.CylinderGeometry(0.068, 0.072, 0.05, 18); xf(lamp, 0, lp.y + 0.03, lp.z + 0.018, Math.PI / 2 - 0.12, 0, 0); parts.push(vcol(lamp, solid(BRASS)));
    const rim = new THREE.TorusGeometry(0.06, 0.012, 6, 18); xf(rim, 0, lp.y + 0.033, lp.z + 0.046, -0.12, 0, 0); parts.push(vcol(rim, solid(BRASS.map((c) => c * 1.12))));
    // cross strap (right shoulder to left hip) and satchel on the left hip with an ore lump peeking out
    const sp = []; const u = new THREE.Vector3(1, -1, 0).normalize(), w = new THREE.Vector3(0, 0, 1); for (let k = 0; k < 40; k++) { const a = k / 40 * Math.PI * 2, d = u.clone().multiplyScalar(Math.cos(a)).add(w.clone().multiplyScalar(Math.sin(a))), p = surf(d.x, d.y, d.z, 0.5); sp.push(p.add(new THREE.Vector3(p.x, 0, p.z).normalize().multiplyScalar(0.014))); }
    const strap = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sp, true), 80, 0.016, 5, true); parts.push(vcol(strap, solid(LEATH2)));
    const sa = 0.62, hp = surf(Math.sin(sa), -0.25, Math.cos(sa), 0.36), sat = new THREE.BoxGeometry(0.2, 0.16, 0.085, 2, 2, 1); { const P = sat.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i); P.setX(i, x * (1 - 0.12 * (y < 0 ? 1 : 0))); } }
    xf(sat, hp.x + 0.03, hp.y, hp.z + 0.04, 0, sa, 0); parts.push(vcol(sat, (x, y) => LEATH.map((c) => c * (0.9 + 0.15 * hn(x * 9, y * 9, 1)))));
    const flap = new THREE.BoxGeometry(0.21, 0.07, 0.09); xf(flap, hp.x + 0.03 + Math.sin(sa) * 0.006, hp.y + 0.06, hp.z + 0.04 + Math.cos(sa) * 0.006, 0.08, sa, 0); parts.push(vcol(flap, solid(LEATH.map((c) => c * 0.86))));
    const btn = new THREE.CylinderGeometry(0.016, 0.016, 0.012, 10); xf(btn, hp.x + 0.03 + Math.sin(sa) * 0.05, hp.y + 0.035, hp.z + 0.04 + Math.cos(sa) * 0.05, Math.PI / 2, 0, 0); btn.rotateY(0); parts.push(vcol(btn, solid(BRASS)));
    const g = new THREE.Group(); g.name = 'petMole'; const mat = new THREE.MeshLambertMaterial({ vertexColors: true }); const bm = new THREE.Mesh(merge(parts), mat); bm.castShadow = true; bm.receiveShadow = true; g.add(bm); bm.onBeforeRender = () => { if (typeof Explore !== 'undefined' && !Explore.on && g.parent && g.parent.isScene && !g.userData.solo) g.visible = false; }; /* left Explore by any route: it hides */
    // ore lump in the satchel (shown while it carries a load)
    const ore = new THREE.Mesh(vcol(new THREE.IcosahedronGeometry(0.06, 0), solid(ORE)), mat); ore.position.set(hp.x + 0.05, hp.y + 0.1, hp.z + 0.02); ore.rotation.set(0.4, 0.8, 0.2); g.add(ore); g.userData.ore = ore;
    // arms: fur sleeve + pink hand with three fingers, pivoting at the shoulder
    const arm = (s) => { const a = []; const sl = new THREE.CylinderGeometry(0.06, 0.075, 0.24, 10); xf(sl, 0, -0.11, 0, 0, 0, 0); a.push(vcol(sl, fur)); const pa = xf(new THREE.SphereGeometry(0.06, 10, 8), 0, -0.25, 0.01, 0, 0, 0, 1, 1.1, 0.7); a.push(vcol(pa, solid(PINK)));
      for (const f of [-1, 0, 1]) { const fi = new THREE.CylinderGeometry(0.016, 0.02, 0.08, 6); xf(fi, f * 0.03, -0.31, 0.012, 0, 0, f * 0.12); a.push(vcol(fi, solid(PINK.map((c) => c * 0.97)))); }
      const m = new THREE.Mesh(merge(a), mat); m.castShadow = true; const pv = new THREE.Group(); pv.position.set(s * 0.345, 0.56, 0.04); pv.rotation.z = s * 0.16; pv.add(m); return pv; };
    const foot = (s) => { const a = []; const pd = xf(new THREE.SphereGeometry(0.09, 12, 8), 0, 0.035, 0.03, 0, 0, 0, 1, 0.45, 1.35); a.push(vcol(pd, solid(PINK))); for (const t of [-1, 0, 1]) { const to = xf(new THREE.SphereGeometry(0.028, 8, 6), t * 0.04, 0.03, 0.135 - Math.abs(t) * 0.012); a.push(vcol(to, solid(PINK.map((c) => c * 1.03)))); }
      const m = new THREE.Mesh(merge(a), mat); m.castShadow = true; const pv = new THREE.Group(); pv.position.set(s * 0.14, 0, 0.02); pv.add(m); return pv; };
    g.userData.arms = [arm(-1), arm(1)]; g.userData.feet = [foot(-1), foot(1)]; for (const o of g.userData.arms.concat(g.userData.feet)) g.add(o);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.05, 18), new THREE.MeshBasicMaterial({ color: 0xfff0a0 })); lens.position.set(0, lp.y + 0.033, lp.z + 0.05); lens.rotation.x = -0.12; g.add(lens);
    const gc = document.createElement('canvas'); gc.width = gc.height = 64; { const x = gc.getContext('2d'), gr = x.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(255,240,170,.9)'); gr.addColorStop(1, 'rgba(255,220,120,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); }
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); glow.scale.set(0.17, 0.17, 1); glow.material.opacity = 0.7; glow.position.copy(lens.position).add(new THREE.Vector3(0, 0, 0.02)); g.add(glow);
    // plug-in spark at the tether (shown while it hands the load over)
    const sp2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow.material.map, color: 0x9ff6ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sp2.visible = false; g.userData.spark = sp2;
    return g; }
  // ---- what it hauls: everything in the backpack that is not a tool
  const haulIds = () => Object.keys(S.backpack || {}).filter((id) => !/^tool:/.test(id) && Craft.get('bag', id) > 0);
  const haulN = () => haulIds().reduce((n, id) => n + Craft.get('bag', id), 0);
  // ---- the tethers it can hand a load to: every wired drill's Ledge Tether line (door -> drill), plus the Ledge door hub itself
  function routes() { if (M.routes && M.t - M.routesT < 20) return M.routes; const out = []; try { const F = Explore.ledgeFront(); out.push([[F.x, F.y]]); const D = Explore.drillState(); if (D) for (const d of D.list) if (d.port && !d.camp) { const r = Explore.drillRoute(d); if (r && r.pts && r.pts.length > 1) out.push(r.pts); } } catch (e) {} M.routes = out; M.routesT = M.t; return out; }
  function nearestTether(x, y) { let best = null; for (const pts of routes()) { if (pts.length === 1) { const d = Math.hypot(pts[0][0] - x, pts[0][1] - y); if (!best || d < best.d) best = { d, x: pts[0][0], y: pts[0][1], door: true }; continue; }
      for (let i = 0; i + 1 < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy || 1, t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / L2)), px = ax + vx * t, py = ay + vy * t, d = Math.hypot(px - x, py - y); if (!best || d < best.d) best = { d, x: px, y: py, door: false }; } } return best; }
  // ---- walking: nav plan to a goal, then step along it
  function goTo(x, y) { const P = Explore.plan(M.pos[0], M.pos[1], x, y); M.goal = [x, y]; M.path = P && P.pts && P.pts.length ? P.pts.map((p) => [p[0], p[1]]) : [[x, y]]; M.pi = 0; return !!P; }
  function step(dt, spd) { if (!M.path || M.pi >= M.path.length) return true; let left = spd * dt; while (left > 0 && M.pi < M.path.length) { const [tx, ty] = M.path[M.pi], dx = tx - M.pos[0], dy = ty - M.pos[1], d = Math.hypot(dx, dy); if (d < 1e-3) { M.pi++; continue; } const k = Math.min(1, left / d); M.pos[0] += dx * k; M.pos[1] += dy * k; left -= d * k; M.moved += d * k; M.walk += d * k; const fa = Math.atan2(dx, dy); let df = fa - M.face; df = Math.atan2(Math.sin(df), Math.cos(df)); M.face += df * Math.min(1, dt * 10); if (k >= 1) M.pi++; else break; } return M.pi >= M.path.length; }
  function her() { return Explore.here(); }
  function spawnNear() { const h = her(); if (!h) return false; const b = Explore.EX.az || 0, x = h[0] - Math.cos(b) * WS() * 2.4, y = h[1] + Math.sin(b) * WS() * 2.4, k = Explore.reach ? Explore.reach(x, y) : [x, y]; M.pos = [k[0], k[1]]; M.path = null; return true; }
  function ensure() { if (!M.g) M.g = build(); if (!M.g.parent && M3.scene) { M3.scene.add(M.g); M3.scene.add(M.g.userData.spark); } }
  function start() { if (!Explore.on) { if (typeof toast === 'function') toast('The Mole digs alongside you while you Explore'); } M.on = true; S.mole = Object.assign(S.mole || {}, { on: true }); M.st = 'follow'; M.cool = 0.5; if (Explore.on) { ensure(); if (!M.pos) spawnNear(); M.g.visible = true; } bar(); if (typeof save === 'function') save(); return true; }
  function stop() { M.on = false; if (S.mole) S.mole.on = false; for (const id in M.carry) Craft.add('bag', id, M.carry[id]); M.carry = {}; M.st = 'off'; M.path = null; if (M.g) { M.g.visible = false; M.g.userData.spark.visible = false; } M.pos = null; bar(); if (typeof save === 'function') save(); return true; }
  function deliver() { let n = 0; for (const id in M.carry) { const k = M.carry[id]; const got = Craft.add('vault', id, k); if (got) n += k; else Craft.add('bag', id, k); } M.carry = {}; S.mole.delivered = (S.mole.delivered || 0) + n; S.mole.trips = (S.mole.trips || 0) + 1; M.trips++; M.hist.push(n); if (typeof save === 'function') save(); if (n && typeof toast === 'function') toast(`🐾 Mole sent ${n} to the vault`); return n; }
  // ---- per frame (Explore only)
  function tick(dt) { M.t += dt; if (!M.on || !Explore.on) return; ensure(); if (!M.pos && !spawnNear()) return; const g = M.g, w = WS(), h = her(); if (!h) return; g.visible = true; M.cool -= dt; M.replan -= dt;
    const dH = Math.hypot(h[0] - M.pos[0], h[1] - M.pos[1]); if (dH > w * 60 && M.st !== 'toTether' && M.st !== 'deposit') spawnNear(); // left far behind (a long run or a door): it pops up beside her
    let spd = w * 3.4, moving = false;
    if (M.st === 'follow') { if (M.cool <= 0 && haulN() > 0) { for (const id of haulIds()) { const n = Craft.get('bag', id); Craft.add('bag', id, -n); M.carry[id] = (M.carry[id] || 0) + n; } const T = nearestTether(M.pos[0], M.pos[1]); if (T) { M.tether = T; goTo(T.x, T.y); M.st = 'toTether'; } }
      else if (dH > w * 3.2) { if (M.replan <= 0 || !M.path) { const a = Math.atan2(M.pos[1] - h[1], M.pos[0] - h[0]); goTo(h[0] + Math.cos(a) * w * 2.2, h[1] + Math.sin(a) * w * 2.2); M.replan = 0.6; } spd = w * (3.4 + Math.min(9, (dH / w - 3) * 0.9)); moving = !step(dt, spd); } else { M.path = null; const fa = Math.atan2(h[0] - M.pos[0], h[1] - M.pos[1]); let df = fa - M.face; df = Math.atan2(Math.sin(df), Math.cos(df)); M.face += df * Math.min(1, dt * 4); } }
    if (M.st === 'toTether') { spd = w * 4.2; moving = !step(dt, spd); if (!moving) { M.st = 'deposit'; M.dig = 0; } }
    if (M.st === 'deposit') { M.dig += dt; const sp = g.userData.spark; sp.visible = M.dig > 0.35 && M.dig < 1.25; sp.position.set(M.pos[0], Explore.hAt(M.pos[0], M.pos[1]) + w * 0.35, M.pos[1]); sp.scale.setScalar(w * (0.5 + 0.5 * Math.sin(M.dig * 12) ** 2)); if (M.dig > 1.3) { sp.visible = false; deliver(); M.st = 'follow'; M.cool = 1.5; M.path = null; } }
    // pose: waddle while walking, a little hop + bow into the satchel at the tether, breathing at rest
    const s = w * H, gy = Explore.hAt(M.pos[0], M.pos[1]); g.scale.setScalar(s); const ph = M.walk / (w * 0.32), wk = moving ? 1 : 0; M.wk = (M.wk || 0) + (wk - (M.wk || 0)) * Math.min(1, dt * 8); const a = M.wk;
    const hop = M.st === 'deposit' ? Math.max(0, Math.sin(Math.min(1, M.dig / 0.5) * Math.PI)) * 0.12 : 0;
    g.position.set(M.pos[0], gy + s * (Math.abs(Math.sin(ph)) * 0.05 * a + hop), M.pos[1]); g.rotation.set(M.st === 'deposit' && M.dig > 0.5 ? 0.28 : 0, M.face, Math.sin(ph) * 0.09 * a);
    const [aL, aR] = g.userData.arms, [fL, fR] = g.userData.feet; aL.rotation.x = Math.sin(ph) * 0.6 * a; aR.rotation.x = -Math.sin(ph) * 0.6 * a; fL.position.z = 0.02 + Math.sin(ph) * 0.09 * a; fR.position.z = 0.02 - Math.sin(ph) * 0.09 * a; fL.position.y = Math.max(0, Math.cos(ph)) * 0.04 * a; fR.position.y = Math.max(0, -Math.cos(ph)) * 0.04 * a;
    if (M.st === 'deposit') { aL.rotation.x = aR.rotation.x = -0.9; } const br = 1 + Math.sin(M.t * 2.4) * 0.012 * (1 - a); g.children[0].scale.set(1, br, 1);
    g.userData.ore.visible = Object.keys(M.carry).length > 0; if (M.t - (M.barT || 0) > 0.5) { M.barT = M.t; bar(); } }
  // ---- Explore bar button: Start / Stop the Mole
  function bar() { const b = document.getElementById('exploreBar'); if (!b) return; let k = b.querySelector('[data-mole]'); if (!k) { k = document.createElement('button'); k.dataset.mole = '1'; k.addEventListener('click', (e) => { e.stopPropagation(); M.on ? stop() : start(); }); b.insertBefore(k, b.querySelector('[data-ex=exit]')); }
    const lbl = M.on ? (M.st === 'toTether' ? '🐾 Hauling…' : M.st === 'deposit' ? '🐾 Sending…' : '🐾 Stop Mole') : '🐾 Mole'; if (k.textContent !== lbl) k.textContent = lbl; k.classList.toggle('sel', M.on); k.title = M.on ? 'Stop the Mole (it stops hauling and burrows away)' : 'Start the Mole: it follows you and hauls your backpack to the vault'; }
  // hook into Explore (per-frame tick, enter/exit)
  if (typeof Explore !== 'undefined') { const t0 = Explore.tick, x0 = Explore.exit, e0 = Explore.enter;
    Explore.tick = (dt) => { t0(dt); try { tick(dt); } catch (e) { console.error(e); } };
    Explore.exit = (...a) => { const r = x0(...a); if (M.g) { M.g.visible = false; M.g.userData.spark.visible = false; } if (M.st === 'toTether' || M.st === 'deposit') { /* left mid-trip: the load still reaches the vault */ deliver(); M.st = M.on ? 'follow' : 'off'; } M.pos = null; return r; };
    Explore.enter = (...a) => { const r = e0(...a); if (r !== false) { if (S.mole && S.mole.on && !M.on) { M.on = true; M.st = 'follow'; } bar(); } return r; }; }
  return { M, start, stop, tick, build, nearestTether, routes, haulN, get on() { return M.on; } };
})();

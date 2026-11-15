
/* =====================================================================
   THE LUMEN TREE ADDITIONS (concept/grand-door.jpg, waterfall-tree.jpg, miner-island.jpg):
   the great door into the trunk, the streams that spring from its roots and spill over the plateau in three
   wide falls, the lake below reaching out to the edge of the world, and the old miner's island.
   ===================================================================== */
const GRAND = (() => {
  let G = null; const GX = { built: false, anim: [], door: null };
  const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const cvTex = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t; };
  function prng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

  /* ---------- water: the plan (local frame: d out from the trunk toward the plateau edge, s across) ---------- */
  const LIP = 3550, LIPH = 1765, WL = 130, FALLS = [[-1800, -800], [-500, 500], [800, 1800]];
  const lipD = (s) => LIP + 6e-5 * s * s;
  const toW = (d, s) => [G.T.x + G.ox * d + G.lx * s, G.T.y + G.oy * d + G.ly * s];
  const toL = (x, y) => { const dx = x - G.T.x, dy = y - G.T.y; return [dx * G.ox + dy * G.oy, dx * G.lx + dy * G.ly]; };
  const halfW = (d, sd) => (2300 + 800 * sm(LIP, LIP + 2500, d)) * (1 + 0.06 * Math.sin(d / 700 + sd * 1.7) + 0.04 * Math.sin(d / 290 + sd * 3.1));
  const dFar = (s) => Math.sqrt(Math.max(0, (CITY.R + 800) ** 2 - s * s)) - G.rT;
  function lakeSdf(d, s) { return Math.max(Math.abs(s) - halfW(d, s < 0 ? -1 : 1), lipD(s) + 30 - d, d - dFar(s)); }
  function poolSdf(d, s, f) { const [s0, s1] = FALLS[f], ld = lipD(s); return Math.max(s0 - 40 - s, s - s1 - 40, ld - 420 - d, d - ld); }
  // streams: spring (angle off the plateau side, distance from the trunk axis) -> waypoints -> the pool above one of the falls
  const STREAMS = [[-1.0, 2300, [[2300, -1700], [3000, -1350]], 0, 110], [-1.35, 2550, [[1800, -2250], [2800, -1750]], 0, 80], [-0.45, 1900, [[2400, -520], [3150, -160]], 1, 95],
    [0.45, 1900, [[2400, 520], [3150, 160]], 1, 95], [1.0, 2300, [[2300, 1700], [3000, 1350]], 2, 110], [1.35, 2550, [[1800, 2250], [2800, 1750]], 2, 80]];
  function planStreams(groundPre) { G.streams = []; G.sgrid = new Map(); const cell = 250;
    for (const [th, rho, way, f, w] of STREAMS) { const ctrl = [[Math.cos(th) * rho, Math.sin(th) * rho]].concat(way), sp = [];
      for (let i = 0; i < ctrl.length - 1; i++) { const a = ctrl[i], b = ctrl[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(L / 50);
        for (let k = 0; k < n; k++) { const t = k / n, wob = Math.sin((i + t) * 5.1 + th * 3) * 60 * Math.sin(t * Math.PI); const nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L; sp.push([a[0] + (b[0] - a[0]) * t + nx * wob, a[1] + (b[1] - a[1]) * t + ny * wob]); } }
      sp.push(ctrl[ctrl.length - 1]); // water level runs downhill from the spring to the pool
      let wl = groundPre(...toW(sp[0][0], sp[0][1])) - 12; const pts = sp.map(([d, s2], i) => { const u = i / (sp.length - 1); if (i) wl = Math.min(wl - 0.5, groundPre(...toW(d, s2)) - 12); const lv = Math.max(wl, LIPH - 6 + (1 - u) * 6); wl = lv; return { d, s: s2, wl: lv, w: w * (0.55 + 0.45 * Math.min(1, u * 3)) * (1 + 0.5 * sm(0.75, 1, u)) }; });
      const S = { pts, f }; G.streams.push(S); pts.forEach((p, i) => { const k = Math.floor(p.d / cell) + ',' + Math.floor(p.s / cell); (G.sgrid.get(k) || G.sgrid.set(k, []).get(k)).push([S, i]); }); } }
  function streamAt(d, s) { const cell = 250, gx = Math.floor(d / cell), gy = Math.floor(s / cell); let best = null, bd = 1e9;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const L = G.sgrid.get((gx + i) + ',' + (gy + j)); if (!L) continue; for (const [S, k] of L) { const p = S.pts[k], q = S.pts[Math.min(S.pts.length - 1, k + 1)], vx = q.d - p.d, vy = q.s - p.s, l2 = vx * vx + vy * vy || 1, t = Math.max(0, Math.min(1, ((d - p.d) * vx + (s - p.s) * vy) / l2)), dd = Math.hypot(p.d + vx * t - d, p.s + vy * t - s) - p.w; if (dd < bd) { bd = dd; best = { dd, wl: p.wl + (q.wl - p.wl) * t, w: p.w }; } } }
    return best; }
  // the terrain under all of it: a shelf behind the falls, stream beds, pools, the cove cliff and the lake basin
  function carve(x, y, h, mh) { if (!G) return [h, mh]; const [d, s] = toL(x, y); if (d < 300 || d > 15000 || Math.abs(s) > 7500) return [h, mh];
    const ld = lipD(s);
    if (d < ld + 10 && d > ld - 1100 && Math.abs(s) < 2300) { const w = sm(2300, 1900, Math.abs(s)) * sm(ld - 1100, ld - 600, d); h += (LIPH - h) * w; }
    if (d < ld + 10 && d > 400 && Math.abs(s) < 3200) { const st = streamAt(d, s); if (st && st.dd < 160) { const bed = st.wl - 16 - 14 * sm(0, -st.w * 0.6, st.dd); h = Math.min(h, bed + Math.max(0, st.dd + st.w * 0.25) * 0.9); if (st.dd < 30) h = Math.max(h, bed - 6); }
      for (let f = 0; f < 3; f++) { const p = poolSdf(d, s, f); if (p < 120) { const bed = LIPH - 44 + 18 * sm(-160, 0, p); h = Math.min(h, bed + Math.max(0, p) * 1.2); } } }
    const L = lakeSdf(d, s); if (L < 900) { const near = lipD(s) + 30 - d, kN = sm(-260, 40, near - Math.max(Math.abs(s) - halfW(d, s < 0 ? -1 : 1), d - dFar(s)));
      const k = 1.0 + 1.6 * sm(LIP + 3600, LIP + 1200, d) + 40 * kN;
      if (L < 0) h = WL - 18 - Math.min(150, -L * 0.3); else { h = Math.min(h, WL + 6 + L * k); const wt = sm(560, 220, L); h += (Math.max(h, WL + 8 + L * 0.12) - h) * wt; }
      mh *= sm(0, 500, L); }
    return [h, mh]; }
  function wet(x, y, m) { if (!G) return false; const [d, s] = toL(x, y); m = m || 0; if (lakeSdf(d, s) < m) return true; if (d < lipD(s) + 10 && d > 300 && Math.abs(s) < 3300) { const st = streamAt(d, s); if (st && st.dd < m) return true; for (let f = 0; f < 3; f++) if (poolSdf(d, s, f) < m) return true; } return false; }
  // after the seeded map is laid out: plan the water, then clear (and re-house) anything standing in it
  function fit() { const T = W.heartwood; if (!T) return; G = null; const o = T.in + Math.PI, ox = Math.cos(o), oy = Math.sin(o);
    const g0 = { T, ox, oy, lx: -oy, ly: ox, rT: Math.hypot(T.x, T.y) }, pre = (x, y) => { const k = G; G = null; const h = typeof M3 !== 'undefined' && M3.ground ? M3.ground(x, y).h : CITY.summitH; G = k; return h; };
    G = g0; planStreams(pre);
    W.objs = W.objs.filter((ob) => ob.type !== 'tree' || !wet(ob.x, ob.y, (ob.r || 20) * 3 + 60));
    const rr = prng(4242), moved = [];
    for (const h of W.homes) { if (h.heartwood || h.isPlayer || !wet(h.x, h.y, h.size * 0.62 + 90)) continue; let spot = null;
      for (let t = 0; t < 900 && !spot; t++) { const a = rr() * TAU - Math.PI, [x, y] = polar(ringR(h.ring || 1, a, 0.05 + rr() * 0.9), a);
        if (wet(x, y, h.size + 120) || underHeartwood(x, y) || hollowDist(x, y) < 150 || chasmDist(x, y) < h.size + 8 || onCliff(x, y, h.size) || (t < 700 && !ringGround(x, y, h.ring || 1))) continue;
        if (W.homes.some((q) => q !== h && Math.hypot(q.x - x, q.y - y) < (q.size + h.size) * 0.62 * (CITY.homeGap || 1))) continue;
        if (W.objs.some((q) => q.type === 'tree' && Math.abs(q.x - x) < 80 && Math.abs(q.y - y) < 80)) continue; spot = [x, y]; }
      if (spot) { h.x = spot[0]; h.y = spot[1]; h.ang = Math.atan2(-h.y, -h.x); h.region = regionAt(h.x, h.y); moved.push(h.id); } }
    G.moved = moved; }

  /* ---------- the door ---------- */
  function doorWoodTex(hw, H) { return cvTex(512, 768, (g, w, h) => { const r = prng(41);
    // planks
    for (let i = 0; i < 8; i++) { const v = 0.82 + r() * 0.25; g.fillStyle = `rgb(${150 * v | 0},${108 * v | 0},${66 * v | 0})`; g.fillRect(i * w / 8, 0, w / 8, h);
      for (let k = 0; k < 40; k++) { g.strokeStyle = `rgba(${r() < 0.5 ? '60,36,16' : '200,160,110'},${0.15 + r() * 0.2})`; g.lineWidth = 1 + r() * 2; const x = i * w / 8 + r() * w / 8; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (r() - 0.5) * 10, h * 0.3, x + (r() - 0.5) * 10, h * 0.7, x + (r() - 0.5) * 6, h); g.stroke(); }
      g.fillStyle = 'rgba(40,22,10,.75)'; g.fillRect(i * w / 8, 0, 3, h); }
    // carved panels with glyphs (two per leaf)
    const panel = (cx, cy, pw, ph, kind) => { g.fillStyle = 'rgba(50,30,14,.35)'; g.fillRect(cx - pw / 2, cy - ph / 2, pw, ph); g.strokeStyle = 'rgba(40,24,10,.8)'; g.lineWidth = 5; g.strokeRect(cx - pw / 2, cy - ph / 2, pw, ph); g.strokeStyle = 'rgba(230,190,130,.35)'; g.lineWidth = 2; g.strokeRect(cx - pw / 2 + 4, cy - ph / 2 + 4, pw - 8, ph - 8);
      g.save(); g.translate(cx, cy); g.lineCap = 'round'; for (const [col, lw, o] of [['rgba(30,16,6,.9)', 12, 2], ['rgba(214,170,110,.85)', 6, 0]]) { g.strokeStyle = col; g.lineWidth = lw; g.save(); g.translate(o, o); g.beginPath();
        if (kind === 0) { g.moveTo(0, -ph * 0.36); g.lineTo(0, ph * 0.36); g.moveTo(-pw * 0.3, -ph * 0.1); g.lineTo(pw * 0.3, -ph * 0.1); for (const s of [-1, 1]) { g.moveTo(s * pw * 0.3, -ph * 0.1); g.lineTo(s * pw * 0.18, -ph * 0.22); g.moveTo(s * pw * 0.3, -ph * 0.1); g.lineTo(s * pw * 0.18, ph * 0.02); } g.moveTo(-pw * 0.14, ph * 0.22); g.lineTo(0, ph * 0.36); g.lineTo(pw * 0.14, ph * 0.22); }
        else { g.moveTo(0, -ph * 0.38); g.lineTo(pw * 0.28, 0); g.lineTo(0, ph * 0.38); g.lineTo(-pw * 0.28, 0); g.closePath(); g.moveTo(0, -ph * 0.18); g.lineTo(pw * 0.12, 0); g.lineTo(0, ph * 0.18); g.lineTo(-pw * 0.12, 0); g.closePath(); g.moveTo(-pw * 0.36, -ph * 0.3); g.lineTo(-pw * 0.2, -ph * 0.3); g.moveTo(pw * 0.2, ph * 0.3); g.lineTo(pw * 0.36, ph * 0.3); }
        g.stroke(); g.restore(); } g.restore(); };
    for (const s of [0.25, 0.75]) { panel(s * w, h * 0.34, w * 0.32, h * 0.2, 0); panel(s * w, h * 0.66, w * 0.3, h * 0.17, 1); }
    // iron straps with rivets
    for (const y of [0.17, 0.5, 0.84]) { g.fillStyle = '#2f2a26'; g.fillRect(0, h * y - 10, w, 20); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, h * y - 10, w, 4); for (let x = 12; x < w; x += 30) { g.fillStyle = '#1a1714'; g.beginPath(); g.arc(x, h * y, 4.5, 0, 6.3); g.fill(); g.fillStyle = 'rgba(255,240,220,.25)'; g.beginPath(); g.arc(x - 1, h * y - 1, 1.6, 0, 6.3); g.fill(); } }
    // centre seam darkening and grime at the foot
    const gr = g.createLinearGradient(0, h, 0, h * 0.8); gr.addColorStop(0, 'rgba(40,30,16,.5)'); gr.addColorStop(1, 'rgba(40,30,16,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }); }
  function glowTex2() { return cvTex(128, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(40,200,210,1)'); gr.addColorStop(0.5, 'rgba(230,255,250,1)'); gr.addColorStop(1, 'rgba(40,200,210,1)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = prng(9); for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.5})`; g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 2.5, 0, 6.3); g.fill(); } }); }
  function radialTex(inner, outer) { return cvTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, inner); gr.addColorStop(0.45, outer); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }); }
  // pointed (lancet) arch outline in door-local x,y: half width hw, springing at ys, apex at H
  function archPts(hw, ys, H, n) { const out = []; const R = ((H - ys) * (H - ys) + hw * hw) / (2 * hw) * 0.5 + hw * 0.5; // two arcs meeting at the apex
    const cxR = hw - R; for (let i = 0; i <= n; i++) { const t = i / n; // right side: from springing (hw, ys) up to apex (0,H)
      const a0 = 0, a1 = Math.atan2(H - ys, -cxR); const a = a0 + (a1 - a0) * t; out.push([cxR + Math.cos(a) * R, ys + Math.sin(a) * R]); }
    out[out.length - 1] = [0, H]; return out; }
  function buildDoor(C) { const { scene, T, trunkRad, ax, meshH, OUT, barkMat } = C; const v3 = () => new THREE.Vector3();
    const n = new THREE.Vector3(Math.cos(OUT), 0, Math.sin(OUT));
    // ground just in front of the trunk on the plateau side, and the trunk's outer surface over the door's span
    let gy = 0, rD = 0; { const c0 = ax(0.08); for (let k = 0; k < 3; k++) { let rr = 0; const f0 = Math.max(0, (gy - T.base) / T.H);
        for (let f = f0; f <= f0 + 0.13; f += 0.01) for (let a = -0.34; a <= 0.341; a += 0.04) rr = Math.max(rr, trunkRad(f, OUT + a) * Math.cos(a));
        rD = rr; gy = meshH(c0.x + n.x * (rD + 120), c0.z + n.z * (rD + 120)); } }
    const fG = (gy - T.base) / T.H, c = ax(fG), P0 = v3().set(c.x + n.x * (rD + 60), gy, c.z + n.z * (rD + 60));
    const hw = 330, ys = 620, H = 1020, grp = new THREE.Group(); grp.position.copy(P0); grp.rotation.y = Math.atan2(n.x, n.z); grp.scale.setScalar(1.35); scene.add(grp); GX.door = { x: P0.x, y: P0.z, up: gy, hgt: H * 1.35, grp };
    const wood = doorWoodTex(hw, H), woodM = new THREE.MeshLambertMaterial({ map: wood }), ironM = new THREE.MeshLambertMaterial({ color: 0x2c2724 }), frameM = barkMat;
    const A = archPts(hw, ys, H, 16), outline = [[-hw, 0]].concat(A.slice().reverse().map(([x, y]) => [-x, y]), A.slice(1), [[hw, 0]]); // left foot -> apex -> right foot
    // the glow inside: a bright plane set back in the doorway (you can't see in, only the light)
    { const sh = new THREE.Shape(); sh.moveTo(-hw, 0); for (const [x, y] of outline) sh.lineTo(x, y); const gm = new THREE.MeshBasicMaterial({ map: glowTex2(), color: 0xffffff, toneMapped: false });
      const g = new THREE.ShapeGeometry(sh); { const P = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < P.count; i++) uv.setXY(i, (P.getX(i) + hw) / (2 * hw), P.getY(i) / H); } const m = new THREE.Mesh(g, gm); m.position.z = -150; grp.add(m); GX.doorGlow = gm;
      // a dark recess box behind the leaves so the trunk never shows through the gap
      const back = new THREE.Mesh(new THREE.BoxGeometry(2 * hw + 40, H + 30, 160), new THREE.MeshBasicMaterial({ color: 0x0c1a1c })); back.position.set(0, H / 2, -235); grp.add(back); }
    // the two leaves: planked, carved, strapped in iron; each hinged at its outer edge and swung a little inward
    const gap = 70; for (const s of [-1, 1]) { const sh = new THREE.Shape(), pts = outline.filter(([x]) => x * s >= -1).map(([x, y]) => [x, y]); const xi = s * gap / 2; sh.moveTo(xi, 0); sh.lineTo(s * hw, 0);
      for (const [x, y] of (s > 0 ? pts.slice().reverse() : pts)) if (Math.abs(x) >= gap / 2) sh.lineTo(x, y); sh.lineTo(xi, A.find(([x]) => x <= gap / 2)[1]); sh.lineTo(xi, 0);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 40, bevelEnabled: true, bevelThickness: 6, bevelSize: 6, bevelSegments: 1, curveSegments: 4 }); { const P = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < P.count; i++) uv.setXY(i, (P.getX(i) + hw) / (2 * hw), P.getY(i) / H); }
      g.translate(-s * hw, 0, -60); const leaf = new THREE.Mesh(g, woodM); const piv = new THREE.Group(); piv.position.set(s * hw, 0, 0); piv.rotation.y = s * 0.16; piv.add(leaf); grp.add(piv); leaf.castShadow = true;
      // raised iron straps, hinge plates and a ring pull
      for (const y of [0.17, 0.5, 0.84]) { const yy = H * y, half = (s > 0 ? hw : hw) - gap / 2, strap = new THREE.Mesh(new THREE.BoxGeometry(half + 30, 26, 10), ironM); strap.position.set(-s * (half / 2 + 10), yy, -10); if (yy < ys + 200 || y < 0.8) piv.add(strap);
        const hinge = new THREE.Mesh(new THREE.BoxGeometry(70, 50, 18), ironM); hinge.position.set(-s * 10, yy, -12); piv.add(hinge); }
      const ring = new THREE.Mesh(new THREE.TorusGeometry(26, 5, 6, 16), ironM); ring.position.set(-s * (hw - gap / 2 - 50), 440, -4); piv.add(ring); const boss = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 10, 10), ironM); boss.rotation.x = Math.PI / 2; boss.position.set(ring.position.x, 466, -10); piv.add(boss); }
    // the carved frame: a thick bark portal grown round a dressed timber moulding, with a keystone ornament at the apex
    const curveOf = (k, z) => new THREE.CatmullRomCurve3(outline.map(([x, y]) => new THREE.Vector3(x * k, y * (k > 1 ? (y > 5 ? 1 + (k - 1) * 0.55 : 1) : 1), z)));
    { const tm = new THREE.Mesh(new THREE.TubeGeometry(curveOf(1.04, -40), 60, 34, 8, false), new THREE.MeshLambertMaterial({ color: 0x7a5434 })); grp.add(tm);
      const tm2 = new THREE.Mesh(new THREE.TubeGeometry(curveOf(1.16, -50), 60, 46, 8, false), new THREE.MeshLambertMaterial({ map: wood, color: 0xb08a5c })); grp.add(tm2);
      const portal = new THREE.Mesh(new THREE.TubeGeometry(curveOf(1.42, -120), 64, 130, 10, false), frameM); portal.castShadow = true; grp.add(portal);
      const ks = new THREE.Shape(); ks.moveTo(0, -120); ks.lineTo(90, 10); ks.lineTo(40, 70); ks.lineTo(0, 150); ks.lineTo(-40, 70); ks.lineTo(-90, 10); ks.closePath(); const kg = new THREE.ExtrudeGeometry(ks, { depth: 50, bevelEnabled: true, bevelThickness: 10, bevelSize: 8, bevelSegments: 2 }); const key = new THREE.Mesh(kg, new THREE.MeshLambertMaterial({ map: wood, color: 0xc49a66 })); key.position.set(0, H * 1.04 + 30, -20); grp.add(key);
      // threshold step and side bases
      const stoneM = new THREE.MeshLambertMaterial({ color: 0x5a554e }); const step = new THREE.Mesh(new THREE.BoxGeometry(2 * hw + 160, 36, 150), stoneM); step.position.set(0, 4, 30); grp.add(step); for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(150, 140, 170), stoneM); b.position.set(s * (hw + 120), 50, -40); grp.add(b); } }
    // lanterns on iron brackets either side of the frame
    GX.lampM = new THREE.MeshBasicMaterial({ color: 0xffc070, toneMapped: false }); const lampPts = [];
    for (const s of [-1, 1]) { const bx = s * (hw + 230), post = new THREE.Mesh(new THREE.CylinderGeometry(10, 14, 620, 6), ironM); post.position.set(bx, 310, 40); grp.add(post); const arm = new THREE.Mesh(new THREE.BoxGeometry(110, 10, 10), ironM); arm.position.set(bx - s * 40, 600, 40); grp.add(arm);
      const lg = new THREE.Group(); lg.position.set(bx - s * 85, 540, 40); grp.add(lg); const cage = new THREE.Mesh(new THREE.CylinderGeometry(30, 24, 70, 6, 1, true), new THREE.MeshLambertMaterial({ color: 0x2a2420, wireframe: false, side: THREE.DoubleSide, transparent: true, opacity: 0.55 })); lg.add(cage);
      const core = new THREE.Mesh(new THREE.CylinderGeometry(20, 16, 52, 6), GX.lampM); lg.add(core); const cap = new THREE.Mesh(new THREE.ConeGeometry(38, 36, 6), ironM); cap.position.y = 52; lg.add(cap); const bot = new THREE.Mesh(new THREE.CylinderGeometry(26, 18, 10, 6), ironM); bot.position.y = -40; lg.add(bot);
      lampPts.push(lg); }
    // glowing mushrooms (blue and violet) and moss round the foot of the frame
    { const ms = [], r = prng(77); for (let k = 0; k < 70; k++) { const s = r() < 0.5 ? -1 : 1, x = s * (hw + 60 + r() * 520), z = 40 + (r() - 0.3) * 380; ms.push([x, z, 18 + r() * 40, r() < 0.4]); }
      const capG = new THREE.SphereGeometry(1, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2); capG.scale(1, 0.6, 1); const stG = new THREE.CylinderGeometry(0.16, 0.24, 1, 6); stG.translate(0, -0.5, 0);
      GX.mushB = new THREE.MeshBasicMaterial({ color: 0x66d8ff, toneMapped: false }); GX.mushV = new THREE.MeshBasicMaterial({ color: 0xb487ff, toneMapped: false });
      const mt = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), wp = v3(), gp = [];
      for (const [mat, pick] of [[GX.mushB, false], [GX.mushV, true]]) { const L = ms.filter((m) => m[3] === pick), cap = new THREE.InstancedMesh(capG, mat, L.length), st = new THREE.InstancedMesh(stG, new THREE.MeshLambertMaterial({ color: 0xe0e6e0 }), L.length);
        L.forEach(([x, z, sz], i) => { wp.set(x, 0, z).applyMatrix4(grp.matrixWorld.compose(grp.position, grp.quaternion, grp.scale)); const y = meshH(wp.x, wp.z) - gy + sz * 1.1; e.set((r() - 0.5) * 0.4, 0, (r() - 0.5) * 0.4); q.setFromEuler(e); mt.compose(v3().set(x, y, z), q, v3().set(sz, sz * 1.2, sz)); cap.setMatrixAt(i, mt); st.setMatrixAt(i, mt); gp.push(x, y + 10, z); });
        grp.add(cap); grp.add(st); }
      const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3)); GX.doorMushGlow = new THREE.Points(gg, new THREE.PointsMaterial({ size: 160, map: radialTex('rgba(150,210,255,.9)', 'rgba(120,120,255,.25)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.3 })); grp.add(GX.doorMushGlow);
      const mossG = new THREE.IcosahedronGeometry(1, 1), mossM = new THREE.MeshLambertMaterial({ color: 0x4a6326 }), mpts = []; for (let i = 0; i < outline.length; i += 1) { const [x, y] = outline[i]; if (y < 200) continue; if (r() < 0.6) mpts.push([x * 1.42 + (r() - 0.5) * 120, y * (1 + 0.42 * 0.55) + (r() - 0.3) * 100, -40 + r() * 60, 18 + r() * 26]); }
      const mm = new THREE.InstancedMesh(mossG, mossM, mpts.length); mpts.forEach(([x, y, z, s2], i) => { mt.compose(v3().set(x, y, z), q.identity(), v3().set(s2, s2 * 0.6, s2 * 0.8)); mm.setMatrixAt(i, mt); }); grp.add(mm);
      const hgM = new THREE.MeshLambertMaterial({ color: 0x55702e }), hang = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 0.2, 1, 4).translate(0, -0.5, 0), hgM, 26); for (let i = 0; i < 26; i++) { const [x, y] = outline[(2 + (i * 7) % (outline.length - 4))]; mt.compose(v3().set(x * 1.3, y * 1.2 + 60, 30), q.identity(), v3().set(7, 120 + r() * 260, 7)); hang.setMatrixAt(i, mt); } grp.add(hang); }
    // the worn stone path out from the step
    { const r = prng(5), stones = []; for (let k = 0; k < 64; k++) { const t = r(), z = 140 + t * 900, x = (r() - 0.5) * (300 - t * 80); stones.push([x, z, 34 + r() * 30]); }
      const sg = new THREE.CylinderGeometry(1, 1.05, 1, 7), smat = new THREE.MeshLambertMaterial({ color: 0x4f4a44 }), im = new THREE.InstancedMesh(sg, smat, stones.length), mt = new THREE.Matrix4(), q = new THREE.Quaternion(), wp = v3(); grp.updateMatrixWorld(true);
      im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(stones.length * 3), 3);
      stones.forEach(([x, z, s2], i) => { wp.set(x, 0, z).applyMatrix4(grp.matrixWorld); const y = meshH(wp.x, wp.z) - gy + 3; q.setFromEuler(new THREE.Euler(0, r() * 3, 0)); mt.compose(v3().set(x, y, z), q, v3().set(s2, 8, s2 * (0.7 + r() * 0.4))); im.setMatrixAt(i, mt); const v = 0.8 + r() * 0.3; im.instanceColor.setXYZ(i, v, v * 0.97, v * 0.92); }); im.receiveShadow = true; grp.add(im); }
    // light spilling out of the gap: a soft shaft fanning over the ground and a pool of light on the step and path
    { GX.poolM = new THREE.MeshBasicMaterial({ map: radialTex('rgba(150,255,245,.95)', 'rgba(60,200,220,.35)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0.5 });
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(900, 1200), GX.poolM); pool.rotation.x = -Math.PI / 2; pool.position.set(0, 30, 420); grp.add(pool);
      const shG = new THREE.BufferGeometry(); shG.setAttribute('position', new THREE.Float32BufferAttribute([-gap / 2, 0, -60, gap / 2, 0, -60, gap / 2, 700, -60, -gap / 2, 700, -60, -260, 0, 700, 260, 0, 700], 3)); shG.setAttribute('uv', new THREE.Float32BufferAttribute([0.45, 0, 0.55, 0, 0.55, 1, 0.45, 1, 0, 0.5, 1, 0.5], 2)); shG.setIndex([0, 1, 5, 0, 5, 4, 0, 4, 3, 1, 2, 5]);
      GX.shaftM = new THREE.MeshBasicMaterial({ color: 0x7ff6ee, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }); grp.add(new THREE.Mesh(shG, GX.shaftM));
      GX.doorLight = new THREE.PointLight(0x7ff0ff, 0.6, 2600, 1.6); GX.doorLight.position.set(0, 400, 380); grp.add(GX.doorLight);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex('rgba(200,255,250,1)', 'rgba(80,220,230,.4)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6, toneMapped: false })); sp.position.set(0, 450, 40); sp.scale.set(700, 1300, 1); grp.add(sp); GX.doorSprite = sp; }
    GX.lamps = lampPts; return GX.door; }
  function animDoor(t, night) { if (!GX.door) return; const fl = 0.9 + 0.1 * Math.sin(t * 2.1) + 0.04 * Math.sin(t * 7.3);
    const k = (0.85 + 0.9 * night) * fl; GX.doorGlow.color.setRGB(k, k, k); GX.poolM.opacity = (0.08 + 0.6 * night) * fl; GX.shaftM.opacity = (0.04 + 0.22 * night) * fl; GX.doorLight.intensity = (0.25 + 1.2 * night) * fl; GX.doorSprite.material.opacity = (0.25 + 0.5 * night) * fl;
    const lk = 0.55 + night * 0.7; GX.lampM.color.setRGB(lk, lk * 0.75, lk * 0.42); const mk = 0.5 + night * 0.7; GX.mushB.color.setRGB(0.36 * mk, 0.82 * mk, 1.0 * mk); GX.mushV.color.setRGB(0.72 * mk, 0.52 * mk, 1.0 * mk); GX.doorMushGlow.material.opacity = 0.1 + night * 0.5; }

  /* ---------- water: meshes + shaders ---------- */
  const NOISE = `float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float fb(vec2 p){ return 0.55 * vn(p) + 0.3 * vn(p * 2.1 + 7.0) + 0.15 * vn(p * 4.3 - 3.0); }`;
  function wmat(vs, fs, extra) { const U = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uT: { value: 0 }, uN: { value: 0 } }, extra || {}]);
    return new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, fog: true, side: THREE.DoubleSide, vertexShader: '#include <fog_pars_vertex>\n' + vs, fragmentShader: '#include <fog_pars_fragment>\n' + NOISE + '\n' + fs }); }
  const VS_END = 'vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;\n#include <fog_vertex>\n}';
  const FS_END = 'gl_FragColor = vec4(col, a);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n#include <fog_fragment>\n}';
  function buildWater(C) { const { scene, meshH } = C, mats = GX.wmats = [];
    // the lake: painterly turquoise shallows to deep teal, sky sheen, drifting ripples, foam on the shore and under the falls
    { const d0 = LIP - 150, d1 = dFar(0) + 500, s0 = -3900, nd = 120, ns = 90, P = [], DP = [], UV = [], I = [];
      for (let i = 0; i <= nd; i++) for (let j = 0; j <= ns; j++) { const d = d0 + (d1 - d0) * i / nd, s2 = s0 + (-2 * s0) * j / ns, [x, y] = toW(d, s2), g = meshH(x, y); P.push(x, WL, y); DP.push(WL - g, d - lipD(s2)); UV.push(x, y); }
      for (let i = 0; i < nd; i++) for (let j = 0; j < ns; j++) { const a = i * (ns + 1) + j, b = a + 1, c = a + ns + 1, e = c + 1; if (Math.max(DP[a * 2], DP[b * 2], DP[c * 2], DP[e * 2]) < -20) continue; I.push(a, c, b, b, c, e); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aD', new THREE.Float32BufferAttribute(DP, 2)); g.setAttribute('aW', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I);
      const m = wmat('attribute vec2 aD; attribute vec2 aW; varying vec2 vD; varying vec2 vW; varying vec3 vP; void main(){ vD = aD; vW = aW; vP = (modelMatrix * vec4(position, 1.0)).xyz; ' + VS_END,
        `uniform float uT; uniform float uN; varying vec2 vD; varying vec2 vW; varying vec3 vP; void main(){ float dep = vD.x, fd = vD.y; if (dep < -4.0) discard;
  vec2 w = vW / 420.0; float r = fb(w + vec2(uT * 0.05, uT * 0.03)) - 0.5 * fb(w * 1.7 - vec2(uT * 0.04, -uT * 0.02));
  float sh = smoothstep(0.0, 110.0, dep); vec3 shallow = vec3(0.3, 0.6, 0.56), deep = vec3(0.04, 0.22, 0.3); vec3 col = mix(shallow, deep, sh);
  vec3 V = normalize(cameraPosition - vP); float fr = pow(1.0 - clamp(V.y, 0.0, 1.0), 3.0); col = mix(col, vec3(0.7, 0.82, 0.9), fr * 0.45 + r * 0.1);
  float gl = smoothstep(0.72, 0.9, fb(w * 3.0 + vec2(uT * 0.12, uT * 0.07))); col += gl * 0.25 * (1.0 - uN);
  float shore = (1.0 - smoothstep(4.0, 22.0 + 10.0 * vn(w * 6.0 + uT * 0.3), dep)) * (0.6 + 0.4 * sin(uT * 1.5 + w.x * 9.0));
  float fall = (1.0 - smoothstep(80.0, 900.0, fd)) * (0.55 + 0.45 * fb(w * 5.0 - vec2(0.0, uT * 0.6)));
  col = mix(col, vec3(0.95, 0.98, 1.0), clamp(shore * 0.8 + fall * 0.9, 0.0, 1.0));
  col *= mix(1.0, 0.13, uN); col += uN * vec3(0.01, 0.05, 0.07) * (fall + 0.3);
  float a = mix(0.55, 0.93, sh) + shore * 0.3; ` + FS_END);
      const lake = new THREE.Mesh(g, m); lake.frustumCulled = false; lake.renderOrder = 2; scene.add(lake); mats.push(m); GX.lake = lake; }
    // streams: ribbons along their beds, glittering and running downhill
    const smat = wmat('attribute vec2 aU; varying vec2 vU; void main(){ vU = aU; ' + VS_END,
      `uniform float uT; uniform float uN; varying vec2 vU; void main(){ float e = abs(vU.x - 0.5) * 2.0; vec2 q = vec2(vU.x * 3.0, vU.y * 0.9 - uT * 1.6);
  float st = fb(q * vec2(2.0, 1.0)), gl = smoothstep(0.78, 0.95, fb(q * vec2(5.0, 3.0) + 3.0));
  vec3 col = mix(vec3(0.16, 0.46, 0.55), vec3(0.45, 0.74, 0.8), st); col += gl * 0.5; col = mix(col, vec3(0.92, 0.97, 1.0), smoothstep(0.85, 1.0, e) * 0.5);
  col *= mix(1.0, 0.16, uN); float a = (1.0 - smoothstep(0.86, 1.0, e)) * 0.9; ` + FS_END); mats.push(smat);
    { const P = [], UV = [], I = []; for (const S of G.streams) { const pts = S.pts.concat([{ d: lipD(S.pts[S.pts.length - 1].s) - 200, s: S.pts[S.pts.length - 1].s * 0.9, wl: LIPH - 6, w: S.pts[S.pts.length - 1].w * 1.3 }]); let acc = 0; const base = P.length / 3;
        pts.forEach((p, i) => { const q = pts[Math.min(pts.length - 1, i + 1)], o = pts[Math.max(0, i - 1)], td = q.d - o.d, ts = q.s - o.s, l = Math.hypot(td, ts) || 1, nd = -ts / l, ns = td / l; if (i) acc += Math.hypot(p.d - o.d, p.s - o.s);
          for (const side of [-1, 1]) { const [x, y] = toW(p.d + nd * p.w * side * 1.05, p.s + ns * p.w * side * 1.05); P.push(x, p.wl + 2, y); UV.push(side < 0 ? 0 : 1, acc / 260); } if (i) { const a = base + (i - 1) * 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }); }
      for (let f = 0; f < 3; f++) { const [s0, s1] = FALLS[f], base = P.length / 3, nu = 12, nv = 6; for (let i = 0; i <= nv; i++) for (let j = 0; j <= nu; j++) { const s2 = s0 - 30 + (s1 - s0 + 60) * j / nu, d = lipD(s2) - 420 + 422 * i / nv, [x, y] = toW(d, s2); P.push(x, LIPH - 6, y); UV.push(j / nu * 0.6 + 0.2, d / 260); }
        for (let i = 0; i < nv; i++) for (let j = 0; j < nu; j++) { const a = base + i * (nu + 1) + j; I.push(a, a + nu + 1, a + 1, a + 1, a + nu + 1, a + nu + 2); } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aU', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I); const m = new THREE.Mesh(g, smat); m.frustumCulled = false; m.renderOrder = 3; scene.add(m); }
    // the three falls: curved sheets pouring off the lip, streaked and foaming, a second faster veil in front
    const fmat = (k) => wmat('attribute vec2 aU; varying vec2 vU; void main(){ vU = aU; ' + VS_END,
      `uniform float uT; uniform float uN; varying vec2 vU; void main(){ float u = vU.x, v = vU.y; vec2 q = vec2(u * ${k ? '70.0' : '45.0'}, v * 5.0 - uT * ${k ? '2.6' : '1.8'});
  float st = fb(q * vec2(1.0, 0.35)), st2 = vn(q * vec2(2.3, 0.6) + 5.0), st3 = vn(vec2(u * ${k ? '160.0' : '110.0'}, v * 9.0 - uT * 3.4));
  float streak = smoothstep(0.35, 0.8, st * 0.6 + st2 * 0.3 + st3 * 0.3); vec3 blue = vec3(0.26, 0.5, 0.6), white = vec3(0.96, 0.99, 1.0);
  vec3 col = mix(blue, white, clamp(streak * 0.85 + smoothstep(0.75, 1.0, v) * 0.6, 0.0, 1.0)); col *= 0.78 + 0.22 * smoothstep(0.0, 0.25, v) ;
  float edge = smoothstep(0.0, 0.07, u) * smoothstep(1.0, 0.93, u); float a = ${k ? '(0.15 + 0.6 * smoothstep(0.5, 0.85, st3 + st2 * 0.3)) * (0.3 + 0.7 * v)' : '(0.62 + 0.36 * streak)'} * edge * smoothstep(0.0, 0.03, v);
  col *= mix(1.0, 0.2, uN); col += uN * vec3(0.02, 0.07, 0.09); ` + FS_END);
    GX.fallM = [fmat(0), fmat(1)]; mats.push(...GX.fallM);
    for (const [k, out] of [[0, 0], [1, 34]]) { const P = [], UV = [], I = []; for (let f = 0; f < 3; f++) { const [s0, s1] = FALLS[f], nu = 30, nv = 26, base = P.length / 3;
        for (let i = 0; i <= nv; i++) for (let j = 0; j <= nu; j++) { const v = i / nv, s2 = s0 + (s1 - s0) * j / nu, bulge = Math.sin(j / nu * Math.PI * 3 + f) * 25, dd = lipD(s2) - 6 + out + (40 + 300 * Math.pow(v, 0.6)) * (v > 0 ? 1 : 0) + bulge * v, y = LIPH - 4 - (LIPH - WL + 8) * Math.pow(v, 1.15) + (v === 0 ? 0 : 0);
          const [x, z] = toW(dd, s2 + (s2 - (s0 + s1) / 2) * 0.06 * v); P.push(x, y, z); UV.push(j / nu, v); }
        for (let i = 0; i < nv; i++) for (let j = 0; j < nu; j++) { const a = base + i * (nu + 1) + j; I.push(a, a + nu + 1, a + 1, a + 1, a + nu + 1, a + nu + 2); } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aU', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I); const m = new THREE.Mesh(g, GX.fallM[k]); m.frustumCulled = false; m.renderOrder = 4 + k; GX.fallM[k].side = THREE.DoubleSide; scene.add(m); }
    // spray and mist billowing up from the plunge pools
    { const pos = [], ph = [], r = prng(99); for (let f = 0; f < 3; f++) { const [s0, s1] = FALLS[f]; for (let k = 0; k < 90; k++) { const s2 = s0 + (s1 - s0) * r(), [x, y] = toW(lipD(s2) + 240 + r() * 380, s2); pos.push(x, WL + 10, y); ph.push(r()); } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aPh', new THREE.Float32BufferAttribute(ph, 1));
      GX.mist = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uN: { value: 0 }, uS: { value: 1 }, map: { value: radialTex('rgba(255,255,255,.9)', 'rgba(255,255,255,.35)') } }, transparent: true, depthWrite: false,
        vertexShader: 'attribute float aPh; uniform float uT; uniform float uS; varying float vA; void main(){ float f = fract(uT * 0.09 + aPh); vec3 p = position + vec3(sin(aPh * 21.0) * 120.0 * f, f * 700.0, cos(aPh * 13.0) * 160.0 * f + f * 200.0); vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = uS * (260.0 + f * 900.0) * 600.0 / -mv.z; vA = (1.0 - f) * smoothstep(0.0, 0.15, f); }',
        fragmentShader: 'uniform sampler2D map; uniform float uN; varying float vA; void main(){ vec4 c = texture2D(map, gl_PointCoord); gl_FragColor = vec4(mix(vec3(1.0), vec3(0.14, 0.2, 0.24), uN), c.a * vA * 0.42); }' });
      const pts = new THREE.Points(g, GX.mist); pts.frustumCulled = false; pts.renderOrder = 6; scene.add(pts); }
    // a faint rainbow in the spray by day
    { const g = new THREE.RingGeometry(1500, 1750, 64, 1, 0, Math.PI), P = g.attributes.position, cc = []; for (let i = 0; i < P.count; i++) { const t = (Math.hypot(P.getX(i), P.getY(i)) - 1500) / 250, c = new THREE.Color().setHSL(0.8 * (1 - t), 0.9, 0.6); cc.push(c.r, c.g, c.b); } g.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3));
      GX.bow = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
      const m = new THREE.Mesh(g, GX.bow), [x, z] = toW(lipD(0) + 900, 200); m.position.set(x, WL + 80, z); m.rotation.y = Math.atan2(G.ox, G.oy) + Math.PI / 2 * 0; m.lookAt(x + G.ox, WL + 80, z + G.oy); scene.add(m); GX.bowMesh = m; } }
  function animWater(t, night, C) { if (!GX.wmats) return; for (const m of GX.wmats) { m.uniforms.uT.value = t; m.uniforms.uN.value = night; } GX.mist.uniforms.uT.value = t; GX.mist.uniforms.uN.value = night; GX.mist.uniforms.uS.value = C && C.ps ? C.ps : 1; GX.bow.opacity = 0.13 * (1 - night); GX.bowMesh.visible = night < 0.6; }
  function doorCard() { const btn = (h) => `<div class="wrapgap" style="margin-top:10px">${h}</div>`;
    openModal(`<h2>🌳 The Lumen Tree</h2><p>The great door stands a hand's width open, and Lumen light spills out over the roots. Inside is the commune of the Hollow, where every delver's road meets.</p><p class="dim">Coming soon.</p>${btn('<button class="btn deep" data-act="close">Enter the Lumen Tree</button><button class="btn ghost" data-act="close">Not now</button>')}`, 'city'); }
  function build(C) { if (GX.built) return; GX.built = true; buildDoor(C); if (G) buildWater(C); }
  function anim(t, night, ps) { animDoor(t, night); animWater(t, night, { ps }); }
  return { build, anim, wet, carve, fit, doorCard, toW, toL, lipD, LIP, LIPH, WL, FALLS, lakeSdf, dFar, halfW, get door() { return GX.door; }, get spec() { return G; }, gx: GX };
})();

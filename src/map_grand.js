
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
  const lipD = (s) => LIP + 6e-5 * s * s, DB = 3440, BL = 2500;
  const toW = (d, s) => [G.T.x + G.ox * d + G.lx * s, G.T.y + G.oy * d + G.ly * s];
  const toL = (x, y) => { const dx = x - G.T.x, dy = y - G.T.y; return [dx * G.ox + dy * G.oy, dx * G.lx + dy * G.ly]; };
  const halfW = (d, sd) => (2300 + 800 * sm(LIP, LIP + 2500, d)) * (1 + 0.06 * Math.sin(d / 700 + sd * 1.7) + 0.04 * Math.sin(d / 290 + sd * 3.1));
  const dFar = (s) => Math.sqrt(Math.max(0, (CITY.R + 800) ** 2 - s * s)) - G.rT;
  function lakeSdf(d, s) { return Math.max(Math.abs(s) - halfW(d, s < 0 ? -1 : 1), lipD(s) + 30 - d, d - dFar(s)); }
  function poolSdf(d, s, f) { return Math.max(poolBack(d, s, f), d - lipD(s)); }
  function poolBack(d, s, f) { const [s0, s1] = FALLS[f], ld = lipD(s), R = 170, qx = Math.abs(s - (s0 + s1) / 2) - (s1 - s0) / 2 - 40 + R, qy = ld - 420 - d + R;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - R + 28 * Math.sin(s / 97 + f * 2) + 18 * Math.sin(d / 61 + s / 140); }
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
  function wet(x, y, m) { if (!G) return false; const [d, s] = toL(x, y); m = m || 0; if (d > 1300 && d < 3700 && Math.abs(s) < 2900) { const BP = GX.bplan || (GX.bplan = bridgePlan()); for (let i = 0; i < BP.length; i += 2) if (Math.hypot(BP[i].x - d, BP[i].z - s) < 150 + m) return true; } if (lakeSdf(d, s) < m) return true; if (d < lipD(s) + 10 && d > 300 && Math.abs(s) < 3300) { const st = streamAt(d, s); if (st && st.dd < m) return true; for (let f = 0; f < 3; f++) if (poolSdf(d, s, f) < m) return true; } return false; }
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
    for (let i = 0; i < 8; i++) { const v = 0.82 + r() * 0.25; g.fillStyle = `rgb(${172 * v | 0},${146 * v | 0},${112 * v | 0})`; g.fillRect(i * w / 8, 0, w / 8, h);
      for (let k = 0; k < 40; k++) { g.strokeStyle = `rgba(${r() < 0.5 ? '110,90,66' : '235,220,195'},${0.15 + r() * 0.2})`; g.lineWidth = 1 + r() * 2; const x = i * w / 8 + r() * w / 8; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (r() - 0.5) * 10, h * 0.3, x + (r() - 0.5) * 10, h * 0.7, x + (r() - 0.5) * 6, h); g.stroke(); }
      g.fillStyle = 'rgba(70,54,38,.6)'; g.fillRect(i * w / 8, 0, 3, h); }
    // carved panels with glyphs (two per leaf)
    const panel = (cx, cy, pw, ph, kind) => { g.fillStyle = 'rgba(50,30,14,.35)'; g.fillRect(cx - pw / 2, cy - ph / 2, pw, ph); g.strokeStyle = 'rgba(40,24,10,.8)'; g.lineWidth = 5; g.strokeRect(cx - pw / 2, cy - ph / 2, pw, ph); g.strokeStyle = 'rgba(230,190,130,.35)'; g.lineWidth = 2; g.strokeRect(cx - pw / 2 + 4, cy - ph / 2 + 4, pw - 8, ph - 8);
      g.save(); g.translate(cx, cy); g.lineCap = 'round'; for (const [col, lw, o] of [['rgba(30,16,6,.9)', 12, 2], ['rgba(214,170,110,.85)', 6, 0]]) { g.strokeStyle = col; g.lineWidth = lw; g.save(); g.translate(o, o); g.beginPath();
        if (kind === 0) { g.moveTo(0, -ph * 0.36); g.lineTo(0, ph * 0.36); g.moveTo(-pw * 0.3, -ph * 0.1); g.lineTo(pw * 0.3, -ph * 0.1); for (const s of [-1, 1]) { g.moveTo(s * pw * 0.3, -ph * 0.1); g.lineTo(s * pw * 0.18, -ph * 0.22); g.moveTo(s * pw * 0.3, -ph * 0.1); g.lineTo(s * pw * 0.18, ph * 0.02); } g.moveTo(-pw * 0.14, ph * 0.22); g.lineTo(0, ph * 0.36); g.lineTo(pw * 0.14, ph * 0.22); }
        else { g.moveTo(0, -ph * 0.38); g.lineTo(pw * 0.28, 0); g.lineTo(0, ph * 0.38); g.lineTo(-pw * 0.28, 0); g.closePath(); g.moveTo(0, -ph * 0.18); g.lineTo(pw * 0.12, 0); g.lineTo(0, ph * 0.18); g.lineTo(-pw * 0.12, 0); g.closePath(); g.moveTo(-pw * 0.36, -ph * 0.3); g.lineTo(-pw * 0.2, -ph * 0.3); g.moveTo(pw * 0.2, ph * 0.3); g.lineTo(pw * 0.36, ph * 0.3); }
        g.stroke(); g.restore(); } g.restore(); };
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
  function doorSpot(C) { if (GX.spot) return GX.spot; const { T, trunkRad, ax, meshH, OUT } = C, n = { x: Math.cos(OUT), z: Math.sin(OUT) };
    let gy = 0, rD = 0; { const c0 = ax(0.08); for (let k = 0; k < 3; k++) { let rr = 0; const f0 = Math.max(0, (gy - T.base) / T.H);
        for (let f = f0; f <= f0 + 0.13; f += 0.01) for (let a = -0.34; a <= 0.341; a += 0.04) rr = Math.max(rr, trunkRad(f, OUT + a) * Math.cos(a));
        rD = rr; gy = meshH(c0.x + n.x * (rD + 120), c0.z + n.z * (rD + 120)); } }
    const c = ax((gy - T.base) / T.H); return (GX.spot = { gy, rD, cx: c.x, cz: c.z, OUT, top: gy + 1020 * 1.35 * 1.3, span: (330 * 1.42 * 1.35 + 260) / rD }); }
  // bend root points out of the doorway so they curl round the portal instead of cutting through it
  function dodge(pts, C) { const D = doorSpot(C); for (const p of pts) { if (p.y > D.top + 250) continue; const dx = p.x - D.cx, dz = p.z - D.cz, dist = Math.hypot(dx, dz); if (dist > D.rD + 650) continue;
      let da = Math.atan2(dz, dx) - D.OUT; da = Math.atan2(Math.sin(da), Math.cos(da)); const ys = sm(D.top + 250, D.top - 300, p.y), span = D.span * (0.55 + 0.45 * ys) * sm(D.rD + 650, D.rD + 250, dist); if (Math.abs(da) >= span) continue;
      const na = D.OUT + (da < 0 ? -1 : 1) * span; p.x = D.cx + Math.cos(na) * dist; p.z = D.cz + Math.sin(na) * dist; } return pts; }
  function buildDoor(C) { const { scene, T, trunkRad, ax, meshH, OUT, barkMat } = C; const v3 = () => new THREE.Vector3();
    const n = new THREE.Vector3(Math.cos(OUT), 0, Math.sin(OUT));
    // ground just in front of the trunk on the plateau side, and the trunk's outer surface over the door's span
    const { gy, rD } = doorSpot(C);
    const fG = (gy - T.base) / T.H, c = ax(fG), P0 = v3().set(c.x + n.x * (rD + 60), gy, c.z + n.z * (rD + 60));
    const hw = 330, ys = 620, H = 1020, grp = new THREE.Group(); grp.position.copy(P0); grp.rotation.y = Math.atan2(n.x, n.z); grp.scale.setScalar(1.35); scene.add(grp); GX.door = { x: P0.x, y: P0.z, up: gy, hgt: H * 1.35, grp };
    const wood = doorWoodTex(hw, H), woodM = new THREE.MeshLambertMaterial({ map: wood }), ironM = new THREE.MeshLambertMaterial({ color: 0x2c2724 }), frameM = new THREE.MeshLambertMaterial({ map: barkMat.map, color: 0xc2ad94 });
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
    { const tm = new THREE.Mesh(new THREE.TubeGeometry(curveOf(1.04, -40), 60, 34, 8, false), new THREE.MeshLambertMaterial({ color: 0xa8957c })); grp.add(tm);
      const tm2 = new THREE.Mesh(new THREE.TubeGeometry(curveOf(1.16, -50), 60, 46, 8, false), new THREE.MeshLambertMaterial({ map: wood, color: 0xd6c6ae })); grp.add(tm2);
      const portal = new THREE.Mesh(new THREE.TubeGeometry(curveOf(1.42, -120), 64, 130, 10, false), frameM); portal.castShadow = true; grp.add(portal);
      /* no keystone or board over the arch: the door and its light carry it */
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
  const mats_push = (m) => (GX.wmats || (GX.wmats = [])).push(m);
  function buildWater(C) { const { scene, meshH } = C, mats = GX.wmats || (GX.wmats = []);
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
      for (let f = 0; f < 3; f++) { const [s0, s1] = FALLS[f], base = P.length / 3; let nu, nv; nu = 24, nv = 10; for (let i = 0; i <= nv; i++) for (let j = 0; j <= nu; j++) { const s2 = s0 - 140 + (s1 - s0 + 280) * j / nu, d = lipD(s2) - 560 + 562 * i / nv, [x, y] = toW(d, s2), e = Math.max(0, Math.min(1, 1 + poolBack(d, s2, f) / 260)); P.push(x, LIPH - 6, y); UV.push(0.5 + 0.5 * e * (j < nu / 2 ? -1 : 1), d / 260); }
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

  /* ---------- the miner's island (concept/miner-island.jpg) ---------- */
  const ID = 7420, IS = 0, IR = 330, ITOP = 22, S = 115;
  function ell(B, cx, cy, cz, rx, ry, rz, col, n, k) { const nu = n || 12, nv = Math.max(6, (nu * 0.6) | 0), idx = [], [U, V] = B.uvr(k || 'white', 0.5, 0.5);
    for (let i = 0; i <= nv; i++) { const th = i / nv * Math.PI, st = Math.sin(th), ct = Math.cos(th); for (let j = 0; j <= nu; j++) { const ph = j / nu * Math.PI * 2, x = st * Math.cos(ph), z = st * Math.sin(ph), y = ct, sh = 0.72 + 0.28 * (y * 0.5 + 0.5);
        idx.push(B.vert(cx + x * rx, cy + y * ry, cz + z * rz, x / rx, y / ry, z / rz, U, V, [col[0] * sh, col[1] * sh, col[2] * sh])); } }
    for (let i = 0; i < nv; i++) for (let j = 0; j < nu; j++) { const a = idx[i * (nu + 1) + j], b = idx[i * (nu + 1) + j + 1], c = idx[(i + 1) * (nu + 1) + j], d = idx[(i + 1) * (nu + 1) + j + 1]; B.tris(a, b, c); B.tris(b, d, c); } }
  const tubeW = (B, p, q, r0, r1, col) => B.tube(p, q, r0, r1, 10, 'white', col, 'white');
  function buildIsland(C) { const { scene, PR } = C, K = HOUSE_KIT.kit; if (!K) return; const [ix, iz] = toW(ID, IS), y0 = WL + ITOP;
    const grp = new THREE.Group(); grp.position.set(ix, y0, iz); grp.rotation.y = Math.atan2(G.ox, G.oy); scene.add(grp); GX.island = grp; grp.updateMatrixWorld(true);
    // the island: a low, smooth grey mound under patchy turf
    { const nA = 96, nR = 30, P = [], Cc = [], I = [], P2 = [], C2 = [], I2 = [], rq = (a) => IR * (1 + 0.1 * Math.sin(3 * a + 1) + 0.05 * Math.sin(5 * a + 2) + 0.03 * Math.sin(9 * a)) * (1 + 0.26 * Math.cos(2 * a)) * 0.9, r = prng(31);
      // a smooth, gently domed grey back; turf, moss and dirt lie over it in patches, the bare skin glossy where it shows
      const hAt = (t, a, x, z) => t < 0.6 ? 6 * Math.sin(x / 40) * Math.sin(z / 50) * (1 - t) : -ITOP * 2.1 * (1 - Math.cos(Math.PI * Math.min(1, (t - 0.6) / 0.52))) / 2 + 1.5 * Math.sin(a * 5) * (t < 1 ? 1 : 0);
      const cov = (x, z, t) => { if (t < 0.5) return 1; const n = 0.5 + 0.35 * Math.sin(x / 37 + 1.3) * Math.sin(z / 29 + 0.7) + 0.25 * Math.sin((x + z) / 23) + 0.12 * Math.sin(x / 11 - z / 13); return n - (t - 0.5) * 1.5 > 0.2 ? 1 : 0; };
      const cv = []; for (let i = 0; i <= nR; i++) for (let j = 0; j < nA; j++) { const a = j / nA * Math.PI * 2, t = i / nR * 1.12, rr = rq(a) * t, x = Math.cos(a) * rr, z = Math.sin(a) * rr, h = hAt(t, a, x, z);
        const n = 0.88 + 0.16 * r(), pl = t > 0.78 ? 0.86 + 0.14 * Math.abs(Math.sin(z / 7 + Math.sin(x / 40))) : 1, wet = t > 1.0 ? 0.75 : 1; const sk = [0.13 * n * pl * wet, 0.145 * n * pl * wet, 0.165 * n * pl * wet];
        P.push(x, h, z); Cc.push(...sk);
        const dirt = Math.max(0, 1 - Math.hypot(x - 20, z - 50) / 120) + Math.max(0, 1 - Math.hypot(x - 60, z + 10) / 70) * 0.7, moss = 0.5 + 0.5 * Math.sin(x / 19 + z / 23); let c = [0.4 * n, 0.55 * n, 0.24 * n]; c = c.map((v, k) => v + ([0.3, 0.42, 0.2][k] * n - v) * moss * sm(0.35, 0.7, t)); if (dirt > 0) c = c.map((v, k) => v + ([0.52, 0.42, 0.28][k] * n - v) * Math.min(1, dirt * 1.4));
        P2.push(x, h + 1.6, z); C2.push(...c); cv.push(cov(x, z, t)); }
      P.push(0, 6, 0); Cc.push(0.25, 0.27, 0.3); P2.push(0, 7.6, 0); C2.push(0.42, 0.56, 0.25); const ctr = P.length / 3 - 1; cv.push(1);
      for (let j = 0; j < nA; j++) { I.push(ctr, (j + 1) % nA, j); I2.push(ctr, (j + 1) % nA, j); } for (let i = 0; i < nR; i++) for (let j = 0; j < nA; j++) { const a = i * nA + j, b = i * nA + (j + 1) % nA, c = a + nA, d = b + nA; I.push(a, b, c, b, d, c); if (cv[a] + cv[b] + cv[c] >= 2) I2.push(a, b, c); if (cv[b] + cv[d] + cv[c] >= 2) I2.push(b, d, c); }
      const mk = (PP, CC, II, mat) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(PP, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(CC, 3)); g.setIndex(II); g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); m.receiveShadow = true; grp.add(m); return m; };
      mk(P, Cc, I, new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 55, specular: 0x3c454c }));
      const m = mk(P2, C2, I2, new THREE.MeshLambertMaterial({ vertexColors: true }));
      // a few faint barnacle clusters on the bare skin near the waterline
      { const bg = new THREE.ConeGeometry(1, 1, 6, 1, true).translate(0, 0.5, 0), bm = new THREE.MeshLambertMaterial({ color: 0x9c978c }), Nb = 54, bi = new THREE.InstancedMesh(bg, bm, Nb), mb = new THREE.Matrix4(), qb = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
        for (let k = 0; k < Nb; k++) { const ca = [0.6, 2.4, 4.3][k % 3] + (r() - 0.5) * 0.18, t = 0.93 + r() * 0.08, rr = rq(ca) * t, x = Math.cos(ca) * rr, z = Math.sin(ca) * rr, h = hAt(t, ca, x, z), s2 = 1.6 + r() * 2.6; qb.setFromUnitVectors(up, new THREE.Vector3(Math.cos(ca) * 0.6, 1, Math.sin(ca) * 0.6).normalize()); mb.compose(new THREE.Vector3(x, h - 0.5, z), qb, new THREE.Vector3(s2, s2 * 0.8, s2)); bi.setMatrixAt(k, mb); } grp.add(bi); }
      // tufts, stones, a few flowers
      const tg = new THREE.ConeGeometry(1, 1, 4).translate(0, 0.5, 0), tm = new THREE.MeshLambertMaterial({ color: 0x5f7d34 }), mt = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), N = 200, tuft = new THREE.InstancedMesh(tg, tm, N); tuft.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
      for (let k = 0; k < N; k++) { const a = r() * Math.PI * 2, t = Math.sqrt(r()) * 0.62, x = Math.cos(a) * rq(a) * t, z = Math.sin(a) * rq(a) * t; if (Math.hypot(x - 20, z - 50) < 60) { k--; continue; } e.set((r() - 0.5) * 0.4, r() * 3, (r() - 0.5) * 0.4); q.setFromEuler(e); const s2 = 4 + r() * 5; mt.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s2 * 0.9, s2 * 0.8, s2 * 0.9)); tuft.setMatrixAt(k, mt); const v = 0.75 + r() * 0.5; tuft.instanceColor.setXYZ(k, v * (r() < 0.2 ? 1.3 : 1), v, v * 0.9); } grp.add(tuft);
      const sg = new THREE.DodecahedronGeometry(1, 0), sm2 = new THREE.MeshLambertMaterial({ color: 0x6c665e, flatShading: true }), M2 = 46, st = new THREE.InstancedMesh(sg, sm2, M2);
      for (let k = 0; k < M2; k++) { const a = r() * Math.PI * 2, t = k < 30 ? 0.55 + r() * 0.2 : r() * 0.6, x = Math.cos(a) * rq(a) * t, z = Math.sin(a) * rq(a) * t, s2 = k < 30 ? 9 + r() * 16 : 4 + r() * 6; e.set(r() * 3, r() * 3, 0); q.setFromEuler(e); mt.compose(new THREE.Vector3(x, (t > 0.6 ? -ITOP * 2.1 * (1 - Math.cos(Math.PI * Math.min(1, (t - 0.6) / 0.52))) / 2 : 0) + s2 * 0.2, z), q, new THREE.Vector3(s2, s2 * 0.6, s2 * 0.85)); st.setMatrixAt(k, mt); } st.castShadow = true; grp.add(st);
      const fg = new THREE.SphereGeometry(1, 5, 3), fl = new THREE.InstancedMesh(fg, new THREE.MeshBasicMaterial({ color: 0xffffff }), 40); fl.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(120), 3);
      for (let k = 0; k < 40; k++) { const a = r() * Math.PI * 2, t = 0.2 + r() * 0.55, x = Math.cos(a) * rq(a) * t, z = Math.sin(a) * rq(a) * t; mt.compose(new THREE.Vector3(x, 6, z), q.identity(), new THREE.Vector3(2.2, 2.2, 2.2)); fl.setMatrixAt(k, mt); const c = [[1, 0.95, 0.6], [1, 1, 1], [0.8, 0.7, 1], [1, 0.7, 0.6]][k % 4]; fl.instanceColor.setXYZ(k, ...c); } grp.add(fl); }
    // the shack, the miner, his pack and the campfire: built with the house kit (same painted atlas as the Ledges)
    const B = K.Builder(true, 4242);
    B.with(0.3, 0, -0.32, 0, 1, () => { const w = 0.92, d = 0.7, ye = 0.56, yr = 0.98; K.plinth(B, -w / 2, w / 2, -d / 2, d / 2, 0.12); B.walls(-w / 2 + 0.01, w / 2 - 0.01, -d / 2 + 0.01, d / 2 - 0.01, 0.12, ye, 'plaster', 0.9, 0.82);
      K.wallFace(B, w, d, (L, z, f) => K.halfTimber(B, L, z, 0.12, ye, { n: 2 }));
      for (const [x, z] of [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]]) B.box(x - 0.03, 0.1, z - 0.03, x + 0.03, ye, z + 0.03, 'timber', 'timber', [0.9, 0.9, 0.9]);
      K.gableRoof(B, { x0: -w / 2, x1: w / 2, z0: -d / 2, z1: d / 2, ye, yr, ox: 0.08, oz: 0.11, frame: true });
      { const yAt = (z) => yr - (yr - ye) * (z / (d / 2 + 0.11)) * 1.0 + 0.045; const z0 = 0.06, z1 = 0.26, x0 = -0.32, x1 = -0.08; B.quad([x0, yAt(z1), z1], [x1, yAt(z1), z1], [x1, yAt(z0), z0], [x0, yAt(z0), z0], 'cloth', [0.95, 0.82, 0.55]); }
      K.chimney(B, -0.28, -0.14, ye, yr + 0.16, 0.13);
      K.windowOn(B, d / 2, -0.16, 0.26, 0.15, 0.15, { round: true });
      K.sideX(B, w / 2, () => { K.doorOn(B, 0.008, -0.02, 0.2, 0.36, { y0: 0.12, steps: 1 }); K.windowOn(B, 0.016, -0.02, 0.36, 0.06, 0.06, { round: true }); K.lantern(B, 0.16, 0.42, 0.01, 1); });
      K.pickaxe(B, w / 2 - 0.05, d / 2 + 0.07, -0.3); K.rope(B, w / 2 + 0.08, 0.0, d / 2 + 0.1, 0.07); K.barrel(B, -w / 2 - 0.08, 0, d / 2 - 0.05, 0.06, 0.15); K.woodpile(B, -w / 2 - 0.02, 0, -0.05, 0.3, 2, Math.PI / 2); });
    // the miner: stout, bearded, wide-brimmed hat, patched brown coat over a big belly, boots, sat on a stump
    const COAT = [0.5, 0.31, 0.19], SHIRT = [0.86, 0.74, 0.56], TROU = [0.32, 0.34, 0.36], BOOT = [0.44, 0.29, 0.17], BEARD = [0.66, 0.63, 0.58], SKIN = [0.98, 0.76, 0.64], HAT = [0.52, 0.42, 0.27], GLOVE = [0.46, 0.3, 0.18];
    B.with(-0.38, 0, 0.12, 0.35, 1.25, () => { B.cyl(0, 0, 0, 0.13, 0.115, 0.17, 12, 'bark', [0.85, 0.75, 0.62], 'plank');
      ell(B, 0, 0.24, 0.0, 0.17, 0.09, 0.14, TROU); for (const s2 of [-1, 1]) { tubeW(B, [s2 * 0.08, 0.23, 0.04], [s2 * 0.1, 0.21, 0.2], 0.06, 0.05, TROU); tubeW(B, [s2 * 0.1, 0.21, 0.2], [s2 * 0.11, 0.06, 0.23], 0.05, 0.045, TROU); ell(B, s2 * 0.11, 0.045, 0.26, 0.055, 0.045, 0.085, BOOT); B.box(s2 * 0.11 - 0.05, 0.0, 0.18, s2 * 0.11 + 0.05, 0.015, 0.35, 'white', 'white', [0.2, 0.14, 0.1]);
        for (let k = 0; k < 3; k++) B.box(s2 * 0.11 - 0.03, 0.08 + k * 0.025, 0.255, s2 * 0.11 + 0.03, 0.088 + k * 0.025, 0.262, 'white', 'white', [0.85, 0.75, 0.6]); }
      ell(B, 0, 0.43, -0.01, 0.2, 0.19, 0.15, COAT); ell(B, 0, 0.37, 0.07, 0.15, 0.14, 0.13, SHIRT); ell(B, 0, 0.3, 0.07, 0.17, 0.035, 0.12, [0.36, 0.24, 0.15]);
      for (const s2 of [-1, 1]) { ell(B, s2 * 0.18, 0.53, -0.01, 0.075, 0.065, 0.075, COAT); ell(B, s2 * 0.15, 0.36, 0.05, 0.05, 0.16, 0.08, COAT); }
      ell(B, -0.2, 0.53, 0.02, 0.045, 0.04, 0.035, [0.45, 0.55, 0.47]); // the patch
      tubeW(B, [-0.19, 0.5, 0.02], [-0.21, 0.36, 0.13], 0.055, 0.05, COAT); tubeW(B, [-0.21, 0.36, 0.13], [-0.04, 0.33, 0.22], 0.05, 0.045, COAT); ell(B, -0.03, 0.33, 0.22, 0.05, 0.045, 0.05, GLOVE);
      tubeW(B, [0.19, 0.5, 0.02], [0.22, 0.38, 0.12], 0.055, 0.05, COAT); tubeW(B, [0.22, 0.38, 0.12], [0.12, 0.42, 0.22], 0.05, 0.045, COAT); ell(B, 0.12, 0.42, 0.22, 0.05, 0.045, 0.05, GLOVE);
      for (const s2 of [-1, 1]) ell(B, s2 * 0.2, 0.355, 0.13, 0.045, 0.03, 0.04, [0.78, 0.68, 0.52]); // turned-back cuffs
      ell(B, 0, 0.64, 0.02, 0.088, 0.092, 0.088, SKIN); ell(B, 0, 0.56, 0.065, 0.095, 0.105, 0.06, BEARD); ell(B, 0, 0.5, 0.085, 0.07, 0.07, 0.04, BEARD); ell(B, 0, 0.6, 0.095, 0.06, 0.018, 0.025, [0.6, 0.57, 0.53]);
      for (const s2 of [-1, 1]) { ell(B, s2 * 0.075, 0.62, -0.005, 0.03, 0.055, 0.05, BEARD); ell(B, s2 * 0.032, 0.66, 0.08, 0.012, 0.015, 0.008, [0.12, 0.1, 0.08]); ell(B, s2 * 0.05, 0.635, 0.075, 0.018, 0.012, 0.01, [1.0, 0.62, 0.58]); ell(B, s2 * 0.035, 0.685, 0.08, 0.02, 0.006, 0.008, [0.5, 0.48, 0.45]); }
      ell(B, 0, 0.628, 0.1, 0.026, 0.024, 0.024, [1.0, 0.6, 0.52]);
      B.cyl(0, 0.705, 0.0, 0.16, 0.15, 0.014, 18, 'white', HAT, 'white'); B.cyl(0, 0.705, 0.0, 0.088, 0.078, 0.085, 16, 'white', HAT, 'white'); ell(B, 0, 0.79, 0, 0.078, 0.02, 0.078, HAT);
      B.cyl(0, 0.718, 0.0, 0.09, 0.089, 0.025, 16, 'white', [0.3, 0.22, 0.14], null); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; B.box(Math.cos(a) * 0.09 - 0.006, 0.722, Math.sin(a) * 0.09 - 0.006, Math.cos(a) * 0.09 + 0.006, 0.738, Math.sin(a) * 0.09 + 0.006, 'iron', 'iron', [1.3, 1.3, 1.3]); }
      B.beam([-0.16, 0.27, 0.21], [0.24, 0.55, 0.235], 0.028, 'plank', [0.78, 0.6, 0.42]); B.beam([0.2, 0.52, 0.233], [0.26, 0.565, 0.236], 0.04, 'iron', [1.2, 1.2, 1.2]); });
    // his pack with a coiled rope and a cooking pot beside it
    B.with(-0.74, 0, 0.06, 0.2, 1.25, () => { ell(B, 0, 0.13, 0, 0.12, 0.14, 0.09, [0.48, 0.33, 0.2]); ell(B, 0, 0.21, 0.05, 0.1, 0.05, 0.05, [0.42, 0.28, 0.17]); ell(B, 0, 0.09, 0.08, 0.07, 0.05, 0.03, [0.44, 0.3, 0.18]);
      for (const s2 of [-1, 1]) B.box(s2 * 0.05 - 0.01, 0.02, 0.085, s2 * 0.05 + 0.01, 0.24, 0.1, 'white', 'white', [0.3, 0.2, 0.12]); K.rope(B, 0, 0.25, 0, 0.07); ell(B, -0.02, 0.33, -0.01, 0.045, 0.04, 0.045, [0.36, 0.36, 0.38]); B.cyl(-0.02, 0.37, -0.01, 0.008, 0.008, 0.02, 6, 'iron', [1, 1, 1], 'iron');
      B.cyl(0.02, 0, 0.18, 0.07, 0.075, 0.09, 12, 'iron', [0.55, 0.55, 0.58], 'iron'); B.cyl(0.02, 0.09, 0.18, 0.077, 0.06, 0.015, 12, 'iron', [0.45, 0.45, 0.48], 'iron'); B.cyl(0.02, 0.105, 0.18, 0.01, 0.01, 0.02, 6, 'iron', [1, 1, 1], 'iron'); });
    // campfire: a ring of stones, crossed logs and ash
    const FIRE = [0.18, 0, 0.5]; B.with(FIRE[0], 0, FIRE[2], 0, 1, () => { for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, rr = 0.13 + 0.01 * Math.sin(k * 3); ell(B, Math.cos(a) * rr, 0.015, Math.sin(a) * rr, 0.035, 0.028, 0.03, [0.55 + 0.1 * Math.sin(k), 0.53, 0.5], 8); }
      B.cyl(0, 0.0, 0, 0.11, 0.11, 0.008, 12, 'white', [0.22, 0.2, 0.18], 'white'); for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; B.beam([Math.cos(a) * 0.1, 0.012, Math.sin(a) * 0.1], [Math.cos(a) * 0.01, 0.07, Math.sin(a) * 0.01], 0.028, 'bark', [0.6, 0.45, 0.32]); } });
    const mat = K.material(); GX.islandMat = mat; const mesh = new THREE.Mesh(B.geo(), mat); mesh.scale.setScalar(S); mesh.castShadow = true; mesh.receiveShadow = true; grp.add(mesh); grp.updateMatrixWorld(true);
    const wp = (p) => new THREE.Vector3(p[0], p[1], p[2]).multiplyScalar(S).applyMatrix4(grp.matrixWorld);
    for (const c of B.chim) { const p = wp(c); PR.smoke.push([p.x, p.y, p.z, Math.random()]); } for (const l of B.lamps) { const p = wp(l); PR.glow.push([p.x, p.y, p.z, null]); }
    GX.smokeAt = B.chim.map(wp); GX.lampAt = B.lamps.map(wp);
    // the glowing pickaxe head: a curved blade traced with cyan runes, and its halo
    { const pts = []; for (let k = 0; k <= 16; k++) { const t = k / 16 - 0.5, a = t * 1.9; pts.push(new THREE.Vector3(0.23 + Math.sin(a) * 0.17 * 0.95, 0.545 + (Math.cos(a) - 1) * 0.12 + 0.0, 0.236 - Math.sin(a) * 0.04)); }
      const runes = cvTex(256, 32, (g, w, h) => { g.fillStyle = '#0d3b44'; g.fillRect(0, 0, w, h); g.strokeStyle = '#bffcff'; g.lineWidth = 2.5; const r = prng(3); for (let x = 8; x < w - 8; x += 18) { g.beginPath(); g.moveTo(x, 8 + r() * 6); g.lineTo(x + 6 + r() * 4, 16); g.lineTo(x + r() * 8, 24); if (r() < 0.5) { g.moveTo(x + 2, 16); g.lineTo(x + 10, 10); } g.stroke(); } });
      const blade = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.022, 6, false); { const P = blade.attributes.position; for (let i = 0; i < P.count; i++) { const k = Math.floor(i / 7) / 24, tp = 1 - Math.pow(Math.abs(k - 0.5) * 2, 3); } }
      GX.pickM = new THREE.MeshBasicMaterial({ map: runes, color: 0x9ff8ff, toneMapped: false }); const bm = new THREE.Mesh(blade, GX.pickM);
      const holder = new THREE.Group(); holder.position.set(-0.38, 0, 0.12); holder.rotation.y = 0.35; holder.scale.setScalar(1.25); holder.add(bm); const hs = new THREE.Group(); hs.scale.setScalar(S); hs.add(holder); grp.add(hs);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex('rgba(170,255,255,1)', 'rgba(60,220,240,.35)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); halo.position.set(0.23, 0.53, 0.25); halo.scale.set(0.5, 0.5, 1); holder.add(halo); GX.pickHalo = halo; }
    // the fire: flickering flame cards, embers, a warm pool of light and a small local light
    { const fw = wp([FIRE[0], 0.02, FIRE[2]]), fg = new THREE.Group(); fg.position.copy(fw); scene.add(fg); GX.fire = fg;
      GX.flameM = wmat('attribute vec2 aU; varying vec2 vU; void main(){ vU = aU; ' + VS_END, `uniform float uT; uniform float uN; varying vec2 vU; void main(){ vec2 u = vU; float n = fb(vec2(u.x * 4.0, u.y * 3.0 - uT * 3.5)); float w = (1.0 - u.y) * 0.5 + 0.1; float d = abs(u.x - 0.5) + (n - 0.5) * 0.25 * u.y;
  float f = smoothstep(w, w - 0.18, d) * smoothstep(1.0, 0.55, u.y + n * 0.25); vec3 col = mix(vec3(1.0, 0.95, 0.6), vec3(1.0, 0.38, 0.06), smoothstep(0.1, 0.8, u.y + d)); float a = f; col *= 1.6; ` + FS_END);
      GX.flameM.blending = THREE.AdditiveBlending; mats_push(GX.flameM);
      for (let k = 0; k < 3; k++) { const g = new THREE.PlaneGeometry(26, 44, 1, 1); g.translate(0, 22, 0); g.setAttribute('aU', new THREE.Float32BufferAttribute([0, 1, 1, 1, 0, 0, 1, 0], 2)); const m = new THREE.Mesh(g, GX.flameM); m.rotation.y = k * Math.PI / 3; fg.add(m); }
      GX.fireLight = new THREE.PointLight(0xff9a48, 1.2, 420, 1.5); GX.fireLight.position.set(0, 40, 0); fg.add(GX.fireLight);
      GX.firePool = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.MeshBasicMaterial({ map: radialTex('rgba(255,180,90,.9)', 'rgba(255,120,40,.3)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0.4 })); GX.firePool.rotation.x = -Math.PI / 2; GX.firePool.position.y = 2; fg.add(GX.firePool);
      const ep = [], eph = []; for (let k = 0; k < 40; k++) { ep.push((Math.random() - 0.5) * 16, 10, (Math.random() - 0.5) * 16); eph.push(Math.random()); } const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.Float32BufferAttribute(ep, 3)); eg.setAttribute('aPh', new THREE.Float32BufferAttribute(eph, 1));
      GX.emberM = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uS: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexShader: 'attribute float aPh; uniform float uT; uniform float uS; varying float vA; void main(){ float f = fract(uT * 0.4 + aPh); vec3 p = position + vec3(sin(aPh * 30.0 + f * 6.0) * 10.0 * f, f * 120.0, cos(aPh * 17.0 + f * 5.0) * 10.0 * f); vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = uS * 5.0 * 600.0 / -mv.z; vA = 1.0 - f; }', fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(1.0, 0.6, 0.2, vA * smoothstep(0.5, 0.1, d)); }' });
      fg.add(new THREE.Points(eg, GX.emberM)); } }
  function animIsland(t, night, ps) { if (!GX.island) return; const fl = 0.8 + 0.12 * Math.sin(t * 11.0) + 0.08 * Math.sin(t * 17.3 + 1) + 0.05 * Math.sin(t * 29.0);
    GX.fireLight.intensity = (0.6 + 1.4 * night) * fl; GX.firePool.material.opacity = (0.15 + 0.5 * night) * fl; GX.emberM.uniforms.uT.value = t; GX.emberM.uniforms.uS.value = ps || 1;
    const pk = 0.75 + 0.5 * night + 0.1 * Math.sin(t * 1.7); GX.pickM.color.setRGB(0.62 * pk, 0.97 * pk, 1.0 * pk); GX.pickHalo.material.opacity = 0.35 + 0.55 * night; GX.islandMat.emissiveIntensity = night * 0.8; }
  /* ---------- the plateau bridge: a living root bridge grown out of the Lumen Tree, straight over the pools ---------- */
  // a tapering tube along points with per-point radius (bark-mapped)
  function rtube(pts, rad, seg) { const cu = new THREE.CatmullRomCurve3(pts), n = pts.length * 2, F = cu.computeFrenetFrames(n, false), P = [], N = [], UV = [], I = []; let acc = 0, prev = null;
    for (let i = 0; i <= n; i++) { const u = i / n, c = cu.getPointAt(u), r0 = rad(u); if (prev) acc += prev.distanceTo(c); prev = c;
      for (let j = 0; j <= seg; j++) { const a = j / seg * Math.PI * 2, nx = F.normals[i], bx = F.binormals[i], dx = Math.cos(a), dy = Math.sin(a), rr = r0 * (1 + 0.08 * Math.sin(a * 3 + i * 0.7));
        P.push(c.x + (nx.x * dx + bx.x * dy) * rr, c.y + (nx.y * dx + bx.y * dy) * rr, c.z + (nx.z * dx + bx.z * dy) * rr); N.push(nx.x * dx + bx.x * dy, nx.y * dx + bx.y * dy, nx.z * dx + bx.z * dy); UV.push(j / seg, acc / 220); } }
    for (let i = 0; i < n; i++) for (let j = 0; j < seg; j++) { const a = i * (seg + 1) + j, b = a + seg + 1; I.push(a, b, a + 1, a + 1, b, b + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I); return g; }
  // the bridge root's course in plan (local d,s): out of the trunk on one side, along the plateau, over the pools in a long arc, down into the far side
  const BCTL = [[1500, -1450], [2450, -2350], [3230, -2150], [3440, -1150], [3480, 0], [3420, 1150], [3220, 2150], [2700, 2750]];
  function bridgePlan(c0) { const c = (c0 ? [c0] : []).concat(BCTL).map(([d, s2]) => new THREE.Vector3(d, 0, s2)); return new THREE.CatmullRomCurve3(c, false, 'centripetal').getPoints(c0 ? 110 : 90); }
  function bridgeRoot(C) { if (!G) return null; if (GX.bpath) return GX.bpath; const D = doorSpot(C), { meshH } = C, a0 = 0.8, P = bridgePlan([D.rD * 0.82 * Math.cos(a0), -D.rD * 0.82 * Math.sin(a0)]), n = P.length - 1, pts = [], rs = [], deck = [];
    P.forEach((p, i) => { const u = i / n, [x, z] = toW(p.x, p.z), g = meshH(x, z), rr = (135 - 55 * u) * (1 - 0.75 * sm(0.9, 1, u)) * (0.75 + 0.25 * sm(0, 0.06, u) + 0.4 * (1 - sm(0, 0.05, u)));
      const b = sm(0.3, 0.42, u) * sm(0.93, 0.83, u), yD = LIPH + 50 + 55 * Math.cos(Math.PI * p.z / 4800); let y = g + rr * 0.15 + (1 - sm(0, 0.12, u)) * 260;
      y = y + (Math.max(yD, g + rr * 0.6) - y) * b; if (u > 0.93) y = g - rr * 0.6 * sm(0.93, 1, u); pts.push(new THREE.Vector3(x, y, z)); rs.push(rr); deck.push(b); });
    for (let k = 0; k < 3; k++) for (let i = 1; i < n; i++) if (deck[i] > 0.02) pts[i].y = Math.max(pts[i].y, (pts[i - 1].y + pts[i + 1].y) / 2 - 2);
    const out = [{ pts, rs, k: 0 }];
    // two thinner roots twining round the span, and a few rootlets splaying into the ground at the far end
    for (const ph of [0, Math.PI]) { const p2 = [], r2 = []; for (let i = Math.round(n * 0.26); i <= Math.round(n * 0.97); i++) { const u = i / n, p = pts[i], q = pts[Math.min(n, i + 1)], t = new THREE.Vector3().subVectors(q, p).setY(0).normalize(), sd = new THREE.Vector3(-t.z, 0, t.x), a = ph + u * 26, rr = rs[i];
        p2.push(new THREE.Vector3().copy(p).addScaledVector(sd, Math.cos(a) * rr * 0.95).add(new THREE.Vector3(0, Math.sin(a) * rr * 0.7 - rr * 0.1, 0))); r2.push(rr * 0.28); } out.push({ pts: p2, rs: r2, k: 1 + ph }); }
    const e = pts[Math.round(n * 0.9)]; for (let k = 0; k < 4; k++) { const [d0, s0] = toL(e.x, e.z), fa = 0.4 + k * 0.55, p2 = [], r2 = []; for (let i = 0; i <= 10; i++) { const u = i / 10, dd = d0 - Math.cos(fa) * 420 * u, ss = s0 + Math.sin(fa) * 420 * u * (k % 2 ? 1 : 0.6), [x, z] = toW(dd, ss), g = meshH(x, z); p2.push(new THREE.Vector3(x, e.y + (g - 10 - e.y) * Math.min(1, u * 1.6) + Math.sin(u * Math.PI) * 20, z)); r2.push(40 * (1 - 0.85 * u) + 4); } out.push({ pts: p2, rs: r2, k: 5 + k }); }
    GX.bpath = { pts, rs, deck, out }; return GX.bpath; }
  function buildBridge(C) { const { scene, PR } = C, B = GX.bpath; if (!B) return; const grp = new THREE.Group(); scene.add(grp); GX.bridge = grp; const r = prng(23), V = (x, y, z) => new THREE.Vector3(x, y, z), mt = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    const n = B.pts.length - 1, onDeck = () => { for (;;) { const i = 2 + ((r() * (n - 4)) | 0); if (B.deck[i] > 0.5) { const p = B.pts[i], qn = B.pts[i + 1], t = V(qn.x - p.x, 0, qn.z - p.z).normalize(); return { p, sd: V(-t.z, 0, t.x), rr: B.rs[i] }; } } };
    // extra moss on top, hanging moss and vines off the sides, glowing mushrooms in the crooks
    { const N = 110, im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ color: 0x324a1c }), N); im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
      for (let k = 0; k < N; k++) { const { p, sd, rr } = onDeck(), o = (r() - 0.5) * 1.4, sc = 8 + r() * 14; mt.compose(V(p.x + sd.x * rr * o, p.y + rr * Math.cos(o) * 0.92, p.z + sd.z * rr * o), q.identity(), V(sc * 1.3, sc * 0.5, sc)); im.setMatrixAt(k, mt); const v = 0.8 + r() * 0.4; im.instanceColor.setXYZ(k, v * 0.95, v, v * 0.85); } grp.add(im); }
    { const N = 180, im = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 0.25, 1, 4).translate(0, -0.5, 0), new THREE.MeshLambertMaterial({ color: 0x55702e }), N); im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
      for (let k = 0; k < N; k++) { const { p, sd, rr } = onDeck(), s1 = r() < 0.5 ? -1 : 1, L = 30 + r() * r() * 170; e.set((r() - 0.5) * 0.15, 0, (r() - 0.5) * 0.15); q.setFromEuler(e); mt.compose(V(p.x + sd.x * rr * 0.92 * s1, p.y - rr * 0.1, p.z + sd.z * rr * 0.92 * s1), q, V(3 + r() * 4, L, 3 + r() * 4)); im.setMatrixAt(k, mt); const v = 0.7 + r() * 0.5; im.instanceColor.setXYZ(k, v, v, v * (r() < 0.3 ? 0.7 : 1)); } grp.add(im); }
    { const capG = new THREE.SphereGeometry(1, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.6, 1), stG = new THREE.CylinderGeometry(0.18, 0.26, 1, 5).translate(0, -0.5, 0), stM = new THREE.MeshLambertMaterial({ color: 0xe0e6e0 }), gp = [];
      for (const mat of [GX.mushB, GX.mushV]) { const N = 14, cap = new THREE.InstancedMesh(capG, mat, N), st = new THREE.InstancedMesh(stG, stM, N);
        for (let k = 0; k < N; k++) { const { p, sd, rr } = onDeck(), s1 = r() < 0.5 ? -1 : 1, h = 4 + r() * 6, c = 3 + r() * 3.5, pp = V(p.x + sd.x * rr * 0.75 * s1, p.y + rr * 0.6 + h, p.z + sd.z * rr * 0.75 * s1); mt.compose(pp, q.identity(), V(c, c, c)); cap.setMatrixAt(k, mt); mt.compose(pp, q.identity(), V(c, h, c)); st.setMatrixAt(k, mt); if (k % 3 === 0) gp.push(pp.x, pp.y + 6, pp.z); } grp.add(cap, st); }
      const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3)); GX.bridgeGlow = new THREE.Points(gg, GX.doorMushGlow.material); grp.add(GX.bridgeGlow); } }
  function doorCard() { const btn = (h) => `<div class="wrapgap" style="margin-top:10px">${h}</div>`;
    openModal(`<h2>🌳 The Lumen Tree</h2><p>The great door stands a hand's width open, and Lumen light spills out over the roots. Inside is the commune of the Hollow, where every delver's road meets.</p><p class="dim">Coming soon.</p>${btn('<button class="btn deep" data-act="close">Enter the Lumen Tree</button><button class="btn ghost" data-act="close">Not now</button>')}`, 'city'); }
  function build(C) { if (!GX.built) { GX.built = true; buildDoor(C); if (G) { buildWater(C); buildIsland(C); buildBridge(C); } } else if (GX.smokeAt) { for (const p of GX.smokeAt) C.PR.smoke.push([p.x, p.y, p.z, 0.3]); for (const p of GX.lampAt) C.PR.glow.push([p.x, p.y, p.z, null]); } }
  function anim(t, night, ps) { animDoor(t, night); animWater(t, night, { ps }); animIsland(t, night, ps); }
  return { build, anim, wet, dodge, doorSpot, bridgeRoot, carve, fit, doorCard, toW, toL, lipD, LIP, LIPH, WL, FALLS, lakeSdf, dFar, halfW, get door() { return GX.door; }, get spec() { return G; }, gx: GX };
})();

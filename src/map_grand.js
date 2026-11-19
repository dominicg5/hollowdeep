
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

  /* ---------- the Lumen Tree's front: plain rim ground all round the tree (no lip cliff, lake, falls, streams or hero bridge) ---------- */
  const toW = (d, s) => [G.T.x + G.ox * d + G.lx * s, G.T.y + G.oy * d + G.ly * s];
  const toL = (x, y) => { const dx = x - G.T.x, dy = y - G.T.y; return [dx * G.ox + dy * G.oy, dx * G.lx + dy * G.ly]; };
  // the ground in front of the door is evened out into the same gentle grassy rim ground as all round the tree (no ridges, cliffs or ledges)
  function carve(x, y, h, mh) { if (!G) return [h, mh]; const [d, s2] = toL(x, y); if (d < -300 || d > 5000 || Math.abs(s2) > 4400) return [h, mh]; const w = sm(5000, 3000, d) * sm(4400, 3000, Math.abs(s2)) * sm(-300, 400, d); if (w <= 0) return [h, mh];
    const tgt = CITY.summitH + 25 * Math.sin(d / 900 + s2 / 1300) * Math.cos(s2 / 1100); return [h + (tgt - h) * w, mh * (1 - w)]; }
  function wet() { return false; }
  // the tree's local frame (d out from the trunk through the door, s across)
  function fit() { const T = W.heartwood; if (!T) { G = null; return; } const o = T.in + Math.PI, ox = Math.cos(o), oy = Math.sin(o); G = { T, ox, oy, lx: -oy, ly: ox, rT: Math.hypot(T.x, T.y), moved: [] }; }

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
        for (let f = f0; f <= f0 + 1900 / T.H; f += 0.006) for (let a = -0.5; a <= 0.501; a += 0.04) rr = Math.max(rr, trunkRad(f, OUT + a) * Math.cos(a));
        rD = rr; gy = meshH(c0.x + n.x * (rD + 120), c0.z + n.z * (rD + 120)); } }
    const c = ax((gy - T.base) / T.H); return (GX.spot = { gy, rD, cx: c.x, cz: c.z, OUT, top: gy + 1020 * 1.35 * 1.3, span: (330 * 1.35 + 260 * 1.35 + 160) / rD }); }
  // bend root points out of the doorway so they curl round the portal instead of cutting through it
  function dodge(pts, C, rs) { const D = doorSpot(C); for (let i = 0; i < pts.length; i++) { const p = pts[i]; if (p.y > D.top + 250) continue; const dx = p.x - D.cx, dz = p.z - D.cz, dist = Math.hypot(dx, dz); if (dist > D.rD + 650) continue;
      let da = Math.atan2(dz, dx) - D.OUT; da = Math.atan2(Math.sin(da), Math.cos(da)); const ys = sm(D.top + 250, D.top - 300, p.y), span = (D.span * (0.55 + 0.45 * ys) + (rs ? rs[i] * 1.1 / Math.max(dist, 1) : 0)) * sm(D.rD + 650 + (rs ? rs[i] : 0), D.rD + 250, dist); if (Math.abs(da) >= span) continue;
      const na = D.OUT + (da < 0 ? -1 : 1) * span; p.x = D.cx + Math.cos(na) * dist; p.z = D.cz + Math.sin(na) * dist; } return pts; }
  function buildDoor(C) { const { scene, T, trunkRad, ax, meshH, OUT, barkMat } = C; const v3 = () => new THREE.Vector3();
    const n = new THREE.Vector3(Math.cos(OUT), 0, Math.sin(OUT));
    // ground just in front of the trunk on the plateau side, and the trunk's outer surface over the door's span
    const { gy, rD } = doorSpot(C);
    const fG = (gy - T.base) / T.H, c = ax(fG), P0 = v3().set(c.x + n.x * (rD + 40), gy, c.z + n.z * (rD + 40));
    const hw = 330, ys = 620, H = 1020, grp = new THREE.Group(); grp.position.copy(P0); grp.rotation.y = Math.atan2(n.x, n.z); grp.scale.setScalar(1.35); scene.add(grp); GX.door = { x: P0.x, y: P0.z, up: gy, hgt: H * 1.35, w: hw * 2 * 1.35, grp, nx: n.x, nz: n.z };
    const wood = doorWoodTex(hw, H), woodM = new THREE.MeshLambertMaterial({ map: wood }), ironM = new THREE.MeshLambertMaterial({ color: 0x4a3020 }), frameM = new THREE.MeshLambertMaterial({ map: barkMat.map, color: 0x8e8780 }); // the grey-brown trunk bark, matched (no warm tint)
    const A = archPts(hw, ys, H, 16), outline = [[-hw, 0]].concat(A.map(([x, y]) => [-x, y]), A.slice().reverse().slice(1), [[hw, 0]]); // left foot -> left springing -> apex -> right springing -> right foot (the old order zig-zagged through the opening)
    // the glow inside: a bright plane set back in the doorway (you can't see in, only the light)
    { const sh = new THREE.Shape(); sh.moveTo(-hw, 0); for (const [x, y] of outline) sh.lineTo(x, y); const gm = new THREE.MeshBasicMaterial({ color: 0xfff7ec, toneMapped: false, side: THREE.DoubleSide, fog: false });
      const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), gm); m.position.z = -125; grp.add(m); GX.doorGlow = gm;
      // the reveal: the doorway's inner walls are light too, so at any angle you only ever see white
      const P = [], I = []; outline.forEach(([x, y]) => { P.push(x * 1.01, y, -18, x * 1.01, y, -127); }); for (let i = 0; i < outline.length - 1; i++) { const a = i * 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); rg.setIndex(I); grp.add(new THREE.Mesh(rg, gm)); }
    // the two leaves: planked, carved, strapped in iron; each hinged at its outer edge and swung a little inward
    const gap = 110; for (const s of [-1, 1]) { const sh = new THREE.Shape(), pts = outline.filter(([x]) => x * s >= -1).map(([x, y]) => [x, y]); const xi = s * gap / 2; sh.moveTo(xi, 0); sh.lineTo(s * hw, 0);
      for (const [x, y] of (s > 0 ? pts.slice().reverse() : pts)) if (Math.abs(x) >= gap / 2) sh.lineTo(x, y); sh.lineTo(xi, A.find(([x]) => x <= gap / 2)[1]); sh.lineTo(xi, 0);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 40, bevelEnabled: true, bevelThickness: 6, bevelSize: 6, bevelSegments: 1, curveSegments: 4 }); { const P = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < P.count; i++) uv.setXY(i, (P.getX(i) + hw) / (2 * hw), P.getY(i) / H); }
      g.translate(-s * hw, 0, -60); const leaf = new THREE.Mesh(g, woodM); const piv = new THREE.Group(); piv.position.set(s * hw, 0, 0); piv.rotation.y = s * 0.18; piv.add(leaf); grp.add(piv); leaf.castShadow = true;
      // raised iron straps, hinge plates and a ring pull
      for (const y of [0.17, 0.5, 0.84]) { const yy = H * y, half = (s > 0 ? hw : hw) - gap / 2, strap = new THREE.Mesh(new THREE.BoxGeometry(half + 30, 26, 10), ironM); strap.position.set(-s * (half / 2 + 10), yy, -10); if (yy < ys + 200 || y < 0.8) piv.add(strap);
        const hinge = new THREE.Mesh(new THREE.BoxGeometry(70, 50, 18), ironM); hinge.position.set(-s * 10, yy, -12); piv.add(hinge); }
      const ring = new THREE.Mesh(new THREE.TorusGeometry(26, 5, 6, 16), ironM); ring.position.set(-s * (hw - gap / 2 - 50), 440, -4); piv.add(ring); const boss = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 10, 10), ironM); boss.rotation.x = Math.PI / 2; boss.position.set(ring.position.x, 466, -10); piv.add(boss); }
    // the carved frame: a thick bark portal grown round a dressed timber moulding, with a keystone ornament at the apex
    const curveOf = (k, z) => new THREE.CatmullRomCurve3(outline.map(([x, y]) => new THREE.Vector3(x * k, y * (k > 1 ? (y > 5 ? 1 + (k - 1) * 0.55 : 1) : 1), z)));
    { const tm = new THREE.Mesh(new THREE.TubeGeometry(curveOf(1.03, -34), 60, 13, 6, false), new THREE.MeshLambertMaterial({ map: wood, color: 0xd2c0a4 })); grp.add(tm);
      /* slim timber casing only: the trunk and its roots frame the rest */
      /* no keystone or board over the arch: the door and its light carry it */
      // threshold step and side bases
      const stoneM = new THREE.MeshLambertMaterial({ color: 0x5a554e }); /* (the grey stone step and side plinths are gone: the bark lips meet the ground instead) */ void stoneM;
      // the trunk grew round the door: bark lips bulge and fold over the casing, flaring into roots at the foot so nothing floats
      // bark lips are laid OUTSIDE the casing's outer edge (offset along the arch's outward normal), so nothing covers the leaves or the frame
      // one clean bark rim lofted from the casing's outer edge back into the trunk (replaces the three intersecting lips)
      const OL = [[-hw, -30]].concat(outline, [[hw, -30]]), NO = OL.length, nrm = OL.map(([x, y], i) => { if (y < ys) return [Math.sign(x) || 1, 0]; const a = OL[Math.max(0, i - 1)], b = OL[Math.min(NO - 1, i + 1)]; let nx = b[1] - a[1], ny = -(b[0] - a[0]); const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l; if (nx * x + ny * (y - ys * 0.5) < 0) { nx = -nx; ny = -ny; } return [nx, ny]; });
      const zt = (x) => { const X = Math.min(rD * 0.97, Math.abs(x) * 1.35); return (Math.sqrt(rD * rD - X * X) - (rD + 40)) / 1.35; };
      const RING = [[38, () => -40], [62, () => -32], [110, () => -46], [190, (x) => Math.min(-70, zt(x) - 60)], [260, (x) => Math.min(-110, zt(x) - 120)]], P = [], UV = [], I = []; let acc = 0;
      OL.forEach(([x, y], i) => { if (i) acc += Math.hypot(x - OL[i - 1][0], y - OL[i - 1][1]); const u = i / (NO - 1), w = 1 + 0.14 * Math.sin(u * 29) + 0.08 * Math.sin(u * 71), foot = 1; /* (no flared filler lumps at the door's foot: the bark meets the ground cleanly) */
        RING.forEach(([o, z], k) => { const oo = k > 1 ? o * w * foot : o, px = x + nrm[i][0] * oo, py = y + nrm[i][1] * oo; P.push(px, py, z(px) - (k === 1 ? 4 + 4 * Math.sin(u * 37) : 0)); UV.push(acc / 260, k / 3); }); });
      const NR = RING.length; for (let i = 0; i < NO - 1; i++) for (let k = 0; k < NR - 1; k++) { const a = i * NR + k, b = a + NR; I.push(a, a + 1, b, a + 1, b + 1, b); } /* wound to face out (it was back-facing, so the double-sided shader flipped its normals into the trunk and lit it dark) */
      const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); bg.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); bg.setIndex(I); bg.computeVertexNormals();
      { const D0 = doorSpot(C); grp.updateMatrixWorld(true); const Pp = bg.attributes.position, Nn = bg.attributes.normal, Uu = bg.attributes.uv, cols = [], wv = v3(), wn = v3(), nm = new THREE.Matrix3().getNormalMatrix(grp.matrixWorld); let prev = null, acc2 = 0;
        // hard clip: no rim vertex may come inside the trim's outer edge (trim = casing tube along the outline scaled 1.03, radius 13)
        const TR = outline.map(([x, y]) => [x * 1.03, y * (y > 5 ? 1.0165 : 1)]), LIM = 13 + 22, inside = (x, y) => { let c = false; for (let a = 0, b = TR.length - 1; a < TR.length; b = a++) { const [xa, ya] = TR[a], [xb, yb] = TR[b]; if ((ya > y) !== (yb > y) && x < (xb - xa) * (y - ya) / (yb - ya) + xa) c = !c; } return c || y < 0 && Math.abs(x) < hw * 1.03; };
        for (let i = 0; i < Pp.count; i++) { let x = Pp.getX(i), y = Pp.getY(i); for (let it = 0; it < 3; it++) { let bd = 1e9, bx = 0, by = 0; for (let a = 0; a < TR.length - 1; a++) { const [xa, ya] = TR[a], [xb, yb] = TR[a + 1], vx = xb - xa, vy = yb - ya, t = Math.max(0, Math.min(1, ((x - xa) * vx + (y - ya) * vy) / (vx * vx + vy * vy || 1))), qx = xa + vx * t, qy = ya + vy * t, dd = Math.hypot(x - qx, y - qy); if (dd < bd) { bd = dd; bx = qx; by = qy; } }
            const inn = inside(x, y); if (!inn && bd >= LIM) break; let nx = x - bx, ny = y - by; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l; if (inn) { nx = -nx; ny = -ny; } if (!isFinite(nx) || (nx === 0 && ny === 0)) { nx = Math.sign(x) || 1; ny = 0; } x = bx + nx * LIM; y = by + ny * LIM; } Pp.setXY(i, x, y); }
        Pp.needsUpdate = true; bg.computeVertexNormals();
        for (let i = 0; i < Pp.count; i++) { wv.set(Pp.getX(i), Pp.getY(i), Pp.getZ(i)).applyMatrix4(grp.matrixWorld); wn.set(Nn.getX(i), Nn.getY(i), Nn.getZ(i)).applyMatrix3(nm).normalize(); const c = C.moss ? C.moss(wv, wn, 0) : [1, 1, 1]; cols.push(c[0], c[1], c[2]);
          const ring = i % NR, row = (i / NR) | 0; const ang = Math.atan2(wv.z - D0.cz, wv.x - D0.cx) - D0.OUT; Uu.setXY(i, Math.atan2(Math.sin(ang), Math.cos(ang)) / (Math.PI * 2) * 7, (wv.y - (C.T.base - 0.07 * C.T.H)) / 900); void ring; void row; }
        bg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); Uu.needsUpdate = true;
        /* light it exactly like the trunk: radial trunk normals (from the trunk axis), blended a little with its own shape, so day and night it reads as one continuous bark */
        { const inv = new THREE.Matrix3().getNormalMatrix(new THREE.Matrix4().copy(grp.matrixWorld).invert()), q = v3(); for (let i = 0; i < Pp.count; i++) { wv.set(Pp.getX(i), Pp.getY(i), Pp.getZ(i)).applyMatrix4(grp.matrixWorld); q.set(wv.x - D0.cx, 0, wv.z - D0.cz).normalize(); wn.set(Nn.getX(i), Nn.getY(i), Nn.getZ(i)).applyMatrix3(nm).normalize(); if (wn.dot(q) < 0) wn.negate(); q.lerp(wn, 0.3).normalize().applyMatrix3(inv).normalize(); Nn.setXYZ(i, q.x, q.y, q.z); } Nn.needsUpdate = true; } }
      const rim = new THREE.Mesh(bg, C.trunkMat || barkMat); rim.receiveShadow = false; /* (it sits just inside the trunk's own shadow volume: receiving shadows darkened it into a separate-looking patch) */ grp.add(rim); }
    // lanterns on iron brackets either side of the frame
    GX.lampM = new THREE.MeshBasicMaterial({ color: 0xffc070, toneMapped: false }); const lampPts = [];
    const lampIron = new THREE.MeshLambertMaterial({ color: 0x3a2618 }); for (const s of [-1, 1]) { const bx = s * (hw + 165), cord = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 90, 4), lampIron); cord.position.set(bx, 655, 30); grp.add(cord);
      const lg = new THREE.Group(); lg.position.set(bx, 560, 30); grp.add(lg); const cage = new THREE.Mesh(new THREE.CylinderGeometry(30, 24, 70, 6, 1, true), new THREE.MeshLambertMaterial({ color: 0x3a2618, side: THREE.DoubleSide, transparent: true, opacity: 0.55 })); lg.add(cage);
      const core = new THREE.Mesh(new THREE.CylinderGeometry(20, 16, 52, 6), GX.lampM); lg.add(core); const cap = new THREE.Mesh(new THREE.ConeGeometry(38, 36, 6), lampIron); cap.position.y = 52; lg.add(cap); const bot = new THREE.Mesh(new THREE.CylinderGeometry(26, 18, 10, 6), lampIron); bot.position.y = -40; lg.add(bot);
      lampPts.push(lg); }
    // glowing mushrooms (blue and violet) and moss round the foot of the frame
    { const ms = [], r = prng(77); for (let k = 0; k < 70; k++) { const s = r() < 0.5 ? -1 : 1, x = s * (hw + 60 + r() * 520), z = 40 + (r() - 0.3) * 380; ms.push([x, z, 18 + r() * 40, r() < 0.4]); }
      const capG = new THREE.SphereGeometry(1, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2); capG.scale(1, 0.6, 1); const stG = new THREE.CylinderGeometry(0.16, 0.24, 1, 6); stG.translate(0, -0.5, 0);
      GX.mushB = new THREE.MeshBasicMaterial({ color: 0x66d8ff, toneMapped: false }); GX.mushV = new THREE.MeshBasicMaterial({ color: 0xb487ff, toneMapped: false });
      const mt = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), wp = v3(), gp = [];
      for (const [mat, pick] of [[GX.mushB, false], [GX.mushV, true]]) { const L = ms.filter((m) => m[3] === pick), cap = new THREE.InstancedMesh(capG, mat, L.length), st = new THREE.InstancedMesh(stG, new THREE.MeshLambertMaterial({ color: 0xeedcbc }), L.length);
        L.forEach(([x, z, sz], i) => { wp.set(x, 0, z).applyMatrix4(grp.matrixWorld.compose(grp.position, grp.quaternion, grp.scale)); const y = meshH(wp.x, wp.z) - gy + sz * 1.1; e.set((r() - 0.5) * 0.4, 0, (r() - 0.5) * 0.4); q.setFromEuler(e); mt.compose(v3().set(x, y, z), q, v3().set(sz, sz * 1.2, sz)); cap.setMatrixAt(i, mt); st.setMatrixAt(i, mt); gp.push(x, y + 10, z); });
        grp.add(cap); grp.add(st); }
      const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3)); GX.doorMushGlow = new THREE.Points(gg, new THREE.PointsMaterial({ size: 160, map: radialTex('rgba(150,210,255,.9)', 'rgba(120,120,255,.25)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.3 })); grp.add(GX.doorMushGlow);
      /* no moss or hanging strands on the door frame */ }
    // the worn stone path out from the step
    { const r = prng(5), stones = []; for (let k = 0; k < 64; k++) { const t = r(), z = 140 + t * 900, x = (r() - 0.5) * (300 - t * 80); stones.push([x, z, 34 + r() * 30]); }
      const sg = new THREE.CylinderGeometry(1, 1.05, 1, 7), smat = new THREE.MeshLambertMaterial({ color: 0x6e5c48 }), im = new THREE.InstancedMesh(sg, smat, stones.length), mt = new THREE.Matrix4(), q = new THREE.Quaternion(), wp = v3(); grp.updateMatrixWorld(true);
      im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(stones.length * 3), 3);
      stones.forEach(([x, z, s2], i) => { wp.set(x, 0, z).applyMatrix4(grp.matrixWorld); const y = meshH(wp.x, wp.z) - gy + 3; q.setFromEuler(new THREE.Euler(0, r() * 3, 0)); mt.compose(v3().set(x, y, z), q, v3().set(s2, 8, s2 * (0.7 + r() * 0.4))); im.setMatrixAt(i, mt); const v = 0.8 + r() * 0.3; im.instanceColor.setXYZ(i, v, v * 0.97, v * 0.92); }); im.receiveShadow = true; grp.add(im); }
    // light spilling out of the gap: a soft shaft fanning over the ground and a pool of light on the step and path
    { GX.poolM = new THREE.MeshBasicMaterial({ map: radialTex('rgba(255,250,240,.95)', 'rgba(255,240,220,.3)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0.5 });
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(900, 1200), GX.poolM); pool.rotation.x = -Math.PI / 2; pool.position.set(0, 30, 420); grp.add(pool);
      const shG = new THREE.BufferGeometry(); shG.setAttribute('position', new THREE.Float32BufferAttribute([-gap / 2, 0, -60, gap / 2, 0, -60, gap / 2, 700, -60, -gap / 2, 700, -60, -260, 0, 700, 260, 0, 700], 3)); shG.setAttribute('uv', new THREE.Float32BufferAttribute([0.45, 0, 0.55, 0, 0.55, 1, 0.45, 1, 0, 0.5, 1, 0.5], 2)); shG.setIndex([0, 1, 5, 0, 5, 4, 0, 4, 3, 1, 2, 5]);
      GX.shaftM = new THREE.MeshBasicMaterial({ color: 0xfff2e0, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }); grp.add(new THREE.Mesh(shG, GX.shaftM));
      GX.doorLight = new THREE.PointLight(0xfff0e0, 0.6, 2600, 1.6); GX.doorLight.position.set(0, 400, 380); grp.add(GX.doorLight);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex('rgba(255,252,245,1)', 'rgba(255,245,230,.35)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6, toneMapped: false })); sp.position.set(0, 450, 40); sp.scale.set(700, 1300, 1); grp.add(sp); GX.doorSprite = sp; }
    GX.lamps = lampPts; return GX.door; }
  function animDoor(t, night) { if (!GX.door) return; const fl = 0.9 + 0.1 * Math.sin(t * 2.1) + 0.04 * Math.sin(t * 7.3);
    const k = (0.85 + 0.9 * night) * fl; GX.doorGlow.color.setRGB(1, 0.97, 0.92); GX.poolM.opacity = (0.08 + 0.6 * night) * fl; GX.shaftM.opacity = (0.04 + 0.22 * night) * fl; GX.doorLight.intensity = (0.25 + 1.2 * night) * fl; GX.doorSprite.material.opacity = (0.25 + 0.5 * night) * fl;
    const lk = 0.55 + night * 0.7; GX.lampM.color.setRGB(lk, lk * 0.75, lk * 0.42); const mk = 0.5 + night * 0.7; GX.mushB.color.setRGB(0.36 * mk, 0.82 * mk, 1.0 * mk); GX.mushV.color.setRGB(0.72 * mk, 0.52 * mk, 1.0 * mk); GX.doorMushGlow.material.opacity = 0.1 + night * 0.5; }

  function doorCard() { const btn = (h) => `<div class="wrapgap" style="margin-top:10px">${h}</div>`;
    openModal(`<h2>🌳 The Lumen Tree</h2><p>The great door stands a hand's width open, and Lumen light spills out over the roots. Inside is the commune of the Hollow, where every delver's road meets.</p><p class="dim">Coming soon.</p>${btn('<button class="btn deep" data-act="close">Enter the Lumen Tree</button><button class="btn ghost" data-act="close">Not now</button>')}`, 'city'); }
  // tapping the great door walks you straight in: the hollow heart of the tree (CharView's tree interior, the 'tree' view; no nav tab of its own)
  function enterTree() { if (typeof closeModalQuiet === 'function') closeModalQuiet(); if (typeof setTab === 'function') setTab('tree'); }
  function build(C) { if (!GX.built) { GX.built = true; buildDoor(C); } }
  function anim(t, night) { animDoor(t, night); }
  return { build, anim, wet, dodge, doorSpot, carve, fit, doorCard, enterTree, toW, toL, get door() { return GX.door; }, get spec() { return G; }, gx: GX };
})();

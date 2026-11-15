
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
  function wet() { return false; }

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
  function doorCard() { const btn = (h) => `<div class="wrapgap" style="margin-top:10px">${h}</div>`;
    openModal(`<h2>🌳 The Lumen Tree</h2><p>The great door stands a hand's width open, and Lumen light spills out over the roots. Inside is the commune of the Hollow, where every delver's road meets.</p><p class="dim">Coming soon.</p>${btn('<button class="btn deep" data-act="close">Enter the Lumen Tree</button><button class="btn ghost" data-act="close">Not now</button>')}`, 'city'); }
  function build(C) { if (GX.built) return; GX.built = true; buildDoor(C); }
  function anim(t, night) { animDoor(t, night); }
  return { build, anim, wet, doorCard, get door() { return GX.door; }, get spec() { return G; }, gx: GX };
})();


/* =====================================================================
   PROCEDURAL HOUSES + TREES for the 3D Rim City, modelled on the concept sheet
   (concept/house-concepts.pdf: Delver's Shack, Cottage, Stacked Townhouse, Relic Workshop) and the
   painted city/hillside targets. Each tier is one merged geometry (LOD0 detailed, LOD1 simple) sharing a
   painted texture atlas + an emissive atlas (windows and lanterns glow softly at night).
   ===================================================================== */
const HOUSE_KIT = (() => {
  const AT = 1024; let atlas = null;
  // atlas regions [x0, y0, x1, y1] in px
  const R = { roof: [0, 0, 512, 512], plaster: [512, 0, 768, 256], stone: [768, 0, 1024, 256], timber: [512, 256, 768, 384], plank: [768, 256, 1024, 384], slate: [512, 384, 768, 512],
    win: [768, 384, 896, 512], winA: [896, 384, 1024, 512], door: [0, 512, 128, 768], chim: [128, 512, 384, 768], iron: [384, 512, 448, 576], lamp: [448, 512, 512, 576], white: [384, 576, 448, 640],
    leaf: [448, 576, 512, 640], doorO: [512, 512, 640, 768], roofU: [640, 512, 704, 576], quoin: [704, 512, 832, 640], moss: [832, 512, 896, 576], cloth: [384, 640, 512, 768] };
  function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  function paintAtlas() {
    const cv = document.createElement('canvas'); cv.width = cv.height = AT; const g = cv.getContext('2d'); const em = document.createElement('canvas'); em.width = em.height = AT; const e = em.getContext('2d'); e.fillStyle = '#000'; e.fillRect(0, 0, AT, AT);
    const r = rng(7); const rect = (k) => R[k]; const fill = (k, c) => { const [x0, y0, x1, y1] = rect(k); g.fillStyle = c; g.fillRect(x0, y0, x1 - x0, y1 - y0); };
    const clip = (k, fn) => { const [x0, y0, x1, y1] = rect(k); g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip(); fn(x0, y0, x1 - x0, y1 - y0); g.restore(); };
    // red clay roof tiles: overlapping rows of rounded tiles, warm orange-red with darker undersides and weathering
    clip('roof', (x0, y0, w, h) => { g.fillStyle = '#8e3a22'; g.fillRect(x0, y0, w, h); const rows = 14, th = h / rows, tw = w / 10;
      for (let j = rows - 1; j >= 0; j--) { const y = y0 + j * th, off = (j % 2) * tw * 0.5;
        for (let i = -1; i < 11; i++) { const x = x0 + i * tw + off, v = 0.82 + r() * 0.3, hue = r();
          const c1 = `rgb(${(196 + hue * 30) * v | 0},${(84 + hue * 26) * v | 0},${(52 + hue * 10) * v | 0})`, c2 = `rgb(${(150 + hue * 20) * v | 0},${(58 + hue * 14) * v | 0},${(36) * v | 0})`;
          const gr = g.createLinearGradient(x, y, x, y + th * 1.25); gr.addColorStop(0, c2); gr.addColorStop(0.35, c1); gr.addColorStop(1, c2); g.fillStyle = gr;
          g.beginPath(); g.moveTo(x + 2, y); g.lineTo(x + tw - 2, y); g.lineTo(x + tw - 2, y + th * 0.95); g.quadraticCurveTo(x + tw / 2, y + th * 1.28, x + 2, y + th * 0.95); g.closePath(); g.fill();
          g.strokeStyle = 'rgba(60,20,10,.45)'; g.lineWidth = 2; g.stroke(); g.fillStyle = 'rgba(255,200,150,.18)'; g.fillRect(x + 4, y + 3, tw * 0.25, th * 0.5); } }
      for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(${60 + r() * 40 | 0},${70 + r() * 30 | 0},${30},${0.12 + r() * 0.15})`; g.beginPath(); g.ellipse(x0 + r() * w, y0 + r() * h, 6 + r() * 20, 3 + r() * 8, 0, 0, Math.PI * 2); g.fill(); } });
    // warm cream plaster with smudges
    clip('plaster', (x0, y0, w, h) => { g.fillStyle = '#e6cf98'; g.fillRect(x0, y0, w, h); for (let k = 0; k < 500; k++) { const v = r(); g.fillStyle = v < 0.5 ? `rgba(160,120,70,${0.04 + r() * 0.06})` : `rgba(255,245,215,${0.05 + r() * 0.08})`; g.beginPath(); g.ellipse(x0 + r() * w, y0 + r() * h, 2 + r() * 14, 2 + r() * 10, r() * 3, 0, 6.3); g.fill(); }
      const gr = g.createLinearGradient(0, y0, 0, y0 + h); gr.addColorStop(0, 'rgba(120,80,40,.0)'); gr.addColorStop(1, 'rgba(110,80,50,.25)'); g.fillStyle = gr; g.fillRect(x0, y0, w, h); });
    // rubble stone: irregular rounded grey-brown stones with dark mortar
    const stones = (k, base, sz) => clip(k, (x0, y0, w, h) => { g.fillStyle = '#4b443c'; g.fillRect(x0, y0, w, h); const rows = Math.round(h / sz);
      for (let j = 0; j < rows; j++) { let x = x0 - r() * sz; while (x < x0 + w) { const sw = sz * (0.8 + r() * 0.9), v = 0.75 + r() * 0.35; g.fillStyle = `rgb(${base[0] * v | 0},${base[1] * v | 0},${base[2] * v | 0})`;
        g.beginPath(); g.roundRect ? g.roundRect(x + 2, y0 + j * (h / rows) + 2, sw - 4, h / rows - 4, 7) : g.rect(x + 2, y0 + j * (h / rows) + 2, sw - 4, h / rows - 4); g.fill(); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x + 5, y0 + j * (h / rows) + 4, sw * 0.4, 3); x += sw; } } });
    stones('stone', [150, 140, 128], 30); stones('chim', [158, 148, 136], 26); stones('quoin', [176, 164, 146], 40);
    // timber: dark oak with grain
    clip('timber', (x0, y0, w, h) => { g.fillStyle = '#5a3b22'; g.fillRect(x0, y0, w, h); for (let k = 0; k < 90; k++) { g.strokeStyle = `rgba(${r() < 0.5 ? '30,18,8' : '120,84,50'},${0.2 + r() * 0.3})`; g.lineWidth = 1 + r() * 2; const y = y0 + r() * h; g.beginPath(); g.moveTo(x0, y); g.bezierCurveTo(x0 + w * 0.3, y + (r() - 0.5) * 8, x0 + w * 0.6, y + (r() - 0.5) * 8, x0 + w, y + (r() - 0.5) * 6); g.stroke(); } });
    clip('plank', (x0, y0, w, h) => { for (let j = 0; j < 8; j++) { const v = 0.8 + r() * 0.3; g.fillStyle = `rgb(${138 * v | 0},${98 * v | 0},${60 * v | 0})`; g.fillRect(x0, y0 + j * h / 8, w, h / 8); g.fillStyle = 'rgba(40,24,10,.6)'; g.fillRect(x0, y0 + (j + 1) * h / 8 - 2, w, 2); } });
    clip('slate', (x0, y0, w, h) => { g.fillStyle = '#3c4048'; g.fillRect(x0, y0, w, h); const rows = 12, th = h / rows, tw = w / 9; for (let j = rows - 1; j >= 0; j--) for (let i = -1; i < 10; i++) { const v = 0.8 + r() * 0.35, x = x0 + i * tw + (j % 2) * tw / 2, y = y0 + j * th; g.fillStyle = `rgb(${84 * v | 0},${88 * v | 0},${98 * v | 0})`; g.beginPath(); g.moveTo(x + 1, y); g.lineTo(x + tw - 1, y); g.lineTo(x + tw - 1, y + th); g.quadraticCurveTo(x + tw / 2, y + th * 1.25, x + 1, y + th); g.fill(); g.strokeStyle = 'rgba(20,20,26,.6)'; g.stroke(); } });
    // windows: timber frame, four blue-grey panes (the panes glow warm in the emissive atlas)
    const win = (k, arch) => { const [x0, y0, x1, y1] = rect(k), w = x1 - x0, h = y1 - y0, path = (c, p) => { c.beginPath(); if (arch) { c.moveTo(x0 + p, y1 - p); c.lineTo(x0 + p, y0 + w / 2); c.arc(x0 + w / 2, y0 + w / 2, w / 2 - p, Math.PI, 0); c.lineTo(x1 - p, y1 - p); c.closePath(); } else c.rect(x0 + p, y0 + p, w - 2 * p, h - 2 * p); };
      g.fillStyle = '#4a2f1a'; g.fillRect(x0, y0, w, h); path(g, 12); const gl = g.createLinearGradient(x0, y0, x1, y1); gl.addColorStop(0, '#9cc3d6'); gl.addColorStop(0.5, '#4f7590'); gl.addColorStop(1, '#2e4658'); g.fillStyle = gl; g.fill();
      g.fillStyle = '#4a2f1a'; g.fillRect(x0 + w / 2 - 5, y0, 10, h); g.fillRect(x0, y0 + h * 0.52 - 5, w, 10); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x0 + 18, y0 + (arch ? w * 0.4 : 18), 8, h * 0.25);
      path(e, 12); const eg = e.createRadialGradient(x0 + w / 2, y0 + h * 0.6, 4, x0 + w / 2, y0 + h * 0.6, w * 0.7); eg.addColorStop(0, '#ffd58a'); eg.addColorStop(1, '#c87a2a'); e.fillStyle = eg; e.fill(); e.fillStyle = '#000'; e.fillRect(x0 + w / 2 - 5, y0, 10, h); e.fillRect(x0, y0 + h * 0.52 - 5, w, 10); };
    win('win', false); win('winA', true);
    // doors: arched plank door with iron straps and a round port window; open workshop door shows a warm interior
    clip('door', (x0, y0, w, h) => { g.fillStyle = '#3a2a1c'; g.fillRect(x0, y0, w, h); g.save(); g.beginPath(); g.moveTo(x0 + 8, y0 + h); g.lineTo(x0 + 8, y0 + w / 2); g.arc(x0 + w / 2, y0 + w / 2 + 4, w / 2 - 8, Math.PI, 0); g.lineTo(x0 + w - 8, y0 + h); g.closePath(); g.clip();
      for (let i = 0; i < 5; i++) { const v = 0.85 + r() * 0.25; g.fillStyle = `rgb(${120 * v | 0},${80 * v | 0},${46 * v | 0})`; g.fillRect(x0 + 8 + i * (w - 16) / 5, y0, (w - 16) / 5 - 2, h); } g.fillStyle = '#2a2420'; g.fillRect(x0, y0 + h * 0.3, w, 7); g.fillRect(x0, y0 + h * 0.75, w, 7); g.restore();
      g.fillStyle = '#6b8ea4'; g.beginPath(); g.arc(x0 + w / 2, y0 + h * 0.42, 12, 0, 6.3); g.fill(); g.strokeStyle = '#2a2420'; g.lineWidth = 4; g.stroke(); g.fillStyle = '#c9a050'; g.beginPath(); g.arc(x0 + w * 0.72, y0 + h * 0.62, 4, 0, 6.3); g.fill();
      e.fillStyle = '#ffb860'; e.beginPath(); e.arc(x0 + w / 2, y0 + h * 0.42, 10, 0, 6.3); e.fill(); });
    clip('doorO', (x0, y0, w, h) => { g.fillStyle = '#3a2a1c'; g.fillRect(x0, y0, w, h); const gr = g.createLinearGradient(0, y0, 0, y0 + h); gr.addColorStop(0, '#5a3a1c'); gr.addColorStop(1, '#b07a3a'); g.fillStyle = gr; g.beginPath(); g.moveTo(x0 + 10, y0 + h); g.lineTo(x0 + 10, y0 + w / 2); g.arc(x0 + w / 2, y0 + w / 2 + 4, w / 2 - 10, Math.PI, 0); g.lineTo(x0 + w - 10, y0 + h); g.fill();
      for (let k = 0; k < 9; k++) { g.fillStyle = ['#c9a050', '#8a5a2a', '#6f8fa8', '#b5533c'][k % 4]; g.fillRect(x0 + 20 + (k % 3) * 30, y0 + 70 + ((k / 3) | 0) * 40, 22, 26); }
      e.fillStyle = '#c8803a'; e.beginPath(); e.moveTo(x0 + 10, y0 + h); e.lineTo(x0 + 10, y0 + w / 2); e.arc(x0 + w / 2, y0 + w / 2 + 4, w / 2 - 10, Math.PI, 0); e.lineTo(x0 + w - 10, y0 + h); e.fill(); });
    fill('iron', '#2b2a2c'); fill('white', '#ffffff'); fill('roofU', '#4a2a1a'); fill('moss', '#6d8a3a');
    clip('lamp', (x0, y0, w, h) => { g.fillStyle = '#ffd890'; g.fillRect(x0, y0, w, h); g.fillStyle = '#2b2a2c'; g.fillRect(x0, y0, w, 6); g.fillRect(x0, y0 + h - 6, w, 6); e.fillStyle = '#ffc070'; e.fillRect(x0, y0 + 6, w, h - 12); });
    clip('leaf', (x0, y0, w, h) => { g.fillStyle = '#5f8a34'; g.fillRect(x0, y0, w, h); for (let k = 0; k < 60; k++) { g.fillStyle = r() < 0.25 ? '#d24a6a' : r() < 0.5 ? '#f0e070' : '#7aa848'; g.beginPath(); g.arc(x0 + r() * w, y0 + r() * h, 2 + r() * 3, 0, 6.3); g.fill(); } });
    clip('cloth', (x0, y0, w, h) => { const cs = ['#3f5f9a', '#e8e0cc', '#b5533c', '#6aa0c0', '#c9a050', '#7a5fa0']; for (let i = 0; i < 6; i++) { g.fillStyle = cs[i]; g.fillRect(x0 + i * w / 6, y0, w / 6, h); } g.fillStyle = '#e8c86a'; for (let i = 0; i < 6; i += 3) { g.beginPath(); g.arc(x0 + (i + 0.5) * w / 6, y0 + h * 0.4, 6, 0, 6.3); g.fill(); } });
    const T = new THREE.CanvasTexture(cv), TE = new THREE.CanvasTexture(em); for (const t of [T, TE]) { t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; }
    return { T, TE }; }
  // ---------- geometry builder ----------
  function Builder() { const B = { p: [], n: [], uv: [], c: [], i: [], M: new THREE.Matrix4(), NM: new THREE.Matrix3(), stack: [] };
    const v = new THREE.Vector3(), nv = new THREE.Vector3();
    B.vert = (x, y, z, nx, ny, nz, u, w, col) => { v.set(x, y, z).applyMatrix4(B.M); nv.set(nx, ny, nz).applyMatrix3(B.NM).normalize(); B.p.push(v.x, v.y, v.z); B.n.push(nv.x, nv.y, nv.z); B.uv.push(u, w); B.c.push(col[0], col[1], col[2]); return B.p.length / 3 - 1; };
    B.with = (x, y, z, rotY, s, fn) => { B.stack.push(B.M.clone()); const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY || 0), new THREE.Vector3(s || 1, s || 1, s || 1)); B.M.multiply(m); B.NM.getNormalMatrix(B.M); fn(); B.M.copy(B.stack.pop()); B.NM.getNormalMatrix(B.M); };
    const uvr = (k, a, b) => { const [x0, y0, x1, y1] = R[k]; const pad = 1.5; return [(x0 + pad + (x1 - x0 - 2 * pad) * a) / AT, 1 - (y0 + pad + (y1 - y0 - 2 * pad) * (1 - b)) / AT]; };
    // quad a,b,c,d counter-clockwise seen from outside (a,b bottom; d,c top); uv window [u0,v0,u1,v1] of the region
    B.quad = (a, b, c, d, k, col, uw) => { const w = uw || [0, 0, 1, 1]; const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [d[0] - a[0], d[1] - a[1], d[2] - a[2]]; const nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0];
      const q = [[a, w[0], w[1]], [b, w[2], w[1]], [c, w[2], w[3]], [d, w[0], w[3]]].map(([p, u, t]) => { const [U, V] = uvr(k, u, t); return B.vert(p[0], p[1], p[2], nx, ny, nz, U, V, col || [1, 1, 1]); }); B.i.push(q[0], q[1], q[2], q[0], q[2], q[3]); };
    B.tri = (a, b, c, k, col, uw) => { const w = uw || [0, 0, 1, 1]; const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]; const nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0];
      const q = [[a, w[0], w[1]], [b, w[2], w[1]], [c, (w[0] + w[2]) / 2, w[3]]].map(([p, u, t]) => { const [U, V] = uvr(k, u, t); return B.vert(p[0], p[1], p[2], nx, ny, nz, U, V, col || [1, 1, 1]); }); B.i.push(q[0], q[1], q[2]); };
    // axis-aligned box; side/top regions; uv scale: world units per full region (tiles the region proportionally, capped)
    B.box = (x0, y0, z0, x1, y1, z1, k, kt, col, us, bottom) => { const s = us || 0, U = (len) => s ? Math.min(1, len / s) : 1, dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
      B.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], k, col, [0, 0, U(dx), U(dy)]); B.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], k, col, [0, 0, U(dx), U(dy)]);
      B.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], k, col, [0, 0, U(dz), U(dy)]); B.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], k, col, [0, 0, U(dz), U(dy)]);
      if (kt !== null) B.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], kt || k, col, [0, 0, U(dx), U(dz)]); if (bottom) B.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], k, col); };
    // a beam between two points (square section th), any orientation
    B.beam = (p, q, th, k, col, th2) => { const P = new THREE.Vector3(...p), Q = new THREE.Vector3(...q), d = new THREE.Vector3().subVectors(Q, P), L = d.length(); if (L < 1e-4) return; d.normalize();
      const up = Math.abs(d.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0), sx = new THREE.Vector3().crossVectors(d, up).normalize(), sy = new THREE.Vector3().crossVectors(sx, d).normalize();
      const a = th / 2, b = (th2 || th) / 2, cn = (s1, s2, t) => [P.x + sx.x * s1 * a + sy.x * s2 * b + d.x * L * t, P.y + sx.y * s1 * a + sy.y * s2 * b + d.y * L * t, P.z + sx.z * s1 * a + sy.z * s2 * b + d.z * L * t];
      const sides = [[[1, -1], [1, 1]], [[1, 1], [-1, 1]], [[-1, 1], [-1, -1]], [[-1, -1], [1, -1]]]; for (const [s0, s1] of sides) B.quad(cn(s0[0], s0[1], 0), cn(s0[0], s0[1], 1), cn(s1[0], s1[1], 1), cn(s1[0], s1[1], 0), k, col, [0, 0, 1, Math.min(1, L * 2)]); };
    // vertical cylinder / cone (r1 = top radius)
    B.cyl = (x, y0, z, r0, r1, h, n, k, col, cap, uRep) => { for (let j = 0; j < n; j++) { const a0 = j / n * Math.PI * 2, a1 = (j + 1) / n * Math.PI * 2, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1), ur = uRep || 1;
        B.quad([x + c0 * r0, y0, z + s0 * r0], [x + c1 * r0, y0, z + s1 * r0], [x + c1 * r1, y0 + h, z + s1 * r1], [x + c0 * r1, y0 + h, z + s0 * r1], k, col, [((j / n) * ur) % 1, 0, ((j / n) * ur) % 1 + ur / n, 1]); }
      if (cap && r1 > 0) for (let j = 0; j < n; j++) { const a0 = j / n * Math.PI * 2, a1 = (j + 1) / n * Math.PI * 2; B.tri([x + Math.cos(a1) * r1, y0 + h, z + Math.sin(a1) * r1], [x + Math.cos(a0) * r1, y0 + h, z + Math.sin(a0) * r1], [x, y0 + h, z], cap, col); } };
    // a roof over rings [{x0,x1,z0,z1,y}] from eave to ridge; sides: which faces get tiles ('f','b','l','r'); gable ends filled with `gk`
    B.roof = (rings, k, col, gable, gk, gcol) => { const n = rings.length; for (let j = 0; j < n - 1; j++) { const A = rings[j], C = rings[j + 1], t0 = j / (n - 1), t1 = (j + 1) / (n - 1);
        B.quad([A.x0, A.y, A.z1], [A.x1, A.y, A.z1], [C.x1, C.y, C.z1], [C.x0, C.y, C.z1], k, col, [0, t0, Math.min(1, (A.x1 - A.x0) / 1.3), t1]);
        B.quad([A.x1, A.y, A.z0], [A.x0, A.y, A.z0], [C.x0, C.y, C.z0], [C.x1, C.y, C.z0], k, col, [0, t0, Math.min(1, (A.x1 - A.x0) / 1.3), t1]);
        if (!gable) { B.quad([A.x1, A.y, A.z1], [A.x1, A.y, A.z0], [C.x1, C.y, C.z0], [C.x1, C.y, C.z1], k, col, [0, t0, Math.min(1, (A.z1 - A.z0) / 1.3), t1]); B.quad([A.x0, A.y, A.z0], [A.x0, A.y, A.z1], [C.x0, C.y, C.z1], [C.x0, C.y, C.z0], k, col, [0, t0, Math.min(1, (A.z1 - A.z0) / 1.3), t1]); } }
      // undersides of the overhang (dark), so eaves read from below
      const A = rings[0], th = 0.035; B.quad([A.x0, A.y - th, A.z1], [A.x0, A.y - th, A.z0], [A.x1, A.y - th, A.z0], [A.x1, A.y - th, A.z1], 'roofU', [1, 1, 1]);
      B.quad([A.x0, A.y - th, A.z1], [A.x1, A.y - th, A.z1], [A.x1, A.y, A.z1], [A.x0, A.y, A.z1], 'roofU', [1, 1, 1]); B.quad([A.x1, A.y - th, A.z0], [A.x0, A.y - th, A.z0], [A.x0, A.y, A.z0], [A.x1, A.y, A.z0], 'roofU', [1, 1, 1]);
      if (gable) for (const side of [1, -1]) { // gable triangle walls under the roof ends (set back from the overhang)
        const gx = side > 0 ? gable[1] : gable[0], y0 = gable[2], pts = rings.map((r2) => [r2.z0, r2.z1, r2.y]); const L = pts[0][1] - pts[0][0];
        for (let j = 0; j < n - 1; j++) { const [a0, a1, ya] = pts[j], [b0, b1, yb] = pts[j + 1];
          const ua = (z) => (z - pts[0][0]) / L, vv = (y) => (y - y0) / (pts[n - 1][2] - y0 || 1);
          if (side > 0) B.quad([gx, ya, a1], [gx, ya, a0], [gx, yb, b0], [gx, yb, b1], gk, gcol, [ua(a1), vv(ya), ua(a0), vv(yb)]); else B.quad([gx, ya, a0], [gx, ya, a1], [gx, yb, b1], [gx, yb, b0], gk, gcol, [ua(a0), vv(ya), ua(a1), vv(yb)]); }
        const [a0, a1, ya] = pts[0]; if (ya > y0) { if (side > 0) B.quad([gx, y0, a1], [gx, y0, a0], [gx, ya, a0], [gx, ya, a1], gk, gcol); else B.quad([gx, y0, a0], [gx, y0, a1], [gx, ya, a1], [gx, ya, a0], gk, gcol); }
        // barge boards
        for (const zs of [0, 1]) for (let j = 0; j < n - 1; j++) { const z0 = zs ? rings[j].z1 : rings[j].z0, z1 = zs ? rings[j + 1].z1 : rings[j + 1].z0, xb = side > 0 ? rings[j].x1 + 0.005 : rings[j].x0 - 0.005; B.beam([xb, rings[j].y + 0.01, z0], [xb, rings[j + 1].y + 0.01, z1], 0.04, 'timber', [0.9, 0.9, 0.9], 0.07); } } };
    // flared roof rings: eave rectangle -> ridge, with a bell kick at the eaves (like the concept roofs)
    B.rings = (x0, x1, z0, z1, ye, yr, hipD, n) => { const out = [], zc = (z0 + z1) / 2; for (let j = 0; j <= n; j++) { const t = j / n, f = Math.pow(t, 1.45) * 0.85 + t * 0.15, ins = hipD * t;
        out.push({ x0: x0 + ins, x1: x1 - ins, z0: z0 + (zc - z0) * t, z1: z1 - (z1 - zc) * t, y: ye + (yr - ye) * f }); } return out; };
    B.geo = () => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(B.uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(B.c, 3));
      g.setIndex(B.p.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(B.i, 1) : new THREE.Uint16BufferAttribute(B.i, 1)); g.computeBoundingSphere(); return g; };
    return B; }
  // ---------- shared details ----------
  const W1 = [1, 1, 1], TIMB = [1, 1, 1], DARK = [0.7, 0.7, 0.7];
  function windowOn(B, face, x, y, w, h, arch, sill, flowers) { // face: +z (front) window centred at x; for other faces wrap with B.with
    B.quad([x - w / 2, y, face + 0.006], [x + w / 2, y, face + 0.006], [x + w / 2, y + h, face + 0.006], [x - w / 2, y + h, face + 0.006], arch ? 'winA' : 'win', W1);
    if (sill) B.box(x - w * 0.62, y - 0.035, face - 0.005, x + w * 0.62, y, face + 0.04, 'timber', 'timber', TIMB);
    if (flowers) { B.box(x - w * 0.6, y - 0.09, face, x + w * 0.6, y - 0.035, face + 0.06, 'plank', 'plank', TIMB); B.box(x - w * 0.55, y - 0.035, face + 0.005, x + w * 0.55, y + 0.025, face + 0.055, 'leaf', 'leaf', [1, 1, 1]); } }
  function finial(B, x, y, z, h) { B.cyl(x, y, z, 0.022, 0.022, h * 0.35, 6, 'iron', W1); B.cyl(x, y + h * 0.35, z, 0.03, 0.0, h * 0.65, 6, 'iron', W1); }
  function lantern(B, x, y, z, dir) { // wall bracket + hanging lantern (dir: +1 hangs toward +z)
    B.beam([x, y + 0.1, z], [x, y + 0.1, z + 0.07 * dir], 0.012, 'iron', W1); B.box(x - 0.022, y - 0.04, z + 0.07 * dir - 0.022, x + 0.022, y + 0.04, z + 0.07 * dir + 0.022, 'lamp', 'iron', W1); B.cyl(x, y + 0.04, z + 0.07 * dir, 0.03, 0.0, 0.035, 4, 'iron', W1); }
  function chimney(B, x, z, y0, y1, w) { B.box(x - w / 2, y0, z - w / 2, x + w / 2, y1, z + w / 2, 'chim', 'iron', W1, 0.5); B.box(x - w * 0.62, y1, z - w * 0.62, x + w * 0.62, y1 + 0.04, z + w * 0.62, 'chim', 'chim', DARK, 0.5); }
  function crate(B, x, y, z, s) { B.box(x - s / 2, y, z - s / 2, x + s / 2, y + s, z + s / 2, 'plank', 'plank', [0.95, 0.9, 0.85], 0.3); for (const dz of [-1, 1]) B.beam([x - s / 2, y + 0.005, z + dz * s * 0.51], [x + s / 2, y + s - 0.005, z + dz * s * 0.51], 0.015, 'timber', TIMB); }
  function barrel(B, x, y, z, r, h) { B.cyl(x, y, z, r * 0.88, r, h * 0.5, 10, 'plank', [0.9, 0.8, 0.7], null); B.cyl(x, y + h * 0.5, z, r, r * 0.88, h * 0.5, 10, 'plank', [0.9, 0.8, 0.7], 'plank'); for (const t of [0.2, 0.8]) B.cyl(x, y + h * t - 0.008, z, r * 0.99, r * 0.99, 0.016, 10, 'iron', W1); }
  function ladder(B, a, b, w) { const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...d), sx = [-d[2] / Math.hypot(d[0], d[2] || 1e-6), 0, d[0] / Math.hypot(d[0], d[2] || 1e-6)];
    for (const s of [-1, 1]) B.beam([a[0] + sx[0] * w * s, a[1], a[2] + sx[2] * w * s], [b[0] + sx[0] * w * s, b[1], b[2] + sx[2] * w * s], 0.022, 'timber', TIMB); for (let k = 1; k < L / 0.07; k++) { const t = k * 0.07 / L, p = [a[0] + d[0] * t, a[1] + d[1] * t, a[2] + d[2] * t]; B.beam([p[0] - sx[0] * w, p[1], p[2] - sx[2] * w], [p[0] + sx[0] * w, p[1], p[2] + sx[2] * w], 0.014, 'plank', TIMB); } }
  function timberFrame(B, x0, x1, y0, y1, z, braces) { // vertical posts + rails + diagonal braces on a +z wall
    const th = 0.032, dz = 0.008; for (const x of [x0, x1]) B.box(x - th / 2, y0, z - th / 2, x + th / 2, y1, z + dz + th / 2, 'timber', 'timber', TIMB); B.box(x0, y1 - th, z - th / 2, x1, y1, z + dz + th / 2, 'timber', 'timber', TIMB); B.box(x0, y0, z - th / 2, x1, y0 + th, z + dz + th / 2, 'timber', 'timber', TIMB);
    if (braces) { const xm = (x0 + x1) / 2; B.box(xm - th / 2, y0, z - 0.002, xm + th / 2, y1, z + dz + 0.01, 'timber', 'timber', TIMB); } }
  function wallFace(B, w, d, fn) { // run fn once per wall, in a frame where that wall is the +z face at z = depth/2 (x across it)
    B.with(0, 0, 0, 0, 1, () => fn(w, d / 2, 'f')); B.with(0, 0, 0, Math.PI, 1, () => fn(w, d / 2, 'b')); B.with(0, 0, 0, Math.PI / 2, 1, () => fn(d, w / 2, 'r')); B.with(0, 0, 0, -Math.PI / 2, 1, () => fn(d, w / 2, 'l')); }
  // ---------- the four concept houses (unit footprint ~1, front door on +z or the right gable) ----------
  function shack(B, det, v) { // Level 1 Delver's Shack: stone plinth, plaster walls, timber posts, steep patched gable roof, stone chimney
    const w = 0.92, d = 0.78, hp = 0.17, hw = 0.56;
    B.box(-w / 2, -0.06, -d / 2, w / 2, hp, d / 2, 'stone', null, W1, 0.6); B.box(-w / 2 + 0.01, hp, -d / 2 + 0.01, w / 2 - 0.01, hw, d / 2 - 0.01, 'plaster', null, W1, 0.9);
    for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) B.box(x * w / 2 - 0.03, hp, z * d / 2 - 0.03, x * w / 2 + 0.03, hw, z * d / 2 + 0.03, 'timber', 'timber', TIMB);
    // gable roof: ridge along z (gable faces +x, where the door is)
    const R2 = B.rings(-w / 2 - 0.08, w / 2 + 0.08, -d / 2 - 0.13, d / 2 + 0.13, hw, 1.05, 0, 4); B.roof(R2, 'roof', W1, [-w / 2, w / 2, hw], 'plaster', W1);
    if (det) { // patch on the roof, ridge cap, finial
      const pa = R2[1], pb = R2[3]; B.quad([-0.3, pa.y + 0.012, pa.z1 - 0.02], [-0.06, pa.y + 0.012, pa.z1 - 0.02], [-0.04, pb.y + 0.012, pb.z1 + 0.01], [-0.28, pb.y + 0.012, pb.z1 + 0.01], 'plank', [0.72, 0.56, 0.4]);
      B.beam([-w / 2 - 0.09, 1.06, 0], [w / 2 + 0.09, 1.06, 0], 0.05, 'roof', [0.8, 0.7, 0.7]); finial(B, w / 2 + 0.06, 1.06, 0, 0.2);
      // door on the +x gable end with a step, a round port window, lantern; window on the front
      B.with(w / 2, 0, 0, Math.PI / 2, 1, () => { B.quad([-0.13, hp - 0.07, 0.008], [0.13, hp - 0.07, 0.008], [0.13, 0.5, 0.008], [-0.13, 0.5, 0.008], 'door', W1); B.box(-0.16, 0.47, -0.01, 0.16, 0.52, 0.04, 'timber', 'timber', TIMB); B.box(-0.17, -0.06, 0.0, 0.17, 0.06, 0.12, 'stone', 'stone', [1.05, 1.05, 1.05], 0.4); lantern(B, -0.22, 0.38, 0.01, 1); if (v) lantern(B, 0.22, 0.38, 0.01, 1); });
      B.with(0, 0, 0, 0, 1, () => { windowOn(B, d / 2, -0.12, 0.27, 0.16, 0.19, true, true, v); B.beam([0.22, -0.02, d / 2 + 0.06], [0.08, 0.32, d / 2 + 0.03], 0.02, 'timber', TIMB); B.beam([0.04, 0.3, d / 2 + 0.03], [0.14, 0.33, d / 2 + 0.04], 0.025, 'iron', W1); B.cyl(0.32, -0.01, d / 2 + 0.06, 0.07, 0.07, 0.03, 10, 'plank', [0.85, 0.7, 0.45], 'plank'); });
      B.with(0, 0, 0, Math.PI, 1, () => windowOn(B, d / 2, 0.05, 0.27, 0.14, 0.17, false, true, false));
      chimney(B, -w / 2 + 0.1, -d / 2 + 0.14, 0.3, 1.0, 0.13); } }
  function cottage(B, det, v) { // Level 10 Cottage: rubble-stone lower walls, cream plaster, stone quoins, flared hip roof with two finials, chimney, lean-to shed
    const w = 1.0, d = 0.68, hs = 0.28, hw = 0.6;
    B.box(-w / 2, -0.06, -d / 2, w / 2, hs, d / 2, 'stone', null, W1, 0.55); B.box(-w / 2 + 0.008, hs, -d / 2 + 0.008, w / 2 - 0.008, hw, d / 2 - 0.008, 'plaster', null, W1, 0.9);
    for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) B.box(x * w / 2 - 0.045, -0.04, z * d / 2 - 0.045, x * w / 2 + 0.045, hw, z * d / 2 + 0.045, 'quoin', 'quoin', W1, 0.5);
    B.box(-w / 2 - 0.02, hw - 0.04, -d / 2 - 0.02, w / 2 + 0.02, hw, d / 2 + 0.02, 'timber', 'timber', TIMB);
    const R2 = B.rings(-w / 2 - 0.1, w / 2 + 0.1, -d / 2 - 0.1, d / 2 + 0.1, hw - 0.01, 1.08, 0.3, 5); B.roof(R2, 'roof', W1);
    if (det) { const top = R2[R2.length - 1]; B.beam([top.x0 - 0.01, top.y + 0.01, 0], [top.x1 + 0.01, top.y + 0.01, 0], 0.05, 'roof', [0.8, 0.7, 0.7]); finial(B, top.x0, top.y, 0, 0.2); finial(B, top.x1, top.y, 0, 0.2);
      for (let k = 0; k < 7; k++) { const x = -w / 2 + 0.08 + k * (w - 0.16) / 6; B.box(x - 0.015, hw - 0.06, d / 2, x + 0.015, hw - 0.02, d / 2 + 0.07, 'timber', 'timber', TIMB); }
      windowOn(B, d / 2, -0.27, 0.33, 0.13, 0.2, true, true, true); windowOn(B, d / 2, 0.02, 0.33, 0.13, 0.2, true, true, true);
      B.with(0, 0, 0, Math.PI, 1, () => { windowOn(B, d / 2, -0.15, 0.33, 0.13, 0.2, true, true, v); windowOn(B, d / 2, 0.2, 0.33, 0.13, 0.2, true, true, false); });
      // arched door on the +x end with stone step, lantern and hanging sign; the lean-to shed beside it
      B.with(w / 2, 0, 0, Math.PI / 2, 1, () => { B.quad([-0.1, -0.03, 0.01], [0.13, -0.03, 0.01], [0.13, 0.46, 0.01], [-0.1, 0.46, 0.01], 'door', W1); B.box(-0.14, -0.06, 0, 0.17, 0.035, 0.12, 'stone', 'stone', [1.05, 1.05, 1.05], 0.4);
        lantern(B, 0.2, 0.42, 0.01, 1); B.beam([0.24, 0.5, 0.01], [0.24, 0.5, 0.2], 0.018, 'iron', W1); B.box(0.17, 0.36, 0.17, 0.31, 0.46, 0.19, 'plank', 'plank', TIMB);
        // lean-to shed
        const sx0 = -0.34, sx1 = -0.08; B.box(sx0 - 0.08, -0.04, 0.0, sx1 - 0.08, 0.3, 0.2, 'plank', null, [0.85, 0.75, 0.65], 0.4);
        B.quad([sx0 - 0.1, 0.27, 0.24], [sx1 - 0.06, 0.27, 0.24], [sx1 - 0.06, 0.4, -0.01], [sx0 - 0.1, 0.4, -0.01], 'roof', W1, [0, 0, 0.3, 0.3]);
        for (let k = 0; k < 3; k++) B.beam([sx0 + k * 0.05, 0.0, 0.22], [sx0 + k * 0.05 + 0.01, 0.24, 0.215], 0.014, 'timber', TIMB); crate(B, sx1 + 0.02, -0.03, 0.22, 0.11); if (v) barrel(B, sx0 - 0.02, -0.03, 0.3, 0.05, 0.12); });
      chimney(B, -w / 2 + 0.16, -0.03, 0.55, 1.12, 0.13); } }
  function townhouse(B, det, v) { // Level 20 Stacked Townhouse: stone ground floor, jettied timber-framed floors, wrap-around balcony, steep gable roof with dormers, ladders, washing line, banners
    const w0 = 0.72, d0 = 0.66, h0 = 0.48, w1 = 0.84, d1 = 0.74, h1 = 0.9, h2 = 1.22, ov = 0.07;
    B.box(-w0 / 2, -0.06, -d0 / 2, w0 / 2, h0, d0 / 2, 'stone', null, W1, 0.55);
    // balcony deck + joists
    B.box(-w1 / 2 - 0.08, h0, -d1 / 2 - 0.08, w1 / 2 + 0.08, h0 + 0.04, d1 / 2 + 0.08, 'plank', 'plank', TIMB, 0.5);
    for (let k = 0; k < 6; k++) { const x = -w1 / 2 + k * w1 / 5; B.beam([x, h0 - 0.12, d0 / 2], [x, h0, d1 / 2 + 0.06], 0.03, 'timber', TIMB); }
    B.box(-w1 / 2 + 0.06, h0 + 0.04, -d1 / 2 + 0.06, w1 / 2 - 0.06, h1, d1 / 2 - 0.06, 'plaster', null, W1, 0.9);
    B.box(-w1 / 2 - 0.0, h1, -d1 / 2, w1 / 2, h1 + 0.04, d1 / 2, 'timber', 'timber', TIMB); // jetty beam
    B.box(-w1 / 2 + 0.0, h1 + 0.04, -d1 / 2 + 0.0, w1 / 2, h2, d1 / 2, 'plaster', null, W1, 0.9);
    const R2 = B.rings(-w1 / 2 - ov, w1 / 2 + ov, -d1 / 2 - ov - 0.04, d1 / 2 + ov + 0.04, h2, 1.75, 0, 5); B.roof(R2, 'roof', W1, [-w1 / 2, w1 / 2, h2], 'plaster', W1);
    if (det) { // framing on both upper floors, all four walls
      wallFace(B, w1, d1, (L, z, f) => { const n = 3; for (let k = 0; k < n; k++) timberFrame(B, -L / 2 + 0.06 + k * (L - 0.12) / n, -L / 2 + 0.06 + (k + 1) * (L - 0.12) / n, h0 + 0.04, h1, z - 0.06, false); for (let k = 0; k < n; k++) timberFrame(B, -L / 2 + k * L / n, -L / 2 + (k + 1) * L / n, h1 + 0.04, h2, z, false);
        if (f === 'f' || f === 'r') { windowOn(B, z - 0.05, -L * 0.22, h0 + 0.16, 0.12, 0.17, false, true, false); windowOn(B, z - 0.05, L * 0.2, h0 + 0.16, 0.12, 0.17, false, true, false); windowOn(B, z + 0.005, -L * 0.18, h1 + 0.08, 0.11, 0.15, false, true, f === 'f'); windowOn(B, z + 0.005, L * 0.22, h1 + 0.08, 0.11, 0.15, false, true, false); }
        else windowOn(B, z + 0.005, 0, h1 + 0.08, 0.11, 0.15, false, true, false);
        // balcony railing
        const rz = (f === 'f' || f === 'b' ? d1 : w1) / 2 + 0.07, rl = (f === 'f' || f === 'b' ? w1 : d1) / 2 + 0.07; B.beam([-rl, h0 + 0.17, rz], [rl, h0 + 0.17, rz], 0.03, 'timber', TIMB); for (let k = 0; k <= 8; k++) { const x = -rl + k * rl * 2 / 8; B.beam([x, h0 + 0.04, rz], [x, h0 + 0.17, rz], 0.022, 'timber', TIMB); } });
      // gable window, dormers on the front slope, ridge, finials, chimney with a spyglass deck
      B.with(w1 / 2 + 0.002, 0, 0, Math.PI / 2, 1, () => windowOn(B, 0, 0, h2 + 0.12, 0.12, 0.17, true, true, true));
      for (const x of [-0.18, 0.18]) { const z0 = d1 / 2 - 0.02, y0 = h2 + 0.12; B.box(x - 0.08, y0, z0 - 0.22, x + 0.08, y0 + 0.17, z0 - 0.05, 'plaster', null, W1); windowOn(B, z0 - 0.05, x, y0 + 0.02, 0.09, 0.12, false, false, false);
        B.quad([x - 0.11, y0 + 0.15, z0 - 0.02], [x, y0 + 0.28, z0 - 0.02], [x, y0 + 0.28, z0 - 0.26], [x - 0.11, y0 + 0.15, z0 - 0.26], 'roof', W1, [0, 0, 0.2, 0.3]); B.quad([x, y0 + 0.28, z0 - 0.02], [x + 0.11, y0 + 0.15, z0 - 0.02], [x + 0.11, y0 + 0.15, z0 - 0.26], [x, y0 + 0.28, z0 - 0.26], 'roof', W1, [0, 0, 0.2, 0.3]);
        B.tri([x - 0.08, y0 + 0.17, z0 - 0.05], [x + 0.08, y0 + 0.17, z0 - 0.05], [x, y0 + 0.27, z0 - 0.05], 'plaster', W1); }
      const top = R2[R2.length - 1]; B.beam([top.x0, top.y + 0.01, 0], [top.x1, top.y + 0.01, 0], 0.05, 'roof', [0.8, 0.7, 0.7]); finial(B, top.x0 + 0.02, top.y, 0, 0.2); finial(B, top.x1 - 0.02, top.y, 0, 0.16);
      chimney(B, 0.1, -0.12, h2, 1.78, 0.16); if (v) { B.box(0.0, 1.82, -0.22, 0.2, 1.84, -0.02, 'plank', 'plank', TIMB); B.beam([0.04, 1.86, -0.12], [0.18, 1.9, -0.1], 0.03, 'chim', [1.3, 1.0, 0.5]); }
      // ground floor: arched door + step, small window, barrel; ladders up to the balcony and to the roof; washing line and banners
      B.quad([-0.2, -0.03, d0 / 2 + 0.008], [0.02, -0.03, d0 / 2 + 0.008], [0.02, 0.36, d0 / 2 + 0.008], [-0.2, 0.36, d0 / 2 + 0.008], 'door', W1); B.box(-0.24, -0.06, d0 / 2, 0.06, 0.03, d0 / 2 + 0.1, 'stone', 'stone', [1.05, 1.05, 1.05], 0.4);
      windowOn(B, d0 / 2, 0.2, 0.2, 0.07, 0.09, true, false, false); barrel(B, 0.18, -0.03, d0 / 2 + 0.1, 0.06, 0.15);
      ladder(B, [w0 / 2 + 0.12, -0.04, 0.1], [w0 / 2 + 0.03, h0 + 0.04, 0.12], 0.05); ladder(B, [0.25, h0 + 0.05, d1 / 2 + 0.05], [0.28, h2 - 0.02, d1 / 2 + 0.01], 0.045);
      B.beam([-w1 / 2 - 0.12, h1 - 0.02, d1 / 2 + 0.12], [w1 / 2 + 0.12, h1 - 0.02, d1 / 2 + 0.12], 0.008, 'plank', [0.9, 0.85, 0.7]);
      for (let k = 0; k < 6; k++) { const x = -w1 / 2 + 0.02 + k * 0.16, hh = 0.09 + (k % 3) * 0.03; B.quad([x, h1 - 0.02 - hh, d1 / 2 + 0.125], [x + 0.09, h1 - 0.02 - hh, d1 / 2 + 0.125], [x + 0.09, h1 - 0.02, d1 / 2 + 0.125], [x, h1 - 0.02, d1 / 2 + 0.125], 'cloth', W1, [(k % 6) / 6, 0, (k % 6) / 6 + 0.16, 1]); }
      for (const z of [d0 / 2 - 0.1, -d0 / 2 + 0.15]) { B.beam([-w0 / 2, 0.42, z], [-w0 / 2 - 0.1, 0.42, z], 0.015, 'iron', W1); B.quad([-w0 / 2 - 0.1, 0.18, z + 0.04], [-w0 / 2 - 0.1, 0.18, z - 0.04], [-w0 / 2 - 0.1, 0.41, z - 0.04], [-w0 / 2 - 0.1, 0.41, z + 0.04], 'cloth', W1, [0, 0, 0.16, 1]); B.quad([-w0 / 2 - 0.1, 0.18, z - 0.04], [-w0 / 2 - 0.1, 0.18, z + 0.04], [-w0 / 2 - 0.1, 0.41, z + 0.04], [-w0 / 2 - 0.1, 0.41, z - 0.04], 'cloth', W1, [0, 0, 0.16, 1]); }
      lantern(B, -w1 / 2 - 0.0, h1 - 0.1, d1 / 2 - 0.05, 1); lantern(B, w1 / 2, h1 - 0.1, d1 / 2 - 0.05, 1); } }
  function workshop(B, det, v) { // Level 30 Relic Workshop: three stacked storeys with tiled skirts, a round stone tower with a slate cone and weathervane, crane + dangling crate, open arched doors
    const w = 1.0, d = 0.78, f1 = 0.44, f2 = 0.8, f3 = 1.1;
    B.box(-w / 2, -0.06, -d / 2, w / 2, 0.1, d / 2, 'stone', null, W1, 0.5); B.box(-w / 2 + 0.01, 0.1, -d / 2 + 0.01, w / 2 - 0.01, f1, d / 2 - 0.01, 'plaster', null, W1, 0.9);
    const skirt = (x0, x1, z0, z1, y, out, h) => { const R2 = [{ x0: x0 - out, x1: x1 + out, z0: z0 - out, z1: z1 + out, y }, { x0, x1, z0, z1, y: y + h }]; B.roof(R2, 'roof', W1); };
    skirt(-w / 2, w / 2, -d / 2, d / 2, f1 - 0.03, 0.1, 0.12);
    const w2 = w - 0.12, d2 = d - 0.1; B.box(-w2 / 2, f1 + 0.08, -d2 / 2, w2 / 2, f2, d2 / 2, 'plaster', null, W1, 0.9); skirt(-w2 / 2, w2 / 2, -d2 / 2, d2 / 2, f2 - 0.03, 0.09, 0.11);
    const w3 = w2 - 0.14, d3 = d2 - 0.08; B.box(-w3 / 2, f2 + 0.07, -d3 / 2, w3 / 2, f3, d3 / 2, 'plaster', null, W1, 0.9);
    const R3 = B.rings(-w3 / 2 - 0.08, w3 / 2 + 0.08, -d3 / 2 - 0.08, d3 / 2 + 0.08, f3, 1.5, 0, 5); B.roof(R3, 'roof', W1, [-w3 / 2, w3 / 2, f3], 'plaster', W1);
    // the round tower (back-left) with a slate cone
    const tx = -w / 2 - 0.02, tz = -d / 2 + 0.12, tr = 0.19; B.cyl(tx, -0.06, tz, tr * 1.08, tr, 1.3, 14, 'stone', W1, null, 2); B.cyl(tx, 1.24, tz, tr + 0.06, tr + 0.06, 0.04, 14, 'timber', W1, 'timber'); B.cyl(tx, 1.28, tz, tr + 0.06, 0.0, 0.5, 14, 'slate', W1, null, 2);
    if (det) { for (const [x0, x1, y0, y1, z] of [[-w / 2, w / 2, 0.1, f1 - 0.04, d / 2 - 0.01], [-w2 / 2, w2 / 2, f1 + 0.08, f2 - 0.03, d2 / 2], [-w3 / 2, w3 / 2, f2 + 0.07, f3, d3 / 2]]) { B.with(0, 0, 0, 0, 1, () => timberFrame(B, x0, x1, y0, y1, z, false)); B.with(0, 0, 0, Math.PI / 2, 1, () => timberFrame(B, -d / 2 + (w / 2 - x1), d / 2 - (w / 2 - x1), y0, y1, x1 - 0.002, false)); }
      for (const x of [-0.28, 0.0, 0.28]) windowOn(B, d2 / 2, x, f1 + 0.15, 0.1, 0.15, true, true, false); for (const x of [-0.18, 0.18]) windowOn(B, d3 / 2, x, f2 + 0.13, 0.1, 0.14, true, true, false);
      B.with(0, 0, 0, Math.PI / 2, 1, () => { for (const x of [-0.18, 0.18]) windowOn(B, w2 / 2, x, f1 + 0.15, 0.1, 0.15, true, true, false); windowOn(B, w3 / 2, 0, f2 + 0.13, 0.1, 0.14, true, true, v); windowOn(B, w3 / 2 + 0.002, 0, f3 + 0.12, 0.1, 0.13, true, true, true); });
      // open arched doors (warm interior) on the front and the side, with steps and lanterns
      B.quad([-0.26, -0.03, d / 2 + 0.006], [0.0, -0.03, d / 2 + 0.006], [0.0, 0.38, d / 2 + 0.006], [-0.26, 0.38, d / 2 + 0.006], 'doorO', W1); B.box(-0.3, -0.06, d / 2, 0.04, 0.03, d / 2 + 0.12, 'stone', 'stone', [1.05, 1.05, 1.05], 0.4);
      B.quad([-0.38, -0.03, d / 2 + 0.16], [-0.26, -0.03, d / 2 + 0.006], [-0.26, 0.33, d / 2 + 0.006], [-0.38, 0.33, d / 2 + 0.16], 'plank', [0.9, 0.8, 0.7]); B.quad([0.0, -0.03, d / 2 + 0.006], [0.12, -0.03, d / 2 + 0.16], [0.12, 0.33, d / 2 + 0.16], [0.0, 0.33, d / 2 + 0.006], 'plank', [0.9, 0.8, 0.7]);
      B.with(w / 2, 0, 0.05, Math.PI / 2, 1, () => { B.quad([-0.12, -0.03, 0.008], [0.12, -0.03, 0.008], [0.12, 0.32, 0.008], [-0.12, 0.32, 0.008], 'doorO', W1); B.box(-0.15, -0.06, 0, 0.15, 0.03, 0.1, 'stone', 'stone', [1.05, 1.05, 1.05], 0.4); lantern(B, -0.18, 0.34, 0.01, 1); });
      lantern(B, 0.08, 0.36, d / 2 + 0.01, 1); lantern(B, w / 2 - 0.04, f2 - 0.1, d2 / 2 + 0.03, 1); lantern(B, -w / 2 + 0.06, f2 - 0.1, d2 / 2 + 0.03, 1);
      // tower: windows, door, weathervane (rooster-ish), crane arm with pulley and a dangling crate
      B.with(tx, 0, tz, -Math.PI * 0.75, 1, () => { windowOn(B, tr + 0.005, 0, 0.8, 0.08, 0.12, true, true, false); B.quad([-0.07, -0.03, tr + 0.01], [0.07, -0.03, tr + 0.01], [0.07, 0.25, tr + 0.01], [-0.07, 0.25, tr + 0.01], 'door', [0.8, 0.8, 0.8]); });
      B.cyl(tx, 1.78, tz, 0.012, 0.012, 0.14, 5, 'iron', W1); B.box(tx - 0.05, 1.9, tz - 0.005, tx + 0.05, 1.93, tz + 0.005, 'iron', 'iron', W1); B.box(tx - 0.015, 1.93, tz - 0.012, tx + 0.04, 1.99, tz + 0.012, 'chim', 'chim', [1.3, 1.05, 0.55]);
      const ca = [tx - 0.02, 0.9, tz + tr], cb = [tx - 0.02, 0.9, tz + tr + 0.36]; B.beam(ca, cb, 0.05, 'timber', TIMB); B.beam([tx - 0.02, 0.68, tz + tr], [cb[0], 0.9, cb[2] - 0.12], 0.035, 'timber', TIMB); B.cyl(cb[0], 0.83, cb[2] - 0.02, 0.03, 0.03, 0.02, 10, 'iron', W1);
      B.beam([cb[0], 0.84, cb[2] - 0.02], [cb[0], 0.5, cb[2] - 0.02], 0.008, 'plank', [0.9, 0.85, 0.7]); for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) B.beam([cb[0], 0.5, cb[2] - 0.02], [cb[0] + sx * 0.06, 0.4, cb[2] - 0.02 + sz * 0.06], 0.006, 'plank', [0.9, 0.85, 0.7]); crate(B, cb[0], 0.3, cb[2] - 0.02, 0.13); B.box(cb[0] - 0.04, 0.43, cb[2] - 0.05, cb[0] + 0.04, 0.47, cb[2] + 0.01, 'chim', 'chim', [1.4, 1.1, 0.5]);
      // moss on the skirts, chimney, ridge, finials, ladders between storeys
      for (const [x0, x1, y, z] of [[-w / 2, w / 2, f1 + 0.08, d / 2 + 0.06], [-w2 / 2, w2 / 2, f2 + 0.07, d2 / 2 + 0.05]]) for (let k = 0; k < 5; k++) { const x = x0 + (k + 0.3 + (k * 0.37) % 0.4) * (x1 - x0) / 5; B.box(x - 0.05, y - 0.012, z - 0.025, x + 0.04 * (1 + k % 2), y + 0.004, z, 'moss', 'moss', [0.62, 0.7, 0.5]); }
      chimney(B, 0.24, -0.12, f3, 1.55, 0.14); const top = R3[R3.length - 1]; B.beam([top.x0, top.y + 0.01, 0], [top.x1, top.y + 0.01, 0], 0.05, 'roof', [0.8, 0.7, 0.7]); finial(B, top.x0 + 0.02, top.y, 0, 0.2);
      B.cyl(top.x1 - 0.02, top.y, 0, 0.012, 0.012, 0.18, 5, 'iron', W1); B.beam([top.x1 - 0.08, top.y + 0.16, 0], [top.x1 + 0.04, top.y + 0.16, 0], 0.012, 'iron', W1); B.beam([top.x1 - 0.02, top.y + 0.16, -0.06], [top.x1 - 0.02, top.y + 0.16, 0.06], 0.012, 'iron', W1);
      ladder(B, [w / 2 - 0.12, f1 + 0.1, d2 / 2 + 0.07], [w / 2 - 0.16, f2 + 0.06, d3 / 2 + 0.06], 0.04); if (v) ladder(B, [-w / 2 + 0.16, f1 + 0.12, d2 / 2 + 0.07], [-w / 2 + 0.22, f2 + 0.07, d3 / 2 + 0.06], 0.04); } }
  const KINDS = { shack, cottage, townhouse, workshop };
  function material() { if (!atlas) atlas = paintAtlas(); const m = new THREE.MeshLambertMaterial({ map: atlas.T, vertexColors: true, emissive: 0xffb060, emissiveMap: atlas.TE, emissiveIntensity: 0 }); return m; }
  function houses() { const out = {}, mat = material(); for (const k in KINDS) for (const v of [0, 1]) { const geos = [0, 1].map((lod) => { const B = Builder(); KINDS[k](B, lod === 0, v); return B.geo(); }); out[k + (v ? '2' : '')] = { geos, mat, tree: false }; } return out; }
  /* ---------- trees: conifers (stacked jagged tiers) and broadleaf (layered leafy crowns), like the painted hillsides ---------- */
  let treeAtlas = null;
  function paintTreeAtlas() { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const g = cv.getContext('2d'); const r = rng(3);
    g.fillStyle = '#5a4030'; g.fillRect(0, 0, 128, 256); for (let k = 0; k < 120; k++) { g.strokeStyle = `rgba(${r() < 0.5 ? '30,20,12' : '140,110,80'},${0.3 + r() * 0.3})`; g.lineWidth = 1 + r() * 3; const x = r() * 128; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (r() - 0.5) * 10, 256); g.stroke(); }
    g.fillStyle = '#7d9a48'; g.fillRect(128, 0, 384, 256); for (let k = 0; k < 2600; k++) { const x = 128 + r() * 384, y = r() * 256, s = 2 + r() * 5, q = r(); g.fillStyle = q < 0.3 ? 'rgba(52,80,34,.8)' : q < 0.8 ? `rgba(${110 + r() * 30 | 0},${146 + r() * 26 | 0},${64 + r() * 18 | 0},.8)` : 'rgba(184,204,110,.75)'; g.beginPath(); g.ellipse(x, y, s, s * 0.6, r() * 3, 0, 6.3); g.fill(); }
    const T = new THREE.CanvasTexture(cv); T.encoding = THREE.sRGBEncoding; T.anisotropy = 8; return T; }
  function TBuilder() { const B = { p: [], n: [], uv: [], c: [], i: [] }; B.v = (x, y, z, nx, ny, nz, u, v, c) => { B.p.push(x, y, z); B.n.push(nx, ny, nz); B.uv.push(u, v); B.c.push(c[0], c[1], c[2]); return B.p.length / 3 - 1; };
    B.geo = () => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(B.uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(B.c, 3)); g.setIndex(B.i); g.computeBoundingSphere(); return g; }; return B; }
  const BARK = (u, v) => [u * 0.24 + 0.005, v], LEAF = (u, v) => [0.26 + u * 0.72, v];
  function trunk(B, x0, y0, z0, x1, y1, z1, r0, r1, n) { const d = new THREE.Vector3(x1 - x0, y1 - y0, z1 - z0), L = d.length(); d.normalize(); const up = Math.abs(d.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0), a = new THREE.Vector3().crossVectors(d, up).normalize(), b = new THREE.Vector3().crossVectors(a, d);
    const base = B.p.length / 3; for (const [t, r] of [[0, r0], [1, r1]]) for (let k = 0; k <= n; k++) { const ang = k / n * Math.PI * 2, nx = a.x * Math.cos(ang) + b.x * Math.sin(ang), ny = a.y * Math.cos(ang) + b.y * Math.sin(ang), nz = a.z * Math.cos(ang) + b.z * Math.sin(ang); const [u, v] = BARK(k / n, t * Math.min(1, L * 3));
      B.v(x0 + d.x * L * t + nx * r, y0 + d.y * L * t + ny * r, z0 + d.z * L * t + nz * r, nx, ny, nz, u, v, [1, 1, 1]); }
    for (let k = 0; k < n; k++) B.i.push(base + k, base + n + 1 + k, base + k + 1, base + k + 1, base + n + 1 + k, base + n + 2 + k); }
  function blob(B, cx, cy, cz, rx, ry, rz, det, seed, light) { const g = new THREE.IcosahedronGeometry(1, det), P = g.attributes.position, base = B.p.length / 3, r = rng(seed); const ph = [r() * 10, r() * 10, r() * 10];
    const idx = []; const map = new Map(); // dedupe icosahedron verts so the displaced blob stays closed
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), key = (x * 1e4 | 0) + ',' + (y * 1e4 | 0) + ',' + (z * 1e4 | 0); let j = map.get(key);
      if (j == null) { const n = 1 + 0.16 * Math.sin(x * 5 + ph[0]) * Math.sin(y * 4 + ph[1]) * Math.sin(z * 5 + ph[2]) + 0.1 * Math.sin(x * 11 + y * 9 + ph[0]); const yy = y > 0 ? y : y * 0.55, sh = (0.5 + 0.55 * Math.pow(Math.max(0, (y + 0.7) / 1.7), 1.2)) * light;
        const [u, v] = LEAF((Math.atan2(z, x) / Math.PI + 1) / 2 * 0.98 + 0.01, (y + 1) / 2); j = B.v(cx + x * n * rx, cy + yy * n * ry, cz + z * n * rz, x, y, z, u, v, [sh * 0.96, sh, sh * 0.86]); map.set(key, j); } idx.push(j); }
    for (let i = 0; i < idx.length; i += 3) B.i.push(idx[i], idx[i + 1], idx[i + 2]); }
  function conifer(lod) { const B = TBuilder(), r = rng(11), tiers = lod ? 5 : 10; trunk(B, 0, -0.05, 0, 0, 0.4, 0, 0.05, 0.03, lod ? 5 : 7);
    for (let t = 0; t < tiers; t++) { const f = t / (tiers - 1), y0 = 0.1 + f * 0.8, y1 = y0 + (lod ? 0.26 : 0.2) - f * 0.06, rad = 0.34 * (1 - f * 0.85) + 0.02, n = lod ? 7 : 14, sh = 0.55 + f * 0.5, rot = r() * 6.28;
      // a drooping skirt of branch tips: long and short spokes alternate, tips hang below the tier's base
      const ring = []; for (let k = 0; k <= n; k++) { const kk = k % n, a = kk / n * Math.PI * 2 + rot, long = kk % 2 === 0, rr = rad * (long ? 1.05 : 0.72) * (0.9 + r() * 0.2), dy = long ? -0.035 - r() * 0.03 : 0.01; ring.push([Math.cos(a) * rr, y0 + dy, Math.sin(a) * rr]); }
      ring[n] = ring[0];
      const tipI = B.v(0, y1, 0, 0, 1, 0, ...LEAF(0.5, 1), [sh * 0.85, sh, sh * 0.75]);
      const rI = ring.map(([x, y, z], k) => { const l = Math.hypot(x, z) || 1; const dk = k % 2 ? 0.8 : 1.0; return B.v(x, y, z, x / l * 0.75, 0.66, z / l * 0.75, ...LEAF(k / n, 0), [sh * 0.5 * dk, sh * 0.6 * dk, sh * 0.42 * dk]); });
      for (let k = 0; k < n; k++) B.i.push(rI[k], tipI, rI[k + 1]); const ci = B.v(0, y0 + 0.03, 0, 0, -1, 0, ...LEAF(0.5, 0.5), [0.22, 0.28, 0.2]); for (let k = 0; k < n; k++) B.i.push(rI[k + 1], ci, rI[k]); }
    return B.geo(); }
  function broadleaf(lod, droop) { const B = TBuilder(), r = rng(droop ? 23 : 17); trunk(B, 0, -0.05, 0, 0.02, 0.42, 0.01, 0.06, 0.04, lod ? 5 : 8);
    if (!lod) for (let k = 0; k < 4; k++) { const a = k * 1.7 + 0.4; trunk(B, 0.01, 0.34, 0, Math.cos(a) * 0.22, 0.56 + r() * 0.1, Math.sin(a) * 0.22, 0.03, 0.015, 5); }
    const n = lod ? 5 : 15; for (let k = 0; k < n; k++) { const a = k * 2.399 + r() * 0.4, top = k < 3, rr = k === 0 ? 0 : (top ? 0.1 : 0.2 + r() * 0.12), y = top ? 0.8 + r() * 0.06 : 0.55 + r() * 0.22, s2 = (lod ? 1.35 : 1) * (top ? 0.2 : 0.14 + r() * 0.06);
      blob(B, Math.cos(a) * rr, y, Math.sin(a) * rr, s2 * (droop ? 1.2 : 1.1), s2 * (droop ? 0.8 : 0.75), s2 * (droop ? 1.2 : 1.1), lod ? 1 : 2, k * 7 + (droop ? 3 : 1), 0.82 + 0.35 * (y - 0.55)); }
    if (droop && !lod) for (let k = 0; k < 26; k++) { const a = r() * 6.28, rr = 0.2 + r() * 0.2, x = Math.cos(a) * rr, z = Math.sin(a) * rr, y = 0.55 + r() * 0.1, L = 0.15 + r() * 0.2; const b0 = B.p.length / 3; for (const [dx, dy] of [[-0.012, 0], [0.012, 0], [0.004, -L], [-0.004, -L]]) B.v(x + dx, y + dy, z, Math.cos(a), 0, Math.sin(a), ...LEAF(0.3, 0.5), [0.5, 0.62, 0.38]); B.i.push(b0, b0 + 1, b0 + 2, b0, b0 + 2, b0 + 3, b0, b0 + 2, b0 + 1, b0, b0 + 3, b0 + 2); }
    return B.geo(); }
  function trees() { if (!treeAtlas) treeAtlas = paintTreeAtlas(); const mat = new THREE.MeshLambertMaterial({ map: treeAtlas, vertexColors: true, side: THREE.DoubleSide });
    return { oak: { geos: [broadleaf(0), broadleaf(1)], mat, tree: true }, willow: { geos: [broadleaf(0, true), broadleaf(1, true)], mat, tree: true }, sequoia: { geos: [conifer(0), conifer(1)], mat, tree: true } }; }
  return { houses, trees, atlas: () => atlas };
})();

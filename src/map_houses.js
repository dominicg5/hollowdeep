
/* =====================================================================
   PROCEDURAL HOUSES + TREES for the 3D Ledgeville, modelled on the concept sheet
   (concept/house-concepts.pdf, the painted city/hillside targets and the Heartwood image).
   Eight house tiers x three variants. Every house is one merged geometry (LOD0 detailed, LOD1 simple)
   sharing a painted texture atlas + an emissive atlas (windows and lanterns glow softly at night).
   Roofs are built from real overlapping clay-tile courses with ridge caps, thick eaves and barge boards.
   ===================================================================== */
const HOUSE_KIT = (() => {
  const AT = 2048, AU = 1024; let atlas = null;
  // atlas regions [x0, y0, x1, y1] in AU (1024) units
  const R = { tileA: [0, 0, 512, 128], tileB: [0, 128, 512, 256], plaster: [512, 0, 768, 256], stone: [768, 0, 1024, 256],
    roofFlat: [0, 256, 256, 512], slate: [256, 256, 512, 384], timber: [512, 256, 768, 384], plank: [768, 256, 1024, 384],
    sign: [256, 384, 384, 512], tileEnd: [384, 384, 512, 512], slateRow: [512, 384, 768, 512], win: [768, 384, 896, 512], winA: [896, 384, 1024, 512],
    door: [0, 512, 128, 768], doorO: [128, 512, 256, 768], chim: [256, 512, 512, 768], iron: [512, 512, 576, 576], lamp: [576, 512, 640, 576], white: [512, 576, 576, 640],
    roofU: [576, 576, 640, 640], moss: [640, 512, 704, 576], leaf: [640, 576, 704, 640], quoin: [704, 512, 832, 640], cloth: [832, 512, 1024, 640],
    shutter: [512, 640, 640, 768], flower: [640, 640, 768, 768], ridgeT: [768, 640, 896, 768], bark: [896, 640, 1024, 768], winR: [0, 768, 128, 896], winS: [128, 768, 256, 896], hay: [256, 768, 384, 896], lumen: [384, 768, 448, 832] };
  function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  /* ---------- painted atlas ---------- */
  function paintAtlas() {
    const cv = document.createElement('canvas'); cv.width = cv.height = AT; const g = cv.getContext('2d'); g.scale(AT / AU, AT / AU);
    const em = document.createElement('canvas'); em.width = em.height = AU; const e = em.getContext('2d'); e.fillStyle = '#000'; e.fillRect(0, 0, AU, AU);
    const r = rng(7), rgb = (a, v) => `rgb(${Math.min(255, a[0] * v) | 0},${Math.min(255, a[1] * v) | 0},${Math.min(255, a[2] * v) | 0})`;
    const fill = (k, c) => { const [x0, y0, x1, y1] = R[k]; g.fillStyle = c; g.fillRect(x0, y0, x1 - x0, y1 - y0); };
    const clip = (k, fn) => { const [x0, y0, x1, y1] = R[k]; g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip(); fn(x0, y0, x1 - x0, y1 - y0); g.restore(); };
    // one course of clay tiles: rounded butts at the bottom, covered (dark) at the top, barrel shading, weathering
    const tileRow = (x0, y0, w, h, off, slate) => { g.fillStyle = slate ? '#20242c' : '#3e160c'; g.fillRect(x0, y0, w, h); const n = slate ? 7 : 6, tw = w / n;
      for (let i = -1; i <= n; i++) { const x = x0 + (i + off) * tw, v = 0.84 + r() * 0.3, hu = r(), old = r() < 0.12;
        const base = slate ? [70 + hu * 14, 76 + hu * 14, 90 + hu * 12] : old ? [170, 92, 58] : [164 + hu * 26, 58 + hu * 20, 34 + hu * 10];
        const gr = g.createLinearGradient(0, y0, 0, y0 + h); gr.addColorStop(0, rgb(base, v * 0.45)); gr.addColorStop(0.32, rgb(base, v * 0.85)); gr.addColorStop(0.78, rgb(base, v * 1.12)); gr.addColorStop(1, rgb(base, v * 0.8)); g.fillStyle = gr;
        const rr = slate ? tw * 0.22 : tw * 0.34; g.beginPath(); g.moveTo(x + 2, y0 - 2); g.lineTo(x + tw - 2, y0 - 2); g.lineTo(x + tw - 2, y0 + h - rr - 3); g.quadraticCurveTo(x + tw - 2, y0 + h - 3, x + tw / 2, y0 + h - 3); g.quadraticCurveTo(x + 2, y0 + h - 3, x + 2, y0 + h - rr - 3); g.closePath(); g.fill();
        const sg = g.createLinearGradient(x, 0, x + tw, 0); sg.addColorStop(0, 'rgba(40,10,0,.35)'); sg.addColorStop(0.32, 'rgba(255,225,190,.16)'); sg.addColorStop(0.6, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(40,10,0,.4)'); g.fillStyle = sg; g.fill();
        g.strokeStyle = slate ? 'rgba(10,12,18,.6)' : 'rgba(60,18,6,.55)'; g.lineWidth = 2; g.stroke();
        for (let k = 0; k < 5; k++) { g.fillStyle = r() < 0.5 ? 'rgba(60,30,20,.18)' : 'rgba(255,220,180,.12)'; g.beginPath(); g.ellipse(x + 6 + r() * (tw - 12), y0 + h * (0.35 + r() * 0.55), 1.5 + r() * 4, 1 + r() * 3, 0, 0, 6.3); g.fill(); }
        if (!slate && r() < 0.18) { g.fillStyle = `rgba(${90 + r() * 30 | 0},${110 + r() * 30 | 0},${40},.5)`; g.beginPath(); g.ellipse(x + tw * (0.3 + r() * 0.4), y0 + h * 0.85, 4 + r() * 8, 2 + r() * 3, 0, 0, 6.3); g.fill(); } } };
    clip('tileA', (x0, y0, w, h) => tileRow(x0, y0, w, h, 0)); clip('tileB', (x0, y0, w, h) => tileRow(x0, y0, w, h, 0.5));
    clip('roofFlat', (x0, y0, w, h) => { for (let j = 0; j < 6; j++) tileRow(x0, y0 + j * h / 6, w, h / 6, (j % 2) * 0.5); });
    clip('slateRow', (x0, y0, w, h) => tileRow(x0, y0, w, h, 0, true)); clip('slate', (x0, y0, w, h) => { for (let j = 0; j < 5; j++) tileRow(x0, y0 + j * h / 5, w, h / 5, (j % 2) * 0.5, true); });
    clip('tileEnd', (x0, y0, w, h) => { g.fillStyle = '#5a2010'; g.fillRect(x0, y0, w, h); for (let i = 0; i < 8; i++) { g.fillStyle = rgb([140, 52, 28], 0.8 + r() * 0.3); g.beginPath(); g.ellipse(x0 + (i + 0.5) * w / 8, y0 + h / 2, w / 18, h * 0.45, 0, 0, 6.3); g.fill(); } });
    clip('ridgeT', (x0, y0, w, h) => { g.fillStyle = '#4a180c'; g.fillRect(x0, y0, w, h); for (let i = 0; i < 4; i++) { const x = x0 + i * w / 4, v = 0.85 + r() * 0.25, gr = g.createLinearGradient(x, 0, x + w / 4, 0); gr.addColorStop(0, rgb([150, 56, 30], v)); gr.addColorStop(0.7, rgb([206, 92, 52], v)); gr.addColorStop(1, rgb([120, 40, 20], v)); g.fillStyle = gr; g.fillRect(x + 2, y0, w / 4 - 4, h); } });
    // warm cream plaster: mottled, a little grimy toward the bottom
    clip('plaster', (x0, y0, w, h) => { g.fillStyle = '#ecd6a2'; g.fillRect(x0, y0, w, h); for (let k = 0; k < 700; k++) { const v = r(); g.fillStyle = v < 0.5 ? `rgba(170,128,74,${0.04 + r() * 0.07})` : `rgba(255,248,222,${0.06 + r() * 0.1})`; g.beginPath(); g.ellipse(x0 + r() * w, y0 + r() * h, 2 + r() * 16, 2 + r() * 10, r() * 3, 0, 6.3); g.fill(); }
      for (let k = 0; k < 6; k++) { g.strokeStyle = 'rgba(120,90,60,.25)'; g.lineWidth = 1; g.beginPath(); let x = x0 + r() * w, y = y0 + r() * h; g.moveTo(x, y); for (let s = 0; s < 4; s++) { x += (r() - 0.5) * 14; y += 4 + r() * 8; g.lineTo(x, y); } g.stroke(); }
      const gr = g.createLinearGradient(0, y0, 0, y0 + h); gr.addColorStop(0, 'rgba(120,80,40,0)'); gr.addColorStop(0.7, 'rgba(120,80,40,.05)'); gr.addColorStop(1, 'rgba(100,72,44,.28)'); g.fillStyle = gr; g.fillRect(x0, y0, w, h); });
    // rubble stone: rounded stones with a lit top edge and a shadowed bottom edge in dark mortar
    const stones = (k, base, sz, block) => clip(k, (x0, y0, w, h) => { g.fillStyle = '#3e3832'; g.fillRect(x0, y0, w, h); const rows = Math.round(h / sz), rh = h / rows;
      for (let j = 0; j < rows; j++) { let x = x0 - r() * sz; while (x < x0 + w) { const sw = block ? sz * (j % 2 ? 1.1 : 1.9) : sz * (0.7 + r() * 1.0), v = 0.72 + r() * 0.38, y = y0 + j * rh, warm = r() * 14;
        const rr = block ? 3 : 6 + r() * 4; g.fillStyle = 'rgba(20,16,12,.55)'; g.beginPath(); g.roundRect(x + 3, y + 4, sw - 4, rh - 4, rr); g.fill();
        g.fillStyle = rgb([base[0] + warm, base[1] + warm * 0.6, base[2]], v); g.beginPath(); g.roundRect(x + 2, y + 2, sw - 5, rh - 5, rr); g.fill();
        g.fillStyle = 'rgba(255,250,235,.22)'; g.beginPath(); g.roundRect(x + 4, y + 3, sw * 0.6, 3, 2); g.fill(); g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(x + 4, y + rh - 8, sw - 9, 3);
        if (r() < 0.12) { g.fillStyle = 'rgba(96,120,52,.45)'; g.beginPath(); g.ellipse(x + sw * 0.5, y + rh - 6, sw * 0.3, 3, 0, 0, 6.3); g.fill(); } x += sw; } } });
    stones('stone', [150, 140, 126], 30); stones('chim', [160, 150, 138], 24); stones('quoin', [190, 178, 158], 42, true);
    // timber: dark oak with grain; planks; light shutter planks (tinted per house)
    clip('timber', (x0, y0, w, h) => { g.fillStyle = '#5b3a22'; g.fillRect(x0, y0, w, h); for (let k = 0; k < 110; k++) { g.strokeStyle = `rgba(${r() < 0.5 ? '28,16,8' : '128,90,54'},${0.2 + r() * 0.3})`; g.lineWidth = 1 + r() * 2; const y = y0 + r() * h; g.beginPath(); g.moveTo(x0, y); g.bezierCurveTo(x0 + w * 0.3, y + (r() - 0.5) * 8, x0 + w * 0.6, y + (r() - 0.5) * 8, x0 + w, y + (r() - 0.5) * 6); g.stroke(); } });
    clip('plank', (x0, y0, w, h) => { for (let j = 0; j < 8; j++) { const v = 0.78 + r() * 0.3; g.fillStyle = rgb([146, 104, 64], v); g.fillRect(x0, y0 + j * h / 8, w, h / 8); g.fillStyle = 'rgba(40,24,10,.6)'; g.fillRect(x0, y0 + (j + 1) * h / 8 - 2, w, 2); g.fillStyle = 'rgba(30,20,10,.5)'; g.fillRect(x0 + r() * w, y0 + j * h / 8 + 3, 3, 3); } });
    clip('shutter', (x0, y0, w, h) => { for (let i = 0; i < 4; i++) { g.fillStyle = rgb([226, 222, 210], 0.86 + r() * 0.14); g.fillRect(x0 + i * w / 4, y0, w / 4 - 3, h); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x0 + (i + 1) * w / 4 - 3, y0, 3, h); }
      g.fillStyle = 'rgba(60,50,40,.35)'; g.fillRect(x0, y0 + h * 0.15, w, 9); g.fillRect(x0, y0 + h * 0.8, w, 9); g.save(); g.translate(x0, y0); g.rotate(-0.95); g.fillRect(-60, h * 0.55, h * 1.2, 8); g.restore(); });
    // windows: deep frames, leaded panes, sky reflections; the panes glow warm in the emissive atlas
    const win = (k, shape, cols, rows2) => { const [x0, y0, x1, y1] = R[k], w = x1 - x0, h = y1 - y0, cx = x0 + w / 2, cy = y0 + h / 2;
      const path = (c, p) => { c.beginPath(); if (shape === 'arch') { c.moveTo(x0 + p, y1 - p); c.lineTo(x0 + p, y0 + w / 2); c.arc(cx, y0 + w / 2, w / 2 - p, Math.PI, 0); c.lineTo(x1 - p, y1 - p); c.closePath(); } else if (shape === 'round') c.arc(cx, cy, w / 2 - p, 0, 6.3); else c.rect(x0 + p, y0 + p, w - 2 * p, h - 2 * p); };
      g.fillStyle = '#3e2716'; g.fillRect(x0, y0, w, h); path(g, 10); const gl = g.createLinearGradient(x0, y0, x1, y1); gl.addColorStop(0, '#a8cddd'); gl.addColorStop(0.45, '#5d84a0'); gl.addColorStop(1, '#283c4e'); g.fillStyle = gl; g.fill();
      g.save(); path(g, 10); g.clip(); g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.moveTo(x0, y0 + h * 0.55); g.lineTo(x0 + w * 0.55, y0); g.lineTo(x0 + w * 0.75, y0); g.lineTo(x0, y0 + h * 0.8); g.fill();
      g.fillStyle = '#3e2716'; for (let i = 1; i < cols; i++) g.fillRect(x0 + i * w / cols - 4, y0, 8, h); for (let j = 1; j < rows2; j++) g.fillRect(x0, y0 + j * h / rows2 - 4, w, 8); g.restore();
      g.strokeStyle = '#2a190c'; g.lineWidth = 4; path(g, 10); g.stroke();
      path(e, 10); const eg = e.createRadialGradient(cx, y0 + h * 0.62, 4, cx, y0 + h * 0.62, w * 0.75); eg.addColorStop(0, '#ffdc96'); eg.addColorStop(1, '#c87a2a'); e.fillStyle = eg; e.fill(); e.fillStyle = '#000'; for (let i = 1; i < cols; i++) e.fillRect(x0 + i * w / cols - 4, y0, 8, h); for (let j = 1; j < rows2; j++) e.fillRect(x0, y0 + j * h / rows2 - 4, w, 8); };
    win('win', 'rect', 2, 2); win('winA', 'arch', 2, 3); win('winR', 'round', 2, 2); win('winS', 'rect', 3, 3);
    // doors: arched plank door with iron straps and a little port; the open workshop door shows a warm, cluttered interior
    const arch = (c, x0, y0, w, h, p) => { c.beginPath(); c.moveTo(x0 + p, y0 + h); c.lineTo(x0 + p, y0 + w / 2); c.arc(x0 + w / 2, y0 + w / 2 + 2, w / 2 - p, Math.PI, 0); c.lineTo(x0 + w - p, y0 + h); c.closePath(); };
    clip('door', (x0, y0, w, h) => { g.fillStyle = '#2e2016'; g.fillRect(x0, y0, w, h); g.save(); arch(g, x0, y0, w, h, 8); g.clip();
      for (let i = 0; i < 5; i++) { const v = 0.82 + r() * 0.28; g.fillStyle = rgb([124, 82, 46], v); g.fillRect(x0 + 8 + i * (w - 16) / 5, y0, (w - 16) / 5 - 2, h); } g.fillStyle = '#26201c'; g.fillRect(x0, y0 + h * 0.3, w, 8); g.fillRect(x0, y0 + h * 0.74, w, 8);
      g.fillStyle = '#8a8070'; for (const yy of [0.3, 0.74]) for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(x0 + 18 + i * 28, y0 + h * yy + 4, 2.5, 0, 6.3); g.fill(); } g.restore();
      g.strokeStyle = '#1e140c'; g.lineWidth = 5; arch(g, x0, y0, w, h, 8); g.stroke(); g.fillStyle = '#6b8ea4'; g.beginPath(); g.arc(x0 + w / 2, y0 + h * 0.42, 11, 0, 6.3); g.fill(); g.strokeStyle = '#26201c'; g.lineWidth = 4; g.stroke();
      g.strokeStyle = '#c9a050'; g.lineWidth = 3; g.beginPath(); g.arc(x0 + w * 0.74, y0 + h * 0.6, 6, 0, 6.3); g.stroke(); e.fillStyle = '#ffb860'; e.beginPath(); e.arc(x0 + w / 2, y0 + h * 0.42, 10, 0, 6.3); e.fill(); });
    clip('doorO', (x0, y0, w, h) => { g.fillStyle = '#2e2016'; g.fillRect(x0, y0, w, h); const gr = g.createLinearGradient(0, y0, 0, y0 + h); gr.addColorStop(0, '#4a2e16'); gr.addColorStop(1, '#c08440'); g.fillStyle = gr; arch(g, x0, y0, w, h, 10); g.fill();
      for (let k = 0; k < 9; k++) { g.fillStyle = ['#d9b060', '#8a5a2a', '#6f8fa8', '#b5533c'][k % 4]; g.fillRect(x0 + 22 + (k % 3) * 30, y0 + 74 + ((k / 3) | 0) * 40, 20, 24); } g.fillStyle = '#ffe2a0'; g.beginPath(); g.arc(x0 + w / 2, y0 + 60, 7, 0, 6.3); g.fill();
      e.fillStyle = '#d08a3c'; arch(e, x0, y0, w, h, 10); e.fill(); });
    fill('iron', '#2b2a2c'); fill('white', '#ffffff'); fill('roofU', '#3a2214');
    clip('lamp', (x0, y0, w, h) => { g.fillStyle = '#ffdc96'; g.fillRect(x0, y0, w, h); g.fillStyle = '#2b2a2c'; g.fillRect(x0, y0, w, 7); g.fillRect(x0, y0 + h - 7, w, 7); g.fillRect(x0 + w / 2 - 3, y0, 6, h); e.fillStyle = '#ffc070'; e.fillRect(x0, y0 + 7, w, h - 14); });
    clip('lumen', (x0, y0, w, h) => { g.fillStyle = '#9fe8ff'; g.fillRect(x0, y0, w, h); e.fillStyle = '#7fd8ff'; e.fillRect(x0, y0, w, h); });
    clip('moss', (x0, y0, w, h) => { g.fillStyle = '#5f7d32'; g.fillRect(x0, y0, w, h); for (let k = 0; k < 80; k++) { g.fillStyle = r() < 0.5 ? '#86a648' : '#46602a'; g.beginPath(); g.arc(x0 + r() * w, y0 + r() * h, 2 + r() * 4, 0, 6.3); g.fill(); } });
    clip('leaf', (x0, y0, w, h) => { g.fillStyle = '#4f7a2c'; g.fillRect(x0, y0, w, h); for (let k = 0; k < 90; k++) { g.fillStyle = r() < 0.4 ? '#7aa848' : r() < 0.7 ? '#3c5e22' : '#9cc060'; g.beginPath(); g.ellipse(x0 + r() * w, y0 + r() * h, 3 + r() * 4, 2 + r() * 2, r() * 3, 0, 6.3); g.fill(); } });
    clip('flower', (x0, y0, w, h) => { g.fillStyle = '#4a7428'; g.fillRect(x0, y0, w, h); for (let k = 0; k < 140; k++) { g.fillStyle = r() < 0.5 ? '#6f9c3c' : '#35561e'; g.beginPath(); g.ellipse(x0 + r() * w, y0 + r() * h, 3 + r() * 5, 2 + r() * 3, r() * 3, 0, 6.3); g.fill(); }
      for (let k = 0; k < 46; k++) { g.fillStyle = ['#e0485e', '#f2d45a', '#f08ab0', '#ffffff', '#d8402a'][k % 5]; const x = x0 + r() * w, y = y0 + r() * h * 0.8; for (let p = 0; p < 5; p++) { g.beginPath(); g.arc(x + Math.cos(p * 1.26) * 3.5, y + Math.sin(p * 1.26) * 3.5, 3, 0, 6.3); g.fill(); } g.fillStyle = '#f6e27a'; g.beginPath(); g.arc(x, y, 2, 0, 6.3); g.fill(); } });
    clip('cloth', (x0, y0, w, h) => { const cs = ['#3f5f9a', '#e8e0cc', '#b5533c', '#6aa0c0', '#c9a050', '#7a5fa0']; for (let i = 0; i < 6; i++) { g.fillStyle = cs[i]; g.fillRect(x0 + i * w / 6, y0, w / 6, h); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x0 + i * w / 6, y0 + h * 0.85, w / 6, h * 0.15); } g.fillStyle = '#e8c86a'; for (let i = 0; i < 6; i += 3) { g.beginPath(); g.arc(x0 + (i + 0.5) * w / 6, y0 + h * 0.4, 6, 0, 6.3); g.fill(); } });
    clip('sign', (x0, y0, w, h) => { g.fillStyle = '#7a5230'; g.fillRect(x0, y0, w, h); g.strokeStyle = '#3a2414'; g.lineWidth = 8; g.strokeRect(x0 + 4, y0 + 4, w - 8, h - 8); g.fillStyle = '#e8c060'; g.beginPath(); g.moveTo(x0 + w / 2, y0 + 26); g.lineTo(x0 + w / 2 + 20, y0 + h / 2); g.lineTo(x0 + w / 2, y0 + h - 26); g.lineTo(x0 + w / 2 - 20, y0 + h / 2); g.fill(); });
    clip('bark', (x0, y0, w, h) => { g.fillStyle = '#6a5442'; g.fillRect(x0, y0, w, h); for (let k = 0; k < 60; k++) { g.strokeStyle = `rgba(${r() < 0.5 ? '30,22,14' : '150,126,100'},.45)`; g.lineWidth = 1 + r() * 3; const x = x0 + r() * w; g.beginPath(); g.moveTo(x, y0); g.lineTo(x + (r() - 0.5) * 10, y0 + h); g.stroke(); } });
    clip('hay', (x0, y0, w, h) => { g.fillStyle = '#c9a85a'; g.fillRect(x0, y0, w, h); for (let k = 0; k < 120; k++) { g.strokeStyle = r() < 0.5 ? 'rgba(120,90,40,.5)' : 'rgba(240,220,150,.5)'; g.lineWidth = 1.5; const x = x0 + r() * w, y = y0 + r() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 20, y + (r() - 0.5) * 8); g.stroke(); } });
    const T = new THREE.CanvasTexture(cv), TE = new THREE.CanvasTexture(em); for (const t of [T, TE]) { t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; }
    return { T, TE }; }
  /* ---------- geometry builder ---------- */
  const V = (a) => new THREE.Vector3(a[0], a[1], a[2]), lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  function Builder(det, seed) { const B = { p: [], n: [], uv: [], c: [], i: [], M: new THREE.Matrix4(), NM: new THREE.Matrix3(), stack: [], flip: false, det, chim: [], lamps: [], r: rng(seed || 1) };
    const v = new THREE.Vector3(), nv = new THREE.Vector3();
    B.vert = (x, y, z, nx, ny, nz, u, w, col) => { v.set(x, y, z).applyMatrix4(B.M); nv.set(nx, ny, nz).applyMatrix3(B.NM).normalize(); B.p.push(v.x, v.y, v.z); B.n.push(nv.x, nv.y, nv.z); B.uv.push(u, w); B.c.push(col[0], col[1], col[2]); return B.p.length / 3 - 1; };
    B.tris = (a, b, c) => { if (B.flip) B.i.push(a, c, b); else B.i.push(a, b, c); };
    B.with = (x, y, z, rotY, s, fn, mirror) => { B.stack.push(B.M.clone()); const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY || 0), new THREE.Vector3((s || 1) * (mirror ? -1 : 1), s || 1, s || 1));
      B.M.multiply(m); B.NM.getNormalMatrix(B.M); B.flip = B.M.determinant() < 0; fn(); B.M.copy(B.stack.pop()); B.NM.getNormalMatrix(B.M); B.flip = B.M.determinant() < 0; };
    B.pt = (x, y, z) => { v.set(x, y, z).applyMatrix4(B.M); return [v.x, v.y, v.z]; };
    const uvr = (k, a, b) => { const [x0, y0, x1, y1] = R[k], pad = 1.5; return [(x0 + pad + (x1 - x0 - 2 * pad) * a) / AU, 1 - (y0 + pad + (y1 - y0 - 2 * pad) * (1 - b)) / AU]; }; B.uvr = uvr;
    // quad a,b,c,d counter-clockwise seen from outside (a,b bottom; d,c top); col: one colour or four (a,b,c,d)
    B.quad = (a, b, c, d, k, col, uw) => { const w = uw || [0, 0, 1, 1], e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [d[0] - a[0], d[1] - a[1], d[2] - a[2]]; let nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0];
      if (Math.abs(nx) + Math.abs(ny) + Math.abs(nz) < 1e-12) { const e3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]; nx = e1[1] * e3[2] - e1[2] * e3[1]; ny = e1[2] * e3[0] - e1[0] * e3[2]; nz = e1[0] * e3[1] - e1[1] * e3[0]; }
      const cs = col && Array.isArray(col[0]) ? col : [col || W1, col || W1, col || W1, col || W1];
      const q = [[a, w[0], w[1]], [b, w[2], w[1]], [c, w[2], w[3]], [d, w[0], w[3]]].map(([p, u, t], j) => { const [U, Vv] = uvr(k, u, t); return B.vert(p[0], p[1], p[2], nx, ny, nz, U, Vv, cs[j]); }); B.tris(q[0], q[1], q[2]); B.tris(q[0], q[2], q[3]); };
    B.tri = (a, b, c, k, col, uw) => { const w = uw || [0, 0, 1, 1], e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0];
      const q = [[a, w[0], w[1]], [b, w[2], w[1]], [c, (w[0] + w[2]) / 2, w[3]]].map(([p, u, t]) => { const [U, Vv] = uvr(k, u, t); return B.vert(p[0], p[1], p[2], nx, ny, nz, U, Vv, col || W1); }); B.tris(q[0], q[1], q[2]); };
    // axis-aligned box; side/top regions; us: world units per full region (tiles proportionally, capped); ao: darken the bottom edge
    B.box = (x0, y0, z0, x1, y1, z1, k, kt, col, us, bottom, ao) => { const s = us || 0, U = (len) => s ? Math.min(1, len / s) : 1, dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, c0 = col || W1, cb = ao ? c0.map((x) => x * ao) : c0, C4 = [cb, cb, c0, c0];
      B.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], k, C4, [0, 0, U(dx), U(dy)]); B.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], k, C4, [0, 0, U(dx), U(dy)]);
      B.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], k, C4, [0, 0, U(dz), U(dy)]); B.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], k, C4, [0, 0, U(dz), U(dy)]);
      if (kt !== null) B.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], kt || k, c0, [0, 0, U(dx), U(dz)]); if (bottom) B.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], k, c0); };
    // walls of a storey: four faces, darker under the eaves (top) and at the foot
    B.walls = (x0, x1, z0, z1, y0, y1, k, us, top, foot) => { const s = us || 0.9, U = (len) => Math.min(1, len / s), ct = W1.map((x) => x * (top || 0.8)), cf = W1.map((x) => x * (foot || 1)), C4 = [cf, cf, ct, ct];
      B.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], k, C4, [0, 0, U(x1 - x0), U(y1 - y0)]); B.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], k, C4, [0, 0, U(x1 - x0), U(y1 - y0)]);
      B.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], k, C4, [0, 0, U(z1 - z0), U(y1 - y0)]); B.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], k, C4, [0, 0, U(z1 - z0), U(y1 - y0)]); };
    // a tube between two points (any orientation), n sides, radii r0 -> r1
    B.tube = (p, q, r0, r1, n, k, col, cap, uRep) => { const P = V(p), Q = V(q), d = new THREE.Vector3().subVectors(Q, P), L = d.length(); if (L < 1e-5) return; d.normalize();
      const up = Math.abs(d.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0), a = new THREE.Vector3().crossVectors(d, up).normalize(), b = new THREE.Vector3().crossVectors(a, d).normalize(), ur = uRep || 1;
      const at = (j, t, rr) => { const ang = j / n * Math.PI * 2, cx = Math.cos(ang), sx = Math.sin(ang); return [P.x + d.x * L * t + (a.x * cx + b.x * sx) * rr, P.y + d.y * L * t + (a.y * cx + b.y * sx) * rr, P.z + d.z * L * t + (a.z * cx + b.z * sx) * rr]; };
      for (let j = 0; j < n; j++) B.quad(at(j, 0, r0), at(j + 1, 0, r0), at(j + 1, 1, r1), at(j, 1, r1), k, col, [((j / n) * ur) % 1, 0, ((j / n) * ur) % 1 + ur / n, Math.min(1, L * 2)]);
      if (cap && r1 > 0) for (let j = 0; j < n; j++) B.tri(at(j, 1, r1), at(j + 1, 1, r1), [Q.x, Q.y, Q.z], cap, col); };
    B.beam = (p, q, th, k, col, th2) => { const P = V(p), Q = V(q), d = new THREE.Vector3().subVectors(Q, P), L = d.length(); if (L < 1e-4) return; d.normalize();
      const up = Math.abs(d.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0), sx = new THREE.Vector3().crossVectors(d, up).normalize(), sy = new THREE.Vector3().crossVectors(sx, d).normalize();
      const a = th / 2, b = (th2 || th) / 2, cn = (s1, s2, t) => [P.x + sx.x * s1 * a + sy.x * s2 * b + d.x * L * t, P.y + sx.y * s1 * a + sy.y * s2 * b + d.y * L * t, P.z + sx.z * s1 * a + sy.z * s2 * b + d.z * L * t];
      for (const [s0, s1] of [[[1, -1], [1, 1]], [[1, 1], [-1, 1]], [[-1, 1], [-1, -1]], [[-1, -1], [1, -1]]]) B.quad(cn(s0[0], s0[1], 0), cn(s0[0], s0[1], 1), cn(s1[0], s1[1], 1), cn(s1[0], s1[1], 0), k, col, [0, 0, 1, Math.min(1, L * 2)]); };
    B.cyl = (x, y0, z, r0, r1, h, n, k, col, cap, uRep) => { const ur = uRep || 1; for (let j = 0; j < n; j++) { const a0 = j / n * Math.PI * 2, a1 = (j + 1) / n * Math.PI * 2, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
        B.quad([x + c1 * r0, y0, z + s1 * r0], [x + c0 * r0, y0, z + s0 * r0], [x + c0 * r1, y0 + h, z + s0 * r1], [x + c1 * r1, y0 + h, z + s1 * r1], k, col, [((j / n) * ur) % 1 + ur / n, 0, ((j / n) * ur) % 1, 1]); } // wound outward (front faces out), so towers, barrels and pots are solid
      if (cap && r1 > 0) for (let j = 0; j < n; j++) { const a0 = j / n * Math.PI * 2, a1 = (j + 1) / n * Math.PI * 2; B.tri([x + Math.cos(a1) * r1, y0 + h, z + Math.sin(a1) * r1], [x + Math.cos(a0) * r1, y0 + h, z + Math.sin(a0) * r1], [x, y0 + h, z], cap, col); } };
    /* one roof slope from the eave edge P0->P1 up to the ridge edge Q0->Q1 (P0 left, seen from outside).
       Detailed: overlapping courses of clay tiles (each course's butt is lifted off the slope, shadowed under the course above),
       a thick eave (fascia) and a dark underside. Simple LOD: one painted quad. */
    B.slope = (P0, P1, Q0, Q1, o) => { o = o || {}; const slate = o.slate, th = o.th || 0.02, cw = o.cw || 0.07, seg = o.seg || 0.5, tint = o.col || W1;
      const e1 = V(P1).sub(V(P0)), e2 = V(Q0).sub(V(P0)); if (e1.lengthSq() < 1e-10) e1.copy(V(Q1).sub(V(Q0))); const N = new THREE.Vector3().crossVectors(e1, e2).normalize(), off = (p, s) => [p[0] + N.x * s, p[1] + N.y * s, p[2] + N.z * s];
      const len = V(lerp3(P0, P1, 0.5)).distanceTo(V(lerp3(Q0, Q1, 0.5))), wB = V(P0).distanceTo(V(P1));
      if (!B.det || o.flat) { B.quad(P0, P1, Q1, Q0, slate ? 'slate' : 'roofFlat', tint, [0, 0, Math.min(1, Math.max(wB, 0.05) / 1.1), Math.min(1, len / 1.1)]); }
      else { const n = Math.max(2, Math.round(len / cw));
        for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n, Lb = lerp3(P0, Q0, t0), Rb = lerp3(P1, Q1, t0), Lt = lerp3(P0, Q0, t1), Rt = lerp3(P1, Q1, t1), Lb2 = off(Lb, th), Rb2 = off(Rb, th);
          const w = V(Lb).distanceTo(V(Rb)), m = Math.max(1, Math.ceil(w / seg - 0.15)), key = slate ? 'slateRow' : i % 2 ? 'tileB' : 'tileA';
          for (let j = 0; j < m; j++) { const s0 = j / m, s1 = (j + 1) / m, cj = 0.9 + B.r() * 0.2, cb = tint.map((x) => x * cj), ct = tint.map((x) => x * cj * 0.74);
            B.quad(lerp3(Lb2, Rb2, s0), lerp3(Lb2, Rb2, s1), lerp3(Lt, Rt, s1), lerp3(Lt, Rt, s0), key, [cb, cb, ct, ct], [0, 0, Math.min(1, (w / m) / seg), 1]); }
          if (w > 0.01) B.quad(Lb, Rb, Rb2, Lb2, 'tileEnd', tint.map((x) => x * (i ? 0.5 : 0.8)), [0, 0, Math.min(1, w / 0.6), 1]); } }
      if (o.under !== false) { const u = -(o.ut || 0.035), P0d = off(P0, u), P1d = off(P1, u); B.quad(P0d, off(Q0, u), off(Q1, u), P1d, 'roofU', W1); B.quad(P0d, P1d, P1, P0, 'timber', [0.8, 0.8, 0.8]); }
      return N; };
    // ridge cap: overlapping half-round tiles along a->b
    B.ridge = (a, b, rad, col) => { const A = V(a), Bv = V(b), d = new THREE.Vector3().subVectors(Bv, A), L = d.length(); if (L < 1e-4) return; d.normalize(); const up = new THREE.Vector3(0, 1, 0).addScaledVector(d, -d.y).normalize(), sd = new THREE.Vector3().crossVectors(d, up);
      if (!B.det) { B.beam(a, b, rad * 1.6, 'ridgeT', col || [0.85, 0.75, 0.72], rad * 1.4); return; }
      const ns = Math.max(1, Math.round(L / 0.075)), n = 5, c = col || [0.9, 0.82, 0.8];
      for (let s = 0; s < ns; s++) { const t0 = s / ns, t1 = Math.min(1, (s + 1.12) / ns); const at = (jj, t, rr) => { const ang = -0.25 + jj / n * (Math.PI + 0.5), x = Math.cos(ang) * rr, y = Math.sin(ang) * rr; return [A.x + d.x * L * t + sd.x * x + up.x * y, A.y + d.y * L * t + sd.y * x + up.y * y, A.z + d.z * L * t + sd.z * x + up.z * y]; };
        for (let j = 0; j < n; j++) B.quad(at(j + 1, t0, rad * 0.92), at(j, t0, rad * 0.92), at(j, t1, rad * 1.08), at(j + 1, t1, rad * 1.08), 'ridgeT', c, [j / n, 0, (j + 1) / n, 1]);
        const ctr = [A.x + d.x * L * t0, A.y + d.y * L * t0, A.z + d.z * L * t0]; for (let j = 0; j < n; j++) B.tri(at(j, t0, rad * 0.92), at(j + 1, t0, rad * 0.92), ctr, 'tileEnd', [0.6, 0.6, 0.6]); } };
    // contact shadow + ground AO baked into vertex colours near the foot of the model
    B.geo = () => { for (let i = 0; i < B.p.length / 3; i++) { const y = B.p[i * 3 + 1], ny = B.n[i * 3 + 1]; if (y < 0.14 && ny < 0.7) { const f = 0.58 + 0.42 * Math.min(1, Math.max(0, (y + 0.05) / 0.19)); B.c[i * 3] *= f; B.c[i * 3 + 1] *= f; B.c[i * 3 + 2] *= f; } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(B.uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(B.c, 3));
      g.setIndex(B.p.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(B.i, 1) : new THREE.Uint16BufferAttribute(B.i, 1)); g.computeBoundingSphere(); return g; };
    return B; }
  /* ---------- shared parts ---------- */
  const W1 = [1, 1, 1], TIMB = [1, 1, 1], STONE_C = [1.04, 1.02, 1.0];
  const SHUT = [[0.46, 0.64, 0.6], [0.46, 0.56, 0.74], [0.7, 0.36, 0.3], [0.86, 0.72, 0.54]];
  // gable roof, ridge along x; eaves face +-z; gable walls at x0 / x1
  function gableRoof(B, o) { const { x0, x1, z0, z1, ye, yr } = o, ox = o.ox == null ? 0.07 : o.ox, oz = o.oz == null ? 0.11 : o.oz, zc = (z0 + z1) / 2, k = (yr - ye) / (z1 - zc), yd = ye - k * oz, so = { col: o.col, slate: o.slate };
    B.slope([x0 - ox, yd, z1 + oz], [x1 + ox, yd, z1 + oz], [x0 - ox, yr, zc], [x1 + ox, yr, zc], so); B.slope([x1 + ox, yd, z0 - oz], [x0 - ox, yd, z0 - oz], [x1 + ox, yr, zc], [x0 - ox, yr, zc], so);
    const gk = o.gk || 'plaster', gc = o.gcol || [0.86, 0.86, 0.86]; if (!o.noGable) { B.tri([x1, ye, z1], [x1, ye, z0], [x1, yr - 0.02, zc], gk, gc); B.tri([x0, ye, z0], [x0, ye, z1], [x0, yr - 0.02, zc], gk, gc); }
    B.ridge([x0 - ox - 0.015, yr + 0.012, zc], [x1 + ox + 0.015, yr + 0.012, zc], 0.034);
    if (B.det) for (const xg of [x0 - ox - 0.012, x1 + ox + 0.012]) for (const zz of [z1 + oz, z0 - oz]) B.beam([xg, yd - 0.012, zz], [xg, yr - 0.005, zc], 0.026, 'timber', TIMB, 0.06);
    if (B.det && o.frame) for (const [xs, sg] of [[x1 + 0.004, 1], [x0 - 0.004, -1]]) { if (o.frame === 'x1' && sg < 0) continue; B.beam([xs, ye + 0.012, z0 + 0.02], [xs, ye + 0.012, z1 - 0.02], 0.03, 'timber', TIMB); B.beam([xs, ye, zc], [xs, yr - 0.04, zc], 0.03, 'timber', TIMB);
      const hh = (yr - ye) * 0.45; B.beam([xs, ye + 0.02, zc - (z1 - zc) * 0.62], [xs, ye + hh, zc - 0.02], 0.026, 'timber', TIMB); B.beam([xs, ye + 0.02, zc + (z1 - zc) * 0.62], [xs, ye + hh, zc + 0.02], 0.026, 'timber', TIMB); }
    return { yd, k, zc, ox, oz }; }
  // hip roof (ridge along x, inset so the hips match the pitch)
  function hipRoof(B, o) { const { x0, x1, z0, z1, ye, yr } = o, ov = o.ov == null ? 0.1 : o.ov, zc = (z0 + z1) / 2, run = (z1 - z0) / 2 + ov, k = (yr - ye) / ((z1 - z0) / 2), yd = ye - k * ov, so = { col: o.col, slate: o.slate };
    let rx0 = x0 - ov + run, rx1 = x1 + ov - run; if (rx0 > rx1) rx0 = rx1 = (x0 + x1) / 2;
    const E = { lf: [x0 - ov, yd, z1 + ov], rf: [x1 + ov, yd, z1 + ov], rb: [x1 + ov, yd, z0 - ov], lb: [x0 - ov, yd, z0 - ov] }, A = [rx0, yr, zc], Bq = [rx1, yr, zc];
    B.slope(E.lf, E.rf, A, Bq, so); B.slope(E.rb, E.lb, Bq, A, so); B.slope(E.rf, E.rb, Bq, Bq, so); B.slope(E.lb, E.lf, A, A, so);
    if (rx1 > rx0) B.ridge([rx0 - 0.01, yr + 0.012, zc], [rx1 + 0.01, yr + 0.012, zc], 0.034);
    for (const [e, t] of [[E.lf, A], [E.lb, A], [E.rf, Bq], [E.rb, Bq]]) B.ridge([e[0], e[1] + 0.02, e[2]], [t[0], t[1] + 0.012, t[2]], 0.028);
    return { yd, k, A, Bq }; }
  // pent "skirt" roof running round a storey (the workshop's tiled skirts)
  function skirt(B, x0, x1, z0, z1, y, o, h, col) { const so = { col, cw: 0.06 };
    B.slope([x0 - o, y, z1 + o], [x1 + o, y, z1 + o], [x0, y + h, z1], [x1, y + h, z1], so); B.slope([x1 + o, y, z0 - o], [x0 - o, y, z0 - o], [x1, y + h, z0], [x0, y + h, z0], so);
    B.slope([x1 + o, y, z1 + o], [x1 + o, y, z0 - o], [x1, y + h, z1], [x1, y + h, z0], so); B.slope([x0 - o, y, z0 - o], [x0 - o, y, z1 + o], [x0, y + h, z0], [x0, y + h, z1], so);
    if (B.det) for (const [a, b] of [[[x0 - o, y, z1 + o], [x0, y + h, z1]], [[x1 + o, y, z1 + o], [x1, y + h, z1]], [[x1 + o, y, z0 - o], [x1, y + h, z0]], [[x0 - o, y, z0 - o], [x0, y + h, z0]]]) B.ridge([a[0], a[1] + 0.02, a[2]], b, 0.024); }
  // half-timber framing on the +z face at z (wall spans x in [-L/2, L/2]): posts, rails, braces
  function halfTimber(B, L, z, y0, y1, o) { if (!B.det) return; o = o || {}; const th = 0.03, zz = z + 0.008, n = o.n || Math.max(2, Math.round(L / 0.3)), mid = o.mid;
    B.box(-L / 2 - 0.004, y1 - th, z - 0.004, L / 2 + 0.004, y1 + 0.004, zz + th / 2, 'timber', 'timber', TIMB); if (!o.noBase) B.box(-L / 2 - 0.004, y0, z - 0.004, L / 2 + 0.004, y0 + th, zz + th / 2, 'timber', 'timber', TIMB);
    if (mid) B.box(-L / 2, y0 + (y1 - y0) * mid - th / 2, z - 0.002, L / 2, y0 + (y1 - y0) * mid + th / 2, zz + th / 2 - 0.004, 'timber', 'timber', TIMB);
    for (let k = 0; k <= n; k++) { const x = -L / 2 + k * L / n; if (o.skip && o.skip(x)) continue; B.box(x - th / 2, y0, z - 0.002, x + th / 2, y1, zz + th / 2, 'timber', 'timber', TIMB); }
    if (o.braces !== false) for (let k = 0; k < n; k++) { const xa = -L / 2 + k * L / n, xb = xa + L / n; if (o.skip && o.skip(xa + L / n / 2)) continue; const yb = mid ? y0 + (y1 - y0) * mid : y1; if (k % 2) B.beam([xa + 0.01, y0 + 0.02, zz], [xb - 0.01, yb - 0.02, zz], 0.024, 'timber', TIMB); else B.beam([xb - 0.01, y0 + 0.02, zz], [xa + 0.01, yb - 0.02, zz], 0.024, 'timber', TIMB); } }
  // window on the +z face at z: pane, deep timber frame, lintel, sill, optional shutters and flower box
  function windowOn(B, z, x, y, w, h, o) { o = o || {}; const k = o.round ? 'winR' : o.arch ? 'winA' : o.small ? 'winS' : 'win';
    B.quad([x - w / 2, y, z + 0.004], [x + w / 2, y, z + 0.004], [x + w / 2, y + h, z + 0.004], [x - w / 2, y + h, z + 0.004], k, W1);
    if (!B.det) return; const f = 0.02, dz = z + 0.024, fk = o.stoneFrame ? 'quoin' : 'timber';
    if (o.round) { for (let j = 0; j < 10; j++) { const a0 = j / 10 * Math.PI * 2, a1 = (j + 1) / 10 * Math.PI * 2, r0 = w / 2, cx = x, cy = y + h / 2; B.beam([cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0, z + 0.012], [cx + Math.cos(a1) * r0, cy + Math.sin(a1) * r0, z + 0.012], 0.022, 'timber', TIMB); } return; }
    B.box(x - w / 2 - f, y - 0.005, z, x - w / 2, y + h, dz, fk, fk, TIMB); B.box(x + w / 2, y - 0.005, z, x + w / 2 + f, y + h, dz, fk, fk, TIMB);
    B.box(x - w / 2 - f * 1.8, y + h, z, x + w / 2 + f * 1.8, y + h + 0.034, dz + 0.006, o.stoneLintel ? 'quoin' : 'timber', o.stoneLintel ? 'quoin' : 'timber', TIMB);
    B.box(x - w / 2 - f * 1.6, y - 0.032, z, x + w / 2 + f * 1.6, y, z + 0.046, fk, fk, TIMB);
    if (o.shut) for (const s of [-1, 1]) { const xa = x + s * (w / 2 + f), xb = xa + s * w * 0.52; B.box(Math.min(xa, xb), y - 0.004, z + 0.002, Math.max(xa, xb), y + h + 0.004, z + 0.016, 'shutter', 'shutter', o.shut); }
    if (o.flowers) { B.box(x - w / 2 - 0.025, y - 0.1, z, x + w / 2 + 0.025, y - 0.036, z + 0.07, 'plank', 'plank', TIMB); B.box(x - w / 2 - 0.015, y - 0.036, z + 0.006, x + w / 2 + 0.015, y + 0.03, z + 0.064, 'flower', 'flower', W1);
      for (let j = 0; j < 4; j++) { const xx = x - w / 2 + (j + 0.5) * w / 4; B.box(xx - 0.016, y + 0.02, z + 0.02, xx + 0.016, y + 0.05 + (j % 2) * 0.012, z + 0.05, 'flower', 'flower', W1); } } }
  // door on the +z face at z centred at x: plank door, chunky frame + lintel, stone steps, optional porch canopy
  // every door on the map is one size in the world (~1.75 m: the Ledge door, Wren just clears it): the house kits are drawn in a frame that scales with the
  // home's tier, so each tier's doors are rescaled (limited where a small shack's or a mansion's facade can't take the full change)
  const DOORK = [1.35, 1.21, 0.9, 0.925, 0.965, 0.71, 0.6, 0.55]; let DOOR_K = 1;
  let NOFRAME = false;
  function doorOn(B, z, x, w, h, o) { o = o || {}; w *= DOOR_K; h *= DOOR_K; const y0 = o.y0 == null ? 0 : o.y0; (B.doors || (B.doors = [])).push({ p: B.pt(x, y0, z + 0.006), q: B.pt(x, y0, z + 0.106), w, h }); /* where the door is (house frame), for the Explore door interactable */ B.quad([x - w / 2, y0, z + 0.006], [x + w / 2, y0, z + 0.006], [x + w / 2, y0 + h, z + 0.006], [x - w / 2, y0 + h, z + 0.006], o.open ? 'doorO' : 'door', W1);
    if (!B.det) return; const f = 0.026, fk = o.stone ? 'quoin' : 'timber'; if (!NOFRAME || B.doors.length > 1) { B.box(x - w / 2 - f, y0, z, x - w / 2, y0 + h, z + 0.03, fk, fk, TIMB); B.box(x + w / 2, y0, z, x + w / 2 + f, y0 + h, z + 0.03, fk, fk, TIMB); B.box(x - w / 2 - f * 1.8, y0 + h, z, x + w / 2 + f * 1.8, y0 + h + 0.04, z + 0.038, fk, fk, TIMB); } /* (the player's front door: no kit frame - Explore hangs the Ledge tab's own door + timber surround there) */
    const steps = o.steps == null ? (y0 > 0.04 ? Math.ceil(y0 / 0.06) : 1) : o.steps; for (let s = 0; s < steps; s++) { const top = y0 - s * (y0 / Math.max(1, steps)), d = 0.07 + s * 0.06; B.box(x - w / 2 - 0.03 - s * 0.01, -0.05, z, x + w / 2 + 0.03 + s * 0.01, Math.max(0.03, top), z + d, 'stone', 'quoin', STONE_C, 0.35); }
    if (o.porch) { const pw = w / 2 + 0.08, pd = o.porchD || 0.2, ye = y0 + h + 0.07, yr = ye + 0.13, so = { cw: 0.06, seg: 0.4, col: o.col };
      B.slope([x + pw, ye, z + pd], [x + pw, ye, z], [x, yr, z + pd], [x, yr, z], so); B.slope([x - pw, ye, z], [x - pw, ye, z + pd], [x, yr, z], [x, yr, z + pd], so); B.ridge([x, yr + 0.01, z], [x, yr + 0.01, z + pd + 0.01], 0.026);
      B.tri([x - pw + 0.03, ye + 0.005, z + pd - 0.025], [x + pw - 0.03, ye + 0.005, z + pd - 0.025], [x, yr - 0.02, z + pd - 0.025], 'plank', TIMB);
      if (o.posts) for (const s of [-1, 1]) B.box(x + s * (pw - 0.03) - 0.016, 0, z + pd - 0.045, x + s * (pw - 0.03) + 0.016, ye, z + pd - 0.013, 'timber', 'timber', TIMB);
      else for (const s of [-1, 1]) B.beam([x + s * (pw - 0.02), y0 + h - 0.1, z + 0.01], [x + s * (pw - 0.03), ye - 0.01, z + pd - 0.03], 0.024, 'timber', TIMB); } }
  function finial(B, x, y, z, h) { if (!B.det) return; B.cyl(x, y, z, 0.018, 0.018, h * 0.3, 6, 'iron', W1); B.cyl(x, y + h * 0.3, z, 0.032, 0.0, h * 0.25, 6, 'iron', W1); B.cyl(x, y + h * 0.22, z, 0.01, 0.0, h * 0.78, 4, 'iron', W1); }
  function lantern(B, x, y, z, dir) { if (!B.det) { B.box(x - 0.022, y - 0.035, z + 0.06 * dir - 0.022, x + 0.022, y + 0.035, z + 0.06 * dir + 0.022, 'lamp', 'iron', W1); B.lamps.push(B.pt(x, y, z + 0.07 * dir)); return; }
    const lz = z + 0.075 * dir; B.beam([x, y + 0.085, z], [x, y + 0.085, lz], 0.012, 'iron', W1); B.beam([x, y + 0.03, z], [x, y + 0.085, z + 0.04 * dir], 0.009, 'iron', W1); B.beam([x, y + 0.085, lz], [x, y + 0.05, lz], 0.006, 'iron', W1);
    B.box(x - 0.024, y - 0.042, lz - 0.024, x + 0.024, y + 0.03, lz + 0.024, 'lamp', 'iron', W1); B.cyl(x, y + 0.03, lz, 0.034, 0.0, 0.03, 4, 'iron', W1); B.box(x - 0.028, y - 0.05, lz - 0.028, x + 0.028, y - 0.042, lz + 0.028, 'iron', 'iron', W1); B.lamps.push(B.pt(x, y, lz)); }
  function chimney(B, x, z, y0, y1, w) { B.box(x - w / 2, y0, z - w / 2, x + w / 2, y1, z + w / 2, 'chim', 'chim', W1, 0.45); if (B.det) { B.box(x - w * 0.62, y1, z - w * 0.62, x + w * 0.62, y1 + 0.035, z + w * 0.62, 'quoin', 'quoin', [0.95, 0.95, 0.95], 0.4); B.box(x - w * 0.56, y1 - 0.12, z - w * 0.56, x + w * 0.56, y1 - 0.09, z + w * 0.56, 'quoin', null, [0.9, 0.9, 0.9], 0.4); B.cyl(x, y1 + 0.035, z, w * 0.22, w * 0.18, 0.06, 8, 'tileEnd', [0.9, 0.7, 0.6], 'iron'); } B.chim.push(B.pt(x, y1 + 0.1, z)); }
  function crate(B, x, y, z, s, rot) { B.with(x, y, z, rot || 0, 1, () => { B.box(-s / 2, 0, -s / 2, s / 2, s, s / 2, 'plank', 'plank', [0.95, 0.88, 0.8], 0.3); if (B.det) for (const dz of [-1, 1]) { B.beam([-s / 2, 0.006, dz * s * 0.51], [s / 2, s - 0.006, dz * s * 0.51], 0.016, 'timber', TIMB); B.box(-s / 2 - 0.004, 0, dz * s / 2 - 0.006, -s / 2 + 0.018, s, dz * s / 2 + 0.006, 'timber', 'timber', TIMB); B.box(s / 2 - 0.018, 0, dz * s / 2 - 0.006, s / 2 + 0.004, s, dz * s / 2 + 0.006, 'timber', 'timber', TIMB); } }); }
  function barrel(B, x, y, z, r, h) { const n = B.det ? 12 : 7; B.cyl(x, y, z, r * 0.86, r, h * 0.5, n, 'plank', [0.9, 0.78, 0.66], null, 2); B.cyl(x, y + h * 0.5, z, r, r * 0.86, h * 0.5, n, 'plank', [0.9, 0.78, 0.66], 'plank', 2); if (B.det) for (const t of [0.15, 0.5, 0.85]) B.cyl(x, y + h * t - 0.008, z, r * (t === 0.5 ? 1.01 : 0.94), r * (t === 0.5 ? 1.01 : 0.94), 0.016, n, 'iron', W1); }
  function sack(B, x, y, z, s) { if (!B.det) return; B.cyl(x, y, z, s * 0.5, s * 0.55, s * 0.5, 8, 'hay', [0.95, 0.85, 0.7]); B.cyl(x, y + s * 0.5, z, s * 0.55, s * 0.2, s * 0.4, 8, 'hay', [0.95, 0.85, 0.7]); B.cyl(x, y + s * 0.9, z, s * 0.12, s * 0.2, s * 0.15, 6, 'hay', [0.85, 0.75, 0.6], 'hay'); }
  function woodpile(B, x, y, z, L, rows, rot) { if (!B.det) return; B.with(x, y, z, rot || 0, 1, () => { for (let j = 0; j < rows; j++) for (let i = 0; i < rows - j + 2; i++) { const rr = 0.026, xx = -((rows - j + 1) * rr) + i * rr * 2 + j * rr, yy = rr + j * rr * 1.75; B.tube([xx, yy, -L / 2], [xx, yy, L / 2], rr, rr, 6, 'bark', [0.95, 0.85, 0.75], 'hay'); } }); }
  function pickaxe(B, x, z, rot) { if (!B.det) return; B.with(x, 0, z, rot || 0, 1, () => { B.beam([0, 0, 0.0], [0, 0.3, -0.07], 0.016, 'plank', [0.8, 0.65, 0.5]); B.beam([-0.08, 0.31, -0.06], [0.08, 0.27, -0.08], 0.018, 'iron', [1.4, 1.4, 1.4], 0.026); }); }
  function rope(B, x, y, z, r) { if (!B.det) return; for (let k = 0; k < 2; k++) for (let j = 0; j < 9; j++) { const a0 = j / 9 * 6.283, a1 = (j + 1) / 9 * 6.283, rr = r - k * 0.014; B.beam([x + Math.cos(a0) * rr, y + 0.008 + k * 0.012, z + Math.sin(a0) * rr], [x + Math.cos(a1) * rr, y + 0.008 + k * 0.012, z + Math.sin(a1) * rr], 0.014, 'hay', [0.62, 0.5, 0.34]); } }
  function pot(B, x, z, s) { if (!B.det) return; B.cyl(x, 0, z, s * 0.35, s * 0.5, s * 0.6, 8, 'tileEnd', [1.3, 1.05, 0.9], null); B.box(x - s * 0.42, s * 0.55, z - s * 0.42, x + s * 0.42, s * 0.95, z + s * 0.42, 'flower', 'flower', W1); }
  function bench(B, x, z, L) { if (!B.det) return; B.box(x - L / 2, 0.085, z - 0.035, x + L / 2, 0.105, z + 0.035, 'plank', 'plank', TIMB); for (const s of [-1, 1]) B.box(x + s * (L / 2 - 0.03) - 0.012, 0, z - 0.03, x + s * (L / 2 - 0.03) + 0.012, 0.085, z + 0.03, 'timber', 'timber', TIMB); }
  function ladder(B, a, b, w) { if (!B.det) return; const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...d), hl = Math.hypot(d[0], d[2]) || 1e-6, sx = [-d[2] / hl, 0, d[0] / hl];
    for (const s of [-1, 1]) B.beam([a[0] + sx[0] * w * s, a[1], a[2] + sx[2] * w * s], [b[0] + sx[0] * w * s, b[1], b[2] + sx[2] * w * s], 0.02, 'timber', TIMB); for (let k = 1; k < L / 0.07; k++) { const t = k * 0.07 / L, p = [a[0] + d[0] * t, a[1] + d[1] * t, a[2] + d[2] * t]; B.beam([p[0] - sx[0] * w, p[1], p[2] - sx[2] * w], [p[0] + sx[0] * w, p[1], p[2] + sx[2] * w], 0.013, 'plank', TIMB); } }
  function quoins(B, x, z, y0, y1, sx, sz) { if (!B.det) return; const n = Math.round((y1 - y0) / 0.07); for (let j = 0; j < n; j++) { const ya = y0 + j * (y1 - y0) / n, yb = ya + (y1 - y0) / n - 0.008, lx = j % 2 ? 0.1 : 0.06, lz = j % 2 ? 0.06 : 0.1;
      B.box(Math.min(x, x - sx * lx) - 0.006, ya, Math.min(z, z - sz * lz) - 0.006, Math.max(x, x - sx * lx) + 0.006, yb, Math.max(z, z - sz * lz) + 0.006, 'quoin', 'quoin', [1.02, 1.0, 0.96], 0.35); } }
  function plinth(B, x0, x1, z0, z1, y1, us) { B.box(x0 - 0.012, -0.06, z0 - 0.012, x1 + 0.012, y1, z1 + 0.012, 'stone', 'quoin', STONE_C, us || 0.55, false, 0.85); if (B.det) B.box(x0 - 0.02, y1 - 0.026, z0 - 0.02, x1 + 0.02, y1 + 0.004, z1 + 0.02, 'quoin', 'quoin', [0.95, 0.93, 0.9], 0.5); }
  function wallFace(B, w, d, fn) { B.with(0, 0, 0, 0, 1, () => fn(w, d / 2, 'f')); B.with(0, 0, 0, Math.PI, 1, () => fn(w, d / 2, 'b')); B.with(0, 0, 0, Math.PI / 2, 1, () => fn(d, w / 2, 'r')); B.with(0, 0, 0, -Math.PI / 2, 1, () => fn(d, w / 2, 'l')); }
  const sideX = (B, x, fn) => B.with(x, 0, 0, Math.PI / 2, 1, fn); // +x face as a +z frame (local x runs toward -z)
  /* ---------- the eight tiers (unit footprint ~1; front on +z) ---------- */
  // T0/T1 Rimside Hut / Lantern Croft (concept Lv1): stone plinth, cream plaster in a timber frame, steep gable roof (patched), stone chimney, door on the gable end
  function hut(B, v, big) { const w = big ? 0.98 : 0.86, d = big ? 0.78 : 0.72, hp = 0.16, hw = big ? 0.58 : 0.55, yr = big ? 1.08 : 1.02, sh = SHUT[(v + 1) % 4];
    plinth(B, -w / 2, w / 2, -d / 2, d / 2, hp); B.walls(-w / 2 + 0.01, w / 2 - 0.01, -d / 2 + 0.01, d / 2 - 0.01, hp, hw, 'plaster');
    for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) B.box(x * w / 2 - 0.028, hp, z * d / 2 - 0.028, x * w / 2 + 0.028, hw, z * d / 2 + 0.028, 'timber', 'timber', TIMB);
    const gr = gableRoof(B, { x0: -w / 2, x1: w / 2, z0: -d / 2, z1: d / 2, ye: hw, yr, ox: 0.08, oz: 0.13, frame: 'x1' });
    halfTimber(B, w, d / 2 - 0.01, hp, hw - 0.08, { n: 3, skip: (x) => Math.abs(x + 0.13) < 0.12 }); B.with(0, 0, 0, Math.PI, 1, () => halfTimber(B, w, d / 2 - 0.01, hp, hw - 0.08, { n: 3 }));
    const cx = v === 2 ? w / 2 - 0.16 : -w / 2 + 0.12; chimney(B, cx, -d / 2 + 0.12, 0.25, yr + 0.05, 0.13);
    if (!B.det) { sideX(B, w / 2, () => doorOn(B, 0, 0.02, 0.22, 0.34, { y0: hp - 0.06 })); windowOn(B, d / 2, -0.13, 0.27, 0.15, 0.16, {}); return; }
    if (v !== 1) { const a = lerp3([-w / 2, gr.yd, d / 2 + 0.13], [-w / 2, yr, 0], 0.3), b = lerp3([-w / 2, gr.yd, d / 2 + 0.13], [-w / 2, yr, 0], 0.62), nn = 0.027; B.quad([a[0] + 0.1, a[1] + nn, a[2] + 0.012], [a[0] + 0.34, a[1] + nn, a[2] + 0.012], [b[0] + 0.33, b[1] + nn, b[2] + 0.012], [b[0] + 0.12, b[1] + nn, b[2] + 0.012], 'plank', [0.78, 0.62, 0.46]); }
    sideX(B, w / 2, () => { doorOn(B, 0, 0.02, 0.22, 0.34, { y0: hp - 0.06, porch: big }); lantern(B, -0.19, 0.42, 0.01, 1); if (big || v === 2) lantern(B, 0.23, 0.42, 0.01, 1); });
    windowOn(B, d / 2, -0.13, 0.27, 0.15, 0.16, { round: !big && v !== 2, shut: big ? sh : null, flowers: big || v === 2 });
    B.with(0, 0, 0, Math.PI, 1, () => windowOn(B, d / 2, 0.06, 0.28, 0.13, 0.15, { shut: v === 1 ? sh : null }));
    pickaxe(B, w / 2 - 0.02, d / 2 + 0.06, -0.3); rope(B, w / 2 + 0.12, 0, d / 2 + 0.12, 0.05);
    if (v === 1) barrel(B, -w / 2 - 0.08, 0, d / 2 - 0.05, 0.055, 0.14); if (v === 2) { crate(B, -w / 2 - 0.06, 0, 0.1, 0.11, 0.3); sack(B, -w / 2 - 0.08, 0.0, -0.06, 0.1); }
    if (big) { // lean-to woodshed on the -x end, flower pots and a bench
      const x0 = -w / 2 - 0.26; for (const z of [-d / 2 + 0.06, d / 2 - 0.06]) B.box(x0 - 0.015, 0, z - 0.015, x0 + 0.015, 0.36, z + 0.015, 'timber', 'timber', TIMB);
      B.slope([x0 - 0.04, 0.34, -d / 2 - 0.02], [x0 - 0.04, 0.34, d / 2 + 0.02], [-w / 2, 0.5, -d / 2 - 0.02], [-w / 2, 0.5, d / 2 + 0.02], { cw: 0.06 }); woodpile(B, x0 + 0.12, 0, 0, d - 0.18, 3, 0);
      pot(B, w / 2 + 0.1, -0.22, 0.09); pot(B, w / 2 + 0.07, 0.25, 0.07); bench(B, 0.12, d / 2 + 0.08, 0.26); } }
  // T2/T3 Ropewalk Cottage / Tetherwright House (concept Lv10): rubble-stone lower walls, cream plaster, stone quoins, hip roof with finials, chimney, lean-to shed
  function cottage(B, v, big) { const w = big ? 1.12 : 1.0, d = big ? 0.74 : 0.68, hs = 0.28, hw = 0.62, sh = SHUT[v % 4];
    B.box(-w / 2, -0.06, -d / 2, w / 2, hs, d / 2, 'stone', null, STONE_C, 0.55, false, 0.85); B.walls(-w / 2 + 0.008, w / 2 - 0.008, -d / 2 + 0.008, d / 2 - 0.008, hs, hw, 'plaster');
    for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) quoins(B, x * w / 2, z * d / 2, -0.04, hw - 0.04, x, z);
    B.box(-w / 2 - 0.02, hw - 0.04, -d / 2 - 0.02, w / 2 + 0.02, hw, d / 2 + 0.02, 'timber', 'timber', TIMB);
    const hr = hipRoof(B, { x0: -w / 2, x1: w / 2, z0: -d / 2, z1: d / 2, ye: hw - 0.01, yr: 1.04, ov: 0.085 }); finial(B, hr.A[0], hr.A[1], hr.A[2], 0.2); finial(B, hr.Bq[0], hr.Bq[1], hr.Bq[2], 0.2);
    chimney(B, v === 2 ? w / 2 - 0.2 : -w / 2 + 0.17, -0.05, 0.6, 1.16, 0.14); if (big) chimney(B, w / 2 - 0.22, -d / 2 + 0.12, 0.6, 1.08, 0.12);
    if (!B.det) { if (!big) sideX(B, w / 2, () => doorOn(B, 0.008, -0.12, 0.2, 0.42, {})); for (const x of [-0.27, 0.02]) windowOn(B, d / 2, x, 0.34, 0.13, 0.2, { arch: true }); }
    if (big) { // a front gable wing with the door and a porch, framed gable above
      const bx0 = 0.02, bx1 = 0.4, bz = 0.2, bw = bx1 - bx0; B.with((bx0 + bx1) / 2, 0, d / 2 + bz / 2, 0, 1, () => { B.box(-bw / 2, -0.06, -bz / 2 - 0.02, bw / 2, hs, bz / 2, 'stone', null, STONE_C, 0.55, false, 0.85); B.walls(-bw / 2 + 0.008, bw / 2 - 0.008, -bz / 2, bz / 2 - 0.008, hs, hw, 'plaster');
        quoins(B, -bw / 2, bz / 2, -0.04, hw - 0.04, -1, 1); quoins(B, bw / 2, bz / 2, -0.04, hw - 0.04, 1, 1);
        B.with(0, 0, 0, -Math.PI / 2, 1, () => gableRoof(B, { x0: -bz / 2 - 0.2, x1: bz / 2, z0: -bw / 2, z1: bw / 2, ye: hw - 0.01, yr: 0.98, ox: 0.06, oz: 0.07, frame: 'x1' }));
        doorOn(B, bz / 2 - 0.008, 0, 0.17, 0.34, { y0: 0.02, porch: true, porchD: 0.16 }); lantern(B, -bw / 2 + 0.02, 0.38, bz / 2, 1); windowOn(B, bz / 2 - 0.004, 0, hw + 0.06, 0.09, 0.1, { small: true }); });
      if (B.det) for (const x of [-0.38, -0.16]) windowOn(B, d / 2, x, 0.34, 0.13, 0.2, { arch: true, flowers: true, shut: sh }); }
    else if (B.det) for (const x of [-0.27, 0.02]) windowOn(B, d / 2, x, 0.34, 0.13, 0.2, { arch: true, flowers: true, shut: v === 2 ? sh : null });
    if (!B.det) return;
    B.with(0, 0, 0, Math.PI, 1, () => { windowOn(B, d / 2, -0.18, 0.34, 0.13, 0.2, { arch: true, flowers: v === 1 }); windowOn(B, d / 2, 0.2, 0.34, 0.13, 0.2, { arch: true }); });
    // the +x end: arched door (a window on the big house), lantern, hanging sign, lean-to shed with crates
    sideX(B, w / 2, () => { if (!big) { doorOn(B, 0.008, -0.12, 0.2, 0.42, { stone: true }); lantern(B, 0.04, 0.42, 0.01, 1); B.beam([-0.27, 0.5, 0.01], [-0.27, 0.5, 0.2], 0.016, 'iron', W1); B.beam([-0.27, 0.5, 0.17], [-0.27, 0.44, 0.17], 0.006, 'iron', W1); B.box(-0.275, 0.33, 0.12, -0.265, 0.44, 0.22, 'sign', 'plank', W1);
        B.box(0.12, -0.04, 0.0, 0.34, 0.27, 0.2, 'plank', null, [0.85, 0.74, 0.62], 0.4); B.slope([0.1, 0.25, 0.25], [0.37, 0.25, 0.25], [0.1, 0.4, -0.005], [0.37, 0.4, -0.005], { cw: 0.06 });
        crate(B, 0.03, -0.03, 0.12, 0.1, 0.2); if (v !== 1) crate(B, 0.04, 0.07, 0.12, 0.08, -0.3); barrel(B, 0.42, -0.02, 0.12, 0.05, 0.13); }
      else { windowOn(B, 0.008, 0.0, 0.34, 0.13, 0.2, { arch: true, shut: sh }); lantern(B, 0.2, 0.42, 0.008, 1); } });
    if (v === 1) { barrel(B, -w / 2 - 0.08, 0, 0.12, 0.055, 0.14); barrel(B, -w / 2 - 0.07, 0, 0.0, 0.05, 0.13); } else woodpile(B, -w / 2 - 0.1, 0, 0, 0.4, 2, 0);
    pot(B, -w / 2 + 0.05, d / 2 + 0.08, 0.08); if (v === 2) bench(B, -0.12, d / 2 + 0.09, 0.26); }
  // T4/T5 Ladderstack / Spinehouse (concept Lv20): stone ground floor, jettied timber-framed storeys, wrap-round balcony, steep gable roof with dormers, ladders, washing line, banners
  function townhouse(B, v, big) { const w0 = 0.72, d0 = 0.66, h0 = 0.48, w1 = 0.84, d1 = 0.74, h1 = 0.9, h2 = 1.22, h3 = big ? 1.52 : h2, w2 = w1 + 0.06, d2 = d1 + 0.04, ov = 0.07, sh = SHUT[(v + 2) % 4];
    B.box(-w0 / 2, -0.06, -d0 / 2, w0 / 2, h0, d0 / 2, 'stone', null, STONE_C, 0.55, false, 0.85); for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) quoins(B, x * w0 / 2, z * d0 / 2, -0.04, h0, x, z);
    B.box(-w1 / 2 - 0.08, h0, -d1 / 2 - 0.08, w1 / 2 + 0.08, h0 + 0.04, d1 / 2 + 0.08, 'plank', 'plank', TIMB, 0.5, true);
    B.walls(-w1 / 2 + 0.06, w1 / 2 - 0.06, -d1 / 2 + 0.06, d1 / 2 - 0.06, h0 + 0.04, h1, 'plaster', 0.9, 0.85);
    B.box(-w1 / 2, h1, -d1 / 2, w1 / 2, h1 + 0.04, d1 / 2, 'timber', 'timber', TIMB, 0, true); B.walls(-w1 / 2, w1 / 2, -d1 / 2, d1 / 2, h1 + 0.04, h2, 'plaster', 0.9, 0.85);
    if (big) { B.box(-w2 / 2, h2, -d2 / 2, w2 / 2, h2 + 0.04, d2 / 2, 'timber', 'timber', TIMB, 0, true); B.walls(-w2 / 2, w2 / 2, -d2 / 2, d2 / 2, h2 + 0.04, h3, 'plaster', 0.9, 0.85); }
    const tw = big ? w2 : w1, td = big ? d2 : d1, yr = h3 + 0.56; gableRoof(B, { x0: -tw / 2, x1: tw / 2, z0: -td / 2, z1: td / 2, ye: h3, yr, ox: ov, oz: ov + 0.04, frame: true });
    const chx = v === 2 ? -0.18 : 0.12; chimney(B, chx, -0.12, h3, yr + 0.05, 0.16);
    if (!B.det) { doorOn(B, d0 / 2, -0.09, 0.2, 0.36); for (const x of [-0.17, 0.2]) windowOn(B, d1 / 2, x, h1 + 0.09, 0.11, 0.15, {}); return; }
    for (let k = 0; k < 6; k++) { const x = -w1 / 2 + k * w1 / 5; B.beam([x, h0 - 0.13, d0 / 2], [x, h0, d1 / 2 + 0.06], 0.03, 'timber', TIMB); B.beam([x, h0 - 0.13, -d0 / 2], [x, h0, -d1 / 2 - 0.06], 0.03, 'timber', TIMB); }
    wallFace(B, w1, d1, (L, z, f) => { halfTimber(B, L - 0.12, z - 0.06, h0 + 0.04, h1, { n: 3, mid: 0.5 }); const fb = f === 'f' || f === 'b'; halfTimber(B, L, z, h1 + 0.04, h2 - (fb && !big ? 0.07 : 0), { n: 3 });
      if (big) halfTimber(B, fb ? w2 : d2, fb ? d2 / 2 : w2 / 2, h2 + 0.04, h3 - (fb ? 0.07 : 0), { n: 4 });
      if (f === 'f' || f === 'r') { windowOn(B, z - 0.06, -L * 0.2, h0 + 0.17, 0.12, 0.17, { shut: sh }); windowOn(B, z - 0.06, L * 0.2, h0 + 0.17, 0.12, 0.17, { shut: sh }); windowOn(B, z, -L * 0.18, h1 + 0.09, 0.11, 0.15, { flowers: f === 'f' }); windowOn(B, z, L * 0.22, h1 + 0.09, 0.11, 0.15, { flowers: f === 'f' && v !== 1 }); }
      else { windowOn(B, z - 0.06, 0, h0 + 0.17, 0.12, 0.17, {}); windowOn(B, z, 0, h1 + 0.09, 0.11, 0.15, {}); }
      if (big) { const z2 = (fb ? d2 : w2) / 2; windowOn(B, z2, -0.15, h2 + 0.1, 0.1, 0.14, { flowers: f === 'f' }); windowOn(B, z2, 0.17, h2 + 0.1, 0.1, 0.14, {}); }
      const rz = (fb ? d1 : w1) / 2 + 0.075, rl = (fb ? w1 : d1) / 2 + 0.075; B.beam([-rl, h0 + 0.17, rz], [rl, h0 + 0.17, rz], 0.03, 'timber', TIMB, 0.022); for (let k = 0; k <= 9; k++) { const x = -rl + k * rl * 2 / 9; B.beam([x, h0 + 0.04, rz], [x, h0 + 0.17, rz], 0.018, 'timber', TIMB); } });
    // dormers on the front slope
    const k = (yr - h3) / (td / 2), yAt = (z) => h3 + k * (td / 2 - z); for (const x of v === 1 ? [0.0] : [-0.2, 0.2]) { const zf = td / 2 - 0.06, y0 = yAt(zf), zb = zf - 0.26, dw = 0.085, yr2 = y0 + 0.28;
      B.box(x - dw, y0 - 0.06, zb, x + dw, y0 + 0.16, zf, 'plaster', null, [0.9, 0.9, 0.9]); windowOn(B, zf, x, y0 + 0.0, 0.1, 0.12, {});
      B.slope([x + dw + 0.03, y0 + 0.14, zf + 0.03], [x + dw + 0.03, y0 + 0.14, zb - 0.02], [x, yr2, zf + 0.03], [x, yr2, zb - 0.02], { cw: 0.05, seg: 0.3 }); B.slope([x - dw - 0.03, y0 + 0.14, zb - 0.02], [x - dw - 0.03, y0 + 0.14, zf + 0.03], [x, yr2, zb - 0.02], [x, yr2, zf + 0.03], { cw: 0.05, seg: 0.3 });
      B.tri([x - dw, y0 + 0.16, zf], [x + dw, y0 + 0.16, zf], [x, yr2 - 0.02, zf], 'plaster', [0.9, 0.9, 0.9]); B.ridge([x, yr2 + 0.01, zf + 0.04], [x, yr2 + 0.01, zb], 0.024); finial(B, x, yr2 + 0.02, zf + 0.02, 0.12); }
    finial(B, -tw / 2 - ov + 0.02, yr, 0, 0.2); finial(B, tw / 2 + ov - 0.02, yr, 0, 0.16);
    if (v !== 1) { B.box(chx - 0.12, yr + 0.09, -0.24, chx + 0.12, yr + 0.11, 0.0, 'plank', 'plank', TIMB); B.tube([chx - 0.06, yr + 0.17, -0.12], [chx + 0.1, yr + 0.23, -0.08], 0.018, 0.026, 8, 'tileEnd', [1.5, 1.2, 0.6], 'iron'); B.beam([chx, yr + 0.11, -0.11], [chx, yr + 0.19, -0.11], 0.012, 'iron', W1); }
    // ground floor: arched door + step, small window, barrels; ladders up to the balcony and to the roof; washing line, banners, lanterns
    doorOn(B, d0 / 2, -0.09, 0.2, 0.36, {}); windowOn(B, d0 / 2, 0.21, 0.2, 0.08, 0.1, { arch: true, stoneFrame: true }); barrel(B, 0.2, -0.02, d0 / 2 + 0.1, 0.055, 0.14); if (v !== 2) barrel(B, 0.31, -0.02, d0 / 2 + 0.07, 0.045, 0.12); crate(B, -0.3, -0.02, d0 / 2 + 0.1, 0.1, 0.4);
    ladder(B, [w0 / 2 + 0.14, -0.04, 0.12], [w0 / 2 + 0.04, h0 + 0.04, 0.14], 0.05); ladder(B, [0.27, h0 + 0.05, d1 / 2 + 0.05], [0.3, h1 + 0.02, d1 / 2 + 0.01], 0.045);
    const ly = h1 - 0.02, lz = d1 / 2 + 0.13; B.beam([-w1 / 2 - 0.1, ly, lz], [w1 / 2 + 0.12, ly - 0.01, lz], 0.007, 'hay', [0.9, 0.85, 0.7]);
    for (let j = 0; j < 5; j++) { const x = -w1 / 2 + j * 0.155, hh = 0.09 + (j % 3) * 0.03, u = [(j % 6) / 6, 0, (j % 6) / 6 + 0.16, 1]; B.quad([x, ly - hh, lz], [x + 0.1, ly - hh, lz], [x + 0.1, ly, lz], [x, ly, lz], 'cloth', W1, u); B.quad([x + 0.1, ly - hh, lz], [x, ly - hh, lz], [x, ly, lz], [x + 0.1, ly, lz], 'cloth', W1, u); }
    for (const z of [d0 / 2 - 0.1, -d0 / 2 + 0.15]) { B.beam([-w0 / 2, 0.44, z], [-w0 / 2 - 0.11, 0.44, z], 0.014, 'iron', W1); const bx = -w0 / 2 - 0.11; B.quad([bx, 0.18, z + 0.045], [bx, 0.18, z - 0.045], [bx, 0.43, z - 0.045], [bx, 0.43, z + 0.045], 'cloth', W1, [0, 0, 0.16, 1]); B.quad([bx, 0.18, z - 0.045], [bx, 0.18, z + 0.045], [bx, 0.43, z + 0.045], [bx, 0.43, z - 0.045], 'cloth', W1, [0, 0, 0.16, 1]); }
    lantern(B, -w1 / 2, h1 - 0.1, d1 / 2 - 0.05, 1); lantern(B, w1 / 2, h1 - 0.1, d1 / 2 - 0.05, 1); lantern(B, 0.06, 0.36, d0 / 2, 1);
    if (big) { // a round stair turret on the back corner with a tiled cone
      const tx = w1 / 2 + 0.02, tz = -d1 / 2 + 0.04, tr = 0.14; B.cyl(tx, -0.06, tz, tr * 1.06, tr, h2 + 0.1, 12, 'stone', STONE_C, null, 2); B.cyl(tx, h2 + 0.1, tz, tr + 0.05, tr + 0.05, 0.03, 12, 'timber', W1, 'timber');
      for (let j = 0; j < 5; j++) { const t0 = j / 5, t1 = (j + 1) / 5, ra = (tr + 0.06) * (1 - t0), rb = (tr + 0.06) * (1 - t1); B.cyl(tx, h2 + 0.13 + 0.44 * t0, tz, ra + 0.012, rb, 0.44 / 5, 12, 'tileA', W1, null, 2); } finial(B, tx, h2 + 0.57, tz, 0.14);
      B.with(tx, 0, tz, Math.PI * 0.25, 1, () => { windowOn(B, tr + 0.004, 0, 0.7, 0.06, 0.1, { arch: true, stoneFrame: true }); windowOn(B, tr + 0.004, 0, 1.05, 0.06, 0.1, { arch: true, stoneFrame: true }); }); } }
  // T6/T7 Lumenworks / Deepwarden Hall (concept Lv30): stacked storeys with tiled skirts, a round stone tower with a slate cone + weathervane, crane with a dangling crate, open arched doors
  function workshop(B, v, big) { const w = big ? 1.12 : 1.0, d = big ? 0.84 : 0.78, f1 = 0.44, f2 = 0.8, f3 = 1.1;
    plinth(B, -w / 2, w / 2, -d / 2, d / 2, 0.1); B.walls(-w / 2 + 0.01, w / 2 - 0.01, -d / 2 + 0.01, d / 2 - 0.01, 0.1, f1, 'plaster', 0.9, 0.82);
    skirt(B, -w / 2, w / 2, -d / 2, d / 2, f1 - 0.03, 0.1, 0.12);
    const w2 = w - 0.12, d2 = d - 0.1; B.walls(-w2 / 2, w2 / 2, -d2 / 2, d2 / 2, f1 + 0.08, f2, 'plaster', 0.9, 0.82); skirt(B, -w2 / 2, w2 / 2, -d2 / 2, d2 / 2, f2 - 0.03, 0.09, 0.11);
    const w3 = w2 - 0.14, d3 = d2 - 0.08; B.walls(-w3 / 2, w3 / 2, -d3 / 2, d3 / 2, f2 + 0.07, f3, 'plaster', 0.9, 0.82);
    const yr = f3 + 0.42; gableRoof(B, { x0: -w3 / 2, x1: w3 / 2, z0: -d3 / 2, z1: d3 / 2, ye: f3, yr, ox: 0.08, oz: 0.09, frame: true });
    const tx = -w / 2 - 0.02, tz = -d / 2 + 0.12, tr = big ? 0.22 : 0.19, th = big ? 1.5 : 1.3; B.cyl(tx, -0.06, tz, tr * 1.08, tr, th, 16, 'stone', STONE_C, null, 3); B.cyl(tx, th - 0.06, tz, tr + 0.06, tr + 0.06, 0.04, 16, 'timber', W1, 'timber');
    if (B.det) { const h = 0.54, y0 = th - 0.02; for (let j = 0; j < 7; j++) { const t0 = j / 7, t1 = (j + 1) / 7, ra = (tr + 0.07) * (1 - t0), rb = (tr + 0.07) * (1 - t1); B.cyl(tx, y0 + h * t0, tz, ra + 0.012, rb, h / 7, 16, 'slateRow', [0.95, 0.95, 1.0], null, 3); } }
    else B.cyl(tx, th - 0.02, tz, tr + 0.07, 0.0, 0.54, 10, 'slate', W1);
    chimney(B, 0.24, -0.12, f3, yr + 0.08, 0.14); if (big) chimney(B, -0.2, -0.1, f3, yr + 0.02, 0.12);
    if (!B.det) { doorOn(B, d / 2, -0.13, 0.26, 0.38, { open: true }); for (const x of [-0.3, 0.0, 0.3]) windowOn(B, d2 / 2, x, f1 + 0.15, 0.1, 0.15, { arch: true }); return; }
    for (const [hw2, hd2, y0, y1] of [[w / 2, d / 2, 0.1, f1 - 0.04], [w2 / 2, d2 / 2, f1 + 0.08, f2 - 0.03], [w3 / 2, d3 / 2, f2 + 0.07, f3]]) wallFace(B, hw2 * 2, hd2 * 2, (L, z, f) => halfTimber(B, L, z, y0, y1 - (y1 === f3 && (f === 'f' || f === 'b') ? 0.07 : 0), { n: Math.max(3, Math.round(L / 0.22)), braces: f !== 'f' || y0 > 0.2, skip: f === 'f' && y0 < 0.2 ? (x) => x > -0.32 && x < 0.08 : null }));
    for (const x of [-0.3, 0.0, 0.3]) windowOn(B, d2 / 2, x, f1 + 0.15, 0.1, 0.15, { arch: true, flowers: x === 0 }); for (const x of [-0.18, 0.18]) windowOn(B, d3 / 2, x, f2 + 0.13, 0.1, 0.14, { arch: true });
    B.with(0, 0, 0, Math.PI / 2, 1, () => { for (const x of [-0.18, 0.18]) windowOn(B, w2 / 2, x, f1 + 0.15, 0.1, 0.15, { arch: true }); windowOn(B, w3 / 2, 0, f2 + 0.13, 0.1, 0.14, { arch: true, flowers: v !== 1 }); windowOn(B, w3 / 2 + 0.002, 0, f3 + 0.11, 0.09, 0.12, { round: true }); });
    B.with(0, 0, 0, Math.PI, 1, () => { for (const x of [-0.2, 0.2]) windowOn(B, d2 / 2, x, f1 + 0.15, 0.1, 0.15, { arch: true }); windowOn(B, d / 2, 0.2, 0.18, 0.1, 0.14, {}); });
    windowOn(B, d / 2, 0.3, 0.17, 0.12, 0.16, { shut: SHUT[v % 4] });
    doorOn(B, d / 2, -0.13, 0.26, 0.38, { open: true, steps: 2 }); B.quad([-0.28, 0.0, d / 2 + 0.17], [-0.26, 0.0, d / 2 + 0.03], [-0.26, 0.34, d / 2 + 0.03], [-0.28, 0.34, d / 2 + 0.17], 'door', [0.85, 0.85, 0.85]); B.quad([0.0, 0.0, d / 2 + 0.03], [0.02, 0.0, d / 2 + 0.17], [0.02, 0.34, d / 2 + 0.17], [0.0, 0.34, d / 2 + 0.03], 'door', [0.85, 0.85, 0.85]);
    sideX(B, w / 2, () => { doorOn(B, 0.008, 0.05, 0.22, 0.32, { open: true }); lantern(B, -0.12, 0.36, 0.01, 1); crate(B, 0.26, 0, 0.1, 0.11, 0.2); crate(B, 0.27, 0.11, 0.1, 0.08, -0.2); barrel(B, -0.24, 0, 0.1, 0.055, 0.14); });
    lantern(B, 0.08, 0.38, d / 2 + 0.01, 1); lantern(B, -0.33, 0.38, d / 2 + 0.01, 1); lantern(B, w2 / 2 - 0.04, f2 - 0.1, d2 / 2 + 0.03, 1); lantern(B, -w2 / 2 + 0.06, f2 - 0.1, d2 / 2 + 0.03, 1);
    B.with(tx, 0, tz, -Math.PI * 0.75, 1, () => { windowOn(B, tr + 0.005, 0, 0.8, 0.08, 0.12, { arch: true, stoneFrame: true }); windowOn(B, tr + 0.005, 0, 1.1, 0.07, 0.1, { arch: true, stoneFrame: true }); { const dw = 0.13 * DOOR_K, dh = 0.26 * DOOR_K; B.box(-dw / 2 - 0.03, -0.04, tr - 0.06, dw / 2 + 0.03, dh + 0.035, tr + 0.012, 'stone', 'stone', STONE_C); doorOn(B, tr + 0.014, 0, 0.13, 0.26, { steps: 1 }); } }); // the tower door sits in a dressed stone surround proud of the curved wall (a flat leaf on the curve clipped and floated)
    B.with(tx, 0, tz, -Math.PI * 0.25, 1, () => windowOn(B, tr + 0.005, 0, 0.55, 0.07, 0.1, { arch: true, stoneFrame: true }));
    const vy = th + 0.52; B.cyl(tx, vy, tz, 0.012, 0.012, 0.16, 5, 'iron', W1); B.box(tx - 0.06, vy + 0.13, tz - 0.005, tx + 0.06, vy + 0.15, tz + 0.005, 'iron', 'iron', W1); B.box(tx - 0.005, vy + 0.13, tz - 0.05, tx + 0.005, vy + 0.15, tz + 0.05, 'iron', 'iron', W1); B.box(tx - 0.02, vy + 0.16, tz - 0.012, tx + 0.05, vy + 0.22, tz + 0.012, 'chim', 'chim', [1.4, 1.1, 0.55]);
    // (the tower crane with its dangling crate is gone: from the ground it read as a box hanging off the house for no reason)
    for (const [x0, x1, y, z] of [[-w / 2, w / 2, f1 + 0.08, d / 2 + 0.06], [-w2 / 2, w2 / 2, f2 + 0.07, d2 / 2 + 0.05]]) for (let k = 0; k < 6; k++) { const x = x0 + (k + 0.3 + (k * 0.37) % 0.4) * (x1 - x0) / 6; B.box(x - 0.05, y - 0.03, z - 0.04, x + 0.04 * (1 + k % 2), y - 0.005, z - 0.005, 'moss', 'moss', [0.7, 0.78, 0.55]); }
    finial(B, -w3 / 2 - 0.06, yr, 0, 0.2); B.cyl(w3 / 2 + 0.06, yr, 0, 0.012, 0.012, 0.2, 5, 'iron', W1); B.beam([w3 / 2, yr + 0.17, 0], [w3 / 2 + 0.12, yr + 0.17, 0], 0.012, 'iron', W1); B.beam([w3 / 2 + 0.06, yr + 0.17, -0.06], [w3 / 2 + 0.06, yr + 0.17, 0.06], 0.012, 'iron', W1);
    ladder(B, [w / 2 - 0.12, f1 + 0.1, d2 / 2 + 0.07], [w / 2 - 0.16, f2 + 0.06, d3 / 2 + 0.06], 0.04); if (v === 1) ladder(B, [-w / 2 + 0.16, f1 + 0.12, d2 / 2 + 0.07], [-w / 2 + 0.22, f2 + 0.07, d3 / 2 + 0.06], 0.04);
    if (big) { const bw = 0.7, bd = 0.36; B.with(0.12, 0, -d / 2 - bd / 2 + 0.02, 0, 1, () => { plinth(B, -bw / 2, bw / 2, -bd / 2, bd / 2, 0.1); B.walls(-bw / 2 + 0.01, bw / 2 - 0.01, -bd / 2 + 0.01, bd / 2, 0.1, 0.48, 'plaster', 0.9, 0.82); hipRoof(B, { x0: -bw / 2, x1: bw / 2, z0: -bd / 2, z1: bd / 2 + 0.04, ye: 0.48, yr: 0.72, ov: 0.08 });
        B.with(0, 0, 0, Math.PI, 1, () => { halfTimber(B, bw, bd / 2, 0.1, 0.48, { n: 4 }); for (const x of [-0.2, 0.0, 0.2]) windowOn(B, bd / 2, x, 0.2, 0.09, 0.15, { arch: true, shut: SHUT[(v + 1) % 4] }); }); });
      for (const a of [0.6, 2.2]) B.with(tx, 0, tz, a, 1, () => { B.beam([0, 1.02, tr], [0, 1.02, tr + 0.08], 0.012, 'iron', W1); B.quad([-0.04, 0.72, tr + 0.08], [0.04, 0.72, tr + 0.08], [0.04, 1.01, tr + 0.08], [-0.04, 1.01, tr + 0.08], 'cloth', W1, [0.5, 0, 0.66, 1]); B.quad([0.04, 0.72, tr + 0.08], [-0.04, 0.72, tr + 0.08], [-0.04, 1.01, tr + 0.08], [0.04, 1.01, tr + 0.08], 'cloth', W1, [0.5, 0, 0.66, 1]); }); } }
  // tier -> builder: 0/1 hut, 2/3 cottage, 4/5 townhouse, 6/7 workshop (odd tiers are the grown-up version of the even one)
  const TIERS = [(B, v) => hut(B, v, false), (B, v) => hut(B, v, true), (B, v) => cottage(B, v, false), (B, v) => cottage(B, v, true), (B, v) => townhouse(B, v, false), (B, v) => townhouse(B, v, true), (B, v) => workshop(B, v, false), (B, v) => workshop(B, v, true)];
  const VARIANTS = 3, KEYS = []; for (let t = 0; t < 8; t++) for (let v = 0; v < VARIANTS; v++) KEYS.push('h' + t + 'abc'[v]);
  function material() { if (!atlas) atlas = paintAtlas(); return new THREE.MeshLambertMaterial({ map: atlas.T, vertexColors: true, emissive: 0xffb060, emissiveMap: atlas.TE, emissiveIntensity: 0 }); }
  function build(fn, v, lod) { const B = Builder(lod === 0, 1000 + v * 77); if (v === 1) B.with(0, 0, 0, 0, 1, () => fn(B, v), true); else fn(B, v); return B; }
  const HREG = {}; let HMAT = null;
  // one house kit at a given door scale (the player's own home is drawn larger than its tier's: its doors get their own scale so they match every other door)
  function variant(key, dk, bare) { const [fn, v] = HREG[key]; DOOR_K = dk; NOFRAME = !!bare; const b0 = build(fn, v, 0), b1 = build(fn, v, 1); DOOR_K = 1; NOFRAME = false; return { geos: [b0.geo(), b1.geo()], mat: HMAT, tree: false, chim: b0.chim, lamps: b0.lamps, doors: b1.doors || b0.doors || [] }; }
  function houses() { const out = {}, mat = HMAT = material(); const add = (key, fn, v) => { HREG[key] = [fn, v]; DOOR_K = /^h\d/.test(key) ? DOORK[+key[1]] : 1; const b0 = build(fn, v, 0), b1 = build(fn, v, 1); DOOR_K = 1; out[key] = { geos: [b0.geo(), b1.geo()], mat, tree: false, chim: b0.chim, lamps: b0.lamps, doors: b1.doors || b0.doors || [] }; };
    for (let t = 0; t < 8; t++) for (let v = 0; v < VARIANTS; v++) add('h' + t + 'abc'[v], TIERS[t], v); return out; }
  function keyFor(tier, seed) { return 'h' + Math.max(0, Math.min(7, tier)) + 'abc'[Math.floor(Math.abs(seed) * VARIANTS) % VARIANTS]; }
  /* ---------- trees (Mia's env_ground_eyelevel / env_ground_closeup / env_tree_clusters_mid): a big round puffy crown built from many
     overlapping leaf clumps - each a soft core ball wrapped in painted leaf-cluster cards (alpha-cut, normals bent out from the crown so the
     whole crown shades as one soft mass, no facets) - on a thick fluted trunk that splits into curving limbs, buttress roots that grip a
     mossy boulder; rim willows hang strands, conifers for the high ground ---------- */
  let treeAtlas = null;
  // atlas (1024x512 logical, painted at 2x): bark | leaf fill | stone+moss | 6 leaf-cluster cards (alpha)
  const AX = { bark: [0, 200], leaf: [206, 560], rock: [566, 700], card: [706, 1024] };
  function paintTreeAtlas() { const cv = document.createElement('canvas'); cv.width = 2048; cv.height = 1024; const g = cv.getContext('2d'); const r = rng(3); g.scale(2, 2);
    // bark: warm brown ridged, twisting fibres, mossy streaks
    g.fillStyle = '#7a5e44'; g.fillRect(0, 0, 204, 512); for (let k = 0; k < 260; k++) { const x = r() * 204, w = 2 + r() * 6; g.strokeStyle = r() < 0.55 ? `rgba(${52 + r() * 20 | 0},${36 + r() * 14 | 0},${24},.55)` : `rgba(${168 + r() * 40 | 0},${136 + r() * 30 | 0},${100 + r() * 20 | 0},.38)`; g.lineWidth = w; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (r() - 0.5) * 40, 170, x + (r() - 0.5) * 40, 340, x + (r() - 0.5) * 20, 512); g.stroke(); }
    for (let k = 0; k < 60; k++) { g.strokeStyle = `rgba(${110 + r() * 30 | 0},${130 + r() * 30 | 0},${50},.22)`; g.lineWidth = 1 + r() * 2; const x = r() * 204, y = r() * 512; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 6, y + 20 + r() * 40); g.stroke(); } /* thin moss streaks along the grain */
    g.fillStyle = '#ece6da'; g.fillRect(140, 0, 64, 512); for (let k = 0; k < 900; k++) { const v = 200 + r() * 50 | 0; g.fillStyle = `rgba(${v},${v - 6},${v - 16},.5)`; g.fillRect(140 + r() * 64, r() * 512, 2 + r() * 10, 1 + r() * 2); } for (let k = 0; k < 170; k++) { g.fillStyle = `rgba(${30 + r() * 30 | 0},${28 + r() * 24 | 0},${26},${0.55 + r() * 0.4})`; const x = 140 + r() * 60, y = r() * 512, w = 3 + r() * 16; g.beginPath(); g.ellipse(x + w / 2, y, w / 2, 0.8 + r() * 2.2, 0, 0, 6.3); g.fill(); } /* birch bark: white with dark horizontal lenticels and scars (also tinted for plane/sycamore patchwork) */
    // leaf fill: small rounded leaves, olive shadow to sunlit yellow-green (crown cores and conifer tiers)
    const leafDab = (x, y, rr, a, col, hi) => { const ca = Math.cos(a), sa = Math.sin(a); g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rr, rr * 0.62, a, 0, 6.3); g.fill(); if (hi) { g.strokeStyle = hi; g.lineWidth = Math.max(0.8, rr * 0.22); g.beginPath(); g.ellipse(x, y, rr * 0.8, rr * 0.45, a, 3.6, 5.6); g.stroke(); } };
    g.fillStyle = '#56702c'; g.fillRect(204, 0, 360, 512); for (let i = 0; i < 16000; i++) { const x = 204 + r() * 360, y = r() * 512, k = r(); leafDab(x, y, 2.4 + r() * 3.4, r() * 6.283, k < 0.25 ? `rgba(${40 + r() * 20 | 0},${62 + r() * 20 | 0},${22},.85)` : k < 0.72 ? `rgba(${116 + r() * 26 | 0},${146 + r() * 22 | 0},${50 + r() * 16 | 0},.88)` : `rgba(${168 + r() * 28 | 0},${186 + r() * 20 | 0},${74 + r() * 24 | 0},.88)`, k > 0.5 ? 'rgba(220,226,140,.5)' : null); }
    // stone (bottom half, v 0..0.5): warm grey with soft cracks and speckle; moss (top half): fuzzy yellow-green
    g.fillStyle = '#a49a8c'; g.fillRect(564, 256, 140, 256); for (let i = 0; i < 1400; i++) { const v = 120 + r() * 70 | 0; g.fillStyle = `rgba(${v},${v - 8},${v - 20},.35)`; g.beginPath(); g.arc(564 + r() * 140, 256 + r() * 256, 1 + r() * 4, 0, 6.3); g.fill(); }
    for (let k = 0; k < 26; k++) { g.strokeStyle = 'rgba(70,60,50,.18)'; g.lineWidth = 0.8 + r(); g.beginPath(); let x = 564 + r() * 140, y = 256 + r() * 256; g.moveTo(x, y); for (let s = 0; s < 4; s++) { x += (r() - 0.5) * 30; y += (r() - 0.5) * 30; g.lineTo(x, y); } g.stroke(); }
    g.fillStyle = '#7f9a2e'; g.fillRect(564, 0, 140, 256); for (let i = 0; i < 3600; i++) { const k = r(); g.fillStyle = k < 0.3 ? 'rgba(96,118,34,.35)' : k < 0.8 ? 'rgba(146,170,54,.35)' : 'rgba(180,200,84,.4)'; g.beginPath(); g.arc(564 + r() * 140, r() * 256, 0.5 + r() * 1.2, 0, 6.3); g.fill(); }
    // leaf-cluster cards: a rounded clump of small leaves with a scalloped outline, top-lit, transparent outside
    for (let c = 0; c < 6; c++) { const ox = 706 + (c % 2) * 159, oy = (c >> 1) * 166, cx = ox + 79, cy = oy + 82, R = 62, rc = rng(100 + c);
      g.save(); g.beginPath(); g.rect(ox + 1, oy + 1, 157, 162); g.clip();
      g.fillStyle = 'rgb(62,88,30)'; g.beginPath(); for (let k = 0; k <= 40; k++) { const a = k / 40 * 6.283, rr = R * (0.8 + 0.1 * Math.sin(a * 7 + c)); g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.92); } g.fill();
      const L = []; for (let i = 0; i < 260; i++) { const a = rc() * 6.283, d = R * Math.sqrt(rc()) * 0.98; L.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.92, a, d]); } L.sort((p, q) => q[1] - p[1]);
      for (const [x, y, a, d] of L) { const up = 1 - (y - (cy - R)) / (2 * R), k = rc(), lit = Math.min(1, Math.max(0, up * 0.9 + (k - 0.5) * 0.5)); const R0 = 84 + 92 * lit, G0 = 108 + 92 * lit, B0 = 30 + 44 * lit;
        leafDab(x, y, 7 + rc() * 5, a + (rc() - 0.5) * 0.8, `rgb(${R0 | 0},${G0 | 0},${B0 | 0})`, lit > 0.45 ? `rgba(${R0 + 60 | 0},${G0 + 46 | 0},${B0 + 40 | 0},.75)` : 'rgba(52,74,24,.45)'); }
      g.restore(); }
    const T = new THREE.CanvasTexture(cv); T.encoding = THREE.sRGBEncoding; T.anisotropy = 8; T.generateMipmaps = true; T.minFilter = THREE.LinearMipmapLinearFilter; T.magFilter = THREE.LinearFilter; return T; }
  function TBuilder() { const B = { p: [], n: [], uv: [], c: [], i: [] }; B.v = (x, y, z, nx, ny, nz, u, v, c) => { B.p.push(x, y, z); B.n.push(nx, ny, nz); B.uv.push(u, v); B.c.push(c[0], c[1], c[2]); return B.p.length / 3 - 1; };
    B.geo = () => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(B.uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(B.c, 3)); g.setIndex(B.i); g.computeBoundingSphere(); return g; }; return B; }
  let BKS = 0, BT = [1, 1, 1]; /* bark strip (0 brown, 1 white birch) and bark tint for the species being built */
  const TU = (x) => x / 1024, BARK = (u, v) => (BKS ? [TU(143) + u * TU(58), v] : [TU(3) + u * TU(131), v]), LEAF = (u, v) => [TU(AX.leaf[0] + 3) + u * TU(AX.leaf[1] - AX.leaf[0] - 6), v * 0.98 + 0.01],
    ROCK = (u, v) => [TU(AX.rock[0] + 3) + u * TU(AX.rock[1] - AX.rock[0] - 6), 0.01 + v * 0.47], MOSS = (u, v) => [TU(AX.rock[0] + 3) + u * TU(AX.rock[1] - AX.rock[0] - 6), 0.52 + v * 0.46],
    CARD = (c, u, v) => { const ox = 706 + (c % 2) * 159, oy = (c >> 1) * 166; return [TU(ox + 2 + u * 155), 1 - (oy + 2 + (1 - v) * 160) / 512]; };
  // a tapered limb along a polyline (smooth rings), bark-textured, darker at the base; fl = fluting (ridged, twisting trunk)
  function limb(B, pts, r0, r1, n, dark, fl, tw) { const N = pts.length, rings = []; let vacc = 0; fl = fl || 0; tw = tw || 0;
    for (let i = 0; i < N; i++) { const p = pts[i], q = pts[Math.min(N - 1, i + 1)], o = pts[Math.max(0, i - 1)], d = new THREE.Vector3(q[0] - o[0], q[1] - o[1], q[2] - o[2]).normalize(), up = Math.abs(d.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0), a = new THREE.Vector3().crossVectors(d, up).normalize(), b = new THREE.Vector3().crossVectors(a, d);
      if (i) vacc += Math.hypot(p[0] - o[0], p[1] - o[1], p[2] - o[2]); const t = i / (N - 1), rr = r0 + (r1 - r0) * t, sh = (dark || 0.75) + (1 - (dark || 0.75)) * t, base = B.p.length / 3; rings.push(base);
      for (let k = 0; k <= n; k++) { const ang = k / n * Math.PI * 2, nx = a.x * Math.cos(ang) + b.x * Math.sin(ang), ny = a.y * Math.cos(ang) + b.y * Math.sin(ang), nz = a.z * Math.cos(ang) + b.z * Math.sin(ang), fs = fl ? Math.sin(ang * 6 + tw * t * 6.283) : 0, R = rr * (1 + fl * fs), gr = 1 - fl * 1.6 * (0.5 - 0.5 * fs); const [u, v] = BARK(k / n, (vacc * (BKS ? 1.2 : 3)) % 1); B.v(p[0] + nx * R, p[1] + ny * R, p[2] + nz * R, nx, ny, nz, u, v, [sh * gr * BT[0], sh * 0.98 * gr * BT[1], sh * 0.94 * gr * BT[2]]); } }
    for (let i = 0; i < N - 1; i++) for (let k = 0; k < n; k++) { const a0 = rings[i] + k, b0 = rings[i + 1] + k; B.i.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1); } }
  const curve = (a, b, c, n) => { const out = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1], u * u * a[2] + 2 * u * t * b[2] + t * t * c[2]]); } return out; };
  // one leafy floret: a lumpy ball (conifer tips / small fills); hue tints the whole clump
  function floret(B, cx, cy, cz, rx, ry, rz, det, seed, hue, light, nc, shade) { const g = new THREE.IcosahedronGeometry(1, det), P = g.attributes.position, r = rng(seed), ph = [r() * 10, r() * 10, r() * 10], map = new Map(), idx = [];
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), key = (x * 1e4 | 0) + ',' + (y * 1e4 | 0) + ',' + (z * 1e4 | 0); let j = map.get(key);
      if (j == null) { const nn = 1 + 0.08 * Math.sin(x * 5.3 + ph[0]) * Math.sin(y * 4.7 + ph[1]) * Math.sin(z * 5.1 + ph[2]);
        const yy = y > 0 ? y : y * 0.6, t = Math.min(1, Math.max(0, (y + 0.8) / 1.7)), sh = (0.34 + 0.86 * Math.pow(t, 1.2)) * light * (0.94 + r() * 0.12);
        const [u, v] = LEAF((Math.atan2(z, x) / Math.PI + 1) / 2, (y + 1) / 2); const px = cx + x * nn * rx, py = cy + yy * nn * ry, pz = cz + z * nn * rz; let Nx = x, Ny = y * 0.9 + 0.1, Nz = z, s2 = 1; if (nc) { const N2 = nc(px, py, pz); Nx = Nx * 0.3 + N2[0] * 0.7; Ny = Ny * 0.3 + N2[1] * 0.7; Nz = Nz * 0.3 + N2[2] * 0.7; s2 = N2[3]; } const f = shade ? shade * s2 : sh; j = B.v(px, py, pz, Nx, Ny, Nz, u, v, [f * hue[0], f * hue[1], f * hue[2]]); map.set(key, j); } idx.push(j); }
    for (let i = 0; i < idx.length; i += 3) B.i.push(idx[i], idx[i + 1], idx[i + 2]); }
  const HUES = [[0.92, 1.0, 0.62], [1.04, 1.06, 0.6], [0.86, 0.96, 0.66], [1.1, 1.06, 0.56], [0.95, 1.02, 0.7]];
  // the crown: clumps on an ellipsoid (centre C, radii R); each clump = a darker core ball + leaf cards fanned round its outer face
  let DRP = [1, 1];
  function crown(B, C, R, nCl, lod, r, hueK, droop) { const crN = (x, y, z) => { const dx = (x - C[0]) / R[0], dy = (y - C[1]) / R[1], dz = (z - C[2]) / R[2], e = Math.hypot(dx, dy, dz) || 1, nx = dx / R[0], ny = dy / R[1], nz = dz / R[2], l = Math.hypot(nx, ny, nz) || 1; return [nx / l, ny / l + 0.06, nz / l, (0.5 + 0.5 * Math.min(1, e)) * (0.74 + 0.26 * (dy / e + 1) / 2)]; };
    const cl = [], ga = Math.PI * (3 - Math.sqrt(5)); for (let i = 0; i < nCl; i++) { const y = 1 - (i + 0.5) / nCl * 1.55, rad = Math.sqrt(Math.max(0, 1 - y * y)), th = ga * i + r() * 0.4, d = [Math.cos(th) * rad, y, Math.sin(th) * rad], k = 0.7 + r() * 0.12;
      cl.push({ c: [C[0] + d[0] * R[0] * k, C[1] + d[1] * R[1] * k, C[2] + d[2] * R[2] * k], d, s: Math.min(R[0], R[1]) * (0.42 + r() * 0.14), hue: HUES[(i + hueK) % HUES.length] }); }
    cl.push({ c: C.slice(), d: [0, 1, 0], s: Math.min(R[0], R[1]) * 0.75, hue: HUES[hueK % HUES.length], core: true });
    for (const q of cl) floret(B, q.c[0], q.c[1], q.c[2], q.s * 0.86, q.s * 0.8, q.s * 0.86, lod ? 0 : 1, (r() * 1e6) | 0, q.hue, 1, crN, 0.62);
    const nCard = lod ? 4 : 11; for (const q of cl) { if (q.core) continue; for (let k = 0; k < nCard; k++) {
      const yy = 1 - (k + 0.5) / nCard * 1.6, rr = Math.sqrt(Math.max(0, 1 - yy * yy)), th = ga * k + r() * 6.283; let n = [Math.cos(th) * rr, yy, Math.sin(th) * rr]; if (n[0] * q.d[0] + n[1] * q.d[1] + n[2] * q.d[2] < -0.35) continue;
      const hs = q.s * (lod ? 0.95 : 0.62) * (0.85 + r() * 0.3), p = [q.c[0] + n[0] * q.s * 0.78, q.c[1] + n[1] * q.s * 0.72, q.c[2] + n[2] * q.s * 0.78];
      const pn = new THREE.Vector3(n[0] + (r() - 0.5) * 0.7, n[1] + (r() - 0.5) * 0.5, n[2] + (r() - 0.5) * 0.7).normalize(), up = Math.abs(pn.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0), ta = new THREE.Vector3().crossVectors(up, pn).normalize(), tb = new THREE.Vector3().crossVectors(pn, ta); if (tb.y < 0) { tb.negate(); ta.negate(); } const ro = (r() - 0.5) * 0.5, cr = Math.cos(ro), sr = Math.sin(ro);
      const A = ta.clone().multiplyScalar(cr).addScaledVector(tb, sr).multiplyScalar(hs), Bv = ta.clone().multiplyScalar(-sr).addScaledVector(tb, cr).multiplyScalar(hs), cc = (r() * 6) | 0, b0 = B.p.length / 3;
      for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const x = p[0] + A.x * su + Bv.x * sv, y = p[1] + A.y * su + Bv.y * sv, z = p[2] + A.z * su + Bv.z * sv, N2 = crN(x, y, z), lit = N2[3] * (1.08 + r() * 0.12); const [u, v] = CARD(cc, (su + 1) / 2, (sv + 1) / 2);
        B.v(x, y, z, N2[0] * 0.8 + n[0] * 0.2, N2[1] * 0.8 + n[1] * 0.2, N2[2] * 0.8 + n[2] * 0.2, u, v, [lit * q.hue[0], lit * q.hue[1], lit * q.hue[2]]); }
      B.i.push(b0, b0 + 1, b0 + 2, b0, b0 + 2, b0 + 3); } }
    if (droop && !lod) for (let k = 0; k < Math.round(40 * droop); k++) { const q = cl[k % (cl.length - 1)]; if (q.d[1] > 0.35) continue; const a = r() * 6.283, rr = q.s * (0.3 + r() * 0.5), x = q.c[0] + Math.cos(a) * rr, z = q.c[2] + Math.sin(a) * rr, y = q.c[1] - q.s * 0.4, L = (0.14 + r() * 0.3) * DRP[0], sw = (0.008 + r() * 0.008) * DRP[1], nx = Math.cos(a), nz = Math.sin(a), lt = 0.8 + r() * 0.4, c0 = [0.46 * lt, 0.58 * lt, 0.3 * lt], c1 = [0.78 * lt, 0.9 * lt, 0.46 * lt];
      const b0 = B.p.length / 3; for (const [dx, dy, dz, c] of [[-sw * nz, 0, sw * nx, c0], [sw * nz, 0, -sw * nx, c0], [sw * 0.15 * nz + nx * 0.04, -L, -sw * 0.15 * nx + nz * 0.04, c1], [-sw * 0.15 * nz + nx * 0.04, -L, sw * 0.15 * nx + nz * 0.04, c1]]) B.v(x + dx, y + dy, z + dz, nx, 0.3, nz, ...LEAF(0.2 + r() * 0.6, dy ? 0.1 : 0.5), c); B.i.push(b0, b0 + 1, b0 + 2, b0, b0 + 2, b0 + 3); }
    return cl; }
  // a rounded, warm grey-brown boulder with moss on its crown (per-face stone / moss texture), smooth normals
  function boulder(B, cx, cy, cz, rx, ry, rz, det, seed, bare) { const g = new THREE.IcosahedronGeometry(1, det).toNonIndexed(), P = g.attributes.position, ph = (seed % 97) * 0.37;
    const lump = (x, y, z) => 1 + 0.1 * Math.sin(x * 3.1 + ph) * Math.cos(z * 2.7 - ph) + 0.05 * Math.sin(y * 6 + x * 4 + ph);
    for (let f = 0; f < P.count; f += 3) { let fy = 0, fx = 0, fz = 0; for (let j = 0; j < 3; j++) { fx += P.getX(f + j); fy += P.getY(f + j); fz += P.getZ(f + j); } fx /= 3; fy /= 3; fz /= 3;
      const moss = false;
      for (let j = 0; j < 3; j++) { const x = P.getX(f + j), y = P.getY(f + j), z = P.getZ(f + j), l = lump(x, y, z), yb = y < -0.3 ? -0.3 + (y + 0.3) * 0.4 : y, ao = 0.62 + 0.38 * (y + 1) / 2, [u, v] = (moss ? MOSS : ROCK)((Math.atan2(z, x) / Math.PI + 1) / 2, (y + 1) / 2);
        const mw = bare ? 0 : Math.min(1, Math.max(0, (y - 0.5 - 0.24 * Math.sin(x * 5 + ph) * Math.cos(z * 4.4 - ph) + 0.12 * Math.sin(x * 11 + z * 9)) / 0.22)), c = [(0.68 + (0.6 - 0.68) * mw) * ao, (0.67 + (0.84 - 0.67) * mw) * ao, (0.65 + (0.24 - 0.65) * mw) * ao]; /* moss caps blend softly into the stone (per vertex) */ B.v(cx + x * l * rx, cy + yb * l * ry, cz + z * l * rz, x / rx * rx, y + 0.1, z, u, v, c); }
      const b = B.p.length / 3 - 3; B.i.push(b, b + 1, b + 2); } }
  // tree kinds: an oak shape (crown centre/radii, trunk split height, lean, boulder at its foot or not)
  const OAKS = { 17: { C: [0.0, 0.7, 0.0], R: [0.42, 0.28, 0.42], split: 0.4, lean: [0.02, 0.0], bould: 1, hue: 0 }, 18: { C: [0.0, 0.7, 0.0], R: [0.42, 0.28, 0.42], split: 0.4, lean: [0.02, 0.0], bould: 0, hue: 0 },
    31: { C: [0.05, 0.74, 0.02], R: [0.34, 0.27, 0.33], split: 0.46, lean: [0.06, 0.02], bould: 0, hue: 2 },
    47: { C: [-0.04, 0.62, 0.03], R: [0.5, 0.23, 0.46], split: 0.36, lean: [-0.05, 0.03], bould: 1.25, hue: 3 }, 48: { C: [-0.04, 0.62, 0.03], R: [0.5, 0.23, 0.46], split: 0.36, lean: [-0.05, 0.03], bould: 0, hue: 3 },
    23: { C: [0.04, 0.66, 0.0], R: [0.4, 0.26, 0.4], split: 0.36, lean: [0.05, 0.0], bould: 0.9, hue: 1 }, 24: { C: [0.04, 0.66, 0.0], R: [0.4, 0.26, 0.4], split: 0.36, lean: [0.05, 0.0], bould: 0, hue: 1 }, 59: { C: [-0.03, 0.66, 0.02], R: [0.44, 0.27, 0.4], split: 0.38, lean: [-0.03, 0.02], bould: 0, hue: 4 } };
  function broadleaf(lod, droop, seed, K0) { const B = TBuilder(), sd = seed || (droop ? 23 : 17), r = rng(sd), K = K0 || OAKS[sd] || OAKS[17], S = [K.lean[0], K.split, K.lean[1]], TR = K.trunk || [0.122, 0.084], tk = TR[0] / 0.122; if (K.droop != null) droop = K.droop; DRP = [K.droopL || 1, K.droopW || 1];
    const ba = r() * 6.283, bR = 0.2 * (K.bould || 1), bc = [Math.cos(ba) * (0.1 + bR * 0.55), 0.03, Math.sin(ba) * (0.1 + bR * 0.55)], bs = [bR * 1.1, bR * 0.95, bR];
    // thick fluted trunk (twisting ridges) on a flared foot
    limb(B, curve([0, -0.06, 0], [S[0] * 0.2 + (K.kink || 0), S[1] * 0.5, S[2] * 0.2 - (K.kink || 0) * 0.6], S, lod ? 3 : 7), TR[0], TR[1], lod ? 7 : 14, 0.62, lod ? 0 : K.fl != null ? K.fl : 0.09, K.tw || 0.6);
    limb(B, [[0, -0.06, 0], [0, 0.04, 0], [0, 0.17, 0]], 0.18 * tk, 0.08 * tk, lod ? 7 : 14, 0.6, lod ? 0 : K.fl != null ? K.fl : 0.09, K.tw || 0.6); /* tapers inside the trunk: no collar step */
    // buttress roots: arch out from the foot, the ones on the boulder side drape over it and grip it
    { const nr = lod ? 4 : 7; for (let k = 0; k < nr; k++) { const a = k / nr * 6.283 + r() * 0.5, toB = K.bould && Math.cos(a - ba) > 0.6, L = toB ? 0.3 + r() * 0.08 : (0.14 + r() * 0.12) * (K.rootL || 1), w = (r() - 0.5) * 0.5, rs = toB ? 1 : K.rootS || 1, pts = curve([Math.cos(a) * 0.07 * rs, toB ? 0.15 : 0.1 * rs, Math.sin(a) * 0.07 * rs], [Math.cos(a) * (0.15 + L * 0.15) * rs, toB ? 0.06 : -0.01, Math.sin(a) * (0.15 + L * 0.15) * rs], [Math.cos(a + w) * (0.12 + L) * rs, -0.03, Math.sin(a + w) * (0.12 + L) * rs], lod ? 3 : 7);
      if (toB) { /* over the boulder and down its far side, hugging it all the way (no arch) */ const bd = Math.hypot(bc[0], bc[2]), dEnd = bd + bR * 0.45, NP = lod ? 5 : 12; pts.length = 0; for (let j = 0; j <= NP; j++) { const t = j / NP, d = 0.08 + (dEnd - 0.08) * t, aa = a + w * 0.4 * t, x = Math.cos(aa) * d, z = Math.sin(aa) * d, dx = (x - bc[0]) / bs[0], dz = (z - bc[2]) / bs[2], q = 1 - dx * dx - dz * dz, uy = q > 0 ? Math.sqrt(q) : 0, ph = (sd % 97) * 0.37, lu = 1 + 0.1 * Math.sin(dx * 3.1 + ph) * Math.cos(dz * 2.7 - ph) + 0.05 * Math.sin(uy * 6 + dx * 4 + ph), sH = q > 0 ? bc[1] + uy * lu * bs[1] - 0.004 - 0.035 * t * t * t : -0.03; pts.push([x, Math.max(sH, 0.17 * (1 - t) * (1 - t) - 0.03), z]); } /* from the trunk foot up the stone's near flank onto its crown, following its lumpy surface (gripping, never arching) */ }
      else if (K.bould) { const cut = pts.findIndex((p) => { const dx = (p[0] - bc[0]) / bs[0], dz = (p[2] - bc[2]) / bs[2]; return 1 - dx * dx - dz * dz > -0.05; }); if (cut >= 0) continue; } /* any other root that would cross the boulder is left out (no arches over it) */
      const bk0 = BKS; if (K.rootDark) BKS = 0; limb(B, pts, (toB ? 0.05 : 0.07) * (toB ? 1 : tk), 0.012, lod ? 4 : 7, 0.62, lod ? 0 : 0.08, 0.3); BKS = bk0; } }
    if (K.bould) { boulder(B, bc[0], bc[1], bc[2], bs[0], bs[1], bs[2], lod ? 1 : 3, sd); if (!lod) for (let k = 0; k < 5; k++) { const a = ba + (r() - 0.5) * 3.2, d = bR * 1.15 + 0.04 + r() * 0.08, s = 0.03 + r() * 0.04; boulder(B, bc[0] + Math.cos(a) * d, 0.0, bc[2] + Math.sin(a) * d, s * 1.2, s * 0.8, s, 1, sd + k * 7, true); } }
    // limbs: 3-4 big curving limbs from the split up into the crown, each forking once
    const nb = lod ? Math.min(3, K.nb || 3) : (K.nb || 3 + (r() * 2 | 0)), C = K.C, R = K.R;
    for (let k = 0; k < nb; k++) { const a = k / nb * 6.283 + r() * 0.6, e = [C[0] + Math.cos(a) * R[0] * 0.62, C[1] - R[1] * 0.1 + r() * 0.08, C[2] + Math.sin(a) * R[2] * 0.62], m = [S[0] + Math.cos(a) * R[0] * 0.5, S[1] + 0.06, S[2] + Math.sin(a) * R[2] * 0.5], pts = curve(S, m, e, lod ? 3 : 6);
      limb(B, pts, 0.064 * tk, 0.022 * tk, lod ? 5 : 8, 0.7, lod ? 0 : 0.05, 0.4); if (!lod) { const p = pts[3], a2 = a + (r() < 0.5 ? -1 : 1) * (0.6 + r() * 0.5); limb(B, curve(p, [p[0] + Math.cos(a2) * 0.08, p[1] + 0.08, p[2] + Math.sin(a2) * 0.08], [C[0] + Math.cos(a2) * R[0] * 0.55, C[1] + R[1] * 0.15, C[2] + Math.sin(a2) * R[2] * 0.55], 4), 0.026, 0.01, 6, 0.8); } }
    const c0 = B.p.length / 3, cl = crown(B, C, R, lod ? Math.max(6, Math.round((K.ncl || 18) * 0.55)) : K.ncl || 18, lod, r, K.hue, droop); tintFrom(B, c0, K.tint);
    if (K.extra) speciesExtras(B, cl, K, lod, r); DRP = [1, 1];
    return B.geo(); }
  function tintFrom(B, i0, t) { if (!t) return; for (let i = i0 * 3; i < B.c.length; i += 3) { B.c[i] *= t[0]; B.c[i + 1] *= t[1]; B.c[i + 2] *= t[2]; } }
  /* blossom, fruit and cone dots on the outer face of the crown clumps (stone texel brightened: reads as flat painted dabs) */
  function speciesExtras(B, cl, K, lod, r) { const outer = cl.filter((q) => !q.core); for (const [col, n, sz] of K.extra) { const N = lod ? Math.round(n * 0.12) : n; for (let k = 0; k < N; k++) { const q = outer[(r() * outer.length) | 0], a = r() * 6.283, e = (r() - 0.25) * 1.3, d = [Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)]; if (d[0] * q.d[0] + d[1] * q.d[1] + d[2] * q.d[2] < 0.1) { k--; if (r() < 0.02) break; continue; } const s0 = q.s * sz * (0.75 + r() * 0.5); floretPlain(B, q.c[0] + d[0] * q.s * 0.86, q.c[1] + d[1] * q.s * 0.8, q.c[2] + d[2] * q.s * 0.86, s0, col.map((c) => c * (0.85 + r() * 0.3))); } } }
  function floretPlain(B, x, y, z, s, col) { const g = new THREE.IcosahedronGeometry(1, 0), P = g.attributes.position, b0 = B.p.length / 3; for (let i = 0; i < P.count; i++) { const px = P.getX(i), py = P.getY(i), pz = P.getZ(i), [u, v] = ROCK(0.3 + 0.4 * (px + 1) / 2, 0.3 + 0.4 * (py + 1) / 2), sh = 0.8 + 0.25 * (py + 1) / 2; B.v(x + px * s, y + py * s * 0.85, z + pz * s, px, py * 0.8 + 0.3, pz, u, v, [col[0] * sh, col[1] * sh, col[2] * sh]); B.i.push(b0 + i); } }
  /* Scots pine (trees_sheet_1): a tall straight orange-brown trunk, a few dead stubs low down, flat dark-green needle pads on short branches high up */
  function pineTree(lod, seed) { const B = TBuilder(), r = rng(seed); BKS = 0; BT = [1.32, 0.86, 0.6]; const lean = (r() - 0.5) * 0.06, top = [lean, 1.0, 0];
    limb(B, curve([0, -0.05, 0], [lean * 0.3, 0.5, 0], top, lod ? 3 : 8), 0.055, 0.016, lod ? 5 : 9, 0.7, lod ? 0 : 0.04, 0.2);
    if (!lod) for (let k = 0; k < 4; k++) { const y = 0.3 + k * 0.08 + r() * 0.04, a = r() * 6.283, L = 0.06 + r() * 0.06; limb(B, [[lean * y, y, 0], [lean * y + Math.cos(a) * L, y + 0.03, Math.sin(a) * L]], 0.009, 0.003, 4, 0.75); } /* dead stubs */
    const pads = lod ? 8 : 20, c0 = B.p.length / 3; for (let k = 0; k < pads; k++) { const f = k / (pads - 1), y = 0.5 + f * 0.46 + (r() - 0.5) * 0.04, a = k * 2.4 + r() * 0.8, d = (0.24 * (1 - f) + 0.06) * (0.75 + r() * 0.5), x = lean * y + Math.cos(a) * d, z = Math.sin(a) * d;
      if (!lod) limb(B, [[lean * y, y - 0.05, 0], [lean * y + Math.cos(a) * d * 0.5, y - 0.01, Math.sin(a) * d * 0.5], [x, y, z]], 0.016, 0.006, 5, 0.78);
      /* Scots pine (trees_sheet_1): each pad a loose cluster of 2-3 needle tufts, not one disc - an irregular, layered crown over the top half */
      const sz = 0.065 + 0.035 * (1 - f) + r() * 0.025, nt = lod ? 1 : 5; for (let t = 0; t < nt; t++) { const ta = a + (t - 2) * 0.7 + r() * 0.4, td = t ? sz * (0.55 + r() * 0.4) : 0; floret(B, x + Math.cos(ta) * td, y + 0.02 + (t ? (r() - 0.3) * 0.04 : 0), z + Math.sin(ta) * td, sz * (t ? 0.8 : 1.15), sz * (0.7 + r() * 0.35), sz * (t ? 0.95 : 1.15), lod || t ? 0 : 1, (r() * 1e6) | 0, [0.42, 0.64, 0.42], 1, null, 0); } }
    floret(B, top[0], 0.98, 0, 0.08, 0.07, 0.08, lod ? 0 : 1, 77 + seed, [0.42, 0.64, 0.42], 1, null, 0); BT = [1, 1, 1]; return B.geo(); }
  /* charred dead pine (coal approach): a soot-black snag, broken crown, bare spurs pointing every way, a few scorched needle tufts left on some */
  function deadPine(lod, seed, tufts) { const B = TBuilder(), r = rng(seed); BKS = 0; BT = [0.36, 0.31, 0.28]; const lean = (r() - 0.5) * 0.1, H = 0.78 + r() * 0.18, top = [lean, H, 0.02];
    limb(B, curve([0, -0.05, 0], [lean * 0.3, H * 0.5, 0], top, lod ? 3 : 7), 0.068, 0.016, lod ? 5 : 8, 0.85, lod ? 0 : 0.06, 0.3);
    const nb = lod ? 5 : 11; for (let k = 0; k < nb; k++) { const y = 0.35 + (k / nb) * (H - 0.38) + r() * 0.04, a = k * 2.3 + r() * 0.9, L = (0.1 + r() * 0.12) * (1 - 0.45 * y / H), dn = L * (0.35 + r() * 0.5), x0 = lean * y / H, ex = x0 + Math.cos(a) * L, ez = Math.sin(a) * L; /* biome_coal_approach: bare antler-like snags, limbs reaching up and forking */
      limb(B, [[x0, y, 0], [x0 + Math.cos(a) * L * 0.55, y + dn * 0.25 + 0.01, Math.sin(a) * L * 0.55], [ex, y + dn, ez]], 0.014, 0.004, lod ? 3 : 4, 0.85);
      if (!lod) { const a2 = a + (r() < 0.5 ? -0.7 : 0.7), mx = x0 + Math.cos(a) * L * 0.55, my = y + dn * 0.3, mz = Math.sin(a) * L * 0.55; limb(B, [[mx, my, mz], [mx + Math.cos(a2) * L * 0.25, my + L * 0.3, mz + Math.sin(a2) * L * 0.25], [mx + Math.cos(a2) * L * 0.4, my + L * 0.62, mz + Math.sin(a2) * L * 0.4]], 0.008, 0.002, 3, 0.85); }
      if (tufts && !lod && r() < 0.3) floret(B, ex, y + dn + 0.015, ez, 0.04, 0.025, 0.04, 0, (r() * 1e6) | 0, [0.34, 0.38, 0.26], 1, null, 0); }
    BT = [1, 1, 1]; return B.geo(); }
  function conifer(lod, seed, tint, nt) { const B = TBuilder(), r = rng(seed || 11), tiers = lod ? 5 : nt || 11; limb(B, [[0, -0.06, 0], [0.005, 0.5, 0], [0.01, 0.95, 0]], 0.055, 0.012, lod ? 5 : 7, 0.6);
    for (let t = 0; t < tiers; t++) { const f = t / (tiers - 1), y0 = 0.12 + f * 0.78, y1 = y0 + (lod ? 0.26 : 0.19) - f * 0.06, rad = 0.36 * Math.pow(1 - f, 0.9) + 0.025, n = lod ? 7 : 16, sh = 0.5 + f * 0.55, rot = r() * 6.28;
      const ring = []; for (let k = 0; k <= n; k++) { const kk = k % n, a = kk / n * Math.PI * 2 + rot, long = kk % 2 === 0, rr = rad * (long ? 1.05 : 0.7) * (0.85 + r() * 0.3), dy = long ? -0.04 - r() * 0.035 : 0.012; ring.push([Math.cos(a) * rr, y0 + dy, Math.sin(a) * rr]); } ring[n] = ring[0];
      const tipI = B.v(0, y1, 0, 0, 1, 0, ...LEAF(0.5, 1), [sh * 0.8, sh, sh * 0.68]);
      const rI = ring.map(([x, y, z], k) => { const l = Math.hypot(x, z) || 1, dk = k % 2 ? 0.78 : 1.0, lit = 0.9 + 0.2 * Math.max(0, x / l); return B.v(x, y, z, x / l * 0.75, 0.66, z / l * 0.75, ...LEAF(k / n, 0), [sh * 0.46 * dk * lit, sh * 0.6 * dk * lit, sh * 0.4 * dk * lit]); });
      for (let k = 0; k < n; k++) B.i.push(rI[k], tipI, rI[k + 1]); const ci = B.v(0, y0 + 0.03, 0, 0, -1, 0, ...LEAF(0.5, 0.5), [0.18, 0.24, 0.16]); for (let k = 0; k < n; k++) B.i.push(rI[k + 1], ci, rI[k]); }
    tintFrom(B, 0, tint);
    return B.geo(); }
  /* ---------- species (trees_sheet_1/2/3, trees_variation_oak): every species is the same kit - trunk, roots, limbs, crown of leaf clumps -
     with its own proportions, bark and leaf colour; each has 2-4 cuts (age, lean, crown shape) so no two neighbours are carbon copies ---------- */
  const SPEC = {
    oak: { C: [0.0, 0.7, 0.0], R: [0.42, 0.28, 0.42], split: 0.4, lean: [0.02, 0.0], hue: 0, ncl: 18 },
    maple: { C: [0.0, 0.66, 0.0], R: [0.34, 0.31, 0.34], split: 0.36, lean: [0.0, 0.0], hue: 1, ncl: 22, trunk: [0.1, 0.07], tint: [1.1, 1.12, 0.78], nb: 4 },
    birch: { C: [0.0, 0.67, 0.0], R: [0.21, 0.4, 0.2], split: 0.56, lean: [0.02, 0.0], hue: 1, trunk: [0.042, 0.026], bark: 1, bt: [1.15, 1.15, 1.12], tint: [1.14, 1.18, 0.76], droop: 2.4, droopL: 0.8, rootL: 0.35, rootS: 0.42, rootDark: 1, ncl: 18, nb: 3, fl: 0 },
    ash: { C: [0.0, 0.74, 0.0], R: [0.31, 0.3, 0.31], split: 0.5, lean: [0.0, 0.0], hue: 2, ncl: 12, trunk: [0.07, 0.048], bt: [0.92, 0.94, 0.94], tint: [0.98, 1.06, 0.82], nb: 4 },
    beech: { C: [0.0, 0.62, 0.0], R: [0.4, 0.31, 0.4], split: 0.4, lean: [0.0, 0.0], hue: 3, ncl: 22, trunk: [0.1, 0.075], bt: [0.6, 0.6, 0.6], fl: 0.02, tint: [1.14, 1.1, 0.64], extra: [[[1.35, 0.72, 0.34], 14, 0.2]], bark: 1 },
    sycamore: { C: [0.0, 0.68, 0.0], R: [0.46, 0.3, 0.44], split: 0.42, lean: [0.0, 0.0], hue: 1, ncl: 20, trunk: [0.12, 0.085], bark: 1, bt: [0.78, 0.76, 0.58], tint: [1.12, 1.14, 0.68] },
    alder: { C: [0.0, 0.66, 0.0], R: [0.28, 0.3, 0.28], split: 0.45, lean: [0.0, 0.0], hue: 4, ncl: 16, trunk: [0.07, 0.05], bt: [0.86, 0.84, 0.8], tint: [0.74, 0.88, 0.74], extra: [[[0.7, 0.45, 0.3], 26, 0.14]] },
    hawthorn: { C: [0.0, 0.56, 0.0], R: [0.36, 0.25, 0.36], split: 0.3, lean: [0.04, 0.02], hue: 2, ncl: 16, trunk: [0.09, 0.058], fl: 0.16, tw: 1.6, kink: 0.05, tint: [0.86, 0.98, 0.72], extra: [[[2.6, 2.52, 2.34], 110, 0.17]] },
    willow: { C: [0.0, 0.74, 0.0], R: [0.36, 0.3, 0.34], split: 0.36, lean: [0.03, 0.0], hue: 1, ncl: 18, trunk: [0.1, 0.072], nb: 4, droop: 7, droopL: 1.7, droopW: 3.2, tint: [1.06, 1.16, 0.66], fl: 0.1 },
    crabapple: { C: [0.0, 0.58, 0.0], R: [0.34, 0.27, 0.34], split: 0.3, lean: [0.02, 0.0], hue: 0, ncl: 16, trunk: [0.08, 0.055], fl: 0.12, tw: 1.0, tint: [1.0, 1.08, 0.72], extra: [[[2.7, 1.85, 2.0], 70, 0.2], [[2.0, 0.42, 0.26], 40, 0.17]] },
  };
  const cut = (sp, o) => { const b = SPEC[sp], k = Object.assign({}, b, o || {}); k.C = (o && o.C) || b.C.slice(); k.R = (o && o.R) || b.R.slice(); return k; };
  function speciesGeo(K, seed, lod) { /* sheet greens are deeper than the lime kit default: pull every species' leaf a step toward mid green; roots a modest flare, not splayed legs */ K.tint = (K.tint || [1, 1, 1]).map((v, i) => v * [0.78, 0.86, 0.88][i]); if (K.rootL == null) K.rootL = 0.6; /* side by side with the sheets the crowns read squat: taller, a little narrower, carried higher on a longer bare trunk */ if (!K.droop || K.droop < 5) { K.C = [K.C[0], K.C[1] + 0.06, K.C[2]]; K.R = [K.R[0] * 0.9, K.R[1] * 1.18, K.R[2] * 0.9]; K.split = (K.split || 0.4) + 0.06; } BKS = K.bark || 0; BT = K.bt || [1, 1, 1]; const g = broadleaf(lod, !!K.droop, seed, K); BKS = 0; BT = [1, 1, 1]; return g; }
  /* ---------- bushes, boulders and biome props (bushes_sheet, boulders_sheet, the mine approaches and the water's edge): same atlas and material as the trees,
     instanced by map3d; each unit-sized (1 = its height-ish), lod 1 a lean silhouette ---------- */
  function frond(B, x, z, a, L, w, up, droopK, col, n, tex) { /* a leafy ribbon arching out from (x,0,z) along angle a: fern fronds, reeds, heather spikes */ const b0 = B.p.length / 3, ca = Math.cos(a), sa = Math.sin(a);
    for (let j = 0; j <= n; j++) { const t = j / n, h = Math.sin(up) * L * t - droopK * L * t * t, d = Math.cos(up) * L * t, px = x + ca * d, pz = z + sa * d, ww = w * (1 - t * 0.85) + 0.002, sh = 0.62 + 0.5 * t;
      for (const sd of [-1, 1]) B.v(px - sa * ww * sd, h, pz + ca * ww * sd, ca * 0.3, 0.9, sa * 0.3, ...(tex || LEAF)(0.3 + 0.4 * (sd + 1) / 2, t * 0.9 + 0.05), col.map((c) => c * sh)); }
    for (let j = 0; j < n; j++) { const i = b0 + j * 2; B.i.push(i, i + 1, i + 3, i, i + 3, i + 2); } }
  function pebbles(B, r, n, R0, seed) { for (let k = 0; k < n; k++) { const a = r() * 6.283, d = R0 * (0.75 + r() * 0.5), sz = 0.05 + r() * 0.06; boulder(B, Math.cos(a) * d, -0.01, Math.sin(a) * d, sz * 1.2, sz * 0.7, sz, 1, seed + k * 13, true); } }
  function bush(lod, seed, K) { const B = TBuilder(), r = rng(seed); const C = K.C || [0, 0.36, 0], R = K.R || [0.46, 0.34, 0.44];
    if (K.stems && !lod) for (let k = 0; k < K.stems; k++) { const a = r() * 6.283; limb(B, curve([0, -0.02, 0], [Math.cos(a) * 0.08, C[1] * 0.6, Math.sin(a) * 0.08], [Math.cos(a) * R[0] * 0.7, C[1] + R[1] * 0.5, Math.sin(a) * R[2] * 0.7], 4), 0.025, 0.008, 5, 0.7); }
    const c0 = B.p.length / 3, cl = crown(B, C, R, lod ? Math.max(4, (K.ncl || 9) >> 1) : K.ncl || 9, lod, r, K.hue || 0, 0); tintFrom(B, c0, K.tint);
    if (K.extra) speciesExtras(B, cl, K, lod, r); if (!lod) pebbles(B, r, K.peb == null ? 4 : K.peb, R[0] * 1.05, seed); return B.geo(); }
  function fernGeo(lod, seed, col, n0, up, tex, L0) { const B = TBuilder(), r = rng(seed), n = lod ? Math.round(n0 / 2) : n0; for (let k = 0; k < n; k++) { const a = k / n * 6.283 + r() * 0.4; frond(B, Math.cos(a) * 0.03, Math.sin(a) * 0.03, a, (L0 || 1) * (0.6 + r() * 0.35), 0.1 + r() * 0.03, up + r() * 0.25, 0.55, col.map((c) => c * (0.85 + r() * 0.3)), lod ? 3 : 6, tex); }
    if (!lod) pebbles(B, r, 3, 0.5, seed); return B.geo(); }
  function heatherGeo(lod, seed) { const B = TBuilder(), r = rng(seed), n = lod ? 14 : 44; for (let k = 0; k < n; k++) { const a = r() * 6.283, d = Math.sqrt(r()) * 0.4, pink = r() < 0.75; frond(B, Math.cos(a) * d, Math.sin(a) * d, a, 0.35 + r() * 0.35, 0.04, 1.3 + r() * 0.2, 0.05, pink ? [0.95 + r() * 0.25, 0.55, 0.85] : [0.45, 0.55, 0.32], lod ? 2 : 3, pink ? ROCK : LEAF); }
    if (!lod) pebbles(B, r, 4, 0.45, seed); return B.geo(); }
  function reedsGeo(lod, seed, cattail) { const B = TBuilder(), r = rng(seed), n = lod ? 9 : 26; for (let k = 0; k < n; k++) { const a = r() * 6.283, d = Math.sqrt(r()) * 0.34; frond(B, Math.cos(a) * d, Math.sin(a) * d, a, 0.6 + r() * 0.5, 0.024, 1.25 + r() * 0.25, 0.1 + r() * 0.25, [0.62 + r() * 0.2, 0.78 + r() * 0.15, 0.4], lod ? 2 : 4); }
    if (cattail) { BT = [0.72, 0.5, 0.38]; for (let k = 0; k < (lod ? 3 : 6); k++) { const a = r() * 6.283, d = r() * 0.15, x = Math.cos(a) * d, z = Math.sin(a) * d, h = 0.95 + r() * 0.35; if (!lod) limb(B, [[x, 0, z], [x * 1.2, h * 0.6, z * 1.2], [x * 1.3, h, z * 1.3]], 0.008, 0.005, 4, 0.9); limb(B, [[x * 1.3, h - 0.17, z * 1.3], [x * 1.3, h - 0.08, z * 1.3], [x * 1.3, h, z * 1.3]], 0.026, 0.022, lod ? 4 : 6, 0.35); } BT = [1, 1, 1]; }
    return B.geo(); }
  function lilyGeo(lod, seed) { const B = TBuilder(), r = rng(seed), n = lod ? 3 : 7; for (let k = 0; k < n; k++) { const a = r() * 6.283, d = Math.sqrt(r()) * 0.7, cx = Math.cos(a) * d, cz = Math.sin(a) * d, R = 0.14 + r() * 0.12, sl = r() * 6.283, b0 = B.p.length / 3, col = [0.42 + r() * 0.12, 0.62 + r() * 0.12, 0.3];
      B.v(cx, 0.01, cz, 0, 1, 0, ...LEAF(0.5, 0.5), col); const m = lod ? 6 : 12; for (let j = 0; j <= m; j++) { const t = sl + 0.5 + j / m * (6.283 - 0.7); B.v(cx + Math.cos(t) * R, 0, cz + Math.sin(t) * R, 0, 1, 0, ...LEAF(0.5 + Math.cos(t) * 0.4, 0.5 + Math.sin(t) * 0.4), col.map((c) => c * 0.9)); } B.v(cx, 0.01, cz, 0, 1, 0, ...LEAF(0.5, 0.5), col);
      for (let j = 0; j < m; j++) B.i.push(b0, b0 + 1 + j, b0 + 2 + j); if (!lod && r() < 0.45) floretPlain(B, cx, 0.05, cz, 0.06, r() < 0.5 ? [2.6, 2.5, 2.4] : [2.6, 1.7, 2.0]); }
    return B.geo(); }
  function rockGeo(lod, seed, kind) { const B = TBuilder(), r = rng(seed), d = lod ? 1 : 3;
    if (kind === 'stack') { boulder(B, 0, 0.0, 0, 0.5, 0.36, 0.46, d, seed, true); boulder(B, 0.03, 0.46, 0.0, 0.36, 0.24, 0.32, d, seed + 1, true); boulder(B, 0.0, 0.76, 0.02, 0.22, 0.17, 0.2, d, seed + 2, true); }
    else if (kind === 'cracked') { boulder(B, -0.2, 0, 0, 0.38, 0.62, 0.42, d, seed, true); boulder(B, 0.22, 0, 0.04, 0.36, 0.72, 0.4, d, seed + 3, true); boulder(B, 0.02, 0, 0.3, 0.3, 0.4, 0.26, d, seed + 5, true); }
    else if (kind === 'angular') { boulder(B, 0, 0, 0, 0.45, 1.0, 0.4, lod ? 0 : 1, seed, true); boulder(B, 0.36, 0, 0.18, 0.28, 0.45, 0.26, lod ? 0 : 1, seed + 7, true); }
    else if (kind === 'flat') boulder(B, 0, -0.05, 0, 0.75, 0.38, 0.62, d, seed, true);
    else if (kind === 'half') boulder(B, 0, -0.2, 0, 0.6, 0.5, 0.5, d, seed, false);
    else if (kind === 'scree') { for (let k = 0; k < (lod ? 5 : 14); k++) { const a = r() * 6.283, dd = Math.sqrt(r()) * 0.9, s0 = 0.08 + r() * 0.18; boulder(B, Math.cos(a) * dd, -0.02, Math.sin(a) * dd, s0 * 1.3, s0 * 0.7, s0, lod ? 0 : 1, seed + k * 5, true); } }
    else if (kind === 'slag') { for (let k = 0; k < (lod ? 4 : 11); k++) { const a = r() * 6.283, dd = Math.sqrt(r()) * 0.55, s0 = 0.2 + r() * 0.25 * (1 - dd); boulder(B, Math.cos(a) * dd, -0.05 + (0.55 - dd) * 0.5, Math.sin(a) * dd, s0 * 1.3, s0 * 0.8, s0 * 1.2, lod ? 0 : 1, seed + k * 3, true); } boulder(B, 0, 0, 0, 0.75, 0.42, 0.7, lod ? 1 : 2, seed + 99, true); }
    else if (kind === 'coal') { for (let k = 0; k < (lod ? 5 : 12); k++) { const a = r() * 6.283, dd = Math.sqrt(r()) * 0.5, s0 = (0.12 + r() * 0.16) * (1.2 - dd); boulder(B, Math.cos(a) * dd, (0.5 - dd) * 0.45, Math.sin(a) * dd, s0, s0 * (1.1 + r() * 0.6), s0 * 0.9, 0, seed + k * 7, true); } } /* a heap of faceted black coal lumps */
    else if (kind === 'rust') { boulder(B, 0, 0, 0, 0.55, 0.78, 0.5, d, seed, true); tintFrom(B, 0, [1.5, 0.78, 0.5]); }
    else boulder(B, 0, 0, 0, 0.55, 0.7, 0.5, d, seed, false);
    if (kind === 'rust') { const N = lod ? 10 : 60; for (let k = 0; k < N; k++) { const a = r() * 6.283, e = -0.1 + r() * 1.1, x = Math.cos(a) * Math.cos(e) * 0.5, z = Math.sin(a) * Math.cos(e) * 0.45, y = Math.sin(e) * 0.7 + 0.04, c = r() < 0.4 ? [1.7, 0.55, 0.2] : [0.38, 1.05, 0.9]; floretPlain(B, x, y, z, 0.04 + r() * 0.05, c); } } /* biome_copper_approach: rust bloom and verdigris streaks */
    if (kind === 'lichen' || kind === 'ore') { const N = lod ? 6 : 22; for (let k = 0; k < N; k++) { const a = r() * 6.283, e = 0.1 + r() * 0.9, x = Math.cos(a) * Math.cos(e) * 0.5, z = Math.sin(a) * Math.cos(e) * 0.46, y = Math.sin(e) * 0.66; const c = kind === 'ore' ? [2.2, 1.6, 0.5] : r() < 0.5 ? [2.0, 0.85, 0.35] : [1.4, 1.6, 1.1]; floretPlain(B, x * 1.04, y * 1.0, z * 1.04, kind === 'ore' ? 0.05 + r() * 0.04 : 0.07 + r() * 0.05, c); } }
    if (!lod && kind !== 'scree' && kind !== 'slag') pebbles(B, r, 4, 0.72, seed); return B.geo(); }
  function crystalGeo(lod, seed, col) { const B = TBuilder(), r = rng(seed), n = lod ? 3 : 7; for (let k = 0; k < n; k++) { const a = r() * 6.283, d = k ? 0.12 + r() * 0.18 : 0, h = (k ? 0.35 + r() * 0.35 : 0.8) , rr = h * 0.16, tx = Math.cos(a) * (k ? 0.25 : 0.05), tz = Math.sin(a) * (k ? 0.25 : 0.05), x0 = Math.cos(a) * d, z0 = Math.sin(a) * d, sh = 0.8 + r() * 0.4;
      const ring0 = [], ring1 = []; for (let j = 0; j < 6; j++) { const t = j / 6 * 6.283 + r() * 0.1; ring0.push([x0 + Math.cos(t) * rr, -0.02, z0 + Math.sin(t) * rr]); ring1.push([x0 + tx * h + Math.cos(t) * rr * 0.9, h * 0.78, z0 + tz * h + Math.sin(t) * rr * 0.9]); } const tip = [x0 + tx * h * 1.1, h, z0 + tz * h * 1.1];
      for (let j = 0; j < 6; j++) { const j2 = (j + 1) % 6, nx = Math.cos((j + 0.5) / 6 * 6.283), nz = Math.sin((j + 0.5) / 6 * 6.283), lit = (j % 2 ? 0.82 : 1.08) * sh, c0 = col.map((c) => c * lit * 0.8), c1 = col.map((c) => c * lit * 1.15), b0 = B.p.length / 3;
        B.v(...ring0[j], nx, 0.2, nz, ...ROCK(0.5, 0.5), c0); B.v(...ring0[j2], nx, 0.2, nz, ...ROCK(0.5, 0.5), c0); B.v(...ring1[j2], nx, 0.2, nz, ...ROCK(0.5, 0.5), c1); B.v(...ring1[j], nx, 0.2, nz, ...ROCK(0.5, 0.5), c1); B.v(...tip, nx, 0.7, nz, ...ROCK(0.5, 0.5), col.map((c) => c * 1.4 * sh)); B.i.push(b0, b0 + 1, b0 + 2, b0, b0 + 2, b0 + 3, b0 + 3, b0 + 2, b0 + 4); } }
    if (!lod) pebbles(B, r, 5, 0.42, seed); return B.geo(); } /* faceted six-sided crystal nodes (biome_copper/tin_approach): copper rust-orange, tin pale blue-grey */
  function boxQ(B, cx, cy, cz, sx, sy, sz, col, tex) { const F = [[[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 1, 0], [0, 0, -1]], [[0, 1, 0], [0, 0, 1], [1, 0, 0]], [[0, -1, 0], [0, 0, -1], [1, 0, 0]], [[0, 0, 1], [-1, 0, 0], [0, 1, 0]], [[0, 0, -1], [1, 0, 0], [0, 1, 0]]], h = [sx / 2, sy / 2, sz / 2];
    for (const [n, u, v] of F) { const b0 = B.p.length / 3; for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const p = [0, 1, 2].map((i) => [cx, cy, cz][i] + n[i] * h[i] + u[i] * h[i] * a + v[i] * h[i] * b); B.v(p[0], p[1], p[2], n[0], n[1], n[2], ...(tex || BARK)((a + 1) / 2, (b + 1) / 2), col.map((c) => c * (n[1] > 0 ? 1.1 : n[1] < 0 ? 0.6 : 0.9))); } B.i.push(b0, b0 + 1, b0 + 2, b0, b0 + 2, b0 + 3); } }
  function cartGeo(lod) { const B = TBuilder(), W0 = [0.95, 0.85, 0.75]; boxQ(B, 0, 0.22, 0, 0.62, 0.05, 0.95, W0); for (const sx of [-1, 1]) boxQ(B, sx * 0.3, 0.38, 0, 0.04, 0.3, 0.95, W0); for (const sz of [-1, 1]) boxQ(B, 0, 0.38, sz * 0.46, 0.62, 0.3, 0.04, W0);
    BT = [0.45, 0.4, 0.38]; for (const sx of [-1, 1]) for (const sz of [-1, 1]) limb(B, [[sx * 0.33, 0.12, sz * 0.3], [sx * 0.37, 0.12, sz * 0.3], [sx * 0.4, 0.12, sz * 0.3]], 0.12, 0.12, lod ? 6 : 12, 0.9); BT = [1, 1, 1];
    for (let k = 0; k < (lod ? 4 : 10); k++) { const r = rng(1601 + k); boulder(B, (r() - 0.5) * 0.4, 0.5 + r() * 0.08, (r() - 0.5) * 0.7, 0.1, 0.09, 0.1, 0, 1601 + k, true); } return B.geo(); } /* mine cart heaped with coal (instance tint darkens the lumps with the wood: kept light) */
  function trackGeo(lod) { const B = TBuilder(); BT = [0.72, 0.62, 0.55]; for (let k = 0; k < 4; k++) { const z = -0.5 + (k + 0.5) / 4; limb(B, [[-0.36, 0.03, z], [0, 0.035, z], [0.36, 0.03, z]], 0.045, 0.045, 4, 0.8); } BT = [0.5, 0.5, 0.56]; for (const x of [-0.22, 0.22]) limb(B, [[x, 0.09, -0.52], [x, 0.09, 0], [x, 0.09, 0.52]], 0.022, 0.022, lod ? 3 : 5, 0.95); BT = [1, 1, 1]; return B.geo(); }
  function lanternGeo(lod) { const B = TBuilder(); BT = [1.7, 1.15, 0.5]; limb(B, [[0, -0.05, 0], [0, 0.5, 0], [0, 0.86, 0]], 0.032, 0.026, lod ? 4 : 6, 0.95); limb(B, [[-0.1, 0.84, 0], [0, 0.86, 0], [0.1, 0.84, 0]], 0.018, 0.018, 4, 0.95); BT = [1, 1, 1]; boxQ(B, 0, 0.98, 0, 0.13, 0.2, 0.13, [3.2, 2.1, 0.55], ROCK); boxQ(B, 0, 1.1, 0, 0.17, 0.04, 0.17, [1.6, 1.1, 0.5], ROCK); boxQ(B, 0, 0.87, 0, 0.15, 0.03, 0.15, [1.6, 1.1, 0.5], ROCK); return B.geo(); } /* brass lantern post (biome_coal_approach) */
  function props() { if (!treeAtlas) treeAtlas = paintTreeAtlas(); const mat = new THREE.MeshLambertMaterial({ map: treeAtlas, vertexColors: true, side: THREE.DoubleSide, alphaTest: 0.5 }), T = (fn) => ({ geos: [fn(0), fn(1)], mat, prop: true });
    return { bBerry: T((l) => bush(l, 1201, { tint: [0.74, 0.86, 0.7], extra: [[[0.36, 0.42, 1.1], 40, 0.13]], ncl: 9 })), bHolly: T((l) => bush(l, 1203, { tint: [0.52, 0.7, 0.5], hue: 2, extra: [[[2.2, 0.3, 0.22], 36, 0.1]], R: [0.42, 0.42, 0.4], C: [0, 0.42, 0] })),
      bJuniper: T((l) => bush(l, 1205, { tint: [0.5, 0.72, 0.72], hue: 4, extra: [[[0.42, 0.5, 0.95], 26, 0.09]], R: [0.5, 0.28, 0.46] })), bRose: T((l) => bush(l, 1207, { tint: [0.72, 0.86, 0.66], extra: [[[2.7, 1.5, 1.6], 30, 0.2], [[2.7, 1.9, 2.0], 14, 0.15]] })),
      bBramble: T((l) => bush(l, 1209, { tint: [0.7, 0.82, 0.62], stems: 7, ncl: 6, R: [0.48, 0.3, 0.46], extra: [[[0.28, 0.2, 0.35], 30, 0.1], [[2.6, 2.5, 2.4], 12, 0.1]] })), bGorse: T((l) => bush(l, 1211, { tint: [0.62, 0.78, 0.46], hue: 2, ncl: 10, R: [0.42, 0.4, 0.4], C: [0, 0.4, 0], extra: [[[2.6, 2.0, 0.3], 60, 0.13]] })),
      bFern: T((l) => fernGeo(l, 1213, [0.62, 0.86, 0.36], 13, 0.8)), bHeather: T((l) => heatherGeo(l, 1215)), bScrub: T((l) => bush(l, 1217, { tint: [0.84, 0.74, 0.46], stems: 5, ncl: 6, R: [0.4, 0.26, 0.38], peb: 2 })), bSilver: T((l) => fernGeo(l, 1219, [0.8, 0.92, 0.84], 28, 0.95, ROCK, 1.2)),
      rMossy: T((l) => rockGeo(l, 1301, 'mossy')), rCracked: T((l) => rockGeo(l, 1303, 'cracked')), rStack: T((l) => rockGeo(l, 1305, 'stack')), rLichen: T((l) => rockGeo(l, 1307, 'lichen')), rHalf: T((l) => rockGeo(l, 1309, 'half')), rFlat: T((l) => rockGeo(l, 1311, 'flat')),
      rOre: T((l) => rockGeo(l, 1313, 'ore')), rAngular: T((l) => rockGeo(l, 1315, 'angular')), rScree: T((l) => rockGeo(l, 1317, 'scree')), rCoal: T((l) => rockGeo(l, 1321, 'coal')), rRust: T((l) => rockGeo(l, 1323, 'rust')), pCrystalCu: T((l) => crystalGeo(l, 1701, [1.5, 0.62, 0.3])), pCrystalSn: T((l) => crystalGeo(l, 1703, [0.95, 1.05, 1.25])), pCart: T((l) => cartGeo(l)), rSlag: T((l) => rockGeo(l, 1319, 'slag')),
      pReeds: T((l) => reedsGeo(l, 1401, false)), pCattail: T((l) => reedsGeo(l, 1403, true)), pLily: T((l) => lilyGeo(l, 1405)), pTrack: T((l) => trackGeo(l)), pLantern: T((l) => lanternGeo(l)) }; }
  function trees() { if (!treeAtlas) treeAtlas = paintTreeAtlas(); const mat = new THREE.MeshLambertMaterial({ map: treeAtlas, vertexColors: true, side: THREE.DoubleSide, alphaTest: 0.5 });
    const T = (fn) => ({ geos: [fn(0), fn(1)], mat, tree: true }), S2 = (sp, seed, o) => T((l) => speciesGeo(cut(sp, o), seed, l));
    return { oak: { geos: [broadleaf(0, false, 18), broadleaf(1, false, 18)], mat, tree: true }, willow: { geos: [broadleaf(0, true, 24), broadleaf(1, true, 24)], mat, tree: true },
      /* landmark trees: the ones gripping a mossy boulder - rare, placed far apart (map3d) */ oakL: { geos: [broadleaf(0, false, 17), broadleaf(1, false, 17)], mat, tree: true }, oak3L: { geos: [broadleaf(0, false, 47), broadleaf(1, false, 47)], mat, tree: true }, willowL: { geos: [broadleaf(0, true, 23), broadleaf(1, true, 23)], mat, tree: true }, sequoia: { geos: [conifer(0), conifer(1)], mat, tree: true },
      oak2: { geos: [broadleaf(0, false, 31), broadleaf(1, false, 31)], mat, tree: true }, oak3: { geos: [broadleaf(0, false, 48), broadleaf(1, false, 48)], mat, tree: true }, willow2: { geos: [broadleaf(0, true, 59), broadleaf(1, true, 59)], mat, tree: true }, sequoia2: { geos: [conifer(0, 71), conifer(1, 71)], mat, tree: true },
      /* trees_variation_oak: a young oak (slim, high small crown) and a leaning one */ oakY: S2('oak', 101, { C: [0.0, 0.74, 0.0], R: [0.27, 0.23, 0.27], split: 0.55, trunk: [0.06, 0.042], ncl: 12, nb: 3 }), oakLean: S2('oak', 103, { C: [0.16, 0.66, 0.04], R: [0.4, 0.25, 0.36], split: 0.38, lean: [0.12, 0.03], kink: 0.03 }),
      maple: S2('maple', 211), maple2: S2('maple', 213, { R: [0.3, 0.34, 0.3], C: [0.02, 0.68, 0.0], lean: [0.03, 0.0] }),
      birch: S2('birch', 307), birch2: S2('birch', 311, { R: [0.17, 0.34, 0.17], C: [0.03, 0.62, 0.0], lean: [0.05, 0.01] }), birch3: S2('birch', 313, { R: [0.22, 0.24, 0.21], C: [-0.02, 0.72, 0.0], split: 0.72, trunk: [0.034, 0.022] }),
      ash: S2('ash', 401), ash2: S2('ash', 409, { R: [0.28, 0.3, 0.3], C: [0.03, 0.7, 0.0], lean: [0.04, 0.0] }),
      beech: S2('beech', 503), beech2: S2('beech', 509, { R: [0.44, 0.27, 0.42], C: [0.0, 0.6, 0.0] }),
      sycamore: S2('sycamore', 601), sycamore2: S2('sycamore', 607, { R: [0.4, 0.32, 0.4], lean: [-0.04, 0.02] }),
      alder: S2('alder', 701), alder2: S2('alder', 709, { R: [0.25, 0.33, 0.25], lean: [0.05, 0.0] }),
      hawthorn: S2('hawthorn', 801), hawthorn2: S2('hawthorn', 809, { R: [0.32, 0.27, 0.3], lean: [-0.06, 0.02], kink: -0.05 }),
      willowW: S2('willow', 1001), willowW2: S2('willow', 1009, { R: [0.32, 0.33, 0.3], C: [0.04, 0.76, 0.0], lean: [0.08, 0.02] }), oakM: S2('oak', 1101, { C: [0.0, 0.72, 0.0], R: [0.5, 0.32, 0.48], ncl: 24, nb: 5, trunk: [0.14, 0.1], fl: 0.14, tw: 0.9 }),
      pineDead: { geos: [deadPine(0, 1501, false), deadPine(1, 1501, false)], mat, tree: true }, pineDead2: { geos: [deadPine(0, 1507, false), deadPine(1, 1507, false)], mat, tree: true },
      crabapple: S2('crabapple', 901), crabapple2: S2('crabapple', 907, { R: [0.3, 0.3, 0.3], lean: [0.05, 0.0] }),
      pine: T((l) => pineTree(l, 1001)), pine2: T((l) => pineTree(l, 1013)),
      spruce: T((l) => conifer(l, 1101, [0.62, 0.78, 0.62], 15)), spruce2: T((l) => conifer(l, 1109, [0.58, 0.74, 0.6], 13)) }; }
  return { DOOR_H: 11.1, variant, DOORK: () => DOORK, houses, trees, props, keyFor, KEYS, atlas: () => atlas, kit: { Builder, material, gableRoof, windowOn, doorOn, lantern, chimney, crate, barrel, sack, woodpile, pickaxe, rope, pot, plinth, halfTimber, wallFace, sideX, SHUT } };
})();

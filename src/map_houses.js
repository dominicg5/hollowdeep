
/* =====================================================================
   PROCEDURAL HOUSES + TREES for the 3D Rim City, modelled on the concept sheet
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
  function doorOn(B, z, x, w, h, o) { o = o || {}; const y0 = o.y0 == null ? 0 : o.y0; B.quad([x - w / 2, y0, z + 0.006], [x + w / 2, y0, z + 0.006], [x + w / 2, y0 + h, z + 0.006], [x - w / 2, y0 + h, z + 0.006], o.open ? 'doorO' : 'door', W1);
    if (!B.det) return; const f = 0.026, fk = o.stone ? 'quoin' : 'timber'; B.box(x - w / 2 - f, y0, z, x - w / 2, y0 + h, z + 0.03, fk, fk, TIMB); B.box(x + w / 2, y0, z, x + w / 2 + f, y0 + h, z + 0.03, fk, fk, TIMB); B.box(x - w / 2 - f * 1.8, y0 + h, z, x + w / 2 + f * 1.8, y0 + h + 0.04, z + 0.038, fk, fk, TIMB);
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
    B.with(tx, 0, tz, -Math.PI * 0.75, 1, () => { windowOn(B, tr + 0.005, 0, 0.8, 0.08, 0.12, { arch: true, stoneFrame: true }); windowOn(B, tr + 0.005, 0, 1.1, 0.07, 0.1, { arch: true, stoneFrame: true }); doorOn(B, tr - 0.004, 0, 0.13, 0.26, { steps: 1 }); });
    B.with(tx, 0, tz, -Math.PI * 0.25, 1, () => windowOn(B, tr + 0.005, 0, 0.55, 0.07, 0.1, { arch: true, stoneFrame: true }));
    const vy = th + 0.52; B.cyl(tx, vy, tz, 0.012, 0.012, 0.16, 5, 'iron', W1); B.box(tx - 0.06, vy + 0.13, tz - 0.005, tx + 0.06, vy + 0.15, tz + 0.005, 'iron', 'iron', W1); B.box(tx - 0.005, vy + 0.13, tz - 0.05, tx + 0.005, vy + 0.15, tz + 0.05, 'iron', 'iron', W1); B.box(tx - 0.02, vy + 0.16, tz - 0.012, tx + 0.05, vy + 0.22, tz + 0.012, 'chim', 'chim', [1.4, 1.1, 0.55]);
    if (v !== 2 || big) { const ca = [tx - 0.02, 0.92, tz + tr], cb = [tx - 0.02, 0.92, tz + tr + 0.38]; B.beam(ca, cb, 0.05, 'timber', TIMB); B.beam([tx - 0.02, 0.68, tz + tr], [cb[0], 0.92, cb[2] - 0.13], 0.035, 'timber', TIMB); B.cyl(cb[0], 0.85, cb[2] - 0.02, 0.03, 0.03, 0.02, 10, 'iron', W1);
      B.beam([cb[0], 0.86, cb[2] - 0.02], [cb[0], 0.52, cb[2] - 0.02], 0.008, 'hay', [0.9, 0.85, 0.7]); for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) B.beam([cb[0], 0.52, cb[2] - 0.02], [cb[0] + sx * 0.06, 0.44, cb[2] - 0.02 + sz * 0.06], 0.006, 'hay', [0.9, 0.85, 0.7]); crate(B, cb[0], 0.31, cb[2] - 0.02, 0.13); B.box(cb[0] - 0.04, 0.44, cb[2] - 0.05, cb[0] + 0.04, 0.47, cb[2] + 0.01, 'lumen', 'lumen', W1); }
    for (const [x0, x1, y, z] of [[-w / 2, w / 2, f1 + 0.08, d / 2 + 0.06], [-w2 / 2, w2 / 2, f2 + 0.07, d2 / 2 + 0.05]]) for (let k = 0; k < 6; k++) { const x = x0 + (k + 0.3 + (k * 0.37) % 0.4) * (x1 - x0) / 6; B.box(x - 0.05, y - 0.03, z - 0.04, x + 0.04 * (1 + k % 2), y - 0.005, z - 0.005, 'moss', 'moss', [0.7, 0.78, 0.55]); }
    finial(B, -w3 / 2 - 0.06, yr, 0, 0.2); B.cyl(w3 / 2 + 0.06, yr, 0, 0.012, 0.012, 0.2, 5, 'iron', W1); B.beam([w3 / 2, yr + 0.17, 0], [w3 / 2 + 0.12, yr + 0.17, 0], 0.012, 'iron', W1); B.beam([w3 / 2 + 0.06, yr + 0.17, -0.06], [w3 / 2 + 0.06, yr + 0.17, 0.06], 0.012, 'iron', W1);
    ladder(B, [w / 2 - 0.12, f1 + 0.1, d2 / 2 + 0.07], [w / 2 - 0.16, f2 + 0.06, d3 / 2 + 0.06], 0.04); if (v === 1) ladder(B, [-w / 2 + 0.16, f1 + 0.12, d2 / 2 + 0.07], [-w / 2 + 0.22, f2 + 0.07, d3 / 2 + 0.06], 0.04);
    if (big) { const bw = 0.7, bd = 0.36; B.with(0.12, 0, -d / 2 - bd / 2 + 0.02, 0, 1, () => { plinth(B, -bw / 2, bw / 2, -bd / 2, bd / 2, 0.1); B.walls(-bw / 2 + 0.01, bw / 2 - 0.01, -bd / 2 + 0.01, bd / 2, 0.1, 0.48, 'plaster', 0.9, 0.82); hipRoof(B, { x0: -bw / 2, x1: bw / 2, z0: -bd / 2, z1: bd / 2 + 0.04, ye: 0.48, yr: 0.72, ov: 0.08 });
        B.with(0, 0, 0, Math.PI, 1, () => { halfTimber(B, bw, bd / 2, 0.1, 0.48, { n: 4 }); for (const x of [-0.2, 0.0, 0.2]) windowOn(B, bd / 2, x, 0.2, 0.09, 0.15, { arch: true, shut: SHUT[(v + 1) % 4] }); }); });
      for (const a of [0.6, 2.2]) B.with(tx, 0, tz, a, 1, () => { B.beam([0, 1.02, tr], [0, 1.02, tr + 0.08], 0.012, 'iron', W1); B.quad([-0.04, 0.72, tr + 0.08], [0.04, 0.72, tr + 0.08], [0.04, 1.01, tr + 0.08], [-0.04, 1.01, tr + 0.08], 'cloth', W1, [0.5, 0, 0.66, 1]); B.quad([0.04, 0.72, tr + 0.08], [-0.04, 0.72, tr + 0.08], [-0.04, 1.01, tr + 0.08], [0.04, 1.01, tr + 0.08], 'cloth', W1, [0.5, 0, 0.66, 1]); }); } }
  /* ---------- Heartwood seat houses: tall narrow timber houses with steep red roofs, finials and a dormer, built for the tree's platforms ---------- */
  function seat(B, v) { const w = 0.62, d = 0.56, h0 = 0.08, h1 = 0.5, h2 = 0.86, yr = h2 + 0.5, sh = SHUT[v % 4];
    B.walls(-w / 2, w / 2, -d / 2, d / 2, h0, h1, 'plaster', 0.9, 0.85); B.box(-w / 2 - 0.03, h1, -d / 2 - 0.03, w / 2 + 0.03, h1 + 0.04, d / 2 + 0.03, 'timber', 'timber', TIMB, 0, true); B.walls(-w / 2 - 0.03, w / 2 + 0.03, -d / 2 - 0.03, d / 2 + 0.03, h1 + 0.04, h2, 'plaster', 0.9, 0.85);
    gableRoof(B, { x0: -w / 2 - 0.03, x1: w / 2 + 0.03, z0: -d / 2 - 0.03, z1: d / 2 + 0.03, ye: h2, yr, ox: 0.07, oz: 0.09, frame: true }); chimney(B, v ? -0.16 : 0.18, -0.12, h2, yr + 0.06, 0.11);
    if (!B.det) { doorOn(B, d / 2, 0, 0.18, 0.34, { y0: h0 }); windowOn(B, d / 2 + 0.03, 0, h1 + 0.1, 0.11, 0.15, {}); return; }
    wallFace(B, w, d, (L, z, f) => { halfTimber(B, L, z, h0, h1, { n: 3, skip: f === 'f' ? (x) => Math.abs(x) < 0.12 : null }); halfTimber(B, L + 0.06, z + 0.03, h1 + 0.04, h2 - (f === 'f' || f === 'b' ? 0.07 : 0), { n: 3 }); if (f !== 'f') windowOn(B, z, 0, h0 + 0.17, 0.11, 0.16, { shut: f === 'r' ? sh : null }); windowOn(B, z + 0.03, f === 'f' ? 0 : -0.1, h1 + 0.1, 0.11, 0.15, { flowers: f === 'f', shut: f === 'f' ? sh : null }); });
    doorOn(B, d / 2, 0, 0.17, 0.32, { y0: h0, porch: true, porchD: 0.14, steps: 0 }); lantern(B, -0.17, h0 + 0.3, d / 2, 1); lantern(B, 0.17, h0 + 0.3, d / 2, 1);
    finial(B, -w / 2 - 0.09, yr, 0, 0.26); finial(B, w / 2 + 0.09, yr, 0, 0.22);
    const k = (yr - h2) / (d / 2 + 0.03), x = 0.0, zf = d / 2 - 0.0, y0 = h2 + k * (d / 2 + 0.03 - zf), zb = zf - 0.22, dw = 0.07, yr2 = y0 + 0.24;
    if (v !== 1) { B.box(x - dw, y0 - 0.05, zb, x + dw, y0 + 0.13, zf, 'plaster', null, [0.9, 0.9, 0.9]); windowOn(B, zf, x, y0, 0.08, 0.1, {}); B.slope([x + dw + 0.025, y0 + 0.12, zf + 0.025], [x + dw + 0.025, y0 + 0.12, zb], [x, yr2, zf + 0.025], [x, yr2, zb], { cw: 0.05, seg: 0.3 }); B.slope([x - dw - 0.025, y0 + 0.12, zb], [x - dw - 0.025, y0 + 0.12, zf + 0.025], [x, yr2, zb], [x, yr2, zf + 0.025], { cw: 0.05, seg: 0.3 }); B.tri([x - dw, y0 + 0.13, zf], [x + dw, y0 + 0.13, zf], [x, yr2 - 0.02, zf], 'plaster', [0.9, 0.9, 0.9]); B.ridge([x, yr2 + 0.01, zf + 0.03], [x, yr2 + 0.01, zb], 0.022); }
    barrel(B, w / 2 - 0.02, h0, d / 2 + 0.1, 0.045, 0.11); if (v) crate(B, -w / 2 + 0.06, h0, d / 2 + 0.1, 0.09, 0.3); }
  // tier -> builder: 0/1 hut, 2/3 cottage, 4/5 townhouse, 6/7 workshop (odd tiers are the grown-up version of the even one)
  const TIERS = [(B, v) => hut(B, v, false), (B, v) => hut(B, v, true), (B, v) => cottage(B, v, false), (B, v) => cottage(B, v, true), (B, v) => townhouse(B, v, false), (B, v) => townhouse(B, v, true), (B, v) => workshop(B, v, false), (B, v) => workshop(B, v, true)];
  const VARIANTS = 3, KEYS = []; for (let t = 0; t < 8; t++) for (let v = 0; v < VARIANTS; v++) KEYS.push('h' + t + 'abc'[v]);
  function material() { if (!atlas) atlas = paintAtlas(); return new THREE.MeshLambertMaterial({ map: atlas.T, vertexColors: true, emissive: 0xffb060, emissiveMap: atlas.TE, emissiveIntensity: 0 }); }
  function build(fn, v, lod) { const B = Builder(lod === 0, 1000 + v * 77); if (v === 1) B.with(0, 0, 0, 0, 1, () => fn(B, v), true); else fn(B, v); return B; }
  function houses() { const out = {}, mat = material(); const add = (key, fn, v) => { const b0 = build(fn, v, 0), b1 = build(fn, v, 1); out[key] = { geos: [b0.geo(), b1.geo()], mat, tree: false, chim: b0.chim, lamps: b0.lamps }; };
    for (let t = 0; t < 8; t++) for (let v = 0; v < VARIANTS; v++) add('h' + t + 'abc'[v], TIERS[t], v);
    for (let v = 0; v < 2; v++) add('seat' + 'ab'[v], seat, v); return out; }
  function keyFor(tier, seed) { return 'h' + Math.max(0, Math.min(7, tier)) + 'abc'[Math.floor(Math.abs(seed) * VARIANTS) % VARIANTS]; }
  /* ---------- trees: painterly broadleaf (forked limbs ending in clumped cauliflower florets, like the Heartwood),
     rim willows with hanging strands, and layered conifers for the high ground ---------- */
  let treeAtlas = null;
  function paintTreeAtlas() { const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512; const g = cv.getContext('2d'); const r = rng(3);
    // bark (u 0..0.25): grey-brown ridged bark with mossy streaks
    g.fillStyle = '#6e5a48'; g.fillRect(0, 0, 256, 512); for (let k = 0; k < 220; k++) { const x = r() * 256, w = 2 + r() * 7; g.strokeStyle = r() < 0.55 ? `rgba(${36 + r() * 20 | 0},${28 + r() * 14 | 0},${20},.55)` : `rgba(${150 + r() * 40 | 0},${132 + r() * 30 | 0},${108 + r() * 20 | 0},.4)`; g.lineWidth = w; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (r() - 0.5) * 30, 170, x + (r() - 0.5) * 30, 340, x + (r() - 0.5) * 16, 512); g.stroke(); }
    for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(${90 + r() * 30 | 0},${116 + r() * 30 | 0},${48},.35)`; g.beginPath(); g.ellipse(r() * 256, r() * 512, 4 + r() * 10, 12 + r() * 40, 0, 0, 6.3); g.fill(); }
    // foliage (u 0.25..1): dense painterly leaf strokes, olive to sunlit yellow-green
    g.fillStyle = '#5f7334'; g.fillRect(256, 0, 768, 512); for (let i = 0; i < 9000; i++) { const x = 256 + r() * 768, y = r() * 512, rr = 3 + r() * 7, k = r(), a = r() * 6.283;
      g.fillStyle = k < 0.24 ? `rgba(${36 + r() * 20 | 0},${56 + r() * 20 | 0},${26 + r() * 10 | 0},.85)` : k < 0.7 ? `rgba(${112 + r() * 30 | 0},${136 + r() * 26 | 0},${54 + r() * 18 | 0},.85)` : k < 0.93 ? `rgba(${156 + r() * 28 | 0},${172 + r() * 22 | 0},${78 + r() * 24 | 0},.85)` : `rgba(${204 + r() * 28 | 0},${206 + r() * 20 | 0},${118 + r() * 30 | 0},.8)`;
      g.beginPath(); g.ellipse(x, y, rr, rr * 0.5, a, 0, 6.3); g.fill(); g.strokeStyle = 'rgba(30,44,20,.3)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - Math.cos(a) * rr, y - Math.sin(a) * rr); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); g.stroke(); }
    const T = new THREE.CanvasTexture(cv); T.encoding = THREE.sRGBEncoding; T.anisotropy = 8; return T; }
  function TBuilder() { const B = { p: [], n: [], uv: [], c: [], i: [] }; B.v = (x, y, z, nx, ny, nz, u, v, c) => { B.p.push(x, y, z); B.n.push(nx, ny, nz); B.uv.push(u, v); B.c.push(c[0], c[1], c[2]); return B.p.length / 3 - 1; };
    B.geo = () => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(B.uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(B.c, 3)); g.setIndex(B.i); g.computeBoundingSphere(); return g; }; return B; }
  const BARK = (u, v) => [u * 0.24 + 0.005, v], LEAF = (u, v) => [0.26 + u * 0.72, v];
  // a tapered limb along a polyline (smooth rings), bark-textured, darker at the base
  function limb(B, pts, r0, r1, n, dark) { const N = pts.length, rings = []; let vacc = 0;
    for (let i = 0; i < N; i++) { const p = pts[i], q = pts[Math.min(N - 1, i + 1)], o = pts[Math.max(0, i - 1)], d = new THREE.Vector3(q[0] - o[0], q[1] - o[1], q[2] - o[2]).normalize(), up = Math.abs(d.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0), a = new THREE.Vector3().crossVectors(d, up).normalize(), b = new THREE.Vector3().crossVectors(a, d);
      if (i) vacc += Math.hypot(p[0] - o[0], p[1] - o[1], p[2] - o[2]); const t = i / (N - 1), rr = r0 + (r1 - r0) * t, sh = (dark || 0.75) + (1 - (dark || 0.75)) * t, base = B.p.length / 3; rings.push(base);
      for (let k = 0; k <= n; k++) { const ang = k / n * Math.PI * 2, nx = a.x * Math.cos(ang) + b.x * Math.sin(ang), ny = a.y * Math.cos(ang) + b.y * Math.sin(ang), nz = a.z * Math.cos(ang) + b.z * Math.sin(ang); const [u, v] = BARK(k / n, (vacc * 3) % 1); B.v(p[0] + nx * rr, p[1] + ny * rr, p[2] + nz * rr, nx, ny, nz, u, v, [sh, sh * 0.98, sh * 0.94]); } }
    for (let i = 0; i < N - 1; i++) for (let k = 0; k < n; k++) { const a0 = rings[i] + k, b0 = rings[i + 1] + k; B.i.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1); } }
  const curve = (a, b, c, n) => { const out = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1], u * u * a[2] + 2 * u * t * b[2] + t * t * c[2]]); } return out; };
  // one leafy floret: a lumpy ball (cauliflower bumps), sunlit on top, dark olive underneath; hue tints the whole clump
  function floret(B, cx, cy, cz, rx, ry, rz, det, seed, hue, light) { const g = new THREE.IcosahedronGeometry(1, det), P = g.attributes.position, r = rng(seed), ph = [r() * 10, r() * 10, r() * 10], map = new Map(), idx = [];
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), key = (x * 1e4 | 0) + ',' + (y * 1e4 | 0) + ',' + (z * 1e4 | 0); let j = map.get(key);
      if (j == null) { const nn = 1 + 0.17 * Math.sin(x * 5.3 + ph[0]) * Math.sin(y * 4.7 + ph[1]) * Math.sin(z * 5.1 + ph[2]) + 0.09 * Math.sin(x * 11 + y * 9 + ph[0]) + 0.05 * Math.sin(x * 19 + z * 17 + ph[2]);
        const yy = y > 0 ? y : y * 0.6, t = Math.min(1, Math.max(0, (y + 0.8) / 1.7)), sh = (0.34 + 0.86 * Math.pow(t, 1.2)) * light * (0.94 + r() * 0.12);
        const [u, v] = LEAF((Math.atan2(z, x) / Math.PI + 1) / 2 * 0.98 + 0.01, (y + 1) / 2 * 0.98 + 0.01); j = B.v(cx + x * nn * rx, cy + yy * nn * ry, cz + z * nn * rz, x, y * 0.9 + 0.1, z, u, v, [sh * hue[0] * (1 + 0.1 * t), sh * hue[1], sh * hue[2] * (1 - 0.15 * t)]); map.set(key, j); } idx.push(j); }
    for (let i = 0; i < idx.length; i += 3) B.i.push(idx[i], idx[i + 1], idx[i + 2]); }
  const HUES = [[0.86, 0.92, 0.66], [1.0, 1.04, 0.72], [0.8, 0.88, 0.7], [1.08, 1.06, 0.66]];
  // a clump of florets around a branch tip: one big one with smaller ones tucked round and under it
  function clump(B, c, s, lod, r, hue, flat) { const n = lod ? 1 : 3 + (r() * 3 | 0), fy = flat ? 0.62 : 0.78; floret(B, c[0], c[1], c[2], s, s * fy, s, lod ? 1 : 1, (r() * 1e6) | 0, hue, 1.0);
    if (!lod) for (let k = 0; k < n; k++) { const a = r() * 6.283, d = s * (0.55 + r() * 0.35), ss = s * (0.5 + r() * 0.3); floret(B, c[0] + Math.cos(a) * d, c[1] - s * (0.15 + r() * 0.35), c[2] + Math.sin(a) * d, ss, ss * fy, ss, 1, (r() * 1e6) | 0, hue, 0.92); } }
  function broadleaf(lod, droop, seed) { const B = TBuilder(), r = rng(seed || (droop ? 23 : 17)), lean = droop ? 0.06 : 0.02;
    const top = [lean, 0.36, 0.01]; limb(B, curve([0, -0.06, 0], [0.0, 0.18, 0], top, lod ? 2 : 5), 0.088, 0.05, lod ? 5 : 9, 0.6);
    if (!lod) for (let k = 0; k < 5; k++) { const a = k * 1.256 + r() * 0.5; limb(B, curve([0, 0.05, 0], [Math.cos(a) * 0.08, 0.0, Math.sin(a) * 0.08], [Math.cos(a) * 0.15, -0.05, Math.sin(a) * 0.15], 3), 0.035, 0.008, 5, 0.55); }
    const nb = lod ? 4 : 5 + (r() * 2 | 0), tips = [];
    for (let k = 0; k < nb; k++) { const a = k / nb * 6.283 + r() * 0.6, out = droop ? 0.32 + r() * 0.08 : 0.27 + r() * 0.1, h = droop ? 0.6 + r() * 0.08 : 0.56 + r() * 0.16, tip = [top[0] + Math.cos(a) * out, h, top[2] + Math.sin(a) * out];
      tips.push(tip); if (!lod) { limb(B, curve(top, [top[0] + Math.cos(a) * out * 0.35, top[1] + 0.14, top[2] + Math.sin(a) * out * 0.35], tip, 4), 0.034, 0.012, 6, 0.7);
        const mid = curve(top, [top[0] + Math.cos(a) * out * 0.35, top[1] + 0.14, top[2] + Math.sin(a) * out * 0.35], tip, 4)[2], a2 = a + (r() - 0.5) * 1.6; limb(B, [mid, [mid[0] + Math.cos(a2) * 0.1, mid[1] + 0.09, mid[2] + Math.sin(a2) * 0.1]], 0.014, 0.005, 4, 0.8); } }
    tips.push([top[0], droop ? 0.72 : 0.8, top[2]]);
    for (const [k, t] of tips.entries()) { const hue = HUES[(k + (seed || 0)) % HUES.length], s = (k === tips.length - 1 ? 0.22 : 0.16 + r() * 0.05) * (lod ? 1.35 : 1); clump(B, t, s, lod, r, hue, droop); }
    if (!lod) for (let k = 0; k < 6; k++) { const a = r() * 6.283, d = 0.12 + r() * 0.1; floret(B, top[0] + Math.cos(a) * d, 0.56 + r() * 0.12, top[2] + Math.sin(a) * d, 0.1, 0.08, 0.1, 1, (r() * 1e6) | 0, HUES[k % 4], 0.8); }
    if (droop && !lod) for (let k = 0; k < 34; k++) { const t = tips[k % (tips.length - 1)], a = r() * 6.283, rr = 0.08 + r() * 0.12, x = t[0] + Math.cos(a) * rr, z = t[2] + Math.sin(a) * rr, y = t[1] - 0.05 - r() * 0.05, L = 0.14 + r() * 0.32, sw = 0.007 + r() * 0.008, nx = Math.cos(a), nz = Math.sin(a), lt = 0.8 + r() * 0.5, c0 = [0.46 * lt, 0.58 * lt, 0.32 * lt], c1 = [0.8 * lt, 0.9 * lt, 0.52 * lt];
      const b0 = B.p.length / 3; for (const [dx, dy, dz, c] of [[-sw * nz, 0, sw * nx, c0], [sw * nz, 0, -sw * nx, c0], [sw * 0.15 * nz + nx * 0.04, -L, -sw * 0.15 * nx + nz * 0.04, c1], [-sw * 0.15 * nz + nx * 0.04, -L, sw * 0.15 * nx + nz * 0.04, c1]]) B.v(x + dx, y + dy, z + dz, nx, 0.3, nz, ...LEAF(0.2 + r() * 0.6, dy ? 0.1 : 0.5), c); B.i.push(b0, b0 + 1, b0 + 2, b0, b0 + 2, b0 + 3); }
    return B.geo(); }
  function conifer(lod) { const B = TBuilder(), r = rng(11), tiers = lod ? 5 : 11; limb(B, [[0, -0.06, 0], [0.005, 0.5, 0], [0.01, 0.95, 0]], 0.055, 0.012, lod ? 5 : 7, 0.6);
    for (let t = 0; t < tiers; t++) { const f = t / (tiers - 1), y0 = 0.12 + f * 0.78, y1 = y0 + (lod ? 0.26 : 0.19) - f * 0.06, rad = 0.36 * Math.pow(1 - f, 0.9) + 0.025, n = lod ? 7 : 16, sh = 0.5 + f * 0.55, rot = r() * 6.28;
      const ring = []; for (let k = 0; k <= n; k++) { const kk = k % n, a = kk / n * Math.PI * 2 + rot, long = kk % 2 === 0, rr = rad * (long ? 1.05 : 0.7) * (0.85 + r() * 0.3), dy = long ? -0.04 - r() * 0.035 : 0.012; ring.push([Math.cos(a) * rr, y0 + dy, Math.sin(a) * rr]); } ring[n] = ring[0];
      const tipI = B.v(0, y1, 0, 0, 1, 0, ...LEAF(0.5, 1), [sh * 0.8, sh, sh * 0.68]);
      const rI = ring.map(([x, y, z], k) => { const l = Math.hypot(x, z) || 1, dk = k % 2 ? 0.78 : 1.0, lit = 0.9 + 0.2 * Math.max(0, x / l); return B.v(x, y, z, x / l * 0.75, 0.66, z / l * 0.75, ...LEAF(k / n, 0), [sh * 0.46 * dk * lit, sh * 0.6 * dk * lit, sh * 0.4 * dk * lit]); });
      for (let k = 0; k < n; k++) B.i.push(rI[k], tipI, rI[k + 1]); const ci = B.v(0, y0 + 0.03, 0, 0, -1, 0, ...LEAF(0.5, 0.5), [0.18, 0.24, 0.16]); for (let k = 0; k < n; k++) B.i.push(rI[k + 1], ci, rI[k]); }
    return B.geo(); }
  function trees() { if (!treeAtlas) treeAtlas = paintTreeAtlas(); const mat = new THREE.MeshLambertMaterial({ map: treeAtlas, vertexColors: true, side: THREE.DoubleSide });
    return { oak: { geos: [broadleaf(0, false, 17), broadleaf(1, false, 17)], mat, tree: true }, willow: { geos: [broadleaf(0, true, 23), broadleaf(1, true, 23)], mat, tree: true }, sequoia: { geos: [conifer(0), conifer(1)], mat, tree: true } }; }
  return { houses, trees, keyFor, KEYS, atlas: () => atlas, kit: { Builder, material, gableRoof, windowOn, doorOn, lantern, chimney, crate, barrel, sack, woodpile, pickaxe, rope, pot, plinth, halfTimber, wallFace, sideX, SHUT } };
})();

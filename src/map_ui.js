
/* =====================================================================
   RIM CITY — camera, tiles, frame loop, input, cards, ticker, minimap
   ===================================================================== */
const CityMap = (() => {
  let cv, ctx, mm, mctx, wrap, dpr = 1, Wc = 0, Hc = 0, running = false, raf = 0;
  const cam = { x: 0, y: 0, z: CITY.startZoom, vx: 0, vy: 0, fly: null };
  const tiles = new Map(); let tileUse = 0;
  const ptrs = new Map(); let gesture = null;
  let tickerI = 0, tickerT = 0, lastFrame = 0, fps = 60, frameN = 0, mmBase = null;
  const bubbles = new Map(); // npc id -> {text, until}
  const glowCache = new Map();
  const st = { tilesRendered: 0, frames: 0, lastDraw: 0 };

  function glowSprite(col) {
    if (glowCache.has(col)) return glowCache.get(col);
    const g = document.createElement('canvas'); g.width = g.height = 64; const x = g.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, col); gr.addColorStop(0.35, col.replace(/[\d.]+\)$/, '0.35)')); gr.addColorStop(1, col.replace(/[\d.]+\)$/, '0)')); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); glowCache.set(col, g); return g;
  }
  const glow = (c, x, y, r, col, a) => { c.globalAlpha = a; c.drawImage(glowSprite(col), x - r, y - r, r * 2, r * 2); c.globalAlpha = 1; };

  /* ---------- setup ---------- */
  function mount() {
    wrap = $('#city'); cv = $('#cityCanvas'); ctx = cv.getContext('2d'); mm = $('#miniMap'); mctx = mm.getContext('2d');
    if (!W.ready) generateCity();
    if (!S.cityCam) { cam.x = W.player.x; cam.y = W.player.y; cam.z = CITY.startZoom; } else Object.assign(cam, S.cityCam, { vx: 0, vy: 0, fly: null });
    cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp);
    cv.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.offsetX, e.offsetY, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
    mm.addEventListener('pointerdown', (e) => { e.stopPropagation(); const r = mm.getBoundingClientRect(); const s = (CITY.R * 2) / r.width; flyTo((e.clientX - r.left) * s - CITY.R, (e.clientY - r.top) * s - CITY.R, Math.max(cam.z, 0.35)); });
    wrap.addEventListener('click', (e) => { const b = e.target.closest('[data-city]'); if (b) cityButton(b.dataset.city); });
    window.addEventListener('resize', resize);
    $('#cityCount').textContent = `· ${W.homes.length.toLocaleString()} ${CITY.homeTerm}s`;
    buildLegend(); buildMinimapBase(); resize();
    mount.done = true;
  }
  function layout() { const top = $('#top').offsetHeight, bot = $('#tabs').offsetHeight; wrap.style.top = top + 'px'; wrap.style.bottom = bot + 'px'; }
  function resize() { if (!cv) return; layout(); dpr = Math.min(window.devicePixelRatio || 1, 2); const r = wrap.getBoundingClientRect(); Wc = Math.max(1, Math.round(r.width * dpr)); Hc = Math.max(1, Math.round(r.height * dpr)); if (cv.width !== Wc || cv.height !== Hc) { cv.width = Wc; cv.height = Hc; } cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px'; }
  function showLoader(p) { const L = $('#cityLoader'); if (!L) return; L.classList.toggle('hidden', p == null); if (p != null) { L.querySelector('i').style.width = Math.round(p * 100) + '%'; L.querySelector('.ldPct').textContent = Math.round(p * 100) + '%'; } }
  function show() {
    if (!ART.ready) { wrap = $('#city'); wrap.classList.remove('hidden'); layout(); showLoader(ART.progress || 0); loadArt((p) => showLoader(p), (ok) => { showLoader(null); if (!ok) console.warn('Rim City art failed to load; using the procedural painter'); tiles.clear(); if (ui.tab === 'city') show(); }); return; }
    if (!mount.done) mount(); wrap.classList.remove('hidden'); layout(); resize(); if (!running) { running = true; lastFrame = performance.now(); raf = requestAnimationFrame(frame); } }
  function hide() { if (wrap) wrap.classList.add('hidden'); running = false; cancelAnimationFrame(raf); if (mount.done) S.cityCam = { x: cam.x, y: cam.y, z: cam.z }; }

  /* ---------- camera ---------- */
  const kpx = () => cam.z * dpr;
  function s2w(sx, sy) { return [cam.x + (sx * dpr - Wc / 2) / kpx(), cam.y + (sy * dpr - Hc / 2) / kpx()]; }
  function w2s(x, y) { return [((x - cam.x) * kpx() + Wc / 2) / dpr, ((y - cam.y) * kpx() + Hc / 2) / dpr]; }
  function clampCam() { cam.z = clamp(cam.z, CITY.zoomMin, CITY.zoomMax); const r = Math.hypot(cam.x, cam.y), m = CITY.R + 200; if (r > m) { cam.x *= m / r; cam.y *= m / r; } }
  function zoomAt(sx, sy, f) { const [wx, wy] = s2w(sx, sy); cam.z = clamp(cam.z * f, CITY.zoomMin, CITY.zoomMax); const [nx, ny] = s2w(sx, sy); cam.x += wx - nx; cam.y += wy - ny; cam.fly = null; clampCam(); }
  function flyTo(x, y, z, now) { if (now) { cam.x = x; cam.y = y; if (z) cam.z = z; cam.fly = null; cam.vx = cam.vy = 0; clampCam(); return; } cam.fly = { x0: cam.x, y0: cam.y, z0: cam.z, x, y, z: z || cam.z, t0: performance.now(), d: 900 }; }

  /* ---------- input ---------- */
  function onDown(e) { if (e.isPrimary) ptrs.clear(); try { cv.setPointerCapture(e.pointerId); } catch (_) { /* synthetic */ } ptrs.set(e.pointerId, { x: e.offsetX, y: e.offsetY, x0: e.offsetX, y0: e.offsetY, t0: performance.now() }); cam.vx = cam.vy = 0; cam.fly = null;
    gesture = ptrs.size === 1 ? { tap: true } : { tap: false, pinch: pinchState() }; }
  function pinchState() { const p = [...ptrs.values()]; return { d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), mx: (p[0].x + p[1].x) / 2, my: (p[0].y + p[1].y) / 2 }; }
  function onMove(e) { const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.offsetX - p.x, dy = e.offsetY - p.y; p.x = e.offsetX; p.y = e.offsetY;
    if (ptrs.size === 1) { if (Math.hypot(p.x - p.x0, p.y - p.y0) > 8) gesture.tap = false; cam.x -= dx / cam.z; cam.y -= dy / cam.z; cam.vx = -dx / cam.z; cam.vy = -dy / cam.z; clampCam(); }
    else if (ptrs.size === 2 && gesture && gesture.pinch) { const n = pinchState(); zoomAt(n.mx, n.my, n.d / Math.max(1, gesture.pinch.d)); cam.x -= (n.mx - gesture.pinch.mx) / cam.z; cam.y -= (n.my - gesture.pinch.my) / cam.z; gesture.pinch = n; clampCam(); } }
  function onUp(e) { const p = ptrs.get(e.pointerId); ptrs.delete(e.pointerId);
    if (p && gesture && gesture.tap && ptrs.size === 0 && performance.now() - p.t0 < 600) { cam.vx = cam.vy = 0; handleTap(e.offsetX, e.offsetY); }
    if (ptrs.size === 1) gesture = { tap: false }; if (ptrs.size === 0) gesture = null; }

  /* ---------- tiles ---------- */
  let curL = 0;
  // hysteresis so a pinch hovering near a threshold doesn't flip between cache levels every frame
  function levelFor() { const want = cam.z * dpr; if (curL && curL >= want * 0.7 && curL <= want * 2.2) return curL; let pick = CITY.levels[CITY.levels.length - 1]; for (const L of CITY.levels) if (L >= want * 0.8) { pick = L; break; } curL = pick; return pick; }
  function tileKey(L, tx, ty) { return L + ':' + tx + ':' + ty; }
  function renderTile(L, tx, ty) { const c = document.createElement('canvas'); c.width = c.height = CITY.tilePx; const g = c.getContext('2d'); const ws = CITY.tilePx / L; g.setTransform(L, 0, 0, L, -tx * ws * L, -ty * ws * L); drawStatic(g, tx * ws, ty * ws, (tx + 1) * ws, (ty + 1) * ws, L); st.tilesRendered++; return c; }
  function getTile(L, tx, ty, full) { const t = tiles.get(tileKey(L, tx, ty)); if (t) t.u = ++tileUse; return t ? (full ? t : t.c) : null; }
  function putTile(L, tx, ty, c) { tiles.set(tileKey(L, tx, ty), { c, u: ++tileUse, born: performance.now() }); if (tiles.size > CITY.maxTiles) { const arr = [...tiles.entries()].sort((a, b) => a[1].u - b[1].u); for (let i = 0; i < 20; i++) tiles.delete(arr[i][0]); } }
  const FADE_MS = 220;
  function drawTiles(c, vx0, vy0, vx1, vy1) {
    const L = levelFor(), ws = CITY.tilePx / L, need = [], now = performance.now();
    const k = kpx();
    for (let tx = Math.floor(vx0 / ws); tx <= Math.floor(vx1 / ws); tx++) for (let ty = Math.floor(vy0 / ws); ty <= Math.floor(vy1 / ws); ty++) {
      const dx = (tx * ws - cam.x) * k + Wc / 2, dy = (ty * ws - cam.y) * k + Hc / 2, ds = ws * k;
      const te = getTile(L, tx, ty, true), age = te ? now - te.born : 1e9;
      if (te && age >= FADE_MS) { c.drawImage(te.c, dx, dy, ds + 0.6, ds + 0.6); continue; }
      if (!te) need.push([tx, ty, Math.hypot(tx * ws + ws / 2 - cam.x, ty * ws + ws / 2 - cam.y)]); else st.fading = now + FADE_MS;
      // fallback: whatever else is cached for this spot (finer first, then coarser), kept on screen until the new tile has faded in
      let drewFb = false;
      for (const L2 of CITY.levels.filter((l) => l > L)) { const ws2 = CITY.tilePx / L2, f = ws / ws2; let all = true; for (let a = 0; a < f && all; a++) for (let b2 = 0; b2 < f; b2++) if (!tiles.has(tileKey(L2, tx * f + a, ty * f + b2))) { all = false; break; }
        if (all && f <= 4) { for (let a = 0; a < f; a++) for (let b2 = 0; b2 < f; b2++) c.drawImage(getTile(L2, tx * f + a, ty * f + b2), dx + (a * ds) / f, dy + (b2 * ds) / f, ds / f + 0.6, ds / f + 0.6); drewFb = true; break; } }
      if (!drewFb) for (const L2 of CITY.levels.filter((l) => l < L).reverse()) { const ws2 = CITY.tilePx / L2, px = Math.floor(tx * ws / ws2), py = Math.floor(ty * ws / ws2), t2 = getTile(L2, px, py);
        if (t2) { const sx = ((tx * ws - px * ws2) / ws2) * CITY.tilePx, sy = ((ty * ws - py * ws2) / ws2) * CITY.tilePx, ss = (ws / ws2) * CITY.tilePx; c.drawImage(t2, sx, sy, ss, ss, dx, dy, ds + 0.6, ds + 0.6); drewFb = true; break; } }
      if (te) { c.globalAlpha = drewFb ? Math.min(1, age / FADE_MS) : 1; c.drawImage(te.c, dx, dy, ds + 0.6, ds + 0.6); c.globalAlpha = 1; }
    }
    need.sort((a, b) => a[2] - b[2]);
    const t0 = performance.now();
    for (const [tx, ty] of need) { if (performance.now() - t0 > 9) break; putTile(L, tx, ty, renderTile(L, tx, ty)); }
    if (!need.length) { // prewarm the coarse levels for instant zoom-outs
      for (const L2 of [0.015625, 0.03125]) { const ws2 = CITY.tilePx / L2, n = Math.ceil((CITY.R + 300) / ws2); for (let tx = -n; tx < n; tx++) for (let ty = -n; ty < n; ty++) if (!tiles.has(tileKey(L2, tx, ty))) { putTile(L2, tx, ty, renderTile(L2, tx, ty)); return need.length; } }
    }
    return need.length;
  }

  /* ---------- frame ---------- */
  const dwell = { ri: -1, t: 0 };
  function frame(now) {
    if (!running) return; raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - lastFrame) / 1000); lastFrame = now; fps = fps * 0.95 + (1 / Math.max(dt, 0.001)) * 0.05; frameN++;
    if (cam.fly) { const u = clamp((now - cam.fly.t0) / cam.fly.d, 0, 1), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; cam.x = cam.fly.x0 + (cam.fly.x - cam.fly.x0) * e; cam.y = cam.fly.y0 + (cam.fly.y - cam.fly.y0) * e; cam.z = cam.fly.z0 * Math.pow(cam.fly.z / cam.fly.z0, e); if (u >= 1) cam.fly = null; }
    else if (!ptrs.size && (Math.abs(cam.vx) > 0.05 || Math.abs(cam.vy) > 0.05)) { cam.x += cam.vx; cam.y += cam.vy; cam.vx *= 0.92; cam.vy *= 0.92; clampCam(); }
    // exploration: lingering zoomed-in over a land maps it
    if (cam.z > 0.42 && !cam.fly && Math.hypot(cam.x, cam.y) < CITY.R && hollowDist(cam.x, cam.y) > 0) { const ri = regionAt(cam.x, cam.y); if (ri === dwell.ri) { dwell.t += dt; if (dwell.t > 2.5 && discoverRegion(ri)) buildLegend(); } else { dwell.ri = ri; dwell.t = 0; } } else dwell.t = 0;
    const t = now / 1000, c = ctx, k = kpx();
    const vx0 = cam.x - Wc / 2 / k, vy0 = cam.y - Hc / 2 / k, vx1 = cam.x + Wc / 2 / k, vy1 = cam.y + Hc / 2 / k;
    c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = `rgb(${FOG.join(',')})`; c.fillRect(0, 0, Wc, Hc);
    drawTiles(c, vx0, vy0, vx1, vy1);
    c.setTransform(k, 0, 0, k, Wc / 2 - cam.x * k, Hc / 2 - cam.y * k);
    const view = { x0: vx0 - 60, y0: vy0 - 60, x1: vx1 + 60, y1: vy1 + 60 }, inV = (x, y, m) => x > view.x0 - (m || 0) && x < view.x1 + (m || 0) && y > view.y0 - (m || 0) && y < view.y1 + (m || 0);
    if (ART.ok) drawHollowDepth(c, t, inV, cam.x, cam.y, cam.z, nightFactor(), glow);
    drawLife(c, t, view, inV);
    c.setTransform(1, 0, 0, 1, 0, 0);
    drawOverlay(c, t, view, inV);
    if (frameN % 4 === 0) drawMinimap();
    if (t - tickerT > 7 || !tickerT) { tickerT = t; updateTicker(); }
    if (frameN % 15 === 0) updateInfo(t);
    st.frames++; st.lastDraw = now;
  }

  /* ---------- living layer (world space) ---------- */
  function drawLife(c, t, view, inV) {
    const z = cam.z, night = nightFactor(), fest = festival(), frost = frostLevel(), wx = weatherNow(t);
    const hollowVis = view.x1 > -900 && view.x0 < 900 && view.y1 > -900 && view.y0 < 900;
    // frost creeping over the bluffs (and later everything)
    if (frost > 0) { for (const o of W.frost) if (inV(o.x, o.y, 80)) glow(c, o.x, o.y, (o.r || 30) * (1 + frost), 'rgba(240,248,255,.9)', 0.55 * frost);
      if (frost > 0.6) for (const o of W.frostOthers) if (inV(o.x, o.y, 60)) glow(c, o.x, o.y, 40, 'rgba(240,248,255,.9)', 0.35 * (frost - 0.6) / 0.4); }
    // lake shimmer, boats, waterfall
    const L = W.lake;
    if (inV(L.x, L.y, 500)) {
      c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1.5; c.lineCap = 'round';
      for (let i = 0; i < 40; i++) { const a = hash1(i) * TAU, rr = Math.sqrt(hash1(i + 50)) * L.r * 0.85; const x = L.x + Math.cos(a) * rr, y = L.y + Math.sin(a) * rr; const al = 0.5 + 0.5 * Math.sin(t * 1.6 + i); c.globalAlpha = al * 0.7; c.beginPath(); c.moveTo(x - 6, y); c.quadraticCurveTo(x, y - 2, x + 6, y); c.stroke(); }
      c.globalAlpha = 1;
      for (const b of W.boats) { const a = b.ph + t * b.sp; const x = L.x + Math.cos(a) * L.r * b.ra, y = L.y + Math.sin(a) * L.r * b.ra * 0.8, h = a + Math.PI / 2;
        c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 1; c.beginPath(); c.arc(L.x, L.y, L.r * b.ra, a - 0.25, a - 0.02); c.stroke();
        if (ART.ok) { drawSprite(c, b.sail === CLOAKS[0] || b.sail === CLOAKS[2] ? 'props_1' : 'props_2', x, y + Math.sin(t * 1.4 + b.ph) * 0.8, 30, 0.5, 0.7, Math.cos(h) < 0); continue; }
        c.save(); c.translate(x, y); c.rotate(h); c.fillStyle = '#8a6440'; c.beginPath(); c.ellipse(0, 0, 8, 3.2, 0, 0, TAU); c.fill(); c.fillStyle = b.sail; c.beginPath(); c.moveTo(-1, 0); c.lineTo(4, -7); c.lineTo(5, 0); c.closePath(); c.fill(); c.restore(); }
    }
    const rv = W.river, end = rv[rv.length - 1];
    if (inV(end[0], end[1], 300)) { c.strokeStyle = 'rgba(255,255,255,.65)'; c.lineWidth = 2.5; c.lineCap = 'round'; const pr = rv[rv.length - 3];
      for (let i = 0; i < 14; i++) { const u = ((t * 0.6 + i / 14) % 1); const x = pr[0] + (end[0] - pr[0]) * u * 1.3 + Math.sin(i * 3) * 10, y = pr[1] + (end[1] - pr[1]) * u * 1.3 + Math.cos(i * 2) * 10; c.globalAlpha = 1 - u; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (end[0] - pr[0]) * 0.08, y + (end[1] - pr[1]) * 0.08); c.stroke(); }
      c.globalAlpha = 1; glow(c, end[0], end[1], 70 + Math.sin(t * 2) * 8, 'rgba(255,255,255,.9)', 0.45); }
    // Hollow: mist banks, peekers, lightning flash
    if (hollowVis) {
      if (!ART.ok) for (const m of W.mist) { const a = m.a + t * m.w, x = Math.cos(a) * m.r, y = Math.sin(a) * m.r; glow(c, x, y, m.size, 'rgba(220,230,255,.9)', m.al * (wx.type === 'mist' ? 1.6 : 1)); }
    }
    for (const p of W.peekers) { if (!inV(p.x, p.y, 30)) continue; const u = ((t + p.ph) % p.P) / p.P; if (u > 0.2) continue; const a = Math.sin((u / 0.2) * Math.PI);
      c.globalAlpha = a; c.fillStyle = 'rgba(10,8,20,.9)'; c.beginPath(); c.ellipse(p.x, p.y, 9, 6, 0, 0, TAU); c.fill();
      if (p.tent) { c.strokeStyle = 'rgba(40,30,60,.95)'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(p.x + 6, p.y); c.quadraticCurveTo(p.x + 14, p.y - 12 + Math.sin(t * 4) * 4, p.x + 20, p.y - 6 + Math.cos(t * 3) * 5); c.stroke(); }
      const blink = Math.sin(t * 7 + p.ph) > 0.92 ? 0.2 : 1; c.globalAlpha = a * blink; c.globalCompositeOperation = 'lighter'; const col = p.red ? 'rgba(255,90,70,1)' : 'rgba(255,240,150,1)';
      glow(c, p.x - 3, p.y - 1, 5, col, a * blink); glow(c, p.x + 3, p.y - 1, 5, col, a * blink); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; }
    // Tether lift cages & cranes
    for (const Lf of W.lifts) { const u = (Math.sin(t * Lf.speed * 2 + Lf.phase) + 1) / 2; const x = Lf.x + (Lf.bx - Lf.x) * u, y = Lf.y + (Lf.by - Lf.y) * u; if (!inV(x, y, 20)) continue;
      if (ART.ok && ART_MANIFEST.s.hollow_bits_4) { softShadow(c, x + 4, y + 3, 7, 3, 0.7); if (z > 0.5) drawPerson(c, x, y - 2, 0, '#555', SKIN[1], t, Lf.phase, { idle: true, h: 11 }); drawSprite(c, 'hollow_bits_4', x, y, 16, 0.5, 0.8, false, 0.92); continue; }
      c.fillStyle = '#6a4a2a'; c.fillRect(x - 5, y - 5, 10, 10); c.fillStyle = '#c9a070'; c.fillRect(x - 3.5, y - 3.5, 7, 7); if (z > 0.5) drawPerson(c, x, y, 0, CLOAKS[(Lf.phase * 10 | 0) % CLOAKS.length], SKIN[1], t, Lf.phase, {}); }
    for (const cr of W.cranes) { if (!inV(cr.x, cr.y, cr.len + 20)) continue; if (ART.ok) { c.save(); c.translate(cr.x, cr.y); c.rotate(Math.sin(t * 0.4 + cr.phase) * 0.03); softShadow(c, 8, 4, 26, 11, 0.8); drawSprite(c, 'civic_vault_2', 0, 0, 74, 0.38, 0.86, Math.cos(cr.ang) < 0); c.restore(); continue; } const ex = cr.x + Math.cos(cr.ang) * cr.len, ey = cr.y + Math.sin(cr.ang) * cr.len;
      c.strokeStyle = '#5a3e24'; c.lineWidth = 5; c.beginPath(); c.moveTo(cr.x, cr.y); c.lineTo(ex, ey); c.stroke(); c.fillStyle = '#7a5434'; c.fillRect(cr.x - 8, cr.y - 8, 16, 16);
      const u = (Math.sin(t * 0.4 + cr.phase) + 1) / 2, lx = cr.x + (ex - cr.x) * u, ly = cr.y + (ey - cr.y) * u, sw = Math.sin(t * 1.5 + cr.phase) * 4;
      c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(lx - 5 + sw + 6, ly - 5 + 9, 10, 10); c.fillStyle = '#b0844a'; c.fillRect(lx - 5 + sw, ly - 5, 10, 10); c.strokeStyle = '#3a2a1a'; c.lineWidth = 1; c.strokeRect(lx - 5 + sw, ly - 5, 10, 10); }
    // windmills, smoke, carts
    for (const m of W.windmills) { if (ART.ok || !inV(m.x, m.y, 30)) continue; c.save(); c.translate(m.x, m.y); c.rotate(t * 1.2 + m.seed * 10); c.fillStyle = '#f2ead6'; c.strokeStyle = '#7a5f3c'; c.lineWidth = 1;
      for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); c.fillRect(2, -2.5, 22, 5); c.strokeRect(2, -2.5, 22, 5); } c.restore(); c.fillStyle = '#7a5f3c'; c.beginPath(); c.arc(m.x, m.y, 3, 0, TAU); c.fill(); }
    if (z > 0.3) for (const v of W.vents) { if (!inV(v.x, v.y, 90)) continue; for (let k = 0; k < 5; k++) { const u = (t * 0.2 + k / 5 + v.seed) % 1; glow(c, v.x + u * 26 + Math.sin(u * 4 + v.seed * 9) * 5, v.y - v.r * 2 - u * 60, 5 + u * 18, 'rgba(110,100,100,.9)', Math.min(1, u * 6) * (1 - u) * 0.4); } }
    for (const ch of W.chimneys) { if (!inV(ch.x, ch.y, 80)) continue; for (let k = 0; k < 5; k++) { const u = (t * 0.25 + k / 5 + ch.seed) % 1; glow(c, ch.x + u * 40, ch.y - u * 50, 6 + u * 16, 'rgba(90,85,85,.9)', (1 - u) * 0.45); } }
    if (ART.ok && z > 0.45) for (const h of queryObjs(view.x0, view.y0, view.x1, view.y1, 40)) { if (h.type !== 'home') continue; const sd = homeSeed(h); if (!(REGIONS[h.region].key === 'badlands' ? (sd * 3.7) % 1 < 0.5 : (sd * 3.7) % 1 < 0.12)) continue;
      const w = homeW(h), fx = h.x + w * 0.18 * (homeFlip(h) ? 1 : -1), fy = h.y - w * 0.78;
      for (let k = 0; k < 4; k++) { const u = (t * 0.18 + k / 4 + sd) % 1; glow(c, fx + u * 14 + Math.sin(u * 5 + sd * 9) * 2, fy - u * 26, 2.5 + u * 8, 'rgba(205,200,195,.9)', Math.min(1, u * 5) * (1 - u) * 0.22 * clamp((z - 0.45) / 0.3, 0, 1)); } }
    if (ART.ok && W.river.length) { const e0 = W.river[W.river.length - 1], d = Math.hypot(e0[0], e0[1]), ex = e0[0] + e0[0] / d * 50, ey = e0[1] + e0[1] / d * 50, sp = ART_MANIFEST.s.props2_2;
      if (sp && inV(ex, ey, 160)) { const fh = 92 * sp[4] / sp[3], by = ey - fh * 0.1 + fh * 0.86; for (let k = 0; k < 7; k++) { const u = (t * 0.35 + k / 7) % 1; glow(c, ex - 30 + ((k * 37) % 60) + Math.sin(t + k) * 4, by - u * 22, 8 + u * 18, 'rgba(235,245,255,1)', (1 - u) * 0.3); } } }
    for (const m of W.mines) { if (!inV(m.x, m.y, 80)) continue; const u = (Math.sin(t * 0.5 + m.seed * 9) + 1) / 2, d = 14 + u * 52; const x = m.x + Math.cos(m.a) * d, y = m.y + Math.sin(m.a) * d;
      if (ART.ok) { drawSprite(c, 'props_4', x, y, 18, 0.5, 0.7, Math.cos(m.a) < 0); continue; } c.save(); c.translate(x, y); c.rotate(m.a); c.fillStyle = '#5a4a3a'; c.fillRect(-5, -4, 10, 8); c.fillStyle = '#b9a4ff'; c.beginPath(); c.arc(-1.5, 0, 1.6, 0, TAU); c.arc(2, 1, 1.4, 0, TAU); c.fill(); c.restore(); }
    // homes: lanterns, pets
    const homes = z > 0.32 ? queryObjs(view.x0, view.y0, view.x1, view.y1, 40).filter((o) => o.type === 'home') : [];
    if (z > 0.5) for (const h of homes) { if (!h.pet || h.isPlayer) continue; let x, y, a, sl = h.petSleep || night > 0.6;
      if (sl) { x = h.x + Math.cos(h.ang + Math.PI / 2) * (h.size * 0.5 + 6); y = h.y + Math.sin(h.ang + Math.PI / 2) * (h.size * 0.5 + 6); a = h.ang; }
      else { x = h.x + Math.cos(h.ang + Math.PI / 2) * (h.size * 0.5 + 6); y = h.y + Math.sin(h.ang + Math.PI / 2) * (h.size * 0.5 + 6); a = h.ang; }
      drawPet(c, h.pet, x, y, a, t, h.petPhase, sl); }
    // the player's own Lanternhold, painted live from game state
    drawPlayerHome(c, t, z, inV);
    // people
    const storm = (wx.type === 'storm' || wx.type === 'rain') && wx.fade > 0.3 ? wx : null; const mole = currentMole();
    if (mole && inV(mole.x, mole.y, 120)) drawMole(c, mole, t);
    if (z > 0.3) {
      for (const n of W.npcs) { const [x, y, a] = npcPos(n, t); if (!inV(x, y, 20)) continue; n.sx = x; n.sy = y; glow(c, x, y, 16, 'rgba(255,230,150,.9)', 0.4); drawPerson(c, x, y, a, n.npc.color, SKIN[0], t, 1, { hat: true, lantern: true, spr: NPC_SPR[n.npc.id], h: 17, idle: true }); }
    }
    // promenade lamps lit by Pell (glow added later in night pass)
    // sky-fish by day: big, slow, ground shadows; dive back into the Hollow
    const dayA = 1 - night;
    if (dayA > 0.05) for (const f of W.dayFish) { const u = ((t + f.phase) / f.period) % 1, alt = Math.sin(u * Math.PI), r = alt * 2500, a = f.a0 + u * 2.4;
      const x = Math.cos(a) * r, y = Math.sin(a) * r; if (!inV(x, y, f.size * 3 + 90)) continue;
      const u2 = u + 0.002, r2 = Math.sin(u2 * Math.PI) * 2500, a2 = f.a0 + u2 * 2.4, head = Math.atan2(Math.sin(a2) * r2 - y, Math.cos(a2) * r2 - x);
      const sc = 0.55 + alt * 0.7, emerge = Math.min(1, u * 12, (1 - u) * 12);
      drawSkyFish(c, f.kind, x + 40 + alt * 70, y + 55 + alt * 90, head, f.size * sc, t, f.phase, false, (ART.ok ? 0.22 : 0.18) * dayA * emerge, true); // ground shadow
      drawSkyFish(c, f.kind, x, y, head, f.size * sc, t, f.phase, false, dayA * (0.35 + 0.65 * emerge)); }
  }
  function drawPlayerHome(c, t, z, inV) {
    const h = W.player; if (!inV(h.x, h.y, 80)) return;
    const raid = S.lastRaid && S.lastRaid.kind === 'defense' && S.lastRaid.stars > 0 && S.gameTime - S.lastRaid.t < 12 * HOUR;
    Object.assign(h, { level: S.buildings.hall, banners: Math.min(4, S.stats.deepest || 0), trophies: S.stats.moles || 0, battered: !!raid, size: 38 + S.buildings.hall * 0.8 });
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.5);
    glow(c, h.x, h.y, h.size * 1.8 + pulse * 10, 'rgba(255,212,107,.9)', 0.45);
    c.strokeStyle = `rgba(255,212,107,${0.5 + pulse * 0.4})`; c.lineWidth = 3 / Math.max(0.3, z); c.beginPath(); c.arc(h.x, h.y, h.size + 14 + pulse * 4, 0, TAU); c.stroke();
    drawHome(c, h, Math.max(0.3, z));
    const pets = equippedPets(); pets.forEach((p, i) => { const sl = !heroHome() || nightFactor() > 0.5; const a = h.ang + Math.PI / 2; const kind = p.id;
      const x = h.x + Math.cos(a) * (h.size * 0.55 + 6) + Math.cos(h.ang) * (i * 11 - 5), y = h.y + Math.sin(a) * (h.size * 0.55 + 6) + Math.sin(h.ang) * (i * 11 - 5);
      drawPet(c, kind, x, y, h.ang, t, i, sl); });
  }
  function drawMole(c, m, t) {
    const bob = Math.sin(t * 3) * 3;
    if (ART.ok) { softShadow(c, m.x + 10, m.y + 8, 62, 30, 0.9); drawSprite(c, 'creatures_3', m.x, m.y + bob * 0.4, 128, 0.5, 0.62); for (let i = 0; i < 8; i++) { const u = (t * 0.7 + i / 8) % 1, a = i * 0.8; glow(c, m.x + Math.cos(a) * (40 + u * 40), m.y + Math.sin(a) * (30 + u * 30), 10 + u * 12, 'rgba(160,130,90,.9)', (1 - u) * 0.45); } return; }
    c.fillStyle = '#6a4a30'; for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; c.beginPath(); c.arc(m.x + Math.cos(a) * 32, m.y + Math.sin(a) * 26, 9 + (i % 3) * 3, 0, TAU); c.fill(); }
    c.fillStyle = '#2e2420'; c.beginPath(); c.ellipse(m.x, m.y + bob * 0.3, 26, 22, 0, 0, TAU); c.fill();
    c.fillStyle = '#4a3a32'; c.beginPath(); c.ellipse(m.x, m.y - 4 + bob, 20, 16, 0, 0, TAU); c.fill();
    c.fillStyle = '#e88a9a'; c.beginPath(); c.arc(m.x, m.y - 16 + bob, 6, 0, TAU); c.fill();
    c.strokeStyle = '#d8c3a0'; c.lineWidth = 2.5; for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(m.x + sx * 16, m.y + bob); for (let k = 0; k < 3; k++) { c.moveTo(m.x + sx * 18, m.y - 2 + k * 3 + bob); c.lineTo(m.x + sx * 30, m.y - 6 + k * 4 + bob + Math.sin(t * 8) * 2 * sx); } c.stroke(); }
    for (let i = 0; i < 8; i++) { const u = (t * 0.7 + i / 8) % 1, a = i * 0.8; glow(c, m.x + Math.cos(a) * (30 + u * 40), m.y + Math.sin(a) * (24 + u * 30), 10 + u * 10, 'rgba(160,130,90,.9)', (1 - u) * 0.5); }
  }

  /* ---------- overlay: night, glows, weather, labels (screen space) ---------- */
  function drawOverlay(c, t, view, inV) {
    const k = kpx(), z = cam.z, night = nightFactor(), fest = festival(), wx = weatherNow(t), S2 = (x, y) => [(x - cam.x) * k + Wc / 2, (y - cam.y) * k + Hc / 2];
    const season = SEASONS[seasonInfo().idx]; c.fillStyle = season.tint; c.fillRect(0, 0, Wc, Hc);
    // weather cloud shadow & rain (before night so rain is visible at dusk)
    if (wx.type !== 'clear' && wx.type !== 'updraft' && inV(wx.x, wx.y, wx.r)) {
      const [sx, sy] = S2(wx.x, wx.y), R = wx.r * k; const g = c.createRadialGradient(sx, sy, 0, sx, sy, R);
      const dark = wx.type === 'storm' ? 0.38 : wx.type === 'mist' ? 0 : 0.22; g.addColorStop(0, `rgba(30,40,60,${dark * wx.fade})`); g.addColorStop(1, 'rgba(30,40,60,0)'); c.fillStyle = g; c.fillRect(0, 0, Wc, Hc);
      if (wx.type === 'mist') { c.globalAlpha = 0.35 * wx.fade; c.drawImage(glowSprite('rgba(235,240,245,.95)'), sx - R, sy - R, R * 2, R * 2); c.globalAlpha = 1; }
      if (wx.type === 'rain' || wx.type === 'storm') { c.strokeStyle = 'rgba(200,215,240,.55)'; c.lineWidth = 1.2 * dpr; c.beginPath(); const n = wx.type === 'storm' ? 220 : 140;
        for (let i = 0; i < n; i++) { const px = sx + (hash1(i) * 2 - 1) * R * 0.85, py0 = sy + (hash1(i + 999) * 2 - 1) * R * 0.85, fall = ((t * 600 * dpr + i * 37) % (90 * dpr)); const py = py0 + fall; if (Math.hypot(px - sx, py - sy) > R * 0.9) continue; c.moveTo(px, py); c.lineTo(px - 3 * dpr, py + 10 * dpr); } c.globalAlpha = wx.fade; c.stroke(); c.globalAlpha = 1; }
      if (wx.type === 'storm' && Math.sin(t * 1.7) > 0.985) { c.fillStyle = 'rgba(230,240,255,.35)'; c.fillRect(0, 0, Wc, Hc); }
    }
    // night
    if (night > 0) { c.fillStyle = `rgba(14,20,50,${(ART.ok ? 0.52 : 0.6) * night})`; c.fillRect(0, 0, Wc, Hc); }
    // glows (additive)
    c.globalCompositeOperation = 'lighter';
    const G = (x, y, r, col, a) => { if (!inV(x, y, r)) return; const [sx, sy] = S2(x, y); glow(c, sx, sy, r * k, col, a); };
    const pulse = 0.75 + 0.25 * Math.sin(t * 0.9);
    G(0, 40, CITY.hollowR * 0.7, 'rgba(255,205,110,.8)', (0.25 + night * 0.35) * pulse);
    // lightning deep below
    { const P = 9, seg = Math.floor(t / P), h = hash1(seg + 3); const t0 = seg * P + hash1(seg + 77) * 6; if (h < 0.55 && t > t0 && t < t0 + 0.55) { const fl = (Math.sin((t - t0) * 60) > 0 ? 1 : 0.4) * (1 - (t - t0) / 0.55); const a = hash1(seg) * TAU, rr = CITY.hollowR * 0.35 * hash1(seg + 5);
      G(Math.cos(a) * rr, Math.sin(a) * rr, 380, 'rgba(180,210,255,.9)', 0.7 * fl); if (inV(0, 0, 800)) { c.strokeStyle = `rgba(220,235,255,${0.9 * fl})`; c.lineWidth = 2.5 * dpr; c.beginPath(); let [bx, by] = [Math.cos(a) * rr, Math.sin(a) * rr]; let [sx, sy] = S2(bx, by); c.moveTo(sx, sy);
        for (let i = 0; i < 7; i++) { bx += (hash2(seg, i) - 0.5) * 120; by += (hash2(i, seg) - 0.5) * 120; [sx, sy] = S2(bx, by); c.lineTo(sx, sy); } c.stroke(); } } }
    // drifting Lumen motes rising out of the Hollow
    if (inV(0, 0, 1000)) for (const m of W.motes) { const u = (t * m.sp + m.off) % 1, rr = 40 + u * CITY.hollowR * 1.05, a = m.a + Math.sin(t * 0.3 + m.wob) * 0.1; G(Math.cos(a) * rr, Math.sin(a) * rr - u * 40, m.sz * 2.4, 'rgba(255,220,120,.95)', Math.sin(u * Math.PI) * (0.5 + night * 0.5)); }
    // updraft weather: a spiral column of motes at the rim
    if (wx.type === 'updraft' && inV(wx.x, wx.y, 300)) for (let i = 0; i < 50; i++) { const u = (t * 0.25 + i / 50) % 1, a = i * 0.7 + t * 2, rr = 30 + u * 220; G(wx.x + Math.cos(a) * rr * 0.5, wx.y + Math.sin(a) * rr * 0.5 - u * 120, 10, 'rgba(255,240,200,.9)', (1 - u) * wx.fade * 0.8); }
    // crystals, kilns, lantern posts, promenade lamps, home lanterns
    if (z > 0.06) for (const o of W.crystals) G(o.x, o.y, 46, 'rgba(180,150,255,.9)', 0.18 + 0.18 * Math.sin(t * 1.5 + o.seed * 20) + night * 0.25);
    if (z > 0.06) for (const o of W.kilns) G(o.x, o.y, 30, 'rgba(255,150,60,.9)', 0.25 + night * 0.4 + 0.1 * Math.sin(t * 3 + o.seed * 9));
    if (z > 0.06) for (const o of W.posts) G(o.x, o.y, 22, 'rgba(255,212,107,.95)', (0.25 + night * 0.65) * (0.75 + 0.25 * Math.sin(t * 3 + o.seed * 30)));
    // far out: Lumen breathing out of the rifts, lava seeping from the Emberwound
    { const stp = z > 0.3 ? 2 : z > 0.12 ? 4 : z > 0.05 ? 8 : 16, fl = 0.85 + 0.15 * Math.sin(t * 1.3);
      const vb = (b) => b[2] >= view.x0 && b[0] <= view.x1 && b[3] >= view.y0 && b[1] <= view.y1;
      for (const ck of W.cracks) { if (!(ck.glow || ck.lava) || !vb(ck.bbox)) continue; const mw = Math.max(...ck.ws);
        for (let i = 0; i < ck.pts.length; i += stp) { const p = ck.pts[i], w = ck.ws[i]; const rr = Math.max(stp * 30, w * 1.4); if (ck.lava) G(p[0], p[1] + 8, rr, 'rgba(255,110,30,.95)', (0.22 + night * 0.55) * fl);
          else G(p[0], p[1] + 10, Math.max(stp * 28, w * 1.1), 'rgba(120,220,255,.9)', (0.08 + night * 0.36) * (stp > 4 ? 0.7 : 1) * (0.75 + 0.25 * Math.sin(t * 0.8 + i * 0.3))); } }
      for (let fi = 0; fi < W.lavaFlows.length; fi++) { const f = W.lavaFlows[fi]; if ((z < 0.06 && fi % 4) || !vb(f.bbox)) continue; for (let i = 0; i < f.pts.length; i += stp) { const p = f.pts[i]; G(p[0], p[1], Math.max(stp * 18, f.ws[i] * 2), 'rgba(255,120,40,.9)', (0.14 + night * 0.5) * (0.8 + 0.2 * Math.sin(t * 2 + f.ph + i * 0.4))); } }
      if (z > 0.06) { for (const v of W.vents) G(v.x, v.y - v.r, v.r * 2.2, 'rgba(255,120,40,.95)', (0.2 + night * 0.5) * (0.75 + 0.25 * Math.sin(t * 3 + v.seed * 20))); for (const o of W.lavaPools) G(o.x, o.y, o.r * 1.8, 'rgba(255,130,40,.9)', (0.18 + night * 0.5) * fl); }
      for (const m of W.rifts) { const lm = m.mouth; if (lm) G(lm.x, lm.y, 90, 'rgba(140,230,255,.9)', (0.12 + night * 0.35) * (0.7 + 0.3 * Math.sin(t * 1.1 + lm.x))); } }
    if (night > 0.15 && z <= 0.2) { if (!W.glowCells) { const C = 600, m = new Map(); for (const h of W.homes) { const k = Math.floor(h.x / C) + ',' + Math.floor(h.y / C); let e = m.get(k); if (!e) { e = { x: 0, y: 0, n: 0 }; m.set(k, e); } e.x += h.x; e.y += h.y; e.n++; } W.glowCells = [...m.values()].map((e) => ({ x: e.x / e.n, y: e.y / e.n, n: e.n })); }
      for (const g of W.glowCells) G(g.x, g.y, 300 + Math.sqrt(g.n) * 55, 'rgba(255,190,100,.95)', night * Math.min(0.45, 0.06 + g.n * 0.012)); }
    if (z > 0.2 && night > 0.15) for (const h of queryObjs(view.x0, view.y0, view.x1, view.y1, 40)) if (h.type === 'home') { if (ART.ok && z <= 0.35) { G(h.x, h.y - 8, homeW(h) * 0.75, 'rgba(255,190,100,.95)', night * 0.75); continue; } if (ART.ok) { const w = homeW(h), fl = 0.75 + 0.25 * Math.sin(t * 2.5 + h.lanternPhase); G(h.x, h.y + w * 0.05, w * 0.55, 'rgba(255,150,60,.9)', night * 0.35 * fl); const sd = h.lanternPhase || 0; for (let i = 0; i < 3; i++) { const wx = h.x + (((sd * 7.3 + i * 0.37) % 1) - 0.5) * w * 0.55, wy = h.y - w * (0.12 + ((sd * 3.1 + i * 0.29) % 1) * 0.25); G(wx, wy, w * 0.14, 'rgba(255,200,110,.95)', night * 0.9 * fl); G(wx, wy, 2.2, 'rgba(255,245,200,1)', night * 0.9); } } else G(h.x + Math.cos(h.ang + 1.57) * h.size * 0.45, h.y + Math.sin(h.ang + 1.57) * h.size * 0.45, 16, 'rgba(255,200,110,.95)', night * (0.6 + 0.4 * Math.sin(t * 2.5 + h.lanternPhase))); }
    // sky-fish at night: the nightfall school surges out of the chasm, then a few roam
    if (night > 0.05) { const h = hourOfDay(); const surge = h >= 17.5 && h < 21 ? clamp((h - 17.5) / 3.5, 0, 1) : -1;
      W.nightFish.forEach((f, i) => { let x, y, a, al;
        if (surge >= 0) { const rr = CITY.hollowR * (0.08 + surge * (0.6 + f.r * 1.4)), ang = f.a + t * f.sp * 0.8; x = Math.cos(ang) * rr; y = Math.sin(ang) * rr; a = ang + Math.PI / 2 + 0.4; al = Math.min(1, surge * 4) * (surge > 0.85 && i >= 10 ? (1 - surge) / 0.15 : 1); }
        else { if (i >= 10) return; const u = ((t * 0.01 * (1 + f.sp)) + f.ph) % 1, rr = 300 + Math.sin(u * TAU * 2) * 1100 + 1200, ang = f.a + u * TAU; x = Math.cos(ang) * rr; y = Math.sin(ang) * rr; a = ang + Math.PI / 2; al = night; }
        if (!inV(x, y, 30)) return; const [sx, sy] = S2(x, y); glow(c, sx, sy, f.size * 4 * k, f.hue < 0.5 ? 'rgba(120,255,220,.9)' : 'rgba(150,200,255,.9)', 0.5 * al);
        c.globalCompositeOperation = 'source-over'; c.save(); c.setTransform(k, 0, 0, k, Wc / 2 - cam.x * k, Hc / 2 - cam.y * k); drawSkyFish(c, i % 7 === 0 ? 'eel' : 'school', x, y, a, f.size * (i % 7 === 0 ? 3 : 1), t, f.ph, true, al); c.restore(); c.globalCompositeOperation = 'lighter'; }); }
    // Lumen Festival: lanterns float from the rim into the Hollow
    if (fest === 'lumen') for (const L of W.lanterns) { const u = (t * L.sp + L.ph) % 1, rr = (hollowR(L.a) + 60) * (1 - u * 0.75); G(Math.cos(L.a + u * 0.6) * rr, Math.sin(L.a + u * 0.6) * rr - Math.sin(u * Math.PI) * 30, 18, L.c === '#ffd46b' ? 'rgba(255,212,107,.95)' : 'rgba(255,170,100,.95)', Math.sin(u * Math.PI) * 0.9); }
    if (fest === 'harvest') { const m = W.markets.find((mm) => REGIONS[mm.region].key === 'farms'); if (m) for (let i = 0; i < 6; i++) { const u = (t * 0.5 + i / 6) % 1, a = i * 1.1 + Math.floor(t * 0.5 + i / 6) * 2; G(m.x + Math.cos(a) * (40 + u * 60), m.y + Math.sin(a) * (40 + u * 60), 12 * (1 - u) + 4, ['rgba(255,200,90,.9)', 'rgba(255,120,90,.9)', 'rgba(150,255,150,.9)'][i % 3], 1 - u); } }
    c.globalCompositeOperation = 'source-over';
    // frost snow in winter
    if (frostLevel() > 0.3) { c.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 60; i++) { const x = (hash1(i) * Wc + t * 20 * dpr + Math.sin(t + i) * 10) % Wc, y = (hash1(i + 7) * Hc + t * 40 * dpr) % Hc; c.beginPath(); c.arc(x, y, 1.6 * dpr, 0, TAU); c.fill(); } }
    drawLabels(c, t, view, inV, S2);
  }
  function pill(c, x, y, text, opt) {
    opt = opt || {}; const fs = (opt.fs || 11) * dpr; c.font = `${opt.bold ? 700 : 600} ${fs}px ${opt.serif ? 'Georgia,serif' : 'system-ui,sans-serif'}`;
    const w = c.measureText(text).width + 10 * dpr, h = fs + 6 * dpr; const bx = x - w / 2, by = y - h;
    if (hudHit([bx, by, w, h])) return [bx, by, 0, 0];
    c.globalAlpha = opt.a == null ? 1 : opt.a; c.fillStyle = opt.bg || 'rgba(255,248,230,.86)'; c.beginPath(); if (c.roundRect) c.roundRect(bx, by, w, h, h / 2); else c.rect(bx, by, w, h); c.fill();
    if (opt.border) { c.strokeStyle = opt.border; c.lineWidth = 1.5 * dpr; c.stroke(); }
    c.fillStyle = opt.color || '#3a2e22'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, x, by + h / 2 + 0.5); c.globalAlpha = 1;
    return [bx, by, w, h];
  }
  // HUD rectangles (device px) that world labels must not draw under
  let hudRects = [], hudAt = 0;
  function updateHud() { const now = performance.now(); if (now - hudAt < 400) return; hudAt = now; const base = wrap.getBoundingClientRect(); hudRects = ['.cityTitle', '#cityInfo', '#ticker', '.cityBtns', '#miniMap'].map((q) => wrap.querySelector(q)).filter((e) => e && e.offsetParent !== null).map((e) => { const r = e.getBoundingClientRect(); return [(r.left - base.left - 4) * dpr, (r.top - base.top - 4) * dpr, (r.width + 8) * dpr, (r.height + 8) * dpr]; }); }
  const ovl = (r, q) => r[0] < q[0] + q[2] && r[0] + r[2] > q[0] && r[1] < q[1] + q[3] && r[1] + r[3] > q[1];
  function hudHit(r) { for (const q of hudRects) if (ovl(r, q)) return true; return false; }
  let lblShown = new Set();
  function drawLabels(c, t, view, inV, S2) {
    updateHud();
    st.labels = [];
    const z = cam.z, rects = hudRects.slice();
    const free = (r) => { for (const q of rects) if (r[0] < q[0] + q[2] && r[0] + r[2] > q[0] && r[1] < q[1] + q[3] && r[1] + r[3] > q[1]) return false; rects.push(r); return true; };
    // player label always
    { const h = W.player, [sx, sy] = S2(h.x, h.y - h.size); rects.push(pill(c, sx, sy - 4 * dpr, `★ You · ${CITY.homeTerm} Lv ${S.buildings.hall}`, { bg: 'rgba(255,212,107,.95)', bold: true, fs: 12, border: '#7a4a1c' })); }
    // mole
    const mole = currentMole(); if (mole && inV(mole.x, mole.y, 80)) { const [sx, sy] = S2(mole.x, mole.y - 40); rects.push(pill(c, sx, sy, '⚠️ A Rim Mole surfaced! Tap to fight', { bg: 'rgba(200,99,76,.95)', color: '#fff', bold: true })); }
    // region names at far zoom
    const ra = clamp((0.5 - z) / 0.15, 0, 1);
    // region names are not shown: the lands are discovered by exploring
    if (ra > 0) { const [sx, sy] = S2(0, 0); if (!hudHit([sx - 70 * dpr, sy - 18 * dpr, 140 * dpr, 24 * dpr])) { c.font = `700 ${16 * dpr}px Georgia,serif`; c.globalAlpha = ra; c.fillStyle = '#ffe9a8'; c.textAlign = 'center'; c.fillText('THE HOLLOW', sx, sy); c.globalAlpha = 1; } }
    // civic labels
    const ca = clamp((z - 0.28) / 0.12, 0, 1);
    if (ca > 0) for (const o of W.civic) { if (!inV(o.x, o.y, 40) || o.type === 'plaza') continue; const [sx, sy] = S2(o.x, o.y + (o.r || 20) + 8);
      const label = o.type === 'market' ? `🏪 ${o.name}${marketSpike(o.idx) ? ' 📈' : ''}` : o.type === 'vault' ? `🏦 ${o.name}` : o.type === 'lift' ? `🧵 ${o.name}` : o.type === 'statue' ? '🗿 Aurel Vane' : o.type === 'memorial' ? '🕯️ Wall of Lanterns Out' : o.type === 'gate' ? '🚪 The Undergate' : o.type === 'rift' ? `✨ ${o.name}` : '';
      if (!label) continue; const r = pill(c, sx, sy + 14 * dpr, label, { a: ca, bg: 'rgba(36,50,74,.85)', color: '#fff3d0', fs: 10.5 }); rects.push(r); }
    // NPC names + speech bubbles
    if (z > 0.45) for (const n of W.npcs) { if (n.sx == null || !inV(n.sx, n.sy, 20)) continue; const [sx, sy] = S2(n.sx, n.sy);
      if (z > 0.75) rects.push(pill(c, sx, sy - 9 * dpr, `${n.npc.icon} ${n.npc.name}`, { bg: 'rgba(255,230,160,.95)', fs: 10, bold: true, a: clamp((z - 0.75) / 0.2, 0, 1) }));
      const b = npcBubble(n, t); if (b) { const r = pill(c, sx, sy - (z > 0.75 ? 26 : 10) * dpr, b, { bg: '#fffdf4', fs: 10.5, border: 'rgba(110,80,40,.4)', a: clamp((z - 0.45) / 0.2, 0, 1) }); rects.push(r); } }
    // home labels (level-of-detail, decluttered)
    if (z > 0.6) { const homes = queryObjs(view.x0, view.y0, view.x1, view.y1, 20).filter((o) => o.type === 'home' && !o.isPlayer).sort((a, b) => (lblShown.has(b.id) - lblShown.has(a.id)) || b.level - a.level); const nowShown = new Set();
      for (const h of homes) { const need = Math.max(0.75, 1.3 - h.level / 45); const a = clamp((z - need) / 0.25, 0, 1); if (a <= 0.02) continue;
        const [sx, sy] = S2(h.x, h.y - h.size * 0.55); const fs = 10.5; c.font = `600 ${fs * dpr}px system-ui`; const w = c.measureText(h.owner).width + 34 * dpr, hh = (fs + 6) * dpr; const r = [sx - w / 2, sy - hh, w, hh];
        if (!free(r)) continue; const sh = (S.mapShields[h.id] || 0) > S.gameTime; pill(c, sx, sy, `${h.owner} · ${h.level}${sh ? ' 🛡️' : ''}`, { a, fs }); st.labels.push({ name: h.owner, wx: h.x, wy: h.y - h.size * 0.55, sx: sx / dpr, sy: sy / dpr }); nowShown.add(h.id); } lblShown = nowShown; }
  }
  function npcBubble(n, t) {
    const b = bubbles.get(n.npc.id); if (b && b.until > t) return b.text;
    if (n.npc.id === 'greta') { const k = Math.floor(t / 9); if (t % 9 < 3.5) { const docks = W.markets.findIndex((m) => m.region === 0); return marketSpike(docks) ? 'Lumen oil is DEAR today! Get it while it lasts!' : n.npc.lines[k % 3]; } }
    if (n.npc.id === 'kip' && t % 11 < 4) return '📯 ' + (currentRumor || 'News from the Rim!').slice(0, 60);
    if (n.npc.id === 'pell' && isDusk() && t % 7 < 3) return 'Lamps, lamps! Lighting the way down!';
    if (n.npc.id === 'maddox' && t % 13 < 2.5) return '♪ hmm-hmm, the rope sings… ♪';
    if (n.npc.id === 'juniper' && festival() === 'harvest' && t % 10 < 3.5) return 'Harvest Fair! Pies, pumpkins and mole races!';
    return null;
  }

  /* ---------- HUD ---------- */
  let currentRumor = '';
  function rumorPool() {
    const out = [], t = performance.now() / 1000;
    if (S.gameTime < S.nextRaidAt && S.nextRaidAt - S.gameTime < 3 * HOUR && S.gameTime >= S.shieldUntil) out.push({ w: 3, s: '🏴 Scouts saw raider banners on the east road. They\'re eyeing your Lanternhold.' });
    const nm = nextMole(); if (nm && nm.start - S.gameTime < 4 * HOUR) out.push({ w: 3, s: `🫨 The ground's been trembling in ${regionName(nm.region)}. Something big is digging.` });
    const cm = currentMole(); if (cm) out.push({ w: 4, s: `⚠️ A Rim Mole broke the surface in ${regionName(cm.region)}! Crowds are gathering to watch the fight.` });
    const w = Math.floor(S.gameTime / (CITY.spikeWindowHours * HOUR));
    W.markets.forEach((m, i) => { const res = REGIONS[m.region].sells[0]; if (marketSpike(i)) out.push({ w: 2, s: `📈 ${CONFIG.resources[res].name} prices are spiking at the ${m.name}! Traders are pouring in.` });
      else if (spikeAt(i, w + 1)) out.push({ w: 2, s: `🤫 Traders whisper ${CONFIG.resources[res].name} will be dear at the ${m.name} soon.` }); });
    const si = seasonInfo(); if (!si.forced && si.nextIn < 6 * HOUR) out.push({ w: 2, s: `${SEASONS[(si.idx + 1) % 4].icon} ${SEASONS[(si.idx + 1) % 4].name} is coming. Old Maddox can smell it on the updraft.` });
    const f = festival(); if (f === 'lumen') out.push({ w: 3, s: '🏮 The Lumen Festival is on! Lanterns float down into the Hollow all night.' }); if (f === 'harvest') out.push({ w: 3, s: '🌾 The Harvest Fair is on in Goldenstep! The Bazaar is packed.' });
    if (frostLevel() > 0) out.push({ w: 2, s: '❄️ Frost is creeping over Greystone Bluffs. Quarry crews are wrapping their hands.' });
    const tk = S.hero.task; if (tk && tk.type === 'expedition' && tk.end - S.gameTime < 1.5 * HOUR) out.push({ w: 3, s: `🧗 Word on the Promenade: ${CONFIG.hero.name} is climbing back up the Tether.` });
    const nw = weatherNow(t + CITY.weatherSeconds); if (nw.type !== 'clear') out.push({ w: 1, s: `🌦️ Weather-watchers say: ${weatherLabel(nw).replace(/^\S+\s/, '')} soon.` });
    if (isDusk()) out.push({ w: 1, s: '🕯️ Pell is lighting the Promenade lamps. The sky-fish will rise soon.' });
    RUMORS.forEach((r) => out.push({ w: 1, s: '💬 ' + r }));
    return out;
  }
  function updateTicker() {
    const pool = rumorPool(); const real = pool.filter((p) => p.w > 1); const pickFrom = real.length && tickerI % 2 === 0 ? real : pool; currentRumor = pickFrom[tickerI % pickFrom.length].s; tickerI++;
    const el = $('#ticker span'); if (el) { el.classList.remove('slide'); void el.offsetWidth; el.textContent = currentRumor; el.classList.add('slide'); }
  }
  function updateInfo(t) {
    const si = seasonInfo(), s = SEASONS[si.idx], h = hourOfDay(), f = festival(), wx = weatherNow(t);
    const hh = Math.floor(h), mm = Math.floor((h % 1) * 60);
    const txt = `${s.icon} ${s.name}${f ? (f === 'lumen' ? ' · 🏮 Lumen Festival' : ' · 🌾 Harvest Fair') : ''} · ${h >= 6 && h < 18 ? '☀️' : '🌙'} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} · ${weatherLabel(wx)}`;
    const el = $('#cityInfo'); if (el && el.textContent !== txt) el.textContent = txt;
  }
  function buildLegend() {
    const known = REGIONS.map((R, i) => [R, i]).filter(([, i]) => isDiscovered(i)), unk = REGIONS.length - known.length;
    $('#legend').innerHTML = `<div class="row between"><b>🗺️ Lands you have explored</b><button class="btn ghost sm" data-city="legend">✕</button></div>` + known.map(([R, i]) => `<div class="legrow" data-city="region:${i}"><span class="sw" style="background:rgb(${R.ground.join(',')})"></span><div><b>${R.icon} ${R.name}</b><br><span class="dim">${R.res.join(' · ')}</span></div></div>`).join('') +
      (unk ? `<div class="legrow"><span class="sw" style="background:#555"></span><div><b>❔ ${unk} unexplored land${unk > 1 ? 's' : ''}</b><br><span class="dim">Zoom in and linger somewhere new to map it.</span></div></div>` : '') +
      `<div class="dim" style="margin-top:6px">🏪 Bazaars trade resources · 🏦 Vaults add storage · 🧵 Tether lifts drop into the Hollow · ★ is your ${CITY.homeTerm}.</div>`;
  }
  function buildMinimapBase() {
    const N = 160; mmBase = document.createElement('canvas'); mmBase.width = mmBase.height = N * 2; const g = mmBase.getContext('2d'); const img = g.createImageData(N, N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const x = (i / N) * 2 * CITY.R - CITY.R, y = (j / N) * 2 * CITY.R - CITY.R; let col = groundRGB(x, y); if (hollowDist(x, y) < 0) col = [24, 30, 52]; else if (inLake(x, y)) col = [93, 155, 179]; else if (chasmDist(x, y) < 6) col = [30, 32, 48]; const o = (j * N + i) * 4; img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255; }
    const tmp = document.createElement('canvas'); tmp.width = tmp.height = N; tmp.getContext('2d').putImageData(img, 0, 0); g.imageSmoothingEnabled = true; g.drawImage(tmp, 0, 0, N * 2, N * 2);
    g.fillStyle = 'rgba(60,40,20,.55)'; const sc = (N * 2) / (CITY.R * 2); for (const h of W.homes) g.fillRect((h.x + CITY.R) * sc - 0.5, (h.y + CITY.R) * sc - 0.5, 1.2, 1.2);
  }
  function drawMinimap() {
    if (!mmBase) return; const s = mm.width; if (mm.width !== 240) { mm.width = mm.height = 240; }
    mctx.clearRect(0, 0, 240, 240); mctx.save(); mctx.beginPath(); mctx.arc(120, 120, 118, 0, TAU); mctx.clip(); mctx.drawImage(mmBase, 0, 0, 240, 240);
    const sc = 240 / (CITY.R * 2), k = kpx(); const vw = Wc / k, vh = Hc / k; mctx.strokeStyle = '#fff'; mctx.lineWidth = 2; mctx.strokeRect((cam.x - vw / 2 + CITY.R) * sc, (cam.y - vh / 2 + CITY.R) * sc, vw * sc, vh * sc);
    const p = W.player; mctx.fillStyle = '#ffd46b'; mctx.strokeStyle = '#7a4a1c'; mctx.beginPath(); mctx.arc((p.x + CITY.R) * sc, (p.y + CITY.R) * sc, 5, 0, TAU); mctx.fill(); mctx.stroke();
    const m = currentMole(); if (m) { mctx.fillStyle = '#c8634c'; mctx.beginPath(); mctx.arc((m.x + CITY.R) * sc, (m.y + CITY.R) * sc, 4.5, 0, TAU); mctx.fill(); }
    mctx.restore(); void s;
  }
  function cityButton(b) {
    if (b === 'zin') return zoomAt(Wc / dpr / 2, Hc / dpr / 2, 1.5);
    if (b === 'zout') return zoomAt(Wc / dpr / 2, Hc / dpr / 2, 1 / 1.5);
    if (b === 'home') return flyTo(W.player.x, W.player.y, Math.max(1.05, cam.z));
    if (b === 'overview') return flyTo(0, 0, Math.min(Wc, Hc) / dpr / (CITY.R * 2.1));
    if (b === 'legend') { buildLegend(); return $('#legend').classList.toggle('hidden'); }
    if (b === 'journal') return journalModal();
    if (b === 'season') return seasonModal();
    if (b.startsWith('region:')) { const i = +b.split(':')[1]; const hs = W.homes.filter((h) => h.region === i), hh = hs[Math.floor(hs.length / 2)] || W.player, x = hh.x, y = hh.y; $('#legend').classList.add('hidden'); flyTo(x, y, 0.45); }
  }

  /* ---------- taps & cards ---------- */
  function handleTap(sx, sy) {
    const [x, y] = s2w(sx, sy), z = cam.z, t = performance.now() / 1000, tapR = 16 / z;
    for (const n of W.npcs) { const [nx, ny] = npcPos(n, t); if (Math.hypot(nx - x, ny - y) < Math.max(14, tapR)) return npcCard(n, t); }
    const mole = currentMole(); if (mole && Math.hypot(mole.x - x, mole.y - y) < Math.max(50, tapR)) return moleCard(mole);
    if (Math.hypot(W.player.x - x, W.player.y - y) < Math.max(W.player.size, tapR)) return playerCard();
    let best = null, bd = 1e9;
    for (const o of queryObjs(x - 80, y - 80, x + 80, y + 80, 80)) { if (!['home', 'market', 'vault', 'lift', 'statue', 'memorial', 'gate', 'rift'].includes(o.type)) continue; const d = Math.hypot(o.x - x, o.y - y) - (o.r || 20); if (d < bd) { bd = d; best = o; } }
    if (best && bd < Math.max(8, tapR * 0.6)) { if (best.type === 'home') return homeCard(best); if (best.type === 'market') return marketCard(best); if (best.type === 'vault') return vaultCard(best); if (best.type === 'lift') return liftCard(best); if (best.type === 'rift') return riftCard(best); return loreCard(best); }
    if (hollowDist(x, y) < 0) return hollowCard();
    if (Math.hypot(x, y) < CITY.R) return regionCard(regionAt(x, y));
  }
  const btnRow = (html) => `<div class="wrapgap" style="margin-top:10px">${html}</div>`;
  function historyLines(h, real) {
    const L = [];
    if (h.banners) L.push(`🚩 Banners for ${h.banners} Hollow layer${h.banners > 1 ? 's' : ''} cleared: ${CONFIG.layers.slice(0, h.banners).map((l) => l.name).join(', ')}`);
    if (h.trophies) L.push(`🦴 ${h.trophies} Rim Mole trophy${h.trophies > 1 ? ' skulls' : ' skull'} over the door`);
    if (h.battered) L.push(real ? '🧱 Your wall is still cracked from the last raid' : '🧱 The wall is battered from a recent raid');
    if (!real && h.pet) L.push(`${{ pup: '🐶', wisp: '👻', moth: '🦋', ferret: '🦦', tortoise: '🐢', kit: '🐱' }[h.pet]} A ${PET_NAMES[h.pet]} ${h.petSleep ? 'sleeps on the porch' : 'patrols the yard'}`);
    if (real) equippedPets().forEach((p) => L.push(`${CONFIG.pets[p.id].icon} ${CONFIG.pets[p.id].name} ${!heroHome() || nightFactor() > 0.5 ? 'sleeps on the porch' : 'plays in the yard'}`));
    return L.length ? `<div class="small" style="margin-top:6px">${L.join('<br>')}</div>` : '<div class="dim" style="margin-top:6px">No trophies yet. A fresh start.</div>';
  }
  function homeCard(h) {
    const R = REGIONS[h.region], sh = (S.mapShields[h.id] || 0) > S.gameTime, est = starsFor(attackPower() / h.power);
    openModal(`<h2>🏠 ${esc(h.name)}</h2><div class="small">Home of <b>${esc(h.owner)}</b> · Lv ${h.level} · ${isDiscovered(h.region) ? `${R.icon} ${R.name}` : '❔ Unexplored lands'}</div>
      <div class="wrapgap" style="margin-top:6px"><span class="tag">🛡️ Power ${h.power}</span><span class="tag">⚔️ You ${Math.round(attackPower())}</span><span class="tag ${est >= 2 ? 'good' : est === 0 ? 'bad' : ''}">Likely ${'★'.repeat(est)}${'☆'.repeat(3 - est)}</span></div>
      <div class="small" style="margin-top:6px">Resources nearby: ${isDiscovered(h.region) ? R.res.join(' · ') : '??? (explore or raid here to find out)'}</div>
      <div class="small">Full raid loot: ${lootText(mapRaidLoot(h.level, h.region))}</div>
      ${historyLines(h, false)}
      ${btnRow(`${sh ? `<span class="tag">🛡️ Shielded ${countdown(S.mapShields[h.id])}</span>` : `<button class="btn red" data-act="mapraid" data-id="${h.id}" ${!heroHome() || S.res.lumen < CONFIG.mapRaid.lumen ? 'disabled' : ''}>⚔️ Raid (${CONFIG.mapRaid.lumen} 🏮)</button>`}
        <button class="btn ghost" data-act="mapvisit" data-id="${h.id}">👋 Visit</button><button class="btn ghost" data-act="close">Close</button>`)}
      ${!heroHome() ? '<div class="dim" style="margin-top:6px">Your hero is away, so raids wait until she returns.</div>' : ''}`, 'city');
  }
  function playerCard() {
    openModal(`<h2>★ Your ${CITY.homeTerm}</h2><div class="small">Lantern Hall Lv ${S.buildings.hall} · ${REGIONS[W.player.region].icon} ${REGIONS[W.player.region].name} · 🛡️ Defense ${Math.round(defensePower())}</div>
      ${historyLines(W.player, true)}
      <div class="dim" style="margin-top:6px">Everything here reflects your real game: banners for the deepest layer ${CONFIG.hero.name} returned from, a skull for each Rim Mole beaten, cracks after a lost defense, and your equipped pets.</div>
      ${btnRow(`<button class="btn" data-act="gotab" data-id="capital">🏰 Open Capital</button><button class="btn ghost" data-act="close">Close</button>`)}`, 'city');
  }
  function marketCard(m) {
    const R = REGIONS[m.region], spike = marketSpike(m.idx), mult = spike ? CITY.spikeMult : 1, P = CONFIG.market, lot = P.lot;
    const sellMult = (R.premium ? P.premiumSellMult : P.sellMult);
    const buys = R.sells.map((k) => { const n = k === 'amber' ? 5 : lot, price = Math.ceil(P.prices[k] * n * P.buyMult * mult * (k === R.sells[0] ? 1 : 1.1)); return `<button class="btn alt sm" data-act="mbuy" data-id="${k}" data-n="${n}" data-m="${(price / (P.prices[k] * n)).toFixed(3)}">Buy ${n} ${rIco(k)} · ${price} 👑</button>`; }).join('');
    const sells = Object.keys(P.prices).filter((k) => k !== 'crowns').map((k) => { const n = k === 'amber' || k === 'steel' ? 5 : lot; const m2 = sellMult * (R.sells.includes(k) && spike ? CITY.spikeMult : 1) * (R.sells.includes(k) ? 0.8 : 1); const gain = Math.floor(P.prices[k] * n * m2);
      return `<button class="btn ghost sm" data-act="msell" data-id="${k}" data-n="${n}" data-m="${m2.toFixed(3)}" ${(S.res[k] || 0) < n ? 'disabled' : ''}>Sell ${n} ${rIco(k)} → ${gain} 👑</button>`; }).join('');
    openModal(`<h2>🏪 ${m.name}</h2><div class="small">${isDiscovered(m.region) ? `${R.icon} ${R.name} · stalls: ${R.res.join(' · ')}` : '❔ A bazaar in unexplored lands'}</div>
      ${spike ? `<div class="tag bad" style="margin-top:6px">📈 Price spike! ${CONFIG.resources[R.sells[0]].name} costs ×${CITY.spikeMult}, and the square is packed.</div>` : `<div class="dim" style="margin-top:6px">Normal trading day.${R.premium ? ' Goldenstep traders pay premium Crowns for everything you sell.' : ''}</div>`}
      ${festival() === 'harvest' && R.key === 'farms' ? '<div class="tag good" style="margin-top:4px">🌾 Harvest Fair! Extra stalls and crowds.</div>' : ''}
      <div class="small" style="margin-top:8px"><b>Buy local goods</b></div>${btnRow(buys)}
      <div class="small" style="margin-top:8px"><b>Sell to the bazaar</b></div>${btnRow(sells)}
      <div class="dim" style="margin-top:8px">You have 👑 ${fmt(S.res.crowns)} · storage cap ${fmt(storageCap())}. Caravans deliver instantly (prototype).</div>
      ${btnRow('<button class="btn ghost" data-act="close">Close</button>')}`, 'city');
    marketCard.last = m;
  }
  function vaultCard(v) {
    const lvl = S.buildings.vault || 0, block = buildBlock('vault'), cost = lvl < CONFIG.buildings.vault.max ? buildCost('vault') : null;
    openModal(`<h2>🏦 ${v.name}</h2><div class="small">${isDiscovered(v.region) ? REGIONS[v.region].icon + ' ' + REGIONS[v.region].name : '❔ Unexplored lands'}</div>
      <p class="small">Vaults are cut into the old bedrock under the Rim. Building your own <b>Rim Vault</b> raises every storage cap by <b>+${Math.round(CONFIG.vault.capPerLevel * 100)}%</b> per level and keeps <b>+${Math.round(CONFIG.vault.protectPerLevel * 100)}%</b> more of your stock safe from raiders.</p>
      <div class="wrapgap"><span class="tag">Your Vault: Lv ${lvl}</span><span class="tag">Storage cap ${fmt(storageCap())}</span><span class="tag">Raid-safe ${Math.round(protectedShare() * 100)}%</span></div>
      ${cost ? `<div class="wrapgap" style="margin-top:8px">${costHtml(cost)}<span class="dim">⏱ ${gameDur(buildTime('vault'))}</span></div>` : ''}
      ${btnRow(`${cost ? `<button class="btn" data-act="build" data-id="vault" ${block || !canAfford(cost) ? 'disabled' : ''}>${block && block !== 'Builders busy' ? block : S.build ? 'Builders busy' : lvl ? `Upgrade to Lv ${lvl + 1}` : 'Build your Vault'}</button>` : '<span class="tag good">Max level</span>'}<button class="btn ghost" data-act="close">Close</button>`)}`, 'city');
  }
  function liftCard(L) {
    openModal(`<h2>🧵 ${L.name}</h2><p class="small">A public Tether lift on the lip of the Hollow. Cages go down to the Terraces and back all day. Your own Spine is the Tether Lift in your capital (Lv ${S.buildings.lift}, reaches layer ${liftReach()}).</p>
      ${btnRow('<button class="btn deep" data-act="gotab" data-id="hollow">🕳️ Go to the Hollow</button><button class="btn ghost" data-act="close">Close</button>')}`, 'city');
  }
  function loreCard(o) { const L = LORE[o.type]; openModal(`<h2>${o.type === 'statue' ? '🗿' : o.type === 'memorial' ? '🕯️' : '🚪'} ${L.title}</h2><p>${L.text}</p>${o.type === 'memorial' ? `<p class="dim">${S.stats.expeditions} of your expeditions have returned. Wren's name is not on the Wall.</p>` : ''}${btnRow('<button class="btn ghost" data-act="close">Close</button>')}`, 'city'); }
  function riftCard(o) { discoverRegion(o.region); const d = Math.round(Math.hypot(o.x, o.y) / 100) / 10;
    openModal(`<h2>✨ ${o.name}</h2><p class="small">A fissure far out in the lands, ${d} leagues from the Hollow's lip. Cold air breathes out of it, and deep down the walls glow with the same Lumen as the Hollow. Delvers swear the cracks out here all run back to it underground, and that a brave rope team could go down this way.</p><p class="dim">Nobody has charted a way through yet.</p>${btnRow('<button class="btn deep" data-act="gotab" data-id="hollow">🕳️ Go to the Hollow</button><button class="btn ghost" data-act="close">Close</button>')}`, 'city'); }
  function hollowCard() { openModal(`<h2>🕳️ The Hollow</h2><p class="small">A chasm with no bottom anyone has seen. Lumen glows in its depths; the layers step down like terraces: ${CONFIG.layers.map((l) => l.name).join(' → ')} → …</p><p class="dim">Sky-fish surge out of it at nightfall. Lightning sometimes flickers far below.</p>${btnRow('<button class="btn deep" data-act="gotab" data-id="hollow">Send Wren down</button><button class="btn ghost" data-act="close">Close</button>')}`, 'city'); }
  function regionCard(i) {
    const R = REGIONS[i];
    if (!isDiscovered(i)) return openModal(`<h2>❔ Unexplored lands</h2><p class="small">Nobody you know has mapped this stretch of the Rim yet. Linger here with the map zoomed in, raid a Lanternhold, or fight what digs up out of the ground to learn what the land holds.</p><div class="wrapgap"><span class="tag">??? resources</span><span class="tag">??? bazaar</span></div>${btnRow('<button class="btn ghost" data-act="close">Close</button>')}`, 'city');
    const n = W.homes.filter((h) => h.region === i).length, m = W.markets.find((mm) => mm.region === i);
    openModal(`<h2>${R.icon} ${R.name}</h2><p class="small">${R.blurb}</p><div class="wrapgap">${R.res.map((r) => `<span class="tag">${r}</span>`).join('')}</div>
      <div class="dim" style="margin-top:6px">${n} ${CITY.homeTerm}s · Bazaar trades ${R.sells.map((k) => CONFIG.resources[k].icon + ' ' + CONFIG.resources[k].name).join(', ')}${R.key === 'bluffs' && frostLevel() > 0 ? ' · ❄️ frost is creeping in' : ''}</div>
      ${btnRow(`${m ? `<button class="btn alt" data-act="mopen" data-id="${m.idx}">🏪 Open ${m.name}</button>` : ''}<button class="btn ghost" data-act="close">Close</button>`)}`, 'city');
  }
  function npcCard(n, t) {
    const lines = n.npc.id === 'kip' ? [currentRumor || 'Nothing new on the Rim!'] : n.npc.lines; const line = lines[n.talk % lines.length]; n.talk++;
    bubbles.set(n.npc.id, { text: line.length > 54 ? line.slice(0, 52) + '…' : line, until: t + 5 });
    const extra = n.npc.id === 'greta' ? `<button class="btn alt" data-act="mopen" data-id="${W.markets.findIndex((m) => m.region === 0)}">🏪 Docks Bazaar</button>` : n.npc.id === 'hennick' ? `<button class="btn" data-act="vopen">🏦 About Vaults</button>` : n.npc.id === 'juniper' ? `<button class="btn alt" data-act="mopen" data-id="${W.markets.findIndex((m) => m.region === 5)}">🏪 Goldenstep Bazaar</button>` : '';
    openModal(`<h2>${n.npc.icon} ${n.npc.name}</h2><div class="dim">${n.npc.role}</div><p style="font-family:Georgia,serif;font-size:16px;margin:10px 0">“${esc(line)}”</p>
      ${btnRow(`<button class="btn ghost" data-act="npcmore" data-id="${n.npc.id}">💬 Keep talking</button>${extra}<button class="btn ghost" data-act="close">Close</button>`)}`, 'city');
  }
  function moleCard(m) {
    const P = molePower(), ch = clamp(attackPower() / P, 0.15, 0.95);
    openModal(`<h2>⚠️ A Rim Mole surfaced!</h2><div class="scene paint molescene">${pic('molebg', 'bg')}${pic('wren_b', 'fighter')}</div><p class="small">A house-sized mole has burst out of a fissure in <b>${REGIONS[m.region].name}</b>. Half the street has come out to watch. It digs back down in ${countdown(m.end)}.</p>
      <div class="wrapgap"><span class="tag bad">Mole power ${P}</span><span class="tag">You ${Math.round(attackPower())}</span><span class="tag">~${Math.round(ch * 100)}% to win</span></div>
      <div class="dim" style="margin-top:6px">Win: Crowns, Amber, Iron, a skull trophy for your ${CITY.homeTerm} and big XP. Lose: Wren limps home with a little loot.</div>
      ${btnRow(`<button class="btn red" data-act="molefight" data-id="${m.k}" ${!heroHome() ? 'disabled' : ''}>⚔️ Join the fight</button><button class="btn ghost" data-act="close">Close</button>`)}`, 'city');
  }
  function journalModal() {
    const J = S.journal || [];
    openModal(`<h2>📔 ${CONFIG.hero.name}'s Journal</h2><div class="dim">${CONFIG.hero.name} writes an entry whenever you come back after time away.</div>
      <div class="log" style="max-height:60vh">${J.map((e) => `<div style="padding:8px 0"><span class="t">Day ${e.day} · ${new Date(e.real).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span><div style="font-family:Georgia,serif">${e.text}</div></div>`).join('') || '<div class="dim">No entries yet. Leave for a while and come back.</div>'}</div>
      ${btnRow('<button class="btn ghost" data-act="close">Close</button>')}`, 'city');
  }
  function seasonModal() {
    const si = seasonInfo();
    openModal(`<h2>${SEASONS[si.idx].icon} Seasons & festivals</h2><p class="small">Now: <b>${SEASONS[si.idx].name}</b>${festival() ? ` · ${festival() === 'lumen' ? '🏮 Lumen Festival' : '🌾 Harvest Fair'}` : ''}. ${si.forced ? 'Debug override is ON.' : `Next season in ${realLeft(S.gameTime + si.nextIn)} real.`}</p>
      <div class="dim">The cycle: 🌸 Bloomtide → ☀️ Lumen Summer (Lumen Festival late in the season) → 🍂 Ambertide (Harvest Fair mid-season) → ❄️ Frostfall (frost creeps over the Bluffs). Each season lasts ${S.testMode ? CITY.testSeasonDays : CITY.seasonDays} game day(s)${S.testMode ? ' in test mode' : ''}.</div>
      <div class="small" style="margin-top:8px"><b>Debug</b></div>
      ${btnRow(`<button class="btn ghost sm" data-act="season" data-id="next">Next season ⏭</button><button class="btn ghost sm" data-act="season" data-id="fest">${S.festivalOverride ? 'Festival OFF' : 'Force festival 🎉'}</button><button class="btn ghost sm" data-act="season" data-id="night">Skip to dusk 🌆</button><button class="btn ghost sm" data-act="season" data-id="deep">Nightfall 🌙</button><button class="btn ghost sm" data-act="season" data-id="auto">Follow clock ↺</button>`)}
      ${btnRow('<button class="btn ghost" data-act="close">Close</button>')}`, 'city');
  }
  function onAct(act, ds) {
    switch (act) {
      case 'mapraid': { const h = W.homes[+ds.id]; closeModalQuiet(); discoverRegion(h.region); return startMapRaid(h); }
      case 'mapvisit': { const h = W.homes[+ds.id]; toast(`👋 ${h.owner} waves from the window. (Visiting is coming soon.)`); return; }
      case 'mbuy': marketBuy(ds.id, +ds.n, +ds.m); if (marketCard.last) marketCard(marketCard.last); return;
      case 'msell': marketSell(ds.id, +ds.n, +ds.m); if (marketCard.last) marketCard(marketCard.last); return;
      case 'mopen': return marketCard(W.markets[+ds.id]);
      case 'vopen': return vaultCard(W.vaults[0]);
      case 'gotab': closeModalQuiet(); return setTab(ds.id);
      case 'npcmore': { const n = W.npcs.find((x) => x.npc.id === ds.id); return npcCard(n, performance.now() / 1000); }
      case 'molefight': { const m = currentMole(); if (!m) return toast('The mole has gone back down.'); closeModalQuiet(); return startMoleFight(m); }
      case 'season': { if (ds.id === 'next') { const si = seasonInfo(); S.seasonOverride = (si.idx + 1) % 4; }
        else if (ds.id === 'fest') { S.festivalOverride = !S.festivalOverride; if (S.seasonOverride == null) S.seasonOverride = seasonInfo().idx; if (S.festivalOverride && S.seasonOverride !== 1 && S.seasonOverride !== 2) S.seasonOverride = 1; }
        else if (ds.id === 'deep') { const h = hourOfDay(); simulate(((19.4 - h + 24) % 24) * HOUR); toast('🌙 Skipped ahead to nightfall'); }
        else if (ds.id === 'night') { const h = hourOfDay(); const d = ((17.6 - h + 24) % 24) * HOUR; simulate(d); toast('🌆 Skipped ahead to dusk'); }
        else { S.seasonOverride = null; S.festivalOverride = false; }
        save(); return seasonModal(); }
    }
    return false;
  }
  return { show, hide, onAct, flyTo, cam, st, get fps() { return fps; }, w2s, s2w, handleTap, get tiles() { return tiles.size; }, homeCard, marketCard, currentRumor: () => currentRumor };
})();

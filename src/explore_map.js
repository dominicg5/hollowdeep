/* ---------- Explore: the Map screen - a full-screen stylized 2D map drawn from the nav grid / heightfield (toon hypsometric tint + hillshade, cliffs, water,
   crevices, the footpath network, every bridge marked), labelled places and Wren's marker; tap anywhere -> A* travel (snapped to the nearest reachable spot)
   with the route drawn and an ETA (walk / run pace; climb pitches at the equipped Climbing Pick grade); a progress chip with cancel stays on the Explore view.
   Travel destinations are plain world points {x, y, label} (TRAVEL.dest), so a later teleport - e.g. to a Ledge Tether end dropped anywhere - can reuse them. ---------- */
const ExMap = (() => {
  const st = { open: false, base: null, bw: 0, bh: 0, view: null, trip: null, ptr: new Map(), lastTap: null, marks: {} };
  function markImg(name) { if (!name) return null; let im = st.marks[name]; if (im) return im.complete && im.naturalWidth ? im : null; im = new Image(); im.src = 'assets/ui/icons/' + name + '.webp'; im.onload = () => { if (st.open) draw(); }; st.marks[name] = im; return null; }
  function pin(g, x, y, emo, col) { g.save(); g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(x + 1, y + 2, 15, 0, 6.3); g.fill(); g.fillStyle = col; g.strokeStyle = '#fff1d0'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 14, 0, 6.3); g.fill(); g.stroke(); g.strokeStyle = '#3a2a18'; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, 15.8, 0, 6.3); g.stroke(); g.font = '16px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(emo, x, y + 1); g.restore(); return true; } // a drawn marker disc (no image) in the markers' size and frame
  function blit(g, name, x, y, s) { const im = markImg(name); if (!im) return false; const w = s || 36; g.drawImage(im, x - w / 2, y - w / 2, w, w); return true; }
  const PAL = [[0, [78, 128, 64]], [0.25, [112, 156, 76]], [0.45, [164, 176, 96]], [0.62, [176, 150, 104]], [0.78, [150, 136, 124]], [0.9, [206, 202, 198]], [1, [246, 246, 250]]];
  const palAt = (t) => { for (let i = 1; i < PAL.length; i++) if (t <= PAL[i][0]) { const [a, A] = PAL[i - 1], [b, B] = PAL[i], u = (t - a) / (b - a); return [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u, A[2] + (B[2] - A[2]) * u]; } return PAL[PAL.length - 1][1]; };
  // ---- the base picture: one texel per 2x2 nav cells
  function baseImage() { if (st.base) return st.base; const NV = Explore.build(), { nx, ny, cls, h } = NV, K = 2, bw = Math.ceil(nx / K), bh = Math.ceil(ny / K), cv = document.createElement('canvas'); cv.width = bw; cv.height = bh;
    const g = cv.getContext('2d'), img = g.createImageData(bw, bh), D = img.data; let h0 = 1e9, h1 = -1e9; for (let k = 0; k < nx * ny; k += 7) if (cls[k]) { const hv = NV.h0 != null ? NV.h0 + h[k] * NV.hs : h[k]; h0 = Math.min(h0, hv); h1 = Math.max(h1, hv); } /* (nav heights are stored quantised) */
    const C = Explore.C, R = Explore.REG, wet = (x, y) => typeof GRAND !== 'undefined' && GRAND.spec && GRAND.wet(x, y, 0), cr = typeof CITY !== 'undefined' ? CITY.R : 1e9;
    for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) { const ci = Math.min(nx - 1, i * K), cj = Math.min(ny - 1, j * K), k = cj * nx + ci, x = R.X0 + ci * C, y = R.Y0 + cj * C, o = (j * bw + i) * 4; let c;
      const r = Math.hypot(x, y); if (r > cr) { c = [24, 30, 44]; }
      else { const hk = M3.meshH(x, y), hx = M3.meshH(x + C * K, y), hy = M3.meshH(x, y + C * K), sh = Math.max(0.45, Math.min(1.35, 1 + ((hk - hx) * 0.8 + (hk - hy) * 0.5) / (C * K) * 0.9)), bands = Math.floor(sh * 5) / 5;
        if (cls[k]) { c = palAt(Math.max(0, Math.min(1, (hk - h0) / (h1 - h0 || 1)))); const s2 = 0.65 * sh + 0.35 * bands; c = c.map((v) => v * s2); if (cls[k] === 2) c = [c[0] * 0.8 + 30, c[1] * 0.78 + 18, c[2] * 0.75 + 10]; }
        else if (wet(x, y)) c = [70, 168, 196];
        else if (typeof hollowDist === 'function' && hollowDist(x, y) < 0) c = [20, 16, 28];
        else { const t = Math.max(0, Math.min(1, (hk - h0) / (h1 - h0 || 1))); c = [96 + t * 60, 86 + t * 56, 80 + t * 56].map((v) => v * (0.55 + 0.45 * sh)); if ((i + j) % 6 === 0) c = c.map((v) => v * 0.85); } }
      if (r <= cr && typeof FORGE !== 'undefined' && FORGE.mapTint) { const t = FORGE.mapTint(x, y, c); if (t) c = t; } /* (Dominic t565u) his volcano: lava, cone, charred ground */
      D[o] = c[0]; D[o + 1] = c[1]; D[o + 2] = c[2]; D[o + 3] = 255; }
    g.putImageData(img, 0, 0); return (st.base = { cv, bw, bh, K }); }
  // ---- view transform (world <-> screen)
  const W2S = (x, y) => { const v = st.view; return [(x - v.cx) * v.s + v.W / 2, (y - v.cy) * v.s + v.H / 2]; }, S2W = (sx, sy) => { const v = st.view; return [(sx - v.W / 2) / v.s + v.cx, (sy - v.H / 2) / v.s + v.cy]; };
  function labels() { const L = [], P = Explore.places(), by = (id) => P.find((q) => q.id === id);
    const ledge = by('ledge'); if (ledge) L.push({ x: ledge.ox, y: ledge.oy, t: '🏠 Your Ledge', k: 'home' }); const tr = by('tree'); if (tr) L.push({ x: tr.ox, y: tr.oy, t: '🌳 Lumen Tree', k: 'tree' });
    const ci = by('city'); if (ci) L.push({ x: ci.ox, y: ci.oy, t: '🏘️ Ledgeville', k: 'city' }); const ss = by('silverseam'); if (ss) L.push({ x: ss.ox, y: ss.oy, t: '⛺ Silverseam portaledge', k: 'ss' });
    if (Explore.tetherList) for (const t of Explore.tetherList()) if (!t.camp && t.kind !== 'door' && isFinite(t.x)) L.push({ x: t.x, y: t.y, t: (t.kind === 'drop' ? '🪢 ' : '🛠️ ') + t.name, k: 'teth', kind: t.kind }); // every tether end, by its (renamable) name; kind picks the marker
    if (typeof Mosby !== 'undefined' && Mosby.MS && Mosby.MS.trip && Mosby.MS.at) L.push({ x: Mosby.MS.at.x, y: Mosby.MS.at.y, t: Mosby.MS.trip.done ? '🏠 Your house (on Mosby\'s cousin)' : '🏠 Your house, on the move', k: 'tort' });
    if (typeof Mosby !== 'undefined' && Mosby.GM && Mosby.GM.at) L.push({ x: Mosby.GM.at.x, y: Mosby.GM.at.y, t: '🐢 Mosby', k: 'mosby' }); // the giant tortoise, where he is now (tap: walk to him)
    if (typeof MILL !== 'undefined' && MILL.F) { const [x, y] = MILL.wld(10, 6); L.push({ x, y, t: '⚙️ Tether Mill', k: 'mill' }); }
    if (typeof FORGE !== 'undefined' && FORGE.M && FORGE.M.ape) { const q = FORGE.M.ape.position; L.push({ x: q.x, y: q.z, t: '🌋 Theus', k: 'theus' }); } // (Dominic t565u) Theus at his forge on the volcano // the water-powered Tether Mill at the stream bend
    return L; } // labels only for the key places; bridges are drawn as part of the path network
  function draw() { const cv = st.cv; if (!cv) return; const g = cv.getContext('2d'), v = st.view, B = baseImage(), dpr = v.dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = '#18202e'; g.fillRect(0, 0, v.W, v.H);
    const R = Explore.REG, C = Explore.C, [ox, oy] = W2S(R.X0, R.Y0), sc = v.s * C * B.K; g.imageSmoothingEnabled = true; g.drawImage(B.cv, ox, oy, B.bw * sc, B.bh * sc);
    const line = (pts, w, col, dash) => { g.beginPath(); pts.forEach(([x, y], i) => { const [a, b] = W2S(x, y); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.lineWidth = w; g.strokeStyle = col; g.setLineDash(dash || []); g.stroke(); g.setLineDash([]); };
    g.lineCap = g.lineJoin = 'round';
    for (const c of W.cracks || []) line(c.pts, Math.max(1.2, 30 * v.s), 'rgba(12,8,16,.85)'); // crevices
    const PW = Math.max(1.4, Math.min(4, 22 * v.s));
    if (M3.VR) for (const [, , Pv] of M3.VR.list) { line(Pv, PW + 1.6, 'rgba(70,48,24,.55)'); line(Pv, PW, '#e2c890'); } // the two remaining route treads (the E-basin rock scramble, the forge switchback)
    for (const Bq of Explore.BRIDGES) { if (!Bq.a || Bq.a[0] > 1e6) continue; line([Bq.a, Bq.b], PW + 2.4, 'rgba(70,48,24,.75)'); line([Bq.a, Bq.b], PW + 0.6, '#c9a46a'); } // bridges: a plank-toned stretch
    const strokeTether = (t) => {
      const pts = t.pts; if (!pts || pts.length < 2) return;
      let grade = 'mithril', dirA = 'to', dirB = 'from';
      try { const tw = CharView.twinOf((CharView.homeState().ports || {})[t.port] || {}); if (tw.a && tw.a.grade) grade = tw.a.grade; if (tw.a && tw.a.dir) dirA = tw.a.dir; if (tw.b && tw.b.dir) dirB = tw.b.dir; } catch (e) {}
      const tile = (dir) => markImg('tether_line_' + grade + '_' + (dir === 'from' ? 'push' : 'pull'));
      const drawStrand = (im, off) => { if (!im) return false; const nx = [], ny = [];
        for (let i = 0; i < pts.length; i++) { const [x0, y0] = W2S(pts[Math.max(0, i - 1)][0], pts[Math.max(0, i - 1)][1]), [x1, y1] = W2S(pts[Math.min(pts.length - 1, i + 1)][0], pts[Math.min(pts.length - 1, i + 1)][1]); const L = Math.hypot(x1 - x0, y1 - y0) || 1; nx.push(-(y1 - y0) / L * off); ny.push((x1 - x0) / L * off); }
        g.save(); g.lineWidth = 0; for (let i = 1; i < pts.length; i++) { const a = W2S(pts[i - 1][0], pts[i - 1][1]), b = W2S(pts[i][0], pts[i][1]); const x0 = a[0] + nx[i - 1], y0 = a[1] + ny[i - 1], x1 = b[0] + nx[i], y1 = b[1] + ny[i]; const len = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0); if (len < 1) continue; const th = 8; g.save(); g.translate(x0, y0); g.rotate(ang); const tw = im.width, thp = im.height, sc = th / thp, span = tw * sc; let x = 0; while (x < len) { g.drawImage(im, x, -th / 2, Math.min(span, len - x), th); x += span; } g.restore(); }
        g.restore(); return true; };
      const imA = tile(dirA), imB = tile(dirB);
      if (!imA && !imB) { line(pts, 3.4, 'rgba(10,20,40,.55)'); line(pts, 1.8, '#9cc0e6'); return; }
      if (imA) drawStrand(imA, -2.5); if (imB) drawStrand(imB, 2.5);
    };
    if (Explore.tetherList) for (const t of Explore.tetherList()) if (t.kind === 'drop' || t.kind === 'drill') strokeTether(t);
    if (typeof S !== 'undefined' && S.mosbyTrip && S.mosbyTrip.pts) { line(S.mosbyTrip.pts, 5, 'rgba(0,0,0,.35)'); line(S.mosbyTrip.pts, 3, '#6fbf5a', [10, 6]); } // the transport tortoise's route with her house
    const T = st.trip; if (T && T.P) { line(T.P.pts, 5, 'rgba(0,0,0,.35)'); line(T.P.pts, 3, '#ff6a3d', [8, 6]); const [dx, dy] = W2S(T.dest.x, T.dest.y); g.fillStyle = '#ff6a3d'; g.beginPath(); g.arc(dx, dy, 6, 0, 6.3); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); }
    // ore spots: a small crystal per cluster (copper orange, tin silver-blue, coal black); cliff veins get a dashed ring (seen, not yet minable)
    if (Explore.oreSpots) { const r = Math.max(16, Math.min(28, v.s * 90)); for (const p of Explore.oreSpots()) { if (Explore.ORE.pruned && p.nodes && !p.nodes.length) continue; const [x, y] = W2S(p.x, p.y); if (x < -10 || y < -10 || x > v.W + 10 || y > v.H + 10) continue; if (!blit(g, 'map_vein_' + p.type, x, y, r)) blit(g, 'map_ore_vein', x, y, r); }
    }
    const MK = { home: 'map_home_ledge', tort: 'map_home_ledge', tree: 'map_lumen_tree', city: 'map_town', ss: 'map_portaledge', drop: 'map_drop_tether_end', drill: 'map_drill', teth: 'map_drop_tether_end', mosby: 'map_mosby', mill: 'map_tether_mill', theus: 'map_theus' };
    g.font = '600 12px system-ui,sans-serif'; g.textAlign = 'center'; for (const L of labels()) { const [x, y] = W2S(L.x, L.y); if (x < -80 || y < -20 || x > v.W + 80 || y > v.H + 20) continue; const icon = L.k === 'mosby' && typeof Mosby !== 'undefined' && Mosby.GM && Mosby.GM.walk ? 'map_mosby_transit' : (L.k === 'teth' && L.kind === 'drill' ? 'map_drill' : MK[L.k]); const shown = (icon && blit(g, icon, x, y, 36)) ; const w = g.measureText(L.t).width + 12; g.fillStyle = L.k === 'bridge' ? 'rgba(90,58,28,.88)' : 'rgba(246,236,212,.94)'; g.beginPath(); g.roundRect ? g.roundRect(x - w / 2, y - (shown ? 40 : 26), w, 18, 9) : g.rect(x - w / 2, y - (shown ? 40 : 26), w, 18); g.fill(); g.fillStyle = L.k === 'bridge' ? '#fff1d0' : '#3a2a18'; g.fillText(L.t, x, y - (shown ? 27 : 13)); if (!shown) { g.fillStyle = '#3a2a18'; g.beginPath(); g.arc(x, y, 3, 0, 6.3); g.fill(); } }
    const h = Explore.here(); if (h) { const [x, y] = W2S(h[0], h[1]), G = CharView.st.gnd, f = G ? G.face : 0; if (!blit(g, 'map_player', x, y, 40)) { g.save(); g.translate(x, y); g.rotate(-f + Math.PI); g.fillStyle = '#2f6fe0'; g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, -11); g.lineTo(8, 8); g.lineTo(0, 4); g.lineTo(-8, 8); g.closePath(); g.fill(); g.stroke(); g.restore(); } }
    chip(); }
  // ---- ETA: walk / run pace on the ground, the Climbing Pick grade's pace on climb pitches (3D length), deck = ground
  const CLIMB_MPS = { stone: 1.1, bronze: 1.4, iron: 1.5, steel: 1.6, gold: 1.7, mithril: 1.85, rune: 2.0, lumen: 2.15, onyx: 2.3 };
  function eta(P) { const WS = Explore.WS, gait = (CharView.st && CharView.st.gait) || 'run', K = (typeof CharView !== 'undefined' && CharView.EXK) || 1, vG = ((CharView.GW && CharView.GW.spd) || 3.7) * K /* she always runs */, vC = 0.795 * (CharView.climbFacFor ? CharView.climbFacFor(true) : ((CharView.CLIMB_EX) || 0.6) * 1.56) * K; /* (locked: the same climbFac her wall climb uses, CLIMB_EX x 1.56) */ /* her climbing pace: its own gait rate (CharView.CLIMB_EX), not the run speed */ /* her real pace: the ground speed scaled by her map body scale (EXK), 0.35x on a climb - along the planned path, not the straight line */ let t = 0, Lg = 0, Lc = 0;
    for (let i = 0; i + 1 < P.pts.length; i++) { const [ax, ay] = P.pts[i], [bx, by] = P.pts[i + 1], L = Math.hypot(bx - ax, by - ay) / WS, c = Explore.clsAt((ax + bx) / 2, (ay + by) / 2); if (c === 2) { const dh = Math.abs(Explore.hAt(bx, by) - Explore.hAt(ax, ay)) / WS, l3 = Math.hypot(L, dh); Lc += l3; t += l3 / vC; } else { Lg += L; t += L / vG; } }
    return { s: t, ground: Lg, climb: Lc, gait, climbGrade: S.climbGrade }; }
  const TRAVEL = { dest: null, mode: 'walk' }; // dest: any world point {x, y, label}; mode 'walk' only for now ('teleport' reserved)
  function travelTo(x, y, label) { if (!Explore.on) return null; const [rx, ry] = Explore.reach(x, y), snapped = Math.hypot(rx - x, ry - y) > Explore.C * 1.5; const done = () => { if (st.trip) st.trip.done = true; chip(); };
    const P = Explore.goTo(rx, ry, done); if (!P) return null; TRAVEL.dest = { x: rx, y: ry, label: label || null }; const E = eta(P); let L = 0; for (let i = 0; i + 1 < P.pts.length; i++) L += Math.hypot(P.pts[i + 1][0] - P.pts[i][0], P.pts[i + 1][1] - P.pts[i][1]);
    st.trip = { dest: TRAVEL.dest, P, eta: E, len: L, t0: performance.now(), snapped, done: false, tap: [x, y] }; draw(); chip(); return st.trip; }
  function progress() { const T = st.trip; if (!T) return 0; if (T.done) return 1; const h = Explore.here(); if (!h) return 0; let best = 1e18, bi = 0; for (let i = 0; i < T.P.pts.length; i++) { const d = Math.hypot(T.P.pts[i][0] - h[0], T.P.pts[i][1] - h[1]); if (d < best) { best = d; bi = i; } }
    let rem = 0; for (let i = bi; i + 1 < T.P.pts.length; i++) rem += Math.hypot(T.P.pts[i + 1][0] - T.P.pts[i][0], T.P.pts[i + 1][1] - T.P.pts[i][1]); return Math.max(0, Math.min(1, 1 - rem / (T.len || 1))); }
  function cancel() { const G = CharView.st.gnd; if (G) { G.path = null; G.goal = null; } st.trip = null; TRAVEL.dest = null; if (Explore.EX.mark) Explore.EX.mark.visible = false; chip(); if (st.open) draw(); }
  const mmss = (s) => { s = Math.max(0, Math.round(s)); return s >= 3600 ? Math.floor(s / 3600) + 'h ' + String(Math.floor(s / 60) % 60).padStart(2, '0') + 'm' : Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  function chip() { let c = document.getElementById('exTrip'); const T = st.trip; if (!T || !Explore.on) { if (c) c.classList.remove('on'); return; }
    if (!c) { c = document.createElement('div'); c.id = 'exTrip'; (document.getElementById('cityWrap') || document.body).appendChild(c); c.addEventListener('click', (e) => { if (e.target.closest('[data-trip=cancel]')) cancel(); else if (e.target.closest('[data-trip=map]')) open(); }); }
    const pr = progress(), left = T.eta.s * (1 - pr); c.classList.add('on'); c.classList.toggle('done', !!T.done);
    c.innerHTML = `<button data-trip="map" class="tpm">🗺️</button><div class="tpt"><b>${T.done ? 'Arrived' : (T.dest.label ? '→ ' + T.dest.label : 'Travelling')}</b><small>${T.done ? '' : 'ETA ' + mmss(left) + ' · '}${Math.round(pr * 100)}%${T.eta.climb > 1 ? ' · climbs ' + Math.round(T.eta.climb) + ' m' : ''}${T.snapped ? ' · nearest reachable spot' : ''}</small><i style="width:${(pr * 100).toFixed(1)}%"></i></div><button data-trip="cancel" class="tpx" aria-label="Cancel travel">✕</button>`; if (T.done) setTimeout(() => { if (st.trip === T) { st.trip = null; chip(); } }, 2500); }
  setInterval(() => { if (st.trip && Explore.on) { chip(); if (st.open) draw(); } else if (st.trip && !Explore.on) chip(); }, 500); // travel carries on while the player is idle; the chip just reports it
  // ---- the screen
  function fit() { const R = Explore.REG, cr = typeof CITY !== 'undefined' ? Math.min(CITY.R, R.X1) : R.X1, v = st.view; v.s0 = Math.min(v.W, v.H) / (2 * cr * 1.04); const h = Explore.here() || [0, 0]; v.s = v.s0 * 2; v.cx = h[0] * 0.6; v.cy = h[1] * 0.6; } // opens zoomed in a little towards Wren; − shows the whole land
  function open() { if (!Explore.on) return false; let el = document.getElementById('exMap'); if (!el) { el = document.createElement('div'); el.id = 'exMap';
      el.innerHTML = '<canvas></canvas><div class="exmTop"><b>🗺️ Map</b><span class="dim">Tap to travel there</span><button data-exm="in">+</button><button data-exm="out">−</button><button data-exm="me">◎</button><button data-exm="close">✕</button></div><div class="exmLeg"><span><i style="background:#e2c890"></i>Paths &amp; bridges</span><span><i style="background:#46a8c4"></i>Water</span><span><i style="background:#0c0810"></i>Crevice</span><span><i style="background:#2f6fe0"></i>You</span></div>';
      (document.getElementById('cityWrap') || document.body).appendChild(el); st.cv = el.querySelector('canvas');
      el.addEventListener('click', (e) => { const b = e.target.closest('[data-exm]'); if (!b) return; const k = b.dataset.exm; if (k === 'close') close(); else if (k === 'in' || k === 'out') zoomAt(st.view.W / 2, st.view.H / 2, k === 'in' ? 1.6 : 1 / 1.6); else if (k === 'me') { const h = Explore.here(); st.view.cx = h[0]; st.view.cy = h[1]; st.view.s = Math.max(st.view.s, st.view.s0 * 4); draw(); } });
      const cv = st.cv; cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); st.ptr.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: performance.now() }); });
      cv.addEventListener('pointermove', (e) => { const p = st.ptr.get(e.pointerId); if (!p) return; const pts = [...st.ptr.values()];
        if (pts.length === 1) { st.view.cx -= (e.clientX - p.x) / st.view.s; st.view.cy -= (e.clientY - p.y) / st.view.s; }
        else if (pts.length === 2) { const o = pts.find((q) => q !== p), d0 = Math.hypot(p.x - o.x, p.y - o.y), d1 = Math.hypot(e.clientX - o.x, e.clientY - o.y), r = cv.getBoundingClientRect(); if (d0 > 5) zoomAt((e.clientX + o.x) / 2 - r.left, (e.clientY + o.y) / 2 - r.top, d1 / d0, true); }
        p.x = e.clientX; p.y = e.clientY; draw(); });
      const up = (e) => { const p = st.ptr.get(e.pointerId); st.ptr.delete(e.pointerId); if (!p || st.ptr.size) return; if (Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 8 && performance.now() - p.t < 600) { const r = cv.getBoundingClientRect(), [x, y] = S2W(e.clientX - r.left, e.clientY - r.top); tapAt(x, y); } };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', (e) => st.ptr.delete(e.pointerId));
      cv.addEventListener('wheel', (e) => { e.preventDefault(); const r = cv.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false }); }
    el.classList.add('on'); st.open = true; const r = el.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1); st.cv.width = r.width * dpr; st.cv.height = r.height * dpr; st.cv.style.width = r.width + 'px'; st.cv.style.height = r.height + 'px';
    if (!st.view) { st.view = { W: r.width, H: r.height, dpr }; fit(); } else Object.assign(st.view, { W: r.width, H: r.height, dpr }); draw(); return true; }
  function zoomAt(sx, sy, k, quiet) { const v = st.view, [wx, wy] = S2W(sx, sy); v.s = Math.max(v.s0 * 0.8, Math.min(v.s0 * 60, v.s * k)); v.cx = wx - (sx - v.W / 2) / v.s; v.cy = wy - (sy - v.H / 2) / v.s; if (!quiet) draw(); }
  // pick mode (Mosby's move): the next tap picks a spot instead of travelling there
  function pick(cb, onCancel) { st.pick = { cb, onCancel }; const ok = open(); const el = document.getElementById('exMap'); if (el) { el.classList.add('pick'); const d = el.querySelector('.exmTop .dim'); if (d) d.textContent = 'Tap where your home should go'; } return ok; }
  function tapAt(x, y) { if (st.pick) { const P = st.pick; st.pick = null; close(); P.cb(x, y); return { picked: [x, y] }; } const L = labels().find((q) => { const a = W2S(q.x, q.y), b = W2S(x, y); return Math.hypot(a[0] - b[0], a[1] - b[1]) < 22; }); if (L && L.k === 'mosby' && typeof Mosby !== 'undefined') { close(); return Mosby.meet(); } return travelTo(L ? L.x : x, L ? L.y : y, L ? L.t.replace(/^\S+\s/, '') : null); }
  function close() { const el = document.getElementById('exMap'); if (el) { el.classList.remove('on'); el.classList.remove('pick'); const d = el.querySelector('.exmTop .dim'); if (d) d.textContent = 'Tap to travel there'; } st.open = false; if (st.pick) { const P = st.pick; st.pick = null; if (P.onCancel) P.onCancel(); } }
  return { st, TRAVEL, labels, open, close, draw, travelTo, tapAt, pick, cancel, eta, progress, baseImage, W2S, S2W, CLIMB_MPS };
})();

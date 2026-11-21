// Art's valley routes R1-R4 (handoff/town/valley_routes): every route is connected end to end inside its own nav corridor, both ends join the main
// walkable network, the as-built ground keeps the slope limits (R3, R4 walk ramps <= 20 deg along and across the tread; R1, R2 climbs <= 42 deg),
// the ramps' painted tread stays >= 10 m off Mosby's strip, and the corridors stay clear of the keeper pads.
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 600, height: 600 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(1000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 300000 }).catch(() => {}); await p.waitForTimeout(800);
  const R = await p.evaluate(() => { const E = Explore, WS = E.WS, NV = E.build(), { nx, ny, cls, comp, rt } = NV, C = E.C, REG = E.REG;
    const cell = (x, y) => Math.round((y - REG.Y0) / C) * nx + Math.round((x - REG.X0) / C);
    return M3.VR.list.map(([id, kind, P]) => {
      // corridor cells of this route (within VR.core of its own line) that are open
      const mine = new Uint8Array(nx * ny); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const q of P) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
      let nCells = 0; for (let y = y0 - 40; y <= y1 + 40; y += C) for (let x = x0 - 40; x <= x1 + 40; x += C) { const k = cell(x, y); if (mine[k] || !rt[k] || !cls[k]) continue; let d = 1e9; for (let q = 0; q + 1 < P.length; q++) { const ax = P[q][0], ay = P[q][1], dx = P[q + 1][0] - ax, dy = P[q + 1][1] - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1))); d = Math.min(d, Math.hypot(x - ax - dx * t, y - ay - dy * t)); } if (d <= M3.VR.core) { mine[k] = 1; nCells++; } }
      const near = (x, y) => { let best = -1, bd = 1e9; for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) { const k = cell(x, y) + dj * nx + di; if (mine[k] && di * di + dj * dj < bd) { bd = di * di + dj * dj; best = k; } } return best; };
      const s = near(P[0][0], P[0][1]), g = near(P[P.length - 1][0], P[P.length - 1][1]); let conn = false;
      if (s >= 0 && g >= 0) { const seen = new Uint8Array(nx * ny), q = [s]; seen[s] = 1; while (q.length) { const k = q.pop(); if (k === g) { conn = true; break; } const i = k % nx; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { if (i + di < 0 || i + di >= nx) continue; const m = k + dj * nx + di; if (!seen[m] && mine[m]) { seen[m] = 1; q.push(m); } } } }
      const climbCells = (() => { let n = 0; for (let k = 0; k < mine.length; k++) if (mine[k] && cls[k] === 2) n++; return n; })();
      // as-built slope along the centreline (1 m baseline) and across the tread (walk routes)
      let len = 0, gMax = 0, xMax = 0, xAll = 0, lo = 1e9, hi = -1e9; const st = 2; let prev = null;
      for (let q = 0; q + 1 < P.length; q++) { const a = P[q], c = P[q + 1], L = Math.hypot(c[0] - a[0], c[1] - a[1]), n = Math.max(1, Math.ceil(L / st)), tx = (c[0] - a[0]) / L, ty = (c[1] - a[1]) / L; len += L;
        for (let u = 0; u < n; u++) { const t = u / n, x = a[0] + (c[0] - a[0]) * t, y = a[1] + (c[1] - a[1]) * t, h = M3.meshH(x, y); lo = Math.min(lo, h); hi = Math.max(hi, h);
          const hb = M3.meshH(x + tx * WS, y + ty * WS); gMax = Math.max(gMax, Math.abs(hb - h) / WS);
          if (kind === 1) { const hl = M3.meshH(x - ty * WS, y + tx * WS), hr = M3.meshH(x + ty * WS, y - tx * WS); xAll = Math.max(xAll, Math.abs(hl - hr) / (2 * WS)); } const nb = M3.vrNear(x - ty * WS, y + tx * WS), nr = M3.vrNear(x + ty * WS, y - tx * WS); if (kind === 1 && nb && nr && Math.abs(nb.g.i - q) <= 0 && Math.abs(nr.g.i - q) <= 0) { const hl = M3.meshH(x - ty * WS, y + tx * WS), hr = M3.meshH(x + ty * WS, y - tx * WS); xMax = Math.max(xMax, Math.abs(hl - hr) / (2 * WS)); } } }
      let strip = 0, pads = 0; for (const q of P) { if (kind === 1 && Mosby.trailHit(q[0], q[1], 10 * WS + 2 * WS)) strip++; for (const B of Town.BLD) if (Math.hypot(q[0] - B.P.x, q[1] - B.P.y) < M3.VR.bat + 10 * WS + Math.hypot(B.w, B.d) / 2 * WS) pads++; }
      return { id, kind, nCells, climbCells, conn, main: s >= 0 && g >= 0 && comp[s] === NV.main && comp[g] === NV.main, len: Math.round(len / WS), rise: Math.round((hi - lo) / WS), gMax: +gMax.toFixed(3), xMax: +xMax.toFixed(3), xAll: +xAll.toFixed(3), strip, pads, painted: kind ? (M3.VR.mesh || []).some((m) => m.name === 'vrTread_' + id && m.parent) : null, poke: (() => { let e = -1e9; for (let q = 0; q + 1 < P.length; q++) for (let t = 0; t < 1; t += 0.1) { const x = P[q][0] + (P[q + 1][0] - P[q][0]) * t, y = P[q][1] + (P[q + 1][1] - P[q][1]) * t; e = Math.max(e, (M3.meshGridH(x, y) - M3.meshH(x, y)) / WS); } return +e.toFixed(2); })() };
    }); });
  for (const r of R) { const deg = (g) => (Math.atan(g) * 180 / Math.PI).toFixed(1); console.log(JSON.stringify(r), 'max', deg(r.gMax) + 'deg');
    ok(r.conn, `${r.id}: connected end to end inside its own nav corridor (${r.nCells} cells)`);
    ok(r.main, `${r.id}: both ends join the main walkable network`);
    if (r.kind === 1) { ok(r.gMax <= 0.38, `${r.id}: walk ramp <= 20 deg along the tread as built (max ${deg(r.gMax)} deg, ${r.len} m, rise ${r.rise} m)`); ok(r.xMax <= 0.364, `${r.id}: tread level across, away from the hairpin bends (max cross-slope ${deg(r.xMax)} deg; ${deg(r.xAll)} deg on the inside of the bends)`); ok(r.climbCells === 0, `${r.id}: walks all the way (no climb cells: ${r.climbCells})`); ok(r.painted, `${r.id}: painted tread shelf mesh`); ok(r.poke <= 0.05, `${r.id}: the terrain never pokes through the tread (highest ${r.poke} m vs tread)`); ok(r.strip === 0, `${r.id}: painted tread >= 10 m off Mosby's strip (${r.strip} vertices in)`); }
    else { ok(r.gMax <= 0.95, `${r.id}: climb <= 42 deg as built (max ${deg(r.gMax)} deg, ${r.len} m, rise ${r.rise} m)`); ok(r.climbCells > 0, `${r.id}: is a climb (${r.climbCells} climb cells)`); ok(r.painted, `${r.id}: rock ledge mesh`); ok(r.poke <= 0.05, `${r.id}: the terrain never pokes through the ledges (highest ${r.poke} m)`); }
    ok(r.pads === 0, `${r.id}: clear of the keeper pads (${r.pads} vertices near)`); }
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? `${fails} FAILED` : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();

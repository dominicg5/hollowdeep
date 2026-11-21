// Tap-a-tether: tap her own rope (Ledge line / drop / drill) -> a field-kit bubble with Teleport to start / end (names); near one end only the other end is
// offered; the buttons teleport (Explore.teleportTo); a generous hit band; another player's rope (not in her save) never opens one; a tap elsewhere closes it.
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html', SHOT = process.env.SHOT || '';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(1000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 200000 }).catch(() => {}); await p.waitForFunction(() => Explore.on, null, { timeout: 30000 }).catch(() => {});
  const shot = async (f) => { if (SHOT) { await p.waitForTimeout(800); await p.screenshot({ path: SHOT + '/' + f, timeout: 120000 }); } };
  await p.evaluate(async () => { for (let i = 0; i < 90 && M3.models !== 'ready'; i++) await new Promise((r) => setTimeout(r, 1000)); });
  // lay a drop tether at a spot ~ 60-200 m out
  const r1 = await p.evaluate(async () => { const WS = Explore.WS, F = Explore.ledgeFront(); let k = null; for (const [dx, dy] of [[120, 60], [-120, 60], [120, -60], [-120, -60], [60, 140], [0, -150]]) { const q = Explore.reach(F.x + WS * dx, F.y + WS * dy); if (Math.hypot(q[0] - F.x, q[1] - F.y) > WS * 50) { k = q; break; } }
    Explore.enter(k[0], k[1]); for (let i = 0; i < 20; i++) Explore.tick(1 / 30); if (Craft.get('bag', 'tether:mithril') < 3000) Craft.add('bag', 'tether:mithril', 4000); const r = Explore.dropCreate(); for (let i = 0; i < 10; i++) Explore.tick(1 / 30);
    const R = TetherTap.routes(), L = Explore.tetherList(), own = R.every((t) => L.some((q) => q.key === t.key)); const d = R.find((t) => t.kind === 'drop'); return { err: r && r.err, n: R.length, kinds: R.map((t) => t.kind), own, d: d && { a: d.a.name, b: d.b.name, np: d.pts.length } }; });
  console.log(JSON.stringify(r1)); ok(r1.d && r1.d.np > 1, `her drop tether is a tappable rope (${r1.kinds.join(', ')})`); ok(r1.own, 'only her own tethers (from her save) are tappable');
  // stand beside the middle of the rope, aim the camera at it and tap a little off the line
  const tapNear = async (frac, off) => p.evaluate(async ([frac, off]) => { const WS = Explore.WS, T = TetherTap.routes().find((t) => t.kind === 'drop'), P = T.pts; let L = 0; const cum = [0]; for (let i = 1; i < P.length; i++) cum.push((L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])));
      const at = (d) => { let i = 1; while (i < P.length - 1 && cum[i] < d) i++; const u = (d - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1); return [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * u, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * u]; };
      const m = at(L * frac), m2 = at(Math.min(L, L * frac + WS * 4)), E = Explore.EX; if (frac > 0.2 && frac < 0.8) { const nx = -(m2[1] - m[1]), ny = m2[0] - m[0], nl = Math.hypot(nx, ny) || 1, k = Explore.reach(m[0] + nx / nl * WS * 8, m[1] + ny / nl * WS * 8); Explore.enter(k[0], k[1]); }
      E.d = 7.6; E.tilt = 0.2; let best = null; for (let k2 = 0; k2 < 16; k2++) { E.az = k2 * Math.PI / 8; for (let i = 0; i < 3; i++) Explore.tick(1 / 30); M3.render(0, CityMap.cam); const q = M3.project(m[0], m[1], WS * 0.3); const dd = q[0] < -999 ? 1e9 : Math.hypot(q[0] - innerWidth / 2, q[1] - innerHeight * 0.55); if (!best || dd < best[1]) best = [k2, dd]; }
      E.az = best[0] * Math.PI / 8; for (let i = 0; i < 3; i++) Explore.tick(1 / 30); M3.render(0, CityMap.cam); const q = M3.project(m[0], m[1], WS * 0.3), q2 = M3.project(m2[0], m2[1], WS * 0.3), vx = q2[0] - q[0], vy = q2[1] - q[1], vl = Math.hypot(vx, vy) || 1, sx = q[0] - vy / vl * off, sy = q[1] + vx / vl * off;
      const hit = TetherTap.hitAt(sx, sy), res = Explore.tap(sx, sy), el = TetherTap.el, btn = el ? [...el.querySelectorAll('.tbGo')].map((b) => b.dataset.side + ':' + b.querySelector('small').textContent) : [];
      return { res, hitD: hit && hit.d, shown: !!(el && !el.classList.contains('hidden')), btn, title: el && el.querySelector('.tbN b') && el.querySelector('.tbN b').textContent, sx, sy, box: el && (() => { const r = el.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; })() }; }, [frac, off]);
  const r2 = await tapNear(0.5, 22); console.log(JSON.stringify(r2));
  ok(r2.res === 'tether' && r2.shown, `a tap ${22} px off the rope opens the bubble (generous hit band, ${r2.hitD && r2.hitD.toFixed(0)} px)`); ok(r2.btn.length === 2 && r2.btn[0].startsWith('start:') && r2.btn[1].startsWith('end:') && r2.title === r1.d.b, `mid-rope it offers both ends with names (${r2.btn.join(' | ')})`);
  ok(r2.box && r2.box[0] >= 0 && r2.box[2] <= 390 && r2.box[1] >= 0 && r2.box[3] <= 844, 'the bubble stays on screen');
  await shot('tether-bubble.png');
  const r3 = await p.evaluate(() => { let pt = null; for (let y = 120; y < 760 && !pt; y += 40) for (let x = 20; x < 380 && !pt; x += 40) if (!TetherTap.hitAt(x, y) && (y < 218 || y > 440)) pt = [x, y]; const res = Explore.tap(pt[0], pt[1]); return { res, open: !!TetherTap.T }; }); ok(!r3.open, `a tap elsewhere closes it (${r3.res})`);
  // near the far end: only the start (the Ledge door); tapping it teleports there
  const r4 = await p.evaluate(() => { const T = TetherTap.routes().find((t) => t.kind === 'drop'); Explore.teleportTo(T.key); for (let i = 0; i < 5; i++) Explore.tick(1 / 30); return Explore.here(); });
  const r5 = await tapNear(0.93, 14); console.log(JSON.stringify(r5)); ok(r5.res === 'tether' && r5.btn.length === 1 && r5.btn[0].startsWith('start:'), `beside its end it only offers the start (${r5.btn.join(' | ')})`);
  const r6 = await p.evaluate(async () => { TetherTap.el.querySelector('.tbGo').click(); await new Promise((r) => setTimeout(r, 300)); for (let i = 0; i < 5; i++) Explore.tick(1 / 30); const h = Explore.here(), F = Explore.ledgeFront(); return { d: Math.hypot(h[0] - F.x, h[1] - F.y) / Explore.WS, open: !!TetherTap.T }; });
  ok(r6.d < 12 && !r6.open, `Teleport to start lands her at the Ledge door (${r6.d.toFixed(1)} m)`);
  const r7 = await tapNear(0.07, 14); console.log(JSON.stringify(r7)); ok(r7.res === 'tether' && r7.btn.length === 1 && r7.btn[0].startsWith('end:'), `beside the door it only offers the end (${r7.btn.join(' | ')})`);
  const r8 = await p.evaluate(async () => { const T = TetherTap.routes().find((t) => t.kind === 'drop'); TetherTap.el.querySelector('.tbGo').click(); await new Promise((r) => setTimeout(r, 300)); for (let i = 0; i < 5; i++) Explore.tick(1 / 30); const h = Explore.here(); return { d: Math.hypot(h[0] - T.b.x, h[1] - T.b.y) / Explore.WS }; });
  ok(r8.d < 12, `Teleport to end lands her at the drop (${r8.d.toFixed(1)} m)`);
  // a rope that is not hers (taken up from her save) never opens a bubble
  const r9 = await p.evaluate(() => { const T = TetherTap.routes().find((t) => t.kind === 'drop'); window.__tt = T; Explore.dropRemove(T.key); return TetherTap.routes().some((t) => t.key === T.key); });
  const r10 = await p.evaluate(() => { const T = window.__tt, P = T.pts, m = P[Math.floor(P.length / 2)], q = M3.project(m[0], m[1], Explore.WS * 0.3); const H = TetherTap.hitAt(q[0], q[1]); return !H || H.T.key !== T.key; });
  ok(!r9 && r10, 'a rope not in her save gets no bubble');
  const main = await p.evaluate(() => { const T = TetherTap.routes().find((t) => t.kind === 'main'); return T && { a: T.a.key, b: T.b.key, n: T.pts.length }; }); console.log(JSON.stringify(main)); ok(!main || (main.a === 'door' && main.b === 'camp'), main ? 'the Ledge line runs door -> Hanging Camp' : 'no Ledge line laid on this map (skipped)');
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 2).join(' | '));
  console.log(fails ? fails + ' FAIL' : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0); })();

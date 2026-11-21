// solid scenery: she cannot walk through trees, boulders or big bushes - driven straight at a sample of them she slides round, never inside;
// planned routes (tap-to-walk / auto-walk / ETA) go round them; the mole slides round them too; pebbles and knee-high stuff stay walk-over
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(1000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 150000 }).catch(() => {}); await p.waitForTimeout(800);
  const r = await p.evaluate(() => { const WS = Explore.WS, F = Explore.ledgeFront(), out = { runs: [], kinds: {} }, TE = (n) => { for (let i = 0; i < n; i++) Explore.tick(1 / 30); };
    const k0 = Explore.reach(F.x + WS * 30, F.y + WS * 30); Explore.enter(k0[0], k0[1]); TE(5);
    const L = Explore.colList(); out.n = L.length; for (const c of L) out.kinds[c.key.replace(/\d+$/, '')] = (out.kinds[c.key.replace(/\d+$/, '')] || 0) + 1;
    const BR = Explore.BODY_R, walk = (x, y) => Explore.clsAt(x, y) === 1;
    // sample: trees and boulders of several kinds, spread over the map, standing on open walkable ground (so the approach line is clear)
    const pick = [], want = [[/tree|oak|birch|pine|willow|spruce|fir|sequoia|maple|ash|elm|conifer/i, 10], [/rock|boulder|stone|oreRock|focal|ore$/i, 10]];
    for (const [re, n] of want) { const C = L.filter((c) => re.test(c.key) && c.key !== 'cliff'); for (let i = 0, got = 0; i < C.length * 3 && got < n; i++) { const c = C[Math.floor((i * 7919.37) % C.length)]; if (pick.includes(c)) continue; const a = (i * 2.399) % 6.283, D = c.r + WS * 5, ax = c.x - Math.cos(a) * D, ay = c.y - Math.sin(a) * D, bx = c.x + Math.cos(a) * D, by = c.y + Math.sin(a) * D; if (!walk(ax, ay) || !walk(bx, by) || Explore.solidAt(ax, ay, BR * 2) || Explore.solidAt(bx, by, BR * 2)) continue; let clear = true; for (const o of L) if (o !== c && Math.hypot(o.x - c.x, o.y - c.y) < c.r + o.r + WS * 3) { clear = false; break; } if (!clear) continue; pick.push(c); c._a = [ax, ay, bx, by]; got++; } }
    for (const c of pick) { const [ax, ay, bx, by] = c._a; Explore.exit(); Explore.enter(ax, ay); TE(2); const h0 = Explore.here(); if (Math.hypot(h0[0] - ax, h0[1] - ay) > WS * 1.5) { out.runs.push({ key: c.key, skip: Math.round(Math.hypot(h0[0] - ax, h0[1] - ay) / WS) }); continue; } const G = CharView.st.gnd, O = Explore.EX.O; let minD = 1e9, f = 0;
      // force a straight path right through the obstacle's centre (no planner) - the walker must slide, not pass through
      G.path = [{ x: (c.x - O.x) / WS, z: (c.y - O.y) / WS }, { x: (bx - O.x) / WS, z: (by - O.y) / WS }]; G.pi = 0; G.goal = { x: G.path[1].x, z: G.path[1].z, fit: true, done: () => {} }; G.gBest = 1e9; G.stall = 0;
      for (; f < 30 * 12; f++) { Explore.tick(1 / 30); const h = Explore.here(); minD = Math.min(minD, Math.hypot(h[0] - c.x, h[1] - c.y)); }
      const h = Explore.here(); out.runs.push({ key: c.key, r: +(c.r / WS).toFixed(2), minGap: +((minD - c.r) / WS).toFixed(2), past: Math.hypot(h[0] - bx, h[1] - by) < Math.hypot(h[0] - ax, h[1] - ay) });
      // planned route from one side to the other keeps off it
      const P = Explore.plan(ax, ay, bx, by); let pin = 0; if (P) for (let i = 1; i < P.pts.length; i++) { const [x0, y0] = P.pts[i - 1], [x1, y1] = P.pts[i], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (WS * 0.25)); for (let s = 0; s <= n; s++) { const x = x0 + (x1 - x0) * s / n, y = y0 + (y1 - y0) * s / n; if (Math.hypot(x - c.x, y - c.y) < c.r) pin++; } } out.runs[out.runs.length - 1].planIn = pin; out.runs[out.runs.length - 1].plan = !!P; }
    // the mole, dropped against a trunk and sent through it, ends outside every collider it touched
    const tr = pick[0]; let mIn = -1; if (tr && typeof Mole !== 'undefined') { const M = Mole.M; Explore.exit(); Explore.enter(tr._a[0], tr._a[1]); TE(2); M.pos = [tr._a[0], tr._a[1]]; M.path = [[tr.x, tr.y], [tr._a[2], tr._a[3]]]; M.pi = 0; let worst = 1e9; for (let i = 0; i < 200; i++) { Mole.tick(1 / 30); worst = Math.min(worst, Math.hypot(M.pos[0] - tr.x, M.pos[1] - tr.y) - tr.r); } mIn = +(worst / WS).toFixed(2); } out.mole = mIn;
    // walk-over: no pebble / tuft / flower / reed collider anywhere
    out.walkover = L.filter((c) => /pebble|tuft|flower|reed|grass|fern|lily/i.test(c.key)).length;
    // perf: 2000 collide() queries
    const t0 = performance.now(); for (let i = 0; i < 2000; i++) Explore.collide(k0[0] + (i % 50) * WS, k0[1] + Math.floor(i / 50) * WS, BR); out.ms2000 = +(performance.now() - t0).toFixed(1);
    // the Lumen Tree: trunk and every root are solid, nothing on them is walkable, she reaches the door on the ground
    { const HW = L.filter((c) => /^hw/.test(c.key)), D = GRAND.door, DS = Explore.doorSpots().find((o) => o.type === 'door'), lu = out.lumen = { trunk: HW.filter((c) => c.key === 'hwTrunk').length, roots: HW.filter((c) => c.key === 'hwRoot').length, rootCells: Explore.NV.rootCells, walkRoot: !!Explore.NV.root };
      const inHW = (x, y, pad) => HW.some((c) => Math.hypot(x - c.x, y - c.y) < c.r + pad), Tw = W.heartwood;
      // routes to the door from all round the tree: planned on the ground, never across a root or the trunk
      lu.routes = []; for (let a = 0; a < 8; a++) { const an = a / 8 * 6.283, k = Explore.reach(Tw.x + Math.cos(an) * 5200, Tw.y + Math.sin(an) * 5200); if (!k) continue; const P = Explore.plan(k[0], k[1], DS.x, DS.y); if (!P) { lu.routes.push({ a, ok: false }); continue; } let hit = 0, up = 0; for (let i = 1; i < P.pts.length; i++) { const [x0, y0] = P.pts[i - 1], [x1, y1] = P.pts[i], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 8); for (let s = 0; s <= n; s++) { const x = x0 + (x1 - x0) * s / n, y = y0 + (y1 - y0) * s / n; if (inHW(x, y, 0)) hit++; if (Math.hypot(x - Tw.x, y - Tw.y) < 4500 && !(Explore.onBridge && Explore.onBridge(x, y, 8))) { const v = Explore.hAt(x, y) - M3.meshH(x, y); if (isFinite(v)) up = Math.max(up, v); } /* near the tree; a bridge deck rides above the ground by design (the crevice bridges east of the lake are inside 4500) */ } } lu.routes.push({ a, ok: true, hit, up: +up.toFixed(1), end: Math.round(Math.hypot(P.pts[P.pts.length - 1][0] - DS.x, P.pts[P.pts.length - 1][1] - DS.y)) }); }
      // walk to the door: arrive on the ground at the door
      Explore.exit(); const k1 = Explore.reach(D.x + D.nx * 1500, D.y + D.nz * 1500); Explore.enter(k1[0], k1[1]); TE(2); Explore.goTo(DS.x, DS.y); let worst = 1e9, maxUp = 0; for (let f = 0; f < 30 * 60; f++) { Explore.tick(1 / 30); const h = Explore.here(); for (const c of HW) worst = Math.min(worst, Math.hypot(h[0] - c.x, h[1] - c.y) - c.r); maxUp = Math.max(maxUp, Explore.hAt(h[0], h[1]) - M3.meshH(h[0], h[1])); if (Math.hypot(h[0] - DS.x, h[1] - DS.y) < WS * 2) break; } const hE = Explore.here(); lu.walk = { dDoor: +(Math.hypot(hE[0] - DS.x, hE[1] - DS.y) / WS).toFixed(1), gap: +(worst / WS).toFixed(2), maxUp: +maxUp.toFixed(1) };
      // driven straight at the trunk and at roots: never inside, never up onto them
      lu.drive = []; const RT = HW.filter((c) => c.key === 'hwRoot'), tgts = [...HW.filter((c) => c.key === 'hwTrunk').filter((c, i) => i % 23 === 0), ...RT.filter((c, i) => i % 7 === 0)];
      for (const c of tgts) { if (lu.drive.length >= 12) break; let best = null; for (let a = 0; a < 16 && !best; a++) { const an = a / 16 * 6.283, d = c.r + WS * 6, ax = c.x + Math.cos(an) * d, ay = c.y + Math.sin(an) * d; if (Explore.clsAt(ax, ay) === 1 && !inHW(ax, ay, BR * 2)) best = [ax, ay]; } if (!best) continue; Explore.exit(); Explore.enter(best[0], best[1]); TE(2); const h0 = Explore.here(); if (Math.hypot(h0[0] - best[0], h0[1] - best[1]) > WS * 1.5) continue; const G = CharView.st.gnd, O = Explore.EX.O; G.path = [{ x: (c.x - O.x) / WS, z: (c.y - O.y) / WS }]; G.pi = 0; G.goal = { x: G.path[0].x, z: G.path[0].z, fit: true, done: () => {} }; G.gBest = 1e9; G.stall = 0; let w2 = 1e9, up2 = 0; for (let f = 0; f < 30 * 6; f++) { Explore.tick(1 / 30); const h = Explore.here(); for (const q of HW) w2 = Math.min(w2, Math.hypot(h[0] - q.x, h[1] - q.y) - q.r); up2 = Math.max(up2, (CharView.st.gnd.exC ? 99 : 0), Explore.hAt(h[0], h[1]) - M3.meshH(h[0], h[1])); } lu.drive.push({ key: c.key, gap: +(w2 / WS).toFixed(2), up: +up2.toFixed(1) }); } }
    Explore.exit(); return out; });
  console.log(JSON.stringify(r)); const sk = r.runs.filter((u) => u.skip != null); r.runs = r.runs.filter((u) => u.skip == null); ok(sk.length <= 4, 'placed beside the sampled obstacles (' + sk.length + ' could not be placed)');
  ok(r.n > 3000, `solid colliders registered (${r.n}) ${JSON.stringify(r.kinds)}`);
  const trees = r.runs.filter((u) => !/rock|boulder|stone|focal|ore/i.test(u.key)), rocks = r.runs.filter((u) => /rock|boulder|stone|focal|ore/i.test(u.key));
  ok(trees.length >= 6 && rocks.length >= 6, `sampled ${trees.length} trees and ${rocks.length} boulders`);
  for (const u of r.runs) { ok(u.minGap >= 0.3 * 0.85 - 0.02, `driven straight at ${u.key} (r ${u.r} m) she never gets inside it (closest gap ${u.minGap} m, body 0.3 m)`); }
  const past = r.runs.filter((u) => u.past).length; ok(past >= r.runs.length * 0.7, `she slides round rather than sticking (${past}/${r.runs.length} got past)`);
  ok(r.runs.every((u) => u.plan && u.planIn === 0), 'planned routes go round every sampled obstacle ' + JSON.stringify(r.runs.map((u) => u.planIn)));
  ok(r.mole >= 0, `the mole sent through a trunk stays outside it (gap ${r.mole} m)`);
  ok(r.walkover === 0, 'pebbles, tufts, flowers, reeds and ferns stay walk-over');
  ok(r.ms2000 < 60, `collide() is cheap (${r.ms2000} ms for 2000 queries)`);
  const lu = r.lumen; ok(lu.trunk > 50 && lu.roots > 50 && lu.rootCells > 0 && !lu.walkRoot, 'Lumen Tree trunk and roots are solid colliders, root cells blocked, no walkable root surface ' + JSON.stringify({ trunk: lu.trunk, roots: lu.roots, cells: lu.rootCells }));
  ok(lu.routes.length >= 6 && lu.routes.every((u) => u.ok && u.hit === 0 && u.up < 3 && u.end < 40), 'routes to the Lumen door from all round go on the ground, never over a root or the trunk ' + JSON.stringify(lu.routes));
  ok(lu.walk.dDoor < 3 && lu.walk.gap >= 0.25 && lu.walk.maxUp < 3, 'she walks to the Lumen door at ground level ' + JSON.stringify(lu.walk));
  ok(lu.drive.length >= 5 && lu.drive.every((u) => u.gap >= 0.25 && u.up < 3), 'driven straight at the trunk / roots she never gets inside or climbs up ' + JSON.stringify(lu.drive));
  ok(!errs.length, 'no page errors ' + errs.join(' | ')); await b.close(); console.log(fails ? fails + ' FAIL' : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();

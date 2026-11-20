// walk-in caverns (cliff_ledge_cavern): three caves, each a plank-step ramp up the rock face to a cave mouth ~5 m up; she plans a route from the open
// ground, runs up the ramp and walks in on the floor at floor height; the chamber walls are solid; a blank sign post, no lanterns; trees and cliff blocks
// keep off the footprint. SHOT=dir saves an eye-level render of each cave and one of her standing inside.
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html', SHOT = process.env.SHOT || '';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1 })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(1000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 200000 }).catch(() => {}); await p.waitForTimeout(800);
  const R = await p.evaluate(() => { const WS = Explore.WS, C = Explore.caves(), out = [];
    for (const c of C) { const o = { id: c.id, type: c.type }, s0 = [c.G[0] + c.ox * WS * 6, c.G[1] + c.oy * WS * 6], goal = [c.M[0] - c.ox * Explore.CAV.FD * 0.6, c.M[1] - c.oy * Explore.CAV.FD * 0.6];
      Explore.enter(s0[0], s0[1]); for (let i = 0; i < 10; i++) Explore.tick(1 / 30); const h0 = Explore.here(); o.start = !!h0 && Math.hypot(h0[0] - s0[0], h0[1] - s0[1]) < WS * 2;
      const P = Explore.plan(h0[0], h0[1], goal[0], goal[1]); o.route = !!P; if (P) { o.climb = Math.round(P.climb); o.len = +(P.len / WS).toFixed(1); }
      Explore.goTo(goal[0], goal[1]); let maxStep = 0, prevH = null, onRamp = 0; for (let i = 0; i < 30 * 30; i++) { Explore.tick(1 / 30); const h = Explore.here(); if (!h) break; const z = Explore.hAt(h[0], h[1]); if (prevH != null) maxStep = Math.max(maxStep, Math.abs(z - prevH)); prevH = z; const ob = c.pieces[0]; const dx = h[0] - ob.a[0], dy = h[1] - ob.a[1], t = (dx * ob.ux + dy * ob.uy) / ob.L; if (t > 0.2 && t < 0.8) onRamp++; }
      const h1 = Explore.here(); o.end = +(Math.hypot(h1[0] - goal[0], h1[1] - goal[1]) / WS).toFixed(2); o.floorH = +((Explore.hAt(h1[0], h1[1]) - c.Hs) / WS).toFixed(2); o.groundBelow = +((c.Hs - M3.meshH(h1[0], h1[1])) / WS).toFixed(2); o.maxStep = +(maxStep / WS).toFixed(2); o.onRamp = onRamp;
      // walls: a point just past the side wall / back wall is pushed back out of the rock
      const side = [c.M[0] - c.ox * Explore.CAV.FD * 0.5 + c.tx * (Explore.CAV.FW * 0.5 + WS * 0.5), c.M[1] - c.oy * Explore.CAV.FD * 0.5 + c.ty * (Explore.CAV.FW * 0.5 + WS * 0.5)], cs = Explore.collide(side[0], side[1], Explore.BODY_R); o.wallPush = +(Math.hypot(cs[0] - side[0], cs[1] - side[1]) / WS).toFixed(2);
      const G = Explore.ORE.caveG && Explore.ORE.caveG.find((g) => g.name === c.id); o.mesh = !!G; o.lamps = 0; o.text = 0; if (G) G.traverse((m) => { if (/lamp|lantern|halo/i.test(m.name) || (m.material && m.material.blending === THREE.AdditiveBlending)) o.lamps++; if (m.isSprite || (m.material && m.material.map && /canvas/i.test(String(m.material.map.image && m.material.map.image.tagName)))) o.text++; });
      o.trees = M3.colliders().filter((q) => Explore.caveHit(q.x, q.y, 0) === c).length; o.cliffBlocks = (Explore.ORE.cliffs || []).reduce((n, cl) => n + cl.blk.filter((q) => Explore.caveHit(q.x, q.y, 0) === c).length, 0);
      out.push(o); }
    return { n: C.length, out, lantern: (() => { let n = 0; M3.scene.traverse((m) => { if (/^cliff\d+$/.test(m.name)) m.traverse((q) => { if (q.material && q.material.blending === THREE.AdditiveBlending) n++; }); }); return n; })() }; });
  console.log(JSON.stringify(R));
  ok(R.n === 3, `three walk-in caves (${R.n})`);
  for (const o of R.out) { ok(o.start && o.route, `${o.id} (${o.type || 'rock'}): a route from the open ground to inside the cave (${o.len} m, climb ${o.climb})`);
    ok(o.end < 1.2 && Math.abs(o.floorH) < 0.4 && o.groundBelow > 0.5, `${o.id}: she walks in and stands on the cave floor at floor height (${o.end} m from the goal, ${o.floorH} m off the floor, ground ${o.groundBelow} m below)`);
    ok(o.onRamp > 5 && o.maxStep < 0.5, `${o.id}: she goes up the plank ramp, no jumps (${o.onRamp} ramp frames, max step ${o.maxStep} m)`);
    ok(o.wallPush > 0.3, `${o.id}: the chamber wall is solid (pushed ${o.wallPush} m back)`); ok(o.mesh && o.lamps === 0 && o.text === 0, `${o.id}: built, no lanterns, the sign is blank`); ok(o.trees === 0 && o.cliffBlocks === 0, `${o.id}: no trees, props or cliff blocks inside the footprint (${o.trees}, ${o.cliffBlocks})`); }
  ok(R.lantern === 0, 'no lantern glows left on the cliffs');
  if (SHOT) { const fs = require('fs'); fs.mkdirSync(SHOT, { recursive: true });
    for (let i = 0; i < R.n; i++) { await p.evaluate((i) => { const c = Explore.caves()[i], WS = Explore.WS; Explore.enter(c.G[0] + c.ox * WS * 3, c.G[1] + c.oy * WS * 3); const E = Explore.EX; E.az = Math.atan2(c.ox, c.oy) + 0.45; E.d = 24; E.tilt = 0.28; for (let k = 0; k < 20; k++) Explore.tick(1 / 30); }, i); await p.waitForTimeout(2500); await p.screenshot({ path: `${SHOT}/cave${i}.jpg`, type: 'jpeg', quality: 86 }); }
    await p.evaluate(() => { const c = Explore.caves()[0], WS = Explore.WS; Explore.enter(c.M[0] - c.ox * WS * 3.2, c.M[1] - c.oy * WS * 3.2); const E = Explore.EX; E.az = Math.atan2(c.ox, c.oy) + 0.1; E.d = 4.2; E.tilt = 0.12; for (let k = 0; k < 20; k++) Explore.tick(1 / 30); }); await p.waitForTimeout(2500); await p.screenshot({ path: `${SHOT}/cave-inside.jpg`, type: 'jpeg', quality: 86 }); }
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  console.log(fails ? 'SOME FAILED' : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0); })();

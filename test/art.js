// Art review shots for the 3D Rim City: framed house close-ups per tier (day + night), trees, Heartwood seats, overview.
// URL=http://localhost:8766/index.html ONLY=house,tree,seat,over NIGHT=0|1|both node test/art.js   (writes a-*.png into cwd)
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8766/index.html', ONLY = (process.env.ONLY || 'house,tree,seat,over').split(','), TIERS = (process.env.TIERS || '0,1,2,3,4,5,6,7').split(',').map(Number);
(async () => { const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  await p.goto(URL); await p.waitForTimeout(800); await p.evaluate(() => closeModalQuiet()).catch(() => {});
  await p.waitForFunction(() => typeof M3 !== 'undefined' && (M3.models === 'ready' || M3.models === 'failed'), null, { timeout: 180000 });
  const go = async (x, y, z, rot, tilt) => { await p.evaluate(([x, y, z, rot, tilt]) => { closeModalQuiet(); CityMap.flyTo(x, y, z, true); CityMap.cam.rot = rot; CityMap.cam.tilt = tilt; }, [x, y, z, rot, tilt]); await p.waitForTimeout(2300); await p.evaluate(() => closeModalQuiet()); await p.waitForTimeout(200); };
  const clip = { x: 0, y: 140, width: 390, height: 560 };
  for (const night of process.env.NIGHT === '1' ? [1] : process.env.NIGHT === 'both' ? [0, 1] : [0]) {
    await p.evaluate((n) => { if (n) window.nightFactor = () => 1; else delete window.nightFactor; }, night); const tag = night ? 'n' : 'd';
    if (ONLY.includes('house')) for (const t of TIERS) { const h = await p.evaluate((t2) => { const t = t2[0], hs = W.homes.filter((h) => !h.heartwood && !h.isPlayer && tierOf(h) === t && Math.hypot(h.x - W.heartwood.x, h.y - W.heartwood.y) > 6000).sort((a, b) => Math.abs(a.ring - 4) - Math.abs(b.ring - 4)); const h = hs[Math.min(hs.length - 1, t2[1])]; if (!h) return null; return { x: h.x, y: h.y, s: homeW(h, t), rot: h._rot || 0 }; }, [t, +(process.env.PICK || 2)]);
      if (!h) { console.log('no tier', t); continue; } await go(h.x, h.y, 230 / (h.s * 1.25), h.rot + 0.75, 34); await p.screenshot({ path: `a-${tag}-t${t}.png`, clip }); }
    if (ONLY.includes('tree')) for (const k of ['oak', 'willow', 'sequoia']) { const o = await p.evaluate((k) => { const o = W.objs.find((o) => o.type === 'tree' && M3.treeKind && M3.treeKind(o) === k); return o ? { x: o.x, y: o.y, r: o.r } : null; }, k); if (!o) { console.log('no tree', k); continue; } await go(o.x, o.y, 160 / (o.r * 6), 0.4, 26); await p.screenshot({ path: `a-${tag}-tree-${k}.png`, clip }); }
    if (ONLY.includes('seat')) { const hw = await p.evaluate(() => { const s = (j) => W.homes.find((h) => h.heartwood && h.slot === j); return [0, 3, 6, 9].map((j) => { const h = s(j); return { x: h.x, y: h.y, r: Math.atan2(Math.cos(h.hwTh), Math.sin(h.hwTh)) }; }); });
      for (const [j, h] of hw.entries()) { await go(h.x, h.y, 0.42, h.r + 0.35, 36); await p.screenshot({ path: `a-${tag}-seat${j}.png`, clip }); }
      const T = await p.evaluate(() => { const T = W.heartwood; return { x: T.x + Math.cos(T.in) * 2600, y: T.y + Math.sin(T.in) * 2600, r: Math.atan2(Math.cos(T.in), Math.sin(T.in)) }; }); await go(T.x, T.y, 0.03, T.r, 35); await p.screenshot({ path: `a-${tag}-heartwood.png` }); }
    if (ONLY.includes('over')) { const pl = await p.evaluate(() => [W.player.x, W.player.y]); await go(pl[0], pl[1], 0.45, 0.5, 45); await p.screenshot({ path: `a-${tag}-street.png` }); await go(0, 3600, 0.08, 0, 50); await p.screenshot({ path: `a-${tag}-over.png` }); }
  }
  console.log('stats', await p.evaluate(() => JSON.stringify({ fps: CityMap.fps.toFixed(1), calls: M3.st.calls, tris: M3.st.tris, models: M3.st.models })));
  console.log('errors', errs.length, errs.slice(0, 4).join(' | ')); await b.close(); })();

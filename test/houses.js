const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/hollowdeep-prototype.html';
(async () => { const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1])); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
  await p.goto(URL); await p.waitForTimeout(800); await p.evaluate(() => closeModalQuiet()).catch(() => {});
  await p.waitForFunction(() => typeof M3 !== 'undefined' && (M3.models === 'ready' || M3.models === 'failed'), null, { timeout: 120000 });
  console.log('models', await p.evaluate(() => M3.models));
  const Z = +(process.env.Z || 3.2), TILT = +(process.env.TILT || 30), tiers = (process.env.TIERS || '0,1,2,3,4,5,6,7').split(',').map(Number), night = !!process.env.NIGHT;
  if (night) await p.evaluate(() => { window.nightFactor = () => 1; });
  for (const t of tiers) { const ok = await p.evaluate(([t, Z, TILT]) => { closeModalQuiet(); const hs = W.homes.filter((h) => !h.isPlayer && tierOf(h) === t && h.ring >= 2); const h = hs[3] || hs[0]; if (!h) return false; CityMap.flyTo(h.x, h.y, Z, true); CityMap.cam.rot = (h._rot || 0) + 0.6; CityMap.cam.tilt = TILT; return true; }, [t, Z, TILT]);
    if (!ok) { console.log('no home for tier', t); continue; } await p.waitForTimeout(2200); await p.evaluate(() => closeModalQuiet()); await p.waitForTimeout(200); await p.screenshot({ path: `h-${night ? 'n' : 'd'}${t}.png`, clip: { x: 0, y: 150, width: 390, height: 500 } }); }
  if (process.env.TREES) for (const k of ['oak', 'sequoia', 'willow']) { await p.evaluate((k) => { const o = W.objs.find((o) => o.type === 'tree' && M3.treeKind && M3.treeKind(o) === k) || W.objs.filter((o) => o.type === 'tree')[k.length * 7]; CityMap.flyTo(o.x, o.y, 1.6, true); CityMap.cam.tilt = 30; }, k); await p.waitForTimeout(2200); await p.screenshot({ path: `t-${k}.png`, clip: { x: 0, y: 150, width: 390, height: 500 } }); }
  console.log('errors', errs.length, errs.slice(0, 4).join(' | ')); await b.close(); })();

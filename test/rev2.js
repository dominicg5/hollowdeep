// review shots for the big map / lava / rifts
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/hollowdeep-prototype.html';
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(800);
  if (await p.isVisible('#modal:not(.hidden)')) await p.click('#modal [data-act=close]');
  await p.waitForFunction(() => typeof ART !== 'undefined' && ART.ready && W.homes, null, { timeout: 60000 });
  const shot = async (n, x, y, z, w) => { await p.evaluate(([x, y, z]) => CityMap.flyTo(x, y, z, true), [x, y, z]); await p.waitForTimeout(w || 2500); await p.screenshot({ path: n }); };
  const P = await p.evaluate(() => { const lc = W.cracks.find((c) => c.lava && c.depth === 0) || W.cracks.find((c) => c.lava); const lp = lc.pts[Math.floor(lc.pts.length / 2)];
    const lh = W.homes.filter((h) => REGIONS[h.region].key === 'lava'); const h = lh[Math.floor(lh.length / 2)]; const f = W.lavaFlows[0]; const r = W.rifts[0].mouth; const v = W.vents[0];
    return { lp, h: [h.x, h.y], f: f.pts[Math.floor(f.pts.length / 2)], r: [r.x, r.y], v: [v.x, v.y] }; });
  const only = process.env.ONLY;
  const S = [['rv-over.png', 0, 0, 0.02, 6000], ['rv-wide.png', P.lp[0], P.lp[1], 0.08, 4000], ['rv-lava-mid.png', P.lp[0], P.lp[1], 0.35], ['rv-lava-close.png', P.lp[0], P.lp[1], 1.0], ['rv-lava-home.png', P.h[0], P.h[1], 1.2], ['rv-vent.png', P.v[0], P.v[1], 1.2], ['rv-flow.png', P.f[0], P.f[1], 0.9], ['rv-rift.png', P.r[0], P.r[1], 0.5], ['rv-rift-close.png', P.r[0], P.r[1], 1.1]];
  for (const s of S) if (!only || s[0].includes(only)) await shot(...s);
  await p.evaluate(() => { CityMap.onAct('season', { id: 'deep' }); closeModalQuiet(); }); await p.waitForTimeout(400);
  const N = [['rv-n-lava.png', P.lp[0], P.lp[1], 0.3], ['rv-n-rift.png', P.r[0], P.r[1], 0.3], ['rv-n-over.png', 0, 0, 0.03, 4000], ['rv-n-lavaclose.png', P.lp[0], P.lp[1], 1.0]];
  for (const s of N) if (!only || s[0].includes(only)) await shot(...s);
  console.log('errors', errs.length, errs.slice(0, 3).join(' | '));
  await b.close();
})();

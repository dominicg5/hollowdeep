const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/hollowdeep-prototype.html';
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(800);
  if (await p.isVisible('#modal:not(.hidden)')) await p.click('#modal [data-act=close]');
  await p.waitForFunction(() => typeof ART !== 'undefined' && ART.ready && W.homes, null, { timeout: 90000 });
  console.log(await p.evaluate(() => JSON.stringify({ homes: W.homes.length, objs: W.objs.length, mtn: W.mountains.length, outposts: W.outposts.length, rivers: W.rivers.length, falls: !!W.lakeFalls, stairs: W.stairs.length, fields: W.sets.length, bridges: W.bridges.length, cracks: W.cracks.length, gen: W.genMs })));
  const shot = async (n, x, y, z, w) => { await p.evaluate(([x, y, z]) => CityMap.flyTo(x, y, z, true), [x, y, z]); await p.waitForTimeout(w || 2500); await p.screenshot({ path: n }); };
  const P = await p.evaluate(() => { const o = W.outposts[0], f = W.lakeFalls || W.player, ps = W.pass, st = W.stairs.find((q) => Math.sin(q.a) > 0.3) || W.stairs[0], rf = W.falls[0] || { x: 0, y: 0 };
    const sp = polar(plateauR(Math.PI / 2) + 80, Math.PI / 2 + 0.3);
    return { o: [o.x, o.y], f: [f.x, f.y - 250], ps: [ps.x, ps.y - 450], st: st.pts[2], rf: [rf.x, rf.y], sp, pl: [W.player.x, W.player.y] }; });
  const only = process.env.ONLY;
  const S = [['v2-over.png', 0, 0, 0.035, 4500], ['v2-region.png', 0, 2600, 0.07, 4000], ['v2-south.png', ...P.sp, 0.3, 3500], ['v2-stairs.png', ...P.st, 0.7], ['v2-hollow.png', 0, 100, 0.13, 3500],
    ['v2-outpost.png', ...P.o, 0.8], ['v2-falls.png', ...P.f, 0.4, 3000], ['v2-pass.png', ...P.ps, 0.25, 3500], ['v2-river.png', ...P.rf, 0.6], ['v2-home.png', ...P.pl, 1.1]];
  for (const s of S) if (!only || s[0].includes(only)) await shot(...s);
  await p.evaluate(() => { CityMap.onAct('season', { id: 'deep' }); closeModalQuiet(); }); await p.waitForTimeout(400);
  for (const s of [['v2-n-hollow.png', 0, 100, 0.13, 3000], ['v2-n-lip.png', 0, 2200, 0.4, 3000], ['v2-n-city.png', 1800, 2600, 0.9, 2500], ['v2-n-over.png', 0, 1500, 0.05, 4000]]) if (!only || s[0].includes(only)) await shot(...s);
  console.log('errors', errs.length, errs.slice(0, 3).join(' | '));
  await b.close();
})();

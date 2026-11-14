// quick art review shots: node shots.js [night]
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/hollowdeep-prototype.html';
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL); await p.waitForTimeout(800);
  if (await p.isVisible('#modal:not(.hidden)')) await p.click('#modal [data-act=close]');
  await p.waitForFunction(() => typeof ART !== 'undefined' && ART.ready && typeof W !== 'undefined' && W.homes, null, { timeout: 30000 });
  const list = JSON.parse(process.argv[2]);
  for (const [name, what, z, pre] of list) {
    if (pre) await p.evaluate((pre) => { CityMap.onAct('season', { id: pre }); closeModalQuiet(); }, pre);
    const q = await p.evaluate((what) => { if (Array.isArray(what)) return what; if (what === 'player') return [W.player.x, W.player.y]; const [k, i] = what.split(':'); if (k === 'region') { const hs = W.homes.filter((h) => h.region === +i); const h = hs[Math.floor(hs.length / 2)]; return [h.x, h.y]; } const o = W[k][+i]; return Array.isArray(o) ? o : [o.x, o.y]; }, what);
    await p.evaluate(([x, y, z]) => CityMap.flyTo(x, y, z, true), [q[0], q[1], z]); await p.waitForTimeout(1800);
    await p.screenshot({ path: 'test/rev-' + name + '.png' });
  }
  console.log('fps', await p.evaluate(() => CityMap.fps.toFixed(0)), 'errors', errs.length, errs.slice(0, 3).join(' | '));
  await b.close();
})();

const { chromium } = require('playwright-core'); const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../hollowdeep-prototype.html');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message + '\n' + e.stack));
  await p.goto(URL); await p.waitForTimeout(1200);
  if (await p.isVisible('#modal:not(.hidden)')) await p.click('#modal [data-act=close]');
  const shot = async (name, x, y, z, wait) => { await p.evaluate(([x, y, z]) => { CityMap.cam.x = x; CityMap.cam.y = y; CityMap.cam.z = z; CityMap.cam.fly = null; }, [x, y, z]); await p.waitForTimeout(wait || 2500); await p.screenshot({ path: name }); console.log(name, 'fps', (await p.evaluate(() => CityMap.fps)).toFixed(0), 'tiles', await p.evaluate(() => CityMap.tiles)); };
  await shot('city-overview.png', 0, 0, 0.1, 5000);
  const d = await p.evaluate(() => { const m = W.markets.find((m) => m.region === 0); return [W.lake.x, W.lake.y, m.x, m.y]; });
  await shot('city-mid-docks.png', d[0], d[1], 0.4);
  await shot('city-hollow-edge.png', 300, -700, 0.6);
  console.log('errors', errs.slice(0, 5));
  await b.close();
})();

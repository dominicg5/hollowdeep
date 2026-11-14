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
  const P = await p.evaluate(() => { const big = W.homes.filter((h) => h.level >= 29).sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y))[0]; const mid = W.homes.filter((h) => h.level >= 17 && h.level < 23)[5]; const m = W.markets[7]; const v = W.vaults[0]; const L = W.lifts[2];
    const lava = W.homes.filter((h) => REGIONS[h.region].key === 'lava')[20]; const wood = W.homes.filter((h) => REGIONS[h.region].key === 'wood')[40];
    return { pl: [W.player.x, W.player.y], big: [big.x, big.y], mid: [mid.x, mid.y], m: [m.x, m.y], v: [v.x, v.y], L: [L.x, L.y], lava: [lava.x, lava.y], wood: [wood.x, wood.y] }; });
  const S = [['hv-home.png', ...P.pl, 1.3], ['hv-city.png', ...P.pl, 0.6], ['hv-big.png', ...P.big, 1.4], ['hv-mid.png', ...P.mid, 1.4], ['hv-market.png', ...P.m, 1.2], ['hv-vault.png', ...P.v, 1.3], ['hv-lift.png', ...P.L, 1.3], ['hv-lava.png', ...P.lava, 1.1], ['hv-wood.png', ...P.wood, 1.1], ['hv-far.png', ...P.pl, 0.12, 3500], ['hv-over.png', 0, 0, 0.03, 4000]];
  for (const s of S) await shot(...s);
  // a home card with its tier name
  await p.evaluate(([x, y]) => CityMap.flyTo(x, y, 1.4, true), P.big); await p.waitForTimeout(1500);
  const txt = await p.evaluate(() => { const h = W.homes.filter((h) => h.level >= 29).sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y))[0]; return h.level + ' ' + tierName(h); });
  console.log('tier', txt, 'errors', errs.length, errs.slice(0, 3).join(' | '));
  await b.close();
})();

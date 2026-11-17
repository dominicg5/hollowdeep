// screenshots of every tab: node tabs.js [prefix]
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/hollowdeep-prototype.html';
const pre = process.argv[2] || 'tab';
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL); await p.waitForTimeout(800);
  if (await p.isVisible('#modal:not(.hidden)')) await p.click('#modal [data-act=close]');
  await p.evaluate(() => { S.res.crowns = 9000; S.res.stone = 9000; S.res.timber = 9000; S.res.lumen = 500; S.res.steel = 50; S.res.amber = 50; S.res.iron = 100; S.res.coal = 100; });
  for (const t of ['capital', 'hollow', 'outposts', 'raids', 'training']) {
    await p.evaluate((t) => { const b = document.querySelector('nav#tabs [data-tab=' + t + ']'); if (b) b.click(); else setTab(t); }, t); await p.waitForTimeout(900);
    await p.screenshot({ path: `test/${pre}-${t}.png` });
    await p.screenshot({ path: `test/${pre}-${t}-full.png`, fullPage: true });
  }
  console.log('errors', errs.length, errs.slice(0, 3).join(' | '));
  await b.close();
})();

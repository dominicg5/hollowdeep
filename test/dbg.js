const { chromium } = require('playwright-core'); const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../hollowdeep-prototype.html')); await p.waitForTimeout(1200);
  if (await p.isVisible('#modal:not(.hidden)')) await p.click('#modal [data-act=close]');
  const r = await p.evaluate(() => { let m = currentMole() || nextMole(); if (!currentMole()) simulate(m.start - S.gameTime + 60e3); m = currentMole(); CityMap.flyTo(m.x, m.y, 1.1, true); CityMap.handleTap(...CityMap.w2s(m.x, m.y)); const card = document.getElementById('modalBody').textContent.slice(0, 120); const btn = document.querySelector('#modal [data-act=molefight]'); if (btn) btn.click(); const task = S.hero.task && S.hero.task.type; simulate(HOUR); const sum = simulateAway(3 * HOUR); const j = writeJournal(sum); return { card, task, moles: S.stats.moles, log: S.log.slice(0, 3).map((l) => l.msg || l), j: j.text }; });
  console.log(JSON.stringify(r, null, 1));
  await p.waitForTimeout(800);
  await p.evaluate(() => closeModalQuiet()); await p.click('[data-city=journal]'); await p.waitForTimeout(400);
  console.log('journal:', (await p.textContent('#modalBody')).slice(0, 300));
  await p.screenshot({ path: 'city-journal.png' });
  console.log('errs', errs); await b.close();
})();

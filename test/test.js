const { chromium } = require('playwright-core');
const path = require('path');
const URL = process.env.URL || 'file://' + path.resolve(__dirname, '../hollowdeep-prototype.html');
const assert = (c, m) => { if (!c) { throw new Error('ASSERT: ' + m); } console.log('  ✓ ' + m); };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(URL);
  await page.waitForTimeout(500);
  console.log('Boot');
  assert(await page.isVisible('#modal:not(.hidden)'), 'welcome modal shown');
  await page.screenshot({ path: 'shot-welcome.png' });
  await page.click('[data-act=close]');
  assert(await page.isVisible('#cityCanvas'), 'Colossus is the default view');
  await page.evaluate(() => setTab('capital'));
  assert(await page.isVisible('text=Lantern Hall'), 'capital renders buildings');
  await page.screenshot({ path: 'shot-capital.png', fullPage: true });

  console.log('Tabs');
  for (const t of ['hollow', 'outposts', 'raids', 'training', 'capital']) {
    await page.evaluate((t) => { const b = document.querySelector('nav#tabs [data-tab=' + t + ']'); if (b) b.click(); else setTab(t); }, t); await page.waitForTimeout(150);
    const len = await page.evaluate(() => document.getElementById('view').innerHTML.length);
    assert(len > (t === "raids" ? 100 : 500), `tab ${t} renders (${len} chars)`);
    await page.screenshot({ path: `shot-${t}.png`, fullPage: true });
  }

  console.log('Training taps');
  await page.evaluate(() => setTab('training'));
  const box = await page.locator('#tapzone').boundingBox();
  for (let i = 0; i < 20; i++) { await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.5); await page.waitForTimeout(110); }
  // touch taps
  for (let i = 0; i < 5; i++) { await page.touchscreen.tap(box.x + 200, box.y + 100); await page.waitForTimeout(110); }
  let st = await page.evaluate(() => ({ today: HD.S.taps.days[Math.floor(HD.S.gameTime / 86400000)] || 0, boost: HD.boostPct() }));
  assert(st.today >= 24, `taps counted: ${st.today}`);
  assert(st.boost > 0, `boost > 0: ${st.boost.toFixed(2)}%`);
  const shown = await page.textContent('[data-bind=today]');
  assert(shown.startsWith(String(st.today)), 'tap counter displayed: ' + shown);
  // rate limit
  const burst = await page.evaluate(() => { let ok = 0; for (let i = 0; i < 40; i++) if (HD.doTap(null, null)) ok++; return ok; });
  assert(burst <= 12, `anti-autoclick burst limited (${burst} of 40 counted)`);
  // curve check: 3000 test taps -> 100%
  const curve = await page.evaluate(() => { const d = Math.floor(HD.S.gameTime / 86400000); const old = HD.S.taps.days[d]; HD.S.taps.days[d] = 750; const b = HD.boostPct(); HD.S.taps.days[d] = old; return b; });
  assert(Math.abs(curve - 100 * Math.pow(0.25, 0.75)) < 0.01, `curve 750/3000 => ${curve.toFixed(1)}% (≈35.4)`);
  await page.screenshot({ path: 'shot-training-tapped.png', fullPage: true });

  console.log('Expedition in test mode (real time)');
  await page.evaluate(() => setTab('hollow'));
  await page.click('[data-act=exp][data-id="1"]');
  st = await page.evaluate(() => HD.S.hero.task);
  assert(st && st.type === 'expedition', 'expedition started');
  const lvl0 = await page.evaluate(() => ({ exp: HD.S.stats.expeditions, task: !!HD.S.hero.task }));
  console.log('  waiting ~62s real for 1 game hour...');
  await page.waitForFunction(() => !HD.S.hero.task || HD.S.hero.task.type === 'stranded', null, { timeout: 75000, polling: 1000 });
  st = await page.evaluate(() => ({ exp: HD.S.stats.expeditions, task: HD.S.hero.task, log: HD.S.log.slice(0, 4).map((l) => l.msg) }));
  assert(st.exp === 1 || (st.task && st.task.type === 'stranded'), 'expedition resolved in real time: ' + st.log[0]);
  await page.screenshot({ path: 'shot-hollow-after.png', fullPage: true });
  // Raids are off (CONFIG.raidsEnabled=false): no tutorial raid, no popup, even across a long simulation
  await page.evaluate(() => HD.simulate(40 * 3600e3)); await page.waitForTimeout(500);
  st = await page.evaluate(() => ({ lr: HD.S.lastRaid, pr: HD.S.pendingReveal, modal: !document.getElementById('modal').classList.contains('hidden') && /Raid on your capital/.test(document.getElementById('modalBody').textContent) }));
  assert(!st.lr && !st.pr && !st.modal, 'raids disabled: no AI raid on the capital after 40 game hours');
  await page.evaluate(() => closeModalQuiet());

  console.log('Build + outposts + chain');
  await page.evaluate(() => setTab('capital'));
  await page.click('[data-act=build][data-id=hall]');
  assert(await page.evaluate(() => !!HD.S.build), 'build started');
  // Cheat resources to test chain
  await page.evaluate(() => { const S = HD.S; for (const k in S.res) S.res[k] = 5000; S.buildings.storehouse = 10; S.buildings.lift = 3; S.buildings.hall = 5; S.nextRaidAt = 1e15; /* keep random AI raids out of the chain test */ });
  await page.evaluate(() => HD.startMove(HD.S.outposts[0].uid, 'l4iron'));
  assert(await page.evaluate(() => HD.S.outposts[0].state === 'packing'), 'move started (packing)');
  await page.evaluate(() => HD.simulate(12 * 3600e3));
  st = await page.evaluate(() => ({ s: HD.S.outposts[0].state, l: HD.S.outposts[0].layer }));
  assert(st.s === 'anchored' && st.l === 4, 'outpost re-anchored on layer 4');
  await page.evaluate(() => { HD.S.res.lumen = 5000; HD.installModule(HD.S.outposts[0].uid, 'smelter'); HD.S.res.steel = 0; });
  await page.evaluate(() => HD.simulate(5 * 3600e3));
  st = await page.evaluate(() => ({ steel: HD.S.res.steel, stock: HD.S.outposts[0].stock, ship: HD.S.lastShip }));
  assert(st.steel > 0, `steel refined below and lifted to capital: ${st.steel.toFixed(1)} (last lift pull ${st.ship.cost.toFixed(2)})`);
  await page.evaluate(() => setTab('outposts')); await page.waitForTimeout(200);
  await page.screenshot({ path: 'shot-outposts-chain.png', fullPage: true });
  // move menu opens
  await page.evaluate(() => { HD.S.res.lumen = 5000; });
  await page.evaluate(() => setTab('outposts'));
  await page.waitForTimeout(1200);
  await page.click('[data-act=movemenu]');
  assert(await page.isVisible('text=Iron Seam'), 'move menu opened');
  await page.click('#modal [data-act=close]');

  console.log('Raids tab');
  await page.evaluate(() => { HD.S.hero.task = null; });
  await page.evaluate(() => setTab('raids'));
  assert(await page.isVisible('text=Raids are coming later') && !(await page.isVisible('[data-act=attack]')), 'Raids tab shows the coming-later note');
  await page.screenshot({ path: 'shot-attack.png' });

  console.log('Save / load / offline');
  const before = await page.evaluate(() => { HD.save(); return { gt: HD.S.gameTime, crowns: HD.S.res.crowns, lvl: HD.S.hero.level }; });
  // pretend we left 10 real minutes ago
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('hollowdeep.save.v1')); s.lastReal -= 10 * 60e3; /* an old save with a pending raid must be cleaned up */ s.pendingReveal = { kind: 'defense', who: 'x', stars: 1, lost: {}, gained: {}, atk: 1, def: 1, golems: 1, golemPower: 1, t: 0 }; s.nextRaidAt = 0; s.hero.task = { type: 'raid', rival: 0, start: 0, end: 1 }; localStorage.setItem('hollowdeep.save.v1', JSON.stringify(s)); window.onbeforeunload = null; });
  // prevent pagehide save from overwriting: override save
  await page.evaluate(() => { HD.save = () => {}; window.removeEventListener('pagehide', () => {}); });
  const raw = await page.evaluate(() => localStorage.getItem('hollowdeep.save.v1'));
  const page2 = await ctx.newPage();
  page2.on('pageerror', (e) => errors.push('pageerror2: ' + e.message));
  await page.close({ runBeforeUnload: false });
  await page2.addInitScript((r) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hollowdeep.save.v1', r); sessionStorage.setItem('seeded', '1'); } }, raw);
  await page2.goto(URL); await page2.waitForTimeout(600);
  const after = await page2.evaluate(() => ({ gt: HD.S.gameTime, crowns: HD.S.res.crowns, lvl: HD.S.hero.level }));
  assert(after.gt >= before.gt + 9.9 * 3600e3, `offline time simulated: +${((after.gt - before.gt) / 3600e3).toFixed(2)} game h`);
  assert(!(await page2.isVisible('#modal:not(.hidden)')) && !(await page2.isVisible('text=While you were away')) && !(await page2.$('#resbar')), 'no while-you-were-away popup and no resource bar on return (idle time still ran)');
  assert(await page2.evaluate(() => !HD.S.pendingReveal && !HD.S.lastRaid && !(HD.S.hero.task && HD.S.hero.task.type === 'raid') && HD.S.nextRaidAt > 1e14), 'old save with pending raid cleared on load');
  await page2.waitForTimeout(500); assert(!(await page2.isVisible('#rscene')), 'no raid reveal after the away summary');
  await page2.screenshot({ path: 'shot-away.png' });

  console.log('Skip + reset');
  await page2.waitForTimeout(500);
  if (await page2.isVisible('#rscene')) await page2.click('#modal [data-act=close]');
  await page2.click('[data-act=settings]');
  const gt8 = await page2.evaluate(() => HD.S.gameTime); await page2.click('[data-act=skip][data-id="8"]'); await page2.waitForTimeout(200);
  assert(await page2.evaluate((g) => HD.S.gameTime >= g + 7.9 * 3600e3, gt8) && !(await page2.isVisible('text=While you were away')) && !(await page2.isVisible('#modal:not(.hidden)')), 'skip +8h runs the idle time with no popup');
  await page2.waitForTimeout(300);
  if (await page2.isVisible('#rscene')) await page2.click('#modal [data-act=close]');
  page2.on('dialog', (d) => d.accept());
  await page2.click('[data-act=settings]');
  await page2.click('[data-act=toggletest]');
  assert(await page2.evaluate(() => HD.S.testMode === false), 'test mode toggles off');
  await page2.click('[data-act=toggletest]');
  await page2.click('[data-act=reset]');
  await page2.waitForTimeout(300);
  assert(await page2.evaluate(() => HD.S.gameTime < 3600e3 && HD.S.hero.level === 1), 'reset works');

  // desktop viewport smoke
  const p3 = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  p3.on('pageerror', (e) => errors.push('pageerror3: ' + e.message));
  await p3.goto(URL); await p3.waitForTimeout(400); await p3.screenshot({ path: 'shot-desktop.png' });

  console.log('\nErrors:', errors.length ? errors : 'none');
  await browser.close();
  if (errors.length) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });

// Ledgeville map tests (mobile viewport, headless)
const { chromium } = require('playwright-core'); const path = require('path');
const URL = 'https://dominicg5.github.io/hollowdeep/';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message + ' ' + e.stack)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL); await p.waitForTimeout(1200);
  if (await p.isVisible('#modal:not(.hidden)')) await p.click('#modal [data-act=close]');
  await p.waitForTimeout(1500);
  ok(await p.isVisible('#cityCanvas'), 'Ledgeville is default tab and canvas visible');
  const g = await p.evaluate(() => ({ homes: W.homes.length, regions: REGIONS.length, cracks: W.cracks.length }));
  ok(g.homes > 300, `homes generated: ${g.homes}`); ok(g.regions === 9, '9 regions'); ok(g.cracks > 10, 'cracks: ' + g.cracks);
  // canvas non-blank
  const varied = await p.evaluate(() => { const c = document.getElementById('cityCanvas'), x = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; const set = new Set(); for (let i = 0; i < x.length; i += 4 * 997) set.add((x[i] >> 4) + ',' + (x[i + 1] >> 4) + ',' + (x[i + 2] >> 4)); return set.size; });
  ok(varied > 40, 'map renders varied pixels: ' + varied);
  const camHome = await p.evaluate(() => [CityMap.cam.x - W.player.x, CityMap.cam.y - W.player.y]);
  ok(Math.hypot(...camHome) < 5, 'opens centered on player home');
  // drag
  const c0 = await p.evaluate(() => ({ ...CityMap.cam }));
  await p.mouse.move(200, 500); await p.mouse.down(); await p.mouse.move(120, 420, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(300);
  const c1 = await p.evaluate(() => ({ ...CityMap.cam }));
  ok(c1.x > c0.x + 20 && c1.y > c0.y + 20, `drag pans camera (${(c1.x - c0.x).toFixed(0)},${(c1.y - c0.y).toFixed(0)})`);
  // wheel zoom
  await p.mouse.move(200, 500); await p.mouse.wheel(0, 400); await p.waitForTimeout(300);
  const c2 = await p.evaluate(() => CityMap.cam.z); ok(c2 < c1.z, `wheel zooms out ${c1.z.toFixed(2)} -> ${c2.toFixed(2)}`);
  await p.click('[data-city=zin]'); await p.waitForTimeout(500); const c3 = await p.evaluate(() => CityMap.cam.z); ok(c3 > c2, 'zoom button zooms in');
  // touch pinch via CDP
  const cdp = await ctx.newCDPSession(p); const zb = await p.evaluate(() => CityMap.cam.z);
  const tp = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) });
  await tp('touchStart', [[180, 500], [220, 500]]); for (let i = 1; i <= 8; i++) await tp('touchMove', [[180 - i * 10, 500], [220 + i * 10, 500]]); await tp('touchEnd', []);
  await p.waitForTimeout(300); const za = await p.evaluate(() => CityMap.cam.z); ok(za > zb * 1.3, `pinch zooms in ${zb.toFixed(2)} -> ${za.toFixed(2)}`);
  // tap an AI home → card with Raid
  await p.evaluate(() => { const h = W.homes.find((h) => !h.player && h.region === 3); CityMap.flyTo(h.x, h.y, 1.4, true); window.__h = h; });
  await p.waitForTimeout(400);
  const pt = await p.evaluate(() => { const [x, y] = CityMap.w2s(__h.x, __h.y); return [x, y]; });
  const box = await p.locator('#cityCanvas').boundingBox();
  await p.touchscreen.tap(box.x + pt[0], box.y + pt[1]); await p.waitForTimeout(500);
  const card = await p.textContent('#modalBody').catch(() => '');
  const hname = await p.evaluate(() => __h.name);
  ok(card.includes(hname) && /Raid/.test(card), 'tapping a home opens its card with Raid: ' + hname);
  await p.screenshot({ path: 'live-city-home-card.png' });
  await p.click('#modal [data-act=mapraid]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => S.hero.task && S.hero.task.type === 'raid' && !!S.hero.task.map), 'map raid starts a hero task');
  console.log('task', JSON.stringify(await p.evaluate(() => S.hero.task))); await p.evaluate(() => { simulate(3 * HOUR); rerender(true); });
  await p.waitForTimeout(500);
  ok(await p.evaluate(() => !S.hero.task), 'map raid resolves');
  await p.evaluate(() => closeModalQuiet());
  // market & vault cards
  await p.evaluate(() => { S.res.crowns = 5000; const m = W.markets[7]; CityMap.flyTo(m.x, m.y, 1.2, true); CityMap.handleTap(...CityMap.w2s(m.x, m.y)); });
  await p.waitForTimeout(300); ok(/Bazaar|Market/.test(await p.textContent('#modalBody')), 'market card opens');
  const before = await p.evaluate(() => S.res.moss);
  const buy = p.locator('#modal [data-act=mbuy]').first(); await buy.click(); await p.waitForTimeout(200);
  ok(await p.evaluate((b) => Object.values(S.res).length && S.res.crowns < 5000, before), 'market buy spends crowns');
  await p.evaluate(() => closeModalQuiet());
  await p.evaluate(() => { const v = W.vaults[0]; CityMap.flyTo(v.x, v.y, 1.2, true); CityMap.handleTap(...CityMap.w2s(v.x, v.y)); }); await p.waitForTimeout(300);
  ok(/Vault/.test(await p.textContent('#modalBody')), 'vault card opens'); await p.evaluate(() => closeModalQuiet());
  // NPC + landmark + region
  await p.evaluate(() => { const L = W.landmarks[0]; CityMap.flyTo(L.x, L.y, 1.2, true); CityMap.handleTap(...CityMap.w2s(L.x, L.y)); }); await p.waitForTimeout(300);
  ok((await p.textContent('#modalBody')).length > 80, 'landmark lore card'); await p.evaluate(() => closeModalQuiet());
  // Ticker
  ok((await p.textContent('#ticker')).length > 10, 'rumor ticker shows: ' + (await p.textContent('#ticker')).trim());
  // other tabs still work
  for (const t of ['capital', 'hollow', 'outposts', 'raids', 'training', 'city']) { await p.evaluate((t) => { const b = document.querySelector('nav#tabs [data-tab=' + t + ']'); if (b) b.click(); else setTab(t); }, t); await p.waitForTimeout(250); }
  ok(await p.isVisible('#cityCanvas'), 'tab switching round-trip');
  await p.evaluate(() => setTab('capital')); ok(await p.isVisible('text=Lantern Hall'), 'capital tab renders'); ok(!(await p.isVisible('#cityCanvas')), 'city hidden on other tabs');
  await p.click('nav#tabs [data-tab=city]'); await p.waitForTimeout(300);
  // Screenshots: far / mid / close
  const shot = async (name, x, y, z, w = 2200) => { await p.evaluate(([x, y, z]) => CityMap.flyTo(x, y, z, true), [x, y, z]); await p.waitForTimeout(w); await p.screenshot({ path: name }); };
  await p.evaluate(() => { S.seasonOverride = null; S.festivalOverride = false; });
  await shot('live-city-far.png', 0, 0, 0.1, 4000);
  const r = await p.evaluate(() => { const m = W.markets[4]; return [m.x, m.y]; }); await shot('live-city-mid.png', r[0], r[1], 0.45);
  const ph = await p.evaluate(() => [W.player.x + 40, W.player.y - 60]); await shot('live-city-close.png', ph[0], ph[1], 1.6);
  // festival (no night shots: always daylight)
  await p.evaluate(() => { CityMap.onAct('season', { id: 'fest' }); closeModalQuiet(); }); await p.waitForTimeout(400);
  const fest = await p.evaluate(() => festival()); console.log('festival:', fest);
  await shot('live-city-festival.png', 0, 600, 0.3, 3000);
  const fps = await p.evaluate(() => CityMap.fps); ok(fps > 40, 'fps ' + fps.toFixed(0));
  ok(errs.length === 0, 'no JS errors ' + errs.slice(0, 3).join(' | '));
  await b.close(); console.log(fails ? `${fails} FAILED` : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();

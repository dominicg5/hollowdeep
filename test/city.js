// Rim City map tests (mobile viewport, headless)
const { chromium } = require('playwright-core'); const path = require('path');
const URL = process.env.URL || 'http://localhost:8765/hollowdeep-prototype.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message + ' ' + e.stack)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL); await p.waitForTimeout(1200);
  if (await p.isVisible('#modal:not(.hidden)')) await p.click('#modal [data-act=close]');
  await p.waitForFunction(() => typeof ART !== 'undefined' && ART.ready, null, { timeout: 30000 }); await p.waitForTimeout(2500);
  ok(await p.evaluate(() => ART.ok), 'painted art assets loaded');
  ok(await p.isVisible('#cityCanvas'), 'Rim City is default tab and canvas visible');
  const g = await p.evaluate(() => ({ homes: W.homes.length, cracks: W.cracks.length, R: CITY.R, mk: W.markets.length, vt: W.vaults.length, mtn: W.mountains.length, br: W.bridges.length, fish: (W.dayFish||[]).length + (W.nightFish||[]).length, obs: !!CONFIG.resources.obsidian, wx: WEATHER_TYPES.filter((w) => w === 'storm' || w === 'rain').length, tiers: [...new Set(W.homes.map((h) => h.level))].length }));
  ok(g.homes > 15000, `metropolis homes generated: ${g.homes}`); ok(g.cracks > 10, 'crevices: ' + g.cracks); ok(g.mk === 0 && g.vt === 0, 'no bazaars or vaults on the map');
  ok(g.R >= 10000, 'big map radius ' + g.R); ok(g.mtn > 100, 'mountains: ' + g.mtn); ok(g.br > 20, 'bridges over crevices: ' + g.br);
  const v2 = await p.evaluate(() => ({ op: W.outposts.length, falls: !!W.lakeFalls, pass: !!W.pass, rivers: W.rivers.length - 1, stairs: W.stairs.length, fields: W.sets.length, onCliff: W.homes.filter((h) => onCliff(h.x, h.y, 0)).length, plateau: W.homes.filter((h) => plateauDist(h.x, h.y) < 0).length, radial: W.radial.length }));
  ok(v2.plateau > 3500 && v2.onCliff === 0, `Hollow on a raised plateau: ${v2.plateau} homes up top, ${v2.onCliff} on the cliffs, ${v2.stairs} stairways down`); ok(v2.stairs >= 4, 'stairs down the cliffs');
  ok(v2.radial >= 12, 'cracks spread out from the plateau: ' + v2.radial); ok(v2.op >= 6 && v2.fields > 20, `frontier outposts ${v2.op} with ${v2.fields} farm patches`);
  ok(v2.falls && v2.pass, 'Lake Falls Town and the Rift Pass placed'); ok(v2.rivers >= 4, 'rivers pouring into cracks: ' + v2.rivers);
  ok(g.fish === 0, 'no flying fish'); ok(g.wx === 0, 'no storms or rain in weather table'); ok(g.obs, 'obsidian resource still in economy');
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
  // labels anchored in world space while dragging
  await p.evaluate(() => CityMap.flyTo(W.player.x, W.player.y, 1.2, true)); await p.waitForTimeout(600);
  const L0 = await p.evaluate(() => CityMap.st.labels.map((l) => ({ ...l })));
  await p.mouse.move(200, 520); await p.mouse.down(); await p.mouse.move(140, 470, { steps: 6 }); await p.waitForTimeout(120);
  const L1 = await p.evaluate(() => CityMap.st.labels.map((l) => ({ ...l, w: CityMap.s2w(l.sx, l.sy) })));
  await p.mouse.up();
  let moved = 0, drift = 0;
  for (const a of L1) { const b = L0.find((x) => x.name === a.name); if (!b) continue; moved++; drift = Math.max(drift, Math.hypot(a.w[0] - a.wx, a.w[1] - a.wy), Math.abs((a.sx - b.sx) - (-60)) , Math.abs((a.sy - b.sy) - (-50))); }
  ok(moved >= 2 && drift < 3, `map labels stay anchored while dragging (${moved} labels, max drift ${drift.toFixed(2)})`);
  await p.evaluate(() => CityMap.flyTo(W.player.x, W.player.y, 1.05, true)); await p.waitForTimeout(300);
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
  await p.evaluate(() => { const h = W.homes.find((h) => !h.player && Math.hypot(h.x - W.player.x, h.y - W.player.y) > 300); CityMap.flyTo(h.x, h.y, 1.4, true); window.__h = h; });
  await p.waitForTimeout(400);
  const pt = await p.evaluate(() => { const [x, y] = CityMap.w2s(__h.x, __h.y); return [x, y]; });
  const box = await p.locator('#cityCanvas').boundingBox();
  await p.touchscreen.tap(box.x + pt[0], box.y + pt[1]); await p.waitForTimeout(500);
  const card = await p.textContent('#modalBody').catch(() => '');
  const hname = await p.evaluate(() => __h.name);
  ok(card.includes(hname) && /Raid/.test(card), 'tapping a home opens its card with Raid: ' + hname);
  await p.screenshot({ path: 'city-home-card.png' });
  await p.click('#modal [data-act=mapraid]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => S.hero.task && S.hero.task.type === 'raid' && !!S.hero.task.map), 'map raid starts a hero task');
  console.log('task', JSON.stringify(await p.evaluate(() => S.hero.task))); await p.evaluate(() => { simulate(3 * HOUR); rerender(true); });
  await p.waitForTimeout(500);
  ok(await p.evaluate(() => !S.hero.task), 'map raid resolves');
  await p.evaluate(() => closeModalQuiet());
  // NPC + landmark + region
  await p.evaluate(() => { const L = W.landmarks[0]; CityMap.flyTo(L.x, L.y, 1.2, true); CityMap.handleTap(...CityMap.w2s(L.x, L.y)); }); await p.waitForTimeout(300);
  ok((await p.textContent('#modalBody')).length > 80, 'landmark lore card'); await p.evaluate(() => closeModalQuiet());
  for (const k of ['lakeFalls', 'pass']) { await p.evaluate((k) => { const L = W[k]; CityMap.flyTo(L.x, L.y - L.r, 0.5, true); CityMap.handleTap(...CityMap.w2s(L.x, L.y - L.r * 0.6)); }, k); await p.waitForTimeout(300);
    ok(/Lake Falls|Rift Pass/.test(await p.textContent('#modalBody')), k + ' card opens'); await p.evaluate(() => closeModalQuiet()); }
  await p.evaluate(() => { const L = W.outposts[0]; CityMap.flyTo(L.x, L.y, 1, true); CityMap.handleTap(...CityMap.w2s(L.x, L.y)); }); await p.waitForTimeout(300);
  ok(/outpost|crack/i.test(await p.textContent('#modalBody')), 'outpost card opens'); await p.evaluate(() => closeModalQuiet());
  // Ticker
  ok((await p.textContent('#ticker')).length > 10, 'rumor ticker shows: ' + (await p.textContent('#ticker')).trim());
  // other tabs still work
  for (const t of ['capital', 'hollow', 'outposts', 'raids', 'training', 'city']) { await p.click(`nav#tabs [data-tab=${t}]`); await p.waitForTimeout(250); }
  ok(await p.isVisible('#cityCanvas'), 'tab switching round-trip');
  await p.click('nav#tabs [data-tab=capital]'); ok(await p.isVisible('text=Lantern Hall'), 'capital tab renders'); ok(!(await p.isVisible('#cityCanvas')), 'city hidden on other tabs');
  await p.click('nav#tabs [data-tab=city]'); await p.waitForTimeout(300);
  // Screenshots: far / mid / close
  const shot = async (name, x, y, z, w = 2200) => { await p.evaluate(([x, y, z]) => CityMap.flyTo(x, y, z, true), [x, y, z]); await p.waitForTimeout(w); await p.screenshot({ path: name }); };
  await p.evaluate(() => { S.seasonOverride = null; S.festivalOverride = false; });
  await shot('city-far.png', 0, 0, 0.1, 4000);
  await shot('city-mid.png', 2500, 1500, 0.45);
  const ph = await p.evaluate(() => [W.player.x + 40, W.player.y - 60]); await shot('city-close.png', ph[0], ph[1], 1.6);
  // metropolis close-ups: a bridge and a mountain
  const bq = await p.evaluate(() => { const b = W.bridges[5]; return [(b.p[0] + b.q[0]) / 2, (b.p[1] + b.q[1]) / 2]; }); await shot('city-bridge.png', bq[0], bq[1], 0.9, 1800);
  const mq = await p.evaluate(() => { const m = W.mountains[W.mountains.length - 3]; return [m.x, m.y]; }); await shot('city-mountain.png', mq[0], mq[1], 0.4, 1800);
  // night + festival
  await p.evaluate(() => { CityMap.onAct('season', { id: 'deep' }); closeModalQuiet(); }); await p.waitForTimeout(400);
  await shot('city-night.png', 0, -300, 0.22, 3000); await shot('city-night-close.png', ph[0], ph[1], 0.9, 2000);
  await p.evaluate(() => { CityMap.onAct('season', { id: 'fest' }); closeModalQuiet(); }); await p.waitForTimeout(400);
  const fest = await p.evaluate(() => festival()); console.log('festival:', fest);
  await shot('city-festival.png', 0, 600, 0.3, 3000);
  const fps = await p.evaluate(() => CityMap.fps); ok(fps > 40, 'fps ' + fps.toFixed(0));
  ok(errs.length === 0, 'no JS errors ' + errs.slice(0, 3).join(' | '));
  await b.close(); console.log(fails ? `${fails} FAILED` : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();

// Rim City map tests (mobile viewport, headless)
const { chromium } = require('playwright-core'); const path = require('path');
const URL = process.env.URL || 'http://localhost:8765/hollowdeep-prototype.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message + ' ' + e.stack)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL); await p.waitForTimeout(1200);
  if (await p.isVisible('#modal:not(.hidden)')) await p.click('#modal [data-act=close]');
  await p.waitForFunction(() => typeof ART !== 'undefined' && ART.ready, null, { timeout: 30000 }); await p.waitForTimeout(500);
  ok(await p.evaluate(() => ART.ok), 'painted art assets loaded');
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 150000 }).catch(() => {}); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => typeof THREE !== 'undefined' && THREE.REVISION === '149'), 'Three.js r149 vendored locally (no CDN)');
  ok(await p.evaluate(() => CityMap.is3d()), '3D renderer running (WebGL)');
  await p.waitForFunction(() => M3.models === 'ready' || M3.models === 'failed', null, { timeout: 60000 }).catch(() => {}); await p.waitForTimeout(1500);
  const g3 = await p.evaluate(() => ({ models: M3.models, mm: M3.st.models, sprites: M3.st.sprites, calls: M3.st.calls, tris: M3.st.tris, shadows: M3.dbgShadow ? M3.dbgShadow() : true }));
  ok(g3.models === 'ready' && g3.mm && g3.mm.homes > 700 && g3.calls > 3 && g3.tris > 1e5, `3D models loaded and instanced (${JSON.stringify(g3.mm)}), ${g3.calls} draw calls, ${g3.tris} tris`);
  ok(await p.isVisible('#cityCanvas'), 'Rim City is default tab and canvas visible');
  const g = await p.evaluate(() => ({ homes: W.homes.length, cracks: W.cracks.length, R: CITY.R, mk: W.markets.length, vt: W.vaults.length, mtn: W.mountains.length, br: W.bridges.length, fish: (W.dayFish||[]).length + (W.nightFish||[]).length, obs: !!CONFIG.resources.obsidian, wx: WEATHER_TYPES.filter((w) => w === 'storm' || w === 'rain').length, tiers: [...new Set(W.homes.map((h) => h.level))].length }));
  const hc = await p.evaluate(() => CITY.homeCount); ok(g.homes === hc && hc <= 1200, `light home count from one config value (CITY.homeCount=${hc}): ${g.homes}`); ok(g.cracks > 10, 'crevices: ' + g.cracks); ok(g.mk === 0 && g.vt === 0, 'no bazaars or vaults on the map');
  ok(g.R >= 10000, 'big map radius ' + g.R); ok(g.mtn > 100, 'mountains: ' + g.mtn);
  const v2 = await p.evaluate(() => ({ op: W.outposts.length, falls: !!W.lakeFalls, pass: !!W.pass, rivers: W.rivers.length - 1, water: CITY.water, stairs: W.stairs.length, fields: W.sets.length, onCliff: W.homes.filter((h) => onCliff(h.x, h.y, 0)).length, plateau: W.homes.filter((h) => plateauDist(h.x, h.y) < 0).length, radial: W.radial.length }));
  const rg = await p.evaluate(() => { const N = W.homes.length, cnt = {}; for (const h of W.homes) cnt[h.ring] = (cnt[h.ring] || 0) + 1; const gs = W.homes.filter((h) => !h.heartwood).map((h) => ({ k: h.ring, ...M3.ground(h.x, h.y) }));
    const B = rimBoard(); let mono = true; for (let i = 1; i < B.length; i++) if (!B[i].isPlayer && !B[i - 1].isPlayer && B[i].ring < B[i - 1].ring && B[i].deepest < B[i - 1].deepest) mono = false;
    return { N, cnt, hw: cnt[0] || 0, steep: gs.filter((g) => g.slope > 0.4).length, sum1: gs.filter((g) => g.k === 1 && g.h > CITY.summitH - 120).length, n1: gs.filter((g) => g.k === 1).length, low: gs.filter((g) => g.k >= 2 && g.h < CITY.summitH * 0.75).length, nOut: gs.filter((g) => g.k >= 2).length, mono,
      r2: Math.round(W.homes.filter((h) => h.ring === 2).reduce((s, h) => s + Math.hypot(h.x, h.y), 0) / (cnt[2] || 1)), r10: Math.round(W.homes.filter((h) => h.ring === 10).reduce((s, h) => s + Math.hypot(h.x, h.y), 0) / (cnt[10] || 1)) }; });
  ok(rg.hw === 10 && Object.keys(rg.cnt).length === 11 && [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].every((k) => Math.abs(rg.cnt[k] - rg.N / 10) < rg.N * 0.02 + 8), `ranks split into the Heartwood (top 10 players) + 10 decile rings: ${JSON.stringify(rg.cnt)}`);
  ok(rg.sum1 >= rg.n1 * 0.95 && rg.low >= rg.nOut * 0.95 && rg.steep <= 8 && rg.r10 > rg.r2 + 4000, `ring 1 on the summit (${rg.sum1}/${rg.n1}), rings 2-10 below on lowlands/slopes (${rg.low}/${rg.nOut}), ${rg.steep} on steep ground, ring 2 r=${rg.r2} .. ring 10 r=${rg.r10}`);
  ok(rg.mono, 'rings follow rank (deeper delvers never sit in an outer ring)');
  ok(v2.radial >= 12, 'cracks spread out from the plateau: ' + v2.radial);   ok(!v2.falls && v2.rivers <= 0 && !v2.water, 'no water features (no lake, rivers or falls) for now');
  // approved base only
  const base = await p.evaluate(() => ({ mole: currentMole(), fest: festival(), npcs: W.npcs.length, lifts: W.lifts.length, lm: W.landmarks.length, op: W.outposts.length, pass: !!W.pass, br: W.bridges.length, stairs: W.stairs.length, civic: W.civic.map((c) => c.type).join(','), ticker: getComputedStyle(document.getElementById('ticker')).display, btns: [...document.querySelectorAll('button[data-city]')].filter((b) => b.offsetParent !== null).map((b) => b.dataset.city).join(',') }));
  ok(!base.mole && !base.fest && base.npcs === 0, 'no mole, festivals/events or NPCs');
  ok(base.lifts + base.lm + base.op + base.br + base.stairs === 0 && !base.pass && base.civic === 'exchange', 'no lifts, landmarks, outposts, pass, bridges or stairs; only civic building is the Exchange');
  ok(base.ticker === 'none' && !/journal|season|legend/.test(base.btns) && /board/.test(base.btns), 'no rumor ticker, journal, season or legend buttons; leaderboard button present: ' + base.btns);
  // homes ringed by deepest level
  const dp = await p.evaluate(() => { const A = W.homes.filter((h) => !h.isPlayer).sort((a, b) => b.deepest - a.deepest), q = Math.floor(A.length / 4), m = (L) => L.reduce((s, h) => s + hollowDist(h.x, h.y), 0) / L.length;
    return { top: Math.round(m(A.slice(0, q))), bot: Math.round(m(A.slice(-q))), max: A[0].deepest, med: A[Math.floor(A.length / 2)].deepest, all: A.every((h) => h.deepest >= 1 && h.deepest < 99) }; });
  ok(dp.top < dp.bot && dp.all && dp.max < 90 && dp.med < 15, `deeper delvers live nearer the rim (top quarter ${dp.top} vs bottom ${dp.bot} from the rim; median Lv ${dp.med}, max Lv ${dp.max})`);
  const mv = await p.evaluate(() => { const d0 = hollowDist(W.player.x, W.player.y), r0 = rimRank(W.player); S.stats.deepest = (S.stats.deepest || 0) + 6; const moved = relocatePlayer(); const d1 = hollowDist(W.player.x, W.player.y), r1 = rimRank(W.player); S.stats.deepest -= 6; relocatePlayer(); M3.refresh(); return { moved, d0: Math.round(d0), d1: Math.round(d1), r0, r1 }; });
  ok(mv.moved && mv.d1 < mv.d0 && mv.r1 < mv.r0, `player's Ledge moves inward when their record improves (${mv.d0} -> ${mv.d1} from the rim, rank #${mv.r0} -> #${mv.r1})`);
  const seats = await p.evaluate(() => { const B = rimBoard(), R = W.homes.filter((h) => h.heartwood).sort((a, b) => a.slot - b.slot); return { n: R.length, slots: R.map((h) => h.slot).join(','), rankOk: R.every((h) => B.indexOf(h) === h.slot), higher: R.every((h, i) => !i || h.elev < R[i - 1].elev), lbl: ringLabel(R[0]) }; });
  ok(seats.n === 10 && seats.slots === '0,1,2,3,4,5,6,7,8,9' && seats.rankOk && seats.higher && seats.lbl === 'Heartwood #1', `the Heartwood seats the top 10 in numbered seats, #1 highest (${JSON.stringify(seats)})`);
  const hwv = await p.evaluate(() => { const d0 = S.stats.deepest; S.stats.deepest = 20; relocatePlayer(); const snap = () => W.homes.filter((h) => h.heartwood && !h.isPlayer).map((h) => h.id + ':' + Math.round(h.x)).sort().join(); const before = W.__hw0 || snap(); const r = { ring: W.player.ring, hw: !!W.player.heartwood, elev: Math.round(W.player.elev || 0), lbl: ringLabel(W.player), n: W.homes.filter((h) => h.heartwood).length, bumped: W.homes.some((h) => !h.heartwood && h.gx != null && h.ring === 1) }; S.stats.deepest = d0; relocatePlayer(); M3.refresh(); r.back = W.player.ring; r.n2 = W.homes.filter((h) => h.heartwood).length; r.restored = snap().split(',').length === 10; return r; });
  ok(hwv.ring === 0 && hwv.hw && hwv.elev > 1900 && hwv.lbl === 'Heartwood #1' && hwv.n === 10 && hwv.bumped && hwv.back > 0 && hwv.n2 === 10 && hwv.restored, `player moves into Heartwood seat #1 when in the top 10 (bumping #10 to ring 1) and back out (${JSON.stringify(hwv)})`);
  ok(await p.evaluate(() => CONFIG.raidsEnabled === false && S.nextRaidAt > 1e14 && !S.pendingReveal), 'raids are off game-wide (no raid timer, no pending raid)');
  ok(g.fish === 0, 'no flying fish'); ok(g.wx === 0, 'no storms or rain in weather table'); ok(g.obs, 'obsidian resource still in economy');
  // canvas non-blank
  const varied = await p.evaluate(() => { M3.render(performance.now() / 1000, CityMap.cam); const c = document.createElement('canvas'); c.width = M3.canvas.width; c.height = M3.canvas.height; c.getContext('2d').drawImage(M3.canvas, 0, 0); const x = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; const set = new Set(); for (let i = 0; i < x.length; i += 4 * 997) set.add((x[i] >> 4) + ',' + (x[i + 1] >> 4) + ',' + (x[i + 2] >> 4)); return set.size; });
  ok(varied > 40, '3D map renders varied pixels: ' + varied);
  const camHome = await p.evaluate(() => [CityMap.cam.x - W.player.x, CityMap.cam.y - W.player.y]);
  ok(Math.hypot(...camHome) < 5, 'opens centered on player home');
  // drag
  const c0 = await p.evaluate(() => ({ ...CityMap.cam }));
  await p.mouse.move(200, 500); await p.mouse.down(); await p.mouse.move(120, 420, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(300);
  const c1 = await p.evaluate(() => ({ ...CityMap.cam }));
  ok(c1.x > c0.x + 20 && c1.y > c0.y + 20, `drag pans camera (${(c1.x - c0.x).toFixed(0)},${(c1.y - c0.y).toFixed(0)})`);
  // labels anchored in world space while dragging and rotating (screen position == projection of the world anchor)
  await p.evaluate(() => { const C = W.homes.filter((o) => !o.isPlayer && !o.heartwood), nb = (o) => C.filter((q) => Math.hypot(q.x - o.x, q.y - o.y) < 1400).length; void nb; const h = W.homes.find((o) => o.heartwood && o.slot === 4); CityMap.flyTo(h.x, h.y, 0.3, true); }); await p.waitForTimeout(2500); await p.waitForFunction(() => CityMap.st.labels.filter((l) => W.homes.some((o) => o.heartwood && o.owner === l.name)).length >= 2, null, { timeout: 20000 }).catch(() => {}); // the Heartwood seats: their labels are always on, so several are in view
  const L0 = await p.evaluate(() => CityMap.st.labels.map((l) => ({ ...l })));
  await p.mouse.move(200, 520); await p.mouse.down(); await p.mouse.move(140, 470, { steps: 6 }); await p.waitForTimeout(150);
  const L1 = await p.evaluate(() => CityMap.st.labels.map((l) => ({ ...l, pr: CityMap.w2sUp(l.wx, l.wy, l.up) })));
  await p.mouse.up();
  let moved = 0, drift = 0;
  for (const a of L1) { const b = L0.find((x) => x.name === a.name); if (!b) continue; if (Math.hypot(a.sx - b.sx, a.sy - b.sy) > 20) moved++; drift = Math.max(drift, Math.hypot(a.pr[0] - a.sx, a.pr[1] - a.sy)); }
  ok(L1.length >= 2 && moved >= 1 && drift < 3, `map labels stay anchored to the world while dragging (${moved} labels moved, max drift ${drift.toFixed(2)}px)`);
  // two-finger twist rotates, two-finger vertical drag tilts (clamped 35-70)
  { const cdp0 = await ctx.newCDPSession(p); const tp0 = (type, pts) => cdp0.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) });
    const r0 = await p.evaluate(() => CityMap.cam.rot);
    await tp0('touchStart', [[150, 500], [250, 500]]); for (let i = 1; i <= 8; i++) { const a = i * 0.06; await tp0('touchMove', [[200 - 50 * Math.cos(a), 500 - 50 * Math.sin(a)], [200 + 50 * Math.cos(a), 500 + 50 * Math.sin(a)]]); } await tp0('touchEnd', []);
    const r1 = await p.evaluate(() => CityMap.cam.rot); ok(Math.abs(r1 - r0) > 0.3, `two-finger twist rotates the camera (${r0.toFixed(2)} -> ${r1.toFixed(2)} rad)`);
    const t0 = await p.evaluate(() => CityMap.cam.tilt);
    await tp0('touchStart', [[150, 500], [250, 500]]); for (let i = 1; i <= 10; i++) await tp0('touchMove', [[150, 500 + i * 12], [250, 500 + i * 12]]); await tp0('touchEnd', []);
    const t1 = await p.evaluate(() => CityMap.cam.tilt); ok(t1 !== t0 && t1 >= 35 && t1 <= 70, `two-finger vertical drag tilts (${t0.toFixed(0)}deg -> ${t1.toFixed(0)}deg, clamped 35-70)`);
    await tp0('touchStart', [[150, 500], [250, 500]]); for (let i = 1; i <= 20; i++) await tp0('touchMove', [[150, 500 - i * 25], [250, 500 - i * 25]]); await tp0('touchEnd', []);
    const t2 = await p.evaluate(() => CityMap.cam.tilt); ok(t2 >= 35 && t2 <= 70, 'tilt stays clamped: ' + t2.toFixed(0)); }
  // desktop: right-drag orbits; rotate buttons
  await p.evaluate(() => { window.__ac = setInterval(() => closeModalQuiet(), 100); });
  { const mo = await p.evaluate(() => { const o = !document.getElementById('modal').classList.contains('hidden') ? document.getElementById('modalBody').textContent.slice(0, 80) : ''; closeModalQuiet(); return o; }); if (mo) console.log('note: modal was open before right-drag:', mo.replace(/\s+/g, ' ')); const r0 = await p.evaluate(() => CityMap.cam.rot); await p.mouse.move(200, 500); await p.mouse.down({ button: 'right' }); await p.mouse.move(280, 500, { steps: 6 }); await p.mouse.up({ button: 'right' });
    const r1 = await p.evaluate(() => CityMap.cam.rot); ok(Math.abs(r1 - r0) > 0.2, `right-drag rotates (${r0.toFixed(2)} -> ${r1.toFixed(2)})`);
    await p.evaluate(() => closeModalQuiet()); await p.click('[data-city=rotl]'); await p.waitForFunction(() => !CityMap.cam.fly, null, { timeout: 15000 }); const r2 = await p.evaluate(() => CityMap.cam.rot); ok(Math.abs(Math.abs(r2 - r1) - Math.PI / 4) < 0.05, 'rotate button turns 45deg');
    await p.evaluate(() => closeModalQuiet()); await p.click('[data-city=tilt]'); await p.waitForTimeout(100); ok(await p.evaluate(() => CityMap.cam.tilt >= 35 && CityMap.cam.tilt <= 70), 'tilt button');
    await p.evaluate(() => { CityMap.cam.rot = 0; CityMap.cam.tilt = 55; }); }
  await p.evaluate(() => CityMap.flyTo(W.player.x, W.player.y, 1.05, true)); await p.waitForTimeout(300);
  // wheel zoom
  await p.evaluate(() => closeModalQuiet()); await p.mouse.move(200, 500); await p.mouse.wheel(0, 400); await p.waitForTimeout(300);
  const c2 = await p.evaluate(() => CityMap.cam.z); ok(c2 < c1.z, `wheel zooms out ${c1.z.toFixed(2)} -> ${c2.toFixed(2)}`);
  await p.evaluate(() => closeModalQuiet()); await p.click('[data-city=zin]'); await p.waitForTimeout(500); const c3 = await p.evaluate(() => CityMap.cam.z); ok(c3 > c2, 'zoom button zooms in');
  // touch pinch via CDP
  const cdp = await ctx.newCDPSession(p); const zb = await p.evaluate(() => CityMap.cam.z);
  const tp = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) });
  await p.evaluate(() => closeModalQuiet()); await tp('touchStart', [[180, 500], [220, 500]]); for (let i = 1; i <= 8; i++) await tp('touchMove', [[180 - i * 10, 500], [220 + i * 10, 500]]); await tp('touchEnd', []);
  await p.waitForTimeout(300); const za = await p.evaluate(() => CityMap.cam.z); ok(za > zb * 1.3, `pinch zooms in ${zb.toFixed(2)} -> ${za.toFixed(2)}`);
  await p.evaluate(() => clearInterval(window.__ac));
  // tap an AI home → card with Raid
  await p.evaluate(() => { const h = W.homes.find((h) => !h.isPlayer && !h.heartwood && Math.hypot(h.x - W.player.x, h.y - W.player.y) > 300); CityMap.flyTo(h.x, h.y, 1.4, true); window.__h = h; });
  await p.waitForTimeout(400);
  const pt = await p.evaluate(() => { const [x, y] = CityMap.w2sUp(__h.x, __h.y, homeW(__h) * 0.4); return [x, y]; });
  const box = await p.locator('#cityCanvas').boundingBox(); await p.evaluate(() => closeModalQuiet());
  await p.touchscreen.tap(box.x + pt[0], box.y + pt[1]); await p.waitForTimeout(500);
  const card = await p.textContent('#modalBody').catch(() => '');
  const hname = await p.evaluate(() => __h.name); console.log('card:', card.replace(/\s+/g, ' ').slice(0, 200));
  ok(card.includes(hname) && !/Raid/.test(card) && /Deepest: Lv \d+/.test(card) && /Rim rank #\d+/.test(card) && /Perks: \(coming soon\)/.test(card), 'tapping a home opens its safe social card (Deepest, Rim rank, Perks placeholder, no Raid): ' + hname);
  ok(/'s Ledge$/.test(hname), 'homes are Ledges named after their owner: ' + hname);
  await p.screenshot({ path: 'city-home-card.png' });
    await p.evaluate(() => closeModalQuiet());
  // the Exchange: tap it, buy a listing with Lumen, post a sell listing at our own price
  await p.evaluate(() => { const E = W.exchange; CityMap.flyTo(E.x, E.y, 0.8, true); S.res.lumen = Math.max(S.res.lumen || 0, 2000); S.res.stone = Math.max(S.res.stone || 0, 100); }); await p.waitForTimeout(1500);
  await p.evaluate(() => { const E = W.exchange; CityMap.handleTap(...CityMap.w2sUp(E.x, E.y, 80)); }); await p.waitForTimeout(400);
  ok(/The Exchange/.test(await p.textContent('#modalBody')) && (await p.locator('[data-act=exbuy]').count()) > 3, 'tapping the Exchange opens its order book');
  await p.screenshot({ path: 'city-exchange.png' });
  { const b0 = await p.evaluate(() => S.res.lumen); await p.locator('[data-act=exbuy]:not([disabled])').first().click(); await p.waitForTimeout(300); const b1 = await p.evaluate(() => S.res.lumen); ok(b1 < b0, `buying a listing spends Lumen (${b0} -> ${b1})`);
    if (!(await p.isVisible('#exK'))) { console.log('note: a game modal replaced the Exchange (' + (await p.textContent('#modalBody')).slice(0, 50).replace(/\s+/g, ' ') + '); reopening'); await p.evaluate(() => { closeModalQuiet(); CityMap.exchangeCard(); }); }
    await p.selectOption('#exK', 'stone'); await p.fill('#exQ', '20'); await p.fill('#exP', '0.7'); const s0 = await p.evaluate(() => S.res.stone); await p.click('[data-act=exsell]'); await p.waitForTimeout(300);
    const ex = await p.evaluate(() => ({ mine: S.exchange.mine.length, stone: S.res.stone })); ok(ex.mine === 1 && Math.abs(ex.stone - (s0 - 20)) < 3, 'posting a sell listing at our own price escrows the goods');
    await p.click('[data-act=excancel]'); await p.waitForTimeout(300); ok(await p.evaluate(() => S.exchange.mine.length === 0), 'cancelling returns the listing'); }
  await p.evaluate(() => closeModalQuiet());
  // Rim Leaderboard
  await p.click('[data-city=board]'); await p.waitForTimeout(300);
  { const bt = await p.textContent('#modalBody'); const pin = await p.textContent('#boardPin'); ok(/Rim Leaderboard/.test(bt) && /You/.test(pin) && /Lv \d+/.test(pin), 'leaderboard ranks homes by rim proximity with your row pinned: ' + pin.trim().replace(/\s+/g, ' '));
    ok(await p.evaluate(() => { const r = rimBoard(); return r.every((h, i) => i === 0 || r[i - 1].deepest >= h.deepest); }), 'leaderboard sorted by deepest level'); await p.screenshot({ path: 'city-board.png' }); }
  ok(/🌳 Heartwood #\d/.test(await p.textContent('#modalBody')), 'leaderboard marks Heartwood residents');
  { const hc2 = await p.evaluate(() => { closeModalQuiet(); const h = W.homes.find((o) => o.heartwood && !o.isPlayer); CityMap.homeCard(h); return document.getElementById('modalBody').textContent; }); ok(/Heartwood #\d+/.test(hc2) && /Rim rank #\d+/.test(hc2) && /'s Ledge/.test(hc2), 'a Heartwood Ledge card shows Heartwood as its ring'); await p.evaluate(() => closeModalQuiet()); }
  await p.evaluate(() => closeModalQuiet());
  // Ticker
  // other tabs still work
  for (const t of ['capital', 'hollow', 'outposts', 'raids', 'training', 'city']) { await p.click(`nav#tabs [data-tab=${t}]`); await p.waitForTimeout(250); }
  ok(await p.isVisible('#cityCanvas'), 'tab switching round-trip');
  await p.click('nav#tabs [data-tab=capital]'); ok(await p.isVisible('text=Lantern Hall'), 'capital tab renders'); ok(!(await p.isVisible('#cityCanvas')), 'city hidden on other tabs');
  await p.click('nav#tabs [data-tab=city]'); await p.waitForTimeout(300);
  // Screenshots: far / mid / close
  const shot = async (name, x, y, z, w = 2200) => { await p.evaluate(([x, y, z]) => CityMap.flyTo(x, y, z, true), [x, y, z]); await p.waitForTimeout(w); await p.screenshot({ path: name }); };
  await p.evaluate(() => { S.seasonOverride = null; S.festivalOverride = false; });
  await shot('city-far.png', 0, 1200, 0.035, 4000);
  await shot('city-mid.png', 0, 2600, 0.25, 3000);
  const ph = await p.evaluate(() => [W.player.x, W.player.y]); await shot('city-close.png', ph[0], ph[1], 1.0);
  const mq = await p.evaluate(() => { const m = W.mountains.filter((m) => m.type === 'mountain' && m.y < -6000)[0]; return [m.x, m.y + 1800]; }); await shot('city-mountain.png', mq[0], mq[1], 0.15, 3000);
  await p.evaluate(() => { window.__nf = nightFactor; window.nightFactor = () => 1; });
  await shot('city-night.png', 0, 2800, 0.13, 3000); await shot('city-night-close.png', ph[0], ph[1], 0.8, 2000);
  await p.evaluate(() => { window.nightFactor = window.__nf; });
  const fps = await p.evaluate(() => CityMap.fps); console.log('fps (SwiftShader software GL, not a phone GPU): ' + fps.toFixed(1));
  ok(errs.length === 0, 'no JS errors ' + errs.slice(0, 3).join(' | '));
  await b.close(); console.log(fails ? `${fails} FAILED` : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();

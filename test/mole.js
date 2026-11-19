// Mole pet: Start on the Explore bar -> it appears by her and follows; backpack ore is carried to the nearest Ledge Tether and lands in the vault; it loops
// (new ore -> another trip) until stopped; Stop hides it and stops hauling; leaving Explore hides it
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(1000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 150000 }).catch(() => {}); await p.waitForTimeout(800);
  const r = await p.evaluate(async () => { const out = {}, T = (n) => { for (let i = 0; i < n; i++) Mole.tick(1 / 30); }, TE = (n) => { for (let i = 0; i < n; i++) Explore.tick(1 / 30); }, WS = Explore.WS, F = Explore.ledgeFront();
    const k = Explore.reach(F.x + WS * 30, F.y + WS * 30); Explore.enter(k[0], k[1]); TE(10);
    const btn = () => document.querySelector('#exploreBar [data-mole]'); out.btn = !!btn() && btn().textContent; btn().click(); T(5); const M = Mole.M, h = Explore.here();
    out.start = { on: Mole.on, vis: !!(M.g && M.g.visible && M.g.parent), d: +(Math.hypot(M.pos[0] - h[0], M.pos[1] - h[1]) / WS).toFixed(2), label: btn().textContent, h: +(M.g.position.y - Explore.hAt(M.pos[0], M.pos[1])).toFixed(2) };
    // left behind: it walks back to her
    M.pos = [h[0] + WS * 14, h[1]]; M.path = null; T(120); out.follow = +(Math.hypot(M.pos[0] - h[0], M.pos[1] - h[1]) / WS).toFixed(2);
    // haul 1: ore in the bag goes to the vault via the nearest tether
    const id = 'ore:copper', v0 = Craft.get('vault', id); Craft.add('bag', id, 12); T(3); out.taken = { bag: Craft.get('bag', id), st: M.st, tether: M.tether && { d: Math.round(M.tether.d / WS), door: M.tether.door } };
    let f = 0; while (M.st !== 'follow' && f < 30 * 120) { T(1); f++; } out.trip1 = { vault: Craft.get('vault', id) - v0, bag: Craft.get('bag', id), trips: M.trips, secs: +(f / 30).toFixed(1), moved: Math.round(M.moved / WS) };
    // loop: more ore -> another trip, back by her afterwards
    Craft.add('bag', id, 5); T(60); f = 0; while (M.st !== 'follow' && f < 30 * 120) { T(1); f++; } T(400); const h2 = Explore.here(); out.trip2 = { vault: Craft.get('vault', id) - v0, trips: M.trips, back: +(Math.hypot(M.pos[0] - h2[0], M.pos[1] - h2[1]) / WS).toFixed(2) };
    // stop: hides, no more hauling
    btn().click(); Craft.add('bag', id, 4); T(90); out.stop = { on: Mole.on, vis: M.g.visible, bag: Craft.get('bag', id), label: btn().textContent }; Craft.add('bag', id, -4);
    // restart then leave Explore: hidden
    btn().click(); T(5); Explore.exit(); M3.render(0, CityMap.cam); out.exit = { vis: M.g.visible }; Mole.stop(); return out; });
  console.log(JSON.stringify(r));
  ok(r.btn && /Mole/.test(r.btn), 'Explore bar has a Mole button (' + r.btn + ')');
  ok(r.start.on && r.start.vis && r.start.d < 4 && Math.abs(r.start.h) < 2 && /Stop/.test(r.start.label), 'Start: the Mole appears on the ground beside her and the button turns to Stop ' + JSON.stringify(r.start));
  ok(r.follow < 3.6, 'left 14 m behind, it walks back to her (' + r.follow + ' m)');
  ok(r.taken.bag === 0 && r.taken.st === 'toTether' && r.taken.tether, 'ore in the backpack: it fills its satchel and heads for the nearest Ledge Tether ' + JSON.stringify(r.taken));
  ok(r.trip1.vault === 12 && r.trip1.trips === 1 && r.trip1.moved > 0, 'the load lands in the vault via the tether ' + JSON.stringify(r.trip1));
  ok(r.trip2.vault === 17 && r.trip2.trips === 2 && r.trip2.back < 3.6, 'it loops: new ore -> another trip, then back by her ' + JSON.stringify(r.trip2));
  ok(!r.stop.on && !r.stop.vis && r.stop.bag === 4 && /Mole/.test(r.stop.label), 'Stop: it burrows away and stops hauling ' + JSON.stringify(r.stop));
  ok(!r.exit.vis, 'leaving Explore hides it');
  ok(!errs.length, 'no page errors ' + errs.join(' | ')); await b.close(); console.log(fails ? fails + ' FAIL' : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();

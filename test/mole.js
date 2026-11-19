// Mole pet: in Explore it is out beside her and only follows; it hauls (backpack ore -> nearest Ledge Tether -> vault, looping) only when tasked with the Haul
// button, stops when told, and a loaded save never auto-starts hauling; leaving Explore hides it
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
    const btn = () => document.querySelector('#exploreBar [data-mole]'); out.btn = !!btn() && btn().textContent; T(5); const M = Mole.M, h = Explore.here();
    // by default it only follows: out beside her, not hauling
    out.start = { on: Mole.on, haul: Mole.haul, vis: !!(M.g && M.g.visible && M.g.parent), d: +(Math.hypot(M.pos[0] - h[0], M.pos[1] - h[1]) / WS).toFixed(2), label: btn().textContent, h: +(M.g.position.y - Explore.hAt(M.pos[0], M.pos[1])).toFixed(2) };
    M.pos = [h[0] + WS * 14, h[1]]; M.path = null; T(120); out.follow = +(Math.hypot(M.pos[0] - h[0], M.pos[1] - h[1]) / WS).toFixed(2);
    const id = 'ore:copper', v0 = Craft.get('vault', id); Craft.add('bag', id, 12); T(90); out.untasked = { bag: Craft.get('bag', id), st: M.st, vault: Craft.get('vault', id) - v0 };
    // tasked: the Haul button -> backpack ore goes to the vault via the nearest tether
    btn().click(); T(3); out.taken = { haul: Mole.haul, bag: Craft.get('bag', id), st: M.st, label: btn().textContent, tether: M.tether && { d: Math.round(M.tether.d / WS), door: M.tether.door } };
    let f = 0; while (M.st !== 'follow' && f < 30 * 120) { T(1); f++; } out.trip1 = { vault: Craft.get('vault', id) - v0, bag: Craft.get('bag', id), trips: M.trips, secs: +(f / 30).toFixed(1), moved: Math.round(M.moved / WS) };
    Craft.add('bag', id, 5); T(60); f = 0; while (M.st !== 'follow' && f < 30 * 120) { T(1); f++; } T(400); const h2 = Explore.here(); out.trip2 = { vault: Craft.get('vault', id) - v0, trips: M.trips, back: +(Math.hypot(M.pos[0] - h2[0], M.pos[1] - h2[1]) / WS).toFixed(2) };
    // told to stop: it stops hauling and keeps following
    btn().click(); Craft.add('bag', id, 4); T(90); out.stop = { on: Mole.on, haul: Mole.haul, vis: M.g.visible, st: M.st, bag: Craft.get('bag', id), label: btn().textContent };
    // a save that says hauling (or an old 'on' save) never auto-starts it: leave and come back
    S.mole.haul = true; S.mole.on = true; Explore.exit(); M3.render(0, CityMap.cam); out.exit = { vis: M.g.visible }; const k2 = Explore.reach(h2[0], h2[1]); Explore.enter(k2[0], k2[1]); T(90); out.reload = { haul: Mole.haul, saved: JSON.parse(JSON.stringify(S.mole)).haul, bag: Craft.get('bag', id), st: M.st, on: Mole.on };
    Craft.add('bag', id, -4); Explore.exit(); return out; });
  console.log(JSON.stringify(r));
  ok(r.btn && /haul/i.test(r.btn), 'Explore bar has a Mole haul button (' + r.btn + ')');
  ok(r.start.on && !r.start.haul && r.start.vis && r.start.d < 4 && Math.abs(r.start.h) < 2, 'by default the Mole is out beside her, only following ' + JSON.stringify(r.start));
  ok(r.follow < 3.6, 'left 14 m behind, it walks back to her (' + r.follow + ' m)');
  ok(r.untasked.bag === 12 && r.untasked.st === 'follow' && r.untasked.vault === 0, 'not tasked: ore stays in the backpack ' + JSON.stringify(r.untasked));
  ok(r.taken.haul && r.taken.bag === 0 && r.taken.st === 'toTether' && r.taken.tether && /Hauling|Stop/.test(r.taken.label), 'tasked: it fills its satchel and heads for the nearest Ledge Tether ' + JSON.stringify(r.taken));
  ok(r.trip1.vault === 12 && r.trip1.trips === 1 && r.trip1.moved > 0, 'the load lands in the vault via the tether ' + JSON.stringify(r.trip1));
  ok(r.trip2.vault === 17 && r.trip2.trips === 2 && r.trip2.back < 3.6, 'while tasked it loops: new ore -> another trip, then back by her ' + JSON.stringify(r.trip2));
  ok(r.stop.on && !r.stop.haul && r.stop.vis && r.stop.st === 'follow' && r.stop.bag === 4 && /haul/i.test(r.stop.label), 'Stop hauling: it stops and just follows ' + JSON.stringify(r.stop));
  ok(!r.exit.vis, 'leaving Explore hides it');
  ok(!r.reload.haul && r.reload.saved === false && r.reload.bag === 4 && r.reload.on, 'a save that said hauling does not auto-start it (saved haul = false) ' + JSON.stringify(r.reload));
  ok(!errs.length, 'no page errors ' + errs.join(' | ')); await b.close(); console.log(fails ? fails + ' FAIL' : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();

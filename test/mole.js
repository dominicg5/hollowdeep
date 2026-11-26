// Mole pet (t598u: Fetch reaches any vault item): in Explore it is out beside her and only follows; it hauls (backpack ore -> nearest Ledge Tether -> vault, looping) only when tasked with the Haul
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
    const k = Explore.reach(F.x + WS * 30, F.y + WS * 30); Explore.enter(k[0], k[1]); TE(10); if (!CharView.homeState().ports.c) CharView.plugPort('c', 'mithril', 'to'); // since e0b6248 a fresh Ledge lists no door tether until the main port is plugged (as tethertap / unplug / vaultxfer do)
    out.btn = !document.querySelector('#exploreBar [data-mole]'); T(5); const M = Mole.M, h = Explore.here(); const lbl = () => (M.task ? 'Hauling ' + M.task.kind : 'haul: none');
    // the Mole's task comes from his screen: tap him -> bubble -> Menu -> Haul inventory, pick the ore, Start hauling; Stop task there too
    const haulVia = () => { TE(1); M3.render(0, CityMap.cam); const p2 = M3.project(M.pos[0], M.pos[1], WS * 0.4); Explore.tap(p2[0], p2[1]); const bb = document.querySelector('#moleBubble.on [data-mb=menu]'); if (!bb) return false; bb.click(); const q = (s2) => document.querySelector('#modalBody ' + s2); q('[data-mo=kind][data-v=haul]').click(); const it = q('[data-mo=item][data-id="ore:copper"]'); if (!it) return false; it.click(); q('[data-mo=teth][data-v=door]').click(); const g = q('[data-mo=go]'); if (!g || g.disabled) return false; g.click(); return true; };
    const stopVia = () => { Mole.openScreen(); const b2 = document.querySelector('#modalBody [data-mo=stop]'); if (b2) b2.click(); closeModalQuiet(); };
    // by default it only follows: out beside her, not hauling
    out.start = { on: Mole.on, haul: Mole.haul, vis: !!(M.g && M.g.visible && M.g.parent), d: +(Math.hypot(M.pos[0] - h[0], M.pos[1] - h[1]) / WS).toFixed(2), label: lbl(), h: +(M.g.position.y - Explore.hAt(M.pos[0], M.pos[1])).toFixed(2) };
    M.pos = [h[0] + WS * 14, h[1]]; M.path = null; T(120); out.follow = +(Math.hypot(M.pos[0] - h[0], M.pos[1] - h[1]) / WS).toFixed(2);
    const id = 'ore:copper', v0 = Craft.get('vault', id); Craft.add('bag', id, 12); T(90); out.untasked = { bag: Craft.get('bag', id), st: M.st, vault: Craft.get('vault', id) - v0 };
    // tasked: the Haul button -> backpack ore goes to the vault via the nearest tether
    M.pos = [h[0] + WS * 2, h[1]]; T(1); out.via = haulVia(); T(3); out.taken = { via: out.via, haul: Mole.haul, bag: Craft.get('bag', id), st: M.st, label: lbl(), tether: M.tether && { d: Math.round(M.tether.d / WS), door: M.tether.door } };
    let f = 0; while (M.st !== 'follow' && f < 30 * 120) { T(1); f++; } out.trip1 = { vault: Craft.get('vault', id) - v0, bag: Craft.get('bag', id), trips: M.trips, secs: +(f / 30).toFixed(1), moved: Math.round(M.moved / WS) };
    Craft.add('bag', id, 5); T(60); f = 0; while (M.st !== 'follow' && f < 30 * 120) { T(1); f++; } T(400); const h2 = Explore.here(); out.trip2 = { vault: Craft.get('vault', id) - v0, trips: M.trips, back: +(Math.hypot(M.pos[0] - h2[0], M.pos[1] - h2[1]) / WS).toFixed(2) };
    // told to stop: it stops hauling and keeps following
    stopVia(); Craft.add('bag', id, 4); T(90); out.stop = { on: Mole.on, haul: Mole.haul, vis: M.g.visible, st: M.st, bag: Craft.get('bag', id), label: lbl() };
    // a save that says hauling (or an old 'on' save) never auto-starts it: leave and come back
    S.mole.haul = true; S.mole.on = true; Explore.exit(); M3.render(0, CityMap.cam); out.exit = { vis: M.g.visible }; const k2 = Explore.reach(h2[0], h2[1]); Explore.enter(k2[0], k2[1]); T(90); out.reload = { haul: Mole.haul, saved: JSON.parse(JSON.stringify(S.mole)).haul, bag: Craft.get('bag', id), st: M.st, on: Mole.on };
    // (t598u) a fetch is a permitted remote vault withdrawal: any vault item
    { const tid = 'tether:iron', cv0 = Craft.get('vault', id); Craft.add('vault', tid, 40); const tv0 = Craft.get('vault', tid), tb0 = Craft.get('bag', tid); Mole.openScreen(); const kb = document.querySelector('#modalBody [data-mo=kind][data-v=fetch]'); if (kb) kb.click();
      const ids = [...document.querySelectorAll('#modalBody [data-mo=item]')].map((e) => e.dataset.id); closeModalQuiet(); Mole.setTask('fetch', [id, tid], 'door'); let g = 0; while (Mole.M.fetch && g < 30 * 120) { T(1); g++; } T(30 * 20); Mole.untask();
      out.fetch = { ids: ids.join(), listed: ids.includes(id) && ids.includes(tid), copperOut: cv0 - Craft.get('vault', id), tetherOut: tv0 - Craft.get('vault', tid), tetherBag: Craft.get('bag', tid) - tb0 };
      const left = Craft.get('vault', tid); if (left) Craft.tetherDraw(() => Craft.add('vault', tid, -left)); const lb = Craft.get('bag', tid) - tb0; if (lb > 0) Craft.add('bag', tid, -lb); }
    { const I = M.g && M.g.userData.inst; out.glb = { inst: !!I, clips: I ? Object.keys(I.clips).sort().join(',') : '', proc: !!(M.g && M.g.userData.arms), handoff: NPC_MODELS.mole_pet.handoffS }; } /* (t740u) Art's mole GLB */
    Craft.add('bag', id, -4); Explore.exit(); return out; });
  console.log(JSON.stringify(r));
  ok(r.btn, 'no Mole button on the Explore bar any more (tap the Mole instead)');
  ok(r.start.on && !r.start.haul && r.start.vis && r.start.d < 4 && Math.abs(r.start.h) < 2, 'by default the Mole is out beside her, only following ' + JSON.stringify(r.start));
  ok(r.follow < 3.6, 'left 14 m behind, it walks back to her (' + r.follow + ' m)');
  ok(r.untasked.bag === 12 && r.untasked.st === 'follow' && r.untasked.vault === 0, 'not tasked: ore stays in the backpack ' + JSON.stringify(r.untasked));
  ok(r.taken.via && r.taken.haul && r.taken.bag === 0 && r.taken.st === 'toTether' && r.taken.tether && /Hauling|Stop/.test(r.taken.label), 'tasked from his screen (tap -> Menu -> Haul inventory): it fills its satchel and heads for the nearest Ledge Tether ' + JSON.stringify(r.taken));
  ok(r.trip1.vault === 12 && r.trip1.trips === 1 && r.trip1.moved > 0, 'the load lands in the vault via the tether ' + JSON.stringify(r.trip1));
  ok(r.trip2.vault === 17 && r.trip2.trips === 2 && r.trip2.back < 3.6, 'while tasked it loops: new ore -> another trip, then back by her ' + JSON.stringify(r.trip2));
  ok(r.stop.on && !r.stop.haul && r.stop.vis && r.stop.st === 'follow' && r.stop.bag === 4 && /none/.test(r.stop.label), 'Stop task: it stops and just follows ' + JSON.stringify(r.stop));
  ok(!r.exit.vis, 'leaving Explore hides it');
  ok(!r.reload.haul && r.reload.saved === false && r.reload.bag === 4 && r.reload.on, 'a save that said hauling does not auto-start it (saved haul = false) ' + JSON.stringify(r.reload));
  ok(r.fetch.listed && r.fetch.copperOut > 0, '(t598u) Fetch from vault lists any vault item and fetches it (copper leaves the vault) ' + JSON.stringify(r.fetch));
  ok(r.glb.inst && r.glb.clips === 'Deposit,Idle,Walk' && !r.glb.proc && r.glb.handoff === 1.3, '(t740u) the Mole is Art\'s GLB (Idle / Walk / Deposit), the procedural mole gone, hand-off at 1.3 s ' + JSON.stringify(r.glb));
  ok(!errs.length, 'no page errors ' + errs.join(' | ')); await b.close(); console.log(fails ? fails + ' FAIL' : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();

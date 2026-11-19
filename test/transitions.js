// Area transitions: map door Enter goes straight inside the Ledge, Go outside lands in front of the map door, and the loading screen shows/hides on every area switch
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(1000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 150000 }).catch(() => {}); await p.waitForTimeout(800);
  const r = await p.evaluate(async () => { const W8 = (ms) => new Promise((q) => setTimeout(q, ms)), L = AreaLoader.st, out = {}, until = async (f, ms) => { const t = performance.now(); while (!f() && performance.now() - t < ms) await W8(20); return Math.round(performance.now() - t); };
    const F = Explore.ledgeFront(); Explore.enter(F.x + 30, F.y + 30); for (let i = 0; i < 5; i++) Explore.tick(1 / 30); await W8(200);
    let s = L.shows; Explore.enterLedgeFromMap(); out.enter = { tab: ui.tab, mode: CharView.HM.mode, ext: CharView.HM.ext.visible, on: L.on, shown: L.shows - s, overlay: getComputedStyle(document.getElementById('areaLoader')).display };
    out.enter.ms = await until(() => !L.on, 30000); await W8(400); out.enter.gone = getComputedStyle(document.getElementById('areaLoader')).display;
    s = L.shows; CharView.goOutside(); out.exit = { tab: ui.tab, on: L.on, shown: L.shows - s }; out.exit.ms = await until(() => !L.on, 30000); await W8(300); const h = Explore.here(); out.exit.ex = Explore.on; out.exit.d = Math.round(Math.hypot(h[0] - F.x, h[1] - F.y));
    s = L.shows; setTab('home'); out.tab = { mode: CharView.HM.mode, shown: L.shows - s }; await until(() => !L.on, 30000);
    for (const t of ['tree', 'city', 'ledge', 'city']) { s = L.shows; setTab(t); out[t + (out[t] ? '2' : '')] = { shown: L.shows - s, ms: await until(() => !L.on, 30000) }; }
    s = L.shows; setTab('bag'); out.menu = L.shows - s; setTab('city'); return out; });
  console.log(JSON.stringify(r));
  ok(r.enter.tab === 'home' && r.enter.mode === 'in' && !r.enter.ext, 'Enter on the map Ledge door lands straight inside the Ledge (no door-front scene)');
  ok(r.enter.on && r.enter.shown === 1 && r.enter.overlay === 'flex', 'loading screen shows on entering the Ledge');
  ok(r.enter.ms >= 300 && r.enter.gone === 'none', `loading screen holds >= 300 ms then hides (${r.enter.ms} ms)`);
  ok(r.exit.tab === 'city' && r.exit.ex && r.exit.d < 20 && r.exit.shown === 1, `Go outside lands on the main map just in front of the Ledge door (${r.exit.d} units off), loader shown`);
  ok(r.exit.ms >= 300, `exit loader holds >= 300 ms (${r.exit.ms} ms)`);
  ok(r.tab.mode === 'in' && r.tab.shown === 1, 'the Ledge tab also opens inside, with the loader');
  ok(r.tree.shown === 1 && r.city.shown === 1 && r.ledge.shown === 1 && r.city2.shown === 1, 'loader on Lumen Tree interior, Hanging Camp (globe/tether travel) and back to the map');
  ok(r.menu === 0, 'menu tabs (Backpack) do not flash the loader');
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();

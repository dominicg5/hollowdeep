// Unplug the main Ledge door tether (Tether Settings / door ports): the rope leaves the world, the Orb lists, tap-a-tether and the map;
// the port is free; the change is saved. Plug does not take length, so Unplug does not refund metres (Take up of a drop still returns its length to the vault).
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html', SHOT = process.env.SHOT || '';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(1000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 200000 }).catch(() => {}); await p.waitForFunction(() => Explore.on, null, { timeout: 30000 }).catch(() => {});
  const shot = async (f) => { if (SHOT) { await p.waitForTimeout(400); await p.screenshot({ path: SHOT + '/' + f }); } };
  const snap = () => p.evaluate(() => {
    const hs = CharView.homeState(), L = Explore.tetherList(), R = Explore.tetherRoutes();
    let cords = [], plugs = 0;
    if (M3.scene) M3.scene.traverse((o) => {
      const dr = (o.userData && o.userData.ports) ? o : (o.children || []).find((c) => c.userData && c.userData.ports);
      if (dr && dr.userData && dr.userData.cords) { cords = cords.concat(dr.userData.cords.map((c) => c.userData.port)); plugs += dr.userData.plugs ? dr.userData.plugs.children.length : 0; }
    });
    return { ports: Object.keys(hs.ports || {}), list: L.map((t) => t.key + ':' + t.kind), routes: R.map((t) => t.key + ':' + t.kind),
      main: R.some((t) => t.kind === 'main'), door: L.some((t) => t.key === 'door' || t.key === 'camp'), cords, plugs,
      saved: JSON.parse(localStorage.getItem(CONFIG.saveKey) || '{}').home };
  });

  const a0 = await snap();
  console.log('fresh', JSON.stringify(a0));
  ok(!a0.ports.includes('c') && !a0.door && !a0.main && a0.cords.length === 0, 'a fresh Ledge has no main line listed, tappable or drawn until the main port is plugged');

  const plugged = await p.evaluate(() => { const okk = CharView.plugPort('c', 'mithril', 'to'); CharView.refreshPorts(); return { okk, len: Explore.tetherLen('c') }; });
  const a1 = await snap();
  console.log('plugged', JSON.stringify({ plugged, a1 }));
  ok(plugged.okk && a1.ports.includes('c') && a1.door && a1.main && a1.cords.includes('c'), `plugging the main port lays the house-to-Hanging-Camp line (${plugged.len} m)`);

  const ui = await p.evaluate(async () => { CharView.tetherOrb('set'); const el = document.getElementById('tetherOrb');
    const btn = el.querySelector('[data-to=unplug][data-v=c]'); if (btn) btn.click(); await new Promise((r) => setTimeout(r, 200));
    const el2 = document.getElementById('tetherOrb');
    const cards = [...el2.querySelectorAll('.toCard .toN, .toRow .toN')].map((e) => e.textContent.replace(/\s+/g, ' ').trim());
    const port = (el2.querySelector('.toPort') || {}).textContent; const plug = !!el2.querySelector('[data-to=plug][data-v=c]');
    el2.querySelector('[data-to=view][data-v=tp]') && el2.querySelector('[data-to=view][data-v=home]');
    CharView.tetherOrb('tp'); const tp = [...document.querySelectorAll('#tetherOrb .toN b')].map((e) => e.textContent);
    CharView.tetherOrbClose();
    return { had: !!btn, plug, port: port && port.replace(/\s+/g, ' ').trim(), cards, tp }; });
  console.log('ui', JSON.stringify(ui));
  const a2 = await snap();
  console.log('unplugged', JSON.stringify(a2));
  ok(ui.had && ui.plug && /^M\s?Plug in$/.test(ui.port || ''), 'Tether Settings Unplug frees the main port (M · Plug in; no status text, t662u) ' + ui.port);
  ok(!a2.ports.includes('c') && !a2.door && !a2.main && a2.cords.length === 0 && a2.plugs === 0, 'the rope is gone from the world, the lists and the map');
  ok(!ui.cards.some((t) => /House door tether|Hanging Camp/.test(t)) && !ui.tp.some((t) => /Ledge door|Hanging Camp/.test(t)), 'Tether Settings and Teleportation no longer list the main line');
  ok(a2.saved && !a2.saved.ports.c, 'the free port is written to the save');
  await shot('unplug-main.png');

  await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(800);
  await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st && M3.st.ok, null, { timeout: 200000 }).catch(() => {});
  await p.waitForFunction(() => typeof Explore !== 'undefined' && Explore.on, null, { timeout: 30000 }).catch(() => {});
  const a3 = await snap();
  console.log('reload', JSON.stringify(a3));
  ok(!a3.ports.includes('c') && !a3.door && !a3.main && a3.cords.length === 0, 'after reload the main line stays unplugged and gone');

  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  console.log(fails ? 'SOME FAILED' : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);
})();

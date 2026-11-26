// (t661) quick smoke test: the built game loads to the map with no page errors and no console errors; the creature table is there. No renders.
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })).newPage();
  const errs = [], cons = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') cons.push(m.text()); });
  const res = await p.goto(URL + '?t=' + Date.now(), { timeout: 90000, waitUntil: 'load' });
  ok(res && res.ok(), 'index.html loads (' + (res && res.status()) + ')');
  await p.waitForTimeout(3000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st && M3.st.ok, null, { timeout: 240000 }).catch(() => {});
  await p.waitForFunction(() => typeof Explore !== 'undefined' && Explore.on && CharView.st.gnd, null, { timeout: 120000 }).catch(() => {});
  const G = await p.evaluate(() => ({ m3: !!(M3.st && M3.st.ok), ex: !!Explore.on, gnd: !!CharView.st.gnd, S: typeof S !== 'undefined' && !!S, cr: typeof Creatures !== 'undefined' && Creatures.ids.join() }));
  ok(G.m3 && G.ex && G.gnd && G.S, 'the game reaches the map: 3D map ready, she is out exploring, save loaded ' + JSON.stringify(G));
  ok(G.cr === 'lumen_mushroom,tin_golem,copper_golem,coal_golem', 'creature table loaded (GD-30: + Art\'s Tin / Copper / Coal golems) (src/creatures/): ' + G.cr);
  await p.waitForTimeout(2000);
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  ok(!cons.length, 'no console errors' + (cons.length ? ': ' + cons.slice(0, 3).join(' | ') : ''));
  console.log(fails ? `${fails} FAILED` : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);
})();

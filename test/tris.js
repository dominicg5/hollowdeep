// triangle / draw-call budget at a few standard 3D views (software GL: fps is not meaningful, tris are)
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8766/index.html';
(async () => { const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
  await p.goto(URL); await p.waitForTimeout(800); await p.evaluate(() => closeModalQuiet()).catch(() => {});
  await p.waitForFunction(() => typeof M3 !== 'undefined' && (M3.models === 'ready' || M3.models === 'failed'), null, { timeout: 180000 });
  const V = await p.evaluate(() => ({ pl: [W.player.x, W.player.y], hw: [W.heartwood.x + Math.cos(W.heartwood.in) * 2600, W.heartwood.y + Math.sin(W.heartwood.in) * 2600] }));
  for (const [n, x, y, z, tilt] of [['home', ...V.pl, 1.0, 55], ['street', ...V.pl, 0.3, 45], ['ring', 0, 4200, 0.12, 48], ['over', 0, 1350, 0.03, 60], ['tree', ...V.hw, 0.025, 35]]) {
    await p.evaluate(([x, y, z, tilt]) => { closeModalQuiet(); CityMap.flyTo(x, y, z, true); CityMap.cam.tilt = tilt; }, [x, y, z, tilt]); await p.waitForTimeout(2500);
    console.log(n.padEnd(7), await p.evaluate(() => JSON.stringify({ tris: M3.st.tris, calls: M3.st.calls }))); }
  await b.close(); })();

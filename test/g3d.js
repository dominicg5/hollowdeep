const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/hollowdeep-prototype.html';
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1])); p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text().slice(0, 300)); });
  await p.goto(URL); await p.waitForTimeout(800);
  if (await p.isVisible('#modal:not(.hidden)')) await p.click('#modal [data-act=close]');
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 120000 }).catch(() => {});
  console.log('3d', await p.evaluate(() => JSON.stringify({ ok: M3.st.ok, sprites: M3.st.sprites })));
  const shot = async (n, x, y, z, rot, tilt, w) => { await p.evaluate(([x, y, z, rot, tilt]) => { CityMap.flyTo(x, y, z, true); CityMap.cam.rot = rot; CityMap.cam.tilt = tilt; }, [x, y, z, rot, tilt]); await p.waitForTimeout(w || 2500); await p.screenshot({ path: n }); };
  const pl = await p.evaluate(() => [W.player.x, W.player.y]);
  const only = process.env.ONLY;
  const S = [['g-home.png', ...pl, 1.0, 0, 55], ['g-home-rot.png', ...pl, 1.0, 2.2, 40], ['g-lip.png', 0, 2400, 0.3, 0, 45], ['g-hollow.png', 0, 600, 0.12, 0, 60], ['g-over.png', 0, 1500, 0.03, 0, 60], ['g-cliff.png', 600, 4700, 0.35, 0.4, 38], ['g-mtn.png', 0, -7600, 0.1, 0, 38], ['g-crack.png', 6200, 1200, 0.3, 1.2, 50], ['g-rim.png', ...(await p.evaluate(() => { const h = rimBoard()[0]; return [h.x, h.y]; })), 0.9, 0.8, 50], ['g-ex.png', ...(await p.evaluate(() => [W.exchange.x, W.exchange.y])), 0.7, 0.3, 45]];
  for (const s of S) if (!only || s[0].includes(only)) await shot(...s);
  if (only === 'over') { await b.close(); return; }
  await p.evaluate(() => { window.nightFactor = () => 1; }); await p.waitForTimeout(400);
  for (const s of [['g-n-hollow.png', 0, 2600, 0.14, 0, 50], ['g-n-home.png', ...pl, 0.9, 0.5, 50]]) if (!only || s[0].includes(only)) await shot(...s);
  console.log('stats', await p.evaluate(() => JSON.stringify({ fps: CityMap.fps.toFixed(1), calls: M3.st.calls, tris: M3.st.tris })));
  console.log('errors', errs.length, errs.slice(0, 5).join(' | '));
  await b.close();
})();

// (Dominic t565u) the volcano on the map views: the pull-out map (and the minimap) show his lava lake orange / red, the cone dark, the scorched ground charred
// black, and a Theus marker in the markers' style - drawn in code over the map colours (no texture). One targeted check, one small still with SHOT=dir.
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL + '?t=' + Date.now(), { timeout: 90000, waitUntil: 'commit' }); await p.waitForTimeout(1000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 240000 }).catch(() => {}); await p.waitForFunction(() => Explore.on && FORGE.M && FORGE.M.built && FORGE.M.ape, null, { timeout: 90000 }).catch(() => {});
  const r = await p.evaluate(() => { const F = FORGE, B = ExMap.baseImage(), g = B.cv.getContext('2d'), R = Explore.REG, C = Explore.C;
    const px = (X, Y) => { const [x, y] = F.wld(X, Y), i = Math.round((x - R.X0) / C / B.K), j = Math.round((y - R.Y0) / C / B.K); return Array.from(g.getImageData(i, j, 1, 1).data.slice(0, 3)); };
    const out = { lava: px(F.L.crater[0], 0), lavaEdge: px(F.L.crater[0] + 70, 0), cone: px(F.L.crater[0] - 130, 0), charred: [px(60, 150), px(200, -120), px(250, 60)], far: px(F.L.scorch[0] + F.L.scorch[2] + F.L.ash + 40, 0) };
    const L = ExMap.labels().find((q) => q.k === 'theus'); out.theus = L ? [L.t, Math.round(L.x - F.M.ape.position.x), Math.round(L.y - F.M.ape.position.z)] : null;
    const t0 = performance.now(); for (let k = 0; k < 2000; k++) F.mapTint(F.wld(k % 40 * 10, 0)[0], 0, [100, 100, 100]); out.ms = +(performance.now() - t0).toFixed(1);
    return out; });
  console.log(JSON.stringify(r));
  const [lr, lg, lb] = r.lava, [er, eg, eb] = r.lavaEdge; const lum = (c) => (c[0] + c[1] + c[2]) / 3;
  ok(lr > 230 && lg > 90 && lg < 210 && lb < 90 && er > 180 && eg < 120 && eb < 60, `his lava lake is orange in the middle (${r.lava}) and red toward its edge (${r.lavaEdge}) on the pull-out map`);
  ok(lum(r.cone) < 80 && r.charred.every((c) => lum(c) < 75 || (c[0] > 180 && c[1] < 100)) && lum(r.far) > 75, `the cone dark basalt (${r.cone}), the ground around it charred black / ember cracks (${r.charred.map((c) => c.join(',')).join(' | ')}), back to the normal ground past the ash band (${r.far})`);
  ok(r.theus && /Theus/.test(r.theus[0]) && Math.abs(r.theus[1]) < 1 && Math.abs(r.theus[2]) < 1, `a Theus marker at his forge (${r.theus && r.theus[0]}), a drawn disc in the map markers' size and frame (got volcano map)`);
  if (process.env.SHOT) { await p.evaluate(() => { ExMap.open(); const v = ExMap.st.view, F = FORGE, [x, y] = F.wld(F.L.crater[0] + 40, 0); v.cx = x; v.cy = y; v.s = Math.max(v.s, 0.06); ExMap.draw(); }); await p.waitForTimeout(800); await p.screenshot({ path: process.env.SHOT + '/volcano_map.png' }); }
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();

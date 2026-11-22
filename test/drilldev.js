// The Drills HUD button must show on the main Character-view game screen and hide when the
// player taps Dev (and come back when they tap Character). Uses the real view buttons, not a
// forced Explore.drillHud() after CityMap.setView — that path used to hide the bug.
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 })).newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(URL); await p.waitForTimeout(1000);
    await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
    await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 200000 }).catch(() => {});
    await p.waitForTimeout(800);
    const r = await p.evaluate(async () => {
      const shown = () => { const h = document.getElementById('drillHud'); return !!(h && h.classList.contains('on') && h.offsetParent !== null && h.querySelector('.dh')); };
      if (typeof CityMap !== 'undefined' && CityMap.setView) CityMap.setView('char');
      if (!Explore.on) { const F = Explore.ledgeFront(); Explore.enter(F.x, F.y); for (let i = 0; i < 8; i++) Explore.tick(1 / 30); }
      const D = Explore.drillState(); if (D && !Explore.fieldDrills(D).length) D.list.push({ id: 'hud1', node: 0, type: 'tin', tier: 'bronze', stand: 'drill', coal: 10, hop: 0 });
      Explore.drillHud();
      const char1 = shown();
      const devBtn = document.querySelector('[data-city=vdev]');
      if (devBtn) devBtn.click();
      const afterDev = { shown: shown(), mode: CityMap.mapView().mode, devv: !!(document.getElementById('city') && document.getElementById('city').classList.contains('devv')), on: !!(document.getElementById('drillHud') && document.getElementById('drillHud').classList.contains('on')) };
      const charBtn = document.querySelector('[data-city=vchar]');
      if (charBtn) charBtn.click();
      for (let i = 0; i < 8; i++) Explore.tick(1 / 30);
      const afterChar = { shown: shown(), mode: CityMap.mapView().mode };
      return { char1, afterDev, afterChar };
    });
    console.log(JSON.stringify(r));
    ok(r.char1, 'the Drills button is on the main Character-view screen');
    ok(r.afterDev.mode === 'dev' && r.afterDev.devv, 'tapping Dev switches to Dev view');
    ok(!r.afterDev.shown && !r.afterDev.on, 'the Drills button is hidden after tapping Dev (no forced drillHud)');
    ok(r.afterChar.mode === 'char' && r.afterChar.shown, 'the Drills button returns after tapping Character');
    ok(!errs.length, 'no page errors' + (errs.length ? ' ' + errs.join(' | ') : ''));
  } finally { await b.close(); }
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });

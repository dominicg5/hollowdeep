// playHudOk(): the Drills HUD button is hidden by default and shows only on the unobstructed
// Character-view play screen after boot (loading / boot screen gone, no overlay or menu), and
// only when at least one field drill is placed. Covers the loading screen, Char, Dev, the map
// overlay and a menu overlay.
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 })).newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
    const boot = await p.evaluate(() => {
      const L = document.getElementById('cityLoader'), h = document.getElementById('drillHud');
      const loaderOn = !!(L && !L.classList.contains('hidden'));
      const hudOn = !!(h && h.classList.contains('on') && h.offsetParent !== null);
      const booted = typeof M3 !== 'undefined' && M3.st && !!M3.st.ok;
      return { loaderOn, hudOn, booted, parent: h && h.parentElement && h.parentElement.id };
    });
    console.log(JSON.stringify({ boot }));
    ok(!boot.hudOn, 'the Drills button is not shown during boot / while the loading screen may still be up');

    await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} if (typeof setTab === 'function') setTab('city'); });
    await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 200000 }).catch(() => {});
    await p.waitForTimeout(600);

    const shown = () => p.evaluate(() => {
      if (typeof Explore !== 'undefined' && Explore.drillHud) Explore.drillHud();
      const h = document.getElementById('drillHud');
      return { shown: !!(h && h.classList.contains('on') && h.offsetParent !== null && h.querySelector('.dh')),
        on: !!(h && h.classList.contains('on')),
        ok: typeof Explore !== 'undefined' && typeof Explore.playHudOk === 'function' && Explore.playHudOk(),
        n: typeof Explore !== 'undefined' && Explore.fieldDrills ? Explore.fieldDrills().length : 0,
        loader: !!(document.getElementById('cityLoader') && !document.getElementById('cityLoader').classList.contains('hidden')),
        parent: (document.getElementById('drillHud') && document.getElementById('drillHud').parentElement && document.getElementById('drillHud').parentElement.tagName) || null,
        bagParent: (document.getElementById('exBagBtn') && document.getElementById('exBagBtn').parentElement && document.getElementById('exBagBtn').parentElement.tagName) || null };
    });

    const afterBoot = await p.evaluate(() => {
      if (!Explore.on) { const F = Explore.ledgeFront(); Explore.enter(F.x, F.y); for (let i = 0; i < 8; i++) Explore.tick(1 / 30); }
      if (typeof CityMap !== 'undefined' && CityMap.setView) CityMap.setView('char');
      try { closeModalQuiet(); } catch (e) {}
      Explore.drillHud();
      const D = Explore.drillState(), n = Explore.fieldDrills(D).length;
      const h = document.getElementById('drillHud');
      return { ok: Explore.playHudOk(), n, shown: !!(h && h.classList.contains('on') && h.offsetParent !== null) };
    });
    console.log(JSON.stringify({ afterBoot }));
    ok(afterBoot.ok && afterBoot.n === 0 && !afterBoot.shown, 'after boot, Character view with no placed drill: playHudOk is true but the button stays hidden');

    const placed = await p.evaluate(() => {
      const D = Explore.drillState();
      D.list.push({ id: 'hud1', node: 0, type: 'tin', tier: 'bronze', stand: 'drill', coal: 10, hop: 0 });
      Explore.drillHud();
      const h = document.getElementById('drillHud');
      return { ok: Explore.playHudOk(), n: Explore.fieldDrills(D).length,
        shown: !!(h && h.classList.contains('on') && h.offsetParent !== null && h.querySelector('.dh')),
        parent: h && h.parentElement && h.parentElement.tagName,
        bagParent: document.getElementById('exBagBtn') && document.getElementById('exBagBtn').parentElement && document.getElementById('exBagBtn').parentElement.tagName };
    });
    console.log(JSON.stringify({ placed }));
    ok(placed.ok && placed.n === 1 && placed.shown, 'on the main Character-view screen with a placed drill, the button shows');

    const loading = await p.evaluate(() => {
      const L = document.getElementById('cityLoader');
      if (L) L.classList.remove('hidden');
      Explore.drillHud();
      const h = document.getElementById('drillHud');
      const during = { ok: Explore.playHudOk(), shown: !!(h && h.classList.contains('on') && h.offsetParent !== null), loader: !!(L && !L.classList.contains('hidden')) };
      if (L) L.classList.add('hidden');
      Explore.drillHud();
      const after = { ok: Explore.playHudOk(), shown: !!(h && h.classList.contains('on') && h.offsetParent !== null) };
      return { during, after };
    });
    console.log(JSON.stringify({ loading }));
    ok(loading.during.loader && !loading.during.ok && !loading.during.shown, 'the button is hidden while the city loading screen is up');
    ok(loading.after.ok && loading.after.shown, 'the button returns once the loading screen is gone');

    const dev = await p.evaluate(() => {
      const devBtn = document.querySelector('[data-city=vdev]'); if (devBtn) devBtn.click();
      const h = document.getElementById('drillHud');
      const d = { mode: CityMap.mapView().mode, ok: Explore.playHudOk(), shown: !!(h && h.classList.contains('on') && h.offsetParent !== null) };
      const charBtn = document.querySelector('[data-city=vchar]'); if (charBtn) charBtn.click();
      for (let i = 0; i < 8; i++) Explore.tick(1 / 30);
      Explore.drillHud();
      const h2 = document.getElementById('drillHud');
      return { d, char: { mode: CityMap.mapView().mode, ok: Explore.playHudOk(), shown: !!(h2 && h2.classList.contains('on') && h2.offsetParent !== null) } };
    });
    console.log(JSON.stringify({ dev }));
    ok(dev.d.mode === 'dev' && !dev.d.ok && !dev.d.shown, 'the button is hidden in Dev view');
    ok(dev.char.mode === 'char' && dev.char.ok && dev.char.shown, 'the button returns in Character view');

    const map = await p.evaluate(() => {
      ExMap.open(); Explore.drillHud();
      const h = document.getElementById('drillHud');
      const open = { ok: Explore.playHudOk(), shown: !!(h && h.classList.contains('on') && h.offsetParent !== null) };
      ExMap.close(); Explore.drillHud();
      const h2 = document.getElementById('drillHud');
      return { open, after: { ok: Explore.playHudOk(), shown: !!(h2 && h2.classList.contains('on') && h2.offsetParent !== null) } };
    });
    console.log(JSON.stringify({ map }));
    ok(!map.open.ok && !map.open.shown, 'the button is hidden while the full Map overlay is open');
    ok(map.after.ok && map.after.shown, 'the button returns when the Map closes');

    const menu = await p.evaluate(() => {
      Craft.sheet(true); Explore.drillHud();
      const h = document.getElementById('drillHud');
      const open = { ok: Explore.playHudOk(), shown: !!(h && h.classList.contains('on') && h.offsetParent !== null) };
      Craft.sheet(false); Explore.drillHud();
      const h2 = document.getElementById('drillHud');
      return { open, after: { ok: Explore.playHudOk(), shown: !!(h2 && h2.classList.contains('on') && h2.offsetParent !== null) } };
    });
    console.log(JSON.stringify({ menu }));
    ok(!menu.open.ok && !menu.open.shown, 'the button is hidden while a menu overlay (backpack) is open');
    ok(menu.after.ok && menu.after.shown, 'the button returns when the menu closes');
    ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  } finally { await b.close(); }
  console.log(fails ? fails + ' FAIL' : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });

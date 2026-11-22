// Tether Mill HUD button (Dominic t450u, Art's SPEC §7): 64x64 left of Drills (right 84, bottom 280), shown only in Character view while the mill queue has jobs;
// hidden in Dev view (real Dev / Character buttons, as test/drilldev.js), under overlays and with an empty queue (even with spools on the rack); rack count in
// the corner pip; tap -> the compact progress view, read-only ("Collect from Brannick at the Tether Mill", no Collect button). SHOT=file.jpg renders both states.
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html', SHOT = process.env.SHOT || '';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: SHOT ? 2 : 1 })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL + '?t=' + Date.now(), { timeout: 90000, waitUntil: 'commit' }); await p.waitForTimeout(1000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 240000 }).catch(() => {});
  await p.evaluate(async () => { for (let i = 0; i < 120 && M3.models !== 'ready'; i++) await new Promise((r) => setTimeout(r, 1000)); });
  const tick = (ms) => new Promise((r) => setTimeout(r, ms));
  const r = await p.evaluate(async () => { const o = {}, w = (ms) => new Promise((r) => setTimeout(r, ms));
    const vis = () => { const h = document.getElementById('millHud'); return !!(h && h.classList.contains('on') && getComputedStyle(h).display !== 'none' && h.offsetParent !== null && h.querySelector('.mh')); };
    if (CityMap.setView) CityMap.setView('char'); if (!Explore.on) { const F = Explore.ledgeFront(); Explore.enter(F.x, F.y); for (let i = 0; i < 8; i++) Explore.tick(1 / 30); }
    S.mill = null; MillUI.st(); MillUI.tick(); Explore.drillHud(); o.empty0 = vis();
    Craft.add('bag', 'ingot:bronze', 40); MillUI.queue('braid', 'bronze', 10); S.mill.rack = { 'tether:bronze': 300 }; MillUI.tick(); await w(100); o.run = vis();
    const h = document.getElementById('millHud').getBoundingClientRect(), d = document.getElementById('drillHud') && document.getElementById('drillHud').getBoundingClientRect();
    o.box = { w: h.width, h: h.height, right: Math.round(innerWidth - h.right), bottom: Math.round(innerHeight - h.bottom), gap: d && d.width ? Math.round(d.left - h.right) : 8, sameRow: d && d.width ? Math.abs(d.top - h.top) < 1 : true };
    o.pip = (document.querySelector('#millHud .n') || {}).textContent;
    document.querySelector('[data-city=vdev]').click(); await w(100); o.dev = vis(); document.querySelector('[data-city=vchar]').click(); for (let i = 0; i < 8; i++) Explore.tick(1 / 30); await w(100); o.char = vis();
    Craft.sheet(true); await w(100); o.bag = vis(); Craft.sheet(false); await w(100); o.bagBack = vis();
    Skills.screen(true); await w(100); o.skills = vis(); Skills.screen(false); await w(100);
    document.querySelector('#millHud .mh').click(); await w(150); const g = document.getElementById('millProgress');
    o.prog = { on: !!(g && g.classList.contains('on')), txt: g ? g.textContent.replace(/\s+/g, ' ') : '', btns: g ? [...g.querySelectorAll('button')].map((x) => x.getAttribute('aria-label') || x.textContent) : [], ex: ['exBagBtn', 'exMapBtn', 'exSkillsBtn'].map((id) => { const e = document.getElementById(id); return e ? getComputedStyle(e).display : 'none'; }).join(), hud: vis(), drills: !!(document.getElementById('drillHud') && getComputedStyle(document.getElementById('drillHud')).display !== 'none') };
    return o; });
  console.log(JSON.stringify(r));
  ok(!r.empty0 && r.run, 'hidden with an empty queue; shown in Character view once a job is queued');
  ok(r.box.w === 64 && r.box.h === 64 && r.box.right === 84 && r.box.bottom === 280 && r.box.gap === 8 && r.box.sameRow, `64x64 at right 84 / bottom 280, 8 px left of Drills (${JSON.stringify(r.box)})`);
  ok(r.pip === '3', `the corner pip counts spools ready on the rack (${r.pip})`);
  ok(!r.dev && r.char, 'tapping Dev hides it (real Dev button, no forced refresh); Character brings it back');
  ok(!r.bag && r.bagBack && !r.skills, 'hidden under the Backpack and Skills overlays, back when they close');
  ok(r.prog.on && /Tether Mill/.test(r.prog.txt) && /Rolling while you're away · up to 72 h/.test(r.prog.txt) && /QUEUE · 1 job/.test(r.prog.txt) && /Bronze · spool 1 of 10/.test(r.prog.txt) && /3 spools · 300 m Bronze/.test(r.prog.txt) && /Collect from Brannick at the Tether Mill/.test(r.prog.txt) && r.prog.btns.join() === 'Close' && r.prog.ex === 'none,none,none' && !r.prog.hud && !r.prog.drills, `tap opens the read-only progress view (only a Close button; HUD buttons hidden): ${r.prog.txt.slice(0, 160)}`);
  if (SHOT) { await tick(1500); await p.screenshot({ path: '/tmp/millhud-1.png' }); await p.evaluate(() => MillUI.progress(false)); await tick(1200); await p.screenshot({ path: '/tmp/millhud-0.png' }); }
  const r2 = await p.evaluate(async () => { MillUI.progress(false); await new Promise((r) => setTimeout(r, 100)); const a = !!document.querySelector('#millHud.on'); while (S.mill.jobs.length) MillUI.cancel(S.mill.jobs[0].id); MillUI.tick(); await new Promise((r) => setTimeout(r, 100));
    return { back: a, rack: MillUI.rackCount(), gone: !document.querySelector('#millHud.on') }; });
  console.log(JSON.stringify(r2)); ok(r2.back && r2.rack >= 3 && r2.gone, 'closing the view brings the button back; emptying the queue hides it even with spools on the rack');
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close(); console.log(fails ? `${fails} FAILED` : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();

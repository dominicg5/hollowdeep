// Hanging Camp: a long press on the mithril vein opens the camp drill's panel (visible on the Portaledges tab); a short tap just mines
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 }), p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(1000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('ledge'); });
  await p.waitForFunction(() => typeof CharView !== 'undefined' && CharView.LP && CharView.LP.on, null, { timeout: 120000 }); await p.waitForTimeout(1500);
  const s = await p.evaluate(() => { const C = CharView, m = C.lpMineSpot(), sc = C.ledgeScreen(C.lpW2F(m.w)); return { x: Math.round(sc.x), y: Math.round(sc.y), camp: !!Explore.drillState().list.find((d) => d.camp) }; });
  ok(s.camp, 'the Hanging Camp has its camp drill');
  const cdp = await ctx.newCDPSession(p), tp = [{ x: s.x, y: s.y, id: 0 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp }); await p.waitForTimeout(900); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(400);
  const r = await p.evaluate(() => { const el = document.getElementById('drillUse') || document.getElementById('drillCtl'), rc = el && el.getBoundingClientRect(), D = Explore.drillState(); return { on: !!el && el.classList.contains('on'), vis: !!rc && rc.width > 0 && rc.height > 0 && getComputedStyle(el).display !== 'none', camp: !!(Explore.DRILL && Explore.DRILL.sel && Explore.DRILL.sel.camp), id: el && el.id, txt: el ? el.textContent.replace(/\s+/g, ' ').trim().slice(0, 80) : '' }; });
  console.log(JSON.stringify({ s, r }));
  ok(r.on && r.vis && r.camp, 'long press on the camp vein opens the at-drill prompt, visible on the Portaledges tab');
  ok(!errs.length, 'no page errors ' + errs.join(' | ')); await b.close(); console.log(fails ? fails + ' FAIL' : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();

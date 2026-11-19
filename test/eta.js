// map travel ETA vs the real walk: run a planned trip and compare the simulated arrival time with the ETA shown (within 10%)
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html';
(async () => { const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(800); await p.evaluate(() => closeModalQuiet()).catch(() => {});
  const R = await p.evaluate(async () => { setTab('city'); await new Promise((r) => setTimeout(r, 800)); Explore.build(); const H = Explore.doorSpots().find((q) => q.type === 'ledge'); const out = [];
    for (const [dx, dy] of [[520, 180], [-380, 460]]) { Explore.exit(); Explore.enter(H.x + H.nx * 40, H.y + H.nz * 40); for (let i = 0; i < 5; i++) Explore.tick(1 / 30); const EX = Explore.EX; EX.arrived = 0;
      const tr = ExMap.travelTo(H.x + dx, H.y + dy, 'test'); if (!tr) { out.push(null); continue; } let t = 0; while (!EX.arrived && t < 900) { Explore.tick(1 / 30); t += 1 / 30; }
      out.push({ eta: +tr.eta.s.toFixed(1), actual: +t.toFixed(1), lenM: Math.round(tr.len / Explore.WS), climbM: Math.round(tr.eta.climb), arrived: !!EX.arrived }); }
    return out; });
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); ok = ok && c; }; console.log(JSON.stringify(R));
  for (const r of R.filter(Boolean)) { chk(r.arrived, `arrived (${r.lenM} m path)`); chk(Math.abs(r.actual - r.eta) / r.actual <= 0.1, `ETA ${r.eta}s vs actual ${r.actual}s (within 10%)`); }
  chk(R.filter(Boolean).length >= 1, 'trips planned'); chk(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | ')); console.log(ok ? 'ALL PASS' : 'SOME FAILED'); await b.close(); })();

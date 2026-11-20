// Map open with 3 long tethers far from the Ledge (Dominic: the map froze / lagged after a 2nd far tether): two drills wired far out + one long drop tether,
// then times (CPU, main thread) opening the 3D map, opening the pull-out map, dragging it (20 redraws), the tether list the map / Mole / Orb read, and the
// Mole's tick - each under a budget. Frame rendering itself is not timed (headless swiftshader).
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => { const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(1000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 200000 }).catch(() => {}); await p.waitForFunction(() => Explore.on, null, { timeout: 60000 }).catch(() => {}); await p.waitForTimeout(1500);
  const s = await p.evaluate(() => { const WS = Explore.WS, F = Explore.ledgeFront(), D = Explore.drillState(); D.tetherM = 1e7; Craft.add('bag', 'tether:mithril', 400000); for (let i = 0; i < 8; i++) { try { CharView.unlockPort(); } catch (e) {} }
    const N = Explore.ORE.nodes, used = new Set(D.list.map((d) => d.node)), far = N.filter((q) => !q.cliff && !used.has(N.indexOf(q)) && Explore.oreStand(q)).sort((x, y) => Math.hypot(y.x - F.x, y.y - F.y) - Math.hypot(x.x - F.x, x.y - F.y)), out = [];
    for (const n of far) { if (out.length >= 2) break; if (out.length && Math.hypot(n.x - out[0].x, n.y - out[0].y) < WS * 300) continue; const d = Explore.drillDeploy(n); if (!d) continue; if (Explore.drillWire(d, true)) out.push({ x: n.x, y: n.y, len: d.len, kind: 'drill' }); }
    for (let r = 1500; r > 300; r -= 60) { const a = 4.1, x = F.x + Math.cos(a) * r * WS, y = F.y + Math.sin(a) * r * WS, q = Explore.reach(x, y); if (Math.hypot(q[0] - x, q[1] - y) > WS * 2) continue; Explore.enter(q[0], q[1]); for (let i = 0; i < 4; i++) Explore.tick(1 / 30); const dp = Explore.dropCreate(); if (dp && dp.ok) { out.push({ kind: 'drop', len: dp.need }); break; } else out.err = dp && (dp.err || JSON.stringify(dp).slice(0, 80)); }
    return out.map((o) => o.kind + ' ' + o.len + ' m').concat(out.err ? ['err ' + out.err] : []); });
  console.log('tethers', JSON.stringify(s)); ok(s.length === 3 && s.every((t) => +t.split(' ')[1] > 400), `3 long tethers laid far from the Ledge (${s.join(', ')})`);
  await p.evaluate(() => setTab('home')); await p.waitForTimeout(1500);
  const r = await p.evaluate(async () => { const tm = (f) => { const a = performance.now(); f(); return performance.now() - a; };
    const tl = tm(() => { for (let i = 0; i < 10; i++) Explore.tetherList(); }) / 10;
    const open3d = tm(() => setTab('city')); await new Promise((q) => setTimeout(q, 1500)); const tick = tm(() => { for (let i = 0; i < 10; i++) Explore.tick(1 / 30); }) / 10;
    const exOpen = tm(() => ExMap.open()); const drag = tm(() => { for (let i = 0; i < 20; i++) ExMap.draw(); }) / 20; const lab = tm(() => { for (let i = 0; i < 10; i++) ExMap.labels(); }) / 10; ExMap.close();
    let mole = 0; if (typeof Mole !== 'undefined' && Mole.tick) { Mole.M.routes = null; mole = tm(() => { for (let i = 0; i < 10; i++) Mole.tick(1 / 30); }) / 10; }
    const orb = tm(() => { CharView.tetherOrb('set'); CharView.tetherOrb('tp'); }); CharView.tetherOrbClose();
    const f = (v) => Math.round(v * 10) / 10; return { tetherList: f(tl), open3d: f(open3d), tick: f(tick), exOpen: f(exOpen), drag: f(drag), labels: f(lab), mole: f(mole), orb: f(orb) }; });
  console.log('TIMES ms', JSON.stringify(r));
  ok(r.tetherList < 3, `tether list (map, Mole, Orb read it) ${r.tetherList} ms < 3`); ok(r.exOpen < 600, `pull-out map opens in ${r.exOpen} ms < 600`); ok(r.drag < 40, `pull-out map redraw while dragging ${r.drag} ms < 40`); ok(r.labels < 3, `map labels ${r.labels} ms < 3`);
  ok(r.open3d < 400, `3D map open (main thread) ${r.open3d} ms < 400`); ok(r.tick < 60, `explore tick ${r.tick} ms < 60`); ok(r.mole < 20, `Mole tick ${r.mole} ms < 20`); ok(r.orb < 150, `Tether Orb lists ${r.orb} ms < 150`);
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | ')); console.log(fails ? 'SOME FAILED' : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0); })();

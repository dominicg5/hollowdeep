// mobile performance budget: phone viewport (390x844 @ dpr 2), standard views (Ledge, Lumen Tree, a mining field, willows at a lake mouth, Mosby, Dev overview);
// logs tris, draw calls, geometries, textures, programs, pixel ratio and the frame time (software GL here: ms are only relative, tris/calls are the real budget).
// BUDGET=1 fails a view over ~1.1M tris or ~170 calls (targets: <=1M tris, <=150 calls at typical views). Q=?quality=high etc. passes through.
const { chromium } = require('playwright-core');
const URL = (process.env.URL || 'http://localhost:8765/index.html') + (process.env.Q || '');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => { const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(1000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 240000 }); await p.waitForFunction(() => Explore.on, null, { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(4000);
  await p.waitForFunction(() => Explore.ORE && Explore.ORE.spots && typeof Mosby !== 'undefined' && Mosby.MS.at, null, { timeout: 120000 }).catch(() => {});
  const V = await p.evaluate(() => { const WS = Explore.WS, F = Explore.ledgeFront(), hw = W.heartwood, sp = Explore.ORE.spots.find((s) => s.type === 'copper') || Explore.ORE.spots[0], st = GRAND.streamLines() || [], s0 = (st[0] && st[0].P) || [], m = s0[s0.length - 1] || [F.x, F.y], m2 = s0[Math.max(0, s0.length - 4)] || m;
    const M = typeof Mosby !== 'undefined' && Mosby.MS.at;
    return { ledge: [F.x + Math.cos(F.face) * WS * 8, F.y + Math.sin(F.face) * WS * 8], lumen: [hw.x + Math.cos(hw.in) * WS * 70, hw.y + Math.sin(hw.in) * WS * 70], mine: [sp.x, sp.y], willow: [m2[0], m2[1]], mosby: M ? [M.x + WS * 14, M.y + WS * 6] : [F.x, F.y] }; });
  const meas = async () => p.evaluate((FR) => new Promise((res) => { const ts = []; let last = performance.now(); const f = () => { const t = performance.now(); ts.push(t - last); last = t; if (ts.length < FR) requestAnimationFrame(f); else { ts.shift(); ts.sort((a, b) => a - b);
    const R = M3.renderer, I = R.info, ar = I.autoReset; I.autoReset = false; I.reset(); R.render(M3.scene, M3.camera); const ft = I.render.triangles, fc = I.render.calls; I.autoReset = ar; /* full frame incl. the shadow pass, measured the same way on any build */ res({ tris: ft, calls: fc, geo: I.memory.geometries, tex: I.memory.textures, prog: (I.programs || []).length, dpr: +R.getPixelRatio().toFixed(2), ms: +(ts.reduce((a, b) => a + b) / ts.length).toFixed(0), p95: +ts[Math.floor(ts.length * 0.95)].toFixed(0), q: typeof QUALITY !== 'undefined' ? QUALITY.name : '-' }); } }; requestAnimationFrame(f); }), +process.env.FR || 8);
  const out = {};
  for (const [n, xy] of Object.entries(V)) { await p.evaluate((xy) => { const k = Explore.reach(xy[0], xy[1]); Explore.enter(k[0], k[1]); for (let i = 0; i < 10; i++) Explore.tick(1 / 30); }, xy); await p.waitForTimeout(3500); out[n] = await meas(); console.log(n.padEnd(7), JSON.stringify(out[n])); }
  await p.evaluate(() => CityMap.setView('dev')); await p.waitForTimeout(3500); out.dev = await meas(); console.log('dev    ', JSON.stringify(out.dev));
  if (process.env.SHOTDIR) await p.screenshot({ path: process.env.SHOTDIR + '/perf-dev.jpg', type: 'jpeg', quality: 80 });
  await p.evaluate(() => CityMap.setView('char')); await p.waitForTimeout(1500);
  if (process.env.OUT) require('fs').writeFileSync(process.env.OUT, JSON.stringify(out, null, 1));
  const tv = Object.entries(out); console.log('MAX tris', Math.max(...tv.map(([, v]) => v.tris)), 'MAX calls', Math.max(...tv.map(([, v]) => v.calls)));
  if (process.env.BUDGET) for (const [n, v] of tv) ok(v.tris <= 1.1e6 && v.calls <= 170, `${n}: ${(v.tris / 1e6).toFixed(2)}M tris, ${v.calls} calls`);
  ok(!errs.length, 'no page errors ' + errs.slice(0, 3).join(' | ')); console.log(fails ? fails + ' FAIL' : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0); })();

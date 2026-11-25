// (GD-26, Dominic t687u) a drill cutting coal burns its own mined coal first (up to DRILL_FUEL.SELF_BURN_MAX of what it cuts), the tank only for the rest;
// a copper drill still burns all of its fuel from the tank. Deterministic: the simulation is stepped directly, no waits on wall time.
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL + '?t=' + Date.now(), { timeout: 90000, waitUntil: 'commit' });
  await p.waitForFunction(() => typeof Explore !== 'undefined' && Explore.drillStep && typeof S !== 'undefined' && S && typeof Skills !== 'undefined', null, { timeout: 120000 });
  const R = await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} const F = Explore.DRILL_FUEL;
    const mk = (id, type, coal) => ({ id, node: 0, type, tier: 'bronze', stand: 'drill', coal, hop: 0, acc: 0, port: null, len: 0, pitch: 0, yaw: 0 });
    const run = (type, coal) => { const d = mk('t_' + type, type, coal); S.drills = Object.assign(S.drills || {}, { list: [d] }); const rate = Explore.drillRate(d), H = 0.5; Explore.drillStep(H * 3600e3); return { d: Object.assign({}, d), rate, H }; };
    const cu = run('copper', 50), co = run('coal', 50), dry = run('coal', 0); const burn = 2; // (the Bronze bit burns 2 coal/h)
    return { F, cu, co, dry, burn }; });
  const { F, cu, co, dry, burn } = R, self = Math.min(burn, co.rate * F.SELF_BURN_MAX), near = (a, b2, e) => Math.abs(a - b2) <= e;
  ok(F && F.SELF_FUEL_ORES.includes('coal') && F.SELF_BURN_MAX === 0.5, 'the self-fuel rule lives in one table (Explore.DRILL_FUEL) ' + JSON.stringify(F));
  ok(near(50 - cu.d.coal, burn * cu.H, 1e-6) && !cu.d.selfBurned, `a copper drill burns its fuel from the tank as before (${(50 - cu.d.coal).toFixed(3)} coal in ${cu.H} h)`);
  ok(near(co.d.selfBurned, self * co.H, 1e-6) && near(50 - co.d.coal, Math.max(0, burn - self) * co.H, 1e-6) && (50 - co.d.coal) < (50 - cu.d.coal), `a coal drill burns ${(co.d.selfBurned || 0).toFixed(3)} of its own coal first, only ${(50 - co.d.coal).toFixed(3)} from the tank (rate ${co.rate}/h)`);
  ok(near(co.d.mined || 0, Math.floor((co.rate - self) * co.H + 1e-9), 1), `its output is reduced by what it burned (${co.d.mined} delivered vs ${(co.rate * co.H).toFixed(2)} cut)`);
  ok(self < burn ? !dry.d.on || dry.d.coal === 0 : dry.d.on && (dry.d.selfBurned || 0) > 0, `with an empty tank it runs on its own coal only when that covers the whole burn (self ${self.toFixed(2)}/h vs burn ${burn}/h, on ${dry.d.on})`);
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  console.log(fails ? `${fails} FAILED` : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);
})();

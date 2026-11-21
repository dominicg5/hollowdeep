// node tools/mosby-route/dump_grid.js [out.json]  (local server on :8765) -> the 64-unit terrain grid the route planner reads:
// h = ground height (M3.meshH), f = flags (1 wet, 2 narrow crack, 4 wide crack, 8 house/town, 16 special: Lumen Tree / landmark, 32 ore)
const { chromium } = require('playwright-core'); const fs = require('fs'), path = require('path'); const out = process.argv[2] || path.join(__dirname, 'grid.json');
(async () => { const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await (await b.newContext({ viewport: { width: 900, height: 600 } })).newPage(); await p.goto('http://localhost:8765/index.html?quality=mobile&t=' + Date.now()); await p.waitForTimeout(1000);
  await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); }); await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 200000 });
  const r = await p.evaluate(fs.readFileSync(path.join(__dirname, 'grid_probe.js'), 'utf8')); fs.writeFileSync(out, JSON.stringify(r)); console.log('wrote', out, r.n + 'x' + r.n); await b.close(); })();

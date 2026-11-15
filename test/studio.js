// node test/studio.js out.png "keys=..&night=1"  -> screenshot of the art studio grid
const { chromium } = require('playwright-core');
(async () => { const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1600 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8766/test/studio.html?' + (process.argv[3] || '')); await p.waitForFunction(() => window.DONE, null, { timeout: 120000 }).catch(() => {});
  const el = await p.$('canvas'); await el.screenshot({ path: process.argv[2] || 'studio.png' }); console.log('tris', JSON.stringify(await p.evaluate(() => window.TRIS)), 'errors', errs.join(' | ')); await b.close(); })();

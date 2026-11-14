// Zoom-sweep flicker test: tracks the colour under fixed world points while zooming in/out;
// big frame-to-frame jumps = terrain/props popping. node zoomsweep.js
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/hollowdeep-prototype.html';
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(800);
  if (await p.isVisible('#modal:not(.hidden)')) await p.click('#modal [data-act=close]');
  await p.waitForFunction(() => typeof ART !== 'undefined' && ART.ready && typeof W !== 'undefined' && W.homes, null, { timeout: 30000 });
  await p.waitForTimeout(1500);
  const centers = await p.evaluate(() => {
    // region borders: points where regionAt changes, plus the Hollow lip and a farm area
    const out = []; for (let a = 0.2; a < 6.28 && out.length < 4; a += 0.7) { const r = 1400; let prev = regionAt(Math.cos(a) * r, Math.sin(a) * r); for (let d = 0.01; d < 0.7; d += 0.01) { const q = regionAt(Math.cos(a + d) * r, Math.sin(a + d) * r); if (q !== prev) { out.push([Math.cos(a + d) * r, Math.sin(a + d) * r]); break; } } }
    out.push([CITY.hollowR + 120, 0]); const f = W.homes.find((h) => h.region === 5); out.push([f.x + 60, f.y + 40]); return out; });
  let worst = 0, jumps = 0, samples = 0; const res = [];
  for (const [cx, cy] of centers) {
    for (const dir of [1, -1]) {
      const zs = []; for (let i = 0; i <= 70; i++) zs.push(0.08 * Math.pow(2.6 / 0.08, i / 70)); if (dir < 0) zs.reverse();
      await p.evaluate(([x, y, z]) => CityMap.flyTo(x, y, z, true), [cx, cy, zs[0]]); await p.waitForTimeout(700);
      const seq = await p.evaluate(async ([cx, cy, zs]) => {
        const c = document.getElementById('cityCanvas'), g = c.getContext('2d'), dpr = c.width / c.clientWidth, rows = [];
        const pts = []; for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) pts.push([cx + i * 22, cy + j * 22]);
        for (const z of zs) { CityMap.flyTo(cx, cy, z, true); await new Promise((r) => requestAnimationFrame(r));
          rows.push(pts.map(([x, y]) => { const [sx, sy] = CityMap.w2s(x, y); const d = g.getImageData(Math.round(sx * dpr) - 3, Math.round(sy * dpr) - 3, 7, 7).data; let r = 0, gg = 0, bb = 0; for (let k = 0; k < d.length; k += 4) { r += d[k]; gg += d[k + 1]; bb += d[k + 2]; } const n = d.length / 4; return [r / n, gg / n, bb / n]; })); }
        return rows; }, [cx, cy, zs]);
      // smooth zoom => colour under a point drifts slowly (sprites scale), a pop is a sudden jump that also reverts
      for (let i = 1; i < seq.length - 1; i++) for (let k = 0; k < seq[i].length; k++) {
        const d1 = Math.hypot(...seq[i][k].map((v, q) => v - seq[i - 1][k][q])), d2 = Math.hypot(...seq[i + 1][k].map((v, q) => v - seq[i][k][q])), d02 = Math.hypot(...seq[i + 1][k].map((v, q) => v - seq[i - 1][k][q]));
        if (zs[i] < 0.2) continue; const flick = Math.min(d1, d2) - d02 * 0.5; samples++; if (flick > worst) worst = flick; if (flick > 40) { jumps++; if (process.env.V) console.log('  ev', cx.toFixed(0), cy.toFixed(0), 'dir', dir, 'z', zs[i].toFixed(3), 'pt', k, 'flick', flick.toFixed(0), seq[i - 1][k].map(Math.round), seq[i][k].map(Math.round), seq[i + 1][k].map(Math.round)); } }
      res.push([cx.toFixed(0), cy.toFixed(0), dir]);
    }
  }
  console.log(`zoom sweep: ${centers.length} spots x2 dirs, ${samples} samples, flicker events(>40)=${jumps}, worst=${worst.toFixed(1)}, errors=${errs.length}`);
  await b.close(); process.exit(0);
})();

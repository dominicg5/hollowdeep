// LOD consistency: renders the static map around many world points at every cache level and compares the
// average colour of the same 64x64 world-unit patch. Terrain must look the same at every zoom level.
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/hollowdeep-prototype.html';
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await p.goto(URL); await p.waitForTimeout(800);
  if (await p.isVisible('#modal:not(.hidden)')) await p.click('#modal [data-act=close]');
  await p.waitForFunction(() => typeof ART !== 'undefined' && ART.ready && typeof W !== 'undefined' && W.homes, null, { timeout: 30000 });
  const r = await p.evaluate(() => {
    const rnd = mulberry32(99), pts = []; while (pts.length < 160) { const a = rnd() * 6.283, rr = CITY.hollowR + 80 + rnd() * (CITY.R - CITY.hollowR - 300); pts.push([Math.floor(Math.cos(a) * rr / 128) * 128 + 64, Math.floor(Math.sin(a) * rr / 128) * 128 + 64]); }
    const out = { worst: 0, over25: 0, n: 0, list: [] };
    for (const [x, y] of pts) {
      const cols = [];
      for (const L of CITY.levels) { const ws = 256 / L, x0 = Math.floor(x / ws) * ws, y0 = Math.floor(y / ws) * ws; const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
        g.setTransform(L, 0, 0, L, -x0 * L, -y0 * L);
        // terrain only (objects excluded) so we measure ground blending, exactly as a cache tile renders it
        drawTerrain(g, x0, y0, x0 + ws, y0 + ws, L);
        const half = Math.max(1, 32 * L), cx = (x - x0) * L, cy = (y - y0) * L; const d = g.getImageData(Math.floor(cx - half), Math.floor(cy - half), Math.ceil(half * 2), Math.ceil(half * 2)).data; let R = 0, G = 0, B = 0; for (let i = 0; i < d.length; i += 4) { R += d[i]; G += d[i + 1]; B += d[i + 2]; } const n = d.length / 4; cols.push([R / n, G / n, B / n]); }
      if (x === pts[0][0] && 0) {} ; if (Math.round(x) === -636) out.dbg = cols.map((c) => c.map(Math.round));
      const ref = cols[cols.length - 1]; let dev = 0; cols.forEach((c) => { dev = Math.max(dev, Math.hypot(c[0] - ref[0], c[1] - ref[1], c[2] - ref[2])); });
      out.n++; out.worst = Math.max(out.worst, dev); if (dev > 25) { out.over25++; out.list.push([Math.round(x), Math.round(y), Math.round(dev), REGIONS[regionAt(x, y)].key]); }
    }
    return out; });
  console.log(`LOD check: ${r.n} points, worst deviation ${r.worst.toFixed(1)}, points over 25: ${r.over25}`, JSON.stringify(r.list.slice(0, 8)), JSON.stringify(r.dbg));
  await b.close();
})();

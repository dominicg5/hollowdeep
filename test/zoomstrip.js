// Filmstrip of a fast zoom (one frame per step) so popping can be eyeballed: node zoomstrip.js out.png
const { chromium } = require('playwright-core'); const fs = require('fs');
const URL = process.env.URL || 'http://localhost:8765/hollowdeep-prototype.html';
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto(URL); await p.waitForTimeout(800);
  if (await p.isVisible('#modal:not(.hidden)')) await p.click('#modal [data-act=close]');
  await p.waitForFunction(() => typeof ART !== 'undefined' && ART.ready && typeof W !== 'undefined' && W.homes, null, { timeout: 30000 });
  if (process.env.SLOW) { const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: +process.env.SLOW }); } else await p.waitForTimeout(1500);
  const frames = await p.evaluate(async () => {
    const a = 0.2 + 0.7 * 3; let cx = 0, cy = 0; { const r = 1400; let prev = regionAt(Math.cos(1.6) * r, Math.sin(1.6) * r); for (let d = 0.01; d < 1.2; d += 0.01) { const q = regionAt(Math.cos(1.6 + d) * r, Math.sin(1.6 + d) * r); if (q !== prev) { cx = Math.cos(1.6 + d) * r; cy = Math.sin(1.6 + d) * r; break; } } }
    const c = document.getElementById('cityCanvas'), out = []; const zs = []; for (let i = 0; i < 24; i++) zs.push(0.12 * Math.pow(1.8 / 0.12, i / 23)); for (let i = 22; i >= 0; i--) zs.push(zs[i]);
    for (const z of zs) { CityMap.flyTo(cx, cy, z, true); await new Promise((r) => requestAnimationFrame(r)); await new Promise((r) => requestAnimationFrame(r)); const t = document.createElement('canvas'); t.width = 200; t.height = 200; t.getContext('2d').drawImage(c, c.width / 2 - 360, c.height / 2 - 360, 720, 720, 0, 0, 200, 200); out.push(t.toDataURL('image/jpeg', 0.8)); }
    return out; });
  frames.forEach((f, i) => fs.writeFileSync(`/tmp/zf_${String(i).padStart(2, '0')}.jpg`, Buffer.from(f.split(',')[1], 'base64')));
  await b.close();
})();

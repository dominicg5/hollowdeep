// perf benchmark: fixed camera script, reports fps / avg / p95 frame time per scene
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/hollowdeep-prototype.html';
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => { const raf = window.requestAnimationFrame.bind(window); window.__work = []; window.requestAnimationFrame = (cb) => raf((t) => { const a = performance.now(); cb(t); window.__work.push(performance.now() - a); if (window.__work.length > 400) window.__work.shift(); }); });
  const cdp = await p.context().newCDPSession(p); const THR = +(process.env.THROTTLE || 4);
  const t0 = Date.now(); await p.goto(URL); await p.waitForTimeout(800);
  if (await p.isVisible('#modal:not(.hidden)')) await p.click('#modal [data-act=close]');
  await p.waitForFunction(() => typeof ART !== 'undefined' && ART.ready && typeof W !== 'undefined' && W.homes, null, { timeout: 60000 });
  const info = await p.evaluate(() => ({ homes: W.homes.length, objs: W.objs.length, gen: W.genMs, R: CITY.R }));
  console.log('load', Date.now() - t0, 'ms', JSON.stringify(info));
  const meas = () => p.evaluate(() => new Promise((res) => { window.__work.length = 0; const ts = []; let last = performance.now(); const f = () => { const t = performance.now(); ts.push(t - last); last = t; if (ts.length < 120) requestAnimationFrame(f); else { ts.shift(); const s = [...ts].sort((a, b) => a - b), avg = ts.reduce((a, b) => a + b) / ts.length; res({ fps: (1000 / avg).toFixed(1), avg: avg.toFixed(1), p95: s[Math.floor(s.length * 0.95)].toFixed(1), max: s[s.length - 1].toFixed(0), work: (window.__work.reduce((a, b) => a + b, 0) / window.__work.length).toFixed(1), workP95: [...window.__work].sort((a, b) => a - b)[Math.floor(window.__work.length * 0.95)].toFixed(1) }); } }; requestAnimationFrame(f); }));
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: THR }); console.log('cpu throttle x' + THR);
  const scenes = [['home z1', 'player', 1.05], ['home z2.5', 'player', 2.5], ['hollow z0.3', [0, 0], 0.3], ['wide z0.1', [0, 0], 0.1], ['min zoom', [0, 0], 0.01], ['far z0.3', 'far', 0.3], ['far z1', 'far', 1.0]];
  for (const [name, what, z] of scenes) {
    const q = await p.evaluate((w) => w === 'player' ? [W.player.x, W.player.y] : w === 'far' ? (() => { const f = W.lavaFlows[0] || W.homes[W.homes.length - 1]; return f.pts ? f.pts[0] : [f.x, f.y]; })() : w, what);
    await p.evaluate(([x, y, z]) => CityMap.flyTo(x, y, z, true), [q[0], q[1], z]); await p.waitForTimeout(5000);
    console.log(name.padEnd(12), JSON.stringify(await meas()));
  }
  // pan while zoomed in (tile rendering under motion)
  await p.evaluate(() => CityMap.flyTo(W.player.x, W.player.y, 1.05, true)); await p.waitForTimeout(3000);
  const pan = p.evaluate(() => new Promise((res) => { let i = 0; const id = setInterval(() => { CityMap.flyTo(W.player.x + i * 40, W.player.y + i * 15, 1.05, true); if (++i > 60) { clearInterval(id); res(); } }, 50); }));
  console.log('pan z1     ', JSON.stringify(await meas())); await pan;
  console.log('errors', errs.length, errs.slice(0, 2).join(' | '));
  await b.close();
})();

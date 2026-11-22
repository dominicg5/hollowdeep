// World-generation guard (Dominic t455u): fails whenever the seeded world changes outside an edit's local area.
// Fingerprint = mountain count + hash of mountain positions, crevice count + hash, and ground heights on a sparse fixed grid (+ the five cross47 points).
// Mountains, crevices and sample points inside ALLOW (known local edits) are left out and listed by name. Expected values: test/worldgen_guard.json.
// To change the world on purpose: UPDATE=1 node test/worldgen_guard.js (rewrites the JSON; commit it with the change and say why).
const { chromium } = require('playwright-core'); const fs = require('fs'), path = require('path');
const URL = process.env.URL || 'http://localhost:8765/index.html', FILE = path.join(__dirname, 'worldgen_guard.json'), TOL = 0.3; // height tolerance, world units (~5 cm)
const ALLOW = [{ name: 'tether-mill-race', x: -8594, y: 2104, r: 1700 }, { name: 'lumen-regrade-t445u', x: -6656, y: 1792, r: 350 }];
const PTS = [['cross47-a', -7269, -259], ['cross47-b', -7233, -365], ['cross47-bank', -7250, -320], ['cross47-c', -7255, -300], ['cross47-d', -7240, -340]];
for (let x = -10500; x <= 10500; x += 1500) for (let y = -10500; y <= 10500; y += 1500) PTS.push([`g${x},${y}`, x, y]);
(async () => { const t0 = Date.now();
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL + '?t=' + Date.now(), { timeout: 90000, waitUntil: 'commit' }); await p.waitForTimeout(1000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st && M3.st.ok && W.ready, null, { timeout: 240000 });
  const cur = await p.evaluate(({ ALLOW, PTS }) => { const inA = (x, y) => { const a = ALLOW.find((q) => Math.hypot(x - q.x, y - q.y) < q.r); return a ? a.name : null; };
    const hash = (arr) => { let h = 2166136261; for (const v of arr) { h ^= v | 0; h = Math.imul(h, 16777619) >>> 0; } return h.toString(16); };
    const mt = W.mountains.filter((m) => !inA(m.x, m.y)), cr = (W.cracks || []).filter((c) => !c.pts.some((q) => inA(q[0], q[1])));
    const pts = {}, skipped = []; for (const [n, x, y] of PTS) { if (Math.hypot(x, y) > CITY.R) continue; const a = inA(x, y); if (a) { skipped.push(n + ' (' + a + ')'); continue; } pts[n] = +M3.heightAt(x, y)[0].toFixed(2); }
    return { mountains: W.mountains.length, mtnHash: hash(mt.flatMap((m) => [Math.round(m.x), Math.round(m.y), Math.round(m.r)])), cracks: cr.length,
      crackHash: hash(cr.flatMap((c) => [c.pts.length, ...c.pts.flatMap((q) => [Math.round(q[0]), Math.round(q[1])]), ...c.ws.map((w) => Math.round(w * 10))])), pts, skipped }; }, { ALLOW, PTS });
  await b.close(); const sec = ((Date.now() - t0) / 1000).toFixed(1);
  if (process.env.UPDATE || !fs.existsSync(FILE)) { const { skipped, ...keep } = cur; fs.writeFileSync(FILE, JSON.stringify(keep, null, 1) + '\n'); console.log(`WROTE ${FILE} (${Object.keys(cur.pts).length} points; allowlisted: ${skipped.join(', ') || 'none'}) in ${sec}s`); process.exit(0); }
  const exp = JSON.parse(fs.readFileSync(FILE, 'utf8')), bad = [];
  if (cur.mountains !== exp.mountains) bad.push(`mountain count ${exp.mountains} -> ${cur.mountains}`);
  if (cur.mtnHash !== exp.mtnHash) bad.push(`mountain position hash ${exp.mtnHash} -> ${cur.mtnHash} (outside the allowlist)`);
  if (cur.cracks !== exp.cracks || cur.crackHash !== exp.crackHash) bad.push(`crevices ${exp.cracks}/${exp.crackHash} -> ${cur.cracks}/${cur.crackHash}`);
  const moved = []; for (const [n, h] of Object.entries(exp.pts)) { const c = cur.pts[n]; if (c == null) moved.push(`${n} missing`); else if (Math.abs(c - h) > TOL) moved.push(`${n} ${h} -> ${c} (${(c - h > 0 ? '+' : '') + ((c - h) / 6.35).toFixed(2)} m)`); }
  if (moved.length) bad.push(`${moved.length} sample point(s) moved: ${moved.slice(0, 25).join('; ')}${moved.length > 25 ? ' ...' : ''}`);
  if (errs.length) bad.push('page errors: ' + errs.slice(0, 3).join(' | '));
  console.log(`allowlisted: ${cur.skipped.join(', ') || 'none'}`); for (const m of bad) console.log('FAIL ' + m);
  console.log(bad.length ? `WORLDGEN CHANGED (${sec}s) - if intended: UPDATE=1 node test/worldgen_guard.js` : `ALL PASS worldgen fingerprint: ${cur.mountains} mountains, ${cur.cracks} crevices, ${Object.keys(cur.pts).length} points (${sec}s)`); process.exit(bad.length ? 1 : 0); })();

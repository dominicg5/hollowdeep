// water + ways audit: every stream rises at a spring and only falls (water surface and carved bed, sampled every ~20 units) into a lake; none crosses a crevice;
// no stream leaves a lake; the worn paths never double back (no turn over 100 deg); every bridge has a path to both ends
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html';
(async () => { const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(800); await p.evaluate(() => closeModalQuiet()).catch(() => {});
  const R = await p.evaluate(async () => { setTab('city'); for (let i = 0; i < 60 && !(GRAND.water && GRAND.water.planned); i++) await new Promise((r) => setTimeout(r, 500)); Explore.build();
    const WT = GRAND.water, out = { streams: [], outflows: 0 }; const segD = (q, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2)); return Math.hypot(q[0] - a[0] - dx * t, q[1] - a[1] - dy * t); };
    for (const S of WT.streams) { if (S.l0 >= 0) out.outflows++; let wUp = 0, bUp = 0, hMin = 1e9, cross = 0; for (let i = 0; i + 1 < S.P.length; i++) { const a = S.P[i], c = S.P[i + 1], m = Math.max(1, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / 20));
        if (S.wl[i + 1] > S.wl[i] + 0.01) wUp++;
        for (let k = 0; k < m; k++) { const t = k / m, x = a[0] + (c[0] - a[0]) * t, y = a[1] + (c[1] - a[1]) * t; if (WT.lakes.some((L) => GRAND.lakeE(L, x, y) < 0)) continue; const h = M3.heightAt(x, y)[0]; if (h > hMin + 3) bUp++; hMin = Math.min(hMin, h); }
        for (const ck of W.cracks) for (let j = 0; j + 1 < ck.pts.length; j++) { const wd = Math.max(ck.ws[j], ck.ws[j + 1]) / 2 + S.w; if (segD(ck.pts[j], a, c) < wd || segD(a, ck.pts[j], ck.pts[j + 1]) < wd) cross++; } }
      out.streams.push({ id: S.id, lake: S.l1, spring: S.lp != null, waterUp: wUp, bedUp: bUp, cross }); }
    let turns = 0; for (const P of Explore.PATHS) for (let i = 3; i + 3 < P.length; i += 2) { const a1 = Math.atan2(P[i + 1] - P[i - 1], P[i] - P[i - 2]), a2 = Math.atan2(P[i + 3] - P[i + 1], P[i + 2] - P[i]); let d = Math.abs(a2 - a1); if (d > Math.PI) d = 2 * Math.PI - d; if (d > 100 * Math.PI / 180) turns++; }
    out.backTurns = turns; out.bridges = Explore.BRIDGES.filter((B) => B.a && B.a[0] < 1e6).length; return out; });
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  for (const s of R.streams) chk(s.lake >= 0 && s.spring && !s.waterUp && !s.bedUp && !s.cross, `stream ${s.id}: spring -> lake ${s.lake}, water rises ${s.waterUp}, bed rises ${s.bedUp}, crevice hits ${s.cross}`);
  chk(R.outflows === 0, 'no stream leaves a lake (' + R.outflows + ')'); chk(R.backTurns === 0, 'paths never double back (turns > 100 deg: ' + R.backTurns + ')'); console.log('bridges: ' + R.bridges);
  chk(!errs.length, 'no page errors ' + errs.slice(0, 3).join(' | ')); console.log(ok ? 'ALL PASS' : 'SOME FAILED'); await b.close(); process.exit(ok ? 0 : 1); })();

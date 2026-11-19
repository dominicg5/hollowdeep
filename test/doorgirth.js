// Every Ledge Tether at the door (house door interface and the map door set) has the main line's girth, and with all 9 ports plugged none touch
const { chromium } = require('playwright-core');
(async () => { const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }), p = await b.newPage({ viewport: { width: 390, height: 844 } }); let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  await p.goto(process.env.URL || 'http://localhost:18820/index.html'); await p.waitForTimeout(800); await p.evaluate(() => closeModalQuiet()).catch(() => {});
  const r = await p.evaluate(() => { delete S.home; document.querySelector('nav#tabs [data-tab=home]').click(); const C = CharView; C.st.paused = true; C.sim(1 / 30, 30); C.setHomeMode('door'); C.sim(1 / 30, 10);
    for (let i = 0; i < 8; i++) C.unlockPort(); const hs = C.homeState(); hs.open = 8; const G = ['bronze', 'iron', 'steel', 'gold', 'mithril', 'rune', 'lumen', 'onyx'];
    hs.ports = { c: C.twinOf({ a: { grade: 'gold', dir: 'to' }, b: { grade: 'onyx', dir: 'from' } }) }; G.forEach((g, i) => { hs.ports['p' + i] = C.twinOf({ grade: g, dir: i % 2 ? 'in' : 'out' }); }); C.refreshPorts(); C.sim(1 / 30, 3);
    const girth = (c) => c.userData.rr + Math.max(...c.userData.srs), ext = C.HM.cordList.filter((c) => c.userData.ext), out = { n: ext.length, girth: {}, margin: 9, worst: '' };
    for (const c of ext) out.girth[c.userData.port] = +girth(c).toFixed(4);
    const pts = ext.map((c) => c.userData.C.getSpacedPoints(300));
    for (let a = 0; a < ext.length; a++) for (let q = a + 1; q < ext.length; q++) { let m = 9; for (const u of pts[a]) for (const w of pts[q]) m = Math.min(m, u.distanceTo(w)); const mg = m - 0.9 * (girth(ext[a]) + girth(ext[q])); if (mg < out.margin) { out.margin = +mg.toFixed(3); out.worst = ext[a].userData.port + '/' + ext[q].userData.port; } }
    return out; });
  const g = Object.values(r.girth), main = r.girth.c; console.log(JSON.stringify(r));
  ok(r.n === 9 && g.every((v) => Math.abs(v - main) < 1e-4), 'all 9 Ledge Tethers at the door have the main line girth ' + main);
  ok(r.margin > 0, 'with all 9 ports plugged no two Ledge Tethers touch (margin ' + r.margin + ' at ' + r.worst + ')');
  await b.close(); process.exit(fails ? 1 : 0); })();

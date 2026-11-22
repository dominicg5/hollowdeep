// t438u: the beginner village is retired (Dominic). No keeper building, plinth, yard, forecourt, path, solid or tree clearing is left on the map;
// the ground at the five old sites is the natural terrain again. The building / NPC code stays in town.js and npc_kit.js for later.
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html';
const SITES = { guide_hut: [-5217, 8498], general_store: [-5517, 7915], rope_maker: [-5765, 7225], smithy: [-6118, 6582], inn: [-6587, 6020] };
(async () => { const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await (await b.newContext({ viewport: { width: 540, height: 900 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(800); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 300000, polling: 1000 }); await p.waitForTimeout(1500);
  const R = await p.evaluate((SITES) => { const T = Town, E = Explore, o = {}; T.build(); E.build(); T.tick();
    o.bld = T.BLD.length; o.paths = T.paths([]).length; o.cols = T.cols().length; o.meshes = T.ST.g ? T.ST.g.children.filter((m) => m.isMesh && m.geometry && m.geometry.attributes.position && m.geometry.attributes.position.count).length : 0;
    o.sites = {}; for (const id in SITES) { const [x, y] = SITES[id]; const hm = [123.4, 5]; const c = T.carve(x, y, hm); o.sites[id] = { hit: T.hit(x, y, 40), carved: c[0] !== hm[0] || c[1] !== hm[1], over: T.hOver(x, y), cls: E.clsAt(x, y) }; }
    const P = E.allPaths(); o.nearPath = {}; for (const id in SITES) { const [x, y] = SITES[id]; let d = 1e9; for (const f of P) for (let k = 1; k + 1 < f.length; k += 2) d = Math.min(d, Math.hypot(f[k] - x, f[k + 1] - y)); o.nearPath[id] = Math.round(d); }
    return o; }, SITES);
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  console.log(JSON.stringify(R));
  ok(R.bld === 0, `no village buildings placed (${R.bld})`); ok(R.paths === 0, `no village trunk or door branches (${R.paths})`); ok(R.cols === 0, `no village solids (${R.cols})`); ok(R.meshes === 0, `no building, plinth or yard meshes (${R.meshes})`);
  for (const id in R.sites) { const s = R.sites[id]; ok(!s.hit && !s.carved && s.over === null, `${id}: natural ground again (no pad, clearing or override)`); ok(R.nearPath[id] > 60, `${id}: no path left running to the old door (${R.nearPath[id]} u to the nearest path)`); }
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | ')); console.log(fails ? 'SOME FAILED' : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0); })();

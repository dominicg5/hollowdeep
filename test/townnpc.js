// t438u: the village keepers are no longer spawned on the map (Dominic: "save the NPCs maybe for later somewhere other than the map").
// Their NPC kit (src/npc_kit.js + assets/models/npc_kit.glb), body plans, portraits and dialogue data stay in the codebase and still load.
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html';
(async () => { const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await (await b.newContext({ viewport: { width: 540, height: 900 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(800); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 300000, polling: 1000 }); await p.waitForTimeout(1500);
  const R = await p.evaluate(async () => { Explore.build(); for (let i = 0; i < 6; i++) { Town.tick(); Town.folk.tick(); } const F = Town.folk.ST, o = {};
    o.spawned = F.list.length; o.folkMesh = !!(F.mesh && F.mesh.parent); o.kitRoots = Town.ST.g ? Town.ST.g.children.filter((m) => !m.isMesh).length : 0;
    o.data = ['goldie', 'brannick', 'tess', 'hattie', 'fennick'].filter((id) => Town.folk.P[id] && Town.folkModel.NPC[id]).length;
    try { await NpcKit.load(); } catch (e) { o.kitErr = String(e); } o.kit = ['goldie', 'brannick', 'tess', 'hattie', 'fennick'].filter((id) => NpcKit.has(id)).length;
    const W = window.innerWidth / 2, H = window.innerHeight / 2; o.tap = Town.tap(W, H); return o; });
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  console.log(JSON.stringify(R));
  ok(R.spawned === 0 && !R.folkMesh && R.kitRoots === 0, `no village keeper spawned on the map (${R.spawned} listed, ${R.kitRoots} kit roots)`); ok(R.tap === null, 'tapping the map never opens a village keeper');
  ok(R.data === 5, `the five keepers' body plans and dialogue are kept (${R.data}/5)`); ok(R.kit === 5 && !R.kitErr, `the NPC kit still loads all five keepers for later (${R.kit}/5 ${R.kitErr || ''})`);
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | ')); console.log(fails ? 'SOME FAILED' : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0); })();

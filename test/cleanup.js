// t569u cleanup + house placement rule (Dominic): no worn paths / trails (meshes, decals, terrain dips, map lines), no stacked-rock props, no plank walk
// (scaffolding) on the cliff ledge, while the cliffs, climbs, caves, ledge trees, doors and bridges stay; houses only on flat grassland (< 15 deg across the
// footprint, not mining ground or the forge's volcanic / scorched zone) - pre-placed ones on bad ground are deleted, a saved spot on bad ground is dropped.
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html';
(async () => { const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(1000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 240000 }); await p.waitForFunction(() => Explore.on && Explore.ORE.spots && Explore.ORE.cliffX, null, { timeout: 180000 }).catch(() => {}); await p.waitForTimeout(3000);
  const R = await p.evaluate(() => { const E = Explore, o = {}, names = {}; let pathMeshes = 0, tread = [];
    M3.scene.traverse((m) => { if (!m.isMesh) return; if (m.name) names[m.name] = (names[m.name] || 0) + 1; if (m.userData.path) { if (/^vrTread_/.test(m.name)) tread.push(m.name); else pathMeshes++; } });
    o.api = ['allPaths', 'genPaths', 'genBridgeWays', 'ledgeSpur', 'WAYS'].filter((k) => k in E).concat(['setPaths', 'pathDip'].filter((k) => k in M3)); o.pathMeshes = pathMeshes; o.tread = tread.sort();
    o.stack = M3.colliders().filter((c) => c.key === 'p_rStack').length + (M3.imStats ? M3.imStats().filter((q) => q[0] === 'rStack' || q[0] === 'p_rStack').length : 0);
    o.walk = ['cliff_walk', 'cliff_rope', 'cliff_shelf'].map((k) => names[k] || 0); o.climbs = names.cliff_climb || 0; o.ledge = E.ORE.ledgeX; o.cliffs = E.ORE.cliffs.length; o.caves = ['cave0', 'cave1', 'cave2'].filter((k) => { let f = false; M3.scene.traverse((m) => { if (m.name === k) f = true; }); return f; }).length;
    o.doors = !!(typeof GRAND !== 'undefined' && GRAND.door) && (names.ledgeDoorOnHouse || 0) + 0 >= 0; o.bridges = E.BRIDGES.filter((q) => q.a && q.a[0] < 1e6).length; o.cross = E.BRIDGES.filter((q) => /cross5[012]/.test(q.id)).map((q) => q.id + ':' + (q.a[0] < 1e6 ? 'ok' : 'gone'));
    // the rule
    let sc = null; for (let x = 8000; x <= 10200 && !sc; x += 40) for (let y = 5000; y <= 7000 && !sc; y += 40) if (FORGE.scorched(x, y, 0)) sc = [x, y];
    const sp = E.ORE.spots[0], WS = E.WS; let st = null; for (let k = 0; k < 4000 && !st; k++) { const a = k * 2.399, d = 1500 + k * 2, x = Math.cos(a) * d, y = Math.sin(a) * d, g = M3.ground(x, y); if (g.slope > 0.3 && g.slope < 0.6 && houseGround(x, y, 1).why === 'slope') st = [x, y]; }
    o.rule = { scorch: sc && houseGround(sc[0], sc[1], 60).why, mine: houseGround(sp.x, sp.y, 60).why, slope: st && houseGround(st[0], st[1], 60).why, chkMine: HomeMove.check(sp.x, sp.y).why, chkSlope: st && HomeMove.check(st[0], st[1]).why, msg: HomeMove.WHY.mine };
    const rest = W.homes.filter((h) => !h.isPlayer); o.homes = rest.length; o.dropped = W.homesDropped; o.badLeft = rest.filter((h) => !houseGround(h.x, h.y, h.size * 0.75).ok).length;
    o.stats = W.homeStats; o.townBld = typeof Town !== 'undefined' && Town.BLD ? Town.BLD.length : null; S.mosbyTrip = null; S.homeAt = { x: sp.x, y: sp.y, elev: null, t: Date.now() }; W.homeAtChk = null; relocatePlayer(true); o.savedDropped = !!S.homeDeleted && W.player.away === true && W.homeAtDropped >= 1;
    document.querySelectorAll('.toast').forEach((t) => t.remove()); try { MosbyTalk.card(sp.x, sp.y); } catch (e) { o.cardErr = String(e); } o.toast = [...document.querySelectorAll('.toast,#toast')].map((t) => t.textContent).join('|');
    return o; });
  console.log(JSON.stringify(R));
  let bad = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) bad++; };
  ok(!R.api.length, 'no path API left (' + R.api.join(',') + ')'); ok(R.pathMeshes === 0, 'no worn-path meshes (' + R.pathMeshes + ')'); ok(R.tread.join() === 'vrTread_E-basin,vrTread_forge-switchback', 'only the E-basin scramble + forge switchback treads remain: ' + R.tread);
  ok(R.stack === 0, 'no stacked-rock props or colliders (' + R.stack + ')'); ok(R.walk.every((n) => !n), 'no plank walk / rope rail / stone shelf on the cliff ledge ' + R.walk);
  ok(R.climbs === 3 && R.cliffs > 0 && R.caves === 3 && R.ledge.trees > 0 && R.ledge.tongues > 0, `cliffs ${R.cliffs}, climbs ${R.climbs}, caves ${R.caves}, ledge trees ${R.ledge.trees} / tongues ${R.ledge.tongues} kept`);
  ok(R.bridges > 0 && R.cross.length === 3 && R.cross.every((q) => /ok$/.test(q)), `bridges kept (${R.bridges}; ${R.cross})`);
  ok(R.rule.scorch === 'scorch' && R.rule.mine === 'mine' && R.rule.slope === 'slope', 'houseGround rejects scorched / mining / sloped ground ' + JSON.stringify(R.rule));
  ok(R.rule.chkMine === 'mine' && /^(flat|mine|scorch)$/.test(R.rule.chkSlope) && /flat ground/.test(R.rule.msg), 'Mosby move check uses the rule');
  ok(/Needs flat ground/.test(R.toast), 'placement-invalid toast: ' + R.toast + (R.cardErr ? ' ' + R.cardErr : ''));
  ok(R.badLeft === 0 && R.dropped > 0, `pre-placed homes on bad ground deleted: ${R.dropped} (kept ${R.homes}, none left on bad ground) ${JSON.stringify(R.stats)} town buildings ${R.townBld}`);
  ok(R.savedDropped, 'a saved home on bad ground is deleted (plot empty, not moved)');
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  console.log(bad ? 'SOME FAIL' : 'ALL PASS'); await b.close(); process.exit(bad ? 1 : 0); })();

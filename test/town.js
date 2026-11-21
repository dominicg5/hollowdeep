// beginner town (town.js): it is built on the lowlands (the lower playing field), clear of mining fields, crevices, streams, lakes, homes and caves;
// every building, prop and drop edge is solid; the connecting footpath runs from the main street's land end onto the worn path network (joins it, no dead end);
// she can walk from her Ledge into town, down the cobble stairs to the square and up to every building front and every lot without climbing or jumping;
// the terraces step down 3 levels; light for mobile (draw calls, triangles); no text anywhere. SHOT=dir saves renders.
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html', SHOT = process.env.SHOT || '';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1 })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(1000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 200000 }).catch(() => {}); await p.waitForTimeout(800);
  const R = await p.evaluate(() => { const T = Town, E = Explore, WS = E.WS, o = {}; T.build(); E.build();
    // placement: lowlands, clear of everything that was there
    const [cx, cy] = [T.T.cx, T.T.cy]; o.lowland = typeof lowland === 'function' ? lowland(cx, cy) : Math.hypot(cx, cy) > CITY.plateauR + 1000; o.fromLedge = Math.round(Math.hypot(cx - W.player.x, cy - W.player.y) / WS);
    const inside = (x, y, pad) => T.hit(x, y, pad || 0);
    o.ore = (E.ORE.spots || []).filter((s) => { for (let a = 0; a < 6.3; a += 0.3) for (const f of [0, 0.5, 1]) if (inside(s.x + Math.cos(a) * s.R * f, s.y + Math.sin(a) * s.R * f, WS * 4)) return true; return false; }).length;
    o.crack = 0; for (const cr of W.cracks || []) for (let q = 0; q + 1 < cr.pts.length; q++) for (let t = 0; t <= 1; t += 0.1) { const x = cr.pts[q][0] + (cr.pts[q + 1][0] - cr.pts[q][0]) * t, y = cr.pts[q][1] + (cr.pts[q + 1][1] - cr.pts[q][1]) * t; if (inside(x, y, WS * 10)) o.crack++; }
    o.wet = 0; o.cells = 0; for (let px = -70; px <= 800; px += 10) for (let py = 10; py <= 570; py += 10) { const [x, y] = T.W2(px, py); if (!inside(x, y, WS * 2)) continue; o.cells++; if (GRAND.wet && GRAND.wet(x, y, WS * 2)) o.wet++; }
    o.homes = W.homes.filter((h) => inside(h.x, h.y, (h.size || 30) + WS * 2)).length; o.caves = E.caves().filter((c) => inside(c.M[0], c.M[1], WS * 10)).length;
    o.trees = M3.colliders().filter((c) => inside(c.x, c.y, 0)).length; o.mosby = typeof Mosby !== 'undefined' && Mosby.MS && Mosby.MS.at ? inside(Mosby.MS.at.x || Mosby.MS.at[0], Mosby.MS.at.y || Mosby.MS.at[1], WS * 5) : false;
    // solids: building interiors, props and the drop edges
    const BR = E.BODY_R; o.bld = T.BLD.map((B) => { const P = B.P, cs = Math.cos(P.yaw), sn = Math.sin(P.yaw), L = (lx, lz) => [P.x + (lx * cs + lz * sn) * WS, P.y + (-lx * sn + lz * cs) * WS]; let n = 0, s = 0;
      for (const f of B.foot) { const pts = f.length === 3 ? [[f[0], f[1]], [f[0] + f[2] * 0.6, f[1]], [f[0], f[1] - f[2] * 0.6]] : [[(f[0] + f[2]) / 2, (f[1] + f[3]) / 2], [f[0] + 0.5, f[1] + 0.5], [f[2] - 0.5, f[3] - 0.5]]; for (const [a, c] of pts) { const [x, y] = L(a, c); n++; if (E.solidAt(x, y, BR)) s++; } }
      const fr = L(0, (B.round ? B.w / 2 : B.d / 2) + 2.6); return { id: B.id, n, s, front: fr }; });
    o.props = T.PCOL.length; o.propSolid = T.PCOL.filter(([x, y]) => E.solidAt(x, y, 1)).length;
    // the drop: a point just past the square's terrace edge is pushed back
    { const [ex, ey] = T.W2(612, 380), [ix, iy] = T.W2(596, 380), c = E.collide(ex, ey, BR); o.edgePush = +(Math.hypot(c[0] - ex, c[1] - ey) / WS).toFixed(2); o.edgeDrop = +((T.LV[2] - T.nat(ex + (ex - ix) * 2, ey + (ey - iy) * 2)) / WS).toFixed(2); }
    // terraces
    o.lv = T.LV.map((v) => +(v / WS).toFixed(2)); o.steps = [0, 1].map((i) => +((T.LV[i] - T.LV[i + 1]) / WS).toFixed(2));
    // the footpath
    const AP = E.allPaths(), mine = AP.find((f) => Math.hypot(f[1] - T.GATE[0], f[2] - T.GATE[1]) < WS * 4 || Math.hypot(f[f.length - 2] - T.GATE[0], f[f.length - 1] - T.GATE[1]) < WS * 4);
    o.path = !!mine; if (mine) { const end = Math.hypot(mine[1] - T.GATE[0], mine[2] - T.GATE[1]) < WS * 4 ? [mine[mine.length - 2], mine[mine.length - 1]] : [mine[1], mine[2]]; let jd = 1e9; for (const f of AP) { if (f === mine) continue; for (let i = 1; i + 3 < f.length; i += 2) { const ax = f[i], ay = f[i + 1], bx = f[i + 2], by = f[i + 3], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((end[0] - ax) * dx + (end[1] - ay) * dy) / l2)); jd = Math.min(jd, Math.hypot(end[0] - ax - dx * t, end[1] - ay - dy * t)); } } o.join = +(jd / WS).toFixed(1);
      let inTown = 0; for (let i = 1; i + 1 < mine.length; i += 2) if (T.inPoly(T.OUT, ...T.P2(mine[i], mine[i + 1]))) inTown++; o.pathInTown = inTown; o.pathLen = Math.round(mine.length / 2); }
    // routes: Ledge door -> gate -> square -> each building front -> each lot (no climbing)
    const door = W.playerDoor || W.player, S0 = [door.x, door.y], goals = [['gate', T.GATE_IN], ['square', T.W2(T.SQ.px, T.SQ.py + 30)]].concat(o.bld.map((q) => [q.id, q.front])).concat(T.LOTS.map(([id, px, py]) => [id, T.W2(px, py)]));
    o.routes = goals.map(([id, g]) => { const P = E.plan(S0[0], S0[1], g[0], g[1]); if (!P) return { id, ok: false }; const e = P.pts[P.pts.length - 1]; return { id, ok: true, end: +(Math.hypot(e[0] - g[0], e[1] - g[1]) / WS).toFixed(1), climb: Math.round(P.climb / WS), len: Math.round(P.len / WS) }; });
    // walk her from the gate down both stairs into the square: height follows the terraces, no jumps
    E.enter(T.GATE_IN[0], T.GATE_IN[1]); for (let i = 0; i < 10; i++) E.tick(1 / 30); const sq = T.W2(T.SQ.px, T.SQ.py); E.goTo(sq[0], sq[1]); let maxStep = 0, prev = null, minH = 1e9, maxH = -1e9; for (let i = 0; i < 30 * 40; i++) { E.tick(1 / 30); const h = E.here(); const z = E.hAt(h[0], h[1]); if (prev != null) maxStep = Math.max(maxStep, Math.abs(z - prev)); prev = z; minH = Math.min(minH, z); maxH = Math.max(maxH, z); }
    const hh = E.here(); o.walk = { end: +(Math.hypot(hh[0] - sq[0], hh[1] - sq[1]) / WS).toFixed(1), maxStep: +(maxStep / WS).toFixed(2), drop: +((maxH - minH) / WS).toFixed(1), body: +E.bodyInside().toFixed(2) };
    // mobile cost + no text
    let n = 0, tris = 0, text = 0; T.ST.g.traverse((m) => { if (m.isMesh) { n++; tris += m.geometry.attributes.position.count / 3; } if (m.isSprite) text++; }); o.draws = n; o.tris = Math.round(tris); o.text = text; o.names = /delver/i.test(JSON.stringify(T.BLD) + JSON.stringify(T.LOTS)) ? 1 : 0;
    return o; });
  console.log(JSON.stringify(R));
  ok(R.lowland, `on the lower playing field (lowlands), ${R.fromLedge} m from the starter Ledge`);
  ok(R.ore === 0 && R.crack === 0 && R.wet === 0 && R.homes === 0 && R.caves === 0, `no overlap with mining fields (${R.ore}), crevices (${R.crack}), water (${R.wet} of ${R.cells} cells), homes (${R.homes}) or caves (${R.caves})`);
  ok(R.trees === 0, `no trees, rocks or map props inside the town (${R.trees})`); ok(!R.mosby, 'Mosby is not standing in town');
  for (const q of R.bld) ok(q.s === q.n, `${q.id}: solid (${q.s}/${q.n} footprint samples blocked)`);
  ok(R.props > 20 && R.propSolid === R.props, `every town prop is solid (${R.propSolid}/${R.props})`); ok(R.edgePush > 0.3, `the drop edge is solid (pushed ${R.edgePush} m back, ${R.edgeDrop} m drop)`);
  ok(R.steps[0] > 0.9 && R.steps[0] < 1.1 && R.steps[1] > 0.4 && R.steps[1] < 0.6, `three terraces at Art's lowland levels +1.0 / 0 / -0.5 m (${R.steps.join(' m, ')} m drops)`);
  ok(R.path && R.join < 3 && R.pathInTown <= 1, `a footpath leaves the main street's land end and joins the path network (${R.join} m from it, ${R.pathInTown} points inside town, ${R.pathLen} pts)`);
  for (const r of R.routes) ok(r.ok && r.end < 3 && r.climb === 0, `route Ledge -> ${r.id}: ${r.ok ? r.len + ' m, ends ' + r.end + ' m off, climb ' + r.climb : 'none'}`);
  ok(R.walk.end < 2 && R.walk.maxStep < 0.6 && R.walk.drop > 1.2 && R.walk.body < 0.3, `walks gate -> stairs -> square (${R.walk.end} m off, max step ${R.walk.maxStep} m, down ${R.walk.drop} m, body in ground ${R.walk.body} m)`);
  ok(R.draws <= 30 && R.tris < 70000, `light for mobile: ${R.draws} draw calls, ${R.tris} triangles`); ok(R.text === 0 && R.names === 0, 'no text sprites, no Made in Abyss names');
  if (SHOT) { const fs = require('fs'); fs.mkdirSync(SHOT, { recursive: true }); const V = JSON.parse(process.env.VIEWS || '[["town-est",385,265,1.05,60,0.75]]');
    for (const [name, px, py, az, d, tilt] of V) { await p.evaluate(([px, py, az, d, tilt]) => { const [x, y] = Town.W2(px, py); Explore.enter(x, y); const E = Explore.EX; E.az = az; E.d = d; E.tilt = tilt; for (let k = 0; k < 20; k++) Explore.tick(1 / 30); }, [px, py, az, d, tilt]); await p.waitForTimeout(2500); await p.screenshot({ path: `${SHOT}/${name}.jpg`, type: 'jpeg', quality: 86 }); } }
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  console.log(fails ? 'SOME FAILED' : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0); })();

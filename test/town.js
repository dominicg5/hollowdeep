// beginner town (town.js): it is built on the lowlands (the lower playing field), clear of mining fields, crevices, streams, lakes, homes and caves;
// standalone building sites (no plateau, rim, terraces or stairs): every building sits on a plinth conforming to the natural ground, is solid, and she walks to every door and keeper on the field;

// light for mobile (draw calls, triangles); no text anywhere. SHOT=dir saves renders.
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
    const [cx, cy] = T.VALLEY[1]; o.lowland = typeof lowland === 'function' ? lowland(cx, cy) : Math.hypot(cx, cy) > CITY.plateauR + 1000; o.fromLedge = Math.round(Math.hypot(cx - W.player.x, cy - W.player.y) / WS);
    const inside = (x, y, pad) => T.hit(x, y, pad || 0);
    o.ore = (E.ORE.spots || []).filter((s) => { for (let a = 0; a < 6.3; a += 0.3) for (const f of [0, 0.5, 1]) if (inside(s.x + Math.cos(a) * s.R * f, s.y + Math.sin(a) * s.R * f, WS * 4)) return true; return false; }).length;
    o.crack = 0; for (const cr of W.cracks || []) for (let q = 0; q + 1 < cr.pts.length; q++) for (let t = 0; t <= 1; t += 0.1) { const x = cr.pts[q][0] + (cr.pts[q + 1][0] - cr.pts[q][0]) * t, y = cr.pts[q][1] + (cr.pts[q + 1][1] - cr.pts[q][1]) * t; if (inside(x, y, WS * 10)) o.crack++; }
    o.wet = 0; o.cells = 0; for (let px = -70; px <= 800; px += 10) for (let py = 10; py <= 570; py += 10) { const [x, y] = T.W2(px, py); if (!inside(x, y, WS * 2)) continue; o.cells++; if (GRAND.wet && GRAND.wet(x, y, WS * 2)) o.wet++; }
    o.homes = W.homes.filter((h) => inside(h.x, h.y, (h.size || 30) + WS * 2)).length; o.caves = E.caves().filter((c) => inside(c.M[0], c.M[1], WS * 10)).length;
    o.trees = M3.colliders().filter((c) => inside(c.x, c.y, 0)).length; o.mosby = typeof Mosby !== 'undefined' && Mosby.MS && Mosby.MS.at ? inside(Mosby.MS.at.x || Mosby.MS.at[0], Mosby.MS.at.y || Mosby.MS.at[1], WS * 5) : false;
    // solids: building interiors, props and the drop edges
    const BR = E.BODY_R; o.bld = T.BLD.map((B) => { const P = B.P, cs = Math.cos(P.yaw), sn = Math.sin(P.yaw), L = (lx, lz) => [P.x + (lx * cs + lz * sn) * WS, P.y + (-lx * sn + lz * cs) * WS]; let n = 0, s = 0;
      for (const f of B.foot) { const pts = f.length === 3 ? [[f[0], f[1]], [f[0] + f[2] * 0.6, f[1]], [f[0], f[1] - f[2] * 0.6]] : [[(f[0] + f[2]) / 2, (f[1] + f[3]) / 2], [f[0] + 0.5, f[1] + 0.5], [f[2] - 0.5, f[3] - 0.5]]; for (const [a, c] of pts) { const [x, y] = L(a, c); n++; if (E.solidAt(x, y, BR)) s++; } }
      const D=T.SITE_PLAN[B.id].door,A0=T.SITE_PLAN[B.id].approach[0],fr = L(A0[0], A0[1]), dr = L(D[0], D[1]+0.4); return { id: B.id, n, s, front: fr, step: +((P.h - M3.meshH(dr[0], dr[1])) / WS).toFixed(2) }; });
    o.props = T.PCOL.length; o.propSolid = T.PCOL.filter(([x, y]) => E.solidAt(x, y, 1)).length;
    // standalone sites (Dominic: no plateau, rim, terraces or stairs): each building sits on its own plinth that conforms to the natural ground
    o.site = T.BLD.map((B) => { const P = B.P; return { id: B.id, expected: B.id==='guide_hut' ? [-5217,8498] : ({general_store:[-5517,7915],rope_maker:[-5765,7225],smithy:[-6118,6582],inn:[-6587,6020]})[B.id], at:[P.x,P.y], yaw:P.yaw, rise: +((P.h - P.lo) / WS).toFixed(2), floorOver: +((P.h - T.nat(P.x, P.y)) / WS).toFixed(2) }; });
    o.rimCols = T.cols().filter((c) => c.key === 'townWall' || c.key === 'townStair').length; o.hover = T.hOver(T.W2(T.SQ.px, T.SQ.py)[0], T.W2(T.SQ.px, T.SQ.py)[1]);
    o.strip=T.BLD.map(B=>{const P=T.place(B);return {id:B.id,hit:typeof Mosby!=='undefined'&&Mosby.trailHit(P.x,P.y,10*WS+Math.hypot(B.w,B.d)/2*WS)};});
    o.path=T.paths([]);
    { let inStrip=0, n=0; T.paths([]).forEach((f,pi)=>{ for(let i=1;i+3<f.length;i+=2){ if(pi===0&&i===1)continue; const ax=f[i],ay=f[i+1],bx=f[i+2],by=f[i+3]; for(let t=0;t<=1;t+=.05){n++; if(Mosby.trailHit(ax+(bx-ax)*t,ay+(by-ay)*t,10*WS+1.3*WS))inStrip++;} } }); o.pathStrip={inStrip,n};
      const AP=E.allPaths(), vtx=[]; for(const f of AP)for(let i=1;i+1<f.length;i+=2)vtx.push([f[i],f[i+1]]); const segD=(x,y)=>{let m=1e9;for(const f of AP)for(let i=1;i+3<f.length;i+=2){const ax=f[i],ay=f[i+1],dx=f[i+2]-ax,dy=f[i+3]-ay,l2=dx*dx+dy*dy||1,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/l2));m=Math.min(m,Math.hypot(x-ax-dx*t,y-ay-dy*t));}return m/WS;};
      o.pathKept=T.VALLEY.map(p=>+segD(p[0],p[1]).toFixed(1)).concat(T.BLD.flatMap(B=>{const q=T.SITE_PLAN[B.id],pts=[q.approach[0],q.door];return pts.map(l=>{const w=T.local(B,...l);return +segD(w[0],w[1]).toFixed(1);});}));
      const sm=T.BLD.find(b=>b.id==='smithy'); o.birch=T.SITE_PLAN.smithy.remove.map(r=>{const w=T.local(sm,r[0],r[1]);return M3.colliders().filter(c=>Math.hypot(c.x-w[0],c.y-w[1])<2*WS).length;}); }
    // routes: Ledge door -> each building front and each keeper's talk spot, on the natural ground (no climbing)
    const door = W.playerDoor || W.player, S0 = [door.x, door.y], goals = o.bld.map((q) => [q.id, q.front]).concat(T.BLD.map((B) => ['keeper ' + B.npc, T.npcSpot(B).talk]));
    o.routes = goals.map(([id, g]) => { const P = E.plan(S0[0], S0[1], g[0], g[1]); if (!P) return { id, ok: false }; const e = P.pts[P.pts.length - 1]; return { id, ok: true, end: +(Math.hypot(e[0] - g[0], e[1] - g[1]) / WS).toFixed(1), climb: Math.round(P.climb / WS), len: Math.round(P.len / WS) }; });
    // walk her with the game's own movement from the open field to every building front and back out: she arrives, her feet stay on the ground (natural, levelled only on each pad), never inside a building
    const F0 = T.VALLEY[1]; o.walks = [];
    for (const q of o.bld) { const B=T.BLD.find(b=>b.id===q.id), F=T.local(B,...T.SITE_PLAN[B.id].approach[1]); E.enter(F[0], F[1]); for (let i = 0; i < 10; i++) E.tick(1 / 30); E.goTo(q.front[0], q.front[1]); let off = 0, maxStep = 0, prev = null, solid = 0;
      for (let i = 0; i < 30 * 30; i++) { E.tick(1 / 30); const h = E.here(), z = E.hAt(h[0], h[1]); off = Math.max(off, Math.abs(z - M3.meshH(h[0], h[1]))); if (prev != null) maxStep = Math.max(maxStep, Math.abs(z - prev)); prev = z; if (E.solidAt(h[0], h[1], 0) && E.solidAt(h[0], h[1], 0).key === 'town') solid++; }
      const hh = E.here(); o.walks.push({ id: q.id, end: +(Math.hypot(hh[0] - q.front[0], hh[1] - q.front[1]) / WS).toFixed(1), off: +(off / WS).toFixed(2), maxStep: +(maxStep / WS).toFixed(2), solid, body: +E.bodyInside().toFixed(2) }); }
    // mobile cost + no text
    let n = 0, tris = 0, text = 0; T.ST.g.traverse((m) => { if (m.isMesh) { n++; tris += m.geometry.attributes.position.count / 3; } if (m.isSprite) text++; }); o.draws = n; o.tris = Math.round(tris); o.text = text; o.names = /delver/i.test(JSON.stringify(T.BLD) + JSON.stringify(T.LOTS)) ? 1 : 0;
    // placeable module: move one site 25 m along the field and back - its solids, keeper and talk spot follow (Town.setSite), nothing is left at the old spot
    { const B = T.BLD.find((q) => q.id === 'guide_hut'), P0 = T.place(B), k0 = T.npcSpot(B), nx = P0.x - 25 * WS, ny = P0.y; T.setSite('guide_hut', nx, ny, P0.yaw + 0.6); E.build(); const k1 = T.npcSpot(B);
      o.move = { newSolid: !!E.solidAt(nx, ny, 0), oldClear: !E.solidAt(P0.x, P0.y, 0), keeper: +(Math.hypot(k1.at[0] - k0.at[0] + 25 * WS, k1.at[1] - k0.at[1]) / WS).toFixed(1), built: !!(T.ST && T.ST.built) };
      T.setSite('guide_hut', P0.x, P0.y, P0.yaw); E.build(); o.move.back = !!E.solidAt(P0.x, P0.y, 0); }
    return o; });
  console.log(JSON.stringify(R));
  ok(R.lowland, `on the lower playing field (lowlands), ${R.fromLedge} m from the starter Ledge`);
  ok(R.ore === 0 && R.crack === 0 && R.wet === 0 && R.homes === 0 && R.caves === 0, `no overlap with mining fields (${R.ore}), crevices (${R.crack}), water (${R.wet} of ${R.cells} cells), homes (${R.homes}) or caves (${R.caves})`);
  ok(R.trees === 0, `no trees, rocks or map props inside the town (${R.trees})`); ok(!R.mosby, 'Mosby is not standing in town');
  for (const q of R.bld) ok(q.s === q.n, `${q.id}: solid (${q.s}/${q.n} footprint samples blocked)`);
  for (const q of R.bld) ok(q.step > -.6 && q.step < .6, `${q.id}: the door sill is one low step over the rendered ground in front (${q.step} m)`);
  ok(R.props > 20 && R.propSolid === R.props, `every town prop is solid (${R.propSolid}/${R.props})`);
  ok(R.rimCols === 0 && R.hover === null, `no plateau: no rim or stair walls (${R.rimCols}), the ground under the town is the natural field (override ${R.hover})`);
  for (const q of R.site) ok(q.rise < .8 && Math.abs(q.floorOver) < .8, `${q.id}: standalone site on its own plinth (floor ${q.floorOver} m over the ground at its centre, plinth drops ${q.rise} m to the lowest corner)`);
  for (const q of R.site) ok(Math.hypot(q.at[0]-q.expected[0],q.at[1]-q.expected[1])<1, `${q.id}: Art's valley position (Guide Hut offset 24 m NE to keep its approach clear of Mosby)`);
  for (const q of R.strip) ok(!q.hit, `${q.id}: whole building plus 10 m outside Mosby's current strip`);
  ok(R.path.length>=6 && R.path[0][1]===-5635, 'one valley path from the Ledge door, plus direct branches; no old town link');
  ok(R.pathStrip.inStrip===0, `valley path and branches >= 10 m outside Mosby's strip past the Ledge crossing (${R.pathStrip.inStrip}/${R.pathStrip.n} samples inside)`);
  ok(R.pathKept.every(d=>d<3.5), `the painted network keeps the whole valley path and every branch on to its door (grass yards, no cobble) (no dead-end trim): ${R.pathKept.join(',')} m`);
  ok(R.birch.every(n=>n===0), `the 2 birches at the Smithy are gone (${R.birch})`);
  for (const r of R.routes) ok(r.ok && r.end < 3 && r.climb === 0, `route Ledge -> ${r.id}: ${r.ok ? r.len + ' m, ends ' + r.end + ' m off, climb ' + r.climb : 'none'}`);
  for (const w of R.walks) ok(w.end < 2.5 && w.off < 0.3 && w.maxStep < 0.6 && w.solid === 0 && w.body < 0.3, `walks the field to the ${w.id} door (${w.end} m off, feet ${w.off} m off the ground, max step ${w.maxStep} m, ${w.solid} frames inside a wall, body in ground ${w.body} m)`);
  ok(R.draws <= 30 && R.tris < 70000, `light for mobile: ${R.draws} draw calls, ${R.tris} triangles`); ok(R.text === 0 && R.names === 0, 'no text sprites, no Made in Abyss names');
  if (SHOT) { const fs = require('fs'); fs.mkdirSync(SHOT, { recursive: true }); const V = JSON.parse(process.env.VIEWS || '[["town-est",385,265,1.05,60,0.75]]');
    for (const [name, px, py, az, d, tilt] of V) { await p.evaluate(([px, py, az, d, tilt]) => { const [x, y] = Town.W2(px, py); Explore.enter(x, y); const E = Explore.EX; E.az = az; E.d = d; E.tilt = tilt; for (let k = 0; k < 20; k++) Explore.tick(1 / 30); }, [px, py, az, d, tilt]); await p.waitForTimeout(2500); await p.screenshot({ path: `${SHOT}/${name}.jpg`, type: 'jpeg', quality: 86 }); } }
  ok(R.move.newSolid && R.move.oldClear && R.move.back && R.move.built && R.move.keeper < 5, `placeable module: guide_hut moved 25 m and back - solid at the new spot ${R.move.newSolid}, old spot clear ${R.move.oldClear}, keeper followed (within ${R.move.keeper} m incl. the turn), rebuilt ${R.move.built}, back ${R.move.back}`);
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  console.log(fails ? 'SOME FAILED' : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0); })();

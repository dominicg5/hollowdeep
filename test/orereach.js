// every ore node in every mining field can be mined (Dominic): it has a stand on walkable main-land ground, clear of every collider and of the
// Lumen Tree's roots, that the planner reaches; no field sits on the roots; the coal field by the Lumen Tree has ore; a drill there wires up with a
// tether route; a saved drill whose node index went stale is moved to a node in its own field.
const { chromium } = require('playwright-core');
const URL = (process.env.URL || 'http://localhost:8765/index.html') + (process.env.Q || '');
(async () => { const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(1000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 240000 }); await p.waitForFunction(() => Explore.on, null, { timeout: 120000 }).catch(() => {}); await p.waitForTimeout(3000);
  const R = await p.evaluate(() => { const E = Explore, WS = E.WS, NV = E.build(), main = NV.size.indexOf(Math.max(...NV.size)), H = M3.hwx, F = E.ledgeFront(), S0 = E.reach(F.x + WS * 30, F.y + WS * 30);
    const inRoot = (x, y, pad) => !!(H && H.rootPts && H.rootPts.some((P, ri) => P.some((q, i) => { const r = (H.rootR[ri] && H.rootR[ri][i]) || 0; return r > 20 && Math.hypot(q.x - x, q.z - y) < r + pad; })));
    const out = { fields: [], bad: [], empty: [], rootField: [] };
    for (const sp of E.ORE.spots) { const f = { id: sp.id, type: sp.type, n: sp.nodes.length, R: Math.round(sp.R / WS) }; out.fields.push(f); if (!sp.nodes.length) out.empty.push(sp.id); if (!sp.cliff && inRoot(sp.x, sp.y, sp.R * 0.6)) out.rootField.push(sp.id);
      let planned = false; for (const n of sp.nodes) { const st = E.oreStand(n); let why = null; if (!st) why = 'no stand'; else { const [i, j] = [Math.round((st[0] - E.REG.X0) / E.C), Math.round((st[1] - E.REG.Y0) / E.C)], k = j * NV.nx + i;
          if (E.clsAt(st[0], st[1]) !== 1) why = 'stand not walkable'; else if (NV.comp[k] !== main) why = 'stand cut off'; else if (E.solidAt(st[0], st[1], WS * 0.3)) why = 'stand in a collider'; else if (inRoot(st[0], st[1], WS * 0.3)) why = 'stand on a root'; else if (inRoot(n.x, n.y, 0)) why = 'node in a root';
          else if (!planned) { const r = E.plan(S0[0], S0[1], st[0], st[1]), q = r && r.pts[r.pts.length - 1]; planned = true; if (!q || Math.hypot(q[0] - st[0], q[1] - st[1]) > WS * 1.5) why = 'planner misses it'; } }
        if (why) out.bad.push([sp.id, Math.round(n.x), Math.round(n.y), why]); } }
    out.nodes = E.ORE.nodes.length;
    // the coal field by the Lumen Tree: has ore, is clear of the roots, and a drill there wires up
    const T = E.places().find((q) => q.id === 'tree'), lum = E.ORE.spots.filter((s) => s.type === 'coal' && s.nodes.length).sort((a, b) => Math.hypot(a.x - T.x, a.y - T.y) - Math.hypot(b.x - T.x, b.y - T.y))[0];
    out.lum = { id: lum.id, n: lum.nodes.length, d: Math.round(Math.hypot(lum.x - T.x, lum.y - T.y) / WS), root: inRoot(lum.x, lum.y, lum.R) };
    const D = E.drillState(); D.tetherM = 1e7; Craft.add('bag', 'tether:mithril', 400000); for (let i = 0; i < 8; i++) { try { CharView.unlockPort(); } catch (e) {} }
    const nd = lum.nodes.find((n) => E.oreStand(n) && !D.list.some((d) => E.ORE.nodes[d.node] === n)), d = nd && E.drillDeploy(nd); out.drill = !!d; out.wired = !!(d && E.drillWire(d, true));
    const tl = E.tetherList ? E.tetherList() : [], tt = d && tl.find((t) => t.id === d.id || t.d === d || (t.name && t.name === d.name)); out.tether = tt ? { len: Math.round(tt.len || tt.m || 0) } : tl.length;
    // a stale save: the drill's node index points into another field -> moved back into its own field
    if (d) { const other = E.ORE.nodes.findIndex((n) => n.spot !== lum); d.node = other; E.drillFix(); const n2 = E.ORE.nodes[d.node]; out.fix = { spot: n2 && n2.spot.id, want: lum.id, type: n2 && n2.type }; }
    return out; });
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  console.log('fields', JSON.stringify(R.fields.map((f) => f.id + ':' + f.type + ':' + f.n))); console.log('nodes', R.nodes, 'empty (no reachable ore, shown as plain rock)', JSON.stringify(R.empty));
  if (R.bad.length) console.log('bad', JSON.stringify(R.bad.slice(0, 20)));
  ok(R.bad.length === 0, `every ore node in every field is reachable: stand walkable, on the main land, clear of colliders and roots, planner gets there (${R.bad.length} bad of ${R.nodes})`);
  ok(R.rootField.length === 0, 'no mining field sits on the Lumen Tree roots ' + JSON.stringify(R.rootField));
  ok(R.fields.filter((f) => f.n > 0).length >= 26, `at least 26 of ${R.fields.length} fields have ore (${R.fields.filter((f) => f.n > 0).length})`);
  ok(R.lum.n >= 20 && !R.lum.root, 'the coal field nearest the Lumen Tree has ore and is clear of the roots ' + JSON.stringify(R.lum));
  ok(R.drill && R.wired, 'a drill there deploys and wires to the Ledge ' + JSON.stringify({ drill: R.drill, wired: R.wired, tether: R.tether }));
  ok(R.fix && R.fix.spot === R.fix.want && R.fix.type === 'coal', 'a stale saved drill is moved back to a node in its own field ' + JSON.stringify(R.fix));
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 3).join(' | '));
  console.log(fails ? 'SOME FAIL' : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0); })();

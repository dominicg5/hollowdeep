// Mosby moves her real home: Confirm lifts the house onto the tortoise (plot empty, door + ports gone with it); on arrival the house itself stands on the
// picked spot (saved: still there after a reload), on its own apron when the ground isn't level; door, interior entry, teleport targets and tether starts
// follow it, tethers re-route from the new door; the old plot is empty and walkable; a bad spot (water / neighbour / giant's walk) is refused.
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html', SHOT = process.env.SHOT || '';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(1000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 200000 }).catch(() => {}); await p.waitForFunction(() => Explore.on, null, { timeout: 30000 }).catch(() => {});
  const ready = async () => { await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 200000 }).catch(() => {}); await p.evaluate(async () => { for (let i = 0; i < 90 && M3.models !== 'ready'; i++) await new Promise((r) => setTimeout(r, 1000)); await new Promise((r) => setTimeout(r, 1500)); }); };
  await ready();
  // a drop tether first (so we can see it follow the house)
  const r0 = await p.evaluate(async () => { const WS = Explore.WS, F = Explore.ledgeFront(), k = Explore.reach(F.x + WS * 40, F.y + WS * 25); Explore.enter(k[0], k[1]); for (let i = 0; i < 10; i++) Explore.tick(1 / 30); if (!CharView.homeState().ports.c) CharView.plugPort('c', 'mithril', 'to'); if (Craft.get('bag', 'tether:mithril') < 3000) Craft.add('bag', 'tether:mithril', 4000); Explore.dropCreate(); S.gold = 5000;
    const P = W.player; let spot = null; for (let k2 = 0; k2 < 400 && !spot; k2++) { const a = k2 * 2.399, d = WS * (70 + k2 * 1.2), x = P.x + Math.cos(a) * d, y = P.y + Math.sin(a) * d; if (HomeMove.check(x, y).ok && MosbyTalk.route(x, y)) spot = [x, y]; }
    const bad = { water: null, house: null }; for (const lk of (GRAND.water && GRAND.water.lakes) || []) { const w = HomeMove.check(lk.x, lk.y).why; if (w !== 'giant' && w !== 'edge') { bad.water = w; break; } } /* a lake off his circuit (he wades some of them) */ const nb = M3.solids().find((q) => !q.player); bad.house = HomeMove.check(nb.x + 5, nb.y).why; const gl = Mosby.GLOOP.reduce((q, w) => (Math.hypot(w[0], w[1]) < Math.hypot(q[0], q[1]) ? w : q)); /* a point of his circuit inside the placeable area (much of it runs near the map edge) */ bad.giant = HomeMove.check(gl[0], gl[1]).why;
    MosbyTalk.open(); MosbyTalk.go('pick'); const badCard = MosbyTalk.card(nb.x + 5, nb.y); const badStep = MosbyTalk.step, badSay = document.querySelector('#mosDlg .mdWell p').textContent; MosbyTalk.close();
    return { P0: [P.x, P.y], F0: [F.x, F.y], spot, bad, badCard: !!badCard, badStep, badSay, drop: Explore.dropState().list.length }; });
  console.log(JSON.stringify(r0)); ok(!!r0.spot, 'a valid spot for the house'); ok(r0.bad.water === 'water' && r0.bad.house === 'house' && r0.bad.giant === 'giant', 'water, a neighbour\'s plot and the giant\'s walk are refused');
  ok(!r0.badCard && r0.badStep === 'badspot' && /not there/.test(r0.badSay), `picking a bad spot: Mosby says so and lets her pick again ("${r0.badSay}")`);
  // pay + confirm: the house goes up onto his back
  const r1 = await p.evaluate(async (sp) => { const WS = Explore.WS, R = MosbyTalk.card(sp[0], sp[1]); document.querySelector('#mosCard [data-a=confirm]').click(); await new Promise((r) => setTimeout(r, 300)); for (let i = 0; i < 3; i++) { Mosby.tick(0.05); Explore.tick(1 / 30); }
    const P = W.player, sol = M3.solids().find((q) => q.player); return { away: !!P.away, sol: !!sol, doorVis: !!(Explore.DR ? Explore.DR.ledgeDoor && Explore.DR.ledgeDoor.visible : null), tort: !!(Mosby.MS.g && Mosby.MS.g.visible !== undefined && Mosby.MS.trip), houseOnBack: !!Mosby.MS.houseKey, fee: R.fee, trip: !!S.mosbyTrip && !!S.mosbyTrip.home }; }, r0.spot);
  console.log(JSON.stringify(r1)); ok(r1.away && !r1.sol && r1.trip, 'Confirm: the house leaves its plot (no house, no solid there) and rides on the tortoise'); ok(r1.houseOnBack, 'the same house model rides on his back');
  // arrival
  const r2 = await p.evaluate(async ([sp, P0, F0]) => { const WS = Explore.WS, T = S.mosbyTrip; Mosby.MS.tNow = T.t0 + T.eta * 1000 + 3000; Mosby.tick(0.05); for (let i = 0; i < 10; i++) Explore.tick(1 / 30); await new Promise((r) => setTimeout(r, 500));
    const P = W.player, F = Explore.ledgeFront(), sol = M3.solids().find((q) => q.player), D = W.playerDoor, R = TetherTap.routes(), dr = R.find((t) => t.kind === 'drop'), L = Explore.tetherList(), door = L.find((q) => q.key === 'door'), ledge = Explore.doorSpots ? null : null;
    const oldSolid = M3.solids().some((q) => Math.hypot(q.x - P0[0], q.y - P0[1]) < WS * 3), oldWalk = Explore.clsAt(P0[0], P0[1]);
    const dropStart = dr && Math.hypot(dr.pts[0][0] - F.x, dr.pts[0][1] - F.y) / WS, drLen = Explore.dropState().list[0].len;
    Explore.teleportTo('door'); for (let i = 0; i < 5; i++) Explore.tick(1 / 30); const h = Explore.here();
    return { done: T.done, P: [P.x, P.y], away: !!P.away, dSpot: Math.hypot(P.x - sp[0], P.y - sp[1]) / WS, sol: sol && Math.hypot(sol.x - sp[0], sol.y - sp[1]) / WS, doorD: D && Math.hypot(D.x - sp[0], D.y - sp[1]) / WS, frontD: Math.hypot(F.x - sp[0], F.y - sp[1]) / WS,
      frontMoved: Math.hypot(F.x - F0[0], F.y - F0[1]) / WS, orbDoor: door && Math.hypot(door.x - F.x, door.y - F.y) / WS, dropStart, drLen, oldSolid, oldWalk, tpD: Math.hypot(h[0] - F.x, h[1] - F.y) / WS, saved: S.homeAt && [S.homeAt.x, S.homeAt.y], tortVis: Mosby.MS.g && Mosby.MS.g.visible, apron: !!HomeMove.apronMesh }; }, [r0.spot, r0.P0, r0.F0]);
  console.log(JSON.stringify(r2)); ok(r2.done && !r2.away && r2.dSpot < 0.5 && r2.sol < 0.5, `on arrival the house itself stands on the picked spot (${r2.dSpot.toFixed(1)} m)`);
  ok(r2.doorD < 10 && r2.frontD < 14 && r2.frontMoved > 30, `its door and front-door spot moved with it (door ${r2.doorD.toFixed(1)} m from the centre, front ${r2.frontMoved.toFixed(0)} m from before)`);
  ok(r2.orbDoor < 1, 'the Tether Orb\'s door target is the new door'); ok(r2.tpD < 8, `Teleport to the Ledge door lands at the new door (${r2.tpD.toFixed(1)} m)`);
  ok(r2.dropStart != null && r2.dropStart < 6 && r2.drLen > 0, `the drop tether re-routes from the new door (starts ${r2.dropStart && r2.dropStart.toFixed(1)} m from it, ${r2.drLen} m laid)`);
  ok(!r2.oldSolid && r2.oldWalk, 'the old plot is empty and walkable'); ok(!r2.tortVis, 'the tortoise is gone (nothing rides on his back)'); ok(!!r2.saved, 'the new home spot is saved');
  if (SHOT) { await p.evaluate(async () => { const F = Explore.ledgeFront(), WS = Explore.WS, k = Explore.reach(F.x + WS * 14, F.y + WS * 10); Explore.enter(k[0], k[1]); const E = Explore.EX; E.az = Math.atan2(k[0] - W.player.x, k[1] - W.player.y); E.d = 14; E.tilt = 0.22; for (let i = 0; i < 10; i++) Explore.tick(1 / 30); await new Promise((r) => setTimeout(r, 1500)); }); await p.screenshot({ path: SHOT + '/home-moved.png', timeout: 120000 }); }
  // reload: still there
  await p.evaluate(() => { try { save(); } catch (e) {} }); await p.reload(); await p.waitForTimeout(1000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); }); await ready();
  const r3 = await p.evaluate((sp) => { const WS = Explore.WS, P = W.player, F = Explore.ledgeFront(), sol = M3.solids().find((q) => q.player); return { dSpot: Math.hypot(P.x - sp[0], P.y - sp[1]) / WS, sol: sol && Math.hypot(sol.x - sp[0], sol.y - sp[1]) / WS, frontD: Math.hypot(F.x - sp[0], F.y - sp[1]) / WS, away: !!P.away, apron: !!HomeMove.apronMesh || !!(S.homeAt && S.homeAt.elev != null) }; }, r0.spot);
  console.log(JSON.stringify(r3)); ok(r3.dSpot < 0.5 && r3.sol < 0.5 && r3.frontD < 14 && !r3.away, 'after a reload the house (and its door) are still on the new spot');
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 2).join(' | '));
  console.log(fails ? fails + ' FAIL' : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0); })();

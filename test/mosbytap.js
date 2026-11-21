// (Dominic) tapping elsewhere after selecting Mosby must let go of him: no sticky walk-to-Mosby, his dialogue closes, the new tap acts; he is selected only
// when the tap really lands on his body (a visible mesh, nearer than the ground under the finger).
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL + '?t=' + Date.now()); await p.waitForTimeout(1000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 200000 }).catch(() => {}); await p.waitForFunction(() => Explore.on && Mosby.GM.g, null, { timeout: 60000 }).catch(() => {});
  await p.evaluate(async () => { for (let i = 0; i < 90 && M3.models !== 'ready'; i++) await new Promise((r) => setTimeout(r, 1000)); await new Promise((r) => setTimeout(r, 1500)); S.mosbyTrip = null; });
  // a helper in the page: aim the camera at him from where she stands, render, and give screen points on him and on open ground away from him
  await p.evaluate(() => { window.__aim = () => { const G = Mosby.GM, E = Explore.EX; E.d = 7.6; E.tilt = 0.2; let best = null; for (let k = 0; k < 16; k++) { E.az = k * Math.PI / 8; for (let i = 0; i < 3; i++) Explore.tick(1 / 30); M3.render(0, CityMap.cam); const q = M3.project(G.at.x, G.at.y, G.g.scale.x * 3); const dd = q[0] < -999 ? 1e9 : Math.abs(q[0] - innerWidth / 2) + Math.abs(q[1] - innerHeight * 0.4) * 0.2; if (!best || dd < best[1]) best = [k, dd]; }
      E.az = best[0] * Math.PI / 8; for (let i = 0; i < 4; i++) Explore.tick(1 / 30); M3.render(0, CityMap.cam); Mosby.gTick(0.001); let on = null; for (let sy = 10; sy < innerHeight * 0.8 && !on; sy += 24) for (let sx = 20; sx < innerWidth - 20 && !on; sx += 24) if (Mosby.bodyHit(sx, sy)) on = [sx, sy]; on = on || [-1, -1];
      let ground = null; for (const [fx, fy] of [[0.12, 0.85], [0.88, 0.85], [0.5, 0.9], [0.1, 0.7], [0.9, 0.7]]) { const sx = innerWidth * fx, sy = innerHeight * fy; if (!Mosby.bodyHit(sx, sy) && M3.unproject(sx, sy)) { ground = [sx, sy]; break; } } return { on, ground }; }; });
  const r = await p.evaluate(async () => { const G = Mosby.GM, WS = Explore.WS, wait = (ms) => new Promise((r) => setTimeout(r, ms)), tripTo = () => (ExMap.st.trip && ExMap.st.trip.dest && ExMap.st.trip.dest.label) || null; const sc = Mosby.gScale(), Lp = Mosby.gLoop().L; let sF = 0; for (let q = 0; q < Lp; q += WS * 20) { const pt = Mosby.gAt(q), h0 = M3.meshH(pt[0], pt[1]); let mx = 0; for (const [u, v] of [[1, 1], [1, -1], [-1, 1], [-1, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) mx = Math.max(mx, Math.abs(M3.meshH(pt[0] + u * 2.5 * sc, pt[1] + v * 2.5 * sc) - h0)); if (mx < WS * 1.0 && !isWet(pt[0], pt[1], WS * 60)) { sF = q; break; } }
    /* meet him on open, flat, dry ground (his circuit also runs through lakes and along banks) */ G.hold = false; G.s = sF; Mosby.gTick(0.01); G.hold = true; const o = { sF: Math.round(sF / WS) };
    // A: far away, tap him -> she sets off to him; then a tap on open ground: the walk to him is dropped and stays dropped
    const far = Explore.reach(G.at.x + WS * 110, G.at.y + WS * 60); Explore.enter(far[0], far[1]); for (let i = 0; i < 5; i++) Explore.tick(1 / 30); Mosby.talkTap(); o.aTrip = tripTo(); o.aMeet = Mosby.MEET.on;
    const A = __aim(); o.aGround = !!A.ground; if (A.ground) { Explore.tap(A.ground[0], A.ground[1]); o.aAfterMeet = Mosby.MEET.on; await wait(3600); o.aLater = tripTo(); o.aLaterMeet = Mosby.MEET.on; }
    // B: beside him, tap his body -> dialogue; tap open ground -> dialogue closes, he is not re-selected, she acts on the tap
    const m = Mosby.gMeet(far[0], far[1]), k = Explore.reach(m[0], m[1]); Explore.enter(k[0], k[1]); for (let i = 0; i < 5; i++) Explore.tick(1 / 30); G.hold = true;
    const B = __aim(); { const rc = new THREE.Raycaster(), el = M3.renderer.domElement; rc.setFromCamera(new THREE.Vector2((B.on[0] / el.clientWidth) * 2 - 1, -(B.on[1] / el.clientHeight) * 2 + 1), M3.camera); const hs = rc.intersectObject(G.g, true); o.dbg = { vis: G.g.visible, fade: G.fade, on: B.on.map(Math.round), n: hs.length, first: hs[0] && [hs[0].object.name, hs[0].object.type, Math.round(hs[0].distance)], gp: M3.unproject(B.on[0], B.on[1]), cam: M3.camera.position.toArray().map(Math.round), at: [G.at.x, G.at.y].map(Math.round) }; } o.onHit = Mosby.bodyHit(B.on[0], B.on[1]); Explore.tap(B.on[0], B.on[1]); o.bDlg = MosbyTalk.step; G.hold = true;
    if (B.ground) { o.groundHit = Mosby.bodyHit(B.ground[0], B.ground[1]); Explore.tap(B.ground[0], B.ground[1]); o.bAfter = MosbyTalk.step; const g = CharView.st.gnd; o.bGoal = !!(g && (g.goal || g.path)); await wait(3600); o.bLater = MosbyTalk.step; o.bTrip = tripTo(); o.bMeet = Mosby.MEET.on; }
    Explore.enter(far[0], far[1]); for (let i = 0; i < 5; i++) Explore.tick(1 / 30);
    // C: the pull-out map: send her to him, then pick some other place on the map -> the walk to him stops
    ExMap.open(); const lab = ExMap.labels().find((q) => q.k === 'mosby'); ExMap.tapAt(lab.x, lab.y); o.cTrip = tripTo(); ExMap.open(); ExMap.tapAt(far[0] - WS * 40, far[1] + WS * 30); await wait(3600); o.cLater = tripTo(); o.cMeet = Mosby.MEET.on; if (ExMap.close) ExMap.close();
    return o; });
  console.log(JSON.stringify(r));
  ok(r.aTrip === 'Mosby' && r.aMeet, 'from far away a tap on him sends her to him');
  ok(r.aGround && !r.aAfterMeet && r.aLater !== 'Mosby' && !r.aLaterMeet, `a tap on open ground drops the walk to him and it stays dropped 3.6 s later (trip: ${r.aLater})`);
  ok(r.onHit && r.bDlg === 'hello', 'beside him a tap on his body opens his dialogue');
  ok(r.groundHit === false, 'a tap on the grass away from him is not a hit on him');
  ok(!r.bAfter && !r.bLater && r.bTrip !== 'Mosby' && !r.bMeet, 'a tap elsewhere closes his dialogue and he is not re-selected (3.6 s later)');
  ok(r.bGoal, 'and that tap acts: she walks to the tapped spot');
  ok(r.cTrip === 'Mosby' && r.cLater !== 'Mosby' && !r.cMeet, `picking another place on the pull-out map stops the walk to him (trip: ${r.cLater})`);
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 2).join(' | '));
  console.log(fails ? fails + ' FAIL' : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);
})();

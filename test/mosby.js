// Mosby the transportation turtle: built, placed near the Ledge on dry clear ground, carries the player's current house, is a solid collider (she can't walk into him),
// breathes when idle and walks slowly with a diagonal gait; studio renders (SHOT=dir) at the concept angles + in game next to her
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html', SHOT = process.env.SHOT || '';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 1024, height: 576 }, deviceScaleFactor: 1 })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL); await p.waitForTimeout(1000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 200000 }).catch(() => {}); await p.waitForFunction(() => Explore.on, null, { timeout: 30000 }).catch(() => {});
  await p.waitForFunction(() => Mosby.MS.at && Mosby.MS.houseKey, null, { timeout: 60000 }).catch(() => {});
  const r1 = await p.evaluate(async () => { const M = Mosby.MS, WS = Explore.WS, F = Explore.ledgeFront(), d = Math.hypot(M.at.x - F.x, M.at.y - F.y) / WS; const bb = new THREE.Box3().setFromObject(M.g), H = (bb.max.y - bb.min.y) / WS;
    const hb = new THREE.Box3().setFromObject(M.houseSlot); const her = Explore.here(); const c = Explore.collide(M.at.x, M.at.y, WS * 0.4), push = Math.hypot(c[0] - M.at.x, c[1] - M.at.y) / WS;
    const wet = typeof isWet === 'function' && isWet(M.at.x, M.at.y, 0); const herH = (() => { const g = M3.st.overlay; if (!g) return 0; const b2 = new THREE.Box3().setFromObject(g.getObjectByName('exploreWren')); return (b2.max.y - b2.min.y) / WS; })();
    const shellTop = (Mosby.B.by + Mosby.B.ry) * Mosby.B.K, knee = Mosby.B.hipY * Mosby.B.K * 0.62; return { d: +d.toFixed(1), H: +H.toFixed(1), house: M.houseKey, houseH: +((hb.max.y - hb.min.y) / WS).toFixed(1), push: +push.toFixed(1), wet, herH: +herH.toFixed(2), shellTop: +shellTop.toFixed(1), knee: +knee.toFixed(2), names: JSON.stringify(Object.keys(Mosby)).toLowerCase() }; });
  console.log(JSON.stringify(r1)); ok(r1.d > 15 && r1.d < 80, `Mosby stands near the Ledge (${r1.d} m from the front door)`); ok(!r1.wet, 'on dry ground'); ok(r1.house && r1.houseH > 1.5, `carries the player's current house (${r1.house})`);
  ok(r1.push > 4, `solid: a body walked into his middle is pushed out ${r1.push} m`); ok(r1.H > 6 && r1.H < 12, `huge: ${r1.H} m tall with the house, shell top ${r1.shellTop} m`); ok(!/delver/.test(r1.names), 'no Made in Abyss names');
  // idle breathing + slow walk (diagonal pairs: FL with BR, FR with BL)
  const r2 = await p.evaluate(async () => { const M = Mosby.MS, s0 = []; for (let i = 0; i < 40; i++) { Mosby.tick(0.1); s0.push(M.shell.scale.y); } const breath = Math.max(...s0) - Math.min(...s0);
    Mosby.walk(true); const L = {}, at0 = { ...M.at }; const samp = []; let dmax = 0; for (let i = 0; i < 80; i++) { Mosby.tick(0.1); samp.push(M.legs.map((q) => q.foot.position.y - (q.rest != null ? q.rest + Mosby.B.leg + 0.05 : 0))); dmax = Math.max(dmax, M.dust.filter((d) => d.t < 1.4).length); } Mosby.walk(false);
    const lifted = samp.map((r) => r.map((y) => y > -Mosby.B.leg - 0.04)); const pairOK = lifted.every((r) => !(r[0] && r[1]) && !(r[2] && r[3])); const diag = lifted.filter((r) => r[0] && r[3]).length + lifted.filter((r) => r[1] && r[2]).length, any = lifted.filter((r) => r.some(Boolean)).length;
    return { t: M.t, st: M.st, s0: s0.slice(0, 3), breath: +breath.toFixed(4), pairOK, diag, any, dust: dmax }; });
  console.log(JSON.stringify(r2)); ok(r2.breath > 0.004, 'idle breathing moves the shell'); ok(r2.dust > 0, 'dust puffs at foot plants'); ok(r2.any > 3 && r2.pairOK && r2.diag >= r2.any * 0.6, 'slow walk: legs lift in diagonal pairs (FL+BR, FR+BL)');
  if (SHOT) { // studio renders at the concept angles: front 3/4, side, rear 3/4, elevated, top-down (white ground, a 1.75 m miner silhouette for scale)
    for (const [nm, az, el, dist] of [['front34', 0.75, 0.12, 25], ['side', 1.5708, 0.06, 26], ['rear34', 2.5, 0.16, 25], ['elevated', 0.75, 0.42, 25], ['topdown', 0.0, 1.5, 24], ['face', 0.5, 0.05, 9]]) {
      const url = await p.evaluate(async ([az, el, dist]) => { const M = Mosby.MS, G = M.g, par = G.parent, ps = G.position.clone(), sc = G.scale.x, ry = G.rotation.y; Mosby.hold(true);
        const R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); R.setSize(1024, 576); R.shadowMap.enabled = true; R.outputColorSpace = THREE.SRGBColorSpace; const S2 = new THREE.Scene(); S2.background = new THREE.Color(0xf6f1e6);
        S2.add(new THREE.HemisphereLight(0xfff6e8, 0x8a7a5a, 0.9)); const D = new THREE.DirectionalLight(0xfff0d8, 1.9); D.position.set(-8, 14, 10); D.castShadow = true; D.shadow.mapSize.set(2048, 2048); Object.assign(D.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10 }); S2.add(D);
        const gr = new THREE.Mesh(new THREE.CircleGeometry(9, 48), new THREE.MeshStandardMaterial({ color: 0xb59a6a, roughness: 1 })); gr.rotation.x = -Math.PI / 2; gr.receiveShadow = true; S2.add(gr);
        const man = new THREE.Group(), mm = new THREE.MeshStandardMaterial({ color: 0x6b4a2e }); man.add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 1.35, 12), mm)); man.children[0].position.y = 0.68; const hd = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), new THREE.MeshStandardMaterial({ color: 0xd8a27a })); hd.position.y = 1.55; man.add(hd); man.position.set(-1.6, 0, 7.8); man.traverse((o) => { o.castShadow = true; }); S2.add(man);
        S2.add(G); G.position.set(0, 0, 0); G.scale.setScalar(Mosby.B.K); G.rotation.y = 0; G.updateMatrixWorld(true);
        const cam = new THREE.PerspectiveCamera(30, 1024 / 576, 0.1, 200); const cy = dist < 12 ? 3.4 : 3.2; const tz = dist < 12 ? 5.5 : 0.6; cam.position.set(Math.sin(az) * Math.cos(el) * dist, cy + Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist); if (el > 1.4) cam.up.set(0, 0, -1); cam.position.z += dist < 12 ? tz : 0; cam.lookAt(0, el > 1.4 ? 0 : cy, tz);
        R.render(S2, cam); const u = R.domElement.toDataURL('image/jpeg', 0.9); R.dispose(); S2.remove(G); par.add(G); G.position.copy(ps); G.scale.setScalar(sc); G.rotation.y = ry; Mosby.hold(false); return u; }, [az, el, dist]);
      require('fs').writeFileSync(SHOT + '/mosby-' + nm + '.jpg', Buffer.from(url.split(',')[1], 'base64')); }
    // in game: her beside him in Character view
    await p.evaluate(async () => { const M = Mosby.MS, WS = Explore.WS, a = M.g.rotation.y, x = M.at.x + Math.sin(a + 0.5) * WS * 9.5, y = M.at.y + Math.cos(a + 0.5) * WS * 9.5; Mosby.hold(true); Explore.enter(x, y); await new Promise((r) => setTimeout(r, 2500)); });
    await p.screenshot({ path: SHOT + '/mosby-ingame.png' }); }
  ok(!errs.length, 'no page errors ' + errs.slice(0, 3).join(' | '));
  console.log(fails ? fails + ' FAIL' : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);
})();

// Tether Mill (Art's stations/roller_mill handoff, Dominic: "exactly right ... I want it huge"): the open-air water mill at the stream bend above the west lake.
// Checks: site + 3x scale (36 m wheel, 4 roll stands 18 m apart, spool), the straight mill race carrying the whole stream, the ~36 m drop at the ledge lip
// tailrace back into the same stream; the floor is flat, dry and reachable on foot; the works are solid; gear directions (wheel CW, top roll CCW, bottom CW, spool CW
// from the front) and speed ratios agree; the bar thins stand to stand; the look-at chip shows near the mill; tris / draw calls at the mill view.
// SHOT=1 also renders Brannick in front of the mill, a close 3/4 and a map-zoom view to /tmp/tethermill-*.png, and the pull-out map round the mill to /tmp/tethermill-map.png.
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html', SHOT = process.env.SHOT || '';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL + '?t=' + Date.now(), { timeout: 90000, waitUntil: 'commit' }); await p.waitForTimeout(1000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 240000 }).catch(() => {}); await p.waitForFunction(() => Explore.on, null, { timeout: 90000 }).catch(() => {});
  await p.evaluate(async () => { for (let i = 0; i < 120 && M3.models !== 'ready'; i++) await new Promise((r) => setTimeout(r, 1000)); await new Promise((r) => setTimeout(r, 1500)); });
  const R = await p.evaluate(async () => { const o = {}, WS = Explore.WS, F = MILL.F, L = MILL.L; o.site = F && [Math.round(F.ox), Math.round(F.oy)]; o.mapPx = F && [Math.round(F.ox / 16.05 + 744.5), Math.round(F.oy / 16.05 + 715.4)]; o.built = !!(MILL.M.grp && MILL.M.grp.parent);
    const S = GRAND.streamLines()[1], lv = S.millLv; o.drop = lv && (lv.Hw - lv.Hp) / WS; o.hid = S.hid ? S.hid.filter(Boolean).length : 0; o.steps = lv ? lv.stp.map(({ i }) => +((S.wl[i] - S.wl[i + 1]) / WS).toFixed(2)) : [];
    let mono = true; for (let i = 1; i < S.wl.length; i++) if (S.wl[i] > S.wl[i - 1] + 0.01) mono = false; o.mono = mono; o.toLake = S.l1;
    const hs = [], wet = []; for (let s = -6; s <= 28; s += 2) for (let d = 8.5; d <= 12; d += 1.5) { const [x, y] = MILL.wld(s, d); hs.push(M3.heightAt(x, y)[0]); if (GRAND.wet(x, y, 0)) wet.push([s, d]); } o.flat = (Math.max(...hs) - Math.min(...hs)) / WS; o.wet = wet.length;
    const [px, py] = MILL.wld(10, 10), k = Explore.reach(px, py); o.reach = Math.hypot(k[0] - px, k[1] - py) / WS; Explore.enter(k[0], k[1]); for (let i = 0; i < 10; i++) Explore.tick(1 / 30);
    const far = MILL.wld(40, 26), P = Explore.goTo(...Explore.reach(far[0], far[1])); o.walk = !!P; if (P) { let n = 0; while (n++ < 4000) { Explore.tick(1 / 30); const h = Explore.here(); if (Math.hypot(h[0] - P.pts[P.pts.length - 1][0], h[1] - P.pts[P.pts.length - 1][1]) < WS * 2) break; } o.walked = n; }
    Explore.enter(k[0], k[1]); for (let i = 0; i < 10; i++) Explore.tick(1 / 30);
    o.solids = (MILL.M.solids || []).length; const st0 = MILL.wld(L.stands[1], L.stZ); o.solidAtStand = !!(MILL.M.solids && MILL.M.solids.some((c) => Math.hypot(c.x - st0[0], c.y - st0[1]) < c.r));
    const SP = MILL.SP; o.sp = { wheelRpm: +(SP.wheel * 60 / 6.2832).toFixed(1), shaft: +SP.shaft.toFixed(2), om: SP.om.slice(1).map((v) => +v.toFixed(2)), v: SP.v.map((v) => +v.toFixed(2)), stub: SP.stubR.slice(1).map((v) => +v.toFixed(2)), spool: +SP.spool.toFixed(2) };
    o.ratio = Math.abs(SP.pin / SP.wheel - 40 / 11) < 1e-6 && SP.stubR.slice(1).every((r, i) => Math.abs(SP.shaft * r - SP.om[i + 1] * SP.rS) < 1e-6) && Math.abs(SP.spool * 1.5 - SP.v[4]) < 1e-6;
    const M = MILL.M; M3.render(0, CityMap.cam); await new Promise((r) => setTimeout(r, 300)); MILL.anim(0, 0); const w0 = M.wheel.rotation.z, s0 = M.spoolG.rotation.z, m0 = new THREE.Matrix4(), m1 = new THREE.Matrix4(); M.rolls.getMatrixAt(0, m0); const e0 = new THREE.Euler().setFromRotationMatrix(m0); M.rolls.getMatrixAt(1, m1); const f0 = new THREE.Euler().setFromRotationMatrix(m1);
    await new Promise((r) => setTimeout(r, 300)); MILL.anim(0, 0); M.rolls.getMatrixAt(0, m0); M.rolls.getMatrixAt(1, m1); const e1 = new THREE.Euler().setFromRotationMatrix(m0), f1 = new THREE.Euler().setFromRotationMatrix(m1);
    const dA = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a)); o.dir = { wheel: Math.sign(M.wheel.rotation.z - w0), spool: Math.sign(M.spoolG.rotation.z - s0), top: Math.sign(dA(e0.z, e1.z)), bot: Math.sign(dA(f0.z, f1.z)) };
    o.thin = MILL.T.every((t, i) => !i || t < MILL.T[i - 1]); const Kx = MILL.K; o.scale = { K: Kx, wheel: L.wheel.R * 2 * Kx, wheelW: L.wheel.W * Kx, streamW: +(GRAND.streamLines()[1].w * 2 / WS).toFixed(1), pitch: L.stands[1] * Kx - L.stands[0] * Kx, stands: L.stands.length, standH: +(4.6 * Kx).toFixed(1), roll: L.rollR * 2 * Kx, rollW: 2.5 * Kx, spool: 4 * Kx, foot: +((L.spool + 2 - (L.lip - 3)) * Kx).toFixed(1), deep: +((L.pad[3] - L.pitD[0]) * Kx).toFixed(1) };
    await new Promise((r) => setTimeout(r, 600)); MILL.anim(0, 0); o.chip = !!document.querySelector('#millChip.on');
    return o; });
  console.log(JSON.stringify(R));
  ok(R.built && R.site, `the mill is built at world ${R.site} (map px ${R.mapPx})`);
  ok(R.drop > 33 && R.drop < 40, `the stream drops ${R.drop && R.drop.toFixed(1)} m at the ledge lip onto the wheel`);
  ok(R.steps.length >= 2 && R.steps.every((x) => x >= 0 && x < 13.5), `small steps upstream: ${R.steps.join(' / ')} m`);
  ok(R.mono && R.toLake >= 0 && R.hid > 0, 'the stream only ever runs downhill and the tailrace runs on into the same lake');
  ok(R.flat < 0.6 && R.wet === 0, `the mill floor is flat (${R.flat && R.flat.toFixed(2)} m spread) and dry (${R.wet} wet samples)`);
  ok(R.reach < 3 && R.walk && R.walked < 4000, `the floor is reachable and she walks off it (${R.walked} ticks)`);
  ok(R.solids > 10 && R.solidAtStand, `the works are solid (${R.solids} colliders)`);
  ok(R.dir.wheel < 0 && R.dir.top > 0 && R.dir.bot < 0 && R.dir.spool < 0, `front view: wheel CW, top roll CCW, bottom roll CW, spool CW (${JSON.stringify(R.dir)})`);
  ok(R.ratio, 'one chain of ratios: pit gear 40:11 pinion, each stand sprocket sized to its roll speed, the spool to the braid speed');
  ok(R.thin, 'the bar is thinner after every stand');
  ok(R.scale.wheel >= 34 && R.scale.wheelW >= Math.max(8.5, R.scale.streamW) && R.scale.foot > 95, `3x scale: wheel ${R.scale.wheel} x ${R.scale.wheelW} m (stream ${R.scale.streamW} m wide, all of it over the wheel), rolls ${R.scale.roll} x ${R.scale.rollW} m, spool ${R.scale.spool} m, footprint ${R.scale.foot} x ${R.scale.deep} m`);
  ok(R.chip, 'the Tether Mill chip shows near the mill');
  // Brannick (Art's NPC kit, hammer on his shoulder) keeps the mill: on the apron in front, facing the approach, solid, not in the village; tap -> the Tether Mill card
  await p.waitForFunction(() => { MILL.anim(0, 0); return !!MILL.BR.k; }, null, { timeout: 90000, polling: 500 });
  const K = await p.evaluate(async () => { const B = MILL.BR, k = B.k, [s, d] = MILL.loc(B.x, B.y), [fx, fy] = MILL.wld(-1.5, 5.9), [ox, oy] = MILL.wld(-1.5, 9.6), yaw = k.baseYaw != null ? k.baseYaw : k.root.rotation.y, f = [Math.sin(yaw), Math.cos(yaw)], u = [fx - ox, fy - oy], ul = Math.hypot(u[0], u[1]);
    const o = { at: [+s.toFixed(1), +d.toFixed(1)], floor: +((k.root.position.y - 130) / MILL.WS).toFixed(2), kpy: MILL.KP.y, ground: +((M3.heightAt(B.x, B.y)[0] - 130) / MILL.WS).toFixed(2), solid: !!Explore.solidAt(B.x, B.y), facing: +((f[0] * u[0] + f[1] * u[1]) / ul).toFixed(2), kit: k.root.name, h: +(B.hgt / MILL.WS).toFixed(2),
      town: typeof Town !== 'undefined' && Town.BLD ? Town.BLD.some((b) => b.npc === 'brannick') : false, label: ExMap.labels().some((L) => L.k === 'mill' && /Tether Mill/.test(L.t)) };
    o.icon = await fetch('assets/ui/icons/map_tether_mill.webp').then((r) => r.ok).catch(() => false);
    const [wx, wy] = MILL.wld(-1.5, 9.6 + 9 / MILL.K), q = Explore.reach(wx, wy); Explore.enter(q[0], q[1]); const E = Explore.EX; E.az = Math.atan2(wx - ox, wy - oy); for (let i = 0; i < 40; i++) Explore.tick(1 / 30); MILL.close(); MILL.anim(0, 0); M3.render(0, CityMap.cam); await new Promise((r) => setTimeout(r, 300)); MILL.anim(0, 0);
    const a = M3.project(B.x, B.y, B.hgt * 0.6); o.tapAt = a.map(Math.round); o.tap = Explore.tap(a[0], a[1]); for (let i = 0; i < 1500 && B.walking; i++) Explore.tick(1 / 30); await new Promise((r) => setTimeout(r, 300));
    const bub = document.getElementById('millBub'); o.card = !!bub && !bub.classList.contains('hidden') && /Brannick/.test(bub.textContent) && /Tether Mill/.test(bub.textContent); o.walked = !B.walking; return o; });
  console.log('KEEPER ' + JSON.stringify(K));
  ok(K.kit === 'millKeeper' && Math.abs(K.at[0] + 1.5) < 0.3 && Math.abs(K.at[1] - 9.6) < 0.3 && Math.abs(K.floor - K.kpy) < 0.05, `Brannick (NPC kit, ${K.h} m) stands on Art's flag in the apron bay at s ${K.at[0]}, d ${K.at[1]} (feet ${K.floor} m, ground ${K.ground} m)`);
  ok(K.facing > 0.9 && !K.solid, `he faces the works toward (-1.5, 5.9) (${K.facing}), feed table on his left, stand 1 on his right; no solid on the pad`);
  ok(!K.town, 'he is no longer spawned in the village');
  ok(K.tap === 'npc' && K.walked && K.card, `tapping him walks her up and opens the Tether Mill card with his intro (tap ${K.tap})`);
  ok(K.label && K.icon, 'the Tether Mill has its label and map icon on the map');
  const perf = await p.evaluate(async () => { const out = {}, r = M3.renderer, g = MILL.M.grp; const V = (x, y, z) => g.localToWorld(new THREE.Vector3(x, y, z));
    const view = (P, Lk) => { M3.st.camOv = { P, L: Lk, near: 1.5, far: 40000 }; MILL.anim(0, 0); r.info.autoReset = false; r.info.reset(); M3.render(0, CityMap.cam); const i = { tris: r.info.render.triangles, calls: r.info.render.calls }; r.info.autoReset = true; return i; };
    out.parts = MILL.M.grp.children.map((m) => [m.isInstancedMesh ? 'I' + m.count : m.type[0], m.geometry ? Math.round((m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3) : 0]);
    out.close = view(V(-14, 12, 30), V(9, 3, 3)); out.map = view(V(10, 300, 53), V(10, 0, 0)); g.visible = false; out.closeNoMill = view(V(-14, 12, 30), V(9, 3, 3)); g.visible = true; M3.st.camOv = null; return out; });
  console.log('PERF ' + JSON.stringify(perf));
  if (SHOT) { // each view: resize the 3D canvas to 1280x720, place the camera, render once and read the canvas in the same task
    await p.evaluate(async () => { MILL.close(); const [x, y] = MILL.wld(-1.5 + 3 / MILL.K, 9.6 + 1.5 / MILL.K), k = Explore.reach(x, y); Explore.enter(k[0], k[1]); for (let i = 0; i < 20; i++) Explore.tick(1 / 30); });
    const out = await p.evaluate(async () => { const g = MILL.M.grp, V = (x, y, z) => g.localToWorld(new THREE.Vector3(x, y, z)), L = MILL.L, res = []; Explore.EX.on = false;
      const views = [[V(-1.5 + 8 / MILL.K, 2.4 / MILL.K, 9.6 + 10 / MILL.K), V(-1.5 - 3 / MILL.K, 4 / MILL.K, 9.6 - 4 / MILL.K)], [V(-12, 9, 22), V(8.5, 3.2, 3)], [V(10, 210, 120), V(10, 0, 0)]];
      for (let i = 0; i < 3; i++) { M3.resize(1280, 720, 1); M3.st.camOv = { P: views[i][0], L: views[i][1], near: 1.5, far: 40000 }; MILL.anim(0, 0); M3.render(0, CityMap.cam); await new Promise((r) => setTimeout(r, 200)); MILL.anim(0, 0); M3.resize(1280, 720, 1); M3.st.camOv = { P: views[i][0], L: views[i][1], near: 1.5, far: 40000 }; M3.render(0, CityMap.cam);
        const url = M3.renderer.domElement.toDataURL('image/png'), cam = M3.camera, pr = (x, y, z) => { const v = g.localToWorld(new THREE.Vector3(x, y, z)).project(cam); return [(v.x + 1) / 2 * 1280, (1 - v.y) / 2 * 720]; };
        const marks = 1 ? null : { stands: L.stands.map((x, k) => { const yt = L.nip + [0.24, 0.15, 0.09, 0.1][k] + L.rollR, yb = L.nip - L.rollR; return [pr(x, yt, L.stZ + 1.6), pr(x, yb, L.stZ + 1.6), pr(x + 0.75, yt, L.stZ + 1.6)]; }), wheel: [pr(0, L.wheel.y, L.wheel.z + 1.6), pr(L.wheel.R, L.wheel.y, L.wheel.z + 1.6)], spool: [pr(L.spool, 2.5, L.stZ + 1.6), pr(L.spool + 2, 2.5, L.stZ + 1.6)] };
        res.push([url, marks, M3.st.tris, M3.st.calls]); }
      M3.st.camOv = null; Explore.EX.on = true; M3.resize(innerWidth, innerHeight, devicePixelRatio); return res; });
    const mapUrl = await p.evaluate(async () => { ExMap.open(); const v = ExMap.st.view, [x, y] = MILL.wld(10, 6); v.cx = x; v.cy = y; v.s *= 5; for (let i = 0; i < 20; i++) { ExMap.draw(); await new Promise((r) => setTimeout(r, 150)); } const u = ExMap.st.cv.toDataURL('image/png'); ExMap.close(); return u; });
    require('fs').writeFileSync('/tmp/tethermill-map.png', Buffer.from(mapUrl.split(',')[1], 'base64'));
    const fs = require('fs'); out.forEach(([url, marks, tris, calls], i) => { fs.writeFileSync(`/tmp/tethermill-${i}.png`, Buffer.from(url.split(',')[1], 'base64')); out[i] = [`/tmp/tethermill-${i}.png`, marks, tris, calls]; });
    fs.writeFileSync('/tmp/tethermill-marks.json', JSON.stringify(out)); console.log('SHOTS ' + JSON.stringify(out.map((q) => [q[0], q[2], q[3]])));
  }
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close(); console.log(fails ? `${fails} FAILED` : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();

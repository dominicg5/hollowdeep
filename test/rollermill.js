// Roller Mill (Art's stations/roller_mill handoff, Dominic: "exactly right ... I want it huge"): the open-air water mill at the stream bend above the west lake.
// Checks: site + scale (12 m wheel, 4 roll stands 6 m apart, spool), the stream's level drop at the ledge lip (~12 m onto the wheel) with small steps upstream and the
// tailrace back into the same stream; the floor is flat, dry and reachable on foot; the works are solid; gear directions (wheel CW, top roll CCW, bottom CW, spool CW
// from the front) and speed ratios agree; the bar thins stand to stand; the look-at chip shows near the mill; tris / draw calls at the mill view.
// SHOT=1 also renders the 3 views for the sheet (close 3/4, front with roll directions, map zoom) to /tmp/rollermill-*.png.
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
    o.thin = MILL.T.every((t, i) => !i || t < MILL.T[i - 1]); o.scale = { wheel: L.wheel.R * 2, wheelW: L.wheel.W, pitch: L.stands[1] - L.stands[0], stands: L.stands.length, roll: L.rollR * 2, foot: +(L.spool + 2 - (L.lip - 3)).toFixed(1) };
    await new Promise((r) => setTimeout(r, 600)); MILL.anim(0, 0); o.chip = !!document.querySelector('#millChip.on');
    return o; });
  console.log(JSON.stringify(R));
  ok(R.built && R.site, `the mill is built at world ${R.site} (map px ${R.mapPx})`);
  ok(R.drop > 11.5 && R.drop < 13.5, `the stream drops ${R.drop && R.drop.toFixed(1)} m at the ledge lip onto the wheel`);
  ok(R.steps.length >= 2 && R.steps.every((x) => x >= 0 && x < 4.5), `small steps upstream: ${R.steps.join(' / ')} m`);
  ok(R.mono && R.toLake >= 0 && R.hid > 0, 'the stream only ever runs downhill and the tailrace runs on into the same lake');
  ok(R.flat < 0.6 && R.wet === 0, `the mill floor is flat (${R.flat && R.flat.toFixed(2)} m spread) and dry (${R.wet} wet samples)`);
  ok(R.reach < 3 && R.walk && R.walked < 4000, `the floor is reachable and she walks off it (${R.walked} ticks)`);
  ok(R.solids > 10 && R.solidAtStand, `the works are solid (${R.solids} colliders)`);
  ok(R.dir.wheel < 0 && R.dir.top > 0 && R.dir.bot < 0 && R.dir.spool < 0, `front view: wheel CW, top roll CCW, bottom roll CW, spool CW (${JSON.stringify(R.dir)})`);
  ok(R.ratio, 'one chain of ratios: pit gear 40:11 pinion, each stand sprocket sized to its roll speed, the spool to the braid speed');
  ok(R.thin, 'the bar is thinner after every stand');
  ok(R.chip, 'the Roller Mill chip shows near the mill');
  const perf = await p.evaluate(async () => { const out = {}, r = M3.renderer, g = MILL.M.grp; const V = (x, y, z) => g.localToWorld(new THREE.Vector3(x, y, z));
    const view = (P, Lk) => { M3.st.camOv = { P, L: Lk, near: 1.5, far: 40000 }; MILL.anim(0, 0); r.info.autoReset = false; r.info.reset(); M3.render(0, CityMap.cam); const i = { tris: r.info.render.triangles, calls: r.info.render.calls }; r.info.autoReset = true; return i; };
    out.parts = MILL.M.grp.children.map((m) => [m.isInstancedMesh ? 'I' + m.count : m.type[0], m.geometry ? Math.round((m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3) : 0]);
    out.close = view(V(-14, 12, 30), V(9, 3, 3)); out.map = view(V(10, 900, 160), V(10, 0, 0)); g.visible = false; out.closeNoMill = view(V(-14, 12, 30), V(9, 3, 3)); g.visible = true; M3.st.camOv = null; return out; });
  console.log('PERF ' + JSON.stringify(perf));
  if (SHOT) { // each view: resize the 3D canvas to 1280x720, place the camera, render once and read the canvas in the same task
    await p.evaluate(async () => { const [x, y] = MILL.wld(-2.5, 9.6), k = Explore.reach(x, y); Explore.enter(k[0], k[1]); for (let i = 0; i < 20; i++) Explore.tick(1 / 30); });
    const out = await p.evaluate(async () => { const g = MILL.M.grp, V = (x, y, z) => g.localToWorld(new THREE.Vector3(x, y, z)), L = MILL.L, res = []; Explore.EX.on = false;
      const views = [[V(-12, 9, 22), V(8.5, 3.2, 3)], [V(10.5, 4.5, 38), V(10.5, 4, 0)], [V(10, 210, 120), V(10, 0, 0)]];
      for (let i = 0; i < 3; i++) { M3.resize(1280, 720, 1); M3.st.camOv = { P: views[i][0], L: views[i][1], near: 1.5, far: 40000 }; MILL.anim(0, 0); M3.render(0, CityMap.cam); await new Promise((r) => setTimeout(r, 200)); MILL.anim(0, 0); M3.resize(1280, 720, 1); M3.st.camOv = { P: views[i][0], L: views[i][1], near: 1.5, far: 40000 }; M3.render(0, CityMap.cam);
        const url = M3.renderer.domElement.toDataURL('image/png'), cam = M3.camera, pr = (x, y, z) => { const v = g.localToWorld(new THREE.Vector3(x, y, z)).project(cam); return [(v.x + 1) / 2 * 1280, (1 - v.y) / 2 * 720]; };
        const marks = i !== 1 ? null : { stands: L.stands.map((x, k) => { const yt = L.nip + [0.24, 0.15, 0.09, 0.1][k] + L.rollR, yb = L.nip - L.rollR; return [pr(x, yt, L.stZ + 1.6), pr(x, yb, L.stZ + 1.6), pr(x + 0.75, yt, L.stZ + 1.6)]; }), wheel: [pr(0, L.wheel.y, L.wheel.z + 1.6), pr(L.wheel.R, L.wheel.y, L.wheel.z + 1.6)], spool: [pr(L.spool, 2.5, L.stZ + 1.6), pr(L.spool + 2, 2.5, L.stZ + 1.6)] };
        res.push([url, marks, M3.st.tris, M3.st.calls]); }
      M3.st.camOv = null; Explore.EX.on = true; M3.resize(innerWidth, innerHeight, devicePixelRatio); return res; });
    const fs = require('fs'); out.forEach(([url, marks, tris, calls], i) => { fs.writeFileSync(`/tmp/rollermill-${i}.png`, Buffer.from(url.split(',')[1], 'base64')); out[i] = [`/tmp/rollermill-${i}.png`, marks, tris, calls]; });
    fs.writeFileSync('/tmp/rollermill-marks.json', JSON.stringify(out)); console.log('SHOTS ' + JSON.stringify(out.map((q) => [q[0], q[2], q[3]])));
  }
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close(); console.log(fails ? `${fails} FAILED` : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();

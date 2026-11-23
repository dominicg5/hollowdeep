// Lumenite pickaxe tiers (Dominic; Mia's lumenite_pick_tiers sheet): T0 is today's pick unchanged; only the crystal head (shards, core gems), its glow and light take the
// tier colour (handle / wrap / cyan binding identical at every tier); glints grow +8 per tier and get brighter + faster; T10 pulses and adds teal sparks; icon tint like Ember Onyx.
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL + '?t=' + Date.now(), { timeout: 90000, waitUntil: 'commit' }); await p.waitForFunction(() => typeof CharView !== 'undefined' && CharView.makePickaxe && typeof Craft !== 'undefined', null, { timeout: 120000 });
  const R = await p.evaluate(() => { const info = (t) => { const px = CharView.makePickaxe('lumen', t), mats = [], pts = []; px.traverse((o) => { if (o.isPoints) pts.push([o.geometry.attributes.position.count, o.material.uniforms && o.material.uniforms.uCol ? o.material.uniforms.uCol.value.getHexString() : '?']); else if (o.isMesh) { const m = Array.isArray(o.material) ? o.material[0] : o.material; mats.push(m && m.color ? m.color.getHexString() + (m.emissive ? '/' + m.emissive.getHexString() : '') : (m ? m.type : '-')); } });
      return { mats, pts, fl: px.userData.fl || 1, pulse: !!px.userData.pulse, glowMap: px.userData.glow.material.map.uuid, light: px.userData.light.color.getHexString(), tierCol: px.userData.tierCol }; };
    const A = Array.from({ length: 11 }, (_, t) => info(t)); S.pickGrade = 'bronze'; const plain = info(undefined);
    const f = Array.from({ length: 11 }, (_, t) => Craft.onyxFilter(t, 'lumen')), ic = Craft.tintIco('<svg class="cxsv" viewBox="0 0 48 48"></svg>', 7, 'lumen'), on5 = Craft.onyxFilter(5);
    return { A, plain, f, ic, on5, onyx0: Craft.onyxFilter(5) === Craft.onyxFilter(5, 'onyx') }; });
  const A = R.A, T0 = A[0], H = new Set(['8ff6ff/1d93ad', 'bffcff']);
  ok(JSON.stringify(R.plain.mats) === JSON.stringify(T0.mats) && JSON.stringify(R.plain.pts) === JSON.stringify(T0.pts) && R.plain.light === T0.light, 'unequipped Lumenite = T0 build');
  ok(T0.pts.length === 1 && T0.pts[0][0] === 40 && T0.pts[0][1] === '7ff4ff' && T0.fl === 1 && !T0.pulse && T0.light === '7ff4ff' && T0.mats.includes('8ff6ff/1d93ad'), 'T0 = today (40 glints, #7ff4ff, original crystal colours) ' + JSON.stringify(T0.pts));
  let onlyHead = true; for (let t = 1; t <= 10; t++) A[t].mats.forEach((m, i) => { if (m !== T0.mats[i] && !H.has(T0.mats[i])) onlyHead = false; }); ok(onlyHead && A.every((a) => a.mats.length === T0.mats.length), 'only the crystal head recolours (handle, wrap, binding identical at every tier)');
  ok(A.slice(1).every((a) => a.mats.filter((m) => !T0.mats.includes(m)).length > 0 && a.glowMap !== T0.glowMap), 'T1..T10 crystal + glow take the tier colour');
  ok(A.every((a, t) => a.pts[0][0] === 40 + 8 * t) && A.every((a, t) => !t || a.fl > A[t - 1].fl), 'glints +8 per tier, faster each tier: ' + A.map((a) => a.pts[0][0] + '@' + a.fl.toFixed(2)).join(' '));
  ok(A[10].pulse && A[10].pts.length === 2 && A[10].pts[1][0] === 24 && A[10].pts[1][1] === '2fe8d8' && A.slice(0, 10).every((a) => !a.pulse && a.pts.length === 1), 'T10 only: pulse + 24 teal sparks; light ' + A[10].light + ' / T7 ' + A[7].light);
  ok(R.f[0] === '' && R.f.slice(1).every((x) => /hue-rotate/.test(x)) && /filter:hue-rotate/.test(R.ic) && /data-tier="7"/.test(R.ic) && R.onyx0, 'icon tint: T0 none, T1+ filtered, Onyx unchanged; T10 ' + R.f[10]);
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  console.log(fails ? `${fails} FAILED` : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);
})();

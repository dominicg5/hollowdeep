// Lumenite pickaxe tiers (Dominic; Mia's lumenite_pick_tiers sheet): T0 is today's pick unchanged; only the crystal head (shards, core gems), its glow and light take the
// tier colour (handle / wrap / cyan binding identical at every tier); glints grow +8 per tier and get brighter + faster; T10 pulses and adds teal sparks; icons: Art's painted T1..T10 cells (10x1 sheet, lazy), T0 the atlas cell, no CSS tint.
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
    const lazy = !performance.getEntriesByType('resource').some((e) => /items_lumen_tiers/.test(e.name)), box = document.createElement('div'); box.style.cssText = 'position:fixed;left:0;top:0;width:48px'; document.body.appendChild(box);
    const cell = (id) => { box.innerHTML = itemIco(id); const e = box.firstChild, cs = getComputedStyle(e); return [e.className, cs.backgroundImage.replace(/.*\/(\w+)\.webp.*/, '$1'), cs.backgroundPosition, cs.backgroundSize, cs.filter]; };
    const ic = Array.from({ length: 11 }, (_, t) => cell('tool:pick_lumen@t' + t)), t0 = cell('tool:pick_lumen');
    return { A, plain, ic, t0, lazy, noLF: !Craft.lumenFilter, on5: Craft.onyxFilter(5) }; });
  await p.waitForTimeout(1500); const sheet = await p.evaluate(() => { const e = performance.getEntriesByType('resource').filter((q) => /items_lumen_tiers/.test(q.name)); return [e.length, e[0] && e[0].decodedBodySize]; });
  const A = R.A, T0 = A[0], H = new Set(['8ff6ff/1d93ad', 'bffcff']);
  ok(JSON.stringify(R.plain.mats) === JSON.stringify(T0.mats) && JSON.stringify(R.plain.pts) === JSON.stringify(T0.pts) && R.plain.light === T0.light, 'unequipped Lumenite = T0 build');
  ok(T0.pts.length === 1 && T0.pts[0][0] === 40 && T0.pts[0][1] === '7ff4ff' && T0.fl === 1 && !T0.pulse && T0.light === '7ff4ff' && T0.mats.includes('8ff6ff/1d93ad'), 'T0 = today (40 glints, #7ff4ff, original crystal colours) ' + JSON.stringify(T0.pts));
  let onlyHead = true; for (let t = 1; t <= 10; t++) A[t].mats.forEach((m, i) => { if (m !== T0.mats[i] && !H.has(T0.mats[i])) onlyHead = false; }); ok(onlyHead && A.every((a) => a.mats.length === T0.mats.length), 'only the crystal head recolours (handle, wrap, binding identical at every tier)');
  ok(A.slice(1).every((a) => a.mats.filter((m) => !T0.mats.includes(m)).length > 0 && a.glowMap !== T0.glowMap), 'T1..T10 crystal + glow take the tier colour');
  ok(A.every((a, t) => a.pts[0][0] === 40 + 8 * t) && A.every((a, t) => !t || a.fl > A[t - 1].fl), 'glints +8 per tier, faster each tier: ' + A.map((a) => a.pts[0][0] + '@' + a.fl.toFixed(2)).join(' '));
  ok(A[10].pulse && A[10].pts.length === 2 && A[10].pts[1][0] === 24 && A[10].pts[1][1] === '2fe8d8' && A.slice(0, 10).every((a) => !a.pulse && a.pts.length === 1), 'T10 only: pulse + 24 teal sparks; light ' + A[10].light + ' / T7 ' + A[7].light);
  ok(JSON.stringify(R.ic[0]) === JSON.stringify(R.t0) && R.t0[1] === 'items' && /^0%/.test(R.t0[2]), 'T0 icon = the atlas cell (tool:pick_lumen) ' + R.t0[2]);
  ok(R.ic.slice(1).every((c, i) => /cxlt/.test(c[0]) && c[1] === 'items_lumen_tiers' && c[3] === '1000% 100%' && c[4] === 'none' && Math.abs(parseFloat(c[2]) - i * 100 / 9) < 0.01), 'T1..T10 = Art\'s painted cells, no tint: ' + R.ic.slice(1).map((c) => c[2].split(' ')[0]).join(' '));
  ok(R.lazy && sheet[0] === 1 && R.noLF && /hue-rotate/.test(R.on5), 'tier sheet fetched once, only when shown (' + sheet[1] + ' B); lumenFilter gone; Ember Onyx tint unchanged');
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  console.log(fails ? `${fails} FAILED` : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);
})();

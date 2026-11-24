// (Dominic via Art, sword job) swords in the Character screen: every grade + tier in either hand (dual wield), a natural fist grip, Attack plays
// 4 kinds of swing (cycling per press; the off hand follows with its own cut), and closing the screen releases every geometry / texture it uploaded.
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL + '?t=' + Date.now(), { timeout: 90000, waitUntil: 'commit' }); await p.waitForTimeout(3000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st && M3.st.ok, null, { timeout: 240000 }).catch(() => {}); await p.waitForFunction(() => Explore.on && CharView.st.gnd, null, { timeout: 120000 }).catch(() => {});
  await p.waitForTimeout(2500);
  await p.evaluate(() => { const R = CharView.renderer; window.__W = { rig: CharView.rig, mem0: R ? [R.info.memory.geometries, R.info.memory.textures] : [0, 0] }; });
  await p.evaluate(() => setTab('char')); await p.waitForTimeout(1500);
  const tap = (sel) => p.evaluate((sel) => { const e = document.querySelector(sel); if (!e || e.disabled) return false; e.click(); return true; }, sel);
  await tap('#pvBtn'); await p.waitForTimeout(150); await tap('#pvPanel [data-pvk="sword"]'); await p.waitForTimeout(150);
  const A = await p.evaluate(() => ({ g: document.querySelectorAll('#pvPanel [data-swg]').length, t: document.querySelectorAll('#pvPanel [data-swt]').length, h: document.querySelectorAll('#pvPanel [data-swh]').length, ico: document.querySelector('#pvPanel .ic').innerHTML, ico10: itemIco('tool:sword_onyx@t10'), btn: document.getElementById('pvBtn').textContent }));
  ok(A.g === 9 && A.t === 11 && A.h === 2 && /items_bronze_sword_tiers/.test(A.ico) && /items_onyx_sword_tiers/.test(A.ico10) && /--ix:10/.test(A.ico10), 'sword viewer: 9 kinds, T0-T10, Left / Right hand buttons, painted sword icons ' + JSON.stringify(A));
  // every grade in the right hand at a tier (3D tier look + icon cell)
  const seen = [];
  for (const [g, t] of [['bronze', 0], ['iron', 3], ['steel', 10], ['gold', 5], ['mithril', 7], ['rune', 10], ['lumen', 10], ['onyx', 10], ['stick', 0]]) {
    await tap(`#pvPanel [data-swg="${g}"]`); if (g !== 'stick') await tap(`#pvPanel [data-swt="${t}"]`); await tap('#pvPanel [data-swh="R"]'); await p.waitForTimeout(120);
    seen.push(await p.evaluate(([g, t]) => { const sw = CharView.rig.built.swords && CharView.rig.built.swords.R, u = sw ? sw.userData : {}, ic = document.querySelector('#pvPanel .ic').innerHTML, pts = []; if (sw) sw.traverse((o) => { if (o.isPoints) pts.push(o.geometry.attributes.position.count); });
      return { g, t, grade: u.grade, tier: u.tier, onyxT: u.onyxT, pulse: !!u.pulse, inR: !!sw && sw.parent === CharView.rig.B.hdR, pts, ix: (ic.match(/--ix:(\d+)/) || [])[1], hdr: document.querySelector('#pvPanel .pvh b').textContent }; }, [g, t])); }
  ok(seen.every((q) => q.grade === q.g && q.inR && (q.g === 'stick' || (q.tier === q.t && q.ix === String(q.t)))), 'every grade + tier in her right hand: ' + seen.map((q) => q.hdr.split('Left')[0] + (q.pts.length ? ' pts' + JSON.stringify(q.pts) : '')).join(' | '));
  const S1 = (g) => seen.find((q) => q.g === g);
  ok(S1('onyx').onyxT === 10 && S1('lumen').pulse && S1('lumen').pts.length === 2 && S1('rune').pts.length === 1 && S1('steel').pts.length === 1 && S1('bronze').pts.length === 0, 'tier effects: Onyx T10 flames + sparks, Lumen T10 pulse + glints + teal sparks, Rune / Steel T10 sparkles, Bronze T0 plain');
  const L = await p.evaluate(() => { const m = (g) => { const s = CharView.makeSword(g, 0), y = new THREE.Box3().setFromObject(s).max.y; s.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); return y; }, y0 = 0.062; return { onyx: m('onyx') - y0, bronze: m('bronze') - y0, rune: m('rune') - y0 }; });
  ok(Math.abs(L.onyx / L.rune - 1.25) < 0.06, 'Ember Onyx blade is 1.25x the others ' + JSON.stringify(L));
  // dual wield: gold T5 in the left hand too; once the pickaxe is on her back both fists close on the grips, blades up in guard
  await tap('#pvPanel [data-swg="gold"]'); await tap('#pvPanel [data-swt="5"]'); await tap('#pvPanel [data-swh="L"]'); await tap('#pvPanel [data-swg="steel"]'); await tap('#pvPanel [data-swt="10"]'); await tap('#pvPanel [data-swh="R"]'); await p.waitForFunction(() => CharView.sw.w > 0.99, null, { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(300); // (game time, not wall time: swiftshader runs ~6 fps and frame dt is capped at 0.05 s)
  const G = await p.evaluate(() => { const r = CharView.rig, B = r.B, sw = r.built.swords, V = (x, y, z) => new THREE.Vector3(x, y, z), out = { st: CharView.sw, tool: CharView.st.tool, atk: getComputedStyle(document.getElementById('swAtk')).display };
    for (const k of ['R', 'L']) { const s = sw[k], q = s.getWorldQuaternion(new THREE.Quaternion()), d = V(0, 1, 0).applyQuaternion(q), fa = B['hd' + k].getWorldPosition(V(0, 0, 0)).sub(B['fa' + k].getWorldPosition(V(0, 0, 0))).normalize(), g0 = s.getWorldPosition(V(0, 0, 0)), tip = s.localToWorld(V(0, 0.5, 0));
      out[k] = { g: s.userData.grade, t: s.userData.tier, vis: s.visible, par: s.parent === B['hd' + k], kn: +B['kn' + k].rotation.x.toFixed(2), tp: +B['tp' + k].rotation.x.toFixed(2), ang: +(Math.acos(Math.max(-1, Math.min(1, d.dot(fa)))) * 57.3).toFixed(0), up: +(tip.y - g0.y).toFixed(3) }; } return out; });
  ok(G.R.g === 'steel' && G.R.t === 10 && G.L.g === 'gold' && G.L.t === 5 && G.R.par && G.L.par && G.R.vis && G.L.vis && G.tool === 'none' && G.st.w > 0.99 && G.atk !== 'none', 'dual wield: steel T10 right, gold T5 left, pickaxe stowed, Attack button shown ' + JSON.stringify({ st: G.st, tool: G.tool, atk: G.atk }));
  ok(['R', 'L'].every((k) => G[k].kn >= 1.25 && G[k].tp >= 1.2 && G[k].ang > 45 && G[k].ang < 135 && G[k].up > 0.25), 'natural grip: fingers wrapped (knuckles / tips curled), blade across the fist (not along the forearm), raised in guard ' + JSON.stringify([G.R, G.L]));
  // Attack: 4 presses = 4 different swings; record each one's blade-tip path (character space)
  const runs = [];
  for (let i = 0; i < 4; i++) { await tap(i % 2 ? '#swAtk' : '#pvPanel [data-swatk]');
    runs.push(await p.evaluate(async () => { const r = CharView.rig, sw = r.built.swords, V = (x, y, z) => new THREE.Vector3(x, y, z), name = CharView.sw.at && CharView.sw.at.name, P = { R: [], L: [] }; let bad = 0;
      const t0 = Date.now(); while (CharView.sw.at && Date.now() - t0 < 20000) { for (const k of ['R', 'L']) { const tp = r.root.worldToLocal(sw[k].localToWorld(V(0, 0.5, 0))); if (![tp.x, tp.y, tp.z].every(Number.isFinite)) bad++; P[k].push([tp.x, tp.y, tp.z]); } await new Promise((res) => setTimeout(res, 40)); }
      const rs = (a) => Array.from({ length: 20 }, (_, i) => a[Math.min(a.length - 1, Math.round(i / 19 * (a.length - 1)))] || [0, 0, 0]); P.R = rs(P.R); P.L = rs(P.L); // (the whole swing, resampled to 20 points in swing time) const span = (a) => Math.max(...[0, 1, 2].map((c) => Math.max(...a.map((q) => q[c])) - Math.min(...a.map((q) => q[c]))));
      return { name, bad, spanR: +span(P.R).toFixed(2), spanL: +span(P.L).toFixed(2), P: P.R }; })); await p.waitForTimeout(150); }
  const names = runs.map((q) => q.name), dist = (a, b) => a.P.reduce((s, q, j) => Math.max(s, Math.hypot(q[0] - b.P[j][0], q[1] - b.P[j][1], q[2] - b.P[j][2])), 0);
  let minD = 9; for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) minD = Math.min(minD, dist(runs[i], runs[j]));
  ok(new Set(names).size >= 3 && runs.every((q) => q.bad === 0 && q.spanR > 0.4), 'Attack: ' + names.join(', ') + ' (each press the next swing; blade tip sweeps ' + runs.map((q) => q.spanR).join('/') + ' m)');
  ok(minD > 0.2, 'the swings follow different paths (closest pair differs by ' + minD.toFixed(2) + ' m at some moment)');
  ok(runs.every((q) => q.spanL > 0.3), 'dual wield: the left sword cuts too, a beat later (' + runs.map((q) => q.spanL).join('/') + ' m)');
  // a sword she owns at its own tier is a real equip (saved); a preview never touches the save
  const O = await p.evaluate(async () => { Craft.add('bag', 'tool:sword_gold', 1); S.tswords = { gold: 4 }; const t = (s) => document.querySelector(s).click(); const w = () => new Promise((r) => setTimeout(r, 120));
    t('#pvPanel [data-swg="gold"]'); await w(); t('#pvPanel [data-swt="4"]'); await w(); t('#pvPanel [data-swh="R"]'); await w(); const a = S.swordR, h = document.querySelector('#pvPanel .pvh small').textContent;
    t('#pvPanel [data-swg="iron"]'); await w(); t('#pvPanel [data-swt="2"]'); await w(); t('#pvPanel [data-swh="R"]'); await w(); return { a, h, b: S.swordR, now: CharView.sw.R }; });
  ok(O.a === 'gold' && !/preview/.test(O.h) && O.b === 'gold' && O.now.g === 'iron', 'owned Gold sword T4 equips for real (saved); an Iron T2 preview leaves the save alone ' + JSON.stringify(O));
  await tap('#pvPanel [data-swclr]'); await p.waitForTimeout(1600);
  const C = await p.evaluate(() => ({ sw: CharView.sw, R: CharView.rig.built.swords.R, L: CharView.rig.built.swords.L, tool: CharView.st.tool, cls: document.getElementById('charWrap').classList.contains('sw') }));
  ok(!C.sw.R && !C.sw.L && !C.R && !C.L && C.tool !== 'none' && !C.cls, 'Put away: hands empty, pickaxe back ' + JSON.stringify({ tool: C.tool }));
  // leave with swords in both hands (Onyx T10 + Lumen T10): closing must release everything
  await tap('#pvPanel [data-swg="onyx"]'); await tap('#pvPanel [data-swt="10"]'); await tap('#pvPanel [data-swh="R"]'); await tap('#pvPanel [data-swg="lumen"]'); await tap('#pvPanel [data-swt="10"]'); await tap('#pvPanel [data-swh="L"]'); await p.waitForFunction(() => CharView.sw.w > 0.99, null, { timeout: 30000 }).catch(() => {}); await tap('#swAtk'); await p.waitForTimeout(300);
  await p.evaluate(() => setTab('city')); await p.waitForTimeout(2000);
  const E = await p.evaluate(() => { const W = window.__W, R = CharView.renderer; return { solo: CharView.solo, rig: CharView.rig === W.rig, sw: !!CharView.rig.built.swords, mem: [R.info.memory.geometries, R.info.memory.textures], mem0: W.mem0 }; });
  ok(!E.solo && E.rig && !E.sw, 'closed: back to her world self, no swords in the world');
  ok(E.mem[0] <= E.mem0[0] && E.mem[1] <= E.mem0[1], 'texture cleanup on close: geometries / textures ' + JSON.stringify(E.mem0) + ' -> ' + JSON.stringify(E.mem));
  ok(!errs.length, 'no page errors ' + errs.slice(0, 3).join(' | '));
  console.log(fails ? `${fails} FAILED` : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);
})();

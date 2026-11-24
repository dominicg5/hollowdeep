// (Dominic t584u) the Character tab is its own stage: her world self (rig, spot, explore session) stays put while it is open; the pickaxe viewer previews every
// pickaxe and tier (3D tier look + painted icon) with no change to the save, the pack or the equipped pick; closing disposes the stage (renderer counts back).
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL + '?t=' + Date.now(), { timeout: 90000, waitUntil: 'commit' }); await p.waitForTimeout(3000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st && M3.st.ok, null, { timeout: 240000 }).catch(() => {}); await p.waitForFunction(() => Explore.on && CharView.st.gnd, null, { timeout: 120000 }).catch(() => {});
  await p.waitForTimeout(2500);
  const A = await p.evaluate(() => { const keys = ['pickGrade', 'pickEqT', 'tpicks', 'toolMode', 'climbGrade', 'tetherGrade', 'charSex', 'bag', 'vault', 'worn', 'inv', 'items'], sv = () => JSON.stringify(keys.map((k) => S[k])) + JSON.stringify(Craft.worn ? Craft.worn() : null) + (Craft.bagHTML ? Craft.bagHTML(false).length : 0);
    window.__T = { sv, rig: CharView.rig, par: CharView.rig.root.parent, gnd: CharView.st.gnd, here: Explore.here(), pick: CharView.rig.built.pick, ls: localStorage.getItem('hollowdeep.save.v1') }; const R = CharView.renderer;
    window.__T.mem0 = R ? [R.info.memory.geometries, R.info.memory.textures] : [0, 0]; window.__T.s0 = sv(); return { on: Explore.on, here: window.__T.here, mem0: window.__T.mem0, pick: CharView.rig.built.pick.userData.grade }; });
  await p.evaluate(() => setTab('char')); await p.waitForTimeout(1500);
  const B = await p.evaluate(() => { const T = window.__T, r = CharView.rig; return { solo: CharView.solo, exOn: Explore.on, newRig: r !== T.rig, worldRig: CharView.worldRig === T.rig, worldPar: T.rig.root.parent === T.par, notInWorld: !!r && r.root.parent !== T.par && !T.par.children.includes(r.root), here: Explore.here(), cv: document.body.classList.contains('cvSolo'), hud: getComputedStyle(document.getElementById('cityWrap')).display, btn: getComputedStyle(document.getElementById('pvBtn')).display, frames: CharView.st.frames }; });
  ok(B.solo && B.exOn && B.newRig && B.worldRig && B.worldPar && B.notInWorld, 'Character tab: own stage + own copy of her; the explore session and her world rig stay put ' + JSON.stringify(B));
  ok(B.cv && B.hud === 'none' && B.btn !== 'none' && JSON.stringify(B.here) === JSON.stringify(A.here), 'map HUD steps aside; viewer button shown; her world spot unchanged ' + JSON.stringify([B.here, A.here]));
  // the pickaxe viewer: tap through the panel like a player
  const tap = (sel) => p.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return false; e.click(); return true; }, sel);
  await tap('#pvBtn'); await p.waitForTimeout(200); const seen = [];
  for (const [g, t] of [['onyx', 10], ['lumen', 10], ['gold', 3], ['stick', 0], ['onyx', 5], ['lumen', 0], ['rune', 7]]) { await tap(`#pvPanel [data-pvg="${g}"]`); if (g !== 'stick') await tap(`#pvPanel [data-pvt="${t}"]`); await p.waitForTimeout(250);
    seen.push(await p.evaluate(([g, t]) => { const pk = CharView.rig.built.pick, u = pk.userData, ic = document.querySelector('#pvPanel .ic').innerHTML, nPts = []; pk.traverse((o) => { if (o.isPoints) nPts.push(o.geometry.attributes.position.count); });
      return { g, t, grade: u.grade, onyxT: u.onyxT, tier: u.tier, pulse: !!u.pulse, pts: nPts, ico: (ic.match(/items_(\w+)_tiers/) || [, 'atlas'])[1], ix: (ic.match(/--ix:(\d+)/) || [])[1], pv: CharView.pv, hdr: document.querySelector('#pvPanel .pvh b').textContent }; }, [g, t])); }
  const S1 = (g, t) => seen.find((q) => q.g === g && q.t === t);
  ok(S1('onyx', 10).grade === 'onyx' && S1('onyx', 10).onyxT === 10 && S1('onyx', 10).pts.length >= 1 && S1('onyx', 10).ico === 'onyx' && S1('onyx', 10).ix === '9', 'Onyx T10 in her hand (tier look + violet sparks) + painted icon ' + JSON.stringify(S1('onyx', 10)));
  ok(S1('lumen', 10).tier === 10 && S1('lumen', 10).pulse && JSON.stringify(S1('lumen', 10).pts) === '[120,24]' && S1('lumen', 10).ico === 'lumen', 'Lumen T10: pulse, 120 glints + 24 teal sparks, painted icon ' + JSON.stringify(S1('lumen', 10)));
  ok(S1('gold', 3).grade === 'gold' && S1('gold', 3).ico === 'gold' && S1('gold', 3).ix === '2' && S1('stick', 0).grade === 'stick' && S1('onyx', 5).onyxT === 5 && S1('lumen', 0).ico === 'atlas' && S1('rune', 7).ico === 'rune', 'Gold T3, Stickaxe, Onyx T5, Lumen T0 (atlas cell), Rune T7 ' + seen.map((q) => q.hdr).join(' | '));
  const C = await p.evaluate(() => { const T = window.__T; return { same: T.sv() === T.s0, ls: localStorage.getItem('hollowdeep.save.v1') === T.ls, worldPick: T.rig.built.pick === T.pick, eq: S.pickGrade }; });
  ok(C.same && C.worldPick, 'preview only: save fields, pack, equipped pick and her world pickaxe unchanged ' + JSON.stringify(C));
  await tap('#pvPanel [data-pvback]'); await p.waitForTimeout(200); const D = await p.evaluate(() => ({ g: CharView.rig.built.pick.userData.grade, pv: CharView.pv, real: CharView.GRADES[S.pickGrade] ? S.pickGrade : 'stick' }));
  ok(D.g === D.real && !D.pv.g, 'Back to my pick: her real pickaxe again ' + JSON.stringify(D));
  await tap('#pvPanel [data-pvg="onyx"]'); await tap('#pvPanel [data-pvt="10"]'); await p.waitForTimeout(200);
  await p.evaluate(() => setTab('city')); await p.waitForTimeout(2000);
  const E = await p.evaluate(() => { const T = window.__T, R = CharView.renderer; return { solo: CharView.solo, exOn: Explore.on, rig: CharView.rig === T.rig, par: T.rig.root.parent === T.par, gnd: CharView.st.gnd === T.gnd, pick: CharView.rig.built.pick === T.pick, here: Explore.here(), mem: [R.info.memory.geometries, R.info.memory.textures], mem0: T.mem0, same: T.sv() === T.s0, cv: document.body.classList.contains('cvSolo') }; });
  ok(!E.solo && E.exOn && E.rig && E.par && E.gnd && E.pick && !E.cv, 'closed: the same world rig, spot state and pickaxe, still exploring ' + JSON.stringify(E));
  ok(Math.hypot(E.here[0] - A.here[0], E.here[1] - A.here[1]) < 1, 'her world spot unchanged ' + JSON.stringify([A.here, E.here]));
  ok(E.mem[0] <= E.mem0[0] && E.mem[1] <= E.mem0[1] && E.same, 'nothing leaked: character renderer geometries / textures back to ' + JSON.stringify(E.mem0) + ' -> ' + JSON.stringify(E.mem) + '; save unchanged');
  ok(!errs.length, 'no page errors ' + errs.slice(0, 3).join(' | '));
  console.log(fails ? `${fails} FAILED` : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);
})();

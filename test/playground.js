// (t653u, Dominic) the Character view's Attack Playground: "Attack Playground" drops the Lumen Mushroom (Quaternius CC0 Mushnub, lumenite cyan cap, cream stem)
// on the floor; swings that reach it roll Combat.rollDamage against its placeholder Defense, show damage numbers, it dies at 0 HP and respawns. DOM / scene checks only, no renders.
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL + '?t=' + Date.now(), { timeout: 90000, waitUntil: 'commit' }); await p.waitForTimeout(3000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st && M3.st.ok, null, { timeout: 240000 }).catch(() => {}); await p.waitForFunction(() => Explore.on && CharView.st.gnd, null, { timeout: 120000 }).catch(() => {});
  await p.waitForTimeout(2000); await p.evaluate(() => setTab('char')); await p.waitForTimeout(1500);
  const tap = (sel) => p.evaluate((sel) => { const e = document.querySelector(sel); if (!e || e.disabled) return false; e.click(); return true; }, sel);
  await tap('#pvBtn'); await p.waitForTimeout(150); await tap('#pvPanel [data-pvk="sword"]'); await p.waitForTimeout(150);
  await tap('#pvPanel [data-swg="iron"]'); await tap('#pvPanel [data-swt="3"]'); await tap('#pvPanel [data-swh="R"]'); await p.waitForFunction(() => CharView.sw.w > 0.99, null, { timeout: 30000 }).catch(() => {});
  const L0 = await p.evaluate(() => ({ btn: document.getElementById('swAtk').textContent.trim(), panel: (document.querySelector('#pvPanel [data-swatk]') || {}).textContent, cfg: typeof LUMEN_MUSHROOM !== 'undefined' && [LUMEN_MUSHROOM.name, LUMEN_MUSHROOM.hp, LUMEN_MUSHROOM.def, LUMEN_MUSHROOM.str, LUMEN_MUSHROOM.xp], xp0: (S.combat && S.combat.xp) || 0, on: CharView.pga.on }));
  ok(L0.btn === '⚔️ Attack Playground' && /Attack Playground/.test(L0.panel) && !L0.on, `the Attack button is now "${L0.btn}" (Try gear panel: "${L0.panel}"); no playground until it is pressed`);
  ok(L0.cfg && L0.cfg.join() === 'Lumen Mushroom,8,0,1,32', 'placeholder stats in one block (src/lumen_mushroom.js LUMEN_MUSHROOM): ' + L0.cfg);
  await p.evaluate(() => { window.__nums = []; new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.classList && n.classList.contains('pgaNum')) window.__nums.push(n.textContent); }).observe(document.getElementById('charWrap'), { childList: true, subtree: true }); });
  await tap('#swAtk'); await p.waitForFunction(() => CharView.pga.ready, null, { timeout: 60000 }).catch(() => {});
  const M = await p.evaluate(() => { const g = CharView.pga, mob = g.mob, o = { on: g.on, ready: g.ready, clips: g.clips, inScene: !!(mob && mob.parent && mob.parent.isScene), mats: {}, skinned: 0, bones: 0 };
    if (mob) mob.traverse((m) => { if (m.isSkinnedMesh) { o.skinned++; o.bones = m.skeleton.bones.length; const k = m.material.name.split(':')[1]; o.mats[k] = [m.material.color.getHexString(), m.material.emissive.getHexString(), m.material.emissiveIntensity]; } });
    if (mob) { const r = CharView.rig.root.position, f = new THREE.Vector3(Math.sin(CharView.st.yaw), 0, Math.cos(CharView.st.yaw)), d = new THREE.Vector3(mob.position.x - r.x, 0, mob.position.z - r.z); o.dist = +d.length().toFixed(2); o.facing = +f.dot(d.normalize()).toFixed(2); }
    const h = document.getElementById('pgaHud'); o.hud = h && h.textContent; o.hudSt = h && h.dataset.state; return o; });
  ok(M.on && M.ready && M.inScene && M.skinned === 4 && M.bones === 4 && ['Idle', 'HitRecieve', 'Death'].every((c) => M.clips.includes(c)), `pressing it opens the playground: the rigged Mushnub (4 skinned parts, 4 bones; clips ${M.clips.join(', ')}) stands on the floor`);
  ok(M.mats.cap && M.mats.cap[0] === '66d8ff' && M.mats.cap[2] > 0.3 && M.mats.stem && M.mats.stem[0] === 'eedcbc' && M.mats.eyeWhite && M.mats.eyeBlack, 'Lumen look: glowing cyan cap #66d8ff, cream stem #eedcbc, its own side eyes ' + JSON.stringify(M.mats));
  ok(M.dist > 0.5 && M.dist < 1.7 && M.facing > 0.9 && /Lumen Mushroom/.test(M.hud) && /HP 8 \/ 8 · DEF 0/.test(M.hud) && M.hudSt === 'alive', `she faces it within reach (${M.dist} m, facing ${M.facing}); HUD "${M.hud}"`);
  // that first press also swung: the swing that reaches it rolls the damage
  await p.waitForFunction(() => !CharView.sw.at, null, { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(200);
  const H1 = await p.evaluate(() => ({ g: CharView.pga, nums: window.__nums.slice(), hud: document.getElementById('pgaHud').dataset.hp }));
  ok(H1.g.n === 1 && H1.g.log.length === 1 && H1.g.hp === Math.max(0, 8 - H1.g.log[0].dmg) && +H1.hud === H1.g.hp && H1.nums.length >= 1 && /^(-\d+( graze)?|Miss)$/.test(H1.nums[0]), `the swing lands: ${JSON.stringify(H1.g.log[0])} -> HP ${H1.g.hp}; damage number "${H1.nums[0]}"`);
  // keep hitting (the combat engine's own roll) until it drops; then it respawns
  const K = await p.evaluate(() => { let n = 0, r = null; const hits = []; while (CharView.pga.hp > 0 && n < 400) { r = CharView.pgaHit(); n++; if (r) hits.push(r.dmg); } const g = CharView.pga, h = document.getElementById('pgaHud');
    let death = false; g.mob && CharView.pga.mob; return { n, hp: g.hp, dead: g.dead, kills: g.kills, st: h.dataset.state, hud: h.textContent, after: CharView.pgaHit(), xp: (S.combat && S.combat.xp) || 0, sum: hits.reduce((a, x) => a + x, 0) }; });
  ok(K.hp === 0 && K.dead > 0 && K.kills === 1 && K.st === 'dead' && /Defeated/.test(K.hud) && K.after === null, `at 0 HP it dies (${K.n} more hits, ${K.sum} damage): Death plays, "${K.hud}", no more hits land while it is down`);
  ok(K.xp - L0.xp0 === 32, `the kill awards Combat XP = 4 x its HP (${L0.xp0} -> ${K.xp})`);
  await p.waitForFunction(() => CharView.pga.dead === 0 && CharView.pga.hp === CharView.pga.max, null, { timeout: 60000 }).catch(() => {});
  const R2 = await p.evaluate(() => ({ g: CharView.pga, st: document.getElementById('pgaHud').dataset.state, nums: window.__nums.slice(-3) }));
  ok(R2.g.hp === 8 && R2.g.dead === 0 && R2.st === 'alive' && R2.nums.includes('Respawned'), `it respawns at full HP (${R2.g.hp}) to test again`);
  const AW = await p.evaluate(() => { const y = CharView.st.yaw; CharView.st.yaw = y + Math.PI; const r = CharView.pgaHit(); CharView.st.yaw = y; return [r, CharView.pga.hp]; });
  ok(AW[0] === null && AW[1] === 8, 'turned away from it, a swing does not land');
  await p.evaluate(() => setTab('city')); await p.waitForTimeout(1500);
  const C = await p.evaluate(() => ({ on: CharView.pga.on, hud: !!document.getElementById('pgaHud'), mob: !!CharView.pga.mob }));
  ok(!C.on && !C.hud && !C.mob, 'leaving the Character view clears the playground (mushroom, HUD)');
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  console.log(fails ? `${fails} FAILED` : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);
})();

// (t653u, Dominic) the Character view's Attack Playground: "Attack Playground" drops the Lumen Mushroom (Quaternius CC0 Mushnub, lumenite cyan cap, cream stem)
// on the floor; swings that reach it roll Combat.rollDamage against its placeholder Defense, show damage numbers, it dies at 0 HP and respawns. DOM / scene checks only, no renders.
// (GD-12, Dominic t666u) the playground is an open stone arena: tap to walk, tap the mushroom to run up and fight it; it wanders, bites back on a timer
// (Combat.creatureAttack, GD-15), her HP shows in the HUD, at 0 she is knocked out and gets back up with full HP, no penalty. Its skinned mesh draws at its real size.
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL + '?t=' + Date.now(), { timeout: 90000, waitUntil: 'commit' }); await p.waitForFunction(() => typeof setTab === 'function' && typeof CharView !== 'undefined'); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st && M3.st.ok, null, { timeout: 240000 }).catch(() => {}); await p.waitForFunction(() => Explore.on && CharView.st.gnd, null, { timeout: 120000 }).catch(() => {});
  await p.evaluate(() => setTab('char')); await p.waitForFunction(() => CharView.solo && CharView.rig);
  const tap = (sel) => p.evaluate((sel) => { const e = document.querySelector(sel); if (!e || e.disabled) return false; e.click(); return true; }, sel);
  await tap('#pvBtn'); await p.waitForSelector('#pvPanel [data-pvk="sword"]'); await tap('#pvPanel [data-pvk="sword"]'); await p.waitForSelector('#pvPanel [data-swg]');
  await tap('#pvPanel [data-swg="iron"]'); await tap('#pvPanel [data-swt="3"]'); await tap('#pvPanel [data-swh="R"]'); await p.waitForFunction(() => CharView.sw.w > 0.99, null, { timeout: 30000 }).catch(() => {});
  const L0 = await p.evaluate(() => ({ btn: document.getElementById('swAtk').textContent.trim(), panel: (document.querySelector('#pvPanel [data-swatk]') || {}).textContent, cfg: typeof Creatures !== 'undefined' && (() => { const c = Creatures.get('lumen_mushroom'); return c && c === LUMEN_MUSHROOM && Creatures.ids.includes('lumen_mushroom') && c.model === 'assets/models/creatures/mushnub.glb' && [c.name, c.hp, c.def, c.str, c.xp]; })(), xp0: (S.combat && S.combat.xp) || 0, on: CharView.pga.on }));
  ok(L0.btn === '⚔️ Attack Playground' && /Attack Playground/.test(L0.panel) && !L0.on, `the Attack button is now "${L0.btn}" (Try gear panel: "${L0.panel}"); no playground until it is pressed`);
  ok(L0.cfg && L0.cfg.join() === 'Lumen Mushroom,8,0,1,32', 'placeholder stats in the creature table (src/creatures/data.js LUMEN_MUSHROOM, via Creatures.get; model assets/models/creatures/mushnub.glb): ' + L0.cfg);
  await p.evaluate(() => { window.__nums = []; new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.classList && n.classList.contains('pgaNum')) window.__nums.push(n.textContent); }).observe(document.getElementById('charWrap'), { childList: true, subtree: true }); });
  await tap('#swAtk'); await p.waitForFunction(() => CharView.pga.ready, null, { timeout: 60000 }).catch(() => {});
  const M = await p.evaluate(() => { const h0 = () => document.getElementById('pgaHud'), g = CharView.pga, mob = g.mob, o = { on: g.on, ready: g.ready, clips: g.clips, inScene: !!(mob && mob.parent && mob.parent === g.arena && mob.parent.name === 'pgaArena' && mob.parent.parent && mob.parent.parent.isScene), mats: {}, skinned: 0, bones: 0 };
    if (mob) mob.traverse((m) => { if (m.isSkinnedMesh) { o.skinned++; o.bones = m.skeleton.bones.length; const k = m.material.name.split(':')[1]; o.mats[k] = [m.material.color.getHexString(), m.material.emissive.getHexString(), m.material.emissiveIntensity]; } });
    if (g.rel) { o.dist = +g.rel.d.toFixed(2); o.facing = +g.rel.dot.toFixed(2); }
    // (GD-12: it was invisible - the skin was bound with the mesh node's 100x export transform applied twice, ~60 m round the camera) where the skin really draws it
    if (mob) { mob.updateMatrixWorld(true); const bb = new THREE.Box3(), v = new THREE.Vector3(); mob.traverse((m) => { if (!m.isSkinnedMesh) return; const P = m.geometry.attributes.position; for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); m.boneTransform(i, v); bb.expandByPoint(v.applyMatrix4(m.matrixWorld)); } });
      const c = mob.getWorldPosition(new THREE.Vector3()), sz = bb.getSize(new THREE.Vector3()); o.box = { h: +sz.y.toFixed(3), w: +Math.max(sz.x, sz.z).toFixed(3), y0: +(bb.min.y - c.y).toFixed(3), off: +Math.hypot(bb.getCenter(new THREE.Vector3()).x - c.x, bb.getCenter(new THREE.Vector3()).z - c.z).toFixed(3) }; }
    { const G = CharView.st.gnd, A = g.arena; o.arena = !!(A && A.parent && A.parent.isScene && G && G.arena && G.circR > 5); o.floorHidden = !!A && (A.parent.userData.floor || []).every((f) => !f.visible); }
    o.me = g.me && [g.me.hp, g.me.max]; o.meHud = h0() && h0().dataset.me;
    const h = document.getElementById('pgaHud'); o.hud = h && h.textContent; o.hudSt = h && h.dataset.state; return o; });
  ok(M.on && M.ready && M.inScene && M.skinned === 4 && M.bones === 4 && ['Idle', 'HitRecieve', 'Death'].every((c) => M.clips.includes(c)), `pressing it opens the playground: the rigged Mushnub (4 skinned parts, 4 bones; clips ${M.clips.join(', ')}) stands on the floor`);
  ok(M.box && Math.abs(M.box.h - 0.8) < 0.05 && M.box.w < 1.5 && Math.abs(M.box.y0) < 0.03 && M.box.off < 0.3, `GD-12: the skinned mushroom draws at its real size where it stands (0.8 m tall, feet on the floor): ${JSON.stringify(M.box)}`);
  ok(M.arena && M.floorHidden, 'GD-12: an open stone arena replaces the small studio disc; she walks it (a ground walker, circular bound)');
  ok(M.me && M.me[0] === M.me[1] && M.me[1] >= 11 && +M.meHud === M.me[0] && /You/.test(M.hud) && new RegExp('HP ' + M.me[0] + ' / ' + M.me[1]).test(M.hud), `her HP shows in the HUD (${JSON.stringify(M.me)}): "${M.hud}"`);
  ok(M.mats.cap && M.mats.cap[0] === '66d8ff' && M.mats.cap[2] > 0.3 && M.mats.stem && M.mats.stem[0] === 'eedcbc' && M.mats.eyeWhite && M.mats.eyeBlack, 'Lumen look: glowing cyan cap #66d8ff, cream stem #eedcbc, its own side eyes ' + JSON.stringify(M.mats));
  ok(M.dist > 0.5 && M.dist < 1.7 && M.facing > 0.9 && /Lumen Mushroom/.test(M.hud) && /HP 8 \/ 8 · DEF 0/.test(M.hud) && M.hudSt === 'alive', `she faces it within reach (${M.dist} m, facing ${M.facing}); HUD "${M.hud}"`);
  // that first press also swung: the swing that reaches it rolls the damage
  await p.waitForFunction(() => !CharView.sw.at, null, { timeout: 30000 }).catch(() => {}); await p.waitForFunction(() => CharView.pga.n >= 1);
  const H1 = await p.evaluate(() => ({ g: CharView.pga, nums: window.__nums.slice(), hud: document.getElementById('pgaHud').dataset.hp }));
  ok(H1.g.n === 1 && H1.g.log.length === 1 && H1.g.hp === Math.max(0, 8 - H1.g.log[0].dmg) && +H1.hud === H1.g.hp && H1.nums.length >= 1 && /^(-\d+( graze)?|Miss)$/.test(H1.nums[0]), `the swing lands: ${JSON.stringify(H1.g.log[0])} -> HP ${H1.g.hp}; damage number "${H1.nums[0]}"`);
  // keep hitting (the combat engine's own roll) until it drops; then it respawns
  const K = await p.evaluate(() => { let n = 0, r = null; const hits = []; while (CharView.pga.hp > 0 && n < 400) { r = CharView.pgaHit(); n++; if (r) hits.push(r.dmg); } const g = CharView.pga, h = document.getElementById('pgaHud');
    let death = false; g.mob && CharView.pga.mob; return { n, hp: g.hp, dead: g.dead, kills: g.kills, st: h.dataset.state, hud: h.textContent, after: CharView.pgaHit(), xp: (S.combat && S.combat.xp) || 0, sum: hits.reduce((a, x) => a + x, 0) }; });
  ok(K.hp === 0 && K.dead > 0 && K.kills === 1 && K.st === 'dead' && /Defeated/.test(K.hud) && K.after === null, `at 0 HP it dies (${K.n} more hits, ${K.sum} damage): Death plays, "${K.hud}", no more hits land while it is down`);
  // (combat SFX, Art's pack, Dominic 9:01 AM) Sfx fires on the swing (shout + swoosh) and on each landed hit; random variants, never one clip twice in a row
  const SX = await p.evaluate(() => { const L = Sfx.log.slice(), T = Sfx.TABLE, seq = {}; for (const e of L) { const k = e.cat.startsWith('hit') ? 'hit' : e.cat; (seq[k] = seq[k] || []).push(e.name); }
    const rep = (a) => a.some((x, i) => i && x === a[i - 1]); const pool = []; for (let i = 0; i < 300; i++) pool.push(Sfx.play('swoosh')); const hp = []; for (let i = 0; i < 300; i++) hp.push(Sfx.hit({ crit: i % 7 === 0 }));
    const c1 = Sfx.hit({ crit: true }), c2 = Sfx.hit({ crit: true });
    return { cats: [...new Set(L.map((e) => e.cat))], shout: (seq.shout_m || []).length + (seq.shout_f || []).length, sw: (seq.swoosh || []).length, hits: (seq.hit || []).length, landed: CharView.pga.log.filter((x) => x.hit || x.dmg > 0).length,
      rep: Object.values(seq).some(rep), rep2: rep(pool) || rep(hp), uniq: new Set(pool).size, uniqH: new Set(hp).size, crit: [c1, c2], ext: T.ext, sexOk: (CharView.rig.sex === 'f' ? 'shout_f' : 'shout_m') }; });
  ok(SX.shout >= 1 && SX.sw >= 1 && SX.cats.includes(SX.sexOk) && SX.hits === SX.landed && SX.hits >= 1, `combat SFX: the swing played a ${SX.sexOk} shout + swoosh (${SX.shout} shouts, ${SX.sw} swooshes) and every landed hit played a hit (${SX.hits} of ${SX.landed})`);
  ok(!SX.rep && !SX.rep2 && SX.uniq === 6 && SX.uniqH === 6 && SX.crit[0] === 'hit_06' && SX.crit[1] !== 'hit_06' && SX.ext === 'mp3', `combat SFX: random picks, no back-to-back repeats (all 6 swooshes, all 6 hits used; crit gets hit_06 and a 2nd crit in a row alternates: ${SX.crit}); MP3 only`);
  ok(K.xp - L0.xp0 === 32, `the kill awards Combat XP = 4 x its HP (${L0.xp0} -> ${K.xp})`);
  await p.waitForFunction(() => CharView.pga.dead === 0 && CharView.pga.hp === CharView.pga.max, null, { timeout: 60000 }).catch(() => {});
  const R2 = await p.evaluate(() => ({ g: CharView.pga, st: document.getElementById('pgaHud').dataset.state, nums: window.__nums.slice(-3) }));
  ok(R2.g.hp === 8 && R2.g.dead === 0 && R2.st === 'alive' && R2.nums.includes('Respawned'), `it respawns at full HP (${R2.g.hp}) to test again`);
  const AW = await p.evaluate(() => { const G = CharView.st.gnd, f = G.face; G.face = f + Math.PI; const r = CharView.pgaHit(); G.face = f; return [r, CharView.pga.hp]; });
  ok(AW[0] === null && AW[1] === 8, 'turned away from it, a swing does not land');
  // tap the floor: she runs there (a screen point through the arena's own tap handler: camera ray -> the mushroom, else the floor)
  const tapAt = (x, z, y) => p.evaluate(([x, z, y]) => { const s = CharView.pgaScreen(x, z, y); return s ? CharView.pgaTap(s.x, s.y) : null; }, [x, z, y || 0]);
  const W0 = await p.evaluate(() => [CharView.st.gnd.x, CharView.st.gnd.z]); const T1 = await tapAt(-2.5, -2); await p.waitForFunction(() => Math.hypot(CharView.st.gnd.x + 2.5, CharView.st.gnd.z + 2) < 0.3, null, { timeout: 20000 }).catch(() => {});
  const W1 = await p.evaluate(() => ({ x: CharView.st.gnd.x, z: CharView.st.gnd.z, eng: CharView.pga.eng }));
  ok(T1 === 'ground' && Math.hypot(W1.x + 2.5, W1.z + 2) < 0.3 && Math.hypot(W1.x - W0[0], W1.z - W0[1]) > 2 && !W1.eng, `tap the floor: she runs there (${W0.map((v) => v.toFixed(2))} -> ${W1.x.toFixed(2)}, ${W1.z.toFixed(2)})`);
  // GD-25 (t686u): running sheathed her swords and stopping does NOT bring them back (game-clock wait, not wall time)
  const SH0 = await p.evaluate(() => ({ sh: CharView.sw.sh, run: CharView.sw.run, clk: CharView.pga.clk })); await p.waitForFunction((c) => CharView.pga.clk > c + 1.5 && !CharView.sw.run, SH0.clk, { timeout: 60000 }).catch(() => {});
  const SH1 = await p.evaluate(() => ({ sh: CharView.sw.sh, run: CharView.sw.run, eff: CharView.sw.eff, saved: S.swSh, rule: CharView.sw.pose.RUN_SHEATHES }));
  ok(SH0.sh && SH1.sh && !SH1.run && SH1.saved === true && SH1.rule === true, 'GD-25: the run sheathed her swords and they stay sheathed after she stops ' + JSON.stringify([SH0, SH1]));
  // the mushroom wanders while left alone
  await p.evaluate(() => { CharView.pga.mob && (window.__mp = CharView.pga.mob.position.clone()); }); await p.waitForFunction(() => CharView.pga.mob.position.distanceTo(window.__mp) > 0.3, null, { timeout: 90000 });
  const WD = await p.evaluate(() => ({ moved: CharView.pga.mob.position.distanceTo(window.__mp), anim: CharView.pga.anim }));
  ok(WD.moved > 0.3, `left alone it wanders (moved ${WD.moved.toFixed(2)} m, now "${WD.anim}")`);
  // GD-19: hold damage at zero for four full sequences, observing the real animation strike callbacks (not calling pgaHit).
  await p.evaluate(() => { window.__roll = Combat.rollDamage; window.__rolls = []; Combat.rollDamage = (...a) => { const r = window.__roll(...a); window.__rolls.push({ t: CharView.pga.clk, face: CharView.pga.rel.dot, v: CharView.sw.at.v }); return Object.assign({}, r, { dmg: 0 }); }; });
  const n0 = await p.evaluate(() => CharView.pga.n); const mp = await p.evaluate(() => { const m = CharView.pga.mob.position; return [m.x, m.z]; });
  const T2 = await tapAt(mp[0], mp[1], 0.4); const E1 = T2 === 'mob' && await p.evaluate(() => CharView.pga.eng);
  const DR = await p.evaluate(() => ({ sh: CharView.sw.sh, saved: S.swSh }));
  ok(T2 === 'mob' && !DR.sh && DR.saved === false, 'GD-25: tapping the creature to engage draws her swords ' + JSON.stringify(DR));
  await p.waitForFunction(() => CharView.pga.swings.length >= 4 && CharView.pga.swings[3].roll === 1 && !CharView.sw.at, null, { timeout: 240000 });
  const E2 = await p.evaluate(() => ({ n: CharView.pga.n, d: CharView.pga.rel.d, cfg: PLAYGROUND_COMBAT.ATTACK_INTERVAL_S, swings: CharView.pga.swings, rolls: window.__rolls }));
  ok(E1 && E2.d < 1.7 && E2.n === n0 + 4, `tap the mushroom: auto-walk and four attack animations (${E2.n - n0} rolls at ${E2.d.toFixed(2)} m)`);
  ok(E2.cfg === 3 && E2.swings.length === 4 && E2.swings.every((e, i, a) => e.roll === 1 && (!i || (e.v === (a[i - 1].v + 1) % 4 && e.t - a[i - 1].t >= 2.99 && e.t - a[i - 1].t < 3.5))), 'GD-19: next style every 3 game seconds, exactly ONE roll per complete animation ' + JSON.stringify(E2.swings));
  ok(E2.rolls.length === 4 && E2.rolls.every((e) => e.face > 0.95), 'GD-19: locked on, every strike faces the mushroom ' + JSON.stringify(E2.rolls));
  // Step back but remain inside the leash: HER attacks stop, its hunt persists beyond the old 8-second timeout and it bites her again.
  await p.evaluate(() => { const g = CharView.pga, m = g.mob.position, G = CharView.st.gnd; window.__away = { n: g.n, clk: g.clk, bites: g.bites.length }; const dx = G.x - m.x, dz = G.z - m.z, d = Math.hypot(dx, dz); CharView.pgaWalk(m.x + dx / d * 2.5, m.z + dz / d * 2.5); });
  await p.waitForFunction(() => CharView.pga.clk > window.__away.clk + 9 && CharView.pga.bites.length > window.__away.bites, null, { timeout: 180000 });
  const STOP = await p.evaluate(() => ({ n: CharView.pga.n, n0: window.__away.n, eng: CharView.pga.eng, hunt: CharView.pga.hunt, d: CharView.pga.rel.d }));
  ok(!STOP.eng && STOP.n === STOP.n0 && STOP.hunt, 'GD-19: walking off stops her attacks but the mushroom keeps chasing and biting inside its leash ' + JSON.stringify(STOP));
  // Run to the far side of the arena: it drops the hunt only once beyond the data-table leash.
  await p.evaluate(() => { const m = CharView.pga.mob.position, L = Math.hypot(m.x, m.z) || 1; CharView.pgaWalk(-m.x / L * 6.5, -m.z / L * 6.5); /* (the rim point farthest from it) */ });
  await p.waitForFunction(() => CharView.pga.leashD !== null, null, { timeout: 60000 });
  const LEASH = await p.evaluate(() => ({ d: CharView.pga.leashD, leash: CharView.pga.leash, reach: CharView.pga.reach, hunt: CharView.pga.hunt }));
  ok(LEASH.leash === 4 && LEASH.leash > LEASH.reach + 2 && LEASH.d > LEASH.leash && !LEASH.hunt, 'GD-19: 4 m data-table leash, hunt ends beyond it ' + JSON.stringify(LEASH));
  // GD-21: after the leash it is passive again - stand right beside it for three of its attack timers: no hunt, no bites
  const passive = () => p.evaluate(() => { const g = CharView.pga, G = CharView.st.gnd, m = g.mob.position; G.goal = null; G.path = null; G.x = m.x + 0.8; G.z = m.z; CharView.pgaWalk(G.x, G.z); window.__pas = { clk: g.clk, bites: g.bites.length, T: LUMEN_MUSHROOM.atkS * 3, min: 0.8, hunt: false }; return window.__pas; });
  const passiveRes = async () => { await p.waitForFunction(() => { const W = window.__pas, g = CharView.pga; if (g.rel) W.min = Math.min(W.min, g.rel.d); W.hunt = W.hunt || g.hunt; return g.clk > W.clk + W.T; }, null, { timeout: 120000 }).catch(() => {}); return p.evaluate(() => ({ hunt: CharView.pga.hunt || window.__pas.hunt, min: +window.__pas.min.toFixed(2), reach: LUMEN_MUSHROOM.atkReach, bites: CharView.pga.bites.length - window.__pas.bites, d: +CharView.pga.rel.d.toFixed(2), T: window.__pas.T, flag: LUMEN_MUSHROOM.aggro, provoked: CharView.pga.provoked })); };
  await passive(); const PV1 = await passiveRes();
  ok(PV1.flag === 'provoked' && PV1.provoked && !PV1.hunt && PV1.bites === 0 && PV1.min < PV1.reach + 0.15, 'GD-21: once leashed back it resets to passive (beside it for ' + PV1.T + ' game s: no hunt, no bites) ' + JSON.stringify(PV1));
  // Let real damage through and tap again: it dies without any extra presses.
  await p.evaluate(() => { Combat.rollDamage = window.__roll; });
  const mp2 = await p.evaluate(() => { const m = CharView.pga.mob.position; return [m.x, m.z]; }); await tapAt(mp2[0], mp2[1], 0.4);
  const k0 = await p.evaluate(() => CharView.pga.kills);
  await p.waitForFunction((k) => CharView.pga.kills > k, k0, { timeout: 240000 });
  ok(await p.evaluate(() => !CharView.pga.eng), 'GD-19: auto-attack continues until dead, then releases the lock');
  // it bites back on a timer: GD-15's roll (parry, then acc / (her Defense + 100), else 0..str)
  await p.waitForFunction(() => CharView.pga.dead === 0, null, { timeout: 30000 }).catch(() => {});
  await passive(); const PV2 = await passiveRes();
  ok(!PV2.hunt && PV2.bites === 0, 'GD-21: a fresh (respawned) Lumen Mushroom is passive - she can stand beside it and it never bites ' + JSON.stringify(PV2));
  // provoke it with one zero-damage hit while her swords are sheathed: it hunts her, bites, and its attack draws her swords (GD-25)
  const PR = await p.evaluate(() => { const g = CharView.pga, G = CharView.st.gnd, m = g.mob.position; G.goal = null; G.path = null; G.x = m.x + 0.8; G.z = m.z; CharView.swSheathe(true); /* (it wandered off while passive: step back beside it) */ G.face = Math.atan2(m.x - G.x, m.z - G.z); const rd = Combat.rollDamage; Combat.rollDamage = (...a) => Object.assign({}, rd(...a), { dmg: 0 }); const r = CharView.pgaHit(); Combat.rollDamage = rd; return { r: !!r, hunt: CharView.pga.hunt, sh: CharView.sw.sh, b0: g.bites.length }; }); /* (CharView.pga is a fresh snapshot each read: g was taken before the hit) */
  ok(PR.r && PR.hunt, 'GD-21: hitting it provokes it (hunt on) ' + JSON.stringify(PR));
  await p.waitForFunction((b0) => CharView.pga.bites.length >= b0 + 2 && !CharView.sw.sh, PR.b0, { timeout: 60000 }).catch(() => {});
  const PD = await p.evaluate(() => ({ sh: CharView.sw.sh, saved: S.swSh, hunt: CharView.pga.hunt }));
  ok(PR.sh === true && !PD.sh && PD.saved === false && PD.hunt, 'GD-25: a provoked creature fighting her draws her sheathed swords ' + JSON.stringify(PD));
  const B = await p.evaluate(() => { const g = CharView.pga, P = Combat.playerStats(); return { bites: g.bites, me: g.me, ch: Combat.hitChance(LUMEN_MUSHROOM.acc, P.def), hud: document.getElementById('pgaHud').dataset.me }; });
  ok(B.bites.length >= 2 && B.bites.every((b) => b.parried || (Math.abs(b.chance - B.ch) < 1e-9 && b.dmg >= 0 && b.dmg <= 1 && (!b.hit || b.dmg === 1))) && B.me.hp <= B.me.max && +B.hud === Math.round(B.me.hp), `it bites back every ${'~2'} s: ${B.bites.length} bites at ${(B.ch * 100).toFixed(1)}% full-hit (acc 30 vs her Defense), 0..1 dmg; her HP ${B.me.hp} / ${B.me.max}`);
  // knocked out at 0 HP; back up at the centre with full HP, no penalty
  const KO0 = await p.evaluate(() => ({ xp: (S.combat && S.combat.xp) || 0, bag: JSON.stringify(S.backpack || {})}));
  const KO1 = await p.evaluate(() => { CharView.pgaHurt(9999); const g = CharView.pga, h = document.getElementById('pgaHud'); return { ko: g.ko, kos: g.kos, hp: g.me.hp, hud: h.dataset.ko, txt: h.textContent, tap: CharView.pgaWalk(1, 1) }; });
  await p.waitForFunction(() => CharView.pga.ash.u >= 0.5, null, { timeout: 30000 }).catch(() => {});
  const AS = await p.evaluate(() => { const a = CharView.pga.ash; return { on: a.on, u: +a.u.toFixed(2), cut: a.cut, top: a.top, bot: a.bot, born: a.born, n: a.n, mats: a.mats, hid: a.hid, fx: a.fx, d: a.d, lean: CharView.rig.root.rotation.x, txt: document.getElementById('pgaHud').textContent, ko: CharView.pga.ko }; });
  const lean = AS.lean; await p.waitForFunction(() => CharView.pga.ko === 0, null, { timeout: 60000 }).catch(() => {});
  const AE = await p.evaluate(() => { const a = CharView.pga.ash; return { on: a.on, cut: a.cut, born: a.born }; });
  const AD = AS.d || {}; ok(AS.on && AS.top > AS.bot && AS.cut < AS.top - 0.4 * (AS.top - AS.bot) && AS.born > 0 && AS.n === AD.PARTICLES && AS.mats > 0 && AS.fx && Math.abs(lean) < 0.05 && /Turned to ash/.test(AS.txt) && AD.DISSOLVE_S >= 1.5 && AD.DISSOLVE_S + AD.HOLD_S <= 2.5,
    'GD-22: at 0 HP she crumbles to ash top-down (clip plane between head and feet, ash/ember particles, no fall), timings from PLAYGROUND_COMBAT.ASH ' + JSON.stringify(AS));
  ok(!AE.on && AE.cut > 1e5, 'GD-22: the respawn ends the ash and restores her whole ' + JSON.stringify(AE));
  const KO2 = await p.evaluate(() => ({ me: CharView.pga.me, x: CharView.st.gnd.x, z: CharView.st.gnd.z, lean: CharView.rig.root.rotation.x, xp: (S.combat && S.combat.xp) || 0, bag: JSON.stringify(S.backpack || {}), hud: document.getElementById('pgaHud').dataset.ko }));
  ok(KO1.ko > 0 && KO1.hp === 0 && KO1.hud === '1' && /Turned to ash/.test(KO1.txt) && KO1.tap === false, `at 0 HP she is down (can't be steered): ${JSON.stringify([KO1, lean])}`);
  ok(KO2.me.hp === KO2.me.max && Math.hypot(KO2.x, KO2.z) < 0.05 && Math.abs(KO2.lean) < 1e-6 && KO2.hud === '0' && KO2.xp === KO0.xp && KO2.bag === KO0.bag, `she gets back up at the centre with full HP, no penalty (Combat XP and backpack unchanged) ${JSON.stringify(KO2)}`);
  await p.evaluate(() => setTab('city')); await p.waitForFunction(() => !CharView.pga.on);
  const C = await p.evaluate(() => ({ on: CharView.pga.on, hud: !!document.getElementById('pgaHud'), mob: !!CharView.pga.mob, arena: !!CharView.pga.arena }));
  ok(!C.on && !C.hud && !C.mob && !C.arena, 'leaving the Character view clears the playground (arena, mushroom, HUD)');
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  console.log(fails ? `${fails} FAILED` : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);
})();

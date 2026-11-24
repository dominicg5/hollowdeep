// The Skill Tree (t626u, Dominic via Art): the unopened back door in the Ledge house is gone - an open arched walkway leads through a corridor into a much
// larger room, "The Skill Tree", where a lumenite tree with red (Combat) / blue (Production) / yellow (Tether Beasts) glowing crystal branches hovers over
// a dais, with a braided red / blue / yellow tether from under it to the Tether Orb. Tapping the tree walks her there (pathing through the walkway) and opens
// the Skill Tree screen (Art's mocks minus the combat stats panel and the Combat level badge): Combat opens, Production and Tether Beasts are locked and blank;
// points are spent / refunded through the combat module (src/combat.js) with its costs and prerequisites. Geometry and DOM checks only, no renders.
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(1000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 200000 }).catch(() => {});
  const r = await p.evaluate(async () => { const V = CharView, st = V.st, HM = V.HM, o = {}, sim = (n) => V.sim(1 / 30, n);
    try { closeModalQuiet(); } catch (e) {} document.querySelector('nav#tabs [data-tab=home]').click(); st.paused = true; sim(30); if (HM.mode !== 'in') V.setHomeMode('in'); sim(20);
    const G = () => st.gnd, K = HM.sk;
    // the room: built, visible inside, solid walls, the door gone
    o.room = { ok: !!K, vis: K && K.g.visible, walls: K && ['front', 'back', 'left', 'right', 'ceil'].every((k) => K.walls[k] && K.walls[k].isObject3D), branches: K && Object.keys(HM.skBranch || {}).join(), braid: K && K.braid.children.filter((m) => m.isMesh).length };
    { const R = new THREE.Box3(); K.g.updateMatrixWorld(true); const box = (m) => R.setFromObject(m).clone(); const f = box(K.walls.back), l = box(K.walls.left), rt = box(K.walls.right), hb = new THREE.Box3().setFromObject(HM.room);
      o.size = { w: +(rt.min.x - l.max.x).toFixed(2), d: +(K.walls.front.children[0].position.z - f.max.z).toFixed(2), house: [HM.W, HM.FZ - HM.BZ] }; }
    o.door = { obs: HM.obs.some((q) => Math.abs(q.x + 2.45) < 0.01 && Math.abs(q.z - (HM.BZ + 0.2)) < 0.01), plankGroups: 0 };
    // open walkway: a ray through the arch at waist height hits nothing of the house's back wall, a ray beside it does
    { const ray = new THREE.Raycaster(), hit = (x) => { ray.set(new THREE.Vector3(x, 1.0, HM.BZ + 0.6), new THREE.Vector3(0, 0, -1)); ray.far = 0.75; return ray.intersectObject(HM.walls.back, true).length > 0; };
      o.arch = { through: hit(-2.72), beside: hit(-1.0) }; }
    // the tree hovers and bobs, the braid starts under it and ends at the Tether Orb's globe table
    { const y0 = K.F.position.y; sim(20); const y1 = K.F.position.y; const P = HM.skBraidPts, a = P[0], z = P[P.length - 1], t = V.HMP.table;
      o.tree = { hover: +y0.toFixed(3), bob: +Math.abs(y1 - y0).toFixed(3), braid0: Math.hypot(a.x - K.T.position.x, a.z - K.T.position.z), braidEnd: +Math.hypot(z.x - t.x, z.z - t.z).toFixed(2), endY: z.y }; }
    // walking: tap the tree from the front door -> she paths through the walkway (always on floor), arrives, the Skill Tree opens
    const I = V.IA.list.find((x) => x.key === 'stree'); V.IA.opened = null; let f = 0, off = 0, corr = 0, minR = 9; G().x = HM.dx; G().z = HM.FZ - 0.75; I.tap();
    while (V.IA.opened !== 'stree' && f < 900) { sim(1); f++; const g = G(); if (!g.inb(g.x, g.z)) off++; if (g.z < HM.BZ && g.z > -3.9) corr++; minR = Math.min(minR, Math.hypot(g.x - K.T.position.x, g.z - K.T.position.z)); }
    o.walk = { f, off, corr, minR: +minR.toFixed(2), at: [+G().x.toFixed(2), +G().z.toFixed(2)], opened: V.IA.opened, ui: !!document.querySelector('#skillTree.on') };
    try { SkillTree.close(); } catch (e) {}
    // floor taps: into the room's far corner from the house, back out to the bed side; every frame on the floor, never through a wall
    const tapAt = (x, z) => { const q = V.homeScreen(new THREE.Vector3(x, 0, z)); return V.homeTap(q.x, q.y); };
    const walkTo = (x, z) => { G().x = x; G().z = z; };
    o.taps = []; for (const [sx, sz, tx, tz] of [[2.6, 1.8, -7.3, -12.2], [-7.3, -12.2, 2.7, -12.3], [2.7, -12.3, 2.6, 1.8], [-3.0, 0.9, 2.5, -4.6]]) { walkTo(sx, sz); sim(2); const P = V.navPlan(G(), sx, sz, tx, tz); G().path = null; G().goal = null;
      let bad = 0, n = 0; if (P) { let px = sx, pz = sz; for (const q of P.pts) { const L = Math.hypot(q.x - px, q.z - pz), m = Math.ceil(L / 0.05); for (let k = 1; k <= m; k++) { n++; if (!G().inb(px + (q.x - px) * k / m, pz + (q.z - pz) * k / m)) bad++; } px = q.x; pz = q.z; } }
      o.taps.push({ plan: !!P, goal: P && [+P.goal.x.toFixed(2), +P.goal.z.toFixed(2)], bad, n }); }
    { walkTo(-1.5, -5.5); sim(40); const q = V.homeScreen(new THREE.Vector3(-6.0, 0, -10.5)); const hit = V.homeTap(q.x, q.y); o.ft0 = [V.IA.pending, Math.round(q.x), Math.round(q.y)]; let f2 = 0, off2 = 0; while (G().path && f2 < 900) { sim(1); f2++; if (!G().inb(G().x, G().z)) off2++; } o.floorTap = { hit, pend: o.ft0[0], f2, off2, at: [+G().x.toFixed(2), +G().z.toFixed(2)], q: [Math.round(q.x), Math.round(q.y)] }; }
    // solid: the walk pad can't push her through the corridor walls, the room walls or into the dais
    o.pad = {}; for (const [k, x, z, d] of [['corridor', -2.72, -3.4, 'l'], ['corridor2', -2.72, -3.4, 'r'], ['roomFront', -2.0, -12.0, 'u'], ['roomSide', -7.2, -8.0, 'l'], ['dais', -2.5, -6.6, 'd']]) { walkTo(x, z); G().path = null; sim(2); V.setClimbDir(d); let off3 = 0, dmin = 9; for (let i = 0; i < 90; i++) { sim(1); if (!G().inb(G().x, G().z)) off3++; dmin = Math.min(dmin, Math.hypot(G().x - K.T.position.x, G().z - K.T.position.z)); } V.setClimbDir('stop'); sim(2); o.pad[k] = { off3, at: [+G().x.toFixed(2), +G().z.toFixed(2)], dmin: +dmin.toFixed(2) }; }
    // the camera stays in the house while she is through the walkway: the house's back half (furnace, anvil ...), ceiling and corridor are cut away, and come back
    { walkTo(-2.5, -6.6); G().path = null; sim(6); const fv = HM.furnace.visible && HM.anvil.visible, cut = [HM.furnace.visible, HM.anvil.visible, HM.ceil ? HM.ceil.visible : false, K.walls.corr.every((m) => m.visible)];
      walkTo(-1.5, 1.0); sim(6); o.cut = { inRoom: cut, back: [HM.furnace.visible, HM.anvil.visible, HM.walls.back.visible, K.walls.corr.every((m) => m.visible)] }; }
    // the screen
    const q = (s) => document.querySelector('#skillTree ' + s), qa = (s) => [...document.querySelectorAll('#skillTree ' + s)], click = (s) => { const e = q(s); if (e && !e.disabled) { e.click(); return true; } return false; };
    const box = (e) => { const R = e.getBoundingClientRect(); return { w: R.width, h: R.height, l: R.left, r: R.right, t: R.top, b: R.bottom }; };
    const lv0 = Combat.level(), xp0 = S.combat.xp, sk0 = JSON.stringify(S.skill || {}); Combat.resetTree(); Combat.setLevel(26);
    SkillTree.open(); o.ov = { view: SkillTree.view, title: (q('.stT') || {}).textContent, br: qa('[data-st=branch]').map((e) => [e.dataset.b, e.textContent.trim(), e.classList.contains('lk')]), pts: q('[data-st=pts]') && +q('[data-st=pts]').dataset.n, left: Combat.pointsLeft(),
      stats: /combat stats|Stats|Combat Lv|Combat level|\bLv\b/i.test(q('.stS').textContent), mining: /Mining/i.test(q('.stS').textContent), lumen: !!q('svg.stTree .stTrunk') };
    for (const k of ['production', 'beasts']) { click(`[data-st=branch][data-b=${k}]`); o.ov[k] = SkillTree.view; }
    click('[data-st=branch][data-b=combat]'); o.cb = { view: SkillTree.view, nodes: qa('[data-st=node]').map((e) => e.dataset.id), subs: qa('.stSub').map((e) => e.textContent), stats: /Combat Lv|\bStats\b|Combat level/i.test(q('.stS').textContent), hb: q('[data-st=node][data-id=heavy_blow]').dataset.state };
    // spend: Strength x3 through the stepper, Confirm -> 3 ranks in the module, 3 fewer points; heavy blow locked until 20 in Might
    click('[data-st=node][data-id=strength]'); click('[data-st=plus]'); click('[data-st=plus]'); o.k = q('[data-st=k]').textContent; click('[data-st=confirm]'); o.str = [Combat.nodeState('strength').ranks, Combat.pointsLeft(), +q('[data-st=pts]').dataset.n, q('[data-st=cur]').textContent];
    click('[data-st=node][data-id=heavy_blow]'); o.hbLocked = [q('[data-st=confirm]').disabled, Combat.nodeState('heavy_blow').why, /Needs 20 in Might/.test(q('[data-st=sheet]').textContent)];
    click('[data-st=node][data-id=strength]'); for (let i = 0; i < 16; i++) click('[data-st=plus]'); o.k2 = q('[data-st=k]').textContent; click('[data-st=confirm]'); o.str2 = [Combat.nodeState('strength').ranks, Combat.reqSpent('might'), Combat.pointsLeft()];
    o.hbState = q('[data-st=node][data-id=heavy_blow]').dataset.state; click('[data-st=node][data-id=heavy_blow]'); const pl = Combat.pointsLeft(); click('[data-st=confirm]'); o.hb = [Combat.nodeState('heavy_blow').ranks, pl - Combat.pointsLeft(), q('[data-st=node][data-id=heavy_blow]').dataset.state];
    // refund: strength can't drop below the 20 heavy blow needs; heavy blow refunds its 5
    click('[data-st=node][data-id=strength]'); o.strRf = [q('[data-st=refund]').disabled, Combat.nodeState('strength').canRemove];
    click('[data-st=node][data-id=heavy_blow]'); const pl2 = Combat.pointsLeft(); click('[data-st=refund]'); o.hbRf = [Combat.nodeState('heavy_blow').ranks, Combat.pointsLeft() - pl2];
    click('[data-st=node][data-id=strength]'); click('[data-st=refund]'); o.strRf2 = [Combat.nodeState('strength').ranks, Combat.nodeState('heavy_blow').reqMet, q('[data-st=node][data-id=heavy_blow]').dataset.state];
    // out of points: the rest of the points into Vigor; then Confirm is off and the sheet says why
    click('[data-st=node][data-id=vigor]'); for (let i = 0; i < 60; i++) click('[data-st=plus]'); o.vk = +q('[data-st=k]').textContent; click('[data-st=confirm]'); o.vig = [Combat.pointsLeft(), q('[data-st=confirm]').disabled, /Not enough skill points/.test(q('[data-st=sheet]').textContent)];
    o.saved = (S.skill || {}).vigor;
    // iPhone: 44 px targets, inside the screen
    o.touch = qa('button').filter((e) => e.offsetParent).map(box).map((x) => [Math.round(x.w), Math.round(x.h), Math.round(x.l), Math.round(x.r), Math.round(x.b)]);
    o.touchOk = o.touch.every(([w, h, l, rr]) => w >= 44 && h >= 44 && l >= 0 && rr <= innerWidth + 0.5);
    click('[data-st=back]'); o.backV = SkillTree.view; click('[data-st=close]'); o.closed = !document.querySelector('#skillTree.on');
    Combat.resetTree(); S.combat.xp = xp0; S.skill = JSON.parse(sk0); if (typeof save === 'function') save(); return o; }).catch((e) => ({ err: e.message + ' ' + e.stack }));
  console.log(JSON.stringify(r).slice(0, 3000));
  ok(!r.err, 'ran ' + (r.err || ''));
  if (!r.err) {
    ok(r.room.ok && r.room.vis && r.room.walls && r.room.branches === 'combat,production,beasts' && r.room.braid === 3, `the Skill Tree room: built, shown inside, 4 walls + ceiling, red / blue / yellow branches, a 3-strand braid ${JSON.stringify(r.room)}`);
    ok(r.size.w > r.size.house[0] && r.size.d > r.size.house[1], `much larger than the house ${JSON.stringify(r.size)}`);
    ok(!r.door.obs && !r.arch.through && r.arch.beside, `the old door is gone: an open walkway through the back wall ${JSON.stringify([r.door, r.arch])}`);
    ok(r.tree.hover > 0.4 && r.tree.bob > 0.005 && r.tree.braid0 < 0.05 && r.tree.braidEnd < 0.2 && r.tree.endY > 0.7, `the tree hovers and bobs; the braid runs from under it to the Tether Orb ${JSON.stringify(r.tree)}`);
    ok(r.walk.opened === 'stree' && r.walk.ui && r.walk.off === 0 && r.walk.corr > 0 && r.walk.minR > 1.6, `tap the tree from the front door: she walks through the walkway (always on the floor, not into the dais) and the Skill Tree opens ${JSON.stringify(r.walk)}`);
    ok(r.taps.every((t) => t.plan && t.bad === 0), `paths between the house and the room's corners stay on the floor ${JSON.stringify(r.taps)}`);
    ok(r.floorTap.hit && !r.floorTap.pend && r.floorTap.off2 === 0 && Math.hypot(r.floorTap.at[0] + 6, r.floorTap.at[1] + 10.5) < 0.3, `a floor tap inside the room walks her there ${JSON.stringify(r.floorTap)}`);
    ok(Object.values(r.pad).every((x) => x.off3 === 0 && x.dmin > 1.6), `the walk pad can't take her through walls or into the dais ${JSON.stringify(r.pad)}`);
    ok(!r.cut.inRoom.some(Boolean) && r.cut.back.every(Boolean), `cutaway of the house while she is in the room, restored after ${JSON.stringify(r.cut)}`);
    ok(r.ov.view === 'tree' && r.ov.title === 'Skill Tree' && r.ov.lumen && r.ov.pts === r.ov.left && r.ov.left === 26, `tree screen: lumenite tree, points from the combat module ${JSON.stringify(r.ov)}`);
    ok(JSON.stringify(r.ov.br.map((x) => [x[0], x[2]])) === JSON.stringify([['combat', false], ['production', true], ['beasts', true]]) && /Production/.test(r.ov.br[1][1]) && /Tether Beasts/.test(r.ov.br[2][1]) && !r.ov.mining && r.ov.production === 'tree' && r.ov.beasts === 'tree', `branches: Combat open; Production (not Mining) and Tether Beasts locked and blank`);
    ok(!r.ov.stats && !r.cb.stats, 'no combat stats panel, no Combat level badge');
    ok(r.cb.view === 'combat' && r.cb.nodes.length === 12 && r.cb.subs.join() === 'MIGHT,VITALITY,SPOILS' && r.cb.hb === 'locked', `Combat: 12 nodes in Might / Vitality / Spoils, heavy blow locked ${JSON.stringify(r.cb)}`);
    ok(r.k === '3' && JSON.stringify(r.str) === JSON.stringify([3, 23, 23, '3']), `spend 3 in Strength ${JSON.stringify(r.str)}`);
    ok(r.hbLocked[0] && r.hbLocked[1] === 'req' && r.hbLocked[2], `heavy blow needs 20 in Might ${JSON.stringify(r.hbLocked)}`);
    ok(r.k2 === '17' && JSON.stringify(r.str2) === JSON.stringify([20, 20, 6]) && r.hbState === 'available' && JSON.stringify(r.hb) === JSON.stringify([1, 5, 'maxed']), `20 in Might unlocks heavy blow, 5 points ${JSON.stringify([r.k2, r.str2, r.hbState, r.hb])}`);
    ok(r.strRf[0] && !r.strRf[1] && JSON.stringify(r.hbRf) === JSON.stringify([0, 5]) && r.strRf2[0] === 19 && r.strRf2[1] === false && r.strRf2[2] === 'locked', `refunds follow the module's rules ${JSON.stringify([r.strRf, r.hbRf, r.strRf2])}`);
    ok(r.vk === 7 && r.vig[0] === 0 && r.vig[1] && r.vig[2] && r.saved === 7, `out of points: Confirm off, says why; saved on S ${JSON.stringify([r.vk, r.vig, r.saved])}`);
    ok(r.touchOk && r.touch.length >= 6, `44 px touch targets inside the iPhone screen ${JSON.stringify(r.touch)}`);
    ok(r.backV === 'tree' && r.closed, 'back to the tree, close');
  }
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 3).join(' | '));
  await b.close(); console.log(fails ? `${fails} FAILED` : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();

// The town's people: six keepers stand by their doors (solid, reachable, idle-animated); tapping one walks her up and opens the field-kit
// dialogue with the keeper's portrait; pages advance; the bank's "Open the vault" opens the vault; the store's Buy / Sell open a placeholder; Goodbye closes.
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html', SHOT = process.env.SHOT || '';
(async () => { const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await (await b.newContext({ viewport: { width: 540, height: 900 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(800); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 300000, polling: 1000 }); await p.waitForTimeout(500);
  const snap = async (f) => { if (!SHOT) return; await p.evaluate(() => document.getAnimations().forEach((a) => { try { if (a.effect && a.effect.getTiming().iterations !== Infinity) a.finish(); } catch (e) {} })); await p.screenshot({ path: `${SHOT}/${f}.jpg`, type: 'jpeg', quality: 86 }); };
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  // the keepers are the CC0 NPC kit (assets/models/npc_kit.glb, loaded async): wait for it, then check rig / atlas / LOD budgets
  await p.evaluate(() => { Explore.build(); Town.tick(); Town.folk.tick(); });
  await p.waitForFunction(() => { Town.tick(); Town.folk.tick(); return Town.folk.ST.built; }, null, { timeout: 60000, polling: 250 });
  const o = await p.evaluate(() => { const T = Town, F = T.folk;
    const L = F.ST.list, door = W.playerDoor || W.player; const r = { n: L.length, people: [], kit: L.every((n) => n.kit), gb: NpcKit.ST.bytes };
    for (const n of L) { const route = Explore.plan(door.x, door.y, n.sp.talk[0], n.sp.talk[1]), pts = route && route.pts, end = pts && pts.length ? Math.hypot(pts[pts.length - 1][0] - n.sp.talk[0], pts[pts.length - 1][1] - n.sp.talk[1]) / T.WS : 99;
      const k = n.kit || {}, img = k.mesh && k.mesh.material.map && k.mesh.material.map.image;
      r.people.push({ id: n.id, solid: !!Explore.solidAt(n.x, n.y), end: +end.toFixed(1), climb: route ? route.climb : -1, tris: Math.round(n.tris), lods: n.lodTris, h: +(n.hgt / T.WS).toFixed(2),
        skinned: !!(k.mesh && k.mesh.isSkinnedMesh && k.outline && k.outline.isSkinnedMesh), bones: k.mesh ? k.mesh.skeleton.bones.length : 0, atlas: img ? [img.width, img.height] : [0, 0], art: /^art:/.test((NpcKit.ST.keepers[n.id] || {}).extras && NpcKit.ST.keepers[n.id].extras.look || ''), site: (() => { const B = T.BLD.find((b) => b.npc === n.id), w = B && T.SITE_PLAN && T.local(B, ...T.SITE_PLAN[B.id].keeper); return w ? +(Math.hypot(n.x - w[0], n.y - w[1]) / T.WS).toFixed(2) : 99; })() }); }
    // idle: the library idle clip moves the spine over time
    const n0 = L[0], sp = n0.kit && (n0.kit.bones.spine_02 || n0.kit.bones.spine_01), q0 = sp ? sp.quaternion.clone() : null; const t2 = performance.now(); while (performance.now() - t2 < 400); F.tick();
    r.idle = sp ? 1 - Math.abs(q0.dot(sp.quaternion)) : 0; r.noBank = !T.BLD.some(b => b.id === 'bank') && !L.some(n => n.id === 'ambrose'); r.noBran = !L.some(n => n.id === 'brannick'); return r; });
  console.log(JSON.stringify(o));
  ok(o.noBank, 'no bank or Ambrose'); ok(o.noBran, 'Brannick is not in the village (he keeps the Tether Mill)'); ok(o.n === 4, `four townsfolk, no Ambrose or Brannick (${o.n})`); ok(o.kit, `all four keepers built from the NPC kit (${(o.gb / 1024).toFixed(0)} KB glb)`); ok(o.idle > 1e-7, `idle clip moves (${o.idle.toExponential(2)})`);
  const BUD = { goldie: 6000, brannick: 6000, tess: 6000, hattie: 6000, fennick: 6000 };
  for (const q of o.people) { ok(q.skinned && q.bones >= 20 && q.bones <= 40 + 4, `${q.id}: one skinned mesh + ink outline, ${q.bones} bones`); ok(q.atlas[0] === 1024 && q.atlas[1] === 1024, `${q.id}: one 1024 atlas (${q.atlas.join('x')})`);
    ok(q.art, `${q.id}: on Art's look kit`); ok(q.lods[1] <= q.tris * 0.52 && q.lods[2] <= Math.ceil(q.tris * 0.2) + 1, `${q.id}: LOD topology ${q.lods.join('/')} tris (far LOD <= 20%)`); ok(q.solid, `${q.id}: solid`); ok(q.site < 0.5, `${q.id}: stands on Art's keeper spot at their valley site (${q.site} m off)`); ok(q.end < 3 && q.climb === 0, `${q.id}: reachable from the Ledge (talk spot ${q.end} m off, climb ${q.climb})`); ok(q.tris > 2500 && q.tris <= BUD[q.id], `${q.id}: ${q.tris} tris at LOD0 (${q.h} m tall)`); }
  for (const id of ['goldie', 'fennick']) {
    const s = await p.evaluate((id) => { const n = Town.folk.ST.list.find((q) => q.id === id), [x, y] = n.sp.talk, dx = x - n.x, dy = y - n.y, l = Math.hypot(dx, dy); Explore.enter(x + dx / l * Town.WS * 4, y + dy / l * Town.WS * 4); const E = Explore.EX; E.d = 70; E.tilt = 0.6; E.az = Math.atan2(dx, dy); for (let k = 0; k < 30; k++) Explore.tick(1 / 30); return id; }, id);
    await p.waitForTimeout(1200);
    const r = await p.evaluate((id) => { const n = Town.folk.ST.list.find((q) => q.id === id), a = M3.project(n.x, n.y, n.hgt * 0.85); return { a, r: Explore.tap(a[0], a[1]) }; }, id);
    await p.evaluate(() => { for (let k = 0; k < 600 && Town.folk.ST.walking; k++) Explore.tick(1 / 30); }); await p.waitForTimeout(1500);
    const d = await p.evaluate(() => { const e = document.getElementById('townDlg'); return e && { on: !e.classList.contains('hidden'), txt: e.querySelector('.tdWell p').textContent, img: e.querySelector('.tdPort').style.backgroundImage, name: e.querySelector('.tdName').textContent, who: Town.folk.ST.talk && Town.folk.ST.talk.id }; });
    ok(r.r === 'npc' && d && d.on && d.who === id && d.img.includes(id + '_'), `tap ${id} (${r.r}): walks up, dialogue opens with the expression portrait (${d && d.name}: "${d && d.txt.slice(0, 40)}...")`);
    await snap(`town-dlg-${id}`);
    if (!d || !d.on) continue;
    await p.click('#townDlg .tdWell p'); const last = await p.evaluate(() => [...document.querySelectorAll('#townDlg .tdBtns button')].map((b) => b.dataset.a));
    ok(last.includes('bye'), `${id}: tapping advances to the last page with its choices (${last.join(', ')})`);
    if (id === 'goldie') { await snap(`town-dlg-goldie-choice`); await p.click('#townDlg [data-a=buy]'); await p.waitForTimeout(400); const k = await p.evaluate(() => ui.modal); ok(k === 'town-shop', `the store's Buy opens the placeholder shop (${k})`); await snap(`town-shop-buy`); await p.evaluate(() => closeModal()); }
    else { await p.click('#townDlg [data-a=bye]'); const h = await p.evaluate(() => document.getElementById('townDlg').classList.contains('hidden')); ok(h, 'Goodbye closes the dialogue'); } }
  const dc = await p.evaluate(() => Town.ST.g.children.filter((m) => m.isMesh).length); ok(dc <= 30, `town + folk draw calls ${dc}`);
  ok(!errs.length, 'no page errors ' + errs.join(' | ')); console.log(fails ? fails + ' FAIL' : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0); })();

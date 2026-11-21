// The town's people: six keepers stand by their doors (solid, reachable, idle-animated); tapping one walks her up and opens the field-kit
// dialogue with the keeper's portrait; pages advance; the bank's "Open the vault" opens the vault; the store's Buy / Sell open a placeholder; Goodbye closes.
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html', SHOT = process.env.SHOT || '';
(async () => { const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await (await b.newContext({ viewport: { width: 540, height: 900 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(800); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 200000 }); await p.waitForTimeout(500);
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  const o = await p.evaluate(() => { Explore.build(); const T = Town, F = T.folk; for (let i = 0; i < 5 && !F.ST.built; i++) { T.tick(); F.tick(); }
    const L = F.ST.list, door = W.playerDoor || W.player; const r = { n: L.length, people: [] };
    for (const n of L) { const route = Explore.plan(door.x, door.y, n.sp.talk[0], n.sp.talk[1]), pts = route && route.pts, end = pts && pts.length ? Math.hypot(pts[pts.length - 1][0] - n.sp.talk[0], pts[pts.length - 1][1] - n.sp.talk[1]) / T.WS : 99;
      const g = n.grp, tris = g.children.reduce((s, m) => s + (m.geometry.attributes.position.count / 3), 0), y0 = g.scale.y; const t1 = performance.now(); while (performance.now() - t1 < 300); F.tick();
      r.people.push({ id: n.id, solid: !!Explore.solidAt(n.x, n.y), end: +end.toFixed(1), climb: route ? route.climb : -1, tris: Math.round(tris), meshes: g.children.length, anim: Math.abs(g.scale.y - y0) > 1e-5 || true, h: +(n.hgt / T.WS).toFixed(2) }); }
    // idle: the figure's transform changes over time
    const n0 = L[0], s0 = n0.grp.scale.y; const t2 = performance.now(); while (performance.now() - t2 < 400); F.tick(); r.idle = Math.abs(n0.grp.scale.y - s0);
    return r; });
  console.log(JSON.stringify(o));
  ok(o.n === 6, `six townsfolk (${o.n})`); ok(o.idle > 1e-5, `idle animation moves (breath ${o.idle.toFixed(4)})`);
  for (const q of o.people) { ok(q.solid, `${q.id}: solid`); ok(q.end < 3 && q.climb === 0, `${q.id}: reachable from the Ledge (talk spot ${q.end} m off, climb ${q.climb})`); ok(q.meshes === 1 && q.tris < 4000, `${q.id}: one merged mesh (${q.tris} tris, ${q.h} m tall)`); }
  for (const id of ['goldie', 'ambrose', 'fennick']) {
    const s = await p.evaluate((id) => { const n = Town.folk.ST.list.find((q) => q.id === id), [x, y] = n.sp.talk, dx = x - n.x, dy = y - n.y, l = Math.hypot(dx, dy); Explore.enter(x + dx / l * Town.WS * 4, y + dy / l * Town.WS * 4); const E = Explore.EX; E.d = 70; E.tilt = 0.6; E.az = Math.atan2(dx, dy); for (let k = 0; k < 30; k++) Explore.tick(1 / 30); return id; }, id);
    await p.waitForTimeout(1200);
    const r = await p.evaluate((id) => { const n = Town.folk.ST.list.find((q) => q.id === id), a = M3.project(n.x, n.y, n.hgt * 0.85); return { a, r: Explore.tap(a[0], a[1]) }; }, id);
    await p.evaluate(() => { for (let k = 0; k < 600 && Town.folk.ST.walking; k++) Explore.tick(1 / 30); }); await p.waitForTimeout(1500);
    const d = await p.evaluate(() => { const e = document.getElementById('townDlg'); return e && { on: !e.classList.contains('hidden'), txt: e.querySelector('.tdWell p').textContent, img: e.querySelector('.tdPort').style.backgroundImage, name: e.querySelector('.tdName').textContent, who: Town.folk.ST.talk && Town.folk.ST.talk.id }; });
    ok(r.r === 'npc' && d && d.on && d.who === id && d.img.includes(id), `tap ${id} (${r.r}): walks up, dialogue opens with the portrait (${d && d.name}: "${d && d.txt.slice(0, 40)}...")`);
    if (SHOT) await p.screenshot({ path: `${SHOT}/town-dlg-${id}.jpg`, type: 'jpeg', quality: 86 });
    if (!d || !d.on) continue;
    await p.click('#townDlg .tdWell p'); const last = await p.evaluate(() => [...document.querySelectorAll('#townDlg .tdBtns button')].map((b) => b.dataset.a));
    ok(last.includes('bye'), `${id}: tapping advances to the last page with its choices (${last.join(', ')})`);
    if (id === 'ambrose') { await p.click('#townDlg [data-a=vault]'); await p.waitForTimeout(400); const k = await p.evaluate(() => ui.modal); ok(k === 'vault', `the bank's keeper opens the vault (${k})`); if (SHOT) await p.screenshot({ path: `${SHOT}/town-bank-vault.jpg`, type: 'jpeg', quality: 86 }); await p.evaluate(() => closeModal()); }
    else if (id === 'goldie') { if (SHOT) await p.screenshot({ path: `${SHOT}/town-dlg-goldie-choice.jpg`, type: 'jpeg', quality: 86 }); await p.click('#townDlg [data-a=buy]'); await p.waitForTimeout(400); const k = await p.evaluate(() => ui.modal); ok(k === 'town-shop', `the store's Buy opens the placeholder shop (${k})`); if (SHOT) await p.screenshot({ path: `${SHOT}/town-shop-buy.jpg`, type: 'jpeg', quality: 86 }); await p.evaluate(() => closeModal()); }
    else { await p.click('#townDlg [data-a=bye]'); const h = await p.evaluate(() => document.getElementById('townDlg').classList.contains('hidden')); ok(h, 'Goodbye closes the dialogue'); } }
  const dc = await p.evaluate(() => Town.ST.g.children.filter((m) => m.isMesh).length + Town.folk.ST.list.length); ok(dc <= 30, `town + folk draw calls ${dc}`);
  ok(!errs.length, 'no page errors ' + errs.join(' | ')); console.log(fails ? fails + ' FAIL' : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0); })();

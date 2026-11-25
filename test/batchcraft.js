// Furnace / anvil batch crafting (t591u + t592u, Dominic): a quantity picker (1 / 5 / 10 / All, − / +, typed) capped at what the BACKPACK can make - its
// ingredients and its room for the output - with no fixed cap (no 100 limit) and never the vault; then one item at a time, BATCH_MS (exactly 1 s, t599u) each,
// with a progress bar and Cancel; stopping keeps what was made. t600u: starting closes the window; a HUD pill (icon, n / N, the item's bar
// driven from game time, 44 px Cancel) shows until done. t434 (Art's station screens, Dominic): default / selected / quantity screens (4x2 recipe grid with
// Max N / Need more / Unlock Lv N, backpack ingredients, Qty chip, − / typed / + and 1 / 5 / 10 / All, Start); no job screen - tapping the furnace while she
// works keeps the window shut and the pill is the only progress. iPhone viewport: 44 px touch targets, nothing past the screen edge. t599u / t603u: for the whole batch Wren works, one loop per item, then stops: at the anvil Theus' own hammer strike retargeted to her, at the
// furnace a deep knee-and-waist bend placing the item in and drawing it out (CC0 UAL2 Farm_PlantSeed).
// t623u (Dominic): geometry checks, no renders - at the anvil her arm chain is rotation-only (upper arm / forearm bone lengths constant, shoulder socket gap 0)
// and the hammer still lands on the anvil; at the furnace she stands further back and no vertex of her body or what she carries is inside the furnace's
// collision volumes (sill, step, plinth, arch / jambs, dome) - only her hands may enter the open mouth. t624u: one Smithing table (Skills.SMITH_LEVELS) for a
// grade's bar and its pickaxe, enforced on make / maxMake / batchStart / a running batch, with "Unlock Lv N" on the screens.
// t625u: moving her away (a tap elsewhere, the walk pad, past WK_AWAY, out the door) cancels the batch like Cancel; the elbows only flex (5-150 deg, own
// hinge, never past straight) and the anvil strike is a full-arm swing (>= 70 deg of upper-arm travel).
const { chromium } = require('playwright-core');
// (in-page) her mesh vs the furnace's collision volumes, in furnace-local space
const FURN_HITS = `window.__furnHits = function () { const V = CharView, F = V.HM.furnace, rig = V.rig, B = rig.B, ZS = 0.86, MW = 0.4, MS = 0.3, AH = 0.5, DTOP = 1.02, AC = MS + AH - MW;
  const prof = (y) => y < 0.32 ? 0.9 - 0.03 * (y - 0.2) / 0.12 : 0.24 + 0.63 * Math.pow(Math.cos(Math.PI / 2 * Math.min(1, (y - 0.32) / (DTOP - 0.32))), 0.55);
  const HAND = new Set([B.hdR, B.knR, B.tpR, B.thumbR, B.hdL, B.knL, B.tpL, B.thumbL]); F.updateMatrixWorld(true); rig.root.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(F.matrixWorld).invert(), v = new THREE.Vector3();
  const cav = (x, y, z) => z > 0 && z < 0.86 && Math.abs(x) < MW && y > MS && (y < AC || Math.hypot(x, y - AC) < MW);
  const solid = (x, y, z, hand) => { if (Math.abs(x) < 0.48 && y > MS - 0.06 && y < MS && z > 0.54 && z < 0.9) return 'sill'; if (Math.abs(x) < 1.0 && y > 0.01 && y < 0.21 && z > 0.77 && z < 1.09) return 'step';
    const rho = Math.hypot(x, z / ZS); if (y < 0.21 && rho < 1.05) return 'plinth';
    if (z > 0.66 && z < 0.86 && ((y >= AC && Math.hypot(x, y - AC) >= MW && Math.hypot(x, y - AC) < MW + 0.15) || (y < AC && y > MS - 0.06 && Math.abs(x) >= MW && Math.abs(x) < MW + 0.14))) return 'frame';
    if (y >= 0.2 && y <= DTOP + 0.03 && rho < prof(y) + 0.03) { if (cav(x, y, z)) return hand ? null : 'mouth'; return 'dome'; } return null; };
  const out = { hit: {}, nHit: 0, handIn: 0, nV: 0, zMin: 9 };
  rig.root.traverse((m) => { if (!m.isMesh || !m.visible || !m.geometry || !m.geometry.attributes.position) return; let vis = true; for (let o = m; o; o = o.parent) if (o.visible === false) { vis = false; break; } if (!vis) return;
    if (m.material && m.material.side === THREE.BackSide) return; /* (ink outlines) */ let anc = null, own = m.parent; for (let o = m.parent; o && o !== rig.root; o = o.parent) if (HAND.has(o)) { anc = o; break; }
    const P = m.geometry.attributes.position, SI = m.geometry.attributes.skinIndex, SW = m.geometry.attributes.skinWeight;
    for (let i = 0; i < P.count; i += 2) { v.fromBufferAttribute(P, i); let hand = !!anc, bn = own;
      if (m.isSkinnedMesh) { m.boneTransform(i, v); let bi = 0, bw = -1; for (let j = 0; j < 4; j++) { const w = SW.array[i * 4 + j]; if (w > bw) { bw = w; bi = SI.array[i * 4 + j]; } } bn = m.skeleton.bones[bi]; if (HAND.has(bn)) hand = true; }
      v.applyMatrix4(m.matrixWorld).applyMatrix4(inv); out.nV++; const k = solid(v.x, v.y, v.z, hand); if (hand && cav(v.x, v.y, v.z)) out.handIn++; if (hand) out.zMin = Math.min(out.zMin, v.z);
      if (k) { out.nHit++; let nb = bn; while (nb && !/^(hips|spine|chest|neck|head|shoulder|upperArm|forearm|hand|thigh|shin|foot|knuckles|tips|thumb)/.test(nb.name || '')) nb = nb.parent; const key = k + ':' + ((nb && nb.name) || '?'); out.hit[key] = (out.hit[key] || 0) + 1; } } });
  out.zMin = +out.zMin.toFixed(3); return out; };`;
const URL = process.env.URL || 'http://localhost:8765/index.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(1000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 200000 }).catch(() => {});
  const r = await p.evaluate(async () => { const C = Craft, o = {}, wait = (ms) => new Promise((q) => setTimeout(q, ms)), q = (s) => document.querySelector('#modalBody ' + s), B = 'ingot:bronze', R0 = C.SMELT[0];
    const vsnap = () => JSON.stringify(S.ledgeVault || {}), /* (the vault's item contents only: S.res iron / coal / steel move with mining) */ empty = () => { try { closeModalQuiet(); } catch (e) {} S.backpack = {}; S.bagOrder = null; C.order('bag'); };
    const hud = () => document.getElementById('cxHud'), hudOn = () => { const h = hud(); return !!(h && !h.classList.contains('hidden') && h.getBoundingClientRect().height > 0); }, hq = (s) => hud() && hud().querySelector(s);
    const click = (sel) => { const e = q(sel); if (e && !e.disabled) { e.click(); return true; } return false; };
    o.ms = C.BATCH_MS; empty();
    // the vault never counts: plenty of copper and tin in the vault, none in the backpack -> nothing to make
    C.add('vault', 'ore:copper', 5000); C.add('vault', 'ore:tin', 5000); const vb = C.VBLOCK.length, v0 = vsnap();
    C.open('furnace'); o.vaultOnly = [C.maxMake(R0), /Need more/.test((q('[data-cx=make][data-i="0"]') || {}).textContent || '')];
    // no 100 cap: 150 bars' worth in the backpack
    C.add('bag', 'ore:copper', 300); C.add('bag', 'ore:tin', 150); o.big = C.maxMake(R0); C.open('furnace'); click('[data-cx=make][data-i="0"]'); click('[data-cx=bqo]'); click('[data-cx=bq][data-v=all]'); o.bigAll = [q('.cxbn') && q('.cxbn').value, ((q('.smGs') || {}).textContent || '').split(' ')[0]];
    // iPhone: picker controls are 44 px touch targets inside the screen
    o.touch = [...document.querySelectorAll('#modalBody .smS button, #modalBody .cxbn')].map((e) => { const R = e.getBoundingClientRect(); return [Math.round(R.height), Math.round(R.left), Math.round(R.right), Math.round(R.bottom)]; });
    o.inside = o.touch.length >= 8 && o.touch.every(([h, l, rr, bb]) => h >= 44 && l >= 0 && rr <= innerWidth && bb <= innerHeight);
    // Art's screens (t434): Smithing Lv 42 as in the mocks -> Bronze..Gold open, Mithril 55 / Rune 70 / Lumen 100 / Onyx 125 locked
    { const sx0 = S.skills ? S.skills.smithing : undefined; S.skills = S.skills || {}; let lo = 0, hi = 1e9; while (hi - lo > 1) { const m = Math.floor((lo + hi) / 2); S.skills.smithing = m; if (Skills.level('smithing') >= 42) hi = m; else lo = m; } S.skills.smithing = hi;
      const cells = () => [...document.querySelectorAll('#modalBody .smGrid .smC')], scr = () => (q('.smS') || { dataset: {} }).dataset.st, img = () => { const e = q('.smHero img'); return e ? e.getAttribute('src') : ''; }, go = () => q('[data-cx=bgo]');
      const sc = {}; for (const k of ['furnace']) { C.open(k); const R = (k === 'furnace' ? C.SMELT : C.SMITH.filter((x) => x.tool === 'pick'));
        const d = { st: scr(), n: cells().length, outs: cells().map((e) => e.dataset.out).join() === R.map((x) => x.out).join(), lab: cells().map((e) => e.querySelector('small').textContent).join('|'), lk: cells().map((e) => (e.disabled ? 1 : 0)).join(''), img: img(), go: [go().disabled, (q('.smGs') || {}).textContent], title: (q('.smT') || {}).textContent, x: !!q('.smX[data-cx=close]') };
        cells()[0].click(); d.sel = [scr(), cells().length, q('.smC.on') && q('.smC.on').dataset.out, document.querySelectorAll('#modalBody .smIng .smRow').length, (q('.smQc') || {}).textContent, go().disabled, !!q('.smOn i')];
        click('[data-cx=bqo]'); d.qty = [scr(), cells().length, !!q('.smSel [data-cx=bch]'), document.querySelectorAll('#modalBody .smPM').length, !!q('.cxbn'), [...document.querySelectorAll('#modalBody .smK')].map((e) => e.textContent + (e.disabled ? '-' : '')).join(), go().disabled];
        click('[data-cx=bch]'); d.back = [scr(), cells().length]; const L = cells()[5]; L.click(); d.lockTap = [scr(), !!(q('.smC.on') && q('.smC.on') !== L), C.batchStart(k, k === 'furnace' ? 5 : C.SMITH.indexOf(R[5]), 1), C.JOB.on]; sc[k] = d; try { closeModalQuiet(); } catch (e) {} }
      // (GD-14: Art's anvil v2) the anvil: category tiles (Pickaxe, Sword, 2 locked Coming soon), then each category's tier list - bar cost, Smith / Unlock Lv N, a − / qty / + stepper
      { C.add('bag', B, 6); /* (bars for 2 pickaxes / 3 swords) */ C.open('anvil'); const tiles = () => [...document.querySelectorAll('#modalBody .smCat')], rows = () => [...document.querySelectorAll('#modalBody .smRw')];
        const a = { st: scr(), title: (q('.smT') || {}).textContent, tiles: tiles().map((e) => e.dataset.v || (e.classList.contains('lk') ? 'soon' : '?')).join(), names: tiles().map((e) => e.textContent.trim()).join('|'), img: img(), x: !!q('.smX[data-cx=close]'), back: !!q('[data-cx=aback]'), go: !!q('[data-cx=bgo]'), rows: rows().length };
        for (const cat of ['pick', 'sword']) { click(`[data-cx=acat][data-v=${cat}]`); const R = C.SMITH.filter((x) => x.tool === cat), d = { st: scr(), cat: (q('.smS') || { dataset: {} }).dataset.cat, title: (q('.smT') || {}).textContent, back: !!q('[data-cx=aback]'), n: rows().length, outs: rows().map((e) => e.dataset.out).join() === R.map((x) => x.out).join(),
            cost: rows().map((e) => (e.querySelector('.smCo').textContent.match(/×\s*(\d+)/) || [])[1]).join(), lab: rows().map((e) => e.querySelector('.lv') ? e.querySelector('.lv').textContent : e.querySelector('[data-cx=bgo]') ? e.querySelector('[data-cx=bgo]').textContent + (e.querySelector('[data-cx=bgo]').disabled ? '-' : '') : '?').join('|'), lk: rows().map((e) => (e.classList.contains('lk') ? 1 : 0)).join(''), img: img(), stepper0: document.querySelectorAll('#modalBody .smPM').length };
          rows()[0].querySelector('[data-cx=make]').click(); const on = () => q('.smRw.on'); d.sel = [scr(), on() && on().dataset.out, document.querySelectorAll('#modalBody .smRw.on .smPM').length, !!q('.smRw.on .cxbn'), ((on() && on().querySelector('em')) || {}).textContent, !!q('.smOn i'), rows().length];
          click('.smRw.on [data-cx=bq][data-v="+"]'); d.plus = +(q('.cxbn') || {}).value; click('.smRw.on [data-cx=bq][data-v="+"]'); click('.smRw.on [data-cx=bq][data-v="+"]'); click('.smRw.on [data-cx=bq][data-v="+"]'); d.capped = [+(q('.cxbn') || {}).value, C.maxMake(R[0]), !!(q('.smRw.on .smPM.p') && q('.smRw.on .smPM.p').disabled)];
          const L = rows()[5]; d.lockTap = [L.querySelector('[data-cx=make]').disabled, !L.querySelector('[data-cx=bgo]'), C.batchStart('anvil', C.SMITH.indexOf(R[5]), 1), C.JOB.on];
          click('[data-cx=aback]'); d.backTo = [scr(), tiles().length]; a[cat] = d; }
        sc.anvil = a; try { closeModalQuiet(); } catch (e) {} empty(); }
      o.screens = sc; if (sx0 === undefined) delete S.skills.smithing; else S.skills.smithing = sx0; }
    // 7 bars' worth: picker 1 / 5 / All 7, − / +; make 3, timed
    empty(); C.add('bag', 'ore:copper', 14); C.add('bag', 'ore:tin', 7); C.open('furnace'); click('[data-cx=make][data-i="0"]'); click('[data-cx=bqo]'); o.cap = C.maxMake(R0);
    o.btns = [...document.querySelectorAll('#modalBody .smS [data-cx=bq]')].map((e) => e.dataset.v + (e.disabled ? '-' : '')).join(); click('[data-cx=bq][data-v="+"]'); click('[data-cx=bq][data-v="+"]'); o.n = +q('.cxbn').value;
    const t0 = performance.now(), times = []; let last = 0; click('[data-cx=bgo]'); { const X = hq('.cxhX'), R2 = X && X.getBoundingClientRect(), H = hud() && hud().getBoundingClientRect(), nav = document.querySelector('nav#tabs'), NR = nav && nav.getBoundingClientRect();
      o.running = [C.JOB.on, ui.modal === null && document.getElementById('modal').classList.contains('hidden'), hudOn(), (hq('.cxhN') || {}).textContent, !!(hq('.cxhI') && hq('.cxhI').querySelector('.cxico,.cxi')), R2 ? Math.round(R2.height) : 0, H ? [Math.round(H.left), Math.round(H.right), Math.round(H.bottom)] : null, NR ? Math.round(NR.top) : null, C.get('bag', B)]; }
    // (the item times are polled from the start; the bar is read at 0.5 s and 1.5 s inside the same loop, so the first gap is real)
    const ci = hq('.cxhB i'); let b1 = false, b2 = false; while (performance.now() - t0 < 6000) { await wait(25); const el = performance.now() - t0, n = C.get('bag', B); if (n > last) { times.push(Math.round(el)); last = n; }
      if (!b1 && el >= 500) { b1 = true; o.midBar = ci ? Math.round(parseFloat(ci.style.width)) : -1; o.midBarPx = ci ? Math.round(100 * ci.getBoundingClientRect().width / ci.parentElement.getBoundingClientRect().width) : -1; }
      if (!b2 && el >= 1500) { b2 = true; o.bar2 = [ci ? Math.round(parseFloat(ci.style.width)) : -1, (hq('.cxhN') || {}).textContent]; } if (!C.JOB.on) break; }
    o.times = times; o.made = C.get('bag', B); o.left = [C.get('bag', 'ore:copper'), C.get('bag', 'ore:tin')]; o.doneWhy = C.JOB.last && C.JOB.last.why;
    // Cancel keeps what was made: start All (4 left), cancel after the first one
    // (t434: tapping the furnace mid-job opens no window - the pill is the only progress - and the job runs on)
    C.open('furnace'); click('[data-cx=make][data-i="0"]'); click('[data-cx=bqo]'); click('[data-cx=bq][data-v=all]'); o.cap2 = +q('.cxbn').value; click('[data-cx=bgo]'); await wait(1300); const m1 = C.get('bag', B);
    o.reopen = [C.open('furnace'), ui.modal, hudOn(), C.JOB.on]; await wait(200); o.reclosed = [C.JOB.on, hudOn()];
    const hx = hq('.cxhX'); if (hx) hx.click(); await wait(1300);
    o.cancel = [m1, C.get('bag', B), C.JOB.on, C.JOB.last && C.JOB.last.why, C.get('bag', 'ore:copper'), C.get('bag', 'ore:tin')];
    o.hudGone = !hudOn();
    // the anvil: backpack room caps it. 3 ingots a Bronze Pickaxe, ingots for 5, but only one free slot (tools take a slot each) -> 1
    empty(); C.add('bag', 'tool:pick_iron', C.BAG_N - 2); C.add('bag', B, 15); const RP = C.SMITH.findIndex((x) => x.out === 'tool:pick_bronze'); C.open('anvil'); click('[data-cx=acat][data-v=pick]'); o.room = [C.maxMake(C.SMITH[RP]), C.order('bag').filter(Boolean).length];
    click(`[data-cx=make][data-i="${RP}"]`); click('.smRw.on [data-cx=bq][data-v="+"]'); click('.smRw.on [data-cx=bq][data-v="+"]'); o.roomPick = +(q('.cxbn') || {}).value; const pb0 = C.get('bag', 'tool:pick_bronze'); click(`[data-cx=bgo][data-i="${RP}"]`); o.anvilStart = [ui.modal, hudOn()]; await wait(1300); o.anvil = [C.get('bag', 'tool:pick_bronze') - pb0, C.get('bag', B), C.JOB.on];
    o.vault = [vsnap() === v0, C.VBLOCK.length - vb]; empty(); C.add('vault', 'ore:copper', -5000); return o; }).catch((e) => ({ err: e.message }));
  await p.addScriptTag({ content: FURN_HITS });
  // she works for the whole batch: walk up to the furnace (3 bars) and the anvil (2 picks) in the home scene, sample the work loop and her hands while it runs
  const w = await p.evaluate(async () => { const C = Craft, V = CharView, st = V.st, wait = (ms) => new Promise((q) => setTimeout(q, ms)), q = (s) => document.querySelector('#modalBody ' + s), out = {};
    try { closeModalQuiet(); } catch (e) {} document.querySelector('nav#tabs [data-tab=home]').click(); st.paused = true; V.sim(1 / 30, 30); if (V.HM.mode !== 'in') V.setHomeMode('in'); V.sim(1 / 30, 20);
    S.backpack = {}; S.bagOrder = null; C.add('bag', 'ore:copper', 6); C.add('bag', 'ore:tin', 3); C.add('bag', 'ingot:bronze', 6);
    const RP = C.SMITH.findIndex((x) => x.out === 'tool:pick_bronze'), loc = (b) => V.rig.root.worldToLocal(b.getWorldPosition(new THREE.Vector3()));
    for (const [k, i, n] of [['furnace', 0, 3], ['anvil', RP, 2]]) { if (k === 'anvil') C.add('bag', 'ingot:bronze', 6 - C.get('bag', 'ingot:bronze')); /* (ingots for exactly 2 picks) */ const I = V.IA.list.find((x) => x.key === k); V.IA.opened = null; I.tap(); let f = 0; while (V.IA.opened !== k && f < 400) { V.sim(1 / 30, 1); f++; }
      if (k === 'anvil') { const ac = q('[data-cx=acat][data-v=pick]'); if (ac) ac.click(); } const e = q(`[data-cx=make][data-i="${i}"]`); if (e) e.click(); if (k === 'anvil') { const pl = q('.smRw.on [data-cx=bq][data-v="+"]'); if (pl) pl.click(); } else { const qo = q('[data-cx=bqo]'); if (qo) qo.click(); const bq = q('[data-cx=bq][data-v=all]'); if (bq) bq.click(); } const g = q(k === 'anvil' ? `[data-cx=bgo][data-i="${i}"]` : '[data-cx=bgo]'); if (g) g.click(); /* (GD-14: the anvil opens on its tiles; a row's own Smith, 2 on the stepper) */
      const r = { opened: V.IA.opened, on0: C.JOB.on, closed0: ui.modal === null, hud0: !!(document.getElementById('cxHud') && !document.getElementById('cxHud').classList.contains('hidden')), s: [], items: new Set(), hips: [], rel: [], ham: [], pk: [], hit: 9, inMouth: 0, zMin: 9, arm: { R: [9, 0, 9, 0], L: [9, 0, 9, 0] }, gap: 0, elb: { R: [999, -999], L: [999, -999] }, elBad: 0, hgBad: 0, pit: [999, -999], fb: {}, fbN: 0, fHand: 0, fZ: 9, pkVis: 0, spot: +(st.gnd ? st.gnd.z - (k === 'furnace' ? V.SMITH.furnace.z : V.SMITH.anvil.z) : 0).toFixed(3), pick0: V.work.pickInHand, n0: V.work.n, t0: performance.now() }, hs = { R: [], L: [] };
      while (C.JOB.on && performance.now() - r.t0 < 6000) { V.sim(1 / 30, 1); const W = V.work; r.s.push([W.on, W.clip, +W.u.toFixed(2), W.item]); if (k === 'furnace' && r.s.length === 15) { I.tap(); for (let f2 = 0; f2 < 60 && ui.modal !== 'cx-furnace'; f2++) V.sim(1 / 30, 1); r.retap = [ui.modal, !!(document.getElementById('cxHud') && !document.getElementById('cxHud').classList.contains('hidden')), C.JOB.on]; try { closeModalQuiet(); } catch (e) {} } r.items.add(W.item); r.hips.push(W.hip || 0); r.ham.push(W.hammer ? (W.hammer.inHand ? 1 : 0) : -1); r.pk.push(W.pickInHand ? 1 : 0);
        if (W.hammer && V.HM.anvilBody) { const H = new THREE.Vector3(...W.hammer.head), T = V.HM.anvilBody.localToWorld(V.ANVIL_HIT.clone()); r.hit = Math.min(r.hit, H.distanceTo(T)); }
        if (k === 'furnace' && V.HM.furnace) { const P = V.HM.furnace.worldToLocal(V.rig.B.hdR.getWorldPosition(new THREE.Vector3())), M = V.FURN_MOUTH; if (Math.abs(P.x) < M.x && P.y > M.y0 && P.y < M.y1 && P.z > M.z0 && P.z < M.z1) r.inMouth++; r.zMin = Math.min(r.zMin, +P.z.toFixed(3)); } { const B = V.rig.B, sc = V.rig.root.getWorldScale(new THREE.Vector3()).x, wd = (a, b) => a.getWorldPosition(new THREE.Vector3()).distanceTo(b.getWorldPosition(new THREE.Vector3())) / sc; /* (t623u: bone lengths and the shoulder socket, both arms) */
          for (const s2 of ['R', 'L']) { const A = r.arm[s2], l1 = wd(B['ua' + s2], B['fa' + s2]), l2 = wd(B['fa' + s2], B['hd' + s2]); A[0] = Math.min(A[0], l1); A[1] = Math.max(A[1], l1); A[2] = Math.min(A[2], l2); A[3] = Math.max(A[3], l2);
            r.gap = Math.max(r.gap, wd(B['sh' + s2], B['ua' + s2]), B['ua' + s2].position.length(), Math.abs(Math.abs(B['sh' + s2].position.x) - 0.15), Math.abs(B['sh' + s2].position.z + 0.005)); }
          { const P = (o) => o.getWorldPosition(new THREE.Vector3()), cq = B.chest.getWorldQuaternion(new THREE.Quaternion()), cx = new THREE.Vector3(1, 0, 0).applyQuaternion(cq); /* (t625u: the elbow is a hinge - flexion only, about the arm's own x axis, never past straight) */
            for (const s2 of ['R', 'L']) { const u = P(B['fa' + s2]).sub(P(B['ua' + s2])).normalize(), fv = P(B['hd' + s2]).sub(P(B['fa' + s2])).normalize(), hx = new THREE.Vector3(1, 0, 0).applyQuaternion(B['ua' + s2].getWorldQuaternion(new THREE.Quaternion()));
              const fl = -Math.atan2(new THREE.Vector3().crossVectors(u, fv).dot(hx), u.dot(fv)) * 180 / Math.PI, E2 = r.elb[s2]; if (W.w > 0.5) { E2[0] = Math.min(E2[0], fl); E2[1] = Math.max(E2[1], fl); if (!(fl >= 4 && fl <= 152)) r.elBad++; } if (hx.dot(cx) <= 0) r.hgBad++;
              if (s2 === 'R' && W.w > 0.5) { const uc = u.clone().applyQuaternion(cq.clone().invert()), pt = Math.atan2(uc.z, -uc.y) * 180 / Math.PI; r.pit[0] = Math.min(r.pit[0], pt); r.pit[1] = Math.max(r.pit[1], pt); } } }
          if (k === 'furnace' && r.s.length % 2 === 0) { const h = window.__furnHits(); r.fbN += h.nHit; for (const q2 in h.hit) r.fb[q2] = (r.fb[q2] || 0) + h.hit[q2]; r.fHand += h.handIn; r.fZ = Math.min(r.fZ, h.zMin); if (V.rig.built.pick && V.rig.built.pick.visible) r.pkVis++; } }
        r.rel.push(loc(V.rig.B.hdR).y - loc(V.rig.B.uaR).y); hs.R.push(loc(V.rig.B.hdR)); hs.L.push(loc(V.rig.B.hdL)); await wait(40); }
      const span = (a, ax) => a.length ? +(Math.max(...a.map((v) => v[ax])) - Math.min(...a.map((v) => v[ax]))).toFixed(3) : 0, tr = (a) => +Math.max(span(a, 'x'), span(a, 'y'), span(a, 'z')).toFixed(3);
      const mid = r.s.slice(Math.floor(r.s.length * 0.1)); r.ms = Math.round(performance.now() - r.t0); r.N = r.s.length; r.allOn = r.s.length > 10 && r.s.every((x) => x[0] && x[1] === (k === 'anvil' ? 'hammer' : 'reach'));
      r.wFull = V.work.w; r.uMax = Math.max(...mid.map((x) => x[2])); r.uMin = Math.min(...mid.map((x) => x[2])); r.items = [...r.items].join(); r.trav = [tr(hs.R), tr(hs.L)]; r.yR = span(hs.R, 'y'); r.zL = span(hs.L, 'z'); r.zR = span(hs.R, 'z'); r.hipMax = +Math.max(0, ...r.hips).toFixed(3); r.relHi = +Math.max(...r.rel).toFixed(3); r.relLo = +Math.min(...r.rel).toFixed(3); r.imp = V.work.imp; r.hamAll = r.ham.length > 10 && r.ham.slice(Math.floor(r.ham.length * 0.1)).every((x) => x === 1); r.hamAny = r.ham.some((x) => x !== -1); r.pkOut = r.pk.slice(Math.floor(r.pk.length * 0.1)).every((x) => x === 0); r.hit = +r.hit.toFixed(3); r.gap = +r.gap.toFixed(5); for (const s2 of ['R', 'L']) r.elb[s2] = r.elb[s2].map((x) => +x.toFixed(1)); r.pit = r.pit.map((x) => +x.toFixed(1)); for (const s2 of ['R', 'L']) r.arm[s2] = r.arm[s2].map((x) => +x.toFixed(4)); delete r.hips; delete r.rel; delete r.ham; delete r.pk;
      r.made = k === 'anvil' ? C.get('bag', 'tool:pick_bronze') : C.get('bag', 'ingot:bronze') - 6; V.sim(1 / 30, 15); r.after = [V.work.on, +V.work.w.toFixed(2)]; r.hamAfter = V.work.hammer; r.pickAfter = V.work.pickInHand; r.pickVisAfter = !!(V.rig.built.pick && V.rig.built.pick.visible); r.passes = V.work.n - r.n0; delete r.s; delete r.n0; delete r.t0; out[k] = r; try { closeModalQuiet(); } catch (e) {} }
    S.backpack = {}; S.bagOrder = null; st.paused = false; document.querySelector('nav#tabs [data-tab=city]').click(); return out; }).catch((e) => ({ err: e.message }));
  console.log(JSON.stringify(w));
  // t625u: moving her away from the station cancels the batch, like the pill's Cancel - what's made stays, the leftover ingredients are still in the backpack
  const mv = await p.evaluate(async () => { const C = Craft, V = CharView, st = V.st, wait = (ms) => new Promise((q) => setTimeout(q, ms)), q = (s) => document.querySelector('#modalBody ' + s), out = {};
    try { closeModalQuiet(); } catch (e) {} document.querySelector('nav#tabs [data-tab=home]').click(); st.paused = true; V.sim(1 / 30, 20); if (V.HM.mode !== 'in') V.setHomeMode('in'); V.sim(1 / 30, 20);
    const RP = C.SMITH.findIndex((x) => x.out === 'tool:pick_bronze'), hudOn = () => { const h = document.getElementById('cxHud'); return !!(h && !h.classList.contains('hidden') && h.getBoundingClientRect().height > 0); };
    const go = async (k) => { const I = V.IA.list.find((x) => x.key === k); V.IA.opened = null; I.tap(); let f = 0; while (V.IA.opened !== k && f < 400) { V.sim(1 / 30, 1); f++; } try { closeModalQuiet(); } catch (e) {} V.sim(1 / 30, 3); };
    const run = async (k, n, act, after) => { S.backpack = {}; S.bagOrder = null; C.add('bag', 'ore:copper', 8); C.add('bag', 'ore:tin', 4); C.add('bag', 'ingot:bronze', 8); await go(k);
      const R = k === 'furnace' ? C.SMELT[0] : C.SMITH[RP], i0 = Object.fromEntries(Object.keys(R.in).map((id) => [id, C.get('bag', id)])), o0 = C.get('bag', R.out);
      const ok0 = C.batchStart(k, k === 'furnace' ? 0 : RP, n); const t0 = performance.now(); while (performance.now() - t0 < 300 || (C.JOB.done < (after || 0) && performance.now() - t0 < 9000)) { V.sim(1 / 30, 1); await wait(30); } /* (after = finished items to wait for first) */
      const made0 = C.get('bag', R.out) - o0, on1 = C.JOB.on; act(); for (let f = 0; f < 6; f++) { V.sim(1 / 30, 1); await wait(20); } const r = { ok0, on1, made0, on: C.JOB.on, why: C.JOB.last && C.JOB.last.why, hud: hudOn() };
      { const t1 = performance.now(); while (performance.now() - t1 < C.BATCH_MS + 300) { V.sim(1 / 30, 1); await wait(30); } } r.made = C.get('bag', R.out) - o0; r.left = Object.keys(R.in).map((id) => [i0[id] - C.get('bag', id), R.in[id] * r.made]); for (let f = 0; f < 20; f++) V.sim(1 / 30, 1);
      r.end = [V.work.on, +V.work.w.toFixed(2), V.work.hammer, V.work.pickInHand, !!(V.rig.built.pick && V.rig.built.pick.visible)]; return r; };
    out.walk = await run('anvil', 3, () => V.IA.list.find((x) => x.key === 'furnace').tap(), 1); /* (tap another thing: she walks off after one pick) */
    out.pad = await run('furnace', 3, () => V.setClimbDir('l'), 0); V.setClimbDir('stop'); V.sim(1 / 30, 20);
    out.away = await run('anvil', 3, () => { st.gnd.x += 0.4; }, 0);
    out.door = await run('furnace', 3, () => V.setHomeMode('door'), 0); V.setHomeMode('in'); V.sim(1 / 30, 20);
    out.stay = await run('anvil', 1, () => V.IA.list.find((x) => x.key === 'anvil').tap(), 0); /* (tapping her own station again is not a move) */
    S.backpack = {}; S.bagOrder = null; st.paused = false; document.querySelector('nav#tabs [data-tab=city]').click(); return out; }).catch((e) => ({ err: e.message }));
  console.log(JSON.stringify(mv));
  // t624u: one Smithing table for a grade's bar and its pickaxe, and the lock holds on every crafting path
  const lv = await p.evaluate(async () => { const C = Craft, K = Skills, o = {}, wait = (ms) => new Promise((q) => setTimeout(q, ms)); try { closeModalQuiet(); } catch (e) {} S.skills = S.skills || {}; const sx0 = S.skills.smithing;
    const G = ['bronze', 'iron', 'steel', 'gold', 'mithril', 'rune', 'lumen', 'onyx'], UE = K.unlockEntries('smithing'), ue = (id) => (UE.find((e) => e.id === id) || {}).level;
    o.table = G.map((g) => { const bar = C.SMELT.find((r) => r.out === 'ingot:' + g), pk = C.SMITH.find((r) => r.out === 'tool:pick_' + g); return [g, K.SMITH_LEVELS[g], C.recLv(bar), C.recLv(pk), ue('ingot:' + g), ue('tool:pick_' + g)]; });
    const setLv = (L) => { let lo = 0, hi = 1e9; while (hi - lo > 1) { const m = Math.floor((lo + hi) / 2); S.skills.smithing = m; if (K.level('smithing') >= L) hi = m; else lo = m; } S.skills.smithing = hi; return K.level('smithing'); };
    const fill = () => { S.backpack = {}; S.bagOrder = null; C.add('bag', 'ore:iron', 20); C.add('bag', 'ore:coal', 40); C.add('bag', 'ore:copper', 10); C.add('bag', 'ore:tin', 10); C.add('bag', 'ingot:iron', 20); C.add('bag', 'ingot:bronze', 10); };
    const IB = C.SMELT.findIndex((r) => r.out === 'ingot:iron'), IP = C.SMITH.findIndex((r) => r.out === 'tool:pick_iron'), bar = C.SMELT[IB], pk = C.SMITH[IP];
    o.lv19 = setLv(19); fill(); const t0 = [C.get('bag', 'ingot:iron'), C.get('bag', 'tool:pick_iron')];
    o.locked = [C.recLocked(bar), C.recLocked(pk), C.maxMake(bar), C.maxMake(pk), C.make(bar, 1, 'bag'), C.make(pk, 1, 'bag'), C.batchStart('furnace', IB, 1), C.batchStart('anvil', IP, 1), C.JOB.on, C.get('bag', 'ingot:iron') - t0[0], C.get('bag', 'tool:pick_iron') - t0[1]];
    for (const [k, i] of [['furnace', IB], ['anvil', IP]]) { C.open(k); if (k === 'anvil') { const ac = document.querySelector('#modalBody [data-cx=acat][data-v=pick]'); if (ac) ac.click(); } const e = document.querySelector(`#modalBody [data-cx=make][data-i="${i}"]`); o[k + 'Lab'] = e ? (k === 'anvil' ? e.closest('.smRw').textContent : e.textContent).replace(/\s+/g, ' ').trim() : null; try { closeModalQuiet(); } catch (e2) {} }
    o.lv20 = setLv(20); fill(); o.open = [C.recLocked(bar), C.recLocked(pk), C.maxMake(bar) > 0, C.maxMake(pk) > 0, C.make(pk, 1, 'bag')];
    // a running batch stops the moment the level no longer covers it (e.g. a saved / restored level drop)
    fill(); o.run0 = C.batchStart('anvil', IP, 3); const p0 = C.get('bag', 'tool:pick_iron'); setLv(1); await wait(C.BATCH_MS + 400); o.run = [C.JOB.on, C.JOB.last && C.JOB.last.why, C.get('bag', 'tool:pick_iron') - p0];
    if (C.JOB.on) C.batchStop('cancel'); S.skills.smithing = sx0; S.backpack = {}; S.bagOrder = null; return o; }).catch((e) => ({ err: e.message }));
  console.log(JSON.stringify(lv));
  console.log(JSON.stringify(r));
  ok(!r.err, 'ran ' + (r.err || ''));
  ok(r.ms === 1000, `exactly 1 s per item (BATCH_MS ${r.ms})`);
  ok(r.vaultOnly && r.vaultOnly[0] === 0 && r.vaultOnly[1], `the vault never counts: 5000 copper + tin in the vault, none carried -> can make ${r.vaultOnly}`);
  ok(r.big === 150 && r.bigAll && r.bigAll[0] === '150' && r.bigAll[1] === '150', `no 100 cap: 150 bars' worth in the backpack -> All ${r.bigAll}`);
  ok(r.inside, `iPhone: picker controls are >= 44 px tall and inside the 390 px screen (${JSON.stringify(r.touch)})`);
  ok(r.cap === 7 && r.btns === '--,+,1,5,10-,all' && r.n === 3, `picker: − / + and 1 / 5 / 10 / All up to the backpack cap, 10 faded past it (${r.cap}; ${r.btns}; picked ${r.n})`);
  for (const k of ['furnace']) { const d = (r.screens || {})[k] || {}, F = k === 'furnace';
    ok(d.st === 'default' && d.n === 8 && d.outs && d.lk === '00001111' && d.lab && /^Max \d+\|/.test(F ? d.lab : 'Max 1|') && d.lab.endsWith('Unlock Lv 55|Unlock Lv 70|Unlock Lv 100|Unlock Lv 125') && d.img === 'assets/ui/smithing/' + (F ? 'furnace_face' : 'anvil_top') + '.webp' && d.go && d.go[0] && d.go[1] === 'Pick a recipe first' && d.title === (F ? 'Furnace' : 'Anvil') && d.x, `${k} default screen (Art): painted station, 4x2 recipe grid (${d.lab}; locked ${d.lk}), Start disabled "${d.go && d.go[1]}"`);
    ok(d.sel && d.sel[0] === 'selected' && d.sel[1] === 8 && d.sel[2] === (F ? 'ingot:bronze' : 'tool:pick_bronze') && d.sel[3] === (F ? 2 : 1) && d.sel[4] === 'Qty 1' && d.sel[6], `${k} selected screen: recipe highlighted, backpack ingredients, Qty chip, the input shown on the station (${d.sel})`);
    ok(d.qty && d.qty[0] === 'quantity' && d.qty[1] === 0 && d.qty[2] && d.qty[3] === 2 && d.qty[4] && /^1,5-?,10-?,All \d+$/.test(d.qty[5]) && d.back && d.back[0] === 'selected' && d.back[1] === 8, `${k} quantity screen: grid collapses to the item + Change, − / typed / +, 1 / 5 / 10 / All (${d.qty}); Change goes back (${d.back})`);
    ok(d.lockTap && d.lockTap[1] && d.lockTap[2] === false && !d.lockTap[3], `${k}: a locked recipe can't be picked or started (${d.lockTap})`); }
  { const a = (r.screens || {}).anvil || {};
    ok(a.st === 'cats' && a.title === 'Anvil' && a.tiles === 'pick,sword,soon,soon' && a.names === 'Pickaxe|Sword|Coming soon|Coming soon' && a.img === 'assets/ui/smithing/anvil_top.webp' && a.x && !a.back && !a.go && a.rows === 0, `GD-14 anvil first screen: Pickaxe + Sword tiles and 2 locked "Coming soon", no list, no Start (${JSON.stringify(a.tiles)} ${a.names})`);
    const COST = { pick: '3,5,7,11,17,27,42,64', sword: '2,4,5,8,13,20,32,48' }, TITLE = { pick: 'Pickaxes', sword: 'Swords' };
    for (const cat of ['pick', 'sword']) { const d = a[cat] || {};
      ok(d.st === 'list' && d.cat === cat && d.title === TITLE[cat] && d.back && d.n === 8 && d.outs && d.cost === COST[cat] && d.lk === '00001111' && d.lab === 'Smith|Smith-|Smith-|Smith-|Unlock Lv 55|Unlock Lv 70|Unlock Lv 100|Unlock Lv 125' && d.stepper0 === 0, `GD-14 ${cat} tier list: 8 grades, bar cost ${d.cost}, Smith / Unlock Lv N (Skills.BAR_LEVELS at Smithing 42; ${d.lab})`);
      ok(d.sel && d.sel[0] === 'selected' && d.sel[1] === 'tool:' + cat + '_bronze' && d.sel[2] === 2 && d.sel[3] && /^Max \d+$/.test(d.sel[4] || '') && d.sel[5] && d.sel[6] === 8 && d.plus === 2 && d.capped && d.capped[0] === d.capped[1] && d.capped[2], `GD-14 ${cat}: the chosen row opens − / qty / + with its Max, capped at what the bars and backpack allow (${JSON.stringify([d.sel, d.plus, d.capped])})`);
      ok(d.lockTap && d.lockTap[0] && d.lockTap[1] && d.lockTap[2] === false && !d.lockTap[3] && d.backTo && d.backTo[0] === 'cats' && d.backTo[1] === 4, `GD-14 ${cat}: a locked grade can't be picked or started; back returns to the tiles (${d.lockTap}; ${d.backTo})`); } }
  const RN = r.running || [];
  ok(RN[0] && RN[1] && RN[2] && RN[3] === '1 / 3' && RN[4] && RN[8] === 0, `t600u: starting the batch closes the furnace window and shows the HUD pill (icon, 1 / 3), nothing made yet (${RN})`);
  ok(RN[5] >= 44 && RN[6] && RN[6][0] >= 0 && RN[6][1] <= 390 && RN[7] != null && RN[6][2] <= RN[7], `HUD pill: 44 px Cancel, inside the 390 px screen, above the tab bar (${RN.slice(5)})`);
  ok(r.midBar > 20 && r.midBar < 80 && r.midBarPx > 20 && r.midBarPx < 80 && r.bar2 && r.bar2[0] > 20 && r.bar2[0] < 80 && r.bar2[1] === '2 / 3', `the HUD bar really fills per item from game time (${r.midBar}% / ${r.midBarPx}% drawn at 0.5 s; ${r.bar2} at 1.5 s)`);
  const gaps = (r.times || []).map((t, i, a) => t - (i ? a[i - 1] : 0));
  ok(r.made === 3 && gaps.length === 3 && gaps.every((g) => g >= 900 && g <= 1400) && r.left.join() === '8,4' && r.doneWhy === 'done', `one at a time, 1 s each: made at ${r.times} ms (gaps ${gaps}); ore left ${r.left}`);
  ok(r.cap2 === 4 && r.cancel && r.cancel[0] === 4 && r.cancel[1] === 4 && !r.cancel[2] && r.cancel[3] === 'cancel' && r.cancel[4] === 6 && r.cancel[5] === 3, `Cancel keeps what was made and stops (All ${r.cap2}; ${r.cancel})`);
  ok(r.reopen && r.reopen[0] === false && r.reopen[1] === null && r.reopen[2] && r.reopen[3] && r.reclosed && r.reclosed[0] && r.reclosed[1], `t434: tapping the furnace mid-job opens no job screen - the pill stays the only progress and the job runs on (${r.reopen}; ${r.reclosed})`);
  ok(r.hudGone, 'the HUD Cancel stopped it and the pill went away');
  ok(r.anvilStart && r.anvilStart[0] === null && r.anvilStart[1], `the anvil window closes on start too, pill shown (${r.anvilStart})`);
  ok(r.room && r.room[0] === 1 && r.roomPick === 1 && r.anvil && r.anvil[0] === 1 && r.anvil[1] === 12 && !r.anvil[2], `anvil: backpack room caps it (ingots for 5, one free slot -> ${r.room}; made ${r.anvil})`);
  ok(r.vault && r.vault[0] && r.vault[1] === 0, `the vault is never touched or even asked (${r.vault})`);
  ok(!w.err, 'work-loop scene ran ' + (w.err || ''));
  for (const k of ['furnace', 'anvil']) { const x = w[k] || {}, n = k === 'anvil' ? 2 : 3;
    ok(x.opened === k && x.on0 && x.closed0 && x.hud0 && x.made === n && x.ms >= n * 900 && x.ms <= n * 1000 + 900, `${k}: walked up, window closed on start (${x.closed0}, pill ${x.hud0}), ran ${n} items in ${x.ms} ms (made ${x.made})`);
    if (k === 'furnace') ok(x.retap && x.retap[0] === null && x.retap[1] && x.retap[2], `tapping the furnace during the job keeps the game view (pill, job running: ${x.retap})`);
    ok(x.allOn && x.wFull === 1 && x.passes > 10 && x.items === [...Array(n).keys()].join() && x.uMin < 0.25 && x.uMax > 0.75, `${k}: the ${k === 'anvil' ? 'hammer' : 'reach'} loop plays for the whole batch, one loop per item (${x.N} samples, items ${x.items}, phase ${x.uMin}..${x.uMax}, ${x.passes} poses)`);
    if (k === 'anvil') ok(x.hamAll && x.pkOut && x.hamAny && x.hamAfter === null && x.pickAfter === x.pick0, `anvil (t603u): Theus' smithing hammer is in her right hand for the whole job (pickaxe out of her hand), and gone when it ends (pickaxe back: ${x.pickAfter}, was ${x.pick0})`);
    if (k === 'anvil') ok(x.hit < 0.12, `anvil: the hammer head comes down on the anvil face (closest head-to-strike-spot ${x.hit} m)`);
    if (k === 'furnace') ok(!x.hamAny && x.fZ < 1.1, `furnace (t603u): no hammer; at the bottom of the reach her hands go out over the step toward the mouth (closest hand z ${x.fZ} m in front of the furnace centre; ${x.fHand} hand samples in the mouth)`);
    const RL = [0.245, 0.215], dv = Math.max(...['R', 'L'].flatMap((s2) => [Math.abs(x.arm[s2][0] - RL[0]), Math.abs(x.arm[s2][1] - RL[0]), Math.abs(x.arm[s2][2] - RL[1]), Math.abs(x.arm[s2][3] - RL[1])]));
    ok(x.arm && dv < 0.0015 && x.gap < 0.001, `${k} (t623u): her arms never stretch or float - upper arm / forearm stay their rest 0.245 / 0.215 m (R ${x.arm.R}, L ${x.arm.L}; max off ${dv.toFixed(4)}) and the shoulder socket gap is ${x.gap}`);
    ok(x.elBad === 0 && x.hgBad === 0 && x.elb.R[0] >= 4 && x.elb.R[1] <= 152 && x.elb.L[0] >= 4 && x.elb.L[1] <= 152, `${k} (t625u): both elbows only flex, within 5-150 deg, bending the right way about their own hinge (R ${x.elb.R}, L ${x.elb.L} deg; ${x.elBad} out of range, ${x.hgBad} hinge flips)`);
    if (k === 'anvil') ok(x.pit[1] - x.pit[0] >= 70 && x.pit[1] >= 110 && x.elb.R[1] - x.elb.R[0] >= 30, `anvil (t625u): a full-arm swing from the shoulder - the upper arm travels ${(x.pit[1] - x.pit[0]).toFixed(1)} deg (${x.pit[0]} to ${x.pit[1]} deg up from hanging) and the elbow opens ${(x.elb.R[1] - x.elb.R[0]).toFixed(1)} deg into the strike`);
    if (k === 'furnace') ok(x.spot >= 1.5 && x.fbN === 0, `furnace (t623u): she stands back at ${x.spot} m and no part of her body or what she carries passes into the sill, step, plinth, arch / jambs or dome - only hands may enter the mouth (${x.fbN} hits ${JSON.stringify(x.fb)})`);
    if (k === 'furnace') ok(x.pkOut && x.pkVis === 0 && x.pickAfter === x.pick0 && x.pickVisAfter, `furnace (t623u): the pickaxe is out of her hand and off her back while she bends into the hearth (it would swing up into the arch), and back when the job ends (${x.pkOut}, ${x.pkVis}, ${x.pickAfter}/${x.pickVisAfter})`);
    if (k === 'anvil') ok(x.trav && x.trav[0] > 0.15 && x.yR > 0.3 && x.relHi > 0.1 && x.relLo < -0.2 && x.imp && x.imp.length === 3, `anvil (t603u): Theus' strike - the right hand goes up over the shoulder and drives down onto the anvil (hand vs shoulder ${x.relHi}..${x.relLo} m; rise/strike ${x.yR} m; impact pose ${x.imp})`);
    else ok(x.hipMax > 0.2 && x.zR > 0.1 && x.trav && x.trav[0] > 0.15, `furnace (t603u): she sinks at the knees and folds at the waist (hips down ${x.hipMax} m), the right hand goes in and back out (${x.zR} m forward / back; travel ${x.trav} m)`);
    ok(x.after && !x.after[0] && x.after[1] === 0, `${k}: and stops when the batch is done (${x.after})`); }
  ok(!mv.err, 'move-away scene ran ' + (mv.err || ''));
  for (const k of ['walk', 'pad', 'away', 'door']) { const x = mv[k] || {}; const refund = x.left && x.left.every(([used, want]) => used === want);
    ok(x.ok0 && x.on1 && x.on === false && x.why === 'moved' && !x.hud && x.made === x.made0 && refund, `t625u: moving away (${k}) cancels the batch like Cancel - made ${x.made} (${x.made0} before the move, none after), ingredients used only for those ${JSON.stringify(x.left)}, pill hidden (${x.hud})`);
    ok(x.end && x.end[0] === false && x.end[1] === 0 && x.end[2] === null && x.end[3] && x.end[4], `t625u (${k}): the work loop ends cleanly - blended out, no hammer, pickaxe back in her hand and shown (${x.end})`); }
  ok(mv.walk && mv.walk.made0 === 1, `t625u: the walk-off came after a finished item, which she keeps (${mv.walk && mv.walk.made0})`);
  ok(mv.stay && mv.stay.on === true && mv.stay.made === 1, `t625u: tapping her own station mid-job is not a move - the batch runs on (${mv.stay && [mv.stay.on, mv.stay.made]})`);
  ok(!lv.err && lv.table && lv.table.length === 8 && lv.table.every(([g, L, b2, p2, ub, up]) => L >= 1 && b2 === L && p2 === L && ub === L && up === L) && lv.table.map((t) => t[1]).join() === '1,20,25,40,55,70,100,125', `t624u: one Smithing table - each grade's bar and pickaxe unlock at the same level, in the recipes and the Skills unlock list (${(lv.table || []).map((t) => t[0] + ' ' + t.slice(1).join('/')).join(', ')} ${lv.err || ''})`);
  ok(lv.lv19 === 19 && lv.locked && lv.locked.join() === 'true,true,0,0,0,0,false,false,false,0,0', `t624u: at Smithing ${lv.lv19} the Iron bar and Iron pickaxe are locked everywhere - make, max, batch Start, nothing made (${lv.locked})`);
  ok(/Unlock Lv 20/.test(lv.furnaceLab || '') && /Unlock Lv 20/.test(lv.anvilLab || ''), `t624u: both screens say "Unlock Lv 20" on Iron (${lv.furnaceLab} | ${lv.anvilLab})`);
  ok(lv.lv20 === 20 && lv.open && lv.open.join() === 'false,false,true,true,1', `t624u: at Smithing 20 both unlock together (${lv.open})`);
  ok(lv.run0 === true && lv.run && lv.run[0] === false && lv.run[1] === 'locked' && lv.run[2] === 0, `t624u: a running batch stops (locked) once the level no longer covers it (${lv.run})`);
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  console.log(fails ? fails + ' FAIL' : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);
})();

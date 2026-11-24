// Furnace / anvil batch crafting (t591u + t592u, Dominic): a quantity picker (1 / 5 / 10 / All, − / +, typed) capped at what the BACKPACK can make - its
// ingredients and its room for the output - with no fixed cap (no 100 limit) and never the vault; then one item at a time, BATCH_MS (exactly 1 s, t599u) each,
// with a progress bar and Cancel; stopping keeps what was made. t600u: starting closes the window; a HUD pill (icon, n / N, the item's bar
// driven from game time, 44 px Cancel) shows until done. t434 (Art's station screens, Dominic): default / selected / quantity screens (4x2 recipe grid with
// Max N / Need more / Unlock Lv N, backpack ingredients, Qty chip, − / typed / + and 1 / 5 / 10 / All, Start); no job screen - tapping the furnace while she
// works keeps the window shut and the pill is the only progress. iPhone viewport: 44 px touch targets, nothing past the screen edge. t599u / t603u: for the whole batch Wren works, one loop per item, then stops: at the anvil Theus's own hammer strike retargeted to her, at the
// furnace a deep knee-and-waist bend placing the item in and drawing it out (CC0 UAL2 Farm_PlantSeed).
const { chromium } = require('playwright-core');
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
      const sc = {}; for (const k of ['furnace', 'anvil']) { if (k === 'anvil') C.add('bag', B, 6); /* (ingots for 2 picks; the next case empties the backpack) */ C.open(k); const R = (k === 'furnace' ? C.SMELT : C.SMITH.filter((x) => x.tool === 'pick'));
        const d = { st: scr(), n: cells().length, outs: cells().map((e) => e.dataset.out).join() === R.map((x) => x.out).join(), lab: cells().map((e) => e.querySelector('small').textContent).join('|'), lk: cells().map((e) => (e.disabled ? 1 : 0)).join(''), img: img(), go: [go().disabled, (q('.smGs') || {}).textContent], title: (q('.smT') || {}).textContent, x: !!q('.smX[data-cx=close]') };
        cells()[0].click(); d.sel = [scr(), cells().length, q('.smC.on') && q('.smC.on').dataset.out, document.querySelectorAll('#modalBody .smIng .smRow').length, (q('.smQc') || {}).textContent, go().disabled, !!q('.smOn i')];
        click('[data-cx=bqo]'); d.qty = [scr(), cells().length, !!q('.smSel [data-cx=bch]'), document.querySelectorAll('#modalBody .smPM').length, !!q('.cxbn'), [...document.querySelectorAll('#modalBody .smK')].map((e) => e.textContent + (e.disabled ? '-' : '')).join(), go().disabled];
        click('[data-cx=bch]'); d.back = [scr(), cells().length]; const L = cells()[5]; L.click(); d.lockTap = [scr(), !!(q('.smC.on') && q('.smC.on') !== L), C.batchStart(k, k === 'furnace' ? 5 : C.SMITH.indexOf(R[5]), 1), C.JOB.on]; sc[k] = d; try { closeModalQuiet(); } catch (e) {} }
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
    empty(); C.add('bag', 'tool:pick_iron', C.BAG_N - 2); C.add('bag', B, 15); const RP = C.SMITH.findIndex((x) => x.out === 'tool:pick_bronze'); C.st.acat = 'pick'; C.open('anvil'); o.room = [C.maxMake(C.SMITH[RP]), C.order('bag').filter(Boolean).length];
    click(`[data-cx=make][data-i="${RP}"]`); click('[data-cx=bqo]'); click('[data-cx=bq][data-v=all]'); o.roomPick = +(q('.cxbn') || {}).value; const pb0 = C.get('bag', 'tool:pick_bronze'); click('[data-cx=bgo]'); o.anvilStart = [ui.modal, hudOn()]; await wait(1300); o.anvil = [C.get('bag', 'tool:pick_bronze') - pb0, C.get('bag', B), C.JOB.on];
    o.vault = [vsnap() === v0, C.VBLOCK.length - vb]; empty(); C.add('vault', 'ore:copper', -5000); return o; }).catch((e) => ({ err: e.message }));
  // she works for the whole batch: walk up to the furnace (3 bars) and the anvil (2 picks) in the home scene, sample the work loop and her hands while it runs
  const w = await p.evaluate(async () => { const C = Craft, V = CharView, st = V.st, wait = (ms) => new Promise((q) => setTimeout(q, ms)), q = (s) => document.querySelector('#modalBody ' + s), out = {};
    try { closeModalQuiet(); } catch (e) {} document.querySelector('nav#tabs [data-tab=home]').click(); st.paused = true; V.sim(1 / 30, 30); if (V.HM.mode !== 'in') V.setHomeMode('in'); V.sim(1 / 30, 20);
    S.backpack = {}; S.bagOrder = null; C.add('bag', 'ore:copper', 6); C.add('bag', 'ore:tin', 3); C.add('bag', 'ingot:bronze', 6); C.st.acat = 'pick';
    const RP = C.SMITH.findIndex((x) => x.out === 'tool:pick_bronze'), loc = (b) => V.rig.root.worldToLocal(b.getWorldPosition(new THREE.Vector3()));
    for (const [k, i, n] of [['furnace', 0, 3], ['anvil', RP, 2]]) { if (k === 'anvil') C.add('bag', 'ingot:bronze', 6 - C.get('bag', 'ingot:bronze')); /* (ingots for exactly 2 picks) */ const I = V.IA.list.find((x) => x.key === k); V.IA.opened = null; I.tap(); let f = 0; while (V.IA.opened !== k && f < 400) { V.sim(1 / 30, 1); f++; }
      const e = q(`[data-cx=make][data-i="${i}"]`); if (e) e.click(); const qo = q('[data-cx=bqo]'); if (qo) qo.click(); const bq = q('[data-cx=bq][data-v=all]'); if (bq) bq.click(); const g = q('[data-cx=bgo]'); if (g) g.click();
      const r = { opened: V.IA.opened, on0: C.JOB.on, closed0: ui.modal === null, hud0: !!(document.getElementById('cxHud') && !document.getElementById('cxHud').classList.contains('hidden')), s: [], items: new Set(), hips: [], rel: [], ham: [], pk: [], hit: 9, inMouth: 0, zMin: 9, pick0: V.work.pickInHand, n0: V.work.n, t0: performance.now() }, hs = { R: [], L: [] };
      while (C.JOB.on && performance.now() - r.t0 < 6000) { V.sim(1 / 30, 1); const W = V.work; r.s.push([W.on, W.clip, +W.u.toFixed(2), W.item]); if (k === 'furnace' && r.s.length === 15) { I.tap(); for (let f2 = 0; f2 < 60 && ui.modal !== 'cx-furnace'; f2++) V.sim(1 / 30, 1); r.retap = [ui.modal, !!(document.getElementById('cxHud') && !document.getElementById('cxHud').classList.contains('hidden')), C.JOB.on]; try { closeModalQuiet(); } catch (e) {} } r.items.add(W.item); r.hips.push(W.hip || 0); r.ham.push(W.hammer ? (W.hammer.inHand ? 1 : 0) : -1); r.pk.push(W.pickInHand ? 1 : 0);
        if (W.hammer && V.HM.anvilBody) { const H = new THREE.Vector3(...W.hammer.head), T = V.HM.anvilBody.localToWorld(V.ANVIL_HIT.clone()); r.hit = Math.min(r.hit, H.distanceTo(T)); }
        if (k === 'furnace' && V.HM.furnace) { const P = V.HM.furnace.worldToLocal(V.rig.B.hdR.getWorldPosition(new THREE.Vector3())), M = V.FURN_MOUTH; if (Math.abs(P.x) < M.x && P.y > M.y0 && P.y < M.y1 && P.z > M.z0 && P.z < M.z1) r.inMouth++; r.zMin = Math.min(r.zMin, +P.z.toFixed(3)); } r.rel.push(loc(V.rig.B.hdR).y - loc(V.rig.B.uaR).y); hs.R.push(loc(V.rig.B.hdR)); hs.L.push(loc(V.rig.B.hdL)); await wait(40); }
      const span = (a, ax) => a.length ? +(Math.max(...a.map((v) => v[ax])) - Math.min(...a.map((v) => v[ax]))).toFixed(3) : 0, tr = (a) => +Math.max(span(a, 'x'), span(a, 'y'), span(a, 'z')).toFixed(3);
      const mid = r.s.slice(Math.floor(r.s.length * 0.1)); r.ms = Math.round(performance.now() - r.t0); r.N = r.s.length; r.allOn = r.s.length > 10 && r.s.every((x) => x[0] && x[1] === (k === 'anvil' ? 'hammer' : 'reach'));
      r.wFull = V.work.w; r.uMax = Math.max(...mid.map((x) => x[2])); r.uMin = Math.min(...mid.map((x) => x[2])); r.items = [...r.items].join(); r.trav = [tr(hs.R), tr(hs.L)]; r.yR = span(hs.R, 'y'); r.zL = span(hs.L, 'z'); r.zR = span(hs.R, 'z'); r.hipMax = +Math.max(0, ...r.hips).toFixed(3); r.relHi = +Math.max(...r.rel).toFixed(3); r.relLo = +Math.min(...r.rel).toFixed(3); r.imp = V.work.imp; r.hamAll = r.ham.length > 10 && r.ham.slice(Math.floor(r.ham.length * 0.1)).every((x) => x === 1); r.hamAny = r.ham.some((x) => x !== -1); r.pkOut = r.pk.slice(Math.floor(r.pk.length * 0.1)).every((x) => x === 0); r.hit = +r.hit.toFixed(3); delete r.hips; delete r.rel; delete r.ham; delete r.pk;
      r.made = k === 'anvil' ? C.get('bag', 'tool:pick_bronze') : C.get('bag', 'ingot:bronze') - 6; V.sim(1 / 30, 15); r.after = [V.work.on, +V.work.w.toFixed(2)]; r.hamAfter = V.work.hammer; r.pickAfter = V.work.pickInHand; r.passes = V.work.n - r.n0; delete r.s; delete r.n0; delete r.t0; out[k] = r; try { closeModalQuiet(); } catch (e) {} }
    S.backpack = {}; S.bagOrder = null; st.paused = false; document.querySelector('nav#tabs [data-tab=city]').click(); return out; }).catch((e) => ({ err: e.message }));
  console.log(JSON.stringify(w));
  console.log(JSON.stringify(r));
  ok(!r.err, 'ran ' + (r.err || ''));
  ok(r.ms === 1000, `exactly 1 s per item (BATCH_MS ${r.ms})`);
  ok(r.vaultOnly && r.vaultOnly[0] === 0 && r.vaultOnly[1], `the vault never counts: 5000 copper + tin in the vault, none carried -> can make ${r.vaultOnly}`);
  ok(r.big === 150 && r.bigAll && r.bigAll[0] === '150' && r.bigAll[1] === '150', `no 100 cap: 150 bars' worth in the backpack -> All ${r.bigAll}`);
  ok(r.inside, `iPhone: picker controls are >= 44 px tall and inside the 390 px screen (${JSON.stringify(r.touch)})`);
  ok(r.cap === 7 && r.btns === '--,+,1,5,10-,all' && r.n === 3, `picker: − / + and 1 / 5 / 10 / All up to the backpack cap, 10 faded past it (${r.cap}; ${r.btns}; picked ${r.n})`);
  for (const k of ['furnace', 'anvil']) { const d = (r.screens || {})[k] || {}, F = k === 'furnace';
    ok(d.st === 'default' && d.n === 8 && d.outs && d.lk === '00001111' && d.lab && /^Max \d+\|/.test(F ? d.lab : 'Max 1|') && d.lab.endsWith('Unlock Lv 55|Unlock Lv 70|Unlock Lv 100|Unlock Lv 125') && d.img === 'assets/ui/smithing/' + (F ? 'furnace_face' : 'anvil_top') + '.webp' && d.go && d.go[0] && d.go[1] === 'Pick a recipe first' && d.title === (F ? 'Furnace' : 'Anvil') && d.x, `${k} default screen (Art): painted station, 4x2 recipe grid (${d.lab}; locked ${d.lk}), Start disabled "${d.go && d.go[1]}"`);
    ok(d.sel && d.sel[0] === 'selected' && d.sel[1] === 8 && d.sel[2] === (F ? 'ingot:bronze' : 'tool:pick_bronze') && d.sel[3] === (F ? 2 : 1) && d.sel[4] === 'Qty 1' && d.sel[6], `${k} selected screen: recipe highlighted, backpack ingredients, Qty chip, the input shown on the station (${d.sel})`);
    ok(d.qty && d.qty[0] === 'quantity' && d.qty[1] === 0 && d.qty[2] && d.qty[3] === 2 && d.qty[4] && /^1,5-?,10-?,All \d+$/.test(d.qty[5]) && d.back && d.back[0] === 'selected' && d.back[1] === 8, `${k} quantity screen: grid collapses to the item + Change, − / typed / +, 1 / 5 / 10 / All (${d.qty}); Change goes back (${d.back})`);
    ok(d.lockTap && d.lockTap[1] && d.lockTap[2] === false && !d.lockTap[3], `${k}: a locked recipe can't be picked or started (${d.lockTap})`); }
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
    if (k === 'anvil') ok(x.hamAll && x.pkOut && x.hamAny && x.hamAfter === null && x.pickAfter === x.pick0, `anvil (t603u): Theus's smithing hammer is in her right hand for the whole job (pickaxe out of her hand), and gone when it ends (pickaxe back: ${x.pickAfter}, was ${x.pick0})`);
    if (k === 'anvil') ok(x.hit < 0.12, `anvil: the hammer head comes down on the anvil face (closest head-to-strike-spot ${x.hit} m)`);
    if (k === 'furnace') ok(!x.hamAny && x.inMouth > 0, `furnace (t603u): no hammer; at the bottom of the reach her right hand is inside the furnace mouth (${x.inMouth} samples in the mouth, deepest z ${x.zMin})`);
    if (k === 'anvil') ok(x.trav && x.trav[0] > 0.15 && x.yR > 0.3 && x.relHi > 0.1 && x.relLo < -0.2 && x.imp && x.imp.length === 3, `anvil (t603u): Theus's strike - the right hand goes up over the shoulder and drives down onto the anvil (hand vs shoulder ${x.relHi}..${x.relLo} m; rise/strike ${x.yR} m; impact pose ${x.imp})`);
    else ok(x.hipMax > 0.2 && x.zR > 0.1 && x.trav && x.trav[0] > 0.15, `furnace (t603u): she sinks at the knees and folds at the waist (hips down ${x.hipMax} m), the right hand goes in and back out (${x.zR} m forward / back; travel ${x.trav} m)`);
    ok(x.after && !x.after[0] && x.after[1] === 0, `${k}: and stops when the batch is done (${x.after})`); }
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  console.log(fails ? fails + ' FAIL' : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);
})();

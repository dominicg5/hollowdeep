// Furnace / anvil batch crafting (t591u + t592u, Dominic): a quantity picker (1 / 5 / 10 / All, − / +, typed) capped at what the BACKPACK can make - its
// ingredients and its room for the output - with no fixed cap (no 100 limit) and never the vault; then one item at a time, BATCH_MS (exactly 1 s, t599u) each,
// with a CSS-animated progress bar and Cancel; stopping keeps what was made (Cancel, or closing the screen). iPhone viewport: 44 px touch targets, nothing past
// the screen edge. t599u: for the whole batch Wren works (reaching in and out of the furnace / hammering the anvil, one baked CC0 loop per item), then stops.
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
    const click = (sel) => { const e = q(sel); if (e && !e.disabled) { e.click(); return true; } return false; };
    o.ms = C.BATCH_MS; empty();
    // the vault never counts: plenty of copper and tin in the vault, none in the backpack -> nothing to make
    C.add('vault', 'ore:copper', 5000); C.add('vault', 'ore:tin', 5000); const vb = C.VBLOCK.length, v0 = vsnap();
    C.open('furnace'); o.vaultOnly = [C.maxMake(R0), !!(q('[data-cx=make][data-i="0"]') || {}).disabled];
    // no 100 cap: 150 bars' worth in the backpack
    C.add('bag', 'ore:copper', 300); C.add('bag', 'ore:tin', 150); o.big = C.maxMake(R0); C.open('furnace'); click('[data-cx=make][data-i="0"]'); click('[data-cx=bq][data-v=all]'); o.bigAll = [q('.cxbn') && q('.cxbn').value, (q('.cxbgo .cxbx') || {}).textContent];
    // iPhone: picker controls are 44 px touch targets inside the screen
    o.touch = [...document.querySelectorAll('#modalBody .cxbatch button, #modalBody .cxbn')].map((e) => { const R = e.getBoundingClientRect(); return [Math.round(R.height), Math.round(R.left), Math.round(R.right)]; });
    o.inside = o.touch.length > 0 && o.touch.every(([h, l, rr]) => h >= 44 && l >= 0 && rr <= innerWidth);
    // 7 bars' worth: picker 1 / 5 / All 7, − / +; make 3, timed
    empty(); C.add('bag', 'ore:copper', 14); C.add('bag', 'ore:tin', 7); C.open('furnace'); click('[data-cx=make][data-i="0"]'); o.cap = C.maxMake(R0);
    o.btns = [...document.querySelectorAll('#modalBody .cxbatch [data-cx=bq]')].map((e) => e.dataset.v).join(); click('[data-cx=bq][data-v="+"]'); click('[data-cx=bq][data-v="+"]'); o.n = +q('.cxbn').value;
    const t0 = performance.now(), times = []; let last = 0; click('[data-cx=bgo]'); o.running = [C.JOB.on, !!q('.cxjob'), !!q('[data-cx=bstop]'), C.get('bag', B)];
    await wait(500); const ci = q('.cxbar.cur i'), cs = ci && getComputedStyle(ci); o.midBar = ci ? Math.round(100 * ci.getBoundingClientRect().width / ci.parentElement.getBoundingClientRect().width) : -1; o.barAnim = cs ? [cs.animationName, cs.animationDuration] : null;
    while (performance.now() - t0 < 6000) { await wait(50); const n = C.get('bag', B); if (n > last) { times.push(Math.round(performance.now() - t0)); last = n; } if (!C.JOB.on) break; }
    o.times = times; o.made = C.get('bag', B); o.left = [C.get('bag', 'ore:copper'), C.get('bag', 'ore:tin')]; o.doneWhy = C.JOB.last && C.JOB.last.why;
    // Cancel keeps what was made: start All (4 left), cancel after the first one
    click('[data-cx=make][data-i="0"]'); click('[data-cx=bq][data-v=all]'); o.cap2 = +q('.cxbn').value; click('[data-cx=bgo]'); await wait(1300); const m1 = C.get('bag', B); click('[data-cx=bstop]'); await wait(1300);
    o.cancel = [m1, C.get('bag', B), C.JOB.on, C.JOB.last && C.JOB.last.why, C.get('bag', 'ore:copper'), C.get('bag', 'ore:tin')];
    // closing the screen stops it too (what was made stays)
    click('[data-cx=make][data-i="0"]'); click('[data-cx=bgo]'); const m2 = C.get('bag', B); try { closeModalQuiet(); } catch (e) {} await wait(1300); o.closed = [m2, C.get('bag', B), C.JOB.on, C.JOB.last && C.JOB.last.why];
    // the anvil: backpack room caps it. 3 ingots a Bronze Pickaxe, ingots for 5, but only one free slot (tools take a slot each) -> 1
    empty(); C.add('bag', 'tool:pick_iron', C.BAG_N - 2); C.add('bag', B, 15); const RP = C.SMITH.findIndex((x) => x.out === 'tool:pick_bronze'); C.st.acat = 'pick'; C.open('anvil'); o.room = [C.maxMake(C.SMITH[RP]), C.order('bag').filter(Boolean).length];
    click(`[data-cx=make][data-i="${RP}"]`); click('[data-cx=bq][data-v=all]'); o.roomPick = +(q('.cxbn') || {}).value; const pb0 = C.get('bag', 'tool:pick_bronze'); click('[data-cx=bgo]'); await wait(1300); o.anvil = [C.get('bag', 'tool:pick_bronze') - pb0, C.get('bag', B), C.JOB.on];
    o.vault = [vsnap() === v0, C.VBLOCK.length - vb]; empty(); C.add('vault', 'ore:copper', -5000); return o; }).catch((e) => ({ err: e.message }));
  // she works for the whole batch: walk up to the furnace (3 bars) and the anvil (2 picks) in the home scene, sample the work loop and her hands while it runs
  const w = await p.evaluate(async () => { const C = Craft, V = CharView, st = V.st, wait = (ms) => new Promise((q) => setTimeout(q, ms)), q = (s) => document.querySelector('#modalBody ' + s), out = {};
    try { closeModalQuiet(); } catch (e) {} document.querySelector('nav#tabs [data-tab=home]').click(); st.paused = true; V.sim(1 / 30, 30); if (V.HM.mode !== 'in') V.setHomeMode('in'); V.sim(1 / 30, 20);
    S.backpack = {}; S.bagOrder = null; C.add('bag', 'ore:copper', 6); C.add('bag', 'ore:tin', 3); C.add('bag', 'ingot:bronze', 6); C.st.acat = 'pick';
    const RP = C.SMITH.findIndex((x) => x.out === 'tool:pick_bronze'), loc = (b) => V.rig.root.worldToLocal(b.getWorldPosition(new THREE.Vector3()));
    for (const [k, i, n] of [['furnace', 0, 3], ['anvil', RP, 2]]) { if (k === 'anvil') C.add('bag', 'ingot:bronze', 6 - C.get('bag', 'ingot:bronze')); /* (ingots for exactly 2 picks) */ const I = V.IA.list.find((x) => x.key === k); V.IA.opened = null; I.tap(); let f = 0; while (V.IA.opened !== k && f < 400) { V.sim(1 / 30, 1); f++; }
      const e = q(`[data-cx=make][data-i="${i}"]`); if (e) e.click(); const bq = q('[data-cx=bq][data-v=all]'); if (bq) bq.click(); const g = q('[data-cx=bgo]'); if (g) g.click();
      const r = { opened: V.IA.opened, on0: C.JOB.on, s: [], items: new Set(), n0: V.work.n, t0: performance.now() }, hs = { R: [], L: [] };
      while (C.JOB.on && performance.now() - r.t0 < 6000) { V.sim(1 / 30, 1); const W = V.work; r.s.push([W.on, W.clip, +W.u.toFixed(2), W.item]); r.items.add(W.item); hs.R.push(loc(V.rig.B.hdR)); hs.L.push(loc(V.rig.B.hdL)); await wait(40); }
      const span = (a, ax) => a.length ? +(Math.max(...a.map((v) => v[ax])) - Math.min(...a.map((v) => v[ax]))).toFixed(3) : 0, tr = (a) => +Math.max(span(a, 'x'), span(a, 'y'), span(a, 'z')).toFixed(3);
      const mid = r.s.slice(Math.floor(r.s.length * 0.1)); r.ms = Math.round(performance.now() - r.t0); r.N = r.s.length; r.allOn = r.s.length > 10 && r.s.every((x) => x[0] && x[1] === (k === 'anvil' ? 'hammer' : 'reach'));
      r.wFull = V.work.w; r.uMax = Math.max(...mid.map((x) => x[2])); r.uMin = Math.min(...mid.map((x) => x[2])); r.items = [...r.items].join(); r.trav = [tr(hs.R), tr(hs.L)]; r.yR = span(hs.R, 'y'); r.zL = span(hs.L, 'z'); r.zR = span(hs.R, 'z');
      r.made = k === 'anvil' ? C.get('bag', 'tool:pick_bronze') : C.get('bag', 'ingot:bronze') - 6; V.sim(1 / 30, 15); r.after = [V.work.on, +V.work.w.toFixed(2)]; r.passes = V.work.n - r.n0; delete r.s; delete r.n0; delete r.t0; out[k] = r; try { closeModalQuiet(); } catch (e) {} }
    S.backpack = {}; S.bagOrder = null; st.paused = false; document.querySelector('nav#tabs [data-tab=city]').click(); return out; }).catch((e) => ({ err: e.message }));
  console.log(JSON.stringify(w));
  console.log(JSON.stringify(r));
  ok(!r.err, 'ran ' + (r.err || ''));
  ok(r.ms === 1000, `exactly 1 s per item (BATCH_MS ${r.ms})`);
  ok(r.vaultOnly && r.vaultOnly[0] === 0 && r.vaultOnly[1], `the vault never counts: 5000 copper + tin in the vault, none carried -> can make ${r.vaultOnly}`);
  ok(r.big === 150 && r.bigAll && r.bigAll[0] === '150' && r.bigAll[1] === '150', `no 100 cap: 150 bars' worth in the backpack -> All ${r.bigAll}`);
  ok(r.inside, `iPhone: picker controls are >= 44 px tall and inside the 390 px screen (${JSON.stringify(r.touch)})`);
  ok(r.cap === 7 && r.btns === '-,+,1,5,all' && r.n === 3, `picker: − / + and 1 / 5 / All up to the backpack cap (${r.cap}; ${r.btns}; picked ${r.n})`);
  ok(r.running && r.running[0] && r.running[1] && r.running[2] && r.running[3] === 0, `started: progress panel with Cancel, nothing made yet (${r.running})`);
  ok(r.midBar > 20 && r.midBar < 80 && r.barAnim && r.barAnim[0] === 'cxfill' && r.barAnim[1] === '1s', `the per-item bar is a CSS animation filling over the 1 s (${r.midBar}% at 0.5 s; ${r.barAnim})`);
  const gaps = (r.times || []).map((t, i, a) => t - (i ? a[i - 1] : 0));
  ok(r.made === 3 && gaps.length === 3 && gaps.every((g) => g >= 900 && g <= 1400) && r.left.join() === '8,4' && r.doneWhy === 'done', `one at a time, 1 s each: made at ${r.times} ms (gaps ${gaps}); ore left ${r.left}`);
  ok(r.cap2 === 4 && r.cancel && r.cancel[0] === 4 && r.cancel[1] === 4 && !r.cancel[2] && r.cancel[3] === 'cancel' && r.cancel[4] === 6 && r.cancel[5] === 3, `Cancel keeps what was made and stops (All ${r.cap2}; ${r.cancel})`);
  ok(r.closed && r.closed[0] === r.closed[1] && !r.closed[2] && r.closed[3] === 'closed', `closing the furnace stops the batch, nothing lost (${r.closed})`);
  ok(r.room && r.room[0] === 1 && r.roomPick === 1 && r.anvil && r.anvil[0] === 1 && r.anvil[1] === 12 && !r.anvil[2], `anvil: backpack room caps it (ingots for 5, one free slot -> ${r.room}; made ${r.anvil})`);
  ok(r.vault && r.vault[0] && r.vault[1] === 0, `the vault is never touched or even asked (${r.vault})`);
  ok(!w.err, 'work-loop scene ran ' + (w.err || ''));
  for (const k of ['furnace', 'anvil']) { const x = w[k] || {}, n = k === 'anvil' ? 2 : 3;
    ok(x.opened === k && x.on0 && x.made === n && x.ms >= n * 900 && x.ms <= n * 1000 + 900, `${k}: walked up, ran ${n} items in ${x.ms} ms (made ${x.made})`);
    ok(x.allOn && x.wFull === 1 && x.passes > 10 && x.items === [...Array(n).keys()].join() && x.uMin < 0.25 && x.uMax > 0.75, `${k}: the ${k === 'anvil' ? 'hammer' : 'reach'} loop plays for the whole batch, one loop per item (${x.N} samples, items ${x.items}, phase ${x.uMin}..${x.uMax}, ${x.passes} poses)`);
    ok(x.trav && x.trav[0] > 0.08 && x.trav[1] > 0.08 && (k === 'anvil' ? x.yR > 0.15 : x.zL > 0.08 && x.zR > 0.08), `${k}: her hands really move (travel R/L ${x.trav} m; ${k === 'anvil' ? 'right hand rise/strike ' + x.yR : 'reach in/out L ' + x.zL + ' R ' + x.zR} m)`);
    ok(x.after && !x.after[0] && x.after[1] === 0, `${k}: and stops when the batch is done (${x.after})`); }
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  console.log(fails ? fails + ' FAIL' : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);
})();

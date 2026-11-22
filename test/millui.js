// Tether Mill UI + Tethercraft (Dominic; Mia's SPEC + tether_mill_panel_mock.png): queue math, the 72 h away cap, refund on cancel, XP per finished spool,
// collect into the pack, the anvil without Wren's Tether, Brannick's dialogue (intro then state line) and the mill panel; the wheel's rate follows the queue.
// SHOT=dir renders the panel at the mock's 1080x2337 (390x844 @ 2.77) and Brannick at the mill (no floating chip) to dir/millui-panel.png and dir/millui-world.png.
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html', SHOT = process.env.SHOT || '';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: SHOT ? 1080 / 390 : 1 }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL + '?t=' + Date.now(), { timeout: 90000, waitUntil: 'commit' }); await p.waitForTimeout(1000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof MillUI !== 'undefined' && typeof Craft !== 'undefined' && typeof S !== 'undefined', null, { timeout: 120000 });
  const L = await p.evaluate(async () => { const o = {}, M = MillUI, X = (L) => Skills.xpToReach(L);
    o.seed = { bronze: Craft.get('bag', 'tether:bronze'), mithril: Craft.get('bag', 'tether:mithril'), vaultIron: Craft.get('vault', 'tether:iron') };
    o.skill = { name: Skills.NAMES.tethercraft, lv: Skills.level('tethercraft'), levels: Skills.TETHER_LEVELS.join(','), icon: Skills.SKILL_ICONS.tethercraft };
    o.anvil = { tlink: Craft.SMITH.filter((r) => /^tool:tlink_/.test(r.out)).length, life: Craft.SMITH.filter((r) => r.tool === 'lifeline').every((r) => Object.keys(r.in).some((k) => /^tool:tlink_/.test(k))) };
    Craft.st.acat = 'teth'; Craft.open('anvil'); o.anvil.rows = [...document.querySelectorAll('#modalBody .cxr.rec')].map((e) => e.dataset.out); o.anvil.sub = document.querySelectorAll('#modalBody [data-cx=atool]').length; closeModalQuiet();
    // queue math: 20 Steel spools at Lv 42 = 20 x 35.0 s
    S.mill = null; M.st(); S.skills.tethercraft = X(42); Craft.add('bag', 'ingot:steel', 80); o.q = M.queue('braid', 'steel', 20); o.unit = M.unitLen('braid', 'steel'); o.left = M.queueLeft(); o.steelLeft = Craft.have('ingot:steel');
    // refund on cancel: 3 spools done of 20 -> 17 x 4 ingots back
    const j = S.mill.jobs[0]; j.done = 3; j.cur = 10; o.back = M.cancel(j.id); o.steelBack = Craft.have('ingot:steel');
    // 72 h away cap (XP stubbed so the spool length stays fixed): 20000 Bronze spools at Lv 1 queued, 100 h away -> floor(259200 / 24.4) spools
    const aw = Skills.awardMill; Skills.awardMill = () => 0; S.skills.tethercraft = 0; Craft.add('bag', 'ingot:bronze', 80000); M.queue('braid', 'bronze', 20000); const toasts = []; const t0 = window.toast; window.toast = (m) => toasts.push(m);
    S.mill.seen = Date.now() - 100 * 3600 * 1000; M.tick(); o.cap = { done: S.mill.jobs[0].done, want: Math.floor(72 * 3600 / 24.4), toast: toasts.join(' | '), rate: MILL.M.rateT, metal: MILL.M.metal };
    window.toast = t0; Skills.awardMill = aw; M.cancel(S.mill.jobs[0].id); S.mill.rack = {};
    // XP totals: 3 Gold spools at Lv 40 + 2 Iron Wren's Tethers pay 3 x 6669 + 2 x 1464; rack fills with 300 m Gold braid + 2 tool:tlink_iron
    S.skills.tethercraft = X(40); Craft.add('bag', 'ingot:gold', 9); Craft.add('bag', 'ingot:iron', 6); const x0 = Skills.xp('tethercraft'); M.queue('braid', 'gold', 3); M.queue('climb', 'iron', 2); o.locked = M.queue('braid', 'mithril', 1);
    M.advance(3 * 47.7 + 2 * 23 + 1); o.xp = Skills.xp('tethercraft') - x0; o.xpWant = 3 * 6669 + 2 * 1464; o.rack = JSON.stringify(S.mill.rack); o.rackN = M.rackCount(); o.empty = S.mill.jobs.length;
    const g0 = Craft.get('bag', 'tether:gold'), l0 = Craft.get('bag', 'tool:tlink_iron'); M.collect(); o.got = [Craft.get('bag', 'tether:gold') - g0, Craft.get('bag', 'tool:tlink_iron') - l0, Object.keys(S.mill.rack).length];
    // max 5 jobs; the same grade + tab appends to the last job
    Craft.add('bag', 'ingot:bronze', 400); Craft.add('bag', 'ingot:iron', 8); S.skills.tethercraft = X(30); M.queue('braid', 'bronze', 1); M.queue('braid', 'bronze', 2); o.join = S.mill.jobs.length === 1 && S.mill.jobs[0].n === 3;
    M.queue('braid', 'iron', 1); M.queue('braid', 'steel', 1); M.queue('climb', 'bronze', 1); M.queue('braid', 'bronze', 1); o.five = S.mill.jobs.length; o.sixth = M.queue('climb', 'steel', 1); o.appendFull = M.queue('braid', 'bronze', 1);
    while (S.mill.jobs.length) M.cancel(S.mill.jobs[0].id);
    // Brannick: first visit = 3 intro pages then Open the mill / Goodbye; later visits one state line (+ Collect N spools)
    S.skills.tethercraft = X(42); S.mill.intro = 0; M.talk(); const d = document.getElementById('millDlg'); o.dlg1 = d.querySelector('.tdWell p').textContent; d.querySelector('.tdWell').click(); d.querySelector('.tdWell').click(); o.dlg3 = d.querySelector('.tdWell p').textContent; o.btn1 = [...d.querySelectorAll('.tdBtns button')].map((x) => x.textContent).join('|');
    d.querySelector('[data-a=bye]').click(); o.intro = S.mill.intro; S.mill.rack = { 'tether:steel': 1400 }; M.talk(); o.dlg2 = d.querySelector('.tdWell p').textContent; o.btn2 = [...d.querySelectorAll('.tdBtns button')].map((x) => x.textContent).join('|');
    d.querySelector('[data-a=open]').click(); await new Promise((r) => setTimeout(r, 100)); const P = document.querySelector('#modalBody .mlP'); o.panel = !!P && ui.modal === 'mill' && !!document.querySelector('#millDlg.hidden');
    o.tiles = P ? P.querySelectorAll('.mlT').length : 0; o.locks = P ? [...P.querySelectorAll('.mlT.lock small')].map((x) => x.textContent).join(',') : ''; o.gate = P ? /gate/i.test(P.textContent) : true;
    P.querySelector('[data-ml=tab][data-v=climb]').click(); o.climbTiles = /Wren's Tether/.test(document.querySelector('#modalBody .mlRec').textContent);
    document.querySelector('#modalBody [data-ml=col]').click(); o.colPanel = Craft.get('bag', 'tether:steel') >= 1400 && !Object.keys(S.mill.rack).length; MillUI.shut(); o.shut = ui.modal == null;
    return o; });
  console.log(JSON.stringify(L));
  ok(L.seed.bronze === 1500 && L.seed.mithril === 0 && L.seed.vaultIron === 0, `new save: 1,500 m Bronze starter coil, no free Mithril / vault coils (${JSON.stringify(L.seed)})`);
  ok(L.skill.name === 'Tethercraft' && L.skill.lv === 1 && L.skill.levels === '1,20,25,40,55,70,100,125' && L.skill.icon === 'tether:mithril', 'Tethercraft is a third skill (Lv 1, unlocks 1/20/25/40/55/70/100/125)');
  ok(L.anvil.tlink === 0 && L.anvil.life && L.anvil.sub === 0 && L.anvil.rows.length === 8 && L.anvil.rows.every((r) => /^tool:lifeline_/.test(r)), 'the anvil no longer lists tool:tlink_* or the Wren\'s Tether sub-tab; Ledge Tethers still take 2 x tlink');
  ok(L.q && Math.abs(L.unit - 35.0) < 0.05 && Math.abs(L.left - 20 * L.unit) < 0.01 && L.steelLeft === 0, `queue math: 20 Steel spools at Lv 42 = 20 x ${L.unit.toFixed(2)} s = ${L.left.toFixed(1)} s; 80 ingots held`);
  ok(L.back === 68 && L.steelBack === 68, `cancel refunds the ingots of the 17 unfinished spools (${L.back})`);
  ok(L.cap.done === L.cap.want && /while you were away/.test(L.cap.toast) && /capped at 72 h/.test(L.cap.toast) && L.cap.rate === 1 && L.cap.metal === 'bronze', `100 h away credits 72 h only: ${L.cap.done} / ${L.cap.want} Bronze spools ("${L.cap.toast}"), wheel at full rate in the job's metal`);
  ok(L.xp === L.xpWant && L.rack === '{"tether:gold":300,"tool:tlink_iron":2}' && L.rackN === 5 && L.empty === 0 && L.locked === false, `XP per finished unit: ${L.xp} = 3 x 6669 + 2 x 1464; rack ${L.rack}; Mithril locked below Lv 55`);
  ok(L.got[0] === 300 && L.got[1] === 2 && L.got[2] === 0, 'Collect moves braid (metres) and Wren\'s Tethers into the backpack');
  ok(L.join && L.five === 5 && L.sixth === false && L.appendFull === true, 'queue: 5 jobs max, the same grade + tab joins the last job (even when full)');
  ok(/hanging lines off the Ledge/.test(L.dlg1) && /Start on Bronze/.test(L.dlg3) && L.btn1 === 'Open the mill|Goodbye' && L.intro === 1, 'first visit: Brannick\'s 3 intro pages, then Open the mill / Goodbye; intro is remembered');
  ok(/cooling on the rack/.test(L.dlg2) && L.btn2 === 'Open the mill|Collect 14 spools|Goodbye', `later visits: one state line + Collect (${L.btn2})`);
  ok(L.panel && L.tiles === 8 && L.locks === 'Unlock Lv 55,Unlock Lv 70,Unlock Lv 100,Unlock Lv 125' && !L.gate && L.climbTiles && L.colPanel && L.shut, `the mill panel: 8 grade tiles (${L.locks}), Climbing Tether tab, Collect, close`);
  if (SHOT) {
    // mock state: Lv 42 at 63%, Gold selected x10, 87 Gold ingots left after queueing; Steel 20 at spool 15 (60%), Gold 10 waiting; 1,400 m Steel on the rack
    await p.evaluate(async () => { const X = Skills.xpToReach; S.skills.tethercraft = Math.round(X(42) + 0.63 * (X(43) - X(42))); S.mill = null; MillUI.st(); S.mill.intro = 1;
      for (const k of ['steel', 'gold']) Craft.add('bag', 'ingot:' + k, -Craft.get('bag', 'ingot:' + k)); Craft.add('bag', 'ingot:steel', 80); Craft.add('bag', 'ingot:gold', 117);
      MillUI.queue('braid', 'steel', 20); MillUI.queue('braid', 'gold', 10); const j = S.mill.jobs[0]; j.done = 14; j.len = MillUI.unitLen('braid', 'steel'); j.cur = 0.6 * j.len; S.mill.rack = { 'tether:steel': 1400 };
      Object.assign(MillUI.P, { tab: 'braid', grade: 'gold', qty: 10 }); MillUI.open(); await new Promise((r) => setTimeout(r, 900)); });
    await p.waitForTimeout(1200); console.log('PANEL ' + JSON.stringify(await p.evaluate(() => { const q = document.querySelector('.mlScroll'); return { sh: q.scrollHeight, ch: q.clientHeight, p: document.querySelector('.mlP').getBoundingClientRect().toJSON() }; }))); await p.screenshot({ path: SHOT + '/millui-panel.png' });
    await p.evaluate(() => MillUI.shut());
    await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok && Explore.on, null, { timeout: 240000 }).catch(() => {});
    await p.evaluate(async () => { for (let i = 0; i < 120 && M3.models !== 'ready'; i++) await new Promise((r) => setTimeout(r, 1000)); });
    await p.waitForFunction(() => { MILL.anim(0, 0); return !!MILL.BR.k; }, null, { timeout: 120000, polling: 500 });
    await p.evaluate(async () => { const [ox, oy] = MILL.wld(-1.5, 9.6), [wx, wy] = MILL.wld(-1.5 + 2.2 / MILL.K, 9.6 + 7 / MILL.K), q = Explore.reach(wx, wy); Explore.enter(q[0], q[1]); Explore.EX.az = Math.atan2(wx - ox, wy - oy) - 0.12;
      for (let i = 0; i < 60; i++) Explore.tick(1 / 30); for (let i = 0; i < 8; i++) { MILL.anim(0, 0); await new Promise((r) => setTimeout(r, 300)); } });
    await p.waitForTimeout(1500); const fl = await p.evaluate(() => ({ chip: !!document.querySelector('#millChip, #millBub'), keeper: MILL.BR.k && MILL.BR.k.root.visible }));
    ok(!fl.chip && fl.keeper, 'in the world: Brannick at the mill with no floating chip or icon over him or the mill (Dominic t448u)');
    await p.screenshot({ path: SHOT + '/millui-world.png' });
  }
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close(); console.log(fails ? `${fails} FAILED` : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();

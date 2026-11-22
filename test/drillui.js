// Drill stand setup UI: the backpack stand (seeded, one per drill left, plus a Mithril bit), its "Set up at nearest ore" menu (ore within a 5 s walk at her run speed, type + distance,
// or "No ore within 5 s walk"), confirm walks her there and deploys; one HUD button for all placed drills in the right-hand stack above Skills / Bag / Map (touch-sized, always visible, with a count badge); tapping it opens a read-only stats list (stand, bit, angle, speed, throughput, hopper, Ledge Tether metres, status — no bit slots or pick-up / swap actions);
// those actions live on a proximity prompt at the drill itself; long-press still deploys
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html', SHOT = process.env.SHOT || '';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(1000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 200000 }).catch(() => {}); await p.waitForTimeout(800);
  await p.evaluate(() => { Skills.migrate(); S.skills.mining = Math.max(S.skills.mining || 0, Skills.xpToReach(90)); }); // existing tests predate drill-slot unlocks; give all 9 slots so deploy checks stay about stands, bits and tethers
  const shot = async (f) => { if (SHOT) { await p.waitForTimeout(1500); await p.screenshot({ path: SHOT + '/' + f }); } };
  const tick = (n) => p.evaluate((n) => { for (let i = 0; i < n; i++) Explore.tick(1 / 30); }, n);
  // the Drills button is on the map HUD even with no field drills, and opens an empty list
  const empty = await p.evaluate(async () => { if (!Explore.on) { const F = Explore.ledgeFront(); Explore.enter(F.x, F.y); for (let i = 0; i < 8; i++) Explore.tick(1 / 30); }
    Explore.drillHud(); const h = document.getElementById('drillHud'); let b = h && h.querySelector('.dh'); const n = b && b.querySelector('.n');
    const vis = !!(h && h.classList.contains('on') && b && b.offsetParent !== null);
    if (b) b.click(); await new Promise((r) => setTimeout(r, 80));
    const c = document.getElementById('drillCtl'), empty = !!(c && c.classList.contains('on') && /No drills placed/.test(c.textContent || ''));
    if (c) Explore.drillPanel(null);
    b = document.querySelector('#drillHud .dh');
    const r = b && b.getBoundingClientRect(), bag = document.getElementById('exBagBtn') && document.getElementById('exBagBtn').getBoundingClientRect(), sk = document.getElementById('exSkillsBtn') && document.getElementById('exSkillsBtn').getBoundingClientRect();
    return { vis, off: !!(b && b.classList.contains('off')), n: n && n.textContent, empty, above: r && bag && sk && Math.abs(r.right - bag.right) <= 2 && r.bottom <= sk.top + 1, dev: (CityMap.setView('dev'), Explore.drillHud(), !!(document.getElementById('drillHud') && document.getElementById('drillHud').classList.contains('on'))) }; });
  console.log(JSON.stringify(empty)); ok(empty.vis && empty.off && empty.n === '0' && empty.empty, 'the Drills button is on the HUD with a 0 badge when none are placed, and opens the empty list');
  ok(empty.above, 'the Drills button sits in the right-hand stack above Skills and Bag');
  ok(!empty.dev, 'the Drills button is hidden in Dev view');
  await p.evaluate(() => { if (typeof CityMap !== 'undefined' && CityMap.setView) CityMap.setView('char'); });

  // seeded item
  const s0 = await p.evaluate(() => { Explore.build(); const WS = Explore.WS, N = Explore.ORE.nodes, D = Explore.drillState(), R = 5 * Explore.runSpeed() * WS;
    // a spot with no ore within reach (well clear of every node) and one ~12 m from a reachable ground node
    const H = Explore.doorSpots().find((q) => q.type === 'ledge'); let far = null; for (let k = 1; k < 400 && !far; k++) { const a = k * 2.399, r = WS * (20 + k * 3), q = Explore.reach(H.x + Math.cos(a) * r, H.y + Math.sin(a) * r); if (Explore.clsAt(q[0], q[1]) === 1 && N.every((n) => Math.hypot(n.x - q[0], n.y - q[1]) > R + WS * 15)) far = q; }
    const tgt = N.filter((n) => !n.cliff && Explore.oreStand(n)).sort((a, b) => Math.hypot(a.x - H.x, a.y - H.y) - Math.hypot(b.x - H.x, b.y - H.y))[0], st = Explore.oreStand(tgt);
    window.__T = { far, st, tgt: N.indexOf(tgt) }; return { left: D.left, item: Craft.get('bag', 'stand:drill'), bits: Craft.get('bag', 'bit:mithril'), R: R / WS, far: !!far, tgt: tgt && tgt.type }; });
  console.log(JSON.stringify(s0)); ok(s0.left > 0 && s0.item === s0.left && s0.bits > 0, `Drill Stands + Mithril bits seeded in the backpack, one stand per drill left (${s0.item} stands / ${s0.left} left, ${s0.bits} bits)`); ok(s0.R > 15 && s0.R < 40, `5 s walk at her run speed = ${s0.R.toFixed(1)} m`);
  // far from ore: the menu says so
  if (s0.far) { const f = await p.evaluate(async () => { Explore.enter(__T.far[0], __T.far[1]); for (let i = 0; i < 10; i++) Explore.tick(1 / 30); document.getElementById('exBagBtn').click(); await new Promise((r) => setTimeout(r, 200));
      document.querySelector('.cxs.full[data-id="stand:drill"]').click(); await new Promise((r) => setTimeout(r, 200)); const m = document.querySelector('.cxdrill'); return { m: !!m, txt: m && m.textContent, dis: m && m.querySelector('[data-cx=dset]').disabled }; });
    ok(f.m && /No ore within 5 s walk/.test(f.txt) && f.dis, `away from ore the drill menu says "No ore within 5 s walk" and Set up is disabled`); await shot('menu-none.png');
    await p.evaluate(() => { try { closeModalQuiet(); Craft.sheet(false); } catch (e) {} }); }
  // near ore: type + distance, confirm walks there and sets up
  const n1 = await p.evaluate(async () => { const WS = Explore.WS, st = __T.st, n = Explore.ORE.nodes[__T.tgt]; let k = null; for (const a of [0, 1.6, 3.1, 4.7, 0.8, 2.4, 3.9, 5.5]) { const q = Explore.reach(st[0] + Math.cos(a) * WS * 10, st[1] + Math.sin(a) * WS * 10); if (Explore.clsAt(q[0], q[1]) === 1 && Math.hypot(q[0] - st[0], q[1] - st[1]) > WS * 6) { k = q; break; } } if (!k) k = Explore.reach(st[0], st[1]);
    Explore.exit(); Explore.enter(k[0], k[1]); for (let i = 0; i < 20; i++) Explore.tick(1 / 30); const X = Explore.drillNear(); document.getElementById('exBagBtn').click(); await new Promise((r) => setTimeout(r, 200));
    document.querySelector('.cxs.full[data-id="stand:drill"]').click(); await new Promise((r) => setTimeout(r, 200)); const m = document.querySelector('.cxdrill'); return { X: X.err ? X : { type: X.type, name: X.name, m: X.m, s: X.s, node: X.node }, txt: m && m.textContent, dis: m && m.querySelector('[data-cx=dset]').disabled }; });
  console.log(JSON.stringify(n1.X)); ok(!n1.X.err && n1.txt && n1.txt.includes(n1.X.name + ' ore') && /\d+ m away · [\d.]+ s walk/.test(n1.txt) && !n1.dis, `near ore the menu shows the ore type and distance (${n1.txt && n1.txt.replace(/\s+/g, ' ').slice(0, 90)})`); ok(n1.X.s <= 5, `nearest ore within 5 s walk (${n1.X.s} s)`);
  await shot('menu.png');
  const n2 = await p.evaluate(async () => { const D = Explore.drillState(), c0 = D.list.length, l0 = D.left; document.querySelector('.cxdrill [data-cx=dset]').click(); await new Promise((r) => setTimeout(r, 100)); const pend = Explore.EX.pend, modal = !!document.querySelector('.cxdrill');
    let t = 0; while (Explore.EX.pend && t < 900) { Explore.tick(1 / 30); t++; } const d = D.list[D.list.length - 1], h = Explore.here(), n = Explore.ORE.nodes[d.node];
    return { pend, modal, t: +(t / 30).toFixed(1), added: D.list.length - c0, left: l0 - D.left, item: Craft.get('bag', 'stand:drill') === D.left, tier: d.tier, stand: d.stand, node: d.node, dist: Math.hypot(n.x - h[0], n.y - h[1]) / Explore.WS, mesh: !!Explore.DRILL.meshes.get(d.id), panel: !!(document.getElementById('drillUse') && document.getElementById('drillUse').classList.contains('on')) }; });
  console.log(JSON.stringify(n2)); ok(n2.pend === 'drill' && !n2.modal, 'confirm closes the backpack and she sets off'); ok(n2.added === 1 && n2.left === 1 && n2.item && n2.node === n1.X.node, `she walks there (${n2.t} s) and the drill is deployed on that ore; one stand and one Mithril bit used`); ok(n2.tier === 'mithril' && n2.stand === 'drill' && n2.mesh, 'mithril bit on a Drill Stand, drill model on the map (same deploy as long-press)');
  await p.evaluate(() => Explore.drillPanel(null));
  // second drill -> still one HUD button for every placed drill
  const h2 = await p.evaluate(async () => { const D0 = Explore.drillState(), h = Explore.here(), used = new Set(D0.list.map((d) => d.node)), N = Explore.ORE.nodes;
    const n2 = N.filter((n, i) => !used.has(i) && !n.cliff && Explore.oreStand(n)).sort((a, b) => Math.hypot(a.x - h[0], a.y - h[1]) - Math.hypot(b.x - h[0], b.y - h[1]))[0];
    if (n2) { const st2 = Explore.oreStand(n2); Explore.enter(st2[0], st2[1]); for (let i = 0; i < 8; i++) Explore.tick(1 / 30); } // next free cluster can be more than a 5 s walk from the first (valley tin is ~17 m)
    const r = Explore.drillSetup(); let t = 0; while (Explore.EX.pend && t < 900) { Explore.tick(1 / 30); t++; } Explore.drillPanel(null); for (let i = 0; i < 20; i++) Explore.tick(1 / 30); Explore.drillHud();
    const R = (q) => { const e = document.querySelector(q); if (!e || e.offsetParent === null) return null; const b = e.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; }, B = [...document.querySelectorAll('#drillHud .dh')].map((e) => { const b = e.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; });
    const hit = (a, c) => a && c && a[0] < c[2] && c[0] < a[2] && a[1] < c[3] && c[1] < a[3]; const others = ['#miniMap', '#exploreBar', '#exMapBtn', '#exBagBtn', '#exSkillsBtn', '#exHopBtn', '.cityBtns', '#cityInfo', '#ticker'].map((q) => [q, R(q)]).filter((x) => x[1]);
    const bag = R('#exBagBtn'), sk = R('#exSkillsBtn'), n = document.querySelector('#drillHud .dh .n');
    return { err: r.err || null, n: B.length, badge: n && n.textContent, B, over: others.filter(([q, o]) => B.some((bb) => hit(bb, o))).map((x) => x[0]), stack: B.length < 2 || B.every((bb, i) => i === 0 || bb[3] <= B[i - 1][1] + 0.5 || B[i - 1][3] <= bb[1] + 0.5), min: Math.min(...B.map((bb) => Math.min(bb[2] - bb[0], bb[3] - bb[1]))), hud: B[0] && bag && sk && Math.abs(B[0][2] - bag[2]) <= 2 && B[0][3] <= sk[1] + 1 }; });
  console.log(JSON.stringify(h2)); ok(h2.n === 1 && h2.badge === '2', `one HUD button for all placed drills with a count badge (${h2.n}, ${h2.badge})`); ok(!h2.over.length, `HUD button clear of the other buttons (${h2.over.join(',') || 'none'})`); ok(h2.min >= 44 && h2.hud, `touch-sized (${h2.min}px) in the right-hand stack above Skills and Bag`);
  await shot('hud.png');
  // tap the icon: the panel
  const pn = await p.evaluate(async () => { document.querySelector('#drillHud .dh').click(); await new Promise((r) => setTimeout(r, 100)); const c = document.getElementById('drillCtl'), t = c.textContent;
    return { on: c.classList.contains('on'), t, sel: !!document.querySelector('#drillHud .dh.sel'), acts: [...c.querySelectorAll('[data-k=act] button, .prow')].map((b) => b.textContent.trim()), bit: !!c.querySelector('[data-k=bit] button'), cards: c.querySelectorAll('.dcard').length, foot: /Actions live on the drill prompt/.test(t) }; });
  const T = pn.t; ok(pn.on && pn.sel, 'tapping the HUD button opens the drill stats menu');
  ok(pn.cards === 2 && pn.foot && !pn.bit && !pn.acts.length, 'stats menu lists every placed drill and has no bit slots or action buttons');
  ok(/ore/.test(T) && /📍 \d+ m from the Ledge door/.test(T), 'panel: ore type and location');
  ok(/Stand/.test(T) && /Drill Stand/.test(T) && /Bit/.test(T) && /Mithril/.test(T), 'panel: stand and bit tier');
  ok(/Angle/.test(T) && /-?\d+°/.test(T), 'panel: angle');
  ok(/Speed/.test(T) && /\d+ ore\/h/.test(T) && /Throughput/.test(T), 'panel: speed and throughput');
  ok(/Hopper/.test(T) && /\d+\/\d+/.test(T), 'panel: hopper');
  ok(/Running|Out of coal|Hopper full|Idle|No bit|too soft/.test(T), 'panel: status');
  ok(/Ledge Tether/.test(T) && /needs \d+ m · available \d+ m/.test(T), 'panel: Ledge Tether need vs available (read-only)');
  const scrollCheck = async (label) => {
    const sc = await p.evaluate(() => {
      const box = document.getElementById('drillCtl'), list = box && box.querySelector('.dlist');
      if (!list) return { ok: false };
      const cs = getComputedStyle(list), boxCs = getComputedStyle(box);
      const can = list.scrollHeight > list.clientHeight + 8;
      const y = can ? Math.min(140, Math.max(48, Math.floor((list.scrollHeight - list.clientHeight) * 0.6))) : 0;
      list.scrollTop = y; const before = list.scrollTop, el = list;
      const D = Explore.drillState(), d = D.list.find((q) => !q.camp), mined = (d && (d.mined || 0)) + 7; if (d) d.mined = mined;
      Explore.drillUI(); for (let i = 0; i < 24; i++) Explore.tick(1 / 30);
      const list2 = box.querySelector('.dlist');
      const after = list2 ? list2.scrollTop : -1, same = list2 === el;
      list2 && list2.dispatchEvent(new WheelEvent('wheel', { deltaY: 80, bubbles: true, cancelable: true }));
      return { ok: true, can, before, after, same, mined: !!(list2 && list2.textContent.includes('mined ' + mined)),
        contain: /contain/.test((cs.overscrollBehavior || '') + (cs.overscrollBehaviorY || '')), pan: cs.touchAction === 'pan-y',
        listScroll: cs.overflowY === 'auto' || cs.overflowY === 'scroll', boxHidden: boxCs.overflow === 'hidden' || boxCs.overflowY === 'hidden',
        pinned: document.documentElement.classList.contains('drill-open'), page: window.scrollY }; });
    console.log(label, JSON.stringify(sc));
    ok(sc.ok && sc.can && sc.same && Math.abs(sc.after - sc.before) <= 2 && sc.mined, label + ': the drill menu keeps its scroll position and updates hopper numbers in place');
    ok(sc.contain && sc.pan && sc.listScroll && sc.boxHidden && sc.pinned && sc.page === 0, label + ': the list is the contained scroll container and the page stays put');
  };
  await scrollCheck('mobile touch');
  await p.setViewportSize({ width: 1280, height: 800 });
  await p.waitForTimeout(80);
  await scrollCheck('desktop');
  await p.setViewportSize({ width: 390, height: 844 });
  await p.waitForTimeout(80);
  await shot('panel.png');
  // tether it, then untether; pick up removes the icon and returns the drill to the backpack
  const pu = await p.evaluate(async () => { const D = Explore.drillState(); D.tetherM = 1e6; Explore.drillPanel(null);
    const d = D.list.filter((q) => !q.camp).slice(-1)[0], xy = [d.sx, d.sy];
    const at = Explore.reach(xy[0], xy[1]); Explore.enter(at[0], at[1]);
    for (let i = 0; i < 20; i++) Explore.tick(1 / 30);
    Explore.drillInteract(d);
    const near = Explore.drillNearMe(d), pr = Explore.DRILL.prompts && Explore.DRILL.prompts.get(d.id), prompt = !!(Explore.DRILL.near === d && pr && pr.lab && pr.lab.visible);
    const u = document.getElementById('drillUse'), btn = (re) => [...u.querySelectorAll('button')].find((b) => re.test(b.textContent));
    btn(/Tether to Ledge/).click(); const wired = !!d.port, lab = btn(/Untether/) ? 'Untether' : '';
    btn(/Untether/).click(); const unw = !d.port; const n0 = D.list.length, i0 = Craft.get('bag', 'stand:drill'), b0 = Craft.get('bag', 'bit:mithril');
    btn(/Pick up drill/).click(); Explore.drillHud();
    return { near, prompt, use: u.classList.contains('on') === false, wired, lab, unw, gone: n0 - D.list.length, item: Craft.get('bag', 'stand:drill') - i0, bit: Craft.get('bag', 'bit:mithril') - b0, icons: document.querySelectorAll('#drillHud .dh').length, stats: document.getElementById('drillCtl').classList.contains('on') }; });
  console.log(JSON.stringify(pu)); ok(pu.near && pu.prompt, 'walking up to the drill shows the in-world prompt (within 3–4 m)');
  ok(pu.wired && pu.lab && pu.unw, 'Tether to Ledge from the drill prompt strings it, Untether frees it');
  ok(pu.gone === 1 && pu.item === 1 && pu.bit === 1 && pu.icons === 1 && !pu.stats && pu.use, 'Pick up at the drill removes it, the HUD button remains for the other drill, and the stand and bit go back in the backpack');
  // the old long-press deploy still works (and also spends one stand and one bit)
  const lp = await p.evaluate(async () => { const D = Explore.drillState(), WS = Explore.WS, h = Explore.here(), used = new Set(D.list.map((d) => d.node)); const N = Explore.ORE.nodes; const n = N.filter((q) => !used.has(N.indexOf(q)) && !q.cliff).sort((a, b) => Math.hypot(a.x - h[0], a.y - h[1]) - Math.hypot(b.x - h[0], b.y - h[1]))[0];
    for (let i = 0; i < 5; i++) Explore.tick(1 / 30); const s = M3.project(n.x, n.y, n.s * 0.5), c0 = D.list.length, i0 = Craft.get('bag', 'stand:drill'), r = Explore.longPress(s[0], s[1]); Explore.drillPanel(null); return { r, added: D.list.length - c0, item: i0 - Craft.get('bag', 'stand:drill') }; });
  console.log(JSON.stringify(lp)); ok(lp.r && lp.added === 1 && lp.item === 1, 'long-press on an ore node still deploys a drill (and spends a stand and a bit)');
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | ')); console.log(fails ? 'SOME FAILED' : 'ALL PASS');
  if (fails) process.exitCode = 1;
  } finally { await b.close().catch(() => {}); }
})().catch((e) => { console.error(e); process.exit(1); });

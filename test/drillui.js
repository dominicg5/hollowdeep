// Mithril Drill setup UI: the backpack item (seeded, one per drill left), its "Set up at nearest ore" menu (ore within a 5 s walk at her run speed, type + distance,
// or "No ore within 5 s walk"), confirm walks her there and deploys; one lower-left HUD icon per active drill (stacked, clear of the minimap / Walk-Run bar / Map
// button, touch-sized); tapping it opens the drill panel (ore + location, bit, rate, mined, coal + burn, status, tether need vs available, pick up); long-press still deploys
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html', SHOT = process.env.SHOT || '';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(1000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 200000 }).catch(() => {}); await p.waitForTimeout(800);
  const shot = async (f) => { if (SHOT) { await p.waitForTimeout(1500); await p.screenshot({ path: SHOT + '/' + f }); } };
  const tick = (n) => p.evaluate((n) => { for (let i = 0; i < n; i++) Explore.tick(1 / 30); }, n);
  // seeded item
  const s0 = await p.evaluate(() => { Explore.build(); const WS = Explore.WS, N = Explore.ORE.nodes, D = Explore.drillState(), R = 5 * Explore.runSpeed() * WS;
    // a spot with no ore within reach (well clear of every node) and one ~12 m from a reachable ground node
    const H = Explore.doorSpots().find((q) => q.type === 'ledge'); let far = null; for (let k = 1; k < 400 && !far; k++) { const a = k * 2.399, r = WS * (20 + k * 3), q = Explore.reach(H.x + Math.cos(a) * r, H.y + Math.sin(a) * r); if (Explore.clsAt(q[0], q[1]) === 1 && N.every((n) => Math.hypot(n.x - q[0], n.y - q[1]) > R + WS * 15)) far = q; }
    const tgt = N.filter((n) => !n.cliff && Explore.oreStand(n)).sort((a, b) => Math.hypot(a.x - H.x, a.y - H.y) - Math.hypot(b.x - H.x, b.y - H.y))[0], st = Explore.oreStand(tgt);
    window.__T = { far, st, tgt: N.indexOf(tgt) }; return { left: D.left, item: Craft.get('bag', 'drill:mithril'), R: R / WS, far: !!far, tgt: tgt && tgt.type }; });
  console.log(JSON.stringify(s0)); ok(s0.left > 0 && s0.item === s0.left, `Mithril Drill seeded in the backpack, one per drill left (${s0.item} / ${s0.left})`); ok(s0.R > 15 && s0.R < 40, `5 s walk at her run speed = ${s0.R.toFixed(1)} m`);
  // far from ore: the menu says so
  if (s0.far) { const f = await p.evaluate(async () => { Explore.enter(__T.far[0], __T.far[1]); for (let i = 0; i < 10; i++) Explore.tick(1 / 30); document.getElementById('exBagBtn').click(); await new Promise((r) => setTimeout(r, 200));
      document.querySelector('.cxs.full[data-id="drill:mithril"]').click(); await new Promise((r) => setTimeout(r, 200)); const m = document.querySelector('.cxdrill'); return { m: !!m, txt: m && m.textContent, dis: m && m.querySelector('[data-cx=dset]').disabled }; });
    ok(f.m && /No ore within 5 s walk/.test(f.txt) && f.dis, `away from ore the drill menu says "No ore within 5 s walk" and Set up is disabled`); await shot('menu-none.png');
    await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} }); }
  // near ore: type + distance, confirm walks there and sets up
  const n1 = await p.evaluate(async () => { const WS = Explore.WS, st = __T.st, n = Explore.ORE.nodes[__T.tgt]; let k = null; for (const a of [0, 1.6, 3.1, 4.7, 0.8, 2.4, 3.9, 5.5]) { const q = Explore.reach(st[0] + Math.cos(a) * WS * 10, st[1] + Math.sin(a) * WS * 10); if (Explore.clsAt(q[0], q[1]) === 1 && Math.hypot(q[0] - st[0], q[1] - st[1]) > WS * 6) { k = q; break; } } if (!k) k = Explore.reach(st[0], st[1]);
    Explore.exit(); Explore.enter(k[0], k[1]); for (let i = 0; i < 20; i++) Explore.tick(1 / 30); const X = Explore.drillNear(); document.getElementById('exBagBtn').click(); await new Promise((r) => setTimeout(r, 200));
    document.querySelector('.cxs.full[data-id="drill:mithril"]').click(); await new Promise((r) => setTimeout(r, 200)); const m = document.querySelector('.cxdrill'); return { X: X.err ? X : { type: X.type, name: X.name, m: X.m, s: X.s, node: X.node }, txt: m && m.textContent, dis: m && m.querySelector('[data-cx=dset]').disabled }; });
  console.log(JSON.stringify(n1.X)); ok(!n1.X.err && n1.txt && n1.txt.includes(n1.X.name + ' ore') && /\d+ m away · [\d.]+ s walk/.test(n1.txt) && !n1.dis, `near ore the menu shows the ore type and distance (${n1.txt && n1.txt.replace(/\s+/g, ' ').slice(0, 90)})`); ok(n1.X.s <= 5, `nearest ore within 5 s walk (${n1.X.s} s)`);
  await shot('menu.png');
  const n2 = await p.evaluate(async () => { const D = Explore.drillState(), c0 = D.list.length, l0 = D.left; document.querySelector('.cxdrill [data-cx=dset]').click(); await new Promise((r) => setTimeout(r, 100)); const pend = Explore.EX.pend, modal = !!document.querySelector('.cxdrill');
    let t = 0; while (Explore.EX.pend === 'drill' && t < 900) { Explore.tick(1 / 30); t++; } const d = D.list[D.list.length - 1], h = Explore.here(), n = Explore.ORE.nodes[d.node];
    return { pend, modal, t: +(t / 30).toFixed(1), added: D.list.length - c0, left: l0 - D.left, item: Craft.get('bag', 'drill:mithril') === D.left, tier: d.tier, node: d.node, dist: Math.hypot(n.x - h[0], n.y - h[1]) / Explore.WS, mesh: !!Explore.DRILL.meshes.get(d.id), panel: document.getElementById('drillCtl').classList.contains('on') }; });
  console.log(JSON.stringify(n2)); ok(n2.pend === 'drill' && !n2.modal, 'confirm closes the backpack and she sets off'); ok(n2.added === 1 && n2.left === 1 && n2.item && n2.node === n1.X.node, `she walks there (${n2.t} s) and the drill is deployed on that ore; one Mithril Drill used`); ok(n2.tier === 'mithril' && n2.mesh, 'mithril bit, drill model on the map (same deploy as long-press)');
  await p.evaluate(() => Explore.drillPanel(null));
  // second drill -> two stacked HUD icons
  const h2 = await p.evaluate(async () => { const r = Explore.drillSetup(); let t = 0; while (Explore.EX.pend === 'drill' && t < 900) { Explore.tick(1 / 30); t++; } Explore.drillPanel(null); for (let i = 0; i < 20; i++) Explore.tick(1 / 30); Explore.drillHud();
    const R = (q) => { const e = document.querySelector(q); if (!e || e.offsetParent === null) return null; const b = e.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; }, B = [...document.querySelectorAll('#drillHud .dh')].map((e) => { const b = e.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; });
    const hit = (a, c) => a && c && a[0] < c[2] && c[0] < a[2] && a[1] < c[3] && c[1] < a[3]; const others = ['#miniMap', '#exploreBar', '#exMapBtn', '#exBagBtn', '#cityHint', '.cityBtns', '#cityInfo', '.cityTitle', '#ticker'].map((q) => [q, R(q)]).filter((x) => x[1]);
    return { err: r.err || null, n: B.length, B, over: others.filter(([q, o]) => B.some((bb) => hit(bb, o))).map((x) => x[0]), stack: B.length < 2 || B.every((bb, i) => i === 0 || bb[3] <= B[i - 1][1] + 0.5 || B[i - 1][3] <= bb[1] + 0.5), min: Math.min(...B.map((bb) => Math.min(bb[2] - bb[0], bb[3] - bb[1]))), lowLeft: B.every((bb) => bb[0] < 80 && bb[1] > innerHeight * 0.35) }; });
  console.log(JSON.stringify(h2)); ok(h2.n === 2 && h2.stack, `one HUD icon per active drill, stacked (${h2.n})`); ok(!h2.over.length, `HUD icons clear of the other buttons (${h2.over.join(',') || 'none'})`); ok(h2.min >= 44 && h2.lowLeft, `touch-sized (${h2.min}px) in the lower left`);
  await shot('hud.png');
  // tap the icon: the panel
  const pn = await p.evaluate(async () => { document.querySelector('#drillHud .dh').click(); await new Promise((r) => setTimeout(r, 100)); const c = document.getElementById('drillCtl'), t = c.textContent;
    return { on: c.classList.contains('on'), t, sel: !!document.querySelector('#drillHud .dh.sel'), acts: [...c.querySelectorAll('[data-k=act] button')].map((b) => b.textContent), bit: !!c.querySelector('[data-k=bit] button.on') }; });
  const T = pn.t; ok(pn.on && pn.sel, 'tapping the icon opens its drill panel');
  ok(/ore/.test(T) && /📍 \d+ m from the Ledge door/.test(T), 'panel: ore type and location'); ok(pn.bit && /mines \d+ ore\/h/.test(T), 'panel: bit tier and mining rate'); ok(/Mined so far \d+ ore/.test(T) && /hopper \d+\/\d+/.test(T), 'panel: ore mined / in storage');
  ok(/coal \d+\/\d+/.test(T) && /burns \d+ coal\/h/.test(T), 'panel: coal level and burn rate'); ok(/Running|Out of coal|Full|Idle/.test(T), 'panel: status'); ok(/needs \d+ m · available \d+ m/.test(T) && pn.acts.some((a) => /Tether to Ledge/.test(a)), 'panel: tether need vs available, Tether to Ledge'); ok(pn.acts.includes('Pick up drill'), 'panel: pick up');
  await shot('panel.png');
  // tether it, then untether; pick up removes the icon and returns the drill to the backpack
  const pu = await p.evaluate(async () => { const D = Explore.drillState(); D.tetherM = 1e6; const c = document.getElementById('drillCtl'), btn = (re) => [...c.querySelectorAll('[data-k=act] button')].find((b) => re.test(b.textContent)); btn(/Tether to Ledge/).click(); const d = Explore.DRILL.sel, wired = !!d.port, lab = btn(/Untether/) ? 'Untether' : '';
    btn(/Untether/).click(); const unw = !d.port; const n0 = D.list.length, i0 = Craft.get('bag', 'drill:mithril'); btn(/Pick up drill/).click(); Explore.drillHud(); return { wired, lab, unw, gone: n0 - D.list.length, item: Craft.get('bag', 'drill:mithril') - i0, icons: document.querySelectorAll('#drillHud .dh').length, panel: c.classList.contains('on') }; });
  console.log(JSON.stringify(pu)); ok(pu.wired && pu.lab && pu.unw, 'Tether to Ledge strings it, Untether frees it'); ok(pu.gone === 1 && pu.item === 1 && pu.icons === 1 && !pu.panel, 'Pick up removes the drill and its icon, the Mithril Drill goes back in the backpack');
  // the old long-press deploy still works (and also spends one Mithril Drill)
  const lp = await p.evaluate(async () => { const D = Explore.drillState(), WS = Explore.WS, h = Explore.here(), used = new Set(D.list.map((d) => d.node)); const N = Explore.ORE.nodes; const n = N.filter((q) => !used.has(N.indexOf(q)) && !q.cliff).sort((a, b) => Math.hypot(a.x - h[0], a.y - h[1]) - Math.hypot(b.x - h[0], b.y - h[1]))[0];
    for (let i = 0; i < 5; i++) Explore.tick(1 / 30); const s = M3.project(n.x, n.y, n.s * 0.5), c0 = D.list.length, i0 = Craft.get('bag', 'drill:mithril'), r = Explore.longPress(s[0], s[1]); Explore.drillPanel(null); return { r, added: D.list.length - c0, item: i0 - Craft.get('bag', 'drill:mithril') }; });
  console.log(JSON.stringify(lp)); ok(lp.r && lp.added === 1 && lp.item === 1, 'long-press on an ore node still deploys a drill (and spends a Mithril Drill)');
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | ')); console.log(fails ? 'SOME FAILED' : 'ALL PASS'); await b.close(); })();

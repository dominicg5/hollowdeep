// Attaching a Ledge Tether to a far drill (1000+ m, including routes longer than the old 3000 m drill pool)
// must count every metre in the backpack and the vault, not S.drills.tetherM. The "not enough" message
// shows needed versus owned metres; a genuinely short coil still fails.
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(1000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 200000 }).catch(() => {});
  await p.waitForFunction(() => typeof Explore !== 'undefined' && Explore.on, null, { timeout: 60000 }).catch(() => {});
  await p.evaluate(() => { Skills.migrate(); S.skills.mining = Math.max(S.skills.mining || 0, Skills.xpToReach(90)); }); // existing tests predate drill-slot unlocks; give all 9 slots so deploy checks stay about stands, bits and tethers

  const far = await p.evaluate(() => {
    Explore.build();
    const WS = Explore.WS, H = Explore.doorSpots().find((q) => q.type === 'ledge'), N = Explore.ORE.nodes, D = Explore.drillState();
    const owned = Object.keys(Craft.ITEMS).filter((id) => Craft.ITEMS[id].kind === 'teth').reduce((a, id) => a + Craft.have(id), 0);
    const bag = Object.keys(Craft.ITEMS).filter((id) => Craft.ITEMS[id].kind === 'teth').reduce((a, id) => a + Craft.get('bag', id), 0);
    const vault = Object.keys(Craft.ITEMS).filter((id) => Craft.ITEMS[id].kind === 'teth').reduce((a, id) => a + Craft.get('vault', id), 0);
    const cap = D.tetherM, used = D.list.reduce((a, d) => a + (d.port && !d.camp ? d.len || 0 : 0), 0);
    const cands = N.map((n, i) => ({ i, n, straight: Math.hypot(n.x - H.x, n.y - H.y) / WS }))
      .filter((q) => !q.n.cliff && q.straight >= 1000 && Explore.oreStand(q.n))
      .sort((a, b) => b.straight - a.straight);
    let hit = null;
    for (const c of cands) {
      const d = Explore.drillDeploy(c.n); if (!d) continue;
      const r = Explore.drillRoute(d); if (!r) continue;
      if (r.len > cap && r.len <= owned) { hit = d; break; }
      // leave unused far deploys in place only if we must keep looking; pick this one up to recycle the stand
      Explore.drillPickUp(d);
    }
    if (!hit) return { found: false, nCands: cands.length, cap, owned, bag, vault };
    const need = hit.len || (Explore.drillRoute(hit) || {}).len;
    const toasts = []; const prev = typeof toast === 'function' ? toast : null;
    if (typeof toast === 'function') { const t0 = toast; toast = (m) => { toasts.push(String(m)); if (t0) t0(m); }; }
    const wired = Explore.drillWire(hit, true);
    Explore.drillPanel(hit);
    const box = document.getElementById('drillCtl'), T = box ? box.textContent : '';
    Explore.drillInteract(hit);
    const use = document.getElementById('drillUse');
    const btn = use && [...use.querySelectorAll('button')].find((b) => /Tether to Ledge|Untether/.test(b.textContent));
    return {
      found: true, id: hit.id, type: hit.type, need, cap, used, capFree: cap - used, owned, bag, vault,
      bagM: Craft.get('bag', 'tether:mithril'), vaultM: Craft.get('vault', 'tether:mithril'),
      wired, port: hit.port || null, toasts, panel: T.replace(/\s+/g, ' ').trim(),
      notEnough: /not enough/i.test(T), btn: btn && btn.textContent.trim(), dis: !!(btn && btn.classList.contains('dis'))
    };
  });
  console.log(JSON.stringify(far));
  ok(far.found && far.need >= 1000, `a far drill (route ${far.need} m) is on the map, farther than typical`);
  ok(far.need > far.cap, `that route is longer than the old ${far.cap} m drill pool (need ${far.need} m)`);
  ok(far.owned >= far.need && far.bagM === 4000 && far.vault >= 5000, `she owns enough tether (owned ${far.owned} m: bag ${far.bag} m + vault ${far.vault} m, including ${far.bagM} m mithril in the backpack)`);
  ok(far.wired && far.port, `Tether to Ledge succeeds on the far drill (need ${far.need} m, owned ${far.owned} m)`);
  ok(!far.notEnough && far.btn === 'Untether', 'the panel does not say "not enough"; the drill is strung');
  ok(!/you have 3000 m/.test((far.toasts || []).join(' ')), 'no leftover "you have 3000 m" refusal');

  const short = await p.evaluate(() => {
    const D = Explore.drillState(), d = D.list.find((q) => q.port && !q.camp) || D.list.find((q) => !q.camp);
    if (!d) return { ok: false };
    if (d.port) Explore.drillWire(d, false);
    // leave her with a short coil that cannot cover the route
    for (const id of Object.keys(Craft.ITEMS)) if (Craft.ITEMS[id].kind === 'teth') {
      const b = Craft.get('bag', id), v = Craft.get('vault', id);
      if (b) Craft.add('bag', id, -b); if (v) Craft.add('vault', id, -v);
    }
    Craft.add('bag', 'tether:mithril', 100);
    const owned = Object.keys(Craft.ITEMS).filter((id) => Craft.ITEMS[id].kind === 'teth').reduce((a, id) => a + Craft.have(id), 0);
    const need = d.need != null ? d.need : (Explore.drillRoute(d) || { len: 0 }).len;
    const toasts = []; const t0 = typeof toast === 'function' ? toast : null;
    if (t0) toast = (m) => { toasts.push(String(m)); t0(m); };
    const wired = Explore.drillWire(d, true);
    Explore.drillPanel(d);
    const T = (document.getElementById('drillCtl') || {}).textContent || '';
    const msg = toasts.join(' | ');
    return { wired, port: d.port, need, owned, msg, panel: T.replace(/\s+/g, ' ').trim(), notEnough: /not enough/i.test(T) };
  });
  console.log(JSON.stringify(short));
  ok(!short.wired && !short.port, `a 100 m coil is honestly too short for a ${short.need} m route`);
  ok(new RegExp(String(short.need)).test(short.msg) && new RegExp(String(short.owned)).test(short.msg),
    `the refusal names needed versus owned metres ("${short.msg}")`);
  ok(short.notEnough, 'the panel marks the short coil as not enough');

  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  console.log(fails ? 'SOME FAILED' : 'ALL PASS');
  await b.close();
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });

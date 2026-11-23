// Theus (the forge ape) talk + pickaxe tiers on the item (Dominic: one tiered pickaxe per kind, its own tier; plain ones stack, are T0 and pay). Checks: the first-meeting chain
// (restart if closed early, one gift, returning players skip it, no Prometheus), tier maths, equipped item's tier sets the multiplier, drills unaffected, strike yield, consumption, save
// round-trip + earlier-build migration, names / T badges (backpack never shows vault items), sell confirm + reset to T0, forge card (T0, names wrap), anvil gate, portraits, no page errors.
// SHOT=1: pickaxe_upgrade_item_panel / backpack_tier_badge / sell_tiered_confirm / theus_first_meeting_strip (composed from probe/js/strip) to /workspace/shots-char/final/.
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html', SHOT = process.env.SHOT || '', OUT = '/workspace/shots-char/final/';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL + '?t=' + Date.now(), { timeout: 90000, waitUntil: 'commit' }); await p.waitForTimeout(4000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 240000 }).catch(() => {}); await p.waitForFunction(() => Explore.on && FORGE.M.built, null, { timeout: 120000 }).catch(() => {});
  const R = await p.evaluate(() => { const K = Skills, o = {}, P = (k) => 'tool:pick_' + k, T = (k) => Craft.TPICK(k), clr = (id) => Craft.take(id, Craft.have(id));
    const setT = (k, n) => { clr(T(k)); S.tpicks = S.tpicks || {}; if (n > 0) { if (!Craft.add('bag', T(k), 1)) Craft.add('vault', T(k), 1); S.tpicks[k] = n; } else delete S.tpicks[k]; };
    const dlg = () => document.getElementById('thDlg'), tapOn = () => dlg().click(), port = () => document.querySelector('#thDlg .tPort').style.backgroundImage.replace(/.*theus\/(\w+)\.webp.*/, '$1');
    // the first meeting: close at first4, reopen restarts at first1; through first7 -> one plain Bronze Pickaxe + toast, then the menu; once per save; returning players get hello
    S.theusMet = false; clr(P('bronze')); Theus.close(); Theus.open(); tapOn(); tapOn(); tapOn(); o.midStep = Theus.step; Theus.close(); o.mid = [Craft.have(P('bronze')), !!S.theusMet];
    Theus.open(); o.restart = Theus.step; const faces = [port()], ids = [Theus.step]; for (let i = 0; i < 6; i++) { tapOn(); faces.push(port()); ids.push(Theus.step); } o.faces = faces; o.ids = ids;
    tapOn(); const tl = document.querySelector('#toasts .toast:last-child'); o.gift = [Craft.have(P('bronze')), Craft.have(T('bronze')), !!S.theusMet, Theus.step, tl && tl.textContent, !!(tl && tl.querySelector('.thTI'))];
    o.saved1 = JSON.parse(localStorage.getItem('hollowdeep.save.v1')).theusMet; Theus.close(); Theus.open(); o.ret = Theus.step; o.again = [Theus.gift(), Craft.have(P('bronze'))]; Theus.close();
    o.firstProm = Object.entries(Theus.STEPS).filter(([k, s]) => /^first/.test(k) && /Prometheus/.test(s.say)).length; o.nFirst = Object.keys(Theus.STEPS).filter((k) => /^first/.test(k)).length;
    // tier maths (the tier on the kind's one tiered pickaxe)
    o.mult = Array.from({ length: 11 }, (_, n) => { setT('steel', n); return K.pickUpgMult('steel'); }); o.cost = Array.from({ length: 10 }, (_, i) => K.pickUpgCost(i + 1));
    const L = 40, base = K.characterOrePerHour('iron', 2, L); o.oreh = [0, 3, 10].map((n) => +(K.characterOrePerHour('iron', 2, L, { upg: Math.pow(2, n) }) / base).toFixed(6));
    // equipped: the tiered Steel T4 in hand -> x16; the plain Steel in hand -> x1
    setT('steel', 4); Craft.add('bag', P('steel'), 1); Craft.equip(T('steel')); o.eqT = [K.equippedPickMult(), +(K.equippedOrePerHour('iron', L) / K.characterOrePerHour('iron', K.equippedPickTier(), L)).toFixed(6), Craft.equipped(T('steel')), Craft.equipped(P('steel'))];
    Craft.equip(P('steel')); o.eqP = [K.equippedPickMult(), Craft.equipped(T('steel')), Craft.equipped(P('steel'))];
    // drills: no tiered pickaxes vs every kind at T10 with the tiered Steel in hand
    K.PICK_KINDS.forEach((k) => setT(k, 0)); const d0 = ['copper', 'iron', 'gold'].map((x) => K.drillOrePerHour(x, 2, L)); K.PICK_KINDS.forEach((k) => setT(k, 10)); Craft.equip(T('steel')); const d1 = ['copper', 'iron', 'gold'].map((x) => K.drillOrePerHour(x, 2, L)); o.drill = [d0, d1, K.equippedPickMult()]; K.PICK_KINDS.forEach((k) => setT(k, 0));
    o.strike = [K.oreFromStrike(0.6, 1, 0.5), K.oreFromStrike(0.6, 1, 0.7), K.oreFromStrike(0.6, 8, 0.9), K.oreFromStrike(0.6, 8, 0.5), K.oreFromStrike(0.6, 1024, 0.99)];
    // consumption: 25 plain Steel (10 bag + 15 vault), plain Steel in hand. First upgrade: 1 becomes the T1 item + 20 paid (21); T2 (40) refused with 4; +40 -> T2; one tiered item throughout, never counted as plain
    clr(P('steel')); Craft.add('bag', P('steel'), 10); Craft.add('vault', P('steel'), 15); Craft.equip(P('steel')); o.h0 = Craft.have(P('steel'));
    const r1 = Theus.upgrade('steel'); o.r1 = [r1.ok, K.pickUpgTier('steel'), Craft.have(P('steel')), Craft.have(T('steel')), S.pickEqT]; const r2 = Theus.upgrade('steel'); o.r2 = [r2.ok, r2.why, K.pickUpgTier('steel'), Craft.have(P('steel')), Craft.have(T('steel'))];
    Craft.add('bag', P('steel'), 40); const r3 = Theus.upgrade('steel'); o.r3 = [r3.ok, K.pickUpgTier('steel'), Craft.have(P('steel')), Craft.have(T('steel'))]; o.other = K.pickUpgTier('iron');
    // save round-trip, then a save from the earlier build (pickTiers per kind) migrates to one tiered item per kind
    save(); const raw = JSON.parse(localStorage.getItem('hollowdeep.save.v1')), back = load(); o.saved = [raw.tpicks && raw.tpicks.steel, back.tpicks && back.tpicks.steel, (back.backpack[T('steel')] || 0) + ((back.ledgeVault.gear || {}).tpick_steel || 0), back.theusMet];
    const old = JSON.parse(JSON.stringify(raw)); delete old.tpicks; delete old.pickEqT; for (const k of K.PICK_KINDS) { delete old.backpack[T(k)]; if (old.ledgeVault && old.ledgeVault.gear) delete old.ledgeVault.gear['tpick_' + k]; } old.pickTiers = { bronze: 5, steel: 3 }; old.pickGrade = 'steel';
    localStorage.setItem('hollowdeep.save.v1', JSON.stringify(old)); const m = load(), cnt = (k) => (m.backpack[T(k)] || 0) + ((m.ledgeVault.gear || {})['tpick_' + k] || 0); o.mig = [m.tpicks.bronze, m.tpicks.steel, cnt('bronze'), cnt('steel'), cnt('iron'), m.pickEqT, 'pickTiers' in m]; save();
    // names, badges: backpack (bag only), vault, sell screen with the danger confirm
    setT('bronze', 5); setT('rune', 3); setT('gold', 2); if (Craft.get('bag', T('gold'))) Craft.move('bag', 'vault', T('gold'), 1); o.nm = Craft.nm(T('bronze'));
    const bh = Craft.bagHTML(false); o.bag = [bh.includes('title="Rune Pickaxe (T3)"'), /data-id="tool:tpick_rune"[^>]*>.*?<b class="cxtb">T3<\/b>/.test(bh), bh.includes('tool:tpick_gold')];
    Craft.open('xfer'); const xh = document.getElementById('modalBody').innerHTML, vi = xh.indexOf('Ledge Vault'); o.vault = [vi > 0 && xh.indexOf('title="Gold Pickaxe (T2)"') > vi, /<b class="cxtb">T2<\/b>/.test(xh.slice(vi))];
    S.res.lumen = 0; Craft.st.tab = 'sell'; Craft.st.qty = 1; Craft.open('exchange'); const sb = () => document.querySelector(`#modalBody [data-cx="sell"][data-id="${T('bronze')}"]`), row = sb() && sb().closest('.cxr');
    o.row = [row && row.textContent.includes('Bronze Pickaxe (T5)'), !!(row && row.querySelector('.cxtb'))]; sb().click(); const dz = document.querySelector('#modalBody .cxdanger'); o.conf = [dz && dz.querySelector('p').textContent, Craft.have(T('bronze'))];
    document.querySelector('#modalBody [data-cx="sellno"]').click(); o.keep = [!document.querySelector('#modalBody .cxdanger'), Craft.have(T('bronze')), K.pickUpgTier('bronze')];
    sb().click(); document.querySelector('#modalBody [data-cx="sellok"]').click(); o.sold = [Craft.have(T('bronze')), K.pickUpgTier('bronze'), !!(S.tpicks && S.tpicks.bronze), S.res.lumen > 0]; try { closeModalQuiet(); } catch (e) {}
    // the forge card: bronze (sold) shows T0 and the first-upgrade note; names wrap, no ellipsis
    Theus.openUp('bronze'); o.t0 = [document.querySelector('#thUp .uK[data-k="bronze"] .thBadge').textContent, document.querySelector('#thUp .uK[data-k="lumen"] .thBadge').textContent, !!document.querySelector('#thUp .uNote')];
    o.wrap = [...document.querySelectorAll('#thUp .uK span')].map((e) => { const c = getComputedStyle(e); return c.whiteSpace !== 'nowrap' && c.textOverflow !== 'ellipsis' && e.scrollWidth <= e.clientWidth + 1 && e.textContent.endsWith('Pickaxe'); }).every(Boolean); Theus.closeUp();
    // the anvil gate: on the platform top vs the scorched ground below
    const F = FORGE, t = []; for (const [X, Y] of [[85, 0], [120, 10], [105, -80], [140, 100]]) { Theus.close(); const r = Theus.tapAt(F.wld(X, Y)); t.push([X, Y, r, !dlg().classList.contains('hidden'), F.platD(X, Y)]); } Theus.close(); o.gate = t;
    // the talk (returning): hello idle, menu talking, the deal pleased; "Upgrade pickaxe" opens the card; Prometheus only in the lore line
    Theus.open(); o.f0 = port(); Theus.go('menu'); o.f1 = port(); o.btns = [...document.querySelectorAll('#thDlg .tBtns button')].map((x) => x.textContent);
    o.prom = Object.entries(Theus.STEPS).filter(([, s]) => /Prometheus/.test(s.say)).map(([k]) => k); document.querySelector('#thDlg button[data-a="upgrade"]').click(); o.f2 = port(); tapOn(); o.upOpen = !document.getElementById('thUp').classList.contains('hidden');
    // a real Upgrade click: tiered Steel T1 + 40 plain -> T2, all 40 consumed, hammer + sparks, pleased line
    setT('steel', 1); clr(P('steel')); Craft.add('bag', P('steel'), 40); Theus.openUp('steel'); const btn = document.querySelector('#thUp .uGo'); o.btnOn = btn && !btn.disabled; btn.click();
    o.click = [K.pickUpgTier('steel'), Craft.have(P('steel')), Craft.have(T('steel')), !!document.querySelector('#thUp .uFx .sp'), /pleased/.test(document.querySelector('#thUp .uSay i').style.backgroundImage)];
    o.gates = /gates/i.test(document.getElementById('thUp').innerHTML + dlg().innerHTML); Theus.closeUp();
    const img = (f) => new Promise((res) => { const i = new Image(); i.onload = () => res([i.naturalWidth, i.naturalHeight]); i.onerror = () => res(null); i.src = 'assets/ui/theus/' + f + '.webp'; }); return Promise.all(['idle', 'talking', 'pleased'].map(img)).then((im) => { o.img = im; return o; }); });
  console.log('THEUS ' + JSON.stringify(R));
  ok(R.midStep === 'first4' && R.mid.join() === '0,false' && R.restart === 'first1', `first meeting: closed at ${R.midStep} (no gift, not met), reopened at ${R.restart}`);
  ok(R.ids.join() === 'first1,first2,first3,first4,first5,first6,first7' && R.faces.join() === 'idle,talking,pleased,talking,talking,idle,pleased' && R.nFirst === 7 && R.firstProm === 0, `chain ${R.faces.join(' / ')}; no Prometheus in the first-meeting lines`);
  ok(R.gift.join() === '1,0,true,menu,Received: Bronze Pickaxe,true' && R.saved1 === true, `gift: 1 plain Bronze Pickaxe (T0), toast "${R.gift[4]}" with the pickaxe icon, then the menu; theusMet saved`);
  ok(R.ret === 'hello' && R.again.join() === 'false,1', `returning: ${R.ret} (no chain), no second gift (still ${R.again[1]})`);
  ok(R.mult.join() === '1,2,4,8,16,32,64,128,256,512,1024', `tier N = x2^N (T10 x${R.mult[10]})`);
  ok(R.cost.join() === '20,40,80,160,320,640,1280,2560,5120,10240', `costs T1-T10: ${R.cost.join(', ')}`);
  ok(R.oreh.join() === '1,8,1024' && R.eqT.join() === '16,16,true,false' && R.eqP.join() === '1,false,true', `ore/h formula x${R.oreh.join(', x')} at T0/T3/T10; tiered Steel T4 in hand x${R.eqT[0]}, plain Steel in hand x${R.eqP[0]}`);
  ok(JSON.stringify(R.drill[0]) === JSON.stringify(R.drill[1]) && R.drill[2] === 1024, `drills unaffected: ${R.drill[0].map((v) => v.toFixed(2)).join(', ')} ore/h with no tiered pickaxe and with every kind T10 (T10 in hand)`);
  ok(R.strike.join() === '1,0,4,5,614', `strike yield x mult (chance 0.6: x1 -> 1/0, x8 -> 4/5, x1024 -> ${R.strike[4]})`);
  ok(R.h0 === 25 && R.r1.join() === 'true,1,4,1,steel' && R.r2.join() === 'false,short,1,4,1' && R.r3.join() === 'true,2,4,1' && R.other === 0, `consumption: 25 plain -> T1 took 21 (1 became the tiered one, 20 paid; left ${R.r1[2]}, tiered ${R.r1[3]}, in hand); T2 refused with 4 (nothing taken); +40 -> T2 (left 4, still one tiered)`);
  ok(R.saved.join() === '2,2,1,true' && R.mig.join() === '5,3,1,1,0,steel,false', `save round-trip (hollowdeep.save.v1): tiered Steel T${R.saved[1]}; earlier-build save {bronze:5, steel:3} -> one tiered item each (T${R.mig[0]}, T${R.mig[1]}), Steel in hand, pickTiers gone`);
  ok(R.nm === 'Bronze Pickaxe (T5)' && R.bag.join() === 'true,true,false' && R.vault.join() === 'true,true' && R.row.join() === 'true,true', `names + T badges: "${R.nm}"; backpack shows Rune (T3) with its badge and never the vault's Gold (T2); the vault grid shows Gold (T2); sell row`);
  ok(R.conf[0] === "This will lose Tier 5. You'll start over at Tier 1." && R.conf[1] === 1 && R.keep.join() === 'true,1,5' && R.sold.join() === '0,0,false,true', `sell confirm "${R.conf[0]}"; Keep it keeps T5; sold -> kind back to T0`);
  ok(R.t0.join() === 'T0,T0,true' && R.wrap, `forge card: kinds without a tiered pickaxe show T0; names wrap whole (no ellipsis)`);
  ok(R.gate[0][2] === 'open' && R.gate[0][3] && R.gate[1][2] === 'open' && R.gate[2][2] === 'hint' && !R.gate[2][3] && R.gate[3][2] === 'hint' && !R.gate[3][3], `anvil gate: on the platform top opens the talk, on the ground only the hint: ${JSON.stringify(R.gate)}`);
  ok(R.f0 === 'idle' && R.f1 === 'talking' && R.f2 === 'pleased' && R.img.every((q) => q && q[0] === 192 && q[1] === 192), `portraits: idle on hello, talking mid-line, pleased on the deal (192x192 x3)`);
  ok(R.btns.includes('Upgrade pickaxe') && R.upOpen && R.prom.join() === 'who', `talk: ${R.btns.join(' / ')}; "Upgrade pickaxe" opens the card; Prometheus only in the lore line (${R.prom})`);
  ok(R.btnOn && R.click.join() === '2,0,1,true,true' && !R.gates, `Upgrade button: T1 -> T2, 40 consumed, still one tiered, hammer + sparks, pleased line; no "gates" wording`);
  // the real path: she stands on the platform top / on the ground below; a tap on his body goes through Explore.tap (the pick), then the gate
  const pk = await p.evaluate(async () => { const F = FORGE, o = {}, wait = (ms) => new Promise((r) => setTimeout(r, ms)), dlg = () => !document.getElementById('thDlg').classList.contains('hidden');
    const spot = (want) => { const el = M3.renderer.domElement; for (let y = 120; y < el.clientHeight - 160; y += 16) for (let x = 20; x < el.clientWidth - 70; x += 16) if (Theus.hit(x, y) === want) return [x, y]; return null; };
    F.M.tOv = 14.5; Theus.closeUp(); Theus.close(); Explore.enter(...F.wld(80, 0)); for (let i = 0; i < 5; i++) Explore.tick(1 / 30); Explore.EX.az = 4.7; await wait(2500);
    o.top = F.loc(...Explore.here()).map(Math.round); const sp = spot(true), off = spot(false); o.sp = sp; o.off = off; o.hitOn = !!sp; o.hitOff = !off || Theus.hit(...off); const el = M3.renderer.domElement; o.gndHit = Theus.hit(el.clientWidth / 2, el.clientHeight - 200); /* (the platform at her feet) */ if (sp) Explore.tap(...sp); o.openTop = dlg(); Theus.close(); o.tapTop = Theus.tapAt(); Theus.close();
    Explore.enter(...F.wld(105, -80)); for (let i = 0; i < 5; i++) Explore.tick(1 / 30); await wait(600); o.gnd = F.loc(...Explore.here()).map(Math.round); o.tapGnd = Theus.tapAt(); o.openGnd = dlg();
    Explore.enter(...F.wld(80, 0)); for (let i = 0; i < 5; i++) Explore.tick(1 / 30); Explore.EX.az = 4.7; await wait(2500); return o; });
  console.log('PICK ' + JSON.stringify(pk));
  ok(pk.hitOn && !pk.hitOff && !pk.gndHit && pk.openTop && pk.tapTop === 'open', `on the anvil top (at ${pk.top}): a tap on his body (${pk.sp}) through Explore.tap opens the talk; the platform at her feet / beside him (${pk.off}) is no hit (skinned raycast, ground-occluded)`);
  ok(pk.tapGnd === 'hint' && !pk.openGnd, `on the ground (at ${pk.gnd}): tapping him gives only the hint, no talk`);
  if (SHOT) {
    const shot = async (f, setup, sel, block) => { await p.evaluate(([setup, sel, block]) => { (0, eval)(setup)(); const e = sel && document.querySelector(sel); if (e) e.scrollIntoView({ block }); }, [setup.toString(), sel, block]); await p.waitForTimeout(600); await p.screenshot({ path: OUT + f }); };
    await shot('pickaxe_upgrade_item_panel.png', () => { const P = (k) => 'tool:pick_' + k, T = (k) => Craft.TPICK(k), clr = (id) => Craft.take(id, Craft.have(id)); const setT = (k, n) => { clr(T(k)); if (!Craft.add('bag', T(k), 1)) Craft.add('vault', T(k), 1); S.tpicks[k] = n; };
      Theus.close(); try { closeModalQuiet(); } catch (e) {} setT('bronze', 5); setT('gold', 1); clr(P('bronze')); Craft.add('bag', P('bronze'), 400); Craft.equip(T('bronze')); Theus.openUp('bronze'); });
    await shot('backpack_tier_badge.png', () => { Theus.closeUp(); Craft.open('bag'); Craft.st.menu = { w: 'bag', id: Craft.TPICK('bronze') }; document.getElementById('modalBody').innerHTML = Craft.bagHTML(true); }, '#modalBody .cxmenu', 'nearest');
    await shot('sell_tiered_confirm.png', () => { Craft.st.menu = null; Craft.st.tab = 'sell'; Craft.st.qty = 1; Craft.open('exchange'); document.querySelector(`#modalBody [data-cx="sell"][data-id="${Craft.TPICK('bronze')}"]`).click(); }, '#modalBody .cxdanger', 'center');
    // the first-meeting strip: each of the 7 lines (the dialogue bar + portrait), then the gift toast
    await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} document.querySelectorAll('#toasts .toast').forEach((t) => t.remove()); S.theusMet = false; Theus.open(); }); const fs = require('fs'), SD = '/workspace/probe/js/strip/'; fs.mkdirSync(SD, { recursive: true });
    for (let i = 0; i < 7; i++) { await p.waitForTimeout(250); const bb = await p.locator('#thDlg').boundingBox(); await p.screenshot({ path: SD + 's' + i + '.png', clip: { x: Math.max(0, bb.x - 10), y: Math.max(0, bb.y - 8), width: Math.min(390 - Math.max(0, bb.x - 10), bb.width + 20), height: bb.height + 14 } }); await p.evaluate(() => document.getElementById('thDlg').click()); }
    await p.waitForTimeout(300); const tb = await p.locator('#toasts .toast').last().boundingBox(); await p.screenshot({ path: SD + 's7.png', clip: { x: 0, y: Math.max(0, tb.y - 12), width: 390, height: tb.height + 24 } });
    console.log('STRIP ' + JSON.stringify(await p.evaluate(() => [Theus.step, Craft.have('tool:pick_bronze')])));
    await p.evaluate(() => { FORGE.M.tOv = null; });
  }
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  console.log(fails ? `${fails} FAILED` : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);
})();

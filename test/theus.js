// Theus (the forge ape) talk + pickaxe tiers on the item (Dominic: one tiered pickaxe per kind, its own tier; plain ones stack, are T0 and pay). Checks: the first-meeting chain
// (restart if closed early, one gift, returning players skip it, no Prometheus), tier maths, equipped item's tier sets the multiplier, drills unaffected, strike yield, consumption, save
// round-trip + earlier-build migration, names / T badges (backpack never shows vault items), sell confirm + reset to T0, forge card (T0, names wrap), anvil gate, portraits, no page errors.
// Also: tiered pickaxes only at the Ledgeville Exchange (no shop; buy blocked when holding that kind; list with the warning; cancel), shop sheet title, ore reach (grade + one above).
// SHOT=1: pickaxe_upgrade_x15 to /workspace/shots-char/final/.
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
    o.mult = Array.from({ length: 11 }, (_, n) => { setT('steel', n); return K.pickUpgMult('steel'); }); o.labs = o.mult.map((m) => K.multLabel(m)); o.cost = Array.from({ length: 10 }, (_, i) => K.pickUpgCost(i + 1));
    const L = 40, base = K.characterOrePerHour('iron', 2, L); o.oreh = [0, 3, 10].map((n) => +(K.characterOrePerHour('iron', 2, L, { upg: K.tierMult(n) }) / base).toFixed(6));
    // equipped: the tiered Steel T4 in hand -> x16; the plain Steel in hand -> x1
    setT('steel', 4); Craft.add('bag', P('steel'), 1); Craft.equip(T('steel')); o.eqT = [K.equippedPickMult(), +(K.equippedOrePerHour('iron', L) / K.characterOrePerHour('iron', K.equippedPickTier(), L)).toFixed(6), Craft.equipped(T('steel')), Craft.equipped(P('steel'))];
    Craft.equip(P('steel')); o.eqP = [K.equippedPickMult(), Craft.equipped(T('steel')), Craft.equipped(P('steel'))];
    // drills: no tiered pickaxes vs every kind at T10 with the tiered Steel in hand
    K.PICK_KINDS.forEach((k) => setT(k, 0)); const d0 = ['copper', 'iron', 'gold'].map((x) => K.drillOrePerHour(x, 2, L)); K.PICK_KINDS.forEach((k) => setT(k, 10)); Craft.equip(T('steel')); const d1 = ['copper', 'iron', 'gold'].map((x) => K.drillOrePerHour(x, 2, L)); o.drill = [d0, d1, K.equippedPickMult()]; K.PICK_KINDS.forEach((k) => setT(k, 0));
    o.strike = [K.oreFromStrike(0.6, 1, 0.5), K.oreFromStrike(0.6, 1, 0.7), K.oreFromStrike(0.6, 8, 0.9), K.oreFromStrike(0.6, 8, 0.5), K.oreFromStrike(0.6, 1024, 0.99)];
    // consumption: 25 plain Steel (10 bag + 15 vault), plain Steel in hand. First upgrade: 1 becomes the T1 item + 20 paid (21); T2 (40) refused with 4; +40 -> T2; one tiered item throughout, never counted as plain
    clr(P('steel')); Craft.add('bag', P('steel'), 10); Craft.add('vault', P('steel'), 15); Craft.equip(P('steel')); o.h0 = Craft.have(P('steel'));
    const r1 = Theus.upgrade('steel'); o.r1 = [r1.ok, K.pickUpgTier('steel'), Craft.have(P('steel')), Craft.have(T('steel')), String(S.pickEqT), Craft.get('bag', T('steel'))]; const r2 = Theus.upgrade('steel'); o.r2 = [r2.ok, r2.why, K.pickUpgTier('steel'), Craft.have(P('steel')), Craft.have(T('steel'))];
    Craft.add('bag', P('steel'), 40); const r3 = Theus.upgrade('steel'); o.r3 = [r3.ok, K.pickUpgTier('steel'), Craft.have(P('steel')), Craft.have(T('steel'))]; o.other = K.pickUpgTier('iron');
    // save round-trip, then a save from the earlier build (pickTiers per kind) migrates to one tiered item per kind
    save(); const raw = JSON.parse(localStorage.getItem('hollowdeep.save.v1')), back = load(); o.saved = [raw.tpicks && raw.tpicks.steel, back.tpicks && back.tpicks.steel, (back.backpack[T('steel')] || 0) + ((back.ledgeVault.gear || {}).tpick_steel || 0), back.theusMet];
    const old = JSON.parse(JSON.stringify(raw)); delete old.tpicks; delete old.pickEqT; for (const k of K.PICK_KINDS) { delete old.backpack[T(k)]; if (old.ledgeVault && old.ledgeVault.gear) delete old.ledgeVault.gear['tpick_' + k]; } old.pickTiers = { bronze: 5, steel: 3 }; old.pickGrade = 'steel';
    localStorage.setItem('hollowdeep.save.v1', JSON.stringify(old)); const m = load(), cnt = (k) => (m.backpack[T(k)] || 0) + ((m.ledgeVault.gear || {})['tpick_' + k] || 0); o.mig = [m.tpicks.bronze, m.tpicks.steel, cnt('bronze'), cnt('steel'), cnt('iron'), m.pickEqT, 'pickTiers' in m]; save();
    // names, badges: backpack (bag only), vault, sell screen with the danger confirm
    setT('bronze', 5); setT('rune', 3); setT('gold', 2); if (Craft.get('bag', T('gold'))) Craft.move('bag', 'vault', T('gold'), 1); o.nm = Craft.nm(T('bronze'));
    const bh = Craft.bagHTML(false); o.bag = [bh.includes('title="Rune Pickaxe (T3)"'), /data-id="tool:tpick_rune"[^>]*>.*?<b class="cxtb">T3<\/b>/.test(bh), bh.includes('tool:tpick_gold')];
    Craft.open('xfer'); const xh = document.getElementById('modalBody').innerHTML, vi = xh.indexOf('Ledge Vault'); o.vault = [vi > 0 && xh.indexOf('title="Gold Pickaxe (T2)"') > vi, /<b class="cxtb">T2<\/b>/.test(xh.slice(vi))];
    // the shop sheet: titled Sell / Buy (not "Lumen Crystal"), plain items still there, tiered pickaxes never (sell or buy)
    Craft.st.tab = 'sell'; Craft.st.qty = 1; Craft.open('exchange'); let mh = document.getElementById('modalBody'); o.shopSell = [mh.querySelector('h2').textContent, !!mh.querySelector(`[data-id="${T('bronze')}"]`), !!mh.querySelector(`[data-cx="sell"][data-id="${P('bronze')}"]`), !/Lumen Crystal/.test(mh.innerHTML)];
    Craft.st.tab = 'buy'; Craft.open('exchange'); mh = document.getElementById('modalBody'); o.shopBuy = [mh.querySelector('h2').textContent, /tpick_/.test(mh.innerHTML), !/Lumen Crystal/.test(mh.innerHTML)]; Craft.st.tab = 'sell'; try { closeModalQuiet(); } catch (e) {}
    // the Ledgeville Exchange: buy blocked when holding that kind, buy brings the item with its tier, list (danger warning) hands it over, cancel returns it (blocked if you hold one again)
    S.res.lumen = 100000; Theus.XS.msg = null; Theus.XS.conf = null; CityMap.exchangeCard(); const q = (sel) => document.querySelector('#modalBody ' + sel), msg = () => { const e = q('.thExMsg'); return e ? e.textContent : ''; }, E = Theus.exState();
    o.ex0 = [!!q('#thEx'), E.ai.length, E.ai.map((a) => a.k + a.tier).join(' ')];
    q('[data-act="extbuy"][data-id="ai1"]').click(); o.blocked = [msg(), S.res.lumen, E.ai.some((a) => a.id === 'ai1'), K.pickUpgTier('bronze')];
    setT('steel', 0); const pr3 = E.ai.find((a) => a.id === 'ai3').price; q('[data-act="extbuy"][data-id="ai3"]').click(); o.bought = [Craft.have(T('steel')), K.pickUpgTier('steel'), 100000 - S.res.lumen === pr3, E.ai.some((a) => a.id === 'ai3'), Craft.get('bag', T('steel')) + Craft.get('vault', T('steel'))];
    const lst = (k, pr) => { q('#thExK').value = k; q('#thExP').value = String(pr); q('[data-act="extlist"]').click(); };
    lst('bronze', 4800); const dz = q('.cxdanger'); o.lconf = [dz && dz.querySelector('p').textContent, q('#thExK').value, q('#thExP').value, Craft.have(T('bronze'))];
    q('[data-act="extlistno"]').click(); o.lkeep = [!q('.cxdanger'), Craft.have(T('bronze')), K.pickUpgTier('bronze')];
    lst('bronze', 4800); q('[data-act="extlistok"]').click(); const ml = E.mine[E.mine.length - 1]; o.listed = [Craft.have(T('bronze')), K.pickUpgTier('bronze'), ml && ml.k + ml.tier + '@' + ml.price, S.res.lumen === 100000 - pr3];
    setT('bronze', 1); CityMap.exchangeCard(); q(`[data-act="extcancel"][data-id="${ml.id}"]`).click(); o.cblock = [msg(), K.pickUpgTier('bronze'), E.mine.includes(ml)];
    setT('bronze', 0); CityMap.exchangeCard(); q(`[data-act="extcancel"][data-id="${ml.id}"]`).click(); o.cback = [Craft.have(T('bronze')), K.pickUpgTier('bronze'), E.mine.includes(ml)]; try { closeModalQuiet(); } catch (e) {} setT('bronze', 0);
    // the forge card: bronze (sold) shows T0 and the first-upgrade note; names wrap, no ellipsis
    Theus.openUp('bronze'); o.t0 = [document.querySelector('#thUp .uK[data-k="bronze"] .thBadge').textContent, document.querySelector('#thUp .uK[data-k="lumen"] .thBadge').textContent, !!document.querySelector('#thUp .uNote')]; const oreRow = () => [...document.querySelectorAll('#thUp .uRow span')].map((e) => e.textContent).find((x) => /^Ore\/h/.test(x)); o.oreRow = [oreRow()]; Theus.openUp('gold'); o.oreRow.push(oreRow()); Theus.openUp('onyx'); o.oreRow.push(oreRow());
    // x1.5 labels: forge rows, mastered, Exchange lines, backpack stat; Theus's wording
    { setT('steel', 3); clr(P('steel')); Craft.add('bag', P('steel'), 200); Theus.openUp('steel'); const row = (lb) => { const r = [...document.querySelectorAll('#thUp .uRow')].find((e) => e.textContent.startsWith(lb)); return r ? r.querySelector('b').textContent : null; };
      o.lab = [row('Next tier'), document.querySelector('#thUp .uCur').textContent.split(' \u00b7 ').slice(0, 2).join(' \u00b7 '), document.querySelector('#thUp .uSay span').textContent];
      setT('bronze', 10); Theus.openUp('bronze'); o.labM = [row('Multiplier'), document.querySelector('#thUp .uMast').textContent]; setT('bronze', 0); Theus.closeUp();
      CityMap.exchangeCard(); const ar = document.querySelector('#modalBody [data-id="ai1"]').closest('.thExRow'); o.labEx = ar.querySelector('small').textContent; try { closeModalQuiet(); } catch (e) {}
      Craft.st.menu = { w: 'bag', id: T('steel') }; o.labBag = Craft.bagHTML(false).includes('T3 \u00b7 x3.4 mining'); Craft.st.menu = null; setT('steel', 0);
      const says = Object.values(Theus.STEPS).map((q) => q.say); o.words = [Theus.STEPS.first5.say.includes('Every tier, half again the bite.'), Theus.STEPS.who2.say.includes('Every tier, half again the bite.'), !says.some((x) => /twice|\bx2\b/i.test(x))]; }
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
    // ore reach (plain and tiered alike): grade + exactly one ore above; out of reach -> 'Needs a stronger pickaxe', mining doesn't start; the gift Bronze mines Copper/Tin
    o.reach = ['stick', 'bronze', 'iron', 'steel', 'gold', 'mithril', 'rune', 'lumen', 'onyx'].map((g) => K.oreReachBest(g)); o.coalAll = K.PICK_KINDS.every((g) => K.pickReaches(g, 'coal'));
    o.reachX = [K.pickReaches('bronze', 'tin'), K.pickReaches('bronze', 'iron'), K.pickReaches('steel', 'gold'), K.pickReaches('steel', 'mithril'), K.pickReaches('stick', 'coal'), K.pickReaches('stick', 'copper')]; o.stickIron = K.pickReaches('stick', 'iron');
    const NS = Explore.ORE.nodes.filter((n) => Explore.oreStand(n)), coal = NS.find((n) => n.type === 'coal'), cu = NS.find((n) => n.type === 'copper') || NS.find((n) => n.type === 'tin'), lastT = () => { const e = document.querySelector('#toasts .toast:last-child'); return e ? e.textContent : ''; };
    S.pickGrade = 'stick'; S.pickEqT = null; document.querySelectorAll('#toasts .toast').forEach((t) => t.remove()); o.stickCoal = [Explore.mineTap(coal), [...document.querySelectorAll('#toasts .toast')].some((t) => /stronger/.test(t.textContent))];
    { const G = CharView.st.gnd; if (G) { G.path = null; G.goal = null; G.mine = false; } Explore.EX.pend = null; } // (cancel that walk)
    Craft.equip('tool:pick_bronze'); const w0 = Explore.mineTap({ type: 'iron', x: coal.x, y: coal.y, spot: coal.spot }); o.weak = [w0, lastT(), !Explore.ORE.mining, Explore.EX.pend || null]; // (no Iron veins on the map yet: a stand-in Iron node, Bronze reaches Coal at most)
    Craft.equip('tool:pick_bronze'); o.giftMine = [S.pickGrade, Explore.mineTap(cu), cu && cu.type, Explore.mineTap(coal)];
    { const G = CharView.st.gnd; if (G) { G.path = null; G.goal = null; G.mine = false; } Explore.EX.pend = null; if (Explore.EX.mark) Explore.EX.mark.visible = false; } // (cancel the walks those taps started)
    const img = (f) => new Promise((res) => { const i = new Image(); i.onload = () => res([i.naturalWidth, i.naturalHeight]); i.onerror = () => res(null); i.src = 'assets/ui/theus/' + f + '.webp'; }); return Promise.all(['idle', 'talking', 'pleased'].map(img)).then((im) => { o.img = im; return o; }); });
  console.log('THEUS ' + JSON.stringify(R));
  ok(R.midStep === 'first4' && R.mid.join() === '0,false' && R.restart === 'first1', `first meeting: closed at ${R.midStep} (no gift, not met), reopened at ${R.restart}`);
  ok(R.ids.join() === 'first1,first2,first3,first4,first5,first6,first7' && R.faces.join() === 'idle,talking,pleased,talking,talking,idle,pleased' && R.nFirst === 7 && R.firstProm === 0, `chain ${R.faces.join(' / ')}; no Prometheus in the first-meeting lines`);
  ok(R.gift.join() === '1,0,true,menu,Received: Bronze Pickaxe,true' && R.saved1 === true, `gift: 1 plain Bronze Pickaxe (T0), toast "${R.gift[4]}" with the pickaxe icon, then the menu; theusMet saved`);
  ok(R.ret === 'hello' && R.again.join() === 'false,1', `returning: ${R.ret} (no chain), no second gift (still ${R.again[1]})`);
  ok(R.mult.every((m, n) => m === Math.pow(1.5, n)) && R.mult.map((m) => `x${+m.toFixed(1)}`).length === 11, `tier N = x1.5^N (T10 x${R.mult[10].toFixed(3)})`);
  ok(R.cost.join() === '20,40,80,160,320,640,1280,2560,5120,10240', `costs T1-T10: ${R.cost.join(', ')}`);
  ok(R.oreh.join() === '1,3.375,57.665039' && R.eqT.join() === '5.0625,5.0625,true,false' && R.eqP.join() === '1,false,true', `ore/h formula x${R.oreh.join(', x')} at T0/T3/T10; tiered Steel T4 in hand x${R.eqT[0]}, plain Steel in hand x${R.eqP[0]}`);
  ok(JSON.stringify(R.drill[0]) === JSON.stringify(R.drill[1]) && R.drill[2] === Math.pow(1.5, 10), `drills unaffected: ${R.drill[0].map((v) => v.toFixed(2)).join(', ')} ore/h with no tiered pickaxe and with every kind T10 (T10 in hand)`);
  ok(R.strike.join() === '1,0,4,5,614', `strike yield x mult (chance 0.6: x1 -> 1/0, x8 -> 4/5, x1024 -> ${R.strike[4]})`);
  ok(R.h0 === 25 && R.r1.join() === 'true,1,4,1,null,1' && R.r2.join() === 'false,short,1,4,1' && R.r3.join() === 'true,2,4,1' && R.other === 0, `consumption: 25 plain -> T1 took 21 (1 became the tiered one, 20 paid; left ${R.r1[2]}, tiered ${R.r1[3]} in the backpack, not equipped); T2 refused with 4 (nothing taken); +40 -> T2 (left 4, still one tiered)`);
  ok(R.saved.join() === '2,2,1,true' && R.mig.join() === '5,3,1,1,0,steel,false', `save round-trip (hollowdeep.save.v1): tiered Steel T${R.saved[1]}; earlier-build save {bronze:5, steel:3} -> one tiered item each (T${R.mig[0]}, T${R.mig[1]}), Steel in hand, pickTiers gone`);
  ok(R.nm === 'Bronze Pickaxe (T5)' && R.bag.join() === 'true,true,false' && R.vault.join() === 'true,true', `names + T badges: "${R.nm}"; backpack shows Rune (T3) with its badge and never the vault's Gold (T2); the vault grid shows Gold (T2)`);
  ok(R.shopSell.join() === '💠 Sell,false,true,true' && R.shopBuy.join() === '💠 Buy,false,true', `shop sheet titled "${R.shopSell[0]}" / "${R.shopBuy[0]}" (no "Lumen Crystal"); plain Bronze still sells; tiered pickaxes not in the shop's sell or buy list`);
  const OWN = 'You already have a tiered Bronze Pickaxe. You can only hold one of each kind.';
  ok(R.ex0[0] && R.ex0[1] === 5 && R.blocked[0] === OWN && R.blocked[1] === 100000 && R.blocked[2] && R.blocked[3] === 5, `Exchange: ${R.ex0[1]} seeded tiered listings (${R.ex0[2]}); buying ai Bronze T3 while holding Bronze T5 is blocked: "${R.blocked[0]}" (no Lumen taken)`);
  ok(R.bought.join() === '1,4,true,false,1', `buy: Steel T4 arrives with its tier (one item), the seller's price paid, listing gone`);
  ok(R.lconf[0] === "This will lose Tier 5. You'll start over at Tier 1." && R.lconf[1] === 'bronze' && R.lconf[2] === '4800' && R.lconf[3] === 1 && R.lkeep.join() === 'true,1,5', `list action + price field: "${R.lconf[0]}"; Keep it keeps T5`);
  ok(R.listed.join() === '0,0,bronze5@4800,true', `listed: Bronze T5 handed over at 4,800 (kind back to T0, no shop money)`);
  ok(R.cblock[0] === OWN && R.cblock[1] === 1 && R.cblock[2] && R.cback.join() === '1,5,false', `cancel blocked while holding a tiered Bronze; after that, cancel returns it at T5`);
  ok(R.t0.join() === 'T0,T0,true' && R.wrap, `forge card: kinds without a tiered pickaxe show T0; names wrap whole (no ellipsis)`);
  ok(R.oreRow.join('|') === 'Ore/h (Coal)|Ore/h (Mithril)|Ore/h (Ember Onyx)', `forge ore/h uses the best ore each pickaxe reaches: ${R.oreRow.join(', ')}`);
  ok(R.gate[0][2] === 'open' && R.gate[0][3] && R.gate[1][2] === 'open' && R.gate[2][2] === 'hint' && !R.gate[2][3] && R.gate[3][2] === 'hint' && !R.gate[3][3], `anvil gate: on the platform top opens the talk, on the ground only the hint: ${JSON.stringify(R.gate)}`);
  ok(R.reach.join() === 'coal,coal,gold,gold,mithril,runite,lumenite,onyx,onyx' && R.coalAll && R.reachX.join() === 'true,false,true,false,true,true' && R.stickIron === false, `ore reach (best ore per grade, Stickaxe first): ${R.reach.join(', ')}; Coal reachable by every pickaxe; Bronze: Tin yes, Iron no; Steel: Gold yes, Mithril no; Stickaxe: Copper + Coal, not Iron`);
  ok(R.stickCoal[0] === 'ore' && !R.stickCoal[1], 'Stickaxe on a Coal vein: mining starts, no "Needs a stronger pickaxe"');
  ok(R.weak[0] === 'ore-weak' && R.weak[1] === 'Needs a stronger pickaxe' && R.weak[2] && !R.weak[3], `out of reach (Bronze on an Iron node): "${R.weak[1]}", mining doesn't start`);
  ok(R.giftMine[0] === 'bronze' && R.giftMine[1] === 'ore' && R.giftMine[3] === 'ore', `the gift Bronze Pickaxe mines ${R.giftMine[2]} (and Coal)`);
  ok(R.labs.join() === 'x1,x1.5,x2.3,x3.4,x5.1,x7.6,x11.4,x17.1,x25.6,x38.4,x57.7', `labels one decimal: ${R.labs.join(' ')}`);
  ok(R.lab[0] === 'T4 \u00b7 x3.4 \u2192 x5.1' && R.lab[1] === 'Tier 3 \u00b7 x3.4' && R.lab[2] === '160 of those and I will make it bite half again as hard.' && R.labM.join() === 'x57.7,Mastered' && /\u00b7 x3\.4 mining$/.test(R.labEx) && R.labBag, `forge "${R.lab[0]}", "${R.lab[1]}", T10 ${R.labM.join(' ')}; Exchange "${R.labEx}"; backpack "T3 \u00b7 x3.4 mining"; panel line "${R.lab[2]}"`);
  ok(R.words.join() === 'true,true,true', 'first5 + who2 say "Every tier, half again the bite."; no "twice" / "x2" in any of his lines');
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
    await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} Theus.close(); const T = Craft.TPICK('steel'), P = 'tool:pick_steel'; Craft.take(T, Craft.have(T)); Craft.add('bag', T, 1); S.tpicks.steel = 3; Craft.take(P, Craft.have(P)); Craft.add('bag', P, 200); Craft.equip(T); Theus.openUp('steel'); });
    await p.waitForTimeout(1500); await p.screenshot({ path: OUT + 'pickaxe_upgrade_x15.png' });
  }
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  console.log(fails ? `${fails} FAILED` : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);
})();

// (Dominic) one Iron Winch for everyone; equipped gear lives in equipment slots, never in the backpack; a full backpack blocks every add (mining, unequip, crafting,
// buying, taking from the vault, Theus' pickaxes and gift), nothing overflows to the vault by itself. SHOT=1: winch_iron_ascend_closeup, backpack_equipped_gear,
// backpack_full_unequip, backpack_full_mining_blocked to /workspace/shots-char/final/.
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html', SHOT = process.env.SHOT || '', OUT = '/workspace/shots-char/final/';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  // an older save: a Gold + Rune winch, the climbing gear and the equipped Steel pickaxe all sitting in the backpack
  await p.addInitScript(() => { if (sessionStorage.getItem('eqb')) return; sessionStorage.setItem('eqb', '1'); localStorage.clear(); });
  await p.goto(URL + '?t=' + Date.now(), { timeout: 90000, waitUntil: 'commit' }); await p.waitForTimeout(4000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 240000 }).catch(() => {}); await p.waitForFunction(() => Explore.on, null, { timeout: 120000 }).catch(() => {});
  const toastTxt = () => { const t = document.querySelector('#toasts .toast:last-child'); return t ? t.textContent : ''; };
  const R = await p.evaluate(() => { const o = {}, C = Craft, P = (k) => 'tool:pick_' + k, last = () => { const t = document.querySelector('#toasts .toast:last-child'); return t ? t.textContent : ''; };
    const empty = () => { S.backpack = {}; S.bagOrder = []; C.order('bag'); }, fill = () => { let n = 0; while (C.fits('bag', P('rune')) && n++ < 40) C.add('bag', P('rune'), 1); };
    C.get('vault', 'ore:tin'); // (the vault store exists)
    // ---- migration of an old save
    S.winchV = 0; S.wornV = 0; delete S.worn; S.backpack['tool:lifeline_gold'] = 2; S.backpack['tool:lifeline_iron'] = 1; (S.ledgeVault.gear = S.ledgeVault.gear || {}).lifeline_rune = 1; S.backpack[C.CLIMB_BASE] = 1; S.backpack[C.TLINK_BASE] = 1;
    S.backpack[P('steel')] = 2; S.pickGrade = 'steel'; S.pickEqT = null; const g0 = S.backpack['ingot:gold'] || 0, r0 = S.backpack['ingot:rune'] || 0, i0 = S.backpack['ingot:iron'] || 0; C.migrateWinch(); C.migrateWorn();
    o.migW = [S.winchMigrated.winch.join(), S.backpack['ingot:gold'] - g0, S.backpack['ingot:rune'] - r0, S.backpack['ingot:iron'] - i0, 'tool:lifeline_gold' in S.backpack, 'tool:lifeline_iron' in S.backpack, 'lifeline_rune' in S.ledgeVault.gear];
    // a save that already ran winch v1 still holds Iron copies of the old anvil winch (backpack, vault, an Exchange listing): v2 drops them all with the ingot refund
    { const ex = S.exchange || (S.exchange = { bought: {}, mine: [], nextId: 1 }), m0 = (ex.mine || []).slice(); ex.mine = [{ k: 'tool:lifeline_iron', qty: 1, price: 50 }, { k: 'stone', qty: 10, price: 4 }];
      S.winchV = 1; S.backpack['tool:lifeline_iron'] = 1; S.ledgeVault.gear.lifeline_iron = 1; const j0 = S.backpack['ingot:iron'] || 0; C.migrateWinch(); const d = S.winchMigrated.v2;
      o.migV2 = [S.winchV, d.dropped.iron, d.refund['ingot:iron'], S.backpack['ingot:iron'] - j0, Object.keys(S.backpack).concat(Object.keys(S.ledgeVault.gear)).some((k) => /lifeline_/.test(k)), ex.mine.map((m) => m.k).join()]; ex.mine = m0; }
    o.migE = [C.get('bag', C.CLIMB_BASE), C.get('bag', C.TLINK_BASE), C.get('bag', C.WINCH_BASE), C.get('bag', P('steel')), C.worn().pick, S.wornMigrated.pick, C.have(C.CLIMB_BASE), C.have(P('steel'))];
    // ---- the winch: one fixed Iron Winch, nothing else anywhere
    o.winch = [Object.keys(C.ITEMS).filter((id) => /lifeline_/.test(id)).join(), C.WINCH_BASE, C.ITEMS[C.WINCH_BASE].name, C.SMITH.some((r) => /lifeline/.test(r.out)), C.equipped(C.WINCH_BASE), C.have(C.WINCH_BASE)];
    C.st.tab = 'buy'; C.open('exchange'); const bh = document.getElementById('modalBody').innerHTML, sh = bh; C.open('anvil'); const ah = document.getElementById('modalBody').innerHTML; try { closeModalQuiet(); } catch (e) {}
    o.winchShop = [/lifeline|Winch/.test(bh), /lifeline|Winch/.test(sh), /lifeline|Winch|Ledge Tether/.test(ah), (Skills.unlockEntries('smithing') || []).some((e) => /lifeline|tether_/.test(e.id || ''))];
    o.up = +CharView.climbSpeeds().up.toFixed(3);
    // ---- equipped gear is out of the backpack grid and its slot count
    empty(); C.worn().pick = null; S.pickGrade = 'stick'; S.pickEqT = null; C.add('bag', P('bronze'), 1); C.add('bag', 'ore:copper', 100); const u0 = C.order('bag').filter(Boolean).length; C.equip(P('bronze'));
    const gh = C.bagHTML(false); o.eq = [u0, C.order('bag').filter(Boolean).length, C.get('bag', P('bronze')), C.worn().pick, /data-cxv="equip"/.test(gh), (gh.match(/class="cxg cxg-bag"[\s\S]*$/)[0].match(/tool:(pick_bronze|climb_|tlink_|lifeline_)/g) || []).length, S.pickGrade];
    // Mining level to equip (Dominic: Skills.PICK_USE_LEVELS): below it, equipping is blocked ('Unlock Lv N') from the backpack and the character tab chooser, the item details
    // say so; a pickaxe already in hand stays and mines (grandfathered); the Stickaxe needs nothing
    { const sk0 = S.skills.mining; S.skills.mining = 0; C.add('bag', P('iron'), 1); const e1 = C.equip(P('iron')), t1 = last(); C.st.menu = { w: 'bag', id: P('iron') }; const mh = C.bagHTML(false); C.st.menu = null; const e2 = C.equipGrade('iron'), t2 = last();
      const W = C.worn(), g0 = W.pick; W.pick = P('gold'); S.pickGrade = 'gold'; const keep = [C.equip(P('gold')), C.worn().pick, Skills.pickReaches(S.pickGrade, 'gold'), C.syncWorn() === undefined && C.worn().pick];
      W.pick = g0; S.pickGrade = 'bronze'; const un = C.equipGrade('stick'); C.equip(P('bronze')); S.skills.mining = Skills.xpToReach(10); const e3 = C.equip(P('iron')); C.equip(P('bronze')); C.add('bag', P('iron'), -1);
      o.lvl = [e1, /Unlock Lv 10/.test(t1), /🔒 Unlock Lv 10/.test(mh) && /Mining Lv 10 to equip/.test(mh), e2, /Unlock Lv 10/.test(t2), keep.join('|'), un, e3, Skills.PICK_USE_LEVELS.join()]; S.skills.mining = Math.max(sk0 || 0, Skills.xpToReach(120)); }
    // Drop (Dominic): from an item's tap menu, a confirm with how many, then gone for good (not the vault); the pickaxe in her hand can't be dropped
    { const cu0 = C.get('bag', 'ore:copper'), v0 = C.get('vault', 'ore:copper'); C.open('bag'); C.st.menu = { w: 'bag', id: 'ore:copper' }; document.getElementById('modalBody').innerHTML = C.bagHTML(true); const db = document.querySelector('#modalBody [data-cx="del"]'); if (db) db.click();
      const conf = document.querySelector('#modalBody .cxdel'), q = conf ? [...conf.querySelectorAll('[data-cx="delok"]')].map((x) => x.dataset.n).join('/') : ''; const ok10 = conf && conf.querySelector('[data-cx="delok"][data-n="10"]'); if (ok10) ok10.click();
      const wp = C.worn().pick, d2 = C.drop(wp, 1); o.drop = [!!db, !!conf, q, cu0 - C.get('bag', 'ore:copper'), C.get('vault', 'ore:copper') - v0, /Dropped 10/.test(last()), d2, C.worn().pick === wp]; try { closeModalQuiet(); } catch (e) {} }
    // swap: the old one goes back into the backpack
    C.add('bag', P('iron'), 1); C.equip(P('iron')); o.swap = [C.get('bag', P('bronze')), C.get('bag', P('iron')), C.worn().pick, S.pickGrade];
    // equipping over a plain pickaxe from the character tab's grade chooser (Dominic's 'my original pickaxe didn't come back'): a real equip, the old one to the backpack;
    // a grade she doesn't own changes nothing; a save already out of step (look set, old one still in the hand slot) is put right once on load
    C.add('bag', Craft.TPICK('onyx'), 1); S.tpicks = S.tpicks || {}; S.tpicks.onyx = 10; const g1 = C.equipGrade('onyx'); o.grade = [g1, C.worn().pick, C.get('bag', P('iron')), S.pickGrade, S.pickEqT, C.equipGrade('mithril'), C.worn().pick];
    C.equip(P('iron')); o.back = [C.get('bag', Craft.TPICK('onyx')), C.worn().pick]; S.pickGrade = 'onyx'; S.pickEqT = 'onyx'; C.syncWorn(); o.fix = [C.worn().pick, C.get('bag', P('iron')), S.pickGrade, !!S.wornFix];
    S.pickGrade = 'gold'; S.pickEqT = null; C.syncWorn(); o.fix2 = [C.worn().pick, S.pickGrade]; C.equip(P('iron')); C.take(Craft.TPICK('onyx'), C.spare(Craft.TPICK('onyx'))); delete S.tpicks.onyx; delete S.wornFix;
    // sell the equipped one: blocked (only a spare could be sold)
    o.sell = ['sell' in C, 'sellP' in C, 'buyP' in C, C.worn().pick];
    // ---- full backpack: unequip blocked everywhere (the vault screen too), nothing goes to the vault
    fill(); const v0 = C.get('vault', P('iron')); o.unFull = [C.unequip(P('iron')), C.worn().pick, /Backpack full/.test(last()), C.get('vault', P('iron')) - v0];
    C.open('xfer'); o.unVault = C.unequip(P('iron')); try { closeModalQuiet(); } catch (e) {}
    // a partial stack with room still takes more; a new kind does not
    o.partial = [C.addUpTo('bag', 'ore:copper', 5), C.addUpTo('bag', 'ore:tin', 5)];
    // crafting: room checked before the ingredients are taken
    C.add('vault', 'ore:copper', 30); C.add('vault', 'ore:tin', 30); const r = C.SMELT.find((q) => q.out === 'ingot:bronze'), cu = C.have('ore:copper'), tn = C.have('ore:tin'), vb = C.get('vault', 'ingot:bronze'); o.craft = [C.make(r, 1, 'bag'), C.have('ore:copper') === cu && C.have('ore:tin') === tn, C.get('bag', 'ingot:bronze'), C.get('vault', 'ingot:bronze') - vb];
    // buying: blocked before the gold is taken; taking from the vault: blocked
    Gold.spendGold(Gold.getGold()); Gold.addGold(100000); o.buy = [C.buy(P('bronze'), 1), Gold.getGold()]; const vt = C.get('vault', 'ore:tin'); o.wd = [C.move('vault', 'bag', 'ore:tin', 5), C.get('vault', 'ore:tin') - vt];
    // Theus: gift pending while full (not to the vault), given on the next talk once there is room; a tiered pickaxe needs backpack room
    // (t591u, Dominic: Theus never takes pickaxes from the vault - payment is what she carries, loose or as a vault note, so the upgrade checks below pay with a note)
    const NT = (g) => C.noteDef(P(g)), notes = (g) => C.noteCount(P(g)), setNote = (g, n) => { C.add('bag', NT(g), n - notes(g)); };
    S.theusMet = false; S.theusGiftDue = 0; const gv = C.get('vault', P('bronze')), gb = C.have(P('bronze')); o.gift = [Theus.gift(), !!S.theusGiftDue, C.get('vault', P('bronze')) - gv, C.have(P('bronze')) - gb, !!S.theusMet];
    C.add('bag', P('rune'), -1); Theus.open(); Theus.close(); o.gift2 = [!!S.theusGiftDue, C.have(P('bronze')) - gb];
    fill(); C.add('bag', P('rune'), -1); setNote('gold', 25); fill(); S.tpicks = S.tpicks || {}; delete S.tpicks.gold; const up = Theus.upgrade('gold'); o.upFull = [up.ok, up.why, notes('gold')]; /* (25 Gold carried as a note, enough to pay; the new tiered one has no slot) */
    // the equipped plain pickaxe is never payment, except as the one being upgraded (T0 -> T1 with one short: it becomes the tiered one, still in her hand)
    C.take(P('gold'), C.spare(P('gold'))); setNote('gold', 20); C.add('bag', P('rune'), -1); C.add('bag', P('gold'), 1); C.equip(P('gold')); const up2 = Theus.upgrade('gold');
    o.upHand = [up2.ok, notes('gold'), C.worn().pick, Craft.pickTier('gold'), S.pickEqT];
    C.take(Craft.TPICK('steel'), C.spare(Craft.TPICK('steel'))); delete S.tpicks.steel; C.add('bag', P('rune'), -2); setNote('steel', 21); C.add('bag', P('steel'), 1); C.equip(P('steel')); const up3 = Theus.upgrade('steel');
    o.upSpare = [up3.ok, notes('steel'), C.worn().pick, C.get('bag', Craft.TPICK('steel'))];
    // mining with a full backpack: she stops and the message shows
    fill(); const got = Explore.mineGive('gold', 3); o.mine = [got, /Backpack full/.test(last())];
    // ---- gold only: no Lumen -> gold rate anywhere; old saves' listings keep their numbers (no x10); the x10-era prices hard-coded at their gold values
    { const tp0 = S.tpEx, ex0 = S.exchange; S.tpEx = { ai: [{ id: 'ai1', k: 'bronze', tier: 2, seller: 'X', price: 100 }], mine: [{ id: 'm1', k: 'iron', tier: 1, price: 7 }], next: 2 }; S.exchange = { bought: {}, mine: [{ k: 'stone', qty: 5, price: 3 }], nextId: 2 };
      Theus.exState(); try { CityMap.exchangeCard(); } catch (e) {} try { closeModalQuiet(); } catch (e) {}
      o.gold = ['COIN_RATE' in C, S.tpEx.ai[0].price, S.tpEx.mine[0].price, S.exchange.mine[0].price, /data-cx="(sell|buy)"/.test(bh), /coin\.webp/.test(bh)]; o.shopH = bh.match(/<h2>([^<]*)/)[1]; { const b0 = JSON.stringify(S.backpack), o0 = JSON.stringify(S.bagOrder), gd = Gold.getGold(); S.backpack = {}; S.bagOrder = []; C.order('bag'); Gold.spendGold(Gold.getGold()); Gold.addGold(1000); const got = C.buy(P('bronze'), 1); o.shop = [got, 1000 - Gold.getGold(), C.get('bag', P('bronze')), C.buy(P('iron'), 1), C.buy('ore:copper', 1), JSON.stringify(C.SHOP)]; C.st.tab = 'skins'; C.open('exchange'); const hh = document.getElementById('modalBody').innerHTML; o.shopUI = [(hh.match(/data-cx="buy"/g) || []).length, /data-cx="buy" data-id="tool:pick_bronze"/.test(hh), /data-cx="sell"/.test(hh)]; try { closeModalQuiet(); } catch (e) {} S.backpack = JSON.parse(b0); S.bagOrder = JSON.parse(o0); C.order('bag'); Gold.spendGold(Gold.getGold()); Gold.addGold(gd); }
      S.tpEx = null; o.aiP = Theus.exState().ai.map((q) => q.price).join('/'); S.tpEx = tp0; S.exchange = ex0; }
    o.gridEq = (C.bagHTML(false).match(/class="cxs[^"]* eq[ "]/g) || []).length; save(); return o; });
  ok(R.migW.join() === 'gold,iron,rune,30,36,6,false,false,false', `winch migration: the old anvil winch (Gold x2, Iron x1, Rune x1) dropped; ingots back (Gold ${R.migW[1]}, Rune ${R.migW[2]}, Iron ${R.migW[3]}); recorded in S.winchMigrated`);
  ok(R.migV2.join() === '2,3,18,18,false,stone', `winch v2 on a v1 save: Iron copies in the backpack, vault and an Exchange listing dropped, 3 x 6 Iron ingots back, other listings kept (${R.migV2.join(',')}) (got no ledge winch)`);
  ok(R.gold.join() === 'false,100,7,3,true,true' && R.aiP === '18610/21890/474980/598970/898710' && R.sell.join() === 'false,false,false,tool:pick_iron', `gold only: no COIN_RATE; old Theus / Exchange listings keep their gold numbers (no x10); Theus' AI sellers keep their asking prices (${R.aiP}) (${R.gold.join(',')})`);
  ok(R.shopH === '💠 Skins' && R.shop.join() === '1,345,1,0,0,{"tool:pick_bronze":345}' && R.shopUI.join() === '1,true,false', `no set prices (Dominic) except the Bronze Pickaxe: bought for 345 gold (${R.shop.join(',')}), the only Buy row; the shop buys nothing back (no Sell, no Craft.sell / sellP / buyP); other pickaxes and ores can't be bought (got player prices) (got bronze 345)`);
  { const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8'), w = src.match(/S\.crystals\s*(\+=|-=|=(?!=))[^;]*/g) || [], init = (src.match(/\bcrystals:\s*[^,}]+/g) || []);
    ok(!/COIN_RATE/.test(src) && w.length === 2 && w.filter((q) => /^S\.crystals = crystals\(\) - p$/.test(q)).length === 1 && w.filter((q) => /^S\.crystals = \(S\.crystals \|\| 0\) \+ 1$/.test(q)).length === 1 && /S\.crystals = \(S\.crystals \|\| 0\) \+ 1; toastT\('💎 \+1 Lumen Crystal \(an hour of mining on Mosby/.test(src) && init.length > 0 && init.every((q) => /:\s*0$/.test(q)), `no rate in the build; Lumen Crystals have one in-play source (1 per hour of her mining on Mosby's head crystal, Mining 300): the writes to S.crystals are the skin purchase and that hourly grant (${w.join(' | ')}), new saves start at ${init.join(', ')} (got gold only)`); }
  ok(R.gridEq === 0, 'no equipped highlight in the backpack grid');
  ok(R.migE.join() === '0,0,0,1,tool:pick_steel,bag,1,2', `equipped migration: climbing picks / tether / winch out of the backpack, one Steel pickaxe moved to her hand (${R.migE.join(',')})`);
  ok(R.winch.join() === ',gear:winch_iron,Iron Winch,false,true,1' && R.winchShop.join() === 'false,false,false,false', `only the Iron Winch exists, always worn; no recipe, shop, sell, anvil or unlock entry (${R.winch.join(',')} / ${R.winchShop.join(',')}) (got iron winch)`);
  ok(Math.abs(R.up - 1.45) < 0.01, `ascend speed stays ${R.up} m/s`);
  ok(R.eq[0] === 2 && R.eq[1] === 1 && R.eq[2] === 0 && R.eq[3] === 'tool:pick_bronze' && !R.eq[4] && R.eq[5] === 0 && R.eq[6] === 'bronze', `equipping takes it out of the grid and the slot count (${R.eq[0]} -> ${R.eq[1]} slots); no equipment row above the grid (got equip row removed); no gear in the grid (got equipped out of backpack)`);
  ok(R.grade.join() === 'true,tool:tpick_onyx,1,onyx,onyx,false,tool:tpick_onyx' && R.back.join() === '1,tool:pick_iron', `equipping the T10 Ember Onyx over a plain Iron pickaxe (character tab chooser): the Iron one goes back to the backpack; an unowned grade does nothing (${R.grade.join(',')}) (got equip swap bug)`);
  ok(R.fix.join() === 'tool:tpick_onyx,1,onyx,true' && R.fix2.join() === 'tool:tpick_onyx,onyx', `a save out of step (shows Ember Onyx, Iron still in the hand slot) is put right on load: Onyx equipped, Iron back in the backpack; an unowned look reverts (${R.fix.join(',')} / ${R.fix2.join(',')})`);
  ok(R.lvl.join() === 'false,true,true,false,true,true|tool:pick_gold|true|tool:pick_gold,true,true,1,10,20,35,50,65,95,120', `pickaxe Mining levels (1/10/20/35/50/65/95/120): below Lv 10 an Iron pickaxe can't be equipped from the backpack or the character tab ('Unlock Lv 10' toast + in its details); a Gold one already in hand stays and still mines (grandfathered); the Stickaxe needs nothing; at Lv 10 Iron equips (${R.lvl.join(',')}) (got pickaxe level reqs)`);
  ok(R.drop.join() === 'true,true,1/10/' + (R.drop[2].split('/')[2] || '') + ',10,0,true,0,true' && /^1\/10\/\d+$/.test(R.drop[2]), `Drop from the item menu: a confirm (${R.drop[2]}), dropping 10 copper removes them for good (not to the vault); the pickaxe in hand can't be dropped (${R.drop.join(',')}) (got drop items)`);
  ok(R.swap.join() === '1,0,tool:pick_iron,iron', `swap returns the old pickaxe to the backpack (${R.swap.join(',')})`);
  ok(R.unFull.join() === 'false,tool:pick_iron,true,0' && R.unVault === false, `full backpack: unequip blocked with "Backpack full" (also on the vault screen), nothing sent to the vault (got block it)`);
  ok(R.partial.join() === '5,0', `full backpack: a partial copper stack still takes 5, a new kind (tin) takes 0`);
  ok(R.craft.join() === '0,true,0,0', `smelting into a full backpack: blocked, ingredients kept (${R.craft.join(',')})`);
  ok(R.buy[0] === 0 && R.buy[1] === 100000 && R.wd[0] === 0 && R.wd[1] === 0, `full backpack: buying the Bronze Pickaxe blocked before any gold is taken; taking from the vault blocked`);
  ok(R.gift.join() === 'false,true,0,0,true' && R.gift2.join() === 'false,1', `Theus' gift: pending while full (not to the vault), given on the next talk once a slot is free (${R.gift.join(',')} / ${R.gift2.join(',')})`);
  ok(R.upFull.join() === 'false,full,25', `Theus: no backpack room for a new tiered pickaxe -> blocked, nothing paid (${R.upFull.join(',')})`);
  ok(R.upHand.join() === 'true,0,tool:tpick_gold,1,gold' && R.upSpare.join() === 'true,0,tool:pick_steel,1', `the equipped pickaxe pays only as the one being upgraded (Gold: 20 + the one in hand -> tiered in hand); with 21 spare the one in hand stays (${R.upSpare.join(',')})`);
  ok(R.mine.join() === '0,true', `mining into a full backpack: nothing added, she stops with "Backpack full" (got full backpack block)`);
  if (SHOT) {
    // mining blocked toast over the map
    // (renders only: the game's own toasts stay up until the shot - a swiftshader screenshot takes longer than a toast's 3.2 s life)
    await p.evaluate(() => { const t0 = window.toast; window.toast = (m) => { t0(m); const el = document.querySelector('#toasts .toast:last-child'); if (el) el.remove = () => {}; }; });
    await p.evaluate(() => { document.querySelectorAll('#toasts .toast').forEach((t) => t.parentNode.removeChild(t)); let n = 0; while (Craft.fits('bag', 'tool:pick_rune') && n++ < 40) Craft.add('bag', 'tool:pick_rune', 1); Explore.mineGive('gold', 3); }); await p.waitForTimeout(400); await p.screenshot({ path: OUT + 'backpack_full_mining_blocked.png' });
    // backpack with gear equipped (room in the pack again)
    await p.evaluate(() => { for (let i = 0; i < 6; i++) Craft.add('bag', 'tool:pick_rune', -1); document.querySelectorAll('#toasts .toast').forEach((t) => t.parentNode.removeChild(t)); Craft.open('bag'); }); await p.waitForTimeout(1500); await p.screenshot({ path: OUT + 'backpack_equipped_gear.png' });
    // full backpack: the unequip message
    await p.evaluate(() => { let n = 0; while (Craft.fits('bag', 'tool:pick_rune') && n++ < 40) Craft.add('bag', 'tool:pick_rune', 1); Craft.open('bag'); document.querySelectorAll('#toasts .toast').forEach((t) => t.parentNode.removeChild(t)); }); await p.waitForTimeout(1200); await p.evaluate(() => document.querySelector('#modalBody [data-cx="unequip"]').click()); await p.waitForTimeout(400); await p.screenshot({ path: OUT + 'backpack_full_unequip.png' });
    await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} document.querySelectorAll('#toasts .toast').forEach((t) => t.parentNode.removeChild(t)); });
  }
  // ---- the Iron Winch on her hip while ascending (Character tab)
  await p.evaluate(() => document.querySelector('nav#tabs [data-tab=char]').click()); await p.waitForFunction(() => CharView.st.ok && CharView.rig, null, { timeout: 120000 }).catch(() => {});
  await p.click('#charAnim [data-anim=climb]', { force: true }); await p.evaluate(() => { const C = CharView, st = C.st; st.paused = true; C.sim(1 / 30, 90); st.dist = 6; C.pgGo({ wall: true, x: st.climbPos.x, y: 5.4 }); for (let i = 0; i < 1500 && st.pg; i++) C.sim(1 / 30, 1); C.sim(1 / 30, 15); C.advance(1 / 30, 2); });
  const tap = (sel) => p.evaluate((sel) => document.querySelector('#charClimb ' + sel).click(), sel);
  const until = (c, n = 600) => p.evaluate(([c, n]) => { const C = CharView, f = new Function('C', 'return ' + c); for (let i = 0; i < n && !f(C); i++) C.sim(1 / 30, 1); return f(C); }, [c, n]);
  await tap('[data-tv=go]'); await until("C.st.tvK === 'rappel' && C.st.climbPos.y < 2.0", 1500); await tap('[data-tv=stop]'); await p.evaluate(() => CharView.sim(1 / 30, 20)); await tap('[data-tv=ascend]'); await until("C.st.tvK === 'ascend'", 120); await p.evaluate(() => CharView.sim(1 / 30, 5)); /* (early in the climb up: it stops at the anchor) */
  const W = await p.evaluate(() => { const w = CharView.rig.built.winch, cam = CharView.cam, cv = document.getElementById('charCanvas'), r = cv.getBoundingClientRect(); CharView.st.camFn = (cm, rg) => { const q = rg.built.winch.getWorldPosition(new THREE.Vector3()); cm.position.set(q.x - 1.3, q.y + 0.35, q.z + 0.7); cm.lookAt(q); }; /* (a side close-up: the winch sits on the belt, facing the wall) */ CharView.sim(1 / 30, 1); CharView.advance(1 / 30, 2); const v = w.getWorldPosition(new THREE.Vector3()).project(cam);
    const cols = []; w.traverse((q) => { if (!q.isMesh) return; const c = q.geometry.attributes.color; if (c) for (let i = 0; i < c.count; i += 3) cols.push('#' + new THREE.Color(c.getX(i), c.getY(i), c.getZ(i)).getHexString()); else for (const m of [].concat(q.material)) if (m && m.color) cols.push('#' + m.color.getHexString()); }); const col = cols.includes('#55585e') ? '#55585e' : [...new Set(cols)].join('/'); /* (Art: dark forged iron like the iron pickaxe binding) */ return { vis: w.visible, grade: w.userData.grade, col, k: CharView.an.tv && CharView.an.tv.k, x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }; });
  ok(W.vis && W.grade === 'iron' && W.col === '#55585e' && W.k === 'ascend', `her hip winch is the Iron Winch (${JSON.stringify(W)}), shown while ascending`);
  if (SHOT) await p.screenshot({ path: OUT + 'winch_iron_ascend_closeup.png', clip: { x: Math.max(0, Math.min(390 - 300, W.x - 150)), y: Math.max(0, W.y - 170), width: 300, height: 340 } });
  await p.evaluate(() => setTab('city')); await p.waitForTimeout(1500); /* (the map's backpack sheet lives in the map's HUD: back to the map from the Character tab first) */
  const BS = await p.evaluate(async () => { const o = {}, fr = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); if (!Craft.order('bag').some(Boolean)) Craft.add('bag', 'ore:copper', 5); Craft.sheet(true); await fr(); const el = document.getElementById('bagSheet'), m = () => { const c = el.querySelector('.cxs.full .cxsv'), r = c ? c.getBoundingClientRect() : { width: 0 }; return [Math.round(el.getBoundingClientRect().height), Math.round(r.width)]; };
    o.before = m(); o.slots = el.querySelectorAll('.cxs').length; o.vh = innerHeight; el.querySelector('.cxs.full').click(); await fr(); o.menu = !!el.querySelector('.cxmenu'); o.after = m(); Craft.sheet(false); return o; });
  ok(BS.slots === BS.slots && BS.slots >= 20 && BS.menu && BS.before[0] >= 0.55 * BS.vh && Math.abs(BS.before[0] - BS.after[0]) <= 2 && BS.before[1] === BS.after[1] && BS.before[1] >= 30, `map backpack sheet opens in the big-icon layout (sheet ${BS.before[0]} px of ${BS.vh}, icons ${BS.before[1]} px) and stays the same when an item is tapped (${BS.after.join('/')}); ${BS.slots} slots, item menu opens (got big backpack icons)`);
  // (t575s2576, Dominic: 'Gold coins should be separate as an inventory item and nothing in game should be outside that') no purse: gold = the backpack's Gold coins
  const GC = await p.evaluate(() => { const C = Craft, I = GOLD_COINS.ITEM, b0 = JSON.stringify(S.backpack), o0 = JSON.stringify(S.bagOrder), g0 = Gold.getGold(), o = {};
    o.purse = { gone: !('gold' in S), v: S.goldV, writes: /\bS\.gold\s*(=[^=]|[-+]=)/.test(document.documentElement.innerHTML), item: I, inBag: C.get('bag', I) === Gold.getGold() };
    // the shop spends the backpack's coins (and nothing when there are too few)
    const id = Object.keys(C.SHOP)[0], pr = C.SHOP[id]; S.backpack = {}; S.bagOrder = []; C.order('bag'); Gold.addGold(pr + 5); const n1 = C.buy(id, 1); const left = C.get('bag', I), n2 = C.buy(id, 1);
    o.shop = { id, pr, n1, left, n2, after: C.get('bag', I), spendNo: Gold.spendGold(999999), add: Gold.addGold(7), now: Gold.getGold() };
    // save migration (hollowdeep.save.v1): an old purse becomes coins in the backpack - added to a coin stack, or a slot of its own even in a full backpack; no purse -> the old 2500 seed
    const base = JSON.parse(JSON.stringify(S)); delete base.goldV; const full = {}, ord = []; for (let i = 0; i < C.BAG_N; i++) { const k = ['ore:copper', 'ore:tin', 'ore:iron', 'ore:coal'][i % 4]; full[k] = (full[k] || 0) + 500; ord.push(k); }
    const key = CONFIG.saveKey, keep = localStorage.getItem(key), mig = (extra) => { localStorage.setItem(key, JSON.stringify(Object.assign(JSON.parse(JSON.stringify(base)), extra))); const L = load(); return L ? { coins: (L.backpack || {})[I] || 0, purse: 'gold' in L, v: L.goldV } : null; };
    o.mig = { plain: mig({ gold: 1234, backpack: {}, bagOrder: [] }), stack: mig({ gold: 100, backpack: { [I]: 50 }, bagOrder: [I] }), full: mig({ gold: 321.7, backpack: Object.assign({}, full), bagOrder: ord.slice() }), none: mig({ backpack: {}, bagOrder: [] }), again: (() => { const s = { goldV: 1, gold: 99, backpack: { [I]: 3 } }; Gold.migrate(s); return s.backpack[I]; })(), start: GOLD_COINS.START };
    if (keep == null) localStorage.removeItem(key); else localStorage.setItem(key, keep); S.backpack = JSON.parse(b0); S.bagOrder = JSON.parse(o0); C.order('bag'); Gold.spendGold(Gold.getGold()); Gold.addGold(g0); return o; });
  ok(GC.purse.gone && GC.purse.v === 1 && !GC.purse.writes && GC.purse.inBag, 't575s2576: no gold purse - S.gold is gone (migrated, goldV 1), nothing in the game writes it; gold is the backpack\'s Gold coins ' + JSON.stringify(GC.purse));
  ok(GC.shop.n1 === 1 && GC.shop.left === 5 && GC.shop.n2 === 0 && GC.shop.after === 5 && GC.shop.spendNo === false && GC.shop.add === 7 && GC.shop.now === 12, 't575s2576: the shop checks and spends the Gold coins in the backpack (none taken when short); Gold.spendGold / addGold ' + JSON.stringify(GC.shop));
  ok(GC.mig.plain && GC.mig.plain.coins === 1234 && !GC.mig.plain.purse && GC.mig.plain.v === 1 && GC.mig.stack.coins === 150 && GC.mig.full.coins === 321 && GC.mig.none.coins === GC.mig.start && GC.mig.again === 3, 't575s2576: old saves - the purse becomes Gold coins in the backpack (onto a coin stack, into a slot of their own when the backpack is full, the old 2500 seed when there was no purse), once ' + JSON.stringify(GC.mig));
  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  console.log(fails ? fails + ' FAILED' : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);
})();

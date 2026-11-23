// (Dominic) one Iron Winch for everyone; equipped gear lives in equipment slots, never in the backpack; a full backpack blocks every add (mining, unequip, crafting,
// buying, taking from the vault, Theus's pickaxes and gift), nothing overflows to the vault by itself. SHOT=1: winch_iron_ascend_closeup, backpack_equipped_gear,
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
    // swap: the old one goes back into the backpack
    C.add('bag', P('iron'), 1); C.equip(P('iron')); o.swap = [C.get('bag', P('bronze')), C.get('bag', P('iron')), C.worn().pick, S.pickGrade];
    // sell the equipped one: blocked (only a spare could be sold)
    o.sell = ['sell' in C, 'buy' in C, 'sellP' in C, 'buyP' in C, C.worn().pick];
    // ---- full backpack: unequip blocked everywhere (the vault screen too), nothing goes to the vault
    fill(); const v0 = C.get('vault', P('iron')); o.unFull = [C.unequip(P('iron')), C.worn().pick, /Backpack full/.test(last()), C.get('vault', P('iron')) - v0];
    C.open('xfer'); o.unVault = C.unequip(P('iron')); try { closeModalQuiet(); } catch (e) {}
    // a partial stack with room still takes more; a new kind does not
    o.partial = [C.addUpTo('bag', 'ore:copper', 5), C.addUpTo('bag', 'ore:tin', 5)];
    // crafting: room checked before the ingredients are taken
    C.add('vault', 'ore:copper', 30); C.add('vault', 'ore:tin', 30); const r = C.SMELT.find((q) => q.out === 'ingot:bronze'), cu = C.have('ore:copper'), tn = C.have('ore:tin'), vb = C.get('vault', 'ingot:bronze'); o.craft = [C.make(r, 1, 'bag'), C.have('ore:copper') === cu && C.have('ore:tin') === tn, C.get('bag', 'ingot:bronze'), C.get('vault', 'ingot:bronze') - vb];
    // buying: blocked before the gold is taken; taking from the vault: blocked
    S.gold = 100000; const vt = C.get('vault', 'ore:tin'); o.wd = [C.move('vault', 'bag', 'ore:tin', 5), C.get('vault', 'ore:tin') - vt];
    // Theus: gift pending while full (not to the vault), given on the next talk once there is room; a tiered pickaxe needs backpack room
    S.theusMet = false; S.theusGiftDue = 0; const gv = C.get('vault', P('bronze')), gb = C.have(P('bronze')); o.gift = [Theus.gift(), !!S.theusGiftDue, C.get('vault', P('bronze')) - gv, C.have(P('bronze')) - gb, !!S.theusMet];
    C.add('bag', P('rune'), -1); Theus.open(); Theus.close(); o.gift2 = [!!S.theusGiftDue, C.have(P('bronze')) - gb];
    fill(); C.add('vault', P('gold'), 25); S.tpicks = S.tpicks || {}; delete S.tpicks.gold; const up = Theus.upgrade('gold'); o.upFull = [up.ok, up.why, C.get('vault', P('gold'))];
    // the equipped plain pickaxe is never payment, except as the one being upgraded (T0 -> T1 with one short: it becomes the tiered one, still in her hand)
    C.take(P('gold'), C.spare(P('gold'))); C.add('vault', P('gold'), 20); C.add('bag', P('rune'), -1); C.add('bag', P('gold'), 1); C.equip(P('gold')); const up2 = Theus.upgrade('gold');
    o.upHand = [up2.ok, C.get('vault', P('gold')), C.worn().pick, Craft.pickTier('gold'), S.pickEqT];
    C.take(Craft.TPICK('steel'), C.spare(Craft.TPICK('steel'))); delete S.tpicks.steel; C.add('vault', P('steel'), 21); C.add('bag', P('rune'), -2); C.add('bag', P('steel'), 1); C.equip(P('steel')); const up3 = Theus.upgrade('steel');
    o.upSpare = [up3.ok, C.get('vault', P('steel')), C.worn().pick, C.get('bag', Craft.TPICK('steel'))];
    // mining with a full backpack: she stops and the message shows
    fill(); const got = Explore.mineGive('gold', 3); o.mine = [got, /Backpack full/.test(last())];
    // ---- gold only: no Lumen -> gold rate anywhere; old saves' listings keep their numbers (no x10); the x10-era prices hard-coded at their gold values
    { const tp0 = S.tpEx, ex0 = S.exchange; S.tpEx = { ai: [{ id: 'ai1', k: 'bronze', tier: 2, seller: 'X', price: 100 }], mine: [{ id: 'm1', k: 'iron', tier: 1, price: 7 }], next: 2 }; S.exchange = { bought: {}, mine: [{ k: 'stone', qty: 5, price: 3 }], nextId: 2 };
      Theus.exState(); try { CityMap.exchangeCard(); } catch (e) {} try { closeModalQuiet(); } catch (e) {}
      o.gold = ['COIN_RATE' in C, S.tpEx.ai[0].price, S.tpEx.mine[0].price, S.exchange.mine[0].price, /data-cx="(sell|buy)"/.test(bh), /coin\.webp/.test(bh)]; o.shopH = bh.match(/<h2>([^<]*)/)[1]; S.tpEx = null; o.aiP = Theus.exState().ai.map((q) => q.price).join('/'); S.tpEx = tp0; S.exchange = ex0; }
    o.gridEq = (C.bagHTML(false).match(/class="cxs[^"]* eq[ "]/g) || []).length; save(); return o; });
  ok(R.migW.join() === 'gold,iron,rune,30,36,6,false,false,false', `winch migration: the old anvil winch (Gold x2, Iron x1, Rune x1) dropped; ingots back (Gold ${R.migW[1]}, Rune ${R.migW[2]}, Iron ${R.migW[3]}); recorded in S.winchMigrated`);
  ok(R.migV2.join() === '2,3,18,18,false,stone', `winch v2 on a v1 save: Iron copies in the backpack, vault and an Exchange listing dropped, 3 x 6 Iron ingots back, other listings kept (${R.migV2.join(',')}) (got no ledge winch)`);
  ok(R.gold.join() === 'false,100,7,3,false,false' && R.aiP === '18610/21890/474980/598970/898710' && R.sell.join() === 'false,false,false,false,tool:pick_iron', `gold only: no COIN_RATE; old Theus / Exchange listings keep their gold numbers (no x10); Theus's AI sellers keep their asking prices (${R.aiP}) (${R.gold.join(',')})`);
  ok(R.shopH === '💠 Skins', `no set prices (Dominic): the shop ("${R.shopH}") has no Sell / Buy and no gold price; Craft has no sell / buy / sellP / buyP; ores, bars and pickaxes trade only between players (got player prices)`);
  { const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8'), w = src.match(/S\.crystals\s*(\+=|-=|=(?!=))[^;]*/g) || [], init = (src.match(/\bcrystals:\s*[^,}]+/g) || []);
    ok(!/COIN_RATE/.test(src) && w.length === 1 && /^S\.crystals = crystals\(\) - p$/.test(w[0]) && init.length > 0 && init.every((q) => /:\s*0$/.test(q)), `no rate in the build; Lumen Crystals have no in-game source: the one write to S.crystals is the skin purchase (${w.join(' | ')}), new saves start at ${init.join(', ')} (got gold only)`); }
  ok(R.gridEq === 0, 'no equipped highlight in the backpack grid');
  ok(R.migE.join() === '0,0,0,1,tool:pick_steel,bag,1,2', `equipped migration: climbing picks / tether / winch out of the backpack, one Steel pickaxe moved to her hand (${R.migE.join(',')})`);
  ok(R.winch.join() === ',gear:winch_iron,Iron Winch,false,true,1' && R.winchShop.join() === 'false,false,false,false', `only the Iron Winch exists, always worn; no recipe, shop, sell, anvil or unlock entry (${R.winch.join(',')} / ${R.winchShop.join(',')}) (got iron winch)`);
  ok(Math.abs(R.up - 1.45) < 0.01, `ascend speed stays ${R.up} m/s`);
  ok(R.eq[0] === 2 && R.eq[1] === 1 && R.eq[2] === 0 && R.eq[3] === 'tool:pick_bronze' && R.eq[4] && R.eq[5] === 0 && R.eq[6] === 'bronze', `equipping takes it out of the grid and the slot count (${R.eq[0]} -> ${R.eq[1]} slots); equipment row shown; no gear in the grid (got equipped out of backpack)`);
  ok(R.swap.join() === '1,0,tool:pick_iron,iron', `swap returns the old pickaxe to the backpack (${R.swap.join(',')})`);
  ok(R.unFull.join() === 'false,tool:pick_iron,true,0' && R.unVault === false, `full backpack: unequip blocked with "Backpack full" (also on the vault screen), nothing sent to the vault (got block it)`);
  ok(R.partial.join() === '5,0', `full backpack: a partial copper stack still takes 5, a new kind (tin) takes 0`);
  ok(R.craft.join() === '0,true,0,0', `smelting into a full backpack: blocked, ingredients kept (${R.craft.join(',')})`);
  ok(R.wd[0] === 0 && R.wd[1] === 0, `taking from the vault blocked`);
  ok(R.gift.join() === 'false,true,0,0,true' && R.gift2.join() === 'false,1', `Theus's gift: pending while full (not to the vault), given on the next talk once a slot is free (${R.gift.join(',')} / ${R.gift2.join(',')})`);
  ok(R.upFull.join() === 'false,full,25', `Theus: no backpack room for a new tiered pickaxe -> blocked, nothing paid`);
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
  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  console.log(fails ? fails + ' FAILED' : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);
})();

// (t591u, Dominic) the vault rule: nothing leaves the Ledge Vault unless she is at the vault screen (Backpack ⇄ Vault); the one exception is the Ledge Tether
// draw (Craft.tetherDraw). Static: no file but craft.js (whose add() is the one gate) takes from the vault, or from the vault stock in S.res (iron ore, coal,
// steel), without a guard. Runtime: the furnace / anvil, Theus, equip, take / move / add, building costs and market sales all leave the vault untouched away
// from it. Also: 'Withdraw as note' (one slot, can't be equipped, deposit redeems it, saved in hollowdeep.save.v1, listed / cancelled at the Lumen Crystal),
// 2000 vault slots drawn only as they scroll into view, no slot counter on the vault screen, the screen below the iPhone notch.
const fs = require('fs'), path = require('path'); const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
// ---- static audit
const SRC = path.join(__dirname, '..', 'src'), PAT = [/add\('vault',\s*[^,]+,\s*-/, /S\.res\.(iron|coal|steel)\s*-=/, /S\.res\[[^\]]+\]\s*-=/, /move\('vault'/, /delete v\.(gear|ores|ingots|coils)\b/, /v\.(gear|ores|ingots|coils)\[[^\]]+\]\s*(-=|--)/, /--v\.(gear|ores|ingots|coils)\[/];
const GUARD = /tetherDraw|moleDraw|VAULT-OK|vaultRes\(|k === 'iron' \|\| k === 'coal'/; const bad = [];
for (const f of fs.readdirSync(SRC).filter((f) => f.endsWith('.js') && f !== 'craft.js')) fs.readFileSync(path.join(SRC, f), 'utf8').split('\n').forEach((l, i) => { if (PAT.some((r) => r.test(l)) && !GUARD.test(l)) bad.push(f + ':' + (i + 1) + ' ' + l.trim().slice(0, 90)); });
ok(!bad.length, `no unguarded remote vault take outside craft.js's gate (${bad.length ? bad.join(' | ') : 'none'})`);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(1000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 200000 }).catch(() => {}); await p.waitForFunction(() => Explore.on, null, { timeout: 30000 }).catch(() => {});
  const r = await p.evaluate(async () => { const C = Craft, o = {}, PB = 'tool:pick_bronze', snap = () => JSON.stringify([S.ledgeVault, S.res.iron, S.res.coal, S.res.steel, S.vaultOrder]);
    try { closeModalQuiet(); } catch (e) {} for (const id of [PB, 'ingot:copper', 'ingot:tin', 'ore:copper', 'ore:tin']) { const n = C.get('bag', id); if (n) C.add('bag', id, -n); }
    C.add('vault', PB, 25); C.add('vault', 'ore:copper', 60); C.add('vault', 'ore:tin', 60); C.add('vault', 'ingot:bronze', 30); S.res.coal = Math.max(S.res.coal || 0, 50); S.res.iron = Math.max(S.res.iron || 0, 50);
    const s0 = snap(), r0 = (C.SMELT || []).find((q) => q.in && q.in['ore:copper']);
    o.remote = { atVault: C.atVault(), make: r0 ? C.make(r0, 1, 'bag') : 'no recipe', take: C.take('ingot:bronze', 1), move: C.move('vault', 'bag', 'ore:copper', 5), add: C.add('vault', 'ore:copper', -5), equip: C.equip(PB),
      theus: (() => { try { return !!Theus.upgrade('bronze').ok; } catch (e) { return 'err ' + e.message; } })(), build: typeof pay === 'function' ? pay({ iron: 1 }) : 'n/a', sell: typeof marketSell === 'function' ? !!marketSell('coal', 1, 1) : 'n/a' };
    o.untouched = snap() === s0; o.blocked = C.VBLOCK.length;
    C.add('vault', 'tether:iron', 100); const t0 = C.get('vault', 'tether:iron'); o.draw = C.tetherDraw(() => C.add('vault', 'tether:iron', -10)); o.drawLeft = t0 - C.get('vault', 'tether:iron'); C.add('vault', 'tether:iron', 10); const s1 = snap();
    o.drawOre = C.tetherDraw(() => C.add('vault', 'ore:copper', -1)); o.drawOreLeft = C.get('vault', 'ore:copper'); // (a tether draw takes Ledge Tether coils only)
    // physically at a vault: each opener's own range check, re-checked on every take. A drop tether at her feet (TetherTap's TAP_M range), Ambrose's talk range, the house Vault
    const WS = Explore.WS, h = Explore.here(), T0 = { kind: 'drop', name: 'test drop', pts: [[h[0], h[1]], [h[0] + WS, h[1]]] }, atV = () => TetherTap.openVault(T0);
    C.open('xfer'); o.noRange = [C.atVault(), C.move('vault', 'bag', 'ore:copper', 1)]; try { closeModalQuiet(); } catch (e) {}
    o.drop = [atV(), C.atVault()]; T0.pts.forEach((q) => { q[0] += WS * 50; }); o.drop.push(C.atVault(), C.move('vault', 'bag', 'ore:copper', 1), ui.modal); C.move('bag', 'vault', 'ore:copper', 1); /* (t598u: a Tether's Open vault is remote access, no distance limit) */ T0.pts.forEach((q) => { q[0] -= WS * 50; }); try { closeModalQuiet(); } catch (e) {}
    const amb = { x: h[0] + WS * 2, y: h[1], o: { name: 'Ambrose', role: 'Bank' } }; Town.folk.ST.talk = amb; Town.folk.act('vault'); o.bank = [ui.modal, C.atVault()]; amb.x += WS * 50; o.bank.push(C.atVault()); try { closeModalQuiet(); } catch (e) {}
    { const v = C.get('vault', 'ore:copper'); o.mole = [C.moleDraw(() => C.add('vault', 'ore:copper', -1)), C.get('vault', 'ore:copper') === v - 1]; C.add('vault', 'ore:copper', 1); } // (t598u: the Mole may fetch any vault item)
    o.home = CharView.homeVaultNear(); o.untouched2 = snap() === s1;
    // at the vault: Withdraw as note
    atV(); await new Promise((q) => setTimeout(q, 200)); o.atVault = C.atVault(); o.gauge = document.querySelectorAll('#modalBody .kGauge').length; const sh = document.querySelector('#modal .sheet').getBoundingClientRect(); o.top = [Math.round(sh.top), getComputedStyle(document.getElementById('modal')).alignItems];
    o.rendered = document.querySelectorAll('#modalBody .cxs[data-w=vault]').length; o.N = C.VAULT_N; const sc = document.querySelector('#modalBody .cxvv'); o.scroller = !!sc;
    if (sc) { sc.scrollTop = sc.scrollHeight; sc.dispatchEvent(new Event('scroll')); await new Promise((q) => setTimeout(q, 100)); o.last = !!document.querySelector('#modalBody .cxs[data-w=vault][data-s="1999"]'); o.rendered2 = document.querySelectorAll('#modalBody .cxs[data-w=vault]').length; sc.scrollTop = 0; sc.dispatchEvent(new Event('scroll')); await new Promise((q) => setTimeout(q, 100)); }
    document.querySelector('#modalBody [data-cx=note]').click(); await new Promise((q) => setTimeout(q, 50)); const slot = document.querySelector(`#modalBody .cxs[data-w=vault][data-id="${PB}"]`); if (slot) slot.click(); await new Promise((q) => setTimeout(q, 100));
    const NID = 'note:' + PB; o.note = { bag: C.get('bag', NID), slots: C.order('bag').filter((x) => x === NID).length, vault: C.get('vault', PB), loose: C.get('bag', PB), equip: C.equip(NID), have: C.have(PB) };
    const ns = document.querySelector(`#modalBody .cxs[data-w=bag][data-id="${NID}"]`); if (ns) ns.click(); await new Promise((q) => setTimeout(q, 100)); o.redeem = { vault: C.get('vault', PB), note: C.get('bag', NID) };
    const s2 = document.querySelector(`#modalBody .cxs[data-w=vault][data-id="${PB}"]`); if (s2) s2.click(); await new Promise((q) => setTimeout(q, 100)); const tog = document.querySelector('#modalBody [data-cx=note]'); if (tog) tog.click(); try { closeModalQuiet(); } catch (e) {}
    save(); const sv = JSON.parse(localStorage.getItem(CONFIG.saveKey) || '{}'); o.saved = [CONFIG.saveKey, sv.backpack && sv.backpack[NID], Array.isArray(sv.vaultOrder) ? sv.vaultOrder.length : -1];
    // the Lumen Crystal: list the note, cancel it
    C.open('exchange'); o.crystal = /Bank notes/.test(document.getElementById('modalBody').innerHTML) && !!document.querySelector(`#modalBody [data-cx=nlist][data-id="${NID}"]`); o.list = [C.noteList(NID, 100), C.get('bag', NID), (S.noteEx.mine || []).length]; o.cancel = [C.noteCancel(S.noteEx.mine[0].id), C.get('bag', NID)]; try { closeModalQuiet(); } catch (e) {}
    // away from the vault the note stays a note; deposited (at the vault) it is the 25 pickaxes again
    atV(); o.back = C.move('bag', 'vault', NID, 25); o.final = [C.get('vault', PB), C.get('bag', NID)]; try { closeModalQuiet(); } catch (e) {}
    atV(); C.add('vault', PB, -25); C.add('vault', 'ore:copper', -60); C.add('vault', 'ore:tin', -60); C.add('vault', 'ingot:bronze', -30); C.add('vault', 'tether:iron', -100); try { closeModalQuiet(); } catch (e) {} return o; });
  console.log(JSON.stringify(r)); const R = r.remote;
  ok(!R.atVault && !R.make && R.take === false && R.move === 0 && R.add === 0 && R.equip === false && R.theus === false && R.build === false && !R.sell && r.untouched && r.blocked > 0, `away from the vault nothing comes out of it: furnace ${R.make}, take ${R.take}, move ${R.move}, add ${R.add}, equip ${R.equip}, Theus ${R.theus}, building cost ${R.build}, market sale ${R.sell}; vault unchanged ${r.untouched} (${r.blocked} blocked)`);
  ok(r.draw === -10 && r.drawLeft === 10 && r.drawOre === 0 && r.drawOreLeft === 60, `the Ledge Tether draw is the one exception, and it takes Ledge Tether coils only (tether ${r.draw}, ore ${r.drawOre}, ore left ${r.drawOreLeft})`);
  ok(r.noRange.join() === 'false,0', `the transfer screen alone is not enough: opened with no vault in reach, nothing comes out (${r.noRange})`);
  ok(r.drop.join() === 'true,true,true,1,cx-xfer', `(t598u) a drop tether's Open vault is remote vault access: withdrawals work, also 50 m from the strand (${r.drop})`);
  ok(r.bank.join() === 'cx-xfer,true,false', `Ambrose's vault: within his talk range yes, out of it no (${r.bank})`);
  ok(r.mole && r.mole.join() === '-1,true', `(t598u) the Mole fetch is a permitted remote withdrawal for any item (${r.mole})`);
  ok(r.home === false && r.untouched2, `the house Vault's range check is false out in the field (${r.home}); the vault is still untouched (${r.untouched2})`);
  ok(r.atVault && r.gauge === 0, `at the vault screen: no slot counter (${r.gauge} gauges)`);
  ok(r.N === 2000 && r.scroller && r.rendered > 0 && r.rendered < 200 && r.last && r.rendered2 < 200, `2000 vault slots, only the rows in view drawn (${r.rendered} then ${r.rendered2} slots in the page; slot 2000 shows when scrolled to: ${r.last})`);
  ok(r.top[0] >= 0 && r.top[1] === 'flex-start', `the vault screen starts below the top of the screen (top ${r.top[0]} px, ${r.top[1]})`);
  ok(r.note.bag === 25 && r.note.slots === 1 && r.note.vault === 0 && r.note.loose === 0 && r.note.equip === false && r.note.have === 25, `Withdraw as note: 25 Bronze Pickaxes -> one note in one backpack slot, can't be equipped (${JSON.stringify(r.note)})`);
  ok(r.redeem.vault === 25 && r.redeem.note === 0, `depositing the note at the vault turns it back into 25 pickaxes (${JSON.stringify(r.redeem)})`);
  ok(r.saved[0] === 'hollowdeep.save.v1' && r.saved[1] === 25 && r.saved[2] >= 0 && r.saved[2] < 200, `the note saves in ${r.saved[0]} (${r.saved[1]}); the vault order is not padded to 2000 (${r.saved[2]})`);
  ok(r.crystal && r.list.join() === 'true,0,1' && r.cancel.join() === 'true,25', `the Lumen Crystal lists bank notes: listed (${r.list}), cancelled back (${r.cancel})`);
  ok(r.back === 25 && r.final.join() === '25,0', `note deposited at the vault: ${r.final}`);
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  console.log(fails ? fails + ' FAIL' : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0); })();

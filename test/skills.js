// Mining & Smithing: shared curve vs v7.py, drill 1/3 rate, slot unlocks, level-speed bonus,
// AFK parity, save migration, and XP safety near the practical ceiling (Lv 300).
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const near = (a, b, e) => Math.abs(a - b) <= e;

(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(800);
  await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof Skills !== 'undefined' && typeof Explore !== 'undefined', null, { timeout: 200000 }).catch(() => {});

  const r = await p.evaluate(() => {
    const Skl = Skills, rnd = (L) => Math.round(Skl.xpToReach(L));
    const curve = {};
    for (const L of [10, 20, 35, 50, 65, 95, 99, 120, 150, 200, 250, 300]) curve[L] = { raw: Skl.xpToReach(L), rounded: rnd(L) };
    const char1 = Skl.characterOrePerHour('copper', 0, 1);
    const drill1 = Skl.drillOrePerHour('copper', 0, 1);
    const charGold = Skl.characterOrePerHour('gold', 3, 35);
    const drillGold = Skl.drillOrePerHour('gold', 3, 35);
    const slots = {};
    for (const L of [1, 4, 5, 9, 10, 19, 20, 34, 35, 49, 50, 64, 65, 74, 75, 84, 85, 89, 90, 120]) slots[L] = Skl.slotsUnlocked(L);
    const bonus = {
      atUnlock: Skl.levelSpeedBonus(120, 120),
      copper120: Skl.levelSpeedBonus(120, 1),
      onyx200: Skl.levelSpeedBonus(200, 120),
      onyx300: Skl.levelSpeedBonus(300, 120),
      below: Skl.levelSpeedBonus(10, 20)
    };
    const afk = {
      timeout: Skl.INPUT_TIMEOUT_MS,
      active: Skl.characterXpPerHour('iron', 2, 20),
      idle: Skl.characterXpPerHour('iron', 2, 20, { afk: true, idleMs: 120000 })
    };
    const old = { v: 1, backpack: { 'ore:copper': 7, 'bit:mithril': 2, 'tether:mithril': 400 }, bagOrder: ['ore:copper', 'bit:mithril', 'tether:mithril'] };
    const migrated = Skl.migrate(old);
    const xp300 = Skl.xpToReach(300), xp301 = Skl.xpToReach(301), xpRaw300 = 5.55 * (1200 * (Math.pow(1.1, 299) - 1) + 180 * 299);
    const before = Skl.clampXp(xp300);
    const added = Skl.clampXp(before + Skl.xpForLevel(300));
    const days = { lumenite: Skl.hoursToLevel(95) / 24, onyx: Skl.hoursToLevel(120) / 24 };
    const u72 = Skl.nextUnlock('mining', 72), u41 = Skl.nextUnlock('smithing', 41), u1 = Skl.nextUnlock('mining', 1);
    const mineE = Skl.unlockEntries('mining'), smithE = Skl.unlockEntries('smithing');
    const invented = mineE.concat(smithE).some((e) => e.kind === 'stand' || e.kind === 'perk' || /Prospector|Lashed Timber|Double Ore|The Mole|Steady Bellows|Thrifty|Masterwork|Seam Sash/.test(e.name));
    const kinds = { mining: [...new Set(mineE.map((e) => e.kind))], smithing: [...new Set(smithE.map((e) => e.kind))] };
    const hop = {};
    const at = { copper: [0, 1], coal: [0, 10], iron: [1, 20], gold: [2, 35], mithril: [3, 50], runite: [4, 65], lumenite: [5, 95], onyx: [6, 120] };
    for (const [id, [t, L]] of Object.entries(at)) hop[id] = { oreH: Skl.drillOrePerHour(id, t, L), hours: Skl.hopperHours(id, t, L) };
    return {
      hasSkills: typeof Skills !== 'undefined',
      post: Skl.SKILL_POST_120_GROWTH, k: Skl.SKILL_XP_SCALE, bonusK: Skl.LEVEL_SPEED_K, div: Skl.DRILL_RATE_DIV, ceil: Skl.SKILL_SHOW_CEILING,
      curve, char1, drill1, charGold, drillGold, slots, bonus, afk,
      mig: { mining: migrated.skills && migrated.skills.mining, smithing: migrated.skills && migrated.skills.smithing, copper: migrated.backpack['ore:copper'], bit: migrated.backpack['bit:mithril'], tether: migrated.backpack['tether:mithril'], order: migrated.bagOrder.slice() },
      safe: { xp300, xp301, xpRaw300, maxSafe: Number.MAX_SAFE_INTEGER, isSafe300: Number.isSafeInteger(Math.round(xp300)), added, finiteAdd: isFinite(added) && added >= xp300, level300: Skl.levelFromXp(xp300), level299: Skl.levelFromXp(xp300 - 1) },
      days, hop, tess: Skl.tessDrillQuestDone(), slotTable: Skl.DRILL_SLOT_LEVELS.slice(),
      u72, u41, u1, nMine: mineE.length, nSmith: smithE.length, kinds, invented
    };
  });
  console.log(JSON.stringify({ days: r.days, char1: r.char1, drill1: r.drill1, xp300: r.safe && Math.round(r.safe.xp300), hop: r.hop }, null, 2));

  ok(r.hasSkills, 'Skills is on the page');
  ok(r.k === 5.55 && r.post === 1.03 && r.bonusK === 0.005 && r.div === 3 && r.ceil === 300, `constants: scale ${r.k}, POST_120_GROWTH ${r.post}, K ${r.bonusK}, drill ÷${r.div}, ceiling ${r.ceil}`);

  const expectCurve = { 10: 18035, 20: 53053, 35: 197453, 50: 753039, 65: 3026248, 95: 51894030, 99: 75941555, 120: 561423492, 150: 3061995680, 200: 17452320074, 250: 80538149792, 300: 357100498389 };
  const curveOk = Object.keys(expectCurve).every((L) => r.curve[L].rounded === expectCurve[L]);
  ok(curveOk, 'curve totals match v7.py at 10, 20, 35, 50, 65, 95, 99, 120, 150, 200, 250, 300');
  if (!curveOk) Object.keys(expectCurve).forEach((L) => console.log('  L' + L, r.curve[L].rounded, 'expected', expectCurve[L]));

  ok(near(r.char1, 630, 1) && near(r.drill1, 210, 1) && near(r.drill1, r.char1 / 3, 1e-9), `drill ore/h is 1/3 of the character on Copper at Lv 1 (char ${r.char1.toFixed(2)}, drill ${r.drill1.toFixed(2)})`);
  ok(near(r.charGold, 441, 2) && near(r.drillGold, r.charGold / 3, 1e-9) && near(r.drillGold, 147, 1), `drill ore/h is 1/3 of the character on Gold at Lv 35 (char ${r.charGold.toFixed(2)}, drill ${r.drillGold.toFixed(2)})`);

  const slotExpect = { 1: 0, 4: 0, 5: 1, 9: 1, 10: 2, 19: 2, 20: 3, 34: 3, 35: 4, 49: 4, 50: 5, 64: 5, 65: 6, 74: 6, 75: 7, 84: 7, 85: 8, 89: 8, 90: 9, 120: 9 };
  const slotOk = Object.keys(slotExpect).every((L) => r.slots[L] === slotExpect[L]);
  ok(slotOk && r.slotTable.join(',') === '5,10,20,35,50,65,75,85,90' && r.tess === true, 'drill slots unlock at 5, 10, 20, 35, 50, 65, 75, 85, 90; Lv 5 is just the level (no Tess quest)');
  if (!slotOk) console.log(' slots', r.slots);

  ok(r.bonus.atUnlock === 1 && r.bonus.below === 1, 'speed bonus is 1.00 at the ore unlock and does not penalise below it');
  ok(near(r.bonus.copper120, 1 + 0.005 * 119, 1e-12) && near(r.bonus.onyx200, 1.4, 1e-12) && near(r.bonus.onyx300, 1.9, 1e-12), `uncapped bonus: ×${r.bonus.onyx200} at 200 and ×${r.bonus.onyx300} at 300 on Ember Onyx`);

  ok(r.afk.timeout === 0 && r.afk.active === r.afk.idle && r.afk.active > 0, `AFK parity: no input timeout (${r.afk.timeout} ms) and the same character XP/h idle or active (${r.afk.active.toFixed(1)})`);

  ok(r.mig.mining === 0 && r.mig.smithing === 0, 'old saves migrate to 0 Mining and 0 Smithing XP');
  ok(r.mig.copper === 7 && r.mig.bit === 2 && r.mig.tether === 400 && r.mig.order.join(',') === 'ore:copper,bit:mithril,tether:mithril', 'migration keeps internal ids (ore:copper, bit:mithril, tether:mithril)');

  ok(r.safe.xp300 < r.safe.maxSafe && r.safe.isSafe300 && r.safe.xpRaw300 > r.safe.maxSafe, `Lv 300 XP (${Math.round(r.safe.xp300)}) stays below MAX_SAFE_INTEGER; the raw 10% curve does not`);
  ok(r.safe.finiteAdd && r.safe.added < r.safe.maxSafe && isFinite(r.safe.xp301) && r.safe.xp301 > r.safe.xp300, 'adding a level near 300 stays finite and inside the safe integer range');
  ok(r.safe.level300 === 300 && r.safe.level299 === 299, 'levelFromXp at the 300 threshold is exact');

  ok(near(r.days.lumenite, 13.39, 0.05), `time to Lumenite (Lv 95) at max rate: ${r.days.lumenite.toFixed(2)} d (model 13.39 / about 13)`);
  ok(near(r.days.onyx, 90.06, 0.15), `time to Ember Onyx (Lv 120) at max rate: ${r.days.onyx.toFixed(2)} d (model 90.06 / about 90)`);

  ok(r.u72 && r.u72.next && r.u72.next.name === 'Drill slot 7' && r.u72.next.level === 75 && r.u72.then && r.u72.then.name === 'Lumenite ore' && r.u72.then.level === 95, 'Mining 72 next unlock is Drill slot 7 at 75, then Lumenite ore at 95');
  ok(r.u41 && r.u41.next && r.u41.next.name === 'Mithril bar' && r.u41.next.level === 55 && !r.u41.then, 'Smithing 41 next unlock is Mithril bar at 55');
  ok(r.u1 && r.u1.next && r.u1.next.name === 'Drill slot 1' && r.u1.next.level === 5 && r.u1.then && r.u1.then.name === 'Coal ore', 'Mining 1 next unlock is Drill slot 1 at 5, then Coal ore');
  ok(r.nMine === 26 && r.kinds.mining && r.kinds.mining.every((k) => k === 'ore' || k === 'slot' || k === 'use'), `Mining detail lists ${r.nMine} live ore / drill-slot / tool-use entries`);
  ok(r.nSmith === 48 && r.kinds.smithing && r.kinds.smithing.every((k) => k === 'bar' || k === 'make'), `Smithing detail lists ${r.nSmith} live bar / tool-make entries`);
  ok(!r.invented, 'detail entries do not invent stand gates or proposed perks');

  // skills HUD + screen
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok && typeof Explore !== 'undefined' && Explore.on && document.getElementById('exSkillsBtn'), null, { timeout: 200000 }).catch(() => {});
  const ui = await p.evaluate(async () => {
    const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return [+r.left.toFixed(1), +r.top.toFixed(1), +r.width.toFixed(1), +r.height.toFixed(1)]; };
    const same = (a, b) => !!a && !!b && a.every((v, i) => Math.abs(v - b[i]) <= 1);
    Skills.migrate();
    const mineInto = Skills.xpToReach(73) - Skills.xpToReach(72), smithInto = Skills.xpToReach(42) - Skills.xpToReach(41);
    S.skills.mining = Skills.xpToReach(72) + 0.62 * mineInto;
    S.skills.smithing = Skills.xpToReach(41) + 0.35 * smithInto;
    const stM = Skills.skillState('mining'), stS = Skills.skillState('smithing');
    const btn = document.getElementById('exSkillsBtn'), bag = document.getElementById('exBagBtn'), map = document.getElementById('exMapBtn'), ch = document.querySelector('[data-city=vchar]');
    const before = { btn: rect(btn), bag: rect(bag), map: rect(map), ch: rect(ch), y: window.scrollY || 0, on: btn && btn.classList.contains('on') };
    btn.click();
    const sheet = document.getElementById('skillsSheet');
    const mid = { open: !!(sheet && sheet.classList.contains('on') && Skills.screenOn()), sel: btn.classList.contains('sel'), t: sheet ? sheet.textContent : '', scroll: sheet && sheet.querySelector('.skList') ? sheet.querySelector('.skList').scrollHeight - sheet.querySelector('.skList').clientHeight : 99,
      sheet: rect(sheet), bag: rect(bag), map: rect(map), ch: rect(ch), y: window.scrollY || 0, rows: sheet ? sheet.querySelectorAll('.skRow').length : 0, locks: sheet ? sheet.querySelectorAll('.skRow.skLock').length : 0 };
    window.scrollBy(0, 180); document.documentElement.scrollTop = 180; document.body.scrollTop = 180;
    if (sheet) sheet.scrollTop = 80; const list = sheet && sheet.querySelector('.skList'); if (list) list.scrollTop = 80;
    if (sheet) sheet.dispatchEvent(new WheelEvent('wheel', { deltaY: 240, bubbles: true, cancelable: true, view: window }));
    const midR = sheet.getBoundingClientRect();
    sheet.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: midR.left + midR.width / 2, clientY: midR.top + 12, pointerId: 9, pointerType: 'touch' }));
    sheet.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, cancelable: true, clientX: midR.left + midR.width / 2, clientY: midR.top - 140, pointerId: 9, pointerType: 'touch' }));
    sheet.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, clientX: midR.left + midR.width / 2, clientY: midR.top - 140, pointerId: 9, pointerType: 'touch' }));
    const shifted = { sheet: rect(sheet), bag: rect(bag), map: rect(map), ch: rect(ch), y: window.scrollY || 0 };
    let hooked = null; Skills.onDetail = (id) => { hooked = id; };
    const ico = sheet.querySelector('[data-sk-detail=mining]'); if (ico) ico.click();
    const det = document.getElementById('skillsSheet');
    const detList = det && det.querySelector('.skUnlocks');
    if (detList) { detList.scrollTop = 120; detList.dispatchEvent(new WheelEvent('wheel', { deltaY: 400, bubbles: true, cancelable: true, view: window })); }
    const afterHook = {
      hooked, detail: Skills.detailSkill, view: Skills.view,
      t: det ? det.textContent : '',
      here: !!(det && det.querySelector('#skHere')),
      wall: !!(det && /THE LUMENITE WALL/.test(det.textContent)),
      ember: !!(det && /EMBER ONYX · MASTER OF THE SEAM/.test(det.textContent)),
      invented: !!(det && /Prospector|Lashed Timber|Double Ore|The Mole|Steady Bellows/.test(det.textContent)),
      bag: rect(bag), map: rect(map), ch: rect(ch), y: window.scrollY || 0, sheet: rect(det)
    };
    const back = det && det.querySelector('[data-sk=back]'); if (back) back.click();
    const listed = { view: Skills.view, rows: sheet.querySelectorAll('.skRow').length, title: (sheet.textContent || '').includes('Skills') && !(sheet.textContent || '').includes('Mining unlocks') };
    const nm = sheet.querySelector('.skName[data-sk-detail=mining]'); if (nm) nm.click();
    const named = { view: Skills.view, t: sheet.textContent || '' };
    const tab = sheet.querySelector('[data-sk-tab=smithing]'); if (tab) tab.click();
    const tabbed = { view: Skills.view, t: sheet.textContent || '', here: /You are here · Lv 41/.test(sheet.textContent || ''), climb: /Gold climbing picks/.test(sheet.textContent || ''), invented: /Steady Bellows|Thrifty|Masterwork|Furnace/.test(sheet.textContent || '') };
    sheet.querySelector('[data-sk=close]').click();
    const closed = { on: Skills.screenOn(), sel: btn.classList.contains('sel'), cls: sheet.classList.contains('on'), bag: rect(bag), ch: rect(ch), y: window.scrollY || 0, openClass: document.documentElement.classList.contains('skills-open'), view: Skills.view };
    btn.click();
    const reopened = Skills.screenOn() && Skills.view === 'list';
    btn.click();
    return { before, mid, shifted, afterHook, listed, named, tabbed, closed, reopened, stM, stS,
      midOk: same(mid.sheet, shifted.sheet) && same(before.bag, shifted.bag) && same(before.map, shifted.map) && same(before.ch, shifted.ch) && shifted.y === 0,
      detOk: same(before.bag, afterHook.bag) && same(before.map, afterHook.map) && same(before.ch, afterHook.ch) && afterHook.y === 0,
      afterOk: !closed.on && !closed.sel && !closed.cls && same(before.bag, closed.bag) && same(before.ch, closed.ch) && closed.y === 0 && !closed.openClass };
  });
  console.log(JSON.stringify({ open: ui.mid && ui.mid.open, rows: ui.mid && ui.mid.rows, locks: ui.mid && ui.mid.locks, hooked: ui.afterHook && { hooked: ui.afterHook.hooked, view: ui.afterHook.view }, midOk: ui.midOk, detOk: ui.detOk, afterOk: ui.afterOk }));
  ok(ui.before && ui.before.on, 'the Skills HUD button is on the Character-view HUD, above Bag');
  ok(ui.mid && ui.mid.open && ui.mid.sel, 'tapping the Skills button opens the skills screen and presses the button');
  ok(ui.mid && ui.mid.rows === 4 && ui.mid.locks === 2, `the screen shows Mining, Smithing and two locked Future skill rows (${ui.mid && ui.mid.rows} rows, ${ui.mid && ui.mid.locks} locked)`);
  const T = (ui.mid && ui.mid.t) || '';
  ok(ui.stM && ui.stM.level === 72 && ui.stM.pct === 62 && T.includes('Mining') && T.includes('6.2M') && T.includes('359.3k') && T.includes('579.6k') && /Drill slot 7/.test(T) && /Lumenite/.test(T), `Mining values match Skills (${ui.stM && ui.stM.pct}% · ${ui.stM && ui.stM.level} · 6.2M)`);
  ok(ui.stS && ui.stS.level === 41 && ui.stS.pct === 35 && T.includes('345.6k') && T.includes('10.9k') && T.includes('31.1k') && /Mithril bar/.test(T) && /Lv 55/.test(T), 'Smithing values match Skills (Lv 41, 345.6k total, Mithril bar · Lv 55)');
  ok(ui.mid && ui.mid.scroll <= 1, `all skill info is visible without scrolling (overflow ${ui.mid && ui.mid.scroll} px)`);
  ok(ui.midOk, 'a vertical drag or scroll does not move the skills screen or the HUD buttons');
  const D = (ui.afterHook && ui.afterHook.t) || '';
  ok(ui.afterHook && ui.afterHook.hooked === 'mining' && ui.afterHook.detail === 'mining' && ui.afterHook.view === 'detail', 'tapping the Mining icon opens the Mining unlock preview');
  ok(/Mining unlocks/.test(D) && /You are here · Lv 72/.test(D) && /3 levels to go/.test(D) && /Drill slot 7/.test(D) && D.includes('6.2M') && D.includes('62%'), 'the detail header and You-are-here line match live Mining values');
  ok(ui.afterHook && ui.afterHook.wall && ui.afterHook.ember && /Lumenite ore/.test(D) && /Ember Onyx pick/.test(D), 'prize groups THE LUMENITE WALL and EMBER ONYX · MASTER OF THE SEAM are in the list');
  ok(ui.afterHook && !ui.afterHook.invented, 'the preview does not invent proposed stands or perks');
  ok(ui.detOk, 'scrolling the unlock list does not move the page or the HUD buttons');
  ok(ui.listed && ui.listed.view === 'list' && ui.listed.rows === 4 && ui.listed.title, 'the back button returns to the Skills screen');
  ok(ui.named && ui.named.view === 'detail' && /Mining unlocks/.test(ui.named.t), 'tapping the Mining name also opens the preview');
  ok(ui.tabbed && ui.tabbed.view === 'detail' && /Smithing unlocks/.test(ui.tabbed.t) && ui.tabbed.here && ui.tabbed.climb && /345.6k/.test(ui.tabbed.t) && !ui.tabbed.invented, 'the Smithing tab shows live bars and tool makes, with You are here at Lv 41');
  ok(ui.afterOk, 'the close button closes the screen and leaves the HUD buttons unshifted');
  ok(ui.closed && ui.reopened === true, 'tapping the Skills button again reopens the screen, then closes it');

  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  await b.close();
  if (fails) { console.log(fails + ' failed'); process.exit(1); }
  console.log('all passed');
})().catch((e) => { console.error(e); process.exit(1); });

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
    const hop = {};
    const at = { copper: [0, 1], coal: [0, 10], iron: [1, 20], gold: [2, 35], mithril: [3, 50], runite: [4, 65], lumenite: [5, 95], onyx: [6, 120] };
    for (const [id, [t, L]] of Object.entries(at)) hop[id] = { oreH: Skl.drillOrePerHour(id, t, L), hours: Skl.hopperHours(id, t, L) };
    return {
      hasSkills: typeof Skills !== 'undefined',
      post: Skl.SKILL_POST_120_GROWTH, k: Skl.SKILL_XP_SCALE, bonusK: Skl.LEVEL_SPEED_K, div: Skl.DRILL_RATE_DIV, ceil: Skl.SKILL_SHOW_CEILING,
      curve, char1, drill1, charGold, drillGold, slots, bonus, afk,
      mig: { mining: migrated.skills && migrated.skills.mining, smithing: migrated.skills && migrated.skills.smithing, copper: migrated.backpack['ore:copper'], bit: migrated.backpack['bit:mithril'], tether: migrated.backpack['tether:mithril'], order: migrated.bagOrder.slice() },
      safe: { xp300, xp301, xpRaw300, maxSafe: Number.MAX_SAFE_INTEGER, isSafe300: Number.isSafeInteger(Math.round(xp300)), added, finiteAdd: isFinite(added) && added >= xp300, level300: Skl.levelFromXp(xp300), level299: Skl.levelFromXp(xp300 - 1) },
      days, hop, tess: Skl.tessDrillQuestDone(), slotTable: Skl.DRILL_SLOT_LEVELS.slice()
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

  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  await b.close();
  if (fails) { console.log(fails + ' failed'); process.exit(1); }
  console.log('all passed');
})().catch((e) => { console.error(e); process.exit(1); });

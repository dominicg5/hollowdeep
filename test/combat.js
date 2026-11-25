// (combat design) the Combat stats engine: grade tables, tier math, the Lv 300 example, hit cap + easing, skill-tree caps + prerequisites,
// the in-fight healing cap, sword equip locks and save migration. Unit checks against the built page (no 3D, no renders).
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL + '?t=' + Date.now(), { timeout: 90000, waitUntil: 'commit' }); await p.waitForFunction(() => typeof Combat !== 'undefined' && typeof S !== 'undefined' && S && S.combat, null, { timeout: 120000 });
  const R = await p.evaluate(() => {
    const C = Combat, o = {}, near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
    // tables
    const want = { stick: [2, 2, 0], bronze: [2, 2, 2], iron: [3, 3, 4], steel: [4, 4, 6], gold: [5, 5, 8], mithril: [7, 7, 11], rune: [9, 9, 15], lumen: [12, 12, 20], onyx: [16, 16, 26] };
    o.tables = Object.entries(want).every(([g, v]) => { const q = C.pairStats(g, 0), h = C.swordStats(g, 0); return q.str === v[0] && q.acc === v[1] && q.hp === v[2] && h.str * 2 === v[0] && h.acc * 2 === v[1] && h.hp * 2 === v[2]; });
    o.stickOne = C.SWORD_PAIR.stick === C.STICK_PAIR;
    o.unlock = JSON.stringify(C.SWORD_UNLOCK) === JSON.stringify({ stick: 1, bronze: 1, iron: 20, steel: 30, gold: 45, mithril: 70, rune: 100, lumen: 160, onyx: 220 });
    // tier math
    o.tier = near(C.tierMult(0), 1) && near(C.tierMult(1), 1.75) && near(C.tierMult(10), 8.5) && near(C.pairStats('onyx', 10).str, 136) && near(C.pairStats('onyx', 10).hp, 221) && near(C.pairStats('mithril', 4).acc, 28) && C.pairStats('stick', 10).str === 2;
    // base player + level scaling (no swords, no tree)
    const fresh = () => { const s = { combat: { xp: 0 }, skill: {} }; return s; };
    // t638u: the dev grant - 300 points to spend on any save while DEV_POINTS is on, without touching Combat XP / level; off, it's 1 point per level again
    { const d = fresh(); C.setLevel(4, d); const xp0 = JSON.stringify(d.combat); o.dev = [C.DEV_POINTS, C.pointsTotal(d), C.level(d), JSON.stringify(d.combat) === xp0, C.pointsTotal(S), C.branchMax('combat'), C.branchMax('production')]; }
    const dev0 = C.DEV_POINTS; C.DEV_POINTS = 0; o.devOff = [C.DEV_POINTS, C.pointsTotal((() => { const d = fresh(); C.setLevel(4, d); return d; })())]; /* (the level-based checks below run with the grant off) */
    const s1 = fresh(), b1 = C.playerStats(s1, { L: null, R: null });
    const s300 = fresh(); C.setLevel(300, s300); const b300 = C.playerStats(s300, { L: null, R: null });
    o.base = { l1: [b1.level, b1.str, b1.hp, b1.acc], l300: [b300.level, b300.str, b300.hp, b300.acc] };
    o.baseOk = b1.level === 1 && b1.str === 1 && b1.hp === 11 && b1.acc === 0 && b300.level === 300 && b300.str === 101 && b300.hp === 310;
    // (GD-15) Defense: +1 per 3 Combat levels (0 at Lv 1, 100 at Lv 300), Guard +2 per point (max 25); Parry 1%/pt (max 10) needs 10 Vitality points (Guard counts)
    { const d = fresh(); C.setLevel(30, d); const g0 = C.playerStats(d, { L: null, R: null }).def; d.skill = { guard: 25 }; const gd = C.playerStats(d, { L: null, R: null });
      const pq = fresh(); C.setLevel(300, pq); const parNo = C.whyNot('parry', pq) === 'req'; pq.skill = { guard: 10 }; const parYes = C.addPoint('parry', pq); pq.skill.parry = 10; const pp = C.playerStats(pq, { L: null, R: null });
      const seq = (a) => { let i = 0; return () => a[i++ % a.length]; }, cr = { str: 1, acc: 30 };
      const blk = C.creatureAttack(cr, { def: 0, parry: 0.1 }, { rng: seq([0.05]) }), full = C.creatureAttack(cr, { def: 0, parry: 0 }, { rng: seq([0.1]) }), miss = C.creatureAttack({ str: 4, acc: 30 }, { def: 0, parry: 0 }, { rng: seq([0.9, 0.99]) });
      o.def = { l1: b1.def, l300: b300.def, g0, guard: gd.def, parNo, parYes, parry: pp.parry, ch0: C.hitChance(30, 0), ch100: C.hitChance(30, 100), cap: C.hitChance(1e6, 0), blk, full, miss, nodes: [C.NODE.guard && [C.NODE.guard.sub, C.NODE.guard.max], C.NODE.parry && [C.NODE.parry.sub, C.NODE.parry.max, C.NODE.parry.req]] };
      o.defOk = b1.def === 0 && b300.def === 100 && g0 === 10 && gd.def === 60 && parNo && parYes && near(pp.parry, 0.1) && near(o.def.ch0, 0.3) && near(o.def.ch100, 0.15) && o.def.cap <= 0.6 + 1e-9 && blk.parried && blk.dmg === 0 && full.hit && full.dmg === 1 && !miss.hit && miss.dmg === 4
        && C.NODE.guard.sub === 'vitality' && C.NODE.guard.max === 25 && C.NODE.parry.max === 10 && C.NODE.parry.req.vitality === 10; }
    // the Lv 300 example: T10 Ember Onyx pair + maxed Might (Strength 40, Vigor 50)
    s300.skill = { strength: 40, vigor: 50 }; const ex = C.playerStats(s300, { L: { g: 'onyx', t: 10 }, R: { g: 'onyx', t: 10 } });
    o.example = [ex.str, ex.hp, ex.acc]; o.exampleOk = ex.str === 277 && ex.hp === 681 && ex.acc === 136;
    // hit chance: linear below 50%, eased toward the 60% cap, never past it, monotone
    let mono = true, prev = -1, maxP = 0; for (let a = 0; a <= 5000; a += 5) { const h = C.hitChance(a, 0); if (h < prev - 1e-12) mono = false; prev = h; maxP = Math.max(maxP, h); }
    o.hit = { h25: C.hitChance(25, 0), h50: C.hitChance(100, 100), h55: C.hitChance(55, 0), h100: C.hitChance(100, 0), huge: C.hitChance(1e6, 0), maxP };
    o.hitOk = near(C.hitChance(25, 0), 0.25) && near(C.hitChance(100, 100), 0.5) && C.hitChance(55, 0) < 0.55 && C.hitChance(55, 0) > 0.53 && C.hitChance(100, 0) < 0.6 && C.hitChance(100, 0) > 0.59 && C.hitChance(1e6, 0) <= 0.6 && maxP <= 0.6 && mono
      && Math.abs((C.hitChance(50, 0) - C.hitChance(49.99, 0)) / 0.01 - 0.01) < 1e-5 && Math.abs((C.hitChance(50.01, 0) - C.hitChance(50, 0)) / 0.01 - 0.01) < 1e-5; // slope 0.01 per Acc (1 per 100) just below and just above 50%: no kink (t627u: the old check divided a 0.02-Acc step by 0.0002)
    // damage: hit = full Strength; miss = 0..Strength; heavy blow every 5th swing; boss slayer
    const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
    const st = { str: 10, acc: 1e6 }, hitD = C.rollDamage(st, { rng: seq(0) }), missLo = C.rollDamage({ str: 10, acc: 0 }, { rng: seq(0.99, 0) }), missHi = C.rollDamage({ str: 10, acc: 0 }, { rng: seq(0.99, 0.999) });
    let range = true; for (let i = 0; i < 400; i++) { const d = C.rollDamage({ str: 7, acc: 0 }).dmg; if (d < 0 || d > 7 || d !== Math.floor(d)) range = false; }
    const hb = C.rollDamage({ str: 10, acc: 1e6, heavyBlow: true }, { rng: seq(0), swing: 5 }), hb4 = C.rollDamage({ str: 10, acc: 1e6, heavyBlow: true }, { rng: seq(0), swing: 4 }), bs = C.rollDamage({ str: 100, acc: 1e6, bossDmg: 0.2 }, { rng: seq(0), boss: true });
    o.dmg = [hitD.dmg, missLo.dmg, missHi.dmg, hb.dmg, hb4.dmg, bs.dmg]; o.dmgOk = hitD.hit && hitD.dmg === 10 && !missLo.hit && missLo.dmg === 0 && missHi.dmg === 10 && range && hb.dmg === 15 && hb.heavy && hb4.dmg === 10 && bs.dmg === 120;
    // tree: caps, prerequisites, point budget, removal protecting prerequisites
    const t = fresh(); C.setLevel(300, t); let n = 0; while (C.addPoint('strength', t)) n++; const capS = n === 40 && C.whyNot('strength', t) === 'max';
    const caps = C.NODES.every((nd) => { const q = fresh(); C.setLevel(300, q); if (nd.req) for (const sub of Object.keys(nd.req)) q.skill[sub === 'might' ? 'vigor' : sub === 'vitality' ? 'guard' : sub] = nd.req[sub]; let k = 0; while (C.addPoint(nd.id, q)) k++; return k === nd.max && C.whyNot(nd.id, q) === 'max'; });
    const r = fresh(); C.setLevel(300, r); r.skill = { strength: 19 }; const req19 = C.whyNot('heavy_blow', r) === 'req' && !C.addPoint('boss_slayer', r) && !C.reqMet('boss_slayer', r);
    r.skill.strength = 20; const req20 = C.addPoint('heavy_blow', r) && C.ranks('heavy_blow', r) === 1 && C.pointsSpent(r) === 25 && C.addPoint('boss_slayer', r);
    const guard = !C.canRemove('strength', r) && !C.removePoint('strength', r) && C.addPoint('vigor', r) && C.canRemove('strength', r) && C.removePoint('strength', r) && !C.canRemove('vigor', r) && C.removePoint('boss_slayer', r) && C.removePoint('heavy_blow', r) && C.canRemove('vigor', r);
    const bud = fresh(); C.setLevel(4, bud); const budget = C.pointsTotal(bud) === 4 && C.addPoint('second_wind', bud) && C.pointsLeft(bud) === 1 && C.whyNot('ward', bud) === 'points' && !C.addPoint('quick_mend', bud) && C.addPoint('fortune', bud) && C.pointsLeft(bud) === 0;
    const costs = { heavy_blow: 5, quick_mend: 2, second_wind: 3, victory_breath: 3, ward: 3 }, costOk = Object.entries(costs).every(([k, v]) => C.NODE[k].cost === v && C.NODE[k].max === 1);
    const maxes = { strength: 40, vigor: 50, haste: 15, boss_slayer: 10, lifesteal: 10, fortune: 15, beast_lure: 10 }, maxOk = Object.entries(maxes).every(([k, v]) => C.NODE[k].max === v);
    o.tree = { capS, caps, req19, req20, guard, budget, costOk, maxOk, ids: C.NODES.map((x) => x.id).join(',') };
    { const bl = C.NODE.boss_lure, be = C.NODE.beast_lure, ids = C.NODES.map((x) => x.id), q = fresh(); C.setLevel(300, q); q.skill = { boss_lure: 10 }; const qs = C.playerStats(q, { L: null, R: null });
      o.boss = { ids: ids.slice(-2), node: bl && [bl.name, bl.sub, bl.max, bl.cost, bl.per && bl.per.bossBeastMult], base: C.BOSS_BEAST_BASE, c0: C.bossBeastChance(0.01), c10: C.bossBeastChance(0.01, qs), beast10: C.beastChance(0.01, qs) };
      o.boss.ok = !!bl && ids.indexOf('boss_lure') === ids.indexOf('beast_lure') + 1 && bl.sub === 'spoils' && bl.max === be.max && bl.cost === be.cost && near(bl.per.bossBeastMult, be.per.beastMult / 2) && near(C.BOSS_BEAST_BASE, 0.1) && near(o.boss.c0, 0.001) && near(o.boss.c10, 0.001 * 1.05) && near(o.boss.beast10, 0.01); }
    o.treeOk = capS && caps && req19 && req20 && guard && budget && costOk && maxOk;
    // node effects
    const e = fresh(); C.setLevel(300, e); e.skill = { haste: 15, boss_slayer: 10, lifesteal: 10, quick_mend: 1, fortune: 15, beast_lure: 10, ward: 1 }; const es = C.playerStats(e, { L: null, R: null });
    o.fx = { as: es.atkSpeed, boss: es.bossDmg, ls: es.lifesteal, regen: es.regen, coin: es.coinMult, beast: es.beastMult };
    o.fxOk = near(es.atkSpeed, 1.15) && near(es.bossDmg, 0.2) && near(es.lifesteal, 0.1) && es.regen === 0.04 && b1.regen === 0.02 && near(es.coinMult, 1.3) && near(es.beastMult, 1.1) && near(C.coinDrop(100, es), 130) && near(C.beastChance(0.01, es), 0.011) && near(C.swingTime(1.15, es), 1)
      && C.regenPerSec(es, true) === 0 && near(C.regenPerSec(es, false), 0.04 * es.hp);
    // healing cap: lifesteal + victory breath capped at 15% of max HP per fight; Second wind outside the cap and only once; Ward shield absorbs first
    const hs = { hp: 1000, lifesteal: 0.1, victoryBreath: true, secondWind: true, ward: true }, F = C.newFight(hs);
    const sh = F.shield; C.fightHurt(F, 50); const afterShield = F.hp; C.fightHurt(F, 500); let healed = 0; for (let i = 0; i < 100; i++) healed += C.fightDealt(F, 100); healed += C.fightKill(F) + C.fightKill(F);
    const capHit = near(F.healed, 150) && near(healed, 150); C.fightHurt(F, F.hp - 200); const w1 = F.hp, wind = F.swWind; C.fightHurt(F, 100); const w2 = F.hp;
    o.heal = { sh, afterShield, healed, w1, w2 }; o.healOk = sh === 100 && afterShield === 1000 && capHit && wind && near(w1, 400) && near(w2, 300) && C.fightKill(F) === 0;
    // equip locks
    o.lockOk = C.canEquip('bronze', 1) && C.canEquip('stick', 1) && !C.canEquip('iron', 19) && C.canEquip('iron', 20) && !C.canEquip('gold', 44) && C.canEquip('gold', 45) && !C.canEquip('onyx', 219) && C.canEquip('onyx', 220) && !C.canEquip('lumen', 159) && C.canEquip('rune', 100);
    // levels + migration + save defaults
    const old = { skills: { mining: 0 } }; C.migrate(old); const bad = { combat: { xp: -5 }, skill: { strength: 99, nope: 3, ward: 2.7 } }; C.migrate(bad);
    o.mig = { old, bad }; o.migOk = old.combat.xp === 0 && JSON.stringify(old.skill) === '{}' && C.level(old) === 1 && bad.combat.xp === 0 && bad.skill.strength === 40 && !('nope' in bad.skill) && bad.skill.ward === 1
      && S.combat && typeof S.combat.xp === 'number' && S.skill && typeof S.skill === 'object' && typeof newState === 'function' && newState().combat.xp === 0 && JSON.stringify(newState().skill) === '{}';
    const lv = fresh(); C.addXp(Math.ceil(C.xpTo(20)), lv); o.lvOk = C.level(lv) === 20 && C.setLevel(999, lv) === 300 && C.level(lv) === 300 && C.beastSlots(1) === 1 && C.beastSlots(100) === 2 && C.beastSlots(300) === 3 && C.creature(5) === null && C.BRANCHES[1].stub === true;
    // item inspection shows sword stats + the unlock level
    const gid = 'tool:sword_gold'; let insp = ''; try { insp = JSON.stringify(Craft.itemStats(gid, 1)) + ' ' + Craft.itemBlurb(gid); } catch (err) { insp = 'ERR ' + err.message; }
    o.insp = insp; o.inspOk = /Pair \(L\+R\)/.test(insp) && /Combat Lv 45/.test(insp) && /Str 2\.5/.test(insp);
    C.DEV_POINTS = dev0;
    return o;
  });
  ok(R.tables && R.stickOne && R.unlock, 'grade tables: pair totals at T0, each sword carries half, stick in one spot, unlock levels');
  ok(R.tier, 'tier math: +75% of base per tier (T10 = 8.5x; Onyx T10 pair 136 / 136 / 221); the stick ignores tiers');
  ok(R.defOk, 'GD-15 Defense: Lv/3 (0 at Lv 1, 100 at Lv 300), Guard +2/pt (max 25), Parry 1%/pt (max 10, needs 10 Vitality incl. Guard); creature hit = acc/(def+100) capped 60%, else 0..str; parry blocks fully ' + JSON.stringify(R.def));
  ok(R.baseOk, 'player base: Lv 1 = 1 Str / 11 HP, Lv 300 = 101 Str / 310 HP, no Accuracy without swords ' + JSON.stringify(R.base));
  ok(R.exampleOk, 'Lv 300 + T10 Ember Onyx pair + maxed Might = 277 Str / 681 HP / 136 Acc ' + JSON.stringify(R.example));
  ok(R.hitOk, 'hit chance: Acc / (Def + 100), linear to 50%, eased toward the 60% cap, never past it ' + JSON.stringify(R.hit));
  ok(R.dmgOk, 'damage: a hit deals full Str, a miss 0..Str; Heavy blow 1.5x on every 5th swing; Boss slayer ' + JSON.stringify(R.dmg));
  ok(R.boss && R.boss.ok, 'Boss Lure (t633u): a Spoils node beside Beast lure, same max + cost, half its per-rank bonus; bossBeastChance = base x BOSS_BEAST_BASE (1/10) x Boss Lure ' + JSON.stringify(R.boss));
  ok(R.dev[0] === 300 && R.dev[1] === 300 && R.dev[2] === 4 && R.dev[3] && R.dev[4] === 300 && R.devOff.join() === '0,4' && R.dev[5] === 176 && R.dev[6] === 0, `dev grant (t638u): DEV_POINTS 300 gives 300 points without changing Combat XP / level; set to 0 it's 1 per level again ${JSON.stringify([R.dev, R.devOff])}`);
  ok(R.treeOk, 'skill tree: node caps, costs, 20-in-Might prerequisites, the point budget, removal protects prerequisites ' + JSON.stringify(R.tree));
  ok(R.fxOk, 'node effects: Haste, Boss slayer, Lifesteal, Quick mend regen 4%, Fortune, Beast lure; no regen in combat ' + JSON.stringify(R.fx));
  ok(R.healOk, 'healing: Ward shield 10%, lifesteal + Victory breath capped at 15% of max HP per fight, Second wind once and outside the cap ' + JSON.stringify(R.heal));
  ok(R.lockOk, 'equip locks by Combat level (Iron 20, Gold 45, Rune 100, Lumenite 160, Onyx 220)');
  ok(R.migOk, 'save: new games start at Combat Lv 1 with an empty tree; old saves migrate; bad node data clamps ' + JSON.stringify(R.mig));
  ok(R.lvOk, 'Combat XP / levels (cap 300), Tether Beast party slots at 1 / 100 / 220, creature + Production stubs');
  ok(R.inspOk, 'item inspect: a sword shows its Str / Acc / HP, the pair, and its Combat unlock level ' + R.insp);
  ok(!errs.length, 'no page errors ' + JSON.stringify(errs.slice(0, 3)));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();

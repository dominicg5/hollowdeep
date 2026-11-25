/* Combat stats engine (Dominic's combat + weapon stats design, approved; relayed by Art). Data + pure functions only: no creatures or combat loop exist yet.
   The Skill Tree UI (another worker) reads NODES / BRANCHES / nodeState / canAdd / addPoint / removePoint / pointsLeft from here; every number lives in this file.
   Player: 10 HP + 1 per Combat level, Strength 1 + 1 per 3 levels (Lv 300: 310 HP, 101 Str). Accuracy comes only from the swords. Always two swords (L + R):
   each carries HALF its grade's pair values, so a matched pair sums to the full value. Tiers: +75% of the grade base per tier (T10 = 8.5x). */
const Combat = (() => {
  const LV_MAX = 300, BASE_HP = 10, BASE_STR = 1;
  // pair totals at T0 [Strength, Accuracy, HP]. STICK is still being settled (Dominic): this one line is the place to change it.
  const STICK_PAIR = [2, 2, 0];
  const SWORD_PAIR = { stick: STICK_PAIR, bronze: [2, 2, 2], iron: [3, 3, 4], steel: [4, 4, 6], gold: [5, 5, 8], mithril: [7, 7, 11], rune: [9, 9, 15], lumen: [12, 12, 20], onyx: [16, 16, 26] };
  const SWORD_UNLOCK = { stick: 1, bronze: 1, iron: 20, steel: 30, gold: 45, mithril: 70, rune: 100, lumen: 160, onyx: 220 }; // Combat level to equip
  const TIER_STEP = 0.75, TIER_MAX = 10; // +75% of the grade base per tier, linear: T10 = 8.5x
  const HIT_CAP = 0.6, HIT_EASE = 0.5; // hit chance = acc / (def + 100); linear up to 50%, then eases into the 60% cap
  // (GD-15, Dominic via Art, verified) Defense: +1 per 3 Combat levels (0 at Lv 1, 100 at Lv 300) + the Vitality node Guard (+2 per point). A creature's full-hit
  // chance against her is acc / (her Defense + 100), capped at 60% (the same hitChance curve as hers); otherwise it rolls 0..its Strength. Parry (1% per point)
  // blocks a hit fully before that roll; it is not healing, so it is outside the 15% in-fight healing cap.
  const DEF_PER_LV = 3;
  const REGEN = 0.02, REGEN_MEND = 0.04, HEAL_CAP = 0.15; // out of combat %max HP / s (none in combat); in-fight healing cap (Second wind excluded)
  const GRADES = Object.keys(SWORD_PAIR);
  const clampT = (t) => Math.max(0, Math.min(TIER_MAX, Math.floor(+t || 0)));
  const tierMult = (t) => 1 + TIER_STEP * clampT(t);
  // one grade + tier as a PAIR total (rounded); a single sword is half of it (unrounded halves, so L + R of the same grade sum to the pair exactly)
  function pairStats(g, t) { const b = SWORD_PAIR[g] || SWORD_PAIR.stick, m = g === 'stick' ? 1 : tierMult(t); return { str: b[0] * m, acc: b[1] * m, hp: b[2] * m }; }
  function swordStats(g, t) { const p = pairStats(g, t); return { str: p.str / 2, acc: p.acc / 2, hp: p.hp / 2 }; }
  const r1 = (x) => Math.round(x * 10) / 10, fmt = (s) => ({ str: r1(s.str), acc: r1(s.acc), hp: r1(s.hp) });
  const swordUnlock = (g) => SWORD_UNLOCK[g] || 1;
  const canEquip = (g, lv) => (lv == null ? level() : lv) >= swordUnlock(g);

  // ---- Combat level / XP (S.combat = { xp }) on the shared Skills XP curve, Lv 1..300 ----
  const sv = (s) => s || (typeof S !== 'undefined' ? S : null);
  function migrate(s) { s = sv(s); if (!s) return s; if (!s.combat || typeof s.combat !== 'object') s.combat = { xp: 0 }; s.combat.xp = Math.max(0, Math.floor(+s.combat.xp || 0));
    if (!s.skill || typeof s.skill !== 'object' || Array.isArray(s.skill)) s.skill = {}; for (const k of Object.keys(s.skill)) { const n = NODE[k]; if (!n) { delete s.skill[k]; continue; } s.skill[k] = Math.max(0, Math.min(n.max, Math.floor(+s.skill[k] || 0))); }
    return s; }
  const xpTo = (L) => (typeof Skills !== 'undefined' && Skills.xpToReach ? Skills.xpToReach(L) : (L - 1) * 100);
  function levelFromXp(xp) { if (typeof Skills !== 'undefined' && Skills.levelFromXp) return Math.min(LV_MAX, Skills.levelFromXp(xp)); return Math.min(LV_MAX, 1 + Math.floor((xp || 0) / 100)); }
  function level(s) { s = sv(s); return s && s.combat ? levelFromXp(s.combat.xp) : 1; }
  function addXp(n, s) { s = migrate(s); if (!s) return 1; const b = level(s); s.combat.xp += Math.max(0, Math.floor(+n || 0)); const a = level(s); if (a > b && typeof toast === 'function') toast('⚔️ Combat level ' + a); return a; }
  function setLevel(L, s) { s = migrate(s); if (!s) return; L = Math.max(1, Math.min(LV_MAX, L | 0)); s.combat.xp = Math.ceil(xpTo(L)); return level(s); } // (tests / dev)

  // ---- skill tree: Combat branch (Might / Vitality / Spoils). cost = points per rank; req = { sub: points already in that sub-branch's open (ungated) nodes } ----
  const BRANCHES = [{ id: 'combat', name: 'Combat', subs: [{ id: 'might', name: 'Might' }, { id: 'vitality', name: 'Vitality' }, { id: 'spoils', name: 'Spoils' }] },
    { id: 'production', name: 'Production', subs: [], stub: true }]; // (Production: still to come)
  const NODES = [
    { id: 'strength', branch: 'combat', sub: 'might', name: 'Strength', max: 40, cost: 1, req: null, text: '+1 Strength per point', per: { str: 1 } },
    { id: 'vigor', branch: 'combat', sub: 'might', name: 'Vigor', max: 50, cost: 1, req: null, text: '+3 HP per point', per: { hp: 3 } },
    { id: 'haste', branch: 'combat', sub: 'might', name: 'Haste', max: 15, cost: 1, req: null, text: '+1% attack speed per point', per: { atkSpeed: 0.01 } },
    { id: 'heavy_blow', branch: 'combat', sub: 'might', name: 'Heavy blow', max: 1, cost: 5, req: { might: 20 }, text: 'Every 5th swing deals 1.5x damage (5 points; needs 20 points in Might)', flag: 'heavyBlow' },
    { id: 'boss_slayer', branch: 'combat', sub: 'might', name: 'Boss slayer', max: 10, cost: 1, req: { might: 20 }, text: '+2% damage vs bosses per point (needs 20 points in Might)', per: { bossDmg: 0.02 } },
    { id: 'lifesteal', branch: 'combat', sub: 'vitality', name: 'Lifesteal', max: 10, cost: 1, req: null, text: 'Heal 1% of the damage you deal per point', per: { lifesteal: 0.01 } },
    { id: 'quick_mend', branch: 'combat', sub: 'vitality', name: 'Quick mend', max: 1, cost: 2, req: null, text: 'Out-of-combat regen 2% \u2192 4% max HP per second (2 points)', flag: 'quickMend' },
    { id: 'second_wind', branch: 'combat', sub: 'vitality', name: 'Second wind', max: 1, cost: 3, req: null, text: 'Once per fight, heal 20% HP when you drop below 25% (3 points)', flag: 'secondWind' },
    { id: 'victory_breath', branch: 'combat', sub: 'vitality', name: 'Victory breath', max: 1, cost: 3, req: null, text: 'Heal 5% HP on each kill (3 points)', flag: 'victoryBreath' },
    { id: 'ward', branch: 'combat', sub: 'vitality', name: 'Ward', max: 1, cost: 3, req: null, text: 'Start each fight with a shield of 10% HP (3 points)', flag: 'ward' },
    // (GD-15) Defense nodes: Guard is an open node (it counts toward Parry's 10); Parry blocks a creature's hit fully (not part of the 15% healing cap)
    { id: 'guard', branch: 'combat', sub: 'vitality', name: 'Guard', max: 25, cost: 1, req: null, text: '+2 Defense per point', per: { def: 2 } },
    { id: 'parry', branch: 'combat', sub: 'vitality', name: 'Parry', max: 10, cost: 1, req: { vitality: 10 }, text: '1% per point to block a hit fully (needs 10 points in Vitality)', per: { parry: 0.01 } },
    { id: 'fortune', branch: 'combat', sub: 'spoils', name: 'Fortune', max: 15, cost: 1, req: null, text: '+2% coin drops per point', per: { coinMult: 0.02 } },
    { id: 'beast_lure', branch: 'combat', sub: 'spoils', name: 'Beast lure', max: 10, cost: 1, req: null, text: '+1% tether beast drop chance per point (multiplies each creature\u2019s base chance)', per: { beastMult: 0.01 } },
    // t633u (Dominic): a boss's beast version is much rarer than a normal creature's; until he gives numbers, beast lure's max + cost at half its per-rank bonus
    { id: 'boss_lure', branch: 'combat', sub: 'spoils', name: 'Boss Lure', max: 10, cost: 1, req: null, text: '+0.5% chance per point to capture a boss\u2019s beast version (multiplies its much smaller base chance)', per: { bossBeastMult: 0.005 } },
  ];
  const NODE = Object.fromEntries(NODES.map((n) => [n.id, n]));
  const alloc = (s) => { s = sv(s); return (s && s.skill) || {}; };
  const ranks = (id, s) => Math.max(0, Math.min(NODE[id] ? NODE[id].max : 0, Math.floor(+alloc(s)[id] || 0)));
  const subSpent = (sub, s, except) => NODES.reduce((a, n) => a + (n.sub === sub && n.id !== except ? ranks(n.id, s) * n.cost : 0), 0);
  // what a prerequisite counts: points in the sub-branch's open nodes (the gated nodes don't count toward each other, so no loop can hold them up)
  const reqSpent = (sub, s) => NODES.reduce((a, n) => a + (n.sub === sub && !n.req ? ranks(n.id, s) * n.cost : 0), 0);
  // DEV (t638u, Dominic testing): while DEV_POINTS is on (> 0) every save has that many skill points to spend instead of 1 per Combat level; his Combat XP and
  // level are untouched. Turn it off later by setting it to 0 here (or Combat.DEV_POINTS = 0 at run time).
  let DEV_POINTS = 300;
  const pointsTotal = (s) => (DEV_POINTS > 0 ? DEV_POINTS : level(s)); // 1 skill point per Combat level (unless the dev grant is on)
  const pointsSpent = (s) => NODES.reduce((a, n) => a + ranks(n.id, s) * n.cost, 0);
  const pointsLeft = (s) => pointsTotal(s) - pointsSpent(s);
  // points spent in one branch, and the most that branch can take (the Skill Tree room's tree grows with these; t637u)
  const branchSpent = (b, s) => NODES.reduce((a, n) => a + (n.branch === b ? ranks(n.id, s) * n.cost : 0), 0);
  const branchMax = (b) => NODES.reduce((a, n) => a + (n.branch === b ? n.max * n.cost : 0), 0);
  function reqMet(id, s) { const n = NODE[id]; if (!n || !n.req) return true; return Object.entries(n.req).every(([sub, need]) => reqSpent(sub, s) >= need); }
  // why a point can't go in ('max' | 'points' | 'req' | 'unknown'), or '' when it can
  function whyNot(id, s) { const n = NODE[id]; if (!n) return 'unknown'; if (ranks(id, s) >= n.max) return 'max'; if (!reqMet(id, s)) return 'req'; if (pointsLeft(s) < n.cost) return 'points'; return ''; }
  const canAdd = (id, s) => !whyNot(id, s);
  function addPoint(id, s) { s = migrate(s); if (!s || !canAdd(id, s)) return false; s.skill[id] = ranks(id, s) + 1; if (s === (typeof S !== 'undefined' ? S : null) && typeof save === 'function') save(); return true; }
  // a point comes out only if no node still needs it (taking it would drop a sub-branch below a prerequisite another allocated node relies on)
  function canRemove(id, s) { if (ranks(id, s) <= 0) return false; const n = NODE[id]; if (n.req) return true; return NODES.every((m) => m.id === id || !ranks(m.id, s) || !m.req || !(n.sub in m.req) || reqSpent(n.sub, s) - n.cost >= m.req[n.sub]); }
  function removePoint(id, s) { s = migrate(s); if (!s || !canRemove(id, s)) return false; s.skill[id] = ranks(id, s) - 1; if (!s.skill[id]) delete s.skill[id]; if (s === (typeof S !== 'undefined' ? S : null) && typeof save === 'function') save(); return true; }
  function resetTree(s) { s = migrate(s); if (s) s.skill = {}; }
  // the player's Reset in the Skill Tree (t643u, Dominic): every point back. Free for now - RESET_COST is the one place its price (gold) goes later
  const RESET_COST = 0;
  const canReset = (s) => { s = sv(s); return !!s && pointsSpent(s) > 0 && (RESET_COST <= 0 || (+s.gold || 0) >= RESET_COST); };
  function resetPaid(s) { s = migrate(s); if (!s || !canReset(s)) return 0; const n = pointsSpent(s); if (RESET_COST > 0) s.gold = (+s.gold || 0) - RESET_COST; s.skill = {}; if (s === (typeof S !== 'undefined' ? S : null) && typeof save === 'function') save(); return n; }
  // one node's full state for the tree UI
  function nodeState(id, s) { const n = NODE[id]; if (!n) return null; const r = ranks(id, s), why = whyNot(id, s); return { id, branch: n.branch, sub: n.sub, name: n.name, text: n.text, max: n.max, cost: n.cost, req: n.req, ranks: r, maxed: r >= n.max, reqMet: reqMet(id, s), canAdd: !why, why, canRemove: canRemove(id, s) }; }
  const treeState = (s) => ({ level: level(s), points: pointsTotal(s), spent: pointsSpent(s), left: pointsLeft(s), nodes: NODES.map((n) => nodeState(n.id, s)), subSpent: { might: subSpent('might', s), vitality: subSpent('vitality', s), spoils: subSpent('spoils', s) } });
  // the summed effects of an allocation
  function applyNodes(s) { const e = { str: 0, hp: 0, def: 0, parry: 0, atkSpeed: 0, bossDmg: 0, lifesteal: 0, coinMult: 0, beastMult: 0, bossBeastMult: 0, heavyBlow: false, quickMend: false, secondWind: false, victoryBreath: false, ward: false };
    for (const n of NODES) { const r = ranks(n.id, s); if (!r) continue; if (n.per) for (const [k, v] of Object.entries(n.per)) e[k] += v * r; if (n.flag) e[n.flag] = true; } return e; }

  // ---- player stats: level + both swords + the tree. swords = { L: { g, t }, R: { g, t } } (defaults to her saved swords); a missing hand counts nothing ----
  function equippedSwords(s) { s = sv(s); const o = {}; for (const k of ['L', 'R']) { const g = s && s['sword' + k]; const dt = s && s['swordT' + k]; /* (t629u: Try gear, the dev tool, saves the tier it equipped) */ o[k] = g && SWORD_PAIR[g] ? { g, t: g === 'stick' ? 0 : clampT(dt != null ? dt : s.tswords && s.tswords[g]) } : null; } return o; }
  function playerStats(s, swords, opt) { s = sv(s); const L = (opt && opt.level) || level(s), W = swords || equippedSwords(s), E = applyNodes(s), sw = { str: 0, acc: 0, hp: 0 };
    for (const k of ['L', 'R']) { const h = W[k]; if (!h) continue; const q = swordStats(h.g, h.t); sw.str += q.str; sw.acc += q.acc; sw.hp += q.hp; }
    const str = BASE_STR + Math.floor(L / 3) + sw.str + E.str, hp = BASE_HP + L + sw.hp + E.hp, def = defFromLevel(L) + E.def;
    return { level: L, str: Math.round(str), hp: Math.round(hp), acc: Math.round(sw.acc), def: Math.round(def), parry: Math.min(1, E.parry), atkSpeed: 1 + E.atkSpeed, regen: E.quickMend ? REGEN_MEND : REGEN, regenInCombat: 0,
      lifesteal: E.lifesteal, bossDmg: E.bossDmg, heavyBlow: E.heavyBlow, secondWind: E.secondWind, victoryBreath: E.victoryBreath, ward: E.ward, coinMult: 1 + E.coinMult, beastMult: 1 + E.beastMult, bossBeastMult: 1 + E.bossBeastMult,
      swords: { L: W.L ? Object.assign({ g: W.L.g, t: W.L.t }, swordStats(W.L.g, W.L.t)) : null, R: W.R ? Object.assign({ g: W.R.g, t: W.R.t }, swordStats(W.R.g, W.R.t)) : null, pair: sw } }; }

  // ---- hit + damage ----
  const defFromLevel = (L) => Math.floor(Math.max(1, Math.min(LV_MAX, L | 0)) / DEF_PER_LV); // (Lv 1: 0 · Lv 300: 100)
  function hitChance(acc, def) { const raw = Math.max(0, +acc || 0) / (Math.max(0, +def || 0) + 100); if (raw <= HIT_EASE) return raw; return HIT_CAP - (HIT_CAP - HIT_EASE) * Math.exp(-(raw - HIT_EASE) / (HIT_CAP - HIT_EASE)); } // (C1: slope 1 at 50%, never quite 60%)
  // one swing: a hit deals full Strength, otherwise a random whole value 0..Strength. opt: { def, swing (1-based count this fight), boss, rng }
  function rollDamage(stats, opt = {}) { const rng = opt.rng || Math.random, p = hitChance(stats.acc, opt.def || 0), hit = rng() < p, str = Math.max(0, Math.round(stats.str || 0));
    let dmg = hit ? str : Math.floor(rng() * (str + 1)); let k = 1; if (stats.heavyBlow && opt.swing && opt.swing % 5 === 0) k *= 1.5; if (opt.boss && stats.bossDmg) k *= 1 + stats.bossDmg; dmg = Math.round(dmg * k);
    return { hit, dmg, chance: p, heavy: k > 1 && !!stats.heavyBlow && opt.swing % 5 === 0 }; }
  // (GD-15) a creature's swing at her: c = { str, acc } (its data row), P = her playerStats. Parry first (blocks it fully), then the same hit / graze roll as hers
  function creatureAttack(c, P, opt = {}) { const rng = opt.rng || Math.random, par = Math.max(0, (P && P.parry) || 0); if (par > 0 && rng() < par) return { parried: true, hit: false, dmg: 0, chance: 0 };
    const p = hitChance(c.acc, (P && P.def) || 0), hit = rng() < p, str = Math.max(0, Math.round(+c.str || 0)); return { parried: false, hit, dmg: hit ? str : Math.floor(rng() * (str + 1)), chance: p }; }
  const swingTime = (base, stats) => base / ((stats && stats.atkSpeed) || 1); // seconds per swing at her attack speed

  // ---- one fight's healing / shield bookkeeping (in-fight healing capped at 15% of max HP per fight; Second wind is outside the cap) ----
  function newFight(stats) { const max = stats.hp; return { max, hp: max, shield: stats.ward ? Math.round(max * 0.1) : 0, healed: 0, cap: Math.round(max * HEAL_CAP * 100) / 100, swWind: false, stats, swings: 0 }; }
  function fightHeal(F, amt, kind) { if (F.hp <= 0) return 0; let a = Math.max(0, +amt || 0); if (kind !== 'secondWind') { a = Math.min(a, Math.max(0, F.cap - F.healed)); } a = Math.min(a, F.max - F.hp); if (kind !== 'secondWind') F.healed += a; F.hp += a; return a; }
  function fightDealt(F, dmg) { return F.stats.lifesteal ? fightHeal(F, dmg * F.stats.lifesteal, 'lifesteal') : 0; }
  function fightKill(F) { return F.stats.victoryBreath ? fightHeal(F, F.max * 0.05, 'victory') : 0; }
  function fightHurt(F, dmg) { let d = Math.max(0, +dmg || 0); const s = Math.min(F.shield, d); F.shield -= s; d -= s; F.hp = Math.max(0, F.hp - d); let wind = 0;
    if (F.hp > 0 && F.stats.secondWind && !F.swWind && F.hp < F.max * 0.25) { F.swWind = true; wind = fightHeal(F, F.max * 0.2, 'secondWind'); } return { absorbed: s, taken: d, wind, dead: F.hp <= 0 }; }
  const regenPerSec = (stats, inCombat) => (inCombat ? 0 : stats.regen * stats.hp);
  // spoils
  const coinDrop = (base, stats) => base * ((stats && stats.coinMult) || 1);
  const beastChance = (base, stats) => base * ((stats && stats.beastMult) || 1);
  // a boss's beast version: BOSS_BEAST_BASE x the normal creature's base chance (placeholder 1/10 until Dominic gives numbers), times Boss Lure
  const BOSS_BEAST_BASE = 0.1;
  const bossBeastChance = (base, stats) => base * BOSS_BEAST_BASE * ((stats && stats.bossBeastMult) || 1);

  // ---- still to come (Dominic: stub only, nothing invented) ----
  const creature = (depth) => null; // creature HP / Defense per depth: not designed yet
  const BEAST_SLOT_LEVELS = [1, 100, 220]; // Tether Beast party slots (max 3); the Tether Beast skill itself is still to come
  const beastSlots = (lv) => BEAST_SLOT_LEVELS.filter((q) => (lv == null ? level() : lv) >= q).length;

  return { LV_MAX, BASE_HP, BASE_STR, DEF_PER_LV, defFromLevel, creatureAttack, STICK_PAIR, SWORD_PAIR, SWORD_UNLOCK, TIER_STEP, HIT_CAP, HIT_EASE, REGEN, REGEN_MEND, HEAL_CAP, GRADES, BRANCHES, NODES, NODE, BEAST_SLOT_LEVELS,
    tierMult, pairStats, swordStats, fmt, swordUnlock, canEquip, migrate, level, levelFromXp, addXp, setLevel, xpTo,
    get DEV_POINTS() { return DEV_POINTS; }, set DEV_POINTS(v) { DEV_POINTS = Math.max(0, Math.floor(+v || 0)); },
    ranks, subSpent, reqSpent, pointsTotal, pointsSpent, pointsLeft, branchSpent, branchMax, reqMet, whyNot, canAdd, addPoint, canRemove, removePoint, resetTree, RESET_COST, canReset, resetPaid, nodeState, treeState, applyNodes,
    equippedSwords, playerStats, hitChance, rollDamage, swingTime, newFight, fightHeal, fightDealt, fightKill, fightHurt, regenPerSec, coinDrop, beastChance, BOSS_BEAST_BASE, bossBeastChance, creature, beastSlots };
})();

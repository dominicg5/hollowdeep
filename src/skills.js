/* Mining and Smithing: one shared XP curve, no max level (Lv 300 is the practical ceiling).
   Numbers follow /workspace/mining_design/v7.py. Post-120 growth is a PLACEHOLDER (Dominic hasn't decided). */
const Skills = (() => {
  const SKILL_XP_SCALE = 5.55;
  // PLACEHOLDER: Dominic hasn't decided growth after Lv 120. Each level currently costs 3% more than the previous.
  const SKILL_POST_120_GROWTH = 1.03;
  const SKILL_SHOW_CEILING = 300;
  const LEVEL_SPEED_K = 0.005; // ore/h × (1 + K × levels above that ore's unlock), uncapped
  const DRILL_RATE_DIV = 3; // each drill mines (and earns XP) at 1/3 of the character on the same ore
  const SWING_S = 1.7, ON_TASK = 0.85, SWING_BONUS = 0.15, YIELD_PER_TIER = 0.02;
  const SKILL_XP_MAX = Number.MAX_SAFE_INTEGER;
  // Slot 1 (Mining 5) is also tied to Tess's drill quest if a quest system exists; there is none, so it is just the level.
  const DRILL_SLOT_LEVELS = [5, 10, 20, 35, 50, 65, 75, 85, 90];
  const NAMES = { mining: 'Mining', smithing: 'Smithing' };

  const ORES = {
    copper: { name: 'Copper', unlock: 1, xp: 10, yield: 0.35 },
    tin: { name: 'Tin', unlock: 1, xp: 10, yield: 0.35 },
    coal: { name: 'Coal', unlock: 10, xp: 18, yield: 0.28 },
    iron: { name: 'Iron', unlock: 20, xp: 25, yield: 0.24 },
    gold: { name: 'Gold', unlock: 35, xp: 45, yield: 0.17 },
    mithril: { name: 'Mithril', unlock: 50, xp: 80, yield: 0.12 },
    runite: { name: 'Runite', unlock: 65, xp: 125, yield: 0.08 },
    lumenite: { name: 'Lumenite', unlock: 95, xp: 180, yield: 0.055 },
    onyx: { name: 'Ember Onyx', unlock: 120, xp: 350, yield: 0.035 }
  };
  // Best-ore search matches v7.py (Tin shares Copper's numbers and is omitted there).
  const ORE_ORDER = ['copper', 'coal', 'iron', 'gold', 'mithril', 'runite', 'lumenite', 'onyx'];
  const BAR_LEVELS = { bronze: 1, iron: 20, steel: 25, gold: 40, mithril: 55, rune: 70, lumen: 100, onyx: 125 };
  const SMELT_XP = { bronze: 12, iron: 30, steel: 55, gold: 135, mithril: 370, rune: 870, lumen: 1995, onyx: 6075 };
  const ANVIL_XP = { bronze: 18, iron: 45, steel: 80, gold: 205, mithril: 555, rune: 1310, lumen: 2990, onyx: 9110 };
  const TOOL_OFFSETS = { tlink: 0, climb: 2, pick: 3, bit: 5, lifeline: 7 }; // make level = bar + offset; lifeline is the Ledge Tether
  const PICK_USE_LEVELS = [1, 10, 20, 35, 50, 65, 95, 120]; // Mining level to use a pick/bit of that tier (table only; current gating is unchanged)
  const BIT_KEYS = ['bronze', 'iron', 'steel', 'gold', 'mithril', 'rune', 'lumen', 'onyx'];

  function clampXp(x) { if (typeof x !== 'number' || !isFinite(x) || x < 0) return 0; return x > SKILL_XP_MAX ? SKILL_XP_MAX : x; }

  // Total XP needed to reach level L (level 1 is 0). L ≤ 120 uses the 5.55× curve; past 120 uses SKILL_POST_120_GROWTH.
  function xpToReach(L) {
    L = +L;
    if (!(L > 1) || !isFinite(L)) return 0;
    const T = (lv) => SKILL_XP_SCALE * (1200 * (Math.pow(1.1, lv - 1) - 1) + 180 * (lv - 1));
    if (L <= 120) return T(L);
    const D = T(120) - T(119), G = SKILL_POST_120_GROWTH, n = L - 120;
    if (G === 1) return T(120) + D * n;
    // log-safe: if G^n would overflow, clamp (the 3% placeholder stays inside MAX_SAFE_INTEGER past 300)
    const ln = n * Math.log(G);
    if (!isFinite(ln) || ln > 700) return SKILL_XP_MAX;
    const add = D * G * (Math.exp(ln) - 1) / (G - 1);
    return clampXp(T(120) + add);
  }
  function xpForLevel(L) { // cost to go from L to L+1
    if (L < 1) return xpToReach(2);
    return clampXp(xpToReach(L + 1) - xpToReach(L));
  }
  function levelFromXp(xp) {
    xp = clampXp(xp);
    if (xp < xpToReach(2)) return 1;
    // no max level: binary search up to a range that still fits in a safe number
    let lo = 1, hi = 2;
    while (hi < 1e6 && xpToReach(hi) <= xp) { lo = hi; hi = Math.min(hi * 2, lo + 1e5); if (xpToReach(hi) >= SKILL_XP_MAX && xp >= SKILL_XP_MAX) return hi; }
    while (lo + 1 < hi) { const mid = (lo + hi) >> 1; if (xpToReach(mid) <= xp) lo = mid; else hi = mid; }
    return lo;
  }

  function migrate(s) {
    s = s || (typeof S !== 'undefined' ? S : null);
    if (!s) return s;
    if (!s.skills || typeof s.skills !== 'object') s.skills = { mining: 0, smithing: 0 };
    s.skills.mining = clampXp(s.skills.mining);
    s.skills.smithing = clampXp(s.skills.smithing);
    return s;
  }
  function xpOf(skill) { migrate(); return (typeof S !== 'undefined' && S && S.skills && S.skills[skill]) || 0; }
  function level(skill) { return levelFromXp(xpOf(skill)); }
  function addXp(skill, amount) {
    migrate();
    if (!S.skills || (skill !== 'mining' && skill !== 'smithing')) return 0;
    const n = clampXp(Number(amount) || 0); if (n <= 0) return level(skill);
    const before = level(skill);
    S.skills[skill] = clampXp(S.skills[skill] + n);
    const after = level(skill);
    if (after > before && typeof toast === 'function') toast((skill === 'mining' ? '⛏ ' : '⚒️ ') + NAMES[skill] + ' level ' + after);
    return after;
  }

  function oreOf(id) { return ORES[id] || null; }
  function oreUnlock(id) { return (ORES[id] && ORES[id].unlock) || 1; }
  function oreXp(id) { return (ORES[id] && ORES[id].xp) || 0; }
  function yieldChance(id, pickTier) { const o = ORES[id]; if (!o) return 0; const t = Math.max(0, pickTier || 0); return o.yield + YIELD_PER_TIER * t; }
  // levels above unlock; no penalty below (hard vs soft gates are unchanged — this is only the speed bonus).
  function levelSpeedBonus(miningLevel, unlock) { return 1 + LEVEL_SPEED_K * Math.max(0, (miningLevel || 1) - (unlock || 1)); }
  function swingBonus(pickTier) { const t = Math.max(0, pickTier || 0); return 1 + SWING_BONUS * t / 7; }
  // Official character ore/h (v7 act() on one ore): swing × on-task × yield × level bonus. Used by drills and pacing.
  function characterOrePerHour(oreId, pickTier, miningLevel, opt) {
    const o = ORES[oreId]; if (!o) return 0;
    const onTask = opt && opt.onTask != null ? opt.onTask : ON_TASK;
    const L = miningLevel == null ? 1 : miningLevel;
    return (3600 / SWING_S) * swingBonus(pickTier) * onTask * yieldChance(oreId, pickTier) * levelSpeedBonus(L, o.unlock);
  }
  function drillOrePerHour(oreId, bitTier, miningLevel, opt) { return characterOrePerHour(oreId, bitTier, miningLevel, opt) / DRILL_RATE_DIV; }
  // Full character XP/h, active or AFK — there is no idle throttle and no input timeout.
  function characterXpPerHour(oreId, pickTier, miningLevel, opt) {
    return characterOrePerHour(oreId, pickTier, miningLevel, opt) * oreXp(oreId);
  }
  function drillXpPerHour(oreId, bitTier, miningLevel, opt) { return characterXpPerHour(oreId, bitTier, miningLevel, opt) / DRILL_RATE_DIV; }

  function bestPickTier(miningLevel) {
    let t = 0; for (let i = 0; i < ORE_ORDER.length; i++) if ((ORES[ORE_ORDER[i]].unlock) <= miningLevel) t = i; return t;
  }
  function bestAct(miningLevel) {
    const t = bestPickTier(miningLevel);
    let best = null;
    for (const id of ORE_ORDER) {
      if (ORES[id].unlock > miningLevel) continue;
      const oreH = characterOrePerHour(id, t, miningLevel), xpH = oreH * ORES[id].xp;
      if (!best || xpH > best.xpH) best = { id, oreH, xpH };
    }
    return best || { id: 'copper', oreH: 0, xpH: 0 };
  }
  function tessDrillQuestDone() {
    if (typeof Quests !== 'undefined' && Quests && typeof Quests.tessDrillDone === 'function') return !!Quests.tessDrillDone();
    return true;
  }
  function slotsUnlocked(miningLevel) {
    if (miningLevel == null) miningLevel = level('mining');
    let n = 0;
    for (let i = 0; i < DRILL_SLOT_LEVELS.length; i++) {
      if (miningLevel < DRILL_SLOT_LEVELS[i]) break;
      if (i === 0 && !tessDrillQuestDone()) continue;
      n++;
    }
    return n;
  }
  function nextSlotLevel(miningLevel) {
    if (miningLevel == null) miningLevel = level('mining');
    const have = slotsUnlocked(miningLevel);
    return have >= DRILL_SLOT_LEVELS.length ? null : DRILL_SLOT_LEVELS[have];
  }
  // v7 hours() on the decided slot table: time from a new character at max rate (character + all unlocked drills).
  function hoursToLevel(target, opt) {
    const f = (L) => { const a = bestAct(L); return a.xpH * (1 + slotsUnlocked(L) / DRILL_RATE_DIV); };
    let h = 0; const to = Math.max(1, target || 1);
    for (let L = 1; L < to; L++) { const r = f(L); if (r > 0) h += xpForLevel(L) / r; }
    return h;
  }

  function bitTier(k) { const i = BIT_KEYS.indexOf(k); return i < 0 ? 0 : i; }
  function pickTierFromGrade(grade) {
    if (grade === 'stick' || grade == null) return 0; // stickaxe: same swing as bronze in char3d (tier < 1 → 0)
    const i = BIT_KEYS.indexOf(grade); return i < 0 ? 0 : i;
  }
  function equippedPickTier() { return pickTierFromGrade(typeof S !== 'undefined' && S && S.pickGrade); }

  function awardMine(oreId, n) { n = n || 0; if (n <= 0) return; addXp('mining', oreXp(oreId) * n); }
  function awardCraft(r, count) {
    if (!r || !count) return;
    const out = r.out || '', bar = out.indexOf('ingot:') === 0 ? out.slice(6) : null;
    if (bar && SMELT_XP[bar] != null) { addXp('smithing', SMELT_XP[bar] * count); return; }
    // anvil: XP = ingots used × anvil XP per ingot of that bar
    let xp = 0;
    if (r.in) for (const k in r.in) if (k.indexOf('ingot:') === 0) { const b = k.slice(6); if (ANVIL_XP[b] != null) xp += ANVIL_XP[b] * r.in[k]; }
    if (xp) addXp('smithing', xp * count);
  }

  function fmtXp(n) {
    n = Math.floor(clampXp(n) + 1e-9);
    if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e4) return (n / 1e3).toFixed(1) + 'k';
    return String(n);
  }
  function skillLine(skill) {
    const L = level(skill), xp = xpOf(skill), a = xpToReach(L), b = xpToReach(L + 1);
    return NAMES[skill] + ' ' + L + ' · ' + fmtXp(xp - a) + ' / ' + fmtXp(b - a) + ' XP';
  }
  function uiLine() { return skillLine('mining') + ' · ' + skillLine('smithing'); }

  function hopperHours(oreId, bitTier, miningLevel) {
    const r = drillOrePerHour(oreId, bitTier, miningLevel); return r > 0 ? 300 / r : Infinity;
  }

  return {
    SKILL_XP_SCALE, SKILL_POST_120_GROWTH, SKILL_SHOW_CEILING, LEVEL_SPEED_K, DRILL_RATE_DIV, SWING_S, ON_TASK,
    YIELD_PER_TIER, SKILL_XP_MAX, DRILL_SLOT_LEVELS, ORES, ORE_ORDER, BAR_LEVELS, SMELT_XP, ANVIL_XP, TOOL_OFFSETS,
    PICK_USE_LEVELS, INPUT_TIMEOUT_MS: 0, // no 60 s input timeout; character XP is the same active or AFK
    clampXp, xpToReach, xpForLevel, levelFromXp, migrate, xp: xpOf, level, addXp, oreOf, oreUnlock, oreXp,
    yieldChance, levelSpeedBonus, swingBonus, characterOrePerHour, drillOrePerHour, characterXpPerHour, drillXpPerHour,
    bestPickTier, bestAct, tessDrillQuestDone, slotsUnlocked, nextSlotLevel, hoursToLevel, bitTier, pickTierFromGrade,
    equippedPickTier, awardMine, awardCraft, fmtXp, skillLine, uiLine, hopperHours, NAMES
  };
})();

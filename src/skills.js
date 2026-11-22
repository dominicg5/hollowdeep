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

  const BAR_NAMES = { bronze: 'Bronze', iron: 'Iron', steel: 'Steel', gold: 'Gold', mithril: 'Mithril', rune: 'Rune', lumen: 'Lumen', onyx: 'Ember Onyx' };
  const UNLOCK_ORES = ['copper', 'tin', 'coal', 'iron', 'gold', 'mithril', 'runite', 'lumenite', 'onyx'];
  const SKILL_ICONS = { mining: 'tool:pick_mithril', smithing: 'ingot:steel' };
  const itemSrc = (id) => id ? 'assets/ui/items/' + String(id).replace(/:/g, '__') + '.png' : 'assets/ui/items/map_drill.png';

  // Soonest unlock above L. Mining: ores + drill slots (ore wins a tie). If the soonest is not an ore, also return the next ore as "then".
  function nextUnlock(skill, L) {
    if (L == null) L = level(skill);
    const cand = [];
    if (skill === 'mining') {
      for (const id of UNLOCK_ORES) { const o = ORES[id]; if (o && o.unlock > L) cand.push({ level: o.unlock, kind: 'ore', name: o.name + ' ore', id: 'ore:' + id }); }
      DRILL_SLOT_LEVELS.forEach((lv, i) => { if (lv > L) cand.push({ level: lv, kind: 'slot', name: 'Drill slot ' + (i + 1), id: null }); });
    } else {
      for (const k in BAR_LEVELS) if (BAR_LEVELS[k] > L) cand.push({ level: BAR_LEVELS[k], kind: 'bar', name: (BAR_NAMES[k] || k) + ' bar', id: 'ingot:' + k });
    }
    cand.sort((a, b) => a.level - b.level || (a.kind === 'ore' ? 0 : 1) - (b.kind === 'ore' ? 0 : 1));
    const next = cand[0] || null, then = (skill === 'mining' && next && next.kind !== 'ore') ? (cand.find((x) => x.kind === 'ore') || null) : null;
    return { next, then };
  }
  function skillState(skill) {
    const L = level(skill), xp = xpOf(skill), a = xpToReach(L), b = xpToReach(L + 1), need = Math.max(0, b - a), into = Math.max(0, xp - a);
    const pct = need > 0 ? Math.round((100 * into) / need) : 100, u = nextUnlock(skill, L);
    return { skill, name: NAMES[skill], icon: SKILL_ICONS[skill], level: L, xp, into, need, pct, total: xp, next: u.next, then: u.then };
  }

  // Detail screen: stand gates and milestone perks are Page proposals, so this list only uses tables already in Skills.
  const TYPE_ORDER = { ore: 0, bar: 0, slot: 1, use: 2, make: 2 };
  const TYPE_TAG = { ore: 'ORE', bar: 'BAR', slot: 'DRILL SLOT', use: 'TOOL USE', make: 'TOOL MAKE' };
  const TOOL_MAKE = [
    { key: 'tlink', name: 'tether links', icon: (k) => 'tool:links_' + k },
    { key: 'climb', name: 'climbing picks', icon: (k) => 'tool:climb_' + k },
    { key: 'pick', name: 'pickaxe', icon: (k) => 'tool:pick_' + k },
    { key: 'bit', name: 'drill bit', icon: () => 'tool:bit' },
    { key: 'lifeline', name: 'Ledge Tether', icon: (k) => 'tool:tether_' + k }
  ];
  const PRIZE = {
    mining: { 95: 'THE LUMENITE WALL', 120: 'EMBER ONYX · MASTER OF THE SEAM' },
    smithing: { 100: 'LUMEN BARS', 125: 'EMBER ONYX BARS · MASTER SMITH' }
  };

  function unlockEntries(skill) {
    const E = [];
    if (skill === 'mining') {
      for (const id of UNLOCK_ORES) { const o = ORES[id]; if (o) E.push({ level: o.unlock, kind: 'ore', name: o.name + ' ore', id: 'ore:' + id }); }
      DRILL_SLOT_LEVELS.forEach((lv, i) => {
        E.push({ level: lv, kind: 'slot', name: 'Drill slot ' + (i + 1) + (i === DRILL_SLOT_LEVELS.length - 1 ? ' · all ' + DRILL_SLOT_LEVELS.length : ''), id: null });
      });
      PICK_USE_LEVELS.forEach((lv, i) => {
        const k = BIT_KEYS[i]; if (!k) return;
        E.push({ level: lv, kind: 'use', name: (BAR_NAMES[k] || k) + ' pick & bit', id: 'tool:pick_' + k });
      });
    } else {
      for (const k of BIT_KEYS) {
        const lv = BAR_LEVELS[k]; if (lv == null) continue;
        const tn = BAR_NAMES[k] || k;
        E.push({ level: lv, kind: 'bar', name: tn + ' bar', id: 'ingot:' + k });
        TOOL_MAKE.forEach((t) => {
          const off = TOOL_OFFSETS[t.key]; if (off == null) return;
          const nm = t.key === 'lifeline' ? tn + ' Ledge Tether' : tn + ' ' + t.name;
          E.push({ level: lv + off, kind: 'make', name: nm, id: t.icon(k) });
        });
      }
    }
    E.sort((a, b) => a.level - b.level || (TYPE_ORDER[a.kind] - TYPE_ORDER[b.kind]) || a.name.localeCompare(b.name));
    return E;
  }
  function groupedUnlocks(skill) {
    const g = [];
    let cur = null;
    for (const e of unlockEntries(skill)) {
      if (!cur || cur.level !== e.level) { cur = { level: e.level, entries: [] }; g.push(cur); }
      cur.entries.push(e);
    }
    return g;
  }

  let onDetail = null, detailSkill = null;
  const ui = { on: false, pin: null, view: 'list', detail: 'mining', listPos: { mining: 0, smithing: 0 }, hist: false };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function pinSkillsScroll(on) {
    document.documentElement.classList.toggle('skills-open', !!on);
    const pin = () => { if (window.scrollX || window.scrollY) window.scrollTo(0, 0); };
    if (ui.pin) { window.removeEventListener('scroll', ui.pin); ui.pin = null; }
    pin(); if (on) window.addEventListener('scroll', ui.pin = pin, { passive: true });
  }
  function chipHTML(st) {
    if (!st.next) return `<div class="skChip skChipDone"><span class="skChipLab">NEXT UNLOCK</span><span class="skChipName">All unlocks reached</span></div>`;
    const ico = (u, cls) => `<i class="skChipIco ${cls || ''}" style="background-image:url(${itemSrc(u.id)})"></i>`;
    return `<div class="skChip${st.then ? ' skHasThen' : ''}">${ico(st.next)}<div class="skChipBody"><span class="skChipLab">NEXT UNLOCK</span><span class="skChipName">${esc(st.next.name)} · Lv ${st.next.level}</span>`
      + (st.then ? `<span class="skChipThen">${ico(st.then, 'skThenIco')} then ${esc(st.then.name)} · Lv ${st.then.level}</span>` : '')
      + `</div></div>`;
  }
  function rowHTML(st) {
    return `<article class="skRow" data-sk="${st.skill}"><button type="button" class="skIco" data-sk-detail="${st.skill}" aria-label="${esc(st.name)} details"><img src="${itemSrc(st.icon)}" alt=""></button>`
      + `<div class="skId"><button type="button" class="skName" data-sk-detail="${st.skill}">${esc(st.name)}</button><div class="skTotalMob">Total ${fmtXp(st.total)} XP</div>`
      + `<div class="skMedal" aria-label="Level ${st.level}"><small>LV</small><b>${st.level}</b></div></div>`
      + `<div class="skProg"><div class="skBar skBar-${st.skill}"><i style="width:${Math.max(0, Math.min(100, st.pct))}%"></i></div>`
      + `<div class="skProgMeta"><span>${fmtXp(st.into)} / ${fmtXp(st.need)} XP</span><span class="skPctDesk">${st.pct}%</span><span class="skPctMob">${st.pct}% to Lv ${st.level + 1}</span></div></div>`
      + `<div class="skTotal"><b>${fmtXp(st.total)}</b><small>XP</small></div>`
      + chipHTML(st) + `</article>`;
  }
  function lockHTML() {
    return `<article class="skRow skLock" aria-disabled="true"><div class="skIco skLockIco" aria-hidden="true"><img src="assets/ui/icons/btn_locked_idle.webp" alt=""></div>`
      + `<div class="skId"><div class="skName">Future skill</div><div class="skSub"><span class="skLockDesk">Locked · reserved</span><span class="skLockMob">Locked · empty row reserved</span></div></div>`
      + `<div class="skProg"><div class="skBar skBar-empty"></div></div><div class="skTotal"><b>—</b></div></article>`;
  }
  function capsHTML() {
    return `<div class="skCap skCapTL"></div><div class="skCap skCapTR"></div><div class="skCap skCapBL"></div><div class="skCap skCapBR"></div>`;
  }
  function sheetHTML() {
    return capsHTML()
      + `<div class="skHead"><h2>Skills</h2><span class="skTag">Mining &amp; Smithing</span><button type="button" class="kX skClose" data-sk="close" aria-label="Close">✕</button></div>`
      + `<div class="skCols"><span>LEVEL</span><span>PROGRESS TO NEXT LEVEL</span><span>TOTAL XP</span><span>NEXT UNLOCK</span></div>`
      + `<div class="skList">${rowHTML(skillState('mining'))}${rowHTML(skillState('smithing'))}${lockHTML()}${lockHTML()}</div>`
      + `<div class="skFootBar"><div class="skFoot"><span class="skFootDesk">Levels have no cap · XP is shared by you and your drills</span><span class="skFootMob">Levels have no cap · drills earn XP too</span></div></div>`;
  }
  function medalHTML(L) {
    return `<div class="skMedal" aria-label="Level ${L}"><small>LV</small><b>${L}</b></div>`;
  }
  function cardHTML(e, st, prize) {
    return `<article class="skCard skCard-${st}${prize ? ' skCardPrize' : ''}"><i class="skCardIco" style="background-image:url(${itemSrc(e.id)})"></i>`
      + `<span class="skCardTag skCardTag-${e.kind}">${TYPE_TAG[e.kind] || e.kind}</span>`
      + `<span class="skCardName">${esc(e.name)}</span><i class="skCardMark" aria-hidden="true"></i></article>`;
  }
  function detailHTML(skill) {
    skill = skill === 'smithing' ? 'smithing' : 'mining';
    const st = skillState(skill), groups = groupedUnlocks(skill), L = st.level;
    const nextLv = (groups.find((g) => g.level > L) || {}).level;
    const prizeOf = (lv) => PRIZE[skill] && PRIZE[skill][lv];
    const stateOf = (lv) => lv <= L ? 'done' : (lv === nextLv ? 'next' : 'locked');
    let body = '', here = false;
    for (const g of groups) {
      if (!here && g.level > L) {
        body += `<div class="skHere" id="skHere"><span>You are here · Lv ${L}</span></div>`;
        here = true;
      }
      const pr = prizeOf(g.level), gst = stateOf(g.level);
      if (pr) body += `<div class="skPrize skPrize-${(g.level === 95 || g.level === 100) ? 'lumen' : 'ember'}"><span>—  ${esc(pr)}  —</span></div>`;
      const go = gst === 'next' ? (g.level - L === 1 ? '1 level to go' : (g.level - L) + ' levels to go') : '';
      body += `<section class="skGroup skGroup-${gst}${pr ? ' skGroupPrize' : ''}" data-lv="${g.level}">`
        + `<div class="skTl">${medalHTML(g.level)}${go ? `<small class="skToGo">${go}</small>` : ''}</div>`
        + `<div class="skEntries">${g.entries.map((e) => cardHTML(e, gst, pr)).join('')}</div></section>`;
    }
    if (!here) body += `<div class="skHere" id="skHere"><span>You are here · Lv ${L}</span></div>`;
    const end = skill === 'mining'
      ? ['Levels keep going past 120 — there is no cap.', 'The speed bonus keeps growing: +0.5% speed per level above each ore\'s unlock (×1.40 on Ember Onyx at Lv 200, ×1.90 at 300).']
      : ['Levels keep going past 125 — there is no cap.', 'Further prestige rewards are proposals; there are no extra drill slots.'];
    body += `<div class="skEndNote"><b>${esc(end[0])}</b><span>${esc(end[1])}</span></div>`;
    const foot = skill === 'mining' ? '120+ · No level cap · speed bonus keeps growing' : 'No level cap · bar &amp; tool milestones continue';
    return capsHTML()
      + `<div class="skDetHead"><button type="button" class="kX skBack back" data-sk="back" aria-label="Back"></button>`
      + `<h2>${esc(st.name)} unlocks</h2>`
      + `<div class="skTabs"><button type="button" data-sk-tab="mining"${skill === 'mining' ? ' class="on"' : ''}>Mining</button>`
      + `<button type="button" data-sk-tab="smithing"${skill === 'smithing' ? ' class="on"' : ''}>Smithing</button></div>`
      + `<button type="button" class="kX skClose" data-sk="close" aria-label="Close">✕</button></div>`
      + `<div class="skSum"><div class="skIco" aria-hidden="true"><img src="${itemSrc(st.icon)}" alt=""></div>`
      + `<div class="skSumId"><div class="skName">${esc(st.name)}</div><div class="skSumMeta"><span>Total ${fmtXp(st.total)} XP</span><span>${fmtXp(st.into)} / ${fmtXp(st.need)} XP · ${st.pct}%</span></div>`
      + `<div class="skBar skBar-${st.skill}"><i style="width:${Math.max(0, Math.min(100, st.pct))}%"></i></div></div>`
      + medalHTML(st.level) + `</div>`
      + `<div class="skUnlocks" data-sk-list="${skill}">${body}</div>`
      + `<div class="skFootBar"><div class="skFoot skDetFoot">${foot}</div></div>`;
  }
  function sheetEl() { return document.getElementById('skillsSheet'); }
  function saveListPos() {
    const list = sheetEl() && sheetEl().querySelector('.skUnlocks');
    if (list && ui.detail) ui.listPos[ui.detail] = list.scrollTop;
  }
  function applyFades() {
    const list = sheetEl() && sheetEl().querySelector('.skUnlocks'); if (!list) return;
    const top = list.scrollTop, max = Math.max(0, list.scrollHeight - list.clientHeight);
    list.classList.toggle('atTop', top <= 1);
    list.classList.toggle('atBot', top >= max - 1);
  }
  function scrollToHere() {
    const list = sheetEl() && sheetEl().querySelector('.skUnlocks'); if (!list) return;
    const saved = ui.listPos[ui.detail];
    if (typeof saved === 'number' && saved > 0) { list.scrollTop = saved; applyFades(); return; }
    const here = list.querySelector('#skHere');
    if (here) list.scrollTop = Math.max(0, here.offsetTop - Math.min(140, list.clientHeight * 0.32));
    applyFades();
  }
  function render() {
    const el = sheetEl(); if (!el) return;
    el.classList.toggle('on', !!ui.on);
    el.classList.toggle('skView-detail', !!(ui.on && ui.view === 'detail'));
    el.classList.toggle('skView-list', !!(ui.on && ui.view !== 'detail'));
    el.innerHTML = ui.on ? (ui.view === 'detail' ? detailHTML(ui.detail) : sheetHTML()) : '';
    if (ui.on && ui.view === 'detail') requestAnimationFrame(scrollToHere);
  }
  function showList() {
    if (ui.view === 'detail') saveListPos();
    ui.view = 'list';
    dropHist();
    render();
  }
  function showDetail(skill) {
    skill = skill === 'smithing' ? 'smithing' : 'mining';
    if (ui.view === 'detail') saveListPos();
    ui.view = 'detail'; ui.detail = skill; detailSkill = skill;
    render();
    pushHist();
  }
  function pushHist() {
    if (ui.hist) return;
    try { history.pushState({ hdSkills: 'detail' }, ''); ui.hist = true; } catch (e) {}
  }
  function dropHist() {
    if (!ui.hist) return;
    ui.hist = false;
    try { history.back(); } catch (e) {}
  }
  function onPopState() {
    if (!ui.hist) return;
    ui.hist = false;
    if (ui.on && ui.view === 'detail') { saveListPos(); ui.view = 'list'; render(); }
  }
  function onKey(e) {
    if (!ui.on || e.key !== 'Escape') return;
    e.preventDefault();
    if (ui.view === 'detail') showList(); else screen(false);
  }
  function openDetail(skill) {
    skill = skill === 'smithing' ? 'smithing' : 'mining';
    detailSkill = skill;
    if (typeof onDetail === 'function') onDetail(skill);
    if (!ui.on) screen(true);
    showDetail(skill);
    return skill;
  }
  function bindSheet(el) {
    el.addEventListener('wheel', (e) => {
      const list = e.target.closest('.skUnlocks');
      if (list) {
        const atTop = list.scrollTop <= 0 && e.deltaY < 0, atBot = list.scrollTop + list.clientHeight >= list.scrollHeight - 1 && e.deltaY > 0;
        if (atTop || atBot) e.preventDefault();
      } else e.preventDefault();
    }, { passive: false });
    el.addEventListener('touchmove', (e) => {
      if (!e.target.closest('.skUnlocks')) e.preventDefault();
    }, { passive: false });
    el.addEventListener('scroll', (e) => { if (e.target && e.target.classList && e.target.classList.contains('skUnlocks')) applyFades(); }, true);
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-sk=close]')) { screen(false); return; }
      if (e.target.closest('[data-sk=back]')) { showList(); return; }
      const tab = e.target.closest('[data-sk-tab]');
      if (tab) { showDetail(tab.getAttribute('data-sk-tab')); return; }
      const ico = e.target.closest('[data-sk-detail]');
      if (ico) { e.preventDefault(); openDetail(ico.getAttribute('data-sk-detail')); }
    });
  }

  function screenOn() { return !!ui.on; }
  function screen(on) {
    if (on !== true && on !== false) on = !ui.on;
    let el = sheetEl();
    if (!el && on) {
      el = document.createElement('div'); el.id = 'skillsSheet'; el.className = 'kLeather kKit';
      el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Skills');
      (document.getElementById('cityWrap') || document.body).appendChild(el); bindSheet(el);
    }
    if (!el) return false;
    if (on && typeof Craft !== 'undefined' && Craft.sheetOn && Craft.sheetOn()) Craft.sheet(false);
    const was = ui.on;
    ui.on = !!on;
    if (!on) { saveListPos(); ui.view = 'list'; dropHist(); }
    pinSkillsScroll(!!on);
    if (on && !was) { document.addEventListener('keydown', onKey); window.addEventListener('popstate', onPopState); }
    if (!on && was) { document.removeEventListener('keydown', onKey); window.removeEventListener('popstate', onPopState); }
    render();
    const b = document.getElementById('exSkillsBtn'); if (b) b.classList.toggle('sel', !!on);
    return !!on;
  }

  return {
    SKILL_XP_SCALE, SKILL_POST_120_GROWTH, SKILL_SHOW_CEILING, LEVEL_SPEED_K, DRILL_RATE_DIV, SWING_S, ON_TASK,
    YIELD_PER_TIER, SKILL_XP_MAX, DRILL_SLOT_LEVELS, ORES, ORE_ORDER, BAR_LEVELS, BAR_NAMES, UNLOCK_ORES, SKILL_ICONS, SMELT_XP, ANVIL_XP, TOOL_OFFSETS,
    PICK_USE_LEVELS, INPUT_TIMEOUT_MS: 0, // no 60 s input timeout; character XP is the same active or AFK
    clampXp, xpToReach, xpForLevel, levelFromXp, migrate, xp: xpOf, level, addXp, oreOf, oreUnlock, oreXp,
    yieldChance, levelSpeedBonus, swingBonus, characterOrePerHour, drillOrePerHour, characterXpPerHour, drillXpPerHour,
    bestPickTier, bestAct, tessDrillQuestDone, slotsUnlocked, nextSlotLevel, hoursToLevel, bitTier, pickTierFromGrade,
    equippedPickTier, awardMine, awardCraft, fmtXp, skillLine, uiLine, hopperHours, NAMES,
    nextUnlock, skillState, itemSrc, unlockEntries, openDetail,
    get onDetail() { return onDetail; }, set onDetail(fn) { onDetail = fn; },
    get detailSkill() { return detailSkill; },
    get view() { return ui.view; },
    screen, screenOn
  };
})();

/* ---------- Backpack, Vault transfer, Furnace, Anvil, Lumen exchange (data-driven placeholders) ---------- */
const Craft = (() => {
  // ---- item catalogue: id -> {name, emoji, col}; ids are kind:key
  const ORE_T = [['copper', 'Copper', '#e0874a'], ['tin', 'Tin', '#dfe2da'], ['iron', 'Iron', '#b4583a'], ['coal', 'Coal', '#3a383e'], ['gold', 'Gold', '#ffd25a'], ['mithril', 'Mithril', '#bfe0ff'], ['runite', 'Runite', '#d2b8ff'], ['lumenite', 'Lumenite', '#8ff6ff'], ['onyx', 'Ember Onyx', '#ff4a1c']];
  const TIERS = [['bronze', 'Bronze', '#c07a3c'], ['iron', 'Iron', '#7d8288'], ['steel', 'Steel', '#9aa4ae'], ['gold', 'Gold', '#e6b640'], ['mithril', 'Mithril', '#9cc0e6'], ['rune', 'Rune', '#7a56c8'], ['lumen', 'Lumen', '#2f6fe0'], ['onyx', 'Ember Onyx', '#ff5a28']];
  const TOOLS = [['pick', 'Pickaxe', '⛏️'], ['climb', 'Climbing picks', '🧗'], ['tlink', 'Tether links', '🔗'], ['lifeline', 'Ledge Tether', '🪢']];
  const ITEMS = {};
  for (const [k, n, c] of ORE_T) ITEMS['ore:' + k] = { name: n + ' ore', short: n, emoji: '🪨', col: c, kind: 'ore', base: 2 };
  TIERS.forEach(([k, n, c], i) => { ITEMS['ingot:' + k] = { name: n + ' ingot', short: n, emoji: '🧱', col: c, kind: 'ingot', tier: i };
    for (const [t, tn, e] of TOOLS) ITEMS['tool:' + t + '_' + k] = { name: n + ' ' + tn.toLowerCase(), short: n, emoji: e, col: c, kind: 'tool', tool: t, tier: i, climbGear: t === 'climb' || t === 'tlink' || undefined }; });
  // (Dominic) climbing gear has no grades now: everyone carries the Iron climbing picks and the Bronze climbing tether; every other look is a cosmetic skin (Lumen Crystals).
  // The other grades' ids stay defined only so old saves migrate (migrateClimbGear); they are never made, bought, sold or shown.
  const CLIMB_BASE = 'tool:climb_iron', TLINK_BASE = 'tool:tlink_bronze';
  ITEMS[CLIMB_BASE].name = 'Iron Climbing Picks'; ITEMS[TLINK_BASE].name = 'Bronze Climbing Tether'; ITEMS[TLINK_BASE].emoji = '🪢';
  // (Dominic) the ascender winch is Iron for everyone: one fixed Iron Winch (the old Ledge Tether tool id); every other winch grade is gone (no item, recipe, icon or listing; old saves migrate, migrateWinch)
  const WINCH_BASE = 'tool:lifeline_iron'; Object.assign(ITEMS[WINCH_BASE], { name: 'Iron Winch', short: 'Winch', emoji: '🪝', winch: true });
  for (const [k] of TIERS) if ('tool:lifeline_' + k !== WINCH_BASE) delete ITEMS['tool:lifeline_' + k];
  // (Dominic) equipped gear lives in equipment slots, never in the backpack grid or its slot count: the base gear (always worn) and the pickaxe in her hand (S.worn.pick)
  const BASE_GEAR = [CLIMB_BASE, TLINK_BASE, WINCH_BASE], isBase = (id) => BASE_GEAR.includes(id);
  const FULL = '🎒 Backpack full'; const fullMsg = (m) => { if (typeof toast === 'function') toast(m || FULL); return false; };
  // Theus's tiered pickaxe (Dominic: the tier lives on the item): one per kind at most, its own id (never a plain pickaxe, never payment); its tier is S.tpicks[kind] while it exists
  TIERS.forEach(([k, n, c], i) => { ITEMS['tool:tpick_' + k] = { name: n + ' Pickaxe (tiered)', short: n, emoji: '⛏️', col: c, kind: 'tool', tool: 'pick', tier: i, grade: k, tiered: true }; });
  for (const [k, n, c] of TIERS) ITEMS['tether:' + k] = { name: n + ' Ledge Tether', short: n + ' Tether', emoji: '🪢', col: c, kind: 'teth', tool: 'lifeline', unit: 'm', grade: k }; // coils measured in metres: lay drop tethers, upgrade / swap strands (Tether Orb)
  // drill split: one Drill Stand (no material tiers) plus a swappable bit (8 tiers). The old 'drill:mithril' id is kept only so a leftover count still migrates; it is not seeded or shown once empty.
  const STAND_ID = 'stand:drill', STAND_OLD = ['stand:timber', 'stand:iron', 'stand:brass', 'stand:lumenite'];
  const STAND_T = [['drill', 'Drill Stand', '#4E5258']];
  const BIT_T = [['bronze', 'Bronze', '#B07F45'], ['iron', 'Iron', '#80858D'], ['steel', 'Steel', '#6B7580'], ['gold', 'Gold', '#E6B640'], ['mithril', 'Mithril', '#6F97C6'], ['rune', 'Rune', '#3B424C'], ['lumen', 'Lumen', '#7FF4FF'], ['onyx', 'Ember Onyx', '#16131A']];
  ITEMS[STAND_ID] = { name: 'Drill Stand', short: 'Drill Stand', emoji: '🛠️', col: '#4E5258', kind: 'stand' };
  for (const [k, n, c] of BIT_T) ITEMS['bit:' + k] = { name: n + ' Bit', short: n, emoji: '🔩', col: c, kind: 'bit', grade: k };
  ITEMS['drill:mithril'] = { name: 'Mithril Drill', short: 'Mithril Drill', emoji: '🛠️', col: '#9cc0e6', kind: 'drill', legacy: true };
  // ---- recipes (placeholders; cost climbs steeply per tier)
  const coal = (i) => Math.round(1.6 ** i);
  const SMELT = [
    { out: 'ingot:bronze', in: { 'ore:copper': 2, 'ore:tin': 1 } },
    { out: 'ingot:iron', in: { 'ore:iron': 3 } },
    { out: 'ingot:steel', in: { 'ore:iron': 4, 'ore:coal': 2 } },
    { out: 'ingot:gold', in: { 'ore:gold': 6, 'ore:coal': coal(3) } },
    { out: 'ingot:mithril', in: { 'ore:mithril': 10, 'ore:coal': coal(4) } },
    { out: 'ingot:rune', in: { 'ore:runite': 16, 'ore:coal': coal(5) } },
    { out: 'ingot:lumen', in: { 'ore:lumenite': 26, 'ore:coal': coal(6) } },
    { out: 'ingot:onyx', in: { 'ore:onyx': 42, 'ore:coal': coal(7) } },
  ];
  const TOOL_COST = { pick: 3, climb: 2, tlink: 1, lifeline: 4 }, TOOL_EXTRA = { lifeline: 'tool:tlink_' };
  const SMITH = [];
  // Tether Mill (Dominic): braid spools (100 m single strand, ips ingots, s seconds, xp Tethercraft XP) and Wren's Tether (ci ingots, cs seconds, cx XP); u = Tethercraft unlock.
  // Hard-coded from SPEC §1 (option B: spool XP = anvil XP x 10.844). The anvil no longer makes tool:tlink_* - the mill does.
  const MILL = {
    bronze: { u: 1, ips: 4, s: 24.4, xp: 781, ci: 2, cs: 12, cx: 390 },
    iron: { u: 20, ips: 4, s: 30.4, xp: 1952, ci: 3, cs: 23, cx: 1464 },
    steel: { u: 25, ips: 4, s: 38.0, xp: 3470, ci: 5, cs: 47, cx: 4338 },
    gold: { u: 40, ips: 3, s: 47.7, xp: 6669, ci: 7, cs: 111, cx: 15561 },
    mithril: { u: 55, ips: 3, s: 59.6, xp: 18056, ci: 12, cs: 239, cx: 72222 },
    rune: { u: 70, ips: 2, s: 74.8, xp: 28412, ci: 18, cs: 673, cx: 255707 },
    lumen: { u: 100, ips: 2, s: 93.3, xp: 64848, ci: 28, cs: 1306, cx: 907878 },
    onyx: { u: 125, ips: 2, s: 116.0, xp: 197582, ci: 43, cs: 2495, cx: 4248006 }
  };
  for (const [t] of TOOLS) if (t !== 'tlink' && t !== 'climb' && t !== 'lifeline') TIERS.forEach(([k], i) => { const n = Math.round(TOOL_COST[t] * 1.55 ** i), inp = { ['ingot:' + k]: n }; if (TOOL_EXTRA[t]) inp[TOOL_EXTRA[t] + k] = 2; SMITH.push({ out: 'tool:' + t + '_' + k, in: inp, tool: t }); });
  // local placeholder market: value climbs per tier; the crystal buys at 80%
  const value = (id) => { const it = ITEMS[id]; if (!it) return 0; if (it.tiered) return value('tool:pick_' + it.grade); /* (a tiered pickaxe sells at the plain price) */ if (it.kind === 'ore') return Math.round(2 * 1.7 ** Math.max(0, ORE_T.findIndex((o) => 'ore:' + o[0] === id) - 1)); let v = 0; const r = SMELT.find((q) => q.out === id) || SMITH.find((q) => q.out === id); if (r) for (const k in r.in) v += value(k) * r.in[k]; else if (it.tool === 'tlink' && MILL[id.slice(10)]) v = value('ingot:' + id.slice(10)) * MILL[id.slice(10)].ci; return Math.round(v * 1.25); };
  const sellP = (id) => Math.max(1, Math.floor(value(id) * 0.8 * 10)), buyP = (id) => Math.max(1, Math.ceil(value(id) * 1.15 * 10)); // gold coins (x10 the old Lumen prices)
  // ---- storage: backpack = S.backpack {id:n}; vault = S.ledgeVault (ores/ingots/gear) with iron, coal, steel living in S.res
  const RES = { 'ore:iron': 'iron', 'ore:coal': 'coal', 'ingot:steel': 'steel' };
  function migrateDrillSplit() { if (typeof S === 'undefined' || !S || S.drillSplit) return;
    S.drillSplit = 1;
    const conv = (obj, key) => { if (!obj) return 0; const n = Math.floor(obj[key] || 0); if (n > 0) { delete obj[key]; obj[STAND_ID] = (obj[STAND_ID] || 0) + n; obj['bit:mithril'] = (obj['bit:mithril'] || 0) + n; } return n; };
    conv(S.backpack, 'drill:mithril');
    const g = S.ledgeVault && S.ledgeVault.gear; if (g) { const n = Math.floor(g.mithril || 0); if (n > 0) { delete g.mithril; g.iron = (g.iron || 0) + n; g.mithril = (g.mithril || 0) + n; } }
    for (const key of ['bagOrder', 'vaultOrder']) { const O = S[key]; if (!Array.isArray(O)) continue; let bit = false; for (let i = 0; i < O.length; i++) if (O[i] === 'drill:mithril') { O[i] = STAND_ID; if (!bit) { const j = O.indexOf(null); if (j >= 0) O[j] = 'bit:mithril'; else O.push('bit:mithril'); bit = true; } } }
    if (S.drills && S.drills.list) for (const d of S.drills.list) { if (!d.stand || d.stand !== 'drill') d.stand = 'drill'; if (!d.tier) d.tier = 'mithril'; } }
  function migrateStandUnify() { if (typeof S === 'undefined' || !S || S.standUnify) return;
    S.standUnify = 1;
    const foldBag = (obj) => { if (!obj) return; let n = 0; for (const id of Object.keys(obj)) { if (id === STAND_ID || !String(id).startsWith('stand:')) continue; n += Math.floor(obj[id] || 0); delete obj[id]; } if (n) obj[STAND_ID] = (obj[STAND_ID] || 0) + n; };
    foldBag(S.backpack);
    const g = S.ledgeVault && S.ledgeVault.gear; if (g) { let n = 0; for (const k of ['timber', 'iron', 'brass', 'lumenite']) { const v = Math.floor(g[k] || 0); if (v > 0) { n += v; delete g[k]; } } if (n) g.drill = (g.drill || 0) + n; }
    for (const key of ['bagOrder', 'vaultOrder']) { const O = S[key]; if (!Array.isArray(O)) continue; let put = false; for (let i = 0; i < O.length; i++) { if (O[i] === STAND_ID) put = true; else if (O[i] && String(O[i]).startsWith('stand:')) { if (put) O[i] = null; else { O[i] = STAND_ID; put = true; } } } }
    if (S.drills && S.drills.list) for (const d of S.drills.list) d.stand = 'drill'; }
  function bag() { if (!S.backpack) S.backpack = {}; if (!S.mdSeed) { S.mdSeed = 1; const n = S.drills ? S.drills.left : 20; if (n > 0) { S.backpack[STAND_ID] = (S.backpack[STAND_ID] || 0) + n; S.backpack['bit:mithril'] = (S.backpack['bit:mithril'] || 0) + n; } } migrateDrillSplit(); migrateStandUnify(); migrateClimbGear(); migrateWinch(); if (!S.tetherSeed) { S.tetherSeed = 1; S.backpack['tether:bronze'] = (S.backpack['tether:bronze'] || 0) + 1500; } migrateWorn(); return S.backpack; } // first run: Drill Stands + Mithril bits, one pair per drill left; new saves get a 1.5 km Bronze starter coil (the mill rolls the rest), older saves carry tetherSeed and keep what they have
  // ---- skins (cosmetic only, bought with Lumen Crystals at the Lumen Crystal): S.skins = { climb: {grade: 1}, tlink: {grade: 1} }; the look worn is S.climbGrade / S.tetherGrade
  const SKIN_LOOKS = { climb: ['stone', 'bronze', 'iron', 'steel', 'gold', 'mithril', 'rune', 'lumen', 'onyx'], tlink: ['regular', 'bronze', 'iron', 'steel', 'gold', 'mithril', 'rune', 'lumen', 'onyx'] };
  const SKIN_BASE = { climb: 'iron', tlink: 'bronze' }, SKIN_KEY = { climb: 'climbGrade', tlink: 'tetherGrade' }, SKIN_SET = { climb: 'setClimb', tlink: 'setTether' };
  const SKIN_NAME = (kind, g) => (g === 'stone' ? 'Stone' : g === 'regular' ? 'Vine' : (TIERS.find((q) => q[0] === g) || [0, g])[1]) + (kind === 'climb' ? ' Climbing Picks' : ' Climbing Tether');
  const SKIN_PRICE = { stone: 30, regular: 30, bronze: 40, iron: 60, steel: 80, gold: 120, mithril: 160, rune: 220, lumen: 300, onyx: 400 }; // Lumen Crystals
  function skins() { const K = S.skins || (S.skins = {}); for (const k of ['climb', 'tlink']) { K[k] = K[k] || {}; K[k][SKIN_BASE[k]] = 1; } return K; }
  const skinOwned = (kind, g) => !!skins()[kind][g];
  const crystals = () => Math.floor(S.crystals || 0);
  function skinBuy(kind, g) { if (!SKIN_LOOKS[kind] || !SKIN_LOOKS[kind].includes(g) || skinOwned(kind, g)) return false; const p = SKIN_PRICE[g] || 100; if (crystals() < p) return false; S.crystals = crystals() - p; skins()[kind][g] = 1; return true; }
  function skinWear(kind, g) { if (!skinOwned(kind, g)) return false; S[SKIN_KEY[kind]] = g; if (typeof CharView !== 'undefined' && CharView[SKIN_SET[kind]]) try { CharView[SKIN_SET[kind]](g); } catch (e) {} return true; } // the look only: no stat anywhere reads it
  // old saves: every other climbing grade (backpack, vault, the mill's rack, a queued Wren's Tether job) becomes the base gear and unlocks its look as an owned skin;
  // the look she wore stays on (Stone / Vine, the old defaults, become the Iron / Bronze base look); queued climbing-tether jobs refund their unspent ingots
  function migrateClimbGear() { if (typeof S === 'undefined' || !S || S.climbGearV >= 1) return; S.climbGearV = 1; const K = skins(), b = S.backpack || (S.backpack = {}), v = S.ledgeVault || (S.ledgeVault = {}); v.gear = v.gear || {};
    const own = (kind, g) => { if (SKIN_LOOKS[kind].includes(g)) K[kind][g] = 1; }, got = S.climbMigrated = { climb: [], tlink: [], refund: {} };
    for (const kind of ['climb', 'tlink']) for (const [g] of TIERS) { const id = 'tool:' + kind + '_' + g; if (g === SKIN_BASE[kind]) continue; const n = Math.floor(b[id] || 0) + Math.floor(v.gear[kind + '_' + g] || 0) + Math.floor((S.mill && S.mill.rack && S.mill.rack[id]) || 0);
      delete b[id]; delete v.gear[kind + '_' + g]; if (S.mill && S.mill.rack) delete S.mill.rack[id]; if (n > 0) { own(kind, g); got[kind].push(g); } }
    if (S.mill && Array.isArray(S.mill.jobs)) S.mill.jobs = S.mill.jobs.filter((j) => { if (j.tab !== 'climb') return true; const T = MILL[j.grade], back = T ? (j.n - j.done) * T.ci : 0; if (back > 0) { const ing = 'ingot:' + j.grade; b[ing] = (b[ing] || 0) + back; got.refund[ing] = (got.refund[ing] || 0) + back; } if (j.done > 0) own('tlink', j.grade); return false; });
    if (S.mill && S.mill.jobs && !S.mill.jobs.length && S.mill.tab === 'climb') S.mill.tab = 'braid';
    for (const kind of ['climb', 'tlink']) { const key = SKIN_KEY[kind], g = S[key]; if (!g || g === 'stone' || g === 'regular' || !SKIN_LOOKS[kind].includes(g)) S[key] = SKIN_BASE[kind]; else own(kind, g); }
    for (const id of [CLIMB_BASE, TLINK_BASE]) { const k = id.slice(5), n = Math.floor(b[id] || 0) + Math.floor(v.gear[k] || 0); if (n > 1) { got.extra = (got.extra || 0) + n - 1; if (b[id]) { b[id] = 1; delete v.gear[k]; } else v.gear[k] = 1; } } }
  // old saves: every other winch grade (backpack or vault) becomes the one Iron Winch; its ingots come back (the anvil recipe it took), as the climbing-gear migration refunds
  function migrateWinch() { if (typeof S === 'undefined' || !S || S.winchV >= 1) return; S.winchV = 1; const b = S.backpack || (S.backpack = {}), v = S.ledgeVault || (S.ledgeVault = {}); v.gear = v.gear || {}; const got = S.winchMigrated = { winch: [], refund: {} };
    TIERS.forEach(([g], i) => { const id = 'tool:lifeline_' + g; if (id === WINCH_BASE) return; const n = Math.floor(b[id] || 0) + Math.floor(v.gear['lifeline_' + g] || 0); delete b[id]; delete v.gear['lifeline_' + g]; if (!(n > 0)) return;
      got.winch.push(g); const ing = 'ingot:' + g, back = n * Math.round(TOOL_COST.lifeline * 1.55 ** i); b[ing] = (b[ing] || 0) + back; got.refund[ing] = (got.refund[ing] || 0) + back; }); }
  // old saves (once): the equipped gear leaves the backpack / vault for its equipment slot (a save fix, not a player action)
  const wornPickOf = () => { const g = S.pickGrade; return g && g !== 'stick' && TIERS.some((q) => q[0] === g) ? (S.pickEqT === g ? 'tool:tpick_' + g : 'tool:pick_' + g) : null; };
  function migrateWorn() { if (typeof S === 'undefined' || !S || S.wornV >= 1) return; S.wornV = 1; const b = S.backpack || (S.backpack = {}), v = S.ledgeVault || (S.ledgeVault = {}); v.gear = v.gear || {}; const W = S.worn = { pick: null }, out = { base: 0, pick: null };
    for (const id of BASE_GEAR) { out.base += Math.floor(b[id] || 0) + Math.floor(v.gear[id.slice(5)] || 0); delete b[id]; delete v.gear[id.slice(5)]; }
    const id = wornPickOf(), k = id && id.slice(5); if (id && b[id] > 0) { if (!--b[id]) delete b[id]; W.pick = id; out.pick = 'bag'; } else if (id && v.gear[k] > 0) { if (!--v.gear[k]) delete v.gear[k]; W.pick = id; out.pick = 'vault'; }
    S.wornMigrated = out; }
  const worn = () => (typeof S !== 'undefined' && S ? (S.worn || (S.worn = { pick: null })) : { pick: null });
  function vault() { const v = S.ledgeVault || (S.ledgeVault = {}); for (const k of ['ores', 'ingots', 'gear', 'lines', 'coils']) v[k] = v[k] || {}; migrateDrillSplit(); migrateStandUnify(); if (!S.coilSeed) S.coilSeed = 1; return v; } // the free 5000 m of every grade is gone now the mill rolls braid; saves seeded before keep their coils
  function vSlot(id) { const [kind, key] = id.split(':'), v = vault(); return kind === 'ore' ? [v.ores, key] : kind === 'ingot' ? [v.ingots, key] : kind === 'tether' ? [v.coils, key] : [v.gear, key]; }
  function get(where, id) { if (where === 'bag') return Math.floor(bag()[id] || 0); if (RES[id]) return Math.floor((S.res && S.res[RES[id]]) || 0); const [o, k] = vSlot(id); return Math.floor(o[k] || 0); }
  // ---- slot grids: the backpack has BAG_N slots, the vault VAULT_N. S.bagOrder / S.vaultOrder keep which kind sits in which slot (counts stay in S.backpack / the vault store).
  // (Dominic) Backpack: ores, coal, bars and every other non-tool item stack to STACK (500) per slot, the 501st starts a new slot; pickaxes and other tools take one slot each;
  // drill stands and bits stack to 12 per slot; Ledge Tether length (metres) stacks in one slot. Vault: every kind sits in one slot, tools included, up to STACK_MAX (the largest exact whole number a save holds).
  const BAG_N = 20, VAULT_N = 100, STACK = 500, STACK_DRILL = 12, STACK_MAX = Number.MAX_SAFE_INTEGER;
  const perSlot = (id) => { const it = ITEMS[id]; if (!it) return STACK; if (it.unit === 'm') return STACK_MAX; if (it.kind === 'stand' || it.kind === 'bit' || it.kind === 'drill') return STACK_DRILL; return it.kind === 'tool' ? 1 : STACK; }; // (Dominic: drill stands and bits stack to 12)
  const slotsFor = (where, id, c) => (c <= 0 ? 0 : where === 'bag' ? Math.ceil(c / perSlot(id)) : 1);
  // old saves (unlimited stacks): split the backpack into 500-slots and single tool slots once; whatever no longer fits goes to the vault, nothing is lost
  function migrateBagStacks() { if (typeof S === 'undefined' || !S || S.bagStackV >= 2) return; S.bagStackV = 2; S.bagStack500 = 1; /* v1: 500-slots + single tools; v2: stands / bits 12 per slot */ const b = bag(); let O = Array.isArray(S.bagOrder) ? S.bagOrder : [];
    const ids = Object.keys(b).filter((k) => b[k] > 0), eq = ids.filter((k) => equipped(k)), pri = [...new Set([...eq, ...O.filter((k) => k && ids.includes(k)), ...ids])];
    let free = BAG_N; const moved = {};
    for (const id of pri) { const c = Math.floor(b[id]), need = slotsFor('bag', id, c), got = Math.min(need, free), keep = Math.min(c, got * perSlot(id)); free -= got;
      if (keep < c) { const v = c - keep; if (vaultAdd(id, v)) { b[id] = keep; moved[id] = v; if (!keep) delete b[id]; } } }
    S.bagOrder = O.slice(0, BAG_N).map((k) => (k && b[k] > 0 ? k : null)); for (let i = 0; i < S.bagOrder.length; i++) if (S.bagOrder.indexOf(S.bagOrder[i]) !== i) S.bagOrder[i] = null;
    S.bagMoved = moved; }
  function vaultAdd(id, n) { if (n <= 0) return true; const O = order('vault'); if (!O.includes(id) && !O.slice(0, VAULT_N).includes(null)) return false; if (RES[id]) { S.res[RES[id]] = Math.min(STACK_MAX, (S.res[RES[id]] || 0) + n); } else { const [o, k] = vSlot(id); o[k] = Math.min(STACK_MAX, (o[k] || 0) + n); } order('vault'); return true; }
  const vaultIds = () => Object.keys(ITEMS).filter((id) => get('vault', id) > 0);
  function order(where) { if (where === 'bag') migrateBagStacks(); const key = where === 'bag' ? 'bagOrder' : 'vaultOrder', N = where === 'bag' ? BAG_N : VAULT_N; let O = S[key]; if (!Array.isArray(O)) O = S[key] = [];
    while (O.length < N) O.push(null); const need = {}, cnt = {}; const ids = where === 'bag' ? Object.keys(bag()).filter((k) => bag()[k] > 0) : vaultIds(); for (const id of ids) need[id] = slotsFor(where, id, get(where, id));
    for (let i = O.length - 1; i >= 0; i--) { const id = O[i]; if (!id) continue; if (!need[id]) { O[i] = null; continue; } cnt[id] = (cnt[id] || 0) + 1; } // (a kind drops its last slots first when its count shrinks)
    for (let i = O.length - 1; i >= 0; i--) { const id = O[i]; if (id && cnt[id] > need[id]) { O[i] = null; cnt[id]--; } }
    for (const id of ids) while ((cnt[id] || 0) < need[id]) { const i = O.indexOf(null); if (i < 0 || i >= N) O.push(id); else O[i] = id; cnt[id] = (cnt[id] || 0) + 1; } // (an old save over the limit keeps its extra stacks until they empty)
    while (O.length > N && O[O.length - 1] == null) O.pop(); return O; }
  // how many more of id the container takes: the backpack counts the spare room in its own slots of that kind plus every free slot; the vault, up to STACK_MAX
  function room(where, id) { const O = order(where), N = where === 'bag' ? BAG_N : VAULT_N, c = get(where, id), free = O.slice(0, N).filter((k) => k == null).length;
    if (where !== 'bag') return O.includes(id) || free ? Math.max(0, STACK_MAX - c) : 0; const p = perSlot(id); if (p >= STACK_MAX) return O.includes(id) || free ? Math.max(0, STACK_MAX - c) : 0;
    return Math.max(0, slotsFor('bag', id, c) * p - c) + free * p; }
  function fits(where, id, n) { return room(where, id) >= Math.max(1, n || 1); }
  function add(where, id, n) { if (n > 0 && !fits(where, id, n)) return 0; if (where === 'bag') { const b = bag(); b[id] = (b[id] || 0) + n; if (b[id] <= 0) delete b[id]; order('bag'); return n; } if (RES[id]) { S.res[RES[id]] = Math.max(0, (S.res[RES[id]] || 0) + n); order('vault'); return n; } const [o, k] = vSlot(id); o[k] = Math.max(0, (o[k] || 0) + n); if (!o[k]) delete o[k]; order('vault'); return n; }
  // all or nothing (several kinds into one container): any that does not fit undoes the rest
  function addAll(where, list) { const done = []; for (const [id, n] of list) { if (!(n > 0)) continue; if (!add(where, id, n)) { for (const [i2, n2] of done) add(where, i2, -n2); return false; } done.push([id, n]); } return true; }
  function addUpTo(where, id, n) { const r = Math.min(Math.floor(n), room(where, id)); return r > 0 ? add(where, id, r) : 0; } // as many as fit (mining: the rest of that strike is left in the rock)
  const spare = (id) => get('bag', id) + get('vault', id); // what can be spent, sold or moved: never the equipped gear
  const have = (id) => spare(id) + (isBase(id) || (id && worn().pick === id) ? 1 : 0); // owned, the equipped one included
  const TPICK = (k) => 'tool:tpick_' + k;
  function pickTier(k) { if (typeof S === 'undefined' || !S || have(TPICK(k)) <= 0) return 0; return Math.max(1, Math.min(10, Math.floor((S.tpicks && S.tpicks[k]) || 1))); } // the tiered pickaxe's own tier; no tiered pickaxe = T0
  // the equipped pickaxe's own tier: the tiered one only while it is the one in her hand (plain pickaxes are T0)
  function equippedPickTierN() { const g = typeof S !== 'undefined' && S && S.pickGrade; return g && S.pickEqT === g ? pickTier(g) : 0; }
  function take(id, n) { if (spare(id) < n) return false; const a = Math.min(get('bag', id), n); add('bag', id, -a); if (n - a) add('vault', id, -(n - a)); return true; }
  function move(from, to, id, n) { n = Math.min(Math.floor(n), get(from, id), room(to, id)); if (n <= 0) return 0; add(from, id, -n); add(to, id, n); return n; }
  function canMake(r, x) { return Object.keys(r.in).every((k) => spare(k) >= r.in[k] * x); }
  function maxMake(r) { let m = Infinity; for (const k in r.in) m = Math.min(m, Math.floor(spare(k) / r.in[k])); return m; }
  function make(r, x, dest) { if (x <= 0 || !canMake(r, x)) return 0; if (!fits(dest === 'vault' ? 'vault' : 'bag', r.out, x)) return fullMsg(dest === 'vault' ? '🔒 Vault full' : FULL), 0; /* (room checked before any ingredient is taken) */ for (const k in r.in) take(k, r.in[k] * x); add(dest === 'vault' ? 'vault' : 'bag', r.out, x); if (typeof Skills !== 'undefined') Skills.awardCraft(r, x); return x; }
  // (Dominic) everything is bought and sold for gold coins (S.gold, Mosby's fare purse); Lumen Crystals buy skins only. Rate: 1 Lumen of the old prices = 10 gold.
  const COIN_RATE = 10, gold = () => { if (S.gold == null) S.gold = 2500; return Math.floor(S.gold); }, lum = gold;
  const COIN = '<img class="kCoin" src="assets/ui/icons/coin.webp" alt="gold">';
  if (typeof document !== 'undefined' && !document.getElementById('cxSkinCss')) { const e = document.createElement('style'); e.id = 'cxSkinCss'; e.textContent = '.cxsw{flex:none;width:30px;height:30px;border-radius:50%;background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.55),transparent 45%),var(--c);box-shadow:inset 0 0 0 2px rgba(60,35,15,.55);margin-right:6px}.cxskH{margin:10px 0 4px;font-size:15px}.cxsoon{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 10px;margin:6px 0;border-radius:10px;background:rgba(120,170,255,.14);box-shadow:inset 0 0 0 1px rgba(90,130,220,.35)}.cxsoon b{flex:1 1 100%}.cxsoon small{flex:1;opacity:.8}.cxgd{display:inline-flex;align-items:center}'; document.head.appendChild(e); }
  function sell(id, n) { if (equipped(id) && spare(id) <= 0) return fullMsg('Unequip it first'), 0; n = Math.min(n, spare(id)); if (n <= 0) return 0; take(id, n); S.gold = gold() + sellP(id) * n; const it = ITEMS[id];
    if (it && it.tiered && have(id) <= 0) { if (S.tpicks) delete S.tpicks[it.grade]; if (S.pickEqT === it.grade) { S.pickEqT = null; if (typeof CharView !== 'undefined' && CharView.setPick) try { CharView.setPick(S.pickGrade); } catch (e) {} } } /* sold: that kind starts over at T0 */ return n; }
  function buy(id, n) { n = Math.min(n, Math.floor(lum() / buyP(id))); if (n > 0 && room('bag', id) <= 0) return fullMsg(), 0; n = Math.min(n, room('bag', id)); if (n <= 0) return 0; S.gold = gold() - buyP(id) * n; add('bag', id, n); return n; }
  // ---- UI
  const st = { qty: 1, dest: 'bag', tab: 'sell', kind: null, acat: 'pick', atool: null, menu: null };
  const ANV_CAT = [['pick', 'Pickaxes', '⛏️']], TETH_SUB = []; /* (Dominic: the winch is fixed Iron; the anvil makes no Ledge Tether tool) */ // Wren's Tether (tool:tlink_*) is rolled at the Tether Mill now
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (n) => (n >= 1e4 ? Math.round(n / 1000) + 'k' : String(n));
  const ico = (id) => { const it = ITEMS[id] || { emoji: '📦', col: '#888' }; return `<span class="cxi" style="--c:${it.col}">${it.emoji}</span>`; };
  const nm = (id) => { const it = ITEMS[id]; return it ? (it.tiered ? `${TIERS[it.tier][1]} Pickaxe (T${pickTier(it.grade)})` : it.name) : id; };
  const qtyBar = () => `<div class="cxq">${[1, 10, 100, 'all'].map((q) => `<button class="btn sm ${st.qty === q ? 'alt' : 'ghost'}" data-cx="qty" data-v="${q}">${q === 'all' ? 'All' : '×' + q}</button>`).join('')}</div>`;
  const destBar = () => `<div class="cxq"><span class="dim">Output to</span>${[['bag', '🎒 Backpack'], ['vault', '🔒 Vault']].map(([k, l]) => `<button class="btn sm ${st.dest === k ? 'alt' : 'ghost'}" data-cx="dest" data-v="${k}">${l}</button>`).join('')}</div>`;
  const SKIP_SHOP = { drill: 1, teth: 1, stand: 1, bit: 1 }; const allIds = () => Object.keys(ITEMS).filter((id) => spare(id) > 0 && !SKIP_SHOP[ITEMS[id].kind] && !ITEMS[id].tiered && !ITEMS[id].climbGear && !ITEMS[id].winch); // (climbing gear: never sold or bought; its looks are skins) // (a tiered pickaxe never goes to the shop: players trade it at the Ledgeville Exchange)
  // ---- hand-drawn item icons (inline SVG): a wobbly inked outline over the item's colour, a highlight, per-kind drawings; jitter seeded by the id so each looks inked once
  const ICO = {};
  function svgIco(id) { if (ICO[id]) return ICO[id]; const it = ITEMS[id] || { kind: '?', col: '#888' }; let sd = 7; for (const ch of id) sd = (sd * 31 + ch.charCodeAt(0)) % 2147483647; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647, j = (v) => (v + (R() - 0.5) * 1.6).toFixed(1);
    const c = it.col, ink = '#2a1d14', P = (pts) => 'M' + pts.map(([x, y]) => j(x) + ' ' + j(y)).join(' L') + ' Z', st = `stroke="${ink}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"`;
    let b = '';
    if (it.kind === 'ore') { const n = 9, pts = []; for (let k = 0; k < n; k++) { const a = k / n * 6.283 + 0.3, r = 11 + R() * 4; pts.push([24 + Math.cos(a) * r * 1.1, 26 + Math.sin(a) * r * 0.85]); } b = `<path d="${P(pts)}" fill="#8a8178" ${st}/><path d="M15 22 Q20 16 27 17" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="2"/>`; for (let k = 0; k < 5; k++) b += `<path d="${P([[14 + R() * 18, 20 + R() * 12], [17 + R() * 18, 22 + R() * 12], [15 + R() * 18, 25 + R() * 10]])}" fill="${c}" stroke="${ink}" stroke-width="1"/>`; }
    else if (it.kind === 'ingot') b = `<path d="${P([[9, 33], [39, 33], [34, 21], [14, 21]])}" fill="${c}" ${st}/><path d="${P([[14, 21], [34, 21], [31, 17], [17, 17]])}" fill="${c}" ${st} style="filter:brightness(1.25)"/><path d="M13 30 L35 30" stroke="rgba(255,255,255,.45)" stroke-width="2"/>`;
    else if (it.tool === 'pick') b = `<path d="M${j(15)} ${j(39)} L${j(31)} ${j(13)}" stroke="#7a5230" stroke-width="5" stroke-linecap="round"/><path d="M${j(15)} ${j(39)} L${j(31)} ${j(13)}" stroke="${ink}" stroke-width="1" fill="none"/><path d="M${j(13)} ${j(14)} Q${j(28)} ${j(4)} ${j(42)} ${j(17)} Q${j(30)} ${j(11)} ${j(13)} ${j(14)} Z" fill="${c}" ${st}/>`;
    else if (it.tool === 'climb') b = `<path d="M${j(18)} ${j(41)} L${j(26)} ${j(12)}" stroke="#7a5230" stroke-width="4.5" stroke-linecap="round"/><path d="M${j(25)} ${j(10)} Q${j(36)} ${j(9)} ${j(40)} ${j(19)} L${j(36)} ${j(17)} Q${j(32)} ${j(13)} ${j(26)} ${j(15)} Z" fill="${c}" ${st}/><path d="M${j(24)} ${j(12)} L${j(17)} ${j(8)}" stroke="${c}" stroke-width="3.5" stroke-linecap="round"/><path d="M${j(13)} ${j(33)} Q${j(18)} ${j(37)} ${j(23)} ${j(33)}" stroke="#b89a62" stroke-width="3" fill="none"/>`;
    else if (it.tool === 'tlink') b = [0, 1, 2].map((k) => `<ellipse cx="${j(14 + k * 10)}" cy="${j(30 - k * 6)}" rx="7" ry="4.6" transform="rotate(-32 ${14 + k * 10} ${30 - k * 6})" fill="none" stroke="${ink}" stroke-width="5"/><ellipse cx="${14 + k * 10}" cy="${30 - k * 6}" rx="7" ry="4.6" transform="rotate(-32 ${14 + k * 10} ${30 - k * 6})" fill="none" stroke="${c}" stroke-width="2.6"/>`).join('');
    else if (it.tool === 'lifeline') { b = ''; for (let k = 0; k < 4; k++) b += `<ellipse cx="${j(24)}" cy="${j(25 + k * 1.2)}" rx="${15 - k * 3}" ry="${10 - k * 2}" fill="none" stroke="${ink}" stroke-width="5"/><ellipse cx="24" cy="${25 + k * 1.2}" rx="${15 - k * 3}" ry="${10 - k * 2}" fill="none" stroke="${c}" stroke-width="2.8"/>`; b += `<path d="M${j(36)} ${j(31)} Q${j(42)} ${j(38)} ${j(38)} ${j(43)}" stroke="${c}" stroke-width="3" fill="none"/>`; }
    else if (it.kind === 'stand' || it.kind === 'drill') b = `<path d="M${j(16)} ${j(18)} L${j(10)} ${j(40)} M${j(16)} ${j(18)} L${j(22)} ${j(40)} M${j(16)} ${j(18)} L${j(28)} ${j(40)}" stroke="#5a5048" stroke-width="2.8" stroke-linecap="round" fill="none"/><path d="M${j(16)} ${j(18)} L${j(10)} ${j(40)} M${j(16)} ${j(18)} L${j(22)} ${j(40)} M${j(16)} ${j(18)} L${j(28)} ${j(40)}" stroke="${c}" stroke-width="1.6" fill="none"/><circle cx="${j(16)}" cy="${j(16)}" r="5.2" fill="#d8a440" ${st}/><circle cx="${j(16)}" cy="${j(11)}" r="2.1" fill="#5fe8f0"/>`;
    else if (it.kind === 'bit') b = `<path d="${P([[18, 36], [30, 36], [24, 8]])}" fill="${c}" ${st}/><rect x="${j(20)}" y="${j(34)}" width="8" height="5" rx="1" fill="#8a8d92" ${st}/><rect x="${j(22)}" y="${j(38)}" width="4" height="5" fill="#6a6d72" ${st}/>`;
    else b = `<rect x="12" y="14" width="24" height="22" rx="3" fill="${c}" ${st}/>`;
    return (ICO[id] = `<svg class="cxsv" viewBox="0 0 48 48" aria-hidden="true">${b}</svg>`); }
  // (Mia's ember flame ladder) a tiered Ember Onyx pickaxe's icon takes its tier's flame colour: a hue / brightness tint of the same art (the dark stone barely moves)
  const ONYX_HEX = ['#ff4a1c', '#ff6a1a', '#ff8f1f', '#ffb52e', '#ffe08a', '#c8f4ff', '#5fdcff', '#3aa0ff', '#3f5cff', '#7a4dff', '#b04bff'];
  function onyxFilter(t) { t = Math.max(0, Math.min(10, t | 0)); if (!t) return ''; const hx = ONYX_HEX[t], r = parseInt(hx.slice(1, 3), 16) / 255, g = parseInt(hx.slice(3, 5), 16) / 255, b = parseInt(hx.slice(5, 7), 16) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    let h = 0; if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360; const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
    return `hue-rotate(${Math.round(h - 12)}deg) saturate(${(0.6 + 0.6 * s).toFixed(2)}) brightness(${(1 + Math.max(0, l - 0.55) * 1.2).toFixed(2)})`; }
  const tintIco = (html, t) => { const f = onyxFilter(t); return f && html ? html.replace(/^<(\w+)/, (m0) => `${m0} data-tier="${t}"`).replace('style="', `style="filter:${f};`).replace(/^<svg /, `<svg style="filter:${f}" `) : html; };
  const pic = (id) => { const it = ITEMS[id], a = it && it.tiered ? 'tool:pick_' + it.grade : id, h = (typeof itemIco === 'function' && itemIco(a)) || svgIco(a); return (it && it.tiered && it.grade === 'onyx' ? tintIco(h, pickTier('onyx')) : h) + tb(id); };
  const tb = (id) => { const it = ITEMS[id]; return it && it.tiered ? `<b class="cxtb">T${pickTier(it.grade)}</b>` : ''; }; // the brass tier badge on a tiered pickaxe's icon
  const badge = (id, c) => { const it = ITEMS[id], m = it && it.unit === 'm'; return `<b class="cxct${m ? ' m' : ''}">${m ? fmtN(c) + ' m' : '×' + fmtN(c)}</b>`; };
  const fmtN = (n) => (n >= 1e9 ? (n / 1e9).toFixed(n >= 1e10 ? 0 : 1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : n >= 1e4 ? Math.floor(n / 1000) + 'k' : String(n));
  const EQUIP = { pick: ['pickGrade', 'setPick', 'Pickaxe'], climb: ['climbGrade', 'setClimb', 'Climbing picks'], tlink: ['tetherGrade', 'setTether', 'Tether'] };
  const equipped = (id) => !!id && (isBase(id) || worn().pick === id);
  const setPickLook = (g) => { if (typeof CharView !== 'undefined' && CharView.setPick) try { CharView.setPick(g); } catch (e) {} };
  // equip a pickaxe: it leaves the backpack (or the vault) for her hand; the one she held goes back to the backpack, or the swap is blocked when there is no room
  function equip(id) { const it = ITEMS[id]; if (isBase(id)) return true; if (!it || it.kind !== 'tool' || it.tool !== 'pick') return false; if (equipped(id)) return true;
    const from = get('bag', id) > 0 ? 'bag' : get('vault', id) > 0 ? 'vault' : null; if (!from) return false; const W = worn(), old = W.pick; add(from, id, -1);
    if (old && !add('bag', old, 1)) { add(from, id, 1); return fullMsg(); }
    const g = TIERS[it.tier][0]; W.pick = id; S.pickGrade = g; S.pickEqT = it.tiered ? g : null; setPickLook(g); return true; }
  // unequip: back into the backpack if it has room; full -> blocked with a short message (everywhere, the vault too: it never goes to the vault by itself)
  function unequip(id) { if (isBase(id)) return fullMsg('Everyone wears this one'); const W = worn(); if (!id || W.pick !== id) return false; if (!fits('bag', id, 1)) return fullMsg();
    add('bag', id, 1); W.pick = null; S.pickGrade = 'stick'; S.pickEqT = null; setPickLook('stick'); return true; }
  // the equipment slots (above the backpack grid): pickaxe in hand, climbing picks, climbing tether, winch
  function equipHTML() { const p = worn().pick, row = [['Pickaxe', p], ['Climbing picks', CLIMB_BASE], ['Climbing tether', TLINK_BASE], ['Winch', WINCH_BASE]];
    return `<div class="kEq" data-cxv="equip">${row.map(([l, id]) => `<div class="kEqS${id ? ' full' : ''}"${id ? ` data-id="${id}" title="${esc(nm(id))}"` : ''}><small>${l}</small>${id ? pic(id) : '<i class="kEqN">Stickaxe</i>'}${id && !isBase(id) ? `<button class="btn sm ghost" data-cx="unequip" data-id="${id}">Unequip</button>` : ''}</div>`).join('')}</div>`; }
  function gridHTML(where) { const O = order(where), N = where === 'bag' ? BAG_N : VAULT_N, n = Math.max(N, O.length); let h = `<div class="cxg cxg-${where}" data-w="${where}">`;
    const seen = {}; for (let i = 0; i < n; i++) { const id = O[i]; let c = id ? get(where, id) : 0, first = true; if (id && where === 'bag') { const j = seen[id] || 0, p = perSlot(id); seen[id] = j + 1; first = !j; c = p >= STACK_MAX ? c : Math.max(0, Math.min(p, c - j * p)); }
      const one = id && where === 'bag' && perSlot(id) === 1; h += `<div class="cxs${id ? ' full' : ''}${i >= N ? ' over' : ''}${id && first && equipped(id) ? ' eq' : ''}${one ? ' one' : ''}" data-w="${where}" data-s="${i}"${id ? ` data-id="${id}" data-n="${c}" title="${esc(nm(id))}"` : ''}>${id ? pic(id) + (one ? '' : badge(id, c)) : ''}</div>`; }
    return h + '</div>'; }
  const used = (w) => order(w).filter(Boolean).length;
  // the Backpack shows only what she carries; the Ledge Vault sits beside it only on the vault's own Backpack ⇄ Vault screen (xfer)
  // (Dominic: field-kit skin, Art's B_* concepts) a brass gauge for slot counts: needle sweeps with how full it is; the numbers are live
  const gauge = (n, N) => `<span class="kGauge" style="--g:${Math.min(1, n / N).toFixed(3)}" role="img" aria-label="${n} of ${N} slots used"><i></i><b>${n} / ${N}</b></span>`;
  function gridsHTML(inModal, xfer) {
    let h = `<div class="cxp cxgrid kKit" data-cxv="${xfer ? 'xfer' : 'bag'}"><div class="kPanel kLeather"><div class="row between kHead"><h2>Backpack</h2>${gauge(used('bag'), BAG_N)}${inModal && !xfer ? '<button class="kX" data-cx="close" aria-label="Close">✕</button>' : ''}</div>`;
    h += (xfer ? '' : `<div class="dim kSub">What Wren carries. Tap an item for its options.${typeof Skills !== 'undefined' ? ' · ' + Skills.uiLine() : ''}</div>`) + equipHTML() + gridHTML('bag') + (xfer ? '' : '<div class="kFoot">Ores, coal and bars stack to 500 per slot. Drill stands and bits stack to 12. Ledge Tether length stacks in one slot. Other tools take one slot each.</div>') + '</div>';
    if (xfer) h += `<div class="kSwap"><span class="kPlate">⇄</span><small>Tap to move a stack · hold for more (equip, move some). Backpack: ores, coal and bars 500 per slot, drill stands and bits 12, Ledge Tether length in one slot, other tools one slot each. The vault stacks everything in one slot.</small></div><div class="kPanel kLeather"><div class="row between kHead"><h2>Ledge Vault</h2>${gauge(used('vault'), VAULT_N)}</div>` + gridHTML('vault') + '</div>';
    h += st.menu && (xfer || st.menu.w === 'bag') ? menuHTML() : ''; return h + (inModal && xfer ? '<button class="btn ghost kBtn kCream" data-cx="close">Close</button>' : '') + '</div>'; }
  const TIER_N = (it) => { if (!it) return ''; if (it.tier != null && TIERS[it.tier]) return TIERS[it.tier][1]; const g = it.grade || it.stand; const T = g && TIERS.find((q) => q[0] === g); return T ? T[1] : (it.short || g || ''); };
  const KIND_N = { ore: 'Ore', ingot: 'Ingot', tool: 'Tool', teth: 'Ledge Tether', stand: 'Drill stand', bit: 'Drill bit', drill: 'Drill' };
  function itemStats(id, c) {
    const it = ITEMS[id] || {}, o = [];
    const where = (st.menu && st.menu.w) === 'vault' ? 'Vault' : 'Backpack';
    o.push(['Held', (it.unit === 'm' ? fmtN(c) + ' m' : '×' + fmtN(c)) + ' in ' + where]);
    const tn = it.climbGear ? '' : TIER_N(it); if (tn) o.push(['Tier', tn]); if (it.climbGear) o.push(['Look', SKIN_NAME(it.tool === 'climb' ? 'climb' : 'tlink', S[it.tool === 'climb' ? 'climbGrade' : 'tetherGrade'] || SKIN_BASE[it.tool === 'climb' ? 'climb' : 'tlink'])]);
    if (it.tiered && typeof Skills !== 'undefined' && Skills.multLabel) { const t = pickTier(it.grade); o.push(['Upgrade', 'T' + t + ' \u00b7 ' + Skills.multLabel(Skills.tierMult(t)) + ' mining']); }
    if (it.kind && KIND_N[it.kind]) o.push(['Kind', KIND_N[it.kind]]);
    if (it.kind === 'tool' && EQUIP[it.tool]) o.push(['Slot', EQUIP[it.tool][2]]);
    if (it.kind === 'bit' && typeof Explore !== 'undefined' && Explore.BITS) { const b = Explore.BITS.find((q) => q.k === it.grade); if (b) { o.push(['Rate', '1/3 of your ore/h on that ore']); o.push(['Burn', b.burn + ' coal/h']); const need = Explore.bitPushNeed && Explore.bitPushNeed(it.grade); if (need) o.push(['Push strand', 'Needs ' + need.name + ' Ledge Tether (' + need.burn + ' coal/h)']); } }
    return o;
  }
  function itemBlurb(id, w) {
    const it = ITEMS[id] || {};
    if (it.kind === 'stand' || it.kind === 'drill') return 'Place the stand, then swap or pick up the bit at the drill itself.';
    if (it.kind === 'teth') return 'The same braid as the door tethers. Lay a drop tether from the backpack on the map, or use the coil to upgrade a strand.';
    if (it.kind === 'bit') return 'Fits any placed stand. Swap or pick it up at the drill itself.';
    if (it.tiered) return 'Its tier lives on this pickaxe. Equip it to mine; trade it with players at the Ledgeville Exchange (the shop will not buy it).';
    if (it.kind === 'tool' && it.tool === 'pick') return 'Equip it to mine ore out on the map.';
    if (it.climbGear) return 'Everyone carries these; they climb the same in any look. New looks are cosmetic skins at the Lumen Crystal.';
    if (it.winch) return 'The ascender winch on her hip. Everyone carries an Iron Winch; it reels her up the rope at the same speed for everyone.';
    if (it.kind === 'ore') return w === 'bag' ? 'Carried in the backpack. Smelt it at the Ledge, or move it to the vault (Backpack ⇄ Vault).' : 'Stored in the Ledge vault.';
    if (it.kind === 'ingot') return w === 'bag' ? 'Smelted metal, ready to smith. Move it to the vault at the Ledge (Backpack ⇄ Vault).' : 'Stored in the Ledge vault.';
    return w === 'bag' ? 'Carried in the backpack. Move it to the vault at the Ledge (Backpack ⇄ Vault).' : 'Stored in the Ledge vault.';
  }
  function infoHead(id, c, blurb) {
    const stats = itemStats(id, c).map(([k, v]) => `<small>${esc(k)}</small><b>${esc(v)}</b>`).join('');
    return `<div class="cxmh">${pic(id)}<div class="cxmd"><b>${esc(nm(id))}</b><div class="cxsts">${stats}</div>${blurb ? `<p class="cxds">${blurb}</p>` : ''}</div></div>`;
  }
  function menuHTML() { const { w, id } = st.menu, c = get(w, id), to = w === 'bag' ? 'Vault' : 'Backpack', it = ITEMS[id], E = it && it.kind === 'tool' && EQUIP[it.tool];
    if (it && (it.kind === 'stand' || it.kind === 'drill')) return drillMenuHTML(id, c);
    if (it && it.kind === 'teth' && !st.menu.x) return dropMenuHTML(id, c); // drop-tether confirm only in the backpack; the vault transfer screen needs Move (length / all)
    const u = it && it.unit === 'm' ? ' m' : '';
    return `<div class="cxmenu" data-w="${w}" data-id="${id}">${infoHead(id, c, st.menu.x ? '' : itemBlurb(id, w))}` +
      `<div class="cxacts">` +
      (E ? `<button class="btn sm ${equipped(id) ? 'ghost' : 'alt'}" data-cx="equip" data-id="${id}" ${equipped(id) ? 'disabled' : ''}>${equipped(id) ? 'Equipped' : 'Equip'} (${E[2]})</button>` : '') +
      (st.menu.x ? `${[1, 10].map((q) => `<button class="btn sm ghost" data-cx="mv" data-n="${q}" ${c >= q ? '' : 'disabled'}>Move ${q}${u} → ${to}</button>`).join('')}` +
      `<input class="cxin" type="number" min="1" max="${c}" value="${Math.min(c, 5)}" inputmode="numeric"><button class="btn sm ghost" data-cx="mvc">Move</button><button class="btn sm alt" data-cx="mv" data-n="all">All → ${to}</button>` : '') +
      `<button class="btn sm ghost" data-cx="mclose">Cancel</button></div></div>`; }
  // a drill stand's menu: the nearest drill-free ore within a 5 s walk at her run speed (type + walked distance), or why not; confirm walks her there and sets it up (needs a stand; a bit can be swapped at the drill itself)
  function drillMenuHTML(id, c) { const X = typeof Explore !== 'undefined' && Explore.drillNear ? Explore.drillNear() : { err: 'explore' }, ok = !X.err && c > 0, it = ITEMS[id];
    const near = X.err === 'explore' ? `<div class="cxnear dim">Set it up out on the map: open 🧭 Explore, then pick a stand from 🎒 Bag.</div>` : X.err ? `<div class="cxnear none">⛔ No ore within 5 s walk <small>(${X.R} m at your run speed)</small></div>`
      : `<div class="cxnear">${pic('ore:' + X.type)}<span><b>${esc(X.name)} ore</b><small>${X.m} m away · ${X.s} s walk</small></span></div>`;
    return `<div class="cxmenu cxdrill" data-w="${st.menu && st.menu.w || 'bag'}" data-id="${id}">${infoHead(id, c, 'Place the stand, then swap or pick up the bit at the drill itself.')}${near}` +
      `<div class="cxacts"><button class="btn alt cxdset" data-cx="dset" ${ok ? '' : 'disabled'}>🛠️ Set up at nearest ore</button><button class="btn sm ghost" data-cx="mclose">Cancel</button></div></div>`; }
  // the Mithril Ledge Tether coil: 'Create a drop Ledge tether here?' - the length the rope needs from the Ledge door to her spot vs what is left on the coil
  function dropMenuHTML(id, c) { const X = typeof Explore !== 'undefined' && Explore.dropNeed ? Explore.dropNeed(id) : { err: 'explore' }, ok = !X.err && X.ok;
    const info = X.err ? `<div class="cxnear dim">Lay a drop tether out on the map: open the map in Character view, then pick the coil from 🎒 Bag.</div>` : `<div class="cxnear${X.ok ? '' : ' none'}">🪢<span><b>Create a drop Ledge tether here?</b><small>${esc(X.name)} · needs ${X.need} m from the Ledge door · ${X.have} m on the coil</small></span></div>${X.ok ? '' : '<div class="cxnear none">⛔ Not enough tether</div>'}`;
    return `<div class="cxmenu cxdrop" data-w="bag" data-id="${id}">${infoHead(id, c, 'The same braid as the door tethers.')}${info}` +
      `<div class="cxacts"><button class="btn alt cxdset" data-cx="dropok" data-id="${id}" ${ok ? '' : 'disabled'}>🪢 Create drop tether</button><button class="btn sm ghost" data-cx="mclose">Cancel</button></div></div>`; }
  function bagHTML(inModal) { if (st.menu && st.menu.w !== 'bag') st.menu = null; return gridsHTML(inModal, false); } // the Backpack (tab, modal, map sheet): carried items only, never the vault
  function xferHTML() { return gridsHTML(true, true); }
  // the Backpack as a bottom sheet over the map's Character view (about a third of the screen) until closed
  function sheetHTML() { return `<div class="bsh"><button class="bsx kX" data-cx="sclose" aria-label="Close the backpack">✕</button></div><div class="bsb cxgrid" data-cxv="sheet">${equipHTML()}${gridHTML('bag')}${st.menu && st.menu.w === 'bag' ? menuHTML() : ''}</div>`; } // map sheet: all 20 slots, no title / gauge / footer, no scroll
  function pinBagScroll(on) { document.documentElement.classList.toggle('bag-open', !!on); const pin = () => { if (window.scrollX || window.scrollY) window.scrollTo(0, 0); }; if (st._pin) { window.removeEventListener('scroll', st._pin); st._pin = null; } pin(); if (on) window.addEventListener('scroll', st._pin = pin, { passive: true }); }
  function sheet(on) { let el = document.getElementById('bagSheet'); if (!el && on) { el = document.createElement('div'); el.id = 'bagSheet'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Backpack'); (document.getElementById('cityWrap') || document.body).appendChild(el); }
    if (on && typeof Skills !== 'undefined' && Skills.screenOn && Skills.screenOn()) Skills.screen(false);
    st.sheet = !!on; st.menu = null; pinBagScroll(!!on); if (!el) return false; el.classList.toggle('on', !!on); el.innerHTML = on ? sheetHTML() : ''; const b = document.getElementById('exBagBtn'); if (b) b.classList.toggle('sel', !!on); return !!on; }
  const sheetOn = () => !!st.sheet;
  // long-press opens the stack menu; a plain tap moves the whole stack
  let lp = null; const LP_MS = 450;
  document.addEventListener('pointerdown', (e) => { const t = e.target.closest('.cxs.full'); if (!t) return; lp = { t, x: e.clientX, y: e.clientY, fired: false, tm: setTimeout(() => { if (!lp) return; lp.fired = true; const cv = t.closest('[data-cxv]'); st.menu = { w: t.dataset.w, id: t.dataset.id, x: !!cv && cv.dataset.cxv === 'xfer' }; refresh(); }, LP_MS) }; });
  document.addEventListener('pointermove', (e) => { if (lp && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 10) { clearTimeout(lp.tm); lp = null; } });
  document.addEventListener('pointerup', () => { if (lp && !lp.fired) clearTimeout(lp.tm); });
  document.addEventListener('contextmenu', (e) => { if (e.target.closest('.cxs')) e.preventDefault(); });
  document.addEventListener('click', (e) => { const t = e.target.closest('.cxs.full'); if (!t) return; if (lp && lp.fired) { lp = null; return; } lp = null; const w = t.dataset.w, id = t.dataset.id, to = w === 'bag' ? 'vault' : 'bag', cv = t.closest('[data-cxv]'); if ((ITEMS[id] && ITEMS[id].kind === 'teth') || !cv || cv.dataset.cxv !== 'xfer') { st.menu = { w, id, x: !!cv && cv.dataset.cxv === 'xfer' }; return refresh(); }
    const n = move(w, to, id, w === 'bag' && t.dataset.n ? +t.dataset.n : get(w, id)); if (!n && typeof toast === 'function') toast(to === 'bag' ? '🎒 Backpack is full - free a slot first' : '🔒 Vault is full'); refresh(); });
  const cost = (r, x) => Object.keys(r.in).map((k) => `<span class="cxc${have(k) >= r.in[k] * x ? '' : ' short'}">${ico(k)}${r.in[k] * x} ${esc(ITEMS[k].short)}<small>/${fmt(have(k))}</small></span>`).join('');
  function recipeHTML(kind) { const F = kind === 'furnace', list = F ? SMELT : SMITH;
    let h = `<div class="cxp" data-cxv="${kind}"><div class="row between"><h2>${F ? '🔥 Furnace' : '⚒️ Anvil'}</h2><span class="tag">placeholder recipes</span></div><div class="dim">${F ? 'Smelt ore into ingots. Ore is taken from your backpack first, then the vault.' : 'Hammer ingots into tools. Ingots are taken from your backpack first, then the vault.'}</div>${qtyBar()}${destBar()}`;
    // anvil: one category at a time (top tabs Pickaxes / Climbing Picks / Tethers; Tethers splits Ledge Tethers vs Wren's own Tether), each listed by material tier - no long scroll
    if (!F) { h += `<div class="cxtabs">${ANV_CAT.map(([k, l, e]) => `<button class="cxtab${st.acat === k ? ' on' : ''}" data-cx="acat" data-v="${k}"><span>${e}</span>${l}</button>`).join('')}</div>`;
      if (st.acat === 'teth' && TETH_SUB.length > 1) h += `<div class="cxq cxsub">${TETH_SUB.map(([k, l]) => `<button class="btn sm ${st.atool === k ? 'alt' : 'ghost'}" data-cx="atool" data-v="${k}">${l}</button>`).join('')}</div>`; }
    const tool = F ? null : st.acat === 'teth' ? (TETH_SUB.some((q) => q[0] === st.atool) ? st.atool : 'lifeline') : st.acat; h += '<div class="card cxl">';
    for (let i = 0; i < list.length; i++) { const r = list[i], x = st.qty === 'all' ? Math.max(1, maxMake(r)) : st.qty, it = ITEMS[r.out];
      if (!F && r.tool !== tool) continue;
      h += `<div class="cxr rec" data-out="${r.out}">${ico(r.out)}<span class="cxn">${esc(it.name)}<small class="cxcs">${cost(r, x)}</small></span><button class="btn sm ${canMake(r, x) ? 'alt' : 'ghost'}" data-cx="make" data-k="${kind}" data-i="${i}" ${canMake(r, x) ? '' : 'disabled'}>${F ? 'Smelt' : 'Smith'} ×${x}</button></div>`; }
    return h + '</div><button class="btn ghost" data-cx="close">Close</button></div>'; }
  function skinsHTML() { const K = skins(); let h = '';
    for (const kind of ['climb', 'tlink']) { h += `<h3 class="cxskH">${kind === 'climb' ? '🧗 Climbing picks' : '🪢 Climbing tether'}</h3><div class="card cxl">`;
      for (const g of SKIN_LOOKS[kind]) { const on = (S[SKIN_KEY[kind]] || SKIN_BASE[kind]) === g, own = !!K[kind][g], p = SKIN_PRICE[g] || 100, base = g === SKIN_BASE[kind];
        h += `<div class="cxr cxsk" data-kind="${kind}" data-g="${g}"><span class="cxsw" style="--c:${(TIERS.find((q) => q[0] === g) || [0, 0, g === 'stone' ? '#8d8a82' : '#6a7d36'])[2]}"></span><span class="cxn">${esc(SKIN_NAME(kind, g))}<small>${base ? 'Base look' : own ? 'Owned' : `💠 ${p} Lumen Crystals`} · cosmetic only</small></span>`
          + (on ? '<button class="btn sm ghost" disabled>Wearing</button>' : own ? `<button class="btn sm alt" data-cx="skwear" data-kind="${kind}" data-g="${g}">Wear</button>` : `<button class="btn sm ${crystals() >= p ? 'alt' : 'ghost'}" data-cx="skbuy" data-kind="${kind}" data-g="${g}" ${crystals() >= p ? '' : 'disabled'}>Buy 💠 ${p}</button>`) + '</div>'; }
      h += '</div>'; }
    return h; }
  function exHTML() { const S2 = st.tab === 'sell', SK = st.tab === 'skins';
    let h = `<div class="cxp" data-cxv="exchange"><div class="row between"><h2>💠 ${SK ? 'Skins' : S2 ? 'Sell' : 'Buy'}</h2>${SK ? `<span class="tag cxcr">💠 ${fmt(crystals())} Lumen Crystals</span>` : `<span class="tag cxgd">${fmt(gold())}${COIN}</span>`}</div><div class="dim">${SK ? 'Looks for your climbing gear. Cosmetic only: every look climbs the same.' : 'The crystal trades with the Hollow for gold coins. Placeholder local market prices.'}</div>`;
    h += `<div class="cxq">${[['sell', 'Sell'], ['buy', 'Buy'], ['skins', 'Skins']].map(([k, l]) => `<button class="btn sm ${st.tab === k ? 'alt' : 'ghost'}" data-cx="tab" data-v="${k}">${l}</button>`).join('')}</div>`;
    if (SK) return h + `<div class="cxsoon"><b>Get Lumen Crystals</b><small>Coming soon. Lumen Crystals will only ever buy looks.</small><button class="btn sm ghost" disabled>Coming soon</button></div>` + skinsHTML() + '<button class="btn ghost" data-cx="close">Close</button></div>';
    h += qtyBar();
    const ids = S2 ? allIds() : Object.keys(ITEMS).filter((id) => !SKIP_SHOP[ITEMS[id].kind] && !ITEMS[id].tiered && !ITEMS[id].climbGear && !ITEMS[id].winch); /* (a tiered pickaxe is only made at Theus's forge) */
    h += ids.length ? `<div class="card cxl">${ids.map((id) => { const p = S2 ? sellP(id) : buyP(id), n = st.qty === 'all' ? (S2 ? have(id) : Math.floor(lum() / p)) : st.qty, ok = S2 ? have(id) >= Math.max(1, n) : lum() >= p * Math.max(1, n);
      return `<div class="cxr" data-id="${id}">${ITEMS[id].tiered ? `<span class="cxtw">${ico(id)}${tb(id)}</span>` : ico(id)}<span class="cxn">${esc(nm(id))}<small>${fmt(p)}${COIN} each${S2 ? ' · have ' + fmt(have(id)) : ''}</small></span><button class="btn sm ${ok ? 'alt' : 'ghost'}" data-cx="${S2 ? 'sell' : 'buy'}" data-id="${id}" ${ok && n > 0 ? '' : 'disabled'}>${S2 ? 'Sell' : 'Buy'} ×${Math.max(1, n)}</button></div>`; }).join('')}</div>` : '<div class="card dim">Nothing to sell. Bring ore, ingots or tools.</div>';
    return h + '<button class="btn ghost" data-cx="close">Close</button></div>'; }
  const VIEW = { bag: () => bagHTML(true), xfer: xferHTML, furnace: () => recipeHTML('furnace'), anvil: () => recipeHTML('anvil'), exchange: exHTML };
  function open(kind) { if (typeof openModal !== 'function' || !VIEW[kind]) return false; st.kind = kind; st.menu = null; openModal(VIEW[kind](), 'cx-' + kind); return true; }
  function refresh() { const sh = document.getElementById('bagSheet'); if (st.sheet && sh) sh.innerHTML = sheetHTML(); const b = document.getElementById('modalBody'); if (st.kind && b && typeof ui !== 'undefined' && ui.modal === 'cx-' + st.kind) b.innerHTML = VIEW[st.kind](); else if (typeof ui !== 'undefined' && ui.tab === 'bag' && typeof rerender === 'function') rerender(true); if (typeof save === 'function') try { save(); } catch (e) {} }
  const nOf = (avail) => (st.qty === 'all' ? avail : Math.min(st.qty, avail));
  document.addEventListener('click', (e) => { const t = e.target.closest('[data-cx]'); if (!t || t.disabled) return; const a = t.dataset.cx, id = t.dataset.id;
    if (a === 'close') return typeof closeModal === 'function' && closeModal();
    if (a === 'sclose') return sheet(false);
    if (a === 'qty') st.qty = t.dataset.v === 'all' ? 'all' : +t.dataset.v; else if (a === 'dest') st.dest = t.dataset.v; else if (a === 'tab') st.tab = t.dataset.v; else if (a === 'acat') st.acat = t.dataset.v; else if (a === 'atool') st.atool = t.dataset.v;
    else if (a === 'xfer') return open('xfer');
    else if (a === 'mclose') st.menu = null;
    else if (a === 'dropok') { st.menu = null; const r = typeof Explore !== 'undefined' && Explore.dropCreate ? Explore.dropCreate(id) : null; if (r && !r.err) { if (st.sheet) sheet(false); else if (typeof closeModal === 'function') closeModal(); return; } }
    else if (a === 'dset') { const sid = id; st.menu = null; const r = typeof Explore !== 'undefined' && Explore.drillSetup ? Explore.drillSetup(sid) : null; if (r && !r.err) { if (st.sheet) sheet(false); else if (typeof closeModal === 'function') closeModal(); return; } }
    else if (a === 'equip') { if (equip(id) && typeof toast === 'function') toast(`✅ Equipped ${nm(id)}`); st.menu = null; }
    else if (a === 'unequip') { if (unequip(id) && typeof toast === 'function') toast(`🎒 ${nm(id)} back in the backpack`); st.menu = null; }
    else if (a === 'mv' || a === 'mvc') { const M = st.menu; if (M) { const c = get(M.w, M.id), q = a === 'mvc' ? Math.max(0, Math.floor(+(t.closest('.cxmenu').querySelector('.cxin') || {}).value || 0)) : t.dataset.n === 'all' ? c : +t.dataset.n, to = M.w === 'bag' ? 'vault' : 'bag'; const n = move(M.w, to, M.id, Math.min(q, c)); if (!n && q > 0 && typeof toast === 'function') toast(to === 'bag' ? FULL : '🔒 Vault is full'); } st.menu = null; }
    else if (a === 'dep') move('bag', 'vault', id, nOf(get('bag', id))); else if (a === 'wd') { if (get('vault', id) > 0 && !move('vault', 'bag', id, nOf(get('vault', id)))) fullMsg(); }
    else if (a === 'make') { const r = (t.dataset.k === 'furnace' ? SMELT : SMITH)[+t.dataset.i]; const x = st.qty === 'all' ? maxMake(r) : st.qty; if (make(r, x, st.dest) && typeof toast === 'function') toast(`${t.dataset.k === 'furnace' ? '🔥' : '⚒️'} ${x}× ${nm(r.out)} → ${st.dest === 'vault' ? 'Vault' : 'Backpack'}`); }
    else if (a === 'skbuy') { if (skinBuy(t.dataset.kind, t.dataset.g) && typeof toast === 'function') toast(`💠 ${SKIN_NAME(t.dataset.kind, t.dataset.g)} unlocked`); }
    else if (a === 'skwear') { if (skinWear(t.dataset.kind, t.dataset.g) && typeof toast === 'function') toast(`✨ Wearing ${SKIN_NAME(t.dataset.kind, t.dataset.g)}`); }
    else if (a === 'sell') { const n = sell(id, nOf(spare(id))); if (n && typeof toast === 'function') toast(`💠 Sold ${n}× ${nm(id)}`); }
    else if (a === 'buy') { const n = buy(id, nOf(Math.floor(lum() / buyP(id)))); if (n && typeof toast === 'function') toast(`💠 Bought ${n}× ${nm(id)}`); }
    refresh(); });
  return { TPICK, pickTier, equippedPickTierN, BAG_N, VAULT_N, order, fits, equip, unequip, equipped, worn, spare, addAll, WINCH_BASE, BASE_GEAR, FULL, migrateWinch, migrateWorn, svgIco, onyxFilter, tintIco, ONYX_HEX, ITEMS, SMELT, SMITH, MILL, TIERS, STAND_ID, STAND_T, STAND_OLD, BIT_T, CLIMB_BASE, TLINK_BASE, SKIN_LOOKS, SKIN_BASE, SKIN_PRICE, SKIN_NAME, skins, skinOwned, skinBuy, skinWear, crystals, gold, COIN, COIN_RATE, migrateClimbGear, bag, get, add, addUpTo, room, perSlot, STACK, STACK_DRILL, STACK_MAX, migrateBagStacks, have, take, move, make, maxMake, canMake, sell, buy, value, sellP, buyP, open, bagHTML, st, sheet, sheetOn, ICON: svgIco, nm, migrateDrillSplit, migrateStandUnify };
})();

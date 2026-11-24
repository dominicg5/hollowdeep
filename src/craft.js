/* ---------- Backpack, Vault transfer, Furnace, Anvil, Lumen exchange (data-driven placeholders) ---------- */
const Craft = (() => {
  // ---- item catalogue: id -> {name, emoji, col}; ids are kind:key
  const ORE_T = [['copper', 'Copper', '#e0874a'], ['tin', 'Tin', '#dfe2da'], ['iron', 'Iron', '#b4583a'], ['coal', 'Coal', '#3a383e'], ['gold', 'Gold', '#ffd25a'], ['mithril', 'Mithril', '#bfe0ff'], ['runite', 'Runite', '#d2b8ff'], ['lumenite', 'Lumenite', '#8ff6ff'], ['onyx', 'Ember Onyx', '#ff4a1c']];
  const TIERS = [['bronze', 'Bronze', '#c07a3c'], ['iron', 'Iron', '#7d8288'], ['steel', 'Steel', '#9aa4ae'], ['gold', 'Gold', '#e6b640'], ['mithril', 'Mithril', '#9cc0e6'], ['rune', 'Rune', '#7a56c8'], ['lumen', 'Lumen', '#2f6fe0'], ['onyx', 'Ember Onyx', '#ff5a28']];
  const TOOLS = [['pick', 'Pickaxe', '⛏️'], ['climb', 'Climbing picks', '🧗'], ['tlink', 'Tether links', '🔗']];
  const ITEMS = {};
  for (const [k, n, c] of ORE_T) ITEMS['ore:' + k] = { name: n + ' ore', short: n, emoji: '🪨', col: c, kind: 'ore', base: 2 };
  TIERS.forEach(([k, n, c], i) => { ITEMS['ingot:' + k] = { name: n + ' ingot', short: n, emoji: '🧱', col: c, kind: 'ingot', tier: i };
    for (const [t, tn, e] of TOOLS) ITEMS['tool:' + t + '_' + k] = { name: n + ' ' + tn.toLowerCase(), short: n, emoji: e, col: c, kind: 'tool', tool: t, tier: i, climbGear: t === 'climb' || t === 'tlink' || undefined }; });
  // (Dominic) climbing gear has no grades now: everyone carries the Iron climbing picks and the Bronze climbing tether; every other look is a cosmetic skin (Lumen Crystals).
  // The other grades' ids stay defined only so old saves migrate (migrateClimbGear); they are never made, bought, sold or shown.
  const CLIMB_BASE = 'tool:climb_iron', TLINK_BASE = 'tool:tlink_bronze';
  ITEMS[CLIMB_BASE].name = 'Iron Climbing Picks'; ITEMS[TLINK_BASE].name = 'Bronze Climbing Tether'; ITEMS[TLINK_BASE].emoji = '🪢';
  // (Dominic: "There should have never been a winch for the Ledge tether system") the hip ascender is its own fixed gear, always worn: not a tool, never made, bought,
  // sold, listed, carried or stored. The old anvil-made Ledge Tether winch (tool:lifeline_*) is gone; old saves drop it with a refund (migrateWinch v2)
  const WINCH_BASE = 'gear:winch_iron'; ITEMS[WINCH_BASE] = { name: 'Iron Winch', short: 'Winch', emoji: '🪝', col: (TIERS.find((q) => q[0] === 'iron') || [])[2], kind: 'gear', winch: true, grade: 'iron' };
  // (Dominic) equipped gear lives in equipment slots, never in the backpack grid or its slot count: the base gear (always worn) and the pickaxe in her hand (S.worn.pick)
  const BASE_GEAR = [CLIMB_BASE, TLINK_BASE, WINCH_BASE], isBase = (id) => BASE_GEAR.includes(id);
  const FULL = '🎒 Backpack full'; const fullMsg = (m) => { if (typeof toast === 'function') toast(m || FULL); return false; };
  // Theus's tiered pickaxe (Dominic: the tier lives on the item): one per kind at most, its own id (never a plain pickaxe, never payment); its tier is S.tpicks[kind] while it exists
  TIERS.forEach(([k, n, c], i) => { ITEMS['tool:tpick_' + k] = { name: n + ' Pickaxe (tiered)', short: n, emoji: '⛏️', col: c, kind: 'tool', tool: 'pick', tier: i, grade: k, tiered: true }; });
  // swords (Dominic via Art): one per grade, its tier lives on the item (S.tswords[grade], T0..T10). Held in either hand from the Character screen.
  // Stat plan (design only, not wired yet): a sword tier step = the pickaxe tier step +50%; strength + accuracy come from the sword, defence from an off-hand shield.
  TIERS.forEach(([k, n, c], i) => { ITEMS['tool:sword_' + k] = { name: n + ' Sword', short: n, emoji: '🗡️', col: c, kind: 'tool', tool: 'sword', tier: i, grade: k, sword: true }; });
  const SWORD_STAT_PLAN = { tierStepK: 1.5, sword: ['strength', 'accuracy'], shield: ['defence'] };
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
  const TOOL_COST = { pick: 3, climb: 2, tlink: 1 }, TOOL_EXTRA = {};
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
  for (const [t] of TOOLS) if (t !== 'tlink' && t !== 'climb') TIERS.forEach(([k], i) => { const n = Math.round(TOOL_COST[t] * 1.55 ** i), inp = { ['ingot:' + k]: n }; if (TOOL_EXTRA[t]) inp[TOOL_EXTRA[t] + k] = 2; SMITH.push({ out: 'tool:' + t + '_' + k, in: inp, tool: t }); });
  // (Dominic: "Prices are all determined by what the players list them at. There will be no set prices except the most basic tools like stickaxe")
  // no shop prices: ores, bars and pickaxes are never sold to or bought from the shop (the Stickaxe is her bare-hand tool, always free, not an item)
  // the one fixed-price item (Dominic: "Sell the Bronze pickaxe at a fixed price"): bought only, the shop never buys it back
  const SHOP = { 'tool:pick_bronze': 345 };
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
  function bag() { if (!S.backpack) S.backpack = {}; if (!S.mdSeed) { S.mdSeed = 1; const n = S.drills ? S.drills.left : 20; if (n > 0) { S.backpack[STAND_ID] = (S.backpack[STAND_ID] || 0) + n; S.backpack['bit:mithril'] = (S.backpack['bit:mithril'] || 0) + n; } } migrateDrillSplit(); migrateStandUnify(); migrateClimbGear(); migrateWinch(); if (!S.tetherSeed) { S.tetherSeed = 1; S.backpack['tether:bronze'] = (S.backpack['tether:bronze'] || 0) + 1500; } migrateWorn(); syncWorn(); notesFix(S.backpack); return S.backpack; } // first run: Drill Stands + Mithril bits, one pair per drill left; new saves get a 1.5 km Bronze starter coil (the mill rolls the rest), older saves carry tetherSeed and keep what they have
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
    for (const id of [CLIMB_BASE, TLINK_BASE]) { const k = id.slice(5), n = Math.floor(b[id] || 0) + Math.floor(v.gear[k] || 0); if (n > 1) got.extra = (got.extra || 0) + n - 1; delete b[id]; delete v.gear[k]; } } // (the base pair is worn, in its equipment slot)
  // old saves: the anvil-made Ledge Tether winch (tool:lifeline_<grade>, every grade, Iron too) is dropped from the backpack, the vault and the player's Exchange
  // listings; its ingots come back (its old anvil recipe, round(4 x 1.55^tier)), as the climbing-gear migration refunds. v1 (other grades -> Iron) already refunded those.
  const LEGACY_WINCH = 'tool:lifeline_', LEGACY_WINCH_COST = 4;
  function migrateWinch() { if (typeof S === 'undefined' || !S || S.winchV >= 2) return; S.winchV = 2; const b = S.backpack || (S.backpack = {}), v = S.ledgeVault || (S.ledgeVault = {}); v.gear = v.gear || {};
    const got = S.winchMigrated = Object.assign({ winch: [], refund: {} }, S.winchMigrated || {}, { v2: { dropped: {}, refund: {} } }), d = got.v2;
    const pay = (g, n) => { const i = TIERS.findIndex((q) => q[0] === g); if (i < 0 || !(n > 0)) return; const ing = 'ingot:' + g, back = n * Math.round(LEGACY_WINCH_COST * 1.55 ** i); b[ing] = (b[ing] || 0) + back; d.refund[ing] = (d.refund[ing] || 0) + back; got.refund[ing] = (got.refund[ing] || 0) + back; d.dropped[g] = (d.dropped[g] || 0) + n; if (!got.winch.includes(g)) got.winch.push(g); };
    for (const id of Object.keys(b)) if (id.startsWith(LEGACY_WINCH)) { pay(id.slice(LEGACY_WINCH.length), Math.floor(b[id] || 0)); delete b[id]; }
    for (const k of Object.keys(v.gear)) if (k.startsWith('lifeline_')) { pay(k.slice(9), Math.floor(v.gear[k] || 0)); delete v.gear[k]; }
    for (const ord of [S.bagOrder, S.vaultOrder]) if (Array.isArray(ord)) for (let i = 0; i < ord.length; i++) if (typeof ord[i] === 'string' && ord[i].startsWith(LEGACY_WINCH)) ord[i] = null;
    const ex = S.exchange; if (ex && Array.isArray(ex.mine)) ex.mine = ex.mine.filter((m) => { const k = m && (m.k || m.id); if (typeof k !== 'string' || !(k.startsWith(LEGACY_WINCH) || k.startsWith('lifeline_'))) return true; pay(k.replace(LEGACY_WINCH, '').replace('lifeline_', ''), Math.floor(m.qty || 1)); return false; });
    if (S.mill && Array.isArray(S.mill.jobs)) S.mill.jobs = S.mill.jobs.filter((j) => { const o = j && (j.out || j.id); if (typeof o !== 'string' || !o.startsWith(LEGACY_WINCH)) return true; pay(o.slice(LEGACY_WINCH.length), Math.floor(j.n || j.qty || 1)); return false; }); }
  // old saves (once): the equipped gear leaves the backpack / vault for its equipment slot (a save fix, not a player action)
  const wornPickOf = () => { const g = S.pickGrade; return g && g !== 'stick' && TIERS.some((q) => q[0] === g) ? (S.pickEqT === g ? 'tool:tpick_' + g : 'tool:pick_' + g) : null; };
  function migrateWorn() { if (typeof S === 'undefined' || !S || S.wornV >= 1) return; S.wornV = 1; const b = S.backpack || (S.backpack = {}), v = S.ledgeVault || (S.ledgeVault = {}); v.gear = v.gear || {}; const W = S.worn = { pick: null }, out = { base: 0, pick: null };
    for (const id of BASE_GEAR) { out.base += Math.floor(b[id] || 0) + Math.floor(v.gear[id.slice(5)] || 0); delete b[id]; delete v.gear[id.slice(5)]; }
    const id = wornPickOf(), k = id && id.slice(5); if (id && b[id] > 0) { if (!--b[id]) delete b[id]; W.pick = id; out.pick = 'bag'; } else if (id && v.gear[k] > 0) { if (!--v.gear[k]) delete v.gear[k]; W.pick = id; out.pick = 'vault'; }
    S.wornMigrated = out; }
  const worn = () => (typeof S !== 'undefined' && S ? (S.worn || (S.worn = { pick: null })) : { pick: null });
  function vault() { const v = S.ledgeVault || (S.ledgeVault = {}); for (const k of ['ores', 'ingots', 'gear', 'lines', 'coils']) v[k] = v[k] || {}; migrateDrillSplit(); migrateStandUnify(); if (!S.coilSeed) S.coilSeed = 1; return v; } // the free 5000 m of every grade is gone now the mill rolls braid; saves seeded before keep their coils
  // ---- bank notes (t591u, Dominic): 'Withdraw as note' on the vault screen takes a stack out as one note (note:<item id>, its count = the items it stands for)
  // that sits in one backpack slot. A note can't be used or equipped; it trades at the Lumen Crystal and Theus takes pickaxe notes as payment; depositing it at
  // the vault turns it back into the items. Notes live in S.backpack like any item (hollowdeep.save.v1: an extra key, nothing renamed).
  const NOTE = 'note:', isNote = (id) => typeof id === 'string' && id.startsWith(NOTE), noteOf = (id) => id.slice(NOTE.length);
  const noteable = (id) => { const it = ITEMS[id]; return !!it && !isNote(id) && !it.tiered && it.kind !== 'teth' && it.unit !== 'm' && !isBase(id); };
  function noteDef(id) { const nid = NOTE + id; if (ITEMS[nid]) return nid; const it = ITEMS[id]; if (!it || !noteable(id)) return null; ITEMS[nid] = { name: it.name + ' (note)', short: (it.short || it.name) + ' note', emoji: '📜', col: '#e9dcb4', kind: 'note', of: id, note: true }; return nid; }
  function notesFix(b) { const Q = S.noteQ; if (Q) { for (const k of Object.keys(Q)) if (noteDef(noteOf(k))) { b[k] = (b[k] || 0) + Q[k]; delete Q[k]; } if (!Object.keys(Q).length) delete S.noteQ; }
    for (const k of Object.keys(b)) if (isNote(k) && !noteDef(noteOf(k))) { const q = S.noteQ || (S.noteQ = {}); q[k] = (q[k] || 0) + b[k]; delete b[k]; } } // (a note this build can't resolve is never dropped: it is quarantined whole in S.noteQ, saved, and comes back to the backpack once its item resolves again)
  const noteCount = (id) => Math.floor((bag()[NOTE + id]) || 0);
  const carried = (id) => get('bag', id) + noteCount(id); // (items + bank-note items carried, never the vault)
  function takeCarried(id, n) { n = Math.floor(n); if (!(n > 0) || carried(id) < n) return false; const a = Math.min(noteCount(id), n), b = n - a; if (a) add('bag', noteDef(id), -a); if (b) add('bag', id, -b); return true; } // notes first, then loose ones; Theus accepts the note itself (the unused part stays on the note)
  // ---- the vault rule (t591u, Dominic): nothing leaves the vault unless she is physically at a vault (within its interaction range) AND the Backpack ⇄ Vault
  // screen is open. Each opener passes its own live range check (open('xfer', near): the house Vault, a drop tether's Open vault, Ambrose at the bank); it is
  // re-checked on every take, so walking away with the screen open stops withdrawals. The one exception is the Ledge Tether draw (Craft.tetherDraw: Ledge
  // Tether coils only, e.g. a home strand swap or the Mole fetching tether; outside this file, a wired drill's coal push down its Ledge Tether strand, marked
  // VAULT-OK in explore.js). Every other take is backpack only.
  const atVault = () => { if (typeof ui === 'undefined' || ui.modal !== 'cx-xfer' || st.kind !== 'xfer' || typeof st.near !== 'function') return false; try { return !!st.near(); } catch (e) { return false; } };
  let TDRAW = 0, MDRAW = 0, UNDO = 0; const VBLOCK = []; function tetherDraw(fn) { TDRAW++; try { return fn(); } finally { TDRAW--; } }
  function moleDraw(fn) { MDRAW++; try { return fn(); } finally { MDRAW--; } } // (t598u: the Mole may fetch any vault item)
  const isTeth = (id) => !!(ITEMS[id] && ITEMS[id].kind === 'teth'); // (Ledge Tether coils: the only thing a tether draw may take from the vault)
  const vaultOK = (id) => atVault() || MDRAW > 0 || (TDRAW > 0 && isTeth(id)) || UNDO > 0; // (UNDO: addAll putting back what it just stored, never a net take)
  function vSlot(id) { const [kind, key] = id.split(':'), v = vault(); return kind === 'ore' ? [v.ores, key] : kind === 'ingot' ? [v.ingots, key] : kind === 'tether' ? [v.coils, key] : [v.gear, key]; }
  function get(where, id) { if (where === 'bag') return Math.floor(bag()[id] || 0); if (isNote(id)) return 0; /* (notes never sit in the vault) */ if (RES[id]) return Math.floor((S.res && S.res[RES[id]]) || 0); const [o, k] = vSlot(id); return Math.floor(o[k] || 0); }
  // ---- slot grids: the backpack has BAG_N slots, the vault VAULT_N. S.bagOrder / S.vaultOrder keep which kind sits in which slot (counts stay in S.backpack / the vault store).
  // (Dominic) Backpack: ores, coal, bars and every other non-tool item stack to STACK (500) per slot, the 501st starts a new slot; pickaxes and other tools take one slot each;
  // drill stands and bits stack to 12 per slot; Ledge Tether length (metres) stacks in one slot. Vault: every kind sits in one slot, tools included, up to STACK_MAX (the largest exact whole number a save holds).
  const BAG_N = 20, VAULT_N = 2000, /* (t591u, Dominic) 2000 vault slots; the grid draws only the rows in view */ STACK = 500, STACK_DRILL = 12, STACK_MAX = Number.MAX_SAFE_INTEGER;
  const perSlot = (id) => { const it = ITEMS[id]; if (!it) return STACK; if (it.unit === 'm' || it.kind === 'note') return STACK_MAX; /* (a note: one slot, however many it stands for) */ if (it.kind === 'stand' || it.kind === 'bit' || it.kind === 'drill') return STACK_DRILL; return it.kind === 'tool' ? 1 : STACK; }; // (Dominic: drill stands and bits stack to 12)
  const slotsFor = (where, id, c) => (c <= 0 ? 0 : where === 'bag' ? Math.ceil(c / perSlot(id)) : 1);
  // old saves (unlimited stacks): split the backpack into 500-slots and single tool slots once; whatever no longer fits goes to the vault, nothing is lost
  function migrateBagStacks() { if (typeof S === 'undefined' || !S || S.bagStackV >= 2) return; S.bagStackV = 2; S.bagStack500 = 1; /* v1: 500-slots + single tools; v2: stands / bits 12 per slot */ const b = bag(); let O = Array.isArray(S.bagOrder) ? S.bagOrder : [];
    const ids = Object.keys(b).filter((k) => b[k] > 0), eq = ids.filter((k) => equipped(k)), pri = [...new Set([...eq, ...O.filter((k) => k && ids.includes(k)), ...ids])];
    let free = BAG_N; const moved = {};
    for (const id of pri) { const c = Math.floor(b[id]), need = slotsFor('bag', id, c), got = Math.min(need, free), keep = Math.min(c, got * perSlot(id)); free -= got;
      if (keep < c) { const v = c - keep; if (vaultAdd(id, v)) { b[id] = keep; moved[id] = v; if (!keep) delete b[id]; } } }
    S.bagOrder = O.slice(0, BAG_N).map((k) => (k && b[k] > 0 ? k : null)); for (let i = 0; i < S.bagOrder.length; i++) if (S.bagOrder.indexOf(S.bagOrder[i]) !== i) S.bagOrder[i] = null;
    S.bagMoved = moved; }
  function vaultAdd(id, n) { if (n <= 0) return true; const O = order('vault'); if (!O.includes(id) && O.slice(0, VAULT_N).filter(Boolean).length >= VAULT_N) return false; if (RES[id]) { S.res[RES[id]] = Math.min(STACK_MAX, (S.res[RES[id]] || 0) + n); } else { const [o, k] = vSlot(id); o[k] = Math.min(STACK_MAX, (o[k] || 0) + n); } order('vault'); return true; }
  const vaultIds = () => Object.keys(ITEMS).filter((id) => get('vault', id) > 0);
  function order(where) { if (where === 'bag') migrateBagStacks(); const key = where === 'bag' ? 'bagOrder' : 'vaultOrder', N = where === 'bag' ? BAG_N : VAULT_N; let O = S[key]; if (!Array.isArray(O)) O = S[key] = [];
    if (where === 'bag') while (O.length < N) O.push(null); /* (the vault's 2000 slots are not padded in the save: a slot past the end is empty) */ const need = {}, cnt = {}; const ids = where === 'bag' ? Object.keys(bag()).filter((k) => bag()[k] > 0) : vaultIds(); for (const id of ids) need[id] = slotsFor(where, id, get(where, id));
    for (let i = O.length - 1; i >= 0; i--) { const id = O[i]; if (!id) continue; if (!need[id]) { O[i] = null; continue; } cnt[id] = (cnt[id] || 0) + 1; } // (a kind drops its last slots first when its count shrinks)
    for (let i = O.length - 1; i >= 0; i--) { const id = O[i]; if (id && cnt[id] > need[id]) { O[i] = null; cnt[id]--; } }
    for (const id of ids) while ((cnt[id] || 0) < need[id]) { const i = O.indexOf(null); if (i < 0 || i >= N) O.push(id); else O[i] = id; cnt[id] = (cnt[id] || 0) + 1; } // (an old save over the limit keeps its extra stacks until they empty)
    while ((where !== 'bag' || O.length > N) && O.length && O[O.length - 1] == null) O.pop(); return O; }
  // how many more of id the container takes: the backpack counts the spare room in its own slots of that kind plus every free slot; the vault, up to STACK_MAX
  function room(where, id) { const O = order(where), N = where === 'bag' ? BAG_N : VAULT_N, c = get(where, id), free = N - O.slice(0, N).filter(Boolean).length;
    if (where !== 'bag') return O.includes(id) || free ? Math.max(0, STACK_MAX - c) : 0; const p = perSlot(id); if (p >= STACK_MAX) return O.includes(id) || free ? Math.max(0, STACK_MAX - c) : 0;
    return Math.max(0, slotsFor('bag', id, c) * p - c) + free * p; }
  function fits(where, id, n) { return room(where, id) >= Math.max(1, n || 1); }
  function add(where, id, n) { if (where !== 'bag' && n < 0 && !vaultOK(id)) { VBLOCK.push([id, n, new Error().stack.split('\n')[2] || '']); if (VBLOCK.length > 20) VBLOCK.shift(); return 0; } /* (the vault rule) */ if (where !== 'bag' && isNote(id)) { if (n <= 0) return 0; return add('vault', noteOf(id), n); } /* (a note deposited = its items) */ if (n > 0 && (isBase(id) || !fits(where, id, n))) return 0; /* (base gear is always worn: never carried or stored) */ if (where === 'bag') { const b = bag(); b[id] = (b[id] || 0) + n; if (b[id] <= 0) delete b[id]; order('bag'); return n; } if (RES[id]) { S.res[RES[id]] = Math.max(0, (S.res[RES[id]] || 0) + n); order('vault'); return n; } const [o, k] = vSlot(id); o[k] = Math.max(0, (o[k] || 0) + n); if (!o[k]) delete o[k]; order('vault'); return n; }
  // all or nothing (several kinds into one container): any that does not fit undoes the rest
  function addAll(where, list) { const done = []; for (const [id, n] of list) { if (!(n > 0)) continue; if (!add(where, id, n)) { UNDO++; try { for (const [i2, n2] of done) add(where, i2, -n2); } finally { UNDO--; } return false; } done.push([id, n]); } return true; }
  function addUpTo(where, id, n) { const r = Math.min(Math.floor(n), room(where, id)); return r > 0 ? add(where, id, r) : 0; } // as many as fit (mining: the rest of that strike is left in the rock)
  const spare = (id) => get('bag', id) + (TDRAW && isTeth(id) ? get('vault', id) : 0); // what can be spent, sold or moved: the backpack only (the vault rule; the Ledge Tether draw also reaches the vault); never the equipped gear
  const have = (id) => get('bag', id) + get('vault', id) + (isNote(id) ? 0 : noteCount(id)) + (isBase(id) || (id && worn().pick === id) ? 1 : 0); // owned, the equipped one included
  const TPICK = (k) => 'tool:tpick_' + k;
  function pickTier(k) { if (typeof S === 'undefined' || !S || have(TPICK(k)) <= 0) return 0; return Math.max(1, Math.min(10, Math.floor((S.tpicks && S.tpicks[k]) || 1))); } // the tiered pickaxe's own tier; no tiered pickaxe = T0
  // the equipped pickaxe's own tier: the tiered one only while it is the one in her hand (plain pickaxes are T0)
  function equippedPickTierN() { const g = typeof S !== 'undefined' && S && S.pickGrade; return g && S.pickEqT === g ? pickTier(g) : 0; }
  function take(id, n) { if (spare(id) < n) return false; const a = Math.min(get('bag', id), n); add('bag', id, -a); if (n - a && !add('vault', id, -(n - a))) { add('bag', id, a); return false; } return true; } // (backpack first; the vault only inside tetherDraw)
  function move(from, to, id, n, asNote) { if (from !== 'bag' && !vaultOK(id)) { if (typeof ui !== 'undefined' && ui.modal === 'cx-xfer' && typeof toast === 'function') toast('🔒 Stand at the vault to take things out'); return 0; } if (asNote === undefined) asNote = from === 'vault' && to === 'bag' && st.note; const nid = asNote && from === 'vault' && noteable(id) ? noteDef(id) : null, tid = nid || id, rid = to === 'vault' && isNote(id) ? noteOf(id) : tid;
    n = Math.min(Math.floor(n), get(from, id), room(to, rid)); if (n <= 0) return 0; add(from, id, -n); add(to, rid, n); return n; } // (withdraw as note: the stack leaves as one note; a note deposited is its items again)
  function smLocked(r) { return !!r && (SMELT.includes(r) || SMITH.includes(r)) && recLocked(r); } // (furnace / anvil recipes under their Smithing level)
  function canMake(r, x) { return Object.keys(r.in).every((k) => spare(k) >= r.in[k] * x); }
  // (t591u + t592u, Dominic) how many the furnace / anvil can actually make: the backpack's ingredients AND backpack room for the output, made one at a time
  // (each one needs room before its ingredients are taken, as make() does). No fixed cap, never the vault. When the output has room for the lot it is just the
  // ingredient count; otherwise it is played out on a copy of the backpack (used-up ingredients can free a slot) and the real backpack is put back untouched.
  function maxMake(r) { if (smLocked(r)) return 0; let c = Infinity; for (const k in r.in) c = Math.min(c, Math.floor(get('bag', k) / r.in[k])); if (!(c > 0) || !ITEMS[r.out]) return 0; if (room('bag', r.out) >= c) return c;
    const b0 = bag(), o0 = S.bagOrder; S.backpack = Object.assign({}, b0); S.bagOrder = Array.isArray(o0) ? o0.slice() : o0; let n = 0;
    try { for (let g = 0; n < c && g < 1e5; g++) { if (room('bag', r.out) >= c - n) { n = c; break; } if (!fits('bag', r.out, 1)) break; for (const k in r.in) add('bag', k, -r.in[k]); add('bag', r.out, 1); n++; } } finally { S.backpack = b0; S.bagOrder = o0; }
    return n; }
  function make(r, x, dest) { if (x <= 0 || !canMake(r, x)) return 0; if (smLocked(r)) { if (typeof toast === 'function') toast('Unlock Lv ' + recLv(r)); return 0; } /* (t624u: the Smithing lock holds on every crafting path, not just the screens) */ if (!fits(dest === 'vault' ? 'vault' : 'bag', r.out, x)) return fullMsg(dest === 'vault' ? '🔒 Vault full' : FULL), 0; /* (room checked before any ingredient is taken) */ for (const k in r.in) take(k, r.in[k] * x); add(dest === 'vault' ? 'vault' : 'bag', r.out, x); if (typeof Skills !== 'undefined') Skills.awardCraft(r, x); return x; }
  // (Dominic) gold is the only free-to-play currency: everything is bought and sold for gold coins (S.gold, Mosby's fare purse). Lumen Crystals are premium only
  // (in-game purchase, 'Coming soon'); nothing in play gives them, and they buy looks only.
  const gold = () => { if (S.gold == null) S.gold = 2500; return Math.floor(S.gold); }, lum = gold;
  const COIN = '<img class="kCoin" src="assets/ui/icons/coin.webp" alt="gold">';
  if (typeof document !== 'undefined' && !document.getElementById('cxSkinCss')) { const e = document.createElement('style'); e.id = 'cxSkinCss'; e.textContent = '.cxsw{flex:none;width:30px;height:30px;border-radius:50%;background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.55),transparent 45%),var(--c);box-shadow:inset 0 0 0 2px rgba(60,35,15,.55);margin-right:6px}.cxskH{margin:10px 0 4px;font-size:15px}.cxsoon{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 10px;margin:6px 0;border-radius:10px;background:rgba(120,170,255,.14);box-shadow:inset 0 0 0 1px rgba(90,130,220,.35)}.cxsoon b{flex:1 1 100%}.cxsoon small{flex:1;opacity:.8}.cxgd{display:inline-flex;align-items:center}'; document.head.appendChild(e); }
  // ---- UI
  const st = { qty: 1, dest: 'bag', tab: 'skins', kind: null, acat: 'pick', atool: null, menu: null, near: null };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (n) => (n >= 1e4 ? Math.round(n / 1000) + 'k' : String(n));
  const ico = (id) => { const it = ITEMS[id] || { emoji: '📦', col: '#888' }; return `<span class="cxi" style="--c:${it.col}">${it.emoji}</span>`; };
  const nm = (id) => { const it = ITEMS[id]; return it ? (it.tiered ? `${TIERS[it.tier][1]} Pickaxe (T${pickTier(it.grade)})` : it.name) : id; };
  const qtyBar = () => /* (vault deposit / withdraw amounts; the furnace and anvil have their own batch picker) */ `<div class="cxq">${[1, 10, 100, 'all'].map((q) => `<button class="btn sm ${st.qty === q ? 'alt' : 'ghost'}" data-cx="qty" data-v="${q}">${q === 'all' ? 'All' : '×' + q}</button>`).join('')}</div>`;
  const destBar = () => `<div class="cxq"><span class="dim">Output to</span>${[['bag', '🎒 Backpack'], ['vault', '🔒 Vault']].map(([k, l]) => `<button class="btn sm ${st.dest === k ? 'alt' : 'ghost'}" data-cx="dest" data-v="${k}">${l}</button>`).join('')}</div>`;
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
  const pic = (id) => { if (isNote(id)) return '<span class="cxi cxNote" aria-label="Bank note">📜</span>'; const it = ITEMS[id], a = it && it.tiered ? 'tool:pick_' + it.grade + '@t' + pickTier(it.grade) : id; return ((typeof itemIco === 'function' && itemIco(a)) || svgIco(it && it.tiered ? 'tool:pick_' + it.grade : a)) + tb(id); }; // (a tiered pickaxe: Art's painted icon for its tier, no tint)
  const tb = (id) => { const it = ITEMS[id]; return it && it.tiered ? `<b class="cxtb">T${pickTier(it.grade)}</b>` : ''; }; // the brass tier badge on a tiered pickaxe's icon
  const badge = (id, c) => { const it = ITEMS[id], m = it && it.unit === 'm'; return `<b class="cxct${m ? ' m' : ''}">${m ? fmtN(c) + ' m' : '×' + fmtN(c)}</b>`; };
  const fmtN = (n) => (n >= 1e9 ? (n / 1e9).toFixed(n >= 1e10 ? 0 : 1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : n >= 1e4 ? Math.floor(n / 1000) + 'k' : String(n));
  const EQUIP = { pick: ['pickGrade', 'setPick', 'Pickaxe'], climb: ['climbGrade', 'setClimb', 'Climbing picks'], tlink: ['tetherGrade', 'setTether', 'Tether'] };
  const equipped = (id) => !!id && (isBase(id) || worn().pick === id);
  const setPickLook = (g) => { if (typeof CharView !== 'undefined' && CharView.setPick) try { CharView.setPick(g); } catch (e) {} };
  // equip a pickaxe: it leaves the backpack (or the vault) for her hand; the one she held goes back to the backpack, or the swap is blocked when there is no room
  // (Dominic) Mining level to equip a pickaxe: Skills.PICK_USE_LEVELS by tier (Bronze 1 ... Ember Onyx 120); the Stickaxe (bare hands) has none. Only a new equip is
  // checked: a pickaxe already in her hand stays there and keeps mining (grandfathered)
  const pickNeed = (id) => { const it = ITEMS[id]; return it && it.tool === 'pick' && typeof Skills !== 'undefined' && Skills.PICK_USE_LEVELS ? Skills.PICK_USE_LEVELS[it.tier] || 1 : 1; };
  const pickLocked = (id) => typeof Skills !== 'undefined' && Skills.level && Skills.level('mining') < pickNeed(id);
  function equip(id) { const it = ITEMS[id]; if (isBase(id)) return true; if (!it || it.kind !== 'tool' || it.tool !== 'pick') return false; if (equipped(id)) { const g = TIERS[it.tier][0]; S.pickGrade = g; S.pickEqT = it.tiered ? g : null; setPickLook(g); return true; }
    if (pickLocked(id)) { if (typeof toast === 'function') toast('Unlock Lv ' + pickNeed(id)); return false; }
    const from = get('bag', id) > 0 ? 'bag' : get('vault', id) > 0 && vaultOK(id) ? 'vault' : null; if (!from) { if (get('vault', id) > 0) fullMsg('🔒 It is in the vault: take it out at the vault first'); return false; } const W = worn(), old = W.pick; if (!add(from, id, -1)) return false;
    if (old && !add('bag', old, 1)) { add(from, id, 1); return fullMsg(); }
    const g = TIERS[it.tier][0]; W.pick = id; S.pickGrade = g; S.pickEqT = it.tiered ? g : null; setPickLook(g); return true; }
  // (Dominic's bug: 'equipping the T10 didn't put my original pickaxe back') the character tab's grade chooser only changed the look (S.pickGrade), leaving the
  // old pickaxe in her hand slot unseen. Now picking a grade there equips the real item (the old one to the backpack); a save already out of step is put right
  // once: the pickaxe she shows is equipped for real if she owns it (the old one to the backpack, or the vault when the backpack is full), else the look goes back.
  const gradeOf = (id) => { const it = id && ITEMS[id]; return it && it.tool === 'pick' ? TIERS[it.tier][0] : 'stick'; };
  function ownedPick(g, tiered) { const ids = tiered ? [TPICK(g), 'tool:pick_' + g] : ['tool:pick_' + g, TPICK(g)]; for (const id of ids) if (ITEMS[id] && (get('bag', id) > 0 || (vaultOK(id) && get('vault', id) > 0))) return id; return null; } // (the vault rule: away from the vault only the backpack's)
  function equipGrade(g) { const W = worn(); if (g === 'stick') return W.pick ? unequip(W.pick) : true; if (gradeOf(W.pick) === g) return true;
    const id = ownedPick(g, true); if (!id) { if (typeof toast === 'function') toast('No ' + TIERS.find((t) => t[0] === g)[1] + ' pickaxe in the backpack'); return false; } return equip(id); }
  let syncing = false;
  function syncWorn() { if (syncing || typeof S === 'undefined' || !S || !S.worn || !S.pickGrade || !(S.wornV >= 1)) return; const W = S.worn, g = S.pickGrade, wg = gradeOf(W.pick); if (g === wg) return; syncing = true;
    try { const id = g !== 'stick' ? ownedPick(g, S.pickEqT === g) : null, old = W.pick;
      if (id) { const from = get('bag', id) > 0 ? 'bag' : 'vault'; if (!add(from, id, -1)) return; if (old) { if (fits('bag', old, 1)) add('bag', old, 1); else add('vault', old, 1); } W.pick = id; S.pickEqT = ITEMS[id].tiered ? g : null;
        S.wornFix = { at: new Date().toISOString(), now: id, back: old || null }; if (old && typeof toast === 'function') setTimeout(() => toast('🎒 ' + nm(old) + ' is back in your ' + (get('bag', old) > 0 ? 'backpack' : 'vault')), 0); }
      else { S.pickGrade = wg; S.pickEqT = W.pick && ITEMS[W.pick].tiered ? wg : null; setPickLook(wg); } } finally { syncing = false; } }
  // unequip: back into the backpack if it has room; full -> blocked with a short message (everywhere, the vault too: it never goes to the vault by itself)
  function unequip(id) { if (isBase(id)) return fullMsg('Everyone wears this one'); const W = worn(); if (!id || W.pick !== id) return false; if (!fits('bag', id, 1)) return fullMsg();
    add('bag', id, 1); W.pick = null; S.pickGrade = 'stick'; S.pickEqT = null; setPickLook('stick'); return true; }
  // (Dominic) no equipment row above the backpack grid: equipped gear just stays out of the grid and its slot count; unequip is on the character tab's pickaxe chooser
  // (t591u) the vault's 2000 slots scroll; only the rows in view (and a few either side) are in the page, the rest is padding (VG: row height, first row)
  const VG = { COLS: 5, ROWS: 14, rh: 64, r0: 0, top: 0 };
  function vaultGridHTML() { const O = order('vault'), n = Math.max(VAULT_N, O.length), R = Math.ceil(n / VG.COLS), r0 = Math.max(0, Math.min(VG.r0, R - VG.ROWS)), r1 = Math.min(R, r0 + VG.ROWS);
    return `<div class="cxvv" data-w="vault"><div class="cxg cxg-vault" data-w="vault" data-r0="${r0}" style="padding-top:${(r0 * VG.rh).toFixed(0)}px;padding-bottom:${((R - r1) * VG.rh).toFixed(0)}px">${slotsHTML('vault', O, r0 * VG.COLS, Math.min(n, r1 * VG.COLS), VAULT_N)}</div></div>`; }
  function vaultScroll(sc) { const g = sc.firstElementChild, c = g && g.querySelector('.cxs'); if (c) { const gap = parseFloat(getComputedStyle(g).rowGap) || 0, rh = c.offsetHeight + gap; if (rh > 8 && Math.abs(rh - VG.rh) > 0.5) { VG.rh = rh; VG.r0 = -1; } }
    VG.top = sc.scrollTop; const r0 = Math.max(0, Math.floor(VG.top / VG.rh) - 3); if (r0 === VG.r0) return; VG.r0 = r0; const box = document.createElement('div'); box.innerHTML = vaultGridHTML(); sc.replaceChild(box.firstElementChild.firstElementChild, g); }
  function vaultHook() { const sc = typeof document !== 'undefined' && document.querySelector('#modalBody .cxvv'); if (!sc || sc.__v) return; sc.__v = 1; sc.scrollTop = VG.top; sc.addEventListener('scroll', () => vaultScroll(sc), { passive: true }); vaultScroll(sc); }
  function slotsHTML(where, O, i0, i1, N) { let h = ''; const seen = {}; if (where === 'bag') for (let i = 0; i < i0; i++) if (O[i]) seen[O[i]] = (seen[O[i]] || 0) + 1;
    for (let i = i0; i < i1; i++) { const id = O[i]; let c = id ? get(where, id) : 0, first = true; if (id && where === 'bag') { const j = seen[id] || 0, p = perSlot(id); seen[id] = j + 1; first = !j; c = p >= STACK_MAX ? c : Math.max(0, Math.min(p, c - j * p)); }
      const one = id && where === 'bag' && perSlot(id) === 1; h += `<div class="cxs${id ? ' full' : ''}${i >= N ? ' over' : ''}${one ? ' one' : ''}${id && isNote(id) ? ' note' : ''}" data-w="${where}" data-s="${i}"${id ? ` data-id="${id}" data-n="${c}" title="${esc(nm(id))}"` : ''}>${id ? pic(id) + (one ? '' : badge(id, c)) : ''}</div>`; }
    return h; }
  function gridHTML(where) { if (where !== 'bag') return vaultGridHTML(); const O = order(where), N = BAG_N; return `<div class="cxg cxg-${where}" data-w="${where}">` + slotsHTML(where, O, 0, Math.max(N, O.length), N) + '</div>'; }
  const used = (w) => order(w).filter(Boolean).length;
  // the Backpack shows only what she carries; the Ledge Vault sits beside it only on the vault's own Backpack ⇄ Vault screen (xfer)
  // (Dominic: field-kit skin, Art's B_* concepts) a brass gauge for slot counts: needle sweeps with how full it is; the numbers are live
  const gauge = (n, N) => `<span class="kGauge" style="--g:${Math.min(1, n / N).toFixed(3)}" role="img" aria-label="${n} of ${N} slots used"><i></i><b>${n} / ${N}</b></span>`;
  function gridsHTML(inModal, xfer) {
    let h = `<div class="cxp cxgrid kKit" data-cxv="${xfer ? 'xfer' : 'bag'}"><div class="kPanel kLeather"><div class="row between kHead"><h2>Backpack</h2>${xfer ? '' : gauge(used('bag'), BAG_N)}${inModal && !xfer ? '<button class="kX" data-cx="close" aria-label="Close">✕</button>' : ''}</div>`;
    h += (xfer ? '' : `<div class="dim kSub">What Wren carries. Tap an item for its options.${typeof Skills !== 'undefined' ? ' · ' + Skills.uiLine() : ''}</div>`) + gridHTML('bag') + (xfer ? '' : '<div class="kFoot">Ores, coal and bars stack to 500 per slot. Drill stands and bits stack to 12. Ledge Tether length stacks in one slot. Other tools take one slot each.</div>') + '</div>';
    if (xfer) h += `<div class="kSwap"><span class="kPlate">⇄</span><small>Tap to move a stack · hold for more (equip, move some). Backpack: ores, coal and bars 500 per slot, drill stands and bits 12, Ledge Tether length in one slot, other tools one slot each. The vault stacks everything in one slot. Withdraw as note: a whole stack comes out as one note (one slot); deposit the note to get the items back.</small></div><div class="kPanel kLeather"><div class="row between kHead"><h2>Ledge Vault</h2><button class="btn sm ${st.note ? 'alt' : 'ghost'} cxnoteT" data-cx="note" aria-pressed="${st.note ? 'true' : 'false'}">📜 Withdraw as note${st.note ? ': on' : ''}</button></div>` + gridHTML('vault') + '</div>';
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
    const it = ITEMS[id] || {}; const req = it.kind === 'tool' && it.tool === 'pick' ? ` Mining Lv ${pickNeed(id)} to equip${pickLocked(id) && !equipped(id) ? ` (🔒 Unlock Lv ${pickNeed(id)})` : ''}.` : '';
    if (req) return (it.tiered ? 'Its tier lives on this pickaxe. Equip it to mine; trade it with players at the Ledgeville Exchange (the shop will not buy it).' : 'Equip it to mine ore out on the map.') + req;
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
  // (Dominic) Drop: any backpack item can be thrown away for good from its tap menu, after a confirm (how many, for a stack); what she has equipped is not in the
  // backpack, so it can't be dropped until it is unequipped
  function menuHTML() { const m = st.menu; if (m.del && m.w === 'bag' && !m.x) return delHTML(m.id); const h = menuHTML0(); if (m.w !== 'bag' || m.x || get('bag', m.id) <= 0) return h;
    const i = h.lastIndexOf('<button class="btn sm ghost" data-cx="mclose">Cancel</button>'); return i < 0 ? h : h.slice(0, i) + `<button class="btn sm ghost kDrop" data-cx="del" data-id="${m.id}">🗑 Drop</button>` + h.slice(i); }
  function delHTML(id) { const c = get('bag', id), u = ITEMS[id] && ITEMS[id].unit === 'm' ? ' m' : '', Q = c > 1 ? [...new Set([1, 10, c].filter((q) => q <= c))] : [1];
    return `<div class="cxmenu cxdel" data-w="bag" data-id="${id}">${infoHead(id, c, 'Drop it for good? It is gone forever: it does not go to the vault or the map.')}<div class="cxacts">`
      + Q.map((q) => `<button class="btn sm ${q === c ? 'alt' : 'ghost'}" data-cx="delok" data-id="${id}" data-n="${q}">🗑 Drop ${q === c && c > 1 ? 'all ' + q : q}${u}</button>`).join('')
      + `<button class="btn sm ghost" data-cx="mclose">Cancel</button></div></div>`; }
  function drop(id, n) { const c = get('bag', id); n = Math.min(Math.floor(n) || 0, c); if (n <= 0) return 0; add('bag', id, -n); if (typeof save === 'function') save(); return n; }
  function menuHTML0() { const { w, id } = st.menu, c = get(w, id), to = w === 'bag' ? 'Vault' : 'Backpack', it = ITEMS[id], E = it && it.kind === 'tool' && EQUIP[it.tool];
    if (it && (it.kind === 'stand' || it.kind === 'drill')) return drillMenuHTML(id, c);
    if (it && it.kind === 'teth' && !st.menu.x) return dropMenuHTML(id, c); // drop-tether confirm only in the backpack; the vault transfer screen needs Move (length / all)
    const u = it && it.unit === 'm' ? ' m' : '';
    return `<div class="cxmenu" data-w="${w}" data-id="${id}">${infoHead(id, c, st.menu.x ? '' : itemBlurb(id, w))}` +
      `<div class="cxacts">` +
      (E ? (it.tool === 'pick' && !equipped(id) && pickLocked(id) ? `<button class="btn sm ghost kLock" data-cx="equip" data-id="${id}" disabled>🔒 Unlock Lv ${pickNeed(id)}</button>` : `<button class="btn sm ${equipped(id) ? 'ghost' : 'alt'}" data-cx="equip" data-id="${id}" ${equipped(id) ? 'disabled' : ''}>${equipped(id) ? 'Equipped' : 'Equip'} (${E[2]})</button>`) : '') +
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
  function sheetHTML() { return `<div class="bsh"><button class="bsx kX" data-cx="sclose" aria-label="Close the backpack">✕</button></div><div class="bsb cxgrid" data-cxv="sheet">${gridHTML('bag')}${st.menu && st.menu.w === 'bag' ? menuHTML() : ''}</div>`; } // map sheet: all 20 slots, no title / gauge / footer, no scroll
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
  const cost = (r, x) => Object.keys(r.in).map((k) => `<span class="cxc${spare(k) >= r.in[k] * x ? '' : ' short'}">${ico(k)}${r.in[k] * x} ${esc(ITEMS[k].short)}<small>/${fmt(spare(k))}</small></span>`).join(''); // (backpack counts: the furnace and anvil take from the backpack only)
  // ---- batch crafting (t591u + t592u, Dominic): pick how many (1 / 5 / 10 / All, − / +, or type it; never more than maxMake), then they are made one at a
  // time, BATCH_MS (exactly 1 s, t599u) each, with a progress bar and Cancel; stopping (Cancel, running short) keeps everything already made; t600u: starting closes the window (HUD pill until done). Backpack only.
  // (t599u) While a batch runs she works the whole time: hammering at the anvil, hands in and out of the furnace (CharView work loop, one loop per item;
  // CC0 Quaternius clips, see CREDITS.md). The walk-in / walk-out movement is still left out (Dominic will revisit it).
  const BATCH_MS = 1000, BQ = { k: null, i: -1, n: 1, q: false }, JOB = { on: false, kind: null, i: -1, n: 0, done: 0, t0: 0, tm: 0, last: null };
  const recOf = (k, i) => (k === 'furnace' ? SMELT : k === 'anvil' ? SMITH : [])[i] || null;
  const clampN = (n, cap) => Math.max(1, Math.min(Math.max(1, cap), Math.floor(+n) || 1));
  const tNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  // ---- the furnace / anvil screens (Art's approved mocks, /workspace/mia/ui/smithing: default, selected, quantity; Dominic t434: no job screen - Start closes the
  // window and the progress lives only in the HUD pill). The window is the station: the painted furnace / anvil fills the top, a leather tray below holds the 4x2
  // recipe grid, the backpack ingredients, the quantity and Start. Backpack only (from and into the backpack, as before); locked recipes say "Unlock Lv N".
  const SMA = 'assets/ui/smithing/';
  const recG = (r) => String(r.out).replace(/^ingot:|^tool:pick_/, '');
  const recLv = (r) => (typeof Skills !== 'undefined' && Skills.smithLevel ? Skills.smithLevel(recG(r)) : 1); // (t624u: Skills.SMITH_LEVELS, one table for a grade's bar and its pickaxe)
  const recLocked = (r) => typeof Skills !== 'undefined' && typeof Skills.level === 'function' && Skills.level('smithing') < recLv(r);
  const smIco = (id) => (typeof itemIco === 'function' && itemIco(id)) || ico(id);
  const smShort = (r) => { const t = TIERS.find((q) => q[0] === recG(r)); return t ? (t[0] === 'onyx' ? 'Onyx' : t[1]) : nm(r.out); };
  const smList = (kind) => (kind === 'furnace' ? SMELT : SMITH).map((r, i) => [r, i]).filter(([r]) => kind === 'furnace' || r.tool === 'pick');
  function smWhy(r) { let c = Infinity, k0 = null; for (const k in r.in) { const m = Math.floor(get('bag', k) / r.in[k]); if (m < c) { c = m; k0 = k; } }
    const m = maxMake(r), fr = Math.max(0, BAG_N - used('bag')); if (c > 0 && m < c) return m > 0 ? `limited by ${fmtN(fr)} free backpack slot${fr === 1 ? '' : 's'}` : 'backpack full';
    return k0 && ITEMS[k0] ? (ITEMS[r.out].tool ? `${fmtN(fr)} backpack slot${fr === 1 ? '' : 's'} free` : 'limited by ' + ITEMS[k0].name.toLowerCase()) : ''; }
  function smCell(kind, r, i) { const lk = recLocked(r), cap = lk ? 0 : maxMake(r), on = BQ.k === kind && BQ.i === i;
    return `<button class="smC${on ? ' on' : ''}${lk ? ' lk' : ''}" type="button" data-cx="make" data-k="${kind}" data-i="${i}" data-out="${r.out}" ${lk ? 'disabled aria-disabled="true"' : ''} aria-pressed="${on}"><span class="smI">${smIco(r.out)}${lk ? '<b class="smLk" aria-hidden="true"></b>' : ''}</span><b class="smN">${esc(smShort(r))}</b><small class="${lk ? 'lv' : cap > 0 ? 'ok' : 'no'}">${lk ? 'Unlock Lv ' + recLv(r) : cap > 0 ? 'Max ' + fmtN(cap) : 'Need more'}</small></button>`; }
  function smIng(r, x) { return `<div class="smP smIng"><h4>In backpack</h4>${Object.keys(r.in).map((k) => { const need = r.in[k] * Math.max(1, x), own = get('bag', k); return `<div class="smRow"><span class="smRi">${smIco(k)}</span><span class="smRn">${esc(ITEMS[k].name)}</span><small class="${own >= need ? '' : 'no'}">${fmtN(need)} needed · ${fmtN(own)} owned</small></div>`; }).join('')}</div>`; }
  function smGo(kind, r, x, cap) { const F = kind === 'furnace', busy = JOB.on, ok = !!r && cap > 0 && !busy && !recLocked(r), it = r && ITEMS[r.out];
    const sub = busy ? `${JOB.kind === 'furnace' ? 'Smelting' : 'Smithing'} ${JOB.done}/${JOB.n} - wait or cancel` : !r ? 'Pick a recipe first' : cap > 0 ? `${fmtN(x)} ${esc(F ? smShort(r) : smShort(r) + ' pickaxe' + (x === 1 ? '' : 's'))} · ${fmtN(x * BATCH_MS / 1000)}s · to backpack` : Object.keys(r.in).every((k) => get('bag', k) >= r.in[k]) ? 'Backpack full' : F ? 'Need more ore' : 'Need more ingots';
    return `<button class="smGo" type="button" data-cx="bgo" ${ok ? '' : 'disabled'}><b>${F ? 'Start smelting' : 'Start smithing'}</b><small class="smGs">${sub}</small></button>`; }
  function smHero(kind, r) { const F = kind === 'furnace'; let on = '';
    if (r && F) on = `<span class="smOn f">${Object.keys(r.in).filter((k) => k !== 'ore:coal').map((k) => `<i>${smIco(k)}</i>`).join('')}</span>`; // (the chosen ore on the hearth, at the mouth)
    else if (r) on = `<span class="smOn a"><i>${smIco(Object.keys(r.in)[0])}</i></span>`; // (the bar on the anvil face)
    return `<div class="smHero"><div class="smArt ${F ? 'f' : 'a'}"><img src="${SMA}${F ? 'furnace_face' : 'anvil_top'}.webp" alt="" draggable="false">${on}</div></div>`; }
  function smQty(r, x, cap) { const Q = [1, 5, 10];
    return `<div class="smMeta">Max ${fmtN(cap)} · ${esc(smWhy(r))}</div><div class="smQ"><button class="smPM m" type="button" data-cx="bq" data-v="-" aria-label="One less" ${x <= 1 ? 'disabled' : ''}></button><input class="cxbn smF" type="number" min="1" max="${cap}" value="${x}" inputmode="numeric" enterkeyhint="done" aria-label="How many"><button class="smPM p" type="button" data-cx="bq" data-v="+" aria-label="One more" ${x >= cap ? 'disabled' : ''}></button></div>`
      + `<div class="smQk">${Q.map((q) => `<button class="smK${x === q ? ' on' : ''}" type="button" data-cx="bq" data-v="${q}" ${q > cap ? 'disabled' : ''}>${q}</button>`).join('')}<button class="smK${x === cap ? ' on' : ''}" type="button" data-cx="bq" data-v="all">All ${fmtN(cap)}</button></div>`; }
  function stationHTML(kind) { const F = kind === 'furnace', r0 = BQ.k === kind ? recOf(kind, BQ.i) : null, r = r0 && !recLocked(r0) ? r0 : null, cap = r ? maxMake(r) : 0, x = r ? Math.max(1, Math.min(BQ.n, cap || 1)) : 1, qv = !!(r && BQ.q && cap > 0);
    let h = `<div class="smS" data-cxv="${kind}" data-st="${qv ? 'quantity' : r ? 'selected' : 'default'}"><div class="smTop"><h2 class="smT">${F ? 'Furnace' : 'Anvil'}</h2><button class="smX" type="button" data-cx="close" aria-label="Close the ${F ? 'furnace' : 'anvil'}"></button></div>${smHero(kind, r)}<div class="smTray"><h3 class="smH">${F ? 'Smelt into' : 'Smith · Pickaxes'}</h3>`;
    if (qv) h += `<div class="smP smSel"><span class="smI">${smIco(r.out)}</span><b class="smN">${esc(F ? nm(r.out) : smShort(r) + ' pickaxe')}</b><button class="smChg" type="button" data-cx="bch">Change</button></div>`;
    else h += `<div class="smP smGrid">${smList(kind).map(([q, i]) => smCell(kind, q, i)).join('')}</div>`;
    if (r) h += smIng(r, x) + (qv ? smQty(r, x, cap) : `<div class="smMeta">${cap > 0 ? `Max ${fmtN(cap)} · ${esc(smWhy(r))}` : esc(smWhy(r) || '')}</div><div class="smQr"><button class="smQc" type="button" data-cx="bqo" ${cap > 0 ? '' : 'disabled'}>Qty ${fmtN(x)}</button><span>Max ${fmtN(cap)}</span></div>`);
    else h += `<p class="smHint">${F ? 'Choose a bar to smelt' : 'Choose a pickaxe to smith'}</p>`;
    return h + smGo(kind, r, x, cap) + '</div></div>'; }
  const stationUp = () => typeof ui !== 'undefined' && (ui.modal === 'cx-furnace' || ui.modal === 'cx-anvil');
  // (t600u, Dominic: "once you select what you're making at the furnace or anvil it closes out the window and shows the animation") Starting a batch closes the
  // furnace / anvil window so she is seen working; a small HUD pill (item icon, n / N, the item's progress, 44 px Cancel) sits above the tab bar until it ends.
  // Tapping the furnace / anvil again reopens the window (its own progress panel; the pill hides meanwhile). Both bars are driven from game time by a 50 ms
  // timer (not a CSS transition or frame loop, which stall when frames are throttled).
  const itemU = () => (JOB.on ? Math.max(0, Math.min(1, (tNow() - JOB.t0) / BATCH_MS)) : 0);
  let HUDT = 0;
  function hudEl() { if (typeof document === 'undefined') return null; let d = document.getElementById('cxHud'); if (d) return d; d = document.createElement('div'); d.id = 'cxHud'; d.className = 'hidden'; d.setAttribute('role', 'status');
    d.innerHTML = '<span class="cxhI"></span><div class="cxhM"><div class="cxhR"><b class="cxhT"></b><span class="cxhN"></span></div><div class="cxhB"><i></i></div></div><button class="cxhX" type="button" aria-label="Cancel the batch">Cancel</button>';
    d.querySelector('.cxhX').addEventListener('click', (e) => { e.stopPropagation(); batchStop('cancel'); }); for (const k of ['pointerdown', 'touchstart', 'mousedown']) d.addEventListener(k, (e) => e.stopPropagation());
    document.body.appendChild(d); return d; }
  function hudTick() { const d = hudEl(); if (!d) return; const show = JOB.on; d.classList.toggle('hidden', !show); const u = itemU();
    if (!show) return; const r = recOf(JOB.kind, JOB.i), it = (r && ITEMS[r.out]) || { emoji: '📦', col: '#888' };
    const hi = d.querySelector('.cxhI'); if (hi.dataset.out !== (r ? r.out : '')) { hi.dataset.out = r ? r.out : ''; hi.innerHTML = r ? smIco(r.out) : ''; } hi.style.setProperty('--c', it.col); d.querySelector('.cxhT').textContent = `${JOB.kind === 'furnace' ? '🔥' : '⚒️'} ${r ? nm(r.out) : ''}`;
    d.querySelector('.cxhN').textContent = `${Math.min(JOB.n, JOB.done + 1)} / ${JOB.n}`; d.querySelector('.cxhB i').style.width = (100 * u).toFixed(1) + '%'; }
  function hudOn() { if (!HUDT) HUDT = setInterval(() => { hudTick(); if (!JOB.on) { clearInterval(HUDT); HUDT = 0; } }, 50); hudTick(); }
  function batchStart(kind, i, n) { if (JOB.on) return false; const r = recOf(kind, i); if (!r || recLocked(r)) return false; const cap = maxMake(r); n = Math.min(Math.floor(+n) || 0, cap); if (!(n > 0)) return false;
    Object.assign(JOB, { on: true, kind, i, n, done: 0, t0: tNow(), last: null }); BQ.k = null; BQ.q = false; JOB.tm = setTimeout(batchStep, BATCH_MS);
    if (stationUp() && typeof closeModalQuiet === 'function') closeModalQuiet(); /* (t600u / t434: close the window, back to the game view with her working; progress only in the pill) */ refresh(); hudOn(); return true; }
  function batchStep() { if (!JOB.on) return; JOB.tm = 0; /* (t600u: the window is closed while she works; the job runs on until done, Cancel or short) */ const r = recOf(JOB.kind, JOB.i);
    if (r && recLocked(r)) return batchStop('locked'); if (!r || !(maxMake(r) > 0) || !make(r, 1, 'bag')) return batchStop('short'); JOB.done++; if (typeof save === 'function') save();
    if (JOB.done >= JOB.n) return batchStop('done'); JOB.t0 = tNow(); JOB.tm = setTimeout(batchStep, BATCH_MS); refresh(); hudTick(); }
  function batchStop(why) { if (!JOB.on) return false; if (JOB.tm) clearTimeout(JOB.tm); JOB.tm = 0; JOB.on = false; const r = recOf(JOB.kind, JOB.i); JOB.last = { why, done: JOB.done, n: JOB.n, out: r && r.out };
    if (typeof toast === 'function' && r) toast(`${JOB.kind === 'furnace' ? '🔥' : '⚒️'} ${JOB.done}× ${nm(r.out)} → Backpack${why === 'done' ? '' : why === 'short' ? ' (out of ingredients or backpack room)' : why === 'locked' ? ' (Unlock Lv ' + recLv(r) + ')' : ' (stopped)'}`);
    refresh(); hudTick(); return true; }
  if (typeof document !== 'undefined') document.addEventListener('input', (e) => { const t = e.target; if (!t.classList || !t.classList.contains('cxbn')) return; const r = recOf(BQ.k, BQ.i); if (!r) return; const cap = maxMake(r); BQ.n = clampN(t.value, cap);
    const sv = t.closest('.smS'); if (!sv) return; const F = BQ.k === 'furnace', g = sv.querySelector('.smGs'); if (g && cap > 0) g.textContent = `${fmtN(BQ.n)} ${F ? smShort(r) : smShort(r) + ' pickaxe' + (BQ.n === 1 ? '' : 's')} · ${fmtN(BQ.n * BATCH_MS / 1000)}s · to backpack`;
    sv.querySelectorAll('.smK').forEach((k) => k.classList.toggle('on', (k.dataset.v === 'all' ? cap : +k.dataset.v) === BQ.n)); const m = sv.querySelector('.smPM.m'), pl = sv.querySelector('.smPM.p'); if (m) m.disabled = BQ.n <= 1; if (pl) pl.disabled = BQ.n >= cap;
    sv.querySelectorAll('.smIng .smRow small').forEach((el, ix) => { const k = Object.keys(r.in)[ix], need = r.in[k] * BQ.n, own = get('bag', k); el.textContent = `${fmtN(need)} needed · ${fmtN(own)} owned`; el.classList.toggle('no', own < need); }); });
  if (typeof document !== 'undefined') document.addEventListener('change', (e) => { const t = e.target; if (t.classList && t.classList.contains('cxbn') && BQ.k) refresh(); }); // (the typed value settles: clamp it on screen)
  if (typeof document !== 'undefined' && !document.getElementById('cxBatchCss')) { const e = document.createElement('style'); e.id = 'cxBatchCss'; e.textContent = "#modal[data-k=cx-furnace],#modal[data-k=cx-anvil]{align-items:stretch;background:#0d0a07;backdrop-filter:none}#modal[data-k=cx-furnace] .sheet,#modal[data-k=cx-anvil] .sheet{max-width:540px;max-height:none;height:100%;border-radius:0;padding:0;overflow:hidden;background:#17120d url(assets/ui/smithing/bg_stone.webp) center/cover;box-shadow:none;animation:none}@media(min-width:600px){#modal[data-k=cx-furnace],#modal[data-k=cx-anvil]{align-items:center}#modal[data-k=cx-furnace] .sheet,#modal[data-k=cx-anvil] .sheet{height:min(100%,900px);border-radius:20px}}.smS{--hw:min(100vw,540px);display:flex;flex-direction:column;height:100%;box-sizing:border-box;padding:calc(env(safe-area-inset-top) + 4px) env(safe-area-inset-right) calc(env(safe-area-inset-bottom) + 6px) env(safe-area-inset-left);color:#2b1a10;font-family:Alegreya,Georgia,serif;-webkit-user-select:none;user-select:none}.smTop{display:flex;align-items:center;justify-content:space-between;flex:none;min-height:44px;padding:0 16px 0 17px}.smT{margin:0;padding:8px 16px;border-radius:8px;font:400 20px/1 'Bree Serif',Georgia,serif;color:#2b1a10;background:linear-gradient(#ecca7e,#c9974a 55%,#a8742f);box-shadow:inset 0 1px 0 rgba(255,240,200,.7),inset 0 0 0 1px rgba(90,60,25,.6),0 2px 4px rgba(0,0,0,.5)}.smX{width:44px;height:44px;flex:none;border:0;padding:0;background:url(assets/ui/smithing/btn_close.webp) center/100% 100% no-repeat;cursor:pointer}.smHero{flex:1 1 auto;min-height:96px;display:flex;justify-content:center;align-items:flex-end;margin-bottom:-10px;overflow:hidden;position:relative;z-index:0}.smArt{position:relative;flex:none;height:min(100%,calc((var(--hw) - 40px) * 1.25));aspect-ratio:560/700}.smArt.a{height:min(100%,calc((var(--hw) - 20px) * .928));aspect-ratio:700/650}.smArt img{display:block;width:100%;height:100%;object-fit:contain;pointer-events:none;-webkit-user-drag:none}.smOn{position:absolute;display:flex;justify-content:center;gap:2%;pointer-events:none}.smOn i{display:block;flex:0 1 50%;filter:drop-shadow(0 3px 4px rgba(0,0,0,.65))}.smOn.f{left:33%;top:63%;width:38%}.smOn.a{left:44%;top:10%;width:28%}.smOn.a i{flex-basis:100%}.smS .cxico,.smS .cxi{position:static;inset:auto;width:100%;height:auto;margin:0;transform:none}.smTray{position:relative;z-index:1;flex:none;margin:0 8px;padding:20px 22px 18px;display:flex;flex-direction:column;gap:8px;border-image:url(assets/ui/smithing/frame_leather.webp) 26 fill / 22px stretch}.smH{margin:0;font:700 11px/1.2 Alegreya,Georgia,serif;letter-spacing:.06em;text-transform:uppercase;color:#f3dfb5}.smP{padding:10px;border-image:url(assets/ui/smithing/parchment_panel.webp) 16 fill / 14px stretch}.smGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}.smC{min-height:84px;min-width:0;border:0;border-radius:10px;padding:4px 0;background:none;display:flex;flex-direction:column;align-items:center;gap:2px;color:#2b1a10;font:inherit;cursor:pointer}.smC:active:not(:disabled){background:rgba(120,80,30,.12)}.smI{position:relative;display:block;width:40px;height:40px;padding:3px;box-sizing:content-box;border-radius:6px;background:linear-gradient(#3b2a1c,#1f150d);box-shadow:inset 0 0 0 2px #b8893f,0 1px 2px rgba(0,0,0,.4)}.smC.on .smI{box-shadow:inset 0 0 0 2px #b8893f,0 0 0 2px #59c9cf,0 0 9px rgba(89,201,207,.75)}.smN{font:400 14px/1.15 'Bree Serif',Georgia,serif;white-space:nowrap}.smC small{font:12px/1.15 Alegreya,Georgia,serif;white-space:nowrap}.smS .ok{color:#2f7a2a;font-weight:700}.smS .no{color:#b3261e;font-weight:700}.smS .lv{color:#6b5a48}.smC.lk{cursor:default}.smC.lk .smI{filter:grayscale(.85) brightness(.7)}.smC.lk .smN{color:#5d4c3c}.smLk{position:absolute;right:-5px;top:-5px;width:16px;height:16px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#f0d08c,#9a6c2a);box-shadow:0 1px 2px rgba(0,0,0,.55)}.smLk::after{content:'';position:absolute;left:5px;top:7px;width:6px;height:5px;border-radius:1px;background:#3b2812;box-shadow:0 -3px 0 -1px transparent}.smLk::before{content:'';position:absolute;left:5.5px;top:3px;width:3px;height:4px;border:1.5px solid #3b2812;border-bottom:0;border-radius:3px 3px 0 0}.smIng h4{margin:0 0 4px;font:700 11px/1.2 Alegreya,Georgia,serif;letter-spacing:.06em;text-transform:uppercase;color:#5b4430}.smRow{display:flex;align-items:center;gap:8px;min-height:30px}.smRi{display:block;width:26px;flex:none}.smRn{flex:1;min-width:0;font:15px/1.2 Alegreya,Georgia,serif}.smRow small{font:12.5px/1.2 Alegreya,Georgia,serif;color:#4b3a2a;white-space:nowrap}.smMeta{font:12px/1.3 Alegreya,Georgia,serif;color:#f0dcb4}.smQr{display:flex;align-items:center;gap:14px;font:15px Alegreya,Georgia,serif;color:#f6e7c8}.smQc,.smK.on{background:linear-gradient(#e9c77d,#c08c42 60%,#9c6a2c);box-shadow:inset 0 0 0 1.5px #5a3d1a,inset 0 2px 0 rgba(255,240,200,.6),0 2px 3px rgba(0,0,0,.4)}.smQc{width:110px;height:44px;border:0;border-radius:10px;font:400 17px 'Bree Serif',Georgia,serif;color:#2b1a10;cursor:pointer}.smQc:disabled{filter:grayscale(.8);opacity:.6}.smSel{display:flex;align-items:center;gap:10px}.smSel .smN{flex:1;min-width:0;font-size:17px;white-space:normal}.smChg{width:88px;height:44px;flex:none;border-radius:10px;border:1.5px solid #9c6a2c;background:linear-gradient(#fcf3de,#ead6ab);font:400 16px 'Bree Serif',Georgia,serif;color:#2b1a10;cursor:pointer}.smQ{display:flex;gap:8px}.smPM{width:44px;height:44px;flex:none;border:0;padding:0;background:center/100% 100% no-repeat;cursor:pointer}.smPM.m{background-image:url(assets/ui/smithing/btn_minus.webp)}.smPM.p{background-image:url(assets/ui/smithing/btn_plus.webp)}.smPM:disabled{opacity:.45;cursor:default}.smF{flex:1;min-width:0;height:44px;box-sizing:border-box;border:0;border-radius:10px;padding:0 8px;background:url(assets/ui/smithing/qty_field.webp) center/100% 100% no-repeat;text-align:center;font:400 20px 'Bree Serif',Georgia,serif;color:#2b1a10;-moz-appearance:textfield;appearance:textfield;-webkit-user-select:text;user-select:text}.smF::-webkit-inner-spin-button,.smF::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}.smQk{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.smK{height:44px;border-radius:10px;border:1px solid #b99a66;background:linear-gradient(#fcf4e0,#ead6ad);font:700 15px Alegreya,Georgia,serif;color:#2b1a10;cursor:pointer}.smK.on{border:0}.smK:disabled{opacity:.38;cursor:default}.smGo{width:100%;min-height:52px;border-radius:14px;border:2px solid #e8c370;padding:3px 8px;background:linear-gradient(#62b3e2,#2a78b4 55%,#1c578a);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;box-shadow:0 2px 4px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.35);cursor:pointer}.smGo b{font:400 19px/1.1 'Bree Serif',Georgia,serif;text-shadow:0 1px 1px rgba(0,0,0,.35)}.smGo small{font:11.5px/1.2 Alegreya,Georgia,serif;opacity:.92}.smGo:disabled{background:linear-gradient(#dccbad,#c0aa86);border-color:#cfb88f;color:rgba(80,60,40,.6);box-shadow:none;cursor:default}.smGo:disabled b{text-shadow:none}.smHint{margin:4px 0;text-align:center;font:15px Alegreya,Georgia,serif;color:#f3e2c0}#cxHud{position:fixed;z-index:30;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom) + 70px);width:min(300px,calc(100vw - 24px - env(safe-area-inset-left) - env(safe-area-inset-right)));min-height:56px;box-sizing:border-box;display:flex;align-items:center;gap:8px;padding:6px 6px 6px 8px;border-radius:99px;background:linear-gradient(#5a3a22,#3a2414);border:1.5px solid #c9974a;color:#fbeccb;box-shadow:0 4px 14px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,220,160,.25);font:13px Alegreya,Georgia,serif}#cxHud.hidden{display:none}#cxHud .cxhI{display:block;flex:none;width:34px;height:34px;padding:2px;border-radius:50%;background:#1f150d;box-shadow:inset 0 0 0 1.5px #b8893f}#cxHud .cxhI .cxico,#cxHud .cxhI .cxi{position:static;width:100%;height:auto;margin:0;transform:none}#cxHud .cxhM{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}#cxHud .cxhR{display:flex;justify-content:space-between;gap:6px}#cxHud .cxhT{font:400 13px 'Bree Serif',Georgia,serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#cxHud .cxhN{font-variant-numeric:tabular-nums;font-weight:700}#cxHud .cxhB{height:6px;border-radius:4px;background:rgba(0,0,0,.4);box-shadow:inset 0 0 0 1px rgba(201,151,74,.5);overflow:hidden}#cxHud .cxhB i{display:block;height:100%;width:0;background:linear-gradient(90deg,#ffb347,#ff6a1c)}#cxHud .cxhX{flex:none;width:80px;height:44px;padding:0;border:0;border-radius:12px;background:url(assets/ui/smithing/btn_cancel.webp) center/100% 100% no-repeat;color:transparent;font-size:13px;cursor:pointer}"; document.head.appendChild(e); } // (the furnace / anvil screens + the HUD pill; Art's assets in assets/ui/smithing)
  function skinsHTML() { const K = skins(); let h = '';
    for (const kind of ['climb', 'tlink']) { h += `<h3 class="cxskH">${kind === 'climb' ? '🧗 Climbing picks' : '🪢 Climbing tether'}</h3><div class="card cxl">`;
      for (const g of SKIN_LOOKS[kind]) { const on = (S[SKIN_KEY[kind]] || SKIN_BASE[kind]) === g, own = !!K[kind][g], p = SKIN_PRICE[g] || 100, base = g === SKIN_BASE[kind];
        h += `<div class="cxr cxsk" data-kind="${kind}" data-g="${g}"><span class="cxsw" style="--c:${(TIERS.find((q) => q[0] === g) || [0, 0, g === 'stone' ? '#8d8a82' : '#6a7d36'])[2]}"></span><span class="cxn">${esc(SKIN_NAME(kind, g))}<small>${base ? 'Base look' : own ? 'Owned' : `💠 ${p} Lumen Crystals`} · cosmetic only</small></span>`
          + (on ? '<button class="btn sm ghost" disabled>Wearing</button>' : own ? `<button class="btn sm alt" data-cx="skwear" data-kind="${kind}" data-g="${g}">Wear</button>` : `<button class="btn sm ${crystals() >= p ? 'alt' : 'ghost'}" data-cx="skbuy" data-kind="${kind}" data-g="${g}" ${crystals() >= p ? '' : 'disabled'}>Buy 💠 ${p}</button>`) + '</div>'; }
      h += '</div>'; }
    return h; }
  function buy(id, n = 1) { const p = SHOP[id]; if (!p || !(n > 0)) return 0; if (room('bag', id) <= 0) return fullMsg(), 0; /* (full backpack: blocked before any gold is taken) */ n = Math.min(n, Math.floor(gold() / p), room('bag', id)); if (n <= 0) return 0; S.gold = gold() - p * n; add('bag', id, n); return n; }
  // bank notes trade at the Lumen Crystal (t591u): list a note at your own price (it is handed over and held, like the other player listings, until a buyer
  // comes or you cancel; cancelling gives the note back)
  const NX = () => S.noteEx || (S.noteEx = { mine: [], next: 1 });
  function notesTradeHTML() { const ids = Object.keys(bag()).filter((k) => isNote(k) && get('bag', k) > 0), L = NX().mine; let h = `<h3 class="cxskH">📜 Bank notes</h3><div class="card cxl cxnotes">`;
    h += ids.length ? ids.map((id) => `<div class="cxr" data-id="${id}">${pic(id)}<span class="cxn">${esc(nm(noteOf(id)))}<small>note for ×${fmtN(get('bag', id))}</small></span><input class="cxin cxnp" data-id="${id}" type="number" min="1" step="1" placeholder="Price" inputmode="numeric" aria-label="Price in gold"><button class="btn sm alt" data-cx="nlist" data-id="${id}">List</button></div>`).join('') : '<div class="dim small">No notes in your backpack. At the vault, turn on Withdraw as note to take a stack out as one note.</div>';
    if (L.length) h += L.map((m) => `<div class="cxr">${pic(m.note)}<span class="cxn">${esc(nm(noteOf(m.note)))} ×${fmtN(m.n)}<small>${fmtN(m.price)}${COIN} · waiting for a buyer</small></span><button class="btn sm ghost" data-cx="ncancel" data-i="${m.id}">Cancel</button></div>`).join('');
    return h + '</div>'; }
  function noteList(id, price) { const n = get('bag', id); if (!isNote(id) || !(n > 0) || !(price >= 1)) return false; add('bag', id, -n); const E = NX(); E.mine.push({ id: E.next++, note: id, n, price: Math.floor(price) }); return true; }
  function noteCancel(i) { const E = NX(), k = E.mine.findIndex((m) => m.id === i); if (k < 0) return false; const m = E.mine[k]; if (!noteDef(noteOf(m.note)) || !fits('bag', m.note, m.n)) return fullMsg(), false; add('bag', m.note, m.n); E.mine.splice(k, 1); return true; }
  function exHTML() { // the Lumen Crystal: looks (Lumen Crystals, premium) + the one fixed-price shop item (gold); the shop buys nothing back
    let h = `<div class="cxp" data-cxv="exchange"><div class="row between"><h2>💠 Skins</h2><span class="tag cxcr">💠 ${fmt(crystals())} Lumen Crystals</span></div><div class="dim">Looks for your climbing gear. Cosmetic only: every look climbs the same. No set prices for ores, bars or pickaxes: players set them. The Bronze Pickaxe is the one shop item.</div>`;
    h += `<h3 class="cxskH">Shop</h3><div class="card cxl">${Object.keys(SHOP).map((id) => `<div class="cxr" data-id="${id}">${ico(id)}<span class="cxn">${esc(nm(id))}<small>${fmt(SHOP[id])}${COIN}</small></span><button class="btn sm ${gold() >= SHOP[id] ? 'alt' : 'ghost'}" data-cx="buy" data-id="${id}" ${gold() >= SHOP[id] ? '' : 'disabled'}>Buy</button></div>`).join('')}</div>`;
    return h + notesTradeHTML() + `<div class="cxsoon"><b>Get Lumen Crystals</b><small>Coming soon. Lumen Crystals will only ever buy looks.</small><button class="btn sm ghost" disabled>Coming soon</button></div>` + skinsHTML() + '<button class="btn ghost" data-cx="close">Close</button></div>'; }
  const VIEW = { bag: () => bagHTML(true), xfer: xferHTML, furnace: () => stationHTML('furnace'), anvil: () => stationHTML('anvil'), exchange: exHTML };
  function open(kind, near) { if (JOB.on && JOB.kind === kind) { hudTick(); return false; } /* (t434: while she works here the HUD pill is the only progress; no job window) */ const r = open0(kind, near); if (JOB.on) hudTick(); return r; }
  function open0(kind, near) { if (typeof openModal !== 'function' || !VIEW[kind]) return false; st.kind = kind; st.menu = null; if (kind === 'furnace' || kind === 'anvil') { BQ.k = null; BQ.q = false; } /* (each visit starts on the default screen: nothing chosen) */ if (kind === 'xfer') { VG.r0 = 0; VG.top = 0; st.near = typeof near === 'function' ? near : null; } openModal(VIEW[kind](), 'cx-' + kind); vaultHook(); return true; }
  function refresh() { const sh = document.getElementById('bagSheet'); if (st.sheet && sh) sh.innerHTML = sheetHTML(); const b = document.getElementById('modalBody'); if (st.kind && b && typeof ui !== 'undefined' && ui.modal === 'cx-' + st.kind) { b.innerHTML = VIEW[st.kind](); vaultHook(); } else if (typeof ui !== 'undefined' && ui.tab === 'bag' && typeof rerender === 'function') rerender(true); if (typeof save === 'function') try { save(); } catch (e) {} }
  const nOf = (avail) => (st.qty === 'all' ? avail : Math.min(st.qty, avail));
  document.addEventListener('click', (e) => { const t = e.target.closest('[data-cx]'); if (!t || t.disabled) return; const a = t.dataset.cx, id = t.dataset.id;
    if (a === 'close') return typeof closeModal === 'function' && closeModal();
    if (a === 'sclose') return sheet(false);
    if (a === 'qty') st.qty = t.dataset.v === 'all' ? 'all' : +t.dataset.v; else if (a === 'dest') st.dest = t.dataset.v; else if (a === 'tab') st.tab = t.dataset.v;
    else if (a === 'xfer') return open('xfer');
    else if (a === 'note') st.note = !st.note;
    else if (a === 'nlist') { const pe = document.querySelector(`#modalBody .cxnp[data-id="${id}"]`), pr = Math.floor(+(pe && pe.value)); if (!(pr >= 1)) { if (typeof toast === 'function') toast('Set a price in gold'); return; } if (noteList(id, pr) && typeof toast === 'function') toast(`📜 Listed the ${nm(noteOf(id))} note at ${fmtN(pr)} gold`); }
    else if (a === 'ncancel') { if (noteCancel(+t.dataset.i) && typeof toast === 'function') toast('📜 The note is back in your backpack'); }
    else if (a === 'mclose') st.menu = null;
    else if (a === 'dropok') { st.menu = null; const r = typeof Explore !== 'undefined' && Explore.dropCreate ? Explore.dropCreate(id) : null; if (r && !r.err) { if (st.sheet) sheet(false); else if (typeof closeModal === 'function') closeModal(); return; } }
    else if (a === 'dset') { const sid = id; st.menu = null; const r = typeof Explore !== 'undefined' && Explore.drillSetup ? Explore.drillSetup(sid) : null; if (r && !r.err) { if (st.sheet) sheet(false); else if (typeof closeModal === 'function') closeModal(); return; } }
    else if (a === 'del') { if (st.menu) st.menu.del = true; }
    else if (a === 'delok') { const n = drop(id, +t.dataset.n); st.menu = null; if (n && typeof toast === 'function') toast(`🗑 Dropped ${n}× ${nm(id)}`); }
    else if (a === 'equip') { if (equip(id) && typeof toast === 'function') toast(`✅ Equipped ${nm(id)}`); st.menu = null; }
    else if (a === 'unequip') { if (unequip(id) && typeof toast === 'function') toast(`🎒 ${nm(id)} back in the backpack`); st.menu = null; }
    else if (a === 'mv' || a === 'mvc') { const M = st.menu; if (M) { const c = get(M.w, M.id), q = a === 'mvc' ? Math.max(0, Math.floor(+(t.closest('.cxmenu').querySelector('.cxin') || {}).value || 0)) : t.dataset.n === 'all' ? c : +t.dataset.n, to = M.w === 'bag' ? 'vault' : 'bag'; const n = move(M.w, to, M.id, Math.min(q, c)); if (!n && q > 0 && typeof toast === 'function') toast(to === 'bag' ? FULL : '🔒 Vault is full'); } st.menu = null; }
    else if (a === 'dep') move('bag', 'vault', id, nOf(get('bag', id))); else if (a === 'wd') { if (get('vault', id) > 0 && !move('vault', 'bag', id, nOf(get('vault', id)))) fullMsg(); }
    else if (a === 'make') { const k = t.dataset.k, i = +t.dataset.i, r = recOf(k, i); if (r && !recLocked(r)) { if (!(BQ.k === k && BQ.i === i)) Object.assign(BQ, { k, i, n: 1 }); BQ.q = false; } } // (a grid cell: select that recipe - ingredients, Qty and Start)
    else if (a === 'bqo') { if (BQ.k) BQ.q = true; } else if (a === 'bch') BQ.q = false; // (the Qty chip opens the full picker; Change goes back to the grid)
    else if (a === 'bq') { const r = recOf(BQ.k, BQ.i), cap = r ? maxMake(r) : 0, v = t.dataset.v; BQ.n = clampN(v === 'all' ? cap : v === '+' ? BQ.n + 1 : v === '-' ? BQ.n - 1 : +v, cap); }
    else if (a === 'bgo') { batchStart(BQ.k, BQ.i, BQ.n); }
    else if (a === 'bstop') { batchStop('cancel'); }
    else if (a === 'skbuy') { if (skinBuy(t.dataset.kind, t.dataset.g) && typeof toast === 'function') toast(`💠 ${SKIN_NAME(t.dataset.kind, t.dataset.g)} unlocked`); }
    else if (a === 'buy') { if (buy(id, 1) && typeof toast === 'function') toast(`💠 Bought ${nm(id)}`); }
    else if (a === 'skwear') { if (skinWear(t.dataset.kind, t.dataset.g) && typeof toast === 'function') toast(`✨ Wearing ${SKIN_NAME(t.dataset.kind, t.dataset.g)}`); }
    refresh(); });
  function swordTier(g) { return typeof S !== 'undefined' && S && S.tswords ? Math.max(0, Math.min(10, Math.floor(S.tswords[g] || 0))) : 0; }
  const swordOwned = (g) => have('tool:sword_' + g) > 0;
  return { recLv, recLocked, noteList, noteCancel, atVault, VBLOCK, tetherDraw, moleDraw, isNote, noteOf, noteDef, noteCount, carried, takeCarried, SWORD_STAT_PLAN, swordTier, swordOwned, SHOP, buy, TPICK, drop, equipGrade, syncWorn, pickNeed, pickLocked, pickTier, equippedPickTierN, BAG_N, VAULT_N, order, fits, equip, unequip, equipped, worn, spare, addAll, WINCH_BASE, BASE_GEAR, FULL, migrateWinch, migrateWorn, svgIco,  ITEMS, SMELT, SMITH, MILL, TIERS, STAND_ID, STAND_T, STAND_OLD, BIT_T, CLIMB_BASE, TLINK_BASE, SKIN_LOOKS, SKIN_BASE, SKIN_PRICE, SKIN_NAME, skins, skinOwned, skinBuy, skinWear, crystals, gold, COIN, migrateClimbGear, bag, get, add, addUpTo, room, perSlot, STACK, STACK_DRILL, STACK_MAX, migrateBagStacks, have, take, move, make, maxMake, canMake, open, BATCH_MS, BQ, JOB, batchStart, batchStop, bagHTML, st, sheet, sheetOn, ICON: svgIco, nm, migrateDrillSplit, migrateStandUnify };
})();

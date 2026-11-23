/* ---------- Backpack, Vault transfer, Furnace, Anvil, Lumen exchange (data-driven placeholders) ---------- */
const Craft = (() => {
  // ---- item catalogue: id -> {name, emoji, col}; ids are kind:key
  const ORE_T = [['copper', 'Copper', '#e0874a'], ['tin', 'Tin', '#dfe2da'], ['iron', 'Iron', '#b4583a'], ['coal', 'Coal', '#3a383e'], ['gold', 'Gold', '#ffd25a'], ['mithril', 'Mithril', '#bfe0ff'], ['runite', 'Runite', '#d2b8ff'], ['lumenite', 'Lumenite', '#8ff6ff'], ['onyx', 'Ember Onyx', '#ff4a1c']];
  const TIERS = [['bronze', 'Bronze', '#c07a3c'], ['iron', 'Iron', '#7d8288'], ['steel', 'Steel', '#9aa4ae'], ['gold', 'Gold', '#e6b640'], ['mithril', 'Mithril', '#9cc0e6'], ['rune', 'Rune', '#7a56c8'], ['lumen', 'Lumen', '#2f6fe0'], ['onyx', 'Ember Onyx', '#ff5a28']];
  const TOOLS = [['pick', 'Pickaxe', '⛏️'], ['climb', 'Climbing picks', '🧗'], ['tlink', 'Tether links', '🔗'], ['lifeline', 'Ledge Tether', '🪢']];
  const ITEMS = {};
  for (const [k, n, c] of ORE_T) ITEMS['ore:' + k] = { name: n + ' ore', short: n, emoji: '🪨', col: c, kind: 'ore', base: 2 };
  TIERS.forEach(([k, n, c], i) => { ITEMS['ingot:' + k] = { name: n + ' ingot', short: n, emoji: '🧱', col: c, kind: 'ingot', tier: i };
    for (const [t, tn, e] of TOOLS) ITEMS['tool:' + t + '_' + k] = { name: n + ' ' + tn.toLowerCase(), short: n, emoji: e, col: c, kind: 'tool', tool: t, tier: i }; });
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
  for (const [t] of TOOLS) if (t !== 'tlink') TIERS.forEach(([k], i) => { const n = Math.round(TOOL_COST[t] * 1.55 ** i), inp = { ['ingot:' + k]: n }; if (TOOL_EXTRA[t]) inp[TOOL_EXTRA[t] + k] = 2; SMITH.push({ out: 'tool:' + t + '_' + k, in: inp, tool: t }); });
  // local placeholder market: value climbs per tier; the crystal buys at 80%
  const value = (id) => { const it = ITEMS[id]; if (!it) return 0; if (it.tiered) return value('tool:pick_' + it.grade); /* (a tiered pickaxe sells at the plain price) */ if (it.kind === 'ore') return Math.round(2 * 1.7 ** Math.max(0, ORE_T.findIndex((o) => 'ore:' + o[0] === id) - 1)); let v = 0; const r = SMELT.find((q) => q.out === id) || SMITH.find((q) => q.out === id); if (r) for (const k in r.in) v += value(k) * r.in[k]; else if (it.tool === 'tlink' && MILL[id.slice(10)]) v = value('ingot:' + id.slice(10)) * MILL[id.slice(10)].ci; return Math.round(v * 1.25); };
  const sellP = (id) => Math.max(1, Math.floor(value(id) * 0.8)), buyP = (id) => Math.max(1, Math.ceil(value(id) * 1.15));
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
  function bag() { if (!S.backpack) S.backpack = {}; if (!S.mdSeed) { S.mdSeed = 1; const n = S.drills ? S.drills.left : 20; if (n > 0) { S.backpack[STAND_ID] = (S.backpack[STAND_ID] || 0) + n; S.backpack['bit:mithril'] = (S.backpack['bit:mithril'] || 0) + n; } } migrateDrillSplit(); migrateStandUnify(); if (!S.tetherSeed) { S.tetherSeed = 1; S.backpack['tether:bronze'] = (S.backpack['tether:bronze'] || 0) + 1500; } return S.backpack; } // first run: Drill Stands + Mithril bits, one pair per drill left; new saves get a 1.5 km Bronze starter coil (the mill rolls the rest), older saves carry tetherSeed and keep what they have
  function vault() { const v = S.ledgeVault || (S.ledgeVault = {}); for (const k of ['ores', 'ingots', 'gear', 'lines', 'coils']) v[k] = v[k] || {}; migrateDrillSplit(); migrateStandUnify(); if (!S.coilSeed) S.coilSeed = 1; return v; } // the free 5000 m of every grade is gone now the mill rolls braid; saves seeded before keep their coils
  function vSlot(id) { const [kind, key] = id.split(':'), v = vault(); return kind === 'ore' ? [v.ores, key] : kind === 'ingot' ? [v.ingots, key] : kind === 'tether' ? [v.coils, key] : [v.gear, key]; }
  function get(where, id) { if (where === 'bag') return Math.floor(bag()[id] || 0); if (RES[id]) return Math.floor((S.res && S.res[RES[id]]) || 0); const [o, k] = vSlot(id); return Math.floor(o[k] || 0); }
  // ---- slot grids: the backpack has BAG_N slots, the vault VAULT_N; one item kind per slot, stacks are unlimited (no weight). S.bagOrder / S.vaultOrder keep which kind
  // sits in which slot (counts stay in S.backpack / the vault store), so a kind needs a free slot only when it is new to that container
  const BAG_N = 20, VAULT_N = 100;
  const vaultIds = () => Object.keys(ITEMS).filter((id) => get('vault', id) > 0);
  function order(where) { const key = where === 'bag' ? 'bagOrder' : 'vaultOrder', N = where === 'bag' ? BAG_N : VAULT_N; let O = S[key]; if (!Array.isArray(O)) O = S[key] = [];
    while (O.length < N) O.push(null); for (let i = 0; i < O.length; i++) if (O[i] && get(where, O[i]) <= 0) O[i] = null;
    const ids = where === 'bag' ? Object.keys(bag()).filter((k) => bag()[k] > 0) : vaultIds(); for (const id of ids) if (!O.includes(id)) { let i = O.indexOf(null); if (i < 0 || i >= N) { O.push(id); } else O[i] = id; } // (an old save over the limit keeps its extra stacks until they empty)
    while (O.length > N && O[O.length - 1] == null) O.pop(); return O; }
  function fits(where, id) { const O = order(where), N = where === 'bag' ? BAG_N : VAULT_N; return O.includes(id) || O.slice(0, N).includes(null); }
  function add(where, id, n) { if (n > 0 && !fits(where, id)) return 0; if (where === 'bag') { const b = bag(); b[id] = (b[id] || 0) + n; if (b[id] <= 0) delete b[id]; order('bag'); return n; } if (RES[id]) { S.res[RES[id]] = Math.max(0, (S.res[RES[id]] || 0) + n); order('vault'); return n; } const [o, k] = vSlot(id); o[k] = Math.max(0, (o[k] || 0) + n); if (!o[k]) delete o[k]; order('vault'); return n; }
  const have = (id) => get('bag', id) + get('vault', id);
  const TPICK = (k) => 'tool:tpick_' + k;
  function pickTier(k) { if (typeof S === 'undefined' || !S || have(TPICK(k)) <= 0) return 0; return Math.max(1, Math.min(10, Math.floor((S.tpicks && S.tpicks[k]) || 1))); } // the tiered pickaxe's own tier; no tiered pickaxe = T0
  // the equipped pickaxe's own tier: the tiered one only while it is the one in her hand (plain pickaxes are T0)
  function equippedPickTierN() { const g = typeof S !== 'undefined' && S && S.pickGrade; return g && S.pickEqT === g ? pickTier(g) : 0; }
  function take(id, n) { if (have(id) < n) return false; const a = Math.min(get('bag', id), n); add('bag', id, -a); if (n - a) add('vault', id, -(n - a)); return true; }
  function move(from, to, id, n) { n = Math.min(Math.floor(n), get(from, id)); if (n <= 0 || !fits(to, id)) return 0; add(from, id, -n); add(to, id, n); return n; }
  function canMake(r, x) { return Object.keys(r.in).every((k) => have(k) >= r.in[k] * x); }
  function maxMake(r) { let m = Infinity; for (const k in r.in) m = Math.min(m, Math.floor(have(k) / r.in[k])); return m; }
  function make(r, x, dest) { if (x <= 0 || !canMake(r, x) || !fits(dest === 'vault' ? 'vault' : 'bag', r.out)) return 0; for (const k in r.in) take(k, r.in[k] * x); add(dest === 'vault' ? 'vault' : 'bag', r.out, x); if (typeof Skills !== 'undefined') Skills.awardCraft(r, x); return x; }
  const lum = () => Math.floor((S.res && S.res.lumen) || 0);
  function sell(id, n) { n = Math.min(n, have(id)); if (n <= 0) return 0; take(id, n); S.res.lumen = (S.res.lumen || 0) + sellP(id) * n; const it = ITEMS[id];
    if (it && it.tiered && have(id) <= 0) { if (S.tpicks) delete S.tpicks[it.grade]; if (S.pickEqT === it.grade) S.pickEqT = null; } /* sold: that kind starts over at T0 */ return n; }
  function buy(id, n) { n = Math.min(n, Math.floor(lum() / buyP(id))); if (n <= 0 || !fits('bag', id)) return 0; S.res.lumen -= buyP(id) * n; add('bag', id, n); return n; }
  // ---- UI
  const st = { qty: 1, dest: 'bag', tab: 'sell', kind: null, acat: 'pick', atool: 'lifeline', menu: null };
  const ANV_CAT = [['pick', 'Pickaxes', '⛏️'], ['climb', 'Climbing Picks', '🧗'], ['teth', 'Tethers', '🪢']], TETH_SUB = [['lifeline', '🪢 Ledge Tethers']]; // Wren's Tether (tool:tlink_*) is rolled at the Tether Mill now
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (n) => (n >= 1e4 ? Math.round(n / 1000) + 'k' : String(n));
  const ico = (id) => { const it = ITEMS[id] || { emoji: '📦', col: '#888' }; return `<span class="cxi" style="--c:${it.col}">${it.emoji}</span>`; };
  const nm = (id) => { const it = ITEMS[id]; return it ? (it.tiered ? `${TIERS[it.tier][1]} Pickaxe (T${pickTier(it.grade)})` : it.name) : id; };
  const qtyBar = () => `<div class="cxq">${[1, 10, 100, 'all'].map((q) => `<button class="btn sm ${st.qty === q ? 'alt' : 'ghost'}" data-cx="qty" data-v="${q}">${q === 'all' ? 'All' : '×' + q}</button>`).join('')}</div>`;
  const destBar = () => `<div class="cxq"><span class="dim">Output to</span>${[['bag', '🎒 Backpack'], ['vault', '🔒 Vault']].map(([k, l]) => `<button class="btn sm ${st.dest === k ? 'alt' : 'ghost'}" data-cx="dest" data-v="${k}">${l}</button>`).join('')}</div>`;
  const SKIP_SHOP = { drill: 1, teth: 1, stand: 1, bit: 1 }; const allIds = () => Object.keys(ITEMS).filter((id) => have(id) > 0 && !SKIP_SHOP[ITEMS[id].kind]);
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
  const pic = (id) => { const it = ITEMS[id], a = it && it.tiered ? 'tool:pick_' + it.grade : id; return ((typeof itemIco === 'function' && itemIco(a)) || svgIco(a)) + tb(id); };
  const tb = (id) => { const it = ITEMS[id]; return it && it.tiered ? `<b class="cxtb">T${pickTier(it.grade)}</b>` : ''; }; // the brass tier badge on a tiered pickaxe's icon
  const badge = (id, c) => { const it = ITEMS[id], m = it && it.unit === 'm'; return `<b class="cxct${m ? ' m' : ''}">${m ? fmtN(c) + ' m' : '×' + fmtN(c)}</b>`; };
  const fmtN = (n) => (n >= 1e9 ? (n / 1e9).toFixed(n >= 1e10 ? 0 : 1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : n >= 1e4 ? Math.floor(n / 1000) + 'k' : String(n));
  const EQUIP = { pick: ['pickGrade', 'setPick', 'Pickaxe'], climb: ['climbGrade', 'setClimb', 'Climbing picks'], tlink: ['tetherGrade', 'setTether', 'Tether'] };
  const equipped = (id) => { const it = ITEMS[id], E = it && it.kind === 'tool' && EQUIP[it.tool]; if (!E || S[E[0]] !== TIERS[it.tier][0]) return false; return it.tool !== 'pick' || (it.tiered ? S.pickEqT === it.grade : S.pickEqT !== TIERS[it.tier][0]); };
  function equip(id) { const it = ITEMS[id], E = it && it.kind === 'tool' && EQUIP[it.tool]; if (!E || have(id) <= 0) return false; const g = TIERS[it.tier][0]; S[E[0]] = g; if (it.tool === 'pick') S.pickEqT = it.tiered ? g : null; if (typeof CharView !== 'undefined' && CharView[E[1]]) try { CharView[E[1]](g); } catch (e) {} return true; }
  function gridHTML(where) { const O = order(where), N = where === 'bag' ? BAG_N : VAULT_N, n = Math.max(N, O.length); let h = `<div class="cxg cxg-${where}" data-w="${where}">`;
    for (let i = 0; i < n; i++) { const id = O[i], c = id ? get(where, id) : 0; h += `<div class="cxs${id ? ' full' : ''}${i >= N ? ' over' : ''}${id && equipped(id) ? ' eq' : ''}" data-w="${where}" data-s="${i}"${id ? ` data-id="${id}" title="${esc(nm(id))}"` : ''}>${id ? pic(id) + badge(id, c) : ''}</div>`; }
    return h + '</div>'; }
  const used = (w) => order(w).filter(Boolean).length;
  // the Backpack shows only what she carries; the Ledge Vault sits beside it only on the vault's own Backpack ⇄ Vault screen (xfer)
  // (Dominic: field-kit skin, Art's B_* concepts) a brass gauge for slot counts: needle sweeps with how full it is; the numbers are live
  const gauge = (n, N) => `<span class="kGauge" style="--g:${Math.min(1, n / N).toFixed(3)}" role="img" aria-label="${n} of ${N} slots used"><i></i><b>${n} / ${N}</b></span>`;
  function gridsHTML(inModal, xfer) {
    let h = `<div class="cxp cxgrid kKit" data-cxv="${xfer ? 'xfer' : 'bag'}"><div class="kPanel kLeather"><div class="row between kHead"><h2>Backpack</h2>${gauge(used('bag'), BAG_N)}${inModal && !xfer ? '<button class="kX" data-cx="close" aria-label="Close">✕</button>' : ''}</div>`;
    h += (xfer ? '' : `<div class="dim kSub">What Wren carries. Tap an item for its options.${typeof Skills !== 'undefined' ? ' · ' + Skills.uiLine() : ''}</div>`) + gridHTML('bag') + (xfer ? '' : '<div class="kFoot">Stacks have no limit and no weight.</div>') + '</div>';
    if (xfer) h += `<div class="kSwap"><span class="kPlate">⇄</span><small>Tap to move a stack · hold for more (equip, move some). Stacks have no limit and no weight.</small></div><div class="kPanel kLeather"><div class="row between kHead"><h2>Ledge Vault</h2>${gauge(used('vault'), VAULT_N)}</div>` + gridHTML('vault') + '</div>';
    h += st.menu && (xfer || st.menu.w === 'bag') ? menuHTML() : ''; return h + (inModal && xfer ? '<button class="btn ghost kBtn kCream" data-cx="close">Close</button>' : '') + '</div>'; }
  const TIER_N = (it) => { if (!it) return ''; if (it.tier != null && TIERS[it.tier]) return TIERS[it.tier][1]; const g = it.grade || it.stand; const T = g && TIERS.find((q) => q[0] === g); return T ? T[1] : (it.short || g || ''); };
  const KIND_N = { ore: 'Ore', ingot: 'Ingot', tool: 'Tool', teth: 'Ledge Tether', stand: 'Drill stand', bit: 'Drill bit', drill: 'Drill' };
  function itemStats(id, c) {
    const it = ITEMS[id] || {}, o = [];
    const where = (st.menu && st.menu.w) === 'vault' ? 'Vault' : 'Backpack';
    o.push(['Held', (it.unit === 'm' ? fmtN(c) + ' m' : '×' + fmtN(c)) + ' in ' + where]);
    const tn = TIER_N(it); if (tn) o.push(['Tier', tn]);
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
    if (it.kind === 'tool' && it.tool === 'pick') return 'Equip it to mine ore out on the map.';
    if (it.kind === 'tool' && it.tool === 'climb') return 'Equip it to climb pitches on the map.';
    if (it.kind === 'tool' && it.tool === 'tlink') return 'Equip it as the line you travel on.';
    if (it.kind === 'tool' && it.tool === 'lifeline') return 'A winch and hook for a Ledge Tether line.';
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
    const n = move(w, to, id, get(w, id)); if (!n && typeof toast === 'function') toast(to === 'bag' ? '🎒 Backpack is full - free a slot first' : '🔒 Vault is full'); refresh(); });
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
  function exHTML() { const S2 = st.tab === 'sell';
    let h = `<div class="cxp" data-cxv="exchange"><div class="row between"><h2>💠 Lumen Crystal</h2><span class="tag">✦ ${fmt(lum())} Lumen</span></div><div class="dim">The crystal trades with the Hollow. Placeholder local market prices.</div>`;
    h += `<div class="cxq">${[['sell', 'Sell'], ['buy', 'Buy']].map(([k, l]) => `<button class="btn sm ${st.tab === k ? 'alt' : 'ghost'}" data-cx="tab" data-v="${k}">${l}</button>`).join('')}</div>${qtyBar()}`;
    if (S2 && st.confirm && have(st.confirm) > 0) { const c = st.confirm, t = pickTier(ITEMS[c].grade); h += `<div class="cxdanger" role="alertdialog"><b>⚠️ Sell ${esc(nm(c))}?</b><p>This will lose Tier ${t}. You'll start over at Tier 1.</p><div class="cxq"><button class="btn sm cxdng" data-cx="sellok" data-id="${c}">Sell for ✦ ${sellP(c)}</button><button class="btn sm ghost" data-cx="sellno">Keep it</button></div></div>`; } else st.confirm = null;
    const ids = S2 ? allIds() : Object.keys(ITEMS).filter((id) => !SKIP_SHOP[ITEMS[id].kind] && !ITEMS[id].tiered); /* (a tiered pickaxe is only made at Theus's forge) */
    h += ids.length ? `<div class="card cxl">${ids.map((id) => { const p = S2 ? sellP(id) : buyP(id), n = st.qty === 'all' ? (S2 ? have(id) : Math.floor(lum() / p)) : st.qty, ok = S2 ? have(id) >= Math.max(1, n) : lum() >= p * Math.max(1, n);
      return `<div class="cxr" data-id="${id}">${ITEMS[id].tiered ? `<span class="cxtw">${ico(id)}${tb(id)}</span>` : ico(id)}<span class="cxn">${esc(nm(id))}<small>✦ ${p} each${S2 ? ' · have ' + fmt(have(id)) : ''}</small></span><button class="btn sm ${ok ? 'alt' : 'ghost'}" data-cx="${S2 ? 'sell' : 'buy'}" data-id="${id}" ${ok && n > 0 ? '' : 'disabled'}>${S2 ? 'Sell' : 'Buy'} ×${Math.max(1, n)}</button></div>`; }).join('')}</div>` : '<div class="card dim">Nothing to sell. Bring ore, ingots or tools.</div>';
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
    else if (a === 'mv' || a === 'mvc') { const M = st.menu; if (M) { const c = get(M.w, M.id), q = a === 'mvc' ? Math.max(0, Math.floor(+(t.closest('.cxmenu').querySelector('.cxin') || {}).value || 0)) : t.dataset.n === 'all' ? c : +t.dataset.n, to = M.w === 'bag' ? 'vault' : 'bag'; const n = move(M.w, to, M.id, Math.min(q, c)); if (!n && q > 0 && typeof toast === 'function') toast(to === 'bag' ? '🎒 Backpack is full - free a slot first' : '🔒 Vault is full'); } st.menu = null; }
    else if (a === 'dep') move('bag', 'vault', id, nOf(get('bag', id))); else if (a === 'wd') move('vault', 'bag', id, nOf(get('vault', id)));
    else if (a === 'make') { const r = (t.dataset.k === 'furnace' ? SMELT : SMITH)[+t.dataset.i]; const x = st.qty === 'all' ? maxMake(r) : st.qty; if (make(r, x, st.dest) && typeof toast === 'function') toast(`${t.dataset.k === 'furnace' ? '🔥' : '⚒️'} ${x}× ${nm(r.out)} → ${st.dest === 'vault' ? 'Vault' : 'Backpack'}`); }
    else if (a === 'sell' && ITEMS[id] && ITEMS[id].tiered) st.confirm = id; /* a tiered pickaxe asks first (danger) */
    else if (a === 'sellno') st.confirm = null;
    else if (a === 'sellok') { st.confirm = null; const n = sell(id, 1); if (n && typeof toast === 'function') toast(`💠 Sold ${nm(id).replace(/ \(T\d+\)$/, '')} · the tier is gone`); }
    else if (a === 'sell') { const n = sell(id, nOf(have(id))); if (n && typeof toast === 'function') toast(`💠 Sold ${n}× ${nm(id)}`); }
    else if (a === 'buy') { const n = buy(id, nOf(Math.floor(lum() / buyP(id)))); if (n && typeof toast === 'function') toast(`💠 Bought ${n}× ${nm(id)}`); }
    refresh(); });
  return { TPICK, pickTier, equippedPickTierN, BAG_N, VAULT_N, order, fits, equip, equipped, svgIco, ITEMS, SMELT, SMITH, MILL, TIERS, STAND_ID, STAND_T, STAND_OLD, BIT_T, bag, get, add, have, take, move, make, maxMake, canMake, sell, buy, value, sellP, buyP, open, bagHTML, st, sheet, sheetOn, ICON: svgIco, nm, migrateDrillSplit, migrateStandUnify };
})();

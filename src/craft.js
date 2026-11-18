/* ---------- Backpack, Vault transfer, Furnace, Anvil, Lumen exchange (data-driven placeholders) ---------- */
const Craft = (() => {
  // ---- item catalogue: id -> {name, emoji, col}; ids are kind:key
  const ORE_T = [['copper', 'Copper', '#e0874a'], ['tin', 'Tin', '#dfe2da'], ['iron', 'Iron', '#b4583a'], ['coal', 'Coal', '#3a383e'], ['gold', 'Gold', '#ffd25a'], ['mithril', 'Mithril', '#bfe0ff'], ['runite', 'Runite', '#d2b8ff'], ['lumenite', 'Lumenite', '#8ff6ff'], ['onyx', 'Ember Onyx', '#ff4a1c']];
  const TIERS = [['bronze', 'Bronze', '#c07a3c'], ['iron', 'Iron', '#7d8288'], ['steel', 'Steel', '#9aa4ae'], ['gold', 'Gold', '#e6b640'], ['mithril', 'Mithril', '#9cc0e6'], ['rune', 'Rune', '#7a56c8'], ['lumen', 'Lumen', '#2f6fe0'], ['onyx', 'Ember Onyx', '#ff5a28']];
  const TOOLS = [['pick', 'Pickaxe', '⛏️'], ['climb', 'Climbing picks', '🧗'], ['tlink', 'Tether links', '🔗'], ['lifeline', 'Lifeline', '🪢']];
  const ITEMS = {};
  for (const [k, n, c] of ORE_T) ITEMS['ore:' + k] = { name: n + ' ore', short: n, emoji: '🪨', col: c, kind: 'ore', base: 2 };
  TIERS.forEach(([k, n, c], i) => { ITEMS['ingot:' + k] = { name: n + ' ingot', short: n, emoji: '🧱', col: c, kind: 'ingot', tier: i };
    for (const [t, tn, e] of TOOLS) ITEMS['tool:' + t + '_' + k] = { name: n + ' ' + tn.toLowerCase(), short: n, emoji: e, col: c, kind: 'tool', tool: t, tier: i }; });
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
  // ---- storage: backpack = S.backpack {id:n}; vault = S.ledgeVault (ores/ingots/gear) with iron, coal, steel living in S.res
  const RES = { 'ore:iron': 'iron', 'ore:coal': 'coal', 'ingot:steel': 'steel' };
  function bag() { if (!S.backpack) S.backpack = {}; return S.backpack; }
  function vault() { const v = S.ledgeVault || (S.ledgeVault = {}); for (const k of ['ores', 'ingots', 'gear', 'lines']) v[k] = v[k] || {}; return v; }
  function vSlot(id) { const [kind, key] = id.split(':'), v = vault(); return kind === 'ore' ? [v.ores, key] : kind === 'ingot' ? [v.ingots, key] : [v.gear, key]; }
  function get(where, id) { if (where === 'bag') return Math.floor(bag()[id] || 0); if (RES[id]) return Math.floor((S.res && S.res[RES[id]]) || 0); const [o, k] = vSlot(id); return Math.floor(o[k] || 0); }
  function add(where, id, n) { if (where === 'bag') { const b = bag(); b[id] = (b[id] || 0) + n; if (b[id] <= 0) delete b[id]; return; } if (RES[id]) { S.res[RES[id]] = Math.max(0, (S.res[RES[id]] || 0) + n); return; } const [o, k] = vSlot(id); o[k] = Math.max(0, (o[k] || 0) + n); if (!o[k]) delete o[k]; }
  const have = (id) => get('bag', id) + get('vault', id);
  function take(id, n) { if (have(id) < n) return false; const a = Math.min(get('bag', id), n); add('bag', id, -a); if (n - a) add('vault', id, -(n - a)); return true; }
  function move(from, to, id, n) { n = Math.min(Math.floor(n), get(from, id)); if (n <= 0) return 0; add(from, id, -n); add(to, id, n); return n; }
  function canMake(r, x) { return Object.keys(r.in).every((k) => have(k) >= r.in[k] * x); }
  function maxMake(r) { let m = Infinity; for (const k in r.in) m = Math.min(m, Math.floor(have(k) / r.in[k])); return m; }
  function make(r, x, dest) { if (x <= 0 || !canMake(r, x)) return 0; for (const k in r.in) take(k, r.in[k] * x); add(dest === 'vault' ? 'vault' : 'bag', r.out, x); return x; }
  // ---- UI
  const st = { qty: 1, dest: 'bag', tab: 'sell', kind: null };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (n) => (n >= 1e4 ? Math.round(n / 1000) + 'k' : String(n));
  const ico = (id) => { const it = ITEMS[id] || { emoji: '📦', col: '#888' }; return `<span class="cxi" style="--c:${it.col}">${it.emoji}</span>`; };
  const nm = (id) => (ITEMS[id] ? ITEMS[id].name : id);
  const qtyBar = () => `<div class="cxq">${[1, 10, 100, 'all'].map((q) => `<button class="btn sm ${st.qty === q ? 'alt' : 'ghost'}" data-cx="qty" data-v="${q}">${q === 'all' ? 'All' : '×' + q}</button>`).join('')}</div>`;
  const destBar = () => `<div class="cxq"><span class="dim">Output to</span>${[['bag', '🎒 Backpack'], ['vault', '🔒 Vault']].map(([k, l]) => `<button class="btn sm ${st.dest === k ? 'alt' : 'ghost'}" data-cx="dest" data-v="${k}">${l}</button>`).join('')}</div>`;
  function bagHTML(inModal) { const b = bag(), ids = Object.keys(b).filter((k) => b[k] > 0), tot = ids.reduce((a, k) => a + b[k], 0);
    let h = `<div class="cxp" data-cxv="bag"><div class="row between"><h2>🎒 Backpack</h2><span class="tag">${fmt(tot)} items</span></div><div class="dim">What Wren carries. Store things in the Ledge vault, or take them out to smelt, smith or sell.</div>`;
    h += ids.length ? `<div class="card cxl">${ids.map((id) => `<div class="cxr" data-id="${id}">${ico(id)}<span class="cxn">${esc(nm(id))}</span><b>${fmt(b[id])}</b></div>`).join('')}</div>` : '<div class="card dim">Your backpack is empty.</div>';
    h += `<button class="btn" data-cx="xfer">🔒 Vault ⇄ Backpack</button>`; return h + (inModal ? '<button class="btn ghost" data-cx="close">Close</button>' : '') + '</div>'; }
  function xferHTML() { const ids = Object.keys(ITEMS).filter((id) => get('bag', id) > 0 || get('vault', id) > 0);
    let h = `<div class="cxp" data-cxv="xfer"><div class="row between"><h2>🔒 Vault ⇄ 🎒 Backpack</h2></div><div class="dim">Pick an amount, then deposit into the vault or withdraw into your backpack.</div>${qtyBar()}`;
    h += ids.length ? `<div class="card cxl">${ids.map((id) => `<div class="cxr" data-id="${id}">${ico(id)}<span class="cxn">${esc(nm(id))}<small>🎒 ${fmt(get('bag', id))} · 🔒 ${fmt(get('vault', id))}</small></span><button class="btn sm ghost" data-cx="dep" data-id="${id}" ${get('bag', id) ? '' : 'disabled'}>Deposit</button><button class="btn sm ghost" data-cx="wd" data-id="${id}" ${get('vault', id) ? '' : 'disabled'}>Withdraw</button></div>`).join('')}</div>` : '<div class="card dim">Nothing in the vault or backpack yet.</div>';
    return h + '<button class="btn ghost" data-cx="close">Close</button></div>'; }
  const cost = (r, x) => Object.keys(r.in).map((k) => `<span class="cxc${have(k) >= r.in[k] * x ? '' : ' short'}">${ico(k)}${r.in[k] * x} ${esc(ITEMS[k].short)}<small>/${fmt(have(k))}</small></span>`).join('');
  function recipeHTML(kind) { const F = kind === 'furnace', list = F ? SMELT : SMITH;
    let h = `<div class="cxp" data-cxv="${kind}"><div class="row between"><h2>${F ? '🔥 Furnace' : '⚒️ Anvil'}</h2><span class="tag">placeholder recipes</span></div><div class="dim">${F ? 'Smelt ore into ingots. Ore is taken from your backpack first, then the vault.' : 'Hammer ingots into tools. Ingots are taken from your backpack first, then the vault.'}</div>${qtyBar()}${destBar()}`;
    let grp = null; h += '<div class="card cxl">';
    for (let i = 0; i < list.length; i++) { const r = list[i], x = st.qty === 'all' ? Math.max(1, maxMake(r)) : st.qty, it = ITEMS[r.out];
      if (!F && grp !== r.tool) { grp = r.tool; h += `<h3 class="cxh">${TOOLS.find((t) => t[0] === grp)[2]} ${TOOLS.find((t) => t[0] === grp)[1]}</h3>`; }
      h += `<div class="cxr rec" data-out="${r.out}">${ico(r.out)}<span class="cxn">${esc(it.name)}<small class="cxcs">${cost(r, x)}</small></span><button class="btn sm ${canMake(r, x) ? 'alt' : 'ghost'}" data-cx="make" data-k="${kind}" data-i="${i}" ${canMake(r, x) ? '' : 'disabled'}>${F ? 'Smelt' : 'Smith'} ×${x}</button></div>`; }
    return h + '</div><button class="btn ghost" data-cx="close">Close</button></div>'; }
  const VIEW = { bag: () => bagHTML(true), xfer: xferHTML, furnace: () => recipeHTML('furnace') };
  function open(kind) { if (typeof openModal !== 'function' || !VIEW[kind]) return false; st.kind = kind; openModal(VIEW[kind](), 'cx-' + kind); return true; }
  function refresh() { const b = document.getElementById('modalBody'); if (st.kind && b && typeof ui !== 'undefined' && ui.modal === 'cx-' + st.kind) b.innerHTML = VIEW[st.kind](); else if (typeof ui !== 'undefined' && ui.tab === 'bag' && typeof rerender === 'function') rerender(true); if (typeof save === 'function') try { save(); } catch (e) {} }
  const nOf = (avail) => (st.qty === 'all' ? avail : Math.min(st.qty, avail));
  document.addEventListener('click', (e) => { const t = e.target.closest('[data-cx]'); if (!t || t.disabled) return; const a = t.dataset.cx, id = t.dataset.id;
    if (a === 'close') return typeof closeModal === 'function' && closeModal();
    if (a === 'qty') st.qty = t.dataset.v === 'all' ? 'all' : +t.dataset.v; else if (a === 'dest') st.dest = t.dataset.v;
    else if (a === 'xfer') return open('xfer');
    else if (a === 'dep') move('bag', 'vault', id, nOf(get('bag', id))); else if (a === 'wd') move('vault', 'bag', id, nOf(get('vault', id)));
    else if (a === 'make') { const r = (t.dataset.k === 'furnace' ? SMELT : SMITH)[+t.dataset.i]; const x = st.qty === 'all' ? maxMake(r) : st.qty; if (make(r, x, st.dest) && typeof toast === 'function') toast(`${t.dataset.k === 'furnace' ? '🔥' : '⚒️'} ${x}× ${nm(r.out)} → ${st.dest === 'vault' ? 'Vault' : 'Backpack'}`); }
    refresh(); });
  return { ITEMS, SMELT, TIERS, bag, get, add, have, take, move, make, maxMake, canMake, open, bagHTML, st };
})();

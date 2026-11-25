/* ---------- Combat stats (t627u, Dominic via Art card t448s1773): Art's round brass icon (crossed swords + red heart) in the Character view, a 44 px+
   touch target; tapping it opens a panel with Strength, HP and Accuracy split by source - level, swords, Skill Tree - and the total. (t648u, Dominic: nothing else under the stats - no level line, hit-chance note or footer.)
   Every number is read from the combat module (src/combat.js, global Combat): playerStats / equippedSwords / applyNodes / level / hitChance / fmt.
   Nothing is computed here: the level share is Combat.playerStats with no swords and an empty tree, the swords share is playerStats' own pair sum,
   the tree share is Combat.applyNodes, the total is Combat.playerStats. ---------- */
const CombatStats = (() => {
  const A = 'assets/ui/', T = 'assets/ui/skill_tree_crystal/';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const num = (v) => (Math.round(v * 10) / 10).toString();
  const cap = (g) => g.charAt(0).toUpperCase() + g.slice(1);
  // the split, straight from Combat
  function split(s) { s = s || (typeof S !== 'undefined' ? S : null); const P = Combat.playerStats(s), lvOnly = Combat.playerStats(Object.assign({}, s, { skill: {} }), { L: null, R: null }), E = Combat.applyNodes(s), sw = Combat.fmt(P.swords.pair);
    const rows = [['str', 'Strength'], ['hp', 'HP'], ['acc', 'Accuracy']].map(([k, n]) => ({ k, n, level: lvOnly[k], swords: sw[k], tree: E[k] || 0, total: P[k] }));
    const hand = (h) => (h ? `${cap(h.g)}${h.g === 'stick' ? '' : ' T' + h.t}` : 'Empty');
    return { level: Combat.level(s), rows, hands: { L: hand(P.swords.L), R: hand(P.swords.R) }, hit0: Combat.hitChance(P.acc, 0), hit100: Combat.hitChance(P.acc, 100), cap: Combat.HIT_CAP, ease: Combat.HIT_EASE, base: { str: Combat.BASE_STR, hp: Combat.BASE_HP } }; }
  function html() { const D = split();
    const rows = D.rows.map((r) => `<tr data-cs="${r.k}"><th>${r.n}</th><td data-src="level">${num(r.level)}</td><td data-src="swords">${num(r.swords)}</td><td data-src="tree">${num(r.tree)}</td><td data-src="total"><b>${r.total}</b></td></tr>`).join('');
    return `<div class="csTray"><div class="csTop"><span class="csIc"></span><h2>Combat stats</h2><button class="csX" type="button" data-cs="close" aria-label="Close combat stats"></button></div>
      <div class="csCard"><table><thead><tr><th></th><th>Level</th><th>Swords</th><th>Tree</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table></div></div>`; }
  function css() { if (document.getElementById('csCss')) return; const e = document.createElement('style'); e.id = 'csCss';
    e.textContent = [`#csBtn{display:none}#charWrap.solo #csBtn{display:block;position:absolute;top:220px;left:10px;z-index:3;width:52px;height:52px;padding:0;border:0;border-radius:50%;background:url(${A}combat_stats_64.webp) center/100% 100% no-repeat;background-image:image-set(url(${A}combat_stats_64.webp) 1x,url(${A}combat_stats_128.webp) 2x);filter:drop-shadow(0 2px 3px rgba(0,0,0,.35));cursor:pointer}#charWrap.solo #csBtn:active{transform:scale(.94)}`,
      '#combatStats{display:none;position:fixed;inset:0;z-index:200;background:rgba(10,6,3,.55);align-items:flex-end;justify-content:center}#combatStats.on{display:flex}',
      `#combatStats .csTray{box-sizing:border-box;width:min(390px,100%);max-height:calc(100% - 24px);overflow:auto;margin:0 0 calc(12px + env(safe-area-inset-bottom));padding:16px 16px 14px;border-radius:18px;color:#fff3df;font:400 14px Alegreya,Georgia,serif;background:url(${T}frame_leather.webp) center/100% 100% no-repeat,#5a3820;box-shadow:0 8px 24px rgba(0,0,0,.45)}`,
      `#combatStats .csTop{display:flex;align-items:center;gap:10px}#combatStats .csIc{width:44px;height:44px;flex:none;background:url(${A}combat_stats_128.webp) center/100% 100% no-repeat}#combatStats h2{flex:1;margin:0;font:400 22px "Bree Serif",Georgia,serif;color:#ffe2a8;text-shadow:0 1px 0 #2b1a10}`,
      `#combatStats .csX{width:44px;height:44px;flex:none;border:0;background:url(${T}btn_close.webp) center/100% 100% no-repeat;cursor:pointer}`,
      `#combatStats .csCard{margin-top:10px;padding:8px 10px;border-radius:10px;color:#2b1a10;background:url(${A}combat_stats_parchment.webp) center/100% 100% no-repeat,#efdcb0}#combatStats table{width:100%;border-collapse:collapse}#combatStats th,#combatStats td{padding:7px 4px;text-align:right;font-size:14px}#combatStats thead th{font:600 11px Alegreya,Georgia,serif;letter-spacing:.05em;text-transform:uppercase;opacity:.8}#combatStats tbody th{text-align:left;font:400 16px "Bree Serif",Georgia,serif}#combatStats tbody tr+tr{border-top:1px solid rgba(74,46,26,.2)}#combatStats td b{font:400 18px "Bree Serif",Georgia,serif;color:#7a1c14}`].join('');
    document.head.appendChild(e); }
  function el() { let e = document.getElementById('combatStats'); if (!e) { e = document.createElement('div'); e.id = 'combatStats'; e.setAttribute('role', 'dialog'); e.setAttribute('aria-label', 'Combat stats'); document.body.appendChild(e);
      e.addEventListener('click', (ev) => { if (ev.target === e || ev.target.closest('[data-cs=close]')) close(); }); } return e; }
  function open() { css(); const e = el(); e.innerHTML = html(); e.classList.add('on'); return true; }
  function close() { const e = document.getElementById('combatStats'); if (e) e.classList.remove('on'); }
  // the icon, in the Character view (#charWrap.solo)
  function mount() { const w = document.getElementById('charWrap'); if (!w || document.getElementById('csBtn')) return; css(); const b = document.createElement('button'); b.id = 'csBtn'; b.type = 'button'; b.setAttribute('aria-label', 'Combat stats'); b.title = 'Combat stats'; b.addEventListener('click', open); w.appendChild(b); }
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount(); }
  return { open, close, split, mount };
})();

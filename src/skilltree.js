/* ---------- The Skill Tree (Dominic, via Art): the lumenite tree in its own room behind the Ledge house, tapped to spend skill points.
   UI from Art's mocks (/workspace/mia/ui/skill_tree: tree overview, Combat branch node map, node detail sheet; leather tray, parchment, Confirm, medallions)
   with Dominic's changes: no combat stats panel and no Combat level badge; a LUMENITE tree with three glowing crystal limbs - Combat (red, open),
   Production (blue, renamed from Mining) and Tether Beasts (yellow), the last two locked and blank ("Coming soon").
   Points and node rules are the combat module's (src/combat.js, global Combat: NODES / nodeState / pointsLeft / addPoint / removePoint); nothing is
   computed here. */
const SkillTree = (() => {
  const A = 'assets/ui/skill_tree/';
  // ---- the combat module (src/combat.js) owns the node table, the allocations (S.skill), the points (1 per Combat level), costs and prerequisites:
  // this screen only reads its state and asks it to add / remove one point at a time
  const api = {
    nodes: () => Combat.NODES, node: (id) => Combat.NODE[id], st: (id) => Combat.nodeState(id),
    points: () => Combat.pointsLeft(), total: () => Combat.pointsTotal(), spent: () => Combat.pointsSpent(),
    spend: (id, k = 1) => { let n = 0; while (n < k && Combat.addPoint(id)) n++; return n; }, /* (each point checked by the module: max, prerequisite, points left) */
    refund: (id, k = 1) => { let n = 0; while (n < k && Combat.removePoint(id)) n++; return n; } };
  // ---- the screens
  const BR = [{ k: 'combat', n: 'Combat', c: 'r', open: true }, { k: 'production', n: 'Production', c: 'b' }, { k: 'beasts', n: 'Tether Beasts', c: 'y' }]; /* (Production: Combat.BRANCHES' stub; Tether Beasts: not in the module yet - both locked and blank) */
  const SUB = [['might', 'Might'], ['vitality', 'Vitality'], ['spoils', 'Spoils']];
  const SHAPE = { heavy_blow: 'seed', quick_mend: 'bud', second_wind: 'bud', victory_breath: 'bud', ward: 'bud' };
  // node map (content space, Art's layout: Might left column, Vitality right, Spoils bottom row; 96 px between stacked nodes)
  const POS = { strength: [94, 70], vigor: [94, 166], haste: [94, 262], heavy_blow: [94, 358], boss_slayer: [94, 454], lifesteal: [291, 70], quick_mend: [291, 166], second_wind: [291, 262], victory_breath: [291, 358], ward: [291, 454], fortune: [92, 590], beast_lure: [195, 590], boss_lure: [298, 590] };
  const U = { view: 'tree', sel: null, k: 1 };
  const esc2 = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const node = (id) => api.node(id);
  const stateOf = (n) => { const q = api.st(n.id); return q.maxed ? 'maxed' : !q.reqMet ? 'locked' : q.ranks > 0 ? 'partial' : 'available'; };
  const subName = (k) => (SUB.find((q) => q[0] === k) || [0, k])[1];
  const reqTxt = (n) => (n.req ? Object.entries(n.req).map(([k, v]) => `Needs ${v} in ${subName(k)}`).join(' · ') : '');
  const WHY = { max: 'Maxed', req: '', points: 'Not enough skill points', unknown: '' };
  const pts = () => `<span class="stPts" data-st="pts" data-n="${api.points()}"><b>${api.points()}</b> skill point${api.points() === 1 ? '' : 's'}</span>`;
  // the lumenite tree, drawn (no painting: Art's oak art is not this tree): a pale cyan crystal trunk floating over its shadow, the braided tether hanging from under it
  function treeSvg(mode) { const lim = (c, d, o) => `<g class="stLimb ${c}${o ? ' on' : ''}"><path d="${d}" class="stLw"/><path d="${d}" class="stLc"/></g>`;
    const sh = (c, pts2) => pts2.map(([x, y, s, a]) => `<polygon class="stX ${c}" points="0,${-s} ${s * 0.42},0 0,${s * 0.55} ${-s * 0.42},0" transform="translate(${x} ${y}) rotate(${a})"/>`).join('');
    return `<svg class="stTree ${mode}" viewBox="0 0 390 600" aria-hidden="true"><defs><linearGradient id="stTk" x1="0" x2="1"><stop offset="0" stop-color="#7fd6e6"/><stop offset=".45" stop-color="#e8feff"/><stop offset="1" stop-color="#5fb6cc"/></linearGradient>
      <radialGradient id="stSh"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>
      <ellipse cx="195" cy="566" rx="120" ry="18" fill="url(#stSh)"/>
      <g class="stBr"><path d="M188 470 C 180 520, 150 548, 90 575" stroke="#ff5466"/><path d="M195 470 C 192 522, 170 552, 108 584" stroke="#4fa8ff"/><path d="M202 470 C 204 524, 186 556, 126 592" stroke="#ffd34d"/></g>
      <g class="stFloat"><polygon class="stTrunk" points="168,480 222,480 214,400 230,330 206,250 214,190 176,190 184,250 160,330 176,400"/>
      <polyline class="stFacet" points="195,480 199,400 186,330 196,250 195,190"/><polygon class="stRoot" points="170,480 220,480 205,504 185,504"/>
      ${lim('r', 'M180 330 C 140 318, 104 300, 52 304', mode === 'combat')}${sh('r', [[60, 300, 22, -18], [84, 286, 16, 24], [108, 312, 14, -40], [128, 300, 12, 10], [44, 318, 13, -60]])}
      ${lim('b', 'M205 230 C 240 196, 268 170, 320 160', false)}${sh('b', [[318, 154, 22, 22], [292, 172, 15, -20], [270, 160, 13, 40], [336, 176, 13, 70], [250, 186, 11, -10]])}
      ${lim('y', 'M210 330 C 250 318, 286 312, 330 322', false)}${sh('y', [[326, 318, 20, 30], [300, 312, 14, -30], [342, 336, 13, 70], [280, 326, 11, 10]])}
      ${sh('w', [[195, 176, 26, 0], [176, 186, 15, -28], [214, 186, 15, 28]])}</g></svg>`; }
  function viewTree() { const tags = BR.map((b) => `<button class="stTag ${b.c}${b.open ? '' : ' lk'}" type="button" data-st="branch" data-b="${b.k}" ${b.open ? '' : 'aria-disabled="true"'}><b>${esc2(b.n)}</b>${b.open ? '' : '<small>Coming soon</small>'}</button>`).join('');
    return `<div class="stTop"><h2 class="stT">Skill Tree</h2><button class="stX0" type="button" data-st="close" aria-label="Close the Skill Tree"></button></div><div class="stHd">${pts()}</div>
      <div class="stArt">${treeSvg('ov')}<div class="stTags">${tags}</div></div><p class="stFoot">The tree grows as you spend points</p>`; }
  function viewCombat() { const N = api.nodes().filter((n) => POS[n.id]); let lines = '';
    const col = (ids) => { for (let i = 0; i < ids.length - 1; i++) { const a = POS[ids[i]], b = POS[ids[i + 1]]; lines += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`; } };
    col(['strength', 'vigor', 'haste', 'heavy_blow', 'boss_slayer']); col(['lifesteal', 'quick_mend', 'second_wind', 'victory_breath', 'ward']); lines += '<path d="M94 454 C 94 520, 92 540, 92 590 M291 454 C 291 520, 298 540, 298 590 M92 590 L298 590"/>';
    const nodes = N.map((n) => { const s = stateOf(n), r = api.st(n.id).ranks, [x, y] = POS[n.id], lk = s === 'locked';
      return `<button class="stN ${s}${U.sel === n.id ? ' sel' : ''}" type="button" data-st="node" data-id="${n.id}" data-state="${s}" style="left:${x}px;top:${y}px"><img src="${A}node_${SHAPE[n.id] || 'leaf'}_${s}.webp" alt="" draggable="false"><span class="stNp"><b>${esc2(n.name)}</b><small${lk ? ' class="no"' : ''}>${lk ? esc2(reqTxt(n)) : `${r}/${n.max}`}</small></span></button>`; }).join('');
    const heads = `<span class="stSub" style="left:94px;top:6px">MIGHT</span><span class="stSub" style="left:291px;top:6px">VITALITY</span><span class="stSub" style="left:195px;top:530px">SPOILS</span>`;
    return `<div class="stTop"><button class="stBk" type="button" data-st="back" aria-label="Back to the tree"></button><h2 class="stT r">Combat</h2><span class="stSp"></span><button class="stX0" type="button" data-st="close" aria-label="Close the Skill Tree"></button></div><div class="stHd">${pts()}</div>
      <div class="stMapW"><div class="stMap">${treeSvg('combat')}<svg class="stLn" viewBox="0 0 390 660">${lines}</svg>${heads}${nodes}</div></div>${U.sel ? sheet(node(U.sel)) : '<p class="stFoot">Tap a crystal to learn it</p>'}`; }
  function sheet(n) { if (!n) return ''; const q = api.st(n.id), r = q.ranks, p = api.points(), s = stateOf(n), room = q.reqMet ? Math.max(0, Math.min(n.max - r, Math.floor(p / Math.max(1, n.cost)))) : 0, k = U.k = Math.max(1, Math.min(U.k, Math.max(1, room)));
    const can = q.canAdd && k <= room, canR = q.canRemove, sub = subName(n.sub);
    return `<div class="stTray" data-st="sheet" data-id="${n.id}"><button class="stShX" type="button" data-st="unsel" aria-label="Close"></button><div class="stShH"><img src="${A}node_${SHAPE[n.id] || 'leaf'}_${s}.webp" alt=""><div><b>${esc2(n.name)}</b><small>${esc2(sub)} · ${esc2(n.text)}</small></div></div>
      <div class="stCard"><span><small>CURRENT</small><b data-st="cur">${r}</b></span><span><small>NEXT</small><b>${Math.min(n.max, r + k)}</b></span><span><small>MAX</small><b>${n.max}</b></span></div>
      <div class="stCost"><span>Cost ${n.cost * k} skill point${n.cost * k === 1 ? '' : 's'}${n.cost > 1 && n.max === 1 ? ' (one purchase)' : ''}</span><span>${p} available</span></div>${s === 'locked' ? `<p class="stNeed">${esc2(reqTxt(n))}</p>` : q.why && WHY[q.why] ? `<p class="stNeed">${WHY[q.why]}</p>` : ''}
      <div class="stQ"><button class="stPM m" type="button" data-st="minus" aria-label="One less" ${k <= 1 ? 'disabled' : ''}></button><span class="stF" data-st="k">${k}</span><button class="stPM p" type="button" data-st="plus" aria-label="One more" ${k >= room ? 'disabled' : ''}></button></div>
      <button class="stGo" type="button" data-st="confirm" ${can ? '' : 'disabled'}><b>Confirm</b><small>${r} → ${Math.min(n.max, r + k)} ${esc2(n.name)}</small></button>
      <button class="stRf" type="button" data-st="refund" ${canR ? '' : 'disabled'}>Refund ${n.cost > 1 ? n.cost + ' points' : '1 point'}</button></div>`; }
  function draw() { const el = document.getElementById('skillTree'); if (!el) return; const sc = el.querySelector('.stMapW'), y = sc ? sc.scrollTop : 0; el.innerHTML = `<div class="stS" data-view="${U.view}">${U.view === 'combat' ? viewCombat() : viewTree()}</div>`; const sc2 = el.querySelector('.stMapW'); if (sc2) sc2.scrollTop = y; }
  function open(view) { let el = document.getElementById('skillTree'); if (!el) { el = document.createElement('div'); el.id = 'skillTree'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'The Skill Tree'); document.body.appendChild(el); el.addEventListener('click', onTap); }
    U.view = view || 'tree'; U.sel = null; U.k = 1; draw(); el.classList.add('on'); return true; }
  function close() { const el = document.getElementById('skillTree'); if (el) el.classList.remove('on'); U.sel = null; }
  function onTap(e) { const b = e.target.closest('[data-st]'); if (!b || b.disabled) return; const k = b.dataset.st;
    if (k === 'close') return close(); if (k === 'back') { U.view = 'tree'; U.sel = null; return draw(); }
    if (k === 'branch') { if (b.dataset.b !== 'combat') return; U.view = 'combat'; U.sel = null; return draw(); } /* (Production and Tether Beasts: locked, blank) */
    if (k === 'node') { U.sel = b.dataset.id; U.k = 1; return draw(); } if (k === 'unsel') { U.sel = null; return draw(); }
    if (k === 'minus') { U.k = Math.max(1, U.k - 1); return draw(); } if (k === 'plus') { U.k++; return draw(); }
    if (k === 'confirm' && U.sel) { if (api.spend(U.sel, U.k) > 0) U.k = 1; return draw(); }
    if (k === 'refund' && U.sel) { api.refund(U.sel, 1); return draw(); } }
  if (typeof document !== 'undefined' && !document.getElementById('stCss')) { const e = document.createElement('style'); e.id = 'stCss'; e.textContent = [
    '#skillTree{position:fixed;inset:0;z-index:200;display:none;justify-content:center;background:radial-gradient(120% 70% at 50% 30%,#1c2a3a,#0a0d14 75%);color:#2b1a10}#skillTree.on{display:flex}',
    'html:has(#skillTree.on) :is(#drillHud,#millHud){display:none!important}',
    '.stS{position:relative;width:100%;max-width:540px;height:100%;display:flex;flex-direction:column;box-sizing:border-box;padding:calc(env(safe-area-inset-top) + 4px) env(safe-area-inset-right) calc(env(safe-area-inset-bottom) + 6px) env(safe-area-inset-left);font-family:Alegreya,Georgia,serif;-webkit-user-select:none;user-select:none;overflow:hidden}',
    '.stTop{display:flex;align-items:center;gap:8px;flex:none;min-height:44px;padding:0 16px}.stSp{flex:1}.stTop .stT{margin-right:auto}.stTop .stBk+.stT{margin-right:0}',
    '.stT{margin:0;padding:8px 16px;border-radius:8px;font:400 20px/1 "Bree Serif",Georgia,serif;color:#2b1a10;background:linear-gradient(#ecca7e,#c9974a 55%,#a8742f);box-shadow:inset 0 1px 0 rgba(255,240,200,.7),inset 0 0 0 1px rgba(90,60,25,.6),0 2px 4px rgba(0,0,0,.5)}',
    `.stX0,.stBk{width:44px;height:44px;flex:none;border:0;padding:0;background:url(${A}btn_close.webp) center/100% 100% no-repeat;cursor:pointer}.stBk{background-image:url(${A}btn_back.webp)}`,
    '.stHd{display:flex;gap:8px;padding:8px 16px 0;flex:none}.stPts{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 16px;border-radius:10px;color:#eaffe8;font:600 15px Alegreya,Georgia,serif;background:linear-gradient(#3f5a3a,#24361f);box-shadow:inset 0 0 0 2px #1a2414,inset 0 0 0 3px rgba(210,180,110,.6),0 2px 4px rgba(0,0,0,.5)}.stPts b{font:400 17px "Bree Serif",Georgia,serif}',
    '.stArt{position:relative;flex:1 1 auto;min-height:0;display:flex;justify-content:center;align-items:center}.stArt .stTree{height:100%;max-height:600px;width:auto;max-width:100%}',
    '.stTree .stTrunk{fill:url(#stTk);stroke:#d9fbff;stroke-width:1.5;filter:drop-shadow(0 0 8px rgba(160,245,255,.75))}.stTree .stFacet{fill:none;stroke:rgba(255,255,255,.65);stroke-width:2}.stTree .stRoot{fill:#9fe9f5}',
    '.stTree .stLw{fill:none;stroke-width:14;stroke-linecap:round;opacity:.35}.stTree .stLc{fill:none;stroke-width:6;stroke-linecap:round}.stTree .stX{stroke:rgba(255,255,255,.7);stroke-width:1}',
    '.stTree .r .stLw,.stTree .stX.r{stroke:#ff4a5a}.stTree .r .stLc{stroke:#ff8a94}.stTree .stX.r{fill:#ff5a68;filter:drop-shadow(0 0 6px #ff3048)}',
    '.stTree .b .stLw{stroke:#3d9bff}.stTree .b .stLc{stroke:#8cc8ff}.stTree .stX.b{fill:#4aa8ff;filter:drop-shadow(0 0 6px #2a86ff)}',
    '.stTree .y .stLw{stroke:#ffc83a}.stTree .y .stLc{stroke:#ffe48a}.stTree .stX.y{fill:#ffd24a;filter:drop-shadow(0 0 6px #ffb000)}.stTree .stX.w{fill:#e6fdff;filter:drop-shadow(0 0 7px #9ff6ff)}',
    '.stTree .stBr path{fill:none;stroke-width:5;stroke-linecap:round;filter:drop-shadow(0 0 5px currentColor);opacity:.9}',
    '.stFloat{animation:stBob 3.6s ease-in-out infinite}@keyframes stBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}@media (prefers-reduced-motion:reduce){.stFloat{animation:none}}',
    '.stTags{position:absolute;inset:0;pointer-events:none}.stTag{position:absolute;pointer-events:auto;min-height:48px;min-width:96px;padding:4px 14px;border-radius:10px;border:0;display:flex;flex-direction:column;align-items:center;justify-content:center;font:400 17px "Bree Serif",Georgia,serif;color:#2b1a10;background:linear-gradient(#fbf1d6,#e2cfa0);cursor:pointer}',
    '.stTag.r{left:4%;top:46%;box-shadow:0 0 0 2px #7a2a20,0 0 16px 3px rgba(255,70,90,.85)}.stTag.b{right:4%;top:20%}.stTag.y{right:4%;top:56%}.stTag.lk{opacity:.82;cursor:default;background:linear-gradient(#d9d2c0,#b9ae94);box-shadow:0 0 0 2px #5a4a32}.stTag.lk.b{box-shadow:0 0 0 2px #2a4a7a,0 0 10px rgba(70,160,255,.55)}.stTag.lk.y{box-shadow:0 0 0 2px #7a5a10,0 0 10px rgba(255,200,60,.55)}.stTag small{font:400 12px Alegreya,Georgia,serif;color:#5a4a36}',
    '.stFoot{flex:none;margin:6px 16px 4px;padding:10px 12px;border-radius:10px;text-align:center;font-size:13px;color:#3a2a18;background:linear-gradient(#f7ecd2,#e6d4a8)}',
    '.stMapW{flex:1 1 auto;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}.stMap{position:relative;width:390px;height:660px;margin:0 auto}.stMap .stTree{position:absolute;inset:-20px -40px auto;width:470px;height:auto;opacity:.32;pointer-events:none}',
    '.stLn{position:absolute;left:0;top:0;width:390px;height:660px;pointer-events:none}.stLn line,.stLn path{fill:none;stroke:#ff6a78;stroke-width:4;stroke-linecap:round;opacity:.75;filter:drop-shadow(0 0 4px #ff3048)}',
    '.stSub{position:absolute;transform:translateX(-50%);padding:4px 10px;border-radius:7px;font:700 12px/1 Alegreya,Georgia,serif;letter-spacing:.06em;color:#2b1a10;background:linear-gradient(#fbf1d6,#dcc690);box-shadow:0 0 0 1.5px #7a2a20,0 0 8px rgba(255,70,90,.6)}',
    '.stN{position:absolute;width:96px;min-height:82px;transform:translate(-50%,-26px);border:0;padding:0;background:none;display:flex;flex-direction:column;align-items:center;cursor:pointer}.stN img{width:52px;height:52px;border-radius:50%;box-shadow:0 0 12px 2px rgba(255,60,80,.55)}.stN.locked img{box-shadow:none;filter:saturate(.6)}.stN.sel img{box-shadow:0 0 0 3px #7ff3ff,0 0 16px 4px rgba(127,243,255,.8)}',
    '.stNp{display:flex;flex-direction:column;align-items:center;min-width:64px;min-height:30px;margin-top:-4px;padding:2px 8px;border-radius:6px;background:linear-gradient(#fbf1d6,#e2cfa0);box-shadow:0 0 0 1px #6a4a26}.stNp b{font:400 13px "Bree Serif",Georgia,serif;color:#2b1a10;white-space:nowrap}.stNp small{font:400 11px Alegreya,Georgia,serif;color:#4a3a28}.stNp small.no{color:#a02a1e}',
    `.stTray{position:relative;flex:none;margin:6px 8px 0;padding:18px 20px 14px;display:flex;flex-direction:column;gap:10px;color:#fff3df;background:url(${A}frame_leather.webp) center/100% 100% no-repeat;border-radius:10px}`,
    `.stShX{position:absolute;right:6px;top:6px;width:44px;height:44px;border:0;background:url(${A}btn_close.webp) center/32px 32px no-repeat}.stShH{display:flex;gap:12px;align-items:center;padding-right:40px}.stShH img{width:48px;height:48px}.stShH b{display:block;font:400 19px "Bree Serif",Georgia,serif}.stShH small{font-size:12px;opacity:.9}`,
    `.stCard{display:flex;justify-content:space-between;padding:10px 16px;border-radius:10px;color:#2b1a10;background:url(${A}parchment_panel.webp) center/100% 100% no-repeat}.stCard span{display:flex;flex-direction:column}.stCard small{font-size:11px;letter-spacing:.05em}.stCard b{font:400 21px "Bree Serif",Georgia,serif}`,
    '.stCost{display:flex;justify-content:space-between;font-size:13px;opacity:.95}.stNeed{margin:0;color:#ffb4a8;font-size:13px}',
    `.stQ{display:flex;gap:10px;align-items:center}.stPM{width:44px;height:44px;flex:none;border:0;background:url(${A}btn_minus.webp) center/100% 100% no-repeat}.stPM.p{background-image:url(${A}btn_plus.webp)}.stPM:disabled{opacity:.45}.stF{flex:1;min-height:44px;display:flex;align-items:center;justify-content:center;border-radius:10px;color:#2b1a10;font:400 19px "Bree Serif",Georgia,serif;background:linear-gradient(#fbf1d6,#e8d6aa)}`,
    `.stGo{min-height:52px;border:0;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;background:url(${A}btn_confirm.webp) center/100% 100% no-repeat;font:400 18px "Bree Serif",Georgia,serif;cursor:pointer}.stGo small{font:400 12px Alegreya,Georgia,serif}.stGo:disabled{filter:grayscale(.8);opacity:.6}`,
    '.stRf{min-height:44px;border-radius:12px;border:1px solid rgba(255,230,190,.5);background:rgba(0,0,0,.2);color:#fff3df;font:600 14px Alegreya,Georgia,serif}.stRf:disabled{opacity:.4}'].join('');
    document.head.appendChild(e); }
  return { open, close, api, get view() { return U.view; }, get sel() { return U.sel; } };
})();

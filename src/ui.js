
/* =====================================================================
   UI
   ===================================================================== */
function toast(msg) {
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
  const box = $('#toasts'); box.appendChild(el); while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => el.remove(), 3200);
}
function costHtml(cost) { return Object.keys(cost).map((k) => `<span class="cost ${(S.res[k] || 0) < cost[k] ? 'short' : ''}">${CONFIG.resources[k].icon}${fmt(cost[k])}</span>`).join(''); }
function pbar(start, end, cls) { const p = clamp((S.gameTime - start) / Math.max(1, end - start), 0, 1) * 100; return `<div class="bar ${cls || ''}"><i data-pstart="${start}" data-pend="${end}" style="width:${p}%"></i></div>`; }
function countdown(end) { return `<span data-end="${end}">${realLeft(end)}</span>`; }

function renderResbar() {
  const cap = storageCap();
  $('#resbar').innerHTML = RES.map((k) => `<div class="res ${S.res[k] >= cap - 0.5 ? 'full' : ''}" title="${CONFIG.resources[k].name}">${CONFIG.resources[k].icon}<b>${fmt(S.res[k] || 0)}</b></div>`).join('');
  const p = $('#speedPill'); p.className = 'pill' + (S.testMode ? ' test' : ''); p.textContent = S.testMode ? `⏩ TEST ×${speed()}` : 'Real time';
}

/* ---------- Capital ---------- */
function capitalScene() {
  const g = golemCount(), b = S.buildings;
  const hallH = 34 + b.hall * 3, lights = [];
  for (let i = 0; i < Math.min(8, b.hall + 2); i++) lights.push(`<circle class="pulse" style="animation-delay:${i * 0.3}s" cx="${120 + i * 22}" cy="${86 - (i % 3) * 6}" r="2.5" fill="#ffd46b"/>`);
  let wall = ''; const W0 = 30, segW = 290 / (g + 1);
  for (let i = 0; i <= g; i++) wall += `<rect x="${W0 + i * segW}" y="142" width="${segW - 4}" height="16" rx="3" fill="#9a8c74" stroke="#6d604c"/>`;
  for (let i = 0; i < g; i++) { const x = W0 + (i + 1) * segW - 10; wall += `<g><rect x="${x}" y="128" width="16" height="30" rx="5" fill="#8e8069" stroke="#5e5240"/><circle cx="${x + 5}" cy="136" r="1.6" fill="#ffd46b" class="pulse"/><circle cx="${x + 11}" cy="136" r="1.6" fill="#ffd46b" class="pulse"/></g>`; }
  const spineDepth = 170 + liftReach() * 12;
  return `<div class="scene"><svg viewBox="0 0 360 230" aria-label="Your capital on the Rim">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7e3b5"/><stop offset=".6" stop-color="#e9c99a"/><stop offset="1" stop-color="#c9a77a"/></linearGradient>
    <linearGradient id="chasm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f7a7a"/><stop offset=".5" stop-color="#2d4258"/><stop offset="1" stop-color="#141a2a"/></linearGradient>
    <radialGradient id="sun" cx=".8" cy=".2" r=".5"><stop offset="0" stop-color="#fff6d8"/><stop offset="1" stop-color="#fff6d8" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="360" height="230" fill="url(#sky)"/><rect width="360" height="230" fill="url(#sun)"/>
  <path d="M0 60 Q60 40 120 55 T240 50 T360 58 L360 100 L0 100Z" fill="#b8c6a0" opacity=".55"/>
  <path d="M0 158 L360 158 L360 170 Q300 175 260 172 L240 230 L120 230 L100 172 Q50 176 0 170Z" fill="#a08a64"/>
  <path d="M100 172 Q180 182 260 172 L240 230 L120 230Z" fill="url(#chasm)"/>
  <line x1="180" y1="150" x2="180" y2="${spineDepth}" stroke="#ffd46b" stroke-width="2" class="lumenglow"/>
  ${S.outposts.map((o, i) => `<circle cx="${170 + (i % 2 ? 22 : -14)}" cy="${170 + o.layer * 12}" r="3" fill="${o.dark ? '#555' : '#ffd46b'}" class="pulse"/>`).join('')}
  <!-- buildings -->
  <g><rect x="150" y="${150 - hallH}" width="60" height="${hallH}" fill="#d8c3a0" stroke="#7a5f3c"/><path d="M144 ${150 - hallH} L180 ${120 - hallH} L216 ${150 - hallH}Z" fill="#b0573a"/><circle cx="180" cy="${132 - hallH}" r="5" fill="#ffd46b" class="pulse lumenglow"/></g>
  <g><rect x="60" y="112" width="44" height="38" fill="#cdb48a" stroke="#7a5f3c"/><path d="M56 112 L82 92 L108 112Z" fill="#8a6b3a"/><text x="82" y="138" font-size="14" text-anchor="middle">📦</text></g>
  <g><rect x="240" y="118" width="40" height="32" fill="#cdb48a" stroke="#7a5f3c"/><path d="M236 118 L260 100 L284 118Z" fill="#4f8c8a"/><text x="260" y="140" font-size="13" text-anchor="middle">🗡️</text></g>
  <g><rect x="294" y="124" width="34" height="26" fill="#c9b08a" stroke="#7a5f3c"/><path d="M290 124 L311 108 L332 124Z" fill="#9a6a4a"/><text x="311" y="143" font-size="12" text-anchor="middle">🐾</text></g>
  ${b.forge > 0 ? `<g><rect x="20" y="122" width="32" height="28" fill="#b9a07a" stroke="#6d5030"/><rect x="40" y="104" width="7" height="18" fill="#6d5030"/><circle cx="44" cy="98" r="5" fill="#ccc" opacity=".5" class="pulse"/></g>` : ''}
  <g><rect x="170" y="150" width="20" height="8" fill="#6d5030"/><text x="180" y="166" font-size="9" text-anchor="middle" fill="#fff3d0">Lift ${b.lift}</text></g>
  ${lights.join('')}
  ${wall}
  <text x="10" y="222" font-size="10" fill="#f3e6c8" opacity=".9">The Rim · the Hollow opens below ↓</text>
  </svg></div>`;
}
function buildingEffect(id, lvl) {
  const H = CONFIG.hallPerLevel;
  switch (id) {
    case 'hall': return `${H.crowns * lvl}👑 ${H.stone * lvl}🪨 ${fmt1(H.lumen * lvl)}🏮 /h`;
    case 'storehouse': { const c = CONFIG.storage; return `cap ${fmt(c.base * Math.pow(c.growth, lvl - 1))} · protects ${Math.round(clamp(c.protectBase + c.protectPerLevel * (lvl - 1), 0, .8) * 100)}%`; }
    case 'training': return `+${CONFIG.trainingPerLevel.power * (lvl - 1)} power · spar ${CONFIG.trainingPerLevel.sparXp * lvl} XP/h`;
    case 'lift': return `reach layer ${Math.min(CONFIG.lift.maxReach, lvl + 1)} · ${CONFIG.lift.capacityPerLevel * lvl} wt/h · Pull −${Math.round(CONFIG.lift.pullCutPerLevel * (lvl - 1) * 100)}%`;
    case 'wall': { const w = CONFIG.wall; return `${Math.min(w.maxGolems, w.baseGolems + Math.floor((lvl - 1) / w.golemEvery))} golems × ${w.golemPower + w.golemPowerPerLevel * (lvl - 1)} power`; }
    case 'kennel': return `${lvl >= 3 ? 2 : 1} pet slot${lvl >= 3 ? 's' : ''} · pets +${Math.round(CONFIG.kennelPetBoost * (lvl - 1) * 100)}%`;
    case 'forge': return lvl ? `${fmt1(CONFIG.forgePerLevel * lvl)} 🔩/h from raw ore` : 'not built';
  }
  return '';
}
function viewCapital() {
  let h = capitalScene();
  const def = Math.round(defensePower());
  h += `<div class="card"><div class="row between"><h2>Rim Capital</h2><span class="tag">🛡️ Defense ${def}</span></div>
    <div class="small">Storage cap <b>${fmt(storageCap())}</b> each · ${Math.round(protectedShare() * 100)}% safe from raids.
    ${S.gameTime < S.shieldUntil ? `<br>🛡️ Shield up: ${countdown(S.shieldUntil)}` : `<br>⚠️ No shield. Raiders may come.`}</div>
    ${S.build ? `<div class="small" style="margin-top:6px">🔨 Building <b>${CONFIG.buildings[S.build.id].name} Lv ${S.build.to}</b> · ${countdown(S.build.end)}</div>${pbar(S.build.start, S.build.end)}` : `<div class="dim" style="margin-top:6px">Builders idle. Pick an upgrade.</div>`}
  </div>`;
  for (const id in CONFIG.buildings) {
    const b = CONFIG.buildings[id], lvl = S.buildings[id], block = buildBlock(id), cost = buildCost(id);
    const building = S.build && S.build.id === id;
    h += `<div class="card bld"><div class="ic">${b.icon}</div><div>
      <div class="row between"><h3>${b.name}<span class="lvl">Lv ${lvl}</span></h3></div>
      <div class="dim">${b.desc}</div>
      <div class="small" style="margin:4px 0">Now: <b>${buildingEffect(id, lvl)}</b>${lvl < b.max ? `<br>Next: ${buildingEffect(id, lvl + 1)}` : ''}</div>
      ${lvl < b.max ? `<div class="wrapgap">${costHtml(cost)}<span class="dim">⏱ ${gameDur(buildTime(id))}</span></div>
      <div style="margin-top:6px"><button class="btn sm" data-act="build" data-id="${id}" ${block || !canAfford(cost) ? 'disabled' : ''}>${building ? 'Building…' : block && block !== 'Builders busy' ? block : lvl === 0 ? 'Build' : 'Upgrade'}</button></div>` : '<span class="tag good">Max level</span>'}
    </div></div>`;
  }
  return h;
}

/* ---------- Hollow ---------- */
function ladderSvg() {
  const bands = CONFIG.layers.map((L, i) => {
    const y = 20 + i * 70, reach = L.id <= liftReach();
    return `<rect x="0" y="${y}" width="360" height="70" fill="${L.color}" opacity="${0.35 + i * 0.12}"/>
      <text x="10" y="${y + 18}" font-size="12" fill="${i > 1 ? '#fff3d0' : '#3a2e22'}" font-family="Georgia">${L.id}. ${L.name}${reach ? '' : ' 🔒'}</text>`;
  }).join('');
  const spineY = 20 + liftReach() * 70 - 10;
  const ops = S.outposts.map((o, i) => {
    const y = 20 + (o.layer - 1) * 70 + 42, x = 230 + i * 50;
    return `<line x1="180" y1="${y}" x2="${x}" y2="${y}" stroke="#ffd46b" stroke-width="1.5" stroke-dasharray="${o.state === 'anchored' ? '0' : '4 4'}"/>
      <circle cx="${x}" cy="${y}" r="9" fill="${o.dark ? '#444' : '#ffd46b'}" class="${o.state === 'anchored' ? 'pulse lumenglow' : ''}"/>
      <text x="${x}" y="${y + 4}" font-size="11" text-anchor="middle">${opType(o).icon}</text>`;
  }).join('');
  let hero = '';
  const t = S.hero.task;
  if (t && (t.type === 'expedition' || t.type === 'stranded')) {
    const L = layerById(t.layer), p = t.type === 'expedition' ? clamp((S.gameTime - t.start) / (t.end - t.start), 0, 1) : 1;
    const depth = 20 + (t.layer - 1) * 70 + 40, y = 14 + (p < 0.5 ? p * 2 : (1 - p) * 2) * (depth - 14);
    hero = `<g transform="translate(120 ${t.type === 'stranded' ? depth : y})"><circle r="11" fill="#fff3d0" stroke="#c9822f"/><text y="5" font-size="13" text-anchor="middle">${t.type === 'stranded' ? '🕯️' : '🧗'}</text></g>
            <line x1="120" y1="0" x2="120" y2="${t.type === 'stranded' ? depth : y}" stroke="#d8c3a0" stroke-width="1" stroke-dasharray="2 3"/>`;
  }
  return `<div class="scene"><svg viewBox="0 0 360 ${20 + CONFIG.layers.length * 70}" aria-label="The Lantern Ladder">
    <rect width="360" height="20" fill="#e9c99a"/><text x="180" y="14" font-size="10" text-anchor="middle" fill="#5a4528">🏰 Rim capital</text>
    ${bands}<line x1="180" y1="16" x2="180" y2="${spineY}" stroke="#ffd46b" stroke-width="3" class="lumenglow"/>${ops}${hero}</svg></div>`;
}
function heroStatusCard() {
  const t = S.hero.task;
  let s = `<div class="card"><div class="row between"><h2>🧗 ${CONFIG.hero.name}, Lv ${S.hero.level}</h2><span class="tag">⚔️ ${Math.round(attackPower())}</span></div>`;
  s += `<div class="bar xp"><i style="width:${(S.hero.xp / xpToNext()) * 100}%"></i></div><div class="dim">${fmt(S.hero.xp)} / ${fmt(xpToNext())} XP · training boost <b>+${fmt1(boostPct())}%</b> XP</div>`;
  if (!t) s += `<div class="small" style="margin-top:6px">Home at the Rim, sparring for idle XP. Ready to descend.</div>`;
  else if (t.type === 'expedition') s += `<div class="small" style="margin-top:6px">Exploring <b>${layerById(t.layer).name}</b> · back in ${countdown(t.end)}</div>${pbar(t.start, t.end)}`;
  else if (t.type === 'stranded') s += `<div class="small" style="margin-top:6px">🕯️ Stranded in <b>${layerById(t.layer).name}</b>. Rescue line arrives in ${countdown(t.end)}</div>${pbar(t.start, t.end)}
      <button class="btn alt sm" data-act="rescue">Send rescue line now (${rescueCost()} 🏮)</button>`;
  else if (t.type === 'raid') s += `<div class="small" style="margin-top:6px">⚔️ Marching on <b>${CONFIG.rivals[t.rival].name}</b> · ${countdown(t.end)}</div>${pbar(t.start, t.end)}`;
  return s + '</div>';
}
function viewHollow() {
  let h = ladderSvg() + heroStatusCard();
  for (const L of CONFIG.layers) {
    const ok = L.id <= expeditionReach(), ch = Math.round(successChance(L) * 100);
    const lootRange = Object.keys(L.loot).map((k) => `<span class="cost">${CONFIG.resources[k].icon}${L.loot[k][0]}–${L.loot[k][1]}</span>`).join('');
    h += `<div class="card layer ${ok ? '' : 'locked'}" style="--c:${L.color}">
      <div class="row between"><h3>${L.id}. ${L.name}</h3><span class="tag ${ch >= 75 ? 'good' : ch < 50 ? 'bad' : ''}">${ch}% safe return</span></div>
      <div class="dim">${L.flavor}</div>
      <div class="wrapgap small" style="margin:6px 0">⏱ ${gameDur(L.hours * HOUR)} · 🏮 ${L.lumen} · rec. power ${L.rec}</div>
      <div class="wrapgap">${lootRange}<span class="tag">🥚 ${CONFIG.pets[L.pet].icon} ${Math.round(L.egg * 100)}%</span></div>
      <div style="margin-top:8px">${ok ? `<button class="btn deep sm" data-act="exp" data-id="${L.id}" ${!heroHome() || S.res.lumen < L.lumen ? 'disabled' : ''}>Descend</button>` : `<span class="tag">🔒 Upgrade Tether Lift to Lv ${L.id - 2} to scout here</span>`}</div>
    </div>`;
  }
  h += `<div class="card dim">If your lantern runs low you don't die: you get stranded on a ledge and come home later with half the haul. Deeper = longer, riskier, richer.</div>`;
  return h;
}

/* ---------- Outposts ---------- */
const STATE_LABEL = { anchored: '⚓ Anchored', packing: '📦 Packing up', traveling: '🚶 On the move', settling: '🪝 Settling in' };
function viewOutposts() {
  let h = `<div class="card"><h2>The Pull</h2>
    <div class="small">Hauling goods up the Tether costs Lumen: <b>weight × layers climbed × layer pull</b>. Heavy raw ore is expensive. Refine it below and send light Steel up instead.</div>
    <div class="wrapgap small" style="margin-top:6px"><span class="tag">🧵 Lift capacity ${liftCapacity()} wt/h</span><span class="tag">⚓ Spine reaches layer ${liftReach()}</span><span class="tag">⏱ next lift ${countdown(S.nextShipAt)}</span></div>
    ${S.lastShip ? `<div class="dim" style="margin-top:6px">Last lift: ${lootText(S.lastShip.got) || 'nothing'} · Pull paid ${fmt1(S.lastShip.cost)} 🏮</div>` : ''}
  </div>`;
  for (const o of S.outposts) {
    const T = opType(o), v = veinById(o.vein), L = layerById(o.layer), r = outpostRates(o), tot = stockTotal(o);
    const pAll = shipPreview(o, 'all'), pRef = shipPreview(o, 'refined');
    h += `<div class="card layer" style="--c:${L.color}">
      <div class="row between"><h3>${T.icon} ${esc(o.name)} <span class="dim">${T.name}</span></h3><span class="tag ${o.state === 'anchored' ? 'good' : 'lumen'}">${STATE_LABEL[o.state]}</span></div>
      <div class="small">${L.id}. ${L.name} · <b>${o.state === 'anchored' || o.state === 'settling' ? v.name : '→ ' + veinById(o.move.toVein).name}</b>
        ${o.dark ? '<span class="tag bad">🌑 dark (no Lumen)</span>' : ''} ${seasoned(o) ? '<span class="tag good">Seasoned +10%</span>' : ''} ${o.full ? '<span class="tag bad">Stockhold full</span>' : ''}</div>`;
    if (o.move) h += `<div class="small" style="margin-top:4px">${STATE_LABEL[o.state]} · ${countdown(o.move.phaseEnd)}</div>${pbar(o.move.phaseStart, o.move.phaseEnd)}`;
    if (o.state === 'anchored') {
      h += `<div class="small" style="margin-top:6px">Vein richness ${Math.round(S.veins[o.vein] * 100)}%</div><div class="bar rich"><i style="width:${S.veins[o.vein] * 100}%"></i></div>
        <div class="wrapgap small">Makes: ${Object.keys(r).map((k) => `<span class="cost">${CONFIG.resources[k].icon}${fmt1(r[k])}/h</span>`).join('')} <span class="dim">· burns ${burnRate(o)} 🏮/h</span></div>`;
    }
    h += `<div class="small" style="margin-top:6px">Stockhold ${fmt(tot)} / ${T.stockCap}</div><div class="bar"><i style="width:${(tot / T.stockCap) * 100}%"></i></div>
      <div class="wrapgap">${Object.keys(o.stock).filter((k) => o.stock[k] >= 1).map((k) => `<span class="cost">${CONFIG.resources[k].icon}${fmt(o.stock[k])}</span>`).join('') || '<span class="dim">empty</span>'}</div>
      <div class="dim" style="margin-top:4px">Lift everything now: ${fmt1(pAll.cost)} 🏮 · refined only: ${fmt1(pRef.cost)} 🏮</div>
      <div style="margin-top:8px" class="small"><b>Module:</b> ${o.module ? `${CONFIG.modules[o.module].icon} ${CONFIG.modules[o.module].name} <span class="dim">(${CONFIG.modules[o.module].desc})</span>` : '<span class="dim">none</span>'}</div>
      <div class="wrapgap" style="margin-top:4px">${Object.keys(CONFIG.modules).filter((m) => m !== o.module).map((m) => `<button class="btn ghost sm" data-act="module" data-uid="${o.uid}" data-id="${m}" ${canAfford(CONFIG.modules[m].cost) ? '' : 'disabled'}>${o.module ? 'Swap to' : '+'} ${CONFIG.modules[m].icon} ${CONFIG.modules[m].name} ${costHtml(CONFIG.modules[m].cost)}</button>`).join('')}</div>
      <div class="small" style="margin-top:8px"><b>Auto-ship each hour:</b></div>
      <div class="segs">${['all', 'refined', 'off'].map((m) => `<button class="btn sm ${o.ship === m ? 'alt' : 'ghost'}" data-act="shipmode" data-uid="${o.uid}" data-id="${m}">${m === 'all' ? 'Everything' : m === 'refined' ? 'Refined only' : 'Hold'}</button>`).join('')}</div>
      <div class="wrapgap" style="margin-top:8px">
        <button class="btn alt sm" data-act="ship" data-uid="${o.uid}" ${o.state !== 'anchored' || tot < 1 ? 'disabled' : ''}>🧵 Lift now</button>
        <button class="btn deep sm" data-act="movemenu" data-uid="${o.uid}" ${o.state !== 'anchored' ? 'disabled' : ''}>🧭 Move…</button>
      </div></div>`;
  }
  const D = CONFIG.outpostTypes.drill;
  if (!S.outposts.some((o) => o.type === 'drill')) {
    h += `<div class="card"><h3>⛏️ Build a Tetherdrill</h3><div class="dim">${D.desc} A second outpost lets you split a chain: one drill on iron, one on coal, and a Smelter pulls from both.</div>
      <div class="wrapgap" style="margin:6px 0">${costHtml(D.cost)}</div>
      <button class="btn sm" data-act="drill" ${S.buildings.lift < D.needsLift || !canAfford(D.cost) ? 'disabled' : ''}>${S.buildings.lift < D.needsLift ? `Needs Tether Lift Lv ${D.needsLift}` : 'Lower it onto the Spine'}</button></div>`;
  }
  h += `<div class="card dim">Chain to try: get your Spine to layer 4 (Tether Lift Lv 3), move an outpost onto the <b>Iron Seam</b>, install a <b>Smelter</b>, set shipping to <b>Refined only</b>. Compare the Pull cost against lifting raw ore to the Rim Forge.</div>`;
  return h;
}
function moveMenu(uidv) {
  const o = S.outposts.find((x) => x.uid === uidv);
  let h = `<h2>🧭 Move ${esc(o.name)}</h2><div class="dim">Packing up, traveling, and settling take time. While moving, the outpost makes nothing and is easy prey for raiders.</div>`;
  for (const L of CONFIG.layers) {
    const reach = L.id <= liftReach();
    h += `<div class="card layer ${reach ? '' : 'locked'}" style="--c:${L.color};margin-top:8px"><h3>${L.id}. ${L.name}</h3>`;
    for (const v of L.veins) {
      const taken = veinTaken(v.id, o.uid), here = o.vein === v.id, cost = moveCost(L.id);
      h += `<div class="row between" style="margin-top:6px;gap:6px"><div class="small"><b>${v.name}</b> · ${Object.keys(v.prod).map((k) => CONFIG.resources[k].icon + fmt1(v.prod[k] * opType(o).mult) + '/h').join(' ')} · rich ${Math.round(S.veins[v.id] * 100)}%<br>
        <span class="dim">⏱ ${gameDur(moveTime(o, L.id))}</span> ${costHtml(cost)}</div>
        ${here ? '<span class="tag good">Here</span>' : taken ? '<span class="tag">Taken</span>' : !reach ? '<span class="tag">🔒</span>' : `<button class="btn sm" data-act="move" data-uid="${o.uid}" data-id="${v.id}" ${canAfford(cost) ? '' : 'disabled'}>Go</button>`}</div>`;
    }
    h += '</div>';
  }
  h += `<button class="btn ghost" style="width:100%;margin-top:6px" data-act="close">Cancel</button>`;
  openModal(h, 'move');
}

/* ---------- Raids ---------- */
function viewRaids() {
  ensureRivals();
  const gp = golemPower(), g = golemCount();
  let h = `<div class="card"><h2>🗿 Your defense</h2>
    <div class="grid2" style="margin-top:6px">
      <div class="stat"><b>${g} × ${gp}</b><span>sleeping rock golems</span></div>
      <div class="stat"><b>${Math.round(petsPower() * CONFIG.raids.petDefense)}</b><span>pets on guard</span></div>
      <div class="stat"><b>${heroHome() ? Math.round(heroBasePower() * CONFIG.raids.heroHomeDefense) : 0}</b><span>${heroHome() ? 'hero at home' : 'hero away!'}</span></div>
      <div class="stat"><b>${Math.round(defensePower())}</b><span>total defense</span></div>
    </div>
    <div class="small" style="margin-top:8px">${S.gameTime < S.shieldUntil ? `🛡️ Shielded for ${countdown(S.shieldUntil)}` : '⚠️ Unshielded. AI raiders strike every 8–14 game hours.'}</div>
    <div class="wrapgap" style="margin-top:8px">${S.lastRaid && S.lastRaid.kind === 'defense' ? `<button class="btn ghost sm" data-act="replay">▶︎ Replay last defense</button>` : ''}
      <button class="btn ghost sm" data-act="raidnow">🧪 Test: trigger a raid on me</button></div>
  </div>`;
  h += `<div class="card"><h2>⚔️ Rival bases</h2><div class="dim">Async and auto-resolved: your hero + pets vs their defense. Raiding costs ${CONFIG.raids.attackLumen} 🏮 and takes your hero ${gameDur(CONFIG.raids.marchMinutes * MIN)}.</div></div>`;
  CONFIG.rivals.forEach((d, i) => {
    const r = S.rivals[i], ratio = attackPower() / r.power, est = starsFor(ratio), shield = S.gameTime < r.shieldUntil;
    h += `<div class="card"><div class="row between"><h3>${d.icon} ${d.name}</h3><span class="tag ${ratio >= 1 ? 'good' : ratio < 0.75 ? 'bad' : ''}">🛡️ ${r.power}</span></div>
      <div class="dim">${d.lord}</div>
      <div class="wrapgap small" style="margin:6px 0">Likely: <b>${'★'.repeat(est)}${'☆'.repeat(3 - est)}</b> · full loot ${lootText(rivalLoot(i))}</div>
      ${shield ? `<span class="tag">🛡️ shielded ${countdown(r.shieldUntil)}</span>` : `<button class="btn red sm" data-act="attack" data-id="${i}" ${!heroHome() || S.res.lumen < CONFIG.raids.attackLumen ? 'disabled' : ''}>Raid</button>`}
    </div>`;
  });
  h += `<div class="card"><h2>📜 Chronicle</h2><div class="log">${S.log.slice(0, 40).map((e) => `<div><span class="t">${fmtDur(S.gameTime - e.t)} ago</span>${e.icon} ${e.msg}</div>`).join('') || '<div class="dim">Nothing yet.</div>'}</div></div>`;
  return h;
}
function raidSceneSvg(g) {
  let golems = '';
  const segW = 300 / (g + 1);
  for (let i = 0; i < g; i++) {
    const x = 30 + (i + 1) * segW - 14;
    golems += `<g class="golem" style="--i:${i}">
      <rect x="${x}" y="78" width="28" height="56" rx="8" fill="#8e8069" stroke="#5e5240" stroke-width="2"/>
      <rect x="${x + 4}" y="92" width="20" height="6" rx="2" fill="#7a6d58"/>
      <rect class="arm" x="${x - 9}" y="96" width="9" height="26" rx="4" fill="#857760"/><rect class="arm" x="${x + 28}" y="96" width="9" height="26" rx="4" fill="#857760"/>
      <circle class="eye" cx="${x + 9}" cy="86" r="3" fill="#ffd46b" style="filter:drop-shadow(0 0 4px #ffd46b)"/><circle class="eye" cx="${x + 19}" cy="86" r="3" fill="#ffd46b" style="filter:drop-shadow(0 0 4px #ffd46b)"/>
    </g>`;
  }
  let raiders = ''; for (let i = 0; i < 5; i++) raiders += `<text x="${-40 + (i % 3) * 14}" y="${120 + (i % 2) * 14}" font-size="16">🏴</text>`;
  let blocks = ''; for (let i = 0; i <= g; i++) blocks += `<rect x="${30 + i * segW}" y="118" width="${segW - 18}" height="16" rx="3" fill="#9a8c74" stroke="#6d604c"/>`;
  return `<svg viewBox="0 0 360 160"><defs><linearGradient id="rsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3f5c"/><stop offset="1" stop-color="#c58a5a"/></linearGradient></defs>
    <rect width="360" height="160" fill="url(#rsky)"/><rect y="134" width="360" height="26" fill="#6d5a40"/>${blocks}<g id="raiders" class="raiderwrap"><g class="raider">${raiders}</g></g>${golems}</svg>`;
}
function showReveal(r) {
  S.pendingReveal = null;
  const win = r.stars === 0;
  const lines = [
    `🏴 <b>${esc(r.who)}</b> march on your wall… attack power ${r.atk}.`,
    `It looks like an ordinary wall. Then the columns <b>stand up</b>. ${r.golems} rock golems wake, eyes full of Lumen.`,
    win ? `<span class="stars">☆☆☆</span><br><b>Raid repelled!</b> The golems hurl them back over the Rim. Spoils: ${lootText(r.gained)}`
        : `<span class="stars">${'★'.repeat(r.stars)}${'☆'.repeat(3 - r.stars)}</span><br>They broke through and took ${lootText(r.lost) || 'very little'}. ${Math.round(protectedShare() * 100)}% of your stock was safe in the Storehouse.`,
    `<span class="dim">Defense ${r.def} = golems ${r.golems}×${r.golemPower}${r.heroHome ? ' + hero' : ' (hero was away)'} + pets. Shield up for ${CONFIG.raids.shieldHours} game hours.${r.first ? ' (First raid: a tutorial raid you are meant to win.)' : ''}</span>`,
  ];
  openModal(`<h2>🗿 Raid on your capital!</h2><div class="raidscene" id="rscene">${raidSceneSvg(r.golems)}</div>
    ${lines.map((l, i) => `<p class="reveal-line" id="rl${i}">${l}</p>`).join('')}
    <button class="btn" style="width:100%" data-act="close">${win ? 'Glorious' : 'Rebuild'}</button>`, 'reveal');
  const sc = $('#rscene');
  setTimeout(() => sc.classList.add('approach'), 60);
  const on = (i, d) => setTimeout(() => { const e = $('#rl' + i); if (e) e.classList.add('on'); }, d);
  on(0, 100);
  setTimeout(() => { sc.classList.add('wake'); sc.classList.add('shake'); }, 1500);
  on(1, 1700);
  setTimeout(() => { if (win) sc.classList.add('flee'); }, 3200);
  on(2, 3300); on(3, 3900);
}
function showAttackReport(r) {
  openModal(`<h2>${r.icon} Raid on ${esc(r.name)}</h2>
    <div class="stars" style="text-align:center;margin:10px 0">${'★'.repeat(r.stars)}${'☆'.repeat(3 - r.stars)}</div>
    <p>Your power ${r.atk} vs their defense ${r.def}.</p>
    <p>${r.stars ? `Loot: ${lootText(r.got)}` : 'Their wall held. Nothing taken.'} · +${fmt(r.xp)} XP</p>
    <button class="btn" style="width:100%" data-act="close">Onward</button>`, 'report');
}

/* ---------- Training ---------- */
function viewTraining() {
  return `<div class="card"><div class="row between"><h2>🗡️ Training Grounds</h2><span class="tag lumen" data-bind="boost"></span></div>
    <div class="dim">Every tap banks into a rolling 7-day boost to hero XP. Optional: idle play still gets you there, just slower.</div></div>
    <div id="tapzone" role="button" aria-label="Tap the training dummy">
      <svg viewBox="0 0 360 220">
        <ellipse cx="180" cy="200" rx="150" ry="16" fill="#8fae73" opacity=".6"/>
        <g id="heroG" transform="translate(115 98)">
          <ellipse cx="0" cy="98" rx="26" ry="6" fill="#000" opacity=".15"/>
          <rect x="-13" y="34" width="26" height="40" rx="9" fill="#4f8c8a"/>
          <rect x="-10" y="72" width="8" height="26" rx="3" fill="#5a4528"/><rect x="2" y="72" width="8" height="26" rx="3" fill="#5a4528"/>
          <circle cx="0" cy="20" r="16" fill="#f3d6b0"/>
          <path d="M-17 16 Q0 -8 17 16 Q8 6 0 8 Q-8 6 -17 16Z" fill="#6b4a2a"/>
          <circle cx="6" cy="20" r="2" fill="#3a2e22"/>
          <path d="M-14 14 Q-24 26 -14 40" stroke="#c9822f" stroke-width="3" fill="none"/>
          <circle cx="-16" cy="46" r="5" fill="#ffd46b" class="pulse lumenglow"/>
          <g id="swordArm"><rect x="8" y="40" width="7" height="22" rx="3" fill="#f3d6b0"/><rect x="9" y="-4" width="5" height="46" rx="2" fill="#c9a77a" stroke="#7a5f3c"/><rect x="4" y="38" width="15" height="4" rx="2" fill="#7a5f3c"/></g>
        </g>
        <g id="dummyG">
          <rect x="242" y="110" width="8" height="90" fill="#7a5f3c"/>
          <ellipse cx="246" cy="132" rx="24" ry="30" fill="#d8b878" stroke="#8a6b3a" stroke-width="2"/>
          <path d="M226 128 L266 136 M228 142 L264 124" stroke="#8a6b3a" stroke-width="2"/>
          <circle cx="246" cy="92" r="15" fill="#e2c88f" stroke="#8a6b3a" stroke-width="2"/>
          <rect x="216" y="122" width="60" height="7" rx="3" fill="#a7844e"/>
          <circle cx="246" cy="132" r="8" fill="none" stroke="#b0473a" stroke-width="3"/>
        </g>
        <g id="sparks"></g>
      </svg>
      <div class="hint">Tap anywhere here (or hold Space on desktop)</div>
    </div>
    <div class="card" style="margin-top:10px">
      <div class="grid2">
        <div class="stat"><b data-bind="today"></b><span>taps today (daily cap)</span></div>
        <div class="stat"><b data-bind="week"></b><span>7-day bank</span></div>
        <div class="stat"><b data-bind="boost2"></b><span>XP boost</span></div>
        <div class="stat"><b data-bind="marks"></b><span>Spar Marks (over cap)</span></div>
      </div>
      <div class="bar boost"><i data-bind="boostbar"></i></div>
      <div class="dim" data-bind="next"></div>
      <div class="dim" style="margin-top:6px">Curve: boost = 100% × (bank ÷ ${fmt(weeklyTarget())})<sup>${CONFIG.tap.exponent}</sup> · daily cap ${fmt(dailyCap())}${S.testMode ? ` <b>(test mode: thresholds ×${CONFIG.tap.testScale}; real game uses 300k / 60k)</b>` : ''}. Taps older than 7 game days fall out of the bank. Taps faster than ${CONFIG.tap.maxTapsPerSec}/s are ignored (anti auto-clicker).</div>
    </div>
    <div id="heroSlot">${heroStatusCard()}</div>
    <div id="petSlot">${petsCard()}</div>`;
}
function petsCard() {
  const n = petSlots();
  let h = `<div class="card"><h2>🐾 Pets <span class="dim">${n} slot${n > 1 ? 's' : ''}${n < 2 ? ' · 2nd at Kennel Lv 3' : ''}</span></h2>
    <div class="dim">Equipped pets add power to raids and defense, and their bonus applies. Find more as eggs in the Hollow.</div>`;
  for (const p of S.pets) {
    const d = CONFIG.pets[p.id], on = S.slots.slice(0, n).includes(p.uid), cost = petUpCost(p);
    h += `<div class="row between" style="margin-top:8px;gap:6px"><div><b>${d.icon} ${d.name}</b> <span class="lvl">Lv ${p.level}</span><br><span class="dim">power ${Math.round(petPower(p))} · ${d.bonus}</span></div>
      <div class="wrapgap" style="justify-content:flex-end"><button class="btn sm ${on ? 'alt' : 'ghost'}" data-act="equip" data-uid="${p.uid}">${on ? 'Equipped' : 'Equip'}</button>
      ${p.level < CONFIG.petMax ? `<button class="btn ghost sm" data-act="petup" data-uid="${p.uid}" ${canAfford(cost) ? '' : 'disabled'}>Feed ${costHtml(cost)}</button>` : ''}</div></div>`;
  }
  return h + '</div>';
}
function updateTrainingBinds() {
  const set = (k, v, attr) => { const e = document.querySelector(`[data-bind="${k}"]`); if (e) { if (attr) e.style.width = v; else if (e.innerHTML !== v) e.innerHTML = v; } };
  const b = boostPct(), wk = weekTaps(), today = tapsToday();
  set('boost', `+${fmt1(b)}% XP`); set('boost2', `+${fmt1(b)}%`);
  set('today', `${fmt(today)} / ${fmt(dailyCap())}`); set('week', fmt(wk)); set('marks', fmt(S.taps.marks));
  set('boostbar', b + '%', true);
  const next = [10, 25, 50, 75, 100].find((x) => x > b + 0.01);
  set('next', next ? `Next milestone +${next}% at ${fmt(Math.ceil(weeklyTarget() * Math.pow(next / 100, 1 / CONFIG.tap.exponent)))} taps in the bank.` : 'Maxed! Extra taps still count once old ones roll off.');
}
let tapTimes = [];
function doTap(x, y) {
  const now = performance.now();
  tapTimes = tapTimes.filter((t) => now - t < 1000);
  if (tapTimes.length >= CONFIG.tap.maxTapsPerSec) { return false; }
  tapTimes.push(now);
  const d = dayIndex(); let mark = false;
  if ((S.taps.days[d] || 0) < dailyCap()) S.taps.days[d] = (S.taps.days[d] || 0) + 1; else { S.taps.marks++; mark = true; }
  S.taps.total++; S.stats.tapsAll++;
  const arm = document.getElementById('swordArm'), dm = document.getElementById('dummyG');
  if (arm) { arm.classList.remove('swing'); void arm.getBBox; arm.getBoundingClientRect(); arm.classList.add('swing'); }
  if (dm) { dm.classList.remove('hit'); dm.getBoundingClientRect(); dm.classList.add('hit'); }
  const zone = document.getElementById('tapzone');
  if (zone && x != null) {
    const r = zone.getBoundingClientRect(), f = document.createElement('div');
    f.className = 'float' + (mark ? ' mark' : ''); f.textContent = mark ? '+1 Spar Mark' : '+1';
    f.style.left = (x - r.left) + 'px'; f.style.top = (y - r.top - 10) + 'px'; zone.appendChild(f); setTimeout(() => f.remove(), 900);
    const sp = document.getElementById('sparks');
    if (sp) { sp.insertAdjacentHTML('beforeend', `<g class="spark"><circle cx="${238 + Math.random() * 16}" cy="${124 + Math.random() * 16}" r="${3 + Math.random() * 3}" fill="#ffd46b"/></g>`); while (sp.children.length > 6) sp.firstChild.remove(); }
  }
  updateTrainingBinds();
  return true;
}

/* ---------- modal ---------- */
function openModal(html, kind) { ui.modal = kind || 'x'; $('#modalBody').innerHTML = html; $('#modal').classList.remove('hidden'); }
function closeModal() { ui.modal = null; $('#modal').classList.add('hidden'); $('#modalBody').innerHTML = ''; rerender(true); if (S.pendingReveal) { const r = S.pendingReveal; setTimeout(() => showReveal(r), 250); } }
function settingsModal() {
  openModal(`<h2>⚙️ Settings</h2>
    <div class="switch"><div><b>Test mode</b><div class="dim">Speeds every timer: 1 game hour = ${fmtDur(HOUR / CONFIG.testMode.speed)} real. Training thresholds scale ×${CONFIG.tap.testScale}.</div></div>
      <button class="btn sm ${S.testMode ? 'alt' : 'ghost'}" data-act="toggletest">${S.testMode ? 'ON' : 'OFF'}</button></div>
    <div class="switch"><div><b>Skip ahead</b><div class="dim">Simulate game time instantly (shows a while-you-were-away summary).</div></div>
      <div class="wrapgap"><button class="btn ghost sm" data-act="skip" data-id="1">+1h</button><button class="btn ghost sm" data-act="skip" data-id="8">+8h</button><button class="btn ghost sm" data-act="skip" data-id="24">+1d</button></div></div>
    <div class="switch"><div><b>Game clock</b><div class="dim">Day ${dayIndex() + 1}, ${fmtDur(S.gameTime % DAY)} in. Save is stored in this browser.</div></div></div>
    <div class="switch"><div><b>Reset save</b><div class="dim">Wipes all progress. No undo.</div></div><button class="btn red sm" data-act="reset">Reset</button></div>
    <button class="btn ghost" style="width:100%;margin-top:12px" data-act="close">Close</button>`, 'settings');
}
function awayModal(sum, realMs) {
  const d = sum.delta;
  const rows = Object.keys(d).map((k) => `<span class="cost ${d[k] < 0 ? 'short' : ''}">${CONFIG.resources[k].icon}${d[k] > 0 ? '+' : '−'}${fmt(Math.abs(d[k]))}</span>`).join('');
  const ev = sum.events.slice().reverse().slice(-14);
  openModal(`<h2>🏮 While you were away</h2>
    <div class="dim">${realMs != null ? `Gone ${fmtDur(realMs)} real · ` : ''}${fmtDur(sum.gameMs)} of game time passed${sum.cappedFrom > sum.gameMs ? ` (capped at ${CONFIG.offlineCapHours}h)` : ''}.</div>
    <div class="wrapgap" style="margin:10px 0">${rows || '<span class="dim">No change in stock.</span>'}</div>
    ${sum.levels ? `<p>⭐ ${CONFIG.hero.name} gained ${sum.levels} level${sum.levels > 1 ? 's' : ''}!</p>` : ''}
    <div class="log">${ev.map((e) => `<div>${e.icon} ${e.msg}</div>`).join('') || '<div class="dim">Quiet times on the Rim.</div>'}</div>
    <button class="btn" style="width:100%;margin-top:12px" data-act="close">${S.pendingReveal ? '▶︎ Watch the raid' : 'Back to the Rim'}</button>`, 'away');
}

/* ---------- render loop ---------- */
const VIEWS = { capital: viewCapital, hollow: viewHollow, outposts: viewOutposts, raids: viewRaids, training: viewTraining };
function rerender(force) {
  renderResbar();
  document.querySelectorAll('nav#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === ui.tab));
  if (ui.tab === 'training' && !force && document.getElementById('tapzone')) {
    updateTrainingBinds();
    if (!ui.pressing) for (const [id, fn] of [['heroSlot', heroStatusCard], ['petSlot', petsCard]]) { const el = document.getElementById(id), hh = fn(); if (el && el.dataset.h !== hh) { el.dataset.h = hh; el.innerHTML = hh; } }
    return;
  }
  if (ui.pressing && !force) return;
  const html = VIEWS[ui.tab]();
  if (force || html !== ui.lastHtml) { ui.lastHtml = html; $('#view').innerHTML = html; }
  if (ui.tab === 'training') updateTrainingBinds();
}
function updateLive() {
  document.querySelectorAll('[data-end]').forEach((e) => { const v = realLeft(+e.dataset.end); if (e.textContent !== v) e.textContent = v; });
  document.querySelectorAll('[data-pstart]').forEach((e) => { e.style.width = clamp((S.gameTime - +e.dataset.pstart) / Math.max(1, +e.dataset.pend - +e.dataset.pstart), 0, 1) * 100 + '%'; });
}
function setTab(t) { ui.tab = t; ui.lastHtml = ''; rerender(true); window.scrollTo(0, 0); }

let lastRender = 0, lastSave = 0;
function tick() {
  const now = Date.now(), realDt = now - S.lastReal;
  S.lastReal = now;
  if (realDt <= 0) return;
  if (realDt > CONFIG.awayThresholdRealSec * 1000) {
    const sum = simulateAway(realDt * speed());
    awayModal(sum, realDt); rerender(true); save(); return;
  }
  simulate(realDt * speed());
  updateLive();
  if (now - lastRender > 1000) { lastRender = now; rerender(false); }
  if (now - lastSave > 5000) { lastSave = now; save(); }
}

/* ---------- input ---------- */
function onAct(act, ds) {
  switch (act) {
    case 'build': return startBuild(ds.id);
    case 'exp': return startExpedition(+ds.id);
    case 'rescue': return rescueNow();
    case 'attack': return startAttack(+ds.id);
    case 'ship': return shipNow(+ds.uid);
    case 'shipmode': { const o = S.outposts.find((x) => x.uid === +ds.uid); o.ship = ds.id; return rerender(true); }
    case 'module': return installModule(+ds.uid, ds.id);
    case 'movemenu': return moveMenu(+ds.uid);
    case 'move': return startMove(+ds.uid, ds.id);
    case 'drill': return buildDrill();
    case 'equip': return equipPet(+ds.uid);
    case 'petup': return petUp(+ds.uid);
    case 'replay': return showReveal(S.lastRaid);
    case 'raidnow': S.shieldUntil = 0; S.nextRaidAt = S.gameTime; ui.collecting = null; aiRaid(); return rerender(true);
    case 'settings': return settingsModal();
    case 'close': return closeModal();
    case 'toggletest': S.testMode = !S.testMode; save(); settingsModal(); return rerender(true);
    case 'skip': { const sum = simulateAway(+ds.id * HOUR); closeModalQuiet(); awayModal(sum, null); save(); return rerender(true); }
    case 'reset': if (confirm('Reset all Hollowdeep progress?')) resetSave(); return;
  }
}
function closeModalQuiet() { ui.modal = null; $('#modal').classList.add('hidden'); }

function init() {
  const loaded = load();
  S = loaded || newState();
  ensureRivals();
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]'); if (t) return setTab(t.dataset.tab);
    const b = e.target.closest('[data-act]'); if (b && !b.disabled) onAct(b.dataset.act, b.dataset);
  });
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal' && ui.modal !== 'reveal') closeModal(); });
  document.addEventListener('pointerdown', (e) => {
    ui.pressing = true;
    const z = e.target.closest('#tapzone'); if (z) { e.preventDefault(); doTap(e.clientX, e.clientY); }
  });
  const release = () => setTimeout(() => (ui.pressing = false), 60);
  document.addEventListener('pointerup', release); document.addEventListener('pointercancel', release);
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && ui.tab === 'training' && !ui.modal) { e.preventDefault(); const z = $('#tapzone'); if (z) { const r = z.getBoundingClientRect(); doTap(r.left + r.width * 0.68, r.top + r.height * 0.55); } }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); else tick(); });
  window.addEventListener('pagehide', save);
  rerender(true);
  if (loaded) {
    const realDt = Date.now() - loaded.lastReal;
    S.lastReal = Date.now();
    if (realDt > CONFIG.awayThresholdRealSec * 1000) { const sum = simulateAway(realDt * speed()); awayModal(sum, realDt); rerender(true); }
    else simulate(Math.max(0, realDt) * speed());
  } else {
    openModal(`<h2>Welcome to the Rim</h2>
      <p>You hold a small capital on the edge of <b>the Hollow</b>, a chasm that goes down forever. Lumen, a living light, grows deep below.</p>
      <ul class="small">
        <li>🏰 <b>Capital</b>: upgrade buildings. Your wall is not just a wall.</li>
        <li>🕳️ <b>Hollow</b>: send ${CONFIG.hero.name} on timed expeditions. Deeper = richer, riskier.</li>
        <li>🐢 <b>Outposts</b>: your Strider mines a vein and lifts goods up the Tether. Hauling costs Lumen (the Pull).</li>
        <li>⚔️ <b>Raids</b>: auto-resolved raids on rival bases; raiders will test your wall.</li>
        <li>🗡️ <b>Training</b>: tap the dummy for a rolling XP boost. Optional.</li>
      </ul>
      <p class="dim">TEST MODE is on: 1 game hour = 1 real minute. Close the tab and come back to see what happened while you were away.</p>
      <button class="btn" style="width:100%" data-act="close">Begin</button>`, 'welcome');
  }
  save();
  setInterval(tick, 250);
}
window.HD = { get S() { return S; }, CONFIG, simulate, simulateAway, startExpedition, startBuild, doTap, save, load, boostPct, weekTaps, aiRaid, shipAll, startMove, installModule, setTab, attackPower, defensePower };
document.addEventListener('DOMContentLoaded', init);

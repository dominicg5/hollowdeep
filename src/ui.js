
/* =====================================================================
   UI
   ===================================================================== */
/* painted UI art (assets/ui) */
const UIA = 'assets/ui/', UI_HAS = new Set('obsidian amber coal crowns iron lumen moss steel stone timber hall storehouse training lift wall kennel vault forge still still2 smelter strider drill golem golem_sleep dummy rival0 rival1 rival2 wisp pup moth ferret wren wren_a wren_b wren_c capital molebg layers'.split(' '));
function pic(k, cls, alt) { return `<img class="pic ${cls || ''}" src="${UIA}${k}.webp" alt="${alt || ''}" decoding="async" draggable="false">`; }
function rIco(k) { return UI_HAS.has(k) ? pic(k, 'ri', CONFIG.resources[k].name) : CONFIG.resources[k].icon; }
function petIco(id, cls) { return UI_HAS.has(id) ? pic(id, cls || 'pi', CONFIG.pets[id].name) : CONFIG.pets[id].icon; }
function lootHtml(l) { return Object.keys(l).filter((k) => l[k] > 0).map((k) => `<span class="lt">${rIco(k)}${fmt(l[k])}</span>`).join(' '); }
function toast(msg) {
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
  const box = $('#toasts'); box.appendChild(el); while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => el.remove(), 3200);
}
function costHtml(cost) { return Object.keys(cost).map((k) => `<span class="cost ${(S.res[k] || 0) < cost[k] ? 'short' : ''}">${rIco(k)}${fmt(cost[k])}</span>`).join(''); }
function pbar(start, end, cls) { const p = clamp((S.gameTime - start) / Math.max(1, end - start), 0, 1) * 100; return `<div class="bar ${cls || ''}"><i data-pstart="${start}" data-pend="${end}" style="width:${p}%"></i></div>`; }
function countdown(end) { return `<span data-end="${end}">${realLeft(end)}</span>`; }

// top bar: just the speed pill (the resource counters are gone - the Vault is where stock is seen)
function renderResbar() {
  const p = $('#speedPill'); p.className = 'pill' + (S.testMode ? ' test' : ''); p.textContent = S.testMode ? `⏩ TEST ×${speed()}` : 'Real time';
}

/* ---------- Capital ---------- */
function capitalScene() {
  const g = golemCount(), b = S.buildings, eyes = [], wins = [];
  // statue eyes on the Guardian Wall light up per golem (4 painted statues)
  [[48.3, 42.6], [54.2, 44.6], [60.0, 43.2], [65.4, 41.6]].forEach(([x, y], i) => { if (i < g) eyes.push(`<i class="eye" style="left:${x}%;top:${y}%;animation-delay:${i * 0.4}s"></i>`); });
  // lit windows on the Lantern Hall: more as it levels up
  const W0 = [[35, 10], [38, 10], [24.5, 32], [29.8, 31.5], [33.8, 41.6], [41, 41.6], [24.9, 37.8], [30.4, 37], [39.8, 26.6], [42.5, 25.5]];
  W0.slice(0, Math.min(W0.length, b.hall + 1)).forEach(([x, y], i) => wins.push(`<i class="win" style="left:${x}%;top:${y}%;animation-delay:${(i * 0.37) % 2}s"></i>`));
  const reach = liftReach();
  return `<div class="scene paint capscene"><img class="bg" src="${UIA}capital.webp" alt="Your capital on the Rim" decoding="async">
    ${wins.join('')}${eyes.join('')}${b.forge > 0 ? '<i class="smoke s1"></i><i class="smoke s2"></i>' : ''}
    <i class="cage" style="--d:${10 + reach * 6}%"></i>
    <div class="chips"><span>🏮 Hall ${b.hall}</span><span>🗿 ${g} golem${g === 1 ? '' : 's'}</span><span>🧵 Lift ${b.lift} · layer ${reach}</span>${S.outposts.length ? `<span>⚓ ${S.outposts.length} outpost${S.outposts.length > 1 ? 's' : ''}</span>` : ''}</div>
    <div class="cap">The Rim · the Hollow opens below ↓</div></div>`;
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
    case 'vault': return lvl ? `storage +${Math.round(CONFIG.vault.capPerLevel * lvl * 100)}% · protection +${Math.round(CONFIG.vault.protectPerLevel * lvl * 100)}%` : 'not built';
    case 'forge': return lvl ? `${fmt1(CONFIG.forgePerLevel * lvl)} 🔩/h from raw ore` : 'not built';
  }
  return '';
}
function viewCapital() {
  let h = capitalScene();
  const def = Math.round(defensePower());
  h += `<div class="card"><div class="row between"><h2>Rim Capital</h2><span class="tag">🛡️ Defense ${def}</span></div>
    <div class="small">Storage cap <b>${fmt(storageCap())}</b> each · ${Math.round(protectedShare() * 100)}% safe from raids.
    ${!CONFIG.raidsEnabled ? `<br>🕊️ Raids are off for now. Your stock is safe.` : S.gameTime < S.shieldUntil ? `<br>🛡️ Shield up: ${countdown(S.shieldUntil)}` : `<br>⚠️ No shield. Raiders may come.`}</div>
    ${S.build ? `<div class="small" style="margin-top:6px">🔨 Building <b>${CONFIG.buildings[S.build.id].name} Lv ${S.build.to}</b> · ${countdown(S.build.end)}</div>${pbar(S.build.start, S.build.end)}` : `<div class="dim" style="margin-top:6px">Builders idle. Pick an upgrade.</div>`}
  </div>`;
  for (const id in CONFIG.buildings) {
    const b = CONFIG.buildings[id], lvl = S.buildings[id], block = buildBlock(id), cost = buildCost(id);
    const building = S.build && S.build.id === id;
    h += `<div class="card bld"><div class="ic">${UI_HAS.has(id) ? pic(id, 'bi', b.name) : b.icon}</div><div>
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
    return `<rect x="0" y="${y}" width="360" height="70" fill="${L.color}" opacity="${reach ? 0.12 : 0.3}"/>${reach ? '' : `<rect x="0" y="${y}" width="360" height="70" fill="#0b0d18" opacity=".35"/>`}
      <line x1="0" y1="${y}" x2="360" y2="${y}" stroke="#fff3d0" stroke-opacity=".25" stroke-dasharray="3 5"/>
      <text x="10" y="${y + 18}" font-size="12.5" fill="#fff3d0" stroke="#1a1208" stroke-width="3" paint-order="stroke" stroke-opacity=".75" font-family="Georgia" font-weight="700">${L.id}. ${L.name}${reach ? '' : ' 🔒'}</text>`;
  }).join('');
  const spineY = 20 + liftReach() * 70 - 10;
  const ops = S.outposts.map((o, i) => {
    const y = 20 + (o.layer - 1) * 70 + 42, x = 230 + i * 50;
    return `<line x1="180" y1="${y}" x2="${x}" y2="${y}" stroke="#ffd46b" stroke-width="1.5" stroke-dasharray="${o.state === 'anchored' ? '0' : '4 4'}"/>
      <circle cx="${x}" cy="${y}" r="13" fill="${o.dark ? '#444' : '#ffd46b'}" opacity=".35" class="${o.state === 'anchored' ? 'pulse lumenglow' : ''}"/>
      <image href="${UIA}${o.type === 'drill' ? 'drill' : 'strider'}.webp" x="${x - 13}" y="${y - 26}" width="26" height="${o.type === 'drill' ? 44 : 31}" ${o.dark ? 'opacity=".55"' : ''}/>`;
  }).join('');
  let hero = '';
  const t = S.hero.task;
  if (t && (t.type === 'expedition' || t.type === 'stranded')) {
    const L = layerById(t.layer), p = t.type === 'expedition' ? clamp((S.gameTime - t.start) / (t.end - t.start), 0, 1) : 1;
    const depth = 20 + (t.layer - 1) * 70 + 40, y = 14 + (p < 0.5 ? p * 2 : (1 - p) * 2) * (depth - 14);
    hero = `<g transform="translate(120 ${t.type === 'stranded' ? depth : y})"><circle r="16" fill="#ffd46b" opacity=".3" class="pulse"/><image href="${UIA}wren.webp" x="-9" y="-21" width="18" height="42"/>${t.type === 'stranded' ? '<text x="12" y="-8" font-size="12">🕯️</text>' : ''}</g>
            <line x1="120" y1="0" x2="120" y2="${t.type === 'stranded' ? depth : y}" stroke="#d8c3a0" stroke-width="1" stroke-dasharray="2 3"/>`;
  }
  return `<div class="scene"><svg viewBox="0 0 360 ${20 + CONFIG.layers.length * 70}" aria-label="The Lantern Ladder">
    <image href="${UIA}layers.webp" x="0" y="0" width="360" height="${20 + CONFIG.layers.length * 70}" preserveAspectRatio="none"/>
    <text x="180" y="14" font-size="10.5" text-anchor="middle" fill="#fff3d0" stroke="#1a1208" stroke-width="3" paint-order="stroke" font-family="Georgia">🏰 Rim capital</text>
    ${bands}<line x1="180" y1="16" x2="180" y2="${spineY}" stroke="#ffd46b" stroke-width="3" class="lumenglow"/>${ops}${hero}</svg></div>`;
}
function heroStatusCard() {
  const t = S.hero.task;
  let s = `<div class="card herocard">${pic('wren', 'portrait', CONFIG.hero.name)}<div class="row between"><h2>${CONFIG.hero.name}, Lv ${S.hero.level}</h2><span class="tag">⚔️ ${Math.round(attackPower())}</span></div>`;
  s += `<div class="bar xp"><i style="width:${(S.hero.xp / xpToNext()) * 100}%"></i></div><div class="dim">${fmt(S.hero.xp)} / ${fmt(xpToNext())} XP · training boost <b>+${fmt1(boostPct())}%</b> XP</div>`;
  if (typeof Skills !== 'undefined') s += `<div class="dim skLine">${Skills.uiLine()}</div>`;
  if (!t) s += `<div class="small" style="margin-top:6px">Home at the Rim, sparring for idle XP. Ready to descend.</div>`;
  else if (t.type === 'expedition') s += `<div class="small" style="margin-top:6px">Exploring <b>${layerById(t.layer).name}</b> · back in ${countdown(t.end)}</div>${pbar(t.start, t.end)}`;
  else if (t.type === 'stranded') s += `<div class="small" style="margin-top:6px">🕯️ Stranded in <b>${layerById(t.layer).name}</b>. Rescue line arrives in ${countdown(t.end)}</div>${pbar(t.start, t.end)}
      <button class="btn alt sm" data-act="rescue">Send rescue line now (${rescueCost()} 🏮)</button>`;
  else if (t.type === 'mole') s += `<div class="scene paint molescene">${pic('molebg', 'bg')}${pic('wren_c', 'fighter')}</div><div class="small" style="margin-top:6px">🦴 Fighting a Rim Mole in <b>${regionName(t.region)}</b> · ${countdown(t.end)}</div>${pbar(t.start, t.end)}`;
  else if (t.type === 'raid') s += `<div class="small" style="margin-top:6px">⚔️ Marching on <b>${t.map ? esc(t.map.owner + "'s " + t.map.name) : CONFIG.rivals[t.rival].name}</b> · ${countdown(t.end)}</div>${pbar(t.start, t.end)}`;
  return s + '</div>';
}
function viewHollow() {
  let h = ladderSvg() + heroStatusCard();
  for (const L of CONFIG.layers) {
    const ok = L.id <= expeditionReach(), ch = Math.round(successChance(L) * 100);
    const lootRange = Object.keys(L.loot).map((k) => `<span class="cost">${rIco(k)}${L.loot[k][0]}–${L.loot[k][1]}</span>`).join('');
    h += `<div class="card layer ${ok ? '' : 'locked'}" style="--c:${L.color}">
      <div class="row between"><h3>${L.id}. ${L.name}</h3><span class="tag ${ch >= 75 ? 'good' : ch < 50 ? 'bad' : ''}">${ch}% safe return</span></div>
      <div class="dim">${L.flavor}</div>
      <div class="wrapgap small" style="margin:6px 0">⏱ ${gameDur(L.hours * HOUR)} · 🏮 ${L.lumen} · rec. power ${L.rec}</div>
      <div class="wrapgap">${lootRange}<span class="tag">🥚 ${petIco(L.pet)} ${Math.round(L.egg * 100)}%</span></div>
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
    ${S.lastShip ? `<div class="dim" style="margin-top:6px">Last lift: ${lootHtml(S.lastShip.got) || 'nothing'} · Pull paid ${fmt1(S.lastShip.cost)} 🏮</div>` : ''}
  </div>`;
  for (const o of S.outposts) {
    const T = opType(o), v = veinById(o.vein), L = layerById(o.layer), r = outpostRates(o), tot = stockTotal(o);
    const pAll = shipPreview(o, 'all'), pRef = shipPreview(o, 'refined');
    h += `<div class="card layer" style="--c:${L.color}">
      ${pic(o.type === 'drill' ? 'drill' : 'strider', 'opart', T.name)}<div class="row between"><h3>${esc(o.name)} <span class="dim">${T.name}</span></h3><span class="tag ${o.state === 'anchored' ? 'good' : 'lumen'}">${STATE_LABEL[o.state]}</span></div>
      <div class="small">${L.id}. ${L.name} · <b>${o.state === 'anchored' || o.state === 'settling' ? v.name : '→ ' + veinById(o.move.toVein).name}</b>
        ${o.dark ? '<span class="tag bad">🌑 dark (no Lumen)</span>' : ''} ${seasoned(o) ? '<span class="tag good">Seasoned +10%</span>' : ''} ${o.full ? '<span class="tag bad">Stockhold full</span>' : ''}</div>`;
    if (o.move) h += `<div class="small" style="margin-top:4px">${STATE_LABEL[o.state]} · ${countdown(o.move.phaseEnd)}</div>${pbar(o.move.phaseStart, o.move.phaseEnd)}`;
    if (o.state === 'anchored') {
      h += `<div class="small" style="margin-top:6px">Vein richness ${Math.round(S.veins[o.vein] * 100)}%</div><div class="bar rich"><i style="width:${S.veins[o.vein] * 100}%"></i></div>
        <div class="wrapgap small">Makes: ${Object.keys(r).map((k) => `<span class="cost">${rIco(k)}${fmt1(r[k])}/h</span>`).join('')} <span class="dim">· burns ${burnRate(o)} 🏮/h</span></div>`;
    }
    h += `<div class="small" style="margin-top:6px">Stockhold ${fmt(tot)} / ${T.stockCap}</div><div class="bar"><i style="width:${(tot / T.stockCap) * 100}%"></i></div>
      <div class="wrapgap">${Object.keys(o.stock).filter((k) => o.stock[k] >= 1).map((k) => `<span class="cost">${rIco(k)}${fmt(o.stock[k])}</span>`).join('') || '<span class="dim">empty</span>'}</div>
      <div class="dim" style="margin-top:4px">Lift everything now: ${fmt1(pAll.cost)} 🏮 · refined only: ${fmt1(pRef.cost)} 🏮</div>
      <div style="margin-top:8px" class="small"><b>Module:</b> ${o.module ? `${UI_HAS.has(o.module) ? pic(o.module, 'mi') : CONFIG.modules[o.module].icon} ${CONFIG.modules[o.module].name} <span class="dim">(${CONFIG.modules[o.module].desc})</span>` : '<span class="dim">none</span>'}</div>
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
    h += `<div class="card">${pic('drill', 'opart')}<h3>Build a Tetherdrill</h3><div class="dim">${D.desc} A second outpost lets you split a chain: one drill on iron, one on coal, and a Smelter pulls from both.</div>
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
      h += `<div class="row between" style="margin-top:6px;gap:6px"><div class="small"><b>${v.name}</b> · ${Object.keys(v.prod).map((k) => rIco(k) + fmt1(v.prod[k] * opType(o).mult) + '/h').join(' ')} · rich ${Math.round(S.veins[v.id] * 100)}%<br>
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
  if (!CONFIG.raidsEnabled) return `<div class="card"><h2>⚔️ Raids</h2><div class="dim">Raids are coming later. For now the Rim is peaceful: nobody raids your capital or outposts, and you can't raid anyone.</div></div>`;
  ensureRivals();
  const gp = golemPower(), g = golemCount();
  let h = `<div class="card"><h2>🗿 Your defense</h2><div class="golemrow">${Array.from({ length: Math.min(g, 8) }, (_, i) => pic('golem_sleep', 'gs', 'sleeping golem')).join('')}</div>
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
    h += `<div class="card rival">${pic('rival' + i, 'rv', d.name)}<div class="row between"><h3>${d.name}</h3><span class="tag ${ratio >= 1 ? 'good' : ratio < 0.75 ? 'bad' : ''}">🛡️ ${r.power}</span></div>
      <div class="dim">${d.lord}</div>
      <div class="wrapgap small" style="margin:6px 0">Likely: <b>${'★'.repeat(est)}${'☆'.repeat(3 - est)}</b> · full loot ${lootHtml(rivalLoot(i))}</div>
      ${shield ? `<span class="tag">🛡️ shielded ${countdown(r.shieldUntil)}</span>` : `<button class="btn red sm" data-act="attack" data-id="${i}" ${!heroHome() || S.res.lumen < CONFIG.raids.attackLumen ? 'disabled' : ''}>Raid</button>`}
    </div>`;
  });
  h += `<div class="card"><h2>📜 Chronicle</h2><div class="log">${S.log.slice(0, 40).map((e) => `<div><span class="t">${fmtDur(S.gameTime - e.t)} ago</span>${e.icon} ${e.msg}</div>`).join('') || '<div class="dim">Nothing yet.</div>'}</div></div>`;
  return h;
}
function raidSceneSvg(g) {
  let golems = ''; const n = Math.min(g, 6), segW = 300 / (n + 1);
  for (let i = 0; i < n; i++) { const x = 30 + (i + 1) * segW - 30;
    golems += `<g class="golem2" style="--i:${i}"><image class="gs" href="${UIA}golem_sleep.webp" x="${x}" y="88" width="60" height="53"/><image class="ga" href="${UIA}golem.webp" x="${x - 2}" y="76" width="64" height="66"/></g>`; }
  let raiders = ''; for (let i = 0; i < 5; i++) raiders += `<text x="${-40 + (i % 3) * 14}" y="${120 + (i % 2) * 14}" font-size="16">🏴</text>`;
  return `<svg viewBox="0 0 360 160"><image href="${UIA}capital.webp" x="0" y="-40" width="360" height="203" preserveAspectRatio="xMidYMid slice" opacity=".85"/><rect width="360" height="160" fill="#2a1e30" opacity=".35"/>
    <rect y="138" width="360" height="22" fill="#4a3a28" opacity=".7"/><g id="raiders" class="raiderwrap"><g class="raider">${raiders}</g></g>${golems}</svg>`;
}
function showReveal(r) {
  S.pendingReveal = null;
  const win = r.stars === 0;
  const lines = [
    `🏴 <b>${esc(r.who)}</b> march on your wall… attack power ${r.atk}.`,
    `It looks like an ordinary wall. Then the columns <b>stand up</b>. ${r.golems} rock golems wake, eyes full of Lumen.`,
    win ? `<span class="stars">☆☆☆</span><br><b>Raid repelled!</b> The golems hurl them back over the Rim. Spoils: ${lootHtml(r.gained)}`
        : `<span class="stars">${'★'.repeat(r.stars)}${'☆'.repeat(3 - r.stars)}</span><br>They broke through and took ${lootHtml(r.lost) || 'very little'}. ${Math.round(protectedShare() * 100)}% of your stock was safe in the Storehouse.`,
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
    <p>${r.stars ? `Loot: ${lootHtml(r.got)}` : 'Their wall held. Nothing taken.'} · +${fmt(r.xp)} XP</p>
    <button class="btn" style="width:100%" data-act="close">Onward</button>`, 'report');
}

/* ---------- Training ---------- */
function viewTraining() {
  return `<div class="card"><div class="row between"><h2>🗡️ Training Grounds</h2><span class="tag lumen" data-bind="boost"></span></div>
    <div class="dim">Every tap banks into a rolling 7-day boost to hero XP. Optional: idle play still gets you there, just slower.</div></div>
    <div id="tapzone" role="button" aria-label="Tap the training dummy">
      <svg viewBox="0 0 360 220">
        <image href="${UIA}training.webp" x="-30" y="0" width="420" height="236" preserveAspectRatio="xMidYMid slice"/>
        <ellipse cx="150" cy="206" rx="40" ry="7" fill="#000" opacity=".25"/><ellipse cx="248" cy="204" rx="30" ry="6" fill="#000" opacity=".25"/>
        <g id="dummyG"><image href="${UIA}dummy.webp" x="206" y="92" width="84" height="111"/></g>
        <g id="heroG"><image id="heroImg" href="${UIA}wren_a.webp" x="${150 - 39}" y="88" width="77" height="120"/></g>
        <g id="swordArm"></g>
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
    h += `<div class="row between" style="margin-top:8px;gap:6px"><div class="row" style="gap:8px">${petIco(p.id, 'petart')}<div><b>${d.name}</b> <span class="lvl">Lv ${p.level}</span><br><span class="dim">power ${Math.round(petPower(p))} · ${d.bonus}</span></div></div>
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
  const hi = document.getElementById('heroImg');
  if (hi) { const pose = (k, w) => { hi.setAttribute('href', UIA + k + '.webp'); hi.setAttribute('width', w); hi.setAttribute('x', 150 - w / 2 + (k === 'wren_c' ? 14 : 0)); };
    clearTimeout(hi._t1); clearTimeout(hi._t2); pose('wren_b', 91); hi._t1 = setTimeout(() => pose('wren_c', 108), 90); hi._t2 = setTimeout(() => pose('wren_a', 77), 300); }
  if (dm) { dm.classList.remove('hit'); dm.getBoundingClientRect(); dm.classList.add('hit'); }
  const zone = document.getElementById('tapzone');
  if (zone && x != null) {
    const r = zone.getBoundingClientRect(), f = document.createElement('div');
    f.className = 'float' + (mark ? ' mark' : ''); f.textContent = mark ? '+1 Spar Mark' : '+1';
    f.style.left = (x - r.left) + 'px'; f.style.top = (y - r.top - 10) + 'px'; zone.appendChild(f); setTimeout(() => f.remove(), 900);
    const sp = document.getElementById('sparks');
    if (sp) { sp.insertAdjacentHTML('beforeend', `<g class="spark"><circle cx="${236 + Math.random() * 20}" cy="${128 + Math.random() * 22}" r="${3 + Math.random() * 3}" fill="#ffd46b"/></g>`); while (sp.children.length > 6) sp.firstChild.remove(); }
  }
  updateTrainingBinds();
  return true;
}

/* ---------- modal ---------- */
function openModal(html, kind) { ui.modalAt = performance.now(); ui.modal = kind || 'x'; $('#modal').dataset.k = ui.modal; /* skins the field-kit panels (vault, backpack, transfer) */ $('#modalBody').innerHTML = html; $('#modal').classList.remove('hidden'); }
function closeModal() { ui.modal = null; $('#modal').classList.add('hidden'); $('#modalBody').innerHTML = ''; rerender(true); if (S.pendingReveal && CONFIG.raidsEnabled) { const r = S.pendingReveal; setTimeout(() => showReveal(r), 250); } }
function settingsModal() {
  openModal(`<h2>⚙️ Settings</h2>
    <div class="switch"><div><b>Test mode</b><div class="dim">Speeds every timer: 1 game hour = ${fmtDur(HOUR / CONFIG.testMode.speed)} real. Training thresholds scale ×${CONFIG.tap.testScale}.</div></div>
      <button class="btn sm ${S.testMode ? 'alt' : 'ghost'}" data-act="toggletest">${S.testMode ? 'ON' : 'OFF'}</button></div>
    <div class="switch"><div><b>Skip ahead</b><div class="dim">Simulate game time instantly (idle stock goes to the Vault).</div></div>
      <div class="wrapgap"><button class="btn ghost sm" data-act="skip" data-id="1">+1h</button><button class="btn ghost sm" data-act="skip" data-id="8">+8h</button><button class="btn ghost sm" data-act="skip" data-id="24">+1d</button></div></div>
    <div class="switch"><div><b>Game clock</b><div class="dim">Day ${dayIndex() + 1}, ${fmtDur(S.gameTime % DAY)} in. Save is stored in this browser.</div></div></div>
    <div class="switch"><div><b>Seasons & journal</b><div class="dim">Debug the season/festival cycle on the Ledgeville map, or read Wren's journal.</div></div><div class="wrapgap"><button class="btn ghost sm" data-act="journal">📔 Journal</button></div></div>
    <div class="switch"><div><b>Graphics quality</b><div class="dim">${QUALITY.override ? 'Set by hand' : 'Auto (this device: ' + QUALITY.auto + ')'}. Mobile caps resolution, shadows and frame rate to keep phones cool.</div></div><div class="wrapgap">${['auto', 'high', 'mobile'].map((k) => `<button class="btn sm ${(k === 'auto' ? !QUALITY.override : QUALITY.override === k) ? 'alt' : 'ghost'}" data-act="quality" data-id="${k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div></div>
    <div class="switch"><div><b>Reset save</b><div class="dim">Wipes all progress. No undo.</div></div><button class="btn red sm" data-act="reset">Reset</button></div>
    <button class="btn ghost" style="width:100%;margin-top:12px" data-act="close">Close</button>`, 'settings');
}
// coming back after time away: the idle accrual has already run (simulateAway); stock lands in the Vault and Wren still writes her journal entry - no popup
function awayReturn(sum) { writeJournal(sum); ui.lastAway = sum; }

/* ---------- render loop ---------- */
const VIEWS = { city: () => '', char: () => '', ledge: () => '', home: () => '', tree: () => '', bag: () => (typeof Craft !== 'undefined' ? Craft.bagHTML(false) : ''), capital: viewCapital, hollow: viewHollow, outposts: viewOutposts, raids: viewRaids, training: viewTraining };
function rerender(force) {
  renderResbar();
  document.querySelectorAll('nav#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === ui.tab));
  // Capital / Hollow / Outposts / Raids / Training are dormant (no tab buttons; their views and systems stay so saves keep working and setTab() can still reach them)
  if (ui.tab === 'char' || ui.tab === 'ledge' || ui.tab === 'home' || ui.tab === 'tree') { $('#view').style.display = 'none'; CityMap.hide(); CharView.show(ui.tab === 'char' ? null : ui.tab); return; }
  CharView.hide();
  if (ui.tab === 'city') { $('#view').style.display = 'none'; CityMap.show(); return; }
  $('#view').style.display = ''; CityMap.hide();
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
// area transitions: a styled loading screen over every scene change (map <-> Ledge, the Lumen Tree, the Hanging Camp), so a scene build never looks like a freeze.
// It cuts in at once, holds at least 300 ms and until the new scene has drawn two frames (capped), then fades out.
const AreaLoader = (() => { const SC = { city: 'Ledgeville', home: 'your Ledge', ledge: 'the Hanging Camp', tree: 'the Lumen Tree' }, L = { on: false, shows: 0, hides: 0, t0: 0, el: null, tm: null, last: null };
  function el() { if (L.el) return L.el; const d = document.createElement('div'); d.id = 'areaLoader'; d.setAttribute('aria-live', 'polite'); d.innerHTML = '<div class="al-card"><div class="al-spin"><i></i></div><div class="al-txt"></div><div class="al-bar"><i></i></div></div>'; document.body.appendChild(d); return (L.el = d); }
  function show(t, label) { const d = el(), bar = d.querySelector('.al-bar i'); d.querySelector('.al-txt').textContent = label || ('Heading to ' + (SC[t] || 'the next area') + '\u2026'); bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = '';
    d.classList.remove('out'); d.classList.add('on'); if (!L.on) { L.shows++; L.t0 = performance.now(); } L.on = true; L.last = t; clearTimeout(L.tm); let fr = 0; const t1 = performance.now();
    const ready = () => { const now = performance.now(); if (now - L.t0 >= 300 && (fr >= 2 || now - t1 > 2500)) return hide(); L.tm = setTimeout(ready, 40); }; const raf = () => { if (++fr < 2 && L.on) requestAnimationFrame(raf); }; requestAnimationFrame(raf); L.tm = setTimeout(ready, 40); }
  function hide() { if (!L.on) return; L.on = false; L.hides++; clearTimeout(L.tm); const d = el(); d.classList.add('out'); setTimeout(() => { if (!L.on) d.classList.remove('on', 'out'); }, 300); }
  return { show, hide, st: L, SC }; })();
function setTab(t) { if (t !== ui.tab && AreaLoader.SC[t] && AreaLoader.SC[ui.tab]) AreaLoader.show(t); ui.tab = t; ui.lastHtml = ''; rerender(true); window.scrollTo(0, 0); }

let lastRender = 0, lastSave = 0;
function tick() {
  const now = Date.now(), realDt = now - S.lastReal;
  S.lastReal = now;
  if (realDt <= 0) return;
  if (realDt > CONFIG.awayThresholdRealSec * 1000) {
    const sum = simulateAway(realDt * speed());
    awayReturn(sum); rerender(true); save(); return;
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
    case 'quality': return QUALITY.set(ds.id);
    case 'toggletest': S.testMode = !S.testMode; save(); settingsModal(); return rerender(true);
    case 'skip': { const sum = simulateAway(+ds.id * HOUR); closeModalQuiet(); awayReturn(sum); save(); return rerender(true); }
    case 'reset': if (confirm('Reset all Hollowdeep progress?')) resetSave(); return;
    case 'journal': closeModalQuiet(); setTab('city'); setTimeout(() => { const b = document.querySelector('[data-city=journal]'); if (b) b.click(); }, 60); return;
    default: return CityMap.onAct(act, ds);
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
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal' && ui.modal !== 'reveal' && performance.now() - (ui.modalAt || 0) > 400) closeModal(); });
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
    if (realDt > CONFIG.awayThresholdRealSec * 1000) { const sum = simulateAway(realDt * speed()); awayReturn(sum); rerender(true); }
    else simulate(Math.max(0, realDt) * speed());
  } else {
    openModal(`<h2>Welcome to the Rim</h2>
      <p>You hold a small capital on the edge of <b>the Hollow</b>, a chasm that goes down forever. Lumen, a living light, grows deep below.</p>
      <ul class="small">
        <li>🗺️ <b>Ledgeville</b>: the huge city around the Hollow. Drag, pinch and tap anything. Every house is a player's ${CITY.homeTerm}.</li>
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
document.addEventListener('DOMContentLoaded', () => (window.HD_GATE || Promise.resolve(true)).then((go) => { if (go !== false) init(); })); // boot only once the version check says this build is current (t421u)

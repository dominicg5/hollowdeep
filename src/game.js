'use strict';
/* =====================================================================
   HOLLOWDEEP — playable prototype
   All tunable numbers live in CONFIG. Times are in GAME hours/minutes;
   TEST MODE multiplies the clock (default 1 game hour = 1 real minute).
   ===================================================================== */
const CONFIG = {
  saveKey: 'hollowdeep.save.v1',
  testMode: { defaultOn: true, speed: 60 },      // ×60: 1 game hour = 1 real minute
  offlineCapHours: 72,                            // max game hours simulated while away
  simStepMinutes: 5,                              // simulation granularity (game minutes)
  awayThresholdRealSec: 45,                       // gap that triggers "While you were away"

  start: { crowns: 250, stone: 150, timber: 150, lumen: 80, moss: 0, iron: 0, coal: 10, steel: 0, amber: 2, obsidian: 0 },

  resources: {   // weight = how heavy it is to haul up the Tether (The Pull)
    crowns: { icon: '👑', name: 'Crowns',     weight: 0.05 },
    stone:  { icon: '🪨', name: 'Stone',      weight: 0.6 },
    timber: { icon: '🪵', name: 'Timber',     weight: 0.5 },
    lumen:  { icon: '🏮', name: 'Lumen',      weight: 0.1 },
    moss:   { icon: '🌿', name: 'Lanternmoss',weight: 0.5 },
    iron:   { icon: '⛓️', name: 'Iron ore',   weight: 1.0 },
    coal:   { icon: '⚫', name: 'Breathcoal', weight: 1.0 },
    steel:  { icon: '🔩', name: 'Steel',      weight: 0.3 },
    amber:  { icon: '🟠', name: 'Amber',      weight: 0.1 },
    obsidian: { icon: '🖤', name: 'Obsidian', weight: 0.4 },   // black glass from the lava fields of the far lands
  },
  refined: ['crowns', 'lumen', 'steel', 'amber', 'obsidian'],   // what "ship refined only" sends

  storage: { base: 600, growth: 1.5, protectBase: 0.30, protectPerLevel: 0.04 },

  hero: { name: 'Wren', basePower: 12, powerPerLevel: 6, xpBase: 60, xpGrowth: 1.35 },

  // Training Grounds tap curve (v2): boost = 100% × (taps in rolling 7 days ÷ weeklyTarget)^exponent
  tap: { weeklyTarget: 300000, dailyCap: 60000, exponent: 0.75, testScale: 0.01, maxTapsPerSec: 12, rollingDays: 7 },

  // Buildings. cost for target level T = base × growth^(T-2) (T=1 for things that start at 0)
  buildings: {
    hall:      { name: 'Lantern Hall',    icon: '🏮', max: 10, base: { crowns: 120, stone: 80 }, growth: 1.6, minutes: 20,
                 desc: 'Heart of the capital. Makes Crowns, Stone and a little Lumen; presses Lanternmoss into Lumen (3:1). Other buildings can be at most Hall level +1.' },
    storehouse:{ name: 'Storehouse',      icon: '📦', max: 10, base: { crowns: 100, stone: 120 }, growth: 1.55, minutes: 15,
                 desc: 'Raises storage caps and protects part of your stock from raiders.' },
    training:  { name: 'Training Grounds',icon: '🗡️', max: 10, base: { crowns: 90, timber: 50 }, growth: 1.55, minutes: 15,
                 desc: 'Hero power +3 per level, and the hero spars for idle XP while home.' },
    lift:      { name: 'Tether Lift',     icon: '🧵', max: 6, base: { crowns: 150, stone: 100, timber: 80 }, growth: 1.7, minutes: 30, steelFrom: 3, steelPer: 12,
                 desc: 'Your Spine. Sets how deep outposts can anchor, how much cargo lifts per hour, and cuts the Pull.' },
    wall:      { name: 'Guardian Wall',   icon: '🗿', max: 10, base: { crowns: 110, stone: 140 }, growth: 1.55, minutes: 20, steelFrom: 4, steelPer: 8, obsidianFrom: 6, obsidianPer: 4,
                 desc: 'Looks like a wall. It is not. Rock golems sleep in its columns and stand up when raiders come.' },
    kennel:    { name: 'Kennel',          icon: '🐾', max: 5, base: { crowns: 100, timber: 60 }, growth: 1.7, minutes: 20, amberFrom: 2, amberPer: 3,
                 desc: 'Pet slots (2nd slot at Lv 3) and +10% pet power per level.' },
    vault:     { name: 'Rim Vault',       icon: '🏦', max: 8, start: 0, base: { crowns: 260, stone: 220 }, growth: 1.6, minutes: 30,
                 desc: 'Deep stone vaults under your Ledge. +30% storage cap and +3% raid protection per level. (Public Vaults dot Rim City.)' },
    forge:     { name: 'Rim Forge',       icon: '⚒️', max: 8, start: 0, base: { crowns: 200, stone: 150, timber: 60 }, growth: 1.6, minutes: 25,
                 desc: 'Smelts 2 Iron + 1 Breathcoal → 1 Steel at the Rim. Works, but hauling raw ore up costs a lot of Lumen.' },
  },
  buildTimeGrowth: 1.45,
  hallPerLevel: { crowns: 14, stone: 8, lumen: 2.5, mossPress: 6 },   // per game hour
  trainingPerLevel: { power: 3, sparXp: 4 },
  lift: { maxReach: 4, capacityPerLevel: 30, pullCutPerLevel: 0.08 },
  wall: { baseGolems: 2, golemEvery: 3, maxGolems: 5, golemPower: 10, golemPowerPerLevel: 7 },
  forgePerLevel: 1.5,
  vault: { capPerLevel: 0.30, protectPerLevel: 0.03 },
  // Rim City market base prices (Crowns per unit). Buy at price × buyMult, sell at price × sellMult.
  market: { prices: { stone: 1.2, timber: 1.5, lumen: 3, moss: 1, iron: 2, coal: 2, amber: 12, steel: 8, obsidian: 16 }, buyMult: 1.0, sellMult: 0.55, premiumSellMult: 0.85, lot: 20 },
  mapRaid: { lumen: 10, marchMinutes: 30, shieldHours: 6 },                                                 // steel per game hour per level

  // The Hollow. Expedition: hours, lumen cost, recommended power, base risk, xp, loot ranges, pet egg.
  // Outposts: burn = Lumen per hour to keep an outpost lit; pull = Pull multiplier of the layer.
  layers: [
    { id: 1, name: 'The Lip', color: '#d9b46a', flavor: 'Sunlit ledges and old gold seams just under the rim.',
      hours: 1, lumen: 5, rec: 20, risk: 0.05, xp: 30, loot: { crowns: [40, 80], stone: [20, 40], timber: [10, 25] }, pet: 'wisp', egg: 0.12, burn: 0.5, pull: 1.0,
      veins: [ { id: 'l1gold', name: 'Gold Vein', prod: { crowns: 12 } }, { id: 'l1chalk', name: 'Chalk Ledge', prod: { stone: 10 } } ] },
    { id: 2, name: 'Lanternmoss Terraces', color: '#7fb07a', flavor: 'Glowing moss terraces. The fuel of everything below.',
      hours: 3, lumen: 10, rec: 45, risk: 0.12, xp: 90, loot: { lumen: [15, 30], moss: [20, 40], crowns: [20, 40] }, pet: 'pup', egg: 0.10, burn: 1, pull: 1.25,
      veins: [ { id: 'l2moss', name: 'Lanternmoss Bed', prod: { moss: 10 } }, { id: 'l2clay', name: 'Clay Shelf', prod: { stone: 11, moss: 2 } } ] },
    { id: 3, name: 'Rootfall', color: '#c08a4a', flavor: 'A forest growing down the wall. Amber weeps from the roots.',
      hours: 6, lumen: 20, rec: 80, risk: 0.22, xp: 200, loot: { timber: [30, 60], amber: [2, 5], iron: [10, 20], steel: [3, 6] }, pet: 'moth', egg: 0.10, burn: 2, pull: 1.6,
      veins: [ { id: 'l3wood', name: 'Heartwood Grove', prod: { timber: 10 } }, { id: 'l3amber', name: 'Amber Weep', prod: { amber: 0.8, timber: 3 } } ] },
    { id: 4, name: 'The Bellows', color: '#b0573a', flavor: 'The Hollow breathes here. Iron, Breathcoal, and hot wind.',
      hours: 10, lumen: 35, rec: 130, risk: 0.32, xp: 420, loot: { iron: [30, 60], coal: [20, 40], steel: [6, 12], amber: [3, 6], obsidian: [1, 4] }, pet: 'ferret', egg: 0.10, burn: 3, pull: 2.0,
      veins: [ { id: 'l4iron', name: 'Iron Seam', prod: { iron: 8, coal: 2 } }, { id: 'l4coal', name: 'Breathcoal Vent', prod: { coal: 8, iron: 2 } } ] },
  ],
  veinDecayPerDay: 0.04, veinMin: 0.35, veinRegenPerDay: 0.08,
  seasonedDays: 7, seasonedBonus: 0.10, darkOutput: 0.25,

  outpostTypes: {
    strider: { name: 'Strider', icon: '🦿', mult: 1.0, defense: 25, stockCap: 300, unanchorH: 3, travelHPerLayer: 2, settleH: 2,
               desc: 'A workshop on four stilt legs. Balanced all-rounder.' },
    drill:   { name: 'Tetherdrill', icon: '⛏️', mult: 1.3, defense: 15, stockCap: 240, unanchorH: 2, travelHPerLayer: 1, settleH: 1,
               desc: 'Hangs off your Spine. Highest output, fast to move, thin armor.',
               cost: { crowns: 500, stone: 250, timber: 120, steel: 15 }, needsLift: 2 },
  },
  moveCost: { crowns: 60, lumenPerLayer: 10 },     // moving deeper costs more Lumen (the Pull)

  modules: {
    still:   { name: 'Lumen Still', icon: '⚗️', cost: { crowns: 120, timber: 40 }, in: { moss: 2 }, out: { lumen: 1 }, perHour: 5,
               desc: 'Presses 2 Lanternmoss → 1 Lumen aboard (capital presses only 3:1).' },
    smelter: { name: 'Smelter',     icon: '🔥', cost: { crowns: 200, stone: 120, timber: 60 }, in: { iron: 2, coal: 1 }, out: { steel: 1 }, perHour: 3,
               desc: 'Smelts 2 Iron + 1 Breathcoal → 1 Steel aboard. Pulls inputs from your other outposts on the same layer.' },
  },

  pull: { scale: 0.25, shipEveryHours: 1 },   // Lumen cost = qty × weight × layer depth × layer pull × scale × (1 − lift cut) × pets

  pets: {
    wisp:   { name: 'Chalk Wisp',     icon: '👻', power: 9, bonus: 'Sturdy defender (+power)' },
    pup:    { name: 'Moss Pup',       icon: '🐶', power: 6, bonus: '+20% Lumen from expeditions', lumenFind: 0.20 },
    moth:   { name: 'Amber Moth',     icon: '🦋', power: 7, bonus: '+15% expedition loot', loot: 0.15 },
    ferret: { name: 'Bellows Ferret', icon: '🦦', power: 8, bonus: 'Hauler: −20% Pull cost', pullCut: 0.20 },
  },
  petLevelPower: 0.4, petMax: 10, petUpgrade: { crowns: 60, amber: 2 },
  kennelPetBoost: 0.10,

  raidsEnabled: false,                    // all raiding (incoming AI raids on your capital/outposts, outgoing raids) is off for now
  raids: {
    firstRaidHours: 1.5, intervalHours: [8, 14], shieldHours: 8,
    attackLumen: 10, marchMinutes: 30, rivalShieldHours: 4,
    lootPct: 0.30,                          // share of UNPROTECTED stock taken at 3 stars
    outpostBaitChance: 0.5, outpostLootPct: 0.4,
    growthPerDay: 0.04,                     // AI raiders slowly get stronger
    heroHomeDefense: 0.5, petDefense: 0.6,
  },
  rivals: [
    { name: 'Hookline Rest',  lord: 'Vessa the Ropewright', icon: '🪝', mult: 0.7 },
    { name: 'Cinderbell Keep',lord: 'Old Marrow',          icon: '🔔', mult: 1.0 },
    { name: 'Mothwick Hold',  lord: 'The Pale Lodge',      icon: '🕯️', mult: 1.35 },
  ],
};

const HOUR = 3600e3, MIN = 60e3, DAY = 24 * HOUR;
const RES = Object.keys(CONFIG.resources);
let S = null;                 // game state
let ui = { tab: 'city', pressing: false, lastHtml: '', modal: null, collecting: null };

/* ---------------- helpers ---------------- */
const $ = (s) => document.querySelector(s);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const speed = () => (S.testMode ? CONFIG.testMode.speed : 1);
const layerById = (id) => CONFIG.layers[id - 1];
function veinById(id) { for (const L of CONFIG.layers) for (const v of L.veins) if (v.id === id) return Object.assign({ layer: L.id }, v); return null; }
function fmt(n) { n = Math.floor(n + 1e-9); if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'; if (n >= 1e4) return (n / 1e3).toFixed(1) + 'k'; return String(n); }
function fmt1(n) { return n >= 10 ? fmt(n) : (Math.round(n * 10) / 10).toString(); }
function fmtDur(ms) {
  ms = Math.max(0, ms); const s = Math.ceil(ms / 1000);
  if (s < 60) return s + 's';
  const m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d > 0) return d + 'd ' + (h % 24) + 'h';
  if (h > 0) return h + 'h ' + (m % 60) + 'm';
  return m + 'm ' + (s % 60) + 's';
}
const realLeft = (end) => fmtDur((end - S.gameTime) / speed());
const gameDur = (ms) => fmtDur(ms) + (S.testMode ? ` <span class="dim">(≈${fmtDur(ms / speed())} real)</span>` : '');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------------- state ---------------- */
function newState() {
  const veins = {}; CONFIG.layers.forEach((L) => L.veins.forEach((v) => (veins[v.id] = 1)));
  const buildings = {}; for (const k in CONFIG.buildings) buildings[k] = CONFIG.buildings[k].start ?? 1;
  return { charSex: 'm',
    v: 1, testMode: CONFIG.testMode.defaultOn, gameTime: 0, lastReal: Date.now(), created: Date.now(),
    res: Object.assign({}, CONFIG.start), buildings, build: null,
    hero: { level: 1, xp: 0, task: null },
    taps: { days: {}, total: 0, marks: 0 },
    pets: [{ uid: 1, id: 'pup', level: 1 }], slots: [1, null],
    outposts: [{ uid: 2, type: 'strider', name: 'Longstep', layer: 1, vein: 'l1gold', state: 'anchored', anchoredSince: 0, stock: {}, module: null, ship: 'all', move: null, dark: false }],
    veins, nextShipAt: HOUR * CONFIG.pull.shipEveryHours, lastShip: null,
    nextRaidAt: CONFIG.raidsEnabled ? CONFIG.raids.firstRaidHours * HOUR : 1e15, shieldUntil: 0, raidCount: 0, lastRaid: null, pendingReveal: null,
    rivals: [], log: [], nextUid: 10, seen: {},
    mapShields: {}, moleDone: {}, discovered: {}, journal: [], seasonOverride: null, festivalOverride: false, cityCam: null,
    stats: { expeditions: 0, raidsWon: 0, defended: 0, tapsAll: 0, deepest: 0, moles: 0 },
  };
}
function uid() { return S.nextUid++; }

function log(icon, msg) {
  const e = { t: S.gameTime, icon, msg };
  S.log.unshift(e); if (S.log.length > 80) S.log.length = 80;
  if (ui.collecting) ui.collecting.push(e);
  else toast(icon + ' ' + msg.replace(/<[^>]+>/g, ''));
}

/* ---------------- derived numbers ---------------- */
function storageCap() { const c = CONFIG.storage; return Math.floor(c.base * Math.pow(c.growth, S.buildings.storehouse - 1) * (1 + CONFIG.vault.capPerLevel * (S.buildings.vault || 0))); }
function protectedShare() { const c = CONFIG.storage; return clamp(c.protectBase + c.protectPerLevel * (S.buildings.storehouse - 1) + CONFIG.vault.protectPerLevel * (S.buildings.vault || 0), 0, 0.85); }
function addRes(k, n) { S.res[k] = clamp((S.res[k] || 0) + n, 0, storageCap()); }
function canAfford(cost) { return Object.keys(cost).every((k) => (S.res[k] || 0) >= cost[k] - 1e-9); }
function pay(cost) { if (!canAfford(cost)) return false; for (const k in cost) S.res[k] -= cost[k]; return true; }
function liftReach() { return Math.min(CONFIG.lift.maxReach, S.buildings.lift + 1); }      // deepest layer outposts can anchor
function expeditionReach() { return Math.min(CONFIG.layers.length, liftReach() + 1); }       // hero can scout one layer deeper
function liftCapacity() { return CONFIG.lift.capacityPerLevel * S.buildings.lift; }
function golemCount() { const w = CONFIG.wall; return Math.min(w.maxGolems, w.baseGolems + Math.floor((S.buildings.wall - 1) / w.golemEvery)); }
function golemPower() { const w = CONFIG.wall; return w.golemPower + w.golemPowerPerLevel * (S.buildings.wall - 1); }
function petSlots() { return S.buildings.kennel >= 3 ? 2 : 1; }
function equippedPets() { return S.slots.slice(0, petSlots()).map((u) => S.pets.find((p) => p.uid === u)).filter(Boolean); }
function petPower(p) { const d = CONFIG.pets[p.id]; return d.power * (1 + CONFIG.petLevelPower * (p.level - 1)) * (1 + CONFIG.kennelPetBoost * (S.buildings.kennel - 1)); }
function petsPower() { return equippedPets().reduce((a, p) => a + petPower(p), 0); }
function petBonus(key) { return equippedPets().reduce((a, p) => a + (CONFIG.pets[p.id][key] || 0), 0); }
function heroBasePower() { const h = CONFIG.hero; return h.basePower + h.powerPerLevel * (S.hero.level - 1) + CONFIG.trainingPerLevel.power * (S.buildings.training - 1); }
function attackPower() { return heroBasePower() + petsPower(); }
function heroHome() { return !S.hero.task; }
function defensePower() {
  const r = CONFIG.raids;
  return golemCount() * golemPower() + petsPower() * r.petDefense + (heroHome() ? heroBasePower() * r.heroHomeDefense : 0);
}
function xpToNext(l) { const h = CONFIG.hero; return Math.floor(h.xpBase * Math.pow(h.xpGrowth, (l || S.hero.level) - 1)); }

/* ---------- training boost (rolling 7-day bank) ---------- */
function tapScale() { return S.testMode ? CONFIG.tap.testScale : 1; }
function dayIndex() { return Math.floor(S.gameTime / DAY); }
function tapsToday() { return S.taps.days[dayIndex()] || 0; }
function dailyCap() { return Math.round(CONFIG.tap.dailyCap * tapScale()); }
function weeklyTarget() { return Math.round(CONFIG.tap.weeklyTarget * tapScale()); }
function weekTaps() { const d = dayIndex(); let s = 0; for (const k in S.taps.days) if (+k > d - CONFIG.tap.rollingDays) s += S.taps.days[k]; return s; }
function boostFor(t) { return 100 * Math.pow(Math.min(1, t / weeklyTarget()), CONFIG.tap.exponent); }
function boostPct() { return boostFor(weekTaps()); }
function pruneTaps() { const d = dayIndex(); for (const k in S.taps.days) if (+k <= d - CONFIG.tap.rollingDays) delete S.taps.days[k]; }

function gainXp(amount, quiet) {
  const gained = amount * (1 + boostPct() / 100);
  S.hero.xp += gained;
  let ups = 0;
  while (S.hero.xp >= xpToNext()) { S.hero.xp -= xpToNext(); S.hero.level++; ups++; }
  if (ups) log('⭐', `${CONFIG.hero.name} reached <b>level ${S.hero.level}</b>!`);
  return gained;
}

/* ---------------- buildings ---------------- */
function buildCost(id) {
  const b = CONFIG.buildings[id], target = S.buildings[id] + 1, mult = Math.pow(b.growth, Math.max(0, target - 2));
  const c = {}; for (const k in b.base) c[k] = Math.round(b.base[k] * mult);
  if (b.steelFrom && target >= b.steelFrom) c.steel = b.steelPer * (target - b.steelFrom + 1);
  if (b.amberFrom && target >= b.amberFrom) c.amber = b.amberPer * (target - b.amberFrom + 1);
  if (b.obsidianFrom && target >= b.obsidianFrom) c.obsidian = b.obsidianPer * (target - b.obsidianFrom + 1);
  return c;
}
function buildTime(id) { const b = CONFIG.buildings[id], target = S.buildings[id] + 1; return b.minutes * MIN * Math.pow(CONFIG.buildTimeGrowth, Math.max(0, target - 2)); }
function buildBlock(id) {
  const b = CONFIG.buildings[id], lvl = S.buildings[id];
  if (lvl >= b.max) return 'Max level';
  if (id !== 'hall' && lvl + 1 > S.buildings.hall + 1) return `Needs Lantern Hall Lv ${lvl}`;
  if (S.build) return 'Builders busy';
  return null;
}
function startBuild(id) {
  if (buildBlock(id)) return;
  const cost = buildCost(id);
  if (!pay(cost)) return toast('Not enough resources');
  S.build = { id, to: S.buildings[id] + 1, start: S.gameTime, end: S.gameTime + buildTime(id) };
  toast(`🔨 Building ${CONFIG.buildings[id].name} Lv ${S.build.to}`);
  rerender(true);
}

/* ---------------- expeditions ---------------- */
function successChance(L) { return clamp(1 - L.risk + ((attackPower() - L.rec) / L.rec) * 0.3, 0.2, 0.97); }
function startExpedition(layerId) {
  const L = layerById(layerId);
  if (!heroHome()) return toast('Your hero is busy');
  if (layerId > expeditionReach()) return toast('The Tether does not reach that deep yet');
  if (!pay({ lumen: L.lumen })) return toast(`Needs ${L.lumen} Lumen to light the way`);
  S.hero.task = { type: 'expedition', layer: layerId, start: S.gameTime, end: S.gameTime + L.hours * HOUR };
  toast(`🕳️ ${CONFIG.hero.name} descends into ${L.name}`);
  rerender(true);
}
function rollLoot(L, mult) {
  const out = {};
  for (const k in L.loot) { let n = rand(L.loot[k][0], L.loot[k][1]) * mult; if (k === 'lumen') n *= 1 + petBonus('lumenFind'); out[k] = Math.round(n); }
  return out;
}
function lootText(l) { return Object.keys(l).filter((k) => l[k] > 0).map((k) => `${CONFIG.resources[k].icon}${fmt(l[k])}`).join(' '); }
function grantLoot(l) { for (const k in l) addRes(k, l[k]); }
function findPet(L) {
  if (Math.random() < L.egg) {
    const p = { uid: uid(), id: L.pet, level: 1 };
    const dupe = S.pets.find((x) => x.id === L.pet);
    if (dupe) { dupe.level = Math.min(CONFIG.petMax, dupe.level + 1); log('🥚', `Found another ${CONFIG.pets[L.pet].name} egg. Your ${CONFIG.pets[L.pet].name} grew to Lv ${dupe.level}!`); }
    else { S.pets.push(p); log('🥚', `Found a pet egg! <b>${CONFIG.pets[L.pet].icon} ${CONFIG.pets[L.pet].name}</b> hatched.`); if (!S.slots[0]) S.slots[0] = p.uid; }
  }
}
function finishHeroTask() {
  const t = S.hero.task;
  if (t.type === 'expedition') {
    const L = layerById(t.layer);
    const mult = (1 + 0.03 * (S.hero.level - 1)) * (1 + petBonus('loot'));
    const loot = rollLoot(L, mult);
    if (Math.random() < successChance(L)) {
      grantLoot(loot); const xp = gainXp(L.xp);
      S.stats.expeditions++; S.stats.deepest = Math.max(S.stats.deepest || 0, t.layer);
      log('🎒', `Back from <b>${L.name}</b>: ${lootText(loot)} · +${fmt(xp)} XP`);
      findPet(L);
      S.hero.task = null;
    } else {
      const half = {}; for (const k in loot) half[k] = Math.floor(loot[k] / 2);
      S.hero.task = { type: 'stranded', layer: t.layer, start: S.gameTime, end: S.gameTime + L.hours * HOUR * 0.5, loot: half, xp: L.xp / 2 };
      log('🕯️', `${CONFIG.hero.name}'s lantern ran low in <b>${L.name}</b>. Stranded on a ledge, waiting for a rescue line.`);
    }
  } else if (t.type === 'stranded') {
    grantLoot(t.loot); const xp = gainXp(t.xp);
    log('🪢', `Rescue line reached ${CONFIG.hero.name}. Came home with ${lootText(t.loot)} · +${fmt(xp)} XP`);
    S.hero.task = null;
  } else if (t.type === 'mole') {
    resolveMoleFight(t); S.hero.task = null;
  } else if (t.type === 'raid') {
    if (t.map) resolveMapRaid(t.map); else resolveAttack(t.rival);
    S.hero.task = null;
  }
}
function rescueCost() { return S.hero.task && S.hero.task.type === 'stranded' ? 8 * S.hero.task.layer : 0; }
function rescueNow() {
  if (!S.hero.task || S.hero.task.type !== 'stranded') return;
  if (!pay({ lumen: rescueCost() })) return toast('Not enough Lumen for a rescue line');
  S.hero.task.end = S.gameTime; finishHeroTask(); rerender(true);
}

/* ---------------- outposts ---------------- */
function stockTotal(o) { return Object.values(o.stock).reduce((a, b) => a + b, 0); }
function opType(o) { return CONFIG.outpostTypes[o.type]; }
function seasoned(o) { return o.state === 'anchored' && S.gameTime - o.anchoredSince >= CONFIG.seasonedDays * DAY; }
function outpostRates(o) {
  if (o.state !== 'anchored') return {};
  const v = veinById(o.vein), m = opType(o).mult * S.veins[o.vein] * (seasoned(o) ? 1 + CONFIG.seasonedBonus : 1) * (o.dark ? CONFIG.darkOutput : 1);
  const r = {}; for (const k in v.prod) r[k] = v.prod[k] * m; return r;
}
function burnRate(o) { return layerById(o.layer).burn; }
function siblings(o) { return S.outposts.filter((x) => x !== o && x.state === 'anchored' && x.layer === o.layer); }
function runModule(o, h) {
  if (!o.module || o.state !== 'anchored') return;
  const m = CONFIG.modules[o.module];
  let batches = m.perHour * h * (o.dark ? CONFIG.darkOutput : 1);
  const pools = [o, ...(o.module === 'smelter' ? siblings(o) : [])];
  for (const k in m.in) { const have = pools.reduce((a, p) => a + (p.stock[k] || 0), 0); batches = Math.min(batches, have / m.in[k]); }
  if (batches <= 1e-6) return;
  for (const k in m.in) {
    let need = batches * m.in[k];
    for (const p of pools) { const take = Math.min(need, p.stock[k] || 0); p.stock[k] = (p.stock[k] || 0) - take; need -= take; if (need <= 1e-9) break; }
  }
  for (const k in m.out) o.stock[k] = (o.stock[k] || 0) + batches * m.out[k];
  o.refined = (o.refined || 0) + batches;
}
function updateOutpost(o, h) {
  const t = S.gameTime, T = opType(o);
  if (o.move && t >= o.move.phaseEnd) {
    if (o.state === 'packing') {
      const layers = Math.abs(o.move.toLayer - o.layer);
      o.state = 'traveling'; o.move.phaseStart = o.move.phaseEnd; o.move.phaseEnd += Math.max(1, layers * T.travelHPerLayer) * HOUR;
      log(T.icon, `${o.name} has packed up and is on the move toward ${layerById(o.move.toLayer).name}.`);
    } else if (o.state === 'traveling') {
      o.state = 'settling'; o.layer = o.move.toLayer; o.vein = o.move.toVein;
      o.move.phaseStart = o.move.phaseEnd; o.move.phaseEnd += T.settleH * HOUR;
    } else if (o.state === 'settling') {
      o.state = 'anchored'; o.anchoredSince = o.move.phaseEnd; o.move = null;
      log('⚓', `${o.name} anchored on the <b>${veinById(o.vein).name}</b> in ${layerById(o.layer).name}.`);
    }
  }
  // Lumen upkeep (keeping the outpost lit)
  const burn = burnRate(o) * h;
  if (S.res.lumen >= burn) { S.res.lumen -= burn; if (o.dark) { o.dark = false; } }
  else { if (!o.dark) log('🌑', `${o.name} went dark: the capital ran out of Lumen. Output drops to 25%.`); o.dark = true; }
  if (o.state === 'anchored') {
    const cap = T.stockCap, r = outpostRates(o);
    let room = cap - stockTotal(o);
    for (const k in r) { const add = Math.min(room, r[k] * h); if (add > 0) { o.stock[k] = (o.stock[k] || 0) + add; room -= add; } }
    o.full = room <= 0.01;
    runModule(o, h);
    S.veins[o.vein] = Math.max(CONFIG.veinMin, S.veins[o.vein] - CONFIG.veinDecayPerDay * h / 24);
  }
}
function pullCost(o, k, qty) {
  const L = layerById(o.layer);
  const cut = (1 - CONFIG.lift.pullCutPerLevel * (S.buildings.lift - 1)) * (1 - petBonus('pullCut'));
  return qty * CONFIG.resources[k].weight * o.layer * L.pull * CONFIG.pull.scale * cut;
}
function shipList(o, mode) {
  const items = {};
  for (const k in o.stock) { if (o.stock[k] < 0.5) continue; if (mode === 'refined' && !CONFIG.refined.includes(k)) continue; items[k] = o.stock[k]; }
  return items;
}
function shipPreview(o, mode) {
  const items = shipList(o, mode || 'all'); let cost = 0, weight = 0;
  for (const k in items) { cost += pullCost(o, k, items[k]); weight += items[k] * CONFIG.resources[k].weight; }
  return { items, cost, weight };
}
// Ship goods up the Tether. Capacity (weight) per cycle is shared; Lumen pays the Pull.
function shipOutpost(o, mode, capLeft, manual) {
  if (mode === 'off' || o.state !== 'anchored') return { weight: 0, cost: 0, got: {} };
  const items = shipList(o, mode); const got = {}; let w = 0, c = 0;
  for (const k of Object.keys(items).sort((a, b) => CONFIG.resources[a].weight - CONFIG.resources[b].weight)) {
    let qty = items[k];
    const wt = CONFIG.resources[k].weight;
    qty = Math.min(qty, wt > 0 ? (capLeft - w) / wt : qty);
    const unit = pullCost(o, k, 1);
    if (unit > 0) qty = Math.min(qty, (S.res.lumen) / unit);
    qty = Math.floor(qty); if (qty <= 0) continue;
    const cost = unit * qty; S.res.lumen -= cost; c += cost; w += qty * wt;
    o.stock[k] -= qty; addRes(k, qty); got[k] = qty;
  }
  if (manual && !Object.keys(got).length) toast('Nothing shipped (no cargo, no Lumen for the Pull, or the lift is full)');
  return { weight: w, cost: c, got };
}
function shipAll() {
  let capLeft = liftCapacity() * CONFIG.pull.shipEveryHours; const total = { got: {}, cost: 0, weight: 0 };
  for (const o of S.outposts) {
    const r = shipOutpost(o, o.ship, capLeft, false); capLeft -= r.weight; total.cost += r.cost; total.weight += r.weight;
    for (const k in r.got) total.got[k] = (total.got[k] || 0) + r.got[k];
  }
  S.lastShip = Object.assign(total, { t: S.gameTime });
}
function shipNow(uidv) {
  const o = S.outposts.find((x) => x.uid === uidv); if (!o) return;
  const r = shipOutpost(o, o.ship === 'off' ? 'all' : o.ship, liftCapacity(), true);
  if (Object.keys(r.got).length) toast(`🧵 Lifted ${lootText(r.got)} for ${fmt1(r.cost)} 🏮 Pull`);
  rerender(true);
}
function moveCost(toLayer) { return { crowns: CONFIG.moveCost.crowns, lumen: CONFIG.moveCost.lumenPerLayer * toLayer }; }
function veinTaken(vid, exceptUid) { return S.outposts.some((o) => o.uid !== exceptUid && (o.vein === vid || (o.move && o.move.toVein === vid))); }
function moveTime(o, toLayer) { const T = opType(o); return (T.unanchorH + Math.max(1, Math.abs(toLayer - o.layer) * T.travelHPerLayer) + T.settleH) * HOUR; }
function startMove(uidv, vid) {
  const o = S.outposts.find((x) => x.uid === uidv), v = veinById(vid);
  if (!o || !v || o.state !== 'anchored') return;
  if (v.layer > liftReach()) return toast('Your Spine does not reach that layer yet');
  if (veinTaken(vid, o.uid)) return toast('That vein is already taken');
  if (!pay(moveCost(v.layer))) return toast('Not enough resources to pack up');
  o.state = 'packing'; o.move = { toLayer: v.layer, toVein: vid, phaseStart: S.gameTime, phaseEnd: S.gameTime + opType(o).unanchorH * HOUR };
  log('📦', `${o.name} is pulling up its anchor. Destination: ${v.name}, ${layerById(v.layer).name}.`);
  closeModal(); rerender(true);
}
function installModule(uidv, mid) {
  const o = S.outposts.find((x) => x.uid === uidv), m = CONFIG.modules[mid];
  if (!o || o.module === mid) return;
  if (!pay(m.cost)) return toast('Not enough resources');
  o.module = mid; if (mid === 'smelter' || mid === 'still') o.ship = 'refined';
  log(m.icon, `${m.name} installed on ${o.name}. Shipping set to refined goods only.`); rerender(true);
}
function buildDrill() {
  const T = CONFIG.outpostTypes.drill;
  if (S.outposts.some((o) => o.type === 'drill')) return;
  if (S.buildings.lift < T.needsLift) return toast(`Needs Tether Lift Lv ${T.needsLift}`);
  let vein = null;
  for (const L of CONFIG.layers) { if (L.id > liftReach()) break; for (const v of L.veins) if (!veinTaken(v.id)) { vein = Object.assign({ layer: L.id }, v); break; } if (vein) break; }
  if (!vein) return toast('No free vein in reach');
  if (!pay(T.cost)) return toast('Not enough resources');
  S.outposts.push({ uid: uid(), type: 'drill', name: 'Spinebiter', layer: vein.layer, vein: vein.id, state: 'settling', anchoredSince: 0, stock: {}, module: null, ship: 'all',
    move: { toLayer: vein.layer, toVein: vein.id, phaseStart: S.gameTime, phaseEnd: S.gameTime + T.settleH * HOUR }, dark: false });
  log('⛏️', `Tetherdrill <b>Spinebiter</b> lowered onto the ${vein.name}. It bites into the wall…`); rerender(true);
}

/* ---------------- pets ---------------- */
function petUpCost(p) { return { crowns: CONFIG.petUpgrade.crowns * p.level, amber: CONFIG.petUpgrade.amber * p.level }; }
function petUp(u) { const p = S.pets.find((x) => x.uid === u); if (!p || p.level >= CONFIG.petMax) return; if (!pay(petUpCost(p))) return toast('Not enough resources'); p.level++; toast(`${CONFIG.pets[p.id].icon} ${CONFIG.pets[p.id].name} is now Lv ${p.level}`); rerender(true); }
function equipPet(u) {
  const n = petSlots(); const idx = S.slots.indexOf(u);
  if (idx >= 0 && idx < n) { S.slots[idx] = null; }
  else { let free = -1; for (let i = 0; i < n; i++) if (!S.slots[i]) { free = i; break; } if (free < 0) free = n - 1; S.slots[free] = u; }
  rerender(true);
}

/* ---------------- raids ---------------- */
function ensureRivals() {
  CONFIG.rivals.forEach((r, i) => { if (!S.rivals[i]) S.rivals[i] = makeRival(i); });
}
function makeRival(i) {
  const def = CONFIG.rivals[i];
  return { power: Math.round(attackPower() * def.mult * rand(0.92, 1.08)), shieldUntil: 0, lootLvl: S.hero.level };
}
function rivalLoot(i) {
  const r = S.rivals[i], m = CONFIG.rivals[i].mult, l = Math.pow(r.lootLvl, 1.15);
  return { crowns: Math.round(110 * l * m), stone: Math.round(70 * l * m), steel: Math.round(3 * l * m), lumen: Math.round(12 * m) };
}
function starsFor(ratio) { return ratio >= 1.3 ? 3 : ratio >= 1.0 ? 2 : ratio >= 0.75 ? 1 : 0; }
function startAttack(i) {
  if (!CONFIG.raidsEnabled) return toast('Raids are coming later');
  ensureRivals(); const r = S.rivals[i];
  if (!heroHome()) return toast('Your hero is busy');
  if (S.gameTime < r.shieldUntil) return toast('That base is shielded');
  if (!pay({ lumen: CONFIG.raids.attackLumen })) return toast(`Needs ${CONFIG.raids.attackLumen} Lumen`);
  S.hero.task = { type: 'raid', rival: i, start: S.gameTime, end: S.gameTime + CONFIG.raids.marchMinutes * MIN };
  toast(`⚔️ Marching on ${CONFIG.rivals[i].name}…`); rerender(true);
}
function resolveAttack(i) {
  ensureRivals(); const r = S.rivals[i], d = CONFIG.rivals[i];
  const ratio = (attackPower() / Math.max(1, r.power)) * rand(0.85, 1.15), stars = starsFor(ratio);
  const full = rivalLoot(i), got = {};
  for (const k in full) { got[k] = Math.round(full[k] * stars / 3); addRes(k, got[k]); }
  const xp = gainXp(25 * S.hero.level * (stars + 1) / 2);
  if (stars > 0) S.stats.raidsWon++;
  const report = { kind: 'attack', name: d.name, icon: d.icon, stars, got, xp, atk: Math.round(attackPower()), def: r.power, t: S.gameTime };
  S.lastRaid = report;
  log('⚔️', `Raid on <b>${d.name}</b>: ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)} ${stars ? 'Loot ' + lootText(got) : 'Repelled. Their wall held.'} · +${fmt(xp)} XP`);
  S.rivals[i] = makeRival(i); S.rivals[i].shieldUntil = S.gameTime + CONFIG.raids.rivalShieldHours * HOUR;
  if (!ui.collecting) showAttackReport(report);
}
/* ---- raids on Rim City Ledges (AI players on the map) ---- */
function mapRaidLoot(level, region) { const L = { crowns: Math.round(45 * Math.pow(level, 1.15)), stone: Math.round(28 * Math.pow(level, 1.1)), steel: Math.round(level * 0.8), lumen: 4 + level };
  if (typeof REGIONS !== 'undefined' && REGIONS[region] && REGIONS[region].key === 'lava') L.obsidian = 2 + Math.round(level * 0.35); return L; }
function startMapRaid(h) {
  if (!CONFIG.raidsEnabled) return toast('Raids are coming later');
  if (!heroHome()) return toast('Your hero is busy');
  if ((S.mapShields[h.id] || 0) > S.gameTime) return toast('That Ledge is shielded');
  if (!pay({ lumen: CONFIG.mapRaid.lumen })) return toast(`Needs ${CONFIG.mapRaid.lumen} Lumen`);
  S.hero.task = { type: 'raid', map: { id: h.id, owner: h.owner, name: h.name, level: h.level, power: h.power, region: h.region }, start: S.gameTime, end: S.gameTime + CONFIG.mapRaid.marchMinutes * MIN };
  toast(`⚔️ Marching on ${h.owner}'s ${h.name}…`); rerender(true);
}
function resolveMapRaid(m) {
  const ratio = (attackPower() / Math.max(1, m.power)) * rand(0.85, 1.15), stars = starsFor(ratio);
  const full = mapRaidLoot(m.level, m.region), got = {};
  for (const k in full) { got[k] = Math.round(full[k] * stars / 3); addRes(k, got[k]); }
  const xp = gainXp(20 * m.level * (stars + 1) / 2);
  if (stars > 0) S.stats.raidsWon++;
  S.mapShields[m.id] = S.gameTime + CONFIG.mapRaid.shieldHours * HOUR;
  const report = { kind: 'attack', name: `${m.owner}'s ${m.name}`, icon: '🏘️', stars, got, xp, atk: Math.round(attackPower()), def: m.power, t: S.gameTime };
  S.lastRaid = report;
  log('⚔️', `Raid on <b>${m.owner}'s ${m.name}</b>: ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)} ${stars ? 'Loot ' + lootText(got) : 'Repelled.'} · +${fmt(xp)} XP`);
  if (!ui.collecting) showAttackReport(report);
}
/* ---- Rim Mole fights (map event) ---- */
function startMoleFight(m) {
  if (!heroHome()) return toast('Your hero is busy');
  S.hero.task = { type: 'mole', k: m.k, region: m.region, power: molePower(), start: S.gameTime, end: S.gameTime + 20 * MIN };
  S.moleDone[m.k] = true; if (typeof discoverRegion === 'function') discoverRegion(m.region);
  toast('⚔️ Wren charges the Rim Mole! The crowd roars.'); rerender(true);
}
function resolveMoleFight(t) {
  const win = Math.random() < clamp(attackPower() / t.power, 0.15, 0.95);
  const where = regionName(t.region);
  if (win) {
    const loot = { crowns: Math.round(60 * S.hero.level), amber: 3 + Math.floor(Math.random() * 4), iron: 20 + Math.floor(Math.random() * 20) }; grantLoot(loot);
    const xp = gainXp(40 * S.hero.level); S.stats.moles = (S.stats.moles || 0) + 1;
    log('🦴', `${CONFIG.hero.name} drove the Rim Mole back into the deep in ${where}! ${lootText(loot)} · +${fmt(xp)} XP. A skull trophy now hangs over your door.`);
  } else {
    const loot = { crowns: 20 * S.hero.level }; grantLoot(loot); const xp = gainXp(10 * S.hero.level);
    log('🤕', `The Rim Mole in ${where} was too much. ${CONFIG.hero.name} limped home with ${lootText(loot)} · +${fmt(xp)} XP.`);
  }
}
/* ---- Wren's journal (written on return from time away) ---- */
function writeJournal(sum) {
  const ev = sum.events, by = (ic) => ev.filter((e) => e.icon === ic), strip = (m) => m.replace(/<[^>]+>/g, '');
  const P = [];
  const exps = by('🎒');
  if (exps.length === 1) P.push(`I went down the Tether and came back with ${strip(exps[0].msg).split(': ')[1] || 'a full pack'}.`);
  else if (exps.length > 1) P.push(`I made ${exps.length} trips down the Tether. My boots are more mud than leather now.`);
  if (by('🕯️').length) P.push('My lantern guttered out on a ledge once. I sat in the dark counting heartbeats until the rescue line found me.');
  const def = by('🗿');
  def.forEach((e) => P.push(/routed/.test(e.msg) ? 'Raiders came for the wall. The golems stood up (I will never get used to that sound) and sent them running.' : 'Raiders broke through while I was away. The golems did what they could. We need a deeper Vault.'));
  const atk = by('⚔️'); if (atk.length) P.push(`I led ${atk.length} raid${atk.length > 1 ? 's' : ''} on our neighbours. Not my proudest work, but the coffers are fuller.`);
  if (by('🦴').length) P.push('I fought a Rim Mole in front of half the city. Its skull hangs over our door now.');
  if (by('🥚').length) P.push('Found an egg in the dark and carried it up under my coat. It hatched by the fire.');
  if (by('🌑').length) P.push('Our outposts went dark for a while. Not enough Lumen. I hate leaving them blind.');
  const anch = by('⚓'); if (anch.length) P.push('Our outpost found new footing below. The crew sent a cheer up the line.');
  const blds = ev.filter((e) => /upgraded to Lv/.test(e.msg)); if (blds.length) P.push(`The builders finished ${blds.map((e) => strip(e.msg).split(' upgraded')[0]).join(', ')}.`);
  if (sum.levels) P.push(`I feel stronger. Level ${S.hero.level} now.`);
  if (!P.length) P.push(['Quiet days. I sharpened my blade, watched the sky-fish drift, and let Old Maddox tell me the same story twice.', 'Nothing much happened. I sat on the Promenade and watched Pell light the lamps.', 'A slow stretch. I fed the pets and listened to the Hollow breathe.'][Math.floor(Math.random() * 3)]);
  try { const si = seasonInfo(); P.push(`${SEASONS[si.idx].icon} ${SEASONS[si.idx].name} on the Rim.`); } catch (e) { /* map not loaded */ }
  const entry = { t: S.gameTime, real: Date.now(), day: Math.floor(S.gameTime / DAY) + 1, text: P.join(' ') };
  S.journal = S.journal || []; S.journal.unshift(entry); if (S.journal.length > 40) S.journal.length = 40;
  return entry;
}
/* ---- Rim City markets ---- */
function marketBuy(k, lot, mult) {
  const price = Math.ceil(CONFIG.market.prices[k] * lot * mult);
  if (S.res[k] + lot > storageCap()) return toast('Not enough storage room');
  if (!pay({ crowns: price })) return toast(`Needs ${price} Crowns`);
  addRes(k, lot); toast(`🏪 Bought ${lot} ${CONFIG.resources[k].icon} for ${price} 👑`); return true;
}
function marketSell(k, lot, mult) {
  if ((S.res[k] || 0) < lot) return toast(`You need ${lot} ${CONFIG.resources[k].name}`);
  const gain = Math.floor(CONFIG.market.prices[k] * lot * mult);
  S.res[k] -= lot; addRes('crowns', gain); toast(`🏪 Sold ${lot} ${CONFIG.resources[k].icon} for ${gain} 👑`); return true;
}

function scheduleNextRaid() { const [a, b] = CONFIG.raids.intervalHours; S.nextRaidAt = S.gameTime + rand(a, b) * HOUR; }
const RAIDER_NAMES = ['the Ashgull Lodge', 'Brakka\'s Cable-Cutters', 'the Hollow Jackals', 'a Kite crew from the east rim', 'the Lantern Thieves'];
function aiRaid() {
  if (!CONFIG.raidsEnabled) { S.nextRaidAt = 1e15; return; }
  scheduleNextRaid();
  if (S.gameTime < S.shieldUntil) return;
  const R = CONFIG.raids, who = pick(RAIDER_NAMES), first = S.raidCount === 0;
  S.raidCount++;
  const growth = 1 + R.growthPerDay * (S.gameTime / DAY);
  const bait = S.outposts.filter((o) => o.state !== 'anchored' || stockTotal(o) > 0.6 * opType(o).stockCap);
  if (!first && bait.length && Math.random() < R.outpostBaitChance) {
    const o = pick(bait), T = opType(o);
    const def = (T.defense + o.layer * 6) * (o.state === 'anchored' ? 1 : 0.5);
    const atk = def * rand(0.7, 1.5) * growth, stars = starsFor(atk / def);
    const lost = {};
    if (stars > 0) for (const k in o.stock) { const n = o.stock[k] * R.outpostLootPct * stars / 3; if (n >= 1) { lost[k] = Math.floor(n); o.stock[k] -= lost[k]; } }
    const why = o.state !== 'anchored' ? 'caught it in transit' : 'smelled a full stockhold';
    log('🏴', `${who} ${why} and hit <b>${o.name}</b>. ${stars ? 'They hauled off ' + (lootText(lost) || 'a few crates') + '.' : 'The crew drove them off!'}`);
    S.lastRaid = { kind: 'outpost', who, name: o.name, stars, lost, t: S.gameTime };
    return;
  }
  const def = defensePower();
  const atk = first ? def * 0.7 : def * rand(0.7, 1.35) * growth;
  const stars = starsFor(atk / def), lost = {}, gained = {};
  if (stars > 0) {
    const share = R.lootPct * stars / 3, prot = protectedShare();
    for (const k of ['crowns', 'stone', 'lumen', 'steel', 'timber']) { const n = Math.floor(S.res[k] * (1 - prot) * share); if (n > 0) { lost[k] = n; S.res[k] -= n; } }
  } else {
    gained.crowns = Math.round(40 + atk * 1.5); gained.stone = Math.round(atk); grantLoot(gained); S.stats.defended++;
  }
  S.shieldUntil = S.gameTime + R.shieldHours * HOUR;
  const report = { kind: 'defense', who, stars, lost, gained, atk: Math.round(atk), def: Math.round(def), golems: golemCount(), golemPower: golemPower(), heroHome: heroHome(), t: S.gameTime, first };
  S.lastRaid = report;
  log('🗿', `${who} raided your capital. The wall stood up: ${golemCount()} rock golems woke. ${stars ? `They broke through (${'★'.repeat(stars)}) and took ${lootText(lost) || 'little'}.` : `Raiders routed! Spoils: ${lootText(gained)}.`}`);
  if (ui.collecting) S.pendingReveal = report; else showReveal(report);
}

/* ---------------- simulation ---------------- */
function step(dt) {
  const h = dt / HOUR; S.gameTime += dt;
  const lv = S.buildings.hall, H = CONFIG.hallPerLevel;
  addRes('crowns', H.crowns * lv * h); addRes('stone', H.stone * lv * h); addRes('lumen', H.lumen * lv * h);
  const press = Math.min(S.res.moss, H.mossPress * lv * h); if (press > 0) { S.res.moss -= press; addRes('lumen', press / 3); }
  if (S.buildings.forge > 0) {
    const n = Math.min(CONFIG.forgePerLevel * S.buildings.forge * h, S.res.iron / 2, S.res.coal);
    if (n > 0) { S.res.iron -= 2 * n; S.res.coal -= n; addRes('steel', n); }
  }
  if (heroHome()) gainXp(CONFIG.trainingPerLevel.sparXp * S.buildings.training * h);
  if (S.build && S.gameTime >= S.build.end) {
    S.buildings[S.build.id] = S.build.to;
    log(CONFIG.buildings[S.build.id].icon, `<b>${CONFIG.buildings[S.build.id].name}</b> upgraded to Lv ${S.build.to}.`);
    S.build = null;
  }
  if (S.hero.task && S.gameTime >= S.hero.task.end) finishHeroTask();
  for (const o of S.outposts) updateOutpost(o, h);
  const used = new Set(S.outposts.map((o) => o.vein));
  for (const k in S.veins) if (!used.has(k)) S.veins[k] = Math.min(1, S.veins[k] + CONFIG.veinRegenPerDay * h / 24);
  while (S.gameTime >= S.nextShipAt) { shipAll(); S.nextShipAt += CONFIG.pull.shipEveryHours * HOUR; }
  if (CONFIG.raidsEnabled && S.gameTime >= S.nextRaidAt) aiRaid();
  pruneTaps();
}
function simulate(dtGame) {
  const stepMs = CONFIG.simStepMinutes * MIN;
  while (dtGame > 0) { const d = Math.min(stepMs, dtGame); step(d); dtGame -= d; }
}
// Runs a chunk of time "while away" and returns a summary
function simulateAway(dtGame) {
  const before = Object.assign({}, S.res), lvl = S.hero.level;
  const capped = Math.min(dtGame, CONFIG.offlineCapHours * HOUR);
  ui.collecting = [];
  simulate(capped);
  const events = ui.collecting; ui.collecting = null;
  const delta = {}; for (const k of RES) { const d = (S.res[k] || 0) - (before[k] || 0); if (Math.abs(d) >= 1) delta[k] = d; }
  return { gameMs: capped, cappedFrom: dtGame, delta, events, levels: S.hero.level - lvl };
}

/* ---------------- save / load ---------------- */
function save() { S.lastReal = Date.now(); try { localStorage.setItem(CONFIG.saveKey, JSON.stringify(S)); } catch (e) { /* storage full or blocked */ } }
// raids are off: drop any pending raid reveal, raid march, shields or battered state left in older saves
function clearRaids(s) { if (CONFIG.raidsEnabled) return s; s.pendingReveal = null; s.lastRaid = null; s.nextRaidAt = 1e15; s.shieldUntil = 0;
  if (s.hero && s.hero.task && s.hero.task.type === 'raid') s.hero.task = null; return s; }
function load() {
  try { const raw = localStorage.getItem(CONFIG.saveKey); if (!raw) return null; const s = JSON.parse(raw); if (!s || s.v !== 1) return null; const d = newState(); s.buildings = Object.assign(d.buildings, s.buildings || {}); s.res = Object.assign(Object.fromEntries(RES.map((k) => [k, 0])), s.res || {}); return clearRaids(Object.assign(d, s)); } catch (e) { return null; }
}
function resetSave() { localStorage.removeItem(CONFIG.saveKey); S = newState(); ensureRivals(); closeModal(); rerender(true); toast('Fresh start. Welcome to the Rim.'); }


/* =====================================================================
   RIM CITY — living world: people, pets, NPCs, sky-fish, weather,
   day/night, seasons & festivals, mole surfacings, market spikes
   ===================================================================== */
const CLOAKS = ['#4f8c8a', '#b0573a', '#7a5fa0', '#c9822f', '#5f7f99', '#6b8f4a', '#9a4a5a', '#3a4a6a', '#d8b46a'];
const SKIN = ['#f3d6b0', '#e2b88f', '#c8946a', '#9a6a48', '#f6e0c8'];
const NPCS = [
  { id: 'maddox', name: 'Old Maddox', role: 'Tether operator', icon: '🧓', color: '#5f7f99',
    lines: ['Forty years I\'ve run this lift. The rope hums different when something big is climbing it. Learn the hum and you\'ll live.',
      'Aurel Vane went down on a single line with a jar of moss for light. Came back up with Lumen in her eyes. Never blinked right after.',
      'Layer four breathes, kid. Twice a day the Bellows exhales and every cable on the Rim sings. That\'s the Hollow saying hello.',
      'They say the Undergate was here before the first city. Nobody built it. Nobody\'s opened it. I sleep fine, mostly.',
      'Sky-fish come up at nightfall because the deep gets too bright for them. Imagine that. Too much light.'] },
  { id: 'pell', name: 'Pell', role: 'Lamplighter', icon: '🕯️', color: '#c9822f',
    lines: ['Dusk is my hour. Every lamp on the Promenade, one by one, before the sky-fish rise.', 'A lamp lit late is a delver lost, my gran said. So I\'m never late.', 'Mind the wick, friend. Lumen oil bites if you rush it.'] },
  { id: 'greta', name: 'Greta Saltline', role: 'Fishmonger', icon: '🐟', color: '#5d9bb3',
    lines: ['Glassfin, fresh this morning! Two for a Crown!', 'Mirrorlake eels! Smoked, salted, or still wriggling!', 'Lamp oil pressed from lakefish, cheaper than the Mines!', 'If the sky-fish came down to the lake I\'d be rich. Clever things never do.'] },
  { id: 'ilse', name: 'Sister Ilse', role: 'Keeper of the Wall', icon: '🕊️', color: '#9a9488',
    lines: ['Every name on the Wall of Lanterns Out went down and did not come up. We light a candle for each, each night.', 'Your Wren\'s name isn\'t here. Let\'s keep it that way. Bring her home.', 'The oldest stone has no name, just a carved lantern. We think it was the first delver who never returned.'] },
  { id: 'kip', name: 'Kip', role: 'Courier', icon: '📯', color: '#c8634c', lines: ['RUMOR', 'RUMOR', 'RUMOR'] },
  { id: 'juniper', name: 'Juniper Fernsby', role: 'Farmer & fair host', icon: '🌾', color: '#6b8f4a',
    lines: ['Goldenstep feeds the whole Rim. Bring stone or timber to the Bazaar and I\'ll pay you proper Crowns.', 'Harvest Fair\'s the best week of the year. Pie-throwing, mole-racing, and old Maddox dancing.', 'Windmills turn even when there\'s no wind. Nobody asks why. It\'s the Hollow breathing.'] },
  { id: 'hennick', name: 'Brass Hennick', role: 'Vault warden', icon: '🏦', color: '#b8964a',
    lines: ['Raiders take what\'s lying around. They can\'t take what\'s under a ton of greystone. Build yourself a Vault: more room, and more of it stays safe.', 'Every Vault on the Rim is cut into the old bedrock. Deepest one goes down a full layer.', 'Coin sleeps best in the dark.'] },
];
const LORE = {
  statue: { title: 'Statue of Aurel Vane', text: 'The first to descend and return. Her outstretched arm was broken off in the Great Exhale of year 12; the Rim council voted to leave it that way. "She reached for the deep, and the deep took a piece." Delvers touch the stump for luck before a long dive.' },
  memorial: { title: 'The Wall of Lanterns Out', text: 'A long wall of small stone plaques, one for every delver who went below and never came back. A candle burns for each one, every night. Sister Ilse keeps them lit. There are more plaques than anyone likes to count.' },
  gate: { title: 'The Undergate', text: 'A round door of black stone set into the end of a chasm, ringed with gold that never tarnishes. It was here before the first city. It has no handle, no lock and no hinges. Sometimes, when the Bellows exhales, people swear it hums back. Nobody has opened it. Yet.' },
};
const SEASONS = [
  { name: 'Bloomtide', icon: '🌸', tint: 'rgba(255,200,220,.06)' },
  { name: 'Lumen Summer', icon: '☀️', tint: 'rgba(255,230,150,.06)' },
  { name: 'Ambertide', icon: '🍂', tint: 'rgba(230,140,60,.08)' },
  { name: 'Frostfall', icon: '❄️', tint: 'rgba(200,225,255,.10)' },
];
const RUMORS = [
  'They say the Undergate hummed last night. Old Maddox won\'t talk about it.', 'A Glassdune kiln-master swears she saw a sky-fish with a lantern in its mouth.',
  'Somebody keeps leaving fresh moss on Aurel Vane\'s statue.', 'Hushwood loggers heard singing from a fissure. Nobody went to check.',
  'Mirrorlake\'s water dropped a finger overnight. Where does it all go?', 'The Pale Lodge is hiring rope-wrights. Big dive planned, they say.',
  'Brass Hennick counts the Vault coin twice a day. He says it\'s once.', 'A Shellback calf wandered into the Goldenstep Bazaar and ate a whole stall of mossrice.',
  'Cinderreach chimneys went cold for an hour at noon. Nobody knows why.', 'Pell the lamplighter has never once been late. Not once in thirty years.',
];

/* ---------- time helpers ---------- */
function gTime() { return S ? S.gameTime : 0; }
function hourOfDay() { return ((gTime() / HOUR) + 8) % 24; }
function nightFactor() { const h = hourOfDay(); if (h >= 20 || h < 5) return 1; if (h >= 17) return (h - 17) / 3; if (h < 7) return 1 - (h - 5) / 2; return 0; }
function isDusk() { const h = hourOfDay(); return h >= 17.5 && h < 20.5; }
function seasonLen() { return (S && S.testMode ? CITY.testSeasonDays : CITY.seasonDays) * DAY; }
function seasonInfo() {
  if (S && S.seasonOverride != null) return { idx: S.seasonOverride, prog: S.festivalOverride ? 0.8 : 0.5, forced: true };
  const L = seasonLen(), t = gTime(); return { idx: Math.floor(t / L) % 4, prog: (t % L) / L, nextIn: L - (t % L) };
}
function festival() { const s = seasonInfo(); if (s.idx === 1 && (s.prog > 0.6 || (s.forced && S.festivalOverride))) return 'lumen'; if (s.idx === 2 && ((s.prog > 0.25 && s.prog < 0.75) || (s.forced && S.festivalOverride))) return 'harvest'; return null; }
function frostLevel() { const s = seasonInfo(); return s.idx === 3 ? clamp(s.prog * 1.4, 0.15, 1) : 0; }
/* Mole surfacings: deterministic windows of game time */
function moleEvent(k) {
  const win = CITY.moleWindowHours * HOUR; if (hash2(k, 31) > CITY.moleChance) return null;
  const start = k * win + hash2(k, 37) * (win - CITY.moleDurationHours * HOUR), end = start + CITY.moleDurationHours * HOUR;
  const ci = Math.floor(hash2(k, 41) * W.cracks.length), c = W.cracks[ci]; const pi = Math.max(1, Math.floor(c.pts.length * (0.4 + hash2(k, 43) * 0.5)) - 1); const p = c.pts[pi];
  const off = c.ws[pi] / 2 + 34, ang = Math.atan2(p[1], p[0]) + Math.PI / 2; const x = p[0] + Math.cos(ang) * off, y = p[1] + Math.sin(ang) * off;
  return { k, start, end, x, y, region: regionAt(x, y), power: 0 };
}
function currentMole() { const k = Math.floor(gTime() / (CITY.moleWindowHours * HOUR)); for (const kk of [k, k - 1]) { const e = moleEvent(kk); if (e && gTime() >= e.start && gTime() < e.end && !(S.moleDone && S.moleDone[e.k])) return e; } return null; }
function nextMole() { const k = Math.floor(gTime() / (CITY.moleWindowHours * HOUR)); for (let kk = k; kk < k + 4; kk++) { const e = moleEvent(kk); if (e && e.start > gTime()) return e; } return null; }
function molePower() { return Math.round(18 + 7 * S.hero.level); }
/* Market price spikes */
function spikeAt(mi, w) { return hash2(w, 100 + mi) < CITY.spikeChance; }
function marketSpike(mi) { return spikeAt(mi, Math.floor(gTime() / (CITY.spikeWindowHours * HOUR))); }
/* Weather (real-time, ambient) */
const WEATHER_TYPES = ['rain', 'storm', 'updraft', 'clear', 'rain', 'mist'];
function weatherNow(t) {
  const P = CITY.weatherSeconds, e = Math.floor(t / P), u = (t % P) / P, type = WEATHER_TYPES[Math.floor(hash2(e, 5) * WEATHER_TYPES.length)];
  const a0 = hash2(e, 9) * TAU - Math.PI, a1 = a0 + 0.9 + hash2(e, 11) * 0.6;
  const pa = a0 + (a1 - a0) * u, pr = 1500 + 700 * Math.sin(u * Math.PI);
  const x = type === 'updraft' ? Math.cos(a0) * (hollowR(a0) + 20) : Math.cos(pa) * pr, y = type === 'updraft' ? Math.sin(a0) * (hollowR(a0) + 20) : Math.sin(pa) * pr;
  const fade = Math.min(1, u * 6, (1 - u) * 6);
  return { type, x, y, r: type === 'updraft' ? 260 : 620, fade, e, region: regionAt(x, y) };
}
function weatherLabel(w) { const R = REGIONS[w.region].name; return { rain: `🌧️ Rain drifting over ${R}`, storm: `⛈️ A Hollow storm rolls across ${R}`, updraft: '🌬️ An Exhale updraft rises from the Hollow', mist: `🌫️ Mist creeps through ${R}`, clear: nightFactor() > 0.5 ? '🌙 Clear night over the Rim' : '☀️ Clear skies over the Rim' }[w.type]; }

/* ---------- generation of agents ---------- */
function genLife(rnd) {
  const used = new Set(W.homes.map((h) => h.owner));
  W.walkers = [];
  const roads = W.roads;
  for (let i = 0; i < CITY.walkers; i++) {
    const rd = roads[Math.floor(rnd() * roads.length)];
    W.walkers.push({ road: rd.idx, s0: rnd() * rd.len, v: (11 + rnd() * 14) * (rnd() < 0.5 ? -1 : 1), lane: (rnd() - 0.5) * 10, name: makeOwner(rnd, used),
      cloak: CLOAKS[Math.floor(rnd() * CLOAKS.length)], skin: SKIN[Math.floor(rnd() * SKIN.length)], hat: rnd() < 0.4, lantern: rnd() < 0.5,
      pet: rnd() < 0.22 ? PET_KINDS[Math.floor(rnd() * PET_KINDS.length)] : null, phase: rnd() * TAU, shy: rnd() });
  }
  W.visitors = []; W.markets.forEach((m, mi) => { for (let k = 0; k < 16; k++) W.visitors.push({ m: mi, a0: rnd() * TAU, w: (0.05 + rnd() * 0.08) * (rnd() < 0.5 ? -1 : 1), rr: m.r * (0.45 + rnd() * 0.35), extra: k >= 6, cloak: CLOAKS[Math.floor(rnd() * CLOAKS.length)], skin: SKIN[Math.floor(rnd() * SKIN.length)], phase: rnd() * TAU }); });
  W.caravans = W.markets.map((m, mi) => { let best = null, bd = 1e9; for (const rd of W.roads) { if (rd.kind !== 'radial') continue; for (let s = 0; s < rd.len; s += 40) { const [x, y] = roadPos(rd, s); const d = Math.hypot(x - m.x, y - m.y); if (d < bd) { bd = d; best = { rd: rd.idx, s }; } } } return Object.assign(best, { m: mi, phase: rnd() * 100 }); });
  // sky-fish (no birds!): day drifters + night school
  W.dayFish = []; for (let i = 0; i < 7; i++) W.dayFish.push({ kind: ['manta', 'koi', 'eel'][i % 3], phase: rnd() * 200, period: 70 + rnd() * 50, size: 26 + rnd() * 22, a0: rnd() * TAU, hue: rnd() });
  W.nightFish = []; for (let i = 0; i < 70; i++) W.nightFish.push({ a: rnd() * TAU, r: 0.2 + rnd() * 0.75, sp: 0.15 + rnd() * 0.25, ph: rnd() * TAU, size: 5 + rnd() * 5, hue: rnd() });
  W.motes = []; for (let i = 0; i < 160; i++) W.motes.push({ a: rnd() * TAU, sp: 0.02 + rnd() * 0.04, off: rnd(), sz: 3 + rnd() * 5, wob: rnd() * TAU });
  W.mist = []; for (let i = 0; i < 14; i++) W.mist.push({ a: rnd() * TAU, r: 120 + rnd() * 550, w: (rnd() - 0.5) * 0.03, size: 260 + rnd() * 380, al: 0.12 + rnd() * 0.16 });
  W.peekers = []; for (let i = 0; i < 22; i++) { const c = W.cracks[Math.floor(rnd() * W.cracks.length)]; const j = Math.floor(rnd() * (c.pts.length - 1)); W.peekers.push({ x: c.pts[j][0], y: c.pts[j][1], P: 9 + rnd() * 15, ph: rnd() * 30, red: rnd() < 0.3, tent: rnd() < 0.35 }); }
  W.boats = []; for (let i = 0; i < 5; i++) W.boats.push({ ph: rnd() * TAU, sp: 0.03 + rnd() * 0.04, ra: 0.3 + rnd() * 0.45, sail: CLOAKS[i] });
  W.lanterns = []; for (let i = 0; i < 90; i++) { const a = rnd() * TAU; W.lanterns.push({ a, ph: rnd(), sp: 0.012 + rnd() * 0.01, c: rnd() < 0.5 ? '#ffd46b' : '#ffb36b' }); }
  W.frost = W.objs.filter((o) => REGIONS[o.region].key === 'bluffs' && (o.type === 'cliff' || o.type === 'boulder')).slice(0, 220);
  W.frostOthers = W.objs.filter((o, i) => i % 11 === 0 && REGIONS[o.region].key !== 'bluffs').slice(0, 200);
  // Named NPC placement
  const L0 = W.lifts.find((l) => /Maddox/.test(l.name)) || W.lifts[0];
  const mk = (id, x, y, extra) => Object.assign({ x, y, npc: NPCS.find((n) => n.id === id), talk: 0 }, extra || {});
  const docksM = W.markets.find((m) => m.region === 0) || W.markets[0], farmsM = W.markets.find((m) => m.region === 5) || W.markets[1];
  const memo = W.landmarks.find((l) => l.type === 'memorial');
  W.npcs = [
    mk('maddox', L0.x + 18, L0.y + 10),
    mk('pell', 0, 0, { road: 0, v: 22, mover: 'pell' }),
    mk('greta', W.piers[0] ? W.piers[0].x + Math.cos(W.piers[0].a) * 0 : docksM.x, W.piers[0] ? W.piers[0].y : docksM.y),
    mk('ilse', memo.x + 14, memo.y + 20),
    mk('kip', 0, 0, { road: 2, v: 70, mover: 'kip' }),
    mk('juniper', farmsM.x + 20, farmsM.y - 18),
    mk('hennick', W.vaults[0].x + 30, W.vaults[0].y + 22),
  ];
}

/* positions of moving NPCs */
function npcPos(n, t) {
  if (n.mover === 'pell') { const rd = W.roads[0]; const s = ((pellProgress() * rd.len) % rd.len + rd.len) % rd.len; const [x, y, a] = roadPos(rd, s); return [x + Math.cos(a + Math.PI / 2) * 12, y + Math.sin(a + Math.PI / 2) * 12, a]; }
  if (n.mover === 'kip') { const rd = W.roads[n.road]; const s = ((t * n.v) % rd.len + rd.len) % rd.len; const [x, y, a] = roadPos(rd, s); return [x, y, a]; }
  return [n.x, n.y, 0];
}
function pellProgress() { const h = hourOfDay(); if (h >= 17.5 && h < 20.5) return (h - 17.5) / 3; return (h / 24) * 0.15 + 0.02 * Math.sin(h); }
function lampLit(l) { const h = hourOfDay(); if (h >= 20.5 || h < 6) return 1; if (h >= 17.5) return l.s / W.roads[0].len < pellProgress() ? 1 : 0; return 0; }

function walkerPos(w, t) {
  const rd = W.roads[w.road]; let s = w.s0 + w.v * t;
  if (rd.loop) s = ((s % rd.len) + rd.len) % rd.len; else { const T = 2 * rd.len; s = ((s % T) + T) % T; if (s > rd.len) s = T - s; }
  const [x, y, a, br] = roadPos(rd, s); const dir = w.v > 0 ? 0 : Math.PI;
  return [x + Math.cos(a + Math.PI / 2) * w.lane, y + Math.sin(a + Math.PI / 2) * w.lane, a + dir, br];
}

/* ---------- tiny painters (world units) ---------- */
function drawPerson(c, x, y, ang, cloak, skin, t, ph, opt) {
  const bob = Math.sin(t * 9 + ph) * 0.7; opt = opt || {};
  c.fillStyle = 'rgba(30,20,10,.25)'; c.beginPath(); c.ellipse(x + 1.5, y + 2, 3.6, 2.6, 0, 0, TAU); c.fill();
  c.save(); c.translate(x, y + bob * 0.3); c.rotate(ang);
  c.fillStyle = cloak; c.beginPath(); c.ellipse(0, 0, 3.4, 4.2, 0, 0, TAU); c.fill();
  c.fillStyle = skin; c.beginPath(); c.arc(0.8, 0, 2.1, 0, TAU); c.fill();
  if (opt.hat) { c.fillStyle = '#5a4528'; c.beginPath(); c.arc(0.8, 0, 2.3, -Math.PI / 2, Math.PI / 2); c.fill(); }
  c.restore();
  if (opt.lantern) { c.fillStyle = 'rgba(255,212,107,.9)'; c.beginPath(); c.arc(x + Math.cos(ang + 1.2) * 4.5, y + Math.sin(ang + 1.2) * 4.5, 1.2, 0, TAU); c.fill(); }
}
function drawPet(c, kind, x, y, ang, t, ph, sleeping) {
  c.save(); c.translate(x, y); c.rotate(ang);
  c.fillStyle = 'rgba(30,20,10,.22)'; c.beginPath(); c.ellipse(1, 1.5, 3.4, 2.4, 0, 0, TAU); c.fill();
  const wag = sleeping ? 0 : Math.sin(t * 12 + ph);
  switch (kind) {
    case 'pup': c.fillStyle = '#7a9a5a'; c.beginPath(); c.ellipse(0, 0, 3.4, 2.2, 0, 0, TAU); c.fill(); c.beginPath(); c.arc(3, 0, 1.8, 0, TAU); c.fill(); c.fillStyle = '#5a7a3a'; c.beginPath(); c.arc(3.2, -1.6, 0.9, 0, TAU); c.arc(3.2, 1.6, 0.9, 0, TAU); c.fill(); c.strokeStyle = '#7a9a5a'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(-3, 0); c.lineTo(-5, wag * 1.5); c.stroke(); break;
    case 'wisp': c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(230,240,255,.85)'; c.beginPath(); c.arc(0, Math.sin(t * 3 + ph) * 1.2, 2.4, 0, TAU); c.fill(); c.fillStyle = 'rgba(200,220,255,.25)'; c.beginPath(); c.arc(0, 0, 5, 0, TAU); c.fill(); break;
    case 'moth': { const f = sleeping ? 0.3 : Math.abs(Math.sin(t * 14 + ph)); c.fillStyle = '#e2a04a'; c.beginPath(); c.ellipse(0, -1.5 - f, 2.6, 1.6 * (0.4 + f), 0, 0, TAU); c.ellipse(0, 1.5 + f, 2.6, 1.6 * (0.4 + f), 0, 0, TAU); c.fill(); c.fillStyle = '#5a3a20'; c.fillRect(-2, -0.4, 4, 0.8); break; }
    case 'ferret': c.strokeStyle = '#8a6440'; c.lineCap = 'round'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(-4, wag); c.quadraticCurveTo(0, -wag, 3.5, 0); c.stroke(); c.fillStyle = '#5a3a20'; c.beginPath(); c.arc(4, 0, 1.2, 0, TAU); c.fill(); break;
    case 'tortoise': c.fillStyle = '#6a8a5a'; c.beginPath(); c.arc(0, 0, 3.2, 0, TAU); c.fill(); c.fillStyle = '#9ac27a'; c.beginPath(); c.arc(-0.5, -0.6, 1.6, 0, TAU); c.fill(); c.fillStyle = '#8a7a5a'; c.beginPath(); c.arc(3.6, 0, 1.1, 0, TAU); c.fill(); break;
    case 'kit': c.fillStyle = '#d8823a'; c.beginPath(); c.ellipse(0, 0, 3, 2, 0, 0, TAU); c.fill(); c.beginPath(); c.arc(2.8, 0, 1.6, 0, TAU); c.fill(); c.strokeStyle = '#d8823a'; c.lineWidth = 1; c.beginPath(); c.moveTo(-3, 0); c.quadraticCurveTo(-5, wag * 2, -6, wag * 2.5); c.stroke(); c.fillStyle = '#ffd46b'; c.beginPath(); c.arc(-6, wag * 2.5, 1, 0, TAU); c.fill(); break;
  }
  if (sleeping) { c.rotate(-ang); c.fillStyle = 'rgba(255,255,255,.85)'; c.font = '4px Georgia'; c.fillText('z', 3, -4 - (t * 2 + ph) % 3); }
  c.restore();
}
/* sky-fish: manta / koi / eel / small glowing school fish */
function drawSkyFish(c, kind, x, y, ang, size, t, ph, glow, alpha) {
  c.save(); c.globalAlpha = alpha; c.translate(x, y); c.rotate(ang);
  const und = Math.sin(t * 3 + ph);
  if (kind === 'manta') {
    const span = size * (0.9 + 0.15 * und);
    c.fillStyle = glow ? 'rgba(160,230,255,.8)' : '#3f4f6a';
    c.beginPath(); c.moveTo(size * 0.6, 0); c.quadraticCurveTo(0, -span, -size * 0.35, -span * 0.95 * (0.85 + 0.15 * und)); c.quadraticCurveTo(-size * 0.2, 0, -size * 0.35, span * 0.95 * (0.85 - 0.15 * und)); c.quadraticCurveTo(0, span, size * 0.6, 0); c.fill();
    c.strokeStyle = c.fillStyle; c.lineWidth = size * 0.04; c.beginPath(); c.moveTo(-size * 0.3, 0); c.quadraticCurveTo(-size * 0.8, und * size * 0.2, -size * 1.2, -und * size * 0.15); c.stroke();
    c.fillStyle = 'rgba(255,230,160,.6)'; c.beginPath(); c.arc(size * 0.2, -size * 0.25, size * 0.05, 0, TAU); c.arc(size * 0.2, size * 0.25, size * 0.05, 0, TAU); c.fill();
  } else if (kind === 'koi') {
    c.fillStyle = glow ? 'rgba(255,200,140,.85)' : '#e8915a';
    c.beginPath(); c.ellipse(0, 0, size * 0.5, size * 0.2, 0, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(-size * 0.42, 0); c.lineTo(-size * 0.8, -size * 0.25 + und * size * 0.1); c.lineTo(-size * 0.75, und * size * 0.05); c.lineTo(-size * 0.8, size * 0.25 + und * size * 0.1); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.ellipse(size * 0.1, -size * 0.05, size * 0.12, size * 0.08, 0, 0, TAU); c.fill();
    c.fillStyle = glow ? 'rgba(255,220,180,.6)' : 'rgba(255,240,220,.55)'; c.beginPath(); c.ellipse(0, -size * 0.28, size * 0.18, size * 0.1 * (1 + und * 0.4), 0.4, 0, TAU); c.ellipse(0, size * 0.28, size * 0.18, size * 0.1 * (1 - und * 0.4), -0.4, 0, TAU); c.fill();
  } else if (kind === 'eel') {
    c.strokeStyle = glow ? 'rgba(180,255,200,.85)' : '#4a6a5a'; c.lineCap = 'round'; c.lineWidth = size * 0.14;
    c.beginPath(); for (let i = 0; i <= 10; i++) { const u = i / 10, px = size * 0.6 - u * size * 1.6, py = Math.sin(t * 4 + ph - u * 5) * size * 0.16 * u; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke();
    c.fillStyle = '#ffe6a0'; c.beginPath(); c.arc(size * 0.5, 0, size * 0.04, 0, TAU); c.fill();
  } else { // tiny school fish
    c.fillStyle = 'rgba(170,255,230,.95)'; c.beginPath(); c.ellipse(0, 0, size * 0.55, size * 0.22, 0, 0, TAU); c.fill(); c.beginPath(); c.moveTo(-size * 0.45, 0); c.lineTo(-size * 0.85, -size * 0.25 * (1 + und * 0.3)); c.lineTo(-size * 0.85, size * 0.25 * (1 - und * 0.3)); c.closePath(); c.fill();
  }
  c.restore();
}

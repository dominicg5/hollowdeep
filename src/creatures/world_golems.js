/* ---------- (GD-32, Dominic t548u) the golems on the overworld map: Art's 60 placements (src/creatures/golem_spawns.js WORLD_GOLEMS), the playground's creature rows
   (src/creatures/data.js: stats, clips, srgb / rigid / glow / walk-slack fixes). iPhone first:
   - every golem is just a position until she is near; an ore's GLB is loaded once, lazily, the first time one of its golems is within LOAD_M, and built once as a
     template (Creatures.make, map encoding); each golem near her is a SkeletonUtils-style clone of it (Creatures.clone: shared geometry + materials, own skeleton / mixer)
   - built within SPAWN_M (the MAX_LIVE nearest), released past DESPAWN_M; mixers and AI run only within ANIM_M; farther ones are not touched at all
   - wander: legs inside its field's edge + WANDER_M, never onto ground steeper than MAX_SLOPE_DEG (or not walkable); passive until she hits it
   - the fight is the playground's loop, map-side: tap it -> she runs to striking range, squares up and swings every ATTACK_INTERVAL_S (CharView.swAttack), each swing
     rolls Combat.rollDamage once at its strike point; hit, it hunts her inside its leash and slams on its timer (Combat.creatureAttack -> Combat.fightHurt); at 0 HP it
     plays Death, sinks and respawns at its spot after respawnS; the kill gives Combat XP the same way (Combat.addXp(row.xp), save) ---------- */
const WorldGolems = (() => {
  const D = () => WORLD_GOLEMS, WS = () => Explore.WS, EXK = 1.18; // (CharView EXK: her body scale on the map - the golems stand at the same scale, so 2.6 m next to her as in the playground)
  const U = () => WS() * EXK; // one creature metre on the map
  const W = { n: 0, kills: 0, list: null, fields: {}, tpl: {}, loading: {}, err: {}, F: null, tgt: null, eng: false, swT: 0, strike: 0, ko: 0, rp: 0, nums: [], stats: { live: 0, animated: 0, ai: 0, far: 0, refused: 0, maxSlope: 0, steps: 0, out: 0 } };
  let seed = 4321; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  function init() { if (W.list) { liveR(); return W.list; } const T = D(); for (const f of T.FIELDS) W.fields[f[0]] = { id: f[0], ore: f[1], x: f[2], y: f[3], R: f[4] };
    W.list = T.SPAWNS.map(([id, fid, x, y, sl]) => { const f = W.fields[fid], kind = T.ORE_KIND[f.ore], C = Creatures.get(kind); return { id, fid, kind, C, sx: x, sy: y, x, y, face: rnd() * 6.283, spawnSlope: sl, wr: f.R + T.WANDER_M * WS(), hp: C ? C.hp : 1, dead: 0, sink: 0, hunt: false, inst: null, anim: null, once: 0, atkT: 0, bite: 0, wp: null, pause: rnd() * 3, d: 1e9 }; });
    liveR(); return W.list; }
  // (steering c) LIVE_R fields take the game's own runtime radius (re-read whenever Explore rebuilds its spots)
  function liveR() { const sp = typeof Explore !== 'undefined' && Explore.ORE && Explore.ORE.spots; if (!sp || sp === W.spRef || !W.list) return; W.spRef = sp; const T = D();
    for (const id of T.LIVE_R || []) { const f = W.fields[id], s = sp[id]; if (!f || !s) continue; f.R = s.R; f.live = true; for (const g of W.list) if (g.fid === id) g.wr = f.R + T.WANDER_M * WS(); } }
  // ground slope in degrees, Art's footprint_slope(): the gradient at his grid spacing (SLOPE_GRID_M) at the centre + 8 points on a FOOTPRINT_R_M ring, max, and the footprint's height span
  function slope1(x, y) { const e = WS() * D().SLOPE_GRID_M, h = M3.meshH, gx = (h(x + e, y) - h(x - e, y)) / (2 * e), gy = (h(x, y + e) - h(x, y - e)) / (2 * e); return Math.atan(Math.hypot(gx, gy)) * 180 / Math.PI; }
  function slopeDeg(x, y) { const r = WS() * D().FOOTPRINT_R_M; let mx = slope1(x, y), lo = M3.meshH(x, y), hi = lo;
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, qx = x + r * Math.cos(a), qy = y + r * Math.sin(a), hq = M3.meshH(qx, qy); mx = Math.max(mx, slope1(qx, qy)); lo = Math.min(lo, hq); hi = Math.max(hi, hq); }
    return Math.max(mx, Math.atan((hi - lo) / (2 * r)) * 180 / Math.PI); }
  function canStand(g, x, y) { if (Math.hypot(x - W.fields[g.fid].x, y - W.fields[g.fid].y) > g.wr) return false; if (slopeDeg(x, y) > D().MAX_SLOPE_DEG) return false; const c = Explore.clsAt(x, y); return c === 1; }
  function here() { return Explore.on ? Explore.here() : null; }
  // ---- templates (one per ore) and clones
  function tplFor(kind) { if (W.tpl[kind]) return W.tpl[kind]; if (!Creatures.ready(kind)) { if (!W.loading[kind]) { W.loading[kind] = true; Creatures.load(kind).catch((e) => { W.err[kind] = String(e); }); } return null; }
    const T = Creatures.make(kind, { screenEnc: true }); if (!T) return null; T.root.updateMatrixWorld(true); return (W.tpl[kind] = T); }
  function build(g) { const T = tplFor(g.kind); if (!T) return false; const I = Creatures.clone(T); I.root.scale.setScalar(U()); I.root.traverse((o) => { if (o.isMesh) { o.castShadow = !o.userData.isInk; o.receiveShadow = false; } });
    const dpr = Math.min((typeof QUALITY !== 'undefined' && QUALITY.dpr) || 2, window.devicePixelRatio || 1); for (const m of T.mats) if (m.userData.uniforms && m.userData.uniforms.uRes) m.userData.uniforms.uRes.value.set(innerWidth * dpr, innerHeight * dpr);
    g.inst = I; g.anim = null; loop(g, 'idle'); M3.scene.add(I.root); place(g); return true; }
  function release(g) { if (!g.inst) return; if (g.inst.root.parent) g.inst.root.parent.remove(g.inst.root); g.inst.mixer.stopAllAction(); g.inst = null; if (W.tgt === g) disengage(); }
  function place(g) { const I = g.inst; if (!I) return; let y = Explore.hAt(g.x, g.y); if (g.dead > 0 && g.sink > 0) y -= g.sink * g.C.height * U(); I.root.position.set(g.x, y, g.y); I.root.rotation.y = g.face; }
  function loop(g, k) { if (!g.inst || g.anim === k) return; g.inst.play(g.C.clips[k]); g.anim = k; }
  function once(g, k) { if (!g.inst) return; const a = g.inst.play(g.C.clips[k], true); g.anim = k; g.once = a ? a.getClip().duration : 0.6; }
  // ---- her fight on the map
  const me = () => W.F || (W.F = Combat.newFight(Combat.playerStats()));
  function rel(g) { const h = here(); if (!h) return null; const dx = g.x - h[0], dy = g.y - h[1], cd = Math.hypot(dx, dy) / U(); return { dx, dy, cd, d: cd - (g.C.bodyR || 0) }; } // d: metres from her to its body surface
  function engage(g) { if (!g || g.dead > 0 || W.ko > 0) return false; W.tgt = g; W.eng = true; W.rp = 0; hud(); return true; }
  function disengage() { W.eng = false; W.tgt = null; W.strike = 0; hud(); }
  function strike(g) { const q = rel(g); if (!q || g.dead > 0 || q.d > D().REACH_M + D().KEEP_REACH_M) return null; const C = g.C, r = Combat.rollDamage(Combat.playerStats(), { def: C.def, swing: ++W.n });
    g.hp = Math.max(0, g.hp - r.dmg); if ((r.hit || r.dmg > 0) && typeof Sfx !== 'undefined') Sfx.hit({ crit: !!r.heavy }); if (r.dmg > 0) Combat.fightDealt(me(), r.dmg); num(g, r.hit ? '-' + r.dmg : r.dmg ? '-' + r.dmg + ' graze' : 'Miss', r.hit ? (r.heavy ? 'crit' : '') : 'miss'); g.hunt = true;
    if (g.hp <= 0) { g.dead = C.respawnS || 6; g.sink = 0; g.hunt = false; g.bite = 0; g.once = 0; g.wp = null; if (g.inst) { g.inst.play(C.clips.death, true); g.anim = 'death'; } Combat.fightKill(me()); disengage(); W.kills++;
      if (C.xp > 0 && Combat.addXp) { Combat.addXp(C.xp); if (typeof save === 'function') save(); num(g, '+' + C.xp + ' Combat XP', 'info'); } }
    else if (r.dmg > 0) once(g, 'hit'); hud(); return r; }
  function bite(g) { const q = rel(g); if (!q || W.ko > 0 || g.dead > 0 || q.d > g.C.atkReach + 0.35) return null; const r = Combat.creatureAttack(g.C, Combat.playerStats()); if (r.parried) num(null, 'Parry', 'info'); else if (r.dmg > 0) { const o = Combat.fightHurt(me(), r.dmg); num(null, '-' + Math.round(r.dmg), 'ouch'); if (o.dead) ko(); } else num(null, 'Miss', 'miss'); hud(); return r; }
  function ko() { W.ko = D().KO_CALM_S; disengage(); for (const g of W.list) { g.hunt = false; g.wp = null; } if (typeof toast === 'function') toast('💫 Knocked out - the golems lose interest. Back on your feet in a moment.'); }
  // her side each frame: run to striking range (STAND_M off its surface), square up, one swing every ATTACK_INTERVAL_S, the roll at STRIKE_AT_S into it
  function herTick(dt) { const T = D(), g = W.tgt, G = CharView.st.gnd; if (W.strike > 0) { W.strike -= dt; if (W.strike <= 0) { W.strike = 0; if (g) strike(g); } } if (W.swT > 0) W.swT -= dt; if (!W.eng || !g || !G) return; if (g.dead > 0 || !g.inst) return disengage(); const q = rel(g); if (!q) return;
    if (q.d > T.REACH_M) { if ((W.rp -= dt) <= 0) { W.rp = T.REPATH_S; const so = (T.STAND_M + (g.C.bodyR || 0)) * U(), L = Math.max(1e-6, q.cd * U()); Explore.goTo(g.x - q.dx / L * so, g.y - q.dy / L * so); } return; }
    if (G.path || G.goal) { G.path = null; G.goal = null; } G.face = Math.atan2(q.dx, q.dy); /* (her local frame turns like the map's: x -> x, z -> y) */
    if (W.swT <= 0 && !W.strike && (G.mv || 0) < 0.15) { if (CharView.swAttack && CharView.swAttack()) { W.swT = T.ATTACK_INTERVAL_S; W.strike = T.STRIKE_AT_S; } else { W.swT = T.ATTACK_INTERVAL_S; num(null, 'No sword', 'info'); } } }
  // ---- one golem's AI (only near her): hunt inside its leash, else wander its field
  function step(g, tx, ty, sp) { const dx = tx - g.x, dy = ty - g.y, L = Math.hypot(dx, dy); if (L < 1e-6) return true; const s = Math.min(L, sp), nx = g.x + dx / L * s, ny = g.y + dy / L * s;
    if (!canStand(g, nx, ny)) { W.stats.refused++; return false; } g.x = nx; g.y = ny; g.face = Math.atan2(dx, dy); W.stats.steps++; const sl = slopeDeg(nx, ny); if (sl > W.stats.maxSlope) W.stats.maxSlope = sl; return true; }
  function ai(g, dt) { const T = D(), C = g.C;
    if (g.dead > 0) { g.dead -= dt; const t0 = (C.respawnS || 6) - g.dead; if (t0 > (C.deathHitAt || 1) + 0.8) g.sink = Math.min(1, (t0 - (C.deathHitAt || 1) - 0.8) / 1.2) * 0.6; if (g.dead <= 0) { g.dead = 0; g.sink = 0; g.hp = C.hp; g.x = g.sx; g.y = g.sy; g.anim = null; loop(g, 'idle'); } return; }
    if (g.once > 0) { g.once -= dt; if (g.bite > 0 && (g.bite -= dt) <= 0) { g.bite = 0; bite(g); } if (g.once > 0) return; g.anim = null; }
    const sp = (C.walkSpd || 0.45) * U() * dt; let walking = false;
    if (g.hunt && W.ko <= 0) { const q = rel(g); if (!q || q.d > (C.leashR || 5)) { g.hunt = false; } else { const slack = g.anim === 'walk' ? 0 : ((typeof PLAYGROUND_COMBAT !== 'undefined' && PLAYGROUND_COMBAT.MOB_START_SLACK_M) || 0);
        if (q.d > C.atkReach + slack) { const h = here(), so = (C.atkReach * 0.9 + (C.bodyR || 0)) * U(), L = q.cd * U(); walking = step(g, h[0] + q.dx / L * so, h[1] + q.dy / L * so, sp); }
        else { g.face = Math.atan2(-q.dx, -q.dy); if ((g.atkT -= dt) <= 0) { g.atkT = C.atkS; once(g, 'attack'); g.bite = C.atkHitAt; return; } } } }
    if (!g.hunt) { if (!g.wp) { if ((g.pause -= dt) <= 0) { const P = T.WALK_PAUSE_S, Lg = T.LEG_M; for (let k = 0; k < 8 && !g.wp; k++) { const a = rnd() * 6.283, l = (Lg[0] + rnd() * (Lg[1] - Lg[0])) * WS(), x = g.x + Math.cos(a) * l, y = g.y + Math.sin(a) * l; if (canStand(g, x, y)) g.wp = { x, y }; } g.pause = P[0] + rnd() * (P[1] - P[0]); } }
      if (g.wp) { if (Math.hypot(g.wp.x - g.x, g.wp.y - g.y) < WS() * 0.3) g.wp = null; else if (!step(g, g.wp.x, g.wp.y, sp)) g.wp = null; /* (refused: steeper than MAX_SLOPE_DEG or not walkable - it stops and picks another leg) */ else walking = true; } }
    loop(g, walking ? 'walk' : 'idle'); }
  // ---- per frame (Explore.tick): cheap distance pass over the 60, build / release, then mixers + AI for the near ones only
  function tick(dt) { if (!Explore.on || typeof M3 === 'undefined' || !M3.scene) return; const L = init(), h = here(); if (!h) return; const T = D(), u = WS(), st = W.stats; dt = Math.min(dt, 0.1);
    if (W.ko > 0 && (W.ko -= dt) <= 0) { W.ko = 0; W.F = Combat.newFight(Combat.playerStats()); }
    else if (W.F && !L.some((g) => g.hunt) && W.F.hp < W.F.max) W.F.hp = Math.min(W.F.max, W.F.hp + Combat.REGEN * W.F.max * dt); // (out of the fight: the 2% / s regen)
    for (const g of L) { g.d = Math.hypot(g.x - h[0], g.y - h[1]) / u; if (g.d < T.LOAD_M) tplFor(g.kind); }
    const near = L.filter((g) => g.d < T.SPAWN_M).sort((a, b) => a.d - b.d).slice(0, T.MAX_LIVE); let live = 0, animd = 0, aid = 0;
    for (const g of L) { if (g.inst && (g.d > T.DESPAWN_M || (!near.includes(g) && g.d > T.SPAWN_M))) release(g); if (!g.inst && near.includes(g)) build(g); if (!g.inst) continue; live++;
      if (g.d < T.ANIM_M) { ai(g, dt); aid++; place(g); g.inst.mixer.update(dt); animd++; } }
    st.live = live; st.animated = animd; st.ai = aid; st.far = L.length - live; herTick(dt); numsTick(dt); }
  // ---- tap: the nearest built golem under the tap (base-to-top segment on screen, as Explore's own pick), before anything else on the map
  function hit(sx, sy) { if (!W.list) return null; let best = null, bd = 1e9; for (const g of W.list) { if (!g.inst || g.dead > 0 || g.d > D().ANIM_M) continue; const a = M3.project(g.x, g.y, 0), b = M3.project(g.x, g.y, g.C.height * U()); if (a[0] < -999 || b[0] < -999) continue;
      const vx = b[0] - a[0], vy = b[1] - a[1], l2 = vx * vx + vy * vy || 1, t = Math.max(0, Math.min(1, ((sx - a[0]) * vx + (sy - a[1]) * vy) / l2)), d = Math.hypot(a[0] + vx * t - sx, a[1] + vy * t - sy), rad = Math.max(18, Math.sqrt(l2) * 0.3); if (d < rad && d / rad < bd) { bd = d / rad; best = g; } } return best; }
  // ---- HUD + floating numbers (DOM, over the map canvas)
  function hud() { let el = document.getElementById('golemHud'); const g = W.tgt; if (!g || !W.eng) { if (el) el.style.display = 'none'; return; } if (!el) { el = document.createElement('div'); el.id = 'golemHud'; el.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 56px);transform:translateX(-50%);z-index:60;background:rgba(20,18,14,.78);color:#f3ead8;font:600 13px system-ui,sans-serif;padding:6px 12px;border-radius:10px;pointer-events:none'; document.body.appendChild(el); }
    const F = me(); el.style.display = ''; el.textContent = `${g.C.icon || ''} ${g.C.name} HP ${g.hp} / ${g.C.hp} · DEF ${g.C.def}   You HP ${Math.round(F.hp)} / ${F.max}`; }
  function num(g, txt, cls) { const el = document.createElement('div'); el.className = 'golemNum ' + (cls || ''); el.textContent = txt; el.style.cssText = 'position:fixed;z-index:61;pointer-events:none;font:700 15px system-ui,sans-serif;text-shadow:0 1px 2px #000;color:' + (cls === 'miss' ? '#cfcfcf' : cls === 'info' ? '#bfe8ff' : cls === 'ouch' ? '#ff8a7a' : cls === 'crit' ? '#ffd25a' : '#fff');
    document.body.appendChild(el); W.nums.push({ el, g, t: 0, me: !g }); if (W.nums.length > 12) { const o = W.nums.shift(); o.el.remove(); } }
  function numsTick(dt) { const cv = M3.renderer && M3.renderer.domElement, r = cv ? cv.getBoundingClientRect() : { left: 0, top: 0 }, h = here();
    W.nums = W.nums.filter((n) => { n.t += dt; if (n.t > 1.2 || !h) { n.el.remove(); return false; } const x = n.g ? n.g.x : h[0], y = n.g ? n.g.y : h[1], up = (n.g ? n.g.C.height + 0.2 : 2.2) * U(), p = M3.project(x, y, up); n.el.style.left = (r.left + p[0] - 20) + 'px'; n.el.style.top = (r.top + p[1] - 30 * n.t) + 'px'; n.el.style.opacity = String(1 - Math.max(0, n.t - 0.7) / 0.5); return true; }); }
  function hideAll() { if (!W.list) return; for (const g of W.list) release(g); disengage(); for (const n of W.nums) n.el.remove(); W.nums = []; }
  if (typeof Explore !== 'undefined') { const t0 = Explore.tick, tp0 = Explore.tap, x0 = Explore.exit;
    Explore.tick = (dt) => { t0(dt); try { tick(dt); } catch (e) { console.error(e); } };
    Explore.tap = (sx, sy, ...r) => { if (Explore.on) { const g = hit(sx, sy); if (g) { engage(g); return 'golem'; } if (W.eng) disengage(); /* (tapping elsewhere walks her off: her attacks stop; a hunting golem keeps on inside its leash) */ } return tp0(sx, sy, ...r); };
    Explore.exit = (...a) => { const r = x0(...a); hideAll(); return r; }; }
  return { W, init, tick, slopeDeg, canStand, engage, disengage, strike, bite, hit, rel, tplFor, get list() { return init(); }, get stats() { return W.stats; } };
})();

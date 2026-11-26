/* ---------- (GD-32, Dominic t548u) the golems on the overworld map: Art's 600 placements (t718s2692: 20 per field) (src/creatures/golem_spawns.js WORLD_GOLEMS), the playground's creature rows
   (src/creatures/data.js: stats, clips, srgb / rigid / glow / walk-slack fixes). iPhone first:
   - every golem is just a position until she is near; an ore's GLB is loaded once, lazily, the first time one of its golems is within LOAD_M, and built once as a
     template (Creatures.make, map encoding); each golem near her is a SkeletonUtils-style clone of it (Creatures.clone: shared geometry + materials, own skeleton / mixer)
   - built within SPAWN_M (the MAX_LIVE nearest), released past DESPAWN_M; mixers and AI run only within ANIM_M; farther ones are not touched at all
   - (t718s2692) every other golem within FAR_M is a far stand-in: Art's LOD, one InstancedMesh per ore (one draw), loaded lazily per ore within LOD_LOAD_M, the same
     shading as the full golem; swapped in the frame the full one is built / released; hidden while dead (the respawn timer runs for every dead golem, near or far)
   - spawns: Art's plan, re-checked against the live ore nodes (NODE_CLEAR_M) / walkability / SPAWN_SLOPE_DEG and moved to the nearest good spot in its zone if needed
   - wander: legs inside its own zone (the Voronoi cell of its spawn among its field's golems, in its field's edge + WANDER_M), never onto ground steeper than MAX_SLOPE_DEG
     (or not walkable), never within NODE_CLEAR_M of a mineable rock; passive until she hits it
   - the fight is the playground's loop, map-side: tap it -> she runs to striking range, squares up and swings every ATTACK_INTERVAL_S (CharView.swAttack), each swing
     rolls Combat.rollDamage once at its strike point; hit, it hunts her inside its leash and slams on its timer (Combat.creatureAttack -> Combat.fightHurt); at 0 HP it
     plays Death, sinks and respawns at its spot after respawnS; the kill gives Combat XP the same way (Combat.addXp(row.xp), save) ---------- */
const WorldGolems = (() => {
  const D = () => WORLD_GOLEMS, WS = () => Explore.WS, EXK = 1.18; // (CharView EXK: her body scale on the map - the golems stand at the same scale, so 2.6 m next to her as in the playground)
  const U = () => WS() * EXK; // one creature metre on the map
  const W = { n: 0, kills: 0, list: null, fields: {}, tpl: {}, loading: {}, err: {}, F: null, tgt: null, eng: false, swT: 0, strike: 0, ko: 0, rp: 0, nums: [], stats: { live: 0, animated: 0, ai: 0, far: 0, refused: 0, maxSlope: 0, steps: 0, out: 0, farDraws: 0, farInst: 0, farTris: 0, nearTris: 0, dup: 0, dupMax: 0, drawsMax: 0, instMax: 0, pops: 0, swaps: 0, nudged: 0, nudgeSlope: 0, nudgeMaxM: 0, unfixed: 0, minNodeM: 0 }, lod: {}, byField: {} };
  let seed = 4321; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  function init() { if (W.list) { liveR(); return W.list; } const T = D(); for (const f of T.FIELDS) W.fields[f[0]] = { id: f[0], ore: f[1], x: f[2], y: f[3], R: f[4] };
    W.list = T.SPAWNS.map(([id, fid, x, y, sl]) => { const f = W.fields[fid], kind = T.ORE_KIND[f.ore], C = Creatures.get(kind); return { id, fid, kind, C, ax: x, ay: y, sx: x, sy: y, x, y, face: rnd() * 6.283, spawnSlope: sl, wr: f.R + T.WANDER_M * WS(), hp: C ? C.hp : 1, dead: 0, sink: 0, hunt: false, inst: null, anim: null, once: 0, atkT: 0, bite: 0, wp: null, pause: rnd() * 3, d: 1e9 }; });
    for (const g of W.list) (W.byField[g.fid] || (W.byField[g.fid] = [])).push(g);
    liveR(); return W.list; }
  // (steering c) LIVE_R fields take the game's own runtime radius (re-read whenever Explore rebuilds its spots)
  function liveR() { const sp = typeof Explore !== 'undefined' && Explore.ORE && Explore.ORE.spots; if (!sp || sp === W.spRef || !W.list) return; W.spRef = sp; const T = D();
    for (const id of T.LIVE_R || []) { const f = W.fields[id], s = sp[id]; if (!f || !s) continue; f.R = s.R; f.live = true; for (const g of W.list) if (g.fid === id) g.wr = f.R + T.WANDER_M * WS(); } }
  // ground slope in degrees, Art's footprint_slope(): the gradient at his grid spacing (SLOPE_GRID_M) at the centre + 8 points on a FOOTPRINT_R_M ring, max, and the footprint's height span
  // (t718s2692 slope check) the gradient is rise / run in map units on both axes: meshH is in map units and e = SLOPE_GRID_M x WS map units, so a 2.6 m step is
  // divided by its own 16.51-unit length (per metre, not per grid cell). hf: another height function (M3.heightAt's ground before the mesh) for the comparison only
  function slope1(x, y, hf) { const e = WS() * D().SLOPE_GRID_M, h = hf || M3.meshH, gx = (h(x + e, y) - h(x - e, y)) / (2 * e), gy = (h(x, y + e) - h(x, y - e)) / (2 * e); return Math.atan(Math.hypot(gx, gy)) * 180 / Math.PI; }
  function slopeDeg(x, y, hf) { const r = WS() * D().FOOTPRINT_R_M, h = hf || M3.meshH; let mx = slope1(x, y, h), lo = h(x, y), hi = lo;
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, qx = x + r * Math.cos(a), qy = y + r * Math.sin(a), hq = h(qx, qy); mx = Math.max(mx, slope1(qx, qy, h)); lo = Math.min(lo, hq); hi = Math.max(hi, hq); }
    return Math.max(mx, Math.atan((hi - lo) / (2 * r)) * 180 / Math.PI); }
  // ---- (t718s2692) the live ore nodes (Explore.ORE.nodes) in 16 m cells, rebuilt whenever Explore rebuilds / prunes them
  function nodeIdx() { const N = typeof Explore !== 'undefined' && Explore.ORE && Explore.ORE.nodes; if (!N || !N.length) return null; if (W.nd && W.nd.ref === N) return W.nd; const C = 16 * WS(), m = new Map();
    for (const n of N) { const k = Math.floor(n.x / C) + ',' + Math.floor(n.y / C); (m.get(k) || m.set(k, []).get(k)).push(n); } return (W.nd = { ref: N, C, m, n: N.length }); }
  function nodesNear(x, y, f) { const I = nodeIdx(); if (!I) return; const i = Math.floor(x / I.C), j = Math.floor(y / I.C); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const L = I.m.get((i + a) + ',' + (j + b)); if (L) for (const n of L) f(n); } }
  function nodeDist(x, y) { let d = Infinity; nodesNear(x, y, (n) => { const e = Math.hypot(n.x - x, n.y - y); if (e < d) d = e; }); return d; } // map units to the nearest node centre (Infinity past 16 m)
  function nodeOn(x, y, r) { let on = false; nodesNear(x, y, (n) => { if (Math.hypot(n.x - x, n.y - y) < n.s * D().HUNT_NODE_K + r) on = true; }); return on; }
  // its own wander zone: the closest field whose edge + WANDER_M covers the point is its field (ownField), and the closest of that field's spawns - as placed on the live
  // map (fixSpawns) - is its own: the Voronoi cell of its spawn
  function ownField(g, x, y) { let bf = null, bd = Infinity; for (const id in W.fields) { const f = W.fields[id], d = Math.hypot(x - f.x, y - f.y); if (d < bd && d <= f.R + D().WANDER_M * WS()) { bd = d; bf = f; } } return !!bf && bf.id === g.fid; }
  function inZone(g, x, y) { if (!ownField(g, x, y)) return false; let bg = null, bd = Infinity; for (const q of W.byField[g.fid]) { const d = Math.hypot(x - q.sx, y - q.sy); if (d < bd) { bd = d; bg = q; } } return bg === g; }
  // mode 0: a wander target (own zone, NODE_CLEAR_M from every rock); 1: a wander step (out of the zone is fine on the way back, and inside the clearance only if it does
  // not get closer to the rock: a golem left there by a hunt walks out); 2: hunting her (only off the rock itself)
  function canStand(g, x, y, mode) { const T = D(), f = W.fields[g.fid]; mode = mode || 0; if (Math.hypot(x - f.x, y - f.y) > g.wr) return false;
    if (mode === 2) { if (nodeOn(x, y, (g.C.bodyR || 0) * U())) return false; }
    else { const c = T.NODE_CLEAR_M * WS(), dn = nodeDist(x, y); if (dn < c && (mode === 0 || dn < nodeDist(g.x, g.y) - 1e-6)) return false; if (mode === 0 && !inZone(g, x, y)) return false; }
    if (slopeDeg(x, y) > T.MAX_SLOPE_DEG) return false; const c = Explore.clsAt(x, y); return c === 1; }
  // Art's spawns re-checked on the live map (once per node set): NODE_CLEAR_M from every node, walkable, footprint <= SPAWN_SLOPE_DEG, inside its own field's area and
  // SPAWN_GAP_M from its field's golems already placed - else the nearest spot that is: 1 m rings (16 bearings) to NUDGE_MAX_M, then FAR_STEP_M rings (32 bearings) out
  // to its field's edge + WANDER_M. (run30: Art's offline heightmap is far flatter than the live ground in places - 126 needed a move, 68 had nothing within 40 m.)
  // The wander zones are then the Voronoi cells of these placed spawns. A golem standing at its old spawn moves with it
  function fixSpawns() { const I = nodeIdx(); if (!I || W.fixRef === I || !W.list) return; W.fixRef = I; const T = D(), st = W.stats, c = T.NODE_CLEAR_M * WS(), gap = T.SPAWN_GAP_M * WS(); st.nudged = 0; st.nudgeSlope = 0; st.nudgeMaxM = 0; st.unfixed = 0;
    for (const fid in W.byField) { const done = [], f = W.fields[fid];
      const okAt = (g, x, y) => { if (Math.hypot(x - f.x, y - f.y) > g.wr || nodeDist(x, y) < c || !ownField(g, x, y) || Explore.clsAt(x, y) !== 1) return false; for (const q of done) if (Math.hypot(x - q[0], y - q[1]) < gap) return false; return slopeDeg(x, y) <= T.SPAWN_SLOPE_DEG; };
      for (const g of W.byField[fid]) { const at = !g.inst && g.x === g.sx && g.y === g.sy; let p = [g.ax, g.ay];
        if (!okAt(g, g.ax, g.ay)) { const slope = nodeDist(g.ax, g.ay) >= c && Explore.clsAt(g.ax, g.ay) === 1; let got = null; const rMax = g.wr / WS() + Math.hypot(g.ax - f.x, g.ay - f.y) / WS();
          for (let r = 1; r <= rMax && !got; r += r < T.NUDGE_MAX_M ? 1 : T.FAR_STEP_M) { const nb = r < T.NUDGE_MAX_M ? 16 : 32; for (let k = 0; k < nb && !got; k++) { const a = k * 2 * Math.PI / nb, x = g.ax + Math.cos(a) * r * WS(), y = g.ay + Math.sin(a) * r * WS(); if (okAt(g, x, y)) got = [x, y, r]; } }
          if (got) { p = got; st.nudged++; if (slope) st.nudgeSlope++; st.nudgeMaxM = Math.max(st.nudgeMaxM, got[2]); g.nudged = got[2]; g.unfixed = false; } else { st.unfixed++; g.unfixed = true; } }
        done.push(p); g.sx = p[0]; g.sy = p[1]; if (at) { g.x = p[0]; g.y = p[1]; } } }
    let mn = Infinity; for (const g of W.list) mn = Math.min(mn, nodeDist(g.sx, g.sy)); st.minNodeM = +(mn / WS()).toFixed(2); }
  function here() { return Explore.on ? Explore.here() : null; }
  // ---- templates (one per ore) and clones
  function tplFor(kind) { if (W.tpl[kind]) return W.tpl[kind]; if (!Creatures.ready(kind)) { if (!W.loading[kind]) { W.loading[kind] = true; Creatures.load(kind).catch((e) => { W.err[kind] = String(e); }); } return null; }
    const T = Creatures.make(kind, { screenEnc: true }); if (!T) return null; T.root.updateMatrixWorld(true); T.tris = 0; T.root.traverse((o) => { if (o.isMesh) T.tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; }); /* (ink hulls included: they draw too) */ return (W.tpl[kind] = T); }
  // ---- (t718s2692) far stand-ins: per ore, Art's LOD GLB (registered as an extra Creatures row: the golem's own row + the LOD model, no clips) built once into one
  // InstancedMesh of FAR_MAX. Its material is the full golem's stone chalk toon (Creatures.make: glow bound from _HD_GLOW, map encoding = no srgbOut / tone mapping), with
  // the Lumenite look per vertex (hdLum: Art's first lumVerts vertices) - the crystal shade / rim / lift / emissive from his extras, crystalGain baked into their paint
  function lodBind(m, ud) { const prev = m.onBeforeCompile, key = m.customProgramCacheKey, U = { uLShade: { value: new THREE.Color(ud.hd_shade ?? 0x2c6a74) }, uLRim: { value: new THREE.Color(ud.hd_rim ?? 0xeafff8) }, uLRimAmt: { value: 0.7 + (ud.hd_gloss ?? 0) * 0.6 }, uLEmis: { value: ud.hd_emis ?? 0.3 }, uLLift: { value: 0.05 }, uLGrain: { value: 0.1 } };
    m.onBeforeCompile = (sh, r) => { if (prev) prev.call(m, sh, r); Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float hdLum; varying float vHdLum;').replace('#include <begin_vertex>', '#include <begin_vertex>\n  vHdLum = hdLum;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vHdLum; uniform vec3 uLShade, uLRim; uniform float uLRimAmt, uLEmis, uLLift, uLGrain;')
        .replace('(hdGrain-0.5)*uGrain', '(hdGrain-0.5)*mix(uGrain,uLGrain,vHdLum)').replace('return mix(uShade, vec3(1.0), t);', 'return mix(mix(uShade,uLShade,vHdLum), vec3(1.0), t);')
        .replace('reflectedLight.directDiffuse += uRim * smoothstep(0.35,0.6,fr) * uRimAmt * diffuseColor.rgb;', 'reflectedLight.directDiffuse += mix(uRim,uLRim,vHdLum) * smoothstep(0.35,0.6,fr) * mix(uRimAmt,uLRimAmt,vHdLum) * diffuseColor.rgb;')
        .replace('reflectedLight.indirectDiffuse += diffuseColor.rgb * uLift;', 'reflectedLight.indirectDiffuse += diffuseColor.rgb * mix(uLift,uLLift,vHdLum);')
        .replace('totalEmissiveRadiance += diffuseColor.rgb * uEmis;', 'totalEmissiveRadiance += diffuseColor.rgb * mix(uEmis,uLEmis,vHdLum);'); };
    m.customProgramCacheKey = () => (key ? key.call(m) : '') + '|lodLum'; m.userData.lodLum = U; return m; }
  function lodFor(kind) { const L = W.lod[kind] || (W.lod[kind] = { kind, st: 0, im: null, list: [], tris: 0 }); if (L.st === 2 || L.st < 0) return L; const T = D(), cfg = T.LOD && T.LOD[kind], id = kind + '_lod';
    if (!cfg || !Creatures.get(kind)) { L.st = -1; return L; }
    if (L.st === 0) { Creatures.def(id, Object.assign({}, Creatures.get(kind), { model: cfg.model, clips: {}, rigid: null })); L.st = 1; Creatures.load(id).catch((e) => { L.st = -1; W.err[id] = String(e); }); return L; }
    if (!Creatures.ready(id)) return L; const C = Creatures.get(kind), I = Creatures.make(id, { screenEnc: true }); if (!I) { L.st = -1; return L; } I.root.updateMatrixWorld(true);
    let body = null; I.root.traverse((o) => { if (o.isMesh && !o.userData.isInk && !body) body = o; }); if (!body) { L.st = -1; return L; }
    const geo = body.geometry, n = geo.attributes.position.count, nl = Math.min(cfg.lumVerts || 0, n), lum = new Float32Array(n); lum.fill(1, 0, nl); geo.setAttribute('hdLum', new THREE.BufferAttribute(lum, 1));
    const cg = C.crystalGain, ca = geo.attributes.color; if (cg && ca) { const a = ca.array, k = ca.itemSize, q = ca.normalized ? (a instanceof Uint16Array ? 65535 : a instanceof Uint8Array ? 255 : 1) : 1, f = new Float32Array(a.length); /* (float paint: a gain past 1.0 is not clipped, as the full golem's material colour x paint) */
      for (let i = 0; i < a.length; i++) f[i] = a[i] / q; for (let i = 0; i < nl; i++) for (let c = 0; c < 3; c++) f[i * k + c] *= cg[c]; geo.setAttribute('color', new THREE.BufferAttribute(f, k)); }
    const gm = ((Creatures.gl(id) || {}).materials || [])[0] || {}, mat = lodBind(body.material, gm.extras || {}); mat.userData.lod = { lumVerts: nl, crystalGain: cg || null };
    const im = new THREE.InstancedMesh(geo, mat, T.FAR_MAX); im.count = 0; im.visible = false; im.frustumCulled = false; /* (r149: instances are not culled per instance; the whole set is one draw) */ im.castShadow = !!T.FAR_SHADOW; im.receiveShadow = false; im.name = kind + 'FarLOD';
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); Object.assign(L, { st: 2, im, base: body.matrixWorld.clone(), tris: (geo.index ? geo.index.count : n) / 3, verts: n }); return L; }
  const _m = typeof THREE !== 'undefined' ? new THREE.Matrix4() : null, _q = _m && new THREE.Quaternion(), _v = _m && new THREE.Vector3(), _s = _m && new THREE.Vector3(), _up = _m && new THREE.Vector3(0, 1, 0);
  // every frame after build / release: each ore's stand-ins = its golems within FAR_M that are not built and not dead (the nearest FAR_MAX); never a built one (dup = 0)
  function farTick(L) { const T = D(), st = W.stats; for (const k in W.lod) W.lod[k].list.length = 0;
    for (const g of L) { g.far = false; if (g.inst || g.dead > 0 || g.d >= T.FAR_M) continue; const Lk = W.lod[g.kind]; if (Lk && Lk.st === 2) Lk.list.push(g); }
    let draws = 0, inst = 0, tris = 0, dup = 0, nt = 0;
    for (const k in W.lod) { const Lk = W.lod[k]; if (Lk.st !== 2) continue; const im = Lk.im, A = Lk.list; if (im.parent !== M3.scene) M3.scene.add(im); if (A.length > T.FAR_MAX) { A.sort((a, b) => a.d - b.d); A.length = T.FAR_MAX; }
      for (let i = 0; i < A.length; i++) { const g = A[i]; if (g.fx !== g.x || g.fy !== g.y) { g.fx = g.x; g.fy = g.y; g.fh = Explore.hAt(g.x, g.y); }
        _m.compose(_v.set(g.x, g.fh, g.y), _q.setFromAxisAngle(_up, g.face), _s.setScalar(U())).multiply(Lk.base); im.setMatrixAt(i, _m); g.far = true; }
      im.count = A.length; im.visible = A.length > 0; im.instanceMatrix.needsUpdate = true; if (A.length) { draws++; inst += A.length; tris += A.length * Lk.tris; } }
    // swap check: a golem alive in the swap band whose ore's stand-in is ready is drawn exactly once - full or far - every frame (pops: it vanished / appeared at the swap)
    for (const g of L) { const sh = g.inst ? 1 : g.far ? 2 : 0; if (g.inst && g.far) dup++; if (g.inst) nt += (W.tpl[g.kind] && W.tpl[g.kind].tris) || 0; const Lk = W.lod[g.kind];
      const rd = !!(Lk && Lk.st === 2); if (g.shown !== undefined && sh !== g.shown && g.dead <= 0 && !g.wasDead && rd && g.lodWas && g.d < T.DESPAWN_M + 10) { if (!sh || !g.shown) st.pops++; else st.swaps++; }
      g.shown = sh; g.wasDead = g.dead > 0; g.lodWas = rd; }
    Object.assign(st, { farDraws: draws, farInst: inst, farTris: tris, nearTris: nt, dup, dupMax: Math.max(st.dupMax, dup), drawsMax: Math.max(st.drawsMax, draws), instMax: Math.max(st.instMax, inst) }); }
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
  function engage(g) { if (!g || g.dead > 0 || W.ko > 0) return false; W.tgt = g; W.eng = true; W.rp = 0; W.inR = false; W.aim = null; W.fought = false; if (g.wp) g.wp = null; return true; }
  function disengage() { W.eng = false; W.tgt = null; W.strike = 0; W.inR = false; W.aim = null; W.fought = false; }
  function strike(g) { const q = rel(g); if (!q || g.dead > 0 || q.d > D().REACH_M + D().KEEP_REACH_M) return null; const C = g.C, r = Combat.rollDamage(Combat.playerStats(), { def: C.def, swing: ++W.n });
    g.hp = Math.max(0, g.hp - r.dmg); if ((r.hit || r.dmg > 0) && typeof Sfx !== 'undefined') Sfx.hit({ crit: !!r.heavy }); if (r.dmg > 0) Combat.fightDealt(me(), r.dmg); num(g, r.hit ? '-' + r.dmg : r.dmg ? '-' + r.dmg + ' graze' : 'Miss', r.hit ? (r.heavy ? 'crit' : '') : 'miss'); g.hunt = true;
    if (g.hp <= 0) { g.dead = C.respawnS || 6; g.sink = 0; g.hunt = false; g.bite = 0; g.once = 0; g.wp = null; if (g.inst) { g.inst.play(C.clips.death, true); g.anim = 'death'; } Combat.fightKill(me()); disengage(); W.kills++; if (typeof CoinDrops !== 'undefined') { CoinDrops.host('map', { parent: M3.scene, m: U(), y: (x, z) => Explore.hAt(x, z) }); const cd = CoinDrops.kill('map', C, g.x, g.y); num(g, cd.bag ? '+' + cd.n + ' gold' : cd.n + ' gold on the ground (backpack full)', 'info'); } /* (t566s2525: coins from every kill) */
      if (C.xp > 0 && Combat.addXp) { Combat.addXp(C.xp); if (typeof save === 'function') save(); num(g, '+' + C.xp + ' Combat XP', 'info'); } }
    else if (r.dmg > 0) once(g, 'hit'); return r; }
  function bite(g) { const q = rel(g); if (!q || W.ko > 0 || g.dead > 0 || q.d > g.C.atkReach + 0.35) return null; const r = Combat.creatureAttack(g.C, Combat.playerStats()); if (r.parried) num(null, 'Parry', 'info'); else if (r.dmg > 0) { const o = Combat.fightHurt(me(), r.dmg); num(null, '-' + Math.round(r.dmg), 'ouch'); if (o.dead) ko(); } else num(null, 'Miss', 'miss'); return r; }
  function ko() { W.ko = D().KO_CALM_S; disengage(); for (const g of W.list) { g.hunt = false; g.wp = null; } if (typeof toast === 'function') toast('💫 Knocked out - the golems lose interest. Back on your feet in a moment.'); }
  // her side each frame: run to striking range (STAND_M off its surface), square up, one swing every ATTACK_INTERVAL_S, the roll at STRIKE_AT_S into it
  function herTick(dt) { const T = D(), g = W.tgt, G = CharView.st.gnd; if (W.strike > 0) { W.strike -= dt; if (W.strike <= 0) { W.strike = 0; if (g) strike(g); } } if (W.swT > 0) W.swT -= dt; if (!W.eng || !g || !G) return; if (g.dead > 0 || !g.inst) return disengage(); const q = rel(g); if (!q) return;
    // (t719u) hysteresis: chasing, she stops at STAND_M + STOP_SLACK_M; stopped (or mid-strike), she only sets off again past REACH_M + CHASE_SLACK_M
    W.rp -= dt; if (!W.strike && q.d > (W.inR ? T.REACH_M + T.CHASE_SLACK_M : T.STAND_M + T.STOP_SLACK_M)) { W.inR = false; chase(g, q, G); return; }
    if (!W.inR) { W.inR = true; W.aim = null; if (G.path || G.goal) { G.path = null; G.goal = null; } W.stats.holds = (W.stats.holds || 0) + 1; }
    const fa = Math.atan2(q.dx, q.dy), df = Math.atan2(Math.sin(fa - G.face), Math.cos(fa - G.face)); G.face += df * (1 - Math.exp(-dt * T.TURN_K)); /* (her local frame turns like the map's: x -> x, z -> y; her facing is set here only) */
    if (W.swT <= 0 && !W.strike && (G.mv || 0) < 0.15 && Math.abs(df) < 0.45) { if (CharView.swAttack && CharView.swAttack()) { W.swT = T.ATTACK_INTERVAL_S; W.strike = T.STRIKE_AT_S; W.fought = true; /* (the fight is on: the bars show) */ } else { W.swT = T.ATTACK_INTERVAL_S; num(null, 'No sword', 'info'); } } }
  // (t719u) aim her run at its stand-off spot: re-aimed at most every REPATH_S and only once that spot has moved REPATH_M; a short straight run when the ground
  // between is open (the nav grid's 2.5 m cell centres put a waypoint beside / behind her on every re-plan - the back-and-forth Dominic saw)
  function chase(g, q, G) { const T = D(), so = (T.STAND_M + (g.C.bodyR || 0)) * U(), L = Math.max(1e-6, q.cd * U()), tx = g.x - q.dx / L * so, ty = g.y - q.dy / L * so, A = W.aim;
    if (A && G.goal && (W.rp > 0 || Math.hypot(A.x - tx, A.y - ty) < T.REPATH_M * WS())) return; if (A && !G.goal && W.rp > 0) return;
    W.rp = T.REPATH_S; W.aim = { x: tx, y: ty }; W.stats.aims = (W.stats.aims || 0) + 1; const P = Explore.goTo(tx, ty); if (!P || P.snapped || !G.goal) return;
    const h = here(), dl = Math.hypot(tx - h[0], ty - h[1]); if (dl > T.DIRECT_M * WS()) return; const n = Math.ceil(dl / WS()); for (let i = 1; i < n; i++) { const t = i / n; if (Explore.clsAt(h[0] + (tx - h[0]) * t, h[1] + (ty - h[1]) * t) !== 1) return; }
    G.path = [{ x: G.goal.x, z: G.goal.z }]; G.pi = 0; W.stats.direct = (W.stats.direct || 0) + 1; }
  // ---- one golem's AI (only near her): hunt inside its leash, else wander its field
  function step(g, tx, ty, sp, mode) { const dx = tx - g.x, dy = ty - g.y, L = Math.hypot(dx, dy); if (L < 1e-6) return true; const s = Math.min(L, sp), nx = g.x + dx / L * s, ny = g.y + dy / L * s;
    if (!canStand(g, nx, ny, mode || 1)) { W.stats.refused++; return false; } g.x = nx; g.y = ny; g.face = Math.atan2(dx, dy); W.stats.steps++; const sl = slopeDeg(nx, ny); if (sl > W.stats.maxSlope) W.stats.maxSlope = sl; return true; }
  function respawn(g) { g.dead = 0; g.sink = 0; g.hp = g.C.hp; g.x = g.sx; g.y = g.sy; g.hunt = false; g.wp = null; g.anim = null; g.settled = false; loop(g, 'idle'); }
  // (t718s2692) a built golem past ANIM_M: eased into Idle for SETTLE_S, then held on Idle's first key (= the bind pose = Art's LOD pose) until she comes back
  function settle(g, dt) { const I = g.inst; loop(g, 'idle'); g.setT = (g.setT || 0) + dt; I.mixer.update(dt); if (g.setT < D().SETTLE_S) return; const a = I.mixer.existingAction(I.clips[g.C.clips.idle]); if (a) a.time = 0; I.mixer.update(0); g.settled = true; g.setT = 0; }
  function ai(g, dt) { const T = D(), C = g.C;
    if (g.dead > 0) { g.dead -= dt; const t0 = (C.respawnS || 6) - g.dead; if (t0 > (C.deathHitAt || 1) + 0.8) g.sink = Math.min(1, (t0 - (C.deathHitAt || 1) - 0.8) / 1.2) * 0.6; if (g.dead <= 0) respawn(g); return; }
    if (g.once > 0) { g.once -= dt; if (g.bite > 0 && (g.bite -= dt) <= 0) { g.bite = 0; bite(g); } if (g.once > 0) return; g.anim = null; }
    const sp = (C.walkSpd || 0.45) * U() * dt; let walking = false;
    if (g.hunt && W.ko <= 0) { const q = rel(g); if (!q || q.d > (C.leashR || 5)) { g.hunt = false; } else { const slack = g.anim === 'walk' ? 0 : ((typeof PLAYGROUND_COMBAT !== 'undefined' && PLAYGROUND_COMBAT.MOB_START_SLACK_M) || 0);
        if (q.d > C.atkReach + slack) { const h = here(), so = (C.atkReach * 0.9 + (C.bodyR || 0)) * U(), L = q.cd * U(); walking = step(g, h[0] + q.dx / L * so, h[1] + q.dy / L * so, sp, 2); }
        else { g.face = Math.atan2(-q.dx, -q.dy); if ((g.atkT -= dt) <= 0) { g.atkT = C.atkS; once(g, 'attack'); g.bite = C.atkHitAt; return; } } } }
    if (!g.hunt && W.eng && W.tgt === g) { g.wp = null; const q = rel(g); if (q) { const fa = Math.atan2(-q.dx, -q.dy), df = Math.atan2(Math.sin(fa - g.face), Math.cos(fa - g.face)); g.face += df * (1 - Math.exp(-dt * T.MOB_TURN_K)); } } /* (t719u) targeted: it holds still and turns to face her - its wander no longer drags her run about */
    else if (!g.hunt) { if (!g.wp) { if ((g.pause -= dt) <= 0) { const P = T.WALK_PAUSE_S, Lg = T.LEG_M; for (let k = 0; k < 8 && !g.wp; k++) { const a = rnd() * 6.283, l = (Lg[0] + rnd() * (Lg[1] - Lg[0])) * WS(), x = g.x + Math.cos(a) * l, y = g.y + Math.sin(a) * l; if (canStand(g, x, y, 0)) g.wp = { x, y }; } g.pause = P[0] + rnd() * (P[1] - P[0]); } }
      if (g.wp) { if (Math.hypot(g.wp.x - g.x, g.wp.y - g.y) < WS() * 0.3) g.wp = null; else if (!step(g, g.wp.x, g.wp.y, sp)) g.wp = null; /* (refused: steeper than MAX_SLOPE_DEG or not walkable - it stops and picks another leg) */ else walking = true; } }
    loop(g, walking ? 'walk' : 'idle'); }
  // ---- per frame (Explore.tick): cheap distance pass over the 600, build / release, mixers + AI for the near ones only, then the far stand-ins
  function tick(dt) { if (!Explore.on || typeof M3 === 'undefined' || !M3.scene) return; const L = init(), h = here(); if (!h) return; const T = D(), u = WS(), st = W.stats; dt = Math.min(dt, 0.1);
    if (W.ko > 0 && (W.ko -= dt) <= 0) { W.ko = 0; W.F = Combat.newFight(Combat.playerStats()); }
    else if (W.F && !L.some((g) => g.hunt) && W.F.hp < W.F.max) W.F.hp = Math.min(W.F.max, W.F.hp + Combat.REGEN * W.F.max * dt); // (out of the fight: the 2% / s regen)
    fixSpawns(); for (const g of L) { g.d = Math.hypot(g.x - h[0], g.y - h[1]) / u; if (g.d < T.LOAD_M) tplFor(g.kind); if (g.d < T.LOD_LOAD_M) lodFor(g.kind); }
    // (t718s2692) the full ones: the MAX_LIVE nearest of (built and within DESPAWN_M) + (within SPAWN_M), a built one ranked KEEP_BIAS_M nearer (no swap churn between two
    // at the same distance); every other built one is released - at most MAX_LIVE ever (with 20 per field, the old 'release only past SPAWN_M' let 11 stay built)
    const near = L.filter((g) => g.d < (g.inst ? T.DESPAWN_M : T.SPAWN_M)).sort((a, b) => (a.d - (a.inst ? T.KEEP_BIAS_M : 0)) - (b.d - (b.inst ? T.KEEP_BIAS_M : 0))).slice(0, T.MAX_LIVE); let live = 0, animd = 0, aid = 0;
    for (const g of L) if (g.inst && !near.includes(g)) release(g);
    for (const g of L) { if (!g.inst && near.includes(g)) build(g); if (!g.inst) continue; live++;
      if (g.d < T.ANIM_M) { g.settled = false; ai(g, dt); aid++; place(g); g.inst.mixer.update(dt); animd++; } else if (!g.settled && g.dead <= 0) settle(g, dt); }
    for (const g of L) if (g.dead > 0 && !(g.inst && g.d < T.ANIM_M)) { g.dead -= dt; if (g.dead <= 0) { respawn(g); place(g); } } /* (a dead golem out of AI range still respawns on time: its stand-in comes back) */
    farTick(L); st.live = live; st.animated = animd; st.ai = aid; st.far = L.length - live; herTick(dt); numsTick(dt); bars(dt); if (typeof CoinDrops !== 'undefined') { const got = CoinDrops.tick('map', dt, h[0], h[1]); if (got) num(null, '+' + got + ' gold', 'info'); } }
  // ---- tap: the nearest built golem under the tap (base-to-top segment on screen, as Explore's own pick), before anything else on the map
  function hit(sx, sy) { if (!W.list) return null; let best = null, bd = 1e9; for (const g of W.list) { if (!g.inst || g.dead > 0 || g.d > D().ANIM_M) continue; const a = M3.project(g.x, g.y, 0), b = M3.project(g.x, g.y, g.C.height * U()); if (a[0] < -999 || b[0] < -999) continue;
      const vx = b[0] - a[0], vy = b[1] - a[1], l2 = vx * vx + vy * vy || 1, t = Math.max(0, Math.min(1, ((sx - a[0]) * vx + (sy - a[1]) * vy) / l2)), d = Math.hypot(a[0] + vx * t - sx, a[1] + vy * t - sy), rad = Math.max(18, Math.sqrt(l2) * 0.3); if (d < rad && d / rad < bd) { bd = d / rad; best = g; } } return best; }
  // ---- HUD + floating numbers (DOM, over the map canvas)
  // (t720u / t722u) no info box over the map any more: the fight shows on overhead health bars (src/creatures/healthbars.js, HEALTH_BARS) - hers and every
  // golem in the fight - only while a fight is on (a golem hunting her, or her target once she has swung at it), gone HEALTH_BARS.FADE_AFTER_S after it ends
  function bars(dt) { if (typeof HealthBars === 'undefined' || !M3.camera) return; const R = typeof M3.renderer === 'function' ? M3.renderer() : M3.renderer, rig = CharView.rig, F = me(), items = [];
    if (rig) items.push({ key: 'me', me: true, name: 'You', level: Combat.playerStats().level, dist: 0, hp: F.hp, max: F.max, shield: F.shield, root: rig.root, head: rig.B && rig.B.head });
    for (const g of W.list || []) if (g.inst) { if (g.inst.hbHead === undefined) g.inst.hbHead = HealthBars.headOf(g.inst.root); items.push({ key: g.id, name: g.C.name, level: g.C.level, dist: g.d, hp: g.hp, max: g.C.hp, root: g.inst.root, head: g.inst.hbHead, fighting: W.ko <= 0 && g.dead <= 0 && (g.hunt || (W.eng && W.tgt === g && W.fought)) }); }
    HealthBars.frame('map', { myLevel: Combat.playerStats().level, host: document.body, canvas: R && R.domElement, cam: M3.camera, m: U(), dt, items }); }
  function num(g, txt, cls) { const el = document.createElement('div'); el.className = 'golemNum ' + (cls || ''); el.textContent = txt; el.style.cssText = 'position:fixed;z-index:61;pointer-events:none;font:700 15px system-ui,sans-serif;text-shadow:0 1px 2px #000;color:' + (cls === 'miss' ? '#cfcfcf' : cls === 'info' ? '#bfe8ff' : cls === 'ouch' ? '#ff8a7a' : cls === 'crit' ? '#ffd25a' : '#fff');
    document.body.appendChild(el); W.nums.push({ el, g, t: 0, me: !g }); if (W.nums.length > 12) { const o = W.nums.shift(); o.el.remove(); } }
  function numsTick(dt) { const cv = M3.renderer && M3.renderer.domElement, r = cv ? cv.getBoundingClientRect() : { left: 0, top: 0 }, h = here();
    W.nums = W.nums.filter((n) => { n.t += dt; if (n.t > 1.2 || !h) { n.el.remove(); return false; } const x = n.g ? n.g.x : h[0], y = n.g ? n.g.y : h[1], up = (n.g ? n.g.C.height + 0.2 : 2.2) * U(), p = M3.project(x, y, up); n.el.style.left = (r.left + p[0] - 20) + 'px'; n.el.style.top = (r.top + p[1] - 30 * n.t) + 'px'; n.el.style.opacity = String(1 - Math.max(0, n.t - 0.7) / 0.5); return true; }); }
  function hideAll() { if (typeof HealthBars !== 'undefined') HealthBars.clear('map'); if (typeof CoinDrops !== 'undefined') CoinDrops.clear('map'); for (const k in W.lod) { const im = W.lod[k].im; if (im) { im.count = 0; im.visible = false; } } if (!W.list) return; for (const g of W.list) { release(g); g.far = false; g.shown = undefined; } disengage(); for (const n of W.nums) n.el.remove(); W.nums = []; }
  if (typeof Explore !== 'undefined') { const t0 = Explore.tick, tp0 = Explore.tap, x0 = Explore.exit;
    Explore.tick = (dt) => { t0(dt); try { tick(dt); } catch (e) { console.error(e); } };
    Explore.tap = (sx, sy, ...r) => { if (Explore.on) { const g = hit(sx, sy); if (g) { engage(g); return 'golem'; } if (W.eng) disengage(); /* (tapping elsewhere walks her off: her attacks stop; a hunting golem keeps on inside its leash) */ } return tp0(sx, sy, ...r); };
    Explore.exit = (...a) => { const r = x0(...a); hideAll(); return r; }; }
  return { W, init, tick, slopeDeg, canStand, nodeDist, inZone, fixSpawns, lodFor, engage, disengage, strike, bite, hit, rel, tplFor, get list() { return init(); }, get stats() { return W.stats; } };
})();

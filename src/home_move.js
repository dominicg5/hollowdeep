// ---- Mosby moves her real home (no copy): on Confirm the house is lifted onto the transport tortoise (its plot stands empty, its door and ports with it);
// when he arrives the house itself is set down on the spot she picked (S.homeAt, saved - it stays there on every reload). If the ground there is not dead
// level the house sits on the high side on its own small packed-earth apron (a plinth filling down to the lowest ground under it). Everything that hangs
// off the home follows it: door + ports + interior entry (the door spot), the Tether Orb's teleport targets, the tether start points and their routes.
const HomeMove = (() => {
  const ST = { apron: null };
  const WSf = () => Explore.WS;
  function playerSolid() { return M3.solids ? M3.solids().find((q) => q.player) : null; }
  // the house's footprint radius (its model's bounding box, the player's larger house)
  function footR() { const P = playerSolid(); if (P) return Math.hypot(Math.max(-P.b[0], P.b[1]), Math.max(-P.b[2], P.b[3])) * P.w; const H = W.player; return typeof homeW === 'function' ? homeW(H) * 0.6 : 60; }
  function loopD(x, y) { if (typeof Mosby === 'undefined' || !Mosby.GLOOP) return 1e9; const L = Mosby.GLOOP; let m = 1e9; for (let i = 0; i < L.length; i++) { const a = L[i], b = L[(i + 1) % L.length], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l2)); m = Math.min(m, Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t)); } return m; }
  function ground(x, y, R) { let lo = 1e9, hi = -1e9; for (let a = 0; a < 12; a++) for (const f of [0.45, 1]) { const g = M3.meshH(x + Math.cos(a * 0.5236) * R * f, y + Math.sin(a * 0.5236) * R * f); lo = Math.min(lo, g); hi = Math.max(hi, g); } const c = M3.meshH(x, y); return { lo: Math.min(lo, c), hi: Math.max(hi, c) }; }
  // can a house be set down here? flat ground (every footprint sample under 15 deg, not mining ground or the forge's volcanic / scorched zone; houseGround), flat enough (<= 2.5 m of apron), dry, solid ground clear of crevices, other houses, the town, ore fields, the Lumen Tree,
  // and the giant's own loop (his feet), and somewhere she can walk
  function check(x, y) { const WS = WSf(), R = footR() + WS * 2, why = (t) => ({ ok: false, why: t });
    { const G = typeof houseGround === 'function' ? houseGround(x, y, R) : { ok: true }; if (!G.ok) return why(G.why === 'slope' ? 'flat' : G.why); } // t569u: flat ground first, so its reason is never masked
    if (Math.hypot(x, y) > CITY.R - 1600 || (typeof hollowDist === 'function' && hollowDist(x, y) < 150)) return why('edge');
    if (loopD(x, y) < WS * 50 + R) return why('giant');
    for (const h of M3.solids()) { if (h.player) continue; const r = Math.hypot(Math.max(-h.b[0], h.b[1]), Math.max(-h.b[2], h.b[3])) * h.w; if (Math.hypot(h.x - x, h.y - y) < R + r + WS * 3) return why('house'); }
    if ((typeof underHeartwood === 'function' && underHeartwood(x, y)) || (typeof nearHeartwood === 'function' && nearHeartwood(x, y))) return why('tree');
    if (typeof chasmDist === 'function' && chasmDist(x, y) < R + 8) return why('chasm');
    if ((typeof isWet === 'function' && isWet(x, y, R + WS * 4)) || (typeof GRAND !== 'undefined' && GRAND.wet && GRAND.wet(x, y, R + WS * 4))) return why('water');
    for (let a = 0; a < 12; a++) for (const f of [0, 0.5, 1]) { const px = x + Math.cos(a * 0.5236) * R * f, py = y + Math.sin(a * 0.5236) * R * f; if (typeof MosbyTalk !== 'undefined' && MosbyTalk.crackW(px, py) > 0) return why('crevice'); if (!Explore.clsAt(px, py) && !(W.player && Math.hypot(px - W.player.x, py - W.player.y) < R + WS * 2)) return why('ground'); }
    const g = ground(x, y, R); if (g.hi - g.lo > WS * 2.5) return why('slope');
    if (typeof Town !== 'undefined' && Town.hit && Town.hit(x, y, R + WS * 4)) return why('town');
    for (const s of (Explore.ORE && Explore.ORE.spots) || []) if (Math.hypot(s.x - x, s.y - y) < (s.r || WS * 20) + R) return why('ore');
    if (typeof GRAND !== 'undefined' && GRAND.door && Math.hypot(GRAND.door.x - x, GRAND.door.y - y) < WS * 160) return why('tree');
    return { ok: true, elev: g.hi, lo: g.lo, R }; }
  const WHY = { flat: 'needs flat ground \u2014 too steep or ridged', mine: 'needs flat ground \u2014 this is mining ground', scorch: 'needs flat ground \u2014 volcanic, scorched earth', edge: 'too near the edge of things', tree: 'too close to the Lumen Tree', chasm: 'too near the drop', water: 'too wet for a house', crevice: 'cracked ground \u2014 it would split', ground: 'no ground to stand it on', slope: 'too steep for a house', house: 'too close to a neighbour', town: 'inside the town', ore: 'on an ore field', giant: 'right on the big fellow\u2019s walk' };
  // the trees, bushes and rocks standing on the new plot are cleared (the old plot keeps its bare clearing)
  function clearPlot(x, y, R) { const keep = (o) => Math.hypot(o.x - x, o.y - y) > R + 10 || o.type === 'home' || o.isPlayer; if (W.objs) { const drop = W.objs.filter((o) => !keep(o)); if (drop.length) { W.objs = W.objs.filter(keep); W.birchXT = null; if (W.buckets) for (const L of W.buckets.values()) for (let i = L.length - 1; i >= 0; i--) if (drop.includes(L[i])) L.splice(i, 1); } }
    if (W.birchXT && W.birchXT.list) W.birchXT.list = W.birchXT.list.filter(keep); }
  // the apron: a low packed-earth plinth under the footprint, its top at the house's sill line, its skirt down past the lowest ground
  function apron() { if (ST.apron) { ST.apron.parent && ST.apron.parent.remove(ST.apron); ST.apron.geometry.dispose(); ST.apron = null; } const P = W.player, HS = S.homeAt; if (!P || P.away || !HS || HS.elev == null) return null;
    const sol = playerSolid(); if (!sol) return null; const WS = WSf(), lo = HS.lo != null ? HS.lo : HS.elev, hgt = HS.elev - lo + WS * 0.8, sx = (sol.b[1] - sol.b[0]) * sol.w * 1.1, sz = (sol.b[3] - sol.b[2]) * sol.w * 1.1;
    const geo = new THREE.BoxGeometry(sx, hgt, sz), m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x7c6446 })); const cx = (sol.b[0] + sol.b[1]) / 2 * sol.w, cz = (sol.b[2] + sol.b[3]) / 2 * sol.w;
    m.position.set(P.x + cx * sol.cs + cz * sol.sn, HS.elev - hgt / 2 + WS * 0.05, P.y - cx * sol.sn + cz * sol.cs); m.rotation.y = Math.atan2(sol.sn, sol.cs); m.name = 'homeApron'; m.receiveShadow = true; M3.scene.add(m); return (ST.apron = m); }
  function refreshAll() { if (typeof relocatePlayer === 'function') relocatePlayer(true); if (M3.refresh) M3.refresh(); if (typeof CityMap !== 'undefined' && CityMap.minimapBase) try { CityMap.minimapBase(); } catch (e) {} if (Explore.homeMoved) Explore.homeMoved(); apron(); }
  // Confirm: the house goes up onto his back (the plot empties, the door and its ports go with it)
  function depart() { if (W.player) W.player.away = true; refreshAll(); return true; }
  // arrival: the house itself is set down where she picked; saved
  function arrive(T) { if (!T || !T.home) return false; const c = T.home; S.homeAt = { x: c.x, y: c.y, elev: c.elev, lo: c.lo, t: Date.now() }; delete S.homeDeleted; clearPlot(c.x, c.y, (c.R || footR()) + WSf() * 2); if (W.player) W.player.away = false; refreshAll(); if (typeof MosbyTalk !== 'undefined' && MosbyTalk.step === 'sent') MosbyTalk.close(); try { save(); } catch (e) {} return true; }
  /* on load: the apron goes back under a moved house once the models are in */
  { const iv = setInterval(() => { if (typeof M3 === 'undefined' || M3.models !== 'ready' || !M3.scene) return; clearInterval(iv); if (typeof S !== 'undefined' && S && S.homeAt) apron(); }, 1000); }
  return { check, WHY, footR, loopD, depart, arrive, apron, clearPlot, refreshAll, get apronMesh() { return ST.apron; } };
})();

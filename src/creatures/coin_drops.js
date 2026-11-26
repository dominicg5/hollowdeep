/* (Dominic, Art's card t566s2525) gold coins from every monster kill: a whole random number in [MIN_K x L, MAX_K x L] (L = the creature row's combat level,
   the one its nameplate shows), straight into the backpack (Craft item COIN_DROPS.ITEM, one slot, no stacking limit); with the backpack full they drop on the
   ground at the kill spot for GROUND_S, and she picks them up by walking over them once there is room. Every number is in COIN_DROPS (src/creatures/data.js).
   Used by the Attack Playground (char3d.js) and the overworld golems (world_golems.js):
     CoinDrops.host(scope, { parent, m, y(x, z) })   where a scope's ground drops live (parent-local x / z, m = units per metre, y = ground height)
     CoinDrops.kill(scope, C, x, z) -> { n, bag, ground }   a kill of creature row C at x / z
     CoinDrops.tick(scope, dt, hx, hz)               her position: pick-ups and expiry
     CoinDrops.clear(scope), CoinDrops.state(scope), CoinDrops.roll(L), CoinDrops.icon(n) */
const CoinDrops = (() => {
  const D = () => COIN_DROPS, S = {}, tex = {};
  function roll(L, rnd) { const T = D(), l = Math.max(1, Math.round(L || 1)), a = T.MIN_K * l, b = T.MAX_K * l; return a + Math.floor((rnd || Math.random)() * (b - a + 1)); }
  function icon(n) { const T = D(); return (n || 1) >= T.PILE_AT ? T.ICON.pile : (n || 1) >= T.STACK_AT ? T.ICON.stack : T.ICON.one; }
  function sc(id) { return S[id] || (S[id] = { host: null, drops: [], log: [] }); }
  function host(id, h) { const s = sc(id); if (s.host && h && s.host.parent !== h.parent) for (const d of s.drops) if (d.obj && d.obj.parent) d.obj.parent.remove(d.obj); s.host = h; }
  function give(n) { const T = D(); if (typeof Craft === 'undefined' || Craft.room('bag', T.ITEM) < n) return false; return Craft.add('bag', T.ITEM, n) >= n; }
  function sprite(s, d) { const H = s.host; if (!H || !H.parent || typeof THREE === 'undefined') return; const T = D(), u = icon(d.n); let t = tex[u]; if (!t) { t = tex[u] = new THREE.TextureLoader().load(u); if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace; else t.encoding = THREE.sRGBEncoding; }
    const o = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })), k = T.SPRITE_M * (H.m || 1); o.scale.set(k, k, 1); o.position.set(d.x, (H.y ? H.y(d.x, d.z) : 0) + k * 0.5, d.z); o.name = 'coinDrop'; o.renderOrder = 5; H.parent.add(o); d.obj = o; }
  function drop(o) { if (o.obj) { if (o.obj.parent) o.obj.parent.remove(o.obj); o.obj.material.dispose(); o.obj = null; } }
  function kill(id, C, x, z) { const s = sc(id), n = roll(C && C.level); const bag = give(n), r = { n, bag, ground: !bag, level: (C && C.level) || 1, at: +(Date.now() / 1000).toFixed(1) };
    if (!bag) { const d = { n, x, z, t: D().GROUND_S }; s.drops.push(d); sprite(s, d); } else if (typeof save === 'function') save();
    s.log.push(r); if (s.log.length > 20) s.log.shift(); return r; }
  function tick(id, dt, hx, hz) { const s = S[id]; if (!s || !s.drops.length) return null; const T = D(), m = (s.host && s.host.m) || 1; let got = 0;
    s.drops = s.drops.filter((d) => { if ((d.t -= dt) <= 0) { drop(d); return false; } if (hx != null && Math.hypot(d.x - hx, d.z - hz) <= T.PICK_R_M * m && give(d.n)) { got += d.n; drop(d); return false; } if (!d.obj) sprite(s, d); return true; });
    if (got && typeof save === 'function') save(); return got || null; }
  function clear(id) { const s = S[id]; if (!s) return; for (const d of s.drops) drop(d); s.drops = []; s.host = null; }
  function state(id) { const s = S[id]; return s ? { drops: s.drops.map((d) => ({ n: d.n, x: +d.x.toFixed(2), z: +d.z.toFixed(2), t: +d.t.toFixed(1), shown: !!(d.obj && d.obj.parent) })), log: s.log.slice() } : { drops: [], log: [] }; }
  return { roll, icon, host, kill, tick, clear, state };
})();

/* ===== NpcModels: Art's i23d bodies for the big NPCs (NPC_MODELS in src/creatures/data.js: Mosby the giant, Theus) (Dominic t580u).
   Each row is registered with Creatures.def (not a combat creature) and built with Creatures.make like the overworld golems (chalk toon + ink, _HD_GLOW glow,
   drawn by the map renderer: screenEnc). The old rig keeps running underneath, unseen, so placement, colliders, ride, veins and the forge loop are unchanged.
     NpcModels.make(id)        -> its instance (Creatures.make) once the GLB has loaded, else null (the load starts on the first call)
     NpcModels.play(I, key, o) -> one clip of the row's clips (idle / walk / talk / strike) at a time; o.once for a one-shot, o.restart to start it over
     NpcModels.state(id)       -> { loading, ready, err, inst } for tests ===== */
const NpcModels = (() => {
  const S = {};
  function st(id) { if (S[id]) return S[id]; const R = typeof NPC_MODELS !== 'undefined' && NPC_MODELS[id]; const o = S[id] = { id, R, inst: null, err: null, loading: false };
    if (!R || typeof Creatures === 'undefined') { o.err = 'no model row ' + id; return o; }
    Creatures.def(id, R); o.loading = true; Creatures.load(id).then(() => { o.loading = false; }).catch((e) => { o.loading = false; o.err = String(e); }); return o; }
  function make(id) { const o = st(id); if (o.inst || o.err || !Creatures.ready(id)) return o.inst; const I = Creatures.make(id, { screenEnc: true }); if (!I) return null;
    I.root.traverse((n) => { n.userData.hdGlb = true; if (n.isMesh) { n.castShadow = true; n.receiveShadow = false; } }); I.key = null; o.inst = I; return I; }
  function play(I, key, opt) { if (!I) return null; const O = opt || {}, nm = I.def.clips && I.def.clips[key]; if (!nm) return null; if (I.key === key && !O.restart) return null; I.key = key; I.act = I.play(nm, !!O.once); return I.act; }
  return { make, play, state: (id) => { const o = S[id]; return o ? { loading: o.loading, ready: !!o.inst, err: o.err, inst: o.inst } : null; } };
})();

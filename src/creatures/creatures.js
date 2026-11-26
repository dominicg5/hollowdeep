/* ===== Creatures: loading, building and animating any CREATURE_DATA entry (src/creatures/data.js) (t661).
   Public API (the Attack Playground in char3d.js uses only this):
     Creatures.get(id)        -> its data row (stats, model, clips, look)
     Creatures.load(id)       -> Promise: fetches + parses its GLB once (cached)
     Creatures.make(id)       -> one instance { id, def, root (Group, feet at y 0, facing +z), model, mixer, clips, names, play(name, once), mats } or null until loaded
     Creatures.ready(id) / Creatures.error(id)
   A minimal GLB reader covers what the Quaternius creature files hold: nodes, one skin, one mesh of several primitives, LINEAR rotation / translation /
   scale clips, tightly packed buffers. (GD-30) Also Art's golems: several skinned mesh nodes, STEP keys, normalized COLOR_0 vertex paint, and a row with
   shade: 'hdToon' gets Art's chalk toon + ink outline (src/creatures/hd_toon.js) from each GLB material's extras (hd_shade / hd_rim / hd_ink / hd_emis / hd_gloss). ===== */
const Creatures = (() => {
  const CT = { 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }, NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  const ST = {}; // id -> { gl, bin, p, err }
  const get = (id) => CREATURE_DATA[id] || null, st = (id) => ST[id] || (ST[id] = { gl: null, bin: null, p: null, err: null });
  function acc(S, i) { const g = S.gl, a = g.accessors[i], bv = g.bufferViews[a.bufferView], T = CT[a.componentType], n = NC[a.type], off = S.bin.byteOffset + (bv.byteOffset || 0) + (a.byteOffset || 0);
    return { arr: new T(S.bin.buffer.slice(off, off + a.count * n * T.BYTES_PER_ELEMENT)), n, norm: !!a.normalized }; }
  function load(id) { const D = get(id); if (!D) return Promise.reject(new Error('no creature ' + id)); const S = st(id); if (S.p) return S.p;
    S.p = fetch(D.model).then((r) => { if (!r.ok) throw new Error(id + ' ' + r.status); return r.arrayBuffer(); }).then((ab) => { const dv = new DataView(ab); let o = 12;
      while (o < ab.byteLength) { const len = dv.getUint32(o, true), type = dv.getUint32(o + 4, true); if (type === 0x4e4f534a) S.gl = JSON.parse(new TextDecoder().decode(new Uint8Array(ab, o + 8, len))); else if (type === 0x004e4942) S.bin = new Uint8Array(ab, o + 8, len); o += 8 + len; }
      if (!S.gl || !S.bin) throw new Error(id + ': bad glb'); S.err = null; return true; }).catch((e) => { S.err = String(e); S.p = null; throw e; }); return S.p; }
  // (GD-30) Art's look, the same settings as his viewer (creature_pipeline/scripts/viewer.html) minus the stone atlas (not shipped with the GLB): vertex paint carries the colour
  function hdMat(D, gm, A, gc, O) { const nm = gm.name || '', ud = gm.extras || {}, T = HDToon, lum = /Lumenite/.test(nm), glow = hasGlow(D, A, gc);
    const m = lum ? T.makeChalkMaterial({ flat: true, grain: 0.1, tooth: 0.06, emissive: ud.hd_emis ?? 0.3, facet: 0.55, shade: ud.hd_shade ?? 0x2c6a74, rim: ud.hd_rim ?? 0xeafff8, rimAmt: 0.7 + (ud.hd_gloss ?? 0) * 0.6, lift: 0.05 })
      : T.makeChalkMaterial(Object.assign({ grain: 0.55, tooth: 0.26, stroke: 0.75, scale: 7 }));
    /* (t705u / t542) crackGlow: Art's per-ore glow on the crystals, crack veins and eyes = the golem's hd_glow colour (its Stone material extras) x the _HD_GLOW vertex
       value (0..1) x 1.6, added to the emissive. Art's shader only does this with his stone atlas on (not shipped), so it is bound here on its own (glowBind); Coal's colour is black = none */
    if (glow) glowBind(m, gc, D.glowGain ?? 1.6);
    const bc = (gm.pbrMetallicRoughness && gm.pbrMetallicRoughness.baseColorFactor) || [1, 1, 1]; m.color.setRGB(bc[0], bc[1], bc[2]); /* (glTF: vertex paint x baseColorFactor; Art's t539 files use 1) */
    if (lum && D.crystalGain) m.color.multiply(new THREE.Color().setRGB(...D.crystalGain)); /* (t539: Art's per-variant crystal lift, from the data row) */
    m.side = gm.doubleSided ? THREE.DoubleSide : THREE.FrontSide; m.name = D.id + ':' + (lum ? 'crystal' : 'stone'); m.userData.ink = lum ? { width: 1.4, color: ud.hd_ink ?? 0x123a3c, worldWidth: 0.012 } : { width: 2.8 }; if (D.srgbOut && !(O && O.screenEnc)) srgbOut(m); if (O && O.screenEnc) m.toneMapped = false; return m; }
  // (GD-30 t704u: 'way too dark') Art's viewer renders with outputEncoding = sRGB; the game renders linear. The golems' vertex paint is linear (glTF COLOR_0), so on our
  // linear output it showed as raw linear values (~3x too dark in the mid-tones). Their materials encode their own output to sRGB, exactly as his viewer's final step does.
  function hasGlow(D, A, gc) { return !!(D.crackGlow && A && A._HD_GLOW != null && gc && Math.max(gc[0], gc[1], gc[2]) > 0); }
  function glowBind(m, gc, k) { const prev = m.onBeforeCompile, key = m.customProgramCacheKey, U = { uHdGlowC: { value: new THREE.Vector3(gc[0], gc[1], gc[2]) }, uHdGlowK: { value: k } };
    m.onBeforeCompile = (sh, r) => { if (prev) prev.call(m, sh, r); Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float hdGlow; varying float vHdGlow;').replace('#include <begin_vertex>', '#include <begin_vertex>\n  vHdGlow = hdGlow;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vHdGlow; uniform vec3 uHdGlowC; uniform float uHdGlowK;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += uHdGlowC * vHdGlow * uHdGlowK;'); };
    m.customProgramCacheKey = () => (key ? key.call(m) : '') + '|hdGlow'; m.userData.hdGlow = U; return m; }
  function srgbOut(m) { const prev = m.onBeforeCompile, key = m.customProgramCacheKey; m.onBeforeCompile = (sh, r) => { if (prev) prev.call(m, sh, r); sh.fragmentShader = sh.fragmentShader.replace('#include <encodings_fragment>', '#include <encodings_fragment>\n  gl_FragColor = LinearTosRGB(gl_FragColor);'); };
    m.customProgramCacheKey = () => (key ? key.call(m) : '') + '|srgbOut'; m.userData.srgbOut = true; return m; }
  function mat(D, name) { const L = (D.look || []).find((r) => r.test.test(name)) || { part: 'body', color: 0xcccccc }, m = new THREE.MeshLambertMaterial({ color: L.color });
    if (L.emissive != null) { m.emissive.setHex(L.emissive); m.emissiveIntensity = L.glow == null ? 1 : L.glow; } m.name = D.id + ':' + L.part; return m; }
  // (GD-32) opt.screenEnc: drawn by a renderer that already encodes sRGB (the 3D map: sRGB + ACES) - no srgbOut of its own, and no tone mapping (Art's viewer has none)
  function make(id, opt) { const O = opt || {}, D = get(id), S = ST[id]; if (!D || !S || !S.gl) return null; const g = S.gl, J = (g.skins && g.skins[0] && g.skins[0].joints) || [];
    const nodes = g.nodes.map((n, i) => { const o = J.includes(i) ? new THREE.Bone() : new THREE.Object3D(); o.name = n.name || 'n' + i;
      if (n.translation) o.position.fromArray(n.translation); if (n.rotation) o.quaternion.fromArray(n.rotation); if (n.scale) o.scale.fromArray(n.scale); return o; });
    g.nodes.forEach((n, i) => (n.children || []).forEach((c) => nodes[i].add(nodes[c])));
    const model = new THREE.Group(); model.name = D.id + 'Model'; for (const i of g.scenes[g.scene || 0].nodes) model.add(nodes[i]); model.updateMatrixWorld(true);
    let skel = null; if (g.skins && g.skins[0]) { const sk = g.skins[0], ibm = acc(S, sk.inverseBindMatrices).arr, bones = sk.joints.map((j) => nodes[j]); skel = new THREE.Skeleton(bones, bones.map((_, k) => new THREE.Matrix4().fromArray(ibm, k * 16))); }
    const mats = [], gc = ((g.materials || []).find((q) => q.extras && q.extras.hd_glow) || { extras: {} }).extras.hd_glow; /* (t542: the golem's glow colour, on its Stone material) */
    g.nodes.forEach((n, i) => { if (n.mesh == null) return; for (const p of g.meshes[n.mesh].primitives) { const geo = new THREE.BufferGeometry(), A = p.attributes, put = (k, nm) => { if (A[k] == null) return; const a = acc(S, A[k]); geo.setAttribute(nm, new THREE.BufferAttribute(a.arr, a.n, a.norm)); };
        put('POSITION', 'position'); put('NORMAL', 'normal'); put('JOINTS_0', 'skinIndex'); put('WEIGHTS_0', 'skinWeight'); if (D.shade === 'hdToon') { put('COLOR_0', 'color'); if (hasGlow(D, A, gc)) put('_HD_GLOW', 'hdGlow'); } /* (the golems' painted swatches + Art's _HD_GLOW per-vertex glow, t542) */ if (p.indices != null) geo.setIndex(new THREE.BufferAttribute(acc(S, p.indices).arr, 1));
        const m = D.shade === 'hdToon' && typeof HDToon !== 'undefined' ? hdMat(D, g.materials[p.material], A, gc, O) : mat(D, g.materials[p.material].name), sm = skel ? new THREE.SkinnedMesh(geo, m) : new THREE.Mesh(geo, m); sm.name = m.name; sm.castShadow = true; sm.frustumCulled = false; nodes[i].add(sm); mats.push(m); } });
    // (GD-12: the invisible mushroom) glTF skinning ignores the skinned mesh node's own transform - the joints' world matrices x inverse bind matrices already place
    // every vertex. FBX2glTF puts the 100x / -90 deg X export transform on BOTH the armature and the mesh node, so binding with the mesh's matrixWorld applied it twice:
    // a ~60 m mesh around the camera (only shards of it on screen). Identity bind matrix; 'attached' mode cancels the mesh node transform (bindMatrixInverse = its inverse).
    model.updateMatrixWorld(true); if (skel) { model.traverse((o) => { if (o.isSkinnedMesh) o.bind(skel, new THREE.Matrix4()); }); model.updateMatrixWorld(true); }
    if (D.shade === 'hdToon' && typeof HDToon !== 'undefined') { const body = []; model.traverse((o) => { if (o.isMesh && o.material.userData.ink) body.push(o); }); const dpr = (typeof devicePixelRatio !== 'undefined' && devicePixelRatio) || 1;
      for (const o of body) { const ol = HDToon.addInkOutline(o, o.material.userData.ink); if (D.srgbOut && !O.screenEnc) srgbOut(ol.material); if (O.screenEnc) ol.material.toneMapped = false; ol.userData.uniformsRes = true; ol.material.userData.uniforms.uRes.value.set((typeof innerWidth !== 'undefined' ? innerWidth : 1080) * dpr, (typeof innerHeight !== 'undefined' ? innerHeight : 1080) * dpr); mats.push(ol.material); } }
    // (GD-30 t704u) D.rigid: bones held at their rest pose (riding their parent) in the listed clips - the golems' head, jaw and crystal shards swung 20-70 deg in Walk / Attack
    const RB = (D.rigid && D.rigid.bones) || [], RC = (D.rigid && D.rigid.clips) || []; let stripped = 0;
    const clips = {}; for (const an of g.animations || []) { const tracks = [], kk = an.name.replace(/^.*\|/, ''), rig0 = RC.includes(kk); for (const ch of an.channels) { const s = an.samplers[ch.sampler], nm = nodes[ch.target.node].name; if (rig0 && RB.includes(nm)) { stripped++; continue; } const t = acc(S, s.input).arr, v = acc(S, s.output).arr;
        const ip = s.interpolation === 'STEP' ? THREE.InterpolateDiscrete : undefined; /* (GD-30: the golem clips hold some keys) */
        if (ch.target.path === 'rotation') tracks.push(new THREE.QuaternionKeyframeTrack(nm + '.quaternion', t, v, ip)); else if (ch.target.path === 'translation') tracks.push(new THREE.VectorKeyframeTrack(nm + '.position', t, v, ip)); else if (ch.target.path === 'scale') tracks.push(new THREE.VectorKeyframeTrack(nm + '.scale', t, v, ip)); }
      const k = an.name.replace(/^.*\|/, ''); clips[k] = new THREE.AnimationClip(k, -1, tracks); }
    // feet on the ground, D.height tall (measured in the bind pose)
    const bb = new THREE.Box3(), pv = new THREE.Vector3(); model.traverse((o) => { if (!o.isMesh || o.userData.isInk) return; const P = o.geometry.attributes.position;
      if (o.isSkinnedMesh) { for (let i = 0; i < P.count; i++) { pv.fromBufferAttribute(P, i); o.boneTransform(i, pv); bb.expandByPoint(pv.applyMatrix4(o.matrixWorld)); } } /* (where the skin really draws it, bones applied) */
      else { o.geometry.computeBoundingBox(); bb.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)); } });
    const h = Math.max(1e-4, bb.max.y - bb.min.y), k = (D.height || 1) / h; model.scale.setScalar(k); model.position.set(-(bb.min.x + bb.max.x) / 2 * k, -bb.min.y * k, -(bb.min.z + bb.max.z) / 2 * k); /* (centred on its root, feet on the ground) */
    const root = new THREE.Group(); root.name = D.id; root.add(model);
    const rest = {}; if (skel) for (const b of skel.bones) rest[b.name] = b.quaternion.clone(); /* (bind / rest pose, before any clip runs) */
    return player({ id, def: D, root, model, clips, mats, names: Object.keys(clips), stripped, rest, bones: skel ? skel.bones : [] }); }
  // its mixer + play(): (GD-30 t706u: the golem's feet 'split as if a double animation') one clip at a time: every other running action fades out (not only the last one),
  // and a loop that is still fading out is taken back from where it is instead of being reset to frame 0 under the other clip (walk / idle flicker restarted Walk every switch)
  function player(I) { const mixer = new THREE.AnimationMixer(I.model), clips = I.clips, acts = new Set(); let starts = 0;
    const play = (name, once) => { const c = clips[name]; if (!c) return null; const a = mixer.clipAction(c); acts.add(a); for (const o of acts) if (o !== a && o.enabled && o.getEffectiveWeight() > 0) o.fadeOut(0.12); /* (a finished clamped one-shot counts too) */
      const live = !once && a.isRunning() && a.getEffectiveWeight() > 0.01; if (live) { a.stopFading(); a.setEffectiveWeight(1); } else { a.reset(); a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity); a.clampWhenFinished = !!once; a.fadeIn(0.12).play(); starts++; } return a; };
    Object.assign(I, { mixer, play }); Object.defineProperty(I, 'running', { get: () => [...acts].filter((o) => o.isRunning() && o.getEffectiveWeight() > 0.01).map((o) => o.getClip().name) }); Object.defineProperty(I, 'starts', { get: () => starts });
    play((I.def.clips && I.def.clips.idle) || 'Idle'); return I; }
  // (GD-32) another instance of a built one: three's SkeletonUtils.clone (examples/jsm/utils/SkeletonUtils.js, r149 - not in our three.min.js), the same geometry and
  // materials (one GPU copy per ore however many golems), its own bones, skeleton and mixer; the clips are shared
  function clone(T) { const src = T.model, cp = src.clone(), sL = new Map(), cL = new Map(), walk = (a, b) => { sL.set(b, a); cL.set(a, b); for (let i = 0; i < a.children.length; i++) walk(a.children[i], b.children[i]); }; walk(src, cp);
    cp.traverse((n) => { if (!n.isSkinnedMesh) return; const sm = sL.get(n), sk = sm.skeleton.clone(); sk.bones = sm.skeleton.bones.map((b) => cL.get(b)); n.bind(sk, sm.bindMatrix.clone()); });
    const root = new THREE.Group(); root.name = T.id; root.add(cp); const bones = T.bones.map((b) => cL.get(b)), mats = T.mats;
    return player({ id: T.id, def: T.def, root, model: cp, clips: T.clips, mats, names: T.names, stripped: T.stripped, rest: T.rest, bones, clone: true }); }
  return { get, load, make, clone, ready: (id) => !!(ST[id] && ST[id].gl), error: (id) => (ST[id] && ST[id].err) || null, get ids() { return Object.keys(CREATURE_DATA); } };
})();

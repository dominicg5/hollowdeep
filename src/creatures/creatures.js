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
  function hdMat(D, gm) { const nm = gm.name || '', ud = gm.extras || {}, T = HDToon, lum = /Lumenite/.test(nm);
    const m = lum ? T.makeChalkMaterial({ flat: true, grain: 0.1, tooth: 0.06, emissive: ud.hd_emis ?? 0.3, facet: 0.55, shade: ud.hd_shade ?? 0x2c6a74, rim: ud.hd_rim ?? 0xeafff8, rimAmt: 0.7 + (ud.hd_gloss ?? 0) * 0.6, lift: 0.05 })
      : T.makeChalkMaterial({ grain: 0.55, tooth: 0.26, stroke: 0.75, scale: 7 });
    m.side = gm.doubleSided ? THREE.DoubleSide : THREE.FrontSide; m.name = D.id + ':' + (lum ? 'crystal' : 'stone'); m.userData.ink = lum ? { width: 1.4, color: ud.hd_ink ?? 0x123a3c, worldWidth: 0.012 } : { width: 2.8 }; return m; }
  function mat(D, name) { const L = (D.look || []).find((r) => r.test.test(name)) || { part: 'body', color: 0xcccccc }, m = new THREE.MeshLambertMaterial({ color: L.color });
    if (L.emissive != null) { m.emissive.setHex(L.emissive); m.emissiveIntensity = L.glow == null ? 1 : L.glow; } m.name = D.id + ':' + L.part; return m; }
  function make(id) { const D = get(id), S = ST[id]; if (!D || !S || !S.gl) return null; const g = S.gl, J = (g.skins && g.skins[0] && g.skins[0].joints) || [];
    const nodes = g.nodes.map((n, i) => { const o = J.includes(i) ? new THREE.Bone() : new THREE.Object3D(); o.name = n.name || 'n' + i;
      if (n.translation) o.position.fromArray(n.translation); if (n.rotation) o.quaternion.fromArray(n.rotation); if (n.scale) o.scale.fromArray(n.scale); return o; });
    g.nodes.forEach((n, i) => (n.children || []).forEach((c) => nodes[i].add(nodes[c])));
    const model = new THREE.Group(); model.name = D.id + 'Model'; for (const i of g.scenes[g.scene || 0].nodes) model.add(nodes[i]); model.updateMatrixWorld(true);
    let skel = null; if (g.skins && g.skins[0]) { const sk = g.skins[0], ibm = acc(S, sk.inverseBindMatrices).arr, bones = sk.joints.map((j) => nodes[j]); skel = new THREE.Skeleton(bones, bones.map((_, k) => new THREE.Matrix4().fromArray(ibm, k * 16))); }
    const mats = [];
    g.nodes.forEach((n, i) => { if (n.mesh == null) return; for (const p of g.meshes[n.mesh].primitives) { const geo = new THREE.BufferGeometry(), A = p.attributes, put = (k, nm) => { if (A[k] == null) return; const a = acc(S, A[k]); geo.setAttribute(nm, new THREE.BufferAttribute(a.arr, a.n, a.norm)); };
        put('POSITION', 'position'); put('NORMAL', 'normal'); put('JOINTS_0', 'skinIndex'); put('WEIGHTS_0', 'skinWeight'); if (D.shade === 'hdToon') put('COLOR_0', 'color'); /* (the golems' painted swatches; their _HD_* atlas attributes are not uploaded) */ if (p.indices != null) geo.setIndex(new THREE.BufferAttribute(acc(S, p.indices).arr, 1));
        const m = D.shade === 'hdToon' && typeof HDToon !== 'undefined' ? hdMat(D, g.materials[p.material]) : mat(D, g.materials[p.material].name), sm = skel ? new THREE.SkinnedMesh(geo, m) : new THREE.Mesh(geo, m); sm.name = m.name; sm.castShadow = true; sm.frustumCulled = false; nodes[i].add(sm); mats.push(m); } });
    // (GD-12: the invisible mushroom) glTF skinning ignores the skinned mesh node's own transform - the joints' world matrices x inverse bind matrices already place
    // every vertex. FBX2glTF puts the 100x / -90 deg X export transform on BOTH the armature and the mesh node, so binding with the mesh's matrixWorld applied it twice:
    // a ~60 m mesh around the camera (only shards of it on screen). Identity bind matrix; 'attached' mode cancels the mesh node transform (bindMatrixInverse = its inverse).
    model.updateMatrixWorld(true); if (skel) { model.traverse((o) => { if (o.isSkinnedMesh) o.bind(skel, new THREE.Matrix4()); }); model.updateMatrixWorld(true); }
    if (D.shade === 'hdToon' && typeof HDToon !== 'undefined') { const body = []; model.traverse((o) => { if (o.isMesh && o.material.userData.ink) body.push(o); }); const dpr = (typeof devicePixelRatio !== 'undefined' && devicePixelRatio) || 1;
      for (const o of body) { const ol = HDToon.addInkOutline(o, o.material.userData.ink); ol.userData.uniformsRes = true; ol.material.userData.uniforms.uRes.value.set((typeof innerWidth !== 'undefined' ? innerWidth : 1080) * dpr, (typeof innerHeight !== 'undefined' ? innerHeight : 1080) * dpr); mats.push(ol.material); } }
    const clips = {}; for (const an of g.animations || []) { const tracks = []; for (const ch of an.channels) { const s = an.samplers[ch.sampler], t = acc(S, s.input).arr, v = acc(S, s.output).arr, nm = nodes[ch.target.node].name;
        const ip = s.interpolation === 'STEP' ? THREE.InterpolateDiscrete : undefined; /* (GD-30: the golem clips hold some keys) */
        if (ch.target.path === 'rotation') tracks.push(new THREE.QuaternionKeyframeTrack(nm + '.quaternion', t, v, ip)); else if (ch.target.path === 'translation') tracks.push(new THREE.VectorKeyframeTrack(nm + '.position', t, v, ip)); else if (ch.target.path === 'scale') tracks.push(new THREE.VectorKeyframeTrack(nm + '.scale', t, v, ip)); }
      const k = an.name.replace(/^.*\|/, ''); clips[k] = new THREE.AnimationClip(k, -1, tracks); }
    // feet on the ground, D.height tall (measured in the bind pose)
    const bb = new THREE.Box3(), pv = new THREE.Vector3(); model.traverse((o) => { if (!o.isMesh || o.userData.isInk) return; const P = o.geometry.attributes.position;
      if (o.isSkinnedMesh) { for (let i = 0; i < P.count; i++) { pv.fromBufferAttribute(P, i); o.boneTransform(i, pv); bb.expandByPoint(pv.applyMatrix4(o.matrixWorld)); } } /* (where the skin really draws it, bones applied) */
      else { o.geometry.computeBoundingBox(); bb.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)); } });
    const h = Math.max(1e-4, bb.max.y - bb.min.y), k = (D.height || 1) / h; model.scale.setScalar(k); model.position.set(-(bb.min.x + bb.max.x) / 2 * k, -bb.min.y * k, -(bb.min.z + bb.max.z) / 2 * k); /* (centred on its root, feet on the ground) */
    const root = new THREE.Group(); root.name = D.id; root.add(model); const mixer = new THREE.AnimationMixer(model); let cur = null;
    const play = (name, once) => { const c = clips[name]; if (!c) return null; const a = mixer.clipAction(c); if (cur && cur !== a) cur.fadeOut(0.12); a.reset(); a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity); a.clampWhenFinished = !!once; a.fadeIn(0.12).play(); cur = a; return a; };
    play((D.clips && D.clips.idle) || 'Idle'); return { id, def: D, root, model, mixer, clips, play, mats, names: Object.keys(clips) }; }
  return { get, load, make, ready: (id) => !!(ST[id] && ST[id].gl), error: (id) => (ST[id] && ST[id].err) || null, get ids() { return Object.keys(CREATURE_DATA); } };
})();

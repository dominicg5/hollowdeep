/* ===== The Lumen Mushroom (t653u, Dominic): the Attack Playground's practice target in the Character view.
   Model: "Mushnub" from Quaternius' Ultimate Monsters pack (CC0 1.0, rigged + animated; see CREDITS.md), shipped alone as assets/models/mushnub.glb
   (67 KB, from poly.pizza's single-model download - no pack zip in the repo). Its body shape, rig and clips are untouched; only the colours change at load:
   a glowing lumenite cyan cap (#66d8ff, like the Lumen Tree mushrooms), a cream stem (#eedcbc) and its own sleepy side eyes (Art's concept,
   mia/concepts/creatures/mushnub/mushnub_lumen_concept.png). Clips used: Idle (loop), HitRecieve (a hit), Death (at 0 HP, then it respawns). ===== */

// ---------------------------------------------------------------------------------------------------------------------------------------------
// LUMEN MUSHROOM STATS - PLACEHOLDERS (Dominic: "easy placeholder values"). Edit here: everything the playground fight reads comes from this block.
const LUMEN_MUSHROOM = {
  name: 'Lumen Mushroom',
  hp: 10,           // max HP (Dominic t654u)
  def: 0,           // Defense (Combat.hitChance: her Accuracy / (def + 100))
  respawnS: 3,      // seconds after it dies before a fresh one pops back up
  height: 0.8,      // metres tall in the playground
};
// ---------------------------------------------------------------------------------------------------------------------------------------------

const LumenMushroom = (() => {
  const URL = 'assets/models/mushnub.glb', COL = { cap: 0x66d8ff, capGlow: 0x2fb8f0, stem: 0xeedcbc, eyeW: 0xeef1f6, eyeB: 0x141518 };
  const ST = { gl: null, bin: null, p: null, err: null };
  const CT = { 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }, NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  // ---- minimal GLB reader: what this one file holds (nodes, one skin, one mesh of 4 primitives, LINEAR rotation / translation clips; tightly packed buffers)
  function acc(i) { const g = ST.gl, a = g.accessors[i], bv = g.bufferViews[a.bufferView], T = CT[a.componentType], n = NC[a.type], off = ST.bin.byteOffset + (bv.byteOffset || 0) + (a.byteOffset || 0);
    return { arr: new T(ST.bin.buffer.slice(off, off + a.count * n * T.BYTES_PER_ELEMENT)), n }; }
  function load() { if (ST.p) return ST.p; ST.p = fetch(URL).then((r) => { if (!r.ok) throw new Error('mushnub ' + r.status); return r.arrayBuffer(); }).then((ab) => { const dv = new DataView(ab); let o = 12;
      while (o < ab.byteLength) { const len = dv.getUint32(o, true), type = dv.getUint32(o + 4, true); if (type === 0x4e4f534a) ST.gl = JSON.parse(new TextDecoder().decode(new Uint8Array(ab, o + 8, len))); else if (type === 0x004e4942) ST.bin = new Uint8Array(ab, o + 8, len); o += 8 + len; }
      if (!ST.gl || !ST.bin) throw new Error('mushnub: bad glb'); return true; }).catch((e) => { ST.err = String(e); ST.p = null; throw e; }); return ST.p; }
  const mat = (name) => { const cap = /Secondary/.test(name), stem = /Main/.test(name), white = /Eye_White/.test(name);
    const m = new THREE.MeshLambertMaterial({ color: cap ? COL.cap : stem ? COL.stem : white ? COL.eyeW : COL.eyeB }); if (cap) { m.emissive.setHex(COL.capGlow); m.emissiveIntensity = 0.55; } else if (stem) { m.emissive.setHex(0x3a3428); m.emissiveIntensity = 0.25; }
    m.name = 'lumenMush:' + (cap ? 'cap' : stem ? 'stem' : white ? 'eyeWhite' : 'eyeBlack'); return m; };
  // one mushroom: { root (Group, feet at y 0, facing +z), mixer, clips, play(name, once), mats }; call LumenMushroom.load() first
  function make() { const g = ST.gl; if (!g) return null; const nodes = g.nodes.map((n, i) => { const isJ = g.skins[0].joints.includes(i), o = isJ ? new THREE.Bone() : new THREE.Object3D(); o.name = n.name || 'n' + i;
      if (n.translation) o.position.fromArray(n.translation); if (n.rotation) o.quaternion.fromArray(n.rotation); if (n.scale) o.scale.fromArray(n.scale); return o; });
    g.nodes.forEach((n, i) => (n.children || []).forEach((c) => nodes[i].add(nodes[c])));
    const model = new THREE.Group(); model.name = 'lumenMushroomModel'; for (const i of g.scenes[g.scene || 0].nodes) model.add(nodes[i]); model.updateMatrixWorld(true);
    const sk = g.skins[0], ibm = acc(sk.inverseBindMatrices).arr, bones = sk.joints.map((j) => nodes[j]), inv = bones.map((_, k) => new THREE.Matrix4().fromArray(ibm, k * 16)), skel = new THREE.Skeleton(bones, inv), mats = [];
    g.nodes.forEach((n, i) => { if (n.mesh == null) return; for (const p of g.meshes[n.mesh].primitives) { const geo = new THREE.BufferGeometry(), A = p.attributes, put = (k, nm) => { const a = acc(A[k]); geo.setAttribute(nm, new THREE.BufferAttribute(a.arr, a.n)); };
        put('POSITION', 'position'); put('NORMAL', 'normal'); put('JOINTS_0', 'skinIndex'); put('WEIGHTS_0', 'skinWeight'); if (p.indices != null) geo.setIndex(new THREE.BufferAttribute(acc(p.indices).arr, 1));
        const m = mat(g.materials[p.material].name), sm = new THREE.SkinnedMesh(geo, m); sm.name = 'lumenMush:' + m.name.split(':')[1]; sm.castShadow = true; sm.frustumCulled = false; nodes[i].add(sm); mats.push(m); } });
    model.updateMatrixWorld(true); model.traverse((o) => { if (o.isSkinnedMesh) o.bind(skel, o.matrixWorld); });
    const clips = {}; for (const an of g.animations || []) { const tracks = []; for (const ch of an.channels) { const s = an.samplers[ch.sampler], t = acc(s.input).arr, v = acc(s.output).arr, nm = nodes[ch.target.node].name;
        if (ch.target.path === 'rotation') tracks.push(new THREE.QuaternionKeyframeTrack(nm + '.quaternion', t, v)); else if (ch.target.path === 'translation') tracks.push(new THREE.VectorKeyframeTrack(nm + '.position', t, v)); else if (ch.target.path === 'scale') tracks.push(new THREE.VectorKeyframeTrack(nm + '.scale', t, v)); }
      const k = an.name.replace(/^.*\|/, ''); clips[k] = new THREE.AnimationClip(k, -1, tracks); }
    // feet on the ground, LUMEN_MUSHROOM.height tall (measured in the bind pose)
    const bb = new THREE.Box3(); model.traverse((o) => { if (o.isSkinnedMesh) { o.geometry.computeBoundingBox(); bb.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)); } });
    const h = Math.max(1e-4, bb.max.y - bb.min.y), k = LUMEN_MUSHROOM.height / h; model.scale.setScalar(k); model.position.y = -bb.min.y * k;
    const root = new THREE.Group(); root.name = 'lumenMushroom'; root.add(model); const mixer = new THREE.AnimationMixer(model); let cur = null;
    const play = (name, once) => { const c = clips[name]; if (!c) return null; const a = mixer.clipAction(c); if (cur && cur !== a) cur.fadeOut(0.12); a.reset(); a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity); a.clampWhenFinished = !!once; a.fadeIn(0.12).play(); cur = a; return a; };
    play('Idle'); return { root, model, mixer, clips, play, mats, names: Object.keys(clips) }; }
  return { load, make, ST, URL, COL, get ready() { return !!ST.gl; } };
})();

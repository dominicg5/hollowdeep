/* ---- NPC kit: the keepers on a ready-made rigged base (Quaternius CC0 Universal Base Characters + Modular Outfits, animated with the
   CC0 Universal Animation Library; see CREDITS.md). tools/npc_kit bakes each keeper (proportions, painted 1024 atlas, generated hair,
   aprons, skirts, props) into assets/models/npc_kit.glb: 5 skinned meshes with 3 index LODs over one vertex buffer each, 23 bones
   (27 for Tess's braid), shared idle / talk / work clips. This module loads it lazily, builds a keeper on demand, plays natural idles
   with weight shifts, an occasional work loop, turns to face the player and gestures while talking, and IK-locks hands onto props. ---- */
const NpcKit = (() => {
  const ST = { state: 'idle', url: 'assets/models/npc_kit.glb', gl: null, bin: null, keepers: {}, clips: {}, err: null, bytes: 0 };
  let loadP = null;
  const CT = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }, NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  // ---- minimal GLB reader (only what the kit writes: buffers, accessors, nodes, skins, meshes, animations, webp images)
  function accessor(i) { const g = ST.gl, a = g.accessors[i], bv = g.bufferViews[a.bufferView], T = CT[a.componentType], n = NC[a.type], es = T.BYTES_PER_ELEMENT * n, stride = bv.byteStride || es, off = (bv.byteOffset || 0) + (a.byteOffset || 0);
    if (stride === es) return { arr: new T(ST.bin.buffer.slice(ST.bin.byteOffset + off, ST.bin.byteOffset + off + a.count * es)), n, norm: !!a.normalized };
    const out = new T(a.count * n), src = new T(ST.bin.buffer, ST.bin.byteOffset, Math.floor(ST.bin.byteLength / T.BYTES_PER_ELEMENT)), k = T.BYTES_PER_ELEMENT;
    for (let e = 0; e < a.count; e++) for (let c = 0; c < n; c++) out[e * n + c] = src[(off + e * stride) / k + c]; return { arr: out, n, norm: !!a.normalized }; }
  function load(url) { if (loadP) return loadP; ST.state = 'loading'; const t0 = performance.now();
    loadP = fetch(url || ST.url).then((r) => { if (!r.ok) throw new Error('npc kit ' + r.status); return r.arrayBuffer(); }).then(async (ab) => {
      ST.bytes = ab.byteLength; const dv = new DataView(ab); if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('not a glb');
      let o = 12; while (o < ab.byteLength) { const len = dv.getUint32(o, true), type = dv.getUint32(o + 4, true); if (type === 0x4e4f534a) ST.gl = JSON.parse(new TextDecoder().decode(new Uint8Array(ab, o + 8, len))); else if (type === 0x004e4942) ST.bin = new Uint8Array(ab, o + 8, len); o += 8 + len; }
      const g = ST.gl;
      // clips (rotation int16 -> float), named by the template keeper's bones
      for (const an of g.animations || []) { const tracks = []; for (const ch of an.channels) { const s = an.samplers[ch.sampler], nd = g.nodes[ch.target.node].name, tm = accessor(s.input).arr, v = accessor(s.output);
          let vals = v.arr; if (!(vals instanceof Float32Array)) { const f = new Float32Array(vals.length), d = vals instanceof Int16Array ? 32767 : 127; for (let i = 0; i < vals.length; i++) f[i] = Math.max(-1, vals[i] / d); vals = f; }
          tracks.push(ch.target.path === 'rotation' ? new THREE.QuaternionKeyframeTrack(nd + '.quaternion', tm, vals) : new THREE.VectorKeyframeTrack(nd + '.position', tm, vals)); }
        ST.clips[an.name] = new THREE.AnimationClip(an.name, -1, tracks); }
      // atlases
      const imgs = await Promise.all((g.images || []).map((im) => { const bv = g.bufferViews[im.bufferView], b = new Blob([new Uint8Array(ST.bin.buffer, ST.bin.byteOffset + (bv.byteOffset || 0), bv.byteLength)], { type: im.mimeType || 'image/webp' });
        return typeof createImageBitmap === 'function' ? createImageBitmap(b) : new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(b); }); }));
      ST.images = imgs; ST.ualPelvisY = (g.scenes[0].extras || {}).ualPelvisY || 0.917;
      for (const ni of g.scenes[0].nodes) { const n = g.nodes[ni]; ST.keepers[n.name] = { node: ni, extras: n.extras || {} }; }
      ST.state = 'ready'; ST.ms = Math.round(performance.now() - t0); return ST; }).catch((e) => { ST.state = 'error'; ST.err = e; console.warn('npc kit:', e); throw e; });
    return loadP; }
  const ready = () => ST.state === 'ready';
  const has = (id) => ready() && !!ST.keepers[id];
  let inkMat = null; const mats = {};
  function material(mi, vcol) { if (mats[mi]) return mats[mi]; const g = ST.gl, m = g.materials[mi], ti = m.pbrMetallicRoughness.baseColorTexture.index, tx = g.textures[ti], src = tx.extensions && tx.extensions.EXT_texture_webp ? tx.extensions.EXT_texture_webp.source : tx.source;
    const t = new THREE.Texture(ST.images[src]); t.flipY = false; t.encoding = THREE.sRGBEncoding; /* painted albedo; the map renderer outputs sRGB + ACES */ t.needsUpdate = true; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4;
    const mat = new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide, vertexColors: !!vcol }); /* vertex colour = baked face AO */ mat.name = 'npc_' + m.name; return (mats[mi] = mat); }
  function ink() { if (inkMat) return inkMat; inkMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x2a1a10).convertSRGBToLinear(), side: THREE.BackSide }); inkMat.name = 'npc_ink';
    inkMat.onBeforeCompile = (sh) => { sh.vertexShader = 'attribute float inkw;\n' + sh.vertexShader.replace('#include <skinning_vertex>', '#include <skinning_vertex>\n\ttransformed += normalize(objectNormal) * 0.0075 * inkw;'); }; return inkMat; }
  // per-keeper behaviour: which clip is her idle, her work loop, and which hands lock to which prop grip
  const ROLE = {
    goldie: { idle: 'idle', work: 'interact', workEvery: [9, 16], grips: { hand_r: 'book' }, stance: 0.13 },
    brannick: { idle: 'idle', work: null, grips: { hand_r: 'hammer' } },
    tess: { idle: 'idle', work: 'interact', workEvery: [8, 14], grips: {} },
    hattie: { idle: 'idle', work: null, grips: { hand_l: 'tray_l', hand_r: 'tray_r' }, stance: 0.12 },
    fennick: { idle: 'idle', work: null, grips: { hand_r: 'staff' }, stance: 0.08 } };
  // ---- build one keeper
  function create(id, opt) { opt = opt || {}; if (!has(id)) return null; const g = ST.gl, K = ST.keepers[id], kn = g.nodes[K.node], root = new THREE.Group(); root.name = 'npc_' + id;
    const bones = {}, byIdx = {}; let skinIdx = -1; const lodNodes = [];
    (function walk(ni, parent) { const n = g.nodes[ni]; if (n.mesh != null) { lodNodes.push(n); skinIdx = n.skin; return; }
      const b = new THREE.Bone(); b.name = n.name; if (n.translation) b.position.fromArray(n.translation); if (n.rotation) b.quaternion.fromArray(n.rotation); if (n.scale) b.scale.fromArray(n.scale);
      bones[n.name] = b; byIdx[ni] = b; parent.add(b); for (const c of n.children || []) walk(c, b); })(K.node, root);
    const sk = g.skins[skinIdx], ibm = accessor(sk.inverseBindMatrices).arr, jl = sk.joints.map((j) => byIdx[j]), inv = jl.map((_, i) => new THREE.Matrix4().fromArray(ibm, i * 16));
    const rootBone = bones.root; root.remove(rootBone);
    const prim0 = g.meshes[lodNodes[0].mesh].primitives[0], A = prim0.attributes, attr = {};
    for (const [k, nm] of [['POSITION', 'position'], ['NORMAL', 'normal'], ['TEXCOORD_0', 'uv'], ['JOINTS_0', 'skinIndex'], ['WEIGHTS_0', 'skinWeight'], ['_INKW', 'inkw'], ['COLOR_0', 'color']]) { if (A[k] == null) continue; const a = accessor(A[k]); attr[nm] = new THREE.BufferAttribute(a.arr, a.n, a.norm); }
    const lods = lodNodes.sort((a, b) => a.name.localeCompare(b.name)).map((ln) => { const ge = new THREE.BufferGeometry(); for (const k in attr) ge.setAttribute(k, attr[k]); const ix = accessor(g.meshes[ln.mesh].primitives[0].indices).arr; ge.setIndex(new THREE.BufferAttribute(ix, 1)); ge.computeBoundingSphere(); ge.boundingSphere.radius *= 1.6; return ge; });
    const mesh = new THREE.SkinnedMesh(lods[0], material(prim0.material, !!attr.color)); mesh.name = 'npc_' + id + '_body'; mesh.add(rootBone); mesh.castShadow = true; mesh.frustumCulled = false;
    root.add(mesh); root.updateMatrixWorld(true); const skel = new THREE.Skeleton(jl, inv); mesh.bind(skel, mesh.matrixWorld);
    const outline = new THREE.SkinnedMesh(lods[0], ink()); outline.name = 'npc_' + id + '_ink'; outline.frustumCulled = false; root.add(outline); outline.bind(skel, mesh.matrixWorld);
    // clips: the pelvis translation track rescaled to her hip height
    const ex = K.extras, kH = (ex.pelvisY || 0.9) / ST.ualPelvisY, pRest = bones.pelvis.position.clone(), mixer = new THREE.AnimationMixer(mesh), acts = {};
    for (const [nm, clip] of Object.entries(ST.clips)) { const c = clip.clone(); for (const t of c.tracks) if (t.name === 'pelvis.position') { const v = t.values, v0 = [v[0], v[1], v[2]]; for (let i = 0; i < v.length; i += 3) for (let k = 0; k < 3; k++) v[i + k] = pRest.getComponent(k) + (v[i + k] - v0[k]) * kH; }
      acts[nm] = mixer.clipAction(c); }
    const role = ROLE[id] || ROLE.goldie, idle = acts[role.idle] || acts.idle; idle.play(); idle.time = Math.random() * idle.getClip().duration; idle.timeScale = 0.85 + Math.random() * 0.2;
    // grips: prop points in the bind pose -> offsets in their parent bone's rest frame
    const grips = {}; for (const [hand, gn] of Object.entries(role.grips)) { const gp = (ex.grips || {})[gn]; if (!gp) continue; const b = bones[gp.bone]; if (!b) continue; const bi = jl.indexOf(b); grips[hand] = { bone: b, local: new THREE.Vector3().fromArray(gp.pos).applyMatrix4(skel.boneInverses[bi]), pole: new THREE.Vector3().fromArray(gp.pole || [0, -1, -0.5]) };
      // a carried prop (weighted to the hand): the hand keeps its rest orientation relative to the torso bone, turned by the carry yaw
      if (gp.carry && bones[gp.carry.bone] && bones[hand]) { const rq = (bn) => { const m = skel.boneInverses[jl.indexOf(bones[bn])].clone().invert(), q = new THREE.Quaternion(); m.decompose(new THREE.Vector3(), q, new THREE.Vector3()); return q; };
        grips[hand].carry = { bone: bones[gp.carry.bone], off: rq(gp.carry.bone).invert().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), gp.carry.yaw || 0)).multiply(rq(hand)) }; } }
    const k = { id, root, mesh, outline, lods, bones, skel, mixer, acts, role, grips, lod: 0, tris: ex.tris || [], h: ex.h || 1.6, talking: false, look: 0, yaw: 0, workT: 4 + Math.random() * 6, cur: idle, ph: Math.random() * 6.28, bv: [0, 0, 0, 0] };
    if (opt.scale) root.scale.setScalar(opt.scale); if (opt.pos) root.position.copy(opt.pos); if (opt.yaw != null) root.rotation.y = k.yaw = opt.yaw;
    return k; }
  // ---- per-frame
  const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _m = new THREE.Matrix4(), UP = new THREE.Vector3(0, 1, 0);
  function rotWorld(b, axis, ang) { // rotate a bone about a world axis, keeping the result in its local quaternion
    b.parent.getWorldQuaternion(_q2); b.getWorldQuaternion(_q); _q.premultiply(new THREE.Quaternion().setFromAxisAngle(axis, ang)); b.quaternion.copy(_q2.invert().multiply(_q)); b.updateMatrixWorld(true); }
  function aim(b, from, to) { // rotate bone b (world) so the direction `from` becomes `to`
    if (from.lengthSq() < 1e-10 || to.lengthSq() < 1e-10) return; const d = new THREE.Quaternion().setFromUnitVectors(from.clone().normalize(), to.clone().normalize());
    b.parent.getWorldQuaternion(_q2); b.getWorldQuaternion(_q); _q.premultiply(d); b.quaternion.copy(_q2.invert().multiply(_q)); b.updateMatrixWorld(true); }
  function ik(k, side, target, pole) { const B = k.bones, up = B['upperarm_' + side], lo = B['lowerarm_' + side], ha = B['hand_' + side]; if (!up || !lo || !ha) return;
    const S = up.getWorldPosition(new THREE.Vector3()), E0 = lo.getWorldPosition(new THREE.Vector3()), H0 = ha.getWorldPosition(new THREE.Vector3()), a = S.distanceTo(E0), b = E0.distanceTo(H0);
    const T = target.clone(), d = Math.min(a + b - 1e-4 * a, Math.max(Math.abs(a - b) + 1e-4, S.distanceTo(T))); const dir = T.clone().sub(S).normalize(); T.copy(S).addScaledVector(dir, d);
    const x = (a * a - b * b + d * d) / (2 * d), h = Math.sqrt(Math.max(0, a * a - x * x)); const pv = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize(); const E = S.clone().addScaledVector(dir, x).addScaledVector(pv, h);
    aim(up, E0.clone().sub(S), E.clone().sub(S)); const E1 = lo.getWorldPosition(new THREE.Vector3()), H1 = ha.getWorldPosition(new THREE.Vector3()); aim(lo, H1.clone().sub(E1), T.clone().sub(E1)); }
  function update(k, dt, ctx) { ctx = ctx || {}; const t = performance.now() / 1000;
    // LOD by camera distance (metres): 0 < 15 m < 1 < 30 m < 2
    if (ctx.camDist != null) { const L = ctx.camDist > 30 ? 2 : ctx.camDist > 15 ? 1 : 0; if (L !== k.lod) { k.lod = L; k.mesh.geometry = k.outline.geometry = k.lods[Math.min(L, k.lods.length - 1)]; } k.outline.visible = ctx.camDist < 40; }
    // clip state: talk while in conversation, an occasional work loop, the idle otherwise
    const want = ctx.talking ? (k.acts.talk || k.cur) : k.working ? k.working : (k.acts[k.role.idle] || k.acts.idle);
    if (!ctx.talking && k.role.work && k.acts[k.role.work] && !k.working) { k.workT -= dt; if (k.workT <= 0) { const w = k.acts[k.role.work]; w.reset(); w.setLoop(THREE.LoopOnce, 1); w.clampWhenFinished = false; k.working = w; k.workEnd = t + w.getClip().duration * 0.98; const [a, b] = k.role.workEvery || [10, 16]; k.workT = a + Math.random() * (b - a); } }
    if (k.working && (t > k.workEnd || ctx.talking)) k.working = null;
    const tgt = ctx.talking ? (k.acts.talk || k.cur) : k.working || (k.acts[k.role.idle] || k.acts.idle);
    if (tgt !== k.cur) { tgt.reset().play(); if (tgt === k.working) tgt.setLoop(THREE.LoopOnce, 1); else tgt.setLoop(THREE.LoopRepeat, Infinity); k.cur.crossFadeTo(tgt, 0.45, false); k.cur = tgt; }
    k.mixer.update(dt);
    // turn: the body part of the way, the head the rest
    let d = (ctx.face != null ? ctx.face : k.baseYaw != null ? k.baseYaw : k.yaw) - (k.baseYaw != null ? k.baseYaw : k.yaw); d = Math.atan2(Math.sin(d), Math.cos(d));
    const base = k.baseYaw != null ? k.baseYaw : (k.baseYaw = k.root.rotation.y); const bodyT = base + d * 0.6, headT = Math.max(-0.7, Math.min(0.7, d * 0.4));
    let e = bodyT - k.root.rotation.y; e = Math.atan2(Math.sin(e), Math.cos(e)); const step = e * Math.min(1, dt * 3); k.root.rotation.y += step; k.look += (headT - k.look) * Math.min(1, dt * 4);
    k.root.updateMatrixWorld(true);
    // skirted keepers stand with their feet closer than the library idle's wide stance
    if (k.role.stance) { const fw = new THREE.Vector3(0, 0, 1).transformDirection(k.root.matrixWorld); for (const s of ['l', 'r']) { const th = k.bones['thigh_' + s], ft = k.bones['foot_' + s]; if (!th) continue; const q0 = ft && ft.getWorldQuaternion(new THREE.Quaternion()); rotWorld(th, fw, (s === 'l' ? -1 : 1) * k.role.stance); if (ft) { ft.parent.getWorldQuaternion(_q2); ft.quaternion.copy(_q2.invert().multiply(q0)); ft.updateMatrixWorld(true); } } }
    if (Math.abs(k.look) > 1e-3) { if (k.bones.neck_01) rotWorld(k.bones.neck_01, UP, k.look * 0.4); rotWorld(k.bones.Head, UP, k.look * 0.6); }
    // hands locked on their props (hammer haft, tray rim, staff, ledger)
    for (const [hand, gp] of Object.entries(k.grips)) { if (k.working && hand === 'hand_r' && k.id !== 'hattie') continue; const T = gp.local.clone().applyMatrix4(gp.bone.matrixWorld); const pole = gp.pole.clone().transformDirection(k.root.matrixWorld); ik(k, hand.slice(-1), T, pole);
      if (gp.carry) { const hb = k.bones[hand]; gp.carry.bone.getWorldQuaternion(_q).multiply(gp.carry.off); hb.parent.getWorldQuaternion(_q2); hb.quaternion.copy(_q2.invert().multiply(_q)); hb.updateMatrixWorld(true); } }
    // Tess's braid: spring-ish lag on turns + a 4 deg sway over 2.2 s, limits 20/30/35 deg
    if (k.bones.braid_01) { const yv = step / Math.max(dt, 1e-3), lim = [0, 0.35, 0.52, 0.61], fwd = new THREE.Vector3(0, 0, 1).transformDirection(k.root.matrixWorld), side = new THREE.Vector3(1, 0, 0).transformDirection(k.root.matrixWorld);
      for (let i = 1; i < 4; i++) { const w = -yv * 0.12 * i; k.bv[i] += (w - k.bv[i]) * Math.min(1, dt * (6 - i * 1.2)); const sw = 0.07 * Math.sin(t * 6.2832 / 2.2 - i * 0.6 + k.ph); const b = k.bones['braid_0' + i];
        if (b) { if (!b.userData.q0) b.userData.q0 = b.quaternion.clone(); b.quaternion.copy(b.userData.q0); b.updateMatrixWorld(true); rotWorld(b, fwd, Math.max(-lim[i], Math.min(lim[i], sw + k.bv[i]))); rotWorld(b, side, 0.035 * Math.sin(t * 3.1416 / 2.2 - i * 0.5)); } } } }
  return { ST, load, ready, has, create, update, ROLE };
})();
if (typeof window !== 'undefined') window.NpcKit = NpcKit;

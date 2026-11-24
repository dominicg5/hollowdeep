// Bake the furnace / anvil work loops into a tiny Int16 table for src/char3d.js. Nothing is hand-keyed: every number comes from existing motion data.
//   hammer (the anvil, t603u, Dominic: "utilize the same hammer motion as Theus") = Theus's own forge strike, read straight out of src/volcanic_forge.js
//     (not modified): his swing keys (upper-arm / forearm angles in one vertical plane through the shoulder, the abduction curve) and his strikeBody()
//     torso twist / fold, knee flex, weight shift and shoulder roll, over his 1.6 s strike window (wind-up, drive, impact, rebound, recovery), one strike per loop.
//     The impact angles depend on where the strike lands, so per frame the angles are stored as a + b * impact (his key() is linear in the impact pose);
//     char3d solves her impact pose for the anvil at run time with the same two-bone solve, elbow above the line.
//   reach (the furnace, t603u: "she bends over more to place something in and out") = Quaternius UAL2 'Farm_PlantSeed' (CC0 1.0): she sinks at the
//     knees, folds at the waist, puts her right hand forward and low (in), holds, and draws it back (out), one cycle per loop.
// Per frame, hammer: [aU_a, aU_b, e_a, e_b, wrist_a, wrist_b (forearm-to-handle angle: his grip), abduction, twist, fold, knee, forward, shoulder y, shoulder z] (degrees / Theus units);
//   reach: [hip drop, hip forward shift (in leg lengths), pelvis Euler xyz, waist Euler xyz (spine_03 against the pelvis), R wrist from shoulder (arm lengths) + elbow pole, L the same]
//   (character space: +x her left, +y up, +z forward). 31 frames over one loop (one loop = one item).
// Usage: UAL2=<UAL2_Standard.glb> THREE_JS=<three.min.js> node tools/work_anim/bake.js > tools/work_anim/baked.json
global.self = global; const path = require('path'), fs = require('fs'), THREE = require(process.env.THREE_JS || path.join(__dirname, '../../assets/vendor/three.min.js'));
function load(F) { const b = fs.readFileSync(F), jl = b.readUInt32LE(12), j = JSON.parse(b.slice(20, 20 + jl).toString()), bin = b.slice(20 + jl + 8);
  const acc = (i) => { const a = j.accessors[i], v = j.bufferViews[a.bufferView], n = { SCALAR: 1, VEC3: 3, VEC4: 4 }[a.type], off = (v.byteOffset || 0) + (a.byteOffset || 0); return new Float32Array(bin.buffer.slice(bin.byteOffset + off, bin.byteOffset + off + a.count * n * 4)); };
  const objs = j.nodes.map((n) => { const o = new THREE.Object3D(); o.name = n.name; if (n.translation) o.position.fromArray(n.translation); if (n.rotation) o.quaternion.fromArray(n.rotation); if (n.scale) o.scale.fromArray(n.scale); return o; });
  j.nodes.forEach((n, i) => (n.children || []).forEach((c) => objs[i].add(objs[c]))); const top = new THREE.Object3D(); j.scenes[0].nodes.forEach((i) => top.add(objs[i]));
  const rest = objs.map((o) => ({ p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone() })), by = Object.fromEntries(objs.map((o) => [o.name, o]));
  const pose = (anim, t) => { objs.forEach((o, i) => { o.position.copy(rest[i].p); o.quaternion.copy(rest[i].q); o.scale.copy(rest[i].s); });
    if (anim) for (const ch of anim.channels) { const s = anim.samplers[ch.sampler], T = acc(s.input), Vv = acc(s.output), o = objs[ch.target.node], n = ch.target.path === 'rotation' ? 4 : 3; let k = 0; while (k < T.length - 2 && t > T[k + 1]) k++;
      const u = T.length < 2 ? 0 : Math.min(1, Math.max(0, (t - T[k]) / (T[k + 1] - T[k] || 1)));
      if (n === 4) { const a = new THREE.Quaternion().fromArray(Vv, k * 4), c = new THREE.Quaternion().fromArray(Vv, Math.min(T.length - 1, k + 1) * 4); a.slerp(c, s.interpolation === 'STEP' ? 0 : u); o.quaternion.copy(a); }
      else { const a = new THREE.Vector3().fromArray(Vv, k * 3), c = new THREE.Vector3().fromArray(Vv, Math.min(T.length - 1, k + 1) * 3); a.lerp(c, s.interpolation === 'STEP' ? 0 : u); o[ch.target.path === 'translation' ? 'position' : 'scale'].copy(a); } }
    top.updateMatrixWorld(true); };
  const W = (n) => by[n].getWorldPosition(new THREE.Vector3()), WQ = (n) => by[n].getWorldQuaternion(new THREE.Quaternion());
  const A = (name) => j.animations.find((a) => a.name === name), dur = (a) => Math.max(...a.samplers.map((s) => j.accessors[s.input].max[0]));
  return { pose, W, WQ, A, dur }; }
const N = 31, K = 8000, R = (v) => Math.max(-32767, Math.min(32767, Math.round(v * K))), b64 = (vals) => Buffer.from(Int16Array.from(vals.map(R)).buffer).toString('base64');
// ---- Theus's strike, from the forge source (text slices, evaluated in isolation; the forge file itself is untouched)
const FS = fs.readFileSync(path.join(__dirname, '../../src/volcanic_forge.js'), 'utf8');
const cut = (a, b) => { const i = FS.indexOf(a); if (i < 0) throw new Error('forge source moved: ' + a); const j = FS.indexOf(b, i); if (j < 0) throw new Error('forge source moved: ' + b); return FS.slice(i, j); };
const keysSrc = cut('const KT = [35, 115, 100]', '/* (pass 7b: the upper arm abducted'), bodySrc = cut('function strikeBody(t) {', '\n  // foot placement');
const ABD = +FS.match(/ABD = ([0-9.]+)/)[1];
const mk = new Function('THREE', 'ABD', `const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }, lerp = (a, b, t) => a + (b - a) * t, v3 = (x, y, z) => new THREE.Vector3(x, y, z), hitTimes = () => [0];
  return (imp) => { ${keysSrc}; ${bodySrc}; return { key, alOf, strikeBody }; };`)(THREE, ABD);
const T0 = mk([0, 0, 0]), T1 = mk([1, 1, 1]), ham = [];
for (let i = 0; i < N; i++) { const x = -0.8 + 1.6 * i / (N - 1), k0 = T0.key(x), k1 = T1.key(x), sb = T0.strikeBody(x); ham.push(k0[0], k1[0] - k0[0], k0[1], k1[1] - k0[1], k0[2], k1[2] - k0[2], T0.alOf(x), sb.tw, sb.dip, sb.kn, sb.fw, sb.sh.y, sb.sh.z); }
// ---- the furnace reach: UAL2 Farm_PlantSeed
const G = load(process.env.UAL2), a = G.A('Farm_PlantSeed'), T = G.dur(a); G.pose(a, 0); /* (the clip's own first frame - her standing stance - is the base: drop and turns are measured from it) */
const pv0 = G.W('pelvis').y, pz0 = G.W('pelvis').z, qp0 = G.WQ('pelvis'), qs0 = G.WQ('spine_03'), qrel0 = qp0.clone().invert().multiply(qs0), arm = G.W('upperarm_r').distanceTo(G.W('lowerarm_r')) + G.W('lowerarm_r').distanceTo(G.W('hand_r')), leg = G.W('thigh_r').distanceTo(G.W('calf_r')) + G.W('calf_r').distanceTo(G.W('foot_r'));
const rows = []; for (let i = 0; i < N; i++) { G.pose(a, T * i / (N - 1)); const qp = G.WQ('pelvis'), qs = G.WQ('spine_03'), ep = new THREE.Euler().setFromQuaternion(qp.clone().multiply(qp0.clone().invert()), 'XYZ'), ew = new THREE.Euler().setFromQuaternion(qp.clone().invert().multiply(qs).multiply(qrel0.clone().invert()), 'XYZ');
  const f = [(pv0 - G.W('pelvis').y) / leg, (G.W('pelvis').z - pz0) / leg, ep.x, ep.y, ep.z, ew.x, ew.y, ew.z]; for (const s of ['r', 'l']) { const ua = G.W('upperarm_' + s), h = G.W('hand_' + s), el = G.W('lowerarm_' + s); f.push(...h.clone().sub(ua).divideScalar(arm).toArray(), ...el.clone().sub(ua.clone().lerp(h, 0.5)).normalize().toArray()); } rows.push(...f); }
console.log(JSON.stringify({ N, K, clips: { hammer: { src: 'Theus forge strike (src/volcanic_forge.js key() / alOf() / strikeBody(), 1.6 s window)', F: 13, b64: b64(ham.map((v) => v / 100)), scale: 100 }, reach: { src: 'UAL2 Farm_PlantSeed', T: +T.toFixed(3), F: 20, b64: b64(rows) } } }));

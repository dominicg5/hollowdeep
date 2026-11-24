// Bake the furnace / anvil work loops (t599u, Dominic: "utilize online sources for these movements") from Quaternius' Universal Animation Library
// clips (CC0 1.0, commercial OK; see CREDITS.md) into a tiny Int16 table for src/char3d.js. Nothing is hand-keyed: every number comes from the clip.
//   hammer = UAL2 'TreeChopping_Loop' (overhead two-hand strike, a seamless loop)  -> the anvil
//   reach  = UAL1 'Interact' (left hand reaches forward and back) + its own mirror half a cycle later for the right hand -> the furnace
// Per frame (character space: +x her left, +y up, +z forward): chest lean (Euler xyz of spine_03, about the loop's mean), then per arm R, L: the wrist offset
// from the shoulder (upperarm joint) in arm lengths, and the elbow pole direction. Resampled to 31 frames over one loop (one loop = one item).
// Usage: UAL1=<UAL1_Standard.glb> UAL2=<UAL2_Standard.glb> THREE_JS=<three.min.js> node tools/work_anim/bake.js > tools/work_anim/baked.json
global.self = global; const THREE = require(process.env.THREE_JS || require('path').join(__dirname, '../../assets/vendor/three.min.js')); const fs = require('fs');
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
const N = 31, K = 8000;
function frames(G, clip) { const a = G.A(clip), T = G.dur(a); G.pose(null, 0); const qs0 = G.WQ('spine_03'), arm = G.W('upperarm_r').distanceTo(G.W('lowerarm_r')) + G.W('lowerarm_r').distanceTo(G.W('hand_r'));
  const out = []; for (let i = 0; i < N; i++) { G.pose(a, T * i / (N - 1)); const qs = G.WQ('spine_03').multiply(qs0.clone().invert()), e = new THREE.Euler().setFromQuaternion(qs, 'XYZ'), f = { c: [e.x, e.y, e.z] };
    for (const s of ['r', 'l']) { const ua = G.W('upperarm_' + s), h = G.W('hand_' + s), el = G.W('lowerarm_' + s), pole = el.clone().sub(ua.clone().lerp(h, 0.5)).normalize(); f[s] = [...h.clone().sub(ua).divideScalar(arm).toArray(), ...pole.toArray()]; }
    out.push(f); }
  const m = [0, 1, 2].map((k) => out.slice(0, N - 1).reduce((t, f) => t + f.c[k], 0) / (N - 1)); for (const f of out) f.c = f.c.map((v, k) => v - m[k]); // (chest lean about the loop's mean, so her own stance stays the base)
  return { T, out }; }
const pack = (rows) => { const vals = []; for (const f of rows) vals.push(...f.c, ...f.r, ...f.l); const q = Int16Array.from(vals.map((v) => Math.max(-32767, Math.min(32767, Math.round(v * K))))); return Buffer.from(q.buffer).toString('base64'); };
const G1 = load(process.env.UAL1), G2 = load(process.env.UAL2), res = { N, K, F: 15, clips: {} };
{ const { T, out } = frames(G2, 'TreeChopping_Loop'); res.clips.hammer = { src: 'UAL2 TreeChopping_Loop', T: +T.toFixed(3), b64: pack(out) }; }
{ const { T, out } = frames(G1, 'Interact'); const mir = (v) => [-v[0], v[1], v[2], -v[3], v[4], v[5]];
  const rows = out.map((f, i) => { const g = out[(i + (N - 1) / 2) % (N - 1)]; return { c: [f.c[0], 0, 0], r: mir(g.l), l: f.l }; }); // (right hand = the left hand mirrored, half a loop later: hands alternate in and out)
  res.clips.reach = { src: 'UAL1 Interact (+ mirror)', T: +T.toFixed(3), b64: pack(rows) }; }
console.log(JSON.stringify(res));

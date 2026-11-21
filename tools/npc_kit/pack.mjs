// Hollowdeep NPC kit pack: per-keeper bake output (tools/npc_kit/out/<id>/) + the Universal Animation Library clips
// -> assets/models/npc_kit.glb (one GLB: 5 skinned keepers, LOD0/1/2 index sets over one vertex buffer each,
//    int8 normals / uint16 UVs / uint8 joints+weights (KHR_mesh_quantization), int16 rotation tracks, webp atlases).
// usage: node pack.mjs <UAL1_Standard.glb> <out.glb> goldie brannick ...
import fs from 'fs'; import path from 'path';
import { Document, NodeIO } from '@gltf-transform/core';
import { KHRMeshQuantization, EXTTextureWebP } from '@gltf-transform/extensions';
import { MeshoptSimplifier } from 'meshoptimizer';
import * as THREE from 'three';
const [ualPath, outPath, ...ids] = process.argv.slice(2); const DIR = path.join(path.dirname(new URL(import.meta.url).pathname), 'out');
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions([KHRMeshQuantization, EXTTextureWebP]);
const ual = await io.read(ualPath); const U = ual.getRoot();
const unode = {}; for (const n of U.listNodes()) unode[n.getName()] = n;
const parentOf = {}; for (const n of U.listNodes()) for (const c of n.listChildren()) parentOf[c.getName()] = n.getName();
// world rest rotation of each UAL bone (Armature -> root -> ...)
function worldQ(name) { const q = new THREE.Quaternion(); const chain = []; let n = name; while (n) { chain.unshift(n); n = parentOf[n]; } for (const c of chain) { const r = unode[c].getRotation(); q.multiply(new THREE.Quaternion(...r)); } return q; }
const doc = new Document(); const R = doc.getRoot(); const buf = doc.createBuffer();
doc.createExtension(KHRMeshQuantization).setRequired(true); const webp = doc.createExtension(EXTTextureWebP).setRequired(true);
const scene = doc.createScene('npc_kit'); const CLIPS = { idle: 'Idle_Loop', talk: 'Idle_Talking_Loop', interact: 'Interact', torch: 'Idle_Torch_Loop', drive: 'Driving_Loop', pickup: 'PickUp_Table' };
const acc = (arr, type, norm) => doc.createAccessor().setArray(arr).setType(type).setNormalized(!!norm).setBuffer(buf);
let template = null; const report = {};
for (const id of ids) {
  const D = path.join(DIR, id), meta = JSON.parse(fs.readFileSync(path.join(D, 'meta.json'))); const A = {};
  for (const [k, [dt, sh]] of Object.entries(meta.arrays)) { const b = fs.readFileSync(path.join(D, k + '.bin')); const T = { float32: Float32Array, uint8: Uint8Array, uint32: Uint32Array }[dt]; A[k] = new T(b.buffer, b.byteOffset, b.byteLength / T.BYTES_PER_ELEMENT); }
  const nv = A.pos.length / 3, bones = meta.bones, heads = meta.heads;
  // skeleton: UAL rest rotations, our joint positions
  const keeper = doc.createNode(id); scene.addChild(keeper); const bn = {}, wq = {}, wp = {};
  bones.forEach((b, i) => { wq[b] = unode[b] ? worldQ(b) : null; wp[b] = new THREE.Vector3(...(b === 'root' ? [0, 0, 0] : heads[i])); });
  bones.forEach((b) => { const par = b === 'root' ? null : (b.startsWith('braid_') ? (b === 'braid_00' ? 'Head' : 'braid_0' + (+b.slice(-1) - 1)) : parentOf[b]);
    if (!wq[b]) wq[b] = wq[par].clone(); // braid: same frame as the head
    const n = doc.createNode(b); const pq = par ? wq[par] : (unode.Armature ? new THREE.Quaternion(...unode.Armature.getRotation()) : new THREE.Quaternion());
    const lq = pq.clone().invert().multiply(wq[b]); const lt = wp[b].clone().sub(par ? wp[par] : new THREE.Vector3()).applyQuaternion(pq.clone().invert());
    n.setRotation(lq.toArray()).setTranslation(lt.toArray()); bn[b] = n; (par ? bn[par] : keeper).addChild(n); });
  const ibm = new Float32Array(bones.length * 16); bones.forEach((b, i) => { const m = new THREE.Matrix4().compose(wp[b], wq[b], new THREE.Vector3(1, 1, 1)).invert(); ibm.set(m.elements, i * 16); });
  const skin = doc.createSkin(id + '_skin').setSkeleton(bn.root).setInverseBindMatrices(acc(ibm, 'MAT4')); bones.forEach((b) => skin.addJoint(bn[b]));
  // attributes (quantized) shared by the three LODs
  const nrm = new Int8Array(nv * 4), uv = new Uint16Array(nv * 2), sw = new Uint8Array(nv * 4);
  for (let i = 0; i < nv; i++) { for (let k = 0; k < 3; k++) nrm[i * 4 + k] = Math.round(Math.max(-1, Math.min(1, A.nrm[i * 3 + k])) * 127); uv[i * 2] = Math.round(Math.min(1, Math.max(0, A.uv[i * 2])) * 65535); uv[i * 2 + 1] = Math.round(Math.min(1, Math.max(0, A.uv[i * 2 + 1])) * 65535);
    let s = 0; const w = [0, 1, 2, 3].map((k) => Math.round(A.sw[i * 4 + k] * 255)); s = w.reduce((a, b) => a + b, 0); w[0] += 255 - s; sw.set(w, i * 4); }
  const nrm3 = new Int8Array(nv * 3); for (let i = 0; i < nv; i++) for (let k = 0; k < 3; k++) nrm3[i * 3 + k] = nrm[i * 4 + k];
  const iw = new Uint8Array(nv); for (let i = 0; i < nv; i++) iw[i] = Math.round(A.inkw[i] * 255); const aI = acc(iw, 'SCALAR', true);
  const aC = A.col ? acc(new Uint8Array(A.col), 'VEC4', true) : null; const aP = acc(A.pos, 'VEC3'), aN = acc(nrm3, 'VEC3', true), aU = acc(uv, 'VEC2', true), aJ = acc(A.si, 'VEC4'), aW = acc(sw, 'VEC4', true);
  const tex = doc.createTexture(id + '_atlas').setImage(fs.readFileSync(path.join(DIR, id + '_atlas.webp'))).setMimeType('image/webp');
  const mat = doc.createMaterial(id).setBaseColorTexture(tex).setRoughnessFactor(1).setMetallicFactor(0).setDoubleSided(true);
  const lodTris = []; const idx0 = A.idx;
  [1, 0.5, 0.2].forEach((f, li) => {
    // LOD1 / LOD2 as index sets over the shared vertex buffer. The far LOD bottoms out near 35%: the smart-project UV
    // islands make every seam a border and permissive collapses smear the painted atlas, so we keep it clean instead.
    let ix = idx0; if (f < 1) { const tgt = Math.floor(idx0.length * f / 3) * 3; [ix] = MeshoptSimplifier.simplify(idx0, A.pos, 3, tgt, f < 0.3 ? 0.3 : 0.08, []); }
    const I16 = new Uint16Array(ix); lodTris.push(I16.length / 3);
    const prim = doc.createPrimitive().setIndices(acc(I16, 'SCALAR')).setAttribute('POSITION', aP).setAttribute('NORMAL', aN).setAttribute('TEXCOORD_0', aU).setAttribute('JOINTS_0', aJ).setAttribute('WEIGHTS_0', aW).setAttribute('_INKW', aI); if (aC) prim.setAttribute('COLOR_0', aC); prim.setMaterial(mat);
    const node = doc.createNode(id + '_lod' + li).setMesh(doc.createMesh(id + '_lod' + li).addPrimitive(prim)).setSkin(skin); keeper.addChild(node); });
  keeper.setExtras({ h: meta.h, grips: meta.grips, pelvisY: heads[bones.indexOf('pelvis')][1], tris: lodTris, bones: bones.length });
  report[id] = { verts: nv, tris: lodTris, bones: bones.length };
  if (!template) template = bn;
}
// animations: rotation tracks (int16) for the kept bones, pelvis translation (float), resampled at 20 fps
const ualPelvisY = (() => { const q = new THREE.Quaternion(...unode.root.getRotation()); return new THREE.Vector3(...unode.pelvis.getTranslation()).applyQuaternion(q).y; })();
for (const [key, name] of Object.entries(CLIPS)) {
  const src = U.listAnimations().find((a) => a.getName() === name); if (!src) continue; const anim = doc.createAnimation(key);
  for (const ch of src.listChannels()) { const tn = ch.getTargetNode().getName(), p = ch.getTargetPath(); if (!template[tn] || tn === 'root') continue; if (p !== 'rotation' && !(p === 'translation' && tn === 'pelvis')) continue;
    const s = ch.getSampler(), inp = s.getInput().getArray(), out = s.getOutput().getArray(), dur = inp[inp.length - 1], fps = 20, nf = Math.max(2, Math.round(dur * fps) + 1), st = p === 'rotation' ? 4 : 3;
    const times = new Float32Array(nf), vals = p === 'rotation' ? new Int16Array(nf * 4) : new Float32Array(nf * 3); let j = 0; const q = new THREE.Quaternion(), q2 = new THREE.Quaternion();
    for (let f = 0; f < nf; f++) { const t = Math.min(dur, f / fps); times[f] = t; while (j < inp.length - 2 && inp[j + 1] < t) j++; const a = Math.max(0, Math.min(1, (t - inp[j]) / ((inp[j + 1] - inp[j]) || 1)));
      if (p === 'rotation') { q.fromArray(out, j * 4); q2.fromArray(out, Math.min(inp.length - 1, j + 1) * 4); q.slerp(q2, a).normalize(); for (let k = 0; k < 4; k++) vals[f * 4 + k] = Math.round(q.toArray()[k] * 32767); }
      else for (let k = 0; k < 3; k++) vals[f * 3 + k] = out[j * 3 + k] + (out[Math.min(inp.length - 1, j + 1) * 3 + k] - out[j * 3 + k]) * a; }
    const smp = doc.createAnimationSampler().setInput(acc(times, 'SCALAR')).setOutput(acc(vals, p === 'rotation' ? 'VEC4' : 'VEC3', p === 'rotation')).setInterpolation('LINEAR');
    anim.addSampler(smp).addChannel(doc.createAnimationChannel().setTargetNode(template[tn]).setTargetPath(p).setSampler(smp)); }
}
scene.setExtras({ ualPelvisY, source: 'Quaternius CC0: Universal Base Characters, Modular Character Outfits - Fantasy, Universal Animation Library' });
await io.write(outPath, doc); console.log(JSON.stringify(report), fs.statSync(outPath).size);

